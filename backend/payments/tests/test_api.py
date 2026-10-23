from django.test import override_settings
from django.urls import reverse
from django.utils import timezone

from config.testing import APITestCase, make_user
from payments.models import DepositRequest, PaymentInstructions, WithdrawalRequest
from transactions.models import Transaction

DEPOSITS = reverse("deposit-list")
WITHDRAWALS = reverse("withdrawal-list")


def deposit_payload(**overrides):
    data = {"full_name": "Otieno Test", "phone": "0712345678", "amount": "5000", "payment_reference": "tjk4abc123", "notes": ""}
    data.update(overrides)
    return data


def withdrawal_payload(**overrides):
    data = {"full_name": "Otieno Test", "phone": "0712345678", "amount": "2500.50", "method": "mpesa", "mpesa_number": "0798765432"}
    data.update(overrides)
    return data


class SignedInTestCase(APITestCase):
    """Deposits and withdrawals can only be submitted by a signed-in customer."""

    def setUp(self):
        super().setUp()
        self.customer = make_user()
        self.client.force_authenticate(self.customer)


class DepositCreateTests(SignedInTestCase):
    def test_creates_pending_request_without_moving_money(self):
        response = self.client.post(DEPOSITS, deposit_payload())
        self.assertEqual(response.status_code, 201, response.content)
        data = response.json()
        self.assertRegex(data["reference"], r"^DEP-[A-HJ-NP-Z2-9]{8}$")
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["amount"], "5000.00")
        self.assertEqual(data["payment_reference"], "TJK4ABC123")
        self.assertEqual(data["phone"], "+254712345678")
        self.assertIsNone(data["reviewed_at"])
        self.assertEqual(Transaction.objects.count(), 0)
        self.assertNotIn("reviewer", data)

    def test_ignores_client_supplied_status_reviewer_and_user(self):
        staff, other = make_user(role="staff"), make_user()
        self.client.post(
            DEPOSITS,
            deposit_payload(status="approved", reviewer=staff.pk, user=other.pk, reviewed_at=timezone.now().isoformat()),
        )
        deposit = DepositRequest.objects.get()
        self.assertEqual(deposit.status, "pending")
        self.assertIsNone(deposit.reviewer)
        self.assertIsNone(deposit.reviewed_at)
        self.assertEqual(deposit.user, self.customer, "owner comes from the session, not the payload")

    def test_amount_validation(self):
        for bad in ["0", "-10", "abc", "10000000.01", "12.345", ""]:
            self.assertError(self.client.post(DEPOSITS, deposit_payload(amount=bad)), 400, "validation_error", ["amount"])
        self.assertEqual(DepositRequest.objects.count(), 0)

    def test_payment_reference_validation(self):
        for bad in ["ab", "has space!", "x" * 31]:
            self.assertError(self.client.post(DEPOSITS, deposit_payload(payment_reference=bad)), 400, fields=["payment_reference"])

    def test_same_payment_reference_cannot_be_claimed_twice(self):
        self.assertEqual(self.client.post(DEPOSITS, deposit_payload()).status_code, 201)
        error = self.assertError(
            self.client.post(DEPOSITS, deposit_payload(payment_reference="TJK4ABC123")), 400, fields=["payment_reference"]
        )
        self.assertIn("already been submitted", error["fields"]["payment_reference"][0])
        self.assertEqual(DepositRequest.objects.count(), 1)

    def test_reference_can_be_resubmitted_after_rejection(self):
        self.client.post(DEPOSITS, deposit_payload())
        DepositRequest.objects.update(status="rejected", reviewed_at=timezone.now())
        self.assertEqual(self.client.post(DEPOSITS, deposit_payload()).status_code, 201)

    def test_create_is_rate_limited(self):
        for i in range(10):
            self.assertEqual(self.client.post(DEPOSITS, deposit_payload(payment_reference=f"REF00{i:04d}")).status_code, 201)
        self.assertError(self.client.post(DEPOSITS, deposit_payload(payment_reference="REF999999")), 429, "throttled")


