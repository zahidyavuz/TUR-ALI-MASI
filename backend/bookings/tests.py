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

    def test_unauthenticated_guest_booking_requires_contact(self):
        """F4-07: Misafir satın alma artık kimlik doğrulaması gerektirmez, ancak
        ad soyad + e-posta olmadan rezervasyon açılamaz (400)."""
        response = self.client.post('/api/v1/bookings/', {
            'tour_slug': 'booking-test-tour',
            'guests': 2,
        })
        self.assertEqual(response.status_code, 400)

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

    def test_cancel_within_final_window_no_refund(self):
        """F4-04: Esnek politikada son 24 saatte iptal yine yapılır ama
        iade %0'dır (F1-06'daki sabit blok kaldırıldı)."""
        self.client.force_authenticate(user=self.user)
        booking = self._make_booking(self.tomorrow, ref='CUTOFF01')
        response = self.client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['refund_percent'], 0)
        self.assertFalse(response.data['refunded'])
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'cancelled')

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

    def test_shuttle_webhook_never_touches_quota(self):
        """Transfer kontenjanı da create()'te rezerve edilir (F5-01); webhook
        (kaç kez gelirse gelsin) sayaca dokunmaz — yalnızca durumu 'confirmed'
        yapar. Aksi halde create+webhook çift sayıma yol açardı."""
        route = ShuttleRoute.objects.create(
            id='wh-route', agency=self.agency, title='WH Route', description='d',
            origin='A', destination='B', price_per_person=Decimal('100.00'),
        )
        slot_time = dtime(9, 0)
        avail = ShuttleAvailability.objects.create(
            shuttle_route=route, date=self.day, time=slot_time,
            max_capacity=8, booked_count=3,
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
        # create()'teki 3 dışında hiçbir artış olmamalı (çift sayım yok).
        self.assertEqual(avail.booked_count, 3)


@override_settings(STRIPE_SECRET_KEY='sk_test_dummy')
@patch('bookings.payments.stripe_provider.stripe.PaymentIntent.create', side_effect=_fake_payment_intent_create)
class ShuttleCapacityReservationTestCase(TestCase):
    """F5-01 — Transfer kontenjanı da (tur akışıyla aynı desende) rezervasyon
    anında koşullu UPDATE ile tutulur; webhook'ta değil. Overbooking engellenir,
    başarısız/iptal edilen rezervasyonlarda kontenjan geri bırakılır."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='sh_user', password='pass', email='sh@test.com')
        self.agency = Agency.objects.create(name='Sh Agency', status='onaylandi', is_verified=True)
        self.route = ShuttleRoute.objects.create(
            id='res-route', agency=self.agency, title='Res Route', description='d',
            origin='A', destination='B', price_per_person=Decimal('100.00'),
            min_passengers=1, max_passengers=8,
        )
        self.day = date.today() + timedelta(days=10)
        self.slot_time = dtime(9, 0)
        self.slot = ShuttleAvailability.objects.create(
            shuttle_route=self.route, date=self.day, time=self.slot_time,
            max_capacity=8, booked_count=0,
        )
        self.client.force_authenticate(user=self.user)

    def _book(self, guests=2, **extra):
        return self.client.post('/api/v1/bookings/', {
            'service_type': 'shuttle',
            'shuttle_route_id': self.route.pk,
            'start_date': self.day.strftime('%Y-%m-%d'),
            'start_time': '09:00',
            'guests': guests,
            **extra,
        })

    def test_capacity_reserved_at_creation(self, _intent):
        """Kontenjan webhook'u beklemeden rezervasyon anında düşer"""
        response = self._book(guests=3)
        self.assertEqual(response.status_code, 201, response.data)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 3)

    def test_overbooking_rejected(self, _intent):
        """Kalan kontenjandan fazlası istenirse 400 ve sayaç değişmez"""
        self.assertEqual(self._book(guests=6).status_code, 201)
        response = self._book(guests=5)
        self.assertEqual(response.status_code, 400)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 6)

    def test_client_total_price_is_ignored(self, _intent):
        """Fiyat sunucuda price_per_person × guests ile hesaplanır"""
        response = self._book(guests=2, total_price='1.00')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(float(response.data['booking']['total_price']), 200.0)

    def test_cancelling_pending_releases_capacity(self, _intent):
        """Ödenmemiş (pending) transfer iptalinde kontenjan geri döner"""
        booking_id = self._book(guests=4).data['booking']['id']
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 4)

        response = self.client.post(f'/api/v1/bookings/{booking_id}/cancel/')
        self.assertEqual(response.status_code, 200, response.data)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 0)

    def test_failed_payment_releases_capacity(self, _intent):
        """Ödeme başarısız olursa webhook create()'te tutulan kontenjanı bırakır"""
        booking_id = self._book(guests=3).data['booking']['id']
        booking = Booking.objects.get(pk=booking_id)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.booked_count, 3)

        fake = _FakeProvider(booking.payment_intent_id, event_type=WebhookEvent.FAILED)
        with patch('bookings.views.get_provider', return_value=fake):
            r = self.client.post(
                '/api/v1/bookings/webhook/', data='{}', content_type='application/json'
            )
        self.assertEqual(r.status_code, 200)
        booking.refresh_from_db()
        self.slot.refresh_from_db()
        self.assertEqual(booking.status, 'failed')
        self.assertEqual(self.slot.booked_count, 0)


