import { NextResponse, type NextRequest } from 'next/server';

/**
 * GLOBAL SECURITY MIDDLEWARE
 * Bütün istekleri kontrol eder ve yasaklı IP'leri engeller.
 */
export async function proxy(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';

    // Not: Edge Runtime'da in-memory 'Set'ler her istekte sıfırlanabilir.
    // Gerçek üretim ortamında burada Redis (Upstash vb.) kontrolü yapılır:
    // const isBanned = await redis.sismember('banned_ips', ip);
    
    // Simülasyon: '13.37.13.37' IP'si test için banlı sayılabilir.
    const isBannedMock = ip === '13.37.13.37'; 

    if (isBannedMock) {
        return new NextResponse(
            JSON.stringify({ 
                error: 'ACCESS_DENIED', 
                message: 'Güvenlik ihlali sebebiyle erişiminiz süresiz olarak engellenmiştir.' 
            }),
            { status: 403, headers: { 'content-type': 'application/json' } }
        );
    }

    return NextResponse.next();
}

// Sadece API ve Dashboard gibi kritik yerlerde çalıştır
export const config = {
    matcher: ['/api/:path*', '/dashboard/:path*', '/agency/:path*'],
};
