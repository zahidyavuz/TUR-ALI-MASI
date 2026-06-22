import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken


class RestaurantConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.restaurant_id = self.scope['url_route']['kwargs']['restaurant_id']
        self.room_group_name = f'restaurant_{self.restaurant_id}'

        # JWT Authentication via query string: ws://.../?token=<access_token>
        query_string = self.scope.get('query_string', b'').decode()
        token_str = None
        for param in query_string.split('&'):
            if param.startswith('token='):
                token_str = param[6:]
                break

        if not token_str:
            await self.close(code=4001)
            return

        try:
            token = AccessToken(token_str)
            user_id = token['user_id']
        except (TokenError, InvalidToken, KeyError):
            await self.close(code=4001)
            return

        owns = await self.user_owns_restaurant(user_id, self.restaurant_id)
        if not owns:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    @database_sync_to_async
    def user_owns_restaurant(self, user_id, restaurant_id):
        from agencies.models import Agency
        return Agency.objects.filter(
            owner_id=user_id,
            id=restaurant_id,
            business_type__in=['restoran', 'kafe']
        ).exists()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def restaurant_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))
