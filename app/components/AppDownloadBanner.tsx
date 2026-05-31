'use client';

/**
 * PERMANENT-APP-STORE-BANNER
 * Sitenin en tepesinde, kullanıcıyı mobil uygulamaya yönlendiren KALICI reklam şeridi.
 */
export default function AppDownloadBanner() {
    return (
        <div className="w-full bg-[#ff7300] text-black py-2.5 px-4 relative z-[110] border-b border-black/10">
            <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-center">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-white text-[10px] font-black">!</span>
                    <p className="text-[13px] sm:text-[15px] font-black text-black tracking-tight">
                        Tourkia Cebinizde! Mobil Uygulamamızı İndirin, Özel İndirimleri Kaçırmayın.
                    </p>
                </div>
                
                <div className="flex items-center gap-6">
                    {/* App Store */}
                    <a 
                        href="#" 
                        className="flex items-center gap-2 hover:opacity-70 transition-all group"
                        title="App Store'dan İndir"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-black">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .76-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91 1.65.07 2.93.67 3.73 1.84-3.27 1.93-2.73 6.13.56 7.63-.58 1.45-1.31 2.89-2.2 4.19zM15.17 6.69c-.73.89-1.95 1.51-3.14 1.42-.13-1.18.41-2.42 1.13-3.26.73-.86 2-1.5 3.12-1.42.14 1.23-.39 2.37-1.11 3.26z"/>
                        </svg>
                        <span className="text-[11px] font-black uppercase tracking-widest border-b-2 border-black">App Store</span>
                    </a>

                    {/* Google Play */}
                    <a 
                        href="#" 
                        className="flex items-center gap-2 hover:opacity-70 transition-all group"
                        title="Google Play'den İndir"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-black">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.404l2.937 1.697c.552.32.552 1.12 0 1.44l-2.937 1.697-2.635-2.637 2.635-2.197zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z"/>
                        </svg>
                        <span className="text-[11px] font-black uppercase tracking-widest border-b-2 border-black">Google Play</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
