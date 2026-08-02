"""
bookings/test_payments.py
-------------------------
PSP adapter katmanı (F2-06) testleri.

Kapsam:
  * Komisyon matematiği ve Decimal güvenliği (P0 float/Decimal hatası)
  * Sağlayıcı seçimi (`get_provider`)
  * Stripe adapter'ının webhook normalizasyonu ve yapılandırma kontrolü
  * iyzico iskeletinin sessizce başarılı görünmediği
  * Ledger'ın satış/iade kayıtları ve bakiyeye etkisi
"""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from agencies.finance_models import AgentFinanceLedger, AgentPayoutRequest
from agencies.models import Agency
from bookings.models import Booking
from bookings.payments import (
    IyzicoProvider,
    PaymentError,
    PaymentProvider,
    ProviderNotConfigured,
    StripeProvider,
    WebhookEvent,
    get_provider,
    to_decimal,
)
from tours.models import Tour
from datetime import date, timedelta


class BookingRefGenerationTestCase(TestCase):
    """
    T3-04: `booking_ref` PSP intent id'sinden değil, sunucuda çakışma
    kontrollü üretilir. Önceki türetim (intent id son 8 hane + upper) unique
    alanda çakışıp IntegrityError/500 riski taşıyordu.
    """

    def setUp(self):
        owner = User.objects.create_user(username='ref_owner', password='pw')
        agency = Agency.objects.create(
            owner=owner, name='Ref Acenta', status='onaylandi', is_verified=True,
        )
        self.tour = Tour.objects.create(
            id='ref-tour', agency=agency, title='Ref Tour', location='İzmir',
            price=100, duration='1 Day', guide='Turkish', description='d', category='nature',
        )
        self.user = User.objects.create_user(username='ref_customer', password='pw')

    def _booking(self, ref):
        return Booking.objects.create(
            user=self.user, tour=self.tour, booking_ref=ref, status='pending',
            start_date=date.today() + timedelta(days=3), guests=1,
            total_price=Decimal('100.00'),
        )

    def test_ref_has_expected_length_and_alphabet(self):
        ref = Booking.generate_unique_ref()
        self.assertEqual(len(ref), Booking.REF_LENGTH)
        self.assertTrue(set(ref) <= set(Booking.REF_ALPHABET))
        # Karışan karakterler dışlanmış olmalı.
        self.assertFalse(set(ref) & set('O0I1'))

    def test_ref_avoids_existing_value_on_collision(self):
        self._booking('AAAAAAAAAA')
        # İlk 10 seçim mevcut referansı üretsin (çakışma), sonraki 10 tazesini.
        seq = list('AAAAAAAAAA') + list('BBBBBBBBBB')
        with patch('bookings.models.secrets.choice', side_effect=seq):
            ref = Booking.generate_unique_ref()
        self.assertEqual(ref, 'BBBBBBBBBB')

    def test_raises_when_no_unique_ref_found(self):
        self._booking('AAAAAAAAAA')
        # Her seçim mevcut referansı üretirse benzersiz üretilemez → açık hata.
        with patch('bookings.models.secrets.choice', return_value='A'):
            with self.assertRaises(RuntimeError):
                Booking.generate_unique_ref()

    def test_intent_result_has_no_booking_ref_field(self):
        # Referans artık PSP sonucundan gelmediği için dataclass'ta alan yok.
        from bookings.payments.base import PaymentIntentResult
        result = PaymentIntentResult(provider='stripe', intent_id='pi_x', client_secret='sec')
        self.assertFalse(hasattr(result, 'booking_ref'))


