from django.contrib import admin
from .models import ContactMessage, Lead


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['name', 'email', 'subject', 'message']
    list_editable = ['is_read']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['email', 'tour_interest', 'is_contacted', 'created_at']
    list_filter = ['is_contacted', 'created_at']
    search_fields = ['email', 'tour_interest']
    list_editable = ['is_contacted']
    readonly_fields = ['created_at']
