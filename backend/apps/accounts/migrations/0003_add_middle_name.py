# Migration: Add middle_name to UserProfile

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_use_code_as_unique_key'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='middle_name',
            field=models.CharField(blank=True, help_text='Middle name', max_length=150),
        ),
    ]
