from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.elections.models import SchoolPosition, SchoolElection, Party


class CandidateApplication(models.Model):
    """Model for student candidate applications"""
    APPLICATION_STATUS = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='candidate_applications')
    position = models.ForeignKey(SchoolPosition, on_delete=models.CASCADE, related_name='applications')
    election = models.ForeignKey(SchoolElection, on_delete=models.CASCADE, related_name='applications')
    party = models.ForeignKey(Party, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications')
    manifesto = models.TextField(help_text="Campaign manifesto and goals")
    photo = models.ImageField(upload_to='candidate_photos/', blank=True, null=True)
    supporting_documents = models.FileField(upload_to='candidate_docs/', blank=True, null=True, help_text="Optional supporting documents")
    status = models.CharField(max_length=20, choices=APPLICATION_STATUS, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_applications')
    review_notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.position.name} ({self.get_status_display()})"
    
    def clean(self):
        """Validate application rules"""
        
        # Rule 1: Check if user already has any active application (pending/approved) for this election
        # Users can only have ONE application per election, regardless of position
        existing_application = CandidateApplication.objects.filter(
            user=self.user,
            election=self.election,
            status__in=['pending', 'approved']
        ).exclude(pk=self.pk).first()
        
        if existing_application:
            raise ValidationError(
                f"You already have a {existing_application.get_status_display().lower()} application "
                f"for {existing_application.position.name} in this election. "
                f"Please withdraw your existing application first if you want to apply for a different position."
            )
        
        # Rule 2: Check if same party already has an approved application for this position
        if self.party and self.status == 'approved':
            existing_party_application = CandidateApplication.objects.filter(
                position=self.position,
                election=self.election,
                party=self.party,
                status='approved'
            ).exclude(pk=self.pk).first()
            
            if existing_party_application:
                raise ValidationError(
                    f"Party '{self.party.name}' already has an approved candidate "
                    f"({existing_party_application.user.get_full_name()}) for {self.position.name}."
                )
        
        # Rule 3: Check if user ran for the same position in the previous election
        if self.election and self.position:
            previous_election = SchoolElection.objects.filter(
                start_date__lt=self.election.start_date
            ).order_by('-start_date').first()
            
            if previous_election:
                previous_candidate = Candidate.objects.filter(
                    user=self.user,
                    position=self.position,
                    election=previous_election,
                    is_active=True
                ).first()
                
                if previous_candidate:
                    raise ValidationError(
                        f"You cannot run for the same position '{self.position.name}' "
                        f"in consecutive elections. You previously ran in {previous_election.title}."
                    )
    
    def approve(self, reviewer):
        """Approve the application and create a Candidate instance"""
        if self.status == 'approved':
            return None  # Already approved
        
        self.status = 'approved'
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.save()
        
        # Create Candidate instance
        candidate, created = Candidate.objects.get_or_create(
            user=self.user,
            position=self.position,
            election=self.election,
            defaults={
                'party': self.party,
                'manifesto': self.manifesto,
                'photo': self.photo,
                'approved_application': self
            }
        )
        
        return candidate
    
    def reject(self, reviewer, notes=''):
        """Reject the application"""
        self.status = 'rejected'
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save()
    
    class Meta:
        unique_together = [['user', 'election']]
        ordering = ['-submitted_at']
        verbose_name = 'Candidate Application'
        verbose_name_plural = 'Candidate Applications'


class Candidate(models.Model):
    """Model for approved candidates running for school positions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='candidates')
    position = models.ForeignKey(SchoolPosition, on_delete=models.CASCADE, related_name='candidates')
    election = models.ForeignKey(SchoolElection, on_delete=models.CASCADE, related_name='candidates')
    party = models.ForeignKey(Party, on_delete=models.SET_NULL, null=True, blank=True, related_name='candidates')
    manifesto = models.TextField(help_text="Campaign manifesto and goals")
    photo = models.ImageField(upload_to='candidate_photos/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Reference to the approved application
    approved_application = models.OneToOneField(
        CandidateApplication, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='candidate'
    )
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.position.name} ({self.election.title})"
    
    def clean(self):
        """Validate that candidate was created through proper application process"""
        # This validation can be relaxed for admin-created candidates
        if not self.approved_application and not self.pk:
            # Check if there's an approved application
            approved_app = CandidateApplication.objects.filter(
                user=self.user,
                position=self.position,
                election=self.election,
                status='approved'
            ).first()
            
            if approved_app:
                self.approved_application = approved_app
    
    class Meta:
        ordering = ['position__display_order', 'user__first_name']
        unique_together = ['user', 'election', 'position']
        verbose_name = 'Candidate'
        verbose_name_plural = 'Candidates'
