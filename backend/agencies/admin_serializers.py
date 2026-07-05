from django.db.models import Q
from rest_framework import serializers
from .models import Agency
from tours.models import Tour
from bookings.models import Booking


class AdminAgencyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for agency listing in admin panel"""
    tour_count = serializers.SerializerMethodField()
    owner_username = serializers.SerializerMethodField()

    class Meta:
        model = Agency
        fields = [
            'id', 'name', 'logo', 'is_verified', 'is_active', 'is_demo',
            'business_type', 'status', 'onboarding_step',
            'tursab_no', 'commission_rate', 'sub_merchant_id',
            'phone', 'email', 'trust_score', 'tour_count',
            'owner_username', 'created_at'
        ]

    def get_tour_count(self, obj):
        return obj.tours.count()

    def get_owner_username(self, obj):
        return obj.owner.username if obj.owner else None


class AdminAgencyDetailSerializer(serializers.ModelSerializer):
    """Full serializer for agency detail/edit in admin panel"""
    tour_count = serializers.SerializerMethodField()
    total_bookings = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()
    owner_username = serializers.SerializerMethodField()

    class Meta:
        model = Agency
        fields = [
            'id', 'name', 'logo', 'cover_image', 'description',
            'phone', 'email', 'address', 'city', 'district', 'website',
            'trust_score', 'tursab_no', 'commission_rate', 'sub_merchant_id',
            'business_type', 'legal_entity_type',
            'status', 'rejection_reason', 'onboarding_step',
            'tax_id', 'tax_office', 'mersis_no', 'trade_registry_document',
            'tursab_group', 'tursab_document',
            'iban', 'bank_account_holder', 'bank_name',
            'contract_accepted_at', 'kvkk_accepted_at',
            'is_verified', 'is_active', 'is_demo',
            'owner', 'owner_username',
            'tour_count', 'total_bookings', 'total_revenue',
            'created_at'
        ]
        read_only_fields = ['owner', 'created_at', 'tour_count', 'total_bookings', 'total_revenue']

    def get_tour_count(self, obj):
        return obj.tours.count()

    def get_total_bookings(self, obj):
        return Booking.objects.filter(Q(tour__agency=obj) | Q(shuttle_route__agency=obj)).count()

    def get_total_revenue(self, obj):
        from django.db.models import Sum
        result = Booking.objects.filter(
            Q(tour__agency=obj) | Q(shuttle_route__agency=obj), status='confirmed'
        ).aggregate(total=Sum('total_price'))['total']
        return float(result) if result else 0

    def get_owner_username(self, obj):
        return obj.owner.username if obj.owner else None
