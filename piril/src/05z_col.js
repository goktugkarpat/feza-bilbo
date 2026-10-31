/* ── Kum Saati Çölü: huysuzlar + boss (Feza ile Pırıl) ──
   Sahibi: COL bölüm ajanı. Biçim: PIRIL.md › 6 (HUYSUZ.type / HUYSUZ.boss / HUYSUZ.zone, boss hamleleri BOSSDAV.register).
   Hepsi SEVİMLİ: gülen / yaramaz yüz (EMODEL.KIT ortak yüzü: kızgın kaş yok), saldırıdan önce belli bir hazırlık, vurulunca
   "boing", neşelenince ^ ^ gözler + kalpler. Böcek yok.
     kumTopaci    Kum Topacı         pastel çizgili topaç; dönerek kayar gelir, hazırlanırken hızlanır (base cisdamlasi, 'kayan')
     kaktuscuk    Kaktüsçük          dikensiz, yumuşacık nane yeşili kaktüs; kollarını açıp sarılmaya gelir (base goblin, 'yakin');
                                     elit: Kocaman Kaktüsçük (çiçek taçlı)
     kumTavsani   Zıplayan Kum Tavşanı  kocaman kulaklı, uzun püsküllü kuyruklu çöl tavşancığı; yüksek zıplar (base yogurt, 'ziplayan')
     ruzgarGulu   Rüzgâr Gülü Topu   tepesinde dönen rüzgâr gülü olan tombul top; yanaklarını şişirip rüzgâr topu üfler (base mantar, 'uzak')
     altinTopac   Altın Topaç        nadir: neşelenince "gizli" çıkartma + altın şeker
     kocaBukalemun Renk Değiştiren Koca Bukalemun (boss): renkten renge geçer; kuma karışıp saklanır (göz kırpan parıltı ipucu,
                  Pırıl gösterir), bulununca kıkırdar ve sersemler; kuyruğuyla döner, renk dalgası saçar. 3 aşama.
   Sesler (SES'e istek: pr/istek/COL_SES.md): pr_ilk_<tip>, pr_kocaBukalemun_giris|_yarim|_bitti, pr_ipucu_<hamle>, pp_bukalemun_*. */
