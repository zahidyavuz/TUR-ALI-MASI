# TOURKIA — TASKS.md (Claude Code Yürütme Dosyası)

Bu dosya Claude Code'un adım adım kodlaması için hazırlanmıştır. Repo kod denetimi (commit `4bf582c`) bulgularına dayanır. Repo köküne koy: `TASKS.md`.

Claude Code'a talimat: "TASKS.md'yi oku, sıradaki tamamlanmamış GÖREV'i uygula."

---

## 0. ÇALIŞMA PROTOKOLÜ (Claude Code her görevde buna uyar)

1. **Sıra zorunlu:** Görevler bağımlılık sırasıyla dizildi. `[ ]` işaretli ilk görevden başla. Sırayı atlama; atlaman gerekiyorsa nedenini yaz ve dur.
2. **Görev döngüsü:** Bağlamı oku → dosyaları incele (bu dosyadaki tespitler eskimiş olabilir, önce mevcut kodu doğrula) → uygula → DOĞRULAMA komutlarını çalıştır → hataları düzelt → görevi `[x]` yap ve "Notlar" satırına tek cümle sonuç yaz.
3. **Push'tan önce DUR:** Görev bitince kısa özet ver (değişen dosyalar, doğrulama sonuçları, riskler) ve açık "push" onayı bekle. Onaysız push yok.
4. **Kapsam disiplini:** Görev tanımının dışına çıkma. Yolda bulduğun başka sorunu düzeltme; bu dosyanın sonundaki `## BULUNAN YENİ SORUNLAR` bölümüne not düş.
5. **Değişmezler (her görevde geçerli):**
   * Frontend HTTP yalnız `app/lib/api.ts → fetchAPI` üzerinden. Asla raw `fetch`/`axios`.
   * Yeni her DRF endpoint'ine açık permission sınıfı (`IsAuthenticated`/`IsAdminUser`/`IsOwner`/`IsVerifiedAgent`/`IsAgentOwner`). `AllowAny` yalnız gerçekten public listelerde.
   * Para/kontenjan yazan her işlem: `transaction.atomic()` + `select_for_update()` (örnek desen: `backend/bookings/views.py create()`).
   * Fiyat daima server-side hesaplanır. Client'tan gelen `total_price` asla kullanılmaz.
   * Secret/URL hardcode yok; `process.env.NEXT_PUBLIC_API_URL` vb.
   * `Tour.id` SlugField'dır (string PK) — integer varsayma; slug çakışmasını kontrol et.
6. **Standart doğrulama seti** (aşağıda "STD-CHECK" diye anılır):

```bash
cd backend && python manage.py makemigrations --check --dry-run && python manage.py migrate --check && python manage.py test
cd .. && npx tsc --noEmit && npx next lint

# duplicate model field taraması:
python - <<'EOF'
import ast,os
for r,d,fs in os.walk('backend'):
    d[:]=[x for x in d if x not in('.git','__pycache__','migrations')]
    for f in fs:
        if f=='models.py' or f.endswith('_models.py'):
            p=os.path.join(r,f); tree=ast.parse(open(p).read())
            for n in ast.walk(tree):
                if isinstance(n,ast.ClassDef):
                    seen={}
                    for s in n.body:
                        if isinstance(s,ast.Assign) and isinstance(s.targets[0],ast.Name):
                            t=s.targets[0].id
                            if t in seen: print(f'DUPLICATE: {p}:{n.name}.{t}')
                            seen[t]=1
EOF
```

7. **Commit mesajı formatı:** `feat|fix|chore(scope): açıklama [GÖREV-ID]` — ör. `fix(middleware): rename proxy.ts to middleware.ts [F1-01]`.

---

## FAZ 1 — GERÇEK REZERVASYON UÇTAN UCA

> Önce bu faz bitmeden Faz 2'ye geçme.

### [x] F1-01 · Middleware'i çalışır hale getir (`proxy.ts` → `middleware.ts`)

**Öncelik:** P0 · **Efor:** S

**Bağlam:** Next.js middleware'i yalnız kök `middleware.ts` dosyasını tanır. Repo'da `proxy.ts` var, export adı `proxy` — yani middleware hiç çalışmıyor.

**Adımlar:**
1. `proxy.ts` → `middleware.ts` taşı; `export async function middleware(request: NextRequest)` imzasına çevir.
2. Hardcoded `13.37.13.37` mock ban'ını ve yanıltıcı "GLOBAL SECURITY MIDDLEWARE" yorumunu kaldır. Şimdilik minimal tut: sadece `NextResponse.next()` + config matcher (`/dashboard/:path*`). Rol kontrolü F3-02'de gelecek.
3. `proxy.ts`'i sil.

**Doğrulama:** `npm run dev` ile middleware'in yüklendiğini logdan teyit; STD-CHECK.

**Bitti sayılır:** Kökte çalışan `middleware.ts` var, `proxy.ts` yok.

**Notlar:** Kökte minimal `middleware.ts` oluşturuldu (`matcher: /dashboard/:path*`), mock IP ban'ı ve yanıltıcı yorum kaldırıldı, `proxy.ts` silindi; `tsc --noEmit` temiz — lint'te F1-01 dışı 2 önceden var olan hook hatası kaldı (aşağıya notlandı).

---

### [x] F1-02 · Sahte sosyal kanıt ve güven rozetlerini temizle

**Öncelik:** P0 · **Efor:** S

**Bağlam:** Canlı footer'da "9.906 değerlendirme ★ Trustpilot" var — gerçek Trustpilot hesabı yok. Checkout'ta "PCI-DSS uyumlu", "3D SECURE" rozetleri var — henüz doğru değil. Footer'da honeypot linkleri ("Admin Configuration", "User Database Export", "Login to Secret Panel") gerçek kullanıcıya görünüyor.

