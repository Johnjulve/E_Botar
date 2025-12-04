"""
Performance Testing Suite for E-Botar Backend API
Standard metrics for measuring API effectiveness:
- Response Time (latency)
- Throughput (requests per second)
- Error Rate
- Concurrent User Handling
- Database Query Performance
- Algorithm Performance Benchmarks
"""

import os
import sys
import django
import time
import statistics
from datetime import datetime
from typing import Dict, List, Tuple, Any
import json

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from rest_framework.test import APIClient
from apps.elections.models import SchoolElection, SchoolPosition
from apps.candidates.models import Candidate
from apps.voting.models import AnonVote, Ballot, VoteReceipt
from apps.accounts.models import UserProfile
from apps.common.algorithms import (
    SortingAlgorithm, AggregationAlgorithm, 
    SearchingAlgorithm, DataGroupingAlgorithm
)


class PerformanceMetrics:
    """Collect and analyze performance metrics"""
    
    def __init__(self):
        self.results = {
            'response_times': [],
            'errors': [],
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'start_time': None,
            'end_time': None
        }
    
    def record_request(self, response_time: float, success: bool, error: str = None):
        """Record a single request metric"""
        self.results['total_requests'] += 1
        self.results['response_times'].append(response_time)
        
        if success:
            self.results['successful_requests'] += 1
        else:
            self.results['failed_requests'] += 1
            if error:
                self.results['errors'].append(error)
    
    def calculate_metrics(self) -> Dict[str, Any]:
        """Calculate standard API performance metrics"""
        if not self.results['response_times']:
            return {}
        
        response_times = self.results['response_times']
        total_time = (self.results['end_time'] - self.results['start_time']).total_seconds() if self.results['end_time'] and self.results['start_time'] else 0
        
        metrics = {
            # Response Time Metrics
            'avg_response_time_ms': statistics.mean(response_times) * 1000,
            'median_response_time_ms': statistics.median(response_times) * 1000,
            'p95_response_time_ms': self._percentile(response_times, 95) * 1000,
            'p99_response_time_ms': self._percentile(response_times, 99) * 1000,
            'min_response_time_ms': min(response_times) * 1000,
            'max_response_time_ms': max(response_times) * 1000,
            
            # Throughput Metrics
            'requests_per_second': self.results['total_requests'] / total_time if total_time > 0 else 0,
            'total_requests': self.results['total_requests'],
            
            # Reliability Metrics
            'success_rate': (self.results['successful_requests'] / self.results['total_requests'] * 100) if self.results['total_requests'] > 0 else 0,
            'error_rate': (self.results['failed_requests'] / self.results['total_requests'] * 100) if self.results['total_requests'] > 0 else 0,
            'error_count': self.results['failed_requests'],
            
            # Standard API Quality Ratings
            'api_quality_score': self._calculate_quality_score(),
            'performance_rating': self._rate_performance(),
        }
        
        return metrics
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def _calculate_quality_score(self) -> float:
        """Calculate overall API quality score (0-100)"""
        if not self.results['response_times']:
            return 0.0
        
        avg_response = statistics.mean(self.results['response_times']) * 1000  # Convert to ms
        success_rate = (self.results['successful_requests'] / self.results['total_requests'] * 100) if self.results['total_requests'] > 0 else 0
        
        # Scoring criteria:
        # - Response time: < 200ms = 100, < 500ms = 80, < 1000ms = 60, < 2000ms = 40, >= 2000ms = 20
        # - Success rate: 100% = 100, 99% = 90, 95% = 70, 90% = 50, < 90% = 20
        
        if avg_response < 200:
            time_score = 100
        elif avg_response < 500:
            time_score = 80
        elif avg_response < 1000:
            time_score = 60
        elif avg_response < 2000:
            time_score = 40
        else:
            time_score = 20
        
        if success_rate >= 99.9:
            reliability_score = 100
        elif success_rate >= 99:
            reliability_score = 90
        elif success_rate >= 95:
            reliability_score = 70
        elif success_rate >= 90:
            reliability_score = 50
        else:
            reliability_score = 20
        
        # Weighted average: 60% response time, 40% reliability
        quality_score = (time_score * 0.6) + (reliability_score * 0.4)
        return round(quality_score, 2)
    
    def _rate_performance(self) -> str:
        """Rate performance based on standard benchmarks"""
        if not self.results['response_times']:
            return "No Data"
        
        avg_response = statistics.mean(self.results['response_times']) * 1000  # ms
        success_rate = (self.results['successful_requests'] / self.results['total_requests'] * 100) if self.results['total_requests'] > 0 else 0
        
        # Standard API Performance Ratings:
        # Excellent: < 200ms avg, > 99.9% success
        # Good: < 500ms avg, > 99% success
        # Acceptable: < 1000ms avg, > 95% success
        # Poor: < 2000ms avg, > 90% success
        # Critical: >= 2000ms or < 90% success
        
        if avg_response < 200 and success_rate >= 99.9:
            return "Excellent"
        elif avg_response < 500 and success_rate >= 99:
            return "Good"
        elif avg_response < 1000 and success_rate >= 95:
            return "Acceptable"
        elif avg_response < 2000 and success_rate >= 90:
            return "Poor"
        else:
            return "Critical"


