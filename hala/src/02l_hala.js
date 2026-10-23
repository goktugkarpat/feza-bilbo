/* ── Aytuğ Hala'nın oyun içi cümleleri (src/04_hala.js söyler: HALA.say / içteki sayOne) ──
   Hepsi Aytuğ Hala'nın ağzından, sıcak ve kısa. "Aa/Oo" gibi ünlem yok (ses motoru kısaltma sanıyor).
   Kayıt: orkestratör gen_voice.py ile mp3 üretir (tr-TR-EmelNeural, sessizlik kırpılır). */
'use strict';
if (typeof AUD !== 'undefined' && AUD && AUD.LINES) Object.assign(AUD.LINES, {
  // sarılma (Feza'nın canı azalınca)
  hala_saril: 'Gel bakalım, kocaman bir sarılma!',
  hala_saril2: 'Halacığın burada, hemen iyileşirsin.',
  hala_saril3: 'Sımsıkı sarıl bana Feza!',
  hala_saril4: 'Bu sarılma sana kocaman güç verir!',
  hala_saril5: 'Kuzum benim, gel buraya!',
  // kaldırma (Feza yorulup düşünce)
  hala_kalk: 'Hadi Feza, kalk!',
  hala_kalk2: 'Tut elimi, hop kalkıyoruz!',
  hala_kalk3: 'Bir, iki, üç, kalk bakalım!',
  hala_kalk4: 'Kahramanlar pes etmez, hadi kalk!',
  hala_kalkti: 'İşte böyle, yine dimdiksin!',
  hala_kalkti2: 'Yorgunluk uçtu gitti, hadi devam!',
  // yol gösterme
  hala_yon: 'Bu tarafa Feza, gel!',
  hala_yon2: 'Bak bak, yol şurada!',
  hala_yon3: 'Hadi, şu tarafa gidelim!',
  hala_yon4: 'Feza, beni takip et!',
  hala_yon5: 'Şekerler o tarafta olmalı!',
  hala_kapi: 'Kapı açıldı, hadi gidelim!',
  hala_burada: 'Feza, buradayım! Hadi şu tarafa!',
  // övgü (ara sıra, çeşitli)
  hala_ovgu: 'Süper Feza!',
  hala_ovgu2: 'Aferin benim yiğidime!',
  hala_ovgu3: 'Vay, ne güzel vurdun!',
  hala_ovgu4: 'Harikasın Feza!',
  hala_ovgu5: 'Bak bak, nasıl da gülümsedi!',
  hala_ovgu6: 'Sen gerçek bir kahramansın!',
  hala_ovgu7: 'Çok güzel, devam et!',
  hala_ovgu8: 'Halan seninle gurur duyuyor!',
  hala_ovgu9: 'Bravo Feza, bir tane daha!',
  hala_ovgu10: 'Oley, huysuz neşelendi!',
  hala_ovgu11: 'Ne kadar da cesursun!',
  // koca huysuz neşelenince + dans
  hala_boss: 'Yaşasın! Koca huysuz da neşelendi!',
  hala_boss2: 'İnanamıyorum, başardın Feza!',
  hala_dans: 'Hadi Feza, zafer dansı!',
  hala_dans2: 'Dans edelim, tam zamanı!',
  // Takım Hamlesi
  hala_takim: 'El ele, hop!',
  hala_takim2: 'Hazır mısın? Birlikte zıplıyoruz!',
  hala_takim3: 'Takım hamlesi, hadi Feza!',
  hala_takim4: 'Feza ile halası, en güçlü takım!',
  hala_takim_hazir: 'Takım hamlesi hazır, düğmeye bas!',
  // Polar Kalkan
  hala_kalkan: 'Polar kalkan!',
  hala_kalkan2: 'Dikkat Feza, seni koruyorum!',
  hala_kalkan3: 'Yanıma gel, kalkan açıldı!',
  // Pasta Topu
  hala_pasta: 'Al sana pasta topu!',
  hala_pasta2: 'Biraz krema, biraz neşe!',
  hala_pasta3: 'Hoppala, kremalı sürpriz!',
  hala_pasta4: 'Bu da benden, tatlım!',
  hala_pasta5: 'Pasta topu geliyor!',
  // havaya atıp tutma (zıplama yardımı)
  hala_hop: 'Hoppa, havaya uç!',
  hala_hop2: 'Seni yukarı atıyorum, hazır mısın?',
  hala_hop3: 'Uç bakalım minik kuşum!',
  hala_tut: 'Tuttum seni!',
  // ara sıra sevgi
  hala_yaninda: 'Ben hep yanındayım Feza!',
});
