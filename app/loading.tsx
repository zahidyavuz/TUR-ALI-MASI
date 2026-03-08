export default function GlobalLoading() {
    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Dış Dönen Halka */}
                <div className="absolute inset-0 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
                {/* İç Dalgalanan Nokta */}
                <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            </div>
            <h3 className="mt-6 text-xl font-black text-slate-800 tracking-tight">MACERA YÜKLENİYOR...</h3>
            <p className="text-sm font-semibold text-gray-400 mt-2 animate-pulse">Lütfen kemerlerinizi bağlayın ✈️</p>
        </div>
    );
}
