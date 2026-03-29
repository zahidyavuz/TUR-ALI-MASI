'use client';

import Link from 'next/link';
import { useGeofence } from '../context/GeofenceContext';

export default function GeofenceBanner() {
  const { nearby, bannerVisible, dismissBanner } = useGeofence();

  if (!nearby || !bannerVisible) return null;

  const { spot, distanceMeters } = nearby;
  const distanceText = distanceMeters < 100
    ? 'hemen yakınında'
    : `yaklaşık ${distanceMeters} metre yakınında`;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-[400px] z-[99998] animate-in slide-in-from-bottom-4 duration-300"
      role="alert"
    >
      <div className="bg-gradient-to-r from-[#008cb3] to-[#005e85] text-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0" aria-hidden>📍</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm leading-snug">
                Şu an {distanceText} katılabileceğin bir yürüyüş turu var!
              </p>
              <p className="text-white/95 text-sm mt-1 font-medium truncate">
                {spot.title}
              </p>
              <div className="flex gap-2 mt-3">
                <Link
                  href={`/tour/${spot.slug}`}
                  className="inline-flex items-center justify-center bg-white text-[#005e85] font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition shrink-0"
                >
                  Tura katıl
                </Link>
                <button
                  type="button"
                  onClick={dismissBanner}
                  className="text-white/80 hover:text-white text-sm font-medium underline"
                >
                  Kapat
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Bildirimi kapat"
              className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
