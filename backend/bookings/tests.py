from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from tours.models import Tour, TourAvailability
from bookings.models import Booking
from agencies.models import Agency
from datetime import date, timedelta


class BookingLifecycleTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='booker', password='testpass123', email='booker@test.com')
        self.agency_owner = User.objects.create_user(username='agencyowner', password='testpass123')
        self.agency = Agency.objects.create(owner=self.agency_owner, name='Test Agency', is_verified=True)

        self.tour = Tour.objects.create(
            id='booking-test-tour',
            agency=self.agency,
            title='Booking Test Tour',
            location='Bodrum',
            price=3000,
            duration='5 Days',
            guide='Turkish',
            description='A tour for booking tests.',
            category='romantic',
            image_main='https://example.com/image.jpg',
        )

        # Create availability for tomorrow
        self.tomorrow = date.today() + timedelta(days=1)
        TourAvailability.objects.create(
            tour=self.tour,
            date=self.tomorrow,
            max_capacity=20,
            booked_count=0
        )

    def test_unauthenticated_cannot_book(self):
        """Unauthenticated users cannot create bookings"""
        response = self.client.post('/api/v1/bookings/', {
            'tour_slug': 'booking-test-tour',
            'guests': 2,
        })
        self.assertEqual(response.status_code, 401)

    def test_booking_list_requires_auth(self):
        """Booking list requires authentication"""
        response = self.client.get('/api/v1/bookings/')
        self.assertEqual(response.status_code, 401)

    def test_authenticated_booking_list(self):
        """Authenticated users can see their bookings"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/bookings/')
        self.assertEqual(response.status_code, 200)

    def test_past_date_rejected(self):
        """Cannot book for a past date"""
        self.client.force_authenticate(user=self.user)
        past_date = (date.today() - timedelta(days=5)).strftime('%Y-%m-%d')
        response = self.client.post('/api/v1/bookings/', {
            'tour_slug': 'booking-test-tour',
            'start_date': past_date,
            'guests': 2,
        })
        self.assertIn(response.status_code, [400, 503])  # 503 if Stripe not configured

    def test_booking_model_str(self):
        """Booking __str__ representation"""
        booking = Booking.objects.create(
            user=self.user,
            tour=self.tour,
            guests=2,
            total_price=6000,
            booking_ref='TEST1234',
            status='pending'
        )
        self.assertIn('TEST1234', str(booking))
        self.assertIn('booker', str(booking))

    # ─── İPTAL AKIŞI ────────────────────────────────────────────────────────
    def _make_booking(self, start_date, status='confirmed', guests=2, ref='CANCEL01'):
        return Booking.objects.create(
            user=self.user,
            tour=self.tour,
            start_date=start_date,
            guests=guests,
            total_price=3000 * guests,
            booking_ref=ref,
            status=status,
        )

    def test_cancel_requires_auth(self):
        """İptal ucu kimlik doğrulaması ister"""
        booking = self._make_booking(date.today() + timedelta(days=10))
        response = self.client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        self.assertEqual(response.status_code, 401)

    def test_cancel_rejected_within_cutoff(self):
        """Hizmete 24 saatten az kalmışsa iptal reddedilir ve durum değişmez"""
        self.client.force_authenticate(user=self.user)
        booking = self._make_booking(self.tomorrow, ref='CUTOFF01')
        response = self.client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        self.assertEqual(response.status_code, 400)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'confirmed')

    def test_cancel_restores_capacity(self):
        """Zamanında iptal: durum cancelled olur ve kontenjan geri döner"""
        self.client.force_authenticate(user=self.user)
        future = date.today() + timedelta(days=10)
        availability = TourAvailability.objects.create(
            tour=self.tour, date=future, max_capacity=20, booked_count=5
        )
        booking = self._make_booking(future, guests=3, ref='RESTORE1')

        response = self.client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        self.assertEqual(response.status_code, 200)

        booking.refresh_from_db()
        availability.refresh_from_db()
        self.assertEqual(booking.status, 'cancelled')
        self.assertIsNotNone(booking.cancelled_at)
        self.assertEqual(availability.booked_count, 2)

    def test_cancel_twice_rejected(self):
        """Zaten iptal edilmiş rezervasyon tekrar iptal edilemez"""
        self.client.force_authenticate(user=self.user)
        booking = self._make_booking(
            date.today() + timedelta(days=10), status='cancelled', ref='TWICE001'
        )
        response = self.client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        self.assertEqual(response.status_code, 400)

    def test_cannot_cancel_other_users_booking(self):
        """Başka kullanıcının rezervasyonu iptal edilemez"""
        other = User.objects.create_user(username='intruder', password='testpass123')
        booking = self._make_booking(date.today() + timedelta(days=10), ref='OTHER001')
        self.client.force_authenticate(user=other)
        response = self.client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        self.assertEqual(response.status_code, 404)
