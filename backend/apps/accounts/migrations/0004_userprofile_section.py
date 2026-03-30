from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_add_middle_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='section',
            field=models.CharField(
                blank=True,
                help_text='Class section (e.g. A, B, or block code)',
                max_length=50,
            ),
        ),
    ]
