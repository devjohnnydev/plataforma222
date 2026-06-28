from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse
from django.views.decorators.http import require_POST
from django.db.models import Count, Q

from .models import Class, Enrollment, StreamPost, StreamComment
from courses.models import Course


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_user_classes(user):
    """Return the queryset of Classes visible to the current user."""
    if user.is_teacher() or user.is_superadmin():
        return Class.objects.filter(teacher=user).select_related('course', 'teacher')
    return Class.objects.filter(
        enrollments__student=user,
        enrollments__status='ACTIVE'
    ).select_related('course', 'teacher')


# ── Class List ────────────────────────────────────────────────────────────────

@login_required
def class_list_view(request):
    classes = _get_user_classes(request.user)
    context = {'classes': classes}
    return render(request, 'classes/class_list.html', context)


# ── Create Class (Teacher only) ───────────────────────────────────────────────

@login_required
def create_class_view(request):
    if not (request.user.is_teacher() or request.user.is_superadmin()):
        messages.error(request, 'Apenas professores podem criar turmas.')
        return redirect('core:home')

    courses = Course.objects.filter(teacher=request.user)

    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        description = request.POST.get('description', '').strip()
        course_id = request.POST.get('course')
        color = request.POST.get('color', '#FFE81F')

        if not name:
            messages.error(request, 'O nome da turma é obrigatório.')
        else:
            course = get_object_or_404(Course, pk=course_id, teacher=request.user) if course_id else None
            new_class = Class.objects.create(
                name=name,
                description=description,
                course=course,
                teacher=request.user,
                color=color,
            )
            messages.success(request, f'Turma "{new_class.name}" criada com sucesso! Código: {new_class.join_code}')
            return redirect('classes:detail', pk=new_class.pk)

    colors_list = ['#FFE81F', '#4285f4', '#ea4335', '#34a853', '#9c27b0',
                   '#ff9800', '#00bcd4', '#e91e63', '#607d8b', '#795548']
    context = {'courses': courses, 'colors_list': colors_list}
    return render(request, 'classes/class_form.html', context)


# ── Join Class (Student) ──────────────────────────────────────────────────────

@login_required
@require_POST
def join_class_view(request):
    code = request.POST.get('join_code', '').strip().upper()
    next_url = request.POST.get('next', 'core:home')

    if not code:
        messages.error(request, 'Por favor, insira um código de turma.')
        return redirect(next_url)

    try:
        cls = Class.objects.get(join_code=code, is_active=True)
    except Class.DoesNotExist:
        messages.error(request, f'Código "{code}" inválido ou turma inativa.')
        return redirect(next_url)

    enrollment, created = Enrollment.objects.get_or_create(
        student=request.user,
        enrolled_class=cls,
        defaults={'status': 'ACTIVE'}
    )

    if created:
        messages.success(request, f'Você entrou na turma "{cls.name}"!')
    else:
        if enrollment.status != 'ACTIVE':
            enrollment.status = 'ACTIVE'
            enrollment.save()
            messages.success(request, f'Você voltou para a turma "{cls.name}"!')
        else:
            messages.info(request, f'Você já está matriculado em "{cls.name}".')

    return redirect('classes:detail', pk=cls.pk)


# ── Class Detail — Stream ─────────────────────────────────────────────────────

@login_required
def class_detail_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    _check_access(request.user, cls)

    posts = cls.stream_posts.select_related('author').prefetch_related('comments__author')
    context = {
        'cls': cls,
        'posts': posts,
        'active_tab': 'stream',
    }
    return render(request, 'classes/class_detail.html', context)


# ── Class Detail — Classwork ──────────────────────────────────────────────────

@login_required
def class_classwork_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    _check_access(request.user, cls)

    assignments = cls.assignments.all().order_by('due_date')

    # Attach submission info for students
    user_submissions = {}
    if request.user.is_student():
        from assignments.models import Submission
        subs = Submission.objects.filter(
            assignment__in=assignments,
            student=request.user
        ).select_related('assignment')
        user_submissions = {s.assignment_id: s for s in subs}

    context = {
        'cls': cls,
        'assignments': assignments,
        'user_submissions': user_submissions,
        'active_tab': 'classwork',
    }
    return render(request, 'classes/class_detail.html', context)


# ── Class Detail — Members ────────────────────────────────────────────────────

@login_required
def class_members_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    _check_access(request.user, cls)

    enrollments = cls.enrollments.filter(status='ACTIVE').select_related('student')
    context = {
        'cls': cls,
        'enrollments': enrollments,
        'active_tab': 'members',
    }
    return render(request, 'classes/class_detail.html', context)


# ── Post Announcement (HTMX) ──────────────────────────────────────────────────

@login_required
@require_POST
def post_announcement_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    if not (request.user == cls.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    content = request.POST.get('content', '').strip()
    post_type = request.POST.get('post_type', 'ANNOUNCEMENT')

    if not content:
        return HttpResponse(status=400)

    post = StreamPost.objects.create(
        target_class=cls,
        author=request.user,
        content=content,
        post_type=post_type,
    )

    # If HTMX request, return just the new post partial
    if request.headers.get('HX-Request'):
        return render(request, 'classes/_stream_post.html', {'post': post, 'cls': cls})

    return redirect('classes:detail', pk=pk)


# ── Delete Post ───────────────────────────────────────────────────────────────

@login_required
@require_POST
def delete_post_view(request, pk, post_pk):
    cls = get_object_or_404(Class, pk=pk)
    post = get_object_or_404(StreamPost, pk=post_pk, target_class=cls)

    if request.user == post.author or request.user.is_superadmin():
        post.delete()

    if request.headers.get('HX-Request'):
        return HttpResponse('')

    return redirect('classes:detail', pk=pk)


# ── Access Check ──────────────────────────────────────────────────────────────

def _check_access(user, cls):
    """Raise 404 if user has no access to this class."""
    if user.is_superadmin():
        return
    if user.is_teacher() and cls.teacher == user:
        return
    if user.is_student():
        if Enrollment.objects.filter(student=user, enrolled_class=cls, status='ACTIVE').exists():
            return
    from django.http import Http404
    raise Http404("Acesso negado a esta turma.")