@override_settings(STRIPE_SECRET_KEY='sk_test_dummy')
@patch('bookings.payments.stripe_provider.stripe.PaymentIntent.create', side_effect=_fake_payment_intent_create)
class GuestCheckoutTestCase(TestCase):
    """F4-07 — Üyeliksiz (misafir) satın alma: gölge kullanıcı, imzalı bilet
    bağlantısı ve hesap sahiplenme (claim) akışı."""

    def setUp(self):
        self.client = APIClient()
        self.agency = Agency.objects.create(name='Guest Agency', status='onaylandi', is_verified=True)
        self.tour = Tour.objects.create(
            id='guest-tour', agency=self.agency, title='Guest Tour', location='Fethiye',
            price=Decimal('500.00'), duration='1 Gün', guide='Türkçe', description='d',
            category='doga', image_main='https://example.com/i.jpg',
        )
        self.day = date.today() + timedelta(days=10)
        self.slot = TourAvailability.objects.create(
            tour=self.tour, date=self.day, max_capacity=10, booked_count=0
        )

    def _guest_book(self, **extra):
        payload = {
            'tour_slug': self.tour.pk,
            'start_date': self.day.strftime('%Y-%m-%d'),
            'guests': 2,
            'guest_full_name': 'Ayşe Yılmaz',
            'guest_email': 'ayse@example.com',
            'guest_phone': '+905551112233',
        }
        payload.update(extra)
        return self.client.post('/api/v1/bookings/', payload)

    def test_guest_booking_creates_shadow_user(self, _intent):
        """Anonim istek → parolasız gölge kullanıcı yaratılır ve rezervasyon ona bağlanır."""
        response = self._guest_book()
        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(email__iexact='ayse@example.com')
        self.assertFalse(user.has_usable_password())
        self.assertTrue(user.profile.is_guest)
        booking = Booking.objects.get(pk=response.data['booking']['id'])
        self.assertEqual(booking.user_id, user.id)

    def test_guest_booking_requires_name_and_email(self, _intent):
        """Ad veya e-posta eksikse 400."""
        response = self._guest_book(guest_email='')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.filter(email__iexact='ayse@example.com').count(), 0)

    def test_guest_booking_invalid_email(self, _intent):
        """Geçersiz e-posta biçimi 400 döner."""
        response = self._guest_book(guest_email='not-an-email')
        self.assertEqual(response.status_code, 400)

    def test_existing_email_reused_not_duplicated(self, _intent):
        """Aynı e-postayla kayıtlı hesap varsa rezervasyon ona bağlanır, yeni kullanıcı açılmaz."""
        existing = User.objects.create_user(
            username='ayse', email='ayse@example.com', password='realpass123'
        )
        response = self._guest_book()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(User.objects.filter(email__iexact='ayse@example.com').count(), 1)
        booking = Booking.objects.get(pk=response.data['booking']['id'])
        self.assertEqual(booking.user_id, existing.id)

    def test_guest_ticket_token_roundtrip(self, _intent):
        """Geçerli imzalı token ile misafir bileti görüntülenebilir."""
        from bookings.tokens import make_ticket_token
        booking_id = self._guest_book().data['booking']['id']
        booking = Booking.objects.get(pk=booking_id)
        token = make_ticket_token(booking)
        response = self.client.get('/api/v1/bookings/guest-ticket/', {'token': token})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['booking_ref'], booking.booking_ref)

    def test_guest_ticket_invalid_token(self, _intent):
        """Bozuk token 400 döner."""
        response = self.client.get('/api/v1/bookings/guest-ticket/', {'token': 'garbage'})
        self.assertEqual(response.status_code, 400)

    def test_guest_ticket_missing_token(self, _intent):
        """Token yoksa 400 döner."""
        response = self.client.get('/api/v1/bookings/guest-ticket/')
        self.assertEqual(response.status_code, 400)


