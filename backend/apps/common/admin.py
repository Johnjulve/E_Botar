from django.contrib import admin
from django.utils.html import format_html
from django.db import OperationalError, ProgrammingError
from django.core.exceptions import ImproperlyConfigured
from .models import SecurityEvent, ActivityLog
import logging

logger = logging.getLogger(__name__)


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display = ['user', 'event_type', 'severity_badge', 'description_short', 'ip_address', 'created_at']
    list_filter = ['event_type', 'severity', 'created_at']
    search_fields = ['user__username', 'description', 'ip_address']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """Override to handle missing table gracefully"""
        try:
            return super().get_queryset(request)
        except (OperationalError, ProgrammingError) as e:
            # Table doesn't exist or database error
            logger.warning(f"SecurityEvent table not accessible: {e}")
            # Return empty queryset
            return SecurityEvent.objects.none()
        except Exception as e:
            logger.error(f"Unexpected error accessing SecurityEvent: {e}")
            return SecurityEvent.objects.none()
    
    def severity_badge(self, obj):
        """Display severity with color badge"""
        try:
            colors = {
                'low': '#28A745',
                'medium': '#FFA500',
                'high': '#FF6347',
                'critical': '#DC3545',
            }
            color = colors.get(obj.severity, '#000000')
            return format_html(
                '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
                color,
                obj.get_severity_display()
            )
        except Exception as e:
            logger.error(f"Error displaying severity badge: {e}")
            return obj.get_severity_display() if hasattr(obj, 'get_severity_display') else str(obj.severity)
    severity_badge.short_description = 'Severity'
    
    def description_short(self, obj):
        """Display shortened description"""
        try:
            return obj.description[:100] + '...' if len(obj.description) > 100 else obj.description
        except Exception as e:
            logger.error(f"Error displaying description: {e}")
            return str(obj.description) if hasattr(obj, 'description') else ''
    description_short.short_description = 'Description'


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'resource_type', 'resource_id', 'description_short', 'created_at']
    list_filter = ['action', 'resource_type', 'created_at']
    search_fields = ['user__username', 'description', 'resource_type']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """Override to handle missing table gracefully"""
        try:
            return super().get_queryset(request)
        except (OperationalError, ProgrammingError) as e:
            # Table doesn't exist or database error
            logger.warning(f"ActivityLog table not accessible: {e}")
            # Return empty queryset
            return ActivityLog.objects.none()
        except Exception as e:
            logger.error(f"Unexpected error accessing ActivityLog: {e}")
            return ActivityLog.objects.none()
    
    def description_short(self, obj):
        """Display shortened description"""
        try:
            return obj.description[:100] + '...' if len(obj.description) > 100 else obj.description
        except Exception as e:
            logger.error(f"Error displaying description: {e}")
            return str(obj.description) if hasattr(obj, 'description') else ''
    description_short.short_description = 'Description'


