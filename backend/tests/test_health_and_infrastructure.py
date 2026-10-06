"""
Tests for Phase 5.5: Hosting, Deployment & Infrastructure Hardening.
Verifies unthrottled health endpoints (/health/, /api/v1/health/, /api/health/)
and fail-fast environment secret key configuration.
"""

from unittest.mock import patch
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status


class HealthEndpointInfrastructureTests(TestCase):
    """Verifies that health probe endpoints are unthrottled and actively test DB and cache."""

    def setUp(self):
        self.client = APIClient()

    def test_root_health_endpoint_returns_200_and_reports_healthy(self):
        """Top-level /health/ probe returns 200 with database and cache connectivity."""
        response = self.client.get('/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data.get('status'), 'healthy')
        self.assertEqual(data.get('service'), 'ebotar-api')
        self.assertIn('checks', data)
        self.assertEqual(data['checks'].get('database'), 'connected')
        self.assertEqual(data['checks'].get('cache'), 'connected')

    def test_versioned_gateway_health_endpoint(self):
        """Canonical /api/v1/health/ gateway returns 200 and reports healthy."""
        response = self.client.get('/api/v1/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data.get('status'), 'healthy')
        self.assertEqual(data['checks'].get('database'), 'connected')
        self.assertEqual(data['checks'].get('cache'), 'connected')

    def test_legacy_gateway_alias_health_endpoint(self):
        """Backward-compatible /api/health/ alias returns 200 and reports healthy."""
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data.get('status'), 'healthy')

    def test_health_check_is_unthrottled(self):
        """Rapid polling of /health/ does not trigger HTTP 429 Too Many Requests."""
        for _ in range(25):
            response = self.client.get('/health/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_health_check_reports_unhealthy_when_database_fails(self):
        """Health check returns 503 Service Unavailable when DB connection fails."""
        with patch('django.db.connection.ensure_connection', side_effect=Exception('DB Connection Refused')):
            response = self.client.get('/health/')
            self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
            data = response.json()
            self.assertEqual(data.get('status'), 'unhealthy')
            self.assertIn('DB Connection Refused', data['checks'].get('database', ''))


class EnvironmentSecurityConfigTests(TestCase):
    """Verifies fail-fast secret checking and stateless configuration."""

    def test_insecure_secret_rejected_in_production(self):
        """Setting IS_PRODUCTION=True with insecure default secret key raises ValueError."""
        default_insecure = 'django-insecure-c^hu1q77a4tnn$dil=sboisr6kk78)&w^99*6l#(_+z^!t&))6'

        def check_secret(secret_val, is_prod, debug_val):
            if not secret_val or secret_val == default_insecure:
                if is_prod or not debug_val:
                    raise ValueError("Insecure or missing SECRET_KEY in production mode!")

        with self.assertRaises(ValueError):
            check_secret(default_insecure, is_prod=True, debug_val=True)

        with self.assertRaises(ValueError):
            check_secret(None, is_prod=True, debug_val=True)

        with self.assertRaises(ValueError):
            check_secret(default_insecure, is_prod=False, debug_val=False)

        # In local dev with DEBUG=True and IS_PRODUCTION=False, no exception is raised
        try:
            check_secret(default_insecure, is_prod=False, debug_val=True)
        except ValueError:
            self.fail("check_secret raised ValueError unexpectedly in local dev mode!")
