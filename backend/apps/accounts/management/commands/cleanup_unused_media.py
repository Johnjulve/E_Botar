"""
Delete unused/orphaned image files from media storage.

- profile_photos/: files not referenced by any UserProfile.avatar
- candidate_photos/: files not referenced by any Candidate.photo or CandidateApplication.photo

Run: python manage.py cleanup_unused_media
Optional: --dry-run to only list files that would be deleted (no actual delete).
"""

import os
from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage


class Command(BaseCommand):
    help = "Delete orphaned image files (profile_photos, candidate_photos) not referenced by any model."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only list files that would be deleted; do not delete.',
        )

    def _collect_referenced_paths(self, subdir, model, field_name):
        """Return set of storage paths (names) currently referenced by model.field."""
        paths = set()
        for name in model.objects.exclude(**{field_name: ''}).values_list(field_name, flat=True):
            if name:
                name = name.replace('\\', '/')
                paths.add(name)
        return paths

    def _list_files_in_subdir(self, subdir):
        """List all file paths under subdir in default storage (one level only)."""
        if not default_storage.exists(subdir):
            return []
        try:
            _, filenames = default_storage.listdir(subdir)
        except (NotImplementedError, OSError):
            return []
        base = subdir.rstrip('/')
        return [f"{base}/{name}" for name in filenames if default_storage.exists(f"{base}/{name}")]

    def _delete_orphans(self, subdir, referenced_set, dry_run):
        """Delete files in subdir that are not in referenced_set. Return count deleted."""
        all_paths = self._list_files_in_subdir(subdir)
        to_delete = [p for p in all_paths if p not in referenced_set]
        deleted = 0
        for path in to_delete:
            if dry_run:
                self.stdout.write(self.style.WARNING(f"Would delete: {path}"))
            else:
                try:
                    default_storage.delete(path)
                    self.stdout.write(self.style.SUCCESS(f"Deleted: {path}"))
                    deleted += 1
                except OSError as e:
                    self.stderr.write(self.style.ERROR(f"Failed to delete {path}: {e}"))
        return deleted if not dry_run else len(to_delete)

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN: no files will be deleted."))

        total_deleted = 0

        # Profile avatars (accounts)
        from apps.accounts.models import UserProfile
        profile_ref = self._collect_referenced_paths('profile_photos', UserProfile, 'avatar')
        n = self._delete_orphans('profile_photos', profile_ref, dry_run)
        total_deleted += n
        self.stdout.write(f"profile_photos: {'would delete' if dry_run else 'deleted'} {n} file(s).")

        # Candidate photos (candidates app)
        try:
            from apps.candidates.models import Candidate, CandidateApplication
            cand_ref = set()
            cand_ref.update(self._collect_referenced_paths('candidate_photos', Candidate, 'photo'))
            cand_ref.update(self._collect_referenced_paths('candidate_photos', CandidateApplication, 'photo'))
            n = self._delete_orphans('candidate_photos', cand_ref, dry_run)
            total_deleted += n
            self.stdout.write(f"candidate_photos: {'would delete' if dry_run else 'deleted'} {n} file(s).")
        except ImportError:
            self.stdout.write("Skipping candidate_photos (candidates app not available).")

        if dry_run:
            self.stdout.write(self.style.WARNING(f"Dry run complete. Would delete {total_deleted} file(s)."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Cleanup complete. Deleted {total_deleted} file(s)."))
