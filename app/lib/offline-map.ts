/**
 * Çevrimdışı harita görseli: konum ve rota adımları için SVG placeholder.
 * İnternet olmadan gösterilir; isteğe bağlı olarak gerçek harita görseli cache'lenebilir.
 */

import type { ItineraryStep } from './offline-types';

export function createPlaceholderMapDataUrl(
  location: string,
  itinerary: ItineraryStep[],
  width = 400,
  height = 220
): string {
  const stops = itinerary.length || 3;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < stops; i++) {
    points.push({
      x: 40 + (width - 80) * (i / Math.max(stops - 1, 1)),
      y: 40 + (height - 80) * 0.3 + Math.sin((i / Math.max(stops - 1, 1)) * Math.PI) * 60,
    });
  }
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f0f9ff"/>
      <stop offset="100%" style="stop-color:#e0f2fe"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <path d="${pathD}" fill="none" stroke="#008cb3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${points
    .map(
      (p, i) =>
        `<circle cx="${p.x}" cy="${p.y}" r="10" fill="#008cb3" stroke="#fff" stroke-width="2"/>
         <text x="${p.x}" y="${p.y - 18}" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">${i + 1}</text>`
    )
    .join('')}
  <text x="${width / 2}" y="${height - 24}" text-anchor="middle" font-size="14" font-weight="600" fill="#475569">📍 ${escapeXml(location)}</text>
  <text x="${width / 2}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#94a3b8">Rota — Çevrimdışı kullanım için kaydedildi</text>
</svg>`.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
