from django.urls import path

from .views import SystemLogListView, AcademicYearView, BrandingView

urlpatterns = [
    path('system-logs/', SystemLogListView.as_view(), name='system-logs'),
    path('academic-year/', AcademicYearView.as_view(), name='academic-year'),
    path('branding/', BrandingView.as_view(), name='branding'),
]

