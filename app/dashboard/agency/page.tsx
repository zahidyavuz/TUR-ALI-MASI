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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Ajans Kokpiti</h1>
        <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base">
          Gerçek zamanlı satış verileriniz ve tur operasyon merkeziniz.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Sol Sütun: Metrikler ve Grafikler */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* 4 Ana Metrik Kartı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">👥</div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bugünkü Yolcu Sayısı</h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-slate-800 dark:text-white">128</span>
                <span className="text-sm font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-lg mb-1">+12%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🚩</div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Aktif Tur Sayısı</h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-slate-800 dark:text-white">14</span>
                <span className="text-sm font-bold text-slate-400 mb-1">/ 18</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💰</div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bu Ayki Toplam Satış</h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-slate-800 dark:text-white">₺425K</span>
                <span className="text-sm font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-lg mb-1">↑ Yükselişte</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 shadow-lg shadow-orange-500/30 relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl">💳</div>
              <h3 className="text-xs font-bold text-white/80 uppercase tracking-widest mb-2">Bekleyen Hakediş (Bakiye)</h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black drop-shadow-md">₺84.500</span>
              </div>
              <button className="mt-4 text-xs font-bold bg-white text-orange-600 px-4 py-2 rounded-xl shadow-sm hover:scale-105 transition-transform">
                Ödeme İste
              </button>
            </div>
          </div>

          {/* Harita veya Satış Grafiği (Placeholder) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-slate-800 h-64 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4 opacity-30">📈</div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Haftalık Rezervasyon Yoğunluğu</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md">API entegrasyonu tamamlandığında burada gelişmiş bir interaktif grafik yer alacaktır.</p>
          </div>
        </div>

        {/* Sağ Sütun: Canlı Akış (Live Feed) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-slate-800 flex flex-col h-[500px] xl:h-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">Son Gelen Rezervasyonlar</h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-xs font-bold text-green-500 tracking-wider">CANLI</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {recentBookings.map((booking) => (
              <div 
                key={booking.id} 
                className={`relative p-4 rounded-2xl border transition-all ${
                  booking.isNew 
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' 
                    : 'bg-slate-50 dark:bg-slate-950 border-gray-100 dark:border-slate-800'
                }`}
              >
                {booking.isNew && (
                  <span className="absolute -top-2.5 -right-2 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-md animate-bounce">
                    YENİ!
                  </span>
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{booking.title}</h4>
                    <p className="text-xs font-bold text-orange-500 mt-1">{booking.guests}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">{booking.time}</span>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 py-3 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-500 dark:text-slate-400 hover:border-orange-500 hover:text-orange-500 transition-colors">
            Tüm Geçmişi Gör
          </button>
        </div>

      </div>
    </div>
  );
}
