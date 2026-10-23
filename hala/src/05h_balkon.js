/* ── 5. oda: Balkon Bahçesi huysuzları ve bossu (HUYSUZ.type / boss / zone) ──
   Güneşli balkonun canlanmış bahçe eşyaları (böcek / hayvan YOK): hepsi SEVİMLİ, yuvarlak, gülümseyen (en fazla yaramaz);
   neşelenince ^ ^ gözler, kocaman gülümseme, kalpler. Modeller src/05h_huysuzlar.js ile aynı teknikle (EMODEL.KIT iskelet + K.face).
     saksicik     Saksıcık        kiremit saksı, tepesinde sallanan çiçek; yan yatıp yuvarlanır, toprak izi (base goblin, 'yuvarlanan')
     sulamaKabi   Sulama Kabıcık  fıskiyesinden su damlası atar (base mantar, 'uzak')
     mandal       Mandal          çamaşır mandalı; çenesini açıp kapayarak zıplar (base yogurt, 'ziplayan'); elit: pembe, taçlı
     eldiven      Bahçe Eldiveni  parmaklarını kıpırdatır, "pat!" diye dokunur (base goblin, 'yakin')
     altinSaksi   Altın Saksı     nadir: neşelenince "gizli" çıkartma + altın şeker
     dikenliGul   Dikenli Gül     saksıda kök salmış gül, yumuşak şeker dikenler; diken topu atar, değince "pıt!" kalp (base mantar, 'uzak');
                                  elit: taçlı Kocaman Dikenli Gül
     kaktusCicegi Kaktüs Çiçeği   tepesi sarı çiçekli fıçı kaktüs; takla atıp yuvarlanır, zıplayıp iner, yerde diken halkası (base goblin, 'agir')
     kaktus       Kaktüs          kolları yukarı klasik kaktüs (Feza'nın sevdiği); kollarını açıp diken toplarını saçar ('agir'); elit: şapkalı
     gokkusagiGul Gökkuşağı Gül   nadir: gökkuşağı yapraklı; neşelenince "gizli" çıkartma + altın şeker
     uykucuHortum Uykucu Hortum   boss (base kefirdev): sarılı bahçe hortumu; esner, fıskiyeden su püskürtür, su damlası atar, hoplar
   Biçim: src/SPEC.md › "Dev Ev API" › Huysuz kaydı. Sesler: src/02l_balkon.js. */
