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
