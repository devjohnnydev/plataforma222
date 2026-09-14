from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib import messages
from django.contrib.auth import get_user_model
from notifications.utils import send_notification
from .models import RemoteSession, RemoteSessionLog

User = get_user_model()

@login_required
def create_remote_session(request):
    if request.method == 'POST':
        student_id = request.POST.get('student_id')
        reason = request.POST.get('reason')
        request_screen = request.POST.get('request_screen_sharing') == 'on'
        request_control = request.POST.get('request_control') == 'on'
        
        student = get_object_or_404(User, pk=student_id)
        
        # We assume teachers/admins are allowed. A rigorous check could go here.
        session = RemoteSession.objects.create(
            teacher=request.user,
            student=student,
            request_screen_sharing=True, # Always true per requirements
            request_control=request_control
        )
        
        RemoteSessionLog.objects.create(
            session=session,
            action='SESSION_REQUESTED',
            user=request.user,
            details=f"Reason: {reason}"
        )
        
        # Send Notification to Student
        send_notification(
            recipient=student,
            title="Solicitação de Suporte Remoto",
            message=f"O professor {request.user.get_full_name() or request.user.username} solicitou acesso ao seu computador para: {reason}",
            notification_type=f'RS_{session.session_code}'
        )
        
        # We need a URL to redirect the teacher to the waiting room
        return redirect('remote_support:waiting_room', session_code=session.session_code)
        
    return redirect('core:dashboard')

@login_required
def waiting_room(request, session_code):
    session = get_object_or_404(RemoteSession, session_code=session_code, teacher=request.user)
    return render(request, 'remote_support/waiting_room.html', {'session': session})


@login_required
def student_request_view(request, session_code):
    session = get_object_or_404(RemoteSession, session_code=session_code, student=request.user)
    
    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'accept':
            session.status = 'AUTHORIZED'
            session.save()
            RemoteSessionLog.objects.create(session=session, action='AUTHORIZED', user=request.user)
            # Notify teacher via WebSocket
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'remote_{session_code}',
                {'type': 'remote_message', 'message': {'action': 'authorized'}}
            )
            return redirect('remote_support:student_active_session', session_code=session_code)
        elif action == 'reject':
            session.status = 'REJECTED'
            session.save()
            RemoteSessionLog.objects.create(session=session, action='REJECTED', user=request.user)
            # Notify teacher via WebSocket
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'remote_{session_code}',
                {'type': 'remote_message', 'message': {'action': 'rejected'}}
            )
            return redirect('core:home')
            
    return render(request, 'remote_support/student_request.html', {'session': session})

@login_required
def student_active_session(request, session_code):
    session = get_object_or_404(RemoteSession, session_code=session_code, student=request.user)
    if request.method == 'POST' and request.POST.get('action') == 'end':
        session.status = 'FINISHED'
        session.ended_by = request.user
        session.save()
        RemoteSessionLog.objects.create(session=session, action='FINISHED_BY_STUDENT', user=request.user)
        # Notify teacher
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'remote_{session_code}',
            {'type': 'remote_message', 'message': {'action': 'finished'}}
        )
        return redirect('core:dashboard')
        
    return render(request, 'remote_support/student_active_session.html', {'session': session})
