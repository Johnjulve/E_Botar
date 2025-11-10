from django.contrib import admin
from django.utils.html import format_html
from .models import SecurityEvent, ActivityLog, AccessAttempt


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display = ['user', 'event_type', 'severity_badge', 'description_short', 'ip_address', 'created_at']
    list_filter = ['event_type', 'severity', 'created_at']
    search_fields = ['user__username', 'description', 'ip_address']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    
    def severity_badge(self, obj):
        """Display severity with color badge"""
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
    severity_badge.short_description = 'Severity'
    
    def description_short(self, obj):
        """Display shortened description"""
        return obj.description[:100] + '...' if len(obj.description) > 100 else obj.description
    description_short.short_description = 'Description'


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'resource_type', 'resource_id', 'description_short', 'created_at']
    list_filter = ['action', 'resource_type', 'created_at']
    search_fields = ['user__username', 'description', 'resource_type']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    
    def description_short(self, obj):
        """Display shortened description"""
        return obj.description[:100] + '...' if len(obj.description) > 100 else obj.description
    description_short.short_description = 'Description'


@admin.register(AccessAttempt)
class AccessAttemptAdmin(admin.ModelAdmin):
    list_display = ['username', 'success_badge', 'ip_address', 'failure_reason', 'timestamp']
    list_filter = ['success', 'timestamp']
    search_fields = ['username', 'ip_address']
    ordering = ['-timestamp']
    readonly_fields = ['timestamp']
    
    def success_badge(self, obj):
        """Display success status with badge"""
        if obj.success:
            return format_html(
                '<span style="background-color: #28A745; color: white; padding: 3px 10px; border-radius: 3px;">Success</span>'
            )
        return format_html(
            '<span style="background-color: #DC3545; color: white; padding: 3px 10px; border-radius: 3px;">Failed</span>'
        )
    success_badge.short_description = 'Status'

