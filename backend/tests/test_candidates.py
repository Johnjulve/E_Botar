"""
Centralized Candidates & Application Review Tests.
"""

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserProfile
from apps.candidates.views import BULK_APPLICATION_REVIEW_MAX_IDS


class BulkReviewLimitTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username='bulk_staff',
            password='pass12345',
            is_staff=True,
        )
        UserProfile.objects.create(user=self.staff, year_level='4')
        self.client.force_authenticate(user=self.staff)

    def test_bulk_review_rejects_too_many_application_ids(self):
        oversized_ids = list(range(1, BULK_APPLICATION_REVIEW_MAX_IDS + 2))
        response = self.client.post(
            '/api/candidates/applications/bulk_review/',
            {
                'application_ids': oversized_ids,
                'action': 'approve',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn(str(BULK_APPLICATION_REVIEW_MAX_IDS), response.json()['detail'])
