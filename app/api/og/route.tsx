import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const title = searchParams.get('title') || 'Tourkia';
        const image = searchParams.get('image') || 'https://images.unsplash.com/photo-1596395819057-afbf19aff3fb?fit=crop&w=1200&q=80';

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#111827',
                        position: 'relative',
                    }}
                >
                    {image && (
                        <img
                            src={image}
                            alt=""
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                opacity: 0.6,
                            }}
                        />
                    )}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                        }}
                    />
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            textAlign: 'center',
                            padding: '40px',
                        }}
                    >
                        <h1
                            style={{
                                fontSize: 60,
                                fontWeight: 900,
                                color: 'white',
                                marginBottom: 20,
                                textShadow: '0 4px 10px rgba(0,0,0,0.5)',
                            }}
                        >
                            {title}
                        </h1>
                        <div
                            style={{
                                fontSize: 30,
                                color: '#38bdf8',
                                fontWeight: 'bold',
                            }}
                        >
                            Tourkia - Sizin İçin Özel Seçilmiş Turlar
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        // console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
