from django.contrib import admin
from .models import SpaVenue, SpaService, SpaAvailability


class SpaServiceInline(admin.TabularInline):
    model = SpaService
    extra = 1


class SpaAvailabilityInline(admin.TabularInline):
    model = SpaAvailability
    extra = 3
    ordering = ['date', 'time']


@admin.register(SpaVenue)
class SpaVenueAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'location', 'agency', 'is_active']
    list_filter = ['is_active', 'agency']
    search_fields = ['name', 'location', 'description']
    list_editable = ['is_active']
    inlines = [SpaServiceInline]
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('id', 'name', 'agency', 'location', 'description', 'is_active')
        }),
        ('Görseller', {
            'fields': ('image_main', 'image_sub1', 'image_sub2')
        }),
    )


@admin.register(SpaService)
class SpaServiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'venue', 'price_per_person', 'duration_minutes', 'is_active']
    list_filter = ['is_active', 'venue']
    search_fields = ['title', 'description']
    list_editable = ['price_per_person', 'is_active']
    inlines = [SpaAvailabilityInline]
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('id', 'venue', 'title', 'description', 'is_active')
        }),
        ('Fiyat & Süre', {
            'fields': ('price_per_person', 'duration_minutes', 'min_guests', 'max_guests')
        }),
        ('Görsel', {
            'fields': ('image',)
        }),
    )


@admin.register(SpaAvailability)
class SpaAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['spa_service', 'date', 'time', 'max_capacity', 'booked_count', 'remaining', 'is_available']
    list_filter = ['spa_service', 'date']
    ordering = ['date', 'time']
    list_editable = ['max_capacity']
