from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import User


def login_view(request):
    if request.user.is_authenticated:
        return redirect('core:home')

    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')

        # Lookup user by email
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

        if user is not None:
            login(request, user)
            next_url = request.GET.get('next', 'core:home')
            return redirect(next_url)
        else:
            # Check if user exists but is inactive
            if User.objects.filter(email=email, is_active=False).exists():
                messages.error(request, 'Sua conta de professor está em análise pelo administrador. Aguarde a aprovação.')
            else:
                messages.error(request, 'E-mail ou senha inválidos. Tente novamente.')

    return render(request, 'accounts/login.html')


def logout_view(request):
    logout(request)
    return redirect('accounts:login')


def register_view(request):
    if request.user.is_authenticated:
        return redirect('core:home')

    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        password2 = request.POST.get('password2', '')

        if password != password2:
            messages.error(request, 'As senhas não coincidem.')
        elif User.objects.filter(email=email).exists():
            messages.error(request, 'Este e-mail já está cadastrado.')
        elif len(password) < 6:
            messages.error(request, 'A senha deve ter ao menos 6 caracteres.')
        else:
            username = email.split('@')[0]
            # Ensure unique username
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=User.Role.STUDENT
            )
            # Set display name
            parts = name.split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''
            user.save()

            login(request, user)
            messages.success(request, f'Bem-vindo, {user.first_name}! Sua conta foi criada com sucesso.')
            return redirect('core:home')

    return render(request, 'accounts/register.html')


def teacher_apply_view(request):
    if request.user.is_authenticated:
        return redirect('core:home')

    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        password2 = request.POST.get('password2', '')

        if password != password2:
            messages.error(request, 'As senhas não coincidem.')
        elif User.objects.filter(email=email).exists():
            messages.error(request, 'Este e-mail já está cadastrado.')
        elif len(password) < 6:
            messages.error(request, 'A senha deve ter ao menos 6 caracteres.')
        else:
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=User.Role.TEACHER,
                is_active=False  # Pendente de aprovação
            )
            
            parts = name.split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''
            user.save()

            messages.success(request, 'Sua solicitação foi enviada com sucesso! Aguarde a aprovação do administrador para fazer login.')
            return redirect('accounts:login')

    return render(request, 'accounts/teacher_apply.html')


@login_required
def approve_teacher(request, pk):
    if not request.user.is_superadmin():
        return HttpResponse(status=403)
    teacher = get_object_or_404(User, pk=pk, role=User.Role.TEACHER)
    teacher.is_active = True
    teacher.approved_by_admin = True
    teacher.save()
    
    from notifications.utils import send_notification
    send_notification(
        recipient=teacher,
        title="Cadastro Aprovado",
        message="Seu cadastro como professor foi aprovado! Você já pode criar cursos e turmas.",
        notification_type="TEACHER_APPROVAL"
    )
    
    messages.success(request, f"Professor {teacher.get_full_name() or teacher.username} aprovado com sucesso!")
    return redirect('core:home')


@login_required
def reject_teacher(request, pk):
    if not request.user.is_superadmin():
        return HttpResponse(status=403)
    teacher = get_object_or_404(User, pk=pk, role=User.Role.TEACHER)
    name = teacher.get_full_name() or teacher.username
    teacher.delete()
    messages.warning(request, f"Solicitação do professor {name} recusada e conta removida.")
    return redirect('core:home')


import os
from django.conf import settings
from django.core.files.storage import default_storage

@login_required
def profile_view(request):
    user = request.user
    if request.method == 'POST':
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        email = request.POST.get('email', '').strip()
        bio = request.POST.get('bio', '').strip()
        mood = request.POST.get('mood', '').strip()
        avatar_choice = request.POST.get('avatar_choice', '').strip()
        
        file = request.FILES.get('profile_pic_file')
        
        if file:
            # Save uploaded photo
            ext = os.path.splitext(file.name)[1]
            filename = f"user_{user.pk}_avatar{ext}"
            path = os.path.join(settings.MEDIA_ROOT, 'avatars', filename)
            # Ensure folder exists
            os.makedirs(os.path.dirname(path), exist_ok=True)
            if os.path.exists(path):
                os.remove(path)
            
            saved_path = default_storage.save(os.path.join('avatars', filename), file)
            user.profile_picture = settings.MEDIA_URL + saved_path
        elif avatar_choice:
            user.profile_picture = f"/static/images/avatars/{avatar_choice}"
            
        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        user.bio = bio
        user.mood = mood
        user.save()
        messages.success(request, "Perfil atualizado com sucesso!")
        return redirect('accounts:profile')

    default_avatars = ['avatar1.svg', 'avatar2.svg', 'avatar3.svg', 'avatar4.svg', 'avatar5.svg']
    context = {
        'default_avatars': default_avatars,
    }
    return render(request, 'accounts/profile.html', context)



