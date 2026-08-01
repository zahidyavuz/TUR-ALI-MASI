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
import uuid
from datetime import date as date_type, datetime, time as time_type
from decimal import Decimal, ROUND_HALF_UP

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
from tours.models import Tour, TourAvailability, Combo, refund_percent_for_policy
from shuttles.models import ShuttleRoute, ShuttleAvailability
from agencies.models import DiningReservation
from core.emails import display_name, frontend_url, send_templated_mail
from core.permissions import IsOwner, StrictMassAssignmentPermission
from notifications.service import enqueue as enqueue_notification

from django.contrib.auth.models import User
from django.core import signing
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from users.guest import create_guest_user, is_guest_user, make_claim_token
from .tokens import make_ticket_token, read_ticket_token

logger = logging.getLogger('bookings')


def service_label(booking):
    """E-postalarda kullanılan okunabilir hizmet adı."""
    if booking.combo_id and booking.combo:
        return f'{booking.combo.title} paketi'
    if booking.tour:
        return f'{booking.tour.title} turu'
    if booking.shuttle_route:
        return f'{booking.shuttle_route.title} transferi'
    return 'hizmetiniz'


def ticket_url():
    # /tickets/<id> sayfası henüz sabit veriyle çalışıyor; müşterinin gerçek
    # biletlerini gösteren tek sayfa panel altındaki liste.
    return frontend_url('/dashboard/customer/tickets')


def guest_phone(booking):
    """SMS/WhatsApp için misafir telefonu; rezervasyonda yoksa hesabın profiline düşer."""
    if booking.guest_phone:
        return booking.guest_phone
    profile = getattr(booking.user, 'profile', None)
    return getattr(profile, 'phone_number', '') if profile else ''


def agency_phone(service):
    """Acentaya bildirim için telefon; acenta kaydında yoksa sahibin profiline düşer."""
    agency = getattr(service, 'agency', None)
    if not agency:
        return ''
    if agency.phone:
        return agency.phone
    owner = agency.owner
    profile = getattr(owner, 'profile', None) if owner else None
    return getattr(profile, 'phone_number', '') if profile else ''


