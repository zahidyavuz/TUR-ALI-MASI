import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)

# Token, çerezle değil query string ile taşınır (ws://.../?token=<access>):
# frontend ve backend farklı domainlerde olabildiği için cross-site çerezler
# gönderilmez (bkz. agencies/consumers.py). Çağıran (app/group-chat/page.tsx)
# geçerli access token'ı WS URL'ine eklemelidir.


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Tur grup sohbeti gerçek-zamanlı kanalı (F5-04).

    Yetki REST tarafıyla (chat/views.py) aynı kuralı izler: acenta yalnız kendi
    turunun odasına, müşteri yalnız o tur+tarih için ONAYLI rezervasyonu varsa
    bağlanabilir. Bağlanma yalnız yetki ister (geçmiş okunabilsin); mesaj
    GÖNDERME ayrıca odanın aktif ve salt-okunur olmaması koşuluna bağlıdır.
    """

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']

        query_string = self.scope.get('query_string', b'').decode()
        token_str = None
        for param in query_string.split('&'):
            if param.startswith('token='):
                token_str = param[len('token='):]
                break

        if not token_str:
            logger.warning('ChatConsumer reject=no_token room_id=%s', self.room_id)
            await self.close(code=4401)
            return

        try:
            access_token = AccessToken(token_str)
            self.user_id = access_token['user_id']
        except (TokenError, InvalidToken, KeyError):
            logger.warning('ChatConsumer reject=invalid_token room_id=%s', self.room_id)
            await self.close(code=4401)
            return

        room = await self._get_authorized_room(self.user_id, self.room_id)
        if room is None:
            logger.warning(
                'ChatConsumer reject=not_participant user_id=%s room_id=%s',
                self.user_id, self.room_id,
            )
            await self.close(code=4403)
            return

        self.room_group_name = f'chat_{self.room_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        room_group_name = getattr(self, 'room_group_name', None)
        if room_group_name:
            await self.channel_layer.group_discard(room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or '{}')
        except (json.JSONDecodeError, TypeError):
            return

        content = (data.get('content') or '').strip()
        message_type = data.get('message_type') or 'text'
        if not content:
            return

        # Kalıcılaştırma + yetki/salt-okunur kontrolü tek DB işleminde; oda
        # kapalı/salt-okunursa None döner ve gönderim sessizce yok sayılır.
        message = await self._persist_message(self.user_id, self.room_id, content, message_type)
        if message is None:
            await self.send(text_data=json.dumps(
                {'type': 'error', 'detail': 'Bu oda şu anda mesaj göndermeye kapalı.'}
            ))
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'chat.message', 'message': message},
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

    # ── DB yardımcıları ──────────────────────────────────────────────────────
    @database_sync_to_async
    def _get_authorized_room(self, user_id, room_id):
        from django.contrib.auth.models import User
        from bookings.models import Booking
        from .models import ChatRoom
        try:
            room = ChatRoom.objects.select_related(
                'tour_availability', 'tour_availability__tour', 'tour_availability__tour__agency'
            ).get(pk=room_id)
        except (ChatRoom.DoesNotExist, ValueError):
            return None
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

        ta = room.tour_availability
        agency = getattr(user, 'agency_profile', None)
        if agency is not None:
            return room if ta.tour.agency_id == agency.id else None

        has_booking = Booking.objects.filter(
            user=user, tour=ta.tour, start_date=ta.date, status='confirmed',
        ).exists()
        return room if has_booking else None

    @database_sync_to_async
    def _persist_message(self, user_id, room_id, content, message_type):
        from django.contrib.auth.models import User
        from bookings.models import Booking
        from .models import ChatRoom, Message
        from .serializers import MessageSerializer
        from .views import update_chat_room_status

        try:
            room = ChatRoom.objects.select_related(
                'tour_availability', 'tour_availability__tour', 'tour_availability__tour__agency'
            ).get(pk=room_id)
            user = User.objects.get(pk=user_id)
        except (ChatRoom.DoesNotExist, User.DoesNotExist, ValueError):
            return None

        ta = room.tour_availability
        agency = getattr(user, 'agency_profile', None)
        is_agency = agency is not None
        if is_agency:
            if ta.tour.agency_id != agency.id:
                return None
        else:
            authorized = Booking.objects.filter(
                user=user, tour=ta.tour, start_date=ta.date, status='confirmed',
            ).exists()
            if not authorized:
                return None

        # Zaman penceresi: kapalı (henüz aktif değil) ya da salt-okunur odada
        # gönderim yapılamaz. REST tarafıyla aynı kural.
        update_chat_room_status(room)
        room.refresh_from_db(fields=['is_active', 'is_readonly'])
        if not room.is_active or room.is_readonly:
            return None

        # Duyuru yalnız acentaya; müşteri "announcement" yollasa 'text'e düşer.
        if message_type == 'announcement' and not is_agency:
            message_type = 'text'
        is_pinned = bool(is_agency and message_type == 'announcement')

        msg = Message.objects.create(
            room=room, sender=user, message_type=message_type,
            content=content, is_pinned=is_pinned,
        )
        # JSONRenderer ile saf JSON tiplerine indir: serializer.data içindeki
        # UUID (room) doğrudan json.dumps/msgpack ile serileşemez; hem InMemory
        # hem Redis (channels-redis, msgpack) katmanları için güvenli hale gelir.
        from rest_framework.renderers import JSONRenderer
        return json.loads(JSONRenderer().render(MessageSerializer(msg).data))
