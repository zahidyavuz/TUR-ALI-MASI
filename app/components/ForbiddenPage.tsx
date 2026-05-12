'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ForbiddenPageProps {
  message?: string;
}

const ForbiddenPage: React.FC<ForbiddenPageProps> = ({ message }) => {
  const router = useRouter();

  useEffect(() => {
    // Instead of blocking, redirect to profile for a frictionless experience
    const timer = setTimeout(() => {
      router.push('/profile');
    }, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl mb-6 mx-auto animate-bounce">
          🚀
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-4">
          Panelinize Yönlendiriliyorsunuz
        </h1>
        <p className="text-gray-500 font-medium mb-8">
          {message || 'Güvenlik kontrolleri tamamlandı. Lütfen bekleyin...'}
        </p>
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#008cb3] h-full animate-progress-fast"></div>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
