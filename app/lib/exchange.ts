import { fetchAPI } from './api';

export interface ExchangeRates {
    rates: Record<string, number>;
    date?: string;
    source?: string;
    stale?: boolean;
}

/**
 * Backend'in günlük cache'li TRY baz döviz kuru servisini çağırır (F4-03).
 * Ön yüz artık üçüncü taraf kur API'sine doğrudan gitmez; tüm HTTP fetchAPI
 * üzerinden. Hata/backend kapalıysa null döner, çağıran fallback kullanır.
 */
export async function fetchExchangeRates(): Promise<ExchangeRates | null> {
    const response = await fetchAPI('/exchange-rates/', { next: { revalidate: 3600 } });
    if (response && response.rates && typeof response.rates === 'object') {
        return response as ExchangeRates;
    }
    return null;
}
