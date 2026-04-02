'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Currency = 'TRY' | 'USD' | 'EUR' | 'RUB' | 'CNY';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    rates: Record<string, number>;
    formatPrice: (amountInTRY: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Backup kurlar, API'de sorun olursa diye
const FALLBACK_RATES: Record<string, number> = {
    TRY: 1,
    USD: 0.028,
    EUR: 0.026,
    RUB: 2.5,
    CNY: 0.2
};

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currency, setCurrencyState] = useState<Currency>('EUR');
    const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

    useEffect(() => {
        setCurrencyState('EUR');
        localStorage.setItem('melih_tours_currency', 'EUR');

        const fetchRates = async () => {
            try {
                // Sadece demo / ücretsiz kullanım içindir: ExchangeRate-API
                const res = await fetch('https://open.er-api.com/v6/latest/TRY');
                if (!res.ok) throw new Error("Exchange API failed");
                const data = await res.json();
                if (data && data.rates) {
                    setRates({
                        TRY: 1,
                        USD: data.rates.USD || FALLBACK_RATES.USD,
                        EUR: data.rates.EUR || FALLBACK_RATES.EUR,
                        RUB: data.rates.RUB || FALLBACK_RATES.RUB,
                        CNY: data.rates.CNY || FALLBACK_RATES.CNY
                    });
                }
            } catch (err) {
                console.warn("Döviz kurları çekilirken hata oluştu, varsayılan kurlar kullanılıyor.");
            }
        };

        fetchRates(); // İlk açıldığında çalıştır
        const interval = setInterval(fetchRates, 1000 * 60 * 60); // 1 saatte bir güncelle
        return () => clearInterval(interval);
    }, []);

    const setCurrency = (cur: Currency) => {
        setCurrencyState(cur);
        localStorage.setItem('melih_tours_currency', cur);
    };

    const formatPrice = (amountInTRY: number) => {
        const rate = rates[currency] || 1;
        let converted = amountInTRY * rate;

        let localeCode = 'tr-TR';
        let fractionDigits = 0;

        // Psikolojik Yuvarlama Algoritması
        if (currency === 'USD' || currency === 'EUR') {
            localeCode = currency === 'USD' ? 'en-US' : 'de-DE';
            // 30.76$ yerine 30.99$ formatı (Küsüratları sevilebilir bir sonuca bağlama)
            converted = Math.floor(converted) + 0.99;
            fractionDigits = 2; // .99 u göstermek için 2 hane açıyoruz
        } else {
            // TRY, RUB, CNY para birimlerinde genellikle binli ya da yüz binli haneler olduğu için
            if (currency === 'RUB') localeCode = 'ru-RU';
            if (currency === 'CNY') localeCode = 'zh-CN';

            // Pazarlama Psikolojisi: 18.153₺ yerine 18.150₺ veya 18.100₺ yuvarlaması
            if (converted > 1000) {
                converted = Math.round(converted / 10) * 10;
            } else {
                converted = Math.ceil(converted);
            }
            fractionDigits = 0; // Küsürata gerek yok
        }

        return new Intl.NumberFormat(localeCode, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        }).format(converted);
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, rates, formatPrice }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
    return context;
};
