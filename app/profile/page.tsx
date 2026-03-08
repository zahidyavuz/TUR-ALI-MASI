'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, Locale } from '../context/LocaleContext';
import { useCurrency, Currency } from '../context/CurrencyContext';

export default function ProfilePage() {
    // Örnek Auth State'i (Gerçekte Context/Store'dan gelecek)
    const [userRole, setUserRole] = useState<'customer' | 'agency'>('customer');

    // Müşteri / Acenta Verileri Form State
    const [formState, setFormState] = useState({
        firstName: 'Ahmet',
        lastName: 'Yılmaz',
        email: 'ahmet@example.com',
        phone: '532 123 4567',
        companyName: 'Yılmazlar Turizm Otelcilik A.Ş.',
        tursabNo: '14833',
        iban: '61 0006 2000 1234 5678 9000 11',
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Profil Fotoğrafı State'i ve Yükleme
    const [profileImage, setProfileImage] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Global Tercihler State'leri
    const { locale, setLocale } = useLocale();
    const { currency, setCurrency } = useCurrency();

    // Kaydetme Simülasyonu
    const [isSaving, setIsSaving] = useState(false);
    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call to DB / Firestore
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSaving(false);
        alert('Profil tercihlerin ve kişisel bildilerin başarıyla kaydedildi!');
    };


    return (
        <div className="min-h-screen bg-slate-50 py-12 font-sans overflow-x-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                {/* Üst Kısım: Başlık & Rol Değiştirici (MelihPuan vb. yerine demo amaçlı) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#005e85] tracking-tight">Kişisel Bilgilerim</h1>
                        <p className="text-gray-500 font-medium text-sm mt-1 flex items-center gap-2">
                            <Link href="/" className="hover:text-[#008cb3] transition-colors flex items-center gap-1">
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Anasayfaya Dön
                            </Link>
                        </p>
                    </div>

                    {/* Switcher kaldırıldı */}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* Sol Sütun: Profil Özeti & Fotoğraf */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 flex flex-col items-center relative overflow-hidden group">
                            <div className="absolute top-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600 z-0"></div>

                            <div className="relative z-10 w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl mt-6 group-hover:scale-105 transition-transform duration-300 bg-white flex items-center justify-center">
                                {/* Profil Fotoğrafı */}
                                <Image src={profileImage} alt="Profil Fotoğrafı" fill sizes="128px" className="object-cover" />
                            </div>

                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                            <button onClick={() => fileInputRef.current?.click()} className="relative z-10 mt-5 text-[13px] font-bold text-[#008cb3] hover:text-white bg-blue-50 hover:bg-[#008cb3] px-6 py-2.5 rounded-full transition duration-300 shadow-sm flex items-center gap-2">
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Fotoğrafı Değiştir
                            </button>

                            <h2 className="relative z-10 mt-4 text-xl font-black text-slate-800 text-center tracking-tight">{formState.firstName} {formState.lastName}</h2>
                            <span className="relative z-10 text-xs font-bold text-gray-400 mt-1 mb-2 bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
                                {userRole === 'agency' ? '🌟 VIP Acenta İş Ortağı' : '✨ Diamond Gezgin'}
                            </span>
                        </div>
                    </div>

                    {/* Sağ Sütun: Form Alanları */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Kişisel Bilgiler (Ana Bölüm) */}
                        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 md:p-8">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>
                                Kimlik Bilgileri
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Adınız</label>
                                    <input type="text" defaultValue="Ahmet" className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-semibold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Soyadınız</label>
                                    <input type="text" defaultValue="Yılmaz" className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-semibold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="relative">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">E-Posta Adresi</label>
                                    <div className="relative flex items-center">
                                        <input type="email" defaultValue="ahmet@example.com" className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-semibold rounded-xl pl-4 pr-24 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                        <div className="absolute right-2 bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1 text-[10px] font-extrabold px-2 py-1 rounded-md shadow-sm">
                                            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            DOĞRULANDI
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                                        <span>Telefon Numarası</span>
                                        <span className="text-[9px] text-orange-500 normal-case">(Acil Ulaşım İçin)</span>
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-4 bg-gray-100 border border-r-0 border-gray-200 text-gray-500 font-black rounded-l-xl text-sm">
                                            +90
                                        </span>
                                        <input type="tel" defaultValue="532 123 4567" placeholder="5XX XXX XXXX" className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-semibold rounded-r-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Sistem & Görünüm Tercihleri */}
                        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 md:p-8">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></div>
                                Seçenekler ve Tercihler
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Para Birimi */}
                                <div className="bg-slate-50/50 border border-gray-100 p-4 rounded-2xl relative overflow-hidden group hover:border-[#008cb3] hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[12px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Varsayılan Para Birimi
                                        </label>
                                    </div>
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value as Currency)}
                                        className="w-full h-12 bg-white border border-gray-200 text-slate-800 font-extrabold text-[15px] rounded-xl px-4 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 shadow-sm transition appearance-none cursor-pointer"
                                        style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23008cb3' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                                    >
                                        <option value="TRY">₺ Türk Lirası (TRY)</option>
                                        <option value="USD">$ Amerikan Doları (USD)</option>
                                        <option value="EUR">€ Euro (EUR)</option>
                                        <option value="RUB">₽ Rus Rublesi (RUB)</option>
                                    </select>
                                    <p className="text-[10px] text-gray-400 font-medium mt-2 leading-tight">Geçerli otel ve turlar bu kur baz alınarak hesaplanır.</p>
                                </div>

                                {/* Dil Tercihi */}
                                <div className="bg-slate-50/50 border border-gray-100 p-4 rounded-2xl relative overflow-hidden group hover:border-[#008cb3] hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[12px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5L15.6 13M3 13h12m-6 4l3-3m5-6h2a2 2 0 012 2v10a2 2 0 01-2 2h-2m-8 0v-2" /></svg>
                                            Arayüz Dili
                                        </label>
                                    </div>
                                    <select
                                        value={locale}
                                        onChange={(e) => setLocale(e.target.value as Locale)}
                                        className="w-full h-12 bg-white border border-gray-200 text-slate-800 font-extrabold text-[15px] rounded-xl px-4 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 shadow-sm transition appearance-none cursor-pointer"
                                        style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23008cb3' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                                    >
                                        <option value="tr-TR">🇹🇷 Türkçe</option>
                                        <option value="en-US">🇺🇸 English</option>
                                        <option value="ru-RU">🇷🇺 Русский</option>
                                        <option value="de-DE">🇩🇪 Deutsch</option>
                                        <option value="zh-CN">🇨🇳 中文</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Acenta Bilgileri (Sadece Acentalar İçin Gösterilir) */}
                        {userRole === 'agency' && (
                            <div className="bg-orange-50/30 rounded-[24px] shadow-sm border border-orange-200 p-6 md:p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                                <h3 className="text-lg font-black text-orange-800 mb-6 flex items-center gap-2 relative z-10">
                                    <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
                                    Kurumsal Acenta Profili
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 relative z-10">
                                    <div>
                                        <label className="block text-[11px] font-bold text-orange-700 uppercase tracking-widest mb-1.5 ml-1">Firma / Ünvan Adı</label>
                                        <input type="text" defaultValue="Yılmazlar Turizm Otelcilik A.Ş." className="w-full bg-white border border-orange-200 text-slate-800 font-bold rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-orange-700 uppercase tracking-widest mb-1.5 ml-1">TÜRSAB Belge Numarası</label>
                                        <input type="text" defaultValue="14833" className="w-full bg-white border border-orange-200 text-slate-800 font-bold rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-sm" maxLength={6} />
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <label className="block text-[11px] font-bold text-orange-700 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                                        <span>Banka IBAN (Hakedişler İçin)</span>
                                        <span className="text-[9px] text-green-600 font-bold bg-green-50 border border-green-100 px-2 rounded-full hidden sm:inline-block">Doğrulanmış Hesap</span>
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-4 bg-orange-100 border border-r-0 border-orange-200 text-orange-800 font-extrabold rounded-l-xl text-sm shadow-sm">
                                            TR
                                        </span>
                                        <input type="text" defaultValue="61 0006 2000 1234 5678 9000 11" placeholder="Banka hesabınızın İBAN numarasını giriniz" className="w-full bg-white border border-orange-200 text-slate-800 font-bold tracking-wide rounded-r-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-sm font-mono text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Şifre & Güvenlik Özellikleri */}
                        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 md:p-8">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                                Güvenlik ve Şifre Belirleme
                            </h3>

                            <div className="space-y-5">
                                <div className="relative">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Kullanımdaki Mevcut Şifre</label>
                                    <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-mono text-lg tracking-widest rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                                            <span>Yeni Güçlü Şifre</span>
                                        </label>
                                        <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-mono text-lg tracking-widest rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Yeni Şifre (Yeniden Yazınız)</label>
                                        <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-mono text-lg tracking-widest rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. İşlem ve Kayıt Butonları (Bottom Action Bar) */}
                        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 mt-10">
                            {/* Silme İşlemi (Dikkat çekmeden ve kırmızı şekilde) */}
                            <button className="text-red-500 hover:text-white hover:bg-red-500 text-sm font-bold px-6 py-3 rounded-xl transition-all w-full sm:w-auto mt-4 sm:mt-0 active:scale-95 flex items-center justify-center gap-2">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Profilimi Süresiz Sil
                            </button>

                            {/* Kaydet İşlemi (Vurgulu ve belirgin şekilde) */}
                            <button onClick={handleSave} disabled={isSaving} className={`bg-[#008cb3] hover:bg-[#005e85] text-white text-[15px] font-extrabold px-10 py-4 rounded-[16px] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 w-full sm:w-auto flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-wait' : ''}`}>
                                {isSaving ? 'Kaydediliyor...' : 'Profilimi ve Ayarlarımı Kaydet'}
                                {!isSaving && <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </button>
                        </div>

                        {/* Acenta için Müşteri Görünümü Switcher */}
                        {userRole === 'agency' && (
                            <div className="flex justify-center mt-12 mb-6">
                                <button
                                    onClick={() => alert("Müşteri görünümüne geçiliyor... (Test Modu)")}
                                    className="text-[10px] font-bold text-gray-400 hover:text-[#008cb3] flex items-center gap-1.5 transition-colors"
                                >
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    Geçici Olarak Müşteri Profiline Geç (Önizleme)
                                </button>
                            </div>
                        )}
                        <div className="h-10"></div> {/* Bottom Padding */}
                    </div>
                </div>
            </div>
        </div>
    );
}
