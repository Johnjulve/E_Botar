"""
Quick Performance Test - Simplified version for easy testing
Run this to quickly test API performance without full setup
"""

import os
import sys
import django
import time
import requests
from typing import Dict, List

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.core.management.base import BaseCommand
from apps.common.algorithms import SortingAlgorithm, AggregationAlgorithm, SearchingAlgorithm


def test_api_endpoint(url: str, method: str = 'GET', data: Dict = None, headers: Dict = None, iterations: int = 10):
    """Test a single API endpoint"""
    print(f"\nTesting {method} {url} ({iterations} iterations)...")
    
    response_times = []
    errors = []
    success_count = 0
    
    for i in range(iterations):
        try:
            start = time.time()
            
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            elapsed = (time.time() - start) * 1000  # Convert to ms
            response_times.append(elapsed)
            
            if 200 <= response.status_code < 300:
                success_count += 1
            else:
                errors.append(f"HTTP {response.status_code}")
                
        except Exception as e:
            errors.append(str(e))
            if response_times:
                response_times.append(response_times[-1] * 1.5)  # Estimate
    
    if response_times:
        avg_time = sum(response_times) / len(response_times)
        success_rate = (success_count / iterations) * 100
        
        print(f"  ✓ Average Response Time: {avg_time:.2f} ms")
        print(f"  ✓ Success Rate: {success_rate:.2f}%")
        print(f"  ✓ Min: {min(response_times):.2f} ms, Max: {max(response_times):.2f} ms")
        
        # Rating
        if avg_time < 200 and success_rate >= 99:
            rating = "Excellent"
        elif avg_time < 500 and success_rate >= 99:
            rating = "Good"
        elif avg_time < 1000 and success_rate >= 95:
            rating = "Acceptable"
        else:
            rating = "Needs Improvement"
        
        print(f"  ✓ Rating: {rating}")
        
        return {
            'avg_time_ms': avg_time,
            'success_rate': success_rate,
            'rating': rating
        }
    else:
        print(f"  ✗ All requests failed")
        return None


def quick_algorithm_benchmark():
    """Quick algorithm performance test"""
    print("\n" + "=" * 60)
    print("Quick Algorithm Benchmark")
    print("=" * 60)
    
    # Test sorting
    print("\n--- Sorting Test (5000 items) ---")
    test_data = [{'id': i, 'votes': (i * 17) % 1000} for i in range(5000)]
    
    start = time.time()
    sorted_quick = SortingAlgorithm.quicksort(test_data.copy(), key=lambda x: x['votes'], reverse=True)
    quick_time = (time.time() - start) * 1000
    print(f"Quicksort: {quick_time:.2f} ms")
    
    # Test aggregation
    print("\n--- Aggregation Test (5000 items) ---")
    vote_data = [{'candidate_id': i % 10, 'votes': (i * 7) % 100} for i in range(5000)]
    
    start = time.time()
    aggregated = AggregationAlgorithm.aggregate(
        vote_data,
        key_func=lambda v: v['candidate_id'],
        value_func=lambda v: v['votes'],
        operation='sum'
    )
    agg_time = (time.time() - start) * 1000
    print(f"Aggregation: {agg_time:.2f} ms")
    print(f"Result: {len(aggregated)} candidates aggregated")
    
    # Test binary search
    print("\n--- Binary Search Test (5000 items) ---")
    sorted_list = sorted([i for i in range(5000)])
    target = 2500
    
    start = time.time()
    for _ in range(1000):
        index = SearchingAlgorithm.binary_search(sorted_list, target)
    search_time = (time.time() - start) * 1000 / 1000  # Average
    print(f"Binary Search (avg of 1000): {search_time:.6f} ms")
    
    print("\n✓ Algorithm benchmarks complete!")


class Command(BaseCommand):
    """Django management command for quick performance testing"""
    
    help = 'Run quick performance tests for E-Botar backend API'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--base-url',
            type=str,
            default='http://localhost:8000',
            help='Base URL for API server (default: http://localhost:8000)',
        )
        parser.add_argument(
            '--iterations',
            type=int,
            default=10,
            help='Number of iterations for API endpoint tests (default: 10)',
        )
        parser.add_argument(
            '--skip-api',
            action='store_true',
            help='Skip API endpoint tests',
        )
        parser.add_argument(
            '--skip-algorithms',
            action='store_true',
            help='Skip algorithm benchmarks',
        )
    
    def handle(self, *args, **options):
        """Execute the quick performance tests"""
        base_url = options.get('base_url', 'http://localhost:8000')
        iterations = options.get('iterations', 10)
        skip_api = options.get('skip_api', False)
        skip_algorithms = options.get('skip_algorithms', False)
        
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("E-Botar Quick Performance Test"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        
        if not skip_api:
            self.stdout.write(self.style.WARNING("\nNote: Make sure the Django server is running!"))
            self.stdout.write(self.style.WARNING("Start server: python manage.py runserver\n"))
            
            # Test API endpoints (if server is running)
            try:
                # Test public endpoints
                self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
                self.stdout.write(self.style.SUCCESS("API Endpoint Tests"))
                self.stdout.write(self.style.SUCCESS("=" * 60))
                
                test_api_endpoint(f"{base_url}/api/elections/elections/", iterations=iterations)
                
                # You can add more endpoint tests here
                # test_api_endpoint(f"{base_url}/api/voting/results/election_results/?election_id=1", iterations=iterations)
                
            except requests.exceptions.ConnectionError:
                self.stdout.write(self.style.WARNING("\n⚠️  Could not connect to API server."))
                self.stdout.write(self.style.WARNING("   Make sure Django server is running: python manage.py runserver"))
                self.stdout.write(self.style.WARNING("   Skipping API tests..."))
        
        # Always run algorithm benchmarks unless skipped
        if not skip_algorithms:
            quick_algorithm_benchmark()
        
        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS("✓ Quick Performance Test Complete!"))
        self.stdout.write(self.style.SUCCESS("=" * 60))


if __name__ == '__main__':
    print("=" * 60)
    print("E-Botar Quick Performance Test")
    print("=" * 60)
    print("\nNote: Make sure the Django server is running!")
    print("Start server: python manage.py runserver")
    print()
    
    # Test API endpoints (if server is running)
    base_url = "http://localhost:8000"
    
    try:
        # Test public endpoints
        print("\n" + "=" * 60)
        print("API Endpoint Tests")
        print("=" * 60)
        
        test_api_endpoint(f"{base_url}/api/elections/elections/", iterations=10)
        
        # You can add more endpoint tests here
        # test_api_endpoint(f"{base_url}/api/voting/results/election_results/?election_id=1", iterations=10)
        
    except requests.exceptions.ConnectionError:
        print("\n⚠️  Could not connect to API server.")
        print("   Make sure Django server is running: python manage.py runserver")
        print("   Skipping API tests...")
    
    # Always run algorithm benchmarks
    quick_algorithm_benchmark()
    
    print("\n" + "=" * 60)
    print("✓ Quick Performance Test Complete!")
    print("=" * 60)
