def notifications_context(request):
    if request.user.is_authenticated:
        unread_count = request.user.notifications.filter(is_read=False).count()
        recent_notifications = request.user.notifications.all()[:10]
        return {
            'navbar_unread_count': unread_count,
            'navbar_notifications': recent_notifications,
        }
    return {}
