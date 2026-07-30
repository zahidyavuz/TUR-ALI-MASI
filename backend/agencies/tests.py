from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
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
            owner=self.owner, name='Test Acenta', is_verified=True, is_active=True
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
        Agency.objects.create(owner=intruder, name='Rakip Acenta', is_verified=True, is_active=True)
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
            owner=self.owner, name='Cal Acenta', is_verified=True, is_active=True
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
        Agency.objects.create(owner=intruder, name='Rakip', is_verified=True, is_active=True)
        other = APIClient()
        other.force_authenticate(user=intruder)

        self.assertEqual(other.get(self.URL).status_code, 404)
        self.assertEqual(
            other.put(self.URL, {'days': [{'date': '2026-09-10', 'max_capacity': 1}]},
                      format='json').status_code, 404
        )

    def test_anonymous_cannot_access_calendar(self):
        self.assertEqual(APIClient().get(self.URL).status_code, 401)


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
