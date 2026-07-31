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
  POST  /api/v1/agency/bookings/<booking_ref>/checkin/   → Bilet doğrulama
"""
import logging
from datetime import datetime

from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
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
            'no_show', 'checked_in_at', 'passenger', 'phone', 'email', 'hotel',
            'created_at',
        ]
        read_only_fields = [
            'id', 'booking_ref', 'service_type', 'tour', 'start_date', 'start_time',
            'guests', 'total_price', 'status', 'checked_in_at', 'created_at',
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
    # POST yalnız `checkin` aksiyonu için açık — rezervasyon bu uçtan yaratılmaz
    # (create mixin'i zaten dâhil değil).
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

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

    # ─── BİLET DOĞRULAMA / CHECK-IN ──────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path=r'(?P<booking_ref>[^/]+)/checkin')
    def checkin(self, request, booking_ref=None):
        """
        POST /api/v1/agency/bookings/<booking_ref>/checkin/

        QR'dan okunan `booking_ref` ile misafiri hizmete alır. Yanıt her zaman
        makine tarafından ayırt edilebilir bir `reason` taşır; tarayıcı ekranı
        buna göre renk/titreşim seçer.

        Arama `get_queryset()` üzerinden yapılır — başka acentanın bileti
        okutulursa kayıt hiç bulunmaz (`not_found`), varlığı bile sızmaz.
        """
        booking = (
            Booking.objects
            .filter(self._agency_scope())
            .filter(booking_ref__iexact=(booking_ref or '').strip())
            .select_related('user', 'tour', 'shuttle_route')
            .first()
        )
        if booking is None:
            return self._checkin_error('not_found', 'Bu bilet sistemde bulunamadı veya size ait bir hizmete ait değil.',
                                       status.HTTP_404_NOT_FOUND)

        if booking.status != 'confirmed':
            labels = dict(Booking.STATUS_CHOICES)
            return self._checkin_error(
                'not_confirmed',
                f'Bilet kullanılabilir durumda değil (durum: {labels.get(booking.status, booking.status)}).',
                status.HTTP_400_BAD_REQUEST, booking,
            )

        today = timezone.localdate()
        if booking.start_date and booking.start_date != today:
            return self._checkin_error(
                'wrong_date',
                f'Bu bilet {booking.start_date.strftime("%d.%m.%Y")} tarihi içindir, bugün geçerli değildir.',
                status.HTTP_400_BAD_REQUEST, booking,
            )

        # Koşullu UPDATE: iki cihaz aynı bileti aynı anda okutsa da yalnız biri
        # 1 satır günceller, diğeri kesin olarak "zaten okutuldu" alır.
        now = timezone.now()
        claimed = Booking.objects.filter(pk=booking.pk, checked_in_at__isnull=True).update(
            checked_in_at=now, no_show=False,
        )
        if not claimed:
            booking.refresh_from_db()
            return self._checkin_error(
                'already_checked_in',
                f'Bu bilet {timezone.localtime(booking.checked_in_at).strftime("%d.%m.%Y %H:%M")} '
                f'itibarıyla zaten okutulmuş.',
                status.HTTP_409_CONFLICT, booking,
            )

        booking.refresh_from_db()
        logger.info(f"[CHECKIN] {booking.booking_ref} checked in by {request.user.username}")
        return Response({
            'reason': 'ok',
            'message': 'Bilet doğrulandı, misafir hizmete alındı.',
            'booking': AgencyBookingSerializer(booking).data,
        })

    def _agency_scope(self):
        agency = self._get_agency()
        return Q(tour__agency=agency) | Q(shuttle_route__agency=agency)

    @staticmethod
    def _checkin_error(reason, message, http_status, booking=None):
        payload = {'reason': reason, 'error': message}
        if booking is not None:
            payload['booking'] = AgencyBookingSerializer(booking).data
        return Response(payload, status=http_status)

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
