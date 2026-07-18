from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_active', 'get_user_classes', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    readonly_fields = ('get_user_classes',)
    
    fieldsets = (
        ('Dados Pessoais', {'fields': ('username', 'email', 'first_name', 'last_name', 'password')}),
        ('Perfil', {'fields': ('role', 'profile_picture', 'bio', 'mood', 'points', 'is_promoted_teacher')}),
        ('Turmas do Usuário', {'fields': ('get_user_classes',)}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'approved_by_admin')}),
    )

    def get_user_classes(self, obj):
        if obj.role == 'TEACHER':
            classes = obj.teaching_classes.all()
            if classes.exists():
                return ", ".join([c.name for c in classes])
        elif obj.role == 'STUDENT':
            enrollments = obj.enrollments.all()
            if enrollments.exists():
                return ", ".join([e.enrolled_class.name for e in enrollments])
        return "Nenhuma"

    get_user_classes.short_description = "Turmas Associadas"

