from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.elections.models import ElectionPosition, SchoolElection, SchoolPosition
from apps.voting.models import VoteReceipt


class AddRemovePositionCacheTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username='election_staff',
            password='testpass123',
            is_staff=True,
        )
        self.client.force_authenticate(user=self.staff_user)
        now = timezone.now()
        self.election = SchoolElection.objects.create(
            election_type='university',
            start_year=2024,
            end_year=2025,
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=30),
            created_by=self.staff_user,
        )
        self.position = SchoolPosition.objects.create(name='Test Position')

    def test_add_position_invalidates_related_caches(self):
        url = f'/api/elections/elections/{self.election.id}/add_position/'
        with patch('apps.elections.views.invalidate_election_and_related_voting_cache') as mock_invalidate:
            response = self.client.post(
                url,
                {'position_id': self.position.id, 'order': 0},
                format='json',
            )
        self.assertEqual(response.status_code, 201)
        mock_invalidate.assert_called_once_with(self.election.id)

    def test_remove_position_invalidates_related_caches(self):
        ElectionPosition.objects.create(
            election=self.election,
            position=self.position,
            order=0,
        )
        url = f'/api/elections/elections/{self.election.id}/remove_position/'
        with patch('apps.elections.views.invalidate_election_and_related_voting_cache') as mock_invalidate:
            response = self.client.post(
                url,
                {'position_id': self.position.id},
                format='json',
            )
        self.assertEqual(response.status_code, 204)
        mock_invalidate.assert_called_once_with(self.election.id)


class SchoolElectionListAnnotatedCountsTests(TestCase):
    """Serializers use queryset annotations for total_votes / total_positions."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='reader', password='x')
        self.client.force_authenticate(user=self.user)
        now = timezone.now()
        self.election = SchoolElection.objects.create(
            election_type='university',
            start_year=2024,
            end_year=2025,
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=30),
        )
        pos_a = SchoolPosition.objects.create(name='A')
        pos_b = SchoolPosition.objects.create(name='B')
        ElectionPosition.objects.create(election=self.election, position=pos_a, order=0)
        ElectionPosition.objects.create(election=self.election, position=pos_b, order=1)
        VoteReceipt.objects.create(user=self.user, election=self.election)
        extra_voter = User.objects.create_user(username='reader_2', password='x')
        VoteReceipt.objects.create(user=extra_voter, election=self.election)

    def test_list_includes_total_positions_from_annotation(self):
        response = self.client.get('/api/elections/elections/')
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        rows = payload if isinstance(payload, list) else payload.get('results', payload)
        self.assertTrue(isinstance(rows, list))
        match = next(r for r in rows if r['id'] == self.election.id)
        self.assertEqual(match['total_positions'], 2)
        self.assertEqual(match['total_votes'], 2)
