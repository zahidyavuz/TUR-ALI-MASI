'use client';

export default function AgencyProductsPage() {
  const tours = [
    { id: 'TR-1', title: 'Kapadokya Balon Turu', status: 'Aktif', price: '₺2.400' },
    { id: 'TR-2', title: 'Yeraltı Şehri Keşfi', status: 'Taslak', price: '₺800' }
  ];

  return (
    <div className="animate-in fade-in duration-500 font-sans">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tur Listesi</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm">Sisteme kayıtlı turlarınızı görüntüleyin ve yönetin.</p>
        </div>
        <button className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors shadow-sm flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Yeni Tur Ekle
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
        
          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {tours.map((tour) => (
              <div key={tour.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tur ID</p>
                    <p className="font-mono text-sm font-medium text-slate-900 dark:text-slate-300">{tour.id}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                      tour.status === 'Aktif' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' 
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}>
                      {tour.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Tur Adı</p>
                  <p className="font-medium text-slate-900 dark:text-white">{tour.title}</p>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Fiyat</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{tour.price}</p>
                  </div>
                  <button className="text-slate-700 dark:text-slate-300 font-medium text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Düzenle
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">

          <table className="w-full text-left border-collapse">
            <thead className="">
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 font-semibold ">
                <th className="p-4 pl-6">Tur Adı</th>
                <th className="p-4">Durum</th>
                <th className="p-4">Fiyat</th>
                <th className="p-4 text-right pr-6">İşlemler</th>
              </tr>
            </thead>
            <tbody className="">
              {tours.map((tour) => (
                <tr key={tour.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="p-4 pl-6 font-medium text-slate-900 dark:text-white ">{tour.title}</td>
                  <td className="p-4 ">
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${tour.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                      {tour.status}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-300 ">{tour.price}</td>
                  <td className="p-4 pr-6 text-right ">
                    <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors underline">Düzenle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    );
}
