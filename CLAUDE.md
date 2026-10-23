# Feza ve Bilbo'nun Maceraları – çalışma notları

- 5 yaşındaki Feza için tek oyun: Feza ile Bilbo'nun evi (başlangıç ekranı) + üç macera. Yalnız Türkçe (İngilizce tamamen kaldırıldı). Feza okuma bilmiyor: menüde yazıya dayanma, resim + seslendirme.
- Maceralar alt klasörlerde, her biri kendi Three.js oyunu olarak (aşama 1: kodları neredeyse olduğu gibi):
  - `orman/` – Bilbo ve Saklı Toplar Ormanı (eski `feza-bilbo-orman-macerasi`)
  - `hala/` – Feza, Bilbo ve Aytuğ Hala: Dev Ev Macerası (eski `feza-aytug-hala`)
  - `huysuz/` – Feza ve Bilbo Huysuzlara Karşı (eski `feza-huysuzlara-karsi`)
- Kök: `index.html` (ev/menü), `manifest.webmanifest`, tek `sw.js` (önek `feza-bilbo-`, yalnız kendi önekini siler; alt klasörlerin kendi service worker'ı kaydedilmez), `icons/`.
- Maceradan eve dönüş: her macerada sol üstte ev düğmesi (basılı tut) → `../index.html`. Macera bitince `localStorage 'fezaBilboTamam'` (JSON dizi: 'orman','hala','huysuz') güncellenir; ev ekranında biten kapı parlar ve hatıra eşyası görünür.
- Seslendirme: edge-tts tr-TR-EmelNeural (her maceranın kendi `gen_voice.py`/`sesler.js`'i; evin sesleri kökte).
- Test her zaman `?sessiz`. GitHub'a SADECE ebeveyn "gönder" deyince (yeni depo: goktugkarpat/feza-bilbo).
- Aşama 2 (sonra): ortak motor/Feza/Bilbo dosyalarını tek kopyaya indirme, en iyi Feza/Bilbo modelini her yerde kullanma.
- Ev ekranı (kök): `index.html` → `ev-3d.js` (Three.js oda + 3 portal dünyası; motor/model dosyalarını alt klasörlerden YALNIZ OKUR:
  `hala/vendor/three.js`, `hala/src/00_core.js`, `01_textures.js`, `04_feza.js`, `04_bilbo.js`, `04_hala.js`, `orman/src/05_enemies.js`,
  `05_forest_animals.js` — bunların genel API'si değişirse ev de etkilenir). Yedek: `ev-2d.js` (WebGL yoksa; `?cizim`). Logo `logo.png`
  (`tools/logo_ciz.py`), sesler `ev-sesler.js` (`tools/ses_kaydet.py`, cümleler `tools/ev_sesleri.json`), sw listesi `tools/liste.py`
  (yayinla.command çalıştırır). Test bayrakları: `?sessiz`, `?tamam=orman,hala,huysuz` (bitmiş gibi göster, kaydetmez), `?ikon`.
