from django.contrib import admin
from .models import UserProfile, Wishlist


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone_number')
    search_fields = ('user__username', 'user__email', 'phone_number')


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'tour', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'tour__title')
