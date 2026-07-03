from django.contrib import admin
from .models import Course, Module, Lesson, Material, Certificate

class ModuleInline(admin.TabularInline):
    model = Module
    extra = 1
    ordering = ['order']

class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1
    ordering = ['order']

class MaterialInline(admin.TabularInline):
    model = Material
    extra = 1

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'teacher', 'created_at')
    list_filter = ('teacher',)
    search_fields = ('title', 'description')
    inlines = [ModuleInline]
    ordering = ('-created_at',)

@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order')
    list_filter = ('course',)
    inlines = [LessonInline]
    ordering = ['course', 'order']

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'order')
    list_filter = ('module__course',)
    inlines = [MaterialInline]
    ordering = ['module', 'order']

@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('title', 'material_type', 'lesson', 'module', 'created_at')
    list_filter = ('material_type',)
    search_fields = ('title',)

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('unique_id', 'student', 'course', 'completion_date', 'workload_hours')
    list_filter = ('course',)
    search_fields = ('unique_id', 'student__username')
    ordering = ('-completion_date',)

