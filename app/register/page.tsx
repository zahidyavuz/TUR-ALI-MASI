'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { fetchAPI } from '../lib/api';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        passwordConfirm: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const { login } = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.passwordConfirm) {
            setError('Şifreler eşleşmiyor.');
            return;
        }

        setLoading(true);

        try {
            // Using dj-rest-auth standard registration endpoint
            const response = await fetchAPI('/auth/registration/', {
                method: 'POST',
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    // dj-rest-auth sometimes expects password twice or just once based on settings, standard is typically pw1/pw2
                    password1: formData.password,
                    password2: formData.passwordConfirm
                })
            });

            // Assuming dj-rest-auth returns tokens upon successful registration 
            if (response.access) {
                await login({ access: response.access, refresh: response.refresh });
                router.push('/dashboard');
            } else if (response.user) {
                // If it doesn't auto-login, redirect to login page
                router.push('/login?registered=true');
            } else {
                throw new Error('Kayıt başarısız oldu.');
            }

        } catch (err: any) {
            console.error("Registration Error:", err);

            // Format Django validation errors if they exist
            if (err.data) {
                const msgs = Object.values(err.data).flat().join(" ");
                setError(msgs || 'Geçersiz bilgiler, lütfen tekrar deneyin.');
            } else {
                setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/google/login/`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
            <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Aramıza Katılın</h1>
                    <p className="text-gray-500 font-medium">Büyük ayrıcalıklar sadece bir tık uzakta.</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kullanıcı Adı</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-[#008cb3] focus:bg-white transition-colors text-slate-800 font-semibold"
                            placeholder="johndoe"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">E-Posta Adresi</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-[#008cb3] focus:bg-white transition-colors text-slate-800 font-semibold"
                            placeholder="ornek@email.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Şifre</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-[#008cb3] focus:bg-white transition-colors text-slate-800 font-semibold"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Şifre Tekrar</label>
                        <input
                            type="password"
                            name="passwordConfirm"
                            value={formData.passwordConfirm}
                            onChange={handleChange}
                            required
                            minLength={6}
                            className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-[#008cb3] focus:bg-white transition-colors text-slate-800 font-semibold"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#008cb3] hover:bg-[#005e85] text-white font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/30 flex justify-center items-center"
                        >
                            {loading ? 'Kayıt Oluşturuluyor...' : 'Ücretsiz Kayıt Ol'}
                        </button>
                    </div>
                </form>

                <div className="mt-8 relative flex items-center justify-center">
                    <div className="absolute inset-x-0 h-px bg-gray-200"></div>
                    <span className="relative bg-white px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Veya</span>
                </div>

                <div className="mt-6 space-y-4">
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
                        Google İle Hızlı Kayıt
                    </button>
                    <p className="text-center text-sm font-semibold text-gray-500 mt-6">
                        Zaten üye misiniz?{' '}
                        <Link href="/login" className="text-[#008cb3] hover:underline font-black">
                            Giriş Yapın
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
