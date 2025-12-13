"""
Management command to import users from CSV file.

CSV format should have columns: first_name, last_name, email, password

Usage:
    python manage.py import_users path/to/users.csv
    python manage.py import_users path/to/users.csv --update  # Update existing users
    python manage.py import_users path/to/users.csv --skip-errors  # Continue on errors
"""

import csv
import os
import re
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.accounts.models import UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Import users from a CSV file with columns: first_name, last_name, email, password'

    def add_arguments(self, parser):
        parser.add_argument(
            'csv_file',
            type=str,
            help='Path to the CSV file containing user data'
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Update existing users if they already exist (by email)'
        )
        parser.add_argument(
            '--skip-errors',
            action='store_true',
            help='Continue processing even if some rows have errors'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be imported without actually creating users'
        )

    def generate_username(self, email, first_name, last_name):
        """Generate a unique username from email or name"""
        # Try to use email prefix as username
        if email:
            username_base = email.split('@')[0].lower()
            # Clean username: remove special characters, keep only alphanumeric and underscores
            username_base = re.sub(r'[^a-z0-9_]', '', username_base)
            
            # Ensure it's not empty
            if not username_base:
                username_base = 'user'
            
            # Try the base username first
            username = username_base
            counter = 1
            
            # If username exists, append number
            while User.objects.filter(username=username).exists():
                username = f"{username_base}{counter}"
                counter += 1
            
            return username
        
        # Fallback to first_name + last_name
        if first_name and last_name:
            username_base = f"{first_name.lower()}_{last_name.lower()}"
            username_base = re.sub(r'[^a-z0-9_]', '', username_base)
            
            if not username_base:
                username_base = 'user'
            
            username = username_base
            counter = 1
            
            while User.objects.filter(username=username).exists():
                username = f"{username_base}{counter}"
                counter += 1
            
            return username
        
        # Last resort: generate random username
        from django.utils.crypto import get_random_string
        username = f"user_{get_random_string(8).lower()}"
        while User.objects.filter(username=username).exists():
            username = f"user_{get_random_string(8).lower()}"
        
        return username

    def validate_csv_row(self, row, row_num):
        """Validate a CSV row has required fields"""
        required_fields = ['first_name', 'last_name', 'email', 'password']
        missing_fields = []
        
        for field in required_fields:
            if field not in row or not row[field] or not row[field].strip():
                missing_fields.append(field)
        
        if missing_fields:
            return False, f"Row {row_num}: Missing required fields: {', '.join(missing_fields)}"
        
        # Validate email format
        email = row['email'].strip()
        if '@' not in email:
            return False, f"Row {row_num}: Invalid email format: {email}"
        
        # Validate password length
        password = row['password'].strip()
        if len(password) < 8:
            return False, f"Row {row_num}: Password must be at least 8 characters long"
        
        return True, None

    def handle(self, *args, **options):
        csv_file_path = options['csv_file']
        update_existing = options['update']
        skip_errors = options['skip_errors']
        dry_run = options['dry_run']
        
        # Check if file exists
        if not os.path.exists(csv_file_path):
            raise CommandError(f'CSV file not found: {csv_file_path}')
        
        if not os.path.isfile(csv_file_path):
            raise CommandError(f'Path is not a file: {csv_file_path}')
        
        self.stdout.write(f'Reading CSV file: {csv_file_path}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE: No users will be created'))
        
        # Statistics
        stats = {
            'total': 0,
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
        
        errors = []
        
        try:
            # Read CSV file with UTF-8 encoding, handling BOM
            with open(csv_file_path, 'r', encoding='utf-8-sig') as f:
                # Detect delimiter
                sample = f.read(1024)
                f.seek(0)
                sniffer = csv.Sniffer()
                delimiter = sniffer.sniff(sample).delimiter
                
                reader = csv.DictReader(f, delimiter=delimiter)
                
                # Validate header
                expected_headers = ['first_name', 'last_name', 'email', 'password']
                actual_headers = [h.strip().lower() for h in reader.fieldnames] if reader.fieldnames else []
                
                # Check if all required headers are present (case-insensitive)
                missing_headers = []
                for header in expected_headers:
                    if header not in actual_headers:
                        missing_headers.append(header)
                
                if missing_headers:
                    raise CommandError(
                        f'CSV file is missing required columns: {", ".join(missing_headers)}\n'
                        f'Found columns: {", ".join(actual_headers) if actual_headers else "None"}'
                    )
                
                # Process each row
                # Use transaction only if not dry-run (for actual database operations)
                if dry_run:
                    # Dry-run: process without transaction
                    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                        stats['total'] += 1
                        
                        # Normalize field names (case-insensitive)
                        normalized_row = {}
                        for key, value in row.items():
                            normalized_key = key.strip().lower()
                            normalized_row[normalized_key] = value.strip() if value else ''
                        
                        # Validate row
                        is_valid, error_msg = self.validate_csv_row(normalized_row, row_num)
                        if not is_valid:
                            stats['errors'] += 1
                            errors.append(error_msg)
                            if not skip_errors:
                                self.stdout.write(self.style.ERROR(f'  {error_msg}'))
                            else:
                                self.stdout.write(self.style.WARNING(f'  {error_msg}'))
                                continue
                        
                        # Extract data
                        first_name = normalized_row['first_name'].strip()
                        last_name = normalized_row['last_name'].strip()
                        email = normalized_row['email'].strip().lower()
                        password = normalized_row['password'].strip()
                        
                        # Check if user already exists
                        try:
                            existing_user = User.objects.get(email=email)
                            
                            if update_existing:
                                stats['updated'] += 1
                                self.stdout.write(
                                    f'  Row {row_num}: Would update user {email}'
                                )
                            else:
                                stats['skipped'] += 1
                                self.stdout.write(
                                    self.style.WARNING(
                                        f'  Row {row_num}: User {email} already exists (use --update to update)'
                                    )
                                )
                        except User.DoesNotExist:
                            # Would create new user
                            username = self.generate_username(email, first_name, last_name)
                            self.stdout.write(
                                f'  Row {row_num}: Would create user {email} (username: {username})'
                            )
                            stats['created'] += 1
                else:
                    # Actual import: use transaction
                    with transaction.atomic():
                        for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                            stats['total'] += 1
                            
                            # Normalize field names (case-insensitive)
                            normalized_row = {}
                            for key, value in row.items():
                                normalized_key = key.strip().lower()
                                normalized_row[normalized_key] = value.strip() if value else ''
                            
                            # Validate row
                            is_valid, error_msg = self.validate_csv_row(normalized_row, row_num)
                            if not is_valid:
                                stats['errors'] += 1
                                errors.append(error_msg)
                                if not skip_errors:
                                    raise CommandError(error_msg)
                                else:
                                    self.stdout.write(self.style.WARNING(f'  {error_msg}'))
                                    continue
                            
                            # Extract data
                            first_name = normalized_row['first_name'].strip()
                            last_name = normalized_row['last_name'].strip()
                            email = normalized_row['email'].strip().lower()
                            password = normalized_row['password'].strip()
                            
                            # Check if user already exists
                            try:
                                existing_user = User.objects.get(email=email)
                                
                                if update_existing:
                                    # Update existing user
                                    existing_user.first_name = first_name
                                    existing_user.last_name = last_name
                                    existing_user.set_password(password)
                                    existing_user.save()
                                    
                                    # Ensure profile exists
                                    if not hasattr(existing_user, 'profile'):
                                        UserProfile.objects.create(user=existing_user)
                                    
                                    stats['updated'] += 1
                                    self.stdout.write(
                                        self.style.SUCCESS(
                                            f'  Row {row_num}: Updated user {email}'
                                        )
                                    )
                                else:
                                    stats['skipped'] += 1
                                    self.stdout.write(
                                        self.style.WARNING(
                                            f'  Row {row_num}: User {email} already exists (use --update to update)'
                                        )
                                    )
                            except User.DoesNotExist:
                                # Create new user
                                # Generate username
                                username = self.generate_username(email, first_name, last_name)
                                
                                # Create user
                                user = User.objects.create_user(
                                    username=username,
                                    email=email,
                                    password=password,
                                    first_name=first_name,
                                    last_name=last_name,
                                    is_active=True
                                )
                                
                                # Create profile (student_id will be auto-generated)
                                UserProfile.objects.create(user=user)
                                
                                stats['created'] += 1
                                self.stdout.write(
                                    self.style.SUCCESS(
                                        f'  Row {row_num}: Created user {email} (username: {username})'
                                    )
                                )
        
        except csv.Error as e:
            raise CommandError(f'Error reading CSV file: {str(e)}')
        except Exception as e:
            raise CommandError(f'Unexpected error: {str(e)}')
        
        # Print summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('Import Summary:'))
        self.stdout.write(f'  Total rows processed: {stats["total"]}')
        self.stdout.write(self.style.SUCCESS(f'  Users created: {stats["created"]}'))
        if update_existing:
            self.stdout.write(self.style.SUCCESS(f'  Users updated: {stats["updated"]}'))
        if stats['skipped'] > 0:
            self.stdout.write(self.style.WARNING(f'  Users skipped: {stats["skipped"]}'))
        if stats['errors'] > 0:
            self.stdout.write(self.style.ERROR(f'  Errors: {stats["errors"]}'))
        
        if errors and skip_errors:
            self.stdout.write('\n' + self.style.ERROR('Errors encountered:'))
            for error in errors:
                self.stdout.write(f'  - {error}')
        
        if dry_run:
            self.stdout.write('\n' + self.style.WARNING('This was a dry run. No users were actually created.'))

