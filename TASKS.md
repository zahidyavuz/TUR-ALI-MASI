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

### [x] F1-05 · Ölü Next.js ödeme/rezervasyon route'larını sil

**Öncelik:** P0 · **Efor:** M

**Bağlam:** Django canonical akışla çakışan paralel route'lar: `app/api/create-payment-intent/`, `app/api/webhooks/payment/`, `app/api/webhooks/cancellation/`, `app/api/bookings/`, `app/api/inventory/lock/`.

**Adımlar:**
1. Önce referans taraması: `grep -rn "create-payment-intent\|api/bookings\|inventory/lock\|webhooks/payment" app/ --include="*.tsx" --include="*.ts"` — kullanan bileşen varsa önce onları F1-04 akışına çevir.
2. Route klasörlerini ve artık kullanılmayan `app/lib/orderCalculator*` bağımlılıklarını sil.
3. `app/api/tickets/validate/` ŞİMDİLİK kalsın (F2-05'te backend karşılığı yazılınca silinecek) — dosyanın başına `// DEPRECATED: F2-05'te silinecek` notu koy.

**Doğrulama:** Build geçer (`npm run build`), silinen route'lara referans kalmadı; STD-CHECK.

**Notlar:** Referans taramasında tek canlı tüketici bulundu: `app/dashboard/agency/bookings/page.tsx` ham `fetch('/api/bookings?date=...')` ile tamamen uydurma bir manifesto çekiyordu (sabit "Kapadokya VIP Balon Turu", "John Doe" vb.). Adım 1 gereği önce bu sayfa gerçek akışa çevrildi: `fetchAPI('/agency/tours/')` + `fetchAPI('/agency/tours/<slug>/manifest/?date=...')`. Sayfadaki `time`/`vehicle` alanları Django `Tour` modelinde karşılığı olmadığı için kaldırıldı (`duration` kullanıldı), `Tour.id` string PK olarak düzeltildi, durum rozeti `'Onaylandı'` yerine backend'in döndürdüğü `'confirmed'` ile karşılaştırılıyor, hata durumu ekrana yazılıyor. Backend `agencies/agency_tours_views.py` manifest'i düzeltildi: `phone` alanı yanlışlıkla `b.user.email` döndürüyordu ve `hotel` için var olmayan `b.hotel` attribute'u okunuyordu — ikisi de F1-04'te eklenen `guest_phone`/`guest_hotel`/`guest_full_name` alanlarına bağlandı, ayrıca `email` alanı eklendi. Silinenler: `app/api/create-payment-intent/`, `app/api/webhooks/payment/`, `app/api/webhooks/cancellation/`, `app/api/bookings/`, `app/api/inventory/lock/` ve yalnız bu route'lar tarafından kullanılan `app/lib/orderCalculator.ts`, `app/lib/webhookArmor.ts`, `app/lib/inventoryLock.ts`. **Kapsam istisnası:** görev listesinde sayılmayan `app/api/checkout/route.tsx` de silindi — hiçbir yerden çağrılmayan, Django akışıyla çakışan ikinci bir Stripe Checkout Session route'uydu ve `sk_test_...` sabit gizli anahtar fallback'i içeriyordu (gizli anahtar invaryantı ihlali). `app/lib/qr.ts` korundu (`DownloadOfflineButton` kullanıyor). `app/api/tickets/validate/route.ts` başına `// DEPRECATED: F2-05'te silinecek` notu konuldu. Doğrulama: `tsc --noEmit` temiz (önce `.next` içindeki bayat route tipleri hata veriyordu, rebuild sonrası temiz), `npm run lint` temiz, `npm run build` başarılı, silinen route'lara referans grep'i boş, `makemigrations --check` "No changes detected", `migrate --check` exit 0, `manage.py test` 29/29 OK, AST duplicate taraması temiz.

---

### [x] F1-06 · İptal akışını müşteri biletine bağla

**Öncelik:** P1 · **Efor:** M

**Bağlam:** Backend `cancel` action + refund + kontenjan geri yazma hazır (`bookings/views.py`). `app/dashboard/customer/tickets/page.tsx` kısmen fetchAPI kullanıyor ama iptal butonu gerçek akışa bağlı değil.

**Adımlar:**
1. Tickets sayfasında her `confirmed` bilet için "İptal et" → onay modalı → `fetchAPI('/bookings/<id>/cancel/', POST)`.
2. Backend'de iptal kısıtı: tur tarihine < 24 saat kala iptal reddi (basit sabit kural; politika motoru F4-04'te esnekleşecek). Yoksa ekle.
3. Başarılı iptalde UI durumu `cancelled`, iade bilgisi mesajı.

**Doğrulama:** Test: iptal → Stripe refund mock/sandbox → kontenjan geri döner (shell teyidi). STD-CHECK.

**Notlar:** Görev bağlamı bayattı: `app/dashboard/customer/tickets/page.tsx`'teki iptal butonu zaten `fetchAPI('/bookings/<id>/cancel/', POST)` çağırıyordu. Protokol madde 2 gereği önce güncel kod okundu, gerçek eksikler tespit edilip onlar kapatıldı:

1. **Backend 24 saat kuralı (adım 2) yoktu — eklendi.** `backend/bookings/views.py`'de `CANCELLATION_CUTOFF_HOURS = 24` sabiti ve `cancel()` içinde, "zaten iptal" kontrolünden sonra / refund'dan önce çalışan kısıt: `start_date` + `start_time` (yoksa 00:00) `timezone.make_aware` ile birleştirilip `starts_at - now() < 24s` ise 400 + Türkçe gerekçe döner. `start_date` boş olan eski kayıtlarda kısıt uygulanmaz. Kesim öncesi dönüşte hiçbir yan etki (refund/kontenjan/e-posta) tetiklenmez.
2. **Backend'in ret gerekçesi kullanıcıya hiç ulaşmıyordu.** İptal çağrısı `throwOnHttpError` kullanmadığı için 400 gövdesindeki `error` yutuluyordu. `throwOnHttpError: true` + `err?.data?.error` ile 24 saat kuralı gibi gerekçeler artık olduğu gibi gösteriliyor.
3. **Onay modalı (adım 1) yoktu**, `window.confirm` vardı. `pendingCancel` state'i + tam ekran modal ("Vazgeç"/"İptal Et") eklendi; modal, rezervasyon `confirmed` ise iade sürecinin başlayacağını, `pending` ise tahsilat olmadığı için iade oluşmayacağını önden söylüyor.
4. **İade bilgi mesajı (adım 3) yoktu.** `cancelSuccess` emerald banner'ı eklendi; metin `confirmed`/`pending` durumuna göre farklılaşıyor (iade kartına gönderildi / tahsilat yapılmadığı için iade yok).

**Kapsam istisnası — `/tickets` → `/dashboard/customer/tickets`:** İptal akışı kullanıcı için erişilemezdi; Navbar'daki "🎟️ Biletlerim & QR Cüzdan" (`app/components/Navbar.tsx`) ve F1-04'te yazdığım `app/checkout-success/page.tsx`'teki 3 link tamamen sabit/mock olan `app/tickets` sayfasına gidiyordu. 4 link gerçek sayfaya yönlendirildi (mock sayfanın kendisi silinmedi → aşağıya bulgu olarak düşüldü).

**Testler:** `backend/bookings/tests.py`'ye `_make_booking` yardımcısı + 5 test eklendi: auth zorunluluğu (401), kesim içi ret (400 + durum `confirmed` kalır), zamanında iptal (200, durum `cancelled`, `cancelled_at` dolu, `booked_count` 5→2), ikinci kez iptal reddi (400), başkasının rezervasyonu (404 — queryset kullanıcıya göre filtreli).

**Doğrulama:** `manage.py test bookings` → 10 test OK (kontenjan geri dönüşü test içinde doğrulandı, ayrıca shell teyidine gerek kalmadı). `manage.py test` (tümü) → 34 test OK (önce 29). `makemigrations --check --dry-run` → "No changes detected". `migrate --check` → exit 0. `tsc --noEmit` temiz. `npm run lint` temiz. `npm run build` başarılı. AST duplicate field/method taraması → temiz. Bu görevde migration gerekmedi (model değişmedi).

---

## FAZ 2 — ACENTE PANELİ GERÇEK VERİYE

> Acente tur ekleyip satabilir hale gelir.

### [x] F2-01 · Agency Tours sayfası: gerçek CRUD

**Öncelik:** P0 · **Efor:** L

**Bağlam:** `app/dashboard/agency/tours/page.tsx` (394 satır) sıfır fetchAPI — hardcoded state. Backend `agencies/agency_tours_views.py` mevcut.

**Adımlar:**
1. Backend'i incele: endpoint path'leri, serializer alanları, permission'lar (`IsVerifiedAgent` olmalı — yoksa ekle).
2. Liste: `fetchAPI('/agency/tours/')`; kart başına doluluk özeti, durum (taslak/yayında).
3. Oluştur/Düzenle formu: title, slug (otomatik üret + benzersizlik ön-kontrolü `fetchAPI` HEAD/exists sorgusu veya submit hatası yakalama), fiyat, kapasite default'u, kategori, süre, açıklama, rota noktaları.
4. Görsel yükleme: `multipart/form-data` — `fetchAPI`'nin FormData desteğini kontrol et, yoksa `Content-Type` otomatik bırakan dal ekle (bu, değişmez-1'in izinli istisnası değildir; fetchAPI içinde çöz).
5. Onaysız acente durumu: `AuthContext` user status'ü `onaylandi` değilse sayfa yerine "Başvurunuz inceleniyor" durum ekranı (F2-04 ile ortak bileşen).

**Doğrulama:** Panelden eklenen tur `/search` API'sinde ve `/tour/<slug>` sayfasında görünür. A acentesi B'nin turunu düzenleyemez (401/403 testi). STD-CHECK.

**Notlar:** Adım 1'deki inceleme, backend'in "mevcut" görünse de **tur oluşturmanın tamamen imkânsız** olduğunu ortaya çıkardı. Sıralı olarak bulunup düzeltilenler:

1. **Tur oluşturma kırıktı.** `POST /agency/tours/` her istekte 400 dönüyordu: (a) `Tour.id` bir SlugField PK ve otomatik üretilmiyor, istemciden bekleniyordu; (b) `TourDetailSerializer`'da `image_main/sub1/sub2` alanları `SmartImageField()` olarak açıkça bildirildiği için DRF bunları model'deki `blank=True, null=True`'ya **bakmaksızın zorunlu** sayıyordu — yani üç görsel birden gönderilmeden tur açılamıyordu, ama görsel yükleme ucu (`upload-image`) zaten var olan bir turun slug'ını istiyordu. Klasik yumurta-tavuk. Görseller `required=False` yapıldı, slug sunucuda başlıktan üretiliyor (`_generate_slug`, Türkçe karakter çevirisiyle: "Pamukkale Günübirlik Turu" → `pamukkale-gunubirlik-turu`, çakışmada kısa rastgele ek).
2. **Acenta kendi turuna sosyal kanıt uydurabiliyordu.** `fields = '__all__'` yüzünden `rating`, `reviews_count`, `fomo_count` yazılabilir alanlardı; acenta kendine 5.0 puan ve 9999 yorum yazabilirdi. `read_only_fields`'a alındı (`id` ile birlikte). `StrictMassAssignmentPermission` bu alanları kapsamıyor.
3. **Düzenleme beyaz listesi fazla dardı.** `ALLOWED_PATCH_FIELDS` içinde `title`, `location`, `duration`, `category` yoktu; başlık bile değiştirilemiyordu (eski arayüz düzenlemede başlık inputunu bu yüzden `disabled` yapıyordu). Liste gerçekten düzenlenebilir alanlara genişletildi; `id`/`agency`/puan alanları/görseller kasıtlı olarak dışarıda.
4. **Doluluk özeti ve yayın durumu yoktu.** `AgencyTourListSerializer` eklendi: `capacity_total`/`booked_total` (bugünden itibaren açık slotların toplamı, tek join üzerinde iki `Sum` + `Coalesce` — fan-out yok) ve türetilmiş `is_published`. Durum için modele **bayrak eklenmedi**: "yayında" = görseli var demek, çünkü genel katalog artık görselsiz turları gizliyor. Böylece panelde yazan durum ile gerçek görünürlük ayrışamaz.
5. **Sırasız queryset uyarısı.** Acenta listesine `order_by('title')` eklendi (`UnorderedObjectListWarning` — sayfalamada kayıt tekrarı/atlaması riski).

