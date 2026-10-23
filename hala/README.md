# Feza, Bilbo ve Aytuğ Hala: Dev Ev Macerası 🎂🐾

5 yaşındaki Feza için yapılmış, üç boyutlu, Türkçe seslendirmeli bir macera oyunu (Diablo tarzı, ama çocuklara göre).
Aytuğ Hala, Feza'ya sürpriz bir pasta hazırlıyor. Pastanın üstüne sihirli renkli şekerler serperken Bilbo un torbasına burnunu sokup hapşırıyor:
şekerler havaya uçuyor ve Feza, Bilbo ve Aytuğ Hala minicik oluyor. Şekerlerin değdiği eşyalar canlanıp sevimli **huysuzlara** dönüşüyor.
Üçü dev bir dünyaya dönüşen evi dolaşıp huysuzları neşelendiriyor ve pastanın malzemelerini (un, yumurta, çilek, krema) topluyor.
Sonunda pasta tamamlanıyor, herkes normal boyuna dönüyor ve Feza pastanın mumlarını üflüyor.
Anlatıcı Aytuğ Hala'nın kendisi. Bütün yaratıklar sevimli ve güler yüzlü; kan yok, ölüm yok, böcek yok, korkutucu hiçbir şey yok.

## Nasıl açılır

- **İnternette:** https://goktugkarpat.github.io/feza-bilbo/ (ev ekranında pasta kapısı)
- **Bilgisayarda:** `index.html` dosyasına çift tıkla. Kurulum ya da internet gerekmez.
- **iPad'de:** Safari ile oyun adresini açıp Paylaş › **Ana Ekrana Ekle** de. Oyun kendi simgesiyle, tam ekran bir uygulama gibi açılır.
  İlk açılıştan sonra **internet olmadan da** çalışır (ana oyunun `../sw.js` dosyası bu macerayı da cihaza kaydeder).
- **Yerel deneme:** `python3 serve.py` çalıştır; yazdığı adres aynı Wi-Fi'daki tablette de açılır.

## Nasıl oynanır

