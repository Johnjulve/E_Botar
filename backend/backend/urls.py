from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from apps.common.views import VersionView, health_check

# ---------------------------------------------------------------------------
# Versioned API Gateway (v1)
# ---------------------------------------------------------------------------
api_v1_patterns = [
    path('health/', health_check, name='api-health-v1'),
    path('version/', VersionView.as_view(), name='api-version-v1'),
    path('auth/', include('apps.accounts.urls')),
    path('elections/', include('apps.elections.urls')),
    path('candidates/', include('apps.candidates.urls')),
    path('voting/', include('apps.voting.urls')),
    path('common/', include('apps.common.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    # HTML guide for backend-only access
    path('guide/', TemplateView.as_view(template_name='guide.html'), name='api-guide'),
    # Canonical Versioned Gateway (v1)
    path('api/v1/', include(api_v1_patterns)),
    # Backward-compatible Gateway Alias
    path('api/', include(api_v1_patterns)),
    # DRF browsable API auth
    path('api-auth/', include('rest_framework.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
 