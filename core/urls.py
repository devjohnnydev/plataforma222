from django.urls import path
from . import views
from .seed_view import run_seeds_view

app_name = 'core'

urlpatterns = [
    path('', views.home_view, name='home'),
    path('chat/', views.chat_view, name='chat'),
    path('run-seeds-82736/', run_seeds_view, name='run_seeds'),
    path('admin/users/<int:user_pk>/role/', views.admin_change_role_view, name='admin_change_role'),
    path('admin/users/<int:user_pk>/toggle-active/', views.admin_toggle_active_view, name='admin_toggle_active'),
    path('admin/users/<int:user_pk>/delete/', views.admin_delete_user_view, name='admin_delete_user'),
    path('admin/classes/<int:class_pk>/delete/', views.admin_delete_class_view, name='admin_delete_class'),
    path('admin/courses/<int:course_pk>/delete/', views.admin_delete_course_view, name='admin_delete_course'),
]
