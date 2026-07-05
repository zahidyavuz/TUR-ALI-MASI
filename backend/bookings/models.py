from django.db import models
from django.contrib.auth.models import User
from tours.models import Tour
from shuttles.models import ShuttleRoute
import uuid


class Booking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    # Nullable so a booking can reference either a Tour (tour/meal) or a
    # ShuttleRoute (shuttle) — exactly one of tour/shuttle_route is set,
    # matching service_type. Kept nullable rather than splitting into a
    # separate ShuttleBooking model so the existing Stripe webhook flow
    # (payment_intent_id lookup + atomic capacity restore) is reused as-is.
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='bookings', null=True, blank=True)
    shuttle_route = models.ForeignKey(ShuttleRoute, on_delete=models.CASCADE, related_name='bookings', null=True, blank=True)

    SERVICE_TYPE_CHOICES = [
        ('tour', 'Tour'),
        ('meal', 'Meal'),
        ('shuttle', 'Shuttle'),
    ]
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES, default='tour')
    
    date_label = models.CharField(max_length=255, blank=True, null=True)  # legacy compat
    start_date = models.DateField(null=True, blank=True)
    # Shuttles are time-slotted (ShuttleAvailability has date + time); tours
    # are date-only. Null for tour/meal bookings.
    start_time = models.TimeField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    guests = models.IntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    booking_ref = models.CharField(max_length=50, unique=True)
    payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        service_label = self.tour.title if self.tour else (
            self.shuttle_route.title if self.shuttle_route else 'Unknown service'
        )
        return f"{self.booking_ref} - {self.user.username} - {service_label}"
