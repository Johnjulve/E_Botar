"""
Centralized Voting, Blockchain Ledger & Receipt Audit Tests.
"""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.candidates.models import Candidate
from apps.elections.models import ElectionPosition, SchoolElection, SchoolPosition
from apps.voting.models import VoteBlock, VoteReceipt
from apps.voting.vote_ledger import verify_election_vote_chain


class ResultsStatisticsPositionStatsTests(TestCase):
    """Regression: statistics must emit one row per entry in votes_by_position."""

    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        self.election = SchoolElection.objects.create(
            election_type='university',
            start_year=2024,
            end_year=2025,
            start_date=now - timedelta(days=30),
            end_date=now - timedelta(days=1),
        )
        self.position_one = SchoolPosition.objects.create(name='President')
        self.position_two = SchoolPosition.objects.create(name='Vice President')
        u1 = User.objects.create_user(username='cand1', password='x')
        u2 = User.objects.create_user(username='cand2', password='x')
        u3 = User.objects.create_user(username='cand3', password='x')
        Candidate.objects.create(
            user=u1,
            position=self.position_one,
            election=self.election,
            manifesto='m1',
        )
        Candidate.objects.create(
            user=u2,
            position=self.position_one,
            election=self.election,
            manifesto='m2',
        )
        Candidate.objects.create(
            user=u3,
            position=self.position_two,
            election=self.election,
            manifesto='m3',
        )

    def test_statistics_returns_row_per_position_with_candidate_counts(self):
        stats_payload = {
            'unique_voters': 3,
            'total_votes_cast': 25,
            'total_registered_voters': 80,
            'turnout_percentage': 3.75,
            'votes_by_position': [
                {
                    'position_id': self.position_one.id,
                    'position__name': 'President',
                    'vote_count': 15,
                },
                {
                    'position_id': self.position_two.id,
                    'position__name': 'Vice President',
                    'vote_count': 10,
                },
            ],
        }
        with patch(
            'apps.voting.views.VotingDataService.get_election_statistics',
            return_value=stats_payload,
        ):
            response = self.client.get(
                '/api/voting/results/statistics/',
                {'election_id': self.election.id},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        position_statistics = body['position_statistics']
        self.assertEqual(len(position_statistics), 2)

        by_id = {row['position_id']: row for row in position_statistics}
        self.assertEqual(by_id[self.position_one.id]['total_votes'], 15)
        self.assertEqual(by_id[self.position_one.id]['candidates_count'], 2)
        self.assertEqual(by_id[self.position_one.id]['position_name'], 'President')

        self.assertEqual(by_id[self.position_two.id]['total_votes'], 10)
        self.assertEqual(by_id[self.position_two.id]['candidates_count'], 1)
        self.assertEqual(by_id[self.position_two.id]['position_name'], 'Vice President')


class BallotVoteLedgerChainTests(TestCase):
    """Append-only VoteBlock chain is written on ballot submit and verifies."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        now = timezone.now()
        self.staff_voter = User.objects.create_user(
            username='ledger_staff_voter',
            password='vote-test-pass',
            is_staff=True,
        )
        self.client.force_authenticate(user=self.staff_voter)

        self.election = SchoolElection.objects.create(
            election_type='university',
            start_year=2024,
            end_year=2025,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=30),
            created_by=self.staff_voter,
        )
        self.pos_a = SchoolPosition.objects.create(name='Position A')
        self.pos_b = SchoolPosition.objects.create(name='Position B')
        ElectionPosition.objects.create(election=self.election, position=self.pos_a, order=0)
        ElectionPosition.objects.create(election=self.election, position=self.pos_b, order=1)

        cu1 = User.objects.create_user(username='lcand1', password='x')
        cu2 = User.objects.create_user(username='lcand2', password='x')
        self.cand_a = Candidate.objects.create(
            user=cu1,
            position=self.pos_a,
            election=self.election,
            manifesto='m-a',
        )
        self.cand_b = Candidate.objects.create(
            user=cu2,
            position=self.pos_b,
            election=self.election,
            manifesto='m-b',
        )

    def tearDown(self):
        cache.clear()

    def test_submit_ballot_appends_linked_vote_blocks_and_passes_verify(self):
        payload = {
            'election_id': self.election.id,
            'votes': [
                {'position_id': self.pos_a.id, 'candidate_id': self.cand_a.id},
                {'position_id': self.pos_b.id, 'candidate_id': self.cand_b.id},
            ],
        }
        response = self.client.post('/api/voting/ballots/submit/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.content)

        blocks = list(VoteBlock.objects.filter(election=self.election).order_by('block_index'))
        self.assertEqual(len(blocks), 2)
        self.assertEqual(blocks[0].block_index, 1)
        self.assertEqual(blocks[0].previous_hash, '0' * 64)
        self.assertEqual(blocks[1].block_index, 2)
        self.assertEqual(blocks[1].previous_hash, blocks[0].current_hash)

        ledger_ok, errors = verify_election_vote_chain(self.election.id)
        self.assertTrue(ledger_ok, errors)

    def test_verify_ok_when_vote_data_ids_roundtrip_as_strings(self):
        payload = {
            'election_id': self.election.id,
            'votes': [
                {'position_id': self.pos_a.id, 'candidate_id': self.cand_a.id},
            ],
        }
        response = self.client.post('/api/voting/ballots/submit/', payload, format='json')
        self.assertEqual(response.status_code, 201)

        block = VoteBlock.objects.get(election=self.election)
        corrupted_style = dict(block.vote_data)
        corrupted_style['position_id'] = str(corrupted_style['position_id'])
        corrupted_style['candidate_id'] = str(corrupted_style['candidate_id'])
        VoteBlock.objects.filter(pk=block.pk).update(vote_data=corrupted_style)

        ledger_ok, errors = verify_election_vote_chain(self.election.id)
        self.assertTrue(ledger_ok, errors)

    def test_verify_detects_database_tampering(self):
        payload = {
            'election_id': self.election.id,
            'votes': [
                {'position_id': self.pos_a.id, 'candidate_id': self.cand_a.id},
            ],
        }
        response = self.client.post('/api/voting/ballots/submit/', payload, format='json')
        self.assertEqual(response.status_code, 201)

        block = VoteBlock.objects.get(election=self.election)
        VoteBlock.objects.filter(pk=block.pk).update(current_hash='deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')

        ledger_ok, errors = verify_election_vote_chain(self.election.id)
        self.assertFalse(ledger_ok)
        self.assertTrue(any('Hash mismatch' in message for message in errors))

    def test_ledger_integrity_endpoint_success_for_staff(self):
        payload = {
            'election_id': self.election.id,
            'votes': [
                {'position_id': self.pos_a.id, 'candidate_id': self.cand_a.id},
            ],
        }
        submit = self.client.post('/api/voting/ballots/submit/', payload, format='json')
        self.assertEqual(submit.status_code, 201)

        response = self.client.get(
            '/api/voting/results/ledger_integrity/',
            {'election_id': self.election.id},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body['ledger_ok'])
        self.assertEqual(body['errors'], [])
        self.assertEqual(body['block_count'], 1)

    def test_ledger_integrity_endpoint_rejects_public_user(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(
            '/api/voting/results/ledger_integrity/',
            {'election_id': self.election.id},
        )
        self.assertIn(response.status_code, (401, 403))


class VoteReceiptCodeFormatTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='receipt_user', password='x')
        now = timezone.now()
        self.election = SchoolElection.objects.create(
            election_type='university',
            start_year=2024,
            end_year=2025,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=1),
        )

    def test_generated_receipt_code_is_short_and_grouped(self):
        receipt = VoteReceipt.objects.create(user=self.user, election=self.election)
        self.assertEqual(len(VoteReceipt.normalize_receipt_code(receipt.receipt_code)), VoteReceipt.RECEIPT_RAW_LENGTH)
        self.assertIn('-', receipt.receipt_code)

    def test_verify_receipt_accepts_hyphenless_lowercase_input(self):
        receipt = VoteReceipt.objects.create(user=self.user, election=self.election)
        compact_code = VoteReceipt.normalize_receipt_code(receipt.receipt_code)
        self.assertTrue(receipt.verify_receipt(compact_code))

    def test_receipt_list_does_not_expose_full_receipt_code(self):
        receipt = VoteReceipt.objects.create(user=self.user, election=self.election)
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/voting/receipts/my_receipts/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        row = response.json()[0]
        self.assertIn('masked_receipt_code', row)
        self.assertNotIn('receipt_code', row)
