'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    ChatMessage,
    ChatRoom,
    fetchChatRoom,
    fetchChatMessages,
    buildChatWsUrl,
} from '@/app/lib/chat';

const QUICK_REPLIES = [
    'Buldum! 🙋',
    'Gecikiyorum 🏃',
    'Konum atar mısınız? 🗺️',
    'Anlaşıldı 👍',
];

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function GroupChatView() {
    const searchParams = useSearchParams();
    const roomId = searchParams.get('room');
    const { user, isLoading: authLoading } = useAuth();

    const [room, setRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Oda + mesaj geçmişini REST'ten yükle.
    useEffect(() => {
        if (authLoading) return;
        if (!roomId) {
            setLoading(false);
            setLoadError(true);
            return;
        }
        let active = true;
        async function load() {
            setLoading(true);
            setLoadError(false);
            const [roomData, history] = await Promise.all([
                fetchChatRoom(roomId as string),
                fetchChatMessages(roomId as string),
            ]);
            if (!active) return;
            if (!roomData) {
                setLoadError(true);
            } else {
                setRoom(roomData);
                setMessages(history);
            }
            setLoading(false);
        }
        load();
        return () => {
            active = false;
        };
    }, [roomId, authLoading]);

    const appendMessage = useCallback((msg: ChatMessage) => {
        setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
    }, []);

    // WebSocket bağlantısı — token query string ile taşınır (bkz. lib/chat.ts).
    useEffect(() => {
        if (!roomId || loadError || !room) return;
        const url = buildChatWsUrl(roomId);
        if (!url) return;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => setWsConnected(false);
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data && data.type === 'error') return;
                if (data && typeof data.id === 'number') appendMessage(data as ChatMessage);
            } catch {
                /* yok say */
            }
        };

        return () => {
            ws.onopen = null;
            ws.onclose = null;
            ws.onmessage = null;
            ws.close();
            wsRef.current = null;
        };
    }, [roomId, room, loadError, appendMessage]);

    const handleSendMessage = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || !room || room.is_readonly) return;
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ content: trimmed, message_type: 'text' }));
        setInputText('');
    };

    const pinnedAnnouncement = messages.find(
        (m) => m.is_pinned && m.message_type === 'announcement',
    );

    const roleFor = (msg: ChatMessage): 'me' | 'guide' | 'user' => {
        if (user && msg.sender && msg.sender.id === user.id) return 'me';
        if (msg.sender?.is_agency) return 'guide';
        return 'user';
    };

    if (loading || authLoading) {
        return (
            <main className="flex items-center justify-center h-[100dvh] bg-[#F2F2F7] font-sans">
                <p className="text-slate-500 font-semibold">Sohbet yükleniyor...</p>
            </main>
        );
    }

    if (loadError || !room) {
        return (
            <main className="flex flex-col items-center justify-center h-[100dvh] bg-[#F2F2F7] font-sans px-6 text-center">
                <p className="text-slate-700 font-bold mb-2">Bu sohbete erişemiyorsunuz.</p>
                <p className="text-slate-500 text-sm mb-4">
                    Yalnızca ilgili tura onaylı rezervasyonu olan misafirler ve tur acentası
                    grup sohbetini görüntüleyebilir.
                </p>
                <Link href="/" className="text-[#008cb3] font-semibold hover:underline">
                    Ana sayfaya dön
                </Link>
            </main>
        );
    }

    return (
        <main className="flex flex-col h-[100dvh] bg-[#F2F2F7] font-sans overflow-hidden">
            {/* HEADER */}
            <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-20 shrink-0 pt-[env(safe-area-inset-top)]">
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-10 h-10 flex items-center justify-center text-[#008cb3] bg-blue-50 hover:bg-blue-100 rounded-full transition-colors">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden border border-orange-200 shrink-0 shadow-sm">
                            <span className="text-xl">🎈</span>
                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${wsConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-slate-800 font-black text-sm sm:text-base leading-tight">{room.tour_title}</h1>
                            <p className="text-gray-500 text-[11px] sm:text-xs font-bold font-mono">
                                {room.tour_date} • <span className={wsConnected ? 'text-green-600' : 'text-gray-500'}>{wsConnected ? 'Çevrimiçi' : 'Bağlanıyor...'}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsGalleryOpen(true)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#008cb3] hover:bg-blue-50 rounded-full transition-colors relative" aria-label="Medya Arşivi" title="Medya Arşivi">
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                </div>
            </header>

            {/* Pinned Message */}
            {pinnedAnnouncement && (
                <div className="bg-yellow-50 border-b-2 border-yellow-400 p-3 flex gap-3 items-center shadow-sm z-10 sticky top-0" style={{ top: '64px' }}>
                    <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-yellow-800 uppercase">Kritik Duyuru</p>
                        <p className="text-sm text-yellow-900 truncate font-medium">{pinnedAnnouncement.content}</p>
                    </div>
                </div>
            )}

            {/* CHAT AREA */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar flex flex-col gap-4">
                {messages.length === 0 && (
                    <div className="flex justify-center mt-8">
                        <span className="text-gray-400 text-sm font-medium">Henüz mesaj yok. İlk mesajı sen yaz!</span>
                    </div>
                )}

                {messages.map((msg) => {
                    const role = roleFor(msg);
                    const isMe = role === 'me';
                    const isGuide = role === 'guide';
                    const senderName = msg.sender?.name || 'Misafir';
                    const avatar = (senderName[0] || '?').toUpperCase();

                    return (
                        <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                            <div className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm shadow-sm ${isMe ? 'bg-[#008cb3] text-white' : isGuide ? 'bg-orange-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {isGuide ? '👨‍✈️' : avatar}
                                </div>

                                <div className="flex flex-col gap-1">
                                    {!isMe && (
                                        <div className="flex items-center gap-2 pl-1 mb-0.5">
                                            <span className="text-xs font-bold text-slate-600">{senderName}</span>
                                            {isGuide && (
                                                <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase tracking-wider border border-orange-200 shadow-sm flex items-center gap-1">
                                                    👑 Rehber
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className={`px-4 py-2.5 shadow-sm text-[15px] leading-relaxed relative ${
                                        msg.message_type === 'announcement'
                                            ? 'bg-red-50 border-2 border-red-500 text-red-900 rounded-2xl'
                                            : isMe
                                                ? 'bg-[#008cb3] text-white rounded-2xl rounded-tr-sm'
                                                : isGuide
                                                    ? 'bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl rounded-tl-sm'
                                                    : 'bg-white border border-gray-100 text-slate-800 rounded-2xl rounded-tl-sm'
                                    }`}>
                                        {msg.message_type === 'location' && msg.content ? (
                                            <a href={msg.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold underline text-sm">
                                                📍 Konum
                                            </a>
                                        ) : (msg.message_type === 'media' || msg.message_type === 'meeting_point') && msg.media_file_url ? (
                                            <img src={msg.media_file_url} alt="Medya" className="max-w-full rounded-lg" />
                                        ) : (
                                            <span>
                                                {msg.message_type === 'announcement' && <span className="font-bold block mb-1 uppercase tracking-widest text-[11px] text-red-600">!! Önemli Duyuru !!</span>}
                                                {msg.content}
                                            </span>
                                        )}
                                    </div>

                                    <div className={`text-[10px] text-gray-400 font-bold font-mono px-1 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        {formatTime(msg.created_at)} {isMe && <span className="ml-1 text-blue-400 font-sans">✓✓</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} className="h-1 lg:h-4"></div>
            </div>

            {/* INPUT AREA */}
            <footer className="bg-white border-t border-gray-200 shrink-0 pb-[env(safe-area-inset-bottom)]">
                {room.is_readonly ? (
                    <div className="px-4 py-4 text-center text-sm font-semibold text-slate-500">
                        Bu tur tamamlandı — sohbet salt-okunur moda geçti.
                    </div>
                ) : (
                    <>
                        <div className="flex overflow-x-auto gap-2 px-4 py-3 custom-scrollbar snap-x no-scrollbar bg-slate-50 border-b border-gray-100">
                            {QUICK_REPLIES.map((reply, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(reply)}
                                    className="whitespace-nowrap bg-white border border-gray-200 hover:border-[#008cb3] hover:text-[#008cb3] text-slate-600 font-bold text-xs px-4 py-2 rounded-full shadow-sm snap-start transition-colors focus:outline-none focus:ring-2 focus:ring-[#008cb3]/20 active:scale-95"
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>

                        <div className="px-4 py-3 flex items-end gap-3">
                            <div className="relative flex-1 bg-gray-100 rounded-3xl border border-transparent shadow-inner focus-within:border-gray-200 focus-within:bg-white transition-colors flex items-center">
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(inputText);
                                        }
                                    }}
                                    placeholder="Bir mesaj yazın..."
                                    className="w-full max-h-32 min-h-[44px] bg-transparent resize-none outline-none text-[15px] font-medium text-slate-800 py-3 pl-4 pr-4 custom-scrollbar flex items-center"
                                    rows={1}
                                />
                            </div>

                            <button
                                onClick={() => handleSendMessage(inputText)}
                                disabled={!inputText.trim() || !wsConnected}
                                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all ${inputText.trim() && wsConnected ? 'bg-[#008cb3] text-white hover:bg-[#005e85] active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                aria-label="Gönder"
                            >
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="ml-1"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                            </button>
                        </div>
                    </>
                )}
            </footer>

            {/* Medya Arşivi Modal */}
            {isGalleryOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] animate-in fade-in duration-200">
                    <div className="flex justify-between items-center p-4 bg-black/50 text-white">
                        <h2 className="font-bold text-lg">Medya Arşivi</h2>
                        <button onClick={() => setIsGalleryOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                        {messages.filter((m) => m.media_file_url).length === 0 ? (
                            <div className="col-span-full flex items-center justify-center text-gray-400 py-10">
                                Henüz paylaşılan medya yok.
                            </div>
                        ) : (
                            messages
                                .filter((m) => m.media_file_url)
                                .map((m) => (
                                    <div key={m.id} className="aspect-square bg-gray-800 rounded-xl overflow-hidden relative">
                                        <Image src={m.media_file_url as string} alt="Medya" fill sizes="(max-width: 768px) 33vw, 200px" className="object-cover" />
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}

export default function GroupChatPage() {
    return (
        <Suspense fallback={
            <main className="flex items-center justify-center h-[100dvh] bg-[#F2F2F7] font-sans">
                <p className="text-slate-500 font-semibold">Sohbet yükleniyor...</p>
            </main>
        }>
            <GroupChatView />
        </Suspense>
    );
}
