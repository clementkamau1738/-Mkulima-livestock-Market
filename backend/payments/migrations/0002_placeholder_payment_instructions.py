from django.db import migrations


def create_placeholder(apps, schema_editor):
    # Placeholder text only; payment details stay blank until an administrator enters them.
    PaymentInstructions = apps.get_model("payments", "PaymentInstructions")
    PaymentInstructions.objects.get_or_create(pk=1)


class Migration(migrations.Migration):
    dependencies = [("payments", "0001_initial")]

    operations = [migrations.RunPython(create_placeholder, migrations.RunPython.noop)]
