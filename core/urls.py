from django.urls import path
from . import views
from .update_lessons_view import update_lessons_view

app_name = 'core'

urlpatterns = [
    path('', views.home_view, name='home'),
    path('chat/', views.chat_view, name='chat'),
    path('update-lessons-9821/', update_lessons_view, name='update_lessons'),
    path('admin/users/<int:user_pk>/role/', views.admin_change_role_view, name='admin_change_role'),
    path('admin/users/<int:user_pk>/toggle-active/', views.admin_toggle_active_view, name='admin_toggle_active'),
    path('admin/users/<int:user_pk>/delete/', views.admin_delete_user_view, name='admin_delete_user'),
    path('admin/classes/<int:class_pk>/delete/', views.admin_delete_class_view, name='admin_delete_class'),
    path('admin/courses/<int:course_pk>/delete/', views.admin_delete_course_view, name='admin_delete_course'),
]
