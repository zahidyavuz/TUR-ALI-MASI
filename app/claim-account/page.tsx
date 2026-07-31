"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchAPI } from "@/app/lib/api";

/**
 * Misafir hesabı sahiplenme (claim) sayfası.
 *
 * Ödeme sonrası misafire gönderilen "hesap oluştur" davetindeki imzalı token
 * (`?token=`) ile misafir bir parola belirleyip gölge hesabını gerçek hesaba
 * çevirir (backend: users/auth_views.ClaimAccountView). Başarılı olunca giriş
 * sayfasına yönlendirilir.
 */
function ClaimAccountLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Bağlantı eksik. Lütfen e-postanızdaki bağlantıyı kullanın.");
      return;
    }
    if (password.length < 8) {
      setError("Parola en az 8 karakter olmalıdır.");
      return;
    }
    if (password !== confirm) {
      setError("Parolalar eşleşmiyor.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await fetchAPI("/auth/claim-account/", {
        method: "POST",
        throwOnHttpError: true,
        body: JSON.stringify({ token, password }),
      });
      if (!result) {
        setError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      // Backend parola doğrulama hataları dizi olarak gelebilir.
      const data = err?.data?.error;
      setError(
        Array.isArray(data)
          ? data.join(" ")
          : err?.message || "Hesap oluşturulamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-[32px] p-10 text-center shadow-2xl">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-black text-[#0B132B] mb-2">Hesabınız oluşturuldu</h2>
        <p className="text-slate-500 font-medium">
          Giriş sayfasına yönlendiriliyorsunuz...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-[32px] p-8 md:p-10 shadow-2xl">
      <h2 className="text-2xl font-black text-[#0B132B] mb-1">Hesabınızı Oluşturun</h2>
      <p className="text-sm font-medium text-slate-500 mb-8">
        Bir parola belirleyin; rezervasyonlarınızı tek panelden takip edin.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
            Parola
          </label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold"
            placeholder="En az 8 karakter"
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
            Parola (Tekrar)
          </label>
          <input
            required
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 text-slate-900 focus:border-[#008cb3] focus:bg-white outline-none transition-all font-bold"
            placeholder="Parolanızı tekrar girin"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-sm font-bold">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#0B132B] hover:bg-[#005e85] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-lg py-5 rounded-2xl shadow-xl transition-all"
        >
          {submitting ? "Oluşturuluyor..." : "Hesabımı Oluştur"}
        </button>
      </form>

      <p className="text-xs font-medium text-slate-400 mt-6 text-center">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="text-[#008cb3] font-bold hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}

export default function ClaimAccountPage() {
  return (
    <div className="min-h-screen bg-[#0B132B] flex flex-col justify-center py-12 px-4">
      <Suspense
        fallback={
          <div className="text-center py-20 font-bold text-slate-400">
            Yükleniyor...
          </div>
        }
      >
        <ClaimAccountLogic />
      </Suspense>
    </div>
  );
}
