'use client';

export default function AgencyProductsPage() {
  const tours = [
    { id: 'TR-1', title: 'Kapadokya Balon Turu', status: 'Aktif', price: '₺2.400' },
    { id: 'TR-2', title: 'Yeraltı Şehri Keşfi', status: 'Taslak', price: '₺800' }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Tur Yönetimi</h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm">Sisteme kayıtlı turlarınızı ekleyin veya güncelleyin.</p>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors shadow-md shadow-orange-500/20">
          + Yeni Tur Ekle
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-700">
        
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 mb-6">
            {tours.map((tour) => (
              <div key={tour.id} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-gray-50 dark:border-white/5 pb-3">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tur ID</p>
                    <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{tour.id}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border ${
                      tour.status === 'Aktif' 
                        ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                    }`}>
                      {tour.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Tur Adı</p>
                  <p className="font-bold text-slate-800 dark:text-white">{tour.title}</p>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Fiyat</p>
                    <p className="font-black text-slate-800 dark:text-white">{tour.price}</p>
                  </div>
                  <button className="text-orange-500 font-bold text-sm bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800">
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
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-400 font-black ">
                <th className="p-4 pl-6">Tur Adı</th>
                <th className="p-4">Durum</th>
                <th className="p-4">Fiyat</th>
                <th className="p-4 text-right pr-6">İşlemler</th>
              </tr>
            </thead>
            <tbody className="">
              {tours.map((tour) => (
                <tr key={tour.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-slate-800 dark:text-white ">{tour.title}</td>
                  <td className="p-4 ">
                    <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border ${tour.status === 'Aktif' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'}`}>
                      {tour.status}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-600 dark:text-slate-300 ">{tour.price}</td>
                  <td className="p-4 pr-6 text-right ">
                    <button className="text-blue-500 hover:text-blue-700 font-bold text-sm bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors">Düzenle</button>
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
