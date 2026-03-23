from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['user', 'tour', 'rating', 'comment_preview', 'agency_reply_status', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['user__username', 'tour__title', 'comment']
    readonly_fields = ['created_at']
    ordering = ['-created_at']

    def comment_preview(self, obj):
        return obj.comment[:80] + '...' if len(obj.comment) > 80 else obj.comment
    comment_preview.short_description = 'Yorum'

    def agency_reply_status(self, obj):
        return '✅ Yanıtlandı' if obj.agency_reply else '⏳ Bekliyor'
    agency_reply_status.short_description = 'Acenta Yanıtı'
