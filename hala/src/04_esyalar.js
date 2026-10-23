/* Dev Ev eşyaları: ev temalı silah / şapka / pelerin, eşya setleri (ITEMS.register, src/04_feza.js).
   Silah: tutma yeri orijinde, +Y ucu, g.fzTip uçta. Şapka: baş merkezi orijin (saç ~0,31 m yukarı), g.fzHatIn saçı içeri alır.
   Pelerin: ITEMS.paintCape(id, painter) — 256×256 doku, üst = omuzlar; alt kenar biçimi burada, altı saydam (alphaTest 0,5).
   Her eşya az çizim çağrısı: parçalar Kit ile birleştirilir, geometri ve malzemeler önbellekte (geoC / mat). */
(function () {
  'use strict';
  if (typeof ITEMS === 'undefined' || !ITEMS.register) return;
  const K = ITEMS.KIT;
  const { THREE, G, Kit, kitGeo, geoC, mat, vcMat, glowMat, glowVC, rimify, tex, sweep, lathe, curvePts, flatGeo, starShape, starGeo,
    v3, V2, rarCol, mulberry32, TAU, feltMat } = K;
  const PI = Math.PI;
  const cl = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lp = (a, b, t) => a + (b - a) * t;
  const ss = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fr = x => x - Math.floor(x);
  const C = h => new THREE.Color(h);
  // wood grain: darker streaks running along the piece (by the angle round it), a few knots by height
  const WD = hex => { const b = C(hex), d = C(hex).multiplyScalar(0.7).lerp(C('#8a4a1c'), 0.15);
    return (x, y, z) => { const a = Math.atan2(x, z), n = 0.5 + 0.5 * Math.sin(a * 6 + 2.1 * Math.sin(y * 21 + a * 3) + y * 9); return b.clone().lerp(d, Math.pow(n, 3) * 0.85); }; };
  const kcyl = (k, y0, y1, r0, r1, col, seg = 24) => k.add(G.cyl(r1 / r0, 1, seg), col, [0, (y0 + y1) / 2, 0], 0, [r0, y1 - y0, r0]);

  // ── Ortak malzemeler (nadirlik ≥ 2: renkli kenar ışığı) ──
  const rk = r => (r >= 2 ? r : 0);
  const rimR = (m, r) => (rk(r) ? rimify(m, rarCol(r), r === 3 ? 0.62 : 0.42, 2.3) : rimify(m, 0xffffff, 0.14));
  const M = {
    wood: r => mat('ez:wood|' + rk(r), () => { const t = tex('fabric'), m = vcMat({ roughness: 0.48, normalMap: t ? t.normalMap : null, normalScale: V2(0.12, 0.12), envMapIntensity: 0.85 }); return rimR(m, r); }),
    gloss: r => mat('ez:gloss|' + rk(r), () => rimR(vcMat({ roughness: 0.24, metalness: 0.02, envMapIntensity: 1.0 }), r)),
    soft: r => mat('ez:soft|' + rk(r), () => rimR(vcMat({ roughness: 0.62, envMapIntensity: 0.75 }), r)),
    shell: r => mat('ez:shell|' + rk(r), () => rimR(vcMat({ roughness: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.8 }), r)),
    metal: r => mat('ez:metal|' + rk(r), () => { const t = tex('metal'); return rimR(vcMat({ metalness: 1, roughness: 0.27, map: t ? t.map : null, normalMap: t ? t.normalMap : null, normalScale: V2(0.25, 0.25), envMapIntensity: 1.1, side: THREE.DoubleSide }), r); }),
    glow: (key, k) => glowVC('ez:glow:' + key, k, { roughness: 0.3 }),
    light: (col, I) => mat('ez:light:' + col + ':' + I, () => glowMat(col, I)),
    halo: (col, op) => mat('ez:halo:' + col + ':' + op, () => glowMat(col, 1.4, { transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })),
  };
  const mesh = (g, geo, m, pos, rot, noShadow) => {
    const o = new THREE.Mesh(geo, m);
    if (pos) o.position.set(pos[0], pos[1], pos[2]);
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    if (noShadow) { o.userData.noShadow = true; o.userData.noXray = true; }
    g.add(o); return o;
  };
  const tipAt = (g, x, y, z) => { const t = new THREE.Object3D(); t.position.set(x, y, z); g.add(t); g.fzTip = t; return t; };
  // u, v ∈ [0,1] parametrik yüzey (yumurta kabuğu, kalıplar)
  function surf(fn, nu, nv) {
    const pos = [], uv = [], idx = [], p = v3();
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { fn(i / nu, j / nv, p); pos.push(p.x, p.y, p.z); uv.push(i / nu, j / nv); }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // a quaternion turning +y to the direction n
  const qUp = n => new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), n.clone().normalize());
  // a shape path (closed) of a rounded rectangle / heart, for extrusions and holes
  function rrect(p, x, y, w, h, rr) {
    p.moveTo(x + rr, y); p.lineTo(x + w - rr, y); p.quadraticCurveTo(x + w, y, x + w, y + rr); p.lineTo(x + w, y + h - rr);
    p.quadraticCurveTo(x + w, y + h, x + w - rr, y + h); p.lineTo(x + rr, y + h); p.quadraticCurveTo(x, y + h, x, y + h - rr);
    p.lineTo(x, y + rr); p.quadraticCurveTo(x, y, x + rr, y); return p;
  }
  function heartPath(p, w, cx, cy) {
    p.moveTo(cx, cy - 0.5 * w);
    p.bezierCurveTo(cx + 0.14 * w, cy - 0.32 * w, cx + 0.52 * w, cy - 0.08 * w, cx + 0.5 * w, cy + 0.18 * w);
    p.bezierCurveTo(cx + 0.48 * w, cy + 0.46 * w, cx + 0.16 * w, cy + 0.56 * w, cx, cy + 0.3 * w);
    p.bezierCurveTo(cx - 0.16 * w, cy + 0.56 * w, cx - 0.48 * w, cy + 0.46 * w, cx - 0.5 * w, cy + 0.18 * w);
    p.bezierCurveTo(cx - 0.52 * w, cy - 0.08 * w, cx - 0.14 * w, cy - 0.32 * w, cx, cy - 0.5 * w);
    return p;
  }
  // a little wrapped candy (body + two twisted ends) along x
  function candy(k, p, s, col, col2) {
    k.add(G.sphere(16), col, p, 0, [s * 1.25, s, s]);
    for (const sd of [-1, 1]) k.add(G.cone(10), col2 || col, [p[0] + sd * s * 1.7, p[1], p[2]], [0, 0, sd * PI / 2], [s * 0.85, s * 0.9, s * 0.85]);
  }
  // sprinkles over a sphere-ish blob
  function sprinkles(k, n, seed, at) {
    const R = mulberry32(seed), SP = ['#ff5a7a', '#ffd23f', '#5ac8ff', '#7be07a', '#b27bff', '#ffffff'];
    for (let i = 0; i < n; i++) { const p = at(R); if (p) k.add(G.capsule(1, 6), SP[i % 6], p, [R() * 3, R() * 3, R() * 3], [0.0042, 0.0055, 0.0042]); }
  }
  // a cute face (eyes, cheeks, smile) on a +z facing surface at (x, y, z), size s
  function face(k, x, y, z, s) {
    for (const sd of [-1, 1]) {
      k.add(G.sphere(12), '#3a2418', [x + sd * s * 0.42, y + s * 0.1, z], 0, [s * 0.13, s * 0.17, s * 0.06]);
      k.add(G.sphere(8), '#ffffff', [x + sd * s * 0.42 + s * 0.04, y + s * 0.17, z + s * 0.04], 0, s * 0.045);
      k.add(G.sphere(12), '#ff8fae', [x + sd * s * 0.68, y - s * 0.16, z - s * 0.01], 0, [s * 0.16, s * 0.1, s * 0.04]);
    }
    k.add(G.torus(PI * 0.8, 0.28, 14), '#3a2418', [x, y - s * 0.12, z], [0, 0, -PI * 0.9], s * 0.2);
  }

  ITEMS.clearBases();

  // ════════════════════════ SİLAHLAR (savaşçı) ════════════════════════
  const W = (def, build) => ITEMS.register('weapon', def, build);

  // Tahta Kaşık Kılıç — başlangıç: tahta kaşık, kırmızı-beyaz kurdele sargılı sap, küçük tahta balçak
  W({ id: 'kasik', ad: 'Tahta Kaşık Kılıç', minLvl: 0, set: 'pastaci', col: '#ffcf8a' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:kasik:wood', () => kitGeo(k => {
      const w = WD('#eab47a');
      kcyl(k, -0.11, 0.34, 0.022, 0.017, w, 18);
      k.add(G.sphere(18), w, [0, -0.11, 0], 0, [0.027, 0.02, 0.027]);
      k.add(G.capsule(1, 14), WD('#d99a5c'), [0, 0.095, 0], [0, 0, PI / 2], [0.019, 0.05, 0.019]);     // balçak
      k.add(G.sphere(32), w, [0, 0.445, -0.004], 0, [0.07, 0.1, 0.026]);                               // kaşık çanağı
      k.add(G.sphere(32), WD('#c98446'), [0, 0.442, 0.009], 0, [0.058, 0.086, 0.018]);                 // çanağın içi
      k.seg([0, 0.32, 0.002], [0, 0.36, 0.008], 0.0165, w, 0.015, 14);
      k.add(G.torus(TAU, 0.35, 16), '#b87a42', [0, -0.08, 0.0], 0, 0.012);   // asma deliği
      k.add(flatGeo(heartPath(new THREE.Shape(), 1, 0, 0), 0.1, 0.02), '#9a5a2c', [0, 0.23, 0.018], 0, [0.024, 0.024, 0.03]);   // yakılmış kalp
    })), M.wood(r));
    mesh(g, geoC('ez:kasik:ribbon', () => kitGeo(k => {
      for (let i = 0; i < 7; i++) k.add(G.torus(TAU, 0.22, 20), i & 1 ? '#ffffff' : '#ff4f5e', [0, -0.06 + i * 0.022, 0], [PI / 2 + 0.25, 0, 0], 0.0235);
      k.add(G.sphere(14), '#ffd23f', [0, 0.095, 0.019], 0, [0.014, 0.014, 0.009]);
    })), M.gloss(r));
    tipAt(g, 0, 0.545, 0);
    return g;
  });

  // Oklava: ahşap merdane, mavi boyalı halkalar, un serpintisi
  W({ id: 'oklava', ad: 'Oklava', minLvl: 1, col: '#ffe2b0' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:oklava:wood', () => kitGeo(k => {
      kcyl(k, -0.1, 0.075, 0.017, 0.021, WD('#e9b57a'), 16);
      k.add(G.sphere(18), '#e3a96b', [0, -0.11, 0], 0, [0.027, 0.024, 0.027]);
      kcyl(k, 0.075, 0.1, 0.014, 0.014, '#d79c5e', 16);
      kcyl(k, 0.1, 0.44, 0.047, 0.047, WD('#f2c792'), 40);
      for (const y of [0.1, 0.44]) k.add(G.sphere(28), '#f2c792', [0, y, 0], 0, [0.047, 0.012, 0.047]);
      kcyl(k, 0.44, 0.465, 0.014, 0.014, '#d79c5e', 16);
      kcyl(k, 0.465, 0.58, 0.021, 0.017, WD('#e9b57a'), 16);
      k.add(G.sphere(18), '#e3a96b', [0, 0.59, 0], 0, [0.027, 0.024, 0.027]);
    })), M.wood(r));
    mesh(g, geoC('ez:oklava:paint', () => kitGeo(k => {
      for (const y of [0.13, 0.145, 0.395, 0.41]) k.add(G.torus(TAU, 0.08, 40), '#3f8fe8', [0, y, 0], [PI / 2, 0, 0], 0.0472);
      for (const y of [0.25, 0.29]) k.add(G.torus(TAU, 0.07, 40), '#ff6f8e', [0, y, 0], [PI / 2, 0, 0], 0.0472);
      const R = mulberry32(31);
      for (let i = 0; i < 26; i++) {   // un serpintisi
        const a = R() * TAU, y = 0.11 + R() * 0.32;
        k.add(G.sphere(8), '#ffffff', [Math.sin(a) * 0.047, y, Math.cos(a) * 0.047], [0, a, 0], [0.006 + R() * 0.006, 0.004 + R() * 0.004, 0.0025]);
      }
    })), M.soft(r));
    tipAt(g, 0, 0.6, 0);
    return g;
  });

  // Spatula: nane yeşili sap, çelik boyun, delikli mercan rengi silikon uç
  W({ id: 'spatula', ad: 'Spatula', minLvl: 2, col: '#ff8a6a' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:spatula:plastic', () => kitGeo(k => {
      k.add(G.capsule(1, 16), '#6fd6b8', [0, 0.04, 0], 0, [0.022, 0.105, 0.016]);
      k.add(G.torus(TAU, 0.3, 20), '#5cc4a6', [0, -0.09, 0], 0, [0.016, 0.016, 0.016]);
      for (let i = 0; i < 4; i++) k.add(G.sphere(10), '#ffffff', [0, -0.02 + i * 0.035, 0.016], 0, [0.007, 0.007, 0.004]);
      // delikli silikon uç
      const s = rrect(new THREE.Shape(), -0.06, 0, 0.12, 0.16, 0.03);
      for (const x of [-0.03, 0, 0.03]) s.holes.push(rrect(new THREE.Path(), x - 0.008, 0.035, 0.016, 0.09, 0.008));
      k.add(flatGeo(s, 0.008, 0.004), '#ff7f66', [0, 0.27, 0]);
      k.add(G.sphere(12), '#ff7f66', [0, 0.27, 0], 0, [0.03, 0.02, 0.011]);
    })), M.gloss(r));
    mesh(g, geoC('ez:spatula:steel', () => kitGeo(k => {
      kcyl(k, 0.15, 0.17, 0.02, 0.018, '#e8edf4', 20);
      k.seg([0, 0.17, 0], [0, 0.275, 0.004], 0.0085, '#e8edf4', 0.012, 12);
    })), M.metal(r));
    tipAt(g, 0, 0.44, 0);
    return g;
  });

  // Çatal Işın Kılıcı: çelik çatal, dişleri ışın kılıcı gibi parlıyor
  W({ id: 'catal', ad: 'Çatal Işın Kılıcı', minLvl: 3, set: 'kahvalti', col: '#7fe8ff' }, r => {
    const g = new THREE.Group(), TX = [-0.036, -0.012, 0.012, 0.036];
    mesh(g, geoC('ez:catal:steel', () => kitGeo(k => {
      k.add(G.capsule(1, 16), '#e6ebf2', [0, 0.02, 0], 0, [0.022, 0.1, 0.012]);
      k.add(G.sphere(20), '#e6ebf2', [0, -0.1, 0], 0, [0.03, 0.03, 0.013]);
      k.seg([0, 0.12, 0], [0, 0.2, 0], 0.012, '#e6ebf2', 0.016, 14);
      k.add(G.sphere(20), '#e6ebf2', [0, 0.215, 0], 0, [0.05, 0.03, 0.013]);
      for (const x of TX) k.seg([x * 0.8, 0.21, 0], [x, 0.255, 0], 0.008, '#e6ebf2', 0.0075, 10);
    })), M.metal(r));
    mesh(g, geoC('ez:catal:gem', () => kitGeo(k => {
      k.add(flatGeo(heartPath(new THREE.Shape(), 1, 0, 0), 0.4, 0.06), '#ff5fa2', [0, -0.1, 0.012], 0, [0.03, 0.03, 0.02]);
      for (let i = 0; i < 3; i++) k.add(G.sphere(10), '#7fe8ff', [0, -0.03 + i * 0.045, 0.011], 0, [0.007, 0.007, 0.004]);
    })), M.glow('catalGem', 0.55));
    mesh(g, geoC('ez:catal:tines', () => kitGeo(k => {
      for (const x of TX) { k.add(G.cyl(1, 1, 10), 0xffffff, [x, 0.36, 0], 0, [0.0075, 0.22, 0.0075]); k.add(G.sphere(10), 0xffffff, [x, 0.47, 0], 0, 0.0075); }
    })), M.light('#7eeaff', 2.3 + 0.2 * r), null, null, true);
    mesh(g, geoC('ez:catal:halo', () => kitGeo(k => {
      for (const x of TX) { k.seg([x, 0.255, 0], [x, 0.47, 0], 0.016, 0xffffff, 0.016, 12); k.add(G.sphere(12), 0xffffff, [x, 0.47, 0], 0, 0.016); }
    })), M.halo('#4fd8ff', 0.4), null, null, true);
    tipAt(g, 0, 0.48, 0);
    return g;
  });

  // Kepçe: çelik kepçe, kırmızı tutacak, içinde yıldız şehriyeli çorba
  W({ id: 'kepce', ad: 'Kepçe', minLvl: 4, col: '#ffb347' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:kepce:steel', () => kitGeo(k => {
      k.add(G.capsule(1, 14), '#e8edf4', [0, 0.2, 0], 0, [0.014, 0.17, 0.009]);
      k.add(G.torus(TAU, 0.28, 20), '#e8edf4', [0, -0.11, 0], 0, [0.022, 0.022, 0.022]);
      k.add(G.hemi(40), '#e8edf4', [0, 0.465, 0], [-PI / 2, 0, 0], [0.092, 0.092, 0.075]);
      k.add(G.torus(TAU, 0.07, 56), '#f6f9fc', [0, 0.465, 0], 0, 0.092);
    })), M.metal(r));
    mesh(g, geoC('ez:kepce:soup', () => kitGeo(k => {
      k.add(G.capsule(1, 16), '#ff4f5e', [0, -0.03, 0], 0, [0.02, 0.07, 0.014]);
      for (let i = 0; i < 3; i++) k.add(G.torus(TAU, 0.18, 20), '#ffffff', [0, -0.065 + i * 0.03, 0], [PI / 2, 0, 0], [0.0205, 0.0205, 0.015]);
      k.add(G.cyl(1, 1, 40), '#ffa040', [0, 0.465, -0.022], [PI / 2, 0, 0], [0.083, 0.004, 0.083]);
      const R = mulberry32(9), sg = starGeo(1, 0.4);
      for (let i = 0; i < 9; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 0.06; k.add(sg, '#ffe36a', [Math.sin(a) * d, 0.465 + Math.cos(a) * d, -0.018], [0, 0, R() * 2], 0.011); }
      k.add(G.sphere(10), '#7bd06a', [0.03, 0.488, -0.018], 0, [0.009, 0.009, 0.004]);
      k.add(G.sphere(10), '#ff7f50', [-0.035, 0.44, -0.018], 0, [0.01, 0.008, 0.004]);
    })), M.gloss(r));
    tipAt(g, 0, 0.56, 0);
    return g;
  });

  // Şeker Kamışı Kılıcı: kırmızı-beyaz sarmal çizgili kamış, nane yeşili fiyonk
  W({ id: 'sekerkamisi', ad: 'Şeker Kamışı Kılıcı', minLvl: 5, set: 'sekerci', col: '#ff5a6e' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:kamis', () => {
      const P = [], cx = -0.06, cy = 0.4, RR = 0.06;
      for (let i = 0; i <= 40; i++) P.push(v3(0, lp(-0.11, cy, i / 40), 0));
      for (let i = 1; i <= 30; i++) { const a = i / 30 * PI * 1.18; P.push(v3(cx + Math.cos(a) * RR, cy + Math.sin(a) * RR, 0)); }
      const L = [0]; for (let i = 1; i < P.length; i++) L[i] = L[i - 1] + P[i].distanceTo(P[i - 1]);
      const Mm = 16, geo = sweep(P, P.map(() => v3(0, 0, 1)), t => (t > 0.985 ? 0.022 * Math.sqrt(Math.max(0.05, (1 - t) / 0.015)) : 0.022), t => (t > 0.985 ? 0.022 * Math.sqrt(Math.max(0.05, (1 - t) / 0.015)) : 0.022), Mm, 1, (t, c) => c.setRGB(1, 1, 1), null);
      const col = geo.attributes.color, red = C('#ff2e45'), wht = C('#fff8f4'), grn = C('#5fd38a');
      for (let i = 0; i < P.length; i++) for (let j = 0; j <= Mm; j++) {
        const s = fr(L[i] / L[L.length - 1] * 11 + j / Mm), c = s < 0.46 ? red : wht;
        col.setXYZ(i * (Mm + 1) + j, c.r, c.g, c.b);
      }
      geo.deleteAttribute('aFlex');
      // alt uç: yuvarlak kapak
      return geo;
    }), M.gloss(r));
    mesh(g, geoC('ez:kamis:bow', () => kitGeo(k => {
      k.add(G.sphere(20), '#ff2e45', [0, -0.11, 0], 0, [0.022, 0.012, 0.022]);
      k.add(G.sphere(16), '#47c98a', [0, 0.1, 0.02], 0, [0.016, 0.016, 0.012]);
      for (const sd of [-1, 1]) {
        k.add(G.torus(TAU, 0.35, 20), '#5fe0a0', [sd * 0.034, 0.108, 0.016], [0, 0, sd * 0.35], [0.026, 0.017, 0.014]);
        k.seg([sd * 0.006, 0.096, 0.02], [sd * 0.024, 0.05, 0.022], 0.007, '#47c98a', 0.005, 8);
      }
    })), M.gloss(r));
    tipAt(g, -0.06, 0.465, 0);
    return g;
  });

  // Tırtıklı Ekmek Bıçağı: kalın, yuvarlak uçlu oyuncak bıçak — mavi plastik ağız, kalp delikli, mor puantiyeli sap
  W({ id: 'ekmekbicagi', ad: 'Tırtıklı Ekmek Bıçağı', minLvl: 6, col: '#8fd8ff' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:bicak', () => kitGeo(k => {
      const s = new THREE.Shape(), Lb = 0.33, xs = -0.03, xe = 0.034;
      s.moveTo(xs, 0); s.lineTo(xs, Lb - 0.02);
      s.quadraticCurveTo(xs, Lb + 0.035, (xs + xe) / 2 + 0.006, Lb + 0.035); s.quadraticCurveTo(xe + 0.004, Lb + 0.03, xe, Lb - 0.025);
      const n = 9; for (let i = 0; i < n; i++) { const y0 = Lb - 0.025 - i * (Lb - 0.05) / n, y1 = y0 - (Lb - 0.05) / n; s.quadraticCurveTo(xe + 0.016, (y0 + y1) / 2, xe, y1); }
      s.lineTo(xe, 0); s.lineTo(xs, 0);
      s.holes.push(heartPath(new THREE.Path(), 0.034, 0.002, 0.07));
      k.add(flatGeo(s, 0.012, 0.005), '#8fd8ff', [0, 0.11, 0]);
      for (const [x, y] of [[-0.012, 0.29], [0.012, 0.24], [-0.01, 0.19], [0.012, 0.36]]) k.add(G.sphere(12), '#ffffff', [x, y + 0.03, 0.0115], 0, [0.006, 0.006, 0.003]);
      k.add(G.capsule(1, 16), '#ffd23f', [0, 0.1, 0], [0, 0, PI / 2], [0.018, 0.05, 0.022]);   // kalın balçak
      k.add(G.capsule(1, 16), '#9b7bff', [0, 0.005, 0], 0, [0.024, 0.07, 0.02]);
      k.add(G.sphere(20), '#ffd23f', [0, -0.1, 0], 0, [0.03, 0.026, 0.026]);
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) k.add(G.sphere(10), '#ffe36a', [sd * 0.012 * (i & 1 ? 0 : 1), -0.05 + i * 0.03, 0.019 * sd], 0, [0.0055, 0.0055, 0.003]);
    })), M.gloss(r));
    tipAt(g, 0, 0.47, 0);
    return g;
  });

  // Dondurma Kaşığı: pembe saplı çelik top kaşığı, içinde çikolata parçacıklı çilekli dondurma topu
  W({ id: 'dondurmakasigi', ad: 'Dondurma Kaşığı', minLvl: 7, col: '#ffb3d1' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:dkasik:grip', () => kitGeo(k => {
      k.add(G.capsule(1, 18), '#ff8fbd', [0, 0.03, 0], 0, [0.025, 0.12, 0.022]);
      for (let i = 0; i < 5; i++) k.add(G.torus(TAU, 0.16, 24), '#ff6fa8', [0, -0.05 + i * 0.035, 0], [PI / 2, 0, 0], [0.0255, 0.0255, 0.0225]);
      k.add(G.sphere(16), '#ffffff', [0, -0.13, 0.0], 0, [0.016, 0.012, 0.014]);
    })), M.gloss(r));
    mesh(g, geoC('ez:dkasik:steel', () => kitGeo(k => {
      kcyl(k, 0.17, 0.19, 0.022, 0.02, '#e8edf4', 20);
      k.seg([0, 0.19, 0], [0, 0.31, 0], 0.012, '#e8edf4', 0.014, 14);
      k.add(G.hemi(40), '#e8edf4', [0, 0.37, 0], [-PI / 2, 0, 0], [0.066, 0.066, 0.055]);
      k.add(G.torus(TAU, 0.08, 56), '#f6f9fc', [0, 0.37, 0], 0, 0.066);
      k.seg([0.022, 0.04, 0.012], [0.02, 0.2, 0.01], 0.004, '#d6dde7', 0.004, 6);   // bırakma teli
      k.add(G.sphere(12), '#d6dde7', [0.024, 0.06, 0.016], 0, [0.008, 0.016, 0.006]);
    })), M.metal(r));
    mesh(g, geoC('ez:dkasik:ice', () => kitGeo(k => {
      const geo = new THREE.SphereGeometry(1, 36, 24), P = geo.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), f = 1 + 0.05 * Math.sin(x * 9 + y * 5) * Math.cos(z * 7 - y * 3); P.setXYZ(i, x * f, y * f, z * f); }
      geo.computeVertexNormals();
      k.add(geo, '#ffa9c9', [0, 0.375, 0.026], 0, [0.066, 0.064, 0.06]);
      const R = mulberry32(14);
      for (let i = 0; i < 14; i++) { const th = R() * PI * 0.8, ph = R() * TAU, n = v3(Math.sin(th) * Math.sin(ph), Math.cos(th) * 0.9, Math.sin(th) * Math.cos(ph)).normalize(); if (n.z < -0.2) continue; k.add(G.dodeca(), '#5a2f1e', [n.x * 0.066, 0.375 + n.y * 0.064, 0.026 + n.z * 0.06], [R(), R(), R()], 0.0075); }
      k.add(G.sphere(16), '#ff2f4a', [0.01, 0.445, 0.03], 0, 0.016);
    })), M.gloss(r));
    tipAt(g, 0, 0.45, 0);
    return g;
  });

  // EFSANE: Altın Pasta Küreği — altın kürek, kalp oyuğu, inci sap, pembe mücevher
  W({ id: 'pastakurek', ad: 'Altın Pasta Küreği', minLvl: 0, legendary: true, set: null, col: '#ffd24a' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:kurek:gold', () => kitGeo(k => {
      const s = new THREE.Shape(); s.moveTo(-0.058, 0); s.quadraticCurveTo(0, -0.012, 0.058, 0); s.lineTo(0.014, 0.2); s.quadraticCurveTo(0, 0.218, -0.014, 0.2); s.closePath();
      s.holes.push(heartPath(new THREE.Path(), 0.04, 0, 0.06));
      k.add(flatGeo(s, 0.006, 0.003), '#ffcf5a', [0, 0.25, 0]);
      k.seg([0, 0.14, 0], [0, 0.255, 0], 0.01, '#ffcf5a', 0.013, 12);
      for (const y of [-0.105, 0.135]) k.add(G.torus(TAU, 0.25, 24), '#ffcf5a', [0, y, 0], [PI / 2, 0, 0], 0.024);
      k.add(G.sphere(20), '#ffcf5a', [0, -0.12, 0], 0, [0.026, 0.02, 0.026]);
      // kenar süslemesi (küçük boncuklar)
      for (let i = 0; i < 7; i++) { const t = i / 6; k.add(G.sphere(8), '#ffe9a0', [lp(-0.05, -0.012, t), 0.255 + t * 0.185, 0.005], 0, 0.0045); k.add(G.sphere(8), '#ffe9a0', [lp(0.05, 0.012, t), 0.255 + t * 0.185, 0.005], 0, 0.0045); }
    })), M.metal(r));
    mesh(g, geoC('ez:kurek:pearl', () => kitGeo(k => {
      k.add(G.capsule(1, 18), '#fff6ee', [0, 0.015, 0], 0, [0.02, 0.1, 0.02]);
      for (let i = 0; i < 5; i++) k.add(G.torus(TAU, 0.12, 20), '#ffd7e8', [0, -0.06 + i * 0.038, 0], [PI / 2, 0, 0], 0.0205);
    })), M.gloss(r));
    mesh(g, geoC('ez:kurek:gem', () => kitGeo(k => {
      k.add(flatGeo(heartPath(new THREE.Shape(), 1, 0, 0), 0.5, 0.08), '#ff4f9e', [0, 0.16, 0.012], 0, [0.034, 0.034, 0.03]);
      k.add(starGeo(1, 0.4), '#fff1a8', [0, 0.36, 0.006], 0, 0.016);
    })), M.glow('kurekGem', 0.6));
    tipAt(g, 0, 0.465, 0);
    return g;
  });

  // EFSANE: Gökkuşağı Şeker Kılıcı — parlayan gökkuşağı jelibon ağzı, yıldız lolipop ucu, sargılı şeker balçak
  W({ id: 'gokkusagiseker', ad: 'Gökkuşağı Şeker Kılıcı', minLvl: 0, legendary: true, col: '#ff7ad9' }, r => {
    const g = new THREE.Group(), RB = ['#ff5d73', '#ff9a3c', '#ffd23f', '#72e06a', '#4fc3ff', '#8f7bff', '#e07bff'];
    mesh(g, geoC('ez:gseker:blade', () => kitGeo(k => {
      RB.forEach((c, i) => k.add(G.rbox(3), c, [0, 0.13 + i * 0.047, 0], 0, [0.058 - i * 0.003, 0.044, 0.03]));
      k.add(starGeo(1, 0.5), '#fff3a0', [0, 0.49, 0], 0, 0.04);
    })), M.glow('gseker', 0.42));
    mesh(g, geoC('ez:gseker:hilt', () => kitGeo(k => {
      const st = (x, y, z) => (fr(y * 28 + Math.atan2(x, z) / TAU) < 0.5 ? C('#ff6fae') : C('#fff6fb'));
      k.add(G.capsule(1, 18), st, [0, 0.0, 0], 0, [0.02, 0.085, 0.02]);
      k.add(G.sphere(20), '#7be0d0', [0, -0.11, 0], 0, [0.03, 0.028, 0.03]);
      candy(k, [-0.05, 0.1, 0], 0.017, '#ff7ad9', '#ffd1ea'); candy(k, [0.05, 0.1, 0], 0.017, '#4fc3ff', '#c9ecff');
      k.add(G.sphere(16), '#ffd23f', [0, 0.1, 0], 0, [0.026, 0.02, 0.022]);
    })), M.gloss(r));
    tipAt(g, 0, 0.53, 0);
    return g;
  });

  // BOSS (Dondurma Kralı): Dondurma Külahı Kılıcı — gofret külah sap, krem sarmal ağız, kiraz uç
  W({ id: 'dondurmakilic', ad: 'Dondurma Külahı Kılıcı', minLvl: 0, boss: true, col: '#9fe6c4' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:dkilic:cone', () => kitGeo(k => {
      k.add(G.cone(24), '#e4a95e', [0, 0.0, 0], [PI, 0, 0], [0.04, 0.22, 0.04]);
      for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) {
        const a0 = i / 6 * TAU;
        const P = []; for (let j = 0; j <= 6; j++) { const t = j / 6, y = lp(0.105, -0.1, t), rr = lp(0.0405, 0.004, t) + 0.001, a = a0 + sd * t * 1.4; P.push([Math.sin(a) * rr, y, Math.cos(a) * rr]); }
        for (let j = 0; j < 6; j++) k.seg(P[j], P[j + 1], 0.0026, '#b8733a', 0.0026, 4);
      }
      k.add(G.torus(TAU, 0.18, 32), '#c98a4a', [0, 0.11, 0], [PI / 2, 0, 0], 0.042);
    })), M.soft(r));
    mesh(g, geoC('ez:dkilic:cream', () => {
      const P = [], N = 120, A = C('#c8f5df'), B = C('#ffd6ea');
      for (let i = 0; i <= N; i++) { const t = i / N, a = t * TAU * 7, rr = 0.032 * (1 - t) + 0.002; P.push(v3(Math.sin(a) * rr, 0.13 + t * 0.33, Math.cos(a) * rr)); }
      const geo = sweep(P, P.map(() => v3(0, 1, 0)), t => 0.034 * (1 - t * 0.7), t => 0.026 * (1 - t * 0.7), 12, 0.8, (t, c) => c.copy(A).lerp(B, ss(0.2, 0.9, t)), null);
      geo.deleteAttribute('aFlex');
      return geo;
    }), M.glow('dkilicCream', 0.12));
    mesh(g, geoC('ez:dkilic:top', () => kitGeo(k => {
      k.add(G.sphere(20), '#ff2f4a', [0, 0.49, 0], 0, 0.024);
      k.seg([0, 0.51, 0], [0.018, 0.55, -0.005], 0.003, '#5b8a2a', 0.0025, 6);
      sprinkles(k, 30, 41, R => { const t = 0.05 + R() * 0.75, a = t * TAU * 7 + (R() - 0.5), rr = 0.032 * (1 - t) + 0.03 * (1 - t * 0.7); return [Math.sin(a) * rr, 0.13 + t * 0.33 + 0.012, Math.cos(a) * rr]; });
    })), M.gloss(r));
    tipAt(g, 0, 0.52, 0);
    return g;
  });

  // ════════════════════════ DEĞNEKLER (büyücü) ════════════════════════
  const WZ = (def, build) => W(Object.assign({ heroClass: 'wizard' }, def), build);
  const wandHandle = (k, col, band) => {
    kcyl(k, -0.095, 0.1, 0.019, 0.016, col, 16);
    k.add(G.sphere(16), band, [0, -0.1, 0], 0, [0.024, 0.02, 0.024]);
    for (const y of [-0.07, 0.07]) k.add(G.torus(TAU, 0.22, 20), band, [0, y, 0], [PI / 2, 0, 0], 0.019);
  };

  // Çırpıcı Değnek: tahta sap, tel çırpıcı; içinde parlayan sihir topu
  WZ({ id: 'cirpici', ad: 'Çırpıcı Değnek', minLvl: 0, col: '#ffd86a' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:cirpici:wood', () => kitGeo(k => { wandHandle(k, WD('#f0c08a'), '#e09a5a'); k.add(flatGeo(heartPath(new THREE.Shape(), 1, 0, 0), 0.2, 0.03), '#ff5f7e', [0, 0.0, 0.016], 0, [0.018, 0.018, 0.02]); })), M.wood(r));
    mesh(g, geoC('ez:cirpici:wire', () => kitGeo(k => {
      kcyl(k, 0.1, 0.15, 0.019, 0.013, '#e8edf4', 20);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const th = i / n * PI, e = v3(Math.cos(th), 0, Math.sin(th)), P = [];
        for (let j = 0; j <= 40; j++) {
          const u = j / 40 * TAU, h = (1 - Math.cos(u)) / 2, w = Math.sin(u) * 0.06 * (0.25 + 0.75 * Math.sin(Math.min(1, h * 1.15) * PI * 0.62));
          P.push(v3(e.x * w, 0.145 + h * 0.25, e.z * w));
        }
        k.add(sweep(P, P.map(() => v3(-e.z, 0, e.x)), () => 0.0032, () => 0.0032, 6, 1, () => {}, null), '#e8edf4');
      }
    })), M.metal(r));
    const ball = mesh(g, G.sphere(20), M.light('#ffd86a', 2.2 + 0.25 * r), [0, 0.29, 0], null, true); ball.scale.setScalar(0.03 + 0.002 * r);
    const halo = mesh(g, G.sphere(16), M.halo('#ffb84a', 0.3), [0, 0.29, 0], null, true); halo.scale.setScalar(0.052);
    tipAt(g, 0, 0.3, 0);
    return g;
  });

  // Lolipop Değnek: eski lolipop değneği modeli
  WZ({ id: 'lolipop', ad: 'Lolipop Değnek', minLvl: 1, reuse: 'lolipop', col: '#ff8fc8' });

  // Kurabiye Değnek: şeker çubukta zencefilli yıldız kurabiye, beyaz krema çizgisi, gülen yüz
  WZ({ id: 'kurabiye', ad: 'Kurabiye Değnek', minLvl: 3, set: 'kurabiyeci', col: '#ffb86a' }, r => {
    const g = new THREE.Group(), CY = 0.3;
    mesh(g, geoC('ez:kurabiye:stick', () => kitGeo(k => {
      const st = (x, y, z) => (fr(y * 22 + Math.atan2(x, z) / TAU) < 0.45 ? C('#ff8fc0') : C('#fff6fb'));
      kcyl(k, -0.1, CY - 0.05, 0.014, 0.012, st, 16);
      k.add(G.sphere(16), '#ff8fc0', [0, -0.1, 0], 0, 0.016);
      // kurdele fiyonk
      k.add(G.sphere(12), '#5ac8ff', [0, 0.17, 0.012], 0, [0.012, 0.012, 0.009]);
      for (const sd of [-1, 1]) { k.add(G.torus(TAU, 0.35, 16), '#5ac8ff', [sd * 0.024, 0.175, 0.01], [0, 0, sd * 0.4], [0.02, 0.013, 0.01]); k.seg([sd * 0.004, 0.165, 0.012], [sd * 0.017, 0.13, 0.014], 0.0055, '#3fb2ec', 0.004, 8); }
    })), M.gloss(r));
    mesh(g, geoC('ez:kurabiye:cookie', () => kitGeo(k => {
      k.add(flatGeo(starShape(1, 0.56), 0.22, 0.12), '#c8783a', [0, CY, 0], [0, 0, 0], [0.085, 0.085, 0.085]);
      // krema çizgisi (yıldızın kenarından biraz içeride)
      const pts = []; for (let i = 0; i < 10; i++) { const a = PI / 2 + i * PI / 5, rr = (i & 1 ? 0.56 : 1) * 0.085 * 0.8; pts.push([Math.cos(a) * rr, CY + Math.sin(a) * rr, 0.019]); }
      for (let i = 0; i < 10; i++) { const p = pts[i], q = pts[(i + 1) % 10]; k.seg(p, q, 0.0042, '#fffaf2', 0.0042, 6); k.add(G.sphere(8), '#fffaf2', p, 0, 0.0042); }
      face(k, 0, CY - 0.004, 0.021, 0.045);
      for (const [x, y] of [[-0.05, CY + 0.012], [0.05, CY + 0.012], [0, CY + 0.06]]) k.add(G.sphere(10), '#ff6f8e', [x, y, 0.02], 0, [0.006, 0.006, 0.004]);
    })), M.soft(r));
    mesh(g, geoC('ez:kurabiye:sugar', () => kitGeo(k => {
      for (let i = 0; i < 5; i++) { const a = PI / 2 + i * TAU / 5; k.add(G.sphere(10), i ? '#fff1a8' : '#ffe36a', [Math.cos(a) * 0.088, CY + Math.sin(a) * 0.088, 0.012], 0, 0.009); }
    })), M.glow('cookieSugar', 0.9));
    tipAt(g, 0, CY + 0.09, 0);
    return g;
  });

  // Sihirli Çubuk Kraker: tuzlu altın kraker, pembe çikolataya batırılmış, renkli şekerli, parlayan yıldız uç
  WZ({ id: 'kraker', ad: 'Sihirli Çubuk Kraker', minLvl: 5, col: '#ff9ad0' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:kraker:stick', () => kitGeo(k => {
      const bake = (x, y, z) => C('#e9b25c').lerp(C('#b9732e'), 0.5 + 0.5 * Math.sin(y * 90 + Math.atan2(x, z) * 3));
      kcyl(k, -0.1, 0.4, 0.016, 0.015, bake, 16);
      k.add(G.sphere(14), '#c9853c', [0, -0.1, 0], 0, [0.016, 0.01, 0.016]);
      const R = mulberry32(17);
      for (let i = 0; i < 22; i++) { const a = R() * TAU, y = -0.09 + R() * 0.2; k.add(G.box(), '#ffffff', [Math.sin(a) * 0.016, y, Math.cos(a) * 0.016], [R() * 3, R() * 3, R() * 3], 0.005); }
      k.add(G.capsule(1, 16), (x, y) => (y > 0.38 ? C('#ff8fc4') : C('#ff9fcc')), [0, 0.3, 0], 0, [0.021, 0.1, 0.021]);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(G.capsule(1, 10), '#ff9fcc', [Math.sin(a) * 0.019, 0.19, Math.cos(a) * 0.019], 0, [0.007, 0.012 + (i % 2) * 0.008, 0.007]); }   // damlalar
      sprinkles(k, 34, 23, R2 => { const a = R2() * TAU, y = 0.2 + R2() * 0.2; return [Math.sin(a) * 0.022, y, Math.cos(a) * 0.022]; });
    })), M.soft(r));
    mesh(g, geoC('ez:kraker:star', () => kitGeo(k => { k.add(starGeo(1, 0.45), '#fff1a8', [0, 0.46, 0], 0, 0.045); })), M.light('#ffe680', 2.0 + 0.25 * r), null, null, true);
    const halo = mesh(g, G.sphere(16), M.halo('#ff9ad0', 0.28), [0, 0.46, 0], null, true); halo.scale.setScalar(0.06);
    tipAt(g, 0, 0.47, 0);
    return g;
  });

  // Krema Sıkacağı Değnek: çizgili krema torbası, altın yıldız uç, parlayan krema gülü
  WZ({ id: 'kremasikacagi', ad: 'Krema Sıkacağı Değnek', minLvl: 7, col: '#ffa6cc' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:sikac:bag', () => kitGeo(k => {
      const geo = lathe([[0.004, -0.11], [0.016, -0.105], [0.02, -0.06], [0.018, 0.0], [0.04, 0.05], [0.062, 0.13], [0.064, 0.18], [0.05, 0.24], [0.028, 0.3], [0.014, 0.335], [0.012, 0.34]], 36, 0, 0, 1, 1);
      k.add(geo, (x, y, z) => (y < 0.005 ? C('#e8f6ff') : fr(Math.atan2(x, z) / TAU * 8 + y * 1.5) < 0.5 ? C('#ffffff') : C('#9fdcff')));
      for (const y of [-0.075, -0.035]) k.add(G.torus(TAU, 0.2, 20), '#ff6f9a', [0, y, 0], [PI / 2, 0, 0], 0.0205);
      k.add(G.sphere(14), '#ff6f9a', [0.02, -0.055, 0.0], 0, [0.016, 0.012, 0.012]);
      for (const sd of [-1, 1]) k.add(G.capsule(1, 8), '#ff6f9a', [0.022 + sd * 0.006, -0.08, 0.004], [0, 0, 0.4 + sd * 0.4], [0.006, 0.02, 0.005]);
    })), M.soft(r));
    mesh(g, geoC('ez:sikac:nozzle', () => kitGeo(k => {
      k.add(G.cone(8), '#ffcf5a', [0, 0.365, 0], 0, [0.016, 0.05, 0.016]);
      kcyl(k, 0.335, 0.345, 0.017, 0.017, '#ffcf5a', 16);
    })), M.metal(r));
    mesh(g, geoC('ez:sikac:rose', () => {
      const P = [], N = 70;
      for (let i = 0; i <= N; i++) { const t = i / N, a = t * TAU * 2.4, rr = 0.034 * (1 - t * 0.8); P.push(v3(Math.sin(a) * rr, 0.41 + t * 0.03, Math.cos(a) * rr)); }
      const geo = sweep(P, P.map(() => v3(0, 1, 0)), t => 0.014 * (1 - t * 0.5), t => 0.012 * (1 - t * 0.5), 10, 0.8, (t, c) => c.set('#ffb3d6').lerp(C('#fff0f7'), t), null);
      geo.deleteAttribute('aFlex'); return geo;
    }), M.glow('sikacRose', 0.75));
    const halo = mesh(g, G.sphere(16), M.halo('#ff9ad0', 0.25), [0, 0.42, 0], null, true); halo.scale.setScalar(0.06);
    tipAt(g, 0, 0.44, 0);
    return g;
  });

  // EFSANE: Doğum Günü Mumu Değneği — sarmal çizgili mum, altın sap, parlayan alev
  WZ({ id: 'mumdegnek', ad: 'Doğum Günü Mumu Değneği', minLvl: 0, legendary: true, col: '#ffb347' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:mum:gold', () => kitGeo(k => {
      kcyl(k, -0.1, 0.09, 0.02, 0.017, '#ffcf5a', 20);
      k.add(G.sphere(18), '#ffcf5a', [0, -0.105, 0], 0, [0.027, 0.022, 0.027]);
      for (const y of [-0.06, 0.0, 0.06]) k.add(G.torus(TAU, 0.2, 24), '#ffe9a0', [0, y, 0], [PI / 2, 0, 0], 0.0195);
      k.add(lathe([[0.02, 0.09], [0.04, 0.105], [0.042, 0.115], [0.022, 0.12]], 28, 0, 0, 1, 1), '#ffcf5a');   // mum tabağı
    })), M.metal(r));
    mesh(g, geoC('ez:mum:wax', () => kitGeo(k => {
      const st = (x, y, z) => (fr(y * 16 + Math.atan2(x, z) / TAU * 2) < 0.5 ? C('#ff7ab8') : C('#fff3fa'));
      kcyl(k, 0.115, 0.39, 0.017, 0.017, st, 20);
      k.add(G.sphere(16), '#fff3fa', [0, 0.39, 0], 0, [0.017, 0.006, 0.017]);
      k.seg([0, 0.39, 0], [0, 0.405, 0], 0.002, '#3a2418', 0.002, 6);
      for (const [a, l] of [[0.5, 0.03], [2.4, 0.045], [4.3, 0.025]]) k.add(G.capsule(1, 8), '#fff3fa', [Math.sin(a) * 0.017, 0.39 - l / 2, Math.cos(a) * 0.017], 0, [0.005, l / 2, 0.005]);
    })), M.gloss(r));
    mesh(g, geoC('ez:mum:flame', () => kitGeo(k => { k.add(G.sphere(20), '#ffb347', [0, 0.43, 0], 0, [0.02, 0.026, 0.02]); k.add(G.cone(20), '#ffb347', [0, 0.462, 0], 0, [0.0185, 0.045, 0.0185]); })), M.light('#ff9a3c', 2.4 + 0.2 * r), null, null, true);
    mesh(g, geoC('ez:mum:core', () => kitGeo(k => { k.add(G.sphere(16), '#fff6c8', [0, 0.428, 0], 0, [0.01, 0.016, 0.01]); })), M.light('#fff6c8', 3.2), null, null, true);
    const halo = mesh(g, G.sphere(16), M.halo('#ffb347', 0.3), [0, 0.44, 0], null, true); halo.scale.set(0.05, 0.065, 0.05);
    tipAt(g, 0, 0.47, 0);
    return g;
  });

  // BOSS (Uykucu Süpürge): Süpürge Teli Değnek — minik süpürge, sarı saman telleri, kırmızı dikiş, parlayan toz pırıltıları
  WZ({ id: 'supurgedegnek', ad: 'Süpürge Teli Değnek', minLvl: 0, boss: true, col: '#ffe27a' }, r => {
    const g = new THREE.Group();
    mesh(g, geoC('ez:supurge:stick', () => kitGeo(k => { kcyl(k, -0.11, 0.2, 0.017, 0.015, WD('#d89b5f'), 16); k.add(G.sphere(16), '#a8d8ff', [0, -0.115, 0], 0, [0.022, 0.02, 0.022]); })), M.wood(r));
    mesh(g, geoC('ez:supurge:straw', () => kitGeo(k => {
      const R = mulberry32(55);
      k.add(G.cone(24), '#f3cd62', [0, 0.235, 0], [PI, 0, 0], [0.05, 0.1, 0.03]);
      for (let i = 0; i < 46; i++) {   // teller: yukarı doğru açılıyor
        const a = R() * TAU, d = Math.sqrt(R()), x0 = Math.sin(a) * d * 0.026, z0 = Math.cos(a) * d * 0.016, sp = 0.6 + R() * 0.5;
        k.seg([x0, 0.22, z0], [x0 * 3.4 * sp, 0.4 + R() * 0.04 - Math.abs(x0) * 0.6, z0 * 2.6 * sp], 0.0032, R() < 0.5 ? '#f3cd62' : '#e0ad3e', 0.0026, 5);
      }
      for (const y of [0.235, 0.26]) k.add(G.torus(TAU, 0.12, 28), '#e84a5a', [0, y, 0], [PI / 2, 0, 0], [0.037, 0.023, 0.03]);
    })), M.soft(r));
    mesh(g, geoC('ez:supurge:dust', () => kitGeo(k => {
      const sg = starGeo(1, 0.45);
      for (const [x, y, s] of [[0, 0.44, 0.022], [-0.06, 0.4, 0.013], [0.065, 0.415, 0.012], [0.03, 0.47, 0.01]]) k.add(sg, '#fff1a8', [x, y, 0.01], 0, s);
    })), M.light('#fff1a8', 2.2 + 0.2 * r), null, null, true);
    tipAt(g, 0, 0.44, 0);
    return g;
  });

  // ════════════════════════ ŞAPKALAR ════════════════════════
  const H = (def, build) => ITEMS.register('hat', def, build);
  const hatGroup = () => { const g = new THREE.Group(), h = new THREE.Group(); g.add(h); return [g, h]; };
  const HELM_IN = (h, rr) => ({ h, c: [0, 0, 0], r: rr || [0.335, 0.31, 0.345], y0: -0.035, fade: 0.09 });
  // helmet dome: sphere cap scaled to the head, opening at the bottom
  const domeGeo = (key, R3, cap) => geoC(key, () => { const s = new THREE.SphereGeometry(1, 48, 22, 0, TAU, 0, PI * (cap || 0.56)); s.scale(R3[0], R3[1], R3[2]); return s; });

  // Kevgir Şapka: delikli çelik kevgir, kırmızı kulplar, tepede taban halkası
  H({ id: 'kevgir', ad: 'Kevgir Şapka', minLvl: 0 }, r => {
    const [g, h] = hatGroup(), HR = [0.335, 0.31, 0.345];
    h.position.set(0, 0.075, -0.03); h.rotation.x = -0.3;
    mesh(h, geoC('ez:kevgir:steel', () => kitGeo(k => {
      const d = new THREE.SphereGeometry(1, 48, 22, 0, TAU, 0, PI * 0.56); d.scale(HR[0], HR[1], HR[2]);
      k.add(d, '#e9eef5');
      k.add(G.torus(TAU, 0.07, 64), '#f6f9fc', [0, -0.055, 0], [PI / 2, 0, 0], [0.334, 0.344, 0.3]);
      kcyl(k, 0.285, 0.33, 0.1, 0.11, '#e3e9f1', 40);
      k.add(G.torus(TAU, 0.12, 40), '#f6f9fc', [0, 0.33, 0], [PI / 2, 0, 0], 0.11);
      // delikler: kubbe üzerinde halkalar halinde koyu yuvarlaklar
      for (const [th, n] of [[0.38, 8], [0.62, 13], [0.86, 17], [1.1, 21], [1.34, 23]]) for (let i = 0; i < n; i++) {
        const ph = (i + (n & 1) * 0.5) / n * TAU, nn = v3(Math.sin(th) * Math.sin(ph) / HR[0], Math.cos(th) / HR[1], Math.sin(th) * Math.cos(ph) / HR[2]).normalize();
        const p = [Math.sin(th) * Math.sin(ph) * HR[0], Math.cos(th) * HR[1], Math.sin(th) * Math.cos(ph) * HR[2]];
        k.add(G.cyl(1, 1, 10), '#3a414c', p, qUp(nn), [0.0125, 0.006, 0.0125]);
      }
    })), M.metal(r));
    mesh(h, geoC('ez:kevgir:handles', () => kitGeo(k => {
      for (const sd of [-1, 1]) {
        const P = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * PI; P.push([sd * (0.325 + 0.05 * Math.sin(a)), -0.035, 0.055 * Math.cos(a)]); }
        for (let i = 0; i < 12; i++) k.seg(P[i], P[i + 1], 0.011, '#ff4f5e', 0.011, 8);
        for (const p of P) k.add(G.sphere(8), '#ff4f5e', p, 0, 0.011);
      }
    })), M.gloss(r));
    g.fzHatIn = HELM_IN(h, HR);
    return g;
  });

  // Kurdeleli Bere: kırmızı keçe bere, tepede sap, yanda pembe puantiyeli kurdele fiyonk
  H({ id: 'bere', ad: 'Kurdeleli Bere', minLvl: 1 }, r => {
    const [g, h] = hatGroup();
    h.position.set(0, 0.1, -0.02); h.rotation.set(-0.26, 0, 0.2);
    mesh(h, geoC('ez:bere:felt', () => {
      const geo = lathe([[0.312, 0], [0.318, 0.025], [0.37, 0.07], [0.398, 0.105], [0.385, 0.14], [0.31, 0.172], [0.16, 0.19], [0, 0.194]], 56, 0, 0, 1, 1.03);
      return kitGeo(k => { k.add(geo, 0xffffff); k.seg([0, 0.19, 0], [0.006, 0.225, 0], 0.012, 0xffffff, 0.009, 10); k.add(G.sphere(12), 0xffffff, [0.006, 0.225, 0], 0, 0.011); });
    }), feltMat('ezBere', 0xe2414e, r));
    mesh(h, geoC('ez:bere:band', () => kitGeo(k => {
      k.add(G.torus(TAU, 0.075, 64), '#ffb7cf', [0, 0.03, 0], [PI / 2, 0, 0], [0.318, 0.328, 0.3]);
      // fiyonk (sol yanda)
      const bx = -0.25, by = 0.05, bz = 0.2;
      k.push([bx, by, bz], [0, -0.85, 0]);
      k.add(G.sphere(16), '#ff8fbd', [0, 0, 0.02], 0, [0.026, 0.024, 0.02]);
      for (const sd of [-1, 1]) {
        k.add(G.sphere(20), '#ff8fbd', [sd * 0.055, 0.008, 0.012], [0, 0, sd * 0.25], [0.052, 0.034, 0.016]);
        k.add(G.capsule(1, 10), '#ff8fbd', [sd * 0.025, -0.06, 0.016], [0, 0, sd * 0.35], [0.011, 0.04, 0.006]);
      }
      const R = mulberry32(3);
      for (let i = 0; i < 9; i++) { const sd = i & 1 ? 1 : -1; k.add(G.sphere(8), '#ffffff', [sd * (0.03 + R() * 0.05), -0.01 + R() * 0.03, 0.029], 0, [0.006, 0.006, 0.003]); }
      k.pop();
    })), M.soft(r));
    g.fzHatIn = { h, c: [0, 0, 0], r: [0.31, 0.3, 0.32], y0: -0.02, fade: 0.07 };
    return g;
  });

  // Kek Kalıbı Kask: oluklu bakır kek kalıbı (ters), tepede baca; kenarda pişmiş kek görünüyor
  H({ id: 'kekkalibi', ad: 'Kek Kalıbı Kask', minLvl: 2, set: 'pastaci' }, r => {
    const [g, h] = hatGroup();
    h.position.set(0, 0.075, -0.03); h.rotation.x = -0.28;
    mesh(h, geoC('ez:kalip:tin', () => kitGeo(k => {
      const prof = [[0.352, -0.04], [0.352, 0.0], [0.345, 0.08], [0.31, 0.17], [0.24, 0.24], [0.13, 0.285], [0.085, 0.3], [0.08, 0.37], [0.088, 0.38], [0.06, 0.383], [0.055, 0.31]];
      const geo = lathe(prof, 96, 0, 0, 1, 1.03), P = geo.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(x, z), f = 1 + 0.06 * Math.cos(a * 14) * ss(0.02, 0.1, y) * (1 - ss(0.26, 0.3, y));
        P.setXYZ(i, x * f, y, z * f);
      }
      geo.computeVertexNormals();
      k.add(geo, '#f2b27c');
      k.add(G.torus(TAU, 0.08, 72), '#f8c69a', [0, -0.04, 0], [PI / 2, 0, 0], [0.354, 0.364, 0.35]);
    })), M.metal(r));
    mesh(h, geoC('ez:kalip:cake', () => kitGeo(k => {
      k.add(G.torus(TAU, 0.05, 72), '#f5c763', [0, -0.052, 0], [PI / 2, 0, 0], [0.335, 0.345, 0.3]);
      k.add(G.sphere(16), '#fffaf2', [0, 0.36, 0], 0, [0.05, 0.035, 0.05]);   // bacadan taşan krema
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(G.capsule(1, 8), '#fffaf2', [Math.sin(a) * 0.075, 0.355, Math.cos(a) * 0.075], 0, [0.012, 0.016, 0.012]); }
    })), M.soft(r));
    g.fzHatIn = HELM_IN(h, [0.33, 0.29, 0.34]);
    return g;
  });

  // Fincan Şapka: ters çevrilmiş pembe puantiyeli çay fincanı, kulplu, tabağı siper; kenardan sallanan çay poşeti
  H({ id: 'fincan', ad: 'Fincan Şapka', minLvl: 3, set: 'kahvalti' }, r => {
    const [g, h] = hatGroup();
    h.position.set(0, 0.2, -0.01); h.rotation.set(-0.16, 0, 0.06);
    mesh(h, geoC('ez:fincan:china', () => kitGeo(k => {
      k.add(lathe([[0.17, -0.012], [0.3, 0.0], [0.355, 0.03], [0.36, 0.042], [0.345, 0.044], [0.3, 0.018], [0.17, 0.008]], 64, 0, 0, 1, 1), (x, y, z) => (Math.hypot(x, z) > 0.33 ? C('#ff9fc4') : C('#fff4f8')));
      const dots = (x, y, z) => {   // pembe puantiye
        const a = Math.atan2(x, z) / TAU * 12, b = (y - 0.02) / 0.042, ai = Math.round(a + (Math.round(b) & 1) * 0.5) - (Math.round(b) & 1) * 0.5;
        const d = Math.hypot((a - ai) * 0.11, (b - Math.round(b)) * 0.042);
        return d < 0.017 ? C('#ffffff') : C('#6cc8ff');
      };
      k.add(lathe([[0.205, 0.006], [0.203, 0.03], [0.19, 0.1], [0.165, 0.16], [0.12, 0.2], [0.0, 0.205]], 64, 0, 0, 1, 1), dots);
      kcyl(k, 0.19, 0.225, 0.1, 0.105, '#6cc8ff', 48);
      k.add(G.cyl(1, 1, 48), '#6cc8ff', [0, 0.226, 0], 0, [0.1, 0.004, 0.1]);
      k.add(G.torus(PI * 1.2, 0.22, 24), '#6cc8ff', [0.205, 0.1, 0], [0, 0, -PI * 0.6], [0.055, 0.055, 0.055]);   // kulp
    })), M.gloss(r));
    mesh(h, geoC('ez:fincan:gold', () => kitGeo(k => {
      k.add(G.torus(TAU, 0.06, 64), '#ffcf5a', [0, 0.012, 0], [PI / 2, 0, 0], 0.206);
      k.add(G.torus(TAU, 0.06, 48), '#ffcf5a', [0, 0.226, 0], [PI / 2, 0, 0], 0.1);
      k.add(G.torus(TAU, 0.05, 72), '#ffcf5a', [0, 0.04, 0], [PI / 2, 0, 0], 0.352);
    })), M.metal(r));
    mesh(h, geoC('ez:fincan:tag', () => kitGeo(k => {
      k.seg([0.28, 0.035, 0.2], [0.29, -0.05, 0.215], 0.0018, '#ffffff', 0.0018, 4);
      k.add(G.rbox(2), '#ffd23f', [0.292, -0.075, 0.216], [0, -0.6, 0.1], [0.04, 0.045, 0.006]);
      k.add(flatGeo(heartPath(new THREE.Shape(), 1, 0, 0), 0.2, 0.03), '#ff6f8e', [0.293, -0.075, 0.22], [0, -0.6, 0.1], [0.018, 0.018, 0.02]);
    })), M.soft(r));
    g.fzHatIn = { h, c: [0, 0, 0], r: [0.2, 0.21, 0.21], y0: 0, fade: 0.06 };
    return g;
  });

  // Yumurta Kabuğu Şapka: kırık kenarlı yumurta kabuğu, tepede minik civciv
  H({ id: 'yumurta', ad: 'Yumurta Kabuğu Şapka', minLvl: 4, set: 'kurabiyeci' }, r => {
    const [g, h] = hatGroup(), ER = [0.3, 0.3, 0.31];
    h.position.set(0, 0.15, -0.03); h.rotation.set(-0.22, 0, -0.05);
    mesh(h, geoC('ez:yumurta:shell', () => kitGeo(k => {
      const zig = ph => { const f = fr(ph / TAU * 9); return 0.1 * Math.abs(f * 2 - 1); };
      const geo = surf((u, v, o) => {
        const ph = u * TAU, th = v * PI * (0.47 - zig(ph)), sn = Math.sin(th), egg = 1 - 0.1 * Math.cos(th);
        return o.set(Math.sin(ph) * sn * ER[0] * egg, Math.cos(th) * ER[1] - 0.02, Math.cos(ph) * sn * ER[2] * egg);
      }, 72, 18);
      const R = mulberry32(8), spots = []; for (let i = 0; i < 16; i++) spots.push([R() * TAU, 0.2 + R() * 1.0]);
      k.add(geo, (x, y, z) => {
        const ph = Math.atan2(x, z), th = Math.acos(cl((y + 0.02) / ER[1], -1, 1));
        for (const [a, b] of spots) if (Math.hypot((ph - a) * Math.sin(th), th - b) < 0.05) return C('#c9b8f0');
        return C('#f7faff').lerp(C('#d8ecff'), ss(0.2, 1.4, th));
      });
    })), M.shell(r));
    mesh(h, geoC('ez:yumurta:chick', () => kitGeo(k => {
      const y0 = 0.29;
      k.add(G.sphere(24), '#ffd84a', [0, y0, 0], 0, [0.075, 0.062, 0.07]);
      k.add(G.sphere(24), '#ffde5a', [0, y0 + 0.075, 0.02], 0, 0.052);
      k.add(G.cone(12), '#ff9a3c', [0, y0 + 0.07, 0.078], [PI / 2, 0, 0], [0.014, 0.024, 0.01]);
      for (const sd of [-1, 1]) {
        k.add(G.sphere(12), '#2a1a12', [sd * 0.022, y0 + 0.088, 0.064], 0, [0.0085, 0.011, 0.006]);
        k.add(G.sphere(8), '#ffffff', [sd * 0.022 + 0.003, y0 + 0.092, 0.069], 0, 0.003);
        k.add(G.sphere(10), '#ff9fb4', [sd * 0.036, y0 + 0.066, 0.058], 0, [0.01, 0.006, 0.004]);
        k.add(G.sphere(14), '#ffcf3a', [sd * 0.07, y0, 0], [0, 0, sd * 0.5], [0.02, 0.04, 0.035]);
      }
      for (const a of [-0.4, 0, 0.4]) k.add(G.capsule(1, 6), '#ffcf3a', [Math.sin(a) * 0.01, y0 + 0.13, 0.01], [0.2, 0, a], [0.006, 0.014, 0.006]);
    })), M.gloss(r));
    g.fzHatIn = { h, c: [0, -0.02, 0], r: [0.29, 0.29, 0.3], y0: 0.0, fade: 0.08 };
    return g;
  });

  // Cupcake Şapka: çizgili kâğıt kalıp, pembe krema sarmalı, renkli şeker, kiraz
  H({ id: 'cupcake', ad: 'Cupcake Şapka', minLvl: 5, set: 'sekerci' }, r => {
    const [g, h] = hatGroup();
    h.position.set(0, 0.2, -0.012); h.rotation.set(-0.12, 0, 0.06);
    mesh(h, geoC('ez:cupcake:liner', () => kitGeo(k => {
      const geo = lathe([[0.196, -0.015], [0.2, -0.012], [0.228, 0.085], [0.222, 0.09], [0.205, 0.09], [0.19, -0.005]], 96, 0, 0, 1, 1), P = geo.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), a = Math.atan2(x, z), f = 1 + 0.035 * Math.abs(Math.sin(a * 12)); P.setX(i, x * f); P.setZ(i, z * f); }
      geo.computeVertexNormals();
      k.add(geo, (x, y, z) => (fr(Math.atan2(x, z) / TAU * 12 + 0.25) < 0.5 ? C('#8fd4ff') : C('#ffffff')));
    })), M.soft(r));
    mesh(h, geoC('ez:cupcake:frost', () => kitGeo(k => {
      const F = '#ffa6cc';
      k.add(G.sphere(32), '#f2c27a', [0, 0.08, 0], 0, [0.21, 0.05, 0.21]);   // kek üstü
      for (const [y, rr, t] of [[0.12, 0.17, 0.42], [0.195, 0.125, 0.45], [0.26, 0.08, 0.5]]) k.add(G.torus(TAU, t, 40), F, [0, y, 0], [PI / 2, 0, 0], [rr, rr, rr * 0.85]);
      k.add(G.sphere(24), F, [0, 0.12, 0], 0, [0.2, 0.06, 0.2]);
      k.add(G.sphere(24), F, [0, 0.305, 0], 0, [0.045, 0.04, 0.045]);
      k.add(G.cone(16), F, [0.006, 0.345, 0], [0, 0, -0.3], [0.03, 0.05, 0.03]);
      sprinkles(k, 54, 61, R => { const lv = Math.floor(R() * 3), a = R() * TAU, [y, rr, t] = [[0.12, 0.17, 0.42], [0.195, 0.125, 0.45], [0.26, 0.08, 0.5]][lv], o = rr * (1 + t * Math.cos(R() * 1.2)); return [Math.sin(a) * o, y + rr * t * 0.85 * 0.8, Math.cos(a) * o]; });
    })), M.gloss(r));
    mesh(h, geoC('ez:cupcake:cherry', () => kitGeo(k => {
      k.add(G.sphere(24), '#ff2f4a', [0.02, 0.4, 0.01], 0, 0.04);
      k.seg([0.024, 0.435, 0.01], [0.06, 0.5, -0.02], 0.0045, '#5b8a2a', 0.0035, 6);
    })), M.glow('cherry', 0.18));
    g.fzHatIn = { h, c: [0, 0, 0], r: [0.2, 0.22, 0.21], y0: 0, fade: 0.06 };
    return g;
  });

  // Makaron Şapka: yan yatmış fıstık yeşili kocaman makaron, pembe kremalı, fırfırlı ayaklı
  H({ id: 'makaron', ad: 'Makaron Şapka', minLvl: 6 }, r => {
    const [g, h] = hatGroup();
    h.position.set(0.0, 0.215, -0.02); h.rotation.set(-0.18, 0, 0.2);
    mesh(h, geoC('ez:makaron', () => kitGeo(k => {
      const SH = '#a6e8c6', FT = '#93dbb6';
      k.add(G.sphere(40), SH, [0, -0.035, 0], 0, [0.25, 0.05, 0.25]);   // alt kabuk
      k.add(G.sphere(40), SH, [0, 0.085, 0], 0, [0.25, 0.085, 0.25]);   // üst kabuk
      kcyl(k, 0.005, 0.03, 0.235, 0.235, '#ff9fc4', 64);                  // krema
      k.add(G.torus(TAU, 0.07, 64), '#ffb3d1', [0, 0.018, 0], [PI / 2, 0, 0], 0.235);
      for (const y of [-0.005, 0.042]) for (let i = 0; i < 44; i++) { const a = i / 44 * TAU; k.add(G.sphere(8), FT, [Math.sin(a) * 0.243, y, Math.cos(a) * 0.243], 0, [0.016, 0.012, 0.016]); }   // fırfırlı ayaklar
      const R = mulberry32(27);
      for (let i = 0; i < 18; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 0.17; k.add(G.sphere(6), '#ffffff', [Math.sin(a) * d, 0.085 + 0.085 * Math.sqrt(Math.max(0, 1 - (d / 0.25) ** 2)) + 0.001, Math.cos(a) * d], 0, [0.006, 0.0025, 0.006]); }
    })), M.soft(r));
    g.fzHatIn = { h, c: [0, -0.04, 0], r: [0.22, 0.13, 0.22], y0: -0.08, fade: 0.05 };
    return g;
  });

  // Pasta Dilimi Şapka: katlı pasta dilimi (pandispanya, krema, reçel), üstünde krema gülleri ve çilek
  H({ id: 'pastadilimi', ad: 'Pasta Dilimi Şapka', minLvl: 7 }, r => {
    const [g, h] = hatGroup(), T0 = -0.2, RS = 0.33, AS = 0.5;   // dilim: uç (0, T0), yarıçap RS, yarım açı AS (şekil y → -z)
    h.position.set(0, 0.2, -0.012); h.rotation.set(-0.12, 0.95, 0.06);
    const slice = (s, R0, a) => { s.moveTo(0, T0); s.lineTo(Math.sin(-a) * R0, T0 + Math.cos(a) * R0); s.absarc(0, T0, R0, PI / 2 + a, PI / 2 - a, true); s.lineTo(0, T0); return s; };
    mesh(h, geoC('ez:dilim:cake', () => kitGeo(k => {
      const lay = (x, y) => { const t = (y - 0.012) / 0.13; return t < 0.27 ? C('#f6d184') : t < 0.37 ? C('#ff6f9a') : t < 0.43 ? C('#fff6ee') : t < 0.72 ? C('#f6d184') : t < 0.8 ? C('#fff6ee') : C('#ffd3e4'); };
      k.add(flatGeo(slice(new THREE.Shape(), RS, AS), 0.12, 0.008), lay, [0, 0.078, 0], [-PI / 2, 0, 0]);
      k.add(flatGeo(slice(new THREE.Shape(), RS + 0.005, AS + 0.005), 0.012, 0.006), '#ffd3e4', [0, 0.146, 0], [-PI / 2, 0, 0]);   // pembe şeker hamuru
    })), M.soft(r));
    mesh(h, geoC('ez:dilim:board', () => kitGeo(k => {   // altın pasta altlığı (dantel kenarlı)
      k.add(G.cyl(1, 1, 64), '#ffd76a', [0, 0.004, 0], 0, [0.24, 0.014, 0.24]);
      for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; k.add(G.sphere(8), '#fff6e0', [Math.sin(a) * 0.241, 0.004, Math.cos(a) * 0.241], 0, [0.016, 0.008, 0.016]); }
    })), M.metal(r));
    mesh(h, geoC('ez:dilim:top', () => kitGeo(k => {
      for (let i = 0; i < 6; i++) { const a = -0.42 + i / 5 * 0.84, x = Math.sin(a) * (RS - 0.03), z = -(T0 + Math.cos(a) * (RS - 0.03)); k.add(G.sphere(14), '#fffaf2', [x, 0.166, z], 0, [0.022, 0.019, 0.022]); k.add(G.cone(10), '#fffaf2', [x, 0.188, z], 0, [0.013, 0.028, 0.013]); }
      const cz = -(T0 + RS * 0.55);
      k.add(G.sphere(24), '#ff3b55', [0, 0.195, cz], [0.4, 0, 0], [0.038, 0.047, 0.038]);
      k.add(G.cone(6), '#5fbf4a', [0, 0.238, cz - 0.01], [0.4, 0, 0], [0.028, 0.017, 0.028]);
      for (let i = 0; i < 9; i++) { const th = 0.3 + (i % 3) * 0.4, ph = i * 2.1; k.add(G.sphere(6), '#ffe36a', [Math.sin(th) * Math.sin(ph) * 0.036, 0.195 + Math.cos(th) * 0.046, cz + Math.sin(th) * Math.cos(ph) * 0.036], 0, 0.0035); }
      k.add(G.sphere(14), '#ff3b55', [0.05, 0.17, cz + 0.07], 0, [0.02, 0.024, 0.02]);
      k.add(G.sphere(14), '#5a2f1e', [-0.05, 0.164, cz + 0.08], 0, [0.018, 0.011, 0.018]);
    })), M.gloss(r));
    mesh(h, geoC('ez:dilim:pillbox', () => kitGeo(k => {   // pembe yuvarlak şapka gövdesi (saçı örter), dantel şerit
      kcyl(k, -0.02, 0.07, 0.205, 0.2, (x, y, z) => (fr(Math.atan2(x, z) / TAU * 16) < 0.5 ? C('#ffc2da') : C('#ffd6e6')), 64);
      k.add(G.cyl(1, 1, 64), '#ffc2da', [0, 0.07, 0], 0, [0.2, 0.004, 0.2]);
      k.add(G.torus(TAU, 0.08, 72), '#ffffff', [0, -0.012, 0], [PI / 2, 0, 0], 0.207);
      for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; k.add(G.sphere(8), '#ffffff', [Math.sin(a) * 0.208, 0.0, Math.cos(a) * 0.208], 0, [0.012, 0.016, 0.006]); }
    })), M.soft(r), [0, 0, 0]);
    for (const o of h.children.slice(0, 3)) o.position.y = 0.07;
    g.fzHatIn = { h, c: [0, 0, 0], r: [0.2, 0.22, 0.21], y0: 0, fade: 0.06 };
    return g;
  });

  // EFSANE: Pasta Tacı (ve Koca Pastanın tacı): iki katlı pembe pasta, krema damlaları, mumlar ve çilekler
  function cakeCrown(boss) {
    return r => {
      const [g, h] = hatGroup();
      h.position.set(0.012, 0.225, -0.03); h.rotation.set(-0.12, 0, 0.12); h.scale.setScalar(1.12);
      const key = boss ? 'boss' : 'n';
      mesh(h, geoC('ez:ptac:cake:' + key, () => kitGeo(k => {
        kcyl(k, -0.01, 0.085, 0.195, 0.195, '#ffb3cf', 56);
        k.add(G.torus(TAU, 0.1, 64), '#fff8f2', [0, 0.087, 0], [PI / 2, 0, 0], 0.192);
        k.add(G.cyl(1, 1, 56), '#fff8f2', [0, 0.088, 0], 0, [0.195, 0.012, 0.195]);
        const R = mulberry32(boss ? 91 : 19);
        for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + R() * 0.1, l = 0.012 + R() * 0.03; k.add(G.capsule(1, 8), '#fff8f2', [Math.sin(a) * 0.196, 0.085 - l, Math.cos(a) * 0.196], 0, [0.012, l, 0.012]); }
        kcyl(k, 0.09, 0.16, 0.125, 0.125, boss ? '#c88fff' : '#ff8fbd', 48);
        k.add(G.torus(TAU, 0.12, 48), '#fff8f2', [0, 0.162, 0], [PI / 2, 0, 0], 0.122);
        k.add(G.cyl(1, 1, 48), '#fff8f2', [0, 0.163, 0], 0, [0.125, 0.012, 0.125]);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; k.add(G.sphere(12), '#fff8f2', [Math.sin(a) * 0.16, 0.098, Math.cos(a) * 0.16], 0, [0.022, 0.02, 0.022]); }
        // mumlar
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3, x = Math.sin(a) * 0.075, z = Math.cos(a) * 0.075, st = (xx, y) => (fr(y * 70) < 0.5 ? C(['#5ac8ff', '#ffd23f', '#7be07a', '#b27bff', '#ff6f8e'][i]) : C('#ffffff')); k.push([x, 0, z]); kcyl(k, 0.165, 0.245, 0.0105, 0.0105, st, 12); k.pop(); }
        // çilekler
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * TAU, x = Math.sin(a) * 0.168, z = Math.cos(a) * 0.168;
          k.add(G.sphere(16), '#ff3b55', [x, 0.115, z], [0.3, a, 0], [0.024, 0.03, 0.024]);
          k.add(G.cone(6), '#5fbf4a', [x, 0.145, z], 0, [0.018, 0.012, 0.018]);
        }
      })), M.gloss(r));
      mesh(h, geoC('ez:ptac:gold:' + key, () => kitGeo(k => {
        k.add(G.torus(TAU, 0.09, 64), '#ffcf5a', [0, -0.012, 0], [PI / 2, 0, 0], 0.198);
        for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * TAU; k.add(G.sphere(10), '#ffe9a0', [Math.sin(a) * 0.201, 0.0, Math.cos(a) * 0.201], 0, 0.0085); }
        if (boss) { k.add(starGeo(1, 0.4), '#ffcf5a', [0, 0.215, 0], 0, 0.048); kcyl(k, 0.16, 0.19, 0.008, 0.008, '#ffcf5a', 10); }
      })), M.metal(r));
      mesh(h, geoC('ez:ptac:flames', () => kitGeo(k => {
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3, x = Math.sin(a) * 0.075, z = Math.cos(a) * 0.075; k.add(G.sphere(12), 0xffffff, [x, 0.262, z], 0, [0.011, 0.016, 0.011]); k.add(G.cone(10), 0xffffff, [x, 0.282, z], 0, [0.0095, 0.022, 0.0095]); }
      })), M.light('#ffb347', 2.6), null, null, true);
      if (boss) mesh(h, geoC('ez:ptac:gems', () => kitGeo(k => { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.add(G.sphere(12), ['#ff3a5a', '#3aa0ff', '#3ee07a', '#c45cff', '#ffe23a', '#ff8a1c'][i], [Math.sin(a) * 0.205, -0.012, Math.cos(a) * 0.205], [0, a, 0], [0.018, 0.018, 0.01]); } })), M.glow('ptacGems', 0.9));
      return g;
    };
  }
  H({ id: 'pastataci', ad: 'Pasta Tacı', minLvl: 0, legendary: true }, cakeCrown(false));
  H({ id: 'kocapastatac', ad: 'Koca Pastanın Tacı', minLvl: 0, boss: true }, cakeCrown(true));

  // BOSS (Düdüklü Tencere): Düdüklü Kask — çelik tencere kapağı kask, siyah sap, kırmızı düdük, buhar bulutçukları
  H({ id: 'duduklukask', ad: 'Düdüklü Kask', minLvl: 0, boss: true }, r => {
    const [g, h] = hatGroup(), HR = [0.34, 0.27, 0.35];
    h.position.set(0, 0.08, -0.03); h.rotation.x = -0.28;
    mesh(h, geoC('ez:duduk:steel', () => kitGeo(k => {
      const d = new THREE.SphereGeometry(1, 48, 22, 0, TAU, 0, PI * 0.56); d.scale(HR[0], HR[1], HR[2]);
      k.add(d, '#eef2f7');
      k.add(G.torus(TAU, 0.08, 72), '#f8fbff', [0, -0.05, 0], [PI / 2, 0, 0], [0.346, 0.356, 0.3]);
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + PI / 4; k.add(G.rbox(2), '#d6dde7', [Math.sin(a) * 0.345, -0.03, Math.cos(a) * 0.355], [0, a, 0], [0.05, 0.035, 0.03]); }
      kcyl(k, 0.26, 0.3, 0.045, 0.04, '#d6dde7', 24);
    })), M.metal(r));
    mesh(h, geoC('ez:duduk:parts', () => kitGeo(k => {
      k.add(G.torus(TAU, 0.06, 72), '#ff9a3c', [0, -0.07, 0], [PI / 2, 0, 0], [0.345, 0.355, 0.3]);   // conta
      // sap: önden arkaya kubbe üzerinde kavis
      const P = []; for (let i = 0; i <= 20; i++) { const th = lp(-0.85, 0.95, i / 20); P.push(v3(0, Math.cos(th) * (HR[1] + 0.05), Math.sin(th) * (HR[2] + 0.05))); }
      k.add(sweep(P, P.map(p => v3(1, 0, 0)), () => 0.022, () => 0.016, 10, 1, () => {}, null), '#3a3f4a');
      for (const i of [0, 20]) k.add(G.sphere(14), '#3a3f4a', [P[i].x, P[i].y, P[i].z], 0, [0.024, 0.02, 0.024]);
      // düdük ağırlığı
      kcyl(k, 0.3, 0.33, 0.034, 0.038, '#ff4f5e', 24);
      k.add(G.sphere(20), '#ff4f5e', [0, 0.335, 0], 0, [0.038, 0.034, 0.038]);
      k.add(G.sphere(12), '#ffffff', [0.012, 0.36, 0.02], 0, [0.008, 0.006, 0.006]);
      k.add(G.sphere(12), '#ffd23f', [0.13, 0.22, 0.15], 0, [0.022, 0.012, 0.022]);   // emniyet düğmesi
    })), M.gloss(r));
    mesh(h, geoC('ez:duduk:steam', () => kitGeo(k => {
      for (const [x, y, z, s] of [[0, 0.41, 0, 0.034], [0.035, 0.45, -0.01, 0.026], [-0.03, 0.47, 0.01, 0.024], [0.01, 0.5, 0, 0.02]]) k.add(G.sphere(14), '#ffffff', [x, y, z], 0, s);
    })), M.glow('steam', 0.35));
    g.fzHatIn = HELM_IN(h, HR);
    return g;
  });

  // BOSS (Dondurma Kralı, büyücü): Dondurma Kralının Tacı — eski üç toplu dondurma şapkası
  H({ id: 'dondurmatac', ad: 'Dondurma Kralının Tacı', minLvl: 0, boss: true, reuse: 'dondurma' });

  // ════════════════════════ PELERİNLER ════════════════════════
  // edge(x) → y of the bottom edge at x (canvas px); below it stays transparent
  const EDGE = {
    scallop: (n, y0, d) => x => { const f = fr(x / 256 * n); return y0 + d * Math.sqrt(Math.max(0, 1 - (f * 2 - 1) ** 2)); },
    wave: (n, y0, d) => x => y0 + d * Math.sin(x / 256 * n * TAU),
    cloud: (n, y0, d) => x => { const f = fr(x / 256 * n); return y0 + d * Math.sqrt(Math.max(0, 1 - (f * 2 - 1) ** 2)) + 3 * Math.sin(x / 256 * TAU * 2); },
  };
  function capeFrame(g, S, edge) {
    const path = c => { c.beginPath(); c.moveTo(0, 0); c.lineTo(S, 0); for (let x = S; x >= 0; x -= 2) c.lineTo(x, edge(x)); c.closePath(); };
    const line = (c, dy = 0) => { c.beginPath(); for (let x = 0; x <= S; x += 2) x ? c.lineTo(x, edge(x) + dy) : c.moveTo(x, edge(x) + dy); };
    return { path, line };
  }
  function star(c, x, y, rr, a) { c.beginPath(); for (let i = 0; i < 10; i++) { const b = a - PI / 2 + i * PI / 5, q = i & 1 ? rr * 0.45 : rr; c.lineTo(x + Math.cos(b) * q, y + Math.sin(b) * q); } c.closePath(); c.fill(); }
  function strawberry(c, x, y, s, a) {
    c.save(); c.translate(x, y); c.rotate(a || 0); c.scale(s, s);
    c.fillStyle = '#ff3b55'; c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-12, 4, -12, -9, -5, -9); c.quadraticCurveTo(0, -11, 5, -9); c.bezierCurveTo(12, -9, 12, 4, 0, 12); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-4, -3, 2.5, 4, -0.4, 0, TAU); c.fill();
    c.fillStyle = '#ffe36a'; for (const [sx, sy] of [[-4, 0], [2, -3], [4, 3], [-1, 5], [-5, -5], [5, -6], [0, 0]]) { c.beginPath(); c.ellipse(sx, sy, 0.9, 1.3, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#4fb84a'; for (let i = 0; i < 5; i++) { const b = -PI / 2 + (i - 2) * 0.55; c.beginPath(); c.ellipse(Math.cos(b) * 4, -10 + Math.sin(b) * 2, 4.5, 1.8, b, 0, TAU); c.fill(); }
    c.restore();
  }
  function trim(g, S, F, col, w) { g.strokeStyle = col; g.lineWidth = w; F.line(g); g.stroke(); g.fillStyle = col; g.fillRect(0, 0, 6, S); g.fillRect(S - 6, 0, 6, S); g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 2; F.line(g, -w / 2); g.stroke(); }
  const CP = (def, painter) => { ITEMS.paintCape(def.id, painter); ITEMS.register('cape', def); };

  // Önlük Pelerin: krem önlük, pembe biye, çilek desenli cep, çilek serpintisi
  CP({ id: 'onluk', ad: 'Önlük Pelerin', minLvl: 0, set: 'pastaci' }, (g, S) => {
    const e = EDGE.scallop(7, 222, 18), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#fffaf2'); gr.addColorStop(1, '#ffeede'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    for (const [x, y, s, a] of [[40, 40, 0.9, -0.3], [128, 28, 0.8, 0.2], [214, 44, 0.9, 0.3], [30, 120, 0.85, 0.2], [226, 124, 0.85, -0.2], [52, 196, 0.9, 0.1], [204, 200, 0.9, -0.3], [84, 82, 0.6, 0.5], [176, 84, 0.6, -0.5]]) strawberry(g, x, y, s, a);
    // cep
    g.fillStyle = '#ff9fc0'; g.beginPath(); g.moveTo(84, 118); g.lineTo(172, 118); g.lineTo(168, 182); g.quadraticCurveTo(128, 196, 88, 182); g.closePath(); g.fill();
    g.fillStyle = '#ffd3e2'; g.beginPath(); g.moveTo(90, 124); g.lineTo(166, 124); g.lineTo(162, 176); g.quadraticCurveTo(128, 188, 94, 176); g.closePath(); g.fill();
    g.setLineDash([5, 4]); g.strokeStyle = '#ff6f9a'; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ff6f9a'; g.fillRect(84, 114, 88, 10);
    strawberry(g, 128, 150, 1.5, 0);
    trim(g, S, F, '#ff8fb4', 14);
    g.restore();
  });

  // Mutfak Bezi Pelerin: kırmızı-beyaz kareli bez, çizgili kenar, püsküllü dalgalı uç
  CP({ id: 'mutfakbezi', ad: 'Mutfak Bezi Pelerin', minLvl: 1 }, (g, S) => {
    const e = EDGE.wave(8, 232, 6), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip();
    g.fillStyle = '#fffaf6'; g.fillRect(0, 0, S, S);
    const q = 21;
    g.fillStyle = 'rgba(232,58,70,0.55)'; for (let i = 0; i < S / q + 1; i += 2) { g.fillRect(i * q, 0, q, S); g.fillRect(0, i * q, S, q); }
    g.fillStyle = 'rgba(200,30,45,0.5)'; for (let i = 0; i < S / q + 1; i += 2) for (let j = 0; j < S / q + 1; j += 2) g.fillRect(i * q, j * q, q, q);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1; for (let i = 0; i < S; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); }
    g.fillStyle = '#ffffff'; g.fillRect(0, 196, S, 14); g.fillStyle = '#e83a46'; g.fillRect(0, 200, S, 6);
    // kalp yaması
    g.save(); g.translate(128, 100); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-12, -6, 16, 0, TAU); g.arc(12, -6, 16, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-27, 0); g.lineTo(0, 30); g.lineTo(27, 0); g.fill();
    g.fillStyle = '#ff4f5e'; g.beginPath(); g.arc(-10, -6, 12, 0, TAU); g.arc(10, -6, 12, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-21, -1); g.lineTo(0, 23); g.lineTo(21, -1); g.fill(); g.restore();
    g.strokeStyle = '#ffffff'; g.lineWidth = 3; for (let x = 4; x < S; x += 7) { g.beginPath(); g.moveTo(x, e(x) - 14); g.lineTo(x + 1, e(x) + 1); g.stroke(); }   // püsküller
    g.fillStyle = '#e83a46'; g.fillRect(0, 0, 6, S); g.fillRect(S - 6, 0, 6, S);
    g.restore();
  });

  // Krep Pelerin: altın sarısı krep, kızarmış benekler, çikolata sosu ve pudra şekeri, dalgalı yuvarlak kenar
  CP({ id: 'krep', ad: 'Krep Pelerin', minLvl: 2, set: 'kahvalti' }, (g, S, ge, R) => {
    const e = x => 226 + 9 * Math.sin(x / 256 * TAU * 2.5 + 1) + 4 * Math.sin(x / 256 * TAU * 7), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip();
    const gr = g.createRadialGradient(128, 110, 10, 128, 110, 190); gr.addColorStop(0, '#ffd77a'); gr.addColorStop(0.7, '#f4b850'); gr.addColorStop(1, '#d98e2e'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 110; i++) {   // kızarmış dantel benekler
      const x = R() * S, y = R() * 230, rr = 2 + R() * 7;
      const rg = g.createRadialGradient(x, y, 0, x, y, rr); rg.addColorStop(0, 'rgba(160,80,20,0.55)'); rg.addColorStop(1, 'rgba(160,80,20,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(150,75,20,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) { const x = R() * S, y = R() * 220, rr = 4 + R() * 8; g.beginPath(); g.arc(x, y, rr, R() * TAU, R() * TAU + 2.5); g.stroke(); }
    // çikolata sosu zikzak
    g.strokeStyle = '#6b3a1e'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const y0 of [60, 150]) { g.beginPath(); for (let i = 0; i <= 12; i++) { const x = 18 + i * 18.5, y = y0 + (i & 1 ? 24 : 0) + Math.sin(i) * 4; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5;
    for (const y0 of [58, 148]) { g.beginPath(); for (let i = 0; i <= 12; i++) { const x = 18 + i * 18.5, y = y0 + (i & 1 ? 24 : 0) + Math.sin(i) * 4 - 1.5; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    // pudra şekeri + muz dilimleri
    g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 160; i++) g.fillRect(R() * S, R() * 225, 1.6, 1.6);
    for (const [x, y] of [[60, 108], [196, 104], [128, 196], [128, 30]]) { g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill(); g.strokeStyle = '#f0d88a'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#e8cf7a'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 1.3, 0, TAU); g.fill(); } }
    g.strokeStyle = '#c47a26'; g.lineWidth = 8; F.line(g); g.stroke();
    g.restore();
  });

  // Pötikare Masa Örtüsü Pelerin: mavi-beyaz kareli örtü, dantel fistolu kenar
  CP({ id: 'potikare', ad: 'Pötikare Masa Örtüsü Pelerin', minLvl: 3, set: 'kurabiyeci' }, (g, S) => {
    const e = EDGE.scallop(10, 226, 14), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip();
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
    const q = 32;
    g.fillStyle = 'rgba(70,140,230,0.5)'; for (let i = 0; i < 9; i += 2) { g.fillRect(i * q, 0, q, S); g.fillRect(0, i * q, S, q); }
    g.fillStyle = 'rgba(40,100,200,0.45)'; for (let i = 0; i < 9; i += 2) for (let j = 0; j < 9; j += 2) g.fillRect(i * q, j * q, q, q);
    // küçük papatyalar
    for (const [x, y] of [[48, 48], [176, 48], [112, 112], [48, 176], [176, 176], [240, 112]]) {
      g.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 3, a, 0, TAU); g.fill(); }
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill();
    }
    // dantel
    g.fillStyle = '#ffffff'; g.fillRect(0, 206, S, 30);
    g.fillStyle = 'rgba(120,170,235,0.55)'; for (let x = 6; x < S; x += 12.8) { g.beginPath(); g.arc(x, 214, 3, 0, TAU); g.fill(); g.beginPath(); g.arc(x + 6.4, 226, 2.2, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(120,170,235,0.7)'; g.lineWidth = 1.5; F.line(g, -4); g.stroke();
    g.fillStyle = '#3f84e0'; g.fillRect(0, 0, 6, S); g.fillRect(S - 6, 0, 6, S);
    g.restore();
  });

  // Çilekli Pelerin: pembe zemin, büyük çilekler, yapraklar, beyaz puantiye, fistolu kenar
  CP({ id: 'cilekli', ad: 'Çilekli Pelerin', minLvl: 5, set: 'sekerci' }, (g, S, ge) => {
    const e = EDGE.scallop(6, 216, 22), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#ffb8d2'); gr.addColorStop(1, '#ff8fb8'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(255,255,255,0.75)'; for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(i * 32 + (j & 1) * 16, j * 28 + 8, 3.2, 0, TAU); g.fill(); }
    strawberry(g, 128, 104, 3.4, 0);
    ge.save(); ge.globalAlpha = 0.25; strawberry(ge, 128, 104, 3.4, 0); ge.restore();
    for (const [x, y, s, a] of [[44, 50, 1.5, -0.3], [212, 52, 1.5, 0.3], [40, 170, 1.4, 0.2], [216, 170, 1.4, -0.2], [128, 30, 1, 0], [90, 190, 1.1, 0.4], [166, 190, 1.1, -0.4]]) strawberry(g, x, y, s, a);
    trim(g, S, F, '#ffffff', 14);
    g.fillStyle = '#ff4f7e'; for (let x = 0; x < S; x += 256 / 6) { g.beginPath(); g.arc(x + 256 / 12, e(x + 256 / 12) - 10, 3, 0, TAU); g.fill(); }
    g.restore();
  });

  // Buzlu Pelerin: buz mavisi, parlayan kar taneleri, buz çiçekleri, sarkıt saçaklı kenar
  CP({ id: 'buzlu', ad: 'Buzlu Pelerin', minLvl: 6 }, (g, S, ge, R) => {
    const e = x => { const f = fr(x / 256 * 9), big = Math.floor(x / 256 * 9) % 2; return 206 + (big ? 30 : 20) * Math.pow(1 - Math.abs(f * 2 - 1), 1.6); }, F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip(); ge.save(); F.path(ge); ge.clip();
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#d6f4ff'); gr.addColorStop(0.6, '#8fd4f4'); gr.addColorStop(1, '#5ab4e6'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5;   // buz çiçekleri
    for (let i = 0; i < 9; i++) { const x = R() * S, y = R() * 200; for (let j = 0; j < 6; j++) { const a = R() * TAU, l = 14 + R() * 18; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } }
    const flake = (c, x, y, rr, col, w) => {
      c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, cx = Math.cos(a), sy = Math.sin(a); c.beginPath(); c.moveTo(x, y); c.lineTo(x + cx * rr, y + sy * rr); c.stroke();
        for (const t of [0.5, 0.75]) { const px = x + cx * rr * t, py = y + sy * rr * t, b = rr * 0.25; c.beginPath(); c.moveTo(px + Math.cos(a + 0.8) * b, py + Math.sin(a + 0.8) * b); c.lineTo(px, py); c.lineTo(px + Math.cos(a - 0.8) * b, py + Math.sin(a - 0.8) * b); c.stroke(); } }
    };
    flake(g, 128, 100, 44, '#ffffff', 5); flake(ge, 128, 100, 44, '#5fa8d8', 5);
    for (const [x, y, rr] of [[42, 44, 18], [214, 48, 18], [40, 160, 16], [216, 160, 16], [128, 190, 13], [86, 26, 10], [170, 26, 10]]) { flake(g, x, y, rr, '#ffffff', 3); flake(ge, x, y, rr, '#4a90c0', 3); }
    for (let i = 0; i < 60; i++) { const x = R() * S, y = R() * 220; g.fillStyle = '#ffffff'; g.fillRect(x, y, 2, 2); ge.fillStyle = '#9fd8ff'; ge.fillRect(x, y, 2, 2); }
    g.strokeStyle = '#ffffff'; g.lineWidth = 10; F.line(g); g.stroke(); ge.strokeStyle = '#3a7aa8'; ge.lineWidth = 8; F.line(ge); ge.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 6, S); g.fillRect(S - 6, 0, 6, S);
    g.restore(); ge.restore();
  });

  // Makaron Pelerin: krem zemin üstünde sıra sıra pastel makaronlar, şerit ve fistolu kenar
  CP({ id: 'makaronpelerin', ad: 'Makaron Pelerin', minLvl: 7 }, (g, S, ge, R) => {
    const e = EDGE.scallop(8, 224, 16), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip();
    g.fillStyle = '#fff7ef'; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(255,190,215,0.35)'; for (let i = 0; i < 8; i++) g.fillRect(i * 32 + 12, 0, 8, S);
    const mac = (x, y, sh, cr) => {
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(x + 1.5, y + 3, 17, 13, 0, 0, TAU); g.fill();
      g.fillStyle = sh; g.beginPath(); g.ellipse(x, y - 5, 16, 7, 0, PI, TAU); g.lineTo(x + 16, y - 3); g.lineTo(x - 16, y - 3); g.fill();
      g.beginPath(); g.ellipse(x, y + 5, 16, 6, 0, 0, PI); g.lineTo(x - 16, y + 3); g.lineTo(x + 16, y + 3); g.fill();
      g.fillStyle = cr; g.fillRect(x - 15, y - 3, 30, 6);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(x - 5, y - 8, 6, 2, -0.2, 0, TAU); g.fill();
    };
    const SH = [['#ffb3cf', '#fff6ee'], ['#a6e8c6', '#ff9fc4'], ['#fff0a0', '#fff6ee'], ['#d4b8ff', '#fff6ee'], ['#9fdcff', '#ffe0ec']];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const [a, b] = SH[(i + j * 2) % 5]; mac(28 + i * 50 + (j & 1) * 25 - 12, 26 + j * 42, a, b); }
    trim(g, S, F, '#ff9fc4', 14);
    g.restore();
  });

  // EFSANE: Krema Pelerin — krem rengi, krema gülleri, kiraz, parlayan altın pırıltılar, bulut gibi krema kenar
  CP({ id: 'krema', ad: 'Krema Pelerin', minLvl: 0, legendary: true }, (g, S, ge, R) => {
    const e = EDGE.cloud(7, 214, 26), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip(); ge.save(); F.path(ge); ge.clip();
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#ffe2ee'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    // krema gülleri (sarmal)
    const rose = (x, y, rr, col) => {
      g.fillStyle = col; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(200,120,150,0.55)'; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i <= 50; i++) { const t = i / 50, a = t * TAU * 2.5, q = rr * 0.9 * t; i ? g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : g.moveTo(x, y); }
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x - rr * 0.35, y - rr * 0.4, rr * 0.22, 0, TAU); g.fill();
    };
    for (const [x, y, rr, c] of [[40, 40, 17, '#ffd6e6'], [128, 34, 15, '#fff3c8'], [216, 40, 17, '#d8f3ff'], [74, 118, 19, '#fff3c8'], [182, 118, 19, '#ffd6e6'], [128, 170, 21, '#d8f3ff'], [36, 186, 16, '#ffd6e6'], [220, 186, 16, '#fff3c8']]) rose(x, y, rr, c);
    for (const [x, y] of [[128, 98], [52, 150], [204, 150]]) {
      g.strokeStyle = '#5b8a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 14, x + 12, y - 18); g.stroke();
      g.fillStyle = '#ff2f4a'; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x - 3, y - 3, 2.5, 0, TAU); g.fill();
      ge.fillStyle = '#401010'; ge.beginPath(); ge.arc(x, y, 9, 0, TAU); ge.fill();
    }
    for (let i = 0; i < 40; i++) { const x = R() * S, y = R() * 210, rr = 2 + R() * 4, a = R(); g.fillStyle = '#ffd24a'; star(g, x, y, rr, a); ge.fillStyle = '#ffcf4a'; star(ge, x, y, rr, a); }
    // krema bulut kenarı
    g.fillStyle = '#fffdf8'; for (let x = 0; x <= S; x += 256 / 7) { g.beginPath(); g.arc(x + 256 / 14, e(x + 256 / 14) - 16, 22, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(230,180,200,0.6)'; g.lineWidth = 2; for (let x = 0; x <= S; x += 256 / 7) { g.beginPath(); g.arc(x + 256 / 14, e(x + 256 / 14) - 16, 13, 0.3, PI * 1.7); g.stroke(); }
    ge.strokeStyle = '#5a4510'; ge.lineWidth = 6; F.line(ge, -3); ge.stroke();
    g.fillStyle = '#ffd24a'; g.fillRect(0, 0, 5, S); g.fillRect(S - 5, 0, 5, S); ge.fillStyle = '#5a4510'; ge.fillRect(0, 0, 5, S); ge.fillRect(S - 5, 0, 5, S);
    g.restore(); ge.restore();
  });

  // BOSS (Uykucu Süpürge): Toz Bezi Pelerini — sarı mikrofiber bez, uykulu bulut yüzü, "z" harfleri, pofuduk kenar
  CP({ id: 'tozbezi', ad: 'Toz Bezi Pelerini', minLvl: 0, boss: true }, (g, S, ge, R) => {
    const e = x => 220 + 6 * Math.sin(x * 0.9) + 5 * Math.sin(x * 0.37 + 1), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#ffe46a'); gr.addColorStop(1, '#ffc93a'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(200,140,20,0.25)'; g.lineWidth = 1; for (let i = 0; i < 260; i++) { const x = R() * S, y = R() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R() * 4 - 2, y + 3); g.stroke(); }
    g.setLineDash([6, 5]); g.strokeStyle = '#7a8cff'; g.lineWidth = 2.5; g.strokeRect(14, 12, S - 28, 196); g.setLineDash([]);
    // uykulu bulut
    const cx = 128, cy = 102;
    g.fillStyle = '#f4f6ff'; for (const [x, y, rr] of [[-34, 6, 26], [0, -10, 34], [34, 6, 26], [-14, 16, 24], [16, 16, 24]]) { g.beginPath(); g.arc(cx + x, cy + y, rr, 0, TAU); g.fill(); }
    ge.fillStyle = '#20243a'; for (const [x, y, rr] of [[-34, 6, 26], [0, -10, 34], [34, 6, 26]]) { ge.beginPath(); ge.arc(cx + x, cy + y, rr, 0, TAU); ge.fill(); }
    g.strokeStyle = '#4a4a6a'; g.lineWidth = 3; g.lineCap = 'round';
    for (const sd of [-1, 1]) { g.beginPath(); g.arc(cx + sd * 14, cy + 2, 6, 0.15 * PI, 0.85 * PI); g.stroke(); }
    g.fillStyle = 'rgba(255,140,170,0.6)'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(cx + sd * 26, cy + 12, 6, 4, 0, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(cx, cy + 16, 5, 0.1 * PI, 0.9 * PI); g.stroke();
    g.fillStyle = '#7a8cff'; g.font = 'bold 26px sans-serif'; g.fillText('z', 176, 70); g.font = 'bold 19px sans-serif'; g.fillText('z', 198, 50); g.font = 'bold 14px sans-serif'; g.fillText('z', 214, 34);
    for (let i = 0; i < 18; i++) { const x = 20 + R() * 216, y = 150 + R() * 50; g.fillStyle = '#fff6c8'; star(g, x, y, 2 + R() * 3, R()); ge.fillStyle = '#fff1a0'; star(ge, x, y, 2 + R() * 3, R()); }
    // pofuduk kenar
    g.fillStyle = '#ffeb9a'; for (let x = 0; x < S; x += 6) { g.beginPath(); g.arc(x, e(x) - 6, 6 + R() * 3, 0, TAU); g.fill(); }
    g.fillStyle = '#7a8cff'; g.fillRect(0, 0, 6, S); g.fillRect(S - 6, 0, 6, S);
    g.restore();
  });

  // ════════════════════════ BAŞLANGIÇ, SETLER, BOSS HAZİNELERİ ════════════════════════
  ITEMS.setStarter('kasik', 'cirpici');
  ITEMS.SETS.pastaci = { ad: 'Pastacı Seti', renk: '#ffb347', parca: ['weapon:kasik', 'hat:kekkalibi', 'cape:onluk'] };
  ITEMS.SETS.kahvalti = { ad: 'Kahvaltı Seti', renk: '#7fe8ff', parca: ['weapon:catal', 'hat:fincan', 'cape:krep'] };
  ITEMS.SETS.sekerci = { ad: 'Şekerci Seti', renk: '#ff6fae', parca: ['weapon:sekerkamisi', 'hat:cupcake', 'cape:cilekli'] };
  ITEMS.SETS.kurabiyeci = { ad: 'Kurabiyeci Seti', renk: '#ffcf5a', parca: ['weapon:kurabiye', 'hat:yumurta', 'cape:potikare'] };
  // Boss hazineleri her sınıfa açık olsun (register boss için classLock koyar; burada kaldırıyoruz: silahın kendi türü yine geçerli)
  for (const slot of ['weapon', 'hat', 'cape']) for (const b of ITEMS.BASES[slot]) if (b.boss) delete b.classLock;
  const GIFT = {
    uykucuSupurge: { warrior: ['cape', 'tozbezi'], wizard: ['weapon', 'supurgedegnek'], hybrid: ['weapon', 'supurgedegnek'] },
    dudukluTencere: { warrior: ['hat', 'duduklukask'], wizard: ['hat', 'duduklukask'], hybrid: ['hat', 'duduklukask'] },
    dondurmaKrali: { warrior: ['weapon', 'dondurmakilic'], wizard: ['hat', 'dondurmatac'], hybrid: ['weapon', 'dondurmakilic'] },
    kocaPasta: { warrior: ['hat', 'kocapastatac'], wizard: ['hat', 'kocapastatac'], hybrid: ['hat', 'kocapastatac'] },
  };
  Object.assign(ITEMS.BOSS_GIFT, GIFT);
  // yedek: bossun ödünç aldığı eski tip adıyla da
  for (const [old, now] of [['kraljole', 'uykucuSupurge'], ['kefirdev', 'dudukluTencere'], ['lavkaplumbaga', 'dondurmaKrali'], ['ejderha', 'kocaPasta'],
    ['kostebekusta', 'dudukluTencere'], ['sovalye', 'dondurmaKrali'], ['duduklu', 'dudukluTencere']]) ITEMS.BOSS_GIFT[old] = GIFT[now];
})();
