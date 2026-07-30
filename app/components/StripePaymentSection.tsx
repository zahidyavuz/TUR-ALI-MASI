'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';

/**
 * Stripe Elements tabanlı ödeme bölümü.
 *
 * Kart numarası / SKT / CVC alanları Stripe'ın iframe'lerinde tutulur;
 * bu veriler hiçbir zaman uygulamanın state'ine veya sunucularımıza girmez.
 *
 * `clientSecret` Django `POST /bookings/` tarafından oluşturulan
 * PaymentIntent'ten gelir. Onay `stripe.confirmPayment` ile yapılır ve
 * kullanıcı `returnUrl`'e yönlendirilir; rezervasyonun `confirmed` olması
 * Stripe webhook'una bağlıdır (asenkron).
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

interface StripePaymentSectionProps {
  /** Django'nun oluşturduğu PaymentIntent client secret'ı. */
  clientSecret: string;
  /** Tahsil edilecek tutar (TRY, ana birim) — yalnız buton metni için. */
  amount: number;
  /** Ödeme sonrası dönülecek mutlak URL. */
  returnUrl: string;
}

function PaymentFormInner({ amount, returnUrl }: Omit<StripePaymentSectionProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    // Başarılı olursa Stripe kullanıcıyı returnUrl'e yönlendirir ve bu
    // satırdan sonrası çalışmaz. Sadece hata durumunda geri döner.
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    setError(confirmError?.message || 'Ödeme tamamlanamadı, lütfen tekrar deneyin.');
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 shadow-xl backdrop-blur-sm">
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-sm font-bold">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={!stripe || isSubmitting}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white py-5 rounded-[20px] font-black transition-all shadow-[0_15px_35px_-5px_rgba(249,115,22,0.5)] active:scale-95 flex flex-col items-center justify-center gap-1.5 group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse shadow-[0_0_10px_rgba(110,231,183,0.8)]"></span>{' '}
            GÜVENLİ ÖDEME
          </span>
          <span className="text-2xl flex items-center gap-2" suppressHydrationWarning>
            {isSubmitting
              ? 'İşleniyor...'
              : amount.toLocaleString('tr-TR', {
                  style: 'currency',
                  currency: 'TRY',
                })}
            {!isSubmitting && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 group-hover:translate-x-1 transition-transform"
              >
                <path
                  fillRule="evenodd"
                  d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </span>
        </button>

        <p className="text-[10px] text-center font-bold text-slate-400 italic px-8 leading-relaxed">
          * Kart bilgileriniz doğrudan ödeme sağlayıcısına iletilir,
          sunucularımızda saklanmaz.
        </p>
      </div>
    </form>
  );
}

export default function StripePaymentSection({
  clientSecret,
  ...rest
}: StripePaymentSectionProps) {
  if (!stripePromise) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-5 rounded-2xl text-sm font-bold">
        Ödeme altyapısı yapılandırılmamış. Lütfen
        <code className="mx-1 font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>
        ortam değişkenini tanımlayın.
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: 'tr',
        appearance: { theme: 'stripe', variables: { borderRadius: '16px' } },
      }}
    >
      <PaymentFormInner {...rest} />
    </Elements>
  );
}