class CommissionSplitTestCase(TestCase):
    """
    Komisyon hesabı tek yerde ve Decimal güvenli olmalı.

    Bu sınıfın varlık sebebi somut bir üretim hatası: `Agency.commission_rate`
    alanının varsayılanı `10.00` **float** literali olduğu için kaydedilmemiş
    Agency nesnelerinde oran float geliyordu ve `float / Decimal` TypeError
    veriyordu. Hata sinyal içinde yutulduğu için her ledger kaydı sessizce
    düşüyordu.
    """

    def test_float_rate_does_not_raise(self):
        split = PaymentProvider.split_commission(Decimal('1000.00'), 10.00)
        self.assertEqual(split.commission, Decimal('100.00'))
        self.assertEqual(split.net, Decimal('900.00'))

    def test_float_gross_does_not_raise(self):
        split = PaymentProvider.split_commission(1000.0, Decimal('10.00'))
        self.assertEqual(split.commission, Decimal('100.00'))

    def test_string_inputs_accepted(self):
        split = PaymentProvider.split_commission('250.00', '12.50')
        self.assertEqual(split.commission, Decimal('31.25'))
        self.assertEqual(split.net, Decimal('218.75'))

    def test_rounds_half_up_to_cents(self):
        # 333.33 * %10 = 33.333 → 33.33
        split = PaymentProvider.split_commission(Decimal('333.33'), Decimal('10'))
        self.assertEqual(split.commission, Decimal('33.33'))
        self.assertEqual(split.net, Decimal('300.00'))

    def test_commission_plus_net_equals_gross(self):
        # Yuvarlama net'ten alındığı için toplam her zaman brüte eşit olmalı;
        # aksi halde ledger toplamı kuruş kuruş kayardı.
        for amount in ['0.01', '9.99', '100.05', '1234.56', '99999.99']:
            for rate in ['0', '3.33', '10', '17.5', '100']:
                split = PaymentProvider.split_commission(Decimal(amount), Decimal(rate))
                self.assertEqual(
                    split.commission + split.net, split.gross,
                    f'{amount} @ %{rate}',
                )

    def test_zero_rate_leaves_full_net(self):
        split = PaymentProvider.split_commission(Decimal('500.00'), Decimal('0'))
        self.assertEqual(split.commission, Decimal('0.00'))
        self.assertEqual(split.net, Decimal('500.00'))

    def test_to_decimal_avoids_binary_artifacts(self):
        # Decimal(0.1) ikili artıkla gelir; str üzerinden çevirmek şart.
        self.assertEqual(to_decimal(0.1), Decimal('0.1'))


class ProviderSelectionTestCase(TestCase):
    @override_settings(PAYMENT_PROVIDER='stripe')
    def test_default_returns_stripe(self):
        self.assertIsInstance(get_provider(), StripeProvider)

    @override_settings(PAYMENT_PROVIDER='iyzico')
    def test_setting_selects_iyzico(self):
        self.assertIsInstance(get_provider(), IyzicoProvider)

    @override_settings(PAYMENT_PROVIDER='IYZICO')
    def test_selection_is_case_insensitive(self):
        self.assertIsInstance(get_provider(), IyzicoProvider)

    def test_explicit_name_overrides_setting(self):
        self.assertIsInstance(get_provider('iyzico'), IyzicoProvider)

    @override_settings(PAYMENT_PROVIDER='paypal')
    def test_unknown_provider_raises(self):
        # Yanlış yazılmış bir env değeri sessizce Stripe'a düşmemeli.
        with self.assertRaises(ProviderNotConfigured):
            get_provider()

    @override_settings(PAYMENT_PROVIDER='')
    def test_empty_setting_falls_back_to_stripe(self):
        self.assertIsInstance(get_provider(), StripeProvider)


