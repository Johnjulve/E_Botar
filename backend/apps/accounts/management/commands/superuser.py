import os
from getpass import getpass

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils.crypto import get_random_string


class Command(BaseCommand):
    """
    Create or update a superuser with sensible defaults.

    Priority order for credentials:
    1. CLI flags (--username/--email/--password)
    2. Environment variables (SUPERUSER_USERNAME, SUPERUSER_EMAIL, SUPERUSER_PASSWORD)
    3. Hard-coded defaults (username: admin, email: admin@example.com, generated password)
    """

    help = "Create or update the default superuser account"

    def add_arguments(self, parser):
        parser.add_argument('--username', help='Superuser username')
        parser.add_argument('--email', help='Superuser email address')
        parser.add_argument('--password', help='Superuser password (use env var or prompt for safety)')
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Do not prompt for missing password (auto-generate if not provided)',
        )

    def handle(self, *args, **options):
        User = get_user_model()

        username = options.get('username') or os.environ.get('SUPERUSER_USERNAME') or 'admin'
        email = options.get('email') or os.environ.get('SUPERUSER_EMAIL') or 'admin@example.com'
        password = options.get('password') or os.environ.get('SUPERUSER_PASSWORD')

        if not password and not options['no_input']:
            password = getpass('Enter superuser password (leave blank to auto-generate): ')

        if not password:
            password = get_random_string(12)
            auto_password = True
        else:
            auto_password = False

        if not username:
            raise CommandError('Username cannot be empty.')

        self.stdout.write(f'Ensuring superuser "{username}" exists...')

        # Try to get user by username first, then by email
        try:
            user = User.objects.get(username=username)
            created = False
        except User.DoesNotExist:
            try:
                user = User.objects.get(email=email)
                created = False
                # Update username if it's different
                if user.username != username:
                    user.username = username
            except User.DoesNotExist:
                user = User.objects.create_user(username=username, email=email, password=password)
                created = True
        
        # Update user attributes
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        # Only set password if it was provided (for new users or when explicitly updating)
        if password and (created or options.get('password') or os.environ.get('SUPERUSER_PASSWORD')):
            user.set_password(password)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" updated.'))

        if auto_password:
            self.stdout.write(self.style.WARNING('Generated password (store securely):'))
            self.stdout.write(self.style.WARNING(password))

