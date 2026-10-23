/* ── Dev Ev bosslarının hamleleri (BOSSDAV) ──
   Dört boss (src/05b_bosslar.js modelleri) kendi hamle düzeniyle oynar: 07_game başlarken BOSSDAV.install(api) çağırır ve
   BOSS_AI[tip] = BOSSDAV.step olur; bossKit.own → 07'nin eski RAID hamleleri bunlara uğramaz. Her saldırı ≥ ~1 s önceden büyük,
   renkli bir yer işaretiyle belli; yavaş, kaçması eğlenceli; hasar düşük (5 yaş). Kanca noktaları (07_game):
     BOSSDAV.step(b, dt, d, ux, uz)  boss aşaması (b.ph / b.stT / b.phD / b.did, 07'nin bossPhase/bossEnd/bossIdle'ı)
     BOSSDAV.update(dt)              her oyun karesi: düşen şeyler, yuvarlanan top, dönen krema, buhar bulutları, kutlama
     BOSSDAV.hit(b, miktar, o) → miktar   uykuda daha çok, pastanın aşama geçişinde 0, son anda yalnız Takım Hamlesi
   Model sözleşmesi: st.phase (07 b.ph'den), st.phaseT, st.air; ek alanlar st.lid (tencere kapağı: {k, x, y, z} yerel),
   st.scoopOff (dondurma topu), st.melt (0..1 erime), st.slots (pasta: yanan malzeme yuvası sayısı), st.stage, st.sleep. */
