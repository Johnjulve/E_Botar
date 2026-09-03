from rest_framework import serializers
from django.contrib.auth.models import User
from .models import VoteReceipt, AnonVote, Ballot, VoteChoice
from apps.candidates.serializers import CandidateListSerializer
from apps.elections.serializers import (
    SchoolPositionMinimalSerializer,
    SchoolElectionMinimalSerializer,
)
from apps.accounts.models import UserProfile
from apps.accounts.serializers import UserProfileSerializer


class VoteReceiptSerializer(serializers.ModelSerializer):
    """List/detail serializer for vote receipts (masked code only).

    Full ``receipt_code`` is returned only once at ballot submit and via the
    audited staff ``reveal_receipt`` action — not on list/retrieve.
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    election = SchoolElectionMinimalSerializer(read_only=True)
    masked_receipt_code = serializers.CharField(source='get_masked_receipt', read_only=True)

    class Meta:
        model = VoteReceipt
        fields = [
            'id', 'user', 'user_name', 'election',
            'masked_receipt_code', 'created_at',
        ]
        read_only_fields = fields


class VoteReceiptVerifySerializer(serializers.Serializer):
    """Serializer for verifying a vote receipt"""
    receipt_code = serializers.CharField(max_length=64)
    
    def validate_receipt_code(self, value):
        """Validate receipt code format"""
        normalized_code = VoteReceipt.normalize_receipt_code(value)
        if len(normalized_code) < VoteReceipt.RECEIPT_RAW_LENGTH:
            raise serializers.ValidationError("Invalid receipt code format")
        return value.strip()


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
        
        user = self.context['request'].user
        
        # Check profile completeness (skip for staff/admin)
        if not (user.is_staff or user.is_superuser):
            try:
                profile = user.profile
            except UserProfile.DoesNotExist:
                raise serializers.ValidationError({
                    'non_field_errors': 'Profile not found. Please complete your profile before voting.'
                })
            if not profile.is_profile_complete():
                missing_fields = profile.get_missing_fields()
                missing_list = ', '.join(missing_fields)
                raise serializers.ValidationError({
                    'non_field_errors': f'Your profile is incomplete. Please complete your profile with the following information before voting: {missing_list}. You can update your profile in the Profile section.'
                })
        
        if getattr(election, 'is_paused', False):
            raise serializers.ValidationError({
                'election_id': 'Voting is temporarily paused for this election. Please try again later.'
            })

        if not election.is_active_now() and not user.is_staff:
            raise serializers.ValidationError({'election_id': 'This election is not currently active'})
        
        # Check eligibility (skip for staff/admin)
        if not user.is_staff and not election.is_user_eligible(user):
            if election.election_type == 'department':
                dept_name = election.allowed_department.name if election.allowed_department else 'selected department'
                raise serializers.ValidationError({
                    'election_id': f'You are not eligible to vote in this election. This is a Department Election restricted to {dept_name} students only.'
                })
            else:
                raise serializers.ValidationError({
                    'election_id': 'You are not eligible to vote in this election.'
                })
        
        # Check if user has already voted
        if Ballot.objects.filter(user=user, election=election).exists():
            raise serializers.ValidationError('You have already submitted a ballot for this election')
        
        data['election'] = election
        return data


class AnonVoteSerializer(serializers.ModelSerializer):
    """Serializer for anonymous votes (for results/analytics)"""
    candidate = CandidateListSerializer(read_only=True)
    position = SchoolPositionMinimalSerializer(read_only=True)
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


class VoteReceiptAuditSerializer(serializers.ModelSerializer):
    """Admin/staff serializer for receipt audit table."""
    election_title = serializers.CharField(source='election.title', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    student_id = serializers.SerializerMethodField()
    masked_receipt_code = serializers.CharField(source='get_masked_receipt', read_only=True)
    full_receipt_code = serializers.CharField(source='receipt_code', read_only=True)
    has_ballot = serializers.SerializerMethodField()
    vote_status = serializers.SerializerMethodField()
    block_hash = serializers.SerializerMethodField()
    previous_hash = serializers.SerializerMethodField()

    class Meta:
        model = VoteReceipt
        fields = [
            'id',
            'election',
            'election_title',
            'user',
            'user_username',
            'user_full_name',
            'student_id',
            'masked_receipt_code',
            'full_receipt_code',
            'receipt_hash',
            'created_at',
            'has_ballot',
            'vote_status',
            'block_hash',
            'previous_hash',
        ]
        read_only_fields = fields

    def get_student_id(self, obj):
        profile = getattr(obj.user, 'profile', None)
        return getattr(profile, 'student_id', None)

    def get_has_ballot(self, obj):
        return getattr(obj, 'ballot', None) is not None

    def get_vote_status(self, obj):
        if not self.get_has_ballot(obj):
            return 'missing_ballot'
        if obj.receipt_hash and obj.receipt_code and obj.verify_receipt(obj.receipt_code):
            return 'verified'
        return 'hash_mismatch'

    def _ballot_blocks(self, obj):
        if hasattr(obj, '_cached_ballot_blocks'):
            return obj._cached_ballot_blocks

        ballot = getattr(obj, 'ballot', None)
        if ballot is None:
            obj._cached_ballot_blocks = (None, None)
            return obj._cached_ballot_blocks

        blocks = []
        if hasattr(ballot, '_prefetched_objects_cache') and 'choices' in ballot._prefetched_objects_cache:
            for choice in ballot.choices.all():
                if hasattr(choice, '_prefetched_objects_cache') and 'vote_blocks' in choice._prefetched_objects_cache:
                    blocks.extend(choice.vote_blocks.all())
                else:
                    blocks.extend(list(choice.vote_blocks.all()))
        else:
            from apps.voting.models import VoteBlock
            blocks = list(VoteBlock.objects.filter(vote_choice__ballot=ballot).order_by('block_index'))

        if not blocks:
            obj._cached_ballot_blocks = (None, None)
            return obj._cached_ballot_blocks

        blocks.sort(key=lambda b: b.block_index)
        obj._cached_ballot_blocks = (blocks[0], blocks[-1])
        return obj._cached_ballot_blocks

    def get_block_hash(self, obj):
        _first_block, last_block = self._ballot_blocks(obj)
        return last_block.current_hash if last_block else None

    def get_previous_hash(self, obj):
        first_block, _last_block = self._ballot_blocks(obj)
        return first_block.previous_hash if first_block else None


