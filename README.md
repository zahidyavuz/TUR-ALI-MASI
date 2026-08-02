# Tourkia

Türkiye odaklı turizm ve rezervasyon platformu: turlar, transferler (shuttle), restoran/menü rezervasyonları, spa/wellness ve combo paketleri. Acenteler hizmetlerini yönetir, müşteriler online öder, yönetim onboarding ve hakedişleri denetler.

## Mimari

- **Frontend** — Next.js 16 (App Router, React 19), TypeScript, Tailwind CSS v4. Kaynak depo kökünde (`app/`).
- **Backend** — Django 4.2 + Django REST Framework, `backend/` altında. Django Channels ile gerçek-zamanlı sohbet/bildirim (WebSocket).
- **Ödeme** — sağlayıcı-agnostik katman (`backend/bookings/payments/`); `PAYMENT_PROVIDER` ile Stripe / iyzico seçilir. Fiyat ve komisyon her zaman sunucuda hesaplanır.

### Dizin yapısı

```
app/                 Next.js App Router sayfaları ve bileşenleri
  components/ui/      Tasarım sistemi primitive'leri (Button, Input, Card, Modal, Badge, Toast)
  context/           React context'leri (Theme, Locale, Toast, Currency ...)
  lib/api.ts         Tek HTTP giriş noktası (fetchAPI) — tüm istekler buradan geçer
backend/
  backend/           Django settings, urls, asgi/wsgi
  agencies/ tours/ shuttles/ spas/ bookings/ reviews/ blogs/ chat/
  users/ contacts/ notifications/   DRF app'leri
scripts/             Tek seferlik geliştirme yardımcıları (görsel arama vb.)
```

## Kurulum

### Gereksinimler
- Node.js 20+
- Python 3.9+

### Frontend

```bash
npm install
npm run dev          # http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver      # http://localhost:8000
```

## Ortam Değişkenleri

Frontend (`.env.local`):

| Değişken | Açıklama |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend API taban adresi (ör. `http://localhost:8000/api/v1`) |
| `NEXT_PUBLIC_SITE_URL` | Sitenin herkese açık adresi (sitemap/SEO) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js publishable anahtarı |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics (opsiyonel) |
| `NEXT_PUBLIC_YANDEX_METRICA_ID`, `NEXT_PUBLIC_BAIDU_ANALYTICS_ID`, `NEXT_PUBLIC_FB_PIXEL_ID` | Diğer analitik (opsiyonel) |

Backend (`backend/.env`):

| Değişken | Açıklama |
| --- | --- |
| `SECRET_KEY` | Django gizli anahtarı |
| `DEBUG` | `True`/`False` |
| `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` | Virgülle ayrılmış host/origin listesi |
| `DATABASE_URL` | Üretimde PostgreSQL bağlantısı (yoksa SQLite) |
| `REDIS_URL` | Channels/cache için Redis |
| `PAYMENT_PROVIDER` | `stripe` \| `iyzico` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe kimlik bilgileri |
| `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_WEBHOOK_SECRET`, `IYZICO_BASE_URL` | iyzico kimlik bilgileri |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | SMTP ayarları |
| `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_DOMAIN` | Refresh token çerezi |
| `FRONTEND_URL`, `SITE_NAME` | E-postalardaki bağlantı/başlık |

## Geliştirme Notları

- Frontend'ten tüm HTTP çağrıları yalnızca `app/lib/api.ts → fetchAPI` üzerinden yapılır.
- Her yeni DRF ucu açık bir permission sınıfı belirtmelidir; para/kontenjan yazan işlemler `transaction.atomic()` içinde çalışır.
- Sır/anahtarlar koda gömülmez; ortam değişkenlerinden okunur.
- Görev yol haritası ve kararlar `TASKS.md` dosyasında izlenir.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Frontend geliştirme sunucusu |
| `npm run build` | Üretim derlemesi (postbuild'de sitemap üretir) |
| `npm run lint` | ESLint |
| `python manage.py test` | Backend testleri |
| `python manage.py migrate` | Migration'ları uygula |
