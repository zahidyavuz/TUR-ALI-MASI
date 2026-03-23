from rest_framework import serializers
from .models import Booking
from tours.serializers import TourListSerializer


class BookingSerializer(serializers.ModelSerializer):
    tour_detail = TourListSerializer(source='tour', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'tour', 'tour_detail', 'user_email', 'user_full_name', 'date_label', 'start_date', 'end_date',
            'guests', 'total_price', 'status', 'booking_ref',
            'payment_intent_id', 'created_at', 'cancelled_at'
        ]
        read_only_fields = ['user', 'status', 'total_price', 'booking_ref', 'payment_intent_id', 'cancelled_at']
