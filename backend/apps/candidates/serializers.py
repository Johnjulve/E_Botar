from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings
from django.core.exceptions import ValidationError
from .models import Candidate, CandidateApplication
from apps.elections.serializers import (
    SchoolPositionSerializer, 
    PartySerializer, 
    SchoolElectionListSerializer
)


class CandidateUserSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for candidate display"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = fields


class CandidateListSerializer(serializers.ModelSerializer):
    """Serializer for candidate listings"""
    user = CandidateUserSerializer(read_only=True)
    position = SchoolPositionSerializer(read_only=True)
    party = PartySerializer(read_only=True)
    election = SchoolElectionListSerializer(read_only=True)
    photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Candidate
        fields = [
            'id', 'user', 'position', 'election',
            'party', 'manifesto', 'photo', 'photo_url', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_photo_url(self, obj):
        """Return full URL for candidate photo"""
        if obj.photo:
            request = self.context.get('request')
            
            # Use BACKEND_BASE_URL if configured (for remote access)
            if hasattr(settings, 'BACKEND_BASE_URL') and settings.BACKEND_BASE_URL:
                base_url = settings.BACKEND_BASE_URL.rstrip('/')
                media_url = obj.photo.url.lstrip('/')
                return f"{base_url}/{media_url}"
            
            # Fallback to request.build_absolute_uri() if available
            if request:
                return request.build_absolute_uri(obj.photo.url)
            
            # Last resort: return relative URL
            return obj.photo.url
        return None


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
        """Return full URL for candidate photo"""
        if obj.photo:
            request = self.context.get('request')
            
            # Use BACKEND_BASE_URL if configured (for remote access)
            if hasattr(settings, 'BACKEND_BASE_URL') and settings.BACKEND_BASE_URL:
                base_url = settings.BACKEND_BASE_URL.rstrip('/')
                media_url = obj.photo.url.lstrip('/')
                return f"{base_url}/{media_url}"
            
            # Fallback to request.build_absolute_uri() if available
            if request:
                return request.build_absolute_uri(obj.photo.url)
            
            # Last resort: return relative URL
            return obj.photo.url
        return None


class CandidateApplicationListSerializer(serializers.ModelSerializer):
    """Serializer for application listings"""
    user = CandidateUserSerializer(read_only=True)
    position_name = serializers.CharField(source='position.name', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True, allow_null=True)
    election = SchoolElectionListSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = CandidateApplication
        fields = [
            'id', 'user', 'position', 'position_name', 
            'election', 'party', 'party_name',
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
        """Check if application has been converted to candidate"""
        return hasattr(obj, 'candidate') and obj.candidate is not None
    
    def get_photo_url(self, obj):
        """Return full URL for application photo"""
        if obj.photo:
            request = self.context.get('request')
            
            # Use BACKEND_BASE_URL if configured (for remote access)
            if hasattr(settings, 'BACKEND_BASE_URL') and settings.BACKEND_BASE_URL:
                base_url = settings.BACKEND_BASE_URL.rstrip('/')
                media_url = obj.photo.url.lstrip('/')
                return f"{base_url}/{media_url}"
            
            # Fallback to request.build_absolute_uri() if available
            if request:
                return request.build_absolute_uri(obj.photo.url)
            
            # Last resort: return relative URL
            return obj.photo.url
        return None


class CandidateApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating applications"""
    
    class Meta:
        model = CandidateApplication
        fields = [
            'position', 'election', 'party', 
            'manifesto', 'photo', 'supporting_documents'
        ]
    
    def validate(self, data):
        """Run model validation"""
        # Set user from request context
        user = self.context['request'].user
        election = data.get('election')
        
        # Check eligibility to apply (skip for staff/admin)
        if election and not (user.is_staff or user.is_superuser):
            if not election.is_user_eligible_to_apply(user):
                if election.election_type == 'department':
                    dept_name = election.allowed_department.name if election.allowed_department else 'selected department'
                    raise serializers.ValidationError({
                        'election': f'You are not eligible to apply for this election. This is a Department Election restricted to {dept_name} students only.'
                    })
                else:
                    raise serializers.ValidationError({
                        'election': 'You are not eligible to apply for this election.'
                    })
        
        # Check if user already has an active application for this election
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
        
        # Create temporary instance for validation
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
        # Require review_notes when rejecting (must be non-empty)
        if data['action'] == 'reject':
            review_notes = data.get('review_notes', '').strip() if data.get('review_notes') else ''
            if not review_notes:
                raise serializers.ValidationError({
                    'review_notes': 'Review notes are required when rejecting an application.'
                })
        return data

