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
    created_by_name = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    allowed_department_name = serializers.CharField(source='allowed_department.name', read_only=True, allow_null=True)
    allowed_department_code = serializers.CharField(source='allowed_department.code', read_only=True, allow_null=True)
    
    class Meta:
        model = SchoolElection
        fields = [
            'id', 'title', 'election_type', 'allowed_department', 
            'allowed_department_name', 'allowed_department_code',
            'start_year', 'end_year', 'description',
            'start_date', 'end_date', 'is_active', 'status', 
            'is_active_now', 'is_upcoming', 'is_finished',
            'created_by', 'created_by_name', 'total_votes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'title']
    
    def get_status(self, obj):
        """Return human-readable status"""
        if obj is None:
            return 'inactive'
        try:
            if obj.is_active_now():
                return 'ongoing'
            elif obj.is_upcoming():
                return 'upcoming'
            elif obj.is_finished():
                return 'finished'
        except Exception:
            pass
        return 'inactive'
    
    def get_is_active_now(self, obj):
        """Return boolean indicating if election is currently active"""
        if obj is None:
            return False
        try:
            return obj.is_active_now()
        except Exception:
            return False
    
    def get_is_upcoming(self, obj):
        """Return boolean indicating if election is upcoming"""
        if obj is None:
            return False
        try:
            return obj.is_upcoming()
        except Exception:
            return False
    
    def get_is_finished(self, obj):
        """Return boolean indicating if election has finished"""
        if obj is None:
            return False
        try:
            return obj.is_finished()
        except Exception:
            return False
    
    def get_created_by_name(self, obj):
        """Get created by full name safely"""
        if obj is None or obj.created_by is None:
            return None
        try:
            return obj.created_by.get_full_name() or obj.created_by.username
        except Exception:
            return None
    
    def get_total_votes(self, obj):
        """Count of unique voters in this election"""
        if obj is None:
            return 0
        try:
            # Safely count votes, return 0 if election doesn't exist or has no votes
            return VoteReceipt.objects.filter(election=obj).count() if (hasattr(obj, 'id') and obj.id) else 0
        except (AttributeError, Exception):
            return 0


class SchoolElectionDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with positions included"""
    status = serializers.SerializerMethodField()
    is_active_now = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    election_positions = ElectionPositionSerializer(many=True, read_only=True)
    total_positions = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    allowed_department_name = serializers.CharField(source='allowed_department.name', read_only=True, allow_null=True)
    allowed_department_code = serializers.CharField(source='allowed_department.code', read_only=True, allow_null=True)
    
    class Meta:
        model = SchoolElection
        fields = [
            'id', 'title', 'election_type', 'allowed_department',
            'allowed_department_name', 'allowed_department_code',
            'start_year', 'end_year', 'description',
            'start_date', 'end_date', 'is_active', 'status', 'is_active_now',
            'created_by', 'created_by_name', 
            'election_positions', 'total_positions', 'total_votes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'title']
    
    def get_status(self, obj):
        """Return human-readable status"""
        if obj is None:
            return 'inactive'
        try:
            if obj.is_active_now():
                return 'ongoing'
            elif obj.is_upcoming():
                return 'upcoming'
            elif obj.is_finished():
                return 'finished'
        except Exception:
            pass
        return 'inactive'
    
    def get_is_active_now(self, obj):
        """Return boolean indicating if election is currently active"""
        if obj is None:
            return False
        try:
            return obj.is_active_now()
        except Exception:
            return False
    
    def get_created_by_name(self, obj):
        """Get created by full name safely"""
        if obj is None or obj.created_by is None:
            return None
        try:
            return obj.created_by.get_full_name() or obj.created_by.username
        except Exception:
            return None
    
    def get_total_positions(self, obj):
        """Count of positions in this election"""
        if obj is None:
            return 0
        try:
            # Safely count positions, return 0 if election doesn't exist
            return obj.election_positions.count() if hasattr(obj, 'election_positions') else 0
        except (AttributeError, Exception):
            return 0
    
    def get_total_votes(self, obj):
        """Count of unique voters in this election"""
        if obj is None:
            return 0
        try:
            # Safely count votes, return 0 if election doesn't exist or has no votes
            return VoteReceipt.objects.filter(election=obj).count() if (obj.id and hasattr(obj, 'id')) else 0
        except (AttributeError, Exception):
            return 0


class SchoolElectionCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating elections"""
    position_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of position IDs to associate with this election"
    )
    allowed_department_id = serializers.IntegerField(
        write_only=True,
        required=False,
        allow_null=True,
        help_text="Department ID for Department Election type"
    )
    
    start_year = serializers.IntegerField(
        required=True,
        min_value=2000,
        max_value=2100,
        help_text="Start year for AY format (e.g., 2025 for AY 2025-2026)"
    )
    
    end_year = serializers.IntegerField(
        required=True,
        min_value=2000,
        max_value=2100,
        help_text="End year for AY format (e.g., 2026 for AY 2025-2026)"
    )
    
    class Meta:
        model = SchoolElection
        fields = [
            'id', 'title', 'election_type', 'allowed_department_id',
            'start_year', 'end_year', 'description',
            'start_date', 'end_date', 'is_active', 'position_ids'
        ]
        read_only_fields = ['title']
    
    def validate(self, data):
        """Validate election data"""
        start_year = data.get('start_year')
        end_year = data.get('end_year')
        election_type = data.get('election_type', 'university')
        allowed_department_id = data.get('allowed_department_id')
        
        # Validate year range
        if start_year and end_year:
            if end_year != start_year + 1:
                raise serializers.ValidationError({
                    'end_year': f'End year must be {start_year + 1} (one year after start year)'
                })
        
        # Validate department election requirements
        if election_type == 'department':
            if not allowed_department_id:
                raise serializers.ValidationError({
                    'allowed_department_id': 'Department is required for Department Election type'
                })
            
            # Verify department exists and is a department type
            from apps.accounts.models import Program
            try:
                department = Program.objects.get(
                    id=allowed_department_id,
                    program_type='department'
                )
            except Program.DoesNotExist:
                raise serializers.ValidationError({
                    'allowed_department_id': 'Invalid department. Must be a department-type program.'
                })
        elif election_type == 'university':
            # Clear department if switching to university type
            if allowed_department_id:
                data['allowed_department_id'] = None
        
        return data
    
    def create(self, validated_data):
        position_ids = validated_data.pop('position_ids', [])
        allowed_department_id = validated_data.pop('allowed_department_id', None)
        
        # Set allowed_department if provided
        if allowed_department_id:
            from apps.accounts.models import Program
            validated_data['allowed_department'] = Program.objects.get(id=allowed_department_id)
        else:
            validated_data['allowed_department'] = None
        
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
        allowed_department_id = validated_data.pop('allowed_department_id', None)
        
        # Handle allowed_department
        if allowed_department_id is not None:
            if allowed_department_id:
                from apps.accounts.models import Program
                instance.allowed_department = Program.objects.get(id=allowed_department_id)
            else:
                instance.allowed_department = None
        
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

