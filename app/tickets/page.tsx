'use client';
import Link from 'next/link';

export default function TicketsPage() {
  const tickets = [
    { id: 'TKT-8932', title: 'Kapadokya Balon Turu', date: '15 Mayıs 2026', time: '05:30', status: 'Yaklaşan', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'TKT-4410', title: 'İstanbul Boğaz Turu', date: '10 Mayıs 2026', time: '14:00', status: 'Tamamlandı', color: 'bg-green-50 text-green-600 border-green-200' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 transition-colors duration-500">
      <div className="max-w-4xl mx-auto">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Biletlerim</h1>
              <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm">Satın aldığınız tüm turlar ve QR kodlu biletleriniz.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {tickets.map((ticket) => (
              <Link href={`/tickets/${ticket.id}`} key={ticket.id} className="block group">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 flex gap-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:border-[#008cb3]/30">
                  {/* QR Placeholder */}
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 transition-colors group-hover:bg-[#008cb3]/5 dark:group-hover:bg-[#008cb3]/10">
                    <span className="text-4xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all">📱</span>
                  </div>
                  
                  <div className="flex flex-col justify-between flex-1 py-1">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-white text-[15px] leading-tight group-hover:text-[#008cb3] transition-colors">{ticket.title}</h3>
                      </div>
                      <p className="text-[12px] font-bold text-gray-500 flex gap-2">
                        <span>📅 {ticket.date}</span>
                        <span>⏰ {ticket.time}</span>
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">{ticket.id}</span>
                      <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-lg border ${ticket.color}`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Yeni Turları Keşfet Butonu */}
          <div className="border-t border-gray-200 dark:border-slate-800 pt-8 text-center">
            <Link href="/search" className="inline-flex items-center gap-2 bg-[#008cb3] text-white px-8 py-4 rounded-xl font-black hover:bg-[#005e85] transition-colors shadow-lg active:scale-95">
              <span>🌍</span> Yeni Turları Keşfet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
