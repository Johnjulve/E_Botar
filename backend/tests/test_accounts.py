"""
Centralized Accounts & Authentication Tests.

Covers:
- Google Auth Duplicate Email Guards & Registration Email Uniqueness
- Profile Verification Security & Staff Permission Boundaries
- Profile List API & Pagination Shaper
- Student Roster Synchronization & Parsing Engine
"""

import io
from datetime import timedelta
from unittest.mock import patch

import openpyxl
from allauth.socialaccount.models import SocialAccount, SocialApp
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import Program, UserProfile
from apps.common.models import ActivityLog
from apps.accounts.services.roster_sync import (
    StudentRosterParser,
    classify_roster_diff,
    normalize_student_id,
    normalize_year_level,
)
from apps.elections.models import SchoolElection
from apps.voting.models import VoteReceipt


class GoogleAuthDuplicateEmailGuardTests(APITestCase):
    def setUp(self):
        Site.objects.update_or_create(
            pk=1,
            defaults={'domain': 'testserver', 'name': 'test'},
        )
        google_app = SocialApp.objects.filter(provider='google').first()
        if not google_app:
            google_app = SocialApp.objects.create(
                provider='google',
                provider_id='google',
                name='Google (tests)',
                client_id='test-google-client-id',
                secret='secret',
            )
        else:
            SocialApp.objects.filter(pk=google_app.pk).update(
                client_id='test-google-client-id',
                secret='secret',
            )
        google_app.sites.set([Site.objects.get(pk=1)])

    @patch('apps.accounts.views.google_id_token.verify_oauth2_token')
    def test_rejects_duplicate_local_accounts_with_same_verified_email(self, mock_verify):
        User.objects.create_user('alice', 'dup@snsu.edu.ph', password='pw12345678!')
        User.objects.create_user('bob', 'dup@snsu.edu.ph', password='pw12345678!')
        mock_verify.return_value = {
            'email': 'dup@snsu.edu.ph',
            'email_verified': True,
            'sub': 'google-oauth-subject-9901',
            'given_name': 'X',
            'family_name': 'Y',
        }
        url_path = reverse('accounts:google-login')
        response = self.client.post(url_path, {'credential': 'stub-jwt'}, format='json')

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data.get('code'), 'ambiguous_email_accounts')

    @patch('apps.accounts.views.google_id_token.verify_oauth2_token')
    def test_auto_links_preimported_student_without_password(self, mock_verify):
        student_user = User.objects.create_user('preimported', 'preimported@university.edu.ph')
        UserProfile.objects.create(
            user=student_user,
            student_id='2024-88888',
            must_change_password=True,
            year_level='1st Year',
        )
        mock_verify.return_value = {
            'email': 'preimported@university.edu.ph',
            'email_verified': True,
            'sub': 'google-oauth-subject-8888',
            'given_name': 'Auto',
            'family_name': 'Linked',
        }
        url_path = reverse('accounts:google-login')
        response = self.client.post(url_path, {'credential': 'valid-credential'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

        # Verify must_change_password was cleared and SocialAccount was linked
        student_user.profile.refresh_from_db()
        self.assertFalse(student_user.profile.must_change_password)
        self.assertTrue(SocialAccount.objects.filter(user=student_user, provider='google', uid='google-oauth-subject-8888').exists())

    @patch('apps.accounts.views.google_id_token.verify_oauth2_token')
    def test_requires_password_for_established_local_account(self, mock_verify):
        established_user = User.objects.create_user('established', 'established@university.edu.ph', password='custompassword123')
        UserProfile.objects.create(
            user=established_user,
            student_id='2024-77777',
            must_change_password=False,
            year_level='2nd Year',
        )
        mock_verify.return_value = {
            'email': 'established@university.edu.ph',
            'email_verified': True,
            'sub': 'google-oauth-subject-7777',
            'given_name': 'Est',
            'family_name': 'Ab',
        }
        url_path = reverse('accounts:google-login')
        # Attempt without password
        response = self.client.post(url_path, {'credential': 'valid-credential'}, format='json')

        self.assertEqual(response.status_code, 409)
        self.assertTrue(response.data.get('requires_password'))


class RegistrationEmailUniquenessTests(APITestCase):
    def test_rejects_duplicate_email_case_insensitive(self):
        admin = User.objects.create_user('admin_reg', 'admin_reg@snsu.edu.ph', password='pw12345678!', is_staff=True)
        self.client.force_authenticate(user=admin)
        User.objects.create_user('exist', 'U@snsu.edu.ph', password='pw12345678!')
        payload = {
            'username': 'newperson',
            'email': 'u@snsu.edu.ph',
            'password': 'nw12345678!',
            'password_confirm': 'nw12345678!',
            'first_name': 'N',
            'last_name': 'P',
        }
        url_path = reverse('accounts:register')
        response = self.client.post(url_path, payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data)


class ProfileVerificationSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username='student1',
            password='pass12345',
            email='student1@school.edu',
        )
        self.student_profile = UserProfile.objects.create(
            user=self.student,
            is_verified=False,
        )
        self.other_student = User.objects.create_user(
            username='student2',
            password='pass12345',
            email='student2@school.edu',
        )
        UserProfile.objects.create(user=self.other_student, is_verified=False)

        self.staff = User.objects.create_user(
            username='staff1',
            password='pass12345',
            is_staff=True,
        )
        UserProfile.objects.create(user=self.staff, year_level='4')
        self.student_profile.year_level = '3'
        self.student_profile.save(update_fields=['year_level'])

    def test_student_cannot_set_is_verified_via_profile_patch(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.patch(
            f'/api/auth/profiles/{self.student_profile.id}/',
            {'is_verified': True},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.student_profile.refresh_from_db()
        self.assertFalse(self.student_profile.is_verified)

    def test_staff_sets_verification_via_dedicated_action(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f'/api/auth/profiles/{self.student_profile.id}/set_verified/',
            {'is_verified': True},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.student_profile.refresh_from_db()
        self.assertTrue(self.student_profile.is_verified)


class ProfileListPaginationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username='list_staff',
            password='pass12345',
            is_staff=True,
        )
        UserProfile.objects.create(user=self.staff, year_level='4')
        self.client.force_authenticate(user=self.staff)

        for index in range(3):
            student = User.objects.create_user(
                username=f'student_{index}',
                password='pass12345',
                email=f'student_{index}@school.edu',
            )
            UserProfile.objects.create(
                user=student,
                student_id=f'2026-000{index}',
                year_level='1',
            )

    def test_profile_list_is_paginated_and_lean(self):
        response = self.client.get('/api/auth/profiles/', {'page': 1, 'page_size': 2})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn('count', body)
        self.assertIn('results', body)
        self.assertEqual(len(body['results']), 2)
        row = body['results'][0]
        self.assertIn('user', row)
        self.assertNotIn('missing_fields', row)
        self.assertNotIn('avatar_url', row)
        self.assertNotIn('description', row.get('department') or {})

    def test_voting_status_is_paginated_with_summary(self):
        now = timezone.now()
        election = SchoolElection.objects.create(
            election_type='university',
            start_year=2024,
            end_year=2025,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=1),
        )
        first_student = User.objects.get(username='student_0')
        VoteReceipt.objects.create(user=first_student, election=election)

        response = self.client.get(
            '/api/voting/voting-status/',
            {'election_id': election.id, 'page': 1, 'page_size': 2},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['summary']['total_eligible_students'], 3)
        self.assertEqual(body['summary']['total_voted'], 1)
        self.assertEqual(len(body['results']), 2)
        self.assertIn('has_voted', body['results'][0])
        self.assertNotIn('missing_fields', body['results'][0])


class RosterSyncEngineTests(TestCase):
    def setUp(self):
        self.dept = Program.objects.create(
            name='College of Computing and Information Sciences',
            code='CCIS',
            program_type=Program.ProgramType.DEPARTMENT,
            is_active=True,
        )
        self.course = Program.objects.create(
            name='Bachelor of Science in Computer Science',
            code='BSCS',
            program_type=Program.ProgramType.COURSE,
            department=self.dept,
            is_active=True,
        )
        self.existing_user = User.objects.create_user(
            username='2024-10001',
            email='existing@university.edu.ph',
            first_name='Existing',
            last_name='Student',
        )
        self.existing_profile = UserProfile.objects.create(
            user=self.existing_user,
            student_id='2024-10001',
            department=self.dept,
            course=self.course,
            year_level='1st Year',
            section='A',
            is_verified=True,
        )

    def test_normalization_helpers(self):
        self.assertEqual(normalize_student_id('2024-12345'), '2024-12345')
        self.assertEqual(normalize_student_id('202412345'), '2024-12345')
        self.assertEqual(normalize_student_id('  2024-99999  '), '2024-99999')

        self.assertEqual(normalize_year_level('1'), '1st Year')
        self.assertEqual(normalize_year_level('2nd Year'), '2nd Year')
        self.assertEqual(normalize_year_level('Year 3'), '3rd Year')
        self.assertEqual(normalize_year_level('4th'), '4th Year')
        self.assertEqual(normalize_year_level('freshman'), '1st Year')

    def test_csv_parser_valid_and_invalid(self):
        csv_content = (
            "ID Number,Student Email,First Name,Last Name,Program,Yr,Sec\n"
            "2024-20002,newstudent@university.edu.ph,New,Student,BSCS,2,B\n"
            "2024-99999,not-an-email,Invalid,User,BSCS,1,A\n"
            "bad-id,badid@university.edu.ph,Bad,ID,BSCS,3,A\n"
        )
        parser = StudentRosterParser()
        valid, errors = parser.parse_file(io.StringIO(csv_content), 'roster.csv')

        self.assertEqual(len(valid), 1)
        self.assertEqual(len(errors), 2)

        rec = valid[0]
        self.assertEqual(rec['student_id'], '2024-20002')
        self.assertEqual(rec['email'], 'newstudent@university.edu.ph')
        self.assertEqual(rec['course_code'], 'BSCS')
        self.assertEqual(rec['department_code'], 'CCIS')
        self.assertEqual(rec['year_level'], '2nd Year')
        self.assertEqual(rec['section'], 'B')

    def test_excel_parser_integration(self):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(['Student ID', 'Email', 'First Name', 'Last Name', 'Course', 'Year Level', 'Section'])
        ws.append(['2024-30003', 'exceluser@university.edu.ph', 'Excel', 'Learner', 'BSCS', '4th Year', 'C'])

        bio = io.BytesIO()
        wb.save(bio)
        bio.seek(0)

        parser = StudentRosterParser()
        valid, errors = parser.parse_file(bio, 'students.xlsx')

        self.assertEqual(len(errors), 0)
        self.assertEqual(len(valid), 1)
        self.assertEqual(valid[0]['student_id'], '2024-30003')
        self.assertEqual(valid[0]['year_level'], '4th Year')

    def test_classify_roster_diff(self):
        valid_rows = [
            {
                'row_number': 2,
                'student_id': '2024-10001',
                'email': 'existing@university.edu.ph',
                'first_name': 'Existing',
                'last_name': 'Student',
                'middle_name': '',
                'department_code': 'CCIS',
                'course_code': 'BSCS',
                'year_level': '2nd Year',
                'section': 'B',
            },
            {
                'row_number': 3,
                'student_id': '2024-40004',
                'email': 'brandnew@university.edu.ph',
                'first_name': 'Brand',
                'last_name': 'New',
                'middle_name': '',
                'department_code': 'CCIS',
                'course_code': 'BSCS',
                'year_level': '1st Year',
                'section': 'A',
            },
        ]

        diff = classify_roster_diff(valid_rows)
        stats = diff['stats']

        self.assertEqual(stats['total_valid_rows'], 2)
        self.assertEqual(stats['to_create_count'], 1)
        self.assertEqual(stats['to_update_count'], 1)

        updated_item = diff['to_update'][0]
        self.assertEqual(updated_item['user_id'], self.existing_user.id)
        self.assertIn('year_level', updated_item['changes'])
        self.assertEqual(updated_item['changes']['year_level']['old'], '1st Year')
        self.assertEqual(updated_item['changes']['year_level']['new'], '2nd Year')
        self.assertIn('section', updated_item['changes'])
        self.assertEqual(updated_item['changes']['section']['old'], 'A')
        self.assertEqual(updated_item['changes']['section']['new'], 'B')


class RosterEndpointsSecurityAndSyncTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username='roster_admin',
            email='admin@university.edu.ph',
            password='AdminPassword123!',
            is_staff=True,
        )
        UserProfile.objects.create(user=self.staff_user, year_level='4th Year')

        self.student_user = User.objects.create_user(
            username='normal_student',
            email='student@university.edu.ph',
            password='StudentPassword123!',
            is_staff=False,
        )
        UserProfile.objects.create(user=self.student_user, year_level='2nd Year')

        self.dept = Program.objects.create(
            name='College of Computing and Information Sciences',
            code='CCIS',
            program_type=Program.ProgramType.DEPARTMENT,
            is_active=True,
        )
        self.course = Program.objects.create(
            name='Bachelor of Science in Computer Science',
            code='BSCS',
            program_type=Program.ProgramType.COURSE,
            department=self.dept,
            is_active=True,
        )

    def test_roster_preview_security_permissions(self):
        csv_file = SimpleUploadedFile(
            'roster.csv',
            b"Student ID,Email,First Name,Last Name,Course,Year Level\n2024-99001,p1@university.edu.ph,P,One,BSCS,1\n",
            content_type='text/csv',
        )

        # 1. Unauthenticated request -> 401
        res = self.client.post('/api/auth/students/roster-preview/', {'file': csv_file})
        self.assertEqual(res.status_code, 401)

        # 2. Non-staff student -> 403
        self.client.force_authenticate(user=self.student_user)
        csv_file.seek(0)
        res = self.client.post('/api/auth/students/roster-preview/', {'file': csv_file})
        self.assertEqual(res.status_code, 403)

        # 3. Staff user -> 200
        self.client.force_authenticate(user=self.staff_user)
        csv_file.seek(0)
        res = self.client.post('/api/auth/students/roster-preview/', {'file': csv_file})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['stats']['to_create_count'], 1)

    def test_roster_preview_does_not_mutate_database(self):
        self.client.force_authenticate(user=self.staff_user)
        csv_file = SimpleUploadedFile(
            'roster.csv',
            b"Student ID,Email,First Name,Last Name,Course,Year Level\n2024-88001,ghost@university.edu.ph,Ghost,Student,BSCS,1\n",
            content_type='text/csv',
        )
        res = self.client.post('/api/auth/students/roster-preview/', {'file': csv_file})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['stats']['to_create_count'], 1)

        # Confirm dry-run: User and UserProfile were NOT created
        self.assertFalse(User.objects.filter(email='ghost@university.edu.ph').exists())

    def test_roster_import_atomic_creation_and_activity_log(self):
        self.client.force_authenticate(user=self.staff_user)
        csv_file = SimpleUploadedFile(
            'roster.csv',
            b"Student ID,Email,First Name,Last Name,Course,Year Level,Section\n2024-77001,new_import@university.edu.ph,New,Import,BSCS,1,A\n",
            content_type='text/csv',
        )
        res = self.client.post('/api/auth/students/roster-import/', {'file': csv_file})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['created_count'], 1)

        # Verify created User & Profile
        new_user = User.objects.filter(email='new_import@university.edu.ph').first()
        self.assertIsNotNone(new_user)
        self.assertEqual(new_user.first_name, 'New')
        self.assertEqual(new_user.last_name, 'Import')
        self.assertTrue(new_user.profile.must_change_password)
        self.assertTrue(new_user.profile.is_verified)
        self.assertEqual(new_user.profile.student_id, '2024-77001')
        self.assertEqual(new_user.profile.course.code, 'BSCS')
        self.assertEqual(new_user.profile.department.code, 'CCIS')

        # Verify ActivityLog
        log = ActivityLog.objects.filter(action='import', resource_type='StudentRoster').order_by('-id').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user, self.staff_user)
        self.assertEqual(log.metadata['created_count'], 1)

    def test_roster_import_updates_existing_and_deactivates_unlisted(self):
        self.client.force_authenticate(user=self.staff_user)

        # Existing student A: BSCS 1st Year, Section A
        user_a = User.objects.create_user('2024-11111', 'student_a@university.edu.ph', first_name='Alpha', last_name='One')
        prof_a = UserProfile.objects.create(user=user_a, student_id='2024-11111', course=self.course, department=self.dept, year_level='1st Year', section='A', is_verified=True)

        # Existing student B: unlisted in next roster
        user_b = User.objects.create_user('2024-22222', 'student_b@university.edu.ph', first_name='Beta', last_name='Two', is_active=True)
        prof_b = UserProfile.objects.create(user=user_b, student_id='2024-22222', course=self.course, department=self.dept, year_level='1st Year', is_verified=True)

        # Upload roster containing only student A with year_level updated to 2nd Year, section B
        csv_file = SimpleUploadedFile(
            'roster.csv',
            b"Student ID,Email,First Name,Last Name,Course,Year Level,Section\n2024-11111,student_a@university.edu.ph,Alpha,One,BSCS,2,B\n",
            content_type='text/csv',
        )

        res = self.client.post(
            '/api/auth/students/roster-import/',
            {'file': csv_file, 'deactivate_unlisted': 'true'},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['updated_count'], 1)
        self.assertGreaterEqual(res.data['deactivated_count'], 1)

        # Verify student A was updated
        prof_a.refresh_from_db()
        self.assertEqual(prof_a.year_level, '2nd Year')
        self.assertEqual(prof_a.section, 'B')

        # Verify student B was deactivated
        user_b.refresh_from_db()
        self.assertFalse(user_b.is_active)


class RegistrationLockdownAndPasswordResetSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username='staff_admin',
            email='staff@snsu.edu.ph',
            password='StaffPassword123!',
            is_staff=True,
        )
        UserProfile.objects.create(user=self.staff_user, year_level='4th Year')

    def test_registration_endpoint_rejects_public_when_locked_down(self):
        # Unauthenticated request trying to register
        res = self.client.post('/api/auth/register/', {
            'username': 'stranger_voter',
            'email': 'stranger@snsu.edu.ph',
            'password': 'StrangerPass123!',
            'password_confirm': 'StrangerPass123!',
        })
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data.get('code'), 'registration_closed')
        self.assertIn('Public self-registration is closed', res.data.get('error', ''))

    def test_registration_endpoint_allows_staff_when_locked_down(self):
        # Staff member manually adding a user through administrative interface
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.post('/api/auth/register/', {
            'username': 'official_new_student',
            'email': 'official_student@snsu.edu.ph',
            'password': 'OfficialPass123!',
            'password_confirm': 'OfficialPass123!',
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(User.objects.filter(username='official_new_student').exists())

    def test_google_oauth_rejects_unlisted_email_when_registration_locked_down(self):
        from apps.accounts.oauth import authenticate_or_link_google_user

        token_payload = {
            'sub': 'google-unlisted-99999',
            'email': 'unlisted_student@snsu.edu.ph',
            'email_verified': True,
            'given_name': 'Unlisted',
            'family_name': 'Student',
        }
        user, err, status_code = authenticate_or_link_google_user(
            token_payload=token_payload,
            existing_account_password=None,
        )
        self.assertIsNone(user)
        self.assertEqual(status_code, 403)
        self.assertEqual(err.get('code'), 'unlisted_roster_email')
        self.assertIn('not listed in the active student roster', err.get('error', ''))

    def test_first_login_password_change_clears_must_change_flag(self):
        # Pre-imported student with must_change_password=True
        student = User.objects.create_user(
            username='2024-55555',
            email='preimported@snsu.edu.ph',
            password='Univ@55555',
        )
        profile = UserProfile.objects.create(
            user=student,
            student_id='2024-55555',
            must_change_password=True,
            year_level='1st Year',
        )

        # 1. JWT login returns must_change_password=True
        token_res = self.client.post('/api/auth/token/', {
            'username': '2024-55555',
            'password': 'Univ@55555',
        })
        self.assertEqual(token_res.status_code, 200)
        self.assertTrue(token_res.data.get('must_change_password'))

        # 2. Student calls password change via /api/auth/me/
        self.client.force_authenticate(user=student)
        change_res = self.client.post('/api/auth/me/', {
            'change_password': True,
            'old_password': 'Univ@55555',
            'new_password': 'MySecurePersonalPassword123!',
        })
        self.assertEqual(change_res.status_code, 200)

        # 3. Verify must_change_password was set to False
        profile.refresh_from_db()
        self.assertFalse(profile.must_change_password)

        # 4. Next token login returns must_change_password=False
        token_res2 = self.client.post('/api/auth/token/', {
            'username': '2024-55555',
            'password': 'MySecurePersonalPassword123!',
        })
        self.assertEqual(token_res2.status_code, 200)
        self.assertFalse(token_res2.data.get('must_change_password'))

