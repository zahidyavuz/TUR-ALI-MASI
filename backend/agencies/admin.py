from django.contrib import admin
from .models import Agency, Menu, Table, DiningReservation


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ['name', 'business_type', 'status', 'owner', 'trust_score', 'is_verified', 'phone', 'email', 'created_at']
    list_filter = ['status', 'is_verified', 'business_type', 'created_at']
    search_fields = ['name', 'owner__username', 'email', 'phone', 'tax_id']
    list_editable = ['is_verified', 'trust_score']
    readonly_fields = ['created_at']
    fieldsets = (
        ('Genel', {
            'fields': ('name', 'owner', 'logo', 'cover_image', 'description', 'trust_score', 'business_type', 'legal_entity_type')
        }),
        ('Başvuru Durumu', {
            'fields': ('status', 'rejection_reason', 'onboarding_step', 'is_verified', 'is_active', 'is_demo')
        }),
        ('İletişim', {
            'fields': ('phone', 'email', 'address', 'city', 'district', 'website')
        }),
        ('Yasal & Vergi', {
            'fields': ('tax_id', 'tax_office', 'mersis_no', 'trade_registry_document')
        }),
        ('TÜRSAB (Seyahat Acentası)', {
            'fields': ('tursab_no', 'tursab_group', 'tursab_document')
        }),
        ('İşletme Bilgileri', {
            'fields': ('commission_rate', 'sub_merchant_id')
        }),
        ('Finans', {
            'fields': ('iban', 'bank_account_holder', 'bank_name')
        }),
        ('Sözleşme', {
            'fields': ('contract_accepted_at', 'kvkk_accepted_at')
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


@admin.register(DiningReservation)
class DiningReservationAdmin(admin.ModelAdmin):
    list_display = ['guest_name', 'restaurant', 'reservation_date', 'reservation_time', 'guest_count', 'table', 'status']
    list_filter = ['status', 'reservation_date', 'restaurant']
    search_fields = ['guest_name', 'guest_phone', 'guest_email']
    list_editable = ['status', 'table']
    readonly_fields = ['created_at']
    date_hierarchy = 'reservation_date'

