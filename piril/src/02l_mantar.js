/* ── 1. bölüm: Işıklı Mantar Vadisi (06z_mantar.js, 05z_mantar.js) — anlatıcı (pr_) ve Pırıl (pp_) cümleleri ──
   pr_mantar_giris: bölüme girince · pp_mantar_giris: hemen ardından Pırıl · pr_mantar_orta / pp_mantar_orta: yarı yolda (3. alana girince)
   pr_mantar_arena: boss arenasına girince (boss uyanmadan) · pr_<bossId>_giris|_yarim|_bitti: boss (HUYSUZ.boss lines)
   pr_ilk_<tip>: huysuz ilk görüş · pr_ipucu_<hamle>: boss hamlesi ilk kez (BOSSDAV hints). Bölüm ajanının istekleri sonradan eklenir. */
if (typeof AUD !== 'undefined' && AUD && AUD.LINES) Object.assign(AUD.LINES, {
  pr_mantar_giris: 'Işıklı Mantar Vadisi\'ne geldik! Mantarlar fener gibi parlıyor.',
  pp_mantar_giris: 'Işığımın kokusunu alıyorum! Burada bir yerde olmalı.',
  pr_mantar_orta: 'Mantar şapkaları zıp zıp zıplatıyor. Yarı yola geldik!',
  pp_mantar_orta: 'Işığım çok yakında, kanadım kıpır kıpır!',
  pr_mantar_arena: 'Şşş, kocaman bir mantar uyukluyor. Işığım onun şapkasında parlıyor!',
  // boss: Koca Pofuduk Mantar
  pr_kocaPofudukMantar_giris: 'Şşş, Koca Pofuduk Mantar uyandı! Burnu da çok kaşınıyor.',
  pr_kocaPofudukMantar_yarim: 'Koca Pofuduk Mantar biraz gülümsedi. Devam et Feza!',
  pr_kocaPofudukMantar_bitti: 'Koca Pofuduk Mantar neşelendi! Bak, Pırıl\'ın ilk ışığını geri veriyor!',
  // ── huysuzlar: ilk görüş (pr_ilk_<tip>) ──
  pr_ilk_zipMantarcik: 'Bak, bir Zıp Mantarcık! Hop hop zıplıyor, ona dokun, neşelensin!',
  pr_ilk_sporPofudugu: 'Bu bir Spor Pofuduğu. Yumuşak bulut üfler, bulutun içinde biraz yavaşlarsın.',
  pr_ilk_tohumTopaci: 'Tohum Topacı fırıl fırıl dönüyor! Dönmeye başlayınca kenara kaç.',
  pr_ilk_yosunTopu: 'Şu yosun tümseği kımıldadı mı? Yosun Topu saklanıyor, çıkınca neşelendir!',
  pr_ilk_altinMantarcik: 'Vay, ışıl ışıl bir Altın Mantarcık! Yakala onu!',
  pr_mantar_nadir: 'Altın Mantarcık neşelendi! Bir altın şeker kazandın.',
  pr_mantar_spor_yavas: 'Spor bulutu seni yavaşlattı. Hiç acımaz, biraz bekle geçer.',
  // ── boss hamle ipuçları (BOSSDAV hints; ilk kez gelince bir kez) ──
  pr_ipucu_hapsu: 'Hapşıracak! Yerdeki yeşil halkalardan uzaklaş.',
  pr_ipucu_zipla: 'Şapkasıyla zıplayacak! Pembe halkadan kaç.',
  pr_ipucu_halka: 'Halkalar geliyor! Boşluğu bul, oraya kaç.',
  pr_ipucu_uclu: 'Üç kere zıplıyor! Halkalardan kaç, kaç, kaç!',
  pr_ipucu_uyku: 'Uyurken onu daha çabuk neşelendirirsin. Hadi, dokun!',
  pr_kocaPofudukMantar_uyku: 'Koca Pofuduk Mantar uyukluyor. Tam zamanı, neşelendir onu!',
  pr_kocaPofudukMantar_uyku2: 'Yine uykusu geldi. Hadi Feza, şimdi!',
  pr_kocaPofudukMantar_asama2: 'Hoppala, şapkası uçtu! Şimdi spor halkası yapacak, boşluktan kaç!',
  pr_kocaPofudukMantar_asama3: 'Gıdıklandı! Şimdi üç kere zıplayacak, pembe halkalardan uzak dur!',
  // ── istekle eklenenler ──
  pr_mantar_surukle: 'Parmağını ekranda kaydır, Feza o yöne yürüsün.',
  pr_mantar_ogret_vur: 'Huysuz yaklaştı! Ona dokun, Feza onu neşelendirsin.',
  pr_mantar_ziplat: 'Şu pembe mantara bas bakalım! Seni zıplatacak.',
  pr_mantar_sarki: 'Bu mantarlar şarkı söylüyor! Sırayla hepsine dokun.',
  pr_mantar_dere: 'Işıklı derede su şıpır şıpır sıçrıyor!',
  pr_mantar_tunel: 'Dev köklerin altından geçiyoruz. Işıklı yosunlara bak!',
  pr_mantar_halka: 'Burada bir peri halkası var. Tam ortasına bas!',
  pr_mantar_halka_bulundu: 'Peri halkası yandı! Sana altın şeker bıraktı.',
  pr_mantar_hazine: 'Yerde parlayan bir palamut var. Yanına git!',
  pr_mantar_pofuduk: 'Pof! Pofuduk top parıltı saçtı.',
  pp_mantar_ilk_nese: 'Yaşasın! İlk huysuzu neşelendirdin!',
  pp_mantar_ziplama: 'Yuppi! Uçar gibiydin!',
  pp_mantar_sarki: 'Ne güzel bir şarkı!',
  pp_mantar_boss: 'Feza, ben yanındayım. Birlikte yaparız!',
  pp_mantar_aferin1: 'Harikasın Feza!',
  pp_mantar_aferin2: 'Bravo!',
  pp_mantar_aferin3: 'Çok güzel oldu!',
});
