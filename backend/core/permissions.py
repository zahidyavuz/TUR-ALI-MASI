from rest_framework import permissions

class IsOwner(permissions.BasePermission):
    """
    API-BOLA-BLOCKER
    Broken Object Level Authorization (BOLA) Kalkanı
    
    Kural: Bir kullanıcı sadece kendisine ait olan (user veya owner alanı ile bağlı)
    nesnelere erişebilir veya onları güncelleyebilir.
    """
    def has_object_permission(self, request, view, obj):
        # Admin her şeyi görebilir
        if request.user.is_staff or getattr(request.user, 'role', '') == 'SuperAdmin':
            return True
            
        # Nesne sahibi kontrolü (Farklı model isimlerini destekler)
        owner = None
        if hasattr(obj, 'user'):
            owner = obj.user
        elif hasattr(obj, 'owner'):
            owner = obj.owner
        elif hasattr(obj, 'agency'):
            # Acenta bazlı modeller için acenta sahibi kontrolü
            owner = getattr(obj.agency, 'user', None)
            
        return owner == request.user

class StrictMassAssignmentPermission(permissions.BasePermission):
    """
    MASS-ASSIGNMENT-BLOCKER
    Kritik Alanların Yetkisiz Değiştirilmesini Engeller.
    
    Örn: Bir kullanıcı kendi 'is_staff' veya 'role' alanını güncelleyemez.
    """
    FORBIDDEN_FIELDS = ['is_staff', 'is_superuser', 'role', 'is_agency', 'balance', 'commission_rate']
    
    def has_permission(self, request, view):
        if request.method in ['POST', 'PUT', 'PATCH']:
            for field in self.FORBIDDEN_FIELDS:
                if field in request.data:
                    # Sadece admin bu alanları değiştirebilir
                    if not (request.user.is_staff or getattr(request.user, 'role', '') == 'SuperAdmin'):
                        return False
        return True
