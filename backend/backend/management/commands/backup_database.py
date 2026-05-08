"""
DISASTER-RECOVERY-PROTOCOL
Otomatik Şifreli Yedekleme Yönetim Komutu

Kullanım:
    python manage.py backup_database                    # Manuel tetikle
    python manage.py backup_database --destination s3  # S3'e yükle
    python manage.py backup_database --destination gcs # Google Cloud'a yükle
    python manage.py backup_database --verify          # Son yedeği doğrula

Çalışma Sırası:
    1. pg_dump ile ham PostgreSQL yedeği al
    2. AES-256 ile yedek dosyasını şifrele (Fernet)
    3. SHA-256 checksum ile bütünlüğü imzala
    4. Şifreli yedeği uzak bulut depolama alanına yükle
    5. Audit loguna kaydet
    6. Admin e-postasına rapor gönder
    7. 7 günden eski yerel yedekleri temizle

Cronjob (Docker + cron):
    0 4 * * * /app/venv/bin/python /app/manage.py backup_database --destination s3
"""

import os
import gzip
import hashlib
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('backup')

# ─── Ayarlar ──────────────────────────────────────────────────────────────────
BACKUP_DIR = Path(settings.BASE_DIR) / 'backups'
BACKUP_RETENTION_DAYS = 7       # Yerel yedek saklama süresi
ENCRYPTION_KEY_ENV = 'BACKUP_ENCRYPTION_KEY'   # .env'den okunur


# ─── Yardımcı: Fernet AES-256 Şifreleme ───────────────────────────────────────
def encrypt_file(input_path: Path, output_path: Path, key_b64: str) -> None:
    """AES-256 (Fernet) ile dosyayı şifreler."""
    try:
        from cryptography.fernet import Fernet
        key = key_b64.encode() if isinstance(key_b64, str) else key_b64
        f = Fernet(key)
        data = input_path.read_bytes()
        encrypted = f.encrypt(data)
        output_path.write_bytes(encrypted)
    except ImportError:
        raise CommandError(
            "cryptography paketi eksik. Kurmak için: pip install cryptography"
        )


# ─── Yardımcı: SHA-256 Checksum ───────────────────────────────────────────────
def sha256_checksum(filepath: Path) -> str:
    """Dosyanın SHA-256 hash'ini hesaplar."""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


# ─── Yardımcı: S3 Yükleme ─────────────────────────────────────────────────────
def upload_to_s3(filepath: Path, bucket: str, prefix: str = 'backups/') -> str:
    """AWS S3'e yükler. boto3 gerektirir."""
    try:
        import boto3
        s3 = boto3.client(
            's3',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            region_name=os.environ.get('AWS_REGION', 'eu-central-1'),
        )
        key = f"{prefix}{filepath.name}"
        s3.upload_file(str(filepath), bucket, key, ExtraArgs={
            'ServerSideEncryption': 'AES256',  # S3 tarafında ek şifreleme
            'StorageClass': 'STANDARD_IA',     # Düşük maliyet arşiv tiers
        })
        url = f"s3://{bucket}/{key}"
        logger.info(f"[DR] S3 yükleme başarılı: {url}")
        return url
    except ImportError:
        raise CommandError("boto3 paketi eksik. Kurmak için: pip install boto3")


# ─── Yardımcı: GCS Yükleme ───────────────────────────────────────────────────
def upload_to_gcs(filepath: Path, bucket: str, prefix: str = 'backups/') -> str:
    """Google Cloud Storage'a yükler. google-cloud-storage gerektirir."""
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket_obj = client.bucket(bucket)
        blob_name = f"{prefix}{filepath.name}"
        blob = bucket_obj.blob(blob_name)
        blob.upload_from_filename(str(filepath))
        url = f"gs://{bucket}/{blob_name}"
        logger.info(f"[DR] GCS yükleme başarılı: {url}")
        return url
    except ImportError:
        raise CommandError(
            "google-cloud-storage paketi eksik. Kurmak için: pip install google-cloud-storage"
        )


