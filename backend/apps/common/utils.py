"""Utility functions for logging and security"""
from .models import ActivityLog, SecurityEvent
import logging

logger = logging.getLogger(__name__)


def log_activity(user, action, resource_type, resource_id=None, description='', ip_address=None, metadata=None):
    """
    Log user activity
    
    Args:
        user: User instance or None
        action: Action type (create, update, delete, etc.)
        resource_type: Type of resource affected
        resource_id: ID of the resource (optional)
        description: Human-readable description
        ip_address: IP address (optional)
        metadata: Additional metadata dict (optional)
    """
    try:
        from django.db import OperationalError, ProgrammingError
        ActivityLog.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            ip_address=ip_address,
            metadata=metadata or {}
        )
    except (OperationalError, ProgrammingError) as e:
        # Table doesn't exist - silently skip logging
        logger.debug(f"ActivityLog table not available, skipping log: {e}")
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")


def log_security_event(user, event_type, severity, description, ip_address=None, user_agent='', metadata=None):
    """
    Log security event
    
    Args:
        user: User instance or None
        event_type: Type of security event
        severity: Severity level (low, medium, high, critical)
        description: Event description
        ip_address: IP address (optional)
        user_agent: User agent string (optional)
        metadata: Additional metadata dict (optional)
    """
    try:
        from django.db import OperationalError, ProgrammingError
        SecurityEvent.objects.create(
            user=user,
            event_type=event_type,
            severity=severity,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {}
        )
    except (OperationalError, ProgrammingError) as e:
        # Table doesn't exist - silently skip logging
        logger.debug(f"SecurityEvent table not available, skipping log: {e}")
    except Exception as e:
        logger.error(f"Failed to log security event: {e}")


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

