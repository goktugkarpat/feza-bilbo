/* ── Bölüm 1: Oturma Odası (Dev Ev Macerası) ──
   Minicik Feza için dev bir oturma odası: balık sırtı meşe parke, gri-mavi-krem zikzak örgü halı (lifleri orman gibi),
   alçak siyah TV ünitesi (kitaplar, video kasetleri) ve dev televizyon, koltuğun altı (loş, kayıp eşyalar), vazoda sarı-pembe çiçekler.
   Alanlar: 1 Halı Ormanı (lifler, toz tavşanları, kayıp düğme/para hazineleri) · 2 Kitaplık Dağı (domino kitaplar, kaset şeridi,
   kumanda → TV çizgi filmi) · 3 Koltuk Altı (Bilbo ile yarış, Aytuğ Hala'nın gözlüğü, uçuşan çiçek yaprakları) · arena: halının ortası.
   Ortak araçlar: ODAKIT (src/06y_odakit.js). Cümleler: src/02l_odalarA.js. Biçim: src/SPEC.md › "Dev Ev API". */
HUYSUZ.zone('oturma', { enemies: { tozTavsani: 4, kumanda: 3, corap: 3 }, elites: ['tozTavsani', 'kumanda'] });

const OTURMA = (() => {
  'use strict';
  const K = ODAKIT, C = (key, make) => K.GEOC[key] || (K.GEOC[key] = K.keepG(make()));
  const BINIS = () => typeof BILBO_FUN !== 'undefined' && !!BILBO_FUN && typeof BILBO_FUN.ride === 'function';
  const PER_AREA = [['tozTavsani'], ['kumanda', 'tozTavsani'], ['corap', 'tozTavsani', 'kumanda']];

  // ── kalıcı geometriler ──
  const BOOKC = [[0xd9534f, 0xf6d365], [0x3f7cc4, 0xf2f2f2], [0x4caf7d, 0xfff0c8], [0xf2a541, 0x7a3e1d], [0x8e6cc4, 0xffd6f0], [0xe8e2d0, 0x3f6fa8], [0x2f4858, 0xf6ae2d], [0xf48fb1, 0xffffff]];
  // kitap (birim: x kalınlık, y boy, z derinlik; sırt +z'de)
  const bookGeo = i => C('otBook' + (i % 8), () => {
    const [c, a] = BOOKC[i % 8], k = new Kit(), b = G.box();
    k.add(b, c, [0, 0, 0.46], null, [1, 1, 0.08]);
    k.add(b, c, [-0.46, 0, 0], null, [0.08, 1, 1]); k.add(b, c, [0.46, 0, 0], null, [0.08, 1, 1]);
    k.add(b, 0xfbf3e0, [0, 0, -0.02], null, [0.84, 0.955, 0.94]);
    for (const y of [0.36, -0.36]) k.add(b, a, [0, y, 0.505], null, [1.01, 0.045, 0.02]);
    k.add(b, 0xfff8ea, [0, 0.07, 0.505], null, [0.66, 0.3, 0.015]);
    for (let l = 0; l < 3; l++) k.add(b, 0x5a4a44, [0, 0.15 - l * 0.075, 0.515], null, [0.44 - l * 0.1, 0.028, 0.01]);
    return k.build();
  });
  // video kaseti (birim: x uzun kenar, y kalınlık, z en; etiket +z)
  const vhsGeo = i => C('otVhs' + (i % 3), () => {
    const k = new Kit(), b = G.box(), cy = G.cyl(1, 1, 14), lab = [0xe0533d, 0x3f8fd8, 0xf2b134][i % 3];
    k.add(b, 0x232328, [0, 0, 0], null, [1, 1, 1]);
    k.add(b, 0xf4f1ea, [0, 0, 0.503], null, [0.86, 0.64, 0.01]); k.add(b, lab, [0, 0.14, 0.51], null, [0.86, 0.12, 0.01]);
    k.add(b, 0x4a4a52, [0, 0.503, -0.06], null, [0.56, 0.01, 0.42]);
    for (const sx of [-0.15, 0.15]) { k.add(cy, 0xe9e6dd, [sx, 0.507, -0.06], null, [0.075, 0.01, 0.14]); k.add(cy, 0x6a4a36, [sx, 0.51, -0.06], null, [0.05, 0.01, 0.09]); }
    for (const sx of [-0.47, 0.47]) k.add(b, 0x3a3a40, [sx, 0, 0], null, [0.04, 1.02, 1.02]);
    return k.build();
  });
  // toz tavşanı yumağı (süs)
  const dustGeo = () => C('otDust', () => {
    const k = new Kit(), s = G.sphere(8, 6);
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = i ? 0.5 : 0; k.add(s, i % 3 ? 0xb9b6b2 : 0xd9d6d0, [Math.cos(a) * r, 0.45 + (i % 3) * 0.12, Math.sin(a) * r], [i, i * 2, 0], [0.55, 0.42, 0.5]); }
    for (let i = 0; i < 7; i++) { const a = i * 0.9; k.add(G.cyl(0.3, 1, 4, true), 0xcfccc6, [Math.cos(a) * 0.75, 0.55, Math.sin(a) * 0.75], [Math.sin(a) * 1.2, 0, Math.cos(a) * 1.2], [0.03, 0.7, 0.03]); }
    return k.build();
  });
  // kayıp hazine: dev düğme (renk çeşidi) / bozuk para / lego / bilye
  const treasureGeo = kind => C('otTr' + kind, () => {
    const k = new Kit(), cy = G.cyl(1, 1, 28), b = G.rbox(2), s = G.sphere(18, 12);
    if (kind === 'para') {
      k.add(cy, 0xe2b649, [0, 0, 0], null, [1, 0.16, 1]); k.add(cy, 0xf5d36e, [0, 0.085, 0], null, [0.84, 0.01, 0.84]);
      k.add(G.torus(TAU, 0.08, 28), 0xc9982e, [0, 0.09, 0], [Math.PI / 2, 0, 0], [0.78, 0.78, 0.6]);
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5; k.add(s, 0xc9982e, [Math.sin(a) * 0.3, 0.1, Math.cos(a) * 0.3], null, [0.12, 0.02, 0.12]); }
    } else if (kind === 'lego') {
      k.add(b, 0xe23b3b, [0, 0.3, 0], null, [1.6, 0.6, 0.8]);
      for (const x of [-0.6, -0.2, 0.2, 0.6]) for (const z of [-0.2, 0.2]) k.add(cy, 0xf04a4a, [x, 0.66, z], null, [0.13, 0.14, 0.13]);
    } else if (kind === 'bilye') {
      k.add(s, 0x7fd0f0, [0, 0.6, 0], null, [0.6, 0.6, 0.6]); k.add(s, 0xf2f9ff, [-0.2, 0.82, 0.25], null, [0.14, 0.1, 0.1]);
      k.add(G.torus(TAU, 0.18, 24), 0xf06a9a, [0, 0.6, 0], [0.5, 0, 0.6], [0.42, 0.42, 0.42]);
    } else {   // düğme
      const c = { dugmeK: 0xe8504d, dugmeM: 0x4f8fdc, dugmeS: 0xf2c14a }[kind] || 0xe8504d;
      k.add(cy, c, [0, 0, 0], null, [1, 0.22, 1]); k.add(G.torus(TAU, 0.12, 28), new THREE.Color(c).multiplyScalar(0.8), [0, 0.1, 0], [Math.PI / 2, 0, 0], [0.86, 0.86, 0.9]);
      for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) k.add(cy, 0x3a2a24, [x, 0.115, z], null, [0.1, 0.01, 0.1]);
    }
    return k.build();
  });
  const CRAY = [0xe8504d, 0x4f8fdc, 0x5ac85a, 0xf2c14a, 0xb07ad0, 0xf48fb1];
  const crayonGeo = i => C('otCrayon' + (i % 6), () => {   // mum boya: gövde, kâğıt kılıf, sivri uç
    const k = new Kit(), c = CRAY[i % 6];
    k.add(G.cyl(1, 1, 12), c, [0, 0, 0], [0, 0, Math.PI / 2], [0.26, 3, 0.26]);
    k.add(G.cyl(1, 1, 12), 0xfff6e0, [0.2, 0, 0], [0, 0, Math.PI / 2], [0.27, 1.8, 0.27]);
    for (const x of [-0.6, 1.0]) k.add(G.cyl(1, 1, 12), new THREE.Color(c).multiplyScalar(0.7), [x, 0, 0], [0, 0, Math.PI / 2], [0.275, 0.08, 0.275]);
    k.add(G.cone(12), c, [-1.75, 0, 0], [0, 0, Math.PI / 2], [0.26, 0.5, 0.26]);
    return k.build();
  });
  const blockGeo = i => C('otBlock' + (i % 4), () => {   // ahşap oyuncak küp, renkli yüzler
    const k = new Kit(), b = G.rbox(2), cols = [[0xe8504d, 0x4f8fdc], [0x5ac85a, 0xf2c14a], [0xb07ad0, 0x4f8fdc], [0xf48fb1, 0x5ac85a]][i % 4];
    k.add(b, 0xe8c48e, [0, 0.5, 0], null, [1, 1, 1]);
    k.add(G.box(), cols[0], [0, 0.5, 0.505], null, [0.66, 0.66, 0.01]); k.add(G.box(), cols[1], [0.505, 0.5, 0], null, [0.01, 0.66, 0.66]);
    k.add(G.box(), cols[1], [-0.505, 0.5, 0], null, [0.01, 0.66, 0.66]); k.add(G.box(), cols[0], [0, 1.005, 0], null, [0.66, 0.01, 0.66]);
    k.add(G.box(), 0xffffff, [0, 0.62, 0.512], null, [0.12, 0.34, 0.01]); k.add(G.box(), 0xffffff, [0, 0.42, 0.512], null, [0.3, 0.1, 0.01]);   // harf gibi
    return k.build();
  });
  const ballGeo = i => C('otBall' + (i % 3), () => {   // çizgili lastik top
    const k = new Kit(), [a, b] = [[0xe8504d, 0xfff4e0], [0x4f8fdc, 0xf2c14a], [0x5ac85a, 0xffffff]][i % 3];
    k.add(G.sphere(24, 16), (x, y, z) => new THREE.Color(Math.sin(Math.atan2(z, x) * 3) > 0 ? a : b), [0, 1, 0], null, [1, 1, 1]);
    k.add(G.sphere(10, 8), 0xffffff, [-0.35, 1.55, 0.45], null, [0.18, 0.1, 0.1]);
    return k.build();
  });
  const tasselGeo = () => C('otTassel', () => {   // dev püskül: düğüm topu + sarkan iplikler
    const k = new Kit();
    k.add(G.sphere(16, 12), 0xd9d2c4, [0, 3.9, 0], null, [0.55, 0.5, 0.55]); k.add(G.cyl(1, 1, 16), 0x8d9db0, [0, 3.45, 0], null, [0.5, 0.3, 0.5]);
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14, r = 0.32 + (i % 2) * 0.12; k.add(G.cyl(0.8, 1, 5), i % 3 ? 0xeee8dc : 0xc3cbd3, [Math.sin(a) * r, 1.65, Math.cos(a) * r], [Math.cos(a) * 0.08, 0, -Math.sin(a) * 0.08], [0.11, 3.3, 0.11]); }
    k.add(G.cyl(1, 1, 12), 0x6a5a4a, [0, 4.5, 0], null, [0.06, 0.7, 0.06]);
    return k.build();
  });
  const pencilGeo = () => C('otPencil', () => {
    const k = new Kit(), c6 = G.cyl(1, 1, 6), cone = G.cone(12);
    k.add(c6, 0xf4c430, [0, 0, 0], [0, 0, Math.PI / 2], [0.32, 5, 0.32]);
    k.add(G.cyl(1, 1, 12), 0xc0c4c8, [2.65, 0, 0], [0, 0, Math.PI / 2], [0.33, 0.3, 0.33]);
    k.add(G.cyl(1, 1, 12), 0xf49ab0, [3.0, 0, 0], [0, 0, Math.PI / 2], [0.32, 0.45, 0.32]);
    k.add(cone, 0xe8c9a0, [-2.85, 0, 0], [0, 0, Math.PI / 2], [0.32, 0.7, 0.32]);
    k.add(cone, 0x3b3b3b, [-3.12, 0, 0], [0, 0, Math.PI / 2], [0.1, 0.22, 0.1]);
    return k.build();
  });
  const glassesGeo = () => C('otGlasses', () => {
    const k = new Kit(), t = G.torus(TAU, 0.16, 28), s = G.sphere(16, 10);
    for (const sx of [-0.62, 0.62]) { k.add(t, 0x7a3b28, [sx, 0, 0], null, [0.5, 0.42, 0.5]); k.add(s, 0xbfe6f5, [sx, 0, 0], null, [0.44, 0.36, 0.05]); k.add(s, 0xffffff, [sx - 0.15, 0.12, 0.05], null, [0.1, 0.06, 0.02]); }
    k.add(G.torus(Math.PI, 0.12, 12), 0x7a3b28, [0, 0.08, 0], null, [0.16, 0.14, 0.2]);
    for (const sx of [-1.1, 1.1]) k.add(G.box(), 0x7a3b28, [sx, 0.05, -0.6], null, [0.08, 0.1, 1.2]);
    return k.build();
  });
  const pawGeo = () => C('otPaw', () => {
    const k = new Kit(), cy = G.cyl(1, 1, 32);
    k.add(cy, 0xffd27a, [0, 0, 0], null, [1.45, 0.05, 1.45]); k.add(G.torus(TAU, 0.08, 32), 0xf4a63a, [0, 0.04, 0], [Math.PI / 2, 0, 0], [1.42, 1.42, 0.5]);
    k.add(cy, 0x7a4a2a, [0, 0.04, 0.22], null, [0.46, 0.02, 0.38]);
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.55; k.add(cy, 0x7a4a2a, [Math.sin(a) * 0.68, 0.04, 0.22 - Math.cos(a) * 0.68], null, [0.17, 0.02, 0.21]); }
    return k.build();
  });
  const remoteGeo = () => C('otRemote', () => {
    const k = new Kit(), b = G.rbox(2), cy = G.cyl(1, 1, 20);
    k.add(b, 0x2d2f36, [0, 0.2, 0], null, [1.35, 0.4, 3.6]);
    k.add(b, 0x40434c, [0, 0.39, 0.1], null, [1.15, 0.04, 3.1]);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) k.add(cy, 0xb9bec8, [(c - 1) * 0.34, 0.42, 0.25 + r * 0.32], null, [0.11, 0.05, 0.11]);
    for (const [x, col] of [[-0.35, 0x5ac85a], [0, 0xf2c14a], [0.35, 0x4f8fdc]]) k.add(cy, col, [x, 0.42, -0.35], null, [0.1, 0.05, 0.1]);
    k.add(G.torus(TAU, 0.18, 24), 0x8a8f99, [0, 0.42, -0.95], [Math.PI / 2, 0, 0], [0.42, 0.42, 0.3]);
    return k.build();
  });
  const powerGeo = () => C('otPower', () => {
    const k = new Kit(), cy = G.cyl(1, 1, 24);
    k.add(cy, 0xf04040, [0, 0, 0], null, [0.36, 0.12, 0.36]); k.add(G.torus(TAU * 0.8, 0.12, 16), 0xffffff, [0, 0.07, 0], [Math.PI / 2, 0, -Math.PI * 0.6 + Math.PI / 2], [0.18, 0.18, 0.2]);
    k.add(G.box(), 0xffffff, [0, 0.07, -0.08], null, [0.04, 0.02, 0.16]);
    return k.build();
  });
  const cupGeo = () => C('otVase', () => {   // vazo + sarı-pembe çiçekler
    const k = new Kit(), lat = new THREE.LatheGeometry([[0, 0], [1.3, 0], [1.6, 0.6], [1.75, 1.8], [1.5, 3.1], [1.0, 3.6], [1.12, 3.9], [0.9, 3.95]].map(p => new THREE.Vector2(p[0], p[1])), 28);
    k.add(lat, (x, y) => new THREE.Color().setHSL(0.56, 0.35, 0.62 + y * 0.04), [0, 0, 0]);
    k.add(G.torus(TAU, 0.08, 28), 0xf4f1e8, [0, 2.2, 0], [Math.PI / 2, 0, 0], [1.74, 1.74, 1]);
    const st = [[0, 0], [0.9, 0.4], [-0.8, 0.3], [0.3, -0.8], [-0.4, -0.6], [1.2, -0.3]];
    st.forEach(([x, z], i) => {
      const h = 6.2 + (i % 3) * 0.8, top = [x * 1.6, h, z * 1.6], col = i % 2 ? 0xf6d04d : 0xf49ac0;
      k.seg([x * 0.3, 3.6, z * 0.3], top, 0.07, 0x6aa84f);
      for (let p = 0; p < 6; p++) { const a = p * TAU / 6; k.add(G.sphere(10, 6), col, [top[0] + Math.sin(a) * 0.42, top[1], top[2] + Math.cos(a) * 0.42], [0, a, 0], [0.34, 0.12, 0.22]); }
      k.add(G.sphere(10, 8), i % 2 ? 0xc06a2a : 0xf6d04d, top, null, [0.22, 0.16, 0.22]);
      k.add(G.sphere(8, 6), 0x7cbf5a, [top[0] * 0.8 + 0.3, h - 1.6, top[2] * 0.8], [0, i, 0.6], [0.5, 0.08, 0.22]);
    });
    return k.build();
  });

  // ── yardımcılar ──
  const bbox = (L, ids, m) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const i of ids) { const r = L.rooms[i]; x0 = Math.min(x0, r.x - r.r - m); x1 = Math.max(x1, r.x + r.r + m); z0 = Math.min(z0, r.z - r.r - m); z1 = Math.max(z1, r.z + r.r + m); } return { x0, x1, z0, z1 }; };
  const inRect = (q, x, z) => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1;
  const mainOf = (L, a) => (a ? a.rooms.filter(i => L.rooms[i] && L.rooms[i].kind !== 'side') : []);
  // geçitteki koridor yönü (birim vektör) — köprüleri koridor boyunca yatırmak için
  function gateDir(L, g) {
    let best = null, bd = 1e9, bi = 0;
    for (const l of L.links) if (l.main && l.curve) l.curve.forEach((p, i) => { const d = Math.hypot(p[0] - g.x, p[1] - g.z); if (d < bd) { bd = d; best = l; bi = i; } });
    if (!best) return [0, -1];
    const c = best.curve, a = c[Math.max(0, bi - 4)], b = c[Math.min(c.length - 1, bi + 4)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  }
  // yürünür kenarın hemen dışındaki noktalar (oda çevresinde): hazineler, kaset, domino için
  function rimSpots(L, rm, off = 1.0) {
    const out = [];
    for (let k = 0; k < 24; k++) {
      const a = k * TAU / 24; let last = null;
      for (let d = rm.r * 0.4; d < rm.r + 6; d += 0.25) { const x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d; if (!K.isF(L, x, z)) { last = { x: x + Math.sin(a) * off, z: z + Math.cos(a) * off, a, inX: x - Math.sin(a) * 1.2, inZ: z - Math.cos(a) * 1.2 }; break; } }
      if (last && L.links.every(l => !l.curve || l.curve.every(p => Math.hypot(p[0] - last.x, p[1] - last.z) > 3.2))) out.push(last);
    }
    return out;
  }

  // ── yerleşim (saf veri) ──
  function yerlesim(L, api) {
    const A = L.areas || [], areaOf = {};
    A.forEach((a, k) => a.rooms.forEach(ri => { areaOf[ri] = k; }));
    // nazik gruplar: her grupta en çok 3 huysuz; alanına göre tür
    const packs = {}, keep = [];
    for (const sp of L.spawns) {
      const n = packs[sp.pack] = (packs[sp.pack] || 0) + 1;
      if (n > 3) continue;
      const ar = areaOf[sp.room] ?? 0, list = PER_AREA[Math.min(PER_AREA.length - 1, ar)];
      sp.type = list[(n - 1 + ar) % list.length]; delete sp.variant;
      keep.push(sp);
    }
    L.spawns.length = 0; L.spawns.push(...keep);
    for (const sp of L.spawns) if (!api.circleFree(sp.x, sp.z, 1.0)) { const q = api.randomFloorNear(sp.x, sp.z, 0.5, 4); if (q && api.circleFree(q.x, q.z, 1.0)) { sp.x = q.x; sp.z = q.z; } }   // (Feza'nın ulaşamayacağı sıkışık yerde doğmasın)
    // Aytuğ Hala'nın gözlüğü: koltuk altında (3. alanın yan odası ya da son odası)
    const a3 = A[2];
    if (a3) {
      const side = a3.rooms.find(i => L.rooms[i].kind === 'side'), rm = L.rooms[side ?? a3.rooms[a3.rooms.length - 1]];
      const p = api.randomFloorNear(rm.x, rm.z - rm.r * 0.25, 0, rm.r * 0.45);
      L.kayipEsya = { id: 'gozluk', x: p ? p.x : rm.x, z: p ? p.z : rm.z };
      L.lostSpot = { x: L.kayipEsya.x, z: L.kayipEsya.z, id: 'gozluk' };   // (Bilbo'nun koklayıp kazdığı yer: 04_bilbo_fun)
      // Bilbo'ya biniş: patili halka (en geniş koltuk altı odası); Bilbo ajanının istasyonu kind 'binis'
      const ms = a3.rooms.filter(i => L.rooms[i].kind !== 'side'), big = L.rooms[ms.slice().sort((p1, p2) => L.rooms[p2].r - L.rooms[p1].r)[0]];
      if (big) {
        const pp = K.inRoom(L, api, big, Math.PI * 0.75, 0.35, 1.5); L._otPaw = { x: pp.x, z: pp.z, room: big };
        if (BINIS()) (L.stations = L.stations || []).push({ id: 'binisOturma', kind: 'binis', x: pp.x, z: pp.z, r: 1.6, sure: 14 });
      }
    }
    // mini oyun hediye kutusu: Halı Ormanı'nın ikinci odasında
    if (A[0]) { const rm = L.rooms[A[0].rooms[A[0].rooms.length - 1]]; L._otMini = K.miniStation(L, api, rm, ['balonPatlat', 'sekerYakala']); }
    // fazladan hazine sandıkları (her alanın ilk odasında, yolun kenarında)
    for (const a of A.slice(0, 3)) {
      const rm = L.rooms[a.rooms[0]];
      for (let t = 0; t < 30; t++) {
        const ang = api.rnd() * TAU, d = rm.r * (0.45 + api.rnd() * 0.25), x = rm.x + Math.sin(ang) * d, z = rm.z + Math.cos(ang) * d;
        if (!api.circleFree(x, z, 1.6) || L.chests.some(c => Math.hypot(c.x - x, c.z - z) < 6) || L.spawns.some(s => Math.hypot(s.x - x, s.z - z) < 2.5) || Math.hypot(x - L.start.x, z - L.start.z) < 4) continue;
        if (L.checkpoints.some(c => Math.hypot(c.x - x, c.z - z) < 4)) continue;
        L.chests.push({ x, z, big: false }); break;
      }
    }
  }

  // ── görsel kurulum ──
  function* kur(L, api) {   // üreteç: yield'ler oda geçişinde ayrı karelere düşer (06_level buildSteps)
    K.lowShadow(api);
    const rnd = api.rnd, A = L.areas || [], a1 = A[0], a2 = A[1], a3 = A[2], ar = A[3];
    const R = i => L.rooms[i];
    const rug1 = a1 ? bbox(L, mainOf(L, a1), 6.5) : null, rugA = ar ? bbox(L, ar.rooms, 5) : null;
    const sofa = a3 ? bbox(L, a3.rooms, 3.5) : null;
    const shadeAt = (x, z) => { if (!sofa) return 0; const d = Math.min(x - sofa.x0, sofa.x1 - x, z - sofa.z0, sofa.z1 - z); return Math.max(0, Math.min(1, d / 3)); };
    K.floor(L, api, { mats: [{ tex: 'parquet', size: 13.4, rough: 0.42 }], region: (x, z) => [0, 0, shadeAt(x, z)], out: [0.46, 0.45, 0.5], shadeColor: [0.52, 0.44, 0.38] });
    yield;
    // halılar (kalın: 12 cm), saçaklar, lifler
    const rugs = [rug1, rugA].filter(Boolean);
    for (const q of rugs) {
      K.slab(api, L, { x: (q.x0 + q.x1) / 2, z: (q.z0 + q.z1) / 2, w: q.x1 - q.x0, d: q.z1 - q.z0, h: 0.12, tex: 'carpet', size: 8, rough: 0.97 });
    }
    // gizli hazinelerin yerleri önceden: liflerin arasında açıklık kalsın, görünsünler
    const trPlan = [];
    const pick = (rm, n) => { const sp = rimSpots(L, rm, 0.9).filter(q => K.floorNorth(L, q.x, q.z, 3) > 2 || q.z < rm.z); for (let i = 0; i < n && sp.length; i++) trPlan.push(sp.splice(Math.floor(rnd() * sp.length), 1)[0]); };
    if (a1) mainOf(L, a1).forEach((ri, k) => pick(R(ri), k ? 2 : 1));
    if (a2) pick(R(a2.rooms[a2.rooms.length - 1]), 1);
    if (a3) pick(R(mainOf(L, a3)[0]), 1);
    const nearTr = (x, z) => trPlan.some(q => Math.hypot(q.x - x, q.z - z) < 1.7);
    const items = [], fringe = [], PP = L.path || [];
    const pathD = (x, z) => { let d = 1e9; for (let i = 1; i < PP.length; i++) { const a = PP[i - 1], b = PP[i], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2)); d = Math.min(d, Math.hypot(x - a.x - dx * t, z - a.z - dz * t)); } return d; };
    for (const q of rugs) {
      for (let z = q.z0 + 0.3; z < q.z1 - 0.2; z += 0.72) for (let x = q.x0 + 0.3; x < q.x1 - 0.2; x += 0.72) {
        const px = x + (rnd() - 0.5) * 0.5, pz = z + (rnd() - 0.5) * 0.5;
        if (K.isF(L, px, pz)) {   // yürünür halıda: seyrek, kısa ilmek kümeleri (yolun üstünde değil)
          if (q === rug1 && rnd() < 0.16 && pathD(px, pz) > 1.6) items.push({ x: px, z: pz, h: 0.22 + rnd() * 0.2, s: 1.1 + rnd() * 0.5, c: K.carpetColor(px, pz).multiplyScalar(1.08), yaw: rnd() * TAU });
          continue;
        }
        const fd = K.floorDist(L, px, pz, 8);
        if (fd < 0.5 || fd > 8 || nearTr(px, pz)) continue;
        let h = 0.45 + Math.min(1, fd / 2.5) * (0.6 + rnd() * 0.6);
        const fN = K.floorNorth(L, px, pz, 6); if (fN < 99) h = Math.min(h, 0.2 + fN * 0.24);
        items.push({ x: px, z: pz, h, s: 1.5 + rnd() * 0.5, c: K.carpetColor(px, pz).multiplyScalar(1.04), yaw: rnd() * TAU });
      }
      for (const zz of [q.z0, q.z1]) for (let x = q.x0 + 0.2; x < q.x1; x += 0.42) {   // saçaklar (kısa kenarlar: kuzey/güney)
        if (K.isF(L, x, zz)) continue;
        fringe.push({ x, z: zz + (zz === q.z0 ? -0.35 : 0.35), h: 0.28, s: 0.9, c: new THREE.Color(0xf3ede0), yaw: rnd() });
      }
    }
    K.tufts(api, items); K.tufts(api, fringe, 'loop');
    // toz tavşanı yumakları (halı ormanında, liflerin arasında)
    if (rug1) for (let n = 0, t = 0; n < 14 && t < 300; t++) {
      const x = rug1.x0 + rnd() * (rug1.x1 - rug1.x0), z = rug1.z0 + rnd() * (rug1.z1 - rug1.z0);
      const fd = K.floorDist(L, x, z, 6); if (fd < 1.2 || fd > 5 || K.floorNorth(L, x, z, 5) < 3) continue;
      const s = 0.8 + rnd() * 0.8; api.put(dustGeo(), x, 0.05, z, s, s, s, null, rnd() * TAU); n++;
    }
    const T = K.toys(api);
    // ── Alan 1 · Halı Ormanı: kayıp hazineler ──
    const kinds = ['dugmeK', 'para', 'dugmeM', 'lego', 'dugmeS', 'bilye', 'para', 'dugmeK'];
    let tk = 0, firstTr = true;
    trPlan.forEach((sp0, i) => {
      const s = sp0, kind = kinds[tk++ % kinds.length], sc = kind === 'para' ? 1.25 : kind === 'bilye' ? 1.3 : 1.1;
      K.treasure(api, T, s.x, s.z, treasureGeo(kind), { y: 0.2, sc, rough: kind === 'para' ? 0.3 : 0.4, line: firstTr ? 'oda_hazine_ipucu' : null, say: i ? null : kind === 'para' ? 'oda_para_bul' : 'oda_hazine_bul', sticker: 'oturma_hazine', gs: i === trPlan.length - 1 });
      firstTr = false;
    });
    yield;
    // geçit köprüleri: kitap köprüsü (1→2), boyama kitabı (2→3)
    const bridge = (g, ci) => {   // yere yatırılmış dev kitap: kapaklar, sayfa bloğu (kenarlarda sayfa çizgileri), sırt, kapakta güneş resmi
      if (!g) return;
      const [dx, dz] = gateDir(L, g), yaw = Math.atan2(-dz, dx), [c, acc] = BOOKC[ci % 8], Lg = 6.4, Wd = 5.0;
      const at = (u, v) => [g.x + Math.cos(yaw) * u + Math.sin(yaw) * v, g.z - Math.sin(yaw) * u + Math.cos(yaw) * v];   // u: koridor boyunca, v: enine
      let [x, z] = at(0, 0);
      api.box(x, 0.04, z, Lg, 0.08, Wd, c, yaw);                                        // alt kapak
      [x, z] = at(0.1, -0.1); api.box(x, 0.2, z, Lg - 0.35, 0.26, Wd - 0.3, 0xfbf3e0, yaw);   // sayfalar
      for (let k = 0; k < 5; k++) { [x, z] = at(0.1, -0.1); api.box(x, 0.09 + k * 0.05, z, Lg - 0.33, 0.012, Wd - 0.28, 0xe6dcc6, yaw); }
      [x, z] = at(0, 0); api.box(x, 0.37, z, Lg, 0.08, Wd, c, yaw);                     // üst kapak
      [x, z] = at(0, Wd / 2); api.put(G.cyl(1, 1, 16), x, 0.2, z, 0.22, Lg, 0.22, c, yaw, 0, Math.PI / 2);   // yuvarlak sırt
      for (const u of [-Lg * 0.38, Lg * 0.38]) { [x, z] = at(u, Wd / 2 + 0.02); api.put(G.cyl(1, 1, 16), x, 0.2, z, 0.235, 0.18, 0.235, acc, yaw, 0, Math.PI / 2); }
      [x, z] = at(0, -0.2); api.box(x, 0.42, z, Lg * 0.62, 0.02, Wd * 0.5, 0xfff3d8, yaw);   // kapak etiketi
      [x, z] = at(-0.8, -0.2); api.ball(x, 0.44, z, 0.6, 0.04, 0.6, 0xf6c84a);           // güneş
      for (let k = 0; k < 8; k++) { const a = k * TAU / 8; [x, z] = at(-0.8 + Math.cos(a) * 0.95, -0.2 + Math.sin(a) * 0.95); api.ball(x, 0.44, z, 0.16, 0.03, 0.16, 0xf6c84a); }
      for (let k = 0; k < 3; k++) { [x, z] = at(0.8, -0.65 + k * 0.42); api.box(x, 0.44, z, 1.3 - k * 0.25, 0.02, 0.14, 0x6a5548, yaw); }   // başlık çizgileri
    };
    if (a2) bridge(a2.gate, 0); if (a3) bridge(a3.gate, 2);
    // arena girişinde iki dev halı püskülü
    if (ar) K.gatePosts(L, ar.gate, 4.6, (x, z, yaw) => api.put(tasselGeo(), x, 0, z, 1, 1, 1, null, yaw));
    // ── Alan 2 · Kitaplık Dağı ──
    const occR = (x, z) => rugs.some(q => inRect(q, x, z)), occ2 = (x, z) => occR(x, z) || (sofa && inRect(sofa, x, z));
    if (a2) kitaplik(L, api, T, mainOf(L, a2), rnd, occ2);
    yield;
    // ── Alan 3 · Koltuk Altı ──
    if (a3) koltuk(L, api, T, a3, sofa, rnd, occR);
    // (alan girişi cümleleri hikâyede: STORY.area → alan_oturma_N)
    if (L._otMini) K.miniBox(api, T, L._otMini, 'oda_mini_ipucu');
    // kuzey duvarı (gri-mavi) + süpürgelik + priz, arenanın arkasında; çıkış kapısı
    duvar(L, api);
    // yürünür kenar: halıda krem, parkede açık meşe
    K.edge(L, api, (x, z) => (rugs.some(q => inRect(q, x, z)) ? 0xf1ece2 : sofa && inRect(sofa, x, z) ? 0xb59a7e : 0xe9d2ae), 0.1);
    OT.saidTr = 0;
  }

  function kitaplik(L, api, T, rooms, rnd, occ) {
    if (!rooms.length) return;
    // TV ünitesi: alçak siyah dolap (bölmelerinde kitaplar, video kasetleri), üstünde dev TV. Yer: önce odaların kuzeyi
    // (TV kameraya bakar), sığmazsa yanları; genişlik 15 → 9.5 m. Yerel çerçeve: +z dolabın önü (odaya bakar).
    const D = 4.2, H = 2.2, order = rooms.slice().sort((p1, p2) => L.rooms[p1].z - L.rooms[p2].z);
    let pl = null;
    search: for (const [th, ox, oz] of [[0, 0, -1], [Math.PI / 2, -1, 0], [-Math.PI / 2, 1, 0]]) for (const Wt of [15, 12, 9.5]) for (const ri of order) {
      const r0 = L.rooms[ri];
      for (let d = 0.3; d < 14; d += 0.5) {
        const off = r0.r + D / 2 + d, x = r0.x + ox * off, z = r0.z + oz * off, hw = th ? D / 2 : Wt / 2, hd = th ? Wt / 2 : D / 2;
        if (K.rectFree(L, x, z, hw, hd, 0.4)) { pl = { x, z, th, W: Wt, rm: r0 }; break search; }
      }
    }
    const W = pl ? pl.W : 15, rm = pl ? pl.rm : L.rooms[order[0]];
    const p = pl;
    const toLocal = (x, z) => { const c = Math.cos(pl.th), sn = Math.sin(pl.th), dx = x - pl.x, dz = z - pl.z; return [dx * c - dz * sn, dx * sn + dz * c]; };
    let tv = null;
    if (pl) {
      const c = Math.cos(pl.th), sn = Math.sin(pl.th), th = pl.th, cx = pl.x, cz = pl.z;
      const F = (lx, lz) => [cx + lx * c + lz * sn, cz - lx * sn + lz * c];
      const bx = (lx, y, lz, w, h, d, col) => { const [x, z] = F(lx, lz); api.box(x, y, z, w, h, d, col, th); };
      const putL = (geo, lx, y, lz, sx, sy, sz, yawL = 0, rx = 0, rz = 0) => { const [x, z] = F(lx, lz); api.put(geo, x, y, z, sx, sy, sz, null, th + yawL, rx, rz); };
      const fz = D / 2, blk = 0x26272c, blk2 = 0x34363d;
      bx(0, 0.15, 0, W - 0.4, 0.3, D - 0.4, 0x141416);                       // tekmelik
      bx(0, H - 0.12, 0, W, 0.24, D, blk2);                                   // üst tabla
      bx(0, 0.42, 0, W, 0.24, D, blk);                                        // alt tabla
      bx(0, H / 2, -D / 2 + 0.1, W, H, 0.2, blk);                             // arka
      for (const sx of [-1, -1 / 3, 1 / 3, 1]) bx(sx * (W / 2 - 0.12), H / 2 + 0.15, 0, 0.24, H - 0.3, D, blk);
      bx(0, H + 0.01, D / 2 - 0.05, W, 0.04, 0.1, 0x4a4d56);                  // üst kenar parıltısı
      // bölmeler: sol kitaplar, orta kasetler, sağ kitaplar
      const cw = (W - 0.72) / 3, x0 = -W / 2 + 0.24;
      for (let k = 0; k < 3; k++) {
        const bxl = x0 + k * (cw + 0.24), by = 0.54, bh = H - 0.78;
        if (k === 1) {
          for (let s2 = 0; s2 < 6; s2++) putL(vhsGeo(s2), bxl + cw / 2, by + 0.16 + s2 * 0.31, fz - 1.3, 2.2, 0.3, 1.2, (s2 % 2 - 0.5) * 0.08);
          for (let s2 = 0; s2 < 4 && cw > 2.6; s2++) putL(vhsGeo(s2 + 1), bxl + cw - 0.35 - s2 * 0.32, by + 1.1, fz - 1.4, 2.2, 0.3, 1.2, Math.PI / 2, 0, Math.PI / 2);
        } else {
          let x = bxl + 0.15;
          while (x < bxl + cw - 0.6) { const t2 = 0.32 + rnd() * 0.3, h = bh * (0.7 + rnd() * 0.28), i = Math.floor(rnd() * 8); putL(bookGeo(i), x + t2 / 2, by + h / 2, fz - 1.25, t2, h, 2.1); x += t2 + 0.03; }
        }
      }
      // TV: ayak + çerçeve + ekran (ayrı, oynatılabilir)
      const sw = Math.min(11.5, W - 2.5), sh = sw * 0.574, sy = H + 0.55 + sh / 2, szl = -0.2;
      bx(0, H + 0.1, szl, 3.2, 0.12, 1.6, 0x1b1c20); bx(0, H + 0.35, szl, 0.6, 0.5, 0.4, 0x1b1c20);
      bx(0, sy, szl, sw + 0.4, sh + 0.4, 0.35, 0x111215);
      { const [x, z] = F(0, szl + 0.18); tv = tvScreen(api, x, sy, z, sw, sh); tv.mesh.rotation.y = th; }
      // kumanda: dolabın önünde, odada; dev kırmızı tuşa basınca TV açılır
      const q = K.inRoom(L, api, rm, Math.atan2(cx - rm.x, cz - rm.z), 0.72, 1.6), rr = th + 0.15;
      api.put(remoteGeo(), q.x, 0, q.z, 1, 1, 1, null, rr);
      const pw = K.mesh(api, powerGeo(), q.x - Math.sin(rr) * 0.95, 0.46, q.z - Math.cos(rr) * 0.95, 0.35, false);
      api.solid(q.x + Math.sin(rr) * 0.8, q.z + Math.cos(rr) * 0.8, 0.7); api.solid(q.x - Math.sin(rr) * 0.8, q.z - Math.cos(rr) * 0.8, 0.7);
      const [lx4, lz4] = F(0, fz + 4);
      const lt = { x: lx4, y: 3.5, z: lz4, col: new THREE.Color(0xffffff), int: 0, dist: 18, fl: 0, ph: 0 }; api.B.lights.push(lt);
      // TV açıkken önündeki parkeye renkli ışık havuzu (yukarıdan bakınca da görünsün)
      const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gx = gc.getContext('2d'), gr = gx.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 128, 128);
      const gt = new THREE.CanvasTexture(gc); api.dispose(gt);
      const gm = new THREE.MeshBasicMaterial({ map: gt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false }); api.dispose(gm);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), gm); pool.rotation.order = 'YXZ'; pool.rotation.set(-Math.PI / 2, th, 0); pool.scale.set(18, 11, 1);
      { const [x, z] = F(0, fz + 4.2); pool.position.set(x, 0.08, z); } pool.renderOrder = 3; api.add(pool); api.dispose(pool.geometry);
      // kitap basamakları: dolabın yanından üstüne çıkan dev kitap merdiveni
      for (let st = 0; st < 4; st++) { const blx = W / 2 + 1.4 + st * 0.15, blz = D / 2 + 1.6 - st * 1.0, t3 = 0.55; const [wx, wz] = F(blx, blz); for (let l = 0; l <= st; l++) { if (K.isF(L, wx, wz)) break; putL(bookGeo(st + l * 3), blx, l * t3 + t3 / 2, blz, t3, 3.2, 2.2, Math.PI / 2 + (l % 2 ? 0.06 : -0.04), 0, Math.PI / 2); } }
      const [sbx, sbz] = F(0, fz + 1);
      let on = 0, press = 0;
      T.add({ x: q.x, z: q.z, r: 2.3, hint: { y: 1.6 }, line: 'oda_kumanda_ipucu', near: 8, cd: 4, repeat: true, dance: 6,
        can: () => on <= 0,
        use: () => { on = 14; press = 0.35; tv.on(true); K.sfx('click', { x: q.x, z: q.z }); K.sfx('unlock', { x: q.x, z: q.z, vol: 0.6 }); K.say('oda_tv_ac'); K.sticker('oturma_tv');
          K.burst('star', sbx, 3, sbz); K.sugar(GAME.P.pos.x, GAME.P.pos.z, 8, 5); },
        tick: (dt, t, hx, hz) => {
          if (press > 0) { press -= dt; pw.position.y = 0.46 - Math.sin(Math.min(1, press / 0.35) * Math.PI) * 0.1; }
          if (on > 0) {
            on -= dt; tv.tick(dt);
            lt.int = 5.5 * Math.min(1, on, (14 - on) * 2); lt.col.setHSL((t * 0.15) % 1, 0.75, 0.6);
            gm.opacity = 0.55 * Math.min(1, on, (14 - on) * 2); gm.color.setHSL((t * 0.15) % 1, 0.8, 0.55);
            if (Math.floor(on * 2) !== Math.floor((on + dt) * 2)) {   // çizgi film ekrandan taşıyor: yıldız, kalp, konfeti
              const a = Math.random() * TAU, d = 2 + Math.random() * 5;
              K.burst(Math.random() < 0.5 ? 'star' : 'confetti', hx + Math.sin(a) * d, 2.5 + Math.random() * 2, hz + Math.cos(a) * d * 0.6);
            }
            if (on <= 0) { tv.on(false); lt.int = 0; gm.opacity = 0; K.say('oda_tv_kapa', 1); }
          }
        } });
    }
    // dolabın çevresi ve odalar boyunca: kitap yığınları, kaset kuleleri, boya kalemleri, oyuncak küpler, toplar (güneyde alçak)
    K.fill(L, rnd, L.areas[1].rooms, (x, z, maxH, fd, k) => {
      if (pl) { const [lx, lz] = toLocal(x, z); if (Math.abs(lx) < W / 2 + 1.2 && Math.abs(lz) < D / 2 + 1.2) return; }
      const kind = k % 5;
      if (kind === 0 && maxH > 2.4) {   // kaset kulesi
        const n = Math.min(Math.floor(maxH / 0.3), 5 + Math.floor(rnd() * 7)), y0 = rnd() * TAU;
        for (let s = 0; s < n; s++) api.put(vhsGeo(s + k), x, 0.15 + s * 0.3, z, 2.2, 0.3, 1.2, null, y0 + (rnd() - 0.5) * 0.25);
      } else if (kind === 2 && maxH > 2) api.put(blockGeo(k), x, 0, z, 1.6, 1.6, 1.6, null, rnd() * TAU);
      else if (kind === 3 && maxH > 2.2) api.put(ballGeo(k), x, 0, z, 1.1, 1.1, 1.1, null, rnd() * TAU);
      else if (kind === 4 || maxH < 0.8) { for (let c = 0; c < 2; c++) api.put(crayonGeo(k + c), x + c * 0.5, 0.26, z + c * 0.3, 1, 1, 1, null, rnd() * TAU); }
      else {   // yatık kitap yığını
        const n = Math.max(1, Math.min(Math.floor(maxH / 0.45), 2 + Math.floor(rnd() * 4))); let y = 0;
        for (let s = 0; s < n; s++) { const th = 0.35 + rnd() * 0.25, h = 3.2 - s * 0.25 + rnd() * 0.4; api.put(bookGeo(Math.floor(rnd() * 8)), x + (rnd() - 0.5) * 0.3, y + th / 2, z, th, h, 2.3 - s * 0.1, null, rnd() * TAU, 0, Math.PI / 2); y += th; }
      }
    }, { skip: occ, step: 2.6 });
    // parkeye dağılmış minik şeyler: pul, patlamış mısır tanesi, renkli boncuk (üstünden geçilir)
    K.scatter(L, rnd, L.areas[1].rooms, 10, (x, z, k) => {
      if (k % 3 === 0) api.put(G.cyl(1, 1, 14), x, 0.03, z, 0.26, 0.05, 0.26, [0xf2c14a, 0xe8504d, 0x4f8fdc][k % 3 === 0 ? (k / 3) % 3 | 0 : 0]);
      else if (k % 3 === 1) { api.ball(x, 0.2, z, 0.3, 0.22, 0.28, 0xfff4d6); api.ball(x + 0.2, 0.26, z + 0.1, 0.18, 0.16, 0.18, 0xfffaf0); }
      else api.ball(x, 0.16, z, 0.17, 0.17, 0.17, [0xf48fb1, 0x7fd0f0, 0x8fd18a][k % 3]);
    });
    // domino kitaplar: odanın kenarında dizili dik kitaplar; dokununca sırayla devrilir, sonuncusu şeker kavanozunu devirir
    const dr = L.rooms[rooms[rooms.length - 1]], spots = rimSpots(L, dr, 1.1).filter(s => s.z < dr.z + dr.r * 0.3 && !occ(s.x, s.z));
    const s0 = spots.sort((p1, p2) => p1.z - p2.z)[0];
    if (s0) (() => {
      const tx = Math.cos(s0.a), tz = -Math.sin(s0.a), yaw = Math.atan2(tx, tz);   // kenara teğet yön (devrilme yönü)
      const books = [];
      for (let i = 0; i < 7; i++) {
        const bx = s0.x + tx * (i - 3) * 0.95, bz = s0.z + tz * (i - 3) * 0.95;
        if (K.isF(L, bx, bz)) continue;
        const g = new THREE.Group(); g.position.set(bx, 0, bz); g.rotation.order = 'YXZ'; g.rotation.set(0, yaw, 0);
        const m = new THREE.Mesh(bookGeo(i + 3), K.vmat(0.5)); m.scale.set(0.42, 2.5, 1.9); m.rotation.y = Math.PI / 2; m.position.set(0, 1.25, -0.21); m.castShadow = true; m.receiveShadow = true;
        g.add(m); api.add(g); books.push({ g, a: 0, v: 0, go: -1 });
      }
      if (!books.length) return;
      const jar = new THREE.Group(); const last = books[books.length - 1];
      if (last) {
        jar.position.set(last.g.position.x + tx * 1.9, 0, last.g.position.z + tz * 1.9);
        const k = new Kit(); k.add(G.cyl(1, 1, 24), 0xdff3ff, [0, 1, 0], null, [0.85, 2, 0.85]); k.add(G.cyl(1, 1, 24), 0xf06a9a, [0, 2.1, 0], null, [0.9, 0.25, 0.9]);
        for (let i = 0; i < 9; i++) k.add(G.sphere(8, 6), [0xff6b9a, 0x6bc4ff, 0xffd34a, 0x7ee08a][i % 4], [Math.sin(i * 2.3) * 0.45, 0.4 + (i % 4) * 0.35, Math.cos(i * 2.3) * 0.45], null, 0.22);
        const jm = new THREE.Mesh(k.build(), K.vmat(0.25)); jm.castShadow = true; jar.add(jm); api.add(jar); api.dispose(jm.geometry);
      }
      let run = -1, jarT = -1;
      const b0 = books[0].g.position;
      T.add({ x: b0.x, z: b0.z, r: 2.6, hint: { y: 4.2 }, line: 'oda_domino_ipucu', near: 8, once: true,
        use: () => { run = 0; K.sfx('bonk', { x: s0.x, z: s0.z }); },
        tick: dt => {
          if (run < 0) return;
          run += dt;
          books.forEach((b, i) => {
            if (run < i * 0.28) return;
            if (b.go < 0) { b.go = 1; K.sfx('bonk', { x: b.g.position.x, z: b.g.position.z, pitch: 1 + i * 0.08, vol: 0.6 }); K.burst('dust', b.g.position.x, 0.3, b.g.position.z); }
            const target = i === books.length - 1 ? Math.PI / 2 : 0.4;
            b.v += dt * 9; b.a = Math.min(target, b.a + b.v * dt * 2.2); b.g.rotation.set(b.a, yaw, 0);
          });
          if (jarT < 0 && run > books.length * 0.28 + 0.3) {
            jarT = 0; K.sfx('break', { x: jar.position.x, z: jar.position.z }); K.burst('confetti', jar.position.x, 1.5, jar.position.z); K.burst('coin', jar.position.x, 1.2, jar.position.z);
            K.say('oda_domino'); K.sticker('oturma_domino'); K.sugar(GAME.P.pos.x, GAME.P.pos.z, 14, 8);
          }
          if (jarT >= 0 && jarT < 1) { jarT += dt; jar.rotation.z = -Math.min(1, jarT * 2) * 1.4; jar.position.y = Math.sin(Math.min(1, jarT * 2) * Math.PI) * 0.4; }
          if (run > 6) run = -1;
        } });
    })();
    // kaset şeridi: odada yatan kaset; dokununca parlak şerit kıvrılarak uzar, ucunda şekerler
    const cands = [];   // halının dışında (şerit parkede görünsün), odanın güney yarısında yatan kaset
    for (const ri of rooms) { const r0 = L.rooms[ri]; for (const q of rimSpots(L, r0, 0.4)) if (!occ(q.x, q.z) && q.z > r0.z - r0.r * 0.2) cands.push(Object.assign(q, { rm: r0 })); }
    cands.sort((p1, p2) => p2.z - p1.z);
    const cs = cands[0] || null, cr = cs ? cs.rm : L.rooms[rooms[0]];
    if (cs) {
      const cas = K.mesh(api, vhsGeo(1), cs.x, 0.2, cs.z, 0.4); cas.scale.set(2.2, 0.3, 1.2); cas.rotation.y = Math.atan2(cr.x - cs.x, cr.z - cs.z) + Math.PI / 2;
      const N = 90, pts = [];
      const dx0 = cr.x - cs.x, dz0 = cr.z - cs.z, l0 = Math.hypot(dx0, dz0) || 1;
      for (let i = 0; i <= N; i++) {
        const u = i / N, d = u * Math.min(l0 * 1.1, 9), sw = Math.sin(u * TAU * 1.5) * 1.4 * u;
        pts.push(new THREE.Vector3(cs.x + dx0 / l0 * d - dz0 / l0 * sw, 0.06 + Math.sin(u * 37) * 0.02, cs.z + dz0 / l0 * d + dx0 / l0 * sw));
      }
      const pos = new Float32Array((N + 1) * 2 * 3), idx = [];
      for (let i = 0; i <= N; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)], tx = p1.x - p0.x, tz = p1.z - p0.z, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl * 0.32, nz = tx / tl * 0.32;
        pos.set([pts[i].x + nx, pts[i].y + Math.abs(Math.sin(i * 0.7)) * 0.05, pts[i].z + nz, pts[i].x - nx, pts[i].y, pts[i].z - nz], i * 6);
        if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setIndex(idx); tg.computeVertexNormals(); tg.setDrawRange(0, 0);
      const tm = new THREE.MeshStandardMaterial({ color: 0x5a3a26, roughness: 0.25, metalness: 0.35, side: THREE.DoubleSide });
      const tape = new THREE.Mesh(tg, tm); tape.receiveShadow = true; api.add(tape);
      let g = -1, nextDrop = 0;
      T.add({ x: cs.x, z: cs.z, r: 2.2, hint: { y: 1.5 }, line: 'oda_kaset_ipucu', near: 7, once: true,
        use: () => { g = 0; K.sfx('whoosh', { x: cs.x, z: cs.z }); K.sticker('oturma_kaset'); },
        tick: dt => {
          if (g < 0 || g >= 1) return;
          g = Math.min(1, g + dt / 2.6); const n = Math.floor(g * N); tg.setDrawRange(0, n * 6);
          cas.rotation.z = Math.sin(g * 40) * 0.05;
          if (g * 6 >= nextDrop + 1) { nextDrop++; const q = pts[n]; K.burst('sparkle', q.x, 0.5, q.z); K.sugar(q.x, q.z, 4, 2); }
          if (g >= 1) K.say('oda_kaset');
        } });
    }
  }

  // TV ekranı: kanvasa çizilen neşeli çizgi film (açıkken saniyede ~15 kare)
  function tvScreen(api, x, y, z, w, h) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 148; const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; api.dispose(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }); api.dispose(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); api.add(m);
    let t = 0, acc = 0, isOn = false;
    const off = () => { const gr = g.createLinearGradient(0, 0, 256, 148); gr.addColorStop(0, '#2a2e36'); gr.addColorStop(0.45, '#15171c'); gr.addColorStop(0.5, '#262a32'); gr.addColorStop(1, '#0d0e11'); g.fillStyle = gr; g.fillRect(0, 0, 256, 148); tex.needsUpdate = true; };
    const draw = () => {
      const sky = g.createLinearGradient(0, 0, 0, 148); sky.addColorStop(0, `hsl(${(200 + Math.sin(t * 0.5) * 30) | 0},80%,70%)`); sky.addColorStop(1, '#fff3d6'); g.fillStyle = sky; g.fillRect(0, 0, 256, 148);
      // gökkuşağı
      ['#ff6b6b', '#ffb347', '#ffe66d', '#7ee08a', '#6bc4ff', '#b28dff'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 5; g.beginPath(); g.arc(128, 150, 110 - i * 5, Math.PI, 0); g.stroke(); });
      // güleryüzlü güneş
      const sx = 40 + Math.sin(t * 0.7) * 6, sy = 30; g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(sx, sy, 16, 0, TAU); g.fill();
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + t; g.strokeStyle = '#ffd84a'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx + Math.cos(a) * 20, sy + Math.sin(a) * 20); g.lineTo(sx + Math.cos(a) * 27, sy + Math.sin(a) * 27); g.stroke(); }
      g.fillStyle = '#5a3a20'; g.beginPath(); g.arc(sx - 5, sy - 3, 2, 0, TAU); g.arc(sx + 5, sy - 3, 2, 0, TAU); g.fill(); g.strokeStyle = '#5a3a20'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy + 2, 7, 0.2, Math.PI - 0.2); g.stroke();
      // tepeler
      g.fillStyle = '#7ccf6a'; g.beginPath(); g.moveTo(0, 148); for (let x = 0; x <= 256; x += 8) g.lineTo(x, 112 + Math.sin(x * 0.03 + t * 0.4) * 8); g.lineTo(256, 148); g.fill();
      g.fillStyle = '#5fb653'; g.beginPath(); g.moveTo(0, 148); for (let x = 0; x <= 256; x += 8) g.lineTo(x, 126 + Math.sin(x * 0.05 - t * 0.6) * 5); g.lineTo(256, 148); g.fill();
      // zıplayan pembe top karakter + koşan kahverengi köpek (Bilbo gibi)
      const bx = 128 + Math.sin(t * 1.3) * 70, by = 104 - Math.abs(Math.sin(t * 4)) * 34, sq = 1 + (1 - Math.abs(Math.sin(t * 4))) * 0.25;
      g.fillStyle = '#ff7eb6'; g.beginPath(); g.ellipse(bx, by, 14 * sq, 14 / sq, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(bx - 5, by - 3, 4, 0, TAU); g.arc(bx + 5, by - 3, 4, 0, TAU); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(bx - 4, by - 3, 2, 0, TAU); g.arc(bx + 6, by - 3, 2, 0, TAU); g.fill();
      g.strokeStyle = '#a0305a'; g.lineWidth = 2; g.beginPath(); g.arc(bx, by + 3, 5, 0.2, Math.PI - 0.2); g.stroke();
      const dx = ((t * 60) % 330) - 40, dy = 118 - Math.abs(Math.sin(t * 9)) * 4;
      g.fillStyle = '#6b3f22'; g.beginPath(); g.ellipse(dx, dy, 18, 9, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(dx + 17, dy - 7, 9, 8, 0, 0, TAU); g.fill();
      g.fillStyle = '#4a2a16'; g.beginPath(); g.ellipse(dx + 15, dy - 5, 4, 7, 0.4, 0, TAU); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(dx + 21, dy - 9, 1.6, 0, TAU); g.arc(dx + 26, dy - 6, 2, 0, TAU); g.fill();
      g.strokeStyle = '#6b3f22'; g.lineWidth = 3; g.beginPath(); g.moveTo(dx - 16, dy - 3); g.lineTo(dx - 23, dy - 10 + Math.sin(t * 20) * 4); g.stroke();
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(dx - 10 + i * 7, dy + 6); g.lineTo(dx - 10 + i * 7 + Math.sin(t * 18 + i * 2) * 3, dy + 13); g.stroke(); }
      // yıldızlar
      for (let i = 0; i < 6; i++) { const a = t * 2 + i; g.fillStyle = ['#fff', '#ffe66d', '#ffb3d9'][i % 3]; g.globalAlpha = 0.5 + 0.5 * Math.sin(a * 2); g.beginPath(); g.arc(150 + i * 18, 20 + (i % 3) * 12, 2.5, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      tex.needsUpdate = true;
    };
    off();
    return { mesh: m, on(v) { isOn = v; if (!v) off(); else { t = 0; draw(); } }, tick(dt) { if (!isOn) return; t += dt; acc += dt; if (acc > 1 / 15) { acc = 0; draw(); } } };
  }

  function koltuk(L, api, T, a3, sofa, rnd, occ) {
    const rooms = mainOf(L, a3), all = a3.rooms;
    // koltuk ayakları (dev, koyu ceviz; köşelerde, yürünür alanın dışında) ve kuzeyde koltuğun eteği
    const corners = [[sofa.x0 + 1.5, sofa.z0 + 1.5], [sofa.x1 - 1.5, sofa.z0 + 1.5]];
    for (const [cx0, cz0] of corners) {
      for (let t = 0; t < 20; t++) {
        const x = cx0 + (rnd() - 0.5) * t * 0.6, z = cz0 + (rnd() - 0.5) * t * 0.4;
        if (K.floorDist(L, x, z, 2) < 1.6) continue;
        api.put(G.cyl(0.8, 1, 20), x, 3, z, 1.0, 6, 1.0, 0x5a3a26); api.put(G.cyl(1, 1, 20), x, 0.12, z, 1.15, 0.24, 1.15, 0x3a2a1c); api.solid(x, z, 1.1); break;
      }
    }
    const nr = L.rooms[rooms.slice().sort((p, q) => L.rooms[p].z - L.rooms[q].z)[0]];
    // koltuğun eteği (kuzeyde): gri-mavi kumaş, kapitone düğmeler, krem püsküller; sığan en geniş boyda, her 3. alan odası için
    const skirts = [];
    for (const ri of rooms) {
      const r0 = L.rooms[ri];
      for (const w of [30, 22, 16, 11]) {
        const sk = K.northOf(L, r0.x, r0.z - r0.r - 1.0, w / 2, 0.6, 0.35, 9);
        if (sk && !skirts.some(q => Math.abs(q.x - sk.x) < (q.w + w) / 2 && Math.abs(q.z - sk.z) < 2)) { skirts.push(Object.assign(sk, { w })); break; }
      }
    }
    L._otSofa = skirts[0] || null;
    for (const sk of skirts) {
      const w = sk.w;
      api.box(sk.x, 4.2, sk.z - 0.45, w, 8.4, 0.9, 0x6d7f99);
      api.box(sk.x, 0.55, sk.z + 0.05, w, 1.1, 0.12, 0x5f7089);
      api.box(sk.x, 8.2, sk.z - 0.3, w + 0.4, 0.5, 1.2, 0x7a8ca6);
      for (let x = -w / 2 + 1.2; x < w / 2 - 0.6; x += 2.4) for (const y of [2.6, 5.4]) api.ball(sk.x + x + (y > 3 ? 1.2 : 0), y, sk.z + 0.02, 0.24, 0.24, 0.14, 0x56677f);
      for (let x = -w / 2 + 0.4; x < w / 2; x += 0.45) api.put(G.cyl(0.4, 1, 5, true), sk.x + x, 0.38, sk.z + 0.14, 0.07, 0.76, 0.07, x % 0.9 < 0.45 ? 0xd8d0c0 : 0xc8bfae);
    }
    // sıcak loş ışık havuzları + kayıp eşyalar + toz yumakları
    for (const ri of all) { const r0 = L.rooms[ri]; api.light(r0.x, 2.6, r0.z, 0xffb070, 2.4, 10); }
    const lost = [
      (x, z, y) => api.put(pencilGeo(), x, 0.32, z, 1, 1, 1, null, y),
      (x, z, y) => api.put(treasureGeo('para'), x, 0.1, z, 1.1, 1.1, 1.1, null, y),
      (x, z, y) => api.put(treasureGeo('lego'), x, 0, z, 1.2, 1.2, 1.2, null, y),
      (x, z, y) => { for (let i = 0; i < 4; i++) api.ball(x + Math.sin(i * 2) * 0.7, 0.35, z + Math.cos(i * 2) * 0.5, 0.42, 0.32, 0.4, 0xfff4d6); },   // patlamış mısır
      (x, z, y) => api.put(dustGeo(), x, 0.05, z, 1.4, 1.4, 1.4, null, y),
      (x, z, y) => api.put(dustGeo(), x, 0.05, z, 1.1, 1.1, 1.1, null, y),
    ];
    K.fill(L, rnd, all, (x, z, maxH, fd, k) => { if (maxH > 0.9 || k % 6 === 3) lost[k % lost.length](x, z, rnd() * TAU); else api.put(crayonGeo(k), x, 0.26, z, 1, 1, 1, null, rnd() * TAU); }, { skip: occ, step: 2.5, margin: 6 });
    // koltuğun altında sıcak ışıkta süzülen toz zerrecikleri (ışıl ışıl, yavaş)
    {
      const n = 60, g = new THREE.SphereGeometry(1, 6, 4); api.dispose(g);
      const mm = new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0.75, depthWrite: false, fog: false }); api.dispose(mm);
      const im = new THREE.InstancedMesh(g, mm, n); im.frustumCulled = false; api.add(im);
      const ps = [], m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
      for (let i = 0; i < n; i++) { const r0 = L.rooms[all[i % all.length]], a = rnd() * TAU, d = Math.sqrt(rnd()) * r0.r; ps.push({ x: r0.x + Math.sin(a) * d, y: 0.4 + rnd() * 3.2, z: r0.z + Math.cos(a) * d, ph: rnd() * 10, s: 0.03 + rnd() * 0.05 }); }
      api.anim((dt, hx, hz) => {
        if (Math.abs(hx - (sofa.x0 + sofa.x1) / 2) > (sofa.x1 - sofa.x0) / 2 + 20 || Math.abs(hz - (sofa.z0 + sofa.z1) / 2) > (sofa.z1 - sofa.z0) / 2 + 20) { im.visible = false; return; }
        im.visible = true; const t = TIME.t;
        for (let i = 0; i < n; i++) { const p = ps[i]; v.set(p.x + Math.sin(t * 0.3 + p.ph) * 0.8, p.y + Math.sin(t * 0.5 + p.ph * 2) * 0.4, p.z + Math.cos(t * 0.25 + p.ph) * 0.6); const k = p.s * (0.7 + 0.3 * Math.sin(t * 2 + p.ph)); sc.set(k, k, k); m4.compose(v, q, sc); im.setMatrixAt(i, m4); }
        im.instanceMatrix.needsUpdate = true;
      });
    }
    // vazo (koltuğun yanında) + uçuşan yapraklar
    const vr = L.rooms[rooms[0]], vp = K.northOf(L, vr.x + vr.r * 0.4, vr.z - vr.r - 2.4, 2, 2, 0.5, 10);
    if (vp) {
      api.put(cupGeo(), vp.x, 0, vp.z, 1, 1, 1, null, 0.3); L._otVase = vp;
      const n = 26, petals = [], g = new THREE.SphereGeometry(1, 8, 4); g.scale(0.32, 0.05, 0.22); api.dispose(g);
      const pm = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide }); api.dispose(pm);
      const im = new THREE.InstancedMesh(g, pm, n); im.castShadow = false; im.frustumCulled = false; api.add(im);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
      for (let i = 0; i < n; i++) { petals.push({ x: 0, y: -1, z: 0, ph: Math.random() * 10, sp: 0.5 + Math.random() * 0.4, t: -Math.random() * 12 }); im.setColorAt(i, new THREE.Color(i % 3 ? 0xf6a3c6 : 0xf8d65a)); }
      let said = false;
      api.anim((dt, hx, hz) => {
        const near = Math.hypot(hx - vp.x, hz - (vp.z + 6)) < 16;
        if (near && !said && K.playing()) { said = true; setTimeout(() => K.say('oda_yaprak', 1), 2500); }
        for (let i = 0; i < n; i++) {
          const pt = petals[i];
          pt.t -= dt;
          if (pt.y < 0.03 && pt.t < 0) { pt.x = vp.x + (Math.random() - 0.5) * 9; pt.z = vp.z + 1 + Math.random() * 9; pt.y = 7 + Math.random() * 2; pt.t = 0; }
          if (pt.y > 0.03) { pt.y -= dt * pt.sp; pt.x += Math.sin(TIME.t * 1.3 + pt.ph) * dt * 0.8; pt.z += Math.cos(TIME.t * 0.9 + pt.ph) * dt * 0.4; if (pt.y <= 0.03) { pt.y = 0.03; pt.t = 3 + Math.random() * 5; } }
          p.set(pt.x, pt.y, pt.z); q.setFromEuler(e.set(Math.sin(TIME.t * 2 + pt.ph) * (pt.y > 0.05 ? 0.9 : 0), pt.ph, Math.cos(TIME.t * 1.7 + pt.ph) * (pt.y > 0.05 ? 0.7 : 0)));
          m4.compose(p, q, s); im.setMatrixAt(i, m4);
        }
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      });
    }
    // Bilbo ile yarış: patili halkaya basınca 14 s hız; odanın çevresindeki toz yumaklarını topla
    const big = L._otPaw ? L._otPaw.room : L.rooms[rooms.slice().sort((p, q) => L.rooms[q].r - L.rooms[p].r)[0]];
    const pp = L._otPaw || K.inRoom(L, api, big, Math.PI * 0.75, 0.35, 1.5);
    K.pawPad(api, pp.x, pp.z);
    const balls = [];
    for (let i = 0; i < 10; i++) {
      const q = K.inRoom(L, api, big, i * TAU / 10 + 0.3, 0.72, 0.6);
      const m = new THREE.Mesh(dustGeo(), K.vmat(0.95)); m.position.set(q.x, 0, q.z); m.scale.setScalar(0.7); m.visible = false; m.castShadow = false; api.add(m);
      balls.push({ m, x: q.x, z: q.z, on: false });
    }
    let race = 0, got = 0, goldGiven = false, endAt = null;
    T.add({ x: pp.x, z: pp.z, r: 1.8, hint: { y: 2.4 }, line: 'oda_bilbo_ipucu', near: 9, cd: 5, repeat: true,
      can: () => race <= 0,
      use: () => {
        race = 14; got = 0; balls.forEach(b => { b.on = true; b.m.visible = true; b.m.scale.setScalar(0.01); });
        K.say('oda_bilbo_yaris'); K.sfx('bilboBark', {}); K.burst('star', pp.x, 1, pp.z); K.sticker('oturma_bilbo');
        const stop = () => { race = 0; balls.forEach(b => { b.on = false; b.m.visible = false; }); K.say('oda_bilbo_bitti', 1); };
        if (BINIS() && (L.stations || []).some(st => st.kind === 'binis')) endAt = stop;   // gerçek biniş (UI istasyonu GAME.rideBilbo'yu başlatır)
        else T.boost(1.75, 14, stop);   // yer tutucu: hızlı koşu
      },
      tick: (dt, t, hx, hz) => {
        if (race <= 0) return;
        race -= dt;
        if (endAt && race <= 0) { const f = endAt; endAt = null; f(); return; }
        if (GAME.P && Math.random() < dt * 8) K.burst('dust', GAME.P.pos.x, 0.2, GAME.P.pos.z);
        for (const b of balls) {
          if (!b.on) continue;
          const s = Math.min(0.75, b.m.scale.x + dt * 2); b.m.scale.setScalar(s); b.m.position.y = Math.abs(Math.sin(t * 5 + b.x)) * 0.3; b.m.rotation.y += dt * 2;
          if (Math.hypot(hx - b.x, hz - b.z) < 1.5) {
            b.on = false; b.m.visible = false; K.burst('smoke', b.x, 0.6, b.z); K.sfx('pop', { x: b.x, z: b.z, pitch: 1 + got * 0.08 }); K.sugar(hx, hz, 4, 3); got++;
            if (got === balls.length) { K.burst('confetti', hx, 2, hz); K.burst('star', hx, 2.5, hz); K.sfx('cheer', { x: hx, z: hz }); K.say('oda_bilbo_hepsi');
              if (!goldGiven) { goldGiven = true; try { GAME.addGoldSugar(1); } catch (e) { /* */ } } }
          }
        }
      } });
    // Aytuğ Hala'nın gözlüğü: Bilbo'nun kokladığı toz tepeciği; yaklaşınca kazılır
    const ke = L.kayipEsya;
    if (ke && BINIS()) T.add({ x: ke.x, z: ke.z, r: 0, near: 8, hint: false, line: 'oda_gozluk_ipucu', prio: 1, use() {} });   // (kazma işini Bilbo yapar)
    else if (ke) K.lost(api, T, { zone: 'oturma', id: 'gozluk', x: ke.x, z: ke.z, mound: dustGeo(), item: glassesGeo(), itemScale: 0.9, ipucu: 'oda_gozluk_ipucu', bulundu: 'oda_gozluk', dirt: 'dirt' });
  }

  function duvar(L, api) {
    const ex = L.exit; if (!ex) return;
    let w = 60, z = ex.z - 2.4;
    while (w > 16 && !K.rectFree(L, ex.x, z - 0.4, w / 2, 0.4, 0.2)) w -= 4;
    const wc = 0x8d9db1;
    api.box(ex.x, 7, z - 0.4, w, 14, 0.8, wc);
    api.box(ex.x, 0.6, z + 0.08, w, 1.2, 0.3, 0xf6f3ec); api.box(ex.x, 1.22, z + 0.12, w, 0.08, 0.36, 0xffffff);
    // dev kapı (çıkış) ve kasası
    api.box(ex.x, 5.6, z + 0.02, 6.4, 11.2, 0.14, 0xfaf6ee);
    for (const sx of [-1, 1]) api.box(ex.x + sx * 3.35, 5.7, z + 0.1, 0.4, 11.4, 0.3, 0xffffff);
    api.box(ex.x, 11.45, z + 0.1, 7.1, 0.4, 0.3, 0xffffff);
    api.ball(ex.x + 2.5, 5, z + 0.25, 0.3, 0.3, 0.3, 0xe2b649);
    // priz (sevimli yüz gibi)
    const px = ex.x - Math.min(w / 2 - 4, 12);
    api.box(px, 2.6, z + 0.06, 1.6, 1.6, 0.12, 0xfaf8f2); api.ball(px - 0.32, 2.7, z + 0.13, 0.12, 0.16, 0.04, 0x3a3a3a); api.ball(px + 0.32, 2.7, z + 0.13, 0.12, 0.16, 0.04, 0x3a3a3a);
  }

  const OT = { yerlesim, kur, saidTr: 0 };
  return OT;
})();

