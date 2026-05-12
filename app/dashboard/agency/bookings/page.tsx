'use client';

import { useState } from 'react';

export default function AgencyDailyManifestPage() {
  const [selectedDate, setSelectedDate] = useState('2026-05-12');
  const [activeTour, setActiveTour] = useState(1);

  // Mock Tours for the selected date
  const tours = [
    { id: 1, title: 'Kapadokya VIP Balon Turu', time: '05:30 AM', vehicle: 'Minibüs 1 (Plaka: 50 ABC 123)' },
    { id: 2, title: 'Kırmızı Tur (Göreme)', time: '09:30 AM', vehicle: 'Minibüs 2 (Plaka: 50 XYZ 789)' }
  ];

  // Mock Passengers for Active Tour
  const passengers = [
    { id: 'TKT-8924', name: 'John Doe', phone: '+1 555 123 4567', hotel: 'Argos in Cappadocia', pax: 2, status: 'Onaylandı' },
    { id: 'TKT-8925', name: 'Ayşe Yılmaz', phone: '+90 555 987 6543', hotel: 'Museum Hotel', pax: 1, status: 'Onaylandı' },
    { id: 'TKT-8926', name: 'Hans Müller', phone: '+49 151 2345678', hotel: 'Kelebek Cave Hotel', pax: 4, status: 'Onaylandı' },
    { id: 'TKT-8927', name: 'Elena Rossi', phone: '+39 333 1234567', hotel: 'Sultan Cave Suites', pax: 2, status: 'Beklemede' },
  ];

  const handlePrint = () => {
    // In a real app, this would trigger window.print() and CSS media print rules would hide non-essential UI.
    window.print();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Operasyon: Yolcu Manifestosu</h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base">
            Şoförler ve rehberler için günlük biniş listelerini yönetin ve çıktı alın.
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Tarih Seçici */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm flex-1 md:flex-none flex items-center gap-2">
            <span className="text-gray-400">📅</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none font-bold text-slate-800 dark:text-white cursor-pointer w-full"
            />
          </div>

          <button 
            onClick={handlePrint}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 whitespace-nowrap"
          >
            <span>🖨️</span> PDF / Çıktı Al
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sol Sütun: Günün Turları */}
        <div className="lg:col-span-1 space-y-3 print:hidden">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Günün Planı</h2>
          
          {tours.map(tour => (
            <div 
              key={tour.id}
              onClick={() => setActiveTour(tour.id)}
              className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                activeTour === tour.id 
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 shadow-sm' 
                  : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-orange-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black bg-slate-800 text-white px-2 py-0.5 rounded uppercase tracking-widest">
                  {tour.time}
                </span>
              </div>
              <h3 className={`font-bold text-sm ${activeTour === tour.id ? 'text-orange-700 dark:text-orange-400' : 'text-slate-800 dark:text-white'}`}>
                {tour.title}
              </h3>
              <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase">
                Araç: {tour.vehicle}
              </p>
            </div>
          ))}
        </div>

        {/* Sağ Sütun: Manifesto Tablosu */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-800 print:shadow-none print:border-none print:p-0">
          
          {/* Printable Header */}
          <div className="mb-8 border-b-2 border-dashed border-gray-200 dark:border-slate-800 pb-6 print:border-black">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white print:text-black">
                  {tours.find(t => t.id === activeTour)?.title}
                </h2>
                <div className="flex gap-4 mt-2 text-sm font-bold text-gray-500 print:text-gray-700">
                  <span className="flex items-center gap-1">📅 Tarih: {selectedDate}</span>
                  <span className="flex items-center gap-1">🕒 Kalkış: {tours.find(t => t.id === activeTour)?.time}</span>
                  <span className="flex items-center gap-1">🚐 {tours.find(t => t.id === activeTour)?.vehicle}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest print:text-black">Toplam Yolcu</p>
                <p className="text-4xl font-black text-orange-500 print:text-black">
                  {passengers.reduce((sum, p) => sum + p.pax, 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Passenger Table */}
          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 mb-6">
            {passengers.map((p) => (
              <div key={p.id} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-gray-50 dark:border-white/5 pb-3">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bilet No</p>
                    <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{p.id}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border ${
                      p.status === 'Onaylandı' 
                        ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                    }`}>
                      {p.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Yolcu</p>
                    <p className="font-bold text-slate-800 dark:text-white">{p.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Kişi</p>
                    <p className="font-black text-lg text-slate-800 dark:text-white">{p.pax}</p>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mt-1">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{p.phone}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{p.hotel}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">

            <table className="w-full text-left border-collapse">
              <thead className="">
                <tr className="bg-slate-50 dark:bg-slate-950 border-b-2 border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 font-black print:bg-gray-100 print:text-black print:border-black ">
                  <th className="p-4 pl-6 w-12 text-center">Bin.</th>
                  <th className="p-4">Bilet No (QR)</th>
                  <th className="p-4">Yolcu Adı</th>
                  <th className="p-4">İletişim & Otel</th>
                  <th className="p-4 text-center">Kişi</th>
                  <th className="p-4 pr-6 text-right print:hidden">Durum</th>
                </tr>
              </thead>
              <tbody className="">
                {passengers.map((p, index) => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors print:border-gray-300">
                    <td className="p-4 pl-6 text-center ">
                      {/* Biniş (Boarding) Checkbox for physical paper usage */}
                      <div className="w-6 h-6 border-2 border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 mx-auto print:border-black"></div>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold text-gray-500 print:text-black ">{p.id}</td>
                    <td className="p-4 font-bold text-slate-800 dark:text-white print:text-black ">{p.name}</td>
                    <td className="p-4 ">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 print:text-black">{p.phone}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 print:text-gray-600">{p.hotel}</p>
                    </td>
                    <td className="p-4 text-center font-black text-lg text-slate-800 dark:text-white print:text-black ">{p.pax}</td>
                    <td className="p-4 pr-6 text-right print:hidden ">
                      <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border ${
                        p.status === 'Onaylandı' 
                          ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                          : 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-slate-800 text-center text-xs font-bold text-gray-400 print:text-black">
          Bu belge Tourkia platformu tarafından otomatik olarak oluşturulmuştur. Tarih: {new Date().toLocaleDateString('tr-TR')}
        </div>
      </div>
    </div>
  );
}
