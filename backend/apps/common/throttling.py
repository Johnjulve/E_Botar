from rest_framework.exceptions import Throttled
from rest_framework.throttling import UserRateThrottle


class ScopedUserThrottle(UserRateThrottle):
    """
    Generic per-user throttle that uses DRF's scoped rate limits.

    Example:
        throttle = ScopedUserThrottle(scope='vote_submit')
        if not throttle.allow_request(request, view):
            ...

    The actual rate is configured in:
        REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['vote_submit']
    """

    scope = None

    def __init__(self, scope=None):
        # Scope is required - raise error if not provided
        if not scope:
            raise ValueError("ScopedUserThrottle requires a 'scope' parameter")
        # Set scope BEFORE calling super().__init__() so DRF's get_rate() can find it
        self.scope = scope
        super().__init__()


def enforce_scope_throttle(request, view, scope, message):
    """
    Utility helper to enforce a scoped throttle inline inside any view.
    Raises DRF's Throttled exception when the limit is exceeded.
    """
    throttle = ScopedUserThrottle(scope=scope)
    if not throttle.allow_request(request, view):
        raise Throttled(detail=message)