class APIPerformanceTester:
    """Test API endpoint performance"""
    
    def __init__(self):
        self.client = APIClient()
        self.metrics = PerformanceMetrics()
        self.test_user = None
        self.test_election = None
    
    def setup_test_data(self):
        """Create test data for performance testing"""
        print("Setting up test data...")
        
        # Create test user
        self.test_user, _ = User.objects.get_or_create(
            username='perf_test_user',
            defaults={'email': 'perf@test.com', 'is_active': True}
        )
        self.test_user.set_password('testpass123')
        self.test_user.save()
        
        # Get or create test election
        self.test_election = SchoolElection.objects.first()
        if not self.test_election:
            print("⚠️  No election found. Please create an election first.")
            return False
        
        # Authenticate client (bypass ALLOWED_HOSTS for testing)
        try:
            response = self.client.post('/api/auth/token/', {
                'username': 'perf_test_user',
                'password': 'testpass123'
            }, SERVER_NAME='testserver')
            if response.status_code == 200:
                token = response.data.get('access')
                self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
                print("✓ Test user authenticated")
                return True
            else:
                print(f"⚠️  Could not authenticate test user: {response.status_code}")
                return False
        except Exception as e:
            print(f"⚠️  Authentication error: {e}")
            # Continue without authentication for public endpoints
            return False
    
    def test_endpoint(self, method: str, url: str, data: Dict = None, iterations: int = 10) -> Dict:
        """Test a single endpoint performance"""
        print(f"\nTesting {method} {url} ({iterations} iterations)...")
        
        self.metrics.results['start_time'] = datetime.now()
        response_times = []
        errors = []
        
        for i in range(iterations):
            start = time.time()
            
            try:
                if method.upper() == 'GET':
                    response = self.client.get(url)
                elif method.upper() == 'POST':
                    response = self.client.post(url, data, format='json')
                elif method.upper() == 'PUT':
                    response = self.client.put(url, data, format='json')
                elif method.upper() == 'PATCH':
                    response = self.client.patch(url, data, format='json')
                elif method.upper() == 'DELETE':
                    response = self.client.delete(url)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                elapsed = time.time() - start
                response_times.append(elapsed)
                
                success = 200 <= response.status_code < 300
                error = None if success else f"HTTP {response.status_code}"
                
                self.metrics.record_request(elapsed, success, error)
                
            except Exception as e:
                elapsed = time.time() - start
                response_times.append(elapsed)
                error = str(e)
                self.metrics.record_request(elapsed, False, error)
                errors.append(error)
        
        self.metrics.results['end_time'] = datetime.now()
        
        # Calculate metrics for this endpoint
        endpoint_metrics = self.metrics.calculate_metrics()
        
        print(f"  Average Response Time: {endpoint_metrics.get('avg_response_time_ms', 0):.2f} ms")
        print(f"  Success Rate: {endpoint_metrics.get('success_rate', 0):.2f}%")
        print(f"  Requests/Second: {endpoint_metrics.get('requests_per_second', 0):.2f}")
        
        return endpoint_metrics
    
    def test_critical_endpoints(self, iterations: int = 10):
        """Test critical API endpoints"""
        print("=" * 70)
        print("API Performance Testing - Critical Endpoints")
        print("=" * 70)
        
        if not self.setup_test_data():
            return
        
        results = {}
        
        # Public endpoints (test without authentication)
        print("\n--- Public Endpoints ---")
        try:
            results['health_check'] = self.test_endpoint('GET', '/api/auth/health/', iterations=iterations)
        except Exception as e:
            print(f"  ⚠️  Health check failed: {e}")
            results['health_check'] = {}
        
        try:
            results['elections_list'] = self.test_endpoint('GET', '/api/elections/elections/', iterations=iterations)
        except Exception as e:
            print(f"  ⚠️  Elections list failed: {e}")
            results['elections_list'] = {}
        
        if self.test_election:
            results['election_results'] = self.test_endpoint(
                'GET', 
                f'/api/voting/results/election_results/?election_id={self.test_election.id}',
                iterations=iterations
            )
            results['election_statistics'] = self.test_endpoint(
                'GET',
                f'/api/voting/results/statistics/?election_id={self.test_election.id}',
                iterations=iterations
            )
        
        # Authenticated endpoints
        print("\n--- Authenticated Endpoints ---")
        results['user_profile'] = self.test_endpoint('GET', '/api/auth/me/', iterations=iterations)
        
        return results


