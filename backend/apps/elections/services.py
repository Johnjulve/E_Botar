"""
Election Services
Provides caching and optimization for election-related database operations
"""

from django.core.cache import cache
from django.db.models import Count, Q, Prefetch
from functools import wraps
import hashlib

from .models import SchoolElection, SchoolPosition, Party
from apps.candidates.models import Candidate

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
            
            # Generate hash for cache key
            cache_key = f"election_service_{hashlib.md5('|'.join(key_parts).encode()).hexdigest()}"
            
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
    @cache_result(60)  # Cache for 1 minute
    def get_election_with_related(election_id):
        """
        Get election with all related data (optimized query)
        
        Args:
            election_id: ID of the election
            
        Returns:
            SchoolElection instance with prefetched related data
            
        Raises:
            SchoolElection.DoesNotExist: If election not found
        """
        try:
            return SchoolElection.objects.select_related(
                'created_by', 'allowed_department'
            ).prefetch_related(
                Prefetch(
                    'candidates',
                    queryset=Candidate.objects.select_related(
                        'user',
                        'position',
                        'party',
                        'approved_application'
                    ).filter(is_active=True)
                )
            ).get(id=election_id)
        except SchoolElection.DoesNotExist:
            raise
    
    @staticmethod
    @cache_result(120)  # Cache for 2 minutes
    def get_all_active_elections():
        """
        Get all active elections with optimized queries
        
        Returns:
            QuerySet of active SchoolElection instances
        """
        return SchoolElection.objects.filter(
            is_active=True
        ).select_related(
            'created_by'
        ).prefetch_related(
            'applications'
        ).order_by('-start_date')
    
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
        from apps.voting.models import AnonVote, Ballot
        
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
        
        # Count total votes
        total_votes = AnonVote.objects.filter(election=election).count()
        
        # Count unique voters
        total_voters = Ballot.objects.filter(election=election).count()
        
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
        
        # Calculate turnout safely
        ballots_count = election.ballots.count() if hasattr(election, 'ballots') else 0
        turnout_percentage = (total_voters / ballots_count * 100) if ballots_count > 0 else 0
        
        return {
            'election_id': election_id,
            'total_votes': total_votes,
            'total_voters': total_voters,
            'total_candidates': total_candidates,
            'total_positions': total_positions,
            'candidates_by_position': list(candidates_by_position),
            'turnout_percentage': round(turnout_percentage, 2)
        }
    
    @staticmethod
    @cache_result(180)  # Cache for 3 minutes
    def get_upcoming_elections():
        """
        Get upcoming elections
        
        Returns:
            QuerySet of upcoming elections
        """
        from django.utils import timezone
        now = timezone.now()
        
        return SchoolElection.objects.filter(
            is_active=True,
            start_date__gt=now
        ).select_related(
            'created_by'
        ).order_by('start_date')
    
    @staticmethod
    @cache_result(60)  # Cache for 1 minute
    def get_active_positions_with_candidates(election_id):
        """
        Get all active positions with their approved candidates for an election
        
        Args:
            election_id: ID of the election
            
        Returns:
            QuerySet of positions with prefetched candidates
        """
        return SchoolPosition.objects.filter(
            is_active=True
        ).prefetch_related(
            Prefetch(
                'candidates',
                queryset=Candidate.objects.filter(
                    election_id=election_id,
                    is_active=True
                ).select_related(
                    'user',
                    'party',
                    'approved_application'
                ).order_by('user__last_name', 'user__first_name')
            )
        ).order_by('display_order', 'name')
    
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
        Invalidate all cached data for a specific election
        
        Args:
            election_id: ID of the election
        """
        # Clear specific cache keys
        cache_patterns = [
            f"election_service_*{election_id}*",
        ]
        
        # Note: For production, consider using cache.delete_pattern() 
        # or implementing a more sophisticated cache invalidation strategy
        cache.clear()  # Simple approach: clear all cache
    
    @staticmethod
    def invalidate_all_election_cache():
        """
        Invalidate all election-related cached data
        """
        cache.clear()
