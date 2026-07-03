from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', verbose_name='Destinatário')
    title = models.CharField(max_length=255, verbose_name='Título')
    message = models.TextField(verbose_name='Mensagem')
    is_read = models.BooleanField(default=False, verbose_name='Lida')
    created_at = models.DateTimeField(auto_now_add=True)
    notification_type = models.CharField(max_length=50, blank=True, null=True, verbose_name='Tipo')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'

    def __str__(self):
        return f"{self.title} para {self.recipient.username}"
