import threading
from decimal import Decimal

from django.db import connection
from django.test import TransactionTestCase
from django.urls import reverse

from config.testing import APITestCase, make_user
from payments.models import DepositRequest, WithdrawalRequest
from payments.services import review_deposit, review_withdrawal, submit_deposit, submit_withdrawal
from transactions.models import AuditLog, RequestStatusHistory, Transaction
from transactions.workflow import InvalidTransition


def new_deposit(user, ref="MPESA00001"):
    deposit, _ = submit_deposit(user=user, full_name="Otieno Test", phone="+254712345678", amount=Decimal("5000"), payment_reference=ref)
    return deposit


def new_withdrawal(user):
    withdrawal, _ = submit_withdrawal(
        user=user, full_name="Otieno Test", phone="+254712345678", amount=Decimal("2500"), method="mpesa", mpesa_number="+254798765432"
    )
    return withdrawal


class ReviewTestCase(APITestCase):
    def setUp(self):
        super().setUp()
        self.customer = make_user()
        self.staff = make_user(role="staff")
        self.client.force_authenticate(self.staff)

    def transition(self, kind, obj, **data):
        return self.client.post(reverse(f"admin-{kind}-transition", args=[obj.reference]), data)


class DepositReviewTests(ReviewTestCase):
    def test_approval_creates_one_transaction_with_attribution(self):
        deposit = new_deposit(self.customer)
        response = self.transition("deposit", deposit, status="approved", confirmed=True, reason="Matched statement line 14")
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["status"], "approved")
        self.assertEqual(data["reviewer"]["id"], self.staff.pk)
        self.assertEqual(data["allowed_transitions"], [])
        self.assertRegex(data["transaction"]["reference"], r"^TXN-")
        self.assertEqual([(h["to_status"], (h["changed_by"] or {}).get("id")) for h in data["history"]], [("pending", self.customer.pk), ("approved", self.staff.pk)])

        txn = Transaction.objects.get()
        self.assertEqual((txn.kind, txn.amount, txn.deposit_id, txn.recorded_by_id), ("deposit", Decimal("5000.00"), deposit.pk, self.staff.pk))
        self.assertEqual(txn.external_reference, "MPESA00001")
        audit = AuditLog.objects.get(action="depositrequest.approved")
        self.assertEqual((audit.actor_id, audit.target_id), (self.staff.pk, str(deposit.pk)))
        self.assertEqual(audit.changes["transaction"], txn.reference)
        self.assertEqual(audit.ip_address, "127.0.0.1")

    def test_repeated_approval_changes_nothing(self):
        deposit = new_deposit(self.customer)
        for _ in range(3):
            self.assertEqual(self.transition("deposit", deposit, status="approved", confirmed=True).status_code, 200)
        self.assertEqual(Transaction.objects.count(), 1)
        self.assertEqual(RequestStatusHistory.objects.filter(deposit=deposit, to_status="approved").count(), 1)
        self.assertEqual(AuditLog.objects.filter(action="depositrequest.approved").count(), 1)

    def test_approval_requires_confirmed_verification(self):
        deposit = new_deposit(self.customer)
        self.assertError(self.transition("deposit", deposit, status="approved"), 400, fields=["confirmed"])
        deposit.refresh_from_db()
        self.assertEqual(deposit.status, "pending")
        self.assertEqual(Transaction.objects.count(), 0)

    def test_rejection_requires_a_reason_and_creates_no_transaction(self):
        deposit = new_deposit(self.customer)
        self.assertError(self.transition("deposit", deposit, status="rejected"), 400, fields=["reason"])
        response = self.transition("deposit", deposit, status="rejected", reason="No matching payment found")
        self.assertEqual(response.json()["review_note"], "No matching payment found")
        self.assertEqual(Transaction.objects.count(), 0)

    def test_final_decisions_cannot_be_reversed(self):
        approved, rejected = new_deposit(self.customer, "MPESA00001"), new_deposit(self.customer, "MPESA00002")
        self.transition("deposit", approved, status="approved", confirmed=True)
        self.transition("deposit", rejected, status="rejected", reason="Not found")
        self.assertError(self.transition("deposit", approved, status="rejected", reason="Oops"), 409, "invalid_transition")
        self.assertError(self.transition("deposit", rejected, status="approved", confirmed=True), 409, "invalid_transition")
        self.assertError(self.transition("deposit", approved, status="pending"), 409, "invalid_transition")
        self.assertError(self.transition("deposit", approved, status="completed"), 409, "invalid_transition")
        self.assertEqual(Transaction.objects.count(), 1)

    def test_staff_cannot_review_their_own_request(self):
        own = new_deposit(self.staff)
        error = self.assertError(self.transition("deposit", own, status="approved", confirmed=True), 403)
        self.assertIn("your own request", error["message"])
        self.assertEqual(Transaction.objects.count(), 0)

    def test_customer_sees_reason_but_not_reviewer(self):
        deposit = new_deposit(self.customer)
        self.transition("deposit", deposit, status="rejected", reason="No matching payment found")
        self.client.force_authenticate(self.customer)
        data = self.client.get(reverse("deposit-detail", args=[deposit.reference])).json()
        self.assertEqual(data["status"], "rejected")
        self.assertEqual(data["history"][-1]["reason"], "No matching payment found")
        self.assertNotIn("changed_by", data["history"][-1])
        self.assertNotIn("reviewer", data)

    def test_list_filters_and_search(self):
        a, b = new_deposit(self.customer, "MPESA00001"), new_deposit(self.customer, "MPESA00002")
        self.transition("deposit", a, status="approved", confirmed=True)
        url = reverse("admin-deposit-list")
        self.assertEqual([r["reference"] for r in self.client.get(url, {"status": "pending"}).json()["results"]], [b.reference])
        self.assertEqual([r["reference"] for r in self.client.get(url, {"q": "mpesa00001"}).json()["results"]], [a.reference])
        self.assertEqual(self.client.get(url, {"page_size": 1}).json()["total_pages"], 2)
        self.assertError(self.client.get(url, {"status": "bogus"}), 400, fields=["status"])


