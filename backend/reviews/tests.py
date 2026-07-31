from datetime import timedelta

from django.core import mail
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
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
        self.agency = Agency.objects.create(owner=self.agency_owner, name='Review Agency', status='onaylandi', is_verified=True)

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

        # Tarihi geçmiş (tamamlanmış) onaylı rezervasyon — yorum yazma izni için.
        self.booking = Booking.objects.create(
            user=self.user,
            tour=self.tour,
            guests=2,
            total_price=4000,
            booking_ref='REV12345',
            status='confirmed',
            start_date=timezone.localdate() - timedelta(days=3),
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

    def test_review_is_marked_verified(self):
        """Tarihi geçmiş onaylı rezervasyon sahibinin yorumu doğrulanmış olur."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/reviews/', {
            'tour': 'review-tour',
            'rating': 5,
            'comment': 'Doğrulanmış katılımcı yorumu.'
        })
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['verified'])

    def test_future_dated_booking_cannot_review(self):
        """Turu henüz gerçekleşmemiş (gelecek tarihli) kullanıcı yorum yazamaz."""
        self.booking.start_date = timezone.localdate() + timedelta(days=5)
        self.booking.save(update_fields=['start_date'])
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/reviews/', {
            'tour': 'review-tour',
            'rating': 5,
            'comment': 'Tur daha yapılmadı.'
        })
        self.assertEqual(response.status_code, 403)

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

    def test_agency_reviews_list(self):
        """Acenta kendi turlarına ait yorumları /reviews/agency/ ile listeler."""
        Review.objects.create(tour=self.tour, user=self.user, rating=4, comment='Panel testi.')
        self.client.force_authenticate(user=self.agency_owner)
        response = self.client.get('/api/v1/reviews/agency/')
        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['tour_title'], 'Review Test Tour')

    def test_agency_reviews_list_forbidden_for_non_agency(self):
        """Acenta olmayan kullanıcı /reviews/agency/ erişemez."""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get('/api/v1/reviews/agency/')
        self.assertEqual(response.status_code, 403)


class ReviewInviteCommandTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='guest', password='pass', email='guest@example.com')
        self.agency_owner = User.objects.create_user(username='inviteowner', password='pass')
        self.agency = Agency.objects.create(owner=self.agency_owner, name='Invite Agency', status='onaylandi', is_verified=True)
        self.tour = Tour.objects.create(
            id='invite-tour', agency=self.agency, title='Invite Tour', location='İzmir',
            price=1000, duration='1 Day', guide='TR', description='x', category='culture',
            image_main='https://example.com/i.jpg',
        )

    def _booking(self, start_date, **kwargs):
        return Booking.objects.create(
            user=self.user, tour=self.tour, guests=1, total_price=1000,
            booking_ref=kwargs.pop('booking_ref', 'INV0001'), status='confirmed',
            start_date=start_date, **kwargs,
        )

    def test_invite_sent_for_completed_tour(self):
        booking = self._booking(timezone.localdate() - timedelta(days=2))
        call_command('send_review_invites')
        booking.refresh_from_db()
        self.assertIsNotNone(booking.review_invite_sent_at)
        self.assertEqual(len(mail.outbox), 1)

    def test_invite_not_resent(self):
        self._booking(timezone.localdate() - timedelta(days=2))
        call_command('send_review_invites')
        mail.outbox.clear()
        call_command('send_review_invites')
        self.assertEqual(len(mail.outbox), 0)

    def test_future_tour_gets_no_invite(self):
        booking = self._booking(timezone.localdate() + timedelta(days=2))
        call_command('send_review_invites')
        booking.refresh_from_db()
        self.assertIsNone(booking.review_invite_sent_at)
        self.assertEqual(len(mail.outbox), 0)

    def test_already_reviewed_skips_email(self):
        booking = self._booking(timezone.localdate() - timedelta(days=2))
        Review.objects.create(tour=self.tour, user=self.user, rating=5, comment='Zaten yorum var.')
        call_command('send_review_invites')
        booking.refresh_from_db()
        self.assertIsNotNone(booking.review_invite_sent_at)
        self.assertEqual(len(mail.outbox), 0)
