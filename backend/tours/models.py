from django.db import models
from agencies.models import Agency


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, max_length=100)
    icon = models.CharField(max_length=50, blank=True, null=True)  # e.g. emoji or icon class name
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Tour(models.Model):
    id = models.SlugField(primary_key=True, max_length=100)  # e.g. 'kapadokya'
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='tours', null=True, blank=True)
    title = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)
    reviews_count = models.IntegerField(default=0)

    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # e.g. 2400
    discount = models.CharField(max_length=50, blank=True, null=True)  # e.g. '%25'
    fomo_count = models.IntegerField(default=0)

    duration = models.CharField(max_length=100)  # e.g. '3 Gün, 2 Gece'
    guide = models.CharField(max_length=255)  # e.g. 'Türkçe, İngilizce'
    accommodation = models.CharField(max_length=255, blank=True, null=True)
    transportation = models.CharField(max_length=255, blank=True, null=True)

    image_main = models.ImageField(upload_to='tours/')
    image_sub1 = models.ImageField(upload_to='tours/', blank=True, null=True)
    image_sub2 = models.ImageField(upload_to='tours/', blank=True, null=True)

    description = models.TextField()
    # Keep old category CharField for backward compat, add FK
    category = models.CharField(max_length=255)  # legacy field: 'culture, romantic, history'
    category_obj = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='tours')
    filmed_in = models.CharField(max_length=255, blank=True, null=True)

    included = models.JSONField(default=list, blank=True)
    excluded = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.title


class TourItinerary(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='itinerary_steps')
    day = models.IntegerField()
    title = models.CharField(max_length=255)
    description = models.TextField()

    class Meta:
        ordering = ['day']

    def __str__(self):
        return f"{self.tour.title} - Day {self.day}"


class TourAvailability(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='availability_slots')
    date = models.DateField()
    max_capacity = models.IntegerField(default=20)
    booked_count = models.IntegerField(default=0)

    class Meta:
        unique_together = ('tour', 'date')
        ordering = ['date']
        verbose_name_plural = "Tour Availabilities"

    @property
    def remaining(self):
        return self.max_capacity - self.booked_count

    @property
    def is_available(self):
        return self.remaining > 0

    def __str__(self):
        return f"{self.tour.title} - {self.date} ({self.remaining} remaining)"