@override_settings(STRIPE_SECRET_KEY='sk_test_dummy', STRIPE_WEBHOOK_SECRET='whsec_dummy')
class StripeProviderTestCase(TestCase):
    def setUp(self):
        self.provider = StripeProvider()

    def test_is_configured_true_with_key(self):
        self.assertTrue(self.provider.is_configured())

    @override_settings(STRIPE_SECRET_KEY='')
    def test_missing_key_raises_not_configured(self):
        provider = StripeProvider()
        self.assertFalse(provider.is_configured())
        with self.assertRaises(ProviderNotConfigured):
            provider.create_intent(amount=Decimal('10'), currency='TRY', metadata={})

    @patch('bookings.payments.stripe_provider.stripe.PaymentIntent.create')
    def test_create_intent_sends_minor_units(self, mock_create):
        mock_create.return_value = type(
            'I', (), {'id': 'pi_test_abcdef1234', 'client_secret': 'sec'}
        )()
        result = self.provider.create_intent(
            amount=Decimal('1250.50'), currency='TRY', metadata={'tour_id': 't1'},
        )
        kwargs = mock_create.call_args.kwargs
        self.assertEqual(kwargs['amount'], 125050)
        self.assertEqual(kwargs['currency'], 'try')
        self.assertEqual(kwargs['metadata'], {'tour_id': 't1'})
        self.assertEqual(result.intent_id, 'pi_test_abcdef1234')
        # T3-04: booking_ref artık intent'ten türetilmez; result üzerinde böyle
        # bir alan da yoktur (referans Booking.generate_unique_ref ile üretilir).
        self.assertFalse(hasattr(result, 'booking_ref'))

    @patch('bookings.payments.stripe_provider.stripe.Webhook.construct_event')
    def test_webhook_normalizes_success(self, mock_construct):
        mock_construct.return_value = {
            'type': 'payment_intent.succeeded',
            'data': {'object': {'id': 'pi_1'}},
        }
        event = self.provider.verify_webhook(payload=b'{}', headers={'HTTP_STRIPE_SIGNATURE': 'sig'})
        self.assertEqual(event.type, WebhookEvent.SUCCEEDED)
        self.assertEqual(event.intent_id, 'pi_1')

    @patch('bookings.payments.stripe_provider.stripe.Webhook.construct_event')
    def test_webhook_normalizes_failure(self, mock_construct):
        mock_construct.return_value = {
            'type': 'payment_intent.payment_failed',
            'data': {'object': {'id': 'pi_2'}},
        }
        event = self.provider.verify_webhook(payload=b'{}', headers={'HTTP_STRIPE_SIGNATURE': 'sig'})
        self.assertEqual(event.type, WebhookEvent.FAILED)

    @patch('bookings.payments.stripe_provider.stripe.Webhook.construct_event')
    def test_unknown_event_type_passes_through(self, mock_construct):
        # Tanınmayan olay tipi hata değil: çağıran yok sayar, akış patlamaz.
        mock_construct.return_value = {
            'type': 'charge.refunded',
            'data': {'object': {'id': 'pi_3'}},
        }
        event = self.provider.verify_webhook(payload=b'{}', headers={'HTTP_STRIPE_SIGNATURE': 'sig'})
        self.assertEqual(event.type, 'charge.refunded')
        self.assertNotEqual(event.type, WebhookEvent.SUCCEEDED)

    @patch('bookings.payments.stripe_provider.stripe.Webhook.construct_event',
           side_effect=ValueError('bad signature'))
    def test_invalid_signature_raises_payment_error(self, _mock):
        with self.assertRaises(PaymentError):
            self.provider.verify_webhook(payload=b'{}', headers={})

    @patch('bookings.payments.stripe_provider.stripe.Refund.create',
           side_effect=RuntimeError('network down'))
    def test_refund_failure_is_not_swallowed(self, _mock):
        with self.assertRaises(PaymentError):
            self.provider.refund(intent_id='pi_1')

    def test_stripe_has_no_sub_merchant(self):
        self.assertIsNone(self.provider.register_sub_merchant(agency=None))


