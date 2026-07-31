"""
Günlük cache'li döviz kuru servisi (F4-03).

Kaynak: TCMB (T.C. Merkez Bankası) `today.xml`. TRY baz kurları döndürür
(1 TRY = X yabancı) ki ön yüz fiyatları yalnız *gösterim* için çevirebilsin;
tahsilat her zaman TRY'dir. 24 saat cache'lenir; canlı kaynak alınamazsa önce
eski cache, o da yoksa statik fallback sunulur (gösterim asla kırılmaz).
"""
import logging
from datetime import date
from decimal import Decimal, InvalidOperation
from xml.etree import ElementTree

from django.core.cache import cache

from .utils import safe_requests_get

logger = logging.getLogger(__name__)

TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml'
CACHE_KEY = 'exchange_rates_try_v1'
CACHE_TTL = 60 * 60 * 24  # 24 saat

# Ön yüzün desteklediği para birimleri (bkz. CurrencyContext).
SUPPORTED = ['USD', 'EUR', 'RUB', 'CNY']

# Hem canlı kaynak hem cache başarısızsa son çare statik kurlar (1 TRY = X).
# Kabaca güncel; yalnız gösterimi kırmamak için vardır, tahsilatta kullanılmaz.
FALLBACK_RATES = {
    'TRY': 1.0,
    'USD': 0.025,
    'EUR': 0.023,
    'RUB': 2.4,
    'CNY': 0.18,
}


def _parse_tcmb(xml_text: str) -> dict:
    """TCMB today.xml'i TRY baz kur sözlüğüne çevirir ({'TRY':1, 'USD':...})."""
    root = ElementTree.fromstring(xml_text)
    rates = {'TRY': 1.0}
    for cur in root.findall('Currency'):
        kod = cur.get('Kod') or cur.get('CurrencyCode')
        if kod not in SUPPORTED:
            continue
        unit_text = (cur.findtext('Unit') or '1').strip()
        # ForexSelling boşsa BanknoteSelling'e düş (bazı birimlerde forex boş olur).
        selling_text = (cur.findtext('ForexSelling') or cur.findtext('BanknoteSelling') or '').strip()
        try:
            unit = Decimal(unit_text)
            selling = Decimal(selling_text)
        except (InvalidOperation, ValueError):
            continue
        if selling <= 0 or unit <= 0:
            continue
        # TCMB: 1 (Unit) yabancı = selling TRY → 1 TRY = Unit/selling yabancı.
        rates[kod] = float(unit / selling)
    return rates


def get_exchange_rates(force_refresh: bool = False) -> dict:
    """
    TRY baz döviz kurlarını döndürür (günlük cache'li).

    Dönüş: {'rates': {...}, 'date': iso, 'source': str, 'stale': bool}.
    `stale=True` → canlı kaynak alınamadı, eski/statik değer sunuluyor.
    """
    if not force_refresh:
        cached = cache.get(CACHE_KEY)
        if cached:
            return cached

    try:
        resp = safe_requests_get(TCMB_URL, timeout=8)
        resp.raise_for_status()
        rates = _parse_tcmb(resp.text)
        # Ancak beklenen tüm para birimleri geldiyse taze kabul et ve cache'le.
        if all(code in rates for code in SUPPORTED):
            payload = {
                'rates': rates,
                'date': date.today().isoformat(),
                'source': 'TCMB',
                'stale': False,
            }
            cache.set(CACHE_KEY, payload, CACHE_TTL)
            return payload
        logger.warning('TCMB yanıtı eksik para birimi içeriyor: %s', list(rates))
    except Exception as exc:  # ağ/parse hatası — gösterimi kırma
        logger.warning('Döviz kuru çekilemedi (%s), fallback kullanılıyor', exc)

    # Canlı kaynak başarısız: eski cache varsa onu, yoksa statik fallback'i sun.
    previous = cache.get(CACHE_KEY)
    if previous:
        return {**previous, 'stale': True}
    return {
        'rates': dict(FALLBACK_RATES),
        'date': date.today().isoformat(),
        'source': 'fallback',
        'stale': True,
    }
