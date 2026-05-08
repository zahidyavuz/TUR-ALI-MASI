import DOMPurify from 'isomorphic-dompurify';

/**
 * ZEROTRUST: Uygulamaya giren hiçbir string'e güvenilmez.
 * 
 * Bu yardımcı fonksiyonlar (helpers), dış dünyadan gelen ve API'ye 
 * gönderilecek (veya ekranda gösterilecek) kullanıcı girişlerini,
 * XSS ve SQL Injection gibi siber tehditlere karşı filtreler ve temizler.
 */

// XSS Koruması - Zararlı HTML/JS kodlarını temizler.
export const sanitizeHtml = (dirty: string): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty);
};

// SQL Injection Önlemi (Temel Karakter Filtrelemesi)
// SQLi genelde backend'de çözülür ama frontend Zero-Trust gereği
// bazı noktalama ve kontrol karakterlerini baştan kırpabiliriz.
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  let cleaned = input;
  
  // 1. Temel XSS temizliği yap (Eğer kullanıcı <script> girmeye çalışırsa)
  cleaned = sanitizeHtml(cleaned);
  
  // 2. Tehlikeli karakterleri veya sekansları filtrele (Temel SQLi & Command Injection önlemleri)
  // Tek tırnak ('), çift tırnak ("), noktalı virgül (;) ve bazı meta karakterleri escape et/kaldır
  cleaned = cleaned.replace(/[;"'\\]/g, ''); 
  
  // 3. Çoklu boşlukları temizle
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  
  return cleaned;
};

// Sadece Harf ve Rakam (Örn: Kullanıcı Adı veya ID gibi alanlar için çok sıkı kural)
export const sanitizeStrict = (input: string): string => {
  if (!input) return '';
  return input.replace(/[^a-zA-Z0-9\s]/g, '').trim();
};

/**
 * Fetch Wrapper Interceptor
 * Gelen payload (body) içerisindeki stringleri otomatik sanitize eder
 */
export const sanitizePayload = (payload: any): any => {
    if (payload === null || payload === undefined) return payload;

    if (typeof payload === 'string') {
        return sanitizeInput(payload);
    }

    if (Array.isArray(payload)) {
        return payload.map(item => sanitizePayload(item));
    }

    if (typeof payload === 'object') {
        const sanitizedObj: any = {};
        for (const key in payload) {
            if (Object.prototype.hasOwnProperty.call(payload, key)) {
                // Şifre alanlarını sanitize etme (Şifrede özel karakter olmalıdır)
                if (key.toLowerCase().includes('password')) {
                    sanitizedObj[key] = payload[key];
                } else {
                    sanitizedObj[key] = sanitizePayload(payload[key]);
                }
            }
        }
        return sanitizedObj;
    }

    return payload;
};
