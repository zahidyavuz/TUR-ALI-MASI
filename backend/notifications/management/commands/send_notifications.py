"""
Bekleyen SMS / WhatsApp bildirimlerini sağlayıcıya gönderir (kuyruk boşaltma).

Üretimde cron ile sık (ör. dakikada bir) çalıştırılacak şekilde tasarlandı. Her
çalıştırmada `pending` satırları ve deneme hakkı kalmış `failed` satırları çeker,
`NOTIFICATION_PROVIDER` sağlayıcısıyla gönderir ve durumu günceller. Sağlayıcı
yapılandırılmamışsa hiç denemez — sessiz başarısızlık yerine açık uyarı verir.
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from notifications.models import NotificationLog
from notifications.providers import (
    NotificationError,
    ProviderNotConfigured,
    get_provider,
)


class Command(BaseCommand):
    help = 'Bekleyen SMS/WhatsApp bildirimlerini sağlayıcıya gönderir.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=100,
                            help='Bu çalıştırmada işlenecek azami kayıt (varsayılan: 100).')
        parser.add_argument('--max-attempts', type=int, default=3,
                            help='Bir kayıt için azami deneme sayısı (varsayılan: 3).')
        parser.add_argument('--dry-run', action='store_true',
                            help='Göndermeden yalnız kaç kayıt işleneceğini raporlar.')

    def handle(self, *args, **options):
        limit = options['limit']
        max_attempts = options['max_attempts']
        dry_run = options['dry_run']

        try:
            provider = get_provider()
        except ProviderNotConfigured as exc:
            self.stderr.write(self.style.ERROR(f'Sağlayıcı yüklenemedi: {exc}'))
            return

        if not provider.is_configured():
            self.stderr.write(self.style.ERROR(
                f"'{provider.name}' sağlayıcısı yapılandırılmamış (anahtarlar eksik). "
                f'Kuyruk bu çalıştırmada boşaltılmadı.'
            ))
            return

        # pending her zaman; failed yalnız deneme hakkı kaldıysa yeniden denenir.
        qs = NotificationLog.objects.filter(
            Q(status='pending') | Q(status='failed', attempts__lt=max_attempts)
        ).order_by('created_at')[:limit]

        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'[DRY-RUN] {qs.count()} bildirim gönderilecekti ({provider.name}).'
            ))
            return

        sent = 0
        failed = 0
        for log in qs:
            log.attempts += 1
            try:
                result = provider.send(channel=log.channel, recipient=log.recipient, body=log.body)
                log.status = 'sent'
                log.sent_at = timezone.now()
                log.provider = result.provider
                log.message_id = result.message_id or ''
                log.error = ''
                log.save(update_fields=['status', 'sent_at', 'provider', 'message_id', 'error', 'attempts'])
                sent += 1
            except NotificationError as exc:
                log.status = 'failed'
                log.error = str(exc)
                log.save(update_fields=['status', 'error', 'attempts'])
                failed += 1

        self.stdout.write(self.style.SUCCESS(
            f'{sent} bildirim gönderildi, {failed} başarısız ({provider.name}).'
        ))
