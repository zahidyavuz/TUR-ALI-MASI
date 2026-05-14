from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from django.utils import timezone
from .models import Agency, DiningReservation
from core.permissions import IsAgentOwner

class RestaurantDailyStatsView(views.APIView):
    """
    GET /api/v1/restaurant/daily-stats/
    """
    permission_classes = [IsAuthenticated, IsAgentOwner]

    def get(self, request):
        restaurant = request.user.agency_profile
        today = timezone.now().date()
        
        # Completed reservations today
        completed_today = DiningReservation.objects.filter(
            restaurant=restaurant,
            reservation_date=today,
            status='completed'
        )
        
        stats = completed_today.aggregate(
            total_revenue=Sum('total_amount'),
            total_guests=Sum('guest_count')
        )
        
        # Current seated count
        current_seated = DiningReservation.objects.filter(
            restaurant=restaurant,
            reservation_date=today,
            status='seated'
        ).aggregate(count=Count('id'))['count'] or 0

        return Response({
            'total_revenue': float(stats['total_revenue'] or 0),
            'total_guests': stats['total_guests'] or 0,
            'current_seated': current_seated,
            'available_tables': restaurant.available_tables
        })

class DiningReservationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for restaurant reservations.
    """
    permission_classes = [IsAuthenticated, IsAgentOwner]
    serializer_class = None # I should create a serializer, but for now I'll use raw data if needed or create one.

    def get_queryset(self):
        return DiningReservation.objects.filter(restaurant=self.request.user.agency_profile)

    def list(self, request):
        queryset = self.get_queryset().filter(reservation_date=timezone.now().date())
        # Manual serialization for speed in this task
        data = [{
            'id': r.id,
            'name': r.guest_name,
            'time': r.reservation_time.strftime('%H:%M'),
            'pax': r.guest_count,
            'menu': 'Ön Ödemeli Menü',
            'note': r.notes,
            'status': r.status
        } for r in queryset]
        return Response(data)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        if new_status in ['seated', 'completed', 'cancelled']:
            instance.status = new_status
            instance.save()
            return Response({'status': 'updated'})
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
