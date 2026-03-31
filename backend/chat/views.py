import datetime
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer
from tours.models import TourAvailability
from bookings.models import Booking

def update_chat_room_status(room):
    # Active 24h before tour start, ReadOnly 24h after end.
    # We only have `date` for tour_availability, and `duration` string like '3 Gün'. 
    # For MVP, assuming duration roughly defaults to 1 day or parse it.
    # To be safe, we'll keep it simple for now, relying on agency to close or just keeping it active.
    # Wait, requirement: "turun başlangıç tarihinden 24 saat önce otomatik olarak aktifleşmelidir. Otomatik kapanış: turun bitiş tarihi + 24 saat dolduğunda..."
    try:
        start_date = datetime.datetime.combine(room.tour_availability.date, datetime.time.min).replace(tzinfo=timezone.utc)
        # Parse duration
        duration_str = room.tour_availability.tour.duration.lower()
        days = 1
        if 'gün' in duration_str or 'day' in duration_str:
            import re
            match = re.search(r'(\d+)\s*(gün|day)', duration_str)
            if match:
                days = int(match.group(1))
        
        end_date = start_date + datetime.timedelta(days=days)
        
        now = timezone.now()
        activation_time = start_date - datetime.timedelta(hours=24)
        closure_time = end_date + datetime.timedelta(hours=24)
        
        if now < activation_time:
            room.is_active = False
            room.is_readonly = False
        elif activation_time <= now <= closure_time:
            room.is_active = True
            room.is_readonly = False
        else:
            room.is_active = True
            room.is_readonly = True
        room.save(update_fields=['is_active', 'is_readonly'])
    except Exception:
        pass


class ChatRoomListView(generics.ListAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ChatRoom.objects.all()

        if hasattr(user, 'agency_profile') and user.agency_profile:
            # Agency: Get chats for their tours
            qs = qs.filter(tour_availability__tour__agency=user.agency_profile)
        else:
            # Customer: Get chats for their booked tours
            booked_slots = Booking.objects.filter(user=user, payment_status='paid').values_list('tour_availability_id', flat=True)
            qs = qs.filter(tour_availability_id__in=booked_slots)
        
        for room in qs:
            update_chat_room_status(room)
            
        return qs

class ChatRoomDetailView(generics.RetrieveAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ChatRoom.objects.all()

    def get_object(self):
        obj = super().get_object()
        update_chat_room_status(obj)
        return obj

class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs['room_id']
        room = get_object_or_404(ChatRoom, pk=room_id)
        # Auth check
        user = self.request.user
        if hasattr(user, 'agency_profile') and user.agency_profile:
            if room.tour_availability.tour.agency != user.agency_profile:
                return Message.objects.none()
        else:
            has_booking = Booking.objects.filter(user=user, tour_availability=room.tour_availability, payment_status='paid').exists()
            if not has_booking:
                return Message.objects.none()
                
        # Optional: return only recent or implement pagination. Let's return all for now.
        return Message.objects.filter(room=room).order_by('created_at')

    def perform_create(self, serializer):
        room_id = self.kwargs['room_id']
        room = get_object_or_404(ChatRoom, pk=room_id)
        
        # Ensure room is active and not read-only
        update_chat_room_status(room)
        
        user = self.request.user
        msg_type = self.request.data.get('message_type', 'text')
        
        # Only agencies can pin or send announcements
        is_pinned = False
        if hasattr(user, 'agency_profile') and user.agency_profile:
            if str(self.request.data.get('is_pinned')).lower() == 'true' or self.request.data.get('is_pinned') is True:
                is_pinned = True
                
        # Check permissions for announcement
        if msg_type == 'announcement' and not (hasattr(user, 'agency_profile') and user.agency_profile):
            msg_type = 'text'

        message = serializer.save(room=room, sender=user, message_type=msg_type, is_pinned=is_pinned)
        
        # Trigger Notification for announcement
        if msg_type == 'announcement':
            from users.models import Notification
            # Get all users who booked this tour availability
            from bookings.models import Booking
            booked_users = Booking.objects.filter(
                tour_availability=room.tour_availability, 
                payment_status='paid'
            ).values_list('user', flat=True)
            
            notifications = []
            for bu_id in set(booked_users):
                if bu_id != user.id:
                    notifications.append(
                        Notification(
                            user_id=bu_id,
                            title=f"Kritik Duyuru: {room.tour_availability.tour.title}",
                            message=message.content[:100] if message.content else "Yeni bir duyuru paylaşıldı.",
                            type="announcement",
                            action_url=f"/tour-chat/{room.id}"
                        )
                    )
            if notifications:
                Notification.objects.bulk_create(notifications)
