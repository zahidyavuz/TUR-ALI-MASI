from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg
from reviews.models import Review
from bookings.models import Booking


@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def update_tour_rating(sender, instance, **kwargs):
    tour = instance.tour
    reviews = Review.objects.filter(tour=tour)
    count = reviews.count()

    if count > 0:
        avg_rating = reviews.aggregate(Avg('rating'))['rating__avg']
        tour.rating = round(avg_rating, 1)
        tour.reviews_count = count
    else:
        tour.rating = 5.0
        tour.reviews_count = 0

    tour.save()


@receiver(post_save, sender=Booking)
def update_fomo_count(sender, instance, created, **kwargs):
    """Update fomo_count when a new booking is created for a tour."""
    if created:
        tour = instance.tour
        tour.fomo_count = Booking.objects.filter(tour=tour).count()
        tour.save(update_fields=['fomo_count'])
