/**
 * SECURE-STATIC-QR-GENERATOR
 * 
 * 88. BÖLÜM: Static-Base64-QR-Rendering
 * ÖNEMLİ: QR kodları oluştururken dış API (Google Chart vb.) KULLANILMAZ.
 * Kodlar doğrudan saf Base64 Data URL olarak bu kütüphane üzerinden üretilir.
 * Bu sayede biletler uçak modunda/çevrimdışı saniyeler içinde görüntülenebilir.
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
