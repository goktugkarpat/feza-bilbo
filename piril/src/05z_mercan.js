/* ── Mercan Denizi Bahçesi: huysuzlar + boss (Feza ile Pırıl) ──
   Suyun altındaki sevimli deniz yavruları (böcek YOK, kızgın yüz YOK): hepsi yuvarlak, gülümseyen, en fazla yaramaz;
   neşelenince ^ ^ gözler, kocaman gülümseme, kalpler. Modeller EMODEL.KIT iskeletiyle (Rig + K.face), her biri tek çizim.
     balonBaligi   Balon Balığı Yavrusu  sarı, yumuşak dikenli; hazırlıkta kocaman ŞİŞER, zıplayıp "pof!" diye söner (base yogurt, 'ziplayan');
                                         elit: pembe, taçlı Kocaman Balon Balığı
     taklaYildiz   Takla Denizyıldızı    turuncu benekli; kollarını açıp yan döner, TEKERLEK gibi takla atarak yuvarlanır (base goblin, 'yuvarlanan')
     kopukAhtapot  Renkli Köpük Ahtapotçuk  lila; mürekkep yerine RENKLİ KÖPÜK baloncukları üfler (base mantar, 'uzak'); elit: denizci şapkalı
     denizAti      Deniz Atı             turkuaz; kuyruğunu kıvırıp geriye yaslanır, sonra burnuyla ileri süzülür (base kopuk, 'kayan')
     kocaKirpiBalik Koca Kirpi Balık     BOSS: şişip söner, yuvarlanır, kabarcık halkaları üfler, balon gibi fışşş diye uçuşur;
                                         dikenleri yumuşacık. 3 aşama (can %66 / %33'te komik hıçkırık), neşelenince 2. ışığı verir.
   Biçim: PIRIL.md › 6 (HUYSUZ.type / boss / zone, BOSSDAV.register). Sesler: istek/MERCAN_SES.md (pr_ilk_*, pr_kocaKirpiBalik_*, pr_ipucu_*). */
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
  const bumpU = (u, a, b) => (u > a && u < b ? Math.sin(PI * (u - a) / (b - a)) : 0);
  const breath = (s, f = 2.4) => Math.sin(s.t * f + s.ph);
  const yuz = o => Object.assign({ tilt: 0.25, browT: 0.32, browRaise: 0.26 }, o);
  const out = new THREE.Color();

  // ── ortak hareket yardımcıları (05h ile aynı) ──
  function boing(s, st, dt, b, k = 1) {
    if (st.hurt > (s.hzH || 0) + 0.25) s.hzB = 0;
    s.hzH = st.hurt;
    if (s.hzB === undefined || s.hzB > 1.2) return;
    s.hzB += dt;
    const w = Math.sin(s.hzB * 30) * Math.exp(-s.hzB * 5.5) * 0.22 * k;
    b.scale.y *= 1 + w; b.scale.x *= 1 - w * 0.6; b.scale.z *= 1 - w * 0.6;
  }
  function gag(s, st, dt, D, every = 5) {   // boştayken ara sıra komik bir hareket: -1 yok, 0..1 ilerleme
    const idle = s.mv < 0.15 && st.windup < 0 && st.attack < 0 && !(st.dying >= 0) && !(st.hurt > 0.3);
    if (s.gagT === undefined) s.gagT = frand(1.5, every);
    if (!idle) { if (s.gagU >= 0) s.gagU = -1; s.gagT = Math.max(s.gagT, 1.2); return -1; }
    if (s.gagU >= 0) { s.gagU += dt / D; if (s.gagU >= 1) { s.gagU = -1; s.gagT = frand(every * 0.7, every * 1.5); return -1; } return s.gagU; }
    s.gagT -= dt;
    if (s.gagT <= 0) { s.gagU = 0; return 0; }
    return -1;
  }
  function walkPh(s, dt, rate) { if (s.mv > 0.03) s.walk += dt * (rate + 5 * s.mv); return Math.min(1, s.mv * 1.4); }
  const HOP = { y: 0, sy: 1, sxz: 1, u: 0, air: 0 };
  function hopGait(s, st, dt, rate, h) {
    s.hopK = damp(s.hopK || 0, st.move > 0.05 ? 1 : 0, 6, dt);
    if (s.hopK > 0.02 || (s.hop % 1) > 0.03) s.hop += dt * (rate + 0.8 * s.mv);
    const u = s.hop % 1, A = s.hopK;
    let y = 0, sy = 1, sxz = 1, air = 0;
    if (u < 0.2) { const k = Math.sin(PI * u / 0.2); sy -= 0.16 * k * A; sxz += 0.09 * k * A; }
    else if (u < 0.82) { const k = (u - 0.2) / 0.62; air = Math.sin(PI * k) * A; y = air * h; const s2 = Math.abs(Math.cos(PI * k)); sy += 0.12 * s2 * A; sxz -= 0.05 * s2 * A; }
    else { const k = Math.sin(PI * (u - 0.82) / 0.18); sy -= 0.18 * k * A; sxz += 0.1 * k * A; }
    HOP.y = y; HOP.sy = sy; HOP.sxz = sxz; HOP.u = u; HOP.air = air;
    return HOP;
  }
  // parıltı (su altı ışıltısı)
  function glints(r, pts, c = '#ffffff') {
    r.fx(1, 0);
    for (const p of pts) r.add(G.sphere(8, 6), hdr(c, 1.5), [p[0], p[1], p[2]], [0, 0, 0.5], [p[3], p[3] * 1.6, p[3] * 0.5]);
    r.fx(0, 0);
  }
  // küçük yuvarlak baloncuklar (köpük): renkli, parlak
  function foamBalls(r, pts) {
    for (const p of pts) {
      r.fx(0, 1).add(G.sphere(12, 8), p[4], [p[0], p[1], p[2]], null, p[3]);
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.4), [p[0] - p[3] * 0.35, p[1] + p[3] * 0.4, p[2] + p[3] * 0.6], null, p[3] * 0.22);
    }
    r.fx(0, 0);
  }

  // ════════════════ BALON BALIĞI YAVRUSU ════════════════
  // Tombul sarı top: kremsi karın, kahve benekler, her yanında minicik yumuşak (ucu yuvarlak) dikenler, pembe dudaklar.
  // Yüzerken yüzgeçleri pır pır eder, kuyruğu sallanır, hafifçe aşağı yukarı süzülür. Hazırlık: derin nefes alır, kocaman ŞİŞER,
  // dikenleri dikleşir, gözleri faltaşı; saldırı: zıplayıp iner ve "pof!" diye söner. Bekleme: kendi kendine şişip "pıssss" söner,
  // sönerken fırıl fırıl döner, sonra şaşkın gülümser. Elit: pembe, altın taçlı.
  function buildBalon(r, o) {
    const E = o.elite;
    const cA = col(E ? '#ff9cc8' : '#ffd24f'), cB = col(E ? '#ffe2f0' : '#fff4c8'), cD = col(E ? '#d8549a' : '#c98a3a'), sp = E ? '#ff7ab8' : '#ffa040';
    const C = [0, 0.5, 0], R = 0.34;
    r.bone('body', 'root', C);
    r.bone('spk', 'body', C);
    r.bone('finL', 'body', [0.3, 0.46, 0.06]); r.bone('finR', 'body', [-0.3, 0.46, 0.06]);
    r.bone('tail', 'body', [0, 0.5, -0.32]);
    // gövde: üst sarı, karın krem, yumuşak kahve benekler
    const bodyC = (x, y, z) => {
      out.copy(cA).lerp(cB, sm((0.5 - y) / 0.22) * 0.85 + sm(z / 0.3) * 0.12);
      const n = K.fbm3(x * 9, y * 9, z * 9);
      if (y > 0.5 && n > 0.62) out.lerp(cD, sm((n - 0.62) / 0.06) * 0.55);
      return out;
    };
    r.on('body').fx(0, 0.55).add(G.sphere(28, 20), bodyC, C, null, [R, R * 0.96, R]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.3), [-0.15, 0.7, 0.2], [0, -0.6, 0.4], [0.06, 0.035, 0.02]);   // parlak ışık lekesi
    // dikenler (yumuşacık, ucu top): ön yüz boş
    r.on('spk').fx(0, 0.4);
    let n = 0;
    for (const phi of [0.35, 0.8, 1.25, 1.7, 2.15, 2.6]) {
      const cnt = Math.round(5 + 6 * Math.sin(phi));
      for (let j = 0; j < cnt; j++) {
        const th = (j + (n++ % 2) * 0.5) / cnt * TAU;
        const wth = Math.atan2(Math.sin(th), Math.cos(th));
        if (Math.abs(wth) < 0.85 && phi > 0.7 && phi < 2.3) continue;   // yüz
        const [p, nn] = K.onEll(C, [R, R, R], phi, th), d = new THREE.Vector3(...nn).normalize();
        K.softSpike(r, p, [d.x, d.y, d.z], 0.13, 0.035, sp, 8);
      }
    }
    // yüzgeçler: yarı saydam görünüşlü açık turuncu yelpaze
    const fin = E ? '#ffb6d8' : '#ffb54a';
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'finL' : 'finR').fx(0, 0.6);
      r.add(G.sphere(14, 8), K.vgrad(0.38, 0.56, [[0, fin], [1, '#fff0d0']]), [0.36 * sd, 0.47, 0.04], [0, sd * 0.4, sd * 0.5], [0.1, 0.07, 0.025]);
    }
    r.on('tail').fx(0, 0.6);
    for (const sd of [-1, 1]) r.add(G.sphere(14, 8), K.vgrad(0.4, 0.62, [[0, fin], [1, '#fff4dc']]), [0, 0.5 + sd * 0.06, -0.42], [sd * 0.6, 0, 0], [0.025, 0.1, 0.08]);
    r.add(G.sphere(10, 8), cA, [0, 0.5, -0.33], null, [0.06, 0.06, 0.05]);
    // yüz
    r.on('body');
    K.face(r, [0, 0.52, 0.0], R, yuz({ bone: 'body', tilt: 0.12, ex: 0.12, ey: 0.04, er: 0.085, iris: E ? '#7a2a5a' : '#2a3a6a', skin: cA, browCol: E ? '#a83a78' : '#9a6418',
      mouthY: -0.1, mouthW: 0.075, blushCol: '#ff7a9a', heartCol: '#ff4f93' }));
    if (E) K.crown(r.on('body'), [0, 0.86, 0.02], 0.55, '#7fe0ff', 1);
    r.on('body').mark('muzzle', [0, 0.5, 0.36]);
    return { height: 0.9, glowC: col(E ? '#ffc8e4' : '#fff0a0'),
      mat: { rough: 0.45, sss: col('#ffd890').multiplyScalar(0.03), rim: '#fff8e0', rimK: 0.32, rimP: 2.3 } };
  }
  function animBalon(m, dt, st, s) {
    const B = m.B, b = B.body, g = hopGait(s, st, dt, 1.7, 0.16);
    let y = g.y + 0.05 * Math.sin(s.t * 2.2 + s.ph), puff = 0, sy = g.sy * (1 + 0.03 * breath(s)), sxz = g.sxz, rz = Math.sin(s.t * 1.5 + s.ph) * 0.05, ry = 0;
    let flap = Math.sin(s.t * 11 + s.ph) * 0.45, tail = Math.sin(s.t * 6 + s.ph) * 0.35;
    if (st.windup >= 0) {   // derin nefes: kocaman şişer, dikenler dikleşir, titrer
      const w = sm(st.windup * 1.15);
      puff = w; s.eyeK = 1 + 0.35 * w; s.mouthO = w;
      b.position.x += Math.sin(s.t * 50) * 0.012 * w; flap *= 1 + 1.5 * w; y += 0.08 * w;
    }
    if (st.attack >= 0) {   // zıplayıp iner, "pof!" diye söner
      const a = st.attack;
      puff = Math.max(0, 1 - sm(a / 0.55)); y += Math.sin(PI * Math.min(1, a / 0.5)) * 0.25;
      if (a > 0.5 && a < 0.9) { const k = bumpU(a, 0.5, 0.9); sy *= 1 - 0.25 * k; sxz *= 1 + 0.15 * k; }
    }
    { const u = gag(s, st, dt, 3.2, 5);   // bekleme: kendi kendine şişer, "pısss" söner, fırıl fırıl döner
      if (u >= 0) {
        const up = bumpU(u, 0, 0.55), spin = sm((u - 0.5) / 0.4);
        puff = Math.max(puff, up * 0.9); s.mouthO = Math.max(s.mouthO, up);
        ry = spin * TAU * 2; y += 0.15 * bumpU(u, 0.5, 0.95); s.eyeK = 1 + 0.3 * up;
      }
    }
    s.pf = damp(s.pf || 0, puff, 14, dt);
    const P = 1 + 0.55 * s.pf;
    b.position.y += y + 0.12 * s.pf; b.rotation.z = rz; b.rotation.y = ry;
    b.scale.set(sxz * P, sy * P, sxz * P);
    B.spk.scale.setScalar(0.82 + 0.3 * s.pf);
    B.finL.rotation.z = flap; B.finR.rotation.z = -flap; B.finL.rotation.y = 0.2 * flap; B.finR.rotation.y = -0.2 * flap;
    B.tail.rotation.y = tail;
    boing(s, st, dt, b);
  }

  // ════════════════ TAKLA DENİZYILDIZI ════════════════
  // Ayakta duran beş kollu turuncu-mercan denizyıldızı: kolların ucu açık şeftali, üstünde krem benekler, ortada kocaman gözler.
  // Alttaki iki kolu üstünde paytak paytak yürür, yan kollarını sallar. Hazırlık: kollarını iyice açar, yana döner, titrer;
  // saldırı: TEKERLEK gibi takla atarak yuvarlanır. Bekleme: yerinde ters takla atıp alkışlar.
  function buildYildiz(r, o) {
    const E = o.elite;
    const cA = col(E ? '#c58aff' : '#ff7f4a'), cT = col(E ? '#ffd6ff' : '#ffc27a'), dot = E ? '#fff6ff' : '#fff2d6';
    const C = [0, 0.48, 0];
    r.bone('body', 'root', C);
    r.bone('armL', 'body', [0.16, 0.54, 0]); r.bone('armR', 'body', [-0.16, 0.54, 0]);
    r.bone('legL', 'body', [0.08, 0.36, 0]); r.bone('legR', 'body', [-0.08, 0.36, 0]);
    r.bone('top', 'body', [0, 0.62, 0]);
    const armC = (cx, cy) => (x, y, z) => out.copy(cA).lerp(cT, sm((Math.hypot(x - cx, y - cy) - 0.12) / 0.3));
    const ARMS = [['top', 0], ['armL', 1], ['legL', 2], ['legR', 3], ['armR', 4]];
    r.on('body').fx(0, 0.5).add(G.sphere(24, 16), armC(C[0], C[1]), C, null, [0.22, 0.22, 0.12]);
    for (const [bn, k] of ARMS) {
      const a = k * TAU / 5, dx = Math.sin(a), dy = Math.cos(a);
      r.on(bn).fx(0, 0.5);
      r.add(G.sphere(20, 12), armC(C[0], C[1]), [dx * 0.25, C[1] + dy * 0.25, 0], [0, 0, -a], [0.11, 0.25, 0.085]);
      r.add(G.sphere(12, 8), cT, [dx * 0.46, C[1] + dy * 0.46, 0], null, [0.06, 0.06, 0.05]);
      for (let i = 0; i < 3; i++) {   // krem benekler
        const d = 0.18 + i * 0.09, w = (i % 2 ? 1 : -1) * 0.035;
        r.add(G.sphere(8, 6), dot, [dx * d + dy * w, C[1] + dy * d - dx * w, 0.075 - i * 0.01], null, [0.022, 0.022, 0.012]);
      }
    }
    r.on('body');
    K.face(r, [0, 0.47, -0.12], 0.22, yuz({ bone: 'body', tilt: 0.02, ex: 0.075, ey: 0.02, er: 0.06, iris: E ? '#5a2a8a' : '#3a2010', skin: cA, browCol: E ? '#6a2aa0' : '#9a3a10',
      mouthY: -0.07, mouthW: 0.07, blushCol: '#ff5a7a' }));
    glints(r.on('body'), [[-0.12, 0.66, 0.08, 0.02], [0.2, 0.36, 0.07, 0.016]]);
    r.on('body').mark('muzzle', [0, 0.5, 0.2]);
    return { height: 0.98, glowC: col('#ffd0a0'),
      mat: { rough: 0.55, sss: col('#ff9a6a').multiplyScalar(0.04), rim: '#fff0e0', rimK: 0.3, rimP: 2.4 } };
  }
  function animYildiz(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 7), ph = s.walk;
    let rz = Math.sin(ph) * 0.16 * k + Math.sin(s.t * 1.3 + s.ph) * 0.04, y = Math.abs(Math.sin(ph)) * 0.04 * k + 0.03 * Math.sin(s.t * 2 + s.ph);
    let wave = Math.sin(s.t * 3 + s.ph) * 0.2 + Math.sin(ph) * 0.3 * k, open = 0, rx = 0, ry = 0, roll = false;
    B.legL.rotation.z = Math.sin(ph) * 0.25 * k; B.legR.rotation.z = Math.sin(ph) * 0.25 * k;
    if (st.windup >= 0) {   // kollarını açıp yana döner, titrer
      const w = sm(st.windup * 1.2);
      open = w; ry = w * PI / 2 * 0.5; rx = -0.12 * w; b.position.x += Math.sin(s.t * 55) * 0.01 * w; s.eyeK = 1 + 0.25 * w;
    }
    if (st.attack >= 0) {
      if (st.attack < 1 && s.mv > 0.5) {   // tekerlek gibi takla
        roll = true; s.roll = (s.roll || 0) + dt * 12;
        b.rotation.set(s.roll, PI / 2, 0); b.position.y += 0.06;
      } else { s.roll = 0; rz += Math.sin(s.t * 9) * 0.15; s.eyeWob = 1; }
    } else s.roll = 0;
    { const u = gag(s, st, dt, 2.6, 5);   // bekleme: yerinde ters takla + alkış
      if (u >= 0) {
        const f = sm(u / 0.6); rx -= TAU * f; y += 0.35 * bumpU(u, 0, 0.6);
        wave += Math.sin(u * 50) * 0.5 * bumpU(u, 0.6, 1); s.eyeK = 1 + 0.3 * bumpU(u, 0, 0.6);
      }
    }
    if (!roll) { b.rotation.set(rx, ry, rz); b.position.y += y; }
    B.armL.rotation.z = -wave * 0.6 - 0.4 * open; B.armR.rotation.z = wave * 0.6 + 0.4 * open;
    B.top.rotation.z = Math.sin(s.t * 2.2 + s.ph) * 0.12;
    if (!roll) boing(s, st, dt, b);
  }

  // ════════════════ RENKLİ KÖPÜK AHTAPOTÇUK ════════════════
  // Lila-pembe kubbe başlı minik ahtapot: altı kıvrık kolu, kolların altında krem vantuz noktaları, tepesinde yapışık renkli köpük
  // baloncukları. Kolları dalga gibi kıvrılır, hafifçe zıplar. Hazırlık: başını balon gibi şişirir, kollarını açar; saldırı: "puf!"
  // diye büzülüp ağzından renkli köpük baloncuğu üfler (mürekkep YOK). Bekleme: kollarıyla dans eder. Elit: denizci şapkalı.
  function buildAhtapot(r, o) {
    const E = o.elite;
    const cA = col(E ? '#7fb2ff' : '#ff8f84'), cB = col(E ? '#c8e4ff' : '#ffd2b4'), suck = '#fff0f6';   // SADE5: mercan-pembe/şeftali (mor yalnız Pırıl'ın)
    r.bone('body', 'root', [0, 0.3, 0]);
    r.bone('head', 'body', [0, 0.5, 0]);
    const LEG = [];
    for (let k = 0; k < 6; k++) { const a = (k + 0.5) / 6 * TAU; LEG.push(a); r.bone('leg' + k, 'body', [Math.sin(a) * 0.16, 0.34, Math.cos(a) * 0.16]); }
    const HC = [0, 0.62, -0.02], HR = 0.3;
    const headC = (x, y, z) => { out.copy(cA).lerp(cB, sm((0.6 - y) / 0.25)); const n = K.fbm3(x * 10, y * 10, z * 10); if (y > 0.62 && n > 0.64) out.lerp(col('#ffffff'), 0.35); return out; };
    r.on('head').fx(0, 0.55).add(G.sphere(28, 20), headC, HC, null, [HR, HR * 1.08, HR * 0.98]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.3), [-0.13, 0.82, 0.16], [0, -0.6, 0.4], [0.05, 0.03, 0.02]);
    // kollar: dışa, aşağı, sonra ucu yukarı kıvrık
    for (let k = 0; k < 6; k++) {
      const a = LEG[k], sa = Math.sin(a), ca = Math.cos(a);
      const pts = [[sa * 0.14, 0.4, ca * 0.14], [sa * 0.27, 0.22, ca * 0.27], [sa * 0.4, 0.08, ca * 0.4], [sa * 0.5, 0.07, ca * 0.5], [sa * 0.55, 0.15, ca * 0.55]];
      const rr = [0.085, 0.07, 0.055, 0.04, 0.03];
      r.on('leg' + k).fx(0, 0.45);
      for (let i = 0; i < pts.length - 1; i++) { r.seg(pts[i], pts[i + 1], rr[i], cB, rr[i + 1], 10); r.add(G.sphere(10, 8), cB, pts[i + 1], null, rr[i + 1]); }
      for (let i = 1; i < 4; i++) r.add(G.sphere(6, 4), suck, [pts[i][0] * 0.97, pts[i][1] - rr[i] * 0.7, pts[i][2] * 0.97], null, [0.022, 0.012, 0.022]);
    }
    r.on('head');
    K.face(r, HC, HR, yuz({ bone: 'head', tilt: 0.05, ex: 0.1, ey: -0.05, er: 0.08, iris: E ? '#1a3a7a' : '#4a1a6a', skin: cA, browCol: E ? '#2a4a9a' : '#6a3aa0',
      mouthY: -0.15, mouthW: 0.06, blushCol: '#ff7ab0' }));
    if (E) {   // denizci şapkası
      r.on('head').push([0, 0.9, -0.02], [-0.12, 0, 0.1]).fx(0, 0.3);
      r.add(G.cyl(1, 0.92, 24), '#ffffff', [0, 0.04, 0], null, [0.16, 0.09, 0.16]);
      r.add(G.cyl(1, 1, 24), '#2a5ad8', [0, 0.01, 0], null, [0.165, 0.035, 0.165]);
      r.add(G.torus(TAU, 0.3, 20), '#ffffff', [0, -0.01, 0], [PI / 2, 0, 0], [0.2, 0.2, 0.2]);
      r.add(G.sphere(8, 6), '#ff5a7a', [0.1, 0.03, 0.12], null, 0.03);
      r.pop().fx(0, 0);
    } else {
      r.on('head');
      foamBalls(r, [[0.08, 0.93, 0.0, 0.055, '#ff8ac8'], [-0.06, 0.95, -0.04, 0.045, '#8ae0ff'], [0.0, 0.99, -0.1, 0.04, '#ffe27a'], [-0.12, 0.9, 0.04, 0.035, '#9af0a8']]);
    }
    r.on('head').mark('muzzle', [0, 0.5, 0.32]);
    return { height: 1.0, glowC: col('#e8c8ff'),
      mat: { rough: 0.4, sss: col('#e0b0ff').multiplyScalar(0.04), rim: '#fff0ff', rimK: 0.34, rimP: 2.2 } };
  }
  function animAhtapot(m, dt, st, s) {
    const B = m.B, b = B.body, h = B.head, g = hopGait(s, st, dt, 1.6, 0.08);
    let y = g.y + 0.05 * Math.sin(s.t * 2 + s.ph), hs = 1 + 0.03 * breath(s), flare = 0, dance = 0, rz = Math.sin(s.t * 1.4 + s.ph) * 0.05;
    if (st.windup >= 0) { const w = sm(st.windup * 1.2); hs *= 1 + 0.28 * w; flare = 0.6 * w; s.eyeK = 1 + 0.2 * w; s.mouthO = w; b.position.x += Math.sin(s.t * 50) * 0.008 * w; }
    if (st.attack >= 0) { const a = st.attack, kk = Math.sin(PI * Math.min(1, a / 0.35)); hs *= 1 - 0.18 * kk; flare = -0.3 * kk; y += 0.08 * kk; s.mouthO = kk; }
    { const u = gag(s, st, dt, 3.4, 5); if (u >= 0) { dance = bumpU(u, 0, 1); rz += Math.sin(u * 30) * 0.15 * dance; y += 0.08 * Math.abs(Math.sin(u * 22)) * dance; } }
    b.position.y += y; b.rotation.z = rz;
    h.scale.set(hs, hs * (1 + 0.04 * Math.sin(s.t * 3 + s.ph)), hs);
    for (let k = 0; k < 6; k++) {
      const L = B['leg' + k], a = (k + 0.5) / 6 * TAU, w = Math.sin(s.t * 3.2 + k * 1.1 + s.ph) * 0.18 + Math.sin(s.walk * 2 + k) * 0.2 * Math.min(1, s.mv * 1.5);
      const f = flare + w + dance * Math.sin(s.t * 14 + k * 2) * 0.5;
      L.rotation.x = Math.cos(a) * f; L.rotation.z = -Math.sin(a) * f;
    }
    if (s.mv > 0.03) s.walk += dt * 4;
    boing(s, st, dt, h);
  }

  // ════════════════ DENİZ ATI ════════════════
  // Turkuaz-nane deniz atı: halka halka tombul gövde, kıvrık kuyruk, uzun minik burun, tepede yumuşak taç tüyleri, sırtta pır pır
  // eden yarı saydam yüzgeç. Hep hafifçe aşağı yukarı süzülür. Hazırlık: kuyruğunu iyice kıvırıp geriye yaslanır; saldırı: burnuyla
  // ileri "vuuu!" süzülür. Bekleme: kuyruğunu çözüp kendi etrafında döner, gülümser.
  function buildDenizAti(r, o) {
    const E = o.elite;
    const cA = col(E ? '#ffc94a' : '#3fcfc0'), cB = col(E ? '#fff2b0' : '#bff6e6'), cR = col(E ? '#ff9a3a' : '#2aa7a8');
    r.bone('body', 'root', [0, 0.3, 0]);
    r.bone('head', 'body', [0, 0.92, 0.02]);
    r.bone('fin', 'body', [0, 0.62, -0.13]);
    r.bone('tail', 'body', [0, 0.36, -0.02]);
    // gövde: S eğrisi boyunca halkalar (karın öne çıkık)
    const SEG = [[0.4, 0.0, 0.14], [0.5, 0.05, 0.16], [0.6, 0.06, 0.165], [0.7, 0.04, 0.155], [0.8, 0.0, 0.135]];
    r.on('body').fx(0, 0.5);
    for (const [y, z, rr] of SEG) {
      r.add(G.sphere(20, 14), (x, yy, zz) => out.copy(cA).lerp(cB, sm((zz - z) / rr * 1.4)), [0, y, z], null, [rr, rr * 0.75, rr * 0.95]);
      r.add(G.torus(TAU, 0.12, 20), cR, [0, y + rr * 0.45, z], [PI / 2 + 0.1, 0, 0], [rr * 0.88, rr * 0.88, rr * 0.88]);
    }
    // kuyruk: aşağı inip öne kıvrılan sarmal
    r.on('tail').fx(0, 0.5);
    for (let i = 0; i <= 9; i++) {
      const t = i / 9, a = t * PI * 1.5, R = 0.13 * (1 - 0.55 * t);
      const y = 0.32 - R * Math.sin(a) - 0.12 * t, z = -0.04 + R * (1 - Math.cos(a)) * 0.9 - 0.05 * t, rr = 0.075 * (1 - 0.7 * t);
      r.add(G.sphere(12, 8), mixc(cA, cR, t * 0.6), [0, y, z], null, rr);
    }
    // baş + burun + taç
    const HC = [0, 0.97, 0.04], HR = 0.15;
    r.on('head').fx(0, 0.55).add(G.sphere(22, 16), (x, y, z) => out.copy(cA).lerp(cB, sm((z - 0.05) / 0.12) * 0.7), HC, null, [HR, HR * 1.05, HR * 1.05]);
    r.seg([0, 0.93, 0.15], [0, 0.9, 0.3], 0.045, cA, 0.04, 12);
    r.add(G.torus(TAU, 0.35, 16), cR, [0, 0.9, 0.3], [PI / 2 - 0.2, 0, 0], [0.042, 0.042, 0.042]);
    r.add(G.sphere(10, 8), cB, [0, 0.9, 0.31], null, [0.03, 0.03, 0.012]);
    for (let i = 0; i < 4; i++) K.softSpike(r, [0, 1.08 - i * 0.05, -0.02 - i * 0.05], [0, 0.6, -0.6 - i * 0.15], 0.1, 0.035, i % 2 ? cB : '#ff8ab8', 8);
    K.face(r, HC, HR, yuz({ bone: 'head', tilt: 0.0, ex: 0.07, ey: 0.03, er: 0.055, iris: E ? '#6a3a0a' : '#0a3a4a', skin: cA, browCol: E ? '#a0600a' : '#1a6a6a',
      noMouth: true, blushCol: '#ff7a9a', blushY: 1.3, heartS: 0.5 }));
    // sırt yüzgeci (yarı saydam görünüşlü)
    r.on('fin').fx(0, 0.7).add(G.sphere(14, 8), K.vgrad(0.5, 0.75, [[0, mixc(cB, '#ffffff', 0.3)], [1, '#ffe6ff']]), [0, 0.62, -0.17], null, [0.018, 0.12, 0.08]);
    r.on('body').mark('muzzle', [0, 0.9, 0.34]);
    return { height: 1.15, glowC: col('#c8fff0'),
      mat: { rough: 0.45, sss: col('#a0fff0').multiplyScalar(0.03), rim: '#effffa', rimK: 0.32, rimP: 2.3 } };
  }
  function animDenizAti(m, dt, st, s) {
    const B = m.B, b = B.body;
    let y = 0.08 + 0.07 * Math.sin(s.t * 2.1 + s.ph), rx = Math.sin(s.t * 1.6 + s.ph) * 0.05 + 0.12 * Math.min(1, s.mv * 1.5), ry = 0, curl = Math.sin(s.t * 1.8 + s.ph) * 0.15;
    if (st.windup >= 0) { const w = sm(st.windup * 1.2); rx = -0.35 * w; curl = 0.6 * w; s.eyeK = 1 + 0.25 * w; b.position.x += Math.sin(s.t * 50) * 0.008 * w; }
    if (st.attack >= 0) { const a = st.attack, kk = Math.sin(PI * Math.min(1, a / 0.6)); rx = 0.45 * kk; curl = -0.3 * kk; y += 0.05 * kk; }
    { const u = gag(s, st, dt, 2.8, 5); if (u >= 0) { const k = bumpU(u, 0, 1); ry = sm(u) * TAU; curl = -0.5 * k; y += 0.12 * k; s.eyeK = 1 + 0.2 * k; } }
    b.position.y += y; b.rotation.set(rx, ry, Math.sin(s.t * 1.2 + s.ph) * 0.05);
    B.tail.rotation.x = curl; B.head.rotation.x = -rx * 0.5 + Math.sin(s.t * 2.4 + s.ph) * 0.06;
    B.fin.rotation.y = Math.sin(s.t * 22 + s.ph) * 0.35;
    boing(s, st, dt, b, 0.7);
  }

  // ════════════════ KOCA KİRPİ BALIK (boss) ════════════════
  // Kocaman, tombul, gülümseyen kirpi balığı: üstü güneş sarısı, karnı krem, yumuşak kahve benekler, her yanında yumuşacık
  // (ucu top, pembe uçlu) dikenler, iri yüzgeçler, yelpaze kuyruk, kocaman gözler, pembe dudaklar ("O" diye büzülür).
  // st.phase: halka (kabarcık halkası üfler) · sisir/ziplaGo (şişip zıplar) · yuvarlan/yuvarlanGo (şişip yuvarlanır) ·
  // puf (balon gibi fışşş diye söner, uçuşur) · sersem (yorgun, başı döner) · hickir (aşama: komik hıçkırık) · roar · summon · dying.
  function buildKirpi(r, o) {
    const cA = col('#ffd04a'), cB = col('#fff4d4'), cD = col('#c88a3a'), sp = '#ffb054', tip = '#ff7ab0';
    const C = [0, 1.3, 0], R = 1.0;
    r.bone('body', 'root', C);
    r.bone('spk', 'body', C);
    r.bone('finL', 'body', [0.92, 1.18, 0.15]); r.bone('finR', 'body', [-0.92, 1.18, 0.15]);
    r.bone('tail', 'body', [0, 1.3, -0.95]);
    r.bone('dorsal', 'body', [0, 2.2, -0.35]);
    const bodyC = (x, y, z) => {
      out.copy(cA).lerp(cB, sm((1.3 - y) / 0.6) * 0.9 + sm(z / 0.9) * 0.1);
      const n = K.fbm3(x * 2.6, y * 2.6, z * 2.6);
      if (y > 1.25 && n > 0.6) out.lerp(cD, sm((n - 0.6) / 0.05) * 0.5);
      return out;
    };
    r.on('body').fx(0, 0.55).add(G.sphere(40, 28), bodyC, C, null, [R, R * 0.95, R * 1.02]);
    r.fx(1, 0).add(G.sphere(12, 8), hdr('#ffffff', 1.25), [-0.45, 1.95, 0.55], [0, -0.6, 0.5], [0.16, 0.09, 0.04]);
    r.add(G.sphere(10, 6), hdr('#ffffff', 1.15), [-0.28, 2.05, 0.5], null, [0.05, 0.04, 0.02]);
    // yumuşak dikenler
    r.on('spk');
    let n = 0;
    for (const phi of [0.25, 0.6, 0.95, 1.3, 1.65, 2.0, 2.35, 2.7]) {
      const cnt = Math.round(5 + 10 * Math.sin(phi));
      for (let j = 0; j < cnt; j++) {
        const th = (j + (n++ % 2) * 0.5) / cnt * TAU, wth = Math.atan2(Math.sin(th), Math.cos(th));
        if (Math.abs(wth) < 0.75 && phi > 0.75 && phi < 2.45) continue;   // yüz
        const [p, nn] = K.onEll(C, [R, R * 0.95, R * 1.02], phi, th), d = new THREE.Vector3(...nn).normalize();
        r.fx(0, 0.4);
        K.cone(r, p, [d.x, d.y, d.z], 0.3, 0.075, sp, 8);
        r.fx(0, 0.7).add(G.sphere(8, 6), tip, [p[0] + d.x * 0.3, p[1] + d.y * 0.3, p[2] + d.z * 0.3], null, 0.045);
      }
    }
    // yüzgeçler + kuyruk + sırt yüzgeci
    const fin = '#ffa95a';
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'finL' : 'finR').fx(0, 0.6);
      r.add(G.sphere(18, 10), K.vgrad(1.0, 1.4, [[0, fin], [1, '#fff0d0']]), [1.15 * sd, 1.2, 0.12], [0, sd * 0.4, sd * 0.45], [0.3, 0.2, 0.06]);
      for (let i = 0; i < 3; i++) r.add(G.box(), '#ffd8a0', [1.12 * sd + sd * 0.1 * i, 1.2 + (i - 1) * 0.08, 0.17], [0, sd * 0.4, sd * 0.45 + (i - 1) * 0.3], [0.32, 0.015, 0.02]);
    }
    r.on('tail').fx(0, 0.6);
    for (const sd of [-1, 1]) r.add(G.sphere(18, 10), K.vgrad(1.0, 1.6, [[0, fin], [1, '#fff4dc']]), [0, 1.3 + sd * 0.22, -1.25], [sd * 0.55, 0, 0], [0.06, 0.34, 0.26]);
    r.add(G.sphere(14, 10), cA, [0, 1.3, -1.0], null, [0.2, 0.22, 0.2]);
    r.on('dorsal').fx(0, 0.6).add(G.sphere(14, 8), K.vgrad(2.0, 2.5, [[0, fin], [1, '#fff4dc']]), [0, 2.28, -0.4], [-0.5, 0, 0], [0.05, 0.22, 0.3]);
    // yüz (ağız kendi kemiğinde: "O" diye büzülür)
    r.on('body');
    K.face(r, [0, 1.35, 0.02], R, yuz({ bone: 'body', tilt: 0.1, ex: 0.33, ey: 0.12, er: 0.21, iris: '#2a3a6a', skin: cA, browCol: '#9a6418', browY: 1.4,
      mouthY: -0.24, mouthW: 0.2, mouthPivot: true, blushCol: '#ff7a9a', heartS: 0.3 }));
    // pembe dudaklar (gülen ağzın çevresinde yumuşak halka)
    r.on('mouth').fx(0, 0.7).add(G.torus(TAU, 0.38, 20), '#ff8ab0', [0, 1.13, 0.95], [-0.15, 0, 0], [0.13, 0.08, 0.12]);
    r.on('body').mark('muzzle', [0, 1.15, 1.15]);
    return { height: 2.5, glowC: col('#fff0a0'), portrait: { cx: 0, cy: 1.35, cz: 0.3, rad: 1.5 },
      mat: { rough: 0.45, sss: col('#ffd890').multiplyScalar(0.03), rim: '#fff8e0', rimK: 0.3, rimP: 2.3 } };
  }
  const bph = st => (st.dying >= 0 ? 'dying' : (st.phase || 'idle'));
  const bpt = st => clamp(+st.phaseT || 0, 0, 1);
  function animKirpi(m, dt, st, s) {
    const B = m.B, b = B.body, ph = bph(st), t = bpt(st);
    let puff = 0, y = 0.08 * Math.sin(s.t * 1.7 + s.ph), rx = 0, rz = Math.sin(s.t * 1.2 + s.ph) * 0.04, flap = Math.sin(s.t * 7 + s.ph) * 0.4, tail = Math.sin(s.t * 4 + s.ph) * 0.3;
    let spin = 0, roll = false;
    s.wk = damp(s.wk || 0, ph === 'move' || (ph === 'idle' && st.move > 0.05) ? 1 : 0, 5, dt);
    flap *= 1 + s.wk; tail *= 1 + s.wk;
    switch (ph) {
      case 'roar': { const k = bumpU(t, 0.05, 0.85); puff = k; s.mouthO = k; s.eyeK = 1 + 0.2 * k; break; }
      case 'summon': { flap *= 2.2; s.mouthW = 1; y += 0.15 * Math.abs(Math.sin(s.t * 9)); break; }
      case 'halka': {   // yanakları şişer, dudaklar "O", her üflemede büzülür
        puff = 0.25 + 0.15 * Math.sin(s.t * 3); s.mouthO = 0.6 + 0.4 * Math.abs(Math.sin(t * PI * 6)); rx = -0.06 + 0.05 * Math.sin(t * PI * 6); break;
      }
      case 'sisir': { const w = sm(t / 0.85); puff = w; s.eyeK = 1 + 0.3 * w; s.mouthO = w * 0.6; b.position.x += Math.sin(s.t * 40) * 0.03 * w; flap *= 2; break; }
      case 'ziplaGo': { puff = 1; s.mouthW = 1; flap *= 3; rx = 0.2 * Math.sin(t * PI); break; }
      case 'yuvarlan': { puff = sm(t / 0.6); s.eyeK = 1.2; s.mouthO = 0.5; rz = Math.sin(s.t * 30) * 0.03; break; }
      case 'yuvarlanGo': { puff = 1; roll = true; s.roll = (s.roll || 0) + dt * 6; s.eyeWob = 0.5; break; }
      case 'puf': {   // balon gibi söner: önce şişkin, sonra fışşş — fırıl fırıl döner
        puff = 1 - sm(t / 0.85); spin = t; s.mouthO = 1; flap *= 3; tail *= 3; rz = Math.sin(s.t * 18) * 0.25; break;
      }
      case 'sersem': { puff = 0; s.eyeWob = 1; rz = 0.35 + Math.sin(s.t * 2) * 0.08; y -= 0.15; flap *= 0.3; s.mouthW = 0.6; break; }
      case 'hickir': {   // hıçkırık: üç kez "hık!" diye birden şişer
        const h = Math.max(bumpU(t, 0.05, 0.25), bumpU(t, 0.38, 0.58), bumpU(t, 0.7, 0.9)); puff = h; s.mouthO = h; s.eyeK = 1 + 0.4 * h; y += 0.25 * h; break;
      }
      case 'dying': s.mouthW = 1; puff = 0.4 * Math.abs(Math.sin(s.t * 6)); break;
      default: break;
    }
    if (st.hurt > 0.2) s.eyeK = Math.max(s.eyeK, 1 + 0.2 * st.hurt);
    s.pf = damp(s.pf || 0, puff, ph === 'hickir' ? 22 : 9, dt);
    const P = 1 + 0.5 * s.pf;
    b.position.y += y + 0.5 * s.pf;
    if (roll) b.rotation.set(s.roll, 0, 0);
    else b.rotation.set(rx, spin * TAU * 3, rz);
    b.scale.setScalar(P);
    B.spk.scale.setScalar(0.72 + 0.35 * s.pf);
    B.finL.rotation.z = flap; B.finR.rotation.z = -flap; B.finL.rotation.y = 0.25 * flap; B.finR.rotation.y = -0.25 * flap;
    B.tail.rotation.y = tail; B.dorsal.rotation.z = Math.sin(s.t * 5 + s.ph) * 0.15;
  }

  // ════════════════ Kayıt ════════════════
  const T = [
    // id, ad, base, saldiri, stats, kurucu, anim, lod, ilkSoz
    ['balonBaligi', 'Balon Balığı Yavrusu', 'yogurt', 'ziplayan', { eliteAd: 'Kocaman Balon Balığı', hp: 22, dmg: 4, speed: 2.4, r: 0.44, height: 0.9, atkRange: 2.4, atkCd: 2.1, windup: 0.9, aggro: 9 }, buildBalon, animBalon, 0.55, 'pr_ilk_balonBaligi'],
    ['taklaYildiz', 'Takla Denizyıldızı', 'goblin', 'yuvarlanan', { eliteAd: 'Kocaman Denizyıldızı', hp: 24, dmg: 5, speed: 2.3, r: 0.45, height: 0.98, atkRange: 2.4, atkCd: 2.3, windup: 0.85, aggro: 9, trailCol: '#ffd0a0' }, buildYildiz, animYildiz, 0.55, 'pr_ilk_taklaYildiz'],
    ['kopukAhtapot', 'Köpük Ahtapotçuk', 'mantar', 'uzak', { eliteAd: 'Kocaman Köpük Ahtapot', hp: 18, dmg: 4, speed: 2.0, r: 0.45, height: 1.0, atkRange: 6.5, range: 6.5, atkCd: 2.9, windup: 0.95, aggro: 9, shot: { kind: 'bubble', speed: 3.4, r: 0.27, col: '#ff9ad8' } }, buildAhtapot, animAhtapot, 0.55, 'pr_ilk_kopukAhtapot'],
    ['denizAti', 'Deniz Atı', 'kopuk', 'kayan', { eliteAd: 'Kocaman Deniz Atı', hp: 22, dmg: 4, speed: 2.5, r: 0.42, height: 1.15, atkRange: 3.2, atkCd: 2.4, windup: 0.9, aggro: 9 }, buildDenizAti, animDenizAti, 0.55, 'pr_ilk_denizAti'],
  ];
  for (const [id, ad, base, saldiri, stats, mk, an, lod, ilk] of T) {
    const def = { ad, base, saldiri, stats, ilkSoz: ilk };
    if (HAS) { EMODEL.addType(id, mk, an, lod); def.model = o => EMODEL.buildRaw(id, o || {}); }
    HUYSUZ.type(id, def);
  }
  const bdef = { ad: 'Koca Kirpi Balık', base: 'kefirdev', stats: { r: 1.45, height: 2.5 },
    lines: { giris: 'pr_kocaKirpiBalik_giris', bitti: 'pr_kocaKirpiBalik_bitti', yarim: 'pr_kocaKirpiBalik_yarim' },
    bossKit: { own: true, add: 'balonBaligi', at: [0.6, 0.3], n: [2, 2], col: '#7fe0ff', roar: 1.25 } };
  if (HAS) { EMODEL.addType('kocaKirpiBalik', buildKirpi, animKirpi, 0.75); bdef.model = o => EMODEL.buildRaw('kocaKirpiBalik', o || {}); }
  HUYSUZ.boss('kocaKirpiBalik', bdef);
  HUYSUZ.zone('mercan', { enemies: { balonBaligi: 3, taklaYildiz: 3, kopukAhtapot: 2.5, denizAti: 3 },
    elites: ['balonBaligi', 'kopukAhtapot'], boss: 'kocaKirpiBalik' });

  // ════════════════ Koca Kirpi Balık'ın hamleleri (BOSSDAV.register) ════════════════
  // Her saldırı ≥ 1 s önceden büyük renkli yer işaretiyle belli, yavaş, hasar düşük (5 yaş).
  //  1. aşama (can > %66): kabarcık halkası (1 şerit) · şişip zıplama
  //  2. aşama (%66–33):   halkalar 3 şerit · zıplama · şişip yuvarlanma
  //  3. aşama (< %33):    halkalar 5 şerit · iki zıplama art arda · yuvarlanma
  //  Her 3 hamlede bir "puf": balon gibi söner, fışşş diye arenada uçuşur (zararsız), sonra sersem yatar (vuruş × 1,5).
  if (typeof BOSSDAV === 'undefined' || !BOSSDAV.register) return;
  const A = () => BOSSDAV.api;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sq = x => x * x;
  const heroR = () => (A() && A().T && A().T.heroR) || 0.35;
  const dmgOf = (b, k) => b.dmg * k * (A().hard ? 1.25 : 1);
  const faceTo = (b, x, z, k, dt) => { b.face = dampAngle(b.face, Math.atan2(x - b.x, z - b.z), k, dt); };
  const sayK = k => { const a = A(); if (a && a.hasLine(k)) a.say(k, 2); };

  // Kabarcık halkası havuzu (paylaşılan geometri + malzeme; tek tek mesh, ≤ 10)
  const RINGS = [];
  let ringGeo = null, ringMat = null, ringHalo = null;
  function ringMesh() {
    for (const o of RINGS) if (!o.userData.on) return o;
    if (RINGS.length >= 10) return null;
    if (!ringGeo) {
      ringGeo = new THREE.TorusGeometry(1, 0.2, 10, 28); ringGeo.userData.keep = true;
      ringMat = new THREE.MeshStandardMaterial({ color: 0xcff6ff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.62, emissive: 0x4fb8e0, emissiveIntensity: 0.35, depthWrite: false });
      ringMat.userData.keep = true;
      ringHalo = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(1.6), transparent: true, opacity: 0.5, depthWrite: false });
      ringHalo.userData.keep = true;
    }
    const o = new THREE.Mesh(ringGeo, ringMat); o.renderOrder = 3; o.castShadow = false;
    const hl = new THREE.Mesh(ringGeo, ringHalo); hl.scale.set(0.98, 0.98, 0.35); hl.position.set(0, 0.06, 0.12); o.add(hl);
    o.visible = false; o.userData.on = false; RINGS.push(o);
    if (typeof scene !== 'undefined') scene.add(o);
    return o;
  }
  // SADE: şişip inme alanı — ses "turuncu halka" diyor: belirgin turuncu dolgu (0.25) + turuncu kenar (paylaşılan geometri/malzeme, tek nesne)
  let ORNG = null;
  function orangeZone(on, x, z, r) {
    if (!ORNG) {
      if (typeof scene === 'undefined') return;
      const g = new THREE.Group(), cg = new THREE.CircleGeometry(1, 48).rotateX(-PI / 2), rg = new THREE.RingGeometry(0.9, 1, 64).rotateX(-PI / 2);
      const fm = new THREE.MeshBasicMaterial({ color: 0xff8a1e, transparent: true, opacity: 0.25, depthWrite: false, fog: false });
      const em = new THREE.MeshBasicMaterial({ color: 0xff7a10, transparent: true, opacity: 0.9, depthWrite: false, fog: false });
      for (const q of [cg, rg, fm, em]) q.userData.keep = true;
      const f = new THREE.Mesh(cg, fm), e = new THREE.Mesh(rg, em); f.renderOrder = 2; e.renderOrder = 3; e.position.y = 0.005;
      g.add(f, e); g.position.y = 0.06; g.visible = false; scene.add(g); ORNG = g;
    }
    if (ORNG.parent == null && typeof scene !== 'undefined') scene.add(ORNG);
    ORNG.visible = !!on; if (on) { ORNG.position.x = x; ORNG.position.z = z; ORNG.scale.set(r, 1, r); }
  }
  const W = { rings: [], boss: null };
  function blowRing(b, x0, z0, dx, dz, len, delay) {
    const o = ringMesh(); if (!o) return;
    o.userData.on = true; o.visible = false;
    W.rings.push({ b, o, x0, z0, dx, dz, len, t: -delay, speed: 4.2, hit: false });
  }
  function clearRings() { for (const r of W.rings) { r.o.visible = false; r.o.userData.on = false; } W.rings.length = 0; }
  function stepRings(dt) {
    const a = A(); if (!a) return;
    const P = a.P;
    for (let i = W.rings.length - 1; i >= 0; i--) {
      const r = W.rings[i]; r.t += dt;
      if (r.t < 0) continue;
      const s = r.t * r.speed, x = r.x0 + r.dx * s, z = r.z0 + r.dz * s, rad = 0.55 + 0.35 * Math.min(1, s / 4);
      r.o.visible = true; r.o.position.set(x, 1.0 + 0.12 * Math.sin(r.t * 5), z);
      r.o.rotation.set(0, Math.atan2(r.dx, r.dz), Math.sin(r.t * 3) * 0.2);
      r.o.scale.setScalar(rad * Math.min(1, r.t / 0.2));
      if ((r.fxT = (r.fxT || 0) - dt) <= 0) { r.fxT = 0.12; a.burst('bubble', x, 1.0, z, { count: 1, scale: 0.6 }); }
      if (!r.hit && !P.dead && r.b && !r.b.dead && sq(P.pos.x - x) + sq(P.pos.z - z) < sq(rad + heroR() * 0.6)) {
        r.hit = true; a.hurtPlayer(dmgOf(r.b, 0.28), x - r.dx, z - r.dz, 0.7); a.burst('bubble', P.pos.x, 1.0, P.pos.z, { count: 5, scale: 1.2 }); a.sfx('bubblePop', { x, z });
      }
      if (s >= r.len || r.hit || !r.b || r.b.dead) {
        a.burst('bubble', x, 1.0, z, { count: 3, scale: 1 }); if (!r.hit) a.sfx('bubblePop', { x, z, vol: 0.4, pitch: rnd(1.1, 1.4) });
        r.o.visible = false; r.o.userData.on = false; W.rings.splice(i, 1);
      }
    }
  }
  function tele(b, x, z, r, dur, colr) { const a = A(), h = a.fx('telegraph', x, z, r, dur, colr); (b.myMarks || (b.myMarks = [])).push(h); return h; }
  function clearMarks(b) { const a = A(); if (b && b.myMarks) { for (const h of b.myMarks) a.remove(h); b.myMarks.length = 0; } }
  const STAGE_AT = [0.66, 0.33];

  // SADE8: uyarı cümlesi, yere işaret çizildiği AN söylenir (kuyrukta bekleyip başka saldırının üstüne düşmesin).
  //   Motorun kendi ipucu çağrısı choose()'da önceden "söylendi" işaretlenir; cümleyi biz, işaretle aynı karede (araya girerek) söyleriz.
  //   S.pendingLine: aşama cümlesi (sıradaki hamleyi anlatır) — o hamle başlarken söylenir.
  function cue(A, S, ph, key) {
    S.cue = S.cue || {}; const k = S.pendingLine || (!S.cue[ph] && key);
    S.pendingLine = null; S.cue[ph] = true; if (!k) return;
    try { if (A.hasLine && !A.hasLine(k)) return; A.say(k, 3, { interrupt: true }); } catch (e) { /* ses yok */ }
  }
  BOSSDAV.register('kocaKirpiBalik', {
    hpK: 2.2, keep: 6.0, roarD: 2.2,
    hints: { halka: 'pr_ipucu_halka', sisir: 'pr_ipucu_sisir', yuvarlan: 'pr_ipucu_yuvarlan', sersem: 'pr_ipucu_sersem' },
    choose(b, S, d) {
      const a = A();
      S.stage = S.stage || 1;
      if (S.hints) { S.hints.halka = S.hints.sisir = S.hints.yuvarlan = true; }   // (SADE8: bu ipuçlarını cue() söyler)
      if (S.pending && S.pending > S.stage) { S.stage = S.pending; a.bossPhase(b, 'hickir', 2.0); return; }
      // SADE4: aşama cümlesi sıradaki hamleyi söylüyor ("mor yoldan çekil" / "turuncu halkadan uzak dur") → o hamle hemen gelsin
      if (S.forceNext) { const f = S.forceNext; S.forceNext = null; a.bossPhase(b, f, { sisir: 1.25, yuvarlan: 1.4 }[f]); return; }
      if ((S.n || 0) >= 3) { S.n = 0; a.bossPhase(b, 'puf', 2.4); return; }
      const opts = S.stage === 1 ? [['halka', 0.55], ['sisir', 0.45]]
        : S.stage === 2 ? [['halka', 0.35], ['sisir', 0.3], ['yuvarlan', 0.35]]
          : [['halka', 0.35], ['sisir', 0.35], ['yuvarlan', 0.3]];
      const ph = a.pickPhase(b, opts);
      a.bossPhase(b, ph, { halka: 2.6, sisir: 1.25, yuvarlan: 1.4 }[ph]);
    },
    moves: {
      // Kabarcık halkası: dudaklarını büzer, Feza'ya doğru mavi şeritler belirir (1,1 s), sonra halkalar yavaşça süzülür.
      halka(b, S, dt, d, ux, uz) {
        const a = A(), t = b.stT;
        faceTo(b, a.P.pos.x, a.P.pos.z, 4, dt);
        if (b.did === 0) {
          b.did = 1; cue(a, S, 'halka', 'pr_ipucu_halka'); const a0 = Math.atan2(ux, uz), lanes = S.stage === 1 ? [0] : S.stage === 2 ? [-0.42, 0, 0.42] : [-0.7, -0.35, 0, 0.35, 0.7];
          const rm = a.bossRoom(); S.lanes = [];
          for (const da of lanes) {
            const an = a0 + da, dx = Math.sin(an), dz = Math.cos(an), x0 = b.x + dx * (b.r + 0.3), z0 = b.z + dz * (b.r + 0.3);
            const len = Math.max(3, a.laneLen(x0, z0, dx, dz, 13, 0.5, rm));
            // SADE10: cümle "halkalar" diyor → yer işareti şerit değil, her yolda dışa doğru dizilen mavi HALKALAR (yollar arası boşluk belirgin)
            for (let q = 0, n = Math.max(2, Math.floor(len / 2.2)); q < n; q++) { const u = (q + 0.6) / n * len; zoneMark(x0 + dx * u, z0 + dz * u, 0.62 + q * 0.06, '#4ab4ff', 1.6 + q * 0.12, 0.22); }
            S.lanes.push({ x0, z0, dx, dz, len });
          }
          sadeFt(a, b.x, b.height + 0.4, b.z, 'Fuuu!', 'word'); a.sfx('bubble', { x: b.x, z: b.z, pitch: 0.7 });
        }
        if (b.did === 1 && t >= 1.15) {
          b.did = 2;
          S.lanes.forEach((L, i) => blowRing(b, L.x0, L.z0, L.dx, L.dz, L.len, i * 0.12));
          if (S.stage === 3) S.lanes.forEach((L, i) => { if (i % 2 === 0) blowRing(b, L.x0, L.z0, L.dx, L.dz, L.len, 0.7 + i * 0.1); });
          a.sfx('whoosh', { x: b.x, z: b.z, pitch: 1.4, vol: 0.6 }); const m = a.muzzle(b); a.burst('bubble', m.x, m.y, m.z, { count: 7, scale: 1.3 });
        }
        if (t >= b.phD) { S.n = (S.n || 0) + 1; clearMarks(b); a.bossEnd(b, 1.4, 1.3); }
      },
      // Şişip zıplama: kocaman şişer, Feza'nın yerinde turuncu halka (1,25 s), sonra hop! diye oraya iner.
      sisir(b, S, dt) {
        const a = A(), t = b.stT;
        if (b.did === 0) {
          b.did = 1; cue(a, S, 'sisir', 'pr_ipucu_sisir'); const P = a.P, rm = a.bossRoom();
          let tx = P.pos.x, tz = P.pos.z;
          if (rm && !a.inRoom(rm, tx, tz, b.r)) { tx = b.x + (tx - b.x) * 0.6; tz = b.z + (tz - b.z) * 0.6; }
          S.tx = tx; S.tz = tz; S.x0 = b.x; S.z0 = b.z;
          b.tele = a.fx('telegraph', tx, tz, 2.4, b.phD + 0.9, '#ff8a1e'); orangeZone(true, tx, tz, 2.4);
          a.sfx('bubble', { x: b.x, z: b.z, pitch: 0.5, vol: 0.8 }); sadeFt(a, b.x, b.height + 0.6, b.z, 'Şişiyorum!', 'word');
          S.hops = S.hops || 0;
        }
        faceTo(b, S.tx, S.tz, 6, dt);
        if (t >= b.phD) { a.bossPhase(b, 'ziplaGo', 0.9); a.sfx('whoosh', { x: b.x, z: b.z, pitch: 0.8 }); }
      },
      ziplaGo(b, S, dt) {
        const a = A(), u = Math.min(1, b.stT / 0.9);
        b.x = lerp(S.x0, S.tx, u); b.z = lerp(S.z0, S.tz, u); b.y = 4 * 2.6 * u * (1 - u);
        if (u >= 1 && b.did === 0) {
          b.did = 1; b.y = 0;
          a.bossRing(b, b.x, b.z, 2.4, 0.35, 1.0, '#ffd28a');
          a.burst('bubble', b.x, 0.4, b.z, { count: 11, scale: 1.6 }); a.burst('dust', b.x, 0.2, b.z, { count: 6, color: '#f6e2b8' });
          a.sfx('splat', { x: b.x, z: b.z, pitch: 0.7 }); a.sfx('bounce', { x: b.x, z: b.z, pitch: 0.6 });
          a.remove(b.tele); b.tele = null; orangeZone(false);
          if (S.stage === 3 && !S.second) {   // 3. aşama: bir zıplama daha (yeni halka Feza'nın yeni yerinde)
            S.second = true; sadeFt(a, b.x, b.height + 0.5, b.z, 'Bir daha!', 'word');
            a.bossPhase(b, 'sisir', 1.1);
            return;
          }
          S.second = false; S.n = (S.n || 0) + 1;
          a.bossEnd(b, 1.5, 1.4);
        }
      },
      // Şişip yuvarlanma: top gibi şişer, arenada mor şerit belirir (1,4 s), sonra yuvarlanır — "Hoppala!".
      yuvarlan(b, S, dt, d, ux, uz) {
        const a = A(), t = b.stT;
        if (b.did === 0) {
          b.did = 1; cue(a, S, 'yuvarlan', 'pr_ipucu_yuvarlan'); const an = Math.atan2(ux, uz), dx = Math.sin(an), dz = Math.cos(an), rm = a.bossRoom();
          S.len = Math.max(3, Math.min(15, a.laneLen(b.x, b.z, dx, dz, 15, b.r * 0.8, rm)));
          S.x0 = b.x; S.z0 = b.z; S.dx = dx; S.dz = dz; S.hit = false; b.face = an;
          b.tele = a.telegraphLine(b.x, b.z, b.x + dx * (S.len + b.r * 0.5), b.z + dz * (S.len + b.r * 0.5), b.r * 2 + 0.3, 1.4, '#a070ff');   // SADE: ses "mor yol" diyor → mor
          laneMark(b.x, b.z, b.x + dx * (S.len + b.r * 0.5), b.z + dz * (S.len + b.r * 0.5), b.r * 2 + 0.3, '#9a5cff', 1.6, 0.32);
          sadeFt(a, b.x, b.height + 0.5, b.z, 'Yuvarlanıyorum!', 'word'); a.sfx('bubble', { x: b.x, z: b.z, pitch: 0.55 });
        }
        if (b.did === 1 && t >= 1.4) { a.bossPhase(b, 'yuvarlanGo', S.len / 6 + 0.8); a.sfx('whoosh', { x: b.x, z: b.z, pitch: 0.7 }); }
      },
      yuvarlanGo(b, S, dt) {
        const a = A(), t = b.stT, run = S.len / 6;
        if (t < run) {
          const s = 6 * t; b.x = S.x0 + S.dx * s; b.z = S.z0 + S.dz * s; b.face = Math.atan2(S.dx, S.dz);
          if (Math.random() < 0.5) a.burst('bubble', b.x - S.dx * b.r, 0.3, b.z - S.dz * b.r, { count: 2 });
          const P = a.P;
          if (!S.hit && !P.dead && sq(P.pos.x - b.x) + sq(P.pos.z - b.z) < sq(b.r + heroR() + 0.1)) { S.hit = true; a.hurtPlayer(dmgOf(b, 0.38), b.x, b.z, 1.4); a.sfx('bounce', { x: b.x, z: b.z }); }
        } else if (b.did === 0) {
          b.did = 1; a.sfx('bonk', { x: b.x, z: b.z }); a.shake(0.2);
          a.burst('bubble', b.x, 0.8, b.z, { count: 8, scale: 1.4 }); a.burst('star', b.x, b.height, b.z, { count: 3, color: '#fff3a0' });
          sadeFt(a, b.x, b.height + 0.4, b.z, 'Hoppala!', 'word');
        }
        if (t >= b.phD) { S.n = (S.n || 0) + 1; a.bossEnd(b, 1.5, 1.3); }
      },
      // Puf: balon gibi söner — fışşş! — arenada zikzak uçuşur (zararsız), sonra yorulup sersem yatar.
      puf(b, S, dt) {
        const a = A(), t = b.stT;
        if (b.did === 0) { b.did = 1; S.hd = rnd(0, TAU); sadeFt(a, b.x, b.height + 0.5, b.z, 'Pıssss!', 'word'); a.sfx('sigh', { x: b.x, z: b.z, pitch: 1.6 }); a.sfx('whoosh', { x: b.x, z: b.z, pitch: 1.8, vol: 0.6 }); }
        if (t > 0.25 && t < 2.0) {
          S.hd += Math.sin(t * 9) * 4 * dt + rnd(-1, 1) * dt * 3;
          const sp = 5.5 * (1 - t / 2.2), nx = b.x + Math.sin(S.hd) * sp * dt, nz = b.z + Math.cos(S.hd) * sp * dt, rm = a.bossRoom();
          if ((rm && !a.inRoom(rm, nx, nz, b.r)) || !a.isFloor(nx, nz)) S.hd += PI * 0.7;
          else { b.x = nx; b.z = nz; }
          b.face = S.hd + PI; b.y = 0.6 + 0.4 * Math.sin(t * 7);
          if ((S.pT = (S.pT || 0) - dt) <= 0) { S.pT = 0.05; a.burst('bubble', b.x - Math.sin(S.hd) * b.r, b.y + 1.2, b.z - Math.cos(S.hd) * b.r, { count: 2, scale: 0.8 }); }
        } else b.y = damp(b.y, 0, 8, dt);
        if (t >= b.phD) { b.y = 0; a.bossPhase(b, 'sersem', 2.8); a.sfx('bonk', { x: b.x, z: b.z, pitch: 0.8 }); sadeFt(a, b.x, b.height, b.z, 'Başım döndü!', 'word'); }
      },
      // Sersem: yan yatar, yıldızlar döner — vurma fırsatı.
      sersem(b, S, dt) {
        const a = A(), t = b.stT;
        if ((S.zT = (S.zT || 0) - dt) <= 0) { S.zT = 0.45; a.burst('star', b.x, b.height * 0.9, b.z, { count: 2, color: '#fff3a0' }); }
        if (t >= b.phD) { sadeFt(a, b.x, b.height + 0.3, b.z, 'Hazırım!', 'word'); a.bossEnd(b, 1.1, 0.9); }
      },
      // Aşama geçişi: komik hıçkırık (hık! hık! hık!), kabarcıklar saçılır
      hickir(b, S, dt) {
        const a = A(), t = b.stT;
        for (const [i, at] of [[1, 0.25], [2, 0.95], [3, 1.6]]) if (b.did < i && t >= at) {
          b.did = i; sadeFt(a, b.x, b.height + 0.4 + i * 0.2, b.z, 'Hık!', 'word'); a.sfx('hiccup', { x: b.x, z: b.z, pitch: 0.7 + i * 0.08 });
          a.burst('bubble', b.x, b.height * 0.7, b.z, { count: 7, scale: 1.4 }); a.shake(0.12);
        }
        if (b.did === 3 && !S['said' + S.stage]) { S['said' + S.stage] = true; S.pendingLine = S.stage === 2 ? 'pr_kocaKirpiBalik_asama2' : 'pr_kocaKirpiBalik_asama3'; S.forceNext = S.stage === 2 ? 'yuvarlan' : 'sisir'; }
        if (t >= b.phD) a.bossEnd(b, 1.1, 0.8);
      },
    },
    // Hasar süzgeci: sersemken × 1,5; hıçkırırken yarı; aşama eşiklerinde durur (bir sonraki hamlede hıçkırık)
    hit(b, amount, o, S) {
      if (b.ph === 'sersem') amount = Math.round(amount * 1.5);
      if (b.ph === 'hickir') amount = Math.round(amount * 0.5);
      S.stage = S.stage || 1;
      const left = (b.hp - amount) / b.maxHp;
      for (let i = 0; i < 2; i++) if (S.stage === i + 1 && !(S.pending > S.stage) && left <= STAGE_AT[i]) { S.pending = i + 2; return Math.max(0, b.hp - Math.round(b.maxHp * STAGE_AT[i])); }
      return amount;
    },
    update(dt) {
      zoneTick(dt);
      if (ORNG && ORNG.visible) { const bb = W.boss || (typeof GAME !== 'undefined' ? GAME.boss : null); if (!bb || bb.dead || !(bb.ph === 'sisir' || bb.ph === 'ziplaGo')) orangeZone(false); }
      stepRings(dt);
      const g = typeof GAME !== 'undefined' ? GAME : null, b = g && g.boss;
      if (W.rings.length && (!b || b.dead || b.type !== 'kocaKirpiBalik')) clearRings();
      if (b && b.type === 'kocaKirpiBalik' && b.dead && b.myMarks && b.myMarks.length) clearMarks(b);
    },
  });
})();
