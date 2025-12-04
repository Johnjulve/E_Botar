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
    AggregationAlgorithm
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

