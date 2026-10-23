# Feza ve Bilbo'nun Maceraları

Feza (5 yaş) için tek oyun: önce Feza ile köpeği Bilbo'nun **evi** açılır, evden üç maceraya gidilir.
Okuma gerekmez: her macera resimli bir kapıdır, yönlendirmeler sesli (Türkçe kadın sesi).

## Evde neler var?
Feza ile Bilbo'nun sıcak, 3D oyun odası (gün batımı ışığı, pencere, kitap rafı, oyuncak treni, küp kalesi, oyuncak sandığı,
Bilbo'nun yatağı ve mama kabı, duvarda Feza ile Bilbo'nun resimleri). Feza el sallar; Bilbo kuyruk sallar, etrafı koklar.
Arka duvarda **üç büyülü kapı** var; her kapının içinde o maceranın küçük, canlı dünyası görünür:

- **Saklı Toplar Ormanı** (soldaki yeşil kapı): Feza, Bilbo, babası ve Kartal kamptan yola çıkar; dereler, sazlıklar,
  meşe koruları ve huysuz orman hayvanları. Bilbo timsahların sakladığı 10 topu koklayıp kazar; sonda Koca Huysuz Timsah.
  Kapıda: önde kocaman, el sallayan babası; tepede uçan Kartal; arkada çadır, dere, Bilbo'nun topu ve Koca Timsah.
- **Feza ve Bilbo Huysuzlara Karşı** (ortadaki büyük mor kapı, en büyük macera): sekiz hayal dünyası – Köpüklü Tuvalet Rüyası,
  Zıp Zıp Ay, Huysuz Orman, Kefir Vadisi, Köstebek ve Salyangoz Mağarası, Lav Yanardağı, Surlu Şehir ve Ejderhanın Kalesi.
  Feza ışın kılıcı ya da sihirli değnekle sevimli huysuzları neşelendirir. Kapıda: ay, yanardağ, mağara, uzakta ejderhalı kale,
  önde ışın kılıcı ve sevimli huysuzlar.
- **Dev Ev Macerası – Aytuğ Hala** (sağdaki pembe kapı): Feza, Bilbo ve Aytuğ Hala minicik olur; dev evin mutfak masasını,
  oturma odasını, mutfağı, buzdolabını ve balkonu dolaşırlar, huysuz eşyaları neşelendirip pasta malzemelerini (un, yumurta,
  çilek, krema) toplarlar; sonda dev pasta ve mumlar. Kapıda: önde kocaman, el sallayan Aytuğ Hala; yanında mumlu dev pasta, dev çilek ve yumurta.

Kapıya dokununca o maceranın cümlesi söylenir; Feza ile Bilbo koşup kapının önünde heyecanla zıplar, cümle bitince kapıdan geçerler ve macera başlar. Evde neşeli bir macera müziği çalar (konuşurken kısılır). Bilbo'ya dokununca havlar, Feza'ya dokununca
"Merhaba! Ben Feza." der. **Biten macera**nın kapısı altın renginde parlar, üstünde yıldız döner ve odada bir hatıra belirir:
ormandan Bilbo'nun topu (Bilbo onu kovalar), haladan pasta mumu, huysuzlardan hayal baloncuğu. Üçü de bitince kutlama sesi gelir.
Bir süre dokunulmazsa kapılar sırayla parlayıp seçmeyi hatırlatır.
Açılırken ve kapıdan maceraya geçerken yazısız bir yükleme ekranı görünür (logo ya da maceranın simgesi, sırayla beliren Bilbo pati izleri ve zıplayan top).
Maceradan eve dönmek için: maceranın sol üstündeki **ev düğmesine basılı tutun**.

## Nasıl açılır?
- **İnternetten:** https://goktugkarpat.github.io/feza-bilbo/
- **Bilgisayarda:** `index.html` dosyasına çift tıklayın (internetsiz de açılır).
- Sessiz açmak için adresin sonuna `?sessiz` ekleyin.

## iPad'de uygulama gibi kullanmak
1. iPad'de **Safari** ile https://goktugkarpat.github.io/feza-bilbo/ adresini açın.
2. **Paylaş** düğmesine (yukarı oklu kare) dokunun → **Ana Ekrana Ekle** → **Ekle**.
3. Ana ekranda Feza ile Bilbo'nun simgesi çıkar. İlk açılıştan sonra (bir kez internetle açın, biraz bekleyin)
   oyun ve üç macera **internetsiz** de çalışır.

İlk dokunuşta ses açılır (iPad kuralı); iPad'in sessiz düğmesi kapalı ve ses açık olsun.

## Ebeveyn için notlar
- **GitHub'a göndermek:** `yayinla.command` dosyasına çift tıklayın. İlk seferde depoyu (goktugkarpat/feza-bilbo) oluşturup
  GitHub Pages'ı açar; sonra yalnız değişiklikleri gönderir. Göndermeden önce internetsiz dosya listesini kendisi yeniler.
- **Yeni dosya eklendiyse:** `python3 tools/liste.py` internetsiz çalışma listesini (`sw.js`) yeniler.
- **Evin müziği:** `python3 tools/muzik_yap.py` (`numpy` ve `ffmpeg` gerekir, ~20 sn) sözsüz, neşeli macera müziğini (flüt, ukulele, marimba, piyano, gitar, yaylılar; ~46 sn dikişsiz döngü) yeniden üretir → `ev-muzik.js`. Feza ya da Bilbo konuşurken müzik kendiliğinden kısılır.
- **Evin seslerini değiştirmek:** cümleler `tools/ev_sesleri.json` içinde; sonra `python3 tools/ses_kaydet.py`
  (internet, `ffmpeg` ve güncel `edge-tts` gerekir: `python3 -m pip install -U edge-tts`). `ev-sesler.js` yeniden üretilir.
- Uygulama simgesi `index.html?sessiz&ikon` sayfasının 1024×1024 ekran görüntüsünden yapıldı. Logo: `python3 tools/logo_ciz.py` → `logo.png`.
- Ev ekranı maceraların kendi 3D dosyalarını kullanır (`hala/src/00_core.js`, `01_textures.js`, `04_feza.js`, `04_bilbo.js`, `04_hala.js`,
  `orman/src/05_enemies.js`, `05_forest_animals.js`); evin kendi kodu `ev-3d.js`. Cihazda 3D açılamazsa `ev-2d.js` (çizim ev) açılır
  (denemek için `?cizim`).
- Maceralar `orman/`, `hala/`, `huysuz/` klasörlerindedir; her birinin kendi notları kendi klasöründe.
