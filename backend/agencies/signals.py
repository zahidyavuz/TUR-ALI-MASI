from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import DiningReservation, Agency

@receiver(post_save, sender=DiningReservation)
def broadcast_reservation(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        restaurant_id = instance.restaurant.id
        group_name = f'restaurant_{restaurant_id}'

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'restaurant_message',
                'message': {
                    'action': 'new_reservation',
                    'data': {
                        'id': instance.id,
                        'name': instance.guest_name,
                        'time': instance.reservation_time.strftime('%H:%M'),
                        'pax': instance.guest_count,
                        'menu': 'Ön Ödemeli Menü', # Simplified for now
                        'note': instance.notes,
                        'status': instance.status
                    }
                }
            }
        )

@receiver(post_save, sender=DiningReservation)
def update_table_capacity(sender, instance, created, **kwargs):
    """
    Handle table capacity logic when guest is seated.
    """
    if instance.status == 'seated':
        restaurant = instance.restaurant
        if restaurant.available_tables > 0:
            restaurant.available_tables -= 1
            restaurant.save(update_fields=['available_tables'])
            
            # Also broadcast KPI update
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'restaurant_{restaurant.id}',
                {
                    'type': 'restaurant_message',
                    'message': {
                        'action': 'kpi_update',
                        'data': {
                            'available_tables': restaurant.available_tables,
                        }
                    }
                }
            )
    elif instance.status == 'completed':
        # When completed, table becomes free again
        restaurant = instance.restaurant
        restaurant.available_tables += 1
        restaurant.save(update_fields=['available_tables'])
        
        # Broadcast KPI update
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'restaurant_{restaurant.id}',
            {
                'type': 'restaurant_message',
                'message': {
                    'action': 'kpi_update',
                    'data': {
                        'available_tables': restaurant.available_tables,
                    }
                }
            }
        )
