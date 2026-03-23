from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from .models import Review


@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def update_tour_rating(sender, instance, **kwargs):
    """Automatically update Tour rating and reviews_count when a Review is created/deleted."""
    tour = instance.tour
    stats = Review.objects.filter(tour=tour).aggregate(
        avg_rating=Avg('rating'),
        total_reviews=Count('id')
    )
    tour.rating = round(stats['avg_rating'] or 5.0, 1)
    tour.reviews_count = stats['total_reviews']
    tour.save(update_fields=['rating', 'reviews_count'])
