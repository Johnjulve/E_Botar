from collections import Counter
from datetime import timedelta

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .models import SecurityEvent, ActivityLog, SystemSettings
from .permissions import IsStaffOrSuperUser
from .serializers import AcademicYearSerializer


def _parse_datetime_param(value):
    """Parse ISO datetime string into aware datetime or return None."""
    if not value:
        return None
    dt = parse_datetime(value)
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _map_security_severity(level):
    """Map model severity levels to UI categories."""
    mapping = {
        'low': 'success',
        'medium': 'warning',
        'high': 'warning',
        'critical': 'error',
    }
    return mapping.get(level, 'info')


def _map_activity_severity(action):
    """Map activity actions to UI severity categories."""
    success_actions = {'create', 'update', 'approve', 'vote', 'apply'}
    warning_actions = {'delete', 'reject'}
    info_actions = {'login', 'logout', 'read'}

    if action in warning_actions:
        return 'warning'
    if action in success_actions:
        return 'success'
    if action in info_actions:
        return 'info'
    return 'info'


class SystemLogListView(APIView):
    """
    Consolidated view for security events and activity logs.

    Supports filtering by severity, search keywords, and date range.
    Returns combined logs plus summary counts for dashboard cards.
    """

    permission_classes = [IsAuthenticated, IsStaffOrSuperUser]
    DEFAULT_LIMIT = 120
    MAX_LIMIT = 300

    def get(self, request):
        log_type = request.query_params.get('log_type', 'all').lower()
        severity_filter = request.query_params.get('severity')
        search = request.query_params.get('search', '').strip()
        limit = self._validate_limit(request.query_params.get('limit'))

        date_from = _parse_datetime_param(request.query_params.get('date_from'))
        date_to = _parse_datetime_param(request.query_params.get('date_to')) or timezone.now()

        if date_from is None:
            # Default window: last 30 days
            date_from = date_to - timedelta(days=30)

        security_logs = []
        activity_logs = []

        if log_type in ['all', 'security']:
            security_logs = self._get_security_logs(date_from, date_to, severity_filter, search, limit)

        if log_type in ['all', 'activity']:
            activity_logs = self._get_activity_logs(date_from, date_to, severity_filter, search, limit)

        combined = sorted(
            security_logs + activity_logs,
            key=lambda item: item['timestamp'],
            reverse=True
        )[:limit]

        summary = self._build_summary(combined)

        return Response({
            'logs': [
                {
                    **log,
                    # Serialize datetime to ISO string
                    'timestamp': log['timestamp'].isoformat()
                }
                for log in combined
            ],
            'summary': summary,
            'meta': {
                'log_type': log_type,
                'severity_filter': severity_filter,
                'search': search,
                'limit': limit,
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
            }
        })

    def _validate_limit(self, value):
        try:
            limit = int(value)
            if limit < 10:
                return 10
            if limit > self.MAX_LIMIT:
                return self.MAX_LIMIT
            return limit
        except (TypeError, ValueError):
            return self.DEFAULT_LIMIT

    def _get_security_logs(self, date_from, date_to, severity_filter, search, limit):
        queryset = SecurityEvent.objects.filter(
            created_at__range=(date_from, date_to)
        )

        # Map severity filter to underlying model values
        severity_lookup = {
            'success': ['low'],
            'warning': ['medium', 'high'],
            'error': ['critical'],
        }
        if severity_filter in severity_lookup:
            queryset = queryset.filter(severity__in=severity_lookup[severity_filter])

        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) |
                Q(event_type__icontains=search) |
                Q(user__username__icontains=search)
            )

        queryset = queryset.order_by('-created_at')[:limit]

        logs = []
        for event in queryset:
            severity = _map_security_severity(event.severity)
            logs.append({
                'id': f'sec_{event.id}',
                'source': 'security',
                'severity': severity,
                'event_type': event.event_type,
                'event_label': event.get_event_type_display(),
                'message': event.description,
                'user': self._format_user(event.user),
                'ip_address': event.ip_address,
                'timestamp': event.created_at,
            })
        return logs

    def _get_activity_logs(self, date_from, date_to, severity_filter, search, limit):
        queryset = ActivityLog.objects.filter(
            created_at__range=(date_from, date_to)
        )

        if severity_filter == 'info':
            queryset = queryset.filter(action__in=['login', 'logout', 'read'])
        elif severity_filter == 'success':
            queryset = queryset.filter(action__in=['create', 'update', 'approve', 'vote', 'apply'])
        elif severity_filter == 'warning':
            queryset = queryset.filter(action__in=['delete', 'reject'])
        elif severity_filter == 'error':
            # Currently no error-level activity actions, return empty
            queryset = queryset.none()

        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) |
                Q(resource_type__icontains=search) |
                Q(user__username__icontains=search)
            )

        queryset = queryset.order_by('-created_at')[:limit]

        logs = []
        for log in queryset:
            severity = _map_activity_severity(log.action)
            message = log.description or f"{log.get_action_display()} {log.resource_type}"
            logs.append({
                'id': f'act_{log.id}',
                'source': 'activity',
                'severity': severity,
                'event_type': log.action,
                'action': log.action,  # Include action for filtering
                'event_label': log.get_action_display(),
                'message': message,
                'resource_type': log.resource_type,  # Include resource_type for filtering
                'user': self._format_user(log.user),
                'ip_address': log.ip_address,
                'timestamp': log.created_at,
            })
        return logs

    @staticmethod
    def _format_user(user):
        if not user:
            return 'System'
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name or user.username

    @staticmethod
    def _build_summary(logs):
        counts = Counter()
        for log in logs:
            severity = log.get('severity', 'info') or 'info'
            counts[severity] += 1

        return {
            'total': len(logs),
            'success': counts.get('success', 0),
            'info': counts.get('info', 0),
            'warnings': counts.get('warning', 0),
            'errors': counts.get('error', 0),
        }


