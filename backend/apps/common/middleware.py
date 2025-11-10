from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver
from .models import SecurityEvent, ActivityLog, AccessAttempt
import logging

logger = logging.getLogger(__name__)


class SecurityLoggingMiddleware(MiddlewareMixin):
    """Middleware for logging security events and user activities"""
    
    def process_request(self, request):
        """Log incoming requests for security monitoring"""
        # Store request metadata for later use
        request.security_meta = {
            'ip_address': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500]
        }
        return None
    
    def process_response(self, request, response):
        """Log completed requests"""
        # Log suspicious patterns
        if response.status_code in [401, 403]:
            self.log_unauthorized_access(request, response.status_code)
        
        return response
    
    def process_exception(self, request, exception):
        """Log exceptions for security analysis"""
        try:
            SecurityEvent.objects.create(
                user=request.user if request.user.is_authenticated else None,
                event_type='suspicious_activity',
                severity='high',
                description=f"Exception occurred: {str(exception)}",
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                metadata={'exception_type': type(exception).__name__}
            )
        except Exception as e:
            logger.error(f"Failed to log exception event: {e}")
        
        return None
    
    @staticmethod
    def get_client_ip(request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def log_unauthorized_access(self, request, status_code):
        """Log unauthorized access attempts"""
        try:
            SecurityEvent.objects.create(
                user=request.user if request.user.is_authenticated else None,
                event_type='unauthorized_access',
                severity='medium',
                description=f"Unauthorized access attempt: {request.path} (HTTP {status_code})",
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                metadata={
                    'path': request.path,
                    'method': request.method,
                    'status_code': status_code
                }
            )
        except Exception as e:
            logger.error(f"Failed to log unauthorized access: {e}")


# Signal handlers for authentication events
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log successful user login"""
    try:
        ip_address = SecurityLoggingMiddleware.get_client_ip(request)
        
        # Log security event
        SecurityEvent.objects.create(
            user=user,
            event_type='login_attempt',
            severity='low',
            description=f"User {user.username} logged in successfully",
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        # Log access attempt
        AccessAttempt.objects.create(
            user=user,
            username=user.username,
            success=True,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        # Log activity
        ActivityLog.objects.create(
            user=user,
            action='login',
            resource_type='auth',
            description=f"User logged in from {ip_address}",
            ip_address=ip_address
        )
    except Exception as e:
        logger.error(f"Failed to log user login: {e}")


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout"""
    try:
        if user:
            ip_address = SecurityLoggingMiddleware.get_client_ip(request)
            
            ActivityLog.objects.create(
                user=user,
                action='logout',
                resource_type='auth',
                description=f"User logged out",
                ip_address=ip_address
            )
    except Exception as e:
        logger.error(f"Failed to log user logout: {e}")


@receiver(user_login_failed)
def log_failed_login(sender, credentials, request, **kwargs):
    """Log failed login attempt"""
    try:
        ip_address = SecurityLoggingMiddleware.get_client_ip(request)
        username = credentials.get('username', 'Unknown')
        
        # Log security event
        SecurityEvent.objects.create(
            user=None,
            event_type='failed_login',
            severity='medium',
            description=f"Failed login attempt for username: {username}",
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            metadata={'username': username}
        )
        
        # Log access attempt
        AccessAttempt.objects.create(
            user=None,
            username=username,
            success=False,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            failure_reason='Invalid credentials'
        )
    except Exception as e:
        logger.error(f"Failed to log failed login: {e}")

