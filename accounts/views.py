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


