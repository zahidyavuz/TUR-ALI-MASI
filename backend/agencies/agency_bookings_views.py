"""
agencies/agency_bookings_views.py
---------------------------------
Acenta Rezervasyon Yönetimi API'si.

RLS: queryset yalnız `tour__agency` ya da `shuttle_route__agency` bu acentaya
ait olan rezervasyonları döndürür. Başka acentanın rezervasyonu listede
görünmez, tekil erişimde 404 verir.

Endpoint'ler:
  GET   /api/v1/agency/bookings/?date=&status=&tour=&q=  → Filtreli liste
  GET   /api/v1/agency/bookings/manifest/?date=          → Günlük manifest
  PATCH /api/v1/agency/bookings/<uuid>/                  → Yalnız `no_show`
"""
import logging
from datetime import datetime

from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from agencies.models import Agency
from bookings.models import Booking
from core.permissions import IsAgentOwner, IsVerifiedAgent, StrictMassAssignmentPermission

logger = logging.getLogger('agencies')

# Manifest yalnız bu durumlardaki kayıtları gösterir; iptal/başarısız ödeme
# yolcusu araca binmez.
MANIFEST_STATUSES = ('confirmed',)


class AgencyBookingSerializer(serializers.ModelSerializer):
    """
    Acenta panelinin gördüğü rezervasyon.

    Mass-assignment koruması: `no_show` DIŞINDA her alan salt okunur. Acenta
    ne tutarı, ne durumu, ne misafir bilgisini bu uçtan değiştirebilir.
    """
    passenger = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    hotel = serializers.SerializerMethodField()
    service_title = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_ref', 'service_type', 'tour', 'service_title',
            'start_date', 'start_time', 'guests', 'total_price', 'status',
            'no_show', 'passenger', 'phone', 'email', 'hotel', 'created_at',
        ]
        read_only_fields = [
            'id', 'booking_ref', 'service_type', 'tour', 'start_date', 'start_time',
            'guests', 'total_price', 'status', 'created_at',
        ]

    # Misafir bilgileri rezervasyonu yapan hesaptan farklı olabilir; doluysa
    # onlar, değilse hesabın kendi bilgileri kullanılır (manifest ile aynı kural).
    def get_passenger(self, obj) -> str:
        return obj.guest_full_name or obj.user.get_full_name() or obj.user.username

    def get_phone(self, obj) -> str:
        return obj.guest_phone or '—'

    def get_email(self, obj) -> str:
        return obj.guest_email or obj.user.email or '—'

    def get_hotel(self, obj) -> str:
        return obj.guest_hotel or '—'

    def get_service_title(self, obj) -> str:
        if obj.tour:
            return obj.tour.title
        if obj.shuttle_route:
            return f'{obj.shuttle_route.title} (transfer)'
        return '—'


class AgencyBookingViewSet(mixins.ListModelMixin,
                           mixins.RetrieveModelMixin,
                           mixins.UpdateModelMixin,
                           viewsets.GenericViewSet):
    """Acenta kendi hizmetlerinin rezervasyonlarını görür ve no-show işaretler."""
    serializer_class = AgencyBookingSerializer
    permission_classes = [
        IsAuthenticated,
        IsAgentOwner,
        IsVerifiedAgent,
        StrictMassAssignmentPermission,
    ]
    # PUT kapalı: tam güncelleme anlamsız, tek yazılabilir alan `no_show`.
    http_method_names = ['get', 'patch', 'head', 'options']

    def _get_agency(self):
        return get_object_or_404(Agency, owner=self.request.user)

    def get_queryset(self):
        """
        ÖNEMLİ: RLS burada uygulanır. Bu filtre olmadan bir acenta tüm
        platformun rezervasyonlarını (misafir telefon/e-postası dâhil) görür.
        """
        agency = self._get_agency()
        queryset = (
            Booking.objects
            .filter(Q(tour__agency=agency) | Q(shuttle_route__agency=agency))
            .select_related('user', 'tour', 'shuttle_route')
            .order_by('-start_date', 'booking_ref')
        )
        return self._apply_filters(queryset, self.request.query_params)

    @staticmethod
    def _apply_filters(queryset, params):
        date_param = params.get('date')
        if date_param:
            parsed = _parse_date(date_param)
            if parsed:
                queryset = queryset.filter(start_date=parsed)

        status_param = params.get('status')
        valid_statuses = dict(Booking.STATUS_CHOICES)
        if status_param in valid_statuses:
            queryset = queryset.filter(status=status_param)

        tour_param = params.get('tour')
        if tour_param:
            queryset = queryset.filter(tour_id=tour_param)

        search = (params.get('q') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(booking_ref__icontains=search)
                | Q(guest_full_name__icontains=search)
                | Q(guest_phone__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )
        return queryset

    # ─── NO-SHOW İŞARETLEME ──────────────────────────────────────────────────
    ALLOWED_PATCH_FIELDS = {'no_show'}

    def partial_update(self, request, *args, **kwargs):
        unknown = set(request.data.keys()) - self.ALLOWED_PATCH_FIELDS
        if unknown:
            return Response(
                {'error': f"Bu alanlar güncellenemez: {', '.join(sorted(unknown))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking = self.get_object()
        # Gelmeyen misafir ancak ödemesi tamamlanmış bir rezervasyon olabilir;
        # iptal edilmiş ya da ödemesi düşmüş kayıt zaten hizmete gelmiyor.
        if booking.status != 'confirmed':
            return Response(
                {'error': 'Yalnızca onaylanmış rezervasyonlar gelmedi olarak işaretlenebilir.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    # ─── GÜNLÜK MANİFEST (tüm turlar, tek gün) ───────────────────────────────
    @action(detail=False, methods=['get'], url_path='manifest', pagination_class=None)
    def manifest(self, request):
        """
        GET /api/v1/agency/bookings/manifest/?date=YYYY-MM-DD

        Tur bazında gruplanmış, sayfalanmamış yolcu listesi — yazdırma içindir.
        Sayfalama kapalı: manifestin ikinci sayfası şoförün elinde olmaz.
        """
        parsed = _parse_date(request.query_params.get('date'))
        if not parsed:
            return Response({'error': 'date parametresi gereklidir (YYYY-MM-DD).'},
                            status=status.HTTP_400_BAD_REQUEST)

        agency = self._get_agency()
        bookings = (
            Booking.objects
            .filter(Q(tour__agency=agency) | Q(shuttle_route__agency=agency))
            .filter(start_date=parsed, status__in=MANIFEST_STATUSES)
            .select_related('user', 'tour', 'shuttle_route')
            .order_by('tour__title', 'start_time', 'booking_ref')
        )

        groups = {}
        for booking in bookings:
            key = booking.tour_id or f'shuttle:{booking.shuttle_route_id}'
            group = groups.setdefault(key, {
                'service_id': booking.tour_id,
                'service_title': AgencyBookingSerializer().get_service_title(booking),
                'duration': booking.tour.duration if booking.tour else '',
                'pax': 0,
                'passengers': [],
            })
            group['pax'] += booking.guests
            group['passengers'].append(AgencyBookingSerializer(booking).data)

        return Response({
            'date': parsed.isoformat(),
            'agency': agency.name,
            'total_pax': bookings.aggregate(total=Sum('guests'))['total'] or 0,
            'total_bookings': bookings.count(),
            'groups': list(groups.values()),
        })


def _parse_date(value):
    try:
        return datetime.strptime(str(value), '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None
