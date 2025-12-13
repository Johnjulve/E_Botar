# Generated migration to update SchoolElection.allowed_department to use to_field='code'

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('elections', '0003_add_missing_election_fields'),
        ('accounts', '0002_use_code_as_unique_key'),  # Must run after accounts migration
    ]

    operations = [
        # Update SchoolElection.allowed_department ForeignKey to use to_field='code'
        migrations.AlterField(
            model_name='schoolelection',
            name='allowed_department',
            field=models.ForeignKey(
                blank=True,
                help_text='Department allowed to vote (only for Department Election type) - referenced by code',
                limit_choices_to={'program_type': 'department'},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='department_elections',
                to='accounts.program',
                to_field='code'
            ),
        ),
    ]

