"""
Helpers for staff-scoped profile management (year-level hierarchy).
"""
import re

from .models import UserProfile


def parse_year_level_value(raw):
    """
    Extract a numeric year level from free text (e.g. '3rd Year', 'Year 2', '4').
    Returns None if no digit found.
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    m = re.search(r'\d+', s)
    if m:
        return int(m.group(0))
    return None


def staff_can_manage_student_profile(actor, target_profile):
    """
    Non-superuser staff may manage only student accounts (not staff/admin) whose
    academic year level is at or below the staff member's own year_level.

    Superusers may manage anyone. Returns False if staff has no parseable year_level
    (they must set year level on their profile to use this scope).
    """
    if actor.is_superuser:
        return True
    if not getattr(actor, 'is_staff', False):
        return False

    target_user = target_profile.user
    if target_user.is_superuser or target_user.is_staff:
        return False

    try:
        staff_profile = actor.profile
    except UserProfile.DoesNotExist:
        return False

    staff_y = parse_year_level_value(getattr(staff_profile, 'year_level', None))
    if staff_y is None:
        return False

    target_y = parse_year_level_value(getattr(target_profile, 'year_level', None))
    if target_y is None:
        return True

    return target_y <= staff_y
