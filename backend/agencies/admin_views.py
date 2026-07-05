import logging

from rest_framework.views import APIView
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

from backend.admin_permissions import IsAdminUser
from agencies.models import Agency
from tours.models import Tour
from bookings.models import Booking
from users.models import Notification
from .admin_serializers import AdminAgencyListSerializer, AdminAgencyDetailSerializer

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
            'message': f'{agency.name} onaylandı.'
        })

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
            message=f'{agency.name} başvurunuz reddedildi. Sebep: {reason}',
            icon='❌',
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
            message=f'{agency.name} başvurunuzda eksik bilgi tespit edildi: {note}',
            icon='⚠️',
        )
        logger.info(f"[ONBOARDING] More info requested: agency '{agency.name}' by {request.user.username}")

        return Response({
            'id': agency.id,
            'status': agency.status,
            'rejection_reason': note,
            'message': f'{agency.name} için eksik bilgi talebi gönderildi.'
        })

    @staticmethod
    def _notify_owner(agency, title, message, icon):
        if not agency.owner:
            return
        Notification.objects.create(
            user=agency.owner, title=title, message=message, icon=icon,
            type='agency_status', action_url='/dashboard/agency',
        )
        if agency.owner.email:
            try:
                send_mail(
                    title, message, settings.DEFAULT_FROM_EMAIL,
                    [agency.owner.email], fail_silently=True,
                )
            except Exception as e:
                logger.warning(f"[ONBOARDING] Notification email failed for {agency.name}: {e}")
