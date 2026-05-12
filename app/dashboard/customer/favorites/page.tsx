'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function CustomerFavoritesPage() {
  const mockFavorites = [
    {
      id: 1,
      type: 'TOUR',
      title: 'Antalya Lüks Yat Turu & Dalış',
      location: 'Kaş, Antalya',
      price: '₺3.200',
      rating: '4.9',
      reviews: 128,
      imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2070&auto=format&fit=crop',
      actionText: 'Hemen Satın Al'
    },
    {
      id: 2,
      type: 'RESTAURANT',
      title: 'Boğazda Romantik Akşam Yemeği',
      location: 'Ortaköy, İstanbul',
      price: '₺4.500',
      rating: '4.8',
      reviews: 342,
      imageUrl: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070&auto=format&fit=crop',
      actionText: 'Rezervasyon Yap'
    },
    {
      id: 3,
      type: 'TOUR',
      title: 'Pamukkale Travertenleri & Salda Gölü',
      location: 'Denizli',
      price: '₺1.850',
      rating: '4.7',
      reviews: 89,
      imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=2071&auto=format&fit=crop',
      actionText: 'Hemen Satın Al'
    }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
          Favorilerim <span className="text-red-500 animate-pulse">❤️</span>
        </h1>
        <p className="text-gray-500 dark:text-slate-400 font-medium mt-2 text-sm md:text-base">
          Kalp bırakarak kaydettiğiniz hayalinizdeki turlar ve VIP lezzet durakları.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockFavorites.map((fav) => (
          <div key={fav.id} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-800 group hover:shadow-xl transition-all duration-300">
            {/* Image Container */}
            <div className="relative h-56 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10"></div>
              <Image 
                src={fav.imageUrl} 
                alt={fav.title} 
                fill 
                className="object-cover group-hover:scale-110 transition-transform duration-700" 
                unoptimized
              />
              
              {/* Like Button Active */}
              <button className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-red-500 transition-colors group/heart shadow-sm">
                <span className="text-red-500 group-hover/heart:text-white group-hover/heart:scale-110 transition-all drop-shadow-md">❤️</span>
              </button>

              {/* Type Badge & Location */}
              <div className="absolute bottom-4 left-4 z-20 w-full pr-8">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg mb-2 inline-block shadow-lg ${fav.type === 'TOUR' ? 'bg-[#008cb3] text-white' : 'bg-orange-500 text-white'}`}>
                  {fav.type === 'TOUR' ? 'TUR' : 'RESTORAN'}
                </span>
                <div className="flex items-center gap-1 text-white/90 text-xs font-medium">
                  <span>📍</span> {fav.location}
                </div>
              </div>
            </div>

            {/* Content Container */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight line-clamp-2 pr-4">{fav.title}</h3>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-yellow-500 text-sm font-bold bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-lg">
                    ⭐ {fav.rating}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">({fav.reviews} Yorum)</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Kişi Başı</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{fav.price}</p>
                </div>
                
                {/* CTA Button */}
                <Link href={`/checkout?id=${fav.id}`}>
                  <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-[#008cb3] dark:hover:bg-[#008cb3] dark:hover:text-white font-bold py-3 px-5 rounded-2xl text-sm transition-all shadow-md active:scale-95 flex items-center gap-2">
                    {fav.actionText} 
                    <span className="text-lg">⚡</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
