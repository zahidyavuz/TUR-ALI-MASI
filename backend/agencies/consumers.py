import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)

# Cookie name must match REST_AUTH['JWT_AUTH_COOKIE'] in settings.py — this
# consumer decodes the JWT manually because Channels' AuthMiddlewareStack
# populates scope['user'] from Django session auth, not from this app's JWT
# cookie auth (scope['user'] would be AnonymousUser for real users here).
AUTH_COOKIE_NAME = 'auth-token'


class RestaurantConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        raw_restaurant_id = self.scope['url_route']['kwargs']['restaurant_id']

        try:
            restaurant_id = int(raw_restaurant_id)
        except (TypeError, ValueError):
            logger.warning(
                'RestaurantConsumer reject=malformed_id restaurant_id=%r',
                raw_restaurant_id,
            )
            await self.close(code=4400)
            return

        token = self.scope.get('cookies', {}).get(AUTH_COOKIE_NAME)
        if not token:
            logger.warning(
                'RestaurantConsumer reject=no_token restaurant_id=%s',
                restaurant_id,
            )
            await self.close(code=4401)
            return

        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
        except TokenError:
            logger.warning(
                'RestaurantConsumer reject=invalid_token restaurant_id=%s',
                restaurant_id,
            )
            await self.close(code=4401)
            return

        is_owner = await self._user_owns_restaurant(user_id, restaurant_id)
        if not is_owner:
            logger.warning(
                'RestaurantConsumer reject=not_owner user_id=%s restaurant_id=%s',
                user_id, restaurant_id,
            )
            await self.close(code=4403)
            return

        self.restaurant_id = restaurant_id
        self.room_group_name = f'restaurant_{self.restaurant_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    @database_sync_to_async
    def _user_owns_restaurant(self, user_id, restaurant_id):
        from agencies.models import Agency
        return Agency.objects.filter(owner_id=user_id, id=restaurant_id).exists()

    async def disconnect(self, close_code):
        room_group_name = getattr(self, 'room_group_name', None)
        if room_group_name:
            await self.channel_layer.group_discard(
                room_group_name,
                self.channel_name
            )

    # Receive message from room group
    async def restaurant_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps(message))
