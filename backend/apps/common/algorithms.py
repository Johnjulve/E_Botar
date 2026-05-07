"""
E-Botar — focused algorithm helpers for a school-scale deployment.

Kept intentionally small: **sorting**, **searching**, **aggregation** (vote tallies),
**memoization** (cache keys / in-process memo), and **cryptography** (SHA-256 + RSA).

Removed broader “general-purpose” grouping / hierarchy / batch utilities to reduce
maintenance cost; typical campus populations do not require extra abstractions here.
"""

from collections import defaultdict
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple, Union
import base64
import hashlib

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa


# ---------------------------------------------------------------------------
# Aggregation (vote counts, tallies)
# ---------------------------------------------------------------------------


class AggregationAlgorithm:
    """Group-by-key aggregation: count, sum, avg, min, max, list, set."""
    
    @staticmethod
    def aggregate(
        items: Iterable[Any],
        key_func: Callable[[Any], Any],
        value_func: Optional[Callable[[Any], Any]] = None,
        operation: str = "count",
    ) -> Dict[Any, Any]:
        result = defaultdict(
            lambda: {
                "count": 0,
                "sum": 0,
                "values": [],
                "items": [],
            }
        )
        
        for item in items:
            category = key_func(item)
            result[category]["count"] += 1
            result[category]["items"].append(item)
            
            if value_func and operation in ("sum", "avg", "min", "max"):
                value = value_func(item)
                try:
                    value = float(value)
                    result[category]["sum"] += value
                    result[category]["values"].append(value)
                except (ValueError, TypeError):
                    pass
        
        final_result: Dict[Any, Any] = {}
        for category, data in result.items():
            if operation == "count":
                final_result[category] = data["count"]
            elif operation == "sum":
                final_result[category] = data["sum"]
            elif operation == "avg":
                final_result[category] = (
                    data["sum"] / data["count"] if data["count"] > 0 else 0
                )
            elif operation == "min":
                final_result[category] = min(data["values"]) if data["values"] else None
            elif operation == "max":
                final_result[category] = max(data["values"]) if data["values"] else None
            elif operation == "list":
                final_result[category] = data["items"]
            elif operation == "set":
                final_result[category] = list(set(data["items"]))
            else:
                final_result[category] = data
        
        return final_result
    

# ---------------------------------------------------------------------------
# Searching
# ---------------------------------------------------------------------------


class SearchingAlgorithm:
    """Binary search (sorted lists), field search, and linear scan."""
    
    @staticmethod
    def binary_search(
        arr: List[Any], target: Any, key: Optional[Callable] = None
    ) -> int:
        if not arr:
            return -1
        
        left, right = 0, len(arr) - 1
        
        while left <= right:
            mid = (left + right) // 2
            mid_item = arr[mid]
            mid_val = key(mid_item) if key else mid_item
            target_val = key(target) if key else target
            
            if mid_val is None or target_val is None:
                if mid_val == target_val:
                    return mid
                if mid_val is None:
                    left = mid + 1
                    continue
                if target_val is None:
                    right = mid - 1
                    continue
            
            try:
                if mid_val == target_val:
                    return mid
                if mid_val < target_val:
                    left = mid + 1
                else:
                    right = mid - 1
            except TypeError:
                if mid_val == target_val:
                    return mid
                return -1
        
        return -1
    
    @staticmethod
    def binary_search_by_field(
        arr: List[Any], target_value: Any, field: Union[str, Callable]
    ) -> int:
        if not arr:
            return -1
        
        if isinstance(field, str):

            def key_func(x: Any) -> Any:
                return x.get(field) if isinstance(x, dict) else getattr(x, field, None)

        else:
            key_func = field
        
        left, right = 0, len(arr) - 1
        
        while left <= right:
            mid = (left + right) // 2
            mid_item = arr[mid]
            mid_val = key_func(mid_item)
            
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
                if mid_val < target_value:
                    left = mid + 1
                else:
                    right = mid - 1
            except TypeError:
                if mid_val == target_value:
                    return mid
                return -1
        
        return -1
    
    @staticmethod
    def linear_search(
        arr: List[Any], target: Any, key: Optional[Callable] = None
    ) -> int:
        """O(n) search; compares key(item) to target (or item to target if key is None)."""
        for i, item in enumerate(arr):
            cur = key(item) if key else item
            if cur == target:
                return i
        return -1


