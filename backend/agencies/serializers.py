from rest_framework import serializers
from .models import Agency, Menu, TableReservation


class AgencySerializer(serializers.ModelSerializer):
    business_type_display = serializers.CharField(source='get_business_type_display', read_only=True)

    class Meta:
        model = Agency
        fields = [
            'id', 'name', 'logo', 'trust_score', 'description',
            'phone', 'email', 'address', 'website',
            'business_type', 'business_type_display',
            'is_verified', 'created_at', 'owner'
        ]
        read_only_fields = ['is_verified', 'created_at', 'owner']


class AgencyApplicationSerializer(serializers.ModelSerializer):
    """Serializer for agency application — minimal fields required"""
    class Meta:
        model = Agency
        fields = ['name', 'description', 'phone', 'email', 'address', 'website', 'business_type']


class MenuSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Menu
        fields = [
            'id', 'restaurant', 'name', 'description',
            'category', 'category_display',
            'price', 'daily_price', 'effective_price',
            'is_available', 'is_daily_special', 'image',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TableReservationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TableReservation
        fields = [
            'id', 'restaurant',
            'guest_name', 'guest_phone', 'guest_email', 'guest_count',
            'table_number', 'reservation_date', 'reservation_time',
            'notes', 'status', 'status_display', 'created_at'
        ]
        read_only_fields = ['created_at']

