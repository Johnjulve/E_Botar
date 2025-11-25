from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.exceptions import ValidationError as DjangoValidationError
from apps.common.models import ActivityLog
from apps.common.permissions import IsSuperUser, IsStaffOrSuperUser
from .models import Candidate, CandidateApplication
from .serializers import (
    CandidateListSerializer, CandidateDetailSerializer,
    CandidateApplicationListSerializer, CandidateApplicationDetailSerializer,
    CandidateApplicationCreateSerializer, CandidateApplicationReviewSerializer
)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for candidates service"""
    return Response({
        'status': 'healthy',
        'service': 'candidates',
        'message': 'Candidates service is running'
    })


class CandidateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing candidates (read-only for public)"""
    queryset = Candidate.objects.select_related('user', 'position', 'election', 'party').all()
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CandidateDetailSerializer
        return CandidateListSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by election
        election_id = self.request.query_params.get('election', None)
        if election_id:
            queryset = queryset.filter(election_id=election_id)
        
        # Filter by position
        position_id = self.request.query_params.get('position', None)
        if position_id:
            queryset = queryset.filter(position_id=position_id)
        
        # Filter by party
        party_id = self.request.query_params.get('party', None)
        if party_id:
            queryset = queryset.filter(party_id=party_id)
        
        # Filter active only for non-staff/non-superuser
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_election(self, request):
        """Get candidates grouped by election"""
        election_id = request.query_params.get('election_id')
        if not election_id:
            return Response(
                {'detail': 'election_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        candidates = self.get_queryset().filter(election_id=election_id)
        serializer = self.get_serializer(candidates, many=True)
        return Response(serializer.data)


class CandidateApplicationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing candidate applications"""
    queryset = CandidateApplication.objects.select_related(
        'user', 'position', 'election', 'party', 'reviewed_by'
    ).all()
    
    def get_permissions(self):
        if self.action in ['create']:
            return [IsAuthenticated()]
        elif self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        elif self.action in ['update', 'partial_update', 'destroy', 'review', 'bulk_review']:
            # Staff can review applications, but only superusers can delete
            if self.action == 'destroy':
                return [IsSuperUser()]
            return [IsStaffOrSuperUser()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CandidateApplicationCreateSerializer
        elif self.action == 'retrieve':
            return CandidateApplicationDetailSerializer
        elif self.action in ['review', 'bulk_review']:
            return CandidateApplicationReviewSerializer
        return CandidateApplicationListSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Non-staff users can only see their own applications
        if not user.is_staff:
            queryset = queryset.filter(user=user)
        else:
            # Staff can filter by status
            status_filter = self.request.query_params.get('status', None)
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            # Filter by election
            election_id = self.request.query_params.get('election', None)
            if election_id:
                queryset = queryset.filter(election_id=election_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def my_applications(self, request):
        """Get current user's applications"""
        applications = self.get_queryset().filter(user=request.user)
        serializer = CandidateApplicationListSerializer(applications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsStaffOrSuperUser])
    def pending(self, request):
        """Get all pending applications (staff/admin only)"""
        pending_apps = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(pending_apps, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrSuperUser])
    def review(self, request, pk=None):
        """Review an application (approve/reject)"""
        application = self.get_object()
        serializer = CandidateApplicationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action_type = serializer.validated_data['action']
        review_notes = serializer.validated_data.get('review_notes', '')
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        try:
            if action_type == 'approve':
                candidate = application.approve(request.user)
                
                # Get student ID from application user's profile
                applicant_profile = getattr(application.user, 'userprofile', None)
                student_id = getattr(applicant_profile, 'student_id', None) if applicant_profile else None
                applicant_identifier = student_id if student_id else application.user.username
                
                # Log the approval
                ActivityLog.objects.create(
                    user=request.user,
                    action='update',
                    resource_type='CandidateApplication',
                    resource_id=application.id,
                    description=f"Admin {request.user.username} approved candidate application for {applicant_identifier} ({application.user.get_full_name()}) - {application.position.name} in {application.election.title}",
                    ip_address=ip_address,
                    metadata={
                        'application_id': application.id,
                        'candidate_id': candidate.id if candidate else None,
                        'applicant_student_id': student_id,
                        'applicant_username': application.user.username,
                        'applicant_name': application.user.get_full_name(),
                        'position': application.position.name,
                        'election': application.election.title,
                        'action': 'approved',
                        'admin_username': request.user.username
                    }
                )
                
                return Response({
                    'message': 'Application approved successfully',
                    'application_id': application.id,
                    'candidate_id': candidate.id if candidate else None
                }, status=status.HTTP_200_OK)
            
            elif action_type == 'reject':
                # Get student ID before rejection
                applicant_profile = getattr(application.user, 'userprofile', None)
                student_id = getattr(applicant_profile, 'student_id', None) if applicant_profile else None
                applicant_identifier = student_id if student_id else application.user.username
                
                application.reject(request.user, review_notes)
                
                # Log the rejection
                ActivityLog.objects.create(
                    user=request.user,
                    action='update',
                    resource_type='CandidateApplication',
                    resource_id=application.id,
                    description=f"Admin {request.user.username} rejected candidate application for {applicant_identifier} ({application.user.get_full_name()}) - {application.position.name} in {application.election.title}",
                    ip_address=ip_address,
                    metadata={
                        'application_id': application.id,
                        'applicant_student_id': student_id,
                        'applicant_username': application.user.username,
                        'applicant_name': application.user.get_full_name(),
                        'position': application.position.name,
                        'election': application.election.title,
                        'action': 'rejected',
                        'review_notes': review_notes,
                        'admin_username': request.user.username
                    }
                )
                
                return Response({
                    'message': 'Application rejected',
                    'application_id': application.id
                }, status=status.HTTP_200_OK)
        
        except DjangoValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsStaffOrSuperUser])
    def bulk_review(self, request):
        """Bulk review multiple applications"""
        application_ids = request.data.get('application_ids', [])
        action_type = request.data.get('action')
        review_notes = request.data.get('review_notes', '')
        
        if not application_ids or not action_type:
            return Response(
                {'detail': 'application_ids and action are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action_type not in ['approve', 'reject']:
            return Response(
                {'detail': 'action must be either "approve" or "reject"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        applications = self.get_queryset().filter(id__in=application_ids, status='pending')
        results = {'success': [], 'failed': []}
        
        for application in applications:
            try:
                if action_type == 'approve':
                    candidate = application.approve(request.user)
                    
                    # Get student ID
                    applicant_profile = getattr(application.user, 'userprofile', None)
                    student_id = getattr(applicant_profile, 'student_id', None) if applicant_profile else None
                    applicant_identifier = student_id if student_id else application.user.username
                    
                    # Log each approval
                    ActivityLog.objects.create(
                        user=request.user,
                        action='update',
                        resource_type='CandidateApplication',
                        resource_id=application.id,
                        description=f"Admin {request.user.username} bulk approved candidate application for {applicant_identifier} ({application.user.get_full_name()}) - {application.position.name} in {application.election.title}",
                        ip_address=ip_address,
                        metadata={
                            'application_id': application.id,
                            'candidate_id': candidate.id if candidate else None,
                            'applicant_student_id': student_id,
                            'applicant_username': application.user.username,
                            'applicant_name': application.user.get_full_name(),
                            'position': application.position.name,
                            'election': application.election.title,
                            'action': 'bulk_approved',
                            'admin_username': request.user.username
                        }
                    )
                    
                    results['success'].append({
                        'application_id': application.id,
                        'candidate_id': candidate.id if candidate else None
                    })
                    
                elif action_type == 'reject':
                    # Get student ID before rejection
                    applicant_profile = getattr(application.user, 'userprofile', None)
                    student_id = getattr(applicant_profile, 'student_id', None) if applicant_profile else None
                    applicant_identifier = student_id if student_id else application.user.username
                    
                    application.reject(request.user, review_notes)
                    
                    # Log each rejection
                    ActivityLog.objects.create(
                        user=request.user,
                        action='update',
                        resource_type='CandidateApplication',
                        resource_id=application.id,
                        description=f"Admin {request.user.username} bulk rejected candidate application for {applicant_identifier} ({application.user.get_full_name()}) - {application.position.name} in {application.election.title}",
                        ip_address=ip_address,
                        metadata={
                            'application_id': application.id,
                            'applicant_student_id': student_id,
                            'applicant_username': application.user.username,
                            'applicant_name': application.user.get_full_name(),
                            'position': application.position.name,
                            'election': application.election.title,
                            'action': 'bulk_rejected',
                            'review_notes': review_notes,
                            'admin_username': request.user.username
                        }
                    )
                    
                    results['success'].append({'application_id': application.id})
            
            except DjangoValidationError as e:
                results['failed'].append({
                    'application_id': application.id,
                    'error': str(e)
                })
        
        return Response(results, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        """Withdraw an application (user can withdraw their own)"""
        application = self.get_object()
        
        # Check ownership
        if application.user != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'You can only withdraw your own applications'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if application.status != 'pending':
            return Response(
                {'detail': f'Cannot withdraw application with status: {application.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.status = 'withdrawn'
        application.save()
        
        return Response({
            'message': 'Application withdrawn successfully',
            'application_id': application.id
        }, status=status.HTTP_200_OK)
