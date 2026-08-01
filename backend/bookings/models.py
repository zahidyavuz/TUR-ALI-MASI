from django.db import models
from django.contrib.auth.models import User
from tours.models import Tour, Combo
from shuttles.models import ShuttleRoute
import uuid


class Booking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    # Nullable so a booking can reference either a Tour (tour/meal) or a
    # ShuttleRoute (shuttle) — exactly one of tour/shuttle_route is set,
    # matching service_type. Kept nullable rather than splitting into a
    # separate ShuttleBooking model so the existing Stripe webhook flow
    # (payment_intent_id lookup + atomic capacity restore) is reused as-is.
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='bookings', null=True, blank=True)
    shuttle_route = models.ForeignKey(ShuttleRoute, on_delete=models.CASCADE, related_name='bookings', null=True, blank=True)
    # Combo (tur + restoran menüsü) satın alımında tur tarafını temsil eden
    # Booking'in bağlı olduğu paket. Restoran tarafı ayrı bir DiningReservation
    # olarak oluşturulur ve ikisi `combo_group` ile eşlenir (F5-03).
    combo = models.ForeignKey(Combo, on_delete=models.SET_NULL, related_name='bookings', null=True, blank=True)

    SERVICE_TYPE_CHOICES = [
        ('tour', 'Tour'),
        ('meal', 'Meal'),
        ('shuttle', 'Shuttle'),
        ('combo', 'Combo'),
    ]
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES, default='tour')

    # Combo satın alımında bu Booking ile eş zamanlı oluşturulan
    # DiningReservation'ı bağlayan ortak grup kimliği. Combo dışı
    # rezervasyonlarda boştur. İptal/iade ve webhook onayı bu grup üzerinden
    # her iki kaydı birlikte yönetir.
    combo_group = models.UUIDField(null=True, blank=True, db_index=True)

    date_label = models.CharField(max_length=255, blank=True, null=True)  # legacy compat
    start_date = models.DateField(null=True, blank=True)
    # Shuttles are time-slotted (ShuttleAvailability has date + time); tours
    # are date-only. Null for tour/meal bookings.
    start_time = models.TimeField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    guests = models.IntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Rezervasyonu yapan hesap (user) ile hizmeti alacak misafir farklı
    # olabilir; ayrıca transfer için otel bilgisi gerekir. Boş bırakılabilir,
    # bu durumda user'ın kendi bilgileri geçerlidir.
    guest_full_name = models.CharField(max_length=150, blank=True, default='')
    guest_email = models.EmailField(blank=True, default='')
    guest_phone = models.CharField(max_length=32, blank=True, default='')
    guest_hotel = models.CharField(max_length=255, blank=True, default='')

    # Rehber/şoför hizmet günü buluşmaya gelmeyen misafiri işaretler.
    # İptalden ayrıdır: para iade edilmez, kontenjan geri verilmez.
    no_show = models.BooleanField(default=False)

    # Hizmet günü biletin okutulduğu an. Boşsa misafir henüz giriş yapmamıştır.
    # `no_show` ile karşıt: biri işaretliyse diğeri olmamalıdır.
    checked_in_at = models.DateTimeField(null=True, blank=True)

    booking_ref = models.CharField(max_length=50, unique=True)
    payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Tur bitiminden sonra gönderilen "deneyimini değerlendir" davet
    # e-postasının gönderim anı. Boşsa davet henüz gönderilmemiştir;
    # `send_review_invites` komutunun tekrar tekrar mail atmasını engeller.
    review_invite_sent_at = models.DateTimeField(null=True, blank=True)

    # Tur öncesi hatırlatma SMS/WhatsApp bildiriminin kuyruğa eklendiği an. Boşsa
    # hatırlatma henüz yollanmamıştır; `send_tour_reminders` komutunun aynı
    # rezervasyon için tekrar tekrar bildirim üretmesini engeller.
    reminder_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        service_label = self.tour.title if self.tour else (
            self.shuttle_route.title if self.shuttle_route else 'Unknown service'
        )
        return f"{self.booking_ref} - {self.user.username} - {service_label}"
