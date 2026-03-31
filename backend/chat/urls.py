from django.urls import path
from .views import ChatRoomListView, ChatRoomDetailView, MessageListCreateView

urlpatterns = [
    path('', ChatRoomListView.as_view(), name='chat-room-list'),
    path('<uuid:pk>/', ChatRoomDetailView.as_view(), name='chat-room-detail'),
    path('<uuid:room_id>/messages/', MessageListCreateView.as_view(), name='message-list-create'),
]
