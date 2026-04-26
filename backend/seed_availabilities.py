import os
import django
import random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
try:
    django.setup()
except Exception as e:
    # If core.settings doesn't exist, try backend.settings
    os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
    django.setup()

from tours.models import Tour, TourAvailability

def seed_availabilities():
    tours = Tour.objects.all()
    today = date.today()
    
    print(f"Seeding availabilities for {tours.count()} tours...")
    count = 0
    
    for tour in tours:
        # Generate for next 30 days
        for i in range(30):
            current_date = today + timedelta(days=i)
            # 80% chance to have availability
            if random.random() < 0.8:
                max_cap = random.randint(10, 30)
                booked = random.randint(0, max_cap)
                TourAvailability.objects.update_or_create(
                    tour=tour,
                    date=current_date,
                    defaults={
                        'max_capacity': max_cap,
                        'booked_count': booked
                    }
                )
                count += 1
    print(f"Successfully seeded {count} availabilities!")

if __name__ == '__main__':
    seed_availabilities()
