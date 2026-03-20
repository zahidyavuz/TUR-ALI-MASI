from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Wishlist
from tours.serializers import TourListSerializer


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone_number', 'avatar']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']
        read_only_fields = ['id', 'username']

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
        read_only_fields = ['created_at']
