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
                        total_price: tour ? (tour.price || 0) * guests : 0,
                    };
                    existingBookings.unshift(newBooking); // En başa ekle
                    localStorage.setItem('demo_new_bookings', JSON.stringify(existingBookings));
                } catch (e) {
                    console.error('Error saving mock booking', e);
                }
            }

            setStep(3); // Success Output
        }, 3000);
    };

    if (!tourId) return <div className="p-10 text-center">Eksik Rezervasyon Parametreleri</div>;
    if (!tour && step === 1) return <div className="p-10 text-center">Tur detayları yükleniyor...</div>;

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

                        <div className="mt-8 flex gap-4 w-full">
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
