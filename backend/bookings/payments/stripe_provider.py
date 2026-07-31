"""
bookings/payments/stripe_provider.py
------------------------------------
Stripe adapter'ı — mevcut (ve şu an tek çalışan) tahsilat yolu.

Buradaki davranış `bookings/views.py`'de dağınık duran eski çağrıların
birebir taşınmış hâlidir: aynı tutar birimi (kuruş), aynı para birimi,
aynı `booking_ref` türetimi (intent id'nin son 8 hanesi). Amaç PSP geçişini
hazırlamak; Stripe akışının davranışını değiştirmek değil.
"""
import logging
from decimal import Decimal
from typing import Any, Mapping, Optional

import stripe
from django.conf import settings

from .base import (
    PaymentError,
    PaymentIntentResult,
    PaymentProvider,
    ProviderNotConfigured,
    RefundResult,
    WebhookEvent,
    WebhookVerificationError,
)

logger = logging.getLogger('bookings')

# Stripe olay tipi → normalize edilmiş tip.
_EVENT_MAP = {
    'payment_intent.succeeded': WebhookEvent.SUCCEEDED,
    'payment_intent.payment_failed': WebhookEvent.FAILED,
}


class StripeProvider(PaymentProvider):
    name = 'stripe'

    def _api_key(self) -> str:
        key = settings.STRIPE_SECRET_KEY
        if not key:
            raise ProviderNotConfigured('Stripe yapılandırılmamış.')
        # Modül düzeyinde global bir anahtar; eski koddaki desen korundu.
        stripe.api_key = key
        return key

    def is_configured(self) -> bool:
        return bool(settings.STRIPE_SECRET_KEY)

    def create_intent(self, *, amount: Decimal, currency: str,
                      metadata: Mapping[str, Any]) -> PaymentIntentResult:
        self._api_key()
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),
                currency=currency.lower(),
                metadata=dict(metadata),
            )
        except stripe.error.StripeError as exc:
            logger.error(f'Stripe PaymentIntent creation failed: {exc}')
            raise PaymentError(str(exc)) from exc

        return PaymentIntentResult(
            provider=self.name,
            intent_id=intent.id,
            client_secret=intent.client_secret,
            booking_ref=intent.id[-8:].upper(),
        )

    def refund(self, *, intent_id: str, amount: Optional[Decimal] = None) -> RefundResult:
        self._api_key()
        params = {'payment_intent': intent_id}
        if amount is not None:
            params['amount'] = int(amount * 100)
        try:
            refund = stripe.Refund.create(**params)
        except Exception as exc:
            # Stripe SDK ağ/kimlik hatalarında StripeError dışı tipler de
            # fırlatabiliyor; iade başarısızlığı sessizce yutulmamalı.
            logger.error(f'Stripe refund failed for intent {intent_id}: {exc}')
            raise PaymentError(str(exc)) from exc

        return RefundResult(provider=self.name, refund_id=getattr(refund, 'id', None))

    def verify_webhook(self, *, payload: bytes, headers: Mapping[str, str]) -> WebhookEvent:
        self._api_key()
        signature = headers.get('HTTP_STRIPE_SIGNATURE')
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception as exc:
            logger.error(f'Stripe webhook verification failed: {exc}')
            raise WebhookVerificationError(str(exc)) from exc

        raw_type = event['type']
        payment_intent = event['data']['object']
        return WebhookEvent(
            provider=self.name,
            type=_EVENT_MAP.get(raw_type, raw_type),
            intent_id=payment_intent['id'],
            raw=dict(payment_intent),
        )

    def register_sub_merchant(self, agency) -> Optional[str]:
        """
        Stripe'ta pazaryeri alt-üye işyeri karşılığı yok.

        Stripe Connect ayrı bir ürün ve TR'de zaten kullanılamıyor; bu akışta
        tahsilat platform hesabında toplanıp acentaya hakediş olarak ödeniyor.
        `None` dönmesi çağırana "bu sağlayıcıda kayıt gerekmiyor" der.
        """
        return None
