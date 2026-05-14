"""
agencies/finance_views.py
--------------------------
Acenta Finansal Raporlama API'si — Production-Ready

Endpoint'ler:
  GET  /api/v1/agency/finance/summary/          → Bakiye, komisyon, toplam ciro
  GET  /api/v1/agency/finance/ledger/           → İşlem dökümü (sayfalı)
  POST /api/v1/agency/finance/payout-request/   → Hakediş talebi oluştur
  GET  /api/v1/agency/finance/payout-requests/  → Talep geçmişi
"""
import logging
from decimal import Decimal

from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from agencies.models import Agency
from agencies.finance_models import AgentFinanceLedger, AgentPayoutRequest
from core.permissions import IsAgentOwner

logger = logging.getLogger('agencies')


class LedgerPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AgencyFinanceSummaryView(APIView):
    """
    GET /api/v1/agency/finance/summary/
    Finansal özet: toplam ciro, komisyon, net bakiye, bekleyen talepler.
    """
    permission_classes = [IsAuthenticated, IsAgentOwner]

    def get(self, request):
        try:
            agency = Agency.objects.get(owner=request.user)
        except Agency.DoesNotExist:
            return Response({'error': 'Acenta profili bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

        ledger_agg = AgentFinanceLedger.objects.filter(
            agency=agency, entry_type='sale'
        ).aggregate(
            total_gross=Sum('gross_amount'),
            total_commission=Sum('commission_amount'),
            total_net=Sum('net_amount'),
            total_count=Count('id'),
        )

        paid_out = AgentPayoutRequest.objects.filter(
            agency=agency, status__in=['approved', 'paid']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        pending_payout = AgentPayoutRequest.objects.filter(
            agency=agency, status='pending'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_net    = ledger_agg['total_net'] or Decimal('0')
        available_balance = total_net - paid_out - pending_payout

        return Response({
            'agency_name':      agency.name,
            'commission_rate':  float(agency.commission_rate),
            'summary': {
                'total_gross':        float(ledger_agg['total_gross'] or 0),
                'total_commission':   float(ledger_agg['total_commission'] or 0),
                'total_net':          float(total_net),
                'total_transactions': ledger_agg['total_count'] or 0,
            },
            'balance': {
                'available':         float(available_balance),
                'paid_out':          float(paid_out),
                'pending_payout':    float(pending_payout),
            }
        })


class AgencyFinanceLedgerView(APIView):
    """
    GET /api/v1/agency/finance/ledger/
    İşlem dökümü — sayfalı, filtrelenebilir.
    Query params: ?month=2026-05 (opsiyonel)
    """
    permission_classes = [IsAuthenticated, IsAgentOwner]

    def get(self, request):
        try:
            agency = Agency.objects.get(owner=request.user)
        except Agency.DoesNotExist:
            return Response({'error': 'Acenta profili bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

        qs = AgentFinanceLedger.objects.filter(agency=agency)

        month_param = request.query_params.get('month')
        if month_param:
            try:
                year, month = month_param.split('-')
                qs = qs.filter(created_at__year=int(year), created_at__month=int(month))
            except ValueError:
                return Response({'error': 'month formatı: YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)

        paginator = LedgerPagination()
        page = paginator.paginate_queryset(qs, request)

        data = [
            {
                'booking_ref':      e.booking_ref,
                'tour_title':       e.tour_title,
                'tour_date':        str(e.tour_date) if e.tour_date else None,
                'gross_amount':     float(e.gross_amount),
                'commission_rate':  float(e.commission_rate),
                'commission_amount':float(e.commission_amount),
                'net_amount':       float(e.net_amount),
                'entry_type':       e.entry_type,
                'created_at':       e.created_at.isoformat(),
            }
            for e in page
        ]

        return paginator.get_paginated_response(data)


class AgencyPayoutRequestView(APIView):
    """
    POST /api/v1/agency/finance/payout-request/  → Hakediş talebi oluştur
    GET  /api/v1/agency/finance/payout-request/  → Talep geçmişi
    """
    permission_classes = [IsAuthenticated, IsAgentOwner]

    def get(self, request):
        try:
            agency = Agency.objects.get(owner=request.user)
        except Agency.DoesNotExist:
            return Response({'error': 'Acenta profili bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

        requests_qs = AgentPayoutRequest.objects.filter(agency=agency)
        data = [
            {
                'id':           r.id,
                'amount':       float(r.amount),
                'iban':         r.iban,
                'status':       r.status,
                'status_label': r.get_status_display(),
                'admin_notes':  r.admin_notes,
                'requested_at': r.requested_at.isoformat(),
                'resolved_at':  r.resolved_at.isoformat() if r.resolved_at else None,
            }
            for r in requests_qs
        ]
        return Response(data)

    def post(self, request):
        try:
            agency = Agency.objects.get(owner=request.user)
        except Agency.DoesNotExist:
            return Response({'error': 'Acenta profili bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

        # Mevcut bekleyen talep varsa yeni oluşturma
        if AgentPayoutRequest.objects.filter(agency=agency, status='pending').exists():
            return Response(
                {'error': 'Bekleyen bir hakediş talebiniz zaten mevcut. Önce incelenmesini bekleyin.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mevcut net bakiyeyi hesapla
        total_net = AgentFinanceLedger.objects.filter(
            agency=agency, entry_type='sale'
        ).aggregate(total=Sum('net_amount'))['total'] or Decimal('0')

        paid_out = AgentPayoutRequest.objects.filter(
            agency=agency, status__in=['approved', 'paid']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        available = total_net - paid_out

        if available <= Decimal('0'):
            return Response(
                {'error': 'Çekilebilir bakiyeniz bulunmamaktadır.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payout = AgentPayoutRequest.objects.create(
            agency=agency,
            amount=available,
            iban=request.data.get('iban', ''),
        )

        logger.info(
            f"[PAYOUT] Payout request created: agency='{agency.name}' amount=₺{payout.amount}"
        )

        return Response({
            'detail':       'Hakediş talebiniz alındı. 1-3 iş günü içinde işleme alınacaktır.',
            'payout_id':    payout.id,
            'amount':       float(payout.amount),
            'status':       payout.status,
            'requested_at': payout.requested_at.isoformat(),
        }, status=status.HTTP_201_CREATED)
