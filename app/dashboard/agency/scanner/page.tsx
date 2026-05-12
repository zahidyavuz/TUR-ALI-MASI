'use client';

export default function QRScannerPage() {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="text-center max-w-md w-full">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Bilet Tarayıcı</h1>
        <p className="text-gray-500 dark:text-slate-400 font-medium text-sm mb-8">Misafirlerin QR kodlu biletlerini kameraya okutarak anında onaylayın.</p>
        
        <div className="bg-slate-900 rounded-[3rem] p-4 aspect-[3/4] w-full max-w-xs mx-auto relative shadow-2xl overflow-hidden border-8 border-slate-800">
          {/* Camera View Finder Placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white/50 rounded-3xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-3xl"></div>
              <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center">
                <span className="text-white/50 text-sm font-bold uppercase tracking-widest">Kamera Bekleniyor</span>
              </div>
              {/* Scan Line Animation */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500 blur-[2px] animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
          
          <button className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/40 hover:scale-105 transition-transform">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6 uppercase tracking-widest font-black">veya bilet kodunu elle girin</p>
        <div className="mt-4 flex gap-2 w-full max-w-xs mx-auto">
          <input type="text" placeholder="Örn: TKT-1234" className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-orange-500 font-bold text-center text-sm uppercase" />
          <button className="bg-slate-800 dark:bg-slate-700 text-white font-bold px-4 rounded-2xl text-sm">Doğrula</button>
        </div>
      </div>
    </div>
  );
}
