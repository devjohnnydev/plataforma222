from django.urls import path
from . import views

app_name = 'classes'

urlpatterns = [
    path('classes/', views.class_list_view, name='list'),
    path('classes/create/', views.create_class_view, name='create'),
    path('classes/join/', views.join_class_view, name='join'),
    path('classes/<int:pk>/', views.class_detail_view, name='detail'),
    path('classes/<int:pk>/classwork/', views.class_classwork_view, name='classwork'),
    path('classes/<int:pk>/members/', views.class_members_view, name='members'),
    path('classes/<int:pk>/post/', views.post_announcement_view, name='post_announcement'),
    path('classes/<int:pk>/post/<int:post_pk>/delete/', views.delete_post_view, name='delete_post'),
    path('classes/<int:pk>/post/<int:post_pk>/comment/', views.add_stream_comment_view, name='add_stream_comment'),
    path('classes/<int:pk>/lessons/', views.class_lessons_view, name='lessons'),
    path('classes/<int:pk>/lessons/create/', views.create_class_lesson_view, name='create_lesson'),
    path('classes/<int:pk>/lessons/<int:lesson_pk>/publish/', views.publish_class_lesson_view, name='publish_lesson'),
    path('classes/<int:pk>/lessons/<int:lesson_pk>/material/add/', views.add_lesson_material_view, name='add_lesson_material'),
    path('classes/<int:pk>/lessons/<int:lesson_pk>/submit/', views.submit_lesson_material_view, name='submit_lesson_material'),
    path('classes/<int:pk>/lessons/<int:lesson_pk>/comment/', views.comment_lesson_view, name='comment_lesson'),
    path('classes/<int:pk>/edit/', views.edit_class_view, name='edit'),
    path('classes/<int:pk>/delete/', views.delete_class_view, name='delete'),
    path('classes/<int:pk>/duplicate/', views.duplicate_class_view, name='duplicate'),
    path('classes/<int:pk>/lessons/<int:lesson_pk>/edit/', views.edit_lesson_view, name='edit_lesson'),
    path('classes/<int:pk>/lessons/<int:lesson_pk>/delete/', views.delete_lesson_view, name='delete_lesson'),
    path('classes/<int:pk>/students/<int:student_pk>/remove/', views.remove_student_view, name='remove_student'),
    path('classes/<int:pk>/students/<int:student_pk>/attendance/', views.teacher_update_attendance_view, name='update_attendance'),
    path('classes/<int:pk>/checkin/toggle/', views.toggle_checkin_view, name='toggle_checkin'),
    path('classes/<int:pk>/checkin/', views.student_checkin_view, name='student_checkin'),
    path('classes/<int:pk>/students/<int:student_pk>/attendance/note/', views.teacher_update_attendance_note_view, name='update_attendance_note'),
    path('classes/<int:pk>/attendance/', views.class_attendance_view, name='attendance'),
    path('classes/<int:pk>/students/<int:student_pk>/reset-password/', views.teacher_reset_student_password_view, name='reset_student_password'),
    path('classes/<int:pk>/grades/', views.class_grades_view, name='grades'),
]

