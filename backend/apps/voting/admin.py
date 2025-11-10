from django.contrib import admin
from django.utils.html import format_html
from .models import VoteReceipt, AnonVote, Ballot, VoteChoice


@admin.register(VoteReceipt)
class VoteReceiptAdmin(admin.ModelAdmin):
    list_display = ['masked_receipt_display', 'user', 'election', 'created_at', 'ip_address']
    list_filter = ['election', 'created_at']
    search_fields = ['user__username', 'user__email', 'receipt_code', 'election__title']
    ordering = ['-created_at']
    readonly_fields = ['receipt_code', 'receipt_hash', 'created_at', 'ip_address']
    
    fieldsets = (
        ('Receipt Info', {
            'fields': ('user', 'election', 'receipt_code', 'receipt_hash')
        }),
        ('Metadata', {
            'fields': ('created_at', 'ip_address'),
            'classes': ('collapse',)
        }),
    )
    
    def masked_receipt_display(self, obj):
        """Display masked receipt code"""
        return obj.get_masked_receipt()
    masked_receipt_display.short_description = 'Receipt Code'


class VoteChoiceInline(admin.TabularInline):
    model = VoteChoice
    extra = 0
    readonly_fields = ['position', 'candidate', 'created_at', 'anonymized']
    can_delete = False


@admin.register(Ballot)
class BallotAdmin(admin.ModelAdmin):
    list_display = ['user', 'election', 'submitted_at', 'has_receipt', 'total_choices']
    list_filter = ['election', 'submitted_at']
    search_fields = ['user__username', 'user__email', 'election__title']
    ordering = ['-submitted_at']
    readonly_fields = ['user', 'election', 'receipt', 'submitted_at', 'ip_address', 'user_agent']
    inlines = [VoteChoiceInline]
    
    fieldsets = (
        ('Ballot Info', {
            'fields': ('user', 'election', 'receipt')
        }),
        ('Submission Details', {
            'fields': ('submitted_at', 'ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
    )
    
    def has_receipt(self, obj):
        """Display if ballot has receipt"""
        return format_html(
            '<span style="color: {};">{}</span>',
            '#28A745' if obj.receipt else '#DC3545',
            '✓' if obj.receipt else '✗'
        )
    has_receipt.short_description = 'Receipt'
    
    def total_choices(self, obj):
        """Display total vote choices"""
        return obj.choices.count()
    total_choices.short_description = 'Choices'


@admin.register(VoteChoice)
class VoteChoiceAdmin(admin.ModelAdmin):
    list_display = ['ballot', 'position', 'candidate', 'anonymized_badge', 'created_at']
    list_filter = ['anonymized', 'position', 'ballot__election', 'created_at']
    search_fields = ['ballot__user__username', 'candidate__user__username', 'position__name']
    ordering = ['-created_at']
    readonly_fields = ['ballot', 'position', 'candidate', 'created_at', 'anonymized']
    
    def anonymized_badge(self, obj):
        """Display anonymization status with badge"""
        if obj.anonymized:
            return format_html(
                '<span style="background-color: #28A745; color: white; padding: 3px 10px; border-radius: 3px;">Anonymized</span>'
            )
        return format_html(
            '<span style="background-color: #FFA500; color: white; padding: 3px 10px; border-radius: 3px;">Pending</span>'
        )
    anonymized_badge.short_description = 'Status'
    
    actions = ['anonymize_choices']
    
    def anonymize_choices(self, request, queryset):
        """Bulk anonymize vote choices"""
        count = 0
        for choice in queryset.filter(anonymized=False):
            choice.anonymize()
            count += 1
        
        self.message_user(request, f"{count} vote choice(s) anonymized.")
    anonymize_choices.short_description = "Anonymize selected choices"


@admin.register(AnonVote)
class AnonVoteAdmin(admin.ModelAdmin):
    list_display = ['election', 'position', 'candidate', 'vote_hash_short', 'created_at']
    list_filter = ['election', 'position', 'created_at']
    search_fields = ['election__title', 'position__name', 'candidate__user__username', 'vote_hash']
    ordering = ['-created_at']
    readonly_fields = ['election', 'position', 'candidate', 'vote_hash', 'created_at']
    
    fieldsets = (
        ('Vote Info', {
            'fields': ('election', 'position', 'candidate')
        }),
        ('Verification', {
            'fields': ('vote_hash', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def vote_hash_short(self, obj):
        """Display shortened vote hash"""
        return f"{obj.vote_hash[:16]}..."
    vote_hash_short.short_description = 'Vote Hash'
    
    def has_add_permission(self, request):
        """Prevent manual creation of anonymous votes"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent modification of anonymous votes"""
        return False
