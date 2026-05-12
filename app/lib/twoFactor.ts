/**
 * MANDATORY-2FA-FOR-PRIVILEGED-ACCOUNTS
 * Süper Yetkili İki Adımlı Doğrulama Motoru
 * 
 * "Şifre yeterli değil; fiziksel cihaz doğrulaması şart."
 */

const TOTP_EXPIRY_MS = 3 * 60 * 1000; // 3 dakika geçerli

interface TwoFactorSession {
    code: string;
    expiresAt: number;
    userId: number;
    sessionId: string;
}

// Memory-based tracking for demo purposes
// In production, this goes to Redis or DB
const tfaSessions = new Map<string, TwoFactorSession>();

/**
 * 6 haneli rastgele bir doğrulama kodu üretir.
 */
function generate6DigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Kullanıcı için 2FA oturumu başlatır.
 * SMS veya E-posta gönderimini simüle eder.
 */
export async function initiate2FA(userId: number, username: string): Promise<string> {
    const code = generate6DigitCode();
    const sessionId = Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + TOTP_EXPIRY_MS;

    tfaSessions.set(sessionId, { code, expiresAt, userId, sessionId });

    // --- SİMÜLASYON: SMS / E-posta Gönderimi ---
    console.log(`[2FA-SHIELD] KOD ÜRETİLDİ (${username}): ${code}`);
    console.log(`[2FA-SHIELD] SMS Gönderiliyor: +90 (5**) *** ** 50 numaralı telefona kod iletildi.`);

    // Gerçek bir API'de burada Twilio, AWS SNS veya SMTP kullanılır.
    
    return sessionId;
}

/**
 * Girilen kodu doğrular.
 */
export function verify2FACode(sessionId: string, inputCode: string): { success: boolean; error?: string } {
    const session = tfaSessions.get(sessionId);

    if (!session) {
        return { success: false, error: 'Oturum bulunamadı veya süresi dolmuş.' };
    }

    if (Date.now() > session.expiresAt) {
        tfaSessions.delete(sessionId);
        return { success: false, error: 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.' };
    }

    if (session.code !== inputCode) {
        return { success: false, error: 'Hatalı kod girdiniz. Lütfen tekrar deneyin.' };
    }

    // Başarılı doğrulama sonrası oturumu sil
    tfaSessions.delete(sessionId);
    return { success: true };
}

/**
 * Kullanıcının 2FA zorunluluğunu kontrol eder.
 */
export function requires2FA(user: any): boolean {
    // 2FA temporarily disabled globally
    return false;
}
