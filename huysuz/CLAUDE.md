# Feza Huysuzlara Karşı – çalışma notları

- Diablo tarzı 3D oyun (three.js r170, `vendor/three.js` klasik script). Kod modüllere bölünmüş, hepsi klasik `<script src>` (ES module yok,
  file:// ile de çalışmalı). Modüller arası sözleşme: `src/SPEC.md`. Sıra: `00_core` (yardımcılar, çizici, kamera, parlama) → `01_textures` (TEX)
  → `02_audio` (AUD) → `03_fx` (FX) → `04_feza` (FEZA, ITEMS) → `05_enemies` (EDEF, EMODEL) → `06_level` (ZONES, LEVEL) → `07_game` (GAME)
  → `08_skills` (SKILLS) → `09_ui` (UI, boot, ana döngü) + `src/ui.css`. Her dosya sadece kendi genel adlarını açar (IIFE); aynı üst düzey ad iki
  dosyada olursa oyun hiç açılmaz.
- Anlatıcı cümleleri `src/02_audio.js` içinde `AUD.LINES = /*SESLER*/{...}/*SESLER-SON*/` (geçerli JSON). Cümle eklenir/değişirse
  `python3 gen_voice.py` → `sesler.js` yeniden üretilir (`.ses_onbellek/` önbellek, git'e girmez).
- Kontrol sırasında oyunu `?sessiz` ile aç.
- Kamera, kalite ve simge seçenekleri: `?kam=uzaklık,eğim`, `?basit`, `?hd`, `?ikon`.
- Bu klasör "Feza ve Bilbo'nun Maceraları" (kök: ../) oyununun bir macerasıdır. GitHub'a SADECE ebeveyn "gönder" deyince, kökten goktugkarpat/feza-bilbo deposuna (`main`) gönderilir (`../yayinla.command`).
- **Feza ve Bilbo'nun Maceraları içinde (huysuz/):** kendi `sw.js`, `manifest.webmanifest`, `icons/` yok; kökteki `../sw.js` her şeyi önbelleğe alır,
  `index.html` `../manifest.webmanifest` ve `../icons/` kullanır. `ev-dugmesi.js` (üç macerada aynı dosya) sol üstte basılı tutulan ev düğmesi
  (→ `../index.html` + sorgu) ve `FEZA_BILBO_TAMAM(id)`; `victory()` bunu `'huysuz'` ile çağırır (localStorage `fezaBilboTamam`).
  Kayıt/ayar anahtarları `huysuz_` önekli. Yalnız Türkçe; dil seçimi yok.
