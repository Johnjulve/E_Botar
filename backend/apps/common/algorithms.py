"""
General-Purpose Data Processing Algorithms for E-Botar

This module provides efficient, reusable algorithms for common data processing tasks.
All algorithms are designed to work with any data type: dictionaries, objects, lists, tuples, etc.

Key Features:
- Type-agnostic: Works with any data structure
- Flexible: Accepts custom key functions, comparators, and transformers
- Efficient: Optimized time and space complexity
- Reusable: Can be applied to any feature (voting, students, products, etc.)

Usage Examples:
    # Grouping
    grouped = DataGroupingAlgorithm.group_by(items, key_func=lambda x: x.category)
    
    # Aggregation
    totals = AggregationAlgorithm.aggregate(items, 
        key_func=lambda x: x.department,
        value_func=lambda x: x.amount,
        operation='sum'
    )
    
    # Sorting
    sorted_items = SortingAlgorithm.quicksort(items, key_func=lambda x: x.score)
    
    # Searching
    index = SearchingAlgorithm.binary_search(items, target, key_func=lambda x: x.id)
    
    # Convenience functions
    grouped = group_by(items, lambda x: x.category)
    totals = aggregate_by(items, lambda x: x.category, lambda x: x.amount, 'sum')
    sorted_items = sort_by(items, lambda x: x.score)
"""

from collections import defaultdict
from typing import List, Dict, Any, Optional, Callable, Union, Tuple, Iterable
from functools import lru_cache
import hashlib


class DataGroupingAlgorithm:
    """
    General-purpose multi-level grouping algorithm using hash maps
    Works with any data type: dictionaries, objects, lists, tuples, etc.
    """
    
    @staticmethod
    def group_by(
        items: Iterable[Any],
        key_func: Callable[[Any], Any],
        value_func: Optional[Callable[[Any], Any]] = None
    ) -> Dict[Any, List[Any]]:
        """
        Group items by a key function - general purpose grouping
        
        Args:
            items: Iterable of items to group (any type)
            key_func: Function to extract grouping key from item
            value_func: Optional function to transform item before adding to group
        
        Returns:
            Dictionary: {key: [items]}
        
        Time Complexity: O(n)
        Space Complexity: O(n)
        
        Example:
            # Group students by department
            grouped = group_by(students, key_func=lambda s: s.department.name)
            
            # Group with transformation
            grouped = group_by(students, 
                key_func=lambda s: s.year_level,
                value_func=lambda s: s.student_id
            )
        """
        result = defaultdict(list)
        for item in items:
            key = key_func(item)
            value = value_func(item) if value_func else item
            result[key].append(value)
        return dict(result)
    
    @staticmethod
    def group_by_hierarchy(
        items: Iterable[Any],
        hierarchy_keys: List[Union[str, Callable]],
        extract_key: Callable[[Any, Union[str, Callable]], Any],
        extract_data: Optional[Callable[[Any], Any]] = None,
        include_metadata: bool = True,
        default_key: Any = 'N/A'
    ) -> Dict:
        """
        Group items by multiple hierarchy levels efficiently using hash maps
        Works with any data type - dictionaries, objects, tuples, etc.
        
        Args:
            items: Iterable of items to group (any type)
            hierarchy_keys: List of keys/functions to group by
                - String: for dict keys or object attributes
                - Callable: function to extract key from item
            extract_key: Function to extract key value (item, key) -> value
            extract_data: Optional function to transform item before storing
            include_metadata: Whether to include metadata in result
            default_key: Default value for missing keys
        
        Returns:
            Nested dictionary structure: {level1: {level2: {level3: {...}}}}
        
        Time Complexity: O(n * m) where n=items, m=hierarchy levels
        Space Complexity: O(n)
        
        Example:
            # With dictionaries
            group_by_hierarchy(
                students,
                ['department', 'course', 'year_level'],
                lambda item, key: item.get(key, {}).get('name', 'N/A')
            )
            
            # With objects
            group_by_hierarchy(
                students,
                ['department', 'course'],
                lambda item, key: getattr(item, key, None).name if hasattr(getattr(item, key, None), 'name') else 'N/A'
            )
        """
        result = {}
        
        for item in items:
            current_level = result
            metadata = {}
            
            # Navigate/create hierarchy levels
            for i, key in enumerate(hierarchy_keys):
                key_value = extract_key(item, key) or default_key
                
                # Extract metadata if needed
                if include_metadata and i == 0:
                    if isinstance(key, str) and 'name' in key:
                        metadata_key = key.replace('name', 'code')
                    elif isinstance(key, str):
                        metadata_key = f"{key}_code"
                    else:
                        metadata_key = None
                    
                    if metadata_key:
                        metadata['code'] = extract_key(item, metadata_key) or default_key
                
                # Create level if doesn't exist
                if key_value not in current_level:
                    if i == len(hierarchy_keys) - 1:
                        # Last level - create data structure
                        current_level[key_value] = {
                            'count': 0,
                            'items': []
                        }
                    else:
                        # Intermediate level
                        current_level[key_value] = {}
                        if include_metadata and i == 0:
                            current_level[key_value]['code'] = metadata.get('code', default_key)
                
                current_level = current_level[key_value]
            
            # Add item to final level
            if 'items' in current_level:
                item_data = extract_data(item) if extract_data else item
                current_level['items'].append(item_data)
                current_level['count'] += 1
        
        return result
    
    @staticmethod
    def group_by_multiple(
        items: Iterable[Any],
        key_funcs: List[Callable[[Any], Any]],
        value_func: Optional[Callable[[Any], Any]] = None
    ) -> Dict:
        """
        Group items by multiple keys simultaneously
        
        Args:
            items: Iterable of items to group
            key_funcs: List of functions to extract grouping keys
            value_func: Optional function to transform items
        
        Returns:
            Nested dictionary: {key1: {key2: {key3: [items]}}}
        
        Example:
            grouped = group_by_multiple(
                students,
                [
                    lambda s: s.department.name,
                    lambda s: s.course.name,
                    lambda s: s.year_level
                ]
            )
        """
        result = {}
        
        for item in items:
            current = result
            keys = [func(item) for func in key_funcs]
            
            # Navigate/create nested structure
            for i, key in enumerate(keys[:-1]):
                if key not in current:
                    current[key] = {}
                current = current[key]
            
            # Add to final level
            final_key = keys[-1]
            if final_key not in current:
                current[final_key] = []
            
            value = value_func(item) if value_func else item
            current[final_key].append(value)
        
        return result


