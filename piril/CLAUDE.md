# Feza ile Pırıl: Kayıp Ejderha Işıkları – çalışma notları

- 5 yaşındaki Feza için Diablo tarzı, yalnız Türkçe 3D aksiyon-macera (three.js r170, `vendor/three.js` klasik script; ES module yok,
  file:// ile de çalışmalı). Feza ile uyku arkadaşı yavru ejderha Pırıl, Koca Fırtına Bulutu'nun esnemesiyle 5 diyara savrulan
  ejderha ışıklarını geri toplar; her bölüm sonundaki sevimli boss neşelenince ışığı verir, Pırıl yeni bir şey öğrenir. Korkutucu
  hiçbir şey yok, böcek yok. Bilbo ve Aytuğ Hala bu macerada YOK.
- Sözleşme: `PIRIL.md` (önce bunu oku: akış, dosya sahipliği, API'ler), motor ayrıntısı `src/SPEC.md`. Yükleme sırası `index.html`'de;
  her dosya yalnız kendi genel adını açar. Merkez `src/06z_yuva.js` (Uyku Yuvası), bölümler `src/06z_<id>.js` + `src/05z_<id>.js`,
  Pırıl `src/04_piril*.js`, hikâye `src/10_story.js`, mini oyunlar `src/08m_minigame.js`.
- Cümleler `src/02l_*.js` → `Object.assign(AUD.LINES, {...})` (`pr_` anlatıcı, `pp_` Pırıl). Değişince `python3 gen_voice.py` → `sesler.js`
  (tr-TR-EmelNeural; `--liste` ağsız listeler).
- Kontrol sırasında `?sessiz`. `?hepsiacik` bütün bölümleri açar, `?girissiz` giriş masalını atlar, `?secimsiz` kahraman seçimini atlar,
  `?kam=uzaklık,eğim`, `?basit`, `?hd`, `?ikon`. Test kancaları `window.__qa` (09_ui.js sonu), `GAME._victory()` final.
- "Feza ve Bilbo'nun Maceraları" (kök: ../) içinde 4. macera: kendi `sw.js`/manifest/simgesi yok; kökteki `../sw.js` önbelleğe alır
  (`../tools/liste.py`). `ev-dugmesi.js` ev düğmesi + `FEZA_BILBO_TAMAM('piril')`. Kayıt/ayar anahtarları `piril_` önekli.
- GitHub'a SADECE ebeveyn "gönder" deyince, kökten (`../yayinla.command`).
