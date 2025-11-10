from django.contrib import admin
from .models import Department, Course, UserProfile


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code', 'description']
    ordering = ['name']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'department', 'is_active', 'created_at']
    list_filter = ['department', 'is_active', 'created_at']
    search_fields = ['name', 'code', 'description', 'department__name']
    ordering = ['department__name', 'name']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'student_id', 'department', 'course', 'is_verified', 'created_at']
    list_filter = ['is_verified', 'department', 'course', 'created_at']
    search_fields = ['user__username', 'user__email', 'user__first_name', 'user__last_name', 'student_id']
    ordering = ['-created_at']
    readonly_fields = ['student_id', 'created_at', 'updated_at']
