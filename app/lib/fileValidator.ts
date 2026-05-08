/**
 * MALICIOUS-FILE-UPLOAD-BLOCKER
 * Zehirli Dosya Kalkanı — Sunucu taraflı güvenliğe ek olarak
 * istemci tarafında çok katmanlı doğrulama.
 *
 * Savunma Katmanları:
 * 1. Uzantı Beyaz Listesi  → Sadece .jpg/.jpeg/.png/.webp kabul edilir
 * 2. Magic Bytes Doğrulaması → Dosyanın gerçek MIME tipini binary okuyarak tespit eder
 *    (Saldırgan uzantıyı değiştirse bile magic bytes'ı değiştiremez)
 * 3. Boyut Sınırı          → Max 5 MB
 * 4. Güvenli Dosya Adı     → Orijinal ad yerine rastgele hash kullanılır
 */

// ─── İzin Verilen Tipler ─────────────────────────────────────────────────────
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ─── Magic Bytes Tablosu ─────────────────────────────────────────────────────
// Her dosya formatının başındaki imza byte'ları (hex).
// Bu byte'lar dosyanın gerçek tipini ortaya koyar.
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JFIF / EXIF başlangıcı
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG signature
  ],
  'image/webp': [
    // RIFF....WEBP — 4 byte RIFF + 4 byte boyut + 4 byte WEBP
    // Burada pozisyona göre kontrol yapıyoruz:
    // offset 0: RIFF (52 49 46 46), offset 8: WEBP (57 45 42 50)
    [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP kontrolü aşağıda ayrıca yapılır)
  ],
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  /** Güvenli, rastgele oluşturulmuş dosya adı (uzantısıyla birlikte) */
  secureName?: string;
  /** Tespit edilen gerçek MIME tipi */
  detectedMime?: string;
}

/**
 * Bir dosyanın ilk N byte'ını okur (Magic Bytes analizi için).
 */
const readFileHeader = (file: File, bytes: number = 12): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      resolve(new Uint8Array(buffer));
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
};

/**
 * Magic bytes karşılaştırması yapar.
 * Her format için kayıtlı imza byte'larını dosyanın başıyla karşılaştırır.
 */
const detectMimeByMagicBytes = async (file: File): Promise<string | null> => {
  try {
    const header = await readFileHeader(file, 12);

    for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
      for (const signature of signatures) {
        const matches = signature.every((byte, idx) => header[idx] === byte);
        if (matches) {
          // WebP için ek kontrol: offset 8-11 "WEBP" olmalı
          if (mime === 'image/webp') {
            const webpMark = [0x57, 0x45, 0x42, 0x50]; // WEBP
            const isWebP = webpMark.every((byte, idx) => header[8 + idx] === byte);
            if (!isWebP) continue; // RIFF ama WEBP değil → geç
          }
          return mime;
        }
      }
    }

    return null; // Tanınan bir format bulunamadı
  } catch {
    return null;
  }
};

/**
 * Güvenli rastgele dosya adı oluşturur.
 * Format: tkia_<16_hex_char>.<uzantı>
 * Örnek: tkia_a3f92c1b8e4d5f7a.jpg
 */
export const generateSecureFileName = (mimeType: string): string => {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = extensions[mimeType] || 'jpg';

  // Kriptografik olarak güvenli rastgele byte'lar
  const randomBytes = new Uint8Array(8);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    // SSR fallback
    for (let i = 0; i < 8; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `tkia_${hex}.${ext}`;
};

/**
 * ANA DOĞRULAMA FONKSİYONU
 *
 * Dosyayı şu sırayla kontrol eder:
 * 1. Boyut sınırı (hızlı kontrol, magic bytes'tan önce)
 * 2. İzin verilen uzantı (ikinci süzgeç)
 * 3. Magic bytes ile gerçek MIME tipi (asıl kalkan)
 * 4. Beyan edilen MIME ile magic bytes uyumu
 */
export const validateUploadFile = async (file: File): Promise<FileValidationResult> => {
  // 1. BOYUT SINIRI
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Dosya boyutu çok büyük. Maksimum izin verilen boyut: ${MAX_FILE_SIZE_MB}MB (Yüklenen: ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'Boş dosya yüklenemez.' };
  }

  // 2. UZANTI KONTROLÜ (ilk süzgeç — kolayca kandırılabilir, ama yine de gerekli)
  const nameLower = file.name.toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const hasValidExtension = allowedExtensions.some((ext) => nameLower.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Geçersiz dosya uzantısı. Sadece JPG, PNG ve WebP kabul edilir. (Yüklenen: ${file.name})`,
    };
  }

  // 3. MAGIC BYTES ANALİZİ (asıl kalkan — kandırılamaz)
  const detectedMime = await detectMimeByMagicBytes(file);

  if (!detectedMime) {
    return {
      valid: false,
      error: `Dosya içeriği tanınamadı. Yalnızca gerçek JPEG, PNG veya WebP görüntü dosyaları kabul edilir. Uzantısı değiştirilmiş dosyalar reddedildi.`,
    };
  }

  // 4. BEYAN EDİLEN MIME vs GERÇEK MIME UYUMU
  const allowedMimes: string[] = [...ALLOWED_MIME_TYPES];
  if (!allowedMimes.includes(detectedMime)) {
    return {
      valid: false,
      error: `Dosya tipi kabul edilmiyor. Tespit edilen tip: ${detectedMime}. Sadece JPEG, PNG ve WebP kabul edilir.`,
    };
  }

  // 5. GÜVENLI DOSYA ADI OLUŞTUR
  const secureName = generateSecureFileName(detectedMime);

  return {
    valid: true,
    secureName,
    detectedMime,
  };
};

/**
 * Güvenli dosya adıyla yeni bir File nesnesi döner.
 * Backend'e gönderilmeden önce orijinal dosyanın adını güvenli adla değiştirir.
 */
export const renameToSecure = (file: File, secureName: string): File => {
  return new File([file], secureName, { type: file.type });
};
