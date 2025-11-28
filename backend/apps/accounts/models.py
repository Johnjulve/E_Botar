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
    code = models.CharField(max_length=20, help_text="Program code (e.g., 'CS', 'BSCS')")
    program_type = models.CharField(max_length=20, choices=ProgramType.choices)
    description = models.TextField(blank=True, help_text="Optional description of the program")
    department = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='courses',
        limit_choices_to={'program_type': ProgramType.DEPARTMENT},
        help_text="Assign department for course-type programs"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accounts_program'
        ordering = ['program_type', 'name']
        constraints = [
            models.UniqueConstraint(fields=['program_type', 'code'], name='unique_program_code_per_type'),
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
        limit_choices_to={'program_type': Program.ProgramType.DEPARTMENT}
    )
    course = models.ForeignKey(
        Program,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='course_students',
        limit_choices_to={'program_type': Program.ProgramType.COURSE}
    )
    year_level = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.student_id})"
    
    def save(self, *args, **kwargs):
        """Auto-generate student ID if not provided"""
        if not self.student_id:
            year = timezone.now().year
            random_digits = ''.join(random.choices(string.digits, k=5))
            self.student_id = f"{year}-{random_digits}"
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'accounts_userprofile'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
        ordering = ['-created_at']
