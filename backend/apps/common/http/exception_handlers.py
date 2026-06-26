"""
Custom DRF exception handler for E-Botar.

Currently focused on media upload failures: when Cloudinary is configured but
unreachable / misconfigured / rate-limited, the upload path raises
``MediaUploadUnavailable`` (see ``apps.common.files.storage``). We translate that
into a clean ``503 Service Unavailable`` response so frontend forms display
the friendly message ``Unavailable at the moment.`` instead of a server error.

Wire-up: ``REST_FRAMEWORK['EXCEPTION_HANDLER']`` in ``backend/settings.py``.
"""

from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from ..files.storage import MediaUploadUnavailable

logger = logging.getLogger(__name__)


try:  # pragma: no cover - import guard
    from cloudinary.exceptions import Error as _CloudinaryError  # type: ignore
except Exception:
    _CloudinaryError = None  # type: ignore[assignment]


_MEDIA_UNAVAILABLE_PAYLOAD = {
    "detail": "Unavailable at the moment.",
    "code": "media_upload_unavailable",
}


def media_aware_exception_handler(exc, context):
    """DRF handler that converts media upload failures to ``503``.

    Falls through to the default DRF behavior for everything else.
    """
    response = drf_exception_handler(exc, context)
    if response is not None:
        return response

    if isinstance(exc, MediaUploadUnavailable) or (
        _CloudinaryError is not None and isinstance(exc, _CloudinaryError)
    ):
        logger.warning("Returning 503 for media upload failure: %s", exc)
        return Response(
            _MEDIA_UNAVAILABLE_PAYLOAD,
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return None
