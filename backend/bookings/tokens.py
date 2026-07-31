"""
Misafir bileti için imzalı "sihirli bağlantı" token'ları.

Misafir (parolasız) kullanıcı panele giremediği için biletine, e-postasındaki
imzalı bağlantıyla erişir. Token booking_ref yerine Booking'in UUID id'sini
taşır (tahmin edilemez). `django.core.signing` imzalı ve süreli olduğundan ayrı
bir tabloya gerek kalmaz.
"""
from django.core import signing

TICKET_SALT = 'guest-booking-ticket'
TICKET_MAX_AGE = 60 * 60 * 24 * 90  # 90 gün


def make_ticket_token(booking):
    return signing.dumps({'b': str(booking.id)}, salt=TICKET_SALT)


def read_ticket_token(token):
    """Token'daki booking id'sini (UUID str) döner. Geçersizse signing hatası fırlatır."""
    data = signing.loads(token, salt=TICKET_SALT, max_age=TICKET_MAX_AGE)
    return data['b']
