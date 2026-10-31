/* ── Gökkuşağı Adaları: huysuzlar + FİNAL boss (Feza ile Pırıl) ──
   Hepsi gökyüzü sakinleri, hepsi SEVİMLİ (gülen / yaramaz yüz, kızgın kaş yok, böcek yok); neşelenince ^ ^ gözler, kalpler.
   Modeller EMODEL.KIT iskeletiyle (tek parça örgü, örnek başına 1 çizim; geometri tipler arasında paylaşılır).
     simsekcik        Şimşekçik       minik gri bulut, çevresinde çıtırdayan sarı ışık kıvılcımları; havada süzülür, hazırlıkta
                                      kabarır ve kıvılcımlar parlar, minik ışık topu atar (base yildizcik, 'uzak', uçar)
     ruzgarBalonu     Rüzgâr Balonu   pastel balon, kocaman yanakları; havada süzülür, yanaklarını şişirip "püüf!" diye üfler
                                      (base goblin, 'ucan' yakın)
     doluPofudugu     Dolu Pofuduğu   ELİT: pofuduk kar bulutu topu, eldivenli; yumuşak kar topu atar (base mantar, 'uzak', biraz büyük)
     yagmurDamlacigi  Yağmur Damlacığı mavi damla; hoplaya hoplaya gelir, "şap!" diye zıplar (base yogurt, 'ziplayan')
     gokkusagiDamla   Gökkuşağı Damlacığı  nadir: gökkuşağı renkli damla; neşelenince altın şeker
     kocaFirtinaBulutu Koca Fırtına Bulutu  FİNAL boss: uykusu kaçmış, esneyen koca bulut (gece külahlı). Aşamalar: rüzgâr üfler,
                                      yağmur damlası yağdırır, dolu atar, şimşekçik çağırır; canı %25'e inince yorulur ve esner: Pırıl büyür,
                                      Feza sırtına biner, birlikte uçup 7 son ışığı toplarlar → bulut neşelenir, gökkuşağı yağdırır, uykuya dalar.
   Biçim: PIRIL.md › 6 (HUYSUZ.type / boss / zone, BOSSDAV.register). Sesler: SES'e istek (pr_ilk_*, pr_kocaFirtinaBulutu_*, pr_ipucu_*). */
