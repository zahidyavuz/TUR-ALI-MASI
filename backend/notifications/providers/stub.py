"""
notifications/providers/stub.py
-------------------------------
Gerçek bir SMS/WhatsApp sağlayıcısı bağlanana kadar kullanılan varsayılan adapter.
Mesajı yalnız log'a yazar; hiçbir dış servise çağrı yapmaz. Böylece tüm gönderim
akışı (kuyruğa yaz → komutla boşalt → durum güncelle) sağlayıcı olmadan da uçtan
uca çalışır ve test edilebilir. Üretimde `NOTIFICATION_PROVIDER` env değişkeni
gerçek bir adaptere çevrildiğinde bu dosyaya dokunulmaz.
"""
import logging

from .base import NotificationProvider, SendResult

logger = logging.getLogger('notifications')


class StubProvider(NotificationProvider):
    name = 'stub'

    def is_configured(self) -> bool:
        # Stub'ın dış anahtara ihtiyacı yok; her zaman "yapılandırılmış" sayılır.
        return True

    def send(self, *, channel: str, recipient: str, body: str) -> SendResult:
        logger.info('[NOTIFY:%s] → %s\n%s', channel, recipient, body)
        return SendResult(provider=self.name, message_id=None)
