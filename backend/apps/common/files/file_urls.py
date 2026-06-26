"""Public-URL helpers for Django ``FileField`` / ``ImageField`` values.

The accounts and candidates serializers both need to expose an absolute URL
for an uploaded media file. Historically each one had its own copy of the
logic, and both had the same Cloudinary bug:

    base = settings.BACKEND_BASE_URL.rstrip('/')
    media = file_field.url.lstrip('/')
    return f"{base}/{media}"

When media is hosted on Cloudinary, ``file_field.url`` is already an
absolute URL like ``https://res.cloudinary.com/...``. ``str.lstrip('/')``
does not strip ``https://``, so the result becomes
``http://localhost:8000/https://res.cloudinary.com/...`` — which the
browser then 404s on.

``absolute_file_url`` centralizes the correct resolution:

1. ``None`` / falsy file field → ``None``.
2. ``file_field.url`` already absolute (``http://`` / ``https://``) → return
   verbatim. This is the Cloudinary path.
3. ``settings.BACKEND_BASE_URL`` configured → ``"<base>/<relative>"``. This
   keeps the previously-working behavior for proxied deployments where
   Django doesn't see the public host.
4. ``request`` available → ``request.build_absolute_uri(file.url)``.
5. Fallback → the raw ``file_field.url`` (relative).
"""

from __future__ import annotations

from typing import Optional

from django.conf import settings


def _is_absolute_url(value: str) -> bool:
    """Return True if ``value`` already includes an http(s) scheme."""
    if not value:
        return False
    lower = value.lower()
    return lower.startswith("http://") or lower.startswith("https://")


def absolute_file_url(file_field, request=None) -> Optional[str]:
    """Return a browser-resolvable URL for ``file_field``.

    Safe to call with a ``FieldFile`` whose underlying file is missing — the
    function never reads the file, only its ``.url`` attribute.
    """
    if not file_field:
        return None

    try:
        raw_url = file_field.url
    except (ValueError, AttributeError):
        return None

    if not raw_url:
        return None

    if _is_absolute_url(raw_url):
        return raw_url

    backend_base = getattr(settings, "BACKEND_BASE_URL", None)
    if backend_base:
        return f"{backend_base.rstrip('/')}/{raw_url.lstrip('/')}"

    if request is not None:
        try:
            return request.build_absolute_uri(raw_url)
        except Exception:
            scheme = getattr(request, "scheme", None)
            host_getter = getattr(request, "get_host", None)
            if scheme and callable(host_getter):
                return f"{scheme}://{host_getter()}{raw_url}"

    return raw_url