class AlgorithmBenchmark:
    """Benchmark algorithm performance"""
    
    @staticmethod
    def benchmark_sorting(data_sizes: List[int] = [100, 500, 1000, 5000, 10000]):
        """Benchmark sorting algorithms"""
        print("\n" + "=" * 70)
        print("Algorithm Performance Benchmarks - Sorting")
        print("=" * 70)
        
        results = []
        
        for size in data_sizes:
            # Generate test data
            test_data = [
                {'id': i, 'votes': (i * 17) % 1000}  # Pseudo-random distribution
                for i in range(size)
            ]
            
            # Benchmark Quicksort
            start = time.time()
            sorted_quick = SortingAlgorithm.quicksort(
                test_data.copy(),
                key=lambda x: x['votes'],
                reverse=True
            )
            quick_time = (time.time() - start) * 1000  # Convert to ms
            
            # Benchmark Mergesort
            start = time.time()
            sorted_merge = SortingAlgorithm.mergesort(
                test_data.copy(),
                key=lambda x: x['votes'],
                reverse=True
            )
            merge_time = (time.time() - start) * 1000  # Convert to ms
            
            # Benchmark Python's built-in sorted (for comparison)
            start = time.time()
            sorted_builtin = sorted(
                test_data.copy(),
                key=lambda x: x['votes'],
                reverse=True
            )
            builtin_time = (time.time() - start) * 1000  # Convert to ms
            
            results.append({
                'data_size': size,
                'quicksort_ms': round(quick_time, 3),
                'mergesort_ms': round(merge_time, 3),
                'builtin_sorted_ms': round(builtin_time, 3)
            })
            
            print(f"\nData Size: {size} items")
            print(f"  Quicksort:    {quick_time:.3f} ms")
            print(f"  Mergesort:    {merge_time:.3f} ms")
            print(f"  Built-in:     {builtin_time:.3f} ms")
        
        return results
    
    @staticmethod
    def benchmark_aggregation(data_sizes: List[int] = [100, 500, 1000, 5000, 10000]):
        """Benchmark aggregation algorithms"""
        print("\n" + "=" * 70)
        print("Algorithm Performance Benchmarks - Aggregation")
        print("=" * 70)
        
        results = []
        
        for size in data_sizes:
            # Generate test data
            test_data = [
                {'candidate_id': i % 10, 'votes': (i * 7) % 100}
                for i in range(size)
            ]
            
            # Benchmark Aggregation Algorithm
            start = time.time()
            aggregated = AggregationAlgorithm.aggregate(
                test_data,
                key_func=lambda v: v['candidate_id'],
                value_func=lambda v: v['votes'],
                operation='sum'
            )
            agg_time = (time.time() - start) * 1000  # Convert to ms
            
            # Benchmark manual aggregation (for comparison)
            start = time.time()
            manual_agg = {}
            for item in test_data:
                key = item['candidate_id']
                if key not in manual_agg:
                    manual_agg[key] = 0
                manual_agg[key] += item['votes']
            manual_time = (time.time() - start) * 1000  # Convert to ms
            
            results.append({
                'data_size': size,
                'algorithm_ms': round(agg_time, 3),
                'manual_ms': round(manual_time, 3),
                'speedup': round(manual_time / agg_time, 2) if agg_time > 0 else 0
            })
            
            print(f"\nData Size: {size} items")
            print(f"  Algorithm:    {agg_time:.3f} ms")
            print(f"  Manual:       {manual_time:.3f} ms")
            if agg_time > 0:
                print(f"  Speedup:      {manual_time / agg_time:.2f}x")
        
        return results
    
    @staticmethod
    def benchmark_searching(data_sizes: List[int] = [100, 500, 1000, 5000, 10000]):
        """Benchmark searching algorithms"""
        print("\n" + "=" * 70)
        print("Algorithm Performance Benchmarks - Searching")
        print("=" * 70)
        
        results = []
        
        for size in data_sizes:
            # Generate sorted test data
            test_data = sorted([i for i in range(size)])
            target = size // 2  # Search for middle element
            
            # Benchmark Binary Search
            start = time.time()
            for _ in range(100):  # Multiple searches for accurate timing
                index = SearchingAlgorithm.binary_search(test_data, target)
            binary_time = (time.time() - start) * 1000 / 100  # Average per search
            
            # Benchmark Linear Search (using find_all as alternative)
            start = time.time()
            for _ in range(100):
                # Simulate linear search by checking each element
                index = -1
                for i, val in enumerate(test_data):
                    if val == target:
                        index = i
                        break
            linear_time = (time.time() - start) * 1000 / 100  # Average per search
            
            results.append({
                'data_size': size,
                'binary_search_ms': round(binary_time, 6),
                'linear_search_ms': round(linear_time, 3),
                'speedup': round(linear_time / binary_time, 2) if binary_time > 0 else 0
            })
            
            print(f"\nData Size: {size} items")
            print(f"  Binary Search: {binary_time:.6f} ms")
            print(f"  Linear Search:  {linear_time:.3f} ms")
            if binary_time > 0:
                print(f"  Speedup:       {linear_time / binary_time:.2f}x")
        
        return results


