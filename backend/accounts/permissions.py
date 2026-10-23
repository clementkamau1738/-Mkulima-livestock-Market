from rest_framework.permissions import BasePermission


class IsReviewer(BasePermission):
    """Active staff or administrators: may manage listings and review requests."""

    message = "Only staff can access this area."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_reviewer)


class IsAdministrator(BasePermission):
    """Administrators only: customer account management."""

    message = "Only administrators can do this."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.role == user.Role.ADMIN)
