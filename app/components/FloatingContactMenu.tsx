'use client';

import { useState } from 'react';

export default function FloatingContactMenu() {
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        {
            id: 'whatsapp',
            label: 'WhatsApp',
            url: 'https://wa.me/905555555555?text=Merhaba,%20Tourkia%20turları%20hakkında%20bilgi%20almak%20istiyorum.',
            bgClass: 'bg-[#25D366] hover:bg-[#1ebe57]',
            icon: (
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766 0 1.011.258 1.988.746 2.853l-.815 2.978 3.048-.799c.84.453 1.776.691 2.76.691h.001c3.18 0 5.767-2.586 5.767-5.766 0-3.18-2.587-5.767-5.768-5.767zm3.174 8.019c-.174.492-.932.932-1.334.981-.365.044-.813.125-2.296-.492-1.782-.739-2.915-2.541-3.001-2.656-.086-.115-.715-.951-.715-1.815 0-.865.452-1.291.609-1.455.157-.164.341-.205.456-.205s.23.004.331.009c.101.005.241-.039.369.271.135.326.46 1.127.502 1.213.042.086.071.186.015.301-.057.115-.086.187-.172.287-.086.1-.186.231-.258.312-.086.1-.176.211-.074.385.101.174.453.748.971 1.209.67.595 1.233.782 1.407.868.174.086.275.072.378-.043.102-.115.441-.512.559-.688.118-.176.236-.145.394-.086.158.057.994.469 1.166.555.172.086.287.129.329.2.042.072.042.42-.132.912z" />
                    <path d="M12.012 2C6.49 2 2.01 6.476 2.01 11.996c0 1.764.461 3.483 1.336 4.998L2 22l5.122-1.341c1.474.802 3.136 1.222 4.887 1.222.003 0 .005 0 .008 0 5.522 0 10.002-4.478 10.002-9.998C22.019 6.478 17.534 2 12.012 2zm0 18.232c-.002 0-.004 0-.006 0-1.487 0-2.943-.399-4.218-1.154l-.304-.18-3.134.821.836-3.056-.197-.313c-.829-1.32-1.266-2.85-1.266-4.417 0-4.604 3.746-8.35 8.35-8.35 4.603 0 8.349 3.745 8.349 8.349 0 4.605-3.748 8.351-8.353 8.351z" />
                </svg>
            )
        },
        {
            id: 'telegram',
            label: 'Telegram',
            url: 'https://t.me/tourkia',
            bgClass: 'bg-[#0088cc] hover:bg-[#0077b5]',
            icon: (
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
            )
        },
        {
            id: 'messenger',
            label: 'Messenger',
            url: 'https://m.me/tourkia',
            bgClass: 'bg-gradient-to-tr from-[#00A2F1] via-[#8D3BFF] to-[#FF555B] hover:opacity-90',
            icon: (
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.25 5.53 3.32 7.35v3.83l3.52-1.94c1 .28 2.06.43 3.16.43 5.64 0 10-4.13 10-9.67S17.64 2 12 2zm1.09 13.06l-2.78-3.03-5.4 3.03 5.95-6.32 2.87 3.03 5.31-3.03-5.95 6.32z" />
                </svg>
            )
        },
        {
            id: 'viber',
            label: 'Viber',
            url: 'viber://chat?number=905555555555',
            bgClass: 'bg-[#7360f2] hover:bg-[#6650db]',
            icon: (
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.016 11.455c-.067-5.59-4.834-10.457-10.485-10.455-5.748.002-10.531 4.786-10.531 10.534 0 2.217.683 4.27 1.838 5.961-.258.948-1.547 4.793-1.636 5.093l-.01.037.009-.001c.143 0 4.144-1.295 4.97-1.571 1.554.782 3.313 1.218 5.166 1.205l.235-.008c5.632-.387 10.518-5.32 10.444-10.795zm-6.19 5.86c-.503.228-4.507.95-6.666-1.55-2.001-2.316-1.1-6.103-.946-6.444.204-.452.793-1.025 1.297-1.069.176-.015.352.052.482.186l1.378 1.488c.193.208.283.473.235.728-.052.274-.476.541-.476.541s-.11.135-.125.195c-.179.697 1.341 2.395 2.126 2.502.057.008.188-.109.188-.109s.258-.415.522-.457c.245-.038.5.045.698.225l1.624 1.488c.159.146.241.332.235.52l-.007.24a1.868 1.868 0 01-1.096 1.486z" />
                </svg>
            )
        }
    ];

    return (
        <div className="fixed bottom-6 left-6 z-[100] flex flex-col items-center">

            {/* Açılır Menü Container'ı */}
            <div className={`flex flex-col-reverse gap-3 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom ${isOpen
                ? 'opacity-100 scale-100 translate-y-[-16px] pointer-events-auto'
                : 'opacity-0 scale-50 translate-y-4 pointer-events-none'
                }`}>
                {menuItems.map((item, idx) => (
                    <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-12 h-12 rounded-full ${item.bgClass} text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 group relative`}
                        style={{ transitionDelay: isOpen ? `${idx * 40}ms` : '0ms' }}
                    >
                        {item.icon}

                        {/* Soldan sağa açılan Tooltip */}
                        <span className="absolute left-[calc(100%+14px)] bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap shadow-sm">
                            {item.label}
                            {/* Üçgen (Ok) kısmı */}
                            <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></span>
                        </span>
                    </a>
                ))}
            </div>

            {/* Ana Modül Butonu */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 ${isOpen ? 'bg-slate-800' : 'bg-gradient-to-tr from-[#008cb3] to-[#005e85]'} text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.3)] z-10 active:scale-90`}
                aria-label="İletişim Menüsünü Aç"
            >
                <div className="relative w-[28px] h-[28px] flex items-center justify-center">
                    {/* Çarpı İkonu (Açıkken) */}
                    <svg
                        width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        className={`absolute transition-all duration-300 ${isOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-50'}`}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>

                    {/* Mesaj (Chat) İkonu (Kapalıyken) */}
                    <svg
                        width="26" height="26" viewBox="0 0 24 24" fill="currentColor"
                        className={`absolute transition-all duration-300 ${!isOpen ? 'rotate-0 opacity-100 scale-100' : 'rotate-90 opacity-0 scale-50'}`}
                    >
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.5 21.5l4.5-.838A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm5 11h-2v-2h2v2zm-4 0h-2v-2h2v2zm-4 0H7v-2h2v2z"/>
                    </svg>
                </div>

                {/* Bildirim Noktası (Kapalıyken) */}
                {!isOpen && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#005e85] animate-pulse"></span>
                )}
            </button>
        </div >
    );
}
