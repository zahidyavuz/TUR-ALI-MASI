from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Wishlist, Notification, UserCoupon
from tours.serializers import TourListSerializer


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone_number', 'avatar']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()
    is_agency = serializers.SerializerMethodField()
    agency_id = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'is_agency', 'agency_id', 'is_staff', 'role']
        read_only_fields = ['id', 'username', 'is_agency', 'agency_id', 'is_staff', 'role']

    def get_is_agency(self, obj):
        return hasattr(obj, 'agency_profile')

    def get_agency_id(self, obj):
        if hasattr(obj, 'agency_profile'):
            return obj.agency_profile.id
        return None

    def get_role(self, obj):
        if obj.is_superuser or obj.is_staff:
            return 'Admin'
        if hasattr(obj, 'agency_profile'):
            return 'Agency'
        return 'Customer'


    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})

        # Update user fields
        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()

        # Update profile fields
        profile = instance.profile
        profile.phone_number = profile_data.get('phone_number', profile.phone_number)
        if 'avatar' in profile_data:
            profile.avatar = profile_data['avatar']
        profile.save()

        return instance


class WishlistSerializer(serializers.ModelSerializer):
    tour_detail = TourListSerializer(source='tour', read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'tour', 'tour_detail', 'created_at']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['created_at']

class UserCouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCoupon
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']
