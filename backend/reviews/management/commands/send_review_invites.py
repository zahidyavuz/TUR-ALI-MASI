"""
Tur bitiminden 24 saat sonra "deneyimini değerlendir" davet e-postası gönderir.

Üretimde cron / Celery beat ile saatlik çalıştırılacak şekilde tasarlandı;
her çalıştırmada davet gönderilmemiş, tarihi geçmiş onaylı rezervasyonları
bulur ve tek seferlik davet yollar. `Booking.review_invite_sent_at` işaretlenerek
tekrar gönderim engellenir. Zaten yorum yazmış kullanıcıya davet gönderilmez.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from bookings.models import Booking
from core.emails import send_templated_mail, frontend_url, display_name
from reviews.models import Review


class Command(BaseCommand):
    help = 'Tur bitiminden 24 saat sonra değerlendirme davet e-postası gönderir.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours', type=int, default=24,
            help='Tur bitiminden sonra beklenecek saat (varsayılan: 24).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='E-posta göndermeden yalnız kaç davet gideceğini raporlar.',
        )

    def handle(self, *args, **options):
        hours = options['hours']
        dry_run = options['dry_run']
        now = timezone.now()

        # "Tur bitti" ölçütü: tarihi bugünden önce olan onaylı tur rezervasyonu.
        # Ayrıca en az `hours` saat geçmiş olmalı (start_date gün bazlı olduğu
        # için gün sonunu + eşiği kaba biçimde bu tarih karşılaştırmasıyla yakalar).
        cutoff_date = (now - timedelta(hours=hours)).date()

        candidates = Booking.objects.filter(
            status='confirmed',
            tour__isnull=False,
            start_date__isnull=False,
            start_date__lte=cutoff_date,
            review_invite_sent_at__isnull=True,
        ).select_related('tour', 'user')

        sent = 0
        skipped_reviewed = 0
        for booking in candidates:
            recipient = booking.guest_email or booking.user.email
            if not recipient:
                continue

            # Zaten yorum yazmışsa davet gönderme.
            if Review.objects.filter(user=booking.user, tour_id=booking.tour_id).exists():
                skipped_reviewed += 1
                if not dry_run:
                    booking.review_invite_sent_at = now
                    booking.save(update_fields=['review_invite_sent_at'])
                continue

            if dry_run:
                sent += 1
                continue

            review_url = frontend_url(
                '/post-tour-review',
                tourId=booking.tour_id,
                tourTitle=booking.tour.title,
                bookingId=str(booking.id),
            )
            ok = send_templated_mail(
                'review_invite',
                recipient,
                {
                    'user_name': booking.guest_full_name or display_name(booking.user),
                    'tour_title': booking.tour.title,
                    'review_url': review_url,
                    'booking_ref': booking.booking_ref,
                },
            )
            if ok:
                booking.review_invite_sent_at = now
                booking.save(update_fields=['review_invite_sent_at'])
                sent += 1

        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'[DRY-RUN] {sent} davet gönderilecekti '
                f'({skipped_reviewed} rezervasyon zaten yorumlanmış).'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'{sent} değerlendirme daveti gönderildi '
                f'({skipped_reviewed} rezervasyon zaten yorumlanmış, atlandı).'
            ))
