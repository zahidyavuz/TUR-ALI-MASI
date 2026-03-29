from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Agency(models.Model):
    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agency_profile', null=True, blank=True)
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='agencies/logos/', blank=True, null=True)
    trust_score = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)
    description = models.TextField(blank=True, null=True)

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
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Agencies"
