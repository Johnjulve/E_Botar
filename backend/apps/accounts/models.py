from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
import random
import string
from datetime import datetime


class Department(models.Model):
    """Department model for organizing courses"""
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True, help_text="Short department code (e.g., 'CS', 'ENG')")
    description = models.TextField(blank=True, help_text="Optional description of the department")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'


class Course(models.Model):
    """Course model linked to departments"""
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='courses')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, help_text="Course code (e.g., 'CS101', 'ENG201')")
    description = models.TextField(blank=True, help_text="Optional course description")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.code}) - {self.department.name}"
    
    class Meta:
        ordering = ['department__name', 'name']
        unique_together = ['department', 'code']
        verbose_name = 'Course'
        verbose_name_plural = 'Courses'


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
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    year_level = models.CharField(max_length=20, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
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
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
        ordering = ['-created_at']
