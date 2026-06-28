from django.contrib import admin
from .models import Class, Enrollment, StreamPost, StreamComment

class EnrollmentInline(admin.TabularInline):
    model = Enrollment
    extra = 0
    readonly_fields = ('enrolled_at',)

class StreamPostInline(admin.TabularInline):
    model = StreamPost
    extra = 0
    readonly_fields = ('created_at',)

@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ('name', 'course', 'teacher', 'join_code', 'is_active', 'created_at')
    list_filter = ('is_active', 'teacher', 'course')
    search_fields = ('name', 'join_code', 'teacher__username')
    readonly_fields = ('join_code',)
    inlines = [EnrollmentInline, StreamPostInline]
    ordering = ('-created_at',)

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'enrolled_class', 'status', 'enrolled_at')
    list_filter = ('status', 'enrolled_class__course')
    search_fields = ('student__username',)

@admin.register(StreamPost)
class StreamPostAdmin(admin.ModelAdmin):
    list_display = ('author', 'target_class', 'post_type', 'is_pinned', 'created_at')
    list_filter = ('post_type', 'is_pinned', 'target_class')

@admin.register(StreamComment)
class StreamCommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'post', 'created_at')
    search_fields = ('author__username', 'content')
