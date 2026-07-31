import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rol bazlı route koruması (F3-02).
 *
 * Bu katman kabuk sızıntısını ve UX'i düzeltmek içindir — asıl veri erişimi
 * backend permission'larıyla korunur. Burada JWT'nin İMZASI DOĞRULANMAZ
 * (o backend'in işi); sadece `exp` ve `role` claim'i okunur.
 *
 * Rol matrisi:
 *   /dashboard/admin                      → admin
 *   /dashboard/agency|restaurant|business → agency (admin da geçer, üst küme)
 *   /dashboard/customer (ve diğerleri)    → herhangi bir oturum yeter
 * Token yoksa veya süresi dolmuşsa        → /login?next=<path>
 * Rol yetersizse                          → /login?next=<path>
 */

const ACCESS_TOKEN_COOKIE = 'tourkia_access_token';

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

function redirectToLogin(request: NextRequest): NextResponse {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Giriş sonrası kullanıcıyı istediği sayfaya geri götürmek için.
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!token) {
        return redirectToLogin(request);
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
        return redirectToLogin(request);
    }

    // exp saniye cinsinden; süresi dolmuş token'ı geçerli sayma.
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
        return redirectToLogin(request);
    }

    const role = (payload.role || '').toLowerCase();

    // Admin her panele girebilir (üst küme).
    if (role === 'admin') {
        return NextResponse.next();
    }

    // Admin paneli yalnız admin.
    if (pathname.startsWith('/dashboard/admin')) {
        return redirectToLogin(request);
    }

    // Acente/restoran/işletme panelleri agency rolü ister. Restoran ayrımı
    // (agency_business_type) panel layout'unda yapılır — backend rolü 'agency'.
    const agencyArea =
        pathname.startsWith('/dashboard/agency') ||
        pathname.startsWith('/dashboard/restaurant') ||
        pathname.startsWith('/dashboard/business');
    if (agencyArea && role !== 'agency') {
        return redirectToLogin(request);
    }

    // /dashboard/customer ve diğer alanlar için geçerli oturum yeterli.
    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
