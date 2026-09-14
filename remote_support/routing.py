from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/remote/(?P<session_id>[\w-]+)/$', consumers.RemoteSupportConsumer.as_asgi()),
]
