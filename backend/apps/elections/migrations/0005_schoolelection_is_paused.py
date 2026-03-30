from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('elections', '0004_use_code_for_department'),
    ]

    operations = [
        migrations.AddField(
            model_name='schoolelection',
            name='is_paused',
            field=models.BooleanField(
                default=False,
                help_text='When True, voting is temporarily suspended (schedule unchanged).',
            ),
        ),
    ]
