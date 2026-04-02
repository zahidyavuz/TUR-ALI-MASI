from django.core.management.base import BaseCommand
from tours.models import Tour, Category, TourItinerary
from agencies.models import Agency
from django.contrib.auth.models import User

DEMO_TOURS = [
    {
        'id': 'kapadokya-klasik-balon',
        'title': 'Kapadokya Klasik: Standart Balon Turu',
        'location': 'Kapadokya, Türkiye',
        'price': 3500,
        'original_price': 4500,
        'discount': '22',
        'duration': '1 Saat Uçuş (Toplam 3 Saat Organizasyon)',
        'guide': 'Profesyonel Pilot',
        'description': 'Kısa Özet: Gün doğumunda Kapadokya\'nın büyülü vadileri üzerinde süzülün. Masalsı bir sabahın kapılarını aralayın.\n\nİçerik: Sabah otelden transfer, uçuş öncesi hafif atıştırmalık, profesyonel pilotlar eşliğinde 1 saatlik uçuş, iniş sonrası şampanyalı kutlama ve isme özel uçuş sertifikası.',
        'category': 'vip',  # Actually, "✨ En Popüler Deneyim" but using a standard slug
        'image_main': 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=800',
        'included': ['Otel Transferi', 'Hafif Atıştırmalık', '1 Saat Uçuş', 'Şampanyalı Kutlama', 'Uçuş Sertifikası'],
        'excluded': ['Kişisel Harcamalar', 'Fotoğraf ve Video'],
    },
    {
        'id': 'kirmizi-tur-kuzey',
        'title': 'Vadilerin Gizemi: Kırmızı Tur (Kuzey Kapadokya)',
        'location': 'Göreme, Kapadokya',
        'price': 1500,
        'original_price': 1800,
        'discount': '16',
        'duration': '1 Gün',
        'guide': 'Profesyonel Rehber',
        'description': 'Kısa Özet: Kapadokya\'nın ikonik peri bacalarını, tarihi kiliselerini ve el sanatlarını keşfedin. Tarihe tanıklık edin.\n\nDuraklar: Uçhisar Kalesi Panoramas, Göreme Açık Hava Müzesi, Çavuşin Köyü, Avanos Çanak Çömlek Atölyesi, Paşabağ, Devrent (Hayal) Vadisi.',
        'category': 'culture',
        'image_main': 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800',
        'included': ['Profesyonel Rehber', 'Öğle Yemeği', 'Müze Giriş Biletleri', 'Transfer'],
        'excluded': ['Ekstra İçecekler', 'Kişisel Harcamalar'],
    },
    {
        'id': 'yesil-tur-guney',
        'title': 'Yeraltındaki Dünya: Yeşil Tur (Güney Kapadokya)',
        'location': 'Ihlara, Kapadokya',
        'price': 1650,
        'original_price': 2000,
        'discount': '17',
        'duration': '1 Gün',
        'guide': 'Profesyonel Rehber',
        'description': 'Kısa Özet: Derin yeraltı şehirlerinden, Ihlara Vadisi\'nin yeşiline uzanan, doğa ve tarihin iç içe geçtiği bir macera.\n\nDuraklar: Göreme Panoramas, Derinkuyu (veya Kaymaklı) Yeraltı Şehri, Ihlara Vadisi (4km yürüyüş), Selime Manastırı, Güvercinlik Vadisi.',
        'category': 'adventure',
        'image_main': 'https://images.unsplash.com/photo-1596700859582-77eb57ea6837?w=800',
        'included': ['Profesyonel Rehber', 'Öğle Yemeği (Vadi kenarında)', 'Müze Giriş Biletleri', 'Transfer'],
        'excluded': ['İçecekler'],
    },
    {
        'id': 'gun-batimi-atv',
        'title': 'Tozlu Yollar: Gün Batımı ATV Safarisi',
        'location': 'Kızılçukur Vadisi, Kapadokya',
        'price': 800,
        'original_price': 1000,
        'discount': '20',
        'duration': '2 Saat',
        'guide': 'Tur Lideri',
        'description': 'Kısa Özet: Adrenalin tutkunları buraya! Vadilerin tozunu attırın ve en güzel gün batımını ATV üzerinde karşılayın.\n\nRota: Kılıçlar Vadisi, Güllüdere Vadisi, Kızılçukur Vadisi (Gün Batımı Molası).\nİçerik: Rehberli konvoy, kask, bone, toz maskesi ekipmanları.',
        'category': 'adventure',
        'image_main': 'https://images.unsplash.com/photo-1549448083-4f9e1beaefe5?w=800',
        'included': ['Rehberli Konvoy', 'Kask', 'Bone', 'Toz Maskesi'],
        'excluded': ['Otel Transferi'],
    },
    {
        'id': 'at-turu-safarisi',
        'title': 'Güzel Atlar Ülkesinde Safari (At Turu)',
        'location': 'Gül Vadisi, Kapadokya',
        'price': 900,
        'original_price': 1100,
        'discount': '18',
        'duration': '1 veya 2 Saat Seçenekleri',
        'guide': 'Tecrübeli Binicilik Rehberi',
        'description': 'Kısa Özet: Kapadokya\'nın ruhuna dokunun. Araçların giremediği patikalarda, asil atlarla huzurlu bir gezinti.\n\nRota: Gül Vadisi, Aşk Vadisi veya Kılıçlar Vadisi patikaları.\nİçerik: Tecrübeli binicilik rehberi, kask, kısa eğitim (Binicilik tecrübesi gerekmez).',
        'category': 'romantic',
        'image_main': 'https://images.unsplash.com/photo-1598444976781-bb035171eec8?w=800',
        'included': ['Tecrübeli Rehber', 'Kask', 'Kısa Eğitim'],
        'excluded': ['Otel Transferi', 'Bahşişler'],
    },
    {
        'id': 'mistik-turk-gecesi',
        'title': 'Mistik Gece: Türk Gecesi ve Semah Gösterisi',
        'location': 'Mağara Restoran, Kapadokya',
        'price': 1200,
        'original_price': 1500,
        'discount': '20',
        'duration': 'Akşam (Yaklaşık 3 Saat)',
        'guide': '-',
        'description': 'Kısa Özet: Mağara restoranda akşam yemeği eşliğinde, Türk kültürünün renkli danslarını ve büyüleyici Semah gösterisini izleyin.\n\nİçerik: Kaya oyma mekanda akşam yemeği (soğuk mezeler, ara sıcak, ana yemek), limitsiz yerli alkollü/alkolsüz içecek, Halk Oyunları, Oryantal Show, Semah Gösterisi, Otel Transferi.',
        'category': 'culture',
        'image_main': 'https://images.unsplash.com/photo-1549448083-4f9e1beaefe5?w=800',
        'included': ['Akşam Yemeği', 'Limitsiz İçecek', 'Şov Programı', 'Otel Transferi'],
        'excluded': ['Ekstra Bahşiş'],
    },
    {
        'id': 'gurme-sarap-tadimi',
        'title': 'Gurme Rotaları: Kapadokya Şarap Tadım Turu',
        'location': 'Ürgüp Mahzenleri, Kapadokya',
        'price': 1800,
        'original_price': 2000,
        'discount': '10',
        'duration': '2-3 Saat',
        'guide': 'Uzman Sommelier',
        'description': 'Kısa Özet: Bölgenin binlerce yıllık şarap kültürünü, tarihi mahzenlerde en özel yerel şarapları tadarak keşfedin.\n\nİçerik: Bölgenin köklü şarap üreticilerinin mahzenlerini ziyaret (Turasan veya Kocabağ), uzman eşliğinde şarap yapım süreci anlatımı, peynir ve atıştırmalık tabağı eşliğinde 4-5 çeşit yerel şarap tadımı.',
        'category': 'gastronomy',
        'image_main': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800',
        'included': ['Mahzen Ziyareti', '4-5 Çeşit Şarap', 'Peynir ve Atıştırmalık', 'Üretim Sunumu'],
        'excluded': ['Şişe Satın Alımları'],
    },
    {
        'id': 'sakli-koyler-soganli',
        'title': 'Saklı Köyler: Soğanlı Vadisi ve Arka Sokaklar',
        'location': 'Soğanlı Vadisi, Kayseri/Nevşehir',
        'price': 1300,
        'original_price': 1500,
        'discount': '13',
        'duration': '1 Gün',
        'guide': 'Profesyonel Rehber',
        'description': 'Kısa Özet: Kalabalıktan uzaklaşın. Unutulmuş köyleri, eski Rum evlerini ve Kapadokya\'nın otantik yüzünü keşfedin.\n\nDuraklar: Soğanlı Vadisi (Kaya Kiliseleri ve Bez Bebek Atölyeleri), Mustafapaşa Köyü (Eski Sinasos), Keşlik Manastırı, Taşkınpaşa Medresesi.\nİçerik: Profesyonel Rehber, Öğle Yemeği, Müze Girişleri, Transfer.',
        'category': 'culture',
        'image_main': 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800',
        'included': ['Profesyonel Rehber', 'Öğle Yemeği', 'Müze Girişleri', 'Transfer'],
        'excluded': ['Bez Bebek/Hediyelik Alımları'],
    },
    {
        'id': 'luks-balon-kahvalti',
        'title': 'Gökyüzünde Kahvaltı: Lüks Balon Deneyimi',
        'location': 'Kapadokya (Özel Uçuş)',
        'price': 12000,
        'original_price': 13500,
        'discount': '11',
        'duration': '1.5 Saat Uçuş (Özel Organizasyon)',
        'guide': 'Kıdemli Pilot',
        'description': 'Kısa Özet: Hayallerinizin ötesinde bir deneyim. Kişiye özel lüks sepette, bulutların üzerinde şampanyalı kahvaltı keyfi.\n\nİçerik: Özel VIP transfer, kişiye özel (veya çok küçük grup) lüks uçuş sepeti, uçuş esnasında sıcak/soğuk gurme kahvaltı servisi, özel şampanyalı kutlama, isme özel premium sertifika ve uçuş hediyesi.',
        'category': 'vip',
        'image_main': 'https://images.unsplash.com/photo-1502485019198-a625bd53ceb7?w=800',
        'included': ['VIP Transfer', 'Lüks Uçuş Sepeti', 'Kahvaltı Servisi', 'Şampanya Şöleni', 'Premium Sertifika'],
        'excluded': ['Drone Çekimi'],
    },
    {
        'id': 'zen-kapadokya-yoga',
        'title': 'Zen Kapadokya: Vadide Yoga ve Meditasyon',
        'location': 'Aşk Vadisi, Kapadokya',
        'price': 600,
        'original_price': 750,
        'discount': '20',
        'duration': 'Sabah (Yaklaşık 2.5 Saat)',
        'guide': 'Profesyonel Eğitmen',
        'description': 'Kısa Özet: Peri bacalarının mistik enerjisiyle ruhunuzu dinlendirin. Gün doğumunda vadide yoga ve meditasyon seansı.\n\nİçerik: Otel transferi, Love Valley (Aşk Vadisi) veya Güllüdere Vadisi\'nde sakin bir noktada profesyonel eğitmen eşliğinde 1 saatlik Yoga seansı, Kristal Kaselerle Ses Terapisi ve Meditasyon, seans sonrası organik kahvaltı tabağı ve bitki çayı ikramı.',
        'category': 'wellness',
        'image_main': 'https://images.unsplash.com/photo-1549448083-4f9e1beaefe5?w=800',
        'included': ['Transfer', '1 Saat Yoga', 'Ses Terapisi', 'Organik Kahvaltı Tabağı'],
        'excluded': ['Ekipman (Mat getirilmelidir)'],
    }
]

