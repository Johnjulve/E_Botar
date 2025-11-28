from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.candidates.models import Candidate
from apps.elections.models import SchoolPosition, SchoolElection
import uuid
import hashlib


class VoteReceipt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vote_receipts')
    election = models.ForeignKey(SchoolElection, on_delete=models.CASCADE, related_name='receipts')
    receipt_code = models.CharField(max_length=64, unique=True, db_index=True)
    receipt_hash = models.CharField(max_length=64, db_index=True, help_text="SHA-256 hash of receipt for verification")
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP address for audit trail")
    
    class Meta:
        db_table = 'voting_votereceipt'
        unique_together = ['user', 'election']
        ordering = ['-created_at']
        verbose_name = 'Vote Receipt'
        verbose_name_plural = 'Vote Receipts'
    
    def save(self, *args, **kwargs):
        """Generate receipt code and hash if not provided"""
        if not self.receipt_code:
            self.receipt_code = self.generate_receipt_code()
        if not self.receipt_hash:
            self.receipt_hash = self.hash_receipt(self.receipt_code)
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_receipt_code():
        """Generate a unique receipt code"""
        return uuid.uuid4().hex + uuid.uuid4().hex[:8]  # 40 characters
    
    @staticmethod
    def hash_receipt(receipt_code):
        """Generate SHA-256 hash of receipt code"""
        return hashlib.sha256(receipt_code.encode()).hexdigest()
    
    def verify_receipt(self, receipt_code):
        """Verify if provided receipt code matches"""
        return self.receipt_hash == self.hash_receipt(receipt_code)
    
    def get_masked_receipt(self):
        """Get masked receipt for display (show first 8 and last 8 chars)"""
        if len(self.receipt_code) > 16:
            return f"{self.receipt_code[:8]}...{self.receipt_code[-8:]}"
        return self.receipt_code
    
    def __str__(self):
        return f"Receipt {self.get_masked_receipt()} for {self.user.username}"


class AnonVote(models.Model):
    election = models.ForeignKey(SchoolElection, on_delete=models.CASCADE, related_name='anon_votes')
    position = models.ForeignKey(SchoolPosition, on_delete=models.CASCADE, related_name='anon_votes')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='anon_votes')
    vote_hash = models.CharField(max_length=64, db_index=True, help_text="Hash for vote verification")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'voting_anonvote'
        ordering = ['-created_at']
        verbose_name = 'Anonymous Vote'
        verbose_name_plural = 'Anonymous Votes'
        indexes = [
            models.Index(fields=['election', 'position', 'candidate']),
        ]
    
    def save(self, *args, **kwargs):
        """Generate vote hash if not provided"""
        if not self.vote_hash:
            # Generate hash from election, position, candidate, and timestamp
            hash_data = f"{self.election.id}:{self.position.id}:{self.candidate.id}:{timezone.now().isoformat()}"
            self.vote_hash = hashlib.sha256(hash_data.encode()).hexdigest()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Vote for {self.candidate.user.get_full_name()} in {self.position.name}"


class Ballot(models.Model):
    """User's ballot submission record.
    
    This model tracks when a user submits their ballot and provides
    a link between the user and their vote receipt.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ballots')
    election = models.ForeignKey(SchoolElection, on_delete=models.CASCADE, related_name='ballots')
    receipt = models.OneToOneField(VoteReceipt, on_delete=models.CASCADE, related_name='ballot')
    submitted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, help_text="Browser user agent")
    
    class Meta:
        db_table = 'voting_ballot'
        unique_together = ['user', 'election']
        ordering = ['-submitted_at']
        verbose_name = 'Ballot'
        verbose_name_plural = 'Ballots'
    
    def clean(self):
        """Validate ballot submission"""
        # Check if election is active
        if not self.election.is_active_now():
            raise ValidationError("This election is not currently active.")
        
        # Check if user has already voted
        if Ballot.objects.filter(user=self.user, election=self.election).exclude(pk=self.pk).exists():
            raise ValidationError("You have already submitted a ballot for this election.")
    
    def __str__(self):
        return f"Ballot by {self.user.username} for {self.election.title}"


class VoteChoice(models.Model):
    """Individual vote choice within a ballot.
    
    Temporary model to store vote choices before they are anonymized.
    These records can be deleted after anonymization for enhanced privacy.
    """
    ballot = models.ForeignKey(Ballot, on_delete=models.CASCADE, related_name='choices')
    position = models.ForeignKey(SchoolPosition, on_delete=models.CASCADE)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    anonymized = models.BooleanField(default=False, help_text="Whether this choice has been converted to AnonVote")
    
    class Meta:
        db_table = 'voting_votechoice'
        unique_together = ['ballot', 'position']
        ordering = ['position__display_order']
        verbose_name = 'Vote Choice'
        verbose_name_plural = 'Vote Choices'
    
    def anonymize(self):
        """Convert this vote choice to an anonymous vote"""
        if not self.anonymized:
            AnonVote.objects.create(
                election=self.ballot.election,
                position=self.position,
                candidate=self.candidate
            )
            self.anonymized = True
            self.save()
    
    def __str__(self):
        return f"{self.position.name}: {self.candidate.user.get_full_name()}"
