"""
Django signals for election events
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import SchoolElection


@receiver(post_save, sender=SchoolElection)
def check_election_start(sender, instance, created, **kwargs):
    """
    Check if election has started and auto-reject pending applications
    This runs every time an election is saved
    """
    if not created:  # Only for updates, not new creations
        now = timezone.now()
        
        # Check if election just started (within last 5 minutes)
        if instance.is_active and instance.start_date <= now:
            # Check if there are any pending applications
            from apps.candidates.models import CandidateApplication
            
            pending_count = CandidateApplication.objects.filter(
                election=instance,
                status='pending'
            ).count()
            
            if pending_count > 0:
                # Auto-reject pending applications
                rejected_count = instance.auto_reject_pending_applications()
                if rejected_count > 0:
                    print(f"Auto-rejected {rejected_count} pending applications for election: {instance.title}")
