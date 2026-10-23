/* Oyun hissi + yetenek cümleleri (Aytuğ Hala). gen_voice.py tüm src/02l_*.js dosyalarını okur.
   his_kombo_*: seri vuruş övgüsü (ara sıra, rastgele, art arda aynısı yok) · his_nese_*: neşelenme övgüsü (nadiren)
   yetenek_*: yeni yetenek açılınca (SKILLS def.line) · guclendi_*: yıldız şekerle güçlenince (def.tierLine) */
Object.assign(AUD.LINES, {
  his_kombo_1: 'Süper Feza!',
  his_kombo_2: 'Vay, ne hızlısın!',
  his_kombo_3: 'Harikasın Feza!',
  his_kombo_4: 'Bak bak, hepsi gülümsüyor!',
  his_kombo_5: 'Durmak yok, devam Feza!',
  his_kombo_6: 'Sen gerçek bir kahramansın!',
  his_kombo_7: 'Ne güzel bir seri yaptın!',
  his_kombo_8: 'Yaşasın! Bu muhteşemdi!',
  his_nese_1: 'Bak, nasıl da neşelendi!',
  his_nese_2: 'Kocaman gülümsedi, gördün mü?',
  his_nese_3: 'Bir huysuz daha mutlu oldu!',
  his_nese_4: 'Kalpler uçuşuyor, ne güzel!',
  his_nese_5: 'Şekerleri topla Feza, hepsi senin!',
  his_nese_6: 'Aferin sana, canım benim!',
  yetenek_krema: 'Krema Fışkırtma açıldı! Düğmeye bas, krema topları uçsun!',
  yetenek_kasik: 'Kaşık Kasırgası hazır! Dönen kaşıklar herkesi güldürsün!',
  yetenek_seker: 'Şeker Yağmuru açıldı! Gökten rengârenk şekerler yağdır!',
  guclendi_krema: 'Krema Fışkırtma güçlendi! Daha çok krema topu!',
  guclendi_kasik: 'Kaşık Kasırgası güçlendi! Daha çok kaşık dönüyor!',
  guclendi_seker: 'Şeker Yağmuru güçlendi! Daha çok şeker yağıyor!',
  his_yildiz_var: 'Yıldız şekerlerin birikti! Mor yıldız düğmesine bas.',
  his_panel: 'Hangi yeteneğini güçlendirelim? Yeşil düğmeye bas!',
});
