'use client';

import { useState } from 'react';

export default function RestaurantAvailabilityPage() {
  const [selectedDate, setSelectedDate] = useState('2026-05-12');
  
  const [timeSlots, setTimeSlots] = useState([
    { id: 1, time: '18:00', maxTables: 4, maxPax: 16, currentBookedPax: 8, isActive: true },
    { id: 2, time: '19:00', maxTables: 3, maxPax: 12, currentBookedPax: 12, isActive: true }, // Tükendi
    { id: 3, time: '20:00', maxTables: 5, maxPax: 20, currentBookedPax: 6, isActive: true },
    { id: 4, time: '21:30', maxTables: 2, maxPax: 8, currentBookedPax: 0, isActive: true }
  ]);

  const toggleSlotStatus = (id: number) => {
    setTimeSlots(timeSlots.map(slot => slot.id === id ? { ...slot, isActive: !slot.isActive } : slot));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Saatlik Kota ve Masa Yönetimi</h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base">
            Platforma ayıracağınız masaları saat dilimlerine göre kısıtlayın, çakışmaları (Overbooking) önleyin.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm flex items-center gap-2 w-full md:w-auto">
          <span className="text-gray-400">📅</span>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent outline-none font-bold text-slate-800 dark:text-white cursor-pointer w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sol Sütun: Yeni Slot Ekleme */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-800 sticky top-24">
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">Yeni Seans Ekle</h2>
            
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Seans Saati</label>
                <input type="time" defaultValue="19:00" className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-[#8B1A2B] font-black text-slate-800 dark:text-white"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Masa Kotası</label>
                  <input type="number" placeholder="Örn: 3" className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-[#8B1A2B] font-bold text-slate-800 dark:text-white"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Max. Kişi</label>
                  <input type="number" placeholder="Örn: 12" className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-[#8B1A2B] font-bold text-slate-800 dark:text-white"/>
                </div>
              </div>

              <button className="w-full bg-[#8B1A2B] hover:bg-[#7a1625] text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-[#8B1A2B]/30 active:scale-95 mt-2">
                Seansı Kaydet
              </button>

            </form>
          </div>
        </div>

        {/* Sağ Sütun: Aktif Seanslar ve Kapasite Durumu */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Güncel Seanslar (Tarih: {selectedDate})</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {timeSlots.map(slot => {
              const isSoldOut = slot.currentBookedPax >= slot.maxPax;
              const fillPercentage = (slot.currentBookedPax / slot.maxPax) * 100;

              return (
                <div key={slot.id} className={`p-6 rounded-[2rem] border transition-all ${
                  !slot.isActive ? 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 opacity-60' :
                  isSoldOut ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 
                  'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                }`}>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-black tracking-tighter ${!slot.isActive ? 'text-gray-400' : 'text-slate-800 dark:text-white'}`}>
                        {slot.time}
                      </span>
                      {isSoldOut && slot.isActive && (
                        <span className="bg-[#8B1A2B] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md animate-pulse">
                          TÜKENDİ
                        </span>
                      )}
                    </div>
                    
                    {/* Toggle Switch */}
                    <button 
                      onClick={() => toggleSlotStatus(slot.id)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${slot.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-700'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${slot.isActive ? 'translate-x-7' : 'translate-x-1'}`}></div>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Masa Kotası</p>
                      <p className="font-black text-slate-800 dark:text-white">{slot.maxTables} Masa</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Max Misafir</p>
                      <p className="font-black text-slate-800 dark:text-white">{slot.maxPax} Kişi</p>
                    </div>
                  </div>

                  {/* Doluluk Çubuğu */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className={isSoldOut ? 'text-[#8B1A2B]' : 'text-gray-500'}>
                        Dolu: {slot.currentBookedPax} Kişi
                      </span>
                      <span className="text-gray-400">
                        Boş: {slot.maxPax - slot.currentBookedPax} Kişi
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isSoldOut ? 'bg-[#8B1A2B]' : fillPercentage > 75 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${fillPercentage}%` }}
                      ></div>
                    </div>
                  </div>


                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
