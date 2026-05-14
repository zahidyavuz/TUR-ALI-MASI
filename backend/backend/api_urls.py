from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tours.views import TourViewSet, CategoryViewSet
from agencies.views import AgencyViewSet, MenuViewSet
from agencies.restaurant_views import RestaurantDailyStatsView, DiningReservationViewSet
from reviews.views import ReviewViewSet
from bookings.views import BookingViewSet
from blogs.views import BlogViewSet, TagViewSet
from agencies.dashboard import AgencyDashboardView
from agencies.admin_views import AdminDashboardView, AdminAgencyViewSet
from users.views import UserMeView, WishlistViewSet, NotificationViewSet, UserCouponViewSet
from contacts.views import ContactMessageViewSet, LeadViewSet
# ── Acenta B2B Modülleri ──────────────────────────────────────────────────────
from agencies.agency_tours_views import AgencyTourViewSet
from agencies.finance_views import (
    AgencyFinanceSummaryView,
    AgencyFinanceLedgerView,
    AgencyPayoutRequestView,
)




router = DefaultRouter()
router.register(r'agencies', AgencyViewSet, basename='agency')
router.register(r'tours', TourViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'blogs', BlogViewSet, basename='blog')
router.register(r'tags', TagViewSet)
router.register(r'contacts', ContactMessageViewSet, basename='contact')
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'users/wishlist', WishlistViewSet, basename='wishlist')
router.register(r'users/notifications', NotificationViewSet, basename='notification')
router.register(r'users/coupons', UserCouponViewSet, basename='usercoupon')
router.register(r'admin/agencies', AdminAgencyViewSet, basename='admin-agency')
router.register(r'menus', MenuViewSet, basename='menu')
router.register(r'restaurant/reservations', DiningReservationViewSet, basename='restaurant-reservation')
# ── Acenta Tur Yönetimi (RLS korumalı) ───────────────────────────────────────
router.register(r'agency/tours', AgencyTourViewSet, basename='agency-tour')



urlpatterns = [
    path('agencies/dashboard/', AgencyDashboardView.as_view(), name='agency-dashboard'),
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('users/me/', UserMeView.as_view(), name='user-me'),
    # ── Finans Endpoint'leri ──────────────────────────────────────────────────
    path('agency/finance/summary/', AgencyFinanceSummaryView.as_view(), name='agency-finance-summary'),
    path('agency/finance/ledger/', AgencyFinanceLedgerView.as_view(), name='agency-finance-ledger'),
    path('agency/finance/payout-request/', AgencyPayoutRequestView.as_view(), name='agency-payout-request'),
    # ── Restoran Endpoint'leri ─────────────────────────────────────────────
    path('restaurant/daily-stats/', RestaurantDailyStatsView.as_view(), name='restaurant-daily-stats'),
    path('', include(router.urls)),

    path('auth/', include('dj_rest_auth.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),
    path('chat/', include('chat.urls')),
]

