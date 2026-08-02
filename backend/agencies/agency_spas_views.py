"""
agencies/agency_spas_views.py
------------------------------
Acenta Spa & Wellness Yönetimi API'si — agency_shuttles_views.py'nin desenini
taklit eder, ancak spa iki katmanlıdır: Mekân (SpaVenue) → Hizmet (SpaService)
→ Uygunluk (SpaAvailability). Slot'lar mekânda değil hizmette tutulur; bu
yüzden iki ayrı ViewSet vardır.

Endpoint'ler:
  Mekân:
    GET/POST  /api/v1/agency/spas/venues/
    PATCH/DEL /api/v1/agency/spas/venues/<slug>/
    POST      /api/v1/agency/spas/venues/<slug>/upload-image/
  Hizmet:
    GET/POST  /api/v1/agency/spas/services/
    PATCH/DEL /api/v1/agency/spas/services/<slug>/
    POST      /api/v1/agency/spas/services/<slug>/upload-image/
    GET       /api/v1/agency/spas/services/<slug>/manifest/
    PATCH     /api/v1/agency/spas/services/<slug>/update-capacity/
"""
import logging
import uuid
from datetime import date, datetime, timedelta

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils.text import slugify
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from agencies.models import Agency
from core.permissions import IsAgentOwner, IsVerifiedAgent, StrictMassAssignmentPermission
from core.image_utils import optimize_image
from spas.models import SpaVenue, SpaService, SpaAvailability
from spas.serializers import AgencySpaVenueSerializer, AgencySpaServiceSerializer
from bookings.models import Booking

logger = logging.getLogger('agencies')

MAX_UPLOAD_MB = 10
DEFAULT_SPA_TIMES = ['10:00', '14:00']  # varsayılan günlük slot saatleri

# slugify() ASCII dışını atar; Türkçe karakterler önce karşılıklarına çevrilir.
_TR_CHAR_MAP = str.maketrans({
    'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g',
    'ü': 'u', 'Ü': 'u', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c',
})


def _unique_slug(model, base_text: str, fallback: str) -> str:
    """base_text'ten benzersiz slug üretir; çakışmada kısa rastgele ek verir."""
    base = slugify(base_text.translate(_TR_CHAR_MAP))[:80] or fallback
    slug = base
    while model.objects.filter(pk=slug).exists():
        slug = f'{base}-{uuid.uuid4().hex[:6]}'
    return slug


def _parse_capacity(raw, default: int = 8) -> int:
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return value if 1 <= value <= 1000 else default


