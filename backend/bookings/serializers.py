from rest_framework import serializers
from .models import Booking
from .tokens import make_ticket_token
from users.guest import is_guest_user
from tours.serializers import TourListSerializer, ComboSerializer
from shuttles.serializers import ShuttleRouteListSerializer
from spas.serializers import SpaServiceListSerializer


class BookingSerializer(serializers.ModelSerializer):
    # Both nullable — a booking has exactly one of tour/shuttle_route set,
    # matching service_type. TourListSerializer/ShuttleRouteListSerializer
    # both return None when their source object is None. Combo bookings set
    # both `tour` (for capacity/manifest) and `combo` (the bundle).
    tour_detail = TourListSerializer(source='tour', read_only=True)
    shuttle_detail = ShuttleRouteListSerializer(source='shuttle_route', read_only=True)
    spa_detail = SpaServiceListSerializer(source='spa_service', read_only=True)
    combo_detail = ComboSerializer(source='combo', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    # Misafir (parolasız) rezervasyonlarda, ödeme-sonrası onay sayfasının kimlik
    # doğrulaması olmadan durumu sorgulayabilmesi için imzalı sihirli-bağlantı
    # token'ı. Üye rezervasyonlarında panel/`ref` yeterli olduğundan None döner.
    ticket_token = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'service_type', 'tour', 'tour_detail', 'shuttle_route', 'shuttle_detail',
            'spa_service', 'spa_detail', 'combo', 'combo_detail', 'combo_group',
            'user_email', 'user_full_name', 'date_label', 'start_date', 'start_time', 'end_date',
            'guests', 'total_price', 'status', 'booking_ref', 'checked_in_at',
            'guest_full_name', 'guest_email', 'guest_phone', 'guest_hotel',
            'payment_intent_id', 'ticket_token', 'created_at', 'cancelled_at'
        ]
        read_only_fields = [
            'user', 'status', 'total_price', 'booking_ref', 'checked_in_at',
            'payment_intent_id', 'cancelled_at', 'combo_group',
        ]

    def get_ticket_token(self, obj):
        if obj.user_id and is_guest_user(obj.user):
            return make_ticket_token(obj)
        return None
