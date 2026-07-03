from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls', namespace='core')),
    path('', include('accounts.urls', namespace='accounts')),
    path('', include('classes.urls', namespace='classes')),
    path('', include('assignments.urls', namespace='assignments')),
    path('', include('courses.urls', namespace='courses')),
    path('', include('notifications.urls', namespace='notifications')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

