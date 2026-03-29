from rest_framework import serializers
from .models import Review
from django.contrib.auth.models import User


class ReviewUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name']


class ReviewSerializer(serializers.ModelSerializer):
    user = ReviewUserSerializer(read_only=True)

    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ['user', 'agency_reply', 'agency_reply_at']


class AgencyReplySerializer(serializers.Serializer):
    agency_reply = serializers.CharField()
