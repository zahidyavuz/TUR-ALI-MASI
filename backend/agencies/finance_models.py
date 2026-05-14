"""
agencies/finance_models.py
--------------------------
Finansal Kayıt (Ledger) Modelleri.

AgentFinanceLedger  → Her onaylı satış sonrası net hakediş kaydı.
AgentPayoutRequest  → Acentanın oluşturduğu ödeme talebi.
"""
from django.db import models
from django.utils import timezone
from agencies.models import Agency
from decimal import Decimal


class AgentFinanceLedger(models.Model):
    """
    Her onaylanan rezervasyon sonrası otomatik oluşturulan finansal kayıt.
    booking_ref için unique constraint: aynı rezervasyon iki kez kaydedilmez.
    """
    ENTRY_TYPE_CHOICES = [
        ('sale',       'Satış Hakedişi'),
        ('refund',     'İade Kesintisi'),
        ('adjustment', 'Manuel Düzeltme'),
    ]

    agency         = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='ledger_entries')
    booking_ref    = models.CharField(max_length=50, unique=True)          # Booking.booking_ref
    tour_title     = models.CharField(max_length=255)
    tour_date      = models.DateField(null=True, blank=True)

    gross_amount   = models.DecimalField(max_digits=12, decimal_places=2)  # Müşterinin ödediği
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)  # %10 gibi
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)  # kesilen komisyon
    net_amount     = models.DecimalField(max_digits=12, decimal_places=2)  # acentaya kalan

    entry_type     = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES, default='sale')
    notes          = models.TextField(blank=True, null=True)
    created_at     = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Finansal Kayıt'
        verbose_name_plural = 'Finansal Kayıtlar'
        indexes = [
            models.Index(fields=['agency', '-created_at']),
        ]

    def __str__(self):
        return f"{self.agency.name} | {self.booking_ref} | Net: ₺{self.net_amount}"

    @classmethod
    def create_from_booking(cls, booking):
        """
        Bir Booking nesnesinden finansal kayıt oluşturur.
        Idempotent: aynı booking_ref varsa tekrar oluşturmaz.
        """
        if not hasattr(booking.tour, 'agency') or not booking.tour.agency:
            return None

        agency = booking.tour.agency
        rate   = agency.commission_rate  # örn: Decimal('10.00')
        gross  = booking.total_price

        commission = (gross * rate / Decimal('100')).quantize(Decimal('0.01'))
        net        = (gross - commission).quantize(Decimal('0.01'))

        obj, created = cls.objects.get_or_create(
            booking_ref=booking.booking_ref,
            defaults={
                'agency':            agency,
                'tour_title':        booking.tour.title,
                'tour_date':         booking.start_date,
                'gross_amount':      gross,
                'commission_rate':   rate,
                'commission_amount': commission,
                'net_amount':        net,
                'entry_type':        'sale',
            }
        )
        return obj


class AgentPayoutRequest(models.Model):
    """
    Acentanın "Hakedişi Talep Et" butonuna bastığında oluşturulan talep.
    """
    STATUS_CHOICES = [
        ('pending',   'İncelemede'),
        ('approved',  'Onaylandı'),
        ('paid',      'Ödendi'),
        ('rejected',  'Reddedildi'),
    ]

    agency       = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='payout_requests')
    amount       = models.DecimalField(max_digits=12, decimal_places=2)    # talep edilen net bakiye
    iban         = models.CharField(max_length=34, blank=True, null=True)  # anlık IBAN snapshot
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes  = models.TextField(blank=True, null=True)
    requested_at = models.DateTimeField(default=timezone.now)
    resolved_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']
        verbose_name = 'Hakediş Talebi'
        verbose_name_plural = 'Hakediş Talepleri'

    def __str__(self):
        return f"{self.agency.name} | ₺{self.amount} | {self.get_status_display()}"

    @property
    def available_balance(self):
        """Bu acentanın mevcut çekilebilir net bakiyesi."""
        from django.db.models import Sum
        paid_out = AgentPayoutRequest.objects.filter(
            agency=self.agency, status__in=['approved', 'paid']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_net = AgentFinanceLedger.objects.filter(
            agency=self.agency, entry_type='sale'
        ).aggregate(total=Sum('net_amount'))['total'] or Decimal('0')

        return total_net - paid_out