class WithdrawalReviewTests(ReviewTestCase):
    def test_full_payout_path_creates_one_transaction_at_completion(self):
        withdrawal = new_withdrawal(self.customer)
        self.assertEqual(self.transition("withdrawal", withdrawal, status="approved", confirmed=True).json()["allowed_transitions"], ["processing"])
        self.assertEqual(Transaction.objects.count(), 0, "approval alone moves no money")
        self.assertEqual(self.transition("withdrawal", withdrawal, status="processing").json()["allowed_transitions"], ["completed", "failed"])
        self.assertError(self.transition("withdrawal", withdrawal, status="completed", confirmed=True), 400, fields=["external_reference"])
        response = self.transition("withdrawal", withdrawal, status="completed", confirmed=True, external_reference="sfc12345xy")
        self.assertEqual(response.status_code, 200, response.content)
        txn = Transaction.objects.get()
        self.assertEqual((txn.kind, txn.withdrawal_id, txn.external_reference), ("withdrawal", withdrawal.pk, "SFC12345XY"))
        statuses = list(RequestStatusHistory.objects.filter(withdrawal=withdrawal).values_list("to_status", flat=True))
        self.assertEqual(statuses, ["pending", "approved", "processing", "completed"])
        self.assertEqual(AuditLog.objects.filter(target_type="payments.withdrawalrequest").count(), 3)

    def test_steps_cannot_be_skipped(self):
        withdrawal = new_withdrawal(self.customer)
        self.assertError(self.transition("withdrawal", withdrawal, status="processing"), 409, "invalid_transition")
        self.assertError(
            self.transition("withdrawal", withdrawal, status="completed", confirmed=True, external_reference="ABC12345"), 409, "invalid_transition"
        )
        self.transition("withdrawal", withdrawal, status="approved", confirmed=True)
        self.assertError(self.transition("withdrawal", withdrawal, status="rejected", reason="x"), 409, "invalid_transition")

    def test_failure_needs_a_reason_and_is_final(self):
        withdrawal = new_withdrawal(self.customer)
        self.transition("withdrawal", withdrawal, status="approved", confirmed=True)
        self.transition("withdrawal", withdrawal, status="processing")
        self.assertError(self.transition("withdrawal", withdrawal, status="failed"), 400, fields=["reason"])
        self.assertEqual(self.transition("withdrawal", withdrawal, status="failed", reason="Number not registered").status_code, 200)
        self.assertError(
            self.transition("withdrawal", withdrawal, status="completed", confirmed=True, external_reference="ABC12345"), 409, "invalid_transition"
        )
        self.assertEqual(Transaction.objects.count(), 0)

    def test_staff_see_full_destination(self):
        withdrawal = new_withdrawal(self.customer)
        data = self.client.get(reverse("admin-withdrawal-detail", args=[withdrawal.reference])).json()
        self.assertEqual(data["mpesa_number"], "+254798765432")
        list_row = self.client.get(reverse("admin-withdrawal-list")).json()["results"][0]
        self.assertNotIn("mpesa_number", list_row)

    def test_customers_cannot_review_even_through_the_service(self):
        withdrawal = new_withdrawal(self.customer)
        from django.core.exceptions import PermissionDenied

        with self.assertRaises(PermissionDenied):
            review_withdrawal(withdrawal.pk, reviewer=self.customer, to_status="approved", confirmed=True)


