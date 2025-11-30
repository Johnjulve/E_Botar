from django.urls import path

from .views import SystemLogListView

urlpatterns = [
    path('system-logs/', SystemLogListView.as_view(), name='system-logs'),
]