**Adımlar:**
1. Footer bileşenini bul (`app/components/` içinde ara: "Trustpilot", "9.906"). Trustpilot bloğunu tamamen kaldır.
2. Checkout ve diğer sayfalardaki "PCI-DSS / 3D Secure / 256-BIT" iddialarını kaldır; yalnız jenerik "Güvenli ödeme" ifadesi kalabilir.
3. Honeypot linklerini görsel DOM'dan çıkar (istersen `robots.txt`-only veya `hidden`+`aria-hidden` değil — tamamen kaldır; honeypot API route'ları F3-04'te ele alınacak).
4. Footer'daki hardcoded döviz kurları bölümünü kaldır (gerçek kur F4-03'te gelecek; o zamana kadar yanlış kur göstermek zarar).

**Doğrulama:** `grep -rn "Trustpilot\|9.906\|PCI\|honeypot" app/ | grep -v api/` boş dönmeli; STD-CHECK.

**Notlar:** Footer'dan Trustpilot bloğu ve "Canlı Kur Referansları" barı kaldırıldı (bar hardcoded kurlarla başlayıp 3 sn'de bir `Math.random()` ile dalgalandırıyordu — tamamen uydurma veriydi); `HoneypotTraps` bileşeni silinip `layout.tsx`'ten çıkarıldı; PCI-DSS / 3D Secure / 256-bit iddiaları checkout, tur detay, CheckoutForm, SecurePaymentForm, cart ve chatbot yanıtından temizlenip jenerik "Güvenli ödeme" ifadesiyle değiştirildi. tsc + lint + `npm run build` temiz.

---

### [x] F1-03 · Checkout'tan ham kart formunu ve mock'ları söküp Stripe Elements'e geç

**Öncelik:** P0 · **Efor:** M

**Bağlam:** `app/checkout/page.tsx` kendi inputlarında kart no/CVC topluyor (`cardForm` state) ve `MOCK_SAVED_CARDS` gösteriyor. Gerçek PSP'de bu PCI ihlali.