class AggregationAlgorithm:
    """
    General-purpose aggregation algorithms for counting, summing, and statistical operations
    Works with any iterable data type
    """
    
    @staticmethod
    def aggregate(
        items: Iterable[Any],
        key_func: Callable[[Any], Any],
        value_func: Optional[Callable[[Any], Any]] = None,
        operation: str = 'count'
    ) -> Dict[Any, Any]:
        """
        Aggregate items by key with various operations
        
        Args:
            items: Iterable of items to aggregate (any type)
            key_func: Function to extract category/key from item
            value_func: Optional function to extract value for aggregation
            operation: 'count', 'sum', 'avg', 'min', 'max', 'list', 'set'
        
        Returns:
            Dictionary: {category: aggregated_value}
        
        Time Complexity: O(n)
        Space Complexity: O(k) where k=unique categories
        
        Example:
            # Count items by category
            counts = aggregate(items, key_func=lambda x: x.category)
            
            # Sum values by category
            totals = aggregate(
                items,
                key_func=lambda x: x.category,
                value_func=lambda x: x.amount,
                operation='sum'
            )
        """
        result = defaultdict(lambda: {
            'count': 0,
            'sum': 0,
            'values': [],
            'items': []
        })
        
        for item in items:
            category = key_func(item)
            result[category]['count'] += 1
            result[category]['items'].append(item)
            
            if value_func and operation in ['sum', 'avg', 'min', 'max']:
                value = value_func(item)
                try:
                    value = float(value)
                    result[category]['sum'] += value
                    result[category]['values'].append(value)
                except (ValueError, TypeError):
                    pass
        
        # Apply operation
        final_result = {}
        for category, data in result.items():
            if operation == 'count':
                final_result[category] = data['count']
            elif operation == 'sum':
                final_result[category] = data['sum']
            elif operation == 'avg':
                final_result[category] = data['sum'] / data['count'] if data['count'] > 0 else 0
            elif operation == 'min':
                final_result[category] = min(data['values']) if data['values'] else None
            elif operation == 'max':
                final_result[category] = max(data['values']) if data['values'] else None
            elif operation == 'list':
                final_result[category] = data['items']
            elif operation == 'set':
                final_result[category] = list(set(data['items']))
            else:
                final_result[category] = data
        
        return final_result
    
    @staticmethod
    def aggregate_by_category(
        items: Iterable[Any],
        category_key: Union[str, Callable],
        value_key: Optional[Union[str, Callable]] = None,
        operation: str = 'count'
    ) -> Dict[str, Any]:
        """
        Aggregate items by category (convenience method for dictionaries/objects)
        
        Args:
            items: Iterable of items (dicts or objects)
            category_key: String key name or function to extract category
            value_key: Optional string key name or function to extract value
            operation: 'count', 'sum', 'avg', 'min', 'max', 'list', 'set'
        
        Returns:
            Dictionary: {category: aggregated_value}
        
        Example:
            # With dictionaries
            totals = aggregate_by_category(
                items,
                category_key='department',
                value_key='amount',
                operation='sum'
            )
            
            # With objects
            totals = aggregate_by_category(
                items,
                category_key=lambda x: x.department.name,
                value_func=lambda x: x.amount,
                operation='sum'
            )
        """
        # Convert string keys to functions
        if isinstance(category_key, str):
            key_func = lambda x: x.get(category_key, 'N/A') if isinstance(x, dict) else getattr(x, category_key, 'N/A')
        else:
            key_func = category_key
        
        if value_key:
            if isinstance(value_key, str):
                value_func = lambda x: x.get(value_key, 0) if isinstance(x, dict) else getattr(x, value_key, 0)
            else:
                value_func = value_key
        else:
            value_func = None
        
        return AggregationAlgorithm.aggregate(items, key_func, value_func, operation)
    
    @staticmethod
    def multi_level_aggregate(
        items: List[Dict],
        group_keys: List[str],
        aggregate_key: str,
        operation: str = 'count'
    ) -> Dict:
        """
        Multi-level aggregation (e.g., count votes by dept → course → year level)
        
        Args:
            items: List of items
            group_keys: Keys to group by in order
            aggregate_key: Key to aggregate
            operation: Aggregation operation
        
        Returns:
            Nested dictionary with aggregated values
        
        Time Complexity: O(n * m) where m=group levels
        """
        result = {}
        
        for item in items:
            current = result
            
            # Navigate/create group structure
            for key in group_keys:
                key_value = item.get(key, {}).get('name', 'N/A') if isinstance(item.get(key), dict) else item.get(key, 'N/A')
                
                if key_value not in current:
                    current[key_value] = {}
                
                current = current[key_value]
            
            # Aggregate at final level
            if aggregate_key not in current:
                current[aggregate_key] = {
                    'count': 0,
                    'sum': 0,
                    'values': []
                }
            
            current[aggregate_key]['count'] += 1
            
            if operation in ['sum', 'avg']:
                value = item.get(aggregate_key, 0)
                try:
                    value = float(value)
                    current[aggregate_key]['sum'] += value
                    current[aggregate_key]['values'].append(value)
                except (ValueError, TypeError):
                    pass
        
        return result


