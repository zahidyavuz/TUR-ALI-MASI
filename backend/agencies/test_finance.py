"""
agencies/test_finance.py
------------------------
Acenta finans uçları (F2-07) testleri.

Kapsam: bakiye tutarlılığı, ledger filtreleri, CSV ekstre, hakediş talebi
(tutar doğrulaması, IBAN kaynağı, çift talep), izolasyon ve yetki.
"""
import json
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from agencies.finance_models import AgentFinanceLedger, AgentPayoutRequest
from agencies.finance_views import mask_iban
from agencies.models import Agency
from bookings.models import Booking
from tours.models import Tour

SUMMARY_URL = '/api/v1/agency/finance/summary/'
LEDGER_URL = '/api/v1/agency/finance/ledger/'
EXPORT_URL = '/api/v1/agency/finance/export/'
PAYOUT_URL = '/api/v1/agency/finance/payout-request/'

VALID_IBAN = 'TR' + '1' * 24


def response_text(payload):
    """Yanıt gövdesinin tamamını düz metne çevirir (sızıntı kontrolü için)."""
    return json.dumps(payload)


class FinanceTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username='fin_owner', password='pw')
        self.agency = Agency.objects.create(
            owner=self.owner, name='Fin Acenta', status='onaylandi', is_verified=True,
            commission_rate=Decimal('10.00'), iban=VALID_IBAN,
            bank_account_holder='Fin Turizm Ltd.', bank_name='Ziraat Bankası',
        )
        self.tour = Tour.objects.create(
            id='fin-tour', agency=self.agency, title='Fin Tour', location='Antalya',
            price=1000, duration='1 Day', guide='Turkish', description='d', category='nature',
        )
        self.customer = User.objects.create_user(username='fin_customer', password='pw')
        self.client.force_authenticate(user=self.owner)

    def _booking(self, ref, price='2000.00'):
        return Booking.objects.create(
            user=self.customer, tour=self.tour, booking_ref=ref, status='confirmed',
            start_date=date.today() + timedelta(days=5), guests=2,
            total_price=Decimal(price),
        )

    def _sale(self, ref, price='2000.00'):
        booking = self._booking(ref, price)
        AgentFinanceLedger.create_from_booking(booking)
        return booking


class MaskIbanTestCase(TestCase):
    def test_masks_middle(self):
        self.assertEqual(mask_iban('TR330006100519786457841326'), 'TR33 •••• 1326')

    def test_ignores_spaces(self):
        self.assertEqual(mask_iban('TR33 0006 1005 1978 6457 8413 26'), 'TR33 •••• 1326')

    def test_none_stays_none(self):
        self.assertIsNone(mask_iban(None))
        self.assertIsNone(mask_iban(''))

    def test_short_value_returned_as_is(self):
        # Maskeleme uzunluk varsayımı yapmamalı; bozuk kısa bir değerde
        # negatif dilimleme ile anlamsız çıktı üretmemeli.
        self.assertEqual(mask_iban('TR123'), 'TR123')


class FinanceSummaryTestCase(FinanceTestBase):
    def test_summary_matches_ledger_totals(self):
        self._sale('FIN00001')
        self._sale('FIN00002', '1000.00')

        response = self.client.get(SUMMARY_URL)
        self.assertEqual(response.status_code, 200)
        body = response.json()

        self.assertEqual(body['summary']['total_gross'], 3000.0)
        self.assertEqual(body['summary']['total_commission'], 300.0)
        self.assertEqual(body['summary']['total_net'], 2700.0)
        self.assertEqual(body['summary']['total_transactions'], 2)
        self.assertEqual(body['balance']['available'], 2700.0)
        self.assertEqual(body['commission_rate'], 10.0)

    def test_refund_reduces_available_balance(self):
        booking = self._sale('FIN00003')
        AgentFinanceLedger.create_refund_entry(booking)

        body = self.client.get(SUMMARY_URL).json()
        self.assertEqual(body['balance']['available'], 0.0)

    def test_pending_request_is_subtracted(self):
        self._sale('FIN00004')
        AgentPayoutRequest.objects.create(
            agency=self.agency, amount=Decimal('800.00'), status='pending',
        )
        body = self.client.get(SUMMARY_URL).json()
        self.assertEqual(body['balance']['pending_payout'], 800.0)
        self.assertEqual(body['balance']['available'], 1000.0)
        self.assertEqual(body['pending_request']['amount'], 800.0)

    def test_paid_request_is_subtracted(self):
        self._sale('FIN00005')
        AgentPayoutRequest.objects.create(
            agency=self.agency, amount=Decimal('1800.00'), status='paid',
        )
        body = self.client.get(SUMMARY_URL).json()
        self.assertEqual(body['balance']['paid_out'], 1800.0)
        self.assertEqual(body['balance']['available'], 0.0)

    def test_bank_account_iban_is_masked(self):
        body = self.client.get(SUMMARY_URL).json()
        self.assertEqual(body['bank_account']['iban_masked'], 'TR11 •••• 1111')
        # Tam IBAN yanıtın hiçbir yerinde geçmemeli.
        self.assertNotIn(VALID_IBAN, response_text(body))
        self.assertTrue(body['bank_account']['is_complete'])

    def test_bank_incomplete_flag(self):
        self.agency.iban = None
        self.agency.save(update_fields=['iban'])
        body = self.client.get(SUMMARY_URL).json()
        self.assertFalse(body['bank_account']['is_complete'])
        self.assertIsNone(body['bank_account']['iban_masked'])

    def test_anonymous_denied(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(SUMMARY_URL).status_code, 401)

    def test_unapproved_agency_denied(self):
        self.agency.status = 'beklemede'
        self.agency.is_verified = False
        self.agency.save(update_fields=['status', 'is_verified'])
        self.assertEqual(self.client.get(SUMMARY_URL).status_code, 403)


