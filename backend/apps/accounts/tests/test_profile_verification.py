from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserProfile


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
