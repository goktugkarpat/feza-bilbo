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
