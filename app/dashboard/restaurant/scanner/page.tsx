'use client';

import TicketScanner from '@/app/components/TicketScanner';

export default function RestaurantScannerPage() {
  return (
    <div className="animate-in fade-in duration-500">
      <TicketScanner
        title="Hızlı QR Tarama"
        subtitle="Müşterinin biletindeki QR kodu okutun; kod okunamıyorsa elle girin."
      />
    </div>
  );
}
