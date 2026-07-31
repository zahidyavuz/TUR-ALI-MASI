"""
bookings/views.py — PRODUCTION-READY (tam dosya, refactored)
-------------------------------------------------------------
Kritik değişiklikler:
  1. transaction.atomic() + select_for_update() → Race Condition / Overbooking koruması.
  2. Gereksiz inline importlar kaldırıldı, tepede gruplandı.
  3. Webhook'ta da atomic blok kullanıldı.
  4. Tahsilat/iade/webhook çağrıları `bookings.payments` adapter'ı üzerinden
     geçiyor; bu dosyada artık doğrudan PSP SDK'sı yok (F2-06).
"""
import logging
from datetime import date as date_type, datetime, time as time_type, timedelta

from django.db import transaction, DatabaseError
from django.db.models import F
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Booking
from .payments import (
    PaymentError,
    ProviderNotConfigured,
    WebhookEvent,
    get_provider,
)
from .serializers import BookingSerializer
from tours.models import Tour, TourAvailability
from shuttles.models import ShuttleRoute, ShuttleAvailability
from core.emails import display_name, frontend_url, send_templated_mail
from core.permissions import IsOwner, StrictMassAssignmentPermission

logger = logging.getLogger('bookings')

# Hizmet başlangıcına bu süreden az kalmışsa iptal kabul edilmez.
# Basit sabit kural; esnek politika motoru F4-04'te gelecek.
CANCELLATION_CUTOFF_HOURS = 24


def service_label(booking):
    """E-postalarda kullanılan okunabilir hizmet adı."""
    if booking.tour:
        return f'{booking.tour.title} turu'
    if booking.shuttle_route:
        return f'{booking.shuttle_route.title} transferi'
    return 'hizmetiniz'


