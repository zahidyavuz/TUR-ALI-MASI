import { NextRequest, NextResponse } from 'next/server';
import { isPasswordPwned } from '../../../lib/passwordShield';

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();
        
        if (!password || password.length < 4) {
            return NextResponse.json({ pwned: false });
        }

        const result = await isPasswordPwned(password);
        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ pwned: false }, { status: 500 });
    }
}
