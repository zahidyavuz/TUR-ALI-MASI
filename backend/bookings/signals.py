from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Booking
from users.models import Notification


@receiver(post_save, sender=Booking)
def booking_status_notification(sender, instance, **kwargs):
    """Create a Notification for the user when booking status changes."""
    if not instance.user:
        return

    status_messages = {
        'confirmed': {
            'title': 'Rezervasyonunuz Onaylandı! ✅',
            'message': f'{instance.tour.title} turu için ödemeniz alındı. Referans: {instance.booking_ref}',
            'icon': '✅',
        },
        'cancelled': {
            'title': 'Rezervasyonunuz İptal Edildi',
            'message': f'{instance.tour.title} turu için olan rezervasyonunuz ({instance.booking_ref}) iptal edildi.',
            'icon': '❌',
        },
        'failed': {
            'title': 'Ödeme Başarısız',
            'message': f'{instance.tour.title} turu için ödemeniz başarısız oldu. Lütfen tekrar deneyin.',
            'icon': '⚠️',
        },
    }

    msg = status_messages.get(instance.status)
    if msg:
        # Avoid duplicate notifications for the same booking+status
        existing = Notification.objects.filter(
            user=instance.user,
            title=msg['title'],
            action_url=f'/bookings',
            type='booking'
        ).filter(message__contains=instance.booking_ref).exists()

        if not existing:
            Notification.objects.create(
                user=instance.user,
                title=msg['title'],
                message=msg['message'],
                icon=msg['icon'],
                type='booking',
                action_url='/bookings'
            )

    # Also notify the agency owner
    if instance.status == 'confirmed' and hasattr(instance.tour, 'agency') and instance.tour.agency:
        agency_owner = instance.tour.agency.owner
        if agency_owner:
            Notification.objects.create(
                user=agency_owner,
                title='Yeni Onaylı Rezervasyon! 🎉',
                message=f'{instance.tour.title} turu için yeni bir rezervasyon onaylandı. Ref: {instance.booking_ref}',
                icon='🎉',
                type='booking',
                action_url='/agency/dashboard'
            )
