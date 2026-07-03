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


def copy_course_lessons_to_class(course, target_class):
    """Copies all lessons and support materials from a Course to a target Class."""
    if not course:
        return
    from courses.models import Lesson, Material
    # Get all lessons from modules of the course
    course_lessons = Lesson.objects.filter(module__course=course).order_by('module__order', 'order')
    for order_idx, cl in enumerate(course_lessons, start=1):
        # Create a new lesson linked to the target class
        new_lesson = Lesson.objects.create(
            target_class=target_class,
            title=cl.title,
            content=cl.content,
            order=order_idx,
            duration_minutes=cl.duration_minutes,
            is_published=False,  # Keep it draft so the teacher can publish it when ready
        )
        # Copy materials
        for mat in cl.materials.all():
            Material.objects.create(
                lesson=new_lesson,
                title=mat.title,
                material_type=mat.material_type,
                file=mat.file,
                url=mat.url,
                description=mat.description
            )


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
        banner_image = request.FILES.get('banner_image')

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
                banner_image=banner_image,
            )
            if course:
                copy_course_lessons_to_class(course, new_class)
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
    link_url = request.POST.get('link_url', '').strip()
    attachment = request.FILES.get('attachment')

    if not content:
        return HttpResponse(status=400)

    post = StreamPost.objects.create(
        target_class=cls,
        author=request.user,
        content=content,
        post_type=post_type,
        link_url=link_url or None,
        attachment=attachment or None,
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


from django.utils import timezone

@login_required
def class_lessons_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    _check_access(request.user, cls)

    # Get lessons
    if request.user.is_teacher() or request.user.is_superadmin():
        lessons = cls.lessons.all().order_by('order', 'created_at')
    else:
        lessons = cls.lessons.filter(is_published=True).order_by('order', 'created_at')

    total_lessons = cls.lessons.count()
    published_lessons = cls.lessons.filter(is_published=True).count()
    progress_percent = int((published_lessons / total_lessons) * 100) if total_lessons > 0 else 0

    # Retrieve student submissions
    user_submissions = {}
    if request.user.is_student():
        from .models import LessonSubmission
        subs = LessonSubmission.objects.filter(student=request.user, lesson__in=lessons)
        user_submissions = {s.lesson_id: s for s in subs}

    enrollments = cls.enrollments.filter(status='ACTIVE').select_related('student')
    
    # Pre-fetch comments and submissions for lessons to be displayable
    # We can handle comments in template logic.
    from courses.models import Material
    material_types = Material.MaterialType.choices

    context = {
        'cls': cls,
        'lessons': lessons,
        'total_lessons': total_lessons,
        'published_lessons': published_lessons,
        'progress_percent': progress_percent,
        'user_submissions': user_submissions,
        'enrollments': enrollments,
        'active_tab': 'lessons',
        'material_types': material_types,
    }
    return render(request, 'classes/class_detail.html', context)


@login_required
@require_POST
def create_class_lesson_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    if not (request.user == cls.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    title = request.POST.get('title', '').strip()
    content = request.POST.get('content', '').strip()
    is_published = request.POST.get('is_published') == 'on'
    publish_date_str = request.POST.get('publish_date', '')

    from django.utils.dateparse import parse_date
    publish_date = parse_date(publish_date_str) if publish_date_str else None

    # If is_published is set, make sure publish_date is set to today if not provided
    if is_published and not publish_date:
        publish_date = timezone.now().date()

    if title:
        from courses.models import Lesson
        max_order = cls.lessons.count()
        lesson = Lesson.objects.create(
            target_class=cls,
            title=title,
            content=content,
            is_published=is_published,
            publish_date=publish_date,
            order=max_order + 1
        )
        if is_published:
            from notifications.utils import send_notification
            for enrollment in cls.enrollments.filter(status='ACTIVE').select_related('student'):
                send_notification(
                    recipient=enrollment.student,
                    title=f"Nova Aula: {lesson.title}",
                    message=f"Uma nova aula foi postada na turma {cls.name}.",
                    notification_type="NEW_LESSON"
                )
        messages.success(request, 'Aula adicionada com sucesso.')
    else:
        messages.error(request, 'O título da aula é obrigatório.')

    return redirect('classes:lessons', pk=pk)


@login_required
@require_POST
def publish_class_lesson_view(request, pk, lesson_pk):
    cls = get_object_or_404(Class, pk=pk)
    if not (request.user == cls.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    from courses.models import Lesson
    lesson = get_object_or_404(Lesson, pk=lesson_pk, target_class=cls)
    lesson.is_published = True
    lesson.publish_date = timezone.now().date()
    lesson.save()

    from notifications.utils import send_notification
    for enrollment in cls.enrollments.filter(status='ACTIVE').select_related('student'):
        send_notification(
            recipient=enrollment.student,
            title=f"Nova Aula: {lesson.title}",
            message=f"Uma nova aula foi publicada na turma {cls.name}.",
            notification_type="NEW_LESSON"
        )

    messages.success(request, f'Aula "{lesson.title}" publicada com sucesso!')
    return redirect('classes:lessons', pk=pk)


@login_required
@require_POST
def add_lesson_material_view(request, pk, lesson_pk):
    cls = get_object_or_404(Class, pk=pk)
    if not (request.user == cls.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    from courses.models import Lesson, Material
    lesson = get_object_or_404(Lesson, pk=lesson_pk, target_class=cls)

    title = request.POST.get('title', '').strip()
    material_type = request.POST.get('material_type', 'FILE')
    url = request.POST.get('url', '').strip()
    file = request.FILES.get('file')

    if title:
        Material.objects.create(
            lesson=lesson,
            title=title,
            material_type=material_type,
            url=url,
            file=file
        )
        messages.success(request, 'Material anexado com sucesso.')
    else:
        messages.error(request, 'O título do material é obrigatório.')

    return redirect('classes:lessons', pk=pk)


@login_required
@require_POST
def submit_lesson_material_view(request, pk, lesson_pk):
    cls = get_object_or_404(Class, pk=pk)
    _check_access(request.user, cls)

    if not request.user.is_student():
        messages.error(request, 'Apenas alunos podem devolver material.')
        return redirect('classes:lessons', pk=pk)

    from courses.models import Lesson
    lesson = get_object_or_404(Lesson, pk=lesson_pk, target_class=cls, is_published=True)

    text_content = request.POST.get('text_content', '').strip()
    file = request.FILES.get('file')

    from .models import LessonSubmission
    submission, created = LessonSubmission.objects.update_or_create(
        lesson=lesson,
        student=request.user,
        defaults={
            'text_content': text_content,
        }
    )
    if file:
        submission.file = file
        submission.save()

    messages.success(request, 'Material devolvido com sucesso!')
    return redirect('classes:lessons', pk=pk)


@login_required
@require_POST
def comment_lesson_view(request, pk, lesson_pk):
    cls = get_object_or_404(Class, pk=pk)
    _check_access(request.user, cls)

    from courses.models import Lesson
    if request.user.is_student():
        lesson = get_object_or_404(Lesson, pk=lesson_pk, target_class=cls, is_published=True)
        student_target = request.user
    else:
        lesson = get_object_or_404(Lesson, pk=lesson_pk, target_class=cls)
        student_pk = request.POST.get('student_pk')
        from accounts.models import User
        student_target = get_object_or_404(User, pk=student_pk)

    content = request.POST.get('content', '').strip()
    if content:
        from .models import LessonComment
        LessonComment.objects.create(
            lesson=lesson,
            author=request.user,
            student=student_target,
            content=content
        )
        messages.success(request, 'Comentário enviado.')
    else:
        messages.error(request, 'O comentário não pode ser vazio.')

    return redirect('classes:lessons', pk=pk)


@login_required
def class_grades_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    _check_access(request.user, cls)

    from assignments.models import Assignment, Submission, Grade

    assignments = cls.assignments.all().order_by('created_at')

    if request.user.is_teacher() or request.user.is_superadmin():
        enrollments = cls.enrollments.filter(status='ACTIVE').select_related('student')
        student_grades = []

        for enrollment in enrollments:
            student = enrollment.student
            grades_dict = {}
            total_weighted_score = 0
            total_weight = 0

            submissions = Submission.objects.filter(assignment__target_class=cls, student=student).select_related('grade')
            sub_map = {sub.assignment_id: sub for sub in submissions}

            for assignment in assignments:
                sub = sub_map.get(assignment.pk)
                score = None
                if sub and hasattr(sub, 'grade'):
                    score = sub.grade.score
                    total_weighted_score += float(score) * float(assignment.weight)
                    total_weight += float(assignment.weight)
                grades_dict[assignment.pk] = score

            average = round(total_weighted_score / total_weight, 2) if total_weight > 0 else None

            student_grades.append({
                'student': student,
                'grades': grades_dict,
                'average': average
            })

        context = {
            'cls': cls,
            'assignments': assignments,
            'student_grades': student_grades,
            'active_tab': 'grades',
        }
    else:
        # Student view
        submissions = Submission.objects.filter(assignment__target_class=cls, student=request.user).select_related('grade')
        sub_map = {sub.assignment_id: sub for sub in submissions}

        student_records = []
        total_weighted_score = 0
        total_weight = 0

        for assignment in assignments:
            sub = sub_map.get(assignment.pk)
            score = None
            has_grade = False
            if sub and hasattr(sub, 'grade'):
                score = sub.grade.score
                has_grade = True
                total_weighted_score += float(score) * float(assignment.weight)
                total_weight += float(assignment.weight)

            student_records.append({
                'assignment': assignment,
                'submission': sub,
                'score': score,
                'has_grade': has_grade
            })

        average = round(total_weighted_score / total_weight, 2) if total_weight > 0 else None

        context = {
            'cls': cls,
            'student_records': student_records,
            'average': average,
            'active_tab': 'grades',
        }

    return render(request, 'classes/class_detail.html', context)


# ── Class Management Views ───────────────────────────────────────────────────

@login_required
def edit_class_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    if not (request.user == cls.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        description = request.POST.get('description', '').strip()
        color = request.POST.get('color', cls.color)
        banner_image = request.FILES.get('banner_image')

        if name:
            cls.name = name
            cls.description = description
            cls.color = color
            if banner_image:
                cls.banner_image = banner_image
            cls.save()
            messages.success(request, 'Turma atualizada com sucesso.')
        else:
            messages.error(request, 'O nome da turma é obrigatório.')

    return redirect('classes:detail', pk=pk)


@login_required
@require_POST
def delete_class_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    if not (request.user == cls.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    name = cls.name
    cls.delete()
    messages.success(request, f'Turma "{name}" excluída com sucesso.')
    return redirect('core:home')


@login_required
def edit_lesson_view(request, pk, lesson_pk):
    cls = get_object_or_404(Class, pk=pk)
    if not (request.user == cls.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    from courses.models import Lesson
    lesson = get_object_or_404(Lesson, pk=lesson_pk, target_class=cls)

    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        content = request.POST.get('content', '').strip()

        if title:
            lesson.title = title
            lesson.content = content
            lesson.save()
            messages.success(request, 'Aula atualizada com sucesso.')
        else:
            messages.error(request, 'O título da aula é obrigatório.')

    return redirect('classes:lessons', pk=pk)


@login_required
@require_POST
def delete_lesson_view(request, pk, lesson_pk):
    cls = get_object_or_404(Class, pk=pk)
    if not (request.user == cls.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    from courses.models import Lesson
    lesson = get_object_or_404(Lesson, pk=lesson_pk, target_class=cls)
    title = lesson.title
    lesson.delete()
    messages.success(request, f'Aula "{title}" excluída com sucesso.')
    return redirect('classes:lessons', pk=pk)


@login_required
@require_POST
def remove_student_view(request, pk, student_pk):
    cls = get_object_or_404(Class, pk=pk)
    if not (request.user == cls.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    enrollment = get_object_or_404(Enrollment, enrolled_class=cls, student_id=student_pk)
    student_name = enrollment.student.get_full_name() or enrollment.student.username
    enrollment.delete()
    messages.success(request, f'Aluno "{student_name}" removido da turma com sucesso.')
    return redirect('classes:members', pk=pk)


@login_required
@require_POST
def toggle_checkin_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    if not (request.user == cls.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    cls.checkin_open = not cls.checkin_open
    cls.save()

    status_str = "aberto" if cls.checkin_open else "fechado"
    messages.success(request, f'Check-in de presença {status_str} com sucesso.')
    return redirect(request.META.get('HTTP_REFERER', f'/classes/{pk}/'))


@login_required
@require_POST
def student_checkin_view(request, pk):
    cls = get_object_or_404(Class, pk=pk)
    _check_access(request.user, cls)

    if not cls.checkin_open:
        messages.error(request, 'O check-in de presença não está aberto para esta turma no momento.')
        return redirect('classes:detail', pk=pk)

    from .models import Attendance
    today = timezone.now().date()

    attendance, created = Attendance.objects.get_or_create(
        enrolled_class=cls,
        student=request.user,
        date=today,
        defaults={'present': True}
    )
    if not created:
        attendance.present = True
        attendance.save()

    messages.success(request, 'Sua presença foi confirmada com sucesso!')
    return redirect('classes:detail', pk=pk)



