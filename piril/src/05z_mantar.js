/* ── Işıklı Mantar Vadisi: huysuzlar + boss (Feza ile Pırıl) ──
   Sahibi: MANTAR bölüm ajanı. Biçim: PIRIL.md › 6 (HUYSUZ.type / HUYSUZ.boss / HUYSUZ.zone, boss hamleleri BOSSDAV.register).
   Hepsi SEVİMLİ (kızgın yüz yok, böcek yok): gülen/yaramaz yüz, önceden belli saldırı hazırlığı, vurulunca "boing", neşelenince kalpler.
   Modeller EMODEL.KIT iskeletiyle (tek parça deri + kemik, örnek başına 1 çizim; geometri tipler arasında paylaşılır).
     zipMantarcik   Zıp Mantarcık     parlak benekli şapkalı minik mantar; zıplayarak gelir, çömelip üstüne zıplar (base yogurt, 'ziplayan');
                                      elit: taçlı Kocaman Zıp Mantarcık
     sporPofudugu   Spor Pofuduğu     pofuduk top mantar; şişip "püf!" diye yumuşak spor bulutu üfler — HASAR YOK, yalnız yavaşlatır
                                      (base mantar, 'uzak'; atış Feza'ya değince yere yumuşak bulut olur, içinde Feza yavaşlar)
     tohumTopaci    Tohum Topacı      palamut gibi tohum topaç; fırıl fırıl dönerek yuvarlanır, sonra başı döner (base goblin, 'yuvarlanan')
     yosunTopu      Yosun Topu        üstünde çiçekli filiz olan yosun yumağı; yosuna gömülüp tümsek olarak kayar, "cee!" diye çıkar
                                      (base kostebek, 'kazici'); elit: taçlı Kocaman Yosun Topu
     altinMantarcik Altın Mantarcık   nadir: neşelenince "gizli" çıkartma + altın şeker
     kocaPofudukMantar Koca Pofuduk Mantar   boss (3 aşama): hapşırınca parıltılı spor saçar, şapkasıyla zıplar, spor halkası, üçlü zıplama,
                                      yorulunca uyuklar; küçük mantarcıklar çağırır. Neşelenince 1. ışığı verir (motor: ingredient → PIRIL_GUC.ac(1)).
   Sesler (SES'e istek): pr_ilk_<tip>, pr_kocaPofudukMantar_giris|_yarim|_bitti|_asama2|_asama3, pr_ipucu_<hamle>. */
