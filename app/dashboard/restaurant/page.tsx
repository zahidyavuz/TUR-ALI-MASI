'use client';

import { useState } from 'react';

export default function RestaurantOverviewPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'seated' | 'completed'>('upcoming');

  const reservations = [
    {
      id: 'RES-001',
      time: '19:00',
      name: 'Melih Can',
      pax: 2,
      menu: 'Şefin Özel Testi Kebabı Menüsü',
      note: 'Cam Kenarı + Evlilik Yıldönümü',
      status: 'upcoming'
    },
    {
      id: 'RES-002',
      time: '19:30',
      name: 'Ayşe Yılmaz Grubu',
      pax: 6,
      menu: 'Geleneksel Türk Gecesi Fix Menü',
      note: 'Vejetaryen 1 kişi var',
      status: 'upcoming'
    },
    {
      id: 'RES-003',
      time: '20:00',
      name: 'John Doe',
      pax: 4,
      menu: 'Boğaz Levrek + Meze Tadım Paketi',
      note: 'Balkon',
      status: 'upcoming'
    },
    {
      id: 'RES-004',
      time: '18:30',
      name: 'Elena Rossi',
      pax: 2,
      menu: 'Anadolu Ateşi VIP Akşam Yemeği',
      note: '',
      status: 'seated'
    }
  ];

  const filteredReservations = reservations.filter(res => res.status === activeTab);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 max-w-5xl mx-auto">
      
      {/* Üst Kısım: Hostes Başlığı ve Saat */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 bg-slate-900 rounded-[2rem] p-8 shadow-xl relative overflow-hidden">
        {/* Dekoratif Arka Plan */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-500 opacity-10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
            </span>
            <span className="text-red-400 font-bold tracking-widest uppercase text-sm">Canlı Karşılama Ekranı</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Hostes Kokpiti</h1>
          <p className="text-slate-400 font-medium mt-2 text-sm md:text-base">
            Misafirleri geldikleri an tanıyın ve masalarına yönlendirin.
          </p>
        </div>
        
        <div className="mt-6 md:mt-0 text-right relative z-10">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Şu Anki Saat</p>
          <p className="text-4xl font-black text-white tracking-tight">
            {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Durum Sekmeleri */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-slate-800/50 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'upcoming' ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-500 shadow-sm' : 'text-gray-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Beklenenler
        </button>
        <button 
          onClick={() => setActiveTab('seated')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'seated' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-500 shadow-sm' : 'text-gray-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Masaya Alınanlar
        </button>
      </div>

      {/* Rezervasyon Kartları (Devasa) */}
      <div className="space-y-6">
        {filteredReservations.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-slate-800">
            <span className="text-6xl mb-4 block opacity-50">🍽️</span>
            <p className="text-gray-500 dark:text-slate-400 font-bold text-lg">Bu listede şu an misafir bulunmuyor.</p>
          </div>
        ) : (
          filteredReservations.map((res) => (
            <div key={res.id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row relative">
              
              {/* Sol Zaman Çubuğu */}
              <div className="bg-slate-50 dark:bg-slate-950 p-6 md:w-48 flex md:flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-800 shrink-0 gap-4 md:gap-0">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Rez. Saati</span>
                <span className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white mt-1 tracking-tighter">{res.time}</span>
              </div>

              {/* Orta İçerik (Müşteri & Sipariş) */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white leading-tight">{res.name}</h2>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                    👥 {res.pax} Kişi
                  </span>
                  {res.note && (
                    <span className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 font-bold px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                      ⭐ Not: {res.note}
                    </span>
                  )}
                </div>

                <div className="mt-2 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Önceden Satın Alınan Menü</p>
                  <p className="text-lg md:text-xl font-bold text-red-700 dark:text-red-400">{res.menu}</p>
                </div>
              </div>

              {/* Sağ Aksiyon Butonu */}
              <div className="p-6 md:p-8 flex items-center justify-center border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
                {activeTab === 'upcoming' ? (
                  <button className="w-full md:w-32 h-16 md:h-full bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-red-500/30 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🛎️</span>
                    Geldi
                  </button>
                ) : (
                  <button className="w-full md:w-32 h-16 md:h-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-green-500 hover:text-white flex flex-col items-center justify-center gap-1 group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">✅</span>
                    Ayrıldı
                  </button>
                )}
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
