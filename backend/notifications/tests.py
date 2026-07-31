"""
notifications uygulaması testleri: render (TR/EN), kuyruğa ekleme (enqueue) ve
kuyruk boşaltma komutu (send_notifications) — stub, yapılandırılmamış sağlayıcı
ve deneme limiti yolları.
"""
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase, override_settings

from notifications import providers
from notifications.messages import render_message
from notifications.models import NotificationLog
from notifications.providers.base import NotificationError, NotificationProvider, SendResult
from notifications.service import enqueue


class _FailingProvider(NotificationProvider):
    name = 'failing'

    def is_configured(self):
        return True

    def send(self, *, channel, recipient, body):
        raise NotificationError('sağlayıcı reddetti')


class MessageRenderTests(TestCase):
    def test_render_tr(self):
        text = render_message('booking_confirmed', 'tr', {
            'name': 'Ada', 'service': 'Kapadokya turu', 'ref': 'REF1', 'url': 'http://x',
        })
        self.assertIn('Ada', text)
        self.assertIn('onaylandı', text)
        self.assertIn('REF1', text)

    def test_render_en(self):
        text = render_message('booking_confirmed', 'en', {
            'name': 'Ada', 'service': 'Cappadocia tour', 'ref': 'REF1', 'url': 'http://x',
        })
        self.assertIn('confirmed', text)

    def test_render_unknown_lang_falls_back_to_tr(self):
        text = render_message('tour_reminder', 'de', {
            'name': 'Ada', 'service': 'X', 'date': '01.01.2027',
            'point': 'Meydan', 'time': '08:00', 'hotel': 'Otel',
        })
        self.assertIn('Buluşma noktası', text)

    def test_missing_context_key_does_not_raise(self):
        # SafeDict: eksik alan boş string olur, KeyError fırlamaz.
        text = render_message('booking_confirmed', 'tr', {'name': 'Ada'})
        self.assertIn('Ada', text)


class EnqueueTests(TestCase):
    def test_enqueue_creates_pending_log(self):
        log = enqueue(
            event_type='booking_confirmed',
            recipient='+905551112233',
            context={'name': 'Ada', 'service': 'Tur', 'ref': 'R1', 'url': 'http://x'},
        )
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'pending')
        self.assertEqual(log.recipient, '+905551112233')
        self.assertIn('Ada', log.body)

    def test_enqueue_without_recipient_returns_none(self):
        self.assertIsNone(enqueue(event_type='booking_confirmed', recipient='', context={}))
        self.assertIsNone(enqueue(event_type='booking_confirmed', recipient=None, context={}))
        self.assertEqual(NotificationLog.objects.count(), 0)

    def test_enqueue_unknown_event_returns_none(self):
        self.assertIsNone(enqueue(event_type='does_not_exist', recipient='+90555', context={}))
        self.assertEqual(NotificationLog.objects.count(), 0)


@override_settings(NOTIFICATION_PROVIDER='stub')
class DrainCommandTests(TestCase):
    def _make(self, **kw):
        defaults = dict(
            channel='sms', recipient='+905551112233', event_type='booking_confirmed',
            lang='tr', body='test',
        )
        defaults.update(kw)
        return NotificationLog.objects.create(**defaults)

    def test_drain_marks_sent(self):
        self._make()
        self._make()
        out = StringIO()
        call_command('send_notifications', stdout=out)
        self.assertEqual(NotificationLog.objects.filter(status='sent').count(), 2)
        for log in NotificationLog.objects.all():
            self.assertIsNotNone(log.sent_at)
            self.assertEqual(log.attempts, 1)
            self.assertEqual(log.provider, 'stub')

    def test_dry_run_leaves_pending(self):
        self._make()
        call_command('send_notifications', '--dry-run', stdout=StringIO())
        self.assertEqual(NotificationLog.objects.filter(status='pending').count(), 1)

    @override_settings(NOTIFICATION_PROVIDER='no-such-provider')
    def test_unconfigured_provider_leaves_pending(self):
        self._make()
        call_command('send_notifications', stdout=StringIO(), stderr=StringIO())
        self.assertEqual(NotificationLog.objects.filter(status='pending').count(), 1)

    @override_settings(NOTIFICATION_PROVIDER='failing')
    def test_failed_retry_respects_max_attempts(self):
        log = self._make()
        with patch.dict(providers.PROVIDERS, {'failing': _FailingProvider}):
            # İlk iki çalıştırma: attempts 1, 2 → hâlâ yeniden denenebilir.
            call_command('send_notifications', '--max-attempts', '3', stdout=StringIO())
            call_command('send_notifications', '--max-attempts', '3', stdout=StringIO())
            log.refresh_from_db()
            self.assertEqual(log.status, 'failed')
            self.assertEqual(log.attempts, 2)
            # Üçüncü çalıştırma attempts=3 yapar; artık limit dolar.
            call_command('send_notifications', '--max-attempts', '3', stdout=StringIO())
            log.refresh_from_db()
            self.assertEqual(log.attempts, 3)
            # Limit dolduğu için dördüncü çalıştırma bu kaydı işlemez.
            call_command('send_notifications', '--max-attempts', '3', stdout=StringIO())
            log.refresh_from_db()
            self.assertEqual(log.attempts, 3)
