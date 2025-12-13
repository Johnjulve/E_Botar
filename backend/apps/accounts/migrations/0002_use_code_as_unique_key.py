# Generated migration to use code as unique key instead of department_id
# This migration:
# 1. Makes code unique (removes unique constraint per type, adds unique constraint on code)
# 2. Changes ForeignKey fields to use to_field='code' instead of default 'id'
#
# IMPORTANT NOTES:
# - This migration will convert foreign key relationships from using IDs to using codes
# - If you have existing data, ensure all Program codes are unique before running this migration
# - The migration includes a data fix step, but you may need to manually verify foreign key
#   relationships after migration, especially if you have a large amount of existing data
# - For SQLite, Django will recreate tables, which may take time for large databases

from django.db import migrations, models
import django.db.models.deletion


def ensure_unique_codes(apps, schema_editor):
    """Ensure all program codes are unique before adding unique constraint"""
    Program = apps.get_model('accounts', 'Program')
    
    # Check for duplicate codes
    from collections import Counter
    codes = [p.code for p in Program.objects.all()]
    duplicates = [code for code, count in Counter(codes).items() if count > 1]
    
    if duplicates:
        # If duplicates exist, append program_type to make them unique
        for code in duplicates:
            programs = Program.objects.filter(code=code)
            for idx, program in enumerate(programs):
                if idx > 0:  # Keep first one as-is
                    program.code = f"{program.code}_{program.program_type}_{idx}"
                    program.save()


def reverse_ensure_unique_codes(apps, schema_editor):
    """Reverse operation - not critical, but included for completeness"""
    pass


def fix_foreign_key_data_after_schema_change(apps, schema_editor):
    """
    Fix foreign key values after schema change.
    When Django changes to_field, the foreign key columns may still contain
    old ID values. This function converts them to codes.
    """
    Program = apps.get_model('accounts', 'Program')
    UserProfile = apps.get_model('accounts', 'UserProfile')
    
    # Create mapping of ID to code
    id_to_code = {p.id: p.code for p in Program.objects.all()}
    
    # Fix Program.department foreign keys
    # After schema change, department_id column may contain IDs that need to be codes
    for program in Program.objects.exclude(department__isnull=True):
        # Get the department by the old ID value (if it exists as an integer in the column)
        # Then update it to use the code
        if hasattr(program, 'department_id') and program.department_id:
            # Try to get the department by ID first (in case migration didn't convert)
            try:
                old_dept = Program.objects.get(id=program.department_id)
                program.department = old_dept.code  # Set to code
                program.save(update_fields=['department'])
            except (Program.DoesNotExist, ValueError, TypeError):
                # If it's already a code or doesn't exist, skip
                pass
    
    # Fix UserProfile.department foreign keys
    for profile in UserProfile.objects.exclude(department__isnull=True):
        if hasattr(profile, 'department_id') and profile.department_id:
            try:
                # Try to interpret as ID first
                old_dept_id = int(profile.department_id) if isinstance(profile.department_id, (int, str)) and str(profile.department_id).isdigit() else None
                if old_dept_id and old_dept_id in id_to_code:
                    profile.department = id_to_code[old_dept_id]
                    profile.save(update_fields=['department'])
            except (ValueError, TypeError, Program.DoesNotExist):
                pass
    
    # Fix UserProfile.course foreign keys
    for profile in UserProfile.objects.exclude(course__isnull=True):
        if hasattr(profile, 'course_id') and profile.course_id:
            try:
                old_course_id = int(profile.course_id) if isinstance(profile.course_id, (int, str)) and str(profile.course_id).isdigit() else None
                if old_course_id and old_course_id in id_to_code:
                    profile.course = id_to_code[old_course_id]
                    profile.save(update_fields=['course'])
            except (ValueError, TypeError, Program.DoesNotExist):
                pass


def reverse_fix_foreign_key_data(apps, schema_editor):
    """Reverse operation - not supported"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('elections', '0003_add_missing_election_fields'),
    ]

    operations = [
        # Step 1: Ensure all codes are unique
        migrations.RunPython(ensure_unique_codes, reverse_ensure_unique_codes),
        
        # Step 2: Remove old unique constraint (program_type, code)
        migrations.RemoveConstraint(
            model_name='program',
            name='unique_program_code_per_type',
        ),
        
        # Step 3: Add unique constraint on code
        migrations.AlterField(
            model_name='program',
            name='code',
            field=models.CharField(
                help_text="Program code (e.g., 'CS', 'BSCS') - must be unique",
                max_length=20,
                unique=True
            ),
        ),
        
        # Step 4: Update Program.department ForeignKey to use to_field='code'
        # Django will handle the column type change and data conversion
        migrations.AlterField(
            model_name='program',
            name='department',
            field=models.ForeignKey(
                blank=True,
                help_text='Assign department for course-type programs (by code)',
                limit_choices_to={'program_type': 'department'},
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='courses',
                to='accounts.program',
                to_field='code'
            ),
        ),
        
        # Step 5: Update UserProfile.department ForeignKey to use to_field='code'
        migrations.AlterField(
            model_name='userprofile',
            name='department',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'program_type': 'department'},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='department_students',
                to='accounts.program',
                to_field='code'
            ),
        ),
        
        # Step 6: Update UserProfile.course ForeignKey to use to_field='code'
        migrations.AlterField(
            model_name='userprofile',
            name='course',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'program_type': 'course'},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='course_students',
                to='accounts.program',
                to_field='code'
            ),
        ),
        
        # Step 7: Fix foreign key data after schema change
        # This converts any remaining ID values to codes
        migrations.RunPython(
            fix_foreign_key_data_after_schema_change,
            reverse_fix_foreign_key_data
        ),
    ]

