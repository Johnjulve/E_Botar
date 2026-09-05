from django.urls import path

from .views import (
    SystemLogListView,
    AcademicYearView,
    BrandingView,
    BrandingAssetUploadView,
    BrandingAssetListView,
    BrandingAssetActivateView,
    BrandingAssetDeleteView,
    BrandingResetView,
    FeatureFlagsMaintenanceView,
    health_check,
)

urlpatterns = [
    path('health/', health_check, name='health'),
    path('system-logs/', SystemLogListView.as_view(), name='system-logs'),
    path('academic-year/', AcademicYearView.as_view(), name='academic-year'),
    path('branding/', BrandingView.as_view(), name='branding'),
    path('branding/upload-asset/', BrandingAssetUploadView.as_view(), name='branding-upload-asset'),
    path('branding/assets/', BrandingAssetListView.as_view(), name='branding-assets-list'),
    path('branding/assets/<str:asset_id>/activate/', BrandingAssetActivateView.as_view(), name='branding-asset-activate'),
    path('branding/assets/<str:asset_id>/', BrandingAssetDeleteView.as_view(), name='branding-asset-delete'),
    path('branding/reset-defaults/', BrandingResetView.as_view(), name='branding-reset-defaults'),
    path('feature-flags/', FeatureFlagsMaintenanceView.as_view(), name='feature-flags'),
]


