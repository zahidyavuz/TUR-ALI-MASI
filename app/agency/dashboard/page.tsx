'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import { fetchAPI } from '../../lib/api';
import { TOUR_DATA } from '../../lib/tours';
import { auth } from '../../lib/auth';
import { useRouter } from 'next/navigation';

export default function AgencyDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'my_tours' | 'quick_book' | 'profile' | 'finance' | 'deals' | 'blog_admin' | 'tour_chats'>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // API Veriler
    const [stats, setStats] = useState({
        totalSales: '₺145.500',
        activeBookings: 24,
        pendingEarnings: '₺12.400'
    });

    const [bookings, setBookings] = useState<any[]>([]);
    const [tours, setTours] = useState<any[]>([]);

    // Auth & Formatlama Helpers
    const [selectedQR, setSelectedQR] = useState<string | null>(null);

    // Blog CMS States
    const [blogTitle, setBlogTitle] = useState('');
    const [blogContent, setBlogContent] = useState('');
    const [blogCategory, setBlogCategory] = useState('Rehberler');
    const [blogTourSlug, setBlogTourSlug] = useState('');
    const [blogCoverUrl, setBlogCoverUrl] = useState('');
    const [isPublishingBlog, setIsPublishingBlog] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const token = auth.getAccessToken();
                if (!token) {
                    router.push('/login');
                    return;
                }

                // Call Django endpoint for agency dashboard
                const data = await fetchAPI('/agencies/dashboard/', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                // Mock fallback data for when backend is offline
                const fallbackData = data || {
                    metrics: { total_revenue: 145500, total_bookings: 34 },
                    recent_bookings: [
                        { id: 412, user_full_name: 'Ahmet Yılmaz', tour_detail: { title: 'Kapadokya Balon Turu' }, start_date: '2026-04-12', status: 'confirmed', total_price: 3400 },
                        { id: 413, user_full_name: 'Ayşe Kaya', tour_detail: { title: 'Büyük İtalya Turu' }, start_date: '2026-04-15', status: 'completed', total_price: 18150 }
                    ],
                    tours: TOUR_DATA
                };

                // Merge newly simulated bookings from localStorage (Offline DEMO Mode)
                if (typeof window !== 'undefined' && !data) {
                    try {
                        const localBookings = localStorage.getItem('demo_new_bookings');
                        if (localBookings) {
                            const parsed = JSON.parse(localBookings);
                            if (Array.isArray(parsed)) {
                                fallbackData.recent_bookings = [...parsed, ...fallbackData.recent_bookings];
                                
                                // Update total metrics natively
                                let addRev = 0;
                                parsed.forEach(p => { addRev += (Number(p.total_price) || 0) });
                                fallbackData.metrics.total_revenue += addRev;
                                fallbackData.metrics.total_bookings += parsed.length;
                            }
                        }
                    } catch (e) {
                        console.error('Error merging mock bookings', e);
                    }
                }

                setStats({
                    totalSales: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(fallbackData.metrics?.total_revenue || 0),
                    activeBookings: fallbackData.metrics?.total_bookings || 0,
                    pendingEarnings: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format((fallbackData.metrics?.total_revenue || 0) * 0.2) // varsayımsal hakediş
                });

                // Update Bookings
                if (fallbackData.recent_bookings) {
                    const mappedBookings = fallbackData.recent_bookings.map((b: any) => ({
                        id: `RES-${b.id.toString().padStart(4, '0')}`,
                        customer: b.user_full_name?.trim() || b.user_email || 'Misafir',
                        user_email: b.user_email,
                        tour: b.tour_detail?.title || 'Bilinmeyen Tur',
                        date: b.start_date ? new Date(b.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : b.date_label,
                        status: b.status === 'confirmed' ? 'Ödendi' : b.status === 'completed' ? 'Tamamlandı' : b.status === 'cancelled' ? 'İptal' : 'Bekliyor',
                        amount: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(b.total_price),
                        checkedIn: b.status === 'completed'
                    }));
                    setBookings(mappedBookings);
                }

                // Update Tours
                if (fallbackData.tours) {
                    setTours(fallbackData.tours);
                }
            } catch (err: any) {
                console.error('Failed to fetch agency dashboard:', err);
                setError(err.message || 'Panel verileri yüklenirken bir sorun oluştu.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [router]);

    const handleDownloadVoucher = (id: string) => {
        alert(`${id} numaralı rezervasyonun bileti (voucher) indiriliyor...`);
    };

    const handlePublishBlog = async () => {
        if (!blogTitle.trim() || !blogContent.trim()) {
            alert('Lütfen başlık ve içerik alanlarını doldurun.');
            return;
        }
        setIsPublishingBlog(true);
        try {
            const token = auth.getAccessToken();
            // Generate slug
            const slug = blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            
            const res = await fetchAPI('/blogs/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    slug: slug,
                    title: blogTitle,
                    content: blogContent,
                    excerpt: blogContent.substring(0, 150) + '...',
                    category: blogCategory,
                    related_tour_slug: blogTourSlug || null,
                    status: 'published',
                    reading_time: Math.max(1, Math.ceil(blogContent.split(' ').length / 200)) + ' dk'
                })
            });

            if (res.slug) {
                alert('Yazınız başarıyla yayımlandı!');
                setBlogTitle('');
                setBlogContent('');
                setBlogTourSlug('');
            } else {
                alert(res.error || res.detail || 'Yayımlanırken bir hata oluştu');
            }
        } catch (error) {
            console.error('Blog publish error', error);
            alert('Yazı yayımlanamadı.');
        } finally {
            setIsPublishingBlog(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">

            {/* Sidebar (Sol Menü) */}
            <aside className="w-full md:w-64 bg-[#0f172a] text-slate-300 flex flex-col shadow-2xl z-20 shrink-0">
                <div className="p-6 border-b border-slate-700/50 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">A</div>
                    <div>
                        <h1 className="text-white font-bold text-lg leading-tight uppercase tracking-wider">Acenta<span className="text-blue-400">Panel</span></h1>
                        <p className="text-[10px] text-slate-400 font-medium">B2B Yönetim Sistemi</p>
                    </div>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === 'dashboard' ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        Genel Bakış
                    </button>

                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === 'bookings' ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        Rezervasyonlar
                    </button>

                    <button
                        onClick={() => setActiveTab('my_tours')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === 'my_tours' ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Turlarım
                    </button>

                    <button
                        onClick={() => setActiveTab('tour_chats')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === 'tour_chats' ? 'bg-orange-500/10 text-orange-400' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                        Tur Operasyon & Chat
                    </button>

                    <button
                        onClick={() => setActiveTab('quick_book')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === 'quick_book' ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Hızlı Rezervasyon
                    </button>

                    <button
                        onClick={() => setActiveTab('finance')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === 'finance' ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Finans & Fatura
                    </button>

                    <button
                        onClick={() => setActiveTab('deals')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === 'deals' ? 'bg-orange-500/10 text-orange-400' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                        B2B Kampanyalar
                    </button>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === 'profile' ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Acenta Bilgileri
                    </button>

                    <button
                        onClick={() => setActiveTab('blog_admin')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm mt-4 border-t border-slate-700/50 pt-6 ${activeTab === 'blog_admin' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Blog İçerik Yönetimi
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-700/50 mt-auto">
                    <Link href="/" className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Siteye Dön
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative z-10 w-full">
                {/* Top Navbar */}
                <header className="bg-white px-8 py-5 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-sm z-20">
                    <h2 className="text-[22px] font-extrabold text-slate-800 uppercase tracking-tight">
                        {activeTab === 'dashboard' && 'Genel Bakış'}
                        {activeTab === 'bookings' && 'Rezervasyon Yönetimi'}
                        {activeTab === 'my_tours' && 'Turlarım & Yönetim'}
                        {activeTab === 'quick_book' && 'Hızlı Tur Satışı'}
                        {activeTab === 'finance' && 'Finans & Fatura Modülü'}
                        {activeTab === 'deals' && 'Acenta Özel Kampanyalar'}
                        {activeTab === 'profile' && 'Kurumsal Profil'}
                        {activeTab === 'blog_admin' && 'İçerik Stüdyosu (Blog Yönetimi)'}
                        {activeTab === 'tour_chats' && 'Operasyon Paneli (Aktif Tur Mesajlaşmaları)'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <button className="text-gray-400 hover:text-slate-700 transition relative">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 cursor-pointer">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-800 leading-tight">Tourkia Acentası</p>
                                <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-widest">Premium Partner</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-indigo-700 font-black">
                                M
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 gap-4">
                            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="font-bold">Veriler Yükleniyor...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-red-500 gap-4">
                            <div className="text-4xl text-red-400">⚠️</div>
                            <p className="font-bold">{error}</p>
                            <button onClick={() => window.location.reload()} className="mt-2 text-blue-500 underline text-sm">Tekrar Dene</button>
                        </div>
                    ) : (
                        <>
                            {/* TAB: DASHBOARD */}
                            {activeTab === 'dashboard' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Dashboard Kartları */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                        {/* Kart: Toplam Satış */}
                                        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition">
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Toplam Satış</h3>
                                                <div className="text-2xl font-black text-slate-800">{stats.totalSales}</div>
                                            </div>
                                        </div>

                                        {/* Kart: Aktif Rezervasyonlar */}
                                        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Aktif İşlemler</h3>
                                                <div className="text-2xl font-black text-slate-800">{stats.activeBookings}</div>
                                            </div>
                                        </div>

                                        {/* Kart: Bekleyen Hakediş */}
                                        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                                <svg className="w-24 h-24 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 relative z-10">
                                                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div className="relative z-10">
                                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Bekleyen Hakediş (₺)</h3>
                                                <div className="text-2xl font-black text-slate-800">{stats.pendingEarnings}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hızlı Tablo (Son Satışlar) */}
                                    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                            <h3 className="text-lg font-extrabold text-slate-800">Son İşlemler</h3>
                                            <button onClick={() => setActiveTab('bookings')} className="text-sm font-bold text-blue-500 hover:text-blue-600 transition">Tümünü Gör &rarr;</button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wider">
                                                        <th className="px-6 py-4 font-bold">Müşteri</th>
                                                        <th className="px-6 py-4 font-bold">Tur</th>
                                                        <th className="px-6 py-4 font-bold">Tutar</th>
                                                        <th className="px-6 py-4 font-bold text-right">Durum</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {bookings.slice(0, 3).map((item) => (
                                                        <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                                            <td className="px-6 py-4 text-sm font-semibold text-slate-800">{item.customer}</td>
                                                            <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.tour}</td>
                                                            <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.amount}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'Ödendi' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                                                    }`}>
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: TOUR CHATS */}
                            {activeTab === 'tour_chats' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[32px] p-8 text-white shadow-lg relative overflow-hidden">
                                        <div className="absolute right-0 top-0 opacity-10">
                                            <svg className="w-64 h-64 -mt-10 -mr-10" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16v12z"/></svg>
                                        </div>
                                        <div className="relative z-10">
                                            <h2 className="text-2xl font-black mb-2">Tur Operasyon & Chat Merkezi</h2>
                                            <p className="text-orange-100 font-medium text-sm max-w-xl mb-6">Tur başlangıcından 24 saat önce otomatik açılan ve bitiminden 24 saat sonra salt okunur arşivlenen müşteri gruplarınızı buradan yönetin. Hızlı duyurular gönderin ve toplanma noktaları belirleyin.</p>
                                        </div>
                                    </div>

                                    {/* Active Chats List */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        <div className="bg-white rounded-[24px] shadow-sm border-2 border-orange-400 p-6 relative flex flex-col hover:shadow-md transition">
                                            <div className="absolute top-4 right-4 bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md animate-pulse">● CANLI SOHBET</div>
                                            <h3 className="font-extrabold text-slate-800 text-lg pr-24 leading-tight mb-2">Kapadokya VIP Balon Turu</h3>
                                            <p className="text-xs text-gray-500 font-bold mb-4">Tarih: 15 Nisan 2026 • 15 Misafir</p>
                                            
                                            <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs font-semibold text-gray-600 border border-gray-100">
                                                <span className="text-orange-500 font-black">Son Mesaj:</span> "📍 Değerli Misafirlerimiz..." (Rehber)
                                            </div>

                                            <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
                                                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Durum: <span className="text-emerald-500">Aktif</span></span>
                                                <Link href="/group-chat" className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2">
                                                    Sohbete Katıl &rarr;
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 p-6 relative flex flex-col hover:shadow-md transition opacity-75">
                                            <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">SALT OKUNUR</div>
                                            <h3 className="font-extrabold text-slate-800 text-lg pr-24 leading-tight mb-2">Büyük İtalya Turu</h3>
                                            <p className="text-xs text-gray-500 font-bold mb-4">Tarih: 5 Nisan 2026 • 45 Misafir</p>
                                            
                                            <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs font-semibold text-gray-600 border border-gray-100">
                                                <span className="text-slate-500 font-black">Son Mesaj:</span> "Harika bir turdu, teşekkürler!" (Ayşe T.)
                                            </div>

                                            <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
                                                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Durum: <span className="text-slate-400">Arşivlendi</span></span>
                                                <Link href="/group-chat" className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2">
                                                    Arşivi Gör
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: BOOKINGS (REZERvasyonlar Tablosu) */}
                            {activeTab === 'bookings' && (
                                <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full min-h-[500px]">
                                    <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                                        <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            Tüm Rezervasyonlar
                                        </h3>
                                        <div className="relative w-full sm:w-64">
                                            <input type="text" placeholder="Müşteri veya PNR Ara..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition" />
                                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto flex-1 p-2">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b-2 border-slate-100 text-xs text-gray-400 uppercase tracking-widest">
                                                    <th className="px-6 py-4 font-bold">PNR</th>
                                                    <th className="px-6 py-4 font-bold">Müşteri Detayı</th>
                                                    <th className="px-6 py-4 font-bold">Tur & Tarih</th>
                                                    <th className="px-6 py-4 font-bold text-center">QR Bilet</th>
                                                    <th className="px-6 py-4 font-bold">Durum</th>
                                                    <th className="px-6 py-4 font-bold text-right">İşlem</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {bookings.map((item) => (
                                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                                        <td className="px-6 py-5 text-xs font-black text-slate-500 uppercase">{item.id}</td>
                                                        <td className="px-6 py-5">
                                                            <p className="text-sm font-bold text-slate-800">{item.customer}</p>
                                                            <p className="text-xs text-slate-400 mt-0.5">Ahmet.y@gmail.com</p>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <p className="text-sm font-bold text-slate-700">{item.tour}</p>
                                                            <p className="text-xs text-blue-500 font-semibold mt-0.5">{item.date}</p>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            {item.status !== 'İptal' ? (
                                                                <button
                                                                    onClick={() => setSelectedQR(item.id)}
                                                                    className={`p-2 rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-1 mx-auto ${item.checkedIn ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-white border border-gray-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}
                                                                >
                                                                    <QRCode value={`https://tourkia.com/checkin/${item.id}`} size={28} />
                                                                    <span className="text-[9px] font-black uppercase tracking-widest">{item.checkedIn ? 'GELDİ' : 'BİLET QR'}</span>
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 font-semibold">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="flex flex-col gap-2 items-start">
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'Ödendi' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                    item.status === 'Bekliyor' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                                        'bg-red-50 text-red-600 border border-red-100'
                                                                    }`}>
                                                                    {item.status}
                                                                </span>
                                                                {item.checkedIn && (
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-sm">
                                                                        ✓ Checked-In
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <button
                                                                onClick={() => handleDownloadVoucher(item.id)}
                                                                className="bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ml-auto shadow-sm active:scale-95"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                                Voucher İndir
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* QR Modal */}
                            {selectedQR && (
                                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative flex flex-col items-center animate-in zoom-in-95 duration-200">
                                        <button onClick={() => setSelectedQR(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                        </button>

                                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                                            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-1 text-center">Misafir Bilet QR Kodu</h3>
                                        <p className="text-xs font-semibold text-gray-400 mb-6 text-center">PNR: {selectedQR}</p>

                                        <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-gray-200 mb-6 shadow-sm">
                                            <QRCode value={`https://tourkia.com/checkin/${selectedQR}`} size={200} />
                                        </div>

                                        <button
                                            onClick={() => {
                                                setBookings(prev => prev.map(b => b.id === selectedQR ? { ...b, checkedIn: true } : b));
                                                setSelectedQR(null);
                                                alert(`${selectedQR} numaralı rezervasyon Check-in yapıldı (Rehber Simülasyonu)`);
                                            }}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                        >
                                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            Rehber Olarak Okut & Onayla
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* TAB: MY TOURS (TURLARIM) */}
                            {activeTab === 'my_tours' && (
                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-800">Turlarım</h2>
                                            <p className="text-slate-500 text-sm font-medium">Sistemde listelenen turlarınızı ('Kapadokya'yı Keşfet' Vitrini) yönetin.</p>
                                        </div>
                                        <button className="bg-[#008cb3] hover:bg-[#005e85] text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2">
                                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                            Yeni Tur Ekle
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {tours.map((t, idx) => (
                                            <div key={t.id || idx} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col group hover:shadow-xl transition-all duration-300">
                                                <div className="relative h-48 w-full overflow-hidden">
                                                    <Image src={t.image_main || t.imageMain || 'https://placehold.co/600x400'} alt={t.title} fill sizes="33vw" className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-black px-2 py-1 rounded-md shadow-sm">
                                                        #{idx + 1}
                                                    </div>
                                                </div>
                                                <div className="p-5 flex flex-col flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="text-base font-bold text-slate-800 leading-tight">{t.title}</h3>
                                                    </div>
                                                    {t.category && (
                                                        <span className="inline-block bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest w-max mb-3">
                                                            {t.category}
                                                        </span>
                                                    )}
                                                    <div className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {t.duration}
                                                    </div>
                                                    <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                                                        <div className="text-lg font-black text-[#008cb3]">₺{t.price}</div>
                                                        <div className="flex gap-2">
                                                            <button className="p-2 bg-slate-50 text-slate-400 hover:text-[#008cb3] hover:bg-blue-50 rounded-lg transition" title="Düzenle">
                                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                            </button>
                                                            <button className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Sil">
                                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB: QUICK BOOK */}
                            {activeTab === 'quick_book' && (
                                <div className="max-w-4xl mx-auto bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                                    <div className="bg-[#0f172a] p-8 text-white relative overflow-hidden">
                                        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
                                        <h2 className="text-2xl font-black mb-2 relative z-10">B2B Hızlı Satış Ekranı</h2>
                                        <p className="text-slate-400 text-sm font-medium relative z-10">Müşteriniz yanındayken saniyeler içinde tur satışını gerçekleştirin ve PDF Voucher oluşturun.</p>
                                    </div>

                                    <form className="p-8 space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Voucher oluşturuluyor...'); }}>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Tur & Tarih */}
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Tur Detayları</h4>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tur Seçimi <span className="text-red-500">*</span></label>
                                                    <select className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 outline-none focus:border-blue-400 focus:bg-white transition text-sm font-medium text-slate-800">
                                                        {tours.length > 0 ? tours.map((t, idx) => (
                                                            <option key={t.id || idx} value={t.id}>{t.title}</option>
                                                        )) : (
                                                            <>
                                                                <option>Kapadokya Balon Turu</option>
                                                                <option>Büyük İtalya Turu</option>
                                                                <option>Mavi Yolculuk - Fethiye</option>
                                                                <option>Kıbrıs Tatili</option>
                                                            </>
                                                        )}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Tarih <span className="text-red-500">*</span></label>
                                                        <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 outline-none focus:border-blue-400 focus:bg-white transition text-sm font-medium text-slate-800 uppercase" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Kişi Sayısı <span className="text-red-500">*</span></label>
                                                        <input type="number" min="1" defaultValue="1" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 outline-none focus:border-blue-400 focus:bg-white transition text-sm font-medium text-slate-800 [&::-webkit-inner-spin-button]:appearance-none text-center" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Müşteri Bilgileri */}
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Müşteri Bilgileri</h4>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Ad Soyad (Misafir 1) <span className="text-red-500">*</span></label>
                                                    <input type="text" placeholder="Örn: Ahmet Yılmaz" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 outline-none focus:border-blue-400 focus:bg-white transition text-sm font-medium text-slate-800" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">İletişim Numarası <span className="text-red-500">*</span></label>
                                                    <input type="tel" placeholder="+90 555 555 55 55" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 outline-none focus:border-blue-400 focus:bg-white transition text-sm font-medium text-slate-800" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Alt Bölüm */}
                                        <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4 w-full md:w-auto">
                                                <div className="flex-1">
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Net Acenta Fiyatı</span>
                                                    <span className="text-2xl font-black text-slate-800 leading-none">₺2.400</span>
                                                </div>
                                                <div className="h-10 w-px bg-emerald-200"></div>
                                                <div className="flex-1 pl-2">
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Kazanılacak Hakediş</span>
                                                    <span className="text-lg font-black text-emerald-600 leading-none">+₺240</span>
                                                </div>
                                            </div>

                                            <button type="submit" className="w-full md:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                                                Rezervasyonu Tamamla & Voucher Kes
                                            </button>
                                        </div>

                                    </form>
                                </div>
                            )}

                            {/* TAB: FINANCE */}
                            {activeTab === 'finance' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Cüzdan ve Ödeme Talebi */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gradient-to-br from-[#0f172a] to-slate-800 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
                                            <div className="relative z-10 flex flex-col h-full justify-between">
                                                <div className="flex items-center justify-between mb-8">
                                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Hakediş Cüzdanı
                                                    </h3>
                                                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/30">Aktif</span>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] text-slate-400 font-semibold mb-1">Çekilebilir Bakiye</p>
                                                    <p className="text-5xl font-black tracking-tight">{stats.pendingEarnings}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
                                            <h3 className="text-lg font-extrabold text-slate-800 mb-2">Ödeme Talebi Oluştur</h3>
                                            <p className="text-sm text-gray-500 font-medium mb-6">Mevcut bakiyeniz minimum ödeme eşiği olan <strong className="text-slate-700">₺5.000</strong>'nin üzerinde olduğu için hemen banka hesabınıza transfer talep edebilirsiniz.</p>

                                            <button
                                                onClick={() => alert('Ödeme talebiniz finans departmanımıza iletildi. Proforma faturanız oluşturuluyor...')}
                                                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 self-start flex items-center gap-3"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Hemen Ödeme İste
                                            </button>
                                        </div>
                                    </div>

                                    {/* Proforma Fatura ve Geçmiş Tablosu */}
                                    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden mt-6">
                                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                            <h3 className="text-lg font-extrabold text-slate-800">Proforma Faturalar & Ödeme Geçmişi</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wider border-b-2 border-slate-100">
                                                        <th className="px-6 py-4 font-bold">Fatura No</th>
                                                        <th className="px-6 py-4 font-bold">Tarih</th>
                                                        <th className="px-6 py-4 font-bold">Tutar</th>
                                                        <th className="px-6 py-4 font-bold">Durum</th>
                                                        <th className="px-6 py-4 font-bold text-right">Aksiyon</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {[
                                                        { no: 'PRF-2026-081', date: '25 Şubat 2026', amount: '₺24.500', status: 'Ödendi' },
                                                        { no: 'PRF-2026-042', date: '10 Ocak 2026', amount: '₺18.200', status: 'Ödendi' },
                                                        { no: 'PRF-2025-419', date: '15 Kasım 2025', amount: '₺42.000', status: 'Ödendi' },
                                                    ].map((inv) => (
                                                        <tr key={inv.no} className="hover:bg-slate-50/50 transition">
                                                            <td className="px-6 py-4 text-sm font-black text-slate-600">{inv.no}</td>
                                                            <td className="px-6 py-4 text-sm font-semibold text-slate-500">{inv.date}</td>
                                                            <td className="px-6 py-4 text-sm font-black text-slate-800">{inv.amount}</td>
                                                            <td className="px-6 py-4">
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">✓ {inv.status}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button className="text-xs font-bold text-blue-600 hover:text-blue-800 underline transition cursor-pointer">PDF İndir</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: DEALS (KAMPANYALAR) */}
                            {activeTab === 'deals' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Haftanın Fırsatı Banner */}
                                    <div className="relative w-full rounded-[32px] overflow-hidden shadow-2xl bg-slate-900 group cursor-pointer" onClick={() => alert('Kampanya detayları yükleniyor...')}>
                                        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/20 rounded-full blur-3xl mix-blend-overlay"></div>
                                        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="text-left">
                                                <span className="inline-block px-4 py-1.5 bg-white text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-4 shadow-sm animate-pulse">B2B Haftanın Fırsatı 🔥</span>
                                                <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2">Kapadokya VIP Balon</h2>
                                                <p className="text-orange-100 font-medium text-sm md:text-base max-w-xl">
                                                    Sadece size özel! Bu hafta yapacağınız her "Kapadokya VIP Balon" rezervasyonunda net alış fiyatı üzerinden <strong className="text-white">%15 EK KOMİSYON</strong> kazanın.
                                                </p>
                                            </div>
                                            <div className="shrink-0">
                                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center shadow-inner">
                                                    <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest mb-1">Acenta Net Fiyatı</p>
                                                    <div className="flex items-end justify-center gap-2">
                                                        <span className="text-lg text-white/50 line-through font-bold">₺4.000</span>
                                                        <span className="text-4xl font-black text-white">₺3.400</span>
                                                    </div>
                                                    <button className="mt-4 w-full bg-white text-orange-600 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-transform active:scale-95 shadow-md">
                                                        Hemen Satış Yap
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Diğer B2B Fırsatları */}
                                    <div>
                                        <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                                            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                                            Aktif Acenta Promosyonları
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                            {/* Promosyon Kartı 1 */}
                                            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-shadow relative">
                                                <div className="absolute top-4 right-4 z-10 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md uppercase tracking-widest">3 Al 2 Öde</div>
                                                <div className="h-40 bg-slate-200 relative overflow-hidden">
                                                    <Image
                                                        src="https://images.unsplash.com/photo-1516483638261-f40af5bea098?fit=crop&w=600&q=80"
                                                        alt="Roma"
                                                        fill
                                                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                                                        sizes="(max-width: 768px) 100vw, 33vw"
                                                    />
                                                </div>
                                                <div className="p-6 flex flex-col flex-1">
                                                    <h4 className="font-extrabold text-lg text-slate-800 mb-2">Büyük İtalya Turu</h4>
                                                    <p className="text-sm font-medium text-gray-500 mb-4 line-clamp-2">Tek seferde yapılacak 3 kişilik rezervasyonlarda 1 kişi bedava!</p>
                                                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Normal Satış</p>
                                                            <p className="text-sm font-bold text-slate-800">₺18.150 <span className="text-xs font-semibold text-gray-400">/kişi</span></p>
                                                        </div>
                                                        <button onClick={() => setActiveTab('quick_book')} className="bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition">Satış Yap</button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Promosyon Kartı 2 */}
                                            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-shadow relative">
                                                <div className="absolute top-4 right-4 z-10 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md uppercase tracking-widest">Grup İndirimi</div>
                                                <div className="h-40 bg-slate-200 relative overflow-hidden">
                                                    <Image
                                                        src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?fit=crop&w=600&q=80"
                                                        alt="Japonya"
                                                        fill
                                                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                                                        sizes="(max-width: 768px) 100vw, 33vw"
                                                    />
                                                </div>
                                                <div className="p-6 flex flex-col flex-1">
                                                    <h4 className="font-extrabold text-lg text-slate-800 mb-2">Japonya Sakura Dönemi</h4>
                                                    <p className="text-sm font-medium text-gray-500 mb-4 line-clamp-2">10 kişi ve üzeri grup satışlarında anında ₺15.000 ekstra nakit bonus.</p>
                                                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Normal Satış</p>
                                                            <p className="text-sm font-bold text-slate-800">₺45.000 <span className="text-xs font-semibold text-gray-400">/kişi</span></p>
                                                        </div>
                                                        <button onClick={() => setActiveTab('quick_book')} className="bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition">Satış Yap</button>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: PROFILE */}
                            {activeTab === 'profile' && (
                                <div className="max-w-3xl mx-auto bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="p-8 border-b border-gray-100 flex items-center gap-6">
                                        <div className="relative group cursor-pointer">
                                            <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:border-blue-300 group-hover:text-blue-500 transition overflow-hidden">
                                                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                <span className="text-[10px] font-bold">Logo Yükle</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">Tourkia Acentası (Premium)</h3>
                                            <p className="text-sm text-gray-400 font-medium">B2B ID: #AGT-902144</p>
                                        </div>
                                    </div>

                                    <div className="p-8 space-y-6">

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Firma / Acenta Ünvanı</label>
                                                <input type="text" defaultValue="Tourkia Seyahat Acentası Bilişim Tic. Ltd. Şti." className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 text-sm font-medium text-slate-800" readOnly />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">TÜRSAB Belge No</label>
                                                <input type="text" defaultValue="14552" className="w-full border-2 border-emerald-500/30 rounded-xl px-4 py-3 bg-emerald-50 text-sm font-bold text-emerald-700" readOnly />
                                                <span className="text-[10px] text-emerald-600 font-bold mt-1 block">✓ Elektronik olarak doğrulandı</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Vergi Dairesi</label>
                                                <input type="text" defaultValue="Marmara Kurumlar V.D." className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-blue-400 transition text-sm font-medium text-slate-800" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Vergi Kimlik No (VKN)</label>
                                                <input type="text" defaultValue="5551234567" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-blue-400 transition text-sm font-medium text-slate-800" />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">İrtibat E-Posta Adresi</label>
                                            <input type="email" defaultValue="iletisim@tourkia.com" className="w-full md:w-1/2 border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-blue-400 transition text-sm font-medium text-slate-800" />
                                        </div>

                                        <div className="pt-6 text-right">
                                            <button className="px-8 py-3 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-colors">
                                                Bilgilerimi Güncelle
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            )}

                            {/* TAB: BLOG ADMIN / CMS */}
                            {activeTab === 'blog_admin' && (
                                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                                <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                Yazı Yöneticisi (CMS)
                                            </h3>
                                            <p className="text-sm text-gray-400 font-medium mt-1">SEO odaklı yeni bir makale veya rehber oluşturun.</p>
                                        </div>
                                        <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                            Yeni Yazı Taslağı
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 space-y-6">
                                            {/* Editör Alanı */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Başlık</label>
                                                <input value={blogTitle} onChange={e => setBlogTitle(e.target.value)} type="text" placeholder="Örn: 2026 Yazının En Gözde 5 Tatil Rotası" className="w-full border-2 border-gray-100 rounded-2xl px-5 py-4 bg-slate-50 focus:bg-white outline-none focus:border-indigo-400 transition text-lg font-black text-slate-800 placeholder-gray-300" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
                                                    <span>İçerik (Markdown Destekli)</span>
                                                    <span className="text-indigo-500 cursor-pointer">+ Görsel / Medya Ekle</span>
                                                </label>
                                                <textarea value={blogContent} onChange={e => setBlogContent(e.target.value)} rows={15} placeholder="## Giriş&#10;Yazınıza buradan başlayın. Kalın yapmak için **yazı**, link için [Link Text](url) kullanabilirsiniz." className="w-full border border-gray-200 rounded-2xl px-5 py-4 bg-slate-50 focus:bg-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition text-sm font-medium text-slate-700 leading-relaxed font-mono resize-y"></textarea>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {/* SEO & Meta Ayarları */}
                                            <div className="bg-slate-50 border border-gray-100 rounded-2xl p-6">
                                                <h4 className="font-bold text-slate-800 border-b border-gray-200 pb-3 mb-4 flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                    SEO Verileri
                                                </h4>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Kategori</label>
                                                        <select value={blogCategory} onChange={e => setBlogCategory(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-white text-sm font-medium text-slate-700 outline-none">
                                                            <option>Rehberler</option>
                                                            <option>Gurme</option>
                                                            <option>Vize İşlemleri</option>
                                                            <option>Acenta Haberleri</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Müşteri Yönlendirme (CTA) Turu</label>
                                                        <select value={blogTourSlug} onChange={e => setBlogTourSlug(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-white text-sm font-medium text-slate-700 outline-none">
                                                            <option value="">Hiçbiri</option>
                                                            {tours.map(t => (
                                                                <option key={t.slug} value={t.slug}>{t.title}</option>
                                                            ))}
                                                        </select>
                                                        <p className="text-[10px] font-semibold text-gray-400 mt-1">Yazının sonuna 'Hemen İncele' butonu koyar.</p>
                                                    </div>
                                                    {/* Cover Photo URL is ignored in MVP for simplicity or we can add it to state */}
                                                </div>
                                                <button onClick={handlePublishBlog} disabled={isPublishingBlog} className="w-full mt-6 bg-slate-800 hover:bg-black text-white px-4 py-3 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                    {isPublishingBlog ? 'Yayımlanıyor...' : 'Yazıyı Yayımla 🚀'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

        </div>
    );
}
