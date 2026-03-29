export default function CheckoutSuccess() {
    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-12 max-w-lg w-full text-center shadow-2xl flex flex-col items-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                    <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 className="text-3xl font-black text-slate-800 mb-2">Ödeme Başarılı!</h1>
                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                    3D Secure SMS doğrulamanız ve ödemeniz sorunsuzca gerçekleşti. Faturanız ve biletleriniz mail adresinize gönderildi.
                </p>

                <a href="/" className="bg-[#005e85] hover:bg-[#004b6b] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md">
                    Ana Sayfa'ya Dön ➔
                </a>
            </div>
        </div>
    )
}