class CategorizationAlgorithm:
    """
    General-purpose categorization algorithms
    Can be used for votes, students, or any hierarchical data
    """
    
    @staticmethod
    def categorize_by_hierarchy(
        items: Iterable[Any],
        hierarchy_config: Dict[str, Callable],
        count_func: Optional[Callable[[Any], int]] = None
    ) -> Dict:
        """
        Categorize items by hierarchical structure with flexible configuration
        
        Args:
            items: Iterable of items to categorize
            hierarchy_config: Dictionary mapping level names to extraction functions
                Example: {
                    'department': lambda x: x.department.name,
                    'course': lambda x: x.course.name,
                    'year_level': lambda x: x.year_level
                }
            count_func: Optional function to get count value (default: 1)
        
        Returns:
            Nested dictionary structure with counts
        
        Time Complexity: O(n * m) where m=hierarchy levels
        Space Complexity: O(n)
        
        Example:
            categorized = categorize_by_hierarchy(
                students,
                {
                    'department': lambda s: s.department.name,
                    'course': lambda s: s.course.name,
                    'year_level': lambda s: s.year_level
                }
            )
        """
        result = {}
        count_func = count_func or (lambda x: 1)
        
        for item in items:
            current = result
            levels = list(hierarchy_config.keys())
            
            for i, level_name in enumerate(levels):
                extract_func = hierarchy_config[level_name]
                level_value = extract_func(item) or 'N/A'
                
                if level_value not in current:
                    if i == len(levels) - 1:
                        # Last level - create count structure
                        current[level_value] = {'count': 0}
                    else:
                        # Intermediate level
                        current[level_value] = {}
                
                current = current[level_value]
            
            # Increment count at final level
            current['count'] += count_func(item)
        
        return result
    
    @staticmethod
    def categorize_votes_by_demographics(
        voter_profiles: Iterable[Any],
        election_type: str = 'university',
        dept_extractor: Optional[Callable] = None,
        course_extractor: Optional[Callable] = None,
        year_extractor: Optional[Callable] = None
    ) -> Dict:
        """
        Categorize votes/profiles by demographics (backward compatibility + flexibility)
        
        Args:
            voter_profiles: Iterable of voter profile objects/dicts
            election_type: 'university' or 'department'
            dept_extractor: Optional function to extract department (default: dict access)
            course_extractor: Optional function to extract course (default: dict access)
            year_extractor: Optional function to extract year level (default: dict access)
        
        Returns:
            Categorized structure
        """
        # Default extractors for dictionary access
        if dept_extractor is None:
            dept_extractor = lambda p: p.get('department', {}).get('name', 'Unassigned Department') if isinstance(p, dict) else getattr(getattr(p, 'department', None), 'name', 'Unassigned Department')
        if course_extractor is None:
            course_extractor = lambda p: p.get('course', {}).get('name', 'Unassigned Course') if isinstance(p, dict) else getattr(getattr(p, 'course', None), 'name', 'Unassigned Course')
        if year_extractor is None:
            year_extractor = lambda p: p.get('year_level', 'N/A') if isinstance(p, dict) else getattr(p, 'year_level', 'N/A')
        
        if election_type == 'department':
            config = {
                'course': course_extractor,
                'year_level': year_extractor
            }
        else:
            config = {
                'department': dept_extractor,
                'course': course_extractor,
                'year_level': year_extractor
            }
        
        return CategorizationAlgorithm.categorize_by_hierarchy(voter_profiles, config)


