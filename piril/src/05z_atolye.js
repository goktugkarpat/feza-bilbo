/* ── Saat Kulesi Oyuncak Atölyesi: huysuzlar + boss (Feza ile Pırıl) ──
   Huysuzlar: canlanmış kurmalı oyuncaklar (hepsi SEVİMLİ: gülen yüz, kızgın kaş yok, böcek yok; neşelenince kalp saçıp kaybolur).
     kurmaliFare  Kurmalı Fare   sırtında dönen kurma anahtarı, minik tekerlekler; anahtar hızlanınca "vızzz" diye kayarak gelir (kayan)
     topac        Topaç          çizgili alt gövdesi fırıl fırıl döner; sallanıp hızlanır, dönerek üstüne gelir (yuvarlanan)
     kagitUcak    Kâğıt Uçak     havada süzülür, yatıp kalkar; burnunu kaldırıp minik kâğıt top atar (uzak, uçan)
     askercik     Tahta Askercik davul çalarak yürür; tokmakları kaldırıp "dum!" diye vurur (yakın) — ELİT (taçlı, büyük)
     yayliTop     Yaylı Top      yay üstünde renkli top: yayı ezip "boing!" diye zıplar (zıplayan)
     altinFare    Altın Fare     nadir (gizli): parıl parıl altın kurmalı fare
   Boss: kocaAyicik — Kurmalı Koca Ayıcık. Sırtındaki dev anahtar döndükçe hareket eder; anahtar durunca uyuklar (vurma fırsatı,
   hasar ×1,6), sonra kendini "tık tık tık" kurar. Hamleler: bloklar (yumuşak oyuncak blok fırlatır), zil (zilli yürüyüş: şeritte
   yürür), gobek (göbek zıplaması, 2. aşamadan), yagmur (bloklar tavandan, 3. aşama), uyku, sasir (aşama geçişi, vurulmaz).
   Üç aşama: %66 ve %33'te "Hoppala!" (anahtar fırıl fırıl, ayıcık kendi çevresinde döner). Neşelenince 4. ışığı verir (motor:
   ingredient isik4 → PIRIL_GUC.ac(4)); ayrıca müzik kutusu ezgisi + dans.
   Biçim: PIRIL.md › 6, modeller EMODEL.KIT Rig'i (tek iskelet, tek çizim). Genel ad: HZ_ATOLYE (bölüm dosyası mini sahne için okur). */
