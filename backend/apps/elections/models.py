from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError


class Party(models.Model):
    """Model for political parties"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='party_logos/', blank=True, null=True)
    color = models.CharField(max_length=7, default='#0b6e3b', help_text="Hex color code for party branding")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Party'
        verbose_name_plural = 'Parties'


class SchoolPosition(models.Model):
    """Model for school administration positions"""
    POSITION_TYPES = [
        ('president', 'President'),
        ('vice_president', 'Vice President'),
        ('secretary', 'Secretary'),
        ('treasurer', 'Treasurer'),
        ('auditor', 'Auditor'),
        ('public_info', 'Public Information Officer'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=100)
    position_type = models.CharField(max_length=20, choices=POSITION_TYPES, default='other')
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0, db_index=True)
    max_candidates = models.PositiveIntegerField(default=10, help_text="Maximum number of candidates allowed for this position")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['display_order', 'position_type', 'name']
        verbose_name = 'School Position'
        verbose_name_plural = 'School Positions'


class SchoolElection(models.Model):
    """Model for school election periods"""
    title = models.CharField(max_length=200)
    start_year = models.IntegerField(null=True, blank=True, help_text="Start year for SY format (e.g., 2025 for SY 2025-2026)")
    end_year = models.IntegerField(null=True, blank=True, help_text="End year for SY format (e.g., 2026 for SY 2025-2026)")
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_elections')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Auto-generate title from years if provided
        if self.start_year and self.end_year:
            self.title = f"SY {self.start_year}-{self.end_year}"
        super().save(*args, **kwargs)
    
    def clean(self):
        if self.start_date and self.end_date:
            if self.start_date >= self.end_date:
                raise ValidationError("Start date must be before end date")
    
    def __str__(self):
        return self.title
    
    def is_active_now(self):
        """Check if election is currently active and within schedule"""
        now = timezone.now()
        return self.is_active and (self.start_date <= now <= self.end_date)
    
    def is_upcoming(self):
        """Check if election is upcoming"""
        now = timezone.now()
        return self.is_active and now < self.start_date
    
    def is_finished(self):
        """Check if election has finished"""
        now = timezone.now()
        return now > self.end_date
    
    class Meta:
        ordering = ['-start_date']
        verbose_name = 'School Election'
        verbose_name_plural = 'School Elections'


class ElectionPosition(models.Model):
    """Model to link elections with positions (many-to-many through table)"""
    election = models.ForeignKey(SchoolElection, on_delete=models.CASCADE, related_name='election_positions')
    position = models.ForeignKey(SchoolPosition, on_delete=models.CASCADE, related_name='position_elections')
    order = models.PositiveIntegerField(default=0, db_index=True, help_text="Display order for this position in the election")
    is_enabled = models.BooleanField(default=True, help_text="Whether this position is active for voting in this election")
    
    def __str__(self):
        return f"{self.election.title} - {self.position.name}"
    
    class Meta:
        unique_together = ['election', 'position']
        ordering = ['order', 'position__display_order']
        verbose_name = 'Election Position'
        verbose_name_plural = 'Election Positions'
