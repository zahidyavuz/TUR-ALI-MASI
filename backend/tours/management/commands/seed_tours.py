from django.core.management.base import BaseCommand
from tours.models import Tour, Category, TourItinerary
from agencies.models import Agency
from django.contrib.auth.models import User


DEMO_TOURS = [
    {
        'id': 'kapadokya',
        'title': 'Kapadokya Balon Turu',
        'location': 'Nevşehir, Türkiye',
        'price': 2400,
        'original_price': 3200,
        'discount': '%25',
        'duration': '3 Gün, 2 Gece',
        'guide': 'Türkçe, İngilizce',
        'accommodation': '5 Yıldızlı Cave Otel',
        'transportation': 'VIP Transfer',
        'description': 'Kapadokya\'nın büyüleyici peri bacalarını balon üzerinden keşfedin. Eşsiz manzaralar, yerel tatlar ve unutulmaz anılar sizi bekliyor.',
        'category': 'adventure',
        'image_main': 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=800',
        'included': ['Balon Turu', 'Konaklama', 'Kahvaltı', 'Transfer'],
        'excluded': ['Akşam Yemeği', 'Kişisel Harcamalar'],
        'itinerary': [
            {'day': 1, 'title': 'Varış ve Yerleşim', 'description': 'Havalimanından VIP transfer ile otele geçiş.'},
            {'day': 2, 'title': 'Balon Turu', 'description': 'Sabah erken saatte unutulmaz balon deneyimi.'},
            {'day': 3, 'title': 'Keşif ve Dönüş', 'description': 'Göreme Açık Hava Müzesi ziyareti ve dönüş.'},
        ]
    },
    {
        'id': 'maldivler-ruyasi',
        'title': 'Maldivler Rüyası',
        'location': 'Maldivler',
        'price': 18500,
        'original_price': 24000,
        'discount': '%23',
        'duration': '7 Gün, 6 Gece',
        'guide': 'İngilizce',
        'accommodation': 'Su Üstü Villa',
        'transportation': 'Özel Tekne',
        'description': 'Turkuaz suların ortasında lüks su üstü villalarda tatil yapın. Dalış, spa ve romantik akşam yemekleri.',
        'category': 'romantic',
        'image_main': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800',
        'included': ['Konaklama', 'Kahvaltı + Akşam Yemeği', 'Dalış Ekipmanı', 'Tekne Turu'],
        'excluded': ['Uçak Bileti', 'Spa', 'Kişisel Harcamalar'],
        'itinerary': [
            {'day': 1, 'title': 'Varış', 'description': 'Malé havalimanından tekne ile resort\'a transfer.'},
            {'day': 2, 'title': 'Dalış Günü', 'description': 'Mercan resifleri ve tropik balıklarla dalış.'},
            {'day': 3, 'title': 'Ada Keşfi', 'description': 'Yerel adaları ziyaret ve snorkeling.'},
        ]
    },
    {
        'id': 'buyuk-italya',
        'title': 'Büyük İtalya Turu',
        'location': 'Roma - Floransa - Venedik',
        'price': 14200,
        'original_price': 18000,
        'discount': '%21',
        'duration': '10 Gün, 9 Gece',
        'guide': 'Türkçe, İngilizce, İtalyanca',
        'accommodation': '4 Yıldızlı Otel',
        'transportation': 'Hızlı Tren + Transfer',
        'description': 'Roma\'nın tarihi, Floransa\'nın sanatı ve Venedik\'in romantizmi bir arada. Eşsiz bir kültür yolculuğu.',
        'category': 'culture',
        'image_main': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800',
        'included': ['Konaklama', 'Kahvaltı', 'Müze Biletleri', 'Tren Biletleri'],
        'excluded': ['Akşam Yemeği', 'Uçak Bileti'],
        'itinerary': [
            {'day': 1, 'title': 'Roma Varış', 'description': 'Colosseum ve Roma Forum ziyareti.'},
            {'day': 4, 'title': 'Floransa', 'description': 'Uffizi Galerisi ve Ponte Vecchio keşfi.'},
            {'day': 7, 'title': 'Venedik', 'description': 'Gondol turu ve San Marco Meydanı.'},
        ]
    },
]


class Command(BaseCommand):
    help = 'Seed the database with demo tour data'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing tours before seeding')

    def handle(self, *args, **options):
        if options['clear']:
            Tour.objects.all().delete()
            self.stdout.write(self.style.WARNING('All existing tours deleted.'))

        # Get or create a default agency
        admin_user = User.objects.filter(is_superuser=True).first()
        agency = None
        if admin_user:
            agency, _ = Agency.objects.get_or_create(
                owner=admin_user,
                defaults={'name': 'Demo Acenta', 'is_verified': True, 'trust_score': 4.8}
            )

        # Create default category
        cat_adventure, _ = Category.objects.get_or_create(name='Macera', defaults={'slug': 'adventure'})
        cat_romantic, _ = Category.objects.get_or_create(name='Romantik', defaults={'slug': 'romantic'})
        cat_culture, _ = Category.objects.get_or_create(name='Kültür', defaults={'slug': 'culture'})

        cats_map = {
            'adventure': cat_adventure,
            'romantic': cat_romantic,
            'culture': cat_culture,
        }

        created = 0
        for td in DEMO_TOURS:
            if Tour.objects.filter(id=td['id']).exists():
                self.stdout.write(f"  Skipped: {td['title']} (already exists)")
                continue

            itinerary_data = td.pop('itinerary', [])
            cat_key = td.pop('category', 'adventure')

            tour = Tour.objects.create(
                **td,
                agency=agency,
                category=cat_key,
                category_obj=cats_map.get(cat_key),
                rating=5.0,
                reviews_count=0,
                fomo_count=0,
            )

            for item in itinerary_data:
                TourItinerary.objects.create(tour=tour, **item)

            created += 1
            self.stdout.write(self.style.SUCCESS(f"  ✅ Created: {tour.title}"))

        self.stdout.write(self.style.SUCCESS(f'\n🎉 Seeding complete! {created} tours created.'))
