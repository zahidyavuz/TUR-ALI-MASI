'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface ReviewPhoto {
    id: string;
    url: string;
}

interface Review {
    id: string;
    tourId: string;
    tourName: string;
    date: string;
    rating: number;
    text: string;
    status: 'published' | 'pending';
    photos: ReviewPhoto[];
}

interface TourToReview {
    id: string;
    name: string;
    date: string;
    image: string;
}

export default function ReviewsPage() {
    const [isClient, setIsClient] = useState(false);

    // Yorumlanmayı bekleyen turlar (Demo Verisi)
    const [toursToReview, setToursToReview] = useState<TourToReview[]>([
        { id: 't1', name: 'Kapadokya Balon Turu', date: '12 Ekim 2025', image: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?auto=format&fit=crop&q=80&w=200' },
        { id: 't2', name: 'Büyük İtalya Rotası', date: '3 Ağustos 2025', image: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&q=80&w=200' }
    ]);

    // Kullanıcının yaptığı yorumlar
    const [reviews, setReviews] = useState<Review[]>([]);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [currentTourTitle, setCurrentTourTitle] = useState('');
    const [currentTourId, setCurrentTourId] = useState('');

    // Form States
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [photos, setPhotos] = useState<ReviewPhoto[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsClient(true);
        const savedReviews = localStorage.getItem('tourkia_reviews');
        if (savedReviews) {
            setReviews(JSON.parse(savedReviews));
        }

        // Remove tours that have been reviewed from the 'to-review' list based on saved reviews
        if (savedReviews) {
            const parsedReviews: Review[] = JSON.parse(savedReviews);
            const reviewedTourIds = parsedReviews.map(r => r.tourId);
            setToursToReview(prev => prev.filter(t => !reviewedTourIds.includes(t.id)));
        }
    }, []);

    const saveReviews = (newReviews: Review[]) => {
        setReviews(newReviews);
        localStorage.setItem('tourkia_reviews', JSON.stringify(newReviews));
    };

    const openReviewModal = (tourId: string, tourName: string) => {
        setEditingReviewId(null);
        setCurrentTourId(tourId);
        setCurrentTourTitle(tourName);
        setRating(5);
        setReviewText('');
        setPhotos([]);
        setShowModal(true);
    };

    const openEditModal = (review: Review) => {
        setEditingReviewId(review.id);
        setCurrentTourId(review.tourId);
        setCurrentTourTitle(review.tourName);
        setRating(review.rating);
        setReviewText(review.text);
        setPhotos(review.photos);
        setShowModal(true);
    };

    const handleDelete = (id: string, tourId: string) => {
        if (confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
            const updated = reviews.filter(r => r.id !== id);
            saveReviews(updated);

            // Re-add to tours to review (Find from a database ideally, mocking here by recreating)
            if (tourId === 't1') {
                setToursToReview(prev => [{ id: 't1', name: 'Kapadokya Balon Turu', date: '12 Ekim 2025', image: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?auto=format&fit=crop&q=80&w=200' }, ...prev]);
            } else if (tourId === 't2') {
                setToursToReview(prev => [{ id: 't2', name: 'Büyük İtalya Rotası', date: '3 Ağustos 2025', image: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&q=80&w=200' }, ...prev]);
            }
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            // Sadece Demo: İlk dosyayı al Base64 yap
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotos(prev => [...prev, { id: Date.now().toString(), url: reader.result as string }]);
            };
            reader.readAsDataURL(files[0]);
        }
    };

    const removePhoto = (id: string) => {
        setPhotos(prev => prev.filter(p => p.id !== id));
    };

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();

        if (reviewText.length < 10) {
            alert('Lütfen deneyimini detaylı paylaş (en az 10 karakter).');
            return;
        }

        if (editingReviewId) {
            // Güncelleme
            const updated = reviews.map(r => r.id === editingReviewId ? {
                ...r,
                rating,
                text: reviewText,
                photos,
                status: 'pending' as const // Edit sonrası onaya düşer
            } : r);
            saveReviews(updated);
        } else {
            // Yeni Yorum
            const newReview: Review = {
                id: Date.now().toString(),
                tourId: currentTourId,
                tourName: currentTourTitle,
                date: new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
                rating,
                text: reviewText,
                status: 'pending',
                photos
            };
            saveReviews([newReview, ...reviews]);
            setToursToReview(prev => prev.filter(t => t.id !== currentTourId));
        }

        setShowModal(false);
    };

    if (!isClient) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-12 font-sans overflow-x-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                {/* Üst Kısım: Başlık & Navigasyon */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#005e85] tracking-tight">Değerlendirmelerim</h1>
                        <p className="text-gray-500 font-medium text-sm mt-1 flex items-center gap-2">
                            <Link href="/profile" className="hover:text-[#008cb3] transition-colors flex items-center gap-1">
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Profilime Dön
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Henüz Yorumlanmamış Turlar */}
                {toursToReview.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-[20px] p-5 mb-8 shadow-sm">
                        <h3 className="text-yellow-800 font-bold mb-4 flex items-center gap-2">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                            Henüz yorumlamadığın turların var!
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {toursToReview.map(tour => (
                                <div key={tour.id} className="bg-white rounded-xl p-3 flex items-center gap-4 shadow-sm border border-yellow-100/50">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                                        <Image src={tour.image} alt={tour.name} fill className="object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-slate-800 truncate">{tour.name}</h4>
                                        <p className="text-xs text-gray-500">{tour.date}</p>
                                    </div>
                                    <button onClick={() => openReviewModal(tour.id, tour.name)} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                                        Yorum Yap
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Yorumlar Listesi veya Boş Durum */}
                <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">
                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg></div>
                        Yayındaki Yorumların ({reviews.length})
                    </h3>

                    {reviews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="relative w-48 h-48 mb-6 opacity-80">
                                <Image src="https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?auto=format&fit=crop&q=80&w=400" alt="Kapadokya İllüstrasyonu" fill className="object-cover rounded-full" />
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent rounded-full flex items-end justify-center pb-4">
                                    <div className="bg-white p-2 rounded-full shadow-md text-yellow-500">
                                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                    </div>
                                </div>
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-2">Henüz bir tur deneyimi paylaşmadın kanka</h4>
                            <p className="text-gray-500 mb-6 max-w-sm">Hadi, katıldığın turların güzelliklerini ve ilk anılarını dünyayla paylaş! Yorumların diğer gezginlere ilham olacak.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {reviews.map(review => (
                                <div key={review.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow bg-slate-50/50">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-lg text-slate-800">{review.tourName}</h4>
                                            {/* Durum Etiketleri */}
                                            {review.status === 'published' ? (
                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1">
                                                    <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                    Yayında
                                                </span>
                                            ) : (
                                                <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1">
                                                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Onay Bekliyor
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-semibold text-gray-400">{review.date}</span>
                                    </div>

                                    {/* Yıldızlar */}
                                    <div className="flex gap-1 mb-3">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <svg key={star} width="16" height="16" fill={star <= review.rating ? "#FBBF24" : "#E5E7EB"} viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>

                                    <p className="text-gray-700 text-sm leading-relaxed mb-4">{review.text}</p>

                                    {/* Fotoğraf Galerisi */}
                                    {review.photos && review.photos.length > 0 && (
                                        <div className="flex gap-2 min-w-0 overflow-x-auto pb-2 mb-2">
                                            {review.photos.map(photo => (
                                                <div key={photo.id} className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                                    <Image src={photo.url} alt="Review Image" fill className="object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Aksiyonlar */}
                                    <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                                        <button onClick={() => openEditModal(review)} className="text-xs font-bold text-[#008cb3] hover:text-[#005e85] transition flex items-center gap-1">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            Düzenle
                                        </button>
                                        <button onClick={() => handleDelete(review.id, review.tourId)} className="text-xs font-bold text-red-500 hover:text-red-700 transition flex items-center gap-1">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Sil
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="h-10"></div>
            </div>

            {/* Değerlendirme Modalı */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-extrabold text-[#005e85] text-lg">{editingReviewId ? 'Yorumu Düzenle' : currentTourTitle}</h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 bg-white shadow-sm border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="reviewForm" onSubmit={handleSubmitReview} className="space-y-6">
                                {/* Puanlama */}
                                <div className="flex flex-col items-center">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Turu Puanla</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className={`transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
                                            >
                                                <svg width="36" height="36" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-xs font-semibold text-gray-400 mt-2">
                                        {rating === 5 ? 'Mükemmel' : rating === 4 ? 'Çok İyi' : rating === 3 ? 'İdare Eder' : rating === 2 ? 'Kötü' : 'Berbat'}
                                    </span>
                                </div>

                                {/* Yorum Metni */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Deneyimin nasıldı?</label>
                                    <textarea
                                        required
                                        value={reviewText}
                                        onChange={e => setReviewText(e.target.value)}
                                        placeholder="Tur rehberi çok iyiydi, otel beklediğimden güzeldi..."
                                        className="w-full bg-slate-50 border border-gray-200 text-slate-800 rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-1 focus:ring-[#008cb3] transition-all min-h-[120px] resize-y text-sm"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 flex justify-end">En az 10 karakter.</p>
                                </div>

                                {/* Fotoğraf Ekleme */}
                                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4">
                                    <label className="block text-xs font-bold text-gray-600 mb-3 flex items-center justify-between">
                                        <span>Tur Fotoğraflarını Paylaş</span>
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[#008cb3] flex items-center gap-1 shadow-sm hover:bg-blue-50">
                                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                            Fotoğraf Ekle
                                        </button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                    </label>

                                    {photos.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {photos.map(p => (
                                                <div key={p.id} className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 group">
                                                    <Image src={p.url} alt="Review" fill className="object-cover" />
                                                    <button type="button" onClick={() => removePhoto(p.id)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-gray-400 text-center py-2">Henüz fotoğraf yüklemediniz.</p>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white">
                            <button type="submit" form="reviewForm" className="w-full bg-[#008cb3] hover:bg-[#005e85] text-white text-[15px] font-extrabold py-3.5 rounded-xl transition-all shadow-md active:scale-95">
                                {editingReviewId ? 'Değişiklikleri Kaydet (Onaya Gönder)' : 'Yorumu Karşıya Yükle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
