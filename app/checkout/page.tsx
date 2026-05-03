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

    const handleProceedToPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email || !formData.hotelName) {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }
        setStep(2);
    };

    const handleSimulatePaymentProcess = () => {
        // Upsell Logic: Eğer sadece tur varsa ve henüz teklif gösterilmediyse
        if (!menuId && tour?.linked_restaurant && !upsellShown) {
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
        if (tPrice > 0 && mPrice > 0) {
            const sum = tPrice + mPrice;
            const discount = sum * 0.10; // %10 Paket İndirimi
            return {
                isBundle: true,
                discountAmount: discount,
                finalTotal: sum - discount
            };
        }
        return { isBundle: false, discountAmount: 0, finalTotal: tPrice + mPrice };
    };

    const bundleLogic = calculateBundleDiscount(tourPrice, mealPrice);
    const totalPrice = bundleLogic.finalTotal;

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

                             {bundleLogic.isBundle && (
                                <div className="flex justify-between items-center text-xs font-bold text-orange-600 bg-orange-50 p-2 rounded-xl border border-orange-100 animate-in slide-in-from-top-1 duration-300 mb-4">
                                    <span className="flex items-center gap-1">✨ Paket Avantajı (%10):</span>
                                    <span>- {bundleLogic.discountAmount.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</span>
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
                                    src={!menuId ? (tour?.linked_restaurant?.image || tour?.imageMain) : 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Hot_air_balloon_at_sunrise_over_Cappadocia%2C_Turkey.JPG'} 
                                    className="w-full h-full object-cover" 
                                    alt="Upsell" 
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
                                    <div className="flex items-start gap-3 bg-white/40 p-4 rounded-3xl border border-white/60">
                                        <span className="text-emerald-500 mt-1">✓</span>
                                        <p className="text-sm font-bold text-slate-700">
                                            {!menuId ? (
                                                <>Seçtiğiniz tura <b>{tour?.linked_restaurant?.special_menu_name || 'Özel Akşam Yemeği'}</b> paketi ekleyin.</>
                                            ) : (
                                                <>Seçtiğiniz yemeğe <b>Kapadokya Balon Turu</b> ekleyerek günü taçlandırın.</>
                                            )}
                                        </p>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                                        Bu teklif sadece şu anki rezervasyonunuza özeldir. Ayrı ayrı alımlarda geçerli olmayan <b>VIP Paket Fiyatı</b> avantajını kaçırmayın.
                                    </p>

                                    {/* Fiyat Karşılaştırma Görseli (New) */}
                                    <div className="flex items-center gap-4 py-4 px-2">
                                        <div className="flex-1 bg-white/30 border border-white/50 p-4 rounded-3xl text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard</p>
                                            <p className="text-xl font-bold text-slate-500 line-through">€150</p>
                                        </div>
                                        <div className="text-2xl font-black text-orange-500">➔</div>
                                        <div className="flex-1 bg-orange-50 border border-orange-100 p-4 rounded-3xl text-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-bl-xl shadow-sm">
                                                SAVE €25 EXTRA!
                                            </div>
                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">VIP Combo</p>
                                            <p className="text-2xl font-black text-slate-900">€175</p>
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
                                            if (!menuId) {
                                                params.set('menuId', tour?.linked_restaurant?.id || 'demo-menu');
                                            } else {
                                                params.set('tourId', 'kapadokya-klasik-balon');
                                            }
                                            router.replace(`/checkout?${params.toString()}`, { scroll: false });
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
