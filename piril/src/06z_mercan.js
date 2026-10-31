/* ── Bölüm 2: Mercan Denizi Bahçesi (Feza ile Pırıl) ──
   Suyun altında, güneşli ve sevimli bir deniz bahçesi. Feza'nın başında baloncuk kask, Pırıl yüzerek uçar (arkasında kabarcıklar).
     1. Kabuk Kumsalı     kumlu koy: deniz kabukları, kum tepeleri, deniz otu çayırı, KABARCIK BACALARI (üstüne basınca Feza'yı
                          kabarcıkla havaya atar; tepede altın şeker)
     2. Mercan Ormanı     renk renk mercanlar (beyin, dallı, yelpaze, tüp sünger), şakayıklar (sallanan dokunaçlar), inci istiridyeleri
     3. Batık Gemi Koyu   uzun yosunlar (kelp), batık OYUNCAK GEMİ (güverteye dokununca hazine sandığı açılır), çapa, kabarcık bacaları
     4. İnci Mağarası     mor-mavi mağara ağzı, parlayan inciler, ışık saçan istiridyeler
     Arena: İnci Sarayı (Koca Kirpi Balık) — dev açık istiridye, mercan sütunları; boss neşelenince kabarcık fıskiyeleri + inci ışıltısı.
   Atmosfer: zeminde oynaşan ışık desenleri (caustics, gölgelendirici), suya inen ışık huzmeleri, yükselen kabarcıklar, süzülen
   plankton parıltıları, sürü sürü renkli balıklar, uzakta salınan denizanaları (hepsi tek çizim / instanced, CPU'da iş yok denecek kadar).
   Gizli köşeler: yan odalarda dev istiridyedeki kocaman inci (altın şeker + çıkartma), mesaj şişesi; gemi hazinesi; kum yığınları.
   Biçim: PIRIL.md › 5, src/SPEC.md › "Dev Ev API" › Bölüm kaydı. Huysuzlar/boss: src/05z_mercan.js. Sesler: istek/MERCAN_SES.md (pr_mercan_*). */
