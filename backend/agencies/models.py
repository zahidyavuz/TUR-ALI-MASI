from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Agency(models.Model):
    BUSINESS_TYPE_CHOICES = [
        ('acenta', 'Tur Acentası'),
        ('restoran', 'Restoran'),
        ('kafe', 'Kafe'),
    ]

    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agency_profile', null=True, blank=True)
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='agencies/logos/', blank=True, null=True)
    trust_score = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)
    description = models.TextField(blank=True, null=True)

    # Business type (Acenta / Restoran)
    business_type = models.CharField(
        max_length=20,
        choices=BUSINESS_TYPE_CHOICES,
        default='acenta',
        verbose_name='İşletme Türü'
    )

    # Contact info
    phone = models.CharField(max_length=30, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)

    # Business info
    tursab_no = models.CharField(max_length=20, blank=True, null=True, verbose_name='TURSAB No')
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00, verbose_name='Komisyon Oranı (%)')
    sub_merchant_id = models.CharField(max_length=100, blank=True, null=True, verbose_name='Iyzico Sub-Merchant ID')

    # Status
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_demo = models.BooleanField(default=False, verbose_name='Demo Acente')
    
    # Restaurant specific
    available_tables = models.PositiveIntegerField(default=10, verbose_name='Boş Masa Sayısı')
    
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.name} ({self.get_business_type_display()})'

    class Meta:
        verbose_name_plural = "Agencies"


class Menu(models.Model):
    """
    Restoran işletmelerine ait menü kalemleri.
    Agency.business_type == 'restoran' olan kayıtlarla ilişkilendirilir.
    """
    CATEGORY_CHOICES = [
        ('starter', 'Başlangıç'),
        ('main', 'Ana Yemek'),
        ('dessert', 'Tatlı'),
        ('drink', 'İçecek'),
        ('special', 'Günün Özel Menüsü'),
    ]

    restaurant = models.ForeignKey(
        Agency,
        on_delete=models.CASCADE,
        related_name='menus',
        limit_choices_to={'business_type': 'restoran'},
        verbose_name='Restoran'
    )
    name = models.CharField(max_length=255, verbose_name='Ürün Adı')
    description = models.TextField(blank=True, null=True, verbose_name='Açıklama')
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='main',
        verbose_name='Kategori'
    )
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Fiyat (₺)')
    daily_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        blank=True, null=True,
        verbose_name='Günlük Özel Fiyat (₺)'
    )
    is_available = models.BooleanField(default=True, verbose_name='Mevcut mu?')
    is_daily_special = models.BooleanField(default=False, verbose_name='Günün Özel Menüsü mü?')
    image = models.ImageField(upload_to='menus/', blank=True, null=True, verbose_name='Görsel (Ana)')
    image_sub1 = models.ImageField(upload_to='menus/', blank=True, null=True, verbose_name='Görsel (Yan 1)')
    image_sub2 = models.ImageField(upload_to='menus/', blank=True, null=True, verbose_name='Görsel (Yan 2)')
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def effective_price(self):
        """Günlük özel fiyat varsa onu, yoksa standart fiyatı döndürür."""
        if self.is_daily_special and self.daily_price:
            return self.daily_price
        return self.price

    def __str__(self):
        return f'{self.restaurant.name} | {self.name} ({self.get_category_display()})'

    class Meta:
        verbose_name = 'Menü Kalemi'
        verbose_name_plural = 'Menü Kalemleri'
        ordering = ['category', 'name']


class MenuDocument(models.Model):
    """Menüye ait PDF veya Word belgeleri."""
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='menus/docs/')
    title = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.menu.name} - Document'



class Table(models.Model):
    """
    Restoran masalarını tanımlar.
    """
    restaurant = models.ForeignKey(
        Agency,
        on_delete=models.CASCADE,
        related_name='tables',
        limit_choices_to={'business_type': 'restoran'},
        verbose_name='Restoran'
    )
    table_number = models.CharField(max_length=20, verbose_name='Masa Numarası/Adı')
    capacity = models.PositiveIntegerField(default=4, verbose_name='Kapasite')
    is_active = models.BooleanField(default=True, verbose_name='Kullanımda mı?')

    def __str__(self):
        return f'{self.restaurant.name} - Masa: {self.table_number}'

    class Meta:
        verbose_name = 'Masa'
        verbose_name_plural = 'Masalar'


class DiningReservation(models.Model):
    """
    Restoran masa rezervasyonları.
    """
    STATUS_CHOICES = [
        ('pending', 'Bekliyor'),
        ('confirmed', 'Onaylandı'),
        ('seated', 'Masaya Alındı'),
        ('completed', 'Tamamlandı'),
        ('cancelled', 'İptal Edildi'),
    ]

    restaurant = models.ForeignKey(
        Agency,
        on_delete=models.CASCADE,
        related_name='dining_reservations',
        limit_choices_to={'business_type': 'restoran'},
        verbose_name='Restoran'
    )
    guest_name = models.CharField(max_length=255, verbose_name='Misafir Adı')
    guest_phone = models.CharField(max_length=30, verbose_name='Telefon')
    guest_email = models.EmailField(blank=True, null=True, verbose_name='E-posta')
    guest_count = models.PositiveIntegerField(default=1, verbose_name='Kişi Sayısı')
    table = models.ForeignKey(
        Table,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dining_reservations',
        verbose_name='Atanan Masa'
    )
    table_number = models.CharField(max_length=20, blank=True, null=True, verbose_name='Masa No (Serbest Metin)')
    reservation_date = models.DateField(verbose_name='Rezervasyon Tarihi')
    reservation_time = models.TimeField(verbose_name='Saat')
    notes = models.TextField(blank=True, null=True, verbose_name='Notlar')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Durum'
    )
    
    # Analytics
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name='Toplam Tutar (₺)')
    
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.restaurant.name} | {self.guest_name} | {self.reservation_date} {self.reservation_time}'

    class Meta:
        verbose_name = 'Restoran Rezervasyonu'
        verbose_name_plural = 'Restoran Rezervasyonları'
        ordering = ['reservation_date', 'reservation_time']

