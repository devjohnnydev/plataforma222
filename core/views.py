import os
import json
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.db.models import Q
from django.contrib import messages
from django.views.decorators.http import require_POST


def home_view(request):
    if request.user.is_authenticated:
        if request.user.is_superadmin():
            return _admin_dashboard(request)
        elif request.user.is_teacher():
            return _teacher_dashboard(request)
        else:
            return _student_dashboard(request)
    
    from courses.models import Course
    from accounts.models import User
    
    # Get published courses for the trainings gallery
    courses = Course.objects.filter(status='PUBLISHED').select_related('teacher')[:6]
    # Get teachers for the teachers carousel
    teachers = User.objects.filter(role='TEACHER').exclude(profile_picture__isnull=True).exclude(profile_picture='')
    if not teachers.exists():
        # Fallback to any teachers if none have profile pictures
        teachers = User.objects.filter(role='TEACHER')
        
    context = {
        'courses': courses,
        'teachers': teachers,
    }
    return render(request, 'core/landing.html', context)


def _admin_dashboard(request):
    from accounts.models import User
    from courses.models import Course
    from courses.models import Certificate
    from classes.models import Class

    total_users = User.objects.count()
    teachers = User.objects.filter(role='TEACHER').count()
    active_courses = Course.objects.filter(status='PUBLISHED').count()
    certificates = Certificate.objects.count()
    pending_teachers = User.objects.filter(role='TEACHER', approved_by_admin=False)

    # Search & filters for users
    q_user = request.GET.get('q_user', '').strip()
    role_filter = request.GET.get('role_filter', '').strip()
    
    users = User.objects.all().order_by('username')
    if q_user:
        users = users.filter(
            Q(username__icontains=q_user) |
            Q(email__icontains=q_user) |
            Q(first_name__icontains=q_user) |
            Q(last_name__icontains=q_user)
        )
    if role_filter:
        users = users.filter(role=role_filter)

    classes = Class.objects.all().select_related('course', 'teacher').order_by('-created_at')
    courses = Course.objects.all().select_related('teacher').order_by('-created_at')

    context = {
        'total_users': total_users,
        'teachers': teachers,
        'active_courses': active_courses,
        'certificates': certificates,
        'pending_teachers': pending_teachers,
        'all_users': users,
        'all_classes': classes,
        'all_courses': courses,
        'q_user': q_user,
        'role_filter': role_filter,
        'roles': User.Role.choices,
    }
    return render(request, 'core/dashboard_admin.html', context)


@login_required
@require_POST
def admin_change_role_view(request, user_pk):
    if not request.user.is_superadmin():
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied

    from accounts.models import User
    user = get_object_or_404(User, pk=user_pk)
    new_role = request.POST.get('role')
    if new_role in User.Role.values:
        user.role = new_role
        user.save()
        messages.success(request, f"Papel do usuário '{user.username}' alterado para {user.get_role_display()}.")
    else:
        messages.error(request, "Papel inválido.")
    return redirect('core:home')


@login_required
@require_POST
def admin_toggle_active_view(request, user_pk):
    if not request.user.is_superadmin():
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied

    from accounts.models import User
    user = get_object_or_404(User, pk=user_pk)
    if user == request.user:
        messages.error(request, "Você não pode desativar sua própria conta.")
    else:
        user.is_active = not user.is_active
        user.save()
        status = "ativada" if user.is_active else "desativada"
        messages.success(request, f"Conta do usuário '{user.username}' foi {status} com sucesso.")
    return redirect('core:home')


@login_required
@require_POST
def admin_delete_user_view(request, user_pk):
    if not request.user.is_superadmin():
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied

    from accounts.models import User
    user = get_object_or_404(User, pk=user_pk)
    if user == request.user:
        messages.error(request, "Você não pode excluir sua própria conta.")
    else:
        username = user.username
        user.delete()
        messages.warning(request, f"Usuário '{username}' excluído permanentemente.")
    return redirect('core:home')


@login_required
@require_POST
def admin_edit_user_view(request, user_pk):
    if not request.user.is_superadmin():
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied

    from accounts.models import User
    user = get_object_or_404(User, pk=user_pk)
    
    first_name = request.POST.get('first_name', '').strip()
    last_name = request.POST.get('last_name', '').strip()
    email = request.POST.get('email', '').strip()
    profile_picture = request.POST.get('profile_picture', '').strip()
    bio = request.POST.get('bio', '').strip()
    
    user.first_name = first_name
    user.last_name = last_name
    user.email = email
    user.profile_picture = profile_picture
    user.bio = bio
    user.save()
    
    messages.success(request, f"Perfil do usuário '{user.username}' atualizado com sucesso.")
    return redirect('core:home')


