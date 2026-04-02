import os
import django
import requests
import uuid
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from tours.models import Tour, Category, TourAvailability

TOUR_DATA = [
    {
        'id': 'standart-balon',
        'title': 'Standart Balon',
        'location': 'Kapadokya, Türkiye',
        'price': 150,
        'original_price': 180,
        'discount': '%16',
        'duration': '1 Saat Uçuş',
        'guide': 'Profesyonel Pilot (Türkçe/İngilizce)',
        'description': 'Gün doğumunda Kapadokya\'nın büyülü vadileri üzerinde süzülün. Masalsı bir sabahın kapılarını aralayın. Kapasite 20 kişidir.',
        'category': 'Balon Turları',
        'image_url': 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=1920',
        'included': ['Otel Transferi (Ücretsiz)', 'Profesyonel Rehberlik / Pilot Hizmeti', 'Hafif Atıştırmalık', 'Şampanyalı Kutlama', 'Sertifika'],
        'excluded': ['Kişisel Harcamalar', 'Fotoğraf ve Video'],
        'rating': 4.9,
        'reviews_count': 1250,
        'fomo_count': 34
    },
    {
        'id': 'kirmizi-tur',
        'title': 'Kırmızı Tur',
        'location': 'Göreme, Kapadokya',
        'price': 40,
        'original_price': 50,
        'discount': '%20',
        'duration': '1 Gün',
        'guide': 'Profesyonel Rehber (Türkçe/İngilizce)',
        'description': 'Kapadokya\'nın ikonik peri bacalarını, tarihi kiliselerini ve el sanatlarını keşfedin. Tarihe tanıklık edin.',
        'category': 'Kültür & Tarih',
        'image_url': 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=1920',
        'included': ['Otel Transferi (Ücretsiz)', 'Profesyonel Rehberlik / Pilot Hizmeti', 'Öğle Yemeği', 'Müze Giriş Biletleri'],
        'excluded': ['Ekstra İçecekler', 'Kişisel Harcamalar'],
        'rating': 4.8,
        'reviews_count': 856,
        'fomo_count': 18
    },
    {
        'id': 'yesil-tur',
        'title': 'Yeşil Tur',
        'location': 'Ihlara, Kapadokya',
        'price': 45,
        'original_price': 55,
        'discount': '%18',
        'duration': '1 Gün',
        'guide': 'Profesyonel Rehber (Türkçe/İngilizce)',
        'description': 'Derin yeraltı şehirlerinden, Ihlara Vadisi\'nin yeşiline uzanan, doğa ve tarihin iç içe geçtiği bir macera.',
        'category': 'Doğa & Macera',
        'image_url': 'https://images.unsplash.com/photo-1596700859582-77eb57ea6837?w=1920',
        'included': ['Otel Transferi (Ücretsiz)', 'Profesyonel Rehberlik / Pilot Hizmeti', 'Vadi Kenarı Öğle Yemeği', 'Müze Biletleri'],
        'excluded': ['İçecekler'],
        'rating': 4.9,
        'reviews_count': 730,
        'fomo_count': 22
    },
    {
        'id': 'atv-safari',
        'title': 'ATV Safari',
        'location': 'Kızılçukur Vadisi, Kapadokya',
        'price': 30,
        'original_price': 40,
        'discount': '%25',
        'duration': '2 Saat',
        'guide': 'Profesyonel Rehberlik / Pilot Hizmeti',
        'description': 'Adrenalin tutkunları buraya! Vadilerin tozunu attırın ve en güzel gün batımını ATV üzerinde karşılayın.',
        'category': 'Adrenalin & Eğlence',
        'image_url': 'https://images.unsplash.com/photo-1549448083-4f9e1beaefe5?w=1920',
        'included': ['Otel Transferi (Ücretsiz)', 'Profesyonel Rehberlik / Pilot Hizmeti', 'Kask', 'Bone', 'Toz Maskesi'],
        'excluded': ['Kişisel Harcamalar'],
        'rating': 4.7,
        'reviews_count': 900,
        'fomo_count': 45
    },
    {
        'id': 'at-turu',
        'title': 'At Turu',
        'location': 'Gül Vadisi, Kapadokya',
        'price': 35,
        'original_price': 45,
        'discount': '%22',
        'duration': '1.5 Saat',
        'guide': 'Profesyonel Rehberlik / Pilot Hizmeti',
        'description': 'Kapadokya\'nın ruhuna dokunun. Araçların giremediği patikalarda, asil atlarla huzurlu bir gezinti.',
        'category': 'Romantik & Doğal',
        'image_url': 'https://images.unsplash.com/photo-1598444976781-bb035171eec8?w=1920',
        'included': ['Otel Transferi (Ücretsiz)', 'Profesyonel Rehberlik / Pilot Hizmeti', 'Kask', 'Kısa Eğitim'],
        'excluded': ['Bahşişler'],
        'rating': 4.8,
        'reviews_count': 450,
        'fomo_count': 14
    },
    {
        'id': 'turk-gecesi',
        'title': 'Türk Gecesi',
        'location': 'Mağara Restoran, Kapadokya',
        'price': 40,
        'original_price': 50,
        'discount': '%20',
        'duration': '3 Saat',
        'guide': 'Profesyonel Rehberlik / Pilot Hizmeti',
        'description': 'Mağara restoranda akşam yemeği eşliğinde, Türk kültürünün renkli danslarını ve büyüleyici Semah gösterisini izleyin.',
        'category': 'Eğlence & Kültür',
        'image_url': 'https://images.unsplash.com/photo-1549448083-4f9e1beaefe5?w=1920',
        'included': ['Otel Transferi (Ücretsiz)', 'Profesyonel Rehberlik / Pilot Hizmeti', 'Akşam Yemeği', 'Limitsiz İçecek', 'Şov Programı'],
        'excluded': ['Ekstra Bahşiş'],
        'rating': 4.6,
        'reviews_count': 650,
        'fomo_count': 28
    },
    {
        'id': 'sarap-tadimi',
        'title': 'Şarap Tadımı',
        'location': 'Ürgüp Mahzenleri, Kapadokya',
        'price': 60,
        'original_price': 70,
        'discount': '%14',
        'duration': '2-3 Saat',
        'guide': 'Uzman Sommelier',
        'description': 'Bölgenin binlerce yıllık şarap kültürünü, tarihi mahzenlerde en özel yerel şarapları tadarak keşfedin.',
        'category': 'Gastronomi',
        'image_url': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1920',
        'included': ['Otel Transferi (Ücretsiz)', 'Profesyonel Rehberlik / Pilot Hizmeti', 'Mahzen Ziyareti', '4-5 Çeşit Şarap', 'Peynir ve Atıştırmalık'],
        'excluded': ['Şişe Satın Alımları'],
        'rating': 4.9,
        'reviews_count': 320,
        'fomo_count': 11
    },
    {
        'id': 'soganli-vadisi',
        'title': 'Soğanlı Vadisi',
        'location': 'Soğanlı Vadisi, Kayseri/Nevşehir',
        'price': 45,
        'original_price': 55,
        'discount': '%18',
        'duration': '1 Gün',
        'guide': 'Profesyonel Rehber (Türkçe/İngilizce)',
        'description': 'Kalabalıktan uzaklaşın. Unutulmuş köyleri, eski Rum evlerini ve Kapadokya\'nın otantik yüzünü keşfedin.',
        'category': 'Butik & Keşif',
        'image_url': 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1920',
        'included': ['Otel Transferi (Ücretsiz)', 'Profesyonel Rehberlik / Pilot Hizmeti', 'Öğle Yemeği', 'Müze Girişleri'],
        'excluded': ['Bez Bebek/Hediyelik Alımları'],
        'rating': 5.0,
        'reviews_count': 150,
        'fomo_count': 8
    },
    {
        'id': 'vip-balon-kahvalti',
        'title': 'VIP Balon Kahvaltı',
        'location': 'Kapadokya (Özel Uçuş)',
        'price': 400,
        'original_price': 450,
        'discount': '%11',
        'duration': '1.5 Saat Uçuş',
        'guide': 'Kıdemli Pilot',
        'description': 'Hayallerinizin ötesinde bir deneyim. Kişiye özel lüks sepette, bulutların üzerinde şampanyalı kahvaltı keyfi.',
        'category': 'VIP & Exclusive',
        'image_url': 'https://images.unsplash.com/photo-1502485019198-a625bd53ceb7?w=1920',
        'included': ['VIP Otel Transferi (Ücretsiz)', 'Profesyonel Rehberlik / Pilot Hizmeti', 'Lüks Uçuş Sepeti', 'Kahvaltı', 'Şampanya'],
        'excluded': ['Drone Çekimi'],
        'rating': 5.0,
        'reviews_count': 85,
        'fomo_count': 5
    },
    {
        'id': 'vadide-yoga',
        'title': 'Vadide Yoga',
        'location': 'Aşk Vadisi, Kapadokya',
        'price': 25,
        'original_price': 30,
        'discount': '%16',
        'duration': '2.5 Saat',
        'guide': 'Yoga Eğitmeni',
        'description': 'Peri bacalarının mistik enerjisiyle ruhunuzu dinlendirin. Gün doğumunda vadide yoga ve meditasyon seansı.',
        'category': 'Wellness & Ruhsal Arınma',
        'image_url': 'https://images.unsplash.com/photo-1549448083-4f9e1beaefe5?w=1920',
        'included': ['Otel Transferi (Ücretsiz)', 'Profesyonel Rehberlik / Pilot Hizmeti', '1 Saat Yoga', 'Ses Terapisi'],
        'excluded': ['Ekipman (Mat getirilmelidir)'],
        'rating': 4.9,
        'reviews_count': 410,
        'fomo_count': 16
    }
]

