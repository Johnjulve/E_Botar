from unittest.mock import patch

from allauth.socialaccount.models import SocialApp
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.urls import reverse
from rest_framework.test import APITestCase


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


class RegistrationEmailUniquenessTests(APITestCase):
    def test_rejects_duplicate_email_case_insensitive(self):
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
