
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pesapod', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name='chama',
                    name='name',
                    field=models.CharField(max_length=150, unique=True),
                ),
            ],
        ),
    ]