class WithdrawalCreateTests(SignedInTestCase):
    def test_mpesa_withdrawal_is_pending_and_masked(self):
        response = self.client.post(WITHDRAWALS, withdrawal_payload(account_number="12345678", bank_name="Ignored"))
        self.assertEqual(response.status_code, 201, response.content)
        data = response.json()
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["destination"], "M-Pesa ending 432")
        self.assertNotIn("mpesa_number", data)
        withdrawal = WithdrawalRequest.objects.get()
        self.assertEqual(withdrawal.mpesa_number, "+254798765432")
        self.assertEqual((withdrawal.bank_name, withdrawal.account_number), ("", ""), "other method's fields are dropped")

    def test_bank_withdrawal_requires_all_bank_fields(self):
        self.assertError(
            self.client.post(WITHDRAWALS, withdrawal_payload(method="bank", mpesa_number="")),
            400,
            "validation_error",
            ["bank_name", "account_name", "account_number"],
        )
        response = self.client.post(
            WITHDRAWALS,
            withdrawal_payload(method="bank", bank_name="Sample Bank", account_name="Otieno Test", account_number="0123456789"),
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["destination"], "Sample Bank account ending 6789")
        self.assertNotIn("account_number", response.json())

    def test_mpesa_withdrawal_requires_number(self):
        self.assertError(self.client.post(WITHDRAWALS, withdrawal_payload(mpesa_number="")), 400, fields=["mpesa_number"])
        self.assertError(self.client.post(WITHDRAWALS, withdrawal_payload(method="cash")), 400, fields=["method"])

    def test_ignores_client_supplied_status(self):
        self.client.post(WITHDRAWALS, withdrawal_payload(status="completed"))
        self.assertEqual(WithdrawalRequest.objects.get().status, "pending")
        self.assertEqual(Transaction.objects.count(), 0)


class RequestAccessTests(APITestCase):
    def test_customers_only_see_their_own_requests(self):
        alice, bob = make_user(), make_user()
        refs = {}
        for user, ref in ((alice, "ALICE00001"), (bob, "BOB0000001")):
            self.client.force_authenticate(user)
            refs[user] = (
                self.client.post(DEPOSITS, deposit_payload(payment_reference=ref)).json()["reference"],
                self.client.post(WITHDRAWALS, withdrawal_payload()).json()["reference"],
            )
        self.client.force_authenticate(alice)
        self.assertEqual([r["reference"] for r in self.client.get(DEPOSITS).json()["results"]], [refs[alice][0]])
        self.assertEqual([r["reference"] for r in self.client.get(WITHDRAWALS).json()["results"]], [refs[alice][1]])
        self.assertError(self.client.get(reverse("deposit-detail", args=[refs[bob][0]])), 404)
        self.assertError(self.client.get(reverse("withdrawal-detail", args=[refs[bob][1]])), 404)
        own = self.client.get(reverse("deposit-detail", args=[refs[alice][0]])).json()
        self.assertEqual([h["to_status"] for h in own["history"]], ["pending"])

    def test_staff_get_no_special_access_through_customer_endpoints(self):
        customer, staff = make_user(), make_user(role="staff")
        self.client.force_authenticate(customer)
        ref = self.client.post(DEPOSITS, deposit_payload()).json()["reference"]
        self.client.force_authenticate(staff)
        self.assertError(self.client.get(reverse("deposit-detail", args=[ref])), 404)

    def test_anonymous_cannot_read_requests(self):
        for url in (DEPOSITS, WITHDRAWALS):
            self.assertError(self.client.get(url), 403, "not_authenticated")

    def test_anonymous_cannot_submit_money_requests(self):
        self.assertError(self.client.post(DEPOSITS, deposit_payload()), 403, "not_authenticated")
        self.assertError(self.client.post(WITHDRAWALS, withdrawal_payload()), 403, "not_authenticated")
        self.assertEqual(DepositRequest.objects.count() + WithdrawalRequest.objects.count(), 0)

    def test_requests_cannot_be_changed_through_the_api(self):
        user = make_user()
        self.client.force_authenticate(user)
        ref = self.client.post(DEPOSITS, deposit_payload()).json()["reference"]
        url = reverse("deposit-detail", args=[ref])
        self.assertEqual(self.client.patch(url, {"status": "approved"}).status_code, 405)
        self.assertEqual(DepositRequest.objects.get(reference=ref).status, "pending")


class PaymentInstructionsTests(APITestCase):
    URL = reverse("payment-instructions")

    def test_placeholder_instructions_by_default(self):
        data = self.client.get(self.URL).json()
        self.assertTrue(data["is_placeholder"])
        self.assertEqual({m["value"] for m in data["methods"]}, {"[To be provided by administrator]"})
        self.assertEqual(len(data["steps"]), 4)

    def test_reflects_administrator_details(self):
        instructions = PaymentInstructions.load()
        instructions.mpesa_paybill = "000000"
        instructions.save()
        data = self.client.get(self.URL).json()
        self.assertFalse(data["is_placeholder"])
        self.assertEqual(data["methods"][0]["value"], "000000")

    def test_singleton(self):
        PaymentInstructions(title="Second").save()
        self.assertEqual(PaymentInstructions.objects.count(), 1)

    @override_settings(DEBUG=False)
    def test_is_public(self):
        self.assertEqual(self.client.get(self.URL).status_code, 200)
