"""
Custom permission classes for E-Botar
"""
from rest_framework import permissions


class IsSuperUser(permissions.BasePermission):
    """
    Permission class that checks if user is a superuser (admin).
    This is different from IsAdminUser which checks is_staff.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser


class IsStaffOrSuperUser(permissions.BasePermission):
    """
    Permission class that allows both staff and superuser access.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.is_staff or request.user.is_superuser
        )

