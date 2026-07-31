import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  output: 'standalone',

  // ─────────────────────────────────────────────────────────────────
  // SECURE-SESSION-AND-COOKIE-ARMOR: HTTP Güvenlik Başlıkları
  // Tarayıcıya gönderilen her yanıtta şu başlıklar zorunlu olarak eklenir.
  // ─────────────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // 1. HSTS — Tarayıcıyı 2 yıl boyunca yalnızca HTTPS kullanmaya zorlar
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // 2. Clickjacking Koruması — Sitenin iframe içine gömülmesini engeller
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // 3. MIME Sniffing — Tarayıcının dosya türünü tahmin etmesini engeller
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // 4. Referrer Bilgisi — Dış sitelere URL sızdırmaz
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // 5. Permissions Policy — Kamera, mikrofon, konum erişimini kısıtlar
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), bluetooth=()',
          },
          // 6. Cross-Origin-Opener-Policy — Pop-up saldırılarını engeller
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // 7. Content Security Policy → middleware.ts'ye taşındı (F3-05).
          // Nonce istek başına üretildiği için statik header() ile verilemez;
          // `script-src 'nonce-<x>' 'strict-dynamic'` middleware'de kurulur ve
          // 'unsafe-inline' script'lerden kaldırılır.
        ],
      },
    ];
  },

  // HTTPS Zorunluluğu: Gelen HTTP isteklerini HTTPS'e yönlendir (prod)
  async redirects() {
    return process.env.NODE_ENV === 'production'
      ? [
          {
            source: '/(.*)',
            has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
            destination: 'https://tourkia.com/:path*',
            permanent: true,
          },
        ]
      : [];
  },

  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.122',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      // Production: backend API hostname
      {
        protocol: 'https',
        hostname: '*.tourkia.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
