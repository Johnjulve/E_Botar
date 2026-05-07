from django.urls import path

from .views import (
    SystemLogListView,
    AcademicYearView,
    BrandingView,
    FeatureFlagsMaintenanceView,
    health_check,
)

urlpatterns = [
    path('health/', health_check, name='health'),
    path('system-logs/', SystemLogListView.as_view(), name='system-logs'),
    path('academic-year/', AcademicYearView.as_view(), name='academic-year'),
    path('branding/', BrandingView.as_view(), name='branding'),
    path('feature-flags/', FeatureFlagsMaintenanceView.as_view(), name='feature-flags'),
]

