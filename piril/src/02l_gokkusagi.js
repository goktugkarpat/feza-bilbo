/* ── 5. bölüm (final): Gökkuşağı Adaları (06z_gokkusagi.js, 05z_gokkusagi.js) — anlatıcı (pr_) ve Pırıl (pp_) cümleleri ──
   pr_gokkusagi_giris: bölüme girince · pp_gokkusagi_giris: hemen ardından Pırıl · pr_gokkusagi_orta / pp_gokkusagi_orta: yarı yolda (3. alana girince)
   pr_gokkusagi_arena: boss arenasına girince (boss uyanmadan) · pr_<bossId>_giris|_yarim|_bitti: boss (HUYSUZ.boss lines)
   pr_ilk_<tip>: huysuz ilk görüş · pr_ipucu_<hamle>: boss hamlesi ilk kez (BOSSDAV hints). Bölüm ajanının istekleri sonradan eklenir. */
if (typeof AUD !== 'undefined' && AUD && AUD.LINES) Object.assign(AUD.LINES, {
  pr_gokkusagi_giris: 'Gökkuşağı Adaları\'na geldik! Bulutların üstünde rengârenk köprüler var.',
  pp_gokkusagi_giris: 'Son ışığım burada! Koca Fırtına Bulutu da burada bir yerde.',
  pr_gokkusagi_orta: 'Adalar gökkuşağıyla birbirine bağlı. Yarı yola geldik!',
  pp_gokkusagi_orta: 'Çok az kaldı Feza! Bulut esnemeden onu bulalım.',
  pr_gokkusagi_arena: 'İşte Koca Fırtına Bulutu! Hâlâ uykulu uykulu esniyor.',
  // boss: Koca Fırtına Bulutu
  pr_kocaFirtinaBulutu_giris: 'İşte ışıkları savuran Koca Fırtına Bulutu! Uykusu kaçmış, hadi onu neşelendirelim!',
  pr_kocaFirtinaBulutu_yarim: 'Bulut biraz yumuşadı. Bak, yanakları pembeleşiyor!',
  // son aşama: Pırıl büyür, Feza sırtında uçar, havadaki son ışıkları toplarlar (05z_gokkusagi)
  pr_kocaFirtinaBulutu_binis: 'Pırıl kocaman oldu! Feza sırtına bindi, havadaki ışıkları toplayın!',
  pp_gokkusagi_binis: 'Sırtıma bin Feza! Uçan ışıkları birlikte toplayalım!',
  pp_gokkusagi_isik_1: 'Bir ışık daha! Devam!',
  pp_gokkusagi_isik_2: 'Yakaladık! Şuradakini de alalım!',
  pp_gokkusagi_isik_son: 'Sonuncusu kaldı! Hadi Feza!',
  pr_kocaFirtinaBulutu_bitti: 'Koca Fırtına Bulutu gülümsüyor! Gökkuşağı yağdırıp mışıl mışıl uykuya dalıyor.',
  // ── süsler / sürprizler (06z_gokkusagi) ──
  pr_gk_hazine: 'Bulutların arasında gizli bir yıldız hediyesi var!',
  pr_gk_ruzgarcani: 'Rüzgâr çanına dokun, bak ne güzel çalıyor.',
  pr_gk_ziplabulut: 'Pofuduk buluta bas, havaya zıpla!',
  // ── istekle eklenenler ──
  pr_ilk_simsekcik: 'Bak, minik bir şimşekçik bulut! Çıtır çıtır parlıyor ama çok tatlı.',
  pr_ilk_ruzgarBalonu: 'Rüzgâr balonu yanaklarını şişiriyor. Püf diye üfleyecek!',
  pr_ilk_doluPofudugu: 'Dolu Pofuduğu yumuşacık kar topları atıyor. Beyaz halkalardan uzak dur!',
  pr_ilk_yagmurDamlacigi: 'Hoplayan yağmur damlacıkları geliyor. Şıp şıp!',
  pr_ilk_gokkusagiDamla: 'Vay, gökkuşağı renkli bir damlacık! Onu neşelendirirsen altın şeker kazanırsın.',
  pr_ipucu_ruzgar: 'Mavi rüzgârın önünden yana kaç!',
  pr_ipucu_yagmur: 'Yağmur geliyor! Yerdeki halkalardan kaç.',
  pr_ipucu_dolu: 'Beyaz halkalara kar topu inecek. Hemen çekil!',
  // ── istekle eklenenler ──
  pr_ipucu_damla_yagmur: 'Mavi halkalara yağmur damlası düşecek. Kenara koş!',
});
