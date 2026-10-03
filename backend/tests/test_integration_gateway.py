from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.elections.models import SchoolElection, SchoolPosition
from apps.candidates.models import Candidate
from apps.voting.models import AnonVote, VoteReceipt
from django.contrib.auth.models import User


class IntegrationGatewayTests(APITestCase):
    """Test suite for the /api/v1/integration/ external partner gateway."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='integration_voter',
            email='integration_voter@school.edu.ph',
            password='Password123!',
            first_name='Juan',
            last_name='Dela Cruz',
        )
        self.now = timezone.now()
        self.election = SchoolElection.objects.create(
            title='USC Election AY 2026-2027',
            election_type='university',
            start_date=self.now - timezone.timedelta(days=1),
            end_date=self.now + timezone.timedelta(days=1),
            is_active=True,
        )
        self.position = SchoolPosition.objects.create(
            name='President',
            display_order=1,
            is_active=True,
        )
        self.candidate = Candidate.objects.create(
            user=self.user,
            position=self.position,
            election=self.election,
            manifesto='Transparency and student empowerment.',
            is_active=True,
        )

    def test_integration_health_probe(self):
        url = reverse('integration:health')
        self.assertTrue(url.startswith('/api/v1/'))
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'healthy')
        self.assertEqual(response.data.get('version'), 'v1')

        # Verify backward-compatible alias also works
        legacy_response = self.client.get('/api/integration/health/')
        self.assertEqual(legacy_response.status_code, status.HTTP_200_OK)
        self.assertEqual(legacy_response.data.get('status'), 'healthy')

    def test_integration_election_list_minimal_fields(self):
        url = reverse('integration:elections')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)

        item = response.data[0]
        self.assertEqual(item['id'], self.election.id)
        self.assertEqual(item['title'], self.election.title)
        self.assertTrue(item['is_active_now'])
        # Ensure sensitive administrative data is NOT exposed
        self.assertNotIn('created_by', item)

    def test_integration_election_results_tally(self):
        # Create an anonymous vote
        AnonVote.objects.create(
            election=self.election,
            position=self.position,
            candidate=self.candidate,
            vote_hash='sample_hash_123',
        )

        url = reverse('integration:election-results', kwargs={'election_id': self.election.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['election_id'], self.election.id)
        self.assertEqual(response.data['total_votes'], 1)
        self.assertEqual(len(response.data['positions']), 1)
        self.assertEqual(response.data['positions'][0]['candidates'][0]['vote_count'], 1)

    def test_integration_receipt_verify(self):
        receipt = VoteReceipt.objects.create(
            user=self.user,
            election=self.election,
            receipt_code='ABC2-DEF4-GH56',
        )

        url = reverse('integration:verify-receipt')
        # Valid receipt
        response = self.client.post(url, {'receipt_code': 'ABC2-DEF4-GH56'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertEqual(response.data['election_id'], self.election.id)

        # Invalid receipt
        bad_response = self.client.post(url, {'receipt_code': 'ZZZZ-0000-FAIL'}, format='json')
        self.assertEqual(bad_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(bad_response.data['valid'])

    def test_election_status_query_param_filter(self):
        # Query active elections via standard REST query parameter
        response = self.client.get('/api/v1/elections/elections/?status=active')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Results can be a list or paginated dict
        results = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.election.id)

        # Query upcoming elections (our test election is active now, so upcoming should be empty)
        response_upcoming = self.client.get('/api/v1/elections/elections/?status=upcoming')
        self.assertEqual(response_upcoming.status_code, status.HTTP_200_OK)
        results_upcoming = response_upcoming.data['results'] if isinstance(response_upcoming.data, dict) and 'results' in response_upcoming.data else response_upcoming.data
        self.assertEqual(len(results_upcoming), 0)

