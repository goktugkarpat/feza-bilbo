# Saklı Toplar Ormanı — 6 bölüm genişlemesi (ajan sözleşmesi)

Amaç: Orman macerası şu an tek uzun bölge (`06_level.js` ZONES `uzunorman`, 24 oda, sonda `buyuktimsah`). Dev Ev (5 oda) ve
Huysuzlara Karşı (8 dünya) kalitesinde, babayla bir kamp yolculuğu olarak **6 bölüme** ayrılacak. Motor aynı: Huysuzlara Karşı'daki
bölge sistemi (her bölge sonunda bölüm canavarı arenası, portal, `loadZone`, Hayal Haritası `DREAM_PLACES`) bu klasörün kodunda da var.
Kalite ölçüsü: `../huysuz/` ve `../hala/` maceraları. 5 yaş: korkutucu hiçbir şey yok, kan yok, kaybetme yok (canı biterse neşe taşında uyanır).
Türkçe (İngilizce yok). Feza, Bilbo, Baba ve Kartal her bölümde birlikte.

## Bölümler (sıra = ZONES sırası; id'ler sabit)
| # | id | Ad | Ortam | Huysuz hayvanlar (örnek) | Bölüm canavarı (sevimli, neşelenir) | Kamp anı (bölüm sonu) | Top |
|---|---|---|---|---|---|---|---|
| 1 | `kamp` | Kamp Yeri ve Dere | çadır, kamp ateşi, dere kıyısı, çakıllı sığlık, kütük köprü | kurbağa, rakun, sincap, kaplumbağa | **Huysuz Kunduz** (dereyi barajla kapatmış; kütük fırlatır, su sıçratır) | babayla dereden balık tutma | 2 |
| 2 | `gol` | Kurbağa Gölü ve Sazlık | nilüferler, sazlar, ördekler, sisli göl kıyısı, nilüfer basamakları | kurbağalar, ördekler, su kaplumbağası | **Koca Kurbağa** (dil uzatır, zıplayıp yere dalga yollar) | kurbağa korosuyla şarkı | 2 |
| 3 | `mese` | Yaşlı Meşe Korusu | dev meşeler, palamutlar, ağaç evi, sonbahar yaprakları | sincaplar, yaban domuzu yavruları, tilki | **Uykucu Ayı** (kış uykusundan huysuz uyanır; esner/yere vurur; bal verilince neşelenir) | ağaç evinde bal ve palamut ziyafeti | 2 |
| 4 | `selale` | Şelale ve Kartal Tepesi | gökkuşaklı şelale, kayalıklar, yükselen patika, kartal yuvası | dağ keçisi yavruları, kayalık tilkisi, kuşlar | **Huysuz Dağ Keçisi** (boynuzla hamle, taş yuvarlar) | Kartal Feza'yı kısa bir uçuşla tepeye taşır, manzara | 1 |
| 5 | `gece` | Ateşböcekli Gece Kampı | gece ormanı (büyülü, korkutucu değil), ateşböcekleri, yıldızlar, mantar ışıkları; babanın feneri yolu aydınlatır | baykuş yavruları, kirpi, yarasa (sevimli) | **Huysuz Baykuş** (rüzgâr kanat çırpması, tüy atışı) | kamp ateşinde marshmallow ve yıldız seyri | 1 |
| 6 | `bataklik` | Timsah Bataklığı | sisli bataklık, kökler, nilüferli kanallar, timsah yuvası | timsahlar (`ormantimsah`), kurbağalar | **Koca Huysuz Timsah** (`buyuktimsah`, mevcut) | bütün toplar geri gelir; kamp şenliği (final) | 2 |

Toplam 10 top (mevcut "saklı top" sistemi, Bilbo koklayıp kazar) bölümlere dağıtılır. Bölümün topları + canavarı → portal açılır.
Final (`victory()` + `window.FEZA_BILBO_TAMAM('orman')`) yalnız 6. bölümde. Zorluk 1→6 hafifçe artar (5 yaş için yumuşak).

## Kamp Haritası
Huysuzlara Karşı'daki Hayal Haritası gibi, ama "babanın çizdiği kamp haritası" (kraft kâğıdı, kalemle çizilmiş patika, 6 durak
resmi). İlk açılışta yalnız 1. bölüm açık; bir bölüm bitince sıradaki açılır (biten bölüme tekrar gidilebilir). Kaydet sistemi ve
`orman_` önekli localStorage anahtarları korunur.

## Kahraman seçimi
Orman'da şu an yok (`09_ui.js` `buildChoice` boş). `../hala/src/09_ui.js` `buildChoice/openChoice` ve kahraman sınıfları
(warrior/wizard/hybrid) birebir taşınacak: Savaşçı Feza, Büyücü Feza, Büyülü Şövalye Feza (+ yetenekleri, orman temasına uygun adlarla).

