import { fetchAPI } from './api';
import { auth } from './auth';

export interface ChatSender {
  id: number;
  name: string;
  avatar: string | null;
  is_agency: boolean;
}

export interface ChatMessage {
  id: number;
  room: string;
  sender: ChatSender | null;
  message_type: 'text' | 'announcement' | 'location' | 'media' | 'meeting_point';
  content: string | null;
  media_file_url: string | null;
  is_pinned: boolean;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  tour_title: string;
  tour_date: string;
  tour_image: string | null;
  is_active: boolean;
  is_readonly: boolean;
  created_at: string;
  last_message: ChatMessage | null;
  tour_availability: number;
}

export async function fetchChatRoom(id: string): Promise<ChatRoom | null> {
  const res = await fetchAPI(`/chat/${id}/`);
  if (!res || res.detail) return null;
  return res as ChatRoom;
}

export async function fetchChatMessages(roomId: string): Promise<ChatMessage[]> {
  const res = await fetchAPI(`/chat/${roomId}/messages/`);
  if (!Array.isArray(res)) return [];
  return res as ChatMessage[];
}

/**
 * Grup sohbeti WebSocket URL'ini kurar. Token çerezle değil query string ile
 * taşınır (frontend/backend farklı domainlerde olabilir; bkz. backend
 * chat/consumers.py). API kökünden host türetilir, http(s) → ws(s) çevrilir.
 */
export function buildChatWsUrl(roomId: string): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  const token = auth.getAccessToken();
  if (!token) return null;
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '');
  return `${wsProtocol}://${wsHost}/ws/chat/${roomId}/?token=${encodeURIComponent(token)}`;
}
