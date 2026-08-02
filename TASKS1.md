# TASKS1.md — Kalan Sorunlar & Teknik Borç Yol Haritası

Bu dosya, `TASKS.md`'nin (F1–F5) tamamlanmasının ardından `## BULUNAN YENİ SORUNLAR`
bölümünde biriken **çözülmemiş** bulguların görevleştirilmiş halidir. Çözülmüş
(~~üstü çizili~~) bulgular ile F5-08'de kapatılanlar (nodemailer/js-cookie uninstall,
dev ortamı kurulumu) buraya alınmadı.

## Çalışma Kuralları (özet — tam metin `CLAUDE.md`)
1. Görevi anla → dosyaları incele → direkt uygula (planı onaya sunma).
2. Ara kod adımlarında onay isteme.
3. Kendi kendine doğrula: `makemigrations --check --dry-run` · `migrate --check` ·
   duplicate method/field/route taraması · syntax/import çalıştırma · ilgili testler.
4. Hata bulursan sormadan düzelt, tekrar doğrula.
5. Temiz olunca **PUSH ETME** → kısa özet sun (değişen dosyalar, doğrulamalar+sonuç,
   düzeltilen sorunlar, bilinçli ertelenenler).
6. Kullanıcı "push et" dedikten sonra push. **Onay almadan asla push etme.**

**STD-CHECK:** `cd backend && source venv/bin/activate && python manage.py makemigrations
--check --dry-run && python manage.py migrate --check && python manage.py test`; `cd .. &&
npx tsc --noEmit && npm run lint && npm run build`. (NOT: `npx next lint` Next 16'da
kaldırıldı → `npm run lint` kullan.)

**Commit formatı:** `feat|fix|chore(scope): açıklama [GÖREV-ID]` + `Co-Authored-By: Claude
Opus 4.6 <noreply@anthropic.com>` (HEREDOC ile). Build artefaktlarını commit'e ekleme:
`backend/logs/django.log`, `next-env.d.ts`, `public/sitemap.xml`, `tsconfig.tsbuildinfo`.

**Değişmezler:** Frontend HTTP yalnız `app/lib/api.ts → fetchAPI`; her yeni DRF ucu açık
permission sınıfı; para/kontenjan yazımı `transaction.atomic()`; fiyat her zaman sunucuda;
hardcoded sır yok. Kapsam dışı sorunu düzeltme; bu dosyanın sonundaki
`## BULUNAN YENİ SORUNLAR` bölümüne not düş.

---

# KATEGORİ 1 — Sahte / Yanıltıcı Veri (kullanıcıya yalan söyleyen yüzeyler)

> En yüksek öncelik: bunlar kullanıcıya var olmayan hesap, sahte bilet, uydurma IBAN
> veya desteklenmeyen ödeme yöntemi gösteriyor.

### [x] T1-01 · Ana sayfadaki "Üye Ol" modalı gerçek kayıt yapmıyor
**Öncelik:** P0 · **Efor:** S
**Adımlar:** `app/page.tsx` (~958-1002) "Üye Ol" modalı backend'e hiç istek atmıyor;
`setTimeout(1000)` + `alert('Üyeliğiniz başarıyla tamamlandı!')` ile sahte başarı gösterip
yönlendiriyor ("Direct Success Simulation"). Kullanıcı hesabı olduğunu sanıp giriş
yapamıyor. Gerçek uç hazır: `POST /api/v1/auth/registration/` (F3-01'de uçtan uca test
edildi). Modal bu uca bağlanmalı (Toast ile geri bildirim) **veya** tamamen kaldırılıp
`/register` sayfasına yönlendirmeli. Yorum satırına alınmış eski `fetch` + kullanılmayan
`demoUrl` state'i de temizlenmeli.
**YAPILDI:** Modal register formu artık `fetchAPI('/auth/registration/')` ile gerçek kayıt
yapıyor: şifre alanı controlled hale getirildi, kullanıcı adı e-posta yerel bölümünden
türetiliyor (`username`, `email`, `password1/2`), başarıda `login()` ile otomatik oturum +
Toast + `/`'a yönlendirme, backend validasyon hataları Toast ile gösteriliyor. Sahte
`setTimeout` başarı simülasyonu, yorumdaki eski `fetch`, kullanılmayan `demoUrl` state'i ve
tamamı sahte olan e-posta doğrulama (`isVerifyingEmail`) dalı + 6 haneli kod ekranı silindi.
Client-side min 6 karakter şifre kontrolü eklendi. tsc/lint/build temiz.

