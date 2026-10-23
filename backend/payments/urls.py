from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import DepositViewSet, PaymentInstructionsView, WithdrawalViewSet

router = SimpleRouter()
router.register("deposits", DepositViewSet, basename="deposit")
router.register("withdrawals", WithdrawalViewSet, basename="withdrawal")

urlpatterns = [
    path("payment-instructions/", PaymentInstructionsView.as_view(), name="payment-instructions"),
    *router.urls,
]
