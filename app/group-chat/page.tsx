'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Message {
    id: number;
    senderId: string;
    senderName: string;
    role: 'guide' | 'user' | 'me';
    text: string;
    time: string;
    avatar: string;
    type?: 'text' | 'announcement' | 'location' | 'media';
    isPinned?: boolean;
    mediaUrl?: string;
    locationUrl?: string;
}

const INITIAL_MESSAGES: Message[] = [
    {
        id: 1,
        senderId: 'user1',
        senderName: 'Ayşe T.',
        role: 'user',
        text: 'Herkese günaydın! Servis nerede kaldı acaba?',
        time: '04:15',
        avatar: 'A'
    },
    {
        id: 2,
        senderId: 'guide1',
        senderName: 'Ahmet (Rehber)',
        role: 'guide',
        text: 'Günaydın Ayşe Hanım, 5 dakika içinde otelinizin önünde olacağız. Trafik çok hafif sıkıştı. 🙏',
        time: '04:17',
        avatar: '👨‍✈️'
    },
    {
        id: 3,
        senderId: 'me1',
        senderName: 'Ben',
        role: 'me',
        text: 'Ben lobiye indim, bekliyorum.',
        time: '04:18',
        avatar: 'M',
        type: 'text'
    },
    {
        id: 4,
        senderId: 'guide1',
        senderName: 'Ahmet (Rehber)',
        role: 'guide',
        text: '📍 Değerli Misafirlerimiz, bugünkü turumuz için Göreme Açık Hava Müzesi önünde saat 09:00\'da buluşuyoruz. Lütfen geç kalmayınız!',
        time: '08:00',
        avatar: '👨‍✈️',
        type: 'announcement',
        isPinned: true
    },
    {
        id: 5,
        senderId: 'guide1',
        senderName: 'Ahmet (Rehber)',
        role: 'guide',
        text: 'Konum',
        time: '08:02',
        avatar: '👨‍✈️',
        type: 'location',
        locationUrl: 'https://maps.app.goo.gl/g6Jd2JQK1YF1W3zF6'
    }
];

const QUICK_REPLIES = [
    '📍 Konum Paylaş',
    'Buldum! 🙋',
    'Gecikiyorum 🏃',
    'Konum atar mısınız? 🗺️',
    'Anlaşıldı 👍'
];

