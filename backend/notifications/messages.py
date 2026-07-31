"""
notifications/messages.py
-------------------------
SMS / WhatsApp ileti şablonları (TR + EN).

E-posta şablonlarından (templates/emails/) ayrı tutulur: SMS metni tek satır,
kısa ve markup'sızdır; e-posta ise HTML + uzun gövde. Şablonlar burada düz Python
string olarak durur çünkü render'ları basit alan yerleştirmesidir. Dil `context`
içinde gelmeyen bir alan istenirse KeyError yerine boş string konur (SafeDict) —
eksik bir alan yüzünden gönderim hiç yapılmamaktansa eksik metinle gitmesi yeğdir.
"""

MESSAGES = {
    'booking_confirmed': {
        'tr': ('Merhaba {name}, {service} rezervasyonunuz onaylandı. '
               'Referans: {ref}. Detaylar: {url}'),
        'en': ('Hi {name}, your booking for {service} is confirmed. '
               'Ref: {ref}. Details: {url}'),
    },
    'tour_reminder': {
        'tr': ('Merhaba {name}, {service} {date} tarihinde. '
               'Buluşma noktası: {point}, saat {time}. Otel: {hotel}. İyi yolculuklar!'),
        'en': ('Hi {name}, your {service} is on {date}. '
               'Pickup: {point} at {time}. Hotel: {hotel}. Have a great trip!'),
    },
    'booking_cancelled': {
        'tr': 'Merhaba {name}, {service} rezervasyonunuz ({ref}) iptal edildi. {refund}',
        'en': 'Hi {name}, your booking for {service} ({ref}) has been cancelled. {refund}',
    },
    'new_booking': {
        'tr': 'Yeni rezervasyon: {service} için {ref}. {guests} kişi, {date}.',
        'en': 'New booking: {ref} for {service}. {guests} guests, {date}.',
    },
}

DEFAULT_LANG = 'tr'

# Geçerli olay tipleri; model choices ve doğrulama tek kaynaktan beslensin.
EVENT_CHOICES = [(key, key) for key in MESSAGES]


class _SafeDict(dict):
    def __missing__(self, key):
        return ''


def render_message(event_type: str, lang: str, context: dict) -> str:
    """Olay + dile göre şablonu seçip `context` ile doldurur.

    Bilinmeyen olay tipinde KeyError fırlatır (bu çağıran kodun hatasıdır, sessizce
    yutulmamalı). İstenen dil yoksa varsayılan dile (TR) düşer.
    """
    langs = MESSAGES[event_type]
    template = langs.get(lang) or langs[DEFAULT_LANG]
    return template.format_map(_SafeDict(context or {}))
