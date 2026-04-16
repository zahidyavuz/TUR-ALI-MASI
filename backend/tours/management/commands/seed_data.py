from django.core.management.base import BaseCommand
from tours.models import Tour, TourItinerary
from agencies.models import Agency
from blogs.models import Blog
from decimal import Decimal

class Command(BaseCommand):
    help = 'Seeds the database with initial Tour and Blog data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database...')
        
        # Create a default agency
        agency, created = Agency.objects.get_or_create(
            name='Kapadokya Tours Agency',
            trust_score=4.9,
            description='Yerel uzmanlardan oluşan deneyimli rehber ekibi.'
        )

        TOUR_DATA = [
            {
                'id': 'kapadokya',
                'title': 'Kapadokya Balon & Peri Bacaları',
                'location': 'Nevşehir, Türkiye',
                'rating': Decimal('4.9'),
                'reviews_count': 520,
                'original_price': Decimal('3200.00'),
                'price': Decimal('2400.00'),
                'discount': '%25',
                'fomo_count': 14,
                'duration': '3 Gün, 2 Gece',
                'guide': 'Türkçe, İngilizce',
                'accommodation': '5 Yıldızlı Mağara Otel',
                'transportation': 'VIP Transfer Dahil',
                'image_main': 'https://images.unsplash.com/photo-1596395819057-afbf19aff3fb?fit=crop&w=1200&q=80',
                'image_sub1': 'https://images.unsplash.com/photo-1643194553229-231a4c8a2dd9?fit=crop&w=600&q=80',
                'image_sub2': 'https://images.unsplash.com/photo-1534008897995-27a23e859048?fit=crop&w=600&q=80',
                'description': "Kapadokya'nın büyüleyici atmosferinde, sabahın ilk ışıklarıyla havalanan yüzlerce renkli sıcak hava balonunu izlerken, mistik peri bacalarının arasında kaybolacaksınız.",
                'included': ['Özel Mağara Otelinde 2 Gece Konaklama', 'Profesyonel Tur Rehberi', 'Sabah Kahvaltıları'],
                'excluded': ['Öğle Yemekleri', 'Kişisel Harcamalar', 'Balon Uçuşu'],
                'category': 'culture, romantic, history',
            },
            {
                'id': 'buyuk-italya',
                'title': 'Büyük İtalya Turu',
                'location': 'Roma, İtalya',
                'rating': Decimal('4.8'),
                'reviews_count': 815,
                'original_price': Decimal('25000.00'),
                'price': Decimal('18150.00'),
                'discount': '%27',
                'fomo_count': 32,
                'duration': '7 Gün, 6 Gece',
                'guide': 'Türkçe, İtalyanca',
                'accommodation': '4 ve 5 Yıldızlı Oteller',
                'transportation': 'Lüks Tur Otobüsü',
                'image_main': 'https://images.unsplash.com/photo-1541432901042-2b8cbc77d2a8?fit=crop&w=1200&q=80',
                'image_sub1': 'https://images.unsplash.com/photo-1516483638261-f40af5bea098?fit=crop&w=600&q=80',
                'image_sub2': 'https://images.unsplash.com/photo-1502602898657-3e90760081d5?fit=crop&w=600&q=80',
                'description': "Roma'nın tarihi sokaklarından Venedik'in romantik kanallarına, Floransa'nın sanat dolu meydanlarından Milano'ya kadar unutulmaz bir İtalya rüyası sizi bekliyor.",
                'included': ['Tüm Konaklamalar', 'Ulaşım', 'Rehberlik'],
                'excluded': ['Öğle Yemekleri', 'Vize Ücretleri'],
                'category': 'culture, history, city',
                'filmed_in': 'Portobello (HBO) & Sandokan (Netflix)',
            }
        ]

        for data in TOUR_DATA:
            tour, created = Tour.objects.update_or_create(
                id=data['id'],
                defaults={**data, 'agency': agency}
            )
            # Add default itinerary
            if created:
                TourItinerary.objects.create(
                    tour=tour, day=1, title='Karşılama ve İlk Gün Macerası',
                    description='Havalimanından konforlu araçlarımızla alınıp lokasyona erişim.'
                )
                TourItinerary.objects.create(
                    tour=tour, day=2, title='Detaylı Çevre Gezisi',
                    description='Yerel lezzetleri tatma, kültürel mekanlara ziyaretler.'
                )

        BLOG_DATA = [
            {
                'slug': 'kapadokyada-gezilecek-10-buyuleyici-yer',
                'title': "Kapadokya'da Mutlaka Görmeniz Gereken 10 Büyüleyici Yer",
                'excerpt': "Peri bacaları, yeraltı şehirleri ve muhteşem gün doğumlarıyla Kapadokya'nın en saklı güzelliklerini keşfedin.",
                'content': "Kapadokya, volkanik patlamaların ve rüzgarların binlerce yılda yonttuğu doğal şaheserleriyle kelimenin tam anlamıyla dünya dışı bir manzaraya sahiptir.",
                'cover_image': 'https://images.unsplash.com/photo-1596395819057-afbf19aff3fb',
                'reading_time': '4 dk',
                'author_name': 'Tourkia Ekibi',
                'author_role': 'Kurumsal Editör',
                'author_avatar': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
                'category': 'Rehberler',
                'related_tour_slug': 'kapadokya'
            }
        ]
        for b_data in BLOG_DATA:
            Blog.objects.update_or_create(slug=b_data['slug'], defaults=b_data)

        self.stdout.write(self.style.SUCCESS('Database successfully seeded!'))
