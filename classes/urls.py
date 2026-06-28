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
]
