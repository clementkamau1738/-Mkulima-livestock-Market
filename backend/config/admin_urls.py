"""Staff-only API under /api/admin/. Every view requires an active staff or
administrator account (accounts.permissions.IsReviewer)."""

from django.urls import path
from rest_framework.routers import SimpleRouter

from accounts.admin_views import AccountViewSet
from inquiries.admin_views import AdminInquiryViewSet
from livestock.admin_views import AdminListingViewSet
from payments.admin_views import AdminDepositViewSet, AdminWithdrawalViewSet
from transactions.admin_views import AuditLogViewSet, SummaryView

router = SimpleRouter()
router.register("livestock", AdminListingViewSet, basename="admin-livestock")
router.register("inquiries", AdminInquiryViewSet, basename="admin-inquiry")
router.register("deposits", AdminDepositViewSet, basename="admin-deposit")
router.register("withdrawals", AdminWithdrawalViewSet, basename="admin-withdrawal")
router.register("accounts", AccountViewSet, basename="admin-account")
router.register("audit-log", AuditLogViewSet, basename="admin-audit")

urlpatterns = [
    path("summary/", SummaryView.as_view(), name="admin-summary"),
    *router.urls,
]
