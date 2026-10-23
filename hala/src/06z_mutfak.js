/* ── Bölüm 2: Mutfak (Dev Ev Macerası) ──
   Minicik Feza için dev bir mutfak: krem granit tezgâh, kesme tahtası, ekmek kırıntısı kayaları, un dağları; çelik lavabo gölü,
   krom musluk, yoğurt kabı tekne; dolap içi (kavanozlar, baharatlar, makarna köprüsü); ocak üstü (sönük, güvenli) arena.
   Alanlar: 1 Tezgâh Tepeleri (sünger trambolin, tereyağı kaydırağı, un dağı kayması) · 2 Lavabo Gölü (musluk aç/kapa, köpük,
   kap-tekne yolculuğu) · 3 Dolap İçi (kapak açılınca gizli geçit, baharat sırrı → altın şeker, şeker kavanozu, Aytuğ Hala'nın
   anahtarı) · arena: ocak üstü (Düdüklü Tencere). Ortak araçlar: ODAKIT (src/06y_odakit.js). Cümleler: src/02l_odalarA.js. */
HUYSUZ.zone('mutfak', { enemies: { kasik: 4, kopukBalonu: 3, unTorbasi: 3 }, elites: ['kasik', 'unTorbasi'] });

const MUTFAK = (() => {
  'use strict';
  const K = ODAKIT, C = (key, make) => K.GEOC[key] || (K.GEOC[key] = K.keepG(make()));
  const PER_AREA = [['unTorbasi', 'kasik'], ['kopukBalonu', 'kasik'], ['kasik', 'unTorbasi', 'kopukBalonu']];
  const mainOf = (L, a) => (a ? a.rooms.filter(i => L.rooms[i] && L.rooms[i].kind !== 'side') : []);
  const inRect = (q, x, z) => q && x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1;
  const soft = (q, x, z, e = 3) => (q ? Math.max(0, Math.min(1, Math.min(x - q.x0, q.x1 - x, z - q.z0, q.z1 - z) / e)) : 0);

  // ── kalıcı geometriler ──
  const crumbGeo = i => C('mkCrumb' + (i % 4), () => {
    const k = new Kit(), ic = G.ico(1);
    const crust = (x, y) => new THREE.Color().setHSL(0.08, 0.62, 0.32 + Math.min(0.32, y * 0.22));
    k.add(ic, crust, [0, 0.55, 0], [i, i * 2, 0.3], [1.1, 0.75, 0.95]);
    k.add(ic, 0xf2d79a, [0.25, 0.95, 0.35], [i * 3, 0, 0], [0.55, 0.32, 0.45]);   // iç (yumuşak) kısım
    for (let j = 0; j < 3; j++) { const a = j * 2.1 + i; k.add(ic, crust, [Math.cos(a) * 1.1, 0.25, Math.sin(a) * 0.9], [a, a, 0], [0.4, 0.3, 0.35]); }
    for (let j = 0; j < 5; j++) { const a = j * 1.3 + i; k.add(G.sphere(6, 4), 0xfff4dc, [Math.cos(a) * 0.6, 1.0 + (j % 2) * 0.1, Math.sin(a) * 0.5], null, [0.05, 0.03, 0.08]); }   // susam
    return k.build();
  });
  const flourGeo = () => C('mkFlour', () => {
    const k = new Kit(), h = G.hemi(12);
    k.add(h, (x, y) => new THREE.Color().setHSL(0.11, 0.25, 0.9 + Math.min(0.08, y * 0.03)), [0, 0, 0], null, [3, 1.8, 2.6]);
    for (let j = 0; j < 6; j++) { const a = j * 1.05; k.add(h, 0xfbf7ee, [Math.cos(a) * 2.3, 0, Math.sin(a) * 2], null, [1.1, 0.5 + (j % 3) * 0.2, 1]); }
    k.add(G.sphere(10, 6), 0xffffff, [0, 1.75, 0], null, [0.6, 0.18, 0.55]);
    return k.build();
  });
  const spongeGeo = () => C('mkSponge', () => {
    const k = new Kit(), b = G.rbox(2);
    k.add(b, 0xffd64f, [0, 0.6, 0], null, [3.4, 1.2, 2.3]);
    k.add(b, 0x4fb86a, [0, 1.32, 0], null, [3.3, 0.32, 2.2]);
    for (let j = 0; j < 28; j++) { const x = ((j * 37) % 30) / 30 * 3 - 1.5, y = 0.2 + ((j * 13) % 9) / 9 * 0.85, sd = j % 2 ? 1 : -1; k.add(G.sphere(6, 4), 0xd9a92e, [x, y, sd * 1.16], null, [0.08, 0.07, 0.03]); }
    return k.build();
  });
  const spoonGeo = () => C('mkSpoon', () => {
    const k = new Kit(), wood = 0xd8a868;
    k.add(G.rbox(2), wood, [-1.6, 0.14, 0], null, [5.2, 0.28, 0.9]);
    k.add(G.sphere(20, 12), wood, [1.9, 0.18, 0], null, [1.7, 0.36, 1.35]);
    k.add(G.sphere(20, 12), 0xc69252, [1.9, 0.3, 0], null, [1.45, 0.2, 1.12]);
    return k.build();
  });
  const cupGeo = () => C('mkCup', () => {   // yoğurt kabı tekne
    const k = new Kit(), cy = G.cyl(1.3 / 1.05, 1, 28, true);
    k.add(cy, 0xfdfbf6, [0, 0.62, 0], null, [1.05, 1.25, 1.05]);
    k.add(G.cyl(1, 1, 28), 0xf3efe6, [0, 0.03, 0], null, [1.04, 0.06, 1.04]);
    k.add(G.torus(TAU, 0.08, 28), 0xffffff, [0, 1.25, 0], [Math.PI / 2, 0, 0], [1.32, 1.32, 1]);
    k.add(G.cyl(1.2 / 1.12, 1, 28, true), 0xf48fb1, [0, 0.62, 0], null, [1.13, 0.36, 1.13]);   // çilek şeridi
    for (let j = 0; j < 6; j++) { const a = j * TAU / 6; k.add(G.sphere(8, 6), 0xe0405a, [Math.sin(a) * 1.2, 0.62, Math.cos(a) * 1.2], null, [0.13, 0.15, 0.13]); }
    k.add(G.cyl(1, 1, 6), 0xe8c9a0, [0, 1.9, -0.3], null, [0.04, 2.2, 0.04]);   // kürdan direk
    k.add(G.box(), 0xff6b6b, [0.36, 2.6, -0.3], null, [0.7, 0.45, 0.03]);       // bayrak
    return k.build();
  });
  const jarGeo = i => C('mkJar' + (i % 5), () => {
    const k = new Kit(), cy = G.cyl(1, 1, 14);
    const [fill, lid] = [[0xf6d36a, 0xe0533d], [0xe88a3a, 0x3f7cc4], [0x9a4a2e, 0xf2b134], [0xfbf7ee, 0x4caf7d], [0xe8cfa0, 0x8e6cc4]][i % 5];
    k.add(cy, 0xe6f3f8, [0, 1.5, 0], null, [1.25, 3, 1.25]);
    k.add(cy, (x, y, z) => new THREE.Color(fill).multiplyScalar(0.85 + 0.3 * K.hash(Math.floor(x * 6), Math.floor(y * 6), Math.floor(z * 6))), [0, 1.1, 0], null, [1.2, 2.2, 1.2]);
    k.add(cy, lid, [0, 3.1, 0], null, [1.32, 0.4, 1.32]); k.add(G.torus(TAU, 0.1, 24), new THREE.Color(lid).multiplyScalar(0.8), [0, 2.95, 0], [Math.PI / 2, 0, 0], [1.3, 1.3, 1]);
    k.add(G.box(), 0xfff8ea, [0, 1.5, 1.24], null, [1.2, 0.8, 0.04]); k.add(G.box(), lid, [0, 1.62, 1.27], null, [0.8, 0.12, 0.02]);
    k.add(G.box(), 0xffffff, [-0.75, 1.7, 1.0], [0, -0.6, 0], [0.12, 2.2, 0.03]);   // cam parıltısı
    return k.build();
  });
  const spiceGeo = i => C('mkSpice' + (i % 4), () => {
    const k = new Kit(), cy = G.cyl(1, 1, 12), [fill, lid] = [[0xd23b2a, 0xf2f2f2], [0xf2b134, 0xd23b2a], [0x3b3330, 0x2f9a5a], [0x7cbf5a, 0xf4a63a]][i % 4];
    k.add(cy, 0xeaf4f6, [0, 1.1, 0], null, [0.7, 2.2, 0.7]); k.add(cy, fill, [0, 0.8, 0], null, [0.66, 1.6, 0.66]);
    k.add(cy, lid, [0, 2.35, 0], null, [0.74, 0.3, 0.74]);
    for (let j = 0; j < 5; j++) { const a = j * TAU / 5; k.add(cy, 0x444444, [Math.sin(a) * 0.32, 2.51, Math.cos(a) * 0.32], null, [0.06, 0.02, 0.06]); }
    k.add(G.box(), 0xfff8ea, [0, 1.2, 0.68], null, [0.7, 0.6, 0.04]);
    return k.build();
  });
  const keyGeo = () => C('mkKey', () => {
    const k = new Kit(), gold = 0xf2c14a;
    k.add(G.torus(TAU, 0.22, 28), gold, [-1.1, 0, 0], null, [0.6, 0.6, 0.8]);
    k.add(G.rbox(2), gold, [0.3, 0, 0], null, [2.2, 0.22, 0.22]);
    for (const [x, h] of [[0.9, 0.45], [1.25, 0.32]]) k.add(G.box(), gold, [x, -h / 2 - 0.05, 0], null, [0.18, h, 0.18]);
    k.add(G.sphere(10, 8), 0xff6b9a, [-1.1, 0, 0.1], null, [0.2, 0.2, 0.1]);   // kalpli anahtarlık
    return k.build();
  });
  const grateGeo = () => C('mkGrate', () => {
    const k = new Kit(), iron = 0x3a3c42;
    k.add(G.cyl(1, 1, 28), 0x2c2e33, [0, 0.05, 0], null, [3.2, 0.1, 3.2]);
    k.add(G.cyl(1, 1, 24), 0xb9925a, [0, 0.25, 0], null, [1.1, 0.3, 1.1]);   // pirinç kapak
    k.add(G.cyl(1, 1, 24), 0x2a2a2e, [0, 0.42, 0], null, [0.8, 0.06, 0.8]);
    for (const r of [2.0, 3.0]) k.add(G.torus(TAU, 0.08, 32), iron, [0, 0.6, 0], [Math.PI / 2, 0, 0], [r, r, 1.6]);
    for (let j = 0; j < 6; j++) { const a = j * TAU / 6; k.add(G.box(), iron, [Math.sin(a) * 2.6, 0.62, Math.cos(a) * 2.6], [0, a, 0], [0.22, 0.22, 1.6]); k.add(G.box(), iron, [Math.sin(a) * 3.3, 0.32, Math.cos(a) * 3.3], [0, a, 0], [0.2, 0.62, 0.22]); }
    return k.build();
  });
  const faucetGeo = () => C('mkFaucet', () => {
    const k = new Kit(), cr = 0xe4ebf2;
    k.add(G.cyl(1, 1, 24), cr, [0, 0.25, 0], null, [0.9, 0.5, 0.9]);
    k.add(G.cyl(1, 1, 20), cr, [0, 3.2, 0], null, [0.38, 5.6, 0.38]);
    k.add(G.torus(Math.PI, 0.38 / 1.8, 24), cr, [0, 6.0, 1.8], [0, Math.PI / 2, 0], [1.8, 1.8, 1.8]);   // kemer: kuzeyden güneye
    k.add(G.cyl(1, 1, 20), cr, [0, 5.6, 3.6], null, [0.42, 0.8, 0.42]);
    k.add(G.cyl(1, 1, 20), 0x9fb0c0, [0, 5.18, 3.6], null, [0.3, 0.06, 0.3]);
    k.add(G.rbox(2), 0x5aa0e8, [1.2, 1.2, 0], null, [1.2, 0.5, 0.5]);   // mavi kol
    return k.build();
  });
  const tomatoGeo = () => C('mkTomato', () => {
    const k = new Kit(); k.add(G.sphere(12, 9), 0xe2412c, [0, 1, 0], null, [1.05, 0.95, 1.05]); k.add(G.sphere(10, 8), 0xff9a86, [-0.4, 1.5, 0.5], null, [0.2, 0.12, 0.12]);
    for (let j = 0; j < 5; j++) { const a = j * TAU / 5; k.add(G.sphere(8, 4), 0x4f9a3a, [Math.sin(a) * 0.32, 1.93, Math.cos(a) * 0.32], [0, a, 0.3], [0.32, 0.05, 0.12]); }
    k.add(G.cyl(1, 1, 6), 0x4f8a3a, [0, 2.1, 0], null, [0.07, 0.35, 0.07]); return k.build();
  });
  const cheeseGeo = () => C('mkCheese', () => {
    const k = new Kit(); k.add(G.cyl(1, 1, 3), 0xf6cc52, [0, 0.8, 0], [0, 0.5, 0], [1.9, 1.6, 1.9]);
    for (let j = 0; j < 7; j++) { const a = j * 2.2; k.add(G.sphere(10, 6), 0xd9a830, [Math.cos(a) * 0.7, 0.4 + (j % 3) * 0.45, Math.sin(a) * 0.7], null, [0.22, 0.2, 0.22]); }
    return k.build();
  });
  const breadGeo = () => C('mkBread', () => {
    const k = new Kit(); k.add(G.sphere(14, 8), (x, y) => new THREE.Color().setHSL(0.08, 0.6, 0.36 + Math.min(0.18, y * 0.08)), [0, 0.9, 0], null, [2.6, 1.2, 1.4]);
    for (let j = 0; j < 3; j++) k.add(G.sphere(12, 6), 0xf0d29a, [(j - 1) * 1.2, 2.02, 0], [0, 0.6, 0], [0.45, 0.06, 0.9]);
    return k.build();
  });
  const plateGeo = () => C('mkPlate', () => {
    const k = new Kit(), cy = G.cyl(1, 0.85, 18);
    for (let j = 0; j < 4; j++) { k.add(cy, 0xfbfbf8, [0, 0.16 + j * 0.3, 0], null, [2.3, 0.26, 2.3]); k.add(G.torus(TAU, 0.05, 18), 0x4f8fdc, [0, 0.3 + j * 0.3, 0], [Math.PI / 2, 0, 0], [2.0, 2.0, 1]); }
    return k.build();
  });
  const mugGeo = i => C('mkMug' + (i % 3), () => {
    const k = new Kit(), c = [0xf28a9a, 0x7fc8f0, 0xf6d04d][i % 3];
    k.add(G.cyl(1, 1, 14), c, [0, 1.1, 0], null, [1.1, 2.2, 1.1]); k.add(G.cyl(1, 1, 24), 0x6a4630, [0, 2.15, 0], null, [0.95, 0.06, 0.95]);
    k.add(G.torus(TAU, 0.16, 16), c, [1.2, 1.1, 0], null, [0.55, 0.62, 0.8]);
    k.add(G.sphere(10, 8), 0xffffff, [0, 1.2, 1.08], null, [0.35, 0.3, 0.05]); return k.build();
  });
  const forkGeo = () => C('mkFork', () => {
    const k = new Kit(), m = 0xd6dde5; k.add(G.rbox(2), m, [-1.5, 0, 0], null, [3.6, 0.18, 0.55]); k.add(G.rbox(2), m, [0.7, 0, 0], null, [1.0, 0.16, 0.9]);
    for (let j = 0; j < 4; j++) k.add(G.box(), m, [1.75, 0, -0.33 + j * 0.22], null, [1.3, 0.12, 0.1]); return k.build();
  });
  const pastaGeo = () => C('mkPasta', () => {
    const k = new Kit(), cy = G.cyl(1, 1, 6);
    for (let j = 0; j < 22; j++) { const off = (j % 11) / 10 - 0.5, lay = Math.floor(j / 11); k.add(cy, j % 3 ? 0xf6d36a : 0xf0c856, [off * 3.2, 0.12 + lay * 0.2, (j * 0.13) % 0.3 - 0.15], [Math.PI / 2, 0.03 * (j % 5 - 2), Math.PI / 2], [0.09, 6.4, 0.09]); }
    return k.build();
  });
  const penneGeo = () => C('mkPenne', () => { const k = new Kit(); k.add(G.cyl(1, 1, 10, true), 0xf2c35a, [0, 0.3, 0], [Math.PI / 2, 0, 0.5], [0.3, 1.3, 0.3]); k.add(G.cyl(1, 1, 10, true), 0xd9a13e, [0, 0.3, 0], [Math.PI / 2, 0, 0.5], [0.2, 1.31, 0.2]); return k.build(); });
  const candyJarGeo = () => C('mkCandyJar', () => {
    const k = new Kit();
    k.add(G.sphere(20, 14), 0xe9f6fb, [0, 1.6, 0], null, [1.5, 1.6, 1.5]);
    for (let j = 0; j < 16; j++) { const a = j * 2.4, r = 0.35 + (j % 3) * 0.3; k.add(G.sphere(10, 8), [0xff6b9a, 0x6bc4ff, 0xffd34a, 0x7ee08a][j % 4], [Math.cos(a) * r, 0.7 + (j % 4) * 0.35, Math.sin(a) * r], null, 0.32); }
    k.add(G.cyl(1, 1, 20), 0xf06a9a, [0, 3.2, 0], null, [0.9, 0.35, 0.9]); k.add(G.sphere(12, 8), 0xffffff, [0, 3.5, 0], null, 0.3);
    return k.build();
  });

  // ── yerleşim (saf veri) ──
  function yerlesim(L, api) {
    K.gentle(L, PER_AREA, 3);
    for (const sp of L.spawns) if (!api.circleFree(sp.x, sp.z, 1.0)) { const q = api.randomFloorNear(sp.x, sp.z, 0.5, 4); if (q && api.circleFree(q.x, q.z, 1.0)) { sp.x = q.x; sp.z = q.z; } }   // (Feza'nın ulaşamayacağı sıkışık yerde doğmasın)
    const A = L.areas || [], a3 = A[2];
    if (a3) {   // Aytuğ Hala'nın anahtarı: dolabın içinde (3. alanın yan odası ya da son odası)
      const side = a3.rooms.find(i => L.rooms[i].kind === 'side'), rm = L.rooms[side ?? a3.rooms[a3.rooms.length - 1]];
      const p = api.randomFloorNear(rm.x, rm.z - rm.r * 0.25, 0, rm.r * 0.45);
      L.kayipEsya = { id: 'anahtar', x: p ? p.x : rm.x, z: p ? p.z : rm.z };
      L.lostSpot = { x: L.kayipEsya.x, z: L.kayipEsya.z, id: 'anahtar' };   // (Bilbo kazar: 04_bilbo_fun)
    }
    K.extraChests(L, api);
    // Bilbo'ya biniş halkası: tezgâhın ikinci odasında (Bilbo ajanının istasyonu kind 'binis')
    // (Biniş halkası kaldırıldı: Feza artık HUD'daki 'Bin!' düğmesiyle istediği an biner.)
    if (false && A[0] && typeof BILBO_FUN !== 'undefined' && BILBO_FUN && typeof BILBO_FUN.ride === 'function') {
      const ms = mainOf(L, A[0]), rm = L.rooms[ms[ms.length - 1]];
      for (let t = 0; t < 30; t++) {
        const a = api.rnd() * TAU, d = rm.r * (0.3 + api.rnd() * 0.3), x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
        if (!api.circleFree(x, z, 1.8) || L.chests.some(c => Math.hypot(c.x - x, c.z - z) < 4) || (L.checkpoints || []).some(c => Math.hypot(c.x - x, c.z - z) < 4)) continue;
        (L.stations = L.stations || []).push({ id: 'binisMutfak', kind: 'binis', x, z, r: 1.6, sure: 14 }); L._mkBinis = { x, z }; break;
      }
    }
    if (A[1]) { const ms = mainOf(L, A[1]), rm = L.rooms[ms[ms.length - 1]]; L._mkMini = K.miniStation(L, api, rm, ['tencereMuzik', 'tencereKapak', 'sekerYakala']); }
  }

  // ── görsel kurulum ──
  function* kur(L, api) {   // üreteç: yield'ler oda geçişinde ayrı karelere düşer (06_level buildSteps)
    K.lowShadow(api);
    const rnd = api.rnd, A = L.areas || [], a1 = A[0], a2 = A[1], a3 = A[2], ar = A[3], R = i => L.rooms[i];
    const sinkQ = a2 ? K.bbox(L, a2.rooms, 5) : null, cupQ = a3 ? K.bbox(L, a3.rooms, 4) : null, stoveQ = ar ? K.bbox(L, ar.rooms, 4.5) : null;
    K.floor(L, api, { mats: [{ tex: 'counter', size: 6, rough: 0.32 }, { tex: 'steel', size: 4, rough: 0.28 }, { tex: 'shelf', size: 6, rough: 0.5 }],
      region: (x, z) => { const c = soft(cupQ, x, z); return [soft(sinkQ, x, z) * (1 - c), c, c * 0.55]; }, out: [0.5, 0.48, 0.48], shade: 0.4 });
    if (stoveQ) K.slab(api, L, { x: (stoveQ.x0 + stoveQ.x1) / 2, z: (stoveQ.z0 + stoveQ.z1) / 2, w: stoveQ.x1 - stoveQ.x0, d: stoveQ.z1 - stoveQ.z0, h: 0.1, tex: 'stove', size: 6, rough: 0.25 });
    if (stoveQ) { const q = stoveQ, cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2, w = q.x1 - q.x0, d = q.z1 - q.z0;   // çelik çerçeve
      api.box(cx, 0.14, q.z0, w + 0.5, 0.28, 0.5, 0xd8dde4); api.box(cx, 0.14, q.z1, w + 0.5, 0.28, 0.5, 0xd8dde4);
      api.box(q.x0, 0.14, cz, 0.5, 0.28, d, 0xd8dde4); api.box(q.x1, 0.14, cz, 0.5, 0.28, d, 0xd8dde4); }
    yield;
    const T = K.toys(api);
    L._mkSink = null;
    yield;
    if (a2) lavabo(L, api, T, a2, rnd);
    yield;
    if (a1) tezgah(L, api, T, a1, rnd);
    yield;
    if (a3) dolap(L, api, T, a3, cupQ, rnd);
    yield;
    if (ar) ocak(L, api, T, ar, stoveQ, rnd);
    // (alan girişi cümleleri hikâyede: STORY.area → alan_mutfak_N)
    if (L._mkMini) K.miniBox(api, T, L._mkMini, 'mut_mini_ipucu');
    if (L._mkBinis) { const b = L._mkBinis; K.pawPad(api, b.x, b.z); T.add({ x: b.x, z: b.z, r: 1.8, hint: { y: 2.4 }, line: 'mut_bilbo_ipucu', near: 9, cd: 16, repeat: true, use: () => { K.burst('star', b.x, 1, b.z); K.sticker('mutfak_bilbo'); } }); }
    K.edge(L, api, (x, z) => (inRect(stoveQ, x, z) ? 0xcfc6b2 : inRect(cupQ, x, z) ? 0xb9cdb0 : inRect(sinkQ, x, z) ? 0x8f9aa8 : 0xe6c89a), 0.1);
  }

  const sinkQ0 = L => (L.areas && L.areas[1] ? K.bbox(L, L.areas[1].rooms, 5) : null), cupQ0 = L => (L.areas && L.areas[2] ? K.bbox(L, L.areas[2].rooms, 4) : null);
  // Alan 1 · Tezgâh Tepeleri
  function tezgah(L, api, T, a1, rnd) {
    const rooms = mainOf(L, a1);
    // kesme tahtası (ikinci odanın altında, üstünde yürünür) + kırıntılar, un dağları
    const br = L.rooms[rooms[rooms.length - 1]];
    K.slab(api, L, { x: br.x + 1, z: br.z - 0.5, w: br.r * 1.7, d: br.r * 1.3, h: 0.16, tex: 'board', size: 6, rough: 0.6 });
    const skip1 = (x, z) => soft(sinkQ0(L), x, z, 1) > 0 || soft(cupQ0(L), x, z, 1) > 0 || inRect(L._mkSink, x, z);
    K.fill(L, rnd, L.areas[0].rooms, (x, z, maxH, fd, k) => {
      const kind = k % 7, s = 0.8 + rnd() * 0.5;
      if (kind === 1 && maxH > 1.6) api.put(flourGeo(), x, 0, z, s, Math.min(s, maxH / 2), s, null, rnd() * TAU);
      else if (kind === 3 && maxH > 1.8) api.put(tomatoGeo(), x, 0, z, 1.2, 1.2, 1.2, null, rnd() * TAU);
      else if (kind === 5 && maxH > 2.2) api.put(k % 2 ? cheeseGeo() : breadGeo(), x, 0, z, 1, 1, 1, null, rnd() * TAU);
      else if (kind === 6 && maxH > 1.5) api.put(sugarCubeGeo(), x, -0.1, z, 0.9, 0.9, 0.9, null, rnd() * TAU);
      else { const c = Math.min(1.1 + rnd() * 1.2, maxH / 1.3); if (c > 0.3) api.put(crumbGeo(k), x, 0, z, c, c, c, null, rnd() * TAU); }
    }, { skip: skip1, step: 2.5 });
    for (const ri of rooms) {   // yürünür alanda minik kırıntılar (süs)
      const r0 = L.rooms[ri];
      for (let k = 0; k < 10; k++) { const a = rnd() * TAU, d = rnd() * r0.r * 0.85, x = r0.x + Math.sin(a) * d, z = r0.z + Math.cos(a) * d; if (K.isF(L, x, z)) api.put(crumbGeo(k), x, 0, z, 0.22, 0.18, 0.22, null, rnd() * TAU); }
    }
    // gizli hazineler: şeker küpü, kurabiye
    const tr = [];
    rooms.forEach((ri, k) => { const sp = K.rimSpots(L, L.rooms[ri], 0.9).filter(s => s.z < L.rooms[ri].z + 1); for (let i = 0; i < 1 + k && sp.length; i++) tr.push(sp.splice(Math.floor(rnd() * sp.length), 1)[0]); });
    tr.forEach((s, i) => K.treasure(api, T, s.x, s.z, i % 2 ? cookieGeo() : sugarCubeGeo(), { sc: 0.9, line: i ? null : 'oda_hazine_ipucu', say: i ? null : 'mut_kavanoz', sticker: 'mutfak_hazine' }));
    // sünger trambolin: ilk odanın kenarında
    const r0 = L.rooms[rooms[0]], ss = K.rimSpots(L, r0, 1.4).filter(s => K.floorNorth(L, s.x, s.z, 3) > 2).sort((p, q) => p.z - q.z)[0];
    if (ss) {
      const sp = K.mesh(api, spongeGeo(), ss.x, 0, ss.z, 0.9); sp.rotation.y = ss.a + Math.PI / 2;
      let sq = 0;
      T.add({ x: ss.ex, z: ss.ez, r: 1.9, hint: { y: 2.4 }, line: 'mut_sunger_ipucu', near: 8, cd: 2, repeat: true,
        use: (TT) => {
          const tx = ss.inX - Math.sin(ss.a) * 2.5, tz = ss.inZ - Math.cos(ss.a) * 2.5;
          let bounces = 0;
          TT.ride({ pts: [[ss.x, ss.z], [(ss.x + tx) / 2, (ss.z + tz) / 2], [tx, tz]], speed: 3.4,
            y: u => Math.abs(Math.sin(u * Math.PI * 3)) * (3.4 - u * 1.4) + 1.2 * (1 - u),
            tick: (u) => { const b = Math.floor(u * 3); if (b !== bounces) { bounces = b; sq = 0.35; K.sfx('bounce', { x: ss.x, z: ss.z, pitch: 1 + b * 0.15 }); K.burst('star', GAME.P.pos.x, 2, GAME.P.pos.z); } },
            end: () => { K.burst('dust', tx, 0.3, tz); K.sugar(tx, tz, 6, 4); } });
          sq = 0.35; K.sfx('bounce', { x: ss.x, z: ss.z }); K.say('mut_sunger'); K.sticker('mutfak_sunger');
        },
        tick: dt => { if (sq > 0) { sq = Math.max(0, sq - dt); const k = Math.sin(sq / 0.35 * Math.PI); sp.scale.set(1 + k * 0.12, 1 - k * 0.35, 1 + k * 0.12); } } });
    }
    // tereyağı kaydırağı: ikinci odada, uçtan uca parlak sarı şerit
    const lane = (() => {
      for (let t = 0; t < 12; t++) {
        const ang = t * 0.5, dx = Math.cos(ang), dz = Math.sin(ang) * 0.6, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, len = br.r * 1.5;
        const x0 = br.x - ux * len / 2, z0 = br.z + 1.5 - uz * len / 2, x1 = br.x + ux * len / 2, z1 = br.z + 1.5 + uz * len / 2;
        let ok = true; for (let s = 0; s <= 10 && ok; s++) { const x = x0 + (x1 - x0) * s / 10, z = z0 + (z1 - z0) * s / 10; if (!api.circleFree(x, z, 0.9)) ok = false; }
        if (ok) return { x0, z0, x1, z1, ux, uz, len };
      }
      return null;
    })();
    if (lane) {
      const yaw = Math.atan2(-lane.uz, lane.ux), cx = (lane.x0 + lane.x1) / 2, cz = (lane.z0 + lane.z1) / 2;
      api.put(G.rbox(2), cx, 0.08, cz, lane.len, 0.2, 2.4, 0xffc92e, yaw);
      api.put(G.rbox(2), cx, 0.19, cz, lane.len - 0.6, 0.02, 0.5, 0xffe88a, yaw);
      api.put(G.rbox(2), lane.x0 - lane.ux * 1.2, 0.5, lane.z0 - lane.uz * 1.2, 2.2, 1.0, 2.8, 0xffe27a, yaw);   // tereyağı kalıbı
      api.put(G.box(), lane.x0 - lane.ux * 1.9, 0.55, lane.z0 - lane.uz * 1.9, 1.0, 1.12, 2.95, 0xe8eef2, yaw);   // ambalaj kâğıdı
      T.add({ x: lane.x0, z: lane.z0, r: 1.5, hint: { y: 1.8 }, line: 'mut_tereyag_ipucu', near: 8, cd: 2, repeat: true,
        use: (TT) => {
          TT.ride({ pts: [[lane.x0, lane.z0], [lane.x1, lane.z1]], speed: 9, y: u => 0.16 + Math.sin(u * Math.PI) * 0.25,
            tick: (u, x, z, dt) => { if (Math.random() < dt * 12) K.burst('sparkle', x, 0.3, z, { color: '#ffe27a' }); },
            end: () => { K.burst('confetti', lane.x1, 1, lane.z1); K.sugar(lane.x1, lane.z1, 6, 4); } });
          K.sfx('whoosh', { x: lane.x0, z: lane.z0 }); K.say('mut_tereyag'); K.sticker('mutfak_tereyag');
        } });
    }
    // un dağı kayması: ilk odanın kuzeyindeki un tepesinden odaya
    const fs = K.rimSpots(L, r0, 2.6).filter(s => s !== ss && s.z < r0.z && (!ss || Math.hypot(s.x - ss.x, s.z - ss.z) > 6)).sort((p, q) => p.z - q.z)[0];
    if (fs) {
      api.put(flourGeo(), fs.x, 0, fs.z, 1.3, 1.25, 1.3, null, 0.4);
      T.add({ x: fs.ex, z: fs.ez, r: 1.8, hint: { y: 3.2 }, line: 'mut_un_ipucu', near: 8, cd: 2, repeat: true,
        use: (TT) => {
          const tx = fs.inX - Math.sin(fs.a) * 4, tz = fs.inZ - Math.cos(fs.a) * 4;
          TT.ride({ pts: [[fs.x, fs.z], [tx, tz]], speed: 6.5, y: u => 2.3 * (1 - u) * (1 - u) + Math.sin(u * Math.PI) * 0.4,
            tick: (u, x, z, dt) => { if (Math.random() < dt * 5) K.burst('smoke', x, 0.4, z, { color: '#ffffff' }); },
            end: () => { K.burst('smoke', tx, 0.5, tz, { color: '#ffffff' }); K.sfx('whoosh', { x: tx, z: tz, pitch: 0.8 }); K.sugar(tx, tz, 6, 4); } });
          K.sfx('whoosh', { x: fs.x, z: fs.z, pitch: 1.2 }); K.say('mut_un'); K.sticker('mutfak_un');
        } });
    }
    // kaşık rampa (1 → 2 geçidi)
    const g = A2gate(L);
    if (g) { const [dx, dz] = K.gateDir(L, g); api.put(spoonGeo(), g.x, 0, g.z, 1, 1, 1, null, Math.atan2(-dz, dx)); T.add({ x: g.x, z: g.z, r: 0, near: 6, hint: false, line: 'mut_kasik_rampa', prio: 1, use() {} }); }
  }
  const A2gate = L => (L.areas && L.areas[1] ? L.areas[1].gate : null);
  const sugarCubeGeo = () => C('mkSugarCube', () => { const k = new Kit(); k.add(G.rbox(2), (x, y, z) => new THREE.Color(0xffffff).multiplyScalar(0.9 + 0.1 * K.hash(Math.floor(x * 9), Math.floor(y * 9), Math.floor(z * 9))), [0, 0.7, 0], null, [1.4, 1.4, 1.4]); return k.build(); });
  const cookieGeo = () => C('mkCookie', () => {
    const k = new Kit(); k.add(G.cyl(1, 1, 24), 0xd9a25a, [0, 0.15, 0], null, [1.2, 0.3, 1.2]);
    for (let j = 0; j < 7; j++) { const a = j * 2.3, r = 0.3 + (j % 3) * 0.28; k.add(G.sphere(8, 6), 0x5a3420, [Math.cos(a) * r, 0.3, Math.sin(a) * r], null, [0.16, 0.08, 0.16]); }
    return k.build();
  });

  // Alan 2 · Lavabo Gölü
  function lavabo(L, api, T, a2, rnd) {
    const rooms = mainOf(L, a2); let rm = L.rooms[rooms.slice().sort((p, q) => L.rooms[p].z - L.rooms[q].z)[0]];
    let HW = 7.5, HD = 4.6, p = null;
    // yer: oda kenarına bitişik (iskele ve düğme yürünür alanda olsun); önce kuzey, sonra yanlar, en son güney; büyükten küçüğe
    const edgeInfo = (r0, sx, sz, hw, hd) => {
      const fdx = r0.x - sx, fdz = r0.z - sz, sideZ = Math.abs(fdx) / hw <= Math.abs(fdz) / hd, sgn = sideZ ? Math.sign(fdz) || 1 : Math.sign(fdx) || 1;
      const edgeP = (o, d) => (sideZ ? { x: sx + o * hw, z: sz + sgn * (hd + 1.2 + d) } : { x: sx + sgn * (hw + 1.2 + d), z: sz + o * hd });
      const cs = [];
      for (let d = 0; d < 6; d += 0.5) for (let o = -0.9; o <= 0.91; o += 0.15) { const q = edgeP(o, d); if (api.circleFree(q.x, q.z, 1.1)) { q.d = d + Math.abs(o) * 2; cs.push(q); } }
      cs.sort((a, b) => a.d - b.d);
      return { cands: cs, sideZ, sgn, edgeP };
    };
    const cand = rooms.slice().sort((a, b) => L.rooms[a].z - L.rooms[b].z).concat(L.areas[1].rooms.filter(i => L.rooms[i].kind === 'side'));
    let EI = null;
    search: for (const dirs of [[Math.PI, Math.PI * 0.8, Math.PI * 1.2], [Math.PI * 0.62, Math.PI * 1.38, Math.PI / 2, Math.PI * 1.5], [Math.PI * 0.25, Math.PI * 1.75, 0]])
      for (const sc of [1, 0.85, 0.7, 0.58]) for (const ri of cand) for (const a of dirs) {
        const r0 = L.rooms[ri], hw = HW * sc, hd = HD * sc, sxa = Math.sin(a), sza = Math.cos(a);
        for (let d = r0.r * 0.5; d < r0.r + 6; d += 0.5) {
          const x = r0.x + sxa * (d + Math.abs(sxa) * (hw + 0.8)), z = r0.z + sza * (d + Math.abs(sza) * (hd + 0.8));
          if (!K.rectFree(L, x, z, hw + 0.8, hd + 0.8, 0.2)) continue;
          const ei = edgeInfo(r0, x, z, hw, hd);
          if (ei.cands.length && ei.cands.some(q => Math.hypot(q.x - ei.cands[0].x, q.z - ei.cands[0].z) > 3.2)) { p = { x, z }; rm = r0; HW = hw; HD = hd; EI = ei; break search; }
          break;
        }
      }
    // çevrede: deterjan şişeleri, tabak yığınları, kupalar, çatallar, köpük
    K.fill(L, rnd, L.areas[1].rooms, (x, z, maxH, fd, k) => {
      if (p && Math.abs(x - p.x) < HW + 2 && Math.abs(z - p.z) < HD + 2) return;
      const kind = k % 6;
      if (kind === 0 && maxH > 6) { api.put(G.cyl(1, 1, 20), x, 2.8, z, 1.3, 5.6, 1.0, 0x5ac88a); api.put(G.cyl(1, 1, 16), x, 6.0, z, 0.5, 0.8, 0.5, 0xffffff); api.put(G.box(), x, 3, z + 0.98, 1.6, 2, 0.05, 0xfff8ea); api.put(G.box(), x, 3.3, z + 1.0, 1.1, 0.3, 0.05, 0x3f8fd8); }
      else if (kind === 1 && maxH > 1.2) api.put(plateGeo(), x, 0, z, 1, Math.min(1, maxH / 1.4), 1, null, rnd());
      else if (kind === 2 && maxH > 2.4) api.put(mugGeo(k), x, 0, z, 1, 1, 1, null, rnd() * TAU);
      else if (kind === 3) api.put(forkGeo(), x, 0.1, z, 1, 1, 1, null, rnd() * TAU);
      else if (kind === 4 && maxH > 1.6) api.put(spongeGeo(), x, 0, z, 0.6, 0.6, 0.6, null, rnd() * TAU);
      else for (let j = 0; j < 5; j++) { const s2 = Math.min(0.5 + rnd() * 0.7, maxH * 0.6); api.ball(x + (rnd() - 0.5) * 1.6, s2 * 0.6, z + (rnd() - 0.5) * 1.2, s2, s2 * 0.8, s2, j % 2 ? 0xffffff : 0xf4eefc); }
    }, { skip: (x, z) => soft(cupQ0(L), x, z, 1) > 0, step: 2.6 });
    for (const ri of L.areas[1].rooms) {   // çelikte su damlaları (süs, üstünden geçilir)
      const r0 = L.rooms[ri];
      for (let k = 0; k < 16; k++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r0.r, x = r0.x + Math.sin(a) * d, z = r0.z + Math.cos(a) * d, s2 = 0.18 + rnd() * 0.3;
        if (!K.isF(L, x, z)) continue; api.put(G.hemi(8), x, 0, z, s2, s2 * 0.55, s2 * 0.85, 0x9fd4f2); api.put(G.sphere(6, 4), x - s2 * 0.3, s2 * 0.45, z - s2 * 0.2, s2 * 0.18, s2 * 0.1, s2 * 0.14, 0xffffff); }
    }
    if (!p) return;
    const sx = p.x, sz = p.z, steel = 0xc4ccd5;
    L._mkSink = { x0: sx - HW - 3, x1: sx + HW + 3, z0: sz - HD - 4, z1: sz + HD + 3.5 };
    // lavabo: çelik kenar, su yüzeyi (dalgalı), köpük adaları
    api.box(sx, 0.35, sz - HD - 0.4, HW * 2 + 1.6, 0.7, 0.8, steel); api.box(sx, 0.22, sz + HD + 0.4, HW * 2 + 1.6, 0.44, 0.8, steel);
    for (const s of [-1, 1]) api.box(sx + s * (HW + 0.4), 0.35, sz, 0.8, 0.7, HD * 2, steel);
    const wg = new THREE.PlaneGeometry(HW * 2, HD * 2, 36, 22); wg.rotateX(-Math.PI / 2); api.dispose(wg);
    const wm = new THREE.MeshStandardMaterial({ color: 0x5fb6e4, roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.82 }); api.dispose(wm);
    wm.onBeforeCompile = sh => { sh.uniforms.uT = TIME.u; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(position.x * 0.9 + uT * 1.6) * 0.05 + sin(position.z * 1.3 - uT * 1.2) * 0.04;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = normalize(vec3(-cos(position.x * 0.9 + uT * 1.6) * 0.045, 1.0, -cos(position.z * 1.3 - uT * 1.2) * 0.052));'); };
    wm.customProgramCacheKey = () => 'mk-water';
    const water = new THREE.Mesh(wg, wm); water.position.set(sx, 0.12, sz); water.receiveShadow = true; api.add(water);
    api.put(G.cyl(1, 1, 20), sx + HW * 0.55, 0.13, sz - HD * 0.3, 0.7, 0.04, 0.7, 0x5c6670);   // gider
    const foam = [];
    for (let j = 0; j < 5; j++) {
      const fx = sx + (j - 2) * HW * 0.36 + (rnd() - 0.5), fz = sz + (j % 2 ? -1 : 1) * HD * 0.35;
      const k = new Kit(); for (let q = 0; q < 6; q++) k.add(G.sphere(10, 8), q % 2 ? 0xffffff : 0xf4f0ff, [Math.cos(q * 1.1) * 0.6, 0.2, Math.sin(q * 1.1) * 0.5], null, [0.55, 0.38, 0.5]);
      const fm = new THREE.Mesh(k.build(), K.vmat(0.6)); api.dispose(fm.geometry); fm.position.set(fx, 0.1, fz); api.add(fm); foam.push(fm);
    }
    // krom musluk (lavabonun kuzeyinde) ve su akışı
    // musluk: lavabo odanın kuzeyindeyse arka (kuzey) kenarda; değilse odadan uzak yan kenarda (kameranın önünü kapatmasın)
    const north = rm.z - sz > Math.abs(rm.x - sx) * HD / HW, fsd = rm.x > sx ? -1 : 1;
    const fq = north ? { x: sx, z: sz - HD - 0.6, yaw: 0 } : { x: sx + fsd * (HW + 0.6), z: sz, yaw: fsd > 0 ? -Math.PI / 2 : Math.PI / 2 };
    const nzX = fq.x + Math.sin(fq.yaw) * 3.6, nzZ = fq.z + Math.cos(fq.yaw) * 3.6;   // ağız
    api.put(faucetGeo(), fq.x, 0, fq.z, 1, 1, 1, null, fq.yaw);
    const fz0 = nzZ - 3.6;
    const stG = new THREE.CylinderGeometry(0.22, 0.3, 5.1, 12, 1, true); api.dispose(stG);
    const stM = new THREE.MeshStandardMaterial({ color: 0xcfeeff, roughness: 0.05, transparent: true, opacity: 0.65 }); api.dispose(stM);
    const stream = new THREE.Mesh(stG, stM); stream.position.set(nzX, 2.65, nzZ); stream.visible = false; api.add(stream);
    // musluk düğmesi: lavabonun güney kenarında, yürünür alanda
    const { cands, sideZ, sgn } = EI;
    const bt = cands[0] || null;
    let flow = false, flowT = 0;
    if (bt) {
      const k = new Kit(); k.add(G.cyl(1, 1, 24), 0x3f8fd8, [0, 0.12, 0], null, [0.9, 0.24, 0.9]); k.add(G.sphere(12, 8), 0xffffff, [0, 0.26, 0.05], null, [0.25, 0.04, 0.32]); k.add(G.cone(12), 0xffffff, [0, 0.26, -0.25], [Math.PI / 2, 0, 0], [0.18, 0.3, 0.04]);
      k.add(G.torus(TAU, 0.1, 24), 0xe4ebf2, [0, 0.12, 0], [Math.PI / 2, 0, 0], [0.92, 0.92, 1.2]);
      const btn = new THREE.Mesh(k.build(), K.vmat(0.3)); api.dispose(btn.geometry); btn.position.set(bt.x, 0, bt.z); api.add(btn);
      let press = 0;
      T.add({ x: bt.x, z: bt.z, r: 1.4, hint: { y: 1.5 }, line: 'mut_musluk_ipucu', near: 8, cd: 1.5, repeat: true,
        use: () => { flow = !flow; press = 0.3; K.sfx('click', { x: bt.x, z: bt.z }); stream.visible = flow;
          if (flow) { K.say('mut_musluk_ac'); K.sfx('splash', { x: sx, z: sz }); K.sticker('mutfak_musluk'); K.sugar(GAME.P.pos.x, GAME.P.pos.z, 6, 4); } else K.say('mut_musluk_kapa', 1); },
        tick: (dt, t) => {
          if (press > 0) { press -= dt; btn.position.y = -Math.sin(Math.max(0, press) / 0.3 * Math.PI) * 0.12; }
          if (flow) {
            flowT += dt; stream.scale.x = stream.scale.z = 1 + Math.sin(t * 30) * 0.06;
            if (Math.random() < dt * 6) K.burst('bubbles', nzX + (Math.random() - 0.5) * 2, 0.3, nzZ + (Math.random() - 0.5) * 2);
            if (Math.random() < dt * 1.2) K.sfx('bubble', { x: sx, z: sz, vol: 0.4 });
          }
          const g = flow ? Math.min(2.2, 1 + flowT * 0.15) : 1;
          foam.forEach((f, i) => { f.scale.setScalar(f.scale.x + (g - f.scale.x) * Math.min(1, dt * 1.5)); f.position.y = 0.1 + Math.sin(t * 1.5 + i) * 0.05; f.rotation.y += dt * 0.1; });
        } });
    }
    // yoğurt kabı tekne: lavabonun güney kenarında iskele; binince göl turu
    const dock = cands.find(q => !bt || Math.hypot(q.x - bt.x, q.z - bt.z) > 3.2) || null;
    if (dock) {
      const boat = new THREE.Mesh(cupGeo(), K.vmat(0.35)); boat.castShadow = true; api.add(boat);
      const home = sideZ ? { x: dock.x, z: sz + sgn * (HD - 1.0) } : { x: sx + sgn * (HW - 1.0), z: dock.z };
      boat.position.set(home.x, 0.05, home.z);
      api.put(G.box(), (dock.x + home.x) / 2, 0.5, (dock.z + home.z) / 2, sideZ ? 2.4 : Math.abs(dock.x - home.x), 0.2, sideZ ? Math.abs(dock.z - home.z) : 2.4, 0xd8a868);   // tahta iskele
      let riding = false;
      T.add({ x: dock.x, z: dock.z, r: 1.6, hint: { y: 2.2 }, line: 'mut_tekne_ipucu', near: 9, cd: 2, repeat: true,
        use: (TT) => {
          const e = (u, rx, rz) => [sx + Math.cos(u) * rx, sz + Math.sin(u) * rz], a0 = Math.atan2(home.z - sz, home.x - sx) / 1;
          const pts = [[dock.x, dock.z], [home.x, home.z]];
          for (let i = 1; i <= 24; i++) { const u = a0 - i / 24 * TAU; pts.push(e(u, HW * 0.62, HD * 0.55)); }
          pts.push([home.x, home.z], [dock.x, dock.z]);
          riding = true; K.say('mut_tekne'); K.sfx('splash', { x: home.x, z: home.z }); K.sticker('mutfak_tekne');
          let drop = 0;
          TT.ride({ pts, speed: 3.6, y: u => (u > 0.04 && u < 0.96 ? 0.35 + Math.sin(TIME.t * 3) * 0.05 : 0.2),
            tick: (u, x, z, dt) => { boat.position.set(x, 0.05 + Math.sin(TIME.t * 3) * 0.05, z); boat.rotation.y = GAME.P.face; boat.rotation.z = Math.sin(TIME.t * 2) * 0.06;
              if (Math.random() < dt * 4) K.burst('bubbles', x, 0.2, z); if (u > drop + 0.2 && u < 0.9) { drop = u; K.sugar(x, z, 4, 3); } },
            end: () => { riding = false; boat.position.set(home.x, 0.05, home.z); boat.rotation.set(0, 0, 0); K.say('mut_tekne_bitti', 1); K.sugar(dock.x, dock.z, 6, 4); } });
        },
        tick: (dt, t) => { if (!riding) { boat.position.y = 0.05 + Math.sin(t * 2) * 0.05; boat.rotation.z = Math.sin(t * 1.3) * 0.04; } } });
    }
  }

  // Alan 3 · Dolap İçi
  function dolap(L, api, T, a3, q, rnd) {
    const rooms = mainOf(L, a3);
    // kapak: 2 → 3 geçidinde dev dolap kapağı; Feza yaklaşınca menteşesinden açılır (gizli geçit)
    const g = a3.gate;
    if (g) {
      const [dx, dz] = K.gateDir(L, g), nx = -dz, nz = dx, W = 6.4, Hh = 6.2;
      const hinge = new THREE.Group(); hinge.position.set(g.x - nx * W / 2, 0, g.z - nz * W / 2); hinge.rotation.y = Math.atan2(nx, nz) - Math.PI / 2;
      const k = new Kit(); k.add(G.rbox(2), 0xf6efe2, [W / 2, Hh / 2, 0], null, [W, Hh, 0.36]); k.add(G.rbox(2), 0xeadfcc, [W / 2, Hh / 2, 0.2], null, [W - 1, Hh - 1, 0.06]);
      k.add(G.rbox(2), 0xb9925a, [W - 0.7, Hh * 0.5, 0.3], null, [0.3, 1.4, 0.3]);
      const door = new THREE.Mesh(k.build(), K.vmat(0.45)); api.dispose(door.geometry); door.castShadow = true; hinge.add(door); api.add(hinge);
      const y0 = hinge.rotation.y; let open = 0, said = false;
      T.add({ x: g.x, z: g.z, r: 0, hint: false, use() {}, tick: (dt, t, hx, hz) => {
        const near = Math.hypot(hx - g.x, hz - g.z) < 6.5;
        const tgt = near || open > 0.98 ? 1 : 0; open += (tgt - open) * Math.min(1, dt * 3);
        hinge.rotation.y = y0 - open * 1.9;
        if (near && !said && K.playing()) { said = true; K.sfx('open', { x: g.x, z: g.z }); K.say('mut_dolap_kapak'); K.burst('sparkle', g.x, 2, g.z); K.sticker('mutfak_kapak'); }
      } });
    }
    // dolabın arka duvarı (kuzey) ve rafların ön kenarı
    const nr = L.rooms[rooms.slice().sort((p1, p2) => L.rooms[p1].z - L.rooms[p2].z)[0]];
    const wall = K.northOf(L, (q.x0 + q.x1) / 2, nr.z - nr.r - 1.4, Math.min(20, (q.x1 - q.x0) / 2), 0.5, 0.3, 10);
    if (wall) { const w = Math.min(40, q.x1 - q.x0); api.box(wall.x, 6, wall.z - 0.4, w, 12, 0.8, 0xf3e6d0); api.box(wall.x, 9, wall.z + 0.3, w, 0.5, 1.6, 0xe8d6b8); }
    // kavanozlar (makarna, mercimek, fasulye, pirinç, nohut) ve baharatlar: yürünür alanın dışında
    K.fill(L, rnd, a3.rooms, (x, z, maxH, fd, k) => {
      if ((wall && z < wall.z + 0.6) || inRect(L._mkSink, x, z)) return;
      if (maxH > 3.4 && k % 3 === 0) api.put(jarGeo(k), x, 0, z, 1, 1, 1, null, (rnd() - 0.5) * 0.6);
      else if (maxH > 2.6 && k % 3 === 1) api.put(spiceGeo(k), x, 0, z, 1, 1, 1, null, rnd() * TAU);
      else if (maxH > 1.2 && k % 5 === 2) api.put(cookieGeo(), x, 0, z, 1, 1, 1, null, rnd() * TAU);
      else if (maxH > 0.6) { api.put(penneGeo(), x, 0, z, 1, 1, 1, null, rnd() * TAU); api.put(penneGeo(), x + 0.8, 0, z + 0.5, 1, 1, 1, null, rnd() * TAU); }
      else for (let j = 0; j < 6; j++) api.ball(x + (rnd() - 0.5) * 1.4, 0.12, z + (rnd() - 0.5) * 1.0, 0.28, 0.12, 0.14, 0xfbf7ee);   // pirinç taneleri
    }, { step: 2.5, margin: 7 });
    // rafa dökülmüş mercimek, pirinç taneleri ve parıltılı şeker kristalleri (üstünden geçilir)
    K.scatter(L, rnd, a3.rooms, 14, (x, z, k) => {
      if (k % 3 === 0) api.put(G.cyl(1, 1, 12), x, 0.04, z, 0.32, 0.08, 0.32, 0xe8833a);
      else if (k % 3 === 1) api.ball(x, 0.07, z, 0.3, 0.12, 0.15, 0xfbf7ee);
      else api.put(G.box(), x, 0.12, z, 0.24, 0.24, 0.24, 0xf2fbff, rnd() * TAU);
    });
    // makarna köprüsü: 3. alanın yan koridorunda spagetti demeti
    const side = a3.rooms.find(i => L.rooms[i].kind === 'side');
    const sl = side != null && L.links.find(l => !l.main && (l.b === side || l.a === side) && l.curve);
    if (sl) {
      const c = sl.curve, m = c[c.length >> 1], a = c[Math.max(0, (c.length >> 1) - 4)], b = c[Math.min(c.length - 1, (c.length >> 1) + 4)];
      const yaw = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      api.put(pastaGeo(), m[0], 0, m[1], 1, 1, 1, null, yaw);
      T.add({ x: m[0], z: m[1], r: 0, near: 5, hint: false, line: 'mut_makarna', prio: 1, use() {} });
    }
    // baharat sırrı: kırmızı kapaklı dev baharat kavanozu; dokununca kapak fırlar, hapşu!, altın şeker
    const r0 = L.rooms[rooms[0]], sp = K.rimSpots(L, r0, 1.0).filter(s => s.z < r0.z + 1).sort(() => rnd() - 0.5)[0];
    if (sp) {
      const jar = K.mesh(api, spiceGeo(0), sp.x, 0, sp.z, 0.4); jar.scale.setScalar(1.3);
      let pop = -1;
      T.add({ x: sp.x, z: sp.z, r: 2.3, hint: { y: 4 }, line: 'mut_baharat_ipucu', near: 8, once: true,
        use: () => { pop = 0; K.sfx('cork', { x: sp.x, z: sp.z }); K.burst('confetti', sp.x, 3.2, sp.z);
          for (let i = 0; i < 3; i++) K.burst('smoke', sp.x + (Math.random() - 0.5), 3 + i * 0.4, sp.z, { color: '#e0533d' });
          const first = K.sticker('mutfak_baharat'); try { GAME.addGoldSugar(1); } catch (e) { /* */ } void first;
          K.burst('star', sp.x, 3.5, sp.z); K.say('mut_baharat'); K.sugar(GAME.P.pos.x, GAME.P.pos.z, 12, 6); },
        tick: dt => { if (pop < 0 || pop > 1.5) return; pop += dt; jar.rotation.z = Math.sin(pop * 30) * 0.08 * (1.5 - pop); jar.position.y = Math.max(0, Math.sin(pop * 12) * 0.2 * (1.5 - pop)); } });
    }
    // şeker kavanozu (hazine)
    const r1 = L.rooms[rooms[rooms.length - 1]], cs = K.rimSpots(L, r1, 1.2).filter(s => s.z < r1.z).sort(() => rnd() - 0.5)[0];
    if (cs) K.treasure(api, T, cs.x, cs.z, candyJarGeo(), { y: 0, tilt: 0.05, sc: 0.9, hintY: 4.4, say: 'mut_kavanoz', gold: 14, n: 8, sticker: 'mutfak_kavanoz' });
    // Aytuğ Hala'nın anahtarı: un tozu tümseğinin altında
    const ke = L.kayipEsya;
    if (ke && typeof BILBO_FUN !== 'undefined' && BILBO_FUN) T.add({ x: ke.x, z: ke.z, r: 0, near: 8, hint: false, line: 'mut_anahtar_ipucu', prio: 1, use() {} });
    else if (ke) K.lost(api, T, { zone: 'mutfak', id: 'anahtar', x: ke.x, z: ke.z, mound: moundGeo(), item: keyGeo(), itemScale: 0.8, ipucu: 'mut_anahtar_ipucu', bulundu: 'mut_anahtar', dirt: 'smoke' });
    for (const ri of a3.rooms) { const rr = L.rooms[ri]; api.light(rr.x, 3, rr.z, 0xffd9a0, 2, 10); }
  }
  const whiskGeo = () => C('mkWhisk', () => {   // dik duran dev çırpma teli (sapı aşağıda)
    const k = new Kit(), m = 0xdfe6ee;
    k.add(G.cyl(1, 1, 16), 0xe8504d, [0, 1.2, 0], null, [0.32, 2.4, 0.32]); k.add(G.sphere(12, 8), 0xe8504d, [0, 0.05, 0], null, [0.36, 0.12, 0.36]);
    for (let i = 0; i < 6; i++) k.add(G.torus(Math.PI, 0.05, 20), m, [0, 2.4, 0], [0, i * Math.PI / 6, 0], [0.75, 2.6, 0.75]);
    return k.build();
  });
  const potGeo = i => C('mkPot' + (i % 2), () => {   // tencere: gövde, kapak, topuz, iki kulp
    const k = new Kit(), c = i % 2 ? 0xe8504d : 0x5aa0e8;
    k.add(G.cyl(1, 1, 28), c, [0, 1.0, 0], null, [1.8, 2.0, 1.8]); k.add(G.cyl(1, 1, 28), 0xd8dde4, [0, 2.05, 0], null, [1.86, 0.1, 1.86]);
    k.add(G.sphere(20, 10), 0xd8dde4, [0, 2.1, 0], null, [1.75, 0.35, 1.75]); k.add(G.sphere(12, 8), 0x2c2e34, [0, 2.5, 0], null, 0.25);
    for (const sd of [-1, 1]) k.add(G.torus(Math.PI, 0.1, 12), 0x2c2e34, [sd * 1.85, 1.6, 0], [0, 0, sd * Math.PI / 2], [0.35, 0.3, 0.3]);
    k.add(G.cyl(1, 1, 28), 0xffffff, [0, 1.3, 1.78], [Math.PI / 2, 0, 0], [0.5, 0.02, 0.35]);   // yuvarlak etiket
    return k.build();
  });
  const ladleGeo = () => C('mkLadle', () => { const k = new Kit(), m = 0xd6dde5; k.add(G.rbox(2), m, [-1.6, 0.05, 0], null, [3.6, 0.14, 0.4]); k.add(G.hemi(16), m, [1.0, 0.45, 0], [Math.PI, 0, 0], [0.9, 0.45, 0.9]); return k.build(); });
  const mittGeo = () => C('mkMitt', () => { const k = new Kit(); k.add(G.sphere(16, 10), 0xf48fb1, [0, 0.3, 0], null, [1.1, 0.3, 0.75]); k.add(G.sphere(12, 8), 0xf48fb1, [0.65, 0.3, 0.7], null, [0.35, 0.25, 0.35]); k.add(G.box(), 0xffffff, [-1.0, 0.3, 0], null, [0.3, 0.5, 1.4]); for (let j = 0; j < 4; j++) k.add(G.sphere(6, 4), 0xffffff, [-0.4 + j * 0.3, 0.6, (j % 2) * 0.3 - 0.15], null, 0.08); return k.build(); });
  const moundGeo = () => C('mkMound', () => { const k = new Kit(), h = G.hemi(16); k.add(h, 0xfbf6ea, [0, 0, 0], null, [1.4, 0.7, 1.2]); for (let j = 0; j < 4; j++) k.add(h, 0xf4ecdc, [Math.cos(j * 1.6) * 1.1, 0, Math.sin(j * 1.6) * 0.9], null, [0.6, 0.35, 0.55]); return k.build(); });

  // Arena · Ocak üstü (sönük, güvenli)
  function ocak(L, api, T, ar, q, rnd) {
    const rm = L.rooms[ar.rooms[0]];
    K.gatePosts(L, ar.gate, 5.5, (x, z, yaw) => api.put(whiskGeo(), x, 0, z, 1, 1, 1, null, yaw));   // arena girişinde iki dev çırpma teli
    // ortası açık; çevresinde 4 sönük ocak gözü (düz, alçak: üstünden yürünür): siyah emaye disk, dökme demir oluklar, pirinç kapak
    for (let k = 0; k < 4; k++) {
      const a = k * TAU / 4 + Math.PI / 4, d = rm.r * 0.62, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
      if (!K.isF(L, x, z)) continue;
      api.put(G.cyl(1, 1, 40), x, 0.13, z, 2.3, 0.06, 2.3, 0x2c2e34);
      for (const r of [0.9, 1.4, 1.9]) api.put(G.torus(TAU, 0.06, 40), x, 0.17, z, r, r, 1, 0x4a4d55, 0, Math.PI / 2);
      for (let j = 0; j < 8; j++) { const b = j * TAU / 8; api.put(G.box(), x + Math.sin(b) * 1.4, 0.18, z + Math.cos(b) * 1.4, 0.14, 0.04, 1.0, 0x3a3c42, b); }
      api.put(G.cyl(1, 1, 28), x, 0.19, z, 0.6, 0.06, 0.6, 0xc9a25e); api.put(G.cyl(1, 1, 24), x, 0.23, z, 0.36, 0.03, 0.36, 0xe0bd78);
      api.put(G.torus(TAU, 0.05, 40), x, 0.16, z, 2.32, 2.32, 1, 0xd8dde4, 0, Math.PI / 2);   // krom kenar
    }
    // ocak tablasının kenarı: parlak çelik çerçeve (yürünür alanın dışında) ve süsler: tencere, kepçe, tahta kaşık, tuzluk, fırın eldiveni
    K.fill(L, rnd, ar.rooms, (x, z, maxH, fd, k) => {
      const kind = k % 5;
      if (kind === 0 && maxH > 2.4) api.put(potGeo(k), x, 0, z, 1, 1, 1, null, rnd() * TAU);
      else if (kind === 1) api.put(ladleGeo(), x, 0.12, z, 1, 1, 1, null, rnd() * TAU);
      else if (kind === 2) api.put(spoonGeo(), x, 0, z, 0.55, 0.55, 0.55, null, rnd() * TAU);
      else if (kind === 3 && maxH > 2) api.put(G.cyl(1, 1, 18), x, 1, z, 0.5, 2, 0.5, 0xf4f8fa), api.put(G.sphere(12, 8), x, 2.1, z, 0.5, 0.35, 0.5, 0xd8dde4);
      else if (maxH > 0.8) api.put(mittGeo(), x, 0, z, 1, 1, 1, null, rnd() * TAU);
    }, { step: 3.0, d0: 2.2, margin: 6 });
    // köşelerde dev ocak ızgaraları (yürünür alanın dışında)
    for (let k = 0; k < 8; k++) {
      const a = k * TAU / 8 + 0.4, d = rm.r + 4.5, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
      if (K.floorDist(L, x, z, 4) < 3.6 || K.floorNorth(L, x, z, 6) < 3) continue;
      api.put(grateGeo(), x, 0.05, z, 1, 1, 1, null, rnd());
    }
    // kuzey duvarı: beyaz metro fayans (derzli) + raf
    const ex = L.exit; if (!ex) return;
    let w = 60; const z = ex.z - 2.4;
    while (w > 16 && !K.rectFree(L, ex.x, z - 0.4, w / 2, 0.4, 0.2)) w -= 4;
    api.box(ex.x, 7, z - 0.4, w, 14, 0.8, 0xf7f5f0);
    for (let y = 0.7; y < 14; y += 0.7) api.box(ex.x, y, z + 0.01, w, 0.06, 0.04, 0xd8d6d0);
    for (let row = 0; row * 0.7 < 14; row++) for (let x = -w / 2 + (row % 2 ? 0.7 : 0); x < w / 2; x += 1.4) api.box(ex.x + x, row * 0.7 + 0.35, z + 0.01, 0.06, 0.7, 0.04, 0xd8d6d0);
    api.box(ex.x, 5.6, z + 0.05, 6.4, 11.2, 0.14, 0xfdf6ea); for (const s of [-1, 1]) api.box(ex.x + s * 3.35, 5.7, z + 0.12, 0.4, 11.4, 0.3, 0xffffff);
    api.box(ex.x, 11.45, z + 0.12, 7.1, 0.4, 0.3, 0xffffff); api.ball(ex.x + 2.5, 5, z + 0.25, 0.3, 0.3, 0.3, 0xe2b649);
    // ocak düğmeleri (duvarda, kapının iki yanında): krem gövde, kırmızı çizgi; hepsi "kapalı"
    for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {
      const kx = ex.x + sd * (5.2 + k * 2.6); if (Math.abs(kx - ex.x) > w / 2 - 1) continue;
      api.put(G.cyl(1, 1, 24), kx, 2.4, z + 0.35, 0.95, 0.5, 0.95, 0xf4efe4, 0, Math.PI / 2);
      api.put(G.cyl(1, 1, 20), kx, 2.4, z + 0.65, 0.72, 0.25, 0.72, 0xe8e2d4, 0, Math.PI / 2);
      api.box(kx, 2.75, z + 0.78, 0.14, 0.5, 0.06, 0xe8504d);
      api.ball(kx, 3.7, z + 0.1, 0.22, 0.22, 0.05, 0x7fb8a6);   // küçük "kapalı" ışığı (yeşil)
    }
  }

  return { yerlesim, kur };
})();

BOLUM.define('mutfak', {
  ad: 'Mutfak',
  taban: 'bathroom',
  size: 90, side: 2,
  areas: [{ id: 'a1', ad: 'Tezgâh Tepeleri', rooms: 2 }, { id: 'a2', ad: 'Lavabo Gölü', rooms: 2 }, { id: 'a3', ad: 'Dolap İçi', rooms: 2 }],
  muzik: 'kefir',
  malzeme: 'yumurta', kayipEsya: 'anahtar',
  isik: { fog: [0xe6d8c6, 36, 92], hemiSky: 0xfff8ee, hemiGround: 0xb89a7a, sunColor: 0xfff0d8, env: [0xfff0dc, 0xffe8d0, 0xa88a6a, 0.9], bloom: 0.3, exposure: 0.93, sat: 1.1, vig: 0.3 },
  zemin: { tA: 0xfff4e0, tB: 0xf6e2c4, tC: 0xffffff, out: 0xc89a6a, outAmt: 0.6, macro: 0xfff8ec },
  minimap: { zemin: '#efd9b4' },
  harita: { ad: 'Mutfak', detay: 'Tezgâh tepeleri, lavabo gölü ve dolap içi', renk: '#f3d49b', x: 78, y: 34, simge: '🍳' },
  yerlesim(L, api) { MUTFAK.yerlesim(L, api); },
  kur(L, api) { return MUTFAK.kur(L, api); },
});
