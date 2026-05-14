"""
agencies/agency_tours_views.py
-------------------------------
Acenta Tur Yönetimi API'si — Production-Ready

Özellikler:
  • IsAgentOwner + IsVerifiedAgent → Sıkı RLS yetkilendirmesi.
  • queryset.filter(agency=agency) → DB seviyesinde veri izolasyonu.
  • Görsel yükleme: Pillow ile otomatik boyut optimizasyonu + WEBP dönüşümü.
  • TourAvailability bulk-create: Tur eklenirken önümüzdeki 90 günlük slot açılır.

Endpoint'ler:
  GET    /api/v1/agency/tours/               → Kendi turlarını listele
  POST   /api/v1/agency/tours/               → Yeni tur ekle
  PATCH  /api/v1/agency/tours/<slug>/        → Fiyat / kapasite güncelle
  DELETE /api/v1/agency/tours/<slug>/        → Turu pasife çek (soft delete)
  POST   /api/v1/agency/tours/<slug>/upload-image/ → Görsel yükle (Pillow optimize)
  GET    /api/v1/agency/tours/<slug>/manifest/     → Günlük yolcu listesi
"""
import io
import logging
import uuid
from datetime import date, timedelta

from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from agencies.models import Agency
from core.permissions import IsAgentOwner, IsVerifiedAgent, StrictMassAssignmentPermission
from tours.models import Tour, TourAvailability
from tours.serializers import TourDetailSerializer, TourListSerializer
from bookings.models import Booking
from bookings.serializers import BookingSerializer

logger = logging.getLogger('agencies')

# ─── Pillow ───────────────────────────────────────────────────────────────────
try:
    from PIL import Image as PilImage
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    logger.warning("Pillow kütüphanesi bulunamadı. Görsel optimizasyonu devre dışı.")

# Konfigürasyon sabitleri
MAX_IMAGE_SIZE = (1200, 900)   # piksel
IMAGE_QUALITY  = 82            # JPEG/WEBP kalitesi (1-95)
MAX_UPLOAD_MB  = 10            # Yükleme boyut sınırı (MB)


