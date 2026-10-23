from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from config.authentication import enforce_csrf

from . import services
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .throttles import IPScopedRateThrottle, LoginAccountThrottle

BAD_CREDENTIALS = "The email or password is incorrect."


def session_payload(user):
    return {"user": UserSerializer(user).data if user.is_authenticated else None}


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    """Who is signed in (or null). Also sets the CSRF cookie the SPA needs
    before its first POST."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(session_payload(request.user))


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def get_throttles(self):
        return [*super().get_throttles(), IPScopedRateThrottle(), LoginAccountThrottle()]

    def post(self, request):
        enforce_csrf(request)
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, **serializer.validated_data)
        if user is None:
            raise AuthenticationFailed(BAD_CREDENTIALS, code="invalid_credentials")
        login(request, user)  # Rotates the session key and CSRF token.
        return Response(session_payload(user))


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def get_throttles(self):
        return [*super().get_throttles(), IPScopedRateThrottle()]

    def post(self, request):
        enforce_csrf(request)
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.register_customer(**serializer.validated_data)
        login(request, user, backend="accounts.backends.EmailBackend")
        return Response(session_payload(user), status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """Always succeeds, so a client with an already-expired session can still
    clear its state."""

    permission_classes = [AllowAny]

    def post(self, request):
        enforce_csrf(request)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
