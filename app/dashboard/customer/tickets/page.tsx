'use client';

export default function TicketsPage() {
  const tickets = [
    { id: 'TKT-8932', title: 'Kapadokya Balon Turu', date: '15 Mayıs 2026', time: '05:30', status: 'Yaklaşan', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'TKT-4410', title: 'İstanbul Boğaz Turu', date: '10 Mayıs 2026', time: '14:00', status: 'Tamamlandı', color: 'bg-green-50 text-green-600 border-green-200' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Biletlerim</h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm">Satın aldığınız tüm turlar ve QR kodlu biletleriniz.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex gap-4">
            {/* QR Placeholder */}
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600">
              <span className="text-4xl opacity-50">📱</span>
            </div>
            
            <div className="flex flex-col justify-between flex-1 py-1">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-800 dark:text-white text-[15px] leading-tight">{ticket.title}</h3>
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
        ))}
      </div>
    </div>
  );
}
