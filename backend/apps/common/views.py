import hashlib
import json
import logging
import uuid
from collections import Counter
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


_branding_logger = logging.getLogger(__name__)


def _resolve_institution_logo_url(raw_value, request):
    """Build the public URL for the institution logo.

    Resolution order:
      1. ``None`` / empty / whitespace → ``None``.
      2. Absolute URL (``http://`` / ``https://``) → returned unchanged so an
         operator can paste a Cloudinary or CDN URL directly.
      3. Relative path that exists on the local filesystem
         (``MEDIA_ROOT/<path>``) → local URL via ``BACKEND_BASE_URL`` /
         request host.
      4. Relative path with Cloudinary configured
         (``settings.USE_CLOUDINARY_MEDIA``) → URL produced by
         ``default_storage`` (Cloudinary).
      5. Otherwise → ``None`` (frontend falls back to bundled default).
    """
    if not raw_value or not str(raw_value).strip():
        return None

    raw = str(raw_value).strip()

    if raw.lower().startswith(("http://", "https://")):
        return raw

    relative_path = raw.lstrip("/")
    media_segment = settings.MEDIA_URL.strip("/")

    media_root = getattr(settings, "MEDIA_ROOT", None)
    if media_root is not None:
        try:
            local_file = Path(media_root) / relative_path
            if local_file.is_file():
                backend_base = getattr(settings, "BACKEND_BASE_URL", None)
                if backend_base:
                    return f"{backend_base.rstrip('/')}/{media_segment}/{relative_path}"
                if request is not None:
                    try:
                        return request.build_absolute_uri(
                            f"/{media_segment}/{relative_path}"
                        )
                    except Exception:
                        pass
        except (OSError, ValueError):
            pass

    if getattr(settings, "USE_CLOUDINARY_MEDIA", False):
        try:
            from django.core.files.storage import default_storage

            return default_storage.url(relative_path)
        except Exception:
            _branding_logger.warning(
                "Cloudinary URL build failed for institution_logo=%s",
                relative_path,
                exc_info=True,
            )

    return None

