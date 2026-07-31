import json
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from users.auth_views import ThrottledLoginView

from agencies.models import Agency
from users.auth_serializers import RoleTokenObtainPairSerializer, user_role


def decode_payload(token):
    """JWT payload'ını imza doğrulamadan çözer (middleware ile aynı yaklaşım)."""
    import base64
    part = token.split('.')[1]
    # base64url padding'i tamamla
    part += '=' * (-len(part) % 4)
    return json.loads(base64.urlsafe_b64decode(part))


class UserRoleTestCase(APITestCase):
    """`role` claim'i F3-02 middleware rol matrisinin temeli — üç rolü de kanıtla."""

    def setUp(self):
        # allauth/login hız sınırı sayacı LocMemCache'te tutuluyor ve testler
        # arasında sıfırlanmıyor; temizlemezsek ikinci login sessizce boş döner.
        cache.clear()

    def test_customer_role(self):
        user = User.objects.create_user('musteri', 'musteri@example.com', 'pw12345678')
        self.assertEqual(user_role(user), 'customer')

    def test_agency_role(self):
        user = User.objects.create_user('acente', 'acente@example.com', 'pw12345678')
        Agency.objects.create(owner=user, name='Test Acenta')
        self.assertEqual(user_role(user), 'agency')

    def test_admin_role(self):
        user = User.objects.create_user('yonetici', 'yonetici@example.com', 'pw12345678')
        user.is_staff = True
        user.save()
        self.assertEqual(user_role(user), 'admin')

    def test_token_carries_role_claim(self):
        user = User.objects.create_user('acente2', 'acente2@example.com', 'pw12345678')
        Agency.objects.create(owner=user, name='Test Acenta 2')
        token = RoleTokenObtainPairSerializer.get_token(user)
        self.assertEqual(token['role'], 'agency')
        # access token'a da yansımalı — middleware access token'ı okur.
        self.assertEqual(token.access_token['role'], 'agency')

    def test_login_access_token_has_role(self):
        User.objects.create_user('musteri2', 'musteri2@example.com', 'pw12345678')
        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': 'musteri2', 'password': 'pw12345678'},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        access = response.data['access']
        self.assertEqual(decode_payload(access).get('role'), 'customer')


class CookieAuthFlowTestCase(APITestCase):
    """F3-03: refresh HttpOnly çerezde, access gövdede; logout blacklist'ler."""

    def setUp(self):
        cache.clear()
        User.objects.create_user('kadir', 'kadir@example.com', 'pw12345678')

    def _login(self):
        return self.client.post(
            '/api/v1/auth/login/',
            {'username': 'kadir', 'password': 'pw12345678'},
            format='json',
        )

    def test_login_puts_refresh_in_httponly_cookie_not_body(self):
        response = self._login()
        self.assertEqual(response.status_code, 200, response.data)
        # Access gövdede döner (bellekte tutulacak).
        self.assertTrue(response.data.get('access'))
        # Refresh gövdede TAŞINMAZ (boş) — sadece çerezde.
        self.assertFalse(response.data.get('refresh'))
        cookie = response.cookies.get('refresh-token')
        self.assertIsNotNone(cookie, 'refresh-token çerezi set edilmedi')
        self.assertTrue(cookie['httponly'], 'refresh çerezi HttpOnly değil (XSS riski)')
        # Access token için ayrı çerez yazılmamalı (bellekte tutulur).
        self.assertIsNone(response.cookies.get('auth-token'))

    def test_refresh_reads_cookie_and_returns_new_access(self):
        self._login()
        # Gövdede refresh göndermeden, yalnız çerezle yenileme çalışmalı.
        response = self.client.post('/api/v1/auth/token/refresh/', {}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data.get('access'))
        self.assertEqual(decode_payload(response.data['access']).get('role'), 'customer')

    def test_logout_blacklists_refresh_token(self):
        self._login()
        old_refresh = self.client.cookies['refresh-token'].value

        logout = self.client.post('/api/v1/auth/logout/', {}, format='json')
        self.assertEqual(logout.status_code, 200, logout.data)

        # Blacklist'lenen eski refresh token açıkça sunulsa bile reddedilmeli.
        self.client.cookies['refresh-token'] = old_refresh
        response = self.client.post('/api/v1/auth/token/refresh/', {}, format='json')
        self.assertEqual(response.status_code, 401, response.data)

    def test_onboarding_start_sets_refresh_cookie_with_role(self):
        response = self.client.post(
            '/api/v1/agencies/onboarding/start/',
            {
                'email': 'yeni@acenta.com',
                'password': 'pw12345678',
                'contact_name': 'Yeni Acenta',
                'phone': '5551234567',
                'business_type': 'acenta',
                'legal_entity_type': 'company',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data.get('access'))
        self.assertFalse(response.data.get('refresh'))
        cookie = response.cookies.get('refresh-token')
        self.assertIsNotNone(cookie)
        self.assertTrue(cookie['httponly'])
        # Acente kaydı sonrası middleware /dashboard/agency'yi açabilsin diye
        # token'da role=agency olmalı.
        self.assertEqual(decode_payload(response.data['access']).get('role'), 'agency')


class LoginThrottleTestCase(APITestCase):
    """F3-04: login endpoint'i IP başına dakikada 5 denemeyle sınırlı (brute-force).

    Throttle test koşumunda global olarak kapalı (settings.py — paylaşılan cache
    sayaçları testler arası sızıp alakasız testleri 429'a düşürüyordu). DRF
    `throttle_classes`/`THROTTLE_RATES`'i import anında sınıf niteliği olarak
    bağladığı için override_settings bunları geri açmaya yetmez; bu yüzden
    ThrottledLoginView'in throttle'ını ve 'login' oranını bu test süresince
    doğrudan patch'liyoruz. Böylece gerçek uç (ScopedRateThrottle + gerçek cache)
    üzerinden 429 davranışı kanıtlanır, diğer testler etkilenmez.
    """

    def setUp(self):
        # Throttle sayacı da login rate-limit sayacı da cache'te; testler
        # arasında sızmasın diye temizle.
        cache.clear()
        User.objects.create_user('brute', 'brute@example.com', 'pw12345678')

    def _attempt(self, password='yanlissifre'):
        return self.client.post(
            '/api/v1/auth/login/',
            {'username': 'brute', 'password': password},
            format='json',
        )

    def test_login_blocked_after_five_attempts(self):
        with mock.patch.object(ThrottledLoginView, 'throttle_classes', [ScopedRateThrottle]), \
                mock.patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'login': '5/minute'}):
            statuses = [self._attempt().status_code for _ in range(6)]
        # İlk istek taze cache'te throttle'a takılmamalı.
        self.assertNotEqual(statuses[0], 429, 'İlk deneme throttle yememeli')
        # 5/dakika scope sınırı aşıldığında 429 dönmeli (6 deneme içinde).
        self.assertIn(429, statuses, f'Ard arda denemede 429 beklendi, alınan: {statuses}')
