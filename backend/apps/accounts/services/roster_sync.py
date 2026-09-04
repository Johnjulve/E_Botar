"""
Student Roster Synchronization & CSV/Excel Parser Engine.

Supports parsing .xlsx and .csv student roster files exported from university
registrars, normalizes student metadata, validates formats, and calculates
roster diffs (to create, to update, and to deactivate) before database execution.
"""

from __future__ import annotations

import csv
import io
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction

from apps.accounts.models import Program, UserProfile
from apps.accounts.oauth import build_unique_username_from_email
from apps.common.models import ActivityLog


# Canonical column alias mappings
HEADER_ALIASES: Dict[str, List[str]] = {
    'student_id': [
        'student_id', 'student id', 'studentid', 'id_number', 'id number',
        'id_no', 'id no', 'student_no', 'student no', 'id', 'student number'
    ],
    'email': [
        'email', 'email_address', 'email address', 'student_email', 'student email', 'mail'
    ],
    'first_name': [
        'first_name', 'first name', 'fname', 'given_name', 'given name', 'firstname'
    ],
    'last_name': [
        'last_name', 'last name', 'lname', 'surname', 'family_name', 'family name', 'lastname'
    ],
    'middle_name': [
        'middle_name', 'middle name', 'mname', 'middlename', 'm.i.', 'mi'
    ],
    'department': [
        'department', 'dept', 'college', 'department_code', 'dept_code', 'department code'
    ],
    'course': [
        'course', 'program', 'course_code', 'prog', 'degree', 'degree_program', 'course code'
    ],
    'year_level': [
        'year_level', 'year level', 'year', 'yr_lvl', 'yr lvl', 'level', 'academic_year', 'yr'
    ],
    'section': [
        'section', 'sec', 'block', 'class_section', 'class section'
    ],
}


def normalize_header_key(header: str) -> str:
    """Normalize header text for alias dictionary lookup."""
    return re.sub(r'[\s_\-]+', ' ', str(header or '').strip().lower())


