from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'elections'

router = DefaultRouter()
router.register(r'parties', views.PartyViewSet, basename='party')
router.register(r'positions', views.SchoolPositionViewSet, basename='position')
router.register(r'elections', views.SchoolElectionViewSet, basename='election')

urlpatterns = [
    # Health check
    path('health/', views.health_check, name='health'),
    
    # ViewSet routes
    path('', include(router.urls)),
]

