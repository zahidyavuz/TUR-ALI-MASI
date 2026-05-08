'use client';

import { useEffect, useRef } from 'react';

/**
 * BEHAVIORAL TRACKER
 * Kullanıcı davranışlarını (fare, tık, scroll) sessizce toplar ve analiz için gönderir.
 */
export default function BehavioralTracker() {
    const telemetry = useRef({
        mousePaths: [] as { x: number; y: number; t: number }[],
        clickIntervals: [] as number[],
        scrollRhythm: [] as number[],
        lastClickTime: 0,
        startTime: 0
    });
    useEffect(() => {
        telemetry.current.startTime = Date.now();
        
        const handleMouseMove = (e: MouseEvent) => {
            if (telemetry.current.mousePaths.length < 100) {
                telemetry.current.mousePaths.push({
                    x: e.clientX,
                    y: e.clientY,
                    t: Date.now()
                });
            }
        };

        const handleClick = () => {
            const now = Date.now();
            if (telemetry.current.lastClickTime > 0) {
                telemetry.current.clickIntervals.push(now - telemetry.current.lastClickTime);
            }
            telemetry.current.lastClickTime = now;
        };

        const handleScroll = () => {
            // Scroll hızını/aralığını takip et (Örn: her 500ms'de bir örnekle)
            if (telemetry.current.scrollRhythm.length < 20) {
                telemetry.current.scrollRhythm.push(window.scrollY);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('click', handleClick);
        window.addEventListener('scroll', handleScroll);

        // Her 30 saniyede bir veya sayfa kapanırken veriyi gönder
        const sendTelemetry = async () => {
            if (telemetry.current.mousePaths.length < 5) return;

            try {
                await fetch('/api/security/behavioral/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mousePaths: telemetry.current.mousePaths,
                        clickIntervals: telemetry.current.clickIntervals,
                        scrollRhythm: telemetry.current.scrollRhythm,
                        timeOnPage: Date.now() - telemetry.current.startTime
                    }),
                    keepalive: true
                });
                // Veriyi temizle
                telemetry.current.mousePaths = [];
                telemetry.current.clickIntervals = [];
            } catch (e) {
                // Sessiz hata
            }
        };

        const interval = setInterval(sendTelemetry, 30000);

        return () => {
            clearInterval(interval);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('scroll', handleScroll);
            sendTelemetry(); // Sayfadan çıkarken son veriyi gönder
        };
    }, []);

    return null; // Görünmez bileşen
}
