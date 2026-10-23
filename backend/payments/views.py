from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from config.api import CustomerRequestViewSet

from . import services
from .models import DepositRequest, PaymentInstructions, WithdrawalRequest
from .serializers import (
    DepositInputSerializer,
    DepositSerializer,
    PaymentInstructionsSerializer,
    WithdrawalInputSerializer,
    WithdrawalSerializer,
)


class DepositViewSet(CustomerRequestViewSet):
    model = DepositRequest
    serializer_class = DepositSerializer
    input_serializer_class = DepositInputSerializer
    throttle_scope = "financial"
    allow_anonymous_create = False

    def perform_submit(self, data, idempotency_key):
        return services.submit_deposit(user=self.current_user(), idempotency_key=idempotency_key, **data)


class WithdrawalViewSet(CustomerRequestViewSet):
    model = WithdrawalRequest
    serializer_class = WithdrawalSerializer
    input_serializer_class = WithdrawalInputSerializer
    throttle_scope = "financial"
    allow_anonymous_create = False

    def perform_submit(self, data, idempotency_key):
        return services.submit_withdrawal(user=self.current_user(), idempotency_key=idempotency_key, **data)


class PaymentInstructionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(PaymentInstructionsSerializer(PaymentInstructions.load()).data)