class OrganizationAlgorithm:
    """
    General-purpose organization algorithms for hierarchical data
    Can organize students, employees, products, or any structured data
    """
    
    @staticmethod
    def organize_by_hierarchy(
        items: Iterable[Any],
        hierarchy_config: Dict[str, Callable],
        include_items: bool = False,
        item_transform: Optional[Callable[[Any], Any]] = None
    ) -> Dict:
        """
        Organize items by hierarchical structure with flexible configuration
        
        Args:
            items: Iterable of items to organize
            hierarchy_config: Dictionary mapping level names to extraction functions
                Example: {
                    'department': lambda x: (x.department.name, x.department.code),
                    'course': lambda x: (x.course.name, x.course.code),
                    'year_level': lambda x: x.year_level
                }
            include_items: Whether to include item lists at final level
            item_transform: Optional function to transform items before storing
        
        Returns:
            Organized nested dictionary structure
        
        Time Complexity: O(n * m) where m=hierarchy levels
        Space Complexity: O(n)
        
        Example:
            organized = organize_by_hierarchy(
                students,
                {
                    'department': lambda s: (s.department.name, s.department.code),
                    'course': lambda s: (s.course.name, s.course.code),
                    'year_level': lambda s: s.year_level
                },
                include_items=True
            )
        """
        organized = {}
        levels = list(hierarchy_config.keys())
        
        for item in items:
            current = organized
            
            # Navigate/create hierarchy
            for i, level_name in enumerate(levels):
                extract_func = hierarchy_config[level_name]
                level_data = extract_func(item)
                
                # Handle tuple (name, code) or single value
                if isinstance(level_data, tuple) and len(level_data) == 2:
                    level_key, level_code = level_data
                else:
                    level_key = level_data
                    level_code = None
                
                level_key = level_key or 'N/A'
                
                # Initialize level
                if level_key not in current:
                    if i == len(levels) - 1:
                        # Last level
                        current[level_key] = {
                            'count': 0,
                            'items': [] if include_items else None
                        }
                        if level_code:
                            current[level_key]['code'] = level_code
                    else:
                        # Intermediate level
                        current[level_key] = {}
                        if level_code:
                            current[level_key]['code'] = level_code
                
                current = current[level_key]
            
            # Add item to final level
            if include_items and current.get('items') is not None:
                item_data = item_transform(item) if item_transform else item
                current['items'].append(item_data)
            current['count'] += 1
        
        return organized
    
    @staticmethod
    def organize_students_by_academic_hierarchy(
        students: Iterable[Any],
        include_student_list: bool = False
    ) -> Dict:
        """
        Organize students by academic hierarchy (backward compatibility)
        
        Args:
            students: Iterable of student objects/dicts
            include_student_list: Whether to include student objects in result
        
        Returns:
            Organized structure
        """
        # Default extractors
        def dept_extractor(s):
            if isinstance(s, dict):
                dept = s.get('department', {})
                return (dept.get('name', 'Unassigned Department'), dept.get('code', 'N/A'))
            else:
                dept = getattr(s, 'department', None)
                return (getattr(dept, 'name', 'Unassigned Department') if dept else 'Unassigned Department',
                       getattr(dept, 'code', 'N/A') if dept else 'N/A')
        
        def course_extractor(s):
            if isinstance(s, dict):
                course = s.get('course', {})
                return (course.get('name', 'Unassigned Course'), course.get('code', 'N/A'))
            else:
                course = getattr(s, 'course', None)
                return (getattr(course, 'name', 'Unassigned Course') if course else 'Unassigned Course',
                       getattr(course, 'code', 'N/A') if course else 'N/A')
        
        def year_extractor(s):
            if isinstance(s, dict):
                return s.get('year_level', 'N/A')
            else:
                return getattr(s, 'year_level', 'N/A')
        
        def student_transform(s):
            if isinstance(s, dict):
                user = s.get('user', {})
                return {
                    'student_id': s.get('student_id', 'N/A'),
                    'name': f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('username', 'Unknown'),
                    'year_level': s.get('year_level', 'N/A'),
                    'user': {'id': user.get('id')}
                }
            else:
                user = getattr(s, 'user', None)
                return {
                    'student_id': getattr(s, 'student_id', 'N/A'),
                    'name': f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() if user else getattr(user, 'username', 'Unknown'),
                    'year_level': getattr(s, 'year_level', 'N/A'),
                    'user': {'id': getattr(user, 'id', None) if user else None}
                }
        
        return OrganizationAlgorithm.organize_by_hierarchy(
            students,
            {
                'department': dept_extractor,
                'course': course_extractor,
                'year_level': year_extractor
            },
            include_items=include_student_list,
            item_transform=student_transform if include_student_list else None
        )


