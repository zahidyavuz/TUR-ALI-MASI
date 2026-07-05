from django.db import models
from agencies.models import Agency


class ShuttleRoute(models.Model):
    VEHICLE_TYPE_CHOICES = [
        ('sedan', 'Sedan'),
        ('minivan', 'Minivan'),
        ('minibus', 'Minibüs'),
        ('bus', 'Otobüs'),
    ]

    id = models.SlugField(primary_key=True, max_length=100)  # e.g. 'kapadokya-havalimani-transfer'
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='shuttle_routes', null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField()

    origin = models.CharField(max_length=255)
    destination = models.CharField(max_length=255)

    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPE_CHOICES, default='minivan')
    capacity = models.IntegerField(default=8)  # vehicle capacity, informational

    # Pricing is per-person only — no per-vehicle pricing. Booking total is
    # always price_per_person * guests, computed server-side (bookings/views.py).
    price_per_person = models.DecimalField(max_digits=10, decimal_places=2)

    # Per-booking passenger bounds — distinct from ShuttleAvailability's
    # per-slot remaining-seat check. Both are enforced at booking time.
    min_passengers = models.IntegerField(default=1)
    max_passengers = models.IntegerField(default=8)

    duration_minutes = models.IntegerField(default=60)

    image_main = models.ImageField(upload_to='shuttles/')
    image_sub1 = models.ImageField(upload_to='shuttles/', blank=True, null=True)
    image_sub2 = models.ImageField(upload_to='shuttles/', blank=True, null=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class ShuttleAvailability(models.Model):
    shuttle_route = models.ForeignKey(ShuttleRoute, on_delete=models.CASCADE, related_name='availability_slots')
    date = models.DateField()
    time = models.TimeField()
    max_capacity = models.IntegerField(default=8)
    booked_count = models.IntegerField(default=0)

    class Meta:
        unique_together = ('shuttle_route', 'date', 'time')
        ordering = ['date', 'time']
        verbose_name_plural = "Shuttle Availabilities"

    @property
    def remaining(self):
        return self.max_capacity - self.booked_count

    @property
    def is_available(self):
        return self.remaining > 0

    def __str__(self):
        return f"{self.shuttle_route.title} - {self.date} {self.time} ({self.remaining} remaining)"
