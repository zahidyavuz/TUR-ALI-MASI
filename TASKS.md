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
* **[P1 · yanıltıcı] `app/success/page.tsx` sahipsiz kaldı ve sahte banka bilgisi içeriyor.** Tek girişi silinen `app/api/checkout/route.tsx`'in `success_url`'ü idi; artık hiçbir yerden ulaşılamıyor. Sayfa "Havale/EFT ile öde" akışı sunuyor ve **uydurma bir IBAN** (`TR12 0006 2000 0001 2345 6789 00`) ile "Tourkia Turizm ve Seyahat A.Ş." unvanını gösteriyor. Ya gerçek havale akışı tasarlanmalı ya da sayfa silinmeli — müşteriye yanlış IBAN göstermesi riski var. F1-05'te silinmedi çünkü iş kararı gerektiriyor.
* **[P2 · sabit veri] `app/api/tickets/validate/route.ts` bellek içi sahte bilet listesiyle çalışıyor.** `TKT-VALID`/`TKT-USED` gibi sabit kayıtlar üzerinden QR doğrulaması yapıyor; gerçek bir bilet asla doğrulanamaz. F1-05'te `// DEPRECATED: F2-05'te silinecek` notu eklendi, silme işi F2-05'e bırakıldı.
* **[P1 · sahte veri] `app/tickets/*` tamamen sabit sahte bilet sayfası ve hâlâ URL ile erişilebilir.** `app/tickets/page.tsx` ve `app/tickets/[id]/page.tsx` `TKT-8932` / "Kapadokya Balon Turu" gibi hardcoded kayıtlar gösteriyor; kullanıcının gerçek rezervasyonlarıyla hiç ilgisi yok. F1-06'da bu sayfaya giden 4 link gerçek `/dashboard/customer/tickets` sayfasına çevrildi, ancak sayfalar silinmedi (F2-05 QR biletle doğrudan ilgili, orada karar verilmeli). O zamana kadar `/tickets` adresine elle giden bir kullanıcı sahte bilet görür.
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
* **[P2 · ortam] Yerel geliştirme ortamı kurulu değildi.** `node_modules` yoktu (`npm install` ile kuruldu). Backend için Python venv de yok (`backend/venv`, `.venv` bulunamadı, `django` global olarak da kurulu değil) — bu yüzden STD-CHECK'in backend yarısı (makemigrations --check / migrate --check / test) F1-01'de çalıştırılamadı. F1-01 yalnız frontend dosyası değiştirdiği için sonucu etkilemez, ancak F1-04'ten itibaren backend ortamı şart.

---

## TAMAMLANANLAR GÜNLÜĞÜ

Format: `2026-MM-DD · F1-01 · tek satır özet · commit hash`

* _
