from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models import F

from .models import Tour, Category, TourAvailability
from .serializers import TourListSerializer, TourDetailSerializer, CategorySerializer, TourAvailabilitySerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from backend.permissions import IsOwnerOrReadOnly
import django_filters


class TourFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr='lte')
    category_obj = django_filters.CharFilter(field_name="category_obj__slug")

    class Meta:
        model = Tour
        fields = ['category', 'location', 'duration', 'category_obj']


class TourViewSet(viewsets.ModelViewSet):
    queryset = Tour.objects.select_related('agency', 'category_obj').all()
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TourFilter
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['price', 'rating', 'reviews_count', 'fomo_count']

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

    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action == 'list':
            return TourListSerializer
        return TourDetailSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None  # Return all categories without pagination
