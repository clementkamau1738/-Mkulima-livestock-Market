import uuid
from decimal import Decimal
from unittest import mock

from django.urls import reverse

from config.testing import APITestCase, make_listing, make_user
from inquiries.models import PurchaseInquiry
from payments.models import DepositRequest, WithdrawalRequest
from payments.services import submit_deposit
from transactions import idempotency
from transactions.models import RequestStatusHistory

DEPOSIT = {"full_name": "Otieno Test", "phone": "0712345678", "amount": "5000", "payment_reference": "TJK4ABC123"}
WITHDRAWAL = {"full_name": "Otieno Test", "phone": "0712345678", "amount": "100", "method": "mpesa", "mpesa_number": "0712345678"}


class IdempotentSubmissionTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(make_user())

    def post(self, url, data, key):
        return self.client.post(url, data, HTTP_IDEMPOTENCY_KEY=str(key))

    def test_retried_deposit_returns_the_original_record(self):
        key = uuid.uuid4()
        first = self.post(reverse("deposit-list"), DEPOSIT, key)
        second = self.post(reverse("deposit-list"), DEPOSIT, key)
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.json()["reference"], second.json()["reference"])
        self.assertEqual(DepositRequest.objects.count(), 1)
        self.assertEqual(RequestStatusHistory.objects.count(), 1)

    def test_retry_is_not_rejected_as_a_duplicate_payment_reference(self):
        # Without the key the same payment reference is refused; with it, the retry succeeds quietly.
        key = uuid.uuid4()
        self.post(reverse("deposit-list"), DEPOSIT, key)
        self.assertEqual(self.post(reverse("deposit-list"), DEPOSIT, key).status_code, 200)
        self.assertError(self.client.post(reverse("deposit-list"), DEPOSIT), 400, fields=["payment_reference"])

    def test_inquiries_and_withdrawals_are_idempotent(self):
        listing = make_listing()
        inquiry = {"listing": listing.pk, "full_name": "Wanjiku", "phone": "0712345678", "message": "Is this one still available?"}
        for url, data, model in (
            (reverse("inquiry-list"), inquiry, PurchaseInquiry),
            (reverse("withdrawal-list"), WITHDRAWAL, WithdrawalRequest),
        ):
            key = uuid.uuid4()
            refs = {self.post(url, data, key).json()["reference"] for _ in range(3)}
            self.assertEqual(len(refs), 1)
            self.assertEqual(model.objects.count(), 1)

    def test_different_keys_create_different_records(self):
        self.post(reverse("withdrawal-list"), WITHDRAWAL, uuid.uuid4())
        self.post(reverse("withdrawal-list"), WITHDRAWAL, uuid.uuid4())
        self.assertEqual(WithdrawalRequest.objects.count(), 2)

    def test_key_from_another_user_is_a_conflict(self):
        key = uuid.uuid4()
        self.client.force_authenticate(make_user())
        self.post(reverse("withdrawal-list"), WITHDRAWAL, key)
        self.client.force_authenticate(make_user())
        self.assertError(self.post(reverse("withdrawal-list"), WITHDRAWAL, key), 409, "conflict")
        self.assertEqual(WithdrawalRequest.objects.count(), 1)

    def test_inquiry_key_from_a_signed_in_user_conflicts_for_a_guest(self):
        listing = make_listing()
        inquiry = {"listing": listing.pk, "full_name": "Wanjiku", "phone": "0712345678", "message": "Is this one still available?"}
        key = uuid.uuid4()
        self.post(reverse("inquiry-list"), inquiry, key)
        self.client.force_authenticate(None)
        self.assertError(self.post(reverse("inquiry-list"), inquiry, key), 409, "conflict")

    def test_invalid_key_is_rejected(self):
        self.assertError(self.post(reverse("deposit-list"), DEPOSIT, "not-a-uuid"), 400, fields=["idempotency_key"])
        self.assertEqual(DepositRequest.objects.count(), 0)

    def test_validation_errors_do_not_consume_the_key(self):
        key = uuid.uuid4()
        self.assertEqual(self.post(reverse("deposit-list"), {**DEPOSIT, "phone": "bad"}, key).status_code, 400)
        self.assertEqual(self.post(reverse("deposit-list"), DEPOSIT, key).status_code, 201)

    def test_concurrent_repeat_resolves_to_the_existing_record(self):
        # Simulate two requests racing: the second misses the initial lookup,
        # then hits the unique constraint and must return the first record.
        key = uuid.uuid4()
        original, _ = submit_deposit(user=None, full_name="A B", phone="+254712345678", amount=Decimal("5"), payment_reference="RACE00001", idempotency_key=key)
        real_filter = DepositRequest.objects.filter
        calls = {"n": 0}

        def first_lookup_misses(*args, **kwargs):
            qs = real_filter(*args, **kwargs)
            if kwargs.get("idempotency_key") == key and calls["n"] == 0:
                calls["n"] += 1
                return qs.none()
            return qs

        with mock.patch.object(DepositRequest.objects, "filter", side_effect=first_lookup_misses):
            again, created = idempotency.submit_once(
                DepositRequest,
                key=key,
                user=None,
                create=lambda: DepositRequest.objects.create(
                    reference="DEP-RACE0002", full_name="A B", phone="+254712345678", amount=Decimal("5"),
                    payment_reference="RACE00002", idempotency_key=key,
                ),
            )
        self.assertFalse(created)
        self.assertEqual(again.pk, original.pk)
        self.assertEqual(DepositRequest.objects.count(), 1)
