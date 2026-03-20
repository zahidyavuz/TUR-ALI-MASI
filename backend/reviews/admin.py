from django.contrib import admin
from reviews.models import Review
from bookings.models import Booking


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('tour', 'user', 'rating', 'agency_reply', 'created_at')
    list_filter = ('rating', 'tour')
    search_fields = ('comment', 'user__username', 'tour__title')


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('booking_ref', 'user', 'tour', 'status', 'total_price', 'start_date', 'created_at')
    list_filter = ('status',)
    search_fields = ('booking_ref', 'user__username', 'tour__title')
    readonly_fields = ('booking_ref', 'id')
