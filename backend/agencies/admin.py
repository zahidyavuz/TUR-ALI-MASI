from django.contrib import admin
from .models import Agency


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'trust_score', 'is_verified', 'phone', 'email', 'created_at')
    list_filter = ('is_verified', 'trust_score')
    search_fields = ('name', 'email', 'phone')
    readonly_fields = ('created_at',)
