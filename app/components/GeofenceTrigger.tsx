'use client';

import { useGeofence } from '../context/GeofenceContext';

interface GeofenceTriggerProps {
  className?: string;
  /** Navbar vb. yerde kullanılıyorsa compact görünüm */
  compact?: boolean;
  /** Metin etiketini göster/gizle */
  showLabel?: boolean;
}

export default function GeofenceTrigger({ className = '', compact, showLabel = true }: GeofenceTriggerProps) {
  const { permission, nearby, isLoading, error, startWatching } = useGeofence();

  if (permission === 'denied' || permission === 'unsupported') return null;

  const handleClick = () => {
    if (permission === 'prompt' || !nearby) startWatching();
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label="Yakınımdaki turları göster"
        className={`flex items-center gap-1.5 text-gray-600 hover:text-[#008cb3] transition text-sm font-medium disabled:opacity-60 ${className}`}
      >
        <span aria-hidden>📍</span>
        {showLabel && <span>{isLoading ? 'Konum alınıyor...' : 'Yakınımdaki turlar'}</span>}
      </button>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-xl transition disabled:opacity-70"
      >
        <span aria-hidden>📍</span>
        {showLabel && (isLoading ? 'Konum alınıyor...' : 'Yakınımdaki turlar')}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