const HZ_ATOLYE = (() => {
  'use strict';
  // SADE (okunurluk): Feza okumayı bilmiyor → boss sözcük balonları seyrek (en çok 9 sn'de bir; ses ve hareket yine anlatır)
  //   ATOLYE2: dünyada beliren sözcük balonları tamamen kapalı (ekranda üst üste yazı olmasın; ses + hareket anlatır).
  const sadeFt = () => {};
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
    m.fill.material.color.set(col); m.fill.material.opacity = fillOp ?? 0.28;
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
    m.fill.scale.set(w, 1, len); const ew = Math.max(0.12, w * 0.07);
    m.edges.forEach((e, i) => { e.scale.set(ew, 1, len); e.position.x = (i ? 1 : -1) * (w / 2 - ew / 2); });
    return zmShow(m, col, dur, fillOp);
  }
  function zoneTick(dt) { for (const m of ZM.pool) if (m.on && (m.t += dt) >= m.d) { m.on = false; m.g.visible = false; } }
  const PI = Math.PI;
  const E = typeof EMODEL !== 'undefined' ? EMODEL : null;
  const HAS = !!(E && E.KIT && E.addType && E.buildRaw && E.register);
  const K = HAS ? E.KIT : null, G = HAS ? K.G : null;
  const col = h => new THREE.Color(h), hdr = (h, k) => new THREE.Color(h).multiplyScalar(k);
  const mixc = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  const sm = x => smooth01(x);
  const bumpU = (u, a, b) => (u > a && u < b ? Math.sin(PI * (u - a) / (b - a)) : 0);
  const yuz = o => Object.assign({ tilt: 0.3, browT: 0.32, browRaise: 0.26 }, o);

  // ── ortak hareket yardımcıları (05h'den uyarlandı) ──
  function boing(s, st, dt, b, k = 1) {   // vurulunca sönümlü yay
    if (st.hurt > (s.hzH || 0) + 0.25) s.hzB = 0;
    s.hzH = st.hurt;
    if (s.hzB === undefined || s.hzB > 1.2) return;
    s.hzB += dt;
    const w = Math.sin(s.hzB * 30) * Math.exp(-s.hzB * 5.5) * 0.22 * k;
    b.scale.y *= 1 + w; b.scale.x *= 1 - w * 0.6; b.scale.z *= 1 - w * 0.6;
  }
  function gag(s, st, dt, D, every = 5) {   // dururken arada bir D s'lik komik gösteri: 0..1 ya da -1
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
    if (u < 0.2) { const k = Math.sin(PI * u / 0.2); sy -= 0.22 * k * A; sxz += 0.12 * k * A; }
    else if (u < 0.82) { const k = (u - 0.2) / 0.62; air = Math.sin(PI * k) * A; y = air * h; const s2 = Math.abs(Math.cos(PI * k)); sy += 0.14 * s2 * A; sxz -= 0.06 * s2 * A; }
    else { const k = Math.sin(PI * (u - 0.82) / 0.18); sy -= 0.24 * k * A; sxz += 0.14 * k * A; }
    HOP.y = y; HOP.sy = sy; HOP.sxz = sxz; HOP.u = u; HOP.air = air;
    return HOP;
  }
  const breath = (s, f = 2.4) => Math.sin(s.t * f + s.ph);
  // parlak altın parıltılar (nadir)
  function glints(r, pts, c = '#fff6c8') {
    r.fx(1, 0);
    for (const p of pts) { r.add(G.octa(), hdr(c, 2.2), p, [0, 0, 0], [p[3], p[3] * 1.9, p[3] * 0.5]); r.add(G.octa(), hdr(c, 2.2), p, [0, 0, PI / 2], [p[3], p[3] * 1.9, p[3] * 0.5]); }
    r.fx(0, 0);
  }
  // Kurma anahtarı (yerel: şaft −z yönünde, iki halkalı sap x-y düzleminde). p = şaftın gövdeye girdiği yer, s = ölçek
  function windKey(r, p, s, c = '#ffc94a', glossK = 2) {
    r.fx(0, glossK);
    r.add(G.cyl(1, 1, 10), c, [p[0], p[1], p[2] - 0.12 * s], [PI / 2, 0, 0], [0.035 * s, 0.24 * s, 0.035 * s]);
    r.add(G.cyl(1, 1, 12), c, [p[0], p[1], p[2] - 0.25 * s], [PI / 2, 0, 0], [0.07 * s, 0.05 * s, 0.07 * s]);
    for (const sd of [-1, 1]) {
      r.add(G.torus(TAU, 0.3, 18), c, [p[0] + sd * 0.15 * s, p[1], p[2] - 0.29 * s], null, [0.12 * s, 0.1 * s, 0.14 * s]);
      r.add(G.sphere(10, 8), c, [p[0] + sd * 0.15 * s, p[1], p[2] - 0.29 * s], null, [0.06 * s, 0.05 * s, 0.035 * s]);
    }
    r.fx(0, 0);
  }

  // ════════════════ 1. Kurmalı Fare ════════════════
  // Lavanta teneke fare: damla gövde, büyük yuvarlak kulaklar (iç pembe), uzun burun + pembe burun ucu, bıyıklar, kıvrık tel kuyruk,
  // altta 4 minik tekerlek, sırtta altın kurma anahtarı. Bekleme: kendi kuyruğunu kovalar gibi bir tur döner.
  function buildFare(r, o) {
    const E2 = o.elite, gold = !!o.rare;
    const body = gold ? col('#ffc94a') : E2 ? col('#a990e6') : col('#b8a8dc'), light = gold ? col('#fff0b0') : col('#e8e0fa'), deep = gold ? col('#d39a20') : col('#7c6aa8');
    r.bone('body', 'root', [0, 0.28, 0]);
    r.bone('head', 'body', [0, 0.36, 0.2]);
    r.bone('earL', 'head', [0.14, 0.52, 0.12]); r.bone('earR', 'head', [-0.14, 0.52, 0.12]);
    r.bone('key', 'body', [0, 0.42, -0.2]);
    r.bone('tail', 'body', [0, 0.2, -0.36]);
    r.bone('wheels', 'root', [0, 0.06, 0]);
    const g = K.vgrad(0.06, 0.55, [[0, deep], [0.5, body], [1, light]]);
    r.on('body').fx(0, gold ? 2 : 0.9);
    r.add(G.sphere(26, 18), g, [0, 0.28, -0.04], null, [0.27, 0.23, 0.36]);
    // teneke birleşim çizgisi + perçinler
    r.fx(0, 1.2).add(G.torus(TAU, 0.06, 32), deep, [0, 0.27, -0.04], [PI / 2, 0, 0], [0.27, 0.36, 0.22]);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; r.add(G.sphere(6, 5), '#ffe08a', [Math.sin(a) * 0.272, 0.27, -0.04 + Math.cos(a) * 0.36], null, 0.018); }
    // karın: açık pembe oval
    r.fx(0, 0.4).add(G.sphere(16, 10), '#ffd6e8', [0, 0.17, 0.08], null, [0.17, 0.08, 0.2]);
    // tekerlekler
    r.on('wheels').fx(0, 0.6);
    for (const [x, z] of [[0.15, 0.16], [-0.15, 0.16], [0.15, -0.2], [-0.15, -0.2]]) {
      r.add(G.cyl(1, 1, 14), '#ff6f8f', [x, 0.06, z], [0, 0, PI / 2], [0.06, 0.04, 0.06]);
      r.add(G.sphere(8, 6), '#fff2c0', [x * 1.18, 0.06, z], null, [0.015, 0.025, 0.025]);
    }
    // baş: burun (koni), pembe uç, yüz
    r.on('head').fx(0, gold ? 2 : 0.8);
    const HC = [0, 0.38, 0.2], HR = 0.17;
    r.add(G.sphere(22, 16), mixc(body, light, 0.25), HC, null, [HR, HR * 0.95, HR]);
    r.add(G.cone(16), mixc(body, light, 0.4), [0, 0.33, 0.39], [PI / 2, 0, 0], [0.09, 0.2, 0.08]);
    r.fx(0, 0.8).add(G.sphere(12, 8), '#ff7fa8', [0, 0.33, 0.49], null, 0.035);
    r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.3), [-0.01, 0.345, 0.515], null, 0.009);
    r.fx(0, 0.2);
    for (const sd of [-1, 1]) for (const k of [-1, 1]) r.seg([sd * 0.05, 0.33 + k * 0.01, 0.43], [sd * 0.17, 0.34 + k * 0.035, 0.4], 0.004, '#6e6a80', 0.003, 5);
    for (const sd of [-1, 1]) {   // kulaklar
      r.on(sd > 0 ? 'earL' : 'earR').fx(0, 0.6);
      r.add(G.sphere(16, 12), body, [sd * 0.15, 0.53, 0.13], [0, 0, -sd * 0.3], [0.13, 0.13, 0.03]);
      r.fx(0, 0.2).add(G.sphere(14, 10), '#ffb3cf', [sd * 0.15, 0.53, 0.15], [0, 0, -sd * 0.3], [0.09, 0.09, 0.015]);
    }
    r.on('head');
    K.face(r, HC, HR, yuz({ bone: 'head', tilt: 0.25, ex: 0.075, ey: 0.035, er: 0.055, iris: '#43306e', skin: mixc(body, light, 0.3), browCol: '#5b4a80', browY: 1.4,
      mouthY: -0.085, mouthW: 0.05, heartY: 1.0, heartX: 1.15, blushCol: '#ff8fbf' }));
    // kuyruk: kıvrık tel
    r.on('tail').fx(0, 0.5);
    let px = 0, py = 0.22, pz = -0.36;
    for (let i = 1; i <= 8; i++) { const u = i / 8, x = Math.sin(u * 5) * 0.08, y = 0.22 + Math.sin(u * PI) * 0.12, z = -0.36 - u * 0.3; r.seg([px, py, pz], [x, y, z], 0.016, '#ff9ec2', 0.014, 6); px = x; py = y; pz = z; }
    r.add(G.sphere(8, 6), '#ff9ec2', [px, py, pz], null, 0.025);
    // kurma anahtarı (dönen)
    r.on('key'); windKey(r, [0, 0.42, -0.2], 0.9, gold ? '#fff2b0' : '#ffc94a');
    if (gold) glints(r.on('body'), [[0.22, 0.5, 0.1, 0.04], [-0.2, 0.42, -0.25, 0.035], [0.05, 0.62, -0.3, 0.03]]);
    if (E2) K.crown(r.on('head'), [0, 0.53, 0.18], 0.4);
    r.on('head').mark('muzzle', [0, 0.33, 0.5]);
    return { height: 0.6, glowC: col('#c7a8ff'), mat: { rough: 0.4, rim: '#ffffff', rimK: 0.3, rimP: 2.2 } };
  }
  function animFare(m, dt, st, s) {
    const B = m.B, b = B.body;
    s.keyA = (s.keyA || 0) + dt * (2.2 + 8 * s.mv + (st.windup >= 0 ? 22 * st.windup : 0) + (st.attack >= 0 && st.attack < 1 ? 14 : 0));
    B.key.rotation.z = s.keyA;
    s.roll = (s.roll || 0) + dt * (s.mv * 14 + (st.attack >= 0 && st.attack < 1 ? 30 : 0));
    let y = Math.abs(Math.sin(s.t * 18)) * 0.012 * s.mv, rx = 0, ry = 0, sy = 1 + 0.02 * breath(s, 3), sxz = 1;
    B.tail.rotation.y = Math.sin(s.t * 6 + s.ph) * 0.3; B.tail.rotation.x = 0.1 * Math.sin(s.t * 3);
    B.earL.rotation.z = -0.05 + Math.sin(s.t * 2.3 + s.ph) * 0.07; B.earR.rotation.z = 0.05 - Math.sin(s.t * 2.1) * 0.07;
    B.head.rotation.x = Math.sin(s.t * 9) * 0.05 * s.mv;
    if (st.windup >= 0) {   // anahtar hızlanır, geriye çömelir, titrer
      const w = sm(st.windup * 1.3);
      rx -= 0.22 * w; sy *= 1 - 0.12 * w; sxz *= 1 + 0.06 * w;
      b.position.x = Math.sin(s.t * 70) * 0.01 * w;
      B.tail.rotation.y = Math.sin(s.t * 40) * 0.6 * w;
      B.earL.rotation.x = -0.6 * w; B.earR.rotation.x = -0.6 * w;
    }
    if (st.attack >= 0 && st.attack < 1) { const a = Math.sin(PI * st.attack); rx += 0.18 * a; B.tail.rotation.x = 0.6 * a; B.earL.rotation.x = -0.8 * a; B.earR.rotation.x = -0.8 * a; }
    { const u = gag(s, st, dt, 1.6, 5);   // bekleme: bir tur fır döner ("dönüp yürür")
      if (u >= 0) { ry = TAU * sm(u); y += Math.abs(Math.sin(u * PI * 4)) * 0.03; s.eyeK = 1 - 0.5 * bumpU(u, 0.8, 1); } }
    b.position.y += y; b.rotation.set(rx, ry, 0); b.scale.set(sxz, sy, sxz);
    B.wheels.rotation.y = ry;
    boing(s, st, dt, b);
  }

  // ════════════════ 2. Topaç ════════════════
  // Alt gövde (sivri uçlu, renk dilimli) fırıl fırıl döner; üstteki kubbe + yüz dönmez (okunur kalsın), tepede tutamak.
  const TOP_P = [[0, 0.02], [0.04, 0.05], [0.18, 0.14], [0.36, 0.26], [0.47, 0.36], [0.5, 0.4], [0.44, 0.44], [0.3, 0.45]];
  const DOME_P = [[0.34, 0.42], [0.335, 0.48], [0.29, 0.57], [0.2, 0.64], [0.08, 0.68], [0, 0.69]];
  const TOPC = ['#ff5f6d', '#ffd84a', '#5fd38a', '#4fb3ff', '#9b7bff', '#ff9f43'];
  function buildTopac(r, o) {
    const E2 = o.elite;
    r.bone('body', 'root', [0, 0.4, 0]);
    r.bone('spin', 'body', [0, 0.25, 0]);
    // dönen alt gövde: açıya göre renk dilimleri (dönünce gökkuşağı)
    const slice = (x, y, z) => { const a = (Math.atan2(x, z) / TAU + 1) % 1, i = Math.floor(a * 6); return col(TOPC[i]).multiplyScalar(0.85 + 0.15 * Math.sin(y * 40)); };
    r.on('spin').fx(0, 1);
    r.add(K.lathe('atTop', TOP_P, 36), slice);
    r.add(G.torus(TAU, 0.12, 36), '#ffffff', [0, 0.4, 0], [PI / 2, 0, 0], [0.5, 0.5, 0.28]);
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; r.add(G.sphere(6, 5), k % 2 ? '#fff2a0' : '#ffffff', [Math.sin(a) * 0.5, 0.41, Math.cos(a) * 0.5], null, 0.035); }
    r.fx(0, 2).add(G.cone(10), '#d8dde8', [0, 0.04, 0], [PI, 0, 0], [0.035, 0.06, 0.035]);
    // dönmeyen kubbe + yüz
    r.on('body').fx(0, 1);
    const band = (x, y) => col(y > 0.6 ? (E2 ? '#ffd84a' : '#ff8fb8') : y > 0.52 ? '#fff4e2' : (E2 ? '#ff8fb8' : '#8fd0ff'));
    r.add(K.lathe('atTopD', DOME_P, 36), band);
    r.add(G.cyl(1, 1, 16), '#ff7aa8', [0, 0.73, 0], null, [0.05, 0.1, 0.05]);
    r.add(G.sphere(14, 10), E2 ? '#ffd84a' : '#ff5f9e', [0, 0.8, 0], null, [0.075, 0.06, 0.075]);
    K.face(r, [0, 0.46, 0], 0.335, yuz({ bone: 'body', tilt: 0.45, ex: 0.1, ey: 0.06, er: 0.065, iris: '#2c5aa8', skin: col('#fff4e2'), browCol: '#7a5a8a', browY: 1.35,
      mouthY: -0.04, mouthW: 0.07, heartY: 1.0, heartX: 1.1, blushCol: '#ff8fb0' }));
    if (E2) K.crown(r.on('body'), [0, 0.78, 0], 0.45);
    r.on('body').mark('muzzle', [0, 0.5, 0.38]);
    return { height: 0.85, glowC: col('#ffd06a'), mat: { rough: 0.3, rim: '#ffffff', rimK: 0.35, rimP: 2.2 } };
  }
  function animTopac(m, dt, st, s) {
    const B = m.B, b = B.body;
    const atk = st.attack >= 0 && st.attack < 1;
    s.spinV = damp(s.spinV || 8, 8 + 10 * s.mv + (st.windup >= 0 ? 30 * st.windup : 0) + (atk ? 34 : 0), 4, dt);
    B.spin.rotation.y += s.spinV * dt;
    // yalpalama (presesyon): yavaşken daha çok
    const wob = 0.05 + (st.windup >= 0 ? 0.12 * st.windup : 0), pa = s.t * (3 + s.spinV * 0.2);
    let rx = Math.sin(pa) * wob, rz = Math.cos(pa) * wob, y = 0;
    if (atk) rx += 0.2 * Math.sin(PI * st.attack);
    if (st.windup >= 0) y += 0.05 * sm(st.windup);
    { const u = gag(s, st, dt, 2.4, 5);   // bekleme: yavaşlar, sendeler, "hop!" yeniden hızlanır
      if (u >= 0) { const sl = bumpU(u, 0, 0.75); s.spinV *= 1 - 0.6 * sl * dt * 6; rx += Math.sin(s.t * 5) * 0.3 * sl; rz += Math.cos(s.t * 5) * 0.3 * sl; y += 0.08 * bumpU(u, 0.75, 1); s.eyeWob = sl; } }
    b.position.y += y + Math.abs(Math.sin(s.t * 12)) * 0.01;
    b.rotation.x = rx; b.rotation.z = rz;
    boing(s, st, dt, b, 0.8);
  }

  // ════════════════ 3. Kâğıt Uçak ════════════════
  // Katlanmış beyaz kâğıt uçak (kanatlarda renkli çizgi + yıldız), burunda yuvarlak kâğıt "kabin" üstünde yüz. Süzülür, yatar, kalkar.
  const wingShape = sd => () => { const s = new THREE.Shape(); s.moveTo(0, 0.5); s.lineTo(sd * 0.46, -0.36); s.lineTo(sd * 0.04, -0.26); s.lineTo(0, 0.5); return s; };
  const keelShape = () => { const s = new THREE.Shape(); s.moveTo(0.5, 0); s.lineTo(-0.36, 0.0); s.lineTo(-0.32, -0.14); s.lineTo(0.5, 0); return s; };
  function buildUcak(r, o) {
    const E2 = o.elite, stripe = E2 ? '#ff5f9e' : '#4fb3ff';
    r.bone('body', 'root', [0, 0.4, 0]);
    r.bone('wingL', 'body', [0.02, 0.42, 0]); r.bone('wingR', 'body', [-0.02, 0.42, 0]);
    r.on('body').fx(0, 0.15);
    // omurga (dikey üçgen)
    r.add(K.extrude('atKeel', keelShape, 0.025, 0.004, 4), '#fbfaf4', [0, 0.42, 0], [0, -PI / 2, 0], [1, 1, 1]);
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'wingL' : 'wingR').fx(0, 0.15);
      // kanat: yatay üçgen (biraz yukarı açılı)
      r.push([0, 0.42, 0], [-PI / 2, 0, -sd * 0.12]);
      r.add(K.extrude('atWing' + sd, wingShape(sd), 0.012, 0.003, 4), '#fffef8', [0, 0, 0]);
      r.fx(0, 0.3).add(G.box(), stripe, [sd * 0.2, -0.08, 0.012], [0, 0, sd * 0.84], [0.035, 0.42, 0.006]);
      r.add(K.star5Geo(), '#ffd84a', [sd * 0.24, -0.2, 0.014], null, [0.12, 0.12, 0.1]);
      r.pop();
      // kanat ucunda minik yukarı kıvrım
      r.fx(0, 0.15).add(G.box(), '#f4f2ea', [sd * 0.45, 0.47, -0.32], [0, 0, sd * 0.7], [0.012, 0.1, 0.12]);
    }
    // kabin topu + yüz
    r.on('body').fx(0, 0.3);
    const HC = [0, 0.5, 0.2], HR = 0.14;
    r.add(G.sphere(20, 14), '#fffdf4', HC, null, [HR, HR * 0.92, HR]);
    for (let k = 0; k < 5; k++) { const a = k * 1.3; r.add(G.box(), '#e8e4d6', [Math.sin(a) * HR * 0.99, 0.5 + Math.cos(a * 2) * 0.05, 0.2 + Math.cos(a) * HR * 0.99], [a, a, 0], [0.004, 0.08, 0.004]); }   // kâğıt kırışıkları
    K.face(r, HC, HR, yuz({ bone: 'body', tilt: 0.2, ex: 0.06, ey: 0.03, er: 0.045, iris: '#2c6ab0', skin: col('#fffdf4'), browCol: '#6a7aa0', browY: 1.4,
      mouthY: -0.065, mouthW: 0.045, heartY: 1.0, heartX: 1.2, blushCol: '#ff9ec2' }));
    if (E2) K.crown(r.on('body'), [0, 0.63, 0.2], 0.32);
    r.on('body').mark('muzzle', [0, 0.45, 0.45]);
    return { height: 0.75, glowC: col('#9fd8ff'), mat: { rough: 0.7, rim: '#ffffff', rimK: 0.35, rimP: 2.0 } };
  }
  function animUcak(m, dt, st, s) {
    const B = m.B, b = B.body;
    // süzülme: yavaş dalga, yatış (bank), hafif kanat çırpması
    let rx = Math.sin(s.t * 1.3 + s.ph) * 0.08, rz = Math.sin(s.t * 0.9 + s.ph) * 0.22, y = Math.sin(s.t * 1.7 + s.ph) * 0.08;
    const fl = Math.sin(s.t * 5 + s.ph) * 0.06;
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); rx -= 0.45 * w; y += 0.12 * w; rz *= 1 - w; b.position.x = Math.sin(s.t * 50) * 0.008 * w; }
    if (st.attack >= 0 && st.attack < 1) { const a = Math.sin(PI * st.attack); rx += 0.3 * a; }
    { const u = gag(s, st, dt, 2.2, 5);   // bekleme: havada bir takla (looping)
      if (u >= 0) { rx -= TAU * sm(u); y += Math.sin(u * PI) * 0.25; } }
    B.wingL.rotation.z = fl; B.wingR.rotation.z = -fl;
    b.position.y += y; b.rotation.set(rx, 0, rz);
    boing(s, st, dt, b, 0.8);
  }

  // ════════════════ 4. Tahta Askercik (elit) ════════════════
  // ATOLYE2 (sanat raporu: "ekranda iki Feza var gibi"): artık açıkça bir TAHTA OYUNCAK — çocuk oranı yok.
  //   Mandal bebek gövdesi: kafa + gövde aynı genişlikte tek kalıp (yuvarlak tahta baş, silindir kırmızı ceket), kısa kalın bacak,
  //   sırtında dönen altın kurma anahtarı, boyalı yuvarlak kırmızı yanaklar, uzun lacivert şapka (altın yıldız + ponpon), önde kocaman davul.
  //   Boy ≈ 0,82 m (Feza'nın ~yarısı + şapka); elit (motor ×1,4) içeride ×0,8 kurulur → ≈ 0,92 m: yine Feza'dan belirgin kısa.
  function buildAsker(r, o) {
    const E2 = o.elite, q = E2 ? 0.8 : 1;
    const P = (x, y, z) => [x * q, y * q, z * q], S3 = (x, y, z) => [x * q, y * q, z * q];
    const coat = '#e8364f', coatD = '#b8243c', pants = '#3f6fd8', hat = E2 ? '#ffc94a' : '#2b3a7a', wood = '#f3cf9f';
    r.bone('hips', 'root', P(0, 0.15, 0));
    r.bone('body', 'hips', P(0, 0.16, 0));
    r.bone('head', 'body', P(0, 0.44, 0));
    r.bone('hat', 'head', P(0, 0.6, 0));
    r.bone('key', 'body', P(0, 0.27, -0.14));
    r.bone('armL', 'body', P(0.15, 0.36, 0)); r.bone('armR', 'body', P(-0.15, 0.36, 0));
    r.bone('legL', 'hips', P(0.065, 0.15, 0)); r.bone('legR', 'hips', P(-0.065, 0.15, 0));
    // kısa kalın bacaklar + yuvarlak siyah çizmeler (tahta takoz)
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'legL' : 'legR').fx(0, 0.6);
      r.add(G.cyl(1, 1, 14), pants, P(sd * 0.065, 0.115, 0), null, S3(0.062, 0.09, 0.062));
      r.fx(0, 1.4).add(G.rbox(2), '#22263a', P(sd * 0.065, 0.04, 0.02), null, S3(0.12, 0.08, 0.16));
    }
    // gövde: tek parça boyalı tahta silindir (ceket), altın kemer, beyaz çapraz kemer, düğmeler, apoletler
    r.on('body').fx(0, 1.1);
    r.add(G.cyl(1, 1, 22), K.vgrad(0.14 * q, 0.42 * q, [[0, coatD], [1, coat]]), P(0, 0.28, 0), null, S3(0.14, 0.28, 0.14));
    r.add(G.sphere(18, 8), coatD, P(0, 0.145, 0), null, S3(0.14, 0.035, 0.14));
    r.add(G.cyl(1, 1, 22), '#ffd23f', P(0, 0.19, 0), null, S3(0.145, 0.028, 0.145));
    for (const sd of [-1, 1]) r.add(G.box(), '#ffffff', P(0, 0.3, 0.135), [0, 0, sd * 0.62], S3(0.03, 0.27, 0.014));
    r.fx(0, 2);
    for (let k = 0; k < 2; k++) r.add(G.sphere(8, 6), '#ffd23f', P(0.055, 0.25 + k * 0.08, 0.142), null, 0.017 * q);
    for (const sd of [-1, 1]) r.add(G.cyl(1, 1, 12), '#ffd23f', P(sd * 0.13, 0.405, 0), [0, 0, sd * 0.35], S3(0.06, 0.022, 0.07));
    // kocaman davul (önde, belde): beyaz gövde, kırmızı çemberler, altın zikzak ip, krem deri
    r.fx(0, 0.8).add(G.cyl(1, 1, 24), '#ffffff', P(0, 0.22, 0.2), null, S3(0.12, 0.12, 0.12));
    r.add(G.cyl(1, 1, 24), '#2f6fe0', P(0, 0.165, 0.2), null, S3(0.125, 0.025, 0.125));
    r.add(G.cyl(1, 1, 24), '#2f6fe0', P(0, 0.275, 0.2), null, S3(0.125, 0.025, 0.125));
    r.fx(0, 0.3).add(G.cyl(1, 1, 24), '#fffaf0', P(0, 0.29, 0.2), null, S3(0.112, 0.008, 0.112));
    r.fx(0, 2);
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, b2 = a + 0.45; r.seg(P(Math.sin(a) * 0.123, 0.18, 0.2 + Math.cos(a) * 0.123), P(Math.sin(b2) * 0.123, 0.26, 0.2 + Math.cos(b2) * 0.123), 0.006 * q, '#ffd23f', 0.006 * q, 4); }
    // kurma anahtarı (sırtta, dönen; "oyuncak" olduğunu ilk bakışta söyler)
    windKey(r.on('key'), P(0, 0.27, -0.13), 0.62 * q);
    // kısa mandal kollar + beyaz eldiven + tokmaklar
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.8);
      r.seg(P(sd * 0.155, 0.36, 0), P(sd * 0.15, 0.27, 0.12), 0.042 * q, coat, 0.038 * q, 10);
      r.add(G.sphere(10, 8), '#ffffff', P(sd * 0.15, 0.265, 0.135), null, 0.04 * q);
      r.fx(0, 0.5).seg(P(sd * 0.15, 0.265, 0.135), P(sd * 0.07, 0.33, 0.27), 0.011 * q, '#c98f52', 0.01 * q, 6);
      r.add(G.sphere(10, 8), '#ff9ec2', P(sd * 0.07, 0.335, 0.278), null, 0.028 * q);
    }
    // baş: yuvarlak cilalı tahta (gövdeyle aynı genişlik), boyalı yüz
    r.on('head').fx(0, 1.2);
    const HC = P(0, 0.5, 0), HR = 0.135 * q;
    r.add(G.sphere(22, 16), wood, HC, null, HR);
    K.face(r, HC, HR, yuz({ bone: 'head', tilt: 0.15, ex: 0.05 * q, ey: 0.012 * q, er: 0.042 * q, iris: '#2a2030', skin: col(wood), browCol: '#5a3a28', browY: 1.45,
      mouthY: -0.062 * q, mouthW: 0.042 * q, heartY: 1.0, heartX: 1.15, noBlush: true }));
    // boyalı yuvarlak kırmızı yanaklar (tahta oyuncak işareti)
    r.fx(0, 0.4);
    for (const sd of [-1, 1]) { const a = sd * 0.82, e = -0.22; r.add(G.sphere(12, 8), '#ff5a72', [HC[0] + Math.sin(a) * Math.cos(e) * HR * 0.98, HC[1] + Math.sin(e) * HR, HC[2] + Math.cos(a) * Math.cos(e) * HR * 0.98], [-e, a, 0], [0.024 * q, 0.024 * q, 0.01 * q]); }
    // şapka: uzun silindir şako, siyah siperlik, altın yıldız, kırmızı ponpon
    r.on('hat').fx(0, E2 ? 2 : 0.8);
    r.add(G.cyl(1, 0.9, 20), hat, P(0, 0.685, -0.005), null, S3(0.118, 0.2, 0.118));
    r.fx(0, 1).add(G.cyl(1, 1, 20), '#111428', P(0, 0.592, 0), null, S3(0.126, 0.028, 0.126));
    r.add(G.box(), '#111428', P(0, 0.585, 0.105), [0.3, 0, 0], S3(0.15, 0.018, 0.07));
    r.fx(0, 2).add(K.star5Geo(), E2 ? '#ff5f9e' : '#ffd23f', P(0, 0.69, 0.112), null, S3(0.11, 0.11, 0.1));
    r.fx(0, 0.3).add(G.sphere(12, 8), '#ff4f6a', P(0, 0.81, -0.005), null, S3(0.05, 0.065, 0.05));
    if (E2) K.crown(r, P(0, 0.8, 0), 0.24 * q);
    r.on('body').mark('muzzle', P(0, 0.3, 0.3));
    return { height: 0.84 * q, glowC: col('#ff9a7a'), mat: { rough: 0.32, rim: '#fff4e6', rimK: 0.3, rimP: 2.4 } };
  }
  function animAsker(m, dt, st, s) {
    const B = m.B, b = B.body;
    s.walk = (s.walk || 0) + dt * (2 + 10 * s.mv);
    const w = Math.sin(s.walk) * Math.min(1, s.mv * 1.4);
    B.legL.rotation.x = w * 0.6; B.legR.rotation.x = -w * 0.6;   // tahta gibi dik, paytak adım
    b.position.y += Math.abs(Math.sin(s.walk)) * 0.035 * s.mv;
    b.rotation.z = Math.sin(s.walk) * 0.09 * s.mv;              // oyuncak gibi iki yana yalpalar
    // sırttaki anahtar hep döner (yürürken hızlı)
    s.keyA = ((s.keyA || 0) + dt * (2.5 + 6 * s.mv)) % TAU; if (B.key) B.key.rotation.z = s.keyA;
    // davul: kollar sırayla iner kalkar (yürürken ve dururken yavaşça)
    const dr = s.t * (6 + 4 * s.mv);
    let aL = -0.2 + Math.max(0, Math.sin(dr)) * -0.5, aR = -0.2 + Math.max(0, Math.sin(dr + PI)) * -0.5;
    if (st.windup >= 0) { const k = sm(st.windup * 1.3); aL = lerp(aL, -1.9, k); aR = lerp(aR, -1.9, k); b.rotation.x = -0.15 * k; B.head.rotation.x = -0.15 * k; }
    if (st.attack >= 0 && st.attack < 1) { const a = st.attack, hit = a < 0.25 ? sm(a / 0.25) : 1 - sm((a - 0.4) / 0.6); aL = lerp(-1.9, 0.25, hit); aR = lerp(-1.9, 0.25, hit); b.rotation.x = 0.12 * hit; }
    { const u = gag(s, st, dt, 2.0, 5);   // bekleme: selam verir (sağ kol şapkaya), sonra davula "tıp tıp"
      if (u >= 0) { const sal = bumpU(u, 0, 0.55); aR = lerp(aR, -2.6, sal); B.armR.rotation.z = -0.5 * sal; B.hat.rotation.z = 0.1 * sal; } }
    B.armL.rotation.x = aL; B.armR.rotation.x = aR;
    B.hat.rotation.x = Math.sin(s.t * 3 + s.ph) * 0.04 - b.rotation.x * 0.5;
    boing(s, st, dt, b, 0.9);
  }

  // ════════════════ 5. Yaylı Top ════════════════
  // Kırmızı tabanlı gümüş yayın üstünde 6 renkli plaj topu; yay ezilip "boing" diye fırlar.
  const BALLC = ['#ff5f6d', '#ffffff', '#ffd84a', '#4fb3ff', '#5fd38a', '#ff9ec2'];
  function buildYay(r, o) {
    const E2 = o.elite;
    r.bone('spring', 'root', [0, 0.06, 0]);
    r.bone('ball', 'root', [0, 0.36, 0]);
    r.on('root').fx(0, 0.8).add(G.cyl(1, 1, 22), E2 ? '#9b7bff' : '#ff5f6d', [0, 0.03, 0], null, [0.2, 0.06, 0.2]);
    r.on('spring').fx(0, 2);
    for (let i = 0; i < 6; i++) r.add(G.torus(TAU, 0.18, 22), '#dfe6f0', [0, 0.08 + i * 0.05, 0], [PI / 2, 0, i * 0.15], [0.11, 0.11, 0.11]);
    const C = [0, 0.62, 0], R = 0.28;
    const seg = (x, y, z) => { if (y > C[1] + R * 0.9) return col('#ffffff'); const a = (Math.atan2(x, z) / TAU + 1.0833) % 1; return col(BALLC[Math.floor(a * 6) % 6]); };
    r.on('ball').fx(0, 1).add(G.sphere(28, 20), seg, C, null, R);
    // yüz: beyaz dilimin üstünde (dilim 0 = +z ön: kırmızı-beyaz arası; yüz önde)
    K.face(r, C, R, yuz({ bone: 'ball', tilt: 0.2, ex: 0.1, ey: 0.04, er: 0.075, iris: '#2b4fa0', skin: col('#ffffff'), browCol: '#4a5a80', browY: 1.35,
      mouthY: -0.1, mouthW: 0.08, heartY: 0.95, heartX: 1.1, blushCol: '#ff7fa8' }));
    if (E2) K.crown(r.on('ball'), [0, 0.88, 0], 0.5);
    r.on('ball').mark('muzzle', [0, 0.6, 0.3]);
    return { height: 0.92, glowC: col('#ffa0c0'), mat: { rough: 0.25, rim: '#ffffff', rimK: 0.32, rimP: 2.3 } };
  }
  function animYay(m, dt, st, s) {
    const B = m.B, bl = B.ball, sp = B.spring;
    const g = hopGait(s, st, dt, 2.4, 0.3);
    let y = g.y, ss = g.sy, rx = 0;
    if (st.windup >= 0) { const w = sm(st.windup * 1.3); ss *= 1 - 0.45 * w; bl.position.x = Math.sin(s.t * 60) * 0.012 * w; rx = -0.15 * w; }
    if (st.attack >= 0 && st.attack < 1) { const a = st.attack; ss *= 1 + 0.5 * Math.sin(PI * Math.min(1, a * 1.6)); }
    { const u = gag(s, st, dt, 1.6, 4.5);   // bekleme: üç kez yerinde boing-boing
      if (u >= 0) { const k = Math.abs(Math.sin(u * PI * 3)); y += 0.18 * k; ss *= 0.8 + 0.5 * k; } }
    const sy = clamp(ss, 0.4, 1.6);
    sp.scale.set(1, sy, 1);
    m.B.root.position.y += y;
    bl.position.y += (sy - 1) * 0.3;
    bl.rotation.x = rx + Math.sin(s.t * 4 + s.ph) * 0.06;
    bl.rotation.y = Math.sin(s.t * 1.3 + s.ph) * 0.2;
    boing(s, st, dt, bl, 1.3);
  }

  // ════════════════ Kayıt (huysuzlar) ════════════════
  const RARE_STATS = { hp: 14, dmg: 2, speed: 3.0, xp: 30, gold: 12, aggro: 7 };
  const T = [
    // id, ad, base, saldiri, stats, kurucu, anim, lod, nadir
    ['kurmaliFare', 'Kurmalı Fare', 'cisdamlasi', 'kayan', { eliteAd: 'Kocaman Kurmalı Fare', hp: 20, dmg: 4, speed: 3.0, r: 0.42, height: 0.6, atkRange: 2.6, atkCd: 2.1, windup: 0.85, aggro: 9, trail: 'milk', trailCol: '#e6dcff' }, buildFare, animFare, 0.6],
    ['topac', 'Topaç', 'goblin', 'yuvarlanan', { eliteAd: 'Kocaman Topaç', hp: 24, dmg: 4, speed: 2.6, r: 0.45, height: 0.85, atkRange: 2.4, atkCd: 2.2, windup: 0.85, aggro: 9, trailCol: '#ffe08a' }, buildTopac, animTopac, 0.6],
    ['kagitUcak', 'Kâğıt Uçak', 'kopuk', 'uzak', { eliteAd: 'Kocaman Kâğıt Uçak', hp: 18, dmg: 4, speed: 2.3, r: 0.45, height: 0.75, atkRange: 6.5, range: 6.5, atkCd: 2.8, windup: 0.9, fly: true, hover: 0.9, aggro: 9, shot: { kind: 'kagit', speed: 3.6, r: 0.28, col: '#fffdf2' } }, buildUcak, animUcak, 0.6],
    ['askercik', 'Tahta Askercik', 'goblin', 'yakin', { eliteAd: 'Kocaman Tahta Askercik', hp: 28, dmg: 5, speed: 2.4, r: 0.4, height: 0.84, atkRange: 1.15, atkCd: 1.9, windup: 0.8, aggro: 9 }, buildAsker, animAsker, 0.55],
    ['yayliTop', 'Yaylı Top', 'yogurt', 'ziplayan', { eliteAd: 'Kocaman Yaylı Top', hp: 22, dmg: 4, speed: 2.5, r: 0.45, height: 0.92, atkRange: 2.4, atkCd: 2.0, windup: 0.8, aggro: 9 }, buildYay, animYay, 0.6],
    ['altinFare', 'Altın Fare', 'cisdamlasi', 'kayan', Object.assign({ r: 0.42, height: 0.6, atkRange: 2.4, atkCd: 2.4, windup: 0.95, trail: 'milk', trailCol: '#fff0b0' }, RARE_STATS), (r, o) => buildFare(r, Object.assign({}, o, { rare: true })), animFare, 0.6, true],
  ];
  const RARE = {};
  for (const [id, ad, base, saldiri, stats, mk, an, lod, rare] of T) {
    const def = { ad, base, saldiri, stats, ilkSoz: 'pr_ilk_' + id };
    if (HAS) { E.addType(id, mk, an, lod); def.model = o => E.buildRaw(id, o || {}); }
    if (rare) RARE[id] = true;
    HUYSUZ.type(id, def);
  }

  // ════════════════ Boss: Kurmalı Koca Ayıcık ════════════════
  const AY = { fur: '#c98a4e', furL: '#e6b27a', furD: '#8f5a2e', belly: '#f6dcb4', muzzle: '#fbe8cc', nose: '#5a3424', pad: '#ffb3c6', bow: '#ff4f7a', key: '#ffc94a', bell: '#ffd23f' };
  // uykulu göz kapakları (05b'deki gibi): 'lids' kemiği, rotation.x ile kapanır
  function lids(r, bone, c, R, tilt, ex, ey, er, lidCol, lashCol) {
    const inset = er * 0.3, eu = new THREE.Euler(-tilt, 0, 0), p0 = onSphere(ex, ey, R, inset)[0];
    const ec = new THREE.Vector3(0, p0[1], p0[2]).applyEuler(eu).add(new THREE.Vector3(...c));
    r.bone('lids', bone, [0, ec.y, ec.z]);
    r.on('lids').push(c, [-tilt, 0, 0]);
    for (const sd of [-1, 1]) {
      const [p, q] = onSphere(sd * ex, ey, R, inset); r.push(p, q);
      r.fx(0, 0.3).add(G.hemi(24), lidCol, [0, 0, 0], null, [er * 1.16, er * 1.26, er * 0.78]);
      r.fx(0, 0.3).add(G.torus(PI, 0.09, 18), lashCol, [0, 0, 0], [PI / 2, 0, 0], [er * 1.13, er * 0.76, er * 0.9]);
      r.pop();
    }
    r.pop().fx(0, 0);
  }
  function buildAyicik(r) {
    r.bone('body', 'root', [0, 1.2, 0]);
    r.bone('head', 'body', [0, 2.15, 0.08]);
    r.bone('earL', 'head', [0.55, 2.95, 0.05]); r.bone('earR', 'head', [-0.55, 2.95, 0.05]);
    r.bone('armL', 'body', [0.82, 1.85, 0.05]); r.bone('armR', 'body', [-0.82, 1.85, 0.05]);
    r.bone('legL', 'root', [0.45, 0.62, 0]); r.bone('legR', 'root', [-0.45, 0.62, 0]);
    r.bone('key', 'body', [0, 1.45, -0.92]);
    r.bone('bow', 'body', [0, 2.0, 0.55]);
    // gövde: armut biçimli peluş + açık karın + kalp dikiş
    const fur = K.vgrad(0.3, 2.2, [[0, AY.furD], [0.5, AY.fur], [1, AY.furL]]);
    r.on('body').fx(0, 0, 0, 0.6);
    r.add(G.sphere(36, 26), fur, [0, 1.3, 0], null, [1.02, 1.0, 0.92]);
    r.fx(0, 0).add(G.sphere(28, 20), AY.belly, [0, 1.2, 0.42], null, [0.72, 0.72, 0.55]);
    r.fx(0, 0.5).add(K.heartGeo(), '#ff7aa8', [0.18, 1.5, 0.94], [-0.15, 0, 0], 0.22);
    r.fx(0, 0);
    for (let k = 0; k < 9; k++) { const a = -0.9 + k * 0.22; r.add(G.box(), '#a8724a', [Math.sin(a) * 0.71, 1.2 + Math.cos(a) * 0.71, 0.86 - Math.abs(Math.sin(a)) * 0.18], [0, 0, -a], [0.012, 0.07, 0.02]); }   // karın dikişi
    // yama (mavi kareli) + dikişler
    r.fx(0, 0.2).add(G.rbox(2), '#7ab8ff', [-0.62, 0.95, 0.62], [0, -0.6, 0.2], [0.34, 0.3, 0.05]);
    for (let k = 0; k < 4; k++) r.add(G.box(), '#ffffff', [-0.62 + (k - 1.5) * 0.07, 0.95, 0.66], [0, -0.6, 0.2], [0.012, 0.3, 0.012]);
    // papyon (puantiyeli)
    r.on('bow').fx(0, 0.6);
    for (const sd of [-1, 1]) {
      r.add(G.sphere(18, 12), AY.bow, [sd * 0.24, 2.02, 0.68], [0, 0, sd * 0.25], [0.24, 0.16, 0.1]);
      for (let k = 0; k < 3; k++) r.add(G.sphere(6, 5), '#ffffff', [sd * (0.16 + k * 0.08), 2.05 - (k % 2) * 0.07, 0.77], null, [0.025, 0.025, 0.01]);
    }
    r.add(G.sphere(14, 10), '#ff7aa0', [0, 2.02, 0.72], null, [0.09, 0.09, 0.08]);
    // bacaklar: yumuşak silindir + ayak tabanı (pembe)
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'legL' : 'legR').fx(0, 0, 0, 0.5);
      r.add(G.sphere(22, 16), fur, [sd * 0.46, 0.45, 0.05], null, [0.36, 0.45, 0.38]);
      r.add(G.sphere(22, 14), fur, [sd * 0.48, 0.16, 0.25], null, [0.33, 0.18, 0.42]);
      r.fx(0, 0.2).add(G.sphere(18, 12), AY.pad, [sd * 0.48, 0.17, 0.66], [-0.3, 0, 0], [0.24, 0.15, 0.05]);
      for (let k = 0; k < 3; k++) r.add(G.sphere(8, 6), AY.pad, [sd * 0.48 + (k - 1) * 0.11, 0.32, 0.6], null, [0.055, 0.05, 0.03]);
      // ayak bileğinde zil
      r.fx(0, 2).add(G.sphere(12, 10), AY.bell, [sd * 0.78, 0.36, 0.12], null, 0.1);
      r.fx(0, 0.4).add(G.box(), '#8a5a10', [sd * 0.78, 0.33, 0.215], null, [0.1, 0.012, 0.01]);
      r.fx(0, 0.3).add(G.torus(TAU, 0.18, 20), '#ff4f7a', [sd * 0.62, 0.4, 0.1], [0.1, 0, PI / 2 + sd * 0.15], [0.16, 0.2, 0.2]);
    }
    // kollar: kalın, aşağı sarkan; patiler + bilekte zil
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0, 0, 0.5);
      r.seg([sd * 0.82, 1.85, 0.05], [sd * 1.18, 1.2, 0.3], 0.27, fur, 0.24, 16);
      r.add(G.sphere(20, 14), fur, [sd * 1.2, 1.12, 0.33], null, [0.28, 0.27, 0.27]);
      r.fx(0, 0.2).add(G.sphere(16, 10), AY.pad, [sd * 1.22, 1.06, 0.55], [-0.4, 0, 0], [0.15, 0.12, 0.05]);
      r.fx(0, 2).add(G.sphere(12, 10), AY.bell, [sd * 1.05, 1.38, 0.42], null, 0.11);
      r.fx(0, 0.4).add(G.box(), '#8a5a10', [sd * 1.05, 1.35, 0.53], null, [0.11, 0.013, 0.01]);
      r.fx(0, 0.3).add(G.torus(TAU, 0.18, 20), '#5fd3ff', [sd * 1.1, 1.45, 0.35], [0.9, 0, sd * 0.5], [0.24, 0.24, 0.24]);
      r.mark(sd > 0 ? 'handL' : 'handR', [sd * 1.25, 1.1, 0.5]);
    }
    // baş: yuvarlak, burun bölgesi, kulaklar
    r.on('head').fx(0, 0, 0, 0.4);
    const HC = [0, 2.6, 0.12], HR = 0.72;
    r.add(G.sphere(34, 24), fur, HC, null, [HR, HR * 0.94, HR * 0.92]);
    const MC = [0, 2.4, 0.62], MR = 0.32;
    r.fx(0, 0).add(G.sphere(24, 16), AY.muzzle, MC, null, [MR * 1.15, MR * 0.85, MR * 0.8]);
    r.fx(0, 0.9).add(G.sphere(18, 12), AY.nose, [0, 2.52, 0.88], null, [0.13, 0.09, 0.09]);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.3), [-0.04, 2.56, 0.96], null, 0.025);
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'earL' : 'earR').fx(0, 0, 0, 0.3);
      r.add(G.sphere(20, 14), fur, [sd * 0.56, 3.1, 0.02], null, [0.27, 0.27, 0.15]);
      r.fx(0, 0).add(G.sphere(16, 12), AY.pad, [sd * 0.56, 3.08, 0.12], null, [0.17, 0.17, 0.06]);
    }
    r.on('head');
    K.face(r, HC, HR, { bone: 'head', tilt: 0.12, ex: 0.27, ey: 0.16, er: 0.15, iris: '#3a2210', skin: col(AY.furL), browCol: '#7a4a30', browY: 1.75, browRaise: 0.2, browT: 0.26,   // SADE/QA: kaşlar yukarıda, ince, kavisli (kızgın okunmasın)
      mc: MC, mR: MR, mTilt: 0.3, mouthY: -0.14, mouthW: 0.2, mouthPivot: true, heartY: 0.95, heartX: 1.1, heartS: 0.2, blushCol: '#ff8fa8', blushX: 0.6, blushY: 0.9 });
    lids(r, 'head', HC, HR, 0.12, 0.27, 0.16, 0.15, AY.furL, '#5a3424');
    // sırttaki dev kurma anahtarı (anahtar kemiği z ekseninde döner)
    r.on('key'); windKey(r, [0, 1.45, -0.92], 2.6, AY.key);
    r.on('body').mark('muzzle', [0, 2.4, 0.95]);
    return { height: 3.4, glowC: col('#ffd08a'), dieHop: 0.1, mat: { rough: 0.85, rim: '#fff0d8', rimK: 0.35, rimP: 2.0, wob: 0.006, wobF: 6, wobS: 2 }, portrait: { cx: 0, cy: 2.5, cz: 0.3, rad: 1.1, dy: 0.2 } };
  }
  function animAyicik(m, dt, st, s) {
    const B = m.B, ph = K.bph(st), t = K.bpt(st), pre = K.preAggro(s, st, ph, dt);
    const br = Math.sin(s.t * 1.5 + s.ph);
    let sy = 1 + 0.02 * br, sxz = 1 - 0.01 * br, y = 0, rx = 0.02 * br, rz = 0, ry = 0;
    let aLx = 0, aLz = 0, aRx = 0, aRz = 0, lL = 0, lR = 0, hx = 0, hz = 0, lidA = -0.6, keyV = 1.4 + 3 * s.mv;
    // yürüyüş: paytak, zilli (tahta oyuncak gibi iki yana yalpalar)
    s.walk = (s.walk || 0) + dt * (1 + 6 * s.mv);
    const w = Math.sin(s.walk) * s.mv;
    lL = w * 0.5; lR = -w * 0.5; rz += w * 0.08; y += Math.abs(Math.sin(s.walk)) * 0.06 * s.mv; aLx = -w * 0.4; aRx = w * 0.4;
    switch (ph) {
      case 'roar': {   // giriş: anahtar fırıl fırıl, gerinir, kollar havaya "Kuruldum!"
        const k = K.bump(t, 0.95); keyV = 14; aLz = 2.2 * k; aRz = -2.2 * k; sy *= 1 + 0.06 * k; hx -= 0.2 * k; s.mouthO = k; lidA = -0.8;
        y += K.bump(t - 0.7, 0.3) * 0.2; break;
      }
      case 'summon': {   // pati çırpar, ziller çınlar
        const c = Math.abs(Math.sin(s.pT * 9)); aLz = 0.9 - 0.5 * c; aRz = -0.9 + 0.5 * c; aLx = aRx = -0.9; keyV = 8; s.mouthW = 1; y += 0.05 * c; break;
      }
      case 'bloklar': {   // blok fırlatma: sırayla kollar geri-öne
        const ph2 = (s.pT * 2.6) % 2, left = ph2 < 1, u = ph2 % 1, sw = u < 0.55 ? -sm(u / 0.55) * 1.4 : -1.4 + sm((u - 0.55) / 0.3) * 2.4;
        if (left) aLx = sw; else aRx = sw;
        ry = (left ? 0.15 : -0.15) * Math.sin(PI * u); keyV = 5; s.mouthW = 0.6; break;
      }
      case 'zil': {   // zilli yürüyüş: kollar havada sallanır, hızlı paytak adımlar
        const k = sm(s.pT / 0.3), ww = Math.sin(s.pT * 12);
        aLz = (1.4 + 0.3 * ww) * k; aRz = -(1.4 - 0.3 * ww) * k; lL = ww * 0.6 * k; lR = -ww * 0.6 * k; rz += ww * 0.1 * k; y += Math.abs(ww) * 0.12 * k; keyV = 12; s.mouthW = 1; break;
      }
      case 'gobek': {   // göbek zıplaması: çömel, havalan (b.y), göbek üstü "pof"
        const air = +st.air || 0;
        if (air <= 0 && s.pT < 0.6) { const c = sm(s.pT / 0.45); sy *= 1 - 0.12 * c; sxz *= 1 + 0.06 * c; aLz = 0.6 * c; aRz = -0.6 * c; }
        else if (air > 0) { aLz = 1.6; aRz = -1.6; lL = -0.5; lR = -0.5; rx = 0.25 * air; s.mouthO = 1; }
        else { const q = K.bump(s.pT - 1.5, 0.6); sy *= 1 - 0.18 * q; sxz *= 1 + 0.12 * q; }
        keyV = 9; break;
      }
      case 'yagmur': {   // tavana bakıp alkış: bloklar yağar
        const c = Math.abs(Math.sin(s.pT * 7)); hx = -0.35; aLz = 2.4 - 0.4 * c; aRz = -2.4 + 0.4 * c; keyV = 10; s.mouthW = 1; break;
      }
      case 'uyku': {   // anahtar yavaşlar ve durur: öne eğilir, gözler kapanır, horlar; sonunda kendini kurar
        const P0 = 0.9, end = s.pT > (st.phaseD || 5) - 0.9;
        const k = sm(s.pT / P0), sn = Math.sin(s.pT * 2.2);
        keyV = end ? -16 : 1.6 * (1 - k);
        lidA = lerp(-0.6, 1.25, k); s.eyeK = lerp(1, 0.4, k); rx += 0.12 * k; hx += 0.22 * k + 0.05 * sn * k; sy *= 1 + 0.04 * sn * k;
        aLz = 0.15 * k; aRz = -0.15 * k; aLx = aRx = 0.25 * k; y -= 0.08 * k; s.mouthO = Math.max(0, sn) * 0.4 * k;
        if (end) { lidA = -0.8; s.eyeK = 1.25; hx = -0.1; y += Math.abs(Math.sin(s.pT * 20)) * 0.05; }
        break;
      }
      case 'sasir': {   // aşama geçişi: "Hoppala!" anahtar fırıl fırıl, kendi çevresinde döner
        const k = sm(s.pT / 0.2); keyV = 28; ry = TAU * sm(s.pT / 1.6); s.eyeK = 1.3; s.mouthO = 1; lidA = -0.9; aLz = 1.2 * k; aRz = -1.2 * k; y += K.bump(s.pT, 1.6) * 0.4; s.eyeWob = 0.6; break;
      }
      // ── boss sonu sevimli an (kutlama ayıcığı, HZ_ATOLYE fest): kur → dans → otur (uyukla) ──
      case 'kur': {   // anahtar son kez fırıl fırıl kurulur, sevinçle hoplar
        keyV = 30; aLz = 1.5 + Math.sin(s.pT * 14) * 0.2; aRz = -1.5 - Math.sin(s.pT * 14) * 0.2; y += Math.abs(Math.sin(s.pT * 9)) * 0.18; lidA = -0.9; break;
      }
      case 'dans': {   // müzik kutusu dansı: iki yana salınır, arada bir fır döner, kollar sırayla havada
        const b4 = s.pT * 4.4, turn = (s.pT % 2.6) / 2.6;
        rz += Math.sin(b4) * 0.13; y += Math.abs(Math.sin(b4)) * 0.14; ry = Math.sin(s.pT * 2.2) * 0.35 + (turn > 0.7 ? TAU * sm((turn - 0.7) / 0.3) : 0);
        aLz = 1.2 + Math.max(0, Math.sin(b4)) * 1.0; aRz = -1.2 - Math.max(0, -Math.sin(b4)) * 1.0; lL = Math.max(0, Math.sin(b4)) * -0.5; lR = Math.max(0, -Math.sin(b4)) * -0.5;
        keyV = 9; lidA = -0.9; break;
      }
      case 'otur': {   // yorulur, oturur, başı öne düşer, horul horul (anahtar durur)
        const k = sm(s.pT / 1.2), sn = Math.sin(s.pT * 2.0);
        y -= 0.55 * k; lL = lR = -1.35 * k; B.legL.position.y -= 0.3 * k; B.legR.position.y -= 0.3 * k;
        hx = 0.28 * k + 0.05 * sn * k; sy *= 1 + 0.035 * sn * k; aLx = aRx = -0.5 * k; aLz = 0.25 * k; aRz = -0.25 * k;
        keyV = 2.5 * (1 - k); lidA = -0.9; s.mouthO = Math.max(0, sn) * 0.35 * k; break;
      }
      case 'dying': {   // neşelendi: el sallar, dans eder, anahtar mutlu döner
        aLz = 2.2 + Math.sin(s.t * 9) * 0.4; aRz = -1.0 - Math.sin(s.t * 6) * 0.3; keyV = 10; lidA = -0.9; ry = Math.sin(s.t * 3) * 0.3; break;
      }
    }
    if (pre > 0.01) { s.eyeK = lerp(s.eyeK, 1.25, pre);   /* SADE/QA: saldırı hazırlığında kısık göz yok → şaşkın kocaman gözler */ hx += 0.2 * pre; keyV *= 1 - pre; }
    if (st.hurt > 0 && ph !== 'dying') { const h = st.hurt * st.hurt, sd = K.hurtSide(s, st); hz += sd * 0.15 * h; s.eyeK = Math.max(s.eyeK, 1 + 0.3 * h); lidA -= 0.9 * h; s.mouthO = Math.max(s.mouthO, h); }
    s.keyV = damp(s.keyV ?? keyV, keyV, 4, dt); s.keyA = (s.keyA || 0) + s.keyV * dt;
    B.key.rotation.z = s.keyA;
    B.body.position.y += y; B.body.scale.set(sxz, sy, sxz); B.body.rotation.set(rx, ry, rz);
    B.head.rotation.set(hx + 0.03 * Math.sin(s.t * 1.2), 0.05 * Math.sin(s.t * 0.7 + s.ph), hz);
    B.armL.rotation.set(aLx, 0, aLz + 0.05 * br); B.armR.rotation.set(aRx, 0, aRz - 0.05 * br);
    B.legL.rotation.x = lL; B.legR.rotation.x = lR;
    B.earL.rotation.z = 0.05 * Math.sin(s.t * 2 + 1); B.earR.rotation.z = -0.05 * Math.sin(s.t * 2.2);
    B.bow.rotation.z = 0.08 * Math.sin(s.t * 2.5);
    B.lids.rotation.x = clamp(lidA, -0.95, 1.25);
    // SADE/QA: göz kapakları yalnız uyurken görünür (yarı kapalı kapak + kirpik uzaktan "huysuz bakış" gibi okunuyordu)
    B.lids.scale.setScalar(ph === 'uyku' && lidA > -0.3 ? 1 : 0.0001);
  }

  // ── Boss hamle eşyaları: yumuşak oyuncak bloklar (havuz; tek paylaşılan geometri + malzeme) ──
  const BLOCK_C = [['#ff6f8f', '#fff2a0'], ['#4fb3ff', '#ffffff'], ['#5fd38a', '#fff2a0'], ['#ffd84a', '#ff5f9e'], ['#9b7bff', '#fff6d8'], ['#ff9f43', '#ffffff']];
  let blockGeos = null, blockMat = null;
  function blockGeo(i) {
    if (!blockGeos) {
      blockGeos = BLOCK_C.map(([c, s], k) => {
        const kit = new Kit();
        kit.add(G.rbox(2), c, [0, 0, 0], null, [0.7, 0.7, 0.7]);
        // her yüzde kabartma şekil: kalp / yıldız / daire (çocuk blokları)
        for (const [n, rot] of [[[0, 0, 0.36], [0, 0, 0]], [[0, 0, -0.36], [0, PI, 0]], [[0.36, 0, 0], [0, PI / 2, 0]], [[-0.36, 0, 0], [0, -PI / 2, 0]], [[0, 0.36, 0], [-PI / 2, 0, 0]], [[0, -0.36, 0], [PI / 2, 0, 0]]]) {
          if (k % 3 === 0) kit.add(K.heartGeo(), s, n, rot, 0.32);
          else if (k % 3 === 1) kit.add(K.star5Geo(), s, n, rot, [0.48, 0.48, 0.25]);
          else kit.add(G.cyl(1, 1, 18), s, n, [rot[0] + PI / 2, rot[1], rot[2]], [0.2, 0.04, 0.2]);
        }
        const g = kit.build(); g.userData.keep = true; return g;
      });
      blockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: new THREE.Color(0x40281a), emissiveIntensity: 0.25 }); blockMat.userData.keep = true;
    }
    return blockGeos[i % blockGeos.length];
  }
  const POOL = [];
  function getBlock(i) {
    let o = POOL.find(p => !p.userData.used);
    if (!o) { o = new THREE.Mesh(blockGeo(0), blockMat); o.castShadow = true; POOL.push(o); }
    o.geometry = blockGeo(i); o.userData.used = true; o.visible = true; o.scale.setScalar(1); o.rotation.set(0, 0, 0);
    if (!o.parent) scene.add(o);
    return o;
  }
  function putBlock(o) { if (!o) return; o.userData.used = false; o.visible = false; o.position.set(0, -50, 0); }

  // ── Boss davranışı (BOSSDAV.register) ──
  const W = { blocks: [], L: null };
  const A = () => BOSSDAV.api;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sq = x => x * x;
  const heroR = () => (A() && A().T && A().T.heroR) || 0.35;
  const dmgOf = (b, k) => b.dmg * k * (A().hard ? 1.25 : 1);
  const faceTo = (b, x, z, k, dt) => { b.face = dampAngle(b.face, Math.atan2(x - b.x, z - b.z), k, dt); };
  const say = (k, prio = 2) => { const a = A(); if (a && a.hasLine(k)) a.say(k, prio); };
  // ATOLYE2 (QA3, 05z_mantar ile aynı çözüm): uyarı cümlesi yer işaretiyle AYNI anda — işaret çizildikten hemen sonra, sırayı
  //   beklemeden (interrupt) söylenir; her cümle dövüşte bir kez (05c'nin düşük öncelikle sıraya koyduğu geç ipucu yok: hints {}).
  function warn(S, key) {
    const a = A(); if (!key || !a || !a.hasLine(key)) return 0;
    const said = S.said || (S.said = {}); if (said[key]) return 0; said[key] = true;
    try { return +a.say(key, 3, { interrupt: true }) || 0; } catch (e) { return 0; }
  }
  const STAGE_AT = [0.66, 0.33];
  function spotsAround(b, cx, cz, n, rmin, rmax, gap) {
    const a = A(), out = [], rm = a.bossRoom();
    for (let tries = 0; tries < n * 14 && out.length < n; tries++) {
      const ang = rnd(0, TAU), rr = out.length === 0 && tries < 2 ? 0 : rnd(out.length ? rmin : 0.8, rmax), x = cx + Math.sin(ang) * rr, z = cz + Math.cos(ang) * rr;
      if (!a.isFloor(x, z) || (rm && !a.inRoom(rm, x, z, 0.6))) continue;
      if (out.some(p => sq(p.x - x) + sq(p.z - z) < sq(gap))) continue;
      if (sq(x - b.x) + sq(z - b.z) < sq(b.r + 0.6)) continue;
      out.push({ x, z });
    }
    return out;
  }
  // blok at: from = bossun patisi (yay) ya da null (tavandan düşer); önce renkli daire (≥ 1,2 s)
  function throwBlock(b, x, z, o = {}) {
    const a = A();
    const d = { b, enc: b.encounter, x, z, r: o.r || 1.2, at: o.at || 1.3, t: 0, from: o.from || null, h: o.h || 3.2, prop: getBlock((Math.random() * 6) | 0), spin: [rnd(-7, 7), rnd(-7, 7)], landed: false, rest: 0 };
    d.mark = a.fx('telegraph', x, z, d.r, d.at, '#ff86b8'); zoneMark(x, z, d.r, '#ff6fa8', d.at);   // (ses: "yerdeki daireler")
    d.prop.visible = false;
    W.blocks.push(d);
    return d;
  }
  function stepBlocks(dt) {
    const a = A();
    for (let i = W.blocks.length - 1; i >= 0; i--) {
      const d = W.blocks[i]; d.t += dt;
      const o = d.prop;
      if (!d.landed) {
        const k = clamp(d.t / d.at, 0, 1);
        if (d.from) {
          o.visible = true;
          o.position.set(lerp(d.from[0], d.x, k), d.from[1] * (1 - k) + 4 * d.h * k * (1 - k) + 0.35 * k, lerp(d.from[2], d.z, k));
        } else {   // tavandan: son 0,7 s düşer
          const u = clamp(1 - (d.at - d.t) / 0.7, 0, 1);
          o.visible = u > 0; o.position.set(d.x, 0.35 + 10 * (1 - u * u), d.z);
        }
        o.rotation.x += d.spin[0] * dt; o.rotation.z += d.spin[1] * dt;
        if (k >= 1) {
          d.landed = true; d.rest = 0;
          a.burst('dust', d.x, 0.2, d.z, { count: 5, scale: 1.1 }); a.burst('star', d.x, 0.6, d.z, { count: 2, color: '#fff3a0' });
          a.fx('ring', d.x, d.z, { r0: 0.2, r1: d.r + 0.2, dur: 0.4, color: '#ffe6b8', width: 0.25 });
          a.sfx('bounce', { x: d.x, z: d.z, vol: 0.55, pitch: rnd(0.8, 1.2) });
          const P = a.P;
          if (!P.dead && !d.b.dead && sq(P.pos.x - d.x) + sq(P.pos.z - d.z) < sq(d.r + heroR() * 0.5)) a.hurtPlayer(dmgOf(d.b, 0.28), d.x, d.z, 0.5);
          if (d.mark) { a.remove(d.mark); d.mark = null; }
        }
      } else {   // yere inince bir kez sekip durur, sonra küçülüp kaybolur
        d.rest += dt;
        const hop = d.rest < 0.45 ? Math.sin(PI * d.rest / 0.45) * 0.5 : 0;
        o.position.y = 0.35 + hop;
        o.rotation.x = damp(o.rotation.x, Math.round(o.rotation.x / (PI / 2)) * (PI / 2), 8, dt); o.rotation.z = damp(o.rotation.z, Math.round(o.rotation.z / (PI / 2)) * (PI / 2), 8, dt);
        const s = d.rest > 1.3 ? Math.max(0.001, 1 - (d.rest - 1.3) / 0.4) : 1;
        o.scale.setScalar(s);
        if (d.rest > 1.7) { a.burst('sparkle', d.x, 0.4, d.z, { count: 2, color: '#ffe6b8' }); putBlock(o); W.blocks.splice(i, 1); }
      }
    }
  }
  function clearBlocks() {
    const a = A();
    for (const d of W.blocks) { putBlock(d.prop); if (d.mark && a) a.remove(d.mark); }
    W.blocks.length = 0;
  }
  function clearMoves(b) {
    const a = A();
    if (b.tele) { a.remove(b.tele); b.tele = null; }
    b.y = 0; b.st.air = 0;
  }
  // aşama geçişi yarıda kalan hamleyi keser
  function pendingStage(b, S) {
    if (S.pending && S.pending !== S.stage && b.ph !== 'sasir') { clearMoves(b); A().bossPhase(b, 'sasir', 2.2); return true; }
    return false;
  }
  const hand = (b, sd) => { const c = Math.cos(b.face), s = Math.sin(b.face), lx = sd * 1.25, lz = 0.5; return [b.x + lx * c + lz * s, 1.6, b.z - lx * s + lz * c]; };

  const AYI = {
    hpK: 2.3, keep: 6.2, roarD: 2.2,
    choose(b, S, d) {
      const a = A();
      if (!S.init) { S.init = true; S.stage = S.stage || 1; S.n = 0; }   // (yarı can cümlesini 05c söyler: pr_kocaAyicik_yarim)
      if (pendingStage(b, S)) return;
      if (S.n >= 3) { a.bossPhase(b, 'uyku', S.stage >= 3 ? 4.2 : 5.0); return; }
      let opts;
      if (S.stage === 1) opts = [['bloklar', 0.6], ['zil', 0.4]];
      else if (S.stage === 2) opts = [['bloklar', 0.4], ['zil', 0.3], ['gobek', 0.3]];
      else opts = [['yagmur', 0.35], ['gobek', 0.3], ['zil', 0.2], ['bloklar', 0.15]];
      const ph = a.pickPhase(b, opts);
      a.bossPhase(b, ph, { bloklar: 3.2, zil: 4.2, gobek: 2.6, yagmur: 3.4 }[ph] || 3);
    },
    moves: {
      // Blok fırlatma: Feza'nın yerine ve çevresine 3/4/5 yumuşak oyuncak blok (önce turuncu daireler)
      bloklar(b, S, dt, d, ux, uz) {
        const a = A(), t = b.stT;
        if (pendingStage(b, S)) return;
        faceTo(b, a.P.pos.x, a.P.pos.z, 5, dt);
        if (b.did === 0) {
          b.did = 1; S.spots = spotsAround(b, a.P.pos.x, a.P.pos.z, 2 + S.stage, 2.2, 4.4, 2.3); S.thrown = 0;
          sadeFt(a, b.x, b.height + 0.4, b.z, 'Bloklar geliyor!', 'word'); a.sfx('kurma', { x: b.x, z: b.z, vol: 0.6 });
        }
        while (S.thrown < S.spots.length && t > 0.45 + S.thrown * 0.38) {
          const p = S.spots[S.thrown], sd = S.thrown % 2 ? -1 : 1;
          throwBlock(b, p.x, p.z, { from: hand(b, sd), at: 1.35, h: 3.0 });
          if (S.thrown === 0) warn(S, 'pr_ipucu_bloklar');   // ilk daire yerde → cümle
          a.sfx('whoosh', { x: b.x, z: b.z, pitch: rnd(1.1, 1.4), vol: 0.5 });
          S.thrown++;
        }
        if (t >= b.phD) { S.n++; a.bossEnd(b, 1.5, 1.3); }
      },
      // Zilli yürüyüş: altın şerit işareti, sonra ziller çınlayarak şeritte hızlı paytak yürür; yana kaçan kurtulur
      zil(b, S, dt, d, ux, uz) {
        const a = A(), t = b.stT, W0 = 1.3, SP = 5.2;
        if (pendingStage(b, S)) return;
        if (b.did === 0) {
          b.did = 1; const ang = Math.atan2(ux, uz); S.dx = Math.sin(ang); S.dz = Math.cos(ang);
          S.x0 = b.x; S.z0 = b.z; S.len = Math.max(2.5, Math.min(11, a.laneLen(b.x, b.z, S.dx, S.dz, 11, b.r * 0.8, a.bossRoom())));
          b.tele = a.telegraphLine(b.x, b.z, b.x + S.dx * (S.len + b.r), b.z + S.dz * (S.len + b.r), b.r * 2 + 0.4, W0, '#ffc81e');   // SADE4: ses "altın şerit" diyor → altın sarısı
          // ATOLYE2 (QA3): "Altın şeridi gördün mü?" cümlesi TAM şerit çizilirken söylenir (05c'nin ilk-kez ipucu kuyrukta gecikip
          //   sonraki hamlenin pembe halkalarına denk geliyordu → zil ipucu burada, kuyruğu beklemeden); şerit cümle boyunca yerde kalır.
          const dur = warn(S, 'pr_ipucu_zil');
          laneMark(b.x, b.z, b.x + S.dx * (S.len + b.r), b.z + S.dz * (S.len + b.r), b.r * 2 + 0.4, '#ffc81e', Math.min(b.phD, Math.max(W0 + 1.0, dur + 0.4)), 0.3);
          sadeFt(a, b.x, b.height + 0.4, b.z, 'Tın tın tın!', 'word'); S.hitZ = false; S.ringT = 0;
        }
        if (t < W0) { b.face = dampAngle(b.face, Math.atan2(S.dx, S.dz), 8, dt); if ((S.ringT -= dt) <= 0) { S.ringT = 0.3; a.sfx('bell', { x: b.x, z: b.z, vol: 0.45, pitch: rnd(1.3, 1.7) }); } }
        else {
          const s = Math.min(S.len, (t - W0) * SP);
          b.x = S.x0 + S.dx * s; b.z = S.z0 + S.dz * s; b.face = Math.atan2(S.dx, S.dz);
          if ((S.ringT -= dt) <= 0) { S.ringT = 0.16; a.sfx('bell', { x: b.x, z: b.z, vol: 0.5, pitch: rnd(1.2, 1.9) }); a.burst('note', b.x + rnd(-1, 1), b.height * 0.7, b.z + rnd(-1, 1), { count: 2 }); a.burst('dust', b.x, 0.15, b.z, { count: 2 }); }
          const P = a.P;
          if (!S.hitZ && !P.dead && sq(P.pos.x - b.x) + sq(P.pos.z - b.z) < sq(b.r + heroR() + 0.1)) { S.hitZ = true; a.hurtPlayer(dmgOf(b, 0.35), b.x, b.z, 1.4); a.sfx('bounce', { x: b.x, z: b.z }); }
          if (s >= S.len && b.did === 1) { b.did = 2; if (b.tele) { a.remove(b.tele); b.tele = null; } a.burst('star', b.x, b.height, b.z, { count: 3, color: '#fff3a0' }); a.sfx('bell', { x: b.x, z: b.z, pitch: 0.9, vol: 0.7 }); }
        }
        if (t >= b.phD) { S.n++; if (b.tele) { a.remove(b.tele); b.tele = null; } a.bossEnd(b, 1.4, 1.2); }
      },
      // Göbek zıplaması (2. aşamadan): Feza'nın yanına zıplar, yumuşak göbek üstü iner, halka dalgası
      gobek(b, S, dt) {
        const a = A(), t = b.stT, c = 0.55, land = 1.65, R = 2.8;
        if (pendingStage(b, S)) return;
        if (b.did === 0) {
          b.did = 1; const sp = a.approachSpot(b, 7);
          S.hx0 = b.x; S.hz0 = b.z; S.hx1 = sp.x; S.hz1 = sp.z;
          b.tele = a.fx('telegraph', sp.x, sp.z, R, land, '#ff6fa8'); zoneMark(sp.x, sp.z, R, '#ff6fa8', Math.max(land, 1.8));   // ses: "halkadan çık"
          warn(S, 'pr_ipucu_gobek');
          sadeFt(a, b.x, b.height + 0.4, b.z, 'Hoop!', 'word');
        }
        if (t < c) { faceTo(b, S.hx1, S.hz1, 6, dt); b.st.air = 0; }
        else if (t < land) { const u = (t - c) / (land - c), k = u * u * (3 - 2 * u); b.x = S.hx0 + (S.hx1 - S.hx0) * k; b.z = S.hz0 + (S.hz1 - S.hz0) * k; b.y = 4 * 2.4 * u * (1 - u); b.st.air = Math.max(0.01, u); if (b.did === 1) { b.did = 2; a.sfx('bounce', { x: b.x, z: b.z, pitch: 0.55 }); } }
        else if (b.did === 2) {
          b.did = 3; b.y = 0; b.st.air = 0; b.x = S.hx1; b.z = S.hz1; if (b.tele) { a.remove(b.tele); b.tele = null; }
          a.bossRing(b, b.x, b.z, R, 0.35, 1.6, '#ffc2dc'); a.burst('dust', b.x, 0.3, b.z, { count: 13, scale: 1.8 }); a.burst('star', b.x, 1, b.z, { count: 4, color: '#fff3a0' });
          a.sfx('slam', { x: b.x, z: b.z, vol: 0.7 }); a.sfx('bell', { x: b.x, z: b.z, pitch: 1.1 }); sadeFt(a, b.x, b.height + 0.3, b.z, 'Pof!', 'word');
        }
        if (t >= b.phD) { b.y = 0; b.st.air = 0; S.n++; a.bossEnd(b, 1.5, 1.3); }
      },
      // Blok yağmuru (3. aşama): ellerini çırpar, tavandan bloklar düşer (önce daireler)
      yagmur(b, S, dt) {
        const a = A(), t = b.stT;
        if (pendingStage(b, S)) return;
        faceTo(b, a.P.pos.x, a.P.pos.z, 3, dt);
        if (b.did === 0) { b.did = 1; S.spots = spotsAround(b, a.P.pos.x, a.P.pos.z, 4, 2.0, 5.0, 2.2); S.thrown = 0; sadeFt(a, b.x, b.height + 0.4, b.z, 'Blok yağmuru!', 'word'); a.sfx('bell', { x: b.x, z: b.z, pitch: 1.5 }); }
        while (S.thrown < S.spots.length && t > 0.3 + S.thrown * 0.3) { const p = S.spots[S.thrown]; throwBlock(b, p.x, p.z, { at: 1.5, r: 1.15 }); if (S.thrown === 0) warn(S, 'pr_ipucu_blok_yagmur'); S.thrown++; }
        if (t >= b.phD) { S.n++; a.bossEnd(b, 1.5, 1.3); }
      },
      // Uyku: anahtar yavaşlar ve durur → uyuklar (vurma fırsatı ×1,6), sonra kendini "tık tık tık" kurar
      uyku(b, S, dt) {
        const a = A(), t = b.stT;
        b.st.phaseD = b.phD; b.st.sleep = 1;
        if (b.did === 0) { b.did = 1; S.n = 0; sadeFt(a, b.x, b.height + 0.4, b.z, 'Tık… tık… tık…', 'word'); a.sfx('kurma', { x: b.x, z: b.z, pitch: 0.6, vol: 0.6 }); warn(S, (S.sleepN = (S.sleepN || 0) + 1) % 2 ? 'pr_ayicik_uyudu' : 'pr_ayicik_uyudu2'); }
        if (t > 0.9 && t < b.phD - 0.9 && (S.zT = (S.zT || 0) - dt) <= 0) { S.zT = 0.85; a.burst('zzz', b.x + Math.sin(b.face) * 0.8, b.height * 0.95, b.z + Math.cos(b.face) * 0.8, {}); a.sfx('sigh', { x: b.x, z: b.z, pitch: 0.55 + 0.08 * Math.sin(t), vol: 0.45 }); }
        if (b.did === 1 && t > b.phD - 0.9) { b.did = 2; a.sfx('kurma', { x: b.x, z: b.z, pitch: 1.4, vol: 0.8 }); sadeFt(a, b.x, b.height + 0.4, b.z, 'Tık tık tık! Kuruldum!', 'word'); a.burst('sparkle', b.x, b.height * 0.5, b.z - 0.9, { color: '#ffe27a', count: 7 }); }
        faceTo(b, a.P.pos.x, a.P.pos.z, 1.2, dt);
        if (t >= b.phD) { b.st.sleep = 0; a.bossEnd(b, 1.1, 0.9); }
      },
      // Aşama geçişi: "Hoppala!" (bu sırada vurulmaz)
      sasir(b, S, dt) {
        const a = A(), t = b.stT;
        if (b.did === 0) {
          b.did = 1; S.stage = S.pending; S.n = Math.min(S.n, 2);
          sadeFt(a, b.x, b.height + 0.6, b.z, S.stage === 2 ? 'Hoppala! Anahtarım hızlandı!' : 'Vay! Fırıl fırıl kuruldum!', 'word');
          a.sfx('kurma', { x: b.x, z: b.z, pitch: 1.6 }); a.sfx('bell', { x: b.x, z: b.z, pitch: 1.3 }); a.shake(0.2);
          a.burst('star', b.x, b.height + 0.3, b.z, { count: 5, color: '#fff3a0' }); a.burst('confetti', b.x, b.height, b.z, {});
          warn(S, S.stage === 2 ? 'pr_ayicik_asama2' : 'pr_ayicik_asama3');   // anlattığı an: anahtar fırıl fırıl dönüyor
        }
        if (t >= b.phD) a.bossEnd(b, 1.1, 0.8);
      },
    },
    hints: {},   // ATOLYE2 (QA3): ipucu cümleleri hamlelerin içinde, işaretle aynı anda (warn)
    // hasar süzgeci: uyurken ×1,6; aşama geçişinde vurulmaz; %66 / %33'te aşama değişir
    hit(b, amount, o, S) {
      if (b.ph === 'sasir') return 0;
      if (S.pending && S.pending !== S.stage) return 0;
      if (b.ph === 'uyku') amount = Math.round(amount * 1.6);
      const left = (b.hp - amount) / b.maxHp;
      for (let i = 0; i < 2; i++) if ((S.stage || 1) === i + 1 && left <= STAGE_AT[i] + 1e-6) { S.pending = i + 2; return Math.max(0, b.hp - Math.round(b.maxHp * STAGE_AT[i])); }
      return amount;
    },
    update(dt) {
      zoneTick(dt);
      const a = A(); if (!a) return;
      if (W.L !== a.L) { W.L = a.L; clearBlocks(); festEnd(); }
      if (FEST) festStep(dt);
      if (W.blocks.length) {
        if (W.blocks.some(d => d.b.dead || d.b.encounter !== d.enc)) { clearBlocks(); return; }   // (boss neşelendi ya da karşılaşma yeniden başladı)
        stepBlocks(dt);
      }
    },
  };
  if (typeof BOSSDAV !== 'undefined' && BOSSDAV && BOSSDAV.register) BOSSDAV.register('kocaAyicik', AYI);

  // ── Boss sonu sevimli an: motorun neşelenme gösterisinin yerine kendi "kutlama ayıcığı" — anahtarı son kez kurulur,
  // Feza ve Pırıl'la müzik kutusu dansı (Feza el ele zıplar, Pırıl takla atar), sonra oturup uyuklar (bölümden çıkana dek orada) ──
  let FEST = null;
  const FST = { phase: 'kur', phaseT: 0, move: 0, windup: -1, attack: -1, hurt: 0, dying: -1, aggro: true, t: 0 };
  function festStart(e) {
    festEnd();
    if (!HAS) return;
    const b = GAME.boss && GAME.boss.type === 'kocaAyicik' ? GAME.boss : null;
    const m = E.make('kocaAyicik', {}); m.setMood('happy');
    m.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const x = b ? b.x : e.x, z = b ? b.z : e.z;
    m.root.position.set(x, 0, z); scene.add(m.root);
    FEST = { m, b, x, z, t: 0, ph: 'kur', jT: 0.4, nT: 0, zT: 0, said: 0 };
    FST.phase = 'kur'; FST.phaseT = 0;
  }
  function festEnd() { if (FEST) { try { FEST.m.dispose(); } catch (err) { /* yok */ } FEST = null; } }
  function festStep(dt) {
    const F = FEST, P = GAME.P, a = A();
    F.t += dt;
    if (F.b && F.b.m && F.b.m.root) F.b.m.root.visible = false;   // (motorun neşelenen modeli gizli: yerine bu ayıcık oynar)
    const ph = F.t < 1.6 ? 'kur' : F.t < 7.2 ? 'dans' : 'otur';
    if (ph !== F.ph) {
      F.ph = ph;
      if (ph === 'dans') { a.sfx('oyuncakDans', { x: F.x, z: F.z, vol: 0.8 }); sadeFt(a, F.x, 4, F.z, 'Hadi dans!', 'word'); try { if (GAME.Bilbo && GAME.Bilbo.takla) GAME.Bilbo.takla(); } catch (err) { /* yok */ } }
      if (ph === 'otur') { sadeFt(a, F.x, 3.6, F.z, 'Hıı… biraz uyuyayım…', 'word'); a.sfx('sigh', { x: F.x, z: F.z, pitch: 0.7 }); }
    }
    if (ph === 'kur' && F.said === 0) { F.said = 1; sadeFt(a, F.x, 4.2, F.z, 'Tık tık tık! Kuruldum!', 'word'); a.sfx('kurma', { x: F.x, z: F.z, vol: 0.9, pitch: 1.3 }); }
    FST.phase = ph; FST.t += dt;
    // Feza'ya dön
    const fa = Math.atan2(P.pos.x - F.x, P.pos.z - F.z);
    F.m.root.rotation.y = dampAngle(F.m.root.rotation.y, fa, 3, dt);
    F.m.anim(dt, FST);
    if (ph === 'dans') {
      if ((F.jT -= dt) <= 0) {   // Feza el ele zıplar, Pırıl sevinir
        F.jT = 1.15;
        try { if (GAME.H && GAME.H.teamJump) GAME.H.teamJump(0.9, 1); } catch (err) { /* yok */ }
        try { if (GAME.Bilbo && GAME.Bilbo.sevin) GAME.Bilbo.sevin(1.4); } catch (err) { /* yok */ }
        a.burst('heart', P.pos.x, 1.8, P.pos.z, { count: 2 });
      }
      if ((F.nT -= dt) <= 0) { F.nT = 0.33; a.burst('note', F.x + rnd(-1.5, 1.5), 3 + rnd(0, 1), F.z + rnd(-1, 1), { count: 1 }); a.sfx('bell', { x: F.x, z: F.z, vol: 0.35, pitch: [1.3, 1.64, 1.95, 2.18, 1.95, 1.64][(F.t / 0.33 | 0) % 6] }); }
    } else if (ph === 'otur' && F.t > 8.4 && (F.zT -= dt) <= 0) { F.zT = 1.3; a.burst('zzz', F.x, 3.0, F.z + 0.6, {}); }
  }

  // ── Kâğıt uçağın kendi mermisi: minik kâğıt uçak (motorun 'bubble'ı yerine). FX.projectile'ı küçük bir sarmalayıcıyla genişletir:
  // 'kagit' türü bizim görselimiz, diğer türler aynen motorun. Paylaşılan geometri + malzeme; atış başına yalnız küçük bir Group. ──
  let paperG = null, paperM = null;
  function paperShot() {
    if (!paperG) {
      const k = new Kit();
      const wing = sd => { const sh = new THREE.Shape(); sh.moveTo(0, 0.5); sh.lineTo(sd * 0.42, -0.34); sh.lineTo(sd * 0.04, -0.24); sh.lineTo(0, 0.5); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.015, bevelEnabled: false }); return g; };
      for (const sd of [-1, 1]) {
        k.add(wing(sd), '#fffef6', [0, 0, 0], [-PI / 2, 0, -sd * 0.18]);
        k.add(G.box(), '#5ab4ff', [sd * 0.18, 0.012, -0.05], [0, -sd * 0.42, 0], [0.03, 0.006, 0.36]);
      }
      const keel = new THREE.Shape(); keel.moveTo(0.5, 0); keel.lineTo(-0.34, 0); keel.lineTo(-0.3, -0.12); keel.lineTo(0.5, 0);
      k.add(new THREE.ExtrudeGeometry(keel, { depth: 0.02, bevelEnabled: false }), '#f4f0e2', [0, 0, 0], [0, -PI / 2, 0]);
      k.add(G.sphere(8, 6), '#ffd84a', [0, 0.02, 0.32], null, [0.05, 0.03, 0.05]);
      paperG = k.build(); paperG.userData.keep = true;
      paperM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, emissive: new THREE.Color(0x40403a), emissiveIntensity: 0.6, side: THREE.DoubleSide }); paperM.userData.keep = true;
    }
    const g = new THREE.Group(), inner = new THREE.Mesh(paperG, paperM);
    inner.scale.setScalar(0.62); inner.position.y = 0.05; g.add(inner); g.name = 'kagitMermi';
    const ph = Math.random() * 6;
    inner.onBeforeRender = () => { const t = TIME.t + ph; inner.rotation.z = Math.sin(t * 7) * 0.35; inner.rotation.x = Math.sin(t * 4.3) * 0.12; inner.position.y = 0.05 + Math.sin(t * 5) * 0.06; };
    return g;
  }
  if (typeof FX !== 'undefined' && FX && typeof FX.projectile === 'function' && !FX.projectile._atolye) {
    const p0 = FX.projectile;
    const wrap = function (kind) { if (kind === 'kagit') { try { return paperShot(); } catch (err) { console.warn('[atolye] kâğıt mermi', err); } } return p0.apply(this, arguments); };
    wrap._atolye = true;
    try { FX.projectile = wrap; } catch (err) { /* FX donmuşsa motorun görseli kalır */ }
  }

  // neşelenince: müzik kutusu ezgisi + ziller (motorun kutlamasına ek)
  let hooked = false;
  function hook() {
    if (hooked) return;
    if (typeof GAME === 'undefined' || !GAME || !GAME.on) { setTimeout(hook, 300); return; }
    hooked = true;
    const NOTES = [1.0, 1.26, 1.5, 1.68, 1.5, 1.26, 1.33, 1.0];
    GAME.on('happy', e => {
      if (!e) return;
      try {
        if (e.boss && e.type === 'kocaAyicik') {
          clearBlocks(); festStart(e);
          NOTES.forEach((p, i) => setTimeout(() => { try { AUD.sfx('bell', { x: e.x, z: e.z, vol: 0.55, pitch: p * 1.3 }); if (FX && FX.burst) FX.burst('note', e.x + Math.sin(i) * 1.5, 3.2, e.z + Math.cos(i), { count: 2 }); } catch (err) { /* yok */ } }, 300 + i * 260));
          setTimeout(() => { try { AUD.sfx('oyuncakDans', { vol: 0.7 }); } catch (err) { /* yok */ } }, 2400);
          return;
        }
        if (!HUYSUZ.get(e.type) || e.boss) return;
        if (e.type === 'askercik' && typeof AUD !== 'undefined' && AUD.sfx) { AUD.sfx('drum', { x: e.x, z: e.z, vol: 0.5, pitch: 1.3 }); setTimeout(() => { try { AUD.sfx('drum', { x: e.x, z: e.z, vol: 0.45, pitch: 1.5 }); } catch (err) { /* yok */ } }, 150); }
        if (e.type === 'yayliTop' && typeof AUD !== 'undefined' && AUD.sfx) AUD.sfx('bounce', { x: e.x, z: e.z, vol: 0.6, pitch: 1.5 });
        if ((e.elite || RARE[e.type]) && typeof FX !== 'undefined' && FX && FX.burst) FX.burst('confetti', e.x, 0.9, e.z, { scale: e.elite ? 1.1 : 0.8 });
        if (RARE[e.type]) {
          if (GAME.addGoldSugar) GAME.addGoldSugar(1);
          const P = GAME.P; if (P && P.cikartmalar && P.cikartmalar[e.type]) P.cikartmalar[e.type].tur = 'gizli';
        }
      } catch (err) { console.warn('[atolye] happy', err); }
    });
  }
  hook();

  // ── Boss kaydı ──
  if (HAS) {
    E.register('kocaAyicik', buildAyicik, animAyicik, 0.72);
    HUYSUZ.boss('kocaAyicik', { ad: 'Kurmalı Koca Ayıcık', base: 'kraljole', model: o => E.make('kocaAyicik', o),
      stats: { r: 1.55, height: 3.4, speed: 1.8, aggro: 13, phases: ['idle', 'move', 'roar', 'summon', 'bloklar', 'zil', 'gobek', 'yagmur', 'uyku', 'sasir'] },
      lines: { giris: 'pr_kocaAyicik_giris', bitti: 'pr_kocaAyicik_bitti', yarim: 'pr_kocaAyicik_yarim' },
      bossKit: { own: true, add: 'kurmaliFare', at: [0.4], n: [2], col: '#ffd08a', roar: 1.2, roarSfx: 'kurma' } });
  } else HUYSUZ.boss('kocaAyicik', { ad: 'Kurmalı Koca Ayıcık', base: 'kraljole', bossKit: { own: true } });

  // Bölüm listesi: 4 huysuz + elit (askercik) + nadir altın fare (arada bir)
  HUYSUZ.zone('atolye', { enemies: { kurmaliFare: 4, topac: 3, kagitUcak: 2.5, askercik: 2.5, yayliTop: 3, altinFare: 0.3 }, elites: ['askercik'], boss: 'kocaAyicik' });

  return { RARE, blockGeo, TYPES: T.map(x => x[0]), _W: W };
})();
