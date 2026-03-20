from django.contrib import admin
from .models import Tour, TourItinerary, Category, TourAvailability


class TourItineraryInline(admin.TabularInline):
    model = TourItinerary
    extra = 1


class TourAvailabilityInline(admin.TabularInline):
    model = TourAvailability
    extra = 1


@admin.register(Tour)
class TourAdmin(admin.ModelAdmin):
    list_display = ('title', 'id', 'location', 'price', 'agency', 'rating', 'category_obj', 'fomo_count')
    list_filter = ('category', 'location', 'agency', 'category_obj')
    search_fields = ('title', 'location', 'description')
    inlines = [TourItineraryInline, TourAvailabilityInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'icon')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(TourAvailability)
class TourAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('tour', 'date', 'max_capacity', 'booked_count', 'remaining')
    list_filter = ('tour', 'date')