class DatabaseQueryAnalyzer:
    """Analyze database query performance"""
    
    @staticmethod
    def analyze_query_performance():
        """Analyze database query performance using Django's query counting"""
        from django.db import connection
        from django.test.utils import override_settings
        
        print("\n" + "=" * 70)
        print("Database Query Performance Analysis")
        print("=" * 70)
        
        # Reset query count
        connection.queries_log.clear()
        
        # Test election results query
        print("\n--- Testing Election Results Query ---")
        start = time.time()
        
        elections = SchoolElection.objects.all()[:5]
        for election in elections:
            # Simulate the query pattern from election_results view
            positions = election.election_positions.all().order_by('order')
            for ep in positions:
                if ep.position:
                    votes = AnonVote.objects.filter(
                        election=election,
                        position=ep.position
                    ).values('candidate_id')
                    list(votes)  # Force evaluation
        
        elapsed = time.time() - start
        query_count = len(connection.queries)
        
        print(f"  Execution Time: {elapsed * 1000:.2f} ms")
        print(f"  Query Count: {query_count}")
        print(f"  Average Query Time: {(elapsed / query_count * 1000) if query_count > 0 else 0:.2f} ms")
        
        # Analyze query types
        query_types = {}
        for query in connection.queries:
            query_type = query['sql'].split()[0].upper()
            query_types[query_type] = query_types.get(query_type, 0) + 1
        
        print(f"\n  Query Types:")
        for qtype, count in query_types.items():
            print(f"    {qtype}: {count}")
        
        return {
            'execution_time_ms': elapsed * 1000,
            'query_count': query_count,
            'avg_query_time_ms': (elapsed / query_count * 1000) if query_count > 0 else 0,
            'query_types': query_types
        }