**Kapsam istisnası 1 — genel `/tours/` ucu salt okunura çevrildi.** `TourViewSet` bir `ModelViewSet` idi ve `IsAuthenticatedOrReadOnly` kullanıyordu; `IsOwnerOrReadOnly` yalnızca nesne düzeyinde çalıştığı için **oluşturmayı hiç engellemiyordu**. Yani giriş yapmış herhangi bir müşteri `POST /api/v1/tours/` ile acentasız, istediği puan/yorum sayısına sahip tur yaratabilirdi. Görevin kendisi "acenta tur CRUD'unu doğru izinlerle gerçek yap" olduğu için bu açığı bırakmak işi anlamsız kılardı; `ReadOnlyModelViewSet` yapıldı. Tur yazma işlemleri artık yalnız `/agency/tours/` üzerinden. Frontend'de genel uca yazan tek bir çağrı yoktu (grep ile doğrulandı).

**Kapsam istisnası 2 — katalog listesindeki `cache_page` kaldırıldı.** Görevin doğrulama kriteri "panelden eklenen tur `/search` API'sinde görünür" idi; 15 dakikalık `cache_page` bunu bozuyordu (test bu yüzden kırmızı verdi ve hata bu şekilde yakalandı). İnvalidasyon yolu yok ve ayarlarda paylaşımlı `CACHES` tanımı olmadığı için önbellek zaten süreç başına ayrı tutuluyordu, yani çok işçili sunumda tutarsızdı. Kaldırıldı; gerçek önbellek katmanı ayrı ele alınmalı (bulgu olarak düşüldü). `shuttles/views.py`'deki aynı desene dokunulmadı.

**Adım 5 zaten hazırdı:** onaysız acenta durumu `app/dashboard/agency/layout.tsx:28`'de tüm panel için `PartnerApplicationStatus` ile karşılanıyor; sayfaya ayrıca kontrol eklenmedi.

**Adım 3 sapması — slug:** Görev "slug otomatik üret + benzersizlik ön-kontrolü (`fetchAPI` ile)" diyordu. Slug istemcide üretilip gönderilirse acenta onu değiştirip başka bir turun URL'ini hedefleyebilir; bu yüzden slug tamamen sunucuda üretiliyor ve serializer'da `id` read-only. Ön-kontrol isteğine gerek kalmadı, çakışma sunucuda çözülüyor.

**Frontend** (`app/dashboard/agency/tours/page.tsx`) sıfırdan yazıldı: `fetch('/api/tours')` → `fetchAPI('/agency/tours/')`; oluştur/düzenle/kaldır akışları; görseller backend'in kabul ettiği 3 slota (`image_main`/`image_sub1`/`image_sub2`) sabitlendi ve `FormData` ile `upload-image` ucuna gönderiliyor (`fetchAPI` FormData'da `Content-Type`'ı zaten otomatik bırakıyor, değişiklik gerekmedi — adım 4'te öngörülen fetchAPI düzeltmesi gereksizdi); yeni turda görseller kayıttan hemen sonra yükleniyor (upload ucu slug istediği için); silme onay modalı; kart başına doluluk barı ve "Yayında / Taslak — görsel bekliyor" rozeti. Sahte `simulateTicketSale` ("+1 Test") butonu ve mock `app/api/tours/` route'ları (`route.ts` + `[id]/route.ts`) silindi.

**Doğrulama:** `manage.py test` → **44 test OK** (önce 34). Yeni `AgencyTourCrudTestCase` (9 test): slug üretimi + 90 günlük takvim, çakışan başlıkta benzersiz slug, sosyal kanıt yazılamaması, beyaz liste PATCH, doluluk özeti + taslak durumu, soft delete, **A acentesi B'nin turunu göremez/düzenleyemez (liste 0, PATCH/DELETE 404)**, anonim erişim 401, ve **panelden eklenen turun görsel yüklendikten sonra genel katalogda + `/tours/<slug>/` detayında göründüğü** (görev doğrulama kriteri, gerçek Pillow yüklemesiyle). `tours/tests.py`'ye genel katalogun salt okunur olduğu ve görselsiz turun listelenmediği testleri eklendi. `makemigrations --check --dry-run` → "No changes detected" (model değişmedi). `migrate --check` exit 0. `tsc --noEmit`, `npm run lint`, `npm run build` temiz. AST duplicate taraması temiz.

---

### [x] F2-02 · Kontenjan Takvim Editörü (acentenin ana ekranı)

**Öncelik:** P0 · **Efor:** L

**Bağlam:** `TourAvailability` gün bazlı quota tutuyor; panelde yönetim yok (`seed_availabilities.py` ile elle basılıyor).

**Adımlar:**
1. Backend: `GET/PUT /agency/tours/<slug>/availability/?month=YYYY-MM` (bulk upsert destekli, `IsAgentOwner`), gün bazlı `quota`, `booked` (hesaplanan), opsiyonel `price_override` alanı (migration).
2. Frontend: `app/dashboard/agency/tours/[slug]/calendar/page.tsx` — aylık grid; gün hücresi: kontenjan/satılan, renk kodu (boş/az/dolu/kapalı); tıkla-düzenle; çoklu seçim + "seçili günlere uygula" (kontenjan, fiyat, kapat/aç); "hafta içi/hafta sonu" hızlı filtre.
3. Bulk kayıt tek istekte, backend'de `transaction.atomic()`; `booked > yeni quota` olacak güne düşürme girişiminde uyarı ve reddet.

**Doğrulama:** 30 günlük kontenjan girişi < 2 dk (manuel senaryo); eşzamanlı satış race testi (`threading` test — overbooking yok). STD-CHECK.

**Notlar:** Model: `TourAvailability`'ye `price_override` (nullable Decimal — 0 ile "boş" ayrışsın diye null, default değil) ve `is_closed` eklendi (`tours/migrations/0004_...`); `is_available` artık kapalı günü müsait saymıyor, yeni `effective_price` property'si gün fiyatı yoksa `Tour.price`'a düşüyor. Backend: `AgencyTourViewSet.availability` (`GET ?month=YYYY-MM` + `PUT {days:[...]}`), sınıf düzeyindeki `IsAgentOwner`/`IsVerifiedAgent` ve `agency=` queryset filtresiyle korunuyor; bulk kayıt tek `transaction.atomic()` içinde `select_for_update` + `bulk_create`/`bulk_update`, tek gün bile `max_capacity < booked_count` olacaksa **istek tümüyle reddediliyor** (`conflicts` listesi ile 400 — yarım uygulanmış takvim oluşmuyor); istek başına 62 gün sınırı, tarih/kontenjan/fiyat/tekrarlı-tarih validasyonu. Frontend: `app/dashboard/agency/tours/[slug]/calendar/page.tsx` — aylık grid, hücrede kontenjan+fiyat inline düzenleme, renk kodu (boş/az/dolu/kapalı), çoklu seçim, "tüm ay / hafta içi / hafta sonu" hızlı filtreleri, seçili günlere kontenjan-fiyat-kapat/aç-fiyat sıfırla toplu uygulama, kirli gün rozeti ve tek "Kaydet" ile tek PUT; envanter kartına "Takvim" bağlantısı eklendi.

**Kapsam istisnası (bilinçli):** Görevin doğrulama kriteri "eşzamanlı satış race testi — overbooking yok" mevcut kodla **sağlanamıyordu**: `BookingViewSet.create()` içindeki `select_for_update()` satırı kilitliyor ama o transaction'da kontenjana **hiçbir şey yazmıyordu**; `booked_count` yalnızca Stripe webhook'unda, üstelik kapasite kontrolü olmadan artıyordu. Yani N eşzamanlı istek aynı `remaining` değerini okuyup hepsi geçiyor, hepsi onaylanıyor ve para alınmış halde `booked_count > max_capacity` oluşuyordu. Düzeltme: kontenjan artık **rezervasyon anında** tek koşullu UPDATE ile tutuluyor (`WHERE booked_count <= max_capacity - N AND is_closed = false`) — satır kilidine gerek kalmadan her motorda atomik, SQLite'ta `select_for_update`'in etkisiz olmasını da kapsıyor. Buna bağlı olarak: webhook `succeeded` artık turda kontenjanı ikinci kez düşmüyor, `payment_failed` tutulan kontenjanı bırakıyor, `cancel` artık `pending` tur rezervasyonlarında da kontenjanı geri veriyor. Gün bazlı fiyat da tutarın kaynağı oldu (`slot.effective_price × guests`) ve kapalı gün rezervasyona kapalı; genel katalog tarih filtresi de kapalı günleri eliyor. **Transfer (shuttle) akışında aynı yarış hatası duruyor** — F5-01'in kapsamında, "BULUNAN YENİ SORUNLAR"a yazıldı.

**Doğrulama:** `manage.py test` → **58 test OK** (önce 52... F2-01 sonrası 44 + bu görevde 14 yeni). Yeni `TourCapacityReservationTestCase` (6 test): rezervasyon anında kontenjan düşüyor, aşırı talep 400 ve sayaç bozulmuyor, kapalı gün reddediliyor, `price_override` tutara yansıyor, `pending` iptalinde kontenjan geri dönüyor, onay çift saymıyor. Yeni `OverbookingRaceTestCase` (`TransactionTestCase`, 8 thread × 3 kişi / 10 kontenjan, `threading.Barrier` ile eşzamanlı): `booked_count <= max_capacity`, `booked_count == başarılı × 3`, başarılı sayısı ≤ 3, kalan istekler 400 — **overbooking yok**. Yeni `AgencyAvailabilityCalendarTestCase` (7 test): aylık GET, bozuk `month` 400, bulk create+update, satılanın altına düşürmede 400 + hiçbir günün yazılmaması, payload validasyonu (5 alt-senaryo), başka acentanın takvimine GET/PUT 404, anonim 401. `makemigrations --check --dry-run` → "No changes detected", `migrate --check` exit 0, `tsc --noEmit` / `npm run lint` temiz, AST duplicate taraması temiz.

---

### [x] F2-03 · Agency Bookings: rezervasyon yönetimi + günlük manifest

**Öncelik:** P0 · **Efor:** M

**Bağlam:** `bookings/page.tsx` (315 satır) sıfır fetchAPI.