def normalize_year_level(raw: Any) -> str:
    """
    Normalize diverse year-level representations into standard academic format:
    e.g. '1', '1st', '1st Year', 'Year 1', 'first' -> '1st Year'
    """
    if raw is None:
        return ''
    s = str(raw).strip()
    if not s:
        return ''

    # Direct numeric regex match
    m = re.search(r'\d+', s)
    if m:
        val = int(m.group(0))
        suffix = {1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year', 5: '5th Year'}.get(val)
        if suffix:
            return suffix
        return f'{val}th Year'

    lower = s.lower()
    if 'first' in lower or 'freshman' in lower:
        return '1st Year'
    if 'second' in lower or 'sophomore' in lower:
        return '2nd Year'
    if 'third' in lower or 'junior' in lower:
        return '3rd Year'
    if 'fourth' in lower or 'senior' in lower:
        return '4th Year'
    if 'fifth' in lower:
        return '5th Year'

    return s.title()


def normalize_student_id(raw: Any) -> str:
    """
    Ensure student ID matches XXXX-XXXXX.
    If 9 consecutive digits like 202412345, automatically format as 2024-12345.
    """
    if raw is None:
        return ''
    s = str(raw).strip()
    if not s:
        return ''

    # Check for XXXX-XXXXX
    if re.match(r'^\d{4}-\d{5}$', s):
        return s

    # Check for contiguous 9 digits
    clean_digits = re.sub(r'\D', '', s)
    if len(clean_digits) == 9:
        return f'{clean_digits[:4]}-{clean_digits[4:]}'

    return s


class StudentRosterParser:
    """Enterprise parser for CSV and Excel (.xlsx) student enrollment rosters."""

    def __init__(self):
        # Pre-cache active departments and courses for fast case-insensitive lookup
        self.departments_by_code: Dict[str, Program] = {}
        self.departments_by_name: Dict[str, Program] = {}
        self.courses_by_code: Dict[str, Program] = {}
        self.courses_by_name: Dict[str, Program] = {}
        self._load_programs()

    def _load_programs(self) -> None:
        for prog in Program.objects.filter(is_active=True).select_related('department'):
            code_lower = prog.code.lower()
            name_lower = prog.name.lower()
            if prog.program_type == Program.ProgramType.DEPARTMENT:
                self.departments_by_code[code_lower] = prog
                self.departments_by_name[name_lower] = prog
            elif prog.program_type == Program.ProgramType.COURSE:
                self.courses_by_code[code_lower] = prog
                self.courses_by_name[name_lower] = prog

    def resolve_department(self, identifier: Optional[str]) -> Optional[Program]:
        if not identifier:
            return None
        cleaned = str(identifier).strip().lower()
        return self.departments_by_code.get(cleaned) or self.departments_by_name.get(cleaned)

    def resolve_course(self, identifier: Optional[str]) -> Optional[Program]:
        if not identifier:
            return None
        cleaned = str(identifier).strip().lower()
        return self.courses_by_code.get(cleaned) or self.courses_by_name.get(cleaned)

    def map_columns(self, header_row: List[Any]) -> Dict[str, int]:
        """
        Map header names to canonical field keys using alias dictionary.
        Returns mapping of canonical_key -> column_index.
        """
        mapping: Dict[str, int] = {}
        for idx, col in enumerate(header_row):
            if col is None:
                continue
            normalized = normalize_header_key(str(col))
            for canonical, aliases in HEADER_ALIASES.items():
                if canonical not in mapping and normalized in aliases:
                    mapping[canonical] = idx
                    break
        return mapping

    def parse_rows(self, raw_rows: List[List[Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Parse raw 2D list of cells.
        Returns (valid_rows, error_rows).
        """
        if not raw_rows:
            return [], [{'row_number': 0, 'field': 'file', 'error': 'The uploaded file contains no data.'}]

        # Find header row (first non-empty row)
        header_idx = -1
        col_map: Dict[str, int] = {}
        for i, row in enumerate(raw_rows):
            if any(cell is not None and str(cell).strip() != '' for cell in row):
                col_map = self.map_columns(row)
                if 'email' in col_map or 'student_id' in col_map:
                    header_idx = i
                    break

        if header_idx == -1 or ('email' not in col_map and 'student_id' not in col_map):
            return [], [{
                'row_number': 1,
                'field': 'header',
                'error': 'Missing required header columns. File must contain at least "Email" and/or "Student ID".'
            }]

        valid_rows: List[Dict[str, Any]] = []
        error_rows: List[Dict[str, Any]] = []
        seen_student_ids: Set[str] = set()
        seen_emails: Set[str] = set()

        for row_num, row in enumerate(raw_rows[header_idx + 1:], start=header_idx + 2):
            # Skip empty rows
            if not any(cell is not None and str(cell).strip() != '' for cell in row):
                continue

            def get_val(key: str) -> str:
                if key in col_map and col_map[key] < len(row):
                    cell = row[col_map[key]]
                    return str(cell).strip() if cell is not None else ''
                return ''

            raw_student_id = get_val('student_id')
            raw_email = get_val('email')
            first_name = get_val('first_name')
            last_name = get_val('last_name')
            middle_name = get_val('middle_name')
            raw_dept = get_val('department')
            raw_course = get_val('course')
            raw_year = get_val('year_level')
            section = get_val('section')

            row_errors: List[str] = []

            # 1. Validate Student ID
            student_id = normalize_student_id(raw_student_id)
            if student_id:
                if not re.match(r'^\d{4}-\d{5}$', student_id):
                    row_errors.append(f"Invalid Student ID format: '{raw_student_id}'. Expected 'YYYY-XXXXX' (e.g. 2024-12345).")
                elif student_id in seen_student_ids:
                    row_errors.append(f"Duplicate Student ID in file: '{student_id}'.")
                else:
                    seen_student_ids.add(student_id)

            # 2. Validate Email
            email = raw_email.lower().strip()
            if not email:
                row_errors.append("Email address is required.")
            else:
                try:
                    validate_email(email)
                except ValidationError:
                    row_errors.append(f"Invalid email address: '{raw_email}'.")
                else:
                    if email in seen_emails:
                        row_errors.append(f"Duplicate email address in file: '{email}'.")
                    else:
                        seen_emails.add(email)

            # 3. Validate Names
            if not first_name:
                row_errors.append("First name is required.")
            if not last_name:
                row_errors.append("Last name is required.")

            # 4. Resolve Course & Department
            course_obj = self.resolve_course(raw_course) if raw_course else None
            if raw_course and not course_obj:
                row_errors.append(f"Unrecognized Course / Program: '{raw_course}'.")

            dept_obj = self.resolve_department(raw_dept) if raw_dept else None
            if raw_dept and not dept_obj:
                row_errors.append(f"Unrecognized Department / College: '{raw_dept}'.")

            # If course is resolved but department was omitted, inherit course's department
            if course_obj and not dept_obj and course_obj.department:
                dept_obj = course_obj.department

            # 5. Normalize Year Level
            year_level = normalize_year_level(raw_year)

            if row_errors:
                error_rows.append({
                    'row_number': row_num,
                    'student_id': raw_student_id,
                    'email': raw_email,
                    'name': f'{first_name} {last_name}'.strip(),
                    'errors': row_errors,
                })
            else:
                valid_rows.append({
                    'row_number': row_num,
                    'student_id': student_id,
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'middle_name': middle_name,
                    'department_code': dept_obj.code if dept_obj else '',
                    'department_name': dept_obj.name if dept_obj else '',
                    'course_code': course_obj.code if course_obj else '',
                    'course_name': course_obj.name if course_obj else '',
                    'year_level': year_level,
                    'section': section,
                })

        return valid_rows, error_rows

    def parse_file(self, file_obj: Any, filename: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Main entry point for parsing file stream (.xlsx or .csv).
        """
        lower_name = filename.lower()
        if lower_name.endswith(('.xlsx', '.xlsm', '.xltx')):
            return self._parse_excel(file_obj)
        elif lower_name.endswith(('.csv', '.txt', '.tsv')):
            return self._parse_csv(file_obj)
        else:
            return [], [{
                'row_number': 0,
                'field': 'format',
                'error': f"Unsupported file format '{filename}'. Please upload an Excel (.xlsx) or CSV (.csv) file."
            }]

    def _parse_excel(self, file_obj: Any) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        try:
            import openpyxl
        except ImportError:
            return [], [{'row_number': 0, 'field': 'dependency', 'error': 'openpyxl is not installed on the server.'}]

        try:
            wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
            sheet = wb.active
            raw_rows: List[List[Any]] = []
            for row in sheet.iter_rows(values_only=True):
                raw_rows.append(list(row))
            return self.parse_rows(raw_rows)
        except Exception as exc:
            return [], [{'row_number': 0, 'field': 'file', 'error': f'Failed to parse Excel file: {str(exc)}'}]

    def _parse_csv(self, file_obj: Any) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        try:
            raw_content = file_obj.read()
            if isinstance(raw_content, bytes):
                try:
                    text_content = raw_content.decode('utf-8-sig')
                except UnicodeDecodeError:
                    text_content = raw_content.decode('latin1')
            else:
                text_content = str(raw_content)

            f = io.StringIO(text_content)
            # Sniff dialect or default to excel comma-separated
            try:
                sample = text_content[:2048]
                dialect = csv.Sniffer().sniff(sample)
            except Exception:
                dialect = csv.excel

            reader = csv.reader(f, dialect)
            raw_rows = [row for row in reader]
            return self.parse_rows(raw_rows)
        except Exception as exc:
            return [], [{'row_number': 0, 'field': 'file', 'error': f'Failed to parse CSV file: {str(exc)}'}]


def classify_roster_diff(valid_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compare valid roster rows against current database users and profiles.
    Returns categorized diff containing:
    - to_create: list of student dicts to be added
    - to_update: list of existing students with field diffs
    - to_deactivate: list of registered students NOT present in the uploaded active roster
    - stats: summary counts
    """
    emails_in_roster = {r['email'].lower() for r in valid_rows}
    student_ids_in_roster = {r['student_id'] for r in valid_rows if r.get('student_id')}

    # Fetch all existing non-staff students
    existing_users = User.objects.filter(is_staff=False, is_superuser=False).select_related(
        'profile', 'profile__department', 'profile__course'
    )

    users_by_email: Dict[str, User] = {u.email.lower(): u for u in existing_users if u.email}
    users_by_student_id: Dict[str, User] = {
        u.profile.student_id: u for u in existing_users if getattr(u, 'profile', None) and u.profile.student_id
    }

    to_create: List[Dict[str, Any]] = []
    to_update: List[Dict[str, Any]] = []
    matched_user_ids: Set[int] = set()

    for row in valid_rows:
        email = row['email'].lower()
        sid = row.get('student_id', '')

        matched_user = users_by_email.get(email) or (users_by_student_id.get(sid) if sid else None)

        if matched_user is None:
            to_create.append(row)
        else:
            matched_user_ids.add(matched_user.id)
            profile = getattr(matched_user, 'profile', None)

            # Determine field differences
            changes: Dict[str, Dict[str, Any]] = {}

            # Name changes
            if row['first_name'] and matched_user.first_name != row['first_name']:
                changes['first_name'] = {'old': matched_user.first_name, 'new': row['first_name']}
            if row['last_name'] and matched_user.last_name != row['last_name']:
                changes['last_name'] = {'old': matched_user.last_name, 'new': row['last_name']}

            # Profile changes
            if profile:
                if row.get('middle_name') and profile.middle_name != row['middle_name']:
                    changes['middle_name'] = {'old': profile.middle_name, 'new': row['middle_name']}
                if sid and profile.student_id != sid:
                    changes['student_id'] = {'old': profile.student_id, 'new': sid}

                current_dept_code = profile.department.code if profile.department else ''
                if row.get('department_code') and current_dept_code != row['department_code']:
                    changes['department'] = {'old': current_dept_code, 'new': row['department_code']}

                current_course_code = profile.course.code if profile.course else ''
                if row.get('course_code') and current_course_code != row['course_code']:
                    changes['course'] = {'old': current_course_code, 'new': row['course_code']}

                if row.get('year_level') and profile.year_level != row['year_level']:
                    changes['year_level'] = {'old': profile.year_level, 'new': row['year_level']}

                if row.get('section') and profile.section != row['section']:
                    changes['section'] = {'old': profile.section, 'new': row['section']}

            if not matched_user.is_active:
                changes['is_active'] = {'old': False, 'new': True}

            if changes:
                to_update.append({
                    **row,
                    'user_id': matched_user.id,
                    'username': matched_user.username,
                    'changes': changes,
                })

    # Students currently active in the database but omitted from the active roster
    to_deactivate: List[Dict[str, Any]] = []
    for user in existing_users:
        if user.is_active and user.id not in matched_user_ids:
            prof = getattr(user, 'profile', None)
            to_deactivate.append({
                'user_id': user.id,
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'student_id': prof.student_id if prof else '',
                'course': prof.course.code if (prof and prof.course) else '',
                'year_level': prof.year_level if prof else '',
            })

    return {
        'to_create': to_create,
        'to_update': to_update,
        'to_deactivate': to_deactivate,
        'stats': {
            'total_valid_rows': len(valid_rows),
            'to_create_count': len(to_create),
            'to_update_count': len(to_update),
            'to_deactivate_count': len(to_deactivate),
        }
    }


def execute_roster_sync(
    diff: Dict[str, Any],
    deactivate_unlisted: bool = False,
    actor_user: Optional[User] = None,
    ip_address: str = '',
) -> Dict[str, Any]:
    """
    Executes atomic database synchronization for a classified roster diff.
    Creates new users and profiles, updates continuing students, optionally
    deactivates unlisted accounts, creates an immutable ActivityLog entry,
    and invalidates caches.
    """
    created_users: List[User] = []
    updated_users: List[User] = []
    deactivated_count = 0

    programs_by_code: Dict[str, Program] = {
        p.code.lower(): p for p in Program.objects.filter(is_active=True)
    }

    with transaction.atomic():
        # 1. Create new students
        for item in diff.get('to_create', []):
            email = item['email'].strip().lower()
            sid = item.get('student_id', '').strip()
            first_name = item.get('first_name', '').strip()
            last_name = item.get('last_name', '').strip()
            middle_name = item.get('middle_name', '').strip()

            if sid and not User.objects.filter(username=sid).exists():
                username = sid
            else:
                username = build_unique_username_from_email(email)

            digits = re.sub(r'\D', '', sid)
            default_password = f"Univ@{digits}" if digits else "Univ@Student2026!"

            user = User.objects.create_user(
                username=username,
                email=email,
                password=default_password,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
            )

            dept_obj = programs_by_code.get((item.get('department_code') or '').lower())
            course_obj = programs_by_code.get((item.get('course_code') or '').lower())
            if course_obj and not dept_obj and course_obj.department:
                dept_obj = course_obj.department

            UserProfile.objects.create(
                user=user,
                student_id=sid or None,
                middle_name=middle_name,
                department=dept_obj,
                course=course_obj,
                year_level=item.get('year_level', ''),
                section=item.get('section', ''),
                must_change_password=True,
                is_verified=True,
            )
            created_users.append(user)

        # 2. Update existing students
        for item in diff.get('to_update', []):
            user = User.objects.get(id=item['user_id'])
            user_updates = []
            if item.get('first_name') and user.first_name != item['first_name']:
                user.first_name = item['first_name']
                user_updates.append('first_name')
            if item.get('last_name') and user.last_name != item['last_name']:
                user.last_name = item['last_name']
                user_updates.append('last_name')
            if not user.is_active:
                user.is_active = True
                user_updates.append('is_active')

            if user_updates:
                user.save(update_fields=user_updates)

            profile = getattr(user, 'profile', None)
            if not profile:
                profile = UserProfile.objects.create(user=user)

            if item.get('student_id') and profile.student_id != item['student_id']:
                profile.student_id = item['student_id']
            if item.get('middle_name') and profile.middle_name != item['middle_name']:
                profile.middle_name = item['middle_name']
            if item.get('department_code'):
                dept_obj = programs_by_code.get(item['department_code'].lower())
                if dept_obj:
                    profile.department = dept_obj
            if item.get('course_code'):
                course_obj = programs_by_code.get(item['course_code'].lower())
                if course_obj:
                    profile.course = course_obj
                    if not item.get('department_code') and course_obj.department:
                        profile.department = course_obj.department
            if item.get('year_level') and profile.year_level != item['year_level']:
                profile.year_level = item['year_level']
            if item.get('section') and profile.section != item['section']:
                profile.section = item['section']

            profile.is_verified = True
            profile.save()
            updated_users.append(user)

        # 3. Deactivate unlisted students if selected
        if deactivate_unlisted:
            unlisted_ids = [u['user_id'] for u in diff.get('to_deactivate', [])]
            if unlisted_ids:
                deactivated_count = User.objects.filter(id__in=unlisted_ids, is_active=True).update(is_active=False)

        # 4. Audit Log
        try:
            ActivityLog.objects.create(
                user=actor_user,
                action='import',
                resource_type='StudentRoster',
                description=(
                    f"Roster synchronized: {len(created_users)} created, "
                    f"{len(updated_users)} updated, "
                    f"{deactivated_count} deactivated."
                ),
                ip_address=ip_address,
                metadata={
                    'created_count': len(created_users),
                    'updated_count': len(updated_users),
                    'deactivated_count': deactivated_count,
                    'deactivate_unlisted': deactivate_unlisted,
                },
            )
        except Exception:
            pass

        # 5. Clear cache
        cache.clear()

    return {
        'created_count': len(created_users),
        'updated_count': len(updated_users),
        'deactivated_count': deactivated_count,
        'total_synced': len(created_users) + len(updated_users),
    }