class IyzicoProviderTestCase(TestCase):
    def setUp(self):
        self.provider = IyzicoProvider()
        owner = User.objects.create_user(username='iyz_owner', password='pw')
        self.agency = Agency.objects.create(
            owner=owner, name='İyzi Acenta', status='onaylandi', is_verified=True,
            legal_entity_type='company', email='iyzi@test.com', phone='+905551112233',
            address='Kadıköy, İstanbul', iban='TR330006100519786457841326',
            bank_account_holder='İyzi Turizm Ltd.', tax_id='1234567890',
            tax_office='Kadıköy VD',
        )

    def test_not_configured_without_keys(self):
        with override_settings(IYZICO_API_KEY='', IYZICO_SECRET_KEY='', IYZICO_BASE_URL=''):
            self.assertFalse(self.provider.is_configured())

    @override_settings(IYZICO_API_KEY='', IYZICO_SECRET_KEY='', IYZICO_BASE_URL='')
    def test_create_intent_raises_not_configured(self):
        with self.assertRaises(ProviderNotConfigured):
            self.provider.create_intent(amount=Decimal('10'), currency='TRY', metadata={})

    @override_settings(IYZICO_API_KEY='k', IYZICO_SECRET_KEY='s',
                       IYZICO_BASE_URL='https://sandbox-api.iyzipay.com')
    def test_configured_but_unimplemented_raises_loudly(self):
        # Anahtarlar dolu olsa bile entegrasyon bitmedi; sessizce "başarılı"
        # dönen hiçbir yol olmamalı, aksi halde ödeme alınmadan bilet kesilir.
        with self.assertRaises(PaymentError):
            self.provider.create_intent(amount=Decimal('10'), currency='TRY', metadata={})
        with self.assertRaises(PaymentError):
            self.provider.refund(intent_id='x')
        with self.assertRaises(PaymentError):
            self.provider.verify_webhook(payload=b'{}', headers={})
        with self.assertRaises(PaymentError):
            self.provider.register_sub_merchant(self.agency)

    def test_company_payload(self):
        payload = IyzicoProvider.build_sub_merchant_payload(self.agency)
        self.assertEqual(payload['subMerchantType'], 'LIMITED_OR_JOINT_STOCK_COMPANY')
        self.assertEqual(payload['taxNumber'], '1234567890')
        self.assertEqual(payload['taxOffice'], 'Kadıköy VD')
        self.assertEqual(payload['iban'], 'TR330006100519786457841326')
        self.assertEqual(payload['currency'], 'TRY')
        self.assertEqual(payload['subMerchantExternalId'], str(self.agency.id))

    def test_individual_payload_omits_tax_fields(self):
        self.agency.legal_entity_type = 'individual'
        self.agency.tax_id = None
        self.agency.tax_office = None
        self.agency.save()

        payload = IyzicoProvider.build_sub_merchant_payload(self.agency)
        self.assertEqual(payload['subMerchantType'], 'PERSONAL')
        self.assertNotIn('taxNumber', payload)
        self.assertEqual(payload['contactName'], 'İyzi Turizm Ltd.')

    def test_missing_fields_named_in_error(self):
        self.agency.iban = None
        self.agency.email = None
        self.agency.save()
        with self.assertRaises(PaymentError) as ctx:
            IyzicoProvider.build_sub_merchant_payload(self.agency)
        message = str(ctx.exception)
        self.assertIn('iban', message)
        self.assertIn('email', message)

    def test_individual_does_not_require_tax_id(self):
        self.agency.legal_entity_type = 'individual'
        self.agency.tax_id = None
        self.agency.tax_office = None
        self.agency.save()
        # Hata fırlatmamalı.
        IyzicoProvider.build_sub_merchant_payload(self.agency)