### [x] T1-02 · `app/tickets/*` sahte bilet sayfası hâlâ erişilebilir
**Öncelik:** P1 · **Efor:** S
**Adımlar:** `app/tickets/page.tsx` + `app/tickets/[id]/page.tsx` hardcoded (`TKT-8932`,
"Kapadokya Balon Turu") sahte biletler gösteriyor; kullanıcının gerçek rezervasyonlarıyla
ilgisi yok. Gerçek bilet artık `/dashboard/customer/tickets`'te. Hâlâ buraya link veren
2 nokta var: `app/components/BottomTabBar.tsx:44` (mobil alt menü) ve `app/success/page.tsx:56`.
İki linki `/dashboard/customer/tickets`'e çevir, sonra `app/tickets/*`'ı sil. (Not:
`app/success/page.tsx` T1-03'te silinecekse oradaki link kendiliğinden gider.)
**YAPILDI:** `BottomTabBar.tsx:44` ve `success/page.tsx:56` linkleri
`/dashboard/customer/tickets`'e çevrildi; `app/tickets/page.tsx` + `app/tickets/[id]/page.tsx`
`git rm` ile silindi (dizin kalktı). Kalan `/tickets` referansı yok. tsc/lint/build temiz.

### [x] T1-03 · `app/success/page.tsx` sahipsiz + uydurma IBAN gösteriyor
**Öncelik:** P1 · **Efor:** S
**Adımlar:** Tek girişi (silinen `app/api/checkout/route.tsx`) kalktığı için sayfaya hiçbir
yerden ulaşılamıyor. Sayfa "Havale/EFT" akışında **uydurma IBAN** (`TR12 0006 2000 0001
2345 6789 00`) + "Tourkia Turizm ve Seyahat A.Ş." unvanını gösteriyor — müşteriye yanlış
hesap gösterme riski. Karar: gerçek havale akışı yoksa **sayfayı sil** (önerilen). Gerçek
havale planlanıyorsa ayrı görev + gerçek IBAN yapılandırması gerekir.
**YAPILDI:** `/success`'e hiçbir yerden referans olmadığı doğrulandı (grep temiz);
`app/success/page.tsx` `git rm` ile silindi. Uydurma IBAN + banka bilgileri + placeholder
WhatsApp numarası (`905555555555`) kaldırıldı. tsc/lint/build temiz.

### [x] T1-04 · `app/lib/auditLog.ts` build sırasında sahte güvenlik olayları basıyor
**Öncelik:** P2 · **Efor:** S
**Adımlar:** `seedDemoLogs()` modül import edilir edilmez koşulsuz çalışıyor ve
`[AUDIT] ... WEBHOOK_SIGNATURE_FAILED | webhook#WHK-STRIPE-FAKE | IP: 185.220.101.47`
gibi hiç yaşanmamış olayları gerçekmiş gibi basıyor (bellek içi, kalıcı değil). Ya gerçek
bir denetim kaydı modeline bağla ya da `seedDemoLogs()` + sahte tohumları sil.
**YAPILDI (önceden çözülmüş):** `app/lib/auditLog.ts` zaten `e7424e7` (F3-04 "sahte
güvenlik katmanlarını kaldır") ile silinmiş. HEAD'de dosya + `seedDemoLogs` +
`WHK-STRIPE-FAKE` referansı yok (grep temiz). Bu bulgu güncelliğini yitirmiş; ek işlem
gerekmedi.

### [~] T1-05 · Footer'da desteklenmeyen ödeme yöntemleri listeleniyor
**Öncelik:** P1 · **Efor:** S · **Bloklayan:** PSP kararı (T3-01)
**Adımlar:** `app/components/Footer.tsx` "Ödeme Yöntemleri"nde VISA, Mastercard, MİR,
UnionPay, WeChat Pay, Alipay rozetleri var; gerçekte yalnız Stripe. MİR/UnionPay/WeChat/
Alipay desteklenmiyor. PSP (iyzico/PayTR) canlıya alındığında gerçek yöntem listesiyle
değiştir. O zamana kadar en azından desteklenmeyenleri kaldır.
**KISMEN YAPILDI:** Desteklenmeyen MİR, UnionPay, WeChat Pay, Alipay rozetleri kaldırıldı;
Stripe'ın işlediği VISA + Mastercard (kart ağları) bırakıldı. Nihai/kesin liste PSP kararı
(T3-01) canlıya alınınca güncellenecek — bu yüzden görev [~] (kısmi) olarak işaretlendi.

---

# KATEGORİ 2 — Eksik / Kırık Akışlar

### [x] T2-01 · Ödeme sonrası `/checkout-success` sayfası yok → 404
**Öncelik:** P1 · **Efor:** M
**Adımlar:** `app/checkout/page.tsx` Stripe onayından sonra `returnUrl`'i
`/checkout-success?ref=<booking-uuid>`'e kuruyor ama `app/checkout-success/` sayfası yok →
kart doğrulandıktan sonra kullanıcı 404 görüyor. Hem üye hem misafir için ödeme-sonrası
onay sayfası oluştur: `ref` (üye) veya imzalı `token` (misafir, F4-07 deseni) ile Booking'i
çekip durum + bilet linki göster.
**YAPILDI:** `/checkout-success` sayfası aslında mevcuttu (üye `ref` akışı çalışıyordu),
ama **misafir** için kırıktı: `GET /bookings/<id>/` `IsAuthenticated` istediğinden ve
anonim queryset `none()` döndüğünden misafir ödeme sonrası "Rezervasyon bulunamadı"
görüyordu. Düzeltme: (1) `BookingSerializer`'a yalnız misafir bookinglerine dolan salt-okunur
`ticket_token` (imzalı) alanı eklendi (üyede None). (2) `checkout/page.tsx` misafir
rezervasyonunda `returnUrl`'i `?token=<ticket_token>` ile kuruyor. (3) `checkout-success`
sayfası `token` varsa `/bookings/guest-ticket/?token=` (AllowAny) ucundan, yoksa `ref` ile
`/bookings/<id>/`'den durumu poll ediyor. Yeni testler: misafir yanıtı token içerir +
guest-ticket ile çözülür; üye bookinginde token None. makemigrations temiz (model değişmedi),
286 backend testi + tsc/lint/build temiz.

### [x] T2-02 · Restoran menüsü checkout'u kırık
**Öncelik:** P1 · **Efor:** L
**Adımlar:** `/checkout?menuId=<id>&type=meal` (restoran-menu "Hemen Al") `tourId`
göndermiyor; checkout `tourId` olmadan çalışamıyor. Şu an dürüst bir "henüz çevrimiçi ödemeye
açık değildir" mesajı gösteriliyor. Yemek satın alma akışı baştan tasarlanmalı: `Menu` →
Booking (`service_type='meal'`) köprüsü, sunucuda fiyat, `DiningReservation` ile ilişki.
Backend `DiningReservationViewSet` var ama ödemesiz ayrı akış.
**YAPILDI (dürüst mesaj + kaldır yaklaşımı):** İnceleme, görevin öncülünün geçersiz
olduğunu ortaya koydu. Hem `app/menu/[slug]/page.tsx` hem `app/restaurant-menu/[slug]/page.tsx`
**tamamen mock** veriyle çalışıyor (menuId = sahte string 'm1'..'m30', gerçek DB Menu PK'si
değil); backend'de public menü API'si YOK (yalnız agent-owner yönetim uçları), `Booking`'de
`menu` FK'si yok ve yemek için kapasite/slot modeli yok. Uçtan uca gerçek akış "L" değil,
CAT6 ölçeğinde çok parçalı bir iş (aşağıya yeni sorun olarak loglandı). Bu görevde: iki mock
sayfadaki "Hemen Al"/"Hemen Sipariş Ver" butonlarının kırık `/checkout?menuId=...` yönlendirmesi
kaldırıldı; tıklamada sahte checkout yerine dürüst "🔒 Çevrimiçi Ödeme Yakında" durumu gösteriliyor.
`app/menu/[slug]` içinde kullanılmaz hâle gelen `useRouter` importu temizlendi.

### [x] T2-03 · Acenta onaylandıktan sonra IBAN/banka bilgisi değiştiremiyor
**Öncelik:** P1 · **Efor:** M
**Adımlar:** IBAN yalnız onboarding sırasında yazılabiliyor; `OnboardingUpdateView`
`status='onaylandi'` sonrası kapanıyor ve panelde banka düzenleme ekranı yok. Banka değiştiren
acenta hakedişini eski hesaba talep etmek zorunda. Acenta profilinde IBAN güncelleme ucu ekle —
**para yönlendirmesi olduğu için** değişiklik admin onayı veya yeniden doğrulamaya tabi
olmalı (doğrudan serbest bırakma). Finans sayfası şu an "destek ile iletişime geçin" diyor.

**YAPILDI (admin onaylı değişiklik talebi):** Para yönlendirmesi doğrudan
uygulanmaz; yeni IBAN bir onay kuyruğundan geçer, onaya kadar eski hesap aktif kalır.
- **Model:** `agencies/finance_models.py → BankAccountChangeRequest` (agency FK,
  proposed_iban / proposed_bank_account_holder / proposed_bank_name, previous_iban
  snapshot, status pending/approved/rejected, admin_notes, requested_at, resolved_at).
  Migration `0014_bankaccountchangerequest`.
- **Acenta ucu:** `AgencyBankChangeView` — `GET/POST /agency/finance/bank-change/`
  (`[IsAuthenticated, IsAgentOwner, IsVerifiedAgent]`). POST IBAN'ı `IBAN_RE` ile
  doğrular, `select_for_update` altında bekleyen talep varsa reddeder, **`Agency.iban`'a
  DOKUNMAZ**; sadece pending talep oluşturur.
- **Admin ucu:** `AdminBankChangeViewSet` — `GET /admin/bank-changes/`,
  `POST .../approve/` (proposed→canlı Agency alanlarına kopyalar, bildirim),
  `POST .../reject/` (sebep zorunlu, IBAN değişmez, bildirim). `[IsAdminUser]`.
  Ayrıca Django admin `BankAccountChangeRequestAdmin` (approve/reject aksiyonları).
- **Frontend:** `app/dashboard/agency/finance/page.tsx` — "destek ile iletişime geçin"
  bloğu gerçek IBAN düzenleme formuyla değiştirildi; bekleyen talep durumu + reddedilen
  son talep sebebi gösteriliyor; onay uyarısı ("onaya kadar eski hesap aktif") eklendi.
- **Test:** `BankAccountChangeTestCase` (13 test) — pending oluşur & canlı IBAN
  değişmez, çift talep bloklanır, geçersiz IBAN/eksik sahip reddedilir, admin onay
  canlı IBAN'ı günceller, admin ret dokunmaz, ret sebebi zorunlu, çift onay bloklanır,
  çözüm sonrası yeniden talep, onaysız acenta 403, admin kuyruğu staff ister.

### [x] T2-04 · Spa modülü frontend + B2B yönetim ucu yok
**Öncelik:** P1 · **Efor:** L
**Adımlar:** `spas` backend'i tam (public read-only + booking + finans + testler) ama:
**(1) Frontend** — spa mekân/hizmet listeleme + detay + checkout yok; `app/checkout/page.tsx`
`service_type='spa'` dalını taşımıyor (transfer/combo deseni gerekir). **(2) B2B** — acenta
için `AgencySpaViewSet` (shuttles'taki `AgencyShuttleViewSet` deseni: RLS +
`StrictMassAssignmentPermission` + toplu slot üretimi + görsel yükleme) yok; şu an yalnız
Django admin'den girilebiliyor. İki alt-parça ayrı ele alınabilir.

**YAPILDI:**
- **(1) Frontend (müşteri):** `app/lib/spas.ts` (transfer/shuttle deseni: `SpaVenue`/`SpaService`/
  `SpaAvailabilitySlot` arayüzleri + `fetchSpaVenues`/`fetchSpaVenue`/`fetchSpaService`);
  `app/spa/page.tsx` (mekân listeleme + konum/arama filtresi); `app/spa/[id]/page.tsx` (mekân
  detay + hizmet seçimi → seçilen hizmetin slot'ları ayrı çekilir → tarih/saat/kişi → checkout).
  `app/checkout/page.tsx`'e `isSpa` dalı (spaServiceId/time param, `service_type:'spa'` payload,
  spa sipariş özeti; spa'da otel/pickup alanı gizli). Navbar'a `/spa` bağlantısı.
- **(2) B2B:** `backend/agencies/agency_spas_views.py` — iki ViewSet (spa iki katmanlı olduğu için):
  `AgencySpaVenueViewSet` (mekân CRUD + görsel yükleme + soft-detach) ve `AgencySpaServiceViewSet`
  (hizmet CRUD + 90 günlük toplu slot üretimi + manifest + update-capacity + görsel). Her ikisi de
  `[IsAuthenticated, IsAgentOwner, IsVerifiedAgent, StrictMassAssignmentPermission]`; izolasyon
  venue → `agency=`, service → `venue__agency=`. Hizmet create'te mekân sahipliği ayrıca doğrulanır.
  Slug PK sunucuda ada/başlığa göre üretilir (Türkçe karakter çevirisiyle). PATCH beyaz listesi;
  soft delete (venue: agency=None+is_active=False, service: is_active=False).
  Serializer'lar `spas/serializers.py`'de (`AgencySpaVenueSerializer`/`AgencySpaServiceSerializer` —
  görseller create'te opsiyonel, id/agency read-only). `api_urls.py`'e `agency/spas/venues` +
  `agency/spas/services` route'ları. `app/dashboard/agency/spas/page.tsx` (iki panelli yönetim:
  mekân seç → hizmetlerini düzenle) + sidebar bağlantısı.
- **Doğrulama:** makemigrations --check (değişiklik yok, model dokunulmadı), migrate --check OK,
  310 backend testi OK (12 yeni `AgencySpaCrudTestCase`: slug üretimi, slot sayısı 90×2, yabancı
  mekân reddi, PATCH beyaz listesi, soft delete, RLS izolasyonu, kapasite güncelleme, onaysız 403,
  anonim 401), tsc temiz, lint temiz, build başarılı (/spa, /spa/[id], /dashboard/agency/spas),
  AST metod + route dup taraması temiz.

---

# KATEGORİ 3 — Finans & Ödeme Dayanıklılığı

### [ ] T3-01 · PayTR adapter yazılmadı, iyzico iskelet halinde
**Öncelik:** P1 · **Efor:** L · **Bloklayan:** insan aksiyonu (PSP başvurusu)
**Adımlar:** `PAYMENT_PROVIDER` arayüzü + seçimi hazır; `IyzicoProvider` yalnız
`build_sub_merchant_payload()` gerçek, ağ çağrıları + PayTR adapter'ı yok. Sandbox anahtarı
olmadan doğrulanamaz. iyzico Pazaryeri / PayTR Platform Transfer başvurusu tamamlanıp
anahtarlar gelince adapterlar yazılıp test edilmeli. O zamana kadar `PAYMENT_PROVIDER=stripe`
— gerçek TL tahsilatı henüz mümkün değil. (T1-05 ve mimari kararlar buna bağlı.)

### [x] T3-02 · Onaylanan hakediş talebi ledger'a yazılmıyor
**Öncelik:** P2 · **Efor:** M
**Adımlar:** `AgentPayoutRequest` `approved/paid` olunca bakiye `balance_snapshot` içinde talep
tablosundan düşülüyor ama `AgentFinanceLedger`'da karşılık satır yok → CSV ekstresi ödemeleri
göstermiyor, ekstre net toplamı ile panel bakiyesi tutmuyor. Çözüm: `entry_type='payout'`
(yeni tip) negatif ledger satırı yaz ve bakiyeyi yalnız ledger'dan hesapla. Migration + hesap
deseni değişikliği gerekir. (F5-09 onay kuyruğu bu satırı yazacak yeri sağlıyor.)
> **YAPILDI:** `AgentFinanceLedger`'a `('payout','Hakediş Ödemesi')` tipi + idempotent
> `create_payout_entry(payout)` (ref `PAYOUT-<id>`, negatif `net_amount`, gross/komisyon 0)
> eklendi. Bakiye artık YALNIZ ledger'dan hesaplanıyor: `balance_snapshot` ve
> `AgentPayoutRequest.available_balance` `total_net - pending_payout` döner; onaylı/ödenen
> talep artık ledger satırı olduğu için `paid_out` bakiyeden AYRICA düşülmez (çift sayım
> giderildi, `paid_out` yalnız bilgi amaçlı). Admin onay ucu (`AdminPayoutViewSet.approve`)
> ve admin aksiyonu (`AgentPayoutRequestAdmin.mark_paid`, bulk update → satır-satır
> `select_for_update` + ledger yazımı) `transaction.atomic` içinde payout satırını yazıyor;
> `mark_rejected` ledger'a dokunmuyor. Migration `0015_alter_agentfinanceledger_entry_type`.
> Regresyon: onay ledger satırı yazıyor, CSV ekstresinde görünüyor ve ekstre net toplamı =
> panel bakiyesi, idempotent tek satır. STD-CHECK backend temiz (313 test OK); frontend
> dokunulmadı, API yanıt şekilleri değişmedi.

### [x] T3-03 · `Agency.commission_rate` varsayılanı float literali
**Öncelik:** P2 · **Efor:** S
**Adımlar:** `backend/agencies/models.py:85` → `default=10.00` (float). F2-06'da `to_decimal()`
ile etkisi giderildi ama kaynak duruyor: kaydedilmemiş her Agency nesnesinde oran Python
`float`'ı ve bu alanı Decimal sanan yeni kod aynı tuzağa düşer. `default=Decimal('10.00')`
yap + migration.
> **YAPILDI:** `models.py`'ye `from decimal import Decimal` eklendi, alan varsayılanı
> `default=Decimal('10.00')` yapıldı. Kaydedilmemiş `Agency()` nesnesinde `commission_rate`
> artık `Decimal` (önce `float`'tı) — doğrulandı. **Migration gerekmedi:** Django
> `DecimalField` varsayılanını `10.00` float ile `Decimal('10.00')` için aynı deconstruct
> ediyor; `makemigrations --check` "No changes" döndü, DB şeması değişmiyor (yalnız kaynak
> tuzağı giderildi). STD-CHECK: agencies suite 130 test OK, makemigrations --check temiz.

### [x] T3-04 · `booking_ref` Stripe intent id son 8 hanesinden türetiliyor
**Öncelik:** P2 · **Efor:** M
**Adımlar:** `bookings/payments/stripe_provider.py`. `Booking.booking_ref` **unique** →
teorik çakışma `IntegrityError`/500 (uppercase'e çevirme büyük/küçük harf ayrımını da yok
ediyor). Sunucuda çakışma kontrollü üret (`get_or_create` döngüsü veya sequence). Davranış
değişikliği içerdiğinden regresyon testiyle korunmalı.
> **YAPILDI:** Referans artık PSP intent id'sinden türetilmez. `Booking.generate_unique_ref()`
> classmethod'u eklendi: 10 haneli, karışan karakterler (O/0, I/1) dışlanmış alfabeden
> `secrets` ile üretilir ve mevcut referansla çakışırsa yenilenir (10 denemede bulunamazsa
> açık `RuntimeError`). `bookings/views.py`'deki 4 akış (tur/shuttle/spa/combo) `booking_ref =
> intent.booking_ref` yerine bunu çağırıyor. `PaymentIntentResult.booking_ref` alanı ve
> Stripe'ın `intent.id[-8:].upper()` türetimi kaldırıldı; ödeme–bilet eşlemesi zaten ayrı
> `Booking.payment_intent_id` sütununda izleniyor. Regresyon: uzunluk/alfabe, çakışmada
> yenileme, tükenince RuntimeError, sonuç dataclass'ında alan yok. STD-CHECK: 318 test OK.

### [x] T3-05 · İade ledger kaydının `-REFUND` son eki alan genişliğini aşabilir
**Öncelik:** P2 · **Efor:** S
**Adımlar:** `AgentFinanceLedger.booking_ref` `max_length=50`; ters kayıt `f'{ref}-REFUND'`.
`Booking.booking_ref` 50 karaktere kadar izinli — 44+ karakterlik referansta PostgreSQL hata
verir (SQLite sessizce kabul, testte yakalanmaz). Alanı genişlet **veya** ters kaydı ayrı bir
alanla işaretle (`reverses_id` FK). T3-04 ile birlikte ele alınabilir.
> **YAPILDI:** `AgentFinanceLedger.booking_ref` `max_length` 50 → 64 (Booking.booking_ref 50 +
> `-REFUND` 7 = 57 sığar; `PAYOUT-` öneki de küçük). Migration
> `0016_alter_agentfinanceledger_booking_ref`. Regresyon: 50 karakterlik referansta iade
> kaydı üretiliyor ve `booking_ref` alan genişliğini aşmıyor. Not: T3-04 sonrası üretilen
> referanslar zaten 10 hane, yani taşma pratikte de yapısal olarak giderildi.

---

# KATEGORİ 4 — Veri Modeli & Taksonomi

### [ ] T4-01 · `Tour.category` serbest metin, tutarlı taksonomi yok
**Öncelik:** P2 · **Efor:** M
**Adımlar:** DB'de `Doğa/Eğlence/Macera`, testlerde `culture/romantic/adventure`,
`app/lib/tours.ts`'te emoji'li etiketler karışık. Modelde hem legacy `category` (CharField)
hem `category_obj` (FK) var, `Category` tablosunda tek satır (`kapadokya`). Taksonomiyi
netleştir, `Category` tablosunu doldur, turları `category_obj`'e bağla, legacy `category`'yi
göç ettir. **T4-02 (kategori filtresi) ve T4-05 (Tour.duration) ile aynı kök — birlikte.**

### [ ] T4-02 · Kategori filtresi `Category` tablosu boş olduğu için çalışmıyor
**Öncelik:** P2 · **Efor:** S · **Bağlı:** T4-01
**Adımlar:** F4-01 filtresi `category_obj__slug` kullanıyor (doğru mimari) ama tablo boş +
turlar FK'siz → kategori kutucukları ya görünmüyor ya çoğu turu eliyor. T4-01 çözülünce
kendiliğinden düzelir; ayrı iş yalnız doğrulamadır.

### [ ] T4-03 · Genel tur listesi sırasız sayfalanıyor
**Öncelik:** P2 · **Efor:** S
**Adımlar:** `Tour` modelinde `Meta.ordering` yok; `TourViewSet` sırasız queryset üzerinde
sayfalıyor (`UnorderedObjectListWarning`) → sayfalar arası kayıt tekrarı/atlaması olabilir.
Deterministik bir sıra ekle (`Meta.ordering` veya viewset `order_by`). Ana sayfa/arama görünen
sırasını etkilediğinden ürün kararına dikkat.

### [ ] T4-04 · Tur rota noktaları (`TourItinerary`) hiçbir yerden düzenlenemiyor
**Öncelik:** P2 · **Efor:** M
**Adımlar:** `TourItinerary` yalnız `TourDetailSerializer` içinde `read_only`; yazma ucu yok →
panelden eklenen her tur boş programla yayına giriyor (detay sayfası bu adımları gösteriyor).
Yazma alt-ucu ekle (`/agency/tours/<slug>/itinerary/`, RLS korumalı) + panel UI.

### [ ] T4-05 · `Tour.duration` serbest metin — süre filtresi kırılgan
**Öncelik:** P2 · **Efor:** M · **Bağlı:** T4-01
**Adımlar:** Filtre `duration icontains` ("Saat"/"Gün") ama DB değerleri karışık ("4 Saat"/
"3 Gün" vs "2 Days"/"1 Day") → İngilizce "Days" turları "Gün" filtresine düşmüyor. Yapısal
süre alanı ekle (sayısal + tip enum) ve serbest metni göç ettir. T4-01 ile aynı kök.

### [ ] T4-06 · `inceleniyor` acenta durumuna hiçbir yoldan geçilemiyor
**Öncelik:** P2 · **Efor:** S
**Adımlar:** `Agency.STATUS_CHOICES`'ta var, `OnboardingGate` + admin filtre sekmeleri
gösteriyor ama `admin_views.py`'de yalnız approve/reject/request-more-info aksiyonları var —
`beklemede → inceleniyor` geçiş ucu yok. Ya "incelemeye al" aksiyonu ekle ya durumu kaldırıp
`beklemede` ile birleştir.

---

# KATEGORİ 5 — Performans & Altyapı

### [ ] T5-01 · Genel katalogda önbellek katmanı yok (Redis)
**Öncelik:** P1 · **Efor:** M
**Adımlar:** F2-01'de `tours/views.py` `cache_page` kaldırıldı (invalidasyon yolu yoktu).
Ayarlarda paylaşımlı `CACHES` yok → Django `LocMemCache`'e düşüyor (süreç başına ayrı, çok
işçili sunumda tutarsız). Redis `CACHES` tanımla + yazma anında (tur/shuttle create/update/
upload-image) hedefli invalidasyon. `shuttles/views.py:48` hâlâ eski `cache_page` desenini
taşıyor (yeni rota 15 dk görünmez) — birlikte düzelt.

### [ ] T5-02 · Nonce'lu CSP ISR'yi engelliyor (kararlaştırıldı, açık kalem)
**Öncelik:** P1 · **Efor:** L
**Adımlar:** `layout.tsx` istek-başına CSP nonce'u (`headers()`) tüm route'ları
`ƒ (Dynamic)` yapıyor → statik/ISR yok. F5-07'de karar: **CSP korundu, ISR atlandı.** ISR
gerçekten isteniyorsa: layout'u bölüp nonce'u yalnız gerekli segmentlerde uygula, **veya**
statik sayfalarda `unsafe-inline`+hash'e dön. Ürün/güvenlik dengesi kararı gerektirir; bu
görev yalnız gerçek statik LCP kazancı hedefleniyorsa açılmalı.

### [ ] T5-03 · `next/image` optimize etmiyor (`images.unoptimized: true`)
**Öncelik:** P2 · **Efor:** M
**Adımlar:** F5-07'de tüm `<img>`'ler `next/image`'e taşındı ama `next.config.ts`
`unoptimized: true` → yalnız lazy-load + CLS koruması var, resize/WebP/AVIF yok. Gerçek
optimizasyon için Next image optimizer (sunucu/loader) **veya** harici CDN loader yapılandır.
Deploy güvenliği sağlanınca `unoptimized` kaldır.

### [ ] T5-04 · Lighthouse mobil LCP < 2.5s ölçümü alınmadı
**Öncelik:** P2 · **Efor:** S · **Bloklayan:** çalışan sunucu (insan aksiyonu)
**Adımlar:** F5-07 hedefi ölçüp rapora yazmaktı; bu ortamda çalışan sunucu + lighthouse yok.
Staging/canlıda `lighthouse --preset=mobile` ile ölç, LCP'yi rapora yaz, gerekirse T5-02/T5-03
ile iyileştir.

### [ ] T5-05 · SQLite eşzamanlı yazmada tablo kilidi (DB seçimi netleşmeli)
**Öncelik:** P2 · **Efor:** M · **Bloklayan:** dağıtım kararı
**Adımlar:** `OverbookingRaceTestCase` 8 paralel istekte `database table is locked` üretiyor
(bellek içi SQLite `cache=shared`, busy-timeout kilitlere uygulanmıyor). PostgreSQL'de sorun
yok; **SQLite ile üretime çıkılırsa** eşzamanlı satışta müşteri 500 görür. Üretim DB'si
PostgreSQL olarak netleştirilip `DATABASE_URL` + dağıtım yapılandırması sabitlenmeli.

---

# KATEGORİ 6 — Restoran Modülü Tamamlama

### [ ] T6-01 · Restoran masa/zaman-slotu CRUD ucu yok — `availability/page.tsx` mock
**Öncelik:** P2 · **Efor:** L
**Adımlar:** Menü CRUD (`/menus/`) gerçek ama `app/dashboard/restaurant/availability/page.tsx`
(slot bazlı `maxTables`/`maxPax`/`currentBookedPax`) backend karşılığı olmadığı için mock.
Yeni model (ör. `RestaurantSlot`: date/time/max_tables/max_pax/booked_pax) + migration + RLS
korumalı ViewSet (F2-01 deseni) + panel UI. T2-02 (yemek checkout) ile ilişkili.

### [ ] T6-02 · (Opsiyonel) Restoran menüsü gerçek çapraz satış (cross-sell)
**Öncelik:** P2 · **Efor:** M · **Yalnızca istenirse**
**Adımlar:** F5-02'de sahte "Ekstra İstekler / Cross-Sell" UI'dan çıkarıldı (`Menu` modelinde
karşılığı yoktu). Gerçek çapraz satış istenirse: yeni model + menüye bağlama + checkout'ta
fiyata ekleme + sunucu doğrulaması. Ürün kararı gerektirir.

---

# KATEGORİ 7 — Gerçek-Zamanlı Bildirim

### [ ] T7-01 · Acenteye canlı rezervasyon bildirimi yok
**Öncelik:** P2 · **Efor:** M
**Adımlar:** F2-03 adım 5 ertelendi. Channels'ta yalnız `RestaurantConsumer` var
(`backend/agencies/routing.py`). Acente için ayrı consumer + JWT'li grup üyeliği
(`agency_<id>`) + rezervasyon oluşumunda grup yayını + frontend reconnect gerekir. O zamana
kadar acenta yeni rezervasyonu ancak sayfa yenileyerek görüyor.

---

# KATEGORİ 8 — Güvenlik Sertleştirme

### [ ] T8-01 · Gerçek 2FA (iki faktörlü kimlik doğrulama)
**Öncelik:** P1 · **Efor:** L · **Ürün kararı**
**Adımlar:** F3-04'te sahte 2FA UI'dan söküldü (`requires2FA()` hep `false`, backend karşılığı
yoktu). Gerçek 2FA: kullanıcı sırrı üretimi/saklaması (`pyotp` veya SMS sağlayıcı), kurtarma
kodları, giriş akışına entegrasyon. Şu an giriş yalnız parola ile. İstenirse tam görev olarak
planla.

### [ ] T8-02 · CSP `style-src` hâlâ `unsafe-inline` içeriyor
**Öncelik:** P2 · **Efor:** M
**Adımlar:** `script-src` temiz (nonce+strict-dynamic) ama `style-src 'unsafe-inline'` korundu:
11 dosyada 21 satır-içi `style={{}}` + `next/font`/`styled-jsx` var, nonce satır-içi `style`
özniteliğine uygulanamaz. Sıkılaştırmak için: satır-içi stilleri Tailwind/`data-*`+CSS'e taşı
(21 nokta + font stratejisi) veya CSP3 `'unsafe-hashes'` + hash (kırılgan). Kazanç düşük (CSS
enjeksiyonu script yürütmez), efor yüksek.

### [ ] T8-03 · Bilet QR'ı imzalı değil (yalnız `booking_ref`)
**Öncelik:** P2 · **Efor:** M · **Ürün kararı**
**Adımlar:** QR içeriği düz `booking_ref`. Çift-okutma koruması + acenta kapsamı/tarih/durum
kontrolü olduğundan başka acentanın/günün bileti işe yaramıyor; asıl risk meşru misafirin
reddi. Daha sıkı model isteniyorsa kısa ömürlü HMAC token (`booking_ref.exp.sig`) üretip
check-in'de doğrula.

### [ ] T8-04 · QR okuma yalnız `BarcodeDetector` destekleyen tarayıcılarda
**Öncelik:** P2 · **Efor:** M
**Adımlar:** `app/components/TicketScanner.tsx` yerleşik `BarcodeDetector` kullanıyor
(Chrome/Edge/Android var; **iOS Safari + Firefox yok** → kamera açılmıyor, elle giriş çalışıyor).
Rehber/şoförlerde iPhone yaygın → sahada QR okutulamıyor. `jsQR`/`zxing-wasm` WASM decoder'ı
yalnız desteklemeyen tarayıcılara dinamik `import()` ile yükle (bundle'a sabit maliyet bindirme).

---

# KATEGORİ 9 — Ölü Kod Temizliği

> Tek bir "ölü kod temizliği" turunda toplu ele alınabilir. Her biri sıfır-importer teyitli.

### [ ] T9-01 · Sahipsiz frontend dosyaları
**Öncelik:** P2 · **Efor:** S
**Adımlar:** Sıfır importer teyidiyle sil/temizle:
- `app/components/CheckoutForm.tsx` (sahipsiz; `StripePaymentSection` ile çakışıyor; içinde
  `open.er-api.com` döviz çağrısı var).
- `app/components/RouteGuard.tsx` (kullanılmıyor + mantığı çelişkili: `/dashboard/customer`
  panelini kırardı).
- `app/lib/apiShield.ts` + `app/lib/ssrfShield.ts` (güvenlik-tiyatrosu, sıfır importer).
- `app/lib/secureVault.ts` kart yardımcıları (`formatCardInput/formatCvvInput/
  formatExpiryInput/maskCardNumber/storePaymentToken` ölü; **ama** `isSessionValid`/
  `secureClear` `app/lib/auth.ts` tarafından kullanılıyor → dosyayı bütün silme, cerrahi
  çıkar).
- `app/checkout/page.tsx:8` kullanılmayan `recordFailedAttempt` importu (rate-limit sayacı
  hiç artırılmıyor; ödeme hata yolu gerçekleşince gözden geçir).

### [ ] T9-02 · Backend ölü kod: kayıtsız `DiningReservationViewSet`
**Öncelik:** P2 · **Efor:** S
**Adımlar:** `agencies/views.py::DiningReservationViewSet` hiçbir router'a kayıtlı değil
(`restaurant/reservations` → `agencies/restaurant_views.py`'deki sınıfı kullanıyor). Kayıtsız
kopyayı sil (aynı isim iki modülde kafa karıştırıcı; perms yalnız `[IsAuthenticated]`,
docstring var olmayan `/api/v1/table-reservations/`'a atıf yapıyor).

### [ ] T9-03 · Ana sayfa kullanılmayan `tours` fetch'i
**Öncelik:** P2 · **Efor:** S
**Adımlar:** `app/page.tsx` `tours` state'ini fetch ediyor ama vitrinler hardcoded diziden
besleniyor → fetch hiç render edilmiyor (ölü ağ isteği). Ya vitrinleri gerçek `tours`'a bağla
(ürün kararı) ya fetch'i kaldır.

### [ ] T9-04 · `vip_membership` okuma dalları ölü
**Öncelik:** P2 · **Efor:** S
**Adımlar:** Tek yazan yer (checkout simülasyonu) F1-04'te silindi; `app/tour/[slug]/page.tsx:93`
+ `app/taste/page.tsx:115` hâlâ okuyor → VIP indirimi/rozeti hiç tetiklenmiyor. Gerçek üyelik
modeli backend'e eklenmeyecekse okuma dallarını sil.

### [ ] T9-05 · `backend/` altındaki tek-seferlik/yıkıcı betikler
**Öncelik:** P2 · **Efor:** S
**Adımlar:** `backend/fix_images.py`, `backend/fix_images_2.py`, `backend/update_tours.py`
(hepsi `Tour.objects.all().delete()` + Wikimedia indirme), `backend/seed_availabilities.py`,
`backend/seed_cap_tours.py` versiyon kontrolünde. Seed'ler tutulacaksa `backend/scripts/` veya
management command'e (`python manage.py seed_demo`) taşı; değilse sil. **Yıkıcı `delete()`
içerenler yanlış ortamda çalışırsa veri kaybı riski.**

---

# KATEGORİ 10 — Yapılandırma & Süreç (çoğu insan aksiyonu)

### [ ] T10-01 · CI branch protection elle açılmalı
**Öncelik:** P1 · **Efor:** S · **Bloklayan:** GitHub repo ayarı (insan)
**Adımlar:** `.github/workflows/ci.yml` var (backend+frontend PR/main'de koşuyor) ama
"geçmeden merge edilemez" bir repo ayarı. Settings → Branches → `main` → "Require status checks
to pass before merging" aç, `backend` + `frontend` check'lerini zorunlu işaretle (ideal:
"Require branches to be up to date" + PR review).

### [ ] T10-02 · `django.contrib.sites` kaydı "example.com"
**Öncelik:** P2 · **Efor:** S
**Adımlar:** `SITE_ID = 1` ama DB'deki `Site` satırı Django varsayılanında. Mailler
`FRONTEND_URL`/`SITE_NAME` ile bağımsızlaştırıldı ama `Site`'ı okuyan başka yer (sosyal giriş
callback'leri, `allauth.socialaccount`) "example.com" görür. Dağıtımda `Site`'ı gerçek alan
adıyla güncelle veya data migration ekle.

### [ ] T10-03 · allauth doğrulama maili yeniden gönderiminde sessiz başarısızlık
**Öncelik:** P2 · **Efor:** S
**Adımlar:** allauth `confirm_email` adres başına hız sınırlı; sınır dolunca "tekrar gönder"
**sessizce hiçbir şey yapmıyor**, arayüzde geri bildirim yok. UI'da rate-limit durumunu
kullanıcıya bildir (bekleme süresi veya "biraz sonra tekrar deneyin").

### [ ] T10-04 · STD-CHECK tanımı `next lint`'i güncellemeli
**Öncelik:** P2 · **Efor:** S
**Adımlar:** `TASKS.md` STD-CHECK'i `npx next lint` diyor ama Next 16 komutu kaldırdı. Doğru
komut `npm run lint` (`package.json` `"lint": "eslint"`). Doküman güncellemesi. (Bu dosyanın
STD-CHECK bölümünde zaten düzeltildi.)

---

# KATEGORİ 11 — Tasarım Sistemi Migrasyonu

### [ ] T11-01 · Tasarım sistemi sayfa-sayfa migrasyonu + `DashboardShell`
**Öncelik:** P2 · **Efor:** L
**Adımlar:** F5-06 temeli (token'lar + `app/components/ui/` primitive'leri + Toast) atıldı.
Kalan: **(1)** ~258× keyfi `#008cb3`/`#0B132B` değerini token'a taşı ve elle yazılmış buton/
input/kart işaretlemesini primitive'lerle değiştir — **kademeli, tek PR'da her şey değil.**
**(2) `DashboardShell`** — agency + restaurant dashboard layout'ları %95 duplike
(sidebar+topbar+bildirim); ortak shell'e çıkar (riskli refactor, ayrı PR). Not: `--card-bg`
her iki modda bilerek beyaz (kod yorumu), dokunma.

---

## Önerilen Sıra (kısaca)
1. **T1-01** (P0 sahte kayıt) → **T1-03/T1-02** (sahte IBAN/bilet) → **T2-01** (checkout 404).
2. Finans dayanıklılığı hızlı kazanımlar: **T3-03, T3-05** (S efor).
3. Veri modeli kökü: **T4-01** → T4-02/T4-05 kendiliğinden.
4. **T5-01** (Redis cache) performans.
5. Ölü kod turu: **T9-01…T9-05** tek PR.
6. İnsan-bloklu kalemler (T3-01, T5-04, T5-05, T10-01) sahibine iletilsin.

---

## BULUNAN YENİ SORUNLAR
_(Bu dosyadaki görevler işlenirken çıkan yeni sorunlar buraya eklenir.)_

* **[YENİ] Restoran menü deneyimi tamamen mock — gerçek Menü→Booking akışı yok (T2-02'den).**
  **Öncelik:** P1 · **Efor:** XL (CAT6 kapsamı). T2-02 incelemesinde çıktı. Müşteriye dönük
  iki restoran sayfası (`app/menu/[slug]/page.tsx`, `app/restaurant-menu/[slug]/page.tsx`)
  hardcoded mock veriyle çalışıyor; gerçek `Menu`/`Agency(restoran)` verisini çekmiyor.
  Backend'de **public menü API'si yok** (yalnız agent-owner `restaurant_views.py` yönetim
  uçları). Gerçek yemek satın alma için gerekenler: (1) public menü/restoran listeleme +
  detay API'si (AllowAny serializer + permission), (2) iki mock sayfanın gerçek veriye
  bağlanması, (3) `Booking.menu` FK'si (migration) veya combo_group benzeri gevşek bağ,
  (4) `_create_meal_booking` backend yolu (menu_id → sunucu fiyatı `Menu.effective_price()`
  → PaymentIntent → Booking(`service_type='meal'`) + `DiningReservation` linki), (5) checkout'ta
  meal UI. **Ürün kararları:** yemek alımı tarih/saat slotu (masa) rezervasyonu mu içerir,
  masa kapasitesi/availability modeli olacak mı, "yemek bileti" neyi temsil eder? Karar
  gerektirdiği için ayrı görev olarak açılmalı.
