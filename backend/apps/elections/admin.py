from django.contrib import admin
from .models import Party, SchoolPosition, SchoolElection, ElectionPosition


@admin.register(Party)
class PartyAdmin(admin.ModelAdmin):
    list_display = ['name', 'color', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SchoolPosition)
class SchoolPositionAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_order', 'max_candidates', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['display_order', 'name']
    readonly_fields = ['created_at', 'updated_at']


class ElectionPositionInline(admin.TabularInline):
    model = ElectionPosition
    extra = 1
    autocomplete_fields = ['position']


@admin.register(SchoolElection)
class SchoolElectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'start_date', 'end_date', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_active', 'start_date', 'end_date']
    search_fields = ['title', 'description']
    ordering = ['-start_date']
    readonly_fields = ['title', 'created_at', 'updated_at']
    inlines = [ElectionPositionInline]
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating new election
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ElectionPosition)
class ElectionPositionAdmin(admin.ModelAdmin):
    list_display = ['election', 'position', 'order', 'is_enabled']
    list_filter = ['is_enabled', 'election']
    search_fields = ['election__title', 'position__name']
    ordering = ['election', 'order']
