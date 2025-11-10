from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile, Department, Course


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model"""
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course model"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Course
        fields = ['id', 'department', 'department_name', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined', 'is_staff']


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    user = UserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'student_id', 'department', 'department_name', 
            'course', 'course_name', 'year_level',
            'avatar', 'is_verified', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student_id', 'created_at', 'updated_at']


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
