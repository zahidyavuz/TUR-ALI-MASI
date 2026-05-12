'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function SuccessPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Arkaplan Şekilleri */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-400 rounded-full blur-[100px] opacity-20"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400 rounded-full blur-[100px] opacity-20"></div>

            <div className="bg-white rounded-[32px] p-8 sm:p-12 shadow-2xl border border-gray-100 max-w-lg w-full text-center relative z-10">
                <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center shadow-inner mx-auto mb-6 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20"></div>
                    <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="3" className="relative z-10"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>

                <h1 className="text-3xl font-black text-slate-800 mb-2">Rezervasyonunuz Alındı!</h1>
                <p className="text-slate-500 font-medium mb-8">Biletiniz şimdilik <strong className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded">Onay Bekliyor</strong> statüsündedir.</p>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-left">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="text-xl">🏦</span> Banka Bilgilerimiz
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Alıcı Adı:</p>
                            <p className="text-sm font-semibold text-slate-700">Tourkia Turizm ve Seyahat A.Ş.</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Banka:</p>
                            <p className="text-sm font-semibold text-slate-700">Garanti BBVA</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">IBAN:</p>
                            <p className="text-sm font-mono font-bold text-slate-800 bg-white border border-gray-200 p-2 rounded-lg mt-1 select-all break-all overflow-hidden text-clip whitespace-normal block w-full">TR12 0006 2000 0001 2345 6789 00</p>
                        </div>
                    </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-8">
                    <p className="text-xs sm:text-sm text-emerald-800 font-medium leading-relaxed">
                        Ödemenizi gönderdikten sonra dekontu WhatsApp hattımıza göndererek onay sürecini <strong>çok daha hızlı</strong> tamamlayabilirsiniz.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <a href="https://wa.me/905555555555?text=Merhaba,%20rezervasyon%20ödememe%20ait%20dekontu%20iletiyorum." target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white font-black text-[15px] py-4 rounded-xl hover:bg-[#20bd5a] transition-transform active:scale-95 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>
                        WhatsApp Üzerinden Dekont İlet
                    </a>

                    <button onClick={() => router.push('/tickets')} className="w-full bg-white border border-gray-200 text-slate-700 font-bold text-[15px] py-4 rounded-xl hover:bg-slate-50 transition-colors">
                        Biletlerime Git ➔
                    </button>
                </div>
            </div>
        </div>
    );
}
