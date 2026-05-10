'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchTour } from '../lib/tours';
import { useLocale } from '../context/LocaleContext';
import { checkRateLimit, recordFailedAttempt } from '../lib/rateLimit';
import { auth } from '../lib/auth';

// --- MOCK DATA FOR SAVED CARDS ---
const MOCK_SAVED_CARDS = [
    { id: 'card_1', brand: 'mastercard', last4: '4242', expiry: '12/28', holder: 'AHMET YILMAZ' },
    { id: 'card_2', brand: 'visa', last4: '8812', expiry: '06/26', holder: 'AHMET YILMAZ' }
];

const getCardType = (number: string) => {
    const cleanNumber = number.replace(/\s+/g, '');
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
    if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) return 'diners';
    if (/^(?:2131|1800|35)/.test(cleanNumber)) return 'jcb';
    return 'generic';
};

function CheckoutLogic() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useLocale();
    const tourId = searchParams.get('tourId');
    const guests = parseInt(searchParams.get('guests') || '1');
    const date = searchParams.get('date');
    const menuId = searchParams.get('menuId');

    const [tour, setTour] = useState<any>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Info, 2: Payment Gateway, 3: Success
    const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
    const [showUpsellModal, setShowUpsellModal] = useState(false);
    const [upsellShown, setUpsellShown] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [isPromoApplied, setIsPromoApplied] = useState(false);
    const [appliedPromoData, setAppliedPromoData] = useState<any>(null);


    // Form Data
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        hotelName: ''
    });

    const [cardForm, setCardForm] = useState({
        number: '',
        expiry: '',
        cvc: '',
        holderName: '',
        saveCard: false
    });

    const [selectedSavedCard, setSelectedSavedCard] = useState<string | null>(null);
    const isLoggedIn = auth.isAuthenticated();

    const handleSelectSavedCard = (card: any) => {
        setSelectedSavedCard(card.id);
        setCardForm({
            ...cardForm,
            number: `**** **** **** ${card.last4}`,
            expiry: card.expiry,
            holderName: card.holder
        });
    };

    useEffect(() => {
        if (!tourId) return;
        fetchTour(tourId).then(t => setTour(t)).catch(() => {});
    }, [tourId]);


    // --- AKILLI KOMBO EŞLEŞTİRME MANTIĞI (Intelligent-Combo-Matching) ---
    const getSuggestedCombo = () => {
        if (!tour) return null;
        
        const loc = (tour.location || '').toLowerCase();
        const title = (tour.title || '').toLowerCase();
        
        // 1. Antalya / Deniz Mantığı
        if (loc.includes('antalya') || loc.includes('kaş') || title.includes('yat') || title.includes('mavi')) {
            return {
                id: 'antalya-fish-combo',
                name: 'Akdeniz Balık Menüsü',
                restaurant: 'Marina Seafood',
                description: 'Günlük taze tutulan deniz mahsulleri ve eşsiz Akdeniz mezeleri.',
                image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
                price: 850,
                originalPrice: 1200,
                tag: 'Deniz Esintisi'
            };
        }
        
        // 2. İstanbul / Tarih Mantığı
        if (loc.match(/istanbul|i̇stanbul|tanbul/) || title.includes('tarih') || title.includes('saray')) {
            return {
                id: 'istanbul-palace-combo',
                name: 'Osmanlı Saray Mutfağı',
                restaurant: 'Asitane Restoran',
                description: 'Padişahların sofrasından günümüze ulaşan asırlık tarifler.',
                image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
                price: 1450,
                originalPrice: 1900,
                tag: 'Görkemli Lezzet'
            };
        }
        
        // 3. Kapadokya / Yerel Mantık
        if (loc.includes('kapadokya') || title.includes('balon') || title.includes('vadi')) {
            return {
                id: 'cappadocia-local-combo',
                name: 'Geleneksel Testi Kebabı',
                restaurant: 'Mağara Sofrası',
                description: 'Kapadokya’nın meşhur ateşte pişen testi kebabı ve yerel şarap tadımı.',
                image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
                price: 950,
                originalPrice: 1300,
                tag: 'Yerel Tatlar'
            };
        }

        // Default / Fallback (Linked Restaurant varsa onu kullan)
        if (tour.linked_restaurant) {
            return {
                id: tour.linked_restaurant.id,
                name: tour.linked_restaurant.special_menu_name || 'Özel Menü',
                restaurant: tour.linked_restaurant.name,
                description: tour.linked_restaurant.description,
                image: tour.linked_restaurant.image,
                price: tour.linked_restaurant.price || 500,
                originalPrice: (tour.linked_restaurant.price || 500) * 1.2,
                tag: 'Özel Fırsat'
            };
        }

        return null;
    };

    const suggestedCombo = getSuggestedCombo();

    // Reklam (Upsell) Tetikleyici: Kart bilgileri girilirken (Step 2) 1.5 sn sonra çıksın
    useEffect(() => {
        if (step === 2 && !menuId && suggestedCombo && !upsellShown) {
            const timer = setTimeout(() => {
                setShowUpsellModal(true);
                setUpsellShown(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [step, menuId, suggestedCombo, upsellShown]);


    const handleProceedToPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email || !formData.hotelName) {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }
        setStep(2);
    };

    const handleSimulatePaymentProcess = () => {
        // ZERO-TRUST: Ödeme ekranı hız sınırı (Spam/Carding Koruması)
        const limit = checkRateLimit('checkout_attempts');
        if (!limit.allowed) {
            alert(`Çok fazla ödeme denemesi yaptınız. Güvenlik sebebiyle işleminiz ${limit.remainingMinutes} dakikalığına durdurulmuştur.`);
            return;
        }

        // Upsell Logic: Artik useEffect ile otomatik tetikleniyor

        setIsSimulatingPayment(true);
        setTimeout(() => {
            setIsSimulatingPayment(false);
            
            // Satın alımı test simülasyonu için localStorage'a kaydet (Acente panelinde görünsün)
            if (typeof window !== 'undefined') {
                try {
                    const existingStr = localStorage.getItem('demo_new_bookings');
                    const existingBookings = existingStr ? JSON.parse(existingStr) : [];
                    const newBooking = {
                        id: Math.floor(Math.random() * 10000) + 1000,
                        user_full_name: `${formData.firstName} ${formData.lastName}`,
                        user_email: formData.email,
                        tour_detail: { title: tour?.title || 'Bilinmeyen Tur' },
                        start_date: date,
                        status: 'confirmed',
                        total_price: totalPrice,
                    };
                    // VIP-Badge-Logic-Engine: Bundle alımı veya 5000 TL üzeri harcama VIP yapar
                    if (bundleLogic.isBundle || totalPrice >= 5000) {
                        const expiry = new Date();
                        expiry.setDate(expiry.getDate() + 30);
                        localStorage.setItem('vip_membership', JSON.stringify({
                            level: 'VIP',
                            expiry: expiry.toISOString()
                        }));
                    }

                    existingBookings.unshift(newBooking); // En başa ekle
                    localStorage.setItem('demo_new_bookings', JSON.stringify(existingBookings));
                } catch (e) {
                    console.error('Error saving mock booking', e);
                }
            }

            setStep(3); // Success Output
        }, 3000);
    };

    if (!tourId && !menuId) return <div className="p-10 text-center">Eksik Rezervasyon Parametreleri</div>;
    if (tourId && !tour && step === 1) return <div className="p-10 text-center">Detaylar yükleniyor...</div>;

    const tourPrice = tour ? tour.price * guests : 0;
    const mealPrice = (menuId && tour?.linked_restaurant && tour.linked_restaurant.id === menuId) ? tour.linked_restaurant.price * guests : 0;
    
    // BACKEND LOGIC: Dynamic_Discount_Engine
    const calculateBundleDiscount = (tPrice: number, mPrice: number) => {
        let bundleDiscount = 0;
        let promoDiscount = 0;
        let isBundle = false;

        if (tPrice > 0 && mPrice > 0) {
            isBundle = true;
            bundleDiscount = (tPrice + mPrice) * 0.10; // %10 Standart Paket İndirimi
        }

        // Promo Code Logic
        if (isPromoApplied && appliedPromoData) {
            // Eğer COMBO15 ise (VIP Upgrade), bundle indirimini %15'e çıkarır (override)
            if (appliedPromoData.code === 'COMBO15') {
                const totalBase = tPrice + mPrice;
                promoDiscount = totalBase * 0.15;
                bundleDiscount = 0; // Promo indirimine dahil edildi
            } else {
                promoDiscount = (tPrice + mPrice - bundleDiscount) * (appliedPromoData.rate / 100);
            }
        }

        const finalTotal = (tPrice + mPrice) - bundleDiscount - promoDiscount;

        return {
            isBundle,
            bundleDiscountAmount: bundleDiscount,
            promoDiscountAmount: promoDiscount,
            finalTotal
        };
    };

    const bundleLogic = calculateBundleDiscount(tourPrice, mealPrice);
    const totalPrice = bundleLogic.finalTotal;

    const handleApplyPromo = (codeToApply?: string) => {
        const code = (codeToApply || promoCode).toUpperCase();
        if (code === 'COMBO15') {
            setAppliedPromoData({ code: 'COMBO15', rate: 15, label: 'Kombo İndirimi Uygulandı' });
            setIsPromoApplied(true);
            setPromoCode('COMBO15');
        } else if (code === 'WELCOME10') {
            setAppliedPromoData({ code: 'WELCOME10', rate: 10, label: 'Hoş Geldin İndirimi' });
            setIsPromoApplied(true);
            setPromoCode('WELCOME10');
        } else {
            if (!codeToApply) alert('Geçersiz Promosyon Kodu');
        }
    };


    return (
        <div className="w-full max-w-6xl mx-auto mt-4 mb-12 flex flex-col lg:flex-row gap-8 relative z-10">
            
            {/* Sol: Akış Ekranları */}
            <div className="w-full lg:w-2/3">
                {step === 1 && (
                    <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col border border-white/20">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-[#0B132B]">1. Müşteri Bilgileri</h2>
                                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Kişisel Bilgiler & Transfer</p>
                            </div>
                            <div className="hidden md:flex gap-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> SSL SECURED
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> PCI-DSS
                                </div>
                            </div>
                        </div>
                        
                        <form onSubmit={handleProceedToPayment} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">İsim</label>
                                    <input required type="text" value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold" placeholder="Ahmet" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Soyisim</label>
                                    <input required type="text" value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold" placeholder="Yılmaz" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Telefon (WhatsApp)</label>
                                    <input required type="tel" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold" placeholder="+90 5XX XXX XX XX" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">E-posta</label>
                                    <input required type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold" placeholder="ahmet@example.com" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Konakladığınız Otel (Transfer Bilgisi İçin)</label>
                                <input required type="text" value={formData.hotelName} onChange={e=>setFormData({...formData, hotelName: e.target.value})} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold" placeholder="Örn: Museum Hotel Kapadokya" />
                            </div>

                            <button type="submit" className="w-full bg-[#0B132B] hover:bg-[#005e85] text-white font-black text-xl py-6 rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3">
                                <span>İlerle ve Ödeme Yap</span>
                                <span className="text-2xl">➔</span>
                            </button>

                            <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-100">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-4 grayscale opacity-50" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 grayscale opacity-50" />
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
                                    🛡️ 256-BIT ENCRYPTION
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-white rounded-[40px] p-8 md:p-14 shadow-[0_30px_70px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center relative overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
                        {!isSimulatingPayment ? (
                            <>
                                 <div className="w-full max-w-5xl">
                                    <div className="flex justify-between items-center mb-10">
                                        <div>
                                            <h2 className="text-3xl font-black text-[#0B132B] tracking-tight">Ödeme Detayları</h2>
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Hızlı ve Güvenli</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">SSL SECURED</span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">3D SECURE</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-12 items-start">
                                        {/* Sol Taraf: Form Alanı */}
                                        <div className="w-full lg:w-3/5 order-2 lg:order-1">
                                            {/* Kayıtlı Kartlar Bölümü */}
                                            {isLoggedIn && (
                                                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                        KAYITLI KARTLARINIZ
                                                    </h3>
                                                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                                        {MOCK_SAVED_CARDS.map(card => (
                                                            <div 
                                                                key={card.id}
                                                                onClick={() => handleSelectSavedCard(card)}
                                                                className={`min-w-[220px] p-5 rounded-[24px] border-2 cursor-pointer transition-all duration-300 relative group overflow-hidden ${selectedSavedCard === card.id ? 'border-[#008cb3] bg-blue-50/50 shadow-lg' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                                                            >
                                                                <div className="flex justify-between items-start mb-6">
                                                                    <div className="h-6 flex items-center">
                                                                        {card.brand === 'visa' && <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-3 opacity-80" />}
                                                                        {card.brand === 'mastercard' && <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 opacity-80" />}
                                                                    </div>
                                                                    {selectedSavedCard === card.id && (
                                                                        <div className="w-6 h-6 bg-[#008cb3] rounded-full flex items-center justify-center shadow-md">
                                                                            <svg width="14" height="14" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-base font-black text-[#0B132B] tracking-widest mb-1">•••• {card.last4}</div>
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.expiry}</div>
                                                            </div>
                                                        ))}
                                                        <div className="min-w-[140px] p-5 rounded-[24px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 group hover:border-slate-400 cursor-pointer transition-all">
                                                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">+</div>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">YENİ KART<br/>EKLE</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <form onSubmit={(e) => { e.preventDefault(); handleSimulatePaymentProcess(); }} className="space-y-8">
                                                <div className="space-y-6 bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 shadow-xl backdrop-blur-sm">
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Kart Üzerindeki İsim</label>
                                                        <input 
                                                            required 
                                                            type="text" 
                                                            placeholder="Örn: AHMET YILMAZ" 
                                                            value={cardForm.holderName}
                                                            onChange={e => setCardForm({...cardForm, holderName: e.target.value.toUpperCase()})}
                                                            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-black text-lg focus:border-[#008cb3] focus:shadow-[0_0_20px_rgba(0,140,179,0.1)] outline-none transition-all placeholder:text-slate-300" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Kart Numarası</label>
                                                        <div className="relative">
                                                            <input 
                                                                required 
                                                                type="text" 
                                                                maxLength={19} 
                                                                placeholder="0000 0000 0000 0000" 
                                                                value={cardForm.number}
                                                                onChange={e => {
                                                                    let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                                                                    let matches = val.match(/\d{4,16}/g);
                                                                    let match = matches && matches[0] || '';
                                                                    let parts = [];
                                                                    for (let i=0, len=match.length; i<len; i+=4) {
                                                                        parts.push(match.substring(i, i+4));
                                                                    }
                                                                    if (parts.length) {
                                                                        setCardForm({...cardForm, number: parts.join(' ')});
                                                                    } else {
                                                                        setCardForm({...cardForm, number: val});
                                                                    }
                                                                }}
                                                                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-black text-lg tracking-wider focus:border-[#008cb3] focus:shadow-[0_0_20px_rgba(0,140,179,0.1)] outline-none transition-all placeholder:text-slate-300" 
                                                            />
                                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                                {getCardType(cardForm.number) === 'visa' && <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-3" />}
                                                                {getCardType(cardForm.number) === 'mastercard' && <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5" />}
                                                                {getCardType(cardForm.number) === 'amex' && <span className="text-[10px] font-black italic text-blue-600">AMEX</span>}
                                                                {getCardType(cardForm.number) === 'discover' && <span className="text-[10px] font-black text-orange-500">DISCOVER</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div>
                                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Son Kullanma</label>
                                                            <input 
                                                                required 
                                                                type="text" 
                                                                maxLength={5} 
                                                                placeholder="AA / YY" 
                                                                value={cardForm.expiry}
                                                                onChange={e => {
                                                                    let val = e.target.value.replace(/[^0-9]/g, '');
                                                                    if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                                                    setCardForm({...cardForm, expiry: val});
                                                                }}
                                                                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-black text-lg tracking-wider focus:border-[#008cb3] outline-none transition-all placeholder:text-slate-300" 
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">CVC</label>
                                                            <input 
                                                                required 
                                                                type="password" 
                                                                maxLength={3} 
                                                                placeholder="***" 
                                                                value={cardForm.cvc}
                                                                onChange={e => setCardForm({...cardForm, cvc: e.target.value.replace(/[^0-9]/g, '')})}
                                                                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-black text-lg tracking-wider focus:border-[#008cb3] outline-none transition-all placeholder:text-slate-300" 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 px-4 py-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                                                    <label className="relative flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            className="sr-only peer" 
                                                            checked={cardForm.saveCard}
                                                            onChange={e => setCardForm({...cardForm, saveCard: e.target.checked})}
                                                        />
                                                        <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#008cb3]"></div>
                                                    </label>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-700">Kartı Gelecek Alışverişlerim İçin Kaydet</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bir sonraki ödemenizde zaman kazanın</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-4">
                                                    <button type="submit" className="w-full bg-[#0B132B] hover:bg-black text-white font-black py-8 rounded-[24px] shadow-[0_20px_60px_rgba(11,19,43,0.4)] transition-all hover:scale-[1.03] active:scale-[0.97] flex flex-col items-center justify-center gap-2 group text-2xl relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                                        <span className="flex items-center gap-3">
                                                            <span>{totalPrice.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})} Öde</span>
                                                            <span className="text-3xl group-hover:translate-x-2 transition-transform duration-300">➔</span>
                                                        </span>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">GÜVENLİ ÖDEME PANELİNE GEÇ</span>
                                                    </button>
                                                    
                                                    <p className="text-[10px] text-center font-bold text-slate-400 italic px-8 leading-relaxed">
                                                        * Bu ödeme 256-bit SSL sertifikası ile korunmaktadır. Kart bilgileriniz PCI-DSS standartlarında işlenir.
                                                    </p>
                                                </div>
                                            </form>
                                        </div>

                                        {/* Sağ Taraf: Live Card Preview (Desktop Sticky) */}
                                        <div className="w-full lg:w-2/5 order-1 lg:order-2 lg:sticky lg:top-10">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                CANLI KART ÖN İZLEME
                                            </h3>
                                            <div className="perspective-2000">
                                                <div className={`relative w-full aspect-[1.6/1] rounded-[32px] p-8 text-white overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.3)] transition-all duration-700 transform hover:rotate-y-12 bg-gradient-to-br ${
                                                    getCardType(cardForm.number) === 'visa' ? 'from-[#1A1F71] to-[#00579F]' : 
                                                    getCardType(cardForm.number) === 'mastercard' ? 'from-[#EB001B] to-[#FF5F00]' : 
                                                    getCardType(cardForm.number) === 'amex' ? 'from-[#2E77BB] to-[#016FD0]' : 
                                                    getCardType(cardForm.number) === 'discover' ? 'from-[#F68121] to-[#FFC220]' :
                                                    'from-[#1e293b] to-[#0f172a]'
                                                }`}>
                                                    {/* Premium Patterns */}
                                                    <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none mix-blend-overlay">
                                                        <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] border-[60px] border-white/20 rounded-full"></div>
                                                        <div className="absolute bottom-[-40%] right-[-10%] w-[80%] h-[80%] border-[30px] border-white/20 rounded-full"></div>
                                                    </div>

                                                    {/* Chip & Logos */}
                                                    <div className="relative h-full flex flex-col justify-between z-10">
                                                        <div className="flex justify-between items-start">
                                                            <div className="w-14 h-10 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-100 rounded-lg shadow-xl flex flex-col gap-1 p-2 border border-white/20 overflow-hidden">
                                                                <div className="w-full h-0.5 bg-black/10 rounded-full"></div>
                                                                <div className="w-full h-0.5 bg-black/10 rounded-full"></div>
                                                                <div className="w-full h-0.5 bg-black/10 rounded-full"></div>
                                                                <div className="w-full h-0.5 bg-black/10 rounded-full"></div>
                                                            </div>
                                                            <div className="h-10 flex items-center">
                                                                {getCardType(cardForm.number) === 'visa' && <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-5 brightness-0 invert" />}
                                                                {getCardType(cardForm.number) === 'mastercard' && <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-10" />}
                                                                {getCardType(cardForm.number) === 'amex' && <div className="text-lg font-black italic tracking-tighter">AMEX</div>}
                                                                {getCardType(cardForm.number) === 'discover' && <div className="text-lg font-black italic">Discover</div>}
                                                            </div>
                                                        </div>

                                                        <div className="text-xl md:text-2xl font-mono tracking-[0.25em] drop-shadow-2xl text-center my-4 font-bold">
                                                            {cardForm.number || '•••• •••• •••• ••••'}
                                                        </div>

                                                        <div className="flex justify-between items-end">
                                                            <div className="flex-1">
                                                                <div className="text-[9px] uppercase tracking-[0.2em] opacity-60 mb-1.5 font-black">Kart Sahibi</div>
                                                                <div className="text-sm font-black tracking-widest uppercase truncate max-w-[200px]">
                                                                    {cardForm.holderName || 'AD SOYAD'}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-[9px] uppercase tracking-[0.2em] opacity-60 mb-1.5 font-black">SKT</div>
                                                                <div className="text-sm font-black tracking-widest">
                                                                    {cardForm.expiry || 'MM/YY'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Premium Glass Effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
                                                    <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 animate-[shimmer_5s_infinite] pointer-events-none"></div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-8 p-6 bg-slate-50 rounded-[24px] border border-slate-100 flex items-start gap-4">
                                                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0">
                                                    <span className="text-xl">💡</span>
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                                                    "Kart numaranızı girerken sistemimiz kart tipini otomatik olarak algılar ve güvenlik protokollerini buna göre optimize eder."
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-16 pt-8 border-t border-slate-100 flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:opacity-100 transition-opacity duration-500">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🛡️</div>
                                            <div>
                                                <div className="text-[9px] font-black tracking-widest uppercase text-slate-400">Security</div>
                                                <div className="text-xs font-black text-slate-600">SSL SECURED</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">✅</div>
                                            <div>
                                                <div className="text-[9px] font-black tracking-widest uppercase text-slate-400">Compliant</div>
                                                <div className="text-xs font-black text-slate-600">PCI-DSS LEVEL 1</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🔒</div>
                                            <div>
                                                <div className="text-[9px] font-black tracking-widest uppercase text-slate-400">Authentic</div>
                                                <div className="text-xs font-black text-slate-600">3D SECURE 2.0</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-8 p-10">
                                <div className="relative w-24 h-24">
                                    <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
                                    <div className="absolute inset-0 border-8 border-t-[#0B132B] rounded-full animate-spin"></div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-black text-[#0B132B] mb-2 uppercase tracking-tighter">İşleminiz Onaylanıyor...</h3>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">İşleminiz güvenli bir şekilde bankanıza yönlendiriliyor...</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="bg-white/10 backdrop-blur-2xl rounded-[40px] p-8 md:p-14 shadow-2xl border border-emerald-500/30 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-700">
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500/50"></div>
                        <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Rezervasyon Başarılı!</h2>
                        <p className="text-lg font-bold text-slate-400 mb-12 max-w-md mx-auto">Ödemeniz onaylandı. Tatil planınız başarıyla oluşturuldu.</p>
                        
                        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-12">
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-3">
                                <span className="text-2xl">📧</span>
                                <h4 className="font-black text-xs text-white uppercase tracking-widest">E-Bilet (Voucher)</h4>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed">{formData.email} adresine PDF biletiniz ve detaylı rehberiniz gönderildi.</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-3">
                                <span className="text-2xl">⚡</span>
                                <h4 className="font-black text-xs text-white uppercase tracking-widest">Anında Onay</h4>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed">Rezervasyonunuz acenta sistemine düştü. Operasyon ekibimiz hazırlıklara başladı.</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-3">
                                <span className="text-2xl">🔒</span>
                                <h4 className="font-black text-xs text-white uppercase tracking-widest">Güvenli İşlem</h4>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed">Ödemeniz PCI-DSS uyumlu altyapı ile %100 güvenli olarak tamamlanmıştır.</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
                            <button onClick={()=>router.push('/')} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl border border-white/10 transition-all text-sm uppercase tracking-widest">
                                Ana Sayfaya Dön
                            </button>
                            <button onClick={()=>router.push('/agency/dashboard')} className="flex-1 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-black py-4 rounded-2xl shadow-xl transition-all text-sm uppercase tracking-widest">
                                Panelini Kontrol Et
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full lg:w-1/3">
                <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white/10 sticky top-8">
                    <h3 className="text-xl font-black text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
                        <span className="text-2xl">📋</span> Sipariş Özeti
                    </h3>
                    
                    {tour ? (
                        <>
                            <div className="flex gap-4 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="w-20 h-20 rounded-2xl bg-slate-800 overflow-hidden relative shrink-0 border border-white/10">
                                    <img src={tour.image_main || tour.imageMain} alt={tour.title} className="object-cover w-full h-full" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h4 className="font-bold text-white text-base leading-tight">{tour.title}</h4>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full"></span> {tour.duration}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 text-sm font-bold text-slate-300 mb-8 bg-white/5 p-6 rounded-[24px] border border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">📅 Tarih</span>
                                    <span className="text-white">{new Date(String(date)).toLocaleDateString('tr-TR', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">👥 Misafir</span>
                                    <span className="text-white">{guests} Yetişkin</span>
                                </div>
                                {menuId && tour?.linked_restaurant && (
                                    <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                        <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">🍽️ Yemek</span>
                                        <span className="text-emerald-400">{tour.linked_restaurant.special_menu_name}</span>
                                    </div>
                                )}
                            </div>

                             {bundleLogic.isBundle && !isPromoApplied && (
                                <div className="flex justify-between items-center text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 p-2 rounded-xl border border-orange-100 dark:border-orange-900/30 animate-in slide-in-from-top-1 duration-300 mb-4">
                                    <span className="flex items-center gap-1">✨ Paket Avantajı (%10):</span>
                                    <span>- {bundleLogic.bundleDiscountAmount.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</span>
                                </div>
                             )}

                             {isPromoApplied && (
                                <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30 animate-in slide-in-from-top-1 duration-300 mb-4">
                                    <span className="flex items-center gap-1">✅ {appliedPromoData.label}:</span>
                                    <span>- {bundleLogic.promoDiscountAmount.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</span>
                                </div>
                             )}


                            <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                                <span className="font-black text-white text-lg">Toplam Tutar:</span>
                                <div className="text-right">
                                    {bundleLogic.isBundle && (
                                        <div className="text-xs text-slate-500 line-through font-bold mb-1">
                                            {(tourPrice + mealPrice).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}
                                        </div>
                                    )}
                                    <span className="text-3xl font-black text-[#38bdf8] tracking-tighter">{totalPrice.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</span>
                                </div>
                            </div>

                            {/* Promo Code Input */}
                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/10">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Promosyon Kodu</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        placeholder="KOD GIRIN"
                                        className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
                                    />
                                    <button 
                                        onClick={() => handleApplyPromo()}
                                        className="bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-600 transition"
                                    >
                                        UYGULA
                                    </button>
                                </div>
                                {isPromoApplied && (
                                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"></span>
                                        "{appliedPromoData.code}" kodu başarıyla uygulandı!
                                    </p>
                                )}
                            </div>
                        </>

                    ) : (
                        <div className="animate-pulse flex flex-col gap-4">
                            <div className="h-16 bg-gray-200 dark:bg-slate-800 rounded-xl w-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* UPSELL MODAL: Glassmorphism Akıllı Kombo Teklifi */}
            {showUpsellModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[32px] max-w-2xl w-full max-h-[85vh] overflow-y-auto scrollbar-hide shadow-[0_0_60px_rgba(249,115,22,0.2)] relative animate-in zoom-in-95 duration-700 border border-white/40 dark:border-white/10">
                        {/* Parlama Efekti (Glow Decor) */}
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-500/20 rounded-full blur-[100px] animate-pulse"></div>
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-700"></div>

                        <div className="flex flex-col md:flex-row relative z-10">
                            {/* Sol: Görsel (Geniş ve Estetik) */}
                            <div className="w-full md:w-5/12 h-48 md:h-auto relative">
                                <img 
                                    src={suggestedCombo?.image} 
                                    className="w-full h-full object-cover" 
                                    alt={suggestedCombo?.name} 
                                />
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-orange-500/10"></div>
                                
                                {/* Discount Badge */}
                                <div className="absolute top-4 left-4">
                                    <div className="bg-orange-600 text-white text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-xl border border-orange-400/30">
                                        -%15 İNDİRİM
                                    </div>
                                </div>
                            </div>

                            {/* Sağ: İçerik */}
                            <div className="w-full md:w-7/12 p-6 md:p-10 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-950/30 rounded-xl flex items-center justify-center text-lg shadow-inner">💎</div>
                                    <h4 className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-[0.3em]">Özel Paket Teklifi</h4>
                                </div>

                                <h2 className="text-xl md:text-2xl font-black text-orange-500 dark:text-orange-400 leading-tight mb-4 tracking-tight">
                                    WAIT! WANT TO MAKE <br/> IT A <span className="text-slate-900 dark:text-white underline decoration-orange-500/30 underline-offset-4">VIP COMBO</span>?
                                </h2>

                                <div className="space-y-3 mb-6">
                                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                                        Seçtiğiniz tura <b>{suggestedCombo?.name}</b> paketi ekleyin.
                                    </p>
                                    <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                        Bu teklif şu anki rezervasyonunuza özel VIP fiyatıdır.
                                    </p>

                                    <div className="flex items-center gap-3 py-2">
                                        <div className="flex-1 bg-white/30 dark:bg-white/5 border border-white/50 dark:border-white/10 p-2.5 rounded-2xl text-center">
                                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Normal</p>
                                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 line-through">₺{suggestedCombo?.originalPrice}</p>
                                        </div>
                                        <div className="text-lg font-black text-orange-500">➔</div>
                                        <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 p-2.5 rounded-2xl text-center relative overflow-hidden">
                                            <p className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-0.5">VIP</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white">₺{suggestedCombo?.price}</p>
                                        </div>
                                    </div>

                                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-xl flex items-center gap-2">
                                        <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-md">
                                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 leading-tight uppercase tracking-tighter">
                                            Upgrade now & get VIP perks!
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button 
                                        onClick={() => {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('menuId', suggestedCombo?.id || 'demo-menu');
                                            router.replace(`/checkout?${params.toString()}`, { scroll: false });
                                            handleApplyPromo('COMBO15'); // Arka planda indirim kodunu enjekte et
                                            setShowUpsellModal(false);
                                            setIsSimulatingPayment(true);
                                            setTimeout(() => {
                                                setIsSimulatingPayment(false);
                                                setStep(3);
                                            }, 2500);
                                        }}
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-[0_15px_35px_rgba(249,115,22,0.4)] transition-all transform active:scale-95 text-lg"
                                    >
                                        YES, UPGRADE TO VIP COMBO! ➔
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setShowUpsellModal(false);
                                            setIsSimulatingPayment(true);
                                            setTimeout(() => {
                                                setIsSimulatingPayment(false);
                                                setStep(3);
                                            }, 2000);
                                        }}
                                        className="w-full text-slate-400 dark:text-slate-500 font-bold py-2 text-[11px] hover:text-orange-600 transition-colors uppercase tracking-[0.2em]"
                                    >
                                        No thanks, just the tour
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <div className="min-h-screen bg-[#0B132B] flex flex-col py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Arka Plan Dekorasyonu */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-6xl mx-auto w-full mb-8 relative z-10">
                <Link href="/" className="text-slate-400 font-bold text-sm tracking-tight hover:text-white flex items-center gap-2 group w-max transition-colors">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Geri Dön
                </Link>
                <div className="mt-8">
                    <h1 className="text-4xl font-black text-white tracking-tight">Güvenli Rezervasyon</h1>
                    <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Son Adım: Ödeme ve Onay
                    </p>
                </div>
            </div>

            <Suspense fallback={<div className="text-center py-20 font-bold text-slate-400">Ödeme Altyapısı Yükleniyor...</div>}>
                <CheckoutLogic />
            </Suspense>
        </div>
    );
}
