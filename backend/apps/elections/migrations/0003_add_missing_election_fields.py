# Generated manually to add missing election_type and allowed_department fields
# This migration adds fields that should exist but are missing from the database

from django.db import migrations, models
import django.db.models.deletion


def add_missing_fields(apps, schema_editor):
    """Add fields only if they don't exist"""
    from django.db import connection
    
    with connection.cursor() as cursor:
        # Check what columns exist
        cursor.execute("PRAGMA table_info(elections_schoolelection)")
        columns = {row[1]: row for row in cursor.fetchall()}
        
        # Add election_type if missing
        if 'election_type' not in columns:
            # SQLite doesn't support NOT NULL with DEFAULT in ALTER TABLE, so add as nullable first
            cursor.execute("""
                ALTER TABLE elections_schoolelection 
                ADD COLUMN election_type varchar(20) DEFAULT 'university'
            """)
            # Update existing rows to ensure they have the default
            cursor.execute("""
                UPDATE elections_schoolelection 
                SET election_type = 'university' 
                WHERE election_type IS NULL
            """)
        
        # Add allowed_department_id if missing
        if 'allowed_department_id' not in columns:
            cursor.execute("""
                ALTER TABLE elections_schoolelection 
                ADD COLUMN allowed_department_id INTEGER NULL
            """)
            # Note: SQLite doesn't support adding foreign key constraints via ALTER TABLE
            # The foreign key relationship is enforced at the Django model level


class Migration(migrations.Migration):

    dependencies = [
        ('elections', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_missing_fields, migrations.RunPython.noop),
    ]