class BatchProcessingAlgorithm:
    """
    Algorithms for processing large datasets in batches
    """
    
    @staticmethod
    def process_in_batches(
        items: List[Any],
        batch_size: int,
        processor: Callable[[List[Any]], Any],
        accumulator: Optional[Callable[[Any, Any], Any]] = None
    ) -> Any:
        """
        Process large datasets in batches to avoid memory issues
        
        Args:
            items: List of items to process
            batch_size: Number of items per batch
            processor: Function to process each batch
            accumulator: Optional function to accumulate batch results
        
        Returns:
            Accumulated results from all batches
        
        Time Complexity: O(n)
        Space Complexity: O(batch_size) instead of O(n)
        """
        results = []
        
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            batch_result = processor(batch)
            
            if accumulator:
                if not results:
                    results = batch_result
                else:
                    results = accumulator(results, batch_result)
            else:
                results.append(batch_result)
        
        return results


class SearchingAlgorithm:
    """
    Efficient searching algorithms for sorted data
    """
    
    @staticmethod
    def binary_search(arr: List[Any], target: Any, key: Optional[Callable] = None) -> int:
        """
        Binary search algorithm - O(log n)
        Requires sorted array. Useful for finding students/candidates in sorted lists.
        
        Args:
            arr: Sorted list to search
            target: Value to find
            key: Optional key function for custom comparison
        
        Returns:
            Index of target if found, -1 otherwise
        
        Example:
            index = binary_search(sorted_students, student_id, key=lambda s: s['student_id'])
        """
        if not arr:
            return -1
        
        left, right = 0, len(arr) - 1
        
        while left <= right:
            mid = (left + right) // 2
            mid_item = arr[mid]
            mid_val = key(mid_item) if key else mid_item
            target_val = key(target) if key else target
            
            # Handle None values - None is not comparable with other types
            if mid_val is None or target_val is None:
                if mid_val == target_val:  # Both None
                    return mid
                # If one is None, skip comparison and continue
                if mid_val is None:
                    left = mid + 1
                    continue
                if target_val is None:
                    right = mid - 1
                    continue
            
            try:
                if mid_val == target_val:
                    return mid
                elif mid_val < target_val:
                    left = mid + 1
                else:
                    right = mid - 1
            except TypeError:
                # Handle comparison errors (e.g., different types)
                if mid_val == target_val:
                    return mid
                # If types are incompatible, we can't compare - return not found
                return -1
        
        return -1
    
    @staticmethod
    def binary_search_by_field(
        arr: List[Any], 
        target_value: Any, 
        field: Union[str, Callable]
    ) -> int:
        """
        Binary search in list of objects/dictionaries by field
        
        Args:
            arr: Sorted list of objects or dictionaries
            target_value: Value to find (raw value, not an object)
            field: Field name (string) or accessor function
        
        Returns:
            Index of matching item if found, -1 otherwise
        
        Example:
            # With dictionaries
            index = binary_search_by_field(students, '2024-12345', 'student_id')
            
            # With objects
            index = binary_search_by_field(students, '2024-12345', lambda s: s.student_id)
        """
        if not arr:
            return -1
        
        # Create key function to extract field from array items
        if isinstance(field, str):
            def key_func(x):
                return x.get(field) if isinstance(x, dict) else getattr(x, field, None)
        else:
            key_func = field
        
        # Binary search - compare target_value with extracted field values
        left, right = 0, len(arr) - 1
        
        while left <= right:
            mid = (left + right) // 2
            mid_item = arr[mid]
            mid_val = key_func(mid_item)
            
            # Handle None values
            if mid_val is None or target_value is None:
                if mid_val == target_value:
                    return mid
                if mid_val is None:
                    left = mid + 1
                    continue
                if target_value is None:
                    right = mid - 1
                    continue
            
            try:
                if mid_val == target_value:
                    return mid
                elif mid_val < target_value:
                    left = mid + 1
                else:
                    right = mid - 1
            except TypeError:
                # Handle comparison errors
                if mid_val == target_value:
                    return mid
                return -1
        
        return -1
    
    @staticmethod
    def find_all(
        arr: Iterable[Any],
        predicate: Callable[[Any], bool]
    ) -> List[Tuple[int, Any]]:
        """
        Find all items matching a predicate
        
        Args:
            arr: Iterable to search
            predicate: Function to test items
        
        Returns:
            List of (index, item) tuples for all matches
        
        Example:
            matches = find_all(students, lambda s: s.age > 18)
        """
        return [(i, item) for i, item in enumerate(arr) if predicate(item)]


