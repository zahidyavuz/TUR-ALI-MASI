import os
import django
import requests
from django.core.files.base import ContentFile

import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from tours.models import Tour

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

urls = {
    'kapadokya-at': 'https://loremflickr.com/1200/800/horse',
    'kapadokya-atv': 'https://loremflickr.com/1200/800/quad'
}

for tour_id, url in urls.items():
    try:
        tour = Tour.objects.get(id=tour_id)
        if tour.image_main:
            continue
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            tour.image_main.save(f"{tour_id}.jpg", ContentFile(response.content), save=True)
            print(f"Saved {tour_id}")
        else:
            print(f"Failed {tour_id} with {response.status_code}")
    except Exception as e:
        print(f"Error {tour_id}: {e}")
