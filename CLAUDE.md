## gstack (recommended)

This project uses [gstack](https://github.com/garrytan/gstack) for AI-assisted workflows.
Install it for the best experience:

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

Skills like /qa, /ship, /review, /investigate, and /browse become available after install.
Use /browse for all web browsing. Use ~/.claude/skills/gstack/... for gstack file paths.

## Çalışma Kuralları — Onay Akışı

Görevler üzerinde çalışırken:
1. Görevi anla, dosyaları incele, planı çıkar — planı onaya sunma, direkt uygulamaya geç.
2. Kod yazarken/düzenlerken ara adımlarda onay isteme.
3. Uygulama bittikten sonra kendi başına şunları doğrula:
   - python manage.py makemigrations --check --dry-run
   - python manage.py migrate --check
   - Duplicate method/field/route taraması (AST parse ile)
   - Yazılan kodun syntax/import hatası içermediğini çalıştırarak doğrula
   - İlgili mevcut testler varsa çalıştır
4. Hata veya eksik bulunursa, sormadan düzelt, tekrar doğrula.
5. Her şey temiz olduğunda PUSH ETME. Bunun yerine şunları içeren kısa bir özet sun:
   - Ne değişti (dosya listesi + kısa açıklama)
   - Hangi doğrulamalar yapıldı ve sonuçları
   - Bulunup düzeltilen sorunlar varsa
   - Bilerek çözülmeyen/ertelenen bir şey varsa açıkça belirt
6. Kullanıcı "push et" dedikten sonra push yap. Onay almadan asla push etme.
