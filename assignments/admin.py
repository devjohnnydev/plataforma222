from django.contrib import admin
from .models import Assignment, Submission, Grade

class SubmissionInline(admin.TabularInline):
    model = Submission
    extra = 0
    readonly_fields = ('submitted_at',)

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'target_class', 'max_score', 'due_date', 'created_at')
    list_filter = ('target_class__course',)
    search_fields = ('title',)
    inlines = [SubmissionInline]
    ordering = ('-created_at',)

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('student', 'assignment', 'submitted_at')
    list_filter = ('assignment__target_class',)
    search_fields = ('student__username', 'assignment__title')
    ordering = ('-submitted_at',)

@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ('submission', 'score', 'graded_by', 'graded_at')
    list_filter = ('graded_by',)
    ordering = ('-graded_at',)

