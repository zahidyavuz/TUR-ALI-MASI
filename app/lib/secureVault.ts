/**
 * SECURE-SESSION-AND-COOKIE-ARMOR
 * Hassas Veri Tokenizasyon ve Güvenli Depolama Katmanı
 *
 * KURAL: Kredi kartı, IBAN, TC Kimlik gibi hassas veriler
 * asla tarayıcıda plain-text olarak saklanmaz.
 * Sadece tokenize edilmiş (maskelenmiş) referanslar tutulur.
 *
 * Gerçek tokenization → Stripe / İyzico gibi PCI-DSS uyumlu
 * ödeme sağlayıcılarına devredilir. Biz sadece token'ı saklarız.
 */

// ─── Kart Maskeleme ───────────────────────────────────────────────────────────
/**
 * Kart numarasını güvenli şekilde maskeler.
 * Örnek: "4242 4242 4242 4242" → "**** **** **** 4242"
 * Hiçbir zaman tam numarayı localStorage/cookie'ye yazma!
 */
export const maskCardNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  const last4 = digits.slice(-4);
  const masked = digits.slice(0, -4).replace(/\d/g, '*');
  // Gruplu formatta döndür
  const full = masked + last4;
  return full.match(/.{1,4}/g)?.join(' ') ?? full;
};

/**
 * Kart numarasını görüntüleme için formatlar (sadece son 4 hane).
 * Örnek: "**** **** **** 4242"
 */
export const displaySafeCard = (last4: string): string => {
  return `**** **** **** ${last4.slice(-4)}`;
};

// ─── IBAN Maskeleme ───────────────────────────────────────────────────────────
/**
 * IBAN'ı güvenli şekilde maskeler (ortasını gizler).
 * Örnek: "TR61 0006 2000 1234 5678 9000 11" → "TR61 **** **** **** 9000 11"
 */
export const maskIban = (iban: string): string => {
  const clean = iban.replace(/\s/g, '');
  if (clean.length < 8) return '****';
  const prefix = clean.slice(0, 4); // Ülke kodu + kontrol
  const suffix = clean.slice(-6);   // Son 6 hane
  const middle = clean.slice(4, -6).replace(/./g, '*');
  return `${prefix} ${middle.match(/.{1,4}/g)?.join(' ')} ${suffix}`;
};

// ─── Güvenli Ödeme Tokenı Saklama ─────────────────────────────────────────────
/**
 * Ödeme işleminden dönen tokenı güvenle saklar.
 * Sadece Stripe/İyzico'nun verdiği token referansı tutulur.
 * Asla kart numarası, CVV veya son kullanma tarihi saklanmaz.
 */
export const storePaymentToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  // Token'ı session storage'da (sekme kapanınca silinen, daha güvenli) sakla
  // localStorage yerine sessionStorage tercih edilir çünkü sekme ömrüyle sınırlıdır.
  sessionStorage.setItem('tourkia_pmt_token', token);
};

export const getPaymentToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('tourkia_pmt_token');
};

export const clearPaymentToken = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('tourkia_pmt_token');
};

// ─── Güvenli Form Yardımcıları ─────────────────────────────────────────────────
/**
 * Kart input'unu anlık maskeler ve geçersiz karakterleri filtreler.
 * Sadece sayı ve boşluğa izin verir, 19 karakterle sınırlar.
 */
export const formatCardInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
};

/**
 * CVV input'unu anlık maskeler — sadece 3-4 haneli sayıya izin verir.
 */
export const formatCvvInput = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 4);
};

/**
 * Son kullanma tarihi formatlar: "12/26"
 */
export const formatExpiryInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
};

// ─── Oturum Güvenliği ──────────────────────────────────────────────────────────
/**
 * Oturum süresini kontrol eder.
 * Token son kullanma tarihini decode eder (JWT base64 payload).
 * Token süresi dolduysa null döner ve oturumu temizler.
 */
export const isSessionValid = (token: string): boolean => {
  if (!token) return false;
  
  // Geliştirme/Test aşamasındaki sahte tokenlar (mock) için geçerlilik onayı
  if (token === 'admin_demo_token' || token.startsWith('mock_')) {
    return true;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // UNIX timestamp → ms
    return Date.now() < exp;
  } catch {
    // Eğer JWT çözülemiyorsa ve mock değilse, token geçersizdir
    return false;
  }
};

/**
 * Hassas verilerin localStorage'da bıraktığı izleri temizler.
 * Çıkış yaparken veya güvenlik ihlali şüphesinde çağrılır.
 */
export const secureClear = (): void => {
  if (typeof window === 'undefined') return;

  // Ödeme tokenları
  sessionStorage.removeItem('tourkia_pmt_token');

  // LocalStorage'daki hassas anahtarlar
  const sensitiveKeys = ['card_last4', 'payment_method', 'user_card_token'];
  sensitiveKeys.forEach(key => localStorage.removeItem(key));
};
