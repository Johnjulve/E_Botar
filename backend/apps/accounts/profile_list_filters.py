"""Shared queryset filters for paginated profile list endpoints."""
from django.db.models import Q


def parse_csv_query_values(raw_value):
    if not raw_value:
        return []
    return [part.strip() for part in str(raw_value).split(',') if part.strip()]


def apply_profile_list_filters(queryset, query_params, *, include_email_search=False):
    """Apply common list filters from query parameters."""
    role = (query_params.get('role') or '').lower()
    if role == 'admin':
        queryset = queryset.filter(user__is_superuser=True)
    elif role == 'staff':
        queryset = queryset.filter(user__is_staff=True, user__is_superuser=False)
    elif role == 'student':
        queryset = queryset.filter(user__is_staff=False, user__is_superuser=False)

    is_verified = query_params.get('is_verified')
    if is_verified in ('true', 'false'):
        queryset = queryset.filter(is_verified=(is_verified == 'true'))

    is_active = query_params.get('is_active')
    if is_active in ('true', 'false'):
        queryset = queryset.filter(user__is_active=(is_active == 'true'))

    department_code = query_params.get('department_code') or query_params.get('college')
    if department_code:
        queryset = queryset.filter(department__code=department_code)

    course_codes = parse_csv_query_values(
        query_params.get('course_codes') or query_params.get('course_code') or query_params.get('course')
    )
    if course_codes:
        queryset = queryset.filter(course__code__in=course_codes)

    year_levels = parse_csv_query_values(
        query_params.get('year_levels') or query_params.get('year_level')
    )
    if year_levels:
        queryset = queryset.filter(year_level__in=year_levels)

    search = (query_params.get('search') or '').strip()
    if search:
        search_q = (
            Q(user__username__icontains=search)
            | Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
            | Q(student_id__icontains=search)
        )
        if include_email_search:
            search_q |= Q(user__email__icontains=search)
        queryset = queryset.filter(search_q)

    return queryset