const MERCAN = (() => {
  'use strict';
  const PI = Math.PI, hyp = Math.hypot;
  const C = (h, k = 1) => (k === 1 ? new THREE.Color(h) : new THREE.Color(h).multiplyScalar(k));
  const tmpC = new THREE.Color();
  const inZone = () => typeof GAME !== 'undefined' && GAME.L && GAME.L.Z && GAME.L.Z.id === 'mercan';
  const live = () => typeof GAME !== 'undefined' && GAME.state === 'play' && !GAME.paused && GAME.P && !GAME.P.dead &&
    !(typeof MINIGAME !== 'undefined' && MINIGAME && MINIGAME.active);
  const sfx = (n, o) => { try { if (typeof AUD !== 'undefined' && AUD.sfx) AUD.sfx(n, o); } catch (e) { /* ses yok */ } };
  const burst = (k, x, y, z, o) => { try { if (typeof FX !== 'undefined' && FX.burst) FX.burst(k, x, y, z, o || {}); } catch (e) { /* efekt yok */ } };
  const ftext = (x, y, z, s, k) => { try { if (typeof FX !== 'undefined' && FX.floatText) FX.floatText(x, y, z, s, k || 'word'); } catch (e) { /* yok */ } };
  let sayAt = -99; const said = new Set();
  function say(key, o = {}) {   // anlatıcı cümlesi: varsayılan oyun başına bir kez, arada ≥ 7 s
    try {
      if (typeof AUD === 'undefined' || !AUD.LINES || !AUD.LINES[key] || !AUD.say) return false;
      const now = (typeof GAME !== 'undefined' && GAME.time) || 0;
      if (o.once !== false && said.has(key)) return false;
      if (now - sayAt < (o.gap ?? 7)) return false;
      sayAt = now; said.add(key); AUD.say(key, { prio: o.prio || 2 }); return true;
    } catch (e) { return false; }
  }
  const PAL = {
    coral: [0xff6f91, 0xff9a5a, 0xffc94a, 0xb98aff, 0x6fd6ff, 0xff7ad8, 0x7fe0a0],
    brain: [0xff9ab0, 0xffb36a, 0xc8a0ff, 0xffd86a],
    shell: [0xffd8e6, 0xffe6c8, 0xfff4f0, 0xffc8b0, 0xe8d8ff],
    weed: [[0x2f9a5a, 0x9ff07a], [0x3fae7a, 0xc8ff9a], [0x1f8a8a, 0x8af0d0], [0x6fae3a, 0xe0ff8a]],
  };

  // ════════ Malzemeler (kalıcı; bölümler arası paylaşılır) ════════
  const M = {};
  const kp = m => { m.userData.keep = true; return m; };
  function mat(k) {
    if (M[k]) return M[k];
    let m;
    switch (k) {
      case 'gloss': m = rimify(vcMat({ roughness: 0.34 }), 0xfff4fa, 0.28, 2.5); break;
      case 'matte': m = vcMat({ roughness: 0.88 }); break;
      case 'pearl': m = rimify(vcMat({ roughness: 0.12, metalness: 0.1 }), 0xfff0ff, 0.6, 2.0); break;
      case 'glow': m = new THREE.MeshBasicMaterial({ vertexColors: true }); break;
      case 'sway': {   // deniz otu / dokunaç: köşe gölgelendiricide akıntıyla salınır (yükseklikle artar)
        m = vcMat({ roughness: 0.55, side: THREE.DoubleSide });
        patchMat(m, { uniforms: { uSwT: TIME.u }, vDecl: 'uniform float uSwT;',
          vBegin: '{ float hg = max(transformed.y, 0.0); float ph = transformed.x * 0.55 + transformed.z * 0.43;' +
            ' float k = hg * hg * 0.035 + hg * 0.05; transformed.x += sin(uSwT * 1.3 + ph) * k; transformed.z += cos(uSwT * 1.05 + ph * 1.3) * k * 0.6; }',
          key: 'mrSway' });
        break;
      }
      default: m = vcMat({ roughness: 0.5 });
    }
    return (M[k] = kp(m));
  }

  // ════════ Birleştirilmiş çizim: malzeme + 32 m'lik parça başına tek mesh ════════
  function batch(api) {
    const kits = {}, CK = 32;
    const B = {
      k(mk, x, z) { const key = mk + '|' + Math.floor(x / CK) + '|' + Math.floor(z / CK); return kits[key] || (kits[key] = new Kit()); },
      add(mk, geo, color, pos, rot, scl) { B.k(mk, pos[0], pos[2]).add(geo, color, pos, rot, scl); return B; },
      done() {
        for (const key in kits) {
          const k = kits[key]; if (!k.parts.length) continue;
          const mk = key.split('|')[0], mesh = new THREE.Mesh(k.build(), mat(mk));
          mesh.castShadow = false; mesh.receiveShadow = mk !== 'glow';
          mesh.name = 'mercan-' + mk; api.add(mesh);
        }
      },
    };
    return B;
  }

  // ════════ Paylaşılan geometriler ════════
  let BLADE = null;
  function bladeGeo() {   // deniz otu yaprağı: 8 dilimli, uca doğru incelen, hafif dalgalı şerit (y 0..1)
    if (BLADE) return BLADE;
    const g = new THREE.PlaneGeometry(1, 1, 1, 8); g.translate(0, 0.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - 0.85 * y) + Math.sin(y * 7) * 0.12); p.setZ(i, Math.sin(y * 4) * 0.15); }
    g.computeVertexNormals(); g.userData.keep = true;
    return (BLADE = g);
  }

  // ════════ Kenar noktaları: yürünür alanın hemen dışında (dekor), dış normali ile ════════
  function edgeSpots(L, api, o = {}) {
    const d0 = o.dmin ?? 0.5, d1 = o.dmax ?? 1.6, sp = o.space ?? 2.6, out = [], cell = {};
    const DIRS = []; for (let k = 0; k < 12; k++) DIRS.push([Math.sin(k * PI / 6), Math.cos(k * PI / 6)]);
    for (let z = 0.5; z < L.H; z += 1) for (let x = 0.5; x < L.W; x += 1) {
      if (api.isFloor(x, z)) continue;
      let nx = 0, nz = 0, near = false, tooNear = false;
      for (const [dx, dz] of DIRS) {
        if (api.isFloor(x + dx * d1, z + dz * d1)) { near = true; nx -= dx; nz -= dz; }
        if (api.isFloor(x + dx * d0, z + dz * d0)) tooNear = true;
      }
      if (!near || tooNear) continue;
      const ck = Math.floor(x / sp) + ',' + Math.floor(z / sp);
      if (cell[ck]) continue;
      if (o.avoid && o.avoid.some(q => hyp(q.x - x, q.z - z) < q.r)) continue;
      cell[ck] = 1;
      const l = hyp(nx, nz) || 1;
      out.push({ x: x + (api.rnd() - 0.5) * 0.6, z: z + (api.rnd() - 0.5) * 0.6, nx: nx / l, nz: nz / l, south: nz / l > 0.55 });
    }
    return out;
  }
  // en yakın odanın alanı (0..3; arena 4)
  function areaAt(L, x, z) {
    let best = 0, bd = 1e9;
    L.rooms.forEach((r, i) => { const d = hyp(r.x - x, r.z - z) - (r.r || 6); if (d < bd) { bd = d; best = i; } });
    const rm = L.rooms[best];
    if (rm && rm.kind === 'boss') return 4;
    const a = (L.areas || []).findIndex(q => q.rooms.includes(best));
    return a < 0 ? 0 : Math.min(3, a);
  }
  function edge(api, rm, dx, dz, max = 22) {
    let d = 0;
    while (d < max && api.isFloor(rm.x + dx * (d + 0.5), rm.z + dz * (d + 0.5))) d += 0.5;
    return { x: rm.x + dx * d, z: rm.z + dz * d, d };
  }
  function roomSpot(api, rm, o, taken) {
    for (let t = 0; t < 40; t++) {
      const a = api.rnd() * TAU, d = (rm.r || 6) * (o.pmin + api.rnd() * (o.pmax - o.pmin)), x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
      if (!api.isFloor(x, z) || !api.circleFree(x, z, o.r || 1)) continue;
      if (taken.some(q => hyp(q.x - x, q.z - z) < q.r + (o.r || 1))) continue;
      if (api.linkDist(x, z) < (o.link ?? 0)) continue;
      return { x, z };
    }
    return null;
  }

  // ════════ Yerleşim (saf veri) ════════
  function yerlesim(L, api) {
    const R = L.rooms, A = L.areas || [], room = i => R[i];
    const mainOf = a => (a ? a.rooms.filter(i => R[i] && R[i].kind !== 'side') : []);
    const a1 = mainOf(A[0]), a2 = mainOf(A[1]), a3 = mainOf(A[2]), a4 = mainOf(A[3]);
    const D = L.mr = { vents: [], oysters: [], gold: [], ship: null, secrets: [], piles: [], taken: [] };
    const taken = D.taken;
    if (L.start) taken.push({ x: L.start.x, z: L.start.z, r: 3 });
    for (const c of L.checkpoints || []) taken.push({ x: c.x, z: c.z, r: 2 });
    if (L.exit) taken.push({ x: L.exit.x, z: L.exit.z, r: 4 });
    // Kabarcık bacaları: Kabuk Kumsalı'nın 2. odasında 3'lü zincir (+ tepede altın şeker), Batık Gemi Koyu'nda 2'li
    const chain = (rm, n, gold) => {
      if (!rm) return;
      for (let tries = 0; tries < 8; tries++) {
        const pts = [], p0 = roomSpot(api, rm, { pmin: 0.15, pmax: 0.55, r: 1.3 }, taken);
        if (!p0) continue;
        pts.push(p0); let ang = api.rnd() * TAU;
        for (let i = 1; i < n; i++) {
          let got = null;
          for (let s = 0; s < 14 && !got; s++) {
            const a = ang + (s % 2 ? 1 : -1) * Math.ceil(s / 2) * 0.45, q = pts[i - 1], x = q.x + Math.sin(a) * 4, z = q.z + Math.cos(a) * 4;
            if (api.isFloor(x, z) && api.circleFree(x, z, 1.3) && hyp(x - rm.x, z - rm.z) < (rm.r || 6) + 1 && pts.every(p => hyp(p.x - x, p.z - z) > 3.2) && !taken.some(q2 => hyp(q2.x - x, q2.z - z) < q2.r + 1.2)) { got = { x, z }; ang = a; }
          }
          if (!got) break;
          pts.push(got);
        }
        if (pts.length < n) continue;
        const base = D.vents.length;
        pts.forEach((p, i) => { D.vents.push({ x: p.x, z: p.z, r: 1.0, to: i < n - 1 ? base + i + 1 : null }); taken.push({ x: p.x, z: p.z, r: 2.2 }); });
        if (gold) D.gold.push({ x: (pts[0].x + pts[1].x) / 2, y: 2.7, z: (pts[0].z + pts[1].z) / 2, high: true, sticker: 'gizli_mercan_kabarcik' });
        return;
      }
    };
    chain(room(a1[1] ?? a1[0]), 3, true);
    chain(room(a3[1] ?? a3[0]), 2, false);
    // İnci istiridyeleri: her alanda (yaklaşınca açılır, şeker saçar)
    for (const ri of [a1[0], a2[0], a2[1], a3[1], a4[0]]) {
      const rm = room(ri); if (!rm) continue;
      const p = roomSpot(api, rm, { pmin: 0.45, pmax: 0.8, r: 1.0 }, taken);
      if (p) { D.oysters.push({ x: p.x, z: p.z, yaw: Math.atan2(rm.x - p.x, rm.z - p.z) }); taken.push({ x: p.x, z: p.z, r: 2 }); p.solid = api.solid(p.x, p.z, 0.55, 'istiridye'); }
    }
    // Batık oyuncak gemi: Batık Gemi Koyu'nun 1. odasında, yolun uğramadığı kuzey yarıda (kamera açısında tam görünür);
    // önünde (oda ortasına doğru) hazine sandığı. Yer yoksa kuzey kıyının hemen dışına (eski yer).
    {
      const rm = room(a3[0] ?? a3[1]);
      if (rm) {
        let best = null;
        for (let q = 0; q < 24; q++) {
          const a = PI + (q / 24 - 0.5) * PI * 1.3, d = (rm.r || 7) * (0.42 + (q % 3) * 0.08), sx = rm.x + Math.sin(a) * d, sz = rm.z + Math.cos(a) * d;
          const ux = rm.x - sx, uz = rm.z - sz, ul = hyp(ux, uz) || 1, lx = -uz / ul, lz = ux / ul;   // lx,lz: geminin boyu (kıyıya teğet)
          let ok = api.isFloor(sx, sz);
          for (const k of [-1.7, 0, 1.7]) if (!api.circleFree(sx + lx * k, sz + lz * k, 1.25) || api.linkDist(sx + lx * k, sz + lz * k) < 2.8) ok = false;
          const tx = sx + ux / ul * 2.3, tz = sz + uz / ul * 2.3;
          if (!ok || !api.isFloor(tx, tz) || !api.circleFree(tx, tz, 0.8)) continue;
          const sc = api.linkDist(sx, sz) - Math.abs(sz - (rm.z - (rm.r || 7) * 0.5)) * 0.3;
          if (!best || sc > best.sc) best = { sc, x: sx, z: sz, yaw: Math.atan2(lx, lz), tx, tz, inside: true, lx, lz };
        }
        if (!best) for (const ang of [0, 0.45, -0.45, 0.9, -0.9]) {
          const dx = Math.sin(PI + ang), dz = Math.cos(PI + ang), e = edge(api, rm, dx, dz);
          if (e.d < 3.5) continue;
          const sx = e.x + dx * 2.4, sz = e.z + dz * 2.4, tx = e.x - dx * 1.3, tz = e.z - dz * 1.3;
          if (!api.circleFree(tx, tz, 0.9)) continue;
          best = { x: sx, z: sz, yaw: Math.atan2(dx, dz) + PI / 2, tx, tz, inside: false, lx: Math.sin(Math.atan2(dx, dz) + PI / 2), lz: Math.cos(Math.atan2(dx, dz) + PI / 2) };
          break;
        }
        if (best) {
          D.ship = best;
          for (const k of [-1.7, 0, 1.7]) api.solid(best.x + best.lx * k, best.z + best.lz * k, 1.15, 'gemi');
          taken.push({ x: best.tx, z: best.tz, r: 2.0 }, { x: best.x, z: best.z, r: 3.4 });
        }
      }
    }
    // Gizli köşeler: yan odalarda dev istiridye (kocaman inci) ve mesaj şişesi
    R.forEach((rm, i) => {
      if (rm.kind !== 'side') return;
      const kind = D.secrets.length === 0 ? 'inci' : 'sise';
      const p = roomSpot(api, rm, { pmin: 0.1, pmax: 0.45, r: 1.2 }, taken) || { x: rm.x, z: rm.z };
      D.secrets.push({ kind, x: p.x, z: p.z, room: i }); taken.push({ x: p.x, z: p.z, r: 2.4 });
    });
    // Kum yığınları (üstüne basınca şeker fışkırır): Kabuk Kumsalı ve Mercan Ormanı'nda birkaç tane
    for (const ri of [a1[0], a1[1], a2[1], a4[0]]) {
      const rm = room(ri); if (!rm) continue;
      const p = roomSpot(api, rm, { pmin: 0.3, pmax: 0.8, r: 0.7 }, taken);
      if (p) { D.piles.push(p); taken.push({ x: p.x, z: p.z, r: 1.5 }); }
    }
    // Mini oyun köşesi: Mercan Ormanı'nda "Kabarcık Patlat" (yoksa kayıtlı ilk mini oyun)
    try {
      if (typeof MINIGAME !== 'undefined' && MINIGAME && MINIGAME.list) {
        const ids = MINIGAME.list(), id = ids.find(i => /kabarcik|baloncuk|deniz|balik/i.test(i)) || ids[0], rm = room(a2[1] ?? a2[0]);
        const p = id && rm && roomSpot(api, rm, { pmin: 0.35, pmax: 0.75, r: 1.1 }, taken);
        if (p) { (L.stations || (L.stations = [])).push({ id: 'mini_' + id, kind: 'mini', mini: id, x: p.x, z: p.z, r: 1.0 }); D.mini = { x: p.x, z: p.z, id }; taken.push({ x: p.x, z: p.z, r: 2.2 }); }
      }
    } catch (e) { /* mini oyun yok */ }
    // Arena: kuzeyinde dev istiridye (İnci Sarayı)
    const arenaA = A.find(a => a.boss), arena = arenaA ? room(arenaA.rooms[0]) : null;
    if (arena) { const e = edge(api, arena, 0, -1); D.arena = { x: arena.x, z: arena.z, r: arena.r || 10, nx: e.x, nz: e.z - 4.5 }; }
    // özel yerlerin çevresinde huysuz başlamasın
    if (L.spawns) L.spawns = L.spawns.filter(s => !taken.some(q => hyp(q.x - s.x, q.z - s.z) < q.r + 1.2) || s.boss);
    // her ana odada en az 3 huysuz (alanına uygun türler; bölüm biraz daha uzun sürsün, 5 yaşa uygun küçük gruplar)
    if (L.spawns) {
      const MIX = [['balonBaligi', 'taklaYildiz'], ['kopukAhtapot', 'taklaYildiz', 'balonBaligi'], ['denizAti', 'kopukAhtapot', 'balonBaligi'], ['denizAti', 'taklaYildiz', 'kopukAhtapot']];
      let pack = L.spawns.reduce((m, q) => Math.max(m, q.pack | 0), 0) + 1;
      A.forEach((ar, k) => {
        if (ar.boss || k > 3) return;
        for (const ri of ar.rooms) {
          const rm = R[ri]; if (!rm || ri === 0 || rm.kind === 'side') continue;
          const have = L.spawns.filter(q => q.room === ri).length, need = (k === 3 ? 5 : 3) - have;
          for (let n = 0; n < need; n++) {
            const p = roomSpot(api, rm, { pmin: 0.15, pmax: 0.75, r: 0.8 }, taken.concat(L.spawns.map(q => ({ x: q.x, z: q.z, r: 1.4 }))));
            if (!p) break;
            const ty = MIX[k][(n + ri) % MIX[k].length];
            L.spawns.push({ type: ty, x: p.x, z: p.z, elite: k === 3 && n === 0, pack, room: ri, xpScale: 1 });
          }
          pack++;
        }
      });
    }
  }

  // ════════ Modeller (yerel koordinat; B.k(mk,x,z) kitine push/pop ile) ════════
  const NOISE = (x, z) => Math.sin(x * 1.7 + Math.sin(z * 1.3) * 2) * 0.5 + 0.5;
  function brainCoral(B, x, z, s, rnd) {
    const k = B.k('gloss', x, z), c0 = C(PAL.brain[(rnd() * 4) | 0]), c1 = c0.clone().lerp(C(0xffffff), 0.45);
    k.push([x, 0, z], [0, rnd() * TAU, 0], s);
    k.add(G.sphere(18, 12), (wx, wy, wz) => tmpC.copy(c0).lerp(c1, Math.pow(Math.abs(Math.sin((wx * 6 + Math.sin(wz * 5) * 1.6) / s)), 3)), [0, 0.32, 0], null, [1, 0.72, 0.95]);
    k.pop();
  }
  function branchCoral(B, x, z, s, rnd) {
    const k = B.k('gloss', x, z), g = B.k('glow', x, z), ci = PAL.coral[(rnd() * PAL.coral.length) | 0], c0 = C(ci), c1 = C(ci).lerp(C(0xffffff), 0.35), tip = C(ci).lerp(C(0xffffff), 0.6).multiplyScalar(1.5);
    k.push([x, 0, z], [0, rnd() * TAU, 0], s); g.push([x, 0, z], [0, 0, 0], s);
    k.add(G.sphere(10, 7), c0, [0, 0.1, 0], null, [0.45, 0.25, 0.45]);
    const grow = (p, dir, len, r, lvl) => {
      const e = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
      k.seg(p, e, r, lvl ? c1 : c0, r * 0.75, 6);   // SADE: üçgen bütçesi
      if (lvl >= 2) { g.add(G.sphere(6, 4), tip, e, null, r * 0.95); return; }
      k.add(G.sphere(6, 4), c1, e, null, r * 0.75);
      const n = 2 + ((rnd() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, sp = 0.35 + rnd() * 0.35, d = [dir[0] * 0.7 + Math.sin(a) * sp, 0.75 + rnd() * 0.3, dir[2] * 0.7 + Math.cos(a) * sp], l = hyp(...d);
        grow(e, [d[0] / l, d[1] / l, d[2] / l], len * (0.65 + rnd() * 0.2), r * 0.72, lvl + 1);
      }
    };
    for (let i = 0; i < 2; i++) { const a = i * 3.1 + rnd(); grow([Math.sin(a) * 0.15, 0.15, Math.cos(a) * 0.15], [Math.sin(a) * 0.3, 0.95, Math.cos(a) * 0.3], 0.55 + rnd() * 0.25, 0.1, 0); }
    k.pop(); g.pop();
  }
  function fanCoral(B, x, z, s, rnd, yaw) {
    const k = B.k('gloss', x, z), ci = [0xb98aff, 0xff6f91, 0xffb04a, 0x6fd6ff][(rnd() * 4) | 0], c0 = C(ci), c1 = C(ci).lerp(C(0xffffff), 0.55), dark = C(ci).multiplyScalar(0.45);
    k.push([x, 0, z], [0, yaw ?? rnd() * TAU, 0], s);
    k.seg([0, 0, 0], [0, 0.55, 0], 0.07, dark, 0.05, 8);
    k.add(G.sphere(22, 12), (wx, wy, wz) => {
      const u = (wx + wz) / s * 9, v = wy / s * 9, lat = Math.abs(Math.sin(u)) < 0.22 || Math.abs(Math.sin(v + Math.sin(u * 0.5))) < 0.22;
      return tmpC.copy(lat ? c1 : c0).lerp(dark, lat ? 0 : 0.25);
    }, [0, 1.25, 0], null, [1.05, 0.9, 0.05]);
    k.pop();
  }
  function tubeSponge(B, x, z, s, rnd) {
    const k = B.k('gloss', x, z), ci = [0xffc94a, 0xff8a5a, 0xc89aff, 0x7fe0c0][(rnd() * 4) | 0], c0 = C(ci), inner = C(ci).multiplyScalar(0.35);
    k.push([x, 0, z], [0, rnd() * TAU, 0], s);
    const n = 3 + ((rnd() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, d = i ? 0.28 : 0, h = 0.6 + rnd() * 0.9, r = 0.16 + rnd() * 0.08, px = Math.sin(a) * d, pz = Math.cos(a) * d;
      k.add(G.cyl(1, 0.85, 14), c0, [px, h / 2, pz], [Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15], [r, h, r]);
      k.add(G.torus(TAU, 0.25, 14), c0.clone().lerp(C(0xffffff), 0.3), [px + Math.sin(a) * 0.07, h, pz + Math.cos(a) * 0.07], [PI / 2, 0, 0], [r, r, r]);
      k.add(G.cyl(1, 1, 12), inner, [px + Math.sin(a) * 0.07, h - 0.01, pz + Math.cos(a) * 0.07], null, [r * 0.85, 0.02, r * 0.85]);
    }
    k.pop();
  }
  function anemone(B, x, z, s, rnd) {
    s *= 0.7;   // SADE8: deniz şakayıkları/kestaneleri küçük (yürünür alan kenarında kamerayı kapatmasın)
    const k = B.k('gloss', x, z), w = B.k('sway', x, z), ci = [0xff7ab0, 0xffa04a, 0xb98aff, 0x7fe8d0][(rnd() * 4) | 0], c0 = C(ci).lerp(C(0xffffff), 0.2), tipc = C(ci).lerp(C(0xffffff), 0.7).multiplyScalar(1.15);
    k.push([x, 0, z], null, s);
    k.add(G.cyl(0.8, 1, 16), c0.clone().multiplyScalar(0.7), [0, 0.18, 0], null, [0.32, 0.36, 0.32]);
    k.add(G.sphere(12, 8), C(0xffe0a0), [0, 0.37, 0], null, [0.12, 0.04, 0.12]);
    k.pop();
    for (let i = 0; i < 11; i++) {   // SADE: daha az dokunaç (üçgen bütçesi)
      const a = i * 2.39996, d = 0.1 + (i % 4) * 0.05, out = 0.35 + (i % 3) * 0.12;
      const px = x + Math.sin(a) * d * s, pz = z + Math.cos(a) * d * s;
      w.add(G.cone(6), (wx, wy) => tmpC.copy(c0).lerp(tipc, Math.min(1, (wy - 0.35 * s) / (0.5 * s))), [px + Math.sin(a) * 0.15 * s, 0.6 * s, pz + Math.cos(a) * 0.15 * s],
        [Math.cos(a) * out, 0, -Math.sin(a) * out], [0.035 * s, 0.55 * s, 0.035 * s]);
    }
  }
  function seaweed(B, x, z, h, rnd, set) {
    const w = B.k('sway', x, z), [c0, c1] = set || PAL.weed[(rnd() * PAL.weed.length) | 0], a = C(c0), b = C(c1);
    const n = 3 + ((rnd() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const hh = h * (0.6 + rnd() * 0.5), px = x + (rnd() - 0.5) * 0.7, pz = z + (rnd() - 0.5) * 0.7;
      w.add(bladeGeo(), (wx, wy) => tmpC.copy(a).lerp(b, Math.min(1, wy / hh)), [px, 0, pz], [(rnd() - 0.5) * 0.25, rnd() * TAU, (rnd() - 0.5) * 0.25], [0.28 + rnd() * 0.12, hh, 1]);
    }
  }
  function kelp(B, x, z, h, rnd) {
    const w = B.k('sway', x, z), a = C(0x8a9a2a), b = C(0xd8e86a);
    for (let i = 0; i < 3; i++) {
      const hh = h * (0.7 + rnd() * 0.4), px = x + (rnd() - 0.5) * 1.2, pz = z + (rnd() - 0.5) * 1.2;
      w.add(bladeGeo(), (wx, wy) => tmpC.copy(a).lerp(b, Math.min(1, wy / hh)), [px, 0, pz], [0, rnd() * TAU, 0], [0.55, hh, 1.2]);
      for (let q = 1; q < 4; q++) w.add(G.sphere(8, 6), C(0xe0c84a), [px + Math.sin(q * 2) * 0.15, hh * q / 4.2, pz + Math.cos(q * 2) * 0.15], null, 0.09);
    }
  }
  function rock(B, x, z, s, rnd) {
    const k = B.k('matte', x, z), base = C([0x6a8aa8, 0x7a9ab0, 0x8a8aa8][(rnd() * 3) | 0]), top = C(0xff9ab4);
    k.push([x, 0, z], [rnd() * 0.3, rnd() * TAU, rnd() * 0.3], s);
    // SADE6: yukarıdan "desenli düz disk" gibi okunmasın → yuvarlak, yüksekçe, tek renkli taş (üstü açık), tepesinde minik pembe mercan
    k.add(G.ico(2), (wx, wy) => tmpC.copy(base).lerp(C(0xdde8f2), Math.max(0, Math.min(1, wy / (0.9 * s))) * 0.45), [0, 0.32, 0], null, [0.9, 0.78, 0.8]);
    k.pop();
    B.k('gloss', x, z).add(G.sphere(8, 6), top, [x + 0.15 * s, 0.98 * s, z + 0.1 * s], null, 0.13 * s).add(G.sphere(8, 6), top, [x - 0.05 * s, 1.0 * s, z - 0.08 * s], null, 0.1 * s);
  }
  function sandMound(B, x, z, s) {
    // SADE6: düz sarı leke gibi okunmasın → küçük, yüksekçe kum tepeciği (yamacı koyu, tepesi açık) + üstünde deniz yosunu tutamı
    B.k('matte', x, z).add(G.sphere(14, 8), (wx, wy) => tmpC.setHex(0xd9a868).lerp(C(0xffe2b0), Math.max(0, Math.min(1, (wy + 0.1 * s) / (0.7 * s)))), [x, -0.1 * s, z], null, [s * 1.1, s * 0.8, s * 0.95]);
    const w = B.k('sway', x, z); for (let i = 0; i < 3; i++) w.add(bladeGeo(), (wx, wy) => tmpC.setHex(0x3faa7a).lerp(C(0x9ae8a8), Math.min(1, (wy - 0.5 * s) / (0.6 * s))), [x + (i - 1) * 0.15, s * 0.55, z], [0, i * 2.1, 0], [0.22, 0.55 * s, 1]);
  }
  function scallop(B, x, z, s, rnd, yaw, y0 = 0) {
    const k = B.k('pearl', x, z), c0 = C(PAL.shell[(rnd() * PAL.shell.length) | 0]), c1 = c0.clone().lerp(C(0xff8ab0), 0.35);
    const yw = yaw ?? rnd() * TAU;
    k.push([x, y0, z], [0, yw, 0], s);
    k.push([0, 0.08, 0], [-0.5, 0, 0]);
    k.add(G.sphere(16, 8), (wx, wy, wz) => { const a = Math.atan2(wx - x, wz - z); return tmpC.copy(c0).lerp(c1, Math.pow(Math.abs(Math.sin(a * 9 + yw)), 4)); }, [0, 0, 0], null, [0.5, 0.12, 0.45]);
    k.pop();
    k.add(G.box(), c0, [0, 0.05, -0.42], null, [0.25, 0.08, 0.14]);
    k.pop();
  }
  function conch(B, x, z, s, rnd) {
    const k = B.k('pearl', x, z), c0 = C(0xffd0b8), c1 = C(0xff9ab0);
    k.push([x, 0.18 * s, z], [0, rnd() * TAU, 0.25], s);
    for (let i = 0; i < 7; i++) { const t = i / 6, r = 0.32 * (1 - t * 0.8), a = t * PI * 2.5; k.add(G.sphere(10, 8), tmpC.copy(c0).lerp(c1, t).clone(), [Math.sin(a) * r * 0.3, t * 0.2, -0.4 + t * 0.75], null, [r, r * 0.9, r * 1.1]); }
    k.add(G.cone(12), c0, [0, 0.05, 0.5], [PI / 2, 0, 0], [0.12, 0.35, 0.12]);
    k.add(G.sphere(12, 8), C(0xffe8f0), [0.18, 0.02, -0.25], null, [0.12, 0.2, 0.3]);
    k.pop();
  }
  function starDecor(B, x, z, s, rnd) {
    const k = B.k('gloss', x, z), c0 = C([0xff7f4a, 0xff6f91, 0xb98aff, 0xffc94a][(rnd() * 4) | 0]);
    k.push([x, 0.04, z], [0, rnd() * TAU, 0], s);
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; k.add(G.sphere(8, 5), c0, [Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2], [0, a, 0], [0.08, 0.04, 0.22]); }
    k.add(G.sphere(10, 6), c0, [0, 0.01, 0], null, [0.12, 0.05, 0.12]);
    k.pop();
  }
  function pebbles(B, x, z, rnd) {
    const k = B.k('matte', x, z);
    for (let i = 0; i < 4; i++) k.add(G.sphere(8, 6), C([0xe8d8c8, 0xc8d8e8, 0xf0e0f0, 0xb8c8d8][i]), [x + (rnd() - 0.5) * 0.8, 0.03, z + (rnd() - 0.5) * 0.8], null, [0.1 + rnd() * 0.08, 0.05, 0.08 + rnd() * 0.08]);
  }
  // mercan sütunu (arena kenarı / mağara): üst üste renkli tomurcuklar
  function coralPillar(B, x, z, h, rnd) {
    const k = B.k('gloss', x, z), g = B.k('glow', x, z);
    for (let i = 0; i < 6; i++) {
      const t = i / 5, c0 = C(PAL.coral[(i + ((rnd() * 7) | 0)) % 7]), r = 0.9 - t * 0.35;
      k.add(G.sphere(12, 8), c0, [x + Math.sin(i * 1.7) * 0.15, t * h + 0.3, z + Math.cos(i * 1.7) * 0.15], [0, i, 0], [r, r * 0.8, r]);
      if (i % 2) for (let q = 0; q < 3; q++) { const a = q * 2.1 + i; g.add(G.sphere(6, 4), C(0xfff0c8, 1.6), [x + Math.sin(a) * r * 0.95, t * h + 0.4, z + Math.cos(a) * r * 0.95], null, 0.07); }
    }
  }
  // geçit kemeri: mercan yay + tomurcuklar + parlayan inciler
  // SADE/QA: geçitte yolun üstünden geçen yüksek kemer Feza'yı kameradan saklıyordu → iki yanda alçak mercan direkleri (geçit yine belli)
  function coralArch(B, x, z, yaw, w, rnd) {
    const k = B.k('gloss', x, z), g = B.k('glow', x, z), c0 = C(0xff8ab0), c1 = C(0xffc0d8);
    k.push([x, 0, z], [0, yaw, 0]);
    for (const sd of [-1, 1]) {
      const px = sd * w / 2;
      k.add(G.cyl(1, 1, 14), (wx, wy) => tmpC.copy(c0).lerp(c1, Math.min(1, wy / 1.2)), [px, 0.55, 0], null, [0.2, 1.1, 0.2]);
      for (let i = 0; i < 3; i++) k.add(G.sphere(8, 6), C(PAL.coral[(i + (sd > 0 ? 3 : 0)) % 7]), [px + (i - 1) * 0.16, 1.15 + (i % 2) * 0.12, 0], null, 0.2 + (i % 2) * 0.06);
      g.add(G.sphere(10, 8), C(0xfff4ff, 1.5), [px, 1.42, 0.05], null, 0.1);
    }
    void rnd;
    k.pop();
  }


  // ════════ SADE5: belirgin yol — açık krem kum şerit, turkuaz kenar çizgisi, kenarında beyaz/pembe deniz kabukları ════════
  let PATHTEX = null;
  function pathTex() {
    if (PATHTEX) return PATHTEX;
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(120,206,204,0)'); g.addColorStop(0.07, 'rgba(120,206,204,0.7)'); g.addColorStop(0.12, 'rgba(255,248,232,0.95)');
    g.addColorStop(0.88, 'rgba(255,248,232,0.95)'); g.addColorStop(0.93, 'rgba(120,206,204,0.7)'); g.addColorStop(1, 'rgba(120,206,204,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    // ZEMİN: yolda ince çakıl/kabuk kırıntısı dokusu (düşük kontrast; kenar şeridine dokunmaz)
    let sd = 11; const rn = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) { const px = 9 + rn() * 46, py = rn() * 64, r = 0.6 + rn() * 1.4; x.fillStyle = rn() < 0.5 ? 'rgba(190,160,120,0.24)' : 'rgba(255,255,255,0.32)'; x.beginPath(); x.ellipse(px, py, r * 1.3, r, rn() * 3, 0, TAU); x.fill(); }
    PATHTEX = new THREE.CanvasTexture(c); PATHTEX.colorSpace = THREE.SRGBColorSpace; PATHTEX.wrapT = THREE.RepeatWrapping; PATHTEX.userData.keep = true;
    return PATHTEX;
  }
  function pathStrip(api, B, L, rnd) {
    const P0 = L.path || []; if (P0.length < 2) return;
    // yolu yumuşat ve eşit aralıkla örnekle
    const curve = new THREE.CatmullRomCurve3(P0.map(p => new THREE.Vector3(p.x, 0, p.z)));
    const N = Math.max(16, Math.round(curve.getLength() / 0.5)), sp = curve.getSpacedPoints(N), w = 1.05;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const a = sp[Math.max(0, i - 1)], b = sp[Math.min(N, i + 1)], dx = b.x - a.x, dz = b.z - a.z, l = hyp(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      pos.push(sp[i].x + nx * w, 0.03, sp[i].z + nz * w, sp[i].x - nx * w, 0.03, sp[i].z - nz * w); uv.push(0, i * 0.25, 1, i * 0.25);
      if (i < N) { const q = i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
      if (i % 4 === 2) for (const sd of [-1, 1]) {   // kenar kabukları (yassı, üstünden geçilir)
        const x = sp[i].x + nx * sd * (w + 0.12), z = sp[i].z + nz * sd * (w + 0.12);
        if (!api.isFloor(x, z)) continue;
        B.add('pearl', G.sphere(8, 5), C(rnd() < 0.5 ? 0xffffff : 0xffd0dc), [x, 0.03, z], [0, rnd() * TAU, 0], [0.14, 0.05, 0.11]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeVertexNormals(); api.dispose(g);
    const m = new THREE.MeshLambertMaterial({ map: pathTex(), color: new THREE.Color(1.22, 1.16, 1.06), transparent: true, depthWrite: false }); api.dispose(m);   // (aydınlık krem: kumdan net ayrılsın)
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 1; mesh.receiveShadow = true; mesh.name = 'mercan-yol'; api.add(mesh);
  }
  // ════════ SADE5: girişte el sallayan sevimli yengeç (dokununca/yaklaşınca zıplar, kabarcık üfler) ════════
  function crab(api, L, x, z) {
    const k = new Kit(), red = 0xff7a5c, lt = 0xffb39a;
    k.add(G.sphere(16, 10), C(red), [0, 0.32, 0], null, [0.5, 0.26, 0.4]);
    k.add(G.sphere(12, 8), C(lt), [0, 0.26, 0.12], null, [0.36, 0.14, 0.28]);
    for (const sd of [-1, 1]) {
      k.seg([sd * 0.14, 0.45, 0.18], [sd * 0.18, 0.7, 0.2], 0.035, C(red));
      k.add(G.sphere(10, 8), C(0xffffff), [sd * 0.18, 0.74, 0.22], null, 0.09);
      k.add(G.sphere(8, 6), C(0x2a1a2a), [sd * 0.18, 0.75, 0.3], null, 0.045);
      for (let q = 0; q < 3; q++) k.seg([sd * 0.4, 0.26, 0.05 - q * 0.14], [sd * 0.62, 0.05, 0.08 - q * 0.16], 0.03, C(red));
      k.add(G.sphere(10, 6), C(0xff8fa8), [sd * 0.3, 0.27, 0.32], null, [0.06, 0.04, 0.02]);   // al yanaklar
    }
    k.add(G.torus(PI, 0.12, 12), C(0x7a2a2a), [0, 0.3, 0.38], [PI, 0, 0], [0.09, 0.06, 0.05]);   // gülümseme
    const body = new THREE.Mesh(k.build(), mat('gloss')); body.castShadow = true;
    const clawK = new Kit(); clawK.add(G.sphere(10, 8), C(red), [0, 0, 0], null, [0.16, 0.12, 0.1]); clawK.add(G.sphere(8, 6), C(lt), [0.06, 0.08, 0], [0, 0, 0.4], [0.08, 0.1, 0.06]);
    const cg = clawK.build(); api.dispose(cg); api.dispose(body.geometry);
    const g = new THREE.Group(); g.add(body);
    const claws = [-1, 1].map(sd => { const p = new THREE.Group(); p.position.set(sd * 0.42, 0.36, 0.12); const c = new THREE.Mesh(cg, mat('gloss')); c.position.set(sd * 0.12, 0.18, 0); c.scale.x = sd; p.add(c); g.add(p); return p; });
    g.position.set(x, 0, z); g.rotation.y = 0.2; api.add(g);
    let t = 0, hop = 0, cd = 0;
    api.anim((dt, hx, hz) => {
      t += dt; cd -= dt;
      const near = hyp(hx - x, hz - z) < 2.4;
      if (near && cd <= 0) { cd = 3; hop = 1; sfx('bubble', { x, z, pitch: 1.6, vol: 0.5 }); burst('bubble', x, 0.8, z, { count: 3, scale: 0.7 }); }
      hop = Math.max(0, hop - dt * 2.2);
      g.position.y = Math.sin(hop * PI) * 0.35;
      g.rotation.y = 0.2 + Math.atan2(hx - x, hz - z) * 0.0 + Math.sin(t * 0.8) * 0.15;
      claws[1].rotation.z = -0.4 - Math.abs(Math.sin(t * 5)) * 0.9;   // sağ kıskaçla el sallar
      claws[0].rotation.z = 0.2 + Math.sin(t * 1.3) * 0.1;
    });
  }

  // ════════ Gölgelendiriciler: zeminde ışık desenleri, ışık huzmeleri, kabarcıklar ════════
  const SHAFTS = [];
  let CAUS = null, SHAFT = null, BUBM = null, PLANKM = null, BUBTEX = null;
  function causticMat() {
    if (CAUS) return CAUS;
    CAUS = kp(new THREE.ShaderMaterial({
      uniforms: { uT: TIME.u, uC: { value: new THREE.Vector3() }, uK: { value: 0.1 }, uS: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3(0, 0, 0)) } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: [
        'uniform float uT; uniform vec3 uC; uniform float uK; uniform vec3 uS[6]; varying vec3 vW;',
        'float caus(vec2 p, float t){ vec2 i = p; float c = 1.0; const float inten = 0.005;',
        '  for (int n = 0; n < 4; n++) { float tt = t * (1.0 - (3.5 / float(n + 1))); i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));',
        '    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten))); }',
        '  c /= 4.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.0); }',
        'void main(){ vec2 p = mod(vW.xz * 0.42, 6.2831853) - 250.0;',
        '  float c = caus(p, uT * 0.45) + 0.6 * caus(p * 1.3 + 3.0, uT * 0.33);',
        '  float f = 1.0 - smoothstep(16.0, 30.0, length(vW.xz - uC.xz));',
        '  float sh = 0.0; for (int k = 0; k < 6; k++) { float d = length(vW.xz - uS[k].xy); sh += uS[k].z > 0.0 ? 1.0 - smoothstep(uS[k].z * 0.4, uS[k].z * 1.2, d) : 0.0; }',
        '  gl_FragColor = vec4(vec3(0.6, 0.95, 1.0) * min(c, 1.6) * uK * f * (1.0 + 0.5 * min(sh, 1.0)), 1.0); }',
      ].join('\n'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    return CAUS;
  }
  function shaftMat() {
    if (SHAFT) return SHAFT;
    SHAFT = kp(new THREE.ShaderMaterial({
      uniforms: { uT: TIME.u },
      vertexShader: 'attribute vec3 color; varying vec2 vUv; varying float vF; varying float vPh;' +
        'void main(){ vUv = uv; vPh = color.r; vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal);' +
        ' vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uT; varying vec2 vUv; varying float vF; varying float vPh;' +
        'void main(){ float a = smoothstep(0.0, 0.45, vUv.y) * (1.0 - smoothstep(0.8, 1.0, vUv.y)) * vF * vF;' +
        ' a *= 0.7 + 0.3 * sin(uT * 0.7 + vPh * 6.2831) * sin(uT * 0.43 + vPh * 11.0);' +
        ' gl_FragColor = vec4(vec3(0.75, 0.95, 1.0) * a * 0.22, 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    }));
    return SHAFT;
  }
  function bubbleTex() {
    if (BUBTEX) return BUBTEX;
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 18, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(0.75, 'rgba(220,250,255,0.35)'); g.addColorStop(0.92, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 30, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.ellipse(23, 21, 6, 4, -0.6, 0, TAU); x.fill();
    BUBTEX = new THREE.CanvasTexture(c); BUBTEX.colorSpace = THREE.SRGBColorSpace; BUBTEX.userData.keep = true;
    return BUBTEX;
  }
  // Kabarcık / plankton noktaları: konumlar gölgelendiricide hesaplanır (Feza'nın çevresinde döner, yükselir); CPU yalnız 2 sayı yazar
  function pointsMat(kind) {
    const VS = 'uniform float uT; uniform vec3 uC; uniform float uPx; uniform float uW; uniform float uH; uniform float uRise; attribute vec4 aS; varying float vA;' +
      'void main(){ vec3 p; p.x = uC.x + mod(position.x - uC.x, uW) - uW * 0.5; p.z = uC.z - uW * 0.35 + mod(position.z - uC.z + uW * 0.35, uW) - uW * 0.5;' +
      ' float y = mod(aS.x * uH + uT * uRise * aS.y, uH); p.y = 0.2 + y; p.x += sin(uT * 1.3 + aS.z * 6.28) * 0.35 * aS.y; p.z += cos(uT * 1.1 + aS.z * 5.0) * 0.2;' +
      ' vA = smoothstep(0.0, 0.8, y) * (1.0 - smoothstep(uH - 1.5, uH, y));' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = aS.w * uPx / -mv.z; gl_Position = projectionMatrix * mv; }';
    const FS = kind === 'bub'
      ? 'uniform sampler2D map; varying float vA; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(c.rgb, c.a * vA * 0.85); }'
      : 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = (1.0 - smoothstep(0.0, 1.0, d)); gl_FragColor = vec4(vec3(0.85, 1.0, 0.95) * a * vA * 0.9, 1.0); }';
    return kp(new THREE.ShaderMaterial({
      uniforms: { uT: TIME.u, uC: { value: new THREE.Vector3() }, uPx: { value: 400 }, uW: { value: kind === 'bub' ? 34 : 30 }, uH: { value: kind === 'bub' ? 11 : 6 },
        uRise: { value: kind === 'bub' ? 1.1 : 0.08 }, map: { value: kind === 'bub' ? bubbleTex() : null } },
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, fog: false,
      blending: kind === 'bub' ? THREE.NormalBlending : THREE.AdditiveBlending,
    }));
  }
  function pointsCloud(api, kind, n) {
    const mtl = kind === 'bub' ? (BUBM || (BUBM = pointsMat('bub'))) : (PLANKM || (PLANKM = pointsMat('plank')));
    const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4), W = mtl.uniforms.uW.value;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = Math.random() * W * 7; pos[i * 3 + 2] = Math.random() * W * 7;
      seed[i * 4] = Math.random(); seed[i * 4 + 1] = 0.5 + Math.random() * 0.8; seed[i * 4 + 2] = Math.random();
      seed[i * 4 + 3] = kind === 'bub' ? 0.12 + Math.pow(Math.random(), 3) * 0.35 : 0.05 + Math.random() * 0.06;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.BufferAttribute(seed, 4));
    const pts = new THREE.Points(g, mtl); pts.frustumCulled = false; pts.renderOrder = 4; api.add(pts);
    return mtl;
  }

  // ════════ Sürü balıklar + denizanaları (instanced; matrisler yalnız yakındayken güncellenir) ════════
  let FISHG = null, JELLYG = null, FISHM = null, JELLYM = null;
  function fishGeo() {
    if (FISHG) return FISHG;
    const k = new Kit();
    k.add(G.sphere(12, 8), 0xffffff, [0, 0, 0], null, [0.1, 0.13, 0.24]);
    k.add(G.cone(8), 0xffffff, [0, 0, -0.27], [-PI / 2, 0, 0], [0.11, 0.14, 0.03]);
    k.add(G.sphere(8, 6), 0xe8e8ff, [0, 0.12, -0.02], null, [0.02, 0.06, 0.1]);
    for (const sd of [-1, 1]) { k.add(G.sphere(8, 6), 0xffffff, [sd * 0.07, 0.03, 0.12], null, 0.04); k.add(G.sphere(6, 4), 0x101830, [sd * 0.095, 0.03, 0.135], null, 0.022); }
    FISHG = k.build(); FISHG.userData.keep = true;
    return FISHG;
  }
  function jellyGeo() {
    if (JELLYG) return JELLYG;
    const k = new Kit();
    k.add(G.hemi(20), 0xffffff, [0, 0, 0], null, [0.6, 0.55, 0.6]);
    k.add(G.torus(TAU, 0.18, 20), 0xffe0f8, [0, 0.02, 0], [PI / 2, 0, 0], [0.58, 0.58, 0.58]);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; k.add(G.cyl(0.6, 1, 6), 0xffe8ff, [Math.sin(a) * 0.3, -0.5, Math.cos(a) * 0.3], [Math.sin(a) * 0.1, 0, Math.cos(a) * 0.1], [0.035, 1.0, 0.035]); }
    for (const sd of [-1, 1]) k.add(G.sphere(8, 6), 0x2a1a3a, [sd * 0.16, 0.2, 0.52], null, [0.05, 0.07, 0.03]);
    k.add(G.torus(PI, 0.25, 10), 0x2a1a3a, [0, 0.08, 0.55], [0, 0, PI], [0.08, 0.06, 0.06]);
    JELLYG = k.build(); JELLYG.userData.keep = true;
    return JELLYG;
  }
  function schools(api, L, anchors) {
    if (!FISHM) FISHM = kp(rimify(vcMat({ roughness: 0.3 }), 0xffffff, 0.3, 2.4));
    if (!JELLYM) JELLYM = kp(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, transparent: true, opacity: 0.78, emissive: 0xff9ae0, emissiveIntensity: 0.45, depthWrite: false }));
    const NF = 7, S = anchors.fish, fish = new THREE.InstancedMesh(fishGeo(), FISHM, Math.max(1, S.length * NF));
    const FC = [0xffb03a, 0x5ad0ff, 0xff7aa8, 0xffe14a, 0x9a7aff, 0x6fe0a0];
    S.forEach((s, i) => { s.col = FC[i % FC.length]; for (let j = 0; j < NF; j++) fish.setColorAt(i * NF + j, C(s.col).lerp(C(0xffffff), (j % 3) * 0.15)); });
    fish.count = S.length * NF; fish.frustumCulled = false; api.add(fish);
    const J = anchors.jelly, jel = new THREE.InstancedMesh(jellyGeo(), JELLYM, Math.max(1, J.length));
    J.forEach((q, i) => jel.setColorAt(i, C([0xffb8e8, 0xc8b8ff, 0xb8f0ff, 0xffd0b8][i % 4])));
    jel.count = J.length; jel.frustumCulled = false; jel.renderOrder = 2; api.add(jel);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), p4 = new THREE.Vector3(), s4 = new THREE.Vector3();
    let t = 0;
    api.anim((dt, hx, hz) => {
      t += dt;
      S.forEach((s, i) => {
        const near = hyp(s.x - hx, s.z - hz) < 40;
        if (!near && s.done) return;
        s.done = true;
        for (let j = 0; j < NF; j++) {
          const ph = t * s.sp + j * 0.42, off = (j % 4) * 0.35, rr = s.r + Math.sin(j * 1.7) * 0.8;
          const x = s.x + Math.sin(ph) * rr + Math.sin(j * 2.3) * 0.4, z = s.z + Math.cos(ph) * rr * 0.6 + off, y = s.y + Math.sin(ph * 2 + j) * 0.35 + (j % 3) * 0.3;
          p4.set(x, y, z); e4.set(0, ph + PI / 2 * Math.sign(s.sp), Math.sin(t * 9 + j) * 0.12); q4.setFromEuler(e4); s4.setScalar(0.8 + (j % 3) * 0.2);
          fish.setMatrixAt(i * NF + j, m4.compose(p4, q4, s4));
        }
      });
      fish.instanceMatrix.needsUpdate = true;
      J.forEach((q, i) => {
        const pulse = Math.sin(t * 1.6 + i * 1.3);
        p4.set(q.x + Math.sin(t * 0.2 + i) * 0.6, q.y + Math.sin(t * 0.5 + i * 2) * 0.6, q.z); e4.set(Math.sin(t * 0.7 + i) * 0.12, t * 0.2 + i, 0); q4.setFromEuler(e4);
        s4.set(q.s * (1 + 0.08 * pulse), q.s * (1 - 0.1 * pulse), q.s * (1 + 0.08 * pulse));
        jel.setMatrixAt(i, m4.compose(p4, q4, s4));
      });
      jel.instanceMatrix.needsUpdate = true;
    });
  }

  // ════════ Etkileşim düzeni: kabarcık bacaları (Feza'yı zıplatır), altın şeker, istiridyeler, gizli köşeler ════════
  let GOLDG = null;
  function goldGeo() {
    if (GOLDG) return GOLDG;
    const k = new Kit(), g = C(0xffc93a), g2 = C(0xffe58a);
    k.add(G.sphere(14, 10), g, [0, 0, 0], null, [0.3, 0.24, 0.24]);
    for (const sd of [-1, 1]) { k.add(G.cone(10), g2, [sd * 0.38, 0, 0], [0, 0, sd * PI / 2], [0.17, 0.22, 0.17]); k.add(G.sphere(7, 5), g2, [sd * 0.5, 0, 0], null, [0.05, 0.16, 0.16]); }
    for (let i = 0; i < 3; i++) k.add(G.torus(TAU, 0.18, 14), C(0xfff2c0), [(-1 + i) * 0.12, 0, 0], [0, PI / 2, 0], [0.235, 0.235, 0.235]);
    GOLDG = k.build(); GOLDG.userData.keep = true;
    return GOLDG;
  }
  function rig(api, L) {
    const R = { fly: null, vents: [], picks: [], zones: [], lift: 0, cd: 0, trailT: 0, t: 0 };
    R.arc = (x1, z1, h, dur, onEnd) => { const P = GAME.P; R.fly = { t: 0, dur, x0: P.pos.x, z0: P.pos.z, x1, z1, h, onEnd }; };
    function setHero(x, y, z, face) {
      const P = GAME.P, H = GAME.H; P.pos.x = x; P.pos.z = z; if (face !== undefined) P.face = face;
      if (H && H.root) { H.root.position.set(x, y, z); H.root.rotation.y = P.face; }
      R.lift = y;
    }
    function landSpot(x0, z0, dx, dz) {
      const a0 = Math.atan2(dx, dz);
      for (const da of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2]) for (let d = 4; d >= 1.8; d -= 0.4) {
        const x = x0 + Math.sin(a0 + da) * d, z = z0 + Math.cos(a0 + da) * d;
        if (api.isFloor(x, z) && api.circleFree(x, z, 0.5) && !R.vents.some(v => hyp(v.x - x, v.z - z) < v.r + 0.4)) return { x, z };
      }
      return null;
    }
    let prev = null;
    api.anim(dt => {
      R.t += dt;
      for (const q of R.picks) if (q.obj && !q.got) { q.obj.position.y = q.y + Math.sin(R.t * 2.2 + q.ph) * 0.12; q.obj.rotation.y += dt * 2.4; }
      for (const v of R.vents) if (v.anim) v.anim(dt);
      if (!live()) { if (R.fly) { const f = R.fly; R.fly = null; R.lift = 0; GAME.P.pos.x = f.x1; GAME.P.pos.z = f.z1; } return; }
      const P = GAME.P;
      R.cd = Math.max(0, R.cd - dt);
      for (const q of R.picks) {
        if (q.got) continue;
        if (hyp(q.x - P.pos.x, q.z - P.pos.z) < (q.r || 1.1) && Math.abs((R.lift || 0) + 0.7 - q.y) < (q.dy || 1.4)) { q.got = true; if (q.obj) q.obj.visible = false; if (q.onGet) q.onGet(q); }
      }
      const f = R.fly;
      if (f) {
        f.t += dt; const u = Math.min(1, f.t / f.dur), x = lerp(f.x0, f.x1, u), z = lerp(f.z0, f.z1, u), y = 4 * f.h * u * (1 - u);
        setHero(x, y, z, Math.atan2(f.x1 - f.x0, f.z1 - f.z0));
        if ((R.trailT -= dt) <= 0) { R.trailT = 0.06; burst('bubble', x, y + 0.4, z, { count: 2, scale: 0.7 }); }
        if (u >= 1) { R.fly = null; setHero(x, 0, z); R.cd = 0.3; burst('bubble', x, 0.2, z, { count: 4 }); sfx('bubblePop', { x, z, vol: 0.5 }); if (f.onEnd) f.onEnd(); }
        prev = null; return;
      }
      if (R.cd <= 0) for (const v of R.vents) {
        if (hyp(v.x - P.pos.x, v.z - P.pos.z) > v.r) continue;
        let tx, tz;
        if (v.to !== null && R.vents[v.to]) { tx = R.vents[v.to].x; tz = R.vents[v.to].z; }
        else {
          let dx = prev ? P.pos.x - prev[0] : 0, dz = prev ? P.pos.z - prev[1] : 0;
          if (hyp(dx, dz) < 1e-3) { dx = Math.sin(P.face); dz = Math.cos(P.face); }
          const s = landSpot(v.x, v.z, dx, dz); if (!s) continue; tx = s.x; tz = s.z;
        }
        v.pop = 1; sfx('kabarcik', { x: v.x, z: v.z, vol: 0.9 }); sfx('bubble', { x: v.x, z: v.z, pitch: 0.8 });
        burst('bubble', v.x, 0.5, v.z, { count: 9, scale: 1.3 });
        R.arc(tx, tz, 2.8, 0.95);
        if (v.onUse) v.onUse(v);
        prev = null; return;
      }
      prev = [P.pos.x, P.pos.z];
      for (const zn of R.zones) {
        const inside = hyp(zn.x - P.pos.x, zn.z - P.pos.z) < zn.r;
        if (inside && !zn.in) { zn.in = true; if (zn.enter) zn.enter(zn); }
        else if (!inside && zn.in && hyp(zn.x - P.pos.x, zn.z - P.pos.z) > zn.r + 0.8) zn.in = false;
        if (zn.in && zn.tick) zn.tick(dt, zn);
      }
    });
    R.busy = () => !!R.fly;
    return R;
  }
  let ACTIVE = null;
  function goldSugar(api, R, x, y, z, o = {}) {
    const g = new THREE.Group(), m = new THREE.Mesh(goldGeo(), mat('pearl'));
    g.add(m); g.position.set(x, y, z); api.add(g);
    api.light(x, y + 0.3, z, 0xffd36a, 2.2, 4.5, 0.15);
    R.picks.push({ x, y, z, obj: g, r: o.r || 1.2, dy: o.dy || 1.4, ph: Math.random() * 6, onGet() {
      try { if (GAME.addGoldSugar) GAME.addGoldSugar(1); if (o.sticker && GAME.giveSticker) GAME.giveSticker(o.sticker, 'gizli'); } catch (e) { /* yok */ }
      burst('star', x, y, z, { count: 7 }); burst('confetti', x, y, z); sfx('star', { vol: 0.9 }); sfx('coin', { pitch: 1.5 });
      ftext(x, y + 0.8, z, 'Altın Şeker!', 'gold');
      say(['pr_mercan_altin1', 'pr_mercan_altin2'][(Math.random() * 2) | 0], { once: false, gap: 6 });
      if (o.onGet) o.onGet();
    } });
  }
  const coins = (x, z, n = 6) => { try { if (GAME.dropSugar) GAME.dropSugar(x, z, 8, n); } catch (e) { /* yok */ } };

  // Kabarcık bacası: taş halka + koyu ağız + içinden sürekli kabarcık; basınca "fışş" büyük kabarcık
  function ventLook(B, api, R, v) {
    const k = B.k('matte', v.x, v.z), g = B.k('glow', v.x, v.z);
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9; k.add(G.ico(1), C(i % 2 ? 0x8aa0b8 : 0xa8b8c8), [v.x + Math.sin(a) * 0.85, 0.12, v.z + Math.cos(a) * 0.85], [i, i * 2, 0], [0.32, 0.22, 0.28]); }
    k.add(G.cyl(1, 1, 20), C(0x2a4a6a), [v.x, 0.03, v.z], null, [0.68, 0.05, 0.68]);
    g.add(G.torus(TAU, 0.08, 24), C(0x8af0ff, 1.4), [v.x, 0.08, v.z], [PI / 2, 0, 0], [0.62, 0.62, 0.62]);
    api.glow(v.x, v.z, 2, 0x8af0ff, 0.25);
    let bt = Math.random();
    v.anim = dt => {
      if (!inZone()) return;
      const P = GAME.P; if (!P || hyp(P.pos.x - v.x, P.pos.z - v.z) > 22) return;
      if ((bt -= dt) <= 0) { bt = 0.22; burst('bubble', v.x + (Math.random() - 0.5) * 0.5, 0.3, v.z + (Math.random() - 0.5) * 0.5, { count: 1, scale: 0.9 }); }
    };
    R.vents.push(v);
  }
  // İnci istiridyesi: alt kabuk (sabit) + üst kabuk (açılır) + parlayan inci
  let OYG = null;
  function oysterGeos() {
    if (OYG) return OYG;
    const shell = (top) => {
      const k = new Kit(), c0 = C(top ? 0xb8a8d8 : 0xa898c8), c1 = C(0xf0e0ff);
      k.add(G.sphere(24, 12), (x, y, z) => { const a = Math.atan2(x, z + 0.5); return tmpC.copy(c0).lerp(c1, Math.pow(Math.abs(Math.sin(a * 8)), 3) * 0.6); }, [0, 0, 0.5], null, [0.62, top ? 0.16 : 0.2, 0.55]);
      k.add(G.sphere(20, 10), C(0xfff0f8), [0, top ? -0.04 : 0.05, 0.5], null, [0.54, 0.06, 0.48]);   // sedef iç
      return k.build();
    };
    OYG = { bot: shell(false), top: shell(true), pearl: new THREE.SphereGeometry(0.2, 18, 12) };
    for (const k in OYG) OYG[k].userData.keep = true;
    return OYG;
  }
  function oyster(api, R, o, big) {
    const s = big ? 1.6 : 1, gs = oysterGeos(), grp = new THREE.Group();
    grp.position.set(o.x, 0.05, o.z); grp.rotation.y = 0; grp.scale.setScalar(s);   // menteşe kuzeyde: kapak kameradan uzağa açılır
    if (big) api.solid(o.x, o.z, 0.75 * s, 'istiridye');
    const bot = new THREE.Mesh(gs.bot, mat('pearl')); bot.position.z = -0.5; grp.add(bot);
    const hinge = new THREE.Group(); hinge.position.set(0, 0.12, -0.5); grp.add(hinge);
    const top = new THREE.Mesh(gs.top, mat('pearl')); top.position.set(0, 0, 0); hinge.add(top);
    const pearlM = M.pearlGlow || (M.pearlGlow = kp(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.2, emissive: 0xffe8ff, emissiveIntensity: 0.6 })));
    const pearl = new THREE.Mesh(gs.pearl, pearlM); pearl.position.set(0, 0.2, 0); grp.add(pearl);
    api.add(grp); api.glow(o.x, o.z, 2.2 * s, 0xf0d8ff, 0.18);
    let open = 0, want = 0, t = Math.random() * 5, done = false;
    api.anim((dt, hx, hz) => {
      t += dt;
      const d = hyp(hx - o.x, hz - o.z);
      want = d < 2.6 * s ? 1 : 0.12 + 0.1 * Math.max(0, Math.sin(t * 0.7));
      open = damp(open, want, 5, dt);
      hinge.rotation.x = -open * 1.0;
      pearl.scale.setScalar(done ? 0.0001 : 1 + 0.05 * Math.sin(t * 3));
      pearl.position.y = 0.2 + open * 0.08;
      if (!done && d < 1.6 + 0.5 * s && open > 0.7 && live()) {
        done = true;
        burst('sparkle', o.x, 0.6 * s, o.z, { color: '#fff0ff', count: 12 }); burst('bubble', o.x, 0.5, o.z, { count: 6 }); sfx('bell', { x: o.x, z: o.z, pitch: 1.4 }); sfx('star', { vol: 0.6 });
        if (big) { try { GAME.addGoldSugar(1); GAME.giveSticker('gizli_mercan_inci', 'gizli'); } catch (e) { /* yok */ } ftext(o.x, 2.4, o.z, 'Kocaman İnci!', 'gold'); say('pr_mercan_inci'); }
        else { coins(o.x, o.z, 7); say('pr_mercan_istiridye'); }
      }
    });
  }
  // Batık oyuncak gemi: yatık gövde, şeritli yelken, bayrak, lombozlar; dokununca hazine sandığı açılır
  function toyShip(B, api, R, S) {
    const kg = B.k('gloss', S.x, S.z), kw = B.k('matte', S.x, S.z), gl = B.k('glow', S.x, S.z), red = C(0xff5a5a), wht = C(0xfff6ea), blue = C(0x3a7ad8), wood = C(0xb07a4a);
    for (const k of [kg, kw, gl]) k.push([S.x, 0, S.z], [0, S.yaw, 0.16], 0.78);
    kg.add(G.sphere(28, 16), (x, y) => (y > 0.75 ? wht : y > 0.6 ? blue : red), [0, 0.35, 0], null, [1.3, 0.85, 3.0]);
    kw.add(G.box(), wood, [0, 1.0, 0], null, [2.0, 0.12, 4.6]);
    for (let i = -4; i <= 4; i++) kw.add(G.box(), C(0x8a5a32), [0, 1.07, i * 0.5], null, [2.0, 0.02, 0.03]);
    kg.add(G.rbox(2), C(0xffe08a), [0, 1.5, -1.0], null, [1.2, 0.9, 1.2]);
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
      gl.add(G.cyl(1, 1, 14), C(0xfff2a0, 1.5), [sd * 1.18, 0.55, -1.2 + i * 1.2], [0, 0, PI / 2], [0.16, 0.04, 0.16]);
      kg.add(G.torus(TAU, 0.2, 16), C(0xffd84a), [sd * 1.2, 0.55, -1.2 + i * 1.2], [0, PI / 2, 0], [0.19, 0.19, 0.19]);
    }
    kw.seg([0, 1, 0.4], [0, 5.2, 0.4], 0.09, wood, 0.07, 10);
    kg.add(G.box(), (x, y) => (Math.floor((y - 1.6) / 0.45) % 2 ? red : wht), [0, 3.4, 0.6], [0, 0, 0], [0.04, 2.6, 2.0]);
    kg.add(G.cone(4), C(0xffd84a), [0, 5.3, 0.75], [0, 0, -PI / 2], [0.25, 0.6, 0.05]);
    kg.add(G.sphere(12, 8), C(0xffd84a), [0, 5.28, 0.4], null, 0.12);
    kg.add(G.cyl(1, 1, 14), blue, [0, 2.3, -1.0], null, [0.22, 1.0, 0.22]);   // baca
    kg.add(G.torus(TAU, 0.2, 14), red, [0, 2.8, -1.0], [PI / 2, 0, 0], [0.24, 0.24, 0.24]);
    // dümen simidi
    kg.add(G.torus(TAU, 0.12, 20), C(0xff5a5a), [0, 1.35, 1.9], [0, 0, 0], [0.45, 0.45, 0.45]);
    for (let i = 0; i < 4; i++) kg.add(G.box(), wht, [0, 1.35, 1.9], [0, 0, i * PI / 4], [0.1, 0.88, 0.05]);
    for (const k of [kg, kw, gl]) k.pop();
    // çapa (kumda)
    const ak = B.k('gloss', S.tx, S.tz), ax = S.x + Math.sin(S.yaw) * 4.2, az = S.z + Math.cos(S.yaw) * 4.2;
    if (!api.isFloor(ax, az)) {
      ak.push([ax, 0, az], [0, S.yaw, 0.4]);
      ak.seg([0, 0, 0], [0, 1.6, 0], 0.07, C(0x6a7a9a), 0.07, 8); ak.add(G.torus(PI, 0.12, 16), C(0x6a7a9a), [0, 0.3, 0], [0, 0, PI], [0.5, 0.5, 0.5]);
      ak.add(G.torus(TAU, 0.2, 14), C(0x6a7a9a), [0, 1.75, 0], null, [0.18, 0.18, 0.18]); ak.add(G.box(), C(0x6a7a9a), [0, 1.4, 0], null, [0.6, 0.08, 0.08]);
      ak.pop();
    }
    // hazine sandığı (güvertenin önünde, yürünür zeminde)
    const chest = new THREE.Group(), cb = new THREE.Mesh(chestGeo(false), mat('gloss')), lidP = new THREE.Group(), lid = new THREE.Mesh(chestGeo(true), mat('gloss'));
    chest.add(cb); lidP.position.set(0, 0.5, -0.32); lid.position.set(0, 0, 0.32); lidP.add(lid); chest.add(lidP);
    chest.position.set(S.tx, 0, S.tz); chest.rotation.y = S.yaw - PI / 2; api.add(chest);
    api.solid(S.tx, S.tz, 0.55, 'sandik'); api.light(S.tx, 1.4, S.tz, 0xffd88a, 1.6, 5, 0.1);
    let open = 0, opened = false, t = 0;
    api.anim(dt => { t += dt; open = damp(open, opened ? 1 : 0, 4, dt); lidP.rotation.x = -open * 1.9; if (!opened) chest.position.y = Math.abs(Math.sin(t * 2.5)) * 0.04; });
    R.zones.push({ x: S.tx, z: S.tz, r: 9, enter: () => say('pr_mercan_gemi') });
    R.zones.push({ x: S.tx, z: S.tz, r: 1.6, enter: () => {
      if (opened) return; opened = true;
      coins(S.tx, S.tz, 10); burst('confetti', S.tx, 1, S.tz); burst('bubble', S.tx, 0.8, S.tz, { count: 10, scale: 1.4 }); sfx('chest', { x: S.tx, z: S.tz }); sfx('cheer', { vol: 0.5 });
      try { GAME.addGoldSugar(1); GAME.giveSticker('gizli_mercan_gemi', 'gizli'); } catch (e) { /* yok */ }
      ftext(S.tx, 2.2, S.tz, 'Gemi Hazinesi!', 'gold'); say('pr_mercan_hazine', { gap: 2 });
    } });
  }
  let CHG = null;
  function chestGeo(lid) {
    CHG = CHG || {};
    const key = lid ? 'l' : 'b';
    if (CHG[key]) return CHG[key];
    const k = new Kit(), wood = C(0xc0804a), gold = C(0xffd04a);
    if (!lid) { k.add(G.rbox(2), wood, [0, 0.25, 0], null, [0.95, 0.5, 0.65]); k.add(G.box(), gold, [0, 0.25, 0.33], null, [0.18, 0.22, 0.03]); for (const sd of [-1, 1]) k.add(G.box(), gold, [sd * 0.38, 0.25, 0], null, [0.06, 0.52, 0.67]); }
    else { k.add(G.cyl(1, 1, 16, false), wood, [0, 0.02, 0], [0, 0, PI / 2], [0.32, 0.95, 0.32]); for (const sd of [-1, 1]) k.add(G.cyl(1, 1, 16), gold, [sd * 0.38, 0.02, 0], [0, 0, PI / 2], [0.335, 0.06, 0.335]); }
    CHG[key] = k.build(); CHG[key].userData.keep = true;
    return CHG[key];
  }
  // Mesaj şişesi (gizli köşe): yarı gömülü cam şişe, içinde rulo kâğıt
  function bottle(B, api, R, s) {
    const g = new THREE.Group(), k = new Kit();
    k.add(G.cyl(1, 1, 16), C(0x9af0d8), [0, 0, 0], null, [0.2, 0.7, 0.2]); k.add(G.sphere(16, 10), C(0x9af0d8), [0, 0.35, 0], null, [0.2, 0.12, 0.2]);
    k.add(G.cyl(1, 1, 12), C(0x9af0d8), [0, 0.55, 0], null, [0.08, 0.3, 0.08]); k.add(G.cyl(1, 1, 12), C(0xb07a4a), [0, 0.74, 0], null, [0.085, 0.1, 0.085]);
    k.add(G.cyl(1, 1, 12), C(0xfff2d0), [0, 0, 0], [0, 0, 0.1], [0.12, 0.5, 0.12]);
    const m = new THREE.Mesh(k.build(), mat('pearl')); m.rotation.set(0, 0.5, 1.2); m.position.y = 0.18; g.add(m);
    g.position.set(s.x, 0, s.z); api.add(g); api.glow(s.x, s.z, 2, 0x9af0d8, 0.2);
    let got = false, t = 0;
    api.anim(dt => { t += dt; if (!got) m.position.y = 0.18 + Math.abs(Math.sin(t * 2)) * 0.06; });
    R.zones.push({ x: s.x, z: s.z, r: 1.4, enter: () => {
      if (got) return; got = true; g.visible = false;
      try { GAME.addGoldSugar(1); GAME.giveSticker('gizli_mercan_sise', 'gizli'); } catch (e) { /* yok */ }
      burst('sparkle', s.x, 0.8, s.z, { color: '#bfffe8', count: 12 }); burst('confetti', s.x, 1, s.z); sfx('unlock', { vol: 0.7 }); coins(s.x, s.z, 6);
      ftext(s.x, 2, s.z, 'Mesaj Şişesi!', 'gold'); say('pr_mercan_sise', { gap: 2 });
    } });
  }
  // Kum yığını: üstüne basınca "puf!" şeker fışkırır
  function sandPile(B, api, R, p) {
    sandMound(B, p.x, p.z, 0.45);
    B.k('gloss', p.x, p.z).add(G.sphere(10, 6), C(0xffd84a), [p.x + 0.15, 0.2, p.z + 0.1], null, [0.1, 0.06, 0.1]);
    R.zones.push({ x: p.x, z: p.z, r: 1.0, enter(z) {
      if (z.done) return; z.done = true;
      burst('dust', p.x, 0.3, p.z, { count: 7, color: '#f6e2b8' }); burst('bubble', p.x, 0.4, p.z, { count: 3 }); coins(p.x, p.z, 5); sfx('pop', { x: p.x, z: p.z, pitch: 1.2 });
      say('pr_mercan_kum');
    } });
  }
  // Mini oyun köşesi: kum üstünde sedef halka + kocaman parlak kabarcık + iki minik kabarcık (yüzer)
  function miniLook(B, api, m) {
    const k = B.k('pearl', m.x, m.z), g = B.k('glow', m.x, m.z);
    k.add(G.torus(TAU, 0.12, 30), C(0xffd8f0), [m.x, 0.06, m.z], [PI / 2, 0, 0], [1.25, 1.25, 1.25]);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; g.add(G.sphere(6, 4), C([0xff9ad8, 0x8ae0ff, 0xffe27a][i % 3], 1.5), [m.x + Math.sin(a) * 1.25, 0.12, m.z + Math.cos(a) * 1.25], null, 0.08); }
    api.glow(m.x, m.z, 2.4, 0xffd8f8, 0.3);
    const grp = new THREE.Group(), mm = M.miniBub || (M.miniBub = kp(rimify(new THREE.MeshStandardMaterial({ color: 0xe8fbff, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false }), 0xffc8f0, 1.4, 1.8)));
    const sg = G.sphere(24, 16);
    const b0 = new THREE.Mesh(sg, mm); b0.scale.setScalar(0.7); grp.add(b0);
    const b1 = new THREE.Mesh(sg, mm); b1.scale.setScalar(0.28); b1.position.set(0.8, 0.5, 0.1); grp.add(b1);
    const b2 = new THREE.Mesh(sg, mm); b2.scale.setScalar(0.2); b2.position.set(-0.7, 0.8, -0.1); grp.add(b2);
    grp.position.set(m.x, 1.5, m.z); grp.renderOrder = 5; api.add(grp);
    let t = 0; api.anim(dt => { t += dt; grp.position.y = 1.5 + Math.sin(t * 1.6) * 0.15; grp.rotation.y = t * 0.4; b0.scale.setScalar(0.7 + 0.03 * Math.sin(t * 3)); });
  }
  // Kabarcık bacalarından sürekli yükselen kabarcık sütunları (tek Points, konumlar gölgelendiricide)
  function ventColumns(api, vents) {
    const n = vents.length * 22, pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
    vents.forEach((v, i) => { for (let j = 0; j < 22; j++) { const q = i * 22 + j; pos[q * 3] = v.x; pos[q * 3 + 1] = 0; pos[q * 3 + 2] = v.z; seed[q * 4] = Math.random(); seed[q * 4 + 1] = 0.7 + Math.random() * 0.6; seed[q * 4 + 2] = Math.random(); seed[q * 4 + 3] = 0.2 + Math.random() * 0.26; } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.BufferAttribute(seed, 4));
    const mtl = M.ventPts || (M.ventPts = kp(new THREE.ShaderMaterial({
      uniforms: { uT: TIME.u, uPx: { value: 400 }, map: { value: bubbleTex() } },
      vertexShader: 'uniform float uT; uniform float uPx; attribute vec4 aS; varying float vA;' +
        'void main(){ float y = mod(aS.x * 3.5 + uT * 1.6 * aS.y, 3.5); vec3 p = position; float r = 0.15 + y * 0.12;' +
        ' p.x += sin(uT * 2.0 + aS.z * 6.28 + y * 2.0) * r; p.z += cos(uT * 1.7 + aS.z * 5.0 + y * 2.0) * r; p.y = 0.1 + y;' +
        ' vA = smoothstep(0.0, 0.3, y) * (1.0 - smoothstep(2.6, 3.5, y)); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = aS.w * uPx / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying float vA; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(c.rgb, c.a * vA); }',
      transparent: true, depthWrite: false, fog: false })));
    const pts = new THREE.Points(g, mtl); pts.frustumCulled = false; pts.renderOrder = 4; api.add(pts);
    api.anim(() => { mtl.uniforms.uPx.value = (typeof renderer !== 'undefined' && renderer.domElement ? renderer.domElement.height : 800) * 0.5; });
  }
  // İnci Mağarası: oda kaya duvarıyla çevrili; kuzey/yanlarda tavan çıkıntıları ve sarkıtlar (ucu biyoparlak), duvar dibinde
  // mor-mavi ışıldayan mercanlar, kristaller, parıldayan inciler; güneyde (kamera tarafı) yalnız alçak kayalar.
  // SADE9: arenanın güney (kamera tarafı) yarısı ve çevresi: burada yüksek süs yok (Feza'yı ve bossu kapatıyordu)
  let ARS = null;
  const arenaSouth = (x, z) => !!ARS && hyp(x - ARS.x, z - ARS.z) < ARS.r + 11 && z > ARS.z - ARS.r * 0.3;
  function caveArches(B, api, L, rnd) {
    const a4 = (L.areas || [])[3]; if (!a4) return;
    const ROCK = [0x7a6ab8, 0x6a7ac0, 0x8a6ab8, 0x6070b0];   // SADE8: daha açık mor-mavi (koyu kütle gibi durmasın)
    for (const ri of a4.rooms) {
      const rm = L.rooms[ri]; if (!rm) continue;
      const side = rm.kind === 'side', N = side ? 12 : 18;
      for (let q = 0; q < N; q++) {
        const a = q / N * TAU + rnd() * 0.1, dx = Math.sin(a), dz = Math.cos(a), e = edge(api, rm, dx, dz);
        const x = e.x + dx * 1.9, z = e.z + dz * 1.9;
        if (api.isFloor(x, z) || api.linkDist(x, z) < 2.2) continue;
        const k = B.k('matte', x, z), g = B.k('glow', x, z), base = C(ROCK[q % 4]);
        if (dz > -0.35) {   // SADE8: güney ve yanlar: alçak, küçük taş (yanlardaki koyu mor kütleler Feza'nın önüne düşüyordu) — güney + yanlar: alçak kaya + ışıldayan mercan (SADE/QA: kamera tarafında yüksek kaya yok)
          k.add(G.ico(1), base.clone().lerp(C(0xb8a8e8), 0.45), [x, 0.2, z], [rnd(), rnd() * TAU, 0], [0.6, 0.35, 0.5]);   // SADE8: kamera önünde küçük, açık renkli taş (koyu mor kütle değil)
          glowCoral(g, x - dx * 0.5, z - dz * 0.5, 0.6, q, rnd);
          continue;
        }
        if (arenaSouth(x, z)) { k.add(G.ico(1), base.clone().lerp(C(0xb8a8e8), 0.45), [x, 0.2, z], [rnd(), rnd() * TAU, 0], [0.6, 0.35, 0.5]); continue; }
        const h = 3.6 + rnd() * 1.6;
        k.add(G.ico(1), (wx, wy) => tmpC.copy(base).lerp(C(0xa898f0), Math.min(1, wy / h) * 0.45), [x, h * 0.48, z], [rnd() * 0.4, rnd() * TAU, rnd() * 0.3], [1.5, h * 0.55, 1.4]);
        if (dz < -0.45) {   // tavan çıkıntısı (SADE/QA: yalnız kuzey duvarda; yanlarda Feza'nın üstüne uzanmasın): duvarın üstünden içeri uzanan kaya saçağı + sarkıtlar
          const ox = x - dx * 1.6, oz = z - dz * 1.6, hy = h * 0.92;
          k.add(G.ico(1), base, [ox, hy, oz], [rnd(), rnd(), rnd() * 0.3], [1.9, 0.5, 1.5]);
          for (let t = 0; t < 3; t++) {
            const sx = ox + (t - 1) * 0.7 * dz + (rnd() - 0.5) * 0.3, sz = oz - (t - 1) * 0.7 * dx, len = 0.6 + rnd() * 0.7;
            k.add(G.cone(7), base, [sx, hy - 0.35 - len / 2, sz], [PI, 0, 0], [0.16, len, 0.16]);
            g.add(G.sphere(6, 4), C([0x9ae8ff, 0xd8a8ff, 0xffb8f0][(q + t) % 3], 1.8), [sx, hy - 0.4 - len, sz], null, 0.09);
          }
        }
        glowCoral(g, x - dx * 0.9, z - dz * 0.9, 0.85, q, rnd);
        for (let c = 0; c < 3; c++) g.add(G.octa(), C([0xc8a8ff, 0x9ae8ff, 0xffc8f0][c], 1.4), [x - dx * 1.1 + dz * (c - 1) * 0.45, 0.32 + c * 0.1, z - dz * 1.1 - dx * (c - 1) * 0.45], [0, c, 0.2], [0.12, 0.34 + c * 0.1, 0.12]);
        if (q % 2) g.add(G.sphere(8, 6), C(0xfff0ff, 1.7), [x - dx * 1.4, 0.16, z - dz * 1.4], null, 0.15);   // parıldayan inci
      }
      api.glow(rm.x, rm.z, (rm.r || 6) * 1.05, 0xb8a0ff, 0.2);
      caveShade(api, rm.x, rm.z, (rm.r || 6) * (side ? 1.1 : 1.0));
      if (!side) { api.light(rm.x - 3, 2.4, rm.z - 3, 0xa890ff, 2.4, 9, 0.15); api.light(rm.x + 3, 2.0, rm.z + 1, 0x8ae8ff, 1.8, 8, 0.2); }
    }
  }
  // mağara gölgesi: oda kenarına doğru koyulaşan mor-lacivert yer gölgesi (ortası aydınlık kalır; tek düzlem)
  let SHADEM = null;
  function caveShade(api, x, z, r) {
    if (!SHADEM) SHADEM = kp(new THREE.ShaderMaterial({
      uniforms: { uC: { value: new THREE.Vector3() } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 uC; varying vec3 vW; void main(){ float d = length(vW.xz - uC.xy) / uC.z; float a = smoothstep(0.5, 1.15, d) * (1.0 - smoothstep(1.3, 1.72, d)) * 0.42; gl_FragColor = vec4(0.09, 0.05, 0.22, a); }',
      transparent: true, depthWrite: false, fog: false }));
    const m = SHADEM.clone(); m.uniforms.uC.value.set(x, z, r);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(r * 3.6, r * 3.6).rotateX(-PI / 2), m);
    pl.position.set(x, 0.045, z); pl.renderOrder = 1; api.add(pl);
  }
  // biyoparlak mercan: ışıldayan dallar (glow kiti; ışık havuzu yerine renk kendisi parlar)
  function glowCoral(g, x, z, s, q, rnd) {
    const cA = C([0x8ae8ff, 0xc89aff, 0x7fffd8, 0xff9ae8][q % 4], 1.25), cT = cA.clone().lerp(C(0xffffff), 0.5).multiplyScalar(1.3);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + rnd(), l = (0.5 + rnd() * 0.4) * s, px = x + Math.sin(a) * 0.15 * s, pz = z + Math.cos(a) * 0.15 * s;
      g.seg([px, 0, pz], [px + Math.sin(a) * 0.25 * s, l, pz + Math.cos(a) * 0.25 * s], 0.05 * s, cA, 0.035 * s, 6);
      g.add(G.sphere(6, 4), cT, [px + Math.sin(a) * 0.25 * s, l, pz + Math.cos(a) * 0.25 * s], null, 0.06 * s);
    }
  }
  // Arena: İnci Sarayı (dev istiridye arkada, mercan sütunları çevrede, ortada yumuşak ışık halkası)
  function arenaDecor(B, api, L, R, A) {
    const rnd = api.rnd;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU, rr = A.r + 2.6, x = A.x + Math.sin(a) * rr, z = A.z + Math.cos(a) * rr;
      if (api.isFloor(x, z)) continue;
      if (Math.cos(a) > -0.3) { anemone(B, x, z, 1.1, rnd); seaweed(B, x + 1, z, 1.2, rnd); }
      else coralPillar(B, x, z, 3.2 + rnd() * 2.2, rnd);
    }
    // dev istiridye (kuzey)
    const cx = A.nx, cz = A.nz - 2.5, k = B.k('pearl', cx, cz), g = B.k('glow', cx, cz), c0 = C(0xc8b8f0), c1 = C(0xfff0ff);
    k.push([cx, 0, cz], null, 4.2);
    k.add(G.sphere(30, 14), (x, y, z) => tmpC.copy(c0).lerp(c1, Math.pow(Math.abs(Math.sin(Math.atan2(x - cx, z - cz + 2) * 10)), 3) * 0.6), [0, 0.05, 0], null, [1, 0.25, 0.8]);
    k.push([0, 0.1, -0.7], [-1.15, 0, 0]);
    k.add(G.sphere(30, 14), (x, y, z) => tmpC.copy(c0).lerp(c1, Math.pow(Math.abs(Math.sin(Math.atan2(x - cx, y) * 10)), 3) * 0.6), [0, 0, 0.75], null, [1, 0.22, 0.8]);
    k.add(G.sphere(24, 10), C(0xffeefa), [0, -0.06, 0.75], null, [0.9, 0.08, 0.7]);
    k.pop(); k.pop();
    g.add(G.sphere(20, 14), C(0xfff6ff, 1.8), [cx, 1.6, cz], null, 0.85);
    api.light(cx, 2.6, cz + 1.5, 0xf8e0ff, 3.0, 9, 0.1);
    api.glow(A.x, A.z, A.r * 0.95, 0xbfeaff, 0.12);
    api.glow(cx, cz + 2, 5, 0xffe8ff, 0.25);
    // kenarda inciler
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * TAU, e = edge(api, A, Math.sin(a), Math.cos(a)), x = e.x + Math.sin(a) * 0.9, z = e.z + Math.cos(a) * 0.9;
      if (api.isFloor(x, z)) continue;
      B.add('pearl', G.sphere(10, 7), C(0xfff4ff), [x, 0.18, z], null, 0.2);
    }
    R.arenaPearl = { x: cx, z: cz };
  }

  // ════════ Kum zemini: dalgacıklı kum dokusu (+ normal haritası), ay zemininin dokularının yerine yalnız bu bölümde ════════
  // (zemin malzemesi 'floor-moon' temaya özel ve paylaşılan: bölümden çıkınca eski dokular geri konur, bkz. hook)
  let SAND = null, FLOOR_ORIG = null;
  function sandTex() {
    if (SAND) return SAND;
    const N = 256, hgt = new Float32Array(N * N);
    const nz = (u, v) => Math.sin(TAU * (2 * u + v)) * 0.5 + Math.sin(TAU * (3 * v - u)) * 0.3 + Math.sin(TAU * (5 * u + 3 * v)) * 0.2;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = i / N, v = j / N, r = Math.sin(TAU * (14 * v + 2 * u + 0.9 * nz(u, v)));
      hgt[j * N + i] = Math.pow(0.5 + 0.5 * r, 1.6) * 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(TAU * (31 * u + 17 * v)) * Math.sin(TAU * (23 * v - 7 * u)));
    }
    const cc = document.createElement('canvas'), cn = document.createElement('canvas'); cc.width = cc.height = cn.width = cn.height = N;
    const gc = cc.getContext('2d'), gn = cn.getContext('2d'), ic = gc.createImageData(N, N), inn = gn.createImageData(N, N);
    let seed = 7; const rr = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, h = hgt[k], o = k * 4;
      const uu = i / N, vv = j / N, big = 0.5 + 0.5 * Math.sin(TAU * (uu + 0.3 * Math.sin(TAU * vv))) * Math.sin(TAU * (vv + 0.2));   // ZEMİN: iki tonlu yumuşak dalgalanma (±%5)
      const v = 0.885 + 0.07 * h + 0.075 * big - (rr() < 0.06 ? 0.05 : 0) + (rr() < 0.05 ? 0.04 : 0);   // + ince kum taneleri
      ic.data[o] = 255 * v; ic.data[o + 1] = 236 * v; ic.data[o + 2] = 204 * v; ic.data[o + 3] = 255;   // SADE5: sıcak altın-şeftali kum
      const dx = hgt[j * N + ((i + 1) % N)] - hgt[j * N + ((i + N - 1) % N)], dy = hgt[((j + 1) % N) * N + i] - hgt[((j + N - 1) % N) * N + i];
      let nx = -dx * 0.5, ny = -dy * 0.5, nzz = 1;   // SADE: dalgacıklar yumuşak const l = Math.hypot(nx, ny, nzz); nx /= l; ny /= l; nzz /= l;
      inn.data[o] = (nx * 0.5 + 0.5) * 255; inn.data[o + 1] = (ny * 0.5 + 0.5) * 255; inn.data[o + 2] = (nzz * 0.5 + 0.5) * 255; inn.data[o + 3] = 255;
    }
    // minik kabuk kırıntıları (pembe / beyaz)
    for (let q = 0; q < 110; q++) {
      const x = rr() * N, y = rr() * N, r = 0.8 + rr() * 1.1, o = ((y | 0) * N + (x | 0)) * 4, pink = rr() < 0.5;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= r * r) { const oo = ((((y + dy) | 0) + N) % N * N + (((x + dx) | 0) + N) % N) * 4; ic.data[oo] = 255; ic.data[oo + 1] = pink ? 214 : 250; ic.data[oo + 2] = pink ? 226 : 246; }
      void o;
    }
    gc.putImageData(ic, 0, 0); gn.putImageData(inn, 0, 0);
    const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = typeof ANISO !== 'undefined' ? ANISO : 4; t.userData.keep = true; return t; };
    return (SAND = { map: mk(cc, true), normal: mk(cn, false) });
  }
  function floorSand(api, on) {
    const m = on ? api && api.floor && api.floor.material : (FLOOR_ORIG && FLOOR_ORIG.m);
    const U = m && m.userData && m.userData.u; if (!U || !U.tA) return;
    if (on) {
      const S = sandTex();
      if (!FLOOR_ORIG) FLOOR_ORIG = { m, tA: U.tA.value, tAn: U.tAn.value, tB: U.tB.value, tBn: U.tBn.value, tC: U.tC.value, tCn: U.tCn.value, sp: U.uSpeck.value.clone() };
      U.tA.value = U.tB.value = U.tC.value = S.map; U.tAn.value = U.tBn.value = U.tCn.value = S.normal; U.uSpeck.value.setRGB(0.15, 0.12, 0.1);
      if (U.uDream) U.uDream.value = 0;
    } else if (FLOOR_ORIG) {
      const O = FLOOR_ORIG; U.tA.value = O.tA; U.tAn.value = O.tAn; U.tB.value = O.tB; U.tBn.value = O.tBn; U.tC.value = O.tC; U.tCn.value = O.tCn; U.uSpeck.value.copy(O.sp);
      FLOOR_ORIG = null;
    }
  }

  // ════════ Boss sonu: Koca Kirpi Balık Feza'ya ve Pırıl'a kabarcıktan kalp üfler, sonra el sallayıp yüzerek gider ════════
  // (motorun "neşelenip kaybolma" modeli gizlenir; aynı modelden dost bir kopya sahneye gelir, ~7 s; malzeme/ışık akışı motorda)
  let FIN = null, HBG = null, HBM = null;
  function heartBubble() {
    if (!HBG) {
      HBG = new THREE.SphereGeometry(0.32, 18, 12); HBG.userData.keep = true;
      HBM = { b: kp(rimify(new THREE.MeshStandardMaterial({ color: 0xeefcff, roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false }), 0xffd0f0, 1.4, 1.8)),
        h: kp(new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5fa8).multiplyScalar(1.4) })) };
    }
    const g = new THREE.Group(), bub = new THREE.Mesh(HBG, HBM.b); bub.renderOrder = 6; g.add(bub);
    const hg = EMODEL && EMODEL.KIT && EMODEL.KIT.heartGeo ? EMODEL.KIT.heartGeo() : new THREE.SphereGeometry(0.1, 8, 6);
    const h = new THREE.Mesh(hg, HBM.h); h.scale.setScalar(0.42); g.add(h); g.userData.h = h;
    return g;
  }
  function finaleStart(e) {
    const b = typeof GAME !== 'undefined' && GAME.boss;
    if (!b || !b.m || typeof EMODEL === 'undefined' || FIN) return;
    let m = null;
    try { m = EMODEL.buildRaw('kocaKirpiBalik', {}); } catch (err) { return; }
    if (!m || !m.root) return;
    m.root.scale.copy(b.m.root.scale); m.root.position.set(b.x, 0, b.z); m.root.rotation.y = b.face; scene.add(m.root);
    try { m.setMood('happy'); } catch (err) { /* yok */ }
    FIN = { m, b, t: 0, x: b.x, z: b.z, y: 0, face: b.face, shots: [], fired: 0, st: { move: 0, windup: -1, attack: -1, hurt: 0, dying: -1, frozen: false, phase: 'idle', phaseT: 0, aggro: true } };
  }
  function finaleEnd() {
    if (!FIN) return;
    for (const h of FIN.shots) if (h.g.parent) h.g.parent.remove(h.g);
    if (FIN.m.root.parent) FIN.m.root.parent.remove(FIN.m.root);
    try { if (FIN.m.dispose) FIN.m.dispose(); } catch (err) { /* yok */ }
    FIN = null;
  }
  function finaleStep(dt) {
    const F = FIN; if (!F) return;
    if (!inZone()) { finaleEnd(); return; }
    F.t += dt; const t = F.t, m = F.m, P = GAME.P, st = F.st;
    if (F.b && F.b.m && F.b.m.root) F.b.m.root.visible = false;
    const Pi = GAME.Bilbo && GAME.Bilbo.root ? GAME.Bilbo.root.position : null;
    // yüz Feza'ya dönük; önce mutlu zıplar, sonra kalp üfler, sonra el sallayıp kuzeye-yukarı yüzerek gider
    if (t < 3.6) { F.face = dampAngle(F.face, Math.atan2(P.pos.x - F.x, P.pos.z - F.z), 4, dt); F.y = Math.abs(Math.sin(t * 5)) * 0.25 * (t < 0.8 ? 1 : 0.3); }
    if (t < 0.7) { st.phase = 'summon'; st.phaseT = t / 0.7; }
    else if (t < 2.9) { st.phase = 'halka'; st.phaseT = (t - 0.7) / 2.2; }
    else if (t < 3.6) { st.phase = 'summon'; st.phaseT = (t - 2.9) / 0.7; }
    else {
      st.phase = 'summon'; st.phaseT = 0.5;
      const u = t - 3.6; F.face = dampAngle(F.face, PI, 2, dt);
      F.z -= dt * (1.2 + u * 1.2); F.y = Math.min(5, u * u * 0.5 + u * 0.6);
      if ((F.bt = (F.bt || 0) - dt) <= 0) { F.bt = 0.12; burst('bubble', F.x, F.y + 1.2, F.z + 1, { count: 2, scale: 0.9 }); }
    }
    // kabarcıktan kalpler: üçü Feza'ya, üçü Pırıl'a
    const AT = [0.95, 1.2, 1.45, 1.8, 2.05, 2.3];
    while (F.fired < AT.length && t >= AT[F.fired]) {
      const toP = F.fired % 2 === 1 && Pi, g = heartBubble(), sc = m.root.scale.x || 1;
      const sx = F.x + Math.sin(F.face) * 1.25 * sc, sz = F.z + Math.cos(F.face) * 1.25 * sc, sy = 1.2 * sc + F.y;
      g.position.set(sx, sy, sz); scene.add(g);
      F.shots.push({ g, t: 0, sx, sy, sz, toP: !!toP, ph: Math.random() * 6 });
      sfx('bubble', { x: sx, z: sz, pitch: 1.2 + F.fired * 0.08 });
      F.fired++;
    }
    for (let i = F.shots.length - 1; i >= 0; i--) {
      const h = F.shots[i]; h.t += dt; const u = Math.min(1, h.t / 1.4);
      const tg = h.toP && Pi ? { x: Pi.x, y: Pi.y + 0.8, z: Pi.z } : { x: P.pos.x, y: 1.5, z: P.pos.z };
      h.g.position.set(lerp(h.sx, tg.x, u) + Math.sin(h.t * 6 + h.ph) * 0.15 * (1 - u), lerp(h.sy, tg.y, u) + Math.sin(PI * u) * 0.9, lerp(h.sz, tg.z, u));
      h.g.userData.h.rotation.y += dt * 3; h.g.scale.setScalar(0.6 + 0.4 * Math.min(1, h.t / 0.3));
      if (u >= 1) {
        burst('hearts', tg.x, tg.y + 0.2, tg.z, { count: 3 }); burst('bubble', tg.x, tg.y, tg.z, { count: 3 }); sfx('bubblePop', { x: tg.x, z: tg.z, pitch: 1.3 });
        if (!h.toP && GAME.H && GAME.H.express) { try { GAME.H.express('sevinc', 1.5); } catch (err) { /* yok */ } }
        scene.remove(h.g); F.shots.splice(i, 1);
      }
    }
    m.root.position.set(F.x, F.y, F.z); m.root.rotation.y = F.face;
    try { m.anim(dt, st); } catch (err) { /* yok */ }
    const B = m.B;
    if (B && B.finL && (t > 2.9)) { B.finL.rotation.z += 0.6 + Math.sin(t * 11) * 0.7; B.finL.rotation.x = -0.4; }   // el sallar
    if (t > 3.6) m.root.scale.setScalar((F.b && F.b.m ? F.b.m.root.scale.x : 1) * Math.max(0.0001, 1 - Math.max(0, t - 6.2) / 1.2));
    if (t > 2.95 && !F.waved) { F.waved = true; /* SADE: sözcük balonu yok */ sfx('pirilMutlu', { vol: 0.6 }); }
    if (t > 7.5) finaleEnd();
  }

  // ════════ Yolda yüzüp geçen yavru balık sürüsü: Feza dokununca dağılır, sonra yeniden toplanıp yoluna devam eder ════════
  let BABY = null;
  function babySetup(api) {
    if (!FISHM) FISHM = kp(rimify(vcMat({ roughness: 0.3 }), 0xffffff, 0.3, 2.4));
    const N = 9, mesh = new THREE.InstancedMesh(fishGeo(), FISHM, N);
    const cols = [0xffb03a, 0xffe14a, 0xff7aa8, 0x5ad0ff, 0xffb03a, 0x9a7aff, 0xffe14a, 0x6fe0a0, 0xff7aa8];
    for (let i = 0; i < N; i++) mesh.setColorAt(i, C(cols[i]));
    mesh.count = 0; mesh.frustumCulled = false; api.add(mesh);
    const fish = [];
    for (let i = 0; i < N; i++) fish.push({ ox: ((i % 3) - 1) * 0.42 + (i / 3 | 0) * 0.2, oy: ((i / 3 | 0) - 1) * 0.22, oz: ((i / 3 | 0) - 1) * 0.38, p: new THREE.Vector3(), v: new THREE.Vector3(), ph: Math.random() * 6 });
    BABY = { mesh, fish, st: 'off', cd: 8, c: new THREE.Vector3(), vx: 0, vz: 0, side: 1, scat: 0, scatCd: 0, t: 0 };
  }
  const _m4b = new THREE.Matrix4(), _qb = new THREE.Quaternion(), _eb = new THREE.Euler(), _sb = new THREE.Vector3(0.75, 0.75, 0.75), _tb = new THREE.Vector3();
  function babyStep(dt, hx, hz) {
    const S = BABY; if (!S) return;
    S.t += dt;
    if (S.st === 'off') {
      if (!live() || (S.cd -= dt) > 0) return;
      if (GAME.enemies.some(e => !e.dead && hyp(e.x - hx, e.z - hz) < 8)) { S.cd = 2; return; }
      S.side = Math.random() < 0.5 ? -1 : 1;
      S.c.set(hx + S.side * 10, 1.1, hz - 0.8 + Math.random() * 1.4); S.vx = -S.side * 2.4; S.vz = (Math.random() - 0.5) * 0.4;
      for (const f of S.fish) { f.p.set(S.c.x + f.ox, S.c.y + f.oy, S.c.z + f.oz); f.v.set(0, 0, 0); }
      S.st = 'swim'; S.scat = 0; S.mesh.count = S.fish.length;
    }
    S.c.x += S.vx * dt; S.c.z += S.vz * dt;
    S.scat = Math.max(0, S.scat - dt); S.scatCd = Math.max(0, S.scatCd - dt);
    const P = GAME.P;
    if (S.scatCd <= 0 && live() && hyp(S.c.x - P.pos.x, S.c.z - P.pos.z) < 1.6) {   // dokundu: hepsi dağılır
      S.scat = 1.3; S.scatCd = 3;
      for (const f of S.fish) { _tb.set(f.p.x - P.pos.x, 0, f.p.z - P.pos.z); if (_tb.lengthSq() < 1e-4) _tb.set(Math.random() - 0.5, 0, Math.random() - 0.5); _tb.normalize(); f.v.set(_tb.x * (3.5 + Math.random() * 2), 1 + Math.random() * 1.5, _tb.z * (3.5 + Math.random() * 2)); }
      burst('bubble', S.c.x, 1.1, S.c.z, { count: 5 }); burst('sparkle', S.c.x, 1.2, S.c.z, { count: 4, color: '#bff4ff' }); sfx('bubble', { x: S.c.x, z: S.c.z, pitch: 1.5 });
    }
    S.fish.forEach((f, i) => {
      const tx = S.c.x + f.ox, ty = S.c.y + f.oy + Math.sin(S.t * 4 + f.ph) * 0.06, tz = S.c.z + f.oz + Math.sin(S.t * 3 + f.ph) * 0.08;
      if (S.scat > 0) { f.p.addScaledVector(f.v, dt); f.v.multiplyScalar(Math.exp(-2.2 * dt)); f.v.y -= dt * 0.8; f.p.y = Math.max(0.4, f.p.y); }
      const k = S.scat > 0 ? 0.6 : 5; f.p.x = damp(f.p.x, tx, k, dt); f.p.y = damp(f.p.y, ty, k, dt); f.p.z = damp(f.p.z, tz, k, dt);
      const vx = S.scat > 0 ? f.v.x : S.vx, vz = S.scat > 0 ? f.v.z : S.vz;
      _eb.set(0, Math.atan2(vx, vz), Math.sin(S.t * 14 + f.ph) * 0.15); _qb.setFromEuler(_eb);
      S.mesh.setMatrixAt(i, _m4b.compose(f.p, _qb, _sb));
    });
    S.mesh.instanceMatrix.needsUpdate = true;
    if ((S.c.x - hx) * S.side < -12 || hyp(S.c.x - hx, S.c.z - hz) > 22) { S.st = 'off'; S.cd = 14 + Math.random() * 12; S.mesh.count = 0; }
  }

  // ════════ Feza'nın baloncuk kaskı (Feza modeline iliştirilen ayrı nesne; bölümden çıkınca çıkarılır) ════════
  let HELM = null;
  function helmet() {
    if (HELM) return HELM;
    const g = new THREE.Group(); g.name = 'mercanKask';
    const glass = kp(rimify(new THREE.MeshStandardMaterial({ color: 0xdff8ff, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false }), 0xe8fbff, 1.8, 1.7));
    const sg = new THREE.SphereGeometry(1, 32, 20); sg.userData.keep = true;
    const sph = new THREE.Mesh(sg, glass); sph.scale.setScalar(0.32); sph.renderOrder = 6; g.add(sph);
    const hl = new THREE.Mesh(sg, kp(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false })));
    hl.scale.set(0.085, 0.045, 0.01); hl.position.set(-0.14, 0.17, 0.22); hl.rotation.set(0, -0.5, 0.6); hl.renderOrder = 7; g.add(hl);
    const tg = new THREE.TorusGeometry(0.17, 0.035, 10, 28); tg.userData.keep = true;
    const collar = new THREE.Mesh(tg, kp(rimify(new THREE.MeshStandardMaterial({ color: 0x5ad0ff, roughness: 0.3, metalness: 0.3 }), 0xffffff, 0.3, 2.5)));
    collar.rotation.x = PI / 2; collar.position.y = -0.2; g.add(collar);
    g.position.set(0, 0.25, 0.01);
    return (HELM = g);
  }
  function helmetSync(on) {
    try {
      const H = typeof GAME !== 'undefined' && GAME.H, head = H && H.bones && H.bones.head;
      const h = helmet();
      if (on && head) { if (h.parent !== head) head.add(h); h.visible = !(GAME.P && GAME.P.kostum === 'astronot'); }
      else if (h.parent) h.parent.remove(h);
    } catch (e) { /* model yok */ }
  }

  // ════════ Görsel kurulum ════════
  // SADE (okunurluk turu): zemine pişmiş ışık havuzları ve nokta ışıklar daha sönük, titreşimsiz (Feza yolu ve huysuzları net seçsin)
  //   (api yerinde değişir: ODAKIT.lowShadow gibi api.put yamaları ve api.box/ball/cyl aynı nesneyi kullanmaya devam eder)
  const sadeApi = (api, gk = 0.55, lk = 0.7) => {
    if (api.__sade) return api;
    const g0 = api.glow, l0 = api.light;
    api.__sade = true;
    api.glow = (x, z, r, c, k = 0.15) => g0(x, z, r, c, k * gk);
    api.light = (x, y, z, c, i = 3, d = 7, f = 0) => l0(x, y, z, c, i * lk, d, f * 0.3);
    return api;
  };
  function* kur(L, api) {
    api = sadeApi(api);
    const D = L.mr || { vents: [], oysters: [], gold: [], secrets: [], piles: [], taken: [] };
    SHAFTS.length = 0;
    const B = batch(api), rnd = api.rnd, R = rig(api, L);
    ACTIVE = R; R.L = L;
    pathStrip(api, B, L, rnd);   // SADE5: yürünen yol belirgin
    if (L.start) { let cx = L.start.x + 2.2, cz = L.start.z - 2.0; for (const [ox, oz] of [[2.2, -2], [-2.2, -2], [2.6, 0.4], [-2.6, 0.4], [0, -2.6]]) { const x = L.start.x + ox, z = L.start.z + oz; if (api.isFloor(x, z) && api.circleFree(x, z, 0.6) && !(L.path || []).some(q => hyp(q.x - x, q.z - z) < 1.3)) { cx = x; cz = z; break; } } crab(api, L, cx, cz); api.solid(cx, cz, 0.45, 'yengec'); }
    floorSand(api, true);   // ay zemininin dokuları yerine dalgacıklı kum (dışarısı derin mavi kum; "uzay" görünüşü kapalı)
    const avoid = D.taken.map(q => ({ x: q.x, z: q.z, r: q.r * 0.7 })).concat((L.areas || []).filter(a => a.gate).map(a => ({ x: a.gate.x, z: a.gate.z, r: 3.2 })));
    if (L.exit) avoid.push({ x: L.exit.x, z: L.exit.z, r: 4 });
    if (D.ship) avoid.push({ x: D.ship.x, z: D.ship.z, r: 5 });
    if (D.arena) avoid.push({ x: D.arena.nx, z: D.arena.nz - 2.5, r: 6 });
    ARS = D.arena || null;   // (SADE9: arenaSouth için)
    // ── yakın kıyı: alçak süsler (kabuk, deniz otu, şakayık, taş) ──
    const near = edgeSpots(L, api, { dmin: 0.45, dmax: 1.5, space: 3.2, avoid });   // SADE: kıyı süsleri seyrek (okunurluk + üçgen bütçesi)
    for (const c of near) {
      const ar = areaAt(L, c.x, c.z); if (ar === 4) continue;
      const r0 = rnd(), x = c.x + c.nx * 0.5, z = c.z + c.nz * 0.5;
      if (c.south) { if (r0 < 0.35) scallop(B, x, z, 0.7 + rnd() * 0.4, rnd, Math.atan2(-c.nx, -c.nz)); else if (r0 < 0.6) starDecor(B, x, z, 0.9 + rnd() * 0.5, rnd); else if (r0 < 0.8) pebbles(B, x, z, rnd); else seaweed(B, x + c.nx, z + c.nz, 0.7, rnd); continue; }
      if (ar === 0) { if (r0 < 0.35) seaweed(B, x, z, 1.1 + rnd() * 0.8, rnd); else if (r0 < 0.55) scallop(B, x, z, 0.9 + rnd() * 0.5, rnd, Math.atan2(-c.nx, -c.nz)); else if (r0 < 0.7) conch(B, x, z, 1 + rnd() * 0.5, rnd); else if (r0 < 0.85) anemone(B, x, z, 0.9, rnd); else rock(B, x, z, 0.6 + rnd() * 0.3, rnd); }
      else if (ar === 1) { if (r0 < 0.3) anemone(B, x, z, 1 + rnd() * 0.4, rnd); else if (r0 < 0.55) branchCoral(B, x, z, 0.8 + rnd() * 0.5, rnd); else if (r0 < 0.75) brainCoral(B, x, z, 0.6 + rnd() * 0.3, rnd); else seaweed(B, x, z, 1.2, rnd); }
      else if (ar === 2) { if (r0 < 0.45) seaweed(B, x, z, 1.4 + rnd() * 0.8, rnd, PAL.weed[3]); else if (r0 < 0.65) rock(B, x, z, 0.7 + rnd() * 0.4, rnd); else if (r0 < 0.8) conch(B, x, z, 1.1, rnd); else anemone(B, x, z, 1, rnd); }
      else { if (r0 < 0.4) tubeSponge(B, x, z, 0.8 + rnd() * 0.4, rnd); else if (r0 < 0.7) branchCoral(B, x, z, 0.9, rnd); else scallop(B, x, z, 1, rnd, Math.atan2(-c.nx, -c.nz)); }
    }
    yield;
    // ── uzak kıyı: büyük mercanlar, yosun ormanı, kum tepeleri (güneyde yalnız alçak) ──
    const far = edgeSpots(L, api, { dmin: 2.4, dmax: 4.4, space: 4.4, avoid });
    for (const c of far) {
      const ar = areaAt(L, c.x, c.z); if (ar === 4) continue;
      const r0 = rnd(), x = c.x + c.nx * 0.8, z = c.z + c.nz * 0.8;
      if (arenaSouth(x, z)) { if (r0 < 0.5) brainCoral(B, x, z, 0.45, rnd); continue; }
      if (c.south) { if (r0 < 0.5) sandMound(B, x, z, 0.8 + rnd() * 0.6); else if (r0 < 0.75) brainCoral(B, x, z, 0.5, rnd); else rock(B, x, z, 0.5, rnd); continue; }
      if (ar === 0) { if (r0 < 0.35) sandMound(B, x, z, 1.2 + rnd()); else if (r0 < 0.65) seaweed(B, x, z, 2 + rnd() * 1.2, rnd); else if (r0 < 0.85) rock(B, x, z, 1 + rnd() * 0.6, rnd); else fanCoral(B, x, z, 1.1, rnd, Math.atan2(c.nx, c.nz) + PI / 2); }
      else if (ar === 1) { if (r0 < 0.3) fanCoral(B, x, z, 1.2 + rnd() * 0.6, rnd, Math.atan2(c.nx, c.nz) + PI / 2); else if (r0 < 0.6) branchCoral(B, x, z, 1.4 + rnd() * 0.7, rnd); else if (r0 < 0.8) brainCoral(B, x, z, 1 + rnd() * 0.6, rnd); else tubeSponge(B, x, z, 1.3, rnd); }
      else if (ar === 2) { if (r0 < 0.55) kelp(B, x, z, 3.5 + rnd() * 2.5, rnd); else if (r0 < 0.8) rock(B, x, z, 1.2 + rnd() * 0.8, rnd); else sandMound(B, x, z, 1.3); }
      else { if (r0 < 0.45) coralPillar(B, x, z, 2.5 + rnd() * 2, rnd); else if (r0 < 0.75) rock(B, x, z, 1.4 + rnd() * 0.8, rnd); else tubeSponge(B, x, z, 1.4, rnd); }
    }
    // en dış halka: kuzeyde/yanda büyük kayalar ve mercan tepeleri (kenar dolu, tutarlı)
    const out = edgeSpots(L, api, { dmin: 5.2, dmax: 7.5, space: 5.5, avoid });
    for (const c of out) {
      if (c.south) continue;
      const ar = areaAt(L, c.x, c.z), x = c.x + c.nx, z = c.z + c.nz;
      if (arenaSouth(x, z)) continue;
      if (ar === 2) kelp(B, x, z, 5 + rnd() * 2, rnd);
      else if (ar === 3 || ar === 4) { rock(B, x, z, 2 + rnd(), rnd); if (rnd() < 0.5) coralPillar(B, x + 1.5, z, 3 + rnd() * 2, rnd); }
      else if (rnd() < 0.5) { rock(B, x, z, 1.8 + rnd() * 1.2, rnd); branchCoral(B, x + 1.2, z + 0.4, 1.2, rnd); }
      else { sandMound(B, x, z, 2 + rnd()); seaweed(B, x, z, 2.2, rnd); }
    }
    yield;
    // ── oda içi süsler: zemine yapışık deniz yıldızları, çakıllar, kum benekleri (yolu kesmeyen, alçak) ──
    L.rooms.forEach((rm, i) => {
      if (rm.kind === 'boss') return;
      const ar = areaAt(L, rm.x, rm.z);
      for (let q = 0; q < 2; q++) {   // SADE: yürünür alanda az süs
        const a = rnd() * TAU, d = (rm.r || 6) * (0.3 + rnd() * 0.6), x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
        if (!api.isFloor(x, z) || !api.circleFree(x, z, 0.5) || avoid.some(o => hyp(o.x - x, o.z - z) < o.r)) continue;
        if (q % 3 === 0) starDecor(B, x, z, 0.7, rnd); else pebbles(B, x, z, rnd);
      }
      api.glow(rm.x, rm.z, (rm.r || 6) * 0.95, ar === 3 ? 0xd8c8ff : 0xcff4ff, 0.1);
    });
    // ── oda içi mercan adacıkları: yolun dışında 2-3 küme (katı; yolu kesmez), oda dolu ve renkli görünsün ──
    L.rooms.forEach((rm, i) => {
      if (rm.kind === 'boss' || i === 0) return;
      const ar = areaAt(L, rm.x, rm.z), want = rm.kind === 'side' ? 0 : 1;   // SADE: oda içinde en çok bir mercan adacığı (kuzeyde)
      let made = 0;
      for (let t = 0; t < 30 && made < want; t++) {
        const a = rnd() * TAU, d = (rm.r || 6) * (0.45 + rnd() * 0.4), x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
        if (!api.isFloor(x, z) || !api.circleFree(x, z, 1.6) || api.linkDist(x, z) < 3 || avoid.some(o => hyp(o.x - x, o.z - z) < o.r + 1.5)) continue;
        if (D.taken.some(q => hyp(q.x - x, q.z - z) < q.r + 1.6)) continue;
        const south = z > rm.z - (rm.r || 6) * 0.1;
        if (south) continue;   // SADE: kamera tarafında / oda ortasında adacık yok
        avoid.push({ x, z, r: 2.4 }); made++;
        api.solid(x, z, south ? 0.6 : 0.85, 'mercan');
        if (south) { brainCoral(B, x, z, 0.55, rnd); anemone(B, x + 0.7, z + 0.3, 0.7, rnd); starDecor(B, x - 0.6, z + 0.5, 0.8, rnd); continue; }
        if (ar === 0) { rock(B, x, z, 0.8, rnd); seaweed(B, x + 0.5, z - 0.3, 1.4, rnd); scallop(B, x - 0.7, z + 0.5, 0.9, rnd); anemone(B, x + 0.6, z + 0.6, 0.7, rnd); }
        else if (ar === 1) { branchCoral(B, x, z, 1.1, rnd); brainCoral(B, x + 0.8, z + 0.5, 0.5, rnd); anemone(B, x - 0.7, z + 0.4, 0.8, rnd); fanCoral(B, x - 0.3, z - 0.6, 0.8, rnd, rnd() * 0.6 - 0.3); }
        else if (ar === 2) { rock(B, x, z, 0.9, rnd); kelp(B, x - 0.4, z - 0.4, 2.6, rnd); seaweed(B, x + 0.7, z + 0.3, 1.2, rnd, PAL.weed[3]); conch(B, x + 0.4, z + 0.8, 0.9, rnd); }
        else { tubeSponge(B, x, z, 1.0, rnd); branchCoral(B, x + 0.7, z + 0.2, 0.8, rnd); B.add('glow', G.sphere(12, 8), C(0xfff0ff, 1.6), [x - 0.6, 0.16, z + 0.6], null, 0.15); }
        api.glow(x, z, 2.2, [0xfff0c8, 0xffd0e8, 0xd8ffe8, 0xe0d0ff][ar], 0.14);
      }
    });
    // ── geçit kemerleri ──
    (L.areas || []).forEach((a, k) => {
      if (!k || !a.gate) return;
      const prevR = L.rooms[(L.areas[k - 1].rooms || [])[0]] || L.rooms[0], dir = Math.atan2(a.gate.x - prevR.x, a.gate.z - prevR.z);
      coralArch(B, a.gate.x, a.gate.z, dir + PI / 2, 5.2, rnd);
    });
    // ── İnci Mağarası: mor-mavi parıltı, tavandan sarkan ışıklı damlalar yok (açık deniz) → yerde parlayan inciler ──
    const a4 = (L.areas || [])[3];
    if (a4) for (const ri of a4.rooms) {
      const rm = L.rooms[ri]; if (!rm) continue;
      for (let q = 0; q < 10; q++) {
        const a = q / 10 * TAU + rnd() * 0.3, e = edge(api, rm, Math.sin(a), Math.cos(a)), x = e.x + Math.sin(a) * 0.8, z = e.z + Math.cos(a) * 0.8;
        if (api.isFloor(x, z)) continue;
        B.add('glow', G.sphere(8, 6), C([0xfff0ff, 0xd8f0ff, 0xffe8d0][q % 3], 1.6), [x, 0.16, z], null, 0.14);
      }
      api.light(rm.x, 2.2, rm.z - 2, 0xc8a8ff, 2.2, 10, 0.12);
    }
    yield;
    // ── etkileşimler ──
    for (const v of D.vents) ventLook(B, api, R, v);
    if (D.vents.length) R.zones.push({ x: D.vents[0].x, z: D.vents[0].z, r: 6.5, enter: () => say('pr_mercan_kabarcik') });
    for (const g of D.gold) goldSugar(api, R, g.x, g.y, g.z, { sticker: g.sticker, r: g.high ? 1.5 : 1.1, dy: g.high ? 1.3 : 1.4 });
    for (const o of D.oysters) oyster(api, R, o, false);
    if (D.ship) toyShip(B, api, R, D.ship);
    for (const s of D.secrets) {
      if (s.kind === 'inci') { oyster(api, R, s, true); api.light(s.x, 1.8, s.z, 0xffe8ff, 2.0, 6, 0.1); }
      else bottle(B, api, R, s);
    }
    for (const p of D.piles) sandPile(B, api, R, p);
    if (D.mini) miniLook(B, api, D.mini);
    if (D.vents.length) ventColumns(api, D.vents);
    caveArches(B, api, L, rnd);
    if (D.arena) arenaDecor(B, api, L, R, D.arena);
    yield;
    // ── ışık huzmeleri: odaların kuzey yarısında (ön planı örtmez) ──
    {
      const k = new Kit();
      L.rooms.forEach((rm, i) => {
        const n = rm.kind === 'side' ? 0 : 1;   // SADE: oda başına tek, sönük huzme
        for (let q = 0; q < n; q++) {
          const x = rm.x + (rnd() - 0.5) * (rm.r || 6) * 1.2, z = rm.z - (rm.r || 6) * (0.2 + rnd() * 0.6), h = 15;
          const w = 2.2 + rnd() * 0.8;
          k.push([x, 0, z], [0.0, 0, 0.22]);
          k.add(G.cyl(0.45, 1, 12, true), new THREE.Color(rnd(), 0, 0), [0, h / 2, 0], null, [w, h, w]);
          k.pop();
          api.glow(x, z, w * 1.15, 0xdff8ff, 0.18);   // huzmenin zemine düştüğü yumuşak ışık havuzu
          SHAFTS.push({ x, z, r: w });
        }
      });
      const sh = new THREE.Mesh(k.build(), shaftMat()); sh.renderOrder = 5; sh.frustumCulled = false; api.add(sh);
    }
    // ── zemin ışık desenleri (caustics) + kabarcıklar + plankton ──
    const cm = causticMat(), cp = new THREE.Mesh(new THREE.PlaneGeometry(64, 64).rotateX(-PI / 2), cm);
    cp.position.y = 0.035; cp.renderOrder = 1; cp.frustumCulled = false; api.add(cp);
    const bubM = pointsCloud(api, 'bub', 55), plM = pointsCloud(api, 'plank', 70);   // SADE: az kabarcık/plankton
    // ── sürü balıklar ve denizanaları: kuzey ve yanlarda, yürünür alanın dışında ──
    const anchors = { fish: [], jelly: [] };
    {
      const spots = edgeSpots(L, api, { dmin: 4, dmax: 6.5, space: 14, avoid: [] }).filter(c => !c.south);
      spots.forEach((c, i) => {
        if (i % 2 === 0 && anchors.fish.length < 4) anchors.fish.push({ x: c.x + c.nx * 2, z: c.z + c.nz * 2, y: 2.4 + rnd() * 1.6, r: 2.5 + rnd() * 1.5, sp: (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.2) });
        else if (anchors.jelly.length < 4) anchors.jelly.push({ x: c.x + c.nx * 3, z: c.z + c.nz * 3, y: 3 + rnd() * 2.5, s: 0.7 + rnd() * 0.5 });
      });
    }
    schools(api, L, anchors);
    babySetup(api);
    FIN = null;
    // ── her kare: gölgelendirici merkezleri, kask, Pırıl'ın kabarcıkları, ortam sesi ──
    let ambT = 3, kaskT = 1.2, pirilT = 0.5, shT = 0;
    api.anim((dt, hx, hz) => {
      cm.uniforms.uC.value.set(hx, 0, hz);
      if ((shT -= dt) <= 0) {   // en yakın 6 huzme (zemin deseni orada daha parlak)
        shT = 0.5; const near = SHAFTS.filter(q => hyp(q.x - hx, q.z - hz) < 26).sort((a, b) => hyp(a.x - hx, a.z - hz) - hyp(b.x - hx, b.z - hz));
        cm.uniforms.uS.value.forEach((v, i) => { const q = near[i]; if (q) v.set(q.x, q.z, q.r); else v.set(0, 0, 0); });
      }
      cp.position.x = Math.round(hx / 4) * 4; cp.position.z = Math.round(hz / 4) * 4;
      bubM.uniforms.uC.value.set(hx, 0, hz); plM.uniforms.uC.value.set(hx, 0, hz);
      const ph = (typeof renderer !== 'undefined' && renderer.domElement ? renderer.domElement.height : 800) * 0.5;
      bubM.uniforms.uPx.value = ph; plM.uniforms.uPx.value = ph;
      helmetSync(true);
      finaleStep(dt);
      babyStep(dt, hx, hz);
      if (!live()) return;
      const P = GAME.P;
      if ((kaskT -= dt) <= 0) { kaskT = 1.1 + Math.random() * 0.9; burst('bubble', P.pos.x, 1.75 + (R.lift || 0), P.pos.z, { count: 2, scale: 0.6 }); }
      const Bi = GAME.Bilbo;
      if (Bi && Bi.root && (pirilT -= dt) <= 0) { pirilT = 0.45 + Math.random() * 0.4; const p = Bi.root.position; burst('bubble', p.x, p.y + 0.6, p.z, { count: 1, scale: 0.6 }); }
      if ((ambT -= dt) <= 0) { ambT = 4 + Math.random() * 5; sfx('kabarcik', { x: P.pos.x + (Math.random() - 0.5) * 8, z: P.pos.z - 4, vol: 0.25 }); }
    });
    B.done();
  }

  // ── Kapı ve kontrol noktaları kurulduktan sonra: çıkış kapısının arkasına dev deniz kabuğu ──
  function kurSon(L, api) {
    api = sadeApi(api);
    const ex = L.exit; if (!ex) return;
    const B = batch(api), k = B.k('pearl', ex.x, ex.z), c0 = C(0xffd8e8), c1 = C(0xff9ab8);
    k.push([ex.x, 0, ex.z - 2.2], [0.25, 0, 0], 3.2);
    k.add(G.sphere(28, 14, 0), (x, y) => { const a = Math.atan2(x - ex.x, y + 0.5); return tmpC.copy(c0).lerp(c1, Math.pow(Math.abs(Math.sin(a * 9)), 4) * 0.7); }, [0, 1.1, 0], null, [1.1, 1.0, 0.18]);
    k.add(G.box(), c0, [0, 0.1, 0], null, [0.6, 0.3, 0.3]);
    k.pop();
    for (const sd of [-1, 1]) { seaweed(B, ex.x + sd * 3.4, ex.z - 1.6, 1.6, api.rnd); anemone(B, ex.x + sd * 2.6, ex.z - 2.4, 0.8, api.rnd); }
    B.done();
    api.glow(ex.x, ex.z, 3.5, 0xffe0f0, 0.2);
  }

  // ── Bölüm dışı olaylar: kask çıkar; boss neşelenince İnci Sarayı kutlaması (kabarcık fıskiyeleri + ışıltı) ──
  function hook() {
    if (typeof GAME === 'undefined' || !GAME || !GAME.on) { setTimeout(hook, 300); return; }
    try {   // gizli çıkartmalar (Çıkartma Albümü'nün Mercan sayfası)
      if (typeof HUB !== 'undefined' && HUB && HUB.GIZLI) HUB.GIZLI.mercan = Object.assign(HUB.GIZLI.mercan || {}, {
        gizli_mercan_kabarcik: ['Kabarcık Uçuşu', '🫧'], gizli_mercan_inci: ['Kocaman İnci', '🦪'], gizli_mercan_gemi: ['Gemi Hazinesi', '⛵'], gizli_mercan_sise: ['Mesaj Şişesi', '🍾'] });
    } catch (e) { /* albüm yok */ }
    GAME.on('zone', () => { if (!inZone()) { helmetSync(false); floorSand(null, false); finaleEnd(); BABY = null; } });
    GAME.on('happy', e => {
      if (!e || !e.boss || e.type !== 'kocaKirpiBalik' || !inZone()) return;
      finaleStart(e);
      const R = ACTIVE, ap = R && R.arenaPearl;
      let n = 0;
      const fount = () => {
        if (!inZone() || n++ > 16) return;
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + n * 0.4, x = e.x + Math.sin(a) * 5, z = e.z + Math.cos(a) * 5; burst('bubble', x, 0.4, z, { count: 5, scale: 1.5 }); }
        if (ap) burst('sparkle', ap.x, 2 + Math.random(), ap.z + 1, { color: '#fff0ff', count: 5 });
        if (n % 4 === 0) sfx('kabarcik', { x: e.x, z: e.z, vol: 0.7 });
        setTimeout(fount, 260);
      };
      fount();
      say('pr_mercan_kutlama', { gap: 0 });
    });
  }
  hook();

  BOLUM.define('mercan', {
    ad: 'Mercan Denizi Bahçesi',
    taban: 'moon',               // ay zemini (kumlu toz) + dışarıda yumuşak kum tepeleri; uDream kur()'da kapatılır
    size: 100, side: 2,
    areas: [{ id: 'a1', ad: 'Kabuk Kumsalı', rooms: 2 }, { id: 'a2', ad: 'Mercan Ormanı', rooms: 2 }, { id: 'a3', ad: 'Batık Gemi Koyu', rooms: 2 }, { id: 'a4', ad: 'İnci Mağarası', rooms: 1 }],
    muzik: 'pr_mercan',
    malzeme: 'isik2',
    kayipEsya: null,
    final: false,
    isik: { fog: [0x2a9ccc, 28, 84], hemiSky: 0xb4ecff, hemiGround: 0x2a6a94, hemi: 0.78, sunColor: 0xfff2d8, sun: 2.0, sunOffset: [-10, 28, 10],
      env: [0x6fd0f8, 0x2a98cc, 0x124a6a, 0.8], bloom: 0.24, exposure: 0.93, sat: 1.18, vig: 0.3, fezaLight: 1.2, fezaLightColor: 0xcff8ff },
    zemin: { tA: 0xf4d0a0, tB: 0xf8dcb0, tC: 0xf6d4a6, out: 0x8ab8b0, outAmt: 0.38, macro: 0xffeed0 },
    minimap: { zemin: '#f2dcae' },
    harita: { ad: 'Mercan Denizi Bahçesi', detay: 'Suyun altında mercanlar, inciler ve Koca Kirpi Balık', renk: '#5cc8e8', x: 42, y: 32, simge: '🐚' },
    yerlesim, kur, kurSon,
  });
  return { riding: () => !!(ACTIVE && ACTIVE.fly && typeof GAME !== 'undefined' && GAME.L === ACTIVE.L), helmetSync, _qa: () => ({ baby: BABY, fin: FIN }) };
})();
