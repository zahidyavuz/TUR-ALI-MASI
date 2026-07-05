from rest_framework import serializers
from .models import Booking
from tours.serializers import TourListSerializer
from shuttles.serializers import ShuttleRouteListSerializer


class BookingSerializer(serializers.ModelSerializer):
    # Both nullable — a booking has exactly one of tour/shuttle_route set,
    # matching service_type. TourListSerializer/ShuttleRouteListSerializer
    # both return None when their source object is None.
    tour_detail = TourListSerializer(source='tour', read_only=True)
    shuttle_detail = ShuttleRouteListSerializer(source='shuttle_route', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'service_type', 'tour', 'tour_detail', 'shuttle_route', 'shuttle_detail',
            'user_email', 'user_full_name', 'date_label', 'start_date', 'start_time', 'end_date',
            'guests', 'total_price', 'status', 'booking_ref',
            'payment_intent_id', 'created_at', 'cancelled_at'
        ]
        read_only_fields = ['user', 'status', 'total_price', 'booking_ref', 'payment_intent_id', 'cancelled_at']
