import csv
import json
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.http import HttpResponse
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import Program, UserProfile
from apps.accounts.profile_list_filters import apply_profile_list_filters
from apps.accounts.serializers import UserVotingStatusListSerializer
from apps.common.http.pagination import StandardResultsSetPagination
from apps.candidates.models import Candidate
from apps.common.core.algorithms import AggregationAlgorithm, SortingAlgorithm
from apps.common.models import ActivityLog
from apps.common.http.permissions import IsStaffOrSuperUser, IsSuperUser
from apps.common.http.throttling import enforce_scope_throttle
from apps.common.core.utils import get_client_ip
from apps.elections.models import SchoolElection, SchoolPosition

from .models import Ballot, VoteChoice, VoteReceipt, VoteBlock
from .serializers import (
    BallotSerializer,
    BallotSubmissionSerializer,
    MyVoteStatusSerializer,
    PositionResultSerializer,
    VoteReceiptAuditSerializer,
    VoteReceiptSerializer,
    VoteReceiptVerifySerializer,
    VoteStatisticsSerializer,
)
from .services import VotingDataService
from .vote_ledger import append_vote_blocks_for_ballot, verify_election_vote_chain

logger = logging.getLogger(__name__)


class BallotViewSet(viewsets.ReadOnlyModelViewSet):
    """Owner-only read access to ballots.

    Vote choices are personal data: the only person who may read a ballot's
    ``choices`` is the user who cast it. Staff and admin can never list or
    retrieve someone else's ballot through this viewset — they get the same
    queryset as anyone else, filtered to ``user=request.user``. Aggregated
    analytics for staff/admin are available through
    ``ResultsViewSet.breakdown``, which returns counts only and never
    per-user data.
    """
    queryset = Ballot.objects.select_related('user', 'election', 'receipt').prefetch_related('choices').all()
    serializer_class = BallotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)
    
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
        client_ip_address = get_client_ip(request)

        try:
            with transaction.atomic():
                receipt = VoteReceipt.objects.create(
                    user=user,
                    election=election,
                    ip_address=client_ip_address,
                )

                ballot = Ballot.objects.create(
                    user=user,
                    election=election,
                    receipt=receipt,
                    ip_address=client_ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
                )
                
                # Create vote choices and anonymize immediately
                choices_saved = []
                for vote_data in votes:
                    position = SchoolPosition.objects.get(id=vote_data['position_id'])
                    candidate = Candidate.objects.get(
                        id=vote_data['candidate_id'],
                        election=election,
                        position=position,
                        is_active=True
                    )

                    choice = VoteChoice.objects.create(
                        ballot=ballot,
                        position=position,
                        candidate=candidate,
                    )
                    choice.anonymize()
                    choices_saved.append(choice)

                append_vote_blocks_for_ballot(
                    election_id=election.id,
                    ballot_identifier=str(ballot.pk),
                    receipt_secret=receipt.receipt_hash,
                    user_id=user.id,
                    choices=choices_saved,
                )

                # Invalidate voting cache for this election
                VotingDataService.invalidate_voting_cache(election.id)
                
                # Log the vote activity
                try:
                    student_id = getattr(user.profile, 'student_id', None)
                except UserProfile.DoesNotExist:
                    student_id = None
                voter_identifier = student_id if student_id else user.username
                
                ActivityLog.objects.create(
                    user=user,
                    action='vote',
                    resource_type='Election',
                    resource_id=election.id,
                    description=f"Student {voter_identifier} cast vote in election '{election.title}'",
                    ip_address=client_ip_address,
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


class VotingStatusView(generics.ListAPIView):
    """
    Read-only per-election voting status for students.
    Returns paginated lean profile rows plus a has_voted flag for the selected election.
    """
    serializer_class = UserVotingStatusListSerializer
    permission_classes = [IsAuthenticated, IsStaffOrSuperUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        request = self.request
        query_params = request.query_params

        election_id = query_params.get('election_id')
        if not election_id:
            raise ValidationError({'election_id': 'This query parameter is required.'})

        try:
            election = SchoolElection.objects.get(id=election_id)
        except SchoolElection.DoesNotExist:
            raise ValidationError({'election_id': 'Election not found.'})

        queryset = UserProfile.objects.select_related('user', 'department', 'course').filter(
            user__is_active=True,
            user__is_staff=False,
            user__is_superuser=False,
        )

        if election.election_type == 'department' and election.allowed_department:
            queryset = queryset.filter(department=election.allowed_department)

        queryset = apply_profile_list_filters(
            queryset,
            query_params,
            include_email_search=True,
        )

        vote_subquery = VoteReceipt.objects.filter(
            user=OuterRef('user'),
            election_id=election_id,
        )
        queryset = queryset.annotate(has_voted=Exists(vote_subquery))

        has_voted_param = query_params.get('has_voted')
        if has_voted_param in ('true', 'false'):
            queryset = queryset.filter(has_voted=(has_voted_param == 'true'))

        return queryset.order_by('user__last_name', 'user__first_name', 'user__username')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        total_eligible = queryset.count()
        total_voted = queryset.filter(has_voted=True).count()
        total_not_voted = total_eligible - total_voted

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            response = self.get_paginated_response(serializer.data)
            response.data['summary'] = {
                'total_eligible_students': total_eligible,
                'total_voted': total_voted,
                'total_not_voted': total_not_voted,
            }
            return response

        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response({
            'summary': {
                'total_eligible_students': total_eligible,
                'total_voted': total_voted,
                'total_not_voted': total_not_voted,
            },
            'results': serializer.data,
        })


class VoteReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing vote receipts"""
    queryset = VoteReceipt.objects.select_related('user', 'election').all()
    serializer_class = VoteReceiptSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'my_receipts', 'verify', 'get_votes']:
            return [IsAuthenticated()]
        if self.action == 'reveal_receipt':
            return [IsStaffOrSuperUser()]
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
        enforce_scope_throttle(
            request,
            self,
            scope='receipt_verify',
            message='Too many receipt verification attempts. Please wait a moment before trying again.',
        )
        serializer = VoteReceiptVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        receipt_code = serializer.validated_data['receipt_code']
        receipt_hash = VoteReceipt.hash_receipt(receipt_code)
        
        try:
            receipt = VoteReceipt.objects.get(receipt_hash=receipt_hash)
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
        enforce_scope_throttle(
            request,
            self,
            scope='receipt_verify',
            message='Too many receipt lookup attempts. Please wait a moment before trying again.',
        )
        receipt_code = request.data.get('receipt_code')
        
        if not receipt_code:
            return Response(
                {'detail': 'receipt_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            receipt = VoteReceipt.objects.get(receipt_hash=VoteReceipt.hash_receipt(receipt_code))
            
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

    @action(detail=False, methods=['get'], permission_classes=[IsStaffOrSuperUser])
    def audit(self, request):
        """Admin/staff receipt audit table with optional filters."""
        election_id = request.query_params.get('election_id')
        search = (request.query_params.get('search') or '').strip()
        vote_status = request.query_params.get('vote_status')
        page = request.query_params.get('page', '1')
        page_size = request.query_params.get('page_size', '20')

        try:
            page = max(int(page), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = int(page_size)
        except (TypeError, ValueError):
            page_size = 20
        if page_size not in [20, 50, 100]:
            page_size = 20

        queryset = VoteReceipt.objects.select_related(
            'user',
            'user__profile',
            'election',
        ).prefetch_related(
            'ballot',
            'ballot__choices',
            'ballot__choices__vote_blocks',
        ).all()

        if election_id:
            queryset = queryset.filter(election_id=election_id)

        if search:
            queryset = queryset.filter(
                Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__profile__student_id__icontains=search)
                | Q(receipt_code__icontains=search)
            )

        queryset = queryset.order_by('-created_at')

        serializer = VoteReceiptAuditSerializer(queryset, many=True)
        rows = serializer.data

        if vote_status in ['verified', 'missing_ballot', 'hash_mismatch']:
            rows = [row for row in rows if row.get('vote_status') == vote_status]

        total_count = len(rows)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_rows = rows[start:end]

        ActivityLog.objects.create(
            user=request.user,
            action='read',
            resource_type='VoteReceiptAudit',
            description='Viewed receipt audit table',
            ip_address=get_client_ip(request),
            metadata={
                'election_id': election_id,
                'search': search,
                'vote_status': vote_status,
                'result_count': total_count,
                'page': page,
                'page_size': page_size,
            },
        )

        return Response({
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': ((total_count - 1) // page_size) + 1 if total_count else 1,
            'results': paginated_rows,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsStaffOrSuperUser])
    def reveal_receipt(self, request):
        """Reveal full receipt code for audited records (staff/admin only)."""
        receipt_id = request.data.get('receipt_id')
        if not receipt_id:
            return Response(
                {'detail': 'receipt_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            receipt = VoteReceipt.objects.select_related('user', 'election').get(id=receipt_id)
        except VoteReceipt.DoesNotExist:
            return Response(
                {'detail': 'Receipt not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        ActivityLog.objects.create(
            user=request.user,
            action='read',
            resource_type='VoteReceipt',
            resource_id=receipt.id,
            description='Revealed full receipt code from audit',
            ip_address=get_client_ip(request),
            metadata={
                'receipt_id': receipt.id,
                'election_id': receipt.election_id,
                'target_user_id': receipt.user_id,
            },
        )

        return Response({
            'receipt_id': receipt.id,
            'receipt_code': receipt.receipt_code,
        })


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
        
        # Hide results from general users until the election ends
        user = getattr(request, 'user', None)
        user_is_admin = bool(user and (user.is_staff or user.is_superuser))
        if not election.is_finished() and not user_is_admin:
            return Response(
                {
                    'detail': 'Results will be available after the election ends.',
                    'available_after': election.end_date.isoformat(),
                    'election_id': election.id,
                    'election_title': election.title,
                    'results_locked': True,
                    'is_active': election.is_active_now(),
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Real-time results are now available to everyone
        # Winners will be highlighted only after election ends
        election_ended = election.is_finished()

        total_voters = VoteReceipt.objects.filter(election=election, user__is_active=True).count()
        total_ballots = Ballot.objects.filter(election=election, user__is_active=True).count()
        
        # Count eligible students based on election type
        from apps.accounts.models import UserProfile
        if election.election_type == 'university':
            # For university elections, all active students are eligible
            total_eligible_students = UserProfile.objects.filter(
                user__is_active=True,
                user__is_staff=False,
                user__is_superuser=False
            ).count()
        elif election.election_type == 'department' and election.allowed_department:
            # For department elections, only students from that department are eligible
            total_eligible_students = UserProfile.objects.filter(
                department=election.allowed_department,
                user__is_active=True,
                user__is_staff=False,
                user__is_superuser=False
            ).count()
        else:
            # Fallback: use total voters as estimate
            total_eligible_students = total_voters
        
        # Get results by position
        positions_data = []
        positions = election.election_positions.all().order_by('order')
        
        # Handle case when no positions exist
        if not positions.exists():
            # Count eligible students for empty election
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
                total_eligible_students = total_voters
            
            return Response({
                'election_id': election.id,
                'election_title': election.title,
                'election_ended': election_ended,
                'is_active': election.is_active_now(),
                'total_voters': total_voters,
                'total_ballots': total_ballots,
                'total_eligible_students': total_eligible_students,
                'positions': []
            })
        
        for election_position in positions:
            position = election_position.position
            if not position:
                continue
                
            # Count only choices from active voters (deactivated accounts do not count)
            position_votes_list = list(
                VoteChoice.objects.filter(
                    ballot__election=election,
                    position=position,
                    ballot__user__is_active=True,
                ).values('candidate_id')
            )
            
            # Use aggregation algorithm to count votes by candidate
            vote_counts = AggregationAlgorithm.aggregate(
                position_votes_list,
                key_func=lambda v: v.get('candidate_id'),
                operation='count'
            )
            
            # Map candidate_id -> vote_count for quick lookup (filter out None keys)
            vote_map = {candidate_id: count for candidate_id, count in vote_counts.items() if candidate_id is not None}
            # Calculate total votes using aggregation
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
                # Use memoized percentage calculation
                percentage = VotingDataService.calculate_vote_percentage(vote_count, position_total_votes)
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
            'total_eligible_students': total_eligible_students,  # Total eligible students for this election
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
    
    @action(detail=False, methods=['get'], permission_classes=[IsStaffOrSuperUser])
    def breakdown(self, request):
        """Aggregated vote breakdown for the data-export page.

        Replaces the previous client-side aggregation that pulled every
        ballot to the browser. Returns counts only — never per-user choices —
        so this endpoint preserves ballot secrecy while supporting the same
        analytics the page used to compute by hand.
        """
        election_id = request.query_params.get('election_id')
        if not election_id:
            return Response(
                {'detail': 'election_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            election = (
                SchoolElection.objects
                .select_related('allowed_department')
                .get(id=election_id)
            )
        except SchoolElection.DoesNotExist:
            return Response(
                {'detail': 'Election not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Single SQL aggregation: counts per (candidate, position, dept, course, year).
        aggregation_rows = (
            VoteChoice.objects
            .filter(
                ballot__election_id=election.id,
                ballot__user__is_active=True,
            )
            .values(
                'candidate_id',
                'candidate__user__first_name',
                'candidate__user__last_name',
                'position_id',
                'position__name',
                'ballot__user__profile__department__code',
                'ballot__user__profile__department__name',
                'ballot__user__profile__course__code',
                'ballot__user__profile__course__name',
                'ballot__user__profile__year_level',
            )
            .annotate(count=Count('id'))
        )

        breakdown_by_candidate = {}
        for row in aggregation_rows:
            candidate_id = row['candidate_id']
            if candidate_id is None:
                continue
            first_name = row.get('candidate__user__first_name') or ''
            last_name = row.get('candidate__user__last_name') or ''
            candidate_name = f"{first_name} {last_name}".strip() or f"Candidate {candidate_id}"

            entry = breakdown_by_candidate.setdefault(candidate_id, {
                'candidate_id': candidate_id,
                'candidate_name': candidate_name,
                'position_id': row.get('position_id'),
                'position_name': row.get('position__name') or 'Unknown Position',
                'groups': [],
            })
            entry['groups'].append({
                'department_code': row.get('ballot__user__profile__department__code') or 'N/A',
                'department_name': row.get('ballot__user__profile__department__name') or 'Unassigned College',
                'course_code': row.get('ballot__user__profile__course__code') or 'N/A',
                'course_name': row.get('ballot__user__profile__course__name') or 'Unassigned Course',
                'year_level': row.get('ballot__user__profile__year_level') or 'N/A',
                'count': row.get('count') or 0,
            })

        # Student roster aggregation: per (dept, course, year_level) totals + voted counts.
        is_department_election = (
            election.election_type == 'department'
            and election.allowed_department_id is not None
        )
        profile_filter = Q(
            user__is_active=True,
            user__is_staff=False,
            user__is_superuser=False,
        )
        if is_department_election:
            profile_filter &= Q(department=election.allowed_department)

        # Use Exists() so the GROUP BY isn't inflated by unrelated ballots
        # this user may have cast in other elections.
        voted_subquery = Ballot.objects.filter(
            user_id=OuterRef('user_id'),
            election_id=election.id,
        )
        roster_rows = (
            UserProfile.objects
            .filter(profile_filter)
            .annotate(has_voted_in_election=Exists(voted_subquery))
            .values(
                'department__code',
                'department__name',
                'course__code',
                'course__name',
                'year_level',
            )
            .annotate(
                total_count=Count('id'),
                voted_count=Count('id', filter=Q(has_voted_in_election=True)),
            )
        )

        student_roster = []
        for row in roster_rows:
            total = row['total_count'] or 0
            voted = row['voted_count'] or 0
            student_roster.append({
                'department_code': row.get('department__code') or 'N/A',
                'department_name': row.get('department__name') or 'Unassigned College',
                'course_code': row.get('course__code') or 'N/A',
                'course_name': row.get('course__name') or 'Unassigned Course',
                'year_level': row.get('year_level') or 'N/A',
                'total_count': total,
                'voted_count': voted,
                'not_voted_count': max(0, total - voted),
            })

        return Response({
            'election': {
                'id': election.id,
                'title': election.title,
                'election_type': election.election_type,
                'allowed_department': (
                    {
                        'code': election.allowed_department.code,
                        'name': election.allowed_department.name,
                    }
                    if election.allowed_department_id else None
                ),
            },
            'totals': {
                'eligible_voters': sum(row['total_count'] for row in student_roster),
                'actual_voters': sum(row['voted_count'] for row in student_roster),
            },
            'vote_breakdown': list(breakdown_by_candidate.values()),
            'student_roster': student_roster,
        })

    @action(detail=False, methods=['get'], permission_classes=[IsStaffOrSuperUser])
    def student_roster(self, request):
        """Per-student voting status for a specific (election, dept, course).

        This is the **only** path that exposes individual student names to
        staff/admin in the export flow, and it's deliberately narrow: the
        caller MUST drill into a specific (department_code, course_code)
        before names are returned, the response carries voting
        participation status only (never vote choices), and every access
        is recorded in ``ActivityLog`` so the lookup is traceable.

        Used by the Data Export page when the operator opts in to the
        "Show Student Names" toggle so they can record who has and hasn't
        voted yet for a given course.
        """
        election_id = request.query_params.get('election_id')
        department_code = request.query_params.get('department_code')
        course_code = request.query_params.get('course_code')

        if not (election_id and department_code and course_code):
            return Response(
                {'detail': 'election_id, department_code, and course_code are all required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            election = SchoolElection.objects.get(id=election_id)
        except SchoolElection.DoesNotExist:
            return Response({'detail': 'Election not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            course = Program.objects.select_related('department').get(
                code=course_code,
                program_type=Program.ProgramType.COURSE,
                department__code=department_code,
            )
        except Program.DoesNotExist:
            return Response(
                {'detail': 'Course not found within the given department'},
                status=status.HTTP_404_NOT_FOUND,
            )

        voted_subquery = Ballot.objects.filter(
            user_id=OuterRef('user_id'),
            election_id=election.id,
        )
        profiles = (
            UserProfile.objects
            .filter(
                user__is_active=True,
                user__is_staff=False,
                user__is_superuser=False,
                department__code=department_code,
                course__code=course_code,
            )
            .select_related('user')
            .annotate(has_voted=Exists(voted_subquery))
            .order_by('year_level', 'user__last_name', 'user__first_name')
        )

        students = []
        for profile in profiles:
            full_name = (
                f"{profile.user.first_name} {profile.user.last_name}".strip()
                or profile.user.username
            )
            students.append({
                'full_name': full_name,
                'section': profile.section or '',
                'year_level': profile.year_level or '',
                'has_voted': bool(profile.has_voted),
            })

        ActivityLog.objects.create(
            user=request.user,
            action='view_student_roster',
            resource_type='Election',
            resource_id=election.id,
            description=(
                f"Staff {request.user.username} viewed student roster for election "
                f"'{election.title}' (dept={department_code}, course={course_code}, "
                f"count={len(students)})"
            ),
            ip_address=get_client_ip(request),
            metadata={
                'election_id': election.id,
                'department_code': department_code,
                'course_code': course_code,
                'student_count': len(students),
            },
        )

        return Response({
            'election': {'id': election.id, 'title': election.title},
            'department': {'code': course.department.code, 'name': course.department.name},
            'course': {'code': course.code, 'name': course.name},
            'students': students,
        })

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
                
            position_votes = VoteChoice.objects.filter(
                ballot__election=election,
                position=position,
                ballot__user__is_active=True,
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
                'total_voters': VoteReceipt.objects.filter(election=election, user__is_active=True).count(),
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
        
        # Hide statistics during active elections for non-admin users
        user = getattr(request, 'user', None)
        user_is_admin = bool(user and (user.is_staff or user.is_superuser))
        if not election.is_finished() and not user_is_admin:
            return Response(
                {
                    'detail': 'Statistics will be available after the election ends.',
                    'available_after': election.end_date.isoformat(),
                    'election_id': election.id,
                    'election_title': election.title,
                    'results_locked': True,
                    'is_active': election.is_active_now(),
                },
                status=status.HTTP_403_FORBIDDEN
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
                    is_active=True,
                ).count()

                position_stats.append({
                    'position_id': position_id,
                    'position_name': vote_data.get('position__name', 'Unknown'),
                    'total_votes': vote_data.get('vote_count', 0),
                    'candidates_count': candidates_count,
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

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsStaffOrSuperUser])
    def ledger_integrity(self, request):
        """Recompute VoteBlock digests and previous-hash linkage for tamper checks (staff/admin)."""
        election_id = request.query_params.get('election_id')
        if not election_id:
            return Response(
                {'detail': 'election_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            election = SchoolElection.objects.get(id=election_id)
        except SchoolElection.DoesNotExist:
            return Response(
                {'detail': 'Election not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        ledger_ok, errors = verify_election_vote_chain(election.id)
        block_total = VoteBlock.objects.filter(election_id=election.id).count()

        ActivityLog.objects.create(
            user=request.user,
            action='read',
            resource_type='VoteLedgerIntegrity',
            resource_id=election.id,
            description=(
                f"Vote ledger integrity check for election '{election.title}': "
                f"{'OK' if ledger_ok else 'FAILED'}"
            ),
            ip_address=get_client_ip(request),
            metadata={
                'election_id': election.id,
                'election_title': election.title,
                'ledger_ok': ledger_ok,
                'block_count': block_total,
                'error_count': len(errors),
                'errors_sample': errors[:10],
            },
        )

        return Response(
            {
                'election_id': election.id,
                'election_title': election.title,
                'ledger_ok': ledger_ok,
                'block_count': block_total,
                'errors': errors,
            },
            status=status.HTTP_200_OK,
        )
