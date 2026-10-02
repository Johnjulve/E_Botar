from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Program, UserProfile
from apps.elections.models import SchoolElection, SchoolPosition, ElectionPosition
from apps.candidates.models import Candidate, Party
from apps.voting.models import Ballot, VoteChoice, VoteReceipt


class StreamingExportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username='export_staff',
            password='Password123!',
            email='staff@school.edu',
            is_staff=True,
            is_superuser=True,
        )
        UserProfile.objects.create(user=self.staff_user, year_level='4')
        self.client.force_authenticate(user=self.staff_user)

    def test_program_export_csv_streams_rows(self):
        dept = Program.objects.create(
            name='College of Engineering',
            code='COE',
            program_type=Program.ProgramType.DEPARTMENT,
        )
        Program.objects.create(
            name='BS Civil Engineering',
            code='BSCE',
            program_type=Program.ProgramType.COURSE,
            department=dept,
        )

        response = self.client.get('/api/auth/programs/export-csv/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.streaming)
        content = b''.join(response.streaming_content).decode('utf-8')
        self.assertIn('College of Engineering', content)
        self.assertIn('BS Civil Engineering', content)
        self.assertIn('BSCE', content)

    def test_receipt_audit_export_csv_streams_rows(self):
        election = SchoolElection.objects.create(
            title='Annual SSG Election',
            election_type='university',
            start_year=2026,
            end_year=2027,
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=1),
        )
        student = User.objects.create_user(
            username='voter_student',
            first_name='Maria',
            last_name='Clara',
            email='maria@school.edu',
        )
        UserProfile.objects.create(user=student, student_id='2026-99999', year_level='1')
        VoteReceipt.objects.create(user=student, election=election)

        response = self.client.get('/api/voting/receipts/export-csv/', {'election_id': election.id})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.streaming)
        content = b''.join(response.streaming_content).decode('utf-8')
        self.assertIn('Receipt Code', content)
        self.assertIn('2026-99999', content)
        self.assertIn('Maria Clara', content)
        self.assertIn(election.title, content)

    def test_results_export_csv_streams_pipeline(self):
        election = SchoolElection.objects.create(
            title='Class Rep Election',
            election_type='department',
            start_year=2026,
            end_year=2027,
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=1),
        )
        pos = SchoolPosition.objects.create(name='Representative')
        ElectionPosition.objects.create(election=election, position=pos, order=1)

        candidate_user = User.objects.create_user(username='cand1', first_name='Crisostomo', last_name='Ibarra')
        party = Party.objects.create(name='Sandigan Party')
        cand = Candidate.objects.create(
            election=election,
            position=pos,
            user=candidate_user,
            party=party,
            is_active=True,
        )

        voter = User.objects.create_user(username='voter1')
        receipt = VoteReceipt.objects.create(user=voter, election=election)
        ballot = Ballot.objects.create(user=voter, election=election, receipt=receipt)
        VoteChoice.objects.create(ballot=ballot, position=pos, candidate=cand)
        response = self.client.get('/api/voting/results/export_results/', {
            'election_id': election.id,
            'format': 'csv',
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.streaming)
        content = b''.join(response.streaming_content).decode('utf-8')
        self.assertIn(election.title, content)
        self.assertIn('Representative', content)
        self.assertIn('Crisostomo Ibarra', content)
        self.assertIn('Sandigan Party', content)
        self.assertIn('100.0%', content)
