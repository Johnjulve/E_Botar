import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.common.models import ActivityLog
from apps.common.permissions import IsStaffOrSuperUser, IsSuperUser
from apps.common.utils import get_client_ip

from .models import ElectionPosition, Party, SchoolElection, SchoolPosition
from .serializers import (
    SchoolElectionCompactSerializer,
    ElectionPositionSerializer,
    PartySerializer,
    SchoolElectionCreateUpdateSerializer,
    SchoolElectionDetailSerializer,
    SchoolElectionListSerializer,
    SchoolPositionSerializer,
)
from .services import ElectionDataService, annotate_election_list_metrics

logger = logging.getLogger(__name__)


def invalidate_election_and_related_voting_cache(election_id):
    """Single place to refresh caches after election schedule or pause state changes."""
    ElectionDataService.invalidate_election_cache(election_id)
    try:
        from apps.voting.services import VotingDataService

        VotingDataService.invalidate_voting_cache()
    except Exception:
        pass


def log_school_election_staff_activity(request, election, *, action, description, metadata):
    """Write one ActivityLog row for create/update/delete on school elections (traceable IP + metadata)."""
    ActivityLog.objects.create(
        user=request.user,
        action=action,
        resource_type='Election',
        resource_id=election.id,
        description=description,
        ip_address=get_client_ip(request),
        metadata=metadata,
    )


class PartyViewSet(viewsets.ModelViewSet):
    """ViewSet for managing parties"""
    queryset = Party.objects.all()
    serializer_class = PartySerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsSuperUser()]
    
    def get_queryset(self):
        # Use cached method for list action
        if self.action == 'list' and not self.request.user.is_staff:
            return ElectionDataService.get_all_parties()
        
        queryset = super().get_queryset()
        # Filter active parties for non-admin users
        if not self.request.user.is_staff and self.action == 'list':
            queryset = queryset.filter(is_active=True)
        return queryset


class SchoolPositionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing school positions"""
    queryset = SchoolPosition.objects.all()
    serializer_class = SchoolPositionSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsSuperUser()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter active positions for non-admin users
        if not self.request.user.is_staff and self.action == 'list':
            queryset = queryset.filter(is_active=True)
        
        return queryset


class SchoolElectionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing school elections"""
    queryset = SchoolElection.objects.all()

    def get_queryset(self):
        return annotate_election_list_metrics(SchoolElection.objects.all())
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'active', 'upcoming', 'finished']:
            return [AllowAny()]
        # Staff can create and manage elections, but only superusers can delete
        if self.action == 'destroy':
            return [IsSuperUser()]
        return [IsStaffOrSuperUser()]
    
    def get_serializer_class(self):
        compact_response_requested = str(self.request.query_params.get('compact', 'false')).lower() == 'true'
        if compact_response_requested and self.action in ['active', 'upcoming', 'finished', 'list']:
            return SchoolElectionCompactSerializer
        if self.action == 'retrieve':
            return SchoolElectionDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SchoolElectionCreateUpdateSerializer
        return SchoolElectionListSerializer

    def create(self, request, *args, **kwargs):
        # Prevent duplicate elections from spam-click: reject if same user created one recently
        cutoff = timezone.now() - timedelta(seconds=10)
        if SchoolElection.objects.filter(created_by=request.user, created_at__gte=cutoff).exists():
            return Response(
                {'detail': 'Please wait a moment before creating another election. Your previous request may still be processing.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        election = serializer.save(created_by=self.request.user)
        
        ElectionDataService.invalidate_election_cache(election.id)
        log_school_election_staff_activity(
            self.request,
            election,
            action='create',
            description=f"Admin {self.request.user.username} created election '{election.title}'",
            metadata={
                'election_id': election.id,
                'election_title': election.title,
                'start_date': str(election.start_date),
                'end_date': str(election.end_date),
                'admin_username': self.request.user.username,
            },
        )
    
    def perform_update(self, serializer):
        election = self.get_object()
        old_title = election.title
        old_start = str(election.start_date)
        old_end = str(election.end_date)
        
        updated_election = serializer.save()
        
        # Invalidate election cache
        ElectionDataService.invalidate_election_cache(updated_election.id)
        log_school_election_staff_activity(
            self.request,
            updated_election,
            action='update',
            description=f"Admin {self.request.user.username} updated election '{updated_election.title}'",
            metadata={
                'election_id': updated_election.id,
                'election_title': updated_election.title,
                'old_title': old_title,
                'old_start_date': old_start,
                'old_end_date': old_end,
                'new_start_date': str(updated_election.start_date),
                'new_end_date': str(updated_election.end_date),
                'admin_username': self.request.user.username,
            },
        )
    
    def perform_destroy(self, instance):
        # Invalidate election cache
        ElectionDataService.invalidate_election_cache(instance.id)
        log_school_election_staff_activity(
            self.request,
            instance,
            action='delete',
            description=f"Admin {self.request.user.username} deleted election '{instance.title}'",
            metadata={
                'election_id': instance.id,
                'election_title': instance.title,
                'start_date': str(instance.start_date),
                'end_date': str(instance.end_date),
                'admin_username': self.request.user.username,
            },
        )

        instance.delete()
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get currently active elections (cached)"""
        try:
            active_elections = ElectionDataService.get_all_active_elections()
            serializer = self.get_serializer(active_elections, many=True)
            return Response(serializer.data if serializer.data is not None else [])
        except Exception as e:
            logger.error(f"Error getting active elections: {str(e)}", exc_info=True)
            return Response([], status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming elections (cached)"""
        try:
            upcoming_elections = ElectionDataService.get_upcoming_elections()
            serializer = self.get_serializer(upcoming_elections, many=True)
            return Response(serializer.data if serializer.data is not None else [])
        except Exception as e:
            logger.error(f"Error getting upcoming elections: {str(e)}", exc_info=True)
            return Response([], status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def finished(self, request):
        """Get finished elections"""
        try:
            now = timezone.now()
            finished_elections = self.get_queryset().filter(
                end_date__lt=now
            )
            serializer = self.get_serializer(finished_elections, many=True)
            return Response(serializer.data if serializer.data is not None else [])
        except Exception as e:
            logger.error(f"Error getting finished elections: {str(e)}", exc_info=True)
            return Response([], status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def add_position(self, request, pk=None):
        """Add a position to an election"""
        election = self.get_object()
        position_id = request.data.get('position_id')
        order = request.data.get('order', 0)
        
        try:
            position = SchoolPosition.objects.get(id=position_id, is_active=True)
            election_position, created = ElectionPosition.objects.get_or_create(
                election=election,
                position=position,
                defaults={'order': order}
            )
            
            if not created:
                return Response(
                    {'detail': 'Position already added to this election'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            invalidate_election_and_related_voting_cache(election.id)
            serializer = ElectionPositionSerializer(election_position)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except SchoolPosition.DoesNotExist:
            return Response(
                {'detail': 'Position not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['delete', 'post'])
    def remove_position(self, request, pk=None):
        """Remove a position from an election.

        Compatibility: accepts both DELETE and POST while clients are being migrated.
        """
        election = self.get_object()
        position_id = (
            request.data.get('position_id')
            or request.query_params.get('position_id')
        )

        if not position_id:
            return Response(
                {'detail': 'position_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            election_position = ElectionPosition.objects.get(
                election=election,
                position_id=position_id
            )
            election_position.delete()
            invalidate_election_and_related_voting_cache(election.id)
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except ElectionPosition.DoesNotExist:
            return Response(
                {'detail': 'Position not found in this election'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrSuperUser])
    def pause(self, request, pk=None):
        """Temporarily suspend voting while keeping schedule (staff/admin)."""
        election = self.get_object()
        election.is_paused = True
        election.save(update_fields=['is_paused', 'updated_at'])
        invalidate_election_and_related_voting_cache(election.id)
        serializer = SchoolElectionDetailSerializer(election, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrSuperUser])
    def resume(self, request, pk=None):
        """Resume voting after pause (staff/admin)."""
        election = self.get_object()
        election.is_paused = False
        election.save(update_fields=['is_paused', 'updated_at'])
        invalidate_election_and_related_voting_cache(election.id)
        serializer = SchoolElectionDetailSerializer(election, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsSuperUser])
    def reject_pending_applications(self, request, pk=None):
        """Manually trigger auto-rejection of pending applications for this election"""
        election = self.get_object()
        rejected_count = election.auto_reject_pending_applications()
        
        return Response({
            'message': f'Successfully auto-rejected {rejected_count} pending application(s)',
            'rejected_count': rejected_count,
            'election_id': election.id,
            'election_title': election.title
        }, status=status.HTTP_200_OK)
