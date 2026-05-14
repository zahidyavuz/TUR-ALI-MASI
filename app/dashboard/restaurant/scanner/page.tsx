'use client';

import { useState } from 'react';

export default function RestaurantScannerPage() {
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'already_used' | 'invalid'>('idle');
  const [ticketData, setTicketData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Test için okutulacak biletin ID'si (Normalde kameradan gelir)
  const [mockTicketId, setMockTicketId] = useState('TKT-VALID');

  // Simüle edilmiş kamera tarama işlemi ve API'ye İstek
  const handleStartScan = () => {
    setScanStatus('scanning');
    
    // 1.5 saniye tarama efekti bekle
    setTimeout(async () => {
      try {
        const res = await fetch('/api/tickets/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId: mockTicketId })
        });
        
        const data = await res.json();

        if (res.ok && data.valid) {
          // Durum 1: Geçerli ve Onaylandı
          setTicketData({
            customer: data.ticket.customer,
            pax: data.ticket.pax,
            menu: data.ticket.menu,
            message: data.message
          });
          setScanStatus('success');
        } else {
          // Hata Durumları
          if (data.reason === 'already_used') {
            // Durum 2: Zaten Kullanılmış
            setErrorMessage(data.message);
            setScanStatus('already_used');
          } else {
            // Durum 3: Geçersiz, Sahte veya Başka Güne Ait
            setErrorMessage(data.message);
            setScanStatus('invalid');
          }
        }
      } catch (error) {
        setErrorMessage('Sunucuya bağlanılamadı');
        setScanStatus('invalid');
      }
    }, 1500);
  };

  const resetScanner = () => {
    setScanStatus('idle');
    setTicketData(null);
    setErrorMessage('');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 max-w-md mx-auto min-h-[80vh] flex flex-col justify-center">
      
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Hızlı QR Tarama (Security)</h1>
        <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm">
          Müşterinin biletini kameranıza okutun. Sistem anında doğrulayacaktır.
        </p>
      </div>

      {/* Test Senaryoları (Kamera olmadığı için manual seçim) */}
      {scanStatus === 'idle' && (
        <div className="mb-6 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Simülasyon Senaryosu Seçin:</p>
          <select 
            value={mockTicketId} 
            onChange={(e) => setMockTicketId(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#8B1A2B]"
          >
            <option value="TKT-VALID">✅ Geçerli ve Temiz Bilet (Durum 1)</option>
            <option value="TKT-USED">⚠️ Zaten Okutulmuş Bilet (Durum 2)</option>
            <option value="TKT-FUTURE">❌ Yanlış Tarihli Bilet (Durum 3)</option>
            <option value="TKT-FAKE">❌ Sahte / Tanımsız Bilet (Durum 3)</option>
          </select>
        </div>
      )}

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
              className="bg-[#8B1A2B] hover:bg-[#7a1625] text-white font-black px-8 py-4 rounded-2xl w-full transition-transform active:scale-95 uppercase tracking-widest shadow-lg shadow-[#8B1A2B]/30"
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
            <div className="relative z-10 w-64 h-64 border-4 border-dashed border-[#8B1A2B] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(139,26,43,0.3)]">
              {/* Yukarıdan Aşağı Kayan Lazer */}
              <div className="w-full h-1 bg-[#8B1A2B] shadow-[0_0_15px_rgba(139,26,43,1)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
            </div>
            <p className="relative z-10 text-white font-bold mt-6 tracking-widest uppercase animate-pulse">
              Sunucudan Doğrulanıyor...
            </p>
          </>
        )}


        {/* Durum 1: Başarılı Bilet */}
        {scanStatus === 'success' && ticketData && (
          <div className="absolute inset-0 bg-green-500 flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-900/20">
              <span className="text-5xl text-green-500">✅</span>
            </div>
            <h2 className="text-3xl font-black text-white text-center mb-2 tracking-tight">ONAYLANDI</h2>
            
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 w-full mt-4 text-left border border-white/30">
              <p className="text-white/80 text-[10px] uppercase font-black tracking-widest mb-1">Müşteri</p>
              <p className="text-white font-bold text-xl mb-3">{ticketData.customer} (👥 {ticketData.pax} Kişi)</p>
              
              <p className="text-white/80 text-[10px] uppercase font-black tracking-widest mb-1">Ödenen Menü</p>
              <p className="text-white font-bold text-lg">{ticketData.menu}</p>
            </div>

            <p className="text-white/90 text-xs font-bold mt-6 uppercase tracking-widest bg-green-600 px-4 py-2 rounded-lg border border-green-400">
              Sistem: Bilet 'Kullanıldı' Olarak İşlendi.
            </p>

            <button 
              onClick={resetScanner}
              className="mt-8 bg-white text-green-600 font-black px-6 py-4 rounded-xl w-full shadow-xl hover:scale-105 active:scale-95 transition-transform uppercase tracking-widest"
            >
              Yeni Bilet Okut
            </button>
          </div>
        )}

        {/* Durum 2: Zaten Kullanılmış (Fraud Protection) */}
        {scanStatus === 'already_used' && (
          <div className="absolute inset-0 bg-red-600 flex flex-col items-center justify-center p-8 animate-in shake duration-300">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-900/20">
              <span className="text-5xl">⚠️</span>
            </div>
            <h2 className="text-3xl font-black text-white text-center mb-2 tracking-tight">ÇİFT OKUTMA!</h2>
            
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 w-full mt-4 text-center border border-black/30">
              <p className="text-white font-bold text-lg leading-snug">{errorMessage}</p>
              <p className="text-red-200 text-xs mt-3 font-medium">Bu işlem şüpheli işlem olarak kaydedildi.</p>
            </div>

            <button 
              onClick={resetScanner}
              className="mt-8 bg-white text-red-600 font-black px-6 py-4 rounded-xl w-full shadow-xl hover:scale-105 active:scale-95 transition-transform uppercase tracking-widest"
            >
              Kapat ve Yeniden Okut
            </button>
          </div>
        )}

        {/* Durum 3: Geçersiz veya Yanlış Tarih */}
        {scanStatus === 'invalid' && (
          <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-6 border-4 border-slate-600">
              <span className="text-5xl">❌</span>
            </div>
            <h2 className="text-2xl font-black text-white text-center mb-2 tracking-tight">GEÇERSİZ BİLET</h2>
            
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 w-full mt-4 text-center border border-slate-600">
              <p className="text-slate-300 font-bold text-base leading-snug">{errorMessage}</p>
            </div>

            <button 
              onClick={resetScanner}
              className="mt-8 bg-red-500 text-white font-black px-6 py-4 rounded-xl w-full shadow-xl hover:bg-red-400 active:scale-95 transition-all uppercase tracking-widest"
            >
              Taramaya Geri Dön
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
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>

    </div>
  );
}
