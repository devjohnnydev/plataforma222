import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import RemoteSession

class RemoteSupportConsumer(AsyncWebsocketConsumer):
    @database_sync_to_async
    def verify_user(self, session_id, user):
        if not user.is_authenticated:
            return False
        try:
            session = RemoteSession.objects.get(session_code=session_id)
            return user == session.student or user == session.teacher
        except RemoteSession.DoesNotExist:
            return False

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.user = self.scope['user']
        
        # Security check
        is_authorized = await self.verify_user(self.session_id, self.user)
        if not is_authorized:
            await self.close()
            return

        self.room_group_name = f'remote_{self.session_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        
        # We broadcast the message to the group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'remote_message',
                'message': text_data_json
            }
        )

    # Receive message from room group
    async def remote_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'remote_message',
            'message': message
        }))
