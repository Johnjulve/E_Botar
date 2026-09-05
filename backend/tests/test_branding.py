"""
Institutional Branding & Dynamic Theming Test Suite.
"""

from io import BytesIO
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.common.models import SystemSettings


class BrandingEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.superuser = User.objects.create_superuser(
            username='branding_admin',
            email='admin@school.edu',
            password='AdminPass123!',
        )
        self.regular_user = User.objects.create_user(
            username='regular_student',
            email='student@school.edu',
            password='StudentPass123!',
        )
        self.staff_user = User.objects.create_user(
            username='staff_member',
            email='staff@school.edu',
            password='StaffPass123!',
            is_staff=True,
        )

    def tearDown(self):
        cache.clear()

    def test_get_branding_public_success(self):
        """Public endpoint returns default institutional branding without authentication."""
        response = self.client.get('/api/common/branding/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['institution_name'], 'E-Botar')
        self.assertEqual(data['institution_name_line2'], '')
        self.assertEqual(data['institution_acronym'], 'EB')
        self.assertEqual(data['primary_color'], '#0b6e3b')
        self.assertEqual(data['secondary_color'], '#f4cc5c')
        self.assertIn('feature_flags', data)

    def test_patch_branding_superuser_success(self):
        """Superuser can update institution branding settings and theme colors."""
        self.client.force_authenticate(user=self.superuser)
        payload = {
            'institution_name': 'UNIVERSITY OF THE PHILIPPINES',
            'institution_name_line2': 'DILIMAN',
            'institution_acronym': 'UPD',
            'tagline': 'Honor and Excellence',
            'primary_color': '#7b1113',
            'secondary_color': '#f59e0b',
            'is_custom_branded': True,
        }
        response = self.client.patch('/api/common/branding/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['institution_name'], 'UNIVERSITY OF THE PHILIPPINES')
        self.assertEqual(data['institution_name_line2'], 'DILIMAN')
        self.assertEqual(data['institution_full_name'], 'UNIVERSITY OF THE PHILIPPINES DILIMAN')
        self.assertEqual(data['institution_acronym'], 'UPD')
        self.assertEqual(data['primary_color'], '#7b1113')
        self.assertEqual(data['secondary_color'], '#f59e0b')
        self.assertTrue(data['is_custom_branded'])

        # Verify DB persistence
        self.assertEqual(SystemSettings.get_value('institution_name'), 'UNIVERSITY OF THE PHILIPPINES')
        self.assertEqual(SystemSettings.get_value('primary_color'), '#7b1113')

    def test_patch_branding_permission_denied_for_non_superusers(self):
        """Staff and students cannot modify institutional branding settings."""
        # Unauthenticated
        res_unauth = self.client.patch('/api/common/branding/', {'institution_name': 'Hacked'}, format='json')
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # Regular Student
        self.client.force_authenticate(user=self.regular_user)
        res_student = self.client.patch('/api/common/branding/', {'institution_name': 'Hacked'}, format='json')
        self.assertEqual(res_student.status_code, status.HTTP_403_FORBIDDEN)

        # Staff Member (not Superuser)
        self.client.force_authenticate(user=self.staff_user)
        res_staff = self.client.patch('/api/common/branding/', {'institution_name': 'Hacked'}, format='json')
        self.assertEqual(res_staff.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_branding_color_validation(self):
        """Invalid hex color strings are strictly rejected."""
        self.client.force_authenticate(user=self.superuser)
        invalid_payload = {
            'primary_color': 'not-a-hex',
        }
        response = self.client.patch('/api/common/branding/', invalid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('primary_color', response.json())

    def test_upload_asset_success(self):
        """Superuser can upload branding image assets and logo auto-syncs to favicon."""
        self.client.force_authenticate(user=self.superuser)
        file_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4'
        uploaded_file = SimpleUploadedFile("test_logo.png", file_content, content_type="image/png")

        from unittest.mock import patch
        with patch('apps.common.views.default_storage.save', return_value='branding/branding_logo_mocked.png'):
            response = self.client.post(
                '/api/common/branding/upload-asset/',
                {'file': uploaded_file, 'asset_type': 'logo'},
                format='multipart'
            )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['asset_type'], 'logo')
        self.assertIn('branding/', data['asset_path'])

        # Logo also serves as Favicon
        self.assertEqual(SystemSettings.get_value('institution_logo'), 'branding/branding_logo_mocked.png')
        self.assertEqual(SystemSettings.get_value('institution_favicon'), 'branding/branding_logo_mocked.png')

    def test_upload_large_asset_auto_compresses(self):
        """Image assets exceeding 2MB are automatically compressed rather than rejected."""
        self.client.force_authenticate(user=self.superuser)
        from PIL import Image
        from io import BytesIO

        # Create a large 2500x2500 image with random-ish noise exceeding 2MB
        img = Image.new('RGB', (2200, 2200), color=(11, 110, 59))
        buf = BytesIO()
        img.save(buf, format='JPEG', quality=95)
        # Pad buffer to be > 2.5MB
        buf.write(b'\x00' * (2600000 - buf.tell()))
        buf.seek(0)

        uploaded_large_file = SimpleUploadedFile("huge_banner.jpg", buf.getvalue(), content_type="image/jpeg")
        self.assertGreater(uploaded_large_file.size, 2 * 1024 * 1024)

        from unittest.mock import patch
        with patch('apps.common.views.default_storage.save', return_value='branding/branding_logo_compressed.jpg') as mock_save:
            response = self.client.post(
                '/api/common/branding/upload-asset/',
                {'file': uploaded_large_file, 'asset_type': 'logo'},
                format='multipart'
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            saved_file = mock_save.call_args[0][1]
            self.assertLessEqual(saved_file.size, 2 * 1024 * 1024)

    def test_upload_asset_rejects_unsupported_extensions(self):
        """Upload endpoint rejects disallowed file extensions."""
        self.client.force_authenticate(user=self.superuser)
        uploaded_file = SimpleUploadedFile("bad_script.sh", b"echo 1", content_type="text/plain")

        response = self.client.post(
            '/api/common/branding/upload-asset/',
            {'file': uploaded_file, 'asset_type': 'logo'},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Unsupported file extension', response.json()['detail'])


    def test_reset_defaults_success(self):
        """Superuser can reset branding back to canonical defaults."""
        self.client.force_authenticate(user=self.superuser)
        SystemSettings.set_value('institution_name', 'CUSTOM SCHOOL')
        SystemSettings.set_value('primary_color', '#123456')

        response = self.client.post('/api/common/branding/reset-defaults/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()['branding']

        self.assertEqual(data['institution_name'], 'E-Botar')
        self.assertEqual(data['institution_name_line2'], '')
        self.assertEqual(data['institution_acronym'], 'EB')
        self.assertEqual(data['primary_color'], '#0b6e3b')
        self.assertEqual(data['secondary_color'], '#f4cc5c')

    def test_asset_library_list_activate_and_delete_flow(self):
        """Superuser can list uploaded assets, activate an older asset, and delete assets."""
        self.client.force_authenticate(user=self.superuser)

        # 1. Upload first logo
        file_a = SimpleUploadedFile("logo_a.png", b'\x89PNG_TEST_A', content_type="image/png")
        from unittest.mock import patch
        with patch('apps.common.views.default_storage.save', return_value='branding/branding_logo_a.png'):
            res_a = self.client.post(
                '/api/common/branding/upload-asset/',
                {'file': file_a, 'asset_type': 'logo'},
                format='multipart'
            )
        self.assertEqual(res_a.status_code, status.HTTP_201_CREATED)
        asset_a_id = res_a.json()['asset_id']

        # 2. Upload duplicate logo with identical content -> should detect duplicate
        file_dup = SimpleUploadedFile("logo_a_duplicate.png", b'\x89PNG_TEST_A', content_type="image/png")
        res_dup = self.client.post(
            '/api/common/branding/upload-asset/',
            {'file': file_dup, 'asset_type': 'logo'},
            format='multipart'
        )
        self.assertEqual(res_dup.status_code, status.HTTP_200_OK)
        self.assertTrue(res_dup.json()['is_duplicate'])
        self.assertEqual(res_dup.json()['asset_id'], asset_a_id)

        # 3. Upload second distinct logo
        file_b = SimpleUploadedFile("logo_b.png", b'\x89PNG_TEST_B_DIFF', content_type="image/png")
        with patch('apps.common.views.default_storage.save', return_value='branding/branding_logo_b.png'):
            res_b = self.client.post(
                '/api/common/branding/upload-asset/',
                {'file': file_b, 'asset_type': 'logo'},
                format='multipart'
            )
        self.assertEqual(res_b.status_code, status.HTTP_201_CREATED)
        asset_b_id = res_b.json()['asset_id']

        # Current active should be logo_b
        self.assertEqual(SystemSettings.get_value('institution_logo'), 'branding/branding_logo_b.png')

        # 4. List assets
        res_list = self.client.get('/api/common/branding/assets/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        assets = res_list.json()['assets']
        self.assertEqual(len(assets), 2)
        # B is active, A is not
        b_item = next(a for a in assets if a['id'] == asset_b_id)
        a_item = next(a for a in assets if a['id'] == asset_a_id)
        self.assertTrue(b_item['is_active'])
        self.assertFalse(a_item['is_active'])

        # 5. Activate logo A without re-uploading
        res_act = self.client.post(f'/api/common/branding/assets/{asset_a_id}/activate/')
        self.assertEqual(res_act.status_code, status.HTTP_200_OK)
        self.assertEqual(SystemSettings.get_value('institution_logo'), 'branding/branding_logo_a.png')

        # 6. Delete currently active logo A -> should revert active logo to canonical default
        with patch('apps.common.views.default_storage.exists', return_value=True), \
             patch('apps.common.views.default_storage.delete') as mock_del:
            res_del = self.client.delete(f'/api/common/branding/assets/{asset_a_id}/')
            self.assertEqual(res_del.status_code, status.HTTP_200_OK)
            self.assertTrue(res_del.json()['reverted_to_default'])
            mock_del.assert_called_once_with('branding/branding_logo_a.png')

        # Reverted active logo to empty (default)
        self.assertEqual(SystemSettings.get_value('institution_logo'), '')
        self.assertEqual(SystemSettings.get_value('institution_favicon'), '')

        # Remaining assets count should be 1
        res_list2 = self.client.get('/api/common/branding/assets/')
        self.assertEqual(len(res_list2.json()['assets']), 1)

