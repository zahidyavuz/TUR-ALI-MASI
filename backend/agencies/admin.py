from django.contrib import admin
from .models import Agency


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'trust_score', 'is_verified', 'phone', 'email', 'created_at']
    list_filter = ['is_verified', 'created_at']
    search_fields = ['name', 'owner__username', 'email', 'phone']
    list_editable = ['is_verified', 'trust_score']
    readonly_fields = ['created_at']
    fieldsets = (
        ('Genel', {
            'fields': ('name', 'owner', 'logo', 'description', 'trust_score', 'is_verified')
        }),
        ('İletişim', {
            'fields': ('phone', 'email', 'address', 'website')
        }),
        ('Tarih', {
            'fields': ('created_at',)
        }),
    )