class FinanceLedgerTestCase(FinanceTestBase):
    def test_lists_own_entries(self):
        self._sale('FIN00010')
        body = self.client.get(LEDGER_URL).json()
        self.assertEqual(body['count'], 1)
        self.assertEqual(body['results'][0]['booking_ref'], 'FIN00010')
        self.assertEqual(body['results'][0]['entry_type_label'], 'Satış Hakedişi')

    def test_other_agency_entries_are_invisible(self):
        rival_owner = User.objects.create_user(username='rival_fin', password='pw')
        rival = Agency.objects.create(
            owner=rival_owner, name='Rakip', status='onaylandi', is_verified=True,
        )
        AgentFinanceLedger.objects.create(
            agency=rival, booking_ref='RIVAL001', tour_title='Rakip Tur',
            gross_amount=Decimal('500'), commission_rate=Decimal('10'),
            commission_amount=Decimal('50'), net_amount=Decimal('450'),
        )
        self._sale('FIN00011')

        body = self.client.get(LEDGER_URL).json()
        refs = [e['booking_ref'] for e in body['results']]
        self.assertEqual(refs, ['FIN00011'])

    def test_type_filter(self):
        booking = self._sale('FIN00012')
        AgentFinanceLedger.create_refund_entry(booking)

        sales = self.client.get(f'{LEDGER_URL}?type=sale').json()
        self.assertEqual(sales['count'], 1)
        self.assertEqual(sales['results'][0]['entry_type'], 'sale')

        refunds = self.client.get(f'{LEDGER_URL}?type=refund').json()
        self.assertEqual(refunds['count'], 1)
        self.assertLess(refunds['results'][0]['net_amount'], 0)

    def test_invalid_type_rejected(self):
        # Sessizce yok sayılırsa acenta filtrelenmiş sandığı tam listeyi görür.
        response = self.client.get(f'{LEDGER_URL}?type=hediye')
        self.assertEqual(response.status_code, 400)

    def test_month_filter(self):
        self._sale('FIN00013')
        today = date.today()
        current = self.client.get(f'{LEDGER_URL}?month={today.year}-{today.month:02d}').json()
        self.assertEqual(current['count'], 1)

        other = self.client.get(f'{LEDGER_URL}?month=2001-01').json()
        self.assertEqual(other['count'], 0)

    def test_invalid_month_rejected(self):
        for bad in ['2026', '2026-13', 'abc-de', '2026-ab']:
            self.assertEqual(
                self.client.get(f'{LEDGER_URL}?month={bad}').status_code, 400, bad,
            )


class FinanceExportTestCase(FinanceTestBase):
    def test_csv_contains_entries(self):
        self._sale('FIN00020')
        response = self.client.get(EXPORT_URL)

        self.assertEqual(response.status_code, 200)
        self.assertIn('text/csv', response['Content-Type'])
        self.assertIn('attachment;', response['Content-Disposition'])

        content = response.content.decode('utf-8')
        self.assertTrue(content.startswith('\ufeff'))  # Excel için BOM
        self.assertIn('FIN00020', content)
        self.assertIn('2000.00', content)
        self.assertIn(';', content)  # TR Excel ayırıcısı

    def test_export_respects_filters(self):
        booking = self._sale('FIN00021')
        AgentFinanceLedger.create_refund_entry(booking)

        content = self.client.get(f'{EXPORT_URL}?type=refund').content.decode('utf-8')
        self.assertIn('FIN00021-REFUND', content)
        # Satış satırı ("FIN00021;") ekstreye girmemeli.
        self.assertNotIn('FIN00021;', content)

    def test_export_isolated_by_agency(self):
        rival_owner = User.objects.create_user(username='rival_exp', password='pw')
        rival = Agency.objects.create(
            owner=rival_owner, name='Rakip2', status='onaylandi', is_verified=True,
        )
        AgentFinanceLedger.objects.create(
            agency=rival, booking_ref='RIVALEXP', tour_title='Rakip Tur',
            gross_amount=Decimal('500'), commission_rate=Decimal('10'),
            commission_amount=Decimal('50'), net_amount=Decimal('450'),
        )
        content = self.client.get(EXPORT_URL).content.decode('utf-8')
        self.assertNotIn('RIVALEXP', content)

    def test_invalid_month_rejected(self):
        self.assertEqual(self.client.get(f'{EXPORT_URL}?month=2026-99').status_code, 400)

    def test_anonymous_denied(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(EXPORT_URL).status_code, 401)


