import os
import django
import requests
from django.core.files.base import ContentFile
import json

from tours.models import Tour, Category

def run():
    print("Deleting all tours...")
    Tour.objects.all().delete()

    print("Creating new tours...")
    cat_obj, _ = Category.objects.get_or_create(
        slug='kapadokya',
        defaults={'name': 'Kapadokya', 'description': 'Kapadokya Turları'}
    )

    TOURS = [
        {
            'id': 'kapadokya-balon',
            'title': 'Kapadokya Balon Turu',
            'location': 'Nevşehir, Türkiye',
            'rating': 4.9,
            'reviews_count': 1250,
            'original_price': 4500,
            'price': 3500,
            'discount': '%22',
            'duration': '3 Saat',
            'image_url': 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Hot_air_balloon_at_sunrise_over_Cappadocia%2C_Turkey.JPG',
            'category': 'Eğlence',
            'description': 'Gün doğumunda Kapadokya\'nın eşsiz manzarasına gökyüzünden şahit olun.',
            'fomo_count': 84
        },
        {
            'id': 'kapadokya-at',
            'title': 'Kapadokya Vadilerinde At Turu',
            'location': 'Nevşehir, Türkiye',
            'rating': 4.8,
            'reviews_count': 450,
            'original_price': 1500,
            'price': 1000,
            'discount': '%33',
            'duration': '2 Saat',
            'image_url': 'https://upload.wikimedia.org/wikipedia/commons/9/97/Horse_riding_in_Cappadocia.jpg',
            'category': 'Doğa',
            'description': 'Tarihi Kapadokya vadilerinde at üstünde masalsı bir gezintiye çıkın.',
            'fomo_count': 32
        },
        {
            'id': 'kapadokya-atv',
            'title': 'Kapadokya Adrenalin Dolu ATV Turu',
            'location': 'Nevşehir, Türkiye',
            'rating': 4.7,
            'reviews_count': 890,
            'original_price': 1200,
            'price': 800,
            'discount': '%33',
            'duration': '2 Saat',
            'image_url': 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Atv_tour_in_Cappadocia.jpg',
            'category': 'Macera',
            'description': 'Peri bacalarının etrafında, Kapadokya vadilerinde tozlu ve heyecanlı bir ATV deneyimi yaşayın.',
            'fomo_count': 56
        }
    ]

    for data in TOURS:
        tour = Tour.objects.create(
            id=data['id'],
            title=data['title'],
            location=data['location'],
            price=data['price'],
            original_price=data['original_price'],
            discount=data['discount'],
            duration=data['duration'],
            description=data['description'],
            category=data['category'],
            category_obj=cat_obj,
            rating=data['rating'],
            reviews_count=data['reviews_count'],
            fomo_count=data['fomo_count']
        )
        try:
            response = requests.get(data['image_url'], headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            if response.status_code == 200:
                tour.image_main.save(f"{data['id']}.jpg", ContentFile(response.content), save=True)
            else:
                print(f"Error {response.status_code} for {data['id']}")
        except Exception as e:
            print(f"Error downloading image for {data['id']}: {e}")

    print("Tours updated!")
