from django.contrib import admin, messages

from apps.voting.models import VoteBlock
from apps.voting.vote_ledger import verify_election_vote_chain

from .models import Party, SchoolPosition, SchoolElection, ElectionPosition


@admin.action(description='Verify append-only vote ledger integrity (stored hashes)')
def verify_vote_ledger_integrity(modeladmin, request, queryset):
    """Re-run hash and chain linkage checks for selected elections."""
    for election in queryset.iterator():
        ledger_ok, err_list = verify_election_vote_chain(election.pk)
        block_total = VoteBlock.objects.filter(election_id=election.pk).count()
        if ledger_ok:
            messages.success(
                request,
                f'"{election.title}": ledger OK ({block_total} block(s)).',
            )
            continue
        preview = '; '.join(err_list[:5])
        if len(err_list) > 5:
            preview += f' … (+{len(err_list) - 5} more)'
        messages.error(
            request,
            f'"{election.title}": ledger FAILED ({block_total} block(s)) — {preview}',
        )


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
    list_display = ['title', 'start_date', 'end_date', 'is_active', 'is_paused', 'created_by', 'created_at']
    list_filter = ['is_active', 'is_paused', 'start_date', 'end_date']
    search_fields = ['title', 'description']
    ordering = ['-start_date']
    readonly_fields = ['title', 'created_at', 'updated_at']
    inlines = [ElectionPositionInline]
    actions = [verify_vote_ledger_integrity]
    
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
