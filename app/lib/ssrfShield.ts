/**
 * SSRF-AND-INTERNAL-NETWORK-MASKING (Next.js Kalkanı)
 * 
 * Sunucunun (Next.js API Routes / Server Actions) dışarıya yapacağı 
 * istekleri mühürler ve iç ağa sızmayı engeller.
 */

const ALLOWED_DOMAINS = [
  'api.stripe.com',
  'api.iyzipay.com',
  'api.paytr.com',
  'maps.googleapis.com',
  'storage.googleapis.com',
  's3.amazonaws.com',
  'images.unsplash.com',
  'upload.wikimedia.org',
  'localhost', // Sadece backend iletişimi için (Production'da kaldırılmalı veya IP bazlı kısıtlanmalı)
];

/**
 * Bir URL'nin güvenli olup olmadığını kontrol eder.
 */
export function validateExternalUrl(url: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    
    // 1. Protokol Kontrolü
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Sadece HTTP/HTTPS protokollerine izin verilir.' };
    }

    const hostname = parsed.hostname;

    // 2. İç Ağ IP Koruması (Localhost, Private IP, Metadata IP)
    const isInternal = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname === '0.0.0.0' ||
      hostname.startsWith('169.254.') || // Cloud Metadata
      hostname.startsWith('10.') ||      // Private Class A
      hostname.startsWith('192.168.') || // Private Class C
      hostname.startsWith('172.');       // Private Class B (Kabaca)

    // Not: Next.js API route kendi backend'ine (127.0.0.1) istek atabilir, 
    // ama kullanıcıdan gelen bir URL ile bunu yapmamalıdır.
    if (isInternal && !ALLOWED_DOMAINS.includes(hostname)) {
      return { safe: false, reason: 'İç ağ adreslerine erişim engellendi.' };
    }

    // 3. Domain Allowlist Kontrolü
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return { safe: false, reason: `Bilinmeyen dış kaynak engellendi: ${hostname}` };
    }

    return { safe: true };
  } catch (e) {
    return { safe: false, reason: 'Geçersiz URL formatı.' };
  }
}

/**
 * Güvenli fetch sarmalayıcısı.
 */
export async function safeFetch(url: string, options?: RequestInit) {
  const check = validateExternalUrl(url);
  if (!check.safe) {
    console.error(`[SSRF-SHIELD] Engellendi: ${url} | Sebep: ${check.reason}`);
    throw new Error(`Güvenlik Engeli: ${check.reason}`);
  }
  return fetch(url, options);
}