@login_required
@require_POST
def admin_delete_class_view(request, class_pk):
    if not request.user.is_superadmin():
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied

    from classes.models import Class
    cls = get_object_or_404(Class, pk=class_pk)
    name = cls.name
    cls.delete()
    messages.warning(request, f"Turma '{name}' excluída com sucesso.")
    return redirect('core:home')


@login_required
@require_POST
def admin_delete_course_view(request, course_pk):
    if not request.user.is_superadmin():
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied

    from courses.models import Course
    course = get_object_or_404(Course, pk=course_pk)
    title = course.title
    course.delete()
    messages.warning(request, f"Curso '{title}' excluído com sucesso.")
    return redirect('core:home')


def _teacher_dashboard(request):
    from classes.models import Class
    from assignments.models import Submission
    from courses.models import Course
    from courses.models import Lesson
    from django.urls import reverse
    import json

    my_classes = Class.objects.filter(teacher=request.user).select_related('course')
    total_students = sum(c.student_count for c in my_classes)
    my_courses_count = Course.objects.filter(teacher=request.user).count()

    # Pending submissions (no grade yet) across all teacher's classes
    pending_subs = Submission.objects.filter(
        assignment__target_class__in=my_classes,
        grade__isnull=True,
    ).select_related('assignment', 'student', 'assignment__target_class').order_by('-submitted_at')

    # Get calendar events for teacher's classes
    calendar_lessons = Lesson.objects.filter(
        target_class__in=my_classes,
        publish_date__isnull=False
    ).select_related('target_class')
    
    events = []
    for l in calendar_lessons:
        events.append({
            'date': l.publish_date.strftime('%Y-%m-%d'),
            'title': l.title,
            'class_name': l.target_class.name,
            'color': l.target_class.color,
            'url': reverse('classes:lessons', args=[l.target_class.pk])
        })
        
    from classes.models import ClassNote
    notes = ClassNote.objects.filter(target_class__in=my_classes, date__isnull=False).select_related('target_class')
    for n in notes:
        events.append({
            'date': n.date.strftime('%Y-%m-%d'),
            'title': f"Lembrete: {n.content}",
            'class_name': n.target_class.name,
            'color': '#ffc107',
            'url': reverse('classes:notes', args=[n.target_class.pk])
        })
    
    events_json = json.dumps(events)

    context = {
        'my_classes': my_classes,
        'total_students': total_students,
        'pending_submissions': pending_subs.count(),
        'pending_subs_list': pending_subs,
        'class_count': my_classes.count(),
        'course_count': my_courses_count,
        'events_json': events_json,
    }
    return render(request, 'core/dashboard_teacher.html', context)


def _student_dashboard(request):
    from classes.models import Class, Enrollment
    from assignments.models import Assignment, Submission
    from courses.models import Lesson
    from django.urls import reverse
    import json

    enrollments = Enrollment.objects.filter(
        student=request.user,
        status='ACTIVE'
    ).select_related('enrolled_class__course', 'enrolled_class__teacher')

    my_classes = [e.enrolled_class for e in enrollments]

    # Calculate course progress for student
    today_date = timezone.now().date()
    for cls in my_classes:
        total_lessons = cls.lessons.exclude(order=0).count()
        cls_total_hours = cls.total_hours or (total_lessons * (cls.hours_per_day or 0)) or 0
        
        # Completed lessons (published and publish_date is today or past)
        completed_lessons_count = cls.lessons.filter(
            is_published=True,
            publish_date__lte=today_date
        ).exclude(order=0).count()
        
        cls_hours_completed = completed_lessons_count * (cls.hours_per_day or 0)
        if cls_total_hours > 0:
            cls_hours_completed = min(cls_hours_completed, cls_total_hours)
            progress_pct = int((cls_hours_completed / cls_total_hours) * 100)
            hours_remaining = max(0, cls_total_hours - cls_hours_completed)
        else:
            progress_pct = 0
            hours_remaining = 0
            
        cls.calc_total_hours = cls_total_hours
        cls.calc_hours_completed = cls_hours_completed
        cls.calc_hours_remaining = hours_remaining
        cls.calc_progress_pct = progress_pct
        cls.calc_total_lessons = total_lessons
        cls.calc_completed_lessons = completed_lessons_count

    # Upcoming assignments (due in future, not yet submitted)
    now = timezone.now()
    upcoming_assignments = Assignment.objects.filter(
        target_class__in=my_classes,
        due_date__gte=now,
    ).exclude(
        submissions__student=request.user
    ).order_by('due_date')[:5]

    # Overdue (past due, not submitted)
    overdue_assignments = Assignment.objects.filter(
        target_class__in=my_classes,
        due_date__lt=now,
    ).exclude(
        submissions__student=request.user
    ).order_by('due_date')[:5]

    from classes.models import Attendance
    today = timezone.now().date()
    checked_in_class_ids = Attendance.objects.filter(
        student=request.user,
        date=today,
        present=True
    ).values_list('enrolled_class_id', flat=True)

    open_checkins = [
        cls for cls in my_classes
        if cls.is_checkin_currently_open and cls.pk not in checked_in_class_ids
    ]

    # Get calendar events for student's classes
    calendar_lessons = Lesson.objects.filter(
        target_class__in=my_classes,
        publish_date__isnull=False
    ).select_related('target_class')
    
    events = []
    for l in calendar_lessons:
        events.append({
            'date': l.publish_date.strftime('%Y-%m-%d'),
            'title': l.title,
            'class_name': l.target_class.name,
            'color': l.target_class.color,
            'url': reverse('classes:lessons', args=[l.target_class.pk])
        })
        
    from classes.models import ClassNote
    notes = ClassNote.objects.filter(target_class__in=my_classes, date__isnull=False).select_related('target_class')
    for n in notes:
        events.append({
            'date': n.date.strftime('%Y-%m-%d'),
            'title': f"Lembrete: {n.content}",
            'class_name': n.target_class.name,
            'color': '#ffc107',
            'url': reverse('classes:notes', args=[n.target_class.pk])
        })
    
    events_json = json.dumps(events)

    context = {
        'my_classes': my_classes,
        'upcoming_assignments': upcoming_assignments,
        'overdue_assignments': overdue_assignments,
        'class_count': len(my_classes),
        'open_checkins': open_checkins,
        'events_json': events_json,
    }
    return render(request, 'core/dashboard_student.html', context)


