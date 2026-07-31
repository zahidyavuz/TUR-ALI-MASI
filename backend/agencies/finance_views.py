"""
agencies/finance_views.py
--------------------------
Acenta Finansal Raporlama API'si — Production-Ready

Endpoint'ler:
  GET  /api/v1/agency/finance/summary/          → Bakiye, komisyon, toplam ciro
  GET  /api/v1/agency/finance/ledger/           → İşlem dökümü (sayfalı, filtreli)
  GET  /api/v1/agency/finance/export/           → CSV ekstre (?month=YYYY-MM)
  POST /api/v1/agency/finance/payout-request/   → Hakediş talebi oluştur
  GET  /api/v1/agency/finance/payout-request/   → Talep geçmişi

Bakiye tanımı (tek yerde, `balance_snapshot`): ledger'daki **tüm** kayıt
tiplerinin net toplamı eksi ödenmiş/onaylanmış talepler eksi bekleyen talep.
İade satırları negatif tutar taşıdığı için ayrıca düşülmez.
"""
import csv
import logging
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Sum, Count
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from agencies.models import Agency
from agencies.finance_models import AgentFinanceLedger, AgentPayoutRequest
from core.permissions import IsAgentOwner, IsVerifiedAgent

logger = logging.getLogger('agencies')

VALID_ENTRY_TYPES = {choice[0] for choice in AgentFinanceLedger.ENTRY_TYPE_CHOICES}


class LedgerPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def mask_iban(iban):
    """
    IBAN'ı `TR12 •••• 8899` biçiminde maskeler.

    Acenta kendi hesabını görüyor, yani gizlilik değil **doğrulama** amaçlı:
    hakediş talebi göndermeden önce "para doğru hesaba gidiyor mu" sorusunu
    tam numarayı ekranda taşımadan cevaplayabilmeli (omuz sörfü, ekran
    paylaşımı, destek kaydına yapıştırılan ekran görüntüsü).
    """
    if not iban:
        return None
    cleaned = iban.replace(' ', '')
    if len(cleaned) <= 8:
        return cleaned
    return f'{cleaned[:4]} •••• {cleaned[-4:]}'


