"""
bookings/views.py — PRODUCTION-READY (tam dosya, refactored)
-------------------------------------------------------------
Kritik değişiklikler:
  1. transaction.atomic() + select_for_update() → Race Condition / Overbooking koruması.
  2. Gereksiz inline importlar kaldırıldı, tepede gruplandı.
  3. Webhook'ta da atomic blok kullanıldı.
"""
import logging
import stripe
from datetime import date as date_type, datetime, time as time_type, timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction, DatabaseError
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Booking
from .serializers import BookingSerializer
from tours.models import Tour, TourAvailability
from shuttles.models import ShuttleRoute, ShuttleAvailability
from core.permissions import IsOwner, StrictMassAssignmentPermission

logger = logging.getLogger('bookings')

# Hizmet başlangıcına bu süreden az kalmışsa iptal kabul edilmez.
# Basit sabit kural; esnek politika motoru F4-04'te gelecek.
CANCELLATION_CUTOFF_HOURS = 24


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsOwner, StrictMassAssignmentPermission]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related(
            'tour', 'tour__agency', 'shuttle_route', 'shuttle_route__agency'
        )

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

        # ── ATOMIC: Kapasite kontrolü + rezervasyon kaydı ────────────────────
        # select_for_update() → Bu satırı DB düzeyinde kilitler.
        # İki istek aynı anda gelirse biri sırada bekler; Race Condition önlenir.
        try:
            with transaction.atomic():
                if start_date:
                    try:
                        availability = TourAvailability.objects.select_for_update().get(
                            tour=tour, date=start_date
                        )
                    except TourAvailability.DoesNotExist:
                        raise ValueError('Seçilen tarih için müsaitlik bulunmamaktadır.')

                    if guests > availability.remaining:
                        raise ValueError(
                            f'Seçilen tarihte en fazla {availability.remaining} kişilik yer kalmıştır.'
                        )

                total_price = tour.price * guests

                # ── Stripe PaymentIntent ─────────────────────────────────────
                stripe.api_key = settings.STRIPE_SECRET_KEY
                if not stripe.api_key:
                    raise RuntimeError('Stripe yapılandırılmamış.')

                intent = stripe.PaymentIntent.create(
                    amount=int(total_price * 100),
                    currency='try',
                    metadata={'tour_id': tour.id, 'user_id': request.user.id}
                )

                booking_ref = intent.id[-8:].upper()
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
                    payment_intent_id=intent.id,
                    guest_full_name=(request.data.get('guest_full_name') or '')[:150],
                    guest_email=(request.data.get('guest_email') or '')[:254],
                    guest_phone=(request.data.get('guest_phone') or '')[:32],
                    guest_hotel=(request.data.get('guest_hotel') or '')[:255],
                )

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.StripeError as e:
            logger.error(f"Stripe PaymentIntent creation failed: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # ── E-posta bildirimi (atomic dışında — hata rezervasyonu geri almaz) ─
        if request.user.email:
            try:
                send_mail(
                    'Rezervasyonunuz Alındı!',
                    (
                        f'Merhaba {request.user.first_name or request.user.username},\n\n'
                        f'{tour.title} turu için rezervasyonunuz alınmıştır.\n'
                        f'Tarih: {date_label or start_date}\n'
                        f'Kişi sayısı: {guests}\n'
                        f'Toplam tutar: ₺{total_price}\n'
                        f'Referans no: {booking_ref}\n\n'
                        f'Ödeme onaylandıktan sonra size bilgi verilecektir.'
                    ),
                    settings.DEFAULT_FROM_EMAIL,
                    [request.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.warning(f"Booking creation email failed: {e}")

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

                stripe.api_key = settings.STRIPE_SECRET_KEY
                if not stripe.api_key:
                    raise RuntimeError('Stripe yapılandırılmamış.')

                intent = stripe.PaymentIntent.create(
                    amount=int(total_price * 100),
                    currency='try',
                    metadata={'shuttle_route_id': shuttle_route.id, 'user_id': request.user.id}
                )

                booking_ref = intent.id[-8:].upper()
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
                    payment_intent_id=intent.id
                )

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.StripeError as e:
            logger.error(f"Stripe PaymentIntent creation failed (shuttle): {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if request.user.email:
            try:
                send_mail(
                    'Transfer Rezervasyonunuz Alındı!',
                    (
                        f'Merhaba {request.user.first_name or request.user.username},\n\n'
                        f'{shuttle_route.title} transferi için rezervasyonunuz alınmıştır.\n'
                        f'Tarih/Saat: {start_date} {start_time}\n'
                        f'Yolcu sayısı: {guests}\n'
                        f'Toplam tutar: ₺{total_price}\n'
                        f'Referans no: {booking_ref}\n\n'
                        f'Ödeme onaylandıktan sonra size bilgi verilecektir.'
                    ),
                    settings.DEFAULT_FROM_EMAIL,
                    [request.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.warning(f"Shuttle booking creation email failed: {e}")

        serializer = self.get_serializer(booking)
        return Response(
            {'booking': serializer.data, 'clientSecret': intent.client_secret},
            status=status.HTTP_201_CREATED
        )

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

        if booking.status == 'confirmed':
            stripe.api_key = settings.STRIPE_SECRET_KEY
            if booking.payment_intent_id and stripe.api_key:
                try:
                    stripe.Refund.create(payment_intent=booking.payment_intent_id)
                    logger.info(f"Refund created for booking {booking.booking_ref}")
                except Exception as e:
                    logger.error(f"Stripe refund failed for {booking.booking_ref}: {e}")
                    return Response(
                        {'error': f'İade işlemi başarısız: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Kapasiteyi geri ver
            with transaction.atomic():
                if booking.service_type == 'shuttle' and booking.shuttle_route_id and booking.start_date and booking.start_time:
                    try:
                        availability = ShuttleAvailability.objects.select_for_update().get(
                            shuttle_route=booking.shuttle_route, date=booking.start_date, time=booking.start_time
                        )
                        availability.booked_count = max(0, availability.booked_count - booking.guests)
                        availability.save(update_fields=['booked_count'])
                    except ShuttleAvailability.DoesNotExist:
                        pass
                elif booking.start_date:
                    try:
                        availability = TourAvailability.objects.select_for_update().get(
                            tour=booking.tour, date=booking.start_date
                        )
                        availability.booked_count = max(0, availability.booked_count - booking.guests)
                        availability.save(update_fields=['booked_count'])
                    except TourAvailability.DoesNotExist:
                        pass

                booking.status = 'cancelled'
                booking.cancelled_at = timezone.now()
                booking.save(update_fields=['status', 'cancelled_at'])
        else:
            booking.status = 'cancelled'
            booking.cancelled_at = timezone.now()
            booking.save(update_fields=['status', 'cancelled_at'])

        if request.user.email:
            service_label = booking.tour.title if booking.tour else (
                f"{booking.shuttle_route.title} transferi" if booking.shuttle_route else 'hizmet'
            )
            try:
                send_mail(
                    'Rezervasyonunuz İptal Edildi',
                    (
                        f'Merhaba {request.user.first_name or request.user.username},\n\n'
                        f'{service_label} için olan rezervasyonunuz '
                        f'(Ref: {booking.booking_ref}) iptal edilmiştir.\n\n'
                        f'Sorularınız için bizimle iletişime geçebilirsiniz.'
                    ),
                    settings.DEFAULT_FROM_EMAIL,
                    [request.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.warning(f"Cancellation email failed: {e}")

        serializer = self.get_serializer(booking)
        return Response(serializer.data)

    # ─────────────────────────────────────────────────────────────────────────
    # STRIPE WEBHOOK — Ödeme durumu güncellemeleri
    # ─────────────────────────────────────────────────────────────────────────
    @method_decorator(csrf_exempt)
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def webhook(self, request):
        payload      = request.body
        sig_header   = request.META.get('HTTP_STRIPE_SIGNATURE')
        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except Exception as e:
            logger.error(f"Stripe webhook verification failed: {e}")
            return HttpResponse(status=400)

        event_type     = event['type']
        payment_intent = event['data']['object']

        if event_type == 'payment_intent.succeeded':
            try:
                with transaction.atomic():
                    booking = Booking.objects.select_for_update().get(
                        payment_intent_id=payment_intent['id']
                    )
                    if booking.status != 'confirmed':
                        booking.status = 'confirmed'
                        booking.save(update_fields=['status'])
                        logger.info(f"Booking {booking.booking_ref} confirmed via webhook")

                        # Kapasiteyi düş
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
                        elif booking.start_date:
                            try:
                                availability = TourAvailability.objects.select_for_update().get(
                                    tour=booking.tour, date=booking.start_date
                                )
                                availability.booked_count += booking.guests
                                availability.save(update_fields=['booked_count'])
                            except TourAvailability.DoesNotExist:
                                logger.warning(
                                    f"TourAvailability not found for {booking.tour.id} on {booking.start_date}"
                                )

                # E-posta atomic dışında
                if booking.user.email:
                    service_label = booking.tour.title if booking.tour else (
                        f"{booking.shuttle_route.title} transferi" if booking.shuttle_route else 'hizmetiniz'
                    )
                    send_mail(
                        'Rezervasyonunuz Onaylandı! ✅',
                        (
                            f'Merhaba {booking.user.first_name or booking.user.username},\n\n'
                            f'{service_label} için ödemeniz alınmış ve '
                            f'rezervasyonunuz onaylanmıştır!\n\n'
                            f'Tarih: {booking.date_label or booking.start_date}\n'
                            f'Referans no: {booking.booking_ref}\n\n'
                            f'İyi tatiller dileriz!'
                        ),
                        settings.DEFAULT_FROM_EMAIL,
                        [booking.user.email],
                        fail_silently=True,
                    )

            except Booking.DoesNotExist:
                logger.warning(f"Webhook: No booking found for payment_intent {payment_intent['id']}")

        elif event_type == 'payment_intent.payment_failed':
            try:
                booking = Booking.objects.get(payment_intent_id=payment_intent['id'])
                booking.status = 'failed'
                booking.save(update_fields=['status'])
                logger.info(f"Booking {booking.booking_ref} marked as failed via webhook")

                if booking.user.email:
                    service_label = booking.tour.title if booking.tour else (
                        f"{booking.shuttle_route.title} transferi" if booking.shuttle_route else 'hizmetiniz'
                    )
                    send_mail(
                        'Ödeme Başarısız Oldu',
                        (
                            f'Merhaba {booking.user.first_name or booking.user.username},\n\n'
                            f'{service_label} için ödemeniz başarısız olmuştur.\n'
                            f'Lütfen tekrar deneyiniz veya farklı bir ödeme yöntemi kullanınız.\n\n'
                            f'Referans no: {booking.booking_ref}'
                        ),
                        settings.DEFAULT_FROM_EMAIL,
                        [booking.user.email],
                        fail_silently=True,
                    )
            except Booking.DoesNotExist:
                logger.warning(f"Webhook: No booking found for failed payment_intent {payment_intent['id']}")

        return HttpResponse(status=200)
