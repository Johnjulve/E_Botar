import logging
import csv
import io
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from django.http import HttpResponse
from .models import UserProfile, Program
from apps.common.models import ActivityLog
from apps.common.permissions import IsSuperUser, IsStaffOrSuperUser
from apps.common.throttling import enforce_scope_throttle
from .serializers import (
    UserSerializer, UserProfileSerializer, UserRegistrationSerializer,
    DepartmentSerializer, CourseSerializer, ProgramSerializer
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


@api_view(['GET', 'PATCH', 'PUT', 'POST'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get or update current authenticated user's profile"""
    if request.method == 'POST' and 'change_password' in request.data:
        # Handle password change
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not old_password or not new_password:
            return Response({
                'error': 'Both old_password and new_password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate new password length
        if len(new_password) < 8:
            return Response({
                'error': 'New password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get a fresh user instance from the database to avoid any caching issues
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(pk=request.user.pk)
        
        # Verify old password with the fresh user instance
        if not user.check_password(old_password):
            return Response({
                'error': 'Current password is incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password (this automatically hashes it)
        user.set_password(new_password)
        # Save the user - save all fields to ensure password is committed
        user.save()
        
        # Force database commit by getting a completely fresh instance
        # This ensures the password was actually written to the database
        user = User.objects.get(pk=request.user.pk)
        
        # Verify the new password works by checking it
        password_verified = user.check_password(new_password)
        logger.info(f"Password change attempt for user {user.id} ({user.username}): verification={password_verified}")
        
        if not password_verified:
            logger.error(f"Password change verification failed for user {user.id} ({user.username})")
            return Response({
                'error': 'Password change failed verification. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Log the successful password change
        logger.info(f"Password successfully changed and verified for user {user.id} ({user.username})")
        
        # Log the activity
        try:
            from apps.common.models import ActivityLog
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            
            ActivityLog.objects.create(
                user=request.user,
                action='update',
                resource_type='User',
                resource_id=request.user.id,
                description=f"User {request.user.username} changed their password",
                ip_address=ip_address,
                metadata={
                    'action_type': 'password_change',
                    'user_id': request.user.id,
                    'username': request.user.username
                }
            )
        except Exception as e:
            logger.error(f"Error logging password change activity: {str(e)}")
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)
    
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
        
        # Check if user is admin/staff (academic fields optional)
        is_admin_or_staff = user.is_staff or user.is_superuser
        
        # Update profile fields
        profile_data = {}
        profile_fields = ['student_id', 'year_level']
        for field in profile_fields:
            if field in request.data:
                # For admins, allow empty strings to clear the field
                if is_admin_or_staff:
                    profile_data[field] = request.data[field] if request.data[field] else None
                elif request.data[field]:  # For regular users, only set if value provided
                    profile_data[field] = request.data[field]
        
        # Handle department and course separately - convert to department_id and course_id
        if 'department' in request.data:
            if is_admin_or_staff and (not request.data['department'] or request.data['department'] == ''):
                # Allow admins to clear department
                profile_data['department_id'] = None
            elif request.data['department']:
                try:
                    profile_data['department_id'] = int(request.data['department'])
                except (ValueError, TypeError):
                    return Response(
                        {'department': ['Invalid department ID']}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        if 'course' in request.data:
            if is_admin_or_staff and (not request.data['course'] or request.data['course'] == ''):
                # Allow admins to clear course
                profile_data['course_id'] = None
            elif request.data['course']:
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
        enforce_scope_throttle(
            request,
            self,
            scope='registration_submit',
            message='You are submitting registrations too quickly. Please wait a moment before trying again.'
        )

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


class ProgramViewSet(viewsets.ModelViewSet):
    """ViewSet for managing programs (departments and courses)"""
    serializer_class = ProgramSerializer
    permission_classes = [IsSuperUser]
    
    def get_queryset(self):
        """Filter by program_type if provided"""
        queryset = Program.objects.all()
        program_type = self.request.query_params.get('program_type', None)
        if program_type:
            queryset = queryset.filter(program_type=program_type)
        return queryset.order_by('program_type', 'name')

    def create(self, request, *args, **kwargs):
        enforce_scope_throttle(
            request,
            self,
            scope='program_submit',
            message='You are creating programs too quickly. Please wait a moment before trying again.'
        )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        enforce_scope_throttle(
            request,
            self,
            scope='program_submit',
            message='You are updating programs too quickly. Please wait a moment before trying again.'
        )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        enforce_scope_throttle(
            request,
            self,
            scope='program_submit',
            message='You are updating programs too quickly. Please wait a moment before trying again.'
        )
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        """Import programs from CSV file"""
        enforce_scope_throttle(
            request,
            self,
            scope='program_import',
            message='You are importing programs too quickly. Please wait a moment before trying again.'
        )

        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response(
                {'error': 'File must be a CSV file'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Read CSV file
            # Use utf-8-sig to safely strip BOM characters that Excel adds to the first column header
            # This prevents issues where the first header becomes "\ufeffname" and appears as missing.
            decoded_file = file.read().decode('utf-8-sig')
            csv_reader = csv.DictReader(io.StringIO(decoded_file))
            
            required_fields = ['name', 'code', 'program_type']
            imported = []
            updated = []
            created = []
            errors = []
            
            for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (header is row 1)
                try:
                    # Validate required fields
                    missing_fields = []
                    for field in required_fields:
                        if field not in row or not row[field].strip():
                            missing_fields.append(field)
                    
                    if missing_fields:
                        errors.append({
                            'row': row_num,
                            'error': f'Missing required fields: {", ".join(missing_fields)}'
                        })
                        continue
                    
                    name = row['name'].strip()
                    code = row['code'].strip()
                    program_type = row['program_type'].strip().lower()
                    
                    # Validate program_type
                    if program_type not in ['department', 'course']:
                        errors.append({
                            'row': row_num,
                            'error': f'Invalid program_type: {program_type}. Must be "department" or "course"'
                        })
                        continue
                    
                    # Handle department link for courses using department code instead of numeric ID
                    department = None
                    if program_type == 'course':
                        # Prefer department_code column; fall back to department_id for backward compatibility
                        dept_code = row.get('department_code', '').strip()
                        dept_id_str = row.get('department_id', '').strip()

                        if dept_code:
                            # Look up department by its program code (e.g., CCIS)
                            department = Program.objects.filter(
                                program_type=Program.ProgramType.DEPARTMENT,
                                code=dept_code
                            ).first()
                            if not department:
                                errors.append({
                                    'row': row_num,
                                    'error': f'Department with code \"{dept_code}\" does not exist (expected an existing department program with that code)'
                                })
                                continue
                        elif dept_id_str:
                            # Legacy support: still accept numeric department_id if provided
                            try:
                                department_id = int(dept_id_str)
                                department = Program.objects.filter(
                                    id=department_id,
                                    program_type=Program.ProgramType.DEPARTMENT
                                ).first()
                                if not department:
                                    errors.append({
                                        'row': row_num,
                                        'error': f'Department with ID {department_id} does not exist'
                                    })
                                    continue
                            except ValueError:
                                errors.append({
                                    'row': row_num,
                                    'error': f'Invalid department_id: {dept_id_str}'
                                })
                                continue
                        else:
                            errors.append({
                                'row': row_num,
                                'error': 'Courses must include a department_code (recommended) or department_id'
                            })
                            continue
                    
                    # Prepare program data
                    program_data = {
                        'name': name,
                        'code': code,
                        'program_type': program_type,
                        'description': row.get('description', '').strip(),
                        'is_active': True
                    }
                    
                    # Check if program already exists (by code and program_type)
                    existing_program = Program.objects.filter(
                        program_type=program_type,
                        code=code
                    ).first()
                    
                    if existing_program:
                        # Update existing program (overwrite)
                        for key, value in program_data.items():
                            setattr(existing_program, key, value)
                        if department is not None:
                            existing_program.department = department
                        existing_program.save()
                        program = existing_program
                        action = 'updated'
                    else:
                        # Create new program
                        program = Program.objects.create(**program_data)
                        if department is not None:
                            program.department = department
                            program.save()
                        action = 'created'
                    
                    imported.append({
                        'id': program.id,
                        'name': program.name,
                        'code': program.code,
                        'program_type': program.program_type,
                        'action': action
                    })
                    
                    if action == 'updated':
                        updated.append({
                            'id': program.id,
                            'name': program.name,
                            'code': program.code,
                            'program_type': program.program_type
                        })
                    else:
                        created.append({
                            'id': program.id,
                            'name': program.name,
                            'code': program.code,
                            'program_type': program.program_type
                        })
                    
                except Exception as e:
                    errors.append({
                        'row': row_num,
                        'error': str(e)
                    })
            
            return Response({
                'message': f'Import completed. {len(created)} created, {len(updated)} updated, {len(errors)} errors',
                'imported': imported,
                'created': created,
                'updated': updated,
                'errors': errors
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error processing CSV file: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Export programs to CSV file (exports template if no data)"""
        try:
            program_type = request.query_params.get('program_type', None)
            
            queryset = self.get_queryset()
            if program_type:
                queryset = queryset.filter(program_type=program_type)
            
            # Create CSV response
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            filename = f"programs_export{('_' + program_type) if program_type else ''}.csv"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            # Add BOM for Excel compatibility with UTF-8
            response.write('\ufeff')
            
            writer = csv.writer(response)
            # Always write header
            writer.writerow(['name', 'code', 'program_type', 'department_id'])
            
            # Write data (if any)
            for program in queryset:
                department_id = program.department_id if program.department_id else ''
                writer.writerow([
                    program.name,
                    program.code,
                    program.program_type,
                    department_id
                ])
            
            return response
        except Exception as e:
            logger.error(f'Error exporting CSV: {str(e)}', exc_info=True)
            return Response(
                {'error': f'Error exporting CSV: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