(() => {
  'use strict';
  // SADE4: belirgin yer uyarısı — seslendirmede söylenen renkle aynı; yarı saydam dolgu + kalın kenar (halka) ya da şerit (yol).
  //   Havuzlu, paylaşılan geometri; malzeme işaret başına bir kez (havuzda yeniden kullanılır). Süre dolunca söner (≥ 2,2 s: cümle boyunca yerde kalır).
  const ZM = { pool: [], geo: null };
  function zmGet(kind) {
    if (typeof scene === 'undefined' || typeof THREE === 'undefined') return null;
    if (!ZM.geo) { ZM.geo = { c: new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), r: new THREE.RingGeometry(0.86, 1, 56).rotateX(-Math.PI / 2), p: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) }; for (const k in ZM.geo) ZM.geo[k].userData.keep = true; }
    let m = ZM.pool.find(q => !q.on && q.kind === kind);
    if (!m) {
      const mat = op => { const x = new THREE.MeshBasicMaterial({ transparent: true, opacity: op, depthWrite: false, fog: false }); x.userData.keep = true; return x; };
      const g = new THREE.Group(), fill = new THREE.Mesh(kind === 'ring' ? ZM.geo.c : ZM.geo.p, mat(0.28)); fill.renderOrder = 2; g.add(fill);
      const edges = kind === 'ring' ? [new THREE.Mesh(ZM.geo.r, mat(0.92))] : [new THREE.Mesh(ZM.geo.p, mat(0.92)), new THREE.Mesh(ZM.geo.p, mat(0.92))];
      for (const e of edges) { e.renderOrder = 3; e.position.y = 0.004; g.add(e); }
      m = { kind, g, fill, edges, on: false, t: 0, d: 1 }; ZM.pool.push(m);
    }
    if (!m.g.parent) scene.add(m.g);
    return m;
  }
  function zmShow(m, col, dur, fillOp) {
    m.fill.material.color.set(col); m.fill.material.opacity = Math.min(0.2, fillOp ?? 0.18);   // (soluk dolgu ≤ 0,2; kenar belirgin)
    for (const e of m.edges) e.material.color.set(col);
    m.g.visible = true; m.on = true; m.t = 0; m.d = Math.max(2.2, dur || 2.2); return m;   // (cümle boyunca yerde kalsın: en az 2,2 s)
  }
  function zoneMark(x, z, r, col, dur, fillOp) {   // yuvarlak alan
    const m = zmGet('ring'); if (!m) return null;
    m.g.position.set(x, 0.07, z); m.g.rotation.set(0, 0, 0); m.g.scale.set(r, 1, r); return zmShow(m, col, dur, fillOp);
  }
  function laneMark(x0, z0, x1, z1, w, col, dur, fillOp) {   // şerit / yol
    const m = zmGet('lane'); if (!m) return null;
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz) || 1;
    m.g.position.set((x0 + x1) / 2, 0.07, (z0 + z1) / 2); m.g.rotation.set(0, Math.atan2(dx, dz), 0); m.g.scale.set(1, 1, 1);
    m.fill.scale.set(w, 1, len); const ew = Math.max(0.22, w * 0.14);   // (kalın, belirgin kenar)
    m.edges.forEach((e, i) => { e.scale.set(ew, 1, len); e.position.x = (i ? 1 : -1) * (w / 2 - ew / 2); });
    return zmShow(m, col, dur, fillOp);
  }
  function zoneTick(dt) { for (const m of ZM.pool) if (m.on && (m.t += dt) >= m.d) { m.on = false; m.g.visible = false; } }
  const PI = Math.PI;
  const HAS = typeof EMODEL !== 'undefined' && EMODEL && EMODEL.KIT && EMODEL.addType && EMODEL.buildRaw;
  const K = HAS ? EMODEL.KIT : null, G = HAS ? K.G : null;
  const col = h => new THREE.Color(h), hdr = (h, k) => new THREE.Color(h).multiplyScalar(k);
  const mixc = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  const hash = (a, b, c) => (K ? K.hash3(a, b, c) : 0.5);
  const sm = x => smooth01(x);
  const yuz = o => Object.assign({ tilt: 0.3, browT: 0.32, browRaise: 0.26 }, o);
  const bumpU = (u, a, b) => (u > a && u < b ? Math.sin(PI * (u - a) / (b - a)) : 0);
  const breath = (s, f = 2.4) => Math.sin(s.t * f + s.ph);

  // ── ortak hareket yardımcıları (05h_huysuzlar ile aynı) ──
  function boing(s, st, dt, b, k = 1) {   // vurulunca sönümlü yay
    if (st.hurt > (s.hzH || 0) + 0.25) s.hzB = 0;
    s.hzH = st.hurt;
    if (s.hzB === undefined || s.hzB > 1.2) return;
    s.hzB += dt;
    const w = Math.sin(s.hzB * 30) * Math.exp(-s.hzB * 5.5) * 0.22 * k;
    b.scale.y *= 1 + w; b.scale.x *= 1 - w * 0.6; b.scale.z *= 1 - w * 0.6;
  }
  function gag(s, st, dt, D, every = 5) {   // dururken arada bir D saniyelik komik gösteri: 0..1 ya da -1
    const idle = s.mv < 0.15 && st.windup < 0 && st.attack < 0 && !(st.dying >= 0) && !(st.hurt > 0.3);
    if (s.gagT === undefined) s.gagT = frand(1.5, every);
    if (!idle) { if (s.gagU >= 0) s.gagU = -1; s.gagT = Math.max(s.gagT, 1.2); return -1; }
    if (s.gagU >= 0) { s.gagU += dt / D; if (s.gagU >= 1) { s.gagU = -1; s.gagT = frand(every * 0.7, every * 1.5); return -1; } return s.gagU; }
    s.gagT -= dt;
    if (s.gagT <= 0) { s.gagU = 0; return 0; }
    return -1;
  }
  const HOP = { y: 0, sy: 1, sxz: 1, u: 0, air: 0 };
  function hopGait(s, st, dt, rate, h) {
    s.hopK = damp(s.hopK || 0, st.move > 0.05 ? 1 : 0, 6, dt);
    if (s.hopK > 0.02 || (s.hop % 1) > 0.03) s.hop += dt * (rate + 0.8 * s.mv);
    const u = s.hop % 1, A = s.hopK;
    let y = 0, sy = 1, sxz = 1, air = 0;
    if (u < 0.2) { const k = Math.sin(PI * u / 0.2); sy -= 0.18 * k * A; sxz += 0.1 * k * A; }
    else if (u < 0.82) { const k = (u - 0.2) / 0.62; air = Math.sin(PI * k) * A; y = air * h; const s2 = Math.abs(Math.cos(PI * k)); sy += 0.14 * s2 * A; sxz -= 0.06 * s2 * A; }
    else { const k = Math.sin(PI * (u - 0.82) / 0.18); sy -= 0.2 * k * A; sxz += 0.12 * k * A; }
    HOP.y = y; HOP.sy = sy; HOP.sxz = sxz; HOP.u = u; HOP.air = air;
    return HOP;
  }
  function walkPh(s, dt, rate) { if (s.mv > 0.03) s.walk += dt * (rate + 5 * s.mv); return Math.min(1, s.mv * 1.4); }
  // küçük yuvarlak ayak
  function foot(r, x, y, z, sx, sy, sz, c) {
    r.fx(0, 0.5).add(G.sphere(14, 10), c, [x, y, z], null, [sx, sy, sz]);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.05), [x - sx * 0.25, y + sy * 0.6, z + sz * 0.45], null, [sx * 0.22, sy * 0.15, sz * 0.18]);
    r.fx(0, 0);
  }
  function glints(r, pts, c = '#fff6c8') {   // nadir: ışıklı yıldızcıklar
    r.fx(1, 0);
    for (const p of pts) {
      r.add(G.octa(), hdr(c, 2.2), p, [0, 0, 0], [p[3], p[3] * 1.9, p[3] * 0.5]);
      r.add(G.octa(), hdr(c, 2.2), p, [0, 0, PI / 2], [p[3], p[3] * 1.9, p[3] * 0.5]);
    }
    r.fx(0, 0);
  }
  // küçük beş yapraklı çöl çiçeği (kendi çerçevesinde, +y yukarı)
  function flower(r, p, s, petal, mid = '#ffd84a') {
    r.push(p, [-0.25, 0, 0], s).fx(0, 0.5);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; r.add(G.sphere(8, 5), petal, [Math.sin(a) * 0.55, 0.05, Math.cos(a) * 0.55], [0, a, 0], [0.42, 0.16, 0.6]); }
    r.add(G.sphere(8, 6), mid, [0, 0.14, 0], null, [0.36, 0.22, 0.36]);
    r.pop().fx(0, 0);
  }

  // ════════════════ Kum Topacı ════════════════
  // Gövde: üstte geniş, altta sivri topaç; renkli yatay şeritler (pastel), tepede tutamak + kum kıvrımı. Yüz üst gövdede.
  const TOP_P = [[0.0, 0.02], [0.05, 0.05], [0.16, 0.16], [0.3, 0.3], [0.38, 0.42], [0.37, 0.5], [0.3, 0.58], [0.16, 0.63], [0.0, 0.645]];
  function topStripe(gold) {
    const cs = gold ? ['#ffd84a', '#fff1b0', '#ffc43a', '#fff8d8'] : ['#ffb38a', '#fff1d8', '#7fd8c8', '#fff1d8', '#ff9ec2', '#fff1d8', '#ffd36a'];
    const cc = cs.map(col);
    return (x, y, z) => {
      const a = Math.atan2(x, z), band = y * 22 + Math.sin(a * 3) * 0.6;
      const i = Math.floor(band) % cc.length;
      return cc[(i + cc.length) % cc.length];
    };
  }
  function buildTopac(r, o) {
    const E = o.elite, gold = !!o.rare;
    r.bone('body', 'root', [0, 0.02, 0]);
    r.bone('spin', 'body', [0, 0.3, 0]);
    r.bone('knob', 'body', [0, 0.64, 0]);
    // dönen çizgili kabuk (yüzden ayrı kemik: yüz hep öne bakar)
    r.on('spin').fx(0, gold ? 2 : 0.6).add(K.lathe('colTop', TOP_P, 36, 4), topStripe(gold), [0, 0, 0], null, [1, 1, 1]);
    // yanlarda kabartma noktalar (dönerken parıldar)
    r.fx(0, 0.7);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; r.add(G.sphere(8, 6), gold ? '#fff6c0' : (i % 2 ? '#ffffff' : '#ffe08a'), [Math.sin(a) * 0.375, 0.44, Math.cos(a) * 0.375], null, 0.03); }
    r.fx(0, 0);
    // ön yüz plakası (dönmez): kabuğun önünde hafif kabarık krem disk
    r.on('body');
    const C = [0, 0.4, 0.0], R = 0.37;
    K.face(r, C, R, yuz({ bone: 'body', tilt: 0.12, ex: 0.12, ey: 0.03, er: 0.085, iris: gold ? '#8a5a10' : '#3a2a5a', skin: gold ? '#ffd84a' : '#ffe6c8', browCol: '#6a4a3a', browY: 1.4,
      mouthY: -0.09, mouthW: 0.085, heartY: 0.7, heartX: 1.1, inset: 0.0 }));
    // tutamak + kum kıvrımı
    r.on('knob').fx(0, 0.6).add(G.cyl(1, 1, 14), gold ? '#ffcf3a' : '#ff8fb8', [0, 0.7, 0], null, [0.05, 0.12, 0.05]);
    r.add(G.sphere(12, 8), gold ? '#fff2a0' : '#ffd36a', [0, 0.78, 0], null, 0.07);
    r.fx(0, 0);
    // sivri uçta minik kum bulutçuğu (zemine değdiği yer)
    r.on('body').fx(0, 0, 0, 1).add(G.sphere(10, 6), '#f2d6a2', [0, 0.03, 0], null, [0.12, 0.04, 0.12]).fx(0, 0);
    if (E) K.crown(r.on('knob'), [0, 0.82, 0], 0.5);
    if (gold) glints(r.on('knob'), [[0.3, 0.75, 0.1, 0.05], [-0.32, 0.6, 0.12, 0.04], [0.1, 0.95, -0.1, 0.035]]);
    r.on('body').mark('muzzle', [0, 0.4, 0.35]);
    return { height: 0.8, glowC: col(gold ? '#fff0a0' : '#ffb08a'), mat: { rough: 0.4, rim: '#ffffff', rimK: 0.36, rimP: 2.2 } };
  }
  function animTopac(m, dt, st, s) {
    const B = m.B, b = B.body;
    walkPh(s, dt, 4);
    // dönüş hızı: yürürken hızlı, hazırlanırken çok hızlı, dururken yavaş
    let w = 4 + 10 * s.mv;
    let rx = Math.sin(s.t * 3 + s.ph) * 0.05, rz = Math.cos(s.t * 3 + s.ph) * 0.05, y = 0, sy = 1;
    if (st.windup >= 0) { const k = sm(st.windup * 1.3); w += 26 * k; rx = -0.2 * k + Math.sin(s.t * 30) * 0.03 * k; sy = 1 - 0.1 * k; y = 0.03 * Math.abs(Math.sin(s.t * 40)) * k; }
    if (st.attack >= 0 && st.attack < 1) { const k = Math.sin(PI * st.attack); w += 20; rx = 0.3 * k; y = 0.08 * k; }
    { const u = gag(s, st, dt, 2.6, 5);   // bekleme: yavaşlar, sallanır sallanır… "hop!" yeniden döner
      if (u >= 0) { const slow = bumpU(u, 0, 0.7); w *= 1 - 0.9 * slow; rz += Math.sin(s.t * 6) * 0.3 * slow * u; rx += Math.cos(s.t * 6) * 0.3 * slow * u; s.eyeK = 1 + 0.25 * bumpU(u, 0.55, 0.8); y += 0.1 * bumpU(u, 0.72, 0.95); }
    }
    s.spinA = (s.spinA || 0) + w * dt;
    B.spin.rotation.y = s.spinA;
    B.knob.rotation.y = s.spinA * 0.5;
    b.rotation.x = rx; b.rotation.z = rz; b.position.y = y; b.scale.set(1, sy, 1);
    boing(s, st, dt, b);
  }

  // ════════════════ Kaktüsçük ════════════════
  // Dikensiz, yumuşacık, tombul kaktüs (nane yeşili, beyaz benekli), iki kısa kol, tepede pembe çiçek, küçük kiremit saksı-ayakkabılar.
  function buildKaktuscuk(r, o) {
    const E = o.elite;
    const cG = col(E ? '#7fe0a0' : '#9cebb4'), cL = col('#d8ffe0'), cD = col('#4fb880');
    r.bone('body', 'root', [0, 0.05, 0]);
    r.bone('armL', 'body', [0.25, 0.5, 0]); r.bone('armR', 'body', [-0.25, 0.5, 0]);
    r.bone('top', 'body', [0, 0.9, 0]);
    r.bone('feet', 'root', [0, 0.03, 0.05]);
    const CC = [0, 0.5, 0], A = [0.3, 0.42, 0.28];
    const ribs = (x, y, z) => {   // yumuşak dikey kaburgalar + dikey degrade
      const a = Math.atan2(x, z), rb = 0.5 + 0.5 * Math.cos(a * 8);
      const g = mixc(cD, cG, sm((y - 0.1) / 0.5)).lerp(cL, sm((y - 0.65) / 0.35) * 0.5);
      return g.lerp(cD, 0.18 * (1 - rb));
    };
    r.on('body').fx(0, 0.35).add(G.sphere(30, 22), ribs, CC, null, A);
    // beyaz yumuşak benekler (diken değil: pamuk noktaları)
    r.fx(0, 0.2);
    for (let j = 0; j < 8; j++) for (const phi of [0.6, 1.1, 1.6, 2.1]) {
      const th = (j + 0.5) / 8 * TAU; if (Math.abs(Math.atan2(Math.sin(th), Math.cos(th))) < 0.9 && phi > 0.8 && phi < 2.0) continue;
      const p = [CC[0] + A[0] * 1.0 * Math.sin(phi) * Math.sin(th), CC[1] + A[1] * Math.cos(phi), CC[2] + A[2] * 1.0 * Math.sin(phi) * Math.cos(th)];
      r.add(G.sphere(8, 6), '#ffffff', p, null, 0.026);
    }
    r.fx(0, 0);
    // kısa tombul kollar (uçlarında yuvarlak)
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.35);
      r.seg([0.22 * sd, 0.5, 0], [0.4 * sd, 0.56, 0.02], 0.075, cG, 0.07, 12);
      r.add(G.sphere(14, 10), mixc(cG, cL, 0.4), [0.4 * sd, 0.57, 0.02], null, 0.075);
      r.fx(0, 0.2).add(G.sphere(8, 6), '#ffffff', [0.42 * sd, 0.63, 0.05], null, 0.022).fx(0, 0);
    }
    // saksı ayakkabılar
    r.on('feet');
    for (const sd of [-1, 1]) foot(r, 0.13 * sd, 0.05, 0.03, 0.1, 0.06, 0.12, E ? '#ff8a5a' : '#ee9a6a');
    // yüz
    r.on('body');
    K.face(r, [0, 0.52, 0], 0.29, yuz({ bone: 'body', tilt: 0.14, ex: 0.1, ey: 0.03, er: 0.075, iris: '#1e5a3a', skin: cG, browCol: '#2a6a40', browY: 1.36,
      mouthY: -0.1, mouthW: 0.08, smileK: 1.7, heartY: 0.95, heartX: 1.15, blushCol: '#ff8fb0' }));
    // tepede çiçek (elitte çiçek tacı)
    r.on('top');
    if (E) {
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; flower(r, [Math.sin(a) * 0.17, 0.9 + 0.02 * Math.cos(a * 2), Math.cos(a) * 0.15], 0.07, ['#ff8fc0', '#ffd84a', '#c8a0ff'][i % 3], '#fff4c0'); }
      r.fx(1, 0).add(G.octa(), hdr('#ffe0f0', 1.6), [0, 1.0, 0.05], null, [0.04, 0.07, 0.03]).fx(0, 0);
    } else flower(r, [0.02, 0.93, 0.02], 0.1, '#ff8fc0');
    r.on('body').mark('muzzle', [0, 0.5, 0.3]);
    return { height: 1.0, glowC: col('#ff9ac0'), mat: { rough: 0.6, sss: col('#c8ffd0').multiplyScalar(0.04), rim: '#f0fff4', rimK: 0.32, rimP: 2.2, wob: 0.006, wobF: 5, wobS: 4 } };
  }
  function animKaktuscuk(m, dt, st, s) {
    const B = m.B, b = B.body, wk = walkPh(s, dt, 6);
    const ph = s.walk;
    let y = Math.abs(Math.sin(ph)) * 0.05 * wk, rz = Math.sin(ph) * 0.08 * wk + Math.sin(s.t * 1.6 + s.ph) * 0.03, rx = 0, sy = 1 + 0.03 * breath(s), sxz = 1;
    let open = 0, hug = 0;
    if (st.windup >= 0) {   // kollarını iki yana açar, gözleri parlar, "gel gel!" kıpırtısı
      const w = sm(st.windup * 1.3); open = w; rx = -0.12 * w; s.eyeK = 1 + 0.2 * w; y += 0.03 * Math.abs(Math.sin(s.t * 20)) * w;
    }
    if (st.attack >= 0 && st.attack < 1) {   // kucaklama: kollar kapanır, sıkıca sıkar (yumuşak "pof")
      const a = st.attack, k = Math.sin(PI * Math.min(1, a / 0.6)); hug = k; open = 1 - sm(a / 0.3); rx = 0.18 * k; sxz *= 1 + 0.08 * k; sy *= 1 - 0.06 * k; s.eyeK = 1 - 0.6 * k;
    }
    { const u = gag(s, st, dt, 3.2, 5);   // bekleme: kendine sarılıp sallanır, çiçeğini koklar
      if (u >= 0) { const g = bumpU(u, 0, 1); hug = Math.max(hug, 0.8 * g); rz += Math.sin(s.t * 5) * 0.12 * g; s.eyeK = lerp(1, 0.15, g); }
    }
    b.position.y = y; b.rotation.z = rz; b.rotation.x = rx; b.scale.set(sxz, sy, sxz);
    const swing = Math.sin(ph) * 0.4 * wk;
    B.armL.rotation.z = 0.3 + 1.1 * open - 1.0 * hug + swing * 0.3; B.armR.rotation.z = -0.3 - 1.1 * open + 1.0 * hug + swing * 0.3;
    B.armL.rotation.y = -1.0 * hug; B.armR.rotation.y = 1.0 * hug;
    B.armL.rotation.x = -swing; B.armR.rotation.x = swing;
    B.top.rotation.z = Math.sin(s.t * 2.2 + s.ph) * 0.12;
    B.feet.position.z += Math.sin(ph) * 0.03 * wk;
    boing(s, st, dt, b);
  }

  // ════════════════ Zıplayan Kum Tavşanı (jerboa) ════════════════
  function buildTavsan(r, o) {
    const E = o.elite;
    const fur = col(E ? '#f2c890' : '#f6d6a8'), furL = col('#fff4e2'), furD = col('#d8a874');
    r.bone('body', 'root', [0, 0.05, 0]);
    r.bone('earL', 'body', [0.1, 0.62, -0.02]); r.bone('earR', 'body', [-0.1, 0.62, -0.02]);
    r.bone('tail', 'body', [0, 0.2, -0.2]);
    r.bone('legs', 'root', [0, 0.1, -0.02]);
    r.bone('hands', 'body', [0, 0.32, 0.18]);
    const C = [0, 0.42, 0], R = 0.24;
    r.on('body').fx(0, 0.1).add(G.sphere(26, 18), K.vgrad(0.15, 0.68, [[0, furL], [0.3, fur], [1, mixc(fur, furD, 0.2)]]), [0, 0.32, -0.03], null, [0.22, 0.2, 0.24]);   // gövde
    r.add(G.sphere(28, 20), K.vgrad(0.25, 0.68, [[0, furL], [0.45, fur], [1, fur]]), C, null, [R, R * 0.95, R * 0.95]);   // baş
    r.add(G.sphere(16, 12), furL, [0, 0.29, 0.12], null, [0.14, 0.13, 0.1]);   // açık göğüs
    // kocaman kulaklar
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'earL' : 'earR');
      const rot = [-0.15, 0, -sd * 0.35];
      r.add(G.sphere(18, 12), K.vgrad(0.55, 1.05, [[0, fur], [1, mixc(fur, furD, 0.3)]]), [0.18 * sd, 0.82, -0.04], rot, [0.13, 0.26, 0.05]);
      r.fx(0, 0.2).add(G.sphere(14, 10), '#ffb8c8', [0.18 * sd, 0.81, 0.005], rot, [0.09, 0.2, 0.02]).fx(0, 0);
    }
    // uzun kuyruk + püskül (zıplarken denge)
    r.on('tail').fx(0, 0.1);
    const TP = [[0, 0.2, -0.2], [0, 0.17, -0.4], [0, 0.2, -0.58], [0, 0.3, -0.72]];
    for (let i = 0; i < 3; i++) r.seg(TP[i], TP[i + 1], 0.022, fur, 0.02, 8);
    r.fx(0, 0, 0, 1).add(G.sphere(12, 8), '#ffffff', [0, 0.33, -0.76], null, [0.07, 0.09, 0.07]);
    r.add(G.sphere(10, 8), '#3a2a2a', [0, 0.31, -0.73], null, [0.045, 0.06, 0.045]).fx(0, 0);
    // uzun arka ayaklar + minik eller
    r.on('legs');
    for (const sd of [-1, 1]) {
      r.add(G.sphere(14, 10), fur, [0.12 * sd, 0.14, -0.06], null, [0.08, 0.11, 0.1]);
      foot(r, 0.12 * sd, 0.025, 0.08, 0.05, 0.03, 0.15, furL);
    }
    r.on('hands');
    for (const sd of [-1, 1]) r.add(G.sphere(10, 8), furL, [0.06 * sd, 0.26, 0.2], null, [0.035, 0.05, 0.035]);
    // yüz + burun + bıyık
    r.on('body');
    K.face(r, C, R, yuz({ bone: 'body', tilt: 0.18, ex: 0.09, ey: 0.03, er: 0.075, iris: '#3a2410', skin: mixc(fur, furL, 0.4), browCol: '#8a5a3a', browY: 1.38,
      mouthY: -0.085, mouthW: 0.07, heartY: 0.95, heartX: 1.15 }));
    r.on('body').push(C, [-0.18, 0, 0]);
    { const [p, q] = onSphere(0, -0.045, R, -0.01); r.push(p, q).fx(0, 0.7).add(G.sphere(12, 8), '#ff8fb3', [0, 0, 0], null, [0.026, 0.018, 0.016]).pop(); }
    r.fx(0, 0.2);
    for (const sd of [-1, 1]) for (const k of [-1, 1]) { const [p] = onSphere(sd * 0.07, -0.055 + k * 0.01, R, -0.005); r.seg(p, [p[0] + sd * 0.09, p[1] + k * 0.02, p[2] - 0.02], 0.004, '#8a6a5a', 0.003, 5); }
    r.pop().fx(0, 0);
    if (E) K.crown(r.on('body'), [0, 0.64, -0.02], 0.45);
    r.on('body').mark('muzzle', [0, 0.4, 0.25]);
    return { height: 0.75, glowC: col('#ffb48a'), mat: { rough: 0.85, sss: col('#ffffff').multiplyScalar(0.03), rim: '#fff4e0', rimK: 0.4, rimP: 2.0 } };
  }
  function animTavsan(m, dt, st, s) {
    const B = m.B, b = B.body;
    const g = hopGait(s, st, dt, 2.0, 0.42);   // jerboa: yüksek zıplar
    let y = g.y, sy = g.sy, sxz = g.sxz, rx = -0.15 * g.air, ear = -0.3 * g.air;
    const tw = Math.max(0, Math.sin(s.t * 0.9 + s.ph * 3) - 0.9) * 10;
    B.earL.rotation.z = -0.05 + Math.sin(s.t * 2 + s.ph) * 0.05 + tw * 0.04 * Math.sin(s.t * 40);
    B.earR.rotation.z = 0.05 - Math.sin(s.t * 2.3 + s.ph) * 0.05;
    let tail = 0.3 * g.air;
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); sy *= 1 - 0.3 * w; sxz *= 1 + 0.14 * w; ear -= 0.8 * w; rx += 0.2 * w; tail = Math.sin(s.t * 30) * 0.4 * w; b.position.x = Math.sin(s.t * 55) * 0.012 * st.windup; }
    if (st.attack >= 0) { const a = st.attack; if (a < 1) { const k = Math.sin(PI * a); y += 0.35 * k; sy *= 1 + 0.2 * k; ear -= 0.5 * k; rx -= 0.3 * k; } }
    { const u = gag(s, st, dt, 2.4, 4.5);   // bekleme: arka ayaklarına kalkıp kulaklarını yıkar, sonra kuyruğunu kovalar gibi döner
      if (u >= 0) { const up = bumpU(u, 0, 0.5), sp = bumpU(u, 0.5, 1); y += 0.08 * up; rx -= 0.25 * up; ear += 0.6 * up; B.hands.position.y += 0.12 * up; b.rotation.y = TAU * sm((u - 0.5) / 0.5) * (sp > 0 ? 1 : 0); s.eyeK = 1 - 0.7 * up; }
    }
    B.earL.rotation.x = ear; B.earR.rotation.x = ear;
    b.position.y = y; b.scale.set(sxz, sy, sxz); b.rotation.x = rx;
    B.tail.rotation.x = tail; B.tail.rotation.y = Math.sin(s.t * 3 + s.ph) * 0.2;
    B.legs.position.y += g.air * 0.1; B.legs.rotation.x = -0.6 * g.air;
    boing(s, st, dt, b);
  }

  // ════════════════ Rüzgâr Gülü Topu ════════════════
  // Tombul sarı-krem top, tepede 4 kanatlı renkli rüzgâr gülü (çubuğuyla), yanakları şişer, rüzgâr topu "püf" diye üfler.
  function buildRuzgar(r, o) {
    const E = o.elite;
    const bc = col(E ? '#ffd06a' : '#ffe9a8'), bl = col('#fff8e4'), bd = col('#f2b860');
    r.bone('body', 'root', [0, 0.05, 0]);
    r.bone('wheel', 'body', [0, 0.95, 0.04]);
    r.bone('cheeks', 'body', [0, 0.38, 0.28]);
    r.bone('feet', 'root', [0, 0.03, 0.04]);
    const C = [0, 0.42, 0], R = 0.34;
    r.on('body').fx(0, 0.3).add(G.sphere(30, 22), K.vgrad(0.08, 0.78, [[0, bd], [0.4, bc], [1, bl]]), C, null, [R, R * 0.96, R]);
    // gövdede rüzgâr kıvrımı süsleri
    r.fx(0, 0.5);
    for (let i = 0; i < 3; i++) { const a = -0.9 + i * 0.9 + PI; r.add(G.torus(PI * 1.2, 0.18, 14), ['#7fd0ff', '#ff9ec2', '#9be08a'][i], [Math.sin(a) * R * 0.98, 0.42 + (i - 1) * 0.06, Math.cos(a) * R * 0.98], [0, a, 0], [0.09, 0.09, 0.09]); }
    r.fx(0, 0);
    // çubuk
    r.on('body').fx(0, 0.6).seg([0, 0.72, 0], [0, 0.95, 0.03], 0.02, '#ffffff', 0.018, 8).fx(0, 0);
    // rüzgâr gülü: 4 kıvrık kanat (dönen kemik)
    r.on('wheel').fx(0, 0.5);
    const PC = E ? ['#ff6fae', '#ffd84a', '#5fd0ff', '#9be08a'] : ['#ff8fc0', '#ffd84a', '#7fd0ff', '#a8e88a'];
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU;
      r.push([0, 0.95, 0.06], [0, 0, a]);
      r.add(G.sphere(12, 8), PC[i], [0.12, 0.05, 0], [0, 0.5, 0.35], [0.13, 0.07, 0.015]);
      r.add(G.sphere(10, 6), mixc(PC[i], '#ffffff', 0.4), [0.2, 0.1, 0.015], [0, 0.5, 0.6], [0.06, 0.04, 0.012]);
      r.pop();
    }
    r.add(G.sphere(10, 8), '#ffffff', [0, 0.95, 0.08], null, 0.03);
    r.fx(0, 0);
    // ayaklar
    r.on('feet');
    for (const sd of [-1, 1]) foot(r, 0.13 * sd, 0.04, 0.03, 0.09, 0.05, 0.11, E ? '#7fd0ff' : '#ff9ec2');
    // yüz (ağız "püf" için yuvarlanır: s.mouthO)
    r.on('body');
    K.face(r, C, R, yuz({ bone: 'body', tilt: 0.16, ex: 0.12, ey: 0.04, er: 0.09, iris: '#5a3a1a', skin: bc, browCol: '#a86a2a', browY: 1.38,
      mouthY: -0.1, mouthW: 0.09, heartY: 0.9, heartX: 1.1, mouthPivot: true }));
    // şişen yanaklar (hazırlanırken büyür)
    r.on('cheeks').fx(0, 0.3);
    for (const sd of [-1, 1]) r.add(G.sphere(14, 10), mixc(bc, '#ffb0a0', 0.35), [0.14 * sd, 0.36, 0.25], null, [0.08, 0.07, 0.05]);
    r.fx(0, 0);
    if (E) K.crown(r.on('body'), [0, 0.74, -0.08], 0.5);
    r.on('body').mark('muzzle', [0, 0.36, 0.4]);
    return { height: 1.05, glowC: col('#a8e0ff'), mat: { rough: 0.5, rim: '#ffffff', rimK: 0.3, rimP: 2.3 } };
  }
  function animRuzgar(m, dt, st, s) {
    const B = m.B, b = B.body, g = hopGait(s, st, dt, 2.4, 0.08);
    let y = g.y, sy = g.sy * (1 + 0.02 * breath(s)), sxz = g.sxz, rz = Math.sin(s.t * 1.7 + s.ph) * 0.05, puff = 0, w = 3 + 4 * s.mv;
    if (st.windup >= 0) { const k = sm(st.windup * 1.2); puff = k; w += 25 * k; sxz *= 1 + 0.08 * k; sy *= 1 + 0.05 * k; s.eyeK = 1 + 0.2 * k; }
    if (st.attack >= 0 && st.attack < 1) { const k = Math.sin(PI * Math.min(1, st.attack / 0.5)); puff = 1 - sm(st.attack / 0.25); w += 20; s.mouthO = k; b.position.z -= 0.06 * k; sy *= 1 - 0.06 * k; }
    { const u = gag(s, st, dt, 2.8, 5);   // bekleme: kendi rüzgâr gülüne üfler, rüzgâr gülü fırıl fırıl, başı döner
      if (u >= 0) { const bl = bumpU(u, 0, 0.4), dz = bumpU(u, 0.4, 1); s.mouthO = Math.max(s.mouthO, bl); puff = Math.max(puff, 0.6 * bl); w += 30 * (bl + dz); rz += Math.sin(s.t * 9) * 0.15 * dz; s.eyeWob = dz; }
    }
    s.wA = (s.wA || 0) + w * dt;
    B.wheel.rotation.z = s.wA;
    B.cheeks.scale.setScalar(1 + 0.45 * puff);
    b.position.y += y; b.scale.set(sxz, sy, sxz); b.rotation.z = rz;
    boing(s, st, dt, b);
  }

  // ════════════════ Boss: Renk Değiştiren Koca Bukalemun ════════════════
  // Tek iskelet, açık pastel (krem-beyaz) gövde: rengini malzeme rengi verir (renkten renge geçer; saklanınca kum rengi).
  // Kemikler: body · head · eyeL/eyeR (taret gözler) · crest · tail0..3 (kıvrık kuyruk) · legFL/FR/BL/BR · eyes/brow/mouth/joy (K.face)
  const BUK_TAIL = [[0, 1.0, -1.05], [0, 0.85, -1.6], [0, 0.55, -1.95], [0, 0.35, -1.75], [0, 0.45, -1.45]];
  function buildBukalemun(r, o) {
    const skin = col('#f4f4f4'), skinD = col('#d8d8d8'), belly = col('#ffffff'), spot = col('#c8c8c8'), stripe = col('#bcbcbc');
    r.bone('body', 'root', [0, 0.95, 0]);
    r.bone('head', 'body', [0, 1.35, 0.95]);
    r.bone('crest', 'body', [0, 1.75, 0]);
    r.bone('eyeL', 'head', [0.42, 1.62, 1.25]); r.bone('eyeR', 'head', [-0.42, 1.62, 1.25]);
    for (let i = 0; i < 4; i++) r.bone('tail' + i, i ? 'tail' + (i - 1) : 'body', BUK_TAIL[i]);
    for (const [n, x, z] of [['legFL', 0.55, 0.55], ['legFR', -0.55, 0.55], ['legBL', 0.55, -0.55], ['legBR', -0.55, -0.55]]) r.bone(n, 'body', [x, 0.75, z]);
    // gövde: uzunca, yanlardan basık; sırtta yumuşak benek deseni, açık karın
    const bodyCol = (x, y, z) => {
      const g = mixc(skinD, skin, sm((y - 0.5) / 0.9));
      const sp = Math.sin(x * 9 + z * 3) * Math.sin(z * 7 - y * 5);
      if (sp > 0.55 && y > 0.9) g.lerp(spot, 0.8);
      if (Math.abs(x) > 0.35 && Math.sin(z * 5.5 + y * 1.5) > 0.6) g.lerp(stripe, 0.55);   // yanlarda yumuşak şeritler
      if (y < 0.75 && Math.abs(x) < 0.5) g.lerp(belly, 0.7);
      return g;
    };
    r.on('body').fx(0, 0.35).add(G.sphere(36, 26), bodyCol, [0, 1.1, 0], null, [0.68, 0.72, 1.1]);
    // sırt yelesi: yumuşak, yuvarlak tümsekler (diken değil)
    r.on('crest').fx(0, 0.5);
    for (let i = 0; i < 9; i++) {
      const u = i / 8, z = lerp(0.8, -1.0, u), y = 1.1 + 0.7 * Math.sqrt(Math.max(0, 1 - Math.pow(z / 1.15, 2))) + 0.04;
      r.add(G.sphere(12, 8), mixc('#fff3d8', '#ffffff', u), [0, y, z], [0.2, 0, 0], [0.05, 0.12 - 0.04 * Math.abs(u - 0.4), 0.1]);
    }
    r.fx(0, 0);
    // baş: yuvarlak, öne uzanan; tepede miğfer gibi yumuşak taç (kask)
    r.on('head').fx(0, 0.35);
    const HC = [0, 1.45, 1.2], HR = 0.55;
    r.add(G.sphere(32, 24), bodyCol, HC, null, [HR, HR * 0.92, HR * 1.05]);
    r.add(G.sphere(24, 16), bodyCol, [0, 1.95, 0.92], [-0.75, 0, 0], [0.34, 0.5, 0.2]);   // kask (bukalemun miğferi)
    for (let i = 0; i < 4; i++) r.add(G.sphere(10, 8), belly, [0, 2.0 + i * 0.1, 1.08 - i * 0.12], null, [0.07, 0.07, 0.07]);   // kask sırtında yumuşak boncuklar
    r.add(G.sphere(20, 14), skinD, [0, 1.3, 1.62], null, [0.32, 0.2, 0.16]);   // burun ucu
    r.fx(0, 0);
    // taret gözler: göz çevresinde kabarık deri halkası (K.face gözlerini içine alır)
    K.face(r, HC, HR, yuz({ bone: 'head', tilt: 0.08, ex: 0.28, ey: 0.14, er: 0.14, inset: 0.0, iris: '#2a7a5a', skin: skin, browCol: '#8a6a4a', browY: 1.5,
      mouthY: -0.2, mouthW: 0.3, smirkK: 1.5, smileK: 1.4, heartY: 0.85, heartX: 1.2, heartS: 0.3, mouthPivot: true, noBrow: false }));
    r.on('head').push(HC, [-0.08, 0, 0]).fx(0, 0.35);
    for (const sd of [-1, 1]) {
      const [p, q] = onSphere(sd * 0.28, 0.14, HR, -0.02);
      r.push(p, q);
      r.add(G.torus(TAU, 0.42, 24), skin, [0, 0, 0.0], null, [0.19, 0.19, 0.16]);
      r.add(G.sphere(16, 12), skinD, [0, 0, -0.06], null, [0.19, 0.19, 0.12]);
      r.pop();
    }
    r.pop().fx(0, 0);
    // bacaklar: kalın, kısa; iki parmaklı yuvarlak "eldiven" ayaklar
    for (const [n, x, z] of [['legFL', 0.55, 0.55], ['legFR', -0.55, 0.55], ['legBL', 0.55, -0.55], ['legBR', -0.55, -0.55]]) {
      r.on(n).fx(0, 0.3);
      const sx = Math.sign(x);
      r.seg([x * 0.8, 0.9, z], [x * 1.15, 0.5, z + 0.05], 0.22, skin, 0.18, 12);
      r.add(G.sphere(14, 10), skin, [x * 1.15, 0.5, z + 0.05], null, 0.18);
      r.seg([x * 1.15, 0.5, z + 0.05], [x * 1.12, 0.12, z + 0.12], 0.17, skin, 0.15, 12);
      r.add(G.sphere(14, 10), skinD, [x * 1.12 + sx * 0.07, 0.08, z + 0.28], null, [0.14, 0.1, 0.18]);
      r.add(G.sphere(14, 10), skinD, [x * 1.12 - sx * 0.09, 0.08, z + 0.22], null, [0.12, 0.09, 0.15]);
      r.add(G.sphere(10, 8), belly, [x * 1.12 + sx * 0.07, 0.1, z + 0.42], null, [0.06, 0.05, 0.04]);
      r.fx(0, 0);
    }
    // kıvrık kuyruk: kalından inceye halkalar, uçta sarmal
    const tw = [0.36, 0.28, 0.2, 0.13];
    for (let i = 0; i < 4; i++) {
      r.on('tail' + i).fx(0, 0.35);
      const a = BUK_TAIL[i], b = BUK_TAIL[i + 1];
      r.seg(a, b, tw[i], bodyCol, tw[i] * 0.8, 14);
      r.add(G.sphere(14, 10), bodyCol, b, null, tw[i] * 0.8);
      if (i === 3) {   // sarmal uç
        for (let k = 0; k < 10; k++) { const t = k / 10, ang = t * TAU * 1.2, rr = 0.2 * (1 - t * 0.7); r.add(G.sphere(10, 8), mixc(skin, skinD, t), [0, 0.7 + Math.cos(ang) * rr, -1.45 - Math.sin(ang) * rr], null, 0.09 * (1 - t * 0.6)); }
      }
      // halka çizgileri (renk değişiminde ışıldar)
      r.fx(0.25, 0.4).add(G.torus(TAU, 0.14, 18), '#ffffff', [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize()), tw[i] * 0.95);
      r.fx(0, 0);
    }
    r.on('head').mark('muzzle', [0, 1.3, 1.8]);
    r.on('tail3').mark('tail', [0, 0.6, -1.6]);
    return { height: 2.4, glowC: col('#ffb0e0'), glowK: 0.6, dieHop: 0.1, portrait: { cx: 0, cy: 1.5, cz: 0.9, rad: 1.1 },
      mat: { rough: 0.72, rim: '#ffffff', rimK: 0.08, rimP: 3.2 } };   // (az kenar ışığı: soluk/hayalet görünmesin, renk doygun ve opak)
  }
  // Renk düzeni (malzeme rengi): boşta renkten renge yavaşça geçer; st.cam (0..1) kum rengine karışır; st.flashC parlak kutlama
  const BUK_HUE = ['#16b85a', '#ee3a86', '#f2a000', '#1c78e0', '#7a3ee6'].map(col);   // net, doygun renkler: yeşil → pembe → sarı → mavi → mor
  const BUK_SAND = col('#f0cf98');
  const _bc = new THREE.Color(), _bc2 = new THREE.Color();
  function animBukalemun(m, dt, st, s) {
    const B = m.B, b = B.body, ph = st.phase || 'idle', pt = st.phaseT || 0, dying = st.dying >= 0;
    const wk = walkPh(s, dt, 3.2), wp = s.walk;
    let y = 0, rx = 0, rz = Math.sin(s.t * 1.1 + s.ph) * 0.02, hx = 0, hy = Math.sin(s.t * 0.7) * 0.15, tailCurl = 0, sy = 1, spin = 0;
    // yürüyüş: çapraz bacaklar (bukalemun gibi ağır ağır, sallanarak)
    const L1 = Math.sin(wp) * 0.35 * wk, L2 = Math.sin(wp + PI) * 0.35 * wk;
    B.legFL.rotation.x = L1; B.legBR.rotation.x = L1; B.legFR.rotation.x = L2; B.legBL.rotation.x = L2;
    rz += Math.sin(wp) * 0.04 * wk; y += Math.abs(Math.sin(wp)) * 0.04 * wk;
    // gözler bağımsız döner (komik): biri Feza'ya, biri etrafa
    const look = Math.sin(s.t * 0.9 + 1) * 0.5, look2 = Math.sin(s.t * 1.3) * 0.6;
    B.eyeL.rotation.y = look; B.eyeR.rotation.y = look2; B.eyeL.rotation.x = Math.sin(s.t * 0.7) * 0.2; B.eyeR.rotation.x = Math.cos(s.t * 0.8) * 0.2;
    // fazlara göre poz
    if (ph === 'saklan') {   // 0..0.2: kıkırdar + döner; sonra yere yapışır, gözleri yarı kapalı
      const k = sm(pt / 0.12);
      if (pt < 0.12) { spin = TAU * sm(pt / 0.12); s.eyeK = 0.3; }
      sy = 1 - 0.18 * k; y -= 0.25 * k; hx += 0.15 * k; s.eyeK = Math.min(s.eyeK, lerp(1, 0.55, k));
      tailCurl = 0.4 * k;
    } else if (ph === 'bulundu') {   // "Buldun!": havaya sıçrar, gözler fırıl fırıl, kıkırdar
      const u = Math.min(1, pt * 3);
      y += Math.sin(PI * u) * 0.6; s.mouthO = 0.8 * (1 - u) + 0.3; s.eyeWob = 1; rz += Math.sin(s.t * 20) * 0.08 * (1 - pt); hx -= 0.2 * Math.sin(PI * u);
      s.eyeK = 1.15;
    } else if (ph === 'kuyruk') {   // 0..0.38 kuyruğu kıvırıp çömelir · 0.38..0.68 döner · sonra başı döner
      if (pt < 0.38) { const k = sm(pt / 0.38); sy = 1 - 0.12 * k; tailCurl = 1.0 * k; b.position.x += Math.sin(s.t * 40) * 0.02 * k; s.eyeK = 1 + 0.15 * k; }
      else if (pt < 0.68) { const u = (pt - 0.38) / 0.3; spin = TAU * (st.spins || 1) * sm(u); tailCurl = -0.8; s.mouthW = 1; }
      else { s.eyeWob = 1 - sm((pt - 0.68) / 0.32); rz += Math.sin(s.t * 6) * 0.08 * s.eyeWob; }
    } else if (ph === 'dalga') {   // arka ayakları üstüne kalkıp kuyruğunu yere vurur
      const up = bumpU(pt, 0, 0.55), slam = bumpU(pt, 0.45, 0.7);
      rx -= 0.45 * up; y += 0.3 * up; s.mouthO = up; hx -= 0.2 * up; tailCurl = -0.6 * up + 0.8 * slam; s.eyeK = 1 + 0.2 * up;
    } else if (ph === 'renk') {   // aşama geçişi: şaşırır, renk şöleni
      const u = Math.min(1, pt * 1.5);
      y += Math.abs(Math.sin(u * PI * 3)) * 0.25; s.eyeK = 1.25; s.mouthO = 0.7; rz += Math.sin(s.t * 14) * 0.05;
    } else if (ph === 'roar' || ph === 'summon') {
      const k = Math.sin(PI * Math.min(1, pt)); rx -= 0.3 * k; s.mouthO = k; tailCurl = -0.5 * k; s.browY = 0.03 * k;
    } else if (ph === 'kikir') {   // kıkırdama: omuzları sallanır, gözleri kısılır
      const g = Math.sin(PI * Math.min(1, pt)); y += Math.abs(Math.sin(s.t * 16)) * 0.06 * g; s.eyeK = lerp(1, 0.2, g); s.mouthW = g; rz += Math.sin(s.t * 18) * 0.04 * g;
    }
    if (dying) { s.mouthW = 1; tailCurl = Math.sin(s.t * 8) * 0.6; }
    // baş + kuyruk
    B.head.rotation.x = hx; B.head.rotation.y = hy * (1 - (ph === 'saklan' ? 1 : 0));
    for (let i = 0; i < 4; i++) { const tb = B['tail' + i]; tb.rotation.x = (0.15 + 0.1 * Math.sin(s.t * 1.5 - i * 0.6)) * (1 - Math.abs(tailCurl)) + tailCurl * 0.45; tb.rotation.y = Math.sin(s.t * 1.2 - i * 0.7) * 0.12; }
    B.crest.position.y += 0.02 * Math.sin(s.t * 2);
    b.position.y += y; b.rotation.x = rx; b.rotation.z = rz; b.scale.set(1, sy, 1);
    B.root.rotation.y += spin;
    // ── renk ──
    const cam = clamp(+st.cam || 0, 0, 1);
    // tek renk tek renk: her renkte ~3 s durur, 0,5 s'de bir sonrakine geçer
    const hu = ((s.t / 3.5 + s.ph) % BUK_HUE.length + BUK_HUE.length) % BUK_HUE.length, i0 = Math.floor(hu), f = sm((hu - i0 - 0.86) / 0.14);
    _bc.copy(BUK_HUE[i0 % BUK_HUE.length]).lerp(BUK_HUE[(i0 + 1) % BUK_HUE.length], f);
    if (ph === 'renk' || ph === 'bulundu' || dying) { const q = (s.t * 2.2) % BUK_HUE.length, j = Math.floor(q); _bc2.copy(BUK_HUE[j % BUK_HUE.length]).lerp(BUK_HUE[(j + 1) % BUK_HUE.length], q - j); _bc.lerp(_bc2, 0.8); }
    _bc.lerp(BUK_SAND, cam);
    m.mat.color.setRGB(1, 1, 1).lerp(_bc, 0.9 + 0.1 * cam);   // (göz akları tamamen boyanmasın: %82 renk; saklanınca tam kum rengi)
    boing(s, st, dt, b, 0.4);
  }

  // ════════════════ Kayıt ════════════════
  const RARE_STATS = { hp: 14, dmg: 2, speed: 3.0, xp: 30, gold: 12, aggro: 7 };
  const T = [
    // id, ad, base, saldiri, stats, kurucu, anim, lod, nadir
    ['kumTopaci', 'Kum Topacı', 'cisdamlasi', 'kayan', { eliteAd: 'Kocaman Kum Topacı', hp: 22, dmg: 4, speed: 2.9, r: 0.44, height: 0.8, atkRange: 2.4, atkCd: 2.2, windup: 0.85, aggro: 9 }, buildTopac, animTopac, 0.55],
    ['kaktuscuk', 'Kaktüsçük', 'goblin', 'yakin', { eliteAd: 'Kocaman Kaktüsçük', hp: 26, dmg: 4, speed: 2.4, r: 0.46, height: 1.0, atkRange: 1.1, atkCd: 2.0, windup: 0.85, aggro: 8.5 }, buildKaktuscuk, animKaktuscuk, 0.55],
    ['kumTavsani', 'Zıplayan Kum Tavşanı', 'yogurt', 'ziplayan', { eliteAd: 'Kocaman Kum Tavşanı', hp: 20, dmg: 4, speed: 2.7, r: 0.42, height: 0.75, atkRange: 2.6, atkCd: 2.0, windup: 0.75, aggro: 9 }, buildTavsan, animTavsan, 0.55],
    ['ruzgarGulu', 'Rüzgâr Gülü Topu', 'mantar', 'uzak', { eliteAd: 'Kocaman Rüzgâr Gülü', hp: 18, dmg: 4, speed: 2.0, r: 0.44, height: 1.05, atkRange: 6.5, range: 6.5, atkCd: 2.9, windup: 0.95, aggro: 9, shot: { kind: 'bubble', speed: 3.4, r: 0.28, col: '#cfeeff' } }, buildRuzgar, animRuzgar, 0.55],
    ['altinTopac', 'Altın Topaç', 'cisdamlasi', 'kayan', Object.assign({ r: 0.44, height: 0.8, atkRange: 2.4, atkCd: 2.5, windup: 0.95 }, RARE_STATS), (r, o) => buildTopac(r, Object.assign({}, o, { rare: true })), animTopac, 0.55, true],
  ];
  const RARE = {};
  for (const [id, ad, base, saldiri, stats, mk, an, lod, rare] of T) {
    const def = { ad, base, saldiri, stats, ilkSoz: 'pr_ilk_' + id };
    if (rare) def.nadir = true;
    if (HAS) { EMODEL.addType(id, mk, an, lod); def.model = o => EMODEL.buildRaw(id, o || {}); }
    if (rare) RARE[id] = true;
    HUYSUZ.type(id, def);
  }
  const bdef = { ad: 'Renk Değiştiren Koca Bukalemun', base: 'kefirdev', stats: { r: 1.45, height: 2.4, speed: 2.2 },
    lines: { giris: 'pr_kocaBukalemun_giris', bitti: 'pr_kocaBukalemun_bitti', yarim: 'pr_kocaBukalemun_yarim' },
    bossKit: { own: true, add: 'kumTopaci', at: [0.5], n: [2], col: '#ffb0e0', roar: 1.3, summonAt: 0.5 } };
  if (HAS) {
    EMODEL.addType('kocaBukalemun', buildBukalemun, animBukalemun, 0.8);
    bdef.model = o => {
      const m = EMODEL.buildRaw('kocaBukalemun', o || {});
      // (sersemletme / donma tinti malzeme rengini beyaza-maviye çekip bukalemunu soluk "hayalet" gösteriyordu: rengi hep animasyon belirler, opak)
      if (m && m.setTint) { m.setTint = c => { if (c && m.flash) m.flash(0.35, c); }; }
      if (m && m.mat) { m.mat.transparent = false; m.mat.opacity = 1; m.mat.depthWrite = true; }
      return m;
    };
  }
  HUYSUZ.boss('kocaBukalemun', bdef);
  HUYSUZ.zone('col', { enemies: { kumTopaci: 3.5, kaktuscuk: 3, kumTavsani: 3, ruzgarGulu: 2.5, altinTopac: 0.3 }, elites: ['kaktuscuk'], boss: 'kocaBukalemun' });

  // ════════════════ Boss hamleleri (BOSSDAV) ════════════════
  // Aşamalar: 1 (can > %66) · 2 (%66–%33) · 3 (< %33). Her saldırı ≥ 1,2 s önce büyük renkli yer işaretiyle belli; hasar düşük.
  //   saklan   kum rengine bürünür, "püf" diye başka bir yere geçip saklanır. Gözleri ara ara parıldar, Pırıl ışık iziyle gösterir.
  //            Feza yaklaşınca ya da vurunca → bulundu (kıkırdar, sersemler: vuruşlar ×1,5). 10 s'de bulunmazsa kendisi çıkar.
  //   kuyruk   çevresinde pembe halka (1,3 s) → kuyruğuyla döner (aşama 2-3: iki tur), sonra başı döner.
  //   dalga    Feza'ya doğru 1/3/5 şerit (1,3 s işaret) → şeritlerde gökkuşağı renk dalgası yuvarlanır; yana kaç.
  //   kikir    kısa kıkırdama molası (vurma fırsatı).   renk: aşama geçişi (renk şöleni + cümle).
  const BA = () => BOSSDAV.api;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sq = x => x * x;
  const say = (k, p = 2) => { const A = BA(); if (A && A.hasLine(k)) A.say(k, p); };
  // Uyarı cümlesi yer işaretiyle AYNI anda: işaret çizildikten hemen sonra, sırayı beklemeden (yüksek öncelik, interrupt); dövüşte bir kez
  function warn(S, key) {
    const A = BA(); if (!key || !A || !A.hasLine(key)) return;
    const said = S.said || (S.said = {}); if (said[key]) return; said[key] = true;
    try { A.say(key, 3, { interrupt: true }); } catch (e) { /* yok */ }
  }
  const heroR = () => { const A = BA(); return (A && A.T && A.T.heroR) || 0.35; };
  const dmgOf = (b, k) => b.dmg * k * (BA().hard ? 1.25 : 1);
  const RAIN = ['#ff8fc0', '#ffd27a', '#9fe88a', '#7fd4ff', '#c8a8ff'];   // (yalnız dalga rulosunun kendi rengi; uyarılar tek renk: UYARI)
  const UYARI = '#ffa060';
  const LANE = ['#ff4f9a', '#ffa018', '#20b860', '#2090ff', '#9050ff'];   // (yerdeki şerit işaretleri: kumda okunan doygun renkler)   // SADE: bütün yer işaretleri tek, yumuşak renk (kum zeminde okunur)
  // ── renk dalgası havuzu: yerde yuvarlanan yumuşak gökkuşağı rulosu (tek birleşik örgü, paylaşılan malzeme) ──
  let WGEO = null, WMAT = null;
  const WPOOL = [], WAVES = [];
  function waveMesh() {
    if (!WGEO) {
      const k = new Kit();
      for (let i = 0; i < 5; i++) k.add(G.sphere(14, 10), col(RAIN[i]), [(i - 2) * 0.32, 0.32 + 0.08 * Math.sin(i), 0], null, [0.24, 0.3, 0.3]);
      for (let i = 0; i < 9; i++) k.add(G.sphere(8, 6), hdr('#ffffff', 1.4), [(i - 4) * 0.18, 0.62 + 0.08 * Math.sin(i * 2), 0.05], null, 0.05);
      WGEO = k.build(); WGEO.userData.keep = true;
      WMAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: new THREE.Color('#ffb0e0'), emissiveIntensity: 0.25 }); WMAT.userData.keep = true;
    }
    let o = WPOOL.find(w => !w.userData.used);
    if (!o) { o = new THREE.Mesh(WGEO, WMAT); o.castShadow = false; WPOOL.push(o); }
    o.userData.used = true; o.visible = true;
    if (typeof scene !== 'undefined' && !o.parent) scene.add(o);
    return o;
  }
  function freeWave(o) { o.userData.used = false; o.visible = false; if (o.parent) o.parent.remove(o); }
  function clearWaves() { for (const w of WAVES) freeWave(w.mesh); WAVES.length = 0; }
  // stage: canına göre
  const stageOf = b => (b.hp / b.maxHp > 0.66 ? 1 : b.hp / b.maxHp > 0.33 ? 2 : 3);
  function hideSpot(b) {
    const A = BA(), rm = A.bossRoom(), P = A.P;
    if (!rm) return null;
    let best = null, bd = -1;
    for (let t = 0; t < 30; t++) {
      const a = rnd(0, TAU), r = rnd(2, (rm.r || 10) - 2.2), x = rm.x + Math.sin(a) * r, z = rm.z + Math.cos(a) * r;
      if (!A.isFloor(x, z) || !A.circleFree(x, z, 1.2) || !A.inRoom(rm, x, z, 1.2)) continue;
      const dp = Math.hypot(x - P.pos.x, z - P.pos.z), db = Math.hypot(x - b.x, z - b.z);
      if (dp < 4.5 || dp > 9 || db < 3) continue;
      // ekranda kalsın: Feza'nın kuzeyi ya da yanları (kamera güneyden bakar; güneydeki yer ekranın altında kalır)
      const sc = Math.min(dp, 7.5) + Math.min(db, 6) * 0.5 - Math.max(0, z - P.pos.z) * 1.5 + rnd(0, 2);
      if (sc > bd) { bd = sc; best = { x, z }; }
    }
    return best;
  }
  function pointPiril(x, z, s) {   // Pırıl saklanan bukalemunu göstersin (PIRIL3D'nin isteğe bağlı kancası)
    try { if (typeof PIRIL_GUC !== 'undefined' && PIRIL_GUC && typeof PIRIL_GUC.goster === 'function') PIRIL_GUC.goster(x, z, s); } catch (e) { /* yok */ }
  }
  function found(b, S, why) {
    const A = BA();
    b.st.cam = 0; S.hidden = false;
    A.burst('confetti', b.x, 1.4, b.z, { scale: 1.3 });
    A.burst('sparkle', b.x, 1.6, b.z, { color: '#ffd6f0', count: 9 });
    A.fx('ring', b.x, b.z, { r0: 0.4, r1: 3.2, dur: 0.6, color: '#ffb0e0', width: 0.35 });
    A.sfx('pirilKikir', { x: b.x, z: b.z, vol: 0.8, pitch: 0.75 }); A.sfx('pop', { x: b.x, z: b.z, pitch: 0.8 });
    
    S.foundN = (S.foundN || 0) + 1;
    say(why === 'kendi' ? 'pr_bukalemun_cikti' : (S.foundN % 2 ? 'pr_bukalemun_buldun' : 'pr_bukalemun_buldun2'), 2);
    A.bossPhase(b, 'bulundu', 2.6);
  }
  const BUK = {
    hpK: 2.2, keep: 5.5, roarD: 2.2,
    hints: {},   // (ipucu cümleleri hamlenin içinde, işaret çizildiği AN söylenir: warn; 05c'nin sıraya koyduğu geç ipucu yok)
    choose(b, S, d) {
      const A = BA(), stg = stageOf(b);
      if (!S.init) { S.init = true; S.stage = 1; S.foundN = 0; S.sinceHide = 0; }
      if (stg > S.stage) { S.stage = stg; A.bossPhase(b, 'renk', 2.2); return; }
      S.sinceHide++;
      if (S.sinceHide >= (stg === 1 ? 3 : 2)) { S.sinceHide = 0; A.bossPhase(b, 'saklan', 30); return; }
      const opts = stg === 1 ? [['kuyruk', d < 5 ? 0.6 : 0.3], ['dalga', d < 5 ? 0.3 : 0.6], ['kikir', 0.15]]
        : [['kuyruk', d < 5 ? 0.5 : 0.3], ['dalga', d < 5 ? 0.4 : 0.6], ['kikir', 0.1]];
      const ph = A.pickPhase(b, opts);
      A.bossPhase(b, ph, { kuyruk: stg >= 2 ? 3.9 : 3.4, dalga: 3.6, kikir: 1.8 }[ph]);
    },
    moves: {
      saklan(b, S, dt) {
        const A = BA(), t = b.stT, P = A.P;
        if (b.did === 0) {
          b.did = 1; b.st.cam = 0;
          
          A.sfx('pirilKikir', { x: b.x, z: b.z, vol: 0.7, pitch: 0.7 });
          A.burst('sparkle', b.x, 1.4, b.z, { color: '#ffe8b0', count: 6 });
        }
        b.phTM = b.did < 2 ? 0.12 * Math.min(1, t / 1.1) : 0.5;
        if (b.did === 1) {   // renk kuma döner (1 s), sonra "püf!"
          b.st.cam = Math.min(0.9, t / 1.0);
          if (t >= 1.1) {
            b.did = 2;
            A.burst('dust', b.x, 0.5, b.z, { count: 13, scale: 1.8, color: '#f6deb0' });
            A.sfx('whoosh', { x: b.x, z: b.z, pitch: 0.8 }); A.sfx('kumFisilti', { x: b.x, z: b.z, vol: 0.8 });
            const sp = hideSpot(b);
            if (sp) { b.x = sp.x; b.z = sp.z; }
            A.burst('dust', b.x, 0.5, b.z, { count: 9, scale: 1.4, color: '#f6deb0' });
            b.face = Math.atan2(P.pos.x - b.x, P.pos.z - b.z);
            S.hidden = true; S.hideT = 0; S.twT = 0.6; S.trailT = 0; b.st.cam = 1;
            warn(S, 'pr_ipucu_saklan');   // (kuma karıştığı AN)
          }
          return;
        }
        // saklanırken: kum rengi, kıpırdamaz; gözleri ara ara parıldar (ipucu), 3 s sonra Pırıl ışık iziyle gösterir
        S.hideT += dt; b.st.cam = 1; b.st.move = 0;
        if ((S.twT -= dt) <= 0) {
          S.twT = S.hideT > 4 ? 0.55 : 0.9;
          const m = A.muzzle(b);
          A.burst('sparkle', m.x, m.y + 0.35, m.z, { color: '#fff6c8', count: S.hideT > 4 ? 6 : 3 });
          A.sfx('star', { x: b.x, z: b.z, vol: 0.25, pitch: 1.8 });
        }
        if (S.hideT > 3 && (S.trailT -= dt) <= 0) {   // Pırıl'ın ışık izi: Feza'dan bukalemuna doğru uçan parıltılar
          S.trailT = 0.35;
          const dx = b.x - P.pos.x, dz = b.z - P.pos.z, l = Math.hypot(dx, dz) || 1;
          A.emitP(P.pos.x + dx / l * 1.2, 1.6, P.pos.z + dz / l * 1.2, dx / l * 4.5, 0.2, dz / l * 4.5, Math.min(1.6, l / 4.5), 0.28, 0.06, '#fff2a0', '#ffd0f0', 0, 0, 0);
          if (!S.saidHint) { S.saidHint = true; say('pp_bukalemun_ipucu', 2); pointPiril(b.x, b.z, 6); }
        }
        if (S.hideT > 5 && (S.rgT = (S.rgT || 0) - dt) <= 0) { S.rgT = 1.4; A.fx('ring', b.x, b.z, { r0: 0.6, r1: 2.6, dur: 0.9, color: '#fff2a0', width: 0.2 }); }   // yerde yumuşak parıltı halkası
        const d = Math.hypot(P.pos.x - b.x, P.pos.z - b.z);
        if (d < b.r + 1.4) { found(b, S, 'feza'); return; }
        if (S.hideT > 10) found(b, S, 'kendi');
      },
      bulundu(b, S, dt) {
        const A = BA(), t = b.stT;
        b.st.cam = 0;
        if ((S.dzT = (S.dzT || 0) - dt) <= 0) { S.dzT = 0.9; A.burst('star', b.x, b.height + 0.3, b.z, { count: 2, color: '#fff3a0' }); }
        if (b.did === 0 && t > 0.5) { b.did = 1; A.burst('hearts', b.x, b.height, b.z, { count: 2 }); }
        if (t >= b.phD) { S.saidHint = false; A.bossEnd(b, 0.6, 1.0); }
      },
      kuyruk(b, S, dt) {
        const A = BA(), t = b.stT, R = 3.4, W0 = 1.3, spins = S.stage >= 2 ? 2 : 1, SP = 1.0 * spins;
        b.st.spins = spins;
        if (b.did === 0) {
          b.did = 1; b.tele = null; zoneMark(b.x, b.z, R, '#ff5fb0', W0 + SP + 0.2, 0.16); warn(S, 'pr_ipucu_kuyruk');   // (tek işaret: soluk dolgu ≤ 0,2 + belirgin kenar, zeminde)   // SADE4: ses "pembe halka" → belirgin pembe
          A.sfx('whoosh', { x: b.x, z: b.z, pitch: 0.6, vol: 0.5 });
        }
        if (b.did === 1 && t >= W0) { b.did = 2; S.hitK = false; S.ringT = 0; }
        if (b.did === 2) {
          if ((S.ringT -= dt) <= 0) { S.ringT = 0.5; A.fx('ring', b.x, b.z, { r0: 1.0, r1: R, dur: 0.35, color: '#ff5fb0', width: 0.22 }); A.sfx('whoosh', { x: b.x, z: b.z, pitch: rnd(0.9, 1.2), vol: 0.6 }); }
          const P = A.P;
          if (!S.hitK && !P.dead && sq(P.pos.x - b.x) + sq(P.pos.z - b.z) < sq(R + heroR() * 0.5)) { S.hitK = true; A.hurtPlayer(dmgOf(b, 0.32), b.x, b.z, 1.5); A.burst('confetti', P.pos.x, 1, P.pos.z, { scale: 0.7 }); }
          if (t >= W0 + SP) { b.did = 3; A.sfx('bounce', { x: b.x, z: b.z, pitch: 0.7 }); }
        }
        // model zamanlaması: phaseT 0.38 → dönüş başı (W0), 0.68 → dönüş sonu
        b.phTM = t < W0 ? 0.38 * t / W0 : t < W0 + SP ? 0.38 + 0.3 * (t - W0) / SP : 0.68 + 0.32 * Math.min(1, (t - W0 - SP) / Math.max(0.3, b.phD - W0 - SP));
        if (t >= b.phD) { S.n = (S.n || 0) + 1; A.bossEnd(b, 0.9, 1.4); }
      },
      dalga(b, S, dt, d, ux, uz) {
        const A = BA(), t = b.stT, W0 = 1.35, LEN = 11, Wd = 1.5;
        if (b.did === 0) {
          b.did = 1; const n = S.stage === 1 ? 1 : 3, a0 = Math.atan2(ux, uz), spread = n === 1 ? 0 : S.stage === 2 ? 0.5 : 0.62;   // (SADE: en çok 3 şerit)
          S.lanes = [];
          for (let i = 0; i < n; i++) {
            const a = a0 + (i - (n - 1) / 2) * spread, sx = Math.sin(a), sz = Math.cos(a);
            const x0 = b.x + sx * (b.r + 0.3), z0 = b.z + sz * (b.r + 0.3), len = Math.min(LEN, A.laneLen ? Math.max(4, A.laneLen(x0, z0, sx, sz, LEN, 0.4, A.bossRoom())) : LEN);
            S.lanes.push({ x0, z0, sx, sz, len, delay: Math.abs(i - (n - 1) / 2) * 0.3, col: RAIN[i % RAIN.length] });
            laneMark(x0, z0, x0 + sx * len, z0 + sz * len, Wd, LANE[i % LANE.length], W0 + Math.abs(i - (n - 1) / 2) * 0.3 + 0.6, 0.2);   // (soluk dolgu, belirgin kenar)   // SADE4: ses "renkli şeritler"
          }
          b.face = a0;
          warn(S, 'pr_ipucu_dalga');   // (şeritler yerde, aynı anda)
        }
        if (b.did === 1 && t >= W0) {
          b.did = 2; A.sfx('slam', { x: b.x, z: b.z, vol: 0.5, pitch: 1.3 }); A.shake(0.1);
          for (const L of S.lanes) WAVES.push({ b, L, t: -L.delay, mesh: waveMesh(), hit: false });
        }
        b.phTM = Math.min(1, t / (W0 + 0.6)) * 0.7;
        if (t >= b.phD) { S.n = (S.n || 0) + 1; A.bossEnd(b, 0.9, 1.4); }
      },
      kikir(b, S, dt) {
        const A = BA(), t = b.stT;
        if (b.did === 0) { b.did = 1; A.sfx('pirilKikir', { x: b.x, z: b.z, vol: 0.6, pitch: 0.65 }); }
        if (t >= b.phD) A.bossEnd(b, 0.5, 0.9);
      },
      renk(b, S, dt) {
        const A = BA(), t = b.stT;
        if (b.did === 0) {
          b.did = 1; 
          A.burst('confetti', b.x, 2, b.z, { scale: 1.6 }); A.fx('ring', b.x, b.z, { r0: 0.5, r1: 5, dur: 0.8, color: '#ffd27a', width: 0.4 });
          A.sfx('levelup', { x: b.x, z: b.z, vol: 0.5, pitch: 0.9 });
          { const k = S.stage === 2 ? 'pr_bukalemun_asama2' : 'pr_bukalemun_asama3', A2 = BA(); if (A2 && A2.hasLine(k)) try { A2.say(k, 3, { interrupt: true }); } catch (e) { /* yok */ } }   // (aşama cümlesi kendi renk şöleniyle aynı anda)
        }
        if ((S.rT = (S.rT || 0) - dt) <= 0) { S.rT = 1.2; A.burst('sparkle', b.x + rnd(-1, 1), rnd(1, 2.4), b.z + rnd(-1, 1), { color: RAIN[(Math.random() * 5) | 0], count: 2 }); }
        if (t >= b.phD) A.bossEnd(b, 0.4, 0.8);
      },
    },
    hit(b, amount, o, S) {
      if (S.hidden && b.ph === 'saklan') { found(b, S, 'feza'); }
      else if (b.ph === 'bulundu') amount = Math.round(amount * 1.5);
      else if (b.ph === 'kikir') amount = Math.round(amount * 1.2);
      // her aşama görünsün: can %66 / %33 eşiğini, o aşamanın "renk" şöleni gelmeden aşamaz (fazlası boşa gider)
      const st = S.stage || 1, floorK = st === 1 ? 0.64 : st === 2 ? 0.31 : 0;
      if (floorK && (b.hp - amount) / b.maxHp < floorK) amount = Math.max(0, b.hp - Math.ceil(b.maxHp * floorK));
      return amount;
    },
    update(dt) {
      zoneTick(dt);
      const A = BA(); if (!A) return;
      // dalgalar
      for (let i = WAVES.length - 1; i >= 0; i--) {
        const w = WAVES[i], L = w.L; w.t += dt;
        if (w.t < 0) { w.mesh.visible = false; continue; }
        const s = w.t * 6.5, x = L.x0 + L.sx * s, z = L.z0 + L.sz * s;
        w.mesh.visible = true;
        w.mesh.position.set(x, 0, z); w.mesh.rotation.set(0, Math.atan2(L.sx, L.sz), 0);
        const g = Math.min(1, w.t / 0.25) * (1 - sm((s - L.len + 1) / 1));
        w.mesh.scale.set(1 + 0.4 * Math.min(1, s / 4), 0.4 + 0.6 * g + 0.1 * Math.sin(w.t * 20), 1);
        if ((w.pT = (w.pT || 0) - dt) <= 0) { w.pT = 0.5; A.burst('sparkle', x, 0.5, z, { color: L.col, count: 2 }); }
        const P = A.P;
        if (!w.hit && !P.dead && w.b && !w.b.dead) {
          const px = P.pos.x - L.x0, pz = P.pos.z - L.z0, along = px * L.sx + pz * L.sz, side = Math.abs(px * L.sz - pz * L.sx);
          if (side < 0.75 + heroR() * 0.5 && Math.abs(along - s) < 0.6) { w.hit = true; A.hurtPlayer(dmgOf(w.b, 0.28), x, z, 0.9); A.burst('confetti', P.pos.x, 1, P.pos.z, { scale: 0.6 }); }
        }
        if (s >= L.len) { A.burst('sparkle', x, 0.6, z, { color: L.col, count: 4 }); freeWave(w.mesh); WAVES.splice(i, 1); }
      }
      // giriş: Feza arenaya gelmeden bukalemun kuma karışmış bekler (tanıtım anında renklenir)
      const b = typeof GAME !== 'undefined' && GAME.boss;
      if (b && b.type === 'kocaBukalemun' && !b.dead && b.st) {
        if (!b.aggro) { b.st.cam = Math.min(1, (b.st.cam || 0) + dt); b.introHid = true; }
        else if (b.introHid && b.ph !== 'saklan') {
          if (b.st.cam > 0.01) b.st.cam = Math.max(0, b.st.cam - dt * 1.4);
          if (!b.introPop) { b.introPop = true; A.burst('confetti', b.x, 1.6, b.z, { scale: 1.5 }); A.burst('sparkle', b.x, 1.8, b.z, { color: '#ffd6f0', count: 12 }); A.sfx('pirilKikir', { x: b.x, z: b.z, vol: 0.8, pitch: 0.7 }); }
        }
      }
    },
  };
  function hook() {
    if (typeof BOSSDAV === 'undefined' || !BOSSDAV.register) return;
    BOSSDAV.register('kocaBukalemun', BUK);
    // bölüm / karşılaşma değişince dalgaları temizle
    const tryOn = () => {
      if (typeof GAME === 'undefined' || !GAME || !GAME.on) { setTimeout(tryOn, 300); return; }
      GAME.on('zone', clearWaves);
      GAME.on('boss', o => { if (o && !o.on) clearWaves(); });
      GAME.on('happy', e => {
        if (!e) return;
        if (e.boss && e.type === 'kocaBukalemun') { clearWaves(); return; }
        if (!RARE[e.type]) return;
        try {   // nadir: "gizli" çıkartma + altın şeker
          const P = GAME.P;
          if (P && P.cikartmalar && P.cikartmalar[e.type]) P.cikartmalar[e.type].tur = 'gizli';
          if (GAME.addGoldSugar) GAME.addGoldSugar(1);
          if (typeof FX !== 'undefined' && FX) {
            if (FX.burst) { FX.burst('confetti', e.x, 1.0, e.z, { scale: 1.4 }); FX.burst('sparkle', e.x, 1.2, e.z, { color: '#ffd84a', count: 10 }); }
            if (FX.floatText) FX.floatText(e.x, 1.9, e.z, '+1 altın şeker', 'word');
          }
        } catch (err) { console.warn('[col] nadir', err); }
      });
    };
    tryOn();
  }
  hook();
})();
