'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [uid, setUid] = useState('');
    const [token, setToken] = useState('');
    
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const urlUid = searchParams.get('uid');
        const urlToken = searchParams.get('token');
        if (urlUid && urlToken) {
            setUid(urlUid);
            setToken(urlToken);
        } else {
            setErrorMsg('Geçersiz şifre sıfırlama bağlantısı.');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== passwordConfirm) {
            setErrorMsg('Şifreler eşleşmiyor.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const res = await fetch('http://localhost:8000/api/v1/auth/password/reset/confirm/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid,
                    token,
                    new_password: password,
                    re_new_password: passwordConfirm
                })
            });

            if (res.ok) {
                setSuccessMsg('Şifreniz başarıyla sıfırlandı! Artık yeni şifrenizle giriş yapabilirsiniz.');
            } else {
                const data = await res.json();
                setErrorMsg(data.detail || data.non_field_errors?.[0] || 'Bir hata oluştu. Lütfen tekrar deneyin.');
            }
        } catch (err) {
            setErrorMsg('Sunucu ile iletişim kurulamadı.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (errorMsg && !uid) {
        return (
            <div className="text-center">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl font-semibold mb-6">
                    {errorMsg}
                </div>
                <Link href="/forgot-password" className="text-[#008cb3] font-bold hover:underline">
                    Yeni Bağanlantı İste
                </Link>
            </div>
        );
    }

    if (successMsg) {
        return (
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-center font-semibold mb-6">
                {successMsg}
                <button onClick={() => router.push('/login')} className="mt-4 w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition">
                    Giriş Yap
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold text-center">
                    {errorMsg}
                </div>
            )}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Yeni Şifre</label>
                <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-mono tracking-widest text-lg rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 transition-all" 
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Yeni Şifre (Yeniden)</label>
                <input 
                    type="password" 
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-mono tracking-widest text-lg rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 transition-all" 
                />
            </div>

            <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full bg-[#008cb3] hover:bg-[#005e85] text-white font-extrabold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
            >
                {isSubmitting ? 'Sıfırlanıyor...' : 'Şifreyi Güncelle'}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex h-screen w-full bg-slate-50 items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <Link href="/" className="text-3xl font-extrabold text-[#008cb3] tracking-tighter inline-block mb-2">
                        tour<span className="text-[#005e85]">kia™</span>
                    </Link>
                    <h1 className="text-2xl font-black text-slate-800">Yeni Şifre Belirle</h1>
                    <p className="text-gray-500 font-medium text-sm mt-2">Lütfen hesabınız için yeni ve güvenli bir şifre girin.</p>
                </div>
                <Suspense fallback={<div className="text-center font-bold text-gray-500 py-4">Bağlantı kontrol ediliyor...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
