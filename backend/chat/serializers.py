from rest_framework import serializers
from .models import ChatRoom, Message
from users.models import UserProfile
from django.contrib.auth.models import User

class SenderSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    is_agency = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'name', 'avatar', 'is_agency']

    def get_avatar(self, obj):
        try:
            profile = obj.profile
            if profile.avatar:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.avatar.url)
                return profile.avatar.url
        except Exception:
            pass
        return None

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_is_agency(self, obj):
        return hasattr(obj, 'agency_profile') and obj.agency_profile is not None


class MessageSerializer(serializers.ModelSerializer):
    sender = SenderSerializer(read_only=True)
    media_file_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'room', 'sender', 'message_type', 'content', 'media_file', 'media_file_url', 'is_pinned', 'created_at']
        read_only_fields = ['sender', 'room']

    def get_media_file_url(self, obj):
        if obj.media_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.media_file.url)
            return obj.media_file.url
        return None

    def create(self, validated_data):
        # sender and room are passed in kwargs from the view
        return Message.objects.create(**validated_data)


class ChatRoomSerializer(serializers.ModelSerializer):
    tour_title = serializers.CharField(source='tour_availability.tour.title', read_only=True)
    tour_date = serializers.DateField(source='tour_availability.date', read_only=True)
    last_message = serializers.SerializerMethodField()
    tour_image = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'tour_title', 'tour_date', 'tour_image', 'is_active', 'is_readonly', 'created_at', 'last_message', 'tour_availability']

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if msg:
            return MessageSerializer(msg, context=self.context).data
        return None

    def get_tour_image(self, obj):
        tour = obj.tour_availability.tour
        if tour.image_main:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(tour.image_main.url)
            return tour.image_main.url
        return None
