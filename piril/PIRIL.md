# Feza ile Pırıl: Kayıp Ejderha Işıkları — sözleşme (CORE yazar; herkes okur)

Feza ve Bilbo'nun Maceraları'nın 4. macerası (`feza-bilbo/piril/`). Motor `hala/` (Dev Ev Macerası) kopyası; motor API'si
`src/SPEC.md` › "Dev Ev API" ile aynıdır, bu dosya FARKLARI ve yeni oyunun kurallarını anlatır. Çatışmada bu dosya geçerli.
Ortak kurallar: scratchpad `pr/ORTAK.md` (sevimli, böcek yok, kızgın yüz yok, yalnız Türkçe, 60 FPS, `?sessiz`).

## 1. Konu
5 yaşındaki Feza ve uyku arkadaşı yavru ejderha **Pırıl**. Bilbo YOK, Aytuğ Hala YOK, pasta YOK (oyunun hiçbir yerinde:
metin, ses, simge, başlık, hikâye, harita). Pırıl, Bilbo'nun eski rolündedir: Feza'nın yanında uçar, savaşta yardım eder.
Koca Fırtına Bulutu esneyince Pırıl'ın 5 ejderha ışığı 5 diyara savrulur, kanatları söner. Her bölümün sonunda AYRI bir boss
neşelenince ışığı geri verir; Pırıl yeni bir şey öğrenir, kanatları biraz daha parlar.

| # | kimlik (id) | Bölüm adı | Boss (HUYSUZ.boss id) | Işık → Pırıl'ın yeteneği | müzik |
|---|---|---|---|---|---|
| 1 | `mantar` | Işıklı Mantar Vadisi | `kocaPofudukMantar` Koca Pofuduk Mantar | 1 ışık **nefesi** (parıltı nefesi) | `pr_mantar` |
| 2 | `mercan` | Mercan Denizi Bahçesi | `kocaKirpiBalik` Koca Kirpi Balık | 2 **köpük kalkanı** | `pr_mercan` |
| 3 | `col` | Kum Saati Çölü | `kocaBukalemun` Renk Değiştiren Koca Bukalemun | 3 **kanat rüzgârı** | `pr_col` |
| 4 | `atolye` | Saat Kulesi Oyuncak Atölyesi | `kocaAyicik` Kurmalı Koca Ayıcık | 4 **kalp tozu** | `pr_atolye` |
| 5 | `gokkusagi` | Gökkuşağı Adaları (final) | `kocaFirtinaBulutu` Koca Fırtına Bulutu | 5 Pırıl büyür, Feza sırtına biner, uçarlar | `pr_gokkusagi` |

Boss savaşları `pr_boss`, menü/başlık/harita `pr_menu`, final sahnesi `pr_final` çalar. Bölümler hala'dakilerden biraz uzun
(4 alt alan önerilir) ve çok süslü.

## 2. Akış
1. **Başlık** (`STORY.buildTitle`): gece, Feza'nın yatağı, yanında uyuyan Pırıl; logo "Feza ile Pırıl — Kayıp Ejderha Işıkları".
2. **Kahraman seçimi** (savaşçı / büyücü / karma — motorda kalır, değişmez).
3. **Giriş hikâyesi** (`STORY.playIntro`, ~25 s, dokun = sonraki an, "Geç"): Feza uyuyor → Pırıl'la rüyaya dalıyor → Koca Fırtına
   Bulutu esniyor → 5 ışık savruluyor, Pırıl'ın kanatları sönüyor → "Işıkları birlikte bulalım!".
4. **Uyku Yuvası** (merkez, bölge 0, id `yuva`, huysuz yok): Feza'nın yatağı, Pırıl'ın yuvası, Gardırop, Mini Oyun Köşesi,
   harita kapısı. 🗺️ **Rüya Haritası** (09_ui, ZONE_DEFS[id].harita) buradan ve duraklat menüsünden açılır.
5. **5 bölüm SIRAYLA açılır**: bölüm n, bölüm n−1'in bossu neşelenince açılır (`BOLUM.isOpen`; QA: `?hepsiacik`).
6. Her bölüm sonu: boss neşelenir → kalpler/konfeti → **ışık** havada döner, Pırıl'a uçar (olay `ingredient` → `{id: ışık id}`)
   → `PIRIL_GUC.ac(n)` (Pırıl'ın kanatları parlar, yeni yetenek, kısa anlatım) → kısa **uyku molası** anı (`STORY.ingredient`:
   Feza ile Pırıl esner, yıldızlar, ninni notası; ~4 s, dokunla geçilir) → yuva/harita.
