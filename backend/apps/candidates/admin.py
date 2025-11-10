from django.contrib import admin
from django.utils.html import format_html
from .models import Candidate, CandidateApplication


@admin.register(CandidateApplication)
class CandidateApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'position', 'election', 'party', 
        'status_badge', 'submitted_at', 'reviewed_by'
    ]
    list_filter = ['status', 'election', 'position', 'party', 'submitted_at']
    search_fields = [
        'user__username', 'user__email', 'user__first_name', 'user__last_name',
        'position__name', 'election__title', 'manifesto'
    ]
    ordering = ['-submitted_at']
    readonly_fields = ['submitted_at', 'reviewed_at']
    
    fieldsets = (
        ('Application Info', {
            'fields': ('user', 'position', 'election', 'party')
        }),
        ('Campaign Details', {
            'fields': ('manifesto', 'photo', 'supporting_documents')
        }),
        ('Review Status', {
            'fields': ('status', 'submitted_at', 'reviewed_at', 'reviewed_by', 'review_notes')
        }),
    )
    
    def status_badge(self, obj):
        """Display status with color badge"""
        colors = {
            'pending': '#FFA500',
            'approved': '#28A745',
            'rejected': '#DC3545',
            'withdrawn': '#6C757D',
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def save_model(self, request, obj, form, change):
        """Auto-set reviewed_by when status changes"""
        if change and 'status' in form.changed_data:
            if obj.status in ['approved', 'rejected']:
                obj.reviewed_by = request.user
                from django.utils import timezone
                obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)
    
    actions = ['approve_applications', 'reject_applications']
    
    def approve_applications(self, request, queryset):
        """Bulk approve applications"""
        count = 0
        for application in queryset.filter(status='pending'):
            try:
                application.approve(request.user)
                count += 1
            except Exception as e:
                self.message_user(request, f"Error approving {application}: {str(e)}", level='error')
        
        self.message_user(request, f"{count} application(s) approved successfully.")
    approve_applications.short_description = "Approve selected applications"
    
    def reject_applications(self, request, queryset):
        """Bulk reject applications"""
        count = 0
        for application in queryset.filter(status='pending'):
            try:
                application.reject(request.user, 'Bulk rejection by admin')
                count += 1
            except Exception as e:
                self.message_user(request, f"Error rejecting {application}: {str(e)}", level='error')
        
        self.message_user(request, f"{count} application(s) rejected.")
    reject_applications.short_description = "Reject selected applications"


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'position', 'election', 'party', 
        'is_active', 'has_photo', 'created_at'
    ]
    list_filter = ['is_active', 'election', 'position', 'party', 'created_at']
    search_fields = [
        'user__username', 'user__email', 'user__first_name', 'user__last_name',
        'position__name', 'election__title', 'manifesto'
    ]
    ordering = ['election', 'position__display_order', 'user__first_name']
    readonly_fields = ['created_at', 'updated_at', 'approved_application']
    
    fieldsets = (
        ('Candidate Info', {
            'fields': ('user', 'position', 'election', 'party', 'is_active')
        }),
        ('Campaign Details', {
            'fields': ('manifesto', 'photo')
        }),
        ('Metadata', {
            'fields': ('approved_application', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_photo(self, obj):
        """Display if candidate has a photo"""
        return format_html(
            '<span style="color: {};">{}</span>',
            '#28A745' if obj.photo else '#DC3545',
            '✓' if obj.photo else '✗'
        )
    has_photo.short_description = 'Photo'
    
    actions = ['activate_candidates', 'deactivate_candidates']
    
    def activate_candidates(self, request, queryset):
        """Bulk activate candidates"""
        count = queryset.update(is_active=True)
        self.message_user(request, f"{count} candidate(s) activated.")
    activate_candidates.short_description = "Activate selected candidates"
    
    def deactivate_candidates(self, request, queryset):
        """Bulk deactivate candidates"""
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} candidate(s) deactivated.")
    deactivate_candidates.short_description = "Deactivate selected candidates"