## Dosya sahipliği
| Ajan | Dosyalar |
|---|---|
| BOLGE | `src/06_level.js` (ZONES, tema/zemin/dekor/aydınlatma, arenalar, top yerleri), `src/07_game.js` (bölge akışı, portal, kayıt, kamp anı tetikleme, final) |
| HAYVAN | `src/05_forest_animals.js`, `src/05_enemies.js` (yeni hayvanlar + 5 yeni bölüm canavarı: model, animasyon, davranış, neşelenme) |
| KAMP | `src/04_forest_party.js`, `src/04_forest_party_models.js`, `src/04_feza.js` (baba/Kartal/Feza: 6 kamp anı sahnesi, olta, fener, Kartal uçuşu, kahraman sınıfı görünüşleri) |
| ARAYUZ | `src/09_ui.js`, `src/ui.css`, `src/08_skills.js` (Kamp Haritası, kahraman seçimi, bölüm tanıtım kartları, HUD top sayacı) |
| SES | `src/02_audio.js`, `gen_voice.py`, `sesler.js` (6 bölüm müziği, kamp anı müzikleri, yeni seslendirme cümleleri, hayvan sesleri) |

Ortak API (ilk 30 dk içinde yayınla, adlar sabit):
- KAMP: `FOREST_PARTY.kampAni(zoneId, bitince)` — bölüm sonu sahnesi (≈8-15 sn, atlanabilir dokunuşla), bitince `bitince()`.
- HAYVAN: bölüm canavarı kind adları: `kunduz`, `kocakurbaga`, `uykucuayi`, `dagkecisi`, `baykus`, (`buyuktimsah` mevcut).
- SES: `AUDIO.say(lineId)` mevcut mekanizma; yeni cümle id'leri `orman_<zone>_giris`, `orman_<zone>_boss`, `orman_<zone>_bitti`, `orman_kamp_<zone>`.
  Diğer ajanlar cümle metinlerini SES'e iletmek için `BOLUMLER-SES.md` dosyasına ekler (tek satır: `id | metin`).

## Kurallar
- Klasik script, file:// çalışır. Test `?sessiz`. Headless Chrome CDP yardımcısı:
  `/private/tmp/claude-501/-Users-goktugkarpat-Library-CloudStorage-Dropbox-Game-Development/6a76d4aa-ea53-43f5-b361-140c6c3f5633/scratchpad/fb/macera/mlib.py`
  (örnek betikler aynı klasörde). Kendi portunu kullan, yalnız kendi süreçlerini kapat. Commit yok. Kök `../sw.js` listesi en sonda
  koordinatörce yenilenir (`../tools/liste.py`).
- İlerleme: `/private/tmp/claude-501/-Users-goktugkarpat-Library-CloudStorage-Dropbox-Game-Development/6a76d4aa-ea53-43f5-b361-140c6c3f5633/scratchpad/ob/ilerleme/<AJAN>.txt`
  ~3 dk'da bir tek satır: `yüzde | kalan dk | ne yapıyorsun`. Ekran görüntüleri: `.../scratchpad/ob/ss/<AJAN>_<sıra>_<ne>.png`.

## Notlar
- **ARAYUZ → BOLGE (07_game.js), Kamp Haritası API'si.** 09_ui.js şunları `typeof` kontrolüyle çağırır (yoksa yedek: yalnız 1. bölüm açık, top sayısı `forestParty.collected()`):
  - `GAME.mapUnlocked()` → `true` (harita her zaman, başlıktan da açılır).
  - `GAME.zoneInfo(i)` → `{ id, open, done, balls, ballsMax }` (i = ZONES sırası 0..5; `balls` = o bölümde bulunan top, `ballsMax` = o bölümün topu 2/2/2/1/1/2). İlk açılışta yalnız 0 açık; bitirilen bölümün sonraki açılır; bitirilene tekrar gidilebilir.
  - `GAME.travelTo(i, { heroClass })` → `true/false` (Promise de olur). Başlıktan çağrılırsa: kayıt varsa onu yükleyip i'ye gider, yoksa `newGame({ zone: i, heroClass })` (huysuz'daki gibi). Oyundan/moladan/bölüm sonundan da çağrılır. `open` olmayan bölüme `false`.
  - `GAME.P.zone` şu anki bölüm; `emit('zone', { index, name, title })` her bölüme girişte (title=false iken ARAYUZ yazısız tanıtım kartını gösterir ve `orman_<id>_giris` cümlesini söyletir — BOLGE bu cümleyi ayrıca söyletmesin; söyletiyorsa haber versin).
  - Bölüm sonu: bölüm bitince (kamp anı sonrası) `emit('zoneDone', { index })` → ARAYUZ "haritayı aç" düğmesi olan küçük bölüm sonu paneli gösterir (UI.showZoneDone(index) da çağrılabilir). Final (6.) bölümde `victory` aynen.
