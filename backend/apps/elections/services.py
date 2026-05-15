"""
Election Services
Provides caching and optimization for election-related database operations
"""

from django.core.cache import cache
from django.db.models import Count
from django.utils import timezone
from functools import wraps

from .models import SchoolElection, Party
from apps.common.algorithms import CryptographicAlgorithm


def annotate_election_list_metrics(queryset):
    """Add vote receipt and linked-position counts so list/detail serializers avoid N+1 COUNT queries."""
    return queryset.annotate(
        _vote_receipt_count=Count('receipts', distinct=True),
        _election_position_count=Count('election_positions', distinct=True),
    )


def cache_result(timeout):
    """
    Decorator to cache function results with specified timeout

    Args:
        timeout (int): Cache timeout in seconds

    Example:
        @cache_result(60)
        def expensive_operation():
            return some_data
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key_parts = [func.__name__]

            # Add positional arguments
            key_parts.extend([str(arg) for arg in args])

            # Add keyword arguments
            key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
<<<<<<< HEAD

            # Generate hash for cache key using SHA-256
            key_string = '|'.join(key_parts)
            cache_key = f"election_service_{CryptographicAlgorithm.sha256_hash(key_string)}"

=======
            
            # Generate hash for cache key using SHA-256
            key_string = '|'.join(key_parts)
            cache_key = f"election_service_{CryptographicAlgorithm.sha256_hash(key_string)}"
            
>>>>>>> main
            # Try to get from cache
            result = cache.get(cache_key)

            if result is None:
                # Execute function and cache result
                result = func(*args, **kwargs)
                cache.set(cache_key, result, timeout=timeout)

            return result
        return wrapper
    return decorator


class ElectionDataService:
    """Service class for election data operations with caching"""

    @staticmethod
    @cache_result(120)  # Cache for 2 minutes
    def get_all_active_elections():
        """
        Get elections that are currently within the voting period (start_date <= now <= end_date).
        Only these should be returned as "active" so users cannot access "Cast your vote" after the election ends.
        """
        now = timezone.now()
        base = SchoolElection.objects.filter(
            is_active=True,
            is_paused=False,
            start_date__lte=now,
            end_date__gte=now,
        ).select_related(
            'created_by'
        ).prefetch_related(
            'applications'
        ).order_by('-start_date')
<<<<<<< HEAD
        return annotate_election_list_metrics(base)

=======
    
    @staticmethod
    @cache_result(30)  # Cache for 30 seconds
    def get_election_statistics(election_id):
        """
        Get comprehensive election statistics
        
        Args:
            election_id: ID of the election
            
        Returns:
            Dictionary with election statistics
        """
        from apps.voting.models import Ballot, VoteChoice
        
        try:
            election = SchoolElection.objects.get(id=election_id)
        except SchoolElection.DoesNotExist:
            return {
                'election_id': election_id,
                'total_votes': 0,
                'total_voters': 0,
                'total_candidates': 0,
                'total_positions': 0,
                'candidates_by_position': [],
                'turnout_percentage': 0
            }
        
        # Count total votes (only ballots cast by active users)
        total_votes = VoteChoice.objects.filter(
            ballot__election=election,
            ballot__user__is_active=True,
        ).count()
        
        # Count unique voters (active accounts only)
        total_voters = Ballot.objects.filter(election=election, user__is_active=True).count()
        
        # Count candidates by position
        candidates_by_position = Candidate.objects.filter(
            election=election,
            is_active=True
        ).values('position__name').annotate(
            count=Count('id')
        )
        
        # Count total candidates
        total_candidates = Candidate.objects.filter(
            election=election,
            is_active=True
        ).count()
        
        # Count total positions in this election
        total_positions = election.election_positions.filter(is_enabled=True).count()
        
        # Count eligible students based on election type
        from apps.accounts.models import UserProfile
        if election.election_type == 'university':
            total_eligible_students = UserProfile.objects.filter(
                user__is_active=True,
                user__is_staff=False,
                user__is_superuser=False
            ).count()
        elif election.election_type == 'department' and election.allowed_department:
            total_eligible_students = UserProfile.objects.filter(
                department=election.allowed_department,
                user__is_active=True,
                user__is_staff=False,
                user__is_superuser=False
            ).count()
        else:
            # Fallback: use total voters as estimate
            total_eligible_students = total_voters
        
        # Calculate turnout safely using memoized function
        ballots_count = Ballot.objects.filter(election=election, user__is_active=True).count()
        from apps.voting.services import VotingDataService
        turnout_percentage = VotingDataService.calculate_turnout_percentage(total_voters, total_eligible_students)
        
        return {
            'election_id': election_id,
            'total_votes': total_votes,
            'total_voters': total_voters,
            'total_eligible_students': total_eligible_students,
            'total_candidates': total_candidates,
            'total_positions': total_positions,
            'candidates_by_position': list(candidates_by_position),
            'turnout_percentage': round(turnout_percentage, 2)
        }
    
>>>>>>> main
    @staticmethod
    @cache_result(180)  # Cache for 3 minutes
    def get_upcoming_elections():
        """
        Get upcoming elections

        Returns:
            QuerySet of upcoming elections
        """
        now = timezone.now()
        base = SchoolElection.objects.filter(
            is_active=True,
            start_date__gt=now,
        ).select_related(
            'created_by'
        ).order_by('start_date')
        return annotate_election_list_metrics(base)

    @staticmethod
    @cache_result(300)  # Cache for 5 minutes
    def get_all_parties():
        """
        Get all active parties

        Returns:
            QuerySet of active parties
        """
        return Party.objects.filter(
            is_active=True
        ).order_by('name')

    @staticmethod
    def invalidate_election_cache(election_id):
        """
        Drop cached reads after election-linked data changes.

        The project uses Django's LocMem backend with hashed keys, so keyed deletion is not
        implemented here — the whole cache is cleared. Callers passing ``election_id`` document
        intent for a future keyed backend (Redis) or finer invalidation.
        """
        cache.clear()

    @staticmethod
    def invalidate_all_election_cache():
        """
        Invalidate all election-related cached data
        """
        cache.clear()
