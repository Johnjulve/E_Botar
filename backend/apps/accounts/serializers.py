from django.contrib.auth.models import User
from django.conf import settings
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserProfile, Program
from .utils import parse_year_level_value, staff_can_manage_student_profile
from apps.common.files.file_urls import absolute_file_url


def lookup_program_by_code(code, program_type, error_field):
    label = 'Department' if program_type == Program.ProgramType.DEPARTMENT else 'Course'
    try:
        return Program.objects.get(code=code, program_type=program_type)
    except Program.DoesNotExist:
        raise serializers.ValidationError({
            error_field: f'{label} with code "{code}" does not exist.',
        })


# -----------------------------------------------------------------------------
# Programs (registry)
# -----------------------------------------------------------------------------


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for department-type programs."""

    class Meta:
        model = Program
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for course-type programs."""
    department = serializers.CharField(source='department.code', read_only=True, allow_null=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    department_label = serializers.SerializerMethodField()
    department_code = serializers.CharField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Program
        fields = [
            'id', 'department', 'department_code', 'department_name', 'department_label',
            'name', 'code', 'program_type', 'description',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'department', 'department_name', 'department_label', 'program_type']

    def get_department_label(self, obj):
        """Human label: department name when linked, otherwise Unassigned."""
        return obj.department.name if obj.department else 'Unassigned'

    def create(self, validated_data):
        department_code = validated_data.pop('department_code', None)
        validated_data['program_type'] = Program.ProgramType.COURSE
        program = Program.objects.create(**validated_data)
        if department_code:
            program.department = lookup_program_by_code(
                department_code, Program.ProgramType.DEPARTMENT, 'department_code'
            )
            program.save()
        return program

    def update(self, instance, validated_data):
        department_code = validated_data.pop('department_code', None)
        if department_code is not None:
            instance.department = (
                lookup_program_by_code(
                    department_code, Program.ProgramType.DEPARTMENT, 'department_code'
                )
                if department_code
                else None
            )
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ProgramSerializer(serializers.ModelSerializer):
    """Full serializer for Program (departments and courses)."""
    department = serializers.CharField(source='department.code', read_only=True, allow_null=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    department_label = serializers.SerializerMethodField()
    department_code = serializers.CharField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Program
        fields = [
            'id', 'name', 'code', 'program_type', 'description',
            'department', 'department_code', 'department_name', 'department_label',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'department', 'department_name', 'department_label']

    def get_department_label(self, obj):
        """Courses: linked college name or Unassigned; departments: not applicable."""
        if obj.program_type != Program.ProgramType.COURSE:
            return None
        return obj.department.name if obj.department else 'Unassigned'

    def create(self, validated_data):
        department_code = validated_data.pop('department_code', None)
        program = Program.objects.create(**validated_data)
        if department_code:
            program.department = lookup_program_by_code(
                department_code, Program.ProgramType.DEPARTMENT, 'department_code'
            )
            program.save()
        return program

    def update(self, instance, validated_data):
        department_code = validated_data.pop('department_code', None)
        if department_code is not None:
            instance.department = (
                lookup_program_by_code(
                    department_code, Program.ProgramType.DEPARTMENT, 'department_code'
                )
                if department_code
                else None
            )
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# -----------------------------------------------------------------------------
# Users & profiles
# -----------------------------------------------------------------------------


class UserSerializer(serializers.ModelSerializer):
    """Serializer for Django User (role surfaced for API clients)."""
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_superuser', 'is_active', 'date_joined', 'role',
        ]
        read_only_fields = ['id', 'date_joined', 'role']

    def get_role(self, obj):
        if obj.is_superuser:
            return 'admin'
        if obj.is_staff:
            return 'staff'
        return 'student'

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')

        if request and request.user:
            if request.user.is_superuser or request.user.id == instance.id:
                return representation
        else:
            representation.pop('is_staff', None)
            representation.pop('is_superuser', None)
            return representation

        representation.pop('is_staff', None)
        representation.pop('is_superuser', None)
        return representation


class UserProfileSerializer(serializers.ModelSerializer):
    """UserProfile with nested user; write via department_code / course_code."""
    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True, allow_null=True)
    course = CourseSerializer(read_only=True, allow_null=True)
    avatar_url = serializers.SerializerMethodField()
    is_profile_complete = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()

    department_code = serializers.CharField(write_only=True, required=False, allow_null=True)
    course_code = serializers.CharField(write_only=True, required=False, allow_null=True)
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'middle_name', 'student_id',
            'department', 'department_code',
            'course', 'course_code',
            'year_level', 'section', 'avatar', 'avatar_url',
            'is_verified', 'must_change_password', 'is_profile_complete', 'missing_fields',
            'created_at', 'updated_at',
            'first_name', 'last_name',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'avatar_url', 'department', 'course',
            'is_verified', 'must_change_password', 'is_profile_complete', 'missing_fields',
        ]

    def get_is_profile_complete(self, obj):
        return obj.is_profile_complete()

    def get_missing_fields(self, obj):
        return obj.get_missing_fields()

    def validate(self, data):
        request = self.context.get('request')
        user = request.user if request else None
        is_admin_or_staff = user and (user.is_staff or user.is_superuser)

        if not is_admin_or_staff and not self.instance:
            pass

        if request and self.instance and user:
            editing_other = self.instance.user_id != user.id
            if editing_other and user.is_staff and not user.is_superuser:
                if not staff_can_manage_student_profile(user, self.instance):
                    raise serializers.ValidationError(
                        'You cannot edit this profile. Staff may only manage students '
                        'at or below their own year level.'
                    )
                try:
                    staff_prof = user.profile
                except UserProfile.DoesNotExist:
                    staff_prof = None
                staff_year = parse_year_level_value(getattr(staff_prof, 'year_level', None) if staff_prof else None)
                if 'year_level' in data and data['year_level'] is not None and staff_year is not None:
                    new_year = parse_year_level_value(data['year_level'])
                    if new_year is not None and new_year > staff_year:
                        raise serializers.ValidationError({
                            'year_level': 'Cannot set year level above your own.',
                        })

        return data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.department is None:
            ret['department'] = None
        if instance.course is None:
            ret['course'] = None
        return ret

    def get_avatar_url(self, obj):
        return absolute_file_url(obj.avatar, self.context.get('request'))

    def update(self, instance, validated_data):
        validated_data.pop('is_verified', None)

        if 'first_name' in validated_data or 'last_name' in validated_data:
            u = instance.user
            if 'first_name' in validated_data:
                u.first_name = validated_data.pop('first_name') or ''
            if 'last_name' in validated_data:
                u.last_name = validated_data.pop('last_name') or ''
            u.save()

        department_code = validated_data.pop('department_code', None)
        if department_code is not None:
            instance.department = (
                lookup_program_by_code(
                    department_code, Program.ProgramType.DEPARTMENT, 'department_code'
                )
                if department_code
                else None
            )
        course_code = validated_data.pop('course_code', None)
        if course_code is not None:
            instance.course = (
                lookup_program_by_code(course_code, Program.ProgramType.COURSE, 'course_code')
                if course_code
                else None
            )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class UserProfileListSerializer(serializers.ModelSerializer):
    """Lean profile rows for admin tables (list/directory/voting status)."""

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'middle_name',
            'student_id',
            'year_level',
            'section',
            'is_verified',
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        user = instance.user
        department = instance.department
        course = instance.course
        return {
            'id': instance.id,
            'middle_name': instance.middle_name or '',
            'student_id': instance.student_id or '',
            'year_level': instance.year_level or '',
            'section': instance.section or '',
            'is_verified': instance.is_verified,
            'must_change_password': instance.must_change_password,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email or '',
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'date_joined': user.date_joined,
            },
            'created_at': instance.created_at,
            'department': (
                {
                    'code': department.code,
                    'name': department.name,
                }
                if department
                else None
            ),
            'course': (
                {
                    'code': course.code,
                    'name': course.name,
                }
                if course
                else None
            ),
        }


