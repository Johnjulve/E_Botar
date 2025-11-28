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
    department_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Program
        fields = [
            'id', 'department', 'department_id', 'department_name',
            'name', 'code', 'program_type', 'description',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'department', 'department_name', 'program_type']
    
    def create(self, validated_data):
        """Override create to handle department_id"""
        department_id = validated_data.pop('department_id', None)
        validated_data['program_type'] = Program.ProgramType.COURSE
        program = Program.objects.create(**validated_data)
        if department_id:
            program.department_id = department_id
            program.save()
        return program
    
    def update(self, instance, validated_data):
        """Override update to handle department_id"""
        department_id = validated_data.pop('department_id', None)
        if department_id is not None:
            instance.department_id = department_id
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ProgramSerializer(serializers.ModelSerializer):
    """Full serializer for Program model with all fields"""
    department = serializers.IntegerField(source='department_id', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    department_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Program
        fields = [
            'id', 'name', 'code', 'program_type', 'description',
            'department', 'department_id', 'department_name',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'department', 'department_name']
    
    def validate(self, data):
        """Validate that courses have a department"""
        program_type = data.get('program_type', self.instance.program_type if self.instance else None)
        department_id = data.get('department_id')
        
        if program_type == Program.ProgramType.COURSE and not department_id:
            # If updating, check if instance has department
            if not self.instance or not self.instance.department_id:
                raise serializers.ValidationError({
                    'department_id': 'Courses must have a department assigned.'
                })
        return data
    
    def create(self, validated_data):
        """Override create to handle department_id"""
        department_id = validated_data.pop('department_id', None)
        program = Program.objects.create(**validated_data)
        if department_id:
            program.department_id = department_id
            program.save()
        return program
    
    def update(self, instance, validated_data):
        """Override update to handle department_id"""
        department_id = validated_data.pop('department_id', None)
        if department_id is not None:
            instance.department_id = department_id
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


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
    
    def to_representation(self, instance):
        """Hide sensitive fields from non-admin users"""
        representation = super().to_representation(instance)
        request = self.context.get('request')
        
        if request and request.user:
            # Users can always see their own is_staff and is_superuser fields
            # Admins can see all users' fields
            # Staff/students can only see their own fields
            if request.user.is_superuser:
                # Admin can see all fields for all users
                pass
            elif request.user.id == instance.id:
                # User viewing their own profile - can see their own fields
                pass
            else:
                # Non-admin viewing another user's profile - hide sensitive fields
                representation.pop('is_staff', None)
                representation.pop('is_superuser', None)
        else:
            # No request context - hide sensitive fields
            representation.pop('is_staff', None)
            representation.pop('is_superuser', None)
        
        return representation


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True, allow_null=True)
    course = CourseSerializer(read_only=True, allow_null=True)
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
    
    def validate(self, data):
        """Validate profile data - make academic fields optional for staff/admin"""
        request = self.context.get('request')
        user = request.user if request else None
        
        # Check if user is staff or admin
        is_admin_or_staff = user and (user.is_staff or user.is_superuser)
        
        # If not admin/staff, validate required academic fields
        if not is_admin_or_staff:
            # For regular users, these fields should be provided if profile is being created
            # But we'll allow them to be optional during updates
            if not self.instance:  # Creating new profile
                # These validations are handled at the model level or frontend
                pass
        
        return data
    
    def to_representation(self, instance):
        """Override to handle None values for department and course"""
        # Get base representation - DRF will handle nested serialization automatically
        ret = super().to_representation(instance)
        
        # Ensure None values are properly set (DRF should handle this with allow_null=True,
        # but we explicitly set it to be safe)
        if instance.department is None:
            ret['department'] = None
        if instance.course is None:
            ret['course'] = None
        
        return ret
    
    def get_avatar_url(self, obj):
        """Return full URL for avatar"""
        if obj.avatar:
            try:
                request = self.context.get('request')
                
                # Use BACKEND_BASE_URL if configured (for remote access)
                if hasattr(settings, 'BACKEND_BASE_URL') and settings.BACKEND_BASE_URL:
                    base_url = settings.BACKEND_BASE_URL.rstrip('/')
                    media_url = obj.avatar.url.lstrip('/')
                    return f"{base_url}/{media_url}"
                
                # Fallback to request.build_absolute_uri() if available
                if request:
                    try:
                        return request.build_absolute_uri(obj.avatar.url)
                    except Exception:
                        # If build_absolute_uri fails, try to construct manually
                        if hasattr(request, 'scheme') and hasattr(request, 'get_host'):
                            return f"{request.scheme}://{request.get_host()}{obj.avatar.url}"
                        return obj.avatar.url
                
                # Last resort: return relative URL
                return obj.avatar.url
            except Exception:
                # If anything fails, return None or relative URL
                return obj.avatar.url if obj.avatar else None
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
