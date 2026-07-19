import uuid
import string
import random
from django.db import models
from django.conf import settings
from courses.models import Course, Module, Lesson

User = settings.AUTH_USER_MODEL


def generate_join_code():
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=8))


class Class(models.Model):
    name = models.CharField(max_length=255, verbose_name='Nome da Turma')
    description = models.TextField(blank=True, null=True, verbose_name='Descrição')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='classes', verbose_name='Curso')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='teaching_classes', verbose_name='Professor')
    join_code = models.CharField(max_length=20, unique=True, default=generate_join_code, verbose_name='Código de Acesso')
    color = models.CharField(max_length=7, default='#4285f4', verbose_name='Cor da Turma')
    banner_image = models.ImageField(upload_to='banners/', blank=True, null=True, verbose_name='Imagem de Banner')
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    checkin_open = models.BooleanField(default=False, verbose_name='Check-in Liberado')
    checkin_opened_at = models.DateTimeField(blank=True, null=True, verbose_name='Check-in Aberto Em')
    created_at = models.DateTimeField(auto_now_add=True)
    start_date = models.DateField(blank=True, null=True, verbose_name='Data de Início')
    total_hours = models.PositiveIntegerField(blank=True, null=True, verbose_name='Carga Horária Total (horas)')
    hours_per_day = models.PositiveIntegerField(blank=True, null=True, verbose_name='Horas por Dia')
    days_of_week = models.CharField(max_length=50, blank=True, null=True, verbose_name='Dias da Semana (0=Seg, 1=Ter, etc.)')

    @property
    def is_checkin_currently_open(self):
        if not self.checkin_open:
            return False
        if not self.checkin_opened_at:
            return False
        from django.utils import timezone
        from datetime import timedelta
        if timezone.now() - self.checkin_opened_at > timedelta(minutes=30):
            # Auto-close it
            self.checkin_open = False
            self.save(update_fields=['checkin_open'])
            return False
        return True

    @property
    def checkin_remaining_minutes(self):
        if not self.is_checkin_currently_open:
            return 0
        from django.utils import timezone
        from datetime import timedelta
        elapsed = timezone.now() - self.checkin_opened_at
        remaining = timedelta(minutes=30) - elapsed
        return max(0, int(remaining.total_seconds() / 60))

    class Meta:
        verbose_name = 'Turma'
        verbose_name_plural = 'Turmas'
        ordering = ['-created_at']

    def __str__(self):
        if self.course:
            return f"{self.name} ({self.course.title})"
        return self.name

    @property
    def student_count(self):
        return self.enrollments.filter(status='ACTIVE').count()


class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments', verbose_name='Aluno')
    enrolled_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='enrollments', verbose_name='Turma')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=[('ACTIVE', 'Ativo'), ('DROPPED', 'Desistente'), ('COMPLETED', 'Concluído')],
        default='ACTIVE',
        verbose_name='Status'
    )

    class Meta:
        unique_together = ('student', 'enrolled_class')
        verbose_name = 'Matrícula'
        verbose_name_plural = 'Matrículas'

    def __str__(self):
        return f"{self.student.username} em {self.enrolled_class.name}"


