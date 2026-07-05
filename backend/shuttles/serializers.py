from rest_framework import serializers
from .models import ShuttleRoute, ShuttleAvailability
from tours.serializers import SmartImageField
from agencies.serializers import AgencySerializer


class ShuttleAvailabilitySerializer(serializers.ModelSerializer):
    remaining = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()

    class Meta:
        model = ShuttleAvailability
        fields = ['id', 'date', 'time', 'max_capacity', 'booked_count', 'remaining', 'is_available']


class ShuttleRouteListSerializer(serializers.ModelSerializer):
    image_main = SmartImageField()

    class Meta:
        model = ShuttleRoute
        fields = [
            'id', 'title', 'origin', 'destination', 'vehicle_type', 'capacity',
            'price_per_person', 'min_passengers', 'max_passengers',
            'duration_minutes', 'image_main',
        ]


class ShuttleRouteDetailSerializer(serializers.ModelSerializer):
    agency = AgencySerializer(read_only=True)
    availability_slots = ShuttleAvailabilitySerializer(many=True, read_only=True)
    image_main = SmartImageField()
    image_sub1 = SmartImageField()
    image_sub2 = SmartImageField()

    class Meta:
        model = ShuttleRoute
        fields = '__all__'
