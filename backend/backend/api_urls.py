from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tours.views import TourViewSet, CategoryViewSet
from agencies.views import AgencyViewSet
from reviews.views import ReviewViewSet
from bookings.views import BookingViewSet
from blogs.views import BlogViewSet, TagViewSet
from agencies.dashboard import AgencyDashboardView
from users.views import UserMeView, WishlistViewSet

router = DefaultRouter()
router.register(r'agencies', AgencyViewSet)
router.register(r'tours', TourViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'blogs', BlogViewSet, basename='blog')
router.register(r'tags', TagViewSet)
router.register(r'users/wishlist', WishlistViewSet, basename='wishlist')

urlpatterns = [
    path('agencies/dashboard/', AgencyDashboardView.as_view(), name='agency-dashboard'),
    path('users/me/', UserMeView.as_view(), name='user-me'),
    path('', include(router.urls)),
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),
]
