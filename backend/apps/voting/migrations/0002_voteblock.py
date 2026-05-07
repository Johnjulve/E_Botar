import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('elections', '__first__'),
        ('voting', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='VoteBlock',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('block_index', models.BigIntegerField()),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('voter_fingerprint', models.CharField(db_index=True, max_length=64)),
                ('vote_data', models.JSONField()),
                ('previous_hash', models.CharField(max_length=64)),
                ('current_hash', models.CharField(db_index=True, max_length=64, unique=True)),
                ('validator_signature', models.CharField(blank=True, max_length=64, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('election', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vote_blocks', to='elections.schoolelection')),
                ('vote_choice', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='vote_blocks', to='voting.votechoice')),
            ],
            options={
                'verbose_name': 'Vote Block',
                'verbose_name_plural': 'Vote Blocks',
                'db_table': 'voting_voteblock',
                'ordering': ['election_id', 'block_index'],
            },
        ),
        migrations.AddConstraint(
            model_name='voteblock',
            constraint=models.UniqueConstraint(fields=('election', 'block_index'), name='unique_vote_block_index_per_election'),
        ),
        migrations.AddIndex(
            model_name='voteblock',
            index=models.Index(fields=['election', 'block_index'], name='voting_vote_electio_e32494_idx'),
        ),
        migrations.AddIndex(
            model_name='voteblock',
            index=models.Index(fields=['election', 'voter_fingerprint'], name='voting_vote_electio_83e661_idx'),
        ),
    ]
