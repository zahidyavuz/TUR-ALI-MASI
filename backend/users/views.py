from rest_framework import generics, viewsets, status, parsers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth.models import User
from .models import UserProfile, Wishlist, Notification, UserCoupon
from .serializers import UserSerializer, WishlistSerializer, NotificationSerializer, UserProfileSerializer, UserCouponSerializer


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
        wishlist_item = Wishlist.objects.filter(user=request.user, tour_id=tour_id).first()
        return Response({
            'is_wishlisted': wishlist_item is not None,
            'wishlist_id': wishlist_item.id if wishlist_item else None
        })

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        """POST /api/v1/users/wishlist/toggle/ { "tour": <slug> }"""
        tour_id = request.data.get('tour')
        if not tour_id:
            return Response({'error': 'Tour ID must be provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        wishlist_item = Wishlist.objects.filter(user=request.user, tour_id=tour_id).first()
        if wishlist_item:
            wishlist_item.delete()
            return Response({'is_wishlisted': False, 'message': 'Removed from wishlist'})
        else:
            new_item = Wishlist.objects.create(user=request.user, tour_id=tour_id)
            return Response({'is_wishlisted': True, 'message': 'Added to wishlist', 'wishlist_id': new_item.id})

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'ok'})

class UserCouponViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/users/coupons/ — user's coupons"""
    serializer_class = UserCouponSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserCoupon.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='assign')
    def assign_coupon(self, request):
        """POST /api/v1/users/coupons/assign/ — admin/system assign coupon"""
        # Usually this would be restricted to internal system calls or admins
        code = request.data.get('code')
        discount_type = request.data.get('discount_type', 'percentage')
        discount_value = request.data.get('discount_value')
        valid_until = request.data.get('valid_until')
        
        if not all([code, discount_value, valid_until]):
             return Response({'error': 'code, discount_value, valid_until parameters are required.'}, status=status.HTTP_400_BAD_REQUEST)

        coupon = UserCoupon.objects.create(
            user=request.user,
            code=code,
            discount_type=discount_type,
            discount_value=discount_value,
            valid_until=valid_until,
            description=request.data.get('description', '')
        )
        return Response(UserCouponSerializer(coupon).data, status=status.HTTP_201_CREATED)
