from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from .models import Review
from .serializers import ReviewSerializer, AgencyReplySerializer
from bookings.models import Booking
import django_filters


class ReviewFilter(django_filters.FilterSet):
    tour = django_filters.CharFilter(field_name='tour_id')
    min_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='gte')
    max_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='lte')

    class Meta:
        model = Review
        fields = ['tour', 'rating']


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related('user', 'tour').all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_class = ReviewFilter

    def create(self, request, *args, **kwargs):
        tour_id = request.data.get('tour')
        user = request.user

        # Check if user has a confirmed booking for this tour
        has_booked = Booking.objects.filter(user=user, tour_id=tour_id, status='confirmed').exists()

        if not has_booked:
            return Response(
                {"error": "You can only review tours you have booked and confirmed."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if user already reviewed this tour
        has_reviewed = Review.objects.filter(user=user, tour_id=tour_id).exists()
        if has_reviewed:
            return Response(
                {"error": "You have already reviewed this tour."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='reply', permission_classes=[IsAuthenticated])
    def agency_reply(self, request, pk=None):
        """POST /api/v1/reviews/<id>/reply/ — Agency owner replies to a review"""
        review = self.get_object()

        # Check if user owns the agency that owns the tour
        if not hasattr(request.user, 'agency_profile'):
            return Response(
                {"error": "Sadece acenta sahipleri yanıt verebilir."},
                status=status.HTTP_403_FORBIDDEN
            )

        agency = request.user.agency_profile
        if review.tour.agency != agency:
            return Response(
                {"error": "Bu tur sizin acentanıza ait değil."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AgencyReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review.agency_reply = serializer.validated_data['agency_reply']
        review.agency_reply_at = timezone.now()
        review.save()

        return Response(ReviewSerializer(review).data)
