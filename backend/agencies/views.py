from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from .models import Agency, Menu, TableReservation
from .serializers import (
    AgencySerializer, AgencyApplicationSerializer,
    MenuSerializer, TableReservationSerializer
)
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

    @action(detail=False, methods=['get'], url_path='my-profile', permission_classes=[IsAuthenticated])
    def my_profile(self, request):
        """GET /api/v1/agencies/my-profile/ — Returns the business profile of the logged-in user"""
        try:
            agency = Agency.objects.get(owner=request.user)
            return Response(AgencySerializer(agency).data)
        except Agency.DoesNotExist:
            return Response({'detail': 'İşletme profili bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)


class MenuViewSet(viewsets.ModelViewSet):
    """
    CRUD for restaurant menu items.
    GET    /api/v1/menus/             — List menus (filter by ?restaurant=<id>)
    POST   /api/v1/menus/             — Create menu item
    PATCH  /api/v1/menus/<id>/        — Update
    DELETE /api/v1/menus/<id>/        — Delete
    POST   /api/v1/menus/<id>/set-daily-price/ — Set daily special price
    """
    serializer_class = MenuSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category']

    def get_queryset(self):
        qs = Menu.objects.all()
        restaurant_id = self.request.query_params.get('restaurant')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        daily_special = self.request.query_params.get('daily_special')
        if daily_special == 'true':
            qs = qs.filter(is_daily_special=True)
        return qs

    @action(detail=True, methods=['post'], url_path='set-daily-price')
    def set_daily_price(self, request, pk=None):
        """POST /api/v1/menus/<id>/set-daily-price/ — Activate/update daily special pricing"""
        menu_item = self.get_object()
        daily_price = request.data.get('daily_price')
        activate = request.data.get('activate', True)

        if daily_price is not None:
            menu_item.daily_price = daily_price
        menu_item.is_daily_special = activate
        menu_item.save(update_fields=['daily_price', 'is_daily_special'])

        return Response(MenuSerializer(menu_item).data)

    @action(detail=True, methods=['post'], url_path='toggle-availability')
    def toggle_availability(self, request, pk=None):
        """Toggle is_available (mevcut/tükendi)"""
        menu_item = self.get_object()
        menu_item.is_available = not menu_item.is_available
        menu_item.save(update_fields=['is_available'])
        return Response(MenuSerializer(menu_item).data)


class TableReservationViewSet(viewsets.ModelViewSet):
    """
    CRUD for restaurant table reservations.
    GET    /api/v1/table-reservations/             — List (filter by ?restaurant=<id>&date=<YYYY-MM-DD>)
    POST   /api/v1/table-reservations/             — Create
    PATCH  /api/v1/table-reservations/<id>/        — Update
    POST   /api/v1/table-reservations/<id>/update-status/ — Change status
    """
    serializer_class = TableReservationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = TableReservation.objects.all()
        restaurant_id = self.request.query_params.get('restaurant')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(reservation_date=date)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Change reservation status"""
        reservation = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = [c[0] for c in TableReservation.STATUS_CHOICES]

        if new_status not in valid_statuses:
            return Response(
                {'error': f'Geçersiz durum. Geçerli değerler: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reservation.status = new_status
        reservation.save(update_fields=['status'])
        return Response(TableReservationSerializer(reservation).data)
