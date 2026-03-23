import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TourScanner | Global Seyahat & Acenta Platformu",
  description: "Türkiye'nin dünyaya açılan, Yandex ve Baidu uyumlu global seyahat platformu. Kapadokya, İtalya, Maldivler ve daha fazlası.",
  verification: {
    google: "google-site-verification-code",
    yandex: "yandex-verification-code", // Yandex Webmaster SEO Entagrasyonu
    other: {
      "baidu-site-verification": ["baidu-verification-code"], // Baidu SEO Entegrasyonu
      "msvalidate.01": ["bing-verification-code"], // Bing Arama Motoru
    }
  }
};

import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import Chatbot from "./components/Chatbot";
import { CurrencyProvider } from "./context/CurrencyContext";
import { LocaleProvider } from "./context/LocaleContext";
import { NotificationProvider } from "./context/NotificationContext";
import { GeofenceProvider } from "./context/GeofenceContext";
import { AuthProvider } from "./context/AuthContext";
import GeofenceBanner from "./components/GeofenceBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <style>{`
          /* Google Translate varsayılan çubuğunu gizle */
          .VIpgJd-ZVi9od-ORHb-OEVmcd { display: none !important; }
          .goog-te-banner-frame { display: none !important; }
          body { top: 0 !important; }
          .goog-te-combo { display: none !important; }
        `}</style>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <div id="google_translate_element" style={{ display: 'none' }}></div>
        <CurrencyProvider>
          <LocaleProvider>
            <AuthProvider>
              <NotificationProvider>
                <GeofenceProvider>
                  {children}
                  <GeofenceBanner />
                  <Chatbot />
                </GeofenceProvider>
              </NotificationProvider>
            </AuthProvider>
          </LocaleProvider>
        </CurrencyProvider>

        {/* Google Translate Betikleri */}
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
        <Script id="google-translate-init" strategy="afterInteractive">
          {`
            function googleTranslateElementInit() {
              new google.translate.TranslateElement({
                pageLanguage: 'tr',
                includedLanguages: 'en,zh-CN,hi,es,fr,ar,bn,ru,pt,tr',
                autoDisplay: false
              }, 'google_translate_element');
            }
          `}
        </Script>

        {/* Global SEO & Analytics Entegrasyonları (Rusya & Çin) */}
        {/* Yandex.Metrica Analytics */}
        {process.env.NEXT_PUBLIC_YANDEX_METRICA_ID && (
        <Script id="yandex-metrica" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

            ym(${process.env.NEXT_PUBLIC_YANDEX_METRICA_ID}, "init", {
                 clickmap:true,
                 trackLinks:true,
                 accurateTrackBounce:true,
                 webvisor:true
            });
          `}
        </Script>
        )}

        {/* Baidu Analytics */}
        {process.env.NEXT_PUBLIC_BAIDU_ANALYTICS_ID && (
        <Script id="baidu-analytics" strategy="afterInteractive">
          {`
            var _hmt = _hmt || [];
            (function() {
              var hm = document.createElement("script");
              hm.src = "https://hm.baidu.com/hm.js?${process.env.NEXT_PUBLIC_BAIDU_ANALYTICS_ID}";
              var s = document.getElementsByTagName("script")[0]; 
              s.parentNode.insertBefore(hm, s);
            })();
          `}
        </Script>
        )}

        {/* Google Analytics (GA4) */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}

        {/* Facebook Pixel (Meta) */}
        {process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
