from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models import F
import django_filters

from .models import SpaVenue, SpaService
from .serializers import (
    SpaVenueListSerializer, SpaVenueDetailSerializer,
    SpaServiceListSerializer, SpaServiceDetailSerializer,
)


class SpaVenueViewSet(viewsets.ReadOnlyModelViewSet):
    """Herkese açık salt-okunur mekân listesi/detayı. Oluşturma/güncelleme
    B2B ucundan yapılır (shuttles ModelViewSet aksine burada public create
    kapalı; ileride AgencySpaViewSet eklenecek)."""

    queryset = SpaVenue.objects.filter(is_active=True).select_related('agency')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['location']
    search_fields = ['name', 'location', 'description']
    ordering_fields = ['name']

    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action == 'list':
            return SpaVenueListSerializer
        return SpaVenueDetailSerializer


class SpaServiceFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price_per_person", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="price_per_person", lookup_expr='lte')

    class Meta:
        model = SpaService
        fields = ['venue']


class SpaServiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SpaService.objects.filter(is_active=True).select_related('venue', 'venue__agency')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SpaServiceFilter
    search_fields = ['title', 'description']
    ordering_fields = ['price_per_person', 'duration_minutes']

    def get_queryset(self):
        queryset = super().get_queryset()
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

    def get_serializer_class(self):
        if self.action == 'list':
            return SpaServiceListSerializer
        return SpaServiceDetailSerializer