from django.core.cache import cache
from django.core.files.storage import default_storage
from rest_framework.parsers import MultiPartParser, FormParser
from .models import SecurityEvent, ActivityLog, SystemSettings
from .core.feature_flags import load_feature_flags, merge_and_save_feature_flags
from .core.utils import log_activity
from .http.permissions import IsStaffOrSuperUser, IsSuperUser
from .serializers import AcademicYearSerializer, FeatureFlagsPatchSerializer, InstitutionBrandingUpdateSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Public health check for load balancers and monitoring (single monolith process)."""
    return Response({
        'status': 'healthy',
        'service': 'ebotar-api',
        'message': 'E-Botar API is running',
    })


def parse_datetime_filter(value):
    """Parse ISO datetime string into aware datetime or return None."""
    if not value:
        return None
    dt = parse_datetime(value)
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def category_for_security_severity(level):
    """Map model severity levels to UI categories."""
    mapping = {
        'low': 'success',
        'medium': 'warning',
        'high': 'warning',
        'critical': 'error',
    }
    return mapping.get(level, 'info')


def category_for_activity_action(action):
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
        limit = self.clamped_list_limit(request.query_params.get('limit'))

        date_from = parse_datetime_filter(request.query_params.get('date_from'))
        date_to = parse_datetime_filter(request.query_params.get('date_to')) or timezone.now()

        if date_from is None:
            # Default window: last 30 days
            date_from = date_to - timedelta(days=30)

        security_logs = []
        activity_logs = []

        if log_type in ['all', 'security']:
            security_logs = self.security_log_rows_for_query(date_from, date_to, severity_filter, search, limit)

        if log_type in ['all', 'activity']:
            activity_logs = self.activity_log_rows_for_query(date_from, date_to, severity_filter, search, limit)

        combined = sorted(
            security_logs + activity_logs,
            key=lambda item: item['timestamp'],
            reverse=True
        )[:limit]

        summary = self.severity_summary_from_rows(combined)

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

    def clamped_list_limit(self, value):
        try:
            limit = int(value)
            if limit < 10:
                return 10
            if limit > self.MAX_LIMIT:
                return self.MAX_LIMIT
            return limit
        except (TypeError, ValueError):
            return self.DEFAULT_LIMIT

    def security_log_rows_for_query(self, date_from, date_to, severity_filter, search, limit):
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
            severity = category_for_security_severity(event.severity)
            logs.append({
                'id': f'sec_{event.id}',
                'source': 'security',
                'severity': severity,
                'event_type': event.event_type,
                'event_label': event.get_event_type_display(),
                'message': event.description,
                'user': self.display_name_for_log_user(event.user),
                'ip_address': event.ip_address,
                'timestamp': event.created_at,
            })
        return logs

    def activity_log_rows_for_query(self, date_from, date_to, severity_filter, search, limit):
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
            severity = category_for_activity_action(log.action)
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
                'user': self.display_name_for_log_user(log.user),
                'ip_address': log.ip_address,
                'timestamp': log.created_at,
            })
        return logs

    @staticmethod
    def display_name_for_log_user(user):
        if not user:
            return 'System'
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name or user.username

    @staticmethod
    def severity_summary_from_rows(logs):
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


def _build_branding_response(request):
    """Compile aggregated branding configuration dictionary with resolved media URLs."""
    raw_dict = SystemSettings.get_branding_dict()
    inst_name = raw_dict.get('institution_name', 'E-Botar')
    inst_line2 = raw_dict.get('institution_name_line2', '')
    logo_raw = raw_dict.get('institution_logo', '')
    favicon_raw = raw_dict.get('institution_favicon', '')
    seal_raw = raw_dict.get('institution_seal', '')

    logo_url = _resolve_institution_logo_url(logo_raw, request)
    favicon_url = _resolve_institution_logo_url(favicon_raw, request)
    seal_url = _resolve_institution_logo_url(seal_raw, request)

    return {
        'institution_name': inst_name,
        'institution_name_line2': inst_line2,
        'institution_full_name': f"{inst_name} {inst_line2}".strip(),
        'institution_acronym': raw_dict.get('institution_acronym', 'EB'),
        'app_name': raw_dict.get('app_name', 'E-Botar'),
        'tagline': raw_dict.get('tagline', 'Student Government Electronic Voting System'),
        'support_email': raw_dict.get('support_email', ''),
        'website_url': raw_dict.get('website_url', ''),
        'primary_color': raw_dict.get('primary_color', '#0b6e3b'),
        'secondary_color': raw_dict.get('secondary_color', '#f4cc5c'),
        'institution_logo': logo_raw,
        'institution_logo_url': logo_url,
        'institution_favicon': favicon_raw,
        'institution_favicon_url': favicon_url,
        'institution_seal': seal_raw,
        'institution_seal_url': seal_url,
        'is_custom_branded': str(raw_dict.get('is_custom_branded', 'false')).lower() in ('true', '1', 't'),
        'feature_flags': load_feature_flags(),
    }


class BrandingView(APIView):
    """
    Public and Administrative API for institution branding (logo, colors, name, tagline).
    GET: Public (cached with TTL).
    PATCH: Superuser only. Updates branding configuration and invalidates cache.
    """
    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), IsSuperUser()]
        return [AllowAny()]

    def get(self, request):
        cache_key = 'public_institution_branding'
        data = cache.get(cache_key)
        if not data:
            data = _build_branding_response(request)
            cache.set(cache_key, data, 300)
        else:
            # Keep runtime feature flags dynamically fresh
            data['feature_flags'] = load_feature_flags()
        return Response(data)

    def patch(self, request):
        serializer = InstitutionBrandingUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        for key, val in validated_data.items():
            if key == 'is_custom_branded':
                val = 'true' if val else 'false'
            SystemSettings.set_value(key, str(val), user=request.user)

        log_activity(
            user=request.user,
            action='UPDATE',
            resource_type='InstitutionBranding',
            description="Updated institutional branding settings and theme colors"
        )
        cache.delete('public_institution_branding')
        return Response(_build_branding_response(request), status=status.HTTP_200_OK)


def _compress_image_if_needed(file_obj, max_bytes=2 * 1024 * 1024, max_dimension=1600):
    """
    If file_obj size exceeds max_bytes, downscale dimensions and compress
    progressively so the resulting image stays strictly under 2MB.
    """
    ext = Path(file_obj.name).suffix.lower()
    if ext not in ('.jpg', '.jpeg', '.png', '.webp') or file_obj.size <= max_bytes:
        return file_obj

    try:
        from PIL import Image
        from io import BytesIO
        from django.core.files.uploadedfile import InMemoryUploadedFile

        img = Image.open(file_obj)

        # Scale down if very large dimension
        w, h = img.size
        if max(w, h) > max_dimension:
            scale = max_dimension / max(w, h)
            new_size = (int(w * scale), int(h * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        buffer = BytesIO()
        if ext in ('.jpg', '.jpeg'):
            if img.mode in ('RGBA', 'P', 'LA'):
                img = img.convert('RGB')
            quality = 85
            img.save(buffer, format='JPEG', quality=quality, optimize=True)
            while buffer.tell() > max_bytes and quality > 35:
                buffer.seek(0)
                buffer.truncate(0)
                quality -= 15
                img.save(buffer, format='JPEG', quality=quality, optimize=True)
        elif ext == '.webp':
            img.save(buffer, format='WEBP', quality=85, method=6)
        else:  # PNG
            img.save(buffer, format='PNG', optimize=True)
            if buffer.tell() > max_bytes:
                # If PNG remains above 2MB, compress using WebP or JPEG
                buffer.seek(0)
                buffer.truncate(0)
                if img.mode in ('RGBA', 'LA'):
                    img.save(buffer, format='WEBP', quality=80)
                else:
                    img = img.convert('RGB')
                    img.save(buffer, format='JPEG', quality=80, optimize=True)

        buffer.seek(0)
        compressed_size = buffer.getbuffer().nbytes
        return InMemoryUploadedFile(
            file=buffer,
            field_name='file',
            name=file_obj.name,
            content_type=file_obj.content_type,
            size=compressed_size,
            charset=None
        )
    except Exception as e:
        _branding_logger.warning("Image auto-compression failed, proceeding with original file: %s", e)
        file_obj.seek(0)
        return file_obj


def _get_uploaded_assets(request=None):
    """
    Retrieve tracked uploaded brand assets, auto-backfilling any legacy active logo
    if not already present in the asset library.
    """
    raw = SystemSettings.get_value('branding_uploaded_assets', default='[]')
    try:
        assets = json.loads(raw) if raw else []
        if not isinstance(assets, list):
            assets = []
    except Exception:
        assets = []

    active_logo_path = (SystemSettings.get_value('institution_logo', default='') or '').strip()

    # Backfill legacy active logo if set but not present in assets
    if active_logo_path:
        has_active = any(a.get('path') == active_logo_path for a in assets)
        if not has_active:
            backfill_entry = {
                'id': 'asset_legacy_active',
                'name': Path(active_logo_path).name or 'Uploaded Institution Logo',
                'path': active_logo_path,
                'file_hash': '',
                'size': 0,
                'asset_type': 'logo',
                'created_at': timezone.now().isoformat(),
            }
            assets.insert(0, backfill_entry)
            _save_uploaded_assets(assets)

    # Decorate with resolved URLs and is_active flag
    decorated = []
    for asset in assets:
        item = dict(asset)
        item['url'] = _resolve_institution_logo_url(item.get('path'), request)
        item['is_active'] = bool(active_logo_path and item.get('path') == active_logo_path)
        decorated.append(item)

    return decorated


def _save_uploaded_assets(assets, user=None):
    """Persist the JSON list of tracked branding assets."""
    clean_assets = []
    for a in assets:
        clean_assets.append({
            'id': a.get('id'),
            'name': a.get('name'),
            'path': a.get('path'),
            'file_hash': a.get('file_hash', ''),
            'size': a.get('size', 0),
            'asset_type': a.get('asset_type', 'logo'),
            'created_at': a.get('created_at', timezone.now().isoformat()),
        })
    SystemSettings.set_value(
        'branding_uploaded_assets',
        json.dumps(clean_assets),
        description='List of uploaded institutional brand assets in storage',
        user=user
    )


class BrandingAssetListView(APIView):
    """
    Superuser endpoint to list all available uploaded brand assets.
    GET /api/common/branding/assets/
    """
    permission_classes = [IsAuthenticated, IsSuperUser]

    def get(self, request):
        assets = _get_uploaded_assets(request)
        return Response({
            'assets': assets,
            'count': len(assets),
        }, status=status.HTTP_200_OK)


class BrandingAssetActivateView(APIView):
    """
    Superuser endpoint to set an existing uploaded logo as the active institution logo.
    POST /api/common/branding/assets/<str:asset_id>/activate/
    """
    permission_classes = [IsAuthenticated, IsSuperUser]

    def post(self, request, asset_id):
        assets = _get_uploaded_assets(request)
        target = next((a for a in assets if a.get('id') == asset_id), None)
        if not target:
            return Response({'detail': f"Asset '{asset_id}' was not found in the asset library."}, status=status.HTTP_404_NOT_FOUND)

        target_path = target.get('path', '')
        asset_type = target.get('asset_type', 'logo')

        if asset_type == 'logo':
            SystemSettings.set_value('institution_logo', target_path, user=request.user)
            SystemSettings.set_value('institution_favicon', target_path, user=request.user)
        else:
            setting_key = 'institution_favicon' if asset_type == 'favicon' else 'institution_seal'
            SystemSettings.set_value(setting_key, target_path, user=request.user)

        cache.delete('public_institution_branding')

        log_activity(
            user=request.user,
            action='UPDATE',
            resource_type='InstitutionBrandingAsset',
            description=f"Activated existing brand asset as active logo: {target_path}"
        )

        return Response({
            'message': f"Asset '{target.get('name')}' is now the active brand logo.",
            'active_asset': target,
            'branding': _build_branding_response(request),
        }, status=status.HTTP_200_OK)


class BrandingAssetDeleteView(APIView):
    """
    Superuser endpoint to permanently delete an uploaded brand asset from storage and library.
    DELETE /api/common/branding/assets/<str:asset_id>/
    If currently active, active branding smoothly reverts to default E-Botar logo.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]

    def delete(self, request, asset_id):
        assets = _get_uploaded_assets(request)
        target = next((a for a in assets if a.get('id') == asset_id), None)
        if not target:
            return Response({'detail': f"Asset '{asset_id}' was not found in the asset library."}, status=status.HTTP_404_NOT_FOUND)

        target_path = target.get('path', '')

        # 1. Attempt to delete from default_storage
        if target_path:
            try:
                if default_storage.exists(target_path):
                    default_storage.delete(target_path)
            except Exception as e:
                _branding_logger.warning("Could not delete branding asset file '%s': %s", target_path, e)

        # 2. Remove from tracked list
        remaining = [a for a in assets if a.get('id') != asset_id]
        _save_uploaded_assets(remaining, user=request.user)

        # 3. Check if active logo/favicon matches this asset
        active_logo = (SystemSettings.get_value('institution_logo', default='') or '').strip()
        reverted_to_default = False
        if active_logo and active_logo == target_path:
            SystemSettings.set_value('institution_logo', '', user=request.user)
            SystemSettings.set_value('institution_favicon', '', user=request.user)
            reverted_to_default = True

        cache.delete('public_institution_branding')

        log_activity(
            user=request.user,
            action='DELETE',
            resource_type='InstitutionBrandingAsset',
            description=f"Deleted brand asset: {target_path} (reverted={reverted_to_default})"
        )

        return Response({
            'message': f"Brand asset '{target.get('name')}' has been permanently deleted.",
            'deleted_id': asset_id,
            'reverted_to_default': reverted_to_default,
            'branding': _build_branding_response(request),
        }, status=status.HTTP_200_OK)


