'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function AgencyToursPage() {
  const [tours, setTours] = useState([
    {
      id: 1,
      title: 'Kapadokya VIP Balon Uçuşu',
      price: '₺3.500',
      capacity: 16,
      sold: 16,
      status: 'sold_out',
      image: 'https://images.unsplash.com/photo-1600298882283-40b4dcb8b211?q=80&w=2070&auto=format&fit=crop'
    },
    {
      id: 2,
      title: 'Göreme Açık Hava Müzesi ve Peri Bacaları',
      price: '₺850',
      capacity: 45,
      sold: 12,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1570939274717-7eda259b5088?q=80&w=2070&auto=format&fit=crop'
    }
  ]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Turlarım (Kontenjan Yönetimi)</h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base">
            Aktif turlarınızı yönetin ve Overbooking (fazla satış) korumalı kapasiteleri belirleyin.
          </p>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl text-sm transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2">
          <span>+</span> Yeni Tur Oluştur
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Tur Ekleme / Düzenleme Formu */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800 h-fit">
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">Tur Detayları</h2>
          
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Görsel Yükleme */}
            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Tur Görseli</label>
              <div className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/50 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform text-orange-400">📸</span>
                <span className="text-xs font-bold text-gray-500">Fotoğraf Yükle veya Sürükle</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Tur Başlığı</label>
              <input type="text" placeholder="Örn: Pamukkale Günübirlik Tur" className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-medium text-slate-800 dark:text-white"/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Birim Fiyat (₺)</label>
                <input type="number" placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-800 dark:text-white"/>
              </div>
              
              {/* Kritik Alan: Dinamik Kapasite */}
              <div className="relative">
                <label className="block text-sm font-black text-orange-600 dark:text-orange-500 mb-2">Maksimum Kapasite</label>
                <input type="number" placeholder="Örn: 15" className="w-full bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/40 font-black text-orange-700 dark:text-orange-400"/>
                <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce">
                  KRİTİK
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 mb-2">Açıklama</label>
              <textarea rows={3} placeholder="Tur detaylarını ve programa dahil olan hizmetleri yazın..." className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-medium text-slate-800 dark:text-white resize-none"></textarea>
            </div>

            <button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-xl transition-all shadow-md active:scale-95">
              Turu Yayına Al
            </button>
          </form>
        </div>

        {/* Aktif Turlar ve Overbooking Koruması */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">Envanter (Canlı)</h2>
          
          {tours.map(tour => {
            const isSoldOut = tour.sold >= tour.capacity;
            const progress = (tour.sold / tour.capacity) * 100;

            return (
              <div key={tour.id} className={`p-4 rounded-[2rem] border ${isSoldOut ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 opacity-80' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'} shadow-sm flex flex-col sm:flex-row gap-4`}>
                <div className="w-full sm:w-32 h-24 relative rounded-2xl overflow-hidden shrink-0">
                  <Image src={tour.image} alt={tour.title} fill className={`object-cover ${isSoldOut ? 'grayscale' : ''}`} unoptimized />
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-white font-black text-xs uppercase tracking-widest border-2 border-white px-2 py-1 rounded rotate-[-15deg]">Tükendi</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-800 dark:text-white line-clamp-1">{tour.title}</h3>
                      <span className="font-black text-slate-800 dark:text-white">{tour.price}</span>
                    </div>
                    
                    {/* Kapasite Barı */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-gray-500">Satılan: <span className={isSoldOut ? 'text-red-500 font-black' : 'text-slate-800 dark:text-white'}>{tour.sold}</span></span>
                        <span className="font-bold text-gray-500">Kapasite: <span className="text-slate-800 dark:text-white">{tour.capacity}</span></span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${isSoldOut ? 'bg-red-500' : progress > 80 ? 'bg-orange-500' : 'bg-green-500'}`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    {isSoldOut ? (
                      <span className="text-xs font-black text-red-500 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-lg flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Satışa Kapatıldı
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-lg">
                        Satışta
                      </span>
                    )}
                    <button className="text-sm font-bold text-blue-500 hover:text-blue-700 transition-colors">Düzenle</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
