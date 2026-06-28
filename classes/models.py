import uuid
from django.db import models
from django.conf import settings
from courses.models import Course

User = settings.AUTH_USER_MODEL

class Class(models.Model):
    name = models.CharField(max_length=255)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='classes')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='teaching_classes')
    join_code = models.CharField(max_length=20, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.course.title})"

class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('ACTIVE', 'Active'), ('DROPPED', 'Dropped')], default='ACTIVE')

    class Meta:
        unique_together = ('student', 'enrolled_class')

    def __str__(self):
        return f"{self.student.username} in {self.enrolled_class.name}"

class StreamPost(models.Model):
    class PostType(models.TextChoices):
        ANNOUNCEMENT = 'ANNOUNCEMENT', 'Announcement'
        MATERIAL = 'MATERIAL', 'Material Alert'
        ASSIGNMENT = 'ASSIGNMENT', 'Assignment Alert'

    target_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='stream_posts')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stream_posts')
    content = models.TextField()
    post_type = models.CharField(max_length=20, choices=PostType.choices, default=PostType.ANNOUNCEMENT)
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"Post by {self.author.username} in {self.target_class.name}"

class StreamComment(models.Model):
    post = models.ForeignKey(StreamPost, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stream_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author.username}"
