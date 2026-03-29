from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from tours.models import Tour
from reviews.models import Review
from bookings.models import Booking
from agencies.models import Agency


class ReviewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='reviewer', password='testpass123')
        self.other_user = User.objects.create_user(username='other', password='testpass123')
        self.agency_owner = User.objects.create_user(username='agencyowner', password='testpass123')
        self.agency = Agency.objects.create(owner=self.agency_owner, name='Review Agency', is_verified=True)

        self.tour = Tour.objects.create(
            id='review-tour',
            agency=self.agency,
            title='Review Test Tour',
            location='Antalya',
            price=2000,
            duration='3 Days',
            guide='Turkish',
            description='A tour for review tests.',
            category='culture',
            image_main='https://example.com/image.jpg',
        )

        # Create a confirmed booking for reviewer
        self.booking = Booking.objects.create(
            user=self.user,
            tour=self.tour,
            guests=2,
            total_price=4000,
            booking_ref='REV12345',
            status='confirmed'
        )

    def test_review_list(self):
        """GET /api/v1/reviews/ should return list"""
        response = self.client.get('/api/v1/reviews/')
        self.assertEqual(response.status_code, 200)

    def test_only_confirmed_user_can_review(self):
        """Only users with confirmed bookings can review"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/reviews/', {
            'tour': 'review-tour',
            'rating': 5,
            'comment': 'Amazing tour!'
        })
        self.assertEqual(response.status_code, 201)

    def test_unbooked_user_cannot_review(self):
        """Users without bookings cannot review"""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post('/api/v1/reviews/', {
            'tour': 'review-tour',
            'rating': 4,
            'comment': 'Cannot review without booking.'
        })
        self.assertEqual(response.status_code, 403)

    def test_duplicate_review_rejected(self):
        """Users cannot review the same tour twice"""
        self.client.force_authenticate(user=self.user)
        # First review
        self.client.post('/api/v1/reviews/', {
            'tour': 'review-tour',
            'rating': 5,
            'comment': 'First review.'
        })
        # Second review attempt
        response = self.client.post('/api/v1/reviews/', {
            'tour': 'review-tour',
            'rating': 3,
            'comment': 'Duplicate review.'
        })
        self.assertEqual(response.status_code, 400)

    def test_review_updates_tour_rating(self):
        """Creating a review should update the tour's rating via signal"""
        self.client.force_authenticate(user=self.user)
        self.client.post('/api/v1/reviews/', {
            'tour': 'review-tour',
            'rating': 4,
            'comment': 'Great tour!'
        })
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.reviews_count, 1)
        self.assertEqual(float(self.tour.rating), 4.0)

    def test_agency_reply(self):
        """Agency owner can reply to a review"""
        # Create a review first
        review = Review.objects.create(
            tour=self.tour,
            user=self.user,
            rating=5,
            comment='Wonderful experience!'
        )

        self.client.force_authenticate(user=self.agency_owner)
        response = self.client.post(f'/api/v1/reviews/{review.id}/reply/', {
            'agency_reply': 'Thank you for the kind words!'
        })
        self.assertEqual(response.status_code, 200)
        review.refresh_from_db()
        self.assertEqual(review.agency_reply, 'Thank you for the kind words!')
