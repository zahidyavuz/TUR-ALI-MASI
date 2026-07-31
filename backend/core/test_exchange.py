from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from core import exchange


# TCMB today.xml'in sadeleştirilmiş ama gerçekçi bir örneği.
SAMPLE_TCMB_XML = """<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="31.07.2026" Date="07/31/2026" Bulten_No="2026/145">
  <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
    <Unit>1</Unit><Isim>ABD DOLARI</Isim><CurrencyName>US DOLLAR</CurrencyName>
    <ForexBuying>40.0000</ForexBuying><ForexSelling>40.0000</ForexSelling>
    <BanknoteBuying>39.9</BanknoteBuying><BanknoteSelling>40.1</BanknoteSelling>
  </Currency>
  <Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR">
    <Unit>1</Unit><Isim>EURO</Isim><CurrencyName>EURO</CurrencyName>
    <ForexBuying>43.5000</ForexBuying><ForexSelling>43.4783</ForexSelling>
    <BanknoteBuying>43.4</BanknoteBuying><BanknoteSelling>43.6</BanknoteSelling>
  </Currency>
  <Currency CrossOrder="17" Kod="RUB" CurrencyCode="RUB">
    <Unit>1</Unit><Isim>RUS RUBLESI</Isim><CurrencyName>RUSSIAN ROUBLE</CurrencyName>
    <ForexBuying>0.40000</ForexBuying><ForexSelling>0.40000</ForexSelling>
    <BanknoteBuying></BanknoteBuying><BanknoteSelling></BanknoteSelling>
  </Currency>
  <Currency CrossOrder="19" Kod="CNY" CurrencyCode="CNY">
    <Unit>1</Unit><Isim>CIN YUANI</Isim><CurrencyName>CHINESE RENMINBI</CurrencyName>
    <ForexBuying>5.00000</ForexBuying><ForexSelling>5.00000</ForexSelling>
    <BanknoteBuying></BanknoteBuying><BanknoteSelling></BanknoteSelling>
  </Currency>
  <Currency CrossOrder="12" Kod="JPY" CurrencyCode="JPY">
    <Unit>100</Unit><Isim>JAPON YENI</Isim><CurrencyName>JAPANESE YEN</CurrencyName>
    <ForexBuying>27.0000</ForexBuying><ForexSelling>27.0000</ForexSelling>
  </Currency>
</Tarih_Date>"""


class _FakeResponse:
    def __init__(self, text, status=200):
        self.text = text
        self.status_code = status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f'HTTP {self.status_code}')


class ExchangeParseTestCase(TestCase):
    def test_parse_tcmb_try_base(self):
        """TCMB XML'i 1 TRY = Unit/ForexSelling olarak TRY baza çevirir."""
        rates = exchange._parse_tcmb(SAMPLE_TCMB_XML)
        self.assertEqual(rates['TRY'], 1.0)
        self.assertAlmostEqual(rates['USD'], 1 / 40.0, places=6)
        self.assertAlmostEqual(rates['EUR'], 1 / 43.4783, places=6)
        self.assertAlmostEqual(rates['RUB'], 1 / 0.4, places=6)
        self.assertAlmostEqual(rates['CNY'], 1 / 5.0, places=6)
        # Desteklenmeyen para birimi (JPY) atlanır.
        self.assertNotIn('JPY', rates)


class ExchangeServiceTestCase(TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_fetch_caches_and_avoids_second_call(self):
        """İlk çağrı TCMB'yi çeker+cache'ler; ikincisi ağa çıkmaz."""
        with patch('core.exchange.safe_requests_get', return_value=_FakeResponse(SAMPLE_TCMB_XML)) as m:
            first = exchange.get_exchange_rates()
            second = exchange.get_exchange_rates()
        self.assertEqual(m.call_count, 1)  # cache sayesinde tek istek
        self.assertFalse(first['stale'])
        self.assertEqual(first['source'], 'TCMB')
        self.assertEqual(first['rates'], second['rates'])

    def test_falls_back_when_source_unreachable(self):
        """Ağ hatası + boş cache → statik fallback, stale=True."""
        with patch('core.exchange.safe_requests_get', side_effect=Exception('network down')):
            result = exchange.get_exchange_rates()
        self.assertTrue(result['stale'])
        self.assertEqual(result['source'], 'fallback')
        self.assertEqual(result['rates'], exchange.FALLBACK_RATES)

    def test_serves_stale_cache_when_refresh_fails(self):
        """Eski cache varken canlı yenileme başarısızsa eski değer stale olarak döner."""
        with patch('core.exchange.safe_requests_get', return_value=_FakeResponse(SAMPLE_TCMB_XML)):
            good = exchange.get_exchange_rates()
        with patch('core.exchange.safe_requests_get', side_effect=Exception('down')):
            stale = exchange.get_exchange_rates(force_refresh=True)
        self.assertTrue(stale['stale'])
        self.assertEqual(stale['source'], 'TCMB')  # kaynak korunur
        self.assertEqual(stale['rates'], good['rates'])


class ExchangeEndpointTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_endpoint_public_and_returns_rates(self):
        """GET /api/v1/exchange-rates/ kimlik gerektirmeden TRY baz kurları döner."""
        with patch('core.exchange.safe_requests_get', return_value=_FakeResponse(SAMPLE_TCMB_XML)):
            response = self.client.get('/api/v1/exchange-rates/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['rates']['TRY'], 1.0)
        for code in exchange.SUPPORTED:
            self.assertIn(code, response.data['rates'])
        self.assertIn('date', response.data)
        self.assertIn('stale', response.data)
