import { NextRequest, NextResponse } from 'next/server';
import { getHoneypotIncidents } from '../../../../lib/honeypot';

export async function GET(req: NextRequest) {
    const adminToken = req.headers.get('x-admin-token');
    
    if (adminToken !== 'tourkia_admin_secret') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(getHoneypotIncidents());
}
