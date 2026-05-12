'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, Locale } from '../context/LocaleContext';
import { useCurrency, Currency } from '../context/CurrencyContext';
import { auth } from '../lib/auth';
import { fetchAPI } from '../lib/api';
import SecureFileUpload from '../components/SecureFileUpload';

export default function ProfilePage() {
    const router = useRouter();
    // Örnek Auth State'i (Gerçekte Context/Store'dan gelecek)
    const [userRole, setUserRole] = useState<'customer' | 'agency'>('customer');
    const [isVip, setIsVip] = useState(false);

    // Müşteri / Acenta Verileri Form State
    const [formState, setFormState] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        companyName: '',
        tursabNo: '',
        iban: '',
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: ''
    });

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Profil Fotoğrafı State'i ve Yükleme
    const [profileImage, setProfileImage] = useState('https://placehold.co/150x150/e2e8f0/475569.png?text=Avatar');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleSecureImageUpload = (secureFile: File, previewUrl: string) => {
        setSelectedFile(secureFile);
        setProfileImage(previewUrl);
    };

    // Load Profile
    useEffect(() => {
        const token = auth.getAccessToken();
        if (!token) {
            alert('Lütfen kişisel bilgilerinizi görmek için önce giriş yapın.');
            return;
        }

        fetchAPI('/users/me/', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(data => {
            if (!data) return;
            if (data.detail && data.code === 'token_not_valid') {
                auth.clearTokens();
                alert('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
                return;
            }
            setFormState(prev => ({
                ...prev,
                firstName: data.first_name || '',
                lastName: data.last_name || '',
                email: data.email || '',
                phone: data.profile?.phone_number || ''
            }));
            if (data.profile?.avatar) {
                setProfileImage(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${data.profile.avatar}`);
            }

            // VIP Check
            const vipData = localStorage.getItem('vip_membership');
            if (vipData) {
                const { level, expiry } = JSON.parse(vipData);
                if (level === 'VIP' && new Date(expiry) > new Date()) {
                    setIsVip(true);
                }
            }
        })
        .catch(() => {
            // Silently handle profile load error
        });
    }, [router]);

    // Global Tercihler State'leri
    const { locale, setLocale } = useLocale();
    const { currency, setCurrency } = useCurrency();

    // Kaydetme Simülasyonu
    const [isSaving, setIsSaving] = useState(false);
    const handleSave = async () => {
        setIsSaving(true);
        const token = auth.getAccessToken();
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            // Profil Verilerini Kaydet
            const formData = new FormData();
            formData.append('first_name', formState.firstName);
            formData.append('last_name', formState.lastName);
            formData.append('email', formState.email);
            // profile nesnesini göndermek için DRF'de iç içe objeler normalde json gerektirir 
            // ama UserSerializer update metodu pop('profile') yaparak alır.
            // Fakat Multipartformdata'da nested dict biraz farklı işler (profile.phone_number tarzı).
            // Backend'de parser JSON ise json atmak daha kolay.
            
            if (selectedFile) {
                // Eğer dosya seçiliyse DRF'e multipart göndermek zorundayız
                formData.append('profile.phone_number', formState.phone);
                formData.append('profile.avatar', selectedFile);

                await fetchAPI('/users/me/', {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            } else {
                // JSON payload
                await fetchAPI('/users/me/', {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        first_name: formState.firstName,
                        last_name: formState.lastName,
                        email: formState.email,
                        profile: {
                            phone_number: formState.phone
                        }
                    })
                });
            }

            // Şifre Değiştirme (İsteniyorsa)
            if (formState.newPassword && formState.currentPassword) {
                if (formState.newPassword !== formState.newPasswordConfirm) {
                    alert("Yeni şifreler eşleşmiyor.");
                    setIsSaving(false);
                    return;
                }
                const passData = await fetchAPI('/auth/password/change/', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        old_password: formState.currentPassword,
                        new_password: formState.newPassword
                    })
                });
                if (!passData) {
                    alert("Şifre güncellenemedi, mevcut şifrenizi kontrol edin.");
                }
            }

            alert('Profil tercihlerin ve kişisel bildilerin başarıyla kaydedildi!');
            setFormState(prev => ({ ...prev, currentPassword: '', newPassword: '', newPasswordConfirm: '' }));
        } catch (error) {
            console.error(error);
            alert("Bir hata oluştu.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Profilinizi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
        setIsSaving(true);
        try {
            const token = auth.getAccessToken();
            if (!token) return;
            const res = await fetchAPI('/users/me/', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res) {
                alert("Hesabınız başarıyla silindi.");
                auth.clearTokens();
                router.push('/');
            } else {
                throw new Error("Silme işlemi başarısız oldu.");
            }
        } catch (error: any) {
            console.error(error);
            const errMsg = error?.message || "";
            if (errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network')) {
                alert("Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.");
            } else {
                alert("Bir hata oluştu: " + errMsg);
            }
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background py-12 font-sans overflow-x-hidden transition-colors duration-500">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                {/* Üst Kısım: Başlık & Rol Değiştirici (TourkiaPuan vb. yerine demo amaçlı) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#005e85] dark:text-white tracking-tight">Kişisel Bilgilerim</h1>
                        <p className="text-gray-500 dark:text-slate-400 font-medium text-sm mt-1 flex items-center gap-2">
                            <Link href="/" className="hover:text-[#008cb3] dark:hover:text-blue-400 transition-colors flex items-center gap-1">
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
                        <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-slate-800 p-6 flex flex-col items-center relative overflow-hidden group transition-all duration-500">
                            <div className="absolute top-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600 z-0"></div>

                            <div className="relative z-10 w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl mt-6 group-hover:scale-105 transition-transform duration-300 bg-white dark:bg-slate-800 flex items-center justify-center">
                                {/* Profil Fotoğrafı */}
                                <Image src={profileImage} alt="Profil Fotoğrafı" fill sizes="128px" className="object-cover" />
                            </div>


                            <div className="relative z-10 mt-6">
                                <SecureFileUpload
                                    onFileAccepted={handleSecureImageUpload}
                                    currentImageUrl={profileImage}
                                    label="Fotoğrafı Değiştir"
                                    variant="round"
                                />
                            </div>

                            <h2 className="relative z-10 mt-4 text-xl font-black text-slate-800 dark:text-white text-center tracking-tight flex items-center justify-center gap-2">
                                {formState.firstName} {formState.lastName}
                                {isVip && (
                                    <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-tr from-yellow-400 via-orange-500 to-yellow-300 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.6)] animate-pulse border border-yellow-200" title="VIP Üye">
                                        <span className="text-[10px] font-black text-white">VIP</span>
                                    </div>
                                )}
                            </h2>
                            <span className={`relative z-10 text-xs font-bold mt-1 mb-2 px-3 py-1 rounded-md border ${isVip ? 'bg-yellow-50 text-orange-600 border-yellow-200 shadow-sm' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-100 dark:border-slate-700'}`}>
                                {userRole === 'agency' ? '🌟 VIP Acenta İş Ortağı' : isVip ? '🏆 Premium VIP Gezgin' : '✨ Diamond Gezgin'}
                            </span>

                            {/* Aktif Tur Sohbetim Button */}
                            {userRole !== 'agency' && (
                                <Link href="/group-chat" className="w-full mt-4 bg-gradient-to-r from-[#008cb3] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden group border border-blue-400">
                                    <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 rounded-bl-full group-hover:bg-white/30 transition-colors"></div>
                                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                                    <span className="tracking-wide">Aktif Tur Sohbetim</span>
                                    {/* Unread count badge simulation */}
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow border-2 border-white animate-pulse">3</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Sağ Sütun: Form Alanları */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Kişisel Bilgiler (Ana Bölüm) */}
                        <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-slate-800 p-6 md:p-8 transition-all duration-500">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>
                                Kimlik Bilgileri
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Adınız</label>
                                    <input type="text" name="firstName" value={formState.firstName} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Soyadınız</label>
                                    <input type="text" name="lastName" value={formState.lastName} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="relative">
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-Posta Adresi</label>
                                    <div className="relative flex items-center">
                                        <input type="email" name="email" value={formState.email} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold rounded-xl pl-4 pr-10 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                                        <span>Telefon Numarası</span>
                                        <span className="text-[9px] text-orange-500 normal-case">(Acil Ulaşım İçin)</span>
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-4 bg-gray-100 dark:bg-slate-800 border border-r-0 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 font-black rounded-l-xl text-sm">
                                            +90
                                        </span>
                                        <input type="tel" name="phone" value={formState.phone} onChange={handleInputChange} placeholder="5XX XXX XXXX" className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold rounded-r-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Sistem & Görünüm Tercihleri */}
                        <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-slate-800 p-6 md:p-8 transition-all duration-500">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></div>
                                Seçenekler ve Tercihler
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Para Birimi */}
                                <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl relative overflow-hidden group hover:border-[#008cb3] hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[12px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Varsayılan Para Birimi
                                        </label>
                                    </div>
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value as Currency)}
                                        className="w-full h-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white font-extrabold text-[15px] rounded-xl px-4 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 shadow-sm transition appearance-none cursor-pointer"
                                        style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23008cb3' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                                    >
                                        <option value="TRY">₺ Türk Lirası (TRY)</option>
                                        <option value="USD">$ Amerikan Doları (USD)</option>
                                        <option value="EUR">€ Euro (EUR)</option>
                                        <option value="RUB">₽ Rus Rublesi (RUB)</option>
                                    </select>
                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-2 leading-tight">Geçerli otel ve turlar bu kur baz alınarak hesaplanır.</p>
                                </div>

                                {/* Dil Tercihi */}
                                <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl relative overflow-hidden group hover:border-[#008cb3] hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[12px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5L15.6 13M3 13h12m-6 4l3-3m5-6h2a2 2 0 012 2v10a2 2 0 01-2 2h-2m-8 0v-2" /></svg>
                                            Arayüz Dili
                                        </label>
                                    </div>
                                    <select
                                        value={locale}
                                        onChange={(e) => setLocale(e.target.value as Locale)}
                                        className="w-full h-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white font-extrabold text-[15px] rounded-xl px-4 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 shadow-sm transition appearance-none cursor-pointer"
                                        style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23008cb3' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                                    >
                                        <option value="tr-TR">🇹🇷 Türkçe</option>
                                        <option value="en-US">🇺🇸 English</option>
                                        <option value="ru-RU">🇷🇺 Русский</option>
                                        <option value="de-DE">🇩🇪 Deutsch</option>
                                        <option value="zh-CN">🇨🇳 中文</option>
                                        <option value="ar-SA">🇸🇦 العربية</option>
                                        <option value="es-ES">🇪🇸 Español</option>
                                        <option value="fr-FR">🇫🇷 Français</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Acenta Bilgileri (Sadece Acentalar İçin Gösterilir) */}
                        {userRole === 'agency' && (
                            <div className="bg-orange-50/30 dark:bg-orange-900/10 rounded-[24px] shadow-sm border border-orange-200 dark:border-orange-800/30 p-6 md:p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 dark:bg-orange-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                                <h3 className="text-lg font-black text-orange-800 dark:text-orange-400 mb-6 flex items-center gap-2 relative z-10">
                                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
                                    Kurumsal Acenta Profili
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 relative z-10">
                                    <div>
                                        <label className="block text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-widest mb-1.5 ml-1">Firma / Ünvan Adı</label>
                                        <input type="text" defaultValue="Tourkia Turizm A.Ş." className="w-full bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800/30 text-slate-800 dark:text-white font-bold rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-widest mb-1.5 ml-1">TÜRSAB Belge Numarası</label>
                                        <input type="text" defaultValue="14833" className="w-full bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800/30 text-slate-800 dark:text-white font-bold rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-sm" maxLength={6} />
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <label className="block text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                                        <span>Banka IBAN (Hakedişler İçin)</span>
                                        <span className="text-[9px] text-green-600 font-bold bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800/30 px-2 rounded-full hidden sm:inline-block">Doğrulanmış Hesap</span>
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-4 bg-orange-100 dark:bg-slate-800 border border-r-0 border-orange-200 dark:border-orange-800/30 text-orange-800 dark:text-orange-400 font-extrabold rounded-l-xl text-sm shadow-sm">
                                            TR
                                        </span>
                                        <input type="text" defaultValue="61 0006 2000 1234 5678 9000 11" placeholder="Banka hesabınızın İBAN numarasını giriniz" className="w-full bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800/30 text-slate-800 dark:text-white font-bold tracking-wide rounded-r-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-sm font-mono text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Şifre & Güvenlik Özellikleri */}
                        <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-slate-800 p-6 md:p-8 transition-all duration-500">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <div className="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                                Güvenlik ve Şifre Belirleme
                            </h3>

                                <div className="space-y-5">
                                <div className="relative">
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kullanımdaki Mevcut Şifre</label>
                                    <div className="relative">
                                        <input type={showCurrentPassword ? "text" : "password"} name="currentPassword" value={formState.currentPassword} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-lg tracking-widest rounded-xl pl-4 pr-12 py-3 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all" />
                                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                                            {showCurrentPassword ? (
                                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
                                            ) : (
                                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                                            <span>Yeni Güçlü Şifre</span>
                                        </label>
                                        <div className="relative">
                                            <input type={showNewPassword ? "text" : "password"} name="newPassword" value={formState.newPassword} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-lg tracking-widest rounded-xl pl-4 pr-12 py-3 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all" />
                                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                                                {showNewPassword ? (
                                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
                                                ) : (
                                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Yeni Şifre (Yeniden Yazınız)</label>
                                        <div className="relative">
                                            <input type={showConfirmNewPassword ? "text" : "password"} name="newPasswordConfirm" value={formState.newPasswordConfirm} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-lg tracking-widest rounded-xl pl-4 pr-12 py-3 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all" />
                                            <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                                                {showConfirmNewPassword ? (
                                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
                                                ) : (
                                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. İşlem ve Kayıt Butonları (Bottom Action Bar) */}
                        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 mt-10">
                            {/* Silme İşlemi (Dikkat çekmeden ve kırmızı şekilde) */}
                            <button onClick={handleDeleteAccount} disabled={isSaving} className="text-red-500 hover:text-white hover:bg-red-500 text-sm font-bold px-6 py-3 rounded-xl transition-all w-full sm:w-auto mt-4 sm:mt-0 active:scale-95 flex items-center justify-center gap-2">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Profilimi Sil
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
