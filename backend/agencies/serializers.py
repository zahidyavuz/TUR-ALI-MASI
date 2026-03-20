from rest_framework import serializers
from .models import Agency


class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = [
            'id', 'name', 'logo', 'trust_score', 'description',
            'phone', 'email', 'address', 'website',
            'is_verified', 'created_at', 'owner'
        ]
        read_only_fields = ['is_verified', 'created_at', 'owner']


class AgencyApplicationSerializer(serializers.ModelSerializer):
    """Serializer for agency application — minimal fields required"""
    class Meta:
        model = Agency
        fields = ['name', 'description', 'phone', 'email', 'address', 'website']
