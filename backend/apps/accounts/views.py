import logging
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from .models import UserProfile, Program
from apps.common.models import ActivityLog
from apps.common.permissions import IsSuperUser
from .serializers import (
    UserSerializer, UserProfileSerializer, UserRegistrationSerializer,
    DepartmentSerializer, CourseSerializer
)

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for accounts service"""
    return Response({
        'status': 'healthy',
        'service': 'accounts',
        'message': 'Accounts service is running'
    })


@api_view(['GET', 'PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get or update current authenticated user's profile"""
    if request.method == 'GET':
        try:
            user_serializer = UserSerializer(request.user, context={'request': request})
            try:
                profile = request.user.profile
            except UserProfile.DoesNotExist:
                # Create profile if it doesn't exist
                profile = UserProfile.objects.create(user=request.user)
            
            # Serialize profile with proper error handling
            try:
                profile_serializer = UserProfileSerializer(profile, context={'request': request})
                return Response({
                    'user': user_serializer.data,
                    'profile': profile_serializer.data
                })
            except Exception as e:
                # Log the error for debugging
                logger.error(f"Error serializing profile for user {request.user.id}: {str(e)}", exc_info=True)
                return Response(
                    {'error': 'Error retrieving profile data', 'detail': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            # Log the error for debugging
            logger.error(f"Error in current_user view for user {request.user.id}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Error retrieving user data', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method in ['PATCH', 'PUT']:
        # Update user and profile data
        user = request.user
        profile = user.profile
        
        # Update user fields (first_name, last_name, email)
        user_data = {}
        if 'first_name' in request.data:
            user_data['first_name'] = request.data['first_name']
        if 'last_name' in request.data:
            user_data['last_name'] = request.data['last_name']
        if 'email' in request.data:
            # Only allow email update if it's empty
            if not user.email or user.email.strip() == '':
                user_data['email'] = request.data['email']
        
        if user_data:
            user_serializer = UserSerializer(user, data=user_data, partial=True, context={'request': request})
            if user_serializer.is_valid():
                user_serializer.save()
            else:
                return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Update profile fields
        profile_data = {}
        profile_fields = ['student_id', 'year_level']
        for field in profile_fields:
            if field in request.data and request.data[field]:
                profile_data[field] = request.data[field]
        
        # Handle department and course separately - convert to department_id and course_id
        if 'department' in request.data and request.data['department']:
            try:
                profile_data['department_id'] = int(request.data['department'])
            except (ValueError, TypeError):
                return Response(
                    {'department': ['Invalid department ID']}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if 'course' in request.data and request.data['course']:
            try:
                profile_data['course_id'] = int(request.data['course'])
            except (ValueError, TypeError):
                return Response(
                    {'course': ['Invalid course ID']}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Handle avatar file from request.FILES
        if 'avatar' in request.FILES:
            # Delete old avatar if exists
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile_data['avatar'] = request.FILES['avatar']
        
        # Handle avatar removal
        if request.data.get('remove_avatar') == 'true':
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile_data['avatar'] = None
        
        if profile_data:
            profile_serializer = UserProfileSerializer(profile, data=profile_data, partial=True)
            if profile_serializer.is_valid():
                profile_serializer.save()
            else:
                return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Refresh from database to get updated relationships
        profile.refresh_from_db()
        
        # Return updated data with request context for avatar URL
        user_serializer = UserSerializer(user, context={'request': request})
        profile_serializer = UserProfileSerializer(profile, context={'request': request})
        
        return Response({
            'user': user_serializer.data,
            'profile': profile_serializer.data,
            'message': 'Profile updated successfully'
        })


class UserRegistrationView(generics.CreateAPIView):
    """User registration endpoint"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)


class UserProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user profiles"""
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only access their own profile unless staff or superuser
        if self.request.user.is_staff or self.request.user.is_superuser:
            return UserProfile.objects.all()
        return UserProfile.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperUser])
    def toggle_active(self, request, pk=None):
        """Toggle user's active status (admin only)"""
        profile = self.get_object()
        user = profile.user
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Store old status for logging
        old_status = user.is_active
        
        # Toggle the is_active status
        user.is_active = not user.is_active
        user.save()
        
        # Log the activity
        student_id = getattr(profile, 'student_id', None)
        target_identifier = student_id if student_id else user.username
        action_word = 'activated' if user.is_active else 'deactivated'
        
        ActivityLog.objects.create(
            user=request.user,
            action='update',
            resource_type='User',
            resource_id=user.id,
            description=f"Admin {request.user.username} {action_word} user {target_identifier} ({user.get_full_name()})",
            ip_address=ip_address,
            metadata={
                'target_user_id': user.id,
                'target_student_id': student_id,
                'target_username': user.username,
                'old_status': 'active' if old_status else 'inactive',
                'new_status': 'active' if user.is_active else 'inactive',
                'admin_username': request.user.username
            }
        )
        
        # Return updated profile with user data
        serializer = self.get_serializer(profile, context={'request': request})
        
        return Response({
            'message': f"User {'activated' if user.is_active else 'deactivated'} successfully",
            'profile': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperUser])
    def update_role(self, request, pk=None):
        """Update user's role (admin only)"""
        profile = self.get_object()
        user = profile.user
        
        # Get new role from request
        new_role = request.data.get('role')
        
        if not new_role:
            return Response({
                'error': 'role is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if new_role not in ['student', 'staff', 'admin']:
            return Response({
                'error': 'Invalid role. Must be one of: student, staff, admin'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Prevent changing own role
        if user == request.user:
            return Response({
                'error': 'You cannot change your own role'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Store old role for logging
        old_role = 'admin' if user.is_superuser else ('staff' if user.is_staff else 'student')
        
        # Update role based on new_role
        if new_role == 'admin':
            user.is_superuser = True
            user.is_staff = True
        elif new_role == 'staff':
            user.is_superuser = False
            user.is_staff = True
        else:  # student
            user.is_superuser = False
            user.is_staff = False
        
        user.save()
        
        # Log the activity
        student_id = getattr(profile, 'student_id', None)
        target_identifier = student_id if student_id else user.username
        
        ActivityLog.objects.create(
            user=request.user,
            action='update',
            resource_type='User',
            resource_id=user.id,
            description=f"Admin {request.user.username} changed role for user {target_identifier} ({user.get_full_name()}) from {old_role} to {new_role}",
            ip_address=ip_address,
            metadata={
                'target_user_id': user.id,
                'target_student_id': student_id,
                'target_username': user.username,
                'old_role': old_role,
                'new_role': new_role,
                'admin_username': request.user.username,
                'action_type': 'role_update'
            }
        )
        
        # Return updated profile with user data
        serializer = self.get_serializer(profile, context={'request': request})
        
        return Response({
            'message': f"User role updated to {new_role} successfully",
            'profile': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperUser])
    def reset_password(self, request, pk=None):
        """Reset user's password (admin only)"""
        profile = self.get_object()
        user = profile.user
        
        # Get new password from request
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response({
                'error': 'new_password is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate password length
        if len(new_password) < 8:
            return Response({
                'error': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Set the new password
        user.set_password(new_password)
        user.save()
        
        # Log the activity
        student_id = getattr(profile, 'student_id', None)
        target_identifier = student_id if student_id else user.username
        
        ActivityLog.objects.create(
            user=request.user,
            action='update',
            resource_type='User',
            resource_id=user.id,
            description=f"Admin {request.user.username} reset password for user {target_identifier} ({user.get_full_name()})",
            ip_address=ip_address,
            metadata={
                'target_user_id': user.id,
                'target_student_id': student_id,
                'target_username': user.username,
                'admin_username': request.user.username,
                'action_type': 'password_reset'
            }
        )
        
        return Response({
            'message': 'Password reset successfully'
        }, status=status.HTTP_200_OK)


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for listing departments"""
    serializer_class = DepartmentSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return Program.objects.filter(
            program_type=Program.ProgramType.DEPARTMENT,
            is_active=True
        )


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for listing courses"""
    serializer_class = CourseSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = Program.objects.filter(
            program_type=Program.ProgramType.COURSE,
            is_active=True
        )
        department_id = self.request.query_params.get('department', None)
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        return queryset
