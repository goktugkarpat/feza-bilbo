/* ── 4. bölüm: Saat Kulesi Oyuncak Atölyesi (06z_atolye.js, 05z_atolye.js) — anlatıcı (pr_) ve Pırıl (pp_) cümleleri ──
   pr_atolye_giris: bölüme girince · pp_atolye_giris: hemen ardından Pırıl · pr_atolye_orta / pp_atolye_orta: yarı yolda (3. alana girince)
   pr_atolye_arena: boss arenasına girince (boss uyanmadan) · pr_<bossId>_giris|_yarim|_bitti: boss (HUYSUZ.boss lines)
   pr_ilk_<tip>: huysuz ilk görüş · pr_ipucu_<hamle>: boss hamlesi ilk kez (BOSSDAV hints). Bölüm ajanının istekleri sonradan eklenir. */
if (typeof AUD !== 'undefined' && AUD && AUD.LINES) Object.assign(AUD.LINES, {
  pr_atolye_giris: 'Saat Kulesi Oyuncak Atölyesi\'ne geldik! Her yerde dişliler dönüyor.',
  pp_atolye_giris: 'Ne çok oyuncak var! Hepsiyle oynamak istiyorum.',
  pr_atolye_orta: 'Kurmalı oyuncaklar dans ediyor. Yarı yola geldik!',
  pp_atolye_orta: 'Tik tak sesini duyuyor musun? Işığım saat kulesinde!',
  pr_atolye_arena: 'Burada kocaman bir oyuncak ayı var. Sırtındaki anahtar dönüyor.',
  // boss: Kurmalı Koca Ayıcık
  pr_kocaAyicik_giris: 'Kurmalı Koca Ayıcık uyandı! Fır fır dönüyor, biraz kenara çekil!',
  pr_kocaAyicik_yarim: 'Ayıcığın kurgusu bitiyor, esniyor! Devam et Feza!',
  pr_kocaAyicik_bitti: 'Koca Ayıcık neşelendi! Sana kocaman sarılmak istiyor.',
  // ── huysuzlar: ilk görüş ──
  pr_ilk_kurmaliFare: 'Kurmalı fare! Vınnn diye kayarak geliyor, yana çekil.',
  pr_ilk_topac: 'Bak, bir topaç! Fırıl fırıl dönerek yuvarlanıyor.',
  pr_ilk_kagitUcak: 'Kâğıt uçak süzülüyor! Uzaktan kâğıt top atıyor, yana kaç.',
  pr_ilk_askercik: 'Tahta askercik! Rap rap yürüyor, yakınına gelince dikkat.',
  pr_ilk_yayliTop: 'Yaylı top! Boing diye zıplıyor, indiği yerden çekil.',
  pr_ilk_altinFare: 'Vay, altın bir fare! Çok nadir, hadi yakala!',
  // ── boss hamle ipuçları ──
  pr_ipucu_bloklar: 'Oyuncak bloklar geliyor! Yerdeki dairelerden uzak dur.',
  pr_ipucu_zil: 'Altın şeridi gördün mü? Ayıcık oradan yürüyecek, yana kaç!',
  pr_ipucu_gobek: 'Göbek zıplaması geliyor! Halkadan çık.',
  pr_ayicik_uyudu: 'Ayıcığın kurgusu bitti, uyukluyor! Hadi, şimdi dokun!',
  pr_ayicik_uyudu2: 'Yine uyudu! Çabuk Feza!',
  pr_ayicik_asama2: 'Anahtarı hızlandı! Ayıcık daha çabuk yürüyor.',
  pr_ayicik_asama3: 'Ayıcık fırıl fırıl kuruldu! Az kaldı Feza!',
  // ── istekle eklenenler ──
  pr_ipucu_blok_yagmur: 'Blok yağmuru! Yerdeki dairelerden kaç.',
  // ── istekle eklenenler ──
  pr_atolye_dugme: 'Şu kırmızı düğmeye bas! Bakalım çarklara ne olacak.',
  pr_atolye_tren: 'Oyuncak tren geliyor, çuf çuf! Durağa gidersen zil çalar.',
  pr_atolye_boya: 'Boyaya bastın! Arkanda rengârenk izler kaldı.',
  pr_atolye_muzik: 'Müzik kutusu çalıyor, balerin dans ediyor!',
  pr_atolye_sandik: 'Gizli oyuncak sandığını buldun! İçinden altın şeker çıktı.',
  pr_atolye_alan1: 'Çark Koridoru! Dişliler tık tık dönüyor.',
  pr_atolye_alan2: 'Tren rayları! Oyuncak tren buradan geçiyor.',
  pr_atolye_alan3: 'Blok kuleleri! Rengârenk bloklar gökyüzüne kadar uzanıyor.',
  pr_atolye_alan4: 'Saat Odası! Tik tak, kocaman saat burada.',
  // ── istekle eklenenler ──
  pp_atolye_tren_bin: 'Çuf çuf! Ben de trene biniyorum!',
});
