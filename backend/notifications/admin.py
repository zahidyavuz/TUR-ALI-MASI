from django.contrib import admin

from .models import NotificationLog


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'channel', 'recipient', 'status', 'attempts', 'created_at', 'sent_at')
    list_filter = ('status', 'channel', 'event_type', 'lang')
    search_fields = ('recipient', 'body', 'message_id', 'booking__booking_ref')
    readonly_fields = ('created_at', 'sent_at', 'attempts', 'provider', 'message_id', 'error', 'body')
    date_hierarchy = 'created_at'
