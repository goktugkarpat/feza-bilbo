/* ── Merkez: Uyku Yuvası (Feza ile Pırıl) ──
   Oyun buradan başlar (bölge 0, huysuz yok). Yıldızlı gecenin içinde yüzen yumuşacık bir bulut adası:
   - ortada "Işık Çemberi": 5 ışık kaidesi (ejderha ışığı geri geldikçe biri yanar; 5'i de yanınca gökkuşağı ve büyük yıldız),
   - batıda Feza'nın yatağı (yıldızlı yorgan, yastık, peluş ejderha) + gece lambası, doğuda Pırıl'ın yuvası (yumuşak sepet) + yıldız çanı,
   - kuzey kenarda 5 rüya kapısı (bölümler sırayla açılır; kilitli kapı soluk, biten kapının üstünde altın yıldız),
   - Gardırop, Pırıl'ın Köşesi (aksesuar), Çıkartma Albümü, Mini Oyun Köşesi (istasyonlar; paneller HUB, 09h_hub),
   - dokununca tepki veren oyuncaklar: gece lambası (yere yıldız yansıtır), yıldız topacı (döner), yıldız çanı (çalar), uykucu bulut (uyanıp zıplar),
   - aşağıda ve uzakta: yıldızlı gök kubbesi, uyuyan ay, adanın altında süzülen bulutlar, havada parıltılar.
   Kapılar 09_ui'deki 'kapi' istasyonu ile bölüme götürür. Genel ad: YUVA. Sözleşme: PIRIL.md › 2.
   Test: YUVA.isik(n) → n ışık yanmış gibi göster (canlı; null = gerçek kayıt). */
