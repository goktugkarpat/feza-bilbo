/* ── Pırıl'ın oyun içi cümleleri (pp_: aynı Emel sesi, biraz daha ince ve neşeli) ──
   Kullananlar: 04_piril_guc.js / 04_piril_takip.js (PIRIL3D), 07_game.js (CORE). Hepsi kısa; övgüler ARA SIRA ve rastgele seçilir
   (aynısı art arda gelmesin; en az ~20 s ara). Bağlantı listesi: scratchpad pr/istek/SES_HERKES.md. */
if (typeof AUD !== 'undefined' && AUD && AUD.LINES) Object.assign(AUD.LINES, {
  // ── kısa sevinç / şaşkınlık (ara sıra) ──
  pp_yasasin: 'Yaşasın!',
  pp_vay: 'Vay canına!',
  pp_bak: 'Bak bak, şuraya bak!',
  pp_komik: 'Kıkır kıkır, çok komik!',
  pp_sasir: 'Bu da ne böyle?',
  pp_merak: 'Acaba orada ne var?',
  pp_guzel: 'Burası ne kadar güzel!',
  pp_kirinti: 'Bir ışık parçası! Kanadım gıdıklandı.',
  pp_kirinti_2: 'Bir parıltı daha! Topla topla!',
  pp_sandik: 'Bir sandık! Hadi açalım!',
  pp_seviyorum: 'Seni çok seviyorum Feza!',
  pp_buradayim: 'Ben hep yanındayım Feza!',

  // ── övgü (huysuz neşelenince ARA SIRA; her seferinde değil) ──
  pp_ovgu_1: 'Aferin sana!',
  pp_ovgu_2: 'Süpersin Feza!',
  pp_ovgu_3: 'Çok güzel gidiyorsun!',
  pp_ovgu_4: 'İşte böyle!',
  pp_ovgu_5: 'Harikasın!',
  pp_ovgu_6: 'Ne kadar da cesursun!',
  pp_ovgu_7: 'Bak, nasıl da güldü!',
  pp_ovgu_8: 'Huysuzluğu uçtu gitti!',
  pp_ovgu_9: 'Birlikte çok iyiyiz!',
  pp_ovgu_10: 'Kalpler uçuşuyor, ne güzel!',

  // ── yol gösterme / kapı ipuçları (Pırıl uçup gösterir) ──
  pp_yon_1: 'Bu tarafa Feza, beni takip et!',
  pp_yon_2: 'Hadi, şu tarafa uçalım!',
  pp_yon_3: 'Gel gel, yol şurada!',
  pp_kapi: 'Kapıyı buldum! Şurada parlıyor, gel!',
  pp_kapi_2: 'Kapı açıldı! Hadi, içeri uçalım!',
  pp_kapi_kapali: 'Önce huysuzları neşelendirelim, sonra kapı açılır.',
  pp_kapi_kapali_2: 'Birkaç huysuz kaldı. Ben gösteririm, gel!',
  pp_isik_yakin: 'Işığım çok yakında, hissediyorum!',

  // ── yetenekler: kullanırken (çok seyrek; yeni açılınca hikâyedeki pp_guc_n söylenir) ──
  pp_nefes_1: 'Püf! Işık nefesi!',
  pp_nefes_2: 'Al sana parıltı!',
  pp_kalkan_1: 'Köpük kalkanı! Seni koruyorum.',
  pp_kalkan_2: 'Hop, köpüğün içindesin!',
  pp_ruzgar_1: 'Kanat rüzgârı geliyor!',
  pp_ruzgar_2: 'Biraz geri çekilin bakalım!',
  pp_kalptozu_1: 'Kalp tozu serpiyorum!',
  pp_kalptozu_2: 'Biraz sevgi, biraz ışık!',

  // ── Takım Hamlesi (eski Hala takım hamlesi; PIRIL_GUC.teamMove) ──
  pp_takim_hazir: 'Takım hamlesi hazır! Parlayan düğmeye bas!',
  pp_takim_1: 'Birlikte, hop!',
  pp_takim_2: 'Hazır mısın? Hep birlikte!',
  pp_takim_3: 'Feza ile Pırıl, en güçlü takım!',

  // ── Feza'nın canı azalınca / yorulup düşünce (onFezaLow / onFezaDown) ──
  pp_can_az: 'Dikkat Feza, canın azaldı! Bana yakın dur.',
  pp_saril_1: 'Seni kanatlarımla sardım, hemen iyileşirsin!',
  pp_saril_2: 'Buradayım Feza, hadi kalk!',
  pp_saril_3: 'Bir, iki, üç, kalk bakalım!',
  pp_kalkti_1: 'İşte böyle, yine dimdiksin!',
  pp_kalkti_2: 'Yorgunluk uçtu gitti, hadi devam!',

  // ── boss savaşı sırasında (giriş anlatıcıdan sonra, ara sıra) ──
  pp_boss_1: 'Ben de yardım ederim! Hadi Feza!',
  pp_boss_2: 'Birlikte neşelendirelim!',
  pp_boss_3: 'Az kaldı, gülümsemeye başladı!',
});
