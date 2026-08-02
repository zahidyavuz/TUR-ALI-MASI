from rest_framework import serializers
from .models import SpaVenue, SpaService, SpaAvailability
from tours.serializers import SmartImageField
from agencies.serializers import AgencySerializer


class SpaAvailabilitySerializer(serializers.ModelSerializer):
    remaining = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()

    class Meta:
        model = SpaAvailability
        fields = ['id', 'date', 'time', 'max_capacity', 'booked_count', 'remaining', 'is_available']


class SpaServiceListSerializer(serializers.ModelSerializer):
    image = SmartImageField()

    class Meta:
        model = SpaService
        fields = [
            'id', 'venue', 'title', 'price_per_person', 'duration_minutes',
            'min_guests', 'max_guests', 'image',
        ]


class SpaServiceDetailSerializer(serializers.ModelSerializer):
    availability_slots = SpaAvailabilitySerializer(many=True, read_only=True)
    image = SmartImageField()

    class Meta:
        model = SpaService
        fields = '__all__'


class SpaVenueListSerializer(serializers.ModelSerializer):
    image_main = SmartImageField()

    class Meta:
        model = SpaVenue
        fields = ['id', 'name', 'location', 'image_main']


class SpaVenueDetailSerializer(serializers.ModelSerializer):
    agency = AgencySerializer(read_only=True)
    services = SpaServiceListSerializer(many=True, read_only=True)
    image_main = SmartImageField()
    image_sub1 = SmartImageField()
    image_sub2 = SmartImageField()

    class Meta:
        model = SpaVenue
        fields = '__all__'


# ── B2B (Acenta paneli) serializer'ları ────────────────────────────────────
# Görseller create anında zorunlu değildir; ayrı `upload-image` ucundan
# yüklenir (shuttles/tours deseni). `id` slug PK sunucuda ada/başlığa göre
# üretilir, `agency` sahiplikten türetilir — ikisi de istemciden alınmaz.
class AgencySpaVenueSerializer(serializers.ModelSerializer):
    agency = AgencySerializer(read_only=True)
    services = SpaServiceListSerializer(many=True, read_only=True)
    image_main = SmartImageField(required=False, allow_null=True)
    image_sub1 = SmartImageField(required=False, allow_null=True)
    image_sub2 = SmartImageField(required=False, allow_null=True)

    class Meta:
        model = SpaVenue
        fields = '__all__'
        read_only_fields = ['id']


class AgencySpaServiceSerializer(serializers.ModelSerializer):
    availability_slots = SpaAvailabilitySerializer(many=True, read_only=True)
    image = SmartImageField(required=False, allow_null=True)

    class Meta:
        model = SpaService
        fields = '__all__'
        read_only_fields = ['id']
