from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
import random
import string
from datetime import datetime

class Program(models.Model):
    """Unified model for departments and courses"""
    class ProgramType(models.TextChoices):
        DEPARTMENT = 'department', 'Department'
        COURSE = 'course', 'Course'
    
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True, help_text="Program code (e.g., 'CS', 'BSCS') - must be unique")
    program_type = models.CharField(max_length=20, choices=ProgramType.choices)
    description = models.TextField(blank=True, help_text="Optional description of the program")
    department = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='courses',
        limit_choices_to={'program_type': ProgramType.DEPARTMENT},
        to_field='code',
        help_text="Assign department for course-type programs (by code)"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accounts_program'
        ordering = ['program_type', 'name']
        constraints = [
            models.UniqueConstraint(fields=['program_type', 'name'], name='unique_program_name_per_type'),
        ]
        verbose_name = 'Program'
        verbose_name_plural = 'Programs'
    
    def __str__(self):
        department = f" - {self.department.name}" if self.department else ''
        return f"{self.get_program_type_display()}: {self.name} ({self.code}){department}"


class UserProfile(models.Model):
    """Extended user profile for additional information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    middle_name = models.CharField(max_length=150, blank=True, help_text='Middle name')
    student_id = models.CharField(
        max_length=20, 
        unique=True, 
        blank=True, 
        null=True,
        validators=[
            RegexValidator(
                regex=r'^\d{4}-\d{5}$',
                message='Student ID must be in format XXXX-XXXXX where XXXX is year created and XXXXX is random/indexed (e.g., 2024-12345)',
                code='invalid_student_id'
            )
        ],
        help_text='Format: XXXX-XXXXX where XXXX is year created and XXXXX is random/indexed (e.g., 2024-12345)'
    )
    department = models.ForeignKey(
        Program,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='department_students',
        limit_choices_to={'program_type': Program.ProgramType.DEPARTMENT},
        to_field='code'
    )
    course = models.ForeignKey(
        Program,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='course_students',
        limit_choices_to={'program_type': Program.ProgramType.COURSE},
        to_field='code'
    )
    year_level = models.CharField(max_length=20, blank=True)
    section = models.CharField(
        max_length=50,
        blank=True,
        help_text='Class section (e.g. A, B, or block code)',
    )
    avatar = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.student_id})"
    
    def save(self, *args, **kwargs):
        """Auto-generate student ID if not provided; delete old avatar when replaced or removed."""
        # Delete old avatar file when avatar is being changed or cleared (avoids orphaned files)
        if self.pk:
            try:
                old = UserProfile.objects.get(pk=self.pk)
                if old.avatar and (self.avatar is None or self.avatar is not old.avatar):
                    try:
                        old.avatar.delete(save=False)
                    except (OSError, ValueError):
                        pass  # File may already be deleted (e.g. by view)
            except UserProfile.DoesNotExist:
                pass
        # Only auto-generate student_id for non-staff users
        if not self.student_id and not (self.user.is_staff or self.user.is_superuser):
            year = timezone.now().year
            random_digits = ''.join(random.choices(string.digits, k=5))
            self.student_id = f"{year}-{random_digits}"
        super().save(*args, **kwargs)
    
    def is_profile_complete(self):
        """Check if profile has all required details for candidate application"""
        # For staff/admin users, profile completeness is not required
        if self.user.is_staff or self.user.is_superuser:
            return True
        
        # For regular users, check required fields
        required_fields = [
            self.student_id,  # Student ID (can be auto-generated)
            self.department,  # Department
            self.course,      # Course
            self.year_level,  # Year level
            self.section,
        ]
        
        # Check if all required fields are filled
        return all(field is not None and str(field).strip() != '' for field in required_fields)
    
    def get_missing_fields(self):
        """Get list of missing required fields for profile completion"""
        missing = []
        
        # For staff/admin users, no fields are required
        if self.user.is_staff or self.user.is_superuser:
            return missing
        
        if not self.student_id or not str(self.student_id).strip():
            missing.append('Student ID')
        if not self.department:
            missing.append('Department')
        if not self.course:
            missing.append('Course')
        if not self.year_level or not str(self.year_level).strip():
            missing.append('Year Level')
        if not self.section or not str(self.section).strip():
            missing.append('Section')
        
        return missing
    
    def clean(self):
        """Validate profile data"""
        # For staff/admin users, academic fields are optional
        is_admin_or_staff = self.user.is_staff or self.user.is_superuser
        
        if not is_admin_or_staff:
            # For regular users, validate that academic fields are provided
            # Note: These validations are soft - we allow None for flexibility
            # Frontend validation will enforce required fields for students
            pass
        
        super().clean()
    
    class Meta:
        db_table = 'accounts_userprofile'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
        ordering = ['-created_at']
