from django.contrib.auth.models import User
from django.conf import settings
from rest_framework import serializers
from .models import UserProfile, Program


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for department-type programs"""
    class Meta:
        model = Program
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for course-type programs"""
    department = serializers.IntegerField(source='department_id', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Program
        fields = [
            'id', 'department', 'department_name',
            'name', 'code', 'description',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'department', 'department_name']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    role = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'is_active', 'date_joined', 'role']
        read_only_fields = ['id', 'date_joined', 'role']
    
    def get_role(self, obj):
        """Determine user role based on is_staff and is_superuser"""
        if obj.is_superuser:
            return 'admin'
        elif obj.is_staff:
            return 'staff'
        else:
            return 'student'


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    
    # Write-only fields for updates
    department_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    course_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'student_id', 
            'department', 'department_id',
            'course', 'course_id',
            'year_level', 'avatar', 'avatar_url', 
            'is_verified', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'avatar_url', 'department', 'course']
    
    def get_avatar_url(self, obj):
        """Return full URL for avatar"""
        if obj.avatar:
            request = self.context.get('request')
            
            # Use BACKEND_BASE_URL if configured (for remote access)
            if hasattr(settings, 'BACKEND_BASE_URL') and settings.BACKEND_BASE_URL:
                base_url = settings.BACKEND_BASE_URL.rstrip('/')
                media_url = obj.avatar.url.lstrip('/')
                return f"{base_url}/{media_url}"
            
            # Fallback to request.build_absolute_uri() if available
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            
            # Last resort: return relative URL
            return obj.avatar.url
        return None
    
    def update(self, instance, validated_data):
        """Override update to handle department_id and course_id"""
        # Handle department_id -> department
        department_id = validated_data.pop('department_id', None)
        if department_id is not None:
            instance.department_id = department_id
        
        # Handle course_id -> course
        course_id = validated_data.pop('course_id', None)
        if course_id is not None:
            instance.course_id = course_id
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords must match."})
        return data
    
    def validate_email(self, value):
        """Validate email domain"""
        allowed_domains = ['snsu.edu.ph', 'ssct.edu.ph']  # Add your allowed domains
        email_domain = value.split('@')[-1].lower()
        
        if email_domain not in allowed_domains:
            raise serializers.ValidationError(
                f"Email must be from an allowed domain. Allowed domains: {', '.join(allowed_domains)}"
            )
        return value

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        # Create associated UserProfile
        UserProfile.objects.create(user=user)
        return user
