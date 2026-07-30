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
import logging
import uuid
from datetime import date, timedelta

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django.utils.text import slugify
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from agencies.models import Agency
from core.permissions import IsAgentOwner, IsVerifiedAgent, StrictMassAssignmentPermission
from core.image_utils import optimize_image
from tours.models import Tour, TourAvailability
from tours.serializers import AgencyTourListSerializer, TourDetailSerializer
from bookings.models import Booking
from bookings.serializers import BookingSerializer

logger = logging.getLogger('agencies')

MAX_UPLOAD_MB = 10  # Yükleme boyut sınırı (MB)


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
        queryset = (
            Tour.objects
            .filter(agency=agency)
            .select_related('agency', 'category_obj')
            # Tour modelinde Meta.ordering yok; sırasız queryset'te sayfalama
            # tutarsız sonuç verir (UnorderedObjectListWarning).
            .order_by('title')
        )
        if self.action == 'list':
            # Panel kartlarındaki doluluk özeti: bugünden itibaren açık olan
            # slotların toplam kontenjanı ve satılanı. Tek join üzerinden iki
            # Sum alındığı için çarpım (fan-out) sorunu oluşmaz.
            today = date.today()
            return queryset.annotate(
                capacity_total=Coalesce(
                    Sum('availability_slots__max_capacity',
                        filter=Q(availability_slots__date__gte=today)), 0),
                booked_total=Coalesce(
                    Sum('availability_slots__booked_count',
                        filter=Q(availability_slots__date__gte=today)), 0),
            )
        return queryset.prefetch_related('availability_slots')

    def get_serializer_class(self):
        if self.action == 'list':
            return AgencyTourListSerializer
        return TourDetailSerializer

    # ─── CREATE ──────────────────────────────────────────────────────────────
    def perform_create(self, serializer):
        agency = self._get_agency()
        with transaction.atomic():
            # `Tour.id` bir SlugField PK'dir ve otomatik üretilmez. Slug'ı
            # istemciden almak yerine başlıktan türetiyoruz: acentanın başka
            # bir turun slug'ını ele geçirmesi ya da URL'i kirletmesi mümkün
            # olmasın diye serializer'da `id` read-only.
            tour = serializer.save(
                agency=agency,
                id=self._generate_slug(serializer.validated_data.get('title', '')),
            )
            # Önümüzdeki 90 günlük TourAvailability slot'larını otomatik oluştur
            capacity = self._parse_capacity(self.request.data.get('default_capacity'))
            self._create_availability_slots(tour, days=90, capacity=capacity)
        logger.info(f"[AGENCY_TOUR] Created tour '{tour.title}' ({tour.pk}) for agency '{agency.name}'")

    # ─── UPDATE ──────────────────────────────────────────────────────────────
    # Panelden düzenlenebilen alanlar. Kasıtlı olarak DIŞARIDA bırakılanlar:
    #   • id / agency        → sahiplik ve URL kimliği değiştirilemez
    #   • rating / reviews_count / fomo_count → sosyal kanıt uydurulamaz
    #   • image_*            → `upload-image` ucundan yüklenir (Pillow optimize)
    ALLOWED_PATCH_FIELDS = {
        'title', 'location', 'price', 'original_price', 'discount', 'duration',
        'guide', 'accommodation', 'transportation', 'category', 'description',
        'included', 'excluded', 'filmed_in',
    }

    def partial_update(self, request, *args, **kwargs):
        """PATCH — Yalnızca beyaz listedeki alanlara izin ver."""
        unknown = set(request.data.keys()) - self.ALLOWED_PATCH_FIELDS
        if unknown and not request.user.is_staff:
            return Response(
                {'error': f"Bu alanlar güncellenemez: {', '.join(sorted(unknown))}"},
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

        optimized = optimize_image(image_file)
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

        # Misafir bilgileri rezervasyonu yapan hesaptan farklı olabilir;
        # doluysa onlar, değilse hesabın kendi bilgileri kullanılır.
        manifest_data = [
            {
                'booking_ref': b.booking_ref,
                'passenger':   b.guest_full_name or b.user.get_full_name() or b.user.username,
                'phone':       b.guest_phone or '—',
                'email':       b.guest_email or b.user.email,
                'pax':         b.guests,
                'hotel':       b.guest_hotel or '—',
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
    # slugify() ASCII dışını atar; "Günübirlik" → "gnbirlik" gibi okunaksız
    # slug'lar çıkmasın diye Türkçe karakterler önce karşılıklarına çevrilir.
    TR_CHAR_MAP = str.maketrans({
        'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g',
        'ü': 'u', 'Ü': 'u', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c',
    })

    @classmethod
    def _generate_slug(cls, title: str) -> str:
        """Başlıktan benzersiz slug üretir: 'Pamukkale Turu' → 'pamukkale-turu'."""
        base = slugify(title.translate(cls.TR_CHAR_MAP))[:80] or 'tur'
        slug = base
        while Tour.objects.filter(pk=slug).exists():
            # Çakışmada kısa rastgele ek — sayaçla denemeye göre hem yarış
            # koşullarına dayanıklı hem de tek sorguda biter.
            slug = f'{base}-{uuid.uuid4().hex[:6]}'
        return slug

    @staticmethod
    def _parse_capacity(raw, default: int = 20) -> int:
        """default_capacity serbest metin gelebilir; bozuksa varsayılana düş."""
        try:
            value = int(raw)
        except (TypeError, ValueError):
            return default
        return value if 1 <= value <= 1000 else default

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
