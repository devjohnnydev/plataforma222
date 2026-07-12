from django.urls import path
from . import views

app_name = 'courses'

urlpatterns = [
    path('courses/', views.course_list_view, name='list'),
    path('courses/create/', views.course_create_view, name='create'),
    path('courses/<slug:slug>/', views.course_detail_view, name='detail'),
    path('courses/<slug:slug>/module/add/', views.module_create_view, name='add_module'),
    path('courses/<slug:slug>/module/<int:mod_pk>/lesson/add/', views.lesson_create_view, name='add_lesson'),
    path('courses/<slug:slug>/lesson/<int:les_pk>/material/add/', views.material_create_view, name='add_material'),
    path('courses/<slug:slug>/lesson/<int:les_pk>/material/<int:material_pk>/delete/', views.material_delete_view, name='delete_material'),
]

