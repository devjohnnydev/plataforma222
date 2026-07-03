from django.db import models
from django.conf import settings
from django.utils.text import slugify
import uuid

User = settings.AUTH_USER_MODEL


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, default='bi-folder', help_text='Bootstrap Icon class')
    color = models.CharField(max_length=7, default='#6c757d')

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Course(models.Model):
    class Level(models.TextChoices):
        BEGINNER = 'BEGINNER', 'Iniciante'
        INTERMEDIATE = 'INTERMEDIATE', 'Intermediário'
        ADVANCED = 'ADVANCED', 'Avançado'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Rascunho'
        PUBLISHED = 'PUBLISHED', 'Publicado'
        ARCHIVED = 'ARCHIVED', 'Arquivado'

    title = models.CharField(max_length=255, verbose_name='Título')
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True, null=True, verbose_name='Descrição')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='courses', verbose_name='Categoria')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_courses', verbose_name='Professor')
    level = models.CharField(max_length=15, choices=Level.choices, default=Level.BEGINNER, verbose_name='Nível')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, verbose_name='Status')
    workload_hours = models.PositiveIntegerField(default=0, verbose_name='Carga Horária (h)')
    cover_image = models.ImageField(upload_to='courses/covers/', blank=True, null=True, verbose_name='Imagem de Capa')
    banner_image = models.ImageField(upload_to='courses/banners/', blank=True, null=True, verbose_name='Banner')
    prerequisites = models.TextField(blank=True, null=True, verbose_name='Pré-requisitos')
    start_date = models.DateField(blank=True, null=True, verbose_name='Data de Início')
    end_date = models.DateField(blank=True, null=True, verbose_name='Data de Término')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)
            slug = base
            counter = 1
            while Course.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    @property
    def module_count(self):
        return self.modules.count()

    @property
    def lesson_count(self):
        return sum(m.lessons.count() for m in self.modules.all())


class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules', verbose_name='Curso')
    title = models.CharField(max_length=255, verbose_name='Título')
    description = models.TextField(blank=True, null=True, verbose_name='Descrição')
    order = models.PositiveIntegerField(default=0, verbose_name='Ordem')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} — {self.title}"


class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons', null=True, blank=True, verbose_name='Módulo')
    target_class = models.ForeignKey('classes.Class', on_delete=models.CASCADE, related_name='lessons', null=True, blank=True, verbose_name='Turma')
    title = models.CharField(max_length=255, verbose_name='Título')
    content = models.TextField(blank=True, null=True, verbose_name='Conteúdo')
    order = models.PositiveIntegerField(default=0, verbose_name='Ordem')
    duration_minutes = models.PositiveIntegerField(default=0, verbose_name='Duração (min)')
    is_published = models.BooleanField(default=False, verbose_name='Publicada')
    publish_date = models.DateField(blank=True, null=True, verbose_name='Data de Publicação')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        if self.module:
            return f"{self.module.title} — {self.title}"
        elif self.target_class:
            return f"{self.target_class.name} — {self.title}"
        return self.title


class Material(models.Model):
    class MaterialType(models.TextChoices):
        VIDEO = 'VIDEO', 'Vídeo'
        PDF = 'PDF', 'PDF'
        LINK = 'LINK', 'Link Externo'
        FILE = 'FILE', 'Arquivo'
        SLIDE = 'SLIDE', 'Slides'
        AUDIO = 'AUDIO', 'Áudio'

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='materials', null=True, blank=True, verbose_name='Aula')
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='materials', null=True, blank=True, verbose_name='Módulo')
    title = models.CharField(max_length=255, verbose_name='Título')
    material_type = models.CharField(max_length=10, choices=MaterialType.choices, default=MaterialType.FILE, verbose_name='Tipo')
    file = models.FileField(upload_to='materials/', blank=True, null=True, verbose_name='Arquivo')
    url = models.URLField(max_length=1024, blank=True, null=True, verbose_name='URL')
    description = models.TextField(blank=True, null=True, verbose_name='Descrição')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    @property
    def icon(self):
        icons = {
            'VIDEO': 'bi-play-circle-fill text-danger',
            'PDF': 'bi-file-earmark-pdf-fill text-danger',
            'LINK': 'bi-link-45deg text-primary',
            'FILE': 'bi-file-earmark-fill text-secondary',
            'SLIDE': 'bi-file-earmark-slides-fill text-warning',
            'AUDIO': 'bi-music-note-beamed text-success',
        }
        return icons.get(self.material_type, 'bi-file')


class Certificate(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates', verbose_name='Aluno')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates', verbose_name='Curso')
    unique_id = models.CharField(max_length=100, unique=True, default=uuid.uuid4, verbose_name='Código Único')
    qr_code = models.ImageField(upload_to='certificates/qr/', blank=True, null=True, verbose_name='QR Code')
    completion_date = models.DateTimeField(auto_now_add=True, verbose_name='Data de Conclusão')
    workload_hours = models.PositiveIntegerField(default=0, verbose_name='Carga Horária')

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"Certificado {self.unique_id} — {self.student.get_full_name() or self.student.username}"

    @property
    def verification_url(self):
        return f"/certificado/{self.unique_id}/"

