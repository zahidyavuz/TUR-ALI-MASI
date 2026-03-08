# Melih Tours – Ücretsiz Deploy (Vercel)

## Yöntem 1: Vercel CLI (Hızlı)

1. **Vercel hesabı:** [vercel.com](https://vercel.com) → Sign Up (GitHub veya e-posta ile ücretsiz).

2. **Terminalde proje klasöründe:**
   ```bash
   npx vercel
   ```
3. İlk seferde:
   - "Log in" derse tarayıcı açılır → Giriş yap.
   - "Set up and deploy?" → **Y** (Enter).
   - Proje adı/ayarlar için Enter ile varsayılanları kabul edebilirsin.

4. Bittiğinde örnek link: `https://melih-tours-xxxx.vercel.app`

5. **Production (kalıcı) link için:**
   ```bash
   npx vercel --prod
   ```

---

## Yöntem 2: GitHub + Vercel (Otomatik güncelleme)

1. **GitHub’da repo oluştur:** [github.com/new](https://github.com/new) → `melih-tours` adında boş repo.

2. **Projede Git ve push:**
   ```bash
   cd "c:\Users\Melih\Desktop\melih tur\melih-tours"
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADIN/melih-tours.git
   git push -u origin main
   ```
   (`KULLANICI_ADIN` yerine kendi GitHub kullanıcı adını yaz.)

3. **Vercel’e bağla:** [vercel.com/new](https://vercel.com/new) → "Import Git Repository" → GitHub’dan `melih-tours` seç → Deploy.

4. Her `git push` sonrası site otomatik güncellenir.

---

## Ortam değişkenleri (Stripe / e-posta vb.)

Ödeme veya e-posta kullanıyorsan Vercel’de tanımla:

1. Vercel Dashboard → Projen → **Settings** → **Environment Variables**
2. Projede kullandığın değişkenleri ekle, örneğin:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - E-posta/API key’ler (`.env` veya `.env.local`’de ne varsa)

Deploy ücretsiz; özel domain istersen Vercel’den ekleyebilirsin.
