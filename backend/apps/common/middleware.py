from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver
from django.conf import settings
from django.http import Http404
from .models import SecurityEvent, ActivityLog
import logging
import os

logger = logging.getLogger(__name__)


class DynamicAllowedHostsMiddleware(MiddlewareMixin):
    """Middleware to dynamically handle ALLOWED_HOSTS on any platform"""
    """This middleware runs before CommonMiddleware to allow dynamic host addition"""
    
    def process_request(self, request):
        """Handle ALLOWED_HOSTS dynamically - allow all hosts on cloud platforms"""
        # Check if we're in production (any platform)
        is_production = (
            os.environ.get('DJANGO_ENV') == 'production' or
            os.environ.get('ENVIRONMENT') == 'production' or
            os.environ.get('RAILWAY_ENVIRONMENT') is not None or
            os.environ.get('RAILWAY') is not None or
            os.environ.get('DYNO') is not None or  # Heroku
            os.environ.get('RENDER') is not None or  # Render
            os.environ.get('PORT') is not None  # Most platforms set PORT
        )
        
        if is_production:
            # Get the Host header (without port)
            host = request.get_host().split(':')[0]
            
            # If '*' is in ALLOWED_HOSTS, allow all hosts (matches working project)
            if '*' in settings.ALLOWED_HOSTS:
                # Allow all hosts - this is safe on cloud platforms
                return None
            
            # If ALLOWED_HOSTS doesn't include this host, add it dynamically
            if host not in settings.ALLOWED_HOSTS:
                settings.ALLOWED_HOSTS.append(host)
                logger.debug(f"Dynamically added host to ALLOWED_HOSTS: {host}")
        
        return None


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
            from django.db import OperationalError, ProgrammingError
            # Check if table exists before trying to create
            SecurityEvent.objects.create(
                user=request.user if request.user.is_authenticated else None,
                event_type='suspicious_activity',
                severity='high',
                description=f"Exception occurred: {str(exception)}",
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                metadata={'exception_type': type(exception).__name__}
            )
        except (OperationalError, ProgrammingError) as e:
            # Table doesn't exist - silently skip logging
            logger.debug(f"SecurityEvent table not available, skipping log: {e}")
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
            from django.db import OperationalError, ProgrammingError
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
        except (OperationalError, ProgrammingError) as e:
            # Table doesn't exist - silently skip logging
            logger.debug(f"SecurityEvent table not available, skipping log: {e}")
        except Exception as e:
            logger.error(f"Failed to log unauthorized access: {e}")


# Signal handlers for authentication events
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log successful user login"""
    try:
        from django.db import OperationalError, ProgrammingError
        ip_address = SecurityLoggingMiddleware.get_client_ip(request)
        
        # Log security event
        try:
            SecurityEvent.objects.create(
                user=user,
                event_type='login_attempt',
                severity='low',
                description=f"User {user.username} logged in successfully",
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                metadata={'status': 'success'}
            )
        except (OperationalError, ProgrammingError):
            # Table doesn't exist - skip security event logging
            logger.debug("SecurityEvent table not available, skipping security log")
        
        # Log activity
        try:
            ActivityLog.objects.create(
                user=user,
                action='login',
                resource_type='auth',
                description=f"User logged in from {ip_address}",
                ip_address=ip_address
            )
        except (OperationalError, ProgrammingError):
            # Table doesn't exist - skip activity logging
            logger.debug("ActivityLog table not available, skipping activity log")
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
        from django.db import OperationalError, ProgrammingError
        ip_address = SecurityLoggingMiddleware.get_client_ip(request)
        username = credentials.get('username', 'Unknown')
        
        # Log security event
        try:
            SecurityEvent.objects.create(
                user=None,
                event_type='failed_login',
                severity='medium',
                description=f"Failed login attempt for username: {username}",
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                metadata={
                    'username': username,
                    'status': 'failed',
                    'reason': 'invalid_credentials'
                }
            )
        except (OperationalError, ProgrammingError):
            # Table doesn't exist - skip logging
            logger.debug("SecurityEvent table not available, skipping failed login log")
    except Exception as e:
        logger.error(f"Failed to log failed login: {e}")

