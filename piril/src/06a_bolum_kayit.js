/* ── Bölüm kaydı (Feza ile Pırıl: Kayıp Ejderha Işıkları) ──
   Her bölüm kendi dosyasında (src/06z_<id>.js) BOLUM.define('<id>', {...}) ile kendini kaydeder; 06_level.js bu kayıtlardan
   ZONES listesini kurar ve LEVEL.build() bölümün kur() kancasını çağırır. Biçim ve kancalar: src/SPEC.md › "Dev Ev API".
   Genel adlar: ZONE_DEFS (id → tanım), BOLUM (kayıt yardımcıları). */
const ZONE_DEFS = {};
const BOLUM = (() => {
  'use strict';
  // Harita / kayıt sırası. Bir kimliğin yeri kayıttaki bölge numarasıdır: sırayı değiştirme, sona ekle.
  // yuva = merkez (Uyku Yuvası, hub), oyun buradan başlar; bölümler SIRAYLA açılır (PIRIL.md › 2)
  const ORDER = ['yuva', 'mantar', 'mercan', 'col', 'atolye', 'gokkusagi'];
  const FINAL = 'gokkusagi';
  const NEED = 4;   // final için gereken ışık sayısı
  const DEF = {
    ad: 'Bölüm', taban: 'bathroom', size: 90, rooms: 6, side: 2,
    muzik: 'pr_menu', line: null, final: false, malzeme: null, kayipEsya: null,
    isik: null, minimap: null, harita: null,
    huysuzlar: { jole: 4 }, elitler: ['jole'], varyantlar: null, boss: null,
    hpMult: 1, dmgMult: 1, xpMult: 1, gold: 1, ilvl: 1,
  };
  function define(id, def) {
    if (!ORDER.includes(id)) ORDER.push(id);
    const d = ZONE_DEFS[id] = Object.assign({}, ZONE_DEFS[id] || {}, def, { id });
    return d;
  }
  const get = id => ZONE_DEFS[id] || null;
  // Düşman listesi ve boss: önce HUYSUZ kaydı (src/05a_huysuz_kayit.js), yoksa bölüm tanımındaki yedek liste.
  function enemyList(id, d) {
    const H = typeof HUYSUZ !== 'undefined' && HUYSUZ && HUYSUZ.forZone ? HUYSUZ.forZone(id) : null;
    return {
      enemies: (H && H.enemies && Object.keys(H.enemies).length ? H.enemies : d.huysuzlar) || DEF.huysuzlar,
      elites: (H && H.elites && H.elites.length ? H.elites : d.elitler) || [],
      variants: (H && H.variants) || d.varyantlar || undefined,
      boss: (H && H.boss) || d.boss || null,
    };
  }
  // 06_level.js çağırır: GAME/LEVEL/UI'nin beklediği eski ZONES biçimi.
  function zones() {
    return ORDER.filter(id => ZONE_DEFS[id]).map(id => {
      const d = Object.assign({}, DEF, ZONE_DEFS[id]), e = enemyList(id, d);
      // alanlar: [{ id, ad, rooms: oda sayısı (≥1) }] → ana oda zinciri alanlara bölünür, en sonda boss arenası
      let rooms = d.rooms, areaStarts = null;
      if (Array.isArray(d.areas) && d.areas.length && !d.hub) {
        areaStarts = []; let k = 0;
        for (const a of d.areas) { areaStarts.push(k); k += Math.max(1, a.rooms | 0 || 2); }
        rooms = k + 1;
      }
      return {
        id, ad: d.ad, theme: d.taban, line: d.line, music: d.muzik, size: d.size, rooms, side: d.side, hub: !!d.hub,
        areas: areaStarts ? d.areas : null, areaStarts,
        enemies: e.enemies, elites: e.elites, variants: e.variants, boss: d.hub ? null : e.boss,
        hpMult: d.hpMult, dmgMult: d.dmgMult, xpMult: d.xpMult, gold: d.gold, ilvl: d.ilvl,
        final: id === FINAL || !!d.final, malzeme: d.malzeme, kayipEsya: d.kayipEsya, def: ZONE_DEFS[id],
      };
    });
  }
  // Bölümler sırayla açılır: merkez ve ilk bölüm hep açık; sonrakiler bir öncekinin bossu neşelenince (ya da ışığı alınınca).
  function isOpen(id, P) {
    if (typeof Q !== 'undefined' && Q.has && (Q.has('hepsiacik') || Q.has('bolum'))) return true;   // (test: ?bolum= da kilitleri açar)
    const list = ORDER.filter(k => ZONE_DEFS[k] && !ZONE_DEFS[k].hub), i = list.indexOf(id);
    if (i <= 0) return true;
    const prev = list[i - 1], d = ZONE_DEFS[prev];
    return !!(P && ((P.bossNese && P.bossNese[prev]) || (P.malzemeler && d && d.malzeme && P.malzemeler[d.malzeme])));
  }
  // Ortak yer tutucu görünüm (bölüm ajanı kendi kur() fonksiyonuyla değiştirir): yürünür alanın kenarına alçak bordür,
  // odaların çevresinde ev ölçeğinde dev kutular (kamera tarafı = güney: alçak), çıkış kapısının arkasında dev bir oda kapısı.
  function yerTutucu(L, api, o = {}) {
    const rnd = api.rnd, cols = o.kutu || [0xe8c9a0, 0xcfa27a, 0xf2dcc0, 0xb98a68];
    api.dreamEdge();
    for (const rm of L.rooms) {
      for (let k = 0; k < 7; k++) {
        const a = k * Math.PI * 2 / 7 + rnd() * 0.4, rad = (rm.r || Math.max(rm.hw, rm.hh)) + 3.5 + rnd() * 2;
        const x = rm.x + Math.sin(a) * rad, z = rm.z + Math.cos(a) * rad;
        if (api.isFloor(x, z) || api.linkDist(x, z) < 4) continue;
        const south = z > rm.z + 1, w = 2.5 + rnd() * 3.5, d = 2.5 + rnd() * 3, h = south ? 0.5 + rnd() * 0.5 : 2.5 + rnd() * 4;
        if ([[w, 0], [-w, 0], [0, d], [0, -d]].some(([dx, dz]) => api.isFloor(x + dx * 0.55, z + dz * 0.55))) continue;
        api.box(x, h / 2, z, w, h, d, cols[k % cols.length], rnd() * 0.5 - 0.25);
      }
    }
    const ex = L.exit || L.crystalSpot;
    if (ex) {   // dev oda kapısı (çıkış): kanat + çerçeve + topuz
      const c = o.kapi || 0xf6efe4;
      api.box(ex.x, 3.6, ex.z - 1.6, 4.6, 7.2, 0.3, c, 0);
      api.box(ex.x - 2.45, 3.7, ex.z - 1.5, 0.3, 7.4, 0.45, 0xffffff, 0);
      api.box(ex.x + 2.45, 3.7, ex.z - 1.5, 0.3, 7.4, 0.45, 0xffffff, 0);
      api.box(ex.x, 7.45, ex.z - 1.5, 5.2, 0.3, 0.45, 0xffffff, 0);
      api.ball(ex.x + 1.7, 3.2, ex.z - 1.35, 0.22, 0.22, 0.22, 0xf2c44a);
      api.glow(ex.x, ex.z, 3, 0xfff0c0, 0.12);
    }
    for (const rm of L.rooms) api.glow(rm.x, rm.z, (rm.r || 6) * 0.9, o.isik || 0xfff2dc, 0.08);
  }
  // Oda bölümleri için varsayılan 3 alt alan (bölüm dosyası kendi areas listesini verebilir)
  const UC_ALAN = (a, b, c) => [{ id: 'a1', ad: a, rooms: 2 }, { id: 'a2', ad: b, rooms: 2 }, { id: 'a3', ad: c, rooms: 2 }];
  return { ORDER, FINAL, NEED, define, get, zones, isOpen, yerTutucu, UC_ALAN };
})();
