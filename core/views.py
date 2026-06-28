import os
import json
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.utils import timezone


def home_view(request):
    if request.user.is_authenticated:
        if request.user.is_superadmin():
            return _admin_dashboard(request)
        elif request.user.is_teacher():
            return _teacher_dashboard(request)
        else:
            return _student_dashboard(request)
    return render(request, 'core/landing.html')


def _admin_dashboard(request):
    from accounts.models import User
    from courses.models import Course
    from courses.models import Certificate

    total_users = User.objects.count()
    teachers = User.objects.filter(role='TEACHER').count()
    active_courses = Course.objects.filter(status='PUBLISHED').count()
    certificates = Certificate.objects.count()
    pending_teachers = User.objects.filter(role='TEACHER', approved_by_admin=False)

    context = {
        'total_users': total_users,
        'teachers': teachers,
        'active_courses': active_courses,
        'certificates': certificates,
        'pending_teachers': pending_teachers,
    }
    return render(request, 'core/dashboard_admin.html', context)


def _teacher_dashboard(request):
    from classes.models import Class
    from assignments.models import Submission

    my_classes = Class.objects.filter(teacher=request.user).select_related('course')
    total_students = sum(c.student_count for c in my_classes)

    # Pending submissions (no grade yet) across all teacher's classes
    pending_submissions = Submission.objects.filter(
        assignment__target_class__in=my_classes,
        grade__isnull=True,
    ).count()

    context = {
        'my_classes': my_classes,
        'total_students': total_students,
        'pending_submissions': pending_submissions,
        'class_count': my_classes.count(),
    }
    return render(request, 'core/dashboard_teacher.html', context)


def _student_dashboard(request):
    from classes.models import Class, Enrollment
    from assignments.models import Assignment, Submission

    enrollments = Enrollment.objects.filter(
        student=request.user,
        status='ACTIVE'
    ).select_related('enrolled_class__course', 'enrolled_class__teacher')

    my_classes = [e.enrolled_class for e in enrollments]

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

    context = {
        'my_classes': my_classes,
        'upcoming_assignments': upcoming_assignments,
        'overdue_assignments': overdue_assignments,
        'class_count': len(my_classes),
    }
    return render(request, 'core/dashboard_student.html', context)


def chat_view(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            message = data.get("message", "")

            from groq import Groq
            client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are Mister, a helpful and friendly AI assistant for students at Johnny Corporate Training. Answer their questions clearly and concisely in Portuguese."},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=1024,
            )
            response_text = completion.choices[0].message.content
            return JsonResponse({"response": response_text})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return render(request, 'core/chat.html')
