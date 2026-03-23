from django.contrib import admin
from .models import UserProfile, Wishlist, Notification


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone_number']
    search_fields = ['user__username', 'user__email', 'phone_number']


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ['user', 'tour', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'tour__title']
    readonly_fields = ['created_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'type', 'is_read', 'created_at']
    list_filter = ['type', 'is_read', 'created_at']
    search_fields = ['user__username', 'title', 'message']
    list_editable = ['is_read']
    readonly_fields = ['created_at']
