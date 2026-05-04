'use client';
import React, { useState, useEffect, Suspense, useCallback } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '../lib/api';


function VerifyEmailLogic() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // const [key, setKey] = useState(''); // Redundant, can compute from searchParams

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('E-posta adresiniz doğrulanıyor, lütfen bekleyin...');

    const verifyToken = useCallback(async (verificationKey: string) => {
        try {
            const data = await fetchAPI('/auth/registration/verify-email/', {
                method: 'POST',
                body: JSON.stringify({ key: verificationKey })
            });

            if (data) {
                setStatus('success');
                setMessage('E-posta adresiniz başarıyla doğrulandı! Artık giriş yapabilirsiniz.');
            } else {
                setStatus('error');
                setMessage('Doğrulama işlemi başarısız oldu. Bu bağlantının süresi dolmuş olabilir.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Sunucu ile iletişim kurulamadı. Lütfen daha sonra tekrar deneyin.');
        }
    }, []);


    useEffect(() => {
        const urlKey = searchParams.get('key') || searchParams.get('token');
        if (urlKey) {
            verifyToken(urlKey);
        } else {
            setStatus('error');
            setMessage('Geçersiz veya eksik doğrulama bağlantısı.');
        }
    }, [searchParams, verifyToken]);




    return (
        <div className="text-center">
            {status === 'loading' && (
                <div className="py-8 flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-[#008cb3] rounded-full animate-spin mb-4"></div>
                    <p className="font-bold text-gray-500">{message}</p>
                </div>
            )}

            {status === 'success' && (
                <div className="py-4">
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl font-bold mb-6 border border-emerald-100">
                        ✨ {message}
                    </div>
                    <button onClick={() => router.push('/login')} className="w-full bg-[#008cb3] text-white font-extrabold py-3.5 rounded-xl hover:bg-[#005e85] transition shadow-lg active:scale-95">
                        Giriş Yap
                    </button>
                </div>
            )}

            {status === 'error' && (
                <div className="py-4">
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-6 border border-red-100">
                        {message}
                    </div>
                    <Link href="/register" className="w-full block text-center bg-gray-100 text-slate-700 font-extrabold py-3.5 rounded-xl hover:bg-gray-200 transition">
                        Kayıt Sayfasına Dön
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="flex h-screen w-full bg-slate-50 items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden p-8 border border-gray-100">
                <div className="text-center mb-6">
                    <Link href="/" className="text-5xl font-extrabold text-[#008cb3] tracking-tighter inline-block mb-2">
                        tour<span className="text-[#005e85]">kia</span>
                    </Link>
                    <h1 className="text-xl font-black text-slate-800">Hesap Doğrulama</h1>
                </div>

                <Suspense fallback={<div className="text-center font-bold text-gray-400 py-8">Yükleniyor...</div>}>
                    <VerifyEmailLogic />
                </Suspense>
            </div>
        </div>
    );
}