class CryptographicAlgorithm:
    """
    Cryptographic algorithms for vote receipts and data hashing
    """
    
    @staticmethod
    def sha256_hash(data: str) -> str:
        """
        Generate SHA-256 hash of data
        Used for vote receipts and vote verification in the voting system
        
        Args:
            data: String data to hash
        
        Returns:
            SHA-256 hash as hexadecimal string (64 characters)
        
        Example:
            receipt_hash = sha256_hash(receipt_code)
        """
        return hashlib.sha256(data.encode()).hexdigest()
    
    @staticmethod
    def md5_hash(data: str) -> str:
        """
        Generate MD5 hash of data
        Used for cache key generation in services
        
        Args:
            data: String data to hash
        
        Returns:
            MD5 hash as hexadecimal string (32 characters)
        
        Example:
            cache_key = md5_hash(f"election_{election_id}")
        """
        return hashlib.md5(data.encode()).hexdigest()


class MemoizationAlgorithm:
    """
    Memoization utilities for caching expensive computations
    """
    
    @staticmethod
    def memoize_with_key(
        key_generator: Callable[..., str]
    ) -> Callable:
        """
        Create a memoization decorator with custom key generation
        
        Args:
            key_generator: Function to generate cache key from arguments
        
        Returns:
            Memoization decorator
        """
        cache = {}
        
        def decorator(func):
            def wrapper(*args, **kwargs):
                cache_key = key_generator(*args, **kwargs)
                
                if cache_key not in cache:
                    cache[cache_key] = func(*args, **kwargs)
                
                return cache[cache_key]
            
            wrapper.cache_clear = lambda: cache.clear()
            return wrapper
        
        return decorator
    
    @staticmethod
    def generate_hash_key(*args, **kwargs) -> str:
        """
        Generate a hash-based cache key from arguments
        
        Args:
            *args: Positional arguments
            **kwargs: Keyword arguments
        
        Returns:
            MD5 hash string
        """
        key_parts = [str(arg) for arg in args]
        key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
        key_string = '|'.join(key_parts)
        return CryptographicAlgorithm.md5_hash(key_string)


