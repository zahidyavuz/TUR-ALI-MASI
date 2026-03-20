from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from agencies.models import Agency
from tours.models import Tour
from bookings.models import Booking
from tours.serializers import TourListSerializer
from bookings.serializers import BookingSerializer

class AgencyDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Check if user has an agency
            agency = Agency.objects.get(owner=request.user)
            
            # Get agency tours
            tours = Tour.objects.filter(agency=agency)
            tour_serializer = TourListSerializer(tours, many=True)
            
            # Get agency bookings
            bookings = Booking.objects.filter(tour__agency=agency).order_by('-created_at')
            booking_serializer = BookingSerializer(bookings, many=True)
            
            # Simple metrics
            total_revenue = sum(b.total_price for b in bookings if b.status == 'confirmed')
            total_bookings = bookings.count()
            
            return Response({
                'agency_name': agency.name,
                'metrics': {
                    'total_revenue': total_revenue,
                    'total_bookings': total_bookings,
                },
                'tours': tour_serializer.data,
                'recent_bookings': booking_serializer.data[:10]
            })
            
        except Agency.DoesNotExist:
            return Response(
                {"error": "You are not registered as an agency owner."},
                status=status.HTTP_403_FORBIDDEN
            )