def ticket_url():
    # /tickets/<id> sayfası henüz sabit veriyle çalışıyor; müşterinin gerçek
    # biletlerini gösteren tek sayfa panel altındaki liste.
    return frontend_url('/dashboard/customer/tickets')


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsOwner, StrictMassAssignmentPermission]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related(
            'tour', 'tour__agency', 'shuttle_route', 'shuttle_route__agency'
        )

    def get_throttles(self):
        # Yalnız rezervasyon OLUŞTURMA'yı 'booking' scope'uyla sınırla
        # (carding / stok tarama). Listeleme/detay kendi bookinglerine
        # dönük olduğundan default user oranı yeterli. throttle_scope yalnız
        # create'te set edilir; ScopedRateThrottle diğer action'larda no-op.
        if self.action == 'create':
            self.throttle_scope = 'booking'
        return super().get_throttles()

    # ─────────────────────────────────────────────────────────────────────────
    # CREATE — Rezervasyon + Stripe PaymentIntent oluşturma
    # ─────────────────────────────────────────────────────────────────────────
    def create(self, request, *args, **kwargs):
        if request.data.get('service_type') == 'shuttle':
            return self._create_shuttle_booking(request)

        tour_slug  = request.data.get('tour_slug')
        date_label = request.data.get('date_label', '')
        start_date = request.data.get('start_date')
        end_date   = request.data.get('end_date')
        # 'tour' veya 'meal'; 'shuttle' yukarıda ayrı akışa yönlendirildi.
        service_type = request.data.get('service_type') or 'tour'
        if service_type not in ('tour', 'meal'):
            return Response(
                {'error': 'Geçersiz hizmet tipi.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            guests = int(request.data.get('guests', 1))
        except (TypeError, ValueError):
            return Response({'error': 'Geçersiz kişi sayısı.'}, status=status.HTTP_400_BAD_REQUEST)
        if guests < 1:
            return Response({'error': 'Kişi sayısı en az 1 olmalıdır.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tour = Tour.objects.get(id=tour_slug)
        except Tour.DoesNotExist:
            return Response({'error': 'Tour not found'}, status=status.HTTP_404_NOT_FOUND)

        # ── Tarih validasyonu ────────────────────────────────────────────────
        if start_date:
            try:
                parsed_start = datetime.strptime(start_date, '%Y-%m-%d').date()
                if parsed_start < timezone.now().date():
                    return Response(
                        {'error': 'Geçmiş bir tarih için rezervasyon yapılamaz.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except ValueError:
                return Response(
                    {'error': 'Geçersiz tarih formatı. YYYY-MM-DD kullanın.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ── ATOMIC: Kontenjan rezervasyonu + rezervasyon kaydı ───────────────
        # Kontenjan BURADA düşülür, webhook'ta değil. Aksi halde N eşzamanlı
        # istek aynı `remaining` değerini okuyup hepsi geçer, sonra hepsi
        # onaylanır ve overbooking oluşur (para çoktan alınmıştır).
        #
        # Rezervasyon tek bir koşullu UPDATE ile yapılır:
        #   UPDATE ... SET booked_count = booked_count + N
        #   WHERE booked_count <= max_capacity - N AND is_closed = false
        # Bu, satır kilidine (select_for_update) ihtiyaç duymadan her veritabanı
        # motorunda atomiktir — SQLite'ta select_for_update'in etkisiz olduğunu
        # da hesaba katar. Kaybeden istek 0 satır günceller ve hata alır.
        try:
            with transaction.atomic():
                if start_date:
                    slot = TourAvailability.objects.filter(tour=tour, date=start_date).first()
                    if slot is None:
                        raise ValueError('Seçilen tarih için müsaitlik bulunmamaktadır.')
                    if slot.is_closed:
                        raise ValueError('Seçilen tarih satışa kapalıdır.')

                    reserved = TourAvailability.objects.filter(
                        pk=slot.pk,
                        is_closed=False,
                        booked_count__lte=F('max_capacity') - guests,
                    ).update(booked_count=F('booked_count') + guests)
                    if not reserved:
                        slot.refresh_from_db()
                        raise ValueError(
                            f'Seçilen tarihte en fazla {max(slot.remaining, 0)} kişilik yer kalmıştır.'
                        )
                    unit_price = slot.effective_price
                else:
                    unit_price = tour.price

                total_price = unit_price * guests

                # ── Tahsilat başlatma (PSP adapter) ──────────────────────────
                intent = get_provider().create_intent(
                    amount=total_price,
                    currency='TRY',
                    metadata={'tour_id': tour.id, 'user_id': request.user.id},
                )

                booking_ref = intent.booking_ref
                booking = Booking.objects.create(
                    user=request.user,
                    tour=tour,
                    service_type=service_type,
                    date_label=date_label,
                    start_date=start_date if start_date else None,
                    start_time=request.data.get('start_time') or None,
                    end_date=end_date if end_date else None,
                    guests=guests,
                    total_price=total_price,
                    status='pending',
                    booking_ref=booking_ref,
                    payment_intent_id=intent.intent_id,
                    guest_full_name=(request.data.get('guest_full_name') or '')[:150],
                    guest_email=(request.data.get('guest_email') or '')[:254],
                    guest_phone=(request.data.get('guest_phone') or '')[:32],
                    guest_hotel=(request.data.get('guest_hotel') or '')[:255],
                )

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        # ProviderNotConfigured, PaymentError'ın alt sınıfı — önce o yakalanmalı.
        except ProviderNotConfigured as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except PaymentError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # ── E-posta bildirimi (atomic dışında — hata rezervasyonu geri almaz) ─
        send_templated_mail('booking_created', request.user.email, {
            'user_name': display_name(request.user),
            'service_label': f'{tour.title} turu',
            'date_label': date_label or start_date,
            'guest_label': 'Kişi sayısı',
            'guests': guests,
            'total_price': total_price,
            'booking_ref': booking_ref,
            'ticket_url': ticket_url(),
        })

        serializer = self.get_serializer(booking)
        return Response(
            {'booking': serializer.data, 'clientSecret': intent.client_secret},
            status=status.HTTP_201_CREATED
        )

    # ─────────────────────────────────────────────────────────────────────────
    # CREATE (SHUTTLE) — Transfer rezervasyonu + Stripe PaymentIntent
    # Mirrors the tour create() path above: same atomic + select_for_update
    # capacity guard, same Stripe PaymentIntent flow, same webhook contract
    # (payment_intent_id lookup). Kept as a separate method rather than
    # branching inline throughout create() so the existing tour/meal path
    # above is untouched.
    # ─────────────────────────────────────────────────────────────────────────
    def _create_shuttle_booking(self, request):
        shuttle_route_id = request.data.get('shuttle_route_id')
        guests           = int(request.data.get('guests', 1))
        start_date       = request.data.get('start_date')
        start_time       = request.data.get('start_time')

        if not start_date or not start_time:
            return Response(
                {'error': 'start_date ve start_time zorunludur.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            shuttle_route = ShuttleRoute.objects.get(id=shuttle_route_id, is_active=True)
        except ShuttleRoute.DoesNotExist:
            return Response({'error': 'Transfer rotası bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

        # ── Tarih validasyonu (tur akışıyla aynı) ────────────────────────────
        try:
            parsed_start = datetime.strptime(start_date, '%Y-%m-%d').date()
            if parsed_start < timezone.now().date():
                return Response(
                    {'error': 'Geçmiş bir tarih için rezervasyon yapılamaz.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {'error': 'Geçersiz tarih formatı. YYYY-MM-DD kullanın.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Yolcu sayısı sınırları (rota bazlı, ShuttleAvailability'den ayrı) ─
        if guests < shuttle_route.min_passengers or guests > shuttle_route.max_passengers:
            return Response(
                {
                    'error': (
                        f'Bu transfer için yolcu sayısı {shuttle_route.min_passengers} '
                        f'ile {shuttle_route.max_passengers} arasında olmalıdır.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── ATOMIC: Kapasite kontrolü + rezervasyon kaydı (tur akışıyla aynı desen) ─
        try:
            with transaction.atomic():
                try:
                    availability = ShuttleAvailability.objects.select_for_update().get(
                        shuttle_route=shuttle_route, date=start_date, time=start_time
                    )
                except ShuttleAvailability.DoesNotExist:
                    raise ValueError('Seçilen tarih/saat için müsaitlik bulunmamaktadır.')

                if guests > availability.remaining:
                    raise ValueError(
                        f'Seçilen saatte en fazla {availability.remaining} kişilik yer kalmıştır.'
                    )

                # Fiyat her zaman backend'de hesaplanır — client'tan gelen bir
                # tutara asla güvenilmez (create-payment-intent'teki pattern'le
                # tutarlı, bkz. app/lib/orderCalculator.ts).
                total_price = shuttle_route.price_per_person * guests

                intent = get_provider().create_intent(
                    amount=total_price,
                    currency='TRY',
                    metadata={'shuttle_route_id': shuttle_route.id, 'user_id': request.user.id},
                )

                booking_ref = intent.booking_ref
                booking = Booking.objects.create(
                    user=request.user,
                    shuttle_route=shuttle_route,
                    tour=None,
                    service_type='shuttle',
                    start_date=start_date,
                    start_time=start_time,
                    guests=guests,
                    total_price=total_price,
                    status='pending',
                    booking_ref=booking_ref,
                    payment_intent_id=intent.intent_id
                )

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ProviderNotConfigured as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except PaymentError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        send_templated_mail('booking_created', request.user.email, {
            'user_name': display_name(request.user),
            'service_label': f'{shuttle_route.title} transferi',
            'date_label': f'{start_date} {start_time}',
            'guest_label': 'Yolcu sayısı',
            'guests': guests,
            'total_price': total_price,
            'booking_ref': booking_ref,
            'ticket_url': ticket_url(),
        })

        serializer = self.get_serializer(booking)
        return Response(
            {'booking': serializer.data, 'clientSecret': intent.client_secret},
            status=status.HTTP_201_CREATED
        )

    @staticmethod
    def _release_tour_capacity(booking):
        """
        `create()` sırasında tutulan tur kontenjanını geri bırakır.
        Koşullu UPDATE ile yapılır ki eksiye düşmesin ve kilit gerekmesin.
        """
        if booking.service_type == 'shuttle' or not (booking.tour_id and booking.start_date):
            return
        TourAvailability.objects.filter(
            tour_id=booking.tour_id,
            date=booking.start_date,
            booked_count__gte=booking.guests,
        ).update(booked_count=F('booked_count') - booking.guests)

    # ─────────────────────────────────────────────────────────────────────────
    # CANCEL — Rezervasyon iptali + Stripe iadesi
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """POST /api/v1/bookings/<id>/cancel/"""
        try:
            booking = self.get_queryset().get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status == 'cancelled':
            return Response({'error': 'Bu rezervasyon zaten iptal edilmiş.'}, status=status.HTTP_400_BAD_REQUEST)

        # Son iptal anı: hizmet başlangıcından CANCELLATION_CUTOFF_HOURS saat önce.
        # start_date yoksa (tarihsiz eski kayıtlar) kısıt uygulanmaz.
        if booking.start_date:
            start_time = booking.start_time or time_type(0, 0)
            starts_at = timezone.make_aware(
                datetime.combine(booking.start_date, start_time),
                timezone.get_current_timezone(),
            )
            if starts_at - timezone.now() < timedelta(hours=CANCELLATION_CUTOFF_HOURS):
                return Response(
                    {
                        'error': (
                            f'Hizmet başlangıcına {CANCELLATION_CUTOFF_HOURS} saatten az kaldığı için '
                            f'bu rezervasyon çevrimiçi iptal edilemez. Lütfen bizimle iletişime geçin.'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        refunded = False
        if booking.status == 'confirmed':
            provider = get_provider()
            if booking.payment_intent_id and provider.is_configured():
                try:
                    provider.refund(intent_id=booking.payment_intent_id)
                    refunded = True
                    logger.info(f"Refund created for booking {booking.booking_ref}")
                except PaymentError as e:
                    return Response(
                        {'error': f'İade işlemi başarısız: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # Kontenjanı geri ver. Tur rezervasyonlarında kontenjan `create()`
        # anında tutulduğu için 'pending' kayıtlar da yer işgal eder; bu yüzden
        # iade yapılmayan (ödenmemiş) iptallerde de bırakılması gerekir.
        with transaction.atomic():
            if booking.service_type == 'shuttle' and booking.shuttle_route_id and booking.start_date and booking.start_time:
                if booking.status == 'confirmed':
                    # Transfer kontenjanı yalnızca onayda düşülüyor (F5-01).
                    try:
                        availability = ShuttleAvailability.objects.select_for_update().get(
                            shuttle_route=booking.shuttle_route, date=booking.start_date, time=booking.start_time
                        )
                        availability.booked_count = max(0, availability.booked_count - booking.guests)
                        availability.save(update_fields=['booked_count'])
                    except ShuttleAvailability.DoesNotExist:
                        pass
            elif booking.status in ('pending', 'confirmed'):
                self._release_tour_capacity(booking)

            booking.status = 'cancelled'
            booking.cancelled_at = timezone.now()
            booking.save(update_fields=['status', 'cancelled_at'])

        # İade yapıldıysa hakediş kaydı geri alınmalı: satış kaydı silinmez,
        # karşısına negatif tutarlı bir `refund` satırı yazılır (muhasebe izi
        # korunur, bakiye kendiliğinden düşer).
        if refunded:
            from agencies.finance_models import AgentFinanceLedger
            try:
                AgentFinanceLedger.create_refund_entry(booking)
            except Exception as e:
                logger.error(
                    f"[FINANCE] Refund ledger entry failed for {booking.booking_ref}: {e}",
                    exc_info=True,
                )

        send_templated_mail('booking_cancelled', request.user.email, {
            'user_name': display_name(request.user),
            'service_label': service_label(booking),
            'booking_ref': booking.booking_ref,
            'refunded': refunded,
        })

        serializer = self.get_serializer(booking)
        return Response(serializer.data)

    # ─────────────────────────────────────────────────────────────────────────
    # STRIPE WEBHOOK — Ödeme durumu güncellemeleri
    # ─────────────────────────────────────────────────────────────────────────
    @method_decorator(csrf_exempt)
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def webhook(self, request):
        try:
            event = get_provider().verify_webhook(
                payload=request.body, headers=request.META
            )
        except PaymentError as e:
            logger.error(f"Payment webhook verification failed: {e}")
            return HttpResponse(status=400)

        if event.type == WebhookEvent.SUCCEEDED:
            try:
                with transaction.atomic():
                    booking = Booking.objects.select_for_update().get(
                        payment_intent_id=event.intent_id
                    )
                    if booking.status != 'confirmed':
                        booking.status = 'confirmed'
                        booking.save(update_fields=['status'])
                        logger.info(f"Booking {booking.booking_ref} confirmed via webhook")

                        # Tur kontenjanı create() sırasında zaten rezerve
                        # edildi; burada tekrar düşmek çift sayıma yol açar.
                        # Transfer akışı (F5-01) hâlâ webhook'ta düşüyor.
                        if booking.service_type == 'shuttle' and booking.shuttle_route_id and booking.start_date and booking.start_time:
                            try:
                                availability = ShuttleAvailability.objects.select_for_update().get(
                                    shuttle_route=booking.shuttle_route, date=booking.start_date, time=booking.start_time
                                )
                                availability.booked_count += booking.guests
                                availability.save(update_fields=['booked_count'])
                            except ShuttleAvailability.DoesNotExist:
                                logger.warning(
                                    f"ShuttleAvailability not found for {booking.shuttle_route_id} on {booking.start_date} {booking.start_time}"
                                )

                # E-posta atomic dışında
                send_templated_mail('booking_confirmed', booking.user.email, {
                    'user_name': display_name(booking.user),
                    'service_label': service_label(booking),
                    'date_label': booking.date_label or booking.start_date,
                    'booking_ref': booking.booking_ref,
                    'ticket_url': ticket_url(),
                })

            except Booking.DoesNotExist:
                logger.warning(f"Webhook: No booking found for payment_intent {event.intent_id}")

        elif event.type == WebhookEvent.FAILED:
            try:
                with transaction.atomic():
                    booking = Booking.objects.select_for_update().get(
                        payment_intent_id=event.intent_id
                    )
                    already_failed = booking.status == 'failed'
                    booking.status = 'failed'
                    booking.save(update_fields=['status'])
                    # Ödeme başarısız → create()'te tutulan kontenjanı bırak.
                    # Bırakılmazsa gün, hiç satılmamış koltuklarla dolu görünür.
                    if not already_failed:
                        self._release_tour_capacity(booking)
                logger.info(f"Booking {booking.booking_ref} marked as failed via webhook")

                send_templated_mail('booking_payment_failed', booking.user.email, {
                    'user_name': display_name(booking.user),
                    'service_label': service_label(booking),
                    'booking_ref': booking.booking_ref,
                })
            except Booking.DoesNotExist:
                logger.warning(f"Webhook: No booking found for failed payment_intent {event.intent_id}")

        return HttpResponse(status=200)
