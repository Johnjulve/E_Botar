from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.utils import timezone
import random
import string

from apps.common.files.upload_paths import avatar_upload_path


def check_profile(profile):
    """Yield (human label, satisfied) for each student completion rule."""
    yield 'Student ID', profile.student_id is not None and str(profile.student_id).strip() != ''
    yield 'Department', profile.department_id is not None
    yield 'Course', profile.course_id is not None
    yield 'Year Level', profile.year_level is not None and str(profile.year_level).strip() != ''
    yield 'Section', profile.section is not None and str(profile.section).strip() != ''


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
        help_text=(
            'Optional college/department for course-type rows (by code). '
            'Leave empty when unassigned (e.g. reorganizations).'
        )
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
    avatar = models.ImageField(upload_to=avatar_upload_path, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.student_id})"

    def save(self, *args, **kwargs):
        if not self.student_id and not (self.user.is_staff or self.user.is_superuser):
            year = timezone.now().year
            random_digits = ''.join(random.choices(string.digits, k=5))
            self.student_id = f"{year}-{random_digits}"

        # Clean up old avatar file safely if replaced or cleared
        if self.pk:
            try:
                old = UserProfile.objects.filter(pk=self.pk).only('avatar').first()
                if old and old.avatar and self.avatar != old.avatar:
                    try:
                        old.avatar.delete(save=False)
                    except Exception:
                        pass
            except Exception:
                pass

        super().save(*args, **kwargs)

    def is_profile_complete(self):
        if self.user.is_staff or self.user.is_superuser:
            return True
        return all(ok for _, ok in check_profile(self))

    def get_missing_fields(self):
        if self.user.is_staff or self.user.is_superuser:
            return []
        return [label for label, ok in check_profile(self) if not ok]

    class Meta:
        db_table = 'accounts_userprofile'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
        ordering = ['-created_at']
