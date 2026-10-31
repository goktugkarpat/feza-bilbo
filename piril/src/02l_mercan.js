/* ── 2. bölüm: Mercan Denizi Bahçesi (06z_mercan.js, 05z_mercan.js) — anlatıcı (pr_) ve Pırıl (pp_) cümleleri ──
   pr_mercan_giris: bölüme girince · pp_mercan_giris: hemen ardından Pırıl · pr_mercan_orta / pp_mercan_orta: yarı yolda (3. alana girince)
   pr_mercan_arena: boss arenasına girince (boss uyanmadan) · pr_<bossId>_giris|_yarim|_bitti: boss (HUYSUZ.boss lines)
   pr_ilk_<tip>: huysuz ilk görüş · pr_ipucu_<hamle>: boss hamlesi ilk kez (BOSSDAV hints). Bölüm ajanının istekleri sonradan eklenir. */
if (typeof AUD !== 'undefined' && AUD && AUD.LINES) Object.assign(AUD.LINES, {
  pr_mercan_giris: 'Mercan Denizi Bahçesi\'ne geldik! Rengârenk mercanlar baloncuklar içinde.',
  pp_mercan_giris: 'Su altında da nefes alabiliyoruz, çünkü bu bir rüya!',
  pr_mercan_orta: 'Deniz kabukları şarkı söylüyor. Yarı yola geldik!',
  pp_mercan_orta: 'Işığım şu mercanların arkasında parlıyor olmalı!',
  pr_mercan_arena: 'Burası İnci Sarayı. Koca Kirpi Balık burada yaşıyor.',
  // boss: Koca Kirpi Balık
  pr_kocaKirpiBalik_giris: 'Vay, Koca Kirpi Balık şişip şişip duruyor! Hadi onu güldürelim!',
  pr_kocaKirpiBalik_yarim: 'Koca Kirpi Balık gülümsemeye başladı! Devam et!',
  pr_kocaKirpiBalik_bitti: 'Yaşasın! Koca Kirpi Balık çok mutlu, Pırıl\'ın ikinci ışığını geri verdi!',
  // ── huysuzlar: ilk görüş ──
  pr_ilk_balonBaligi: 'Bak bak, bir balon balığı yavrusu! Şişince kocaman oluyor, sonra pof diye sönüyor.',
  pr_ilk_taklaYildiz: 'Bu denizyıldızı takla atmayı çok seviyor! Yuvarlanınca yana kaç.',
  pr_ilk_kopukAhtapot: 'Minik ahtapot renkli köpük üflüyor! Köpükten kaçıp ona yaklaş.',
  pr_ilk_denizAti: 'Bir deniz atı! Kuyruğunu kıvırınca hızla süzülecek, hazır ol.',
  // ── boss hamle ipuçları ──
  pr_ipucu_sisir: 'Kocaman şişti! Turuncu halkanın dışına çık, hop diye inecek.',
  pr_ipucu_yuvarlan: 'Mor yolun dışına çık, Koca Kirpi Balık yuvarlanıyor!',
  pr_ipucu_sersem: 'Başı döndü! Şimdi koş, ona kocaman bir gülücük ver!',
  pr_kocaKirpiBalik_asama2: 'Hıçkırık tuttu! Şimdi top gibi yuvarlanacak, mor yoldan çekil.',
  pr_kocaKirpiBalik_asama3: 'Yine hıçkırdı! Artık iki kere zıplıyor, turuncu halkadan uzak dur.',
  // ── istekle eklenenler ──
  pr_mercan_kabarcik: 'Kabarcık bacasına bas! Kabarcık seni havaya uçuracak.',
  pr_mercan_altin1: 'Altın şeker! Ne güzel parlıyor!',
  pr_mercan_altin2: 'Bir altın şeker daha buldun!',
  pr_mercan_istiridye: 'İstiridye açıldı! İçinden şekerler çıktı.',
  pr_mercan_inci: 'Kocaman bir inci! Burası gizli bir köşeymiş.',
  pr_mercan_gemi: 'Bak, batık bir oyuncak gemi! Önündeki sandığa dokun.',
  pr_mercan_hazine: 'Gemi hazinesi! Altın şeker de varmış!',
  pr_mercan_sise: 'Bir mesaj şişesi! İçinde sürpriz varmış.',
  pr_mercan_kum: 'Kumun içinden şekerler fışkırdı!',
  pr_mercan_kutlama: 'Kabarcıklar dans ediyor! Deniz bahçesi seninle gurur duyuyor.',
});
