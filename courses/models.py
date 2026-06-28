from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_courses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.module.title} - {self.title}"

class Material(models.Model):
    class MaterialType(models.TextChoices):
        VIDEO = 'VIDEO', 'Video'
        PDF = 'PDF', 'PDF Document'
        LINK = 'LINK', 'External Link'
        FILE = 'FILE', 'Other File'

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='materials', null=True, blank=True)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='materials', null=True, blank=True)
    title = models.CharField(max_length=255)
    material_type = models.CharField(max_length=10, choices=MaterialType.choices, default=MaterialType.FILE)
    file = models.FileField(upload_to='materials/', blank=True, null=True)
    url = models.URLField(max_length=1024, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Certificate(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates')
    unique_id = models.CharField(max_length=100, unique=True)
    qr_code_url = models.URLField(max_length=1024, blank=True, null=True)
    completion_date = models.DateTimeField(auto_now_add=True)
    workload_hours = models.PositiveIntegerField(default=0)
    verification_url = models.URLField(max_length=1024, blank=True, null=True)

    def __str__(self):
        return f"Certificate {self.unique_id} - {self.student.username}"
