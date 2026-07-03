from django.urls import path
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
]
