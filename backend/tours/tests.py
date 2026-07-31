from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from tours.models import Tour, Category, TourAvailability
from agencies.models import Agency


class TourAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.agency = Agency.objects.create(owner=self.user, name='Test Agency', status='onaylandi', is_verified=True)
        self.category = Category.objects.create(name='Adventure', slug='adventure')

        self.tour = Tour.objects.create(
            id='test-tour',
            agency=self.agency,
            title='Test Tour',
            location='Istanbul',
            price=1500,
            duration='2 Days',
            guide='Turkish',
            description='A test tour.',
            category='adventure',
            category_obj=self.category,
            image_main='https://example.com/image.jpg',
        )

    def test_tour_list(self):
        """GET /api/v1/tours/ should return list of tours"""
        response = self.client.get('/api/v1/tours/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_tour_detail(self):
        """GET /api/v1/tours/test-tour/ should return tour details"""
        response = self.client.get('/api/v1/tours/test-tour/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['title'], 'Test Tour')

    def test_tour_search(self):
        """Search tours by title"""
        response = self.client.get('/api/v1/tours/?search=Istanbul')
        self.assertEqual(response.status_code, 200)

    def test_tour_filter_by_price(self):
        """Filter tours by min/max price"""
        response = self.client.get('/api/v1/tours/?min_price=1000&max_price=2000')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_public_catalog_is_read_only(self):
        """Genel katalog salt okunur: yazma yalnız /agency/tours/ üzerinden"""
        payload = {'title': 'Unauthorized Tour', 'location': 'Test', 'price': 100}

        self.assertEqual(self.client.post('/api/v1/tours/', payload).status_code, 405)

        # Giriş yapmış sıradan bir müşteri de tur oluşturamaz.
        customer = User.objects.create_user(username='rando', password='testpass123')
        self.client.force_authenticate(user=customer)
        self.assertEqual(self.client.post('/api/v1/tours/', payload).status_code, 405)
        self.assertEqual(
            self.client.patch('/api/v1/tours/test-tour/', {'price': 1}).status_code, 405
        )
        self.assertEqual(self.client.delete('/api/v1/tours/test-tour/').status_code, 405)

    def test_imageless_tour_hidden_from_catalog(self):
        """Görseli olmayan tur (taslak) genel katalogda listelenmez"""
        Tour.objects.create(
            id='draft-tour', agency=self.agency, title='Draft Tour', location='Izmir',
            price=100, duration='1 Day', guide='Turkish', description='d',
            category='adventure', image_main='',
        )
        response = self.client.get('/api/v1/tours/')
        ids = [t['id'] for t in response.data['results']]
        self.assertIn('test-tour', ids)
        self.assertNotIn('draft-tour', ids)

    def test_category_list(self):
        """GET /api/v1/categories/ should return categories"""
        response = self.client.get('/api/v1/categories/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)


class TourSearchFilterTestCase(TestCase):
    """F4-01 — Müsaitlik bazlı arama ve sunucu tarafı filtreler."""

    def setUp(self):
        self.client = APIClient()
        self.agency = Agency.objects.create(name='Search Agency', status='onaylandi', is_verified=True)
        self.cat_nature = Category.objects.create(name='Doğa', slug='doga')
        self.cat_culture = Category.objects.create(name='Kültür', slug='kultur')

        self.today = date.today()
        self.day = self.today + timedelta(days=7)

        # Ucuz, yüksek puanlı, saatlik doğa turu — seçili günde yeri var.
        self.cheap = Tour.objects.create(
            id='cheap-tour', agency=self.agency, title='Ucuz Balon', location='Kapadokya, Türkiye',
            price=800, rating=4.8, reviews_count=120, duration='4 Saat', guide='Türkçe',
            description='Sabah balon turu.', category='Doğa', category_obj=self.cat_nature,
            image_main='https://example.com/i.jpg',
        )
        TourAvailability.objects.create(tour=self.cheap, date=self.day, max_capacity=10, booked_count=2)

        # Pahalı, düşük puanlı, çok günlük kültür turu — seçili günde yeri var.
        self.pricey = Tour.objects.create(
            id='pricey-tour', agency=self.agency, title='Lüks Kültür', location='İstanbul, Türkiye',
            price=5000, rating=3.9, reviews_count=40, duration='3 Gün', guide='İngilizce',
            description='Kapsamlı kültür turu.', category='Kültür', category_obj=self.cat_culture,
            image_main='https://example.com/i.jpg',
        )
        TourAvailability.objects.create(tour=self.pricey, date=self.day, max_capacity=8, booked_count=1)

        # Seçili günde DOLU tur — müsaitlik filtresinde görünmemeli.
        self.full = Tour.objects.create(
            id='full-tour', agency=self.agency, title='Dolu Tur', location='Kapadokya, Türkiye',
            price=1200, rating=4.5, reviews_count=90, duration='6 Saat', guide='Türkçe',
            description='Doldu.', category='Doğa', category_obj=self.cat_nature,
            image_main='https://example.com/i.jpg',
        )
        TourAvailability.objects.create(tour=self.full, date=self.day, max_capacity=5, booked_count=5)

        # Seçili günde KAPALI tur — müsaitlik filtresinde görünmemeli.
        self.closed = Tour.objects.create(
            id='closed-tour', agency=self.agency, title='Kapalı Tur', location='Kapadokya, Türkiye',
            price=900, rating=4.6, reviews_count=70, duration='5 Saat', guide='Türkçe',
            description='Kapalı gün.', category='Doğa', category_obj=self.cat_nature,
            image_main='https://example.com/i.jpg',
        )
        TourAvailability.objects.create(tour=self.closed, date=self.day, max_capacity=10, booked_count=0, is_closed=True)

    def _ids(self, response):
        return [t['id'] for t in response.data['results']]

    def test_price_range_filter(self):
        response = self.client.get('/api/v1/tours/?min_price=1000&max_price=3000')
        self.assertEqual(response.status_code, 200)
        ids = self._ids(response)
        self.assertIn('full-tour', ids)
        self.assertNotIn('cheap-tour', ids)   # 800 < 1000
        self.assertNotIn('pricey-tour', ids)  # 5000 > 3000

    def test_min_rating_filter(self):
        ids = self._ids(self.client.get('/api/v1/tours/?min_rating=4.5'))
        self.assertIn('cheap-tour', ids)
        self.assertNotIn('pricey-tour', ids)  # 3.9 < 4.5

    def test_category_obj_multi_filter(self):
        ids = self._ids(self.client.get('/api/v1/tours/?category_obj=doga,kultur'))
        self.assertIn('cheap-tour', ids)
        self.assertIn('pricey-tour', ids)
        # Yalnız kültür seçilince doğa turları düşer.
        ids2 = self._ids(self.client.get('/api/v1/tours/?category_obj=kultur'))
        self.assertEqual(ids2, ['pricey-tour'])

    def test_location_icontains(self):
        # Exact match kırılırdı; 'istanbul' -> 'İstanbul, Türkiye' eşleşmeli değil
        # (Türkçe İ farkı), ama 'Kapadokya' kısmi eşleşmeli.
        ids = self._ids(self.client.get('/api/v1/tours/?location=Kapadokya'))
        self.assertIn('cheap-tour', ids)
        self.assertNotIn('pricey-tour', ids)

    def test_duration_icontains(self):
        ids = self._ids(self.client.get('/api/v1/tours/?duration=Saat'))
        self.assertIn('cheap-tour', ids)     # '4 Saat'
        self.assertNotIn('pricey-tour', ids)  # '3 Gün'

    def test_guide_multi_filter(self):
        """Rehber dili çoklu (OR): birleşik metinlerde de icontains eşleşir."""
        # cheap/full/closed 'Türkçe', pricey 'İngilizce'.
        ids = self._ids(self.client.get('/api/v1/tours/?guide=İngilizce'))
        self.assertEqual(ids, ['pricey-tour'])
        # Çoklu seçim OR'lanır: hem Türkçe hem İngilizce turlar döner.
        ids2 = self._ids(self.client.get('/api/v1/tours/?guide=Türkçe,İngilizce'))
        self.assertCountEqual(ids2, ['cheap-tour', 'pricey-tour', 'full-tour', 'closed-tour'])

    def test_availability_date_excludes_full_and_closed(self):
        """Seçili günde: dolu ve kapalı turlar düşer, yeri olanlar kalır."""
        ids = self._ids(self.client.get(f'/api/v1/tours/?date={self.day.isoformat()}'))
        self.assertCountEqual(ids, ['cheap-tour', 'pricey-tour'])

    def test_availability_respects_guests(self):
        """8 kişi istenince kalan 8 (cheap) kalır, kalan 7 (pricey) düşer."""
        ids = self._ids(self.client.get(f'/api/v1/tours/?date={self.day.isoformat()}&guests=8'))
        self.assertEqual(ids, ['cheap-tour'])

    def test_combined_filters(self):
        """Tarih + fiyat + kategori + puan birlikte doğru daralıyor."""
        url = (
            f'/api/v1/tours/?date={self.day.isoformat()}&guests=2'
            '&min_price=500&max_price=1000&category_obj=doga&min_rating=4.5'
        )
        ids = self._ids(self.client.get(url))
        self.assertEqual(ids, ['cheap-tour'])

    def test_list_query_count_constant(self):
        """N+1 yok: liste sorgu sayısı tur sayısından bağımsız sabit kalmalı."""
        with self.assertNumQueries(2):  # 1 count (pagination) + 1 results
            self.client.get('/api/v1/tours/')

        # Daha fazla tur ekle; sorgu sayısı değişmemeli.
        for i in range(5):
            Tour.objects.create(
                id=f'extra-{i}', agency=self.agency, title=f'Extra {i}', location='Bodrum',
                price=1000 + i, rating=4.0, reviews_count=1, duration='2 Gün', guide='Türkçe',
                description='d', category='Doğa', category_obj=self.cat_nature,
                image_main='https://example.com/i.jpg',
            )
        with self.assertNumQueries(2):
            self.client.get('/api/v1/tours/')

    def test_available_dates_suggests_alternatives(self):
        """Boş gün için alternatif tarih önerisi: yeri olan günler döner."""
        far_day = self.today + timedelta(days=30)
        TourAvailability.objects.create(tour=self.cheap, date=far_day, max_capacity=10, booked_count=0)

        response = self.client.get('/api/v1/tours/available-dates/?location=Kapadokya')
        self.assertEqual(response.status_code, 200)
        dates = response.data['dates']
        self.assertIn(self.day.isoformat(), dates)
        self.assertIn(far_day.isoformat(), dates)
        # Sıralı (en yakın önce) ve tekilleştirilmiş olmalı.
        self.assertEqual(dates, sorted(dates))

    def test_available_dates_honors_filters(self):
        """Alternatif tarih önerisi diğer filtreleri de uygular (fiyat)."""
        response = self.client.get('/api/v1/tours/available-dates/?max_price=1000')
        # Yalnız cheap-tour (<=1000) uygun; onun tek müsait günü self.day.
        self.assertEqual(response.data['dates'], [self.day.isoformat()])


class TourAvailabilityTestCase(TestCase):
    def setUp(self):
        self.agency = Agency.objects.create(name='Test Agency', status='onaylandi', is_verified=True)
        self.tour = Tour.objects.create(
            id='avail-tour',
            agency=self.agency,
            title='Availability Tour',
            location='Antalya',
            price=2000,
            duration='3 Days',
            guide='Turkish',
            description='Testing availability.',
            category='adventure',
            image_main='https://example.com/image.jpg',
        )

    def test_availability_remaining(self):
        """TourAvailability.remaining should calculate correctly"""
        from datetime import date
        avail = TourAvailability.objects.create(
            tour=self.tour,
            date=date(2026, 6, 15),
            max_capacity=20,
            booked_count=5
        )
        self.assertEqual(avail.remaining, 15)
        self.assertTrue(avail.is_available)

    def test_availability_full(self):
        """Full slot should not be available"""
        from datetime import date
        avail = TourAvailability.objects.create(
            tour=self.tour,
            date=date(2026, 6, 16),
            max_capacity=10,
            booked_count=10
        )
        self.assertEqual(avail.remaining, 0)
        self.assertFalse(avail.is_available)
