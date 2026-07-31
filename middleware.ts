import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rol bazlı route koruması (F3-02) + CSP nonce üretimi (F3-05).
 *
 * ── Rol koruması ──
 * Bu katman kabuk sızıntısını ve UX'i düzeltmek içindir — asıl veri erişimi
 * backend permission'larıyla korunur. Burada JWT'nin İMZASI DOĞRULANMAZ
 * (o backend'in işi); sadece `exp` ve `role` claim'i okunur.
 *
 * Okunan çerez: HttpOnly `refresh-token` (F3-03). Access token artık bellekte,
 * middleware onu göremez; refresh token da `role` claim'ini taşıdığından
 * (RoleTokenObtainPairSerializer) rol kapısı bununla kurulur. HttpOnly çerez JS'e
 * kapalıdır ama middleware sunucu tarafında çalıştığı için okuyabilir. NOT:
 * cross-domain dağıtımda çerezin ön yüz alan adına ulaşması için ortak üst alan
 * adı gerekir (AUTH_COOKIE_DOMAIN); aksi halde bu katman devre dışı kalır ve
 * koruma panel layout'larındaki client guard'lara düşer.
 *
 * Rol matrisi:
 *   /dashboard/admin                      → admin
 *   /dashboard/agency|restaurant|business → agency (admin da geçer, üst küme)
 *   /dashboard/customer (ve diğerleri)    → herhangi bir oturum yeter
 * Token yoksa veya süresi dolmuşsa        → /login?next=<path>
 * Rol yetersizse                          → /login?next=<path>
 *
 * ── CSP nonce (F3-05) ──
 * Her istek için rastgele bir nonce üretilir ve CSP başlığına
 * `script-src 'nonce-<x>' 'strict-dynamic'` olarak yazılır; böylece `unsafe-inline`
 * script'lerden tamamen kaldırılır (asıl XSS koruması). Nonce hem istek başlığına
 * (`x-nonce`) yazılır — Next.js bunu okuyup kendi framework/hidrasyon inline
 * script'lerine ve `next/script` etiketlerine otomatik uygular — hem de layout
 * `headers()` ile okuyup elle eklediğimiz script'lere geçirir. `strict-dynamic`
 * sayesinde nonce'lu script'lerin yüklediği alt script'ler (analytics vb.) güvenilir
 * sayılır; host allowlist eski tarayıcılar için yedek olarak korunur.
 *
 * NOT: Nonce istek başına değiştiği için layout `headers()` okur ve bu tüm
 * sayfaları dinamik render'a çeker (ISR/statik optimizasyon devre dışı). Bu,
 * `unsafe-inline`'sız CSP'nin Next.js'te kaçınılmaz bedelidir; F5-07 performans
 * görevinde birlikte değerlendirilmeli.
 */

const REFRESH_TOKEN_COOKIE = 'refresh-token';

/** İstek başına CSP nonce üretir (Edge uyumlu: Web Crypto + btoa). */
function generateNonce(): string {
    return btoa(crypto.randomUUID());
}

/**
 * Nonce'lu CSP başlık değerini kurar. `script-src` `unsafe-inline` içermez;
 * `style-src` bilinçli olarak `unsafe-inline` tutar — React satır-içi `style`
 * öznitelikleri (nonce'lanamaz) ve next/font enjekte ettiği stiller yüzünden
 * katı style-src uygulamayı kırar ve CSS enjeksiyonu script yürütmediği için
 * güvenlik kazancı düşüktür (bkz. F3-05 notu).
 */
function buildCsp(nonce: string): string {
    return [
        "default-src 'self'",
        // 'unsafe-inline' kaldırıldı; nonce + strict-dynamic ile değiştirildi.
        // Host allowlist strict-dynamic'i desteklemeyen eski tarayıcılara yedek.
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://translate.googleapis.com https://challenges.cloudflare.com`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https: http://127.0.0.1:8000 http://localhost:8000",
        "connect-src 'self' https://*.tourkia.com http://127.0.0.1:8000 http://localhost:8000 https://www.google-analytics.com https://api.exchangerate-api.com",
        "frame-src 'self' https://challenges.cloudflare.com https://www.google.com",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
    ].join('; ');
}

interface JwtPayload {
    exp?: number;
    role?: string;
}

/** JWT payload'ını imza doğrulamadan çözer; bozuksa null döner. */
function decodeJwtPayload(token: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        // base64url → base64
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(base64);
        return JSON.parse(json) as JwtPayload;
    } catch {
        return null;
    }
}

function redirectToLogin(request: NextRequest, csp: string): NextResponse {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Giriş sonrası kullanıcıyı istediği sayfaya geri götürmek için.
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    const response = NextResponse.redirect(url);
    response.headers.set('Content-Security-Policy', csp);
    return response;
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── CSP nonce (F3-05): her istek için üret, hem istek başlığına (Next.js
    // framework script'lerine otomatik uygulanır) hem yanıt başlığına yaz. ──
    const nonce = generateNonce();
    const csp = buildCsp(nonce);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    // Next.js nonce'u istek başlığındaki CSP'den okuyup kendi inline
    // script'lerine (hidrasyon dahil) uygular.
    requestHeaders.set('Content-Security-Policy', csp);

    const allow = () => {
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        response.headers.set('Content-Security-Policy', csp);
        return response;
    };

    // ── Rol koruması yalnız /dashboard altında (F3-02) ──
    if (pathname.startsWith('/dashboard')) {
        const token = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
        if (!token) {
            return redirectToLogin(request, csp);
        }

        const payload = decodeJwtPayload(token);
        if (!payload) {
            return redirectToLogin(request, csp);
        }

        // exp saniye cinsinden; süresi dolmuş token'ı geçerli sayma.
        if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
            return redirectToLogin(request, csp);
        }

        const role = (payload.role || '').toLowerCase();

        // Admin her panele girebilir (üst küme); değilse rol matrisini uygula.
        if (role !== 'admin') {
            // Admin paneli yalnız admin.
            if (pathname.startsWith('/dashboard/admin')) {
                return redirectToLogin(request, csp);
            }

            // Acente/restoran/işletme panelleri agency rolü ister. Restoran ayrımı
            // (agency_business_type) panel layout'unda yapılır — backend rolü 'agency'.
            const agencyArea =
                pathname.startsWith('/dashboard/agency') ||
                pathname.startsWith('/dashboard/restaurant') ||
                pathname.startsWith('/dashboard/business');
            if (agencyArea && role !== 'agency') {
                return redirectToLogin(request, csp);
            }
        }
    }

    // /dashboard/customer, diğer paneller ve tüm genel sayfalar: CSP'li geçiş.
    return allow();
}

export const config = {
    // CSP tüm HTML belgelerine uygulanmalı; statik varlıkları ve API'yi dışla.
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|robots.txt|sitemap.xml|.*\\..*).*)',
    ],
};
