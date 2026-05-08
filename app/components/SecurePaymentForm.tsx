'use client';

import { useState } from 'react';
import {
  formatCardInput,
  formatCvvInput,
  formatExpiryInput,
  maskCardNumber,
  storePaymentToken,
} from '../lib/secureVault';

/**
 * SECURE-SESSION-AND-COOKIE-ARMOR: Güvenli Ödeme Formu
 *
 * Bu bileşen PCI-DSS uyumlu güvenli kart girişi sağlar:
 * - Kart numarası, CVV ve son kullanma tarihi ASLA localStorage/cookie'ye yazılmaz
 * - Kart numarası anında maskelenerek gösterilir
 * - Ödeme onaylandığında sadece ödeme sağlayıcısının token'ı saklanır
 * - Gerçek senaryoda Stripe Elements veya İyzico JS SDK kullanılmalıdır
 */

interface SecurePaymentFormProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SecurePaymentForm({ amount, onSuccess, onCancel }: SecurePaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showCvv, setShowCvv] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Temel doğrulama
    const rawDigits = cardNumber.replace(/\s/g, '');
    if (rawDigits.length < 16) {
      setError('Geçerli bir kart numarası giriniz.');
      return;
    }

    setIsProcessing(true);

    try {
      // GÜVENLIK: Kart verilerini sunucuya ASLA plain-text göndermiyoruz.
      // Gerçek uygulamada burada Stripe.js / İyzico tokenize() çağrısı yapılır.
      // Token gelir, biz sadece token'ı saklarız.
      const mockToken = `pi_${Date.now()}_tok_${rawDigits.slice(-4)}`;
      storePaymentToken(mockToken); // Sadece token — kart bilgisi hiç tutulmaz

      // Simülasyon
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Başarılı: formu temizle (hassas veri bellekte de kalmasın)
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setCardHolder('');

      onSuccess();
    } catch {
      setError('Ödeme işlemi başarısız. Lütfen tekrar deneyiniz.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
      {/* Güvenlik Rozeti */}
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
        <svg width="16" height="16" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span className="text-xs font-bold text-emerald-700">256-bit SSL şifreli güvenli ödeme. Kart bilgileri sunucularımızda saklanmaz.</span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold border border-red-100">
          {error}
        </div>
      )}

      {/* Kart Sahibi */}
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Kart Üzerindeki İsim</label>
        <input
          type="text"
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
          placeholder="AD SOYAD"
          autoComplete="cc-name"
          required
          className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-bold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 transition-all tracking-widest"
        />
      </div>

      {/* Kart Numarası — Anında Formatlı ve Maskelenmiş */}
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Kart Numarası</label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
            placeholder="**** **** **** ****"
            autoComplete="cc-number"
            required
            maxLength={19}
            className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-mono font-bold rounded-xl px-4 py-3 pr-14 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 transition-all tracking-widest text-lg"
          />
          {/* Kart Ağı İkonu */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
              <rect width="28" height="20" rx="3" fill="#E8E8E8"/>
              <circle cx="11" cy="10" r="6" fill="#EB001B" opacity="0.9"/>
              <circle cx="17" cy="10" r="6" fill="#F79E1B" opacity="0.9"/>
            </svg>
          </div>
        </div>
        {/* Maskelenmiş önizleme */}
        {cardNumber.replace(/\s/g, '').length >= 4 && (
          <p className="text-[10px] font-bold text-gray-400 mt-1 ml-1 font-mono">
            Güvenli Görünüm: {maskCardNumber(cardNumber)}
          </p>
        )}
      </div>

      {/* Son Kullanma + CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Son Kullanma</label>
          <input
            type="text"
            inputMode="numeric"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
            placeholder="AA/YY"
            autoComplete="cc-exp"
            required
            maxLength={5}
            className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-mono font-bold rounded-xl px-4 py-3 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 transition-all tracking-widest"
          />
        </div>
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
            CVV
            <span className="ml-1 text-gray-400 text-[9px] font-medium">(Arka yüzdeki 3 hane)</span>
          </label>
          <div className="relative">
            <input
              type={showCvv ? 'text' : 'password'}
              inputMode="numeric"
              value={cvv}
              onChange={(e) => setCvv(formatCvvInput(e.target.value))}
              placeholder="•••"
              autoComplete="cc-csc"
              required
              maxLength={4}
              className="w-full bg-slate-50 border border-gray-200 text-slate-800 font-mono font-bold rounded-xl px-4 py-3 pr-10 outline-none focus:border-[#008cb3] focus:ring-2 focus:ring-[#008cb3]/20 transition-all tracking-widest"
            />
            <button
              type="button"
              onClick={() => setShowCvv(!showCvv)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showCvv ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Ödeme Butonu */}
      <button
        type="submit"
        disabled={isProcessing}
        className={`w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 text-lg ${isProcessing ? 'opacity-75 cursor-wait' : 'active:scale-95'}`}
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Ödeme İşleniyor...
          </>
        ) : (
          <>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            {amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} Güvenli Öde
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-gray-400 font-bold py-2 text-sm hover:text-gray-600 transition-colors"
      >
        İptal
      </button>
    </form>
  );
}