const BOSSDAV = (() => {
  'use strict';
  let A = null;                 // 07_game'in verdiği araçlar (install)
  const TAU2 = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sq = x => x * x;
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const say = (k, prio = 2) => { if (A && A.hasLine(k)) A.say(k, prio); };
  const sayOne = (S, keys, prio = 2) => { const k = keys[(S.lineN = (S.lineN || 0) + 1) % keys.length]; say(k, prio); };
  const heroR = () => (A && A.T && A.T.heroR) || 0.35;
  const dmgOf = (b, k) => b.dmg * k * (A.hard ? 1.25 : 1);

  // ════════ Sahne eşyaları (havuz; her biri tek ağ ya da küçük grup, paylaşılan geometri/malzeme) ════════
  const PM = {}, PG = {};
  const mat = (key, o) => PM[key] || (PM[key] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.45, metalness: 0 }, o)));
  const geo = (key, make) => PG[key] || (PG[key] = make());
  function strawGeo() {
    return geo('straw', () => {
      const pts = [[0, 0], [0.12, 0.012], [0.3, 0.12], [0.42, 0.32], [0.46, 0.52], [0.42, 0.7], [0.3, 0.84], [0, 0.9]].map(p => new THREE.Vector2(p[0], p[1]));
      const g = new THREE.LatheGeometry(new THREE.SplineCurve(pts).getPoints(20), 18); g.translate(0, -0.45, 0); return g;
    });
  }
  function mkProp(kind) {
    const g = new THREE.Group(); g.name = 'bossProp_' + kind;
    const add = (gm, m, p, s, r) => { const o = new THREE.Mesh(gm, m); if (p) o.position.set(p[0], p[1], p[2]); if (s !== undefined) { if (typeof s === 'number') o.scale.setScalar(s); else o.scale.set(s[0], s[1], s[2]); } if (r) o.rotation.set(r[0], r[1], r[2]); o.castShadow = true; g.add(o); return o; };
    const sph = geo('sph', () => new THREE.SphereGeometry(1, 18, 12));
    switch (kind) {
      case 'mercimek': add(sph, mat('mercimek', { color: '#ff8a3c', roughness: 0.5, emissive: '#ff5a10', emissiveIntensity: 0.15 }), null, [0.2, 0.09, 0.2]); break;
      case 'nohut': add(sph, mat('nohut', { color: '#f0cf8e', roughness: 0.6 }), null, 0.2); add(sph, mat('nohut'), [0.08, 0.12, 0.05], 0.07); break;
      case 'cilek': {
        add(strawGeo(), mat('cilek', { color: '#ff3d5e', roughness: 0.3, emissive: '#ff1040', emissiveIntensity: 0.12 }), [0, 0, 0], 0.62, [Math.PI, 0, 0]);
        const leaf = mat('yaprak', { color: '#3fbf4a', roughness: 0.5 });
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU2; add(sph, leaf, [Math.sin(a) * 0.12, 0.3, Math.cos(a) * 0.12], [0.06, 0.025, 0.15], [0.3, a, 0]); }
        break;
      }
      case 'kartopu': add(geo('ico2', () => new THREE.IcosahedronGeometry(1, 3)), mat('kar', { color: '#f4fbff', roughness: 0.75, emissive: '#bfe6ff', emissiveIntensity: 0.25 }), null, 0.38); break;
      case 'krema': {
        const m = mat('krema', { color: '#fff4f8', roughness: 0.35, emissive: '#ffd6e6', emissiveIntensity: 0.12 });
        add(sph, m, [0, 0, 0], [0.42, 0.22, 0.42]); add(sph, m, [0, 0.18, 0], [0.3, 0.18, 0.3]); add(geo('cone', () => new THREE.ConeGeometry(1, 1, 16)), m, [0, 0.38, 0], [0.18, 0.28, 0.18]);
        add(sph, mat('krema_c', { color: '#ff4f7a', roughness: 0.25 }), [0, 0.56, 0], 0.08);
        break;
      }
      case 'top': {   // dondurma kralının yuvarlanan topu (çilekli, renkli şekerli) — tek birleşik örgü (tek çizim)
        const g2 = geo('topK', () => {
          const k = new Kit(), cs = ['#ffe14a', '#5fd3ff', '#7ce07a', '#ffffff', '#c58bff'];
          k.add(new THREE.IcosahedronGeometry(1, 4), '#ffb3cf', null, null, 0.75);
          for (let i = 0; i < 30; i++) { const u = (i / 30) * 2 - 1 + 0.03, a = i * 2.39996, s = Math.sqrt(Math.max(0, 1 - u * u)); k.add(G.sphere(6, 4), cs[i % 5], [s * Math.cos(a) * 0.75, u * 0.75, s * Math.sin(a) * 0.75], [i, a, 0], [0.025, 0.065, 0.025]); }
          return k.build();
        });
        add(g2, mat('topK', { vertexColors: true, roughness: 0.55, emissive: '#ff6a9a', emissiveIntensity: 0.06 }), null, 1);
        break;
      }
      case 'buhar': case 'toz': {   // yumuşak bulut (buhar: beyaz-mavi, toz: bej-lila)
        // (yere yakın, yarı saydam yumuşak puflar: kameradan bakınca Feza'yı örtmez)
        const m = mat(kind, kind === 'buhar' ? { color: '#d6ecff', roughness: 1, transparent: true, opacity: 0.52, emissive: '#8fc4ff', emissiveIntensity: 0.1, depthWrite: false }
          : { color: '#b9a99c', roughness: 1, transparent: true, opacity: 0.45, emissive: '#8f7fb0', emissiveIntensity: 0.05, depthWrite: false });
        const P0 = [[0, 0.22, 0, 0.6], [0.62, 0.18, 0.25, 0.45], [-0.58, 0.18, -0.2, 0.5], [0.2, 0.3, -0.5, 0.42], [-0.3, 0.16, 0.55, 0.42], [0.55, 0.15, -0.45, 0.36], [-0.65, 0.14, 0.4, 0.34]];
        for (const p of P0) { const o = add(sph, m, [p[0], p[1], p[2]], [p[3], p[3] * 0.55, p[3]]); o.castShadow = false; o.renderOrder = 3; }
        break;
      }
      case 'dalga': {   // dönen krema dalgası: uzun, yumuşak krema rulosu (+z boyunca 1 m; scale.z = boy)
        const m = mat('dalga', { color: '#fff1f6', roughness: 0.3, emissive: '#ffc2d8', emissiveIntensity: 0.18 });
        const o = add(geo('cap', () => { const c = new THREE.CapsuleGeometry(0.45, 1, 6, 16); c.rotateX(Math.PI / 2); return c; }), m, [0, 0.42, 0.5], [1, 1, 1]); o.userData.body = 1;
        for (let i = 0; i < 6; i++) add(sph, mat('dalga_p', { color: '#ff9ec2', roughness: 0.35 }), [Math.sin(i * 2) * 0.25, 0.85, (i + 0.5) / 6], [0.12, 0.09, 0.06]);
        break;
      }
      case 'buz': {   // buz kaydırağı izi (yere serili, yarı saydam)
        const m = mat('buz', { color: '#c8f0ff', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32, emissive: '#9ad8ff', emissiveIntensity: 0.1, depthWrite: false });
        const o = add(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), m, [0, 0.03, 0.5], [1, 0.05, 1]); o.castShadow = false; o.receiveShadow = true;
        break;
      }
      case 'gol': {   // eriyen dondurmanın nane yeşili birikintisi (yere serili, parlak)
        const o = add(geo('disc', () => new THREE.CylinderGeometry(1, 1, 0.04, 32)), mat('gol', { color: '#9ef0cc', roughness: 0.1, transparent: true, opacity: 0.75, emissive: '#5ccfa0', emissiveIntensity: 0.12, depthWrite: false }), [0, 0.03, 0], 1);
        o.castShadow = false; o.receiveShadow = true;
        for (let i = 0; i < 4; i++) { const a = i * 1.7; const d = add(geo('disc'), mat('gol'), [Math.sin(a) * 0.95, 0.031, Math.cos(a) * 0.95], [0.32, 1, 0.26]); d.castShadow = false; }
        break;
      }
      case 'un': {   // malzeme: un çuvalı
        const m = mat('un', { color: '#f6efe2', roughness: 0.8 });
        add(sph, m, [0, 0.45, 0], [0.42, 0.5, 0.34]); add(geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 16)), m, [0, 0.98, 0], [0.16, 0.18, 0.13]);
        add(geo('tor', () => new THREE.TorusGeometry(1, 0.25, 8, 20)), mat('ip', { color: '#c98f52' }), [0, 0.9, 0], [0.18, 0.18, 0.18], [Math.PI / 2, 0, 0]);
        add(sph, mat('unY', { color: '#ff7aa8', emissive: '#ff4f93', emissiveIntensity: 0.4 }), [0, 0.5, 0.33], [0.13, 0.13, 0.03]);
        break;
      }
      case 'yumurta': add(sph, mat('yum', { color: '#fff4dc', roughness: 0.35, emissive: '#ffe9b8', emissiveIntensity: 0.15 }), [0, 0.5, 0], [0.36, 0.5, 0.36]); break;
      case 'kremaKase': {
        add(geo('kase', () => new THREE.SphereGeometry(1, 24, 12, 0, TAU2, Math.PI / 2, Math.PI / 2)), mat('kase', { color: '#7fc8ff', roughness: 0.25, side: THREE.DoubleSide }), [0, 0.42, 0], [0.5, 0.42, 0.5]);
        const m = mat('krema'); add(sph, m, [0, 0.45, 0], [0.47, 0.2, 0.47]); add(geo('cone'), m, [0, 0.7, 0], [0.26, 0.4, 0.26]);
        add(sph, mat('krema_c'), [0, 0.95, 0], 0.09);
        break;
      }
      case 'cilekOdul': {
        add(strawGeo(), mat('cilek'), [0, 0.4, 0], 0.7, [Math.PI, 0, 0]);
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU2; add(sph, mat('yaprak'), [Math.sin(a) * 0.14, 0.72, Math.cos(a) * 0.14], [0.07, 0.03, 0.17], [0.3, a, 0]); }
        break;
      }
      default: add(sph, mat('x', { color: '#ffffff' }), null, 0.3);
    }
    return g;
  }
  const POOL = {};
  function getProp(kind) {
    const pl = POOL[kind] || (POOL[kind] = []);
    let o = null; for (const p of pl) if (!p.userData.used) { o = p; break; }
    if (!o) { o = mkProp(kind); pl.push(o); }
    o.userData.used = true; o.visible = true; o.position.set(0, -50, 0); o.rotation.set(0, 0, 0); o.scale.setScalar(1);
    scene.add(o); return o;
  }
  function putProp(o) { if (!o) return; o.userData.used = false; o.visible = false; if (o.parent) o.parent.remove(o); }
  // Isınma: her eşya bir kez yerin altında görünür çizilir (malzeme gölgelendiricisi ilk saldırıda takılmadan derlenmiş olur)
  const WARM = [];
  function warmProps() {
    for (const k of ['mercimek', 'nohut', 'cilek', 'kartopu', 'krema', 'top', 'buhar', 'toz', 'dalga', 'buz', 'un', 'yumurta', 'cilekOdul', 'kremaKase', 'gol']) {
      const o = getProp(k); o.position.set(0, -60, 0); o.frustumCulled = false; o.traverse(c => { c.frustumCulled = false; }); WARM.push(o);
    }
  }

  // ════════ Etkin hamle nesneleri (BOSSDAV.update yürütür) ════════
  const W = { drops: [], rollers: [], sweeps: [], clouds: [], strips: [], fests: [], boss: null, gol: null };
  function tele(x, z, r, dur, col) { const h = A.fx('telegraph', x, z, r, dur, col); if (h) (W.marks || (W.marks = [])).push(h); return h; }
  function teleLine(x0, z0, x1, z1, w, dur, col) { const h = A.telegraphLine(x0, z0, x1, z1, w, dur, col); if (h) (W.marks || (W.marks = [])).push(h); return h; }
  // Bir şey yukarıdan / bossun elinden yere iner: önce renkli daire (≥ 1 s), sonra iner, değdiyse az hasar.
  // o: { x, z, r, at, kind (eşya ya da null), from:[x,y,z] (atış yayı), h (yay yüksekliği), col, dmgK, fx: inişte burst türü, b }
  function drop(o) {
    const d = Object.assign({ t: 0, r: 1, at: 1.2, kind: null, from: null, h: 3, col: '#ff7cb9', dmgK: 0.3, fx: 'dust', hit: false }, o);
    if (!A.circleFree(d.x, d.z, 0.2) && !A.isFloor(d.x, d.z)) return null;
    d.mark = tele(d.x, d.z, d.r, d.at, d.col);
    d.prop = d.kind ? getProp(d.kind) : null;
    if (d.prop) d.prop.visible = false;
    d.spin = rnd(-6, 6);
    W.drops.push(d); return d;
  }
  function stepDrops(dt) {
    for (let i = W.drops.length - 1; i >= 0; i--) {
      const d = W.drops[i]; d.t += dt;
      const k = d.t / d.at;
      if (d.prop) {
        if (d.from) {   // atış yayı
          const u = clamp01(k); d.prop.visible = true;
          d.prop.position.set(d.from[0] + (d.x - d.from[0]) * u, d.from[1] * (1 - u) + 4 * d.h * u * (1 - u) + 0.2, d.from[2] + (d.z - d.from[2]) * u);
        } else {        // gökten düşüş (son 0,8 s)
          const u = clamp01(1 - (d.at - d.t) / 0.8);
          d.prop.visible = u > 0;
          d.prop.position.set(d.x, 0.25 + 9 * (1 - u * u), d.z);
        }
        d.prop.rotation.x += d.spin * dt; d.prop.rotation.z += d.spin * 0.7 * dt;
      }
      if (k >= 1) {
        if (d.prop) putProp(d.prop);
        A.burst(d.fx, d.x, 0.15, d.z, { count: 10, scale: 1.1, color: d.burstCol });
        A.fx('ring', d.x, d.z, { r0: 0.2, r1: d.r + 0.2, dur: 0.4, color: d.ringCol || '#fff3dc', width: 0.25 });
        if (d.sfx) A.sfx(d.sfx, { x: d.x, z: d.z, vol: 0.5, pitch: rnd(0.9, 1.3) });
        const P = A.P;
        if (!P.dead && d.b && !d.b.dead && sq(P.pos.x - d.x) + sq(P.pos.z - d.z) < sq(d.r + heroR() * 0.5)) A.hurtPlayer(dmgOf(d.b, d.dmgK), d.x, d.z, 0.45);
        W.drops.splice(i, 1);
      }
    }
  }
  // Yerde yuvarlanan top (dondurma kralı): önce şerit işareti, sonra yavaşça yuvarlanır.
  function stepRollers(dt) {
    for (let i = W.rollers.length - 1; i >= 0; i--) {
      const r = W.rollers[i]; r.t += dt;
      if (r.t < r.warn) { r.prop.position.set(r.x0, r.R, r.z0); r.prop.scale.setScalar(clamp01(r.t / 0.3)); continue; }
      const s = Math.min(r.len, (r.t - r.warn) * r.speed), x = r.x0 + r.dx * s, z = r.z0 + r.dz * s;
      r.prop.position.set(x, r.R + Math.abs(Math.sin(s * 2.2)) * 0.08, z);
      r.prop.rotation.set(s / r.R, Math.atan2(r.dx, r.dz), 0, 'YXZ');
      if ((r.dust -= dt) <= 0) { r.dust = 0.08; A.burst('cream', x - r.dx * r.R, 0.1, z - r.dz * r.R, { count: 2, scale: 0.6 }); }
      const P = A.P;
      if (!r.hit && !P.dead && r.b && !r.b.dead && sq(P.pos.x - x) + sq(P.pos.z - z) < sq(r.R + heroR() + 0.1)) { r.hit = true; A.hurtPlayer(dmgOf(r.b, 0.4), x, z, 1.1); A.sfx('bounce', { x, z }); }
      if (s >= r.len) {
        A.burst('cream', x, 0.3, z, { count: 18, scale: 1.4 }); A.burst('sparkle', x, 0.6, z, { color: '#ffb3cf', count: 10 }); A.sfx('splat', { x, z, pitch: 1.1 });
        putProp(r.prop); W.rollers.splice(i, 1);
      }
    }
  }
  // Dönen krema dalgası (pasta, 3. aşama): bossun çevresinde yavaşça dönen krema rulosu; önce şerit işareti.
  function stepSweeps(dt) {
    for (let i = W.sweeps.length - 1; i >= 0; i--) {
      const w = W.sweeps[i]; w.t += dt;
      const b = w.b, cx = b.x, cz = b.z;
      if (w.t < w.warn) { w.prop.visible = false; continue; }
      const u = w.t - w.warn, a = w.a0 + w.dir * w.spd * Math.min(u, w.dur);
      const grow = clamp01(u / 0.4) * (1 - clamp01((u - w.dur) / 0.5));
      w.prop.visible = grow > 0.01;
      w.prop.position.set(cx + Math.sin(a) * w.r0, 0, cz + Math.cos(a) * w.r0); w.prop.rotation.set(0, a, 0);
      w.prop.scale.set(grow, grow, w.len);
      w.a = a;
      if (u < w.dur && (w.fxT -= dt) <= 0) { w.fxT = 0.06; const f = rnd(0.2, 1); A.burst('cream', cx + Math.sin(a) * (w.r0 + w.len * f), 0.2, cz + Math.cos(a) * (w.r0 + w.len * f), { count: 2, scale: 0.7 }); }
      const P = A.P;
      if (u < w.dur && !P.dead && !b.dead && A.gt - w.lastHit > 1.3) {
        const px = P.pos.x - cx, pz = P.pos.z - cz, along = px * Math.sin(a) + pz * Math.cos(a), side = Math.abs(px * Math.cos(a) - pz * Math.sin(a));
        if (along > w.r0 - 0.3 && along < w.r0 + w.len + 0.3 && side < 0.5 + heroR()) {
          w.lastHit = A.gt; A.hurtPlayer(dmgOf(b, 0.35), P.pos.x - Math.cos(a) * w.dir, P.pos.z + Math.sin(a) * w.dir, 0.9); A.sfx('splat', { x: P.pos.x, z: P.pos.z });
        }
      }
      if (u >= w.dur + 0.5) { putProp(w.prop); W.sweeps.splice(i, 1); }
    }
  }
  // Buhar / toz bulutu: zararsız; buharın içinde Feza yavaşlar.
  function stepClouds(dt) {
    const P = A.P;
    for (let i = W.clouds.length - 1; i >= 0; i--) {
      const c = W.clouds[i]; c.t += dt;
      const inK = clamp01((c.t - c.at) / 0.35), outK = clamp01((c.at + c.dur - c.t) / 0.8), k = Math.min(inK, outK);
      c.prop.visible = k > 0.01;
      c.prop.scale.set(c.r * (0.4 + 0.6 * k), (0.5 + 0.5 * k) * (1 + 0.08 * Math.sin(c.t * 3)), c.r * (0.4 + 0.6 * k));
      c.prop.rotation.y += dt * 0.25; c.prop.position.set(c.x, 0, c.z);
      if (c.slow && k > 0.5 && !P.dead && sq(P.pos.x - c.x) + sq(P.pos.z - c.z) < sq(c.r * 0.9)) { P.slowT = 0.15; P.slowK = 0.55; if ((c.fxT -= dt) <= 0) { c.fxT = 0.35; A.burst('steam', P.pos.x, 0.8, P.pos.z, { count: 3 }); } }
      if (c.t >= c.at + c.dur) { putProp(c.prop); W.clouds.splice(i, 1); }
    }
  }
  function cloud(x, z, r, at, dur, kind, slow) {
    const c = { x, z, r, at, dur, t: 0, slow, fxT: 0, prop: getProp(kind) };
    c.prop.visible = false; W.clouds.push(c); return c;
  }
  // Buz izi (dondurma kralının kaydırağı): yere serili, birkaç saniye sonra erir.
  function stepStrips(dt) {
    for (let i = W.strips.length - 1; i >= 0; i--) {
      const s = W.strips[i]; s.t += dt;
      const k = clamp01(s.t / 0.5) * clamp01((s.dur - s.t) / 0.8);
      s.prop.scale.set(s.w, 1, s.len * k); s.prop.visible = k > 0.01;
      if (s.t >= s.dur) { putProp(s.prop); W.strips.splice(i, 1); }
    }
  }
  function clearAll() {
    for (const d of W.drops) putProp(d.prop);
    for (const r of W.rollers) putProp(r.prop);
    for (const w of W.sweeps) putProp(w.prop);
    for (const c of W.clouds) putProp(c.prop);
    for (const s of W.strips) putProp(s.prop);
    W.drops.length = W.rollers.length = W.sweeps.length = W.clouds.length = W.strips.length = 0;
    if (W.gol) { putProp(W.gol); W.gol = null; }
    if (W.marks) { for (const h of W.marks) A.remove(h); W.marks.length = 0; }
    if (A && A.P) A.P.slowT = 0;
  }

  // ════════ Kutlama (boss neşelenince): konfeti, kalpler, şeker yağmuru, havada dönen malzeme ödülü ════════
  const CANDY = ['#ff5fa8', '#ffd23f', '#5fd3ff', '#7ce07a', '#c58bff', '#ff8a3c'];
  const ING = { un: 'un', yumurta: 'yumurta', cilek: 'cilekOdul', krema: 'kremaKase' };
  function festStart(x, z, h, type) {
    const f = { x, z, h, t: 0, type, candyT: 0, burstN: 0, prop: null, ing: null };
    W.fests.push(f);
    A.burst('confetti', x, h + 1, z, {}); A.burst('hearts', x, h * 0.8, z, { count: 18, scale: 1.6 });
    A.fx('ring', x, z, { r0: 1, r1: 9, dur: 0.9, color: '#ffd6f0', width: 0.7 });
    return f;
  }
  function stepFests(dt) {
    const P = A.P;
    for (let i = W.fests.length - 1; i >= 0; i--) {
      const f = W.fests[i]; f.t += dt;
      // şeker yağmuru (ilk 3,5 s)
      if (f.t < 3.5 && (f.candyT -= dt) <= 0) {
        f.candyT = 0.03;
        for (let k = 0; k < 2; k++) {
          const a = rnd(0, TAU2), rr = rnd(0, 6), c = CANDY[(Math.random() * CANDY.length) | 0];
          A.emitP(f.x + Math.sin(a) * rr, f.h + 4 + rnd(0, 2), f.z + Math.cos(a) * rr, rnd(-0.4, 0.4), rnd(-2, -1), rnd(-0.4, 0.4), 1.6, 0.3, 0.24, c, c, k ? 12 : 1, 3, 0.2);
        }
      }
      // büyük konfeti dalgaları
      if (f.burstN < 4 && f.t > f.burstN * 0.7) { f.burstN++; A.burst('confetti', f.x + rnd(-2, 2), f.h + 0.5, f.z + rnd(-2, 2), {}); A.burst('hearts', f.x + rnd(-2, 2), f.h * 0.6, f.z + rnd(-2, 2), { count: 8 }); if (f.burstN === 2) A.sfx('cheer', { vol: 0.6 }); }
      // tencere neşelenince düdükle şarkı çalar
      if (f.type === 'dudukluTencere' && f.t < 3 && (f.noteT = (f.noteT || 0) - dt) <= 0) { f.noteT = 0.38; A.burst('notes', f.x, f.h + 0.3, f.z, { count: 3 }); A.sfx('horn', { x: f.x, z: f.z, pitch: [1.0, 1.26, 1.5, 1.33, 1.12][(f.t / 0.38 | 0) % 5], vol: 0.45 }); }
      // malzeme ödülü: havada döner, parlar, sonra Feza'ya uçar
      if (f.ing) {
        const o = f.ing, u = f.t - f.ingAt;
        if (u < 3.4) {
          const up = clamp01(u / 0.8);
          o.position.set(f.x, f.h * 0.6 + 1.2 * (1 - Math.pow(1 - up, 3)) + Math.sin(u * 3) * 0.12, f.z + 0.5);
          o.rotation.y += dt * (2 + 4 * (1 - up)); o.scale.setScalar(1.3 * (0.2 + 0.8 * Math.min(1, u / 0.5)));
          if ((f.sparkT = (f.sparkT || 0) - dt) <= 0) { f.sparkT = 0.12; A.burst('sparkle', o.position.x, o.position.y + 0.4, o.position.z, { color: '#fff1a8', count: 3 }); }
        } else {
          const k = clamp01((u - 3.4) / 0.7), tx = P.pos.x, tz = P.pos.z;
          o.position.set(o.position.x + (tx - o.position.x) * k, o.position.y + (1.4 - o.position.y) * k, o.position.z + (tz - o.position.z) * k);
          o.scale.setScalar(1.3 * (1 - 0.6 * k)); o.rotation.y += dt * 8;
          if (k >= 1) { A.burst('sparkle', tx, 1.2, tz, { color: '#ffe27a', count: 24 }); A.burst('hearts', tx, 1.6, tz, { count: 6 }); A.sfx('unlock', { vol: 0.6 }); putProp(o); f.ing = null; }
        }
      }
      if (f.t > 6 && !f.ing) W.fests.splice(i, 1);
    }
  }

  // ════════ Ortak boss parçaları ════════
  function state(b) {
    let S = b.dv;
    if (!S || S.enc !== b.encounter) {   // yeni karşılaşma (ya da uyuyup uyandı): eski hamle nesneleri temizlenir
      if (S) clearAll();
      S = b.dv = { enc: b.encounter, n: 0, napCd: 0, stage: (S && S.stage) || 1, half: S ? S.half : false, lineN: 0, tired: false, tiredT: 0, hints: (S && S.hints) || {} };
      b.st.lid = null; b.st.scoopOff = 0;
      // Dövüş süresi: 07'nin boss canı (seviyeye göre, tüm bosslar aynı) × hpK — çocuk-bot ölçümü: düz can ile 15–22 s sürüyordu,
      // hedef ~35–50 s (pasta, 3 aşama + Takım Hamlesi ile ~60–80 s). Bir kez (uyuyup uyanınca tekrar değil).
      const D = DEFS[b.type];
      if (!b.dvHp && D && D.hpK && b.sized) {
        b.dvHp = true; const k = D.hpK;
        b.maxHp = Math.round(b.maxHp * k); b.hp = Math.round(b.hp * k);
        if (b.difficultyHp) b.difficultyHp = b.difficultyHp.map(v => Math.round(v * k));
      }
    }
    W.boss = b;
    return S;
  }
  const faceTo = (b, x, z, k, dt) => { b.face = dampAngle(b.face, Math.atan2(x - b.x, z - b.z), k, dt); };
  // Feza'nın çevresinde yer işaretleri için serbest noktalar (arena içinde)
  function spotsAround(b, cx, cz, n, rmin, rmax, minGap) {
    const out = [], rm = A.bossRoom();
    for (let tries = 0; tries < n * 12 && out.length < n; tries++) {
      const a = rnd(0, TAU2), r = out.length === 0 ? 0 : rnd(rmin, rmax), x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
      if (!A.isFloor(x, z) || (rm && !A.inRoom(rm, x, z, 0.6))) continue;
      if (out.some(p => sq(p.x - x) + sq(p.z - z) < sq(minGap))) continue;
      if (sq(x - b.x) + sq(z - b.z) < sq(b.r * 0.8)) continue;
      out.push({ x, z });
    }
    return out;
  }
  const local = (b, wx, wz) => { const dx = wx - b.x, dz = wz - b.z, c = Math.cos(b.face), s = Math.sin(b.face); return { x: dx * c - dz * s, z: dx * s + dz * c }; };

  // ════════ 1. Uykucu Süpürge ════════
  const SUP = {
    keep: 6.2, hpK: 2.2,
    choose(b, S, d) {
      if (S.n >= 3 && S.napCd <= 0) { A.bossPhase(b, 'nap', 4.6); return; }
      const ph = A.pickPhase(b, d < b.r + 3 ? [['suck', 0.25], ['blow', 0.35], ['cable', 0.4]] : [['suck', 0.42], ['blow', 0.33], ['cable', 0.25]]);
      A.bossPhase(b, ph, { suck: 4.8, blow: 3.0, cable: 3.4 }[ph]);
    },
    moves: {
      // Hortumla vakum: hortum Feza'ya döner (açık mavi koni ~1,3 s), sonra hafifçe çeker; karşı koşan kurtulur. Ağza değerse "pöf!" dışarı.
      suck(b, S, dt, d, ux, uz) {
        const t = b.stT, W0 = 1.3, W1 = 4.3;
        if (b.did === 0) { b.did = 1; S.aim = Math.atan2(ux, uz); b.tele = A.fx('telegraphCone', b.x, b.z, S.aim, 1.1, 8.5, W0, '#8fd0ff'); A.ftext(b.x, b.height + 0.4, b.z, 'Vıııın!', 'word'); A.sfx('rumble', { x: b.x, z: b.z, vol: 0.5, pitch: 1.4 }); S.sucked = false; }
        b.face = dampAngle(b.face, S.aim, 8, dt);
        if (t >= W0 && t < W1) {
          if (b.did === 1) { b.did = 2; A.sfx('whoosh', { x: b.x, z: b.z, pitch: 0.6, vol: 0.9 }); }
          const P = A.P, m = A.muzzle(b);
          if ((S.vT = (S.vT || 0) - dt) <= 0) { S.vT = 0.55; A.sfx('whoosh', { x: b.x, z: b.z, pitch: rnd(0.55, 0.7), vol: 0.45 }); }   // vıııın (sürekli)
          // içe akan toz ve yıldız parçacıkları
          for (let k = 0; k < 2; k++) { const a = S.aim + rnd(-0.5, 0.5), r = rnd(3, 8); A.emitP(b.x + Math.sin(a) * r, rnd(0.2, 1.4), b.z + Math.cos(a) * r, -Math.sin(a) * r * 1.4, 0.3, -Math.cos(a) * r * 1.4, 0.65, 0.22, 0.05, '#e9f6ff', '#bfe0ff', 0, 0, 0); }
          const px = P.pos.x - b.x, pz = P.pos.z - b.z, pd = Math.hypot(px, pz) || 1;
          let da = Math.atan2(px, pz) - S.aim; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (!P.dead && pd < 9 && Math.abs(da) < 0.62) {
            const v = 1.7 * (1 - pd / 11);
            A.moveXZ(P.pos, -px / pd * v * dt, -pz / pd * v * dt, heroR());
            if (!S.sucked && pd < b.r + 1.1) { S.sucked = true; A.hurtPlayer(dmgOf(b, 0.3), m.x, m.z, 1.6); A.burst('dust', m.x, 0.8, m.z, { count: 16, scale: 1.3 }); A.sfx('cork', { x: b.x, z: b.z }); A.ftext(m.x, 2, m.z, 'Pöf!', 'word'); }
          }
        }
        if (t >= W1 && b.did === 2) { b.did = 3; A.burst('dust', b.x + Math.sin(S.aim) * b.r, 0.5, b.z + Math.cos(S.aim) * b.r, { count: 12 }); A.sfx('sigh', { x: b.x, z: b.z, pitch: 0.9 }); }
        if (t >= b.phD) { S.n++; A.bossEnd(b, 0.9, 1.4); }
      },
      // Toz bulutu üfleme: Feza'nın çevresinde 3 lila halka; 1,3 s sonra toz bulutu "puf!" der.
      blow(b, S, dt, d, ux, uz) {
        const t = b.stT;
        faceTo(b, A.P.pos.x, A.P.pos.z, 4, dt);
        if (b.did === 0 && t > 0.25) {
          b.did = 1;
          for (const p of spotsAround(b, A.P.pos.x, A.P.pos.z, 3, 2.6, 4.2, 2.8)) {
            drop({ b, x: p.x, z: p.z, r: 1.5, at: 1.35, col: '#c9a8ff', dmgK: 0.3, fx: 'dust', burstCol: '#cdb9e8', ringCol: '#e6dcff', sfx: 'bubblePop' });
            cloud(p.x, p.z, 1.5, 1.35, 1.4, 'toz', false);
          }
          A.sfx('whoosh', { x: b.x, z: b.z, pitch: 1.2 });
        }
        if (t > 0.3 && t < 1.4) { const m = A.muzzle(b); if (Math.random() < 0.5) A.burst('dust', m.x, m.y, m.z, { count: 2, color: '#d8cbe8', dir: { x: Math.sin(b.face), z: Math.cos(b.face) } }); }
        if (t >= b.phD) { S.n++; A.bossEnd(b, 0.8, 1.3); }
      },
      // Kablo dalgası: fiş kuyruğu yere vurur, Feza'ya doğru sırayla 6 küçük halka "zıp zıp" kabarır.
      cable(b, S, dt, d, ux, uz) {
        const t = b.stT;
        if (b.did === 0) {
          b.did = 1; const a = Math.atan2(ux, uz); S.aim = a;
          for (let i = 0; i < 6; i++) { const r = b.r + 1.2 + i * 1.55; drop({ b, x: b.x + Math.sin(a) * r, z: b.z + Math.cos(a) * r, r: 1.15, at: 1.25 + i * 0.2, col: '#ffcf6b', dmgK: 0.3, fx: 'dust', burstCol: '#e8d2a8', ringCol: '#ffe6a8', sfx: i % 2 ? 'bounce' : null }); }
          A.ftext(b.x, b.height + 0.4, b.z, 'Kablo dalgası!', 'word');
        }
        b.face = dampAngle(b.face, S.aim + Math.PI, 5, dt);   // kuyruk (kablo) Feza'ya döner
        if (b.did === 1 && t > 1.2) { b.did = 2; A.sfx('slam', { x: b.x, z: b.z, vol: 0.5, pitch: 1.3 }); A.shake(0.12); }
        if (t >= b.phD) { S.n++; A.bossEnd(b, 0.8, 1.3); }
      },
      // Horlayıp uyuklar: vurma fırsatı (hasar × 1,5); Zzz baloncukları.
      nap(b, S, dt) {
        const t = b.stT;
        if (b.did === 0) { b.did = 1; S.n = 0; S.napCd = 2; sayOne(S, ['supurge_uyudu', 'supurge_uyudu2']); A.sfx('sigh', { x: b.x, z: b.z, pitch: 0.7 }); }
        b.st.sleep = 1; faceTo(b, A.P.pos.x, A.P.pos.z, 1.5, dt);   // (uyurken yüzü Feza'ya döner: horlayan yüzü görsün)
        if ((S.zT = (S.zT || 0) - dt) <= 0) { S.zT = 0.9; A.burst('zzz', b.x + Math.sin(b.face) * b.r * 0.6, b.height * 0.85, b.z + Math.cos(b.face) * b.r * 0.6, {}); A.sfx('sigh', { x: b.x, z: b.z, pitch: 0.55 + 0.1 * Math.sin(t), vol: 0.5 }); }
        if (t >= b.phD) { b.st.sleep = 0; A.ftext(b.x, b.height + 0.4, b.z, 'Hıı? Uyanıktım!', 'word'); A.bossEnd(b, 0.6, 1.0); }
      },
    },
  };

  // ════════ 2. Düdüklü Tencere ════════
  const TEN = {
    keep: 5.6, hpK: 2.2,
    choose(b, S, d) {
      const ph = A.pickPhase(b, [['lid', 0.4], ['steam', 0.28], ['rain', 0.32]]);
      A.bossPhase(b, ph, { lid: 2.9, steam: 2.6, rain: 3.2 }[ph]);
    },
    moves: {
      // Kapak fırlatma: kapak havaya fırlar, Feza'nın yerindeki turuncu halkaya "dang!" diye iner, sonra yerine döner.
      lid(b, S, dt) {
        const t = b.stT, UP = 0.35, LAND = 1.55, BACK = 2.5;
        if (b.did === 0) {
          b.did = 1; const P = A.P; S.tx = P.pos.x; S.tz = P.pos.z;
          const rm = A.bossRoom(); if (rm && !A.inRoom(rm, S.tx, S.tz, 0.8)) { S.tx = b.x + (S.tx - b.x) * 0.7; S.tz = b.z + (S.tz - b.z) * 0.7; }
          b.tele = A.fx('telegraph', S.tx, S.tz, 2.3, LAND, '#ffa64a'); faceTo(b, S.tx, S.tz, 50, 1);
          A.sfx('fizz', { x: b.x, z: b.z, pitch: 0.8 });
        }
        const L0 = local(b, S.tx, S.tz), lidY0 = b.height * 0.86;
        let k = 0, x = 0, z = 0, y = 0;
        if (t < UP) { k = 0; y = 0.3 * Math.sin(Math.PI * t / UP * 0.5); }
        else if (t < LAND) { const u = (t - UP) / (LAND - UP); k = u; x = L0.x * u; z = L0.z * u; y = (1 - u) * 0 + 4 * 3.6 * u * (1 - u) - lidY0 * u * u; }
        else if (t < LAND + 0.25) { k = 1; x = L0.x; z = L0.z; y = -lidY0; }
        else if (t < BACK) { const u = (t - LAND - 0.25) / (BACK - LAND - 0.25); k = 1 - u; x = L0.x * (1 - u); z = L0.z * (1 - u); y = -lidY0 * (1 - u) + 4 * 1.8 * u * (1 - u); }
        b.st.lid = { k, x, y, z, spin: t };
        if (b.did === 1 && t >= UP) { b.did = 2; A.sfx('cork', { x: b.x, z: b.z, pitch: 0.7 }); A.burst('steam', b.x, b.height, b.z, { count: 10 }); }
        if (b.did === 2 && t >= LAND) {
          b.did = 3; A.remove(b.tele); b.tele = null;
          A.bossRing(b, S.tx, S.tz, 2.3, 0.4, 1.4, '#ffd08a'); A.sfx('clank', { x: S.tx, z: S.tz, pitch: 0.75 }); A.sfx('slam', { x: S.tx, z: S.tz, vol: 0.5 }); A.burst('star', S.tx, 0.6, S.tz, { count: 8, color: '#fff3a0' });
        }
        if (b.did === 3 && t >= BACK) { b.did = 4; A.sfx('clank', { x: b.x, z: b.z, pitch: 1.2, vol: 0.6 }); }
        if (t >= b.phD) { b.st.lid = null; A.bossEnd(b, 0.8, 1.2); }
      },
      // Buhar bulutları: düdük öter, 3 açık mavi halka; oraya yumuşak buhar bulutu çöker (zararsız, içinde yavaşlarsın).
      steam(b, S, dt) {
        const t = b.stT;
        if (b.did === 0) {
          b.did = 1; A.ftext(b.x, b.height + 0.5, b.z, 'Fıs fıs!', 'word'); A.sfx('fizz', { x: b.x, z: b.z, vol: 0.9 }); A.sfx('horn', { x: b.x, z: b.z, pitch: 1.6, vol: 0.5 });
          for (const p of spotsAround(b, A.P.pos.x, A.P.pos.z, 3, 3, 5, 3.2)) { tele(p.x, p.z, 1.9, 1.2, '#9fd8ff'); cloud(p.x, p.z, 1.9, 1.2, 4.5, 'buhar', true); }
        }
        if (t < 1.4 && (S.stT2 = (S.stT2 || 0) - dt) <= 0) { S.stT2 = 0.07; A.burst('steam', b.x, b.height + 0.2, b.z, { count: 3 }); }
        if (t >= b.phD) A.bossEnd(b, 0.6, 1.0);
      },
      // Mercimek / nohut yağmuru: kapak "pat!" açılır, taneler havaya fırlar; Feza'nın çevresindeki küçük halkalara düşer.
      rain(b, S, dt) {
        const t = b.stT;
        b.st.lid = t < 1.0 ? { k: 0, x: 0, y: 0.5 * Math.sin(Math.PI * clamp01(t / 0.9)), z: 0, spin: 0, open: Math.sin(Math.PI * clamp01(t / 0.9)) } : null;
        if (b.did === 0 && t > 0.3) {
          b.did = 1; A.sfx('cork', { x: b.x, z: b.z }); A.ftext(b.x, b.height + 0.5, b.z, 'Mercimek yağmuru!', 'word');
          const ps = spotsAround(b, A.P.pos.x, A.P.pos.z, 8, 1.5, 4.2, 1.7);
          ps.forEach((p, i) => drop({ b, x: p.x, z: p.z, r: 0.9, at: 1.25 + i * 0.13, kind: i % 2 ? 'nohut' : 'mercimek', col: '#ffb15f', dmgK: 0.22, fx: 'crumbs', ringCol: '#ffd9a0', sfx: i % 3 ? null : 'bounce' }));
        }
        if (b.did === 1 && t < 0.9) { if (Math.random() < 0.6) A.emitP(b.x + rnd(-0.4, 0.4), b.height + 0.2, b.z + rnd(-0.4, 0.4), rnd(-1, 1), rnd(6, 9), rnd(-1, 1), 0.7, 0.16, 0.12, Math.random() < 0.5 ? '#ff8a3c' : '#f0cf8e', '#ffffff', 0, 12, 0); }
        if (t >= b.phD) { b.st.lid = null; A.bossEnd(b, 0.8, 1.3); }
      },
    },
  };

  // ════════ 3. Dondurma Kralı ════════
  const DON = {
    keep: 6, hpK: 2.3,
    choose(b, S, d) {
      const ph = A.pickPhase(b, d < b.r + 2.5 ? [['snow', 0.3], ['slide', 0.4], ['scoop', 0.3]] : [['snow', 0.42], ['slide', 0.28], ['scoop', 0.3]]);
      A.bossPhase(b, ph, { snow: 2.6, slide: 1.4, scoop: 3.4 }[ph]);
    },
    moves: {
      // Kar topu: üç kar topunu yay çizerek atar; her biri inmeden önce yerde mavi halka.
      snow(b, S, dt) {
        const t = b.stT;
        faceTo(b, A.P.pos.x, A.P.pos.z, 5, dt);
        const at = [0.5, 0.95, 1.4];
        if (b.did < 3 && t >= at[b.did]) {
          const P = A.P, m = A.muzzle(b), j = b.did === 0 ? 0 : 1.6;
          const a = rnd(0, TAU2), x = P.pos.x + Math.sin(a) * j + (P.pos.x - b.x) * 0.06, z = P.pos.z + Math.cos(a) * j;
          drop({ b, x, z, r: 1.15, at: 1.15, kind: 'kartopu', from: [m.x, m.y, m.z], h: 2.4, col: '#5a6bff', dmgK: 0.3, fx: 'ice', ringCol: '#d8f4ff', sfx: 'splat' });
          A.sfx('whoosh', { x: b.x, z: b.z, pitch: 1.3, vol: 0.6 }); b.did++;
        }
        if (t >= b.phD) A.bossEnd(b, 0.8, 1.2);
      },
      // Buz kaydırağı: önce buz şeridi çizilir (mavi şerit, 1,4 s), sonra karnının üstünde kayarak geçer — "Vııı!".
      slide(b, S, dt, d, ux, uz) {
        const t = b.stT;
        if (b.did === 0) {
          b.did = 1; const a = Math.atan2(ux, uz), dx = Math.sin(a), dz = Math.cos(a), rm = A.bossRoom();
          S.len = Math.max(3, Math.min(14, A.laneLen(b.x, b.z, dx, dz, 14, b.r * 0.8, rm)));
          S.x0 = b.x; S.z0 = b.z; S.dx = dx; S.dz = dz; S.hit = false;
          b.tele = teleLine(b.x, b.z, b.x + dx * (S.len + b.r * 0.5), b.z + dz * (S.len + b.r * 0.5), b.r * 2 + 0.3, 1.4, '#4f6dff');
          const pr = getProp('buz'); pr.position.set(b.x, 0, b.z); pr.rotation.y = a; W.strips.push({ prop: pr, t: 0, dur: 5.5, w: b.r * 2, len: S.len + b.r });
          b.face = a; A.ftext(b.x, b.height + 0.5, b.z, 'Buz kaydırağı!', 'word');
        }
        if (b.did === 1 && t >= 1.4) { b.did = 2; A.bossPhase(b, 'slideGo', S.len / 6.5 + 0.7); b.did = 2; A.sfx('whoosh', { x: b.x, z: b.z, pitch: 0.8 }); A.sfx('ice', { x: b.x, z: b.z, vol: 0.5 }); }
      },
      slideGo(b, S, dt) {
        const t = b.stT, run = S.len / 6.5;
        if (t < run) {
          const s = 6.5 * t; b.x = S.x0 + S.dx * s; b.z = S.z0 + S.dz * s; b.face = Math.atan2(S.dx, S.dz);
          if (Math.random() < 0.6) A.burst('ice', b.x - S.dx * b.r, 0.2, b.z - S.dz * b.r, { count: 2 });
          const P = A.P;
          if (!S.hit && !P.dead && sq(P.pos.x - b.x) + sq(P.pos.z - b.z) < sq(b.r + heroR() + 0.1)) { S.hit = true; A.hurtPlayer(dmgOf(b, 0.4), b.x, b.z, 1.4); A.sfx('bounce', { x: b.x, z: b.z }); }
        } else if (b.did === 2) { b.did = 3; A.sfx('bonk', { x: b.x, z: b.z }); A.burst('ice', b.x, 0.5, b.z, { count: 14 }); A.burst('star', b.x, b.height, b.z, { count: 6, color: '#fff3a0' }); A.ftext(b.x, b.height + 0.4, b.z, 'Hoppala!', 'word'); }
        if (t >= b.phD) A.bossEnd(b, 0.9, 1.3);
      },
      // Top yuvarlama: tepedeki dondurma topu "plop!" düşer ve şeritte yavaşça yuvarlanır; sonra yenisi büyür.
      scoop(b, S, dt, d, ux, uz) {
        const t = b.stT;
        if (b.did === 0 && t > 0.35) {
          b.did = 1; b.st.scoopOff = 1;
          const a = Math.atan2(ux, uz), dx = Math.sin(a), dz = Math.cos(a), rm = A.bossRoom();
          const x0 = b.x + dx * (b.r + 0.6), z0 = b.z + dz * (b.r + 0.6), len = Math.max(3, A.laneLen(x0, z0, dx, dz, 13, 0.6, rm));
          teleLine(x0, z0, x0 + dx * len, z0 + dz * len, 1.7, 1.25, '#ff9fcf');
          const pr = getProp('top'); W.rollers.push({ b, prop: pr, x0, z0, dx, dz, len, speed: 4.6, warn: 1.25, t: 0, R: 0.75, hit: false, dust: 0 });
          A.sfx('pop', { x: b.x, z: b.z, pitch: 0.8 }); A.ftext(b.x, b.height + 0.4, b.z, 'Plop!', 'word');
        }
        if (b.did === 1 && t > 2.6) { b.did = 2; b.st.scoopOff = 0; A.sfx('pop', { x: b.x, z: b.z, pitch: 1.4 }); A.burst('sparkle', b.x, b.height, b.z, { color: '#ffb3cf', count: 12 }); }
        if (t >= b.phD) { b.st.scoopOff = 0; A.bossEnd(b, 0.8, 1.2); }
      },
    },
  };

  // ════════ 4. Koca Huysuz Pasta (3 aşama) ════════
  const STAGE_AT = [0.66, 0.33], FINISH_AT = 0.06;
  const PAS = {
    keep: 6.6, hpK: 3.2,
    choose(b, S, d) {
      let opts;
      if (S.stage === 1) opts = [['squirt', 0.7], ['taunt', 0.3]];
      else if (S.stage === 2) opts = [['cookies', A.enemies.filter(e => !e.dead && e.arenaChild === b).length < 2 ? 0.4 : 0], ['strawrain', 0.4], ['squirt', 0.2]];
      else opts = [['sweep', 0.45], ['jump', 0.4], ['squirt', 0.15]];
      const ph = A.pickPhase(b, opts);
      A.bossPhase(b, ph, { squirt: 3.4, taunt: 1.8, cookies: 1.8, strawrain: 3.0, sweep: 7.4, jump: 2.0 }[ph]);
    },
    moves: {
      // Krema fışkırtma halkaları: önce yakın halka, sonra uzak halka (aralarında güvenli yer var).
      squirt(b, S, dt) {
        const t = b.stT;
        if (b.did === 0 && t > 0.3) {
          b.did = 1; A.ftext(b.x, b.height + 0.5, b.z, 'Krema halkası!', 'word'); A.sfx('squish', { x: b.x, z: b.z, pitch: 0.8 });
          const top = [b.x, b.height, b.z], a0 = rnd(0, TAU2);
          for (const [R, n, at, off] of [[b.r + 1.7, 5, 1.3, 0], [b.r + 4.6, 8, 2.2, 0.5]]) {
            for (let i = 0; i < n; i++) {
              const a = a0 + (i + off) / n * TAU2, x = b.x + Math.sin(a) * R, z = b.z + Math.cos(a) * R;
              drop({ b, x, z, r: 1.05, at, kind: 'krema', from: top, h: 2.5, col: '#ff8fc0', dmgK: 0.25, fx: 'cream', ringCol: '#ffe0ee', sfx: i % 3 ? null : 'splat' });
            }
          }
        }
        if (t > 0.3 && t < 1.3 && Math.random() < 0.5) A.burst('cream', b.x + rnd(-0.6, 0.6), b.height, b.z + rnd(-0.6, 0.6), { count: 2 });
        if (t >= b.phD) A.bossEnd(b, 0.8, 1.2);
      },
      taunt(b, S, dt) {   // zararsız: dilini çıkarıp kıpır kıpır dans eder — vurma fırsatı
        if (b.did === 0) { b.did = 1; A.ftext(b.x, b.height + 0.5, b.z, 'Lalala!', 'word'); A.sfx('squish', { x: b.x, z: b.z, pitch: 1.3 }); }
        if (b.stT >= b.phD) A.bossEnd(b, 0.5, 0.9);
      },
      cookies(b, S, dt) {   // kurabiye askerleri: mum şapkasını sallar, 3 zencefilli kurabiye asker fırlar
        const t = b.stT;
        if (b.did === 0 && t > 0.2) { b.did = 1; A.sfx('horn', { x: b.x, z: b.z, pitch: 1.3 }); A.burst('notes', b.x, b.height + 0.4, b.z, { count: 10 }); }
        if (b.did === 1 && t > 0.8) { b.did = 2; A.summonAdds(b, 'kurabiyeAsker', 3); for (const e of A.enemies) if (!e.dead && e.type === 'kurabiyeAsker' && !e.arenaChild) e.arenaChild = b; say('pasta_kurabiye', 2); }
        if (t >= b.phD) A.bossEnd(b, 0.8, 1.2);
      },
      strawrain(b, S, dt) {   // çilek yağmuru: Feza'nın çevresine kırmızı-pembe halkalar, iri çilekler pat pat düşer
        const t = b.stT;
        if (b.did === 0 && t > 0.25) {
          b.did = 1; A.ftext(b.x, b.height + 0.5, b.z, 'Çilek yağmuru!', 'word');
          const ps = spotsAround(b, A.P.pos.x, A.P.pos.z, 9, 1.6, 4.6, 1.9);
          ps.forEach((p, i) => drop({ b, x: p.x, z: p.z, r: 1.0, at: 1.25 + i * 0.16, kind: 'cilek', col: '#ff6f9a', dmgK: 0.25, fx: 'jelly', burstCol: '#ff4f7a', ringCol: '#ffc0d4', sfx: i % 2 ? 'splat' : null }));
        }
        if (t >= b.phD) A.bossEnd(b, 0.8, 1.2);
      },
      // Dönen krema dalgası: pastanın çevresinde yavaşça dönen krema rulosu (önce pembe şerit). Önünden kaç ya da arkasından dolaş!
      sweep(b, S, dt) {
        const t = b.stT;
        if (b.did === 0) {
          b.did = 1; const P = A.P, a0 = Math.atan2(P.pos.x - b.x, P.pos.z - b.z) - 0.9 * (S.sdir = Math.random() < 0.5 ? 1 : -1), r0 = b.r * 0.7, len = 8;
          teleLine(b.x + Math.sin(a0) * r0, b.z + Math.cos(a0) * r0, b.x + Math.sin(a0) * (r0 + len), b.z + Math.cos(a0) * (r0 + len), 1.1, 1.4, '#ff8fc0');
          W.sweeps.push({ b, prop: getProp('dalga'), a0, dir: S.sdir, spd: 0.85, r0, len, warn: 1.4, dur: 5.2, t: 0, fxT: 0, lastHit: -9 });
          A.ftext(b.x, b.height + 0.5, b.z, 'Dönen krema!', 'word'); A.sfx('squish', { x: b.x, z: b.z, pitch: 0.7 });
          say('pasta_dalga', 2);
        }
        b.st.spin = t > 1.4 && t < 6.6 ? S.sdir : 0;
        if (t >= b.phD) { b.st.spin = 0; A.bossEnd(b, 0.8, 1.2); }
      },
      // Zıplama: Feza'nın yanına zıplar, inerken pembe halkada krema dalgası (halka önceden belli).
      jump(b, S, dt) {
        const t = b.stT, c = 0.45, land = 1.5;
        if (b.did === 0) {
          b.did = 1; const sp = A.approachSpot(b, 7.5);
          S.hx0 = b.x; S.hz0 = b.z; S.hx1 = sp.x; S.hz1 = sp.z;
          b.tele = A.fx('telegraph', sp.x, sp.z, 3.1, land, '#ff6fa8');
        }
        if (t < c) { faceTo(b, S.hx1, S.hz1, 6, dt); b.st.air = 0; }
        else if (t < land) { const u = (t - c) / (land - c), k = u * u * (3 - 2 * u); b.x = S.hx0 + (S.hx1 - S.hx0) * k; b.z = S.hz0 + (S.hz1 - S.hz0) * k; b.y = 4 * 2.2 * u * (1 - u); b.st.air = u; if (b.did === 1) { b.did = 2; A.sfx('bounce', { x: b.x, z: b.z, pitch: 0.6 }); } }
        else if (b.did === 2) { b.did = 3; b.y = 0; b.st.air = 0; b.x = S.hx1; b.z = S.hz1; A.remove(b.tele); b.tele = null; A.bossRing(b, b.x, b.z, 3.1, 0.4, 1.6, '#ffc2dc'); A.burst('cream', b.x, 0.3, b.z, { count: 30, scale: 1.8 }); A.sfx('slam', { x: b.x, z: b.z }); A.sfx('splat', { x: b.x, z: b.z, pitch: 0.7 }); }
        if (t >= b.phD) { b.y = 0; A.bossEnd(b, 0.9, 1.3); }
      },
      // Aşama geçişi: komik "Aaa, kremam!" tepkisi, bir malzeme yuvası parlar (bu sırada vurulmaz).
      shock(b, S, dt) {
        const t = b.stT;
        if (b.did === 0) {
          b.did = 1; S.stage = S.pending; b.st.stage = S.stage; b.st.slots = S.stage;
          A.ftext(b.x, b.height + 0.6, b.z, S.stage === 2 ? 'Mumlarım titredi!' : 'Kremam akıyor!', 'word');
          A.sfx('bonk', { x: b.x, z: b.z }); A.sfx('hiccup', { x: b.x, z: b.z, pitch: 0.8 }); A.shake(0.25);
          A.burst('star', b.x, b.height + 0.3, b.z, { count: 10, color: '#fff3a0' }); A.burst('cream', b.x, b.height * 0.6, b.z, { count: 24, scale: 1.6 });
          say(S.stage === 2 ? 'pasta_asama2' : 'pasta_asama3', 3);
        }
        if (b.did === 1 && t > 1.2) { b.did = 2; const m = A.muzzle(b); A.burst('sparkle', b.x, 0.9, b.z + b.r * 0.8, { color: '#ffe27a', count: 26 }); A.sfx('unlock', { x: b.x, z: b.z, vol: 0.6 }); void m; }
        if (t >= b.phD) A.bossEnd(b, 0.5, 0.8);
      },
      // Son an: pasta yoruldu, gülümsemeye hazır; otomatik takım hamlesiyle neşelenir.
      tired(b, S, dt) {
        const t = b.stT; S.tiredT += dt; b.st.slots = 4;
        fillTeam();
        if (b.did === 0) { b.did = 1; S.tiredT = 0; S.sayT = 0; A.ftext(b.x, b.height + 0.6, b.z, 'Yoruldum!', 'word'); A.sfx('sigh', { x: b.x, z: b.z, pitch: 0.8 }); A.burst('sparkle', b.x, b.height, b.z, { color: '#ffe27a', count: 30 }); }
        if ((S.tkT = (S.tkT || 0) - dt) <= 0) { S.tkT = 3.5; const P = A.P; A.ftext(P.pos.x, 2.4, P.pos.z, 'Takım Hamlesi!', 'word'); A.burst('hearts', P.pos.x, 1.6, P.pos.z, { count: 5 }); }
        if ((S.glowT = (S.glowT || 0) - dt) <= 0) { S.glowT = 0.5; A.burst('sparkle', b.x + rnd(-1, 1), b.height * rnd(0.4, 1), b.z + rnd(-1, 1), { color: '#ffd6f0', count: 4 }); }
        void t;
      },
    },
  };

  const HINT = { suck: 'ipucu_vakum', blow: 'ipucu_toz', cable: 'ipucu_kablo', lid: 'ipucu_kapak', steam: 'ipucu_buhar', rain: 'ipucu_mercimek',
    snow: 'ipucu_kartopu', slide: 'ipucu_kaydirak', scoop: 'ipucu_top', squirt: 'ipucu_krema', strawrain: 'ipucu_cilek', jump: 'ipucu_zipla' };
  // Takım yardımını hazırla (HALA.charge; Hala ajanı başka bir yol açtıysa onu da dener, hata oyunu durdurmaz)
  function fillTeam() {
    if (typeof HALA === 'undefined' || !HALA) return;
    try { if (typeof HALA.setCharge === 'function') HALA.setCharge(1); else if (typeof HALA.charge === 'number') HALA.charge = 1; } catch (e) { /* salt okunur */ }
  }
  const DEFS = { uykucuSupurge: SUP, dudukluTencere: TEN, dondurmaKrali: DON, kocaPasta: PAS };
  const types = () => Object.keys(DEFS);

  function step(b, dt, d, ux, uz) {
    const D = DEFS[b.type]; if (!D || !A) return;
    const S = state(b), st = b.st;
    S.napCd = Math.max(0, S.napCd - dt * (b.ph === 'idle' ? 0.25 : 0));
    st.air = b.ph === 'jump' ? st.air : 0;
    if (b.type === 'dondurmaKrali') {   // erime: canı azaldıkça damlar, terler (komik)
      st.melt = clamp01((0.55 - b.hp / b.maxHp) / 0.5);
      if (st.melt > 0.15 && (S.meltT = (S.meltT || 0) - dt) <= 0) { S.meltT = 0.35 / st.melt; const a = rnd(0, TAU2); A.burst('milk', b.x + Math.sin(a) * b.r * 0.8, b.height * rnd(0.3, 0.6), b.z + Math.cos(a) * b.r * 0.8, { count: 2, scale: 0.6 }); }
      if (st.melt > 0.4 && !S.meltSaid) { S.meltSaid = true; A.ftext(b.x, b.height + 0.4, b.z, 'Eriyorum!', 'word'); }
    }
    if (b.type === 'dudukluTencere' && b.ph === 'idle' && (S.fisT = (S.fisT ?? rnd(1, 2)) - dt) <= 0) {   // boşta da fıs fıs
      S.fisT = rnd(1.4, 2.6); const m = A.muzzle(b); A.burst('steam', m.x, m.y + 0.1, m.z, { count: 4 }); A.sfx('fizz', { x: b.x, z: b.z, vol: 0.3, pitch: rnd(1.2, 1.5) });
    }
    if (b.type === 'kocaPasta') { st.stage = S.stage; if (st.slots === undefined || st.slots < S.stage) st.slots = S.stage; }
    if (b.type === 'kocaPasta' && S.pending && S.pending !== S.stage && b.ph !== 'shock') {   // aşama geçişi (yarıda kalan hamle biter)
      clearMovesOf(b); b.y = 0; st.air = 0; A.bossPhase(b, 'shock', 2.6); return;
    }
    if (b.type === 'kocaPasta' && S.tired && b.ph !== 'tired') { clearMovesOf(b); b.y = 0; A.bossPhase(b, 'tired', 999); }
    switch (b.ph) {
      case 'roar': A.bossRoar(b, D.roarD || 2.0); break;
      case 'summon': A.bossSummon(b, 1.6); break;
      case 'idle':
        if (A.bossIdle(b, dt, d, ux, uz, D.keep)) {
          if (b.summon) { A.bossPhase(b, 'summon', 1.6); break; }
          D.choose(b, S, d);
        }
        break;
      default: {
        const fn = D.moves[b.ph];
        if (fn && HINT[b.ph] && !S.hints[b.ph]) { S.hints[b.ph] = true; say(HINT[b.ph], 1); }   // (ilk kez: Aytuğ Hala ne yapılacağını söyler)
        if (fn) fn(b, S, dt, d, ux, uz);
        else {   // (Bilbo'nun koruma havlaması gibi dışarıdan gelen kısa sersemleme: başında yıldızlar döner, süresi bitince devam)
          if ((S.dzT = (S.dzT || 0) - dt) <= 0) { S.dzT = 0.4; A.burst('star', b.x, b.height + 0.2, b.z, { count: 3, color: '#fff3a0' }); }
          if (b.stT >= b.phD) A.bossEnd(b, 0.6, 1);
        }
      }
    }
  }
  function clearMovesOf(b) {
    for (const arr of [W.drops, W.rollers, W.sweeps]) for (let i = arr.length - 1; i >= 0; i--) if (arr[i].b === b) { putProp(arr[i].prop); if (arr[i].mark) A.remove(arr[i].mark); arr.splice(i, 1); }
    A.remove(b.tele); b.tele = null; b.st.lid = null; b.st.spin = 0;
  }

  // Hasar süzgeci (07 damage): uyurken × 1,5; pastanın aşama geçişinde vurulmaz, son anda yalnız Takım Hamlesi.
  function hit(b, amount, o) {
    const S = b.dv; if (!S || amount <= 0) return amount;
    const f0 = b.hp / b.maxHp;
    if (b.ph === 'nap') amount = Math.round(amount * 1.5);
    if (!S.half && (b.hp - amount) / b.maxHp <= 0.5 && b.type !== 'kocaPasta') { S.half = true; say(b.type + '_yarim', 2); }
    if (b.type !== 'kocaPasta') return amount;
    if (b.ph === 'shock') return 0;
    if (S.tired) {
      if (o && o.kind === 'team') return b.hp + 1;
      if (S.tiredT > 8) return amount;   // (yedek: takım yardımı gecikirse 8 s sonra normal vuruşlar da işler)
      if ((S.nopeT = (S.nopeT || 0) - 1) <= 0) { S.nopeT = 4; A.burst('sparkle', b.x, b.height * 0.7, b.z, { color: '#ffd6f0', count: 6 }); A.ftext(b.x, b.height + 0.3, b.z, 'Takım!', 'word'); }
      return 0;
    }
    const left = (b.hp - amount) / b.maxHp;
    for (let i = 0; i < 2; i++) {
      if (S.stage === i + 1 && (!S.pending || S.pending === S.stage) && left <= STAGE_AT[i] + 1e-6) { S.pending = i + 2; return Math.max(0, b.hp - Math.round(b.maxHp * STAGE_AT[i])); }
    }
    if (S.pending && S.pending !== S.stage) return 0;
    if (S.stage === 3 && left <= FINISH_AT + 1e-6) { S.tired = true; return Math.max(0, b.hp - Math.round(b.maxHp * FINISH_AT)); }
    void f0;
    return amount;
  }

  let warmN = 0;
  function update(dt) {
    if (!A) return;
    if (WARM.length && ++warmN > 3) { for (const o of WARM) { o.traverse(c => { c.frustumCulled = true; }); putProp(o); } WARM.length = 0; }
    stepDrops(dt); stepRollers(dt); stepSweeps(dt); stepClouds(dt); stepStrips(dt); stepFests(dt);
    const b = W.boss, melt = b && !b.dead && b.type === 'dondurmaKrali' ? (+b.st.melt || 0) : 0;   // eriyen kralın altında birikinti
    if (melt > 0.02) {
      if (!W.gol) W.gol = getProp('gol');
      W.gol.position.set(b.x, 0, b.z); const k = b.r * (0.9 + 0.7 * melt); W.gol.scale.set(k, 1, k * 0.92);
    } else if (W.gol) { putProp(W.gol); W.gol = null; }
    if (W.marks && W.marks.length > 40) W.marks.splice(0, W.marks.length - 40);
  }

  function install(api) {
    A = api; const on0 = api.on;   // (getter'lı alanlar canlı kalsın diye kopyalanmaz)
    A.on = (n, fn) => on0(n, o => { try { fn(o); } catch (e) { console.warn('[BOSSDAV] ' + n, e); } });
    try { warmProps(); } catch (e) { console.warn('[BOSSDAV] warm', e); }
    A.on('boss', o => { if (o && !o.on && DEFS[o.type]) { clearAll(); const b = W.boss; if (b && b.dv) { if (b.st) { b.st.lid = null; b.st.spin = 0; b.st.sleep = 0; } } } });
    A.on('zone', () => { clearAll(); for (const f of W.fests) if (f.ing) putProp(f.ing); W.fests.length = 0; W.boss = null; });
    A.on('happy', o => { if (o && o.boss && DEFS[o.type]) { const b = W.boss; festStart(o.x, o.z, (b && b.height) || 3, o.type); } });
    A.on('ingredient', o => {
      const b = W.boss, kind = o && ING[o.id]; if (!b || !kind) return;
      const f = W.fests[W.fests.length - 1] || festStart(b.x, b.z, b.height || 3, b.type);
      f.ing = getProp(kind); f.ingAt = f.t; f.ing.position.set(b.x, b.height * 0.6, b.z);
    });
    A.on('team', () => {   // Takım Hamlesi: yorgun pasta tam şimdi neşelenir (Feza uzakta olsa da)
      const b = W.boss;
      if (b && !b.dead && b.dv && b.dv.tired) A.later(0.45, () => { if (!b.dead) A.damage(b, b.hp + 1, { kind: 'team', force: true }); });
    });
  }
  return { install, step, update, hit, types, DEFS, _W: W };
})();
