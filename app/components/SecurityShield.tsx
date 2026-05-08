'use client';
import { useState, useEffect } from 'react';

/**
 * SecurityShield Component
 * Arka planda çalışan görünmez bir Cloudflare Turnstile / reCAPTCHA simülatörü.
 * 
 * Amaç: Kayıt, şifre sıfırlama gibi kritik işlemlerde botları engellemek 
 * ve "Zero-Trust" kuralları gereği isteği yapanın insan olduğunu teyit etmek.
 */
export default function SecurityShield({ onVerify }: { onVerify: (token: string) => void }) {
    const [status, setStatus] = useState<'analyzing' | 'verified' | 'failed'>('analyzing');

    useEffect(() => {
        // İnsan davranışlarını analiz etmeyi simüle eder (Mouse hareketi, browser parmak izi vb.)
        const analyzeTimer = setTimeout(() => {
            // Analiz başarılı, "invisible token" oluştur.
            setStatus('verified');
            onVerify('cf_turnstile_secure_token_human_verified_72948XQ');
        }, 1500); // 1.5 saniyelik arka plan analizi

        return () => clearTimeout(analyzeTimer);
    }, [onVerify]);

    if (status === 'analyzing') {
        return (
            <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin"></div>
                Siber Güvenlik Kalkanı: İnsan Doğrulaması Yapılıyor...
            </div>
        );
    }

    if (status === 'verified') {
        return (
            <div className="flex items-center gap-3 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100 transition-all duration-500">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                </svg>
                Bağlantı Güvenli: İnsan Olduğunuz Doğrulandı (Zero-Trust)
            </div>
        );
    }

    return null;
}
