from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from apps.accounts.models import UserProfile
from apps.common.files.file_urls import absolute_file_url

from .models import Candidate, CandidateApplication
from apps.elections.serializers import (
    SchoolPositionSerializer,
    SchoolPositionMinimalSerializer,
    PartySerializer,
    PartyMinimalSerializer,
    SchoolElectionListSerializer,
    SchoolElectionMinimalSerializer,
)


def absolute_url_for_uploaded_file(file_field, request):
    """Backward-compatible alias for the shared ``absolute_file_url`` helper.

    The shared helper correctly returns Cloudinary's already-absolute URLs
    verbatim instead of re-prefixing them with ``BACKEND_BASE_URL``.
    """
    return absolute_file_url(file_field, request)


class CandidateUserSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for candidate display"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    course_code = serializers.SerializerMethodField()
    year_level = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'course_code', 'year_level']
        read_only_fields = fields

    def get_course_code(self, obj):
        try:
            profile = obj.profile
        except UserProfile.DoesNotExist:
            return None
        if profile.course:
            return profile.course.code
        return None

    def get_year_level(self, obj):
        try:
            profile = obj.profile
        except UserProfile.DoesNotExist:
            return None
        return profile.year_level


class CandidateUserListSerializer(serializers.ModelSerializer):
    """Minimal user fields for list endpoints (candidates + applications)."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'full_name', 'email']
        read_only_fields = fields


class CandidateListSerializer(serializers.ModelSerializer):
    """Serializer for candidate listings"""
    user = CandidateUserListSerializer(read_only=True)
    position = SchoolPositionMinimalSerializer(read_only=True)
    party = PartyMinimalSerializer(read_only=True)
    election = SchoolElectionMinimalSerializer(read_only=True)
    manifesto = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            'id', 'user', 'position', 'election',
            'party', 'manifesto', 'photo', 'photo_url', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_manifesto(self, obj):
        if not obj.manifesto:
            return None
        text = obj.manifesto.strip()
        if len(text) <= 320:
            return text
        return text[:320] + '...'

    def get_photo_url(self, obj):
        return absolute_url_for_uploaded_file(obj.photo, self.context.get('request'))


class CandidateCompactSerializer(serializers.ModelSerializer):
    """Compact candidate payload for lightweight dashboard/home lists."""
    user = CandidateUserListSerializer(read_only=True)
    position = SchoolPositionMinimalSerializer(read_only=True)
    party = PartyMinimalSerializer(read_only=True)

    class Meta:
        model = Candidate
        fields = ['id', 'user', 'position', 'party']


class CandidateDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for candidate view"""
    user = CandidateUserSerializer(read_only=True)
    position = SchoolPositionSerializer(read_only=True)
    party = PartySerializer(read_only=True)
    election = SchoolElectionListSerializer(read_only=True)
    application_id = serializers.IntegerField(source='approved_application.id', read_only=True, allow_null=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            'id', 'user', 'position', 'election',
            'party', 'manifesto', 'photo', 'photo_url', 'is_active',
            'approved_application', 'application_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'approved_application']

    def get_photo_url(self, obj):
        return absolute_url_for_uploaded_file(obj.photo, self.context.get('request'))


class CandidateApplicationListSerializer(serializers.ModelSerializer):
    """Serializer for application listings"""
    user = CandidateUserListSerializer(read_only=True)
    position = SchoolPositionMinimalSerializer(read_only=True)
    party = PartyMinimalSerializer(read_only=True, allow_null=True)
    election = SchoolElectionMinimalSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CandidateApplication
        fields = [
            'id', 'user', 'position',
            'election', 'party',
            'status', 'status_display', 'submitted_at'
        ]
        read_only_fields = ['submitted_at']


class CandidateApplicationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for application view"""
    user = CandidateUserSerializer(read_only=True)
    position = SchoolPositionSerializer(read_only=True)
    party = PartySerializer(read_only=True)
    election = SchoolElectionListSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, allow_null=True)
    has_candidate = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = CandidateApplication
        fields = [
            'id', 'user', 'position', 'election',
            'party', 'manifesto', 'photo', 'photo_url', 'supporting_documents',
            'status', 'status_display', 'submitted_at',
            'reviewed_at', 'reviewed_by', 'reviewed_by_name',
            'review_notes', 'has_candidate'
        ]
        read_only_fields = [
            'submitted_at', 'reviewed_at', 'reviewed_by',
            'reviewed_by_name', 'has_candidate'
        ]

    def get_has_candidate(self, obj):
        return hasattr(obj, 'candidate') and obj.candidate is not None

    def get_photo_url(self, obj):
        return absolute_url_for_uploaded_file(obj.photo, self.context.get('request'))


class CandidateApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating applications"""

    class Meta:
        model = CandidateApplication
        fields = [
            'position', 'election', 'party',
            'manifesto', 'photo', 'supporting_documents'
        ]

    def validate(self, data):
        user = self.context['request'].user
        election = data.get('election')

        if not (user.is_staff or user.is_superuser):
            try:
                profile = user.profile
            except UserProfile.DoesNotExist:
                raise serializers.ValidationError({
                    'non_field_errors': 'Profile not found. Please complete your profile before applying as a candidate.'
                })
            if not profile.is_profile_complete():
                missing_fields = profile.get_missing_fields()
                missing_list = ', '.join(missing_fields)
                raise serializers.ValidationError({
                    'non_field_errors': f'Your profile is incomplete. Please complete your profile with the following information before applying: {missing_list}. You can update your profile in the Profile section.'
                })

        if election and not (user.is_staff or user.is_superuser):
            if not election.is_user_eligible_to_apply(user):
                if election.election_type == 'department':
                    dept_name = election.allowed_department.name if election.allowed_department else 'selected department'
                    raise serializers.ValidationError({
                        'election': f'You are not eligible to apply for this election. This is a Department Election restricted to {dept_name} students only.'
                    })
                raise serializers.ValidationError({
                    'election': 'You are not eligible to apply for this election.'
                })

        if election:
            existing_application = CandidateApplication.objects.filter(
                user=user,
                election=election,
                status__in=['pending', 'approved']
            ).first()

            if existing_application:
                raise serializers.ValidationError({
                    'election': f'You already have a {existing_application.get_status_display().lower()} application '
                               f'for {existing_application.position.name} in this election. '
                               f'Please withdraw your existing application first if you want to apply for a different position.'
                })

        temp_instance = CandidateApplication(user=user, **data)
        try:
            temp_instance.clean()
        except ValidationError as e:
            raise serializers.ValidationError({'non_field_errors': e.messages})

        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CandidateApplicationReviewSerializer(serializers.Serializer):
    """Serializer for reviewing applications"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    review_notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, data):
        if data['action'] == 'reject':
            review_notes = data.get('review_notes', '').strip() if data.get('review_notes') else ''
            if not review_notes:
                raise serializers.ValidationError({
                    'review_notes': 'Review notes are required when rejecting an application.'
                })
        return data
