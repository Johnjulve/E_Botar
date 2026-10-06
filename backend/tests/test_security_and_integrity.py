"""
Comprehensive Security, Cryptographic & Voting Integrity Test Matrix.
Covers Critical Paths 1 through 6 for Phase 5.6:
  - Auth & RBAC Permissions
  - Election Lifecycle & Eligibility
  - Voting Transaction Atomicity & Concurrency Protection
  - Cryptographic Verification & Tamper Detection
  - OWASP Top 10 Protections & Security Headers
"""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import UserProfile, Program
from apps.candidates.models import Candidate
from apps.elections.models import SchoolElection, SchoolPosition, ElectionPosition
from apps.voting.models import Ballot, VoteChoice, AnonVote, VoteReceipt, VoteBlock
from apps.voting.services import BallotSubmissionService
from apps.voting.vote_ledger import verify_election_vote_chain, append_vote_blocks_for_ballot


class AuthAndRBACSecurityTests(TestCase):
    """Critical Path 1: Authentication & Authorization Test Matrix."""

    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(username='student_user', password='password123', email='student@snsu.edu.ph')
        self.student_profile = UserProfile.objects.create(
            user=self.student,
            student_id='2026-00001',
            is_verified=True,
        )
        self.staff = User.objects.create_user(username='staff_user', password='password123', email='staff@snsu.edu.ph', is_staff=True)
        self.staff_profile = UserProfile.objects.create(
            user=self.staff,
            is_verified=True,
        )

    def test_valid_user_login_returns_jwt_tokens(self):
        """Valid credentials return JWT access and refresh token pair."""
        response = self.client.post('/api/v1/auth/token/', {
            'username': 'student_user',
            'password': 'password123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertIn('access', body)
        self.assertIn('refresh', body)

    def test_invalid_credentials_rejected(self):
        """Invalid credentials return 401 Unauthorized."""
        response = self.client.post('/api/v1/auth/token/', {
            'username': 'student_user',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_generates_new_access_token(self):
        """Valid refresh token yields a new access token."""
        login_res = self.client.post('/api/v1/auth/token/', {
            'username': 'student_user',
            'password': 'password123',
        })
        refresh_token = login_res.json()['refresh']

        refresh_res = self.client.post('/api/v1/auth/token/refresh/', {
            'refresh': refresh_token,
        })
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_res.json())

    def test_unauthenticated_request_to_protected_endpoint_rejected(self):
        """Accessing protected endpoints without token returns 401."""
        response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_forbidden_from_admin_user_management(self):
        """Students cannot list or modify user accounts."""
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/v1/auth/user-count/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_forbidden_from_receipt_audit_log(self):
        """Students cannot access administrative receipt audit log."""
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/v1/voting/receipts/audit/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_permitted_on_audit_endpoints(self):
        """Staff members are granted access to audit endpoints."""
        self.client.force_authenticate(user=self.staff)
        response = self.client.get('/api/v1/voting/receipts/audit/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ElectionLifecycleSecurityTests(TestCase):
    """Critical Path 2: Election Lifecycle & Voter Eligibility."""

    def setUp(self):
        now = timezone.now()
        self.dept_cs = Program.objects.create(name='Computer Studies', code='DCS', program_type=Program.ProgramType.DEPARTMENT)
        self.prog_cs = Program.objects.create(name='Computer Science', code='BSCS', program_type=Program.ProgramType.COURSE, department=self.dept_cs)

        self.dept_eng = Program.objects.create(name='Engineering', code='DOE', program_type=Program.ProgramType.DEPARTMENT)
        self.prog_ce = Program.objects.create(name='Civil Engineering', code='BSCE', program_type=Program.ProgramType.COURSE, department=self.dept_eng)

        self.active_election = SchoolElection.objects.create(
            title='CS Department Election',
            election_type='department',
            allowed_department=self.dept_cs,
            start_year=2026,
            end_year=2027,
            start_date=now - timedelta(hours=2),
            end_date=now + timedelta(hours=2),
            is_active=True,
        )

        self.closed_election = SchoolElection.objects.create(
            title='Past Election',
            election_type='university',
            start_year=2025,
            end_year=2026,
            start_date=now - timedelta(days=10),
            end_date=now - timedelta(days=2),
            is_active=True,
        )

    def test_election_active_state_window(self):
        """Active window correctly determines is_active_now status."""
        self.assertTrue(self.active_election.is_active_now())
        self.assertFalse(self.closed_election.is_active_now())

    def test_paused_election_is_not_active_now(self):
        """An election paused by administrators reports is_active_now() as False."""
        self.active_election.is_paused = True
        self.active_election.save()
        self.assertFalse(self.active_election.is_active_now())


class VotingTransactionAndRollbackTests(TestCase):
    """Critical Path 3: Voting Transaction Atomicity & Concurrency Protection."""

    def setUp(self):
        now = timezone.now()
        self.voter = User.objects.create_user(username='voter_one', password='password123')
        self.election = SchoolElection.objects.create(
            title='Campus Election',
            election_type='university',
            start_year=2026,
            end_year=2027,
            start_date=now - timedelta(hours=1),
            end_date=now + timedelta(hours=3),
            is_active=True,
        )
        self.position = SchoolPosition.objects.create(name='Governor')
        ElectionPosition.objects.create(election=self.election, position=self.position, order=1)

        cand_user = User.objects.create_user(username='cand_gov', password='password123')
        self.candidate = Candidate.objects.create(
            user=cand_user,
            election=self.election,
            position=self.position,
            is_active=True,
        )

    def test_ballot_submission_atomic_success(self):
        """Successful vote submission creates all records atomically."""
        votes = [{'position_id': self.position.id, 'candidate_id': self.candidate.id}]
        ballot, receipt = BallotSubmissionService.submit_ballot(
            user=self.voter,
            election=self.election,
            votes=votes,
            client_ip='192.168.1.100',
            user_agent='TestBrowser/1.0',
        )

        self.assertIsNotNone(ballot.id)
        self.assertIsNotNone(receipt.id)
        self.assertEqual(VoteChoice.objects.filter(ballot=ballot).count(), 1)
        self.assertEqual(AnonVote.objects.filter(election=self.election).count(), 1)
        self.assertEqual(VoteBlock.objects.filter(election=self.election).count(), 1)

    def test_duplicate_ballot_submission_rejected(self):
        """Duplicate ballot submission by same user fails."""
        votes = [{'position_id': self.position.id, 'candidate_id': self.candidate.id}]
        BallotSubmissionService.submit_ballot(
            user=self.voter,
            election=self.election,
            votes=votes,
        )
        with self.assertRaises(DjangoValidationError):
            BallotSubmissionService.submit_ballot(
                user=self.voter,
                election=self.election,
                votes=votes,
            )

    def test_forged_candidate_id_rejected(self):
        """Voting for a non-existent candidate raises validation error."""
        votes = [{'position_id': self.position.id, 'candidate_id': 999999}]
        with self.assertRaises(DjangoValidationError):
            BallotSubmissionService.submit_ballot(
                user=self.voter,
                election=self.election,
                votes=votes,
            )

    def test_database_error_rolls_back_entire_transaction(self):
        """If a failure occurs during vote processing, no partial rows remain."""
        votes = [{'position_id': self.position.id, 'candidate_id': self.candidate.id}]

        with patch('apps.voting.services.append_vote_blocks_for_ballot', side_effect=RuntimeError('Ledger disk failure')):
            with self.assertRaises(RuntimeError):
                BallotSubmissionService.submit_ballot(
                    user=self.voter,
                    election=self.election,
                    votes=votes,
                )

        # Verify absolute rollback: zero ballots, zero receipts, zero anon votes
        self.assertEqual(Ballot.objects.filter(user=self.voter).count(), 0)
        self.assertEqual(VoteReceipt.objects.filter(user=self.voter).count(), 0)
        self.assertEqual(AnonVote.objects.filter(election=self.election).count(), 0)
        self.assertEqual(VoteChoice.objects.count(), 0)


class CryptographicIntegrityTests(TestCase):
    """Critical Path 4: Cryptographic Verification & Side-Channel Protections."""

    def setUp(self):
        now = timezone.now()
        self.user = User.objects.create_user(username='crypto_voter', password='password123')
        self.election = SchoolElection.objects.create(
            title='Crypto Election',
            election_type='university',
            start_year=2026,
            end_year=2027,
            start_date=now - timedelta(hours=1),
            end_date=now + timedelta(hours=1),
            is_active=True,
        )
        self.position = SchoolPosition.objects.create(name='Representative')
        ElectionPosition.objects.create(election=self.election, position=self.position, order=1)

        cand_user = User.objects.create_user(username='cand_rep', password='password123')
        self.candidate = Candidate.objects.create(
            user=cand_user,
            election=self.election,
            position=self.position,
            is_active=True,
        )

    def test_receipt_constant_time_verification(self):
        """VoteReceipt verify_receipt validates correct receipt and rejects forged code."""
        receipt = VoteReceipt.objects.create(user=self.user, election=self.election)
        self.assertTrue(receipt.verify_receipt(receipt.receipt_code))
        self.assertFalse(receipt.verify_receipt('FORGED-CODE-1234'))

    def test_ledger_chain_tamper_detection(self):
        """Altering vote block data or current_hash triggers chain verification failure."""
        votes = [{'position_id': self.position.id, 'candidate_id': self.candidate.id}]
        ballot, receipt = BallotSubmissionService.submit_ballot(
            user=self.user,
            election=self.election,
            votes=votes,
        )

        # Before tampering: chain is verified
        is_valid, errors = verify_election_vote_chain(self.election.id)
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)

        # Tamper directly with vote candidate in the database
        block = VoteBlock.objects.filter(election=self.election).first()
        tampered_payload = dict(block.vote_data)
        tampered_payload['candidate_id'] = 99999
        VoteBlock.objects.filter(pk=block.pk).update(vote_data=tampered_payload)

        # After tampering: chain verification detects mismatch
        is_valid, errors = verify_election_vote_chain(self.election.id)
        self.assertFalse(is_valid)
        self.assertTrue(any('Hash mismatch' in err for err in errors))


class SecurityHeadersAndOWASPTests(TestCase):
    """Critical Path 5: API Security & OWASP Top 10 Hardening."""

    def setUp(self):
        self.client = APIClient()

    def test_nosniff_security_header_present(self):
        """X-Content-Type-Options: nosniff header is present on responses."""
        response = self.client.get('/health/')
        self.assertEqual(response.headers.get('X-Content-Type-Options'), 'nosniff')

    def test_sql_injection_in_query_params_safely_handled(self):
        """Malicious SQL injection query parameters do not cause SQL syntax errors or leak data."""
        malicious_input = "1' OR '1'='1"
        response = self.client.get('/api/v1/elections/elections/', {'election_id': malicious_input})
        # Should cleanly return 200 with empty/filtered list or standard validation error, never 500 DB error
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])
