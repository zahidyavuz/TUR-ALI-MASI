from decimal import Decimal, ROUND_HALF_UP

from django.db import models
from agencies.models import Agency, Menu


# ── İptal / İade Politikası Motoru (F4-04) ───────────────────────────────────
# Her politika, "hizmet başlangıcına kalan saat" eşiklerini iade yüzdesine
# bağlar. Eşikler AZALAN sırada değerlendirilir: kalan saat >= eşik olan İLK
# satırın yüzdesi uygulanır; hiçbiri tutmazsa iade %0'dır. Bu tablo, F1-06'daki
# sabit "24 saat = iptal edilemez" kuralının yerini alır.
CANCELLATION_POLICIES = {
    'flexible': {'label': 'Esnek', 'tiers': ((24, 100), (0, 0))},
    'moderate': {'label': 'Orta',  'tiers': ((72, 100), (24, 50), (0, 0))},
    'strict':   {'label': 'Katı',  'tiers': ((168, 50), (0, 0))},
}
CANCELLATION_POLICY_CHOICES = [(key, val['label']) for key, val in CANCELLATION_POLICIES.items()]


def refund_percent_for_policy(policy, hours_before):
    """
    Politika koduna ve hizmet başlangıcına kalan saate (hours_before) göre
    iade yüzdesini (0-100) döndürür. Bilinmeyen politika 'flexible' sayılır.
    """
    tiers = CANCELLATION_POLICIES.get(policy, CANCELLATION_POLICIES['flexible'])['tiers']
    for threshold_hours, percent in tiers:
        if hours_before >= threshold_hours:
            return percent
    return 0


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, max_length=100)
    icon = models.CharField(max_length=50, blank=True, null=True)  # e.g. emoji or icon class name
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Tour(models.Model):
    id = models.SlugField(primary_key=True, max_length=100)  # e.g. 'kapadokya'
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='tours', null=True, blank=True)
    title = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)
    reviews_count = models.IntegerField(default=0)

    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # e.g. 2400
    discount = models.CharField(max_length=50, blank=True, null=True)  # e.g. '%25'
    fomo_count = models.IntegerField(default=0)

    duration = models.CharField(max_length=100)  # e.g. '3 Gün, 2 Gece'
    guide = models.CharField(max_length=255)  # e.g. 'Türkçe, İngilizce'
    accommodation = models.CharField(max_length=255, blank=True, null=True)
    transportation = models.CharField(max_length=255, blank=True, null=True)

    image_main = models.ImageField(upload_to='tours/')
    image_sub1 = models.ImageField(upload_to='tours/', blank=True, null=True)
    image_sub2 = models.ImageField(upload_to='tours/', blank=True, null=True)

    description = models.TextField()
    # Keep old category CharField for backward compat, add FK
    category = models.CharField(max_length=255)  # legacy field: 'culture, romantic, history'
    category_obj = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='tours')
    filmed_in = models.CharField(max_length=255, blank=True, null=True)

    included = models.JSONField(default=list, blank=True)
    excluded = models.JSONField(default=list, blank=True)

    # İptal koşulları: iptal anında iade yüzdesi bu politikaya göre hesaplanır
    # (bkz. CANCELLATION_POLICIES ve bookings.views.BookingViewSet.cancel).
    cancellation_policy = models.CharField(
        max_length=20, choices=CANCELLATION_POLICY_CHOICES, default='flexible',
    )

    def __str__(self):
        return self.title


class TourItinerary(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='itinerary_steps')
    day = models.IntegerField()
    title = models.CharField(max_length=255)
    description = models.TextField()

    class Meta:
        ordering = ['day']

    def __str__(self):
        return f"{self.tour.title} - Day {self.day}"


class TourAvailability(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='availability_slots')
    date = models.DateField()
    max_capacity = models.IntegerField(default=20)
    booked_count = models.IntegerField(default=0)
    # Gün bazlı fiyat. Boşsa turun temel fiyatı (Tour.price) geçerlidir —
    # 0 ile "ücretsiz" ayırt edilebilsin diye null kullanılıyor, 0 default değil.
    price_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # Kontenjan dolu olmasa da acenta günü satışa kapatabilir (tatil, bakım vb.).
    is_closed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('tour', 'date')
        ordering = ['date']
        verbose_name_plural = "Tour Availabilities"

    @property
    def remaining(self):
        return self.max_capacity - self.booked_count

    @property
    def is_available(self):
        return not self.is_closed and self.remaining > 0

    @property
    def effective_price(self):
        """O güne uygulanacak kişi başı fiyat."""
        return self.price_override if self.price_override is not None else self.tour.price

    def __str__(self):
        return f"{self.tour.title} - {self.date} ({self.remaining} remaining)"


class Combo(models.Model):
    """
    Küratörlü paket: bir Tour + bir restoran Menüsü, tek ödemede indirimli
    satılır (F5-03). Fiyat her zaman sunucuda hesaplanır — indirim, turun o
    güne ait geçerli fiyatı ile menünün geçerli fiyatının TOPLAMINA uygulanır.
    Restoran/menü tarafında kapasite kavramı yok (F5-02'de ertelendi); bu
    nedenle satın alırken yalnızca turun kontenjanı atomik olarak kilitlenir.
    """
    id = models.SlugField(primary_key=True, max_length=100)  # e.g. 'kapadokya-museum'
    title = models.CharField(max_length=255)
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='combos')
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name='combos')
    # İndirim yüzdesi (0-100). Toplam (tur + menü) üzerine uygulanır.
    discount_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @staticmethod
    def _q(value):
        """Para değerini 2 ondalığa yuvarlar (ROUND_HALF_UP)."""
        return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def bundle_unit_price(self, tour_unit_price, menu_unit_price):
        """
        Kişi başı indirimli paket fiyatı. Çağıran, turun o güne ait geçerli
        fiyatını (TourAvailability.effective_price) ve menünün geçerli fiyatını
        verir; indirim ikisinin toplamına uygulanır.
        """
        original = Decimal(tour_unit_price) + Decimal(menu_unit_price)
        discounted = original * (Decimal('100') - self.discount_rate) / Decimal('100')
        return self._q(discounted)

    @property
    def original_unit_price(self):
        """Vitrin için indirimsiz kişi başı toplam (tur temel + menü geçerli)."""
        return self._q(Decimal(self.tour.price) + Decimal(self.menu.effective_price()))

    @property
    def bundle_price(self):
        """Vitrin için indirimli kişi başı fiyat (tur temel fiyatı baz alınır)."""
        return self.bundle_unit_price(self.tour.price, self.menu.effective_price())

    @property
    def savings(self):
        """Vitrin için kişi başı tasarruf tutarı."""
        return self._q(self.original_unit_price - self.bundle_price)

    def __str__(self):
        return f"{self.title} ({self.tour.title} + {self.menu.name})"
