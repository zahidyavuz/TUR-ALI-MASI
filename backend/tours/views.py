from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import F

from .models import Tour, Category, TourAvailability
from .serializers import TourListSerializer, TourDetailSerializer, CategorySerializer, TourAvailabilitySerializer
from rest_framework.permissions import AllowAny
import django_filters


class TourFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr='lte')
    category_obj = django_filters.CharFilter(field_name="category_obj__slug")

    class Meta:
        model = Tour
        fields = ['category', 'location', 'duration', 'category_obj']


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
        queryset = super().get_queryset().exclude(image_main='')
        date_param = self.request.query_params.get('date')
        guests_param = self.request.query_params.get('guests')

        if date_param:
            try:
                guests = int(guests_param) if guests_param else 1
                queryset = queryset.filter(
                    availability_slots__date=date_param,
                    availability_slots__max_capacity__gte=F('availability_slots__booked_count') + guests
                ).distinct()
            except ValueError:
                queryset = queryset.filter(availability_slots__date=date_param).distinct()

        return queryset

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


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None  # Return all categories without pagination
