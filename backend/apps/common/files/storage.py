"""
Media storage helpers for E-Botar.

Provides a resilient Cloudinary storage wrapper that:

1. Confines all uploads to a configurable Cloudinary folder
   (``CLOUDINARY_MEDIA_FOLDER``, default ``"E-Botar"``) so the project's
   assets are grouped together inside the Cloudinary Media Library
   instead of polluting the root of the cloud.
2. Converts upload failures (network issues, auth errors, Cloudinary
   outages) into a single stable exception type,
   ``MediaUploadUnavailable``. The DRF exception handler in
   ``apps.common.http.exception_handlers`` converts that into a friendly
   ``HTTP 503`` response with ``detail = 'Unavailable at the moment.'``
   instead of leaking a generic 500 error to end users.

Local development (no Cloudinary configured) keeps using
``django.core.files.storage.FileSystemStorage`` and is unaffected.
"""

from __future__ import annotations

import logging
import os
import posixpath

from django.conf import settings

logger = logging.getLogger(__name__)


class MediaUploadUnavailable(Exception):
    """Raised when the media storage backend can't accept an upload right now."""


try:  # pragma: no cover - import guard
    from cloudinary_storage.storage import MediaCloudinaryStorage  # type: ignore
    import cloudinary.uploader as _cloudinary_uploader  # type: ignore
except Exception:  # ImportError or any cloudinary import-time failure
    MediaCloudinaryStorage = None  # type: ignore[assignment]
    _cloudinary_uploader = None  # type: ignore[assignment]


def _configured_media_folder() -> str:
    """Return the normalized Cloudinary media folder, e.g. ``"E-Botar"``.

    Reads ``settings.CLOUDINARY_MEDIA_FOLDER``. Empty / whitespace means
    "no folder prefix" (assets go to the root of the Cloudinary cloud).
    """
    raw = getattr(settings, "CLOUDINARY_MEDIA_FOLDER", "") or ""
    return raw.strip().strip("/")


def apply_media_folder(name: str) -> str:
    """Prepend the Cloudinary media folder to a storage name, idempotently.

    - ``"profile_photos/abc.jpg"`` → ``"E-Botar/profile_photos/abc.jpg"``
    - ``"E-Botar/profile_photos/abc.jpg"`` → unchanged (already prefixed).
    - ``""`` or ``None`` with a folder set → ``"E-Botar"``.
    - No folder configured → ``name`` unchanged.
    """
    folder = _configured_media_folder()
    if not folder:
        return name or ""
    normalized = (name or "").lstrip("/")
    if not normalized:
        return folder
    if normalized == folder or normalized.startswith(folder + "/"):
        return normalized
    return posixpath.join(folder, normalized)


if MediaCloudinaryStorage is not None:

    class ResilientMediaCloudinaryStorage(MediaCloudinaryStorage):  # type: ignore[misc]
        """Cloudinary media storage that:

        - Places every upload inside the configured folder
          (``settings.CLOUDINARY_MEDIA_FOLDER``).
        - Uploads with an exact public_id (no random ``_xxxxxx`` suffix) and
          ``overwrite=True`` so re-uploading the same student replaces the
          previous asset rather than creating a sibling like
          ``2024-12345_ydulyy``.
        - Converts upload failures to ``MediaUploadUnavailable`` so the DRF
          exception handler can return a polite 503 (
          "Unavailable at the moment.") instead of a 500.

        Read-side operations (``url``, ``exists``, ``delete``) keep their
        default behavior because the prefixed name is what gets stored on
        the model field and round-trips transparently.
        """

        def get_available_name(self, name, max_length=None):
            return super().get_available_name(
                apply_media_folder(name), max_length=max_length
            )

        def _save(self, name, content):
            prefixed_name = apply_media_folder(name)
            try:
                return super()._save(prefixed_name, content)
            except MediaUploadUnavailable:
                raise
            except Exception as exc:
                logger.warning(
                    "Cloudinary media upload failed for %s: %s",
                    prefixed_name,
                    exc,
                    exc_info=True,
                )
                raise MediaUploadUnavailable(
                    "Cloudinary media upload failed; service appears unavailable."
                ) from exc

else:  # pragma: no cover - cloudinary package not installed
    ResilientMediaCloudinaryStorage = None  # type: ignore[assignment]
