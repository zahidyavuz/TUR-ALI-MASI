"""
bookings/payments/iyzico_provider.py
------------------------------------
iyzico Pazaryeri adapter'ı — **İSKELET**.

Durum: başvuru/anahtar bekleniyor (F2-06 adım 1, insan aksiyonu). Bu dosya
arayüzün iyzico tarafındaki karşılıklarını ve alt-üye işyeri payload'ını
sabitler; ağ çağrıları henüz yazılmadı.

Yarım çalışan bir ödeme entegrasyonu, hiç çalışmayandan daha tehlikelidir —
bu yüzden her metot ya "yapılandırılmamış" ya da "tamamlanmadı" diye açıkça
patlar. Sessizce başarılı görünen hiçbir yol yok.

Tamamlanınca yapılacaklar (endpoint karşılıkları):
  create_intent       → POST /payment/iyzipos/checkoutform/initialize/auth/ecom
                        (pazaryeri modelinde `paymentItem.subMerchantKey` +
                         `subMerchantPrice` ile tutar tahsilat anında bölünür)
  refund              → POST /payment/refund
  verify_webhook      → iyzico bildirim URL'ine POST eder; imza
                        `IYZICO_WEBHOOK_SECRET` ile doğrulanır
  register_sub_merchant → POST /onboarding/submerchant
                        (dönen `subMerchantKey` → `Agency.sub_merchant_id`)

Kimlik doğrulama iyzico'nun PKI string + HMAC-SHA256 `Authorization` başlığını
gerektirir; SDK (`iyzipay`) bağımlılığı bilinçli olarak henüz eklenmedi çünkü
sandbox anahtarı olmadan tek satırı bile doğrulanamaz.
"""
from decimal import Decimal
from typing import Any, Mapping, Optional

from django.conf import settings

from .base import (
    PaymentError,
    PaymentIntentResult,
    PaymentProvider,
    ProviderNotConfigured,
    RefundResult,
    WebhookEvent,
)

_NOT_IMPLEMENTED = (
    'iyzico entegrasyonu henüz tamamlanmadı. Pazaryeri başvurusu onaylanıp '
    'sandbox anahtarları girilene kadar ödeme sağlayıcısı olarak Stripe kullanın '
    '(PAYMENT_PROVIDER=stripe).'
)


class IyzicoProvider(PaymentProvider):
    name = 'iyzico'

    def is_configured(self) -> bool:
        return bool(
            getattr(settings, 'IYZICO_API_KEY', '')
            and getattr(settings, 'IYZICO_SECRET_KEY', '')
            and getattr(settings, 'IYZICO_BASE_URL', '')
        )

    def _require_config(self):
        if not self.is_configured():
            raise ProviderNotConfigured(
                'iyzico anahtarları eksik (IYZICO_API_KEY / IYZICO_SECRET_KEY / IYZICO_BASE_URL).'
            )

    def create_intent(self, *, amount: Decimal, currency: str,
                      metadata: Mapping[str, Any]) -> PaymentIntentResult:
        self._require_config()
        raise PaymentError(_NOT_IMPLEMENTED)

    def refund(self, *, intent_id: str, amount: Optional[Decimal] = None) -> RefundResult:
        self._require_config()
        raise PaymentError(_NOT_IMPLEMENTED)

    def verify_webhook(self, *, payload: bytes, headers: Mapping[str, str]) -> WebhookEvent:
        self._require_config()
        raise PaymentError(_NOT_IMPLEMENTED)

    # ─── ALT-ÜYE İŞYERİ (SUB-MERCHANT) ───────────────────────────────────────
    @staticmethod
    def build_sub_merchant_payload(agency) -> dict:
        """
        iyzico `POST /onboarding/submerchant` gövdesini hazırlar.

        Ağdan bağımsız saf fonksiyon: hangi acenta alanının iyzico'da neye
        karşılık geldiği burada sabitlenir ve testte doğrulanabilir. Eksik
        alan varsa çağrı yapılmadan, hangi alanın eksik olduğunu söyleyen bir
        hata alınır — iyzico'nun jenerik hata kodunu debug etmekten iyidir.

        Tüzel kişi (`company`) ve şahıs işletmesi farklı `subMerchantType`
        ister; vergi no yalnız tüzel kişide zorunludur.
        """
        is_company = agency.legal_entity_type == 'company'
        required = {
            'name': agency.name,
            'iban': agency.iban,
            'bank_account_holder': agency.bank_account_holder,
            'email': agency.email,
            'phone': agency.phone,
            'address': agency.address,
        }
        if is_company:
            required['tax_id'] = agency.tax_id
            required['tax_office'] = agency.tax_office

        missing = sorted(key for key, value in required.items() if not value)
        if missing:
            raise PaymentError(
                'Alt-üye işyeri kaydı için eksik alanlar: ' + ', '.join(missing)
            )

        payload = {
            'locale': 'tr',
            # Bir acenta için kayıt en fazla bir kez başarılı olmalı; iyzico
            # aynı conversationId ile gelen tekrarı ayırt edebilsin.
            'conversationId': f'agency-{agency.id}',
            'subMerchantExternalId': str(agency.id),
            'subMerchantType': 'LIMITED_OR_JOINT_STOCK_COMPANY' if is_company else 'PERSONAL',
            'address': agency.address,
            'email': agency.email,
            'gsmNumber': agency.phone,
            'name': agency.name,
            'iban': agency.iban,
            'currency': 'TRY',
        }
        if is_company:
            payload['taxOffice'] = agency.tax_office
            payload['taxNumber'] = agency.tax_id
            payload['legalCompanyTitle'] = agency.name
        else:
            payload['contactName'] = agency.bank_account_holder
            payload['contactSurname'] = ''
        return payload

    def register_sub_merchant(self, agency) -> Optional[str]:
        # Payload önce doğrulanır: eksik alan hatası yapılandırma hatasından
        # ayırt edilebilir olsun.
        self.build_sub_merchant_payload(agency)
        self._require_config()
        raise PaymentError(_NOT_IMPLEMENTED)
