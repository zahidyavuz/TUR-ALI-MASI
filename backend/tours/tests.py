from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from tours.models import Tour, Category, TourAvailability
from agencies.models import Agency


class TourAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.agency = Agency.objects.create(owner=self.user, name='Test Agency', is_verified=True)
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


class TourAvailabilityTestCase(TestCase):
    def setUp(self):
        self.agency = Agency.objects.create(name='Test Agency', is_verified=True)
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