def ticket_link_for(booking):
    """Bilet bağlantısı: giriş yapan hesap için panel, misafir için imzalı sihirli link.

    Misafir hesabı parolasızdır ve panele giremez; bu yüzden ona rezervasyonuna
    doğrudan ulaştıran imzalı bağlantı verilir.
    """
    if booking.user and is_guest_user(booking.user):
        return frontend_url('/guest/ticket', token=make_ticket_token(booking))
    return ticket_url()


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsOwner, StrictMassAssignmentPermission]

    def get_permissions(self):
        # Üyeliksiz (misafir) satın alma: rezervasyon oluşturma ve imzalı sihirli
        # bağlantıyla bilet görüntüleme kimlik doğrulaması gerektirmez. Mass
        # assignment koruması create'te de korunur. Diğer tüm action'lar (listeleme,
        # iptal vb.) kendi rezervasyonuna dönük olduğu için IsAuthenticated kalır.
        if self.action == 'create':
            return [AllowAny(), StrictMassAssignmentPermission()]
        if self.action == 'guest_ticket':
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        # Anonim (misafir) isteklerde request.user bir AnonymousUser'dır; bu
        # queryset yalnız kimlik doğrulanmış action'larda (list/retrieve/cancel)
        # çağrılır, o yüzden filtre güvenlidir.
        if not self.request.user.is_authenticated:
            return Booking.objects.none()
        return Booking.objects.filter(user=self.request.user).select_related(
            'tour', 'tour__agency', 'shuttle_route', 'shuttle_route__agency'
        )

    def _resolve_booking_user(self, request):
        """Rezervasyonun bağlanacağı kullanıcıyı belirler.

        Giriş yapılmışsa o kullanıcı; değilse misafir alanlarından (ad + e-posta)
        gölge kullanıcı çözülür/yaratılır. Aynı e-postayla kayıtlı bir hesap varsa
        rezervasyon ona bağlanır (bilet e-postasındaki sihirli bağlantı zaten o
        adrese gider — yani e-posta sahipliği örtük doğrulanır).
        """
        if request.user and request.user.is_authenticated:
            return request.user
        email = (request.data.get('guest_email') or '').strip().lower()
        name = (request.data.get('guest_full_name') or '').strip()
        phone = (request.data.get('guest_phone') or '').strip()
        if not email or not name:
            raise ValueError('Misafir rezervasyonu için ad soyad ve e-posta zorunludur.')
        try:
            validate_email(email)
        except DjangoValidationError:
            raise ValueError('Geçerli bir e-posta adresi giriniz.')
        existing = User.objects.filter(email__iexact=email).first()
        if existing:
            return existing
        return create_guest_user(email, name, phone)

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
        # Misafir (üyeliksiz) ya da giriş yapmış kullanıcıyı çöz. Anonimse gölge
        # kullanıcı yaratılır; hatalı/eksik misafir bilgisi 400 döner.
        try:
            booking_user = self._resolve_booking_user(request)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if request.data.get('service_type') == 'shuttle':
            return self._create_shuttle_booking(request, booking_user)

        if request.data.get('service_type') == 'combo':
            return self._create_combo_booking(request, booking_user)

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
                    metadata={'tour_id': tour.id, 'user_id': booking_user.id},
                )

                booking_ref = intent.booking_ref
                booking = Booking.objects.create(
                    user=booking_user,
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
        send_templated_mail('booking_created', booking_user.email, {
            'user_name': display_name(booking_user),
            'service_label': f'{tour.title} turu',
            'date_label': date_label or start_date,
            'guest_label': 'Kişi sayısı',
            'guests': guests,
            'total_price': total_price,
            'booking_ref': booking_ref,
            'ticket_url': ticket_link_for(booking),
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
    def _create_shuttle_booking(self, request, booking_user):
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

        # ── ATOMIC: Kontenjan rezervasyonu + rezervasyon kaydı ───────────────
        # Kontenjan BURADA düşülür, webhook'ta değil (tur akışıyla aynı desen).
        # Aksi halde N eşzamanlı istek aynı `remaining` değerini okuyup hepsi
        # geçer, sonra hepsi onaylanıp overbooking oluşur (para çoktan alınmıştır).
        # Rezervasyon tek bir koşullu UPDATE ile yapılır ki satır kilidi (SQLite'ta
        # etkisiz) gerekmesin ve kaybeden istek 0 satır güncelleyip hata alsın.
        try:
            with transaction.atomic():
                slot = ShuttleAvailability.objects.filter(
                    shuttle_route=shuttle_route, date=start_date, time=start_time
                ).first()
                if slot is None:
                    raise ValueError('Seçilen tarih/saat için müsaitlik bulunmamaktadır.')

                reserved = ShuttleAvailability.objects.filter(
                    pk=slot.pk,
                    booked_count__lte=F('max_capacity') - guests,
                ).update(booked_count=F('booked_count') + guests)
                if not reserved:
                    slot.refresh_from_db()
                    raise ValueError(
                        f'Seçilen saatte en fazla {max(slot.remaining, 0)} kişilik yer kalmıştır.'
                    )

                # Fiyat her zaman backend'de hesaplanır — client'tan gelen bir
                # tutara asla güvenilmez (create-payment-intent'teki pattern'le
                # tutarlı, bkz. app/lib/orderCalculator.ts).
                total_price = shuttle_route.price_per_person * guests

                intent = get_provider().create_intent(
                    amount=total_price,
                    currency='TRY',
                    metadata={'shuttle_route_id': shuttle_route.id, 'user_id': booking_user.id},
                )

                booking_ref = intent.booking_ref
                booking = Booking.objects.create(
                    user=booking_user,
                    shuttle_route=shuttle_route,
                    tour=None,
                    service_type='shuttle',
                    start_date=start_date,
                    start_time=start_time,
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
        except ProviderNotConfigured as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except PaymentError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        send_templated_mail('booking_created', booking_user.email, {
            'user_name': display_name(booking_user),
            'service_label': f'{shuttle_route.title} transferi',
            'date_label': f'{start_date} {start_time}',
            'guest_label': 'Yolcu sayısı',
            'guests': guests,
            'total_price': total_price,
            'booking_ref': booking_ref,
            'ticket_url': ticket_link_for(booking),
        })

        serializer = self.get_serializer(booking)
        return Response(
            {'booking': serializer.data, 'clientSecret': intent.client_secret},
            status=status.HTTP_201_CREATED
        )

    # ─────────────────────────────────────────────────────────────────────────
    # CREATE (COMBO) — Tur + restoran menüsü paketi, tek ödeme (F5-03)
    # Tur akışıyla aynı atomik kontenjan deseni kullanılır; FARK: yalnızca TUR
    # kontenjanı kilitlenir (restoran/menü tarafında kapasite kavramı yok —
    # F5-02'de ertelendi), bu yüzden "ikinci kilit / sabit kilit sırası" gerekmez
    # ve deadlock riski yoktur. Restoran tarafı kapasitesiz bir DiningReservation
    # olarak aynı transaction içinde oluşturulur; ikisi `combo_group` ile eşlenir.
    # Fiyat her zaman sunucuda hesaplanır (istemci tutarı yok sayılır).
    # ─────────────────────────────────────────────────────────────────────────
    def _create_combo_booking(self, request, booking_user):
        combo_id   = request.data.get('combo_id')
        start_date = request.data.get('start_date')
        # Restoran rezervasyonunun saati (turun tarihi ile aynı gün).
        start_time = request.data.get('start_time')

        try:
            guests = int(request.data.get('guests', 1))
        except (TypeError, ValueError):
            return Response({'error': 'Geçersiz kişi sayısı.'}, status=status.HTTP_400_BAD_REQUEST)
        if guests < 1:
            return Response({'error': 'Kişi sayısı en az 1 olmalıdır.'}, status=status.HTTP_400_BAD_REQUEST)

        if not start_date or not start_time:
            return Response(
                {'error': 'start_date ve start_time zorunludur.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            combo = Combo.objects.select_related('tour', 'menu', 'menu__restaurant').get(
                id=combo_id, is_active=True
            )
        except Combo.DoesNotExist:
            return Response({'error': 'Paket bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

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

        # DiningReservation.reservation_time bir TimeField'tır ve post_save
        # sinyali (agencies/signals.py) üzerinde .strftime() çağırır; bu yüzden
        # string yerine gerçek time nesnesi yazılmalı.
        try:
            parsed_time = datetime.strptime(start_time, '%H:%M').time()
        except ValueError:
            return Response(
                {'error': 'Geçersiz saat formatı. HH:MM kullanın.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tour = combo.tour
        menu = combo.menu

        try:
            with transaction.atomic():
                # ── Tur kontenjanını kilitle (tek gerçek kilit) ──────────────
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

                # ── Fiyat sunucuda: indirim (tur günlük fiyatı + menü) toplamına ─
                tour_unit = slot.effective_price
                menu_unit = menu.effective_price()
                bundle_unit = combo.bundle_unit_price(tour_unit, menu_unit)
                total_price = bundle_unit * guests
                # Restoran analitiği için menü tarafının brüt tutarı (indirimsiz);
                # platform indirimi paket düzeyinde uygulanır.
                dining_amount = (Decimal(menu_unit) * guests).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )

                intent = get_provider().create_intent(
                    amount=total_price,
                    currency='TRY',
                    metadata={'combo_id': combo.id, 'user_id': booking_user.id},
                )

                combo_group = uuid.uuid4()
                booking_ref = intent.booking_ref
                guest_full_name = (request.data.get('guest_full_name') or '')[:150]
                guest_email = (request.data.get('guest_email') or '')[:254]
                guest_phone = (request.data.get('guest_phone') or '')[:32]

                booking = Booking.objects.create(
                    user=booking_user,
                    tour=tour,
                    combo=combo,
                    combo_group=combo_group,
                    service_type='combo',
                    start_date=start_date,
                    start_time=parsed_time,
                    guests=guests,
                    total_price=total_price,
                    status='pending',
                    booking_ref=booking_ref,
                    payment_intent_id=intent.intent_id,
                    guest_full_name=guest_full_name,
                    guest_email=guest_email,
                    guest_phone=guest_phone,
                    guest_hotel=(request.data.get('guest_hotel') or '')[:255],
                )

                # Restoran tarafı: kapasitesiz DiningReservation (aynı gruptan).
                DiningReservation.objects.create(
                    restaurant=menu.restaurant,
                    guest_name=guest_full_name or display_name(booking_user),
                    guest_phone=guest_phone,
                    guest_email=guest_email or booking_user.email,
                    guest_count=guests,
                    reservation_date=start_date,
                    reservation_time=parsed_time,
                    notes=f'Combo: {combo.title} (Rez. {booking_ref})',
                    status='pending',
                    total_amount=dining_amount,
                    combo_group=combo_group,
                )

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ProviderNotConfigured as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except PaymentError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        send_templated_mail('booking_created', booking_user.email, {
            'user_name': display_name(booking_user),
            'service_label': f'{combo.title} paketi',
            'date_label': f'{start_date} {start_time}',
            'guest_label': 'Kişi sayısı',
            'guests': guests,
            'total_price': total_price,
            'booking_ref': booking_ref,
            'ticket_url': ticket_link_for(booking),
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

    @staticmethod
    def _release_shuttle_capacity(booking):
        """
        `_create_shuttle_booking()` sırasında tutulan transfer kontenjanını geri
        bırakır. Tur akışıyla aynı koşullu UPDATE deseni: eksiye düşmez, kilit
        gerektirmez.
        """
        if booking.service_type != 'shuttle' or not (
            booking.shuttle_route_id and booking.start_date and booking.start_time
        ):
            return
        ShuttleAvailability.objects.filter(
            shuttle_route_id=booking.shuttle_route_id,
            date=booking.start_date,
            time=booking.start_time,
            booked_count__gte=booking.guests,
        ).update(booked_count=F('booked_count') - booking.guests)

    @classmethod
    def _release_capacity(cls, booking):
        """Rezervasyon türüne göre doğru kontenjanı serbest bırakır."""
        if booking.service_type == 'shuttle':
            cls._release_shuttle_capacity(booking)
        else:
            # Combo da tur kontenjanı kullanır; _release_tour_capacity combo'yu
            # da işler (service_type != 'shuttle' ve tour_id/start_date dolu).
            cls._release_tour_capacity(booking)

    @staticmethod
    def _sync_combo_dining(booking, new_status):
        """
        Combo Booking'in durumu değişince (onay/iptal/başarısız), aynı
        `combo_group`'a bağlı restoran DiningReservation'ını da senkronlar
        (F5-03). Combo dışı rezervasyonlarda no-op. DiningReservation'da
        'failed' yok; ödeme başarısızı da 'cancelled' olarak yazılır.
        """
        if not booking.combo_group:
            return
        DiningReservation.objects.filter(combo_group=booking.combo_group).update(status=new_status)

    # ─────────────────────────────────────────────────────────────────────────
    # GUEST TICKET — İmzalı sihirli bağlantıyla misafir bileti görüntüleme
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='guest-ticket')
    def guest_ticket(self, request):
        """GET /api/v1/bookings/guest-ticket/?token=<imzalı token>

        Misafir hesabı parolasız olduğundan panele giremez; biletine yalnız
        e-postasına gönderilen imzalı bağlantıyla ulaşır. Token, Booking'in
        tahmin edilemez UUID id'sini taşır ve süreli/imzalıdır (bkz. tokens.py).
        """
        token = request.query_params.get('token', '')
        if not token:
            return Response({'error': 'Token gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            booking_id = read_ticket_token(token)
        except signing.BadSignature:
            return Response(
                {'error': 'Bağlantı geçersiz veya süresi dolmuş.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            booking = Booking.objects.select_related(
                'tour', 'tour__agency', 'shuttle_route', 'shuttle_route__agency'
            ).get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({'error': 'Rezervasyon bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(booking)
        return Response(serializer.data)

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

        # İade oranı, turun iptal politikasına ve hizmete kalan saate göre
        # hesaplanır (F4-04). Transferde politika alanı yoktur; en cömert olan
        # 'flexible' varsayılır. Tarihsiz eski kayıtlarda kısıt yoktur → %100.
        policy = booking.tour.cancellation_policy if booking.tour_id else 'flexible'
        refund_percent = 100
        if booking.start_date:
            start_time = booking.start_time or time_type(0, 0)
            starts_at = timezone.make_aware(
                datetime.combine(booking.start_date, start_time),
                timezone.get_current_timezone(),
            )
            hours_before = (starts_at - timezone.now()).total_seconds() / 3600
            refund_percent = refund_percent_for_policy(policy, hours_before)

        # İptal her zaman kabul edilir (kontenjan boşalsın); geri ödenen tutar
        # politikaya göre tam/kısmi/sıfır olabilir. %0 durumunda para iade
        # edilmez ama rezervasyon yine iptal edilir.
        refunded = False
        refund_amount = Decimal('0.00')
        if booking.status == 'confirmed' and refund_percent > 0:
            provider = get_provider()
            if booking.payment_intent_id and provider.is_configured():
                refund_amount = (
                    booking.total_price * Decimal(refund_percent) / Decimal('100')
                ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                try:
                    # Tam iadede tutar geçilmez (PSP intent'in tümünü iade eder);
                    # kısmi iadede hesaplanan tutar açıkça verilir.
                    if refund_percent >= 100:
                        provider.refund(intent_id=booking.payment_intent_id)
                    else:
                        provider.refund(intent_id=booking.payment_intent_id, amount=refund_amount)
                    refunded = True
                    logger.info(
                        f"Refund created for booking {booking.booking_ref} "
                        f"(policy={policy}, %{refund_percent}, ₺{refund_amount})"
                    )
                except PaymentError as e:
                    return Response(
                        {'error': f'İade işlemi başarısız: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # Kontenjanı geri ver. Hem tur hem transfer rezervasyonlarında kontenjan
        # `create()` anında tutulduğu için 'pending' kayıtlar da yer işgal eder;
        # bu yüzden iade yapılmayan (ödenmemiş) iptallerde de bırakılması gerekir.
        with transaction.atomic():
            if booking.status in ('pending', 'confirmed'):
                self._release_capacity(booking)
                # Combo ise eşlenmiş restoran rezervasyonunu da iptal et (F5-03).
                self._sync_combo_dining(booking, 'cancelled')

            booking.status = 'cancelled'
            booking.cancelled_at = timezone.now()
            booking.save(update_fields=['status', 'cancelled_at'])

        # İade yapıldıysa hakediş kaydı geri alınmalı: satış kaydı silinmez,
        # karşısına negatif tutarlı bir `refund` satırı yazılır (muhasebe izi
        # korunur, bakiye kendiliğinden düşer).
        if refunded:
            from agencies.finance_models import AgentFinanceLedger
            try:
                # Kısmi iadede hakediş de yalnız iade edilen oran kadar geri
                # alınır; acentanın elinde kalan tutar defterde kalır.
                AgentFinanceLedger.create_refund_entry(
                    booking, refund_ratio=Decimal(refund_percent) / Decimal('100')
                )
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
            'refund_amount': refund_amount,
            'refund_percent': refund_percent,
        })

        refund_text = (
            f'İade: %{refund_percent} (₺{refund_amount}).' if refunded else 'İade yapılmadı.'
        )
        enqueue_notification(
            event_type='booking_cancelled',
            recipient=guest_phone(booking),
            context={
                'name': display_name(request.user),
                'service': service_label(booking),
                'ref': booking.booking_ref,
                'refund': refund_text,
            },
            booking=booking,
        )

        serializer = self.get_serializer(booking)
        return Response({
            **serializer.data,
            'refunded': refunded,
            'refund_amount': str(refund_amount),
            'refund_percent': refund_percent,
        })

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
                newly_confirmed = False
                with transaction.atomic():
                    booking = Booking.objects.select_for_update().get(
                        payment_intent_id=event.intent_id
                    )
                    if booking.status != 'confirmed':
                        booking.status = 'confirmed'
                        booking.save(update_fields=['status'])
                        newly_confirmed = True
                        logger.info(f"Booking {booking.booking_ref} confirmed via webhook")

                        # Hem tur hem transfer kontenjanı create() sırasında zaten
                        # rezerve edildi (F5-01); burada tekrar düşmek çift sayıma
                        # yol açar, o yüzden webhook kontenjana dokunmaz.

                        # Combo ise restoran tarafını da onayla (F5-03).
                        self._sync_combo_dining(booking, 'confirmed')

                # E-posta atomic dışında
                send_templated_mail('booking_confirmed', booking.user.email, {
                    'user_name': display_name(booking.user),
                    'service_label': service_label(booking),
                    'date_label': booking.date_label or booking.start_date,
                    'booking_ref': booking.booking_ref,
                    'ticket_url': ticket_link_for(booking),
                })

                # Misafir (üyeliksiz) satın alma → "hesap oluştur, biletin hazır"
                # daveti. İmzalı claim token'ıyla misafir parola atayıp hesabını
                # sahiplenebilir. Yalnız gerçek onay geçişinde bir kez gönderilir.
                if newly_confirmed and is_guest_user(booking.user):
                    send_templated_mail('guest_claim_invite', booking.user.email, {
                        'user_name': display_name(booking.user),
                        'service_label': service_label(booking),
                        'booking_ref': booking.booking_ref,
                        'ticket_url': ticket_link_for(booking),
                        'claim_url': frontend_url(
                            '/claim-account', token=make_claim_token(booking.user)
                        ),
                    })

                # SMS/WhatsApp bildirimleri yalnız gerçek geçişte (mükerrer
                # webhook'ta değil) kuyruğa eklenir; asıl gönderim asenkrondur.
                if newly_confirmed:
                    date_label = booking.date_label or (
                        booking.start_date.strftime('%d.%m.%Y') if booking.start_date else ''
                    )
                    enqueue_notification(
                        event_type='booking_confirmed',
                        recipient=guest_phone(booking),
                        context={
                            'name': booking.guest_full_name or display_name(booking.user),
                            'service': service_label(booking),
                            'ref': booking.booking_ref,
                            'url': ticket_url(),
                        },
                        booking=booking,
                    )
                    service = booking.tour or booking.shuttle_route
                    enqueue_notification(
                        event_type='new_booking',
                        recipient=agency_phone(service),
                        context={
                            'service': service_label(booking),
                            'ref': booking.booking_ref,
                            'guests': booking.guests,
                            'date': date_label,
                        },
                        booking=booking,
                    )

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
                        self._release_capacity(booking)
                        # Combo ise eşlenmiş restoran rezervasyonunu da iptal et.
                        self._sync_combo_dining(booking, 'cancelled')
                logger.info(f"Booking {booking.booking_ref} marked as failed via webhook")

                send_templated_mail('booking_payment_failed', booking.user.email, {
                    'user_name': display_name(booking.user),
                    'service_label': service_label(booking),
                    'booking_ref': booking.booking_ref,
                })
            except Booking.DoesNotExist:
                logger.warning(f"Webhook: No booking found for failed payment_intent {event.intent_id}")

        return HttpResponse(status=200)
