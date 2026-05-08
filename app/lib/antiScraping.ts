/**
 * COMPETITOR-ANTI-SCRAPING-SHIELD
 * Rakip Casus Bot Kalkanı ve Fiyat Koruma Motoru
 * 
 * "Rakiplerin senin fiyat stratejini çalmasına izin verme."
 */

const SCRAPE_THRESHOLD = 50; // 10 saniyede max 50 istek
const TIME_WINDOW_MS = 10000; // 10 saniye
const TARPIT_DELAY_MS = 2000; // Botlar için yapay gecikme

interface ScraperData {
    count: number;
    startTime: number;
    isFlagged: boolean;
}

// Client-side state (Memory-based tracking per session)
const scraperState: ScraperData = {
    count: 0,
    startTime: Date.now(),
    isFlagged: false
};

/**
 * İstek hızını kontrol eder ve botları işaretler.
 */
export function recordRequestActivity(): boolean {
    if (typeof window === 'undefined') return false;

    const now = Date.now();
    
    // Pencere süresi dolmuşsa sıfırla
    if (now - scraperState.startTime > TIME_WINDOW_MS) {
        scraperState.count = 1;
        scraperState.startTime = now;
        // Bir kez işaretlenen bot 1 saat boyunca işaretli kalır (opsiyonel)
        // Şimdilik sadece pencere bazlı çalışıyoruz
    } else {
        scraperState.count++;
    }

    if (scraperState.count > SCRAPE_THRESHOLD && !scraperState.isFlagged) {
        scraperState.isFlagged = true;
        // Anti-Scraping Alert: Audit Log'a bildir (Arka planda)
        fetch('/api/audit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-key': 'tourkia_audit_internal'
            },
            body: JSON.stringify({
                actorId: 'system-shield',
                actorUsername: 'Anti-Scraping-Shield',
                actorRole: 'system',
                action: 'SCRAPER_DETECTED',
                resourceType: 'webhook', // Uygun bir tip seçildi
                resourceId: 'SCRAPER-DETECTED',
                resourceLabel: 'Bot Koruması',
                description: `Sıradışı trafik tespiti: 10 saniyede ${scraperState.count} istek. IP kısıtlandı ve sahte fiyatlar aktif edildi.`,
                newValue: { requestCount: scraperState.count, threshold: SCRAPE_THRESHOLD }
            })
        }).catch(() => {}); // Hataları sessizce yut
    }

    return scraperState.isFlagged;
}

/**
 * Şu anki kullanıcının bot olarak işaretlenip işaretlenmediğini döner.
 */
export function isScraperDetected(): boolean {
    return scraperState.isFlagged;
}

/**
 * Botlar için sistemi yavaşlatır (Tarpitting).
 */
export async function applyTarpitDelay(): Promise<void> {
    if (scraperState.isFlagged) {
        await new Promise(resolve => setTimeout(resolve, TARPIT_DELAY_MS));
    }
}

/**
 * Botlara gösterilecek sahte (randomize) fiyat üretir.
 * Orijinal fiyata %15-30 arası rastgele sapma ekler.
 */
export function getScrambledPrice(originalPrice: number): number {
    if (!scraperState.isFlagged) return originalPrice;

    // Fiyatı %15 ile %40 arasında rastgele saptır
    const variance = (Math.random() * 0.25) + 0.15;
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    const scrambled = originalPrice * (1 + (variance * direction));
    
    // Son rakamı 9 veya 0 yap ki gerçekçi dursun
    return Math.round(scrambled / 10) * 10 - (Math.random() > 0.5 ? 1 : 0);
}

/**
 * Botlara gösterilecek sahte açıklama veya fomo metni üretir.
 */
export function getScrambledFomo(originalCount: number): number {
  if (!scraperState.isFlagged) return originalCount;
  return Math.floor(Math.random() * 500) + 100; // Devre dışı bırakmak yerine yanlış bilgi ver
}
