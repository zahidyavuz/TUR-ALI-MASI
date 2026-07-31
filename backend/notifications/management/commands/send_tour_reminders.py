"""
Tur öncesi hatırlatma bildirimini kuyruğa ekler (buluşma saati + noktası).

Üretimde cron ile günde birkaç kez çalıştırılacak. Yaklaşan (varsayılan: önümüzdeki
24 saat içinde başlayan) onaylı tur rezervasyonlarını bulur, her biri için tek
seferlik bir hatırlatma bildirimi kuyruğa yazar ve `Booking.reminder_sent_at`
işaretiyle tekrar gönderimi engeller. Asıl SMS/WhatsApp gönderimi ayrı komutta
(`send_notifications`) yapılır — bu komut sadece kuyruğa ekler.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from bookings.models import Booking
from notifications.service import enqueue


class Command(BaseCommand):
    help = 'Yaklaşan turlar için hatırlatma bildirimini kuyruğa ekler.'

    def add_arguments(self, parser):
        parser.add_argument('--hours', type=int, default=24,
                            help='Kaç saat içinde başlayan turlar hatırlatılsın (varsayılan: 24).')
        parser.add_argument('--dry-run', action='store_true',
                            help='Kuyruğa eklemeden yalnız kaç hatırlatma gideceğini raporlar.')

    def handle(self, *args, **options):
        hours = options['hours']
        dry_run = options['dry_run']
        now = timezone.now()

        # start_date gün bazlı; bugünden (dahil) eşik gününe kadar başlayanları al.
        upper_date = (now + timedelta(hours=hours)).date()

        candidates = Booking.objects.filter(
            status='confirmed',
            tour__isnull=False,
            start_date__isnull=False,
            start_date__gte=now.date(),
            start_date__lte=upper_date,
            reminder_sent_at__isnull=True,
        ).select_related('tour', 'user')

        queued = 0
        for booking in candidates:
            recipient = booking.guest_phone or _profile_phone(booking.user)
            if not recipient:
                # Telefon yoksa hatırlatma atlanır; tekrar taranmasın diye işaretle.
                if not dry_run:
                    booking.reminder_sent_at = now
                    booking.save(update_fields=['reminder_sent_at'])
                continue

            if dry_run:
                queued += 1
                continue

            time_label = booking.start_time.strftime('%H:%M') if booking.start_time else 'acenta ile teyit edin'
            enqueue(
                event_type='tour_reminder',
                recipient=recipient,
                context={
                    'name': booking.guest_full_name or _display(booking.user),
                    'service': f'{booking.tour.title} turu',
                    'date': booking.start_date.strftime('%d.%m.%Y'),
                    'point': booking.tour.location or 'acenta ile teyit edin',
                    'time': time_label,
                    'hotel': booking.guest_hotel or '-',
                },
                booking=booking,
            )
            booking.reminder_sent_at = now
            booking.save(update_fields=['reminder_sent_at'])
            queued += 1

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(f'{prefix}{queued} tur hatırlatması kuyruğa eklendi.'))


def _profile_phone(user):
    profile = getattr(user, 'profile', None)
    return getattr(profile, 'phone_number', '') if profile else ''


def _display(user):
    full = (user.get_full_name() or '').strip()
    return full or user.first_name or user.username
