import logging
import stripe
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Booking
from .serializers import BookingSerializer
from tours.models import Tour
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse
from django.core.mail import send_mail

logger = logging.getLogger('bookings')


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related('tour')

    def create(self, request, *args, **kwargs):
        tour_slug = request.data.get('tour_slug')
        guests = int(request.data.get('guests', 1))
        date_label = request.data.get('date_label', '')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')

        try:
            tour = Tour.objects.get(id=tour_slug)
        except Tour.DoesNotExist:
            return Response({'error': 'Tour not found'}, status=status.HTTP_404_NOT_FOUND)

        # Date validation
        if start_date:
            from datetime import date as date_type
            from datetime import datetime
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

        total_price = tour.price * guests

        # Use Stripe key from settings (loaded from .env)
        stripe.api_key = settings.STRIPE_SECRET_KEY
        if not stripe.api_key:
            return Response({'error': 'Stripe is not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Create a stripe payment intent
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(total_price * 100),  # amount in cents
                currency='try',
                metadata={'tour_id': tour.id, 'user_id': request.user.id}
            )
        except Exception as e:
            logger.error(f"Stripe PaymentIntent creation failed: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        booking_ref = intent.id[-8:].upper()

        booking = Booking.objects.create(
            user=request.user,
            tour=tour,
            date_label=date_label,
            start_date=start_date if start_date else None,
            end_date=end_date if end_date else None,
            guests=guests,
            total_price=total_price,
            status='pending',
            booking_ref=booking_ref,
            payment_intent_id=intent.id
        )

        # Send booking created notification email
        if request.user.email:
            try:
                send_mail(
                    'Rezervasyonunuz Alındı!',
                    f'Merhaba {request.user.first_name or request.user.username},\n\n'
                    f'{tour.title} turu için rezervasyonunuz alınmıştır.\n'
                    f'Tarih: {date_label or start_date}\n'
                    f'Kişi sayısı: {guests}\n'
                    f'Toplam tutar: ₺{total_price}\n'
                    f'Referans no: {booking_ref}\n\n'
                    f'Ödeme onaylandıktan sonra size bilgi verilecektir.',
                    settings.DEFAULT_FROM_EMAIL,
                    [request.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.warning(f"Booking creation email failed: {e}")

        serializer = self.get_serializer(booking)
        return Response({
            'booking': serializer.data,
            'clientSecret': intent.client_secret
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """POST /api/v1/bookings/<id>/cancel/ — Cancel a booking"""
        try:
            booking = self.get_queryset().get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status == 'cancelled':
            return Response({'error': 'Bu rezervasyon zaten iptal edilmiş.'}, status=status.HTTP_400_BAD_REQUEST)

        if booking.status == 'confirmed':
            # Attempt Stripe refund
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

        booking.status = 'cancelled'
        booking.cancelled_at = timezone.now()
        booking.save()

        # Send cancellation email
        if request.user.email:
            try:
                send_mail(
                    'Rezervasyonunuz İptal Edildi',
                    f'Merhaba {request.user.first_name or request.user.username},\n\n'
                    f'{booking.tour.title} turu için olan rezervasyonunuz (Ref: {booking.booking_ref}) iptal edilmiştir.\n\n'
                    f'Sorularınız için bizimle iletişime geçebilirsiniz.',
                    settings.DEFAULT_FROM_EMAIL,
                    [request.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.warning(f"Cancellation email failed: {e}")

        serializer = self.get_serializer(booking)
        return Response(serializer.data)

    @method_decorator(csrf_exempt)
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def webhook(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        event = None

        webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except Exception as e:
            logger.error(f"Stripe webhook verification failed: {e}")
            return HttpResponse(status=400)

        event_type = event['type']
        payment_intent = event['data']['object']

        if event_type == 'payment_intent.succeeded':
            try:
                booking = Booking.objects.get(payment_intent_id=payment_intent['id'])
                booking.status = 'confirmed'
                booking.save()
                logger.info(f"Booking {booking.booking_ref} confirmed via webhook")

                # Send confirmation email
                if booking.user.email:
                    send_mail(
                        'Rezervasyonunuz Onaylandı! ✅',
                        f'Merhaba {booking.user.first_name or booking.user.username},\n\n'
                        f'{booking.tour.title} turu için ödemeniz alınmış ve rezervasyonunuz onaylanmıştır!\n\n'
                        f'Tarih: {booking.date_label or booking.start_date}\n'
                        f'Referans no: {booking.booking_ref}\n\n'
                        f'İyi tatiller dileriz!',
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
                booking.save()
                logger.info(f"Booking {booking.booking_ref} marked as failed via webhook")

                # Send failure notification email
                if booking.user.email:
                    send_mail(
                        'Ödeme Başarısız Oldu',
                        f'Merhaba {booking.user.first_name or booking.user.username},\n\n'
                        f'{booking.tour.title} turu için ödemeniz başarısız olmuştur.\n'
                        f'Lütfen tekrar deneyiniz veya farklı bir ödeme yöntemi kullanınız.\n\n'
                        f'Referans no: {booking.booking_ref}',
                        settings.DEFAULT_FROM_EMAIL,
                        [booking.user.email],
                        fail_silently=True,
                    )
            except Booking.DoesNotExist:
                logger.warning(f"Webhook: No booking found for failed payment_intent {payment_intent['id']}")

        return HttpResponse(status=200)
