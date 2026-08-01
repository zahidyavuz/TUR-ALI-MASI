from django.db import models
from agencies.models import Agency


class SpaVenue(models.Model):
    """Bir spa/wellness mekânı. Acentaya bağlı (shuttles.ShuttleRoute deseni)."""

    id = models.SlugField(primary_key=True, max_length=100)  # e.g. 'bodrum-thermal-spa'
    agency = models.ForeignKey(
        Agency, on_delete=models.CASCADE, related_name='spa_venues', null=True, blank=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255)

    image_main = models.ImageField(upload_to='spas/')
    image_sub1 = models.ImageField(upload_to='spas/', blank=True, null=True)
    image_sub2 = models.ImageField(upload_to='spas/', blank=True, null=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class SpaService(models.Model):
    """Bir mekânda sunulan tekil hizmet (masaj, hamam vb.)."""

    id = models.SlugField(primary_key=True, max_length=100)  # e.g. 'bodrum-thermal-spa-massage'
    venue = models.ForeignKey(SpaVenue, on_delete=models.CASCADE, related_name='services')
    title = models.CharField(max_length=255)
    description = models.TextField()

    # Fiyat kişi başıdır; Booking toplamı daima price_per_person * guests olarak
    # sunucu tarafında hesaplanır (bookings/views.py).
    price_per_person = models.DecimalField(max_digits=10, decimal_places=2)

    duration_minutes = models.IntegerField(default=60)

    # Rezervasyon başına misafir sınırları — SpaAvailability slot koltuk
    # kontrolünden ayrı; ikisi de rezervasyon anında zorlanır.
    min_guests = models.IntegerField(default=1)
    max_guests = models.IntegerField(default=8)

    image = models.ImageField(upload_to='spas/', blank=True, null=True)

    is_active = models.BooleanField(default=True)

    @property
    def agency(self):
        """Finans/bildirim çözümlemesi hizmeti değil mekânı sahiplendiğinden
        (booking.tour.agency vb.) aynı arayüz için türetilmiş özellik."""
        return self.venue.agency

    def __str__(self):
        return self.title


class SpaAvailability(models.Model):
    spa_service = models.ForeignKey(
        SpaService, on_delete=models.CASCADE, related_name='availability_slots'
    )
    date = models.DateField()
    time = models.TimeField()
    max_capacity = models.IntegerField(default=8)
    booked_count = models.IntegerField(default=0)

    class Meta:
        unique_together = ('spa_service', 'date', 'time')
        ordering = ['date', 'time']
        verbose_name_plural = "Spa Availabilities"

    @property
    def remaining(self):
        return self.max_capacity - self.booked_count

    @property
    def is_available(self):
        return self.remaining > 0

    def __str__(self):
        return f"{self.spa_service.title} - {self.date} {self.time} ({self.remaining} remaining)"