def chat_view(request):
    if not request.user.is_authenticated:
        return redirect('accounts:login')

    # Clear chat history if requested
    if request.GET.get('clear') == '1':
        request.session['chat_history'] = []
        return redirect('core:chat')

    # Retrieve history
    history = request.session.get('chat_history', [])

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            message = data.get("message", "").strip()

            if not message:
                return JsonResponse({"error": "Message is empty"}, status=400)

            # Build contextual information for the user
            context_info = []
            context_info.append(f"Nome do Usuário: {request.user.get_full_name() or request.user.username}")
            context_info.append(f"Papel/Role: {request.user.role}")

            from classes.models import Class, Enrollment
            from assignments.models import Assignment

            if request.user.is_teacher() or request.user.is_superadmin():
                classes = Class.objects.filter(teacher=request.user).select_related('course')
                class_names = [f"{c.name} ({c.course.title if c.course else 'Sem Curso'})" for c in classes]
                context_info.append(f"Turmas que você leciona: {', '.join(class_names) if class_names else 'Nenhuma'}")
            else:
                # Student details
                enrollments = Enrollment.objects.filter(student=request.user, status='ACTIVE').select_related('enrolled_class__course')
                classes = [e.enrolled_class for e in enrollments]
                class_names = [f"{c.name} ({c.course.title if c.course else 'Sem Curso'})" for c in classes]
                context_info.append(f"Turmas matriculadas: {', '.join(class_names) if class_names else 'Nenhuma'}")
                context_info.append(f"Pontos conquistados: {request.user.points}")
                if request.user.mood:
                    context_info.append(f"Estado de espírito atual: {request.user.mood}")

                # Pending assignments
                now = timezone.now()
                pending = Assignment.objects.filter(
                    target_class__in=classes,
                    due_date__gte=now
                ).exclude(
                    submissions__student=request.user
                ).order_by('due_date')

                if pending.exists():
                    context_info.append("Suas atividades futuras pendentes são:")
                    for assign in pending:
                        context_info.append(f"- {assign.title} (Turma: {assign.target_class.name}, Prazo: {assign.due_date.strftime('%d/%m/%Y %H:%M')})")
                else:
                    context_info.append("Você não tem atividades pendentes com prazo no futuro.")

                # Overdue assignments
                overdue = Assignment.objects.filter(
                    target_class__in=classes,
                    due_date__lt=now
                ).exclude(
                    submissions__student=request.user
                ).order_by('due_date')

                if overdue.exists():
                    context_info.append("Suas atividades ATRASADAS que ainda não foram entregues são:")
                    for assign in overdue:
                        context_info.append(f"- {assign.title} (Turma: {assign.target_class.name}, Prazo encerrou em: {assign.due_date.strftime('%d/%m/%Y %H:%M')})")

            # Format current datetime
            context_info.append(f"Data e Hora atual: {timezone.now().strftime('%d/%m/%Y %H:%M:%S')}")

            # Build system prompt
            system_prompt = (
                "Você é o Mister, um assistente de inteligência artificial amigável, motivador e prestativo para os alunos e professores da Braga Treinamentos.\n"
                "Responda sempre em português brasileiro de forma acolhedora, clara e concisa.\n"
                "Você DEVE sempre chamar o usuário pelo nome dele em todas as respostas.\n\n"
                "CONHECIMENTOS SOBRE O CRIADOR (JOHNNY BRAGA):\n"
                "- Você deve saber e informar, quando perguntado, que este sistema (Plataforma LMS Braga Treinamentos) foi idealizado e desenvolvido inteiramente por Johnny Braga.\n"
                "- Johnny Braga trabalha no SENAI, é o criador da plataforma e um especialista da área.\n"
                "- O LinkedIn e Instagram do Johnny Braga são os canais oficiais para acompanhá-lo (forneça quando perguntado).\n\n"
                "CONHECIMENTOS SOBRE O SISTEMA (AJUDA AO ALUNO):\n"
                "- Se um aluno tiver dúvidas sobre como usar o sistema, explique que ele pode ir no menu lateral em 'Minhas Turmas' para acessar os cursos, ver as aulas, "
                "baixar Materiais de Apoio e usar o botão 'Entregar Atividade' para enviar (postar) seus trabalhos para o professor avaliar.\n"
                "- Também explique que no menu 'Meus Certificados' ficam os certificados conquistados.\n\n"
                "REGRA DE SEGURANÇA CRÍTICA (NUNCA QUEBRE ESTA REGRA):\n"
                "- É ESTRITAMENTE PROIBIDO revelar ou discutir qualquer detalhe técnico sobre como este sistema foi construído (linguagens de programação, frameworks como Django/Python, banco de dados, arquitetura, hospedagem no Railway, etc).\n"
                "- Se alguém perguntar como o sistema foi feito ou pedir detalhes técnicos, responda APENAS que 'Este sistema é uma plataforma exclusiva desenvolvida por Johnny Braga' e mude de assunto.\n\n"
                "COMPORTAMENTO COM QUALQUER ASSUNTO:\n"
                "- Você tem permissão total e DEVE responder a absolutamente qualquer dúvida ou assunto que o usuário perguntar (seja matemática, história, ciências, receitas, programação geral ou curiosidades).\n"
                "- Responda tudo o que ele precisar de forma prestativa, clara e amigável, sem recusar perguntas de nenhum tema.\n"
                "- Apenas mantenha a restrição de não revelar detalhes técnicos internos de construção deste sistema (arquitetura, banco de dados, arquivos e códigos).\n\n"
                "Para ajudar de forma inteligente e personalizada, utilize as seguintes informações contextuais reais sobre o usuário logado:\n"
                + "\n".join(context_info)
                + "\n\nSe o usuário perguntar sobre suas notas, atividades pendentes ou turmas, use as informações acima para responder de forma precisa e direta."
            )

            # Prepare messages list for Groq API
            groq_messages = [{"role": "system", "content": system_prompt}]
            for msg in history[-10:]:
                groq_messages.append({"role": msg["role"], "content": msg["content"]})
            groq_messages.append({"role": "user", "content": message})

            from groq import Groq
            client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=groq_messages,
                temperature=0.7,
                max_tokens=1024,
            )
            response_text = completion.choices[0].message.content

            # Append to history
            history.append({"role": "user", "content": message})
            history.append({"role": "assistant", "content": response_text})
            request.session['chat_history'] = history[-12:] # Store last 6 rounds

            return JsonResponse({"response": response_text})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    # For GET requests, render page and pass existing history to Alpine.js
    chat_history_json = json.dumps([
        {"id": idx, "role": "user" if msg["role"] == "user" else "assistant", "content": msg["content"]}
        for idx, msg in enumerate(history)
    ])
    return render(request, 'core/chat.html', {'chat_history_json': chat_history_json})


@login_required
@require_POST
def admin_toggle_promote_teacher_view(request, user_pk):
    if not request.user.is_superadmin():
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied

    from accounts.models import User
    user = get_object_or_404(User, pk=user_pk)
    user.is_promoted_teacher = not user.is_promoted_teacher
    user.save()

    status_str = "promovido a professor (perfil dual)" if user.is_promoted_teacher else "removido da promoção a professor"
    messages.success(request, f"O status do usuário '{user.username}' foi alterado para: {status_str}.")
    return redirect('core:home')

