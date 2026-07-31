// İptal / iade politikası gösterim sabitleri (F4-04).
// İade yüzdeleri backend'de hesaplanır (bkz. tours.models.CANCELLATION_POLICIES);
// burada yalnız müşteriye/acentaya gösterilecek etiket ve açıklamalar tutulur.

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

export interface PolicyInfo {
    value: CancellationPolicy;
    label: string;
    summary: string;
    detail: string;
}

export const CANCELLATION_POLICY_INFO: Record<CancellationPolicy, PolicyInfo> = {
    flexible: {
        value: 'flexible',
        label: 'Esnek',
        summary: 'Ücretsiz iptal',
        detail: 'Hizmet başlangıcına 24 saatten fazla varsa tam iade. Son 24 saatte iade yapılmaz.',
    },
    moderate: {
        value: 'moderate',
        label: 'Orta',
        summary: 'Kısmi iade',
        detail: '72 saatten fazla varsa tam iade, 24-72 saat arası %50 iade. Son 24 saatte iade yapılmaz.',
    },
    strict: {
        value: 'strict',
        label: 'Katı',
        summary: 'Sınırlı iade',
        detail: '7 günden fazla varsa %50 iade. Son 7 günde iade yapılmaz.',
    },
};

export const CANCELLATION_POLICY_OPTIONS: PolicyInfo[] = Object.values(CANCELLATION_POLICY_INFO);

/** Bilinmeyen/boş değeri en cömert politika olan 'flexible'a düşürür. */
export function policyInfo(policy?: string | null): PolicyInfo {
    return CANCELLATION_POLICY_INFO[(policy as CancellationPolicy)] || CANCELLATION_POLICY_INFO.flexible;
}
