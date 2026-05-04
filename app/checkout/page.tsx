'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchTour } from '../lib/tours';
import { useLocale } from '../context/LocaleContext';

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


    const handleProceedToPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email || !formData.hotelName) {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }
        setStep(2);
    };

    const handleSimulatePaymentProcess = () => {
        // Upsell Logic: Akıllı Eşleştirme Motoru
        if (!menuId && suggestedCombo && !upsellShown) {
            setShowUpsellModal(true);
            setUpsellShown(true);
            return;
        }

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
        <div className="w-full max-w-6xl mx-auto mt-8 flex flex-col lg:flex-row gap-8">
            
            {/* Sol: Akış Ekranları */}
            <div className="w-full lg:w-2/3">
                {step === 1 && (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col">
                        <h2 className="text-2xl font-black text-slate-800 mb-2">1. Müşteri Bilgileri</h2>
                        <p className="text-sm font-medium text-slate-500 mb-8">Rezervasyon konfirmasyonuz ve buluşma detayları için bilgilerinizi eksiksiz girin.</p>
                        
                        <form onSubmit={handleProceedToPayment} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">İsim <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition" placeholder="Ahmet" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Soyisim <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition" placeholder="Yılmaz" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp Uyumlu Telefon Numarası <span className="text-red-500">*</span></label>
                                <input required type="tel" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition" placeholder="+90 5XX XXX XX XX" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">E-posta Adresi <span className="text-red-500">*</span></label>
                                <input required type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition" placeholder="ahmet@example.com" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Otel Adı (Transfer İçin) <span className="text-red-500">*</span></label>
                                <input required type="text" value={formData.hotelName} onChange={e=>setFormData({...formData, hotelName: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition" placeholder="Örn: Museum Hotel Kapadokya" />
                            </div>

                            <button type="submit" className="w-full bg-[#008cb3] hover:bg-[#005e85] text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-blue-500/30 transition">
                                Ödemeye Geç (Payment Gateway)
                            </button>

                            <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 mt-4">
                                <div className="text-blue-500 mt-0.5">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <p className="text-[12px] font-medium text-blue-800 leading-relaxed italic">
                                    {t.checkout.paymentDisclaimer}
                                </p>
                            </div>
                        </form>
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
                        {!isSimulatingPayment ? (
                            <>
                                <h2 className="text-3xl font-black text-slate-800 mb-4 text-center">Ödeme Geçidi (Simülasyon)</h2>
                                <p className="text-sm font-medium text-slate-500 mb-8 text-center">Müşteri bilgileri onaylandı. Bu aşamada gerçek sistemde Stripe veya İyzico 3D Güvenli Ödeme Ekranı (iframe/popup) açılır.</p>
                                
                                <div className="bg-slate-50 p-6 rounded-2xl border border-gray-200 w-full max-w-sm mb-8 space-y-4">
                                    <div className="flex justify-between font-bold text-slate-700">
                                        <span>Ödenecek Tutar</span>
                                        <span className="text-[#008cb3]">{totalPrice.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</span>
                                    </div>
                                    <div className="h-px bg-gray-200"></div>
                                    <button onClick={handleSimulatePaymentProcess} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2">
                                        🔒 Güvenli Ödeme Yap
                                    </button>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-400 max-w-sm text-center italic mt-2">
                                    {t.checkout.paymentDisclaimer}
                                </p>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="w-16 h-16 border-4 border-slate-200 border-t-[#008cb3] rounded-full animate-spin"></div>
                                <h3 className="text-xl font-bold text-slate-800">Bankayla İletişime Geçiliyor...</h3>
                                <p className="text-sm font-medium text-slate-500">Lütfen bekleyin, sayfayı kapatmayın.</p>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-emerald-500 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2">Rezervasyon Başarılı!</h2>
                        <p className="text-lg font-medium text-slate-600 mb-8">Ödeme başarılı bir şekilde tamamlandı. Kapadokya biletiniz ayrıldı.</p>
                        
                        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-2">
                                <span className="text-lg">📧</span>
                                <h4 className="font-bold text-sm text-slate-800">Müşteri Çıktısı (Mail)</h4>
                                <p className="text-xs font-semibold text-emerald-600">{formData.email} adresine PDF formatında Rezervasyon Belgesi (Voucher) ve Buluşma detayları otomatik gönderildi.</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-2">
                                <span className="text-lg">🔔</span>
                                <h4 className="font-bold text-sm text-slate-800">Acenta Bildirimi</h4>
                                <p className="text-xs font-semibold text-blue-600">Admin paneline rezervasyon düştü. Acenta operasyon ekibine SMS ve Mail ile "Yeni Rezervasyon" uyarısı iletildi.</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-2">
                                <span className="text-lg">📦</span>
                                <h4 className="font-bold text-sm text-slate-800">Stok Güncelleme</h4>
                                <p className="text-xs font-semibold text-purple-600">{new Date(String(date)).toLocaleDateString('tr-TR')} tarihi için {tour?.title} kontenjanı sistemden otomatik olarak {guests} kişi düşüldü.</p>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full">
                            <button onClick={()=>router.push('/')} className="flex-1 bg-white border-2 border-[#008cb3] text-[#008cb3] font-bold py-3 rounded-xl hover:bg-blue-50 transition">
                                Ana Sayfaya Dön
                            </button>
                            <button onClick={()=>router.push('/agency/dashboard')} className="flex-1 bg-[#008cb3] text-white font-bold py-3 rounded-xl shadow-md hover:bg-[#005e85] transition">
                                Acenta Panelini Kontrol Et
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sağ: Sepet Özeti */}
            <div className="w-full lg:w-1/3">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-8">
                    <h3 className="text-lg font-black text-slate-800 mb-4 border-b border-gray-100 pb-4">Sepet Özeti</h3>
                    
                    {tour ? (
                        <>
                            <div className="flex gap-4 mb-6">
                                <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden relative shrink-0">
                                    <img src={tour.image_main || tour.imageMain} alt={tour.title} className="object-cover w-full h-full" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{tour.title}</h4>
                                    <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">⏱️ {tour.duration}</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm font-medium text-slate-600 mb-6 bg-slate-50 p-4 rounded-2xl">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">📅 Tarih:</span>
                                    <span className="font-bold text-slate-800">{new Date(String(date)).toLocaleDateString('tr-TR', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">👥 Kişi Sayısı:</span>
                                    <span className="font-bold text-slate-800">{guests} Yetişkin</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">🏨 Otel & Transfer:</span>
                                    <span className="font-bold text-green-600">Ücretsiz Dahil</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">🗣️ Rehberlik:</span>
                                    <span className="font-bold text-green-600">Profesyonel Tur Rehberi Dahil</span>
                                </div>
                                {menuId && tour?.linked_restaurant && (
                                    <div className="flex justify-between border-t border-emerald-100 pt-2 mt-2">
                                        <span className="text-emerald-600 font-bold flex items-center gap-1">🍽️ Yemek Paketi:</span>
                                        <span className="font-bold text-slate-800">{tour.linked_restaurant.special_menu_name}</span>
                                    </div>
                                )}
                            </div>

                             {bundleLogic.isBundle && !isPromoApplied && (
                                <div className="flex justify-between items-center text-xs font-bold text-orange-600 bg-orange-50 p-2 rounded-xl border border-orange-100 animate-in slide-in-from-top-1 duration-300 mb-4">
                                    <span className="flex items-center gap-1">✨ Paket Avantajı (%10):</span>
                                    <span>- {bundleLogic.bundleDiscountAmount.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</span>
                                </div>
                             )}

                             {isPromoApplied && (
                                <div className="flex justify-between items-center text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100 animate-in slide-in-from-top-1 duration-300 mb-4">
                                    <span className="flex items-center gap-1">✅ {appliedPromoData.label}:</span>
                                    <span>- {bundleLogic.promoDiscountAmount.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</span>
                                </div>
                             )}


                            <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                <span className="font-black text-slate-800">Toplam Tutur:</span>
                                <div className="text-right">
                                    {bundleLogic.isBundle && (
                                        <div className="text-xs text-gray-400 line-through font-bold mb-1 opacity-60">
                                            {(tourPrice + mealPrice).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}
                                        </div>
                                    )}
                                    <span className="text-2xl font-black text-[#008cb3]">{totalPrice.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</span>
                                </div>
                            </div>

                            {/* Promo Code Input */}
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Promosyon Kodu</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        placeholder="KOD GIRIN"
                                        className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 transition"
                                    />
                                    <button 
                                        onClick={() => handleApplyPromo()}
                                        className="bg-slate-800 text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-slate-900 transition"
                                    >
                                        UYGULA
                                    </button>
                                </div>
                                {isPromoApplied && (
                                    <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                        "{appliedPromoData.code}" kodu başarıyla uygulandı!
                                    </p>
                                )}
                            </div>
                        </>

                    ) : (
                        <div className="animate-pulse flex flex-col gap-4">
                            <div className="h-16 bg-gray-200 rounded-xl w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* UPSELL MODAL: Glassmorphism Akıllı Kombo Teklifi */}
            {showUpsellModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-white/70 backdrop-blur-2xl rounded-[48px] max-w-3xl w-full overflow-hidden shadow-[0_0_80px_rgba(249,115,22,0.25)] relative animate-in zoom-in-95 duration-700 border border-white/40">
                        {/* Parlama Efekti (Glow Decor) */}
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-500/20 rounded-full blur-[100px] animate-pulse"></div>
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-700"></div>

                        <div className="flex flex-col md:flex-row relative z-10">
                            {/* Sol: Görsel (Geniş ve Estetik) */}
                            <div className="w-full md:w-5/12 h-64 md:h-auto relative">
                                <img 
                                    src={suggestedCombo?.image} 
                                    className="w-full h-full object-cover" 
                                    alt={suggestedCombo?.name} 
                                />
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-orange-500/20"></div>
                                
                                {/* Discount Badge */}
                                <div className="absolute top-8 left-8">
                                    <div className="bg-orange-600 text-white text-[11px] font-black px-5 py-2.5 rounded-2xl uppercase tracking-widest shadow-2xl border border-orange-400/30 animate-bounce">
                                        -%15 PAKET İNDİRİMİ
                                    </div>
                                </div>
                            </div>

                            {/* Sağ: İçerik */}
                            <div className="w-full md:w-7/12 p-10 md:p-14 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-xl shadow-inner">💎</div>
                                    <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-[0.4em]">Özel Paket Teklifi</h4>
                                </div>

                                <h2 className="text-3xl md:text-4xl font-black text-orange-500 leading-[1.1] mb-6 tracking-tight">
                                    WAIT! WANT TO MAKE <br/> IT A <span className="text-slate-900 underline decoration-orange-500/30 underline-offset-8">VIP COMBO</span>?
                                </h2>

                                <div className="space-y-4 mb-10">
                                        <p className="text-sm font-bold text-slate-700">
                                            Seçtiğiniz tura <b>{suggestedCombo?.name}</b> paketi ekleyin.
                                        </p>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                                        Bu teklif sadece şu anki rezervasyonunuza özeldir. Ayrı ayrı alımlarda geçerli olmayan <b>VIP Paket Fiyatı</b> avantajını kaçırmayın.
                                    </p>

                                    <div className="flex items-center gap-4 py-4 px-2">
                                        <div className="flex-1 bg-white/30 border border-white/50 p-4 rounded-3xl text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Normal</p>
                                            <p className="text-xl font-bold text-slate-500 line-through">₺{suggestedCombo?.originalPrice}</p>
                                        </div>
                                        <div className="text-2xl font-black text-orange-500">➔</div>
                                        <div className="flex-1 bg-orange-50 border border-orange-100 p-4 rounded-3xl text-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-bl-xl shadow-sm">
                                                SAVE BIG!
                                            </div>
                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">VIP Kombo</p>
                                            <p className="text-2xl font-black text-slate-900">₺{suggestedCombo?.price}</p>
                                        </div>
                                    </div>

                                    <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <p className="text-[11px] font-black text-emerald-800 leading-tight">
                                            Upgrade now and get a VIP reserved table <br/> + Dual QR ticket instantly!
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
                                        className="w-full bg-orange-600 hover:bg-slate-900 text-white font-black py-5 rounded-[24px] shadow-[0_15px_40px_rgba(249,115,22,0.4)] transition-all transform active:scale-95 text-lg"
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
                                        className="w-full text-slate-400 font-bold py-2 text-[11px] hover:text-orange-600 transition-colors uppercase tracking-[0.2em]"
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
        <div className="min-h-screen bg-slate-50 flex flex-col py-8 px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-6xl mx-auto w-full mb-4">
                <Link href="/" className="text-[#008cb3] font-bold text-sm tracking-tight hover:underline flex items-center gap-2 group w-max">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Geri Dön
                </Link>
            </div>

            <Suspense fallback={<div className="text-center py-20 font-bold text-slate-400">Ödeme Altyapısı Yükleniyor...</div>}>
                <CheckoutLogic />
            </Suspense>
        </div>
    );
}
