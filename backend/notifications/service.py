"""
notifications/service.py
------------------------
Kuyruğa yazmanın tek giriş noktası. Çağrı yerleri (webhook, iptal, hatırlatma
komutu) doğrudan NotificationLog.objects.create çağırmaz; hep buradan geçer ki
render + savunmacı kontroller (telefon yoksa atla) tek yerde kalsın.

Gönderimin kendisi burada YAPILMAZ — yalnız `pending` satır oluşturulur. Asıl
gönderim `send_notifications` yönetim komutundadır (asenkron, cron ile).
"""
import logging

from django.conf import settings

from .messages import render_message
from .models import NotificationLog

logger = logging.getLogger('notifications')


def enqueue(*, event_type, recipient, context=None, lang='tr', channel=None, booking=None):
    """Bir bildirimi kuyruğa ekler ve oluşturulan NotificationLog'u döner.

    Telefon numarası yoksa sessizce None döner: her misafirin telefonu olmayabilir
    ve bu, çağıran akışı (rezervasyon onayı vb.) bozacak bir hata değildir.
    """
    recipient = (recipient or '').strip()
    if not recipient:
        return None

    channel = channel or getattr(settings, 'NOTIFICATION_CHANNEL', 'sms')

    try:
        body = render_message(event_type, lang, context or {})
    except KeyError:
        # Bilinmeyen olay tipi programlama hatasıdır; loglanır ama akış bozulmaz.
        logger.error('[NOTIFY] Bilinmeyen olay tipi kuyruğa eklenemedi: %s', event_type)
        return None

    return NotificationLog.objects.create(
        channel=channel,
        recipient=recipient,
        event_type=event_type,
        lang=lang,
        body=body,
        booking=booking,
    )
