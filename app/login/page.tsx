'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { fetchAPI } from '../lib/api';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const { login } = useAuth();

    const handleRedirect = (user: any) => {
        if (!user) {
            router.push('/');
            return;
        }
        
        const role = user.role?.toLowerCase() || '';
        
        // SuperAdmin check
        if (user.username === 'yavuz50' || user.is_staff || role === 'superadmin' || role === 'admin') {
            router.push('/dashboard');
            return;
        }
        
        // Merchant/Agency check
        if (user.is_agency || role === 'merchant' || role === 'agency' || role === 'merchant/agency') {
            router.push('/agency/dashboard');
            return;
        }
        
        // Default Customer
        router.push('/');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Özel Admin Girişi
            if (username === 'yavuz50' && password === 'yavuz50') {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('access_token', 'admin_demo_token');
                }
                const user = await login({ access: 'admin_demo_token', refresh: 'admin_demo_token' });
                handleRedirect(user);
                return;
            }

            // Django Simple JWT expects POST /api/v1/options/token/
            const credentials = { username, password }; // Using standard Django generic TokenView or Custom LoginView

            // Note: Update backend URL to standard login endpoint. dj-rest-auth uses /auth/login/ usually
            const response = await fetchAPI('/auth/login/', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (!response) {
                console.warn("Backend not reachable. Mocking login.");
                if (typeof window !== 'undefined') {
                    localStorage.setItem('access_token', 'mock_token');
                }
                const user = await login({ access: 'mock_token', refresh: 'mock_token' });
                handleRedirect(user);
                return;
            }

            if (response.access_token && response.refresh_token) {
                const user = await login({ access: response.access_token, refresh: response.refresh_token });
                handleRedirect(user);
            } else if (response.access) {
                // native simple-jwt format
                const user = await login({ access: response.access, refresh: response.refresh });
                handleRedirect(user);
            } else {
                setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
            }

        } catch (err: any) {
            console.error("Login Error:", err);
            const errMsg = err?.message || '';
            if (errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network')) {
                console.warn("Backend catch fallback. Mocking login.");
                if (typeof window !== 'undefined') {
                    localStorage.setItem('access_token', 'mock_token');
                }
                const user = await login({ access: 'mock_token', refresh: 'mock_token' });
                handleRedirect(user);
            } else {
                setError(errMsg || 'Bir hata oluştu. Lütfen tekrar deneyin.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        // Redirect to Django Google Login endpoint
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/google/login/`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Hoş Geldiniz</h1>
                    <p className="text-gray-500 font-medium">Büyük maceralar sizi bekliyor.</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kullanıcı Adı veya E-Posta</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-[#008cb3] focus:bg-white transition-colors text-slate-800 font-semibold"
                            placeholder="Kullanıcı adınız"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Şifre</label>
                            <Link href="/forgot-password" className="text-xs font-bold text-[#008cb3] hover:underline">Unuttum?</Link>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-slate-50 border border-gray-200 p-4 pr-12 rounded-xl outline-none focus:border-[#008cb3] focus:bg-white transition-colors text-slate-800 font-semibold"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                                {showPassword ? (
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
                                ) : (
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#008cb3] hover:bg-[#005e85] text-white font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2"
                    >
                        {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                        {!loading && <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                    </button>
                </form>

                <div className="mt-8 relative flex items-center justify-center">
                    <div className="absolute inset-x-0 h-px bg-gray-200"></div>
                    <span className="relative bg-white px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Veya</span>
                </div>

                <div className="mt-8 space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google İle Devam Et
                    </button>
                    <p className="text-center text-sm font-semibold text-gray-500 mt-6">
                        Hesabınız yok mu?{' '}
                        <Link href="/register" className="text-[#008cb3] hover:underline font-black">
                            Kayıt Olun
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
