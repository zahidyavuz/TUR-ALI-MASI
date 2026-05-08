'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/auth';
import { verifyLocalBookingOwnership } from '../lib/idor';
import ForbiddenPage from '../components/ForbiddenPage';

export default function MyBookingsPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    // Sekme yönetimi (Segmented Control)
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [bookings, setBookings] = useState<any>({ upcoming: [], past: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [deniedMessage, setDeniedMessage] = useState('');

    // Review Modal State
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewingTourId, setReviewingTourId] = useState<string | null>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/login');
            return;
        }

        if (!user) return; // Wait until loaded

        const fetchBookings = async () => {
            setIsLoading(true);
            try {
                const token = auth.getAccessToken();
                // Assumes backend has a /bookings/my-bookings/ endpoint
                const data = await fetchAPI('/bookings/my-bookings/', {
                    method: 'GET',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                });

                // The backend might return an array of all bookings, or already separated.
                // Assuming it returns an array of Bookings, we separate them here based on date/status
                const upcoming: any[] = [];
                const past: any[] = [];
                const now = new Date();

                if (!data) return;
                (Array.isArray(data) ? data : data.results || []).forEach((b: any) => {
                    // Adapt Django backend fields to the frontend expected format
                    const ticketStr = b.id ? `TKT-${b.id.toString().padStart(5, '0')}A` : 'TKT-PENDING';
                    const tourDate = b.date ? new Date(b.date) : new Date();
                    const isPast = tourDate < now;

                    const ticket = {
                        id: ticketStr,
                        tourId: b.tour || b.tour_id, // ensure we have the internal tour ID for reviews
                        title: b.tour_title || 'Tur Rezervasyonu',
                        date: tourDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                        time: b.time || '09:00 AM',
                        status: b.status === 'confirmed' ? 'Onaylandı' : b.status === 'completed' ? 'Tamamlandı' : 'Onay Bekliyor',
                        statusColor: b.status === 'confirmed' ? 'text-green-600 bg-green-50 border-green-200' :
                            b.status === 'completed' ? 'text-gray-600 bg-gray-100 border-gray-200' :
                                'text-yellow-600 bg-yellow-50 border-yellow-200',
                        image: b.tour_image || 'https://images.unsplash.com/photo-1642320008433-286a512c1fb3?auto=format&fit=crop&q=80',
                        qrLink: `/offline-tickets/${b.id || 'upcoming'}`,
                    };

                    if (isPast || b.status === 'completed' || b.status === 'cancelled') {
                        past.push(ticket);
                    } else {
                        upcoming.push(ticket);
                    }
                });

                setBookings({ upcoming, past });
            } catch (err: any) {
                setError('Biletleriniz yüklenirken bir sorun oluştu.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBookings();
    }, [user, isAuthLoading, router]);

    const handleOpenReview = (tourId: string) => {
        setReviewingTourId(tourId);
        setRating(5);
        setComment('');
        setReviewSuccess(false);
        setReviewModalOpen(true);
    };

    const submitReview = async () => {
        if (!reviewingTourId) return;
        setIsSubmittingReview(true);
        try {
            const token = auth.getAccessToken();
            await fetchAPI('/reviews/', {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    tour: reviewingTourId,
                    rating,
                    comment
                })
            });
            setReviewSuccess(true);
            setTimeout(() => {
                setReviewModalOpen(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to submit review:', err);
            alert('Değerlendirme gönderilemedi. Lütfen tekrar deneyiniz.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // Aktif sekmeye göre gösterilecek liste
    const displayTickets = activeTab === 'upcoming' ? bookings.upcoming : bookings.past;

    // IDOR: Bilet kaydedildiğinde sahiplik ID'sini localStorage'a aktar
    const handleSecureTicketNav = async (
        e: React.MouseEvent,
        ticketId: string,
        href: string
    ) => {
        e.preventDefault();
        // Demo modda local ownership check
        const rawId = ticketId.replace(/^TKT-0*/, '').replace(/[A-Z]+$/, '');
        const check = verifyLocalBookingOwnership(rawId);
        if (!check.allowed && check.reason === 'forbidden') {
            setDeniedMessage(`'${ticketId}' numaralı bileti görüntüleme yetkiniz yok.`);
            setAccessDenied(true);
            return;
        }
        router.push(href);
    };

    return (
        <>
        {accessDenied && (
            <ForbiddenPage message={deniedMessage || 'Bu kaynağa erişim yetkiniz yok.'} />
        )}
        {!accessDenied && (
        <main className="min-h-screen bg-[#F2F2F7] dark:bg-background pb-20 pt-8 sm:py-12 transition-colors duration-500">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">

                {/* Header */}
                <div className="mb-8 pl-1">
                    <Link href="/" className="inline-flex items-center gap-2 text-[#008cb3] dark:text-blue-400 font-bold text-sm mb-4 hover:underline">
                        <span>←</span> Ana Sayfaya Dön
                    </Link>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Biletlerim</h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-1">Gelecek maceralarınızı ve geçmiş seyahatlerinizi yönetin.</p>
                </div>

                {/* iOS Style Segmented Control */}
                <div className="bg-gray-200/60 dark:bg-slate-800 p-1 rounded-xl mb-8 flex relative z-10 w-full max-w-sm mx-auto sm:mx-0">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-[9px] transition-all duration-300 z-10 ${activeTab === 'upcoming' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                        Gelecek Turlar
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-[9px] transition-all duration-300 z-10 ${activeTab === 'past' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                        Geçmiş Turlar
                    </button>
                </div>

                {/* FlatList (Bilet Kartları Listesi) */}
                <div className="flex flex-col gap-5">
                    {isLoading ? (
                        <div className="text-center py-12 text-gray-500 dark:text-slate-400 font-semibold space-y-4">
                            <div className="w-8 h-8 mx-auto border-4 border-slate-200 dark:border-slate-800 border-t-[#008cb3] rounded-full animate-spin"></div>
                            Biletleriniz yükleniyor...
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-500 font-semibold">{error}</div>
                    ) : displayTickets.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-slate-400">Bu kategoride biletiniz bulunmuyor.</div>
                    ) : (
                        displayTickets.map((ticket: any) => (
                            <div
                                key={ticket.id}
                                // Apple Style Gölgelendirme (shadow-sm, hafif saydam) ve BorderRadius (rounded-[15px])
                                className="bg-white dark:bg-slate-900 rounded-[15px] p-4 sm:p-5 flex gap-4 sm:gap-5 relative border border-gray-100/50 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] group"
                            >
                                {/* Sol: Tur Fotoğrafı */}
                                <div className="w-24 h-28 sm:w-32 sm:h-32 rounded-[12px] overflow-hidden shrink-0 relative bg-slate-100 dark:bg-slate-800">
                                    <Image
                                        src={ticket.image}
                                        alt={ticket.title}
                                        fill
                                        sizes="(max-width: 768px) 96px, 128px"
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>

                                {/* Orta: Detaylar */}
                                <div className="flex flex-col justify-between flex-1 py-1">
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <span className="text-[10px] font-black tracking-widest text-[#008cb3] dark:text-blue-400 uppercase">{ticket.id}</span>
                                            {/* Durum (Onaylandı / Beklemede) */}
                                            <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border ${ticket.statusColor} uppercase tracking-wider`}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base leading-snug line-clamp-2 max-w-[90%]">
                                            {ticket.title}
                                        </h3>
                                    </div>

                                    <div className="mt-3 flex flex-col gap-1.5 justify-end">
                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium">
                                            <span className="opacity-70 text-base">📅</span> {ticket.date}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium">
                                            <span className="opacity-70 text-base">⏰</span> {ticket.time}
                                        </div>
                                    </div>
                                </div>

                                {/* Alt Kısım Butonlar (Review) */}
                                {activeTab === 'past' && ticket.tourId && (
                                    <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5">
                                        <button
                                            onClick={() => handleOpenReview(ticket.tourId)}
                                            className="px-4 py-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-800 hover:text-orange-700 text-xs font-bold rounded-lg transition-colors border border-orange-200 dark:border-orange-800/50"
                                        >
                                            Değerlendir ★
                                        </button>
                                    </div>
                                )}

                                {/* Sağ Alt: QR İkon/Kısayol */}
                                {activeTab === 'upcoming' && (
                                    <Link
                                        href={ticket.qrLink}
                                        onClick={(e) => handleSecureTicketNav(e, ticket.id, ticket.qrLink)}
                                        className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 w-10 h-10 bg-[#F2F2F7] dark:bg-slate-800 hover:bg-[#E5E5EA] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors active:scale-90"
                                        aria-label="Bileti Görüntüle / QR Kod"
                                    >
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
                                            {/* İç Noktalar (QR Detayı) */}
                                            <path d="M6 6h2v2H6zm10 0h2v2h-2zm-10 10h2v2H6zm10 10h2v2h-2zm2-4h2v2h-2z" fill="currentColor" />
                                        </svg>
                                    </Link>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Review Modal */}
            {reviewModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative border border-gray-100 dark:border-slate-800">
                        <button
                            onClick={() => setReviewModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                        >
                            ✕
                        </button>

                        {reviewSuccess ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-4">🎉</div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Teşekkürler!</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Değerlendirmeniz başarıyla kaydedildi.</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-4">Deneyiminizi Puanlayın</h3>

                                <div className="flex gap-2 justify-center mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            className={`text-3xl transition-transform hover:scale-110 ${rating >= star ? 'text-orange-400' : 'text-gray-200 dark:text-slate-700'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Tur hakkında düşünceleriniz..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-[#008cb3] resize-none h-24 mb-4"
                                ></textarea>

                                <button
                                    onClick={submitReview}
                                    disabled={isSubmittingReview}
                                    className="w-full bg-[#008cb3] hover:bg-[#007a9b] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
                                >
                                    {isSubmittingReview ? 'Gönderiliyor...' : 'Gönder'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </main>
        )}
        </>
    );
}
