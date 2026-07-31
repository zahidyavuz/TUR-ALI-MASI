from allauth.account.utils import user_pk_to_url_str
from dj_rest_auth.serializers import PasswordResetSerializer

from core.emails import frontend_url


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
