from rest_framework import serializers
from django.contrib.auth.models import User
from .models import VoteReceipt, AnonVote, Ballot, VoteChoice
from apps.candidates.serializers import CandidateListSerializer
from apps.elections.serializers import SchoolPositionSerializer


class VoteReceiptSerializer(serializers.ModelSerializer):
    """Serializer for vote receipts"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    election_title = serializers.CharField(source='election.title', read_only=True)
    masked_receipt = serializers.CharField(source='get_masked_receipt', read_only=True)
    
    class Meta:
        model = VoteReceipt
        fields = [
            'id', 'user', 'user_name', 'election', 'election_title',
            'receipt_code', 'masked_receipt', 'created_at'
        ]
        read_only_fields = ['id', 'receipt_code', 'created_at']
        extra_kwargs = {
            'receipt_code': {'write_only': True}  # Don't expose full code in API
        }


class VoteReceiptVerifySerializer(serializers.Serializer):
    """Serializer for verifying a vote receipt"""
    receipt_code = serializers.CharField(max_length=64)
    
    def validate_receipt_code(self, value):
        """Validate receipt code format"""
        if len(value) < 32:
            raise serializers.ValidationError("Invalid receipt code format")
        return value


class VoteChoiceSerializer(serializers.ModelSerializer):
    """Serializer for individual vote choices"""
    position_name = serializers.CharField(source='position.name', read_only=True)
    candidate_name = serializers.CharField(source='candidate.user.get_full_name', read_only=True)
    
    class Meta:
        model = VoteChoice
        fields = ['id', 'position', 'position_name', 'candidate', 'candidate_name', 'created_at']
        read_only_fields = ['id', 'created_at']


class BallotSerializer(serializers.ModelSerializer):
    """Serializer for ballots"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    election_title = serializers.CharField(source='election.title', read_only=True)
    choices = VoteChoiceSerializer(many=True, read_only=True)
    receipt_code = serializers.CharField(source='receipt.receipt_code', read_only=True)
    
    class Meta:
        model = Ballot
        fields = [
            'id', 'user', 'user_name', 'election', 'election_title',
            'receipt', 'receipt_code', 'choices', 'submitted_at'
        ]
        read_only_fields = ['id', 'receipt', 'submitted_at']


class BallotSubmissionSerializer(serializers.Serializer):
    """Serializer for submitting a ballot"""
    election_id = serializers.IntegerField()
    votes = serializers.ListField(
        child=serializers.DictField(
            child=serializers.IntegerField()
        ),
        help_text="List of vote dictionaries with 'position_id' and 'candidate_id'"
    )
    
    def validate_votes(self, value):
        """Validate vote structure"""
        for vote in value:
            if 'position_id' not in vote or 'candidate_id' not in vote:
                raise serializers.ValidationError(
                    "Each vote must contain 'position_id' and 'candidate_id'"
                )
        return value
    
    def validate(self, data):
        """Validate entire ballot submission"""
        from apps.elections.models import SchoolElection
        
        # Check if election exists and is active
        try:
            election = SchoolElection.objects.get(id=data['election_id'])
        except SchoolElection.DoesNotExist:
            raise serializers.ValidationError({'election_id': 'Election not found'})
        
        if not election.is_active_now():
            raise serializers.ValidationError({'election_id': 'This election is not currently active'})
        
        # Check if user has already voted
        user = self.context['request'].user
        if Ballot.objects.filter(user=user, election=election).exists():
            raise serializers.ValidationError('You have already submitted a ballot for this election')
        
        data['election'] = election
        return data


class AnonVoteSerializer(serializers.ModelSerializer):
    """Serializer for anonymous votes (for results/analytics)"""
    candidate = CandidateListSerializer(read_only=True)
    position = SchoolPositionSerializer(read_only=True)
    election_title = serializers.CharField(source='election.title', read_only=True)
    
    class Meta:
        model = AnonVote
        fields = [
            'id', 'election', 'election_title', 'position', 
            'candidate', 'created_at'
        ]
        read_only_fields = fields


class VoteStatisticsSerializer(serializers.Serializer):
    """Serializer for vote statistics"""
    election_id = serializers.IntegerField()
    election_title = serializers.CharField()
    total_votes = serializers.IntegerField()
    total_voters = serializers.IntegerField()
    positions = serializers.ListField(
        child=serializers.DictField()
    )


class PositionResultSerializer(serializers.Serializer):
    """Serializer for position-specific results"""
    position_id = serializers.IntegerField()
    position_name = serializers.CharField()
    total_votes = serializers.IntegerField()
    candidates = serializers.ListField(
        child=serializers.DictField()
    )


class MyVoteStatusSerializer(serializers.Serializer):
    """Serializer for checking user's vote status"""
    election_id = serializers.IntegerField()
    election_title = serializers.CharField()
    has_voted = serializers.BooleanField()
    voted_at = serializers.DateTimeField(allow_null=True)
    receipt_code = serializers.CharField(allow_null=True)

