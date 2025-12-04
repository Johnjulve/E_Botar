"""
Voting Services
Provides caching and optimization for voting-related database operations
"""

from django.core.cache import cache
from django.db.models import Count, F, Q, Prefetch
from functools import wraps
import hashlib

from .models import AnonVote, Ballot, VoteReceipt
from apps.elections.models import SchoolElection, SchoolPosition
from apps.candidates.models import Candidate
from apps.common.algorithms import CryptographicAlgorithm, MemoizationAlgorithm, AggregationAlgorithm


def cache_result(timeout):
    """
    Decorator to cache function results with specified timeout
    
    Args:
        timeout (int): Cache timeout in seconds
    
    Example:
        @cache_result(30)
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
            
            # Generate hash for cache key using MD5 algorithm
            key_string = '|'.join(key_parts)
            cache_key = f"voting_service_{CryptographicAlgorithm.md5_hash(key_string)}"
            
            # Try to get from cache
            result = cache.get(cache_key)
            
            if result is None:
                # Execute function and cache result
                result = func(*args, **kwargs)
                cache.set(cache_key, result, timeout=timeout)
            
            return result
        return wrapper
    return decorator


class VotingDataService:
    """Service class for voting data operations with caching"""
    
    @staticmethod
    @cache_result(30)  # Cache for 30 seconds (live results update frequently)
    def get_live_results(election_id):
        """
        Get live voting results for an election
        
        Args:
            election_id: ID of the election
            
        Returns:
            QuerySet with vote counts per candidate
        """
        return AnonVote.objects.filter(
            election_id=election_id
        ).values(
            'candidate_id',
            'candidate__user__first_name',
            'candidate__user__last_name',
            'candidate__party__name',
            'position_id',
            'position__name'
        ).annotate(
            total_votes=Count('id')
        ).order_by('position__display_order', '-total_votes')
    
    @staticmethod
    @cache_result(60)  # Cache for 1 minute
    def get_results_by_position(election_id, position_id):
        """
        Get voting results for a specific position
        
        Args:
            election_id: ID of the election
            position_id: ID of the position
            
        Returns:
            QuerySet with vote counts per candidate for the position
        """
        return AnonVote.objects.filter(
            election_id=election_id,
            position_id=position_id
        ).values(
            'candidate_id',
            'candidate__user__first_name',
            'candidate__user__last_name',
            'candidate__party__name',
            'candidate__party__color'
        ).annotate(
            total_votes=Count('id')
        ).order_by('-total_votes')
    
    @staticmethod
    @cache_result(45)  # Cache for 45 seconds
    def get_election_statistics(election_id):
        """
        Get comprehensive voting statistics for an election
        
        Args:
            election_id: ID of the election
            
        Returns:
            Dictionary with voting statistics
        """
        from django.contrib.auth.models import User
        
        # Check if election exists
        try:
            election = SchoolElection.objects.get(id=election_id)
        except SchoolElection.DoesNotExist:
            return {
                'election_id': election_id,
                'total_registered_voters': 0,
                'total_votes_cast': 0,
                'unique_voters': 0,
                'completed_ballots': 0,
                'turnout_percentage': 0,
                'votes_by_position': []
            }
        
        # Total registered voters (users with profiles)
        total_registered = User.objects.filter(
            profile__isnull=False,
            is_active=True
        ).count()
        
        # Total votes cast
        total_votes = AnonVote.objects.filter(
            election_id=election_id
        ).count()
        
        # Unique voters (users who submitted ballots)
        total_voters = Ballot.objects.filter(
            election_id=election_id
        ).count()
        
        # Votes by position - use aggregation algorithm
        votes_list = list(AnonVote.objects.filter(
            election_id=election_id
        ).select_related('position').values('position_id', 'position__name'))
        
        # Aggregate votes by position using aggregation algorithm
        votes_by_position_data = AggregationAlgorithm.aggregate(
            votes_list,
            key_func=lambda v: v.get('position_id'),
            operation='count'
        )
        
        # Get position names mapping (unique position_id -> position__name)
        position_names = {}
        for v in votes_list:
            pos_id = v.get('position_id')
            if pos_id and pos_id not in position_names:
                position_names[pos_id] = v.get('position__name', 'Unknown')
        
        # Convert to list format matching original structure
        votes_by_position = [
            {
                'position_id': pos_id,
                'position__name': position_names.get(pos_id, 'Unknown'),
                'vote_count': count
            }
            for pos_id, count in votes_by_position_data.items()
            if pos_id is not None
        ]
        # Sort by position_id (maintain original behavior)
        votes_by_position.sort(key=lambda x: x.get('position_id', 0))
        
        # Calculate turnout safely using memoized function
        turnout_percentage = VotingDataService.calculate_turnout_percentage(total_voters, total_registered)
        
        return {
            'election_id': election_id,
            'total_registered_voters': total_registered,
            'total_votes_cast': total_votes,
            'unique_voters': total_voters,
            'completed_ballots': total_voters,
            'turnout_percentage': round(turnout_percentage, 2),
            'votes_by_position': list(votes_by_position)
        }
    
    @staticmethod
    @cache_result(120)  # Cache for 2 minutes
    def get_user_voting_status(user_id, election_id):
        """
        Check if a user has voted in an election
        
        Args:
            user_id: ID of the user
            election_id: ID of the election
            
        Returns:
            Dictionary with voting status
        """
        has_voted = Ballot.objects.filter(
            user_id=user_id,
            election_id=election_id
        ).exists()
        
        receipt = None
        if has_voted:
            ballot = Ballot.objects.filter(
                user_id=user_id,
                election_id=election_id
            ).select_related('receipt').first()
            
            if ballot and ballot.receipt:
                receipt = {
                    'masked_code': ballot.receipt.get_masked_receipt(),
                    'submitted_at': ballot.submitted_at.isoformat()
                }
        
        return {
            'user_id': user_id,
            'election_id': election_id,
            'has_voted': has_voted,
            'receipt': receipt
        }
    
    @staticmethod
    @cache_result(300)  # Cache for 5 minutes
    def get_position_statistics(election_id):
        """
        Get detailed statistics for each position in an election
        
        Args:
            election_id: ID of the election
            
        Returns:
            List of dictionaries with position statistics
        """
        positions = SchoolPosition.objects.filter(
            is_active=True,
            candidates__election_id=election_id,
            candidates__application__status='approved'
        ).distinct().prefetch_related(
            Prefetch(
                'candidates',
                queryset=Candidate.objects.filter(
                    election_id=election_id,
                    application__status='approved'
                ).select_related('user', 'party')
            )
        )
        
        # Use aggregation algorithm to count candidates and votes by position
        statistics = []
        for position in positions:
            # Get candidates list for aggregation
            candidates_list = list(position.candidates.filter(
                election_id=election_id,
                application__status='approved'
            ).values('id'))
            
            # Get votes list for aggregation
            votes_list = list(AnonVote.objects.filter(
                election_id=election_id,
                position=position
            ).values('id'))
            
            # Use aggregation algorithm to count
            candidates_count = AggregationAlgorithm.aggregate(
                candidates_list,
                key_func=lambda c: 'total',
                operation='count'
            ).get('total', 0)
            
            votes_count = AggregationAlgorithm.aggregate(
                votes_list,
                key_func=lambda v: 'total',
                operation='count'
            ).get('total', 0)
            
            statistics.append({
                'position_id': position.id,
                'position_name': position.name,
                'candidates_count': candidates_count,
                'total_votes': votes_count
            })
        
        return statistics
    
    @staticmethod
    @cache_result(60)  # Cache for 1 minute
    def get_winner_by_position(election_id, position_id):
        """
        Get the winning candidate for a specific position
        
        Args:
            election_id: ID of the election
            position_id: ID of the position
            
        Returns:
            Dictionary with winner information or None
        """
        winner = AnonVote.objects.filter(
            election_id=election_id,
            position_id=position_id
        ).values(
            'candidate_id',
            'candidate__user__first_name',
            'candidate__user__last_name',
            'candidate__user__profile__student_id',
            'candidate__party__name',
            'position__name'
        ).annotate(
            total_votes=Count('id')
        ).order_by('-total_votes').first()
        
        return winner
    
    @staticmethod
    @cache_result(30)  # Cache for 30 seconds
    def get_all_winners(election_id):
        """
        Get all winning candidates for an election
        
        Args:
            election_id: ID of the election
            
        Returns:
            List of winners grouped by position
        """
        from django.db.models import Max
        
        # Get positions with candidates in this election
        positions = SchoolPosition.objects.filter(
            anon_votes__election_id=election_id
        ).distinct()
        
        winners = []
        for position in positions:
            winner = VotingDataService.get_winner_by_position(election_id, position.id)
            if winner:
                winners.append(winner)
        
        return winners
    
    @staticmethod
    def invalidate_voting_cache(election_id=None):
        """
        Invalidate voting-related cached data
        
        Args:
            election_id: Optional election ID to clear specific cache
        """
        # For production, implement more sophisticated cache invalidation
        cache.clear()
    
    @staticmethod
    def invalidate_user_voting_cache(user_id, election_id):
        """
        Invalidate cached voting status for a specific user and election
        
        Args:
            user_id: ID of the user
            election_id: ID of the election
        """
        # Clear specific user voting status cache
        key_parts = ['get_user_voting_status', str(user_id), str(election_id)]
        key_string = '|'.join(key_parts)
        cache_key = f"voting_service_{CryptographicAlgorithm.md5_hash(key_string)}"
        cache.delete(cache_key)
    
    # Memoized computation functions for expensive calculations
    @staticmethod
    @MemoizationAlgorithm.memoize_with_key(
        lambda vote_count, total_votes: MemoizationAlgorithm.generate_hash_key(vote_count, total_votes)
    )
    def calculate_vote_percentage(vote_count, total_votes):
        """
        Calculate vote percentage - memoized for repeated calculations
        
        Args:
            vote_count: Number of votes for candidate
            total_votes: Total votes for position
        
        Returns:
            Percentage rounded to 2 decimal places
        """
        if total_votes == 0:
            return 0.0
        return round((vote_count / total_votes * 100), 2)
    
    @staticmethod
    @MemoizationAlgorithm.memoize_with_key(
        lambda voters, registered: MemoizationAlgorithm.generate_hash_key(voters, registered)
    )
    def calculate_turnout_percentage(voters, registered):
        """
        Calculate turnout percentage - memoized for repeated calculations
        
        Args:
            voters: Number of voters who voted
            registered: Total registered voters
        
        Returns:
            Turnout percentage rounded to 2 decimal places
        """
        if registered == 0:
            return 0.0
        return round((voters / registered * 100), 2)
    
    @staticmethod
    @MemoizationAlgorithm.memoize_with_key(
        lambda votes_data: MemoizationAlgorithm.generate_hash_key(
            *[(v.get('candidate_id'), v.get('vote_count')) for v in votes_data]
        )
    )
    def aggregate_votes_by_candidate(votes_data):
        """
        Aggregate votes by candidate - memoized for repeated aggregations
        
        Args:
            votes_data: List of vote dictionaries with candidate_id and vote_count
        
        Returns:
            Dictionary mapping candidate_id to total vote count
        """
        from collections import defaultdict
        aggregated = defaultdict(int)
        for vote in votes_data:
            candidate_id = vote.get('candidate_id')
            vote_count = vote.get('vote_count', 0)
            if candidate_id:
                aggregated[candidate_id] += vote_count
        return dict(aggregated)
