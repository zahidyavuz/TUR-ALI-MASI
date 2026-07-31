from django.db import models

from .messages import EVENT_CHOICES


class NotificationLog(models.Model):
    """SMS / WhatsApp gönderim kuyruğu (DB-kuyruk deseni).

    Neden kuyruk: gönderim, rezervasyon/iptal isteğinin kritik yolunda değildir;
    sağlayıcı yavaşsa ya da düşükse kullanıcı akışını bloklamamalı. Olay anında
    buraya `pending` bir satır yazılır; `send_notifications` yönetim komutu (cron
    ile periyodik) satırları çeker, sağlayıcıya gönderir ve durumu günceller.
    Celery yerine DB-kuyruk: projede zaten Celery yok ve bu hacim için bir tablo
    yeterli, işletim yükü getirmiyor.
    """

    CHANNEL_CHOICES = [
        ('sms', 'SMS'),
        ('whatsapp', 'WhatsApp'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Beklemede'),
        ('sent', 'Gönderildi'),
        ('failed', 'Başarısız'),
    ]

    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='sms')
    recipient = models.CharField(max_length=32, help_text='Telefon numarası (E.164 önerilir)')
    event_type = models.CharField(max_length=40, choices=EVENT_CHOICES)
    lang = models.CharField(max_length=5, default='tr')
    body = models.TextField(help_text='Kuyruğa yazıldığı an render edilmiş nihai metin')

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', db_index=True)
    attempts = models.PositiveIntegerField(default=0)
    error = models.TextField(blank=True, default='')

    # Gönderim başarılı olduğunda sağlayıcıdan dönen bilgiler.
    provider = models.CharField(max_length=40, blank=True, default='')
    message_id = models.CharField(max_length=255, blank=True, default='')

    # İlgili rezervasyon (varsa). SET_NULL: rezervasyon silinse de gönderim izi kalır.
    booking = models.ForeignKey(
        'bookings.Booking', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='notification_logs',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Bildirim Kaydı'
        verbose_name_plural = 'Bildirim Kayıtları'

    def __str__(self):
        return f'{self.get_event_type_display()} → {self.recipient} [{self.status}]'
