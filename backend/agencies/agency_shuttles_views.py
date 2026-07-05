"""
agencies/agency_shuttles_views.py
----------------------------------
Acenta Transfer (Shuttle) Yönetimi API'si — agency_tours_views.py'nin
birebir yapısını taklit eder.

Endpoint'ler:
  GET    /api/v1/agency/shuttles/                       → Kendi rotalarını listele
  POST   /api/v1/agency/shuttles/                       → Yeni rota ekle
  PATCH  /api/v1/agency/shuttles/<slug>/                → Fiyat / yolcu sınırı güncelle
  DELETE /api/v1/agency/shuttles/<slug>/                → Rotayı pasife çek (soft delete)
  POST   /api/v1/agency/shuttles/<slug>/upload-image/   → Görsel yükle (Pillow optimize)
  GET    /api/v1/agency/shuttles/<slug>/manifest/        → Belirli tarih/saat için yolcu listesi
  PATCH  /api/v1/agency/shuttles/<slug>/update-capacity/ → Belirli tarih/saat kapasitesi güncelle
"""
import logging
import uuid
from datetime import date, datetime, timedelta

from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from agencies.models import Agency
from core.permissions import IsAgentOwner, IsVerifiedAgent, StrictMassAssignmentPermission
from core.image_utils import optimize_image
from shuttles.models import ShuttleRoute, ShuttleAvailability
from shuttles.serializers import ShuttleRouteDetailSerializer, ShuttleRouteListSerializer
from bookings.models import Booking

logger = logging.getLogger('agencies')

DEFAULT_SHUTTLE_TIMES = ['09:00', '14:00']  # varsayılan günlük saat slotları


