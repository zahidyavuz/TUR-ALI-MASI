# Generated manually — data migration backfilling the new `status` field
# for agencies that existed before the partner onboarding rework.

from django.db import migrations


def backfill_status(apps, schema_editor):
    Agency = apps.get_model('agencies', 'Agency')
    Agency.objects.filter(is_verified=True).update(status='onaylandi')
    Agency.objects.filter(is_verified=False).exclude(status='onaylandi').update(status='taslak')


def reverse_backfill(apps, schema_editor):
    # No-op: status didn't exist before this migration, nothing meaningful
    # to reverse to. Field removal itself is handled by unapplying 0011.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('agencies', '0011_agency_bank_account_holder_agency_bank_name_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_status, reverse_backfill),
    ]
