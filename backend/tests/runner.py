"""
Custom test runner providing detailed, test-by-test verbosity by default.
"""

from django.test.runner import DiscoverRunner


class VerboseTestRunner(DiscoverRunner):
    """
    Custom DiscoverRunner that automatically defaults verbosity to 2,
    printing each individual test method name, class, and execution status
    (ok, skipped, FAIL, ERROR) without needing to pass `-v 2` every time.
    """

    def __init__(self, **kwargs):
        if kwargs.get('verbosity', 1) == 1:
            kwargs['verbosity'] = 2
        super().__init__(**kwargs)
