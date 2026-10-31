/* ── Hikâye cümleleri: başlık, kahraman seçimi, giriş masalı, ışık geri gelince, uyku molası, final ──
   pr_ = anlatıcı (yansız, sıcak masal anlatıcısı) · pp_ = Pırıl (aynı ses, biraz daha ince ve neşeli).
   Kayıt: `python3 gen_voice.py` (bu dosyayı da okur) → sesler.js. Kısa (≤ 2 cümle), okuma yok; "Aa/Oo/Hi" yok, İngilizce yok.
   Hangi olaya bağlandıkları: scratchpad pr/istek/SES_HERKES.md. */
if (typeof AUD !== 'undefined' && AUD && AUD.LINES) Object.assign(AUD.LINES, {
  // ── Başlık ekranı (gece, Feza'nın yatağı, yanında uyuyan Pırıl) ──
  pr_baslik: 'Feza ile Pırıl: Kayıp Ejderha Işıkları!',
  pp_baslik: 'Merhaba Feza, ben Pırıl! Işıklarımı bulmama yardım eder misin?',
  pp_baslik_2: 'Uyandın mı Feza? Hadi, rüyaya uçalım!',
  // ── Kahraman seçimi (anlatıcı `kahraman_sec` der; seçilince Pırıl sevinir) ──
  pp_sec_savasci: 'Kılıçlı Feza! Çok cesur görünüyorsun!',
  pp_sec_buyucu: 'Sihirli asalı Feza! Yıldızlar seninle!',
  pp_sec_karma: 'Hem kılıç hem sihir! Süper bir takım olduk!',

  // ── Giriş masalı (STORY.playIntro, sırayla; her an bir cümle) ──
  // 1. Feza uyuyor
  pr_giris_1: 'Bir varmış, bir yokmuş. Feza yatağında mışıl mışıl uyuyormuş.',
  pr_giris_2: 'Yastığının yanında da minik ejderha Pırıl kıvrılmış uyuyormuş.',
  // 2. Pırıl uyanıyor, Feza'yla rüyaya dalıyorlar
  pr_giris_3: 'Pırıl\'ın kanatlarında beş renkli ejderha ışığı parlıyormuş.',
  pp_giris_uyan: 'Feza, Feza! Gel, rüyaya birlikte uçalım!',
  // 3. Koca Fırtına Bulutu esniyor
  pr_giris_4: 'Derken gökyüzünde Koca Fırtına Bulutu kocaman esnemiş.',
  pp_giris_ruzgar: 'Ne büyük bir esneme! Sımsıkı tutun Feza!',
  // 4. Işıklar savruluyor, kanatlar sönüyor
  pr_giris_5: 'Esneme rüzgârı Pırıl\'ın beş ışığını uzaklara savurmuş.',
  pr_giris_6: 'Işıklar beş ayrı diyara dağılmış. Pırıl\'ın kanatları sönmüş.',
  pp_giris_uzgun: 'Işıklarım gitti! Kanatlarım hiç parlamıyor.',
  // 5. "Işıkları birlikte bulalım!"
  pp_giris_hadi: 'Ama sen yanımdasın Feza! Işıkları birlikte bulalım!',
  pr_giris_7: 'İlk ışık Işıklı Mantar Vadisi\'ne düşmüş. Macera başlıyor!',

  // ── Işık geri geldi (ingredient olayı; n = 1..5) + Pırıl'ın yeni gücü (PIRIL_GUC.ac(n)) ──
  pr_isik_1: 'Birinci ışık geri geldi! Pırıl\'ın kanatları parlamaya başladı.',
  pp_guc_1: 'Artık ışık nefesi üfleyebiliyorum! Huysuzlara püf diye parıltı üflerim.',
  pr_isik_2: 'İkinci ışık da geldi! Kanatlar biraz daha parlıyor.',
  pp_guc_2: 'Artık köpük kalkanı yapabiliyorum! Canın azalınca seni köpükle korurum.',
  pr_isik_3: 'Üçüncü ışık da geldi! Pırıl\'ın kanatları ışıl ışıl.',
  pp_guc_3: 'Artık kanat rüzgârı estirebiliyorum! Huysuzları yavaşça geri iterim.',
  pr_isik_4: 'Dördüncü ışık da geldi! Bir tane kaldı.',
  pp_guc_4: 'Artık kalp tozu serpebiliyorum! Hem seni iyileştirir, hem huysuzları güldürür.',
  pr_isik_5: 'Beşinci ışık da geri geldi! Bütün ışıklar Pırıl\'da.',
  pp_guc_5: 'Bak Feza, büyüyorum! Hadi, sırtıma bin!',
  pp_isik_sevinc: 'Işığım geri geldi! Kanatlarım gıdıklanıyor!',

  // ── Uyku molası (STORY.ingredient, ~4 s; her bölüm sonunda biri) ──
  pr_uyku_1: 'Feza ile Pırıl biraz dinlensin. Yıldızlar ninni söylüyor.',
  pr_uyku_2: 'Uyku molası! Bir esne, bir gerin, sonra yola devam.',
  pr_uyku_3: 'Gözler biraz kapansın. Rüya yolculuğu sürüyor.',
  pr_uyku_4: 'Yıldızlar göz kırpıyor. Ne tatlı bir mola!',
  pp_uyku_esne: 'Uykum geldi. Biraz kıvrılalım mı?',
  pp_uyku_hazir: 'Dinlendim! Hadi, sıradaki ışığa!',

  // ── Final (STORY.ending; Koca Fırtına Bulutu neşelenince) ──
  pr_final_1: 'Koca Fırtına Bulutu neşelendi! Son ışık Pırıl\'a uçuyor.',
  pp_final_1: 'Beş ışığım da geldi! Bak, kanatlarım nasıl parlıyor!',
  pr_final_2: 'Pırıl büyüdü, büyüdü. Kocaman, ışıl ışıl bir ejderha oldu.',
  pp_final_bin: 'Hadi Feza, sırtıma bin! Sımsıkı tutun!',
  pr_final_3: 'Feza ile Pırıl gökkuşağının üstünde süzülmüşler.',
  pp_final_ucus: 'Vay, ne kadar yükseğiz! Bulutlar pamuk gibi!',
  pr_final_4: 'Fırtına Bulutu da onlara el sallamış. Artık hepsi arkadaşmış.',
  pp_final_bulut: 'Bulut gülümsüyor! Artık hiç esnemiyor.',
  pr_final_5: 'Sabah olunca Feza yatağında gülümseyerek uyanmış.',
  pp_final_son: 'Günaydın Feza! İyi ki benim arkadaşımsın.',
  pr_final_6: 'Gökten üç elma düşmüş. Biri Feza\'ya, biri Pırıl\'a, biri de dinleyenlere.',
});
