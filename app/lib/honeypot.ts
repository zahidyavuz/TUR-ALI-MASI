/**
 * ACTIVE-HONEYPOT-TRAPS
 * Siber Kapanlar ve Bal Küpü Sistemi
 * 
 * "Saldırganı kapana kısalt ve saniyeler içinde süresiz engelle."
 */

interface HoneypotIncident {
    ip: string;
    userAgent: string;
    trapId: string;
    timestamp: string;
}

// In-memory ban list (Redis in production for persistence across instances)
const bannedIps = new Set<string>();
const incidents: HoneypotIncident[] = [];

/**
 * Bir IP'nin yasaklı olup olmadığını kontrol eder.
 */
export function isIpBanned(ip: string): boolean {
    return bannedIps.has(ip);
}

/**
 * Saldırganı kapana kısaltır ve banlar.
 */
export function triggerTrap(ip: string, userAgent: string, trapId: string): void {
    if (!bannedIps.has(ip)) {
        bannedIps.add(ip);
        incidents.push({
            ip,
            userAgent,
            trapId,
            timestamp: new Date().toISOString()
        });
        
        console.error(`[HONEYPOT-ALERT] SALDIRGAN YAKALANDI!`);
        console.error(`IP: ${ip} | Tuzak: ${trapId} | Durum: SÜRESİZ BANLANDI`);
    }
}

/**
 * Tüm banlı IP'leri listeler.
 */
export function getBannedIps(): string[] {
    return Array.from(bannedIps);
}

/**
 * Tüm olayları listeler.
 */
export function getHoneypotIncidents(): HoneypotIncident[] {
    return [...incidents].reverse();
}

/**
 * Bir IP'nin banını kaldırır.
 */
export function unbanIp(ip: string): void {
    bannedIps.delete(ip);
}