class Command(BaseCommand):
    help = 'Seed the database with updated showcase demo tour data'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing tours before seeding')

    def handle(self, *args, **options):
        # We always delete to ensure a clean new showcase deployment
        Tour.objects.all().delete()
        self.stdout.write(self.style.WARNING('Old agency tours removed.'))

        # Get or create a default agency
        admin_user = User.objects.filter(is_superuser=True).first()
        agency = None
        if admin_user:
            agency, _ = Agency.objects.get_or_create(
                owner=admin_user,
                defaults={'name': 'Demo Acenta (Vitrin)', 'is_verified': True, 'trust_score': 4.8}
            )

        # Create base categories
        cats_map = {
            'adventure': Category.objects.get_or_create(name='Macera & Eğlence', defaults={'slug': 'adventure'})[0],
            'romantic': Category.objects.get_or_create(name='Romantik Doğal', defaults={'slug': 'romantic'})[0],
            'culture': Category.objects.get_or_create(name='Kültür & Tarih', defaults={'slug': 'culture'})[0],
            'wellness': Category.objects.get_or_create(name='Wellness', defaults={'slug': 'wellness'})[0],
            'gastronomy': Category.objects.get_or_create(name='Gastronomi', defaults={'slug': 'gastronomy'})[0],
            'vip': Category.objects.get_or_create(name='Özel VIP', defaults={'slug': 'vip'})[0],
        }

        created = 0
        for td in DEMO_TOURS:
            cat_key = td.pop('category', 'adventure')
            itinerary_data = td.pop('itinerary', []) # In case we add itinerary keys later

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

        self.stdout.write(self.style.SUCCESS(f'\n🎉 Showcase Seeding complete! {created} new tours loaded.'))
