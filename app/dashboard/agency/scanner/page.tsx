'use client';

export default function QRScannerPage() {
  return (
    <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center min-h-[70vh] font-sans">
      <div className="text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Bilet Tarayıcı</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-8">Misafirlerin bilet kodlarını okutarak veya girerek anında onaylayın.</p>
        
        <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 aspect-[3/4] w-full max-w-xs mx-auto relative shadow-sm overflow-hidden border border-slate-800">
          {/* Camera View Finder Placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white/20 rounded-md relative">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br"></div>
              <div className="absolute inset-0 bg-emerald-500/5 flex items-center justify-center">
                <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Kamera Bekleniyor</span>
              </div>
              {/* Scan Line Animation */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500 blur-[1px] animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
          
          <button className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-slate-900 w-14 h-14 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-100 transition-colors border border-slate-200">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>

        <p className="text-[10px] text-slate-500 mt-6 uppercase tracking-wider font-semibold">veya bilet kodunu elle girin</p>
        <div className="mt-3 flex gap-2 w-full max-w-xs mx-auto">
          <input type="text" placeholder="Örn: TKT-1234" className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 font-medium text-center text-sm uppercase text-slate-900 dark:text-white" />
          <button className="bg-slate-900 dark:bg-slate-800 text-white font-medium px-4 rounded-md text-sm hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors">Doğrula</button>
        </div>
      </div>
    </div>
  );
}
