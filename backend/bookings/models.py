from django.db import models
from django.contrib.auth.models import User
from tours.models import Tour
import uuid


class Booking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='bookings')
    
    SERVICE_TYPE_CHOICES = [
        ('tour', 'Tour'),
        ('meal', 'Meal'),
    ]
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES, default='tour')
    
    date_label = models.CharField(max_length=255, blank=True, null=True)  # legacy compat
    start_date = models.DateField(null=True, blank=True)
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
        return f"{self.booking_ref} - {self.user.username} - {self.tour.title}"
