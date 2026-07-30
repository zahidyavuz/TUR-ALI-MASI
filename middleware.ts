import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js middleware. Şu an geçiş yapan istekleri değiştirmiyor.
 * Rol bazlı route koruması F3-02'de eklenecek.
 */
export async function middleware(request: NextRequest) {
    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