const YUVA = (() => {
  'use strict';
  const TAU = Math.PI * 2;
  // ── Yerleşim (metre): yürünür elips, kapılar, istasyonlar, süsler ──
  const T = { W: 64, H: 54, cx: 32, cz: 28, rx: 17, rz: 12 };
  T.doors = [
    // GÜZEL: her kapı kendi diyarının renginde (mantar pembe, mercan turkuaz, çöl turuncu, atölye sarı, gökkuşağı) ve kemerinde simgesi
    { zone: 'mantar', col: 0xff86cc, col2: 0xffe4f4, simge: '🍄' },
    { zone: 'mercan', col: 0x34d4cc, col2: 0xdcfffb, simge: '🐚' },
    { zone: 'col', col: 0xff9a3c, col2: 0xffead6, simge: '⏳' },
    { zone: 'atolye', col: 0xffcc2e, col2: 0xfff4c8, simge: '⚙️' },
    { zone: 'gokkusagi', col: 0xff9ad5, col2: 0xffe6f4, simge: '🌈' },
  ];
  T.doors.forEach((d, i) => { const a = (i - 2) * 0.42; d.x = T.cx + Math.sin(a) * (T.rx - 2.2); d.z = T.cz - Math.cos(a) * (T.rz - 2.2); });
  T.ring = { x: T.cx, z: T.cz - 1.4, R: 3.5 };   // Işık Çemberi (güneye açık at nalı; kapılarla aynı sıra)
  T.peds = T.doors.map((d, i) => { const a = (i - 2) * 0.62; return { i, zone: d.zone, col: d.col, col2: d.col2, x: T.ring.x + Math.sin(a) * T.ring.R, z: T.ring.z - Math.cos(a) * T.ring.R * 0.9 }; });
  T.bed = { x: T.cx - 8, z: T.cz + 0.6 };        // yatağın ortası (başucu kuzeyde)
  T.lamp = { x: T.cx - 10.8, z: T.cz - 1.6 };    // gece lambası (komodin)
  T.nest = { x: T.cx + 8, z: T.cz + 0.8 };       // Pırıl'ın sepeti
  T.chime = { x: T.cx + 11, z: T.cz - 1.6 };     // yıldız çanı
  T.top = { x: T.cx - 4.4, z: T.cz + 5.4 };      // yıldız topacı
  T.bulut = { x: T.cx + 4.4, z: T.cz + 5.4 };    // uykucu bulut
  T.st = { gardirop: { x: T.cx - 13, z: T.cz + 3.6 }, bilbo: { x: T.cx + 13, z: T.cz + 3.6 }, album: { x: T.cx - 8.6, z: T.cz + 8.2 }, mini: { x: T.cx + 8.6, z: T.cz + 8.2 } };
  const inside = (x, z, k = 1) => ((x - T.cx) / (T.rx * k)) ** 2 + ((z - T.cz) / (T.rz * k)) ** 2 <= 1;
  const P_ = () => (typeof GAME !== 'undefined' && GAME.P) || null;
  const open = id => typeof BOLUM === 'undefined' || !BOLUM.isOpen || BOLUM.isOpen(id, P_());
  const done = id => { const P = P_(); return !!(P && P.bossNese && P.bossNese[id]); };
  // yanan ışıklar: ışık i (isik1..isik5) kayıtta varsa ya da o bölümün bossu neşelendiyse
  let testN = null;
  function litMask() {
    if (testN != null) return (1 << Math.max(0, Math.min(5, testN))) - 1;
    const P = P_(); let m = 0;
    for (let i = 0; i < 5; i++) if ((P && P.malzemeler && P.malzemeler['isik' + (i + 1)]) || done(T.doors[i].zone)) m |= 1 << i;
    return m;
  }
  let seenMask = null;
  const DBG = {};   // test: YUVA._dbg.toys (oyuncak dokunma sayıları)   // son yuva ziyaretinde yanan ışıklar (yeni gelen ışık yuvada da bir kez parlayarak yanar)

  function yerlesim(L, api) {
    L.spawns.length = 0; L.chests.length = 0;
    L.breakables = []; L.torches = []; L.checkpoints = []; L.boss = null; L.npc = null; L.merchant = null;
    if (api.regrid) {
      api.regrid(T.W, T.H, (x, z) => inside(x, z));
      L.rooms = [{ x: T.cx, z: T.cz + 7, r: 6, kind: 'start', hw: 6, hh: 6 }, { x: T.cx, z: T.cz, r: 12, kind: 'boss', hw: 16, hh: 11 }];
      L.links = []; L.path = [{ x: T.cx, z: T.cz + 8 }, { x: T.cx, z: T.cz - 8 }];
      L.start = { x: T.cx, z: T.cz + 7.5 };
      L.exit = { x: 2, z: 2 };   // (kendi portalı kullanılmıyor: 5 rüya kapısı var)
    }
    // bölümden dönüş: Feza geldiği kapının önünde başlar
    try {
      const P = P_(), Zs = typeof ZONES !== 'undefined' ? ZONES : null, prev = P && Zs && Zs[P.zone] && Zs[P.zone].id;
      const d = prev && T.doors.find(q => q.zone === prev);
      if (d) { const x = d.x + (T.cx - d.x) * 0.18, z = d.z + 2.6; if (api.circleFree(x, z, 0.9)) L.start = { x, z }; }
    } catch (e) { /* başlangıç noktası */ }
    const st = L.stations = [];
    const put = (id, kind, x, z, o) => st.push(Object.assign({ id, kind, x, z, r: 1.6 }, o));
    for (const d of T.doors) if (typeof ZONE_DEFS === 'undefined' || ZONE_DEFS[d.zone]) put('kapi_' + d.zone, 'kapi', d.x, d.z + 0.9, { zone: d.zone, r: 1.4 });
    for (const id of ['gardirop', 'bilbo', 'album', 'mini']) put(id, id, T.st[id].x, T.st[id].z, { r: 1.7 });
    // katı süsler (çarpışma daireleri)
    const b = T.bed;
    api.solid(b.x, b.z - 0.9, 1.25, 'yatak'); api.solid(b.x, b.z + 0.9, 1.25, 'yatak');
    api.solid(T.lamp.x, T.lamp.z, 0.55, 'lamba');
    api.solid(T.nest.x, T.nest.z, 1.3, 'yuva');
    api.solid(T.chime.x, T.chime.z, 0.35, 'can');
    api.solid(T.top.x, T.top.z, 0.5, 'topac');
    api.solid(T.bulut.x, T.bulut.z, 0.5, 'bulut');
    api.solid(T.st.gardirop.x, T.st.gardirop.z - 1.9, 1.0, 'gardirop');
    api.solid(T.st.bilbo.x, T.st.bilbo.z - 1.9, 0.9, 'sus');
    api.solid(T.st.mini.x, T.st.mini.z - 1.7, 0.8, 'mini');
    for (const p of T.peds) api.solid(p.x, p.z, 0.45, 'kaide');
    for (const s of st) if (!api.isFloor(s.x, s.z)) { const p = api.randomFloorNear(s.x, s.z, 0, 3); if (p) { s.x = p.x; s.z = p.z; } }
  }

  // ── Doku ve geometri önbelleği (bir kez çizilir; bölüm değişince atılmaz) ──
  const TX = {}, GEO = {}, MAT = {};
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function ctex(key, w, h, draw, o = {}) {
    if (TX[key]) return TX[key];
    const c = cv(w, h), g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (o.wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return (TX[key] = t);
  }
  const keepMat = m => { m.userData.keep = true; return m; };
  function starPath(g, x, y, r, ri = r * 0.48, rot = 0) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot + i / 10 * TAU, q = i % 2 ? ri : r; i ? g.lineTo(x + Math.sin(a) * q, y - Math.cos(a) * q) : g.moveTo(x + Math.sin(a) * q, y - Math.cos(a) * q); }
    g.closePath();
  }
  const radialTex = (key, inner, outer) => ctex(key, 128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, inner); r.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.55)')); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  function starGeo() {   // dolgun, yumuşak kenarlı 5 köşeli yıldız (birim boy, ortalanmış)
    if (GEO.star) return GEO.star;
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = i % 2 ? 0.5 : 1, x = Math.sin(a) * r, y = Math.cos(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.38, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 2, curveSegments: 1 });
    g.center(); g.userData.cached = true;
    return (GEO.star = g);
  }
  function archShape() {   // rüya kapısının iç yüzü: dikdörtgen + yarım daire
    if (GEO.arch) return GEO.arch;
    const s = new THREE.Shape(), w = 1.3, h = 2.4;
    s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, h); s.absarc(0, h, w, 0, Math.PI, false); s.lineTo(-w, 0);
    const g = new THREE.ShapeGeometry(s, 20); g.userData.cached = true;
    return (GEO.arch = g);
  }

  // GÜZEL: kapı kemerinin üstündeki 3B diyar simgesi (mantar, deniz kabuğu, kum saati, çark, gökkuşağı); kilitliyse soluk
  function symbolGeo(zone, locked) {
    const key = 'sym_' + zone + (locked ? '_k' : '');
    if (GEO[key]) return GEO[key];
    const grey = new THREE.Color(0xe4e0ee), cc = h => { const c = new THREE.Color(h); return locked ? c.lerp(grey, 0.45) : c; };   // kilitli: soluk ama rengi seçilir
    const k = new Kit();
    if (zone === 'mantar') {
      k.add(G.cyl(0.8, 1, 16), cc(0xfff1dc), [0, 0.22, 0], null, [0.18, 0.44, 0.18]);
      k.add(G.hemi(24), cc(0xff6fbf), [0, 0.42, 0], null, [0.55, 0.42, 0.55]);
      k.add(G.cyl(1, 1, 24), cc(0xffe2f2), [0, 0.42, 0], null, [0.53, 0.03, 0.53]);
      for (const [x, y, z, r] of [[0, 0.82, 0.05, 0.1], [0.3, 0.62, 0.25, 0.08], [-0.3, 0.64, 0.22, 0.09], [0.12, 0.6, 0.42, 0.07], [-0.16, 0.7, 0.36, 0.06]]) k.add(G.sphere(10, 8), cc(0xffffff), [x, y, z], null, [r, r * 0.55, r]);
    } else if (zone === 'mercan') {
      for (let i = 0; i < 9; i++) { const a = (i - 4) / 4 * 1.2; k.add(G.capsule(1, 10), cc(i & 1 ? 0x7ff0e6 : 0x34d4cc), [Math.sin(a) * 0.3, 0.2 + Math.cos(a) * 0.3, 0], [0, 0, -a], [0.085, 0.33, 0.06]); }
      k.add(G.sphere(12, 8), cc(0x2aa8a0), [0, 0.12, 0.02], null, [0.14, 0.09, 0.08]);
      k.add(G.sphere(14, 10), cc(0xfff8f4), [0, 0.42, 0.12], null, 0.1);
    } else if (zone === 'col') {
      for (const y of [0.0, 0.92]) k.add(G.cyl(1, 1, 24), cc(0xffcf5a), [0, y, 0], null, [0.36, 0.07, 0.36]);
      k.add(G.cone(20), cc(0xffe4c4), [0, 0.68, 0], [Math.PI, 0, 0], [0.3, 0.42, 0.3]);
      k.add(G.cone(20), cc(0xffe4c4), [0, 0.24, 0], null, [0.3, 0.42, 0.3]);
      k.add(G.cone(16), cc(0xff9a3c), [0, 0.16, 0], null, [0.24, 0.26, 0.24]);
      k.add(G.cone(12), cc(0xff9a3c), [0, 0.6, 0], [Math.PI, 0, 0], [0.12, 0.12, 0.12]);
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; k.add(G.cyl(1, 1, 8), cc(0xffcf5a), [Math.sin(a) * 0.31, 0.46, Math.cos(a) * 0.31], null, [0.03, 0.92, 0.03]); }
    } else if (zone === 'atolye') {
      const R = 0.38;
      k.add(G.torus(TAU, 0.24, 36), cc(0xffcc2e), [0, 0.45, 0], null, [R, R, R * 0.8]);
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; k.add(G.rbox(2), cc(0xffcc2e), [Math.sin(a) * R * 1.22, 0.45 + Math.cos(a) * R * 1.22, 0], [0, 0, -a], [0.13, 0.15, 0.14]); }
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; k.seg([0, 0.45, 0], [Math.sin(a) * R, 0.45 + Math.cos(a) * R, 0], 0.045, cc(0xffb000), 0.045, 8); }
      k.add(G.cyl(1, 1, 18), cc(0xff8a3c), [0, 0.45, 0], [Math.PI / 2, 0, 0], [0.12, 0.16, 0.12]);
    } else {
      [0xff5a6e, 0xffa040, 0xffe14a, 0x6fe07a, 0x5ab8ff, 0xa77bff].forEach((c, i) => k.add(G.torus(Math.PI, 0.5, 32), cc(c), [0, 0.12, 0], null, [0.56 - i * 0.055, 0.56 - i * 0.055, 0.06]));
      for (const sd of [-1, 1]) for (const [x, y, r] of [[0.4, 0.1, 0.15], [0.55, 0.12, 0.11], [0.3, 0.16, 0.1]]) k.add(G.sphere(12, 8), cc(0xffffff), [sd * x, y, 0.05], null, r);
    }
    const g = k.build(); g.userData.cached = true;
    return (GEO[key] = g);
  }
  let PLANE = null;
  const faceGeo = () => PLANE || (PLANE = (() => { const g = new THREE.PlaneGeometry(1.5, 0.75); g.userData.cached = true; return g; })());

  // Zemin dokusu: pastel bulut halısı, ortada lacivert yıldızlı Işık Çemberi, yıldız taşlı yollar, köşe minderleri
  const FL = { x0: T.cx - T.rx * 1.32, z0: T.cz - T.rz * 1.32, w: T.rx * 2.64, h: T.rz * 2.64 };
  function floorTex() {
    const cw = 1024, ch = Math.round(1024 * FL.h / FL.w);
    return ctex('floor', cw, ch, (g) => {
      const s = cw / FL.w, X = x => (x - FL.x0) * s, Z = z => (z - FL.z0) * s, rnd = mulberry32 ? mulberry32(77) : Math.random;
      g.fillStyle = '#f3eafd'; g.fillRect(0, 0, cw, ch);
      // ana bulut: elips radyal geçiş
      g.save(); g.translate(X(T.cx), Z(T.cz)); g.scale(1, T.rz / T.rx);
      let r = g.createRadialGradient(0, 0, 0, 0, 0, T.rx * 1.22 * s);
      r.addColorStop(0, '#fff8ff'); r.addColorStop(0.5, '#f4eafe'); r.addColorStop(0.82, '#e9dcfb'); r.addColorStop(0.92, '#f7efff'); r.addColorStop(1, '#fdf8ff');
      g.fillStyle = r; g.beginPath(); g.arc(0, 0, T.rx * 1.22 * s, 0, TAU); g.fill(); g.restore();
      const blob = (x, z, rad, col, a) => { const q = g.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), rad * s); q.addColorStop(0, col.replace('A', a)); q.addColorStop(1, col.replace('A', 0)); g.fillStyle = q; g.fillRect(X(x) - rad * s, Z(z) - rad * s, rad * s * 2, rad * s * 2); };
      // köşe pastelleri: yatak pembe, yuva mavi, albüm şeftali, mini nane
      blob(T.bed.x, T.bed.z, 6, 'rgba(255,196,224,A)', 0.55); blob(T.nest.x, T.nest.z, 6, 'rgba(184,220,255,A)', 0.6);
      blob(T.st.album.x, T.st.album.z, 4.5, 'rgba(255,214,170,A)', 0.45); blob(T.st.mini.x, T.st.mini.z, 4.5, 'rgba(186,240,204,A)', 0.5);
      blob(T.st.gardirop.x, T.st.gardirop.z - 1, 4, 'rgba(190,212,255,A)', 0.5); blob(T.st.bilbo.x, T.st.bilbo.z - 1, 4, 'rgba(255,206,232,A)', 0.5);
      // pofuduk bulut kabartıları (beyaz yumuşak lekeler)
      for (let i = 0; i < 300; i++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * 1.15, x = T.cx + Math.sin(a) * T.rx * d, z = T.cz + Math.cos(a) * T.rz * d;
        blob(x, z, 0.7 + rnd() * 1.6, 'rgba(255,255,255,A)', 0.28 + rnd() * 0.3);
      }
      for (let i = 0; i < 70; i++) {   // hafif lavanta gölgecikler (bulut dokusu)
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * 1.05, x = T.cx + Math.sin(a) * T.rx * d, z = T.cz + Math.cos(a) * T.rz * d;
        blob(x, z, 0.9 + rnd() * 1.4, 'rgba(206,190,246,A)', 0.16);
      }
      // köşe minderleri (istasyon yerleri): renkli yuvarlak + kesik beyaz kenar
      const pad = (x, z, rad, col) => {
        g.fillStyle = col; g.beginPath(); g.ellipse(X(x), Z(z), rad * s, rad * s * 0.9, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.12 * s; g.setLineDash([0.32 * s, 0.22 * s]);
        g.beginPath(); g.ellipse(X(x), Z(z), (rad - 0.22) * s, (rad - 0.22) * s * 0.9, 0, 0, TAU); g.stroke(); g.setLineDash([]);
      };
      pad(T.st.gardirop.x, T.st.gardirop.z, 1.6, '#c7dcff'); pad(T.st.bilbo.x, T.st.bilbo.z, 1.6, '#ffd3e8');
      pad(T.st.album.x, T.st.album.z, 1.6, '#ffe0bd'); pad(T.st.mini.x, T.st.mini.z, 1.6, '#c8f2d4');
      // yatak halısı (dalgalı kenarlı pembe) ve yuva halısı (mavi)
      const scallop = (x, z, rw, rh, col, edge) => {
        g.fillStyle = edge; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; g.beginPath(); g.arc(X(x + Math.sin(a) * rw), Z(z + Math.cos(a) * rh), 0.42 * s, 0, TAU); g.fill(); }
        g.beginPath(); g.ellipse(X(x), Z(z), rw * s, rh * s, 0, 0, TAU); g.fill();
        g.fillStyle = col; g.beginPath(); g.ellipse(X(x), Z(z), (rw - 0.25) * s, (rh - 0.25) * s, 0, 0, TAU); g.fill();
      };
      scallop(T.bed.x - 0.4, T.bed.z + 0.3, 2.9, 3.0, '#ffc6de', '#fff3f9');
      scallop(T.nest.x, T.nest.z, 2.2, 2.0, '#bfe0ff', '#f2f9ff');
      // yıldız taşlı yollar: güneyden çembere, çemberden her kapıya
      const stones = (x0, z0, x1, z1, step = 1.45) => {
        const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.floor(L / step));
        for (let i = 0; i <= n; i++) {
          const u = i / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
          starPath(g, X(x), Z(z), 0.36 * s, 0.17 * s, (i % 2) * 0.3);
          g.fillStyle = '#ffeaa6'; g.fill(); g.lineWidth = 0.06 * s; g.strokeStyle = '#f2c96a'; g.stroke();
        }
      };
      stones(T.cx, T.cz + 10.3, T.cx, T.ring.z + T.ring.R + 1.2);
      for (const d of T.doors) {
        const a = Math.atan2(d.x - T.ring.x, -(d.z - T.ring.z));
        stones(T.ring.x + Math.sin(a) * (T.ring.R + 1.5), T.ring.z - Math.cos(a) * (T.ring.R + 1.3), d.x, d.z + 1.9, 1.55);
      }
      // kapı önü renkli parıltı
      for (const d of T.doors) { const c = new THREE.Color(d.col); blob(d.x, d.z + 0.9, 2.2, `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},A)`, 0.45); }
      // Işık Çemberi: lacivert yıldızlı halı, altın kenar
      g.save(); g.translate(X(T.ring.x), Z(T.ring.z - 1.1)); g.scale(1, 0.9);
      const RR = (T.ring.R + 1.25) * s;
      r = g.createRadialGradient(0, 0, 0, 0, 0, RR); r.addColorStop(0, '#5b56c4'); r.addColorStop(0.7, '#3c3a99'); r.addColorStop(1, '#2f2d80');
      g.fillStyle = '#fff4cf'; g.beginPath(); g.arc(0, 0, RR + 0.28 * s, 0, TAU); g.fill();
      g.fillStyle = '#ffd56e'; g.beginPath(); g.arc(0, 0, RR + 0.14 * s, 0, TAU); g.fill();
      g.fillStyle = r; g.beginPath(); g.arc(0, 0, RR, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,226,140,0.7)'; g.lineWidth = 0.07 * s; g.setLineDash([0.18 * s, 0.2 * s]);
      g.beginPath(); g.arc(0, 0, RR - 0.45 * s, 0, TAU); g.stroke(); g.setLineDash([]);
      for (let i = 0; i < 46; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * (RR - 0.6 * s); starPath(g, Math.sin(a) * d, Math.cos(a) * d, (0.06 + rnd() * 0.12) * s, undefined, rnd()); g.fillStyle = rnd() < 0.7 ? '#ffe79a' : '#ffffff'; g.fill(); }
      g.restore();
      // kaide minderleri (bölüm rengi)
      for (const p of T.peds) { const c = new THREE.Color(p.col2); g.fillStyle = `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`; g.beginPath(); g.arc(X(p.x), Z(p.z), 0.85 * s, 0, TAU); g.fill(); g.strokeStyle = '#ffd56e'; g.lineWidth = 0.08 * s; g.stroke(); }
      // minik parıltılar
      for (let i = 0; i < 700; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * 1.2, x = T.cx + Math.sin(a) * T.rx * d, z = T.cz + Math.cos(a) * T.rz * d; g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(255,226,150,0.75)'; g.beginPath(); g.arc(X(x), Z(z), (0.02 + rnd() * 0.04) * s, 0, TAU); g.fill(); }
    });
  }
  // Zemin geometrisi: elips disk; kenarı yumuşakça aşağı kıvrılır (bulut minderinin kenarı)
  function floorGeo() {
    if (GEO.floor) return GEO.floor;
    const nr = 22, na = 128, pos = [], uv = [], idx = [];
    for (let j = 0; j <= nr; j++) {
      const r = j / nr * 1.24, t = Math.max(0, (r - 1.06) / 0.18), y = -1.1 * t * t;
      for (let i = 0; i <= na; i++) {
        const a = i / na * TAU, x = T.cx + Math.sin(a) * T.rx * r, z = T.cz - Math.cos(a) * T.rz * r;
        pos.push(x, y, z); uv.push((x - FL.x0) / FL.w, 1 - (z - FL.z0) / FL.h);
      }
    }
    for (let j = 0; j < nr; j++) for (let i = 0; i < na; i++) { const a = j * (na + 1) + i, b = a + na + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    // ters sarılmışsa normali yukarı çevir
    const n = g.attributes.normal, n0 = 2 * (na + 1); if (n.getY(n0) < 0) { for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); g.setIndex(idx.map((v, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]])); }
    g.userData.cached = true;
    return (GEO.floor = g);
  }
  // Gök kubbesi: gece mavisi → lavanta ufuk, pembe-mavi bulutsu lekeler (yıldızlar ayrı noktalar)
  function skyTex() {
    return ctex('sky', 512, 256, (g, w, h) => {
      const r = g.createLinearGradient(0, 0, 0, h);
      r.addColorStop(0, '#10153f'); r.addColorStop(0.42, '#2b2a72'); r.addColorStop(0.5, '#6a5cae'); r.addColorStop(0.56, '#4a43a0');
      r.addColorStop(0.72, '#262a74'); r.addColorStop(1, '#141849');
      g.fillStyle = r; g.fillRect(0, 0, w, h);
      const rnd = mulberry32(31);
      for (let i = 0; i < 40; i++) {
        const x = rnd() * w, y = h * (0.45 + rnd() * 0.45), rad = 20 + rnd() * 60, c = ['255,170,220', '150,200,255', '190,160,255', '140,230,230'][i % 4];
        for (const dx of [0, -w, w]) { const q = g.createRadialGradient(x + dx, y, 0, x + dx, y, rad); q.addColorStop(0, `rgba(${c},0.22)`); q.addColorStop(1, `rgba(${c},0)`); g.fillStyle = q; g.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2); }
      }
    });
  }
  const starDotTex = () => ctex('stardot', 64, 64, (g) => {
    const q = g.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.22, 'rgba(255,250,220,0.85)'); q.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = q; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(30, 4, 4, 56); g.fillRect(4, 30, 56, 4);
  });
  // Uyuyan ay (kapalı gözler, gülümseme, pembe yanak, hale)
  const moonTex = () => ctex('moon', 512, 512, (g) => {
    let q = g.createRadialGradient(256, 256, 60, 256, 256, 256); q.addColorStop(0, 'rgba(255,246,200,0.55)'); q.addColorStop(0.5, 'rgba(255,236,190,0.18)'); q.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = q; g.fillRect(0, 0, 512, 512);
    q = g.createRadialGradient(220, 210, 20, 256, 256, 150); q.addColorStop(0, '#fffbe2'); q.addColorStop(1, '#ffe59a');
    g.fillStyle = q; g.beginPath(); g.arc(256, 256, 150, 0, TAU); g.fill();
    g.fillStyle = 'rgba(240,200,120,0.35)'; for (const [x, y, r] of [[200, 190, 22], [320, 175, 16], [330, 320, 26], [190, 330, 14], [270, 360, 10]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.strokeStyle = '#a07a4a'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.arc(205, 245, 26, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.beginPath(); g.arc(307, 245, 26, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.beginPath(); g.arc(256, 292, 30, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(255,150,170,0.5)'; g.beginPath(); g.arc(175, 292, 22, 0, TAU); g.fill(); g.beginPath(); g.arc(337, 292, 22, 0, TAU); g.fill();
  });
  // rüya kapısının içi: süzülen yıldızlar ve bulut kıvrımları (rengini malzeme verir)
  const swirlTex = () => ctex('swirl', 256, 256, (g) => {
    g.fillStyle = '#d8d8e8'; g.fillRect(0, 0, 256, 256);
    const rnd = mulberry32(5);
    for (let i = 0; i < 26; i++) { const x = rnd() * 256, y = rnd() * 256, r = 20 + rnd() * 40; for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { const q = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); q.addColorStop(0, 'rgba(255,255,255,0.55)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); } }
    for (let i = 0; i < 18; i++) { const x = rnd() * 256, y = rnd() * 256; starPath(g, x, y, 5 + rnd() * 7, undefined, rnd()); g.fillStyle = '#ffffff'; g.fill(); }
  }, { wrap: true });
  // gece lambasının yere yansıttığı yıldızlar ve aylar
  const projTex = () => ctex('proj', 512, 512, (g) => {
    const rnd = mulberry32(9);
    const q = g.createRadialGradient(256, 256, 0, 256, 256, 256); q.addColorStop(0, 'rgba(255,230,170,0.35)'); q.addColorStop(1, 'rgba(255,230,170,0)'); g.fillStyle = q; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 46; i++) {
      const a = rnd() * TAU, d = 50 + Math.sqrt(rnd()) * 190, x = 256 + Math.sin(a) * d, y = 256 + Math.cos(a) * d, c = ['#fff2a8', '#ffc8e6', '#c8e4ff', '#d8c8ff'][i % 4];
      g.fillStyle = c;
      if (i % 7 === 0) { g.beginPath(); g.arc(x, y, 16, 0, TAU); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x + 8, y - 5, 14, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
      else { starPath(g, x, y, 7 + rnd() * 11, undefined, rnd()); g.fill(); }
    }
  });
  const beamTex = () => ctex('beam', 64, 128, (g) => {
    const q = g.createLinearGradient(0, 0, 0, 128); q.addColorStop(0, 'rgba(255,255,255,0)'); q.addColorStop(0.7, 'rgba(255,255,255,0.35)'); q.addColorStop(1, 'rgba(255,255,255,0.8)');
    g.fillStyle = q; g.fillRect(0, 0, 64, 128);
  });
  // kapı rozeti: bölüm simgesi; kilitliyse soluk + bulut kilidi, bittiyse altın kenar + yıldız
  function badgeTex(d, state) {
    return ctex('badge_' + d.zone + '_' + state, 192, 192, (g) => {
      const c = new THREE.Color(state === 'kilit' ? 0xb9b6cc : d.col), rgb = `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`;
      g.fillStyle = state === 'bitti' ? '#ffd24a' : '#ffffff'; g.beginPath(); g.arc(96, 96, 88, 0, TAU); g.fill();
      g.fillStyle = rgb; g.beginPath(); g.arc(96, 96, 76, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.arc(96, 96, 62, 0, TAU); g.fill();
      g.font = '78px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.globalAlpha = state === 'kilit' ? 0.35 : 1; g.fillText(d.simge, 96, 102); g.globalAlpha = 1;
      if (state === 'kilit') { g.font = '58px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.fillText('🔒', 136, 140); }
      if (state === 'bitti') { starPath(g, 150, 42, 30, 14); g.fillStyle = '#ffe066'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.stroke(); }
    });
  }
  const nextStarTex = () => ctex('nextstar', 128, 128, (g) => {
    starPath(g, 64, 66, 54, 25); g.fillStyle = '#ffd23a'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(50, 50, 10, 6, -0.6, 0, TAU); g.fill();
  });
  // yorgan: gece mavisi, altın yıldızlar, ay, pembe kenar
  const quiltTex = () => ctex('quilt', 256, 256, (g) => {
    g.fillStyle = '#ffb3d1'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#3c4aa6'; g.fillRect(14, 14, 228, 228);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.setLineDash([6, 6]);
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(14 + i * 57, 14); g.lineTo(14 + i * 57, 242); g.stroke(); g.beginPath(); g.moveTo(14, 14 + i * 57); g.lineTo(242, 14 + i * 57); g.stroke(); }
    g.setLineDash([]);
    const rnd = mulberry32(3);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const x = 42 + i * 57, y = 42 + j * 57;
      if ((i + j) % 3 === 1) { g.fillStyle = '#fff1a8'; g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fill(); g.fillStyle = '#3c4aa6'; g.beginPath(); g.arc(x + 7, y - 5, 13, 0, TAU); g.fill(); }
      else { starPath(g, x, y, 15, 7, rnd() * 0.6); g.fillStyle = '#ffd95a'; g.fill(); }
    }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(14 + rnd() * 228, 14 + rnd() * 228, 1.6, 0, TAU); g.fill(); }
  });
  // uykucu bulutun yüzü (uyuyor / uyanık)
  const faceTex = awake => ctex('bulutyuz' + (awake ? 1 : 0), 256, 128, (g) => {
    g.lineCap = 'round'; g.strokeStyle = '#5a4a7a'; g.lineWidth = 8;
    if (awake) {
      for (const x of [88, 168]) { g.fillStyle = '#4a3a6a'; g.beginPath(); g.ellipse(x, 52, 14, 18, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 5, 45, 6, 0, TAU); g.fill(); }
      g.fillStyle = '#ff7fa8'; g.beginPath(); g.arc(128, 82, 20, 0, Math.PI); g.fill();
    } else {
      for (const x of [88, 168]) { g.beginPath(); g.arc(x, 50, 15, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
      g.beginPath(); g.arc(128, 78, 12, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    }
    g.fillStyle = 'rgba(255,140,180,0.55)'; g.beginPath(); g.arc(56, 80, 16, 0, TAU); g.fill(); g.beginPath(); g.arc(200, 80, 16, 0, TAU); g.fill();
  });
  const zzTex = () => ctex('zz', 64, 64, (g) => { g.font = 'bold 50px "Arial Rounded MT Bold",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#ffffff'; g.strokeText('z', 32, 34); g.fillStyle = '#9b8ae0'; g.fillText('z', 32, 34); });

  // paylaşılan malzemeler (bir kez derlenir, bölüm değişince atılmaz)
  function mats() {
    if (MAT.ok) return MAT;
    MAT.floor = keepMat(new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.94, metalness: 0 }));
    MAT.sky = keepMat(new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    MAT.stars = keepMat(new THREE.PointsMaterial({ map: starDotTex(), size: 9, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, color: 0xfff6e0 }));
    MAT.stars2 = keepMat(MAT.stars.clone()); MAT.stars2.size = 6; MAT.stars2.color.set(0xd8e6ff);
    MAT.moon = keepMat(new THREE.SpriteMaterial({ map: moonTex(), fog: false, depthWrite: false, transparent: true }));
    MAT.cloud = keepMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0x4a3f86, emissiveIntensity: 0.35 }));
    MAT.motes = keepMat(new THREE.PointsMaterial({ map: starDotTex(), size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0c0 }));
    MAT.motes2 = keepMat(MAT.motes.clone()); MAT.motes2.color.set(0xd0c4ff);
    MAT.toy = keepMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0 }));
    MAT.cloudToy = keepMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: 0x9d92d8, emissiveIntensity: 0.32 }));
    MAT.quilt = keepMat(new THREE.MeshStandardMaterial({ map: quiltTex(), roughness: 0.85 }));
    MAT.shade = keepMat(new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffc870, emissiveIntensity: 0.7, roughness: 0.5 }));
    MAT.orb = keepMat(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    MAT.glowStar = keepMat(new THREE.MeshBasicMaterial({ color: 0xfff0a0 }));
    MAT.proj = keepMat(new THREE.MeshBasicMaterial({ map: projTex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    MAT.rainbow = keepMat(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    MAT.face = [faceTex(false), faceTex(true)].map(t => keepMat(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })));
    MAT.zz = keepMat(new THREE.SpriteMaterial({ map: zzTex(), transparent: true, depthWrite: false }));
    MAT.next = keepMat(new THREE.SpriteMaterial({ map: nextStarTex(), transparent: true, depthWrite: false }));
    MAT.bulb = keepMat(new THREE.SpriteMaterial({ map: radialTex('bulb', 'rgba(255,236,170,1)', 'rgba(255,220,150,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    MAT.portal = {}; MAT.halo = {}; MAT.beam = {}; MAT.badge = {};
    for (const d of T.doors) {
      const sw = swirlTex().clone(); sw.repeat.set(0.45, 0.45); sw.needsUpdate = true;
      MAT.portal[d.zone] = keepMat(new THREE.MeshBasicMaterial({ map: sw, color: d.col, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
      MAT.halo[d.zone] = keepMat(new THREE.SpriteMaterial({ map: radialTex('halo', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)'), color: d.col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      MAT.beam[d.zone] = keepMat(new THREE.MeshBasicMaterial({ map: beamTex(), color: d.col, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    }
    MAT.bigHalo = keepMat(new THREE.SpriteMaterial({ map: radialTex('halo', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)'), color: 0xffe08a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    MAT.portalLocked = keepMat(new THREE.MeshBasicMaterial({ map: swirlTex(), color: 0xc4c0d6, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
    MAT.ok = true;
    return MAT;
  }
  const mulberry32 = typeof window.mulberry32 === 'function' ? window.mulberry32 : (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; });

  // ── Görsel kurulum (üreteç: her yield ayrı kareye düşer) ──
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
    const rnd = api.rnd, M = mats(), V = THREE;
    const sph = G.sphere(18, 12), cylG = G.cyl(1, 1, 18), rbox = G.rbox(2), star = starGeo(), torusPI = G.torus(Math.PI, 0.16, 24), ring = G.torus(TAU, 0.12, 28), cone = G.cone(16), hemi = G.hemi(18);
    const add = (o, x, y, z) => { o.position.set(x, y, z); api.add(o); return o; };
    const P = P_(), mask0 = litMask();
    // ── 1) zemin, gök kubbesi, ay, yıldızlar, adanın altındaki bulutlar ──
    if (api.floor) api.floor.visible = false;
    const fl = new V.Mesh(floorGeo(), M.floor); fl.receiveShadow = true; fl.name = 'yuva-zemin'; api.add(fl);
    const sky = new V.Group(); sky.name = 'yuva-gok'; api.add(sky);
    const dome = new V.Mesh(GEO.dome || (GEO.dome = Object.assign(new V.SphereGeometry(80, 32, 16), { userData: { cached: true } })), M.sky);
    dome.renderOrder = -10; dome.frustumCulled = false; sky.add(dome);
    const mkStars = (n, seed, mat) => {
      const key = 'stars' + seed;
      if (!GEO[key]) {
        const r2 = mulberry32(seed), p = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { const u = r2() * 2 - 1, a = r2() * TAU, y = -Math.abs(u) * (r2() < 0.8 ? 1 : -1), s = Math.sqrt(1 - y * y); p[i * 3] = Math.cos(a) * s * 74; p[i * 3 + 1] = y * 74; p[i * 3 + 2] = Math.sin(a) * s * 74; }
        GEO[key] = new V.BufferGeometry(); GEO[key].setAttribute('position', new V.BufferAttribute(p, 3)); GEO[key].userData.cached = true;
      }
      const o = new V.Points(GEO[key], mat); o.frustumCulled = false; o.renderOrder = -9; sky.add(o); return o;
    };
    const st1 = mkStars(520, 11, M.stars), st2 = mkStars(700, 12, M.stars2);
    const moon = new V.Sprite(M.moon); moon.scale.set(11, 11, 1); moon.renderOrder = -8; sky.add(moon);
    const moonDir = new V.Vector3(-0.02, -0.65, -1).normalize().multiplyScalar(66);
    moon.position.copy(moonDir);
    // adanın altında ve çevresinde süzülen pastel bulutlar (tek InstancedMesh)
    if (!GEO.cloud) {
      const k = new Kit(), cols = [0xffffff, 0xfbeeff, 0xeef0ff, 0xffeef6];
      [[0, 0, 0, 1], [0.9, -0.1, 0.2, 0.75], [-0.95, -0.12, 0.1, 0.72], [0.35, 0.35, -0.2, 0.7], [-0.4, 0.3, 0.15, 0.65], [1.6, -0.25, 0, 0.5], [-1.65, -0.25, 0, 0.48]]
        .forEach(([x, y, z, s], i) => k.add(G.sphere(14, 10), cols[i % 4], [x, y, z], null, [s, s * 0.78, s]));
      GEO.cloud = k.build(); GEO.cloud.userData.cached = true;
    }
    const NC = 18, clouds = new V.InstancedMesh(GEO.cloud, M.cloud, NC); clouds.frustumCulled = false; api.add(clouds);
    const cl = [];
    for (let i = 0; i < NC; i++) cl.push({ a: i / NC * TAU + rnd() * 0.2, r: 1.25 + rnd() * 0.6, y: -3.5 - rnd() * 7, s: 1.6 + rnd() * 2.2, sp: (0.008 + rnd() * 0.01) * (i % 2 ? 1 : -1), ph: rnd() * 9 });
    const _m = new V.Matrix4(), _q = new V.Quaternion(), _p = new V.Vector3(), _s = new V.Vector3(), _e = new V.Euler();
    // havada süzülen parıltılar (iki katman, ters yönlere döner)
    const mkMotes = (n, seed, mat) => {
      const key = 'motes' + seed;
      if (!GEO[key]) { const r2 = mulberry32(seed), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = r2() * TAU, d = Math.sqrt(r2()) * 1.05; p[i * 3] = Math.sin(a) * T.rx * d; p[i * 3 + 1] = 0.6 + r2() * 4.5; p[i * 3 + 2] = Math.cos(a) * T.rz * d; } GEO[key] = new V.BufferGeometry(); GEO[key].setAttribute('position', new V.BufferAttribute(p, 3)); GEO[key].userData.cached = true; }
      const o = new V.Points(GEO[key], mat); o.position.set(T.cx, 0, T.cz); o.frustumCulled = false; api.add(o); return o;
    };
    const mo1 = mkMotes(26, 21, M.motes), mo2 = mkMotes(20, 22, M.motes2);   // SADE: az zerrecik
    yield;
    // ── 2) bulut kenarı: üstte tümsekler (güney alçak), altta adayı taşıyan pofuduk bulut kütlesi ──
    const CW = [0xffffff, 0xfdf3ff, 0xf1f2ff, 0xfff1f8, 0xf6f0ff];
    const pc = () => CW[(rnd() * CW.length) | 0];
    const LO = api.G.sphere(16, 10);   // SADE: bulut kenarı topları az üçgenli (üçgen bütçesi; yumuşak bulutta fark edilmez)
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * TAU + rnd() * 0.04, sa = Math.sin(a), ca = Math.cos(a), south = -ca;   // south: 1 = kamera tarafı
      const x = T.cx + sa * T.rx * 1.1, z = T.cz - ca * T.rz * 1.1;
      if (south > 0.35) { const s = 0.7 + rnd() * 0.4; api.put(LO, x, -0.25, z, s * 1.4, s * 0.55, s, pc(), 0, 0, 0, 'decor'); }
      else { const s = 0.85 + rnd() * 0.5 + Math.max(0, -south) * 0.2; api.put(LO, x, -0.05 + rnd() * 0.15, z, s * 1.4, s * 0.7, s, pc(), 0, 0, 0, 'decor'); }
    }
    for (let i = 0; i < 44; i++) {   // ikinci, dış sıra (biraz aşağıda)
      const a = (i + 0.5) / 44 * TAU, ca = Math.cos(a), x = T.cx + Math.sin(a) * T.rx * 1.24, z = T.cz - ca * T.rz * 1.24, s = 1.4 + rnd() * 1.1;
      api.put(LO, x, -1.1 - rnd() * 0.4, z, s * 1.3, s * 0.8, s, pc(), 0, 0, 0, 'decor');
    }
    for (let i = 0; i < 14; i++) {   // alt karın: ada havada yüzüyor
      const a = rnd() * TAU, d = 0.35 + rnd() * 0.75, x = T.cx + Math.sin(a) * T.rx * d, z = T.cz - Math.cos(a) * T.rz * d, s = 2.2 + rnd() * 1.6;
      api.put(LO, x, -2.4 - (1 - d) * 2.2 - rnd(), z, s * 1.3, s * 0.85, s, pc(), 0, 0, 0, 'decor');
    }
    yield;
    // ── 3) rüya kapıları: bulut sütunlu kemer, içinde süzülen yıldızlar, üstünde bölüm rozeti ──
    const doorFx = [];
    const next = T.doors.find(d => (typeof ZONE_DEFS === 'undefined' || ZONE_DEFS[d.zone]) && !done(d.zone) && open(d.zone));
    for (const d of T.doors) {
      if (typeof ZONE_DEFS !== 'undefined' && !ZONE_DEFS[d.zone]) continue;
      const ok = open(d.zone), fin = done(d.zone), c = ok ? d.col : new THREE.Color(d.col).lerp(new THREE.Color(0xd8d4e6), 0.6).getHex(), c2 = ok ? d.col2 : 0xeceaf3;   // kilitli kapı soluk ama kendi renginde
      const yaw = Math.atan2(T.cx - d.x, T.cz - d.z), ux = Math.cos(yaw), uz = -Math.sin(yaw);
      for (const sd of [-1, 1]) {
        const px = d.x + ux * 1.45 * sd, pz = d.z + uz * 1.45 * sd;
        api.cyl(px, 1.2, pz, 0.24, 2.4, c2);
        for (const y of [0.55, 1.35, 2.1]) api.put(ring, px, y, pz, 0.27, 0.27, 0.27, c, 0, Math.PI / 2, 0);
        api.ball(px, 0.25, pz, 0.62, 0.42, 0.62, 0xffffff, 'decor'); api.ball(px + ux * 0.35 * sd, 0.15, pz + uz * 0.35 * sd, 0.45, 0.3, 0.45, 0xfdf3ff, 'decor');
      }
      api.put(torusPI, d.x, 2.4, d.z, 1.45, 1.45, 1.45, c2, yaw);
      api.put(G.torus(Math.PI, 0.1, 24), d.x, 2.4, d.z, 1.2, 1.2, 1.4, c, yaw, 0, 0, ok ? 'glow' : 'shiny');
      for (const [ox, oy, s] of [[0, 3.95, 0.62], [-0.85, 3.65, 0.5], [0.85, 3.65, 0.5], [-1.5, 2.6, 0.42], [1.5, 2.6, 0.42]])
        api.ball(d.x + ux * ox, oy, d.z + uz * ox, s * 1.25, s, s, 0xffffff, 'decor');
      const pm = new V.Mesh(archShape(), ok ? M.portal[d.zone] : M.portalLocked); pm.rotation.y = yaw; pm.renderOrder = 2; add(pm, d.x, 0.02, d.z);
      // GÜZEL: kemerin üstünde diyarın 3B simgesi (rozet yerine); kilitliyse soluk
      const bd = new V.Mesh(symbolGeo(d.zone, !ok), M.toy); bd.rotation.y = yaw; bd.scale.setScalar(1.25); add(bd, d.x, 4.75, d.z);
      bd.castShadow = false;
      let zz = null, fc = null;
      if (!ok) {   // kilitli kapı uyuyor: kapanık gözlü yüz ve süzülen "z"
        fc = new V.Mesh(faceGeo(), M.face[0]); fc.rotation.y = yaw; fc.renderOrder = 3; add(fc, d.x + Math.sin(yaw) * 0.06, 1.45, d.z + Math.cos(yaw) * 0.06);
        zz = new V.Sprite(M.zz); zz.scale.set(0.55, 0.55, 1); add(zz, d.x + ux * 0.9, 3.0, d.z + uz * 0.9);
      }
      if (ok) { api.glow(d.x, d.z + 0.6, 2.6, d.col, 0.26); api.light(d.x, 2.2, d.z + 1.2, d.col, 1.6, 6); }
      if (fin) api.put(star, d.x + ux * 0.8, 5.55, d.z + uz * 0.8, 0.3, 0.3, 0.3, 0xffe066, yaw, 0, 0, 'glow');   // GÜZEL: bitmiş kapı: simgenin yanında küçük altın yıldız
      doorFx.push({ bd, ph: rnd() * 6, ok, d, pm, zz, zx: d.x + ux * 0.9, zz0: d.z + uz * 0.9 });
    }
    let nextStar = null;
    if (next) { nextStar = new V.Sprite(M.next); nextStar.scale.set(1.2, 1.2, 1); add(nextStar, next.x, 6, next.z); }
    for (const z of T.doors) if (M.portal[z.zone]) M.portal[z.zone].map.offset.set(0, 0);
    yield;
    // ── 4) Işık Çemberi: 5 kaide, ortada büyük yıldız; 5'i yanınca gökkuşağı ──
    for (const p of T.peds) {
      api.ball(p.x, 0.18, p.z, 0.72, 0.32, 0.72, 0xffffff, 'decor');
      api.put(G.cyl(0.7, 1, 18), p.x, 0.62, p.z, 0.26, 0.8, 0.26, p.col2);
      for (const y of [0.32, 0.92]) api.put(ring, p.x, y, p.z, 0.36, 0.36, 0.36, p.col, 0, Math.PI / 2, 0);
      api.ball(p.x, 1.06, p.z, 0.4, 0.14, 0.4, 0xffffff);
      api.put(ring, p.x, 1.1, p.z, 0.4, 0.4, 0.4, 0xffd77a, 0, Math.PI / 2, 0);
      for (let j = 0; j < 4; j++) { const a = j / 4 * TAU + 0.4; api.put(cone, p.x + Math.sin(a) * 0.36, 1.2, p.z + Math.cos(a) * 0.36, 0.06, 0.18, 0.06, 0xffd77a); }
    }
    const orbs = new V.InstancedMesh(G.sphere(18, 12), M.orb, 5); orbs.frustumCulled = false; api.add(orbs);
    const peds = T.peds.map(p => {
      const halo = new V.Sprite(M.halo[p.zone]); halo.scale.set(2.2, 2.2, 1); add(halo, p.x, 1.55, p.z);
      const beam = new V.Mesh(GEO.beam || (GEO.beam = Object.assign(new V.CylinderGeometry(0.12, 0.3, 4.2, 16, 1, true), { userData: { cached: true } })), M.beam[p.zone]);
      add(beam, p.x, 1.1 + 2.1, p.z);
      api.light(p.x, 1.8, p.z + 0.5, p.col, 0, 5);
      const lt = api.B.lights[api.B.lights.length - 1];
      if (mask0 & (1 << p.i)) api.glow(p.x, p.z, 1.6, p.col, 0.3);
      return Object.assign({ halo, beam, lt, k: 0, flash: 0, c: new V.Color(p.col).multiplyScalar(1.15), c0: new V.Color(0xd8d0f0) }, p);
    });
    for (const p of peds) { orbs.setColorAt(p.i, p.c0); orbs.setMatrixAt(p.i, _m.makeTranslation(p.x, 1.45, p.z)); }   // (renk özniteliği derlemeden önce olsun)
    const bigStar = new V.Mesh(star, M.glowStar); bigStar.castShadow = true; add(bigStar, T.ring.x, 1.6, T.ring.z - 1.1);
    const bigHalo = new V.Sprite(M.bigHalo); bigHalo.scale.set(3, 3, 1); add(bigHalo, T.ring.x, 1.6, T.ring.z - 1.1);
    for (let j = 0; j < 7; j++) { const a = j / 7 * TAU; api.ball(T.ring.x + Math.sin(a) * 0.55, 0.16, T.ring.z - 1.1 + Math.cos(a) * 0.5, 0.42, 0.26, 0.42, j % 2 ? 0xffffff : 0xfdf0ff, 'decor'); }   // bulut yuvacığı
    api.put(ring, T.ring.x, 0.3, T.ring.z - 1.1, 0.55, 0.55, 0.55, 0xffd77a, 0, Math.PI / 2, 0);
    // gökkuşağı (yalnız 5 ışık yanınca görünür)
    if (!GEO.rainbow) {
      const k = new Kit(), RB = [0xff8fa8, 0xffb878, 0xffe27a, 0x9be89a, 0x8fd0ff, 0xb59cff];
      RB.forEach((c, i) => k.add(G.torus(Math.PI, 0.05, 40), c, [0, 0, 0], null, [3.9 - i * 0.16, 3.9 - i * 0.16, 1]));
      GEO.rainbow = k.build(); GEO.rainbow.userData.cached = true;
    }
    const rainbow = new V.Mesh(GEO.rainbow, M.rainbow); rainbow.renderOrder = 3; add(rainbow, T.ring.x, 0, T.ring.z - 4.0);
    api.light(T.ring.x, 3.2, T.ring.z + 0.5, 0xfff0d8, 1.4, 10);
    const centerLt = api.B.lights[api.B.lights.length - 1];
    yield;
    // ── 5) Feza'nın yatağı: başucu, şilte, yıldızlı yorgan, yastıklar, peluş ejderha ve yıldız ──
    const b = T.bed, WOOD = 0xf5d9c2, LAV = 0xc7b4ff;
    for (const [ox, oz] of [[-1.1, -1.6], [1.1, -1.6], [-1.1, 1.6], [1.1, 1.6]]) api.cyl(b.x + ox, 0.2, b.z + oz, 0.13, 0.4, 0xe2b896);
    api.put(rbox, b.x, 0.5, b.z, 2.55, 0.35, 3.55, WOOD);
    api.put(rbox, b.x, 0.82, b.z, 2.35, 0.36, 3.35, 0xfdfbff);
    api.put(rbox, b.x, 1.25, b.z - 1.82, 2.75, 1.6, 0.26, LAV);
    api.put(cylG, b.x, 2.05, b.z - 1.82, 1.37, 0.26, 1.37, LAV, 0, Math.PI / 2, 0);
    api.ball(b.x, 2.3, b.z - 1.66, 0.36, 0.36, 0.1, 0xfff1a8);   // başucunda ay
    api.ball(b.x + 0.14, 2.36, b.z - 1.6, 0.3, 0.3, 0.1, LAV);
    for (const [ox, oy] of [[-0.85, 2.0], [0.8, 2.25], [0.35, 2.7], [-0.45, 2.6]]) api.put(star, b.x + ox, oy, b.z - 1.66, 0.13, 0.13, 0.13, 0xffe27a, 0, 0, 0, 'glow');
    for (const sd of [-1, 1]) api.ball(b.x + sd * 1.38, 2.0, b.z - 1.82, 0.18, 0.18, 0.18, 0xffd77a);
    api.put(rbox, b.x, 0.85, b.z + 1.8, 2.75, 0.85, 0.22, LAV);
    api.put(cylG, b.x, 1.25, b.z + 1.8, 1.37, 0.22, 0.25, LAV, 0, Math.PI / 2, 0);
    api.ball(b.x - 0.45, 1.12, b.z - 1.15, 0.62, 0.24, 0.42, 0xffffff);
    api.ball(b.x + 0.5, 1.1, b.z - 1.1, 0.55, 0.22, 0.38, 0xffd9ea);
    api.put(rbox, b.x, 1.04, b.z - 0.62, 2.42, 0.2, 0.42, 0xfff3fa);   // yorganın katlanmış beyaz kenarı
    const quilt = new V.Mesh(rbox, M.quilt); quilt.scale.set(2.42, 0.2, 2.35); quilt.castShadow = true; quilt.receiveShadow = true; add(quilt, b.x, 1.02, b.z + 0.62);
    // peluş ejderha (lavanta) yastıkta uyuyor + peluş yıldız
    const dx = b.x + 0.55, dz = b.z - 1.05;
    api.ball(dx, 1.36, dz, 0.3, 0.26, 0.34, 0xb9a2ff); api.ball(dx - 0.05, 1.56, dz + 0.22, 0.2, 0.18, 0.2, 0xc4b0ff);
    api.ball(dx - 0.05, 1.52, dz + 0.38, 0.11, 0.08, 0.09, 0xd8cbff);
    for (const sd of [-1, 1]) { api.put(cone, dx - 0.05 + sd * 0.09, 1.74, dz + 0.2, 0.05, 0.12, 0.05, 0xffe27a); api.ball(dx + sd * 0.3, 1.42, dz - 0.05, 0.08, 0.2, 0.22, 0xffc8e8); }
    api.ball(dx + 0.25, 1.22, dz - 0.3, 0.12, 0.1, 0.25, 0xb9a2ff);
    api.put(star, b.x - 0.6, 1.2, b.z + 0.8, 0.26, 0.26, 0.26, 0xffd95a, 0.4, -1.2, 0);
    yield;
    // ── 6) gece lambası (dokun: yere dönen yıldızlar yansıtır) ──
    const lp = T.lamp;
    api.put(rbox, lp.x, 0.45, lp.z, 0.95, 0.9, 0.95, 0xffd3e6);
    api.ball(lp.x, 0.9, lp.z + 0.49, 0.08, 0.08, 0.05, 0xffffff);
    api.put(rbox, lp.x, 0.62, lp.z + 0.48, 0.7, 0.04, 0.02, 0xf2b6d0);
    api.cyl(lp.x, 0.98, lp.z, 0.25, 0.12, 0xfff3d6); api.cyl(lp.x, 1.2, lp.z, 0.05, 0.4, 0xffe3a8);
    const shade = new V.Mesh(hemi, M.shade); shade.scale.set(0.48, 0.5, 0.48); shade.castShadow = true; add(shade, lp.x, 1.38, lp.z);
    api.put(ring, lp.x, 1.39, lp.z, 0.48, 0.48, 0.48, 0xffd77a, 0, Math.PI / 2, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; api.put(star, lp.x + Math.sin(a) * 0.33, 1.62, lp.z + Math.cos(a) * 0.33, 0.06, 0.06, 0.06, 0xffffff, a, 0, 0, 'glow'); }
    const bulb = new V.Sprite(M.bulb); bulb.scale.set(1.6, 1.6, 1); add(bulb, lp.x, 1.5, lp.z);
    const projG = new V.Group(); add(projG, lp.x + 1.4, 0.04, lp.z + 1.6);
    const proj = new V.Mesh(GEO.proj || (GEO.proj = Object.assign(new V.CircleGeometry(4.2, 40), { userData: { cached: true } })), M.proj);
    proj.rotation.x = -Math.PI / 2; proj.renderOrder = 2; projG.add(proj);
    api.light(lp.x, 1.9, lp.z + 0.6, 0xffd9a0, 1.3, 6);
    const lampLt = api.B.lights[api.B.lights.length - 1];
    // ── 7) Pırıl'ın yuvası: örgü sepet, yumuşak minder, yıldızlı battaniye, ejderha yumurtası yastık ──
    const n = T.nest;
    api.cyl(n.x, 0.3, n.z, 1.3, 0.6, 0xdcae78);
    for (const [y, c] of [[0.12, 0xc89662], [0.3, 0xe9c18e], [0.48, 0xc89662], [0.62, 0xf0cf9e]]) api.put(ring, n.x, y, n.z, 1.32, 1.32, 1.32, c, 0, Math.PI / 2, 0);
    api.ball(n.x, 0.62, n.z, 1.15, 0.3, 1.15, 0xcfe2ff);
    api.ball(n.x, 0.74, n.z - 0.15, 0.55, 0.16, 0.45, 0xe8f2ff);
    api.put(rbox, n.x + 0.35, 0.8, n.z + 0.35, 1.1, 0.07, 0.8, 0xffcfe6, 0.5);
    for (const [ox, oz] of [[0.1, 0.3], [0.55, 0.5], [0.45, 0.05]]) api.put(star, n.x + ox, 0.86, n.z + oz, 0.08, 0.08, 0.08, 0xffe27a, 0, -Math.PI / 2, 0);
    api.ball(n.x - 0.65, 0.95, n.z - 0.35, 0.28, 0.38, 0.28, 0xbff0d8);   // yumurta yastık
    for (const [ox, oy] of [[-0.08, 1.05], [0.1, 0.88], [-0.05, 0.78]]) api.ball(n.x - 0.65 + ox, oy, n.z - 0.1, 0.06, 0.06, 0.03, 0xffb3d1);
    api.put(G.torus(Math.PI * 1.3, 0.35, 20), n.x + 0.75, 0.86, n.z - 0.55, 0.32, 0.32, 0.32, 0xfff1a8, 0.3, -1.2, 0);   // ay yastık
    // sepetin üstünde kavisli direk: sallanan ay ve yıldızlar (beşik dönencesi gibi)
    const hz = n.z - 0.75, hy = 3.25;
    api.cyl(n.x - 1.35, 1.25, hz, 0.06, 2.5, 0xffe3a8);
    api.put(G.torus(Math.PI / 2, 0.06, 16), n.x - 0.6, 2.5, hz, 0.75, 0.75, 0.75, 0xffe3a8, 0, 0, Math.PI / 2);
    api.put(cylG, n.x, hy, hz, 0.045, 1.2, 0.045, 0xffe3a8, 0, 0, Math.PI / 2);
    api.ball(n.x + 0.6, hy, hz, 0.08, 0.08, 0.08, 0xffd77a);
    for (const [ox, oy, c, k] of [[-0.45, 2.55, 0xffb3d1, 0.13], [0.05, 2.35, 0xfff1a8, 0], [0.5, 2.6, 0x9be0ff, 0.13]]) {
      api.cyl(n.x + ox, (oy + hy) / 2, hz, 0.012, hy - oy, 0xfff6e0);
      if (k) api.put(star, n.x + ox, oy - 0.1, hz, k, k, k, c, 0, 0, 0, 'glow');
      else api.put(G.torus(Math.PI * 1.35, 0.32, 24), n.x + ox, oy - 0.22, hz, 0.24, 0.24, 0.24, c, 0, 0, 2.3, 'glow');
    }
    api.light(n.x, 2.2, n.z + 0.6, 0xcfe0ff, 1.0, 6);
    yield;
    // ── 8) yıldız çanı (dokun: yıldızlar sallanır ve çalar) ──
    const ch = T.chime;
    api.ball(ch.x, 0.18, ch.z, 0.5, 0.3, 0.5, 0xffffff, 'decor');
    api.cyl(ch.x, 1.45, ch.z, 0.07, 2.9, 0xffe3a8);
    api.put(cylG, ch.x, 2.88, ch.z, 0.06, 2.1, 0.06, 0xffe3a8, 0, 0, Math.PI / 2);
    for (const sd of [-1, 1]) api.ball(ch.x + sd * 1.07, 2.88, ch.z, 0.1, 0.1, 0.1, 0xffd77a);
    api.put(star, ch.x, 3.2, ch.z, 0.22, 0.22, 0.22, 0xffe066, 0, 0, 0, 'glow');
    const BELL = [0xffb3d1, 0xffe27a, 0x9be0ff, 0xc8b4ff, 0xa8f0c0], bells = [];
    BELL.forEach((c, i) => {
      const k = new Kit();
      k.add(G.cyl(1, 1, 6), 0xfff6e0, [0, -0.28, 0], null, [0.012, 0.56, 0.012]);
      k.add(star, c, [0, -0.74, 0], null, 0.22 + (i % 2) * 0.04);
      k.add(G.sphere(8, 6), 0xffffff, [0, -0.95, 0], null, 0.05);
      const geo = k.build(), m = new V.Mesh(geo, M.toy); m.castShadow = true;
      const pv = new V.Group(); pv.add(m); add(pv, ch.x - 0.84 + i * 0.42, 2.84, ch.z);
      bells.push({ pv, amp: 0.05, ph: i * 1.3 });
    });
    // ── 9) yıldız topacı (dokun: hızla döner) ──
    const tp = T.top, topG = new V.Group(); add(topG, tp.x, 0, tp.z);
    {
      const k = new Kit(), RB = [0xff9ab8, 0xffd36e, 0x9be89a, 0x8fd0ff, 0xc2a4ff];
      k.add(cone, 0xffffff, [0, 0.14, 0], [Math.PI, 0, 0], [0.1, 0.28, 0.1]);
      // şeker gibi dilimli gövde: renk açıya göre (gökkuşağı dilimleri), üstte beyaz yıldızlı kuşak
      const slice = (x, y, z) => _c.setHex(RB[((Math.atan2(x, z) / TAU + 1) * 10 | 0) % 5]);
      k.add(G.sphere(40, 20), (x, y, z) => slice(x, y, z).clone(), [0, 0.62, 0], null, [0.62, 0.42, 0.62]);
      k.add(G.torus(TAU, 0.16, 40), 0xffffff, [0, 0.7, 0], [Math.PI / 2, 0, 0], 0.6);
      k.add(G.cyl(1, 1, 10), 0xffe3a8, [0, 1.15, 0], null, [0.06, 0.4, 0.06]);
      k.add(G.sphere(12, 8), 0xffd36e, [0, 1.37, 0], null, 0.11);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(star, 0xffe27a, [Math.sin(a) * 0.62, 0.72, Math.cos(a) * 0.62], [0, a, 0], 0.08); }
      const m = new V.Mesh(k.build(), M.toy); m.castShadow = true; topG.add(m);
    }
    // ── 10) uykucu bulut (dokun: uyanır, kıkırdar, zıplar) ──
    const bl = T.bulut, cloudG = new V.Group(); add(cloudG, bl.x, 0, bl.z);
    {
      const k = new Kit();
      for (const [x, y, z, s] of [[0, 0.62, 0, 0.55], [0.45, 0.5, 0.05, 0.4], [-0.45, 0.5, 0.05, 0.4], [0.2, 0.9, -0.05, 0.38], [-0.22, 0.88, -0.02, 0.36], [0, 0.35, 0.1, 0.42]])
        k.add(G.sphere(16, 12), 0xffffff, [x, y, z], null, [s, s * 0.9, s]);
      for (const sd of [-1, 1]) k.add(G.sphere(10, 8), 0xf4eaff, [sd * 0.25, 0.12, 0.15], null, [0.14, 0.1, 0.16]);
      const m = new V.Mesh(k.build(), M.cloudToy); m.castShadow = true; cloudG.add(m);
    }
    const face = new V.Mesh(GEO.face || (GEO.face = Object.assign(new V.PlaneGeometry(0.72, 0.36), { userData: { cached: true } })), M.face[0]);
    face.position.set(0, 0.64, 0.56); face.rotation.x = -0.35; cloudG.add(face);
    const zz = [0, 1].map(i => { const s = new V.Sprite(M.zz); s.scale.set(0.34, 0.34, 1); add(s, bl.x, 1.3, bl.z); return s; });
    yield;
    // ── 11) istasyon süsleri: Gardırop, Pırıl'ın Köşesi, Çıkartma Albümü, Mini Oyun sandığı ──
    const S = T.st, gx = S.gardirop.x, gz = S.gardirop.z - 1.9;
    api.put(rbox, gx, 1.55, gz, 2.3, 3.0, 1.1, 0xb3cff7);
    api.put(rbox, gx, 3.12, gz, 2.5, 0.22, 1.25, 0x97b8ee);
    api.put(G.box(), gx, 1.55, gz + 0.56, 0.04, 2.6, 0.02, 0x86a6d8);
    for (const sd of [-1, 1]) { api.ball(gx + sd * 0.18, 1.6, gz + 0.58, 0.09, 0.09, 0.09, 0xffd77a); api.cyl(gx + sd * 0.95, 0.06, gz, 0.12, 0.12, 0x97b8ee); }
    api.put(star, gx - 0.6, 2.4, gz + 0.58, 0.22, 0.22, 0.22, 0xfff0a0, 0, 0, 0, 'glow');
    api.ball(gx + 0.6, 2.4, gz + 0.58, 0.2, 0.2, 0.06, 0xfff1a8);
    api.put(torusPI, gx, 3.2, gz, 0.5, 0.5, 0.5, 0xffd77a);
    api.put(star, gx, 3.75, gz, 0.2, 0.2, 0.2, 0xffe066, 0, 0, 0, 'glow');
    api.put(rbox, gx + 1.2, 1.0, gz + 0.3, 0.16, 1.4, 0.7, 0xb784ff, 0.15);   // kapıdan sarkan gece pelerini
    api.put(rbox, gx - 1.25, 1.5, gz + 0.1, 0.1, 1.4, 0.9, 0xdff4ff);   // yan ayna
    api.put(ring, gx - 1.3, 1.5, gz + 0.1, 0.48, 0.72, 0.48, 0xffd77a, Math.PI / 2);
    const vx = S.bilbo.x, vz = S.bilbo.z - 1.9;
    api.put(rbox, vx, 0.55, vz, 1.9, 1.1, 0.9, 0xffc6dd);
    api.put(rbox, vx, 1.12, vz, 2.0, 0.08, 1.0, 0xffe0ee);
    api.put(G.box(), vx, 0.55, vz + 0.46, 1.6, 0.04, 0.02, 0xf2a6c6);
    api.ball(vx, 0.82, vz + 0.47, 0.08, 0.08, 0.05, 0xffd77a); api.ball(vx, 0.3, vz + 0.47, 0.08, 0.08, 0.05, 0xffd77a);
    api.put(cylG, vx, 1.95, vz - 0.3, 0.62, 0.06, 0.62, 0xe6f6ff, 0, Math.PI / 2, 0);
    api.put(ring, vx, 1.95, vz - 0.28, 0.66, 0.66, 0.66, 0xffd77a);
    api.cyl(vx - 0.55, 1.3, vz + 0.1, 0.18, 0.2, 0xffd77a);   // minik taç
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; api.ball(vx - 0.55 + Math.sin(a) * 0.16, 1.45, vz + 0.1 + Math.cos(a) * 0.16, 0.05, 0.05, 0.05, 0xff8fb8); }
    for (const sd of [-1, 1]) api.put(cone, vx + 0.45 + sd * 0.14, 1.24, vz + 0.1, 0.1, 0.22, 0.1, 0xff8fb8, 0, 0, sd * Math.PI / 2);
    api.ball(vx + 0.45, 1.24, vz + 0.1, 0.07, 0.07, 0.07, 0xff6fa0);
    api.put(rbox, vx, 1.22, vz - 0.05, 0.4, 0.12, 0.22, 0x8fe0d0);
    const ax = S.album.x, az = S.album.z - 1.35;
    api.put(rbox, ax, 0.08, az, 2.7, 0.14, 1.85, 0xf49a5a);
    for (const sd of [-1, 1]) {
      api.put(rbox, ax + sd * 0.64, 0.2, az, 1.22, 0.1, 1.65, 0xfffaf0, 0, 0, sd * 0.06);
      for (let i = 0; i < 4; i++) api.put(cylG, ax + sd * 0.64 + (i % 2 ? 0.27 : -0.27), 0.27, az + (i < 2 ? -0.38 : 0.38), 0.2, 0.03, 0.2, [0xff9ab8, 0x8fd0ff, 0xffd36e, 0x9be89a][(i + (sd > 0 ? 2 : 0)) % 4]);
    }
    api.put(cylG, ax, 0.2, az, 0.07, 1.7, 0.07, 0xe07f45, 0, Math.PI / 2, 0);
    const mx = S.mini.x, mz = S.mini.z - 1.7;
    api.put(rbox, mx, 0.42, mz, 1.8, 0.84, 1.2, 0x8fd9a8);
    api.put(rbox, mx, 0.42, mz + 0.61, 1.5, 0.12, 0.02, 0xffffff);
    api.put(rbox, mx, 1.39, mz - 0.84, 1.8, 0.12, 1.2, 0x7cc996, 0, 1.15, 0);
    for (const [ox, oz, c] of [[-0.45, 0, 0xff9ab8], [0.1, 0.15, 0xffd36e], [0.5, -0.1, 0x8fd0ff], [-0.05, -0.25, 0xc2a4ff]]) api.ball(mx + ox, 0.92, mz + oz, 0.26, 0.26, 0.26, c);
    for (const [ox, oy, oz, c] of [[1.35, 0.22, 0.4, 0xff9ab8], [1.35, 0.66, 0.4, 0x8fd0ff], [1.7, 0.22, -0.2, 0xffd36e]]) api.put(rbox, mx + ox, oy, mz + oz, 0.44, 0.44, 0.44, c, 0.3);
    // ── 12) yıldız fenerleri (adanın kenarında; güneydekiler alçak) ──
    for (const a0 of [1.2, 1.7, 2.25, 2.75]) for (const sd of [-1, 1]) {
      const a = a0 * sd, x = T.cx + Math.sin(a) * T.rx * 0.95, z = T.cz - Math.cos(a) * T.rz * 0.95, low = a0 > 2.2, h = low ? 0.75 : 2.0;
      api.ball(x, 0.15, z, 0.4, 0.25, 0.4, 0xffffff, 'decor');
      api.cyl(x, h / 2, z, 0.06, h, 0xfff1d6);
      api.put(star, x, h + 0.28, z, low ? 0.2 : 0.28, low ? 0.2 : 0.28, low ? 0.2 : 0.28, 0xffe9a0, 0, 0, 0, 'glow');
      api.glow(x, z, 1.8, 0xffe2a0, 0.2);
    }
    // başlangıç yolu: iki yanda alçak bulut minderleri, yerde parlayan minik yıldızlar ve ay taşları
    for (const sd of [-1, 1]) {
      const x0 = T.cx + sd * 2.6, z0 = T.cz + 8.6;
      api.ball(x0, 0.2, z0, 0.75, 0.32, 0.6, sd < 0 ? 0xffd6ea : 0xd6e8ff, 'decor'); api.ball(x0 + sd * 0.5, 0.42, z0 - 0.15, 0.42, 0.22, 0.36, 0xffffff, 'decor');
      api.put(star, x0 - sd * 0.15, 0.6, z0 + 0.05, 0.16, 0.16, 0.16, 0xffe27a, 0, -0.9, 0, 'glow');
    }
    for (let i = 0; i < 26; i++) {
      const a = rnd() * TAU, d = 0.25 + Math.sqrt(rnd()) * 0.8, x = T.cx + Math.sin(a) * T.rx * d, z = T.cz + Math.cos(a) * T.rz * d;
      if (Math.hypot(x - T.ring.x, z - T.ring.z) < T.ring.R + 1.8 || Math.abs(x - T.cx) < 1.2) continue;
      api.put(star, x, 0.04, z, 0.1, 0.1, 0.04, i % 3 ? 0xfff0a0 : 0xffc8e6, rnd() * TAU, -Math.PI / 2, 0, 'glow');
    }
    api.glow(T.cx, T.cz, 13, 0xd8c8ff, 0.06);
    api.glow(T.lamp.x + 0.6, T.lamp.z + 0.8, 3.2, 0xffd9a0, 0.22);
    yield;

    // ── 13) Canlandırma ve dokunma ──
    const A = () => (typeof GAME !== 'undefined' && GAME.halaApi) || null;
    const sfx = (k, o) => { const a = A(); if (a) try { a.sfx(k, o); } catch (e) { /* ses yok */ } };
    const burst = (k, x, y, z, o) => { const a = A(); if (a) try { a.burst(k, x, y, z, o || {}); } catch (e) { /* yok */ } };
    const saidT = {};
    const say = (keys, p = 0.45) => {   // oyuncak cümleleri: ilk dokunuşta, sonra ara sıra (kayıt yoksa susar)
      const k = keys[(Math.random() * keys.length) | 0];
      if (typeof AUD === 'undefined' || !AUD.LINES || !AUD.LINES[k] || typeof HUB === 'undefined' || !HUB.say) return;
      if (saidT[keys[0]] && Math.random() > p) return;
      saidT[keys[0]] = 1; try { HUB.say(k, 1); } catch (e) { /* yok */ }
    };
    const toys = [
      { id: 'lamba', x: lp.x, z: lp.z, y: 1.4, r: 1.5, t: 0, cd: 0, on: 0, act() { this.on = 9; sfx('celesta', { vol: 0.6, pitch: 1.5 }); sfx('star', { vol: 0.5 }); burst('glitter', lp.x, 1.6, lp.z, {}); say(['pp_yuva_lamba', 'pr_yuva_lamba']); } },
      { id: 'topac', x: tp.x, z: tp.z, y: 0.7, r: 1.5, t: 0, cd: 0, w: 1.2, act() { this.w = 26; sfx('spin', { vol: 0.8 }); burst('note', tp.x, 1.2, tp.z, {}); this.notes = 6; this.na = 0; say(['pp_yuva_topac']); } },
      { id: 'can', x: ch.x, z: ch.z, y: 2.3, r: 1.5, t: 0, cd: 0, act() { for (const q of bells) q.amp = 0.75; this.notes = 5; this.na = 0; burst('sparkle', ch.x, 2.4, ch.z, {}); say(['pp_yuva_can']); } },
      { id: 'bulut', x: bl.x, z: bl.z, y: 0.8, r: 1.5, t: 0, cd: 0, awake: 0, act() { this.awake = 4.5; this.hop = 0; sfx('bulutPuf', { vol: 0.8 }); sfx('chirp', { vol: 0.6, pitch: 1.3 }); burst('heart', bl.x, 1.2, bl.z, {}); say(['pp_yuva_bulut', 'pr_yuva_bulut']); } },
    ];
    const poke = q => { if (q.cd > 0) return; q.cd = 1.4; q.act(); q.n = (q.n || 0) + 1; };
    DBG.toys = toys;
    // ekrana dokunma: oyuncağın üstüne dokunulursa uzaktan da tepki verir (Feza yine oraya yürür)
    const _v = new V.Vector3(), _o = { x: 0, y: 0, vis: false };
    const onDown = e => {
      try {
        if (typeof GAME === 'undefined' || GAME.state !== 'play' || GAME.paused || (e.button || 0) > 0) return;
        const k = Math.min(innerWidth, innerHeight) / 820;
        for (const q of toys) {
          toScreen(_v.set(q.x, q.y, q.z), _o);
          if (_o.vis && Math.hypot(_o.x - e.clientX, _o.y - e.clientY) < 62 * k) { poke(q); break; }
        }
      } catch (err) { /* dokunma */ }
    };
    const cvs = typeof renderer !== 'undefined' && renderer && renderer.domElement;
    if (cvs) { cvs.addEventListener('pointerdown', onDown); api.dispose({ dispose() { cvs.removeEventListener('pointerdown', onDown); } }); }
    // yanan ışıklar (canlı: test kancası ve kayıt değişince)
    let mask = -1, ignite = [];
    if (seenMask != null) for (let i = 0; i < 5; i++) if ((mask0 & (1 << i)) && !(seenMask & (1 << i))) ignite.push(i);
    seenMask = mask0;
    const MEL = [1, 1.26, 1.5, 1.68, 2, 1.5, 1.26];
    let t = 0, chk = 0, ignT = 0;
    const camPos = typeof camera !== 'undefined' ? camera.position : null;
    api.anim((dt, fx, fz) => {
      t += dt;
      // gök kubbesi kamerayla birlikte gider (sonsuz uzak gibi)
      if (camPos) sky.position.copy(camPos);
      st1.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.3); st2.material.opacity = 0.7 + 0.3 * Math.sin(t * 1.7 + 2);
      mo1.rotation.y = t * 0.018; mo2.rotation.y = -t * 0.024; mo1.position.y = Math.sin(t * 0.5) * 0.25; mo2.position.y = Math.sin(t * 0.4 + 1) * 0.3;
      M.motes.opacity = 0.5 + 0.12 * Math.sin(t * 1.2); M.motes2.opacity = 0.45 + 0.12 * Math.sin(t * 1.0 + 1);
      for (let i = 0; i < NC; i++) {
        const c = cl[i], a = c.a + t * c.sp;
        _p.set(T.cx + Math.sin(a) * T.rx * c.r, c.y + Math.sin(t * 0.3 + c.ph) * 0.4, T.cz - Math.cos(a) * T.rz * c.r);
        _q.setFromEuler(_e.set(0, a, 0)); _s.set(c.s, c.s, c.s); _m.compose(_p, _q, _s); clouds.setMatrixAt(i, _m);
      }
      clouds.instanceMatrix.needsUpdate = true;
      for (const z of T.doors) { const pm = M.portal[z.zone]; if (pm) { pm.map.offset.y = -t * 0.12; pm.map.offset.x = Math.sin(t * 0.3) * 0.1; } }
      for (const q of doorFx) {
        q.bd.position.y = 4.75 + Math.sin(t * 1.6 + q.ph) * 0.1;
        if (q.ok) { const b = 1 + 0.035 * Math.sin(t * 1.8 + q.ph); q.pm.scale.set(b, b, 1); }   // GÜZEL: açık kapı yavaşça nefes alır
        else if (q.zz) { const u = (t * 0.35 + q.ph) % 1; q.zz.position.y = 2.9 + u * 0.9; q.zz.material.opacity = 1; q.zz.scale.setScalar(0.4 + u * 0.3); }   // "z" yükselir
      }
      if (nextStar) { nextStar.position.y = 6.0 + Math.abs(Math.sin(t * 3)) * 0.7; nextStar.material.rotation = Math.sin(t * 2) * 0.2; }
      // ışık kaideleri
      if ((chk -= dt) <= 0) { chk = 0.5; const m2 = litMask(); if (m2 !== mask) { const was = mask; mask = m2; if (was >= 0) for (let i = 0; i < 5; i++) if ((m2 & (1 << i)) && !(was & (1 << i))) peds[i].flash = 1.6; } }
      if (ignite.length && (ignT += dt) > 1.2) { const i = ignite.shift(); ignT = 0.6; peds[i].k = 0; peds[i].flash = 1.6; sfx('isikGeldi', { vol: 0.7 }); burst('sparkle', peds[i].x, 1.8, peds[i].z, { count: 7 }); }
      let nLit = 0;
      for (const p of peds) {
        const on = (mask & (1 << p.i)) && !ignite.includes(p.i);
        if (on) nLit++;
        p.k += ((on ? 1 : 0) - p.k) * Math.min(1, dt * 2.5);
        p.flash = Math.max(0, p.flash - dt);
        const k = p.k, s = 0.2 + 0.13 * k + p.flash * 0.12;
        _p.set(p.x, 1.45 + k * (0.25 + Math.sin(t * 2 + p.i) * 0.08), p.z); _q.identity(); _s.set(s, s, s); _m.compose(_p, _q, _s); orbs.setMatrixAt(p.i, _m);
        _e.set(0, 0, 0); orbs.setColorAt(p.i, _c.copy(p.c0).lerp(p.c, k));
        p.halo.visible = k > 0.02; p.halo.material.opacity = k * (0.42 + 0.12 * Math.sin(t * 2.4 + p.i)) + p.flash * 0.3; p.halo.position.y = _p.y; p.halo.scale.setScalar(1.3 + k * 0.5 + p.flash);
        p.beam.visible = k > 0.02; p.beam.material.opacity = k * (0.2 + 0.08 * Math.sin(t * 1.8 + p.i));
        p.lt.int = k * 1.6 + p.flash;
      }
      orbs.instanceMatrix.needsUpdate = true; if (orbs.instanceColor) orbs.instanceColor.needsUpdate = true;
      const all = nLit >= 5 ? 1 : 0;
      bigStar.rotation.y = t * (0.6 + all * 0.8); bigStar.position.y = 1.5 + all * 1.0 + Math.sin(t * 1.5) * 0.12;
      const bs = 0.32 + nLit * 0.05 + all * 0.25; bigStar.scale.setScalar(bs);
      M.glowStar.color.setRGB(1.0 + all * 0.25, 0.86 + all * 0.18, 0.42 + nLit * 0.04);
      bigHalo.position.y = bigStar.position.y; bigHalo.material.opacity = 0.18 + nLit * 0.05 + all * 0.15; bigHalo.scale.setScalar(1.8 + nLit * 0.2 + all * 0.8);
      rainbow.visible = !!all; M.rainbow.opacity = 0.4 + 0.1 * Math.sin(t * 1.2);
      centerLt.int = 1.2 + nLit * 0.25 + all * 1.2;
      // oyuncaklar: Feza yaklaşınca ya da ekrandan dokununca
      const playing = typeof GAME !== 'undefined' && GAME.state === 'play';
      for (const q of toys) {
        q.cd -= dt;
        const d = Math.hypot(fx - q.x, fz - q.z), inn = playing && d < q.r;
        if (inn && !q.in) poke(q);
        q.in = inn;
      }
      const [tl, tt, tc, tb] = toys;
      // gece lambası: yanınca renk değiştirir, yere dönen yıldızlar
      tl.on = Math.max(0, tl.on - dt);
      const lk = Math.min(1, tl.on / 1.2);
      M.shade.emissiveIntensity = 0.7 + lk * 1.4 + Math.sin(t * 2) * 0.08;
      M.shade.emissive.setHSL(lk > 0 ? (0.1 + t * 0.08) % 1 : 0.1, lk > 0 ? 0.75 : 0.9, 0.6);
      bulb.material.opacity = 0.55 + lk * 0.45; bulb.scale.setScalar(1.5 + lk * 1.2);
      M.proj.opacity = lk * 0.9; projG.visible = lk > 0.01; projG.rotation.y = t * 0.35; projG.position.y = 0.04;
      lampLt.int = 1.1 + lk * 2.4;
      // topaç: dönüş + yalpalama; dönerken nota
      tt.w = Math.max(1.1, tt.w - dt * 4.5);
      topG.rotation.y += tt.w * dt;
      const wob = tt.w > 3 ? 0.06 : 0.12 + Math.sin(t * 0.8) * 0.03;
      topG.rotation.x = Math.sin(t * 3.1) * wob; topG.rotation.z = Math.cos(t * 3.1) * wob;
      // yıldız çanı: sallanma + nota dizisi
      for (const q of bells) { q.amp = Math.max(0.05, q.amp - dt * 0.35); q.pv.rotation.z = Math.sin(t * 3.4 + q.ph) * q.amp; q.pv.rotation.x = Math.sin(t * 2.6 + q.ph * 1.7) * q.amp * 0.5; }
      for (const q of [tt, tc]) if (q.notes > 0 && (q.na -= dt) <= 0) {
        q.na = q === tt ? 0.3 : 0.24; const i = (q === tt ? 6 : 5) - q.notes; q.notes--;
        sfx(q === tt ? 'mbox' : 'celesta', { vol: 0.55, pitch: MEL[i % MEL.length] * (q === tc ? 1.5 : 1) });
        if (q === tc) burst(i % 2 ? 'note' : 'sparkle', ch.x - 0.84 + (i % 5) * 0.42, 2.0, ch.z, { count: 2 });
      }
      // uykucu bulut: nefes alır; uyanınca zıplar, döner, sonra yine uyur
      tb.awake = Math.max(0, tb.awake - dt);
      const aw = tb.awake > 0;
      face.material = M.face[aw ? 1 : 0];
      const br = 1 + Math.sin(t * (aw ? 6 : 1.6)) * (aw ? 0.04 : 0.035);
      if (aw) { const h = Math.abs(Math.sin((4.5 - tb.awake) * 5.2)) * 0.55 * Math.min(1, tb.awake); cloudG.position.y = h; cloudG.rotation.y = (4.5 - tb.awake) < 0.8 ? (4.5 - tb.awake) / 0.8 * TAU : Math.sin(t * 4) * 0.15; }
      else { cloudG.position.y = 0; cloudG.rotation.y = Math.sin(t * 0.5) * 0.12; }
      cloudG.scale.set(br, 2 - br, br);
      zz.forEach((s, i) => { const u = ((t * 0.35 + i * 0.5) % 1); s.visible = !aw; s.position.set(bl.x + 0.35 + Math.sin(u * 6 + i) * 0.15, 1.15 + u * 1.1, bl.z); s.material.opacity = Math.sin(u * Math.PI); s.scale.setScalar(0.22 + u * 0.22); });
    });
  }
  const _c = new THREE.Color();

  return { T, yerlesim, kur, isik(n) { testN = n == null ? null : +n; return litMask(); }, get lit() { return litMask(); }, _dbg: DBG };
})();

BOLUM.define('yuva', {
  ad: 'Uyku Yuvası',
  hub: true,                 // merkez: huysuz ve boss yok; oyun burada başlar, bölüm bitince buraya dönülür
  taban: 'moon',
  size: 64, rooms: 2, side: 0,
  muzik: 'pr_menu',
  huysuzlar: { jole: 1 }, elitler: [],   // (üretici bir liste ister; yerlesim() hepsini siler)
  zemin: { tA: 0xece4fc, tB: 0xe4dcfa, tC: 0xf2ecfe, out: 0x2a2f5a, outAmt: 0.85, macro: 0xf6f2ff },
  isik: { fog: [0x1c2152, 45, 140], hemiSky: 0xdcdcff, hemiGround: 0x6a5a9a, hemi: 0.85, sunColor: 0xeee8ff, sun: 1.25, sunOffset: [9, 26, 13],
    env: [0x2a2f5a, 0x6a5aa8, 0x3a3060, 0.55], bloom: 0.28, exposure: 1.0, sat: 1.08, vig: 0.28 },
  minimap: { zemin: '#e6dcfb' },
  harita: { ad: 'Uyku Yuvası', detay: 'Feza ile Pırıl burada uyur', renk: '#cfcaee', x: 12, y: 30, simge: '🛏️' },
  yerlesim(L, api) { YUVA.yerlesim(L, api); },
  kur(L, api) { return YUVA.kur(L, api); },
  kurSon(L) { if (L.portalObj && L.portalObj.obj) L.portalObj.obj.visible = false; },
});
