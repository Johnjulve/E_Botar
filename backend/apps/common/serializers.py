from rest_framework import serializers
from .models import SystemSettings


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for SystemSettings model"""
    
    class Meta:
        model = SystemSettings
        fields = ['id', 'key', 'value', 'description', 'updated_at', 'updated_by']
        read_only_fields = ['id', 'updated_at', 'updated_by']


class AcademicYearSerializer(serializers.Serializer):
    """Serializer for academic year setting"""
    academic_year = serializers.CharField(max_length=20, help_text="Academic year in format YYYY-YYYY (e.g., 2025-2026)")
    
    def validate_academic_year(self, value):
        """Validate academic year format"""
        if not value:
            raise serializers.ValidationError("Academic year is required")
        
        # Check format: YYYY-YYYY
        parts = value.split('-')
        if len(parts) != 2:
            raise serializers.ValidationError("Academic year must be in format YYYY-YYYY (e.g., 2025-2026)")
        
        try:
            year1 = int(parts[0])
            year2 = int(parts[1])
            
            # Validate year range (reasonable academic years)
            if year1 < 2000 or year1 > 2100 or year2 < 2000 or year2 > 2100:
                raise serializers.ValidationError("Years must be between 2000 and 2100")
            
            # Validate that second year is one more than first year
            if year2 != year1 + 1:
                raise serializers.ValidationError("Second year must be exactly one year after the first year")
                
        except ValueError:
            raise serializers.ValidationError("Years must be valid numbers")
        
        return value

