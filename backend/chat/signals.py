from django.db.models.signals import post_save
from django.dispatch import receiver
from tours.models import TourAvailability
from .models import ChatRoom

@receiver(post_save, sender=TourAvailability)
def create_chat_room(sender, instance, created, **kwargs):
    if created:
        ChatRoom.objects.create(tour_availability=instance)