class SortingAlgorithm:
    """
    Efficient sorting algorithms for export data and election results
    """
    
    @staticmethod
    def quicksort(arr: List[Any], key: Optional[Callable] = None, reverse: bool = False) -> List[Any]:
        """
        Quicksort algorithm - O(n log n) average, O(n²) worst case
        Efficient for sorting election results, candidates by vote count, etc.
        
        Args:
            arr: List to sort
            key: Optional key function (e.g., lambda x: x['vote_count'])
            reverse: Whether to sort in descending order
        
        Returns:
            Sorted list (in-place modification)
        
        Example:
            candidates = quicksort(candidates, key=lambda c: c['vote_count'], reverse=True)
        """
        if len(arr) <= 1:
            return arr
        
        arr = arr.copy()  # Don't modify original
        SortingAlgorithm._quicksort_helper(arr, 0, len(arr) - 1, key, reverse)
        return arr
    
    @staticmethod
    def _quicksort_helper(arr: List[Any], low: int, high: int, key: Optional[Callable], reverse: bool):
        """Helper function for quicksort"""
        if low < high:
            pi = SortingAlgorithm._partition(arr, low, high, key, reverse)
            SortingAlgorithm._quicksort_helper(arr, low, pi - 1, key, reverse)
            SortingAlgorithm._quicksort_helper(arr, pi + 1, high, key, reverse)
    
    @staticmethod
    def _partition(arr: List[Any], low: int, high: int, key: Optional[Callable], reverse: bool) -> int:
        """Partition function for quicksort"""
        pivot = arr[high]
        pivot_val = key(pivot) if key else pivot
        
        i = low - 1
        
        for j in range(low, high):
            current = arr[j]
            current_val = key(current) if key else current
            
            if reverse:
                compare = current_val >= pivot_val
            else:
                compare = current_val <= pivot_val
            
            if compare:
                i += 1
                arr[i], arr[j] = arr[j], arr[i]
        
        arr[i + 1], arr[high] = arr[high], arr[i + 1]
        return i + 1
    
    @staticmethod
    def mergesort(arr: List[Any], key: Optional[Callable] = None, reverse: bool = False) -> List[Any]:
        """
        Merge sort algorithm - O(n log n) guaranteed, stable sort
        Useful when maintaining relative order of equal elements matters
        
        Args:
            arr: List to sort
            key: Optional key function for custom sorting
            reverse: Whether to sort in descending order
        
        Returns:
            Sorted list (new list, original unchanged)
        
        Example:
            students = mergesort(students, key=lambda s: s['student_id'])
        """
        if len(arr) <= 1:
            return arr
        
        mid = len(arr) // 2
        left = SortingAlgorithm.mergesort(arr[:mid], key, reverse)
        right = SortingAlgorithm.mergesort(arr[mid:], key, reverse)
        
        return SortingAlgorithm._merge(left, right, key, reverse)
    
    @staticmethod
    def _merge(left: List[Any], right: List[Any], key: Optional[Callable], reverse: bool) -> List[Any]:
        """Merge function for mergesort"""
        result = []
        i = j = 0
        
        while i < len(left) and j < len(right):
            left_val = key(left[i]) if key else left[i]
            right_val = key(right[j]) if key else right[j]
            
            if reverse:
                compare = left_val >= right_val
            else:
                compare = left_val <= right_val
            
            if compare:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        
        result.extend(left[i:])
        result.extend(right[j:])
        return result
    
    @staticmethod
    def sort_nested_dict(
        data: Dict,
        sort_keys: List[str],
        reverse: bool = False
    ) -> Dict:
        """
        Sort nested dictionary structure by multiple keys
        
        Args:
            data: Nested dictionary to sort
            sort_keys: Keys to sort by in order
            reverse: Whether to reverse sort order
        
        Returns:
            Sorted nested dictionary
        """
        if not sort_keys:
            return data
        
        sorted_data = {}
        current_key = sort_keys[0]
        remaining_keys = sort_keys[1:]
        
        # Sort current level
        sorted_items = sorted(
            data.items(),
            key=lambda x: x[0] if isinstance(x[0], (str, int, float)) else '',
            reverse=reverse
        )
        
        for key, value in sorted_items:
            if isinstance(value, dict) and remaining_keys:
                # Recursively sort nested levels
                sorted_data[key] = SortingAlgorithm.sort_nested_dict(
                    value,
                    remaining_keys,
                    reverse
                )
            else:
                sorted_data[key] = value
        
        return sorted_data