class BrandingAssetUploadView(APIView):
    """
    Superuser endpoint for uploading institutional brand assets (logo, favicon).
    If the image exceeds 2MB, it is automatically compressed.
    The primary institution logo also functions as the browser favicon.
    Avoids duplicates by checking file hash against existing library assets.
    POST /api/common/branding/upload-asset/
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico'}
    MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

    def post(self, request):
        file_obj = request.FILES.get('file')
        asset_type = request.data.get('asset_type', 'logo').lower().strip()

        if not file_obj:
            return Response({'detail': 'No file was provided in the upload.'}, status=status.HTTP_400_BAD_REQUEST)

        if asset_type not in ('logo', 'favicon', 'seal'):
            return Response({'detail': "Invalid asset_type. Must be 'logo' or 'favicon'."}, status=status.HTTP_400_BAD_REQUEST)

        ext = Path(file_obj.name).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return Response({'detail': f'Unsupported file extension {ext}. Allowed: {", ".join(sorted(self.ALLOWED_EXTENSIONS))}'}, status=status.HTTP_400_BAD_REQUEST)

        # Read file bytes for hash calculation before compression/saving
        original_bytes = file_obj.read()
        file_hash = hashlib.sha256(original_bytes).hexdigest()
        file_obj.seek(0)
        original_name = file_obj.name

        # Deduplication check: check if an asset with identical hash already exists
        existing_assets = _get_uploaded_assets(request)
        for existing in existing_assets:
            if existing.get('file_hash') and existing.get('file_hash') == file_hash:
                # Reactivate existing asset to avoid duplicate storage
                if asset_type == 'logo':
                    SystemSettings.set_value('institution_logo', existing['path'], user=request.user)
                    SystemSettings.set_value('institution_favicon', existing['path'], user=request.user)
                else:
                    setting_key = 'institution_favicon' if asset_type == 'favicon' else 'institution_seal'
                    SystemSettings.set_value(setting_key, existing['path'], user=request.user)

                cache.delete('public_institution_branding')
                log_activity(
                    user=request.user,
                    action='UPDATE',
                    resource_type='InstitutionBrandingAsset',
                    description=f"Reactivated existing brand asset to prevent duplicate upload: {existing['path']}"
                )
                return Response({
                    'asset_id': existing.get('id'),
                    'asset_type': existing.get('asset_type', asset_type),
                    'asset_path': existing['path'],
                    'asset_url': existing.get('url') or _resolve_institution_logo_url(existing['path'], request),
                    'is_duplicate': True,
                    'message': f"This logo is already in your library and has been set as active."
                }, status=status.HTTP_200_OK)

        # Automatically compress if image exceeds 2MB
        if file_obj.size > self.MAX_FILE_SIZE and ext in ('.jpg', '.jpeg', '.png', '.webp'):
            file_obj = _compress_image_if_needed(file_obj, max_bytes=self.MAX_FILE_SIZE)

        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        short_id = uuid.uuid4().hex[:6]
        asset_id = f"asset_{timestamp}_{short_id}"
        clean_name = f"branding_{asset_type}_{timestamp}_{short_id}{ext}"
        storage_path = f"branding/{clean_name}"

        saved_path = default_storage.save(storage_path, file_obj)
        asset_url = _resolve_institution_logo_url(saved_path, request)

        # Primary Logo also functions as the Favicon
        if asset_type == 'logo':
            SystemSettings.set_value('institution_logo', saved_path, user=request.user)
            SystemSettings.set_value('institution_favicon', saved_path, user=request.user)
        else:
            setting_key = 'institution_favicon' if asset_type == 'favicon' else 'institution_seal'
            SystemSettings.set_value(setting_key, saved_path, user=request.user)

        # Track in uploaded assets library
        new_asset = {
            'id': asset_id,
            'name': original_name or clean_name,
            'path': saved_path,
            'file_hash': file_hash,
            'size': getattr(file_obj, 'size', 0),
            'asset_type': asset_type,
            'created_at': timezone.now().isoformat(),
        }
        raw_assets = [a for a in existing_assets if a.get('path') != saved_path]
        raw_assets.insert(0, new_asset)
        _save_uploaded_assets(raw_assets, user=request.user)

        log_activity(
            user=request.user,
            action='UPLOAD',
            resource_type='InstitutionBrandingAsset',
            description=f"Uploaded brand asset for {asset_type}: {saved_path}"
        )
        cache.delete('public_institution_branding')

        return Response({
            'asset_id': asset_id,
            'asset_type': asset_type,
            'asset_path': saved_path,
            'asset_url': asset_url,
            'is_duplicate': False,
            'message': f"{asset_type.capitalize()} uploaded and synchronized successfully."
        }, status=status.HTTP_201_CREATED)



class BrandingResetView(APIView):
    """
    Superuser endpoint for restoring canonical E-Botar brand identity and default colors.
    POST /api/common/branding/reset-defaults/
    """
    permission_classes = [IsAuthenticated, IsSuperUser]

    def post(self, request):
        defaults = {
            'institution_name': 'E-Botar',
            'institution_name_line2': '',
            'institution_acronym': 'EB',
            'app_name': 'E-Botar',
            'tagline': 'Student Government Electronic Voting System',
            'support_email': '',
            'website_url': '',
            'primary_color': '#0b6e3b',
            'secondary_color': '#f4cc5c',
            'institution_logo': '',
            'institution_favicon': '',
            'institution_seal': '',
            'is_custom_branded': 'false',
        }
        for key, val in defaults.items():
            SystemSettings.set_value(key, str(val), user=request.user)

        log_activity(
            user=request.user,
            action='RESET',
            resource_type='InstitutionBranding',
            description="Reset institutional branding to canonical E-Botar defaults"
        )
        cache.delete('public_institution_branding')

        return Response({
            'branding': _build_branding_response(request),
            'message': 'Institutional branding successfully reset to default E-Botar identity.'
        }, status=status.HTTP_200_OK)



class FeatureFlagsMaintenanceView(APIView):
    """
    Superusers update temporary feature availability (persisted via SystemSettings JSON).

    GET returns current flags for the maintenance SPA (authenticated superuser).
    PATCH merges booleans onto stored flags.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]

    def get(self, request):
        return Response(load_feature_flags())

    def patch(self, request):
        serializer = FeatureFlagsPatchSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if not serializer.validated_data:
            return Response(load_feature_flags())

        merged_flags = merge_and_save_feature_flags(
            dict(serializer.validated_data),
            request.user,
        )
        return Response(merged_flags)


class VersionView(APIView):
    """Public API endpoint for backend/frontend version coordination."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'api_version': getattr(settings, 'API_VERSION', 'v1'),
            'backend_version': getattr(settings, 'BACKEND_VERSION', '1.1.0'),
            'min_frontend_version': getattr(settings, 'MIN_FRONTEND_VERSION', '1.1.0'),
        })

