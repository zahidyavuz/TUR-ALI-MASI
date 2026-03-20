from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from .models import Agency
from .serializers import AgencySerializer, AgencyApplicationSerializer
from backend.permissions import IsOwnerOrReadOnly


class AgencyViewSet(viewsets.ModelViewSet):
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    @action(detail=False, methods=['post'], url_path='apply', permission_classes=[IsAuthenticated])
    def apply(self, request):
        """POST /api/v1/agencies/apply/ — Apply to become an agency"""
        # Check if user already has an agency
        if Agency.objects.filter(owner=request.user).exists():
            return Response(
                {"error": "Zaten bir acenta kaydınız mevcut."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AgencyApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agency = serializer.save(owner=request.user, is_verified=False)

        return Response(
            AgencySerializer(agency).data,
            status=status.HTTP_201_CREATED
        )
