import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count

from apps.elections.models import SchoolElection
from apps.voting.models import VoteReceipt, AnonVote
from apps.common.http.throttling import enforce_scope_throttle

logger = logging.getLogger(__name__)


class IntegrationHealthView(APIView):
    """Public health probe for external integration partners."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'status': 'healthy',
            'gateway': 'integration',
            'version': 'v1',
            'timestamp': timezone.now().isoformat(),
        }, status=status.HTTP_200_OK)


class IntegrationElectionListView(APIView):
    """Minimal, non-sensitive election catalog for approved external integrations.
    
    Exposes only essential schedule and identity attributes.
    Zero voter information or administrative controls are exposed.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        enforce_scope_throttle(
            request,
            self,
            scope='integration_api',
            message='Integration API rate limit exceeded. Please wait before retrying.',
        )
        elections = SchoolElection.objects.filter(is_active=True).order_by('-start_date')
        
        results = [
            {
                'id': election.id,
                'title': election.title,
                'election_type': election.election_type,
                'start_date': election.start_date.isoformat() if election.start_date else None,
                'end_date': election.end_date.isoformat() if election.end_date else None,
                'is_active_now': election.is_active_now(),
            }
            for election in elections
        ]
        return Response(results, status=status.HTTP_200_OK)


class IntegrationElectionResultsView(APIView):
    """Minimal election tally endpoint for external integration reporting.
    
    Returns aggregated vote tallies by position and candidate.
    Zero personally identifiable voter information is exposed.
    """
    permission_classes = [AllowAny]

    def get(self, request, election_id=None):
        enforce_scope_throttle(
            request,
            self,
            scope='integration_api',
            message='Integration API rate limit exceeded. Please wait before retrying.',
        )
        try:
            election = SchoolElection.objects.get(id=election_id, is_active=True)
        except SchoolElection.DoesNotExist:
            return Response(
                {'detail': 'Election not found or inactive.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Direct SQL aggregation on AnonVote table to preserve voter anonymity
        tallies = (
            AnonVote.objects.filter(election=election)
            .values('position_id', 'position__name', 'candidate_id', 'candidate__user__first_name', 'candidate__user__last_name', 'candidate__party__name')
            .annotate(vote_count=Count('id'))
            .order_by('position_id', '-vote_count')
        )

        positions_map = {}
        for row in tallies:
            pos_id = row['position_id']
            if pos_id not in positions_map:
                positions_map[pos_id] = {
                    'position_id': pos_id,
                    'position_name': row['position__name'] or 'Unknown',
                    'candidates': [],
                }
            cand_name = f"{row['candidate__user__first_name'] or ''} {row['candidate__user__last_name'] or ''}".strip() or 'Unknown'
            positions_map[pos_id]['candidates'].append({
                'candidate_id': row['candidate_id'],
                'candidate_name': cand_name,
                'party': row['candidate__party__name'] or 'Independent',
                'vote_count': row['vote_count'],
            })

        return Response({
            'election_id': election.id,
            'election_title': election.title,
            'is_finished': election.is_finished(),
            'total_votes': AnonVote.objects.filter(election=election).count(),
            'positions': list(positions_map.values()),
        }, status=status.HTTP_200_OK)


class IntegrationReceiptVerifyView(APIView):
    """Constant-time receipt verification for external student portals.
    
    Verifies cryptographic receipt codes without exposing voter identity or choice contents.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        enforce_scope_throttle(
            request,
            self,
            scope='integration_api',
            message='Integration API rate limit exceeded. Please wait before retrying.',
        )
        receipt_code = (request.data.get('receipt_code') or '').strip()
        if not receipt_code:
            return Response(
                {'detail': 'receipt_code is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        receipt_hash = VoteReceipt.hash_receipt(receipt_code)
        try:
            receipt = VoteReceipt.objects.select_related('election').get(receipt_hash=receipt_hash)
            if receipt.verify_receipt(receipt_code):
                return Response({
                    'valid': True,
                    'election_id': receipt.election_id,
                    'election_title': receipt.election.title if receipt.election else 'Unknown',
                    'voted_at': receipt.created_at.isoformat(),
                }, status=status.HTTP_200_OK)
        except VoteReceipt.DoesNotExist:
            pass
        except Exception as exc:
            logger.error("Error in external integration receipt verification: %s", exc, exc_info=True)

        return Response({
            'valid': False,
            'message': 'Invalid receipt code',
        }, status=status.HTTP_404_NOT_FOUND)
