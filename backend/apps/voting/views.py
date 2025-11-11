from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.db import transaction
from django.db.models import Count
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
import csv
import json
from .models import VoteReceipt, AnonVote, Ballot, VoteChoice
from .serializers import (
    VoteReceiptSerializer, BallotSerializer, BallotSubmissionSerializer,
    AnonVoteSerializer, VoteReceiptVerifySerializer,
    VoteStatisticsSerializer, PositionResultSerializer, MyVoteStatusSerializer
)
from apps.elections.models import SchoolElection, SchoolPosition
from apps.candidates.models import Candidate
from apps.common.models import ActivityLog


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
        return [IsAdminUser()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Non-staff users can only see their own ballots
        if not user.is_staff:
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
        """Submit a new ballot"""
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
        return [IsAdminUser()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Non-staff users can only see their own receipts
        if not user.is_staff:
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
                return Response({
                    'valid': True,
                    'message': 'Receipt is valid',
                    'election': receipt.election.title,
                    'voted_at': receipt.created_at
                })
        except VoteReceipt.DoesNotExist:
            pass
        
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
                ballot = receipt.ballot
                choices = ballot.choices.select_related(
                    'position', 
                    'candidate', 
                    'candidate__user', 
                    'candidate__party'
                ).all()
                
                votes_data = [{
                    'position_id': choice.position.id,
                    'position_name': choice.position.name,
                    'candidate_id': choice.candidate.id,
                    'candidate_name': choice.candidate.user.get_full_name(),
                    'candidate_photo': choice.candidate.photo.url if choice.candidate.photo else None,
                    'party_name': choice.candidate.party.name if choice.candidate.party else 'Independent',
                } for choice in choices]
                
                return Response({
                    'valid': True,
                    'election': {
                        'id': receipt.election.id,
                        'title': receipt.election.title,
                    },
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
        
        for election_position in positions:
            position = election_position.position
            position_votes = AnonVote.objects.filter(
                election=election,
                position=position
            ).values('candidate').annotate(
                vote_count=Count('id')
            ).order_by('-vote_count')
            
            # Calculate total votes for this position
            position_total_votes = sum(v['vote_count'] for v in position_votes)
            
            candidates_data = []
            for idx, vote_data in enumerate(position_votes):
                candidate = Candidate.objects.get(id=vote_data['candidate'])
                candidates_data.append({
                    'candidate_id': candidate.id,
                    'candidate_name': candidate.user.get_full_name(),
                    'party': candidate.party.name if candidate.party else None,
                    'vote_count': vote_data['vote_count'],
                    'percentage': round((vote_data['vote_count'] / position_total_votes * 100), 2) if position_total_votes > 0 else 0,
                    'is_winner': election_ended and idx == 0 and vote_data['vote_count'] > 0,  # Winner is 1st place when election ends
                    'rank': idx + 1  # 1-based ranking
                })
            
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
                'receipt_code': receipt.get_masked_receipt() if receipt else None
            })
        
        except SchoolElection.DoesNotExist:
            return Response(
                {'detail': 'Election not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
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
        
        for election_position in positions:
            position = election_position.position
            position_votes = AnonVote.objects.filter(
                election=election,
                position=position
            ).values('candidate').annotate(
                vote_count=Count('id')
            ).order_by('-vote_count')
            
            candidates_data = []
            total_position_votes = sum(v['vote_count'] for v in position_votes)
            
            for vote_data in position_votes:
                candidate = Candidate.objects.get(id=vote_data['candidate'])
                vote_count = vote_data['vote_count']
                percentage = round((vote_count / total_position_votes * 100), 2) if total_position_votes > 0 else 0
                
                candidates_data.append({
                    'candidate_id': candidate.id,
                    'candidate_name': candidate.user.get_full_name(),
                    'party': candidate.party.name if candidate.party else 'Independent',
                    'vote_count': vote_count,
                    'percentage': percentage
                })
            
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
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get election statistics and analytics"""
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
        
        # Check permissions
        if not request.user.is_staff and not election.is_finished():
            return Response(
                {'detail': 'Statistics are not yet available'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Compute statistics
        total_voters = VoteReceipt.objects.filter(election=election).count()
        total_votes = AnonVote.objects.filter(election=election).count()
        total_positions = election.election_positions.count()
        
        # Voter turnout
        from apps.accounts.models import UserProfile
        total_eligible = UserProfile.objects.filter(is_verified=True).count()
        turnout_percentage = round((total_voters / total_eligible * 100), 2) if total_eligible > 0 else 0
        
        # Per-position statistics
        position_stats = []
        for election_position in election.election_positions.all():
            position = election_position.position
            position_votes_count = AnonVote.objects.filter(
                election=election,
                position=position
            ).count()
            
            position_stats.append({
                'position_id': position.id,
                'position_name': position.name,
                'total_votes': position_votes_count,
                'candidates_count': Candidate.objects.filter(
                    election=election,
                    position=position,
                    is_active=True
                ).count()
            })
        
        return Response({
            'election_id': election.id,
            'election_title': election.title,
            'total_voters': total_voters,
            'total_votes': total_votes,
            'total_positions': total_positions,
            'total_eligible_voters': total_eligible,
            'turnout_percentage': turnout_percentage,
            'position_statistics': position_stats
        })
