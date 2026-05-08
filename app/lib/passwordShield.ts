/**
 * GLOBAL-CREDENTIAL-STUFFING-SHIELD
 * Sızdırılmış Şifre ve Kimlik Hırsızlığı Kalkanı
 * 
 * Have I Been Pwned (HIBP) k-Anonymity API entegrasyonu.
 */

/**
 * Şifrenin sızdırılıp sızdırılmadığını kontrol eder.
 * Privacy-preserving: Şifrenin tamamı asla gönderilmez, sadece SHA-1 özetinin ilk 5 karakteri gönderilir.
 */
export async function isPasswordPwned(password: string): Promise<{ pwned: boolean; count: number }> {
    if (!password) return { pwned: false, count: 0 };

    try {
        // 1. Şifrenin SHA-1 özetini hesapla
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const prefix = hashHex.substring(0, 5);
        const suffix = hashHex.substring(5);

        // 2. HIBP API'ye ilk 5 karakteri gönder
        // API, bu prefix ile eşleşen tüm hash'lerin suffix listesini döner.
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        
        if (!response.ok) {
            console.warn('[PWNED-SHIELD] HIBP API bağlantı hatası.');
            return { pwned: false, count: 0 };
        }

        const body = await response.text();
        const lines = body.split('\n');

        // 3. Gelen listede kendi suffix'imizi ara
        for (const line of lines) {
            const [hashSuffix, count] = line.trim().split(':');
            if (hashSuffix === suffix) {
                return { pwned: true, count: parseInt(count, 10) };
            }
        }

        return { pwned: false, count: 0 };
    } catch (error) {
        console.error('[PWNED-SHIELD] Hata:', error);
        return { pwned: false, count: 0 };
    }
}