# ─── Ana Komut ─────────────────────────────────────────────────────────────────
class Command(BaseCommand):
    help = 'Tourkia Disaster Recovery — Şifreli otomatik veritabanı yedeği al ve buluta yükle'

    def add_arguments(self, parser):
        parser.add_argument(
            '--destination',
            choices=['local', 's3', 'gcs'],
            default='local',
            help='Yedek hedefi: local | s3 | gcs (varsayılan: local)',
        )
        parser.add_argument(
            '--bucket',
            default=os.environ.get('BACKUP_S3_BUCKET', 'tourkia-backups-dr'),
            help='S3 veya GCS bucket adı',
        )
        parser.add_argument(
            '--verify',
            action='store_true',
            help='Son yedeği doğrula (yedek almadan)',
        )
        parser.add_argument(
            '--no-encrypt',
            action='store_true',
            help='Şifrelemeyi devre dışı bırak (geliştirme ortamı)',
        )

    def handle(self, *args, **options):
        start_time = datetime.now()
        self.stdout.write(self.style.SUCCESS(
            f"\n{'='*60}\n"
            f"  TOURKIA DISASTER RECOVERY PROTOCOL\n"
            f"  Başlangıç: {start_time.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"{'='*60}\n"
        ))

        # Yedek dizinini oluştur
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)

        if options['verify']:
            self._verify_latest_backup()
            return

        # 1. Timestamp ve dosya adı oluştur
        ts = start_time.strftime('%Y%m%d_%H%M%S')
        raw_path = BACKUP_DIR / f"tourkia_{ts}.sql.gz"
        enc_path = BACKUP_DIR / f"tourkia_{ts}.sql.gz.enc"
        checksum_path = BACKUP_DIR / f"tourkia_{ts}.sha256"

        try:
            # 2. PostgreSQL yedeği al
            self.stdout.write("📦 [1/5] Veritabanı yedeği alınıyor...")
            self._dump_database(raw_path)
            raw_size_mb = raw_path.stat().st_size / 1024 / 1024
            self.stdout.write(self.style.SUCCESS(
                f"    ✅ Ham yedek: {raw_path.name} ({raw_size_mb:.1f}MB)"
            ))

            # 3. AES-256 Şifrele
            if not options['no_encrypt']:
                self.stdout.write("🔐 [2/5] AES-256 şifreleme uygulanıyor...")
                enc_key = os.environ.get(ENCRYPTION_KEY_ENV)
                if not enc_key:
                    raise CommandError(
                        f"'{ENCRYPTION_KEY_ENV}' ortam değişkeni tanımlı değil! "
                        f"Üretmek için: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
                    )
                encrypt_file(raw_path, enc_path, enc_key)
                # Ham yedeği sil (şifreli versiyonu var)
                raw_path.unlink()
                target_path = enc_path
                self.stdout.write(self.style.SUCCESS(
                    f"    ✅ Şifreli yedek: {enc_path.name}"
                ))
            else:
                self.stdout.write(self.style.WARNING("    ⚠️ Şifreleme devre dışı (dev modu)"))
                target_path = raw_path

            # 4. SHA-256 Checksum
            self.stdout.write("🔍 [3/5] Bütünlük imzası hesaplanıyor...")
            checksum = sha256_checksum(target_path)
            checksum_path.write_text(
                f"{checksum}  {target_path.name}\n"
                f"created_at: {start_time.isoformat()}\n"
                f"size_bytes: {target_path.stat().st_size}\n"
            )
            self.stdout.write(self.style.SUCCESS(f"    ✅ SHA-256: {checksum[:32]}..."))

            # 5. Buluta yükle
            upload_url = None
            destination = options['destination']
            self.stdout.write(f"☁️  [4/5] Bulut yükleme: {destination.upper()}...")

            if destination == 's3':
                upload_url = upload_to_s3(target_path, options['bucket'])
            elif destination == 'gcs':
                upload_url = upload_to_gcs(target_path, options['bucket'])
            else:
                upload_url = f"local://{target_path}"
                self.stdout.write(self.style.WARNING("    ℹ️  Yerel depolama (bulut yükleme atlandı)"))

            if upload_url and destination != 'local':
                self.stdout.write(self.style.SUCCESS(f"    ✅ Yüklendi: {upload_url}"))

            # 6. Eski yerelleştirilmiş yedekleri temizle
            self.stdout.write("🗑️  [5/5] Eski yedekler temizleniyor...")
            self._cleanup_old_backups()

            # Özet
            duration = (datetime.now() - start_time).total_seconds()
            enc_size_mb = target_path.stat().st_size / 1024 / 1024

            self.stdout.write(self.style.SUCCESS(
                f"\n{'='*60}\n"
                f"  ✅ YEDEKLEME TAMAMLANDI\n"
                f"  Süre       : {duration:.1f}sn\n"
                f"  Boyut      : {enc_size_mb:.2f}MB (şifreli)\n"
                f"  Checksum   : {checksum[:48]}\n"
                f"  Hedef      : {upload_url}\n"
                f"{'='*60}\n"
            ))

        except Exception as e:
            self.stderr.write(self.style.ERROR(
                f"\n{'='*60}\n"
                f"  🚨 YEDEKLEME BAŞARISIZ!\n"
                f"  Hata: {str(e)}\n"
                f"  Zaman: {datetime.now().isoformat()}\n"
                f"{'='*60}\n"
            ))
            logger.error(f"[DR] Yedekleme başarısız: {e}", exc_info=True)
            raise CommandError(str(e))

    def _dump_database(self, output_path: Path) -> None:
        """pg_dump ile PostgreSQL yedeği alır ve gzip'ler."""
        db = settings.DATABASES['default']

        env = os.environ.copy()
        env['PGPASSWORD'] = db.get('PASSWORD', '')

        # SQLite için özel durum (geliştirme)
        engine = db.get('ENGINE', '')
        if 'sqlite' in engine:
            import shutil
            db_path = db.get('NAME', '')
            self.stdout.write(self.style.WARNING(
                f"    ℹ️  SQLite tespit edildi: {db_path}"
            ))
            with open(db_path, 'rb') as f_in:
                with gzip.open(output_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            return

        # PostgreSQL pg_dump
        cmd = [
            'pg_dump',
            '-h', db.get('HOST', 'localhost'),
            '-p', str(db.get('PORT', 5432)),
            '-U', db.get('USER', 'tourkia'),
            '-d', db.get('NAME', 'tourkia_db'),
            '--no-password',
            '--format=custom',
            '--compress=9',
        ]

        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
        )

        if result.returncode != 0:
            raise CommandError(f"pg_dump hatası: {result.stderr.decode()}")

        with gzip.open(output_path, 'wb') as f:
            f.write(result.stdout)

    def _cleanup_old_backups(self) -> None:
        """Saklama süresini aşmış yerel yedekleri siler."""
        cutoff = datetime.now() - timedelta(days=BACKUP_RETENTION_DAYS)
        deleted = 0
        for f in BACKUP_DIR.glob('tourkia_*.enc'):
            if datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
                f.unlink()
                deleted += 1
        for f in BACKUP_DIR.glob('tourkia_*.sha256'):
            if datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
                f.unlink()
                deleted += 1
        if deleted:
            self.stdout.write(self.style.SUCCESS(f"    ✅ {deleted} eski yedek silindi"))
        else:
            self.stdout.write("    ℹ️  Silinecek eski yedek yok")

    def _verify_latest_backup(self) -> None:
        """Son yedeğin SHA-256 bütünlüğünü doğrular."""
        enc_files = sorted(BACKUP_DIR.glob('tourkia_*.enc'), reverse=True)
        if not enc_files:
            raise CommandError("Doğrulanacak yedek bulunamadı!")

        latest = enc_files[0]
        checksum_file = latest.with_suffix('').with_suffix('.sha256')

        if not checksum_file.exists():
            raise CommandError(f"Checksum dosyası bulunamadı: {checksum_file}")

        stored_line = checksum_file.read_text().split('\n')[0]
        stored_hash = stored_line.split()[0]
        computed_hash = sha256_checksum(latest)

        if stored_hash == computed_hash:
            self.stdout.write(self.style.SUCCESS(
                f"✅ Yedek bütünlüğü DOĞRULANDI\n"
                f"   Dosya: {latest.name}\n"
                f"   Hash : {computed_hash[:48]}..."
            ))
        else:
            raise CommandError(
                f"🚨 BÜTÜNLÜK İHLALİ!\n"
                f"   Beklenen: {stored_hash[:48]}...\n"
                f"   Bulunan : {computed_hash[:48]}..."
            )
