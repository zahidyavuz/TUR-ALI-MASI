'use client';

import TicketScanner from '@/app/components/TicketScanner';

export default function AgencyScannerPage() {
  return (
    <div className="animate-in fade-in duration-500">
      <TicketScanner
        title="Bilet Tarayıcı"
        subtitle="Misafirin biletindeki QR kodu okutun; kod okunamıyorsa elle girin."
      />
    </div>
  );
}
