"""
notifications/providers/__init__.py
-----------------------------------
Sağlayıcı fabrikası. bookings/payments ile aynı desen: kayıtlı sağlayıcılar
`PROVIDERS` sözlüğünde durur, `get_provider()` `settings.NOTIFICATION_PROVIDER`
değerine (varsayılan 'stub') göre örnek üretir. Sağlayıcılar durumsuzdur ve
önbelleğe alınmaz; böylece testler `override_settings` ile sağlayıcıyı
değiştirebilir.
"""
from django.conf import settings

from .base import (
    NotificationError,
    NotificationProvider,
    ProviderNotConfigured,
    SendResult,
)
from .stub import StubProvider

PROVIDERS = {
    StubProvider.name: StubProvider,
}


def get_provider(name=None) -> NotificationProvider:
    key = (name or getattr(settings, 'NOTIFICATION_PROVIDER', 'stub') or 'stub').lower()
    try:
        return PROVIDERS[key]()
    except KeyError:
        raise ProviderNotConfigured(
            f"Bilinmeyen bildirim sağlayıcısı: '{key}'. "
            f"Tanımlı sağlayıcılar: {', '.join(sorted(PROVIDERS))}."
        )


__all__ = [
    'get_provider',
    'PROVIDERS',
    'NotificationProvider',
    'NotificationError',
    'ProviderNotConfigured',
    'SendResult',
]
