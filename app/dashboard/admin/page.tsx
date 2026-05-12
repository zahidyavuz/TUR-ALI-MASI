'use client';

import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-slate-900 dark:bg-black rounded-3xl p-8 shadow-sm border border-slate-700 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-9xl opacity-5">🦅</div>
        <h1 className="text-3xl font-black text-white mb-2 relative z-10">Sistem Yönetimi (SuperAdmin)</h1>
        <p className="text-slate-400 font-medium relative z-10">Hoş geldiniz, {user?.username || 'Yönetici'}! Platformun tam kontrol ve güvenlik merkezi.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10 relative z-10">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
            <h3 className="text-lg font-bold text-white mb-2">Genel Ayarlar</h3>
            <p className="text-xs text-slate-400">Sistem değişkenleri ve yapılandırmalar.</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-red-500 transition-colors cursor-pointer group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛡️</div>
            <h3 className="text-lg font-bold text-white mb-2">Güvenlik Duvarı</h3>
            <p className="text-xs text-slate-400">Siber saldırı kayıtları ve IP engelleme.</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-orange-500 transition-colors cursor-pointer group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏢</div>
            <h3 className="text-lg font-bold text-white mb-2">Acenta & Restoran Onay</h3>
            <p className="text-xs text-slate-400">Bekleyen ticari kayıt başvuruları.</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-purple-500 transition-colors cursor-pointer group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📊</div>
            <h3 className="text-lg font-bold text-white mb-2">Finans & Raporlar</h3>
            <p className="text-xs text-slate-400">Platformun komisyon ve ciro akışı.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
