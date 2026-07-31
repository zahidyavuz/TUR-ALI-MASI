"""
notifications/providers/base.py
-------------------------------
SMS / WhatsApp sağlayıcı soyutlaması.

Neden bu katman var: ödeme adaptöründe (bookings/payments/base.py) olduğu gibi,
gönderim kanalı (Twilio / Netgsm / WhatsApp Cloud API) ileride değişebilir. Kuyruğu
boşaltan komut somut bir SDK'yı değil aşağıdaki dar arayüzü tanır; sağlayıcı
değiştirmek için yalnız yeni bir adapter + env anahtarı gerekir, akış kodu sabit
kalır. Şimdilik tek somut adapter `StubProvider`: mesajı loglar, dış çağrı yapmaz.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


class NotificationError(Exception):
    """Gönderim iş mantığıyla ilgili bir sebeple başarısız oldu."""


class ProviderNotConfigured(NotificationError):
    """Sağlayıcının anahtarları eksik ya da bilinmeyen bir sağlayıcı istendi."""


@dataclass(frozen=True)
class SendResult:
    provider: str
    # Sağlayıcının ürettiği ileti kimliği (varsa); teslim durumu bununla izlenir.
    message_id: Optional[str]


class NotificationProvider(ABC):
    """Tüm SMS/WhatsApp adapter'larının uyduğu sözleşme."""

    name = 'base'

    @abstractmethod
    def is_configured(self) -> bool:
        """Anahtarlar tam mı? Değilse kuyruk boşaltma sessizce denemek yerine durur."""

    @abstractmethod
    def send(self, *, channel: str, recipient: str, body: str) -> SendResult:
        """Tek bir iletiyi gönderir. Başarısızsa NotificationError fırlatır."""
