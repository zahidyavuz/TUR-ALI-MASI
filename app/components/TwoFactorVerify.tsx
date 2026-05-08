'use client';

import React, { useState, useEffect } from 'react';

interface TwoFactorVerifyProps {
    username: string;
    onVerify: (code: string) => Promise<void>;
    onCancel: () => void;
    error?: string;
}

export default function TwoFactorVerify({ username, onVerify, onCancel, error: externalError }: TwoFactorVerifyProps) {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(180); // 3 dakika

    useEffect(() => {
        if (externalError) setError(externalError);
    }, [externalError]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((t) => (t > 0 ? t - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        
        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        // Bir sonraki kutuya geç
        if (value && index < 5) {
            const nextInput = document.getElementById(`digit-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`digit-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            setError('Lütfen 6 haneli kodu eksiksiz girin.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await onVerify(fullCode);
        } catch (err: any) {
            setError(err.message || 'Doğrulama başarısız.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4">
            <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md border border-slate-200 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Güvenlik Doğrulaması</h2>
                    <p className="text-sm text-gray-500 font-medium">
                        <span className="font-bold text-slate-700">@{username}</span> hesabına giriş için telefonunuza gönderilen 6 haneli kodu girin.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100 flex items-center gap-2">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex justify-between gap-2">
                        {code.map((digit, idx) => (
                            <input
                                key={idx}
                                id={`digit-${idx}`}
                                type="text"
                                inputMode="numeric"
                                value={digit}
                                onChange={(e) => handleChange(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                                className="w-12 h-14 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-xl text-center text-xl font-black text-slate-800 outline-none transition-all"
                                maxLength={1}
                                required
                            />
                        ))}
                    </div>

                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kalan Süre</p>
                        <span className={`text-lg font-black ${timer < 30 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>
                            {formatTime(timer)}
                        </span>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={loading || timer === 0}
                            className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-slate-900/20 disabled:opacity-50"
                        >
                            {loading ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full bg-white text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all"
                        >
                            İptal
                        </button>
                    </div>
                </form>

                <p className="mt-8 text-center text-xs font-medium text-gray-400">
                    Kod gelmedi mi? <button className="text-blue-600 font-bold hover:underline">Tekrar Gönder</button>
                </p>
            </div>
        </div>
    );
}
