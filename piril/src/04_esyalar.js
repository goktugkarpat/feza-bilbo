/* Feza ile Pırıl eşyaları: ejderha ışıkları temalı ışık kılıçları, değnekler, taçlar/şapkalar, pelerinler, setler ve boss ödülleri
   (ITEMS.register, src/04_feza.js). Kılıçlar motorun ışık kılıcıdır (ITEMS.defineSaber + KIT.buildSword: sap + parlayan ağız),
   üstüne her kılıca özel süs (ejderha pulu, mantar, mercan, kum saati, çark, gökkuşağı, ejderha kanadı) eklenir.
   Değnekler motorun tahta değneği (ITEMS.defineWand) + uçta özel süs. Silah: tutma yeri orijinde, +Y ucu, g.fzTip uçta.
   Şapka: baş merkezi orijin (saç ~0,31 m yukarı), g.fzHatIn saçı içeri alır. Pelerin: ITEMS.paintCape(id, painter) — 256×256 doku,
   üst = omuzlar; alt kenar biçimi burada, altı saydam (alphaTest 0,5). Her eşya az çizim çağrısı: parçalar Kit ile birleştirilir,
   geometri ve malzemeler önbellekte (geoC / mat). */
(function () {
  'use strict';
  if (typeof ITEMS === 'undefined' || !ITEMS.register || !ITEMS.defineSaber) return;
  const K = ITEMS.KIT;
  const { THREE, G, kitGeo, geoC, mat, vcMat, glowMat, glowVC, rimify, tex, sweep, lathe, flatGeo, starShape, starGeo,
    v3, V2, rarCol, mulberry32, TAU, feltMat } = K;
  const PI = Math.PI;
  const cl = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lp = (a, b, t) => a + (b - a) * t;
  const fr = x => x - Math.floor(x);
  const C = h => new THREE.Color(h);
  const kcyl = (k, y0, y1, r0, r1, col, seg = 24) => k.add(G.cyl(r1 / r0, 1, seg), col, [0, (y0 + y1) / 2, 0], 0, [r0, y1 - y0, r0]);

  // ── Ortak malzemeler (nadirlik ≥ 2: renkli kenar ışığı) ──
  const rk = r => (r >= 2 ? r : 0);
  const rimR = (m, r) => (rk(r) ? rimify(m, rarCol(r), r === 3 ? 0.62 : 0.42, 2.3) : rimify(m, 0xffffff, 0.14));
  const M = {
    gloss: r => mat('pr:gloss|' + rk(r), () => rimR(vcMat({ roughness: 0.26, metalness: 0.02, envMapIntensity: 1.0 }), r)),
    soft: r => mat('pr:soft|' + rk(r), () => rimR(vcMat({ roughness: 0.62, envMapIntensity: 0.75 }), r)),
    shell: r => mat('pr:shell|' + rk(r), () => rimR(vcMat({ roughness: 0.42, side: THREE.DoubleSide, envMapIntensity: 0.85 }), r)),
    metal: r => mat('pr:metal|' + rk(r), () => { const t = tex('metal'); return rimR(vcMat({ metalness: 1, roughness: 0.27, map: t ? t.map : null, normalMap: t ? t.normalMap : null, normalScale: V2(0.25, 0.25), envMapIntensity: 1.1, side: THREE.DoubleSide }), r); }),
    glow: (key, k) => glowVC('pr:glow:' + key, k, { roughness: 0.3 }),
    light: (col, I) => mat('pr:light:' + col + ':' + I, () => glowMat(col, I)),
  };
  const mesh = (g, geo, m, pos, rot, noShadow) => {
    const o = new THREE.Mesh(geo, m);
    if (pos) o.position.set(pos[0], pos[1], pos[2]);
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    if (noShadow) { o.userData.noShadow = true; o.userData.noXray = true; }
    g.add(o); return o;
  };
  const part = (g, key, fn, m, noShadow) => mesh(g, geoC('pr:' + key, () => kitGeo(fn)), m, null, null, noShadow);
  // +y'yi n yönüne çeviren dönüş
  const qUp = n => new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), n.clone().normalize());
  // elipsoid yüzeyinde (yarıçaplar R3, merkez cy) th: tepeden açı, ph: çevre açısı → [konum, dönüş]
  const onEll = (R3, cy, th, ph) => {
    const p = [Math.sin(th) * Math.sin(ph) * R3[0], cy + Math.cos(th) * R3[1], Math.sin(th) * Math.cos(ph) * R3[2]];
    const n = v3(Math.sin(th) * Math.sin(ph) / R3[0], Math.cos(th) / R3[1], Math.sin(th) * Math.cos(ph) / R3[2]);
    return [p, qUp(n)];
  };
  // bir eğri boyunca boru (k.seg zinciri + yuvarlak eklemler); r0 → r1 incelir
  const tube = (k, P, r0, r1, col) => {
    for (let i = 0; i < P.length - 1; i++) {
      const a = lp(r0, r1, i / (P.length - 1)), b = lp(r0, r1, (i + 1) / (P.length - 1));
      k.seg(P[i], P[i + 1], a, col, b, 8); k.add(G.sphere(8), col, P[i + 1], 0, b);
    }
  };
  // sevimli yüz (+z'ye bakan): gözler, yanaklar, gülümseme
  function face(k, x, y, z, s) {
    for (const sd of [-1, 1]) {
      k.add(G.sphere(12), '#3a2418', [x + sd * s * 0.42, y + s * 0.1, z], 0, [s * 0.13, s * 0.17, s * 0.06]);
      k.add(G.sphere(8), '#ffffff', [x + sd * s * 0.42 + s * 0.04, y + s * 0.17, z + s * 0.04], 0, s * 0.045);
      k.add(G.sphere(12), '#ff8fae', [x + sd * s * 0.68, y - s * 0.16, z - s * 0.01], 0, [s * 0.16, s * 0.1, s * 0.04]);
    }
    k.add(G.torus(PI * 0.8, 0.28, 14), '#3a2418', [x, y - s * 0.12, z], [0, 0, -PI * 0.9], s * 0.2);
  }
  // ejderha kanadı biçimi (sağ kanat, kök orijinde, uç +x yukarı; alt kenar üç kavisli)
  const wingShape = s => {
    const p = new THREE.Shape();
    p.moveTo(0, 0); p.quadraticCurveTo(0.01 * s, 0.07 * s, 0.05 * s, 0.09 * s); p.quadraticCurveTo(0.09 * s, 0.1 * s, 0.12 * s, 0.085 * s);
    p.quadraticCurveTo(0.105 * s, 0.055 * s, 0.1 * s, 0.03 * s); p.quadraticCurveTo(0.085 * s, 0.045 * s, 0.07 * s, 0.022 * s);
    p.quadraticCurveTo(0.055 * s, 0.035 * s, 0.04 * s, 0.01 * s); p.quadraticCurveTo(0.025 * s, 0.02 * s, 0, 0);
    return p;
  };
  const WING_RIB = [[0.12, 0.085], [0.1, 0.03], [0.07, 0.022], [0.04, 0.01]];
  function wings(k, s, x, y, z, memb, rib, tilt = 0.25) {
    const g = geoC('pr:wingFlat:' + s, () => flatGeo(wingShape(s), 0.006 * s, 0.002 * s));
    for (const sd of [-1, 1]) {
      k.push([sd * x, y, z], [0, sd < 0 ? PI : 0, sd * tilt]);
      k.add(g, memb);
      for (const [a, b] of WING_RIB) k.seg([0, 0, 0.004 * s], [a * s * 0.97, b * s * 0.97, 0.004 * s], 0.0045 * s, rib, 0.0022 * s, 6);
      k.pop();
    }
  }
  // gökkuşağı yayı (xy düzleminde, merkez (x, y), dıştan içe kırmızı → mor)
  const RB = ['#ff5a6e', '#ffa040', '#ffe14a', '#6fe07a', '#5ab8ff', '#a77bff'];
  function rainbowArc(k, x, y, z, R, w) {
    RB.forEach((c, i) => k.add(G.torus(PI, 0.5, 40), c, [x, y, z], 0, [R - i * w, R - i * w, w * 0.9]));
  }
  // 5 ejderha ışığının renkleri (mantar · mercan · çöl · atölye · gökkuşağı)
  const ISIK = ['#7dffb0', '#ff8fb8', '#ffd23f', '#6fd0ff', '#c99bff'];

  ITEMS.clearBases();

  // ════════════════════════ IŞIK KILIÇLARI (savaşçı + karma) ════════════════════════
  const W = (def, build) => ITEMS.register('weapon', def, build);
  // SW(def, kılıç tanımı, süs): motorun ışık kılıcı (sap + ağız) + bu kılıca özel süs parçaları
  // Oyun kamerasında okunsun diye sap + süsler HS kat büyük (tutma yeri orijinde kalır), ışık ağzı BT kat kalın; ağzın boyu aynı.
  const HS = 1.36, BT = 1.32, HILT_TOP = 0.155;
  const SW = (def, sab, deco) => {
    ITEMS.defineSaber(def.id, sab);
    W(def, r => {
      const g = K.buildSword(def.id, r), blade = g.fzBlade, hilt = new THREE.Group();
      hilt.scale.setScalar(HS);
      for (const c of g.children.slice()) if (c !== blade) hilt.add(c);
      g.add(hilt);
      if (deco) deco(hilt, r);
      if (blade) {
        blade.position.y = (HILT_TOP - 0.004) * HS;
        const thick = new THREE.Group(); thick.scale.set(BT, 1, BT);
        for (const c of blade.children.slice()) if (c.isMesh) thick.add(c);
        blade.add(thick);
      }
      return g;
    });
  };

  // Işık Kılıcı (başlangıç): leylak-nane ejderha pulları kaplı sap, küçük kanat çıkıntıları, leylak → buz mavisi ağız
  SW({ id: 'isikkilic', ad: 'Işık Kılıcı', minLvl: 0 },
    { col: '#c79bff', col2: '#8ff3ff', fx: 'grad', L: 0.64, metal: 0xeee6ff, grip: 0x8a6cc8, shroud: 'round', btn: '#8ff3ff', trail: '#c79bff' },
    (g, r) => {
      part(g, 'isik:scales', k => {
        for (let j = 0; j < 7; j++) for (let i = 0; i < 9; i++) {
          const a = (i + (j & 1) * 0.5) / 9 * TAU, y = -0.066 + j * 0.0175;
          k.add(G.sphere(10), (i + j) % 3 ? '#b48cff' : '#9fe8d8', [Math.sin(a) * 0.0186, y, Math.cos(a) * 0.0186], [-0.45, a, 0], [0.0105, 0.0125, 0.0045]);
        }
        wings(k, 0.42, 0.018, 0.118, 0, '#b48cff', '#ffd86a', 0.35);
      }, M.gloss(r));
      part(g, 'isik:eye', k => { k.add(G.sphere(12), '#8ff3ff', [0, 0.124, 0.021], 0, [0.008, 0.011, 0.005]); }, M.glow('isikEye', 0.9), true);
    });

  // Mantar Işıklı Kılıç: kırmızı benekli mantar şapkası balçak, sapta minik mantarlar; nane yeşili → limon ağız
  SW({ id: 'mantarkilic', ad: 'Mantar Işıklı Kılıç', minLvl: 1, set: 'mantar' },
    { col: '#6dffb4', col2: '#e2ff7a', fx: 'grad', L: 0.7, metal: 0xf3ead8, grip: 0xd9b88a, shroud: 'plain', btn: '#ff6a6a', trail: '#6dffb4' },
    (g, r) => {
      // balçak mantarı elde iri durmasın: şapka + benekler balçak noktası (y 0,116) çevresinde %75
      const shrink = m => { m.scale.setScalar(0.75); m.position.y = 0.116 * 0.25; return m; };
      shrink(part(g, 'mantar:cap', k => {
        k.add(G.hemi(32), '#ff4f5e', [0, 0.116, 0], 0, [0.078, 0.042, 0.078]);
        k.add(G.cyl(1, 1, 32), '#fff1d6', [0, 0.115, 0], 0, [0.076, 0.006, 0.076]);
        for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; k.add(G.box(), '#ecd2a8', [Math.sin(a) * 0.05, 0.111, Math.cos(a) * 0.05], [0, a, 0], [0.002, 0.004, 0.044]); }
        // sapta iki minik mantar
        for (const [x, y, s, c] of [[0.024, 0.02, 1, '#ff7a5e'], [-0.023, -0.03, 0.8, '#ffb04a']]) {
          k.seg([x * 0.8, y - 0.012 * s, 0], [x, y + 0.008 * s, 0], 0.0055 * s, '#fff1d6', 0.0045 * s, 8);
          k.add(G.hemi(16), c, [x, y + 0.008 * s, 0], [0, 0, -Math.sign(x) * 0.4], [0.016 * s, 0.012 * s, 0.016 * s]);
        }
      }, M.gloss(r)));
      shrink(part(g, 'mantar:dots', k => {
        for (const [th, ph] of [[0.25, 0], [0.9, 0.3], [0.95, 1.6], [0.9, 2.9], [0.95, 4.2], [0.9, 5.4], [0.55, 0.9], [0.6, 2.4], [0.55, 3.9], [0.6, 5.2]]) {
          const [p, q] = onEll([0.078, 0.042, 0.078], 0.116, th, ph);
          k.add(G.sphere(10), '#f4fff0', p, q, [0.011, 0.004, 0.011]);
        }
      }, M.glow('mantarDot', 0.75), true));
    });

  // Mercan Kılıcı: iki yana kıvrılan pembe-turuncu mercan dalları, inci halkası; mercan pembesi → şeftali ağız
  SW({ id: 'mercankilic', ad: 'Mercan Kılıcı', minLvl: 2, set: 'deniz' },
    { col: '#ff7a9c', col2: '#ffd2a6', fx: 'grad', L: 0.72, metal: 0xfff0e6, grip: 0x3fb3b0, shroud: 'round', btn: '#ffd2a6', trail: '#ff8aa8' },
    (g, r) => {
      part(g, 'mercan:coral', k => {
        const cc = (x, y, z) => C('#ff6f61').lerp(C('#ffb38a'), cl((y - 0.1) / 0.12, 0, 1));
        for (const sd of [-1, 1]) {
          const P = []; for (let i = 0; i <= 8; i++) { const t = i / 8; P.push([sd * (0.012 + t * 0.07 - t * t * 0.02), 0.11 + t * 0.03 + t * t * 0.07, 0]); }
          tube(k, P, 0.0095, 0.0055, cc);
          for (const [t0, dx, dy] of [[3, 0.03, 0.035], [5, -0.012, 0.05], [6, 0.03, 0.02]]) {
            const a = P[t0], Q = [a, [a[0] + sd * dx * 0.5, a[1] + dy * 0.6, 0.004], [a[0] + sd * dx, a[1] + dy, 0.006]];
            tube(k, Q, 0.006, 0.004, cc);
          }
        }
      }, M.gloss(r));
      part(g, 'mercan:pearls', k => {
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; k.add(G.sphere(12), '#fff8f2', [Math.sin(a) * 0.024, 0.118, Math.cos(a) * 0.024], 0, 0.0075); }
        k.add(G.sphere(14), '#fff8f2', [0, -0.106, 0], 0, 0.014);
      }, mat('pr:pearl', () => rimify(vcMat({ roughness: 0.15, metalness: 0.15, envMapIntensity: 1.3 }), 0xffe6f2, 0.5, 2)));
    });

  // Kum Saati Kılıcı: yan yatmış altın kum saati balçak (camında kum), altın → turuncu yıldız tozlu ağız
  SW({ id: 'kumsaatikilic', ad: 'Kum Saati Kılıcı', minLvl: 4, set: 'col' },
    { col: '#ffcf4a', col2: '#ff8f3a', fx: 'stars', L: 0.74, metal: 0xe8c070, grip: 0x8a5a3a, shroud: 'crown', btn: '#7ff0ff', trail: '#ffc04a' },
    (g, r) => {
      part(g, 'kumsaati:glass', k => {
        const sand = (x, y, z) => (y < 0.112 + Math.abs(x) * 0.12 - 0.004 ? C('#ffc24a') : C('#e4f8ff'));
        for (const sd of [-1, 1]) k.add(G.sphere(20), sand, [sd * 0.043, 0.116, 0], 0, [0.04, 0.024, 0.024]);
      }, M.gloss(r));
      part(g, 'kumsaati:gold', k => {
        for (const sd of [-1, 1]) {
          k.add(G.cyl(1, 1, 24), '#ffd25a', [sd * 0.086, 0.116, 0], [0, 0, PI / 2], [0.03, 0.008, 0.03]);
          k.add(G.sphere(12), '#ffe58a', [sd * 0.094, 0.116, 0], 0, 0.009);
        }
        for (const [y, z] of [[0.142, 0], [0.094, 0.02], [0.094, -0.02]]) k.seg([-0.084, y, z], [0.084, y, z], 0.0032, '#ffd25a', 0.0032, 8);
      }, M.metal(r));
    });

  // Çark Kılıcı: iki yanda dönen bakır-altın çarklar, kabzada kurmalı anahtar; gök mavisi ağızda beyaz şeritler
  function gear(k, x, y, z, R, n, col, col2) {
    k.add(G.torus(TAU, 0.22, 36), col, [x, y, z], 0, [R, R, R * 1.2]);
    for (let i = 0; i < n; i++) { const a = i / n * TAU; k.add(G.rbox(2), col, [x + Math.sin(a) * R * 1.18, y + Math.cos(a) * R * 1.18, z], [0, 0, -a], [R * 0.32, R * 0.36, R * 0.42]); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; k.seg([x, y, z], [x + Math.sin(a) * R, y + Math.cos(a) * R, z], R * 0.12, col, R * 0.12, 6); }
    k.add(G.cyl(1, 1, 16), col2, [x, y, z], [PI / 2, 0, 0], [R * 0.3, R * 0.5, R * 0.3]);
  }
  SW({ id: 'carkkilic', ad: 'Çark Kılıcı', minLvl: 5, set: 'atolye' },
    { col: '#5fd2ff', col2: '#ffffff', fx: 'stripe', sn: 5, sk: 2, L: 0.74, metal: 0xe0a060, grip: 0x3a4a6a, shroud: 'classic', btn: '#ffd23f', trail: '#5fd2ff' },
    (g, r) => {
      part(g, 'cark:gears', k => {
        gear(k, 0.052, 0.118, 0, 0.032, 9, '#ffcf5a', '#e08a3a');
        gear(k, -0.05, 0.11, 0, 0.026, 8, '#e8954a', '#ffcf5a');
        // kurmalı anahtar (kabza ucunda)
        for (const sd of [-1, 1]) k.add(G.torus(TAU, 0.3, 24), '#ffcf5a', [sd * 0.026, -0.13, 0], 0, [0.024, 0.018, 0.024]);
        k.seg([0, -0.1, 0], [0, -0.13, 0], 0.006, '#ffcf5a', 0.006, 8);
        k.add(G.sphere(10), '#e08a3a', [0, -0.13, 0], 0, 0.009);
      }, M.metal(r));
    });

  // Gökkuşağı Kılıcı: bulut balçak, üstünde gökkuşağı yayı; rengi akan gökkuşağı ağız
  SW({ id: 'gokkusagikilic', ad: 'Gökkuşağı Kılıcı', minLvl: 7, set: 'gokkusagi' },
    { col: '#ff7fd0', rainbow: true, L: 0.78, metal: 0xffffff, grip: 0x9fd8ff, shroud: 'crown', btn: '#ffffff' },
    (g, r) => {
      part(g, 'gk:cloud', k => {
        for (const sd of [-1, 1]) for (const [x, y, s] of [[0.055, 0.112, 0.024], [0.078, 0.118, 0.018], [0.036, 0.122, 0.018], [0.064, 0.13, 0.017]]) k.add(G.sphere(14), '#ffffff', [sd * x, y, 0.004], 0, s);
        rainbowArc(k, 0, 0.122, 0, 0.066, 0.0055);
      }, M.gloss(r));
    });

  // EFSANE: Ejderha Kanadı Kılıcı — balçakta altın damarlı leylak ejderha kanatları, yıldız tozlu leylak → pembe ağız
  SW({ id: 'ejderkanatkilic', ad: 'Ejderha Kanadı Kılıcı', minLvl: 0, legendary: true },
    { col: '#b98aff', col2: '#ffb0ea', fx: 'stars', L: 0.8, metal: 0xf2d58a, grip: 0x5a3a8a, shroud: 'crown', btn: '#ffb0ea', trail: '#c99bff' },
    (g, r) => {
      part(g, 'ejk:wings', k => { wings(k, 0.95, 0.016, 0.11, 0, '#c9a3ff', '#ffd86a', 0.3); }, M.shell(r));
      part(g, 'ejk:gem', k => { k.add(G.sphere(14), '#ff9ae6', [0, 0.118, 0.022], 0, [0.011, 0.015, 0.007]); }, M.glow('ejkGem', 1.0), true);
    });

  // BOSS (Koca Bukalemun): Bukalemunun Renk Kılıcı — kıvrık bukalemun kuyruğu kabza, balçakta iki sevimli bukalemun gözü; yeşil → pembe ağız
  SW({ id: 'bukalemunkilic', ad: 'Bukalemunun Renk Kılıcı', minLvl: 0, boss: true },
    { col: '#7dff6a', col2: '#ff7ad9', fx: 'grad', L: 0.8, metal: 0xc8f0b0, grip: 0x4aa04a, shroud: 'round', btn: '#ff7ad9', trail: '#9dff6a' },
    (g, r) => {
      part(g, 'buk:tail', k => {
        const P = [], n = 22; for (let i = 0; i <= n; i++) { const t = i / n, a = t * 1.6 * TAU, R = 0.038 * (1 - t * 0.8); P.push([Math.sin(a) * R, -0.135 + Math.cos(a) * R + 0.038, 0]); }
        tube(k, P, 0.012, 0.004, (x, y, z) => C('#5ad84a').lerp(C('#ff7ad9'), cl(-(y + 0.1) / 0.08, 0, 1)));
        for (const sd of [-1, 1]) {
          k.add(G.sphere(18), '#6ee05a', [sd * 0.036, 0.13, 0.004], 0, 0.021);
          k.add(G.sphere(14), '#ffffff', [sd * 0.04, 0.132, 0.019], 0, [0.011, 0.012, 0.006]);
          k.add(G.sphere(10), '#2a2a3a', [sd * 0.041, 0.132, 0.024], 0, [0.0055, 0.0065, 0.003]);
          k.add(G.sphere(6), '#ffffff', [sd * 0.039, 0.135, 0.026], 0, 0.0022);
        }
        for (const [y, c] of [[-0.05, '#ffd23f'], [-0.02, '#ff7ad9'], [0.01, '#5ab8ff'], [0.04, '#ffd23f']]) k.add(G.sphere(10), c, [0, y, 0.0185], 0, [0.006, 0.006, 0.003]);
      }, M.gloss(r));
    });

  // BOSS (Koca Fırtına Bulutu): Pırıl'ın Işık Kılıcı — Pırıl'ın yeşil ibiği ve kanatları balçakta, sapın çevresinde 5 ejderha ışığı
  SW({ id: 'pirilkilic', ad: "Pırıl'ın Işık Kılıcı", minLvl: 0, boss: true },
    { col: '#fff2a8', col2: '#c99bff', fx: 'stars', L: 0.84, metal: 0xf6e3a0, grip: 0xb48cff, shroud: 'crown', btn: '#ffffff', haloCol: '#e2c4ff', trail: '#ffe9a0' },
    (g, r) => {
      part(g, 'piril:crest', k => {
        for (const [x, rz, h] of [[0, 0, 0.05], [-0.026, 0.55, 0.038], [0.026, -0.55, 0.038]]) k.add(G.sphere(16), (xx, y) => C('#4fd07a').lerp(C('#c4ffb0'), cl((y - 0.1) / 0.08, 0, 1)), [x, 0.128 + h * 0.4, -0.016], [0, 0, rz], [0.017, h, 0.01]);
        wings(k, 0.6, 0.018, 0.112, 0, '#c9a3ff', '#ffd86a', 0.3);
      }, M.gloss(r));
      part(g, 'piril:lights', k => {
        ISIK.forEach((c, i) => { const a = i / 5 * TAU; k.add(G.sphere(12), c, [Math.sin(a) * 0.022, 0.06, Math.cos(a) * 0.022], 0, 0.0075); });
      }, M.glow('pirilLights', 1.1), true);
    });

  // ════════════════════════ DEĞNEKLER (büyücü + karma) ════════════════════════
  // WN(def, değnek tanımı, süs): motorun tahta değneği (ışıklı uç) + uçta bu değneğe özel süs
  const WN = (def, wand, deco) => {
    ITEMS.defineWand(def.id, Object.assign({ motif: 'none' }, wand));
    W(Object.assign({ heroClass: 'wizard' }, def), r => {   // değnek + uç süsü oyun ölçeğinde okunsun: hepsi 1,22 kat
      const inner = K.buildSword(def.id, r), g = new THREE.Group(); inner.scale.setScalar(1.22);
      if (deco) deco(inner, r, wand.L);
      g.add(inner); g.fzTip = inner.fzTip;
      return g;
    });
  };

  // Yıldız Değneği (başlangıç): mor çubuk, ucunda parlayan altın yıldız
  WN({ id: 'yildizdegnegi', ad: 'Yıldız Değneği', minLvl: 0 },
    { wood: '#6a4fa0', col: '#fff3b0', L: 0.5, band: '#ffd86a', tipP: [0, 0.545, 0.016], tipS: [0.014, 0.014, 0.008], tipI: 2.4 },
    (g, r, L) => {
      part(g, 'yd:star', k => { k.add(flatGeo(starShape(0.062, 0.029), 0.024, 0.007), '#ffd23f', [0, L + 0.045, 0]); }, M.glow('ydStar', 0.55));
      part(g, 'yd:bits', k => { for (const [x, y] of [[0.06, 0.03], [-0.055, 0.075], [0.045, 0.1]]) k.add(G.sphere(8), '#fff3b0', [x, L + y, 0], 0, 0.007); }, M.light('#fff3b0', 2.2), true);
    });

  // Mantar Değneği: krem sap, ucunda parlayan benekli kırmızı mantar
  WN({ id: 'mantardegnek', ad: 'Mantar Değneği', minLvl: 1, set: 'mantar' },
    { wood: '#e8d6b0', col: '#9fffd0', L: 0.5, band: '#ff6a6a', tipP: [0, 0.505, 0], tipS: [0.022, 0.016, 0.022], tipI: 1.8 },
    (g, r, L) => {
      part(g, 'md:cap', k => {
        k.add(G.hemi(32), '#ff4f5e', [0, L + 0.01, 0], 0, [0.075, 0.06, 0.075]);
        k.add(G.cyl(1, 1, 32), '#fff1d6', [0, L + 0.009, 0], 0, [0.072, 0.006, 0.072]);
      }, M.gloss(r));
      part(g, 'md:dots', k => {
        for (const [th, ph] of [[0.15, 0], [0.8, 0.4], [0.85, 1.7], [0.8, 3.0], [0.85, 4.3], [0.8, 5.5], [0.5, 1.0], [0.5, 3.6]]) {
          const [p, q] = onEll([0.075, 0.06, 0.075], L + 0.01, th, ph); k.add(G.sphere(10), '#f4fff0', p, q, [0.012, 0.004, 0.012]);
        }
      }, M.glow('mdDot', 0.75), true);
    });

  // Deniz Kabuğu Değneği: turkuaz sap, ucunda pembe yelpaze deniz kabuğu ve önünde parlayan inci
  WN({ id: 'kabukdegnek', ad: 'Deniz Kabuğu Değneği', minLvl: 2, set: 'deniz' },
    { wood: '#4fb0b0', col: '#fff6f0', L: 0.52, band: '#ffb0c0', tipP: [0, 0.565, 0.02], tipS: [0.022, 0.022, 0.022], tipI: 1.5 },
    (g, r, L) => {
      part(g, 'kd:shell', k => {
        for (let i = 0; i < 9; i++) { const a = (i - 4) / 4 * 1.15; k.add(G.capsule(1, 10), i & 1 ? '#ffc6d0' : '#fff0e2', [Math.sin(a) * 0.04, L + 0.012 + Math.cos(a) * 0.04, 0], [0, 0, -a], [0.0125, 0.042, 0.009]); }
        k.add(G.sphere(12), '#ffb0c0', [0, L + 0.006, 0.004], 0, [0.016, 0.01, 0.01]);
      }, M.shell(r));
    });

  // İnci Asası: uzun leylak asa, mercan pençeler kocaman parlayan inciyi tutuyor, pembe kurdele
  WN({ id: 'inciasa', ad: 'İnci Asası', minLvl: 3 },
    { wood: '#c9b0f0', col: '#fff6ff', L: 0.68, band: '#ff9ac0', tipP: [0, 0.725, 0], tipS: [0.036, 0.036, 0.036], tipI: 1.35 },
    (g, r, L) => {
      part(g, 'ia:prongs', k => {
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * TAU + 0.4, P = [];
          for (let j = 0; j <= 6; j++) { const t = j / 6, R = 0.012 + Math.sin(t * PI * 0.9) * 0.034; P.push([Math.sin(a) * R, L - 0.005 + t * 0.075, Math.cos(a) * R]); }
          tube(k, P, 0.006, 0.0035, '#ff8a7a');
        }
        for (const sd of [-1, 1]) k.add(G.sphere(14), '#ff9ac0', [sd * 0.024, L - 0.03, 0.012], [0, 0, sd * 0.5], [0.022, 0.013, 0.008]);
        k.add(G.sphere(10), '#ff9ac0', [0, L - 0.03, 0.016], 0, 0.009);
      }, M.gloss(r));
    });

  // Kum Saati Değneği: ucunda altın çerçeveli minik kum saati, ortasında ışık
  WN({ id: 'kumsaatidegnek', ad: 'Kum Saati Değneği', minLvl: 4, set: 'col' },
    { wood: '#a0703a', col: '#ffd86a', L: 0.5, band: '#ffe0a0', tipP: [0, 0.568, 0], tipS: [0.012, 0.012, 0.012], tipI: 2.2 },
    (g, r, L) => {
      part(g, 'ksd:glass', k => {
        k.add(G.sphere(20), (x, y) => (y < L + 0.034 ? C('#ffc24a') : C('#e4f8ff')), [0, L + 0.04, 0], 0, [0.03, 0.032, 0.03]);
        k.add(G.sphere(20), (x, y) => (y < L + 0.088 ? C('#ffc24a') : C('#e4f8ff')), [0, L + 0.096, 0], 0, [0.03, 0.032, 0.03]);
      }, M.gloss(r));
      part(g, 'ksd:gold', k => {
        for (const y of [L + 0.006, L + 0.13]) k.add(G.cyl(1, 1, 24), '#ffd25a', [0, y, 0], 0, [0.04, 0.009, 0.04]);
        for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; k.seg([Math.sin(a) * 0.034, L + 0.006, Math.cos(a) * 0.034], [Math.sin(a) * 0.034, L + 0.13, Math.cos(a) * 0.034], 0.0035, '#ffd25a', 0.0035, 6); }
        k.add(G.sphere(12), '#ffe58a', [0, L + 0.142, 0], 0, 0.011);
      }, M.metal(r));
    });

  // Kurmalı Anahtar Değneği: bakır sap, ucunda altın kurma anahtarı, ortasında mavi ışık
  WN({ id: 'anahtardegnek', ad: 'Kurmalı Anahtar Değneği', minLvl: 5, set: 'atolye' },
    { wood: '#c07a3a', col: '#7fe0ff', L: 0.5, band: '#ffcf5a', tipP: [0, 0.56, 0.014], tipS: [0.016, 0.016, 0.01], tipI: 2.2 },
    (g, r, L) => {
      part(g, 'ad:key', k => {
        for (const sd of [-1, 1]) k.add(G.torus(TAU, 0.28, 28), '#ffcf5a', [sd * 0.046, L + 0.06, 0], [0, 0, sd * 0.15], [0.042, 0.036, 0.042]);
        k.add(G.cyl(1, 1, 20), '#ffcf5a', [0, L + 0.06, 0], [PI / 2, 0, 0], [0.018, 0.022, 0.018]);
        kcyl(k, L - 0.01, L + 0.045, 0.011, 0.011, '#ffcf5a', 12);
      }, M.metal(r));
    });

  // Bulut Değneği: açık mavi sap, ucunda pofuduk bulut, üstünde gökkuşağı yayı ve güneş ışığı
  WN({ id: 'bulutdegnek', ad: 'Bulut Değneği', minLvl: 6, set: 'gokkusagi' },
    { wood: '#9ec8f0', col: '#fff3b0', L: 0.5, band: '#ffffff', tipP: [0, 0.6, 0.012], tipS: [0.017, 0.017, 0.012], tipI: 2.3 },
    (g, r, L) => {
      part(g, 'bd:cloud', k => {
        for (const [x, y, s] of [[0, 0.03, 0.034], [0.035, 0.022, 0.026], [-0.035, 0.022, 0.026], [0.018, 0.05, 0.026], [-0.02, 0.048, 0.024], [0.055, 0.012, 0.018], [-0.055, 0.012, 0.018]]) k.add(G.sphere(14), '#ffffff', [x, L + y, 0], 0, s);
        rainbowArc(k, 0, L + 0.06, -0.008, 0.06, 0.006);
      }, M.soft(r));
    });

  // EFSANE: Ejderha Yıldızı Asası — uzun gece mavisi asa, iki ejderha kanadı parlayan yıldızı kucaklıyor, hilal ay
  WN({ id: 'ejderyildizasa', ad: 'Ejderha Yıldızı Asası', minLvl: 0, legendary: true },
    { wood: '#3e3a7a', col: '#fff0a0', L: 0.64, band: '#ffd86a', tipP: [0, 0.71, 0.01], tipS: [0.026, 0.026, 0.02], tipI: 2.3 },
    (g, r, L) => {
      part(g, 'eya:wings', k => { wings(k, 0.75, 0.012, L + 0.02, -0.006, '#c9a3ff', '#ffd86a', 0.55); }, M.shell(r));
      part(g, 'eya:moon', k => {
        const m = new THREE.Shape(); m.moveTo(0.03, 0.05); m.bezierCurveTo(-0.06, 0.07, -0.065, -0.05, 0.03, -0.045); m.bezierCurveTo(-0.018, -0.02, -0.016, 0.024, 0.03, 0.05);
        k.add(flatGeo(m, 0.012, 0.003), '#fff3b0', [0, L + 0.07, -0.016]);
        k.add(flatGeo(starShape(0.016, 0.007), 0.006, 0.002), '#ffd23f', [0.045, L + 0.115, 0]);
      }, M.glow('eyaMoon', 0.7), true);
    });

  // BOSS (Koca Bukalemun, büyücü): Bukalemunun Renk Değneği — yeşil sap, uçta kıvrık renk değiştiren bukalemun kuyruğu
  WN({ id: 'bukalemundegnek', ad: 'Bukalemunun Renk Değneği', minLvl: 0, boss: true },
    { wood: '#4aa04a', col: '#ff8ae0', L: 0.54, band: '#ffd23f', tipP: [0, 0.585, 0], tipS: [0.022, 0.022, 0.022], tipI: 1.9 },
    (g, r, L) => {
      part(g, 'bd2:tail', k => {
        const P = [], n = 26; for (let i = 0; i <= n; i++) { const t = i / n, a = PI + t * 1.75 * TAU, R = 0.055 * (1 - t * 0.78); P.push([Math.sin(a) * R, L + 0.045 + Math.cos(a) * R, 0]); }
        tube(k, P, 0.011, 0.004, (x, y, z) => C('#5ad84a').lerp(C('#5ab8ff'), cl(x * 12 + 0.5, 0, 1)).lerp(C('#ff7ad9'), cl((y - L - 0.05) * 14, 0, 1)));
      }, M.gloss(r));
    });

  // BOSS (Koca Fırtına Bulutu, büyücü): Pırıl'ın Işık Değneği — leylak asa, ucunda Pırıl'ın yeşil ibiği, çevresinde 5 ejderha ışığı
  WN({ id: 'pirildegnek', ad: "Pırıl'ın Işık Değneği", minLvl: 0, boss: true },
    { wood: '#b48cff', col: '#ffffff', L: 0.62, band: '#ffd86a', tipP: [0, 0.675, 0], tipS: [0.028, 0.028, 0.028], tipI: 1.8 },
    (g, r, L) => {
      part(g, 'pd:crest', k => {
        for (const [x, rz, h] of [[0, 0, 0.055], [-0.03, 0.6, 0.042], [0.03, -0.6, 0.042]]) k.add(G.sphere(16), (xx, y) => C('#4fd07a').lerp(C('#c4ffb0'), cl((y - L) / 0.1, 0, 1)), [x, L + 0.065 + h * 0.4, -0.02], [0, 0, rz], [0.019, h, 0.01]);
        wings(k, 0.55, 0.02, L + 0.03, -0.01, '#c9a3ff', '#ffd86a', 0.4);
      }, M.gloss(r));
      part(g, 'pd:lights', k => { ISIK.forEach((c, i) => { const a = i / 5 * TAU; k.add(G.sphere(12), c, [Math.sin(a) * 0.05, L + 0.055 + Math.cos(a) * 0.05, 0.012], 0, 0.009); }); }, M.glow('pdLights', 1.1), true);
    });

  // ════════════════════════ TAÇLAR VE ŞAPKALAR ════════════════════════
  const H = (def, build) => ITEMS.register('hat', def, build);
  const hatGroup = () => { const g = new THREE.Group(), h = new THREE.Group(); g.add(h); return [g, h]; };
  // taç halkası: başın üst kısmına oturan halka (h içinde y = 0), yarıçap R
  const crownH = h => { h.position.set(0, 0.19, -0.045); h.rotation.set(-0.2, 0, 0); h.scale.setScalar(1.08); };
  const BAND = [0.3, 0.3, 0.33];

  // Pırıl İbiği Taç: nane yeşili alın bandı, önünde Pırıl'ınki gibi üç yeşil dilimli ibik, altın yıldız
  H({ id: 'pirilibik', ad: 'Pırıl İbiği Taç', minLvl: 0 }, r => {
    const [g, h] = hatGroup(); crownH(h);
    part(h, 'pi:band', k => {
      k.add(G.torus(TAU, 0.075, 64), '#7fe0b0', [0, 0, 0], [PI / 2, 0, 0], BAND);
      const gr = (x, y) => C('#3fc070').lerp(C('#b8ffb0'), cl((y - 0.02) / 0.18, 0, 1));
      for (const [x, rz, hh, z] of [[0, 0, 0.135, 0.318], [-0.11, 0.5, 0.105, 0.295], [0.11, -0.5, 0.105, 0.295]]) k.add(G.sphere(20), gr, [x, 0.03 + hh * 0.75, z], [-0.25, Math.atan2(x, z), rz], [0.072, hh, 0.038]);
    }, M.gloss(r));
    part(h, 'pi:star', k => { k.add(flatGeo(starShape(0.03, 0.014), 0.014, 0.004), '#ffd23f', [0, 0.012, 0.345], [-0.25, 0, 0]); }, M.glow('piStar', 0.6), true);
    return g;
  });

  // Mantar Şapka: kocaman kırmızı mantar şapkası, parlayan beyaz benekler, altında krem renkli yaprakçıklar
  const MS = [0.4, 0.26, 0.4];
  H({ id: 'mantarsapka', ad: 'Mantar Şapka', minLvl: 1, set: 'mantar' }, r => {
    const [g, h] = hatGroup();
    h.position.set(0, 0.19, -0.05); h.rotation.set(-0.4, 0, 0.06); h.scale.setScalar(0.92);
    part(h, 'ms:cap', k => {
      const d = new THREE.SphereGeometry(1, 48, 20, 0, TAU, 0, PI * 0.55); d.scale(MS[0], MS[1], MS[2]);
      k.add(d, (x, y) => C('#ff4050').lerp(C('#ff7a6a'), cl(1 - y / 0.26, 0, 1) * 0.6));
      const ring = new THREE.RingGeometry(0.29, 0.396, 48, 1);
      k.add(ring, (x, y, z) => (fr(Math.atan2(x, z) / TAU * 40) < 0.5 ? C('#fff1d6') : C('#ecd2a8')), [0, -0.038, 0], [PI / 2, 0, 0]);
    }, M.shell(r));
    part(h, 'ms:dots', k => {
      const R = mulberry32(12);
      for (let i = 0; i < 14; i++) { const th = 0.2 + (i % 4) * 0.33 + R() * 0.1, ph = i * 2.4 + R() * 0.3, s = 0.03 + R() * 0.018; const [p, q] = onEll(MS, 0, th, ph); k.add(G.sphere(14), '#fbfff4', p, q, [s, 0.008, s]); }
    }, M.glow('msDot', 0.55), true);
    g.fzHatIn = { h, c: [0, 0, 0], r: [0.36, 0.25, 0.37], y0: -0.04, fade: 0.08 };
    return g;
  });

  // Deniz Kabuğu Taç: altın halka üstünde yelpaze deniz kabukları, aralarında inciler
  H({ id: 'kabuktac', ad: 'Deniz Kabuğu Taç', minLvl: 2, set: 'deniz' }, r => {
    const [g, h] = hatGroup(); crownH(h);
    part(h, 'kt:band', k => { k.add(G.torus(TAU, 0.1, 64), '#ffd25a', [0, 0, 0], [PI / 2, 0, 0], BAND); }, M.metal(r));
    part(h, 'kt:shells', k => {
      for (let s = 0; s < 7; s++) {
        const ph = (s - 3) / 7 * TAU, big = s === 3 ? 1.85 : 1.35, x = Math.sin(ph) * BAND[0], z = Math.cos(ph) * BAND[2];
        k.push([x, 0.012, z], [-0.1, ph, 0], big);
        for (let i = 0; i < 7; i++) { const a = (i - 3) / 3 * 1.1; k.add(G.capsule(1, 10), i & 1 ? '#ffc6d0' : '#fff0e2', [Math.sin(a) * 0.03, 0.03 + Math.cos(a) * 0.03, 0], [0, 0, -a], [0.01, 0.032, 0.0075]); }
        k.pop();
      }
      for (let s = 0; s < 7; s++) { const ph = (s - 2.5) / 7 * TAU; k.add(G.sphere(12), '#fff8f2', [Math.sin(ph) * (BAND[0] + 0.01), 0.015, Math.cos(ph) * (BAND[2] + 0.01)], 0, 0.014); }
    }, M.shell(r));
    return g;
  });

  // Ay Tacı: gümüş halka, önde parlayan hilal ay, çevresinde tel uçlarında minik yıldızlar (rüya tacı)
  H({ id: 'aytaci', ad: 'Ay Tacı', minLvl: 3 }, r => {
    const [g, h] = hatGroup(); crownH(h);
    part(h, 'at:band', k => {
      k.add(G.torus(TAU, 0.12, 64), '#e4ecff', [0, 0, 0], [PI / 2, 0, 0], BAND);
      for (let i = 0; i < 16; i++) { const ph = i / 16 * TAU; k.add(G.sphere(10), i & 1 ? '#b8c8ff' : '#ffffff', [Math.sin(ph) * (BAND[0] + 0.03), 0.004, Math.cos(ph) * (BAND[2] + 0.03)], 0, 0.011); }
      for (const ph of [-1.1, -0.55, 0.55, 1.1]) { const x = Math.sin(ph) * BAND[0], z = Math.cos(ph) * BAND[2]; k.seg([x, 0, z], [x * 1.02, 0.09 - Math.abs(ph) * 0.03, z * 1.02], 0.005, '#e4ecff', 0.004, 6); }
    }, M.gloss(r));
    part(h, 'at:moon', k => {
      const m = new THREE.Shape(); m.moveTo(0.04, 0.07); m.bezierCurveTo(-0.08, 0.095, -0.09, -0.07, 0.04, -0.06); m.bezierCurveTo(-0.025, -0.03, -0.022, 0.032, 0.04, 0.07);
      k.add(flatGeo(m, 0.02, 0.005), '#fff3b0', [0, 0.12, 0.34], [-0.2, 0, 0.25], 2.0);
      for (const ph of [-1.1, -0.55, 0.55, 1.1]) { const x = Math.sin(ph) * BAND[0] * 1.02, z = Math.cos(ph) * BAND[2] * 1.02; k.add(flatGeo(starShape(0.034, 0.015), 0.01, 0.003), '#ffe9a0', [x, 0.11 - Math.abs(ph) * 0.03, z], [0, ph, 0]); }
    }, M.glow('atMoon', 0.65), true);
    return g;
  });

  // Çöl Türbanı: krem-turuncu sarılı sevimli türban, önde altın çerçeveli turkuaz taş ve pembe tüy
  H({ id: 'colsapka', ad: 'Çöl Türbanı', minLvl: 4, set: 'col' }, r => {
    const [g, h] = hatGroup();
    h.position.set(0, 0.12, -0.03); h.rotation.set(-0.22, 0, 0); h.scale.setScalar(0.9);
    part(h, 'ct:cloth', k => {
      const d = new THREE.SphereGeometry(1, 40, 16, 0, TAU, 0, PI * 0.5); d.scale(0.3, 0.24, 0.31);
      k.add(d, '#fff0d0', [0, 0.04, 0]);
      for (let i = 0; i < 4; i++) k.add(G.torus(TAU, 0.17, 48), ['#ff9a3a', '#fff0d0', '#3ec8c0', '#fff0d0'][i], [0, 0.01 + i * 0.045, 0], [PI / 2 + (i & 1 ? 0.12 : -0.12), 0, 0], [0.315 - i * 0.03, 0.33 - i * 0.03, 0.3]);
    }, M.soft(r));
    part(h, 'ct:gem', k => {
      k.add(G.sphere(16), '#ffcf5a', [0, 0.07, 0.385], [-0.2, 0, 0], [0.042, 0.048, 0.02]);
      k.add(G.capsule(1, 12), (x, y) => C('#ff7aa8').lerp(C('#ffb050'), cl((y - 0.1) / 0.15, 0, 1)), [0.02, 0.17, 0.36], [-0.3, 0, -0.25], [0.024, 0.09, 0.009]);
    }, M.gloss(r));
    part(h, 'ct:stone', k => { k.add(G.sphere(16), '#3ee0d0', [0, 0.07, 0.402], [-0.2, 0, 0], [0.025, 0.03, 0.012]); }, M.glow('ctStone', 0.6), true);
    g.fzHatIn = { h, c: [0, 0, 0], r: [0.31, 0.27, 0.32], y0: -0.03, fade: 0.07 };
    return g;
  });

  // Kurmalı Anahtar Taç: bakır çark dişli halka, yanlarda minik çarklar, arkada kocaman altın kurma anahtarı
  H({ id: 'anahtartac', ad: 'Kurmalı Anahtar Taç', minLvl: 5, set: 'atolye' }, r => {
    const [g, h] = hatGroup(); crownH(h);
    part(h, 'akt:metal', k => {
      k.add(G.torus(TAU, 0.12, 64), '#e0904a', [0, 0, 0], [PI / 2, 0, 0], BAND);
      for (let i = 0; i < 12; i++) { const ph = i / 12 * TAU; k.add(G.rbox(2), '#ffcf5a', [Math.sin(ph) * BAND[0], 0.045, Math.cos(ph) * BAND[2]], [0, ph, 0], [0.042, 0.08, 0.018]); }
      for (const sd of [-1, 1]) { k.push([sd * 0.305, 0.02, 0.04], [0, sd * PI / 2, 0]); gear(k, 0, 0, 0, 0.034, 9, '#ffcf5a', '#e0904a'); k.pop(); }
      // arkada kurma anahtarı
      k.seg([0, 0.05, -0.31], [0, 0.09, -0.41], 0.016, '#ffcf5a', 0.016, 10);
      for (const sd of [-1, 1]) k.add(G.torus(TAU, 0.3, 28), '#ffcf5a', [sd * 0.075, 0.1, -0.43], 0, [0.07, 0.063, 0.07]);
      k.add(G.cyl(1, 1, 20), '#e0904a', [0, 0.1, -0.43], [PI / 2, 0, 0], [0.02, 0.026, 0.02]);
    }, M.metal(r));
    part(h, 'akt:gem', k => { k.add(G.sphere(14), '#6fd0ff', [0, 0.04, 0.338], 0, [0.022, 0.026, 0.012]); }, M.glow('aktGem', 0.7), true);
    return g;
  });

  // Bulut Taç: başın çevresinde pofuduk bulut halkası, önde küçük gökkuşağı, minik parlayan yıldızlar
  H({ id: 'buluttac', ad: 'Bulut Taç', minLvl: 6, set: 'gokkusagi' }, r => {
    const [g, h] = hatGroup(); crownH(h);
    part(h, 'bt:cloud', k => {
      const R = mulberry32(5);
      for (let i = 0; i < 26; i++) { const ph = i / 26 * TAU + R() * 0.1, s = 0.05 + R() * 0.03, up = i & 1 ? 0.035 : 0; k.add(G.sphere(16), (x, y) => C('#dfe9ff').lerp(C('#ffffff'), cl((y - 0.0) / 0.08, 0, 1)), [Math.sin(ph) * (BAND[0] + 0.01), up + R() * 0.02, Math.cos(ph) * (BAND[2] + 0.01)], 0, [s * 1.2, s * 0.9, s]); }
      k.push([0, 0.08, 0.35], [-0.15, 0, 0]); rainbowArc(k, 0, 0, 0, 0.12, 0.012); k.pop();
    }, M.soft(r));
    part(h, 'bt:stars', k => { for (const ph of [-1.4, 1.4, 2.6, -2.6]) k.add(flatGeo(starShape(0.02, 0.009), 0.008, 0.003), '#ffe9a0', [Math.sin(ph) * BAND[0], 0.075, Math.cos(ph) * BAND[2]], [0, ph, 0]); }, M.glow('btStar', 0.6), true);
    return g;
  });

  // EFSANE: Yıldız Taç — altın taç, beş parlayan yıldız uç, önde kocaman yıldız, renkli taşlar
  H({ id: 'yildiztac', ad: 'Yıldız Taç', minLvl: 0, legendary: true }, r => {
    const [g, h] = hatGroup(); crownH(h); h.scale.setScalar(0.9); h.position.y -= 0.012;   // yakın planda dev durmasın
    part(h, 'yt:gold', k => {
      k.add(G.cyl(1, 1, 64, true), '#ffd25a', [0, 0.03, 0], 0, [BAND[0], 0.07, BAND[2]]);
      for (const y of [0, 0.065]) k.add(G.torus(TAU, 0.1, 64), '#ffe58a', [0, y, 0], [PI / 2, 0, 0], [BAND[0], BAND[2], 0.3]);
      for (let i = 0; i < 6; i++) { const ph = (i + 0.5) / 6 * TAU; k.seg([Math.sin(ph) * BAND[0], 0.06, Math.cos(ph) * BAND[2]], [Math.sin(ph) * BAND[0] * 1.03, 0.125, Math.cos(ph) * BAND[2] * 1.03], 0.006, '#ffd25a', 0.004, 6); }
    }, M.metal(r));
    part(h, 'yt:stars', k => {
      for (let i = 0; i < 6; i++) { const ph = (i + 0.5) / 6 * TAU; k.add(flatGeo(starShape(0.042, 0.019), 0.012, 0.003), '#fff0a0', [Math.sin(ph) * BAND[0] * 1.03, 0.14, Math.cos(ph) * BAND[2] * 1.03], [0, ph, 0]); }
      k.add(flatGeo(starShape(0.085, 0.04), 0.024, 0.006), '#ffe14a', [0, 0.14, BAND[2] + 0.012], [-0.1, 0, 0]);
      for (let i = 0; i < 6; i++) { const ph = i / 6 * TAU; k.add(G.sphere(12), ['#ff5a8a', '#5ab8ff', '#6fe07a', '#c77bff', '#ffa040', '#3ee0d0'][i], [Math.sin(ph) * (BAND[0] + 0.006), 0.032, Math.cos(ph) * (BAND[2] + 0.006)], [0, ph, 0], [0.016, 0.016, 0.008]); }
    }, M.glow('ytStars', 0.65), true);
    return g;
  });

  // BOSS (Koca Pofuduk Mantar): Pofuduk Mantar Tacı — yosun yeşili halkada üç pofuduk mantar (ortadaki gülümsüyor), parlayan benekler
  H({ id: 'pofuduktac', ad: 'Pofuduk Mantar Tacı', minLvl: 0, boss: true }, r => {
    const [g, h] = hatGroup(); crownH(h);
    const SH = [[0, 0.17, 0.3, 1.6, '#c77bff'], [-0.2, 0.13, 0.22, 1.2, '#ff8fc8'], [0.2, 0.13, 0.22, 1.2, '#ff8fc8'], [0, 0.12, -0.17, 1.1, '#ff8fc8']];
    part(h, 'pt:body', k => {
      k.add(G.torus(TAU, 0.14, 64), '#6fcf7a', [0, 0, 0], [PI / 2, 0, 0], BAND);
      const R = mulberry32(8); for (let i = 0; i < 22; i++) { const ph = i / 22 * TAU; k.add(G.sphere(8), '#8fe08a', [Math.sin(ph) * BAND[0], 0.02 + R() * 0.01, Math.cos(ph) * BAND[2]], 0, 0.018 + R() * 0.008); }
      for (const [x, y, z, s, c] of SH) {
        k.seg([x * 0.95, 0, z * 0.95], [x, y - 0.03 * s, z], 0.028 * s, '#fff1d6', 0.024 * s, 12);
        k.add(G.sphere(24), c, [x, y, z], 0, [0.07 * s, 0.05 * s, 0.07 * s]);
        k.add(G.cyl(1, 1, 24), '#fff1d6', [x, y - 0.012 * s, z], 0, [0.066 * s, 0.006, 0.066 * s]);
      }
      face(k, 0, 0.125, 0.4, 0.085);
    }, M.soft(r));
    part(h, 'pt:dots', k => {
      for (const [x, y, z, s] of SH) for (const [th, ph] of [[0.1, 0], [0.75, 0.9], [0.75, -0.9], [0.8, 2.6], [0.8, -2.6], [0.6, PI]]) { const [p, q] = onEll([0.07 * s, 0.05 * s, 0.07 * s], y, th, ph); p[0] += x; p[2] += z; k.add(G.sphere(10), '#fff6a8', p, q, [0.011 * s, 0.004, 0.011 * s]); }
    }, M.glow('ptDots', 0.9), true);
    return g;
  });

  // BOSS (Kurmalı Koca Ayıcık): Ayıcık Kulaklı Taç — kahverengi peluş bant, iki kocaman ayıcık kulağı, önde kırmızı fiyonk, arkada kurma anahtarı
  H({ id: 'ayiciktac', ad: 'Ayıcık Kulaklı Taç', minLvl: 0, boss: true }, r => {
    const [g, h] = hatGroup(); crownH(h);
    part(h, 'ay:plush', k => {
      k.add(G.torus(TAU, 0.16, 64), '#b07a4a', [0, 0, 0], [PI / 2, 0, 0], BAND);
      for (const sd of [-1, 1]) {
        k.add(G.sphere(24), '#b07a4a', [sd * 0.2, 0.15, 0.04], [0, sd * 0.25, sd * -0.35], [0.11, 0.11, 0.05]);
        k.add(G.sphere(20), '#ffb0b8', [sd * 0.207, 0.15, 0.08], [0, sd * 0.25, sd * -0.35], [0.066, 0.066, 0.02]);
      }
      // fiyonk
      k.add(G.sphere(16), '#ff4f5e', [0, 0.02, 0.34], 0, [0.022, 0.02, 0.016]);
      for (const sd of [-1, 1]) k.add(G.sphere(20), '#ff4f5e', [sd * 0.045, 0.02, 0.333], [0, 0, sd * 0.25], [0.04, 0.028, 0.014]);
      for (const [x, y] of [[-0.05, 0.03], [0.04, 0.012], [0.055, 0.03], [-0.035, 0.01]]) k.add(G.sphere(8), '#ffffff', [x, y, 0.347], 0, [0.006, 0.006, 0.003]);
    }, M.soft(r));
    part(h, 'ay:key', k => {
      k.seg([0, 0.03, -0.31], [0, 0.05, -0.39], 0.012, '#ffcf5a', 0.012, 10);
      for (const sd of [-1, 1]) k.add(G.torus(TAU, 0.3, 28), '#ffcf5a', [sd * 0.05, 0.055, -0.41], 0, [0.046, 0.04, 0.046]);
      k.add(G.cyl(1, 1, 20), '#e0904a', [0, 0.055, -0.41], [PI / 2, 0, 0], [0.018, 0.024, 0.018]);
    }, M.metal(r));
    return g;
  });

  // ════════════════════════ PELERİNLER ════════════════════════
  // edge(x) → alt kenarın y'si (tuval pikseli); altı saydam kalır
  const EDGE = {
    scallop: (n, y0, d) => x => { const f = fr(x / 256 * n); return y0 + d * Math.sqrt(Math.max(0, 1 - (f * 2 - 1) ** 2)); },
    wave: (n, y0, d) => x => y0 + d * Math.sin(x / 256 * n * TAU),
    cloud: (n, y0, d) => x => { const f = fr(x / 256 * n); return y0 + d * Math.sqrt(Math.max(0, 1 - (f * 2 - 1) ** 2)) + 3 * Math.sin(x / 256 * TAU * 2); },
    wing: (n, y0, d) => x => { const f = fr(x / 256 * n); return y0 + d * (1 - Math.sqrt(Math.max(0, 1 - (f * 2 - 1) ** 2))) + 6 * Math.cos((x / 256 - 0.5) * PI); },
  };
  function capeFrame(g, S, edge) {
    const path = c => { c.beginPath(); c.moveTo(0, 0); c.lineTo(S, 0); for (let x = S; x >= 0; x -= 2) c.lineTo(x, edge(x)); c.closePath(); };
    const line = (c, dy = 0) => { c.beginPath(); for (let x = 0; x <= S; x += 2) x ? c.lineTo(x, edge(x) + dy) : c.moveTo(x, edge(x) + dy); };
    return { path, line };
  }
  function star(c, x, y, rr, a) { c.beginPath(); for (let i = 0; i < 10; i++) { const b = (a || 0) - PI / 2 + i * PI / 5, q = i & 1 ? rr * 0.45 : rr; c.lineTo(x + Math.cos(b) * q, y + Math.sin(b) * q); } c.closePath(); c.fill(); }
  function trim(g, S, F, col, w) { g.strokeStyle = col; g.lineWidth = w; F.line(g); g.stroke(); g.fillStyle = col; g.fillRect(0, 0, 6, S); g.fillRect(S - 6, 0, 6, S); g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 2; F.line(g, -w / 2); g.stroke(); }
  const vgrad = (g, S, stops) => { const gr = g.createLinearGradient(0, 0, 0, S); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); g.fillStyle = gr; g.fillRect(0, 0, S, S); };
  const dot = (c, x, y, rr, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill(); };
  const CP = (def, painter) => { ITEMS.paintCape(def.id, painter); ITEMS.register('cape', def); };

  // Ejderha Kanadı Pelerini: leylak ejderha kanadı, omuzdan yelpaze gibi açılan altın damarlar, kavisli kanat kenarı, üstte pullar
  CP({ id: 'ejderkanat', ad: 'Ejderha Kanadı Pelerini', minLvl: 0 }, (g, S) => {
    const e = EDGE.wing(4, 196, 34), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip();
    vgrad(g, S, ['#d9c2ff', '#b48cff', '#9a70f0']);
    // pullar (omuzlarda)
    for (let j = 0; j < 3; j++) for (let i = 0; i < 11; i++) { const x = i * 25 + (j & 1) * 12 + 4, y = 8 + j * 14; g.fillStyle = j & 1 ? '#c8a8ff' : '#a7f0e0'; g.beginPath(); g.arc(x, y, 11, 0, PI); g.fill(); g.strokeStyle = 'rgba(80,40,140,0.25)'; g.lineWidth = 1.5; g.stroke(); }
    // kanat damarları: kenardaki her kavis tepesine
    g.strokeStyle = '#ffd86a'; g.lineCap = 'round';
    for (let i = 0; i <= 4; i++) { const x = i * 64; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 30); g.quadraticCurveTo(lp(128, x, 0.5), 110, x, e(x) - 4); g.stroke(); }
    trim(g, S, F, '#7a52d0', 10);
    g.restore();
  });

  // Mantar Pelerini: kırmızı, kocaman beyaz benekler, altta krem yaprakçık şeritleri, fistolu kenar
  CP({ id: 'mantarpelerin', ad: 'Mantar Pelerini', minLvl: 1, set: 'mantar' }, (g, S, ge) => {
    const e = EDGE.scallop(6, 214, 20), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip(); ge.save(); F.path(ge); ge.clip();
    vgrad(g, S, ['#ff5a5e', '#ff3b4e', '#e62c44']);
    g.fillStyle = '#fff1d6'; g.fillRect(0, 180, S, 60);
    g.strokeStyle = '#e6c69a'; g.lineWidth = 3; for (let x = 4; x < S; x += 10) { g.beginPath(); g.moveTo(x, 184); g.lineTo(x, 240); g.stroke(); }
    for (const [x, y, rr] of [[50, 50, 24], [140, 36, 18], [214, 70, 26], [96, 112, 20], [184, 140, 18], [36, 150, 16], [130, 160, 10], [232, 20, 10]]) { dot(g, x, y, rr, '#fffaf0'); dot(ge, x, y, rr * 0.8, '#5a6a50'); }
    trim(g, S, F, '#ffffff', 10);
    g.restore(); ge.restore();
  });

  // Deniz Köpüğü Pelerini: turkuazdan derin maviye, beyaz köpük kabarcıkları, dalga desenli kenar
  CP({ id: 'denizkopugu', ad: 'Deniz Köpüğü Pelerini', minLvl: 2, set: 'deniz' }, (g, S, ge, R) => {
    const e = EDGE.wave(5, 222, 9), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip(); ge.save(); F.path(ge); ge.clip();
    vgrad(g, S, ['#9ff0e6', '#3cc8d0', '#1f8fc0']);
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 6;
    for (let j = 0; j < 4; j++) { g.beginPath(); for (let x = 0; x <= S; x += 4) { const y = 60 + j * 44 + 7 * Math.sin(x / 256 * TAU * 3 + j); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    for (let i = 0; i < 34; i++) { const x = R() * S, y = R() * 220, rr = 3 + R() * 9; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke(); dot(g, x - rr * 0.35, y - rr * 0.35, rr * 0.22, '#ffffff'); if (rr > 8) dot(ge, x, y, rr * 0.4, '#1c4a50'); }
    trim(g, S, F, '#ffffff', 12);
    g.restore(); ge.restore();
  });

  // Gece Pelerini: gece mavisi, parlayan hilal ay, yıldızlar ve yıldız tozu (rüya pelerini)
  CP({ id: 'gecepelerin', ad: 'Gece Pelerini', minLvl: 3 }, (g, S, ge, R) => {
    const e = EDGE.scallop(8, 224, 14), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip(); ge.save(); F.path(ge); ge.clip();
    vgrad(g, S, ['#3a4aa8', '#28306f', '#1c2052']);
    const moon = c => { c.beginPath(); c.arc(128, 96, 34, 0, TAU); c.fill(); };
    g.fillStyle = '#fff3b0'; moon(g); ge.fillStyle = '#9a8a40'; moon(ge);
    g.fillStyle = '#28306f'; g.beginPath(); g.arc(146, 86, 30, 0, TAU); g.fill(); ge.fillStyle = '#000'; ge.beginPath(); ge.arc(146, 86, 30, 0, TAU); ge.fill();
    for (let i = 0; i < 16; i++) { const x = R() * S, y = R() * 210, rr = 4 + R() * 7; g.fillStyle = '#ffe9a0'; star(g, x, y, rr, R()); ge.fillStyle = '#8a7a30'; star(ge, x, y, rr, 0); }
    for (let i = 0; i < 70; i++) { const x = R() * S, y = R() * 220; g.fillStyle = '#ffffff'; g.fillRect(x, y, 2, 2); ge.fillStyle = '#6a6aa0'; ge.fillRect(x, y, 2, 2); }
    trim(g, S, F, '#ffd86a', 9);
    g.restore(); ge.restore();
  });

  // Çöl Rüzgârı Pelerini: kum sarısından turuncuya, kıvrılan rüzgâr çizgileri, kum tepeleri, gülen güneş
  CP({ id: 'colruzgari', ad: 'Çöl Rüzgârı Pelerini', minLvl: 4, set: 'col' }, (g, S, ge) => {
    const e = EDGE.wave(3, 224, 10), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip(); ge.save(); F.path(ge); ge.clip();
    vgrad(g, S, ['#ffe9b0', '#ffc870', '#ff9a50']);
    dot(g, 128, 62, 30, '#ffd23f'); dot(ge, 128, 62, 26, '#806010');
    g.fillStyle = '#5a3a20'; for (const sd of [-1, 1]) { g.beginPath(); g.arc(128 + sd * 10, 58, 3.5, 0, TAU); g.fill(); }
    g.strokeStyle = '#5a3a20'; g.lineWidth = 3; g.beginPath(); g.arc(128, 64, 11, 0.2 * PI, 0.8 * PI); g.stroke();
    for (const [y, c] of [[170, '#f0a050'], [196, '#e08a40']]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, S); g.lineTo(0, y); for (let x = 0; x <= S; x += 4) g.lineTo(x, y - 18 * Math.sin(x / 256 * PI * 2 + y)); g.lineTo(S, S); g.closePath(); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 4; g.lineCap = 'round';
    for (const [x, y, s] of [[40, 120, 1], [180, 110, 1.2], [96, 146, 0.8], [210, 30, 0.7], [30, 30, 0.7]]) { g.beginPath(); g.moveTo(x - 30 * s, y); g.bezierCurveTo(x, y - 6 * s, x + 20 * s, y - 2 * s, x + 18 * s, y - 14 * s); g.arc(x + 10 * s, y - 14 * s, 8 * s, 0, -PI * 1.4, true); g.stroke(); }
    trim(g, S, F, '#c8763a', 10);
    g.restore(); ge.restore();
  });

  // Saat Kulesi Pelerini: lacivert, ortada kocaman parlayan saat kadranı, köşelerde altın çarklar
  CP({ id: 'saatkulesi', ad: 'Saat Kulesi Pelerini', minLvl: 5, set: 'atolye' }, (g, S, ge) => {
    const e = EDGE.scallop(7, 220, 16), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip(); ge.save(); F.path(ge); ge.clip();
    vgrad(g, S, ['#3a5aa8', '#2a3f80', '#1e2c5e']);
    const gearP = (c, x, y, rr, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, q = i % 2 ? rr : rr * 1.2; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fill(); dot(c, x, y, rr * 0.35, '#2a3f80'); };
    for (const [x, y, rr] of [[32, 40, 22], [224, 40, 22], [40, 180, 18], [216, 180, 18]]) gearP(g, x, y, rr, '#e8a050');
    dot(g, 128, 110, 62, '#ffd86a'); dot(g, 128, 110, 54, '#fff6e0'); dot(ge, 128, 110, 54, '#706040');
    g.fillStyle = '#2a3f80'; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; dot(g, 128 + Math.sin(a) * 44, 110 - Math.cos(a) * 44, i % 3 ? 3 : 6, '#2a3f80'); }
    g.strokeStyle = '#2a3f80'; g.lineCap = 'round'; g.lineWidth = 7; g.beginPath(); g.moveTo(128, 110); g.lineTo(128, 78); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(128, 110); g.lineTo(152, 120); g.stroke();
    dot(g, 128, 110, 6, '#ff6a6a');
    trim(g, S, F, '#ffcf5a', 10);
    g.restore(); ge.restore();
  });

  // Gökkuşağı Pelerini: yatay gökkuşağı şeritleri, altta bulut kenar, minik yıldızlar
  CP({ id: 'gokkusagipelerin', ad: 'Gökkuşağı Pelerini', minLvl: 7, set: 'gokkusagi' }, (g, S, ge, R) => {
    const e = EDGE.cloud(6, 216, 22), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip(); ge.save(); F.path(ge); ge.clip();
    RB.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 34, S, 35); });
    g.fillStyle = '#ffffff'; g.fillRect(0, 204, S, 60);
    for (let i = 0; i < 12; i++) { const x = R() * S, y = R() * 190; g.fillStyle = '#ffffff'; star(g, x, y, 5 + R() * 4, R()); ge.fillStyle = '#707070'; star(ge, x, y, 5, 0); }
    g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 3; F.line(g, -2); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 6, S); g.fillRect(S - 6, 0, 6, S);
    g.restore(); ge.restore();
  });

  // EFSANE: Ejderha Işıkları Pelerini — mor gece, beş renkli parlayan ejderha ışığı, yıldız tozu, altın kenar
  CP({ id: 'isiklarpelerin', ad: 'Ejderha Işıkları Pelerini', minLvl: 0, legendary: true }, (g, S, ge, R) => {
    const e = EDGE.wing(5, 200, 30), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip(); ge.save(); F.path(ge); ge.clip();
    vgrad(g, S, ['#5a3aa8', '#3a2478', '#24164e']);
    for (let i = 0; i < 80; i++) { const x = R() * S, y = R() * 220; g.fillStyle = '#ffffff'; g.fillRect(x, y, 2, 2); ge.fillStyle = '#8080c0'; ge.fillRect(x, y, 2, 2); }
    ISIK.forEach((c, i) => {
      const a = -PI / 2 + i / 5 * TAU, x = 128 + Math.cos(a) * 62, y = 108 + Math.sin(a) * 58;
      for (const [cv, k] of [[g, 1], [ge, 0.85]]) { const gr = cv.createRadialGradient(x, y, 1, x, y, 26); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); cv.globalAlpha = k; cv.fillStyle = gr; cv.beginPath(); cv.arc(x, y, 26, 0, TAU); cv.fill(); cv.globalAlpha = 1; }
    });
    g.fillStyle = '#ffe9a0'; star(g, 128, 108, 18, 0); ge.fillStyle = '#a09040'; star(ge, 128, 108, 18, 0);
    trim(g, S, F, '#ffd86a', 9);
    g.restore(); ge.restore();
  });

  // BOSS (Koca Kirpi Balık): Kirpi Balığın İnci Pelerini — inci beyazından pembeye, parlayan inciler, sevimli yuvarlak kirpi balık, dalgalı kenar
  CP({ id: 'kirpipelerin', ad: 'Kirpi Balığın İnci Pelerini', minLvl: 0, boss: true }, (g, S, ge, R) => {
    const e = EDGE.scallop(9, 222, 14), F = capeFrame(g, S, e);
    g.save(); F.path(g); g.clip(); ge.save(); F.path(ge); ge.clip();
    vgrad(g, S, ['#fff6fa', '#ffd8e6', '#ffb8d0']);
    // kirpi balık: yuvarlak sarı gövde, yumuşak dikenler, gülen yüz
    g.fillStyle = '#ffcf5a'; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; g.beginPath(); g.moveTo(128 + Math.cos(a - 0.12) * 40, 104 + Math.sin(a - 0.12) * 40); g.lineTo(128 + Math.cos(a) * 54, 104 + Math.sin(a) * 54); g.lineTo(128 + Math.cos(a + 0.12) * 40, 104 + Math.sin(a + 0.12) * 40); g.fill(); }
    dot(g, 128, 104, 42, '#ffd86a'); dot(g, 128, 112, 30, '#fff1c0');
    for (const sd of [-1, 1]) { dot(g, 128 + sd * 15, 96, 7, '#3a2418'); dot(g, 130 + sd * 15, 93, 2.5, '#ffffff'); dot(g, 128 + sd * 26, 110, 6, '#ff9ab0'); }
    g.strokeStyle = '#3a2418'; g.lineWidth = 3; g.beginPath(); g.arc(128, 108, 9, 0.15 * PI, 0.85 * PI); g.stroke();
    for (let i = 0; i < 26; i++) { const x = R() * S, y = R() * 214; if (Math.hypot(x - 128, y - 104) < 62) continue; const rr = 4 + R() * 5; dot(g, x, y, rr, '#ffffff'); dot(g, x - rr * 0.3, y - rr * 0.3, rr * 0.35, '#fff8ff'); dot(ge, x, y, rr * 0.8, '#806878'); }
    trim(g, S, F, '#ff8fb8', 10);
    g.restore(); ge.restore();
  });

  // ════════════════════════ BAŞLANGIÇ, SETLER, BOSS ÖDÜLLERİ ════════════════════════
  ITEMS.setStarter('isikkilic', 'yildizdegnegi');
  ITEMS.SETS.mantar = { ad: 'Mantar Seti', renk: '#7dffb0', parca: ['weapon:mantarkilic', 'hat:mantarsapka', 'cape:mantarpelerin'] };
  ITEMS.SETS.deniz = { ad: 'Deniz Seti', renk: '#ff8fb8', parca: ['weapon:mercankilic', 'hat:kabuktac', 'cape:denizkopugu'] };
  ITEMS.SETS.col = { ad: 'Çöl Seti', renk: '#ffd23f', parca: ['weapon:kumsaatikilic', 'hat:colsapka', 'cape:colruzgari'] };
  ITEMS.SETS.atolye = { ad: 'Saat Kulesi Seti', renk: '#6fd0ff', parca: ['weapon:carkkilic', 'hat:anahtartac', 'cape:saatkulesi'] };
  ITEMS.SETS.gokkusagi = { ad: 'Gökkuşağı Seti', renk: '#c99bff', parca: ['weapon:gokkusagikilic', 'hat:buluttac', 'cape:gokkusagipelerin'] };
  // Boss ödülleri her sınıfa açık (register boss için classLock koyar; burada kaldırıyoruz: silahın kendi türü yine geçerli)
  for (const slot of ['weapon', 'hat', 'cape']) for (const b of ITEMS.BASES[slot]) if (b.boss) delete b.classLock;
  // anahtar = HUYSUZ.boss kimliği (07_game bossItem: ITEMS.bossReward(e.type, sınıf, seviye))
  Object.assign(ITEMS.BOSS_GIFT, {
    kocaPofudukMantar: { warrior: ['hat', 'pofuduktac'], wizard: ['hat', 'pofuduktac'], hybrid: ['hat', 'pofuduktac'] },
    kocaKirpiBalik: { warrior: ['cape', 'kirpipelerin'], wizard: ['cape', 'kirpipelerin'], hybrid: ['cape', 'kirpipelerin'] },
    kocaBukalemun: { warrior: ['weapon', 'bukalemunkilic'], wizard: ['weapon', 'bukalemundegnek'], hybrid: ['weapon', 'bukalemunkilic'] },
    kocaAyicik: { warrior: ['hat', 'ayiciktac'], wizard: ['hat', 'ayiciktac'], hybrid: ['hat', 'ayiciktac'] },
    kocaFirtinaBulutu: { warrior: ['weapon', 'pirilkilic'], wizard: ['weapon', 'pirildegnek'], hybrid: ['weapon', 'pirilkilic'] },
  });
})();
