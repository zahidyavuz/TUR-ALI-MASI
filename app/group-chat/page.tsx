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
        avatar: 'M'
    }
];

const QUICK_REPLIES = [
    'Buldum! 📍',
    'Gecikiyorum 🏃',
    'Konum atar mısınız? 🗺️',
    'Geliyorum ⏳',
    'Anlaşıldı 👍'
];

export default function GroupChatPage() {
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [inputText, setInputText] = useState('');
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

        const newMessage: Message = {
            id: Date.now(),
            senderId: 'me1',
            senderName: 'Ben',
            role: 'me',
            text: text,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            avatar: 'M'
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputText('');
    };

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
                <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#008cb3] hover:bg-blue-50 rounded-full transition-colors">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
            </header>

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
                                    <div className={`px-4 py-2.5 shadow-sm text-[15px] leading-relaxed relative ${isMe
                                            ? 'bg-[#008cb3] text-white rounded-2xl rounded-tr-sm'
                                            : isGuide
                                                ? 'bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl rounded-tl-sm' // Rehbere özel dikkat çekici ama göz yormayan soft mavi arka plan
                                                : 'bg-white border border-gray-100 text-slate-800 rounded-2xl rounded-tl-sm'
                                        }`}>
                                        {msg.text}
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
        </main>
    );
}
