from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'candidates'

router = DefaultRouter()
router.register(r'candidates', views.CandidateViewSet, basename='candidate')
router.register(r'applications', views.CandidateApplicationViewSet, basename='application')

urlpatterns = [
    # Health check
    path('health/', views.health_check, name='health'),
    
    # ViewSet routes
    path('', include(router.urls)),
]

