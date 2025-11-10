from rest_framework import serializers
from .models import Party, SchoolPosition, SchoolElection, ElectionPosition


class PartySerializer(serializers.ModelSerializer):
    """Serializer for Party model"""
    class Meta:
        model = Party
        fields = ['id', 'name', 'description', 'logo', 'color', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class SchoolPositionSerializer(serializers.ModelSerializer):
    """Serializer for SchoolPosition model"""
    position_type_display = serializers.CharField(source='get_position_type_display', read_only=True)
    
    class Meta:
        model = SchoolPosition
        fields = [
            'id', 'name', 'position_type', 'position_type_display', 
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
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = SchoolElection
        fields = [
            'id', 'title', 'start_year', 'end_year', 'description',
            'start_date', 'end_date', 'is_active', 'status',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
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


class SchoolElectionDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with positions included"""
    status = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    election_positions = ElectionPositionSerializer(many=True, read_only=True)
    total_positions = serializers.SerializerMethodField()
    
    class Meta:
        model = SchoolElection
        fields = [
            'id', 'title', 'start_year', 'end_year', 'description',
            'start_date', 'end_date', 'is_active', 'status',
            'created_by', 'created_by_name', 
            'election_positions', 'total_positions',
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
    
    def get_total_positions(self, obj):
        """Count of positions in this election"""
        return obj.election_positions.count()


class SchoolElectionCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating elections"""
    position_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of position IDs to associate with this election"
    )
    
    class Meta:
        model = SchoolElection
        fields = [
            'id', 'title', 'start_year', 'end_year', 'description',
            'start_date', 'end_date', 'is_active', 'position_ids'
        ]
        read_only_fields = ['title']
    
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