class AgencyShuttleViewSet(viewsets.ModelViewSet):
    """
    Acenta kendi transfer rotalarını yönetir.
    Başka bir acentanın rotası asla görünmez — DB filtresi bunu garantiler.
    """
    permission_classes = [
        IsAuthenticated,
        IsAgentOwner,
        IsVerifiedAgent,
        StrictMassAssignmentPermission,
    ]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def _get_agency(self):
        return get_object_or_404(Agency, owner=self.request.user)

    def get_queryset(self):
        agency = self._get_agency()
        return (
            ShuttleRoute.objects
            .filter(agency=agency)
            .select_related('agency')
            .prefetch_related('availability_slots')
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return ShuttleRouteListSerializer
        return ShuttleRouteDetailSerializer

    # ─── CREATE ──────────────────────────────────────────────────────────────
    def perform_create(self, serializer):
        agency = self._get_agency()
        with transaction.atomic():
            shuttle_route = serializer.save(agency=agency)
            capacity = int(self.request.data.get('default_capacity', shuttle_route.capacity or 8))
            times_param = self.request.data.get('default_times')
            times = [t.strip() for t in times_param.split(',')] if times_param else DEFAULT_SHUTTLE_TIMES
            self._create_availability_slots(shuttle_route, days=90, capacity=capacity, times=times)
        logger.info(f"[AGENCY_SHUTTLE] Created shuttle route '{shuttle_route.title}' for agency '{agency.name}'")

    # ─── UPDATE ──────────────────────────────────────────────────────────────
    def partial_update(self, request, *args, **kwargs):
        """PATCH — Yalnızca güvenli alanlara izin ver (fiyat, açıklama, yolcu sınırı)."""
        ALLOWED_PATCH_FIELDS = {
            'price_per_person', 'description', 'min_passengers', 'max_passengers',
            'duration_minutes', 'vehicle_type', 'capacity',
        }
        unknown = set(request.data.keys()) - ALLOWED_PATCH_FIELDS
        if unknown and not request.user.is_staff:
            return Response(
                {'error': f'Bu alanlar güncellenemez: {unknown}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    # ─── DELETE (SOFT) ────────────────────────────────────────────────────────
    def destroy(self, request, *args, **kwargs):
        """Rotayı silmek yerine agency=None yaparak acentadan ayır (soft detach)."""
        shuttle_route = self.get_object()
        shuttle_route.agency = None
        shuttle_route.is_active = False
        shuttle_route.save(update_fields=['agency', 'is_active'])
        return Response({'detail': 'Transfer rotası panelden kaldırıldı.'}, status=status.HTTP_200_OK)

    # ─── GÖRSEL YÜKLEME (Pillow optimize) ────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='upload-image',
            parser_classes=[parsers.MultiPartParser])
    def upload_image(self, request, pk=None):
        shuttle_route = self.get_object()
        field_name = request.data.get('field', 'image_main')
        image_file = request.FILES.get('image')

        if not image_file:
            return Response({'error': 'Görsel dosyası gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

        MAX_UPLOAD_MB = 10
        if image_file.size > MAX_UPLOAD_MB * 1024 * 1024:
            return Response(
                {'error': f'Dosya boyutu {MAX_UPLOAD_MB}MB sınırını aşıyor.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed_fields = {'image_main', 'image_sub1', 'image_sub2'}
        if field_name not in allowed_fields:
            return Response({'error': f'Geçersiz alan adı: {field_name}'}, status=status.HTTP_400_BAD_REQUEST)

        optimized = optimize_image(image_file)
        filename = f"shuttles/{uuid.uuid4().hex}.webp"

        getattr(shuttle_route, field_name).save(filename, optimized, save=True)
        logger.info(f"[AGENCY_SHUTTLE] Image uploaded for shuttle route '{shuttle_route.id}': {field_name}")

        return Response({
            'detail': 'Görsel başarıyla yüklendi.',
            'url': request.build_absolute_uri(getattr(shuttle_route, field_name).url),
        })

    # ─── GÜNLÜK MANIFEST ─────────────────────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='manifest')
    def manifest(self, request, pk=None):
        """
        GET /api/v1/agency/shuttles/<slug>/manifest/?date=2026-05-20&time=09:00
        """
        shuttle_route = self.get_object()
        date_param = request.query_params.get('date')
        time_param = request.query_params.get('time')

        if not date_param or not time_param:
            return Response(
                {'error': 'date ve time parametreleri gereklidir (YYYY-MM-DD, HH:MM).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bookings = (
            Booking.objects
            .filter(shuttle_route=shuttle_route, start_date=date_param, start_time=time_param, status='confirmed')
            .select_related('user')
        )

        manifest_data = [
            {
                'booking_ref': b.booking_ref,
                'passenger': b.user.get_full_name() or b.user.username,
                'phone': b.user.email,
                'pax': b.guests,
                'status': b.status,
            }
            for b in bookings
        ]

        availability = ShuttleAvailability.objects.filter(
            shuttle_route=shuttle_route, date=date_param, time=time_param
        ).first()
        return Response({
            'shuttle_route': shuttle_route.title,
            'date': date_param,
            'time': time_param,
            'capacity': availability.max_capacity if availability else None,
            'booked': availability.booked_count if availability else None,
            'remaining': availability.remaining if availability else None,
            'passengers': manifest_data,
        })

    # ─── KAPASITE GÜNCELLEME ──────────────────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='update-capacity')
    def update_capacity(self, request, pk=None):
        """
        PATCH /api/v1/agency/shuttles/<slug>/update-capacity/
        Body: { "date": "2026-05-20", "time": "09:00", "max_capacity": 12 }
        """
        shuttle_route = self.get_object()
        date_str = request.data.get('date')
        time_str = request.data.get('time')
        capacity = request.data.get('max_capacity')

        if not date_str or not time_str or capacity is None:
            return Response({'error': 'date, time ve max_capacity zorunludur.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            capacity = int(capacity)
            if capacity < 1:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'Kapasite pozitif tam sayı olmalıdır.'}, status=status.HTTP_400_BAD_REQUEST)

        slot, created = ShuttleAvailability.objects.update_or_create(
            shuttle_route=shuttle_route, date=date_str, time=time_str,
            defaults={'max_capacity': capacity}
        )

        return Response({
            'detail': 'Kapasite güncellendi.',
            'date': date_str,
            'time': time_str,
            'max_capacity': slot.max_capacity,
            'booked_count': slot.booked_count,
            'remaining': slot.remaining,
        })

    # ─── YARDIMCI METODLAR ────────────────────────────────────────────────────
    @staticmethod
    def _create_availability_slots(shuttle_route: ShuttleRoute, days: int = 90, capacity: int = 8, times=None):
        """Toplu ShuttleAvailability kaydı oluşturur (bulk_create — N+1 yok)."""
        times = times or DEFAULT_SHUTTLE_TIMES
        today = date.today()
        existing = set(
            ShuttleAvailability.objects.filter(shuttle_route=shuttle_route).values_list('date', 'time')
        )
        slots = []
        for i in range(days):
            slot_date = today + timedelta(days=i)
            for time_str in times:
                try:
                    slot_time = datetime.strptime(time_str, '%H:%M').time()
                except ValueError:
                    continue
                if (slot_date, slot_time) not in existing:
                    slots.append(ShuttleAvailability(
                        shuttle_route=shuttle_route, date=slot_date, time=slot_time, max_capacity=capacity
                    ))
        if slots:
            ShuttleAvailability.objects.bulk_create(slots, ignore_conflicts=True)