- **Başlamak:** Başlıkta büyük **Oyna** düğmesine bas. Kısa bir giriş sahnesi (Bilbo'nun hapşırması ve minicik oluş) gelir; ekrana dokununca
  hızlanır, sağ üstteki **Geç** ile atlanır. Kayıt varsa **Devam Et** kaldığın yerden sürdürür.
- **Yürümek:** Parmağını ekranda gitmek istediğin yere bas ya da sürükle. Feza parmağının altındaki yere koşar. Bölümlerdeki küçük krem renkli yön işaretleri ana yolu gösterir.
- **Vurmak:** Bir huysuza dokun: Feza yanına gidip vurur. Yakınına gelen huysuza kendiliğinden de vurur. Sağ alttaki büyük düğme de vurur;
  düğmenin resmi takılı silahı gösterir (tahta kaşık, oklava…). Neşelenen huysuz kocaman gülümser, kalpler saçar ve kaybolur;
  bıraktığı renkli şekerler mıknatısla Feza'ya uçar.
- **Yetenekler:** Seviye atladıkça vuruş düğmesinin çevresinde açılır: **Krema Fışkırtma** (kirazlı krema topları), **Kaşık Kasırgası**
  (Feza'nın çevresinde dönen tahta kaşıklar) ve **Şeker Yağmuru** (gökten renkli şekerler). Her biri **yıldız şekerle** üç kademe güçlenir
  (mor yıldız düğmesi). Yıldız şeker mini oyunlardan, seviye atlamaktan ve bosslardan gelir.
- **Takım Hamlesi:** Hala hazır olduğunda yakındaki huysuzlara karşı kendiliğinden yardım eder; Feza ile el ele zıplayıp onları neşelendirir. Ayrı düğme yoktur.
- **Can:** Sol alttaki kırmızı top Feza'nın canıdır. Yanındaki iksirle doldurulur; Feza 5 iksirle başlar (en fazla 5 taşır), huysuzlardan ara sıra yenisi düşer. Kaybetmek yok: Feza yorulup düşerse Aytuğ Hala
  koşup elinden tutar ve onu kaldırır; bölüm baştan başlamaz.
- **Hazineler:** Sandıklardan ve oyuncaklardan ev temalı eşyalar çıkar. Daha güçlüsü bulununca Feza hemen giyer; 🎒 çantadan istediğin silahı,
  şapkayı ve pelerini seçebilirsin. Sıradan eşyalar sessizce çantaya girer, özel eşyalar savaş bitince kartla gösterilir.
- **Okumak gerekmez:** Bütün yönergeleri Aytuğ Hala sesle söyler; sol üstte konuşurken ağzı oynayan Hala yüzü görünür.
- **Klavye (yedek):** WASD / oklar yürür, **Boşluk** vurur, **1–2–3** yetenekler, **Q** iksir, **K** Bilbo'ya bin,
  **Y** yetenek güçlendirme, **B** çanta, **M** harita, **Esc** mola.

## Aytuğ Hala

Kırmızı polarlı, gür kıvırcık saçlı, başında siyah desenli bandana ve tepesinde güneş gözlüğüyle Aytuğ Hala hep Feza'nın yanındadır:

- **Pasta Topu:** Huysuz gruplarına krema topu atar. Huysuzu hiçbir zaman tek başına neşelendirmez; son vuruş hep Feza'nındır.
- **Sarılma:** Feza'nın canı azalınca koşup sarılır, kalpler saçılır ve can dolar.
- **Polar Kalkan:** Boss büyük bir saldırıya hazırlanınca kollarını açıp parlayan bir kalkan açar.
- **Kaldırma:** Feza düşerse "Hadi Feza, kalk!" deyip diz çöker ve onu elinden tutup kaldırır.
- **Yol gösterme:** Feza bir süre durursa gidilecek yolu işaret eder ("Bu tarafa Feza, gel!"). Ara sıra alkışlar ve farklı övgüler söyler.
- Feza sala, kaydırağa ya da tekneye binince kenarda bekler; seviye atlayınca ve kayıp eşyası bulununca sevinir, bölüm sonunda dans eder.

## Bilbo

Çikolata renkli Labrador Bilbo Feza'yı takip eder, yakındaki huysuzlara havlar ve ara sıra zıplayıp onları sakinleştirir.

- **Bilbo'ya binmek:** Sağdaki **Bin** düğmesiyle Feza 10 saniye Bilbo'nun sırtında hızlı koşar; vuruş ve yetenekler savaşta da çalışır.
  Bekleme süresi basıldığı anda başlar ve 30 saniyedir. Oturma Odası'ndaki patili halka
  ise bir yarış başlatır: Bilbo'yla koşup 10 toz yumağı toplayana altın şeker.
- **Kayıp eşyalar:** Her odada Aytuğ Hala'nın bir eşyası kaybolmuştur (gözlük, anahtar, toka, telefon). Bilbo koklayıp havlar, kazar ve eşyayı çıkarır.
- **Aksesuarlar:** Kırmızı tasma, mavi puantiyeli bandana, parti şapkası, güneş gözlüğü ve minik pelerin.

## Mutfak Masası (merkez)

Oyun Aytuğ Hala'nın mutfak masasında başlar. Feza minicik olduğu için masa dev bir oyun alanıdır: damarlı ahşap, kareli örtü, un torbası,
çay bardağı, kurabiye kavanozu ve tarif defteri. Burada huysuz yoktur.

- **Pasta:** Masanın ortasında durur ve getirilen her malzemeyle büyür: boş kalıp → kek tabanı → iki kat → çilek dolgusu → krema kaplama.
  Pastaya dokununca **süsleme oyunu** açılır: çilek, krema çiçeği, renkli serpme, şeker yıldız, kalp, mum, Bilbo kurabiyesi, F harfi…
  süsler parmakla pastaya sürüklenir. **Geri al**, **Temizle** ve **Bitti** düğmeleri vardır; süsler kaydedilir.
- **Gardırop:** Altı kostüm: Günlük, Pastacı, Süper Kahraman, Şövalye, Kâşif ve Astronot. Her kostüm görünüşü ve küçük bir gücü değiştirir.
- **Bilbo'nun Köşesi:** Bilbo'nun aksesuarları seçilir.
- **Çıkartma Albümü:** Her odanın huysuzları, bossu, kayıp eşyası ve gizli şeyleri için bir sayfa. Kazanılan çıkartmalar renkli ve parlak,
  kazanılmayanlar gri siluettir; dokununca Aytuğ Hala adını söyler.
- **Mini Oyun Köşesi:** Açılan mini oyunlar burada tekrar oynanır, en iyi skorların yıldızları görünür.
- **Günün Sürprizi:** Her gün bir kez açılan hediye kutusu: kurdeleyi çek, içinden süs, çıkartma, Bilbo aksesuarı ya da altın şeker çıkar.
- **Kapılar:** Masanın kenarındaki kapılar odalara iner. Sıradaki odanın kapısına yerde parlayan bir iz gider ve üstünde bir yıldız zıplar.
  Paneller, Feza istasyonda kısa bir an durunca açılır.

## Odalar

Her oda üç alandan ve bir boss alanından oluşur. Bir alanın çıkışı **renkli şeker çitle** kapalıdır: üstündeki rozet kalan huysuzları gösterir.
Huysuzların çoğu neşelenince ikinci bir grup gelir ("Bak bak, daha çok huysuz geliyor!"); onlar da neşelenince çit yere iner ve yol açılır.
Kalan huysuzlar Feza'ya doğru gelir, yerde bir ok en yakınını gösterir. Bossu neşelendirmek odanın malzemesini kazandırır.

1. **Oturma Odası** (malzeme: **un**): zikzak desenli dev halı ormanı, balık sırtı parke, kitap ve video kaseti kuleleri, dev televizyon.
   Kumandanın kırmızı tuşuna basınca TV'de çizgi film oynar; dik duran kitaplar domino gibi devrilir, kaset şeridi uzayıp şeker saçar.
   Koltuk altında Bilbo'yla toz yumağı yarışı var; Hala'nın **gözlüğü** burada. Huysuzlar: toz tavşanları, kumandalar, tek çoraplar, boya kalemleri ve
   vurulunca ikiye bölünen yastıkçıklar. Boss: **Uykucu Süpürge**.
2. **Mutfak** (malzeme: **yumurta**): tezgâh tepeleri, un dağları, lavabo gölü ve dolap içi. Bulaşık süngerinde zıplanır, tereyağında kayılır,
   musluk açılıp kapanır, yoğurt kabı teknesiyle göl turu yapılır; dolabın kapağı gizli geçidi açar. Hala'nın **anahtarı** burada.
   Huysuzlar: tahta kaşıklar, köpük balonları, un torbaları, çatalcıklar ve çay bardakları. Boss: **Düdüklü Tencere**.
3. **Buzdolabı** (malzeme: **çilek**): cam raflar, süt şişeleri, buz pisti, zıplatan jöle tepeleri, dondurma kaydırağı, buz çanları ve kar topu.
   Soğuk ama sıcak hisli, kar tanesi ışıltılı bir dünya. Hala'nın **tokası** burada. Huysuzlar: buz küpleri, jöle ayıcıklar, süt damlaları,
   penguen şişeler ve bezelye takımı. Boss: **Dondurma Kralı**.
4. **Balkon Bahçesi** (isteğe bağlı ödül odası): dev saksılar, sulama kabı, zıplatan çiçek yatakları, dev papatya ve gerberalar, kuş yemi bahçesi
   ve serçeler. Hala'nın **telefonu** burada. Huysuzlar: saksıcıklar, sulama kabıcıklar, mandallar, bahçe eldivenleri, dikenli güller
   ve Feza'nın en sevdiği **kaktüsler** (dikenleri yumuşak ve yuvarlak uçlu). Boss: **Uykucu Hortum**. Ödül: Süper Kahraman kostümü ve çiçek süsleri.
5. **Pasta Krallığı** (final; üç malzeme toplanınca açılır): krema nehirleri, bisküvi sal, çilek ormanı, lolipop fenerleri, kurabiye evleri,
   şeker dağı, pamuk şeker bulutları ve çikolata şelalesi. Huysuzlar: şekerleme askerleri, çilekçikler, krema topları, kaçıp saklanan
   kurabiye adamlar ve marshmallowlar. Boss: **Koca Huysuz Pasta** (malzeme: **krema**).

Her odada bir elit (taçlı, kocaman) huysuz ve nadir, parlak huysuzlar da vardır: nadirler altın şeker ve gizli çıkartma verir.

### Bossların oyunları

Her saldırı önceden büyük renkli bir yer işaretiyle görünür ve yavaştır; kaçması eğlencelidir. Hala her yeni hamlede kısa bir ipucu söyler.

- **Uykucu Süpürge:** hortumuyla hafifçe çeker (ters yöne koşan kurtulur), toz halkaları üfler, kablosuyla dalga yapar. Arada horlayıp uyuklar:
  uyurken vuruşlar daha çok işler.
- **Düdüklü Tencere:** kapağını fırlatıp yere indirir, buhar bulutu çıkarır (içinde yavaşlarsın), mercimek ve nohut yağdırır. Neşelenince düdükle şarkı çalar.
- **Dondurma Kralı:** kar topları atar, karnının üstünde kayar, tepesindeki top katını yuvarlar. Canı azaldıkça erir: "Eriyorum!"
- **Uykucu Hortum:** fıskiyesinden su püskürtür, damla atar, hoplayıp yerde dalga yapar, mandal çağırır.
- **Koca Huysuz Pasta:** üç aşamalıdır: krema halkaları, kurabiye askerleri ve çilek yağmuru, dönen krema dalgası. Sonunda yorulur:
  Feza ile Hala kendiliğinden Takım Hamlesi yaparak onu neşelendirir.

Final töreninde herkes normal boyuna döner, Aytuğ Hala mumları yakar ("İyi ki varsın Feza!"), Feza **Üfle!** düğmesiyle mumları söndürür,
konfeti patlar, Bilbo kremayı yalar ve Hala Feza'ya sarılır. Kısa jenerikten sonra masaya dönülür ve **Şeker Yağmuru** tekrar turu başlar.

## Mini oyunlar

Odalardaki hediye kutularından ve masadaki Mini Oyun Köşesi'nden oynanır. Her biri 30–60 saniye sürer, sonunda 1–3 yıldız verir; kaybetmek yoktur.

- **Şeker Yakala:** Bilbo sepetle düşen şekerleri yakalar.
- **Tencere Müzik:** Tencere kapakları do-re-mi-sol-la çalar; halkalar ritimle iner.
- **Buz Pateni:** Feza buzda kayarak yıldız toplar.
- **Balon Patlat:** Aytuğ Hala bir renk söyler, o renkteki balonlar patlatılır.
- **Kek Süsle:** Hala'nın siparişindeki süsler keke konur.
- **Çiçek Sula:** Hala'nın söylediği çiçek sulanır, büyüyüp açar.

## Seviyeye göre denge

- Her oda, girildiği andaki Feza seviyesine göre hazırlanır. Hangi odadan başlanırsa başlansın dövüşler o seviyeye uygun olur:
  sıradan huysuzlar benzer sayıda vuruşta neşelenir, elitler ve bosslar biraz daha dayanıklıdır, huysuzların vuruşu Feza'nın canına göre ayarlıdır.
- Oda içinde seviye atlamak ya da daha güçlü eşya takmak huysuzları yeniden büyütmez; bulunan güçlenmeler gerçekten işe yarar.
- Denge, 5 yaşındaki bir çocuk gibi oynayan (geç tepki veren, ıskalayan, kaçmayan) bir bilgisayar oyuncusuyla 1, 3, 5, 8 ve 12. seviyelerde ölçülerek ayarlandı:
  huysuz başına 3–4 vuruş, boss başına yaklaşık 40 saniye; Feza'nın canı ara sıra heyecanlı biçimde azalır ama neredeyse hiç düşmez.
- Seviye atlamak giderek uzar: ilk oda yaklaşık 2. seviyede biter, bütün oyun 8–10. seviyeler civarındadır.

## Mola ve kayıt

⏸ düğmesi oyunu durdurur: müzik ve efekt ayarları, **Kaydet** ve **Baştan Başla** buradadır. Oyun kendiliğinden kaydedilmez;
kaldığın yerden sürmek için **Kaydet**'e bas. Seviye, eşyalar, kostümler, çıkartmalar, pasta süsleri ve mini oyun skorları kayda girer.
**Normal** ve **Zor** zorluk seçilebilir; 5 yaş için Normal önerilir.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `index.html` | Oyunu açan sayfa |
| `src/*.js`, `src/ui.css`, `src/hub.css` | Oyunun bölümleri: Feza, Aytuğ Hala, Bilbo, eşyalar, huysuzlar ve bosslar, odalar ve masa, oyun kuralları, yetenekler, mini oyunlar, hikâye, ekran |
| `src/SPEC.md` | Bölümler arası teknik sözleşme |
| `vendor/three.js` | 3D kütüphanesi (three.js r170, MIT lisansı) |
| `sesler.js` | Aytuğ Hala'nın Türkçe kadın sesiyle kaydedilmiş cümleleri (dosyaya gömülü) |
| `bilbo-ses.js`, `assets/audio/` | Bilbo'nun havlaması |
| `gen_voice.py` | Cümle değişirse sesleri yeniden kaydeder |
| `ev-dugmesi.js` | Sol üstteki ev düğmesi (basılı tut → Feza ile Bilbo'nun evine dön) |
| `../yayinla.command` | Kökte; çift tıklayınca bütün oyunu GitHub'a gönderir |
| `serve.py` | İsteğe bağlı yerel sunucu (iPad'i aynı Wi-Fi'dan bağlamak için) |

## Cümleleri değiştirmek

Aytuğ Hala'nın genel cümleleri `src/02_audio.js` içindeki `AUD.LINES` bölümünde; konuya göre cümleler `src/02l_*.js` dosyalarındadır
(hikâye, Hala, masa, odalar, huysuzlar, bosslar, mini oyunlar…). Bir cümleyi değiştirdikten sonra:

```bash
python3 -m pip install edge-tts
python3 gen_voice.py          # sadece yeni/değişen cümleleri seslendirir (internet gerekir)
python3 gen_voice.py --liste  # kaydı eksik cümleleri gösterir (internet gerekmez)
```

Sesler Microsoft Edge'in "tr-TR-EmelNeural" sesiyle üretilir; `ffmpeg` kuruluysa başlardaki/sonlardaki sessizlik kırpılır.

## Test için

Adrese `?sessiz` eklenirse oyun tamamen sessiz açılır; `?hepsiacik` Pasta Krallığı'nın kilidini açar. **Nokta** tuşu FPS göstergesini açıp kapatır.

## Kaynaklar ve lisanslar

Bütün modeller, dokular, müzik ve efektler kodla üretilmiştir. Bilbo'nun havlaması: "Throaty dog bark.wav", iccleste (freesound.org), CC0 1.0
(ayrıntı: `assets/audio/CREDITS.md`). 3D kütüphanesi three.js (MIT).
