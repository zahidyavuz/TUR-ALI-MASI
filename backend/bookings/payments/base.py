"""
bookings/payments/base.py
-------------------------
Ödeme sağlayıcı (PSP) soyutlaması.

Neden bu katman var: Stripe Türkiye'de yerleşik bir işletme adına tahsilat
yapamaz. Gerçek gelir için iyzico Pazaryeri ya da PayTR Platform Transfer
gerekiyor ve bu geçiş sırasında `bookings/views.py`'nin yeniden yazılmaması
lazım. Bu yüzden rezervasyon akışı artık somut bir SDK'yı değil, aşağıdaki
dar arayüzü tanıyor.

Arayüz bilinçli olarak dar: rezervasyon akışının gerçekten ihtiyaç duyduğu
dört işlem var (ödeme başlat, iade et, webhook doğrula, alt-üye işyeri kaydı).
Komisyon hesabı sağlayıcıya göre değişmediği için burada, tek yerde yapılır.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Mapping, Optional

# Ledger ve PSP tutarlarının tamamı 2 basamağa yuvarlanır.
CENTS = Decimal('0.01')


class PaymentError(Exception):
    """Sağlayıcı çağrısı iş mantığıyla ilgili bir sebeple başarısız oldu (400)."""


class ProviderNotConfigured(PaymentError):
    """Sağlayıcının anahtarları eksik — istek alınamaz (503)."""


class WebhookVerificationError(PaymentError):
    """Webhook imzası doğrulanamadı (400)."""


@dataclass(frozen=True)
class PaymentIntentResult:
    provider: str
    intent_id: str
    client_secret: Optional[str]
    # Rezervasyon referansı sağlayıcının ödeme kimliğinden türetilir; hangi
    # ödemenin hangi bilete ait olduğu böylece PSP panelinden de izlenebilir.
    booking_ref: str


@dataclass(frozen=True)
class RefundResult:
    provider: str
    refund_id: Optional[str]


@dataclass(frozen=True)
class WebhookEvent:
    """
    Sağlayıcıdan bağımsız, normalize edilmiş webhook olayı.

    `type` yalnız iki değeri anlamlıdır: `payment.succeeded` ve
    `payment.failed`. Diğer her şey ham tipiyle geçer ve çağıran tarafından
    yok sayılır — böylece yeni bir PSP olay tipi eklediğinde akış patlamaz.
    """
    SUCCEEDED = 'payment.succeeded'
    FAILED = 'payment.failed'

    provider: str
    type: str
    intent_id: str
    raw: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CommissionSplit:
    gross: Decimal
    rate: Decimal
    commission: Decimal
    net: Decimal


def to_decimal(value) -> Decimal:
    """
    Para/oran değerlerini güvenle Decimal'e çevirir.

    Kaydedilmemiş model nesnelerinde alan değerleri Python'un ham tipiyle
    durur: `Agency.commission_rate` alanının varsayılanı `10.00` **float**
    literali olduğu için taze bir Agency nesnesinde `rate` float gelir ve
    `float * Decimal` TypeError verir. Float'lar önce str üzerinden
    çevrilir; `Decimal(0.1)` gibi ikili yuvarlama artıklarını almamak için.
    """
    if isinstance(value, Decimal):
        return value
    if isinstance(value, float):
        return Decimal(str(value))
    return Decimal(value)


class PaymentProvider(ABC):
    """Tüm PSP adapter'larının uyduğu sözleşme."""

    name = 'base'

    @abstractmethod
    def is_configured(self) -> bool:
        """Anahtarlar tam mı? Değilse akış 503 ile durur, sessizce denenmez."""

    @abstractmethod
    def create_intent(self, *, amount: Decimal, currency: str,
                      metadata: Mapping[str, Any]) -> PaymentIntentResult:
        """Tahsilat başlatır. Tutar her zaman sunucuda hesaplanmış olmalıdır."""

    @abstractmethod
    def refund(self, *, intent_id: str, amount: Optional[Decimal] = None) -> RefundResult:
        """`amount` verilmezse tam iade."""

    @abstractmethod
    def verify_webhook(self, *, payload: bytes, headers: Mapping[str, str]) -> WebhookEvent:
        """İmzayı doğrular ve olayı normalize eder. Doğrulanamazsa hata fırlatır."""

    def register_sub_merchant(self, agency) -> Optional[str]:
        """
        Acentayı PSP'de alt-üye işyeri olarak kaydeder ve kimliğini döner.

        Pazaryeri modeli olmayan sağlayıcılarda (Stripe platform hesabı)
        anlamsızdır; varsayılan `None` döner ve çağıran bunu "bu sağlayıcı
        alt-üye işyeri kullanmıyor" diye okur.
        """
        return None

    @staticmethod
    def split_commission(gross, rate) -> CommissionSplit:
        """
        Platform komisyonunu ve acentanın net hakedişini hesaplar.

        Sağlayıcıdan bağımsızdır: iyzico'da tutar tahsilat anında bölünür,
        Stripe'ta ise tahsilat platformda toplanıp hakediş sonradan ödenir —
        ama muhasebe her iki durumda da aynı sayıları üretmek zorunda.
        """
        gross_d = to_decimal(gross).quantize(CENTS, rounding=ROUND_HALF_UP)
        rate_d = to_decimal(rate)
        commission = (gross_d * rate_d / Decimal('100')).quantize(CENTS, rounding=ROUND_HALF_UP)
        return CommissionSplit(
            gross=gross_d,
            rate=rate_d,
            commission=commission,
            net=(gross_d - commission).quantize(CENTS, rounding=ROUND_HALF_UP),
        )