(() => {
  'use strict';
  // SADE (okunurluk): Feza okumayı bilmiyor → boss sözcük balonları seyrek (en çok 9 sn'de bir; ses ve hareket yine anlatır)
  let sadeFtT = -1e9;
  const sadeFt = (A, ...r) => { const n = performance.now(); if (n - sadeFtT < 9000) return; sadeFtT = n; try { sadeFt(A, ...r); } catch (e) { /* yok */ } };
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
  const HAS = typeof EMODEL !== 'undefined' && EMODEL && EMODEL.KIT && EMODEL.addType && EMODEL.buildRaw;
  const K = HAS ? EMODEL.KIT : null, G = HAS ? K.G : null;
  const col = h => new THREE.Color(h), hdr = (h, k) => new THREE.Color(h).multiplyScalar(k);
  const mixc = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  const hash = (a, b, c) => (K ? K.hash3(a, b, c) : 0.5);
  const sm = x => smooth01(x);
  const yuz = o => Object.assign({ tilt: 0.3, browT: 0.32, browRaise: 0.26 }, o);
  const bumpU = (u, a, b) => (u > a && u < b ? Math.sin(PI * (u - a) / (b - a)) : 0);
  const breath = (s, f = 2.4) => Math.sin(s.t * f + s.ph);
  const RAINBOW = ['#ff7a9a', '#ffac63', '#ffe36e', '#86e39a', '#6fcbff', '#9a93ff', '#d99bff'];

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
  function mitt(r, p, s, c = '#fffaf4') {
    r.fx(0, 0.3).add(G.sphere(14, 10), c, p, null, [s, s * 0.92, s * 0.9]);
    r.add(G.sphere(10, 8), c, [p[0] + s * 0.55 * Math.sign(p[0] || 1), p[1] + s * 0.35, p[2] + s * 0.3], null, s * 0.42);
    r.fx(0, 0);
  }
  // bulut gövdesi: pofuduk küre kümesi (renk alttan üste açılır)
  function cloudBody(r, cx, cy, R, c0, c1, n = 9, seedK = 1) {
    const grad = (x, y) => mixc(c0, c1, sm((y - (cy - R * 0.6)) / (R * 1.3)));
    r.add(G.sphere(22, 16), grad, [cx, cy, 0], null, [R, R * 0.82, R * 0.9]);
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + hash(i, 3, seedK) * 0.4, rr = R * (0.72 + hash(i, 7, seedK) * 0.12), y = cy + Math.sin(a) * R * 0.45 + R * 0.08;
      const s = R * (0.42 + hash(i, 1, seedK) * 0.18);
      r.add(G.sphere(16, 12), grad, [cx + Math.cos(a) * rr, y, (hash(i, 5, seedK) - 0.6) * R * 0.5], null, [s, s * 0.9, s]);
    }
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.7, s = R * 0.38; r.add(G.sphere(16, 12), grad, [cx + Math.sin(a) * R * 0.5, cy + R * 0.66 + Math.cos(a) * R * 0.08, -R * 0.1], null, [s, s * 0.85, s]); }
  }
  // çıtırdayan ışık kıvılcımı (zikzak; sönük-parlak animde ölçeklenir)
  function spark(r, p, s, rot = 0) {
    r.push(p, [0, 0, rot], s);
    r.add(G.box(), hdr('#ffe36e', 2.2), [0, 0.18, 0], [0, 0, 0.5], [0.06, 0.24, 0.05]);
    r.add(G.box(), hdr('#ffe36e', 2.2), [0.03, 0, 0], [0, 0, -0.6], [0.06, 0.22, 0.05]);
    r.add(G.box(), hdr('#fff6c0', 2.2), [0, -0.17, 0], [0, 0, 0.5], [0.06, 0.22, 0.05]);
    r.pop();
  }

  // ════════ ŞİMŞEKÇİK ════════
  function buildSimsek(r, o) {
    const E = o.elite;
    r.bone('body', 'root', [0, 0.55, 0]);
    r.bone('sparks', 'body', [0, 0.6, 0]);
    r.bone('armL', 'body', [0.32, 0.55, 0.05]); r.bone('armR', 'body', [-0.32, 0.55, 0.05]);
    r.on('body').fx(0, 0.25);
    cloudBody(r, 0, 0.62, 0.34, E ? '#9a94c8' : '#a8adc4', E ? '#e8e4ff' : '#eef0fa', 8, 2);
    r.on('armL').fx(0, 0.2).add(G.sphere(12, 10), '#dfe2f0', [0.42, 0.5, 0.08], [0, 0, 0.6], [0.09, 0.12, 0.09]);
    r.on('armR').add(G.sphere(12, 10), '#dfe2f0', [-0.42, 0.5, 0.08], [0, 0, -0.6], [0.09, 0.12, 0.09]);
    r.on('sparks').fx(1, 0);
    spark(r, [0.42, 0.88, 0.0], 0.75, 0.3); spark(r, [-0.44, 0.82, -0.05], 0.65, -0.4); spark(r, [0.05, 1.08, -0.1], 0.6, 0.1);
    r.fx(0, 0);
    r.on('body');
    K.face(r, [0, 0.6, 0.02], 0.34, yuz({ bone: 'body', tilt: 0.2, ex: 0.11, ey: 0.03, er: 0.09, iris: '#3a3a6a', skin: '#e4e6f2', browCol: '#5a5a7a', browY: 1.36,
      mouthY: -0.1, mouthW: 0.09, blushCol: '#ff9ac8', heartY: 0.8 }));
    if (E) K.crown(r.on('body'), [0, 0.98, -0.05], 0.45);
    r.on('body').mark('muzzle', [0, 0.55, 0.38]);
    return { height: 1.0, glowC: col('#ffe36e'), hide: [], mat: { rough: 0.6, sss: col('#e8ecff').multiplyScalar(0.08), rim: '#ffffff', rimK: 0.42, rimP: 2.0, wob: 0.02, wobF: 3, wobS: 4 } };
  }
  function animSimsek(m, dt, st, s) {
    const B = m.B, b = B.body;
    b.position.y += Math.sin(s.t * 2.2 + s.ph) * 0.06;
    b.rotation.z = Math.sin(s.t * 1.4 + s.ph) * 0.07; b.rotation.x = 0.15 * s.mv;
    let sp = 0.75 + 0.25 * Math.sin(s.t * 23 + s.ph) * Math.sin(s.t * 7.1), sc = 1;
    B.armL.rotation.z = Math.sin(s.t * 3 + s.ph) * 0.3; B.armR.rotation.z = -Math.sin(s.t * 3 + s.ph + 1) * 0.3;
    if (st.windup >= 0) { const w = sm(st.windup * 1.2); sc = 1 + 0.18 * w; sp = 1 + 0.6 * w * (0.6 + 0.4 * Math.sin(s.t * 40)); b.position.x += Math.sin(s.t * 60) * 0.012 * w; B.armL.rotation.z += 1.6 * w; B.armR.rotation.z -= 1.6 * w; }
    if (st.attack >= 0 && st.attack < 1) { const k = Math.sin(PI * st.attack); b.rotation.x += 0.3 * k; sc *= 1 - 0.1 * k; sp = 1.5 * (1 - st.attack) + 0.4; }
    { const u = gag(s, st, dt, 2.4, 5); if (u >= 0) { const g = bumpU(u, 0, 1); b.rotation.y = Math.sin(u * TAU * 2) * 0.6 * g; sp += 0.6 * g; s.eyeK = 1 - 0.8 * bumpU(u, 0.3, 0.7); } else b.rotation.y = 0; }
    b.scale.set(sc, sc * (1 + 0.03 * breath(s)), sc);
    B.sparks.scale.setScalar(Math.max(0.0001, sp)); B.sparks.rotation.y = s.t * 0.9;
    boing(s, st, dt, b);
  }

  // ════════ RÜZGÂR BALONU ════════
  function buildBalon(r, o) {
    const E = o.elite, c0 = col(E ? '#ff8fb8' : '#8fd0ff'), cL = col(E ? '#ffd0e4' : '#d6f0ff');
    r.bone('body', 'root', [0, 0.45, 0]);
    r.bone('cheeks', 'body', [0, 0.7, 0.3]);
    r.bone('string', 'root', [0, 0.36, 0]);
    r.on('body').fx(0, 0.85).add(G.sphere(24, 18), (x, y) => mixc(c0, cL, sm((y - 0.4) / 0.7)), [0, 0.8, 0], null, [0.42, 0.46, 0.42]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.5), [-0.18, 1.05, 0.28], [0.3, -0.5, 0.3], [0.05, 0.12, 0.02]);
    r.fx(0, 0.6).add(G.cone(12), c0, [0, 0.33, 0], [PI, 0, 0], [0.08, 0.1, 0.08]);
    r.add(G.sphere(10, 8), c0, [0, 0.28, 0], null, [0.06, 0.04, 0.06]);
    // gökkuşağı kuşak
    for (let i = 0; i < 3; i++) r.add(G.torus(TAU, 0.06, 28), RAINBOW[i * 2], [0, 0.66 + i * 0.05, 0], [PI / 2, 0, 0], [0.4 - i * 0.012, 0.4 - i * 0.012, 0.4]);
    r.on('string').fx(0, 0); r.seg([0, 0.28, 0], [0.05, 0.05, -0.04], 0.008, '#ffffff'); r.seg([0.05, 0.05, -0.04], [-0.03, -0.25, 0.02], 0.008, '#ffffff');
    r.on('body');
    K.face(r, [0, 0.82, 0.02], 0.42, yuz({ bone: 'body', tilt: 0.15, ex: 0.13, ey: 0.06, er: 0.1, iris: E ? '#7a2a5a' : '#1a4a8a', skin: c0, browCol: E ? '#7a2a5a' : '#1e4a7a', browY: 1.36,
      mouthY: -0.12, mouthW: 0.08, blushCol: '#ff7fa6', heartY: 0.8, mouthPivot: true }));
    // şişen yanaklar (ayrı kemik)
    r.on('cheeks').fx(0, 0.5);
    for (const sd of [-1, 1]) r.add(G.sphere(14, 10), mixc(c0, '#ffc0d8', 0.45), [sd * 0.2, 0.7, 0.32], null, [0.1, 0.09, 0.07]);
    if (E) K.crown(r.on('body'), [0, 1.24, -0.04], 0.45);
    r.on('body').mark('muzzle', [0, 0.72, 0.45]);
    return { height: 1.3, glowC: col('#8fd0ff'), mat: { rough: 0.22, sss: col('#ffffff').multiplyScalar(0.05), rim: '#ffffff', rimK: 0.35, rimP: 2.3, wob: 0.012, wobF: 2.4, wobS: 4 } };
  }
  function animBalon(m, dt, st, s) {
    const B = m.B, b = B.body;
    b.position.y += Math.sin(s.t * 1.6 + s.ph) * 0.08;
    b.rotation.z = Math.sin(s.t * 1.1 + s.ph) * 0.08 + 0.1 * s.mv; b.rotation.x = 0.12 * s.mv;
    B.string.rotation.z = Math.sin(s.t * 2.3 + s.ph) * 0.3; B.string.rotation.x = -0.3 * s.mv;
    let sc = 1, ch = 0.4;
    if (st.windup >= 0) { const w = sm(st.windup * 1.2); sc = 1 + 0.16 * w; ch = 0.4 + 1.0 * w; b.rotation.x -= 0.3 * w; }
    if (st.attack >= 0 && st.attack < 1) { const k = Math.sin(PI * st.attack); b.rotation.x += 0.45 * k; b.position.z += 0.25 * k; sc *= 1 - 0.12 * k; ch = 0.2; s.mouthO = k; } else s.mouthO = 0;
    { const u = gag(s, st, dt, 2.2, 5); if (u >= 0) { const g = bumpU(u, 0, 1); b.rotation.y = Math.sin(u * TAU) * PI * g; b.position.y += 0.2 * g; } else b.rotation.y = 0; }
    b.scale.set(sc, sc * (1 + 0.02 * breath(s)), sc);
    B.cheeks.scale.setScalar(Math.max(0.0001, ch));
    if (B.mouth) B.mouth.scale.set(1 - 0.3 * (s.mouthO || 0), 1 + 1.4 * (s.mouthO || 0), 1);
    boing(s, st, dt, b);
  }

  // ════════ DOLU POFUDUĞU (elit) ════════
  function buildDolu(r, o) {
    const E = o.elite;
    r.bone('body', 'root', [0, 0.1, 0]);
    r.bone('armL', 'body', [0.42, 0.55, 0.05]); r.bone('armR', 'body', [-0.42, 0.55, 0.05]);
    r.bone('ball', 'armR', [-0.62, 0.62, 0.2]);
    r.bone('feet', 'root', [0, 0.04, 0.05]);
    r.on('body').fx(0, 0.15);
    cloudBody(r, 0, 0.52, 0.44, E ? '#d4e4ff' : '#e4eef8', '#ffffff', 10, 5);
    // kar tanesi süsleri
    r.fx(1, 0);
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; r.add(G.octa(), hdr('#cfe8ff', 1.3), [Math.sin(a) * 0.42, 0.45 + Math.cos(a * 1.7) * 0.2, Math.cos(a) * 0.3 + 0.1], [0, a, 0], [0.04, 0.04, 0.01]); }
    r.fx(0, 0);
    // atkı
    r.fx(0, 0.2).add(G.torus(TAU, 0.18, 24), '#ff9ac8', [0, 0.22, 0.02], [PI / 2, 0, 0], [0.38, 0.36, 0.36]);
    r.add(G.box(), '#ff9ac8', [0.18, 0.08, 0.34], [0.2, 0, 0.3], [0.1, 0.22, 0.04]);
    r.on('armL'); mitt(r, [0.55, 0.5, 0.12], 0.1, '#7ab8ff');
    r.on('armR'); mitt(r, [-0.55, 0.5, 0.12], 0.1, '#7ab8ff');
    r.on('ball').fx(0, 0.2).add(G.ico(2), '#f8fcff', [-0.62, 0.62, 0.2], null, 0.14);
    r.on('feet').fx(0, 0.5);
    for (const sd of [-1, 1]) r.add(G.sphere(12, 8), '#7ab8ff', [sd * 0.18, 0.04, 0.08], null, [0.1, 0.06, 0.13]);
    r.on('body');
    K.face(r, [0, 0.56, 0.04], 0.44, yuz({ bone: 'body', tilt: 0.2, ex: 0.14, ey: 0.05, er: 0.11, iris: '#2a4a8a', skin: '#f2f6fc', browCol: '#6a7a9a', browY: 1.36,
      mouthY: -0.12, mouthW: 0.1, blushCol: '#ff9ac8', heartY: 0.8 }));
    if (E) K.crown(r.on('body'), [0, 1.02, -0.05], 0.55);
    r.on('ball').mark('muzzle', [-0.62, 0.62, 0.2]);
    return { height: 1.1, glowC: col('#cfe8ff'), mat: { rough: 0.7, sss: col('#e8f4ff').multiplyScalar(0.1), rim: '#eaf6ff', rimK: 0.4, rimP: 2.1, wob: 0.015, wobF: 2.5, wobS: 4 } };
  }
  function animDolu(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 7), ph = s.walk;
    b.position.y += Math.abs(Math.sin(ph)) * 0.06 * k;
    b.rotation.z = Math.sin(ph) * 0.1 * k + Math.sin(s.t * 1.3 + s.ph) * 0.03;
    B.feet.position.y += Math.max(0, Math.sin(ph)) * 0.03 * k;
    B.armL.rotation.z = Math.sin(ph) * 0.3 * k + 0.1 * breath(s); B.armR.rotation.z = -Math.sin(ph) * 0.3 * k;
    let ball = 0.0001, sc = 1;
    if (st.windup >= 0) { const w = sm(st.windup * 1.2); ball = w; B.armR.rotation.z = -2.2 * w; B.armR.rotation.x = -0.4 * w; b.rotation.x = -0.15 * w; sc = 1 + 0.05 * w; }
    if (st.attack >= 0 && st.attack < 1) { const kk = Math.sin(PI * st.attack); B.armR.rotation.z = -2.2 + 2.8 * sm(st.attack * 2); b.rotation.x = 0.2 * kk; ball = st.attack < 0.2 ? 1 : 0.0001; }
    { const u = gag(s, st, dt, 2.6, 5); if (u >= 0) { const g = bumpU(u, 0, 1); ball = Math.max(ball, g); B.armL.rotation.z += 1.5 * g; B.armR.rotation.z -= 1.5 * g; B.ball.position.y += Math.abs(Math.sin(u * TAU * 2)) * 0.5 * g; } }
    B.ball.scale.setScalar(Math.max(0.0001, ball));
    b.scale.set(sc, sc * (1 + 0.03 * breath(s)), sc);
    boing(s, st, dt, b);
  }

  // ════════ YAĞMUR DAMLACIĞI (+ nadir Gökkuşağı Damlacığı) ════════
  const DROP_P = [[0, 0], [0.2, 0.02], [0.3, 0.12], [0.32, 0.26], [0.27, 0.42], [0.17, 0.58], [0.07, 0.72], [0, 0.8]];
  function buildDamla(r, o) {
    const E = o.elite, R = o.rare, c0 = col(E ? '#5aa8ff' : '#6cc4ff'), cL = col('#d8f2ff');
    r.bone('body', 'root', [0, 0.02, 0]);
    r.bone('feet', 'root', [0, 0.02, 0.05]);
    const dropC = R ? (x, y, z) => col(RAINBOW[Math.max(0, Math.min(6, Math.floor((y / 0.8) * 7)))]).lerp(col('#ffffff'), 0.25) : (x, y) => mixc(c0, cL, sm((y - 0.25) / 0.5));
    r.on('body').fx(0, 0.95).add(K.lathe('gkDamla', DROP_P, 36, 4), dropC, [0, 0.02, 0]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.6), [-0.12, 0.5, 0.2], [0.3, -0.5, 0.3], [0.04, 0.1, 0.015]);
    r.add(G.sphere(8, 6), hdr('#ffffff', 1.6), [-0.17, 0.36, 0.24], null, 0.025);
    r.on('feet').fx(0, 0.6);
    for (const sd of [-1, 1]) r.add(G.sphere(12, 8), R ? '#ffffff' : '#3a8ad8', [sd * 0.13, 0.03, 0.06], null, [0.08, 0.05, 0.1]);
    r.on('body');
    K.face(r, [0, 0.28, 0.0], 0.3, yuz({ bone: 'body', tilt: 0.1, ex: 0.1, ey: 0.02, er: 0.085, iris: '#1a3a7a', skin: R ? '#ffffff' : c0, browCol: '#1e4a7a', browY: 1.36,
      mouthY: -0.1, mouthW: 0.08, blushCol: '#ff7fa6', heartY: 0.9 }));
    if (E) K.crown(r.on('body'), [0, 0.8, -0.02], 0.4);
    r.mark('muzzle', [0, 0.35, 0.3]);
    return { height: 0.82, glowC: col(R ? '#ffe36e' : '#8fd8ff'), mat: { rough: 0.08, sss: col('#bfe8ff').multiplyScalar(0.12), rim: '#ffffff', rimK: 0.45, rimP: 2.2, wob: 0.02, wobF: 3, wobS: 5 } };
  }
  function animDamla(m, dt, st, s) {
    const B = m.B, b = B.body;
    s.hopK = damp(s.hopK || 0, st.move > 0.05 ? 1 : 0, 6, dt);
    if (s.hopK > 0.02 || (s.hop % 1) > 0.03) s.hop = (s.hop || 0) + dt * (2.2 + 0.8 * s.mv);
    const u = (s.hop || 0) % 1, A = s.hopK;
    let y = 0, sy = 1;
    if (u < 0.2) sy -= 0.2 * Math.sin(PI * u / 0.2) * A;
    else if (u < 0.82) { const k = (u - 0.2) / 0.62; y = Math.sin(PI * k) * 0.35 * A; sy += 0.15 * Math.abs(Math.cos(PI * k)) * A; }
    else sy -= 0.22 * Math.sin(PI * (u - 0.82) / 0.18) * A;
    if (st.windup >= 0) { const w = sm(st.windup * 1.2); sy *= 1 - 0.28 * w; b.position.x += Math.sin(s.t * 50) * 0.01 * w; }
    if (st.attack >= 0 && st.attack < 1) { const k = Math.sin(PI * st.attack); y += 0.5 * k; sy *= 1 + 0.2 * k; }
    { const g = gag(s, st, dt, 2.0, 4.5); if (g >= 0) { const q = bumpU(g, 0, 1); b.rotation.y = g * TAU * q; sy *= 1 + 0.1 * Math.sin(g * 30) * q; } else b.rotation.y = 0; }
    b.position.y += y; b.scale.set(1 + (1 - sy) * 0.6, sy, 1 + (1 - sy) * 0.6);
    b.rotation.z = Math.sin(s.t * 1.7 + s.ph) * 0.05;
    boing(s, st, dt, b, 1.3);
  }

  // ════════ KOCA FIRTINA BULUTU (final boss) ════════
  // Kocaman lavanta-gri bulut, gece külahı (ucu ponponlu, yıldızlı), uykulu kocaman gözler, pofuduk bulut kollar, çevresinde
  // çıtırdayan minik ışık kıvılcımları. Esner (ağız "O"), yanaklarını şişirip üfler, kollarını sallayıp yağmur yağdırır.
  function buildFirtina(r, o) {
    r.bone('body', 'root', [0, 1.6, 0]);
    r.bone('cap', 'body', [0, 2.9, -0.2]);
    r.bone('armL', 'body', [1.55, 1.7, 0.1]); r.bone('armR', 'body', [-1.55, 1.7, 0.1]);
    r.bone('cheeks', 'body', [0, 1.55, 1.2]);
    r.bone('sparks', 'body', [0, 2.0, 0]);
    r.bone('drops', 'body', [0, 0.6, 0]);
    r.on('body').fx(0, 0.2);
    cloudBody(r, 0, 1.85, 1.45, '#7c78aa', '#d6d0f0', 12, 9);
    // alt etek: daha koyu pofuduk sıra
    for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.6, s = 0.5 + hash(i, 2, 4) * 0.15; r.add(G.sphere(16, 12), '#8a86b8', [Math.sin(a) * 1.25, 0.72 + Math.abs(a) * 0.12, Math.cos(a) * 0.55], null, [s, s * 0.8, s]); }
    // gece külahı: çizgili koni, ucu sarkık, ponpon, yıldızlar
    r.on('cap').fx(0, 0.25);
    r.push([0.1, 2.95, -0.25], [-0.35, 0, -0.35]);
    for (let i = 0; i < 6; i++) { const y0 = i * 0.22, rr = 0.85 * (1 - i / 6.5); r.add(G.cyl(0.8, 1, 20), i % 2 ? '#ffd6ec' : '#b69cff', [0, y0 + 0.11, 0], null, [rr, 0.22, rr]); }
    r.add(G.sphere(14, 10), '#ffffff', [0.05, 1.42, 0], null, 0.2);
    r.fx(1, 0); for (let i = 0; i < 3; i++) { const a = i * 2.1; r.add(K.star5Geo ? K.star5Geo() : G.octa(), hdr('#ffe36e', 1.4), [Math.sin(a) * 0.55 * (1 - i * 0.15), 0.25 + i * 0.3, Math.cos(a) * 0.55 * (1 - i * 0.15) + 0.05], [0, a, 0], 0.09); }
    r.fx(0, 0.25); r.add(G.torus(TAU, 0.22, 28), '#ffffff', [0, 0.02, 0], [PI / 2, 0, 0], [0.86, 0.86, 0.9]);
    r.pop();
    // kollar
    r.on('armL').fx(0, 0.2); for (let i = 0; i < 3; i++) r.add(G.sphere(16, 12), '#d8d6ee', [1.6 + i * 0.32, 1.65 - i * 0.18, 0.15 + i * 0.05], null, [0.42 - i * 0.07, 0.38 - i * 0.06, 0.4 - i * 0.07]);
    r.on('armR'); for (let i = 0; i < 3; i++) r.add(G.sphere(16, 12), '#d8d6ee', [-1.6 - i * 0.32, 1.65 - i * 0.18, 0.15 + i * 0.05], null, [0.42 - i * 0.07, 0.38 - i * 0.06, 0.4 - i * 0.07]);
    // çıtırdayan kıvılcımlar
    r.on('sparks').fx(1, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; spark(r, [Math.cos(a) * 1.9, 2.0 + Math.sin(a * 2) * 0.5, Math.sin(a) * 0.9 - 0.2], 1.6, a); }
    // yağmur damlaları (yağdırırken görünür)
    r.on('drops').fx(0.3, 1);
    for (let i = 0; i < 10; i++) r.add(G.sphere(10, 8), hdr('#8fd8ff', 1.1), [(hash(i, 1, 9) - 0.5) * 2.4, 0.3 - hash(i, 4, 9) * 0.6, (hash(i, 6, 9) - 0.5) * 1.2], null, [0.07, 0.11, 0.07]);
    r.fx(0, 0);
    r.on('body');
    K.face(r, [0, 1.8, 0.1], 1.32, yuz({ bone: 'body', tilt: 0.12, ex: 0.42, ey: 0.08, er: 0.3, iris: '#3a2a78', skin: '#dcd8f2', browCol: '#5a4a8c', browY: 1.3,
      mouthY: -0.4, mouthW: 0.3, blushCol: '#ff9ac8', heartY: 0.85, mouthPivot: true, heartS: 0.3 }));
    r.on('cheeks').fx(0, 0.4);
    for (const sd of [-1, 1]) r.add(G.sphere(16, 12), '#ffc8e0', [sd * 0.68, 1.5, 1.22], null, [0.32, 0.28, 0.2]);
    r.on('body').mark('muzzle', [0, 1.4, 1.4]);
    return { height: 4.2, glowC: col('#ffe36e'), dieHop: 0.1, portrait: { cx: 0, cy: 3.2, cz: 0.5, rad: 1.6, dy: 0.5 },
      mat: { rough: 0.75, sss: col('#e8e4ff').multiplyScalar(0.08), rim: '#fff4ff', rimK: 0.4, rimP: 2.1, wob: 0.012, wobF: 1.6, wobS: 2.5 } };
  }
  function animFirtina(m, dt, st, s) {
    const B = m.B, b = B.body, ph = st.phase, u = st.phaseT || 0;
    b.position.y += Math.sin(s.t * 1.2 + s.ph) * 0.12 + (st.fly || 0);
    b.rotation.z = Math.sin(s.t * 0.8 + s.ph) * 0.04;
    let sc = 1, ch = 0.35, aL = Math.sin(s.t * 1.5) * 0.15, aR = -Math.sin(s.t * 1.5 + 1) * 0.15, mo = 0, sp = 0.55 + 0.45 * Math.abs(Math.sin(s.t * 17) * Math.sin(s.t * 5.3)), dr = 0.0001, cap = Math.sin(s.t * 1.1) * 0.08;
    if (ph === 'ruzgar') {   // yanak şişir → üfle
      if (u < 0.45) { const w = sm(u / 0.45); ch = 0.35 + 1.1 * w; sc = 1 + 0.08 * w; b.rotation.x = -0.12 * w; }
      else { const k = bumpU(u, 0.45, 1); ch = 0.3; mo = k; b.rotation.x = 0.18 * k; b.position.z += 0.3 * k; cap += 0.5 * k; }
    } else if (ph === 'yagmur' || ph === 'dolu') {   // kolları sallar, damlalar düşer
      const k = bumpU(u, 0, 1); aL = 0.9 * k + Math.sin(s.t * 9) * 0.4 * k; aR = -0.9 * k - Math.sin(s.t * 9 + 1) * 0.4 * k; dr = ph === 'yagmur' ? Math.max(0.0001, k) : 0.0001;
      if (dr > 0.001) B.drops.position.y -= (s.t * 2.2 % 1) * 0.8;
      b.position.x += Math.sin(s.t * 14) * 0.04 * k;
    } else if (ph === 'summon' || ph === 'roar') { const k = bumpU(u, 0, 1); aL = 1.6 * k; aR = -1.6 * k; sp = 1.6 * k + 0.5; sc = 1 + 0.06 * k; mo = 0.5 * k; }
    else if (ph === 'esneme' || ph === 'ucus' || st.esne > 0.02) {   // esner: kocaman "O" ağız, gözler kapanır, kollar gerinir
      const k = ph === 'ucus' ? 0.5 + 0.5 * Math.sin(s.t * 0.9) : ph === 'esneme' ? bumpU(u, 0, 1) : st.esne; mo = 0.6 + 0.4 * k; s.eyeK = 1 - 0.85 * k; aL = 1.2 * k; aR = -1.2 * k; cap += 0.2 * k; sp = 0.3;
    }
    if (st.hurt > 0.4) mo = Math.max(mo, 0.4);
    b.scale.set(sc, sc * (1 + 0.025 * breath(s, 1.4)), sc);
    B.cheeks.scale.setScalar(Math.max(0.0001, ch));
    B.armL.rotation.z = aL; B.armR.rotation.z = aR;
    B.sparks.scale.setScalar(Math.max(0.0001, sp)); B.sparks.rotation.y = s.t * 0.4;
    B.drops.scale.setScalar(dr);
    B.cap.rotation.z = cap;
    if (B.mouth) B.mouth.scale.set(1 + 0.45 * mo, 1 + 3.2 * mo, 1 + 0.3 * mo);
    boing(s, st, dt, b, 0.6);
  }

  // ════════ Kayıt ════════
  const RARE_STATS = { hp: 14, dmg: 2, speed: 3.0, xp: 30, gold: 12, aggro: 7 };
  const T = [
    // id, ad, base, saldiri, stats, kurucu, anim, lod, ilkSoz, nadir, boyut
    ['simsekcik', 'Şimşekçik', 'yildizcik', 'uzak', { eliteAd: 'Kocaman Şimşekçik', hp: 18, dmg: 4, speed: 2.1, r: 0.45, height: 1.0, atkRange: 6.0, range: 6.0, atkCd: 2.9, windup: 0.95, aggro: 9, fly: true, hover: 0.55, shot: { kind: 'bubble', speed: 3.6, r: 0.26, col: '#ffe36e' } }, buildSimsek, animSimsek, 0.55, 'pr_ilk_simsekcik'],
    ['ruzgarBalonu', 'Rüzgâr Balonu', 'goblin', 'ucan', { eliteAd: 'Kocaman Rüzgâr Balonu', hp: 22, dmg: 4, speed: 2.4, r: 0.45, height: 1.3, atkRange: 1.6, atkCd: 2.1, windup: 0.85, aggro: 9, hover: 0.35 }, buildBalon, animBalon, 0.55, 'pr_ilk_ruzgarBalonu'],
    ['doluPofudugu', 'Dolu Pofuduğu', 'mantar', 'uzak', { eliteAd: 'Kocaman Dolu Pofuduğu', hp: 26, dmg: 4, speed: 1.9, r: 0.5, height: 1.1, atkRange: 6.0, range: 6.0, atkCd: 3.0, windup: 1.0, aggro: 9, shot: { kind: 'bubble', speed: 3.4, r: 0.3, col: '#f4fbff' } }, buildDolu, animDolu, 0.6, 'pr_ilk_doluPofudugu', false, 1.15],
    ['yagmurDamlacigi', 'Yağmur Damlacığı', 'yogurt', 'ziplayan', { eliteAd: 'Kocaman Yağmur Damlası', hp: 20, dmg: 4, speed: 2.5, r: 0.4, height: 0.82, atkRange: 2.4, atkCd: 2.0, windup: 0.75, aggro: 9 }, buildDamla, animDamla, 0.5, 'pr_ilk_yagmurDamlacigi'],
    ['gokkusagiDamla', 'Gökkuşağı Damlacığı', 'yogurt', 'ziplayan', Object.assign({ r: 0.4, height: 0.82, atkRange: 2.4, atkCd: 2.4, windup: 0.9 }, RARE_STATS), (r, o) => buildDamla(r, Object.assign({}, o, { rare: true })), animDamla, 0.5, 'pr_ilk_gokkusagiDamla', true],
  ];
  const RARE = {};
  for (const [id, ad, base, saldiri, stats, mk, an, lod, ilk, rare, boyut] of T) {
    const def = { ad, base, saldiri, stats, ilkSoz: ilk };
    if (boyut) def.boyut = boyut;
    if (rare) { def.nadir = true; RARE[id] = true; }
    if (HAS) { EMODEL.addType(id, mk, an, lod); def.model = o => EMODEL.buildRaw(id, o || {}); }
    HUYSUZ.type(id, def);
    if (stats.fly && typeof EDEF !== 'undefined' && EDEF[id]) { EDEF[id].fly = true; EDEF[id].hover = stats.hover; }
  }
  const BOSS = 'kocaFirtinaBulutu';
  const bdef = { ad: 'Koca Fırtına Bulutu', base: 'kraljole', stats: { r: 1.7, height: 4.2 },
    lines: { giris: 'pr_kocaFirtinaBulutu_giris', bitti: 'pr_kocaFirtinaBulutu_bitti', yarim: 'pr_kocaFirtinaBulutu_yarim' },
    bossKit: { own: true, add: 'simsekcik', at: [0.7, 0.45], n: [2, 2], col: '#c8b8ff', roar: 0.85 } };
  if (HAS) { EMODEL.addType(BOSS, buildFirtina, animFirtina, 0.85); bdef.model = o => EMODEL.buildRaw(BOSS, o || {}); }
  HUYSUZ.boss(BOSS, bdef);
  HUYSUZ.zone('gokkusagi', { enemies: { simsekcik: 3, ruzgarBalonu: 3, doluPofudugu: 2.5, yagmurDamlacigi: 4, gokkusagiDamla: 0.3 }, elites: ['doluPofudugu'], boss: BOSS });

  // ════════ Boss hamleleri (BOSSDAV.register) ════════
  // Kendi küçük olay havuzu: yere işaret (≥1,1 s) → yağmur damlası / dolu / rüzgâr; son aşamada uçuşta toplanan ışık topları.
  const W = { drops: [], orbs: [], gust: null };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sq = x => x * x;
  const API = () => (typeof BOSSDAV !== 'undefined' && BOSSDAV.api) || null;
  const PM = {}, PG = {};
  const pmat = (k, o) => PM[k] || (PM[k] = new THREE.MeshStandardMaterial(o));
  function prop(kind) {   // havuzlu sahne eşyası
    const pool = PG[kind] || (PG[kind] = []);
    let o = pool.find(p => !p.userData.used);
    if (!o) {
      if (kind === 'damla') { o = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), pmat('damla', { color: '#8fd8ff', roughness: 0.1, emissive: '#3a9ad8', emissiveIntensity: 0.3 })); o.scale.set(1, 1.4, 1); }
      else if (kind === 'dolu') o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 2), pmat('dolu', { color: '#f8fcff', roughness: 0.75, emissive: '#bfe6ff', emissiveIntensity: 0.3 }));
      else {   // ışık topu: parlak çekirdek + gökkuşağı halkası
        o = new THREE.Group();
        o.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6c8').multiplyScalar(1.6) })));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb8e8').multiplyScalar(1.5), transparent: true, opacity: 0.8 }));
        ring.name = 'ring'; o.add(ring);
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), new THREE.MeshBasicMaterial({ color: '#fff2a8', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
        o.add(halo);
      }
      o.castShadow = false; o.userData.kind = kind; pool.push(o);
    }
    o.userData.used = true; o.visible = true;
    const A = API(); if (A && A.L && A.L.group && o.parent !== A.L.group) A.L.group.add(o);
    return o;
  }
  function unprop(o) { if (!o) return; o.userData.used = false; o.visible = false; if (o.parent) o.parent.remove(o); }
  function clearAll() {
    for (const d of W.drops) { unprop(d.prop); }
    for (const o of W.orbs) unprop(o.prop);
    W.drops.length = 0; W.orbs.length = 0; W.gust = null;
    if (HOOP) HOOP.visible = false;
  }
  // yere düşen şey: işaret → düşüş → değdiyse az hasar
  function dropAt(b, x, z, o) {
    const A = API(); if (!A || !A.isFloor(x, z)) return;
    const d = Object.assign({ b, x, z, t: 0, at: 1.25, r: 1.0, dmgK: 0.25, col: '#5ab4ff', kind: 'damla' }, o);
    d.mark = A.fx('telegraph', x, z, d.r, d.at, d.col); if (d.col === '#ffffff') zoneMark(x, z, d.r * 1.08, '#8a7cc4', d.at, 0);   // (beyaz halkanın dışında ince lila çizgi: açık zeminde seçilsin)
    zoneMark(x, z, d.r, d.col, d.at, d.col === '#ffffff' ? 0.5 : 0.3);   /* ses: damla "mavi halkalar", dolu "beyaz halkalar" */
    d.prop = prop(d.kind); d.prop.visible = false;
    W.drops.push(d);
  }
  function arenaSpots(b, cx, cz, n, rmin, rmax, gap) {
    const A = API(), out = [], rm = A.bossRoom();
    for (let t = 0; t < n * 14 && out.length < n; t++) {
      const a = rnd(0, TAU), r = out.length === 0 ? rnd(0, 0.6) : rnd(rmin, rmax), x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
      if (!A.isFloor(x, z) || (rm && !A.inRoom(rm, x, z, 0.8))) continue;
      if (out.some(p => sq(p.x - x) + sq(p.z - z) < gap * gap) || sq(x - b.x) + sq(z - b.z) < sq(b.r + 0.5)) continue;
      out.push({ x, z });
    }
    return out;
  }
  const say = (k, p = 2) => { const A = API(); if (A && A.hasLine(k)) A.say(k, p); };
  const piril = (fn, ...a) => { try { if (typeof PIRIL_GUC !== 'undefined' && PIRIL_GUC && typeof PIRIL_GUC[fn] === 'function') return PIRIL_GUC[fn](...a); } catch (e) { console.warn('[gokkusagi] PIRIL_GUC.' + fn, e); } return undefined; };
  const gk = (fn, ...a) => { try { if (typeof GOKKUSAGI !== 'undefined' && GOKKUSAGI && GOKKUSAGI[fn]) GOKKUSAGI[fn](...a); } catch (e) { /* süs yok */ } };
  const FLY_AT = 0.25, ORBS = 7;

  function startFlight(b, S) {
    const A = API();
    S.fly = { t: 0, got: 0, rideOk: false, ended: false, base: Math.max(0, Math.min(5, typeof PIRIL_GUC !== 'undefined' && PIRIL_GUC ? PIRIL_GUC.seviye | 0 : 0)) };
    // Pırıl büyür, Feza sırtına biner (PIRIL3D API'si; yoksa Feza yürüyerek toplar)
    piril('buyu', true);
    let ok = piril('ucus', true);
    if (!ok && typeof GAME !== 'undefined' && GAME.rideBilbo) { try { ok = GAME.rideBilbo(true, 999); } catch (e) { ok = false; } }
    S.fly.rideOk = !!ok;
    // çağrılmış minikler de esneyip neşelenir (uçuş sakin ve eğlenceli olsun)
    for (const e of (A.enemies || [])) if (e && !e.dead && !e.boss) { try { A.damage(e, e.hp + 1, { force: true }); } catch (err) { /* */ } }
    A.sfx('buyume', { vol: 0.8 }); A.sfx('ucus', { vol: 0.6 });
    sadeFt(A, b.x, b.height + 0.8, b.z, 'Hıııah... uykum geldi...', 'word');
    say('pr_kocaFirtinaBulutu_binis', 1); A.later(4.5, () => say('pp_gokkusagi_binis', 2));
    // 7 son ışık: arenanın çevresinde bir halka, havada (uçarken alınır; yürüyerek de yetişilir)
    const rm = A.bossRoom(), cx = rm ? rm.x : b.x, cz = rm ? rm.z : b.z, R = rm ? Math.max(5, (rm.r || 11) * 0.62) : 6;
    for (let i = 0; i < ORBS; i++) {
      const a = i / ORBS * TAU + 0.3; let x = cx + Math.sin(a) * R, z = cz + Math.cos(a) * R;
      if (!A.isFloor(x, z)) { x = cx + Math.sin(a) * R * 0.6; z = cz + Math.cos(a) * R * 0.6; }
      const p = prop('isik'); p.position.set(x, 1.6, z);
      const last = i === ORBS - 1;   // son ışık: altı ışık toplanınca arenanın ortasındaki gökkuşağı halkasında belirir
      W.orbs.push({ x, z, y: 1.6, prop: p, ph: i, got: false, t: 0, appear: last ? 1e9 : 0.25 * i, hoop: last });
      if (!last) A.burst('sparkle', x, 1.6, z, { color: '#fff1a8', count: 5 });
      else p.visible = false;
    }
  }
  function endFlight(S) {
    if (!S.fly || S.fly.ended) return;
    S.fly.ended = true;
    try { if (typeof PIRIL_GUC !== 'undefined' && PIRIL_GUC.AYAR && S.fly.boy0) PIRIL_GUC.AYAR.buyuk = S.fly.boy0; } catch (e) { /* */ }
    try { if (typeof PIRIL_GUC !== 'undefined' && typeof PIRIL_GUC.isikGoster === 'function') PIRIL_GUC.isikGoster(0); } catch (e) { /* */ }
    piril('buyu', false);   // (kutlamada geçidi kapatmasın; final sinematiği isterse yeniden büyütür)
    if (S.fly.rideOk) { if (!piril('ucus', false) && typeof GAME !== 'undefined' && GAME.rideBilbo) { try { GAME.rideBilbo(false); } catch (e) { /* */ } } }
  }

  // ── Uçuşun sinematik parçaları ──
  // ışıklar toplandıkça Pırıl'ın kanatları büyür ve parlar (model.isik), kendisi de biraz daha büyür
  function wingsGrow(F) {
    const n = Math.min(5, Math.max(F.base, Math.round(F.base + (5 - F.base) * F.got / ORBS)));
    try { if (typeof PIRIL_GUC !== 'undefined' && typeof PIRIL_GUC.isikGoster === 'function') PIRIL_GUC.isikGoster(n); else { const m = piril('model'); if (m && m.isik) m.isik(n); } } catch (e) { /* */ }
    try { if (typeof PIRIL_GUC !== 'undefined' && PIRIL_GUC.AYAR) { if (!F.boy0) F.boy0 = PIRIL_GUC.AYAR.buyuk; if (F.got % 3 === 0) { PIRIL_GUC.AYAR.buyuk = F.boy0 * (1 + 0.04 * F.got); piril('buyu', true); } } } catch (e) { /* */ }
  }
  // kanatlardan gökkuşağı parıltı izi + yanından geçen rüzgâr çizgileri
  function flightFx(dt, F) {
    const A = API(), P = A.P, m = piril('model'); if (!m || !m.root) return;
    F.fxT = (F.fxT || 0) + dt;
    const r = m.root.position, f = P.face || 0, lx = Math.cos(f), lz = -Math.sin(f), fx = Math.sin(f), fz = Math.cos(f), sc = m.root.scale.x || 1;
    for (const sd of [-1, 1]) {
      const c = RAINBOW[((F.fxT * 6) | 0) % 7], w = 0.75 * sc;
      A.emitP(r.x + lx * sd * w - fx * 0.3, r.y + 0.45 * sc, r.z + lz * sd * w - fz * 0.3, -fx * 1.5 + rnd(-0.3, 0.3), rnd(-0.2, 0.3), -fz * 1.5 + rnd(-0.3, 0.3), 0.9, 0.24, 0.04, c, '#ffffff', 0, 0, 0);
    }
    if (Math.random() < 0.7) {   // rüzgâr çizgisi: önden arkaya hızla geçen ince beyaz çizgi
      const a = rnd(-1, 1), d = rnd(2, 4), x = P.pos.x + fx * 3 + lx * a * d, z = P.pos.z + fz * 3 + lz * a * d;
      A.emitP(x, rnd(0.6, 3.2), z, -fx * 16, 0, -fz * 16, 0.28, 0.07, 0.02, '#ffffff', '#e8f4ff', 0, 0, 0);
    }
  }
  // gökkuşağından geçme: altı ışıktan sonra arenanın ortasında dev gökkuşağı halkası belirir, son ışık içinde
  let HOOP = null;
  function hoopGeo() {
    return PG.hoopG || (PG.hoopG = (() => { const k = new Kit(); for (let q = 0; q < 7; q++) k.add(new THREE.TorusGeometry(2.5 - q * 0.17, 0.085, 8, 56), RAINBOW[q], [0, 0, 0]); return k.build(); })());
  }
  function hoopShow(F) {
    const A = API(), o = W.orbs.find(q => q.hoop); if (!o) return;
    const rm = A.bossRoom(), P = A.P;
    let x = rm ? rm.x : P.pos.x, z = rm ? rm.z + 1.5 : P.pos.z - 4;
    if (Math.hypot(P.pos.x - x, P.pos.z - z) < 4) { x += (x - P.pos.x) || 4; z += (z - P.pos.z); }
    o.x = x; o.z = z; o.y = 1.8; o.appear = o.t + 0.6;
    if (!HOOP) { HOOP = new THREE.Mesh(hoopGeo(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 })); HOOP.name = 'gk-halka'; }
    if (A.L && A.L.group && HOOP.parent !== A.L.group) A.L.group.add(HOOP);
    HOOP.position.set(x, 1.8, z); HOOP.rotation.set(0, Math.atan2(P.pos.x - x, P.pos.z - z), 0); HOOP.scale.setScalar(0.01); HOOP.visible = true;
    HOOP.userData.k = 0; HOOP.userData.out = -1;
    A.sfx('gokkusagiTini', { x, z }); A.burst('sparkle', x, 1.8, z, { count: 15, color: '#fff1a8' });
    sadeFt(A, x, 4.8, z, 'Gökkuşağından geç!', 'word');
    void F;
  }
  function hoopPass(o) {   // içinden geçince: renk renk patlama, "Vuuu!"
    const A = API();
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; A.burst('sparkle', o.x + Math.cos(a) * 2.4 * Math.cos(HOOP ? HOOP.rotation.y : 0), 1.8 + Math.sin(a) * 2.4, o.z - Math.cos(a) * 2.4 * Math.sin(HOOP ? HOOP.rotation.y : 0), { count: 4, color: RAINBOW[i % 7] }); }
    A.burst('confetti', o.x, 2.5, o.z, {}); A.burst('star', o.x, 2, o.z, { count: 8 });
    A.fx('ring', o.x, o.z, { r0: 0.5, r1: 7, dur: 0.7, color: '#ffffff', width: 0.6 });
    A.sfx('whoosh', { x: o.x, z: o.z, pitch: 1.3 }); A.sfx('gokkusagiTini', { x: o.x, z: o.z, pitch: 1.2 }); A.shake(0.15);
    sadeFt(A, o.x, 3.6, o.z, 'Vuuuu!', 'word');
    if (HOOP) HOOP.userData.out = 0;
  }
  function hoopTick(dt) {
    if (!HOOP || !HOOP.visible) return;
    const u = HOOP.userData;
    if (u.out >= 0) { u.out += dt; const k = Math.max(0, 1 - u.out / 0.9); HOOP.scale.setScalar(Math.max(0.01, (1 + u.out * 0.6) * k)); HOOP.material.opacity = 0.95 * k; if (k <= 0) { HOOP.visible = false; HOOP.material.opacity = 0.95; } }
    else { u.k = Math.min(1, u.k + dt * 1.6); const e = u.k < 1 ? Math.sin(u.k * PI / 2) * 1.08 : 1; HOOP.scale.setScalar(Math.max(0.01, e)); HOOP.rotation.z += dt * 0.4; }
  }
  // kamera: uçuşta hafifçe alçalıp Feza ile Pırıl'ı yakından, yavaşça salınarak takip eder (UI kamerasının üstüne karışır)
  const CAMF = { w: 0, t: 0, pos: null, look: null, tgt: null };
  function flightCam(dt, cam) {
    if (!CAMF.pos) { CAMF.pos = new THREE.Vector3(); CAMF.look = new THREE.Vector3(); CAMF.tgt = new THREE.Vector3(); }
    const b = W.boss, F = b && b.dv && b.dv.fly, on = !!(F && !F.ended && !b.dead && typeof GAME !== 'undefined' && GAME.state === 'play');
    CAMF.w += ((on ? 1 : 0) - CAMF.w) * Math.min(1, dt * 1.4);
    if (CAMF.w < 0.01) return;
    CAMF.t += dt;
    const P = GAME.P, y = (GAME.H && GAME.H.root ? GAME.H.root.position.y : 0) + 0.9;
    CAMF.tgt.set(P.pos.x, y, P.pos.z);
    const yaw = Math.sin(CAMF.t * 0.32) * 0.3, pitch = 0.68, d = 13.5, w = CAMF.w * CAMF.w * (3 - 2 * CAMF.w);
    CAMF.pos.set(P.pos.x + Math.sin(yaw) * Math.cos(pitch) * d, y + Math.sin(pitch) * d, P.pos.z + Math.cos(yaw) * Math.cos(pitch) * d);
    CAMF.look.copy(typeof CAM !== 'undefined' && CAM.target ? CAM.target : CAMF.tgt).lerp(CAMF.tgt, w);
    cam.position.lerp(CAMF.pos, w);
    cam.lookAt(CAMF.look);
  }
  function camHook() {
    if (typeof STORY === 'undefined' || !STORY || STORY._gkCam) return;
    const c0 = STORY.camera;
    STORY.camera = function (dt, cam) {
      const r = typeof c0 === 'function' ? c0.apply(this, arguments) : false;
      if (!r) { try { flightCam(dt, cam); } catch (e) { /* kamera karışımı yok */ } }
      return r;
    };
    STORY._gkCam = true;
  }
  // Pırıl'ın kanatları tam yanınca (5. ışık ona ulaşınca) büyük ışık patlaması
  function lightBoom() {
    const A = API(); if (!A) return;
    const m = piril('model'), p = m && m.root ? m.root.position : A.P.pos, x = p.x, z = p.z;
    A.fx('lightFlash', x, z, '#fff6c8', 18, 1.0); A.shake(0.25);
    for (let i = 0; i < 3; i++) A.later(i * 0.25, () => A.fx('ring', x, z, { r0: 0.5, r1: 9 + i * 4, dur: 0.8, color: i === 1 ? '#ffd6f0' : '#fff6c8', width: 0.8 }));
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; A.burst('sparkle', x + Math.sin(a) * 2.5, 1.5 + (i % 3) * 0.8, z + Math.cos(a) * 2.5, { count: 5, color: RAINBOW[i % 7] }); }
    A.burst('star', x, 2.5, z, { count: 15 }); A.burst('confetti', x, 3, z, {}); A.burst('hearts', x, 2.2, z, { count: 6 });
    A.sfx('cheer', { vol: 0.7 }); A.sfx('bell', { pitch: 1.5, vol: 0.6 });
  }

  // SADE8: uyarı cümlesi, yere işaret çizildiği AN söylenir (kuyrukta bekleyip başka saldırının üstüne düşmesin).
  //   Motorun kendi ipucu çağrısı choose()'da önceden "söylendi" işaretlenir; cümleyi biz, işaretle aynı karede (araya girerek) söyleriz.
  function cue(A, S, ph, key) {
    S.cue = S.cue || {}; const k = S.pendingLine || (!S.cue[ph] && key);
    S.pendingLine = null; S.cue[ph] = true; if (!k) return;
    try { if (A.hasLine && !A.hasLine(k)) return; A.say(k, 3, { interrupt: true }); } catch (e) { /* ses yok */ }
  }
  if (typeof BOSSDAV !== 'undefined' && BOSSDAV.register) BOSSDAV.register(BOSS, {
    hpK: 2.4, keep: 6.5, roarD: 2.2,
    choose(b, S, d) {
      const A = API(), f = b.hp / b.maxHp; W.boss = b;
      if (S.hints) { S.hints.ruzgar = S.hints.yagmur = S.hints.dolu = true; }   // (SADE8: bu ipuçlarını cue() söyler)
      if (f <= FLY_AT + 1e-6 && !S.fly) { A.bossPhase(b, 'esneme', 2.4); return; }
      if (S.fly) { A.bossPhase(b, 'ucus', 999); return; }
      const opts = f > 0.66 ? [['ruzgar', 0.5], ['yagmur', 0.5]] : [['ruzgar', 0.3], ['yagmur', 0.35], ['dolu', 0.35]];
      const ph = A.pickPhase(b, opts);
      A.bossPhase(b, ph, { ruzgar: 3.0, yagmur: 3.2, dolu: 3.0 }[ph]);
    },
    hints: { ruzgar: 'pr_ipucu_ruzgar', yagmur: 'pr_ipucu_yagmur', dolu: 'pr_ipucu_dolu' },
    moves: {
      // Rüzgâr: yanaklarını şişirir (Feza'ya doğru açık mavi koni ~1,3 s), sonra "püüüf!" — konideki Feza yumuşakça geri itilir.
      ruzgar(b, S, dt, d, ux, uz) {
        const A = API(), t = b.stT, W0 = 1.35, W1 = 2.5;
        if (b.did === 0) { b.did = 1; cue(A, S, 'ruzgar', 'pr_ipucu_ruzgar'); S.aim = Math.atan2(ux, uz); b.tele = A.fx('telegraphCone', b.x, b.z, S.aim, 1.0, 9, W0, '#4aa8ff'); laneMark(b.x, b.z, b.x + Math.sin(S.aim) * 9, b.z + Math.cos(S.aim) * 9, 3.6, '#4aa8ff', W0 + 1.0, 0.3); /* ses: "mavi rüzgâr" */ A.sfx('bulutPuf', { x: b.x, z: b.z, pitch: 0.7 }); }
        b.face = dampAngle(b.face, S.aim, 6, dt);
        if (t >= W0 && t < W1) {
          if (b.did === 1) { b.did = 2; A.sfx('whoosh', { x: b.x, z: b.z, pitch: 0.55, vol: 0.9 }); sadeFt(A, b.x, b.height + 0.5, b.z, 'Püüüf!', 'word'); S.pushed = false; }
          const P = A.P, px = P.pos.x - b.x, pz = P.pos.z - b.z, pd = Math.hypot(px, pz) || 1;
          let da = Math.atan2(px, pz) - S.aim; da = Math.atan2(Math.sin(da), Math.cos(da));
          for (let k = 0; k < 2; k++) { const a = S.aim + rnd(-0.45, 0.45), r = rnd(2, 8); A.emitP(b.x + Math.sin(a) * r, rnd(0.3, 1.8), b.z + Math.cos(a) * r, Math.sin(a) * 9, 0.2, Math.cos(a) * 9, 0.5, 0.25, 0.05, '#ffffff', '#cfeaff', 0, 0, 0); }
          if (!P.dead && pd < 9.5 && Math.abs(da) < 0.55) {
            const v = 5.5 * (1 - pd / 12);
            A.moveXZ(P.pos, px / pd * v * dt, pz / pd * v * dt, 0.35);
            if (!S.pushed && pd < b.r + 2.2) { S.pushed = true; A.hurtPlayer(b.dmg * 0.25, b.x, b.z, 0.8); }
          }
        }
        if (t >= b.phD) A.bossEnd(b, 1.5, 1.4);
      },
      // Yağmur damlası: kollarını sallar, Feza'nın çevresine 5-6 mavi halka; 1,3 s sonra koca damlalar "şap!" diye iner.
      yagmur(b, S, dt) {
        const A = API(), t = b.stT;
        if (b.did === 0 && t > 0.35) {
          b.did = 1; cue(A, S, 'yagmur', 'pr_ipucu_yagmur'); sadeFt(A, b.x, b.height + 0.5, b.z, 'Şıp şıp!', 'word'); A.sfx('splash', { x: b.x, z: b.z, pitch: 1.3, vol: 0.5 });
          arenaSpots(b, A.P.pos.x, A.P.pos.z, 4, 1.8, 4.6, 1.9).forEach((p, i) => dropAt(b, p.x, p.z, { at: 1.3 + i * 0.16, r: 1.0, dmgK: 0.2, col: '#5ab4ff', kind: 'damla', fx: 'splash', sfx: 'splash' }));
        }
        if (t >= b.phD) A.bossEnd(b, 1.4, 1.3);
      },
      // Dolu: yumuşacık kar topları yay çizerek Feza'nın çevresine iner (beyaz halkalar).
      dolu(b, S, dt) {
        const A = API(), t = b.stT;
        if (b.did === 0 && t > 0.3) {
          b.did = 1; cue(A, S, 'dolu', 'pr_ipucu_dolu'); sadeFt(A, b.x, b.height + 0.5, b.z, 'Pof pof!', 'word');
          const m = A.muzzle(b);
          arenaSpots(b, A.P.pos.x, A.P.pos.z, 4, 2.2, 4.2, 2.4).forEach((p, i) => dropAt(b, p.x, p.z, { at: 1.35 + i * 0.25, r: 1.25, col: '#ffffff', kind: 'dolu', from: [m.x, m.y, m.z], fx: 'dust', sfx: 'bulutPuf' }));
        }
        if (t >= b.phD) A.bossEnd(b, 1.5, 1.4);
      },
      // Esneme: koca bir esneme (zararsız), sonra son aşama: Pırıl büyür, uçuş başlar.
      esneme(b, S, dt) {
        const A = API(), t = b.stT; W.boss = b;
        if (b.did === 0) { b.did = 1; A.sfx('sigh', { x: b.x, z: b.z, pitch: 0.6, vol: 0.8 }); A.burst('zzz', b.x, b.height, b.z, {}); clearAll(); }
        if (b.did === 1 && t > 1.4) { b.did = 2; startFlight(b, S); }
        if (t >= b.phD) A.bossPhase(b, 'ucus', 999);
      },
      // Uçuş: bulut ortada süzülür, esner; Feza Pırıl'ın sırtında 7 ışığı toplar. Hepsi bitince bulut neşelenir.
      ucus(b, S, dt) {
        const A = API(), F = S.fly; W.boss = b; if (!F) { startFlight(b, S); return; }
        F.t += dt; b.st.fly = Math.min(1.2, F.t * 0.6);
        const rm = A.bossRoom(); if (rm) { b.x += (rm.x - b.x) * Math.min(1, dt * 0.8); b.z += (rm.z - (rm.r || 11) * 0.62 - b.z) * Math.min(1, dt * 0.8); }   // (arenanın kuzeyinde süzülür: uçuşu kapatmasın)
        b.face = dampAngle(b.face, Math.atan2(A.P.pos.x - b.x, A.P.pos.z - b.z), 2, dt);
        if ((S.zT = (S.zT || 0) - dt) <= 0) { S.zT = 1.4; A.burst('zzz', b.x + 0.6, b.height + 0.6, b.z + 0.8, {}); }
        if (F.got >= ORBS && !F.done) {
          F.done = true; endFlight(S);
          A.later(0.6, () => { if (!b.dead) A.damage(b, b.hp + 1, { kind: 'team', force: true }); });
        }
      },
    },
    hit(b, amount, o, S) {
      if (S && S.fly) {   // uçuşta vuruş işlemez: bulut ancak 7 ışık toplanınca neşelenir (45 s sonra yedek: vuruşlar da sayılır)
        if (S.fly.done && o && o.force) return b.hp + 1;
        return S.fly.t > 45 ? amount : 0;
      }
      const left = (b.hp - amount) / b.maxHp;
      if (!S.fly && left <= FLY_AT) return Math.max(0, b.hp - Math.round(b.maxHp * FLY_AT));   // son aşama esnemeyle başlar
      return amount;
    },
    update(dt) {
      zoneTick(dt);
      const A = API(); if (!A) return;
      const P = A.P;
      for (let i = W.drops.length - 1; i >= 0; i--) {
        const d = W.drops[i]; d.t += dt; const k = d.t / d.at;
        if (d.from) { const u = Math.min(1, k); d.prop.visible = true; d.prop.position.set(d.from[0] + (d.x - d.from[0]) * u, d.from[1] * (1 - u) + 4 * 3 * u * (1 - u) + 0.3, d.from[2] + (d.z - d.from[2]) * u); d.prop.rotation.x += dt * 5; }
        else { const u = Math.max(0, 1 - (d.at - d.t) / 0.7); d.prop.visible = u > 0; d.prop.position.set(d.x, 0.3 + 8 * (1 - u * u), d.z); }
        if (k >= 1) {
          unprop(d.prop);
          A.burst(d.fx || 'splash', d.x, 0.2, d.z, { count: 5, color: d.kind === 'dolu' ? '#ffffff' : '#8fd8ff' });
          A.fx('ring', d.x, d.z, { r0: 0.2, r1: d.r + 0.3, dur: 0.4, color: d.col, width: 0.25 });
          if (d.sfx) A.sfx(d.sfx, { x: d.x, z: d.z, vol: 0.45, pitch: rnd(0.9, 1.3) });
          if (!P.dead && d.b && !d.b.dead && sq(P.pos.x - d.x) + sq(P.pos.z - d.z) < sq(d.r + 0.2)) A.hurtPlayer(d.b.dmg * d.dmgK, d.x, d.z, 0.4);
          W.drops.splice(i, 1);
        }
      }
      // ışık topları: döner, parlar; Feza (ya da Pırıl'ın sırtındaki Feza) değince toplanır
      const b = W.boss, S = b && b.dv;
      for (const o of W.orbs) {
        if (o.got) continue;
        o.t += dt; const vis = o.t > o.appear; o.prop.visible = vis; if (!vis) continue;
        o.prop.position.set(o.x, o.y + Math.sin(o.t * 2 + o.ph) * (o.hoop ? 0.05 : 0.25), o.z); o.prop.rotation.y += dt * 2;
        const ring = o.prop.getObjectByName('ring'); if (ring) { ring.rotation.x = o.t * 1.3; ring.rotation.z = o.t * 0.9; }
        if (!P.dead && sq(P.pos.x - o.x) + sq(P.pos.z - o.z) < sq(o.hoop ? 1.9 : 1.5)) {
          o.got = true; unprop(o.prop);
          A.burst('sparkle', o.x, o.y, o.z, { color: '#fff1a8', count: 12 }); A.burst('hearts', o.x, o.y, o.z, { count: 2 });
          A.sfx('isikKirinti', { x: o.x, z: o.z, pitch: 1 + 0.08 * (S && S.fly ? S.fly.got : 0) });
          if (o.hoop) hoopPass(o);
          if (S && S.fly) { S.fly.got++; if (b && b.m && b.m.flash) { try { b.m.flash(0.6, '#fff1a8'); } catch (e) { /* */ } }
            wingsGrow(S.fly);
            if (S.fly.got === ORBS - 1) hoopShow(S.fly);
            A.ftext(P.pos.x, 2.6, P.pos.z, S.fly.got + ' / ' + ORBS, 'word'); const g = S.fly.got; if (g === 2) say('pp_gokkusagi_isik_1', 2); else if (g === 4) say('pp_gokkusagi_isik_2', 2); else if (g === ORBS - 1) say('pp_gokkusagi_isik_son', 2); }
        }
      }
      if (S && S.fly && !S.fly.ended) flightFx(dt, S.fly);
      hoopTick(dt);
      // giriş anı: ilk kükremede bulut şaşırıp havaya sıçrar, pofur pofur süzülüp iner, "Hıııı... kim o?"
      const gb = W.boss || GAME.boss;
      if (gb && gb.type === BOSS && !gb.dead) {
        if (gb.ph === 'roar' && !gb._gkIntro) {
          const u = Math.min(1, gb.stT / 1.8); gb.st.fly = 2.4 * Math.sin(PI * u);
          if (!gb._gkI0) { gb._gkI0 = 1; A.burst('confetti', gb.x, 6, gb.z, {}); A.sfx('bulutPuf', { x: gb.x, z: gb.z, pitch: 0.6 }); }
          if (u > 0.95) { gb._gkIntro = 1; gb.st.fly = 0; A.burst('dust', gb.x, 0.4, gb.z, { count: 9, scale: 1.6, color: '#ffffff' }); A.fx('ring', gb.x, gb.z, { r0: 1, r1: 6, dur: 0.6, color: '#ffffff', width: 0.6 }); sadeFt(A, gb.x, gb.height + 0.6, gb.z, 'Hıııı... kim o?', 'word'); }
          else if (Math.random() < dt * 8) A.burst('dust', gb.x + rnd(-1.5, 1.5), gb.st.fly + 0.8, gb.z, { count: 2, color: '#ffffff' });
        } else if (!gb.aggro) {   // Feza gelmeden: uykusu kaçmış, ara ara esneyip iç çeker
          gb._gkY = (gb._gkY || 0) + dt; gb.st.esne = Math.max(0, Math.sin(gb._gkY * 0.9)) ** 3;
          if (gb.st.esne > 0.9 && !gb._gkYs) { gb._gkYs = 1; A.burst('zzz', gb.x, gb.height, gb.z, {}); } else if (gb.st.esne < 0.2) gb._gkYs = 0;
        } else gb.st.esne = 0;
      }
      // arena kararması: bulut huysuzken biraz loş, neşelendikçe aydınlanır
      if (b && !b.dead && b.aggro) gk('firtina', Math.max(0, (b.hp / b.maxHp) - 0.2) * 0.7);
    },
  });
  // boss durum nesnesi: BOSSDAV.step her karede W.boss'u yazmaz → 'boss' olayı ile tut
  function hook() {
    if (typeof GAME === 'undefined' || !GAME || !GAME.on) { setTimeout(hook, 250); return; }
    GAME.on('boss', o => { if (o && o.type === BOSS) { W.boss = (GAME.boss || null); if (!o.on) { clearAll(); gk('firtina', 0); } } });
    GAME.on('zone', () => { clearAll(); W.boss = null; if (HOOP) HOOP.visible = false; });
    GAME.on('ingredient', o => { if (o && o.id === 'isik5') { const A = API(); if (A) A.later(1.9, lightBoom); } });
    camHook(); setTimeout(camHook, 1500);
    GAME.on('happy', e => {
      if (!e) return;
      if (e.boss && e.type === BOSS) {
        const b = W.boss; if (b && b.dv) endFlight(b.dv);
        clearAll(); gk('kutla', e.x, e.z);
        const A = API();
        if (A) { A.sfx('bossNese', { x: e.x, z: e.z }); for (let i = 0; i < 4; i++) A.later(1.2 + i * 1.1, () => A.burst('zzz', e.x + rnd(-1, 1), 3.5 + i * 0.3, e.z, {})); }
        return;
      }
      if (!RARE[e.type]) return;
      try {
        if (GAME.addGoldSugar) GAME.addGoldSugar(1);
        if (typeof FX !== 'undefined' && FX && FX.burst) { FX.burst('confetti', e.x, 1.0, e.z, { scale: 1.4 }); FX.burst('sparkle', e.x, 1.2, e.z, { color: '#ffd84a', count: 10 }); }
      } catch (err) { /* */ }
    });
  }
  hook();
  // (QA) test kancası
  window.__gkBoss = { W, lightBoom: () => lightBoom(), startFlight: () => { const b = W.boss || GAME.boss; if (b && b.dv) startFlight(b, b.dv); } };
})();
