'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { auth as authHelper } from '../../lib/auth';
import FavoriteButton from '../../components/FavoriteButton';

export default function WishlistPage() {
    const { user } = useAuth();
    const [wishlist, setWishlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Simple client-side auth check
        const token = authHelper.getAccessToken();
        if (!token) {
            window.location.href = '/login';
        } else {
            fetchWishlist();
        }
    }, [user]);

    const fetchWishlist = async () => {
        try {
            const token = authHelper.getAccessToken();
            if (!token) throw new Error('Oturum süresi doldu.');

            const res = await fetch('http://localhost:8000/api/v1/users/wishlist/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Favoriler yüklenirken bir hata oluştu.');
            const data = await res.json();
            setWishlist(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Yükleniyor...</div>;

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">Favorilerim</h1>
                    <p className="text-gray-500 font-medium mt-1">Gelecek maceralarınız için sakladığınız turlar.</p>
                </div>
                <Link href="/" className="text-sm font-bold text-[#008cb3] hover:underline">
                    Yeni Tur Ara &rarr;
                </Link>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl font-bold mb-6">
                    🚨 {error}
                </div>
            )}

            {!error && wishlist.length === 0 && (
                <div className="bg-slate-50 border border-gray-100 rounded-3xl p-12 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-4">💔</div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Henüz favori turunuz yok</h2>
                    <p className="text-gray-500 font-medium mb-6">Kapadokya'nın veya dünyanın başka bir köşesindeki eşsiz turları kalp ikonuna tıklayarak listenize ekleyebilirsiniz.</p>
                    <Link href="/" className="bg-[#008cb3] text-white px-6 py-3 rounded-full font-bold hover:bg-[#005e85] transition-colors shadow-lg active:scale-95">
                        Turları Keşfet
                    </Link>
                </div>
            )}

            {!error && wishlist.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {wishlist.map((item: any) => {
                        const tourInfo = item.tour_details || item.tour; // Assuming the serializer returns nested tour data. If not, this might need an extra fetch per tour, or backend update to return nested tour.
                        // Let's assume django backend serializer returns nested tour
                        // We will fallback to safe fields if it's just an ID
                        const isNested = typeof tourInfo === 'object';
                        
                        return (
                            <div key={item.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 group flex flex-col">
                                <Link href={`/tour/${isNested ? tourInfo.id : tourInfo}`} className="relative h-48 block">
                                    {isNested && (tourInfo.image_main || tourInfo.imageMain) ? (
                                        <Image src={tourInfo.image_main || tourInfo.imageMain} alt="Tur" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200 animate-pulse"></div>
                                    )}
                                    <div className="absolute top-4 right-4 z-40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                        <FavoriteButton tourId={isNested ? tourInfo.id : tourInfo} className="p-2 rounded-full !bg-white/90 hover:!bg-red-50 hover:!text-red-500 shadow-sm" />
                                    </div>
                                </Link>
                                <div className="p-5 flex-1 flex flex-col">
                                    <Link href={`/tour/${isNested ? tourInfo.id : tourInfo}`} className="hover:text-[#008cb3] transition-colors">
                                        <h3 className="font-bold text-lg text-slate-800 leading-tight mb-2">
                                            {isNested ? (tourInfo.title || 'Tur') : `Tur #${tourInfo}`}
                                        </h3>
                                    </Link>
                                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <span className="text-gray-400 text-xs font-bold uppercase">
                                            {isNested && tourInfo.location ? tourInfo.location : 'Konum Hazırlanıyor'}
                                        </span>
                                        {isNested && tourInfo.price && (
                                            <span className="font-black text-slate-800 text-lg">₺{tourInfo.price}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
