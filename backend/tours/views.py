from datetime import date as date_type

from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import F, Q

from .models import Tour, Category, TourAvailability, Combo
from .serializers import (
    TourListSerializer, TourDetailSerializer, CategorySerializer,
    TourAvailabilitySerializer, ComboSerializer,
)
from rest_framework.permissions import AllowAny
import django_filters


class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    """Virgülle ayrılmış çoklu değer kabul eden CharFilter (`?category_obj=a,b`)."""
    pass


def _parse_guests(raw) -> int:
    """`guests` parametresini güvenle pozitif tam sayıya çevirir (min 1)."""
    try:
        guests = int(raw) if raw else 1
    except (TypeError, ValueError):
        guests = 1
    return guests if guests >= 1 else 1


class TourFilter(django_filters.FilterSet):
    """
    Müsaitlik bazlı arama + katalog filtreleri (F4-01).

    Tüm filtreler sunucu tarafında ve kombinlenebilir çalışır; eskiden ön yüz
    fiyat/kategori/süre filtrelerini sayfalanmış yanıt üzerinde (yalnız 12
    kayıtlık geçerli sayfada) uyguluyordu, bu da yanlış sonuç veriyordu.

    - `date` (+ opsiyonel `guests`): o gün `max_capacity - booked_count >= guests`
      olan, kapalı olmayan turlar (TourAvailability join + distinct).
    - `min_price`/`max_price`, `min_rating`: sayısal aralıklar.
    - `category`/`location`/`duration`: `icontains` (serbest metin verisiyle
      exact match işe yaramıyordu — 'Istanbul' ≠ 'İstanbul, Türkiye').
    - `category_obj`: Category slug'ı, virgülle çoklu.
    """
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr='lte')
    min_rating = django_filters.NumberFilter(field_name="rating", lookup_expr='gte')
    category = django_filters.CharFilter(field_name="category", lookup_expr='icontains')
    location = django_filters.CharFilter(field_name="location", lookup_expr='icontains')
    duration = django_filters.CharFilter(field_name="duration", lookup_expr='icontains')
    category_obj = CharInFilter(field_name="category_obj__slug", lookup_expr='in')
    guide = django_filters.CharFilter(method='filter_by_guide')
    date = django_filters.DateFilter(method='filter_by_availability')

    class Meta:
        model = Tour
        fields = []

    def filter_by_guide(self, queryset, name, value):
        # Ön yüz rehber dilini virgülle çoklu gönderir (`?guide=Türkçe,İngilizce`);
        # `guide` alanı serbest metin ("Türkçe/İngilizce" gibi birleşik olabilir),
        # bu yüzden her seçilen dil için OR'lanmış icontains uygulanır.
        langs = [v.strip() for v in value.split(',') if v.strip()]
        if not langs:
            return queryset
        q = Q()
        for lang in langs:
            q |= Q(guide__icontains=lang)
        return queryset.filter(q)

    def filter_by_availability(self, queryset, name, value):
        # guests ayrı bir filtre değil; müsaitlik hesabı için burada okunur.
        guests = _parse_guests(self.data.get('guests'))
        return queryset.filter(
            availability_slots__date=value,
            availability_slots__is_closed=False,
            availability_slots__max_capacity__gte=F('availability_slots__booked_count') + guests,
        ).distinct()


class TourViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Genel (müşteriye açık) tur kataloğu — salt okunur.

    Tur yazma işlemleri yalnızca acenta panelinden yapılır
    (`/api/v1/agency/tours/`, bkz. agencies/agency_tours_views.py); orada
    IsAgentOwner + IsVerifiedAgent ve acentaya göre queryset filtresi vardır.
    """
    queryset = Tour.objects.select_related('agency', 'category_obj').all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TourFilter
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['price', 'rating', 'reviews_count', 'fomo_count']

    def get_queryset(self):
        # Görseli olmayan tur "taslak" sayılır: panelden yeni oluşturulmuş
        # ama henüz görseli yüklenmemiş kayıtlar katalogda görünmez.
        # NOT: date/guests müsaitlik filtresi artık TourFilter'da (F4-01).
        return super().get_queryset().exclude(image_main='')

    # NOT: Burada 15 dakikalık `cache_page` vardı. Acenta panelden tur
    # ekleyip görselini yükledikten sonra tur katalogda 15 dakika boyunca
    # görünmüyordu ve invalidasyon yolu yoktu. Ayrıca ayarlarda paylaşımlı
    # bir CACHES tanımı olmadığı için önbellek süreç başına ayrı tutuluyor,
    # yani çok işçili sunumda zaten tutarsız. Gerçek bir önbellek katmanı
    # (Redis + yazma anında invalidasyon) ayrı bir görevde ele alınmalı.

    def get_serializer_class(self):
        if self.action == 'list':
            return TourListSerializer
        return TourDetailSerializer

    @action(detail=False, methods=['get'], url_path='available-dates')
    def available_dates(self, request):
        """
        Boş sonuç ekranı için alternatif tarih önerisi (F4-01).

        Aramadaki `date` dışındaki tüm filtreleri (konum, fiyat, kategori, puan)
        uygular, kalan tur kümesinde bugünden itibaren `guests` kişilik yeri olan
        en yakın 10 farklı günü döndürür. Böylece ön yüz "seçtiğin günde yer yok,
        ama şu tarihlerde var" diyebilir.
        """
        guests = _parse_guests(request.query_params.get('guests'))

        params = request.query_params.copy()
        params.pop('date', None)  # tarihi yok say; amaç alternatif tarih bulmak
        tour_ids = TourFilter(params, queryset=self.get_queryset()).qs.values_list('pk', flat=True)

        dates = (
            TourAvailability.objects
            .filter(
                tour_id__in=tour_ids,
                date__gte=date_type.today(),
                is_closed=False,
                max_capacity__gte=F('booked_count') + guests,
            )
            .order_by('date')
            .values_list('date', flat=True)
            .distinct()[:10]
        )
        return Response({'dates': [d.isoformat() for d in dates]})


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None  # Return all categories without pagination


class ComboViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Genel (müşteriye açık) küratörlü paket kataloğu — salt okunur (F5-03).

    Yalnız aktif combolar listelenir. Satın alma ayrı bir uçtan yapılır
    (`POST /api/v1/bookings/` + `service_type='combo'`); combo yazma işlemi
    şimdilik admin panelinden yönetilir.
    """
    queryset = Combo.objects.select_related('tour', 'menu', 'menu__restaurant').filter(is_active=True)
    serializer_class = ComboSerializer
    permission_classes = [AllowAny]
