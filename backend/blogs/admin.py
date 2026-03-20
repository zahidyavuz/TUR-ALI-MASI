from django.contrib import admin
from .models import Blog, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'author_name', 'author', 'status', 'published_at', 'category')
    list_filter = ('status', 'category', 'author', 'tags')
    search_fields = ('title', 'content')
    filter_horizontal = ('tags',)
