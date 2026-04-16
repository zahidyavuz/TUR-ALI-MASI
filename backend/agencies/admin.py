from django.contrib import admin
from .models import Agency, Menu, Table, TableReservation


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ['name', 'business_type', 'owner', 'trust_score', 'is_verified', 'phone', 'email', 'created_at']
    list_filter = ['is_verified', 'business_type', 'created_at']
    search_fields = ['name', 'owner__username', 'email', 'phone']
    list_editable = ['is_verified', 'trust_score']
    readonly_fields = ['created_at']
    fieldsets = (
        ('Genel', {
            'fields': ('name', 'owner', 'logo', 'description', 'trust_score', 'is_verified', 'business_type')
        }),
        ('İletişim', {
            'fields': ('phone', 'email', 'address', 'website')
        }),
        ('İşletme Bilgileri', {
            'fields': ('tursab_no', 'commission_rate', 'sub_merchant_id', 'is_active', 'is_demo')
        }),
        ('Tarih', {
            'fields': ('created_at',)
        }),
    )


@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ['name', 'restaurant', 'category', 'price', 'daily_price', 'is_daily_special', 'is_available']
    list_filter = ['category', 'is_daily_special', 'is_available', 'restaurant']
    search_fields = ['name', 'restaurant__name']
    list_editable = ['price', 'daily_price', 'is_daily_special', 'is_available']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ['table_number', 'restaurant', 'capacity', 'is_active']
    list_filter = ['is_active', 'restaurant']
    search_fields = ['table_number', 'restaurant__name']
    list_editable = ['is_active', 'capacity']


@admin.register(TableReservation)
class TableReservationAdmin(admin.ModelAdmin):
    list_display = ['guest_name', 'restaurant', 'reservation_date', 'reservation_time', 'guest_count', 'table', 'status']
    list_filter = ['status', 'reservation_date', 'restaurant']
    search_fields = ['guest_name', 'guest_phone', 'guest_email']
    list_editable = ['status', 'table']
    readonly_fields = ['created_at']
    date_hierarchy = 'reservation_date'

