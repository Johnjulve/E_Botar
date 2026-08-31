"""
Accounts API: auth, profiles, programs registry, directory, and aggregates.

Sections: helpers → JWT & registration → profile ViewSet → directory &
read-only programs → superuser ProgramViewSet → simple count/current-user endpoints.
"""
import logging
import csv
import io
import re
import requests

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.contrib.sites.shortcuts import get_current_site
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.socialaccount.models import SocialAccount, SocialApp
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from apps.common.core.feature_flags import load_feature_flags
from apps.common.models import ActivityLog
from apps.common.http.permissions import IsStaffOrSuperUser, IsSuperUser
from apps.common.http.throttling import enforce_scope_throttle
from apps.common.core.utils import get_client_ip

from .models import Program, UserProfile
from apps.common.http.pagination import StandardResultsSetPagination

from .profile_list_filters import apply_profile_list_filters
from .serializers import (
    CourseSerializer,
    CustomTokenObtainPairSerializer,
    DepartmentSerializer,
    ProgramSerializer,
    UserProfileListSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
    UserSerializer,
)
from .utils import staff_can_manage_student_profile


logger = logging.getLogger(__name__)

_PROFILE_EDIT_DENIED = (
    'You do not have permission to edit this profile. '
    'Staff may only edit student profiles at or below their own year level.'
)


def _get_google_client_id_from_social_app(request):
    current_site = get_current_site(request)
    site_specific_social_app = (
        SocialApp.objects.filter(provider='google', sites=current_site)
        .order_by('id')
        .first()
    )
    if site_specific_social_app:
        return site_specific_social_app.client_id

    fallback_social_app = SocialApp.objects.filter(provider='google').order_by('id').first()
    return fallback_social_app.client_id if fallback_social_app else None


def _google_token_payload_from_access_token(access_token, expected_client_id):
    """Validate a Google OAuth access token and return a normalized userinfo payload."""
    try:
        tokeninfo_response = requests.get(
            'https://oauth2.googleapis.com/tokeninfo',
            params={'access_token': access_token},
            timeout=10,
        )
    except requests.RequestException:
        return None

    if tokeninfo_response.status_code != 200:
        return None

    tokeninfo = tokeninfo_response.json()
    token_audience = tokeninfo.get('aud') or tokeninfo.get('azp')
    if token_audience != expected_client_id:
        logger.warning(
            'Google access token audience mismatch: expected=%s got=%s',
            expected_client_id,
            token_audience,
        )
        return None

    email_verified_raw = tokeninfo.get('email_verified')
    email_verified = str(email_verified_raw).lower() in ('true', '1', 'yes')

    return {
        'email': (tokeninfo.get('email') or '').strip().lower(),
        'email_verified': email_verified,
        'sub': tokeninfo.get('sub'),
        'given_name': tokeninfo.get('given_name') or '',
        'family_name': tokeninfo.get('family_name') or '',
    }


def _build_unique_username_from_email(email_value):
    local_part = (email_value or "").split("@")[0]
    normalized_base = re.sub(r"[^a-zA-Z0-9_]", "", local_part).lower() or "google_user"
    candidate_username = normalized_base[:150]
    sequence = 1
    while User.objects.filter(username=candidate_username).exists():
        suffix = f"_{sequence}"
        candidate_username = f"{normalized_base[: max(150 - len(suffix), 1)]}{suffix}"
        sequence += 1
    return candidate_username


