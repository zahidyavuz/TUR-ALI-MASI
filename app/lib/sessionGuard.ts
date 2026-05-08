/**
 * SESSION-ANOMALY-AND-HIJACK-DETECTION
 * Oturum Çalma ve Anomali Dedektörü
 * 
 * "Fiziksel olarak imkansız yer değiştirmeleri (Impossible Travel) engelle."
 */

interface SessionMetadata {
    sessionId: string;
    userId: number;
    lastIp: string;
    lastCountry: string;
    lastCity: string;
    lastSeen: number; // Unix ms
    isFrozen: boolean;
}

// In-memory session store (Redis in production)
const activeSessions = new Map<string, SessionMetadata>();

/**
 * IP'den lokasyon tahmini yapar (Mock / Demo).
 * Üretimde: MaxMind GeoIP veya ipapi.co gibi servisler kullanılır.
 */
async function getGeoFromIP(ip: string): Promise<{ country: string; city: string }> {
    // Demo verileri
    if (ip === '127.0.0.1' || ip.startsWith('192.168.')) {
        return { country: 'TR', city: 'Istanbul' };
    }
    
    // Rusya/Çin simülasyonu için özel IP'ler
    if (ip.startsWith('95.')) return { country: 'RU', city: 'Moscow' };
    if (ip.startsWith('103.')) return { country: 'CN', city: 'Beijing' };
    
    return { country: 'TR', city: 'Istanbul' };
}

/**
 * Oturum anomalisi kontrolü yapar.
 * "Impossible Travel" algoritması:
 * Mesafe / Zaman > İnsan hızı ise Anomali vardır.
 */
export async function validateSessionIntegrity(
    sessionId: string, 
    userId: number, 
    currentIp: string
): Promise<{ valid: boolean; reason?: string }> {
    const now = Date.now();
    const currentGeo = await getGeoFromIP(currentIp);
    const existing = activeSessions.get(sessionId);

    if (!existing) {
        // Yeni oturum kaydı
        activeSessions.set(sessionId, {
            sessionId,
            userId,
            lastIp: currentIp,
            lastCountry: currentGeo.country,
            lastCity: currentGeo.city,
            lastSeen: now,
            isFrozen: false
        });
        return { valid: true };
    }

    if (existing.isFrozen) {
        return { valid: false, reason: 'Güvenlik sebebiyle dondurulmuş oturum.' };
    }

    // --- ANOMALİ KONTROLÜ (Impossible Travel) ---
    const timeDiffMinutes = (now - existing.lastSeen) / (1000 * 60);
    
    // Ülke değişmişse ve süre çok kısaysa (Örn: < 30 dk)
    if (existing.lastCountry !== currentGeo.country && timeDiffMinutes < 30) {
        // ANOMALİ TESPİT EDİLDİ!
        existing.isFrozen = true;
        
        // Audit Log'a bildir (Server-side simulation)
        console.error(`[SESSION-HIJACK] KRİTİK ALARM!`);
        console.error(`User: ${userId} | Önceki: ${existing.lastCountry} | Yeni: ${currentGeo.country} | Süre: ${Math.round(timeDiffMinutes)}dk`);
        
        // E-posta gönderim simülasyonu
        console.log(`[MAIL] To: user_${userId}@tourkia.com | Subject: Güvenlik Uyarısı: Farklı bir ülkeden erişim saptandı!`);

        return { 
            valid: false, 
            reason: `Fiziksel olarak imkansız yer değişimi saptandı (${existing.lastCountry} -> ${currentGeo.country}). Hesabınız donduruldu.` 
        };
    }

    // Oturumu güncelle
    existing.lastIp = currentIp;
    existing.lastCountry = currentGeo.country;
    existing.lastCity = currentGeo.city;
    existing.lastSeen = now;
    
    return { valid: true };
}

/**
 * Belirli bir kullanıcının tüm oturumlarını kapatır (Kill Switch).
 */
export function killAllUserSessions(userId: number): void {
    for (const [sid, session] of activeSessions.entries()) {
        if (session.userId === userId) {
            activeSessions.delete(sid);
        }
    }
}

/**
 * Oturumu dondurur (Audit Log tetikleyebilir).
 */
export function freezeSession(sessionId: string): void {
    const session = activeSessions.get(sessionId);
    if (session) session.isFrozen = true;
}