- **ARAYUZ → BOLGE (07_game.js), kahraman sınıfı.** `heroClassOf = value => 'warrior'` (07_game.js ~700) sınıfı hep savaşçıya çeviriyor: `['warrior','wizard','hybrid']` kabul etmeli (yoksa 'warrior'); `newGame({ heroClass })`, `travelTo(i,{heroClass})`, kayıt/yükleme sınıfı korusun. `buildSkills()` zaten `SKILLS.forClass(P.heroClass)` kullanıyor (08_skills.js'te büyücü/şövalye setleri ARAYUZ'da). Büyücü/şövalye saldırısı (`ranged()`/magic swing) 07'de huysuz'dan kalma, çalışıyor olmalı.
- **ARAYUZ → KAMP (04_feza.js ITEMS).** Büyücü ve şövalye için başlangıç değneği gerekiyor: `ITEMS.starter('wizard')` → `{ weapon: <değnek> }`, `ITEMS.starter('hybrid')` → `{ weapon: <kılıç>, offhand: <değnek> }`; `ITEMS.allowed(item, heroClass)` değnekleri büyücü/şövalyeye açsın (orman temalı: ör. "Meşe Dalı Asa", "Ateşböceği Değneği"). Görünüş P.heroClass ile (KAMP).
- **HAYVAN → BOLGE (07_game.js), bölüm canavarları ve yeni hayvanlar.** Hepsi `05_forest_animals.js`'te (EMODEL.registerPack → `EDEF`/`EMODEL.build` hazır). Yük tek satırlık bağlama:
  - Yeni küçük hayvan tür adları (ZONES `enemies`'e konabilir; EDEF'te kind/hp/dmg hazır, 07'nin genel adımlarıyla çalışır):
    `ordek` (Huysuz Ördek, kind 'glide': göbeğinin üstünde kayar; gol), `sukaplumbagasi` (Somurtkan Su Kaplumbağası, 'roll': kabuğunda fırıldak gibi kayar; gol/kamp),
    `domuzyavrusu` (Yaban Domuzu Yavrusu, 'glide' + trail 'dust'; mese), `keciyavrusu` (Dağ Keçisi Yavrusu, 'hop'; selale), `kayaliktilki` (Kayalık Tilkisi, 'ranged' çakıl 'rock'; selale),
    `baykusyavrusu` (Baykuş Yavrusu, uçan 'melee'; gece), `kirpi` (Huysuz Kirpi, 'roll': top olup yuvarlanır; gece/mese), `ormanyarasa` (Sevimli Yarasa, uçan 'melee'; gece),
    `kunduzyavrusu` (Kunduz Yavrusu, 'melee'; kamp — kunduzun çağırdıkları). Mevcutlar aynen: ormantimsah, ormantilki, ormandomuz, ormanayi, ormankaplumbaga, ormankurbaga, ormansincap, ormanrakun.
    Önerilen dağılım: kamp: ormankurbaga, ormanrakun, ormansincap, ormankaplumbaga, kunduzyavrusu · gol: ormankurbaga, ordek, sukaplumbagasi ·
    mese: ormansincap, domuzyavrusu, ormantilki (+ az ormandomuz) · selale: keciyavrusu, kayaliktilki · gece: baykusyavrusu, kirpi, ormanyarasa · bataklik: ormantimsah, ormankurbaga.
  - Bölüm canavarları (kind 'boss'): `kunduz`, `kocakurbaga`, `uykucuayi`, `dagkecisi`, `baykus` (+ `buyuktimsah` aynen). Bağlama (loadZone'dan önce, bir kez):
    ```js
    if (typeof FOREST_ANIMALS !== 'undefined' && FOREST_ANIMALS.bossAI) {
      Object.assign(BOSS_KIT, FOREST_ANIMALS.bossKits);          // lines, add, at, n, roar, col, forest:true, addHp, addDmg, cfg
      Object.assign(BOSS_AI, FOREST_ANIMALS.bossAI({ bossPhase, bossIdle, bossEnd, bossRoar, bossSummon, bossCall, pickPhase, telegraphLine,
        fx, burst, sfx, shake, hurtPlayer, spawnProjectile, laneLen, bossWalk, bossRoom, remove, muzzle, isFloor, P, T, SHOT_COL }));
    }
    // bossCfg(type) içinde en başa: const fk = BOSS_KIT[type] && BOSS_KIT[type].cfg; if (fk) return fk;
    ```
    (BOSS_KIT/BOSS_AI `const` nesne; Object.assign yeterli. `forest: true` → encounterStep ham baskın/bonus eklemez, timsahtaki gibi.)
    Her hamle en az ~1.9–2.2 sn yerde işaretle (daire / şerit / koni) önceden gösterilir; bırakıştan sonra uzun dinlenme (Feza'nın sırası).
    Hamleler: kunduz = kütük yuvarlar (şerit), kuyruk şapırtısı (etrafında daire), dalga (önünde geniş şerit), arada dal kemirip dinlenir ·
    kocakurbaga = dil uzatır (dar şerit), zıplayıp Feza'nın yanına konar (daire), vırak halkası (daire), küçük kurbağa çağırır ·
    uykucuayi = arka ayaklarına kalkıp yere vurur (daire), 3 arı kovanı düşer (3 küçük daire; arı yok, bal sıçrar), esneyip kısa uyuklar (zzz, serbest vuruş) ·
    dagkecisi = boynuz hamlesi (koşu şeridi), taş yuvarlar (2-3 şerit yelpaze), sıçrayıp konar (daire) ·
    baykus = kanat rüzgârı (koni, itme), tüy yayı (5 tüy, koni), uçup başka yere konar (iniş dairesi).
    Mermiler: tüyler `spawnProjectile({obj})` ile kendi örgüsüyle; kütük/taş/kovan/dalga/dil canavarın kendi kemikleridir (sahneye ek nesne yok, sızıntı yok).
    Can/hasar önerisi `kit.cfg` (timsah: per 440, lo 18, hi 85, dmg 12): kunduz 150/10/40/7 · kocakurbaga 185/12/48/8 · uykucuayi 225/13/56/9 · dagkecisi 265/15/64/10 · baykus 305/16/72/11.
    Çağırdıkları: kunduz→kunduzyavrusu, kocakurbaga→ormankurbaga, uykucuayi→domuzyavrusu, dagkecisi→keciyavrusu, baykus→baykusyavrusu (2+2, %60/%30; addHp .6, addDmg .6).
    Cümleler: kit.lines = { giris: 'orman_<zone>_boss', bitti: 'orman_<zone>_bitti' } (BOLUMLER-SES.md'de var).
    Sesler (yazıldı, SES'in adlarıyla): kit.roarSfx kunduz 'beaverSlap', kocakurbaga 'frogCroak', uykucuayi 'bearYawn', dagkecisi 'goatBleat', baykus 'owlHoot';
    hamlelerde beaverGnaw/beaverSlap, frogTongue/frogCroak, bearYawn/bearSnore/bearStomp, goatCharge, owlFlap/owlFeather (+ roll, splash, splat, bounce, slam).
    Neşelenme sesi: 05'in modeli neşelendiği ilk karede bir kez `AUD.hayvan(type, 'nese')` çalar (yeni 14 türün hepsi) — 07 ayrıca çalmasın.
    (Durum: BOLGE bağladı; 5 canavar oyunda denendi, bütün hamleler + çağırma + neşelenme çalışıyor, JS hatası yok.)
    Test: `FOREST_ANIMALS.bossAI.api` (07'nin verdiği api), `FOREST_ANIMALS.FB` (hamle süreleri). İsteğe bağlı api alanı `bossSpot` verilirse zıplama/sıçrama iniş yeri onunla seçilir.
    Model galerisi: scratchpad `ob/hayvan/www/galeri.html` (`GAL.show([{type, st, t, fo}], cam)`), oyun içi canavar testi `ob/hayvan/tg.py <bölüm> <sn>`.
- **BOLGE → herkes (06/07 API, yazıldı).** ZONES = yalnız 6 bölüm (0 kamp … 5 bataklik; hepsi `expansion:true`, `theme:'forest'`; rüya bölgeleri çıkarıldı).
  `zoneBoss(Z)`, `zoneEnemies(Z)`, `zoneElites(Z)` (06, global): HAYVAN türü yüklü değilse yedeğe düşer. Her bölümün görünüşü 06'daki `ZLOOK[id]`.
  Toplar: kimlikler bölümler boyunca sürer (`orman-top-01..10`; kamp 01-02, gol 03-04, mese 05-06, selale 07, gece 08, bataklik 09-10).
  - `GAME.zoneInfo(i)` → `{ index, id, ad, open, done, balls, ballsMax }` · `GAME.zonesOpen()` → açık bölüm sıraları · `GAME.ballsInfo()` → `{ have, need:10, zoneHave, zoneNeed }`
    · `GAME.mapUnlocked()` → true · `GAME.travelTo(i, { heroClass })` → true/false (açık değilse false).
  - Olaylar: `forestBall` artık `{ have (toplam, 10 üzerinden), need:10, zoneHave, zoneNeed, id }` · `zone` `{ index, id, name, title }` · `zoneDone` `{ index, id }` (kamp anı bittikten hemen sonra, kapıdan geçmeden önce) · `kamp` `{ on:true|false, id }`.
  - Bölüm girişinde BOLGE `orman_<id>_giris` SÖYLETMEZ (ARAYUZ söyletiyor). Yeni oyunda yalnız `orman_giris`.
  - Açık bölümler kendiliğinden saklanır: localStorage `orman_bilboSakliToplar.bolumler.v1` = `{ v:1, acik:n, bitti:[id…] }` (Kaydet'ten bağımsız). Oyun durumu yine yalnız Kaydet ile (`orman_bilboSakliToplar.save.v1`).
- **BOLGE → KAMP, kamp anı sözleşmesi.** Kapı açılıp Feza kapıya girince 07: `GAME.state = 'kamp'`, `emit('kamp',{on:true,id})`, sonra
  `const k = FOREST_PARTY.kampAni(zoneId, bitince, ctx)`; ctx = `{ level: L, hero: H (Feza modeli), P (P.pos kameranın izlediği nokta; değiştirilebilir), bilbo: Bilbo, party: forestParty (father/eagle), portal: L.portalObj, scene, time:()=>GAME.time }`.
  'kamp' durumunda 07 her karede yalnız zamanlayıcıları/FX'i ve `k.update(dt)`'yi (varsa) çağırır; Feza, Bilbo, baba ve Kartal'ı ARTIK GÜNCELLEMEZ (sahne onları istediği gibi oynatır; H.update/Bilbo.update/father.update çağrısı KAMP'ta).
  `bitince()` çağrılınca (ya da 40 sn emniyet süresi dolunca) 07 her şeyi yerine koyar (placeHero) ve sıradaki bölüme geçer. Final (bataklik): canavar neşelenince kampAni('bataklik', bitince) → `victory()`.
  Dokunuşla atlama KAMP'ta (bitince'yi erken çağırın). kampAni yoksa doğrudan devam edilir.
- **BOLGE → SES.** Bölüm müzik adları: `orman_<id>` (orman_kamp, orman_gol, …); yoksa `uzunorman` çalar. Yeni cümle: BOLUMLER-SES.md'de `orman_top_getirdi`.
- **KAMP → BOLGE / ARAYUZ / SES (yazıldı, çalışıyor).** `FOREST_PARTY.kampAni(zoneId, bitince, ctx)` 6 bölümün hepsi için hazır (11-14 sn). Dönüş: `{ skip(), fast(), t, dur, zone }` (`update` YOK; sahne kendini çizim anında sürer — 07'nin `k.update` çağırmasına gerek yok, 'kamp' durumunda H/Bilbo/baba/Kartal'ı güncellememeniz yeterli, güncelleseniz de sahne ezer).
  ctx'ten `hero`, `bilbo`, `party`, `P`, `portal` kullanılır (yoksa GAME.H/Bilbo/P). Sahne P.pos'ta kurulur; `portal` sahne boyunca gizlenir (`obj.visible=false`, `setActive(false)`), sonunda geri açılır.
  Dokunuş: 1. dokunuş ×3 hızlanır, 2. dokunuş atlar (klavye: boşluk/Enter/Esc). Sahne sırasında `body.kamp-ani-on` sınıfı `#ui`'yi gizler, üstte/altta sinema bantları ve sağ altta ⏩ simgesi var (yazı yok).
  Olay: `GAME.emit('kampAni', { zone, phase:'start'|'end' })` (müzik için SES/BOLGE kullanabilir). Ses: başta `AUD.say('orman_kamp_<zone>', {prio:3, interrupt:true})`; sfx: splash, chirp, bilboBark, pop, cheer, munch, whoosh, star.
  `bitince()` tam bir kez, her şey (kamera fov'u, modeller, babanın aleti) yerine konduktan sonra çağrılır. `FOREST_PARTY.kampAktif()` sahne sürüyorsa true. Test: konsolda `FOREST_PARTY.kampAni('gece', ()=>{})`.
- **KAMP → BOLGE, babanın donanımı.** Oyun içinde baba baltasını taşır; bölgeye göre kendiliğinden (ZONES[P.zone].id'den): hep sırt çantası; `kamp`: çantada olta; `gece`: sol elinde fener + önündeki yolu aydınlatan yumuşak ışık konisi (ışık kaynağı eklemez). İsterseniz `forestParty.setZone(id)` ile zorlanabilir; `father.setGear({tool:'axe'|'olta'|'cubuk'|'fener'|'none', backpack, light, lantern, packRod})`.
- **KAMP → ARAYUZ / BOLGE, kahraman sınıfları.** (yapılıyor) `ITEMS.starter(heroClass)`, değnekler ve sınıf görünüşü 04_feza.js'te; Feza modeli sınıfı `GAME.P.heroClass`'tan kendisi okur (ek çağrı gerekmez; `H.setHeroClass(id)` de var).

- **ARAYUZ durumu (09_ui.js, ui.css, 08_skills.js — bitti).** Kamp Haritası (`UI.openDreamMap()`; başlık "Harita", HUD harita düğmesi, Mola › Kamp Haritası, bölüm sonu paneli, final paneli; `M` tuşu),
  kahraman seçimi (Oyna / haritadan ilk durak / Mola › Baştan Başla → kartlar; `UI.openChoice`, `UI.chooseHero(id)`), bölüm tanıtım kartı (`zone` olayıyla, `orman_<id>_giris` söyletir),
  bölüm sonu paneli (`zoneDone` → panel; kapı ▶'ye ya da haritadan seçilen durağa kadar bekler: harita seçimi kapının hedefi olur), HUD top sayacı (bu bölümün topları resimli + toplam / 10),
  kamp anında HUD gizlenir (`kamp` olayı). Yetenekler: `SKILLS.forClass('wizard')` = yaprakoklari / cicekkalkani / atesbocegibahcesi, `('hybrid')` = yaprakhilali / sarmasikbagi / mantarhalkasi
  (cümleler `orman_buyu1..3`, `orman_hibrit1..3` → BOLUMLER-SES.md). Bölüm canavarlarının yedek rozet resimleri (BOSS_UI) 09'da; HAYVAN modeli varsa portre ondan.
- **ARAYUZ → KAMP (hâlâ açık).** Büyücü seçilince başlangıç silahı "Filiz Kılıcı" geliyor (değnek yok): `ITEMS.starter('wizard'|'hybrid')` orman değneği versin (yukarıdaki not).
- **ARAYUZ → koordinatör.** `src/SPEC.md` hâlâ "Its only player class is warrior Feza … class chooser has no cards" diyor; artık üç sınıf ve kahraman kartları var (SPEC sahibi güncellesin).
- **SES → herkes (02_audio.js, yazıldı).** Müzik: `AUD.music('orman_<id>')` (BOLGE'nin ZONES `music` adları; kısa `'<id>'` de olur) bölgeyi hatırlar;
  sonra `AUD.music('boss')` o bölgenin canavar müziğini (`orman_<id>_boss`) çalar — 07'deki `aud('music','boss')` değişmeden çalışır. Kamp anı müziği:
  `AUD.music('kampani')` (o anki bölge) ya da açıkça `orman_<id>_ani` (kendiliğinden: 02_audio.js GAME.on('kamp') dinler; kimsenin çağırması gerekmez).
  Final şenliği: `orman_bataklik_ani`. `'uzunorman'`, `'title'`, `'zafer'` aynen.
  Hayvan sesleri — tek kapı: `AUD.hayvan(kind, olay, { x, z, vol })` (yoksa sessizce false). Olaylar: `ses` (boşta), `hazirlik`, `saldiri`, `nese` (+ bölüm
  canavarında 0.7 sn sonra küçük "dost oldu" müzikçiği) ve türe özel: kunduz `kemir|kuyruk|kutuk|dalga` · kocakurbaga `virak|dil|zipla|kon` ·
  uykucuayi `uyku|esne|uyan|vur|kovan|bal` · dagkecisi `mele|boynuz|tas|kon` · baykus `hu|kanat|ruzgar|tuy|kon`; küçükler: ordek, ormankurbaga, kunduzyavrusu,
  keciyavrusu, baykusyavrusu, ormanyarasa (`ses|saldiri|nese`).
  Doğrudan sfx adları da var: beaverSlap, beaverGnaw, beaverHappy, frogCroak, frogRibbit, frogTongue, frogHappy, bearYawn, bearHum, bearSnore, bearStomp,
  goatBleat, goatHappy, goatCharge, owlHoot, owlFlap, owlFeather, owlHappy, quack, cricket, bossHappy (+ HAYVAN'ın istediği kısa adlar croak, yawn, hoot, bleat, quack).
  HAYVAN'a öneri (05_forest_animals.js): BOSS_KIT `roarSfx`: kunduz 'beaverSlap', kocakurbaga 'frogCroak', uykucuayi 'bearYawn', dagkecisi 'goatBleat', baykus 'owlHoot';
  hamlelerde: chew→'beaverGnaw', slap→'beaverSlap', croak→'frogCroak', tongue→'frogTongue', yawn→'bearYawn', nap→'bearSnore', slam(ayı)→'bearStomp',
  charge→'goatCharge', gust→'owlFlap', feathers→'owlFeather'; neşelenince `AUD.hayvan(type,'nese')` (07 bossDown'da ya da 05'te; SES bunu kendisi çalmıyor, çift olmasın diye).
  Seslendirme: BOLUMLER-SES.md'deki her satır `python3 gen_voice.py` ile kaydedilir (eski kayıtlar bayt bayt aynı kalır). Timsah için 07/05'in kullandığı
  `orman_timsah_giris/bitti` kaydedildi (`orman_bataklik_boss/bitti` yok; gerekirse söyleyin).
- **BOLGE → SES.** KAMP'ın kamp anı `orman_kamp_<id>` cümleleri (kamp, gol, mese, selale, gece, bataklik) testte "AUD.say: unknown line" uyarısı veriyor; SES eklesin. `orman_top_getirdi` de bekliyor (BOLUMLER-SES.md).
- **BOLGE durum (bitti).** 6 bölge, HAYVAN'ın 5 bölüm canavarı + buyuktimsah doğru bölgelerde bağlı; kapı → kamp anı → zoneDone → sonraki bölge → finalde victory + FEZA_BILBO_TAMAM('orman') uçtan uca test edildi. Göl ve bataklıkta göl/su birikintileri açıklığın içine oyuldu (kıyı yürünebilir, su yürünmez; patikadan ≥2.7 m uzak).
- **BABA devri (KAMP → BABA, father() 04_forest_party_models.js).** Durum: çalışır, hatasız (v8: KAMP_baba_yuz_v8.png, KAMP_ev_portal_v8.png).
  - Yapı: `builder()` her malzemeyi tek SkinnedMesh'e birleştirir (soft/cloth/gloss/trim + father'a özel `plaid` = ekose doku `plaidTexture()`; 5 çizim). `finish()` artık geometrinin `color` özniteliğini de okur (köşe rengi × parça rengi). `limb(b,c,sections,child,m,uvs)` → uvs = [u,v] doku tekrarı. Builder dışa `part, material, sphere` da verir.
  - Gövde: `torsoSections` + `shell()` (ekose gömlek; `surf(x,y,k)` göğüs yüzeyi), açık önlü yelek kabuğu (×1.075) + 4 cep, siyah tişört yakası, kemer, haki pantolon (`limb`), bot. Kollar: omuzda ekose (`clavicle` elipsi), kıvrık kol ağzı, ten ön kol, saat.
  - Baş (tek mesh): `NU×NV` ızgara; temel elips (+ çene/jaw daralması, alt yarı .285) + `face(X,Y,Z)` yer değiştirmeleri (kaş kemeri, göz çukurları, elmacık, burun köprü/uç/kanat, dudak, gülümseme oluğu `mouthY`, çene); allık/dudak/ağız ve makine saç gölgesi (buzz-cut, `stubC`) köşe renginde. `shellFrom(mask, thick, color)` aynı ızgaradan yumuşak kenarlı kabuk üretir: sakal (`beardTop`, `beardMask`, tuz-biber renk), bıyık (`mustBand`), kaşlar (`browY/browM`). Gözler: kürecikler (`ez` = yüz yüzeyinden), kulaklar elips.
  - Kemik adları DEĞİŞMEDİ: `father hips/waist/chest/head`, `father thigh|shin|boot ±1`, `father clavicle|upper arm|forearm|hand ±1`, + yeni `father axe` (sağ elin çocuğu; bağlama ölçeği `AXE_S=.66`; gizlemek için ~0 ölçek). ev-3d.js `father hand 1`'i küçültüp yeni el takıyor; `father upper arm -1 / forearm -1 / hand -1` ile el sallıyor — korunmalı.
  - Dış API (korunmalı): `father()` → `{root,bones,meshes,update(dt,{speed,attack,pose,poseT}),dispose,gear,setGear}`. `update` saldırı eğrileri (motion/keys) + `scenePose` → `applyPose(n,w)` sahne pozları: sit, sitStick, sitEat, sitWave, fish, fishPull, kneel, kneelFish, kneelPull, kneelClap, kneelWave, whistle, dance, cheer, wave, clap, point, lookUp (çapraz geçişli). `fatherGear()` (father dışında, bana ait ama father'a bağlı): olta sağ el (`gear.rodTip`), çubuk+marşmelov sağ el (`gear.toast(k)`), fener sol el (dik tutulur), yol ışığı (root'a bağlı), sırt çantası + askılar + çantada olta (chest'e bağlı). Konumlar el/göğüs kemiğine göre: el kemiği tutma noktası (0,-.10,.062) — gövde/kol ölçüleri değişirse bu ofsetler ve çanta konumu ([0,.16,-.37] chest) gözden geçirilmeli.
- **KAMP → BOLGE (son durum).** 6 kamp anı gerçek bölge sonlarında (kapı yanında) test edildi, JS hatası yok (ss/KAMP_v8_hepsi.png). Sahne sırasında: Feza'nın x-ray silüeti kapanır, 10 m içindeki hayvan/canavar modelleri gizlenir, kapı uyur, baba baltasız (olta/çubuk/fener ya da boş el), bölgeye göre ışık (gol gün batımı, gece, bataklık alacakaranlık) — hepsi sonunda geri gelir. Kamera otomatik kadraj: Feza, baba ve Bilbo'nun yüzleri her karede.
  Yeni: `FOREST_PARTY.kartalUcus({x, z, y?}, bitince)` — Kartal Feza'yı alıp hedefe uçurur (3.6-7 sn, atlanabilir), bitince `P.pos` hedefe konur. Şelalede tırmanma/uçuş için; çağırırken `GAME.state='kamp'` yapıp bitince geri 'play' yapın (oyuncu girdisi kapansın). Test: `FOREST_PARTY.kartalUcus({x:P.pos.x+4,z:P.pos.z-6},()=>{})`.
  Kahraman sınıfı: `ITEMS.starter('wizard')` → Ateşböceği Değneği; `'hybrid'` → Yaprak Kristali Kılıcı + Ateşböceği Değneği (offhand). Orman değnekleri (büyücü): atesbocegi, mesedali, findik, ay, kor, yildizdegnek, gokdegnek (efsane), timsahdegnek (timsah ödülü, büyücüye). Timsahın Dostluk Kılıcı artık savaşçı + şövalyeye. Görünüş: büyücü = yapraklı orman büyücü şapkası (eşya şapkası yokken) + değnek; şövalye = ağaç kabuğu zırhı, yaprak askılı omuzluklar, yapraklı miğfer. Feza modeli sınıfı `GAME.P.heroClass`'tan kendisi okur (`H.setHeroClass` de var).
  Not (SPEC): baba artık 5 çizim (ekose malzeme eklendi) ve 19 kemik (`father axe`); SPEC.md'deki "4 draw calls / barbar baba" satırları eskidi.
- **ANIM durum (05_forest_animals.js).** Bütün orman hayvanlarına ortak "canlılık katmanı" (`life`, her anim'in sonunda): kökün gerçek hareketinden yaylı takip (durunca öne, dönünce yana yatma; kulak/kuyruk gecikmeli), nefes, bekleme sırasında etrafa bakma/kafa eğme, kulak seğirtme, ayak basışında hafif ezilme, zıplamada uzama + inişte ezilip toparlanma, vurulunca sevimli "oh!" (sarsılma, kocaman gözler, "O" ağız, kulaklar geriye, başının üstünde dönen üç yıldız — `stars` kemiği), canavarların her işaretli hamlesinden önce titreyerek kurulma ve bırakışta yaylanma, her türe özel neşe dansı. Yeni kemikler: `earL/earR`, `stars`, `mouth`, (kurbağa `tongue`, sincap `nut`, kunduz `dl0-2`, timsah `jb0-2`, baykuş `specs`). Küçük hayvan ~6-8k köşe, ≤22 kemik; geometri yine tür başına önbellekte, kare başına bellek ayırma yok.
  - Küçüklerin şakaları (sakin ve dururken 7-15 sn'de bir, ~2-3 sn; hareket/saldırı/vuruş anında biter): ördek tökezleyip vaklar, kirpi top olup bir yere çarpar (BONK + yıldız), sincap palamutu havaya atar kafasına düşer, kurbağa dilini kendine dolar, keçi yavrusu boynuzunu yere saplar tepinir, domuz yavrusu çamura göbeklemesine dalar (sıçrama), yarasa ters dönüp uyuklar, tilki kuyruğunu kovalar, rakun sinsi sinsi el ovuşturur, ayı göbeğini kaşır, timsah kocaman esner, kaplumbağa kabuğunda horlar, baykuş yavrusu havada uyuklar, kunduz yavrusu dal kemirir, ateşböcekleri dağılıp toplanır, balçık ikiye bölünecek gibi uzar. Sesler `AUD.sfx` (quack, bonk, pop, splash, squish) ve `FX.burst` ile (yoksa sessiz).
  - Canavarların eğlenceli anları (bossAI'de, zararsız, Feza'ya serbest vuruş; 5 hamlede bir): kunduz `dam` (önüne 3 kütükten baraj kurar; Feza bir vurunca `dambreak`: kütükler savrulur, sersemler), kocakurbaga `plop` (yerinde dev zıplayış, göbek üstü "cup!", sırılsıklam silkinir, hapşırır), uykucuayi `honey` (bal kavanozuna dayanamaz, patisini yalar) + uyurken (`nap`) vurulunca `wake` (zıplayarak uyanır, yıldızlar), dagkecisi hücumdan sonra %50 `stuck` (boynuzu kayaya takılır, tepinir, kurtulup sersemler), baykus `specs` (huu-huu, başını tam çevirir, gözlüğü gagasına kayar, el yordamıyla arar, takar). buyuktimsah (07'nin yapay zekâsı) yalnız modelde: çağırma (`summon`) sırasında ve beklerken tükürdüğü üç baloncuk topla hokkabazlık yapar, sonunda hapşırır. Süreler `FOREST_ANIMALS.FB` (damBuild/damHold/damBreak, plopUp/plopAir/plopD, honeyD/wakeD, stuckD/stuckP, specsD).
  - Seslendirme (SES'e): `orman_kamp_baraj`, `orman_gol_cuptur`, `orman_mese_bal`, `orman_mese_uyandi`, `orman_selale_takildi`, `orman_gece_gozluk` (BOLUMLER-SES.md); kayıt varsa söylenir (`AUD.LINES[id]` yoksa sessiz). Kullanılan sfx'ler mevcut adlar: roll, bonk, splash, splat, bounce, pop, munch, bearHum, step, star, owlHoot, frogCroak.
- **ANIM: yeni türler (koordinatör 06_level.js ZONES `enemies`/`pack`'e eklesin; 07'nin genel adımlarıyla çalışır, EDEF hazır).**
  - `rakuncete` (Maskeli Rakun Çetesi, 'melee', marşmelov şişi + ganimet çuvalı) → **kamp**: 2-3'lük grup hâlinde (pack), bölgede 1 grup.
  - `nilufer` (Nilüfer Kurbağası, 'glide' + trail: nilüfer yaprağının üstünde kayar) → **gol**: 2-3 tane.
  - `palamutasker` (Palamut Askeri sincap, 'melee', palamut kabuğu miğfer + dal mızrak) → **mese**: 3'lü sıra hâlinde (pack) 1-2 grup.
  - `atesbocegi` (Ateşböceği Sürüsü, uçan 'melee', beş minik ateşböceği öndekinin etrafında döner, saldırıda toplanır) → **gece**: 2-3 tane.
  - `balcik` (Balçık Topu, 'hop') → **bataklik**: 2-3 tane. "İkiye bölünme" yalnız görsel (şakası); gerçekten bölünmesi 07'de bir ölüm kancası ister (BOLGE isterse: neşelenince iki minik `balcik` doğurmak).
  - 07 (BOLGE) için öneri: rakun "altın çalıp kaçma" ve küçüklerin bekleme sırasında birbirleriyle oynaması (kovalamaca/top) 07'de davranış ister; modeller hazır (şakalar tek başına çalışıyor).
- **CEVRE → SES (06_level.js, yazıldı): şelale ve dere sesleri.** Ses kaynakları her bölüm kurulunca `GAME.L.sesKaynak` = `[{ tur: 'selale' | 'dere', x, z, r }]` (selale: her şelalenin havuzu, r 11–13 m; dere: kamp bölümündeki köprü altı dereler, r 9 m). Kolay yol: `LEVEL.ortamSes(GAME.L, x, z)` → `{ selale: 0..1, dere: 0..1 }` (en yakın kaynak, yumuşak geçişli; 0 = duyulmaz). SES bunu ~0,25 sn'de bir Feza'nın konumuyla (`GAME.P.pos`) çağırıp döngülü şelale / dere sesinin ses düzeyini ayarlayabilir (olay yayılmıyor; yoklama). Diğer bölümlerde liste boş.
- **CEVRE durum (06_level.js görsel kısmı).** Su: yeni `forestWaterMat` (yumuşak ıslak kıyı, köpük, derinlik rengi, rüzgâr dalgacıkları, halka, güneş pırıltısı / gece yıldız yansıması, bataklıkta kabarcık; şelale havuzunda köpüren su), kamp deresi (köprü altından akan şerit), nilüfer sallanması, sazlar rüzgârda. Zemin: bulut gölgeleri, çiçek beneği / meşe yaprağı / gece parlayan yosun / bataklık su mercimeği ve su birikintileri (`ZLOOK[id].fx`). Rüzgâr dalgaları (çimen, çiçek, ağaç). Ağaçlar: `bigOak` (meşe), `swampWillow` (bataklık, sarkan yosun), `fir` (şelale + kayalar), uzak ağaçlar için ucuz `oakLo`/`willowLo`/`fir` (üçgen sayısı düştü). Parçacıklar (`forestAmbience`): kelebek, tozan, ışık noktaları, karahindiba, düşen yaprak, şelale serpintisi + sis, gece polen, bataklık sisi. Işık huzmeleri (`lightShafts`, kamp anında kamera alçalınca kaybolur), gökyüzü kubbesi (`skyDome`, yalnız kamp anı gibi alçak kamerada görünür; ufku `scene.background`'u izler). Şelale: kavisli, köpüklü akan su (`fallSheets`).
