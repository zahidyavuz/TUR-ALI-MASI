from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_ref', 'user', 'tour', 'status', 'guests', 'total_price', 'start_date', 'created_at']
    list_filter = ['status', 'created_at', 'start_date']
    search_fields = ['booking_ref', 'user__username', 'user__email', 'tour__title']
    readonly_fields = ['id', 'booking_ref', 'payment_intent_id', 'created_at', 'cancelled_at']
    list_editable = ['status']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Rezervasyon Bilgileri', {
            'fields': ('id', 'booking_ref', 'user', 'tour', 'status')
        }),
        ('Tarih ve Kişi', {
            'fields': ('date_label', 'start_date', 'end_date', 'guests', 'total_price')
        }),
        ('Ödeme', {
            'fields': ('payment_intent_id',)
        }),
        ('Zaman Damgaları', {
            'fields': ('created_at', 'cancelled_at'),
            'classes': ('collapse',)
        }),
    )