class LedgerRefundTestCase(TestCase):
    """Satış kaydı silinmez; iade karşısına eksi tutarlı satır olarak yazılır."""

    def setUp(self):
        owner = User.objects.create_user(username='ledger_owner', password='pw')
        self.agency = Agency.objects.create(
            owner=owner, name='Ledger Acenta', status='onaylandi', is_verified=True,
            commission_rate=Decimal('10.00'),
        )
        self.tour = Tour.objects.create(
            id='ledger-tour', agency=self.agency, title='Ledger Tour', location='Fethiye',
            price=1000, duration='1 Day', guide='Turkish', description='d', category='nature',
        )
        self.user = User.objects.create_user(username='ledger_customer', password='pw')
        self.booking = Booking.objects.create(
            user=self.user, tour=self.tour, booking_ref='LDG00001', status='confirmed',
            start_date=date.today() + timedelta(days=3), guests=2,
            total_price=Decimal('2000.00'),
        )

    def _sale(self):
        return AgentFinanceLedger.objects.get(
            booking_ref='LDG00001', entry_type='sale',
        )

    def test_sale_entry_values(self):
        # Sinyal zaten oluşturmuş olabilir; idempotent olduğu için tekrar çağrı güvenli.
        AgentFinanceLedger.create_from_booking(self.booking)
        sale = self._sale()
        self.assertEqual(sale.gross_amount, Decimal('2000.00'))
        self.assertEqual(sale.commission_amount, Decimal('200.00'))
        self.assertEqual(sale.net_amount, Decimal('1800.00'))
        self.assertEqual(sale.agency, self.agency)

    def test_create_from_booking_is_idempotent(self):
        AgentFinanceLedger.create_from_booking(self.booking)
        AgentFinanceLedger.create_from_booking(self.booking)
        self.assertEqual(
            AgentFinanceLedger.objects.filter(booking_ref='LDG00001').count(), 1,
        )

    def test_refund_entry_is_negative_mirror(self):
        AgentFinanceLedger.create_from_booking(self.booking)
        sale = self._sale()
        refund = AgentFinanceLedger.create_refund_entry(self.booking)

        self.assertIsNotNone(refund)
        self.assertEqual(refund.entry_type, 'refund')
        self.assertEqual(refund.gross_amount, -sale.gross_amount)
        self.assertEqual(refund.commission_amount, -sale.commission_amount)
        self.assertEqual(refund.net_amount, -sale.net_amount)
        # Satış satırı korunur — muhasebe izi bozulmamalı.
        self.assertTrue(
            AgentFinanceLedger.objects.filter(booking_ref='LDG00001', entry_type='sale').exists()
        )

    def test_refund_entry_fits_max_length_for_long_ref(self):
        # T3-05: Booking.booking_ref 50 karaktere kadar; ters kayıt buna
        # '-REFUND' ekler (57). Ledger alanı 64'e genişletildiği için taşmamalı.
        long_ref = 'L' * 50
        booking = Booking.objects.create(
            user=self.user, tour=self.tour, booking_ref=long_ref, status='confirmed',
            start_date=date.today() + timedelta(days=4), guests=1,
            total_price=Decimal('1000.00'),
        )
        AgentFinanceLedger.create_from_booking(booking)
        refund = AgentFinanceLedger.create_refund_entry(booking)
        self.assertIsNotNone(refund)
        self.assertEqual(refund.booking_ref, f'{long_ref}-REFUND')
        self.assertLessEqual(
            len(refund.booking_ref),
            AgentFinanceLedger._meta.get_field('booking_ref').max_length,
        )

    def test_refund_entry_is_idempotent(self):
        AgentFinanceLedger.create_from_booking(self.booking)
        AgentFinanceLedger.create_refund_entry(self.booking)
        AgentFinanceLedger.create_refund_entry(self.booking)
        self.assertEqual(
            AgentFinanceLedger.objects.filter(
                agency=self.agency, entry_type='refund',
            ).count(), 1,
        )

    def test_refund_without_sale_returns_none(self):
        AgentFinanceLedger.objects.filter(booking_ref='LDG00001').delete()
        self.assertIsNone(AgentFinanceLedger.create_refund_entry(self.booking))

    def test_refund_uses_original_amounts_after_rate_change(self):
        # İade edilen para eski tutardır; aradan geçen sürede komisyon oranı
        # değişmiş olsa bile ters kayıt satış satırını baz almalı.
        AgentFinanceLedger.create_from_booking(self.booking)
        self.agency.commission_rate = Decimal('25.00')
        self.agency.save(update_fields=['commission_rate'])

        refund = AgentFinanceLedger.create_refund_entry(self.booking)
        self.assertEqual(refund.commission_amount, Decimal('-200.00'))
        self.assertEqual(refund.net_amount, Decimal('-1800.00'))

    def test_refund_drops_available_balance_to_zero(self):
        # Asıl risk buydu: bakiye toplamları `entry_type='sale'` ile
        # filtrelenseydi iade edilmiş para hâlâ ödenebilir görünürdü.
        AgentFinanceLedger.create_from_booking(self.booking)
        payout = AgentPayoutRequest(agency=self.agency, amount=Decimal('0'))
        self.assertEqual(payout.available_balance, Decimal('1800.00'))

        AgentFinanceLedger.create_refund_entry(self.booking)
        self.assertEqual(payout.available_balance, Decimal('0.00'))


