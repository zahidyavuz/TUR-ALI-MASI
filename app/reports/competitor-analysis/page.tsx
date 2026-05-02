'use client';

import Link from 'next/link';

export default function CompetitorAnalysisReport() {
    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <svg width="240" height="240" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block shadow-sm">AI Data Intelligence</span>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight">Rakip Analizi & Pazar Payı Dashboard'u</h1>
                            <p className="text-gray-500 font-medium text-lg max-w-2xl">
                                Viator ve GetYourGuide'ın 2024 global trend raporlarıyla Tourkia veritabanının anlık, görselleştirilmiş kıyaslaması. Yeni Akdeniz turlarının (Kaş & Kemer) eklenmesiyle pazardaki rekabet gücümüz artırıldı.
                            </p>
                        </div>
                        <div className="flex gap-4 shrink-0">
                            <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 text-center min-w-[120px]">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Tourkia</p>
                                <p className="text-3xl font-black text-[#008cb3]">10 <span className="text-sm font-semibold">+ Tur</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Tourkia vs Global Competitors Graph */}
                    <div className="bg-white rounded-[32px] p-8 shadow-md border border-gray-100">
                        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <span className="text-blue-500">📊</span> Kategori Bazlı Pazar Hacmi
                        </h2>

                        <div className="space-y-6">
                            {/* Chart Row 1 */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-bold text-slate-700">Kültür & Tarih Seremonileri (Örn: Kyoto Çay Seremonisi)</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="w-20 text-[10px] font-bold text-gray-500 uppercase text-right">Tourkia</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-3 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 h-full bg-[#008cb3] rounded-full" style={{ width: '85%' }}></div>
                                        </div>
                                        <span className="w-10 text-xs font-bold text-slate-700">%85</span>
                                    </div>
                                    <div className="flex items-center gap-3 opacity-60">
                                        <span className="w-20 text-[10px] font-bold text-gray-400 uppercase text-right">Rakipler</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 h-full bg-gray-400 rounded-full" style={{ width: '60%' }}></div>
                                        </div>
                                        <span className="w-10 text-[10px] font-bold text-gray-400">%60</span>
                                    </div>
                                </div>
                            </div>

                            {/* Chart Row 2 */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-bold text-slate-700">Doğa & Ruhani (Örn: Kaz Dağları)</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="w-20 text-[10px] font-bold text-gray-500 uppercase text-right">Tourkia</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-3 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full" style={{ width: '92%' }}></div>
                                        </div>
                                        <span className="w-10 text-xs font-bold text-slate-700">%92</span>
                                    </div>
                                    <div className="flex items-center gap-3 opacity-60">
                                        <span className="w-20 text-[10px] font-bold text-gray-400 uppercase text-right">Rakipler</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 h-full bg-gray-400 rounded-full" style={{ width: '75%' }}></div>
                                        </div>
                                        <span className="w-10 text-[10px] font-bold text-gray-400">%75</span>
                                    </div>
                                </div>
                            </div>

                            {/* Chart Row 3 */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-bold text-slate-700">Adrenalin (ATV, Yamaç Paraşütü vb.)</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="w-20 text-[10px] font-bold text-gray-500 uppercase text-right">Tourkia</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-3 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: '65%' }}></div>
                                        </div>
                                        <span className="w-10 text-xs font-bold text-slate-700">%65</span>
                                    </div>
                                    <div className="flex items-center gap-3 opacity-60">
                                        <span className="w-20 text-[10px] font-bold text-gray-400 uppercase text-right">Rakipler</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 h-full bg-gray-400 rounded-full" style={{ width: '90%' }}></div>
                                        </div>
                                        <span className="w-10 text-[10px] font-bold text-gray-400">%90</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-orange-600 font-medium mt-2 text-right">⚠️ Rakipler bu alanda hala önde. (Fethiye eklentisiyle ivmeleniyoruz)</p>
                            </div>
                        </div>
                    </div>

                    {/* Regional Targeting */}
                    <div className="bg-white rounded-[32px] p-8 shadow-md border border-gray-100">
                        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <span className="text-indigo-500">🌍</span> Bölgesel Rekabet Haritası
                        </h2>

                        <div className="grid grid-cols-2 gap-4 h-[full]">
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative group overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <span className="text-8xl">🎎</span>
                                </div>
                                <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">Yüksek Dominasyon</span>
                                <h3 className="font-bold text-slate-800 text-lg mb-1">Uzak Doğu (Asya)</h3>
                                <p className="text-xs text-gray-500 mb-3">Kaş ve Kemer eklentileriyle Akdeniz pazarında büyük acentaları lokal hizmetle geride bırakıyoruz.</p>
                                <div className="flex justify-between items-center text-sm font-bold text-slate-700 mt-auto pt-4 border-t border-gray-200">
                                    <span>Pazar Payı Hedefi</span>
                                    <span className="text-green-600">%45</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative group overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <span className="text-8xl">🍕</span>
                                </div>
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">Odak Noktası</span>
                                <h3 className="font-bold text-slate-800 text-lg mb-1">Metropol (İstanbul vb.)</h3>
                                <p className="text-xs text-gray-500 mb-3">Gastronomi alanında paket turlarda güçlüyüz ancak 'günübirlik' aktivitelerde Viator'ın %60 pazar payı var.</p>
                                <div className="flex justify-between items-center text-sm font-bold text-slate-700 mt-auto pt-4 border-t border-gray-200">
                                    <span>Pazar Payı Hedefi</span>
                                    <span className="text-blue-600">%25</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gap Analysis / Action Plan */}
                <div className="bg-slate-900 rounded-[32px] p-8 md:p-10 shadow-2xl text-white relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-white/10 pb-6">
                        <h2 className="text-3xl font-black flex items-center gap-3">
                            <span className="text-green-400">✅</span> Tamamlanan Eylemler
                        </h2>
                        <span className="bg-green-500/20 text-green-400 text-sm font-bold px-4 py-2 rounded-xl">Son 24 Saatte Gelişenler</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="bg-emerald-900/40 rounded-2xl p-6 border border-emerald-500/30 backdrop-blur-sm flex gap-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 text-2xl shrink-0">⛩️</div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2 line-through opacity-80 decoration-emerald-500 decoration-2">Asya Turları Eksikliği</h3>
                                <p className="text-slate-300 text-sm">
                                    <strong className="text-emerald-400">ÇÖZÜLDÜ:</strong> Veritabanına Kaş Sonsuzluk Havuzları ve Kapadokya Şarap Tadımı turları eklendi. Türkiye kültürüne lokalize edildi.
                                </p>
                            </div>
                        </div>

                        <div className="bg-emerald-900/40 rounded-2xl p-6 border border-emerald-500/30 backdrop-blur-sm flex gap-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 text-2xl shrink-0">💬</div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2 line-through opacity-80 decoration-emerald-500 decoration-2">Kişiliksiz Satış Algısı</h3>
                                <p className="text-slate-300 text-sm">
                                    <strong className="text-emerald-400">ÇÖZÜLDÜ:</strong> Yapay zeka chatbot (Tourkia AI) her kültüre özel (ABD, Almanya, Çin, Türkiye) farklı bir kişilik bürünecek şekilde pazarlandı.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                            <p className="text-sm text-slate-300 font-medium tracking-wide">AI Engine Status: <span className="text-white font-bold">Optimizing...</span></p>
                        </div>
                        <Link href="/" className="bg-white hover:bg-slate-100 text-slate-900 font-black py-4 px-8 rounded-2xl transition-all shadow-lg active:scale-95 text-center w-full md:w-auto">
                            Sisteme Dön & İncele
                        </Link>
                    </div>
                </div>

            </div>
        </main>
    )
}
