from django.urls import path
from . import views

app_name = 'remote_support'

urlpatterns = [
    path('request/', views.create_remote_session, name='create_request'),
    path('waiting/<str:session_code>/', views.waiting_room, name='waiting_room'),
    path('student/request/<str:session_code>/', views.student_request_view, name='student_request'),
    path('student/active/<str:session_code>/', views.student_active_session, name='student_active_session'),
]
