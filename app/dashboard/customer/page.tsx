'use client';

import Image from 'next/image';

export default function CustomerWalletPage() {
  const mockTickets = [
    {
      id: 'TKT-8924',
      type: 'TOUR',
      title: 'Kapadokya VIP Balon Turu',
      date: '15 Mayıs 2026',
      time: '05:30 AM',
      location: 'Göreme, Nevşehir',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TKT-8924',
      status: 'Aktif'
    },
    {
      id: 'TKT-9011',
      type: 'RESTAURANT',
      title: 'Nusret Steakhouse - Akşam Yemeği',
      date: '18 Mayıs 2026',
      time: '20:00',
      location: 'Beşiktaş, İstanbul',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TKT-9011',
      status: 'Aktif'
    }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">Dijital Cüzdanım</h1>
        <p className="text-gray-500 dark:text-slate-400 font-medium mt-2 text-sm md:text-base">
          Satın aldığınız biletler cihazınıza şifrelenerek kaydedildi. İnternetiniz olmasa bile kapıda okutabilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockTickets.map((ticket) => (
          <div key={ticket.id} className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-transform hover:-translate-y-2 group">
            {/* Offline Badge */}
            <div className="absolute top-6 right-6 z-10 flex items-center gap-2 bg-green-500/10 backdrop-blur-md border border-green-500/20 px-3 py-1.5 rounded-full shadow-lg">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">Çevrimdışı Hazır</span>
            </div>

            {/* Ticket Header */}
            <div className={`p-8 pb-10 ${ticket.type === 'TOUR' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-orange-500 to-red-600'}`}>
              <span className="text-white/80 text-xs font-black uppercase tracking-widest">{ticket.type === 'TOUR' ? 'Vip Tur' : 'Restoran Menüsü'}</span>
              <h2 className="text-2xl font-black text-white mt-1 leading-tight drop-shadow-md">{ticket.title}</h2>
              <div className="mt-6 flex justify-between items-center text-white">
                <div>
                  <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">Tarih</p>
                  <p className="font-bold text-lg">{ticket.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">Saat</p>
                  <p className="font-bold text-lg">{ticket.time}</p>
                </div>
              </div>
            </div>

            {/* Serrated Edge Div */}
            <div className="relative h-6 bg-white dark:bg-slate-900 -mt-3 rounded-t-3xl flex justify-between items-center px-4 overflow-hidden">
                <div className="absolute top-1/2 left-0 -translate-y-1/2 -ml-3 w-6 h-6 bg-slate-50 dark:bg-slate-950 rounded-full inset-shadow"></div>
                <div className="w-full border-t-2 border-dashed border-gray-200 dark:border-slate-700 mx-4 opacity-50"></div>
                <div className="absolute top-1/2 right-0 -translate-y-1/2 -mr-3 w-6 h-6 bg-slate-50 dark:bg-slate-950 rounded-full inset-shadow"></div>
            </div>

            {/* QR Code Section */}
            <div className="p-8 pt-4 flex flex-col items-center bg-white dark:bg-slate-900">
              <div className="p-4 bg-white rounded-3xl border-4 border-gray-100 dark:border-slate-800 shadow-inner group-hover:scale-105 transition-transform duration-300">
                <Image src={ticket.qrCode} alt="QR Code" width={200} height={200} className="w-48 h-48 object-contain" unoptimized />
              </div>
              <p className="mt-6 text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{ticket.id}</p>
              <p className="mt-2 text-xs font-medium text-gray-400 text-center px-4">
                Bu QR kodu görevliye okutarak <span className="font-bold text-slate-700 dark:text-slate-300">{ticket.location}</span> lokasyonunda giriş yapabilirsiniz.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
