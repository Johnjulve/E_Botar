from rest_framework import serializers
from .models import SystemSettings


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for SystemSettings model"""
    
    class Meta:
        model = SystemSettings
        fields = ['id', 'key', 'value', 'description', 'updated_at', 'updated_by']
        read_only_fields = ['id', 'updated_at', 'updated_by']


class FeatureFlagsPatchSerializer(serializers.Serializer):
    """Partial PATCH for `/api/common/feature-flags/` (superuser only)."""
    data_export = serializers.BooleanField(required=False)
    user_registration = serializers.BooleanField(required=False)
    google_login = serializers.BooleanField(required=False)
    staff_preview_disabled_features = serializers.BooleanField(required=False)


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


import re

HEX_COLOR_PATTERN = re.compile(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$')


class InstitutionBrandingUpdateSerializer(serializers.Serializer):
    """Serializer for updating institutional branding and theming configuration."""
    institution_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    institution_name_line2 = serializers.CharField(max_length=150, required=False, allow_blank=True)
    institution_acronym = serializers.CharField(max_length=30, required=False, allow_blank=True)
    app_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    tagline = serializers.CharField(max_length=255, required=False, allow_blank=True)
    support_email = serializers.EmailField(required=False, allow_blank=True)
    website_url = serializers.CharField(max_length=255, required=False, allow_blank=True)
    primary_color = serializers.CharField(max_length=7, required=False, allow_blank=True)
    secondary_color = serializers.CharField(max_length=7, required=False, allow_blank=True)
    institution_logo = serializers.CharField(required=False, allow_blank=True)
    institution_favicon = serializers.CharField(required=False, allow_blank=True)
    institution_seal = serializers.CharField(required=False, allow_blank=True)
    is_custom_branded = serializers.BooleanField(required=False)

    def validate_primary_color(self, value):
        if value and not HEX_COLOR_PATTERN.match(value.strip()):
            raise serializers.ValidationError("Primary color must be a valid hex code (e.g. #0b6e3b).")
        return value.strip() if value else '#0b6e3b'

    def validate_secondary_color(self, value):
        if value and not HEX_COLOR_PATTERN.match(value.strip()):
            raise serializers.ValidationError("Secondary color must be a valid hex code (e.g. #f4cc5c).")
        return value.strip() if value else '#f4cc5c'


