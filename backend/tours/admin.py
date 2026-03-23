from django.contrib import admin
from .models import Tour, Category, TourItinerary, TourAvailability


class TourItineraryInline(admin.TabularInline):
    model = TourItinerary
    extra = 1
    ordering = ['day']


class TourAvailabilityInline(admin.TabularInline):
    model = TourAvailability
    extra = 3
    ordering = ['date']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Tour)
class TourAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'location', 'price', 'rating', 'reviews_count', 'agency', 'fomo_count']
    list_filter = ['category', 'location', 'agency']
    search_fields = ['title', 'location', 'description']
    list_editable = ['price', 'fomo_count']
    readonly_fields = ['reviews_count']
    inlines = [TourItineraryInline, TourAvailabilityInline]
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('id', 'title', 'agency', 'location', 'category', 'category_obj', 'description')
        }),
        ('Fiyat & İstatistik', {
            'fields': ('price', 'original_price', 'discount', 'rating', 'reviews_count', 'fomo_count')
        }),
        ('Detaylar', {
            'fields': ('duration', 'guide', 'accommodation', 'transportation', 'filmed_in')
        }),
        ('Görseller', {
            'fields': ('image_main', 'image_sub1', 'image_sub2')
        }),
        ('İçerik (JSON)', {
            'fields': ('included', 'excluded'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TourItinerary)
class TourItineraryAdmin(admin.ModelAdmin):
    list_display = ['tour', 'day', 'title']
    list_filter = ['tour']
    ordering = ['tour', 'day']


@admin.register(TourAvailability)
class TourAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['tour', 'date', 'max_capacity', 'booked_count', 'remaining', 'is_available']
    list_filter = ['tour', 'date']
    ordering = ['date']
    list_editable = ['max_capacity']
