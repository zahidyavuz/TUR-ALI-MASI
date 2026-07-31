"""Hassas kimlik uçlarına gerçek rate limiting ekleyen ince alt sınıflar.

dj_rest_auth'un `LoginView`/`RegisterView`'ları `throttle_scope` taşımaz, bu
yüzden brute-force / kayıt spam'ine karşı sınırsızdır. Burada yalnızca
`throttle_scope` set edilir; asıl oran matrisi settings.REST_FRAMEWORK
'DEFAULT_THROTTLE_RATES' altında ('login', 'register') tanımlıdır ve
'ScopedRateThrottle' DEFAULT_THROTTLE_CLASSES içinde olduğu için devreye girer.

Not: Throttle sayacı DRF cache backend'inde tutulur. Tek-süreçli LocMemCache
production'da process başına ayrıdır; dağıtık ortamda ortak bir cache
(Redis vb.) gerekir — aksi halde sınır her worker'da bağımsız işler.
"""
from dj_rest_auth.registration.views import RegisterView
from dj_rest_auth.views import LoginView

from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .guest import read_claim_token, is_guest_user
from django.contrib.auth.models import User


class ThrottledLoginView(LoginView):
    """IP başına dakikada 5 giriş denemesi (settings 'login' scope)."""
    throttle_scope = 'login'


class ThrottledRegisterView(RegisterView):
    """IP başına saatte 5 kayıt (settings 'register' scope)."""
    throttle_scope = 'register'


class ClaimAccountView(APIView):
    """Misafir hesabı sahiplenme: imzalı claim token + parola → gerçek hesap.

    Ödeme sonrası misafire gönderilen "hesap oluştur" davetindeki token, gölge
    kullanıcının id'sini taşır (bkz. users/guest.py). Bu uç parola atayıp
    profile.is_guest'i False yapar; böylece aynı e-posta ileride normal girişle
    çalışır. Kayıt uçlarıyla aynı 'register' scope'uyla sınırlanır (spam/enum).
    """
    permission_classes = [AllowAny]
    # ScopedRateThrottle DEFAULT_THROTTLE_CLASSES içinde; yalnız scope set etmek
    # 'register' oranını (saatte 5) uygular. Testte throttle default'ları
    # temizlendiği için no-op olur (bkz. settings.py 'test' bloğu).
    throttle_scope = 'register'

    def post(self, request):
        token = (request.data.get('token') or '').strip()
        password = request.data.get('password') or ''
        if not token or not password:
            return Response(
                {'error': 'Token ve parola zorunludur.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user_id = read_claim_token(token)
        except signing.BadSignature:
            return Response(
                {'error': 'Bağlantı geçersiz veya süresi dolmuş.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Hesap bulunamadı.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Yalnız sahiplenilmemiş misafir hesapları claim edilebilir. Zaten
        # sahiplenilmiş/normal bir hesabın parolasının bu yolla değişmesi
        # (hesap ele geçirme) engellenir.
        if not is_guest_user(user):
            return Response(
                {'error': 'Bu hesap zaten oluşturulmuş. Lütfen giriş yapın.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(password, user=user)
        except DjangoValidationError as e:
            return Response({'error': e.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=['password'])
        profile = user.profile
        profile.is_guest = False
        profile.save(update_fields=['is_guest'])
        return Response(
            {'detail': 'Hesabınız oluşturuldu. Artık giriş yapabilirsiniz.', 'username': user.username},
            status=status.HTTP_200_OK,
        )