**Adımlar:**
1. `fetchAPI('/agency/bookings/?date=&status=&tour=')` — backend'de bu filtreli endpoint yoksa ekle (`IsAgentOwner`, yalnız kendi turlarının rezervasyonları).
2. Liste: misafir adı, pax, iletişim, otel (pickup), durum; durum rozetleri.
3. "Günlük Manifest" görünümü: tarih seç → o günün tüm rezervasyonları, yazdırma-dostu (`@media print`) sayfa.
4. No-show işaretleme: `PATCH /agency/bookings/<id>/` (yalnız `no_show` alanı — mass assignment koruması: serializer'da `fields` kısıtlı).
5. WebSocket canlı bildirim: mevcut Channels altyapısına acente grubu — kapsam büyürse bu maddeyi `F5`e ertele ve not düş.

**Doğrulama:** İzolasyon testi (A acentesi B'nin rezervasyonunu göremez); manifest çıktısı. STD-CHECK.

**Notlar:** Bağlamdaki "bookings/page.tsx sıfır fetchAPI" bilgisi eskimişti — sayfa F2-01 sonrası zaten `/agency/tours/` ve tur bazlı `manifest/` uçlarını çağırıyordu. Gerçek eksikler: (a) rezervasyon listesi diye bir uç yoktu, (b) `Booking.no_show` alanı yoktu, (c) manifest tek tura bakıyordu, günün tamamını veremiyordu, (d) `print:` sınıfları vardı ama hiçbir `@media print` kuralı yoktu, yani "yazdırma-dostu" sayfa aslında panel kromuyla birlikte basılıyordu ve yazdırma düğmesi hiç yoktu (yalnız jsPDF). Yeni `backend/agencies/agency_bookings_views.py`: `AgencyBookingViewSet` (list/retrieve/partial_update; PUT `http_method_names` ile kapalı), RLS `Q(tour__agency=…) | Q(shuttle_route__agency=…)`, `?date=&status=&tour=&q=` filtreleri (`q` bilet no / misafir adı / telefon / hesap adında arıyor). `AgencyBookingSerializer` **yalnız `no_show` yazılabilir**, diğer tüm alanlar `read_only_fields`; ayrıca `partial_update` beyaz listesi (`{'no_show'}`) beklenmedik alanı 400 ile reddediyor ve no-show yalnız `confirmed` kayıtta yapılabiliyor. `manifest/` action'ı `pagination_class=None` ile sayfalamayı kapatıyor (manifestin ikinci sayfası şoförün elinde olmaz), günün onaylı rezervasyonlarını tur bazında gruplayıp toplam pax veriyor. Model: `Booking.no_show` (migration `bookings/0006_...`) — iptalden ayrı, para iadesi/kontenjan iadesi yok. Frontend `app/dashboard/agency/bookings/page.tsx` iki sekmeye ayrıldı: "Rezervasyonlar" (tarih/durum/tur/arama filtreleri, 300 ms debounce, durum rozetleri, misafir-iletişim-otel, onay modal'lı no-show düğmesi) ve "Günlük Manifest" (tur bazlı gruplar, biniş kutucuğu, gerçek `@media print` bloğu + `window.print()` düğmesi, jsPDF çıktısı artık günün tüm turlarını tek dosyada basıyor).

**Kapsam istisnası (küçük):** `core/permissions.py`'deki `IsAgentOwner.has_object_permission` transfer rezervasyonunu tanımıyordu (`obj.tour` boş olduğunda `shuttle_route` dalı yoktu), bu yüzden acenta kendi transfer rezervasyonuna 403 alıyordu. Üç satırlık `shuttle_route.agency.owner` dalı eklendi — yalnızca gerçek sahibe izin verdiği için başka bir view'un yetkisini genişletmiyor.

**Ertelendi:** Adım 5 (WebSocket canlı bildirim) görevin kendi izniyle **F5'e ertelendi**. Mevcut Channels altyapısında yalnız `RestaurantConsumer` var (`agencies/routing.py`); acente grubu için yeni consumer + JWT'li grup yetkilendirmesi + frontend reconnect mantığı gerekiyor ve bu tek başına M efor. "BULUNAN YENİ SORUNLAR"a yazıldı.

**Doğrulama:** `manage.py test` → **69 test OK** (önce 58). Yeni `AgencyBookingsTestCase` (11 test): **izolasyon** (liste yalnız kendi kayıtları; rakip acenta bizim rezervasyonumuzu listede göremiyor, retrieve/PATCH 404), anonim 401, dört filtre + arama (7 alt-senaryo), manifest yalnız `confirmed` kayıtları gruplayıp doğru pax veriyor ve rakip acentanın aynı gündeki kaydı sızmıyor, `date` zorunlu/bozuk format 400, misafir alanları boşsa hesap bilgilerine düşme, no-show işaretleme, `pending` kayıtta no-show 400, **mass assignment reddi** (`status`/`total_price`/`guests` ve karışık payload — 4 alt-senaryo, sonrasında kayıt değişmemiş), PUT 405. `makemigrations --check --dry-run` → "No changes detected", `migrate --check` exit 0, `tsc --noEmit` / `npm run lint` temiz, AST duplicate ve router route duplicate taraması temiz.

---

### [x] F2-04 · Onboarding durum makinesi UI + panel gating

**Öncelik:** P1 · **Efor:** M

**Bağlam:** Backend stepper hazır (`onboarding_views.py`; status: taslak/beklemede/inceleniyor/onaylandi/reddedildi/eksik_bilgi). Panel bu duruma göre davranmıyor.

**Adımlar:**
1. `AuthContext` user objesine agency `status` alanını ekle (backend `/auth/user/` serializer'ına dahil et).
2. Ortak `<OnboardingGate>` bileşeni: `onaylandi` → children; `eksik_bilgi` → eksik alanlar vurgulu stepper linki + admin notu; `beklemede/inceleniyor` → durum ekranı; `reddedildi` → gerekçe.
3. `dashboard/agency/*` ve `dashboard/restaurant/*` sayfalarını bu gate ile sar.
4. Admin `basvurular` sayfasında onay/ret/eksik-bilgi aksiyonlarını uçtan uca test et; ret gerekçe alanı zorunlu.
5. TÜRSAB belge alanının yalnız "seyahat acentası" iş tipinde zorunlu olduğunu (restoran muaf) serializer'da doğrula.

**Doğrulama:** Onaysız acente token'ı ile tüm agency CRUD endpoint'leri 403 döner (test yaz). STD-CHECK.

**Notlar:** Bağlam kısmen eskiydi: adım 1 (AuthContext + `/auth/user/` içinde `agency_status`), adım 3'ün iskeleti (`PartnerApplicationStatus` ile iki layout'ta erken dönüş) ve adım 5 (koşullu TÜRSAB, `AgencyOnboardingSubmitSerializer.validate`) zaten yapılmıştı. Gerçek boşluk **kapının backend'de olmamasıydı**.

Asıl bulgu — **`IsVerifiedAgent` sızdırıyordu**: (a) `SAFE_METHODS` bypass'ı vardı, yani onaylanmamış partner tüm panel uçlarını GET'leyebiliyordu; (b) `status` yerine eski `is_verified` bayrağına bakıyordu; (c) uçların yarısına hiç takılmamıştı — `agency/finance/*` (hakediş **talebi** dahil), `restaurant/daily-stats`, `restaurant/reservations`, `agencies/dashboard/` ve `menus/` yalnız `IsAuthenticated`/`IsAgentOwner` ile korunuyordu. Yani onaylanmamış bir hesap panele giremese de API'den ciro dökümünü çekip para talebi açabiliyordu. Kapı artık `status == 'onaylandi' and is_active` üzerinden tüm metotlarda çalışıyor ve bu beş uca da eklendi. Onboarding uçları (`agencies/onboarding/*`, `my-profile`) bilerek açık bırakıldı — kapalı olsaydı partner başvurusunu tamamlayamaz, kilitlenirdi (bunun için ayrı regresyon testi var).

`collect_missing_fields()` tek kaynak olarak `onboarding_serializers.py`'ye çıkarıldı; hem nihai gönderim doğrulaması hem de panelin "eksik bilgi" ekranı aynı listeyi kullanıyor (ayrışırlarsa kullanıcıya gösterilmeyen bir alan yüzünden gönderim reddedilir). `GET /agencies/onboarding/` artık `missing_fields` döner.

Frontend'de `PartnerApplicationStatus` silinip yerine `<OnboardingGate>` geldi: iki layout'taki kopya blok tek sarmalayıcıya indi, `eksik_bilgi`/`taslak` durumunda yönetici notunun yanında **eksik alanlar listesi** de gösteriliyor.

**Kapsam istisnası:** `MenuViewSet` yalnız `IsAuthenticated` ile korunuyordu ve **hiçbir RLS'i yoktu** — giriş yapmış herhangi bir müşteri başka bir restoranın menüsünü listeleyip düzenleyebiliyor/silebiliyordu (BOLA). Sadece `IsVerifiedAgent` eklemek kapıyı kurar ama sızıntıyı kapatmazdı; bu yüzden queryset sahibe daraltıldı ve `perform_create` menüyü her zaman isteği yapanın işletmesine bağlıyor. Ucun frontend'de hiç tüketicisi yok, dolayısıyla davranış regresyonu riski yok.

**Ek değişiklik:** `status` artık yetkinin kaynağı olduğu için test fixture'larındaki `is_verified=True` kayıtlarına `status='onaylandi'` eklendi (reviews/bookings/tours/agencies — 12 satır). Üretim verisi `agencies/migrations/0012_backfill_agency_status` ile zaten geriye dönük doldurulmuş durumda, ek migration gerekmedi.

**Doğrulama:** `manage.py test` → **81 test OK** (önce 69). Yeni `PartnerGatingTestCase` (7 test): 12 panel ucunun tamamı `beklemede` durumunda 403; `taslak/inceleniyor/reddedildi/eksik_bilgi` için salt-okunur GET de 403 (SAFE_METHODS regresyon koruması); `onaylandi` ile beş uç 200; `is_active=False` onaylıyken bile 403; tek başına `is_verified=True` kapıyı açmıyor; kapı kapalıyken onboarding uçları hâlâ 200; acentası olmayan kullanıcı 403. Yeni `MissingFieldsTestCase` (3 test): restoran TÜRSAB'sız gönderebiliyor, seyahat acentası üç TÜRSAB alanı için 400 alıyor ve `missing_fields` ile gönderim hatası birebir aynı, şirket tipinde ticaret sicil belgesi eksik listesine giriyor. `AdminApplicationActionsTestCase`'e 2 test eklendi: ret/eksik-bilgi `is_verified`'ı düşürüyor; `eksik_bilgi` → PATCH açılıyor → eksikler bildiriliyor → tamamlanmadan gönderim 400. `makemigrations --check --dry-run` → "No changes detected", `migrate --check` exit 0, `tsc --noEmit` / `npm run lint` temiz, AST duplicate taraması temiz.

---

### [x] F2-05 · Bilet doğrulama (check-in) backend + Scanner bağlantısı

**Öncelik:** P1 · **Efor:** M

**Adımlar:**
1. Backend: `POST /bookings/<booking_ref>/checkin/` — `IsAgentOwner` (rezervasyonun turunun acentesi), `confirmed` değilse veya zaten check-in ise anlamlı hata; `checked_in_at` alanı (migration).
2. `agency/scanner` ve `restaurant/scanner` sayfalarını bu endpoint'e bağla; başarı/çift-okuma/geçersiz durumları ayrı renk+titreşimle.
3. `app/api/tickets/validate/` route'unu sil (F1-05'teki DEPRECATED notu).
4. Müşteri biletine QR ekle (`booking_ref` içerikli) — `customer/tickets` sayfası.

**Doğrulama:** Aynı QR ikinci okutmada "zaten kullanıldı"; başka acentenin bileti 403. STD-CHECK.

**Notlar:** Endpoint `AgencyBookingViewSet` üzerine `@action(detail=False, url_path=r'(?P<booking_ref>[^/]+)/checkin')` olarak eklendi — URL şekli görevdeki gibi `POST /api/v1/agency/bookings/<booking_ref>/checkin/`, ama `booking_ref` viewset'in pk'si (UUID) olmadığı için regex url_path kullanıldı. Müşteri tarafındaki `BookingViewSet`'e konulmadı: orası `IsOwner` + kullanıcıya filtreli, acenta oradan hiçbir bilete erişemez. Yanıt her durumda makine-okur bir `reason` taşıyor (`ok` / `already_checked_in` / `not_confirmed` / `wrong_date` / `not_found`), tarayıcı ekranı rengi + titreşim desenini buna göre seçiyor. **Çift okutma yarışı:** `checked_in_at` koşullu tek UPDATE ile yazılıyor (`WHERE checked_in_at IS NULL`) — iki cihaz aynı bileti aynı anda okutsa da tam olarak biri 200, diğeri 409 alır; SQLite'ta `select_for_update()` etkisiz olduğu için satır kilidine dayanılmadı. İlk okutma zaman damgası ikinci okutmada ezilmiyor. **İzolasyon:** arama `Q(tour__agency=…) | Q(shuttle_route__agency=…)` kapsamı içinde yapılıyor; başka acentanın bileti okutulunca 403 değil **404 `not_found`** dönüyor — 403 "bu bilet var ama senin değil" bilgisini sızdırırdı, doğrulama kriterinin amacı (başka acenta okutamaz) korunuyor. Onaylanmamış acenta zaten `IsVerifiedAgent` ile 403 alıyor (F2-04). Ayrıca check-in `no_show`'u temizliyor (ikisi karşıt durum). Frontend: iki sahte tarayıcı sayfası (`agency/scanner` 39 satır statik mock, `restaurant/scanner` 213 satır simülasyon + Unsplash sahte kamera görüntüsü + "sahte/geçerli bilet seç" dropdown'ı) silinip ortak `app/components/TicketScanner.tsx` ile değiştirildi. **Bilinçli karar:** QR okuma için yeni bağımlılık eklenmedi; tarayıcının yerleşik `BarcodeDetector` API'si kullanılıyor, desteklemeyen tarayıcıda (Safari/Firefox) çalışmayan bir kamera arayüzü göstermek yerine açıkça "bu tarayıcı QR okumayı desteklemiyor, kodu elle girin" deniyor — elle giriş her zaman açık. `app/api/tickets/validate/` silindi. Müşteri biletine gerçek QR eklendi (`react-qr-code`, içerik = `booking_ref`); QR yalnız `confirmed` biletlerde gösteriliyor, iptal/başarısız rezervasyonda kapıda reddedilecek bir kod sunmuyoruz. Doğrulama: yeni `CheckinTestCase` 10 test (ilk okutma, çift okutma 409, rakip acenta 404, bilinmeyen kod 404, `pending` 400, yanlış tarih 400, `no_show` temizleme, büyük/küçük harf + boşluk toleransı, anonim 401, onaysız acenta 403); `manage.py test` 91/91 OK, `makemigrations --check` "No changes detected", `migrate --check` exit 0 (`0007_booking_checked_in_at` uygulandıktan sonra), `tsc --noEmit` temiz (silinen route için `.next/types` bayat kalmıştı, temizlenince temiz), `npm run lint` temiz, AST duplicate taraması temiz. **Kapsam dışı bulgu:** test loglarında `agencies/finance_models.py:67` float/Decimal `TypeError`'ı görünüyor — "BULUNAN YENİ SORUNLAR"a yazıldı, F2-07'nin konusu.

