import logging
from decimal import Decimal

from rest_framework.views import APIView
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta

from backend.admin_permissions import IsAdminUser
from core.emails import display_name, frontend_url, send_templated_mail
from agencies.models import Agency
from agencies.finance_models import AgentFinanceLedger, AgentPayoutRequest
from tours.models import Tour
from bookings.models import Booking
from users.models import Notification
from .admin_serializers import (
    AdminAgencyListSerializer,
    AdminAgencyDetailSerializer,
    AdminPayoutRequestSerializer,
)

logger = logging.getLogger('agencies')


class AdminDashboardView(APIView):
    """
    GET /api/v1/admin/dashboard/
    Returns overview stats for the admin panel home page.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)

        # Active agencies
        active_agencies = Agency.objects.filter(is_active=True, is_verified=True).count()
        total_agencies = Agency.objects.count()

        # Pending approvals
        pending_approvals = Agency.objects.filter(status='beklemede').count()

        # Today's bookings
        todays_bookings = Booking.objects.filter(created_at__date=today).count()
        yesterdays_bookings = Booking.objects.filter(created_at__date=yesterday).count()

        # Payment statuses (all time + today)
        payment_stats = Booking.objects.aggregate(
            confirmed=Count('id', filter=Q(status='confirmed')),
            pending=Count('id', filter=Q(status='pending')),
            failed=Count('id', filter=Q(status='failed')),
            cancelled=Count('id', filter=Q(status='cancelled')),
        )

        today_payment_stats = Booking.objects.filter(created_at__date=today).aggregate(
            confirmed=Count('id', filter=Q(status='confirmed')),
            pending=Count('id', filter=Q(status='pending')),
            failed=Count('id', filter=Q(status='failed')),
            cancelled=Count('id', filter=Q(status='cancelled')),
        )

        # Revenue
        total_revenue = Booking.objects.filter(
            status='confirmed'
        ).aggregate(total=Sum('total_price'))['total'] or 0

        todays_revenue = Booking.objects.filter(
            status='confirmed', created_at__date=today
        ).aggregate(total=Sum('total_price'))['total'] or 0

        # Total tours
        total_tours = Tour.objects.count()

        # Recent activities (last 5 bookings)
        recent_bookings = Booking.objects.select_related('tour', 'shuttle_route', 'user').order_by('-created_at')[:5]
        recent_activities = [
            {
                'id': str(b.id),
                'type': 'booking',
                'description': f'{b.user.username} - {b.tour.title if b.tour else (b.shuttle_route.title if b.shuttle_route else "Bilinmeyen hizmet")}',
                'status': b.status,
                'amount': float(b.total_price),
                'time': b.created_at.isoformat(),
            }
            for b in recent_bookings
        ]

        return Response({
            'widgets': {
                'active_agencies': {
                    'value': active_agencies,
                    'total': total_agencies,
                },
                'pending_approvals': {
                    'value': pending_approvals,
                },
                'todays_bookings': {
                    'value': todays_bookings,
                    'yesterday': yesterdays_bookings,
                },
                'payment_stats': {
                    'all_time': payment_stats,
                    'today': today_payment_stats,
                },
            },
            'total_revenue': float(total_revenue),
            'todays_revenue': float(todays_revenue),
            'total_tours': total_tours,
            'recent_activities': recent_activities,
        })


class AdminMetricsView(APIView):
    """
    GET /api/v1/admin/metrics/
    Operasyon paneli metrikleri — hepsi gerçek aggregate sorgular:
      * Kartlar: GMV, rezervasyon sayısı, komisyon geliri, aktif acente
        (her biri toplam + bu ay).
      * Aylık trend: son 12 ay (TruncMonth + Sum) — GMV / komisyon / adet.
      * Acente performans tablosu: ledger'dan ciro/komisyon/net + adet (top 10).
      * Son rezervasyonlar (son 8).
      * Bekleyen hakediş talebi özeti (onay kuyruğu rozeti için).
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # ── Kartlar ────────────────────────────────────────────────────────
        # GMV = onaylı rezervasyonların brüt cirosu (müşterinin ödediği).
        confirmed = Booking.objects.filter(status='confirmed')
        gmv_total = confirmed.aggregate(t=Sum('total_price'))['t'] or Decimal('0')
        gmv_month = confirmed.filter(created_at__gte=month_start).aggregate(
            t=Sum('total_price'))['t'] or Decimal('0')

        reservations_total = confirmed.count()
        reservations_month = confirmed.filter(created_at__gte=month_start).count()

        # Komisyon geliri = platformun kesintisi (ledger'daki commission_amount;
        # iade satırları negatif olduğu için toplam kendiliğinden netlenir).
        commission_total = AgentFinanceLedger.objects.aggregate(
            t=Sum('commission_amount'))['t'] or Decimal('0')
        commission_month = AgentFinanceLedger.objects.filter(
            created_at__gte=month_start).aggregate(t=Sum('commission_amount'))['t'] or Decimal('0')

        active_agencies = Agency.objects.filter(is_active=True, is_verified=True).count()
        active_agencies_month = Agency.objects.filter(
            is_active=True, is_verified=True, created_at__gte=month_start).count()

        # ── Aylık trend (son 12 ay) ────────────────────────────────────────
        trend_start = (month_start - timedelta(days=365)).replace(day=1)
        trend_qs = (
            AgentFinanceLedger.objects
            .filter(created_at__gte=trend_start)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(
                gmv=Sum('gross_amount'),
                commission=Sum('commission_amount'),
                count=Count('id'),
            )
            .order_by('month')
        )
        monthly_trend = [
            {
                'month': row['month'].strftime('%Y-%m'),
                'gmv': float(row['gmv'] or 0),
                'commission': float(row['commission'] or 0),
                'count': row['count'],
            }
            for row in trend_qs
        ]

        # ── Acente performans tablosu ──────────────────────────────────────
        perf_qs = (
            AgentFinanceLedger.objects
            .values('agency_id', 'agency__name')
            .annotate(
                gross=Sum('gross_amount'),
                commission=Sum('commission_amount'),
                net=Sum('net_amount'),
                count=Count('id'),
            )
            .order_by('-gross')[:10]
        )
        agency_performance = [
            {
                'agency_id': row['agency_id'],
                'agency_name': row['agency__name'],
                'gross': float(row['gross'] or 0),
                'commission': float(row['commission'] or 0),
                'net': float(row['net'] or 0),
                'count': row['count'],
            }
            for row in perf_qs
        ]

        # ── Son rezervasyonlar ─────────────────────────────────────────────
        recent = (
            Booking.objects
            .select_related('tour', 'shuttle_route', 'spa_service', 'user')
            .order_by('-created_at')[:8]
        )
        recent_bookings = [
            {
                'id': str(b.id),
                'user': b.user.username if b.user else '—',
                'service': self._service_label(b),
                'service_type': b.service_type,
                'amount': float(b.total_price),
                'status': b.status,
                'created_at': b.created_at.isoformat(),
            }
            for b in recent
        ]

        # ── Bekleyen hakediş özeti ─────────────────────────────────────────
        pending_payouts = AgentPayoutRequest.objects.filter(status='pending').aggregate(
            count=Count('id'), total=Sum('amount'))

        return Response({
            'cards': {
                'gmv': {'total': float(gmv_total), 'month': float(gmv_month)},
                'reservations': {'total': reservations_total, 'month': reservations_month},
                'commission_revenue': {'total': float(commission_total), 'month': float(commission_month)},
                'active_agencies': {'total': active_agencies, 'month': active_agencies_month},
            },
            'monthly_trend': monthly_trend,
            'agency_performance': agency_performance,
            'recent_bookings': recent_bookings,
            'pending_payouts': {
                'count': pending_payouts['count'] or 0,
                'total': float(pending_payouts['total'] or 0),
            },
        })

    @staticmethod
    def _service_label(booking):
        service = booking.tour or booking.shuttle_route or booking.spa_service
        if service:
            return getattr(service, 'title', None) or getattr(service, 'name', 'Bilinmeyen hizmet')
        return 'Bilinmeyen hizmet'


class AdminPayoutViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    Hakediş onay kuyruğu (F2-07 taleplerini onayla/reddet).
      GET  /api/v1/admin/payouts/                 → Talepler (varsayılan: pending)
      POST /api/v1/admin/payouts/<id>/approve/    → Onayla (opsiyonel admin_notes)
      POST /api/v1/admin/payouts/<id>/reject/     → Reddet (sebep zorunlu)
    """
    permission_classes = [IsAdminUser]
    serializer_class = AdminPayoutRequestSerializer
    queryset = AgentPayoutRequest.objects.select_related('agency').all()

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status', 'pending')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        note = (request.data.get('admin_notes') or '').strip()
        # Para durum değişimi: talep satırı kilitlenir, yalnız 'pending'
        # durumdaki bir talep onaylanabilir (çift işleme karşı).
        with transaction.atomic():
            payout = AgentPayoutRequest.objects.select_for_update().get(pk=pk)
            if payout.status != 'pending':
                return Response(
                    {'error': f'Yalnız bekleyen talepler onaylanabilir (mevcut: {payout.get_status_display()}).'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            payout.status = 'approved'
            payout.admin_notes = note or payout.admin_notes
            payout.resolved_at = timezone.now()
            payout.save(update_fields=['status', 'admin_notes', 'resolved_at'])

        self._notify(
            payout,
            title='Hakediş Talebiniz Onaylandı 💸',
            message=f'₺{payout.amount} tutarındaki hakediş talebiniz onaylandı, ödemeye alındı.',
            icon='💸',
        )
        logger.info(
            f"[PAYOUT] Approved: agency='{payout.agency.name}' amount=₺{payout.amount} by {request.user.username}"
        )
        return Response(AdminPayoutRequestSerializer(payout).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        reason = (request.data.get('reason') or request.data.get('admin_notes') or '').strip()
        if not reason:
            return Response({'error': 'Red sebebi zorunludur.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            payout = AgentPayoutRequest.objects.select_for_update().get(pk=pk)
            if payout.status != 'pending':
                return Response(
                    {'error': f'Yalnız bekleyen talepler reddedilebilir (mevcut: {payout.get_status_display()}).'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            payout.status = 'rejected'
            payout.admin_notes = reason
            payout.resolved_at = timezone.now()
            payout.save(update_fields=['status', 'admin_notes', 'resolved_at'])

        self._notify(
            payout,
            title='Hakediş Talebiniz Reddedildi',
            message=f'₺{payout.amount} tutarındaki hakediş talebiniz reddedildi.',
            icon='❌',
            reason=reason,
        )
        logger.info(
            f"[PAYOUT] Rejected: agency='{payout.agency.name}' amount=₺{payout.amount} by {request.user.username}"
        )
        return Response(AdminPayoutRequestSerializer(payout).data)

    @staticmethod
    def _notify(payout, title, message, icon, reason=''):
        owner = payout.agency.owner
        if not owner:
            return
        Notification.objects.create(
            user=owner, title=title, icon=icon,
            message=f'{message} Sebep: {reason}' if reason else message,
            type='payout_status', action_url='/dashboard/agency/finance',
        )


class AdminAgencyViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for agencies.
    GET /api/v1/admin/agencies/ — List all agencies (paginated)
    GET /api/v1/admin/agencies/<id>/ — Agency detail
    PATCH /api/v1/admin/agencies/<id>/ — Update agency
    POST /api/v1/admin/agencies/<id>/toggle_active/ — Toggle active/passive
    POST /api/v1/admin/agencies/<id>/approve/ — Approve agency
    """
    permission_classes = [IsAdminUser]
    queryset = Agency.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return AdminAgencyListSerializer
        return AdminAgencyDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Filters
        search = self.request.query_params.get('search', '')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(tursab_no__icontains=search)
            )

        is_verified = self.request.query_params.get('is_verified')
        if is_verified is not None:
            qs = qs.filter(is_verified=is_verified.lower() == 'true')

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')

        is_demo = self.request.query_params.get('is_demo')
        if is_demo is not None:
            qs = qs.filter(is_demo=is_demo.lower() == 'true')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        """Toggle agency active/passive status"""
        agency = self.get_object()
        agency.is_active = not agency.is_active
        agency.save(update_fields=['is_active'])
        return Response({
            'id': agency.id,
            'is_active': agency.is_active,
            'message': f'Acente {"aktif" if agency.is_active else "pasif"} yapıldı.'
        })

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Onaylar — status='onaylandi' + is_verified=True (IsVerifiedAgent bunu okur)."""
        agency = self.get_object()
        agency.status = 'onaylandi'
        agency.is_verified = True
        agency.rejection_reason = None
        agency.save(update_fields=['status', 'is_verified', 'rejection_reason'])

        sub_merchant_error = self._register_sub_merchant(agency)

        self._notify_owner(
            agency,
            title='Başvurunuz Onaylandı! 🎉',
            message=f'{agency.name} başvurunuz onaylandı. Artık ürün/tur ekleyebilirsiniz.',
            icon='🎉',
        )
        logger.info(f"[ONBOARDING] Approved: agency '{agency.name}' by {request.user.username}")

        return Response({
            'id': agency.id,
            'status': agency.status,
            'is_verified': True,
            'sub_merchant_id': agency.sub_merchant_id,
            'sub_merchant_error': sub_merchant_error,
            'message': f'{agency.name} onaylandı.'
        })

    @staticmethod
    def _register_sub_merchant(agency):
        """
        Onay anında acentayı PSP'de alt-üye işyeri olarak kaydeder (F2-06).

        Onayı BLOKLAMAZ: kayıt başarısız olursa acenta yine de panele girip
        ürün ekleyebilir, yalnız hakedişi ödenemez. Aksi halde PSP'nin geçici
        bir hatası tüm onboarding'i kilitlerdi. Hata mesajı yanıt gövdesinde
        admin'e döner ve loglanır; sessizce kaybolmaz.

        Alt-üye işyeri modeli olmayan sağlayıcılarda (Stripe) `None` döner ve
        hiçbir şey yapılmaz.
        """
        if agency.sub_merchant_id:
            return None

        from bookings.payments import PaymentError, get_provider
        try:
            sub_merchant_id = get_provider().register_sub_merchant(agency)
        except PaymentError as exc:
            logger.warning(
                f"[PSP] Sub-merchant registration failed for agency '{agency.name}': {exc}"
            )
            return str(exc)

        if sub_merchant_id:
            agency.sub_merchant_id = sub_merchant_id
            agency.save(update_fields=['sub_merchant_id'])
            logger.info(
                f"[PSP] Sub-merchant registered for agency '{agency.name}': {sub_merchant_id}"
            )
        return None

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Reddeder — sebep zorunlu, partnere gösterilir + bildirim gider."""
        agency = self.get_object()
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'error': 'Red sebebi zorunludur.'}, status=status.HTTP_400_BAD_REQUEST)

        agency.status = 'reddedildi'
        agency.is_verified = False
        agency.rejection_reason = reason
        agency.save(update_fields=['status', 'is_verified', 'rejection_reason'])

        self._notify_owner(
            agency,
            title='Başvurunuz Reddedildi',
            message=f'{agency.name} başvurunuz reddedildi.',
            icon='❌',
            reason=reason,
        )
        logger.info(f"[ONBOARDING] Rejected: agency '{agency.name}' by {request.user.username}")

        return Response({
            'id': agency.id,
            'status': agency.status,
            'rejection_reason': reason,
            'message': f'{agency.name} reddedildi.'
        })

    @action(detail=True, methods=['post'], url_path='request-more-info')
    def request_more_info(self, request, pk=None):
        """Eksik bilgi ister — partner düzenleyip tekrar gönderebilir (status geri taslak/eksik_bilgi'ye döner)."""
        agency = self.get_object()
        note = (request.data.get('message') or '').strip()
        if not note:
            return Response({'error': 'Eksik bilgi mesajı zorunludur.'}, status=status.HTTP_400_BAD_REQUEST)

        agency.status = 'eksik_bilgi'
        agency.is_verified = False
        agency.rejection_reason = note
        agency.save(update_fields=['status', 'is_verified', 'rejection_reason'])

        self._notify_owner(
            agency,
            title='Başvurunuzda Eksik Bilgi Var',
            message=f'{agency.name} başvurunuzda eksik bilgi tespit edildi.',
            icon='⚠️',
            reason=note,
        )
        logger.info(f"[ONBOARDING] More info requested: agency '{agency.name}' by {request.user.username}")

        return Response({
            'id': agency.id,
            'status': agency.status,
            'rejection_reason': note,
            'message': f'{agency.name} için eksik bilgi talebi gönderildi.'
        })

    @staticmethod
    def _notify_owner(agency, title, message, icon, reason=''):
        if not agency.owner:
            return
        # Uygulama içi bildirimin tek bir metin alanı var; sebep oraya iliştirilir.
        # E-postada ise ayrı bir blokta gösterilebildiği için ayrı geçirilir.
        Notification.objects.create(
            user=agency.owner, title=title, icon=icon,
            message=f'{message} Sebep: {reason}' if reason else message,
            type='agency_status', action_url='/dashboard/agency',
        )
        send_templated_mail('agency_status', agency.owner.email, {
            'user_name': display_name(agency.owner),
            'title': title,
            'message': message,
            'reason': reason,
            'dashboard_url': frontend_url('/dashboard/agency'),
        })
