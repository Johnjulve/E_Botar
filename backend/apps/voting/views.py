import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from apps.common.permissions import IsSuperUser, IsStaffOrSuperUser
from apps.common.throttling import enforce_scope_throttle
from django.db.models import Count
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
import csv
import json
from .models import VoteReceipt, AnonVote, Ballot, VoteChoice

logger = logging.getLogger(__name__)
from .serializers import (
    VoteReceiptSerializer, BallotSerializer, BallotSubmissionSerializer,
    AnonVoteSerializer, VoteReceiptVerifySerializer,
    VoteStatisticsSerializer, PositionResultSerializer, MyVoteStatusSerializer
)
from apps.elections.models import SchoolElection, SchoolPosition
from apps.candidates.models import Candidate
from apps.common.models import ActivityLog
from apps.common.algorithms import SortingAlgorithm
from .services import VotingDataService


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for voting service"""
    return Response({
        'status': 'healthy',
        'service': 'voting',
        'message': 'Voting service is running'
    })


class BallotViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing ballots (read-only)"""
    queryset = Ballot.objects.select_related('user', 'election', 'receipt').prefetch_related('choices').all()
    serializer_class = BallotSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'my_ballot', 'submit']:
            return [IsAuthenticated()]
        # Only superusers can access admin actions on ballots
        return [IsSuperUser()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Non-staff/non-superuser users can only see their own ballots
        if not (user.is_staff or user.is_superuser):
            queryset = queryset.filter(user=user)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def my_ballot(self, request):
        """Get current user's ballot for specific election"""
        election_id = request.query_params.get('election_id')
        if not election_id:
            return Response(
                {'detail': 'election_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ballot = Ballot.objects.get(user=request.user, election_id=election_id)
            serializer = self.get_serializer(ballot)
            return Response(serializer.data)
        except Ballot.DoesNotExist:
            return Response(
                {'detail': 'No ballot found for this election'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def submit(self, request):
        """Submit a new ballot (rate-limited per user to avoid rapid duplicate submissions)."""

        # Apply per-user throttle for vote submission
        enforce_scope_throttle(
            request,
            self,
            scope='vote_submit',
            message='You are submitting votes too quickly. Please wait a few seconds before trying again.'
        )

        serializer = BallotSubmissionSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        election = serializer.validated_data['election']
        votes = serializer.validated_data['votes']
        user = request.user
        
        try:
            with transaction.atomic():
                # Create vote receipt
                receipt = VoteReceipt.objects.create(
                    user=user,
                    election=election,
                    ip_address=self.get_client_ip(request)
                )
                
                # Create ballot
                ballot = Ballot.objects.create(
                    user=user,
                    election=election,
                    receipt=receipt,
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
                
                # Create vote choices and anonymize immediately
                for vote_data in votes:
                    position = SchoolPosition.objects.get(id=vote_data['position_id'])
                    candidate = Candidate.objects.get(
                        id=vote_data['candidate_id'],
                        election=election,
                        position=position,
                        is_active=True
                    )
                    
                    # Create vote choice
                    choice = VoteChoice.objects.create(
                        ballot=ballot,
                        position=position,
                        candidate=candidate
                    )
                    
                    # Anonymize immediately
                    choice.anonymize()
                
                # Invalidate voting cache for this election
                VotingDataService.invalidate_voting_cache(election.id)
                
                # Log the vote activity
                student_id = getattr(user.profile, 'student_id', None) if hasattr(user, 'profile') else None
                voter_identifier = student_id if student_id else user.username
                
                ActivityLog.objects.create(
                    user=user,
                    action='vote',
                    resource_type='Election',
                    resource_id=election.id,
                    description=f"Student {voter_identifier} cast vote in election '{election.title}'",
                    ip_address=self.get_client_ip(request),
                    metadata={
                        'election_id': election.id,
                        'election_title': election.title,
                        'student_id': student_id,
                        'receipt_code': receipt.get_masked_receipt(),
                        'positions_voted': len(votes)
                    }
                )
                
                # Return ballot with receipt
                ballot_serializer = BallotSerializer(ballot)
                return Response({
                    'message': 'Ballot submitted successfully',
                    'ballot': ballot_serializer.data,
                    'receipt_code': receipt.receipt_code
                }, status=status.HTTP_201_CREATED)
        
        except (SchoolPosition.DoesNotExist, Candidate.DoesNotExist) as e:
            return Response(
                {'detail': f'Invalid position or candidate: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except DjangoValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @staticmethod
    def get_client_ip(request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class VoteReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing vote receipts"""
    queryset = VoteReceipt.objects.select_related('user', 'election').all()
    serializer_class = VoteReceiptSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'my_receipts', 'verify', 'get_votes']:
            return [IsAuthenticated()]
        # Only superusers can access admin actions on receipts
        return [IsSuperUser()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Non-staff/non-superuser users can only see their own receipts
        if not (user.is_staff or user.is_superuser):
            queryset = queryset.filter(user=user)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def my_receipts(self, request):
        """Get current user's receipts"""
        receipts = self.get_queryset().filter(user=request.user)
        serializer = self.get_serializer(receipts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def verify(self, request):
        """Verify a vote receipt"""
        serializer = VoteReceiptVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        receipt_code = serializer.validated_data['receipt_code']
        
        try:
            receipt = VoteReceipt.objects.get(receipt_code=receipt_code)
            if receipt.verify_receipt(receipt_code):
                election_title = receipt.election.title if receipt.election else 'Unknown Election'
                return Response({
                    'valid': True,
                    'message': 'Receipt is valid',
                    'election': election_title,
                    'voted_at': receipt.created_at
                })
        except VoteReceipt.DoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error verifying receipt: {str(e)}", exc_info=True)
        
        return Response({
            'valid': False,
            'message': 'Invalid receipt code'
        }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def get_votes(self, request):
        """Get votes associated with a receipt code (requires receipt code for privacy)"""
        receipt_code = request.data.get('receipt_code')
        
        if not receipt_code:
            return Response(
                {'detail': 'receipt_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            receipt = VoteReceipt.objects.get(receipt_code=receipt_code)
            
            # Verify the receipt belongs to the requesting user
            if receipt.user != request.user:
                return Response(
                    {'detail': 'This receipt does not belong to you'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get the ballot and votes
            try:
                # Check if ballot exists (should always exist, but handle gracefully)
                if not hasattr(receipt, 'ballot') or receipt.ballot is None:
                    return Response(
                        {'detail': 'No ballot found for this receipt'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                ballot = receipt.ballot
                choices = ballot.choices.select_related(
                    'position', 
                    'candidate', 
                    'candidate__user', 
                    'candidate__party'
                ).all()
                
                votes_data = []
                for choice in choices:
                    # Safely access candidate and user data
                    if choice.candidate and choice.candidate.user:
                        votes_data.append({
                            'position_id': choice.position.id if choice.position else None,
                            'position_name': choice.position.name if choice.position else 'Unknown',
                    'candidate_id': choice.candidate.id,
                            'candidate_name': choice.candidate.user.get_full_name() or 'Unknown',
                            'candidate_photo': choice.candidate.photo.url if (choice.candidate.photo and hasattr(choice.candidate.photo, 'url')) else None,
                            'party_name': choice.candidate.party.name if (choice.candidate.party and choice.candidate.party.name) else 'Independent',
                        })
                
                election_data = None
                if receipt.election:
                    election_data = {
                        'id': receipt.election.id,
                        'title': receipt.election.title,
                    }
                
                return Response({
                    'valid': True,
                    'election': election_data,
                    'voted_at': receipt.created_at,
                    'votes': votes_data
                })
            except Exception as e:
                return Response(
                    {'detail': 'No votes found for this receipt'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except VoteReceipt.DoesNotExist:
            return Response(
                {'detail': 'Invalid receipt code'},
                status=status.HTTP_404_NOT_FOUND
            )


class ResultsViewSet(viewsets.ViewSet):
    """ViewSet for viewing election results"""
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'])
    def election_results(self, request):
        """Get results for a specific election"""
        election_id = request.query_params.get('election_id')
        if not election_id:
            return Response(
                {'detail': 'election_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            election = SchoolElection.objects.get(id=election_id)
        except SchoolElection.DoesNotExist:
            return Response(
                {'detail': 'Election not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Real-time results are now available to everyone
        # Winners will be highlighted only after election ends
        election_ended = election.is_finished()

        total_voters = VoteReceipt.objects.filter(election=election).count()
        total_ballots = Ballot.objects.filter(election=election).count()
        
        # Get results by position
        positions_data = []
        positions = election.election_positions.all().order_by('order')
        
        # Handle case when no positions exist
        if not positions.exists():
            return Response({
                'election_id': election.id,
                'election_title': election.title,
                'election_ended': election_ended,
                'is_active': election.is_active_now(),
                'total_voters': total_voters,
                'total_ballots': total_ballots,
                'positions': []
            })
        
        for election_position in positions:
            position = election_position.position
            if not position:
                continue
                
            position_votes = AnonVote.objects.filter(
                election=election,
                position=position
            ).values('candidate').annotate(
                vote_count=Count('id')
            )
            
            # Map candidate_id -> vote_count for quick lookup
            vote_map = {vote['candidate']: vote['vote_count'] for vote in position_votes}
            position_total_votes = sum(vote_map.values())
            
            # Include every candidate for this position (even if zero votes)
            position_candidates = Candidate.objects.filter(
                election=election,
                position=position
            ).select_related('user', 'party')
            
            candidates_data = []
            for candidate in position_candidates:
                if not candidate or not candidate.user:
                    continue
                    
                vote_count = vote_map.get(candidate.id, 0)
                percentage = round((vote_count / position_total_votes * 100), 2) if position_total_votes > 0 else 0
                candidates_data.append({
                    'candidate_id': candidate.id,
                    'candidate_name': candidate.user.get_full_name() or 'Unknown',
                    'party': candidate.party.name if (candidate.party and candidate.party.name) else None,
                    'vote_count': vote_count,
                    'percentage': percentage,
                    'is_winner': False,  # assigned after sorting
                    'rank': None
                })
            
            # Sort candidates by votes (desc) using quicksort algorithm and assign rank/winner flag
            candidates_data = SortingAlgorithm.quicksort(
                candidates_data,
                key=lambda c: c['vote_count'],
                reverse=True
            )
            for idx, candidate_data in enumerate(candidates_data, start=1):
                candidate_data['rank'] = idx
                candidate_data['is_winner'] = election_ended and idx == 1 and candidate_data['vote_count'] > 0
            
            positions_data.append({
                'position_id': position.id,
                'position_name': position.name,
                'total_votes': position_total_votes,
                'candidates': candidates_data
            })
        
        return Response({
            'election_id': election.id,
            'election_title': election.title,
            'election_ended': election_ended,
            'is_active': election.is_active_now(),
            'total_voters': total_voters,  # Number of unique voters
            'total_ballots': total_ballots,  # Should be same as total_voters
            'positions': positions_data
        })
    
    @action(detail=False, methods=['get'])
    def my_vote_status(self, request):
        """Check if current user has voted in an election"""
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        election_id = request.query_params.get('election_id')
        if not election_id:
            return Response(
                {'detail': 'election_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            election = SchoolElection.objects.get(id=election_id)
            receipt = VoteReceipt.objects.filter(
                user=request.user,
                election=election
            ).first()
            
            return Response({
                'election_id': election.id,
                'election_title': election.title,
                'has_voted': receipt is not None,
                'voted_at': receipt.created_at if receipt else None,
                'receipt_code': receipt.get_masked_receipt() if (receipt and hasattr(receipt, 'get_masked_receipt')) else None
            })
        
        except SchoolElection.DoesNotExist:
            return Response(
                {'detail': 'Election not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsSuperUser])
    def export_results(self, request):
        """Export election results in various formats"""
        election_id = request.query_params.get('election_id')
        export_format = request.query_params.get('format', 'csv')  # csv or json
        
        if not election_id:
            return Response(
                {'detail': 'election_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            election = SchoolElection.objects.get(id=election_id)
        except SchoolElection.DoesNotExist:
            return Response(
                {'detail': 'Election not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Compute results
        from django.utils import timezone
        positions_data = []
        positions = election.election_positions.all().order_by('order')
        
        # Handle case when no positions exist
        if not positions.exists():
            if export_format == 'csv':
                response = HttpResponse(content_type='text/csv')
                response['Content-Disposition'] = f'attachment; filename="election_results_{election.id}.csv"'
                writer = csv.writer(response)
                writer.writerow(['Election', election.title])
                writer.writerow(['Export Date', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
                writer.writerow(['Status', 'No positions configured for this election'])
                return response
            else:
                return Response({
                    'election_id': election.id,
                    'election_title': election.title,
                    'export_date': timezone.now().isoformat(),
                    'total_voters': 0,
                    'positions': []
                })
        
        for election_position in positions:
            position = election_position.position
            if not position:
                continue
                
            position_votes = AnonVote.objects.filter(
                election=election,
                position=position
            ).values('candidate').annotate(
                vote_count=Count('id')
            ).order_by('-vote_count')
            
            candidates_data = []
            total_position_votes = sum(v['vote_count'] for v in position_votes)
            
            for vote_data in position_votes:
                try:
                    candidate = Candidate.objects.get(id=vote_data['candidate'])
                    if not candidate or not candidate.user:
                        continue
                        
                    vote_count = vote_data['vote_count']
                    percentage = round((vote_count / total_position_votes * 100), 2) if total_position_votes > 0 else 0
                    
                    candidates_data.append({
                        'candidate_id': candidate.id,
                        'candidate_name': candidate.user.get_full_name() or 'Unknown',
                        'party': candidate.party.name if (candidate.party and candidate.party.name) else 'Independent',
                        'vote_count': vote_count,
                        'percentage': percentage
                    })
                except Candidate.DoesNotExist:
                    # Skip if candidate was deleted
                    continue
            
            positions_data.append({
                'position_name': position.name,
                'total_votes': total_position_votes,
                'candidates': candidates_data
            })
        
        # Export based on format
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="election_results_{election.id}.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['Election', election.title])
            writer.writerow(['Export Date', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
            writer.writerow([])
            
            for position_data in positions_data:
                writer.writerow([])
                writer.writerow(['Position', position_data['position_name']])
                writer.writerow(['Total Votes', position_data['total_votes']])
                writer.writerow([])
                writer.writerow(['Rank', 'Candidate', 'Party', 'Votes', 'Percentage'])
                
                for rank, candidate_data in enumerate(position_data['candidates'], 1):
                    writer.writerow([
                        rank,
                        candidate_data['candidate_name'],
                        candidate_data['party'],
                        candidate_data['vote_count'],
                        f"{candidate_data['percentage']}%"
                    ])
            
            return response
        
        elif export_format == 'json':
            data = {
                'election_id': election.id,
                'election_title': election.title,
                'export_date': timezone.now().isoformat(),
                'total_voters': VoteReceipt.objects.filter(election=election).count(),
                'positions': positions_data
            }
            
            response = HttpResponse(
                json.dumps(data, indent=2),
                content_type='application/json'
            )
            response['Content-Disposition'] = f'attachment; filename="election_results_{election.id}.json"'
            
            return response
        
        else:
            return Response(
                {'detail': 'Unsupported format. Use csv or json.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def statistics(self, request):
        """Get election statistics and analytics (cached)"""
        election_id = request.query_params.get('election_id')
        if not election_id:
            return Response(
                {'detail': 'election_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            election = SchoolElection.objects.get(id=election_id)
        except SchoolElection.DoesNotExist:
            return Response(
                {'detail': 'Election not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Use cached statistics
        stats = VotingDataService.get_election_statistics(election_id)
        
        # Get per-position statistics
        position_stats = []
        votes_by_position = stats.get('votes_by_position', [])
        
        # Handle empty votes_by_position
        if not votes_by_position:
            # Still return statistics even if no votes
            positions = election.election_positions.all().order_by('order')
            for election_position in positions:
                if election_position.position:
                    position_stats.append({
                        'position_id': election_position.position.id,
                        'position_name': election_position.position.name,
                        'total_votes': 0,
                        'candidates_count': Candidate.objects.filter(
                            election=election,
                            position=election_position.position,
                            is_active=True
                        ).count()
                    })
        else:
            for vote_data in votes_by_position:
                position_id = vote_data.get('position_id')
                if not position_id:
                    continue
                    
            candidates_count = Candidate.objects.filter(
                election=election,
                position_id=position_id,
                is_active=True
            ).count()
            
            position_stats.append({
                'position_id': position_id,
                    'position_name': vote_data.get('position__name', 'Unknown'),
                    'total_votes': vote_data.get('vote_count', 0),
                'candidates_count': candidates_count
            })
        
        return Response({
            'election_id': election.id,
            'election_title': election.title,
            'total_voters': stats['unique_voters'],
            'total_votes': stats['total_votes_cast'],
            'total_positions': len(stats['votes_by_position']),
            'total_eligible_voters': stats['total_registered_voters'],
            'turnout_percentage': stats['turnout_percentage'],
            'position_statistics': position_stats
        })