def generate_performance_report():
    """Generate comprehensive performance report"""
    print("\n" + "=" * 70)
    print("E-Botar Backend API Performance Report")
    print("=" * 70)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # API Performance Tests
    api_tester = APIPerformanceTester()
    api_results = api_tester.test_critical_endpoints(iterations=20)
    
    # Algorithm Benchmarks
    algo_benchmark = AlgorithmBenchmark()
    sorting_results = algo_benchmark.benchmark_sorting([100, 1000, 5000])
    aggregation_results = algo_benchmark.benchmark_aggregation([100, 1000, 5000])
    searching_results = algo_benchmark.benchmark_searching([100, 1000, 5000])
    
    # Database Query Analysis
    db_analyzer = DatabaseQueryAnalyzer()
    db_results = db_analyzer.analyze_query_performance()
    
    # Generate summary
    print("\n" + "=" * 70)
    print("Performance Summary")
    print("=" * 70)
    
    if api_results:
        print("\n--- API Endpoint Performance ---")
        for endpoint, metrics in api_results.items():
            print(f"\n{endpoint}:")
            print(f"  Avg Response Time: {metrics.get('avg_response_time_ms', 0):.2f} ms")
            print(f"  P95 Response Time: {metrics.get('p95_response_time_ms', 0):.2f} ms")
            print(f"  Success Rate: {metrics.get('success_rate', 0):.2f}%")
            print(f"  Performance Rating: {metrics.get('performance_rating', 'N/A')}")
            print(f"  Quality Score: {metrics.get('api_quality_score', 0):.2f}/100")
    
    print("\n--- Algorithm Performance ---")
    print(f"Sorting: Tested up to {sorting_results[-1]['data_size']} items")
    print(f"Aggregation: Tested up to {aggregation_results[-1]['data_size']} items")
    print(f"Searching: Tested up to {searching_results[-1]['data_size']} items")
    
    print("\n--- Database Performance ---")
    print(f"Query Count: {db_results.get('query_count', 0)}")
    print(f"Execution Time: {db_results.get('execution_time_ms', 0):.2f} ms")
    print(f"Avg Query Time: {db_results.get('avg_query_time_ms', 0):.2f} ms")
    
    # Save results to file
    report_data = {
        'timestamp': datetime.now().isoformat(),
        'api_results': api_results,
        'algorithm_benchmarks': {
            'sorting': sorting_results,
            'aggregation': aggregation_results,
            'searching': searching_results
        },
        'database_performance': db_results
    }
    
    report_file = 'performance_report.json'
    with open(report_file, 'w') as f:
        json.dump(report_data, f, indent=2)
    
    print(f"\n✓ Detailed report saved to: {report_file}")
    
    return report_data


