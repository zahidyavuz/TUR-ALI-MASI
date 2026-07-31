from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Agency


class PartnerOnboardingTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _start(self, business_type='restoran', legal_entity_type='individual', email='partner@test.com'):
        return self.client.post('/api/v1/agencies/onboarding/start/', {
            'email': email,
            'password': 'testpass123',
            'contact_name': 'Ahmet Yilmaz',
            'phone': '05551234567',
            'business_type': business_type,
            'legal_entity_type': legal_entity_type,
        })

    def test_start_creates_user_and_agency(self):
        response = self._start()
        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.data)
        self.assertTrue(User.objects.filter(email='partner@test.com').exists())
        agency = Agency.objects.get(email='partner@test.com')
        self.assertEqual(agency.status, 'taslak')
        self.assertFalse(agency.is_verified)

    def test_start_rejects_duplicate_email(self):
        self._start()
        response = self._start()
        self.assertEqual(response.status_code, 400)

    def test_start_rejects_invalid_phone(self):
        response = self.client.post('/api/v1/agencies/onboarding/start/', {
            'email': 'bad@test.com', 'password': 'testpass123', 'contact_name': 'X',
            'phone': '123', 'business_type': 'restoran', 'legal_entity_type': 'individual',
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('phone', response.data)

    def _authenticate_after_start(self, **kwargs):
        response = self._start(**kwargs)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return Agency.objects.get(owner__email=kwargs.get('email', 'partner@test.com'))

    def test_step2_patch_updates_fields(self):
        self._authenticate_after_start()
        response = self.client.patch('/api/v1/agencies/onboarding/', {
            'name': 'Test Restoran Ltd.',
            'tax_office': 'Kadıköy',
            'tax_id': '12345678901',  # individual -> TCKN, 11 digits
        }, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        agency = Agency.objects.get(email='partner@test.com')
        self.assertEqual(agency.name, 'Test Restoran Ltd.')

    def test_submit_fails_without_contract_acceptance(self):
        self._authenticate_after_start()
        response = self.client.post('/api/v1/agencies/onboarding/submit/', {
            'accept_contract': False, 'accept_kvkk': True,
        })
        self.assertEqual(response.status_code, 400)

    def test_submit_requires_tursab_for_acenta_but_not_restoran(self):
        agency = self._authenticate_after_start(business_type='acenta', legal_entity_type='individual', email='acenta@test.com')
        agency.name = 'Test Acenta'
        agency.tax_id = '12345678901'
        agency.tax_office = 'Beşiktaş'
        agency.description = 'x' * 60
        agency.city = 'İstanbul'
        agency.address = 'Adres 1'
        agency.iban = 'TR' + '1' * 24
        agency.bank_account_holder = 'Ahmet Yilmaz'
        agency.bank_name = 'Test Bank'
        from django.core.files.uploadedfile import SimpleUploadedFile
        agency.logo = SimpleUploadedFile('logo.jpg', b'fake', content_type='image/jpeg')
        agency.save()

        response = self.client.post('/api/v1/agencies/onboarding/submit/', {
            'accept_contract': True, 'accept_kvkk': True,
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('tursab_no', response.data)

        agency.tursab_no = '12345'
        agency.tursab_group = 'A'
        agency.tursab_document = SimpleUploadedFile('tursab.pdf', b'fake', content_type='application/pdf')
        agency.save()

        response = self.client.post('/api/v1/agencies/onboarding/submit/', {
            'accept_contract': True, 'accept_kvkk': True,
        })
        self.assertEqual(response.status_code, 200, response.data)
        agency.refresh_from_db()
        self.assertEqual(agency.status, 'beklemede')

    def test_unverified_agency_cannot_create_tour(self):
        self._authenticate_after_start()
        response = self.client.post('/api/v1/agency/tours/', {'title': 'Yeni Tur', 'price': 100})
        self.assertEqual(response.status_code, 403)


class AgencyTourCrudTestCase(TestCase):
    """F2-01 — Acenta panelinden tur CRUD'u."""

    BASE = {
        'title': 'Pamukkale Günübirlik Turu', 'location': 'Denizli', 'price': 500,
        'duration': '1 Gün', 'guide': 'Türkçe', 'description': 'Açıklama',
        'category': 'Doğa',
    }

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username='ag_owner', password='pass')
        self.agency = Agency.objects.create(
            owner=self.owner, name='Test Acenta', status='onaylandi', is_verified=True, is_active=True
        )
        self.client.force_authenticate(user=self.owner)

    def _create(self, **overrides):
        return self.client.post('/api/v1/agency/tours/', {**self.BASE, **overrides}, format='json')

    def test_create_generates_slug_and_availability(self):
        """Slug başlıktan üretilir (Türkçe karakterler çevrilir) ve 90 günlük takvim açılır"""
        response = self._create(default_capacity=15)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['id'], 'pamukkale-gunubirlik-turu')

        from tours.models import TourAvailability
        slots = TourAvailability.objects.filter(tour_id='pamukkale-gunubirlik-turu')
        self.assertEqual(slots.count(), 90)
        self.assertEqual(slots.first().max_capacity, 15)

    def test_duplicate_title_gets_unique_slug(self):
        first = self._create()
        second = self._create()
        self.assertEqual(second.status_code, 201, second.data)
        self.assertNotEqual(first.data['id'], second.data['id'])
        self.assertTrue(second.data['id'].startswith('pamukkale-gunubirlik-turu-'))

    def test_agency_cannot_fabricate_social_proof(self):
        """Puan / yorum sayısı acenta tarafından yazılamaz"""
        response = self._create(reviews_count=9999)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['reviews_count'], 0)

        slug = response.data['id']
        patched = self.client.patch(f'/api/v1/agency/tours/{slug}/', {'rating': 5.0}, format='json')
        self.assertEqual(patched.status_code, 400)

    def test_patch_allows_whitelisted_fields(self):
        slug = self._create().data['id']
        response = self.client.patch(
            f'/api/v1/agency/tours/{slug}/', {'title': 'Yeni Başlık', 'price': 777}, format='json'
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['title'], 'Yeni Başlık')

    def test_list_returns_capacity_summary_and_draft_status(self):
        self._create(default_capacity=10)
        response = self.client.get('/api/v1/agency/tours/')
        self.assertEqual(response.status_code, 200)
        row = response.data['results'][0]
        self.assertEqual(row['capacity_total'], 900)  # 90 gün x 10
        self.assertEqual(row['booked_total'], 0)
        self.assertFalse(row['is_published'])  # görsel yok → taslak

    def test_delete_detaches_tour_from_agency(self):
        slug = self._create().data['id']
        self.assertEqual(self.client.delete(f'/api/v1/agency/tours/{slug}/').status_code, 200)
        self.assertEqual(self.client.get('/api/v1/agency/tours/').data['count'], 0)

    def test_other_agency_cannot_see_or_edit(self):
        """A acentesi B'nin turunu görüntüleyemez ve düzenleyemez"""
        slug = self._create().data['id']

        intruder = User.objects.create_user(username='intruder_ag', password='pass')
        Agency.objects.create(owner=intruder, name='Rakip Acenta', status='onaylandi', is_verified=True, is_active=True)
        other = APIClient()
        other.force_authenticate(user=intruder)

        self.assertEqual(other.get('/api/v1/agency/tours/').data['count'], 0)
        self.assertEqual(
            other.patch(f'/api/v1/agency/tours/{slug}/', {'price': 1}, format='json').status_code, 404
        )
        self.assertEqual(other.delete(f'/api/v1/agency/tours/{slug}/').status_code, 404)

    def test_anonymous_cannot_list(self):
        anon = APIClient()
        self.assertEqual(anon.get('/api/v1/agency/tours/').status_code, 401)

    def test_created_tour_appears_in_public_catalog_after_image_upload(self):
        """Panelden eklenen tur, görseli yüklendikten sonra genel katalogda görünür"""
        import io
        from PIL import Image as PILImage
        from django.core.files.uploadedfile import SimpleUploadedFile

        slug = self._create().data['id']

        anon = APIClient()
        self.assertNotIn(slug, [t['id'] for t in anon.get('/api/v1/tours/').data['results']])

        buffer = io.BytesIO()
        PILImage.new('RGB', (64, 64), 'red').save(buffer, format='JPEG')
        upload = self.client.post(
            f'/api/v1/agency/tours/{slug}/upload-image/',
            {'image': SimpleUploadedFile('t.jpg', buffer.getvalue(), content_type='image/jpeg'),
             'field': 'image_main'},
            format='multipart',
        )
        self.assertEqual(upload.status_code, 200, upload.data)

        self.assertIn(slug, [t['id'] for t in anon.get('/api/v1/tours/').data['results']])
        self.assertEqual(anon.get(f'/api/v1/tours/{slug}/').status_code, 200)
        self.assertTrue(self.client.get('/api/v1/agency/tours/').data['results'][0]['is_published'])


class AgencyAvailabilityCalendarTestCase(TestCase):
    """F2-02 — Kontenjan takvim editörü uçları."""

    def setUp(self):
        from tours.models import Tour, TourAvailability
        self.TourAvailability = TourAvailability

        self.client = APIClient()
        self.owner = User.objects.create_user(username='cal_owner', password='pass')
        self.agency = Agency.objects.create(
            owner=self.owner, name='Cal Acenta', status='onaylandi', is_verified=True, is_active=True
        )
        self.tour = Tour.objects.create(
            id='cal-tour', agency=self.agency, title='Cal Tour', location='Fethiye',
            price=800, duration='1 Gün', guide='Türkçe', description='d',
            category='doga', image_main='https://example.com/i.jpg',
        )
        self.day = date(2026, 9, 10)
        self.slot = TourAvailability.objects.create(
            tour=self.tour, date=self.day, max_capacity=20, booked_count=4
        )
        self.client.force_authenticate(user=self.owner)

    URL = '/api/v1/agency/tours/cal-tour/availability/'

    def test_get_returns_month_days(self):
        response = self.client.get(f'{self.URL}?month=2026-09')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['month'], '2026-09')
        self.assertEqual(len(response.data['days']), 1)
        self.assertEqual(response.data['days'][0]['booked_count'], 4)

    def test_get_rejects_bad_month(self):
        self.assertEqual(self.client.get(f'{self.URL}?month=2026').status_code, 400)

    def test_bulk_put_creates_and_updates(self):
        response = self.client.put(self.URL, {'days': [
            {'date': '2026-09-10', 'max_capacity': 30, 'price_override': '999.50', 'is_closed': False},
            {'date': '2026-09-11', 'max_capacity': 5, 'price_override': None, 'is_closed': True},
        ]}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

        self.slot.refresh_from_db()
        self.assertEqual(self.slot.max_capacity, 30)
        self.assertEqual(str(self.slot.price_override), '999.50')

        created = self.TourAvailability.objects.get(tour=self.tour, date=date(2026, 9, 11))
        self.assertTrue(created.is_closed)
        self.assertIsNone(created.price_override)

    def test_bulk_put_rejects_quota_below_sold(self):
        """Satılan bilet sayısının altına düşürme reddedilir; hiçbir gün yazılmaz"""
        response = self.client.put(self.URL, {'days': [
            {'date': '2026-09-12', 'max_capacity': 40, 'price_override': None, 'is_closed': False},
            {'date': '2026-09-10', 'max_capacity': 3, 'price_override': None, 'is_closed': False},
        ]}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('conflicts', response.data)

        self.slot.refresh_from_db()
        self.assertEqual(self.slot.max_capacity, 20)  # değişmedi
        self.assertFalse(
            self.TourAvailability.objects.filter(tour=self.tour, date=date(2026, 9, 12)).exists()
        )

    def test_bulk_put_validates_payload(self):
        for payload, label in [
            ({'days': []}, 'boş liste'),
            ({'days': [{'date': 'yarın', 'max_capacity': 5}]}, 'bozuk tarih'),
            ({'days': [{'date': '2026-09-10', 'max_capacity': -1}]}, 'negatif kontenjan'),
            ({'days': [{'date': '2026-09-10', 'max_capacity': 5, 'price_override': -5}]}, 'negatif fiyat'),
            ({'days': [{'date': '2026-09-11', 'max_capacity': 5},
                       {'date': '2026-09-11', 'max_capacity': 6}]}, 'tekrarlı tarih'),
        ]:
            with self.subTest(label):
                self.assertEqual(self.client.put(self.URL, payload, format='json').status_code, 400)

    def test_other_agency_cannot_read_or_write_calendar(self):
        intruder = User.objects.create_user(username='cal_intruder', password='pass')
        Agency.objects.create(owner=intruder, name='Rakip', status='onaylandi', is_verified=True, is_active=True)
        other = APIClient()
        other.force_authenticate(user=intruder)

        self.assertEqual(other.get(self.URL).status_code, 404)
        self.assertEqual(
            other.put(self.URL, {'days': [{'date': '2026-09-10', 'max_capacity': 1}]},
                      format='json').status_code, 404
        )

    def test_anonymous_cannot_access_calendar(self):
        self.assertEqual(APIClient().get(self.URL).status_code, 401)


class AgencyBookingsTestCase(TestCase):
    """F2-03 — Acenta rezervasyon listesi, manifest ve no-show."""

    def setUp(self):
        from tours.models import Tour
        from bookings.models import Booking
        self.Booking = Booking

        self.client = APIClient()
        self.owner = User.objects.create_user(username='bk_owner', password='pass')
        self.agency = Agency.objects.create(
            owner=self.owner, name='BK Acenta', status='onaylandi', is_verified=True, is_active=True
        )
        self.tour = Tour.objects.create(
            id='bk-tour', agency=self.agency, title='BK Tour', location='Antalya',
            price=500, duration='1 Gün', guide='Türkçe', description='d',
            category='doga', image_main='https://example.com/i.jpg',
        )
        self.customer = User.objects.create_user(
            username='bk_customer', password='pass', email='c@test.com', first_name='Ada'
        )
        self.day = date(2026, 10, 5)
        self.booking = Booking.objects.create(
            user=self.customer, tour=self.tour, start_date=self.day, guests=2,
            total_price=1000, booking_ref='BK000001', status='confirmed',
            guest_full_name='Ada Yolcu', guest_phone='+905551112233',
            guest_hotel='Otel Deniz',
        )
        self.pending = Booking.objects.create(
            user=self.customer, tour=self.tour, start_date=self.day, guests=1,
            total_price=500, booking_ref='BK000002', status='pending',
        )

        # Başka acenta + onun rezervasyonu (izolasyon testi için)
        self.rival_owner = User.objects.create_user(username='bk_rival', password='pass')
        self.rival_agency = Agency.objects.create(
            owner=self.rival_owner, name='Rakip', status='onaylandi', is_verified=True, is_active=True
        )
        self.rival_tour = Tour.objects.create(
            id='rival-tour', agency=self.rival_agency, title='Rakip Tur', location='Kaş',
            price=400, duration='1 Gün', guide='Türkçe', description='d',
            category='doga', image_main='https://example.com/i.jpg',
        )
        self.rival_booking = Booking.objects.create(
            user=self.customer, tour=self.rival_tour, start_date=self.day, guests=3,
            total_price=1200, booking_ref='RIVAL001', status='confirmed',
        )

        self.client.force_authenticate(user=self.owner)

    URL = '/api/v1/agency/bookings/'

    def _refs(self, response):
        results = response.data.get('results', response.data)
        return {row['booking_ref'] for row in results}

    def test_list_shows_only_own_bookings(self):
        """İzolasyon: A acentesi B'nin rezervasyonunu göremez"""
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._refs(response), {'BK000001', 'BK000002'})

    def test_rival_cannot_read_or_patch_our_booking(self):
        other = APIClient()
        other.force_authenticate(user=self.rival_owner)
        self.assertNotIn('BK000001', self._refs(other.get(self.URL)))
        self.assertEqual(other.get(f'{self.URL}{self.booking.id}/').status_code, 404)
        self.assertEqual(
            other.patch(f'{self.URL}{self.booking.id}/', {'no_show': True},
                        format='json').status_code, 404
        )

    def test_anonymous_denied(self):
        self.assertEqual(APIClient().get(self.URL).status_code, 401)

    def test_filters(self):
        for params, expected in [
            ('?status=confirmed', {'BK000001'}),
            ('?date=2026-10-05', {'BK000001', 'BK000002'}),
            ('?date=2026-10-06', set()),
            ('?tour=bk-tour', {'BK000001', 'BK000002'}),
            ('?tour=rival-tour', set()),
            ('?q=BK000001', {'BK000001'}),
            ('?q=Ada Yolcu', {'BK000001'}),
        ]:
            with self.subTest(params):
                self.assertEqual(self._refs(self.client.get(f'{self.URL}{params}')), expected)

    def test_manifest_groups_confirmed_only(self):
        response = self.client.get(f'{self.URL}manifest/?date=2026-10-05')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total_pax'], 2)
        self.assertEqual(response.data['total_bookings'], 1)
        self.assertEqual(len(response.data['groups']), 1)

        group = response.data['groups'][0]
        self.assertEqual(group['service_id'], 'bk-tour')
        self.assertEqual(group['pax'], 2)
        passenger = group['passengers'][0]
        self.assertEqual(passenger['passenger'], 'Ada Yolcu')
        self.assertEqual(passenger['hotel'], 'Otel Deniz')
        # Rakip acentanın aynı gündeki rezervasyonu manifeste sızmamalı
        self.assertNotIn('RIVAL001', {p['booking_ref'] for p in group['passengers']})

    def test_manifest_requires_date(self):
        self.assertEqual(self.client.get(f'{self.URL}manifest/').status_code, 400)
        self.assertEqual(self.client.get(f'{self.URL}manifest/?date=abc').status_code, 400)

    def test_manifest_falls_back_to_account_details(self):
        """Misafir alanları boşsa hesabın kendi bilgileri gösterilir"""
        self.booking.guest_full_name = ''
        self.booking.guest_phone = ''
        self.booking.save(update_fields=['guest_full_name', 'guest_phone'])
        response = self.client.get(f'{self.URL}manifest/?date=2026-10-05')
        passenger = response.data['groups'][0]['passengers'][0]
        self.assertEqual(passenger['passenger'], 'Ada')
        self.assertEqual(passenger['phone'], '—')
        self.assertEqual(passenger['email'], 'c@test.com')

    def test_no_show_marking(self):
        response = self.client.patch(f'{self.URL}{self.booking.id}/',
                                     {'no_show': True}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.booking.refresh_from_db()
        self.assertTrue(self.booking.no_show)

    def test_no_show_only_for_confirmed(self):
        response = self.client.patch(f'{self.URL}{self.pending.id}/',
                                     {'no_show': True}, format='json')
        self.assertEqual(response.status_code, 400)
        self.pending.refresh_from_db()
        self.assertFalse(self.pending.no_show)

    def test_patch_rejects_other_fields(self):
        """Mass assignment: no_show dışındaki hiçbir alan yazılamaz"""
        for payload in [
            {'status': 'cancelled'},
            {'total_price': '1'},
            {'guests': 99},
            {'no_show': True, 'total_price': '1'},
        ]:
            with self.subTest(payload):
                response = self.client.patch(f'{self.URL}{self.booking.id}/',
                                             payload, format='json')
                self.assertEqual(response.status_code, 400)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'confirmed')
        self.assertEqual(self.booking.guests, 2)
        self.assertFalse(self.booking.no_show)

    def test_put_not_allowed(self):
        response = self.client.put(f'{self.URL}{self.booking.id}/',
                                   {'no_show': True}, format='json')
        self.assertEqual(response.status_code, 405)


class CheckinTestCase(TestCase):
    """F2-05 — Bilet doğrulama (check-in) uç noktası."""

    URL = '/api/v1/agency/bookings/'

    def setUp(self):
        from tours.models import Tour
        from bookings.models import Booking
        self.Booking = Booking

        self.today = timezone.localdate()
        self.client = APIClient()

        self.owner = User.objects.create_user(username='ci_owner', password='pass')
        self.agency = Agency.objects.create(
            owner=self.owner, name='CI Acenta', status='onaylandi', is_verified=True, is_active=True
        )
        self.tour = Tour.objects.create(
            id='ci-tour', agency=self.agency, title='CI Tour', location='Antalya',
            price=500, duration='1 Gün', guide='Türkçe', description='d',
            category='doga', image_main='https://example.com/i.jpg',
        )
        self.customer = User.objects.create_user(username='ci_customer', password='pass')

        self.booking = Booking.objects.create(
            user=self.customer, tour=self.tour, start_date=self.today, guests=2,
            total_price=1000, booking_ref='CI000001', status='confirmed',
            guest_full_name='Ada Yolcu',
        )
        self.pending = Booking.objects.create(
            user=self.customer, tour=self.tour, start_date=self.today, guests=1,
            total_price=500, booking_ref='CI000002', status='pending',
        )
        self.tomorrow = Booking.objects.create(
            user=self.customer, tour=self.tour, start_date=self.today + timedelta(days=1),
            guests=1, total_price=500, booking_ref='CI000003', status='confirmed',
        )

        # Rakip acenta + onun bugün geçerli bileti
        self.rival_owner = User.objects.create_user(username='ci_rival', password='pass')
        self.rival_agency = Agency.objects.create(
            owner=self.rival_owner, name='CI Rakip', status='onaylandi', is_verified=True, is_active=True
        )
        self.rival_tour = Tour.objects.create(
            id='ci-rival-tour', agency=self.rival_agency, title='Rakip Tur', location='Kaş',
            price=400, duration='1 Gün', guide='Türkçe', description='d',
            category='doga', image_main='https://example.com/i.jpg',
        )
        self.rival_booking = Booking.objects.create(
            user=self.customer, tour=self.rival_tour, start_date=self.today, guests=1,
            total_price=400, booking_ref='CIRIVAL1', status='confirmed',
        )

        self.client.force_authenticate(user=self.owner)

    def _checkin(self, ref, client=None):
        return (client or self.client).post(f'{self.URL}{ref}/checkin/')

    def test_first_scan_succeeds(self):
        response = self._checkin('CI000001')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['reason'], 'ok')
        self.assertEqual(response.data['booking']['booking_ref'], 'CI000001')
        self.booking.refresh_from_db()
        self.assertIsNotNone(self.booking.checked_in_at)

    def test_second_scan_reports_already_checked_in(self):
        self.assertEqual(self._checkin('CI000001').status_code, 200)
        first_time = self.Booking.objects.get(pk=self.booking.pk).checked_in_at

        response = self._checkin('CI000001')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['reason'], 'already_checked_in')
        self.assertIn('zaten okutulmuş', response.data['error'])
        # İlk okutma anı korunur; ikinci okutma zaman damgasını ezmez.
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.checked_in_at, first_time)

    def test_rival_ticket_is_not_found(self):
        """Başka acentanın bileti okutulursa varlığı bile sızmaz."""
        response = self._checkin('CIRIVAL1')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data['reason'], 'not_found')
        self.assertNotIn('booking', response.data)
        self.rival_booking.refresh_from_db()
        self.assertIsNone(self.rival_booking.checked_in_at)

    def test_unknown_ref_is_not_found(self):
        response = self._checkin('YOKBOYLE')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data['reason'], 'not_found')

    def test_unconfirmed_booking_is_rejected(self):
        response = self._checkin('CI000002')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['reason'], 'not_confirmed')
        self.pending.refresh_from_db()
        self.assertIsNone(self.pending.checked_in_at)

    def test_wrong_date_is_rejected(self):
        response = self._checkin('CI000003')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['reason'], 'wrong_date')
        self.tomorrow.refresh_from_db()
        self.assertIsNone(self.tomorrow.checked_in_at)

    def test_checkin_clears_no_show(self):
        self.booking.no_show = True
        self.booking.save(update_fields=['no_show'])
        self.assertEqual(self._checkin('CI000001').status_code, 200)
        self.booking.refresh_from_db()
        self.assertFalse(self.booking.no_show)

    def test_ref_is_case_and_space_insensitive(self):
        response = self._checkin('%20ci000001%20')
        self.assertEqual(response.status_code, 200, response.data)
        self.booking.refresh_from_db()
        self.assertIsNotNone(self.booking.checked_in_at)

    def test_anonymous_cannot_checkin(self):
        response = self._checkin('CI000001', client=APIClient())
        self.assertEqual(response.status_code, 401)
        self.booking.refresh_from_db()
        self.assertIsNone(self.booking.checked_in_at)

    def test_unapproved_agency_cannot_checkin(self):
        self.agency.status = 'beklemede'
        self.agency.save(update_fields=['status'])
        self.assertEqual(self._checkin('CI000001').status_code, 403)
        self.booking.refresh_from_db()
        self.assertIsNone(self.booking.checked_in_at)


class AdminApplicationActionsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.owner = User.objects.create_user(username='owner', password='pass', email='owner@test.com')
        self.agency = Agency.objects.create(owner=self.owner, name='Pending Co', status='beklemede', business_type='restoran')
        self.client.force_authenticate(user=self.admin)

    def test_approve_sets_status_and_verified(self):
        response = self.client.post(f'/api/v1/admin/agencies/{self.agency.id}/approve/')
        self.assertEqual(response.status_code, 200)
        self.agency.refresh_from_db()
        self.assertEqual(self.agency.status, 'onaylandi')
        self.assertTrue(self.agency.is_verified)

    def test_reject_requires_reason(self):
        response = self.client.post(f'/api/v1/admin/agencies/{self.agency.id}/reject/', {})
        self.assertEqual(response.status_code, 400)

        response = self.client.post(f'/api/v1/admin/agencies/{self.agency.id}/reject/', {'reason': 'Eksik belge'})
        self.assertEqual(response.status_code, 200)
        self.agency.refresh_from_db()
        self.assertEqual(self.agency.status, 'reddedildi')
        self.assertEqual(self.agency.rejection_reason, 'Eksik belge')

    def test_request_more_info_requires_message(self):
        response = self.client.post(f'/api/v1/admin/agencies/{self.agency.id}/request-more-info/', {})
        self.assertEqual(response.status_code, 400)

        response = self.client.post(f'/api/v1/admin/agencies/{self.agency.id}/request-more-info/', {'message': 'IBAN eksik'})
        self.assertEqual(response.status_code, 200)
        self.agency.refresh_from_db()
        self.assertEqual(self.agency.status, 'eksik_bilgi')

    def test_reject_and_more_info_clear_verified_flag(self):
        """Onaylı bir acenta sonradan reddedilirse yetkisi de düşmeli."""
        self.agency.status = 'onaylandi'
        self.agency.is_verified = True
        self.agency.save(update_fields=['status', 'is_verified'])

        self.client.post(f'/api/v1/admin/agencies/{self.agency.id}/reject/', {'reason': 'Belge sahte'})
        self.agency.refresh_from_db()
        self.assertFalse(self.agency.is_verified)

        self.client.post(f'/api/v1/admin/agencies/{self.agency.id}/request-more-info/', {'message': 'Yeni belge'})
        self.agency.refresh_from_db()
        self.assertEqual(self.agency.status, 'eksik_bilgi')
        self.assertFalse(self.agency.is_verified)

    def test_more_info_reopens_editing_then_resubmit_returns_to_pending(self):
        """eksik_bilgi → partner düzenleyip tekrar gönderebilir (uçtan uca)."""
        self.client.post(f'/api/v1/admin/agencies/{self.agency.id}/request-more-info/', {'message': 'IBAN eksik'})

        partner = APIClient()
        partner.force_authenticate(user=self.owner)

        # Eksik bilgi durumunda düzenleme yeniden açılır
        response = partner.patch('/api/v1/agencies/onboarding/', {'bank_name': 'Ziraat'}, format='json')
        self.assertEqual(response.status_code, 200)

        # Kalan eksikler kullanıcıya açıkça bildirilir
        missing = partner.get('/api/v1/agencies/onboarding/').data['missing_fields']
        self.assertIn('iban', missing)

        # Eksikler tamamlanmadan gönderim reddedilir
        response = partner.post('/api/v1/agencies/onboarding/submit/', {
            'accept_contract': True, 'accept_kvkk': True,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('iban', response.data)


class PartnerGatingTestCase(TestCase):
    """
    F2-04 — onboarding durum kapısı.

    Onaylanmamış bir partner token'ı ile acenta/işletme paneli uçlarının
    tamamı 403 döner; yalnızca onboarding uçları açık kalır.
    """

    PANEL_ENDPOINTS = [
        ('get', '/api/v1/agency/tours/'),
        ('post', '/api/v1/agency/tours/'),
        ('get', '/api/v1/agency/shuttles/'),
        ('get', '/api/v1/agency/bookings/'),
        ('get', '/api/v1/agency/finance/summary/'),
        ('get', '/api/v1/agency/finance/ledger/'),
        ('post', '/api/v1/agency/finance/payout-request/'),
        ('get', '/api/v1/agencies/dashboard/'),
        ('get', '/api/v1/menus/'),
        ('post', '/api/v1/menus/'),
        ('get', '/api/v1/restaurant/daily-stats/'),
        ('get', '/api/v1/restaurant/reservations/'),
    ]

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username='gate-owner', password='pass', email='gate@test.com')
        self.agency = Agency.objects.create(
            owner=self.owner, name='Gate Co', business_type='her_ikisi',
            legal_entity_type='individual', status='beklemede', is_verified=False,
        )
        self.client.force_authenticate(user=self.owner)

    def _assert_all(self, expected_status):
        for method, url in self.PANEL_ENDPOINTS:
            with self.subTest(endpoint=f'{method.upper()} {url}'):
                response = getattr(self.client, method)(url, {}, format='json')
                self.assertEqual(response.status_code, expected_status)

    def test_pending_agency_is_blocked_everywhere(self):
        self._assert_all(403)

    def test_read_only_requests_are_blocked_too(self):
        """
        Eski `IsVerifiedAgent` SAFE_METHODS'a izin veriyordu; onaysız hesap
        panel verisini GET'leyebiliyordu. Regresyon koruması.
        """
        for status_value in ('taslak', 'inceleniyor', 'reddedildi', 'eksik_bilgi'):
            with self.subTest(status=status_value):
                Agency.objects.filter(pk=self.agency.pk).update(status=status_value)
                response = self.client.get('/api/v1/agency/tours/')
                self.assertEqual(response.status_code, 403)

    def test_approved_agency_passes_the_gate(self):
        Agency.objects.filter(pk=self.agency.pk).update(status='onaylandi', is_verified=True)
        for url in ('/api/v1/agency/tours/', '/api/v1/agency/bookings/',
                    '/api/v1/agency/finance/summary/', '/api/v1/agencies/dashboard/',
                    '/api/v1/menus/'):
            with self.subTest(endpoint=url):
                self.assertEqual(self.client.get(url).status_code, 200)

    def test_deactivated_agency_is_blocked_even_if_approved(self):
        Agency.objects.filter(pk=self.agency.pk).update(
            status='onaylandi', is_verified=True, is_active=False,
        )
        self.assertEqual(self.client.get('/api/v1/agency/tours/').status_code, 403)

    def test_legacy_verified_flag_alone_does_not_open_the_gate(self):
        """`is_verified` eski bayrak; tek başına yetki vermemeli — kaynak `status`."""
        Agency.objects.filter(pk=self.agency.pk).update(status='taslak', is_verified=True)
        self.assertEqual(self.client.get('/api/v1/agency/tours/').status_code, 403)

    def test_onboarding_endpoints_stay_open_while_blocked(self):
        """Kapı kapalıyken başvuruya devam edebilmek şart, aksi halde kilitlenme olur."""
        Agency.objects.filter(pk=self.agency.pk).update(status='eksik_bilgi')
        self.assertEqual(self.client.get('/api/v1/agencies/onboarding/').status_code, 200)
        self.assertEqual(self.client.get('/api/v1/agencies/my-profile/').status_code, 200)
        response = self.client.patch('/api/v1/agencies/onboarding/', {'city': 'Nevsehir'}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_user_without_agency_is_blocked(self):
        outsider = User.objects.create_user(username='outsider', password='pass')
        self.client.force_authenticate(user=outsider)
        self._assert_all(403)


class MissingFieldsTestCase(TestCase):
    """`collect_missing_fields` — panelin eksik alan listesi ile gönderim doğrulaması tek kaynak."""

    def setUp(self):
        self.client = APIClient()

    def _agency(self, **kwargs):
        owner = User.objects.create_user(username=kwargs.pop('username'), password='pass')
        defaults = dict(
            owner=owner, name='X', legal_entity_type='individual', status='taslak',
            tax_id='12345678901', tax_office='Merkez', description='a' * 60,
            city='Nevsehir', address='Adres 1', iban='TR' + '1' * 24,
            bank_account_holder='X Y', bank_name='Ziraat',
        )
        defaults.update(kwargs)
        return Agency.objects.create(**defaults)

    def test_restaurant_is_exempt_from_tursab(self):
        agency = self._agency(username='resto', business_type='restoran')
        agency.logo = 'agencies/logos/x.png'
        agency.save(update_fields=['logo'])

        self.client.force_authenticate(user=agency.owner)
        missing = self.client.get('/api/v1/agencies/onboarding/').data['missing_fields']
        self.assertEqual(missing, {})

        response = self.client.post('/api/v1/agencies/onboarding/submit/', {
            'accept_contract': True, 'accept_kvkk': True,
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        agency.refresh_from_db()
        self.assertEqual(agency.status, 'beklemede')

    def test_travel_agency_requires_tursab(self):
        agency = self._agency(username='acenta', business_type='acenta')
        agency.logo = 'agencies/logos/x.png'
        agency.save(update_fields=['logo'])

        self.client.force_authenticate(user=agency.owner)
        missing = self.client.get('/api/v1/agencies/onboarding/').data['missing_fields']
        self.assertEqual(set(missing), {'tursab_no', 'tursab_group', 'tursab_document'})

        response = self.client.post('/api/v1/agencies/onboarding/submit/', {
            'accept_contract': True, 'accept_kvkk': True,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data), set(missing))

    def test_company_requires_trade_registry_document(self):
        agency = self._agency(username='sirket', business_type='restoran', legal_entity_type='company')
        agency.logo = 'agencies/logos/x.png'
        agency.save(update_fields=['logo'])

        self.client.force_authenticate(user=agency.owner)
        missing = self.client.get('/api/v1/agencies/onboarding/').data['missing_fields']
        self.assertIn('trade_registry_document', missing)
