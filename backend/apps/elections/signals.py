"""
Django signals for election events
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import SchoolElection

logger = logging.getLogger(__name__)


@receiver(post_save, sender=SchoolElection)
def auto_reject_pending_applications_on_election_saved(sender, instance, created, **kwargs):
    """
    On election updates (not creates), reject pending applications when voting has started:

    election is active, ``start_date <= now``, and pending applications exist for this election.
    """
    if not created:
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
                    logger.info(
                        'Auto-rejected %s pending applications for election: %s',
                        rejected_count,
                        instance.title,
                    )
