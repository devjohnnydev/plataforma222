from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient', 'is_read', 'created_at', 'notification_type')
    list_filter = ('is_read', 'notification_type', 'recipient')
    search_fields = ('title', 'message', 'recipient__username')
    ordering = ('-created_at',)

