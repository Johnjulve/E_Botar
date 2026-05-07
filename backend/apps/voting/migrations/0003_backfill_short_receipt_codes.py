import hashlib
import secrets

from django.db import migrations


RECEIPT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
RECEIPT_RAW_LENGTH = 8
RECEIPT_GROUP_SIZE = 4
MAX_GENERATION_ATTEMPTS = 20
BULK_UPDATE_BATCH_SIZE = 500


def normalize_receipt_code(receipt_code):
    if receipt_code is None:
        return ''
    return ''.join(char.lower() for char in str(receipt_code) if char.isalnum())


def format_receipt_code(raw_code):
    normalized_code = normalize_receipt_code(raw_code).upper()
    grouped = [
        normalized_code[index:index + RECEIPT_GROUP_SIZE]
        for index in range(0, len(normalized_code), RECEIPT_GROUP_SIZE)
    ]
    return '-'.join(grouped)


def generate_raw_receipt_code():
    return ''.join(secrets.choice(RECEIPT_ALPHABET) for _ in range(RECEIPT_RAW_LENGTH))


def hash_receipt_code(receipt_code):
    normalized_code = normalize_receipt_code(receipt_code)
    return hashlib.sha256(normalized_code.encode('utf-8')).hexdigest()


def should_migrate_receipt(receipt_code):
    return len(normalize_receipt_code(receipt_code)) != RECEIPT_RAW_LENGTH


def backfill_short_receipt_codes(apps, schema_editor):
    VoteReceipt = apps.get_model('voting', 'VoteReceipt')

    existing_codes = set(VoteReceipt.objects.values_list('receipt_code', flat=True))
    existing_normalized = {normalize_receipt_code(code) for code in existing_codes}

    receipts_to_update = []
    rows_updated = 0

    queryset = VoteReceipt.objects.only('id', 'receipt_code', 'receipt_hash').order_by('id')
    for receipt in queryset.iterator():
        if not should_migrate_receipt(receipt.receipt_code):
            continue

        old_code = receipt.receipt_code
        existing_codes.discard(old_code)
        existing_normalized.discard(normalize_receipt_code(old_code))

        new_receipt_code = None
        for _ in range(MAX_GENERATION_ATTEMPTS):
            raw_code = generate_raw_receipt_code()
            formatted_code = format_receipt_code(raw_code)
            normalized_code = normalize_receipt_code(formatted_code)
            if formatted_code in existing_codes:
                continue
            if normalized_code in existing_normalized:
                continue
            new_receipt_code = formatted_code
            existing_codes.add(formatted_code)
            existing_normalized.add(normalized_code)
            break

        if new_receipt_code is None:
            fallback_raw = secrets.token_hex(RECEIPT_RAW_LENGTH)[:RECEIPT_RAW_LENGTH]
            new_receipt_code = format_receipt_code(fallback_raw)
            existing_codes.add(new_receipt_code)
            existing_normalized.add(normalize_receipt_code(new_receipt_code))

        receipt.receipt_code = new_receipt_code
        receipt.receipt_hash = hash_receipt_code(new_receipt_code)
        receipts_to_update.append(receipt)

        if len(receipts_to_update) >= BULK_UPDATE_BATCH_SIZE:
            VoteReceipt.objects.bulk_update(receipts_to_update, ['receipt_code', 'receipt_hash'])
            rows_updated += len(receipts_to_update)
            receipts_to_update = []

    if receipts_to_update:
        VoteReceipt.objects.bulk_update(receipts_to_update, ['receipt_code', 'receipt_hash'])
        rows_updated += len(receipts_to_update)

    print(f'Updated legacy vote receipts: {rows_updated}')


class Migration(migrations.Migration):

    dependencies = [
        ('voting', '0002_voteblock'),
    ]

    operations = [
        migrations.RunPython(backfill_short_receipt_codes, migrations.RunPython.noop),
    ]