**Adımlar:**
1. `@stripe/stripe-js` + `@stripe/react-stripe-js` ekle.
2. `MOCK_SAVED_CARDS`, `cardForm`, `getCardType` ve tüm kart input UI'sini sil.
3. Ödeme adımını `<Elements>` + `<PaymentElement>` ile değiştir; `client_secret` F1-04'ün API'sinden gelecek (bu görevde prop/placeholder olarak bağla, F1-04'te canlanır).
4. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env değişkeni; `.env.example`'a ekle.

**Doğrulama:** Kod tabanında kart numarası tutan state/input kalmadığını grep ile göster (`grep -rn "cvc\|cardNumber\|card_number" app/`); STD-CHECK.

**Not:** Stripe TR'de tahsilat yapamaz — bu sandbox/mimari adımıdır; PSP adapter F2-06'da iyzico/PayTR'a çevrilecek. Elements soyutlaması bu geçişi kolaylaştırır.

**Notlar:** Stripe paketleri zaten `package.json`'da mevcuttu (adım 1 hazırdı). `app/components/StripePaymentSection.tsx` eklendi (deferred-intent modunda `<Elements>` + `<PaymentElement>`, `onConfirmPayment` prop'u F1-04'te canlanacak). `app/checkout/page.tsx`'ten `MOCK_SAVED_CARDS`, `getCardType`, `cardForm`/`selectedSavedCard` state'i, kayıtlı kart karuseli, ham kart formu ve "canlı kart ön izleme" paneli silindi (~370 satır). `app/page.tsx`'te hiç açılmayan (ölü) ikinci bir ham kart modalı bulundu ve silindi. Sahipsiz `app/components/SecurePaymentForm.tsx` (ham kart state'i tutuyordu) silindi. `.env.example`'a `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` eklendi. Doğrulama: grep'te kart tutan state/input kalmadı (kalanlar yorum + Stripe hata mesajı), `tsc --noEmit` temiz, `npm run lint` temiz, `npm run build` başarılı.

---

### [x] F1-04 · Checkout'u Django rezervasyon akışına bağla (simülasyonun sonu)

**Öncelik:** P0 · **Efor:** L

**Bağlam:** `handleSimulatePaymentProcess()` → `setTimeout` → `localStorage("demo_new_bookings")`. Backend'de gerçek akış hazır: `POST /bookings/` → atomic kontenjan kilidi → Stripe PaymentIntent → webhook'ta `confirmed` (`backend/bookings/views.py`).

**Adımlar:**
1. Backend'i incele: `bookings/views.py create()` ve `bookings/serializers.py` — istek gövdesinin beklediği alanları çıkar (tour slug, start_date, guests, misafir bilgileri...). Eksikse serializer'a misafir alanlarını ekle (ad, e-posta, telefon, otel).
2. Checkout Step 1 (bilgi formu) → Step 2 geçişinde `fetchAPI('/bookings/', {method:'POST', body})` çağır; dönen `client_secret`'ı F1-03'teki `<Elements>`'e ver.
3. `handleSimulatePaymentProcess`, `demo_new_bookings`, `vip_membership` localStorage yazımlarını tamamen sil.
4. Ödeme onayı: `stripe.confirmPayment` → `return_url = /checkout-success?ref=<booking_ref>`.
5. `app/checkout-success/page.tsx`: `fetchAPI('/bookings/<ref>/')` ile durum sorgula; `pending` ise "onay bekleniyor" + polling (webhook async), `confirmed` ise bilet linki.
6. Fiyat gösterimi backend'in döndürdüğü tutardan; frontend'deki `calculateBundleDiscount` yalnız görsel tahmin olarak kalamaz — kaldır, combo F5'e ertelendi.

**Doğrulama:** Stripe test kartıyla uçtan uca: Booking kaydı `pending→confirmed`, `TourAvailability.quota` düşer (`manage.py shell` ile teyit), webhook idempotency (aynı event'i `stripe trigger` ile iki kez gönder — kontenjan bir kez düşmeli). STD-CHECK.

**Bitti sayılır:** `grep -rn "demo_new_bookings\|handleSimulatePayment" app/` boş.

**Notlar:** Backend: `Booking` modeline misafir alanları eklendi (`guest_full_name`, `guest_email`, `guest_phone`, `guest_hotel`) + migration `0005`; serializer `fields`'a eklendi; `views.py create()` bu alanları uzunluk kırpmasıyla yazıyor, ayrıca `service_type` (`tour`/`meal`) ve `guests` girdi doğrulaması eklendi. Frontend: `app/checkout/page.tsx` artık `fetchAPI('/bookings/', {method:'POST'})` çağırıyor (fiyat gönderilmiyor — sunucu hesaplıyor), dönen `clientSecret` `StripePaymentSection`'a veriliyor; `StripePaymentSection` deferred-intent yerine clientSecret moduna geçirilip `stripe.confirmPayment` ile `return_url`'e yönlendiriyor. `handleSimulatePaymentProcess`, sahte "step 3" başarı ekranı, `persistMockBooking`, `calculateBundleDiscount`/`bundleLogic`, promosyon kodu bloğu ve combo/upsell modalı tamamen silindi (~330 satır). `app/checkout-success/page.tsx` sıfırdan yazıldı: `?ref=` ile `fetchAPI('/bookings/<id>/')` sorgusu, `pending` iken 3 sn'de bir max 20 kez polling + "onay bekleniyor" ekranı, `confirmed` iken bilet linki; eski ham `fetch('/api/bookings')` (F1-05'te silinecek ölü route) ve koşulsuz "onaylandı" mesajı kaldırıldı. **Sapma:** görev metni `?ref=<booking_ref>` diyor ama DRF router lookup'ı UUID `id` üzerinden olduğu için `ref` parametresi UUID taşıyor (backend URL değişikliği gerekmesin diye). `app/restaurant-menu/[slug]/page.tsx`'teki `demo_new_bookings` okuması (yazan taraf silindiği için artık hep `false` dönerdi) gerçek `fetchAPI('/bookings/')` sorgusuna çevrildi. Doğrulama: `tsc --noEmit` temiz, `npm run lint` temiz, `npm run build` başarılı, `makemigrations --check` "No changes detected", `migrate --check` OK, `manage.py test` 29/29 OK, AST duplicate taraması temiz, bitti-sayılır grep'i boş. Uçtan uca Stripe test kartı doğrulaması yapılmadı (canlı Stripe anahtarı/webhook tüneli yok) — F2 öncesi manuel doğrulama gerekiyor.

---

### [ ] F1-05 · Ölü Next.js ödeme/rezervasyon route'larını sil

**Öncelik:** P0 · **Efor:** M

**Bağlam:** Django canonical akışla çakışan paralel route'lar: `app/api/create-payment-intent/`, `app/api/webhooks/payment/`, `app/api/webhooks/cancellation/`, `app/api/bookings/`, `app/api/inventory/lock/`.

**Adımlar:**
1. Önce referans taraması: `grep -rn "create-payment-intent\|api/bookings\|inventory/lock\|webhooks/payment" app/ --include="*.tsx" --include="*.ts"` — kullanan bileşen varsa önce onları F1-04 akışına çevir.
2. Route klasörlerini ve artık kullanılmayan `app/lib/orderCalculator*` bağımlılıklarını sil.
3. `app/api/tickets/validate/` ŞİMDİLİK kalsın (F2-05'te backend karşılığı yazılınca silinecek) — dosyanın başına `// DEPRECATED: F2-05'te silinecek` notu koy.

**Doğrulama:** Build geçer (`npm run build`), silinen route'lara referans kalmadı; STD-CHECK.

**Notlar:** _

---

### [ ] F1-06 · İptal akışını müşteri biletine bağla

**Öncelik:** P1 · **Efor:** M

**Bağlam:** Backend `cancel` action + refund + kontenjan geri yazma hazır (`bookings/views.py`). `app/dashboard/customer/tickets/page.tsx` kısmen fetchAPI kullanıyor ama iptal butonu gerçek akışa bağlı değil.

**Adımlar:**
1. Tickets sayfasında her `confirmed` bilet için "İptal et" → onay modalı → `fetchAPI('/bookings/<id>/cancel/', POST)`.
2. Backend'de iptal kısıtı: tur tarihine < 24 saat kala iptal reddi (basit sabit kural; politika motoru F4-04'te esnekleşecek). Yoksa ekle.
3. Başarılı iptalde UI durumu `cancelled`, iade bilgisi mesajı.

**Doğrulama:** Test: iptal → Stripe refund mock/sandbox → kontenjan geri döner (shell teyidi). STD-CHECK.

**Notlar:** _

---

## FAZ 2 — ACENTE PANELİ GERÇEK VERİYE

> Acente tur ekleyip satabilir hale gelir.

### [ ] F2-01 · Agency Tours sayfası: gerçek CRUD

**Öncelik:** P0 · **Efor:** L

**Bağlam:** `app/dashboard/agency/tours/page.tsx` (394 satır) sıfır fetchAPI — hardcoded state. Backend `agencies/agency_tours_views.py` mevcut.

**Adımlar:**
1. Backend'i incele: endpoint path'leri, serializer alanları, permission'lar (`IsVerifiedAgent` olmalı — yoksa ekle).
2. Liste: `fetchAPI('/agency/tours/')`; kart başına doluluk özeti, durum (taslak/yayında).
3. Oluştur/Düzenle formu: title, slug (otomatik üret + benzersizlik ön-kontrolü `fetchAPI` HEAD/exists sorgusu veya submit hatası yakalama), fiyat, kapasite default'u, kategori, süre, açıklama, rota noktaları.
4. Görsel yükleme: `multipart/form-data` — `fetchAPI`'nin FormData desteğini kontrol et, yoksa `Content-Type` otomatik bırakan dal ekle (bu, değişmez-1'in izinli istisnası değildir; fetchAPI içinde çöz).
5. Onaysız acente durumu: `AuthContext` user status'ü `onaylandi` değilse sayfa yerine "Başvurunuz inceleniyor" durum ekranı (F2-04 ile ortak bileşen).

**Doğrulama:** Panelden eklenen tur `/search` API'sinde ve `/tour/<slug>` sayfasında görünür. A acentesi B'nin turunu düzenleyemez (401/403 testi). STD-CHECK.

**Notlar:** _

---

### [ ] F2-02 · Kontenjan Takvim Editörü (acentenin ana ekranı)

**Öncelik:** P0 · **Efor:** L

**Bağlam:** `TourAvailability` gün bazlı quota tutuyor; panelde yönetim yok (`seed_availabilities.py` ile elle basılıyor).

**Adımlar:**
1. Backend: `GET/PUT /agency/tours/<slug>/availability/?month=YYYY-MM` (bulk upsert destekli, `IsAgentOwner`), gün bazlı `quota`, `booked` (hesaplanan), opsiyonel `price_override` alanı (migration).
2. Frontend: `app/dashboard/agency/tours/[slug]/calendar/page.tsx` — aylık grid; gün hücresi: kontenjan/satılan, renk kodu (boş/az/dolu/kapalı); tıkla-düzenle; çoklu seçim + "seçili günlere uygula" (kontenjan, fiyat, kapat/aç); "hafta içi/hafta sonu" hızlı filtre.
3. Bulk kayıt tek istekte, backend'de `transaction.atomic()`; `booked > yeni quota` olacak güne düşürme girişiminde uyarı ve reddet.

**Doğrulama:** 30 günlük kontenjan girişi < 2 dk (manuel senaryo); eşzamanlı satış race testi (`threading` test — overbooking yok). STD-CHECK.

**Notlar:** _

---

### [ ] F2-03 · Agency Bookings: rezervasyon yönetimi + günlük manifest

**Öncelik:** P0 · **Efor:** M

**Bağlam:** `bookings/page.tsx` (315 satır) sıfır fetchAPI.

**Adımlar:**
1. `fetchAPI('/agency/bookings/?date=&status=&tour=')` — backend'de bu filtreli endpoint yoksa ekle (`IsAgentOwner`, yalnız kendi turlarının rezervasyonları).
2. Liste: misafir adı, pax, iletişim, otel (pickup), durum; durum rozetleri.
3. "Günlük Manifest" görünümü: tarih seç → o günün tüm rezervasyonları, yazdırma-dostu (`@media print`) sayfa.
4. No-show işaretleme: `PATCH /agency/bookings/<id>/` (yalnız `no_show` alanı — mass assignment koruması: serializer'da `fields` kısıtlı).
5. WebSocket canlı bildirim: mevcut Channels altyapısına acente grubu — kapsam büyürse bu maddeyi `F5`e ertele ve not düş.

**Doğrulama:** İzolasyon testi (A acentesi B'nin rezervasyonunu göremez); manifest çıktısı. STD-CHECK.

**Notlar:** _

---

### [ ] F2-04 · Onboarding durum makinesi UI + panel gating

**Öncelik:** P1 · **Efor:** M

**Bağlam:** Backend stepper hazır (`onboarding_views.py`; status: taslak/beklemede/inceleniyor/onaylandi/reddedildi/eksik_bilgi). Panel bu duruma göre davranmıyor.

**Adımlar:**
1. `AuthContext` user objesine agency `status` alanını ekle (backend `/auth/user/` serializer'ına dahil et).
2. Ortak `<OnboardingGate>` bileşeni: `onaylandi` → children; `eksik_bilgi` → eksik alanlar vurgulu stepper linki + admin notu; `beklemede/inceleniyor` → durum ekranı; `reddedildi` → gerekçe.
3. `dashboard/agency/*` ve `dashboard/restaurant/*` sayfalarını bu gate ile sar.
4. Admin `basvurular` sayfasında onay/ret/eksik-bilgi aksiyonlarını uçtan uca test et; ret gerekçe alanı zorunlu.
5. TÜRSAB belge alanının yalnız "seyahat acentası" iş tipinde zorunlu olduğunu (restoran muaf) serializer'da doğrula.

**Doğrulama:** Onaysız acente token'ı ile tüm agency CRUD endpoint'leri 403 döner (test yaz). STD-CHECK.

**Notlar:** _

---

### [ ] F2-05 · Bilet doğrulama (check-in) backend + Scanner bağlantısı

**Öncelik:** P1 · **Efor:** M

**Adımlar:**
1. Backend: `POST /bookings/<booking_ref>/checkin/` — `IsAgentOwner` (rezervasyonun turunun acentesi), `confirmed` değilse veya zaten check-in ise anlamlı hata; `checked_in_at` alanı (migration).
2. `agency/scanner` ve `restaurant/scanner` sayfalarını bu endpoint'e bağla; başarı/çift-okuma/geçersiz durumları ayrı renk+titreşimle.
3. `app/api/tickets/validate/` route'unu sil (F1-05'teki DEPRECATED notu).
4. Müşteri biletine QR ekle (`booking_ref` içerikli) — `customer/tickets` sayfası.

**Doğrulama:** Aynı QR ikinci okutmada "zaten kullanıldı"; başka acentenin bileti 403. STD-CHECK.

**Notlar:** _

---

### [ ] F2-06 · PSP adapter katmanı + iyzico/PayTR hazırlığı

**Öncelik:** P0 (başvuru) / P1 (kod) · **Efor:** XL

**Bağlam:** Stripe Türkiye'de yerleşik işletmeden tahsilat yapamaz — gerçek gelir için iyzico Pazaryeri veya PayTR Platform Transfer şart. `Agency.sub_merchant_id` alanı hazır; `.env.example`'da iyzico/PayTR anahtar placeholder'ları var.

**Adımlar:**
1. **İNSAN AKSİYONU (kod değil):** iyzico Pazaryeri + PayTR Platform başvurularını başlat — Claude Code bu maddeyi kullanıcıya hatırlatır ve bekler; onay süreci haftalar alabilir, kod sandbox anahtarlarıyla ilerler.
2. `backend/bookings/payments/` paketi: `PaymentProvider` interface (`create_intent`, `refund`, `verify_webhook`, `split_commission`), `StripeProvider` (mevcut kod taşınır), `IyzicoProvider` iskeleti.
3. `views.py` doğrudan `stripe.*` çağrılarını provider üzerinden geçir; provider seçimi env ile.
4. Acente onboarding'ine alt-üye işyeri kaydı adımı (iyzico submerchant API) — sandbox.
5. Komisyon: `Agency.commission_rate` → split hesapları `AgentFinanceLedger`'a işlenir (Decimal, idempotent `get_or_create` deseni korunur).

**Doğrulama:** Sandbox uçtan uca: ödeme → split → ledger kaydı; refund → ters kayıt. Stripe akışı regresyonsuz. STD-CHECK.

**Notlar:** _

---

### [ ] F2-07 · Agency Finance sayfası: ledger + payout bağlantısı

**Öncelik:** P1 · **Efor:** M

**Bağlam:** `finance/page.tsx` (284 satır) hardcoded `transactions` state; backend `finance_views.py` + `AgentFinanceLedger`/`AgentPayoutRequest` hazır.

**Adımlar:** Bakiye kartı (ledger toplamı), hareket listesi (satış/komisyon/iade/ödeme filtreleri), payout talebi formu (IBAN maskeli gösterim, tutar ≤ bakiye), talep durum takibi, CSV ekstre indirme endpoint'i (`?month=`).

**Doğrulama:** Panel bakiyesi == shell'de hesaplanan ledger toplamı; payout talebi admin panelinde görünür. STD-CHECK.

**Notlar:** _

---

## FAZ 3 — GÜVENLİK SERTLEŞTİRME

### [ ] F3-01 · E-posta altyapısı (işlemsel mailler)

**Öncelik:** P1 · **Efor:** M

**Adımlar:** Django e-posta backend'i (Resend/Postmark/SES — kullanıcıya sor, env ile); şablonlar: rezervasyon onayı (bilet linki), iptal/iade, acente onay/ret/eksik-bilgi, şifre sıfırlama. `verify-email`/`forgot-password`/`reset-password` sayfalarının backend uçlarını uçtan uca test et. `app/api/verify-email` route'u Django'ya taşınıp silinir.

**Doğrulama:** Console backend ile tüm şablonlar render; sandbox'ta gerçek gönderim. STD-CHECK.

**Notlar:** _

---

### [ ] F3-02 · Middleware'de rol bazlı route koruması

**Öncelik:** P1 · **Efor:** M

**Bağlam:** F1-01 minimal middleware kurdu; şimdi rol katmanı. Veri backend permission'larıyla zaten korunuyor — bu katman shell sızıntısı + UX içindir.

**Adımlar:** `middleware.ts`'te access token cookie varlığı + JWT payload decode (imza doğrulaması YAPMA — backend işi; sadece exp+role claim oku), `/dashboard/admin` → admin, `/dashboard/agency|restaurant` → ilgili rol, aksi halde `/login?next=`. Token yoksa login'e.

**Doğrulama:** Rol matrisi testi (customer token'ıyla /dashboard/admin → redirect). STD-CHECK.

**Notlar:** _

---

### [ ] F3-03 · Refresh token'ı HttpOnly cookie'ye taşı

**Öncelik:** P1 · **Efor:** L

**Bağlam:** İki token da `js-cookie` ile yazılıyor (`app/lib/auth.ts`) → XSS'te çalınabilir. Frontend (Vercel) ↔ backend ayrı domain.

**Adımlar:**
1. Backend login/refresh view'ları refresh token'ı `HttpOnly; Secure; SameSite=None; Domain=<api domain>` cookie olarak set etsin; response body'de yalnız access döner.
2. `CORS_ALLOW_CREDENTIALS=True`, frontend `fetchAPI`'ye `credentials:'include'`.
3. Access token yalnız memory'de (AuthContext); sayfa açılışında silent refresh (`/auth/refresh/`).
4. `auth.ts` sadeleşir; `secureVault` bağımlılıkları temizlenir. WS query-string token akışı korunur (access token'la).
5. Logout: backend cookie'yi temizler + refresh blacklist (simplejwt blacklist app).

**Doğrulama:** XSS senaryosu: `document.cookie`'de refresh görünmez; yenilemede oturum sürer; logout sonrası refresh 401. STD-CHECK.

**Notlar:** _

---

### [ ] F3-04 · Security-theater temizliği + gerçek rate limiting

**Öncelik:** P2 · **Efor:** M

**Adımlar:**
1. Sil/karar ver: `app/api/security/honeypot/*`, `behavioral/analyze`, `audit`, `backup/status`, `auth/check-pwned`, `auth/2fa` (2FA gerçek mi? Backend karşılığı yoksa UI'dan da kaldır ve `## BULUNAN YENİ SORUNLAR`a not düş), `session-check`. Çalışmayan hiçbir "güvenlik" görüntüsü kalmasın.
2. `app/lib/antiScraping.ts` fiyat karıştırma/tarpit — SEO ve erişilebilirliğe zarar veriyorsa kaldır (tur fiyatı Google'da görünmeli!). İncele, karar ver, gerekçele.
3. Django tarafı gerçek throttle: login/register/booking endpoint'lerine DRF throttle scope'ları; anon/user oranları settings'te.
4. In-memory `ipAttemptMap` gibi serverless'ta sıfırlanan yapılar kaldırıldıysa teyit.

**Doğrulama:** Throttle testi (arka arkaya istek → 429). STD-CHECK.

**Notlar:** _

---

### [ ] F3-05 · CSP nonce'a geçiş (`unsafe-inline` kaldır)

**Öncelik:** P2 · **Efor:** M

**Adımlar:** `next.config.ts` CSP'sini middleware-üretimli nonce modeline çevir; `layout.tsx`'teki analytics scriptleri (Google/Yandex/Baidu) nonce ile; `style-src` için gerekiyorsa hash. Sayfaların kırılmadığını görsel test et.

**Doğrulama:** Response header'da `unsafe-inline` yok; console'da CSP ihlali yok. STD-CHECK.

**Notlar:** _

---

### [ ] F3-06 · CI pipeline (GitHub Actions)

**Öncelik:** P2 · **Efor:** M

**Adımlar:** `.github/workflows/ci.yml`: STD-CHECK'in tamamı (backend test + migrate check + duplicate scan + tsc + lint + `npm run build`). PR'da zorunlu.

**Notlar:** _

---

### [ ] F3-07 · Para/kontenjan kritik test paketi

**Öncelik:** P1 · **Efor:** L

**Adımlar:** Testler: (a) eşzamanlı rezervasyon → overbooking yok; (b) webhook aynı event 2× → kontenjan 1× düşer; (c) iade → kontenjan geri; (d) komisyon Decimal doğruluğu; (e) `IsAgentOwner` izolasyonu; (f) fiyat manipülasyonu (client `total_price` gönderse bile sunucu hesabı kazanır).

**Notlar:** _

---

## FAZ 4 — MÜŞTERİ DENEYİMİ VE BÜYÜME

### [ ] F4-01 · Müsaitlik bazlı arama ve filtreler

**Öncelik:** P1 · **Efor:** L

**Adımlar:** `/search`: tarih filtresi (o gün `quota - booked > 0` olan turlar — `TourAvailability` join, `django_filters`), fiyat aralığı, kategori, süre, puan; URL-query senkronu; `select_related/prefetch_related` ile N+1 kontrolü (`django-debug-toolbar` ile say); boş sonuç ekranı alternatif tarih önerili.

**Doğrulama:** Filtre kombinasyon testleri; sorgu sayısı sabit. STD-CHECK.

**Notlar:** _

---

### [ ] F4-02 · Tur detay SSR/ISR + JSON-LD (SEO)

**Öncelik:** P1 · **Efor:** M

**Adımlar:** `/tour/[slug]` server component + `revalidate: 3600`; `generateMetadata` (title/desc/OG); JSON-LD: `TouristTrip` + `Product`(price) + `AggregateRating`(gerçek yorum verisi varsa); `next-sitemap` config tur slug'larını kapsasın; hreflang mevcut dillere.

**Doğrulama:** `curl` çıktısında içerik + JSON-LD görünür (JS'siz); Rich Results test. STD-CHECK.

**Notlar:** _

---

### [ ] F4-03 · Gerçek döviz kuru servisi

**Öncelik:** P2 · **Efor:** S

**Adımlar:** Backend'de günlük cache'li kur endpoint'i (TCMB XML veya exchangerate API); `LocaleContext` currency dönüşümünü buna bağla; gösterim "≈" işaretli, tahsilat daima TRY. F1-02'de kaldırılan footer kur bloğu istenirse gerçek veriyle geri gelir.

**Notlar:** _

---

### [ ] F4-04 · İptal/iade politikası motoru

**Öncelik:** P1 · **Efor:** M

**Adımlar:** `Tour.cancellation_policy` (choices: esnek/orta/kati + saat eşiği/iade yüzdesi tablosu), checkout ve bilette açık gösterim, `cancel` action'ı politikaya göre kısmi/tam iade hesaplar (F1-06'daki sabit 24s kuralının yerini alır), acente tur formunda politika seçimi.

**Doğrulama:** Politika matrisi birim testleri. STD-CHECK.

**Notlar:** _

---

### [ ] F4-05 · Tur sonrası doğrulanmış yorum akışı

**Öncelik:** P1 · **Efor:** M

**Adımlar:** Yorum yazma izni: yalnız tarihi geçmiş `confirmed` rezervasyon sahibi (backend kontrol); "Doğrulanmış katılımcı" rozeti; tur bitiminden 24s sonra davet e-postası (Django management command + cron/Celery beat — `app/api/cron/post-experience-review` route'u silinir); acente yanıtı panelde; `post-tour-review` sayfası bağlanır.

**Doğrulama:** Rezervasyonsuz kullanıcı yorum POST → 403. STD-CHECK.

**Notlar:** _

---

### [ ] F4-06 · WhatsApp/SMS bildirimleri

**Öncelik:** P1 · **Efor:** M

**Adımlar:** Sağlayıcı kararını kullanıcıya sor (Twilio / Netgsm / WhatsApp Cloud API). Olaylar: rezervasyon onayı, tur öncesi hatırlatma (pickup saat+nokta), iptal bildirimi, acenteye yeni rezervasyon. Şablonlar TR/EN. Gönderim asenkron (management command kuyruğu; Celery yoksa basit DB-kuyruk + cron).

**Notlar:** _

---

### [ ] F4-07 · Guest checkout (üyeliksiz satın alma)

**Öncelik:** P2 · **Efor:** M

**Adımlar:** E-posta+telefonla misafir rezervasyon; backend'de guest user stratejisi (e-postayla shadow user + claim akışı); ödeme sonrası "hesap oluştur, biletin hazır" daveti; bilet erişimi `booking_ref` + e-posta doğrulamalı link ile.

**Notlar:** _

---

## FAZ 5 — TAMAMLAYICI MODÜLLER VE TASARIM

### [ ] F5-01 · Transfer (shuttle) müşteri akışı

**Öncelik:** P1 · **Efor:** M

**Adımlar:** `app/transfer` sayfası: origin/destination/tarih → `ShuttleAvailability` saat slotları → pax seçimi (fiyat server-side `price_per_person × pax` gösterimi) → F1-04 checkout'unun `service_type='shuttle'` dalı (`_create_shuttle_booking` backend'de hazır). Acente `shuttles` panel sayfası gerçek CRUD (F2-01 deseninin kopyası).

**Notlar:** _

---

### [ ] F5-02 · Restaurant paneli gerçek veri + canlı rezervasyon

**Öncelik:** P1 · **Efor:** M

**Adımlar:** `dashboard/restaurant/*` sayfalarını `restaurant_views.py`'ye bağla (menü CRUD, masa/slot, rezervasyon listesi); WS canlı bildirim — frontend'in `?token=` query-string'i gönderdiğini doğrula (`agencies/consumers.py` bekliyor), göndermiyorsa ekle.

**Notlar:** _

---

### [ ] F5-03 · Combo (tur + restoran) uçtan uca

**Öncelik:** P2 · **Efor:** L

**Adımlar:** Backend combo fiyat hesabı (server-side indirim), tek ödemede iki rezervasyon atomik oluşturma (tek `transaction.atomic` bloğunda iki availability kilidi — deadlock önlemek için sabit kilit sırası), iki panelde ayrı görünüm, ComboCard'ın gerçek veriye bağlanması.

**Notlar:** _

---

### [ ] F5-04 · Chat modülü uçtan uca doğrulama

**Öncelik:** P2 · **Efor:** M

**Adımlar:** ChatRoom oluşturma tetikleyicisi (rezervasyon confirmed olunca?) netleştir; `group-chat` sayfası WS URL'ine token ekliyor mu; Redis (channels-redis) prod config; yalnız onaylı katılımcı erişimi testi.

**Notlar:** _

---

### [ ] F5-05 · Chat/Spa kapsam kararı — spa modülü

**Öncelik:** karar-P1 · **Efor:** L (yapılırsa)

**Bağlam:** Brief spa modülünden bahsediyor ama backend'de yok.

**Adımlar:** Kullanıcıya sor: Faz sonrasına mı ertelensin, yoksa `shuttles` şablonu kopyalanarak yazılsın mı? Yazılacaksa: `spa` app (SpaVenue/SpaService/SpaAvailability), aynı atomic desen, `Booking.service_type='spa'`, INSTALLED_APPS + router kaydı.

**Notlar:** _

---

### [ ] F5-06 · Design system konsolidasyonu

**Öncelik:** P2 · **Efor:** L

**Adımlar:** Tailwind theme token'ları (brand renkleri `#008cb3/#0B132B/...` → `brand.primary` vb., radius/gölge kademeleri); ortak `Button/Input/Card/Modal/Badge/Toast` bileşenleri (`app/components/ui/`); tüm `alert()` çağrıları Toast'a (checkout form doğrulama dahil); dashboard'larda ortak `DashboardShell` (sidebar+topbar+bildirim); dark-mode tutarlılık taraması. Sayfaları kademeli migrate et — tek PR'da her şeyi değiştirme.

**Notlar:** _

---

### [ ] F5-07 · İlk yükleme ve performans

**Öncelik:** P1 · **Efor:** M

**Adımlar:** Ana sayfa "MACERA YÜKLENİYOR" tam-ekran loading yerine: hero+kategoriler ISR/server-render, alt bölümler skeleton; tüm `<img>` → `next/image` (checkout'taki Wikimedia Visa/MC logoları → local SVG); Lighthouse mobil LCP < 2.5s hedefi (ölçüp rapora yaz).

**Notlar:** _

---

### [ ] F5-08 · Repo hijyeni

**Öncelik:** P2 · **Efor:** S

**Adımlar:** Kökteki `fix-*.js`, `update-*.js|py`, `extract_*.js`, `search_*.py`, `fix_images*.py` → `scripts/` altına (kullanılmayanları sil); `tsconfig.tsbuildinfo` gitignore + `git rm --cached`; `scratch/` ve `Archive_Old/` karar: sil veya `.gitignore`. README'yi create-next-app şablonundan gerçek proje README'sine çevir (kurulum, env, mimari özet).

**Notlar:** _

---

### [ ] F5-09 · Admin operasyon paneli metrikleri

**Öncelik:** P2 · **Efor:** M

**Adımlar:** `dashboard/admin`: GMV / rezervasyon sayısı / komisyon geliri / aktif acente kartları (aylık trend), payout onay kuyruğu (F2-07 taleplerini onayla/reddet), son rezervasyonlar, acente performans tablosu. Hepsi gerçek aggregate sorgular (`TruncMonth` + `Sum`).

**Notlar:** _

---

## BULUNAN YENİ SORUNLAR

Claude Code görev dışı bir sorun bulursa buraya ekler; kullanıcı önceliklendirir.

* ~~**[P0 · çökme] React Hooks kuralı ihlali — agency & restaurant dashboard layout.**~~ **ÇÖZÜLDÜ (upstream'de).** `useState(isMobileMenuOpen)` `if (isLoading || !user) return null;` erken dönüşünden SONRA çağrılıyordu; `isLoading` true→false geçişinde hook sayısı değiştiği için React "Rendered more hooks than during the previous render" ile çökebilirdi. Sorun eski yerel dalda tespit edildi; `origin/main`'de aynı düzeltme zaten yapılmış olduğu için rebase sırasında yerel düzeltme düştü. Güncel `main`'de `useState` doğru konumda ve `npm run lint` temiz.
* **[P2 · araç] `next lint` Next.js 16'da kaldırıldı.** TASKS.md'deki STD-CHECK `npx next lint` diyor ama Next 16 bu komutu kaldırdı ("Invalid project directory provided, no such directory: .../lint"). Doğru komut `npm run lint` (package.json'da `"lint": "eslint"`). STD-CHECK tanımı güncellenmeli.
* **[P1 · yanıltıcı] Footer'da desteklenmeyen ödeme yöntemleri listeleniyor.** `app/components/Footer.tsx` "Ödeme Yöntemleri" bölümünde VISA, mastercard, MİR, UnionPay, WeChat Pay ve Alipay rozetleri var; gerçekte yalnız Stripe entegrasyonu mevcut ve MİR/UnionPay/WeChat/Alipay hiçbir şekilde desteklenmiyor. F1-02 kapsamı dışı olduğu için dokunulmadı — F2-06'da (PSP adapter) gerçekten desteklenen yöntemlere göre güncellenmeli.
* **[P2 · ölü kod] `HoneypotTraps` kaldırıldı ama arkasındaki API'ler duruyor.** F1-02'de bileşen silindi; `app/api/security/honeypot/[id]/route.ts`, `app/api/security/honeypot/list/route.ts` ve `app/lib/honeypot.ts` hâlâ yerinde (artık hiçbir yerden linklenmiyor). Bunların silinmesi zaten F3-04 kapsamında.
* **[P2 · ölü kod] `app/components/CheckoutForm.tsx` sahipsiz.** Hiçbir yerden import edilmiyor. İçeriği zaten Stripe `<PaymentElement>` tabanlı (ham kart inputu yok), bu yüzden F1-03'te silinmedi. Ancak `StripePaymentSection` ile işlevi çakışıyor; F1-04'te ikisinden biri seçilip diğeri silinmeli. Ayrıca içinde bir "döviz kuru" çağrısı var, kontrol edilmeli.
* **[P2 · ölü kod] `app/lib/secureVault.ts` kart yardımcıları artık kullanılmıyor.** `formatCardInput`, `formatCvvInput`, `formatExpiryInput`, `maskCardNumber`, `storePaymentToken` tek kullanıcıları olan `SecurePaymentForm.tsx` F1-03'te silindiği için ölü kaldı. Dosyanın `isSessionValid`/`secureClear` kısmı `app/lib/auth.ts` tarafından hâlâ kullanılıyor, o yüzden dosya bütün olarak silinemez. F3-04'te (ölü kod temizliği) kart yardımcıları kaldırılmalı.
* **[P1 · yanıltıcı] `app/page.tsx`'te açılması imkânsız bir ödeme modalı vardı.** `showPaymentModal` state'i hiçbir yerde `true` yapılmıyordu; modal ham kart no/SKT/CVC inputları, sabit "₺14.500" tutar ve `alert('Ödeme simülasyonu başarıyla tamamlandı!')` içeriyordu. F1-03 doğrulama grep'inde yakalandı ve silindi (görev kapsamıyla doğrudan ilgili olduğu için istisnaen aynı commit'te).
* **[P2 · ölü kod] `recordFailedAttempt` import ediliyor ama kullanılmıyor.** `app/checkout/page.tsx:8`. Rate-limit sayacı hiç artırılmıyor olabilir; `checkRateLimit("checkout_attempts")` çağrılıyor fakat başarısız deneme kaydedilmiyor. F1-04'te ödeme hata yolu gerçek hale gelince gözden geçirilmeli.
* **[P0 · bug] `AgentFinanceLedger.create_from_booking` float/Decimal karışımıyla patlıyor.** `backend/agencies/finance_models.py:67` → `TypeError: unsupported operand type(s) for /: 'float' and 'decimal.Decimal'`. `manage.py test` sırasında `bookings/signals.py:113` bu hatayı yakalayıp logluyor, yani testler "OK" geçiyor ama **her rezervasyonda acente komisyon kaydı sessizce oluşturulmuyor**. F1-04 kapsamı dışı (mevcut bug, benim değişikliğimden bağımsız) ama para ile ilgili olduğu için P0 — `gross`'un Decimal'e çevrilmesi gerek.
* **[P1 · eksik akış] Restoran menüsü checkout'u kırık.** `/checkout?menuId=<id>&type=meal` linki (`app/restaurant-menu/[slug]/page.tsx` "Hemen Al") `tourId` göndermiyor; checkout `tourId` olmadan çalışamıyor. F1-04'te sahte başarı ekranı yerine dürüst bir "restoran menüsü rezervasyonu henüz çevrimiçi ödemeye açık değildir" mesajı gösterildi. Backend'de `DiningReservationViewSet` (`restaurant/reservations`) var ama ödemesiz ayrı bir akış. Yemek satın alma akışı baştan tasarlanmalı.
* **[P2 · ölü kod] `vip_membership` localStorage'ını artık kimse yazmıyor.** F1-04'te tek yazan yer (checkout simülasyonu) silindi; `app/tour/[slug]/page.tsx:93` ve `app/taste/page.tsx:115` hâlâ okuyor, dolayısıyla VIP indirimi/rozeti artık hiç tetiklenmiyor. Ya gerçek bir üyelik modeli backend'e eklenmeli ya da bu okuma dalları silinmeli.
* **[P2 · ortam] Yerel geliştirme ortamı kurulu değildi.** `node_modules` yoktu (`npm install` ile kuruldu). Backend için Python venv de yok (`backend/venv`, `.venv` bulunamadı, `django` global olarak da kurulu değil) — bu yüzden STD-CHECK'in backend yarısı (makemigrations --check / migrate --check / test) F1-01'de çalıştırılamadı. F1-01 yalnız frontend dosyası değiştirdiği için sonucu etkilemez, ancak F1-04'ten itibaren backend ortamı şart.

---

## TAMAMLANANLAR GÜNLÜĞÜ

Format: `2026-MM-DD · F1-01 · tek satır özet · commit hash`

* _
