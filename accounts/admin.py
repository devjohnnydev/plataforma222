from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    fieldsets = (
        ('Dados Pessoais', {'fields': ('username', 'email', 'first_name', 'last_name', 'password')}),
        ('Perfil', {'fields': ('role', 'profile_picture', 'bio', 'mood', 'points')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'approved_by_admin')}),
    )

