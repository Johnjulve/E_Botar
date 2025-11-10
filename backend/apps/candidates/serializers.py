from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Candidate, CandidateApplication
from apps.elections.serializers import SchoolPositionSerializer, PartySerializer


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
    election_title = serializers.CharField(source='election.title', read_only=True)
    
    class Meta:
        model = Candidate
        fields = [
            'id', 'user', 'position', 'election', 'election_title',
            'party', 'manifesto', 'photo', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class CandidateDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for candidate view"""
    user = CandidateUserSerializer(read_only=True)
    position = SchoolPositionSerializer(read_only=True)
    party = PartySerializer(read_only=True)
    election_title = serializers.CharField(source='election.title', read_only=True)
    application_id = serializers.IntegerField(source='approved_application.id', read_only=True, allow_null=True)
    
    class Meta:
        model = Candidate
        fields = [
            'id', 'user', 'position', 'election', 'election_title',
            'party', 'manifesto', 'photo', 'is_active', 
            'approved_application', 'application_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'approved_application']


class CandidateApplicationListSerializer(serializers.ModelSerializer):
    """Serializer for application listings"""
    user = CandidateUserSerializer(read_only=True)
    position_name = serializers.CharField(source='position.name', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True, allow_null=True)
    election_title = serializers.CharField(source='election.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = CandidateApplication
        fields = [
            'id', 'user', 'position', 'position_name', 
            'election', 'election_title', 'party', 'party_name',
            'status', 'status_display', 'submitted_at'
        ]
        read_only_fields = ['submitted_at']


class CandidateApplicationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for application view"""
    user = CandidateUserSerializer(read_only=True)
    position = SchoolPositionSerializer(read_only=True)
    party = PartySerializer(read_only=True)
    election_title = serializers.CharField(source='election.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, allow_null=True)
    has_candidate = serializers.SerializerMethodField()
    
    class Meta:
        model = CandidateApplication
        fields = [
            'id', 'user', 'position', 'election', 'election_title',
            'party', 'manifesto', 'photo', 'supporting_documents',
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
        
        # Create temporary instance for validation
        temp_instance = CandidateApplication(user=user, **data)
        temp_instance.clean()
        
        return data
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CandidateApplicationReviewSerializer(serializers.Serializer):
    """Serializer for reviewing applications"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    review_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if data['action'] == 'reject' and not data.get('review_notes'):
            raise serializers.ValidationError({
                'review_notes': 'Review notes are required when rejecting an application.'
            })
        return data

