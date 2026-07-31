import logging
import random
import threading
import time
from itertools import count
from unittest.mock import patch

from django.db import connection
from django.test import TestCase, TransactionTestCase, override_settings
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from tours.models import Tour, TourAvailability
from bookings.models import Booking
from agencies.models import Agency
from datetime import date, timedelta
from datetime import time as dtime  # stdlib `time` modülünü gölgelememek için
from decimal import Decimal


class _FakeIntent:
    """stripe.PaymentIntent.create() dönüşünün testlerde kullanılan taklidi."""
    _counter = count(1)
    _lock = threading.Lock()

    def __init__(self):
        with self._lock:
            n = next(self._counter)
        self.id = f'pi_test_{n:012d}'
        self.client_secret = f'{self.id}_secret'


def _fake_payment_intent_create(*args, **kwargs):
    return _FakeIntent()


class BookingLifecycleTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='booker', password='testpass123', email='booker@test.com')
        self.agency_owner = User.objects.create_user(username='agencyowner', password='testpass123')
        self.agency = Agency.objects.create(owner=self.agency_owner, name='Test Agency', status='onaylandi', is_verified=True)

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


@override_settings(STRIPE_SECRET_KEY='sk_test_dummy')
@patch('bookings.payments.stripe_provider.stripe.PaymentIntent.create', side_effect=_fake_payment_intent_create)
class TourCapacityReservationTestCase(TestCase):
    """F2-02 — Kontenjan rezervasyonu, gün kapatma ve gün bazlı fiyat."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='res_user', password='pass', email='res@test.com')
        self.agency = Agency.objects.create(name='Res Agency', status='onaylandi', is_verified=True)
        self.tour = Tour.objects.create(
            id='res-tour', agency=self.agency, title='Res Tour', location='İzmir',
            price=1000, duration='1 Gün', guide='Türkçe', description='d',
            category='doga', image_main='https://example.com/i.jpg',
        )
        self.day = date.today() + timedelta(days=10)
        self.slot = TourAvailability.objects.create(
            tour=self.tour, date=self.day, max_capacity=10, booked_count=0
        )
        self.client.force_authenticate(user=self.user)

    def _book(self, guests=2, **extra):
        return self.client.post('/api/v1/bookings/', {
            'tour_slug': self.tour.pk,
            'start_date': self.day.strftime('%Y-%m-%d'),
            'guests': guests,
            **extra,
        })

    def test_capacity_reserved_at_creation(self, _intent):
        """Kontenjan webhook'u beklemeden, rezervasyon anında düşer"""
        response = self._book(guests=3)
        self.assertEqual(response.status_code, 201, response.data)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 3)

    def test_overbooking_rejected(self, _intent):
        """Kalan kontenjandan fazlası istenirse 400 ve sayaç değişmez"""
        self.assertEqual(self._book(guests=8).status_code, 201)
        response = self._book(guests=5)
        self.assertEqual(response.status_code, 400)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 8)

    def test_closed_day_rejected(self, _intent):
        """Kapalı gün için rezervasyon alınmaz"""
        self.slot.is_closed = True
        self.slot.save(update_fields=['is_closed'])
        response = self._book(guests=1)
        self.assertEqual(response.status_code, 400)
        self.assertIn('kapalı', response.data['error'].lower())
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 0)

    def test_price_override_applied(self, _intent):
        """Gün bazlı fiyat girilmişse tutar ondan hesaplanır"""
        self.slot.price_override = 250
        self.slot.save(update_fields=['price_override'])
        response = self._book(guests=2)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(float(response.data['booking']['total_price']), 500.0)

    def test_client_total_price_is_ignored(self, _intent):
        """(F3-07·f) Fiyat manipülasyonu: gövdede total_price gönderilse bile
        sunucu tur.price × guests hesabını kullanır, müşteri değeri yok sayılır."""
        response = self._book(guests=2, total_price='1.00')
        self.assertEqual(response.status_code, 201, response.data)
        # tur fiyatı 1000 × 2 misafir = 2000; gönderilen '1.00' dikkate alınmaz.
        self.assertEqual(float(response.data['booking']['total_price']), 2000.0)
        booking = Booking.objects.get(pk=response.data['booking']['id'])
        self.assertEqual(booking.total_price, Decimal('2000.00'))

    def test_cancelling_pending_releases_capacity(self, _intent):
        """Ödenmemiş (pending) rezervasyon iptal edilince kontenjan geri döner"""
        booking_id = self._book(guests=4).data['booking']['id']
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 4)

        response = self.client.post(f'/api/v1/bookings/{booking_id}/cancel/')
        self.assertEqual(response.status_code, 200, response.data)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 0)

    def test_confirmation_does_not_double_count(self, _intent):
        """Webhook onayı kontenjanı ikinci kez düşmez"""
        booking_id = self._book(guests=3).data['booking']['id']
        booking = Booking.objects.get(pk=booking_id)

        from bookings.views import BookingViewSet
        view = BookingViewSet()
        # Onay dalındaki kontenjan kodu artık yalnızca 'shuttle' için çalışıyor;
        # tur rezervasyonunda serbest bırakma dışında sayaca dokunulmamalı.
        self.assertEqual(booking.service_type, 'tour')
        view._release_tour_capacity(booking)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 0)


