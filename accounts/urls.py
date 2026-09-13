from django.urls import path, reverse_lazy
from django.contrib.auth import views as auth_views
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('cadastro/', views.register_view, name='register'),
    path('quero-ensinar/', views.teacher_apply_view, name='teacher_apply'),
    path('approve-teacher/<int:pk>/', views.approve_teacher, name='approve_teacher'),
    path('reject-teacher/<int:pk>/', views.reject_teacher, name='reject_teacher'),
    path('perfil/', views.profile_view, name='profile'),
    path('perfil/switch-role/', views.switch_role_view, name='switch_role'),
    
    # --- Password Reset ---
    path('resetar-senha/', auth_views.PasswordResetView.as_view(
        template_name='accounts/password_reset_form.html',
        email_template_name='accounts/password_reset_email.html',
        subject_template_name='accounts/password_reset_subject.txt',
        success_url=reverse_lazy('accounts:password_reset_done')
    ), name='password_reset'),
    path('resetar-senha/enviado/', auth_views.PasswordResetDoneView.as_view(
        template_name='accounts/password_reset_done.html'
    ), name='password_reset_done'),
    path('resetar-senha/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='accounts/password_reset_confirm.html',
        success_url=reverse_lazy('accounts:password_reset_complete')
    ), name='password_reset_confirm'),
    path('resetar-senha/completo/', auth_views.PasswordResetCompleteView.as_view(
        template_name='accounts/password_reset_complete.html'
    ), name='password_reset_complete'),
]