const HZ_MANTAR = (() => {
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
  const SPOR_COL = '#d9ffb0';   // Spor Pofuduğu atışının rengi (yakalanıp yumuşak buluta çevrilir)

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
    const idle = s.mv < 0.15 && st.windup < 0 && st.attack < 0 && !(st.dying >= 0) && !(st.hurt > 0.3) && !(st.burrow > 0.05);
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
    else if (u < 0.82) { const k = (u - 0.2) / 0.62; air = Math.sin(PI * k) * A; y = air * h; const e = Math.abs(Math.cos(PI * k)); sy += 0.14 * e * A; sxz -= 0.06 * e * A; }
    else { const k = Math.sin(PI * (u - 0.82) / 0.18); sy -= 0.2 * k * A; sxz += 0.12 * k * A; }
    HOP.y = y; HOP.sy = sy; HOP.sxz = sxz; HOP.u = u; HOP.air = air;
    return HOP;
  }
  function walkPh(s, dt, rate) { if (s.mv > 0.03) s.walk += dt * (rate + 5 * s.mv); return Math.min(1, s.mv * 1.4); }

  // ── ortak parçalar ──
  // şapka benekleri: lathe yüzeyine yassı, ışıklı (unlit HDR) benekler — gece parlayan mantar
  function spots(r, prof, list, c, k = 1.9) {
    r.fx(1, 0);
    for (const [y, a, s] of list) {
      const [p, n] = K.onLathe(prof, y, a, 0.004);
      r.add(G.sphere(10, 7), hdr(c, k), p, K.qz(n[0], n[1], n[2]), [s, s, s * 0.32]);
    }
    r.fx(0, 0);
  }
  function glints(r, pts, c = '#fff6c8') {
    r.fx(1, 0);
    for (const p of pts) {
      r.add(G.octa(), hdr(c, 2.2), p, [0, 0, 0], [p[3], p[3] * 1.9, p[3] * 0.5]);
      r.add(G.octa(), hdr(c, 2.2), p, [0, 0, PI / 2], [p[3], p[3] * 1.9, p[3] * 0.5]);
    }
    r.fx(0, 0);
  }
  function foot(r, x, y, z, sx, sy, sz, c) {
    r.fx(0, 0.35).add(G.sphere(14, 9), c, [x, y, z], null, [sx, sy, sz]);
    r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.0), [x - sx * 0.25, y + sy * 0.55, z + sz * 0.4], null, [sx * 0.2, sy * 0.14, sz * 0.16]);
    r.fx(0, 0);
  }

  // ════════════════ ZIP MANTARCIK ════════════════
  // Kısa tombul krem sap (yüz sapta), kocaman yuvarlak şapka (mor / turkuaz / pembe), üstünde ışıklı benekler, şapka altında
  // açık renk solungaç halkası. Zıplarken şapka gecikmeli yaylanır; bekleme: şapkasını köpek gibi silkeler, minik spor tozu.
  const ZIP_CAP = [[0.0, 0.58], [0.197, 0.571], [0.328, 0.58], [0.385, 0.623], [0.377, 0.691], [0.312, 0.775], [0.197, 0.843], [0.082, 0.873], [0.0, 0.877]];   // (yakından da yüz görünsün: şapka küçük ve yukarıda)
  const ZIP_STEM = [[0, 0.02], [0.2, 0.02], [0.25, 0.07], [0.265, 0.2], [0.255, 0.36], [0.22, 0.52], [0.16, 0.6], [0, 0.61]];
  const ZIP_VAR = { mavi: ['#3f8cff', '#a8d4ff', '#2458c8'], mor: ['#3f8cff', '#a8d4ff', '#2458c8'],   // (GÜZEL) mor yalnız Pırıl'ın: mantarcık mavi/turkuaz/pembe
    turkuaz: ['#2fbfd0', '#9ef4ff', '#1a7fa0'], pembe: ['#ff6fb4', '#ffc2e2', '#c83a86'] };
  function buildZip(r, o) {
    const E = o.elite, R = o.rare;
    const v = R ? ['#ffc23a', '#fff0a0', '#d88a10'] : ZIP_VAR[o.variant] || ZIP_VAR[E ? 'pembe' : 'mavi'];
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('cap', 'body', [0, 0.58, 0]);
    r.bone('feet', 'root', [0, 0.03, 0.06]);
    // sap (gövde)
    r.on('body').fx(0, 0.15, 0, (x, y) => 0.4 * sm(y / 0.5));
    r.add(K.lathe('mzStem2', ZIP_STEM, 30), K.vgrad(0.02, 0.6, [[0, '#cdbbe6'], [0.4, '#f4ecdf'], [1, '#fff8ee']]), [0, 0, 0]);
    // şapka: dış kubbe, alt solungaç halkası, ışıklı benekler
    r.on('cap').fx(0, 0.45, 0, (x, y) => 0.6 * sm((y - 0.62) / 0.26));
    r.add(K.lathe('mzCap2', ZIP_CAP, 36), K.vgrad(0.57, 0.88, [[0, v[2]], [0.35, v[0]], [1, v[1]]]), [0, 0, 0]);
    r.fx(0, 0.1).add(G.cyl(1, 0.62, 28), mixc(v[1], '#fff4e8', 0.55), [0, 0.575, 0], null, [0.37, 0.022, 0.37]);
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; r.add(G.box(), mixc(v[2], '#ffffff', 0.4), [Math.sin(a) * 0.25, 0.567, Math.cos(a) * 0.25], [0, a, 0], [0.008, 0.012, 0.21]); }
    const sp = [];
    for (let i = 0; i < 7; i++) sp.push([0.64 + 0.19 * hash(i, 2, 3), i / 7 * TAU + 0.4 * hash(i, 5, 1), 0.04 + 0.02 * hash(i, 7, 7)]);
    sp.push([0.86, 0, 0.042]);
    spots(r, ZIP_CAP, sp, R ? '#ffffff' : '#c8fbff', 1.9);
    if (R) glints(r, [[0.28, 0.88, 0.1, 0.05], [-0.3, 0.78, 0.05, 0.04], [0.1, 0.97, -0.2, 0.035]]);
    if (E) K.crown(r.on('cap'), [0, 0.87, -0.04], 0.6);
    // ayaklar
    r.on('feet');
    for (const sd of [-1, 1]) foot(r, 0.12 * sd, 0.045, 0.1, 0.085, 0.05, 0.11, mixc(v[2], '#3a2a5a', 0.3));
    // yüz (sapın önünde)
    r.on('body');
    K.face(r, [0, 0.28, 0], 0.25, yuz({ bone: 'body', tilt: 0.2, ex: 0.088, ey: 0.04, er: 0.074, iris: '#3b2b6a', skin: col('#f6eee4'), browCol: '#7a6a90', browY: 1.38,
      mouthY: -0.085, mouthW: 0.075, heartY: 1.6, heartX: 1.25 }));
    r.on('body').mark('muzzle', [0, 0.35, 0.25]);
    return { height: 0.9, glowC: col(v[1]), mat: { rough: 0.5, sss: col('#ffffff').multiplyScalar(0.05), rim: v[1], rimK: 0.55, rimP: 2.0, wob: 0.008, wobF: 6, wobS: 4 } };
  }
  function animZip(m, dt, st, s) {
    const B = m.B, b = B.body, c = B.cap;
    const g = hopGait(s, st, dt, 2.5, 0.24);
    let y = g.y, sy = g.sy * (1 + 0.025 * breath(s, 3)), sxz = g.sxz, rx = 0.1 * g.air;
    // şapka gecikmeli yaylanır (havada yukarı, inişte basılır)
    s.capV = s.capV || 0; s.capY = s.capY || 0;
    const tgt = -0.06 * g.air + (g.u > 0.82 ? 0.05 : 0);
    s.capV += ((tgt - s.capY) * 160 - s.capV * 12) * dt; s.capY += s.capV * dt;
    let cy = s.capY, cs = 1, crx = -0.26, crz = Math.sin(s.t * 1.7 + s.ph) * 0.04, cry = 0;
    if (st.windup >= 0) {   // çömel, şapka geriye yatar, titrer
      const w = sm(st.windup * 1.4);
      sy *= 1 - 0.28 * w; sxz *= 1 + 0.15 * w; crx -= 0.35 * w; cs = 1 + 0.08 * w;
      b.position.x = Math.sin(s.t * 60) * 0.012 * st.windup;
    }
    if (st.attack >= 0) {
      const a = st.attack;
      if (a < 1) { const k = Math.sin(PI * a); sy *= 1 + 0.22 * k; sxz *= 1 - 0.1 * k; rx += 0.25 * k; crx += 0.3 * k; cy += 0.06 * k; }
      else { sy *= 0.86; sxz *= 1.1; cy -= 0.04; }
    }
    { const u = gag(s, st, dt, 2.0, 4.5);   // bekleme: şapkasını silkeler (fır fır), sonra gururla düzeltir
      if (u >= 0) {
        const sh = bumpU(u, 0.05, 0.6), fix = bumpU(u, 0.65, 0.95);
        crz += Math.sin(s.t * 38) * 0.22 * sh; cry += Math.sin(s.t * 31) * 0.3 * sh; cy += 0.04 * sh;
        crx -= 0.15 * fix; y += 0.05 * fix; s.eyeK = 1 - 0.8 * sh;
      }
    }
    b.position.y = y; b.scale.set(sxz, sy, sxz); b.rotation.x = rx;
    c.position.y += cy; c.rotation.x = crx; c.rotation.z = crz; c.rotation.y = cry; c.scale.setScalar(cs);
    B.feet.position.y += g.air * 0.1; B.feet.rotation.x = -0.4 * g.air;
    boing(s, st, dt, b);
  }

  // ════════════════ SPOR POFUDUĞU ════════════════
  // Yuvarlak, pofuduk, lila-beyaz top mantar (ayı mantarı); yüzeyinde minik gözenekler, tepesinde üç tutam ve küçük ağız deliği
  // (sporlar buradan çıkar). Hazırlık: kocaman şişer, yanakları kabarır; "püf!" söner. Bekleme: kendini gıdıklayıp minik spor hapşırır.
  const SPOR_P = [[0, 0.02], [0.18, 0.03], [0.32, 0.12], [0.4, 0.3], [0.4, 0.48], [0.33, 0.66], [0.2, 0.76], [0.06, 0.8], [0, 0.8]];
  function buildSpor(r, o) {
    const E = o.elite;
    const base = E ? col('#e3c6ff') : col('#efe6ff'), deep = E ? col('#a77ae8') : col('#b9a4e0'), light = col('#ffffff');
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('top', 'body', [0, 0.78, 0]);
    r.bone('feet', 'root', [0, 0.03, 0.05]);
    r.on('body').fx(0, 0.1, 0, (x, y) => 0.5 * sm(y / 0.6));
    r.add(K.lathe('mzSpor', SPOR_P, 36), K.vgrad(0.02, 0.8, [[0, deep], [0.45, base], [1, light]]), [0, 0, 0]);
    // gözenekler (yüz bölgesi boş)
    r.fx(0, 0);
    for (let i = 0; i < 26; i++) {
      const yy = 0.18 + 0.55 * hash(i, 1, 9), a = i * 2.39996;
      if (Math.cos(a) > 0.55 && yy > 0.22 && yy < 0.6) continue;
      const [p, n] = K.onLathe(SPOR_P, yy, a, -0.002);
      r.add(G.sphere(8, 6), mixc(deep, base, 0.4), p, K.qz(n[0], n[1], n[2]), [0.022, 0.022, 0.008]);
    }
    // tepe: ağız deliği + üç tutam
    r.on('top').fx(0, 0.2);
    r.add(G.torus(TAU, 0.35, 14), mixc(deep, base, 0.5), [0, 0.8, 0], [PI / 2, 0, 0], [0.07, 0.07, 0.07]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#e8ffc8', 1.3), [0, 0.795, 0], null, [0.05, 0.015, 0.05]);
    r.fx(0, 0.2);
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + 0.5; r.add(G.sphere(10, 8), light, [Math.sin(a) * 0.1, 0.84, Math.cos(a) * 0.1 - 0.04], null, [0.06, 0.05, 0.06]); }
    r.fx(0, 0);
    if (E) K.crown(r.on('top'), [0, 0.86, -0.08], 0.5);
    r.on('feet');
    for (const sd of [-1, 1]) foot(r, 0.15 * sd, 0.04, 0.1, 0.09, 0.05, 0.11, '#8a6ab8');
    r.on('body');
    K.face(r, [0, 0.42, 0], 0.4, yuz({ bone: 'body', tilt: 0.18, ex: 0.12, ey: 0.03, er: 0.085, iris: '#4a3a8a', skin: base, browCol: '#8a7aa8', browY: 1.36,
      mouthY: -0.115, mouthW: 0.085, heartY: 1.1, heartX: 1.15 }));
    r.on('top').mark('muzzle', [0, 0.86, 0.04]);
    return { height: 0.82, glowC: col('#d9ffb0'), mat: { rough: 0.85, sss: col('#ffffff').multiplyScalar(0.06), rim: '#f4e8ff', rimK: 0.5, rimP: 1.8, wob: 0.012, wobF: 5, wobS: 4 } };
  }
  function animSpor(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 8), ph = s.walk;
    b.rotation.z = Math.sin(ph) * 0.12 * k + Math.sin(s.t * 1.3 + s.ph) * 0.025;
    b.position.y += Math.abs(Math.sin(ph)) * 0.04 * k;
    B.feet.position.y += Math.max(0, Math.sin(ph)) * 0.02 * k;
    let sc = 1 + 0.03 * breath(s), sy = 1, rx = 0, top = 1;
    if (st.windup >= 0) {   // kocaman şişer, titrer
      const w = sm(st.windup * 1.2);
      sc *= 1 + 0.28 * w; sy *= 1 + 0.06 * w; rx = -0.12 * w; top = 1 + 0.4 * w; s.eyeK = 1 - 0.5 * w;
      b.position.x += Math.sin(s.t * 50) * 0.01 * st.windup;
    }
    if (st.attack >= 0 && st.attack < 1) { const a = st.attack, kk = Math.sin(PI * Math.min(1, a / 0.4)); sc *= 1 - 0.18 * kk; rx = 0.12 * kk; top = 1 + 0.6 * kk; s.mouthO = kk; }
    { const u = gag(s, st, dt, 2.6, 5);   // bekleme: burnu kaşınır, şişer şişer… "hapşu!" (minik tutamlar havalanır)
      if (u >= 0) {
        const inh = sm(u / 0.55) * (1 - sm((u - 0.6) / 0.06)), sn = bumpU(u, 0.6, 0.85);
        sc *= 1 + 0.12 * inh - 0.12 * sn; rx -= 0.15 * inh; rx += 0.3 * sn; top = 1 + 0.8 * sn; s.eyeK = 1 - 0.85 * Math.max(inh * 0.6, sn);
      }
    }
    b.rotation.x = rx; b.scale.set(sc, sc * sy, sc);
    B.top.scale.setScalar(top); B.top.position.y += 0.04 * (top - 1);
    boing(s, st, dt, b);
  }

  // ════════════════ TOHUM TOPACI ════════════════
  // Palamut gibi tohum topaç: sivri ucunda durur (topaç), karamel gövdede pembe-turkuaz ışıklı şeritler, pürüzlü şapka, tepesinde sap.
  // Yürürken ucunda sallanarak kayar; hazırlık: yerinde dönmeye başlar (vızzz); saldırı: fırıl fırıl yuvarlanır; sonra başı döner.
  const TOP_P = [[0, 0.0], [0.04, 0.02], [0.14, 0.1], [0.27, 0.22], [0.33, 0.33], [0.34, 0.42], [0.3, 0.48], [0, 0.49]];
  const TOPC_P = [[0, 0.44], [0.33, 0.44], [0.37, 0.48], [0.36, 0.55], [0.3, 0.62], [0.18, 0.67], [0, 0.69]];
  function buildTohum(r, o) {
    const E = o.elite;
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('cap', 'body', [0, 0.46, 0]);
    r.on('body').fx(0, 0.5);
    r.add(K.lathe('mzTop', TOP_P, 32), K.vgrad(0, 0.48, [[0, '#a86a3a'], [0.5, '#e0a060'], [1, '#f6c886']]), [0, 0, 0]);
    // ışıklı şeritler (topaç çizgileri)
    r.fx(1, 0);
    for (const [y, c] of [[0.17, '#ff8fd0'], [0.27, '#8ff4ff']]) {
      const [p] = K.onLathe(TOP_P, y, 0, 0.004), rr = Math.hypot(p[0], p[2]);
      r.add(G.torus(TAU, 0.06, 32), hdr(c, 1.7), [0, y, 0], [PI / 2, 0, 0], [rr, rr, rr]);
    }
    r.fx(0, 0);
    // şapka (palamut kabuğu: pürüzlü)
    r.on('cap').fx(0, 0.1, 1);
    r.add(K.lathe('mzTopC', TOPC_P, 32), K.vgrad(0.44, 0.69, [[0, '#6a4428'], [1, '#9a6a3e']]), [0, 0, 0]);
    r.fx(0, 0);
    for (let i = 0; i < 18; i++) { const y = 0.5 + 0.12 * hash(i, 3, 1), a = i * 2.39996; const [p] = K.onLathe(TOPC_P, y, a, 0.005); r.add(G.sphere(6, 4), '#7a5030', p, null, 0.028); }
    r.fx(0, 0.3).seg([0, 0.68, 0], [0.03, 0.8, -0.02], 0.025, '#5a3a20', 0.018, 6);
    r.fx(0, 0.2).add(G.sphere(10, 6), '#7fd86a', [0.08, 0.79, -0.02], [0, 0, -0.6], [0.07, 0.02, 0.04]);
    if (E) K.crown(r.on('cap'), [0, 0.7, -0.04], 0.45);
    r.on('body');
    K.face(r, [0, 0.33, 0], 0.32, yuz({ bone: 'body', tilt: 0.15, ex: 0.1, ey: 0.03, er: 0.07, iris: '#4a2a1a', skin: col('#f0b878'), browCol: '#6a4428', browY: 1.38,
      mouthY: -0.09, mouthW: 0.075, heartY: 1.3, heartX: 1.2 }));
    r.on('body').mark('muzzle', [0, 0.3, 0.3]);
    return { height: 0.78, glowC: col('#ffd28a'), mat: { rough: 0.45, sss: col('#ffb070').multiplyScalar(0.04), rim: '#ffe0b0', rimK: 0.4, rimP: 2.2 } };
  }
  function animTohum(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 7);
    // ucunda sallanma (topaç yalpası)
    const wob = 0.08 + 0.08 * k;
    let rz = Math.sin(s.t * 3.1 + s.ph) * wob, rx = Math.cos(s.t * 3.1 + s.ph) * wob * 0.6, spin = 0, y = Math.abs(Math.sin(s.walk)) * 0.03 * k;
    s.spinV = damp(s.spinV || 0, 0, 2, dt);
    if (st.windup >= 0) { const w = sm(st.windup * 1.2); s.spinV = Math.max(s.spinV, 26 * w); rz *= 1 - w; rx = -0.15 * w; y += 0.03 * w; s.eyeK = 1 - 0.6 * w; }
    if (st.attack >= 0 && st.attack < 1 && s.mv > 0.4) { s.spinV = 30; rx = 0.25; }
    else if (st.attack >= 0) s.eyeWob = 1;   // başı döner (ama gülümser)
    s.spin = ((s.spin || 0) + s.spinV * dt) % TAU; spin = s.spin;
    { const u = gag(s, st, dt, 2.2, 5);   // bekleme: kendi etrafında bir pirueet, sonra sendeleyip güler
      if (u >= 0) { spin += TAU * 2 * sm(u / 0.6); const dz = bumpU(u, 0.6, 1); rz += Math.sin(s.t * 9) * 0.2 * dz; s.eyeWob = Math.max(s.eyeWob, dz); }
    }
    b.position.y += y; b.rotation.set(rx, spin, rz);
    B.cap.rotation.z = Math.sin(s.t * 2 + s.ph) * 0.05;
    boing(s, st, dt, b);
  }

  // ════════════════ YOSUN TOPU ════════════════
  // Yumuşacık yeşil yosun yumağı (yüzlerce minik tutam), tepesinde iki yapraklı filiz ve minik beyaz-pembe çiçekler, yosunda ışık noktaları.
  // Saklanınca yosun tümseğine gömülür (tümsek kayar), yaklaşınca "cee!" diye fırlar.
  function buildYosun(r, o) {
    const E = o.elite;
    const base = E ? col('#58c070') : col('#6fcf72'), deep = E ? col('#2f7a48') : col('#3d8a4c'), light = col('#b8f08a');
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('sprout', 'body', [0, 0.74, 0]);
    r.bone('mound', 'root', [0, 0, 0]);
    const C = [0, 0.38, 0], R = 0.36;
    r.on('body').fx(0, 0, 0, 0.6).add(G.sphere(26, 18), K.vgrad(0.02, 0.74, [[0, deep], [0.5, base], [1, light]]), C, null, [R, R * 0.95, R]);
    // tutamlar (yüz açık)
    r.fx(0, 0, 0, 1);
    const N = 60, ga = PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const yy = 1 - (i + 0.5) / N * 2, rr = Math.sqrt(1 - yy * yy), a = i * ga, dx = Math.sin(a) * rr, dz = Math.cos(a) * rr;
      if (dz > 0.45 && Math.abs(dx) < 0.7 && yy > -0.6 && yy < 0.5) continue;
      if (yy < -0.8) continue;
      const rad = 0.06 + 0.045 * hash(i, 4, 2), out = R * (0.92 + 0.06 * hash(i, 8, 3));
      r.add(G.sphere(8, 6), mixc(base, hash(i, 2, 2) > 0.5 ? light : deep, 0.45 * hash(i, 6, 1)), [dx * out, C[1] + yy * out * 0.95, dz * out], null, [rad, rad * 0.85, rad]);
    }
    r.fx(0, 0);
    // yosun ışık noktaları
    r.fx(1, 0);
    for (let i = 0; i < 9; i++) { const yy = -0.2 + 0.9 * hash(i, 9, 9), a = i * 2.2 + 2.6, rr = Math.sqrt(Math.max(0, 1 - yy * yy)); if (Math.cos(a) > 0.4) continue; r.add(G.sphere(6, 4), hdr(i % 2 ? '#d8ff9a' : '#a8fff0', 1.8), [Math.sin(a) * rr * R * 1.02, C[1] + yy * R, Math.cos(a) * rr * R * 1.02], null, 0.022); }
    r.fx(0, 0);
    // filiz + çiçekler
    r.on('sprout').fx(0, 0.3).seg([0, 0.7, 0], [0.02, 0.88, 0], 0.022, '#4aa84a', 0.016, 6);
    for (const sd of [-1, 1]) r.add(G.sphere(12, 8), '#7ee06a', [0.09 * sd, 0.9, 0], [0, 0, -sd * 0.5], [0.1, 0.025, 0.06]);
    r.fx(0, 0.2);
    for (const [x, z, c] of [[0.2, -0.05, '#ffffff'], [-0.18, 0.08, '#ffb8da'], [0.05, -0.2, '#fff4a0']]) {
      for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; r.add(G.sphere(6, 4), c, [x + Math.sin(a) * 0.035, 0.73 + 0.02, z + Math.cos(a) * 0.035], null, [0.025, 0.012, 0.025]); }
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffd84a', 1.4), [x, 0.755, z], null, 0.018).fx(0, 0.2);
    }
    r.fx(0, 0);
    if (E) K.crown(r.on('sprout'), [0, 0.76, -0.1], 0.5);
    // gömülünce görünen yosun tümseği
    r.on('mound').fx(0, 0, 0, 1);
    r.add(G.sphere(18, 10), deep, [0, 0.02, 0], null, [0.62, 0.22, 0.62]);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; r.add(G.sphere(8, 6), mixc(base, deep, 0.4), [Math.sin(a) * 0.45, 0.08, Math.cos(a) * 0.45], null, [0.14, 0.1, 0.14]); }
    r.fx(1, 0).add(G.sphere(6, 4), hdr('#d8ff9a', 1.8), [0.12, 0.2, 0.1], null, 0.03).add(G.sphere(6, 4), hdr('#a8fff0', 1.8), [-0.15, 0.17, -0.05], null, 0.025);
    r.fx(0, 0);
    r.on('body');
    K.face(r, C, R, yuz({ bone: 'body', tilt: 0.2, ex: 0.11, ey: 0.03, er: 0.08, iris: '#24502e', skin: mixc(base, light, 0.35), browCol: '#2f6a3a', browY: 1.38,
      mouthY: -0.11, mouthW: 0.085, heartY: 1.0, heartX: 1.15 }));
    r.on('body').mark('muzzle', [0, 0.4, 0.36]);
    return { height: 0.86, glowC: col('#b8f08a'), mat: { rough: 0.92, sss: col('#a0ff80').multiplyScalar(0.04), rim: '#d8ffb0', rimK: 0.45, rimP: 1.9, wob: 0.012, wobF: 6, wobS: 4 } };
  }
  function animYosun(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 10), ph = s.walk;
    let y = Math.abs(Math.sin(ph)) * 0.06 * k, sy = 1 + 0.03 * breath(s), sxz = 1, rz = Math.sin(ph) * 0.1 * k;
    B.sprout.rotation.z = Math.sin(s.t * 2.2 + s.ph) * 0.15 - Math.sin(ph) * 0.2 * k;
    { const u = gag(s, st, dt, 2.4, 5);   // bekleme: gözlerini kapatıp taş gibi durur… "cee!" diye zıplar, filiz pervane gibi döner
      if (u >= 0) {
        const hide = sm(u / 0.15) * (1 - sm((u - 0.6) / 0.08)), cee = bumpU(u, 0.62, 1);
        sy *= 1 - 0.18 * hide; sxz *= 1 + 0.08 * hide; s.eyeK = 1 - 0.95 * hide + 0.35 * cee; y += 0.18 * cee; B.sprout.rotation.y = TAU * 2 * sm((u - 0.62) / 0.38);
      }
    }
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); sy *= 1 - 0.2 * w; sxz *= 1 + 0.1 * w; b.position.x += Math.sin(s.t * 55) * 0.012 * st.windup; }
    if (st.attack >= 0 && st.attack < 1) { const kk = Math.sin(PI * st.attack); y += 0.22 * kk; sy *= 1 + 0.15 * kk; s.eyeK = 1 + 0.3 * kk; }
    const bu = st.burrow || 0;   // saklanma: yosuna gömülür
    if (bu > 0.01) { y -= bu * 0.95; rz += Math.sin(s.t * 30) * 0.05 * bu; B.mound.scale.setScalar(Math.min(1, bu * 1.5)); B.mound.position.y += Math.sin(s.t * 12) * 0.01; }
    else B.mound.scale.setScalar(0.0001);
    b.position.y += y; b.scale.set(sxz, sy, sxz); b.rotation.z = rz;
    boing(s, st, dt, b);
  }

  // ════════════════ KOCA POFUDUK MANTAR (boss) ════════════════
  // ~3,4 m tombul krem-lila sap (yüz sapta), kocaman pembe-mor pofuduk şapka, şapkada ışıklı benekler, şapka kenarında pofuduk saçak,
  // tepesinde ışıklı top uçlu minik filiz; kısa kollar, kocaman yuvarlak ayaklar. Gözler büyük, yanaklar pembe.
  const KB_STEM = [[0, 0.02], [0.92, 0.02], [1.1, 0.16], [1.2, 0.55], [1.17, 1.2], [1.04, 1.8], [0.9, 2.15], [0, 2.22]];
  const KB_CAP = [[0, 2.05], [1.1, 2.03], [1.62, 2.1], [1.82, 2.26], [1.78, 2.55], [1.5, 2.95], [1.0, 3.28], [0.45, 3.42], [0, 3.45]];
  function buildKoca(r, o) {
    const capA = col('#ff7ec8'), capB = col('#b46cff'), capL = col('#ffd0f0');
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('cap', 'body', [0, 2.1, 0]);
    r.bone('sprout', 'cap', [0, 3.45, 0]);
    r.bone('armL', 'body', [1.1, 1.25, 0.1]); r.bone('armR', 'body', [-1.1, 1.25, 0.1]);
    r.bone('footL', 'root', [0.55, 0.1, 0.25]); r.bone('footR', 'root', [-0.55, 0.1, 0.25]);
    // sap
    r.on('body').fx(0, 0.15, 0, (x, y) => 0.25 * sm(y / 2));
    r.add(K.lathe('mzKbStem', KB_STEM, 48), K.vgrad(0.02, 2.2, [[0, '#c8b0ea'], [0.35, '#f2e6f4'], [1, '#fff6ec']]), [0, 0, 0]);
    // göbek ışıltısı (yumuşak)
    r.fx(0.4, 0.3).add(G.sphere(16, 10), mixc('#fff6ec', '#ffe0f4', 0.5), [0, 0.62, 0.98], null, [0.5, 0.38, 0.14]);
    // şapka
    r.on('cap').fx(0, 0.45, 0, (x, y) => 0.5 * sm((y - 2.3) / 1.1));
    r.add(K.lathe('mzKbCap', KB_CAP, 56), K.vgrad(2.0, 3.48, [[0, capB], [0.45, capA], [1, capL]]), [0, 0, 0]);
    r.fx(0, 0.05).add(G.cyl(1, 0.7, 44), mixc(capL, '#fff6ec', 0.5), [0, 2.05, 0], null, [1.66, 0.06, 1.66]);
    for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; r.add(G.box(), mixc(capB, '#ffffff', 0.45), [Math.sin(a) * 1.05, 2.035, Math.cos(a) * 1.05], [0, a, 0], [0.025, 0.03, 1.05]); }
    // saçak: şapka kenarında pofuduk toplar
    r.fx(0, 0.1, 0, 1);
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU, rr = 1.77 + 0.04 * hash(i, 1, 1); r.add(G.sphere(12, 8), mixc('#fff4fa', capL, 0.3 * hash(i, 3, 3)), [Math.sin(a) * rr, 2.22, Math.cos(a) * rr], null, [0.17, 0.13, 0.17]); }
    r.fx(0, 0);
    // ışıklı benekler
    const sp = [];
    for (let i = 0; i < 16; i++) sp.push([2.4 + 0.9 * hash(i, 2, 5), i * 2.39996, 0.15 + 0.09 * hash(i, 4, 4)]);
    spots(r, KB_CAP, sp, '#fff4b0', 1.8);
    spots(r, KB_CAP, [[2.6, 0.8, 0.12], [2.9, 3.2, 0.1], [2.5, 4.6, 0.11], [3.2, 2.0, 0.09]], '#a8fff4', 1.8);
    // filiz + ışık topu
    r.on('sprout').fx(0, 0.3).seg([0, 3.44, 0], [0.08, 3.85, -0.05], 0.06, '#5ac06a', 0.04, 8);
    for (const sd of [-1, 1]) r.add(G.sphere(12, 8), '#86e070', [0.2 * sd + 0.06, 3.72, -0.04], [0, 0, -sd * 0.5], [0.2, 0.05, 0.12]);
    r.fx(1, 0).add(G.sphere(14, 10), hdr('#fff0a0', 2.0), [0.1, 3.92, -0.06], null, 0.12);
    r.fx(0, 0);
    // kollar (kısa, yuvarlak eller)
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.2);
      r.seg([1.05 * sd, 1.3, 0.1], [1.45 * sd, 0.95, 0.2], 0.2, '#f0e2f2', 0.17, 12);
      r.add(G.sphere(16, 12), '#fff6ee', [1.52 * sd, 0.88, 0.24], null, [0.24, 0.22, 0.22]);
      r.add(G.sphere(10, 8), '#fff6ee', [1.42 * sd, 1.0, 0.36], null, 0.1);
      r.fx(0, 0);
    }
    // ayaklar
    for (const sd of [-1, 1]) { r.on(sd > 0 ? 'footL' : 'footR'); foot(r, 0.55 * sd, 0.13, 0.3, 0.42, 0.16, 0.5, '#9a6ad8'); }
    // yüz
    r.on('body');
    K.face(r, [0, 1.2, 0.04], 1.14, yuz({ bone: 'body', tilt: 0.2, ex: 0.34, ey: 0.08, er: 0.22, iris: '#4a2a8a', skin: col('#f8eef2'), browCol: '#9a7ab8', browY: 1.36,
      mouthY: -0.3, mouthW: 0.26, mouthPivot: true, heartY: 1.15, heartX: 1.1, heartS: 0.3 }));
    r.on('body').mark('muzzle', [0, 1.0, 1.1]);
    return { height: 3.6, glowC: col('#ff9fe0'), portrait: { cx: 0, cy: 1.9, cz: 0, rad: 2.0 },
      mat: { rough: 0.55, sss: col('#ffd0f0').multiplyScalar(0.05), rim: '#ffe0ff', rimK: 0.5, rimP: 2.0, wob: 0.006, wobF: 3, wobS: 3 } };
  }
  const bph = st => (st.dying >= 0 ? 'dying' : (st.phase || 'idle'));
  const bpt = st => clamp(+st.phaseT || 0, 0, 1);
  function animKoca(m, dt, st, s) {
    const B = m.B, b = B.body, c = B.cap, ph = bph(st), t = bpt(st), br = Math.sin(s.t * 1.5 + s.ph);
    let sy = 1 + 0.025 * br, sxz = 1 - 0.012 * br, y = 0, rx = 0, rz = 0, ry = 0;
    let cy = 0, cs = 1, crx = -0.24, crz = Math.sin(s.t * 1.1 + s.ph) * 0.025, cry = 0, aL = 0.25, aR = -0.25, aLx = 0, aRx = 0, fl = 0;
    // yürüyüş: paytak
    s.wk = damp(s.wk || 0, st.move > 0.05 ? 1 : 0, 5, dt);
    if (s.wk > 0.01) s.walk += dt * 5.5 * s.wk;
    const w0 = Math.sin(s.walk);
    rz += w0 * 0.06 * s.wk; y += Math.abs(w0) * 0.08 * s.wk; crz += -w0 * 0.05 * s.wk;
    B.footL.position.y += Math.max(0, w0) * 0.12 * s.wk; B.footR.position.y += Math.max(0, -w0) * 0.12 * s.wk;
    aL += w0 * 0.3 * s.wk; aR += w0 * 0.3 * s.wk;
    // uyuyor (Feza'yı görmeden önce) ya da uyukluyor: şapka gözlerine kayar, horlar (şişip söner)
    const sleep = (st.aggro === false && ph === 'idle') || ph === 'uyku' ? 1 : 0;
    s.slK = damp(s.slK || 0, sleep, 3, dt);
    if (s.slK > 0.01) {
      const z = Math.sin(s.t * 1.6) * 0.5 + 0.5, k = s.slK;
      crx += 0.22 * k; cy -= 0.12 * k; sy *= 1 + 0.04 * z * k; sxz *= 1 + 0.03 * z * k; rz += 0.06 * k;
      s.eyeK = lerp(s.eyeK, 0.06, k); s.mouthO = Math.max(s.mouthO, 0.4 * z * k); aL = lerp(aL, 0.1, k); aR = lerp(aR, -0.1, k);
    }
    switch (ph) {
      case 'roar': {   // uyanış: gerinir, esner, şapkası havalanır, kollar havaya
        const k = sm(t / 0.25) * (1 - sm((t - 0.85) / 0.15));
        sy *= 1 + 0.1 * k; sxz *= 1 - 0.04 * k; cy += 0.35 * k; cry += 0.6 * Math.sin(t * PI * 2) * k; aL = 0.25 + 2.2 * k; aR = -0.25 - 2.2 * k;
        s.mouthO = k; s.eyeK = 1 - 0.7 * bumpU(t, 0.2, 0.6); rx -= 0.12 * k;
        break;
      }
      case 'hapsu': {   // derin nefes (0–0,45: geriye yaslanır, şapka kabarır, gözler kısılır), "HAPŞU!" (0,45–0,6), sonra burnunu siler
        const inh = sm(t / 0.42) * (1 - sm((t - 0.44) / 0.04)), sn = bumpU(t, 0.44, 0.62), wipe = bumpU(t, 0.65, 0.95);
        rx += -0.22 * inh + 0.35 * sn; sy *= 1 + 0.08 * inh - 0.1 * sn; cs = 1 + 0.1 * inh; cy += 0.15 * inh - 0.1 * sn; crx += -0.15 * inh + 0.25 * sn;
        s.eyeK = 1 - 0.8 * Math.max(inh * 0.7, sn); s.mouthO = Math.max(0.6 * inh, sn); aL = 0.25 + 0.9 * inh; aR = -0.25 - 0.9 * inh;
        aRx = -1.2 * wipe; aR -= 0.8 * wipe;
        break;
      }
      case 'zipla': case 'uclu': {   // çömel → havada (b.y'yi BOSSDAV verir) → "pof" iniş; şapka gecikmeli yaylanır
        const air = clamp(+st.air || 0, 0, 1), land = st.land || 0;
        if (air <= 0 && land <= 0) { const k = bumpU(t, 0, ph === 'uclu' ? 0.12 : 0.22); sy *= 1 - 0.18 * k; sxz *= 1 + 0.1 * k; cy -= 0.1 * k; }
        if (air > 0) { const e = Math.sin(PI * air); sy *= 1 + 0.08 * e; sxz *= 1 - 0.04 * e; cy += 0.25 * e; aL = 0.4 + 1.6 * e; aR = -0.4 - 1.6 * e; fl = e; s.eyeK = 1 + 0.25 * e; s.mouthW = e; }
        if (land > 0) { sy *= 1 - 0.25 * land; sxz *= 1 + 0.15 * land; cy -= 0.2 * land; cs = 1 + 0.06 * land; }
        break;
      }
      case 'halka': {   // dönerek etrafa spor halkası hapşırır (kollar açık, şapka fırıl fırıl)
        const k = sm(t / 0.15) * (1 - sm((t - 0.85) / 0.15));
        cry += TAU * 2 * sm(t); aL = 0.25 + 1.3 * k; aR = -0.25 - 1.3 * k; s.mouthO = 0.6 * k + 0.4 * bumpU(t, 0.3, 0.45) + 0.4 * bumpU(t, 0.55, 0.7);
        sy *= 1 + 0.05 * Math.sin(t * PI * 8) * k; s.eyeK = 1 - 0.5 * k;
        break;
      }
      case 'summon': {   // şapkasını sallayıp mantarcıkları çağırır
        const k = sm(t / 0.2) * (1 - sm((t - 0.85) / 0.15));
        crz += Math.sin(s.t * 18) * 0.12 * k; cy += 0.1 * k; aL = 0.25 + 1.8 * k + 0.3 * Math.sin(s.t * 12) * k; aR = -0.25 - 1.8 * k - 0.3 * Math.sin(s.t * 12 + 1) * k;
        s.mouthW = k; y += Math.abs(Math.sin(s.t * 10)) * 0.08 * k;
        break;
      }
      case 'sasir': {   // aşama geçişi: şapka "pof!" diye fırlar, havada döner, geri oturur; kocaman gözler
        const up = bumpU(t, 0.05, 0.75);
        cy += 1.6 * up; cry += TAU * 2 * sm((t - 0.05) / 0.7); crx += 0.2 * up;
        s.eyeK = 1 + 0.4 * up; s.mouthO = up; aL = 0.3 + 2.4 * up; aR = -0.3 - 2.4 * up; y += 0.12 * bumpU(t, 0, 0.2);
        const land = bumpU(t, 0.72, 0.9); sy *= 1 - 0.15 * land; sxz *= 1 + 0.08 * land;
        break;
      }
      case 'dying': {   // neşelendi (~6,5 s; motorun veda dönüşü yerine kendi sahnesi: s.giving):
        // şapkası havaya fırlayıp geri konar → mantarcıklarla zıplama dansı → kocaman esneme → uyur → parıltıya dönüşür
        s.giving = true;
        const u = st.dying;
        const up = bumpU(u, 0.0, 0.17); cy += 1.5 * up; cry += TAU * 2 * sm(u / 0.17); crx += 0.25 * up;
        const land = bumpU(u, 0.15, 0.23); sy *= 1 - 0.16 * land; sxz *= 1 + 0.09 * land; s.eyeK = 1 + 0.3 * up;
        const dn = sm((u - 0.21) / 0.05) * (1 - sm((u - 0.57) / 0.05));
        y += Math.abs(Math.sin(s.t * 7)) * 0.32 * dn; rz += Math.sin(s.t * 3.5) * 0.12 * dn; ry += Math.sin(s.t * 1.8) * 0.45 * dn; crz += Math.sin(s.t * 7) * 0.1 * dn;
        aL = 0.4 + (1.7 + 0.5 * Math.sin(s.t * 7)) * dn; aR = -0.4 - (1.7 + 0.5 * Math.sin(s.t * 7 + 1.5)) * dn; s.mouthW = 1;
        B.footL.position.y += Math.max(0, Math.sin(s.t * 7)) * 0.15 * dn; B.footR.position.y += Math.max(0, -Math.sin(s.t * 7)) * 0.15 * dn;
        const yawn = bumpU(u, 0.6, 0.78); s.mouthO = yawn; aL += 1.6 * yawn; aR -= 1.6 * yawn; sy *= 1 + 0.08 * yawn; rx -= 0.1 * yawn;
        const sl = sm((u - 0.74) / 0.08);
        crx += 0.42 * sl; cy -= 0.14 * sl; s.eyeK = lerp(s.eyeK, 0.05, sl); rz += 0.07 * sl; sy *= 1 + 0.035 * Math.sin(s.t * 1.8) * sl;
        aL = lerp(aL, 0.1, sl); aR = lerp(aR, -0.1, sl); s.mouthW *= 1 - 0.6 * sl;
        const out = sm((u - 0.9) / 0.1);
        if (B.root) B.root.scale.setScalar(Math.max(0.0001, 1 - out));
        break;
      }
      default: break;
    }
    // bekleme: ara sıra burnu kaşınır, minik hapşırık
    if (ph === 'idle' && !sleep && !(st.move > 0.05)) {
      s.idT = (s.idT ?? frand(3, 6)) - dt;
      if (s.idT < 0) { const u = -s.idT / 1.6; if (u >= 1) s.idT = frand(4, 8); else { const sn = bumpU(u, 0.55, 0.75), inh = bumpU(u, 0, 0.55); rx += -0.1 * inh + 0.18 * sn; s.eyeK = 1 - 0.7 * Math.max(inh * 0.6, sn); cy += 0.12 * sn; } }
    }
    b.position.y += y; b.rotation.x += rx; b.rotation.z += rz; b.rotation.y += ry; b.scale.set(sxz, sy, sxz);
    c.position.y += cy; c.rotation.x += crx; c.rotation.z += crz; c.rotation.y += cry; c.scale.setScalar(cs);
    B.sprout.rotation.z = Math.sin(s.t * 2.3) * 0.15 + 0.4 * fl;
    B.armL.rotation.z = aL; B.armR.rotation.z = aR; B.armL.rotation.x = aLx; B.armR.rotation.x = aRx;
    boing(s, st, dt, b, 0.5);
  }

  // ════════════════ Kayıt ════════════════
  const RARE_STATS = { hp: 14, dmg: 2, speed: 3.0, xp: 30, gold: 12, aggro: 7 };
  const T = [
    // id, ad, base, saldiri, stats, kurucu, anim, lod, varyantlar, nadir
    ['zipMantarcik', 'Zıp Mantarcık', 'yogurt', 'ziplayan', { eliteAd: 'Kocaman Zıp Mantarcık', hp: 20, dmg: 4, speed: 2.5, r: 0.45, height: 0.86, atkRange: 2.4, atkCd: 2.1, windup: 0.85, aggro: 8.5 }, buildZip, animZip, 0.55, ['mor', 'turkuaz', 'pembe']],
    ['sporPofudugu', 'Spor Pofuduğu', 'mantar', 'uzak', { eliteAd: 'Kocaman Spor Pofuduğu', hp: 18, dmg: 1, speed: 1.8, r: 0.45, height: 0.82, atkRange: 6.0, range: 6.0, atkCd: 3.2, windup: 1.0, aggro: 8.5, shot: { kind: 'spore', speed: 3.2, r: 0.32, col: SPOR_COL } }, buildSpor, animSpor, 0.55],
    ['tohumTopaci', 'Tohum Topacı', 'goblin', 'yuvarlanan', { eliteAd: 'Kocaman Tohum Topacı', hp: 22, dmg: 4, speed: 2.4, r: 0.42, height: 0.78, atkRange: 2.4, atkCd: 2.4, windup: 0.95, aggro: 9, trailCol: '#ffd28a' }, buildTohum, animTohum, 0.55],
    ['yosunTopu', 'Yosun Topu', 'kostebek', 'kazici', { eliteAd: 'Kocaman Yosun Topu', hp: 22, dmg: 4, speed: 2.8, r: 0.44, height: 0.86, atkRange: 1.2, atkCd: 2.0, windup: 0.85, aggro: 8.5 }, buildYosun, animYosun, 0.55],
    ['altinMantarcik', 'Altın Mantarcık', 'yogurt', 'ziplayan', Object.assign({ r: 0.45, height: 0.86, atkRange: 2.4, atkCd: 2.4, windup: 0.95 }, RARE_STATS), (r, o) => buildZip(r, Object.assign({}, o, { rare: true })), animZip, 0.55, null, true],
  ];
  const RARE = {};
  for (const [id, ad, base, saldiri, stats, mk, an, lod, variants, rare] of T) {
    const def = { ad, base, saldiri, stats, ilkSoz: 'pr_ilk_' + id };
    if (rare) def.nadir = true;
    if (HAS) {
      EMODEL.addType(id, mk, an, lod, variants || undefined);
      def.model = o => EMODEL.buildRaw(id, o || {});
    }
    if (rare) RARE[id] = true;
    HUYSUZ.type(id, def);
  }
  const bdef = { ad: 'Koca Pofuduk Mantar', base: 'kraljole', stats: { r: 1.6, height: 3.6 },
    lines: { giris: 'pr_kocaPofudukMantar_giris', bitti: 'pr_kocaPofudukMantar_bitti', yarim: 'pr_kocaPofudukMantar_yarim' },
    bossKit: { own: true, add: 'zipMantarcik', at: [0.6, 0.3], n: [2, 2], col: '#ff9fe0', roar: 2.0, addDmg: 0.7 } };
  if (HAS) { EMODEL.addType('kocaPofudukMantar', buildKoca, animKoca, 0.8); bdef.model = o => EMODEL.buildRaw('kocaPofudukMantar', o || {}); }
  HUYSUZ.boss('kocaPofudukMantar', bdef);
  HUYSUZ.zone('mantar', { enemies: { zipMantarcik: 4, sporPofudugu: 2.5, tohumTopaci: 3, yosunTopu: 2.5, altinMantarcik: 0.3 },
    elites: ['zipMantarcik', 'yosunTopu'], variants: { zipMantarcik: ['mavi', 'turkuaz', 'pembe'] }, boss: 'kocaPofudukMantar' });

  // ════════════════ Yumuşak spor bulutları (havuz): Spor Pofuduğu'nun atışı + bossun hapşırığı ════════════════
  // Yere yakın, yarı saydam, yeşil-sarı ışıltılı pofuduk bulut. İçindeyken Feza yavaşlar (P.slowT / P.slowK), canı azalmaz.
  const CL = { list: [], pool: [], geo: null, mat: null, glow: null, warm: false };
  function cloudMesh() {
    if (!CL.geo) {
      const k = new Kit();
      const P0 = [[0, 0.3, 0, 0.62], [0.6, 0.24, 0.25, 0.46], [-0.58, 0.24, -0.2, 0.5], [0.2, 0.36, -0.52, 0.42], [-0.3, 0.22, 0.55, 0.42], [0.55, 0.2, -0.42, 0.36], [-0.66, 0.2, 0.38, 0.34]];
      for (const p of P0) k.add(G.sphere(14, 9), new THREE.Color('#e6ffd0'), [p[0], p[1], p[2]], null, [p[3], p[3] * 0.6, p[3]]);
      CL.geo = k.build(); CL.geo.userData.keep = true;
      CL.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, transparent: true, opacity: 0.34, color: new THREE.Color('#e4ffc4'), emissive: new THREE.Color('#9fe070'), emissiveIntensity: 0.45, depthWrite: false });
      CL.mat.userData.keep = true;
      const g = new Kit();
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; g.add(G.octa(), new THREE.Color(2.2, 2.3, 1.4), [Math.sin(a) * 0.55, 0.55 + 0.15 * Math.sin(i * 2.1), Math.cos(a) * 0.55], [0, a, 0], [0.05, 0.09, 0.05]); }
      CL.glowGeo = g.build(); CL.glowGeo.userData.keep = true;
      CL.glow = new THREE.MeshBasicMaterial({ vertexColors: true }); CL.glow.userData.keep = true;
    }
    const grp = new THREE.Group(); grp.name = 'mantarSporBulutu';
    const a = new THREE.Mesh(CL.geo, CL.mat); a.renderOrder = 3; grp.add(a);
    const b = new THREE.Mesh(CL.glowGeo, CL.glow); grp.add(b); grp.userData.sp = b;
    return grp;
  }
  function cloud(x, z, r, dur, at = 0) {
    if (CL.list.length >= 10) return null;
    const o = CL.pool.pop() || cloudMesh();
    o.visible = false; o.position.set(x, 0, z); o.scale.setScalar(0.001);
    if (typeof scene !== 'undefined' && o.parent !== scene) scene.add(o);
    const c = { o, x, z, r, dur, at, t: 0 };
    CL.list.push(c); return c;
  }
  function clearClouds() { for (const c of CL.list) { c.o.visible = false; if (c.o.parent) c.o.parent.remove(c.o); CL.pool.push(c.o); } CL.list.length = 0; }
  function stepClouds(dt) {
    const P = typeof GAME !== 'undefined' && GAME ? GAME.P : null;
    for (let i = CL.list.length - 1; i >= 0; i--) {
      const c = CL.list[i]; c.t += dt;
      const u = c.t - c.at;
      if (u < 0) continue;
      const k = sm(u / 0.35) * (1 - sm((u - c.dur + 0.6) / 0.6));
      c.o.visible = true; c.o.scale.set(c.r * (0.6 + 0.4 * k) * (1 + 0.04 * Math.sin(u * 3)), c.r * k * 0.5, c.r * (0.6 + 0.4 * k));
      c.o.rotation.y += dt * 0.3; c.o.userData.sp.rotation.y -= dt * 1.4;
      if (P && !P.dead && k > 0.3 && dist2(P.pos.x, P.pos.z, c.x, c.z) < (c.r + 0.2) * (c.r + 0.2)) { P.slowT = Math.max(P.slowT || 0, 0.25); P.slowK = 0.55; }
      if (u >= c.dur) { c.o.visible = false; if (c.o.parent) c.o.parent.remove(c.o); CL.pool.push(c.o); CL.list.splice(i, 1); }
    }
  }
  // Spor Pofuduğu atışları: Feza'ya değince hasar yerine yumuşak bulut (07'nin onHit kancası, atış oradan silinirse hasar olmaz)
  let sporSaid = false;
  function sporHit(p) {
    const arr = GAME.projectiles, i = arr.indexOf(p);
    if (i >= 0) {
      arr.splice(i, 1);
      if (p.obj && p.obj.parent) p.obj.parent.remove(p.obj);
      if (p.obj && p.obj.userData && typeof p.obj.userData.dispose === 'function') { try { p.obj.userData.dispose(); } catch (e) { /* yok */ } }
    }
    const P = GAME.P;
    cloud(P.pos.x, P.pos.z, 1.35, 2.6);
    P.slowT = Math.max(P.slowT || 0, 1.2); P.slowK = 0.55;
    try { FX.burst('sparkle', P.pos.x, 0.9, P.pos.z, { color: '#e6ffc0', count: 5 }); } catch (e) { /* yok */ }
    try { AUD.sfx('bubblePop', { x: P.pos.x, z: P.pos.z, vol: 0.5, pitch: 0.8 }); } catch (e) { /* yok */ }
    if (!sporSaid) { sporSaid = true; try { if (AUD.LINES && AUD.LINES.pr_mantar_spor_yavas) AUD.say('pr_mantar_spor_yavas', { prio: 2 }); } catch (e) { /* yok */ } }
  }
  function tagSpores() {
    if (typeof GAME === 'undefined' || !GAME || !GAME.projectiles) return;
    for (const p of GAME.projectiles) if (p.owner === 'enemy' && !p._mz && p.color === SPOR_COL) { p._mz = 1; p.onHit = sporHit; p.dmg = 0; }
  }

  // ════════════════ Boss hamleleri (BOSSDAV.register) ════════════════
  const rnd = (a, b) => a + Math.random() * (b - a);
  const STAGE_AT = [0.66, 0.33];
  const say = (k, prio = 2) => { const A = BOSSDAV.api; if (A && A.hasLine(k)) A.say(k, prio); };
  function tele(S, x, z, r, dur, c) { const A = BOSSDAV.api, h = A.fx('telegraph', x, z, r, dur, c); if (h) (S.marks || (S.marks = [])).push(h); return h; }
  // QA3: uyarı cümlesi yer işaretiyle AYNI anda — işaret çizildikten hemen sonra, sırayı beklemeden (interrupt) söylenir; her cümle dövüşte bir kez
  function warn(S, key) {
    const A = BOSSDAV.api; if (!key || !A || !A.hasLine(key)) return;
    const said = S.said || (S.said = {}); if (said[key]) return; said[key] = true;
    try { A.say(key, 3, { interrupt: true }); } catch (e) { /* yok */ }
  }
  function clearMarks(S) { const A = BOSSDAV.api; if (S && S.marks) { for (const h of S.marks) try { A.remove(h); } catch (e) { /* yok */ } S.marks.length = 0; } }
  // Feza'nın çevresinde arena içinde serbest noktalar
  function spotsAround(b, cx, cz, n, rmin, rmax, gap) {
    const A = BOSSDAV.api, out = [], rm = A.bossRoom();
    for (let tries = 0; tries < n * 14 && out.length < n; tries++) {
      const a = rnd(0, TAU), r = out.length === 0 && tries < 4 ? 0 : rnd(out.length ? rmin : 0.8, rmax), x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;   // QA3: Feza bossun dibindeyse ilk nokta yanına kayar (yoksa hiç halka çıkmıyordu)
      if (!A.isFloor(x, z) || (rm && !A.inRoom(rm, x, z, 0.6))) continue;
      if (out.some(p => dist2(p.x, p.z, x, z) < gap * gap)) continue;
      if (dist2(x, z, b.x, b.z) < (b.r + 0.8) * (b.r + 0.8)) continue;
      out.push({ x, z });
    }
    return out;
  }
  const faceTo = (b, x, z, k, dt) => { b.face = dampAngle(b.face, Math.atan2(x - b.x, z - b.z), k, dt); };
  // hapşırık: ağızdan noktalara uçan parıltı izi
  function sneezeTrail(A, b, pts) {
    const m = A.muzzle(b);
    for (const p of pts) for (let k = 0; k < 6; k++) {
      const u = k / 6;
      A.emitP(lerp(m.x, p.x, u), lerp(m.y, 0.6, u) + Math.sin(u * PI) * 1.2, lerp(m.z, p.z, u), (p.x - m.x) * 0.6, 1, (p.z - m.z) * 0.6, 0.55, 0.25, 0.08, '#f4ffc8', '#ffffff', 2, 0, 0);
    }
  }
  // zıplama (b.y yay), iniş halkası; o: { at (hazırlık), land (iniş anı), h, r }
  function jumpStep(b, S, t, J, A) {
    const st = b.st;
    if (t < J.c) { st.air = 0; st.land = 0; return; }
    if (t < J.l) {
      const u = (t - J.c) / (J.l - J.c), k = u * u * (3 - 2 * u);
      b.x = J.x0 + (J.x1 - J.x0) * k; b.z = J.z0 + (J.z1 - J.z0) * k; b.y = 4 * J.h * u * (1 - u); st.air = u; st.land = 0;
      if (!J.up) { J.up = 1; A.sfx('bounce', { x: b.x, z: b.z, pitch: 0.55 }); }
      return;
    }
    st.air = 0;
    if (!J.down) {
      J.down = 1; b.y = 0; b.x = J.x1; b.z = J.z1; if (J.mark) { A.remove(J.mark); J.mark = null; }
      if (J.zm && J.zm.on) J.zm.d = Math.min(J.zm.d, J.zm.t + 0.25);   // QA3: inince pembe işaret söner (sonraki zıplamanın halkasıyla çift halka olmasın)
      A.bossRing(b, b.x, b.z, J.r, 0.19, 1.1, '#ffd0f0', { r1: J.r * 0.9, dur: 0.3, width: 0.35 });   // ilk boss: nazik iniş (6 → 4 can); iniş dalgası işaretin içinde kalır (çift halka yok)
      A.burst('sparkle', b.x, 0.4, b.z, { color: '#ffe0f8', count: 13 }); A.burst('dust', b.x, 0.2, b.z, { count: 7, scale: 1.4 });
      A.sfx('slam', { x: b.x, z: b.z, vol: 0.45, pitch: 1.2 }); A.sfx('bounce', { x: b.x, z: b.z, pitch: 0.8 }); A.shake(0.18);
      if (Math.random() < 0.5) sadeFt(A, b.x, b.height + 0.3, b.z, 'Pof!', 'word');
    }
    st.land = Math.max(0, 1 - (t - J.l) / 0.35);
  }
  function newJump(b, S, c, l, h, r, maxD) {
    const A = BOSSDAV.api, sp = A.approachSpot(b, maxD);
    const J = { c, l, h, r, x0: b.x, z0: b.z, x1: sp.x, z1: sp.z, up: 0, down: 0 };
    J.mark = A.fx('telegraph', sp.x, sp.z, r, l, '#ff5fb8'); J.zm = zoneMark(sp.x, sp.z, r, '#ff5fb8', l + 0.4);   // ses: "pembe halka"
    if (J.mark) (S.marks || (S.marks = [])).push(J.mark);
    return J;
  }
  const MOVES = {
    // Hapşu! Derin nefes (yerde yeşil-sarı halkalar ~1,5 s), sonra parıltılı spor bulutları iner (az hasar + yavaşlatan bulut).
    hapsu(b, S, dt) {
      const A = BOSSDAV.api, t = b.stT, AT = S.stage === 1 ? 1.6 : 1.4;
      faceTo(b, A.P.pos.x, A.P.pos.z, 3, dt);
      if (b.did === 0) {
        b.did = 1; const n = S.stage === 1 ? 3 : 4;
        S.pts = spotsAround(b, A.P.pos.x, A.P.pos.z, n, 2.4, 4.2, 2.6);
        for (const p of S.pts) { tele(S, p.x, p.z, 1.5, AT, '#8fe84a'); p.zm = zoneMark(p.x, p.z, 1.5, '#7ee03a', AT); }   // SADE: ses "yeşil halkalar" diyor → yeşil
        warn(S, 'pr_ipucu_hapsu');   // ("Hapşıracak! Yerdeki yeşil halkalardan uzaklaş." — halkalar yerde, aynı anda)
        sadeFt(A, b.x, b.height + 0.5, b.z, 'Haaa…', 'word'); A.sfx('sigh', { x: b.x, z: b.z, pitch: 0.7, vol: 0.7 });
      }
      if (b.did === 1 && t > 0.2 && t < AT && (S.inT = (S.inT || 0) - dt) <= 0) {   // içe çekilen parıltılar
        S.inT = 0.08; const m = A.muzzle(b), a = rnd(0, TAU), r = rnd(1.5, 3);
        A.emitP(m.x + Math.sin(a) * r, m.y + rnd(-0.5, 0.8), m.z + Math.cos(a) * r, -Math.sin(a) * r * 1.6, 0, -Math.cos(a) * r * 1.6, 0.6, 0.18, 0.05, '#f4ffc8', '#ffffff', 2, 0, 0);
      }
      if (b.did === 1 && t >= AT) {
        b.did = 2; sadeFt(A, b.x, b.height + 0.6, b.z, 'HAPŞUUU!', 'word'); A.sfx('whoosh', { x: b.x, z: b.z, pitch: 0.7 }); A.sfx('bubblePop', { x: b.x, z: b.z, pitch: 0.6 }); A.shake(0.2);
        sneezeTrail(A, b, S.pts);
        for (const p of S.pts) { A.bossRing(b, p.x, p.z, 1.5, 0.22, 0.6, '#eaffc0'); A.burst('sparkle', p.x, 0.6, p.z, { color: '#eaffb0', count: 7 }); cloud(p.x, p.z, 1.45, 3.4); if (p.zm && p.zm.on) p.zm.d = Math.min(p.zm.d, p.zm.t + 0.3); }   // QA3: hapşırınca yeşil işaret söner
      }
      if (t >= b.phD) { S.n++; A.bossEnd(b, 1.4, 1.3); }
    },
    // Şapkasıyla zıplar: Feza'nın yanındaki pembe halkaya (1,4 s önce belli) "pof!" diye iner.
    zipla(b, S, dt) {
      const A = BOSSDAV.api, t = b.stT;
      if (b.did === 0) { b.did = 1; S.J = newJump(b, S, 0.45, 1.6, 2.6, 2.6, 7.5); warn(S, 'pr_ipucu_zipla'); sadeFt(A, b.x, b.height + 0.4, b.z, 'Hop hop!', 'word'); }
      if (t < 0.45) faceTo(b, S.J.x1, S.J.z1, 6, dt);
      jumpStep(b, S, t, S.J, A);
      if (t >= b.phD) { b.y = 0; b.st.air = 0; b.st.land = 0; S.n++; A.bossEnd(b, 1.5, 1.3); }
    },
    // Dönerek spor halkası: önce yakın halka, sonra uzak halka; aralarında ve halkalardaki boşlukta güvenli yer var.
    halka(b, S, dt) {
      const A = BOSSDAV.api, t = b.stT;
      if (b.did === 0) {
        b.did = 1; sadeFt(A, b.x, b.height + 0.5, b.z, 'Spor halkası!', 'word'); A.sfx('whoosh', { x: b.x, z: b.z, pitch: 1.1 });
        const a0 = rnd(0, TAU); S.ring = []; S.ringHit = false;
        for (const [R, n, at] of [[b.r + 1.6, 6, 1.4], [b.r + 4.3, 10, 2.3]]) {
          const gap = Math.floor(rnd(0, n));   // bir boşluk: oradan kaç!
          for (let i = 0; i < n; i++) {
            if (i === gap || (n > 8 && i === (gap + 1) % n)) continue;
            const a = a0 + i / n * TAU, x = b.x + Math.sin(a) * R, z = b.z + Math.cos(a) * R;
            if (!A.isFloor(x, z)) continue;
            // spor halkası: yeşil spor (hapşırıkla aynı). Kendi yer işareti: yeşil yarı saydam dolgu + kalın kenar, patlayana dek (≥ 2,2 s)
            tele(S, x, z, 1.05, at, '#8fe84a'); const m = zoneMark(x, z, 1.05, '#7ee03a', at + 0.35, 0.26);
            S.ring.push({ x, z, at, done: false, m });   // (önceden yorumun içinde kalmıştı: halka patlamıyordu)
          }
        }
        warn(S, S.stageLine || 'pr_ipucu_halka'); S.stageLine = null;   // ("…spor halkası yapacak, boşluktan kaç!" — halkalar yerde, aynı anda)
      }
      for (const p of S.ring || []) if (!p.done && t >= p.at) {
        p.done = true;
        // ilk boss: çok nazik — diğer hamlelerin yarısı kadar hasar ve saldırı başına en çok bir kez; işaret patlamayla 0,3 sn içinde söner
        const inR = Math.hypot(A.P.pos.x - p.x, A.P.pos.z - p.z) < 1.3;
        if (inR && !S.ringHit) { S.ringHit = true; A.bossRing(b, p.x, p.z, 1.05, 0.11, 0.4, '#eaffc0'); }
        else A.fx('ring', p.x, p.z, { r0: 0.6, r1: 1.65, dur: 0.5, color: '#eaffc0', width: 0.6 });
        if (p.m && p.m.on) p.m.d = Math.min(p.m.d, p.m.t + 0.3);
        A.burst('sparkle', p.x, 0.5, p.z, { color: '#eaffb0', count: 4 });
        if (Math.random() < 0.35) cloud(p.x, p.z, 1.1, 2.4);
      }
      if (b.did === 1 && t > 1.38) { b.did = 2; A.sfx('bubblePop', { x: b.x, z: b.z, pitch: 0.7 }); sadeFt(A, b.x, b.height + 0.5, b.z, 'Hapşu!', 'word'); }
      if (b.did === 2 && t > 2.28) { b.did = 3; A.sfx('bubblePop', { x: b.x, z: b.z, pitch: 0.9 }); }
      if (t >= b.phD) { S.n++; A.bossEnd(b, 1.4, 1.2); }
    },
    // Üç zıplama art arda (3. aşama): her inişin halkası önceden belli, sonuncusunda yorulur.
    uclu(b, S, dt) {
      const A = BOSSDAV.api, t = b.stT, D = 1.45, k = Math.min(2, Math.floor(t / D)), tl = t - k * D;
      if (b.did <= k && k < 3) { b.did = k + 1; S.J = newJump(b, S, 0.25, 1.15, 2.0, 2.2, 6.0); if (k === 0) { warn(S, S.stageLine || 'pr_ipucu_uclu'); S.stageLine = null; sadeFt(A, b.x, b.height + 0.4, b.z, 'Hop! Hop! Hop!', 'word'); } }
      if (S.J) jumpStep(b, S, tl, S.J, A);
      if (t >= b.phD) { b.y = 0; b.st.air = 0; b.st.land = 0; S.n += 2; A.bossEnd(b, 1.6, 1.4); }
    },
    // Uyuklama: vurma fırsatı (hasar × 1,5), Zzz baloncukları.
    uyku(b, S, dt) {
      const A = BOSSDAV.api, t = b.stT;
      if (b.did === 0) { b.did = 1; S.n = 0; sadeFt(A, b.x, b.height + 0.4, b.z, 'Uykum geldi…', 'word'); A.sfx('sigh', { x: b.x, z: b.z, pitch: 0.6 }); say(S.napN++ % 2 ? 'pr_kocaPofudukMantar_uyku2' : 'pr_kocaPofudukMantar_uyku', 2); }
      faceTo(b, A.P.pos.x, A.P.pos.z, 1.5, dt);
      if ((S.zT = (S.zT || 0) - dt) <= 0) { S.zT = 0.9; A.burst('zzz', b.x + Math.sin(b.face) * b.r * 0.6, b.height * 0.75, b.z + Math.cos(b.face) * b.r * 0.6, {}); A.sfx('sigh', { x: b.x, z: b.z, pitch: 0.5 + 0.1 * Math.sin(t), vol: 0.4 }); }
      if (t >= b.phD) { sadeFt(A, b.x, b.height + 0.4, b.z, 'Hı? Uyumuyordum!', 'word'); A.bossEnd(b, 1.2, 1.0); }
    },
    // Aşama geçişi: şapka "pof!" diye fırlar ve döner (bu sırada vurulmaz), konfeti gibi parıltı.
    sasir(b, S, dt) {
      const A = BOSSDAV.api, t = b.stT;
      if (b.did === 0) {
        b.did = 1; S.stage = S.pending; S.pending = 0; clearMarks(S);
        sadeFt(A, b.x, b.height + 0.7, b.z, S.stage === 2 ? 'Şapkam uçtu!' : 'Pofff, gıdıklandım!', 'word');
        A.sfx('bonk', { x: b.x, z: b.z }); A.sfx('bounce', { x: b.x, z: b.z, pitch: 1.3 }); A.shake(0.22);
        A.burst('star', b.x, b.height + 0.3, b.z, { count: 5, color: '#fff3a0' }); A.burst('sparkle', b.x, b.height, b.z, { color: '#ffd0f4', count: 15 });
        // QA3: aşama cümlesi bir sonraki hamleyi anlatıyor → o hamlenin işaretleri çizilince söylenir (warn); burada değil
        S.stageLine = S.stage === 2 ? 'pr_kocaPofudukMantar_asama2' : 'pr_kocaPofudukMantar_asama3'; S.forceNext = S.stage === 2 ? 'halka' : 'uclu';
      }
      if (b.did === 1 && t > 1.6) { b.did = 2; A.burst('sparkle', b.x, b.height * 0.9, b.z, { color: '#ffe27a', count: 10 }); A.sfx('bubblePop', { x: b.x, z: b.z, pitch: 1.2 }); }
      if (t >= b.phD) A.bossEnd(b, 1.1, 0.8);
    },
  };
  if (typeof BOSSDAV !== 'undefined' && BOSSDAV && BOSSDAV.register) {
    BOSSDAV.register('kocaPofudukMantar', {
      hpK: 2.4, keep: 5.2, roarD: 2.0,
      isaretKendi: true,   // bütün hamleler kendi yer işaretini çiziyor (hapşırık, zıplama, üçlü zıplama, spor halkası) → motor halkası gizli
      choose(b, S, d) {
        const A = BOSSDAV.api;
        S.stage = S.stage || 1; S.napN = S.napN || 0; S.n = S.n || 0;
        if (S.pending && S.pending !== S.stage) { A.bossPhase(b, 'sasir', 2.4); return; }
        // SADE4: aşama cümlesi bir sonraki hamleyi anlatıyor ("spor halkası" / "üç kere zıplayacak, pembe halkalar") → o hamle hemen gelsin
        if (S.forceNext) { const f = S.forceNext; S.forceNext = null; A.bossPhase(b, f, { halka: 3.3, uclu: 4.4 }[f]); return; }
        if (S.n >= (S.stage === 3 ? 4 : 5)) { A.bossPhase(b, 'uyku', S.stage === 1 ? 4.4 : 3.8); return; }
        let opts;
        if (S.stage === 1) opts = [['hapsu', 0.5], ['zipla', 0.5]];
        else if (S.stage === 2) opts = [['hapsu', 0.3], ['zipla', 0.3], ['halka', 0.4]];
        else opts = [['uclu', 0.45], ['halka', 0.3], ['hapsu', 0.25]];
        const ph = A.pickPhase(b, opts);
        A.bossPhase(b, ph, { hapsu: 3.4, zipla: 2.2, halka: 3.3, uclu: 4.4 }[ph]);
      },
      moves: MOVES,
      hints: {},   // QA3: ipucu cümleleri hamlenin içinde, işaretle aynı anda (warn); 05c'nin sıraya koyduğu geç ipucu yok
      hit(b, amount, o, S) {
        if (b.ph === 'sasir') return 0;
        if (b.ph === 'uyku') amount = Math.round(amount * 1.5);
        S.stage = S.stage || 1;
        const left = (b.hp - amount) / b.maxHp;
        for (let i = 0; i < 2; i++) {
          if (S.stage === i + 1 && !S.pending && left <= STAGE_AT[i]) { S.pending = i + 2; return Math.max(0, b.hp - Math.round(b.maxHp * STAGE_AT[i])); }
        }
        if (S.pending) return 0;   // (aşama geçişi bekleniyor: hamle bitince şaşırır)
        return amount;
      },
      update(dt) { stepClouds(dt); tagSpores(); zoneTick(dt); },
    });
  }

  // ════════════════ Olaylar ════════════════
  let saidRare = 0;
  function hook() {
    if (typeof GAME === 'undefined' || !GAME || !GAME.on) { setTimeout(hook, 250); return; }
    GAME.on('zone', () => { clearClouds(); sporSaid = false; });
    GAME.on('happy', e => {
      if (e && e.boss && e.type === 'kocaPofudukMantar') { const b = GAME.boss; if (b && b.type === e.type) b.dieDur = 6.5; return; }   // (uyku sahnesi için daha uzun veda)
      if (!e || e.boss) return;
      if (e.type === 'sporPofudugu' || e.type === 'yosunTopu') { try { FX.burst('sparkle', e.x, 0.8, e.z, { color: e.type === 'yosunTopu' ? '#c8ff8a' : '#f0e0ff', count: 6 }); } catch (err) { /* yok */ } }
      if (!RARE[e.type]) return;
      try {
        const P = GAME.P;
        if (P && P.cikartmalar && P.cikartmalar[e.type]) P.cikartmalar[e.type].tur = 'gizli';
        if (GAME.addGoldSugar) GAME.addGoldSugar(1);
        if (typeof FX !== 'undefined' && FX) {
          if (FX.burst) { FX.burst('confetti', e.x, 1.0, e.z, { scale: 1.4 }); FX.burst('sparkle', e.x, 1.2, e.z, { color: '#ffd84a', count: 10 }); }
          if (FX.floatText) FX.floatText(e.x, 1.9, e.z, '+1 altın şeker', 'word');
        }
        if (typeof AUD !== 'undefined' && AUD && AUD.say && AUD.LINES && AUD.LINES.pr_mantar_nadir) AUD.say('pr_mantar_nadir', { prio: 2 });
        void saidRare;
      } catch (err) { console.warn('[mantar] nadir', err); }
    });
  }
  hook();
  return { cloud, clearClouds, SPOR_COL };
})();