class AcademicYearView(APIView):
    """
    API endpoint for getting and updating the academic year setting.
    
    GET: Returns current academic year (public, no auth required)
    PUT: Updates academic year (admin only)
    """
    
    def get_permissions(self):
        """Different permissions for GET vs PUT"""
        if self.request.method == 'GET':
            return []  # Public access
        return [IsAuthenticated(), IsStaffOrSuperUser()]  # Admin only for updates
    
    def get(self, request):
        """Get current academic year"""
        academic_year = SystemSettings.get_value('academic_year', default='2025-2026')
        return Response({
            'academic_year': academic_year,
            'display': f'A.Y {academic_year}'
        })
    
    def put(self, request):
        """Update academic year (admin only)"""
        serializer = AcademicYearSerializer(data=request.data)
        if serializer.is_valid():
            academic_year = serializer.validated_data['academic_year']
            SystemSettings.set_value(
                key='academic_year',
                value=academic_year,
                description='Current academic year for the system',
                user=request.user
            )
            return Response({
                'academic_year': academic_year,
                'display': f'A.Y {academic_year}',
                'message': 'Academic year updated successfully'
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BrandingView(APIView):
    """
    Public API for institution branding (logo, name).
    Used so the app can be deployed as a template for different schools.
    GET: Returns institution_name, institution_name_line2, institution_logo_url, app_name.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        institution_name = SystemSettings.get_value('institution_name', default='SURIGAO DEL NORTE')
        institution_name_line2 = SystemSettings.get_value('institution_name_line2', default='STATE UNIVERSITY')
        institution_logo = SystemSettings.get_value('institution_logo', default='')
        app_name = SystemSettings.get_value('app_name', default='E-Botar')

        logo_url = None
        if institution_logo and institution_logo.strip():
            path = institution_logo.strip().lstrip('/')
            base = getattr(settings, 'BACKEND_BASE_URL', None)
            if base:
                logo_url = f"{base.rstrip('/')}/{settings.MEDIA_URL.rstrip('/')}/{path}"
            else:
                try:
                    logo_url = request.build_absolute_uri(f"/{settings.MEDIA_URL.rstrip('/')}/{path}")
                except Exception:
                    logo_url = None

        return Response({
            'institution_name': institution_name,
            'institution_name_line2': institution_name_line2,
            'institution_logo_url': logo_url,
            'app_name': app_name,
            'institution_full_name': f"{institution_name} {institution_name_line2}".strip(),
        })