@override_settings(STRIPE_SECRET_KEY='sk_test_dummy', PAYMENT_PROVIDER='stripe')
class CancelRefundFlowTestCase(TestCase):
    """
    Uçtan uca: iptal → PSP iadesi → ters ledger kaydı → bakiye düşer.

    Adapter katmanının asıl amacı bu zincirin sağlayıcıdan bağımsız kalması;
    burada Stripe mock'lanır ama akış `get_provider()` üzerinden geçer.
    """

    def setUp(self):
        self.client = APIClient()
        owner = User.objects.create_user(username='flow_owner', password='pw')
        self.agency = Agency.objects.create(
            owner=owner, name='Flow Acenta', status='onaylandi', is_verified=True,
            commission_rate=Decimal('10.00'),
        )
        self.tour = Tour.objects.create(
            id='flow-tour', agency=self.agency, title='Flow Tour', location='Kaş',
            price=1000, duration='1 Day', guide='Turkish', description='d', category='nature',
        )
        self.user = User.objects.create_user(username='flow_customer', password='pw')
        self.booking = Booking.objects.create(
            user=self.user, tour=self.tour, booking_ref='FLW00001', status='confirmed',
            start_date=date.today() + timedelta(days=10), guests=2,
            total_price=Decimal('2000.00'), payment_intent_id='pi_flow_1',
        )
        self.client.force_authenticate(user=self.user)

    @patch('bookings.payments.stripe_provider.stripe.Refund.create')
    def test_cancel_creates_reverse_ledger_entry(self, mock_refund):
        mock_refund.return_value = type('R', (), {'id': 're_1'})()

        response = self.client.post(f'/api/v1/bookings/{self.booking.id}/cancel/')
        self.assertEqual(response.status_code, 200, response.data)

        mock_refund.assert_called_once()
        self.assertEqual(mock_refund.call_args.kwargs['payment_intent'], 'pi_flow_1')

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'cancelled')

        refund_entry = AgentFinanceLedger.objects.get(
            booking_ref='FLW00001-REFUND', entry_type='refund',
        )
        self.assertEqual(refund_entry.net_amount, Decimal('-1800.00'))

        payout = AgentPayoutRequest(agency=self.agency, amount=Decimal('0'))
        self.assertEqual(payout.available_balance, Decimal('0.00'))

    @patch('bookings.payments.stripe_provider.stripe.Refund.create',
           side_effect=RuntimeError('card network error'))
    def test_failed_refund_blocks_cancellation(self, _mock):
        # İade başarısızsa rezervasyon iptal edilmiş görünmemeli; aksi halde
        # müşteri hem biletini hem parasını kaybeder.
        response = self.client.post(f'/api/v1/bookings/{self.booking.id}/cancel/')
        self.assertEqual(response.status_code, 400)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'confirmed')
        self.assertFalse(
            AgentFinanceLedger.objects.filter(entry_type='refund').exists()
        )
