"""
Feature flags persisted in SystemSettings (JSON).

Temporary disables for exports, public registration, Google sign-in, and staff nav preview.
Password sign-in is always available.
"""
from __future__ import annotations

import json

from ..models import SystemSettings

FEATURE_FLAGS_STORAGE_KEY = 'feature_flags'

DEFAULT_FEATURE_FLAGS = {
    'data_export': True,
    'user_registration': True,
    'google_login': True,
    'staff_preview_disabled_features': True,
}


def coerce_feature_flags_dict(raw_payload) -> dict:
    """Merge user payload onto defaults with bool coercion."""
    if isinstance(raw_payload, dict):
        parsed = dict(raw_payload)
    elif isinstance(raw_payload, str) and raw_payload.strip():
        try:
            parsed = json.loads(raw_payload)
        except json.JSONDecodeError:
            parsed = {}
    else:
        parsed = {}

    normalized = DEFAULT_FEATURE_FLAGS.copy()
    for key in DEFAULT_FEATURE_FLAGS:
        if key in parsed:
            normalized[key] = bool(parsed[key])
    return normalized


def load_feature_flags() -> dict:
    stored = SystemSettings.get_value(FEATURE_FLAGS_STORAGE_KEY, default='')
    if not stored or not str(stored).strip():
        return DEFAULT_FEATURE_FLAGS.copy()
    return coerce_feature_flags_dict(stored)


def merge_and_save_feature_flags(patch: dict, user) -> dict:
    current = load_feature_flags()
    for key in DEFAULT_FEATURE_FLAGS:
        if key in patch:
            current[key] = bool(patch[key])
    SystemSettings.set_value(
        FEATURE_FLAGS_STORAGE_KEY,
        json.dumps(current),
        description='Temporary feature switches (maintenance)',
        user=user,
    )
    return current
