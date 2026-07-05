"""
agencies/onboarding_views.py
-----------------------------
Partner (İşletme) onboarding endpoint'leri — stepper akışı.

  POST /api/v1/agencies/onboarding/start/   — Adım 1 (User + Agency, atomic)
  PATCH /api/v1/agencies/onboarding/         — Adım 2-5 (kendi Agency'sini günceller)
  GET  /api/v1/agencies/onboarding/          — Devam eden başvuruyu geri yükle
  POST /api/v1/agencies/onboarding/submit/  — Adım 6 (nihai gönderim)
"""
import logging

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, parsers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Agency
from .onboarding_serializers import (
    OnboardingStartSerializer,
    AgencyOnboardingStepSerializer,
    AgencyOnboardingSubmitSerializer,
)
from .serializers import AgencySerializer

logger = logging.getLogger('agencies')


class OnboardingStartView(APIView):
    """POST /api/v1/agencies/onboarding/start/ — Adım 1: hesap + işletme türü."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OnboardingStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            username_base = data['email'].split('@')[0]
            username = username_base
            suffix = 1
            while User.objects.filter(username=username).exists():
                suffix += 1
                username = f'{username_base}{suffix}'

            name_parts = data['contact_name'].strip().split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            user = User.objects.create_user(
                username=username,
                email=data['email'],
                password=data['password'],
                first_name=first_name,
                last_name=last_name,
            )

            agency = Agency.objects.create(
                owner=user,
                name=data['contact_name'],  # Adım 2'de gerçek ticari unvanla güncellenecek
                phone=data['phone'],
                email=data['email'],
                business_type=data['business_type'],
                legal_entity_type=data['legal_entity_type'],
                status='taslak',
                onboarding_step=2,
                is_verified=False,
            )

        refresh = RefreshToken.for_user(user)
        logger.info(f"[ONBOARDING] Started for agency '{agency.name}' (user={user.username})")

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'agency': AgencySerializer(agency).data,
        }, status=status.HTTP_201_CREATED)


class OnboardingUpdateView(APIView):
    """
    GET   /api/v1/agencies/onboarding/ — kaldığı yerden devam etmek için mevcut durumu döner
    PATCH /api/v1/agencies/onboarding/ — Adım 2-5
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def _get_agency(self, request):
        return get_object_or_404(Agency, owner=request.user)

    def get(self, request):
        agency = self._get_agency(request)
        return Response(AgencySerializer(agency).data)

    def patch(self, request):
        agency = self._get_agency(request)
        if agency.status not in ('taslak', 'eksik_bilgi'):
            return Response(
                {'error': 'Onaylanmış veya incelemedeki bir başvuru düzenlenemez.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AgencyOnboardingStepSerializer(agency, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(AgencySerializer(agency).data)


class OnboardingSubmitView(APIView):
    """POST /api/v1/agencies/onboarding/submit/ — Adım 6: nihai gönderim."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        agency = get_object_or_404(Agency, owner=request.user)
        if agency.status not in ('taslak', 'eksik_bilgi'):
            return Response(
                {'error': 'Bu başvuru zaten gönderilmiş.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AgencyOnboardingSubmitSerializer(agency, data=request.data)
        serializer.is_valid(raise_exception=True)

        now = timezone.now()
        agency.status = 'beklemede'
        agency.rejection_reason = None
        agency.contract_accepted_at = now
        agency.kvkk_accepted_at = now
        agency.onboarding_step = 6
        agency.save(update_fields=[
            'status', 'rejection_reason', 'contract_accepted_at', 'kvkk_accepted_at', 'onboarding_step',
        ])

        logger.info(f"[ONBOARDING] Submitted for review: agency '{agency.name}'")

        return Response(AgencySerializer(agency).data)
