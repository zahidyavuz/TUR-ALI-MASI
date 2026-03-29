from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from agencies.models import Agency
from tours.models import Tour
from bookings.models import Booking
from reviews.models import Review
from tours.serializers import TourListSerializer
from bookings.serializers import BookingSerializer
from django.db.models import Sum, Count, Avg, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta


class AgencyDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            agency = Agency.objects.get(owner=request.user)
        except Agency.DoesNotExist:
            return Response(
                {"error": "You are not registered as an agency owner."},
                status=status.HTTP_403_FORBIDDEN
            )

        tours = Tour.objects.filter(agency=agency)
        tour_serializer = TourListSerializer(tours, many=True)

        bookings = Booking.objects.filter(tour__agency=agency).order_by('-created_at')
        booking_serializer = BookingSerializer(bookings, many=True)

        # ─── Core Metrics ───
        confirmed_bookings = bookings.filter(status='confirmed')
        total_revenue = confirmed_bookings.aggregate(total=Sum('total_price'))['total'] or 0
        total_bookings = bookings.count()
        confirmed_count = confirmed_bookings.count()
        cancelled_count = bookings.filter(status='cancelled').count()
        pending_count = bookings.filter(status='pending').count()

        # Conversion rate (confirmed / total)
        conversion_rate = round((confirmed_count / total_bookings * 100), 1) if total_bookings > 0 else 0

        # ─── Monthly Revenue Trend (last 6 months) ───
        six_months_ago = timezone.now() - timedelta(days=180)
        monthly_revenue = (
            confirmed_bookings
            .filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(
                revenue=Sum('total_price'),
                booking_count=Count('id')
            )
            .order_by('month')
        )

        # ─── Top Performing Tour ───
        top_tour = (
            confirmed_bookings
            .values('tour__title', 'tour__id')
            .annotate(revenue=Sum('total_price'), count=Count('id'))
            .order_by('-revenue')
            .first()
        )

        # ─── Average Rating ───
        avg_rating = Review.objects.filter(tour__agency=agency).aggregate(avg=Avg('rating'))['avg']
        total_reviews = Review.objects.filter(tour__agency=agency).count()

        # ─── This Month vs Last Month ───
        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

        this_month_revenue = confirmed_bookings.filter(
            created_at__gte=this_month_start
        ).aggregate(total=Sum('total_price'))['total'] or 0

        last_month_revenue = confirmed_bookings.filter(
            created_at__gte=last_month_start,
            created_at__lt=this_month_start
        ).aggregate(total=Sum('total_price'))['total'] or 0

        revenue_change = 0
        if last_month_revenue > 0:
            revenue_change = round(((this_month_revenue - last_month_revenue) / last_month_revenue) * 100, 1)

        return Response({
            'agency_name': agency.name,
            'metrics': {
                'total_revenue': float(total_revenue),
                'total_bookings': total_bookings,
                'confirmed_count': confirmed_count,
                'cancelled_count': cancelled_count,
                'pending_count': pending_count,
                'conversion_rate': conversion_rate,
                'avg_rating': round(float(avg_rating), 1) if avg_rating else None,
                'total_reviews': total_reviews,
                'this_month_revenue': float(this_month_revenue),
                'last_month_revenue': float(last_month_revenue),
                'revenue_change_percent': revenue_change,
            },
            'monthly_revenue': [
                {
                    'month': item['month'].strftime('%Y-%m'),
                    'revenue': float(item['revenue']),
                    'booking_count': item['booking_count'],
                }
                for item in monthly_revenue
            ],
            'top_tour': {
                'title': top_tour['tour__title'],
                'id': top_tour['tour__id'],
                'revenue': float(top_tour['revenue']),
                'booking_count': top_tour['count'],
            } if top_tour else None,
            'tours': tour_serializer.data,
            'recent_bookings': booking_serializer.data[:10],
        })
