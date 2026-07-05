from django.contrib import admin
from .models import ShuttleRoute, ShuttleAvailability


class ShuttleAvailabilityInline(admin.TabularInline):
    model = ShuttleAvailability
    extra = 3
    ordering = ['date', 'time']


@admin.register(ShuttleRoute)
class ShuttleRouteAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'origin', 'destination', 'vehicle_type', 'price_per_person', 'agency', 'is_active']
    list_filter = ['vehicle_type', 'is_active', 'agency']
    search_fields = ['title', 'origin', 'destination', 'description']
    list_editable = ['price_per_person', 'is_active']
    inlines = [ShuttleAvailabilityInline]
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('id', 'title', 'agency', 'origin', 'destination', 'description', 'is_active')
        }),
        ('Araç & Fiyat', {
            'fields': ('vehicle_type', 'capacity', 'price_per_person', 'min_passengers', 'max_passengers', 'duration_minutes')
        }),
        ('Görseller', {
            'fields': ('image_main', 'image_sub1', 'image_sub2')
        }),
    )


@admin.register(ShuttleAvailability)
class ShuttleAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['shuttle_route', 'date', 'time', 'max_capacity', 'booked_count', 'remaining', 'is_available']
    list_filter = ['shuttle_route', 'date']
    ordering = ['date', 'time']
    list_editable = ['max_capacity']
