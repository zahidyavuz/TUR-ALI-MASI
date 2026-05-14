import { NextResponse } from 'next/server';

// Global (mock) memory DB for availability to simulate persistent quota decrement
const globalAvailabilityDb: Record<string, { date: string, time: string, capacity: number, booked: number }[]> = {
  'm1': [
    { date: '2026-05-15', time: '18:00', capacity: 16, booked: 0 },
    { date: '2026-05-15', time: '19:00', capacity: 16, booked: 10 },
    { date: '2026-05-15', time: '20:00', capacity: 16, booked: 16 }, // Full!
    { date: '2026-05-15', time: '21:00', capacity: 16, booked: 5 },
  ]
};

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const menuId = searchParams.get('menuId') || 'm1';

    if (!date) {
        return NextResponse.json({ error: 'Tarih belirtilmedi' }, { status: 400 });
    }

    // Gerçekte: await db.availability.findMany({ where: { menuId, date } })
    let slots = globalAvailabilityDb[menuId]?.filter(s => s.date === date);

    if (!slots || slots.length === 0) {
        // Eğer o güne ait slot verisi yoksa, varsayılan kapasiteyle oluştur (mock)
        slots = [
            { date, time: '18:00', capacity: 16, booked: 0 },
            { date, time: '19:00', capacity: 16, booked: Math.floor(Math.random() * 8) },
            { date, time: '20:00', capacity: 16, booked: 16 }, // Örnek olarak 20:00'ı her zaman dolu bırakalım
            { date, time: '21:00', capacity: 16, booked: Math.floor(Math.random() * 10) },
        ];
        if (!globalAvailabilityDb[menuId]) globalAvailabilityDb[menuId] = [];
        globalAvailabilityDb[menuId].push(...slots);
    }

    return NextResponse.json({ success: true, slots });
}

// Rezervasyon tetiklendiğinde (veya bilet satıldığında) kotadan düşme işlemi
export async function POST(req: Request) {
    const { menuId, date, time, pax } = await req.json();

    const slots = globalAvailabilityDb[menuId];
    if (slots) {
        const slot = slots.find(s => s.date === date && s.time === time);
        if (slot) {
            if (slot.capacity - slot.booked >= pax) {
                slot.booked += pax;
                return NextResponse.json({ success: true, remaining: slot.capacity - slot.booked });
            } else {
                return NextResponse.json({ success: false, error: 'Yetersiz kota' }, { status: 400 });
            }
        }
    }
    return NextResponse.json({ error: 'Slot bulunamadı' }, { status: 404 });
}