# ---------------------------------------------------------------------------
# Cryptography (SHA-256 + RSA)
# ---------------------------------------------------------------------------


class CryptographicAlgorithm:
    """
    - **SHA-256**: digests for receipts, vote fingerprints, cache keys.
    - **RSA**: sign/verify (PSS-SHA256) and small OAEP encrypt/decrypt.
    """
    
    @staticmethod
    def sha256_hash(data: str) -> str:
        return hashlib.sha256(data.encode()).hexdigest()

    @staticmethod
    def _bytes_message(message: Union[str, bytes]) -> bytes:
        if isinstance(message, bytes):
            return message
        return message.encode("utf-8")

    @staticmethod
    def _load_rsa_private_key(pem: Union[str, bytes]):
        data = pem.encode("utf-8") if isinstance(pem, str) else pem
        return serialization.load_pem_private_key(data, password=None)

    @staticmethod
    def _load_rsa_public_key(pem: Union[str, bytes]):
        data = pem.encode("utf-8") if isinstance(pem, str) else pem
        return serialization.load_pem_public_key(data)

    @staticmethod
    def generate_rsa_keypair(
        key_size: int = 2048, public_exponent: int = 65537
    ) -> Tuple[str, str]:
        if key_size < 2048:
            raise ValueError(
                "RSA key_size should be at least 2048 bits for current security practice."
            )
        private_key = rsa.generate_private_key(
            public_exponent=public_exponent,
            key_size=key_size,
        )
        priv_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode("utf-8")
        pub_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8")
        return priv_pem, pub_pem

    @staticmethod
    def rsa_max_encrypt_bytes(key_size_bits: int) -> int:
        k = key_size_bits // 8
        h = hashes.SHA256().digest_size
        return k - 2 * h - 2

    @staticmethod
    def rsa_sign(private_key_pem: str, message: Union[str, bytes]) -> str:
        private_key = CryptographicAlgorithm._load_rsa_private_key(private_key_pem)
        msg = CryptographicAlgorithm._bytes_message(message)
        signature = private_key.sign(
            msg,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
        return base64.b64encode(signature).decode("ascii")

    @staticmethod
    def rsa_verify(
        public_key_pem: str, message: Union[str, bytes], signature_b64: str
    ) -> bool:
        try:
            public_key = CryptographicAlgorithm._load_rsa_public_key(public_key_pem)
            msg = CryptographicAlgorithm._bytes_message(message)
            sig = base64.b64decode(signature_b64.encode("ascii"))
            public_key.verify(
                sig,
                msg,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH,
                ),
                hashes.SHA256(),
            )
            return True
        except InvalidSignature:
            return False
        except (ValueError, TypeError):
            return False

    @staticmethod
    def rsa_encrypt(public_key_pem: str, plaintext: Union[str, bytes]) -> str:
        public_key = CryptographicAlgorithm._load_rsa_public_key(public_key_pem)
        key_bits = public_key.key_size
        max_len = CryptographicAlgorithm.rsa_max_encrypt_bytes(key_bits)
        plain = CryptographicAlgorithm._bytes_message(plaintext)
        if len(plain) > max_len:
            raise ValueError(
                f"Plaintext too long for RSA-OAEP ({len(plain)} bytes > {max_len} max for {key_bits}-bit key). "
                "Use a symmetric key for large data, or chunk with a hybrid scheme."
            )
        ciphertext = public_key.encrypt(
            plain,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        return base64.b64encode(ciphertext).decode("ascii")

    @staticmethod
    def rsa_decrypt(private_key_pem: str, ciphertext_b64: str) -> str:
        private_key = CryptographicAlgorithm._load_rsa_private_key(private_key_pem)
        ct = base64.b64decode(ciphertext_b64.encode("ascii"))
        plain = private_key.decrypt(
            ct,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        return plain.decode("utf-8")


# ---------------------------------------------------------------------------
# Memoization (cache keys + optional in-process memo decorator)
# ---------------------------------------------------------------------------


class MemoizationAlgorithm:
    @staticmethod
    def memoize_with_key(key_generator: Callable[..., str]) -> Callable:
        cache: Dict[str, Any] = {}

        def decorator(func: Callable) -> Callable:
            def wrapper(*args: Any, **kwargs: Any) -> Any:
                cache_key = key_generator(*args, **kwargs)
                if cache_key not in cache:
                    cache[cache_key] = func(*args, **kwargs)
                return cache[cache_key]
            
            wrapper.cache_clear = lambda: cache.clear()
            return wrapper
        
        return decorator
    
    @staticmethod
    def generate_hash_key(*args: Any, **kwargs: Any) -> str:
        key_parts = [str(arg) for arg in args]
        key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
        key_string = "|".join(key_parts)
        return CryptographicAlgorithm.sha256_hash(key_string)


# ---------------------------------------------------------------------------
# Sorting (election results, candidate lists)
# ---------------------------------------------------------------------------


class SortingAlgorithm:
    @staticmethod
    def quicksort(
        arr: List[Any], key: Optional[Callable] = None, reverse: bool = False
    ) -> List[Any]:
        if len(arr) <= 1:
            return arr
        
        arr = arr.copy()
        SortingAlgorithm._quicksort_helper(arr, 0, len(arr) - 1, key, reverse)
        return arr
    
    @staticmethod
    def _quicksort_helper(
        arr: List[Any],
        low: int,
        high: int,
        key: Optional[Callable],
        reverse: bool,
    ) -> None:
        if low < high:
            pi = SortingAlgorithm._partition(arr, low, high, key, reverse)
            SortingAlgorithm._quicksort_helper(arr, low, pi - 1, key, reverse)
            SortingAlgorithm._quicksort_helper(arr, pi + 1, high, key, reverse)
    
    @staticmethod
    def _partition(
        arr: List[Any],
        low: int,
        high: int,
        key: Optional[Callable],
        reverse: bool,
    ) -> int:
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
    def mergesort(
        arr: List[Any], key: Optional[Callable] = None, reverse: bool = False
    ) -> List[Any]:
        if len(arr) <= 1:
            return arr
        
        mid = len(arr) // 2
        left = SortingAlgorithm.mergesort(arr[:mid], key, reverse)
        right = SortingAlgorithm.mergesort(arr[mid:], key, reverse)
        
        return SortingAlgorithm._merge(left, right, key, reverse)
    
    @staticmethod
    def _merge(
        left: List[Any],
        right: List[Any],
        key: Optional[Callable],
        reverse: bool,
    ) -> List[Any]:
        result: List[Any] = []
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
    

# ---------------------------------------------------------------------------
# Small convenience wrappers (optional)
# ---------------------------------------------------------------------------


def aggregate_by(
    items: Iterable[Any],
    key_func: Callable[[Any], Any],
                 value_func: Optional[Callable[[Any], Any]] = None,
    operation: str = "count",
) -> Dict[Any, Any]:
    return AggregationAlgorithm.aggregate(items, key_func, value_func, operation)


def sort_by(
    items: List[Any],
    key_func: Optional[Callable[[Any], Any]] = None,
    reverse: bool = False,
    algorithm: str = "quicksort",
) -> List[Any]:
    if algorithm == "mergesort":
        return SortingAlgorithm.mergesort(items, key_func, reverse)
        return SortingAlgorithm.quicksort(items, key_func, reverse)


def search(
    items: List[Any],
    target: Any,
    key_func: Optional[Callable[[Any], Any]] = None,
    sorted_list: bool = True,
) -> int:
    if sorted_list:
        return SearchingAlgorithm.binary_search(items, target, key_func)
        return SearchingAlgorithm.linear_search(items, target, key_func)
