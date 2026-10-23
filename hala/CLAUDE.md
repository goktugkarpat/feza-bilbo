# Feza, Bilbo ve Aytuğ Hala: Dev Ev Macerası – çalışma notları

- 5 yaşındaki Feza için Diablo tarzı, yalnız Türkçe 3D aksiyon-macera (three.js r170, `vendor/three.js` klasik script; ES module yok,
  file:// ile de çalışmalı). Feza, Bilbo ve Aytuğ Hala minicik olup evde dağılan sihirli şekerlerin canlandırdığı sevimli huysuzları
  neşelendirir, pasta malzemelerini toplar. Korkutucu hiçbir şey yok.
- Modüller arası sözleşme: `src/SPEC.md` (önce en üstteki "Dev Ev API"). Yükleme sırası `index.html`'de; her dosya yalnız kendi genel adını açar.
  Bölümler `src/06z_<id>.js` (BOLUM.define), huysuzlar `src/05h_huysuzlar.js`, bosslar `src/05b_bosslar.js`, Aytuğ Hala `src/04_hala.js`,
  merkez (mutfak masası) `src/06z_masa.js`, hikâye `src/10_story.js`, mini oyunlar `src/08m_minigame.js`.
- Anlatıcı (Aytuğ Hala) cümleleri `src/02_audio.js` içinde `AUD.LINES = /*SESLER*/{...}/*SESLER-SON*/` (geçerli JSON). Cümle eklenir/değişirse
  `python3 gen_voice.py` → `sesler.js` (tr-TR-EmelNeural; `.ses_onbellek/` git'e girmez). Ajan/konu cümleleri ayrı dosyalarda:
  `src/02l_*.js` → `Object.assign(AUD.LINES, {...})` (gen_voice.py bunları da okur; `--liste` ağsız listeler). Hikâye: `src/02l_hikaye.js`.
- Kontrol sırasında oyunu `?sessiz` ile aç. `?hepsiacik` Pasta Krallığı kilidini açar (test). `?kam=uzaklık,eğim`, `?basit`, `?hd`, `?ikon`.
- GitHub'a SADECE kullanıcı "yükle / GitHub'a gönder" dediğinde gönder (depo: github.com/goktugkarpat/feza-aytug-hala, `main`'e doğrudan).
  Kullanıcı `yayinla.command` ile de gönderebilir (ilk seferde depoyu oluşturup GitHub Pages'ı açar).
- **Feza ve Bilbo'nun Maceraları içinde (hala/):** kendi `sw.js`, `manifest.webmanifest`, `icons/` yok; kökteki `../sw.js` her şeyi önbelleğe alır,
  `index.html` `../manifest.webmanifest` ve `../icons/` kullanır. `ev-dugmesi.js` (üç macerada aynı dosya) sol üstte basılı tutulan ev düğmesi
  (→ `../index.html` + sorgu) ve `FEZA_BILBO_TAMAM(id)`; `victory()` bunu `'hala'` ile çağırır (localStorage `fezaBilboTamam`).
  Kayıt/ayar anahtarları `hala_` önekli. Yalnız Türkçe; dil seçimi yok.
