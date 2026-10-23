from decimal import Decimal
from unittest import mock

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from config.testing import make_listing, make_user
from inquiries.models import PurchaseInquiry
from payments.models import DepositRequest, WithdrawalRequest
from payments.services import submit_deposit
from transactions import references
from transactions.models import AuditLog, RequestStatusHistory, Transaction
from transactions.services import record_audit, record_status_change


def approved_deposit(ref="PAYREF0001"):
    deposit, _ = submit_deposit(user=None, full_name="Test Person", phone="+254712345678", amount=Decimal("100"), payment_reference=ref)
    DepositRequest.objects.filter(pk=deposit.pk).update(status="approved", reviewed_at=timezone.now())
    deposit.refresh_from_db()
    return deposit


class TransactionModelTests(TestCase):
    def setUp(self):
        self.staff = make_user(role="staff")

    def make_txn(self, **fields):
        defaults = {"reference": references.new_reference("TXN"), "kind": "deposit", "amount": Decimal("100"),
                    "recorded_by": self.staff, "occurred_at": timezone.now()}
        defaults.update(fields)
        return Transaction.objects.create(**defaults)

    def test_one_transaction_per_request(self):
        deposit = approved_deposit()
        self.make_txn(deposit=deposit)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_txn(deposit=deposit)
        self.assertEqual(Transaction.objects.count(), 1)

    def test_kind_must_match_linked_request(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_txn(kind="deposit")  # no deposit linked
        withdrawal = WithdrawalRequest.objects.create(
            reference="WDR-TEST0001", full_name="T", phone="+254712345678", amount=Decimal("5"), method="mpesa", mpesa_number="+254712345678"
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_txn(kind="deposit", withdrawal=withdrawal)

    def test_amount_must_be_positive(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_txn(deposit=approved_deposit(), amount=Decimal("0"))

    def test_records_are_append_only(self):
        txn = self.make_txn(deposit=approved_deposit())
        txn.notes = "edited"
        with self.assertRaises(ValueError):
            txn.save()


class RequestConstraintTests(TestCase):
    def test_reviewed_status_requires_review_timestamp(self):
        deposit, _ = submit_deposit(user=None, full_name="T P", phone="+254712345678", amount=Decimal("1"), payment_reference="ABCDEF")
        with self.assertRaises(IntegrityError), transaction.atomic():
            DepositRequest.objects.filter(pk=deposit.pk).update(status="approved")

    def test_withdrawal_destination_must_be_complete(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            WithdrawalRequest.objects.create(
                reference="WDR-TEST0002", full_name="T", phone="+254712345678", amount=Decimal("5"), method="bank", bank_name="X"
            )

    def test_amounts_must_be_positive(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            DepositRequest.objects.create(reference="DEP-NEG00001", full_name="T", phone="+254712345678", amount=Decimal("-1"), payment_reference="NEGATIVE1")

    def test_active_payment_reference_unique_in_database(self):
        submit_deposit(user=None, full_name="T P", phone="+254712345678", amount=Decimal("1"), payment_reference="DUPLICATE1")
        with self.assertRaises(IntegrityError), transaction.atomic():
            DepositRequest.objects.create(reference="DEP-DUP00001", full_name="T", phone="+254712345678", amount=Decimal("1"), payment_reference="duplicate1")


class HistoryAndAuditTests(TestCase):
    def test_history_must_belong_to_exactly_one_request(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            RequestStatusHistory.objects.create(to_status="pending")
        deposit = approved_deposit()
        inquiry = PurchaseInquiry.objects.create(reference="INQ-TEST0001", listing=make_listing(), full_name="T", phone="+254712345678", message="hello there")
        with self.assertRaises(IntegrityError), transaction.atomic():
            RequestStatusHistory.objects.create(deposit=deposit, inquiry=inquiry, to_status="pending")

    def test_history_and_audit_are_append_only(self):
        deposit = approved_deposit()
        entry = record_status_change(deposit, from_status="pending", to_status="approved")
        log = record_audit(actor=None, action="deposit.approved", target=deposit, summary="x" * 400)
        self.assertEqual(log.target_type, "payments.depositrequest")
        self.assertEqual(len(log.summary), 255)
        for obj in (entry, log):
            with self.assertRaises(ValueError):
                obj.save()
        self.assertEqual(AuditLog.objects.count(), 1)


class ReferenceTests(TestCase):
    def test_format(self):
        self.assertRegex(references.new_reference("DEP"), r"^DEP-[A-HJ-NP-Z2-9]{8}$")

    def test_retries_on_collision(self):
        first, _ = submit_deposit(user=None, full_name="T P", phone="+254712345678", amount=Decimal("1"), payment_reference="FIRST1")
        with mock.patch.object(references, "new_reference", side_effect=[first.reference, "DEP-UNIQUE22"]):
            second, _ = submit_deposit(user=None, full_name="T P", phone="+254712345678", amount=Decimal("1"), payment_reference="SECOND2")
        self.assertEqual(second.reference, "DEP-UNIQUE22")

    def test_other_integrity_errors_are_not_swallowed(self):
        with self.assertRaises(IntegrityError):
            references.create_with_reference(DepositRequest, "DEP", full_name="T", phone="+254712345678", amount=Decimal("-5"), payment_reference="NEGATIVE2")
