from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class SecurityEvent(models.Model):
    """Model for security events and audit logging"""
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    EVENT_TYPE_CHOICES = [
        ('login_attempt', 'Login Attempt'),
        ('failed_login', 'Failed Login'),
        ('password_change', 'Password Change'),
        ('account_locked', 'Account Locked'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('unauthorized_access', 'Unauthorized Access'),
        ('admin_action', 'Admin Action'),
        ('data_access', 'Data Access'),
        ('data_modification', 'Data Modification'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='security_events')
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='low')
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        db_table = 'common_securityevent'
        ordering = ['-created_at']
        verbose_name = 'Security Event'
        verbose_name_plural = 'Security Events'
        indexes = [
            models.Index(fields=['event_type', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        user_str = self.user.username if self.user else 'Anonymous'
        return f"{self.event_type} - {user_str} ({self.created_at})"


class ActivityLog(models.Model):
    """Model for tracking user activities"""
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('vote', 'Vote'),
        ('apply', 'Apply'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50, help_text="Model or resource type")
    resource_id = models.IntegerField(null=True, blank=True, help_text="ID of the affected resource")
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        db_table = 'common_activitylog'
        ordering = ['-created_at']
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]
    
    def __str__(self):
        user_str = self.user.username if self.user else 'System'
        return f"{user_str} - {self.action} {self.resource_type} ({self.created_at})"


class SystemSettings(models.Model):
    """Model for system-wide settings"""
    key = models.CharField(max_length=100, unique=True, db_index=True)
    value = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_settings')
    
    class Meta:
        db_table = 'common_systemsettings'
        verbose_name = 'System Setting'
        verbose_name_plural = 'System Settings'
        ordering = ['key']
    
    def __str__(self):
        return f"{self.key}: {self.value}"
    
    @classmethod
    def get_value(cls, key, default=None):
        """Get a setting value by key"""
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default
    
    @classmethod
    def set_value(cls, key, value, description='', user=None):
        """Set a setting value by key"""
        setting, created = cls.objects.get_or_create(
            key=key,
            defaults={'value': value, 'description': description, 'updated_by': user}
        )
        if not created:
            setting.value = value
            if description:
                setting.description = description
            if user:
                setting.updated_by = user
            setting.save()
        return setting


