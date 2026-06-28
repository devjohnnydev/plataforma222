from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_POST
from django.http import HttpResponse

from .models import Course, Category, Module, Lesson, Material


@login_required
def course_list_view(request):
    if not (request.user.is_teacher() or request.user.is_superadmin()):
        messages.error(request, 'Apenas professores podem gerenciar cursos.')
        return redirect('core:home')

    courses = Course.objects.filter(teacher=request.user)
    return render(request, 'courses/course_list.html', {'courses': courses})


@login_required
def course_create_view(request):
    if not (request.user.is_teacher() or request.user.is_superadmin()):
        return redirect('core:home')

    categories = Category.objects.all()

    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        description = request.POST.get('description', '').strip()
        category_id = request.POST.get('category')
        level = request.POST.get('level', 'BEGINNER')
        workload_hours = request.POST.get('workload_hours', 0)
        
        if not title:
            messages.error(request, 'O título do curso é obrigatório.')
        else:
            category = Category.objects.filter(pk=category_id).first() if category_id else None
            course = Course.objects.create(
                title=title,
                description=description,
                category=category,
                teacher=request.user,
                level=level,
                workload_hours=workload_hours,
            )
            messages.success(request, f'Curso "{title}" criado com sucesso!')
            return redirect('courses:detail', slug=course.slug)

    context = {
        'categories': categories,
        'levels': Course.Level.choices,
    }
    return render(request, 'courses/course_form.html', context)


@login_required
def course_detail_view(request, slug):
    course = get_object_or_404(Course, slug=slug)
    
    if not (request.user == course.teacher or request.user.is_superadmin()):
        messages.error(request, 'Você não tem permissão para editar este curso.')
        return redirect('courses:list')

    modules = course.modules.prefetch_related('lessons__materials').order_by('order')
    
    context = {
        'course': course,
        'modules': modules,
        'material_types': Material.MaterialType.choices,
    }
    return render(request, 'courses/course_detail.html', context)


@login_required
@require_POST
def module_create_view(request, slug):
    course = get_object_or_404(Course, slug=slug)
    if not (request.user == course.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    title = request.POST.get('title', '').strip()
    if title:
        # Get max order
        max_order = course.modules.count()
        Module.objects.create(course=course, title=title, order=max_order + 1)
        messages.success(request, 'Módulo criado com sucesso.')

    return redirect('courses:detail', slug=slug)


@login_required
@require_POST
def lesson_create_view(request, slug, mod_pk):
    course = get_object_or_404(Course, slug=slug)
    module = get_object_or_404(Module, pk=mod_pk, course=course)
    
    if not (request.user == course.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    title = request.POST.get('title', '').strip()
    if title:
        max_order = module.lessons.count()
        Lesson.objects.create(module=module, title=title, order=max_order + 1)
        messages.success(request, 'Aula adicionada com sucesso.')

    return redirect('courses:detail', slug=slug)


@login_required
@require_POST
def material_create_view(request, slug, les_pk):
    course = get_object_or_404(Course, slug=slug)
    lesson = get_object_or_404(Lesson, pk=les_pk, module__course=course)
    
    if not (request.user == course.teacher or request.user.is_superadmin()):
        return HttpResponse(status=403)

    title = request.POST.get('title', '').strip()
    material_type = request.POST.get('material_type', 'LINK')
    url = request.POST.get('url', '').strip()
    file = request.FILES.get('file')

    if title:
        Material.objects.create(
            lesson=lesson,
            module=lesson.module,
            title=title,
            material_type=material_type,
            url=url,
            file=file
        )
        messages.success(request, 'Material adicionado com sucesso.')

    return redirect('courses:detail', slug=slug)
