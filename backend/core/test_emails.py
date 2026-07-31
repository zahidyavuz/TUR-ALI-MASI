"""
F3-01 — İşlemsel e-posta altyapısı testleri.

Buradaki testlerin çoğu "mail gitti mi" değil, "maildeki bağlantı doğru yere
gidiyor mu" sorusunu kovalar: sıfırlama/doğrulama bağlantıları daha önce
backend API uçlarını (hatta example.com'u) gösteriyordu ve tarayıcıda
açıldığında işe yaramıyordu.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.emails import display_name, frontend_url, send_templated_mail

User = get_user_model()

FRONTEND = 'https://tourkia.example'


class FrontendUrlTestCase(TestCase):
    @override_settings(FRONTEND_URL=FRONTEND)
    def test_builds_absolute_url_with_query(self):
        self.assertEqual(
            frontend_url('/reset-password', uid='abc', token='xyz'),
            f'{FRONTEND}/reset-password?uid=abc&token=xyz',
        )

    @override_settings(FRONTEND_URL=FRONTEND)
    def test_path_without_leading_slash(self):
        self.assertEqual(frontend_url('verify-email'), f'{FRONTEND}/verify-email')

    @override_settings(FRONTEND_URL=FRONTEND + '/')
    def test_trailing_slash_does_not_double_up(self):
        self.assertEqual(frontend_url('/tickets'), f'{FRONTEND}/tickets')

    @override_settings(FRONTEND_URL=FRONTEND)
    def test_query_values_are_encoded(self):
        # Token'lar ':' içerir; kodlanmazsa bağlantı ön yüzde bozuk okunur.
        url = frontend_url('/verify-email', key='Mg:1wp:abc def')
        self.assertNotIn(' ', url)
        self.assertIn('key=Mg%3A1wp%3Aabc+def', url)


class DisplayNameTestCase(TestCase):
    def test_prefers_full_name(self):
        user = User(username='ahmet', first_name='Ahmet', last_name='Yılmaz')
        self.assertEqual(display_name(user), 'Ahmet Yılmaz')

    def test_falls_back_to_username(self):
        self.assertEqual(display_name(User(username='ahmet')), 'ahmet')


@override_settings(FRONTEND_URL=FRONTEND, SITE_NAME='Tourkia',
                   DEFAULT_FROM_EMAIL='noreply@tourkia.example')
class SendTemplatedMailTestCase(TestCase):
    def test_renders_subject_body_and_html(self):
        sent = send_templated_mail('booking_confirmed', 'musteri@example.com', {
            'user_name': 'Ahmet',
            'service_label': 'Kapadokya Balon turu',
            'date_label': '2026-08-12',
            'booking_ref': 'TRK00042',
            'ticket_url': f'{FRONTEND}/dashboard/customer/tickets',
        })

        self.assertTrue(sent)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.subject, 'Rezervasyonunuz onaylandı — TRK00042')
        self.assertEqual(message.to, ['musteri@example.com'])
        self.assertEqual(message.from_email, 'noreply@tourkia.example')
        self.assertIn('Kapadokya Balon turu', message.body)
        self.assertIn('TRK00042', message.body)

        self.assertEqual(len(message.alternatives), 1)
        html, mimetype = message.alternatives[0]
        self.assertEqual(mimetype, 'text/html')
        self.assertIn('Kapadokya Balon turu', html)
        self.assertIn(f'{FRONTEND}/dashboard/customer/tickets', html)

    def test_subject_is_single_line(self):
        # Şablon sonundaki newline başlığa taşarsa SMTP başlığı bozulur.
        send_templated_mail('booking_created', 'a@example.com', {
            'booking_ref': 'TRK00001', 'guests': 2, 'total_price': 100,
        })
        self.assertNotIn('\n', mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].subject.strip(), mail.outbox[0].subject)

    def test_missing_recipient_is_a_no_op(self):
        self.assertFalse(send_templated_mail('booking_confirmed', '', {}))
        self.assertFalse(send_templated_mail('booking_confirmed', None, {}))
        self.assertEqual(len(mail.outbox), 0)

    def test_template_without_html_still_sends_plain_text(self):
        send_templated_mail('booking_cancelled', 'a@example.com', {
            'user_name': 'Ahmet', 'service_label': 'X turu',
            'booking_ref': 'TRK00002', 'refunded': True,
        })
        self.assertIn('iade', mail.outbox[0].body.lower())

    def test_cancellation_text_reflects_refund_state(self):
        send_templated_mail('booking_cancelled', 'a@example.com', {
            'user_name': 'Ahmet', 'service_label': 'X turu',
            'booking_ref': 'TRK00003', 'refunded': False,
        })
        self.assertIn('tahsilat yapılmadığından', mail.outbox[0].body)

    @patch('core.emails.EmailMultiAlternatives.send', side_effect=OSError('smtp down'))
    def test_send_failure_is_swallowed_but_reported(self, _mock):
        # Rezervasyon oluştu ama mail gitmedi durumu, çağıranın akışını bozmamalı;
        # yine de dönüş değeri hatayı görünür kılmalı.
        with self.assertLogs('core.emails', level='WARNING') as logs:
            sent = send_templated_mail('booking_confirmed', 'a@example.com', {})
        self.assertFalse(sent)
        self.assertIn('smtp down', logs.output[0])

    @patch('core.emails.EmailMultiAlternatives.send', side_effect=OSError('smtp down'))
    def test_send_failure_can_be_raised(self, _mock):
        with self.assertRaises(OSError):
            send_templated_mail('booking_confirmed', 'a@example.com', {},
                                fail_silently=False)

    def test_site_name_comes_from_settings(self):
        send_templated_mail('booking_confirmed', 'a@example.com', {'booking_ref': 'X'})
        self.assertIn('Tourkia', mail.outbox[0].body)


@override_settings(FRONTEND_URL=FRONTEND)
class PasswordResetFlowTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.user = User.objects.create_user(
            username='ahmet', email='ahmet@example.com', password='EskiSifre123!',
        )

    def test_reset_request_sends_mail_with_frontend_link(self):
        response = self.client.post(
            '/api/v1/auth/password/reset/', {'email': 'ahmet@example.com'}, format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        # Regresyon koruması: bağlantı daha önce NoReverseMatch ile 500 üretiyordu,
        # düzeltilmiş hali ön yüzdeki sayfayı göstermeli — API ucunu değil.
        self.assertIn(f'{FRONTEND}/reset-password?', body)
        self.assertIn('uid=', body)
        self.assertIn('token=', body)
        self.assertNotIn('example.com/api', body)
        self.assertNotIn('/api/v1/', body)
        # Django şablon autoescape'i düz metinde de çalışır; `&` -> `&amp;`
        # dönüşümü bağlantıyı sessizce bozar (ön yüz `amp;token` okur).
        self.assertNotIn('&amp;', body)

    def test_reset_link_actually_sets_new_password(self):
        self.client.post('/api/v1/auth/password/reset/',
                         {'email': 'ahmet@example.com'}, format='json')
        uid, token = self._extract_uid_token(mail.outbox[0].body)

        response = self.client.post('/api/v1/auth/password/reset/confirm/', {
            'uid': uid,
            'token': token,
            # Ön yüzün gönderdiği alan adları bunlar olmalı.
            'new_password1': 'YeniSifre456!',
            'new_password2': 'YeniSifre456!',
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('YeniSifre456!'))

    def test_expired_or_tampered_token_is_rejected(self):
        self.client.post('/api/v1/auth/password/reset/',
                         {'email': 'ahmet@example.com'}, format='json')
        uid, token = self._extract_uid_token(mail.outbox[0].body)

        response = self.client.post('/api/v1/auth/password/reset/confirm/', {
            'uid': uid, 'token': token[:-1] + ('a' if token[-1] != 'a' else 'b'),
            'new_password1': 'YeniSifre456!', 'new_password2': 'YeniSifre456!',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('EskiSifre123!'))

    def test_unknown_email_does_not_leak_account_existence(self):
        response = self.client.post('/api/v1/auth/password/reset/',
                                    {'email': 'yok@example.com'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    @staticmethod
    def _extract_uid_token(body):
        start = body.index(f'{FRONTEND}/reset-password?')
        end = len(body)
        for terminator in ('\n', ' '):
            candidate = body.find(terminator, start)
            if candidate != -1:
                end = min(end, candidate)
        query = body[start:end].split('?', 1)[1]
        parts = dict(pair.split('=', 1) for pair in query.split('&'))
        return parts['uid'], parts['token']


@override_settings(FRONTEND_URL=FRONTEND)
class EmailVerificationFlowTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        # allauth doğrulama maillerini adrese göre hız sınırlar ve sayaç cache'te
        # tutulur — cache testler arasında geri alınmaz, aynı adresi kullanan
        # ikinci test maili hiç göremez.
        cache.clear()

    def test_registration_confirmation_link_points_to_frontend(self):
        response = self.client.post('/api/v1/auth/registration/', {
            'username': 'yeni', 'email': 'yeni@example.com',
            'password1': 'GucluSifre123!', 'password2': 'GucluSifre123!',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        self.assertIn(f'{FRONTEND}/verify-email?key=', body)
        # Eskiden bağlantı doğrudan API ucunu gösteriyordu.
        self.assertNotIn('/api/v1/auth/registration/account-confirm-email/', body)
        self.assertNotIn('example.com!', body)

    def test_verify_email_key_from_mail_confirms_address(self):
        from allauth.account.models import EmailAddress

        self.client.post('/api/v1/auth/registration/', {
            'username': 'yeni', 'email': 'yeni@example.com',
            'password1': 'GucluSifre123!', 'password2': 'GucluSifre123!',
        }, format='json')
        key = self._extract_key(mail.outbox[0].body)

        response = self.client.post('/api/v1/auth/registration/verify-email/',
                                    {'key': key}, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(
            EmailAddress.objects.get(email='yeni@example.com').verified
        )

    def test_invalid_key_is_rejected(self):
        response = self.client.post('/api/v1/auth/registration/verify-email/',
                                    {'key': 'gecersiz-anahtar'}, format='json')
        self.assertEqual(response.status_code, 404)

    @staticmethod
    def _extract_key(body):
        marker = f'{FRONTEND}/verify-email?key='
        start = body.index(marker) + len(marker)
        end = len(body)
        for terminator in ('\n', ' '):
            candidate = body.find(terminator, start)
            if candidate != -1:
                end = min(end, candidate)
        from urllib.parse import unquote_plus
        return unquote_plus(body[start:end])
