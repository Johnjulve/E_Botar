from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # Accounts & Authentication API
    path("api/auth/", include("apps.accounts.urls")),
    # Elections API
    path("api/elections/", include("apps.elections.urls")),
    # Candidates API
    path("api/candidates/", include("apps.candidates.urls")),
    # Voting API
    path("api/voting/", include("apps.voting.urls")),
    # Common / system utilities API
    path("api/common/", include("apps.common.urls")),
    # DRF browsable API auth
    path("api-auth/", include("rest_framework.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
 