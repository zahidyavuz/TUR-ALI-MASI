'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from '../context/LocaleContext';

interface Option {
    id: string;
    title: string;
    location: string;
    duration: string;
    price: number;
    image: string;
    miniItinerary: string;
}

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    isTyping?: boolean;
    options?: Option[];
    isLead?: boolean;
    leadData?: any;
}

export default function Chatbot() {
    const router = useRouter();
    const pathname = usePathname();
    const { locale, formatPrice } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const [autoOpenDisabled, setAutoOpenDisabled] = useState(false);

    // Load auto-open preference from session
    useEffect(() => {
        const disabled = sessionStorage.getItem('cappo_auto_open_disabled');
        if (disabled === 'true') setAutoOpenDisabled(true);
    }, []);

    // Dynamic welcome message
    const initialMsgs: Record<string, string> = {
        'tr-TR': "Merhaba! Ben Cappo, Türkiye'nin her köşesini avucunun içi gibi bilen kıdemli seyahat danışmanın. Hayalindeki tatili anlat, senin için efsanevi bir rota çizeyim.",
        'en-US': "Hi there! I'm Cappo, your Senior Travel Specialist. Tell me about your dream Turkish vacation, and I'll craft the perfect itinerary.",
        'de-DE': "Hallo! Ich bin Cappo, dein Senior Travel Specialist für die Türkei. Erzähl mir von deinem Traumurlaub.",
        'zh-CN': "您好！我是 Cappo，您的土耳其高级旅行专家。告诉我您梦寐以求的假期吧。"
    };

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Update initial message when locale changes
    useEffect(() => {
        setMessages([{ id: 1, text: initialMsgs[locale] || initialMsgs['tr-TR'], sender: 'bot' }]);
    }, [locale]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Smart Interruption (Inactivity Timer / Contextual Help)
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                // If auto-open is disabled or already open, don't trigger
                if (autoOpenDisabled || isOpen) return;

                // If inactive for 30 seconds, pro-actively jump in
                let message = "Nasıl yardımcı olabilirim? Sana Türkiye'nin en güzel köşelerinden efsanevi bir rota çizebilirim.";

                if (pathname === '/') {
                    message = "Türkiye'nin gizli cennetlerini keşfetmek ister misin? Bana sadece kaç gün vaktin olduğunu söyle.";
                } else if (pathname.includes('/tour')) {
                    message = "Bu turun içeriği harikadır! Ancak rotayla ilgili kıyafet veya hava durumu tavsiyesine ihtiyacın varsa hemen yardımcı olabilirim.";
                } else if (pathname.includes('/agency')) {
                    message = "Acenta detaylarına bakıyorsun sanırım. Senin için en verimli turları filtreleyebilirim.";
                } else if (pathname.includes('/checkout')) {
                    message = "Ödeme adımındasın. Tüm işlemler şifreli ve güvendedir. Aklına takılan bir detay var mı?";
                }

                setIsOpen(true);
                setMessages(prev => {
                    // Prevent spamming the same idle message
                    if (prev.length > 0 && prev[prev.length - 1].text === message) return prev;
                    return [...prev, { id: Date.now(), text: message, sender: 'bot' }];
                });
            }, 30000); // 30 seconds
        };

        // Listen for user activity
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        window.addEventListener('click', resetTimer);
        window.addEventListener('scroll', resetTimer);

        // Initial setup
        resetTimer();

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('scroll', resetTimer);
        };
    }, [pathname, autoOpenDisabled, isOpen]);

    // Listener for external actions (like error handling from forms, or site tour trigger)
    useEffect(() => {
        const handleChatbotAction = (e: any) => {
            if (e.detail?.action === 'error_help') {
                setIsOpen(true);
                setMessages(prev => [...prev, { id: Date.now(), text: e.detail.message, sender: 'bot' }]);
            } else if (e.detail?.action === 'site_tour') {
                setIsOpen(true);
                setMessages(prev => [...prev, { id: Date.now(), text: "Hoş geldin! Ben Cappo. Türkiye'de unutulmaz bir deneyim yaşaman için buradayım. İstediğin bir rota varsa, hava durumundan bütçesine kadar her detayını birlikte planlayabiliriz.", sender: 'bot' }]);
            }
        };

        window.addEventListener('chatbot-action', handleChatbotAction);
        return () => window.removeEventListener('chatbot-action', handleChatbotAction);
    }, []);

    // Welcome / Site Tour triggering on very first visit
    useEffect(() => {
        if (typeof window !== 'undefined' && pathname === '/') {
            const hasSeenIntro = localStorage.getItem('hasSeenIntro');
            if (!hasSeenIntro) {
                const timer = setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('chatbot-action', {
                        detail: { action: 'site_tour' }
                    }));
                    localStorage.setItem('hasSeenIntro', 'true');
                }, 8000); // Trigger after 8 seconds
                return () => clearTimeout(timer);
            }
        }
    }, [pathname]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');

        // Add User Message
        const newMsgId = Date.now();
        setMessages(prev => [...prev, { id: newMsgId, text: userMsg, sender: 'user' }]);

        // Add Typing Indicator
        setLoading(true);
        const typingId = newMsgId + 1;
        setMessages(prev => [...prev, { id: typingId, text: '', sender: 'bot', isTyping: true }]);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, locale, pathname })
            });
            const data = await res.json();

            // Handle specific actions returned from the AI
            if (data.action === 'navigate' && data.actionData) {
                router.push(data.actionData);
            } else if (data.action === 'guide' && data.actionData === 'reservation_step_1') {
                // Highlight search bar
                const searchBar = document.querySelector('[data-dropdown="searchBar"]');
                if (searchBar) {
                    searchBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    searchBar.classList.add('ring-4', 'ring-indigo-500', 'animate-pulse');
                    setTimeout(() => searchBar.classList.remove('ring-4', 'ring-indigo-500', 'animate-pulse'), 4000);
                }
            }

            // Replace Typing Indicator with actual response
            setMessages(prev => prev.map(m => {
                if (m.id === typingId) {
                    return { ...m, isTyping: false, text: data.reply, options: data.options, isLead: data.isLead, leadData: data.leadData };
                }
                return m;
            }));
        } catch (error) {
            setMessages(prev => prev.map(m => {
                if (m.id === typingId) {
                    return { ...m, isTyping: false, text: "Bağlantıda bir sorun oldu. Daha sonra tekrar deneyin." };
                }
                return m;
            }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-12 right-6 z-[999999] flex flex-col items-end pointer-events-none">
            {/* Chatbot Window */}
            <div
                className={`pointer-events-auto transition-all duration-500 ease-in-out origin-bottom-right mb-4 bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl overflow-hidden flex flex-col w-[90vw] md:w-[400px] h-[600px] max-w-[400px] max-h-[80vh] ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 shrink-0 flex items-center justify-between shadow-md relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-white shadow-inner">
                            AI
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm tracking-wide">
                                Cappo
                            </h3>
                            <p className="text-blue-100 text-xs flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                Senior Travel Specialist
                            </p>
                        </div>
                    </div>
                    <button aria-label="Chatbot Kapat" onClick={() => {
                        setIsOpen(false);
                        setAutoOpenDisabled(true);
                        sessionStorage.setItem('cappo_auto_open_disabled', 'true');
                    }} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            {/* Message Bubble */}
                            <div className={`max-w-[85%] rounded-[20px] px-4 py-2.5 text-sm font-medium shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-slate-700 rounded-tl-sm'}`}>
                                {msg.isTyping ? (
                                    <div className="flex gap-1 items-center h-4 px-2">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                    </div>
                                ) : (
                                    <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                                )}
                            </div>

                            {/* Trip Options (if any) */}
                            {msg.options && msg.options.length > 0 && (
                                <div className="mt-3 flex flex-nowrap overflow-x-auto gap-3 pb-2 w-full snap-x">
                                    {msg.options.map((opt, i) => (
                                        <div key={opt.id} className="min-w-[220px] bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-md shrink-0 snap-start flex flex-col">
                                            <div className="h-28 overflow-hidden relative">
                                                <Image src={opt.image} alt={opt.title} fill sizes="(max-width: 768px) 100vw, 250px" className="object-cover" />
                                                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-black px-2 py-0.5 rounded-full text-indigo-700">
                                                    {locale === 'en-US' ? `Option ${i + 1}` : locale === 'de-DE' ? `Option ${i + 1}` : locale === 'zh-CN' ? `奢华方案 ${i + 1}` : `Opsiyon ${i + 1}`}
                                                </div>
                                            </div>
                                            <div className="p-3 flex flex-col flex-1">
                                                <h4 className="font-bold text-sm text-slate-800 line-clamp-1 mb-1">{opt.title}</h4>
                                                <p className="text-[10px] font-semibold text-gray-500 mb-2">{opt.duration} - {formatPrice(opt.price)}</p>

                                                {/* Mini Itinerary Block */}
                                                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2 mb-3">
                                                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider mb-1">
                                                        {locale === 'en-US' ? 'Vibe Check' : locale === 'de-DE' ? 'Reiseplan' : locale === 'zh-CN' ? '专属行程' : 'Rotanız'}
                                                    </p>
                                                    <div className="text-[10px] text-gray-600 font-medium whitespace-pre-line leading-tight">
                                                        {opt.miniItinerary}
                                                    </div>
                                                </div>

                                                {/* Link Button */}
                                                <Link href={`/tour/${opt.id}`} className="mt-auto block w-full text-center bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold py-2 rounded-xl transition-colors">
                                                    {locale === 'en-US' ? 'Check Details ➔' : locale === 'de-DE' ? 'Details Ansehen ➔' : locale === 'zh-CN' ? '查看详情 ➔' : 'Detaylı İncele ➔'}
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Lead Generation Form (if out of scope) */}
                            {msg.isLead && msg.leadData && (
                                <div className="mt-3 w-full bg-orange-50/80 border border-orange-200 rounded-2xl overflow-hidden shadow-sm flex flex-col relative shrink-0">
                                    {msg.leadData.image && (
                                        <div className="h-24 overflow-hidden relative">
                                            <Image src={msg.leadData.image} alt={msg.leadData.title} fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-orange-900/60 to-transparent"></div>
                                            <div className="absolute bottom-2 left-3 right-3">
                                                <h4 className="font-bold text-white text-sm line-clamp-1 tracking-wide">{msg.leadData.title}</h4>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-3">
                                        <p className="text-xs text-orange-800 font-medium mb-3 leading-snug">
                                            Çok yakında bu harika rota da sistemimizde olacak. İlk katılanlardan olmak ve özel <span className="font-black">%25 indirim</span> kazanmak ister misiniz?
                                        </p>
                                        <div className="flex flex-col gap-2">
                                            <input type="email" placeholder="E-posta adresiniz..." className="w-full text-xs bg-white border border-orange-200 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400" />
                                            <button onClick={(e) => {
                                                const btn = e.currentTarget;
                                                const inp = btn.previousElementSibling as HTMLInputElement;
                                                if (inp.value.includes('@')) {
                                                    const email = inp.value;
                                                    btn.innerHTML = 'Kaydediliyor...';
                                                    btn.disabled = true;
                                                    
                                                    fetch('http://localhost:8000/api/v1/leads/', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            email: email,
                                                            tour_interest: msg.leadData?.title || 'Bilinmiyor'
                                                        })
                                                    }).then(() => {
                                                        btn.innerHTML = '✓ Kaydedildi, teşekkürler!';
                                                        btn.className = "w-full text-xs font-bold text-white bg-green-500 rounded-lg py-2 cursor-default";
                                                        inp.disabled = true;
                                                    }).catch(() => {
                                                        btn.innerHTML = 'Hata Oluştu';
                                                        btn.disabled = false;
                                                    });
                                                } else {
                                                    inp.style.borderColor = 'red';
                                                }
                                            }} className="w-full text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg py-2 transition-colors">
                                                İndirim Kuponunu Gönder
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-orange-400 mt-2 text-center">İstenmeyen e-posta göndermeyiz, söz! 🤞</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 shrink-0">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            aria-label="Tatil Rotası Mesajı"
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={locale === 'en-US' ? 'Type a vibe or destination...' : locale === 'de-DE' ? 'Träumen Sie von...' : locale === 'zh-CN' ? '输入您的奢华旅行想法......' : 'Bir tatil rotası hayal edin...'}
                            className="w-full bg-slate-50 border border-gray-200 text-sm rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800 font-medium placeholder-gray-400"
                        />
                        <button
                            type="submit"
                            aria-label="Mesaj Gönder"
                            disabled={!input.trim() || loading}
                            className="absolute right-1 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 flex items-center justify-center text-white transition-colors"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[9px] font-semibold text-gray-400">
                            {locale === 'en-US' ? 'AI responses are generated as suggestions only.' : locale === 'de-DE' ? 'KI-Antworten dienen nur als Empfehlung.' : locale === 'zh-CN' ? 'AI管家的回复仅作为参考建议。' : 'Yapay zeka önerileri bilgilendirme amaçlıdır.'}
                        </span>
                    </div>
                </form>
            </div>

            {/* Toggle Button */}
            <button
                aria-label="Sohbet Asistanını Aç/Kapat"
                onClick={() => setIsOpen(!isOpen)}
                className={`pointer-events-auto flex items-center justify-center text-white rounded-full shadow-2xl transition-all duration-300 z-50 cursor-pointer ${isOpen ? 'h-16 w-16 bg-red-500 hover:bg-red-600 scale-90' : 'h-14 px-6 gap-3 bg-[#008cb3] hover:bg-[#005e85] hover:-translate-y-1'}`}
            >
                {isOpen ? (
                    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <>
                        <div className="relative flex-shrink-0">
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.35-1.754-.988-2.386l-.548-.547z" /></svg>
                            <div className="absolute top-[-2px] right-[-2px] w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#008cb3] animate-pulse"></div>
                        </div>
                        <span className="font-extrabold text-[15px] tracking-wide whitespace-nowrap hidden sm:block">
                            Cappo
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}