# ============================================================================
# Utility Functions - High-level convenience functions
# ============================================================================

def group_by(items: Iterable[Any], key_func: Callable[[Any], Any]) -> Dict[Any, List[Any]]:
    """
    Convenience function for simple grouping
    
    Args:
        items: Iterable of items
        key_func: Function to extract grouping key
    
    Returns:
        Dictionary: {key: [items]}
    
    Example:
        grouped = group_by(students, lambda s: s.department)
    """
    return DataGroupingAlgorithm.group_by(items, key_func)


def aggregate_by(items: Iterable[Any], key_func: Callable[[Any], Any], 
                 value_func: Optional[Callable[[Any], Any]] = None,
                 operation: str = 'count') -> Dict[Any, Any]:
    """
    Convenience function for aggregation
    
    Args:
        items: Iterable of items
        key_func: Function to extract category key
        value_func: Optional function to extract value
        operation: 'count', 'sum', 'avg', 'min', 'max', 'list', 'set'
    
    Returns:
        Dictionary: {category: aggregated_value}
    
    Example:
        totals = aggregate_by(orders, 
            key_func=lambda o: o.category,
            value_func=lambda o: o.amount,
            operation='sum'
        )
    """
    return AggregationAlgorithm.aggregate(items, key_func, value_func, operation)


def sort_by(items: List[Any], key_func: Optional[Callable[[Any], Any]] = None,
            reverse: bool = False, algorithm: str = 'quicksort') -> List[Any]:
    """
    Convenience function for sorting
    
    Args:
        items: List to sort
        key_func: Optional key function
        reverse: Whether to reverse sort
        algorithm: 'quicksort' or 'mergesort'
    
    Returns:
        Sorted list
    
    Example:
        sorted_items = sort_by(students, key_func=lambda s: s.name)
    """
    if algorithm == 'mergesort':
        return SortingAlgorithm.mergesort(items, key_func, reverse)
    else:
        return SortingAlgorithm.quicksort(items, key_func, reverse)


def search(items: List[Any], target: Any, key_func: Optional[Callable[[Any], Any]] = None,
           sorted: bool = True) -> int:
    """
    Convenience function for searching
    
    Args:
        items: List to search
        target: Value to find
        key_func: Optional key function
        sorted: Whether list is sorted (uses binary search) or not (uses linear search)
    
    Returns:
        Index if found, -1 otherwise
    
    Example:
        index = search(students, student_id, key_func=lambda s: s.student_id)
    """
    if sorted:
        return SearchingAlgorithm.binary_search(items, target, key_func)
    else:
        return SearchingAlgorithm.linear_search(items, target, key_func)


def optimize_data_organization(
    data_list: Iterable[Any], 
    hierarchy: Dict[str, Any]
) -> Dict:
    """
    High-level function to organize data efficiently (backward compatible)
    
    Args:
        data_list: Iterable of data items
        hierarchy: Hierarchy configuration dictionary
    
    Returns:
        Organized data structure
    
    Example:
        organized = optimize_data_organization(
            students,
            {
                'keys': ['department', 'course', 'year_level'],
                'extract_key': lambda item, key: item.get(key, {}).get('name', 'N/A'),
                'include_metadata': True
            }
        )
    """
    return DataGroupingAlgorithm.group_by_hierarchy(
        data_list,
        hierarchy.get('keys', []),
        hierarchy.get('extract_key', lambda item, key: getattr(item, key, 'N/A')),
        hierarchy.get('extract_data'),
        hierarchy.get('include_metadata', True)
    )