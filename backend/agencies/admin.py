from django.contrib import admin
from django.utils import timezone

from .models import Agency, Menu, Table, DiningReservation
from .finance_models import AgentFinanceLedger, AgentPayoutRequest


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


@admin.register(AgentFinanceLedger)
class AgentFinanceLedgerAdmin(admin.ModelAdmin):
    """
    Salt okunur: ledger bir muhasebe defteri, elle düzenlenmemeli.

    Bir düzeltme gerekiyorsa `adjustment` tipinde yeni bir satır eklenir —
    mevcut satırı değiştirmek satış ile iade arasındaki izi koparır.
    """
    list_display = ['booking_ref', 'agency', 'entry_type', 'gross_amount',
                    'commission_amount', 'net_amount', 'created_at']
    list_filter = ['entry_type', 'created_at', 'agency']
    search_fields = ['booking_ref', 'tour_title', 'agency__name']
    date_hierarchy = 'created_at'

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AgentPayoutRequest)
class AgentPayoutRequestAdmin(admin.ModelAdmin):
    """Hakediş talep kuyruğu. Zengin admin paneli arayüzü F4'te gelecek."""
    list_display = ['agency', 'amount', 'status', 'iban', 'requested_at', 'resolved_at']
    list_filter = ['status', 'requested_at']
    search_fields = ['agency__name', 'iban']
    readonly_fields = ['agency', 'amount', 'iban', 'requested_at']
    date_hierarchy = 'requested_at'
    actions = ['mark_paid', 'mark_rejected']

    def _resolve(self, queryset, new_status):
        # `resolved_at` durumla birlikte yazılır; aksi halde ödenmiş görünen
        # ama ne zaman ödendiği bilinmeyen kayıtlar oluşur.
        return queryset.filter(status='pending').update(
            status=new_status, resolved_at=timezone.now(),
        )

    @admin.action(description='Seçili talepleri ÖDENDİ olarak işaretle')
    def mark_paid(self, request, queryset):
        count = self._resolve(queryset, 'paid')
        self.message_user(request, f'{count} talep ödendi olarak işaretlendi.')

    @admin.action(description='Seçili talepleri REDDET')
    def mark_rejected(self, request, queryset):
        count = self._resolve(queryset, 'rejected')
        self.message_user(request, f'{count} talep reddedildi.')