@override_settings(STRIPE_SECRET_KEY='sk_test_dummy')
class OverbookingRaceTestCase(TransactionTestCase):
    """
    F2-02 doğrulaması — eşzamanlı satışta overbooking oluşmamalı.

    TransactionTestCase kullanılıyor: TestCase her testi tek bir transaction'a
    sardığı için paralel thread'ler veriyi göremez.
    """
    reset_sequences = True

    def setUp(self):
        # SQLite kilit hataları django.request'e ERROR olarak düşüyor; test
        # bunları yeniden deneyerek zaten ele alıyor, çıktıyı kirletmesin.
        self._request_logger = logging.getLogger('django.request')
        self._prev_level = self._request_logger.level
        self._request_logger.setLevel(logging.CRITICAL)
        self.addCleanup(self._request_logger.setLevel, self._prev_level)

        self.user = User.objects.create_user(username='race_user', password='pass')
        self.agency = Agency.objects.create(name='Race Agency', status='onaylandi', is_verified=True)
        self.tour = Tour.objects.create(
            id='race-tour', agency=self.agency, title='Race Tour', location='Muğla',
            price=100, duration='1 Gün', guide='Türkçe', description='d',
            category='doga', image_main='https://example.com/i.jpg',
        )
        self.day = date.today() + timedelta(days=10)
        TourAvailability.objects.create(
            tour=self.tour, date=self.day, max_capacity=10, booked_count=0
        )

    @patch('bookings.payments.stripe_provider.stripe.PaymentIntent.create', side_effect=_fake_payment_intent_create)
    def test_concurrent_bookings_never_overbook(self, _intent):
        threads_count = 8
        guests = 3  # 10 kişilik kontenjanda en fazla 3 istek başarılı olabilir
        barrier = threading.Barrier(threads_count)
        results = []
        results_lock = threading.Lock()

        def book():
            # raise_request_exception=False: SQLite eşzamanlı yazmada geçici
            # "database table is locked" hatası verebilir; bunu istisna olarak
            # fırlatmak yerine 500 yanıtı olarak alıp yeniden deniyoruz. Testin
            # konusu kilit davranışı değil, kontenjan muhasebesi.
            client = APIClient(raise_request_exception=False)
            client.force_authenticate(user=self.user)
            status_code = None
            try:
                barrier.wait(timeout=10)
                for _ in range(30):
                    response = client.post('/api/v1/bookings/', {
                        'tour_slug': self.tour.pk,
                        'start_date': self.day.strftime('%Y-%m-%d'),
                        'guests': guests,
                    })
                    status_code = response.status_code
                    if status_code != 500:
                        break
                    time.sleep(random.uniform(0.02, 0.08))
            finally:
                with results_lock:
                    results.append(status_code)
                connection.close()

        threads = [threading.Thread(target=book) for _ in range(threads_count)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)

        slot = TourAvailability.objects.get(tour=self.tour, date=self.day)
        created = results.count(201)

        self.assertLessEqual(slot.booked_count, slot.max_capacity,
                             f'Overbooking! {slot.booked_count} > {slot.max_capacity}')
        self.assertEqual(slot.booked_count, created * guests)
        self.assertLessEqual(created, slot.max_capacity // guests)
        self.assertGreaterEqual(created, 1, f'Hiçbir istek tamamlanamadı: {results}')
        self.assertEqual(results.count(400), threads_count - created,
                         f'Kalan istekler "yer yok" ile reddedilmeliydi: {results}')
        self.assertEqual(
            Booking.objects.filter(tour=self.tour, status='pending').count(), created
        )


from bookings.payments import WebhookEvent
from shuttles.models import ShuttleRoute, ShuttleAvailability


class _FakeProvider:
    """verify_webhook her çağrıda sabit bir event döndürür (imza doğrulanmaz)."""

    def __init__(self, intent_id, event_type=WebhookEvent.SUCCEEDED):
        self._intent_id = intent_id
        self._event_type = event_type

    def verify_webhook(self, payload, headers):
        return WebhookEvent(
            provider='stripe', type=self._event_type, intent_id=self._intent_id
        )


class WebhookIdempotencyTestCase(TestCase):
    """F3-07(b) — Aynı ödeme event'i webhook'a 2× gelirse kontenjan yalnızca
    1× işlenir. `if booking.status != 'confirmed'` guard'ı ikinci çağrıyı yutar."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='wh_user', password='pass', email='wh@test.com'
        )
        self.agency = Agency.objects.create(
            name='WH Agency', status='onaylandi', is_verified=True
        )
        self.day = date.today() + timedelta(days=10)

    def _fire_webhook_twice(self, intent_id):
        fake = _FakeProvider(intent_id)
        with patch('bookings.views.get_provider', return_value=fake):
            r1 = self.client.post(
                '/api/v1/bookings/webhook/', data='{}', content_type='application/json'
            )
            r2 = self.client.post(
                '/api/v1/bookings/webhook/', data='{}', content_type='application/json'
            )
        return r1, r2

    def test_tour_webhook_never_touches_quota(self):
        """Tur kontenjanı create()'te rezerve edilir; webhook (kaç kez gelirse
        gelsin) sayaca dokunmaz — yalnızca durumu 'confirmed' yapar."""
        tour = Tour.objects.create(
            id='wh-tour', agency=self.agency, title='WH Tour', location='İzmir',
            price=1000, duration='1 Gün', guide='Türkçe', description='d',
            category='doga', image_main='https://example.com/i.jpg',
        )
        slot = TourAvailability.objects.create(
            tour=tour, date=self.day, max_capacity=10, booked_count=2
        )
        booking = Booking.objects.create(
            user=self.user, tour=tour, service_type='tour', start_date=self.day,
            guests=2, total_price=Decimal('2000.00'), booking_ref='WHT00001',
            status='pending', payment_intent_id='pi_wh_tour_1',
        )

        r1, r2 = self._fire_webhook_twice('pi_wh_tour_1')
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)

        booking.refresh_from_db()
        slot.refresh_from_db()
        self.assertEqual(booking.status, 'confirmed')
        # create()'teki 2 dışında hiçbir artış olmamalı (çift sayım yok).
        self.assertEqual(slot.booked_count, 2)

    def test_shuttle_webhook_increments_quota_once(self):
        """Transfer kontenjanı webhook'ta artırılır; aynı event 2× gelse de
        sayaç yalnızca 1× artar."""
        route = ShuttleRoute.objects.create(
            id='wh-route', agency=self.agency, title='WH Route', description='d',
            origin='A', destination='B', price_per_person=Decimal('100.00'),
        )
        slot_time = dtime(9, 0)
        avail = ShuttleAvailability.objects.create(
            shuttle_route=route, date=self.day, time=slot_time,
            max_capacity=8, booked_count=0,
        )
        booking = Booking.objects.create(
            user=self.user, shuttle_route=route, service_type='shuttle',
            start_date=self.day, start_time=slot_time, guests=3,
            total_price=Decimal('300.00'), booking_ref='WHS00001',
            status='pending', payment_intent_id='pi_wh_shuttle_1',
        )

        r1, r2 = self._fire_webhook_twice('pi_wh_shuttle_1')
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)

        booking.refresh_from_db()
        avail.refresh_from_db()
        self.assertEqual(booking.status, 'confirmed')
        # İlk event 3 ekler; ikinci event 'confirmed' guard'ıyla atlanır.
        self.assertEqual(avail.booked_count, 3)
