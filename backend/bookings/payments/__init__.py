"""
bookings/payments
-----------------
Ödeme sağlayıcı adapter'ları. Rezervasyon akışı somut bir SDK'yı değil,
`get_provider()` ile seçilen `PaymentProvider` arayüzünü kullanır.

Sağlayıcı seçimi `PAYMENT_PROVIDER` ortam değişkeniyle yapılır
(`stripe` | `iyzico`); varsayılan `stripe`.
"""
from django.conf import settings

from .base import (
    CommissionSplit,
    PaymentError,
    PaymentIntentResult,
    PaymentProvider,
    ProviderNotConfigured,
    RefundResult,
    WebhookEvent,
    WebhookVerificationError,
    to_decimal,
)
from .iyzico_provider import IyzicoProvider
from .stripe_provider import StripeProvider

PROVIDERS = {
    StripeProvider.name: StripeProvider,
    IyzicoProvider.name: IyzicoProvider,
}


def get_provider(name=None) -> PaymentProvider:
    """
    Yapılandırılmış sağlayıcıyı döner.

    Örnek oluşturmak ucuz (durum tutmuyorlar) ve önbelleğe alınmıyor: ayarlar
    testte `override_settings` ile değiştirilebilsin diye her çağrıda taze
    okunuyor.
    """
    key = (name or getattr(settings, 'PAYMENT_PROVIDER', 'stripe') or 'stripe').lower()
    try:
        return PROVIDERS[key]()
    except KeyError:
        raise ProviderNotConfigured(
            f"Bilinmeyen ödeme sağlayıcısı: '{key}'. "
            f"Geçerli değerler: {', '.join(sorted(PROVIDERS))}."
        )


__all__ = [
    'CommissionSplit',
    'IyzicoProvider',
    'PaymentError',
    'PaymentIntentResult',
    'PaymentProvider',
    'ProviderNotConfigured',
    'RefundResult',
    'StripeProvider',
    'WebhookEvent',
    'WebhookVerificationError',
    'get_provider',
    'to_decimal',
]
