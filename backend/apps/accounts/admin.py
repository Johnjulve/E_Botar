from django.contrib import admin
from .models import Program, UserProfile


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'program_type', 'department', 'is_active', 'created_at']
    list_filter = ['program_type', 'is_active', 'created_at']
    search_fields = ['name', 'code', 'description']
    ordering = ['program_type', 'name']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'student_id', 'department', 'course', 'is_verified', 'created_at']
    list_filter = ['is_verified', 'department', 'course', 'created_at']
    search_fields = ['user__username', 'user__email', 'user__first_name', 'user__last_name', 'student_id']
    ordering = ['-created_at']
    readonly_fields = ['student_id', 'created_at', 'updated_at']
