"""
Django management command to test the caching services.

Usage:
    python manage.py test_caching_services
"""

from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.utils import timezone
from apps.elections.services import ElectionDataService
from apps.voting.services import VotingDataService
from apps.elections.models import SchoolElection
import time


class Command(BaseCommand):
    help = 'Test the caching services for elections and voting'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-cache',
            action='store_true',
            help='Clear all cache before running tests',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('Testing E-Botar Caching Services'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))

        # Clear cache if requested
        if options['clear_cache']:
            cache.clear()
            self.stdout.write(self.style.WARNING('✓ Cache cleared\n'))

        # Test 1: Get all active elections
        self.test_active_elections()
        
        # Test 2: Get election with related data
        self.test_election_with_related()
        
        # Test 3: Get upcoming elections
        self.test_upcoming_elections()
        
        # Test 4: Get election statistics
        self.test_election_statistics()
        
        # Test 5: Get active positions
        self.test_active_positions()
        
        # Test 6: Get all parties
        self.test_all_parties()
        
        # Test 7: Voting results (if elections exist)
        self.test_voting_results()
        
        # Test 8: Cache performance
        self.test_cache_performance()
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('All tests completed!'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))

    def test_active_elections(self):
        self.stdout.write(self.style.HTTP_INFO('\n[TEST 1] Getting all active elections...'))
        
        try:
            elections = ElectionDataService.get_all_active_elections()
            self.stdout.write(f'  ✓ Found {len(elections)} active election(s)')
            
            for election in elections:
                self.stdout.write(f'    - {election.title} (ID: {election.id})')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))

    def test_election_with_related(self):
        self.stdout.write(self.style.HTTP_INFO('\n[TEST 2] Getting election with related data...'))
        
        try:
            # Get first election
            election = SchoolElection.objects.first()
            if not election:
                self.stdout.write(self.style.WARNING('  ⚠ No elections found in database'))
                return
            
            # Test cached method
            cached_election = ElectionDataService.get_election_with_related(election.id)
            self.stdout.write(f'  ✓ Retrieved: {cached_election.title}')
            self.stdout.write(f'    - Start: {cached_election.start_date}')
            self.stdout.write(f'    - End: {cached_election.end_date}')
            self.stdout.write(f'    - Active: {cached_election.is_active_now()}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))

    def test_upcoming_elections(self):
        self.stdout.write(self.style.HTTP_INFO('\n[TEST 3] Getting upcoming elections...'))
        
        try:
            elections = ElectionDataService.get_upcoming_elections()
            self.stdout.write(f'  ✓ Found {len(elections)} upcoming election(s)')
            
            for election in elections:
                days_until = (election.start_date - timezone.now()).days
                self.stdout.write(f'    - {election.title} (starts in {days_until} days)')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))

    def test_election_statistics(self):
        self.stdout.write(self.style.HTTP_INFO('\n[TEST 4] Getting election statistics...'))
        
        try:
            election = SchoolElection.objects.first()
            if not election:
                self.stdout.write(self.style.WARNING('  ⚠ No elections found'))
                return
            
            stats = ElectionDataService.get_election_statistics(election.id)
            self.stdout.write(f'  ✓ Statistics for: {election.title}')
            self.stdout.write(f'    - Total Positions: {stats["total_positions"]}')
            self.stdout.write(f'    - Total Candidates: {stats["total_candidates"]}')
            self.stdout.write(f'    - Total Votes: {stats["total_votes"]}')
            self.stdout.write(f'    - Total Voters: {stats["total_voters"]}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))

    def test_active_positions(self):
        self.stdout.write(self.style.HTTP_INFO('\n[TEST 5] Getting active positions with candidates...'))
        
        try:
            election = SchoolElection.objects.first()
            if not election:
                self.stdout.write(self.style.WARNING('  ⚠ No elections found'))
                return
            
            positions = ElectionDataService.get_active_positions_with_candidates(election.id)
            self.stdout.write(f'  ✓ Found {len(positions)} active position(s)')
            
            for position in positions[:3]:  # Show first 3
                candidates_count = position.candidates.count()
                self.stdout.write(f'    - {position.name}: {candidates_count} candidate(s)')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))

    def test_all_parties(self):
        self.stdout.write(self.style.HTTP_INFO('\n[TEST 6] Getting all parties...'))
        
        try:
            parties = ElectionDataService.get_all_parties()
            self.stdout.write(f'  ✓ Found {len(parties)} political party/parties')
            
            for party in parties:
                self.stdout.write(f'    - {party.name}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))

    def test_voting_results(self):
        self.stdout.write(self.style.HTTP_INFO('\n[TEST 7] Getting voting results...'))
        
        try:
            election = SchoolElection.objects.first()
            if not election:
                self.stdout.write(self.style.WARNING('  ⚠ No elections found'))
                return
            
            # Get live results (returns QuerySet)
            results = VotingDataService.get_live_results(election.id)
            self.stdout.write(f'  ✓ Live results retrieved')
            self.stdout.write(f'    - Result count: {results.count()}')
            
            # Get statistics
            stats = VotingDataService.get_election_statistics(election.id)
            self.stdout.write(f'  ✓ Voting statistics')
            self.stdout.write(f'    - Turnout: {stats["turnout_percentage"]:.1f}%')
            self.stdout.write(f'    - Completed Ballots: {stats["completed_ballots"]}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))

    def test_cache_performance(self):
        self.stdout.write(self.style.HTTP_INFO('\n[TEST 8] Testing cache performance...'))
        
        try:
            election = SchoolElection.objects.first()
            if not election:
                self.stdout.write(self.style.WARNING('  ⚠ No elections found'))
                return
            
            # First call (cache miss)
            start_time = time.time()
            result1 = ElectionDataService.get_election_with_related(election.id)
            first_call_time = (time.time() - start_time) * 1000
            
            # Second call (cache hit)
            start_time = time.time()
            result2 = ElectionDataService.get_election_with_related(election.id)
            second_call_time = (time.time() - start_time) * 1000
            
            self.stdout.write(f'  ✓ Performance comparison:')
            self.stdout.write(f'    - First call (cache miss): {first_call_time:.2f}ms')
            self.stdout.write(f'    - Second call (cache hit): {second_call_time:.2f}ms')
            
            if second_call_time > 0 and second_call_time < first_call_time:
                speedup = first_call_time / second_call_time
                self.stdout.write(self.style.SUCCESS(f'    - Speedup: {speedup:.1f}x faster with cache!'))
            elif second_call_time == 0:
                self.stdout.write(self.style.SUCCESS(f'    - Cache hit is instant (< 0.01ms)!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))
