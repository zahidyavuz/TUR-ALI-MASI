from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tours.views import TourViewSet, CategoryViewSet, ComboViewSet
from shuttles.views import ShuttleRouteViewSet
from agencies.views import AgencyViewSet, MenuViewSet
from agencies.restaurant_views import RestaurantDailyStatsView, DiningReservationViewSet
from reviews.views import ReviewViewSet
from bookings.views import BookingViewSet
from blogs.views import BlogViewSet, TagViewSet
from agencies.dashboard import AgencyDashboardView
from agencies.admin_views import AdminDashboardView, AdminAgencyViewSet
from users.views import UserMeView, WishlistViewSet, NotificationViewSet, UserCouponViewSet
from users.auth_views import ThrottledLoginView, ThrottledRegisterView, ClaimAccountView
from contacts.views import ContactMessageViewSet, LeadViewSet
from core.views import ExchangeRateView
# ── Acenta B2B Modülleri ──────────────────────────────────────────────────────
from agencies.agency_tours_views import AgencyTourViewSet
from agencies.agency_shuttles_views import AgencyShuttleViewSet
from agencies.agency_bookings_views import AgencyBookingViewSet
from agencies.finance_views import (
    AgencyFinanceSummaryView,
    AgencyFinanceLedgerView,
    AgencyFinanceExportView,
    AgencyPayoutRequestView,
)
from agencies.onboarding_views import (
    OnboardingStartView,
    OnboardingUpdateView,
    OnboardingSubmitView,
)




router = DefaultRouter()
router.register(r'agencies', AgencyViewSet, basename='agency')
router.register(r'tours', TourViewSet)
router.register(r'shuttles', ShuttleRouteViewSet, basename='shuttle')
router.register(r'categories', CategoryViewSet)
router.register(r'combos', ComboViewSet, basename='combo')
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
router.register(r'agency/shuttles', AgencyShuttleViewSet, basename='agency-shuttle')
router.register(r'agency/bookings', AgencyBookingViewSet, basename='agency-booking')



urlpatterns = [
    path('agencies/dashboard/', AgencyDashboardView.as_view(), name='agency-dashboard'),
    # ── Partner Onboarding (stepper) ───────────────────────────────────────────
    path('agencies/onboarding/start/', OnboardingStartView.as_view(), name='agency-onboarding-start'),
    path('agencies/onboarding/submit/', OnboardingSubmitView.as_view(), name='agency-onboarding-submit'),
    path('agencies/onboarding/', OnboardingUpdateView.as_view(), name='agency-onboarding-update'),
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('users/me/', UserMeView.as_view(), name='user-me'),
    # ── Genel Döviz Kuru Servisi (F4-03) ──────────────────────────────────────
    path('exchange-rates/', ExchangeRateView.as_view(), name='exchange-rates'),
    # ── Finans Endpoint'leri ──────────────────────────────────────────────────
    path('agency/finance/summary/', AgencyFinanceSummaryView.as_view(), name='agency-finance-summary'),
    path('agency/finance/ledger/', AgencyFinanceLedgerView.as_view(), name='agency-finance-ledger'),
    path('agency/finance/export/', AgencyFinanceExportView.as_view(), name='agency-finance-export'),
    path('agency/finance/payout-request/', AgencyPayoutRequestView.as_view(), name='agency-payout-request'),
    # ── Restoran Endpoint'leri ─────────────────────────────────────────────
    path('restaurant/daily-stats/', RestaurantDailyStatsView.as_view(), name='restaurant-daily-stats'),
    path('', include(router.urls)),

    # Rate-limit'li override'lar include'lardan ÖNCE gelmeli ki dj_rest_auth'un
    # throttle'sız view'ları yerine bunlar çözülsün. Diğer auth uçları
    # (logout, password reset, e-posta doğrulama vb.) include'lardan gelir.
    path('auth/login/', ThrottledLoginView.as_view(), name='rest_login'),
    path('auth/registration/', ThrottledRegisterView.as_view(), name='rest_register'),
    # Misafir hesabı sahiplenme (üyeliksiz checkout → hesap oluştur). include'dan
    # önce, dj_rest_auth ile çakışmayan ayrı bir uç.
    path('auth/claim-account/', ClaimAccountView.as_view(), name='claim-account'),
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),
    path('chat/', include('chat.urls')),
]

