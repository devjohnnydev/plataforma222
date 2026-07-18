from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Super Administrator"
        TEACHER = "TEACHER", "Teacher"
        STUDENT = "STUDENT", "Student"

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    is_promoted_teacher = models.BooleanField(default=False, verbose_name="Promovido a Professor")
    
    # Common profile fields
    profile_picture = models.URLField(max_length=1024, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    
    # Teacher specific fields
    approved_by_admin = models.BooleanField(default=False)
    
    # Student specific fields
    points = models.IntegerField(default=0)
    mood = models.CharField(max_length=50, blank=True, null=True)

    def is_teacher(self):
        return self.role == self.Role.TEACHER

    def is_student(self):
        return self.role == self.Role.STUDENT

    def is_superadmin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

