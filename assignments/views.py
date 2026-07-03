from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_POST
from django.utils import timezone

from .models import Assignment, Submission, Grade
from classes.models import Class, Enrollment


# ── Assignment Detail ─────────────────────────────────────────────────────────

@login_required
def assignment_detail_view(request, pk):
    assignment = get_object_or_404(Assignment, pk=pk)
    cls = assignment.target_class

    # Access check
    _check_class_access(request.user, cls)

    context = {
        'assignment': assignment,
        'cls': cls,
    }

    if request.user.is_student():
        submission = Submission.objects.filter(
            assignment=assignment, student=request.user
        ).first()
        context['submission'] = submission

    elif request.user.is_teacher() or request.user.is_superadmin():
        submissions = assignment.submissions.select_related('student').prefetch_related('grade')
        context['submissions'] = submissions
        total = assignment.target_class.enrollments.filter(status='ACTIVE').count()
        context['total_enrolled'] = total
        context['submission_count'] = submissions.count()
        context['pending_count'] = submissions.filter(grade__isnull=True).count()

    return render(request, 'assignments/assignment_detail.html', context)


# ── Create Assignment (Teacher) ───────────────────────────────────────────────

@login_required
def create_assignment_view(request, class_pk):
    cls = get_object_or_404(Class, pk=class_pk)

    if not (request.user == cls.teacher or request.user.is_superadmin()):
        messages.error(request, 'Apenas o professor da turma pode criar atividades.')
        return redirect('classes:detail', pk=class_pk)

    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        description = request.POST.get('description', '').strip()
        assignment_type = request.POST.get('assignment_type', 'EXERCISE')
        max_score = request.POST.get('max_score', '10.00')
        due_date_str = request.POST.get('due_date', '')
        allow_late = request.POST.get('allow_late') == 'on'

        if not title:
            messages.error(request, 'O título da atividade é obrigatório.')
        else:
            from django.utils.dateparse import parse_datetime
            due_date = parse_datetime(due_date_str) if due_date_str else None
            assignment = Assignment.objects.create(
                target_class=cls,
                title=title,
                description=description,
                assignment_type=assignment_type,
                max_score=max_score,
                due_date=due_date,
                allow_late=allow_late,
            )
            from notifications.utils import send_notification
            for enrollment in cls.enrollments.filter(status='ACTIVE').select_related('student'):
                send_notification(
                    recipient=enrollment.student,
                    title=f"Nova Atividade: {assignment.title}",
                    message=f"Uma nova atividade foi publicada na turma {cls.name}.",
                    notification_type="NEW_ASSIGNMENT"
                )
            messages.success(request, f'Atividade "{title}" criada com sucesso!')
            return redirect('classes:classwork', pk=class_pk)

    context = {
        'cls': cls,
        'assignment_types': Assignment.AssignmentType.choices,
    }
    return render(request, 'assignments/assignment_form.html', context)


# ── Submit Assignment (Student) ───────────────────────────────────────────────

@login_required
@require_POST
def submit_assignment_view(request, pk):
    assignment = get_object_or_404(Assignment, pk=pk)
    cls = assignment.target_class

    if not request.user.is_student():
        messages.error(request, 'Apenas alunos podem entregar atividades.')
        return redirect('assignments:detail', pk=pk)

    if not Enrollment.objects.filter(student=request.user, enrolled_class=cls, status='ACTIVE').exists():
        messages.error(request, 'Você não está matriculado nesta turma.')
        return redirect('core:home')

    # Check if overdue and late submissions are not allowed
    if assignment.is_overdue and not assignment.allow_late:
        messages.error(request, 'O prazo para esta atividade já encerrou.')
        return redirect('assignments:detail', pk=pk)

    content = request.POST.get('content', '').strip()
    file = request.FILES.get('file')

    submission, created = Submission.objects.get_or_create(
        assignment=assignment,
        student=request.user,
        defaults={'content': content}
    )

    if not created:
        submission.content = content
        if file:
            submission.file = file
        submission.save()
        messages.success(request, 'Entrega atualizada com sucesso!')
    else:
        if file:
            submission.file = file
            submission.save()
        messages.success(request, 'Atividade entregue com sucesso!')

    from notifications.utils import send_notification
    send_notification(
        recipient=cls.teacher,
        title=f"Nova entrega: {assignment.title}",
        message=f"O aluno {request.user.get_full_name() or request.user.username} entregou a atividade '{assignment.title}'.",
        notification_type="NEW_SUBMISSION"
    )

    return redirect('assignments:detail', pk=pk)


# ── Grade Submission (Teacher) ────────────────────────────────────────────────

@login_required
@require_POST
def grade_submission_view(request, pk):
    submission = get_object_or_404(Submission, pk=pk)
    cls = submission.assignment.target_class

    if not (request.user == cls.teacher or request.user.is_superadmin()):
        messages.error(request, 'Apenas o professor pode corrigir entregas.')
        return redirect('assignments:detail', pk=submission.assignment.pk)

    score = request.POST.get('score')
    feedback = request.POST.get('feedback', '').strip()

    if score is None:
        messages.error(request, 'A nota é obrigatória.')
    else:
        Grade.objects.update_or_create(
            submission=submission,
            defaults={
                'score': score,
                'feedback': feedback,
                'graded_by': request.user,
            }
        )
        from notifications.utils import send_notification
        send_notification(
            recipient=submission.student,
            title=f"Atividade Corrigida: {submission.assignment.title}",
            message=f"Sua entrega para a atividade '{submission.assignment.title}' foi corrigida. Nota: {score}.",
            notification_type="ASSIGNMENT_GRADED"
        )
        messages.success(request, f'Nota {score} atribuída com sucesso!')

    return redirect('assignments:detail', pk=submission.assignment.pk)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _check_class_access(user, cls):
    from django.http import Http404
    if user.is_superadmin():
        return
    if user.is_teacher() and cls.teacher == user:
        return
    if user.is_student():
        if Enrollment.objects.filter(student=user, enrolled_class=cls, status='ACTIVE').exists():
            return
    raise Http404("Acesso negado.")
