from rest_framework import serializers
from .models import Tour, TourItinerary, Category, TourAvailability
from agencies.serializers import AgencySerializer


class SmartImageField(serializers.ImageField):
    """
    If the stored filename looks like an external URL (starts with http),
    return that URL directly instead of prepending /media/.
    """
    def to_representation(self, value):
        if not value:
            return None
        name = value.name if hasattr(value, 'name') else str(value)
        if name.startswith('http://') or name.startswith('https://') or name.startswith('https%3A'):
            if name.startswith('https%3A'):
                name = name.replace('https%3A', 'https:', 1)
            if name.startswith('http%3A'):
                name = name.replace('http%3A', 'http:', 1)
            name = name.replace('%2F', '/')
            if name.startswith('https:/') and not name.startswith('https://'):
                name = name.replace('https:/', 'https://', 1)
            if name.startswith('http:/') and not name.startswith('http://'):
                name = name.replace('http:/', 'http://', 1)
            return name
        return super().to_representation(value)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'description']


class TourItinerarySerializer(serializers.ModelSerializer):
    class Meta:
        model = TourItinerary
        fields = ['id', 'day', 'title', 'description']


class TourAvailabilitySerializer(serializers.ModelSerializer):
    remaining = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()

    class Meta:
        model = TourAvailability
        fields = ['id', 'date', 'max_capacity', 'booked_count', 'remaining', 'is_available']


class TourListSerializer(serializers.ModelSerializer):
    image_main = SmartImageField()
    category_detail = CategorySerializer(source='category_obj', read_only=True)

    class Meta:
        model = Tour
        fields = [
            'id', 'title', 'location', 'rating', 'reviews_count',
            'original_price', 'price', 'discount', 'duration',
            'image_main', 'category', 'category_detail', 'fomo_count'
        ]


class TourDetailSerializer(serializers.ModelSerializer):
    agency = AgencySerializer(read_only=True)
    itinerary_steps = TourItinerarySerializer(many=True, read_only=True)
    availability_slots = TourAvailabilitySerializer(many=True, read_only=True)
    category_detail = CategorySerializer(source='category_obj', read_only=True)
    image_main = SmartImageField()
    image_sub1 = SmartImageField()
    image_sub2 = SmartImageField()

    class Meta:
        model = Tour
        fields = '__all__'