class PayoutRequestTestCase(FinanceTestBase):
    def test_full_balance_when_amount_omitted(self):
        self._sale('FIN00030')
        response = self.client.post(PAYOUT_URL, {}, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['amount'], 1800.0)
        self.assertEqual(response.data['iban_masked'], 'TR11 •••• 1111')

    def test_partial_amount_accepted(self):
        self._sale('FIN00031')
        response = self.client.post(PAYOUT_URL, {'amount': '500.00'}, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['amount'], 500.0)
        # Kalan bakiye talep edilebilir durumda kalmalı… ama bekleyen talep
        # olduğu için ikinci istek yine reddedilir (aşağıdaki test).
        body = self.client.get(SUMMARY_URL).json()
        self.assertEqual(body['balance']['available'], 1300.0)

    def test_amount_above_balance_rejected(self):
        self._sale('FIN00032')
        response = self.client.post(PAYOUT_URL, {'amount': '5000.00'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(AgentPayoutRequest.objects.exists())

    def test_zero_or_negative_amount_rejected(self):
        self._sale('FIN00033')
        for bad in ['0', '-100']:
            response = self.client.post(PAYOUT_URL, {'amount': bad}, format='json')
            self.assertEqual(response.status_code, 400, bad)
        self.assertFalse(AgentPayoutRequest.objects.exists())

    def test_non_numeric_amount_rejected(self):
        self._sale('FIN00034')
        response = self.client.post(PAYOUT_URL, {'amount': 'bedava'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_zero_balance_rejected(self):
        response = self.client.post(PAYOUT_URL, {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(AgentPayoutRequest.objects.exists())

    def test_refunded_balance_cannot_be_withdrawn(self):
        booking = self._sale('FIN00035')
        AgentFinanceLedger.create_refund_entry(booking)
        response = self.client.post(PAYOUT_URL, {}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_second_pending_request_rejected(self):
        self._sale('FIN00036')
        self.assertEqual(self.client.post(PAYOUT_URL, {}, format='json').status_code, 201)
        self.assertEqual(self.client.post(PAYOUT_URL, {}, format='json').status_code, 400)
        self.assertEqual(AgentPayoutRequest.objects.count(), 1)

    def test_iban_comes_from_profile_not_request_body(self):
        # İstek gövdesindeki IBAN yok sayılmalı; aksi halde panele erişen biri
        # hakedişi istediği hesaba yönlendirebilirdi.
        self._sale('FIN00037')
        self.client.post(PAYOUT_URL, {'iban': 'TR' + '9' * 24}, format='json')
        payout = AgentPayoutRequest.objects.get()
        self.assertEqual(payout.iban, VALID_IBAN)

    def test_missing_bank_account_blocks_request(self):
        self._sale('FIN00038')
        self.agency.iban = None
        self.agency.save(update_fields=['iban'])

        response = self.client.post(PAYOUT_URL, {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('banka', response.data['error'].lower())

    def test_history_lists_own_requests_with_masked_iban(self):
        self._sale('FIN00039')
        self.client.post(PAYOUT_URL, {}, format='json')

        body = self.client.get(PAYOUT_URL).json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]['status'], 'pending')
        self.assertEqual(body[0]['iban_masked'], 'TR11 •••• 1111')
        self.assertNotIn(VALID_IBAN, response_text(body))

    def test_history_isolated_by_agency(self):
        rival_owner = User.objects.create_user(username='rival_pay', password='pw')
        rival = Agency.objects.create(
            owner=rival_owner, name='Rakip3', status='onaylandi', is_verified=True,
        )
        AgentPayoutRequest.objects.create(agency=rival, amount=Decimal('999.00'))

        body = self.client.get(PAYOUT_URL).json()
        self.assertEqual(body, [])

    def test_anonymous_denied(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(PAYOUT_URL, {}, format='json').status_code, 401)

    def test_unapproved_agency_denied(self):
        self.agency.status = 'beklemede'
        self.agency.is_verified = False
        self.agency.save(update_fields=['status', 'is_verified'])
        self.assertEqual(self.client.post(PAYOUT_URL, {}, format='json').status_code, 403)
