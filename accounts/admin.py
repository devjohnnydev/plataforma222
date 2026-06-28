from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'role', 'is_staff', 'is_active', 'approved_by_admin']
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'profile_picture', 'bio', 'approved_by_admin', 'points', 'mood')}),
    )

admin.site.register(User, CustomUserAdmin)
