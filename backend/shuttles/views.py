from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models import F
import django_filters

from .models import ShuttleRoute
from .serializers import ShuttleRouteListSerializer, ShuttleRouteDetailSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from backend.permissions import IsOwnerOrReadOnly


class ShuttleRouteFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price_per_person", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="price_per_person", lookup_expr='lte')

    class Meta:
        model = ShuttleRoute
        fields = ['origin', 'destination', 'vehicle_type']


class ShuttleRouteViewSet(viewsets.ModelViewSet):
    queryset = ShuttleRoute.objects.filter(is_active=True).select_related('agency')
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ShuttleRouteFilter
    search_fields = ['title', 'origin', 'destination', 'description']
    ordering_fields = ['price_per_person', 'duration_minutes']

    def get_queryset(self):
        queryset = super().get_queryset()
        date_param = self.request.query_params.get('date')
        passengers_param = self.request.query_params.get('passengers')

        if date_param:
            try:
                passengers = int(passengers_param) if passengers_param else 1
                queryset = queryset.filter(
                    availability_slots__date=date_param,
                    availability_slots__max_capacity__gte=F('availability_slots__booked_count') + passengers
                ).distinct()
            except ValueError:
                queryset = queryset.filter(availability_slots__date=date_param).distinct()

        return queryset

    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action == 'list':
            return ShuttleRouteListSerializer
        return ShuttleRouteDetailSerializer
