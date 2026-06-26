"""Path helpers for uploaded media.

Each ``*_upload_path`` callable is suitable as a Django ``upload_to`` argument.
They name files after the user's stable identifier (their ``student_id`` when
set, falling back to ``username`` then ``pk``) so that re-uploading replaces
the old file in storage instead of leaving orphans, and so that the resulting
public URL reads cleanly (``profile_photos/2024-12345.jpg``).

When a user's ``student_id`` later changes, ``UserProfile.save()`` reads the
existing file's bytes and re-feeds them through Django's normal
``FileField`` pipeline (a fresh ``ContentFile`` assignment + ``super().save``).
That triggers ``upload_to`` again with the new ID, so the rename happens via
the same path used for any other upload — no custom rename plumbing required.

This module is storage-agnostic: it works with the local filesystem and with
``apps.common.files.storage.ResilientMediaCloudinaryStorage``. The Cloudinary folder
prefix (e.g. ``E-Botar/``) is applied transparently inside ``_save`` of that
storage class, so the paths produced here are kept short and unprefixed.
"""

from __future__ import annotations

import os
from typing import Optional

from django.utils.text import slugify


PROFILE_PHOTO_FOLDER = "profile_photos"
CANDIDATE_PHOTO_FOLDER = "candidate_photos"


def safe_extension(filename: Optional[str]) -> str:
    """Return a lowercased extension (with leading dot), or empty string."""
    if not filename:
        return ""
    _, ext = os.path.splitext(filename)
    return ext.lower()


def user_filename_identifier(user) -> str:
    """Pick the most stable, filesystem-safe identifier for a user's uploads.

    Order of preference:
        1. ``user.profile.student_id`` (when set and non-blank).
        2. ``user.username`` (slugified for filesystem safety).
        3. ``user.pk`` (as a string).
        4. The literal ``"user"`` for an unsaved / detached user.
    """
    if user is None:
        return "user"
    profile = getattr(user, "profile", None)
    if profile is not None:
        student_id = (getattr(profile, "student_id", "") or "").strip()
        if student_id:
            return student_id
    username = (getattr(user, "username", "") or "").strip()
    if username:
        return slugify(username) or username
    pk = getattr(user, "pk", None)
    if pk:
        return str(pk)
    return "user"


def _instance_user(instance):
    """Return the User attached to a model instance.

    Works for ``UserProfile`` (``.user``) and ``Candidate`` /
    ``CandidateApplication`` (also ``.user``).
    """
    return getattr(instance, "user", None)


def avatar_upload_path(instance, filename: str) -> str:
    """``upload_to`` for ``UserProfile.avatar``.

    Final form: ``profile_photos/<student_id>.<ext>``.
    """
    identifier = user_filename_identifier(_instance_user(instance))
    return f"{PROFILE_PHOTO_FOLDER}/{identifier}{safe_extension(filename)}"


def candidate_photo_upload_path(instance, filename: str) -> str:
    """``upload_to`` for ``Candidate.photo`` and ``CandidateApplication.photo``.

    Final form: ``candidate_photos/<student_id>.<ext>``.
    """
    identifier = user_filename_identifier(_instance_user(instance))
    return f"{CANDIDATE_PHOTO_FOLDER}/{identifier}{safe_extension(filename)}"
