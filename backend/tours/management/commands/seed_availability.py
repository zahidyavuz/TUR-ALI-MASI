from django.core.management.base import BaseCommand
from tours.models import Tour, TourAvailability
from datetime import date, timedelta
import random


class Command(BaseCommand):
    help = 'Create availability slots for the next N days for all tours'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=90, help='Number of days to generate (default: 90)')
        parser.add_argument('--capacity', type=int, default=20, help='Default max capacity per day (default: 20)')

    def handle(self, *args, **options):
        days = options['days']
        capacity = options['capacity']
        tours = Tour.objects.all()

        if not tours.exists():
            self.stdout.write(self.style.WARNING('No tours found. Run seed_tours first.'))
            return

        today = date.today()
        created = 0

        for tour in tours:
            for i in range(days):
                target_date = today + timedelta(days=i)
                _, was_created = TourAvailability.objects.get_or_create(
                    tour=tour,
                    date=target_date,
                    defaults={
                        'max_capacity': capacity + random.randint(-5, 10),
                        'booked_count': random.randint(0, 5) if i < 30 else 0,
                    }
                )
                if was_created:
                    created += 1

        self.stdout.write(self.style.SUCCESS(
            f'🎉 {created} availability slots created for {tours.count()} tours over {days} days.'
        ))