import datetime
from django.core.files.base import ContentFile

def run():
    print("Seeding Tours...")
    for data in TOUR_DATA:
        cat_obj, _ = Category.objects.get_or_create(
            slug=data['id'],
            defaults={'name': data['category'], 'description': data['category']}
        )
        
        tour, created = Tour.objects.update_or_create(
            id=data['id'],
            defaults={
                'title': data['title'],
                'location': data['location'],
                'price': data['price'],
                'original_price': data['original_price'],
                'discount': data['discount'],
                'duration': data['duration'],
                'guide': data['guide'],
                'description': data['description'],
                'category': data['category'],
                'category_obj': cat_obj,
                'rating': data['rating'],
                'reviews_count': data['reviews_count'],
                'fomo_count': data['fomo_count'],
                'included': data['included'],
                'excluded': data['excluded'],
            }
        )
        
        # Download image
        if created or not tour.image_main:
            try:
                response = requests.get(data['image_url'])
                if response.status_code == 200:
                    tour.image_main.save(f"{data['id']}.jpg", ContentFile(response.content), save=True)
            except Exception as e:
                print(f"Error downloading image for {data['id']}: {e}")
                
        # Create availability
        max_cap = 20 if "balon" in data['id'].lower() else 15
        
        for i in range(1, 15):
            date = datetime.date.today() + datetime.timedelta(days=i)
            TourAvailability.objects.update_or_create(
                tour=tour,
                date=date,
                defaults={
                    'max_capacity': max_cap,
                    'booked_count': 0
                }
            )

if __name__ == '__main__':
    run()
    print("Done seeding tours!")