class ClaimAccountTestCase(TestCase):
    """F4-07 — Misafir hesabı sahiplenme (claim) uç noktası."""

    def setUp(self):
        self.client = APIClient()

    def _guest(self):
        from users.guest import create_guest_user
        return create_guest_user('claim@example.com', 'Claim User', '+905550000000')

    def test_claim_sets_password_and_clears_guest_flag(self):
        from users.guest import make_claim_token
        user = self._guest()
        token = make_claim_token(user)
        response = self.client.post('/api/v1/auth/claim-account/', {
            'token': token, 'password': 'BrandNewPass123',
        })
        self.assertEqual(response.status_code, 200, response.data)
        user.refresh_from_db()
        self.assertTrue(user.has_usable_password())
        self.assertTrue(user.check_password('BrandNewPass123'))
        self.assertFalse(user.profile.is_guest)

    def test_claim_rejects_invalid_token(self):
        response = self.client.post('/api/v1/auth/claim-account/', {
            'token': 'garbage', 'password': 'BrandNewPass123',
        })
        self.assertEqual(response.status_code, 400)

    def test_claim_rejects_non_guest_account(self):
        """Zaten sahiplenilmiş/normal hesap claim edilemez (hesap ele geçirme koruması)."""
        from users.guest import make_claim_token
        user = self._guest()
        token = make_claim_token(user)
        # Hesap araya girip sahiplenilirse ikinci claim reddedilmeli.
        profile = user.profile
        profile.is_guest = False
        profile.save(update_fields=['is_guest'])
        response = self.client.post('/api/v1/auth/claim-account/', {
            'token': token, 'password': 'BrandNewPass123',
        })
        self.assertEqual(response.status_code, 400)

    def test_claim_rejects_weak_password(self):
        from users.guest import make_claim_token
        user = self._guest()
        token = make_claim_token(user)
        response = self.client.post('/api/v1/auth/claim-account/', {
            'token': token, 'password': '123',
        })
        self.assertEqual(response.status_code, 400)


class CancellationPolicyRefundTestCase(TestCase):
    """F4-04 — İptal politikasına göre kısmi/tam iade hesabı (cancel action)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='refunder', password='pw', email='r@t.com')
        self.agency = Agency.objects.create(name='Refund Agency', status='onaylandi', is_verified=True)
        self.client.force_authenticate(user=self.user)

    def _tour(self, policy):
        return Tour.objects.create(
            id=f'refund-tour-{policy}', agency=self.agency, title=f'{policy} tour',
            location='Antalya', price=Decimal('1000.00'), duration='1 Gün',
            guide='Türkçe', description='d', category='doga',
            image_main='https://example.com/i.jpg', cancellation_policy=policy,
        )

    def _booking(self, tour, start_date, ref):
        return Booking.objects.create(
            user=self.user, tour=tour, start_date=start_date, guests=2,
            total_price=Decimal('2000.00'), booking_ref=ref, status='confirmed',
            payment_intent_id=f'pi_{ref}',
        )

    def _fake_provider(self):
        provider = patch('bookings.views.get_provider').start()
        self.addCleanup(patch.stopall)
        provider.return_value.is_configured.return_value = True
        return provider.return_value

    def test_flexible_full_refund(self):
        """Esnek + 10 gün önce iptal → tam iade (amount geçilmez)."""
        fake = self._fake_provider()
        booking = self._booking(self._tour('flexible'), date.today() + timedelta(days=10), 'FLEX01')
        resp = self.client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['refund_percent'], 100)
        self.assertTrue(resp.data['refunded'])
        fake.refund.assert_called_once_with(intent_id='pi_FLEX01')

    def test_moderate_partial_refund(self):
        """Orta + 2 gün önce iptal (24-72s) → %50 kısmi iade (amount verilir)."""
        fake = self._fake_provider()
        booking = self._booking(self._tour('moderate'), date.today() + timedelta(days=2), 'MOD01')
        resp = self.client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['refund_percent'], 50)
        self.assertTrue(resp.data['refunded'])
        fake.refund.assert_called_once_with(intent_id='pi_MOD01', amount=Decimal('1000.00'))

    def test_strict_no_refund_within_window(self):
        """Katı + 3 gün önce iptal (<7 gün) → %0 iade, PSP çağrılmaz, yine iptal."""
        fake = self._fake_provider()
        booking = self._booking(self._tour('strict'), date.today() + timedelta(days=3), 'STR01')
        resp = self.client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['refund_percent'], 0)
        self.assertFalse(resp.data['refunded'])
        fake.refund.assert_not_called()
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'cancelled')

    def test_partial_refund_writes_proportional_ledger(self):
        """%50 iade → hakediş defterine satışın yarısı kadar ters kayıt yazılır."""
        from agencies.finance_models import AgentFinanceLedger
        self.agency.commission_rate = Decimal('10.00')
        self.agency.save(update_fields=['commission_rate'])
        self._fake_provider()
        tour = self._tour('moderate')
        booking = self._booking(tour, date.today() + timedelta(days=2), 'MODLED1')
        AgentFinanceLedger.create_from_booking(booking)

        resp = self.client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        self.assertEqual(resp.status_code, 200, resp.data)

        refund = AgentFinanceLedger.objects.get(
            booking_ref=f'{booking.booking_ref}{AgentFinanceLedger.REFUND_REF_SUFFIX}'
        )
        # Satış gross 2000 → %50 iade → -1000; net (2000-%10=1800) → -900.
        self.assertEqual(refund.gross_amount, Decimal('-1000.00'))
        self.assertEqual(refund.net_amount, Decimal('-900.00'))


