import json

from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase

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
