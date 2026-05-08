/**
 * AUTOMATED-DEPENDENCY-AND-VULNERABILITY-GUARD
 * Yazılımsal Çürük Taraması ve Tedarik Zinciri Koruması
 * 
 * "Kullandığın kütüphanedeki açık, senin açığındır."
 */

export interface Vulnerability {
    id: string;
    package: string;
    version: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    title: string;
    description: string;
    fixVersion: string;
    publishedAt: string;
}

export interface SecurityReport {
    lastScan: string;
    totalPackages: number;
    vulnerabilities: Vulnerability[];
    criticalModeActive: boolean;
    score: number; // 0-100
}

/**
 * Bağımlılık taramasını simüle eder.
 * Production'da: 'npm audit --json' ve 'safety check --json' komutlarını çalıştırır.
 */
export async function runSecurityAudit(): Promise<SecurityReport> {
    // --- GERÇEK DÜNYA SİMÜLASYONU ---
    // Örn: Eski bir 'node-fetch' veya 'lodash' açığı varmış gibi davranalım.
    
    const mockVulnerabilities: Vulnerability[] = [
        {
            id: 'GHSA-r683-j2x4-v87g',
            package: 'isomorphic-dompurify',
            version: '3.12.0',
            severity: 'moderate',
            title: 'DOMPurify bypass via nesting',
            description: 'Certain nested structures can bypass sanitization rules.',
            fixVersion: '3.13.1',
            publishedAt: '2026-05-01T10:00:00Z'
        },
        // Eğer kritik bir açık eklersek sistem "Critical Mode"a geçer
        /*
        {
            id: 'CVE-2026-9999',
            package: 'stripe',
            version: '20.4.0',
            severity: 'critical',
            title: 'Remote Code Execution in Webhook Handler',
            description: 'Critical vulnerability allowing remote execution during signature verification.',
            fixVersion: '20.5.1',
            publishedAt: '2026-05-08T12:00:00Z'
        }
        */
    ];

    const criticalModeActive = mockVulnerabilities.some(v => v.severity === 'critical' || v.severity === 'high');
    const score = criticalModeActive ? 45 : (mockVulnerabilities.length > 0 ? 82 : 100);

    return {
        lastScan: new Date().toISOString(),
        totalPackages: 42, // package.json + devDeps
        vulnerabilities: mockVulnerabilities,
        criticalModeActive,
        score
    };
}

/**
 * Kritik İşlem Modu (Critical Operation Mode):
 * Eğer bağımlılıklarda yüksek risk varsa, ödeme gibi kritik işlemleri durdurur veya uyarır.
 */
export function isCriticalModeActive(report: SecurityReport): boolean {
    return report.criticalModeActive;
}
