from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.utils import timezone
from .models import Party, SchoolPosition, SchoolElection, ElectionPosition
from .serializers import (
    PartySerializer, SchoolPositionSerializer,
    SchoolElectionListSerializer, SchoolElectionDetailSerializer,
    SchoolElectionCreateUpdateSerializer, ElectionPositionSerializer
)


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
        return [IsAdminUser()]
    
    def get_queryset(self):
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
        return [IsAdminUser()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter active positions for non-admin users
        if not self.request.user.is_staff and self.action == 'list':
            queryset = queryset.filter(is_active=True)
        
        # Filter by position type
        position_type = self.request.query_params.get('type', None)
        if position_type:
            queryset = queryset.filter(position_type=position_type)
        
        return queryset


class SchoolElectionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing school elections"""
    queryset = SchoolElection.objects.all()
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'active', 'upcoming', 'finished']:
            return [AllowAny()]
        return [IsAdminUser()]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SchoolElectionDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SchoolElectionCreateUpdateSerializer
        return SchoolElectionListSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get currently active elections"""
        now = timezone.now()
        active_elections = self.queryset.filter(
            is_active=True,
            start_date__lte=now,
            end_date__gte=now
        )
        serializer = self.get_serializer(active_elections, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming elections"""
        now = timezone.now()
        upcoming_elections = self.queryset.filter(
            is_active=True,
            start_date__gt=now
        )
        serializer = self.get_serializer(upcoming_elections, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def finished(self, request):
        """Get finished elections"""
        now = timezone.now()
        finished_elections = self.queryset.filter(
            end_date__lt=now
        )
        serializer = self.get_serializer(finished_elections, many=True)
        return Response(serializer.data)
    
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
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
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