def balance_snapshot(agency):
    """
    Acentanın anlık finansal durumu. Tüm uçlar aynı sayıyı üretsin diye
    hesap tek yerde: panel bakiyesi ile talep sırasındaki kontrol arasında
    fark olursa acenta "bakiyem var ama talep edemiyorum" durumuna düşer.
    """
    ledger_agg = AgentFinanceLedger.objects.filter(agency=agency).aggregate(
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

    total_net = ledger_agg['total_net'] or Decimal('0')
    return {
        'total_gross': ledger_agg['total_gross'] or Decimal('0'),
        'total_commission': ledger_agg['total_commission'] or Decimal('0'),
        'total_net': total_net,
        'total_count': ledger_agg['total_count'] or 0,
        'paid_out': paid_out,
        'pending_payout': pending_payout,
        'available': total_net - paid_out - pending_payout,
    }


class AgencyFinanceBaseView(APIView):
    """Acenta çözümlemesini tek yerde tutar; her uç aynı 404'ü döner."""
    permission_classes = [IsAuthenticated, IsAgentOwner, IsVerifiedAgent]

    def get_agency(self, request):
        return Agency.objects.filter(owner=request.user).first()

    @staticmethod
    def agency_missing_response():
        return Response({'error': 'Acenta profili bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

    @staticmethod
    def filtered_ledger(agency, query_params):
        """
        Ortak filtreleme: `?month=YYYY-MM` ve `?type=sale|refund|adjustment`.

        Geçersiz değer sessizce yok sayılmaz — filtre uygulanmadan tüm kayıtlar
        dönerse acenta eksik/yanlış bir ekstreyi doğru sanır.
        """
        qs = AgentFinanceLedger.objects.filter(agency=agency)

        month_param = query_params.get('month')
        if month_param:
            try:
                year, month = month_param.split('-')
                year, month = int(year), int(month)
                if not 1 <= month <= 12:
                    raise ValueError
            except ValueError:
                raise ValueError('month formatı: YYYY-MM')
            qs = qs.filter(created_at__year=year, created_at__month=month)

        type_param = query_params.get('type')
        if type_param:
            if type_param not in VALID_ENTRY_TYPES:
                raise ValueError(
                    'Geçersiz type. Beklenen: ' + ', '.join(sorted(VALID_ENTRY_TYPES))
                )
            qs = qs.filter(entry_type=type_param)

        return qs


class AgencyFinanceSummaryView(AgencyFinanceBaseView):
    """
    GET /api/v1/agency/finance/summary/
    Finansal özet: toplam ciro, komisyon, net bakiye, bekleyen talepler.
    """

    def get(self, request):
        agency = self.get_agency(request)
        if agency is None:
            return self.agency_missing_response()

        snapshot = balance_snapshot(agency)
        pending = AgentPayoutRequest.objects.filter(agency=agency, status='pending').first()

        return Response({
            'agency_name':      agency.name,
            'commission_rate':  float(agency.commission_rate),
            'summary': {
                'total_gross':        float(snapshot['total_gross']),
                'total_commission':   float(snapshot['total_commission']),
                'total_net':          float(snapshot['total_net']),
                'total_transactions': snapshot['total_count'],
            },
            'balance': {
                'available':      float(snapshot['available']),
                'paid_out':       float(snapshot['paid_out']),
                'pending_payout': float(snapshot['pending_payout']),
            },
            # Panelde "para nereye gidecek" sorusunun cevabı; kayıtlı hesap
            # yoksa arayüz talep formu yerine onboarding'e yönlendirir.
            'bank_account': {
                'iban_masked':  mask_iban(agency.iban),
                'bank_name':    agency.bank_name,
                'holder':       agency.bank_account_holder,
                'is_complete':  bool(agency.iban and agency.bank_account_holder),
            },
            'pending_request': {
                'id':           pending.id,
                'amount':       float(pending.amount),
                'requested_at': pending.requested_at.isoformat(),
            } if pending else None,
        })


class AgencyFinanceLedgerView(AgencyFinanceBaseView):
    """
    GET /api/v1/agency/finance/ledger/
    İşlem dökümü — sayfalı, filtrelenebilir.
    Query params: ?month=2026-05 &type=sale|refund|adjustment
    """

    def get(self, request):
        agency = self.get_agency(request)
        if agency is None:
            return self.agency_missing_response()

        try:
            qs = self.filtered_ledger(agency, request.query_params)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = LedgerPagination()
        page = paginator.paginate_queryset(qs, request)

        data = [
            {
                'booking_ref':      e.booking_ref,
                'tour_title':       e.tour_title,
                'tour_date':        str(e.tour_date) if e.tour_date else None,
                'gross_amount':     float(e.gross_amount),
                'commission_rate':  float(e.commission_rate),
                'commission_amount': float(e.commission_amount),
                'net_amount':       float(e.net_amount),
                'entry_type':       e.entry_type,
                'entry_type_label': e.get_entry_type_display(),
                'notes':            e.notes,
                'created_at':       e.created_at.isoformat(),
            }
            for e in page
        ]

        return paginator.get_paginated_response(data)


class AgencyFinanceExportView(AgencyFinanceBaseView):
    """
    GET /api/v1/agency/finance/export/?month=YYYY-MM
    Ekstre — CSV. Muhasebeciye gönderilebilir tek dosya.
    """

    def get(self, request):
        agency = self.get_agency(request)
        if agency is None:
            return self.agency_missing_response()

        try:
            qs = self.filtered_ledger(agency, request.query_params)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        month_param = request.query_params.get('month')
        filename = f"tourkia-ekstre-{month_param or 'tum-zamanlar'}.csv"

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        # Excel'in Türkçe karakterleri doğru çözmesi için BOM şart; onsuz
        # "İstanbul" gibi başlıklar bozuk görünür.
        response.write('\ufeff')

        # Excel TR yerelinde ayırıcı olarak noktalı virgül bekler.
        writer = csv.writer(response, delimiter=';')
        writer.writerow([
            'Tarih', 'Rezervasyon', 'Hizmet', 'Hizmet Tarihi', 'Tip',
            'Brüt Tutar', 'Komisyon Oranı (%)', 'Komisyon', 'Net Hakediş',
        ])
        for entry in qs:
            writer.writerow([
                timezone.localtime(entry.created_at).strftime('%d.%m.%Y %H:%M'),
                entry.booking_ref,
                entry.tour_title,
                entry.tour_date.strftime('%d.%m.%Y') if entry.tour_date else '',
                entry.get_entry_type_display(),
                entry.gross_amount,
                entry.commission_rate,
                entry.commission_amount,
                entry.net_amount,
            ])
        return response


class AgencyPayoutRequestView(AgencyFinanceBaseView):
    """
    POST /api/v1/agency/finance/payout-request/  → Hakediş talebi oluştur
    GET  /api/v1/agency/finance/payout-request/  → Talep geçmişi
    """

    def get(self, request):
        agency = self.get_agency(request)
        if agency is None:
            return self.agency_missing_response()

        data = [
            {
                'id':           r.id,
                'amount':       float(r.amount),
                'iban_masked':  mask_iban(r.iban),
                'status':       r.status,
                'status_label': r.get_status_display(),
                'admin_notes':  r.admin_notes,
                'requested_at': r.requested_at.isoformat(),
                'resolved_at':  r.resolved_at.isoformat() if r.resolved_at else None,
            }
            for r in AgentPayoutRequest.objects.filter(agency=agency)
        ]
        return Response(data)

    def post(self, request):
        agency = self.get_agency(request)
        if agency is None:
            return self.agency_missing_response()

        # IBAN acentanın doğrulanmış profilinden alınır, istek gövdesinden
        # DEĞİL: aksi halde panele erişen biri hakedişi istediği hesaba
        # yönlendirebilirdi. Değiştirmek için onboarding/banka bilgileri
        # ekranından geçmek gerekir.
        if not agency.iban or not agency.bank_account_holder:
            return Response(
                {'error': 'Hakediş talebi için önce banka hesabı bilgilerinizi tamamlayın.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Talep bir para yazımı: iki sekmeden aynı anda gönderilen istek
        # bakiyeyi iki kez talep edebilirdi. Acenta satırı kilitlenerek
        # kontrol ve kayıt tek bir kritik bölgede yapılıyor.
        with transaction.atomic():
            locked_agency = Agency.objects.select_for_update().get(pk=agency.pk)

            if AgentPayoutRequest.objects.filter(agency=locked_agency, status='pending').exists():
                return Response(
                    {'error': 'Bekleyen bir hakediş talebiniz zaten mevcut. Önce incelenmesini bekleyin.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            available = balance_snapshot(locked_agency)['available']
            if available <= Decimal('0'):
                return Response(
                    {'error': 'Çekilebilir bakiyeniz bulunmamaktadır.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Tutar isteğe bağlı: gönderilmezse tüm bakiye talep edilir
            # (eski davranış). Gönderilirse bakiyeyi aşamaz.
            raw_amount = request.data.get('amount')
            if raw_amount in (None, ''):
                amount = available
            else:
                try:
                    amount = Decimal(str(raw_amount)).quantize(Decimal('0.01'))
                except (InvalidOperation, ValueError):
                    return Response({'error': 'Geçersiz tutar.'}, status=status.HTTP_400_BAD_REQUEST)
                if amount <= Decimal('0'):
                    return Response({'error': 'Tutar sıfırdan büyük olmalıdır.'},
                                    status=status.HTTP_400_BAD_REQUEST)
                if amount > available:
                    return Response(
                        {'error': f'Talep edilen tutar çekilebilir bakiyeyi aşıyor (₺{available}).'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            payout = AgentPayoutRequest.objects.create(
                agency=locked_agency,
                amount=amount,
                iban=locked_agency.iban,
            )

        logger.info(
            f"[PAYOUT] Payout request created: agency='{agency.name}' amount=₺{payout.amount}"
        )

        return Response({
            'detail':       'Hakediş talebiniz alındı. 1-3 iş günü içinde işleme alınacaktır.',
            'payout_id':    payout.id,
            'amount':       float(payout.amount),
            'iban_masked':  mask_iban(payout.iban),
            'status':       payout.status,
            'requested_at': payout.requested_at.isoformat(),
        }, status=status.HTTP_201_CREATED)
