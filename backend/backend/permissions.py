from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` attribute, or checks agency ownership.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # For Agency objects
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
            
        # For Tour objects
        if hasattr(obj, 'agency'):
            return obj.agency.owner == request.user
            
        return False
