'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchTour } from '../lib/tours';

function CheckoutLogic() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tourId = searchParams.get('tourId');
    const guests = parseInt(searchParams.get('guests') || '1');
    const date = searchParams.get('date');

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
            setStep(3); // Success Output
        }, 3000);
    };

    if (!tourId) return <div className="p-10 text-center">Eksik Rezervasyon Parametreleri</div>;
    if (!tour && step === 1) return <div className="p-10 text-center">Tur detayları yükleniyor...</div>;

    const totalPrice = tour ? tour.price * guests : 0;

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
                                        <span className="text-[#008cb3]">€ {totalPrice}</span>
                                    </div>
                                    <div className="h-px bg-gray-200"></div>
                                    <button onClick={handleSimulatePaymentProcess} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2">
                                        🔒 Güvenli Ödeme Yap
                                    </button>
                                </div>
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
                            </div>

                            <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                <span className="font-black text-slate-800">Toplam Tutar:</span>
                                <span className="text-2xl font-black text-[#008cb3]">€ {totalPrice}</span>
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
