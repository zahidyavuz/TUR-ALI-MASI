from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Only allows access to users with is_staff=True.
    Used for admin dashboard endpoints.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
