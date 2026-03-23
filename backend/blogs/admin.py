from django.contrib import admin
from .models import Blog, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'status', 'published_at']
    list_filter = ['status', 'category', 'published_at']
    search_fields = ['title', 'content', 'author__username']
    prepopulated_fields = {'slug': ('title',)}
    list_editable = ['status']
    filter_horizontal = ['tags']
    readonly_fields = ['published_at']
    date_hierarchy = 'published_at'
    fieldsets = (
        ('İçerik', {
            'fields': ('title', 'slug', 'excerpt', 'content', 'cover_image')
        }),
        ('Yazar ve Kategori', {
            'fields': ('author', 'author_name', 'author_role', 'author_avatar', 'category', 'tags', 'related_tour_slug')
        }),
        ('Durum', {
            'fields': ('status', 'reading_time')
        }),
        ('Tarih', {
            'fields': ('published_at',),
            'classes': ('collapse',)
        }),
    )
