from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import UserProfile
from apps.elections.models import SchoolElection
from apps.voting.models import VoteReceipt


class ProfileListPaginationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username='list_staff',
            password='pass12345',
            is_staff=True,
        )
        UserProfile.objects.create(user=self.staff, year_level='4')
        self.client.force_authenticate(user=self.staff)

        for index in range(3):
            student = User.objects.create_user(
                username=f'student_{index}',
                password='pass12345',
                email=f'student_{index}@school.edu',
            )
            UserProfile.objects.create(
                user=student,
                student_id=f'2026-000{index}',
                year_level='1',
            )

    def test_profile_list_is_paginated_and_lean(self):
        response = self.client.get('/api/auth/profiles/', {'page': 1, 'page_size': 2})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn('count', body)
        self.assertIn('results', body)
        self.assertEqual(len(body['results']), 2)
        row = body['results'][0]
        self.assertIn('user', row)
        self.assertNotIn('missing_fields', row)
        self.assertNotIn('avatar_url', row)
        self.assertNotIn('description', row.get('department') or {})

    def test_voting_status_is_paginated_with_summary(self):
        now = timezone.now()
        election = SchoolElection.objects.create(
            election_type='university',
            start_year=2024,
            end_year=2025,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=1),
        )
        first_student = User.objects.get(username='student_0')
        VoteReceipt.objects.create(user=first_student, election=election)

        response = self.client.get(
            '/api/voting/voting-status/',
            {'election_id': election.id, 'page': 1, 'page_size': 2},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['summary']['total_eligible_students'], 3)
        self.assertEqual(body['summary']['total_voted'], 1)
        self.assertEqual(len(body['results']), 2)
        self.assertIn('has_voted', body['results'][0])
        self.assertNotIn('missing_fields', body['results'][0])
