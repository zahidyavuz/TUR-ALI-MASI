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

    # İade kaydı aynı rezervasyona ait ikinci bir satırdır; `booking_ref`
    # unique olduğu için ters kayıt bu son ekle ayrılır.
    REFUND_REF_SUFFIX = '-REFUND'

    @staticmethod
    def _agency_of(booking):
        # Booking.tour is nullable — shuttle bookings use shuttle_route instead
        # (see bookings/models.py). Either one carries an `agency` FK.
        service = booking.tour or booking.shuttle_route
        if not service or not hasattr(service, 'agency') or not service.agency:
            return None, None
        return service, service.agency

    @classmethod
    def create_from_booking(cls, booking):
        """
        Bir Booking nesnesinden finansal kayıt oluşturur.
        Idempotent: aynı booking_ref varsa tekrar oluşturmaz.
        """
        service, agency = cls._agency_of(booking)
        if agency is None:
            return None

        # Komisyon matematiği PSP'den bağımsız tek yerde durur; ayrıca
        # kaydedilmemiş model nesnelerinde float gelebilen `commission_rate`
        # ve `total_price` burada Decimal'e çevrilir (bkz. payments.base).
        from bookings.payments import PaymentProvider
        split = PaymentProvider.split_commission(booking.total_price, agency.commission_rate)

        obj, created = cls.objects.get_or_create(
            booking_ref=booking.booking_ref,
            defaults={
                'agency':            agency,
                # tour_title stores the service title for either a tour or a
                # shuttle route — field kept as-is to avoid a schema change.
                'tour_title':        service.title,
                'tour_date':         booking.start_date,
                'gross_amount':      split.gross,
                'commission_rate':   split.rate,
                'commission_amount': split.commission,
                'net_amount':        split.net,
                'entry_type':        'sale',
            }
        )
        return obj

    @classmethod
    def create_refund_entry(cls, booking):
        """
        İade sonrası ters kayıt: satış satırının negatifi.

        Satış kaydı silinmez — muhasebe izi bozulmasın diye karşısına eksi
        tutarlı bir satır yazılır, bakiye toplamı kendiliğinden düşer.
        Idempotent: aynı rezervasyon iki kez iade edilse de tek satır oluşur.
        """
        service, agency = cls._agency_of(booking)
        if agency is None:
            return None

        # Ters kayıt satış satırındaki tutarları baz alır; komisyon oranı o
        # günden bu yana değişmiş olabilir ve iade edilen para eski tutardır.
        sale = cls.objects.filter(booking_ref=booking.booking_ref, entry_type='sale').first()
        if sale is None:
            return None

        obj, _ = cls.objects.get_or_create(
            booking_ref=f'{booking.booking_ref}{cls.REFUND_REF_SUFFIX}',
            defaults={
                'agency':            agency,
                'tour_title':        sale.tour_title,
                'tour_date':         sale.tour_date,
                'gross_amount':      -sale.gross_amount,
                'commission_rate':   sale.commission_rate,
                'commission_amount': -sale.commission_amount,
                'net_amount':        -sale.net_amount,
                'entry_type':        'refund',
                'notes':             f'{booking.booking_ref} iptal edildi, tutar iade edildi.',
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

        # Tüm kayıt tipleri toplanır: iade satırları negatif tutarlıdır.
        total_net = AgentFinanceLedger.objects.filter(
            agency=self.agency
        ).aggregate(total=Sum('net_amount'))['total'] or Decimal('0')

        return total_net - paid_out
