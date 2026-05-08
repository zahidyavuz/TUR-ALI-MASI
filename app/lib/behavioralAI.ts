/**
 * BEHAVIORAL-BIOMETRICS-AI-CHECK
 * Yapay Zeka Destekli Davranış Analizi
 * 
 * "İnsan gibi davranmayan botları saptan ve gölgeye göm."
 */

interface BehavioralTelemetry {
    mousePaths: { x: number; y: number; t: number }[];
    clickIntervals: number[];
    scrollRhythm: number[];
    timeOnPage: number;
}

/**
 * Davranış verilerini analiz eder ve "Bot Skoru" üretir.
 */
export function analyzeBehavior(telemetry: BehavioralTelemetry): { isBot: boolean; score: number; reasons: string[] } {
    let botScore = 0;
    const reasons: string[] = [];

    // 1. Fare Hareket Analizi (Mouse Path Linearity)
    // Botlar genelde kavis çizmez, direkt (Lineer) hedefe gider.
    if (telemetry.mousePaths.length > 5) {
        let straightLines = 0;
        for (let i = 2; i < telemetry.mousePaths.length; i++) {
            const p1 = telemetry.mousePaths[i-2];
            const p2 = telemetry.mousePaths[i-1];
            const p3 = telemetry.mousePaths[i];
            
            // Eğim değişimi kontrolü (Sıfıra yakınsa dümdüz gidiyordur)
            const slope1 = (p2.y - p1.y) / (p2.x - p1.x || 1);
            const slope2 = (p3.y - p2.y) / (p3.x - p2.x || 1);
            
            if (Math.abs(slope1 - slope2) < 0.01) straightLines++;
        }
        
        if (straightLines / telemetry.mousePaths.length > 0.8) {
            botScore += 40;
            reasons.push('Anormal derecede lineer fare hareketleri.');
        }
    }

    // 2. Tıklama Ritmi (Click Rhythm)
    // Milisaniyesi milisaniyesine aynı olan tıklamalar bot işaretidir.
    if (telemetry.clickIntervals.length >= 3) {
        const variances = [];
        for (let i = 1; i < telemetry.clickIntervals.length; i++) {
            variances.push(Math.abs(telemetry.clickIntervals[i] - telemetry.clickIntervals[i-1]));
        }
        
        const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
        if (avgVariance < 50) { // 50ms'den az sapma imkansızdır (insan için)
            botScore += 30;
            reasons.push('Mekanik tıklama ritmi saptandı.');
        }
    }

    // 3. Scroll Analizi
    if (telemetry.scrollRhythm.length > 0 && telemetry.scrollRhythm.every(v => v === telemetry.scrollRhythm[0])) {
        botScore += 20;
        reasons.push('Sabit hızlı kaydırma (Auto-scroll).');
    }

    return {
        isBot: botScore >= 60,
        score: botScore,
        reasons
    };
}

/**
 * Shadowban durumunu kontrol eder.
 */
export function isShadowBanned(userId: string): boolean {
    // Üretimde Redis'ten 'shadowbanned_ips' veya 'shadowbanned_users' kontrolü yapılır.
    return false; 
}