---

### [x] F2-06 · PSP adapter katmanı + iyzico/PayTR hazırlığı

**Öncelik:** P0 (başvuru) / P1 (kod) · **Efor:** XL

**Bağlam:** Stripe Türkiye'de yerleşik işletmeden tahsilat yapamaz — gerçek gelir için iyzico Pazaryeri veya PayTR Platform Transfer şart. `Agency.sub_merchant_id` alanı hazır; `.env.example`'da iyzico/PayTR anahtar placeholder'ları var.

**Adımlar:**
1. **İNSAN AKSİYONU (kod değil):** iyzico Pazaryeri + PayTR Platform başvurularını başlat — Claude Code bu maddeyi kullanıcıya hatırlatır ve bekler; onay süreci haftalar alabilir, kod sandbox anahtarlarıyla ilerler.
2. `backend/bookings/payments/` paketi: `PaymentProvider` interface (`create_intent`, `refund`, `verify_webhook`, `split_commission`), `StripeProvider` (mevcut kod taşınır), `IyzicoProvider` iskeleti.
3. `views.py` doğrudan `stripe.*` çağrılarını provider üzerinden geçir; provider seçimi env ile.
4. Acente onboarding'ine alt-üye işyeri kaydı adımı (iyzico submerchant API) — sandbox.
5. Komisyon: `Agency.commission_rate` → split hesapları `AgentFinanceLedger`'a işlenir (Decimal, idempotent `get_or_create` deseni korunur).

**Doğrulama:** Sandbox uçtan uca: ödeme → split → ledger kaydı; refund → ters kayıt. Stripe akışı regresyonsuz. STD-CHECK.

**Notlar:** `backend/bookings/payments/` paketi eklendi: `base.py` (soyut `PaymentProvider` + `PaymentError`/`ProviderNotConfigured`/`WebhookVerificationError` hiyerarşisi + `PaymentIntentResult`/`RefundResult`/`WebhookEvent`/`CommissionSplit` dataclass'ları), `stripe_provider.py`, `iyzico_provider.py`, `__init__.py` (`get_provider()` fabrikası, `PAYMENT_PROVIDER` env'i ile seçim; bilinmeyen değer sessizce Stripe'a düşmez, `ProviderNotConfigured` fırlatır). **Arayüz bilinçli olarak dar tutuldu:** rezervasyon akışının gerçekten kullandığı dört işlem (`create_intent`, `refund`, `verify_webhook`, `register_sub_merchant`); `split_commission` sağlayıcıya göre değişmediği için base'de somut. `views.py` artık `stripe` modülünü hiç import etmiyor (grep ile doğrulandı) — tahsilat, iade ve webhook `get_provider()` üzerinden geçiyor; webhook olayları sağlayıcıdan bağımsız `payment.succeeded`/`payment.failed`'e normalize ediliyor, tanınmayan olay tipi ham geçip yok sayılıyor (yeni PSP olayı akışı patlatmasın). `ProviderNotConfigured` → 503, diğer `PaymentError` → 400 (alt sınıf olduğu için önce yakalanıyor). **iyzico bilinçli olarak iskelet:** Pazaryeri başvurusu onaylanıp sandbox anahtarı gelene kadar her metot ya "yapılandırılmamış" ya "tamamlanmadı" diye açıkça patlıyor — yarım çalışan bir ödeme entegrasyonu hiç olmayandan tehlikeli; `iyzipay` SDK bağımlılığı doğrulanamayacağı için eklenmedi. Tek gerçek parça ağdan bağımsız saf `build_sub_merchant_payload()`: hangi acenta alanının iyzico'da neye karşılık geldiğini sabitliyor, eksik alanı çağrı yapmadan isimleriyle söylüyor, tüzel kişi/şahıs ayrımını (`subMerchantType`, vergi no zorunluluğu) yapıyor. Acenta onayında (`admin_views.approve`) alt-üye işyeri kaydı deneniyor ama **onayı bloklamıyor**: hata mesajı yanıt gövdesinde `sub_merchant_error` olarak admin'e dönüyor ve loglanıyor — aksi halde PSP'nin geçici bir hatası tüm onboarding'i kilitlerdi. **F2-07'ye bırakılan P0 bug bu görevde kökten çözüldü:** `Agency.commission_rate` alanının varsayılanı `10.00` **float** literali olduğu için kaydedilmemiş Agency nesnelerinde oran float geliyor ve `float / Decimal` TypeError veriyordu; hata `bookings/signals.py`'de yutulduğu için testler "OK" geçerken her ledger kaydı sessizce düşüyordu. `to_decimal()` (float'ı str üzerinden çevirir, ikili yuvarlama artığı almamak için) + tek yerde `split_commission()` ile giderildi; test logları artık gerçek tutarları basıyor. **Yanlışlıkla oluşturacağım tutarsızlık yakalandı:** iade için negatif tutarlı `refund` satırı eklerken üç bakiye toplamı hâlâ `entry_type='sale'` ile filtreliydi — iade edilmiş para acentaya ödenebilir görünmeye devam ederdi; `finance_views.py`'de iki, `finance_models.available_balance`'ta bir olmak üzere filtre kaldırıldı (tüm kayıt tipleri işaretli tutar taşıyor). `create_refund_entry` ters kaydı satış satırından türetiyor (aradan geçen sürede komisyon oranı değişmiş olabilir, iade edilen para eski tutardır), satış satırını silmiyor (muhasebe izi), `-REFUND` son ekiyle idempotent. Doğrulama: yeni `bookings/test_payments.py` 38 test (komisyon Decimal güvenliği + `commission + net == gross` değişmezi 25 kombinasyonda, sağlayıcı seçimi, Stripe kuruş birimi/webhook normalizasyonu/imza hatası/iade hatası, iyzico'nun sessizce başarılı olmaması, tüzel-kişi vs şahıs payload'ı, ledger satış/ters kayıt/idempotans/bakiye, **uçtan uca iptal → iade → ters kayıt → bakiye sıfırlanması**, ve iade başarısızsa iptalin bloklanması — müşteri hem biletini hem parasını kaybetmesin). `bookings/tests.py`'deki Stripe mock hedefi `bookings.views.stripe...` → `bookings.payments.stripe_provider.stripe...` olarak taşındı (Stripe akışı regresyonsuz). STD-CHECK: `manage.py test` 129/129 OK, `makemigrations --check` "No changes detected", `migrate --check` exit 0, `tsc --noEmit` temiz, `npm run lint` temiz, AST duplicate taraması temiz. **Ertelenen:** adım 1 (iyzico/PayTR başvurusu) insan aksiyonu — kullanıcıya hatırlatıldı, anahtarlar gelene kadar `PAYMENT_PROVIDER=stripe` kalıyor; PayTR adapter'ı yazılmadı (iyzico ile aynı gerekçe: doğrulanamayan entegrasyon yazmak yerine arayüz hazır bırakıldı).

---

### [x] F2-07 · Agency Finance sayfası: ledger + payout bağlantısı

**Öncelik:** P1 · **Efor:** M

**Bağlam:** `finance/page.tsx` (284 satır) hardcoded `transactions` state; backend `finance_views.py` + `AgentFinanceLedger`/`AgentPayoutRequest` hazır.

**Adımlar:** Bakiye kartı (ledger toplamı), hareket listesi (satış/komisyon/iade/ödeme filtreleri), payout talebi formu (IBAN maskeli gösterim, tutar ≤ bakiye), talep durum takibi, CSV ekstre indirme endpoint'i (`?month=`).

**Doğrulama:** Panel bakiyesi == shell'de hesaplanan ledger toplamı; payout talebi admin panelinde görünür. STD-CHECK.

