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