class ConcurrentReviewTests(TransactionTestCase):
    """Real concurrent requests against PostgreSQL row locks."""

    def race(self, calls):
        barrier = threading.Barrier(len(calls))
        results = [None] * len(calls)

        def run(i, fn):
            try:
                barrier.wait()
                results[i] = fn()
            except Exception as exc:  # noqa: BLE001 - collected for assertions
                results[i] = exc
            finally:
                connection.close()

        threads = [threading.Thread(target=run, args=(i, fn)) for i, fn in enumerate(calls)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(30)
        return results

    def setUp(self):
        self.customer = make_user()
        self.reviewers = [make_user(role="staff") for _ in range(2)]

    def test_racing_approvals_create_exactly_one_transaction(self):
        deposit = new_deposit(self.customer)
        results = self.race(
            [lambda r=self.reviewers[i % 2]: review_deposit(deposit.pk, reviewer=r, to_status="approved", confirmed=True) for i in range(8)]
        )
        self.assertTrue(all(isinstance(r, tuple) for r in results), results)
        self.assertEqual(sum(changed for _, changed in results), 1)
        self.assertEqual(Transaction.objects.filter(deposit=deposit).count(), 1)
        self.assertEqual(RequestStatusHistory.objects.filter(deposit=deposit, to_status="approved").count(), 1)
        self.assertEqual(AuditLog.objects.filter(action="depositrequest.approved").count(), 1)

    def test_approve_and_reject_race_has_one_winner(self):
        deposit = new_deposit(self.customer)
        results = self.race(
            [
                lambda: review_deposit(deposit.pk, reviewer=self.reviewers[0], to_status="approved", confirmed=True),
                lambda: review_deposit(deposit.pk, reviewer=self.reviewers[1], to_status="rejected", reason="Not found"),
            ]
        )
        winners = [r for r in results if isinstance(r, tuple)]
        losers = [r for r in results if isinstance(r, InvalidTransition)]
        self.assertEqual((len(winners), len(losers)), (1, 1), results)
        deposit.refresh_from_db()
        self.assertEqual(deposit.status, winners[0][0].status)
        self.assertEqual(Transaction.objects.count(), 1 if deposit.status == "approved" else 0)

    def test_racing_payout_completions_create_one_transaction(self):
        withdrawal = new_withdrawal(self.customer)
        review_withdrawal(withdrawal.pk, reviewer=self.reviewers[0], to_status="approved", confirmed=True)
        review_withdrawal(withdrawal.pk, reviewer=self.reviewers[0], to_status="processing")
        results = self.race(
            [
                lambda: review_withdrawal(
                    withdrawal.pk, reviewer=self.reviewers[1], to_status="completed", confirmed=True, external_reference="SFC0001"
                )
                for _ in range(6)
            ]
        )
        self.assertTrue(all(isinstance(r, tuple) for r in results), results)
        self.assertEqual(Transaction.objects.filter(withdrawal=withdrawal).count(), 1)
        self.assertEqual(WithdrawalRequest.objects.get().status, "completed")
        self.assertEqual(DepositRequest.objects.count(), 0)
