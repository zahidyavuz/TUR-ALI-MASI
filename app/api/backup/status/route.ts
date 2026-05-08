/**
 * DISASTER-RECOVERY-PROTOCOL: Yedek Durum API'si
 * GET  /api/backup/status  — Son yedek durumunu sorgula
 * POST /api/backup/trigger — Manuel yedek tetikle (admin)
 */

import { NextRequest, NextResponse } from 'next/server';

interface BackupRecord {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running';
  sizeBytes: number;
  destination: string;
  checksum: string;
  encryptionKey: string;  // Sadece "***" gösterilir
  durationSeconds: number;
  retentionExpiry: string;
}

// Bellek içi simülasyon log'u (production'da DB'den çekilir)
const backupHistory: BackupRecord[] = [
  {
    id: 'BKP-20260508-040001',
    timestamp: new Date(Date.now() - 14 * 3600000).toISOString(), // 14 saat önce
    status: 'success',
    sizeBytes: 4718592,          // ~4.5MB
    destination: 's3://tourkia-backups-dr/backups/tourkia_20260508_040001.sql.gz.enc',
    checksum: 'a3f92c1b8e4d5f7a9b2c6d3e1f4a8b5c9d7e2f3a4b6c8d0e1f2a3b4c5d6e7f8',
    encryptionKey: '***',
    durationSeconds: 47,
    retentionExpiry: new Date(Date.now() + 6 * 24 * 3600000).toISOString(), // 6 gün
  },
  {
    id: 'BKP-20260507-040002',
    timestamp: new Date(Date.now() - 38 * 3600000).toISOString(),
    status: 'success',
    sizeBytes: 4620288,
    destination: 's3://tourkia-backups-dr/backups/tourkia_20260507_040002.sql.gz.enc',
    checksum: 'b5d7e1f3a2c4b6d8e0f2a4c6d8e0f2a4c6d8e0f2a4c6d8e0f2a4c6d8e0f2a4c',
    encryptionKey: '***',
    durationSeconds: 43,
    retentionExpiry: new Date(Date.now() + 5 * 24 * 3600000).toISOString(),
  },
  {
    id: 'BKP-20260506-040003',
    timestamp: new Date(Date.now() - 62 * 3600000).toISOString(),
    status: 'failed',
    sizeBytes: 0,
    destination: 'n/a',
    checksum: 'n/a',
    encryptionKey: '***',
    durationSeconds: 12,
    retentionExpiry: new Date(Date.now() + 4 * 24 * 3600000).toISOString(),
  },
  {
    id: 'BKP-20260505-040001',
    timestamp: new Date(Date.now() - 86 * 3600000).toISOString(),
    status: 'success',
    sizeBytes: 4456448,
    destination: 's3://tourkia-backups-dr/backups/tourkia_20260505_040001.sql.gz.enc',
    checksum: 'c7d9f1a3b5d7f9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7d',
    encryptionKey: '***',
    durationSeconds: 51,
    retentionExpiry: new Date(Date.now() + 3 * 24 * 3600000).toISOString(),
  },
];

const getAdminToken = (req: NextRequest) => req.headers.get('x-admin-token');

export async function GET(req: NextRequest) {
  const token = getAdminToken(req);
  const expected = process.env.ADMIN_WEBHOOK_TOKEN || 'tourkia_admin_secret';

  if (token !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const latest = backupHistory[0];
  const successfulBackups = backupHistory.filter((b) => b.status === 'success');
  const lastSuccess = successfulBackups[0];

  // Kıyamet uyarısı: Son başarılı yedek 25 saatten eskiyse
  const hoursSinceBackup = lastSuccess
    ? (Date.now() - new Date(lastSuccess.timestamp).getTime()) / 3600000
    : 999;

  const alert = hoursSinceBackup > 25
    ? { level: 'critical', message: `Son başarılı yedek ${Math.round(hoursSinceBackup)} saat önce!` }
    : hoursSinceBackup > 20
    ? { level: 'warning', message: `Son başarılı yedek ${Math.round(hoursSinceBackup)} saat önce` }
    : null;

  return NextResponse.json({
    latest,
    history: backupHistory,
    stats: {
      totalBackups: backupHistory.length,
      successCount: successfulBackups.length,
      failureCount: backupHistory.filter((b) => b.status === 'failed').length,
      totalStoredBytes: successfulBackups.reduce((sum, b) => sum + b.sizeBytes, 0),
      nextScheduled: '04:00 UTC (her gece)',
      retentionDays: 7,
    },
    alert,
    rtoTarget: '10 dakika',  // Recovery Time Objective
    rpoTarget: '24 saat',    // Recovery Point Objective
  });
}

export async function POST(req: NextRequest) {
  const token = getAdminToken(req);
  const expected = process.env.ADMIN_WEBHOOK_TOKEN || 'tourkia_admin_secret';

  if (token !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Manuel yedek tetikleme simülasyonu
  // Production'da: Django API üzerinden management command çağrılır
  const body = await req.json().catch(() => ({}));
  const destination = body.destination || 's3';

  console.log(`[DR] Manuel yedek tetiklendi: destination=${destination}`);

  return NextResponse.json({
    message: 'Yedekleme işlemi kuyruğa alındı',
    jobId: `BKP-MANUAL-${Date.now()}`,
    destination,
    estimatedDuration: '~1-3 dakika',
    note: 'Production\'da Django management command çalıştırılır: python manage.py backup_database --destination s3',
  }, { status: 202 });
}
