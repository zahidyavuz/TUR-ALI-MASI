"""
Misafir (üyeliksiz) checkout için gölge kullanıcı ve hesap sahiplenme (claim)
yardımcıları.

Strateji: misafir rezervasyon yaptığında e-postasıyla parolasız bir "gölge"
User yaratılır (profile.is_guest=True). Rezervasyon bu kullanıcıya bağlanır;
misafir biletine imzalı sihirli bağlantıyla erişir. Ödeme sonrası gönderilen
"hesap oluştur" davetindeki imzalı token ile misafir parola atar ve hesabı
sahiplenir (is_guest=False). Böylece aynı e-posta ileride normal girişle çalışır.

Token'lar için `django.core.signing` kullanılır: ayrı bir tablo/DB alanı
gerektirmez, süreli (max_age) ve imzalıdır.
"""
from django.contrib.auth.models import User
from django.core import signing
from django.utils.crypto import get_random_string

# Farklı amaçlı token'ların birbirinin yerine kullanılamaması için ayrı salt'lar.
CLAIM_SALT = 'guest-account-claim'
CLAIM_MAX_AGE = 60 * 60 * 24 * 14  # 14 gün


def _unique_username(email):
    base = (email.split('@')[0] or 'guest')[:140]
    username = base
    while User.objects.filter(username=username).exists():
        username = f'{base}-{get_random_string(6)}'[:150]
    return username


def create_guest_user(email, name='', phone=''):
    """E-postayla parolasız gölge kullanıcı yaratır (profile.is_guest=True)."""
    first, _, last = (name or '').strip().partition(' ')
    user = User(
        username=_unique_username(email),
        email=email,
        first_name=first[:150],
        last_name=last[:150],
    )
    user.set_unusable_password()
    user.save()

    # UserProfile, User post_save sinyaliyle otomatik oluşuyor (users/signals.py).
    profile = user.profile
    profile.is_guest = True
    if phone:
        profile.phone_number = phone[:20]
    profile.save(update_fields=['is_guest', 'phone_number'])
    return user


def is_guest_user(user):
    """Kullanıcı henüz sahiplenilmemiş bir misafir hesabı mı?"""
    profile = getattr(user, 'profile', None)
    return bool(profile and profile.is_guest)


def make_claim_token(user):
    return signing.dumps({'u': user.id}, salt=CLAIM_SALT)


def read_claim_token(token):
    """Token'daki user id'sini döner. Geçersiz/süresi dolmuşsa signing hatası fırlatır."""
    data = signing.loads(token, salt=CLAIM_SALT, max_age=CLAIM_MAX_AGE)
    return data['u']
