from rest_framework import serializers
from .models import Party, SchoolPosition, SchoolElection, ElectionPosition
from apps.voting.models import VoteReceipt


class PartySerializer(serializers.ModelSerializer):
    """Serializer for Party model"""
    class Meta:
        model = Party
        fields = ['id', 'name', 'description', 'logo', 'color', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class SchoolPositionSerializer(serializers.ModelSerializer):
    """Serializer for SchoolPosition model"""
    
    class Meta:
        model = SchoolPosition
        fields = [
            'id', 'name',
            'description', 'display_order', 'max_candidates', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ElectionPositionSerializer(serializers.ModelSerializer):
    """Serializer for ElectionPosition (through table)"""
    position = SchoolPositionSerializer(read_only=True)
    position_id = serializers.PrimaryKeyRelatedField(
        queryset=SchoolPosition.objects.all(), 
        source='position', 
        write_only=True
    )
    
    class Meta:
        model = ElectionPosition
        fields = ['id', 'position', 'position_id', 'order', 'is_enabled']


class SchoolElectionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for election listings"""
    status = serializers.SerializerMethodField()
    is_active_now = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()
    is_finished = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    total_votes = serializers.SerializerMethodField()
    
    class Meta:
        model = SchoolElection
        fields = [
            'id', 'title', 'start_year', 'end_year', 'description',
            'start_date', 'end_date', 'is_active', 'status', 
            'is_active_now', 'is_upcoming', 'is_finished',
            'created_by', 'created_by_name', 'total_votes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'title']
    
    def get_status(self, obj):
        """Return human-readable status"""
        if obj.is_active_now():
            return 'ongoing'
        elif obj.is_upcoming():
            return 'upcoming'
        elif obj.is_finished():
            return 'finished'
        return 'inactive'
    
    def get_is_active_now(self, obj):
        """Return boolean indicating if election is currently active"""
        return obj.is_active_now()
    
    def get_is_upcoming(self, obj):
        """Return boolean indicating if election is upcoming"""
        return obj.is_upcoming()
    
    def get_is_finished(self, obj):
        """Return boolean indicating if election has finished"""
        return obj.is_finished()
    
    def get_total_votes(self, obj):
        """Count of unique voters in this election"""
        return VoteReceipt.objects.filter(election=obj).count()


class SchoolElectionDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with positions included"""
    status = serializers.SerializerMethodField()
    is_active_now = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    election_positions = ElectionPositionSerializer(many=True, read_only=True)
    total_positions = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    
    class Meta:
        model = SchoolElection
        fields = [
            'id', 'title', 'start_year', 'end_year', 'description',
            'start_date', 'end_date', 'is_active', 'status', 'is_active_now',
            'created_by', 'created_by_name', 
            'election_positions', 'total_positions', 'total_votes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'title']
    
    def get_status(self, obj):
        """Return human-readable status"""
        if obj.is_active_now():
            return 'ongoing'
        elif obj.is_upcoming():
            return 'upcoming'
        elif obj.is_finished():
            return 'finished'
        return 'inactive'
    
    def get_is_active_now(self, obj):
        """Return boolean indicating if election is currently active"""
        return obj.is_active_now()
    
    def get_total_positions(self, obj):
        """Count of positions in this election"""
        return obj.election_positions.count()
    
    def get_total_votes(self, obj):
        """Count of unique voters in this election"""
        return VoteReceipt.objects.filter(election=obj).count()


class SchoolElectionCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating elections"""
    position_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of position IDs to associate with this election"
    )
    
    start_year = serializers.IntegerField(
        required=True,
        min_value=2000,
        max_value=2100,
        help_text="Start year for SY format (e.g., 2025 for SY 2025-2026)"
    )
    
    end_year = serializers.IntegerField(
        required=True,
        min_value=2000,
        max_value=2100,
        help_text="End year for SY format (e.g., 2026 for SY 2025-2026)"
    )
    
    class Meta:
        model = SchoolElection
        fields = [
            'id', 'title', 'start_year', 'end_year', 'description',
            'start_date', 'end_date', 'is_active', 'position_ids'
        ]
        read_only_fields = ['title']
    
    def validate(self, data):
        """Validate that end_year is exactly start_year + 1"""
        start_year = data.get('start_year')
        end_year = data.get('end_year')
        
        if start_year and end_year:
            if end_year != start_year + 1:
                raise serializers.ValidationError({
                    'end_year': f'End year must be {start_year + 1} (one year after start year)'
                })
        
        return data
    
    def create(self, validated_data):
        position_ids = validated_data.pop('position_ids', [])
        election = SchoolElection.objects.create(**validated_data)
        
        # Create ElectionPosition entries
        for idx, position_id in enumerate(position_ids):
            try:
                position = SchoolPosition.objects.get(id=position_id, is_active=True)
                ElectionPosition.objects.create(
                    election=election,
                    position=position,
                    order=idx
                )
            except SchoolPosition.DoesNotExist:
                pass
        
        return election
    
    def update(self, instance, validated_data):
        position_ids = validated_data.pop('position_ids', None)
        
        # Update election fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update positions if provided
        if position_ids is not None:
            # Remove existing positions
            instance.election_positions.all().delete()
            # Add new positions
            for idx, position_id in enumerate(position_ids):
                try:
                    position = SchoolPosition.objects.get(id=position_id, is_active=True)
                    ElectionPosition.objects.create(
                        election=instance,
                        position=position,
                        order=idx
                    )
                except SchoolPosition.DoesNotExist:
                    pass
        
        return instance

