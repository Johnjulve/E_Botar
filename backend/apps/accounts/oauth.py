"""
Google OAuth Authentication & Account Auto-Linking Service.

Handles Google ID token and access token verification, identity matching,
conflict detection, and automatic linking for pre-imported student rosters.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, Optional, Tuple

from allauth.socialaccount.models import SocialApp, SocialAccount
from django.contrib.auth.models import User
from django.contrib.sites.shortcuts import get_current_site
from django.db import IntegrityError, transaction
import requests
from rest_framework import status

from apps.accounts.models import UserProfile
from apps.common.core.feature_flags import load_feature_flags

logger = logging.getLogger(__name__)


def get_google_client_id_from_social_app(request: Any) -> Optional[str]:
    """Retrieve Google OAuth Client ID configured in django-allauth SocialApp."""
    current_site = get_current_site(request)
    site_specific_social_app = (
        SocialApp.objects.filter(provider='google', sites=current_site)
        .order_by('id')
        .first()
    )
    if site_specific_social_app:
        return site_specific_social_app.client_id

    fallback_social_app = SocialApp.objects.filter(provider='google').order_by('id').first()
    return fallback_social_app.client_id if fallback_social_app else None


def google_token_payload_from_access_token(
    access_token: str,
    expected_client_id: str,
) -> Optional[Dict[str, Any]]:
    """Validate a Google OAuth access token against Google API and return normalized userinfo."""
    try:
        tokeninfo_response = requests.get(
            'https://oauth2.googleapis.com/tokeninfo',
            params={'access_token': access_token},
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.warning('Failed to fetch Google tokeninfo: %s', exc)
        return None

    if tokeninfo_response.status_code != 200:
        return None

    tokeninfo = tokeninfo_response.json()
    token_audience = tokeninfo.get('aud') or tokeninfo.get('azp')
    if token_audience != expected_client_id:
        logger.warning(
            'Google access token audience mismatch: expected=%s got=%s',
            expected_client_id,
            token_audience,
        )
        return None

    email_verified_raw = tokeninfo.get('email_verified')
    email_verified = str(email_verified_raw).lower() in ('true', '1', 'yes')

    return {
        'email': (tokeninfo.get('email') or '').strip().lower(),
        'email_verified': email_verified,
        'sub': tokeninfo.get('sub'),
        'given_name': tokeninfo.get('given_name') or '',
        'family_name': tokeninfo.get('family_name') or '',
    }


def build_unique_username_from_email(email_value: str) -> str:
    """Generate a clean, collision-free local Django username from email."""
    local_part = (email_value or '').split('@')[0]
    normalized_base = re.sub(r'[^a-zA-Z0-9_]', '', local_part).lower() or 'google_user'
    candidate_username = normalized_base[:150]
    sequence = 1
    while User.objects.filter(username=candidate_username).exists():
        suffix = f'_{sequence}'
        candidate_username = f'{normalized_base[: max(150 - len(suffix), 1)]}{suffix}'
        sequence += 1
    return candidate_username


def authenticate_or_link_google_user(
    token_payload: Dict[str, Any],
    existing_account_password: str = '',
) -> Tuple[Optional[User], Optional[Dict[str, Any]], int]:
    """
    Authenticate or link a user given verified Google OAuth token payload.

    Returns:
        (user, None, 200) on success.
        (None, error_dict, status_code) on failure.
    """
    email_value = (token_payload.get('email') or '').strip().lower()
    email_verified = str(token_payload.get('email_verified')).lower() == 'true'
    google_subject = token_payload.get('sub')

    if not email_value or not google_subject:
        return None, {'error': 'Google account payload is missing required identity fields.'}, status.HTTP_400_BAD_REQUEST

    if not email_verified:
        return None, {'error': 'Google email must be verified before sign in.'}, status.HTTP_403_FORBIDDEN

    # 1. Existing SocialAccount link check
    existing_social_account = SocialAccount.objects.filter(
        provider='google',
        uid=str(google_subject),
    ).select_related('user', 'user__profile').first()

    if existing_social_account:
        user = existing_social_account.user
        if not user.is_active:
            return None, {'error': 'This account is inactive.'}, status.HTTP_403_FORBIDDEN
        return user, None, status.HTTP_200_OK

    # 2. Local User lookup by verified email
    conflicting_email_accounts = User.objects.filter(email__iexact=email_value)
    ambiguous_count = conflicting_email_accounts.count()
    if ambiguous_count > 1:
        return None, {
            'error': (
                'Several local accounts share this verified email. '
                'Contact an administrator to resolve duplicate accounts.'
            ),
            'code': 'ambiguous_email_accounts',
        }, status.HTTP_409_CONFLICT

    matching_user = conflicting_email_accounts.first()

    if matching_user:
        if not matching_user.is_active:
            return None, {'error': 'This account is inactive and cannot be linked.'}, status.HTTP_403_FORBIDDEN

        profile = getattr(matching_user, 'profile', None)
        # Check if pre-imported student awaiting first login or account without custom password
        is_preimported_student = bool(profile and profile.must_change_password)

        if not is_preimported_student:
            # Traditional account with custom password requires confirmation
            if not existing_account_password:
                return None, {
                    'error': 'Password confirmation is required before linking this Google account.',
                    'requires_password': True,
                    'email': email_value,
                }, status.HTTP_409_CONFLICT

            if not matching_user.check_password(existing_account_password):
                return None, {'error': 'Invalid password for existing account.'}, status.HTTP_401_UNAUTHORIZED

        # Link Google account
        try:
            with transaction.atomic():
                SocialAccount.objects.create(
                    user=matching_user,
                    provider='google',
                    uid=str(google_subject),
                    extra_data=token_payload,
                )
                if profile and profile.must_change_password:
                    profile.must_change_password = False
                    profile.save(update_fields=['must_change_password'])
            user = matching_user
        except IntegrityError:
            raced_social_link = SocialAccount.objects.filter(
                provider='google',
                uid=str(google_subject),
            ).select_related('user').first()
            if raced_social_link:
                user = raced_social_link.user
            else:
                logger.exception('Google linking IntegrityError without recoverable SocialAccount')
                return None, {
                    'error': 'Unable to link Google account (database conflict). Please try again shortly.'
                }, status.HTTP_503_SERVICE_UNAVAILABLE

    else:
        # 3. Completely new user registration via Google OAuth
        flags = load_feature_flags()
        if not flags.get('user_registration', False):
            return None, {
                'error': (
                    f"The Google email '{email_value}' is not listed in the active student roster. "
                    "Please contact the university administrator or Office of Student Affairs."
                ),
                'code': 'unlisted_roster_email',
                'email': email_value,
            }, status.HTTP_403_FORBIDDEN

        first_name = (token_payload.get('given_name') or '').strip()
        last_name = (token_payload.get('family_name') or '').strip()
        unique_username = build_unique_username_from_email(email_value)
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=unique_username,
                    email=email_value,
                    password=None,
                    first_name=first_name,
                    last_name=last_name,
                )
                SocialAccount.objects.create(
                    user=user,
                    provider='google',
                    uid=str(google_subject),
                    extra_data=token_payload,
                )
                UserProfile.objects.get_or_create(user=user)
        except IntegrityError:
            raced_google_user_flow = SocialAccount.objects.filter(
                provider='google',
                uid=str(google_subject),
            ).select_related('user').first()
            if raced_google_user_flow:
                user = raced_google_user_flow.user
            else:
                logger.exception('Google new-user IntegrityError without matching SocialAccount')
                return None, {
                    'error': (
                        'Unable to finalize Google sign-in because of an account naming conflict '
                        '(try again shortly or contact support).'
                    )
                }, status.HTTP_503_SERVICE_UNAVAILABLE

    return user, None, status.HTTP_200_OK
