"""
bookings/signals.py — PRODUCTION-READY (tam dosya)
---------------------------------------------------
1. booking_status_notification  → Kullanıcı / Acenta bildirimleri (mevcut).
2. create_finance_ledger_entry  → Rezervasyon 'confirmed' olduğunda komisyon
                                   otomatik kesilip AgentFinanceLedger'a yazılır.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Booking
from users.models import Notification

logger = logging.getLogger('bookings')


# ─────────────────────────────────────────────────────────────────────────────
# 1. KULLANICI & ACENTA BİLDİRİMLERİ  (mevcut, aynen korundu)
# ─────────────────────────────────────────────────────────────────────────────
@receiver(post_save, sender=Booking)
def booking_status_notification(sender, instance, **kwargs):
    """Create a Notification for the user when booking status changes."""
    if not instance.user:
        return

    status_messages = {
        'confirmed': {
            'title': 'Rezervasyonunuz Onaylandı! ✅',
            'message': f'{instance.tour.title} turu için ödemeniz alındı. Referans: {instance.booking_ref}',
            'icon': '✅',
        },
        'cancelled': {
            'title': 'Rezervasyonunuz İptal Edildi',
            'message': f'{instance.tour.title} turu için olan rezervasyonunuz ({instance.booking_ref}) iptal edildi.',
            'icon': '❌',
        },
        'failed': {
            'title': 'Ödeme Başarısız',
            'message': f'{instance.tour.title} turu için ödemeniz başarısız oldu. Lütfen tekrar deneyin.',
            'icon': '⚠️',
        },
    }

    msg = status_messages.get(instance.status)
    if msg:
        existing = Notification.objects.filter(
            user=instance.user,
            title=msg['title'],
            action_url='/bookings',
            type='booking'
        ).filter(message__contains=instance.booking_ref).exists()

        if not existing:
            Notification.objects.create(
                user=instance.user,
                title=msg['title'],
                message=msg['message'],
                icon=msg['icon'],
                type='booking',
                action_url='/bookings'
            )

    # Acenta sahibine de bildirim
    if instance.status == 'confirmed' and hasattr(instance.tour, 'agency') and instance.tour.agency:
        agency_owner = instance.tour.agency.owner
        if agency_owner:
            Notification.objects.create(
                user=agency_owner,
                title='Yeni Onaylı Rezervasyon! 🎉',
                message=f'{instance.tour.title} turu için yeni bir rezervasyon onaylandı. Ref: {instance.booking_ref}',
                icon='🎉',
                type='booking',
                action_url='/agency/dashboard'
            )


# ─────────────────────────────────────────────────────────────────────────────
# 2. OTOMATİK KOMİSYON KESİNTİSİ & FİNANSAL KAYIT (YENİ)
# ─────────────────────────────────────────────────────────────────────────────
@receiver(post_save, sender=Booking)
def create_finance_ledger_entry(sender, instance, created, **kwargs):
    """
    Bir Booking 'confirmed' durumuna geçtiğinde otomatik olarak:
      • Acentanın komisyon oranını çek (agency.commission_rate).
      • Net hakedişi hesapla (gross - komisyon).
      • AgentFinanceLedger'a tek satır olarak kaydet (idempotent).

    Neden Signal, neden save() override değil?
      → Booking.save() Stripe webhook'tan da, admin panelinden de tetiklenebilir.
        Signal bu iki kaynaktan bağımsız çalışır ve test edilebilir.
    """
    if instance.status != 'confirmed':
        return

    # Tour'un bir acentası yoksa finansal kayıt tutulmaz
    tour = instance.tour
    if not hasattr(tour, 'agency') or not tour.agency:
        return

    try:
        from agencies.finance_models import AgentFinanceLedger
        ledger = AgentFinanceLedger.create_from_booking(instance)
        if ledger:
            logger.info(
                f"[FINANCE] Ledger entry created: booking={instance.booking_ref} "
                f"gross=₺{ledger.gross_amount} commission=₺{ledger.commission_amount} "
                f"net=₺{ledger.net_amount}"
            )
    except Exception as e:
        # Finansal kayıt hatası kritiktir — sessizce yutulmaz, log'a düşer.
        logger.error(
            f"[FINANCE] Failed to create ledger entry for booking {instance.booking_ref}: {e}",
            exc_info=True
        )
