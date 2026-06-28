from django.shortcuts import render

def home_view(request):
    if request.user.is_authenticated:
        if request.user.is_superadmin():
            return render(request, 'core/dashboard_admin.html')
        elif request.user.is_teacher():
            return render(request, 'core/dashboard_teacher.html')
        else:
            return render(request, 'core/dashboard_student.html')
    return render(request, 'core/landing.html')