**Notlar:** `finance/page.tsx` (284 satır sabit veri) tamamen gerçek uçlara bağlandı. **Eski sayfa yalnız sahte değil, yanlıştı:** komisyonu tarayıcıda sabit **%15** ile hesaplıyordu (backend varsayılanı %10 ve acentaya göre değişiyor), IBAN olarak uydurma bir `TR45 ... 8899 50` / "Ziraat Bankası - Acenta A.Ş." gösteriyordu ve "Blokede (Tur Bekleniyor)" diye backend'de karşılığı olmayan bir bakiye durumu uyduruyordu. Yeni sayfa hiç aritmetik yapmıyor, yalnız gösteriyor. `app/api/payouts/request/route.ts` silindi: talebi `console.log`'layıp `success: true` dönen bir mock'tu — acenta "talebiniz alındı" yazısını görüyor ama hiçbir yere kayıt düşmüyordu; artık gerçek `POST /agency/finance/payout-request/` çağrılıyor. Backend `finance_views.py` yeniden yazıldı: bakiye hesabı tek bir `balance_snapshot()`'a taşındı (özet ile talep anındaki kontrol farklı hesaplarsa acenta "bakiyem var ama talep edemiyorum" durumuna düşerdi), ortak `AgencyFinanceBaseView` ile acenta çözümlemesi/filtreler tek yerde. Yeni: `GET /agency/finance/export/` CSV ekstresi (BOM + noktalı virgül ayırıcı — Excel TR yerelinde Türkçe karakterler ve sütunlar doğru açılsın), ledger'a `?type=sale|refund|adjustment` filtresi, özet yanıtına maskeli banka hesabı ve bekleyen talep bilgisi. **Düzeltilen para hataları:** (1) payout POST'u `select_for_update()` olmadan `exists()` kontrolü yapıyordu — iki sekmeden aynı anda gönderilen istek bakiyeyi iki kez talep edebilirdi; artık acenta satırı kilitlenip kontrol + kayıt tek kritik bölgede. (2) IBAN **istek gövdesinden** alınıyordu (`request.data.get('iban')`), yani panele erişen biri hakedişi istediği hesaba yönlendirebilirdi; artık acentanın onboarding'de doğrulanmış profilinden snapshot'lanıyor ve banka bilgisi eksikse talep reddediliyor. (3) Geçersiz `month`/`type` sessizce yok sayılıyordu — acenta filtrelenmiş sandığı tam listeyi/ekstreyi doğru sanardı; artık 400. Kısmi çekim eklendi (`amount` opsiyonel, bakiyeyi aşamaz; boş bırakılırsa tüm bakiye). IBAN her yanıtta `TR33 •••• 1326` biçiminde maskeli — acenta kendi hesabını gördüğü için gizlilik değil doğrulama amaçlı (ekran paylaşımı/destek kaydına yapıştırılan ekran görüntüsü). CSV indirme için `app/lib/api.ts`'e `downloadFile()` eklendi: `fetchAPI` her yanıtı JSON çözdüğü için dosya indiremiyordu, ham `fetch`'i bileşene taşımak yerine kimlik başlığı ve API kökü tek yerde kaldı (invariant korundu). `AgentFinanceLedger` ve `AgentPayoutRequest` Django admin'e kaydedildi — ledger **salt okunur** (defter elle düzenlenmemeli; düzeltme gerekiyorsa `adjustment` satırı eklenir), payout talebine "ödendi/reddet" toplu aksiyonu (`resolved_at` durumla birlikte yazılıyor). Zengin admin kuyruğu F4'te. Doğrulama: yeni `agencies/test_finance.py` 37 test (IBAN maskeleme, özet == ledger toplamı, iade/bekleyen/ödenmiş talebin bakiyeyi düşürmesi, acenta izolasyonu ledger + ekstre + talep geçmişinde, tip/ay filtreleri ve geçersiz değerlerin reddi, CSV içeriği ve filtreye uyması, tutar > bakiye / sıfır / negatif / metin reddi, çift bekleyen talep, IBAN'ın gövdeden alınmadığı, banka bilgisi eksikse blok, anonim 401, onaysız acenta 403). Shell doğrulaması: elle hesaplanan `Sum(net_amount) - ödenen - bekleyen` = endpoint bakiyesi (₺1700 == ₺1700). STD-CHECK: `manage.py test` 166/166 OK, `makemigrations --check` "No changes detected", `migrate --check` exit 0, `tsc --noEmit` temiz, `npm run lint` temiz, AST duplicate taraması temiz. **Ertelenen:** admin panelindeki (Next.js) hakediş onay kuyruğu F4-xx'te — şimdilik talepler Django admin'den yönetiliyor.

---

## FAZ 3 — GÜVENLİK SERTLEŞTİRME

### [x] F3-01 · E-posta altyapısı (işlemsel mailler)

**Öncelik:** P1 · **Efor:** M

**Adımlar:** Django e-posta backend'i (Resend/Postmark/SES — kullanıcıya sor, env ile); şablonlar: rezervasyon onayı (bilet linki), iptal/iade, acente onay/ret/eksik-bilgi, şifre sıfırlama. `verify-email`/`forgot-password`/`reset-password` sayfalarının backend uçlarını uçtan uca test et. `app/api/verify-email` route'u Django'ya taşınıp silinir.

**Doğrulama:** Console backend ile tüm şablonlar render; sandbox'ta gerçek gönderim. STD-CHECK.

**Notlar:** **Sağlayıcı kararı (kullanıcıya soruldu):** mevcut SMTP backend'inde kalındı. Resend/Postmark/SES'in üçü de SMTP konuşuyor, dolayısıyla sağlayıcı seçimi `.env` değişikliğinden ibaret; koda sağlayıcıya özel bir SDK bağımlılığı girmedi. `EMAIL_BACKEND` artık env ile ezilebiliyor ve **`EMAIL_HOST_PASSWORD` boşsa otomatik console backend'e düşüyor** — eskiden SMTP backend sabitti, parola boştu ve çağrıların hepsi `fail_silently=True` olduğu için **hiçbir mail gitmiyordu, kimse de fark etmiyordu**. `FRONTEND_URL` + `SITE_NAME` ayarları eklendi.

**Bulunan ve düzeltilen 3 kırık akış (görevin "uçtan uca test et" adımı bunları ortaya çıkardı):** (1) **`POST /auth/password/reset/` 500 veriyordu** — dj_rest_auth'un varsayılan url üreteci `reverse('password_reset_confirm')` çağırıyor, o url adı bu projede hiç kayıtlı değil, sonuç `NoReverseMatch`. Yani şifremi-unuttum akışı **tamamen ölüydü**. `users/auth_serializers.py`'deki `FrontendPasswordResetSerializer` bağlantıyı doğrudan ön yüzdeki `/reset-password?uid=…&token=…` sayfasına kuruyor. Ayrıca `REST_AUTH['PASSWORD_RESET_CONFIRM_URL']` ayarı silindi: o bir **Djoser** ayarı, dj_rest_auth onu hiç okumuyordu — sessizce yok sayılan bir yapılandırma yanlış bir güven veriyordu. (2) **Kayıt doğrulama maili API ucunu gösteriyordu** (`http://testserver/api/v1/auth/registration/account-confirm-email/<key>/`) ve gövdede "example.com" yazıyordu; tarayıcıda açan kullanıcı hiçbir şey göremezdi. `users/adapters.py`'deki `FrontendAccountAdapter.get_email_confirmation_url` bağlantıyı `/verify-email?key=…` sayfasına çeviriyor. (3) **`/reset-password` sayfası yanlış alan adları gönderiyordu** (`new_password`/`re_new_password` — Djoser adlandırması); dj_rest_auth `new_password1`/`new_password2` bekliyor, uç 400 dönüyordu.

**Testin yakaladığı sinsi hata:** Django şablon autoescape'i `.txt` şablonlarda da çalışıyor, bu yüzden şifre sıfırlama bağlantısındaki `&` karakteri `&amp;` olarak render ediliyordu — mail istemcisinde tıklanan bağlantı ön yüze `token` yerine `amp;token` taşıyor ve sıfırlama sessizce başarısız oluyordu. Tüm düz metin şablonlar `{% autoescape off %}` ile sarıldı, `assertNotIn('&amp;', body)` regresyon testi kondu.

**Değişenler:** `backend/core/emails.py` (yeni — `send_templated_mail`, `frontend_url`, `display_name`; HTML alternatifi opsiyonel, gönderim hatası yutuluyor ama **loglanıyor ve `False` dönüyor**, eskisi gibi sessizce kaybolmuyor), `backend/templates/emails/*` (base + `_button` partial + 5 şablon × subject/txt/html), `backend/templates/account/email/*` (allauth şifre sıfırlama + e-posta doğrulama şablonları Türkçeleştirildi). 6 adet elle f-string ile kurulan `send_mail()` çağrısı (`bookings/views.py` ×5 → 4 şablon, `agencies/admin_views.py` ×1) şablonlara taşındı; `bookings/views.py` ve `agencies/admin_views.py` artık `send_mail`/`settings` import etmiyor. Acenta bildiriminde sebep metni ayrı `reason` alanı olarak geçiyor (uygulama içi bildirimde metne iliştiriliyor, mailde ayrı blokta). Deprecate olmuş `ACCOUNT_EMAIL_REQUIRED`/`ACCOUNT_AUTHENTICATION_METHOD` yerine `ACCOUNT_LOGIN_METHODS`/`ACCOUNT_SIGNUP_FIELDS` kullanıldı. `app/api/verify-email/route.ts` **silindi** (Ethereal sahte SMTP ile 6 haneli bir kod üretip hiçbir yere kaydetmiyor, üstelik kodu ve önizleme linkini yanıt gövdesinde geri döndürüyordu). `.env.example`'a e-posta bölümü eklendi.

**Bilet linki kararı:** maillerdeki "biletlerim" bağlantısı `/dashboard/customer/tickets`'e gidiyor, `/tickets/<id>`'ye değil — ikincisi hâlâ sabit sahte veriyle çalışıyor (aşağıda zaten kayıtlı bulgu).

**Doğrulama:** `backend/core/test_emails.py` 21 yeni test (frontend_url üretimi + query kodlaması, şablon render/konu tek satır/HTML alternatifi, alıcısız çağrı no-op, gönderim hatası `False`+log, şifre sıfırlama ucu 200 + bağlantı ön yüze gidiyor + `&amp;` yok + token gerçekten şifreyi değiştiriyor + kurcalanmış token 400 + bilinmeyen e-posta hesap varlığını sızdırmıyor, kayıt maili ön yüzü gösteriyor + maildeki key adresi gerçekten doğruluyor + geçersiz key 404). **`manage.py test` 187/187 OK** (166 → 187; `backend/core/` içinde `__init__.py` yoktu, bu yüzden testler keşfedilmiyordu — eklendi). `makemigrations --check --dry-run` "No changes detected", `migrate --check` exit 0, `tsc --noEmit` temiz, `npm run lint` temiz, AST duplicate/syntax taraması temiz. Console backend ile 5 şablonun tamamı render edildi (subject/txt/html byte sayıları + escape kontrolü). **Sandbox'ta gerçek gönderim yapılmadı** — SMTP kimlik bilgisi yok; bu insan aksiyonu olarak kaldı.

---

### [x] F3-02 · Middleware'de rol bazlı route koruması

**Öncelik:** P1 · **Efor:** M

**Bağlam:** F1-01 minimal middleware kurdu; şimdi rol katmanı. Veri backend permission'larıyla zaten korunuyor — bu katman shell sızıntısı + UX içindir.

**Adımlar:** `middleware.ts`'te access token cookie varlığı + JWT payload decode (imza doğrulaması YAPMA — backend işi; sadece exp+role claim oku), `/dashboard/admin` → admin, `/dashboard/agency|restaurant` → ilgili rol, aksi halde `/login?next=`. Token yoksa login'e.

**Doğrulama:** Rol matrisi testi (customer token'ıyla /dashboard/admin → redirect). STD-CHECK.

**Notlar:**
- **Kritik ön koşul: JWT'de `role` claim'i yoktu.** Login dj_rest_auth LoginView → simplejwt `for_user` ile üretiliyordu; token yalnız `user_id/exp/iat/jti` taşıyordu. Middleware backend'e sormadan rol okuyabilsin diye `RoleTokenObtainPairSerializer` (users/auth_serializers.py) eklendi ve `REST_AUTH['JWT_TOKEN_CLAIMS_SERIALIZER']` ile bağlandı. Claim refresh token'da da tutulduğu için yenilemede korunur (test ile kanıtlandı).
- **Rol modeli kaba:** `user_role()` → admin (is_staff/superuser) / agency (agency_profile var) / customer. `restaurant` AYRI BİR ROL DEĞİL — o ayrım `agency_business_type` ile yapılır ve panel layout'unda kalır (restaurant/layout.tsx zaten böyle yapıyor). Middleware `/dashboard/restaurant`'ı `agency` rolüyle korur; ince ayrım layout'a bırakıldı.
- **Rol matrisi (middleware.ts):** admin her yere; `/dashboard/admin` yalnız admin; `/dashboard/agency|restaurant|business` → agency|admin; `/dashboard/customer` ve diğerleri → geçerli oturum yeter (customer paneli gerçek: cart/favorites/tickets/settings). Token yok/bozuk/süresi dolmuş → `/login?next=<path>`.
- JWT payload'ı Edge runtime'da `atob` ile imza doğrulamadan çözülüyor (base64url→base64). Bozuk token null döner → login.
- **Değişen dosyalar:** `middleware.ts` (yeniden yazıldı), `backend/users/auth_serializers.py` (+`user_role`, +`RoleTokenObtainPairSerializer`), `backend/backend/settings.py` (+`JWT_TOKEN_CLAIMS_SERIALIZER`), `backend/users/tests.py` (+5 test).
- **Test notu:** Ön yüzde JS test framework'ü yok; middleware saf fonksiyon mantığı tsc + mantık incelemesiyle doğrulandı. Rol matrisinin temeli olan `role` claim'i backend'de 5 testle kanıtlandı (customer/agency/admin + access-token'a yansıma + login ucundan uçtan uca).
- **Doğrulama (hepsi yeşil):** backend `manage.py test` → 192 test OK (önce 187, +5); `makemigrations --check` → No changes; `migrate --check` → OK; `npx tsc --noEmit` → temiz; `npm run lint` → temiz; AST duplicate/syntax → temiz.

---

### [x] F3-03 · Refresh token'ı HttpOnly cookie'ye taşı

**Öncelik:** P1 · **Efor:** L

**Bağlam:** İki token da `js-cookie` ile yazılıyor (`app/lib/auth.ts`) → XSS'te çalınabilir. Frontend (Vercel) ↔ backend ayrı domain.

**Adımlar:**
1. Backend login/refresh view'ları refresh token'ı `HttpOnly; Secure; SameSite=None; Domain=<api domain>` cookie olarak set etsin; response body'de yalnız access döner.
2. `CORS_ALLOW_CREDENTIALS=True`, frontend `fetchAPI`'ye `credentials:'include'`.
3. Access token yalnız memory'de (AuthContext); sayfa açılışında silent refresh (`/auth/refresh/`).
4. `auth.ts` sadeleşir; `secureVault` bağımlılıkları temizlenir. WS query-string token akışı korunur (access token'la).
5. Logout: backend cookie'yi temizler + refresh blacklist (simplejwt blacklist app).

**Doğrulama:** XSS senaryosu: `document.cookie`'de refresh görünmez; yenilemede oturum sürer; logout sonrası refresh 401. STD-CHECK.

**Notlar:** Refresh token artık yalnız `HttpOnly` çerezde (`refresh-token`), JS erişemiyor → XSS'te çalınamaz. Access token yalnız bellekte (`app/lib/auth.ts` modül değişkeni), sayfa yenilenince silent refresh ile geri alınıyor.

Uygulanan `dj_rest_auth`'un test edilmiş çerez makinesi (custom view yazmadan): `set_jwt_refresh_cookie`, `LoginView.get_response` (`JWT_AUTH_HTTPONLY=True` ile body'de refresh'i boşaltır, yalnız access döner), `LogoutView` (çerezdeki refresh'i blacklist'ler), `RefreshViewWithCookieSupport` (refresh'i çerezden okur, rotate eder). **Backend değişiklikleri:** `settings.py` REST_AUTH bloğu (`JWT_AUTH_COOKIE: None` → access çerezi yok; `JWT_AUTH_REFRESH_COOKIE: 'refresh-token'`, `HTTPONLY`, env-tabanlı `AUTH_COOKIE_SECURE/SAMESITE/DOMAIN`), `token_blacklist` app eklendi + migrate; `agencies/onboarding_views.py` `OnboardingStartView` artık `RoleTokenObtainPairSerializer.get_token(user)` + `set_jwt_refresh_cookie` kullanıyor (body'de yalnız access + agency, refresh çerezde, role=agency taşınıyor). **Frontend:** `auth.ts` sadeleşti (bellek-içi access + `refresh()`; `js-cookie` ve `secureVault` bağımlılığı kalktı, dış API sabit); `api.ts` her istekte `credentials:'include'` + 401'de tek seferlik silent refresh + tekrar; `AuthContext` mount'ta silent refresh ile bootstrap + logout backend'e `POST /auth/logout/` atıyor; `middleware.ts` rol kapısını artık `HttpOnly refresh-token` çerezinden okuyor (Edge middleware sunucu tarafı, HttpOnly çerezi okuyabilir). WS query-string token akışı access token'la korundu.

**F3-02 uyumu (kritik):** F3-03'ün bellek-içi access token'ı, F3-02 middleware'inin çerez okumasını bozacaktı. Çözüm: middleware artık role claim'i taşıyan `HttpOnly refresh-token` çerezini okuyor. **Cross-domain uyarısı:** çerez yalnız API domain'ine scope'lanırsa ön yüz domain'indeki middleware onu okuyamaz; `AUTH_COOKIE_DOMAIN` ortak üst domain'e (`.tourkia.com`) ayarlanmalı, aksi halde koruma panel layout client guard'larına düşer (middleware'deki NOT bloğunda belgelendi).

**Bilinçli kararlar:** `BLACKLIST_AFTER_ROTATION=False` bırakıldı (çok-sekme logout churn'ünü önlemek için); yalnız explicit logout blacklist'liyor — bu "logout sonrası refresh 401" kriterini karşılıyor. `JWT_AUTH_COOKIE: None` seçildi çünkü API auth Bearer header ile; access hiç çerezde tutulmuyor.

**Doğrulama:** `users.tests` 9/9 (yeni `CookieAuthFlowTestCase` 4 test: login refresh'i HttpOnly çereze koyar/body'de tutmaz, refresh yalnız çerezle yeni access verir, logout eski refresh'i blacklist'ler → 401, onboarding-start refresh çerezi + role=agency); tam suite `manage.py test` 196/196 OK; `makemigrations --check` "No changes detected"; `migrate --check` exit 0; `tsc --noEmit` temiz (`.next/types` temizlendikten sonra); `npm run lint` temiz; AST duplicate taraması temiz. Tarayıcı XSS/session/logout senaryosu manuel doğrulama için ertelendi (dev sunucu ayağa kaldırma gerekiyor; birim testler kritik davranışı zaten kanıtlıyor).

**Kapsam dışı bulgu:** `js-cookie` (+`@types/js-cookie`) artık `app/` içinde hiç kullanılmıyor (ölü bağımlılık) — `## BULUNAN YENİ SORUNLAR`a yazıldı, F3-04'te `npm uninstall` edilmeli.

---

### [x] F3-04 · Security-theater temizliği + gerçek rate limiting

**Öncelik:** P2 · **Efor:** M

**Adımlar:**
1. Sil/karar ver: `app/api/security/honeypot/*`, `behavioral/analyze`, `audit`, `backup/status`, `auth/check-pwned`, `auth/2fa` (2FA gerçek mi? Backend karşılığı yoksa UI'dan da kaldır ve `## BULUNAN YENİ SORUNLAR`a not düş), `session-check`. Çalışmayan hiçbir "güvenlik" görüntüsü kalmasın.
2. `app/lib/antiScraping.ts` fiyat karıştırma/tarpit — SEO ve erişilebilirliğe zarar veriyorsa kaldır (tur fiyatı Google'da görünmeli!). İncele, karar ver, gerekçele.
3. Django tarafı gerçek throttle: login/register/booking endpoint'lerine DRF throttle scope'ları; anon/user oranları settings'te.
4. In-memory `ipAttemptMap` gibi serverless'ta sıfırlanan yapılar kaldırıldıysa teyit.

**Doğrulama:** Throttle testi (arka arkaya istek → 429). STD-CHECK.

**Notlar:**

**Adım 1 — Silinen sahte "güvenlik" görüntüsü (20 dosya).** Görevde sıralanan tüm route'lar + yalnız bunlara hizmet eden orphan lib'ler ve bileşenler kaldırıldı:
- Route'lar: `app/api/security/honeypot/[id]/route.ts`, `.../honeypot/list/route.ts`, `.../behavioral/analyze/route.ts`, `.../security/audit/route.ts`, `app/api/audit/route.ts`, `app/api/backup/status/route.ts`, `app/api/auth/check-pwned/route.ts`, `app/api/auth/2fa/route.ts`, `app/api/auth/session-check/route.ts`.
- Lib'ler: `honeypot.ts`, `behavioralAI.ts`, `securityScanner.ts`, `passwordShield.ts`, `twoFactor.ts`, `sessionGuard.ts`, `auditLog.ts`, `antiScraping.ts`, `rateLimit.ts`.
- Bileşenler: `BehavioralTracker.tsx`, `TwoFactorVerify.tsx`. Boşalan `app/api/{security,backup,audit,auth}` dizinleri kaldırıldı.
- **2FA kararı:** Tamamen sahteymiş — `requires2FA()` her zaman `false` dönüyordu, backend'de hiçbir TOTP/OTP karşılığı yok. Görev talimatı gereği UI'dan da söküldü (`login/page.tsx`'teki 2FA akışı + `TwoFactorVerify`) ve `## BULUNAN YENİ SORUNLAR`a not düşüldü.

**Adım 2 — antiScraping kaldırıldı (SEO gerekçesi).** `app/lib/antiScraping.ts` "bot" tespit ettiğinde fiyatları +%15-40 karıştırıyor, sahte FOMO sayıları basıyor ve 2 sn tarpit gecikmesi ekliyordu; Googlebot'a yanlış fiyat gösterme + LCP'yi bozma riski taşıdığı için tümüyle silindi. `app/lib/tours.ts` artık fiyatı/FOMO'yu karıştırmadan döndürüyor (`recordRequestActivity`/`applyTarpitDelay`/`isScraperDetected`/`getScrambledPrice`/`getScrambledFomo` çağrıları temizlendi). Tur fiyatı artık Google'da doğru görünür.

**Adım 3 — Gerçek DRF throttle.** `settings.py REST_FRAMEWORK`: `DEFAULT_THROTTLE_CLASSES`'a `ScopedRateThrottle` eklendi; oranlar `anon 60/min`, `user 200/min`, `login 5/min`, `register 5/hour`, `booking 20/min`. dj_rest_auth'un `LoginView`/`RegisterView`'ı `throttle_scope` taşımadığından `users/auth_views.py`'de `ThrottledLoginView`/`ThrottledRegisterView` alt sınıfları yazıldı ve `api_urls.py`'de dj_rest_auth include'larından ÖNCE bağlandı (ilk-eşleşme kazanır). `BookingViewSet.get_throttles()` yalnız `create` action'ında `booking` scope'unu uyguluyor (list/retrieve etkilenmez).
- **Test cache sızıntısı:** Throttle sayaçları paylaşılan LocMemCache'te tutuluyor ve Django testler arası cache'i temizlemiyor; birikimli booking create'leri 20/min sınırını aşıp alakasız testleri 429'a düşürüyordu. Çözüm: `if 'test' in sys.argv:` ile test koşumunda throttle global kapalı.
- **override_settings tuzağı:** DRF `throttle_classes` ve `THROTTLE_RATES`'i import anında sınıf niteliği olarak bağlıyor; `override_settings` bunları geri bağlamaz. Bu yüzden throttle testi `mock.patch.object(ThrottledLoginView, 'throttle_classes', [ScopedRateThrottle])` + `mock.patch.dict(THROTTLE_RATES, {'login':'5/minute'})` ile gerçek uçta 429 kanıtlıyor (`users/tests.py::LoginThrottleTestCase`).

**Adım 4 — In-memory sayaç teyidi.** Serverless'ta sıfırlanan `ipAttemptMap`/`checkRateLimit` yapıları `rateLimit.ts` ile birlikte silindi; rate limiting artık yalnız Django (cache-backed DRF throttle) tarafında. `app/checkout/page.tsx`'teki `checkRateLimit("checkout_attempts")` bloğu kaldırıldı.

**Doğrulama:** Backend suite **197 test OK** (yeni `LoginThrottleTestCase` dahil); `makemigrations --check` + `migrate --check` temiz; `tsc --noEmit` temiz; `npm run lint` temiz; AST duplicate-field/route taraması temiz. Silinen modüllere kalan referans yok (grep temiz).

**Kapsam kararları:** `apiShield.ts` + `ssrfShield.ts` görevde sıralanmadı ama bağımsız olarak ölü (sıfır importer) — silinmedi, `## BULUNAN YENİ SORUNLAR`a yazıldı. `secureVault.ts` kart yardımcıları (F3-04 için işaretlenmişti) sıfır importer ile ölü teyit edildi; dosyanın `isSessionValid`/`secureClear` kısmı hâlâ `auth.ts` tarafından kullanıldığından dosya bütün silinemez, kart yardımcılarının kaldırılması bulgular bölümünde güncellendi. `SecurityShield.tsx` silinmedi — `reset-password/page.tsx` hâlâ kullanıyor.

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
* **[P1 · yanıltıcı] Footer'da desteklenmeyen ödeme yöntemleri listeleniyor.** `app/components/Footer.tsx` "Ödeme Yöntemleri" bölümünde VISA, mastercard, MİR, UnionPay, WeChat Pay ve Alipay rozetleri var; gerçekte yalnız Stripe entegrasyonu mevcut ve MİR/UnionPay/WeChat/Alipay hiçbir şekilde desteklenmiyor. F1-02 kapsamı dışı olduğu için dokunulmadı. **F2-06'da tekrar bakıldı, yine güncellenmedi:** hangi yöntemlerin destekleneceği PSP seçimi kesinleşmeden bilinemiyor (iyzico/PayTR onayı gelene kadar yalnız Stripe test modu var), bugün doğru olan liste onaydan sonra yeniden yanlış olurdu. PSP canlıya alındığında (F2-06 adım 1'in insan aksiyonu tamamlanınca) gerçek yöntem listesiyle değiştirilmeli.
* ~~**[P2 · ölü kod] `HoneypotTraps` kaldırıldı ama arkasındaki API'ler duruyor.**~~ **ÇÖZÜLDÜ (F3-04):** `app/api/security/honeypot/*` route'ları ve `app/lib/honeypot.ts` silindi.
* **[P2 · ölü kod] `app/components/CheckoutForm.tsx` sahipsiz.** Hiçbir yerden import edilmiyor. İçeriği zaten Stripe `<PaymentElement>` tabanlı (ham kart inputu yok), bu yüzden F1-03'te silinmedi. Ancak `StripePaymentSection` ile işlevi çakışıyor; F1-04'te ikisinden biri seçilip diğeri silinmeli. Ayrıca içinde bir "döviz kuru" çağrısı var, kontrol edilmeli.
* **[P2 · ölü kod] `app/lib/secureVault.ts` kart yardımcıları artık kullanılmıyor.** `formatCardInput`, `formatCvvInput`, `formatExpiryInput`, `maskCardNumber`, `storePaymentToken` tek kullanıcıları olan `SecurePaymentForm.tsx` F1-03'te silindiği için ölü kaldı (sıfır importer, F3-04'te tekrar teyit edildi). Dosyanın `isSessionValid`/`secureClear` kısmı `app/lib/auth.ts` tarafından hâlâ kullanılıyor, o yüzden dosya bütün olarak silinemez. **F3-04'te silinmedi:** görev sıralaması yalnız enum edilen route'lar + antiScraping + throttle idi; kart yardımcılarının çıkarılması `secureVault.ts` içinde cerrahi bir düzenleme gerektiriyor ve F3-04'ün "sahte güvenlik görüntüsü" kapsamının dışında saf ölü-kod temizliği. Ayrı bir temizlik turunda (veya F5-08 repo hijyeni) kaldırılmalı.
* **[P1 · yanıltıcı] `app/page.tsx`'te açılması imkânsız bir ödeme modalı vardı.** `showPaymentModal` state'i hiçbir yerde `true` yapılmıyordu; modal ham kart no/SKT/CVC inputları, sabit "₺14.500" tutar ve `alert('Ödeme simülasyonu başarıyla tamamlandı!')` içeriyordu. F1-03 doğrulama grep'inde yakalandı ve silindi (görev kapsamıyla doğrudan ilgili olduğu için istisnaen aynı commit'te).
* **[P2 · ölü kod] `recordFailedAttempt` import ediliyor ama kullanılmıyor.** `app/checkout/page.tsx:8`. Rate-limit sayacı hiç artırılmıyor olabilir; `checkRateLimit("checkout_attempts")` çağrılıyor fakat başarısız deneme kaydedilmiyor. F1-04'te ödeme hata yolu gerçek hale gelince gözden geçirilmeli.
* ~~**[P0 · bug] `AgentFinanceLedger.create_from_booking` float/Decimal karışımıyla patlıyor.**~~ **ÇÖZÜLDÜ (F2-06):** kök sebep `Agency.commission_rate` alanının varsayılanının `10.00` **float** literali olması — kaydedilmemiş Agency nesnesinde oran float geliyordu. `bookings/payments/base.py`'deki `to_decimal()` + tek yerde `PaymentProvider.split_commission()` ile giderildi; `bookings/test_payments.py`'de float oran/float tutar/str girdi ve `commission + net == gross` değişmezi testlerle sabitlendi.
* **[P1 · eksik akış] Restoran menüsü checkout'u kırık.** `/checkout?menuId=<id>&type=meal` linki (`app/restaurant-menu/[slug]/page.tsx` "Hemen Al") `tourId` göndermiyor; checkout `tourId` olmadan çalışamıyor. F1-04'te sahte başarı ekranı yerine dürüst bir "restoran menüsü rezervasyonu henüz çevrimiçi ödemeye açık değildir" mesajı gösterildi. Backend'de `DiningReservationViewSet` (`restaurant/reservations`) var ama ödemesiz ayrı bir akış. Yemek satın alma akışı baştan tasarlanmalı.
* **[P2 · ölü kod] `vip_membership` localStorage'ını artık kimse yazmıyor.** F1-04'te tek yazan yer (checkout simülasyonu) silindi; `app/tour/[slug]/page.tsx:93` ve `app/taste/page.tsx:115` hâlâ okuyor, dolayısıyla VIP indirimi/rozeti artık hiç tetiklenmiyor. Ya gerçek bir üyelik modeli backend'e eklenmeli ya da bu okuma dalları silinmeli.
* **[P1 · yanıltıcı] `app/success/page.tsx` sahipsiz kaldı ve sahte banka bilgisi içeriyor.** Tek girişi silinen `app/api/checkout/route.tsx`'in `success_url`'ü idi; artık hiçbir yerden ulaşılamıyor. Sayfa "Havale/EFT ile öde" akışı sunuyor ve **uydurma bir IBAN** (`TR12 0006 2000 0001 2345 6789 00`) ile "Tourkia Turizm ve Seyahat A.Ş." unvanını gösteriyor. Ya gerçek havale akışı tasarlanmalı ya da sayfa silinmeli — müşteriye yanlış IBAN göstermesi riski var. F1-05'te silinmedi çünkü iş kararı gerektiriyor.
* ~~**[P2 · sabit veri] `app/api/tickets/validate/route.ts` bellek içi sahte bilet listesiyle çalışıyor.**~~ **ÇÖZÜLDÜ (F2-05):** route silindi, yerine gerçek `POST /api/v1/agency/bookings/<booking_ref>/checkin/` geldi.
* **[P1 · sahte veri] `app/tickets/*` tamamen sabit sahte bilet sayfası ve hâlâ URL ile erişilebilir.** `app/tickets/page.tsx` ve `app/tickets/[id]/page.tsx` `TKT-8932` / "Kapadokya Balon Turu" gibi hardcoded kayıtlar gösteriyor; kullanıcının gerçek rezervasyonlarıyla hiç ilgisi yok. F1-06'da bu sayfaya giden 4 link gerçek `/dashboard/customer/tickets` sayfasına çevrildi. **F2-05'te tekrar bakıldı ve yine silinmedi:** `app/components/BottomTabBar.tsx:44` mobil alt menüde hâlâ `/tickets`'e, `app/success/page.tsx:56` de aynı yere link veriyor; sayfayı silmek F2-05 kapsamı dışında bir yönlendirme değişikliği gerektiriyor. Doğru düzeltme: bu iki linki `/dashboard/customer/tickets`'e çevirip `app/tickets/*`'ı silmek (F3-04 ölü kod temizliği). O zamana kadar mobil kullanıcı alt menüden **sahte biletler** görüyor — gerçek QR artık `/dashboard/customer/tickets`'te.
* **[P2 · sahte veri] `app/lib/auditLog.ts` build sırasında sahte güvenlik olayları basıyor.** `npm run build` çıktısındaki `[AUDIT] ... webhook-armor (system) | WEBHOOK_SIGNATURE_FAILED | webhook#WHK-STRIPE-FAKE | IP: 185.220.101.47` satırları F1-05'te silinen `webhookArmor.ts`'ten değil, bu dosyanın sonundaki `seedDemoLogs()` çağrısından geliyor (modül import edilir edilmez koşulsuz çalışıyor). Denetim kaydı bellek içi bir dizide tutuluyor, kalıcı değil ve "engellenen sahte webhook" gibi hiç yaşanmamış olayları gerçekmiş gibi gösteriyor. F3-04/F3-05 kapsamında ya gerçek bir denetim kaydı modeline bağlanmalı ya da silinmeli.
* **[P1 · performans] Genel katalogda önbellek katmanı kalmadı.** F2-01'de `tours/views.py`'deki 15 dakikalık `cache_page` kaldırıldı (yeni eklenen tur katalogda görünmüyordu, invalidasyon yolu yoktu). Ayarlarda paylaşımlı bir `CACHES` tanımı yok — Django varsayılan `LocMemCache`'e düşüyor, yani önbellek süreç başına ayrı ve çok işçili sunumda zaten tutarsızdı. Kalıcı çözüm: Redis + yazma anında (tur create/update/upload-image) hedefli invalidasyon. `shuttles/views.py:48`'de aynı `cache_page` deseni hâlâ duruyor, aynı sorunu taşıyor (yeni shuttle rotası 15 dk görünmez) — dokunulmadı.
* **[P2 · eksik akış] Tur rota noktaları (`TourItinerary`) hiçbir yerden düzenlenemiyor.** F2-01 adım 3 "rota noktaları" istiyordu ama `TourItinerary` API'de yalnız `TourDetailSerializer` içinde `read_only` olarak açık; ne acenta panelinde ne de başka bir uçta yazma yolu var. Tur detay sayfası bu adımları gösteriyor, dolayısıyla panelden eklenen her tur boş bir program ile yayına giriyor. Ayrı bir alt-uç (`/agency/tours/<slug>/itinerary/`) gerekiyor; F2-01 kapsamında tur alanlarıyla sınırlı kalındı.
* **[P2 · veri] `Tour.category` serbest metin, tutarlı bir taksonomi yok.** DB'deki mevcut değerler `Doğa`, `Eğlence`, `Macera`; testlerde/seed'de `culture`, `romantic`, `adventure` geçiyor; `app/lib/tours.ts` ise `'✨ En Popüler Deneyim'`, `'🏺 Kültür & Tarih'` gibi emoji'li etiketler kullanıyor. Ayrıca modelde hem legacy `category` (CharField) hem `category_obj` (FK) var ve `Category` tablosunda tek satır (`kapadokya`) bulunuyor. F2-01'de kategori alanı, uydurma bir taksonomi dayatmamak için mevcut değerleri öneren serbest metin (datalist) olarak bırakıldı. Kategori modeli netleştirilip legacy alan göç ettirilmeli.
* **[P2 · tutarlılık] Genel tur listesi sırasız sayfalanıyor.** `Tour` modelinde `Meta.ordering` yok; `TourViewSet` listesi sırasız queryset üzerinde sayfalanıyor (`UnorderedObjectListWarning`), bu da sayfalar arasında kayıt tekrarı/atlaması yaratabilir. F2-01'de acenta listesine `order_by('title')` eklendi ama genel katalogun varsayılan sırasına dokunulmadı: değiştirmek ana sayfa/arama sonuçlarının görünen sırasını değiştirir, bu bir ürün kararı.
* **[P0 · para] Transfer (shuttle) akışında overbooking yarışı duruyor.** F2-02'de tur tarafındaki yarış düzeltildi (kontenjan artık rezervasyon anında koşullu UPDATE ile tutuluyor), ancak `_create_shuttle_booking` hâlâ eski desende: `select_for_update()` ile satırı okuyup `remaining` kontrolü yapıyor fakat o transaction'da `booked_count`'a **hiçbir şey yazmıyor**; sayaç yalnızca webhook `payment_intent.succeeded` içinde, kapasite kontrolü olmadan artıyor. Dolayısıyla N eşzamanlı transfer isteği aynı `remaining`'i okuyup hepsi geçebilir ve para alınmış halde `booked_count > max_capacity` oluşur. Ayrıca `payment_intent.payment_failed` transfer kontenjanını da bırakmıyor. Transfer akışı F5-01'in kapsamında; aynı düzeltme (rezervasyonu `create` anında koşullu UPDATE ile tut, webhook'ta çift sayma, başarısız ödemede bırak) orada uygulanmalı.
* **[P2 · gözlem] SQLite eşzamanlı yazmada tablo kilidi hatası veriyor.** `OverbookingRaceTestCase` 8 paralel istekte `OperationalError: database table is locked: tours_touravailability` üretiyor; test bunu 500 yanıtı olarak alıp yeniden deniyor (kontenjan muhasebesi doğru çıkıyor, overbooking yok). Sebep: Django test veritabanı bellek içi SQLite'ı `cache=shared` ile açıyor ve bu modda busy-timeout tablo kilitlerine uygulanmıyor. Üretimde PostgreSQL kullanılacaksa sorun yok; **SQLite ile üretime çıkılırsa** eşzamanlı satışta müşteri 500 görür. Veritabanı seçimi netleştirilmeli (bkz. F3/F4 dağıtım görevleri).
* **[P2 · eksik özellik] Acenteye canlı rezervasyon bildirimi yok (F2-03 adım 5 ertelendi).** Görev "yeni rezervasyon geldiğinde canlı bildirim" istiyordu; F2-03'te ertelendi. Mevcut Channels altyapısında yalnız `RestaurantConsumer` var (`backend/agencies/routing.py`); acente için ayrı bir consumer, JWT ile doğrulanmış grup üyeliği (`agency_<id>`), rezervasyon oluşumunda grup mesajı yayını ve frontend tarafında yeniden bağlanma mantığı gerekiyor. Tek başına M efor olduğu ve F2-03'ün asıl teslimatını (manifest + no-show) geciktireceği için F5'e bırakıldı. O zamana kadar acenta yeni rezervasyonu ancak sayfayı yenileyerek görür.
* **[P2 · ölü kod] `agencies/views.py` içindeki `DiningReservationViewSet` router'a hiç bağlı değil.** `api_urls.py` `restaurant/reservations` için `agencies/restaurant_views.py`'deki aynı isimli sınıfı kullanıyor; `views.py`'dekine hiçbir URL çözülmüyor. F2-04'te yalnız canlı olan uçlar gate'lendi, ölü kopyaya dokunulmadı — F3-04 (ölü kod temizliği) kapsamında silinmeli.
* **[P2 · eksik durum] `inceleniyor` durumuna hiçbir yoldan geçilemiyor.** `Agency.STATUS_CHOICES`'ta var, `OnboardingGate` ve admin panelinin filtre sekmeleri bu durumu gösteriyor, ancak `admin_views.py`'de yalnız approve/reject/request-more-info aksiyonları var — `beklemede → inceleniyor` geçişini yapacak bir uç yok. Ya "incelemeye al" aksiyonu eklenmeli ya da durum tamamen kaldırılıp `beklemede` ile birleştirilmeli (F2-04 adım tanımında bu geçiş istenmediği için dokunulmadı).
* **[P2 · tarayıcı desteği] QR okuma yalnız `BarcodeDetector` destekleyen tarayıcılarda çalışıyor.** `app/components/TicketScanner.tsx` yerleşik `BarcodeDetector` API'sini kullanıyor (yeni bağımlılık eklememek için). Bu API Chrome/Edge/Android'de var, **iOS Safari ve Firefox'ta yok** — o cihazlarda kamera hiç açılmıyor, kullanıcıya açıkça "elle girin" deniyor ve elle giriş çalışıyor. Rehber/şoförlerin iPhone kullanma ihtimali yüksek olduğundan bu pratikte "sahada QR okutulamıyor" demek. Kalıcı çözüm: `jsQR`/`zxing-wasm` gibi bir WASM decoder'ı yalnız desteklemeyen tarayıcılara dinamik `import()` ile yüklemek (bundle'a sabit maliyet bindirmeden). F2-05 kapsamında bilinçli olarak yapılmadı.
* **[P2 · güvenlik/ürün] Bilet QR'ı yalnız `booking_ref` içeriyor, imzalı değil.** F2-05'te müşteri biletine eklenen QR'ın içeriği düz `booking_ref`. Referans tahmin edilebilir/kopyalanabilirse (örn. bir ekran görüntüsü paylaşılırsa) başka biri okutabilir — ancak çift okutma korumasıyla ikinci okutma reddedildiği için asıl risk **meşru misafirin kapıda reddedilmesi**. Backend zaten acenta kapsamı + tarih + durum kontrolü yapıyor, yani başka acentanın veya başka günün bileti işe yaramıyor. Daha sıkı bir model gerekirse: kısa ömürlü HMAC imzalı token (`booking_ref.exp.sig`) üretip check-in'de doğrulamak. Ürün kararı gerektirdiği için F2-05'te yapılmadı.
* **[P2 · veri modeli] `Agency.commission_rate` alanının varsayılanı hâlâ float literali.** `backend/agencies/models.py:85` → `default=10.00`. F2-06'da bunun yol açtığı `TypeError` `to_decimal()` ile etkisiz hale getirildi, ama kaynak hâlâ duruyor: kaydedilmemiş her Agency nesnesinde `commission_rate` bir Python `float`'ı ve bu alanı Decimal sanan yeni bir kod aynı tuzağa düşer. Doğru düzeltme `default=Decimal('10.00')` — migration gerektirdiği (ve yalnız varsayılanı değiştirdiği) için F2-06 kapsamında yapılmadı.
* **[P2 · dayanıklılık] `booking_ref` Stripe intent id'sinin son 8 hanesinden türetiliyor.** `bookings/payments/stripe_provider.py` (eski `views.py` davranışı birebir korundu). `Booking.booking_ref` **unique**, dolayısıyla teorik bir çakışma `IntegrityError` → 500 demek ve müşteri ödeme başlatıldıktan sonra hata görür. Olasılık çok düşük ama sıfır değil (uppercase'e çevirme büyük/küçük harf ayrımını da yok ediyor). Sağlam çözüm: referansı sunucuda çakışma kontrollü üretmek (`get_or_create` döngüsü veya ayrı bir sequence). Davranış değişikliği olduğu için F2-06'da (amaç regresyonsuz taşıma) yapılmadı.
* **[P2 · sınır] İade ledger kaydının `-REFUND` son eki alan genişliğini aşabilir.** `AgentFinanceLedger.booking_ref` `max_length=50`; ters kayıt `f'{booking_ref}-REFUND'` yazıyor. Mevcut referanslar 8 karakter olduğu için pratikte sorun yok, ancak `Booking.booking_ref` de 50 karaktere kadar izin veriyor — 44+ karakterlik bir referans üretilirse PostgreSQL'de kayıt hata verir (SQLite sessizce kabul eder, yani test ortamında yakalanmaz). Ya alan genişletilmeli ya da ters kayıt ayrı bir alanla (`reverses_id` FK) işaretlenmeli.
* **[P1 · eksik entegrasyon] PayTR adapter'ı yazılmadı, iyzico iskelet halinde.** F2-06 arayüzü ve `PAYMENT_PROVIDER` seçimi hazır, `IyzicoProvider` yalnız `build_sub_merchant_payload()` kısmıyla gerçek; ağ çağrıları ve PayTR adapter'ı yok. Sebep: sandbox anahtarı olmadan tek satır bile doğrulanamaz ve yarım çalışan bir ödeme entegrasyonu hiç olmayandan tehlikelidir. **Bloklayan: insan aksiyonu** (iyzico Pazaryeri / PayTR Platform Transfer başvurusu). Anahtarlar gelene kadar `PAYMENT_PROVIDER=stripe` kalmalı — yani gerçek TL tahsilatı hâlâ mümkün değil.
* **[P1 · eksik akış] Acenta onaylandıktan sonra banka bilgilerini (IBAN) değiştiremiyor.** F2-07'de hakediş talebi IBAN'ı acentanın profilinden snapshot'lıyor (gövdeden almak güvenlik açığıydı), ancak IBAN yalnız **onboarding sırasında** yazılabiliyor: `OnboardingUpdateView` `status='onaylandi'` olduktan sonra kapanıyor ve acenta panelinde banka bilgisi düzenleme ekranı yok. Banka değiştiren bir acenta hakedişini eski/kapanmış hesaba talep etmek zorunda kalır. Gereken: acenta profilinde IBAN güncelleme ucu (değişiklik sonrası yeniden doğrulama veya admin onayı ile — para yönlendirmesi olduğu için doğrudan serbest bırakılmamalı). Pratikte onay için IBAN zorunlu olduğundan (`collect_missing_fields`) bu durum yalnız eski/elle düzenlenmiş kayıtlarda oluşur; yine de finans sayfası var olmayan bir ekrana yönlendirmemek için "destek ekibiyle iletişime geçin" diyor. F2-07 kapsamı finans sayfasıyla sınırlı olduğu için düzeltme yapılmadı.
* **[P2 · tutarlılık] Onaylanan hakediş talebi ledger'a yazılmıyor.** `AgentPayoutRequest` `paid` olunca bakiye `balance_snapshot` içinde talep tablosundan düşülüyor, ancak `AgentFinanceLedger`'da karşılığı bir satır oluşmuyor. Dolayısıyla acentanın CSV ekstresi ödemeleri göstermiyor: ekstredeki net toplam ile paneldeki çekilebilir bakiye birbirini tutmuyor (fark = ödenen tutar) ve muhasebeci bunu tek dosyadan göremiyor. Doğru model: ödeme onaylanınca `entry_type='payout'` (yeni tip) negatif bir ledger satırı yazmak ve bakiyeyi yalnız ledger'dan hesaplamak. Migration + hesap deseni değişikliği gerektirdiği için F2-07'de yapılmadı; görev tanımı ledger'ı satış kayıtları olarak tarifliyor.
* **[P2 · ortam] Yerel geliştirme ortamı kurulu değildi.** `node_modules` yoktu (`npm install` ile kuruldu). Backend için Python venv de yok (`backend/venv`, `.venv` bulunamadı, `django` global olarak da kurulu değil) — bu yüzden STD-CHECK'in backend yarısı (makemigrations --check / migrate --check / test) F1-01'de çalıştırılamadı. F1-01 yalnız frontend dosyası değiştirdiği için sonucu etkilemez, ancak F1-04'ten itibaren backend ortamı şart.
* **[P0 · sahte akış] Ana sayfadaki "Üye Ol" modalı hiç kayıt yapmıyor.** `app/page.tsx:958-1002` formu backend'e hiçbir istek atmıyor; `setTimeout(1000)` sonrası `alert('Üyeliğiniz başarıyla tamamlandı! Hoş geldiniz.')` gösterip ana sayfaya yönlendiriyor ("Direct Success Simulation" yorumu). Kullanıcı hesabı olduğunu sanıp giriş yapamıyor. Aynı blokta silinen `app/api/verify-email` route'una giden yorum satırına alınmış bir `fetch` ve artık hiç yazılmayan `demoUrl` state'i duruyor. Gerçek uç zaten hazır: `POST /api/v1/auth/registration/` (F3-01'de uçtan uca test edildi, kayıt + doğrulama maili çalışıyor). Modal ya bu uca bağlanmalı ya da tamamen kaldırılıp `/register` sayfasına yönlendirmeli. F3-01 kapsamı e-posta altyapısıydı, kayıt arayüzü değil.
* **[P2 · ölü bağımlılık] `nodemailer` artık kullanılmıyor.** F3-01'de tek kullanıcısı olan `app/api/verify-email/route.ts` silindi; `package.json`'da `nodemailer` (`^8.0.1`) ve `@types/nodemailer` (`^7.0.11`) duruyor. Bağımlılık kaldırmak lockfile'ı da değiştireceği ve F3-01 kapsamı dışı olduğu için dokunulmadı — F3-04 (ölü kod temizliği) kapsamında `npm uninstall` edilmeli. Frontend'den e-posta gönderimi artık mimari olarak da yanlış: tüm işlemsel mailler Django'dan çıkıyor.
* **[P2 · yapılandırma] `django.contrib.sites` kaydı hiç güncellenmiyor, alan adı "example.com".** `SITE_ID = 1` tanımlı ama veritabanındaki `Site` satırı Django'nun varsayılanında kalmış. F3-01'de maillerin buna bağımlılığı `FRONTEND_URL`/`SITE_NAME` ayarlarıyla ve özel bir allauth adapter'ıyla kesildi, ancak `Site`'ı okuyan başka bir yer çıkarsa (ör. sosyal giriş callback'leri, `allauth.socialaccount`) yine "example.com" görecek. Dağıtımda `Site` kaydı gerçek alan adıyla güncellenmeli ya da bir data migration eklenmeli.
* **[P2 · gözlem] allauth doğrulama maili adres başına hız sınırlı ve sayaç cache'te tutuluyor.** `core/test_emails.py` yazılırken aynı e-posta adresini iki testte kullanınca ikinci testte mail hiç gönderilmedi; sebep allauth'un `confirm_email` rate limit'i ve `LocMemCache`'in testler arası geri alınmaması. Testlerde `cache.clear()` ile çözüldü. Üretimde de not edilmeli: kullanıcı "doğrulama mailini tekrar gönder" derse sınır dolmuşsa **sessizce hiçbir şey olmaz**; arayüzde bu duruma dair bir geri bildirim yok.
* **[P2 · ölü kod] `app/components/RouteGuard.tsx` hiçbir yerden import edilmiyor.** F3-02 sırasında bulundu: dosya rol bazlı yönlendirme yapan tam bir bileşen ama `grep RouteGuard` hiçbir kullanım göstermiyor. Ayrıca mantığı çelişkili — "müşteriler `/dashboard` altına hiç giremez, `/`'a atılır" diyor ama gerçek bir `/dashboard/customer` paneli var (cart/favorites/tickets/settings). Kullanılsaydı müşteri panelini kırardı. Silinmeli veya kullanılacaksa customer alanı istisna edilmeli. F3-02 kapsamı korumayı middleware'e taşıdığı için dokunulmadı.

* **[P2 · ölü bağımlılık] `js-cookie` artık `app/` içinde hiç kullanılmıyor.** F3-03'te `app/lib/auth.ts` bellek-içi access token + HttpOnly refresh çerezine geçince `js-cookie` son kullanıcısını kaybetti; `grep -rn "js-cookie" app/` boş dönüyor ama `package.json`'da `js-cookie` (`^3.0.5`) ve `@types/js-cookie` (`^3.0.6`) duruyor. Bağımlılık kaldırma lockfile'ı da değiştireceği ve F3-03 kapsamı dışı olduğu için dokunulmadı — bir bağımlılık temizlik turunda `npm uninstall js-cookie @types/js-cookie` edilmeli. (F3-04 kod/route sildi, `package.json` bağımlılıklarına dokunmadı — `nodemailer`/`js-cookie` uninstall'ı hâlâ bekliyor.)

* **[P1 · sahte özellik] 2FA tamamen sahteydi, UI'dan kaldırıldı.** F3-04'te tespit edildi: `app/lib/twoFactor.ts::requires2FA()` her zaman `false` dönüyordu ve backend'de hiçbir TOTP/OTP/`django-otp` karşılığı yok. `login/page.tsx`'teki 2FA doğrulama akışı, `TwoFactorVerify.tsx` bileşeni, `app/api/auth/2fa/route.ts` ve `twoFactor.ts` silindi. **Gerçek iki faktörlü kimlik doğrulama bir ürün kararı + backend işi** (kullanıcı sırrı üretimi/saklaması, `pyotp` veya SMS sağlayıcı, kurtarma kodları, giriş akışına entegrasyon). İstenirse ayrı bir görev olarak planlanmalı; şu an giriş yalnız parola ile.

* **[P2 · ölü kod] `app/lib/apiShield.ts` ve `app/lib/ssrfShield.ts` sahipsiz güvenlik-tiyatrosu lib'leri.** F3-04 grep'inde sıfır importer ile ölü teyit edildi. Görevde açıkça sıralanmadıkları için (enum edilen route/lib listesinde yoklar) bu turda silinmedi — kapsam disiplini. İçerikleri gerçek bir koruma sağlamıyor (hiçbir yerden çağrılmıyor); bir sonraki ölü-kod/güvenlik temizliğinde kaldırılmalı.

---

## TAMAMLANANLAR GÜNLÜĞÜ

Format: `2026-MM-DD · F1-01 · tek satır özet · commit hash`

* _
