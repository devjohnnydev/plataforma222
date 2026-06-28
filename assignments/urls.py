from django.urls import path
from . import views

app_name = 'assignments'

urlpatterns = [
    path('assignments/<int:pk>/', views.assignment_detail_view, name='detail'),
    path('assignments/create/<int:class_pk>/', views.create_assignment_view, name='create'),
    path('assignments/<int:pk>/submit/', views.submit_assignment_view, name='submit'),
    path('assignments/submissions/<int:pk>/grade/', views.grade_submission_view, name='grade'),
]