export default function GroupChatPage() {
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Otomatik olarak hep en alta kaydır
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (text: string) => {
        if (!text.trim()) return;

        const messageType = text === '📍 Konum Paylaş' ? 'location' : 'text';

        const newMessage: Message = {
            // eslint-disable-next-line react-hooks/purity
            id: Date.now(),
            senderId: 'me1',
            senderName: 'Ben',
            role: 'me',
            text: messageType === 'location' ? 'Mevcut Konum' : text,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            avatar: 'M',
            type: messageType,
            locationUrl: messageType === 'location' ? 'https://maps.google.com/?q=38.6431,34.8291' : undefined
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputText('');
    };

    const pinnedAnnouncement = messages.find(m => m.isPinned && m.type === 'announcement');

    return (
        <main className="flex flex-col h-[100dvh] bg-[#F2F2F7] font-sans overflow-hidden">
            {/* 1. HEADER (Başlık Bölümü) */}
            <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-20 shrink-0 pt-[env(safe-area-inset-top)]">
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-10 h-10 flex items-center justify-center text-[#008cb3] bg-blue-50 hover:bg-blue-100 rounded-full transition-colors">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden border border-orange-200 shrink-0 shadow-sm">
                            <span className="text-xl">🎈</span>
                            {/* Aktiflik Noktası */}
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-slate-800 font-black text-sm sm:text-base leading-tight">Kapadokya Turu 🌅</h1>
                            <p className="text-gray-500 text-[11px] sm:text-xs font-bold font-mono">15 Kişi • <span className="text-green-600">Rehber Çevrimiçi</span></p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsGalleryOpen(true)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#008cb3] hover:bg-blue-50 rounded-full transition-colors relative" aria-label="Medya Arşivi" title="Medya Arşivi">
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#008cb3] hover:bg-blue-50 rounded-full transition-colors" title="Seçenekler">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                    </button>
                </div>
            </header>

            {/* Pinned Message */}
            {pinnedAnnouncement && (
                <div className="bg-yellow-50 border-b-2 border-yellow-400 p-3 flex gap-3 items-center shadow-sm z-10 sticky top-0" style={{top: '64px'}}>
                    <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/></svg>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-yellow-800 uppercase">Kritik Duyuru</p>
                        <p className="text-sm text-yellow-900 truncate font-medium">{pinnedAnnouncement.text}</p>
                    </div>
                </div>
            )}

            {/* 2. CHAT AREA (Mesaj Balonları) */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar flex flex-col gap-4">
                {/* Tarih Bandı */}
                <div className="flex justify-center mb-2">
                    <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                        Bugün
                    </span>
                </div>

                {messages.map((msg) => {
                    const isMe = msg.role === 'me';
                    const isGuide = msg.role === 'guide';

                    return (
                        <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                            <div className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm shadow-sm ${isMe ? 'bg-[#008cb3] text-white' :
                                        isGuide ? 'bg-orange-500 text-white' :
                                            'bg-indigo-100 text-indigo-700'
                                    }`}>
                                    {msg.avatar}
                                </div>

                                {/* Balon İçeriği */}
                                <div className="flex flex-col gap-1">
                                    {/* Gönderen Adı & Rol */}
                                    {!isMe && (
                                        <div className="flex items-center gap-2 pl-1 mb-0.5">
                                            <span className="text-xs font-bold text-slate-600">{msg.senderName}</span>
                                            {isGuide && (
                                                <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase tracking-wider border border-orange-200 shadow-sm flex items-center gap-1">
                                                    👑 Rehber
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Balonun Kendisi */}
                                    <div className={`px-4 py-2.5 shadow-sm text-[15px] leading-relaxed relative ${
                                        msg.type === 'announcement' 
                                            ? 'bg-red-50 border-2 border-red-500 text-red-900 rounded-2xl' 
                                            : isMe
                                                ? 'bg-[#008cb3] text-white rounded-2xl rounded-tr-sm'
                                                : isGuide
                                                    ? 'bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl rounded-tl-sm'
                                                    : 'bg-white border border-gray-100 text-slate-800 rounded-2xl rounded-tl-sm'
                                        }`}>
                                        {msg.type === 'location' ? (
                                            <a href={msg.locationUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2">
                                                <div className="w-full h-24 bg-gray-200 rounded-lg overflow-hidden relative">
                                                    <img src="https://maps.googleapis.com/maps/api/staticmap?center=38.6431,34.8291&zoom=14&size=400x150&sensor=false" alt="Map" className="w-full h-full object-cover opacity-80" onError={(e) => { e.currentTarget.src='https://placehold.co/400x150/e2e8f0/475569.png?text=Harita+Görünümü' }} />
                                                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-red-500 text-3xl drop-shadow-md">📍</span></div>
                                                </div>
                                                <span className="font-bold underline text-sm">{msg.text} (Buluşma Noktası)</span>
                                            </a>
                                        ) : msg.type === 'media' && msg.mediaUrl ? (
                                            <img src={msg.mediaUrl} alt="Medya" className="max-w-full rounded-lg" />
                                        ) : (
                                            <span>
                                                {msg.type === 'announcement' && <span className="font-bold block mb-1 uppercase tracking-widest text-[11px] text-red-600">!! Önemli Duyuru !!</span>}
                                                {msg.text}
                                            </span>
                                        )}
                                    </div>

                                    {/* Saat */}
                                    <div className={`text-[10px] text-gray-400 font-bold font-mono px-1 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        {msg.time} {isMe && <span className="ml-1 text-blue-400 font-sans">✓✓</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} className="h-1 lg:h-4"></div>
            </div>

            {/* 3. INPUT AREA & QUICK REPLIES */}
            <footer className="bg-white border-t border-gray-200 shrink-0 pb-[env(safe-area-inset-bottom)]">
                {/* Hızlı Mesajlar (Horizontal Kaydırılabilir) */}
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

                {/* Yazma Alanı */}
                <div className="px-4 py-3 flex items-end gap-3">
                    {/* Artı / Konum İkonu */}
                    <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-slate-800 transition-colors shrink-0 shadow-sm" aria-label="Eklenti Çekmecesi (Konum, Fotoğraf)">
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    </button>

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
                            className="w-full max-h-32 min-h-[44px] bg-transparent resize-none outline-none text-[15px] font-medium text-slate-800 py-3 pl-4 pr-12 custom-scrollbar flex items-center"
                            rows={1}
                        />
                        {/* Konum / Mikrofon Kısmı Sağ Köşe */}
                        <div className="absolute right-3 bottom-[11px] flex items-center gap-1">
                            <button className="text-gray-400 hover:text-green-500 transition-colors" title="Konum Gönder">
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Gönder Butonu */}
                    <button
                        onClick={() => handleSendMessage(inputText)}
                        disabled={!inputText.trim()}
                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all ${inputText.trim() ? 'bg-[#008cb3] text-white hover:bg-[#005e85] active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        aria-label="Gönder"
                    >
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="ml-1"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                    </button>
                </div>
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
                        {/* Mock Images */}
                        <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden relative group">
                            <img src="https://images.unsplash.com/photo-1627885375535-61266b02a7b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" alt="Medya 1" className="w-full h-full object-cover" />
                        </div>
                        <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden relative group flex items-center justify-center flex-col gap-2 p-4 text-center">
                            <svg width="48" height="48" fill="none" stroke="currentColor" className="text-red-500" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/><path d="M9 9h3v3M12 9v4"/></svg>
                            <span className="text-white text-[10px] font-bold">Tur_Programi.pdf</span>
                        </div>
                        <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden relative group">
                            <img src="https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400" alt="Medya 2" className="w-full h-full object-cover" />
                        </div>
                        <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center text-gray-400">
                            Hiç Paylaşım Yok
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
