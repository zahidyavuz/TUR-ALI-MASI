import json
from datetime import date, timedelta
from itertools import count

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import User
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from agencies.models import Agency
from bookings.models import Booking
from chat.models import ChatRoom, Message
from tours.models import Tour, TourAvailability

# WS testleri için sürece bağlı, thread-güvenli in-memory katman şart.
INMEM_LAYER = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
_ref_counter = count(1)


def _make_tour(agency, slug, tour_date, duration='1 Gün'):
    tour = Tour.objects.create(
        id=slug,
        agency=agency,
        title=f'Tour {slug}',
        location='Bodrum',
        price=1000,
        duration=duration,
        guide='Türkçe',
        description='desc',
        category='romantic',
        image_main='https://example.com/i.jpg',
    )
    ta = TourAvailability.objects.create(tour=tour, date=tour_date, max_capacity=10)
    # ChatRoom, TourAvailability post_save sinyaliyle otomatik oluşur.
    room = ChatRoom.objects.get(tour_availability=ta)
    return tour, ta, room


def _make_booking(user, tour, start_date, status='confirmed', guests=2):
    return Booking.objects.create(
        user=user, tour=tour, start_date=start_date,
        guests=guests, total_price=1000 * guests, status=status,
        booking_ref=f'TEST-{next(_ref_counter):06d}',
    )


def _results(res):
    """Sayfalanmış (PageNumberPagination) yanıttan sonuç listesini döndürür."""
    if isinstance(res.data, dict) and 'results' in res.data:
        return res.data['results']
    return res.data


