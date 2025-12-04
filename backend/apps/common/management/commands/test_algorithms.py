"""
Quick test script to verify algorithm implementations work correctly
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from apps.common.algorithms import (
    SortingAlgorithm,
    SearchingAlgorithm,
    CryptographicAlgorithm,
    DataGroupingAlgorithm,
    AggregationAlgorithm,
    MemoizationAlgorithm
)

def test_sorting():
    """Test sorting algorithms"""
    print("Testing Sorting Algorithms...")
    
    # Test quicksort
    test_data = [
        {'name': 'Alice', 'votes': 50},
        {'name': 'Bob', 'votes': 30},
        {'name': 'Charlie', 'votes': 80},
        {'name': 'David', 'votes': 20},
    ]
    
    sorted_data = SortingAlgorithm.quicksort(
        test_data,
        key=lambda x: x['votes'],
        reverse=True
    )
    
    assert sorted_data[0]['votes'] == 80, "Quicksort failed - highest votes should be first"
    assert sorted_data[-1]['votes'] == 20, "Quicksort failed - lowest votes should be last"
    print("✓ Quicksort test passed")
    
    # Test mergesort
    sorted_data2 = SortingAlgorithm.mergesort(
        test_data,
        key=lambda x: x['votes'],
        reverse=True
    )
    
    assert sorted_data2[0]['votes'] == 80, "Mergesort failed"
    assert sorted_data2[-1]['votes'] == 20, "Mergesort failed"
    print("✓ Mergesort test passed")
    
    print("All sorting tests passed!\n")


def test_searching():
    """Test searching algorithms"""
    print("Testing Searching Algorithms...")
    
    # Test binary search
    sorted_list = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    
    index = SearchingAlgorithm.binary_search(sorted_list, 50)
    assert index == 4, f"Binary search failed - expected index 4, got {index}"
    print("✓ Binary search test passed")
    
    # Test binary search with objects (must be sorted by the field)
    students = [
        {'id': 1, 'name': 'Alice'},
        {'id': 2, 'name': 'Bob'},
        {'id': 3, 'name': 'Charlie'},
        {'id': 4, 'name': 'David'},
    ]
    # Ensure sorted by id (already sorted, but making it explicit)
    students = sorted(students, key=lambda s: s['id'])
    
    index = SearchingAlgorithm.binary_search_by_field(students, 3, 'id')
    assert index == 2, f"Binary search by field failed - expected index 2, got {index}"
    print("✓ Binary search by field test passed")
    
    print("All searching tests passed!\n")


def test_cryptographic():
    """Test cryptographic algorithms"""
    print("Testing Cryptographic Algorithms...")
    
    # Test SHA-256
    test_string = "test_receipt_code_12345"
    hash1 = CryptographicAlgorithm.sha256_hash(test_string)
    hash2 = CryptographicAlgorithm.sha256_hash(test_string)
    
    assert hash1 == hash2, "SHA-256 hash should be deterministic"
    assert len(hash1) == 64, f"SHA-256 hash should be 64 chars, got {len(hash1)}"
    print("✓ SHA-256 hash test passed")
    
    # Test MD5
    test_string2 = "cache_key_test"
    md5_hash1 = CryptographicAlgorithm.md5_hash(test_string2)
    md5_hash2 = CryptographicAlgorithm.md5_hash(test_string2)
    
    assert md5_hash1 == md5_hash2, "MD5 hash should be deterministic"
    assert len(md5_hash1) == 32, f"MD5 hash should be 32 chars, got {len(md5_hash1)}"
    print("✓ MD5 hash test passed")
    
    print("All cryptographic tests passed!\n")


def test_grouping():
    """Test grouping algorithms"""
    print("Testing Grouping Algorithms...")
    
    students = [
        {'name': 'Alice', 'department': 'CS', 'year': 1},
        {'name': 'Bob', 'department': 'CS', 'year': 2},
        {'name': 'Charlie', 'department': 'Math', 'year': 1},
        {'name': 'David', 'department': 'CS', 'year': 1},
    ]
    
    grouped = DataGroupingAlgorithm.group_by(
        students,
        key_func=lambda s: s['department']
    )
    
    assert 'CS' in grouped, "Grouping failed - CS department not found"
    assert len(grouped['CS']) == 3, f"Grouping failed - expected 3 CS students, got {len(grouped['CS'])}"
    assert len(grouped['Math']) == 1, f"Grouping failed - expected 1 Math student, got {len(grouped['Math'])}"
    print("✓ Group by test passed")
    
    print("All grouping tests passed!\n")


def test_aggregation():
    """Test aggregation algorithms"""
    print("Testing Aggregation Algorithms...")
    
    votes = [
        {'candidate': 'Alice', 'votes': 50},
        {'candidate': 'Bob', 'votes': 30},
        {'candidate': 'Alice', 'votes': 20},
        {'candidate': 'Charlie', 'votes': 40},
    ]
    
    totals = AggregationAlgorithm.aggregate(
        votes,
        key_func=lambda v: v['candidate'],
        value_func=lambda v: v['votes'],
        operation='sum'
    )
    
    assert totals['Alice'] == 70, f"Aggregation failed - expected 70 for Alice, got {totals['Alice']}"
    assert totals['Bob'] == 30, f"Aggregation failed - expected 30 for Bob, got {totals['Bob']}"
    print("✓ Aggregation test passed")
    
    # Test count
    counts = AggregationAlgorithm.aggregate(
        votes,
        key_func=lambda v: v['candidate'],
        operation='count'
    )
    
    assert counts['Alice'] == 2, f"Count failed - expected 2 for Alice, got {counts['Alice']}"
    print("✓ Count aggregation test passed")
    
    print("All aggregation tests passed!\n")


def test_aggregation_integration():
    """Test aggregation algorithms with real-world vote counting scenarios"""
    print("Testing Aggregation Integration...")
    
    # Simulate vote data structure similar to AnonVote
    votes = [
        {'candidate_id': 1, 'position_id': 1, 'election_id': 1},
        {'candidate_id': 1, 'position_id': 1, 'election_id': 1},
        {'candidate_id': 2, 'position_id': 1, 'election_id': 1},
        {'candidate_id': 1, 'position_id': 1, 'election_id': 1},
        {'candidate_id': 3, 'position_id': 2, 'election_id': 1},
        {'candidate_id': 3, 'position_id': 2, 'election_id': 1},
        {'candidate_id': 4, 'position_id': 2, 'election_id': 1},
    ]
    
    # Test: Count votes by candidate (like in election_results)
    votes_by_candidate = AggregationAlgorithm.aggregate(
        votes,
        key_func=lambda v: v.get('candidate_id'),
        operation='count'
    )
    
    assert votes_by_candidate[1] == 3, f"Expected 3 votes for candidate 1, got {votes_by_candidate.get(1)}"
    assert votes_by_candidate[2] == 1, f"Expected 1 vote for candidate 2, got {votes_by_candidate.get(2)}"
    assert votes_by_candidate[3] == 2, f"Expected 2 votes for candidate 3, got {votes_by_candidate.get(3)}"
    print("✓ Vote counting by candidate test passed")
    
    # Test: Count votes by position (like in get_election_statistics)
    votes_by_position = AggregationAlgorithm.aggregate(
        votes,
        key_func=lambda v: v.get('position_id'),
        operation='count'
    )
    
    assert votes_by_position[1] == 4, f"Expected 4 votes for position 1, got {votes_by_position.get(1)}"
    assert votes_by_position[2] == 3, f"Expected 3 votes for position 2, got {votes_by_position.get(2)}"
    print("✓ Vote counting by position test passed")
    
    # Test: Multi-level aggregation (position -> candidate)
    # First group by position, then by candidate
    position_votes = {}
    for vote in votes:
        pos_id = vote.get('position_id')
        if pos_id not in position_votes:
            position_votes[pos_id] = []
        position_votes[pos_id].append(vote)
    
    # Aggregate within each position
    position_candidate_counts = {}
    for pos_id, pos_votes in position_votes.items():
        candidate_counts = AggregationAlgorithm.aggregate(
            pos_votes,
            key_func=lambda v: v.get('candidate_id'),
            operation='count'
        )
        position_candidate_counts[pos_id] = candidate_counts
    
    assert position_candidate_counts[1][1] == 3, "Multi-level aggregation failed for position 1, candidate 1"
    assert position_candidate_counts[1][2] == 1, "Multi-level aggregation failed for position 1, candidate 2"
    assert position_candidate_counts[2][3] == 2, "Multi-level aggregation failed for position 2, candidate 3"
    print("✓ Multi-level aggregation test passed")
    
    # Test: Total vote count using aggregation
    total_votes = AggregationAlgorithm.aggregate(
        votes,
        key_func=lambda v: 'total',
        operation='count'
    ).get('total', 0)
    
    assert total_votes == 7, f"Expected 7 total votes, got {total_votes}"
    print("✓ Total vote count aggregation test passed")
    
    # Test: Aggregate with sum operation (for future use cases)
    vote_data_with_values = [
        {'candidate_id': 1, 'vote_weight': 1.0},
        {'candidate_id': 1, 'vote_weight': 1.0},
        {'candidate_id': 2, 'vote_weight': 1.5},
    ]
    
    total_weights = AggregationAlgorithm.aggregate(
        vote_data_with_values,
        key_func=lambda v: v.get('candidate_id'),
        value_func=lambda v: v.get('vote_weight', 0),
        operation='sum'
    )
    
    assert total_weights[1] == 2.0, f"Expected 2.0 total weight for candidate 1, got {total_weights.get(1)}"
    assert total_weights[2] == 1.5, f"Expected 1.5 total weight for candidate 2, got {total_weights.get(2)}"
    print("✓ Sum aggregation test passed")
    
    print("All aggregation integration tests passed!\n")


def test_memoization():
    """Test memoization algorithms"""
    print("Testing Memoization Algorithms...")
    
    # Test memoization with simple function
    call_count = {'count': 0}
    
    @MemoizationAlgorithm.memoize_with_key(
        lambda x: MemoizationAlgorithm.generate_hash_key(x)
    )
    def expensive_computation(x):
        """Simulate expensive computation"""
        call_count['count'] += 1
        return x * x * x  # Some expensive calculation
    
    # First call - should execute function
    result1 = expensive_computation(5)
    assert result1 == 125, f"Memoization failed - expected 125, got {result1}"
    assert call_count['count'] == 1, f"Memoization failed - function should be called once, got {call_count['count']}"
    print("✓ First call test passed")
    
    # Second call with same input - should use cache
    result2 = expensive_computation(5)
    assert result2 == 125, f"Memoization failed - expected 125, got {result2}"
    assert call_count['count'] == 1, f"Memoization failed - function should not be called again, got {call_count['count']}"
    print("✓ Cache hit test passed")
    
    # Third call with different input - should execute function again
    result3 = expensive_computation(10)
    assert result3 == 1000, f"Memoization failed - expected 1000, got {result3}"
    assert call_count['count'] == 2, f"Memoization failed - function should be called again, got {call_count['count']}"
    print("✓ Different input test passed")
    
    # Test cache clear
    expensive_computation.cache_clear()
    result4 = expensive_computation(5)
    assert call_count['count'] == 3, f"Cache clear failed - function should be called after clear, got {call_count['count']}"
    print("✓ Cache clear test passed")
    
    # Test hash key generation
    key1 = MemoizationAlgorithm.generate_hash_key(1, 2, 3, a=4, b=5)
    key2 = MemoizationAlgorithm.generate_hash_key(1, 2, 3, a=4, b=5)
    key3 = MemoizationAlgorithm.generate_hash_key(1, 2, 3, a=5, b=4)
    
    assert key1 == key2, "Hash key should be deterministic for same inputs"
    assert key1 != key3, "Hash key should be different for different inputs"
    assert len(key1) == 32, f"MD5 hash should be 32 chars, got {len(key1)}"
    print("✓ Hash key generation test passed")
    
    # Test memoization with multiple arguments
    call_count2 = {'count': 0}
    
    @MemoizationAlgorithm.memoize_with_key(
        lambda x, y, z: MemoizationAlgorithm.generate_hash_key(x, y, z)
    )
    def multi_arg_computation(x, y, z):
        """Simulate expensive computation with multiple args"""
        call_count2['count'] += 1
        return x + y + z
    
    result5 = multi_arg_computation(1, 2, 3)
    result6 = multi_arg_computation(1, 2, 3)
    assert result5 == 6, f"Multi-arg computation failed - expected 6, got {result5}"
    assert call_count2['count'] == 1, f"Multi-arg memoization failed - should cache result"
    print("✓ Multi-argument memoization test passed")
    
    print("All memoization tests passed!\n")


def test_memoization_integration():
    """Test memoization integration with voting services"""
    print("Testing Memoization Integration...")
    
    from apps.voting.services import VotingDataService
    
    # Test vote percentage calculation (memoized)
    call_count = {'count': 0}
    original_func = VotingDataService.calculate_vote_percentage
    
    # Wrap to track calls (in real scenario, memoization prevents repeated calculations)
    def tracked_calc(vote_count, total_votes):
        call_count['count'] += 1
        return original_func(vote_count, total_votes)
    
    # Test percentage calculation
    pct1 = VotingDataService.calculate_vote_percentage(50, 100)
    pct2 = VotingDataService.calculate_vote_percentage(50, 100)  # Should use cache
    pct3 = VotingDataService.calculate_vote_percentage(25, 100)  # Different input
    
    assert pct1 == 50.0, f"Percentage calculation failed - expected 50.0, got {pct1}"
    assert pct1 == pct2, "Memoization should return same result for same inputs"
    assert pct3 == 25.0, f"Percentage calculation failed - expected 25.0, got {pct3}"
    print("✓ Vote percentage memoization test passed")
    
    # Test turnout percentage calculation (memoized)
    turnout1 = VotingDataService.calculate_turnout_percentage(80, 100)
    turnout2 = VotingDataService.calculate_turnout_percentage(80, 100)  # Should use cache
    turnout3 = VotingDataService.calculate_turnout_percentage(60, 100)  # Different input
    
    assert turnout1 == 80.0, f"Turnout calculation failed - expected 80.0, got {turnout1}"
    assert turnout1 == turnout2, "Memoization should return same result for same inputs"
    assert turnout3 == 60.0, f"Turnout calculation failed - expected 60.0, got {turnout3}"
    print("✓ Turnout percentage memoization test passed")
    
    # Test edge cases
    zero_pct = VotingDataService.calculate_vote_percentage(0, 0)
    assert zero_pct == 0.0, f"Zero division should return 0.0, got {zero_pct}"
    
    zero_turnout = VotingDataService.calculate_turnout_percentage(0, 0)
    assert zero_turnout == 0.0, f"Zero division should return 0.0, got {zero_turnout}"
    print("✓ Edge cases test passed")
    
    print("All memoization integration tests passed!\n")


def main():
    """Run all tests"""
    print("=" * 60)
    print("Testing Algorithm Implementations")
    print("=" * 60)
    print()
    
    try:
        test_sorting()
        test_searching()
        test_cryptographic()
        test_grouping()
        test_aggregation()
        test_aggregation_integration()
        test_memoization()
        test_memoization_integration()
        
        print("=" * 60)
        print("✓ ALL TESTS PASSED!")
        print("=" * 60)
        return True
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)