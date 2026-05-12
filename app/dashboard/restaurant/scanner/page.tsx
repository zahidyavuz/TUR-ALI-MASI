'use client';

import { useState, useEffect } from 'react';

export default function RestaurantScannerPage() {
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [ticketData, setTicketData] = useState<any>(null);

  // Simüle edilmiş kamera tarama işlemi
  const handleStartScan = () => {
    setScanStatus('scanning');
    
    // 2 saniye tarama efekti bekle
    setTimeout(() => {
      // Başarılı tarama senaryosu (Mock API dönüşü)
      setTicketData({
        id: 'TKT-9011',
        customer: 'John Doe',
        pax: 4,
        menu: 'Şefin Özel Testi Kebabı + Cam Kenarı',
        tableSuggestion: 'Masa 4',
        message: 'Geçerli Bilet - Masa 4\'e Yönlendirin'
      });
      setScanStatus('success');
    }, 2000);
  };

  const resetScanner = () => {
    setScanStatus('idle');
    setTicketData(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 max-w-md mx-auto h-[80vh] flex flex-col justify-center">
      
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Hızlı QR Tarama</h1>
        <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm">
          Müşterinin telefonundaki çevrimdışı bileti kameranıza okutun.
        </p>
      </div>

      {/* Kamera Arayüzü (Mocked Frame) */}
      <div className="relative w-full aspect-[4/5] bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border-8 border-slate-800 flex flex-col items-center justify-center">
        
        {scanStatus === 'idle' && (
          <div className="text-center px-6">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
              <span className="text-3xl">📷</span>
            </div>
            <p className="text-slate-400 font-bold mb-6">Kamera izni gerekiyor ve taramaya hazır.</p>
            <button 
              onClick={handleStartScan}
              className="bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 rounded-2xl w-full transition-transform active:scale-95 uppercase tracking-widest shadow-lg shadow-red-500/30"
            >
              Taramayı Başlat
            </button>
          </div>
        )}

        {scanStatus === 'scanning' && (
          <>
            {/* Sahte Kamera Görüntüsü - Blur Arka Plan */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-30 grayscale blur-sm"></div>
            
            {/* Tarayıcı Kılavuz Çizgileri */}
            <div className="relative z-10 w-64 h-64 border-4 border-dashed border-red-500 rounded-3xl overflow-hidden">
              {/* Yukarıdan Aşağı Kayan Lazer */}
              <div className="w-full h-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
            <p className="relative z-10 text-white font-bold mt-6 tracking-widest uppercase animate-pulse">
              Okunuyor...
            </p>
          </>
        )}

        {scanStatus === 'success' && ticketData && (
          <div className="absolute inset-0 bg-green-500 flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-900/20">
              <span className="text-5xl text-green-500">✅</span>
            </div>
            <h2 className="text-2xl font-black text-white text-center mb-2">{ticketData.message}</h2>
            
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 w-full mt-4 text-left border border-white/30">
              <p className="text-white/80 text-[10px] uppercase font-black tracking-widest mb-1">Müşteri</p>
              <p className="text-white font-bold text-lg mb-3">{ticketData.customer} (👥 {ticketData.pax} Kişi)</p>
              
              <p className="text-white/80 text-[10px] uppercase font-black tracking-widest mb-1">Ödenen Menü</p>
              <p className="text-white font-bold text-lg">{ticketData.menu}</p>
            </div>

            <p className="text-white/90 text-xs font-bold mt-6 uppercase tracking-widest bg-green-600 px-4 py-2 rounded-lg">
              Durum: Kullanıldı (Redeemed)
            </p>

            <button 
              onClick={resetScanner}
              className="mt-8 bg-white text-green-600 font-black px-6 py-3 rounded-xl w-full shadow-lg hover:scale-105 transition-transform"
            >
              Yeni Bilet Okut
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(16rem); }
          100% { transform: translateY(-100%); }
        }
      `}</style>
    </div>
  );
}