def handle_current_user_password_change(request):
    if request.method != 'POST' or 'change_password' not in request.data:
        return None

    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    if not old_password or not new_password:
        return Response(
            {'error': 'Both old_password and new_password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(new_password) < 8:
        return Response(
            {'error': 'New password must be at least 8 characters long'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.get(pk=request.user.pk)
    if not user.check_password(old_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save()
    user = User.objects.get(pk=request.user.pk)

    verified = user.check_password(new_password)
    logger.info(
        'Password change attempt for user %s (%s): verification=%s',
        user.id,
        user.username,
        verified,
    )
    if not verified:
        logger.error(
            'Password change verification failed for user %s (%s)',
            user.id,
            user.username,
        )
        return Response(
            {'error': 'Password change failed verification. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    logger.info(
        'Password successfully changed and verified for user %s (%s)',
        user.id,
        user.username,
    )
    try:
        ActivityLog.objects.create(
            user=request.user,
            action='update',
            resource_type='User',
            resource_id=request.user.id,
            description=f'User {request.user.username} changed their password',
            ip_address=get_client_ip(request),
            metadata={
                'action_type': 'password_change',
                'user_id': request.user.id,
                'username': request.user.username,
            },
        )
    except Exception as exc:
        logger.error('Error logging password change activity: %s', exc)

    return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


# --- JWT ----------------------------------------------------------------------


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        enforce_scope_throttle(
            request,
            self,
            scope='login_submit',
            message='Too many login attempts. Please wait a moment before trying again.',
        )
        return super().post(request, *args, **kwargs)


class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        enforce_scope_throttle(
            request,
            self,
            scope='registration_submit',
            message='You are submitting registrations too quickly. Please wait a moment before trying again.',
        )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'message': 'User registered successfully',
                'user': UserSerializer(user, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    enforce_scope_throttle(
        request,
        google_login,
        scope='google_auth_submit',
        message=(
            'Too many Google sign-in attempts in a short time. '
            'Please wait a moment before trying again.'
        ),
    )

    if not load_feature_flags().get('google_login', True):
        return Response(
            {'error': 'Google sign-in is temporarily disabled.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    google_credential = request.data.get('credential')
    google_access_token = request.data.get('access_token')
    existing_account_password = request.data.get('password', '')

    if not google_credential and not google_access_token:
        return Response(
            {'error': 'Google credential or access token is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    google_client_id = _get_google_client_id_from_social_app(request)
    if not google_client_id:
        return Response(
            {'error': 'Google Social App is not configured on the server.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if google_credential:
        try:
            token_payload = google_id_token.verify_oauth2_token(
                google_credential,
                google_requests.Request(),
                google_client_id,
            )
        except Exception:
            return Response(
                {'error': 'Invalid Google credential.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
    else:
        token_payload = _google_token_payload_from_access_token(
            google_access_token,
            google_client_id,
        )
        if not token_payload:
            return Response(
                {'error': 'Invalid Google access token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

    email_value = (token_payload.get('email') or '').strip().lower()
    email_verified = str(token_payload.get('email_verified')).lower() == 'true'
    google_subject = token_payload.get('sub')

    if not email_value or not google_subject:
        return Response(
            {'error': 'Google account payload is missing required identity fields.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not email_verified:
        return Response(
            {'error': 'Google email must be verified before sign in.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    existing_social_account = SocialAccount.objects.filter(
        provider='google',
        uid=str(google_subject),
    ).select_related('user').first()
    if existing_social_account:
        user = existing_social_account.user
    else:
        conflicting_email_accounts = User.objects.filter(email__iexact=email_value)
        ambiguous_email_conflict_count = conflicting_email_accounts.count()
        if ambiguous_email_conflict_count > 1:
            return Response(
                {
                    'error': (
                        'Several local accounts share this verified email. '
                        'Contact an administrator to resolve duplicate accounts.'
                    ),
                    'code': 'ambiguous_email_accounts',
                },
                status=status.HTTP_409_CONFLICT,
            )
        matching_user = conflicting_email_accounts.first()

        if matching_user:
            if not existing_account_password:
                return Response(
                    {
                        'error': 'Password confirmation is required before linking this Google account.',
                        'requires_password': True,
                        'email': email_value,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            if not matching_user.check_password(existing_account_password):
                return Response(
                    {'error': 'Invalid password for existing account.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            if not matching_user.is_active:
                return Response(
                    {'error': 'This account is inactive and cannot be linked.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            try:
                SocialAccount.objects.create(
                    user=matching_user,
                    provider='google',
                    uid=str(google_subject),
                    extra_data=token_payload,
                )
            except IntegrityError:
                raced_social_link = SocialAccount.objects.filter(
                    provider='google',
                    uid=str(google_subject),
                ).select_related('user').first()
                if raced_social_link:
                    user = raced_social_link.user
                else:
                    logger.exception('Google linking IntegrityError without recoverable SocialAccount')
                    return Response(
                        {'error': 'Unable to link Google account (database conflict). Please try again shortly.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
            else:
                user = matching_user
        else:
            first_name = (token_payload.get('given_name') or '').strip()
            last_name = (token_payload.get('family_name') or '').strip()
            unique_username = _build_unique_username_from_email(email_value)
            try:
                with transaction.atomic():
                    user = User.objects.create_user(
                        username=unique_username,
                        email=email_value,
                        password=None,
                        first_name=first_name,
                        last_name=last_name,
                    )
                    SocialAccount.objects.create(
                        user=user,
                        provider='google',
                        uid=str(google_subject),
                        extra_data=token_payload,
                    )
                    UserProfile.objects.get_or_create(user=user)
            except IntegrityError:
                raced_google_user_flow = SocialAccount.objects.filter(
                    provider='google',
                    uid=str(google_subject),
                ).select_related('user').first()
                if raced_google_user_flow:
                    user = raced_google_user_flow.user
                else:
                    logger.exception('Google new-user IntegrityError without matching SocialAccount')
                    return Response(
                        {
                            'error': (
                                'Unable to finalize Google sign-in because of an account naming conflict '
                                '(try again shortly or contact support).'
                            ),
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

    if not user.is_active:
        return Response(
            {'error': 'This account is inactive.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    jwt_refresh_token = RefreshToken.for_user(user)
    return Response(
        {
            'access': str(jwt_refresh_token.access_token),
            'refresh': str(jwt_refresh_token),
        },
        status=status.HTTP_200_OK,
    )


# --- Profiles -----------------------------------------------------------------


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == 'list':
            return UserProfileListSerializer
        return UserProfileSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            queryset = UserProfile.objects.select_related('user', 'department', 'course').all()
        else:
            queryset = UserProfile.objects.select_related('user', 'department', 'course').filter(
                user=user,
            )

        if self.action == 'list' and (user.is_staff or user.is_superuser):
            queryset = apply_profile_list_filters(
                queryset,
                self.request.query_params,
                include_email_search=True,
            )
            queryset = queryset.order_by('user__last_name', 'user__first_name', 'user__username')
        return queryset

    @staticmethod
    def user_can_edit_profile(request, profile):
        if request.user.is_superuser:
            return True
        if profile.user_id == request.user.id:
            return True
        if request.user.is_staff and staff_can_manage_student_profile(request.user, profile):
            return True
        return False

    def enforce_profile_editor_permission(self):
        profile = self.get_object()
        if not self.user_can_edit_profile(self.request, profile):
            raise PermissionDenied(_PROFILE_EDIT_DENIED)

    def update(self, request, *args, **kwargs):
        self.enforce_profile_editor_permission()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.enforce_profile_editor_permission()
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            raise PermissionDenied('Only administrators can delete user profiles.')
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrSuperUser])
    def toggle_active(self, request, pk=None):
        enforce_scope_throttle(
            request,
            self,
            scope='admin_action',
            message='You are performing administrative actions too quickly. Please wait a moment.',
        )
        profile = self.get_object()
        user_obj = profile.user

        if not request.user.is_superuser:
            if user_obj.is_superuser or user_obj.is_staff:
                raise PermissionDenied('Staff cannot change active status for administrators or staff.')
            if not staff_can_manage_student_profile(request.user, profile):
                raise PermissionDenied(
                    'You can only change active status for students at or below your own year level.'
                )

        old_status = user_obj.is_active
        user_obj.is_active = not user_obj.is_active
        user_obj.save()

        try:
            from apps.voting.services import VotingDataService

            VotingDataService.invalidate_voting_cache()
        except Exception:
            pass

        student_id = getattr(profile, 'student_id', None)
        target_identifier = student_id if student_id else user_obj.username
        actor_label = 'Admin' if request.user.is_superuser else 'Staff'
        action_word = 'activated' if user_obj.is_active else 'deactivated'

        ActivityLog.objects.create(
            user=request.user,
            action='update',
            resource_type='User',
            resource_id=user_obj.id,
            description=(
                f'{actor_label} {request.user.username} {action_word} user '
                f'{target_identifier} ({user_obj.get_full_name()})'
            ),
            ip_address=get_client_ip(request),
            metadata={
                'target_user_id': user_obj.id,
                'target_student_id': student_id,
                'target_username': user_obj.username,
                'old_status': 'active' if old_status else 'inactive',
                'new_status': 'active' if user_obj.is_active else 'inactive',
                'admin_username': request.user.username,
            },
        )

        serializer = self.get_serializer(profile, context={'request': request})
        return Response(
            {
                'message': f"User {'activated' if user_obj.is_active else 'deactivated'} successfully",
                'profile': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], permission_classes=[IsSuperUser])
    def update_role(self, request, pk=None):
        enforce_scope_throttle(
            request,
            self,
            scope='admin_action',
            message='You are performing administrative actions too quickly. Please wait a moment.',
        )
        profile = self.get_object()
        user_obj = profile.user
        new_role = request.data.get('role')

        if not new_role:
            return Response({'error': 'role is required'}, status=status.HTTP_400_BAD_REQUEST)
        if new_role not in ['student', 'staff', 'admin']:
            return Response(
                {'error': 'Invalid role. Must be one of: student, staff, admin'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user_obj == request.user:
            return Response({'error': 'You cannot change your own role'}, status=status.HTTP_400_BAD_REQUEST)

        old_role = 'admin' if user_obj.is_superuser else ('staff' if user_obj.is_staff else 'student')

        if new_role == 'admin':
            user_obj.is_superuser = True
            user_obj.is_staff = True
        elif new_role == 'staff':
            user_obj.is_superuser = False
            user_obj.is_staff = True
        else:
            user_obj.is_superuser = False
            user_obj.is_staff = False

        user_obj.save()

        student_id = getattr(profile, 'student_id', None)
        target_identifier = student_id if student_id else user_obj.username

        ActivityLog.objects.create(
            user=request.user,
            action='update',
            resource_type='User',
            resource_id=user_obj.id,
            description=(
                f'Admin {request.user.username} changed role for user {target_identifier} '
                f'({user_obj.get_full_name()}) from {old_role} to {new_role}'
            ),
            ip_address=get_client_ip(request),
            metadata={
                'target_user_id': user_obj.id,
                'target_student_id': student_id,
                'target_username': user_obj.username,
                'old_role': old_role,
                'new_role': new_role,
                'admin_username': request.user.username,
                'action_type': 'role_update',
            },
        )

        serializer = self.get_serializer(profile, context={'request': request})
        return Response(
            {'message': f'User role updated to {new_role} successfully', 'profile': serializer.data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], permission_classes=[IsSuperUser])
    def reset_password(self, request, pk=None):
        enforce_scope_throttle(
            request,
            self,
            scope='admin_action',
            message='You are performing administrative actions too quickly. Please wait a moment.',
        )
        profile = self.get_object()
        user_obj = profile.user
        new_password = request.data.get('new_password')

        if not new_password:
            return Response({'error': 'new_password is required'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters long'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_obj.set_password(new_password)
        user_obj.save()

        student_id = getattr(profile, 'student_id', None)
        target_identifier = student_id if student_id else user_obj.username

        ActivityLog.objects.create(
            user=request.user,
            action='update',
            resource_type='User',
            resource_id=user_obj.id,
            description=(
                f'Admin {request.user.username} reset password for user {target_identifier} '
                f'({user_obj.get_full_name()})'
            ),
            ip_address=get_client_ip(request),
            metadata={
                'target_user_id': user_obj.id,
                'target_student_id': student_id,
                'target_username': user_obj.username,
                'admin_username': request.user.username,
                'action_type': 'password_reset',
            },
        )

        return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrSuperUser])
    def set_verified(self, request, pk=None):
        """Set student verification status (staff/admin only, audited)."""
        enforce_scope_throttle(
            request,
            self,
            scope='admin_action',
            message='You are performing administrative actions too quickly. Please wait a moment.',
        )
        profile = self.get_object()
        user_obj = profile.user

        if 'is_verified' not in request.data:
            return Response(
                {'error': 'is_verified is required (true or false)'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_verified_raw = request.data.get('is_verified')
        if isinstance(is_verified_raw, bool):
            new_verified = is_verified_raw
        elif isinstance(is_verified_raw, str) and is_verified_raw.lower() in ('true', 'false'):
            new_verified = is_verified_raw.lower() == 'true'
        else:
            return Response(
                {'error': 'is_verified must be a boolean'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.is_superuser:
            if user_obj.is_superuser or user_obj.is_staff:
                raise PermissionDenied('Staff cannot change verification for administrators or staff.')
            if not staff_can_manage_student_profile(request.user, profile):
                raise PermissionDenied(
                    'You can only change verification for students at or below your own year level.'
                )

        old_verified = profile.is_verified
        if old_verified == new_verified:
            serializer = self.get_serializer(profile, context={'request': request})
            return Response(
                {
                    'message': f'User verification is already {"enabled" if new_verified else "disabled"}',
                    'profile': serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        profile.is_verified = new_verified
        profile.save(update_fields=['is_verified', 'updated_at'])

        student_id = getattr(profile, 'student_id', None)
        target_identifier = student_id if student_id else user_obj.username
        actor_label = 'Admin' if request.user.is_superuser else 'Staff'
        status_word = 'verified' if new_verified else 'unverified'

        ActivityLog.objects.create(
            user=request.user,
            action='update',
            resource_type='User',
            resource_id=user_obj.id,
            description=(
                f'{actor_label} {request.user.username} marked user {target_identifier} '
                f'({user_obj.get_full_name()}) as {status_word}'
            ),
            ip_address=get_client_ip(request),
            metadata={
                'target_user_id': user_obj.id,
                'target_student_id': student_id,
                'target_username': user_obj.username,
                'old_is_verified': old_verified,
                'new_is_verified': new_verified,
                'admin_username': request.user.username,
                'action_type': 'verification_update',
            },
        )

        serializer = self.get_serializer(profile, context={'request': request})
        return Response(
            {
                'message': f'User marked as {status_word} successfully',
                'profile': serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class UserDirectoryView(generics.ListAPIView):
    serializer_class = UserProfileListSerializer
    permission_classes = [IsAuthenticated, IsStaffOrSuperUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        query_params = self.request.query_params
        queryset = UserProfile.objects.select_related('user', 'department', 'course')

        directory_type = (query_params.get('type') or 'students').lower()
        if directory_type == 'staff':
            queryset = queryset.filter(Q(user__is_staff=True) | Q(user__is_superuser=True))
        else:
            queryset = queryset.filter(user__is_staff=False, user__is_superuser=False)

        queryset = apply_profile_list_filters(
            queryset,
            query_params,
            include_email_search=True,
        )
        return queryset.order_by('user__last_name', 'user__first_name', 'user__username')


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Program.objects.filter(
            program_type=Program.ProgramType.DEPARTMENT,
            is_active=True,
        )


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Program.objects.filter(
            program_type=Program.ProgramType.COURSE,
            is_active=True
        ).select_related('department')
        department_code = self.request.query_params.get('department')
        if department_code:
            queryset = queryset.filter(department__code=department_code)
        return queryset


class ProgramViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        queryset = Program.objects.select_related('department').all()
        program_type = self.request.query_params.get('program_type')
        if program_type:
            queryset = queryset.filter(program_type=program_type)
        return queryset.order_by('program_type', 'name')

    @staticmethod
    def throttle_program_writes(request, view, gerund_noun_phrase: str):
        enforce_scope_throttle(
            request,
            view,
            scope='program_submit',
            message=(
                f'You are {gerund_noun_phrase} too quickly. '
                'Please wait a moment before trying again.'
            ),
        )

    def create(self, request, *args, **kwargs):
        self.throttle_program_writes(request, self, 'creating programs')
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self.throttle_program_writes(request, self, 'updating programs')
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.throttle_program_writes(request, self, 'updating programs')
        return super().partial_update(request, *args, **kwargs)

    @staticmethod
    def csv_missing_required_fields_error(row, required_fields, row_num):
        missing = [
            field
            for field in required_fields
            if row.get(field) is None or not str(row.get(field)).strip()
        ]
        if not missing:
            return None
        return {
            'row': row_num,
            'error': f'Missing required fields: {", ".join(missing)}',
        }

    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        enforce_scope_throttle(
            request,
            self,
            scope='program_import',
            message='You are importing programs too quickly. Please wait a moment before trying again.',
        )

        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        uploaded = request.FILES['file']
        if not uploaded.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV file'}, status=status.HTTP_400_BAD_REQUEST)

        preview_only = str(request.query_params.get('preview_only', 'false')).lower() == 'true'

        try:
            decoded_file = uploaded.read().decode('utf-8-sig')
            csv_reader = csv.DictReader(io.StringIO(decoded_file))

            required_fields = ['name', 'code', 'program_type']
            errors = []
            parsed_rows = []
            department_codes_in_csv = set()
            planned_actions = []

            for row_num, row in enumerate(csv_reader, start=2):
                try:
                    field_error = self.csv_missing_required_fields_error(row, required_fields, row_num)
                    if field_error:
                        errors.append(field_error)
                        continue

                    name = row['name'].strip()
                    code = row['code'].strip()
                    program_type = row['program_type'].strip().lower()
                    description = (row.get('description') or '').strip()
                    department_code_row = (row.get('department_code') or '').strip()

                    if program_type not in ['department', 'course']:
                        errors.append({
                            'row': row_num,
                            'error': (
                                f'Invalid program_type: {program_type}. '
                                'Must be "department" or "course"'
                            ),
                        })
                        continue

                    if program_type == 'department':
                        department_codes_in_csv.add(code)

                    existing_program = Program.objects.filter(
                        program_type=program_type,
                        code=code,
                    ).first()
                    action = 'updated' if existing_program else 'created'

                    parsed_rows.append({
                        'row_num': row_num,
                        'name': name,
                        'code': code,
                        'program_type': program_type,
                        'description': description,
                        'department_code': department_code_row,
                    })
                    planned_actions.append({
                        'row_num': row_num,
                        'name': name,
                        'code': code,
                        'program_type': program_type,
                        'action': action,
                    })
                except Exception as exc:
                    errors.append({'row': row_num, 'error': str(exc)})

            existing_departments = Program.objects.filter(
                program_type=Program.ProgramType.DEPARTMENT,
            )
            existing_department_map = {dept.code: dept for dept in existing_departments}

            for row in parsed_rows:
                if row['program_type'] != 'course':
                    continue
                dept_code = row['department_code']
                if not dept_code:
                    continue
                if dept_code in existing_department_map:
                    continue
                if dept_code in department_codes_in_csv:
                    continue
                errors.append({
                    'row': row['row_num'],
                    'error': (
                        f'Department with code "{dept_code}" does not exist in database '
                        'or this CSV file'
                    ),
                })

            created_preview = [item for item in planned_actions if item['action'] == 'created']
            updated_preview = [item for item in planned_actions if item['action'] == 'updated']
            summary = {
                'total_rows': len(parsed_rows),
                'created_count': len(created_preview),
                'updated_count': len(updated_preview),
                'error_count': len(errors),
                'preview_only': preview_only,
            }

            if preview_only:
                return Response(
                    {
                        'message': (
                            'Validation completed successfully. Ready to import.'
                            if not errors else
                            f'Validation failed with {len(errors)} error(s). Fix errors before importing.'
                        ),
                        'summary': summary,
                        'created': created_preview,
                        'updated': updated_preview,
                        'errors': errors,
                    },
                    status=status.HTTP_200_OK,
                )

            if errors:
                return Response(
                    {
                        'message': f'Import blocked. Found {len(errors)} validation error(s).',
                        'summary': summary,
                        'created': [],
                        'updated': [],
                        'errors': errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            imported = []
            created = []
            updated = []
            department_map = dict(existing_department_map)

            with transaction.atomic():
                for row in parsed_rows:
                    program_data = {
                        'name': row['name'],
                        'code': row['code'],
                        'program_type': row['program_type'],
                        'description': row['description'],
                        'is_active': True,
                    }

                    existing = Program.objects.filter(
                        program_type=row['program_type'],
                        code=row['code'],
                    ).first()
                    write_action = 'updated' if existing else 'created'

                    if existing:
                        for key, value in program_data.items():
                            setattr(existing, key, value)
                        program = existing
                    else:
                        program = Program.objects.create(**program_data)

                    if row['program_type'] == 'course':
                        program.department = department_map.get(row['department_code'])
                        program.save()
                    else:
                        department_map[row['code']] = program
                        program.save()

                    imported_item = {
                        'id': program.id,
                        'name': program.name,
                        'code': program.code,
                        'program_type': program.program_type,
                        'action': write_action,
                    }
                    imported.append(imported_item)
                    if write_action == 'created':
                        created.append(imported_item)
                    else:
                        updated.append(imported_item)

            return Response(
                {
                    'message': f'Import completed. {len(created)} created, {len(updated)} updated, 0 errors',
                    'summary': {**summary, 'preview_only': False},
                    'imported': imported,
                    'created': created,
                    'updated': updated,
                    'errors': [],
                },
                status=status.HTTP_200_OK,
            )

        except Exception as exc:
            logger.error('Error processing program CSV import: %s', exc, exc_info=True)
            return Response(
                {'error': 'Error processing CSV file. Check the file format and try again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        try:
            program_type_filter = request.query_params.get('program_type')
            queryset = self.get_queryset().select_related('department')
            if program_type_filter:
                queryset = queryset.filter(program_type=program_type_filter)

            response = HttpResponse(content_type='text/csv; charset=utf-8')
            filename = f"programs_export{('_' + program_type_filter) if program_type_filter else ''}.csv"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response.write('\ufeff')

            writer = csv.writer(response)
            writer.writerow(['name', 'code', 'program_type', 'department_code'])

            for program in queryset:
                dept_code = program.department.code if program.department else ''
                writer.writerow([program.name, program.code, program.program_type, dept_code])

            return response
        except Exception as exc:
            logger.error('Error exporting program CSV: %s', exc, exc_info=True)
            return Response(
                {'error': 'Error exporting CSV. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# --- Simple metrics & current user ------------------------------------------


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_count(request):
    total_students = User.objects.filter(
        is_staff=False,
        is_superuser=False,
        is_active=True,
    ).count()
    return Response({'total_students': total_students})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffOrSuperUser])
def user_count(request):
    total_users = User.objects.count()
    total_active_users = User.objects.filter(is_active=True).count()
    return Response({
        'total_users': total_users,
        'total_active_users': total_active_users,
        'total_inactive_users': total_users - total_active_users,
    })


@api_view(['GET', 'PATCH', 'PUT', 'POST'])
@permission_classes([IsAuthenticated])
def current_user(request):
    password_response = handle_current_user_password_change(request)
    if password_response is not None:
        return password_response

    if request.method == 'GET':
        try:
            user_serializer = UserSerializer(request.user, context={'request': request})
            try:
                profile = request.user.profile
            except UserProfile.DoesNotExist:
                profile = UserProfile.objects.create(user=request.user)
            try:
                profile_serializer = UserProfileSerializer(profile, context={'request': request})
                return Response({'user': user_serializer.data, 'profile': profile_serializer.data})
            except Exception as exc:
                logger.error(
                    'Error serializing profile for user %s: %s',
                    request.user.id,
                    exc,
                    exc_info=True,
                )
                return Response(
                    {'error': 'Error retrieving profile data. Please try again later.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as exc:
            logger.error('Error in current_user GET for user %s: %s', request.user.id, exc, exc_info=True)
            return Response(
                {'error': 'Error retrieving user data. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    if request.method in ['PATCH', 'PUT']:
        enforce_scope_throttle(
            request,
            None,
            scope='profile_update',
            message='You are updating your profile too frequently. Please wait a moment before saving again.',
        )
        user = request.user
        profile = user.profile

        user_data = {}
        if 'first_name' in request.data:
            user_data['first_name'] = request.data['first_name']
        if 'last_name' in request.data:
            user_data['last_name'] = request.data['last_name']
        if 'email' in request.data:
            if not user.email or user.email.strip() == '':
                user_data['email'] = request.data['email']

        if user_data:
            user_serializer = UserSerializer(user, data=user_data, partial=True, context={'request': request})
            if user_serializer.is_valid():
                user_serializer.save()
            else:
                return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        is_admin_or_staff = user.is_staff or user.is_superuser
        profile_data = {}

        profile_fields = ['middle_name', 'student_id', 'year_level', 'section']
        for field in profile_fields:
            if field not in request.data:
                continue
            if is_admin_or_staff:
                profile_data[field] = request.data[field] if request.data[field] else None
            elif request.data[field]:
                profile_data[field] = request.data[field]

        if 'department' in request.data:
            if is_admin_or_staff and (not request.data['department'] or request.data['department'] == ''):
                profile_data['department_code'] = None
            elif request.data['department']:
                dept_value = request.data.get('department_code') or request.data['department']
                profile_data['department_code'] = str(dept_value).strip()

        if 'course' in request.data:
            if is_admin_or_staff and (not request.data['course'] or request.data['course'] == ''):
                profile_data['course_code'] = None
            elif request.data['course']:
                course_value = request.data.get('course_code') or request.data['course']
                profile_data['course_code'] = str(course_value).strip()

        if 'avatar' in request.FILES:
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile_data['avatar'] = request.FILES['avatar']

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

        profile.refresh_from_db()

        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'profile': UserProfileSerializer(profile, context={'request': request}).data,
            'message': 'Profile updated successfully',
        })

    if request.method == 'POST':
        return Response(
            {'error': 'POST is only supported with change_password in the body.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
