import datetime
from django.utils import timezone
from django.db.models import Exists, OuterRef
from rest_framework import generics, permissions
from django.shortcuts import get_object_or_404
from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer
from bookings.models import Booking


def update_chat_room_status(room):
    """Tur başlangıcından 24 saat önce aktifleşir, bitiş + 24 saat sonra salt-okunur olur."""
    try:
        start_date = datetime.datetime.combine(
            room.tour_availability.date, datetime.time.min
        ).replace(tzinfo=timezone.utc)

        import re
        duration_str = room.tour_availability.tour.duration.lower()
        days = 1
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


def _user_has_confirmed_booking(user, tour_availability):
    """Kullanıcının bu TourAvailability için onaylı rezervasyonu var mı?"""
    return Booking.objects.filter(
        user=user,
        tour=tour_availability.tour,
        start_date=tour_availability.date,
        status='confirmed',
    ).exists()


class ChatRoomListView(generics.ListAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ChatRoom.objects.all()

        if hasattr(user, 'agency_profile') and user.agency_profile:
            # Acenta: kendi turlarına ait chat odaları
            qs = qs.filter(tour_availability__tour__agency=user.agency_profile)
        else:
            # Müşteri: onaylı rezervasyonu olan tur+tarih çiftlerine ait odalar
            confirmed_booking = Booking.objects.filter(
                user=user,
                status='confirmed',
                tour=OuterRef('tour_availability__tour'),
                start_date=OuterRef('tour_availability__date'),
            )
            qs = qs.filter(Exists(confirmed_booking))

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
        user = self.request.user

        if hasattr(user, 'agency_profile') and user.agency_profile:
            if room.tour_availability.tour.agency != user.agency_profile:
                return Message.objects.none()
        else:
            if not _user_has_confirmed_booking(user, room.tour_availability):
                return Message.objects.none()

        return Message.objects.filter(room=room).order_by('created_at')

    def perform_create(self, serializer):
        room_id = self.kwargs['room_id']
        room = get_object_or_404(ChatRoom, pk=room_id)
        update_chat_room_status(room)

        user = self.request.user
        msg_type = self.request.data.get('message_type', 'text')

        is_pinned = False
        if hasattr(user, 'agency_profile') and user.agency_profile:
            if str(self.request.data.get('is_pinned')).lower() == 'true' or self.request.data.get('is_pinned') is True:
                is_pinned = True

        if msg_type == 'announcement' and not (hasattr(user, 'agency_profile') and user.agency_profile):
            msg_type = 'text'

        message = serializer.save(room=room, sender=user, message_type=msg_type, is_pinned=is_pinned)

        # Duyuru gönderildiğinde onaylı rezervasyon sahibi kullanıcılara bildirim
        if msg_type == 'announcement':
            from users.models import Notification
            booked_users = Booking.objects.filter(
                tour=room.tour_availability.tour,
                start_date=room.tour_availability.date,
                status='confirmed',
            ).values_list('user', flat=True)

            notifications = [
                Notification(
                    user_id=bu_id,
                    title=f"Kritik Duyuru: {room.tour_availability.tour.title}",
                    message=message.content[:100] if message.content else "Yeni bir duyuru paylaşıldı.",
                    type="announcement",
                    action_url=f"/tour-chat/{room.id}",
                )
                for bu_id in set(booked_users)
                if bu_id != user.id
            ]
            if notifications:
                Notification.objects.bulk_create(notifications)
