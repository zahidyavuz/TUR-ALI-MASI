from allauth.account.utils import user_pk_to_url_str
from dj_rest_auth.serializers import PasswordResetSerializer
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from core.emails import frontend_url


def user_role(user):
    """
    Kullanıcının kaba rolünü döndürür (küçük harf).

    UserSerializer.get_role ile aynı mantık ama JWT claim'i ve ön yüz
    karşılaştırmaları için küçük harfli. 'restaurant' ayrı bir rol DEĞİL —
    o ayrım agency_business_type ile yapılır ve panel layout'unda kalır;
    middleware yalnızca kabuk sızıntısını engellemek için kaba rolü kullanır.
    """
    if user.is_superuser or user.is_staff:
        return 'admin'
    if hasattr(user, 'agency_profile'):
        return 'agency'
    return 'customer'


class RoleTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Access token'a `role` claim'i ekler; böylece ön yüz middleware'i her
    istekte backend'e sormadan (imza doğrulamadan) rol bazlı yönlendirme
    yapabilir. Claim refresh token'da da tutulduğundan yenilemede korunur.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user_role(user)
        return token


def frontend_reset_url_generator(request, user, temp_key):
    """
    Şifre sıfırlama bağlantısını ön yüzdeki /reset-password sayfasına kurar.

    dj_rest_auth'un varsayılanı `reverse('password_reset_confirm')` çağırıyor;
    bu url adı projede kayıtlı olmadığı için sıfırlama isteği NoReverseMatch
    ile 500 dönüyordu. Parametre adları ön yüzün okuduğu adlarla aynı olmalı.
    """
    return frontend_url(
        '/reset-password',
        uid=user_pk_to_url_str(user),
        token=temp_key,
    )


class FrontendPasswordResetSerializer(PasswordResetSerializer):
    def get_email_options(self):
        return {'url_generator': frontend_reset_url_generator}