class AgencySpaVenueViewSet(viewsets.ModelViewSet):
    """
    Acenta kendi spa mekânlarını yönetir.
    Başka bir acentanın mekânı asla görünmez — DB filtresi bunu garantiler.
    """
    permission_classes = [
        IsAuthenticated,
        IsAgentOwner,
        IsVerifiedAgent,
        StrictMassAssignmentPermission,
    ]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    serializer_class = AgencySpaVenueSerializer

    def _get_agency(self):
        return get_object_or_404(Agency, owner=self.request.user)

    def get_queryset(self):
        agency = self._get_agency()
        return (
            SpaVenue.objects
            .filter(agency=agency)
            .select_related('agency')
            .prefetch_related('services')
            .order_by('name')
        )

    def perform_create(self, serializer):
        agency = self._get_agency()
        # `SpaVenue.id` bir SlugField PK'dir ve otomatik üretilmez; adı
        # ele geçirmeye kapalı tutmak için slug'ı sunucuda türetiyoruz.
        serializer.save(
            agency=agency,
            id=_unique_slug(SpaVenue, serializer.validated_data.get('name', ''), 'spa'),
        )
        logger.info(f"[AGENCY_SPA] Created venue for agency '{agency.name}'")

    ALLOWED_PATCH_FIELDS = {'name', 'description', 'location'}

    def partial_update(self, request, *args, **kwargs):
        unknown = set(request.data.keys()) - self.ALLOWED_PATCH_FIELDS
        if unknown and not request.user.is_staff:
            return Response(
                {'error': f"Bu alanlar güncellenemez: {', '.join(sorted(unknown))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Mekânı silmek yerine acentadan ayırıp pasife çek (soft detach)."""
        venue = self.get_object()
        venue.agency = None
        venue.is_active = False
        venue.save(update_fields=['agency', 'is_active'])
        return Response({'detail': 'Spa mekânı panelden kaldırıldı.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='upload-image',
            parser_classes=[parsers.MultiPartParser])
    def upload_image(self, request, pk=None):
        venue = self.get_object()
        field_name = request.data.get('field', 'image_main')
        image_file = request.FILES.get('image')

        if not image_file:
            return Response({'error': 'Görsel dosyası gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)
        if image_file.size > MAX_UPLOAD_MB * 1024 * 1024:
            return Response(
                {'error': f'Dosya boyutu {MAX_UPLOAD_MB}MB sınırını aşıyor.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        allowed_fields = {'image_main', 'image_sub1', 'image_sub2'}
        if field_name not in allowed_fields:
            return Response({'error': f'Geçersiz alan adı: {field_name}'}, status=status.HTTP_400_BAD_REQUEST)

        optimized = optimize_image(image_file)
        filename = f"spas/{uuid.uuid4().hex}.webp"
        getattr(venue, field_name).save(filename, optimized, save=True)
        logger.info(f"[AGENCY_SPA] Image uploaded for venue '{venue.id}': {field_name}")

        return Response({
            'detail': 'Görsel başarıyla yüklendi.',
            'url': request.build_absolute_uri(getattr(venue, field_name).url),
        })


class AgencySpaServiceViewSet(viewsets.ModelViewSet):
    """
    Acenta kendi mekânlarındaki spa hizmetlerini yönetir. Hizmet doğrudan
    acentaya değil mekâna bağlı olduğundan izolasyon `venue__agency` üzerinden
    yapılır ve create'te mekân sahipliği ayrıca doğrulanır.
    """
    permission_classes = [
        IsAuthenticated,
        IsAgentOwner,
        IsVerifiedAgent,
        StrictMassAssignmentPermission,
    ]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    serializer_class = AgencySpaServiceSerializer

    def _get_agency(self):
        return get_object_or_404(Agency, owner=self.request.user)

    def get_queryset(self):
        agency = self._get_agency()
        return (
            SpaService.objects
            .filter(venue__agency=agency)
            .select_related('venue', 'venue__agency')
            .prefetch_related('availability_slots')
            .order_by('title')
        )

    def perform_create(self, serializer):
        agency = self._get_agency()
        venue = serializer.validated_data.get('venue')
        # Başka bir acentanın (ya da hiç kimsenin) mekânına hizmet iliştirmek
        # yasak; PrimaryKeyRelatedField tüm mekânları kabul ettiği için sahiplik
        # burada elle doğrulanır.
        if venue is None or venue.agency_id != agency.id:
            raise ValidationError({'venue': 'Bu mekân sizin acentanıza ait değil.'})

        with transaction.atomic():
            service = serializer.save(
                id=_unique_slug(
                    SpaService, f"{venue.id}-{serializer.validated_data.get('title', '')}", 'spa-hizmet'
                ),
            )
            capacity = _parse_capacity(self.request.data.get('default_capacity'), service.max_guests or 8)
            times_param = self.request.data.get('default_times')
            times = [t.strip() for t in times_param.split(',')] if times_param else DEFAULT_SPA_TIMES
            self._create_availability_slots(service, days=90, capacity=capacity, times=times)
        logger.info(f"[AGENCY_SPA] Created service '{service.title}' in venue '{venue.id}'")

    ALLOWED_PATCH_FIELDS = {
        'title', 'description', 'price_per_person', 'duration_minutes',
        'min_guests', 'max_guests',
    }

    def partial_update(self, request, *args, **kwargs):
        unknown = set(request.data.keys()) - self.ALLOWED_PATCH_FIELDS
        if unknown and not request.user.is_staff:
            return Response(
                {'error': f"Bu alanlar güncellenemez: {', '.join(sorted(unknown))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Hizmeti silmek yerine pasife çek — geçmiş rezervasyon izleri korunur."""
        service = self.get_object()
        service.is_active = False
        service.save(update_fields=['is_active'])
        return Response({'detail': 'Spa hizmeti panelden kaldırıldı.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='upload-image',
            parser_classes=[parsers.MultiPartParser])
    def upload_image(self, request, pk=None):
        service = self.get_object()
        image_file = request.FILES.get('image')

        if not image_file:
            return Response({'error': 'Görsel dosyası gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)
        if image_file.size > MAX_UPLOAD_MB * 1024 * 1024:
            return Response(
                {'error': f'Dosya boyutu {MAX_UPLOAD_MB}MB sınırını aşıyor.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        optimized = optimize_image(image_file)
        filename = f"spas/{uuid.uuid4().hex}.webp"
        service.image.save(filename, optimized, save=True)
        logger.info(f"[AGENCY_SPA] Image uploaded for service '{service.id}'")

        return Response({
            'detail': 'Görsel başarıyla yüklendi.',
            'url': request.build_absolute_uri(service.image.url),
        })

    @action(detail=True, methods=['get'], url_path='manifest')
    def manifest(self, request, pk=None):
        """GET .../<slug>/manifest/?date=2026-05-20&time=10:00"""
        service = self.get_object()
        date_param = request.query_params.get('date')
        time_param = request.query_params.get('time')

        if not date_param or not time_param:
            return Response(
                {'error': 'date ve time parametreleri gereklidir (YYYY-MM-DD, HH:MM).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bookings = (
            Booking.objects
            .filter(spa_service=service, start_date=date_param, start_time=time_param, status='confirmed')
            .select_related('user')
        )
        manifest_data = [
            {
                'booking_ref': b.booking_ref,
                'guest': b.guest_full_name or b.user.get_full_name() or b.user.username,
                'phone': b.guest_phone or '—',
                'email': b.guest_email or b.user.email,
                'pax': b.guests,
                'status': b.status,
            }
            for b in bookings
        ]

        availability = SpaAvailability.objects.filter(
            spa_service=service, date=date_param, time=time_param
        ).first()
        return Response({
            'service': service.title,
            'date': date_param,
            'time': time_param,
            'capacity': availability.max_capacity if availability else None,
            'booked': availability.booked_count if availability else None,
            'remaining': availability.remaining if availability else None,
            'guests': manifest_data,
        })

    @action(detail=True, methods=['patch'], url_path='update-capacity')
    def update_capacity(self, request, pk=None):
        """PATCH .../<slug>/update-capacity/  { date, time, max_capacity }"""
        service = self.get_object()
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

        slot, _ = SpaAvailability.objects.update_or_create(
            spa_service=service, date=date_str, time=time_str,
            defaults={'max_capacity': capacity},
        )
        return Response({
            'detail': 'Kapasite güncellendi.',
            'date': date_str,
            'time': time_str,
            'max_capacity': slot.max_capacity,
            'booked_count': slot.booked_count,
            'remaining': slot.remaining,
        })

    @staticmethod
    def _create_availability_slots(service: SpaService, days: int = 90, capacity: int = 8, times=None):
        """Toplu SpaAvailability kaydı oluşturur (bulk_create — N+1 yok)."""
        times = times or DEFAULT_SPA_TIMES
        today = date.today()
        existing = set(
            SpaAvailability.objects.filter(spa_service=service).values_list('date', 'time')
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
                    slots.append(SpaAvailability(
                        spa_service=service, date=slot_date, time=slot_time, max_capacity=capacity
                    ))
        if slots:
            SpaAvailability.objects.bulk_create(slots, ignore_conflicts=True)
