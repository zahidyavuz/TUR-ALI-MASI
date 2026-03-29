'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const res = await fetch('http://localhost:8000/api/v1/auth/password/reset/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (res.ok) {
                setSuccessMsg('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.');
            } else {
                const data = await res.json();
                setErrorMsg(data.email?.[0] || data.detail || 'Bir hata oluştu. Lütfen tekrar deneyin.');
            }
        } catch (err) {
            setErrorMsg('Sunucu ile iletişim kurulamadı.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-slate-50 items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <Link href="/" className="text-3xl font-extrabold text-[#008cb3] tracking-tighter inline-block mb-2">
                        melih<span className="text-[#005e85]">tours™</span>
                    </Link>
                    <h1 className="text-2xl font-black text-slate-800">Şifremi Unuttum</h1>
                    <p className="text-gray-500 font-medium text-sm mt-2">Kayıtlı e-posta adresinizi girerek şifrenizi sıfırlayabilirsiniz.</p>
                </div>

                {successMsg ? (
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-center font-semibold mb-6">
                        {successMsg}
                        <button onClick={() => router.push('/login')} className="mt-4 w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition">
                            Giriş Yap
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {errorMsg && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold text-center">
                                {errorMsg}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">E-Posta Adresi</label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ornek@mail.com" 
                                className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-semibold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 transition-all" 
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={`w-full bg-[#008cb3] hover:bg-[#005e85] text-white font-extrabold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {isSubmitting ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
                        </button>

                        <p className="text-center text-sm font-bold text-gray-500 mt-6">
                            Şifrenizi hatırladınız mı? <Link href="/login" className="text-[#008cb3] hover:underline">Giriş Yapın</Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
