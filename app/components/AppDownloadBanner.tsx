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
                            <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.61,3,21.09,3,20.5M16.81,15.12L18.81,16.27C19.46,16.64,19.46,17.36,18.81,17.73L4.82,25.74L14.7,15.86L16.81,15.12M14.7,8.14L4.82,18.26L18.81,26.27C19.46,26.64,19.46,27.36,18.81,27.73L16.81,28.88L14.7,8.14M16.81,8.88L14.7,6.14L18.81,4.27C19.46,3.9,19.46,3.18,18.81,2.81L16.81,1.73L14.7,8.88Z" transform="scale(0.8) translate(3,3)"/>
                        </svg>
                        <span className="text-[11px] font-black uppercase tracking-widest border-b-2 border-black">Google Play</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
