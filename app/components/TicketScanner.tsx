'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchAPI } from '@/app/lib/api';

/**
 * Bilet doğrulama (check-in) tarayıcısı.
 *
 * Kod okutulduğunda `POST /agency/bookings/<booking_ref>/checkin/` çağrılır;
 * karar tamamen backend'indir. Kamera desteği tarayıcıya bağlıdır: yerleşik
 * `BarcodeDetector` varsa QR canlı okunur, yoksa elle kod girişi tek yoldur —
 * çalışmayan bir kamera arayüzü göstermiyoruz.
 */

type Outcome = 'ok' | 'already_checked_in' | 'not_found' | 'not_confirmed' | 'wrong_date' | 'error';

interface Booking {
  booking_ref: string;
  passenger: string;
  guests: number;
  service_title: string;
  start_date: string | null;
  start_time: string | null;
  checked_in_at: string | null;
}

interface Result {
  reason: Outcome;
  message: string;
  booking?: Booking;
}

const OUTCOME: Record<Outcome, { title: string; panel: string; badge: string; icon: string; vibrate: number[] }> = {
  ok: {
    title: 'ONAYLANDI',
    panel: 'bg-emerald-600 border-emerald-500',
    badge: 'text-emerald-600',
    icon: '✅',
    vibrate: [120],
  },
  already_checked_in: {
    title: 'ÇİFT OKUTMA',
    panel: 'bg-amber-500 border-amber-400',
    badge: 'text-amber-600',
    icon: '⚠️',
    vibrate: [80, 60, 80, 60, 80],
  },
  wrong_date: {
    title: 'TARİH UYUŞMUYOR',
    panel: 'bg-orange-600 border-orange-500',
    badge: 'text-orange-600',
    icon: '📅',
    vibrate: [200, 80, 200],
  },
  not_confirmed: {
    title: 'BİLET GEÇERSİZ',
    panel: 'bg-red-600 border-red-500',
    badge: 'text-red-600',
    icon: '⛔',
    vibrate: [300],
  },
  not_found: {
    title: 'BİLET BULUNAMADI',
    panel: 'bg-red-600 border-red-500',
    badge: 'text-red-600',
    icon: '❌',
    vibrate: [300],
  },
  error: {
    title: 'BAĞLANTI HATASI',
    panel: 'bg-slate-700 border-slate-600',
    badge: 'text-slate-600',
    icon: '📡',
    vibrate: [60, 60, 60],
  },
};

