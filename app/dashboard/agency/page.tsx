'use client';

export default function AgencyOverviewPage() {
  const recentBookings = [
    { id: 1, title: 'Kapadokya ATV Turu', guests: '2 Kişi', time: 'Az önce', isNew: true },
    { id: 2, title: 'Göreme Balon Uçuşu (VIP)', guests: '4 Kişi', time: '15 dk önce', isNew: true },
    { id: 3, title: 'Kapadokya Kırmızı Tur', guests: '1 Kişi', time: '1 saat önce', isNew: false },
    { id: 4, title: 'Türk Gecesi Etkinliği', guests: '6 Kişi', time: '2 saat önce', isNew: false },
    { id: 5, title: 'Kapadokya Yeşil Tur', guests: '2 Kişi', time: '3 saat önce', isNew: false },
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-24 font-sans">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">İstatistik Merkezi</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Satış performansı, finansal veriler ve operasyonel özet.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            PDF İndir
          </button>
          <button className="px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded-md shadow-sm hover:bg-slate-800 transition-colors">
            Tarih Filtresi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Sol Sütun: Metrikler ve Grafikler */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* 4 Ana Metrik Kartı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bu Ayki Toplam Ciro</h3>
                <span className="text-slate-400">₺</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">425.000 ₺</span>
              </div>
              <div className="mt-2 text-[11px] font-medium text-green-600 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                Geçen aya göre %18 artış
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Müşteri Memnuniyet Oranı</h3>
                <span className="text-slate-400">★</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">%98.5</span>
              </div>
              <div className="mt-2 text-[11px] font-medium text-slate-500">
                1,204 değerlendirme baz alındı
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aktif Tur Sayısı</h3>
                <span className="text-slate-400">🗺️</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">14</span>
                <span className="text-sm text-slate-400 mb-0.5">/ 18</span>
              </div>
              <div className="mt-2 text-[11px] font-medium text-slate-500">
                4 tur pasif durumda
              </div>
            </div>

            <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-5 shadow-sm border border-slate-800 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2 relative z-10">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Bekleyen Hakediş</h3>
                <span className="text-slate-500">💳</span>
              </div>
              <div className="flex items-end gap-2 relative z-10">
                <span className="text-2xl font-bold text-white tracking-tight">84.500 ₺</span>
              </div>
              <button className="mt-3 w-full text-[11px] font-medium bg-white text-slate-900 py-1.5 rounded-md shadow-sm hover:bg-slate-100 transition-colors relative z-10">
                Ödeme İste
              </button>
            </div>
          </div>

          {/* Satış Grafiği (Placeholder) */}
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 h-64 flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-3 opacity-20">📊</div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Aylık Satış Performansı</h3>
            <p className="text-xs text-slate-500 max-w-sm">Gelir grafiği ve karşılaştırmalı analizler için veri bekleniyor.</p>
          </div>
        </div>

        {/* Sağ Sütun: Canlı Akış (Live Feed) */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[500px] xl:h-auto">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Son İşlemler</h2>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Canlı Aktarım</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {recentBookings.map((booking) => (
              <div 
                key={booking.id} 
                className={`relative p-3 rounded-md border transition-all ${
                  booking.isNew 
                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' 
                    : 'bg-transparent border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {booking.isNew && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">{booking.title}</h4>
                    </div>
                    <p className="text-xs font-medium text-slate-500">{booking.guests}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{booking.time}</span>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors">
            Tüm Kayıtları Dışa Aktar (CSV)
          </button>
        </div>

      </div>
    </div>
  );
}