(() => {
  'use strict';
  const PI = Math.PI;
  const HAS = typeof EMODEL !== 'undefined' && EMODEL && EMODEL.KIT && EMODEL.addType && EMODEL.buildRaw;
  const K = HAS ? EMODEL.KIT : null, G = HAS ? K.G : null;
  const col = h => new THREE.Color(h), hdr = (h, k) => new THREE.Color(h).multiplyScalar(k);
  const mixc = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  const hash = (a, b, c) => (K ? K.hash3(a, b, c) : 0.5);
  const sm = x => smooth01(x);
  const yuz = (o) => Object.assign({ tilt: 0.3, browT: 0.32, browRaise: 0.26 }, o);
  const bumpU = (u, a, b) => (u > a && u < b ? Math.sin(PI * (u - a) / (b - a)) : 0);
  const bump = (x, w) => (x > 0 && x < w ? Math.sin(PI * x / w) : 0);
  const breath = (s, f = 2.4) => Math.sin(s.t * f + s.ph);

  // ── ortak parçalar (05h ile aynı) ──
  function glints(r, pts, c = '#fff6c8') {
    r.fx(1, 0);
    for (const p of pts) {
      r.add(G.octa(), hdr(c, 2.2), p, [0, 0, 0], [p[3], p[3] * 1.9, p[3] * 0.5]);
      r.add(G.octa(), hdr(c, 2.2), p, [0, 0, PI / 2], [p[3], p[3] * 1.9, p[3] * 0.5]);
    }
    r.fx(0, 0);
  }
  function shoe(r, x, y, z, sx, sy, sz, c, glossy = 0.6) {
    r.fx(0, glossy).add(G.sphere(16, 10), c, [x, y, z], null, [sx, sy, sz]);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.05), [x - sx * 0.25, y + sy * 0.6, z + sz * 0.45], null, [sx * 0.22, sy * 0.15, sz * 0.18]);
    r.fx(0, 0);
  }
  // ── ortak hareket yardımcıları (05h ile aynı) ──
  function boing(s, st, dt, b, k = 1) {
    if (st.hurt > (s.hzH || 0) + 0.25) s.hzB = 0;
    s.hzH = st.hurt;
    if (s.hzB === undefined || s.hzB > 1.2) return;
    s.hzB += dt;
    const w = Math.sin(s.hzB * 30) * Math.exp(-s.hzB * 5.5) * 0.22 * k;
    b.scale.y *= 1 + w; b.scale.x *= 1 - w * 0.6; b.scale.z *= 1 - w * 0.6;
  }
  function gag(s, st, dt, D, every = 5) {
    const idle = s.mv < 0.15 && st.windup < 0 && st.attack < 0 && !(st.dying >= 0) && !(st.hurt > 0.3);
    if (s.gagT === undefined) s.gagT = frand(1.5, every);
    if (!idle) { if (s.gagU >= 0) s.gagU = -1; s.gagT = Math.max(s.gagT, 1.2); return -1; }
    if (s.gagU >= 0) { s.gagU += dt / D; if (s.gagU >= 1) { s.gagU = -1; s.gagT = frand(every * 0.7, every * 1.5); return -1; } return s.gagU; }
    s.gagT -= dt;
    if (s.gagT <= 0) { s.gagU = 0; return 0; }
    return -1;
  }
  function walkPh(s, dt, rate) { if (s.mv > 0.03) s.walk += dt * (rate + 5 * s.mv); return Math.min(1, s.mv * 1.4); }
  // zamanlayıcılı ara sıra hareket (05_enemies act ile aynı): -1 yok, 0..1 ilerleme
  function act(s, key, dt, a, b, len, on) {
    let c = s[key] ?? frand(a, b);
    if (c > 0) { s[key] = on ? c - dt : Math.max(c, 1); return -1; }
    c -= dt;
    if (-c >= len || !on) { s[key] = frand(a, b); return -1; }
    s[key] = c; return -c / len;
  }


  // sbox / mitt / hearts: src/05h_huysuzlar.js ile aynı yardımcılar
  function sbox(w, h, d, rad, seg = 3) {
    const s = Math.max(2, Math.round(seg * 1));
    return K.gx(`bk_sbox_${w}_${h}_${d}_${rad}_${s}`, () => {
      const g = new THREE.BoxGeometry(w, h, d, s * 2 + 1, s * 2 + 1, s * 2 + 1);
      const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        c.set(clamp(v.x, -w / 2 + rad, w / 2 - rad), clamp(v.y, -h / 2 + rad, h / 2 - rad), clamp(v.z, -d / 2 + rad, d / 2 - rad));
        const dd = v.clone().sub(c);
        if (dd.lengthSq() > 1e-10) { dd.normalize(); v.copy(c).addScaledVector(dd, rad); p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, dd.x, dd.y, dd.z); }
      }
      return K.seamNormals(g);
    });
  }
  function mitt(r, p, s, c = '#fffaf4') {
    r.fx(0, 0.3).add(G.sphere(14, 10), c, p, null, [s, s * 0.92, s * 0.9]);
    r.add(G.sphere(10, 8), c, [p[0] + s * 0.55 * Math.sign(p[0] || 1), p[1] + s * 0.35, p[2] + s * 0.3], null, s * 0.42);
    r.fx(0, 0);
  }
  function hearts(r, pts) {
    r.mood = 2; r.on('joy').fx(0.5, 0.6);
    for (const p of pts) r.add(K.heartGeo(), '#ff4f93', [p[0], p[1], p[2]], [-0.2, 0, -Math.sign(p[0]) * 0.35], p[3]);
    r.fx(0, 0); r.mood = 0;
  }
  const HOP = { y: 0, sy: 1, sxz: 1, u: 0, air: 0 };
  function hopGait(s, st, dt, rate, h) {
    s.hopK = damp(s.hopK || 0, st.move > 0.05 ? 1 : 0, 6, dt);
    if (s.hopK > 0.02 || (s.hop % 1) > 0.03) s.hop += dt * (rate + 0.8 * s.mv);
    const u = s.hop % 1, A = s.hopK;
    let y = 0, sy = 1, sxz = 1, air = 0;
    if (u < 0.2) { const k = Math.sin(PI * u / 0.2); sy -= 0.18 * k * A; sxz += 0.1 * k * A; }
    else if (u < 0.82) { const k = (u - 0.2) / 0.62; air = Math.sin(PI * k) * A; y = air * h; const st2 = Math.abs(Math.cos(PI * k)); sy += 0.14 * st2 * A; sxz -= 0.06 * st2 * A; }
    else { const k = Math.sin(PI * (u - 0.82) / 0.18); sy -= 0.2 * k * A; sxz += 0.12 * k * A; }
    HOP.y = y; HOP.sy = sy; HOP.sxz = sxz; HOP.u = u; HOP.air = air;
    return HOP;
  }
  const fabTex = k => (typeof TEX !== 'undefined' && TEX && TEX.fabric ? (TEX.rep ? TEX.rep('fabric', k, k) || TEX.fabric : TEX.fabric) : undefined);

  // ════════════════ SAKSICIK (+ nadir Altın Saksı) ════════════════
  // Minik kiremit saksı: kalın kenarlı, yanlarında boyalı beyaz çiçekler, tepesinde toprak ve içinden çıkan sallanan pembe çiçek
  // (iki yaprak); yuvarlak minik eller, kırmızı-yeşil ayakkabılar. Yürürken paytak paytak sallanır, çiçeği başını sallar.
  // Hazırlık: geriye yaslanır, çiçeği titrer, toprağı "puf" diye kabarır; saldırı: yan yatıp tekerlek gibi yuvarlanır (arkasında
  // toprak izi). Bekleme: çiçeği pervane gibi döner, saksı havalanır gibi hoplar, toprağı serpilir.
  const POT_P = [[0, 0], [0.15, 0], [0.165, 0.015], [0.2, 0.3], [0.205, 0.318], [0.236, 0.328], [0.25, 0.35], [0.252, 0.425], [0.238, 0.445], [0.218, 0.44]];
  function buildSaksi(r, o) {
    const gold = o.rare;
    const pot = col(gold ? '#ffcf3a' : '#e07a4a'), potL = col(gold ? '#fff0a0' : '#f4a272'), potD = col(gold ? '#d08a14' : '#b8532e');
    const out = new THREE.Color();
    r.bone('body', 'root', [0, 0.22, 0]);
    r.bone('feet', 'root', [0, 0.03, 0.04]);
    r.bone('armL', 'body', [0.22, 0.2, 0.02]); r.bone('armR', 'body', [-0.22, 0.2, 0.02]);
    r.bone('stem', 'body', [0, 0.42, 0]);
    r.bone('bloom', 'stem', [0, 0.74, 0.03]);
    r.bone('puf', 'body', [0, 0.44, 0]);
    // kiremit gövde: alttan koyu, kenar açık, hafif benekli pişmiş toprak
    const tc = (x, y, z) => out.copy(potD).lerp(pot, sm((y - 0.01) / 0.22)).lerp(potL, 0.35 * sm((y - 0.33) / 0.06))
      .lerp(col(gold ? '#fff6d0' : '#ffd8c0'), 0.12 * sm((K.fbm3(x * 16, y * 16, z * 16) - 0.55) / 0.1));
    r.on('body').fx(0, gold ? 2 : 0.35).add(K.lathe('bkPot', POT_P, 40, 4), tc, [0, 0, 0]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', gold ? 1.5 : 1.1), [-0.13, 0.24, 0.15], [0, -0.7, 0], [0.025, 0.07, 0.01]);   // parıltı
    // toprak (koyu, topaklı)
    r.fx(0, 0.05).add(G.cyl(1, 1, 30), (x, y, z) => out.copy(col('#5a3420')).lerp(col('#8a5a34'), K.fbm3(x * 30, 1, z * 30)), [0, 0.415, 0], null, [0.222, 0.02, 0.222]);
    for (let i = 0; i < 7; i++) { const a = i * 2.39, d = 0.06 + 0.11 * hash(i, 3, 1); r.add(G.sphere(8, 6), mixc('#6a4028', '#94643a', hash(i, 1, 5)), [Math.sin(a) * d, 0.428, Math.cos(a) * d], null, [0.03, 0.018, 0.03]); }
    // yanlarda boyalı beyaz çiçekler
    r.fx(0, 0.4);
    for (const a of [1.35, -1.35, 2.4, -2.4]) {
      const [p, n] = K.onLathe(POT_P, 0.2, a, 0.004);
      r.push(p, K.qz(...n));
      for (let k = 0; k < 5; k++) { const b = k / 5 * TAU; r.add(G.sphere(8, 6), gold ? '#ffffff' : '#fff6ea', [Math.sin(b) * 0.022, Math.cos(b) * 0.022, 0], null, [0.014, 0.014, 0.004]); }
      r.add(G.sphere(8, 6), gold ? '#ff9ac0' : '#ffd23a', [0, 0, 0.002], null, [0.011, 0.011, 0.005]);
      r.pop();
    }
    r.fx(0, 0);
    // minik yuvarlak eller (kiremit)
    for (const sd of [-1, 1]) r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.35).add(G.sphere(14, 10), mixc(pot, potL, 0.3), [0.235 * sd, 0.19, 0.03], null, [0.055, 0.05, 0.05]);
    r.fx(0, 0);
    // ayakkabılar
    r.on('feet');
    for (const sd of [-1, 1]) shoe(r, 0.09 * sd, 0.03, 0.05, 0.062, 0.04, 0.085, gold ? '#ff5a8a' : '#5aa84a');
    // çiçek: sap, iki yaprak, pembe taç (kameraya doğru eğik), sarı göbek
    r.on('stem').fx(0, 0.4);
    r.seg([0, 0.41, 0], [0, 0.6, 0.0], 0.022, '#4f9a3a', 0.02, 8);
    r.seg([0, 0.6, 0.0], [0, 0.73, 0.03], 0.02, '#58a840', 0.018, 8);
    for (const sd of [-1, 1]) r.add(G.sphere(14, 8), K.vgrad(0.5, 0.6, [[0, '#3f8a34'], [1, '#7fd060']]), [0.075 * sd, 0.53 + (sd > 0 ? 0.03 : 0), 0.01], [0, 0, -sd * 0.55], [0.085, 0.024, 0.045]);
    r.on('bloom').push([0, 0.75, 0.04], [0.75, 0, 0]).fx(0, 0.5);
    const pet = gold ? ['#ffffff', '#fff2c0'] : ['#ff7aa8', '#ffa8c8'];
    for (let i = 0; i < 10; i++) { const b = i / 10 * TAU; r.add(G.sphere(12, 6), pet[i & 1], [Math.sin(b) * 0.075, 0.004 * (i & 1), Math.cos(b) * 0.075], [0, b, 0], [0.04, 0.014, 0.08]); }
    r.add(G.sphere(14, 10), gold ? '#ffb020' : '#ffd23a', [0, 0.012, 0], null, [0.045, 0.026, 0.045]);
    r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.2), [-0.015, 0.035, 0.012], null, 0.008);
    r.pop().fx(0, 0);
    // "puf": toprak serpintisi (bekleme / hazırlıkta görünür)
    r.on('puf').fx(0.1, 0, 0, 1);
    for (let i = 0; i < 9; i++) { const a = i * 2.39996, d = 0.05 + 0.12 * hash(i, 7, 2); r.add(G.sphere(8, 6), mixc('#7a4a2a', '#c09060', hash(i, 2, 8)), [Math.sin(a) * d, 0.47 + 0.08 * hash(i, 5, 5), Math.cos(a) * d], null, 0.022 + 0.015 * hash(i, 1, 1)); }
    r.fx(0, 0);
    // yüz
    r.on('body');
    K.face(r, [0, 0.18, 0], 0.2, yuz({ bone: 'body', tilt: 0.08, ex: 0.074, ey: 0.02, er: 0.066, iris: gold ? '#7a3a0a' : '#4a2410', skin: pot, browCol: gold ? '#8a4a10' : '#6a2a12', browY: 1.34,
      mouthY: -0.078, mouthW: 0.074, noHearts: true, blushCol: '#ff6f8a' }));
    hearts(r, [[0.28, 0.52, 0.1, 0.07], [-0.26, 0.58, 0.1, 0.058]]);
    if (gold) { glints(r.on('body'), [[0.2, 0.36, 0.12, 0.03], [-0.18, 0.12, 0.14, 0.025]]); glints(r.on('bloom'), [[0.1, 0.82, 0.1, 0.022]]); }
    r.on('body').mark('muzzle', [0, 0.3, 0.25]);
    return { height: 0.95, glowC: col(gold ? '#fff0a0' : '#ffb08a'), hide: ['puf'],
      mat: { rough: gold ? 0.22 : 0.6, sss: col('#ffb08a').multiplyScalar(gold ? 0 : 0.03), rim: gold ? '#fff2b0' : '#ffe6d6', rimK: gold ? 0.45 : 0.3, rimP: 2.3 } };
  }
  function animSaksi(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 8), ph = s.walk;
    b.rotation.z = Math.sin(ph) * 0.14 * k + Math.sin(s.t * 1.4 + s.ph) * 0.03;
    b.position.y += Math.abs(Math.sin(ph)) * 0.045 * k;
    B.feet.position.y += Math.max(0, Math.sin(ph)) * 0.02 * k;
    let sy = 1 + 0.025 * breath(s), rx = 0, puf = 0;
    let sw = Math.sin(s.t * 2.1 + s.ph) * 0.12 - Math.sin(ph) * 0.25 * k, swx = Math.sin(s.t * 1.7 + s.ph) * 0.08;
    B.armL.rotation.z = 0.1 + Math.sin(ph) * 0.3 * k; B.armR.rotation.z = -0.1 + Math.sin(ph) * 0.3 * k;
    if (st.windup >= 0) {   // geriye yaslan, çiçek titrer, toprak kabarır
      const w = sm(st.windup * 1.3);
      rx = -0.3 * w; sy *= 1 - 0.1 * w; b.position.x += Math.sin(s.t * 55) * 0.01 * st.windup;
      sw += Math.sin(s.t * 45) * 0.3 * w; puf = 0.5 * w;
      B.armL.rotation.z += 0.8 * w; B.armR.rotation.z -= 0.8 * w;
    }
    let rolling = false;
    if (st.attack >= 0) {
      if (st.attack < 1 && s.mv > 0.5) {   // yan yatıp tekerlek gibi yuvarlanır
        rolling = true;
        s.roll = (s.roll || 0) + dt * 13;
        b.rotation.set(s.roll, 0, PI / 2); b.position.y += 0.03;
        B.feet.scale.setScalar(0.0001); B.stem.scale.setScalar(0.35); B.armL.scale.setScalar(0.0001); B.armR.scale.setScalar(0.0001);
      } else {   // sersem: başı döner ama gülümser
        s.roll = 0; b.rotation.z += Math.sin(s.t * 9) * 0.16; sw += Math.sin(s.t * 7) * 0.6; s.eyeK = 1 + 0.2 * Math.sin(s.t * 9);
      }
    } else s.roll = 0;
    { const u = gag(s, st, dt, 2.4, 5);   // bekleme: çiçek pervane gibi döner, saksı havalanır gibi hoplar, toprak serpilir
      if (u >= 0) {
        const spin = sm(u / 0.7), hop = bumpU(u, 0.35, 0.7), land = bumpU(u, 0.7, 0.85);
        B.bloom.rotation.y = TAU * 3 * spin; sw *= 1 - bumpU(u, 0, 1);
        b.position.y += 0.16 * hop; sy *= 1 + 0.12 * hop - 0.15 * land; s.eyeK = 1 + 0.35 * hop;
        B.armL.rotation.z += 1.2 * hop; B.armR.rotation.z -= 1.2 * hop;
        puf = Math.max(puf, bumpU(u, 0.68, 1));
      }
    }
    if (!rolling) {
      b.rotation.x = rx;
      b.scale.set(1 - (sy - 1) * 0.5, sy, 1 - (sy - 1) * 0.5);
    }
    B.stem.rotation.z = sw; B.stem.rotation.x = swx;
    if (puf > 0.01 && !rolling) { B.puf.scale.setScalar(0.4 + 0.8 * puf); B.puf.position.y += 0.1 * puf; } else B.puf.scale.setScalar(0.0001);
    if (!rolling) boing(s, st, dt, b);
  }

  // ════════════════ MANDAL ════════════════
  // Tahta çamaşır mandalı: iki tombul tahta yarım, ortada parlak gümüş yay; üst yarımlar ağzı gibi açılıp kapanır. Ön yarımında
  // kocaman gözler, altta boyalı minik kalp; yay telinden kolları ve beyaz eldivenleri, altında ayakkabıları var.
  // Çenesini açıp kapayarak zıplar ("çıt çıt"). Hazırlık: çömelip çenesini kocaman açar, titrer; saldırı: zıplayıp "çat!" kapatır.
  // Bekleme: kocaman esner, çenesi "çıt" diye kapanınca kendi de şaşırıp hoplar. Elit: pembe boyalı, altın yaylı, taçlı.
  function buildMandal(r, o) {
    const E = o.elite, out = new THREE.Color();
    const wA = col(E ? '#ffa8cc' : '#ffd860'), wB = col(E ? '#f07aac' : '#f0a830');
    const wood = (x, y, z) => out.copy(wA).lerp(wB, 0.3 * (0.5 + 0.5 * Math.sin(y * 34 + x * 9 + 3 * K.fbm3(x * 5, y * 2, z * 5))) + 0.35 * sm((0.3 - y) / 0.25));
    const metal = E ? '#ffcf4a' : '#d4d8e4';
    r.bone('hips', 'root', [0, 0, 0]);
    r.bone('jawF', 'hips', [0, 0.47, 0.006]); r.bone('jawB', 'hips', [0, 0.47, -0.006]);
    r.bone('armL', 'hips', [0.13, 0.47, 0]); r.bone('armR', 'hips', [-0.13, 0.47, 0]);
    r.bone('feet', 'root', [0, 0.03, 0]);
    // alt yarımlar (sap kısmı), üst yarımlar (çene)
    r.on('hips').fx(0, E ? 0.7 : 0.3);
    for (const sd of [-1, 1]) r.add(sbox(0.28, 0.42, 0.09, 0.045, 3), wood, [0, 0.27, sd * 0.051]);
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'jawF' : 'jawB').fx(0, E ? 0.7 : 0.3);
      r.add(sbox(0.28, 0.52, 0.09, 0.045, 3), wood, [0, 0.72, sd * 0.051]);
      // çene ucundaki yumuşak tutma çıkıntıları (iç yüzde)
      r.fx(0, 0.3);
      for (let k = 0; k < 3; k++) r.add(G.rbox(2), mixc(wA, '#ffffff', 0.25), [0, 0.88 + k * 0.03, sd * 0.004], null, [0.25, 0.012, 0.01]);
      r.fx(0, 0);
    }
    // gümüş yay: sarmal halkalar + iki kolu
    r.on('hips').fx(0, 1.6);
    for (let i = 0; i < 6; i++) r.add(G.torus(TAU, 0.24, 16), metal, [-0.1 + i * 0.04, 0.47, 0], [0, PI / 2, 0], [0.07, 0.07, 0.07]);   // (yay iki yarımın arasında)
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) r.add(G.torus(TAU, 0.3, 16), metal, [sd * (0.15 + i * 0.022), 0.47, 0], [0, PI / 2, 0], [0.05, 0.05, 0.05]);   // yanlardan taşan yay uçları
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.5), [0.17, 0.5, 0.04], null, [0.02, 0.008, 0.008]);
    r.fx(0, 0);
    // altta boyalı minik kalp
    r.on('hips').fx(0, 0.5).add(K.heartGeo(), E ? '#ffffff' : '#ff5a7a', [0.02, 0.2, 0.097], null, [0.05, 0.05, 0.02]);
    r.fx(0, 0);
    // yay telinden kollar + beyaz eldivenler
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 1.2);
      r.seg([0.19 * sd, 0.47, 0], [0.24 * sd, 0.36, 0.04], 0.014, metal, 0.013, 6);
      r.fx(0, 0); mitt(r, [0.245 * sd, 0.34, 0.05], 0.05);
    }
    // ayakkabılar
    r.on('feet');
    for (const sd of [-1, 1]) shoe(r, 0.075 * sd, 0.035, 0.03, 0.06, 0.04, 0.09, E ? '#8a6aff' : '#ff5a5f');
    // yüz: ön çenenin düz yüzünde (arkadaki büyük küre yöntemi)
    K.face(r, [0, 0.69, 0.097 - 0.7], 0.7, yuz({ bone: 'jawF', tilt: 0.0, ex: 0.064, ey: 0.01, er: 0.056, inset: 0.004, iris: '#3a2412', skin: wA, browCol: E ? '#a03a6a' : '#6a3a14', browY: 1.38,
      mouthY: -0.09, mouthW: 0.07, noHearts: true, blushCol: '#ff7fa8' }));
    hearts(r, [[0.22, 0.98, 0.12, 0.065], [-0.2, 1.03, 0.12, 0.055]]);
    if (E) K.crown(r.on('jawF'), [0, 0.98, 0.0], 0.45);
    r.on('jawF').mark('muzzle', [0, 0.85, 0.12]);
    return { height: 1.02, glowC: col(E ? '#ff9ad0' : '#ffd090'),
      mat: { rough: E ? 0.35 : 0.55, rim: '#fff0dc', rimK: 0.3, rimP: 2.3 } };
  }
  function animMandal(m, dt, st, s) {
    const B = m.B, g = hopGait(s, st, dt, 2.3, 0.2);
    let y = g.y, sy = g.sy * (1 + 0.02 * breath(s, 3)), sxz = g.sxz, rx = 0;
    let j = 0.06 + 0.3 * g.air + 0.03 * Math.max(0, Math.sin(s.t * 2.2 + s.ph));   // çıt çıt
    let arm = 0.25 + 0.9 * g.air;
    if (st.windup >= 0) {   // çömel, çeneyi kocaman aç, titre
      const w = sm(st.windup * 1.4);
      sy *= 1 - 0.16 * w; sxz *= 1 + 0.08 * w; j = lerp(j, 0.62, w) + Math.sin(s.t * 40) * 0.04 * w; rx = -0.15 * w; arm += 0.6 * w;
      B.hips.position.x += Math.sin(s.t * 55) * 0.01 * st.windup;
    }
    if (st.attack >= 0) {
      const a = st.attack;
      if (a < 1) { const kk = Math.sin(PI * a); j = 0.62 * (1 - sm(a / 0.55)); rx = 0.35 * kk; sy *= 1 + 0.15 * kk; arm += 0.5 * kk; }
      else { j = 0.02; sy *= 0.9; sxz *= 1.06; }   // "çat!" kapandı
    }
    { const u = gag(s, st, dt, 2.4, 5);   // bekleme: kocaman esner, çıt diye kapanır, kendi şaşırıp hoplar
      if (u >= 0) {
        const yawn = sm(u / 0.45) * (1 - sm((u - 0.55) / 0.06)), hop = bumpU(u, 0.6, 0.85);
        j = Math.max(j, 0.7 * yawn); rx -= 0.2 * yawn; s.eyeK = lerp(1, 0.2, yawn) + 0.4 * hop;
        y += 0.14 * hop; arm += 1.0 * hop + 0.4 * yawn;
      }
    }
    B.jawF.rotation.x = j; B.jawB.rotation.x = -j;
    B.hips.position.y += y; B.hips.scale.set(sxz, sy, sxz); B.hips.rotation.x = rx;
    B.hips.rotation.z = Math.sin(s.t * 1.6 + s.ph) * 0.05;
    B.armL.rotation.z = arm; B.armR.rotation.z = -arm;
    B.feet.position.y += y * 0.85; B.feet.rotation.x = -0.3 * g.air;
    boing(s, st, dt, B.hips);
  }

  // ════════════════ SULAMA KABICIK ════════════════
  // Tombul mavi sulama kabı: üstünde kulp, arkada doldurma ağzı, sağdan öne uzanan ince boru ve delikli fıskiye başı; altta krem
  // boyalı çiçekli kuşak, tek kolunda beyaz eldiven, turuncu ayakkabılar. Hazırlık: geriye yaslanıp şişer, fıskiyenin ucunda damla
  // büyür; saldırı: "fış!" su damlası atar (uzaktan). Bekleme: borusunu başının üstüne kaldırıp kendini sular, titreyip kıkırdar.
  const CAN_P = [[0, 0], [0.22, 0], [0.245, 0.02], [0.26, 0.1], [0.262, 0.28], [0.245, 0.38], [0.2, 0.45], [0.12, 0.49], [0, 0.5]];
  const SP0 = [-0.2, 0.18, 0.1], SP1 = [-0.44, 0.47, 0.36];
  function buildSulama(r, o) {
    const E = o.elite, out = new THREE.Color();
    const c0 = col(E ? '#7fd88a' : '#4faee8'), cL = col(E ? '#c8f5b0' : '#a6dcff'), cD = col(E ? '#3f9a54' : '#2c78c0');
    r.bone('body', 'root', [0, 0.06, 0]);
    r.bone('spout', 'body', [SP0[0], SP0[1] + 0.04, SP0[2]]);
    r.bone('jet', 'spout', [SP1[0], SP1[1] + 0.04, SP1[2]]);
    r.bone('drip', 'body', [0, 0.85, 0.02]);
    r.bone('armL', 'body', [0.25, 0.3, 0.02]);
    r.bone('feet', 'root', [0, 0.03, 0.04]);
    const canC = (x, y, z) => {
      out.copy(cD).lerp(c0, sm((y - 0.05) / 0.2)).lerp(cL, 0.45 * sm((y - 0.4) / 0.15));
      const band = sm((y - 0.085) / 0.012) * (1 - sm((y - 0.145) / 0.012));   // krem kuşak
      if (band > 0) {
        out.lerp(col('#fff4dc'), band);
        const a = Math.atan2(x, z), f = ((a / TAU * 14) % 1 + 1) % 1, dd = Math.hypot((f - 0.5) * 0.12, y - 0.155);
        out.lerp(col(Math.floor(a / TAU * 14 + 20) & 1 ? '#ff7aa8' : '#ffc23a'), sm((0.02 - dd) / 0.006) * band);
      }
      return out;
    };
    r.on('body').fx(0, 0.9).add(K.lathe('bkCan', CAN_P, 40, 4), canC, [0, 0.04, 0]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.4), [-0.16, 0.42, 0.17], [0.3, -0.6, 0.3], [0.03, 0.09, 0.01]);
    // doldurma ağzı (arka üstte) + kulp
    r.fx(0, 0.9).add(G.cyl(1, 1.1, 20), c0, [0, 0.53, -0.1], [-0.35, 0, 0], [0.085, 0.06, 0.085]);
    r.add(G.torus(TAU, 0.28, 20), cL, [0, 0.565, -0.115], [PI / 2 - 0.35, 0, 0], [0.09, 0.09, 0.07]);
    r.fx(0, 0).add(G.cyl(1, 1, 16), '#1c3a5a', [0, 0.57, -0.112], [-0.35, 0, 0], [0.065, 0.01, 0.065]);
    r.fx(0, 0.9).add(G.torus(PI, 0.16, 26), c0, [0, 0.47, -0.04], [-0.35, 0, 0], [0.17, 0.2, 0.2]);
    // boru + fıskiye başı (delikli)
    r.on('spout').fx(0, 0.9);
    const p0 = [SP0[0], SP0[1] + 0.04, SP0[2]], p1 = [SP1[0], SP1[1] + 0.04, SP1[2]];
    r.seg(p0, p1, 0.05, c0, 0.032, 12);
    const d = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize(), q = K.qy(d.x, d.y, d.z);
    const at = t => [p1[0] + d.x * t, p1[1] + d.y * t, p1[2] + d.z * t];
    r.add(G.cyl(1, 0.45, 20), cL, at(0.035), q, [0.075, 0.07, 0.075]);
    r.add(G.cyl(1, 1, 20), mixc(cL, '#ffffff', 0.3), at(0.075), q, [0.078, 0.012, 0.078]);
    const u = new THREE.Vector3(1, 0, 0).cross(d).normalize(), v = d.clone().cross(u).normalize();
    r.fx(0, 0.2);
    for (let i = 0; i < 7; i++) {
      const a = i / 6 * TAU, rr = i ? 0.045 : 0, c = at(0.082);
      r.add(G.sphere(6, 4), '#1c3a5a', [c[0] + (u.x * Math.cos(a) + v.x * Math.sin(a)) * rr, c[1] + (u.y * Math.cos(a) + v.y * Math.sin(a)) * rr, c[2] + (u.z * Math.cos(a) + v.z * Math.sin(a)) * rr], q, [0.011, 0.004, 0.011]);
    }
    r.fx(0, 0);
    // fıskiye ucundaki damla (hazırlıkta büyür)
    r.on('jet').fx(0.25, 1.2).add(G.sphere(14, 10), hdr('#8fd8ff', 1.05), at(0.13), null, [0.05, 0.06, 0.05]);
    r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.6), at(0.15), null, 0.012);
    // kendini sularken başına düşen damlalar
    r.on('drip').fx(0.25, 1.2);
    for (let i = 0; i < 6; i++) r.add(G.sphere(10, 8), hdr('#9fdcff', 1.05), [(hash(i, 2, 3) - 0.5) * 0.3, 0.62 + i * 0.05, (hash(i, 5, 1) - 0.5) * 0.2 + 0.03], null, [0.028, 0.04, 0.028]);
    r.fx(0, 0);
    // tek kol + eldiven, ayakkabılar
    r.on('armL').fx(0, 0.9).seg([0.25, 0.3, 0.02], [0.33, 0.2, 0.07], 0.03, c0, 0.026, 8);
    r.fx(0, 0); mitt(r, [0.345, 0.18, 0.08], 0.05);
    r.on('feet');
    for (const sd of [-1, 1]) shoe(r, 0.11 * sd, 0.03, 0.05, 0.065, 0.04, 0.09, '#ff9a2e');
    // yüz
    r.on('body');
    K.face(r, [0, 0.29, 0], 0.27, yuz({ bone: 'body', tilt: 0.1, ex: 0.09, ey: 0.03, er: 0.078, iris: E ? '#2a6a2a' : '#1a4a8a', skin: c0, browCol: E ? '#2a5a2a' : '#1e4a7a', browY: 1.36,
      mouthY: -0.092, mouthW: 0.085, heartY: 1.05, heartX: 1.25, blushCol: '#ff7fa6' }));
    if (E) K.crown(r.on('body'), [0.1, 0.6, 0.06], 0.45);
    r.on('jet').mark('muzzle', at(0.12));
    return { height: 0.85, glowC: col('#8fd8ff'), hide: ['jet', 'drip'],
      mat: { rough: 0.25, sss: col('#9ad8ff').multiplyScalar(0.03), rim: '#e8f6ff', rimK: 0.32, rimP: 2.3 } };
  }
  function animSulama(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 8), ph = s.walk;
    b.rotation.z = Math.sin(ph) * 0.12 * k + Math.sin(s.t * 1.3 + s.ph) * 0.03;
    b.position.y += Math.abs(Math.sin(ph)) * 0.04 * k;
    B.feet.position.y += Math.max(0, Math.sin(ph)) * 0.02 * k;
    let sy = 1 + 0.025 * breath(s), rx = 0, sp = Math.sin(s.t * 1.9 + s.ph) * 0.06, jet = 0, drip = -1;
    B.armL.rotation.z = 0.15 + Math.sin(ph) * 0.4 * k + 0.08 * breath(s);
    if (st.windup >= 0) {   // geriye yaslan, şiş, damla büyür
      const w = sm(st.windup * 1.3);
      rx = -0.25 * w; sy *= 1 + 0.1 * w; sp -= 0.15 * w; jet = w; b.position.x += Math.sin(s.t * 55) * 0.008 * st.windup;
      B.armL.rotation.z += 0.7 * w;
    }
    if (st.attack >= 0 && st.attack < 1) { const kk = Math.sin(PI * st.attack); rx = 0.25 * kk; sy *= 1 - 0.12 * kk; sp += 0.2 * kk; }
    { const u = gag(s, st, dt, 2.8, 5);   // bekleme: boruyu başının üstüne kaldırır, kendini sular, titreyip kıkırdar
      if (u >= 0) {
        const lift = sm(u / 0.3) * (1 - sm((u - 0.8) / 0.18));
        sp += -1.25 * lift; drip = u > 0.25 && u < 0.85 ? (u - 0.25) / 0.6 : -1;
        const shiv = bumpU(u, 0.45, 0.95);
        b.position.x += Math.sin(s.t * 50) * 0.01 * shiv; s.eyeK = 1 - 0.85 * bumpU(u, 0.3, 0.8); sy *= 1 + 0.05 * Math.sin(s.t * 30) * shiv;
        B.armL.rotation.z += 0.9 * shiv;
      }
    }
    B.spout.rotation.z = sp;
    b.rotation.x = rx; b.scale.set(1 - (sy - 1) * 0.5, sy, 1 - (sy - 1) * 0.5);
    B.jet.scale.setScalar(jet > 0.02 ? 0.3 + 0.9 * jet : 0.0001);
    if (drip >= 0) { B.drip.scale.setScalar(1); B.drip.position.y -= 0.35 * (drip * 3 % 1); } else B.drip.scale.setScalar(0.0001);
    boing(s, st, dt, b);
  }

  // ════════════════ BAHÇE ELDİVENİ ════════════════
  // Yeşil, beyaz-pembe çiçek desenli kumaş bahçe eldiveni; parmakları yukarıda (uçları koyu yeşil kauçuk), yanda başparmak,
  // altta sarı-turuncu çizgili kıvrık manşet, kahverengi çizmeler. Avucunda kocaman gözler. Yürürken parmakları dalgalanır.
  // Hazırlık: geriye yaslanıp parmaklarını açar, kıpır kıpır oynatır; saldırı: öne eğilip "pat!" diye dokunur. Bekleme: parmaklarını
  // tek tek kapatarak sayar, sonra hepsini açıp başparmağını kaldırır ("süper!").
  const GF = [[-0.135, 0.19], [-0.045, 0.24], [0.045, 0.23], [0.135, 0.18]];
  function buildEldiven(r, o) {
    const E = o.elite, out = new THREE.Color();
    const g0 = col(E ? '#ff9ac4' : '#6cc46a'), gL = col(E ? '#ffd0e4' : '#a8e88a'), gD = col(E ? '#d0608e' : '#3f9a46');
    r.bone('hips', 'root', [0, 0.08, 0]);
    r.bone('body', 'hips', [0, 0.26, 0]);
    for (let i = 0; i < 4; i++) r.bone('f' + i, 'body', [GF[i][0], 0.64, 0]);
    r.bone('thumb', 'body', [0.19, 0.42, 0.01]);
    r.bone('feet', 'root', [0, 0.03, 0.03]);
    const fabric = (x, y, z) => {
      out.copy(gD).lerp(g0, sm((y - 0.25) / 0.2)).lerp(gL, 0.25 * sm((y - 0.6) / 0.3));
      const face = z > 0 && Math.abs(x) < 0.17 && y > 0.3 && y < 0.6;
      if (face) return out;
      const fx = x * 13 + (Math.floor(y * 13) & 1) * 0.5, fy = y * 13, dx = fx - Math.round(fx), dy = fy - Math.round(fy), dd = Math.hypot(dx, dy);
      const kind = (Math.round(fx) + Math.round(fy) * 3) & 1;
      return out.lerp(col(kind ? '#ffffff' : '#ff9ab8'), sm((0.2 - dd) / 0.05) * 0.9);
    };
    // avuç (yumuşak kutu)
    r.on('body').fx(0, 0.15, 1, 0).add(sbox(0.4, 0.42, 0.16, 0.075, 3), fabric, [0, 0.45, 0]);
    // dikiş çizgisi (kenar boyunca)
    r.fx(0, 0.2, 0, 0);
    for (let i = 0; i < 11; i++) { const t = i / 10; r.add(G.sphere(6, 4), mixc(gD, '#ffffff', 0.4), [-0.17 + 0.34 * t, 0.26, 0.082], null, [0.012, 0.004, 0.003]); }
    // parmaklar (uçları kauçuk)
    for (let i = 0; i < 4; i++) {
      const [x, L] = GF[i], b0 = [x, 0.62, 0], t = [x * 1.12, 0.62 + L, 0];
      r.on('f' + i).fx(0, 0.15, 1, 0).seg(b0, t, 0.047, fabric, 0.044, 10);
      r.add(G.sphere(14, 10), fabric, b0, null, [0.047, 0.03, 0.047]);
      r.fx(0, 0.6, 0, 0).add(G.sphere(14, 10), K.vgrad(t[1] - 0.04, t[1] + 0.05, [[0, mixc(gD, '#1f5a24', 0.5)], [1, mixc(gD, '#4aa050', 0.3)]]), t, null, [0.047, 0.05, 0.046]);
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.1), [t[0] - 0.015, t[1] + 0.02, 0.035], null, [0.01, 0.014, 0.004]);
      r.fx(0, 0);
    }
    // başparmak
    r.on('thumb').fx(0, 0.15, 1, 0).seg([0.17, 0.42, 0.01], [0.29, 0.55, 0.05], 0.05, fabric, 0.045, 10);
    r.fx(0, 0.6, 0, 0).add(G.sphere(14, 10), mixc(gD, '#1f5a24', 0.4), [0.295, 0.56, 0.052], null, 0.047);
    r.fx(0, 0);
    // manşet: çizgili, kıvrık kenarlı
    const cuff = (x, y, z) => out.copy(col(E ? '#fff4c0' : '#ffd23a')).lerp(col(E ? '#ffb0d0' : '#ff9a2e'), Math.floor((y - 0.04) / 0.035) & 1 ? 0.85 : 0);
    r.on('hips').fx(0, 0.2, 1, 0).add(G.cyl(0.92, 1, 26), cuff, [0, 0.16, 0], null, [0.205, 0.2, 0.105]);
    r.add(G.torus(TAU, 0.3, 26), col(E ? '#fff4c0' : '#ffe680'), [0, 0.26, 0], [PI / 2, 0, 0], [0.198, 0.105, 0.11]);
    r.fx(0, 0).add(G.cyl(1, 1, 20), '#3a2a20', [0, 0.06, 0], null, [0.17, 0.008, 0.085]);
    // çizmeler
    r.on('feet');
    for (const sd of [-1, 1]) shoe(r, 0.1 * sd, 0.035, 0.04, 0.07, 0.045, 0.1, E ? '#8a5aff' : '#8a5a3a', 0.4);
    // yüz: avucun düz önünde
    K.face(r, [0, 0.45, 0.083 - 0.7], 0.7, yuz({ bone: 'body', tilt: 0.0, ex: 0.08, ey: 0.01, er: 0.066, inset: 0.004, iris: E ? '#7a2a5a' : '#24501a', skin: g0, browCol: E ? '#8a2a5a' : '#24501a', browY: 1.36,
      mouthY: -0.1, mouthW: 0.08, noHearts: true, blushCol: '#ff7fa8' }));
    hearts(r, [[0.3, 0.95, 0.12, 0.07], [-0.28, 1.0, 0.12, 0.06]]);
    if (E) K.crown(r.on('body'), [0, 0.98, -0.04], 0.5);
    r.on('body').mark('muzzle', [0, 0.55, 0.15]);
    return { height: 1.0, glowC: col(E ? '#ff9ad0' : '#9af08a'), tex: fabTex(2),
      mat: { rough: 0.85, sss: col('#c8ffb0').multiplyScalar(0.03), rim: '#f4ffe8', rimK: 0.32, rimP: 2.2 } };
  }
  function animEldiven(m, dt, st, s) {
    const B = m.B, k = walkPh(s, dt, 9), ph = s.walk;
    B.hips.position.y += Math.abs(Math.sin(ph)) * 0.05 * k + 0.008 * breath(s, 2.5);
    B.body.rotation.z = Math.sin(ph) * 0.1 * k + Math.sin(s.t * 1.5 + s.ph) * 0.04;
    B.feet.position.y += Math.max(0, Math.sin(ph)) * 0.025 * k;
    let rx = 0.05 * k, sp = 0, fold = [0, 0, 0, 0], curl = 0, thumbZ = -0.1 + 0.08 * breath(s), wig = 0.08;
    if (st.windup >= 0) {   // geriye yaslan, parmakları aç, kıpır kıpır
      const w = sm(st.windup * 1.4);
      rx = -0.4 * w; sp = w; wig = 0.08 + 0.25 * w; thumbZ -= 0.5 * w;
      B.hips.position.x += Math.sin(s.t * 55) * 0.008 * st.windup;
    }
    if (st.attack >= 0 && st.attack < 1) {   // "pat!"
      const a = st.attack, hit = sm(a / 0.28), back = sm((a - 0.45) / 0.55);
      rx = lerp(-0.4, 0.9, hit) * (1 - back); curl = 0.5 * hit * (1 - back); sp *= 1 - hit;
      B.hips.position.z += 0.08 * hit * (1 - back);
    }
    { const u = gag(s, st, dt, 3.2, 5.5);   // parmaklarını tek tek kapatarak sayar, sonra hepsini açıp "süper!"
      if (u >= 0) {
        for (let i = 0; i < 4; i++) fold[i] = sm((u - 0.08 - i * 0.13) / 0.08) * (1 - sm((u - 0.72) / 0.06));
        const yay = bumpU(u, 0.72, 1);
        thumbZ += 1.1 * yay; B.hips.position.y += 0.1 * bumpU(u, 0.74, 0.9); s.eyeK = 1 + 0.3 * yay; rx -= 0.15 * yay;
        B.body.rotation.y = 0.25 * Math.sin(u * 8) * (1 - yay) * sm(u / 0.1);
      }
    }
    for (let i = 0; i < 4; i++) {
      const f = B['f' + i];
      f.rotation.x = 1.25 * fold[i] + curl + Math.sin(s.t * 3 + i * 1.1 + s.ph) * 0.06 + Math.sin(ph + i * 0.8) * 0.25 * k;
      f.rotation.z = (i - 1.5) * 0.22 * sp + Math.sin(s.t * 26 + i * 1.7) * (wig - 0.08) * sp;
    }
    B.thumb.rotation.z = thumbZ; B.thumb.rotation.x = Math.sin(ph) * 0.2 * k;
    B.body.rotation.x = rx;
    boing(s, st, dt, B.body);
  }

  // ════════════════ BOSS: UYKUCU HORTUM ════════════════
  // ~2,6 m sarılı yeşil bahçe hortumu: üst üste sarılmış tombul hortum halkaları (üstlerinde sarı çizgi) gövdeyi yapar; üstünde
  // yuvarlak yeşil başta kocaman uykulu gülen gözler, mavi-beyaz çizgili ponponlu uyku şapkası, arkada kıvrık hortum "perçemi".
  // Sağ kolu hortumun ucu: önünde iki eliyle tuttuğu sarı fıskiye tabancası. Ayakları iki küçük hortum arabası tekerleği.
  // Faz tepkileri (base kefirdev): roar (gerinip kocaman esner), summon (fıskiyesini sallayıp zıplar), shake (yanakları şişer,
  // halkaları su dolup kabarır), geyser (fıskiyeden serin su püskürtür), slam (hop! yere iner, su dalgası), bubbles (su damlaları
  // atar), idle (ara sıra kocaman esneme; yarı candan sonra sık). Feza'yı görmeden: uyur (gözler kapalı, horlar, "z z z").
  const HK = { head: [0, 1.82, 0.12], HR: 0.68, rings: [[0.3, 0.98], [0.56, 1.03], [0.82, 0.99], [1.07, 0.88], [1.3, 0.7]] };
  const NZ0 = [-0.32, 0.86, 0.98], NZ1 = [-0.16, 0.92, 1.36];
  function zGeo() {
    return K.extrude('bkZ', () => { const s2 = new THREE.Shape(); s2.moveTo(-0.5, 0.5); s2.lineTo(0.5, 0.5); s2.lineTo(0.5, 0.3); s2.lineTo(-0.15, -0.3); s2.lineTo(0.5, -0.3); s2.lineTo(0.5, -0.5);
      s2.lineTo(-0.5, -0.5); s2.lineTo(-0.5, -0.3); s2.lineTo(0.15, 0.3); s2.lineTo(-0.5, 0.3); s2.lineTo(-0.5, 0.5); return s2; }, 0.18, 0.06, 2, 0.4);
  }
  function buildHortum(r, o) {
    const Gr = col('#4fc25a'), GrL = col('#9af08a'), GrD = col('#2a8a3e'), Y = col('#ffd84a'), out = new THREE.Color();
    const HC = HK.head, HR = HK.HR;
    r.bone('body', 'root', [0, 0.1, 0]);
    r.bone('head', 'body', [0, 1.5, 0.05]);
    r.bone('cheekL', 'head', [0.42, 1.66, 0.6]); r.bone('cheekR', 'head', [-0.42, 1.66, 0.6]);
    r.bone('cap', 'head', [0.05, 2.4, 0.05]);
    r.bone('loop', 'head', [0, 2.1, -0.5]);
    r.bone('ringA', 'body', [0, 0.9, 0]); r.bone('ringB', 'body', [0, 0.55, 0]);
    r.bone('armL', 'body', [0.82, 1.08, 0.2]); r.bone('armR', 'body', [-0.82, 1.08, 0.2]);
    r.bone('nozzle', 'armR', NZ0);
    r.bone('footL', 'root', [0.55, 0.2, 0.42]); r.bone('footR', 'root', [-0.55, 0.2, 0.42]);
    r.bone('tail', 'body', [0, 0.45, -0.9]);
    r.bone('spray', 'nozzle', NZ1);
    r.bone('drop', 'nozzle', NZ1);
    r.bone('zz', 'head', [0.55, 2.35, 0.2]);
    r.bone('yawn', 'head', [0, 1.55, 0.78]);
    // hortum rengi: üstte açık, altta koyu; tüpün tepesinde ince sarı çizgi
    const hoseC = (yc, tube) => (x, y, z) => {
      const ly = (y - yc) / tube;
      out.copy(GrD).lerp(Gr, sm((ly + 0.9) / 0.9)).lerp(GrL, 0.35 * sm((ly - 0.2) / 0.6));
      return out.lerp(Y, sm((ly - 0.72) / 0.04) * (1 - sm((ly - 0.86) / 0.04)));
    };
    // gövde: üst üste sarılı hortum halkaları (alttan üste) + içini dolduran koyu göbek
    r.on('body').fx(0, 0.4).add(G.sphere(24, 16), GrD, [0, 0.8, 0], null, [0.8, 0.62, 0.8]);
    HK.rings.forEach(([y, R], i) => {
      const tube = 0.15, bn = i === 2 ? 'ringA' : i === 1 ? 'ringB' : 'body';
      r.on(bn).fx(0, 0.75).add(G.torus(TAU, +(tube / R).toFixed(3), 40), hoseC(y, tube), [0, y, 0], [PI / 2, 0, 0.3 * i], [R, R, R]);
      r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.25), [-R * 0.55, y + tube * 0.75, R * 0.72], [0, -0.7, 0], [0.13, 0.02, 0.02]);
      r.fx(0, 0);
    });
    // arkada hortumun kıvrık kuyruğu (yerde bir halka)
    r.on('tail').fx(0, 0.75).add(G.torus(PI * 1.3, 0.3, 28), hoseC(0.45, 0.13), [0, 0.45, -1.02], [0, PI / 2, 0.4], [0.42, 0.42, 0.42]);
    r.fx(0, 0);
    // tekerlek ayaklar: koyu lastik + sarı jant
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'footL' : 'footR').fx(0, 0.5);
      r.add(G.torus(TAU, 0.42, 24), '#3a3a48', [0.55 * sd, 0.2, 0.42], [0, PI / 2, 0], [0.19, 0.19, 0.19]);
      r.fx(0, 1.2).add(G.cyl(1, 1, 20), '#ffc83a', [0.55 * sd, 0.2, 0.42], [0, 0, PI / 2], [0.13, 0.07, 0.13]);
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; r.add(G.sphere(8, 6), '#ff8a3a', [0.55 * sd + 0.04 * sd, 0.2 + Math.sin(a) * 0.075, 0.42 + Math.cos(a) * 0.075], null, 0.025); }
      r.fx(0, 0);
    }
    // sol kol: tombul hortum kolu + beyaz eldiven
    r.on('armL').fx(0, 0.75).seg([0.82, 1.08, 0.2], [1.08, 0.88, 0.42], 0.15, Gr, 0.13, 14);
    r.fx(0, 0); mitt(r, [1.12, 0.84, 0.5], 0.15);
    // sağ kol: hortumun ucu öne kıvrılıp fıskiye tabancasına bağlanır
    r.on('armR').fx(0, 0.75);
    r.seg([-0.82, 1.08, 0.2], [-1.02, 0.92, 0.55], 0.15, Gr, 0.13, 14);
    r.add(G.sphere(16, 12), Gr, [-1.02, 0.92, 0.55], null, 0.13);
    r.seg([-1.02, 0.92, 0.55], [-0.62, 0.84, 0.9], 0.13, Gr, 0.11, 14);
    r.add(G.sphere(16, 12), Gr, [-0.62, 0.84, 0.9], null, 0.11);
    r.seg([-0.62, 0.84, 0.9], NZ0, 0.11, Gr, 0.1, 12);
    r.fx(0, 0); mitt(r, [-0.62, 0.78, 1.02], 0.14);
    // fıskiye tabancası: sarı gövde, turuncu bilezik, delikli yuvarlak başlık
    r.on('nozzle').fx(0, 1.0);
    const dN = new THREE.Vector3(NZ1[0] - NZ0[0], NZ1[1] - NZ0[1], NZ1[2] - NZ0[2]).normalize(), qN = K.qy(dN.x, dN.y, dN.z);
    r.seg(NZ0, NZ1, 0.1, '#ffc83a', 0.085, 14);
    r.add(G.torus(TAU, 0.3, 20), '#ff8a3a', [NZ0[0] + dN.x * 0.08, NZ0[1] + dN.y * 0.08, NZ0[2] + dN.z * 0.08], K.qz(dN.x, dN.y, dN.z), [0.11, 0.11, 0.11]);
    r.add(G.cyl(1, 0.7, 24), '#ffd84a', [NZ1[0] + dN.x * 0.05, NZ1[1] + dN.y * 0.05, NZ1[2] + dN.z * 0.05], qN, [0.17, 0.1, 0.17]);
    r.fx(0, 0.3).add(G.cyl(1, 1, 24), '#ffe9a0', [NZ1[0] + dN.x * 0.1, NZ1[1] + dN.y * 0.1, NZ1[2] + dN.z * 0.1], qN, [0.165, 0.01, 0.165]);
    { const u = new THREE.Vector3(1, 0, 0).cross(dN).normalize(), v = dN.clone().cross(u).normalize(), c = [NZ1[0] + dN.x * 0.108, NZ1[1] + dN.y * 0.108, NZ1[2] + dN.z * 0.108];
      for (let i = 0; i < 13; i++) { const a = i < 1 ? 0 : (i - 1) / 12 * TAU * (i > 6 ? 1 : 1), rr = i < 1 ? 0 : i < 7 ? 0.06 : 0.12, aa = i < 7 ? a : a + 0.26;
        r.add(G.sphere(6, 4), '#2a4a2a', [c[0] + (u.x * Math.cos(aa) + v.x * Math.sin(aa)) * rr, c[1] + (u.y * Math.cos(aa) + v.y * Math.sin(aa)) * rr, c[2] + (u.z * Math.cos(aa) + v.z * Math.sin(aa)) * rr], qN, [0.018, 0.006, 0.018]); } }
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.5), [NZ0[0] - 0.05, NZ0[1] + 0.09, NZ0[2] + 0.2], null, [0.02, 0.012, 0.08]);
    r.fx(0, 0);
    // baş: yuvarlak yeşil (hortum kauçuğu); yanaklar ayrı kemikte (şişer)
    const hg = K.vgrad(HC[1] - HR, HC[1] + HR, [[0, GrD], [0.45, Gr], [1, GrL]]);
    r.on('head').fx(0, 0.6).add(G.sphere(40, 28), hg, HC, null, [HR, HR * 0.95, HR * 0.93]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.2), [-0.3, 2.22, 0.4], [0.5, -0.5, 0.3], [0.14, 0.04, 0.02]);
    r.fx(0, 0);
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'cheekL' : 'cheekR').fx(0, 0.5).add(G.sphere(18, 12), mixc(Gr, GrL, 0.35), [0.42 * sd, 1.66, 0.58], null, [0.2, 0.16, 0.13]);
      r.fx(0.35, 0).add(G.sphere(14, 8), '#ff8fb0', [0.44 * sd, 1.67, 0.7], [0, sd * 0.35, 0], [0.13, 0.08, 0.03]);
      r.fx(0, 0);
    }
    K.face(r, HC, HR, yuz({ bone: 'head', tilt: 0.12, ex: 0.24, ey: 0.06, er: 0.17, iris: '#2a5a8a', skin: mixc(Gr, GrL, 0.3), browCol: '#1f6a2e', browY: 1.4,
      mouthY: -0.24, mouthW: 0.17, mouthPivot: true, noBlush: true, heartY: 0.95, heartX: 1.2, heartS: 0.26, blushCol: '#ff8fb0' }));
    // uyku gözleri: huzurlu kapalı ◡ ◡ (uyurken / esnerken; açık gözler o an gizlenir)
    r.bone('sleepE', 'head', [0, HC[1] + 0.06, HC[2] + HR * 0.9]);
    r.on('sleepE').push(HC, [-0.12, 0, 0]);
    for (const sd of [-1, 1]) {
      const [p, q] = onSphere(sd * 0.24, 0.03, HR, -0.005); r.push(p, q);
      r.push([0, 0, 0], [0, 0, PI]); K.eyeClosed(r, { er: 0.15, happyCol: '#1f5a2a' }); r.pop();
      r.fx(0, 0.3).seg([sd * 0.13, -0.02, 0.01], [sd * 0.19, -0.07, 0.0], 0.012, '#1f5a2a', 0.008, 5);
      r.pop().fx(0, 0);
    }
    r.pop();
    // esneme ağzı: kocaman "O" (koyu iç, pembe dil) — yalnız esnerken görünür
    r.on('yawn').push(HC, [-0.12, 0, 0]);
    { const [p, q] = onSphere(0, -0.25, HR, 0.01); r.push(p, q);
      r.fx(0, 0.5).add(G.sphere(18, 12), '#6a1f3c', [0, 0, 0], null, [0.12, 0.15, 0.06]);
      r.add(G.sphere(14, 10), '#ff7fa4', [0, -0.08, 0.03], null, [0.08, 0.05, 0.04]);
      r.fx(0, 0.3).add(G.torus(TAU, 0.18, 20), mixc(Gr, '#ffb07a', 0.3), [0, 0, 0.01], null, [0.125, 0.155, 0.08]);
      r.pop().fx(0, 0); }
    r.pop();
    // arkada kıvrık hortum perçemi
    r.on('loop').fx(0, 0.75).add(G.torus(TAU, 0.3, 28), hoseC(2.15, 0.09), [0, 2.15, -0.5], [0.25, PI / 2, 0], [0.3, 0.3, 0.3]);
    r.fx(0, 0);
    // uyku şapkası: mavi-beyaz çizgili, yana sarkık, ucunda ponpon; kenarı pofuduk beyaz
    r.on('cap').push([0.05, 2.38, 0.06], [0.15, 0, -0.45]);
    const capC = (x, y, z) => out.copy(Math.floor((x * 0.6 + y) / 0.13) & 1 ? col('#7fb8ff') : col('#f4f8ff'));
    r.fx(0, 0.1, 1, 0).add(G.cone(24), capC, [0, 0.32, 0], null, [0.42, 0.66, 0.42]);
    r.fx(0, 0, 1, 1).add(G.torus(TAU, 0.32, 28), '#ffffff', [0, 0.0, 0], [PI / 2, 0, 0], [0.43, 0.43, 0.3]);
    r.add(G.sphere(14, 10), '#ffffff', [0.0, 0.68, 0], null, 0.12);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; r.add(G.sphere(8, 6), '#ffffff', [Math.sin(a) * 0.08, 0.68 + Math.cos(a) * 0.08, 0.02], null, 0.06); }
    r.pop().fx(0, 0);
    // su püskürtmesi (geyser'de fıskiyeden öne), su damlası (bubbles'ta), "z z z" (uyurken)
    r.on('spray').fx(0.3, 1.2, 0, 1);
    for (let i = 0; i < 26; i++) {
      const u = (i + 0.5) / 26, d = 0.15 + u * 2.0, sp = 0.06 + u * 0.7, a = i * 2.39996;
      const p = [NZ1[0] + Math.sin(a) * sp * hash(i, 2, 9), NZ1[1] + Math.cos(a) * sp * 0.6 * hash(i, 5, 3) - u * 0.45, NZ1[2] + d];
      r.add(G.sphere(10, 8), hdr(mixc('#bfe9ff', '#5ab8f0', hash(i, 7, 7)), 1.05), p, null, [0.06 + 0.07 * u, 0.08 + 0.1 * u, 0.06 + 0.07 * u]);
    }
    r.fx(1, 0);
    for (let i = 0; i < 10; i++) { const a = i * 1.7, u = (i + 0.5) / 10; r.add(G.octa(), hdr('#eaffff', 1.6), [NZ1[0] + Math.sin(a) * (0.1 + u * 0.5), NZ1[1] + Math.cos(a) * 0.25 * u, NZ1[2] + 0.2 + u * 1.7], [a, a, 0], 0.035); }
    r.on('drop').fx(0.25, 1.2).add(G.sphere(16, 12), hdr('#8fd8ff', 1.1), [NZ1[0] + dN.x * 0.25, NZ1[1] + dN.y * 0.25, NZ1[2] + dN.z * 0.25], null, [0.12, 0.14, 0.12]);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.6), [NZ1[0] + dN.x * 0.25 - 0.04, NZ1[1] + dN.y * 0.25 + 0.06, NZ1[2] + dN.z * 0.25 + 0.08], null, 0.025);
    r.on('zz').fx(0.6, 0);
    const zg = zGeo();
    r.add(zg, '#9ab8ff', [0.55, 2.45, 0.2], [0, 0, 0.15], 0.12);
    r.add(zg, '#b8ccff', [0.78, 2.7, 0.2], [0, 0, -0.1], 0.16);
    r.add(zg, '#d0deff', [1.05, 3.0, 0.2], [0, 0, 0.12], 0.21);
    r.fx(0, 0);
    r.on('spray').mark('muzzle', [NZ1[0] + dN.x * 0.15, NZ1[1] + dN.y * 0.15, NZ1[2] + dN.z * 0.15]);
    return { height: 2.6, glowC: col('#8fe8a0'), glowK: 0.6, dieHop: 0.1, hide: ['spray', 'drop', 'zz', 'yawn', 'sleepE'],
      portrait: { cx: 0, cy: 1.85, cz: 0.4, rad: 1.15 },
      mat: { rough: 0.4, sss: col('#b8ffb0').multiplyScalar(0.04), rim: '#eaffe0', rimK: 0.36, rimP: 2.1 } };
  }
  const bph = st => (st.dying >= 0 ? 'dying' : (st.phase || 'idle'));
  const bpt = st => clamp(+st.phaseT || 0, 0, 1);
  function bossHalf(m) {   // yarı candan az mı? (GAME.boss bu model ise)
    try { const b = typeof GAME !== 'undefined' && GAME && GAME.boss; if (b && b.m === m && b.maxHp) return b.hp < b.maxHp * 0.5; } catch (e) { /* yok say */ }
    return false;
  }
  function animHortum(m, dt, st, s) {
    const B = m.B, ph = bph(st), t = bpt(st), br = Math.sin(s.t * 1.6 + s.ph);
    let sy = 1 + 0.02 * br, sxz = 1 - 0.012 * br, y = 0, z = 0, rx = 0, rz = 0, ry = 0, armUp = 0, wave = 0, hopY = 0;
    let swell = 0, cheek = 0, yawn = 0, spray = 0, drop = 0, zz = 0, sleep = 0, dip = 0, headX = 0, headZ = 0, roll = 0;
    const calm = ph === 'idle' && !(st.move > 0.05);
    s.preK = damp(s.preK || 0, st.aggro === false && ph === 'idle' && !(st.move > 0.05) && !(st.dying >= 0) ? 1 : 0, 3, dt);
    const pre = s.preK;
    // yürüyüş: tekerlekler döner, gövde paytak sallanır
    s.wk = damp(s.wk || 0, ph === 'move' || (ph === 'idle' && st.move > 0.05) ? 1 : 0, 5, dt);
    if (s.wk > 0.01) s.walk += dt * 5 * s.wk;
    const wa = Math.sin(s.walk) * 0.06 * s.wk, wy = Math.abs(Math.sin(s.walk)) * 0.05 * s.wk;
    rz += wa; y += wy; roll += s.walk * 1.3;
    wave += Math.sin(s.walk) * 0.2 * s.wk;
    switch (ph) {
      case 'shake': {   // hazırlık: derin nefes, yanaklar şişer, halkalar su dolup kabarır, kıpır kıpır
        const k = sm(t / 0.3) * (1 - sm((t - 0.94) / 0.06)), f = 16 + 10 * t;
        cheek = sm(t / 0.7) * k; swell = k * (0.6 + 0.4 * t); sxz *= 1 + 0.06 * k * t; sy *= 1 + 0.03 * k;
        rz += Math.sin(s.t * f) * 0.03 * k; rx -= 0.1 * k; headX -= 0.12 * k;
        armUp = 0.2 * k; s.eyeK = lerp(1, 1.2, k); s.browY = 0.03 * k;
        if (B.mouth) B.mouth.scale.setScalar(Math.max(0.0001, 1 - 0.7 * k));
        break;
      }
      case 'geyser': {   // "fışşş": öne eğilip fıskiyeden serin su püskürtür (0.14–0.84), halkalar yavaşça söner
        const on = sm((t - 0.06) / 0.1) * (1 - sm((t - 0.84) / 0.12));
        cheek = (1 - sm((t - 0.1) / 0.75)) * 0.7; swell = 1 - sm((t - 0.1) / 0.75); spray = sm((t - 0.1) / 0.12) * (1 - sm((t - 0.8) / 0.12));
        rx += 0.18 * on; z += 0.1 * on; headX += 0.1 * on; sxz *= 1 - 0.04 * on; armUp = 0.12 * on;
        s.mouthO = on * 0.6; s.eyeK = lerp(1, 0.7, on);
        rz += Math.sin(s.t * 30) * 0.015 * on; dip = 0.3 * on;
        break;
      }
      case 'bubbles': {   // şişer, sonra beş su damlası atar (soldan sağa dönerek)
        const k = sm(t / 0.3) * (1 - sm((t - 0.88) / 0.12));
        sxz *= 1 + 0.04 * k; swell = 0.5 * k; rx -= 0.06 * k; ry = lerp(-0.34, 0.34, sm((t - 0.36) / 0.48)) * k; cheek = 0.4 * k;
        for (const c of [0.4, 0.5, 0.6, 0.7, 0.8]) {
          const p = bump(t - c + 0.02, 0.08); rx += 0.08 * p; sy *= 1 - 0.04 * p; s.mouthO = Math.max(s.mouthO, p * 0.5); cheek -= 0.3 * p;
          drop = Math.max(drop, bump(t - c + 0.07, 0.08)); dip += 0.6 * p;
        }
        if (t < 0.38) drop = Math.max(drop, sm(t / 0.3) * 0.6);
        armUp = 0.15 * k;
        break;
      }
      case 'slam': {   // çömel, büyük bir hop, 0.8'de "şlap!" diye iner (yerde su dalgası)
        if (t < 0.2) { const k = sm(t / 0.2); sy *= 1 - 0.18 * k; sxz *= 1 + 0.08 * k; armUp = 0.3 * k; swell = 0.4 * k; }
        else if (t < 0.8) {
          const u = (t - 0.2) / 0.6, e = Math.abs(Math.cos(PI * u));
          hopY = Math.sin(PI * u) * 1.3; sy *= 1 + 0.07 * e; sxz *= 1 - 0.04 * e; armUp = 0.4 + 0.6 * Math.sin(PI * u);
          wave = Math.sin(s.t * 20) * 0.5 * Math.sin(PI * u); s.eyeK = 1 + 0.2 * Math.sin(PI * u);
        } else { const u = (t - 0.8) / 0.2, k = Math.sin(PI * Math.min(1, u * 1.3)) * (1 - 0.5 * u); sy *= 1 - 0.2 * k; sxz *= 1 + 0.12 * k; s.eyeK = 1 - 0.4 * k; }
        break;
      }
      case 'summon': {   // fıskiyesini sallayarak üç kez zıplar: "mandallar, gelin!"
        const k = sm(t / 0.15) * (1 - sm((t - 0.85) / 0.15)), b = Math.abs(Math.sin(t * PI * 3));
        y += b * 0.28 * k; sy *= 1 + 0.06 * (b - 0.5) * k; armUp = k; wave = Math.sin(t * PI * 8) * k; dip = k * Math.sin(s.t * 12);
        s.mouthW = k;
        break;
      }
      case 'roar': {   // uyanış: gerinip kocaman esner (kollar havaya), sonra gözlerini ovuşturup gülümser
        const st2 = sm(t / 0.25) * (1 - sm((t - 0.75) / 0.2));
        yawn = bump(t - 0.1, 0.6); armUp = st2; sy *= 1 + 0.08 * st2; sxz *= 1 - 0.03 * st2; rx -= 0.12 * st2; headX -= 0.25 * yawn;
        s.eyeK = lerp(1, 0.25, yawn); zz = yawn * 0.8;
        const rub = bump(t - 0.7, 0.25); wave = Math.sin(s.t * 18) * 0.4 * rub; s.mouthW = Math.max(s.mouthW, sm((t - 0.82) / 0.1));
        break;
      }
      case 'blow': case 'hiccup': {   // (kefirdev'in kocaman baloncuğu / hıçkırığı: fıskiyeyi yukarı kaldırıp kendine yağmur yağdırır)
        const hk = bump((t * 3) % 1, 0.3);
        y += 0.15 * hk; s.mouthO = hk; s.eyeK = 1 + 0.2 * hk; armUp = Math.max(armUp, 0.8); spray = Math.max(spray, 0.35 * hk);
        break;
      }
      case 'dying': armUp = 0.9; wave = Math.sin(s.t * 10); swell = 0.2 * Math.abs(Math.sin(s.t * 6)); break;   // çok mutlu: el sallar, halkalar zıplar
    }
    // uyku (Feza'yı görmeden): gözler kapalı, derin horlama nefesi, baş öne düşer, şapka sarkar, "z z z"
    if (pre > 0.01) {
      sleep = pre;
      const sn = Math.sin(s.t * 1.3);
      sxz *= 1 + 0.04 * sn * pre; sy *= 1 + 0.03 * sn * pre; headX += 0.18 * pre; headZ += 0.08 * pre; swell = Math.max(swell, 0.3 * (0.5 + 0.5 * sn) * pre);
      s.eyeK = lerp(s.eyeK, 0.08, pre); zz = Math.max(zz, pre);
      if (B.mouth) B.mouth.scale.y *= 1 - 0.3 * pre * (0.5 + 0.5 * sn);
    }
    // bekleme: ara sıra kocaman esneme (yarı candan sonra daha sık); esnemeler arası göz kapakları ağır
    if (ph === 'idle' && pre < 0.05) {
      const half = bossHalf(m), drowsy = half ? 0.65 : 0.82;
      s.eyeK = Math.min(s.eyeK, drowsy + 0.05 * Math.sin(s.t * 0.7));
      const ya = act(s, 'yawnT', dt, half ? 3.5 : 7, half ? 6 : 12, 2.4, calm);
      if (ya >= 0) {
        const o = bump(ya - 0.1, 0.75);
        yawn = Math.max(yawn, o); armUp = Math.max(armUp, 0.8 * o); sy *= 1 + 0.07 * o; rx -= 0.1 * o; headX -= 0.25 * o; s.eyeK = lerp(s.eyeK, 0.12, o);
        zz = Math.max(zz, 0.7 * bump(ya - 0.5, 0.5)); headZ += Math.sin(ya * 6) * 0.06 * o;
      }
    }
    // hasar: gözler sıkılır, yanaklar titrer
    if (st.hurt > 0 && ph !== 'dying') { const h = st.hurt * st.hurt; s.eyeK = Math.min(s.eyeK, 1 - 0.5 * h); headZ += Math.sin(s.t * 40) * 0.05 * h; }
    // yarıda kesilen hop: yerçekimiyle iner
    if (ph === 'slam') { if (dt > 0) s.airV = clamp(((s.airY || 0) - hopY) / dt, -8, 8); s.airY = hopY; }
    else if (s.airY > 0) { s.airV = (s.airV || 0) + 16 * dt; s.airY = Math.max(0, s.airY - s.airV * dt); if (s.airY <= 0) { s.airV = 0; s.landT = 1; } }
    y += s.airY || 0;
    if (s.landT > 0) { const k = Math.sin(PI * (1 - s.landT)); sy *= 1 - 0.18 * k; sxz *= 1 + 0.1 * k; s.landT = Math.max(0, s.landT - dt / 0.3); }
    // uygula
    B.body.position.y += y; B.body.position.z += z;
    B.body.scale.set(sxz, sy, sxz); B.body.rotation.set(rx, ry, rz);
    B.footL.position.y += Math.max(0, y - wy); B.footR.position.y += Math.max(0, y - wy);
    B.footL.rotation.x = roll; B.footR.rotation.x = roll;
    B.head.rotation.x = headX + Math.sin(s.t * 1.1 + s.ph) * 0.03; B.head.rotation.z = headZ + Math.sin(s.t * 0.9 + s.ph) * 0.04;
    // halkalar: su dolunca kabarır, sırayla dalgalanır
    const rw = Math.sin(s.t * 2.2 + s.ph);
    B.ringA.scale.set(1 + 0.08 * swell + 0.01 * rw, 1 + 0.12 * swell, 1 + 0.08 * swell + 0.01 * rw);
    B.ringB.scale.set(1 + 0.06 * swell - 0.01 * rw, 1 + 0.1 * swell, 1 + 0.06 * swell - 0.01 * rw);
    const sw = Math.sin(s.t * 1.5 + s.ph) * 0.06;
    B.armL.rotation.z = 0.05 + sw + 1.5 * armUp + 0.3 * wave; B.armR.rotation.z = -(0.05 + sw + 0.5 * armUp - 0.15 * wave);
    B.armL.rotation.x = -0.3 * armUp; B.armR.rotation.x = -0.25 * armUp - 0.15 * dip;
    B.nozzle.rotation.x = -0.12 * dip;
    B.cap.rotation.z = -0.1 - 0.25 * sleep + Math.sin(s.t * 1.3) * 0.04 + 0.08 * wave; B.cap.rotation.x = 0.15 * sleep;
    B.loop.rotation.y = Math.sin(s.t * 1.7 + s.ph) * 0.15; B.loop.rotation.x = Math.sin(s.t * 1.2) * 0.06;
    B.tail.rotation.y = Math.sin(s.t * 2.4 + s.ph) * 0.15; B.tail.rotation.x = Math.sin(s.t * 1.7) * 0.06;
    const ch = Math.max(0, cheek);
    B.cheekL.scale.setScalar(1 + 0.75 * ch); B.cheekR.scale.setScalar(1 + 0.75 * ch);
    B.cheekL.position.x += 0.07 * ch; B.cheekR.position.x -= 0.07 * ch;
    if (s.mood === 'happy') yawn = 0;
    // (resetPose her karede ölçeği 1'e döndürür: gizli parçalar her karede yeniden gizlenir)
    if (yawn > 0.01) { B.yawn.scale.setScalar(0.3 + 0.7 * yawn); B.yawn.scale.y *= 0.6 + 0.6 * yawn; if (B.mouth) B.mouth.scale.setScalar(0.0001); }
    else B.yawn.scale.setScalar(0.0001);
    if (spray > 0.001) {
      const w = Math.sin(s.t * 13), w2 = Math.sin(s.t * 9.3 + 1);
      B.spray.scale.set(spray * (1 + 0.08 * w), spray * (1 + 0.08 * w2), Math.max(0.0001, spray * (1 + 0.06 * w2)));
      B.spray.rotation.z = s.t * 2.2;
    } else B.spray.scale.setScalar(0.0001);
    B.drop.scale.setScalar(drop > 0.01 ? drop : 0.0001);
    if (zz > 0.01 && s.mood !== 'happy') {
      const zt = (s.t * 0.5) % 1;
      B.zz.scale.setScalar(zz * (0.9 + 0.1 * Math.sin(s.t * 3))); B.zz.position.y += 0.15 * zt; B.zz.position.x += 0.05 * Math.sin(s.t * 2); B.zz.rotation.z = 0.08 * Math.sin(s.t * 1.7);
    } else B.zz.scale.setScalar(0.0001);
    // gözler neredeyse kapalıysa: huzurlu ◡ ◡ uyku gözleri, kaşlar yukarıda
    const shut = s.mood !== 'happy' ? sm((0.4 - s.eyeK) / 0.15) : 0;
    if (shut > 0.5) { s.eyeK = 0.0001; s.eyeW = 0.0001; s.browY = Math.max(s.browY, 0.02); B.sleepE.scale.setScalar(1); }
    else B.sleepE.scale.setScalar(0.0001);
  }

  // ════════════════ DİKENLİ GÜL (+ elit Kocaman Dikenli Gül, nadir Gökkuşağı Gül) ════════════════
  // Mint saksıda kök salmış iri gül: saksının altından çıkan iki tombul kökle paytak paytak yürür. İnce yeşil sapında YUMUŞAK,
  // ucu şeker gibi yuvarlak dikenler; iki yaprağı kolları. Başı kocaman pembe-kırmızı gül: yüzü ortada, çevresinde iki sıra taç
  // yaprağı, tepesinde kıvrık gül sarmalı. Hazırlık: geriye esner, taç yaprakları kabarır, ağzının önünde pembe diken topu büyür;
  // saldırı: öne fırlayıp topu atar (Feza'ya değince "pıt!" diye kalpler çıkar). Bekleme: taç yapraklarını açıp kapar, burnu
  // kaşınır, "hapşu!" — taç yaprakları uçuşur, kıkırdar. Elit: koyu pembe, lila saksılı, taçlı. Nadir: gökkuşağı yapraklı, inci saksı.
  const GUL_RB = ['#ff5a6a', '#ff9a3a', '#ffd84a', '#5ccf6a', '#4ab0ff', '#9a7aff', '#ff6fc0'];
  function potDots(potD, pot, potL, y0, h, dotY, n, dotCol) {   // saksı rengi: alttan koyu, kenar açık, boyalı benek kuşağı
    const out = new THREE.Color(), dc = Array.isArray(dotCol) ? dotCol.map(col) : [col(dotCol)];
    return (x, y, z) => {
      out.copy(potD).lerp(pot, sm((y - y0) / (h * 0.45))).lerp(potL, 0.4 * sm((y - y0 - h * 0.82) / (h * 0.12)));
      const a = Math.atan2(x, z), f = ((a / TAU * n) % 1 + 1) % 1, dd = Math.hypot((f - 0.5) * 0.11, y - dotY);
      const k = sm((0.019 - dd) / 0.005);
      if (k > 0) out.lerp(dc[(Math.floor(a / TAU * n + 40)) % dc.length], k);
      return out;
    };
  }
  function buildGul(r, o) {
    const E = o.elite, RB = o.rare;
    const pt = RB ? ['#fff0f8', '#ffffff', '#e8c8e0'] : E ? ['#c8a8f0', '#ece0ff', '#8a6ac8'] : ['#8fd8c0', '#d0f6e8', '#4a9e88'];
    const P0 = E ? '#d4185a' : '#ee3a62', P1 = E ? '#ff4f94' : '#ff7a9c', P2 = E ? '#ff9cc8' : '#ffb6c8';
    const pc = i => (RB ? GUL_RB[i % 7] : null);
    r.bone('body', 'root', [0, 0.1, 0]);
    r.bone('rootL', 'root', [0.07, 0.13, 0.02]); r.bone('rootR', 'root', [-0.07, 0.13, 0.02]);
    r.bone('stem', 'body', [0, 0.42, 0]);
    r.bone('leafL', 'stem', [0.02, 0.56, 0.01]); r.bone('leafR', 'stem', [-0.02, 0.5, 0.01]);
    r.bone('head', 'stem', [0, 0.74, 0.03]);
    r.bone('petals', 'head', [0, 0.86, 0]);
    r.bone('fly', 'head', [0, 0.86, 0.04]);
    r.bone('ammo', 'head', [0, 0.84, 0.27]);
    // saksı (Saksıcık'la aynı geometri, küçültülmüş) + toprak
    r.on('body').fx(0, RB ? 1.4 : 0.55).add(K.lathe('bkPot', POT_P, 40, 4), potDots(col(pt[2]), col(pt[0]), col(pt[1]), 0.1, 0.35, 0.3, 10, RB ? GUL_RB : E ? '#ffe680' : '#ffffff'), [0, 0.1, 0], null, 0.78);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', RB ? 1.5 : 1.15), [-0.11, 0.28, 0.12], [0, -0.7, 0], [0.02, 0.055, 0.008]);
    r.fx(0, 0.05).add(G.cyl(1, 1, 24), '#6a4028', [0, 0.428, 0], null, [0.172, 0.016, 0.172]);
    // kökler (bacak): saksının dibinden çıkar, uçları yuvarlak
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'rootL' : 'rootR').fx(0, 0.3);
      r.seg([0.06 * sd, 0.13, 0.02], [0.1 * sd, 0.05, 0.05], 0.03, '#9a6a40', 0.024, 8);
      r.add(G.sphere(12, 8), '#b07a4a', [0.11 * sd, 0.035, 0.07], null, [0.04, 0.032, 0.05]);
      r.seg([0.1 * sd, 0.05, 0.05], [0.15 * sd, 0.03, 0.02], 0.016, '#9a6a40', 0.01, 6);
    }
    r.fx(0, 0);
    // sap + yumuşak şeker dikenler
    r.on('stem').fx(0, 0.45);
    r.seg([0, 0.42, 0], [0, 0.6, 0.01], 0.026, '#4fa83e', 0.024, 10);
    r.seg([0, 0.6, 0.01], [0, 0.76, 0.03], 0.024, '#58b246', 0.022, 10);
    const TH = [[0.47, 1], [0.53, -1], [0.64, 1], [0.7, -1]];
    for (const [y, sd] of TH) {
      K.softSpike(r, [0.016 * sd, y, 0.01], [sd, 0.5, 0.35], 0.075, 0.022, '#78cc5c');
      r.fx(0, 0.8).add(G.sphere(8, 6), '#d8ffb8', [0.016 * sd + sd * 0.05, y + 0.027, 0.03], null, 0.012);
      r.fx(0, 0.45);
    }
    // yaprak kollar (damarlı)
    for (const sd of [-1, 1]) {
      const y = sd > 0 ? 0.57 : 0.51;
      r.on(sd > 0 ? 'leafL' : 'leafR').fx(0, 0.5);
      r.add(G.sphere(14, 8), K.vgrad(y - 0.04, y + 0.06, [[0, '#3f8a34'], [1, '#86d468']]), [0.1 * sd, y + 0.03, 0.02], [0, 0, sd * 0.4], [0.1, 0.024, 0.055]);
      r.fx(0, 0).add(G.sphere(6, 4), '#3a7a2c', [0.1 * sd, y + 0.05, 0.024], [0, 0, sd * 0.4], [0.075, 0.006, 0.008]);
    }
    // çanak yapraklar (başın altında)
    r.on('head').fx(0, 0.4);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3; r.add(G.sphere(10, 6), '#5cb84a', [Math.sin(a) * 0.08, 0.725, 0.03 + Math.cos(a) * 0.06], [0.35, a, 0], [0.034, 0.016, 0.085]); }
    // baş: yüz topu + iki sıra taç yaprağı + tepede gül sarmalı
    const C = [0, 0.86, 0.04], R = 0.17;
    r.fx(0, 0.45).add(G.sphere(26, 18), RB ? K.vgrad(0.72, 1.0, [[0, '#ffd0e8'], [1, '#fff4fb']]) : K.vgrad(0.72, 1.02, [[0, P1], [1, P2]]), C, null, R);
    r.on('petals').fx(0, 0.5);
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU, d = 0.195;
      r.add(G.sphere(14, 8), pc(i) || mixc(P0, P1, 0.25 * hash(i, 4, 2)), [Math.sin(a) * d, 0.86 + Math.cos(a) * d, -0.045], [0, 0, -a], [0.105, 0.13, 0.045]);
    }
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + 0.35, d = 0.165;
      r.add(G.sphere(14, 8), pc(i + 3) ? mixc(pc(i + 3), '#ffffff', 0.3) : mixc(P1, P2, 0.3 * hash(i, 9, 1)), [Math.sin(a) * d, 0.86 + Math.cos(a) * d, 0.0], [0, 0, -a], [0.085, 0.095, 0.04]);
    }
    r.on('head').fx(0, 0.5);
    r.add(G.sphere(16, 10), RB ? '#ff9ad0' : P0, [0, 1.0, 0.0], [0.25, 0, 0], [0.13, 0.065, 0.1]);
    r.add(G.sphere(12, 8), RB ? '#ffd84a' : mixc(P0, P1, 0.5), [0.055, 1.035, -0.01], [0, 0, -0.4], [0.07, 0.05, 0.065]);
    r.add(G.torus(PI * 1.6, 0.32, 18), RB ? '#9a7aff' : mixc(P0, '#a01040', 0.35), [-0.01, 1.05, 0.0], [PI / 2 - 0.3, 0, 0], [0.055, 0.055, 0.04]);
    r.fx(0, 0);
    // yüz
    K.face(r, C, R, yuz({ bone: 'head', tilt: 0.14, ex: 0.062, ey: 0.018, er: 0.054, iris: '#5a1a2a', skin: col(RB ? '#ffe0f0' : P2), browCol: '#a01a3a', browY: 1.34,
      mouthY: -0.066, mouthW: 0.062, noHearts: true, blushCol: '#ff4f7a' }));
    hearts(r, [[0.27, 1.06, 0.1, 0.065], [-0.25, 1.11, 0.1, 0.055]]);
    if (E) K.crown(r.on('head'), [0, 1.04, -0.02], 0.45);
    if (RB) glints(r.on('head'), [[0.22, 1.02, 0.12, 0.028], [-0.24, 0.72, 0.1, 0.022], [0.05, 1.12, 0.05, 0.02]]);
    // hapşırınca uçuşan taç yaprakları
    r.on('fly').fx(0, 0.5);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.3; r.add(G.sphere(10, 6), pc(i) || (i & 1 ? P1 : P2), [Math.sin(a) * 0.23, 0.86 + Math.cos(a) * 0.23, 0.1], [0.4, 0, -a], [0.05, 0.065, 0.02]); }
    // ağzın önünde büyüyen yumuşak diken topu
    r.on('ammo').fx(0.2, 0.8).add(G.sphere(14, 10), RB ? '#c89aff' : '#ff7aa8', [0, 0.84, 0.27], null, 0.055);
    for (let i = 0; i < 6; i++) { const [p] = K.onEll([0, 0.84, 0.27], [0.055, 0.055, 0.055], 0.6 + (i & 1) * 1.2, i * 1.05); r.add(G.sphere(8, 6), '#ffd8ea', p, null, 0.016); }
    r.fx(0, 0);
    r.on('head').mark('muzzle', [0, 0.84, 0.3]);
    return { height: 1.08, glowC: col(RB ? '#e0c0ff' : '#ff9ab8'), hide: ['fly', 'ammo'],
      mat: { rough: 0.45, sss: col('#ffb0c8').multiplyScalar(0.04), rim: RB ? '#fff4ff' : '#ffe8f0', rimK: 0.34, rimP: 2.3 } };
  }
  // Gülün attığı top Feza'ya değince: "pıt!" — kalpler (07_game'e dokunmadan: atış nesnesine onHit takılır)
  function pit(x, y, z) {
    try {
      if (typeof FX !== 'undefined' && FX) { if (FX.burst) FX.burst('hearts', x, y + 0.2, z, { count: 6, scale: 0.7 }); if (FX.floatText) FX.floatText(x, y + 0.7, z, 'pıt!', 'word'); }
      if (typeof AUD !== 'undefined' && AUD && AUD.sfx) AUD.sfx('pop', { x, z, pitch: 1.35, vol: 0.7 });
    } catch (err) { /* yok say */ }
  }
  function heartShot(m) {
    try {
      if (typeof GAME === 'undefined' || !GAME || !GAME.projectiles || !m.root) return;
      const R0 = m.root.position;
      for (const p of GAME.projectiles) {
        if (p.owner !== 'enemy' || p._gul || p.t > 0.3) continue;
        if ((p.x - R0.x) ** 2 + (p.z - R0.z) ** 2 > 4) continue;
        p._gul = 1; const h0 = p.onHit;
        p.onHit = (q, e, h) => { if (h0) h0(q, e, h); if (!e) pit(q.x, q.y, q.z); };
      }
    } catch (err) { /* yok say */ }
  }
  function animGul(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 7), ph = s.walk;
    const hop = Math.abs(Math.sin(ph)) * 0.05 * k;
    b.position.y += hop; b.rotation.z = Math.sin(ph) * 0.1 * k + Math.sin(s.t * 1.3 + s.ph) * 0.03;
    B.rootL.rotation.x = Math.sin(ph) * 0.6 * k; B.rootR.rotation.x = -Math.sin(ph) * 0.6 * k;
    B.rootL.position.y += hop * 0.6 + Math.max(0, Math.sin(ph)) * 0.03 * k; B.rootR.position.y += hop * 0.6 + Math.max(0, -Math.sin(ph)) * 0.03 * k;
    let sz = Math.sin(s.t * 1.8 + s.ph) * 0.06 - Math.sin(ph) * 0.1 * k, srx = 0.05 * k, hx = 0, hz = 0;
    let pet = 1 + 0.03 * breath(s), lf = 0.15 + Math.sin(ph) * 0.35 * k + 0.08 * breath(s, 2), ammo = 0, fly = -1, sy = 1;
    if (st.windup >= 0) {   // geriye esner, taç yaprakları kabarır, diken topu büyür
      const w = sm(st.windup * 1.2);
      srx -= 0.3 * w; hx -= 0.1 * w; pet += 0.14 * w; lf += 0.7 * w; ammo = w; sy *= 1 - 0.06 * w;
      b.position.x += Math.sin(s.t * 55) * 0.008 * st.windup;
    }
    if (st.attack >= 0 && st.attack < 1) { const kk = Math.sin(PI * st.attack); srx += 0.55 * kk; hx += 0.25 * kk; pet *= 1 - 0.12 * kk; lf -= 0.3 * kk; }
    if (st.attack >= 0) { if (!s.shotTag) { s.shotTag = 1; heartShot(m); } } else s.shotTag = 0;
    { const u = gag(s, st, dt, 3.4, 5.5);   // bekleme: taç yapraklarını açıp kapar, burnu kaşınır, hapşu! yapraklar uçuşur
      if (u >= 0) {
        const oc = u < 0.45 ? 0.5 - 0.5 * Math.cos(u / 0.45 * TAU * 2) : 0;
        pet += 0.32 * oc; s.eyeK = 1 + 0.25 * oc;
        const back = u < 0.66 ? sm((u - 0.48) / 0.16) : 0, sn = u >= 0.66 ? 1 - sm((u - 0.72) / 0.28) : 0;
        hx += -0.45 * back + 0.55 * sn; srx += -0.2 * back + 0.3 * sn; pet += 0.15 * back - 0.12 * sn;
        if (back > 0) s.eyeK = lerp(s.eyeK, 0.35, back);
        if (sn > 0.05) s.eyeK = 0.12;
        fly = u >= 0.66 ? (u - 0.66) / 0.34 : -1;
        const gig = bumpU(u, 0.78, 1);
        hz += Math.sin(s.t * 22) * 0.08 * gig; lf += 0.5 * gig;
      }
    }
    B.stem.rotation.z = sz; B.stem.rotation.x = srx;
    B.head.rotation.x = hx; B.head.rotation.z = hz - sz * 0.5 + Math.sin(s.t * 1.4 + s.ph) * 0.04;
    B.petals.scale.set(pet, pet, 1);
    B.leafL.rotation.z = lf; B.leafR.rotation.z = -lf;
    b.scale.set(1 - (sy - 1) * 0.5, sy, 1 - (sy - 1) * 0.5);
    B.ammo.scale.setScalar(ammo > 0.02 ? 0.3 + 0.8 * ammo : 0.0001);
    if (fly >= 0) { B.fly.scale.setScalar(1 + 1.7 * fly); B.fly.position.y += 0.3 * fly; B.fly.rotation.z = fly * 2.2; } else B.fly.scale.setScalar(0.0001);
    boing(s, st, dt, b);
  }

  // ════════════════ KAKTÜS ÇİÇEĞİ ve KAKTÜS ════════════════
  // Ortak: tombul yeşil kaktüs gövdesi (ince koyu oluklu), üstünde beyaz YUMUŞAK tüy demetleri (sivri değil), pastel saksı,
  // ayakkabılar. Saldırı: yerde önceden kırmızı halka belirir (07 'agir'), vuruşta halkadan yumuşak yeşil diken topları fışkırır.
  //   kaktusCicegi  yuvarlak fıçı kaktüs, tepesinde sarı çiçek, minik yan kolları; ara sıra takla atıp yuvarlanır; hazırlıkta
  //                 çömelip zıplar, "güm!" iner. Bekleme: kendi dikeniyle kaşınır, gıdıklanıp kıkırdar.
  //   kaktus        klasik uzun kaktüs: iki kolu yukarı kalkık, kocaman gülen yüz; kollarını sallayarak hoplar; hazırlıkta kollarını
  //                 açıp titrer, saldırıda kollarını savurup diken toplarını saçar. Bekleme: kollarıyla dans eder, gıdıklanıp güler.
  //                 Elit (Kocaman Kaktüs): pembe kurdeleli hasır şapka.
  function tuft(r, c, A, phi, th, s = 1) {   // yumuşak beyaz tüy demeti (elipsoid yüzeyinde)
    const [p, n] = K.onEll(c, A, phi, th);
    r.push(p, K.qz(n[0], n[1], n[2]));
    r.add(G.sphere(6, 4), '#fffaf0', [0, 0, 0.006 * s], null, 0.013 * s);
    for (let q = 0; q < 3; q++) { const b = q / 3 * TAU + th; r.add(G.sphere(6, 4), '#ffffff', [Math.cos(b) * 0.009 * s, Math.sin(b) * 0.009 * s, 0.02 * s], [Math.sin(b) * 0.5, -Math.cos(b) * 0.5, 0], [0.005 * s, 0.005 * s, 0.018 * s]); }
    r.pop();
  }
  function cactCol(y0, y1, cG, cL, cD, ribs = 8) {
    const out = new THREE.Color();
    return (x, y, z) => {
      const a = Math.atan2(x, z), rib = 0.5 + 0.5 * Math.cos(a * ribs + PI);
      return out.copy(cD).lerp(cG, sm((y - y0) / ((y1 - y0) * 0.35))).lerp(cL, 0.32 * sm((y - y1 + (y1 - y0) * 0.2) / ((y1 - y0) * 0.2))).lerp(cD, 0.3 * Math.pow(rib, 6));
    };
  }
  // vuruş halkası: zeminden fışkıran yumuşak diken topları. Her biri kendi kemiğinde, durağan hâlde halkanın ORTASINDA kurulur
  // (albüm resminin çerçevesi büyümesin); ringAnim kemikleri halkaya yayar. Normalde gizli.
  const RING_N = 12, RING_R = 1.3;
  const RING_HIDE = Array.from({ length: RING_N }, (_, i) => 'rg' + i);
  function spikeRing(r) {
    for (let i = 0; i < RING_N; i++) {
      const a = i / RING_N * TAU, b = 'rg' + i;
      r.bone(b, 'root', [0, 0, 0.4]);
      r.on(b).fx(0, 0.6);
      r.add(G.sphere(14, 10), i & 1 ? '#7ad86a' : '#5cc45a', [0, 0.08, 0.4], [Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25], [0.085, 0.17, 0.085]);   // tombul, yuvarlak uçlu
      r.add(G.sphere(10, 8), '#f4ffe0', [Math.sin(a) * 0.03, 0.235, 0.4 + Math.cos(a) * 0.03], null, 0.042);
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.2), [-0.03, 0.15, 0.46], null, [0.015, 0.03, 0.01]);
    }
    r.fx(0, 0);
  }
  function buildKaktusCicegi(r, o) {
    const E = o.elite;
    const cG = col('#5cc46a'), cL = col('#b0f090'), cD = col('#2a8248');
    r.bone('roll', 'root', [0, 0.45, 0]);
    r.bone('body', 'roll', [0, 0.06, 0]);
    r.bone('feet', 'body', [0, 0.03, 0.03]);
    r.bone('cact', 'body', [0, 0.4, 0]);
    r.bone('armL', 'cact', [0.17, 0.55, 0]); r.bone('armR', 'cact', [-0.17, 0.55, 0]);
    r.bone('flower', 'cact', [0, 0.86, 0]);
        r.on('body').fx(0, 0.6).add(K.lathe('bkPot', POT_P, 40, 4), potDots(col('#3f86c8'), col('#7cc8f0'), col('#c8eeff'), 0.06, 0.38, 0.27, 9, ['#ffffff', '#ff9ac0']), [0, 0.06, 0], null, 0.85);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.2), [-0.12, 0.27, 0.14], [0, -0.7, 0], [0.022, 0.06, 0.008]);
    r.fx(0, 0.05).add(G.cyl(1, 1, 24), '#6a4028', [0, 0.425, 0], null, [0.19, 0.016, 0.19]);
    r.on('feet');
    for (const sd of [-1, 1]) shoe(r, 0.085 * sd, 0.03, 0.05, 0.06, 0.04, 0.085, '#ff7aa8');
    const CC = [0, 0.62, 0], A = [0.205, 0.25, 0.195];
    r.on('cact').fx(0, 0.35).add(G.sphere(28, 20), cactCol(0.37, 0.87, cG, cL, cD), CC, null, A);
    for (let j = 0; j < 8; j++) {
      const th = (j + 0.5) / 8 * TAU, wth = Math.atan2(Math.sin(th), Math.cos(th));
      for (const phi of [0.35, 0.85, 1.4, 1.95]) { if (Math.abs(wth) < 0.95 && phi > 0.6 && phi < 2.2) continue; tuft(r, CC, A, phi, th); }
    }
    // minik yan kollar
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.35);
      r.add(G.sphere(16, 12), cG, [0.2 * sd, 0.55, 0], null, [0.06, 0.05, 0.055]);
      r.add(G.sphere(16, 12), K.vgrad(0.55, 0.72, [[0, '#4cb45c'], [1, '#a8ec8a']]), [0.245 * sd, 0.63, 0], [0, 0, -sd * 0.2], [0.052, 0.085, 0.052]);
      tuft(r, [0.25 * sd, 0.63, 0], [0.052, 0.085, 0.052], 0.2, 0, 0.9);
      tuft(r, [0.25 * sd, 0.63, 0], [0.052, 0.085, 0.052], 1.3, sd * 1.4, 0.9);
    }
    // tepede sarı çiçek
    r.on('flower').push([0, 0.865, 0.0], [-0.3, 0, 0]).fx(0, 0.5);
    for (let i = 0; i < 9; i++) { const b = i / 9 * TAU; r.add(G.sphere(12, 6), i & 1 ? '#ffe680' : '#ffd23a', [Math.sin(b) * 0.055, 0.006 * (i & 1), Math.cos(b) * 0.055], [0, b, 0], [0.032, 0.012, 0.062]); }
    r.add(G.sphere(14, 10), '#ff9a2e', [0, 0.012, 0], null, [0.032, 0.02, 0.032]);
    r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.2), [-0.01, 0.03, 0.01], null, 0.007);
    r.pop().fx(0, 0);
    r.on('cact');
    K.face(r, [0, 0.6, 0], 0.195, yuz({ bone: 'cact', tilt: 0.1, ex: 0.07, ey: 0.02, er: 0.062, iris: '#1e4a1a', skin: cG, browCol: '#1f5a24', browY: 1.34,
      mouthY: -0.075, mouthW: 0.07, noHearts: true, blushCol: '#ff7f9a' }));
    hearts(r, [[0.27, 0.98, 0.1, 0.065], [-0.25, 1.03, 0.1, 0.055]]);
    if (E) K.crown(r.on('flower'), [0, 0.9, -0.04], 0.4);
    r.on('cact').mark('muzzle', [0, 0.7, 0.25]);
    spikeRing(r);
    return { height: 0.95, glowC: col('#b8f08a'), hide: RING_HIDE,
      mat: { rough: 0.55, sss: col('#c8ffb0').multiplyScalar(0.03), rim: '#f0ffe0', rimK: 0.3, rimP: 2.3 } };
  }
  function ringAnim(B, st) {   // vuruş halkası: iner inmez zeminden fışkırıp geri çekilir
    const a = st.attack;
    const k = a > 0 && a < 1 ? Math.sin(PI * Math.min(1, a * 1.25)) : 0;
    for (let i = 0; i < RING_N; i++) {
      const bn = B['rg' + i], an = i / RING_N * TAU;
      if (k > 0.03) { bn.scale.set(1, k, 1); bn.position.x += Math.sin(an) * RING_R; bn.position.z += Math.cos(an) * RING_R; }
      else bn.scale.setScalar(0.0001);   // (k≈0 iken tamamen gizli: albüm resmi attack 0 ile çizilir)
    }
  }
  function animKaktusCicegi(m, dt, st, s) {
    const B = m.B, b = B.body, g = hopGait(s, st, dt, 2.2, 0.12);
    let y = g.y, sy = g.sy * (1 + 0.025 * breath(s)), sxz = g.sxz, rx = 0, rz = Math.sin(s.t * 1.5 + s.ph) * 0.04;
    let arm = 0.2 + 0.6 * g.air, scr = 0, fl = Math.sin(s.t * 2 + s.ph) * 0.1, puff = 1, flY = 0;
    // yürürken ara sıra takla atarak yuvarlanır
    const ro = act(s, 'rollT', dt, 2.5, 5, 0.75, st.move > 0.3 && st.windup < 0 && st.attack < 0 && !(st.dying >= 0));
    if (ro >= 0) { B.roll.rotation.x = TAU * sm(ro); B.roll.position.y += 0.25 * Math.sin(PI * ro); y = 0; sy = 1; sxz = 1; arm = 1.1; }
    if (st.windup >= 0) {   // çömel… zıpla… "güm!" (iniş = vuruş anı)
      const w = st.windup;
      if (w < 0.45) { const c = sm(w / 0.45); sy *= 1 - 0.25 * c; sxz *= 1 + 0.12 * c; arm = 0.2 + 0.5 * c; b.position.x += Math.sin(s.t * 55) * 0.01 * c; }
      else { const q = (w - 0.45) / 0.55, h = Math.sin(PI * q); y += 0.55 * h; sy *= 1 + 0.15 * h; sxz *= 1 - 0.06 * h; arm = 1.4; s.eyeK = 1.25; puff = 1 + 0.12 * sm(q); }
    }
    if (st.attack >= 0) { const a = st.attack, kk = Math.sin(PI * Math.min(1, a / 0.5)); sy *= 1 - 0.28 * kk; sxz *= 1 + 0.16 * kk; puff = 1 + 0.15 * kk; arm = 1.2 * (1 - a); }
    { const u = gag(s, st, dt, 3.0, 5);   // bekleme: kendi dikeniyle kaşınır, gıdıklanıp kıkırdar
      if (u >= 0) {
        const inn = sm(u / 0.15) * (1 - sm((u - 0.82) / 0.15)), gig = bumpU(u, 0.2, 0.95);
        scr = inn; s.eyeK = lerp(1, 0.12, gig); rz += Math.sin(s.t * 24) * 0.07 * gig; y += 0.03 * Math.abs(Math.sin(s.t * 12)) * gig;
        fl += Math.sin(s.t * 18) * 0.3 * gig; flY = gig * 3 * u; sy *= 1 + 0.04 * Math.sin(s.t * 24) * gig;
      }
    }
    b.position.y += y; b.scale.set(sxz, sy, sxz); b.rotation.x = rx; b.rotation.z = rz;
    B.cact.scale.setScalar(puff);
    B.armL.rotation.z = -arm; B.armR.rotation.z = arm + scr * (1.7 + 0.35 * Math.sin(s.t * 30));
    B.flower.rotation.z = fl; B.flower.rotation.y = flY;
    ringAnim(B, st);
    boing(s, st, dt, b);
  }
  // Klasik kaktüs: uzun tombul gövde, iki kolu yukarı kalkık (dirsekli)
  function buildKaktus(r, o) {
    const E = o.elite;
    const cG = col(E ? '#4fbf6a' : '#58c266'), cL = col('#b4f294'), cD = col('#26804a');
    r.bone('body', 'root', [0, 0.06, 0]);
    r.bone('feet', 'root', [0, 0.03, 0.03]);
    r.bone('cact', 'body', [0, 0.42, 0]);
    r.bone('armL', 'cact', [0.17, 0.66, 0]); r.bone('armR', 'cact', [-0.17, 0.58, 0]);
    r.bone('top', 'cact', [0, 1.08, 0]);
        r.on('body').fx(0, 0.6).add(K.lathe('bkPot', POT_P, 40, 4), potDots(col('#c8532e'), col('#ee8a5a'), col('#ffc8a0'), 0.06, 0.4, 0.28, 9, ['#ffffff', '#ffd23a']), [0, 0.06, 0], null, 0.9);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.15), [-0.13, 0.28, 0.15], [0, -0.7, 0], [0.022, 0.06, 0.008]);
    r.fx(0, 0.05).add(G.cyl(1, 1, 24), '#6a4028', [0, 0.445, 0], null, [0.2, 0.016, 0.2]);
    r.on('feet');
    for (const sd of [-1, 1]) shoe(r, 0.09 * sd, 0.03, 0.05, 0.062, 0.04, 0.088, E ? '#8a6aff' : '#ffb020');
    // gövde: uzun tombul elipsoid (yüz önde)
    const CC = [0, 0.76, 0], A = [0.19, 0.36, 0.18];
    r.on('cact').fx(0, 0.35).add(G.sphere(30, 22), cactCol(0.4, 1.12, cG, cL, cD), CC, null, A);
    for (let j = 0; j < 8; j++) {
      const th = (j + 0.5) / 8 * TAU, wth = Math.atan2(Math.sin(th), Math.cos(th));
      for (const phi of [0.3, 0.75, 1.2, 1.65, 2.1]) { if (Math.abs(wth) < 0.95 && phi > 0.55 && phi < 2.3) continue; tuft(r, CC, A, phi, th); }
    }
    // kollar: yana çıkıp dirsekten yukarı kalkar (sol yüksek, sağ alçak: klasik kaktüs)
    for (const sd of [-1, 1]) {
      const y0 = sd > 0 ? 0.66 : 0.58, ex = 0.29 * sd, up = sd > 0 ? 0.22 : 0.18;
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.35);
      r.seg([0.12 * sd, y0, 0], [ex, y0 + 0.01, 0], 0.062, cG, 0.058, 14);
      r.add(G.sphere(16, 12), cG, [ex, y0 + 0.01, 0], null, 0.058);
      r.seg([ex, y0 + 0.01, 0], [ex + 0.01 * sd, y0 + up, 0], 0.058, cG, 0.054, 14);
      r.add(G.sphere(16, 12), K.vgrad(y0 + up - 0.05, y0 + up + 0.06, [[0, '#58c266'], [1, '#b4f294']]), [ex + 0.01 * sd, y0 + up, 0], null, 0.055);
      const ac = [ex + 0.01 * sd, y0 + up * 0.55, 0], aa = [0.058, up * 0.6, 0.058];
      tuft(r, [ex + 0.01 * sd, y0 + up, 0], [0.055, 0.055, 0.055], 0.15, 0, 0.9);
      tuft(r, ac, aa, PI / 2, sd * PI / 2, 0.9); tuft(r, ac, aa, PI / 2, sd * 2.4, 0.9);
      tuft(r, [0.21 * sd, y0, 0], [0.09, 0.06, 0.06], 0.5, sd * 0.4, 0.85);
    }
    r.on('cact');
    K.face(r, [0, 0.74, 0], 0.18, yuz({ bone: 'cact', tilt: 0.08, ex: 0.07, ey: 0.03, er: 0.064, iris: '#1e4a1a', skin: cG, browCol: '#1f5a24', browY: 1.34,
      mouthY: -0.085, mouthW: 0.08, smileK: 1.7, noHearts: true, blushCol: '#ff7f9a' }));
    hearts(r, [[0.3, 1.16, 0.1, 0.07], [-0.28, 1.2, 0.1, 0.058]]);
    if (E) {   // pembe kurdeleli hasır şapka
      r.on('top').push([0, 1.1, -0.01], [-0.12, 0, 0.08]).fx(0, 0.25);
      const straw = (x, y, z) => mixc('#e8c060', '#fff0b0', 0.5 + 0.5 * Math.sin(Math.atan2(x, z) * 18 + y * 60));
      r.add(G.cyl(1, 1, 30), straw, [0, 0, 0], null, [0.27, 0.018, 0.27]);
      r.add(G.sphere(20, 12), straw, [0, 0.02, 0], null, [0.13, 0.11, 0.13]);
      r.fx(0, 0.5).add(G.cyl(1, 1, 24), '#ff5a9a', [0, 0.045, 0], null, [0.133, 0.03, 0.133]);
      r.add(G.sphere(10, 8), '#ff7ab0', [0.11, 0.05, 0.06], null, [0.035, 0.03, 0.02]);
      r.pop().fx(0, 0);
    } else {   // tepede minik pembe tomurcuk
      r.on('top').fx(0, 0.5).add(G.sphere(12, 8), '#ff8ab8', [0.02, 1.12, 0.02], null, [0.035, 0.03, 0.035]);
      r.fx(0, 0);
    }
    r.on('cact').mark('muzzle', [0, 0.85, 0.22]);
    spikeRing(r);
    return { height: 1.2, glowC: col('#b8f08a'), hide: RING_HIDE,
      mat: { rough: 0.55, sss: col('#c8ffb0').multiplyScalar(0.03), rim: '#f0ffe0', rimK: 0.3, rimP: 2.3 } };
  }
  function animKaktus(m, dt, st, s) {
    const B = m.B, b = B.body, g = hopGait(s, st, dt, 2.0, 0.1);
    let y = g.y, sy = g.sy * (1 + 0.025 * breath(s)), sxz = g.sxz, rz = Math.sin(s.t * 1.4 + s.ph) * 0.04, rx = 0;
    let wv = Math.sin(s.t * 2.2 + s.ph) * 0.12 + Math.sin(s.hop * TAU) * 0.35 * Math.min(1, s.mv * 2), open = 0, tilt = 0;
    if (st.windup >= 0) {   // kollarını açıp titrer, geriye yaslanır
      const w = sm(st.windup * 1.2);
      open = w; rx = -0.15 * w; sy *= 1 - 0.1 * w; b.position.x += Math.sin(s.t * 55) * 0.01 * st.windup; s.eyeK = 1 + 0.25 * w;
    }
    if (st.attack >= 0) { const a = st.attack, kk = Math.sin(PI * Math.min(1, a / 0.45)); open = 1 - sm(a); rx = 0.2 * kk; sy *= 1 + 0.08 * kk; y += 0.08 * kk; }
    { const u = gag(s, st, dt, 3.6, 5);   // bekleme: kollarıyla dans eder, sonra kendini gıdıklayıp güler
      if (u >= 0) {
        const d = bumpU(u, 0, 0.55), gig = bumpU(u, 0.55, 1);
        wv += Math.sin(u * 40) * 0.6 * d; tilt = Math.sin(u * 20) * 0.18 * d; y += 0.06 * Math.abs(Math.sin(u * 20)) * d;
        s.eyeK = lerp(1, 0.12, gig); rz += Math.sin(s.t * 24) * 0.06 * gig; open -= 0.9 * gig + 0.12 * Math.sin(s.t * 30) * gig;
      }
    }
    b.position.y += y; b.scale.set(sxz, sy, sxz); b.rotation.x = rx; b.rotation.z = rz + tilt;
    B.armL.rotation.z = wv - 0.6 * open; B.armR.rotation.z = -wv * 0.8 + 0.6 * open;   // açılınca kollar yana iner, sallanınca dalgalanır
    B.armL.rotation.x = -0.2 * open; B.armR.rotation.x = -0.2 * open;
    B.top.rotation.z = Math.sin(s.t * 2.4 + s.ph) * 0.06;
    ringAnim(B, st);
    boing(s, st, dt, b);
  }

  // ════════════════ Kayıt ════════════════
  const RARE_STATS = { hp: 14, dmg: 2, speed: 3.0, xp: 30, gold: 12, aggro: 7 };
  const T = [
    // id, ad, base, saldiri, stats, kurucu, anim, lod, ilkSoz, nadir
    ['saksicik', 'Saksıcık', 'goblin', 'yuvarlanan', { eliteAd: 'Kocaman Saksı', hp: 26, dmg: 5, speed: 2.3, r: 0.46, height: 0.95, atkRange: 2.4, atkCd: 2.3, windup: 0.85, aggro: 9, trailCol: '#c08a5a' }, buildSaksi, animSaksi, 0.55, 'ilk_saksicik'],
    ['sulamaKabi', 'Sulama Kabıcık', 'mantar', 'uzak', { eliteAd: 'Kocaman Sulama Kabı', hp: 18, dmg: 4, speed: 2.0, r: 0.45, height: 0.85, atkRange: 6.5, range: 6.5, atkCd: 2.8, windup: 0.9, aggro: 9, shot: { kind: 'bubble', speed: 3.6, r: 0.26, col: '#8fd8ff' } }, buildSulama, animSulama, 0.55, 'ilk_sulamaKabi'],
    ['mandal', 'Mandal', 'yogurt', 'ziplayan', { eliteAd: 'Kocaman Mandal', hp: 22, dmg: 4, speed: 2.5, r: 0.42, height: 1.02, atkRange: 2.4, atkCd: 2.0, windup: 0.75, aggro: 9 }, buildMandal, animMandal, 0.55, 'ilk_mandal'],
    ['eldiven', 'Bahçe Eldiveni', 'goblin', 'yakin', { eliteAd: 'Kocaman Eldiven', hp: 24, dmg: 4, speed: 2.6, r: 0.45, height: 1.0, atkRange: 1.1, atkCd: 1.9, windup: 0.8, aggro: 9 }, buildEldiven, animEldiven, 0.55, 'ilk_eldiven'],
    ['altinSaksi', 'Altın Saksı', 'goblin', 'yuvarlanan', Object.assign({ r: 0.46, height: 0.95, atkRange: 2.4, atkCd: 2.5, windup: 0.95, trailCol: '#ffd84a' }, RARE_STATS), (r, o) => buildSaksi(r, Object.assign({}, o, { rare: true })), animSaksi, 0.55, 'ilk_altinSaksi', true],
    // huysuz dikenli çiçekler (dikenler yumuşacık, uçları yuvarlak)
    ['dikenliGul', 'Dikenli Gül', 'mantar', 'uzak', { eliteAd: 'Kocaman Dikenli Gül', hp: 18, dmg: 4, speed: 2.0, r: 0.42, height: 1.08, atkRange: 6.0, range: 6.0, atkCd: 3.0, windup: 0.95, aggro: 9, shot: { kind: 'spore', speed: 3.4, r: 0.24, col: '#ff7aa8' } }, buildGul, animGul, 0.55, 'ilk_dikenliGul'],
    ['kaktusCicegi', 'Kaktüs Çiçeği', 'goblin', 'agir', { eliteAd: 'Kocaman Kaktüs Çiçeği', hp: 24, dmg: 5, speed: 2.1, r: 0.44, height: 0.95, atkRange: 1.5, atkCd: 2.8, windup: 1.05, slamR: 1.6, aggro: 9 }, buildKaktusCicegi, animKaktusCicegi, 0.55, 'ilk_kaktusCicegi'],
    ['kaktus', 'Kaktüs', 'goblin', 'agir', { eliteAd: 'Kocaman Kaktüs', hp: 24, dmg: 5, speed: 2.0, r: 0.44, height: 1.2, atkRange: 1.5, atkCd: 2.7, windup: 1.0, slamR: 1.6, aggro: 9 }, buildKaktus, animKaktus, 0.55, 'ilk_kaktus'],
    ['gokkusagiGul', 'Gökkuşağı Gül', 'mantar', 'uzak', Object.assign({ r: 0.42, height: 1.08, atkRange: 6.0, range: 6.0, atkCd: 3.2, windup: 1.0, shot: { kind: 'spore', speed: 3.2, r: 0.24, col: '#c89aff' } }, RARE_STATS), (r, o) => buildGul(r, Object.assign({}, o, { rare: true })), animGul, 0.55, 'ilk_gokkusagiGul', true],
  ];
  const RARE = {};
  for (const [id, ad, base, saldiri, stats, mk, an, lod, ilk, rare] of T) {
    const def = { ad, base, saldiri, stats, ilkSoz: ilk };
    if (rare) def.nadir = true;
    if (HAS) {
      EMODEL.addType(id, mk, an, lod);
      def.model = o => EMODEL.buildRaw(id, o || {});
    }
    if (rare) RARE[id] = true;
    HUYSUZ.type(id, def);
  }
  // Boss
  const bdef = { ad: 'Uykucu Hortum', base: 'kefirdev', stats: { r: 1.35, height: 2.6 },
    lines: { giris: 'uykucuHortum_giris', bitti: 'uykucuHortum_bitti', yarim: 'uykucuHortum_yarim' },
    bossKit: { add: 'mandal', at: [0.66, 0.33], n: [2, 2], col: '#8fd8ff', roar: 1.3 } };
  if (HAS) { EMODEL.addType('uykucuHortum', buildHortum, animHortum, 0.8); bdef.model = o => EMODEL.buildRaw('uykucuHortum', o || {}); }
  HUYSUZ.boss('uykucuHortum', bdef);
  HUYSUZ.zone('balkon', { enemies: { saksicik: 3, sulamaKabi: 3, mandal: 3, eldiven: 3, altinSaksi: 0.3, dikenliGul: 2.5, kaktusCicegi: 2.5, kaktus: 3, gokkusagiGul: 0.25 },
    elites: ['mandal', 'dikenliGul', 'kaktus'], boss: 'uykucuHortum' });
  // (Çiçek Tepesi'nde dikenli çiçekler daha sık, her alanda birkaç kaktüs: src/06z_balkon.js yerlesim)

  // Eski kayıtlardaki (ilk Balkon sürümünün) çıkartma adları yenilerine taşınır: albümde görünmez, kaybolmaz
  const ESKI = { bahceSalyangozu: 'saksicik', ugurBocegi: 'sulamaKabi', karinca: 'mandal', tirtil: 'eldiven', altinUgur: 'altinSaksi', ariKralice: 'uykucuHortum' };
  function tasi() {
    try {
      const C = GAME.P && GAME.P.cikartmalar; if (!C) return;
      for (const o in ESKI) if (C[o]) { if (!C[ESKI[o]]) C[ESKI[o]] = C[o]; delete C[o]; }
    } catch (err) { /* yok say */ }
  }
  // Nadir (Altın Saksı) neşelenince: "gizli" çıkartma + altın şeker + parıltı (konfetiyi 05h zaten saçar)
  let saidRare = 0;
  function hook() {
    if (typeof GAME === 'undefined' || !GAME || !GAME.on) { setTimeout(hook, 250); return; }
    tasi();
    GAME.on('zone', tasi);
    GAME.on('happy', e => {
      if (!e || !RARE[e.type] || e.boss) return;
      try {
        const P = GAME.P;
        if (P && P.cikartmalar && P.cikartmalar[e.type]) P.cikartmalar[e.type].tur = 'gizli';
        if (GAME.addGoldSugar) GAME.addGoldSugar(1);
        if (typeof FX !== 'undefined' && FX) {
          if (FX.burst) { FX.burst('confetti', e.x, 1.0, e.z, { scale: 1.4 }); FX.burst('sparkle', e.x, 1.2, e.z, { color: '#ffd84a', count: 20 }); }
          if (FX.floatText) FX.floatText(e.x, 1.9, e.z, '+1 altın şeker', 'word');
        }
        if (typeof AUD !== 'undefined' && AUD && AUD.say) AUD.say(saidRare++ % 2 ? 'nadir_yakalandi2' : 'nadir_yakalandi', { prio: 2 });
      } catch (err) { console.warn('[balkon] nadir', err); }
    });
  }
  hook();
})();
