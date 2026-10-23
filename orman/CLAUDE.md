# Bilbo ve Saklı Toplar Ormanı

Feza, Bilbo, Baba ve Kartal ile geçen bağımsız, çocuklara uygun orman macerası. Ana kahraman Feza; diğerleri otomatik yardımcıdır. Tam 10 top, sekiz hayvan türü, büyük timsah boss ve tek uzun orman bölümü vardır.

- Parent AGENTS.md applies. All runtime files are classic local scripts, including the vendored three.js. file:// and offline play must work.
- Test only with ?sessiz and muted browsers. Turkish narrator Emel is prerecorded; this adventure is Turkish-only; do not substitute browser TTS.
- Contracts are in src/SPEC.md. Keep cached/batched models, chunked world visibility and current frame pacing.
- Independent saves and preferences must not overwrite the other adventures (keys are prefixed).
- Bu klasör "Feza ve Bilbo'nun Maceraları" (kök: ../) oyununun bir macerasıdır. GitHub'a yalnız ebeveyn "gönder" deyince, kökten goktugkarpat/feza-bilbo deposuna gönderilir.
- **Feza ve Bilbo'nun Maceraları içinde (orman/):** kendi `sw.js`, `manifest.webmanifest`, `icons/` yok; kökteki `../sw.js` her şeyi önbelleğe alır,
  `index.html` `../manifest.webmanifest` ve `../icons/` kullanır. `ev-dugmesi.js` (üç macerada aynı dosya) sol üstte basılı tutulan ev düğmesi
  (→ `../index.html` + sorgu) ve `FEZA_BILBO_TAMAM(id)`; `victory()` bunu `'orman'` ile çağırır (localStorage `fezaBilboTamam`).
  Kayıt/ayar anahtarları `orman_` önekli. Yalnız Türkçe; dil seçimi yok.
