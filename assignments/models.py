import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from classes.models import Class

User = settings.AUTH_USER_MODEL


class Assignment(models.Model):
    class AssignmentType(models.TextChoices):
        EXERCISE = 'EXERCISE', 'Exercício'
        PROJECT = 'PROJECT', 'Projeto'
        QUIZ = 'QUIZ', 'Questionário'
        EXAM = 'EXAM', 'Avaliação'
        WORK = 'WORK', 'Trabalho'

    target_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='assignments', verbose_name='Turma')
    title = models.CharField(max_length=255, verbose_name='Título')
    description = models.TextField(blank=True, null=True, verbose_name='Descrição')
    assignment_type = models.CharField(max_length=10, choices=AssignmentType.choices, default=AssignmentType.EXERCISE, verbose_name='Tipo')
    max_score = models.DecimalField(max_digits=5, decimal_places=2, default=10.00, verbose_name='Nota Máxima')
    weight = models.DecimalField(max_digits=4, decimal_places=2, default=1.00, verbose_name='Peso')
    rubric = models.TextField(blank=True, null=True, verbose_name='Rubrica de Avaliação')
    attachment = models.FileField(upload_to='assignments/attachments/', blank=True, null=True, verbose_name='Anexo')
    due_date = models.DateTimeField(blank=True, null=True, verbose_name='Data de Entrega')
    allow_late = models.BooleanField(default=False, verbose_name='Aceitar Entrega Atrasada')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['due_date', '-created_at']
        verbose_name = 'Atividade'
        verbose_name_plural = 'Atividades'

    def __str__(self):
        return f"{self.title} — {self.target_class.name}"

    @property
    def is_overdue(self):
        return self.due_date and timezone.now() > self.due_date

    @property
    def submission_count(self):
        return self.submissions.count()

    @property
    def pending_count(self):
        return self.submissions.filter(grade__isnull=True).count()


class Submission(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions', verbose_name='Atividade')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submissions', verbose_name='Aluno')
    content = models.TextField(blank=True, null=True, verbose_name='Resposta')
    file = models.FileField(upload_to='submissions/', blank=True, null=True, verbose_name='Arquivo')
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_late = models.BooleanField(default=False, verbose_name='Entrega Atrasada')
    return_requested = models.BooleanField(default=False, verbose_name='Devolução Solicitada')
    return_comment = models.TextField(blank=True, null=True, verbose_name='Comentário de Devolução')
    teacher_comment = models.TextField(blank=True, null=True, verbose_name='Comentário do Professor')

    class Meta:
        unique_together = ('assignment', 'student')
        verbose_name = 'Entrega'
        verbose_name_plural = 'Entregas'

    def __str__(self):
        return f"{self.student.username} — {self.assignment.title}"

    @property
    def has_grade(self):
        return hasattr(self, 'grade')

    def save(self, *args, **kwargs):
        if self.assignment.due_date and timezone.now() > self.assignment.due_date:
            self.is_late = True
        super().save(*args, **kwargs)


class Grade(models.Model):
    submission = models.OneToOneField(Submission, on_delete=models.CASCADE, related_name='grade', verbose_name='Entrega')
    score = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Nota')
    feedback = models.TextField(blank=True, null=True, verbose_name='Feedback')
    graded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='given_grades', verbose_name='Corrigido por')
    graded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.score} — {self.submission}"
