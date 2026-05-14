'use client';
import { useEffect, useState } from 'react';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([
    { id: 'TKT-8932', type: 'tour', title: 'Kapadokya Balon Turu', date: '15 Mayıs 2026', time: '05:30', status: 'Yaklaşan', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'TKT-4410', type: 'tour', title: 'İstanbul Boğaz Turu', date: '10 Mayıs 2026', time: '14:00', status: 'Tamamlandı', color: 'bg-green-50 text-green-600 border-green-200' },
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('demo_new_bookings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const formatted = parsed.map((b: any) => ({
            id: `TKT-${b.id}`,
            type: b.service_type || 'tour',
            title: b.tour_detail?.title || 'Rezervasyon',
            date: b.start_date ? new Date(b.start_date).toLocaleDateString('tr-TR') : 'Belirsiz',
            time: b.reservation_time || '12:00',
            status: 'Yaklaşan',
            color: b.service_type === 'meal' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200',
            pax: b.pax || 1,
            address: b.service_type === 'meal' ? 'Mekan Adresi (Göreme Kasabası)' : undefined
          }));
          setTickets(prev => [...formatted, ...prev]);
        } catch (e) {}
      }
    }
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Biletlerim</h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm">Satın aldığınız tüm turlar ve QR kodlu yemek biletleriniz.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tickets.map((ticket, idx) => (
          <div key={idx} className={`bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border flex gap-4 ${ticket.type === 'meal' ? 'border-orange-200 dark:border-orange-900/50 relative overflow-hidden' : 'border-gray-100 dark:border-slate-700'}`}>
            {ticket.type === 'meal' && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            )}
            
            {/* QR Placeholder */}
            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center shrink-0 border ${ticket.type === 'meal' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl opacity-80">{ticket.type === 'meal' ? '🍽️' : '📱'}</span>
                <span className={`text-[8px] font-black uppercase tracking-widest ${ticket.type === 'meal' ? 'text-orange-500' : 'text-slate-400'}`}>QR KOD</span>
              </div>
            </div>
            
            <div className="flex flex-col justify-between flex-1 py-1 z-10 relative">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-black text-[15px] leading-tight ${ticket.type === 'meal' ? 'text-orange-900 dark:text-orange-100' : 'text-slate-800 dark:text-white'}`}>{ticket.title}</h3>
                </div>
                <p className="text-[12px] font-bold text-gray-500 flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  <span className="flex items-center gap-1">📅 {ticket.date}</span>
                  <span className="flex items-center gap-1">⏰ {ticket.time}</span>
                  {ticket.pax && <span className="flex items-center gap-1">👥 {ticket.pax} Kişi</span>}
                </p>
                {ticket.type === 'meal' && (
                  <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                    📍 {ticket.address}
                  </p>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">{ticket.id}</span>
                <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-lg border ${ticket.color}`}>
                  {ticket.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
