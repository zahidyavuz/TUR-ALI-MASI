"""
core/permissions.py — PRODUCTION-READY (genişletildi)
-----------------------------------------------------
Yeni eklenenler:
  • IsAgentOwner      → Acenta API'lerinde kendi acentasına ait veri dışında
                        hiçbir şeye erişememesini garantiler.
  • IsVerifiedAgent   → Sadece is_verified=True acentalar işlem yapabilir.
  • IsAgentOwner + StrictMassAssignmentPermission kombinasyonu
    önerilir: bunlar birlikte RLS (Row-Level Security) davranışı sağlar.
"""
from rest_framework import permissions


# ─────────────────────────────────────────────────────────────────────────────
# 1. GENEL NESNE SAHİBİ KONTROLÜ (mevcut, aynen korundu)
# ─────────────────────────────────────────────────────────────────────────────
class IsOwner(permissions.BasePermission):
    """
    BOLA (Broken Object Level Authorization) Kalkanı.
    Kullanıcı yalnızca kendi nesnesine erişebilir.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or getattr(request.user, 'role', '') == 'SuperAdmin':
            return True

        owner = None
        if hasattr(obj, 'user'):
            owner = obj.user
        elif hasattr(obj, 'owner'):
            owner = obj.owner
        elif hasattr(obj, 'agency'):
            owner = getattr(obj.agency, 'owner', None)

        return owner == request.user


# ─────────────────────────────────────────────────────────────────────────────
# 2. MASS-ASSIGNMENT BLOCKER (mevcut, aynen korundu)
# ─────────────────────────────────────────────────────────────────────────────
class StrictMassAssignmentPermission(permissions.BasePermission):
    """
    Kritik alanların yetkisiz değiştirilmesini engeller.
    """
    FORBIDDEN_FIELDS = [
        'is_staff', 'is_superuser', 'role', 'is_agency',
        'balance', 'commission_rate', 'is_verified', 'sub_merchant_id',
    ]

    def has_permission(self, request, view):
        if request.method in ['POST', 'PUT', 'PATCH']:
            for field in self.FORBIDDEN_FIELDS:
                if field in request.data:
                    if not (request.user.is_staff or getattr(request.user, 'role', '') == 'SuperAdmin'):
                        return False
        return True


# ─────────────────────────────────────────────────────────────────────────────
# 3. ACENTA SAHİBİ DOĞRULAMA — YENİ
# ─────────────────────────────────────────────────────────────────────────────
class IsAgentOwner(permissions.BasePermission):
    """
    Acenta paneli API'leri için ROW-LEVEL SECURITY (RLS) kalkanı.

    Kural: İstek yapan kullanıcı, sorgulamak istediği kaynağın
    sahibi olan acentayla (agency.owner) birebir eşleşmelidir.

    Kullanım:
        class AgencyTourViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, IsAgentOwner]

            def get_queryset(self):
                # Bu satır zorunludur — view seviyesinde RLS
                agency = get_object_or_404(Agency, owner=self.request.user)
                return Tour.objects.filter(agency=agency)

    Not: Bu permission class get_queryset() filtresiyle birlikte kullanılmalıdır.
    Yalnızca permission_classes yeterli değildir; queryset filtresi ZORUNLUDUR.
    """
    message = 'Bu kaynağa erişim yetkiniz bulunmamaktadır.'

    def has_permission(self, request, view):
        # Admin her şeyi yapabilir
        if request.user.is_staff:
            return True

        # Kullanıcının bir acentası olmalı
        from agencies.models import Agency
        return Agency.objects.filter(owner=request.user).exists()

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True

        # Nesne doğrudan bir Agency ise
        from agencies.models import Agency
        if isinstance(obj, Agency):
            return obj.owner == request.user

        # Nesne bir Tour ise
        if hasattr(obj, 'agency') and obj.agency:
            return obj.agency.owner == request.user

        # Nesne bir Booking ise (acenta kendi turunun rezervasyonuna bakabilir)
        if hasattr(obj, 'tour') and hasattr(obj.tour, 'agency') and obj.tour.agency:
            return obj.tour.agency.owner == request.user

        # Nesnenin 'agency' alanı varsa genel kontrol
        if hasattr(obj, 'agency') and obj.agency:
            return getattr(obj.agency, 'owner', None) == request.user

        return False


# ─────────────────────────────────────────────────────────────────────────────
# 4. ONAYLANMIŞ ACENTA KONTROLÜ — YENİ
# ─────────────────────────────────────────────────────────────────────────────
class IsVerifiedAgent(permissions.BasePermission):
    """
    Yalnızca is_verified=True olan acentaların işlem yapmasına izin verir.
    Başvurusu onaylanmamış acentalar tur ekleyemez, rezervasyon yönetemez.
    """
    message = 'Hesabınız henüz onaylanmamış. Lütfen admin onayını bekleyin.'

    def has_permission(self, request, view):
        if request.user.is_staff:
            return True

        # Salt okunur isteklere izin ver
        if request.method in permissions.SAFE_METHODS:
            return True

        from agencies.models import Agency
        try:
            agency = Agency.objects.get(owner=request.user)
            return agency.is_verified and agency.is_active
        except Agency.DoesNotExist:
            return False


# ─────────────────────────────────────────────────────────────────────────────
# MEVCUT (geriye dönük uyumluluk için alias)
# ─────────────────────────────────────────────────────────────────────────────
# backend/permissions.py'den import edilenler için alias
IsOwnerOrReadOnly = IsOwner
