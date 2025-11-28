import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from apps.common.models import ActivityLog
from apps.common.permissions import IsSuperUser, IsStaffOrSuperUser
from .models import Party, SchoolPosition, SchoolElection, ElectionPosition

logger = logging.getLogger(__name__)
from .serializers import (
    PartySerializer, SchoolPositionSerializer,
    SchoolElectionListSerializer, SchoolElectionDetailSerializer,
    SchoolElectionCreateUpdateSerializer, ElectionPositionSerializer
)
from .services import ElectionDataService


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for elections service"""
    return Response({
        'status': 'healthy',
        'service': 'elections',
        'message': 'Elections service is running'
    })


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
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'active', 'upcoming', 'finished']:
            return [AllowAny()]
        # Staff can manage elections, but only superusers can create/delete
        if self.action in ['create', 'destroy']:
            return [IsSuperUser()]
        return [IsStaffOrSuperUser()]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SchoolElectionDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SchoolElectionCreateUpdateSerializer
        return SchoolElectionListSerializer
    
    def perform_create(self, serializer):
        election = serializer.save(created_by=self.request.user)
        
        # Invalidate election cache
        ElectionDataService.invalidate_election_cache(election.id)
        
        # Get client IP
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = self.request.META.get('REMOTE_ADDR')
        
        # Log the activity
        ActivityLog.objects.create(
            user=self.request.user,
            action='create',
            resource_type='Election',
            resource_id=election.id,
            description=f"Admin {self.request.user.username} created election '{election.title}'",
            ip_address=ip_address,
            metadata={
                'election_id': election.id,
                'election_title': election.title,
                'start_date': str(election.start_date),
                'end_date': str(election.end_date),
                'admin_username': self.request.user.username
            }
        )
    
    def perform_update(self, serializer):
        election = self.get_object()
        old_title = election.title
        old_start = str(election.start_date)
        old_end = str(election.end_date)
        
        updated_election = serializer.save()
        
        # Invalidate election cache
        ElectionDataService.invalidate_election_cache(updated_election.id)
        
        # Get client IP
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = self.request.META.get('REMOTE_ADDR')
        
        # Log the activity
        ActivityLog.objects.create(
            user=self.request.user,
            action='update',
            resource_type='Election',
            resource_id=updated_election.id,
            description=f"Admin {self.request.user.username} updated election '{updated_election.title}'",
            ip_address=ip_address,
            metadata={
                'election_id': updated_election.id,
                'election_title': updated_election.title,
                'old_title': old_title,
                'old_start_date': old_start,
                'old_end_date': old_end,
                'new_start_date': str(updated_election.start_date),
                'new_end_date': str(updated_election.end_date),
                'admin_username': self.request.user.username
            }
        )
    
    def perform_destroy(self, instance):
        # Invalidate election cache
        ElectionDataService.invalidate_election_cache(instance.id)
        
        # Get client IP
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = self.request.META.get('REMOTE_ADDR')
        
        # Log the activity before deletion
        ActivityLog.objects.create(
            user=self.request.user,
            action='delete',
            resource_type='Election',
            resource_id=instance.id,
            description=f"Admin {self.request.user.username} deleted election '{instance.title}'",
            ip_address=ip_address,
            metadata={
                'election_id': instance.id,
                'election_title': instance.title,
                'start_date': str(instance.start_date),
                'end_date': str(instance.end_date),
                'admin_username': self.request.user.username
            }
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
            finished_elections = self.queryset.filter(
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
            
            serializer = ElectionPositionSerializer(election_position)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except SchoolPosition.DoesNotExist:
            return Response(
                {'detail': 'Position not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['delete'])
    def remove_position(self, request, pk=None):
        """Remove a position from an election"""
        election = self.get_object()
        position_id = request.data.get('position_id')
        
        try:
            election_position = ElectionPosition.objects.get(
                election=election,
                position_id=position_id
            )
            election_position.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except ElectionPosition.DoesNotExist:
            return Response(
                {'detail': 'Position not found in this election'},
                status=status.HTTP_404_NOT_FOUND
            )
    
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