class Command(BaseCommand):
    """Django management command for running performance tests"""
    
    help = 'Run comprehensive performance tests for E-Botar backend API'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--iterations',
            type=int,
            default=20,
            help='Number of iterations for API endpoint tests (default: 20)',
        )
        parser.add_argument(
            '--skip-algorithms',
            action='store_true',
            help='Skip algorithm benchmarks',
        )
        parser.add_argument(
            '--skip-db',
            action='store_true',
            help='Skip database query analysis',
        )
    
    def handle(self, *args, **options):
        """Execute the performance tests"""
        iterations = options.get('iterations', 20)
        skip_algorithms = options.get('skip_algorithms', False)
        skip_db = options.get('skip_db', False)
        
        self.stdout.write(self.style.SUCCESS('\n' + "=" * 70))
        self.stdout.write(self.style.SUCCESS('E-Botar Backend API Performance Report'))
        self.stdout.write(self.style.SUCCESS("=" * 70))
        self.stdout.write(self.style.SUCCESS(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"))
        
        # API Performance Tests
        self.stdout.write(self.style.WARNING('Running API Performance Tests...'))
        api_tester = APIPerformanceTester()
        api_results = api_tester.test_critical_endpoints(iterations=iterations)
        
        # Algorithm Benchmarks
        if not skip_algorithms:
            self.stdout.write(self.style.WARNING('\nRunning Algorithm Benchmarks...'))
            algo_benchmark = AlgorithmBenchmark()
            sorting_results = algo_benchmark.benchmark_sorting([100, 1000, 5000])
            aggregation_results = algo_benchmark.benchmark_aggregation([100, 1000, 5000])
            searching_results = algo_benchmark.benchmark_searching([100, 1000, 5000])
        else:
            sorting_results = []
            aggregation_results = []
            searching_results = []
        
        # Database Query Analysis
        if not skip_db:
            self.stdout.write(self.style.WARNING('\nRunning Database Query Analysis...'))
            db_analyzer = DatabaseQueryAnalyzer()
            db_results = db_analyzer.analyze_query_performance()
        else:
            db_results = {}
        
        # Generate summary
        self.stdout.write(self.style.SUCCESS("\n" + "=" * 70))
        self.stdout.write(self.style.SUCCESS("Performance Summary"))
        self.stdout.write(self.style.SUCCESS("=" * 70))
        
        if api_results:
            self.stdout.write(self.style.SUCCESS("\n--- API Endpoint Performance ---"))
            for endpoint, metrics in api_results.items():
                self.stdout.write(f"\n{endpoint}:")
                self.stdout.write(f"  Avg Response Time: {metrics.get('avg_response_time_ms', 0):.2f} ms")
                self.stdout.write(f"  P95 Response Time: {metrics.get('p95_response_time_ms', 0):.2f} ms")
                self.stdout.write(f"  Success Rate: {metrics.get('success_rate', 0):.2f}%")
                self.stdout.write(f"  Performance Rating: {metrics.get('performance_rating', 'N/A')}")
                self.stdout.write(f"  Quality Score: {metrics.get('api_quality_score', 0):.2f}/100")
        
        if not skip_algorithms:
            self.stdout.write(self.style.SUCCESS("\n--- Algorithm Performance ---"))
            if sorting_results:
                self.stdout.write(f"Sorting: Tested up to {sorting_results[-1]['data_size']} items")
            if aggregation_results:
                self.stdout.write(f"Aggregation: Tested up to {aggregation_results[-1]['data_size']} items")
            if searching_results:
                self.stdout.write(f"Searching: Tested up to {searching_results[-1]['data_size']} items")
        
        if not skip_db:
            self.stdout.write(self.style.SUCCESS("\n--- Database Performance ---"))
            self.stdout.write(f"Query Count: {db_results.get('query_count', 0)}")
            self.stdout.write(f"Execution Time: {db_results.get('execution_time_ms', 0):.2f} ms")
            self.stdout.write(f"Avg Query Time: {db_results.get('avg_query_time_ms', 0):.2f} ms")
        
        # Save results to file
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'api_results': api_results,
            'algorithm_benchmarks': {
                'sorting': sorting_results,
                'aggregation': aggregation_results,
                'searching': searching_results
            },
            'database_performance': db_results
        }
        
        report_file = 'performance_report.json'
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        self.stdout.write(self.style.SUCCESS(f"\n✓ Detailed report saved to: {report_file}"))


if __name__ == '__main__':
    generate_performance_report()

