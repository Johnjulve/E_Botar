from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

app_name = 'accounts'

router = DefaultRouter()
router.register(r'profiles', views.UserProfileViewSet, basename='profile')
router.register(r'departments', views.DepartmentViewSet, basename='department')
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'programs', views.ProgramViewSet, basename='program')

urlpatterns = [
    # Health check
    path('health/', views.health_check, name='health'),
    
    # Current user
    path('me/', views.current_user, name='current-user'),
    
    # Registration
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    
    # JWT Token endpoints
    path('token/', TokenObtainPairView.as_view(), name='token-obtain'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # ViewSet routes
    path('', include(router.urls)),
]

