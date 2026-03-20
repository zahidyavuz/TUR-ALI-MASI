from django.db import models
from django.contrib.auth.models import User
from tours.models import Tour
from django.core.validators import MinValueValidator, MaxValueValidator


class Review(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    # Agency response
    agency_reply = models.TextField(blank=True, null=True)
    agency_reply_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.tour.title} ({self.rating}/5)"
