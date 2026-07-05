"""
core/image_utils.py
--------------------
Shared Pillow-based image optimization, extracted from
agencies/agency_tours_views.py so agency_shuttles_views.py (and any future
agency panel) can reuse it without importing another ViewSet.
"""
import io
import logging

from django.core.files.base import ContentFile

logger = logging.getLogger('agencies')

try:
    from PIL import Image as PilImage
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    logger.warning("Pillow kütüphanesi bulunamadı. Görsel optimizasyonu devre dışı.")

MAX_IMAGE_SIZE = (1200, 900)   # piksel
IMAGE_QUALITY = 82             # JPEG/WEBP kalitesi (1-95)


def optimize_image(image_file) -> ContentFile:
    """
    Pillow ile görsel optimizasyonu:
      1. MAX_IMAGE_SIZE içine sığdır (thumbnail — oranı koru).
      2. WEBP formatına dönüştür (en iyi sıkıştırma).
      3. ContentFile olarak döndür (Django'nun storage'ına yazılabilir).

    Pillow yüklü değilse orijinal dosyayı döndürür.
    """
    if not PILLOW_AVAILABLE:
        return ContentFile(image_file.read())

    try:
        img = PilImage.open(image_file)

        try:
            from PIL.ImageOps import exif_transpose
            img = exif_transpose(img)
        except Exception:
            pass

        if img.mode in ('RGBA', 'P', 'LA'):
            background = PilImage.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])
            else:
                background.paste(img.convert('RGBA'), mask=img.convert('RGBA').split()[3])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        img.thumbnail(MAX_IMAGE_SIZE, PilImage.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format='WEBP', quality=IMAGE_QUALITY, method=6)
        buffer.seek(0)
        return ContentFile(buffer.read())

    except Exception as e:
        logger.error(f"[IMAGE_OPTIMIZE] Pillow optimizasyonu başarısız, orijinal kullanılıyor: {e}")
        image_file.seek(0)
        return ContentFile(image_file.read())