7. **Final** (gokkusagi bossu neşelenince → `STORY.ending()`): 5 ışık, Pırıl büyür, Feza sırtına biner, gökkuşağı üstünde uçuş,
   Fırtına Bulutu dost olur, Feza yatağında gülümseyerek uyanır. Sonra `FEZA_BILBO_TAMAM('piril')`.

## 3. Dosya sahipliği (yalnız kendi dosyana yaz; başkasınınki için `pr/istek/<KIMDEN>_<KIME>.md`)
| Ajan | Dosyalar |
|---|---|
| **CORE** | index.html, src/00_core.js, 00_i18n.js, 01_textures.js, 03_fx.js, 05_enemies.js, 05a_huysuz_kayit.js, 05c_boss_davranis.js, 06_level.js, 06a_bolum_kayit.js, 06y_odakit.js, 07_game.js, 08_skills.js, 08m_minigame.js (çerçeve), 08j_his.js, 09_ui.js, 09h_hub.js, ui.css, hub.css, src/SPEC.md, PIRIL.md, CLAUDE.md, README.md, ev-dugmesi.js; kökte ../sw.js, ../tools/liste.py |
| **PIRIL3D** | src/04_piril.js, src/04_piril_takip.js, src/04_piril_guc.js (yeni) |
| **KAPI** | ../ev-3d.js, ../ev-2d.js, ../ev-sesler.js, ../tools/ev_sesleri.json, ../index.html (yalnız 4. kapı) |
| **ESYA** | src/04_esyalar.js, src/04_feza.js (eşya görünümleri) |
| **MUZIK** | src/02_audio.js (müzik + efekt; `/*SESLER*/` bloğuna dokunma — SES'in) |
| **SES** | gen_voice.py, sesler.js, src/02l_*.js (ses satırı dosyaları), 02_audio.js içindeki `/*SESLER*/…/*SESLER-SON*/` bloğu |
| **MINI** | src/08n_mini_oyunlar.js (mini oyunların içeriği; çerçeve 08m_minigame.js CORE'da), src/10_story.js (01:20'den beri) |
| **YUVA** | src/06z_yuva.js (merkez Uyku Yuvası: görünüm + yerleşim; istasyon kimlikleri `kapi_<id>`, gardirop, bilbo (=Pırıl'ın Köşesi), album, mini aynı kalsın — 09_ui/09h_hub bunlara bağlı) |
| **MANTAR / MERCAN / COL / ATOLYE / GOKKUSAGI** | src/06z_<id>.js + src/05z_<id>.js (+ isteğe bağlı kendi cümleleri için SES'e istek) |

Eski dosyalar (CORE kaldırır): 04_hala.js, 02l_hala.js, 04_bilbo*.js, bilbo-ses.js, 05b_bosslar.js, 05h_huysuzlar.js, 05h_balkon.js,
06z_masa/oturma/mutfak/buzdolabi/balkon/pasta.js. **Bunları kopyalayıp kullanmak serbest, ama yüklenmezler.**

## 4. Yükleme sırası (index.html)
```
vendor/three.js · 00_i18n · sesler.js · 00_core · 01_textures · 02_audio · 02l_*.js (SES) · 03_fx · 04_feza · 04_esyalar
04_piril.js · 04_piril_takip.js · 04_piril_guc.js            (PIRIL3D; teslimden önce yer tutucu)
05_enemies · 05a_huysuz_kayit · 05c_boss_davranis
05z_mantar · 05z_mercan · 05z_col · 05z_atolye · 05z_gokkusagi     (huysuzlar + boss: HUYSUZ.type/boss/zone, BOSSDAV.register)
06a_bolum_kayit · 06y_odakit · 06z_yuva · 06z_mantar · 06z_mercan · 06z_col · 06z_atolye · 06z_gokkusagi
06_level · 07_game · 08_skills · 08m_minigame · 08j_his · 08n_mini_oyunlar · 10_story · 09_ui · 09h_hub
```
Kural: her dosya yalnız kendi genel adını açar (ör. `const MANTAR = (() => {...})()`); aynı üst düzey ad iki dosyada olursa oyun
açılmaz. Bölüm dosyası adı: `MANTAR`, `MERCAN`, `COL`, `ATOLYE`, `GOKKUSAGI`; huysuz dosyası adı: `HZ_MANTAR`, `HZ_MERCAN`,
`HZ_COL`, `HZ_ATOLYE`, `HZ_GOKKUSAGI` (genel ad gerekmiyorsa hiç açma).

## 5. Bölüm kaydı (06z_<id>.js)
```js
BOLUM.define('mantar', {
  ad: 'Işıklı Mantar Vadisi',
  taban: 'forest',          // eski zemin/ışık teması: 'bathroom' | 'moon' | 'forest' | 'dairy' (castle KULLANMA)
  size: 100, side: 2,       // yan oda sayısı
  areas: [{ id: 'a1', ad: '...', rooms: 2 }, { id: 'a2', ad: '...', rooms: 2 }, { id: 'a3', ad: '...', rooms: 2 }, { id: 'a4', ad: '...', rooms: 2 }],
                            // ana oda zinciri = alanların odaları + en sonda boss arenası
  muzik: 'pr_mantar',
  malzeme: 'isik1',         // = ejderha ışığı kimliği (motor alan adı eski): isik1..isik5 — bölüm sırasıyla, DEĞİŞTİRME
  kayipEsya: null,          // (Bilbo'nun kayıp eşya oyunu yok; null bırak)
  final: false,             // yalnız gokkusagi: true
  isik: { fog, hemiSky, hemiGround, hemi, sunColor, sun, sunOffset, env, bloom, exposure, sat, vig, fezaLight },
  zemin: { tA, tB, tC, out, outAmt, macro },
  minimap: { zemin: '#...' },
  harita: { ad, detay, renk, x, y, simge },   // Rüya Haritası adası (x,y yüzde; CORE yerleştirir, simge emoji yer tutucu)
  yerlesim(L, api) {},      // saf veri (LEVEL.generate sonunda): L.start, L.spawns, L.boss, L.exit, L.stations, katı engel
  kur(L, api) {},           // görsel kurulum (SPEC.md › kur api: put/box/ball/cyl/solid/glow/light/anim/add/dreamEdge…)
  kurSon(L, api) {},
});
```
Işık kimlikleri: mantar `isik1`, mercan `isik2`, col `isik3`, atolye `isik4`, gokkusagi `isik5` (P.malzemeler'e yazılır,
`ingredient` olayı `{id:'isik1'}`). Dünya kuralları SPEC.md'deki gibi (1 birim = 1 m, kamera +z'den bakar, güney tarafı alçak).
Bölüm başına çizim bütçesi: statik süsleri `api.put` ile birleştir; anim'li parça ≤ 40; ışık ≤ 4 havuz (`api.light`).

## 6. Huysuz ve boss kaydı (05z_<id>.js)
```js
HUYSUZ.type('pofuduk', { ad: 'Pofuduk Mantarcık', base: 'jole', variant: 'purple', saldiri: 'ziplayan', boyut: 1,
  stats: { hp, dmg, speed, r, height, atkRange, atkCd, windup, aggro, shot: { kind, speed, r } },
  model(o) { return m; },   // isteğe bağlı; yoksa base modeli (yer tutucu)
  ilkSoz: 'pr_ilk_pofuduk' });
HUYSUZ.boss('kocaPofudukMantar', { ad: 'Koca Pofuduk Mantar', base: 'kraljole', model(o) {}, lines: { giris, bitti, yarim },
  bossKit: { own: true, add: 'pofuduk', at: [0.5], n: [2], col: '#...', roar: 1.2 } });
HUYSUZ.zone('mantar', { enemies: { pofuduk: 4, ... }, elites: ['pofuduk'], variants: {...}, boss: 'kocaPofudukMantar' });
```
saldiri: `yakin` `uzak` `ziplayan` `yuvarlanan` `kayan` `agir` `kazici` `ucan`. base (eski davranış): jole, goblin, yogurt, kaymak,
kopuk, nobetci, cisdamlasi, yildizcik, mantar, golem…; boss base: kraljole, kefirdev, lavkaplumbaga, kostebekusta, sovalye, ejderha.
Model sözleşmesi SPEC.md'deki gibi: `{ root, height, radius, anim(dt, st), setMood, flash, setTint, muzzle(), dispose() }`.
**Böcek yok, kızgın yüz yok**: neşelenince kalp saçıp kaybolur.

### Boss hamleleri: `BOSSDAV.register` (05c, CORE ekledi)
```js
BOSSDAV.register('kocaPofudukMantar', {
  hpK: 2.2, keep: 6, roarD: 2.0,                 // can katsayısı (07 canı × hpK), Feza'dan uzak durma mesafesi, kükreme süresi
  choose(b, S, d) { BOSSDAV.api.bossPhase(b, 'sporYagmuru', 3.2); },   // boşta: sıradaki hamleyi seç
  moves: { sporYagmuru(b, S, dt, d, ux, uz) { /* b.stT: hamlede geçen s, b.phD: süre, b.did: adım sayacı */
           if (b.stT >= b.phD) BOSSDAV.api.bossEnd(b, 0.8, 1); } },
  hints: { sporYagmuru: 'pr_ipucu_spor' },       // hamle ilk kez gelince anlatıcı ipucu (ses anahtarı)
  hit(b, miktar, o, S) { return miktar; },       // isteğe bağlı hasar süzgeci
  update(dt) {},                                 // isteğe bağlı: her oyun karesi (kendi mermi/eşya havuzun)
});
```
`BOSSDAV.api` (07'nin verdiği araçlar, `install`'dan sonra dolu): `P, T, gt, hard, L, enemies, bossRoom, inRoom, bossSpot, approachSpot,
bossWalk, bossPhase(b, ad, süre), bossEnd(b, dinlenme, k), bossIdle, bossRoar, bossSummon, pickPhase, bossRing, hurtPlayer, moveXZ,
circleFree, isFloor, los, burst, sfx, say, hasLine, ftext, shake, fx, remove, removeObj, muzzle, summonAdds, damage, emit, on,
telegraphLine, laneLen, emitP, later, heal`.
Hazır yardımcılar: `BOSSDAV.tele(x, z, r, süre, renk)` (yuvarlak yer işareti), `BOSSDAV.teleLine(x0, z0, x1, z1, en, süre, renk)`,
`BOSSDAV.drop({ x, z, r, at, kind: null, from: [x,y,z], h, col, dmgK, fx, b })` (işaretli yere bir şey iner; kind null = yalnız efekt). Her saldırı ≥ 1 s önceden büyük renkli yer işaretiyle belli olsun; hasar düşük.
Boss neşelenince motor kutlamayı yapar ve ışığı (malzeme) çıkarır; bölüm dosyası ek bir şey yapmak zorunda değil.

## 7. Pırıl (PIRIL3D) — motorun beklediği API
PIRIL3D yeni adlarla yazar ve dosya sonunda motorun eski adlarına **takma ad** verir (motor 7000 satır; içi Bilbo adlarıyla kalır):
```js
const PIRIL = (() => { ...; return { create, portrait, ACCESSORIES }; })();          // 04_piril.js
const BILBO = PIRIL;                                                                 //   (motor uyumu)
const PIRIL_TAKIP = (() => { ...; return { create }; })();  const BILBO_FOLLOW = PIRIL_TAKIP;   // 04_piril_takip.js
const PIRIL_GUC = (() => { ...; return { ac, step, pose, onPlace, ... }; })();  const BILBO_FUN = PIRIL_GUC;   // 04_piril_guc.js
```
Motorun kullandığı her şey (birebir karşıla; hepsi try/catch içinde, eksikse motor susar):
- `BILBO.create()` → model `m`: `m.root` (Group; ayak/gövde altı y = 0, +z'ye bakar; 07 ölçeği `BILBO_SCALE = 0.78` uygular,
  `position.y = hop`), `m.update(dt, BST)` her kare — `BST = { speed, hop, pounce, bark, sit, happy, sniff, dig, ride }`
  (bark > 0: huysuza "kükreme/ışık" tepkisi; sit: Feza yorgun), `m.clearActions()`, `m.isFetching() → bool`, `m.fetchFacing() → açı|null`,
  `m.fetchBone`, `m.setAccessory(id|null)`, `m.dispose()`. İsteğe bağlı: `m.bones`, `m.meshes`, `m.head`, `m.body`, `m.sneeze()`.
- `BILBO.portrait()` → 192² yuvarlak dataURL (09_ui sol üst rozet). `BILBO.ACCESSORIES = [{ id, ad }]` (09h_hub Gardırop'ta Pırıl
  aksesuarları: taç, fular, şapka…; boş dizi de olur).
- `BILBO_FOLLOW.create(env)` → `{ pos:{x,z}, reset(heroPos, x, z, açı), step(dt, heroPos) → { pos, face, speed, hop?, pounce?, impact? },
  pounce(e), isPouncing() }`. `env = { free(x,z,r), move(o,dx,dz,r), … }` (07 `circleFree`, `moveXZ`). `impact` = vurulacak huysuz
  (07 hasar verir: Feza vuruşunun %65'i, kind 'bilbo', kalpler). Pırıl uçar: `hop` = uçuş yüksekliği (m), duvar/engelden etkilenmez
  ama Feza'nın yanından uzaklaşmaz.
- `BILBO_FUN` (her biri isteğe bağlı; 07 `funCall` ile çağırır): `step(dt, ctx)` → null (takip yönetsin) ya da `{x, z, speed, face, hop}`
  (Pırıl'ı sen yönetiyorsun); `pose(BST, ctx)` (BST'yi değiştir); `onPlace(ctx)` (bölüm değişti); `ride(on, s, ctx) → bool`;
  `riding` (getter); `busy() → bool`; `heroLift`, `sneeze`, `buildItem`, `lost` (kullanma: null). `ctx` = `{ P, H, L, Bilbo (model),
  pos, follow, zone, state, t, heroVel, scale, api }` — ctx.api: `{ isFloor, circleFree, los, moveXZ, say, hasLine, sfx, burst, fx, heal,
  enemiesNear, nearestEnemy, damage(e, n, o), spawnProjectile, shield(s), emit, ftext }` (CORE gerekirse genişletir; istek at).
- Ses efekti: `sfx('bilboBark')` → MUZIK bunu Pırıl'ın minik kükremesi/cıvıltısıyla değiştirir (`AUD.sfx` adı aynı kalır).
- 07 olayları (`GAME.on(ad, fn)`): `happy` {type,x,z,boss,elite}, `boss` {on,type}, `zone` {index,id}, `ingredient` {id}, `hurt`, `team`.

### Pırıl'ın yetenekleri: `PIRIL_GUC` (04_piril_guc.js)
- `PIRIL_GUC.ac(n)` — n. ışık geri geldi (1..5): kanatları parlar (n/5), yetenek açılır, kısa gösteri. Motor (07, `ingredient`
  olayında) `P.isiklar = n` yazar ve `ac(n)` çağırır; kayıttan yüklerken `PIRIL_GUC.ac(n, { sessiz: true })`.
- `PIRIL_GUC.seviye` (0..5). 1 **ışık nefesi** (yakındaki huysuza parıltı üfler, kısa sersemletir) · 2 **köpük kalkanı** (Feza'nın canı
  azalınca köpük balonu: `api.shield(s)`) · 3 **kanat rüzgârı** (huysuzları nazikçe iter) · 4 **kalp tozu** (can + neşelendirme) ·
  5 büyük Pırıl (final sinematiği STORY'de: `PIRIL_GUC.buyu(true)` → model ölçeği 1→2,6, sırta binme pozu `m.update(dt, {ride:true})`).
- Takım Hamlesi (eski HALA.teamMove): `PIRIL_GUC.charge` (0..1), `PIRIL_GUC.teamReady()`, `PIRIL_GUC.teamMove({ blast, P, H })` → true.
  UI'deki Takım düğmesi bunları okur (CORE 07'yi HALA yerine PIRIL_GUC'a bağlar).
- Feza'nın canı bitince: `PIRIL_GUC.onFezaDown({x,z})` → kaç s sonra kalkar (Pırıl kanatlarıyla sarar). `onFezaLow`, `onFezaHurt`, `onCheer`.
- 07_game eski `HALA.*` kancalarının HEPSİNİ artık `PIRIL_GUC.*`'a yollar (aynı ad, aynı argüman; hepsi isteğe bağlı, yoksa susar):
  `create(scene)` (GAME.init'te bir kez) · `update(dt, ctx)` (her kare, oyun ve başlık; ctx = SPEC.md'deki HALA ctx'i: `{P, H, L, enemies,
  boss, Bilbo, state, dt, t, dead, title, api}`) · `ac(n, {sessiz})` · `onCheer` · `onFezaHurt` · `onFezaLow` · `onFezaDown` ·
  `teamReady()` · `teamMove({blast,P,H})` · `charge` · `pointTo(x, z)` (Pırıl o yöne uçup parlar: yolu/kapıyı gösterir).
  DİKKAT: `step/pose/onPlace/ride/busy` (BILBO_FUN olarak) ile `update/create` (HALA olarak) aynı nesnede; `update` içinde Pırıl'ı
  hareket ettirme (hareket `step`'te), yalnız yetenek zamanlayıcıları / efektler.

## 8. Ses satırları (SES)
- Her dosya: `src/02l_<ad>.js` → `if (typeof AUD !== 'undefined' && AUD && AUD.LINES) Object.assign(AUD.LINES, { anahtar: 'Türkçe cümle', … });`
  index.html sırasıyla yüklenir; sonraki dosya aynı anahtarı ezer. `python3 gen_voice.py` hepsini okur (`--liste`: yalnız listeler),
  tr-TR-EmelNeural, sessizlik kırpılır → `sesler.js` (`VOICE_MP3`, `VOICE_DUR`). Motor `say(anahtar)` ile çalar; kayıt yoksa kısa yazı.
- Önekler: `pr_` anlatıcı (masalcı kadın sesi; gen_voice: hız −8 %, perde −2 Hz), `pp_` Pırıl (aynı ses, perde +16 Hz, hız ±0;
  ayrıca `his_kombo_*`, `ovgu1..6` da Pırıl sesiyle). İkisi de sessizlik kırpılır, −18 LUFS. Huysuz ilk görüş `pr_ilk_<tip>`, boss `pr_<bossId>_giris|_yarim|_bitti`, ipucu `pr_ipucu_<hamle>`.
- Dosyalar: `02l_oyun.js` (motorun sabit adları), `02l_hikaye.js` (giriş/final/uyku molası), `02l_yuva.js` (merkez, harita, köşeler),
  `02l_piril.js` (pp_), `02l_<bolumId>.js` (bölüm başına). Olay ↔ anahtar eşlemesi: scratchpad `pr/istek/SES_HERKES.md`.
- Kim söyler: bölüm girişi `pr_<id>_giris`→`pp_<id>_giris`, 3. alan `pr_/pp_<id>_orta`, arena `pr_<id>_arena`, ışık `pr_isik_<n>`→`pp_guc_<n>`
  ve uyku molası **STORY (CORE)** söyler — bölüm ajanları ve PIRIL_GUC.ac bunları SÖYLEMEZ (çift olmasın). Boss `giris/yarim/bitti`
  cümleleri HUYSUZ.boss `lines` + 05c (yarı can: önce `pr_<bossId>_yarim`).
  "Aa/Oo" yok; İngilizce kelime yok; övgü ara sıra ve çeşitli.

## 9. Müzik (MUZIK, 02_audio.js THEMES)
`pr_menu` (başlık, yuva, harita) · `pr_mantar` · `pr_mercan` · `pr_col` · `pr_atolye` · `pr_gokkusagi` · `pr_boss` · `pr_final`.
Bölüm `muzik:` alanı bu adları kullanır; tema henüz yoksa CORE geçici olarak eski temaya eşler (`AUD.music` bilinmeyen adda uyarır).

## 10. Envanter (ESYA, src/04_esyalar.js + 04_feza.js)
Kahraman sınıfları (savaşçı/büyücü/karma), çanta, nadirlik motorda kalır. Kılıçlar motorun ışık kılıcıdır
(`ITEMS.defineSaber(id, {...})`), değnekler `ITEMS.defineWand(id, {...})`; başlangıç `isikkilic` / `yildizdegnegi`.
Bölüm setleri: mantar, deniz, col, atolye (Saat Kulesi), gokkusagi (kılıç/değnek + şapka + pelerin aynı setten → set parıltısı).
Boss ödülleri `ITEMS.BOSS_GIFT[bossId]` (motor boss neşelenince kendisi düşürür; tablo: scratchpad `pr/istek/ESYA_HERKES.md`).
Su altı kaskı `FEZA.kask(on)` (mercan). Kostümler `FEZA.costumes()`; 07 her ışıkta sıradaki kostümü açar (`gunluk` hariç n.),
Pırıl süsleri `BILBO.ACCESSORIES[n-1]` (PIRIL3D). Yetenek adları (08_skills): savaşçı Parıltı Topları · Yıldız Fırıldağı · Şeker Yağmuru.

## 11. Kayıt ve kimlik
Kayıt `piril_kayit.v1`, ayarlar `piril_ayar`; başka maceraların anahtarlarına dokunulmaz. Başlık "Feza ile Pırıl: Kayıp Ejderha Işıkları".
Ev düğmesi `ev-dugmesi.js` (`data-macera="piril"`), oyun bitince `FEZA_BILBO_TAMAM('piril')`. Yükleme örtüsü `../yukleme.js data-tema="piril"`.

## 12. Test kancaları (`?sessiz` her zaman)
`?hepsiacik` tüm bölümler açık · `?girissiz` giriş hikâyesi yok · `?bolum=<id>` doğrudan o bölümde başla (yoksa CORE ekler) ·
`window.__qa`: `start(sınıf)`, `zone(i|id)` (bölüme ışınla), `tp(x,z)` (ışınlama), `boss()` (arenaya ışınla), `bossHp(k)` / `killBoss()`
(bossu neşelendir), `finish()` (async: arenaya ışınla + boss uyanınca neşelendir → ışık, uyku molası), `intro()`, `info()`/`state()`, `spawn(tip)`, `cheerAll()`.
`?bolum=<id>` gerçekten var (09_ui sonu). `?secimsiz` kahraman seçimini atlar. `PIRIL_GUC.kullan(n)` yetenek denemesi. `GAME._victory()` final. Ayrıntı: 09_ui.js `__qa` (CORE).

## 13. Performans bütçesi (iPad M1, 60 FPS; 4× CPU yavaşlatmada ≥ 30 FPS)
Bölüm başına ≤ 250 çizim, ≤ 400 bin üçgen görünür; boss ≤ 25 bin üçgen, tek iskelet/tek çizim tercih; huysuz ≤ 4 bin üçgen,
paylaşılan geometri/malzeme; her karede `new`/geometri yükleme yok; gölge yalnız Feza/Pırıl/boss; şeffaf parçacıkları havuzla.
Yeni shader/malzeme varsa ilk karede derlenmesi için bölüm `kur()`'unda oluştur (motor `renderer.compile` çalıştırır).

## 14. Sadelik (ebeveyn kuralı: "karmaşık grafik/ışık/efekt olmasın"; motor tarafı, CORE)
- Bloom: bölüm `isik.bloom` × 0,55 uygulanır, eşik 1,45. Sarsıntı ×0,45 ve üst sınır 0,5; aynı anda tek parlama.
- `FX.burst` sınırlayıcı: saniyede ~14 patlama (en çok 8 birikir), fazlası atlanır (`o.force` / `levelup` geçer); parçacıklar %25 az.
- Yazı patlamaları: hasar/altın/xp sayıları ve "+3", "5!" yok; `ftext(..., 'word')` en çok bir tane, 5 s arayla.
- Kombo sayacı ve ekran konfeti yağmuru yok. "Yeni Yetenek!" küçük (0,62), 1,5 s, bayrak/bölüm girişiyle üst üste binmez (≥ 3 s sonra).
  Bayrak varken alt yazı kutusu gizli. Alan bayrağı numarasız, 1,6 s.
- Saldırı uyarıları: tek ince çizgi + soluk dolgu (≤ ~0,35), benek yok, yavaş nabız.
- Yerdeki yol okları/köşe işaretleri varsayılan KAPALI (`yolIsareti: true` ile açılır); kenar şeritleri `kenarCizgi` (§ CORE_HERKES).
- Sıradan huysuzlar gerçek gölge düşürmez; altlarında yumuşak koyu temas gölgesi (R.blobMat). Boss gerçek gölgesini korur.
- Ölçüm (4× CPU, en yoğun an = boss arenası + 3 yetenek): bütün bölümler 60 FPS, ≤ 130 çizim, ≤ 340 bin üçgen (yuva boşta ~414 bin).
- Sözdizimi denetimi (node bu Mac'te çalışmıyor): scratchpad `pr/CORE/sozdizim.py` tarayıcıda her dosyayı `new Function` ile ayrıştırır.