class AgencyTourViewSet(viewsets.ModelViewSet):
    """
    Acenta kendi turlarını yönetir.
    Başka bir acentanın turu asla görünmez — DB filtresi bunu garantiler.
    """
    permission_classes = [
        IsAuthenticated,
        IsAgentOwner,
        IsVerifiedAgent,
        StrictMassAssignmentPermission,
    ]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def _get_agency(self):
        """İstek yapan kullanıcının acentasını döndürür. Yoksa 403."""
        return get_object_or_404(Agency, owner=self.request.user)

    def get_queryset(self):
        """
        ÖNEMLİ: Bu satır olmadan herhangi bir acenta tüm turları görebilir.
        queryset.filter(agency=agency) → DB seviyesinde veri izolasyonu (RLS).
        """
        agency = self._get_agency()
        return (
            Tour.objects
            .filter(agency=agency)
            .select_related('agency', 'category_obj')
            .prefetch_related('availability_slots')
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return TourListSerializer
        return TourDetailSerializer

    # ─── CREATE ──────────────────────────────────────────────────────────────
    def perform_create(self, serializer):
        agency = self._get_agency()
        with transaction.atomic():
            tour = serializer.save(agency=agency)
            # Önümüzdeki 90 günlük TourAvailability slot'larını otomatik oluştur
            capacity = int(self.request.data.get('default_capacity', 20))
            self._create_availability_slots(tour, days=90, capacity=capacity)
        logger.info(f"[AGENCY_TOUR] Created tour '{tour.title}' for agency '{agency.name}'")

    # ─── UPDATE ──────────────────────────────────────────────────────────────
    def partial_update(self, request, *args, **kwargs):
        """PATCH — Yalnızca güvenli alanlara izin ver (fiyat, kapasite, açıklama)."""
        ALLOWED_PATCH_FIELDS = {'price', 'original_price', 'discount', 'description', 'guide', 'accommodation', 'transportation'}
        unknown = set(request.data.keys()) - ALLOWED_PATCH_FIELDS
        if unknown and not request.user.is_staff:
            return Response(
                {'error': f'Bu alanlar güncellenemez: {unknown}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    # ─── DELETE (SOFT) ────────────────────────────────────────────────────────
    def destroy(self, request, *args, **kwargs):
        """Turu silmek yerine agency=None yaparak acentadan ayır (soft detach)."""
        tour = self.get_object()
        tour.agency = None
        tour.save(update_fields=['agency'])
        return Response({'detail': 'Tur panelden kaldırıldı.'}, status=status.HTTP_200_OK)

    # ─── GÖRSEL YÜKLEME (Pillow optimize) ────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='upload-image',
            parser_classes=[parsers.MultiPartParser])
    def upload_image(self, request, pk=None):
        """
        POST /api/v1/agency/tours/<slug>/upload-image/
        Multipart form data: field adı "image" veya "image_sub1" veya "image_sub2"
        """
        tour       = self.get_object()
        field_name = request.data.get('field', 'image_main')  # hangi alan?
        image_file = request.FILES.get('image')

        if not image_file:
            return Response({'error': 'Görsel dosyası gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

        # Boyut sınırı kontrolü
        if image_file.size > MAX_UPLOAD_MB * 1024 * 1024:
            return Response(
                {'error': f'Dosya boyutu {MAX_UPLOAD_MB}MB sınırını aşıyor.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed_fields = {'image_main', 'image_sub1', 'image_sub2'}
        if field_name not in allowed_fields:
            return Response({'error': f'Geçersiz alan adı: {field_name}'}, status=status.HTTP_400_BAD_REQUEST)

        optimized = self._optimize_image(image_file)
        filename  = f"tours/{uuid.uuid4().hex}.webp"

        getattr(tour, field_name).save(filename, optimized, save=True)
        logger.info(f"[AGENCY_TOUR] Image uploaded for tour '{tour.id}': {field_name}")

        return Response({
            'detail': 'Görsel başarıyla yüklendi.',
            'url': request.build_absolute_uri(getattr(tour, field_name).url),
        })

    # ─── GÜNLÜK MANIFEST ─────────────────────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='manifest')
    def manifest(self, request, pk=None):
        """
        GET /api/v1/agency/tours/<slug>/manifest/?date=2026-05-20
        Günlük yolcu listesi — sadece bu acentanın turu olmalı.
        """
        tour        = self.get_object()
        date_param  = request.query_params.get('date')

        if not date_param:
            return Response({'error': 'date parametresi gereklidir (YYYY-MM-DD).'}, status=status.HTTP_400_BAD_REQUEST)

        bookings = (
            Booking.objects
            .filter(tour=tour, start_date=date_param, status='confirmed')
            .select_related('user')
        )

        manifest_data = [
            {
                'booking_ref': b.booking_ref,
                'passenger':   b.user.get_full_name() or b.user.username,
                'phone':       b.user.email,
                'pax':         b.guests,
                'hotel':       getattr(b, 'hotel', '—'),
                'status':      b.status,
            }
            for b in bookings
        ]

        availability = TourAvailability.objects.filter(tour=tour, date=date_param).first()
        return Response({
            'tour':      tour.title,
            'date':      date_param,
            'capacity':  availability.max_capacity if availability else None,
            'booked':    availability.booked_count if availability else None,
            'remaining': availability.remaining if availability else None,
            'passengers': manifest_data,
        })

    # ─── KAPASITE GÜNCELLEME ──────────────────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='update-capacity')
    def update_capacity(self, request, pk=None):
        """
        PATCH /api/v1/agency/tours/<slug>/update-capacity/
        Body: { "date": "2026-05-20", "max_capacity": 25 }
        """
        tour     = self.get_object()
        date_str = request.data.get('date')
        capacity = request.data.get('max_capacity')

        if not date_str or capacity is None:
            return Response({'error': 'date ve max_capacity zorunludur.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            capacity = int(capacity)
            if capacity < 1:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'Kapasite pozitif tam sayı olmalıdır.'}, status=status.HTTP_400_BAD_REQUEST)

        slot, created = TourAvailability.objects.update_or_create(
            tour=tour, date=date_str,
            defaults={'max_capacity': capacity}
        )

        return Response({
            'detail':       'Kapasite güncellendi.',
            'date':         date_str,
            'max_capacity': slot.max_capacity,
            'booked_count': slot.booked_count,
            'remaining':    slot.remaining,
        })

    # ─── YARDIMCI METODLAR ────────────────────────────────────────────────────
    @staticmethod
    def _create_availability_slots(tour: Tour, days: int = 90, capacity: int = 20):
        """Toplu TourAvailability kaydı oluşturur (bulk_create — N+1 yok)."""
        today = date.today()
        existing_dates = set(
            TourAvailability.objects.filter(tour=tour).values_list('date', flat=True)
        )
        slots = [
            TourAvailability(tour=tour, date=today + timedelta(days=i), max_capacity=capacity)
            for i in range(days)
            if (today + timedelta(days=i)) not in existing_dates
        ]
        if slots:
            TourAvailability.objects.bulk_create(slots, ignore_conflicts=True)

    @staticmethod
    def _optimize_image(image_file) -> ContentFile:
        """
        Pillow ile görsel optimizasyonu:
          1. MAX_IMAGE_SIZE içine sığdır (thumbnail — oranı koru).
          2. WEBP formatına dönüştür (en iyi sıkıştırma).
          3. ContentFile olarak döndür (Django'nun storage'ına yazılabilir).

        Pillow yüklü değilse orijinal dosyayı döndürür.
        """
        if not PILLOW_AVAILABLE:
            return ContentFile(image_file.read())

        try:
            img = PilImage.open(image_file)

            # EXIF rotasyonunu düzelt
            try:
                from PIL.ImageOps import exif_transpose
                img = exif_transpose(img)
            except Exception:
                pass

            # RGBA / P modlarını RGB'ye çevir (WEBP RGBA desteklese de sıkıştırma için RGB daha iyi)
            if img.mode in ('RGBA', 'P', 'LA'):
                background = PilImage.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'RGBA':
                    background.paste(img, mask=img.split()[3])
                else:
                    background.paste(img.convert('RGBA'), mask=img.convert('RGBA').split()[3])
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Yeniden boyutlandır
            img.thumbnail(MAX_IMAGE_SIZE, PilImage.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format='WEBP', quality=IMAGE_QUALITY, method=6)
            buffer.seek(0)
            return ContentFile(buffer.read())

        except Exception as e:
            logger.error(f"[IMAGE_OPTIMIZE] Pillow optimizasyonu başarısız, orijinal kullanılıyor: {e}")
            image_file.seek(0)
            return ContentFile(image_file.read())