class StreamPost(models.Model):
    class PostType(models.TextChoices):
        ANNOUNCEMENT = 'ANNOUNCEMENT', 'Aviso'
        MATERIAL = 'MATERIAL', 'Material'
        ASSIGNMENT = 'ASSIGNMENT', 'Atividade'
        MEETING = 'MEETING', 'Reunião'

    target_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='stream_posts', verbose_name='Turma')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stream_posts', verbose_name='Autor')
    content = models.TextField(verbose_name='Conteúdo')
    post_type = models.CharField(max_length=20, choices=PostType.choices, default=PostType.ANNOUNCEMENT, verbose_name='Tipo')
    attachment = models.FileField(upload_to='stream/attachments/', blank=True, null=True, verbose_name='Anexo')
    link_url = models.URLField(max_length=1024, blank=True, null=True, verbose_name='Link')
    folder = models.ForeignKey('courses.MaterialFolder', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Pasta Anexada')
    is_pinned = models.BooleanField(default=False, verbose_name='Fixado')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        verbose_name = 'Post do Mural'
        verbose_name_plural = 'Posts do Mural'

    def __str__(self):
        return f"Post de {self.author.username} em {self.target_class.name}"


class StreamComment(models.Model):
    post = models.ForeignKey(StreamPost, on_delete=models.CASCADE, related_name='comments', verbose_name='Post')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stream_comments', verbose_name='Autor')
    content = models.TextField(verbose_name='Comentário')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Comentário'
        verbose_name_plural = 'Comentários'

    def __str__(self):
        return f"Comentário de {self.author.username}"


class CalendarEvent(models.Model):
    class EventType(models.TextChoices):
        CLASS = 'CLASS', 'Aula'
        ASSIGNMENT = 'ASSIGNMENT', 'Entrega de Atividade'
        EXAM = 'EXAM', 'Avaliação'
        MEETING = 'MEETING', 'Reunião'
        OTHER = 'OTHER', 'Outro'

    target_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='events', verbose_name='Turma')
    title = models.CharField(max_length=255, verbose_name='Título')
    description = models.TextField(blank=True, null=True, verbose_name='Descrição')
    event_type = models.CharField(max_length=15, choices=EventType.choices, default=EventType.CLASS, verbose_name='Tipo')
    start_datetime = models.DateTimeField(verbose_name='Início')
    end_datetime = models.DateTimeField(blank=True, null=True, verbose_name='Término')
    meeting_url = models.URLField(blank=True, null=True, verbose_name='Link da Reunião')
    color = models.CharField(max_length=7, default='#4285f4')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events', verbose_name='Criado por')

    class Meta:
        ordering = ['start_datetime']
        verbose_name = 'Evento'
        verbose_name_plural = 'Eventos'

    def __str__(self):
        return f"{self.title} — {self.target_class.name}"


class Attendance(models.Model):
    enrolled_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='attendances', verbose_name='Turma')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendances', verbose_name='Aluno')
    event = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE, related_name='attendances', null=True, blank=True, verbose_name='Aula/Evento')
    date = models.DateField(verbose_name='Data')
    present = models.BooleanField(default=False, verbose_name='Presente')
    justified = models.BooleanField(default=False, verbose_name='Justificado')
    note = models.CharField(max_length=255, blank=True, null=True, verbose_name='Observação')

    class Meta:
        unique_together = ('enrolled_class', 'student', 'date')
        verbose_name = 'Presença'
        verbose_name_plural = 'Presenças'

    def __str__(self):
        status = "✓" if self.present else "✗"
        return f"{status} {self.student.username} — {self.date}"


class LessonSubmission(models.Model):
    lesson = models.ForeignKey('courses.Lesson', on_delete=models.CASCADE, related_name='lesson_submissions', verbose_name='Aula')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_submissions', verbose_name='Aluno')
    file = models.FileField(upload_to='lesson_submissions/', blank=True, null=True, verbose_name='Arquivo')
    text_content = models.TextField(blank=True, null=True, verbose_name='Conteúdo de Texto')
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('lesson', 'student')
        verbose_name = 'Entrega de Aula'
        verbose_name_plural = 'Entregas de Aula'

    def __str__(self):
        return f"Entrega de {self.student.username} para {self.lesson.title}"


class LessonComment(models.Model):
    lesson = models.ForeignKey('courses.Lesson', on_delete=models.CASCADE, related_name='lesson_comments', verbose_name='Aula')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_comments', verbose_name='Autor')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_private_comments', null=True, blank=True, verbose_name='Aluno do Chat Privado')
    content = models.TextField(verbose_name='Conteúdo')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Comentário da Aula'
        verbose_name_plural = 'Comentários da Aula'

    def __str__(self):
        return f"Comentário de {self.author.username} em {self.lesson.title}"


class ClassNote(models.Model):
    target_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='notes', verbose_name='Turma')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='class_notes', verbose_name='Autor')
    date = models.DateField(verbose_name='Data')
    content = models.TextField(verbose_name='Anotação / Lembrete')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', '-created_at']
        verbose_name = 'Anotação da Turma'
        verbose_name_plural = 'Anotações da Turma'

    def __str__(self):
        return f"Anotação em {self.date} para {self.target_class.name}"


