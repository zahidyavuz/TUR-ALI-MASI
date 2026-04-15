import os
import django
import requests
from django.core.files.base import ContentFile

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from tours.models import Tour

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

urls = {
    'kapadokya-balon': 'https://images.unsplash.com/photo-1542382109-f64f89d31a54?w=1200&q=80',
    'kapadokya-at': 'https://images.unsplash.com/photo-1598444976781-bb035171eec8?w=1200&q=80',
    'kapadokya-atv': 'https://images.unsplash.com/photo-1549448083-4f9e1beaefe5?w=1200&q=80'
}

for tour_id, url in urls.items():
    try:
        tour = Tour.objects.get(id=tour_id)
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            tour.image_main.save(f"{tour_id}.jpg", ContentFile(response.content), save=True)
            print(f"Saved {tour_id}")
        else:
            print(f"Failed {tour_id} with {response.status_code}")
    except Exception as e:
        print(f"Error {tour_id}: {e}")
