from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.views.decorators.http import require_POST
from .models import Notification

@login_required
def notification_list_view(request):
    notifications = request.user.notifications.all()[:20]
    unread_count = request.user.notifications.filter(is_read=False).count()
    context = {
        'notifications': notifications,
        'unread_count': unread_count,
    }
    if request.headers.get('HX-Request'):
        return render(request, 'notifications/_notification_list_partial.html', context)
    return render(request, 'notifications/notification_list.html', context)

@login_required
@require_POST
def mark_read_view(request, pk):
    notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
    notification.is_read = True
    notification.save()
    if request.headers.get('HX-Request'):
        # Just return an empty response, or a success message
        return HttpResponse('')
    return redirect('notifications:list')

@login_required
@require_POST
def mark_all_read_view(request):
    request.user.notifications.filter(is_read=False).update(is_read=True)
    if request.headers.get('HX-Request'):
        return HttpResponse('')
    return redirect('notifications:list')
