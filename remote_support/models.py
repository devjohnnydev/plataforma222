import uuid
from django.db import models
from django.conf import settings
from classes.models import Class

class RemoteSession(models.Model):
    STATUS_CHOICES = [
        ('WAITING', 'Aguardando'),
        ('AUTHORIZED', 'Autorizado'),
        ('CONNECTING', 'Conectando'),
        ('CONNECTED', 'Conectado'),
        ('FINISHED', 'Finalizado'),
        ('REJECTED', 'Recusado'),
        ('EXPIRED', 'Expirado'),
        ('CANCELLED', 'Cancelado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_code = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='teaching_remote_sessions', on_delete=models.CASCADE)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='remote_sessions', on_delete=models.CASCADE)
    classroom = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='WAITING')
    
    # Permissions
    request_screen_sharing = models.BooleanField(default=True)
    request_control = models.BooleanField(default=False)
    
    # Timestamps
    requested_at = models.DateTimeField(auto_now_add=True)
    authorized_at = models.DateTimeField(null=True, blank=True)
    connected_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    ended_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='ended_remote_sessions', null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"Remote Session {self.session_code} - {self.student.username}"

class RemoteSessionLog(models.Model):
    session = models.ForeignKey(RemoteSession, on_delete=models.CASCADE, related_name='logs')
    action = models.CharField(max_length=100)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.action} on {self.session.session_code} at {self.timestamp}"
