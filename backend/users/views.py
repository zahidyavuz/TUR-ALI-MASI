from rest_framework import generics, viewsets, status, parsers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth.models import User
from .models import UserProfile, Wishlist
from .serializers import UserSerializer, UserProfileSerializer, WishlistSerializer


class UserMeView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/v1/users/me/ — current user's profile"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser]

    def get_object(self):
        return self.request.user


class WishlistViewSet(viewsets.ModelViewSet):
    """CRUD for user's wishlist/favorites"""
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('tour')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        tour_id = request.data.get('tour')
        # Prevent duplicates gracefully
        if Wishlist.objects.filter(user=request.user, tour_id=tour_id).exists():
            return Response(
                {'detail': 'Bu tur zaten favorilerinizde.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='check/(?P<tour_id>[^/.]+)')
    def check(self, request, tour_id=None):
        """GET /api/v1/users/wishlist/check/<tour_id>/ — check if tour is wishlisted"""
        exists = Wishlist.objects.filter(user=request.user, tour_id=tour_id).exists()
        return Response({'is_wishlisted': exists})