class UserVotingStatusListSerializer(UserProfileListSerializer):
    """Profile list row plus per-election vote flag."""

    def to_representation(self, instance):
        row = super().to_representation(instance)
        row['has_voted'] = bool(getattr(instance, 'has_voted', False))
        return row


# -----------------------------------------------------------------------------
# Auth & registration
# -----------------------------------------------------------------------------


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT token with login by username or email."""
    username_field = 'username'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'] = serializers.CharField(required=False)
        self.fields['email'] = serializers.EmailField(required=False)

    def validate(self, attrs):
        username = attrs.get('username', '').strip()
        email = attrs.get('email', '').strip()

        if not username and not email:
            raise serializers.ValidationError({
                'username': 'Either username or email is required.',
                'email': 'Either username or email is required.',
            })

        lookup_email = email
        if not lookup_email and '@' in username:
            lookup_email = username

        if lookup_email:
            lookup_email_normalized = lookup_email.strip()
            matched_by_email_users = User.objects.filter(email__iexact=lookup_email_normalized)
            match_count = matched_by_email_users.count()
            if match_count == 0:
                raise serializers.ValidationError({
                    'username': 'No account found with this email address.',
                    'email': 'No account found with this email address.',
                })
            if match_count > 1:
                raise serializers.ValidationError({
                    'username': 'Multiple accounts found with this email. Please contact support.',
                    'email': 'Multiple accounts found with this email. Please contact support.',
                })
            username = matched_by_email_users.first().username

        if not username:
            raise serializers.ValidationError({
                'username': 'Invalid username or email.',
                'email': 'Invalid username or email.',
            })

        attrs['username'] = username
        attrs.pop('email', None)
        data = super().validate(attrs)
        profile = getattr(self.user, 'profile', None)
        data['must_change_password'] = bool(profile and profile.must_change_password)
        return data


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    middle_name = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'middle_name', 'last_name']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords must match."})
        return data

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        domain = normalized_email.split('@')[-1]
        allowed_domains_for_registration = settings.REGISTRATION_ALLOWED_EMAIL_DOMAINS
        if domain not in allowed_domains_for_registration:
            allowed = ', '.join(allowed_domains_for_registration)
            raise serializers.ValidationError(
                f"Email must be from an allowed domain. Allowed domains: {allowed}",
            )
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return normalized_email

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        middle_name = validated_data.pop('middle_name', '')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        UserProfile.objects.create(user=user, middle_name=middle_name or '')
        return user
