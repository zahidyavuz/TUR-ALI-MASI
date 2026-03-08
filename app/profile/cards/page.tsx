'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CreditCard {
    id: string;
    alias: string;
    cardHolder: string;
    cardNumber: string; // Stored as masked except last 4 or full for local demo
    expiry: string;
    type: 'Visa' | 'Mastercard' | 'Amex' | 'Unknown';
    isDefault: boolean;
}

export default function CardsPage() {
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [isClient, setIsClient] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [newCard, setNewCard] = useState({
        alias: '',
        cardHolder: '',
        cardNumber: '',
        expiry: ''
    });

    useEffect(() => {
        setIsClient(true);
        const savedCards = localStorage.getItem('melih_tours_cards');
        if (savedCards) {
            setCards(JSON.parse(savedCards));
        }
    }, []);

    const saveCards = (newCards: CreditCard[]) => {
        setCards(newCards);
        localStorage.setItem('melih_tours_cards', JSON.stringify(newCards));
    };

    const detectCardType = (number: string): 'Visa' | 'Mastercard' | 'Amex' | 'Unknown' => {
        const cleanNumber = number.replace(/\D/g, '');
        if (cleanNumber.startsWith('4')) return 'Visa';
        if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'Mastercard';
        if (/^3[47]/.test(cleanNumber)) return 'Amex';
        return 'Unknown';
    };

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.substring(0, 16); // Max 16 digits
        const groups = value.match(/.{1,4}/g);
        const formatted = groups ? groups.join(' ') : value;
        setNewCard(prev => ({ ...prev, cardNumber: formatted }));
    };

    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.substring(0, 4);
        if (value.length > 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        setNewCard(prev => ({ ...prev, expiry: value }));
    };

    const handleAddCard = (e: React.FormEvent) => {
        e.preventDefault();

        const cleanNumber = newCard.cardNumber.replace(/\D/g, '');
        if (cleanNumber.length < 15) {
            alert('Lütfen geçerli bir kart numarası giriniz.');
            return;
        }

        const type = detectCardType(cleanNumber);

        const newCardEntry: CreditCard = {
            id: Date.now().toString(),
            alias: newCard.alias || 'Yeni Kartım',
            cardHolder: newCard.cardHolder.toUpperCase(),
            cardNumber: newCard.cardNumber,
            expiry: newCard.expiry,
            type,
            isDefault: cards.length === 0 // İlk eklenen kart varsayılan olur
        };

        saveCards([...cards, newCardEntry]);
        setShowModal(false);
        setNewCard({ alias: '', cardHolder: '', cardNumber: '', expiry: '' });
    };

    const handleDelete = (id: string) => {
        const updatedCards = cards.filter(c => c.id !== id);
        if (updatedCards.length > 0 && cards.find(c => c.id === id)?.isDefault) {
            updatedCards[0].isDefault = true;
        }
        saveCards(updatedCards);
    };

    const handleSetDefault = (id: string) => {
        const updatedCards = cards.map(c => ({
            ...c,
            isDefault: c.id === id
        }));
        saveCards(updatedCards);
    };

    const getCardLogoPath = (type: string) => {
        if (type === 'Visa') return (
            <svg width="40" height="24" viewBox="0 0 100 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M41.7 1.056H31.1L24 23.328h9.8c0 0 1.2-3.6 1.4-4.5h11.9c.2 1.3 2 4.5 2 4.5h8.9L41.7 1.056zm-4.3 12.8h-7.6l3.6-10.3h1.8l2.2 10.3zm41.6-12.8H70L62.7 23.328h9.6l1.3-3.6h10l.9 3.6h9.1L79 1.056zm-10.5 13h-7.6l3.6-10.4h1.7l2.3 10.4z" fill="#fff" /></svg>
        );
        if (type === 'Mastercard') return (
            <svg width="40" height="24" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#EB001B" /><circle cx="22" cy="10" r="10" fill="#F79E1B" fillOpacity="0.8" /></svg>
        );
        return <span className="font-bold italic text-white/50">{type}</span>;
    };

    if (!isClient) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-12 font-sans overflow-x-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                {/* Üst Kısım: Başlık & Navigasyon */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#005e85] tracking-tight">Ödeme Kartlarım</h1>
                        <p className="text-gray-500 font-medium text-sm mt-1 flex items-center gap-2">
                            <Link href="/profile" className="hover:text-[#008cb3] transition-colors flex items-center gap-1">
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Profilime Dön
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 md:p-8 min-h-[500px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg></div>
                            Kayıtlı Kartlar ({cards.length})
                        </h3>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-[#008cb3] hover:bg-[#005e85] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Yeni Kart Ekle
                        </button>
                    </div>

                    {cards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50 border-2 border-dashed border-gray-200 rounded-3xl">
                            <div className="w-20 h-20 bg-blue-50 text-[#008cb3] rounded-full flex items-center justify-center mb-4">
                                <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 mb-2">Henüz bir kart eklemediniz kanka</h4>
                            <p className="text-sm text-gray-500 max-w-sm mb-6">Hızlı rezervasyon yapmak ve ödemelerde kolaylık sağlamak için hemen yeni bir kart tanımlayabilirsin.</p>
                            <button onClick={() => setShowModal(true)} className="text-[#008cb3] font-bold text-sm bg-white border border-gray-200 px-6 py-2.5 rounded-xl hover:border-[#008cb3] hover:bg-blue-50 transition-colors">
                                Hemen Kart Ekle
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                            {cards.map(card => {
                                const last4 = card.cardNumber.replace(/\s/g, '').slice(-4);
                                return (
                                    <div key={card.id} className="relative group">
                                        {/* Card Design (Glassmorphism) */}
                                        <div className={`relative overflow-hidden rounded-[20px] p-6 text-white shadow-xl transition-transform duration-300 group-hover:-translate-y-1 ${card.type === 'Visa' ? 'bg-gradient-to-br from-[#1a1f71] to-[#3643b5]' : card.type === 'Mastercard' ? 'bg-gradient-to-br from-[#1c1c1c] to-[#383838]' : 'bg-gradient-to-br from-indigo-700 to-purple-800'}`}>
                                            {/* Glass Overlay */}
                                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 backdrop-blur-3xl"></div>
                                            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white/10 backdrop-blur-3xl"></div>

                                            <div className="relative z-10 flex justify-between items-start mb-8">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">{card.alias}</span>
                                                    {card.isDefault && <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded flex items-center gap-1 mt-1 w-max"><svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Varsayılan</span>}
                                                </div>
                                                <div>{getCardLogoPath(card.type)}</div>
                                            </div>

                                            <div className="relative z-10 font-mono text-xl tracking-[0.2em] mb-6 flex gap-3 text-white">
                                                <span>••••</span>
                                                <span>••••</span>
                                                <span>••••</span>
                                                <span>{last4 || '****'}</span>
                                            </div>

                                            <div className="relative z-10 flex justify-between items-end">
                                                <div>
                                                    <span className="block text-[9px] uppercase tracking-widest text-white/60 mb-1">Kart Sahibi</span>
                                                    <span className="block font-bold tracking-wide uppercase">{card.cardHolder}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] uppercase tracking-widest text-white/60 mb-1">Son Kullanma</span>
                                                    <span className="block font-bold tracking-widest">{card.expiry}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3 mt-3 px-1">
                                            {!card.isDefault && (
                                                <button onClick={() => handleSetDefault(card.id)} className="text-xs font-bold text-gray-500 hover:text-[#008cb3] transition-colors flex items-center gap-1">
                                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    Varsayılan Yap
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(card.id)} className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors flex items-center gap-1 ml-auto">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Sil
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Add Card Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-extrabold text-[#005e85] text-lg">Yeni Kart Ekle</h3>
                                <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 bg-white shadow-sm border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <form onSubmit={handleAddCard} className="p-6 space-y-5">
                                <div className="bg-yellow-50 text-yellow-700 p-3 rounded-xl border border-yellow-100 flex items-start gap-3 text-xs font-medium">
                                    <svg className="flex-shrink-0 w-4 h-4 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    <p>Güvenlik nedeniyle CVV/CVC kodunu burada saklamıyoruz. Yalnızca ödeme işlemi sırasında sizden istenecektir.</p>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Kart Takma Adı</label>
                                    <input required value={newCard.alias} onChange={e => setNewCard({ ...newCard, alias: e.target.value })} type="text" placeholder="Örn: Garanti Bonus Kartım" className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-semibold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Kart Üzerindeki İsim</label>
                                    <input required value={newCard.cardHolder} onChange={e => setNewCard({ ...newCard, cardHolder: e.target.value })} type="text" placeholder="AHMET YILMAZ" className="w-full uppercase bg-slate-50 border border-gray-200 text-slate-800 font-semibold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Kart Numarası</label>
                                    <div className="relative">
                                        <input required value={newCard.cardNumber} onChange={handleCardNumberChange} type="text" placeholder="0000 0000 0000 0000" className="w-full font-mono bg-slate-50 border border-gray-200 text-slate-800 font-semibold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all pr-12" />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
                                            {detectCardType(newCard.cardNumber) === 'Visa' ? (
                                                <svg width="30" height="15" viewBox="0 0 100 32" fill="#1a1f71" xmlns="http://www.w3.org/2000/svg"><path d="M41.7 1.056H31.1L24 23.328h9.8c0 0 1.2-3.6 1.4-4.5h11.9c.2 1.3 2 4.5 2 4.5h8.9L41.7 1.056zm-4.3 12.8h-7.6l3.6-10.3h1.8l2.2 10.3zm41.6-12.8H70L62.7 23.328h9.6l1.3-3.6h10l.9 3.6h9.1L79 1.056zm-10.5 13h-7.6l3.6-10.4h1.7l2.3 10.4z" /></svg>
                                            ) : detectCardType(newCard.cardNumber) === 'Mastercard' ? (
                                                <svg width="30" height="18" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#EB001B" /><circle cx="22" cy="10" r="10" fill="#F79E1B" fillOpacity="0.8" /></svg>
                                            ) : (
                                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Son Kullanma</label>
                                        <input required value={newCard.expiry} onChange={handleExpiryChange} type="text" placeholder="MM/YY" className="w-full font-mono bg-slate-50 border border-gray-200 text-slate-800 font-semibold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                                            <span>CVV</span>
                                            <span className="text-gray-400 capitalize underline" title="Sadece ödeme esnasında sorulur">Neden Yok?</span>
                                        </label>
                                        <input disabled type="text" placeholder="***" className="w-full bg-gray-100 border border-gray-200 text-gray-400 font-semibold rounded-xl px-4 py-3 cursor-not-allowed" />
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-[#008cb3] hover:bg-[#005e85] text-white text-[15px] font-extrabold py-3.5 rounded-xl transition-all shadow-md mt-6 active:scale-95">
                                    Kartı Ekle
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div className="h-10"></div>
            </div>
        </div>
    );
}
