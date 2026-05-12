'use client';

/**
 * GlobalImageFallback
 * Registers a global `error` event on all <img> tags.
 * When a broken image is detected, replaces it with the Tourkia placeholder.
 */
export default function GlobalImageFallback() {
  if (typeof window === 'undefined') return null;

  // SVG placeholder — inline so no network request needed
  const placeholder = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#0B132B"/>
      <rect x="220" y="140" width="160" height="120" rx="16" fill="#008cb3" opacity="0.15"/>
      <text x="300" y="175" text-anchor="middle" fill="#008cb3" font-family="system-ui,sans-serif" font-weight="900" font-size="28" letter-spacing="-1">Tour</text>
      <text x="300" y="205" text-anchor="middle" fill="#38bdf8" font-family="system-ui,sans-serif" font-weight="900" font-size="28" letter-spacing="-1">kia</text>
      <text x="300" y="240" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="13" font-weight="600">Görsel yüklenemedi</text>
      <circle cx="300" cy="285" r="3" fill="#008cb3" opacity="0.6"/>
      <circle cx="315" cy="285" r="3" fill="#008cb3" opacity="0.4"/>
      <circle cx="285" cy="285" r="3" fill="#008cb3" opacity="0.4"/>
    </svg>
  `)}`;

  const handleError = (e: Event) => {
    const img = e.target as HTMLImageElement;
    if (img && img.tagName === 'IMG') {
      // Prevent infinite loop if placeholder itself fails
      if (img.src !== placeholder) {
        img.src = placeholder;
        img.style.objectFit = 'contain';
        img.style.background = '#0B132B';
      }
    }
  };

  document.addEventListener('error', handleError, true);
  return null;
}
