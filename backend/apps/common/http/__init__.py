"""HTTP request-cycle adapters: permissions, throttling, middleware, exception handling.

Modules in this subpackage plug into Django/DRF's request lifecycle.
They are referenced by string from ``backend/settings.py``
(``MIDDLEWARE`` and ``REST_FRAMEWORK['EXCEPTION_HANDLER']``) and by direct
import from the per-module views.
"""