function vibrate(pattern: number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

interface Props {
  title: string;
  subtitle: string;
}

export default function TicketScanner({ title, subtitle }: Props) {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [cameraState, setCameraState] = useState<'off' | 'starting' | 'on' | 'unsupported' | 'denied'>('off');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Aynı QR kamera önünde dururken saniyede onlarca kez okunur; son
  // gönderilen kodu tutup tekrarı bastırıyoruz.
  const lastSentRef = useRef<string>('');
  const checkingRef = useRef(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraState('off');
  }, []);

  const submit = useCallback(async (rawCode: string) => {
    const ref = rawCode.trim().toUpperCase();
    if (!ref || checkingRef.current) return;

    checkingRef.current = true;
    setChecking(true);
    try {
      const data = await fetchAPI(`/agency/bookings/${encodeURIComponent(ref)}/checkin/`, {
        method: 'POST',
        throwOnHttpError: true,
      });
      setResult({ reason: 'ok', message: data?.message ?? 'Bilet doğrulandı.', booking: data?.booking });
      vibrate(OUTCOME.ok.vibrate);
    } catch (err: any) {
      const reason: Outcome = err?.data?.reason ?? 'error';
      const known = reason in OUTCOME ? reason : 'error';
      setResult({
        reason: known,
        message: err?.data?.error || err?.message || 'Sunucuya ulaşılamadı.',
        booking: err?.data?.booking,
      });
      vibrate(OUTCOME[known].vibrate);
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
      setCameraState('unsupported');
      return;
    }
    setCameraState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('on');
    } catch {
      setCameraState('denied');
    }
  }, []);

  // Kamera açıkken kareleri tarar; okunan kod bir öncekinden farklıysa gönderir.
  useEffect(() => {
    if (cameraState !== 'on') return;
    let cancelled = false;
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

    const timer = window.setInterval(async () => {
      if (cancelled || !videoRef.current || checkingRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const value = codes?.[0]?.rawValue?.trim();
        if (value && value !== lastSentRef.current) {
          lastSentRef.current = value;
          setCode(value);
          submit(value);
        }
      } catch {
        // Tek bir karenin okunamaması normaldir; sessizce bir sonrakine geçilir.
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [cameraState, submit]);

  useEffect(() => stopCamera, [stopCamera]);

  const reset = () => {
    setResult(null);
    setCode('');
    lastSentRef.current = '';
  };

  const outcome = result ? OUTCOME[result.reason] : null;

  return (
    <div className="max-w-md mx-auto pb-10">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{title}</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm">{subtitle}</p>
      </div>

      {/* Sonuç ekranı */}
      {result && outcome && (
        <div className={`rounded-3xl border p-6 mb-6 text-white ${outcome.panel}`} role="status" aria-live="assertive">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{outcome.icon}</span>
            <h2 className="text-2xl font-black tracking-tight">{outcome.title}</h2>
          </div>
          <p className="font-semibold leading-snug">{result.message}</p>

          {result.booking && (
            <dl className="mt-4 bg-black/15 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="opacity-80">Misafir</dt>
                <dd className="font-bold text-right">{result.booking.passenger} ({result.booking.guests} kişi)</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="opacity-80">Hizmet</dt>
                <dd className="font-bold text-right">{result.booking.service_title}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="opacity-80">Bilet</dt>
                <dd className="font-mono font-bold text-right">{result.booking.booking_ref}</dd>
              </div>
            </dl>
          )}

          <button
            onClick={reset}
            className={`mt-5 w-full bg-white font-black py-3 rounded-xl uppercase tracking-widest text-sm ${outcome.badge}`}
          >
            Yeni Bilet Okut
          </button>
        </div>
      )}

      {/* Kamera */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 relative aspect-[4/5] flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${cameraState === 'on' ? '' : 'hidden'}`}
        />

        {cameraState === 'on' && (
          <div className="relative z-10 w-56 h-56 border-4 border-dashed border-white/70 rounded-3xl" aria-hidden />
        )}

        {cameraState !== 'on' && (
          <div className="text-center px-8">
            <div className="text-4xl mb-4">📷</div>
            {cameraState === 'unsupported' && (
              <p className="text-slate-300 font-semibold text-sm mb-4">
                Bu tarayıcı QR okumayı desteklemiyor. Bilet kodunu aşağıdan elle girebilirsiniz.
              </p>
            )}
            {cameraState === 'denied' && (
              <p className="text-slate-300 font-semibold text-sm mb-4">
                Kamera izni verilmedi. Tarayıcı ayarlarından izin verin veya kodu elle girin.
              </p>
            )}
            {cameraState === 'starting' && <p className="text-slate-300 font-semibold text-sm mb-4">Kamera açılıyor…</p>}
            {cameraState === 'off' && (
              <p className="text-slate-300 font-semibold text-sm mb-4">Misafirin biletindeki QR kodu okutun.</p>
            )}
            {(cameraState === 'off' || cameraState === 'denied') && (
              <button
                onClick={startCamera}
                className="bg-white text-slate-900 font-black px-6 py-3 rounded-xl uppercase tracking-widest text-xs"
              >
                Kamerayı Aç
              </button>
            )}
          </div>
        )}

        {cameraState === 'on' && (
          <button
            onClick={stopCamera}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-widest"
          >
            Kamerayı Kapat
          </button>
        )}
      </div>

      {/* Elle giriş */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
        }}
        className="mt-5"
      >
        <label htmlFor="ticket-ref" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Bilet kodunu elle girin
        </label>
        <div className="flex gap-2">
          <input
            id="ticket-ref"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Örn: A1B2C3D4"
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-3 outline-none focus:border-slate-500 font-mono font-bold text-center uppercase text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={checking || !code.trim()}
            className="bg-slate-900 dark:bg-slate-700 text-white font-black px-5 rounded-xl text-sm uppercase tracking-widest disabled:opacity-40"
          >
            {checking ? '…' : 'Doğrula'}
          </button>
        </div>
      </form>
    </div>
  );
}
