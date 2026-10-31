/* ── 3. bölüm: Kum Saati Çölü (06z_col.js, 05z_col.js) — anlatıcı (pr_) ve Pırıl (pp_) cümleleri ──
   pr_col_giris: bölüme girince · pp_col_giris: hemen ardından Pırıl · pr_col_orta / pp_col_orta: yarı yolda (3. alana girince)
   pr_col_arena: boss arenasına girince (boss uyanmadan) · pr_<bossId>_giris|_yarim|_bitti: boss (HUYSUZ.boss lines)
   pr_ilk_<tip>: huysuz ilk görüş · pr_ipucu_<hamle>: boss hamlesi ilk kez (BOSSDAV hints). Bölüm ajanının istekleri sonradan eklenir. */
if (typeof AUD !== 'undefined' && AUD && AUD.LINES) Object.assign(AUD.LINES, {
  // ── bölüm girişi / alanlar (COL isteği; Pırıl ve anlatıcı) ──
  pr_col_giris: 'Kum Saati Çölü\'ne hoş geldin! Sıcacık kumların arasında Pırıl\'ın üçüncü ışığı saklı.',
  pp_col_giris: 'Kumlar ayaklarımı gıdıklıyor! Işığım burada bir yerde.',
  pr_col_orta: 'Kocaman kum saatleri dönüyor. Yarı yola geldik!',
  pp_col_orta: 'Işığım şu kum tepesinin ardında, hadi!',
  pr_col_tepeler: 'Kum tepeleri gülümsüyor gibi. Kum şeridine bas, seni taşısın!',
  pr_col_vaha: 'Bir vaha! Palmiyeler, serin bir gölcük ve çöl çiçekleri.',
  pr_col_pazar: 'Rengârenk çadırlar! Burası çölün pazarı, kilimlerde sürprizler var.',
  pr_col_kumsaati: 'Kocaman bir kum saati! Yanına git, onu çevirelim mi?',
  pr_col_kumsaati_dondu: 'Kum saati döndü! Bak, içinden şekerler yağıyor.',
  pr_col_kale: 'Bir kum kalesi! Dokununca ne olacak acaba?',
  pr_col_kale_hazine: 'Kum kalesinin içinden hazine çıktı!',
  pr_col_kalp_hazine: 'Gizli bir köşe buldun! Burada bir sürpriz var.',
  pr_col_serit: 'Kayıyoruz! Kum şeridi seni taşıyor.',
  pr_col_gol: 'Gölcükte ışıltılar var! Su ne kadar serin.',
  pr_col_arena: 'Şşş, burada biri saklanıyor gibi. Dikkatli bak!',
  // ── huysuzlar: ilk görüş ──
  pr_ilk_kumTopaci: 'Bak, bir kum topacı! Fırıl fırıl dönerek geliyor, yana kaç.',
  pr_ilk_kaktuscuk: 'Bu bir kaktüsçük! Hiç dikeni yok, yumuşacık ama biraz huysuz.',
  pr_ilk_kumTavsani: 'Zıplayan kum tavşanı! Zıplayınca kenara çekil.',
  pr_ilk_ruzgarGulu: 'Rüzgâr gülü yanaklarını şişiriyor. Rüzgâr topu üfleyecek, dikkat!',
  pr_ilk_altinTopac: 'Vay, altın bir topaç! Onu neşelendirirsen altın kazanırsın.',
  // ── boss: Renk Değiştiren Koca Bukalemun ──
  pr_kocaBukalemun_giris: 'Sürpriz, Koca Bukalemun kumda saklanıyormuş! Hadi onu neşelendirelim!',
  pr_kocaBukalemun_yarim: 'Bukalemun kıkır kıkır gülüyor. Az kaldı, devam et!',
  kocaBukalemun_yarim: 'Bukalemun kıkır kıkır gülüyor. Az kaldı, devam et!',
  pr_kocaBukalemun_bitti: 'Koca Bukalemun çok mutlu! Pırıl\'ın üçüncü ışığını geri verdi.',
  pr_ipucu_saklan: 'Bukalemun kuma karıştı! Gözlerinin parladığı yeri bul, yanına koş.',
  pr_ipucu_kuyruk: 'Pembe halka çıktı! Kuyruğuyla dönecek, halkanın dışına koş.',
  pr_ipucu_dalga: 'Renkli şeritler belirdi! Renk dalgası geliyor, şeritlerin arasına kaç.',
  pr_bukalemun_buldun: 'Buldun onu! Şimdi tam zamanı, neşelendir!',
  pr_bukalemun_buldun2: 'Yakaladın! Bukalemun kıkırdıyor, hemen dokun!',
  pr_bukalemun_cikti: 'Bukalemun kendisi çıktı. Ne kadar da şakacı!',
  pr_bukalemun_asama2: 'Bukalemun daha çok renk saçıyor! Dikkatli ol.',
  pr_bukalemun_asama3: 'Gökkuşağı şöleni başladı! Az kaldı, sen yaparsın!',
  pp_bukalemun_ipucu: 'Buradan! Benim ışığımı takip et!',
  // ── istekle eklenenler ──
  pr_col_kaplumbaga: 'Bir kum kaplumbağası! Başını çıkarıp sana selam veriyor.',
  pr_col_sandik: 'Kumun altından hazine sandığı çıktı! İçi şeker dolu.',
});