BOLUM.define('oturma', {
  ad: 'Oturma Odası',
  taban: 'bathroom',          // (zemin bölümün kendi parkesi; eski tema yalnız ışık tabanı)
  size: 90, side: 2,
  areas: [{ id: 'a1', ad: 'Halı Ormanı', rooms: 2 }, { id: 'a2', ad: 'Kitaplık Dağı', rooms: 2 }, { id: 'a3', ad: 'Koltuk Altı', rooms: 2 }],
  muzik: 'orman',
  malzeme: 'un', kayipEsya: 'gozluk',
  isik: { fog: [0xdfe3e8, 26, 72], hemiSky: 0xfff4e6, hemiGround: 0x8f8778, sunColor: 0xffe2bf, env: [0xe4e8ee, 0xf6ead8, 0x8a8478, 0.95], bloom: 0.34, sat: 1.08 },
  zemin: { tA: 0xd8b07a, tB: 0xd0a670, tC: 0xe6c496, out: 0x8a7a68, outAmt: 0.6, macro: 0xfff4e4 },
  minimap: { zemin: '#c9a06a' },
  harita: { ad: 'Oturma Odası', detay: 'Halı ormanı, kitaplık dağı ve koltuk altı', renk: '#9fb4cf', x: 50, y: 30, simge: '🛋️' },
  yerlesim(L, api) { OTURMA.yerlesim(L, api); },
  kur(L, api) { return OTURMA.kur(L, api); },
});
