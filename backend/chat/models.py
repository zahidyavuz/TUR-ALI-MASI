from django.db import models
from django.contrib.auth.models import User
from tours.models import TourAvailability
import uuid

class ChatRoom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tour_availability = models.OneToOneField(TourAvailability, on_delete=models.CASCADE, related_name='chat_room')
    is_active = models.BooleanField(default=False)
    is_readonly = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chat for {self.tour_availability.tour.title} on {self.tour_availability.date}"

class Message(models.Model):
    MESSAGE_TYPES = (
        ('text', 'Text'),
        ('announcement', 'Announcement'),
        ('location', 'Location'),
        ('media', 'Media'),
        ('meeting_point', 'Meeting Point'),
    )

    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    content = models.TextField(blank=True, null=True)
    media_file = models.FileField(upload_to='chat_media/', blank=True, null=True)
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:20] if self.content else self.message_type}"
