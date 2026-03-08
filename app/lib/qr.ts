/**
 * Bilet doğrulama için QR kod üretir (Data URL).
 * Sadece tarayıcıda kullanın (Offline indir butonu).
 */

import QRCode from 'qrcode';

export interface QrPayload {
  ref: string;
  tourId: string;
  t: number;
}

export function encodePayload(ref: string, tourId: string): string {
  const payload: QrPayload = { ref, tourId, t: Date.now() };
  return JSON.stringify(payload);
}

export async function generateTicketQrDataUrl(ref: string, tourId: string): Promise<string> {
  const data = encodePayload(ref, tourId);
  return QRCode.toDataURL(data, {
    width: 280,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}
