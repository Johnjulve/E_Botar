from django import forms
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from allauth.socialaccount.forms import SignupForm
from allauth.socialaccount.models import SocialAccount


User = get_user_model()


class GoogleSocialSignupForm(SignupForm):
    """
    Require password confirmation before linking a Google account
    to an existing local account with the same email.
    """

    password = forms.CharField(
        required=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
        help_text="Required only if this email already exists in the system.",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.existing_user = None

    def clean(self):
        cleaned_data = super().clean()
        email_value = (cleaned_data.get("email") or "").strip().lower()
        password_value = cleaned_data.get("password") or ""

        if not email_value:
            return cleaned_data

        try:
            existing_user = User.objects.get(email__iexact=email_value)
        except User.DoesNotExist:
            self.existing_user = None
            return cleaned_data

        self.existing_user = existing_user

        is_already_linked = SocialAccount.objects.filter(
            user=existing_user,
            provider="google",
        ).exists()
        if is_already_linked:
            return cleaned_data

        if not password_value:
            raise ValidationError(
                "This email is already registered. Enter your existing account password to link Google login."
            )

        if not existing_user.check_password(password_value):
            raise ValidationError("Invalid password for the existing account.")

        if not existing_user.is_active:
            raise ValidationError("This account is inactive and cannot be linked.")

        return cleaned_data

    def save(self, request):
        """
        If email already belongs to a local account, link the Google social account
        to that user after password validation. Otherwise continue normal signup.
        """
        if not self.existing_user:
            return super().save(request)

        is_already_linked = SocialAccount.objects.filter(
            user=self.existing_user,
            provider="google",
        ).exists()
        if not is_already_linked:
            self.sociallogin.connect(request, self.existing_user)

        return self.existing_user