class ChatRestAccessTestCase(TransactionTestCase):
    """REST tarafında yalnız onaylı katılımcı erişimi."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username='owner', password='p')
        self.agency = Agency.objects.create(
            owner=self.owner, name='A', status='onaylandi', is_verified=True
        )
        self.booker = User.objects.create_user(username='booker', password='p')
        self.stranger = User.objects.create_user(username='stranger', password='p')

        today = date.today()
        self.tour, self.ta, self.room = _make_tour(self.agency, 'access-tour', today)

        _make_booking(self.booker, self.tour, today, status='confirmed')
        Message.objects.create(room=self.room, sender=self.owner,
                               message_type='text', content='merhaba')

    def test_confirmed_booker_can_read_messages(self):
        self.client.force_authenticate(self.booker)
        res = self.client.get(f'/api/v1/chat/{self.room.id}/messages/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(_results(res)), 1)

    def test_agency_owner_can_read_messages(self):
        self.client.force_authenticate(self.owner)
        res = self.client.get(f'/api/v1/chat/{self.room.id}/messages/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(_results(res)), 1)

    def test_stranger_gets_no_messages(self):
        self.client.force_authenticate(self.stranger)
        res = self.client.get(f'/api/v1/chat/{self.room.id}/messages/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(_results(res)), 0)

    def test_stranger_cannot_retrieve_room_detail(self):
        self.client.force_authenticate(self.stranger)
        res = self.client.get(f'/api/v1/chat/{self.room.id}/')
        self.assertEqual(res.status_code, 403)

    def test_booker_can_retrieve_room_detail(self):
        self.client.force_authenticate(self.booker)
        res = self.client.get(f'/api/v1/chat/{self.room.id}/')
        self.assertEqual(res.status_code, 200)

    def test_unauthenticated_denied(self):
        res = self.client.get(f'/api/v1/chat/{self.room.id}/messages/')
        self.assertEqual(res.status_code, 401)

    def test_pending_booking_not_authorized(self):
        pending = User.objects.create_user(username='pending', password='p')
        _make_booking(pending, self.tour, date.today(), status='pending', guests=1)
        self.client.force_authenticate(pending)
        res = self.client.get(f'/api/v1/chat/{self.room.id}/messages/')
        self.assertEqual(len(_results(res)), 0)


@override_settings(CHANNEL_LAYERS=INMEM_LAYER)
class ChatWebSocketTestCase(TransactionTestCase):
    """WebSocket bağlanma yetkisi, salt-okunur/kapalı gönderim koruması ve
    gerçek-zamanlı yayın. WebsocketCommunicator ORM'i ayrı thread/bağlantıda
    kullandığından TransactionTestCase gerekir (veri commit edilmeli)."""

    def setUp(self):
        self.owner = User.objects.create_user(username='wsowner', password='p')
        self.agency = Agency.objects.create(
            owner=self.owner, name='WSA', status='onaylandi', is_verified=True
        )
        self.booker = User.objects.create_user(username='wsbooker', password='p')
        self.stranger = User.objects.create_user(username='wsstranger', password='p')

        self.today = date.today()
        self.tour, self.ta, self.room = _make_tour(self.agency, 'ws-tour', self.today)
        self.booking = _make_booking(self.booker, self.tour, self.today, status='confirmed')

    def _token(self, user):
        return str(AccessToken.for_user(user))

    def _communicator(self, user=None, raw_token=None):
        from backend.asgi import application
        qs = ''
        if user is not None:
            qs = f'?token={self._token(user)}'
        elif raw_token is not None:
            qs = f'?token={raw_token}'
        return WebsocketCommunicator(application, f'/ws/chat/{self.room.id}/{qs}')

    def test_no_token_rejected(self):
        async def scenario():
            comm = self._communicator()
            connected, _ = await comm.connect()
            self.assertFalse(connected)
        async_to_sync(scenario)()

    def test_invalid_token_rejected(self):
        async def scenario():
            comm = self._communicator(raw_token='not-a-real-token')
            connected, _ = await comm.connect()
            self.assertFalse(connected)
        async_to_sync(scenario)()

    def test_stranger_rejected(self):
        async def scenario():
            comm = self._communicator(user=self.stranger)
            connected, _ = await comm.connect()
            self.assertFalse(connected)
        async_to_sync(scenario)()

    def test_booker_can_connect(self):
        async def scenario():
            comm = self._communicator(user=self.booker)
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            await comm.disconnect()
        async_to_sync(scenario)()

    def test_message_broadcasts_and_persists(self):
        async def scenario():
            comm = self._communicator(user=self.booker)
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            await comm.send_to(text_data=json.dumps(
                {'content': 'selam', 'message_type': 'text'}
            ))
            response = json.loads(await comm.receive_from(timeout=5))
            self.assertEqual(response['content'], 'selam')
            self.assertEqual(response['sender']['id'], self.booker.id)
            await comm.disconnect()
        async_to_sync(scenario)()
        self.assertTrue(Message.objects.filter(room=self.room, content='selam').exists())

    def test_customer_announcement_downgraded_to_text(self):
        async def scenario():
            comm = self._communicator(user=self.booker)
            await comm.connect()
            await comm.send_to(text_data=json.dumps(
                {'content': 'duyuru!', 'message_type': 'announcement'}
            ))
            response = json.loads(await comm.receive_from(timeout=5))
            self.assertEqual(response['message_type'], 'text')
            self.assertFalse(response['is_pinned'])
            await comm.disconnect()
        async_to_sync(scenario)()

    def test_agency_announcement_pinned(self):
        async def scenario():
            comm = self._communicator(user=self.owner)
            await comm.connect()
            await comm.send_to(text_data=json.dumps(
                {'content': 'kritik', 'message_type': 'announcement'}
            ))
            response = json.loads(await comm.receive_from(timeout=5))
            self.assertEqual(response['message_type'], 'announcement')
            self.assertTrue(response['is_pinned'])
            await comm.disconnect()
        async_to_sync(scenario)()

    def test_readonly_room_rejects_send(self):
        # Turu ve rezervasyonu geçmişe al: bitiş + 24 saat geçtiği için oda
        # salt-okunur olur (yetki booking.start_date == ta.date şartına bağlı).
        past = date.today() - timedelta(days=5)
        self.ta.date = past
        self.ta.save(update_fields=['date'])
        self.booking.start_date = past
        self.booking.save(update_fields=['start_date'])
        async def scenario():
            comm = self._communicator(user=self.booker)
            connected, _ = await comm.connect()
            self.assertTrue(connected)  # bağlanma serbest, geçmiş okunabilir
            await comm.send_to(text_data=json.dumps(
                {'content': 'gec kaldim', 'message_type': 'text'}
            ))
            response = json.loads(await comm.receive_from(timeout=5))
            self.assertEqual(response.get('type'), 'error')
            await comm.disconnect()
        async_to_sync(scenario)()
        self.assertFalse(Message.objects.filter(content='gec kaldim').exists())
