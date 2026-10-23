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
