from django.db import models
from django.contrib.auth.models import User
from tours.models import Tour


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to='users/avatars/', blank=True, null=True)

    # Misafir (üyeliksiz) checkout ile oluşturulmuş, henüz sahiplenilmemiş hesap.
    # True iken kullanıcı parolasızdır; rezervasyonuna yalnız imzalı sihirli
    # bağlantıyla erişir. "Hesap oluştur" (claim) akışı parola atadığında False'a
    # döner. Google/normal kayıt kullanıcıları da parolasız olabildiği için
    # (sosyal giriş) "misafir mi" ayrımı has_usable_password ile değil bu bayrakla
    # yapılır — aksi halde sosyal hesaplara yanlışlıkla claim daveti giderdi.
    is_guest = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username


class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist_items')
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='wishlisted_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'tour')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} → {self.tour.title}"

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    icon = models.CharField(max_length=50, blank=True, null=True)
    type = models.CharField(max_length=50, default='system')
    action_url = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"

class UserCoupon(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='coupons')
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    discount_type = models.CharField(max_length=20, choices=[('percentage', 'Yüzde'), ('fixed', 'Sabit Tutar')], default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    valid_until = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.code} ({'Kullanıldı' if self.is_used else 'Aktif'})"
