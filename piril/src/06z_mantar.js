/* ── Bölüm 1: Işıklı Mantar Vadisi (Feza ile Pırıl) ──
   Alacakaranlıkta dev, parlayan mantarlar vadisi. İlk bölüm: oyuncuyu nazikçe öğretir (ilk oda huysuzsuz, sonra tek tük Zıp Mantarcık).
     1. Parıltı Çayırı      yumuşak yosun, minik ışıklı mantar kümeleri, şarkı söyleyen mantarlar (sırayla dokun → ezgi + şeker)
     2. Dev Mantar Ormanı   dev şemsiye mantarlar, raf mantarı merdivenleri, ZIPLATAN MANTARLAR (Feza'yı yay çizerek fırlatır)
     3. Işıklı Dere         ışıl ışıl akan sığ dere (içinden yürünür: su sıçrar), yosunlu taşlar, mantar köprüsü, basamak taşları
     4. Kök Tünelleri       dev kök kemerleri altında, asılı ışıklı yosun damlaları, dev yaprak altları
     Arena: Pofuduk Çayırı — dev mantar çemberi, peri halkası; Koca Pofuduk Mantar (src/05z_mantar.js). Işık: isik1.
   Gizli köşeler: Peri Halkası (yan odada: ortasına basınca mantarlar sırayla yanar → altın şeker + çıkartma), yarı gömülü ışıklı
   palamut hazineleri, tekmelenince parıltı saçan pofuduk toplar. Atmosfer: süzülen ışık tozları (sporlar; böcek DEĞİL, tek çizim,
   gölgelendiricide hareket), dere tınısı, damla sesleri.
   Genel ad: MANTAR. Sesler: SES'e istek (pr_mantar_*, pp_mantar_*). Biçim: PIRIL.md › 5, src/SPEC.md › kur api. */
const MANTAR = (() => {
  'use strict';
  const PI = Math.PI;
  const hyp = Math.hypot;
  const OK = () => typeof ODAKIT !== 'undefined' && ODAKIT;
  const inZone = () => typeof GAME !== 'undefined' && GAME.L && GAME.L.Z && GAME.L.Z.id === 'mantar';
  const live = () => typeof GAME !== 'undefined' && GAME.state === 'play' && !GAME.paused && GAME.P && !GAME.P.dead;
  const said = new Set();
  let sayAt = -99;
  // anlatıcı / Pırıl cümlesi (kayıt yoksa susar): once → oyun başına bir kez; arada en az 6 s
  function say(key, o = {}) {
    if (typeof GAME === 'undefined' || !GAME.halaApi) return false;
    if (!(typeof AUD !== 'undefined' && AUD.LINES && AUD.LINES[key])) return false;
    if (o.once !== false && said.has(key)) return false;
    const now = GAME.time || 0;
    if (now - sayAt < (o.gap ?? 6)) return false;
    sayAt = now; said.add(key);
    try { GAME.halaApi.say(key, o.prio || 2); } catch (e) { return false; }
    return true;
  }
  const sfx = (n, o) => { try { if (typeof AUD !== 'undefined' && AUD.sfx) AUD.sfx(n, o); } catch (e) { /* yok */ } };
  const burst = (k, x, y, z, o) => { try { if (typeof FX !== 'undefined' && FX.burst) FX.burst(k, x, y, z, o); } catch (e) { /* yok */ } };

  // ── Renkler ──
  const CAPS = [[0xff7ec8, 0xffc8ec], [0x6fa8ff, 0xc8e0ff], [0x5fd8e8, 0xc8f8ff], [0xffa86a, 0xffe0b8], [0x7fe0b0, 0xd0ffe8]];   // GÜZEL: mor yalnız Pırıl'ın
  const GLOWC = [0xa8fff4, 0xfff0a0, 0xffb8f0, 0xc8ffa0, 0x9ac8ff];
  const STEM = [0xf6ecdf, 0xefe2f2, 0xe8f0e4];
  const MOSS = [0x3f8a5a, 0x4a9a62, 0x357a58, 0x5aa86a];

  // ── Geometriler (bölüm kurulurken; süse birleşince atılır) ──
  function lathe(THREE, pts, seg) { return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg); }
  const STEM_P = [[0.0, 0], [0.55, 0], [0.62, 0.05], [0.5, 0.25], [0.42, 0.6], [0.4, 0.9], [0.44, 1.0], [0, 1.0]];   // birim boy
  const CAP_P = [[0, -0.02], [0.55, -0.04], [0.92, 0.0], [1.0, 0.1], [0.94, 0.3], [0.72, 0.52], [0.4, 0.66], [0, 0.7]];
  const SHELF_P = [[0, 0], [0.9, -0.02], [1.0, 0.04], [0.85, 0.12], [0.4, 0.16], [0, 0.17]];
  function leafGeo(THREE) {   // dev yaprak: ortası kavisli, ucu sivri; sapı orijinde, +z'ye uzanır
    const g = new THREE.SphereGeometry(1, 12, 6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const u = (z + 1) / 2, w = Math.sin(Math.min(1, u * 1.15) * PI) * (1 - 0.35 * u) + 0.05;
      x *= w * 0.55; y *= 0.04; z = u * 1.6;
      y += 0.3 * Math.sin(u * PI * 0.9) - 0.2 * x * x;
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals(); return g;
  }
  function frondGeo(THREE) {   // eğrelti yaprağı (sallanır: uv.x = 30 → süs gölgelendiricisinin rüzgâr dalı)
    const g = new THREE.SphereGeometry(1, 5, 3), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const u = (z + 1) / 2, w = (0.25 + 0.75 * Math.sin(u * PI)) * (1 - 0.6 * u);
      x *= 0.18 * w; y = y * 0.02 + 0.9 * Math.sin(u * PI * 0.75) - 0.4 * u * u; z = u * 1.3;
      p.setXYZ(i, x, y, z); uv.setXY(i, 30, u);
    }
    g.computeVertexNormals(); return g;
  }

  // ── Süzülen ışık tozları: tek Points, hareket gölgelendiricide (her kare yalnız zaman) ──
  function motes(api, L, n, o) {
    const THREE = api.THREE, pos = new Float32Array(n * 3), ph = new Float32Array(n), cl = new Float32Array(n * 3), sz = new Float32Array(n);
    const pal = o.cols.map(c => new THREE.Color(c));
    let k = 0;
    for (let i = 0; i < n * 6 && k < n; i++) {
      const rm = L.rooms[(Math.random() * L.rooms.length) | 0], a = Math.random() * TAU, d = Math.sqrt(Math.random()) * (rm.r + 4);
      const x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
      pos[k * 3] = x; pos[k * 3 + 1] = o.y0 + Math.random() * 0.5; pos[k * 3 + 2] = z;
      ph[k] = Math.random(); sz[k] = o.size * (0.6 + Math.random() * 0.8);
      const c = pal[k % pal.length]; cl[k * 3] = c.r; cl[k * 3 + 1] = c.g; cl[k * 3 + 2] = c.b; k++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, k * 3), 3));
    g.setAttribute('aPh', new THREE.BufferAttribute(ph.subarray(0, k), 1));
    g.setAttribute('aCol', new THREE.BufferAttribute(cl.subarray(0, k * 3), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz.subarray(0, k), 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: TIME.u, uRise: { value: o.rise }, uH: { value: o.h }, uK: { value: o.k || 1 } },
      vertexShader: `attribute float aPh; attribute vec3 aCol; attribute float aSize; uniform float uTime, uRise, uH; varying vec3 vC; varying float vA;
        void main() {
          vec3 p = position; float h = mod(uTime * uRise + aPh * uH, uH), t = uTime * 0.35 + aPh * 6.2831;
          p.y += h; p.x += sin(t * 1.3 + aPh * 9.0) * 0.7; p.z += cos(t * 1.1 + aPh * 5.0) * 0.7;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          float u = h / uH; vA = smoothstep(0.0, 0.12, u) * (1.0 - smoothstep(0.7, 1.0, u)) * (0.55 + 0.45 * sin(uTime * 2.6 + aPh * 31.0));
          gl_PointSize = aSize * (320.0 / max(1.0, -mv.z)); vC = aCol;
        }`,
      fragmentShader: `uniform float uK; varying vec3 vC; varying float vA;
        void main() { vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; float a = max(0.0, 1.0 - r); a = a * a * (0.6 + 0.4 * (1.0 - smoothstep(0.0, 0.25, r)));
          gl_FragColor = vec4(vC * a * vA * uK, a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5; pts.name = 'mantar-isik-tozu';
    api.add(pts); api.dispose(m); api.dispose(g);
    return pts;
  }

  // ── Işıklı dere: şerit geometri + akan ışık gölgelendiricisi ──
  function streamMesh(api, pts, w) {
    const THREE = api.THREE, curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])));
    const N = Math.max(12, Math.round(curve.getLength() * 1.5)), sp = curve.getSpacedPoints(N);
    const pos = [], uv = [], idx = []; let len = 0;
    for (let i = 0; i <= N; i++) {
      const a = sp[Math.max(0, i - 1)], b = sp[Math.min(N, i + 1)], dx = b.x - a.x, dz = b.z - a.z, l = hyp(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (i > 0) len += sp[i].distanceTo(sp[i - 1]);
      const ww = w * (0.85 + 0.15 * Math.sin(i * 0.7));
      pos.push(sp[i].x + nx * ww, 0.035, sp[i].z + nz * ww, sp[i].x - nx * ww, 0.035, sp[i].z - nz * ww);
      uv.push(len, 0, len, 1);
      if (i < N) { const q = i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: TIME.u },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uTime; varying vec2 vUv;
        void main() {
          float e = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
          float f = sin(vUv.x * 1.1 - uTime * 1.8 + sin(vUv.y * 6.0 + vUv.x * 0.6) * 1.4) * 0.5 + 0.5;
          float g = sin(vUv.x * 2.7 - uTime * 2.6 + vUv.y * 3.0) * 0.5 + 0.5;
          float sp = pow(max(0.0, sin(vUv.x * 6.3 - uTime * 3.1 + vUv.y * 13.0) * sin(vUv.x * 2.9 + uTime * 1.4 - vUv.y * 9.0)), 10.0);
          vec3 c = mix(vec3(0.04, 0.22, 0.42), vec3(0.2, 0.85, 1.0), f * 0.55 + g * 0.2) + vec3(1.0, 1.0, 0.9) * sp * 0.25;
          float rim = (1.0 - smoothstep(0.05, 0.3, vUv.y)) + (smoothstep(0.7, 0.95, vUv.y));
          c += vec3(0.5, 1.0, 0.9) * rim * e * 0.35;
          gl_FragColor = vec4(c * 0.8, e * 0.85);   // SADE: dere sakin, göz almasın
        }`,
      transparent: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 1; mesh.name = 'mantar-dere';
    api.add(mesh); api.dispose(m); api.dispose(g);
    return { mesh, sp };
  }

  // ── Alacakaranlık vadisi zemini: koyu turkuaz-mor yosun (gölgelendiricide gürültü), içinde ışıklı benekler; yollar hafif parıltılı
  //    lavanta çakıl. Katman dokusu (r: yol, g: yürünür) ızgaradan; motorun zemini gizlenir, pişmiş ışık havuzları (tGlow) paylaşılır. ──
  function floor(L, api) {
    const THREE = api.THREE, pad = 16, ppm = 2, W = L.W + pad * 2, H = L.H + pad * 2, tw = W * ppm, th = H * ppm;
    const raw = new Float32Array(tw * th * 2), tmp = new Float32Array(tw * th * 2);
    for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
      const gi = Math.floor((i + 0.5) / ppm - pad), gj = Math.floor((j + 0.5) / ppm - pad);
      raw[(j * tw + i) * 2 + 1] = gi >= 0 && gj >= 0 && gi < L.W && gj < L.H && L.grid[gj * L.W + gi] ? 1 : 0;
    }
    const P = L.path || [], R = 0.95;
    for (let k = 1; k < P.length; k++) {   // yol: segmentler boyunca disk damgası
      const a = P[k - 1], b = P[k], l = hyp(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(l / 0.4));
      for (let q = 0; q <= n; q++) {
        const x = a.x + (b.x - a.x) * q / n, z = a.z + (b.z - a.z) * q / n;
        for (let j = Math.floor((z - R + pad) * ppm); j <= (z + R + pad) * ppm; j++) for (let i = Math.floor((x - R + pad) * ppm); i <= (x + R + pad) * ppm; i++) {
          if (i < 0 || j < 0 || i >= tw || j >= th) continue;
          const dx = (i + 0.5) / ppm - pad - x, dz = (j + 0.5) / ppm - pad - z;
          if (dx * dx + dz * dz < R * R) raw[(j * tw + i) * 2] = 1;
        }
      }
    }
    for (let it = 0; it < 2; it++) {
      tmp.set(raw);
      for (let j = 1; j < th - 1; j++) for (let i = 1; i < tw - 1; i++) {
        const o = (j * tw + i) * 2;
        for (let c = 0; c < 2; c++) { let sum = 0; for (let bb = -1; bb <= 1; bb++) for (let aa = -1; aa <= 1; aa++) sum += tmp[o + (bb * tw + aa) * 2 + c]; raw[o + c] = sum / 9; }
      }
    }
    const data = new Uint8Array(tw * th * 4);
    for (let k = 0, n = tw * th; k < n; k++) { data[k * 4] = Math.round(raw[k * 2] * 255); data[k * 4 + 1] = Math.round(raw[k * 2 + 1] * 255); data[k * 4 + 3] = 255; }
    const lay = new THREE.DataTexture(data, tw, th, THREE.RGBAFormat);
    lay.magFilter = lay.minFilter = THREE.LinearFilter; lay.needsUpdate = true; api.dispose(lay);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, metalness: 0 });
    const eng = api.floor && api.floor.material && api.floor.material.userData.u;
    const U = { tLay: { value: lay }, uLay: { value: new THREE.Vector4(pad, pad, 1 / W, 1 / H) }, uTime: TIME.u,
      tGlowM: eng && eng.tGlow ? eng.tGlow : { value: null }, uGInv: { value: new THREE.Vector2(1 / L.W, 1 / L.H) } };
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vMzW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMzW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = `varying vec3 vMzW; uniform sampler2D tLay, tGlowM; uniform vec4 uLay; uniform vec2 uGInv; uniform float uTime;
        float mzH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float mzN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mzH(i), mzH(i + vec2(1.0, 0.0)), f.x), mix(mzH(i + vec2(0.0, 1.0)), mzH(i + vec2(1.0, 1.0)), f.x), f.y); }
        vec3 mzE = vec3(0.0);
        ` + sh.fragmentShader
        .replace('#include <map_fragment>', `vec4 mzL = texture2D(tLay, (vMzW.xz + uLay.xy) * uLay.zw);
          vec2 p = vMzW.xz;
          float n1 = mzN(p * 0.18), n2 = mzN(p * 0.9 + 3.1), n3 = mzN(p * 3.3 + 7.7);
          // yosun: turkuaz ↔ mor lekeler, ince tüylü doku, yumuşak tümsekler
          // GÜZEL: lekeler yok — düz, sakin koyu mor-mavi zemin; yalnız çok yumuşak geniş ton dalgası ve ince doku
          vec3 moss = mix(vec3(0.075, 0.085, 0.2), vec3(0.085, 0.1, 0.22), n1);
          moss *= 0.94 + 0.06 * n3;
          // yol: lavanta çakıl (yuvarlak taşçıklar)
          vec2 cg = p * 2.6, ci = floor(cg); vec2 co = fract(cg) - 0.5 - (vec2(mzH(ci + 1.3), mzH(ci + 5.1)) - 0.5) * 0.5;
          float peb = smoothstep(0.42, 0.18, length(co));
          vec3 path = mix(vec3(0.34, 0.3, 0.48), vec3(0.44, 0.39, 0.6), peb * (0.6 + 0.4 * mzH(ci))) * (0.95 + 0.1 * n2);
          float wPath = smoothstep(0.25, 0.75, mzL.r) * mzL.g;
          vec3 col = mix(moss, path, wPath);
          col *= mix(0.3, 1.0, smoothstep(0.1, 0.9, mzL.g));   // yürünmez alan daha koyu
          diffuseColor.rgb *= col;
          // ışıklı benekler (yosunda), yolun ortasında akan yumuşak parıltı
          vec2 sg = p * 1.7, si = floor(sg); float sh = mzH(si);
          vec2 so = fract(sg) - 0.5 - (vec2(mzH(si + 7.1), mzH(si + 3.3)) - 0.5) * 0.6;
          // SADE: benekler seyrek, sönük ve sakin (yanıp sönme yok); yol üstünde hiç yok
          float sp = smoothstep(0.06, 0.0, length(so)) * step(0.9, sh) * 0.8;   // GÜZEL: seyrek, küçük
          vec3 spc = mix(vec3(0.5, 1.0, 0.9), mix(vec3(1.0, 0.85, 0.45), vec3(1.0, 0.6, 0.95), step(0.86, sh)), step(0.8, sh));
          mzE = spc * sp * 0.45 * (1.0 - wPath);
          mzE += vec3(0.42, 0.36, 0.75) * wPath * 0.06;   // yol: sabit, hafif aydınlık (akış/parıltı yok → net okunur)`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          vec3 mzG = texture2D(tGlowM, vMzW.xz * uGInv).rgb * 3.0;
          totalEmissiveRadiance += mzE + mzG * (diffuseColor.rgb + 0.07);`);
    };
    mat.customProgramCacheKey = () => 'mantar-zemin'; mat.userData.U = U;
    api.dispose(mat);
    const g = new THREE.PlaneGeometry(W + 80, H + 80); g.rotateX(-PI / 2); g.translate(L.W / 2, 0, L.H / 2); api.dispose(g);
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.name = 'mantar-zemin'; m.position.y = -0.002;
    api.add(m);
    if (api.floor) api.floor.visible = false;
    return m;
  }

  // ════════════════ Yerleşim (saf veri) ════════════════
  function yerlesim(L, api) {
    // (taban 'forest' köy meydanı kurar: evler, kuyu, fenerler, çiçek yatakları — vadide yok; baykuş tüccar kütüğünde kalır)
    if (L.village) { L.village = null; L.solids = (L.solids || []).filter(s => !['well', 'lamp', 'bed', 'fence', 'house', 'sign'].includes(s.tag)); }
    const A = L.areas || [], room = (ai, k = 0) => { const a = A[ai]; return a && !a.boss ? L.rooms[a.rooms[Math.min(k, a.rooms.length - 1)]] : null; };
    const areaOf = {}; A.forEach((a, k) => { if (!a.boss) a.rooms.forEach(ri => { areaOf[ri] = k; }); });
    // Nazik öğretim: başlangıç odasında huysuz yok; 1. alanda yalnız Zıp Mantarcık (grup en çok 2); sonra türler yavaş yavaş gelir
    const LIST = [['zipMantarcik'], ['zipMantarcik', 'tohumTopaci', 'sporPofudugu', 'zipMantarcik'], ['yosunTopu', 'sporPofudugu', 'zipMantarcik', 'tohumTopaci'], ['tohumTopaci', 'yosunTopu', 'sporPofudugu', 'zipMantarcik']];
    const CAP = [2, 3, 3, 4], packN = {}, keep = [];
    for (const sp of L.spawns || []) {
      const ai = areaOf[sp.room];
      if (sp.room === 0) continue;
      if (ai === undefined) { keep.push(sp); continue; }   // (yan odalar / arena: olduğu gibi)
      const n = packN[sp.pack] = (packN[sp.pack] || 0) + 1;
      if (n > CAP[ai]) continue;
      if (sp.type === 'altinMantarcik') { if (ai === 0) sp.type = 'zipMantarcik'; keep.push(sp); continue; }
      const list = LIST[Math.min(ai, LIST.length - 1)];
      sp.type = list[(n - 1 + sp.pack) % list.length];
      if (ai === 0) sp.elite = false;
      if (sp.elite && sp.type !== 'zipMantarcik' && sp.type !== 'yosunTopu') sp.type = ai >= 2 ? 'yosunTopu' : 'zipMantarcik';
      delete sp.variant;
      keep.push(sp);
    }
    // her alanda en az bir tür tanıtımı: 2. alanın ilk grubunda Tohum Topacı, 3. alanda Yosun Topu, Spor Pofuduğu
    L.spawns.length = 0; L.spawns.push(...keep);
    const spot = (rm, dx, dz, r = 1) => {
      if (!rm) return null;
      for (let t = 0; t < 24; t++) {
        const x = rm.x + dx + (t ? (api.rnd() - 0.5) * t * 0.4 : 0), z = rm.z + dz + (t ? (api.rnd() - 0.5) * t * 0.4 : 0);
        if (api.isFloor(x, z) && api.circleFree(x, z, r)) return { x, z };
      }
      return null;
    };
    // zıplatan mantarlar: 2. alanın odalarında üçlü halka (her biri bir sonrakine fırlatır)
    L.mzPads = [];
    for (const k of [0, 1]) {
      const rm = room(1, k); if (!rm) continue;
      const a0 = api.rnd() * TAU, R = Math.min(4.2, rm.r * 0.6), grp = [];
      for (let i = 0; i < 3; i++) { const a = a0 + i / 3 * TAU, p = spot(rm, Math.sin(a) * R, Math.cos(a) * R, 1.1); if (p) grp.push(p); }
      if (grp.length >= 2) grp.forEach((p, i) => L.mzPads.push({ x: p.x, z: p.z, to: grp[(i + 1) % grp.length], g: k }));
    }
    // şarkı söyleyen mantarlar (1. alanın 2. odası, kenara yakın sıra)
    L.mzSing = [];
    { const rm = room(0, 1);
      if (rm) { const a = api.rnd() * TAU, R = rm.r * 0.55; for (let i = 0; i < 5; i++) { const b = a + (i - 2) * 0.32, p = spot(rm, Math.sin(b) * R, Math.cos(b) * R, 0.6); if (p) L.mzSing.push(p); } } }
    // ışıklı dere: 3. alanın her odasını yoldan dik keserek geçer
    L.mzStreams = [];
    for (const k of [0, 1]) {
      const rm = room(2, k); if (!rm) continue;
      const ri = L.rooms.indexOf(rm), nb = L.rooms[ri + 1] || L.rooms[ri - 1];
      const dx = nb.x - rm.x, dz = nb.z - rm.z, l = hyp(dx, dz) || 1, nx = -dz / l, nz = dx / l, R = rm.r + 7, pts = [];
      for (let i = 0; i <= 8; i++) { const u = i / 8 * 2 - 1, wig = Math.sin(u * 3.1 + k) * 1.4; pts.push([rm.x + nx * u * R + dx / l * wig, rm.z + nz * u * R + dz / l * wig]); }
      L.mzStreams.push({ pts, room: ri, w: 1.15 });
    }
    // peri halkası (yan odada; yoksa 2. alanın son odasının kenarında)
    const side = L.rooms.filter(r => r.kind === 'side');
    L.mzRing = null;
    for (const rm of [side[0], side[1], room(1, 1), room(2, 1)]) {
      if (!rm || L.mzRing) continue;
      for (let t = 0; t < 40 && !L.mzRing; t++) {
        const a = api.rnd() * TAU, d = api.rnd() * rm.r * 0.45, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
        if (api.isFloor(x, z) && api.circleFree(x, z, 1.2) && (L.chests || []).every(c => hyp(c.x - x, c.z - z) > 3) && (L.mzPads || []).every(c => hyp(c.x - x, c.z - z) > 4)) L.mzRing = { x, z };
      }
    }
    // pofuduk toplar (tekmelenince parıltı)
    L.mzPuffs = [];
    for (const ai of [0, 1, 2, 3]) { const rm = room(ai, 1) || room(ai, 0); const a = api.rnd() * TAU, p = rm && spot(rm, Math.sin(a) * rm.r * 0.5, Math.cos(a) * rm.r * 0.5, 0.8); if (p) L.mzPuffs.push(p); }
    if (side[1]) { const p = spot(side[1], 1, 0, 0.8); if (p) L.mzPuffs.push(p); }
    if (OK() && ODAKIT.extraChests && L.chests) { try { ODAKIT.extraChests(L, api); } catch (e) { /* yok */ } }
  }

  // ════════════════ Görsel kurulum ════════════════
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
    const THREE = api.THREE, rnd = api.rnd, K = OK() ? ODAKIT : null;
    if (K && K.lowShadow) K.lowShadow(api, 99);   // SADE: süsler gölge düşürmez (PIRIL.md §13: gölge yalnız Feza/Pırıl/boss; üçgen bütçesi)
    const put = api.put;
    const isF = (x, z) => api.isFloor(x, z);
    // kameraya göre yükseklik sınırı: kuzeydeki ±35° koni içinde yürünür zemin varsa (Feza o tarafta olabilir) alçak kalmalı
    const coneH = (x, z) => { for (let d = 0.5; d <= 14; d += 0.75) { const w = d * 0.45 + 0.8; for (let dx = -w; dx <= w; dx += 0.9) if (isF(x + dx, z - d)) return 0.5 + d * 0.85; } return 99; };   // (kamera ~49° eğik: Feza'nın 1 m üstünden geçen bakış m başına ~1,15 m yükselir)
    const fN = (x, z) => (K ? K.floorNorth(L, x, z, 9) : 99), fD = (x, z, m = 8) => (K ? K.floorDist(L, x, z, m) : 9);
    const stem = api.tmp(lathe(THREE, STEM_P, 14)), cap = api.tmp(lathe(THREE, CAP_P, 18)), shelf = api.tmp(lathe(THREE, SHELF_P, 14));
    const sph = api.tmp(new THREE.SphereGeometry(1, 12, 8)), sphL = api.tmp(new THREE.SphereGeometry(1, 6, 4)), dode = api.tmp(new THREE.DodecahedronGeometry(1, 1));
    const leaf = api.tmp(leafGeo(THREE)), frond = api.tmp(frondGeo(THREE)), cyl = api.tmp(new THREE.CylinderGeometry(1, 1, 1, 12)), cylLo = api.tmp(new THREE.CylinderGeometry(1, 1, 1, 6));
    // alçak çözünürlüklü küçük mantar (kümeler, minik süsler: yüzlercesi var)
    const stemLo = api.tmp(lathe(THREE, [[0, 0], [0.55, 0], [0.45, 0.3], [0.42, 1.0], [0, 1.0]], 6)), capLo = api.tmp(lathe(THREE, [[0, -0.02], [0.95, -0.02], [0.98, 0.15], [0.65, 0.52], [0, 0.7]], 8));
    const pick = a => a[(rnd() * a.length) | 0];
    const bbox = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 };
    for (const r of L.rooms) { bbox.x0 = Math.min(bbox.x0, r.x - r.r - 12); bbox.x1 = Math.max(bbox.x1, r.x + r.r + 12); bbox.z0 = Math.min(bbox.z0, r.z - r.r - 12); bbox.z1 = Math.max(bbox.z1, r.z + r.r + 12); }

    // altta koyu yosun zemini (yürünmez yerlerde boşluk görünmesin)
    floor(L, api);
    yield;
    api.dreamEdge();

    // ── mantar yapıcı: sap + şapka + ışıklı benekler + şapka altı ışıltısı ──
    // h: boy, s: şapka yarıçapı; glow: benekler ışır; tilt: hafif eğik
    let lightN = 0;
    function mushroom(x, z, h, s, o = {}) {
      const ci = o.ci ?? ((rnd() * CAPS.length) | 0), c = CAPS[ci], gc = GLOWC[(ci + (o.go || 0)) % GLOWC.length], yaw = rnd() * TAU;
      const tx = o.tilt ? (rnd() - 0.5) * o.tilt : 0, tz = o.tilt ? (rnd() - 0.5) * o.tilt : 0;
      const sw = Math.max(0.18, s * 0.28), lo = s < 0.9, stG = lo ? stemLo : stem, cpG = lo ? capLo : cap;
      put(stG, x, 0, z, sw, h, sw, pick(STEM), yaw, tx, tz);
      const cx = x + Math.sin(tz) * -h * 0, cy = h * 0.97;
      put(cpG, cx + tz * h * -0.9, cy, z + tx * h * 0.9, s, s * (o.flat || 0.8), s, c[0], yaw, tx, tz);
      // şapka altı yumuşak ışıltı (solungaç halkası)
      put(lo ? cylLo : cyl, cx + tz * h * -0.9, cy - 0.03, z + tx * h * 0.9, s * 0.86, 0.05, s * 0.86, gc, 0, tx, tz, 'glow');
      // benekler
      const ns = o.spots ?? Math.round((lo ? 1 : 3) + s * 2.5);
      for (let i = 0; i < ns; i++) {
        const a = rnd() * TAU, rr = s * (0.25 + rnd() * 0.55), sy = cy + s * (o.flat || 0.8) * (0.62 - 0.55 * (rr / s) * (rr / s));
        put(sphL, cx + tz * h * -0.9 + Math.sin(a) * rr, sy, z + tx * h * 0.9 + Math.cos(a) * rr, s * 0.11, s * 0.05, s * 0.11, i % 3 ? c[1] : gc, 0, 0, 0, i % 2 ? 'glow' : undefined);
      }
      if (o.light && lightN < 14) { lightN++; api.light(x, cy + 0.5, z + 0.6, gc, o.li || 3, o.ld || 9, 0.15); }
      if (o.pool !== false) api.glow(x, z, s * 1.6 + 1, gc, o.pk ?? 0.16);
    }
    function glowCluster(x, z, n, sc = 1) {
      const ci = (rnd() * CAPS.length) | 0, gc = GLOWC[ci % GLOWC.length];
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, d = rnd() * 0.6 * sc, h = (0.18 + rnd() * 0.35) * sc, s = (0.12 + rnd() * 0.14) * sc, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d;
        put(stemLo, px, 0, pz, s * 0.35, h, s * 0.35, 0xf4f0e8, rnd() * TAU, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4);
        put(capLo, px, h * 0.95, pz, s, s * 0.7, s, gc, 0, 0, 0, 'glow');
      }
    }
    function mossMound(x, z, s) {
      const c = pick(MOSS);
      put(sph, x, -s * 0.2, z, s * 1.1, s * 0.75, s, c, rnd() * TAU);   // GÜZEL: yuvarlak tümsek (köşeli düz disk değil)
      for (let i = 0; i < 2; i++) { const a = rnd() * TAU; put(sph, x + Math.sin(a) * s * 0.7, s * 0.05, z + Math.cos(a) * s * 0.6, s * 0.45, s * 0.4, s * 0.45, pick(MOSS)); }
      if (rnd() < 0.5) put(sphL, x + (rnd() - 0.5) * s, s * 0.3, z + (rnd() - 0.5) * s, 0.06, 0.06, 0.06, pick(GLOWC), 0, 0, 0, 'glow');
    }
    function stone(x, z, s, mossy = true) {
      const yaw = rnd() * TAU;
      put(dode, x, s * 0.25, z, s, s * 0.6, s * 0.85, pick([0x6a7488, 0x7a7a94, 0x5e6a80]), yaw, (rnd() - 0.5) * 0.3);
      if (mossy) put(sph, x, s * 0.6, z, s * 0.85, s * 0.28, s * 0.7, pick(MOSS), yaw);
    }
    function fern(x, z, s) {
      const n = 4 + ((rnd() * 3) | 0), c = pick([0x3f9a6a, 0x4aa878, 0x58b888]);
      for (let i = 0; i < n; i++) put(frond, x, 0.02, z, s, s, s, c, i / n * TAU + rnd() * 0.3, 0, 0, 'decor');
    }

    // ── kenar dolgusu: yürünür alanın dışı (kamera önünde alçak, kuzeyde dev mantarlar) ──
    const ids = L.rooms.map((r, i) => i);
    let nTall = 0;
    if (K) K.fill(L, rnd, ids, (x, z, maxH0, fd) => {
      const r = rnd(), maxH = Math.min(maxH0, coneH(x, z));
      if (maxH >= 6 && fd > 2.2 && r < 0.42) {   // dev şemsiye mantar
        const h = Math.min(maxH, 3.5 + rnd() * 5), s = Math.min(1.4 + rnd() * 2.2 + h * 0.12, fd * 0.8 + 0.6);   // SADE/QA: şapka yürünür alana taşmasın
        mushroom(x, z, h, s, { tilt: 0.25, light: nTall++ % 3 === 0, li: 2.6, ld: 10 });
        if (rnd() < 0.5) put(shelf, x + 0.3, h * 0.45, z + 0.35, 0.7, 0.6, 0.7, pick(CAPS)[1], rnd() * TAU, 0.15);
      } else if (maxH >= 1.2 && r < 0.62) {
        const h = Math.min(maxH, 0.8 + rnd() * 1.4), s = Math.min(0.5 + rnd() * 0.7, h * 0.75);
        mushroom(x, z, h, s, { pk: 0.12 });
      } else if (r < 0.78) mossMound(x, z, 0.6 + rnd() * 0.8);
      else if (r < 0.9) fern(x, z, 0.8 + rnd() * 0.6);
      else stone(x, z, 0.5 + rnd() * 0.6);
      if (rnd() < 0.15) glowCluster(x + (rnd() - 0.5) * 1.5, z + (rnd() - 0.5) * 1.5, 2 + ((rnd() * 2) | 0), 1);
    }, { step: 2.7, d0: 1.2, d1: 9, margin: 10 });   // SADE: kenar dolgusu biraz seyrek (sakin + üçgen bütçesi)
    yield;
    // uzak dolgu: daha seyrek, kocaman mantarlar ve yosun tepecikleri (uzakta boş kalmasın)
    if (K) K.fill(L, rnd, ids, (x, z, maxH0, fd) => {
      const maxH = Math.min(maxH0, coneH(x, z));
      if (maxH >= 11 && rnd() < 0.5) mushroom(x, z, 6 + rnd() * 5, 3 + rnd() * 2.5, { pool: false, spots: 3 });
      else if (maxH > 1.2) mossMound(x, z, 1.4 + rnd() * 1.6);
      else mossMound(x, z, 0.7 + rnd() * 0.5);
    }, { step: 5.5, d0: 9, d1: 22, margin: 22 });
    yield;
    // dev yaprak altları: kuzey kenarda yüksek saplı dev yapraklar, yola doğru eğilir (kamera önünü kapatmaz)
    let nLeaf = 0;
    if (K) for (const ri of ids) {
      const rm = L.rooms[ri]; if (rm.kind === 'boss') continue;
      for (let k = 0; k < 3; k++) {
        const a = PI + (k - 1) * 0.7 + (rnd() - 0.5) * 0.3, d = rm.r + 2.2 + rnd() * 1.5, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
        if (isF(x, z) || fD(x, z, 2) < 1 || coneH(x, z) < 5.5) continue;
        const h = 3.4 + rnd() * 1.8, yaw = Math.atan2(rm.x - x, rm.z - z), s = 2.4 + rnd() * 1.2;
        put(cyl, x, h / 2, z, 0.09, h, 0.09, 0x3f8a4a, 0);
        put(leaf, x, h, z, s, s, s, pick([0x4fae5a, 0x3f9a5e, 0x63c070]), yaw, 0.25 + rnd() * 0.2, (rnd() - 0.5) * 0.3);
        put(sphL, x + Math.sin(yaw) * s * 0.9, h + 0.2, z + Math.cos(yaw) * s * 0.9, 0.08, 0.12, 0.08, 0xa8fff4, 0, 0, 0, 'glow');   // yaprak ucundan sarkan ışık damlası
        nLeaf++;
      }
    }
    void nLeaf;
    yield;

    // ── yürünür alan süsleri (üstünden geçilir): minik ışıklı mantar kümeleri, yosun yamaları, çiçekçikler ──
    if (K) K.scatter(L, rnd, ids.filter(i => L.rooms[i].kind !== 'boss'), 7, (x, z, k) => {
      if (Math.hypot(x - L.start.x, z - L.start.z) < 2) return;
      return;   // GÜZEL: yürünür alanda düz yosun diskleri yok (yukarıdan anlamsız leke gibi duruyordu)
    });
    // oda kenarları: yürünür alanın hemen dışında sık, parlak bir mantar-yosun kuşağı (kameraya göre alçak)
    if (K) for (const ri of ids) {
      const rm = L.rooms[ri], spots = K.rimSpots(L, rm, 0.7, rm.kind === 'boss' ? 16 : 11);   // SADE: kenar kuşağı daha az kalabalık
      spots.forEach((p, k) => {
        const hmax = coneH(p.x, p.z), r = rnd();
        if (r < 0.4) glowCluster(p.x, p.z, 2 + ((rnd() * 3) | 0), 1.1);
        else if (r < 0.65 && hmax > 1.0) mushroom(p.x + Math.sin(p.a) * 0.6, p.z + Math.cos(p.a) * 0.6, Math.min(hmax, 0.9 + rnd() * 1.6), Math.min(0.85, 0.45 + rnd() * 0.4), { pk: 0.14 });
        else if (r < 0.82) fern(p.x, p.z, 0.7 + rnd() * 0.5);
        else mossMound(p.x, p.z, 0.45 + rnd() * 0.4);
      });
    }
    yield;
    // oda ortalarında yumuşak ışık havuzları
    for (const rm of L.rooms) api.glow(rm.x, rm.z, rm.r * 0.9, rm.kind === 'boss' ? 0xffb8f0 : 0xb8a8ff, 0.07);
    yield;

    // ── 3. alan: ışıklı dere, yosunlu taşlar, basamak taşları, mantar köprüsü ──
    const streams = [];
    for (const S of L.mzStreams || []) {
      const st = streamMesh(api, S.pts, S.w); streams.push({ sp: st.sp, w: S.w });
      // kıyı: yosunlu taşlar + ışıklı sazlar (yürünür alanın dışında büyük, içinde küçük)
      for (let i = 0; i < st.sp.length; i += 2) {
        const p = st.sp[i], q = st.sp[Math.min(st.sp.length - 1, i + 1)], dx = q.x - p.x, dz = q.z - p.z, l = hyp(dx, dz) || 1;
        for (const sd of [-1, 1]) {
          const x = p.x - dz / l * sd * (S.w + 0.5 + rnd() * 0.4), z = p.z + dx / l * sd * (S.w + 0.5 + rnd() * 0.4);
          if (isF(x, z)) { if (rnd() < 0.35) stone(x, z, 0.18 + rnd() * 0.12); }
          else if (rnd() < 0.6) stone(x, z, 0.4 + rnd() * 0.5);
        }
      }
      // basamak taşları (yassı, derenin içinde)
      for (let i = 3; i < st.sp.length - 3; i += 5) { const p = st.sp[i]; if (isF(p.x, p.z) && rnd() < 0.6) put(sph, p.x + (rnd() - 0.5) * 0.5, 0.0, p.z + (rnd() - 0.5) * 0.5, 0.42, 0.09, 0.36, 0x7a8aa0, rnd() * TAU, 0, 0, 'decor'); }
      // mantar köprüsü: yolun dereyi geçtiği yerde yassı raf mantarları (yürünür; ince)
      const rm = L.rooms[S.room];
      let bx = rm.x, bz = rm.z, bd = 1e9;
      for (const p of L.path || []) { for (const q of st.sp) { const d = dist2(p.x, p.z, q.x, q.z); if (d < bd) { bd = d; bx = q.x; bz = q.z; } } }
      { let ang = 0, best = 1e9; for (const q of st.sp) { const d = dist2(q.x, q.z, bx, bz); if (d < best && d > 0.5) { best = d; ang = Math.atan2(q.x - bx, q.z - bz); } }
        const ax = Math.sin(ang + PI / 2), az = Math.cos(ang + PI / 2);
        for (let i = -2; i <= 2; i++) put(shelf, bx + ax * i * 0.75, 0.0, bz + az * i * 0.75, 0.75, 0.35, 0.95, i % 2 ? 0xffc8ec : 0xe2c8ff, ang, 0, 0, 'decor');
        for (const sd of [-1, 1]) { mushroom(bx + Math.sin(ang) * sd * 1.9 + ax * 2.2, bz + Math.cos(ang) * sd * 1.9 + az * 2.2, 0.9, 0.45, { pk: 0.2 }); mushroom(bx + Math.sin(ang) * sd * 1.9 - ax * 2.2, bz + Math.cos(ang) * sd * 1.9 - az * 2.2, 0.7, 0.38, { pk: 0.2 }); }
        api.glow(bx, bz, 3, 0x8ff4ff, 0.18);
      }
    }
    yield;

    // ── 4. alan: kök tünelleri (yolun üstünde dev kök kemerleri, asılı ışıklı yosun damlaları) ──
    const a4 = (L.areas || [])[3];
    if (a4 && K && L.path) {
      const rooms4 = new Set(a4.rooms), arena = L.rooms[L.rooms.length - 1] && L.rooms.find(r => r.kind === 'boss');
      const inA4 = (x, z) => { for (const ri of rooms4) { const r = L.rooms[ri]; if (hyp(x - r.x, z - r.z) < r.r + 5) return true; } return arena ? hyp(x - arena.x, z - arena.z) > arena.r + 1 && hyp(x - arena.x, z - arena.z) < arena.r + 9 : false; };
      const arch = api.tmp(K.archGeo(1, 1, 0.075, 14, 6));
      let acc = 0, last = null;
      for (const p of L.path) {
        if (last) acc += hyp(p.x - last.x, p.z - last.z);
        const prev = last; last = p;
        if (!prev || acc < 3.2 || !inA4(p.x, p.z)) continue;
        acc = 0;
        const yaw = Math.atan2(p.x - prev.x, p.z - prev.z) + PI / 2;
        let half = 1.5; for (let d = 0.5; d < 6; d += 0.5) { if (!isF(p.x + Math.sin(yaw) * d, p.z + Math.cos(yaw) * d) || !isF(p.x - Math.sin(yaw) * d, p.z - Math.cos(yaw) * d)) { half = d; break; } }
        const rx = half + 0.9, ry = 3.4 + rnd() * 0.6;
        // SADE/QA: yolun ÜSTÜNDEN geçen kök kemerleri kaldırıldı (Feza'yı kameradan saklıyordu); yanlarda alçak kökler + ışıklı mantarlar kalır
        void rx; void ry; void arch;
        for (let k = 0; k < 0; k++) {   // kemerin üstünde minik ışıklı mantarlar + sarkan ışık yosunu
          const t = 0.2 + k * 0.3, ax = Math.cos(t * PI) * rx, ay = Math.sin(t * PI) * ry;
          const wx = p.x + Math.sin(yaw) * ax, wz = p.z + Math.cos(yaw) * ax;
          put(cap, wx, ay + 0.15, wz, 0.22, 0.18, 0.22, pick(GLOWC), 0, 0, 0, 'glow');
          if (k === 1) for (let j = 0; j < 3; j++) put(sphL, wx + (j - 1) * 0.3, ay - 0.5 - j * 0.25, wz, 0.07, 0.12, 0.07, 0xa8fff4, 0, 0, 0, 'glow');
        }
        for (const sd of [-1, 1]) { const x = p.x + Math.sin(yaw) * sd * (half + 0.9), z = p.z + Math.cos(yaw) * sd * (half + 0.9); if (!isF(x, z)) {   // QA3: koyu oval leke yerine belli bir nesne: üstü açık renk halkalı, yosunlu kök kütüğü + ışıklı mantarcıklar
          put(cyl, x, 0.32, z, 0.46, 0.64, 0.46, 0x8a5a3c, yaw); put(cyl, x, 0.645, z, 0.42, 0.02, 0.42, 0xe0bf92, yaw);
          put(sphL, x + 0.18, 0.62, z - 0.1, 0.24, 0.08, 0.2, pick(MOSS), yaw); glowCluster(x + 0.65, z + 0.25, 3, 0.6); } }
      }
    }
    yield;

    // ── arena: dev mantar çemberi + peri halkası ──
    const ar = L.rooms.find(r => r.kind === 'boss');
    let arenaGlow = null;
    if (ar) {
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU, d = ar.r + 2.4 + (i % 2) * 1.4, x = ar.x + Math.sin(a) * d, z = ar.z + Math.cos(a) * d;
        if (isF(x, z) || fD(x, z, 2) < 1) continue;
        if (z > ar.z - ar.r * 0.25) continue;   // SADE/QA: arenanın güneyinde (kamera tarafında) dev mantar yok
        const hc = coneH(x, z), h = Math.min(hc, 4 + rnd() * 3);
        if (h < 0.6) continue;
        mushroom(x, z, h, h < 2 ? Math.min(0.8, h * 0.7) : 2 + rnd() * 1.2, { light: i % 4 === 0, li: 3.4, ld: 12, pk: 0.2 });
      }
      // peri halkası: arena kenarı boyunca minik ışıklı mantarlar (kendi malzemesi: kutlamada parlar)
      const k = new Kit(), gcol = new THREE.Color(1, 1, 1);
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * TAU, d = ar.r - 0.9, x = ar.x + Math.sin(a) * d, z = ar.z + Math.cos(a) * d;
        if (!isF(x, z)) continue;
        gcol.set(GLOWC[i % GLOWC.length]);
        k.add(G.sphere(8, 5), gcol, [x, 0.22, z], null, [0.2, 0.14, 0.2]);
        k.add(G.cyl(1, 1, 6), 0xf4f0e8, [x, 0.1, z], null, [0.06, 0.2, 0.06]);
      }
      const gm = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.1, 1.1, 1.1) });
      arenaGlow = new THREE.Mesh(k.build(), gm); arenaGlow.name = 'mantar-peri-halkasi'; api.add(arenaGlow); api.dispose(gm); api.dispose(arenaGlow.geometry);
      api.glow(ar.x, ar.z, ar.r + 1, 0xffb8f0, 0.1);
      // bossun oturduğu kuzeyde dev "taht" mantarı
      mushroom(ar.x, ar.z - ar.r - 4.5, 7.5, 4.2, { light: true, li: 4, ld: 14, ci: 0 });
    }
    yield;

    // ── atmosfer: süzülen ışık tozları (iki katman) ──
    // SADE: ışık tozu az ve sönük (okunurluk: ekranda aynı anda az şey hareket etsin)
    motes(api, L, 160, { cols: ['#c8fff0', '#fff0a8', '#ffc8f4', '#d8ffb0', '#b8c8ff'], size: 0.14, y0: 0.15, rise: 0.08, h: 4.5, k: 0.7 });
    motes(api, L, 30, { cols: ['#fff4c0', '#a8fff4', '#ffb8e8'], size: 0.36, y0: 0.6, rise: 0.04, h: 5.5, k: 0.6 });

    // ── oyuncaklar ──
    const T = K ? K.toys(api) : null;
    // gizli çıkartmalar (albüm sayfası)
    try { if (typeof HUB !== 'undefined' && HUB) { HUB.GIZLI = HUB.GIZLI || {}; HUB.GIZLI.mantar = Object.assign(HUB.GIZLI.mantar || {}, { mantar_peri_halkasi: ['Peri Halkası', '🍄'], mantar_palamut: ['Işıklı Palamut', '🌰'] }); } } catch (e) { /* yok */ }
    const anims = [];
    const stemG = api.dispose(lathe(THREE, STEM_P, 16)), capG = api.dispose(lathe(THREE, CAP_P, 24));
    const mats = {};
    const mm = (key, o) => mats[key] || (mats[key] = api.dispose(new THREE.MeshStandardMaterial(o)));
    const glowM = (key, c, k) => mats[key] || (mats[key] = api.dispose(new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })));
    function liveMush(x, z, h, s, capC, o = {}) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rnd() * TAU;
      const st = new THREE.Mesh(stemG, mm('stem', { color: 0xf6ecdf, roughness: 0.6 })); st.scale.set(s * 0.32, h, s * 0.32); st.castShadow = true; g.add(st);
      const cp = new THREE.Mesh(capG, mm('cap' + capC, { color: capC, roughness: 0.45, emissive: new THREE.Color(capC), emissiveIntensity: 0.18 })); cp.position.y = h * 0.96; cp.scale.set(s, s * 0.75, s); cp.castShadow = true; g.add(cp);
      const gl = new THREE.Mesh(spotG, glowM('gl' + (o.gc || 0xfff0a0), o.gc || 0xfff0a0, 2.0)); gl.position.y = h * 0.96; gl.scale.set(s, s * 0.75, s); g.add(gl);   // ışıklı benekler (şapkayla birlikte ezilir)
      api.add(g);
      return { g, cp, gl, h, s };
    }
    const sphG = api.dispose(new THREE.SphereGeometry(1, 12, 8));
    // şapka benekleri (birim şapka yüzeyinde, tek geometri)
    const spotG = (() => {
      const k = new Kit(), rAt = y => { for (let i = 1; i < CAP_P.length; i++) { const a = CAP_P[i - 1], b = CAP_P[i]; if ((y - a[1]) * (y - b[1]) <= 0 && a[1] !== b[1]) return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); } return 0; };
      for (let i = 0; i < 9; i++) { const y = i === 8 ? 0.7 : 0.18 + 0.38 * ((i * 0.618) % 1), a = i * 2.39996, r = rAt(y) + 0.01; k.add(G.sphere(8, 5), 0xffffff, [Math.sin(a) * r, y, Math.cos(a) * r], [0, a, 0], [0.11, 0.09, 0.05]); }
      return api.dispose(k.build());
    })();

    // zıplatan mantarlar (2. alan): basınca şapka ezilir, Feza yay çizerek bir sonrakine uçar
    if (T) for (const p of L.mzPads || []) {
      const M = liveMush(p.x, p.z, 0.55, 1.05, 0xff7ec8, { gc: 0xa8fff4 });
      api.glow(p.x, p.z, 1.6, 0xff9fe0, 0.2);
      let sq = 9;
      const it = T.add({ x: p.x, z: p.z, r: 1.05, hint: { y: 1.9 }, line: p.g === 0 ? 'pr_mantar_ziplat' : null, near: 7, cd: 0.6, repeat: true,
        use: () => {
          sq = 0; sfx('mantarBoing', { x: p.x, z: p.z }); sfx('bounce', { x: p.x, z: p.z, pitch: 0.9 }); burst('sparkle', p.x, 0.8, p.z, { color: '#ffd0f4', count: 6 });
          const tx = p.to.x, tz = p.to.z, D = hyp(tx - p.x, tz - p.z);
          T.ride({ pts: [[p.x, p.z], [tx, tz]], speed: D / 0.95, y: u => 4 * (2.2 + D * 0.12) * u * (1 - u),
            tick: (u, x, z) => { if (Math.random() < 0.5) burst('sparkle', x, 1 + 4 * 2.2 * u * (1 - u), z, { color: '#fff0a8', count: 2 }); },
            end: () => { burst('dust', tx, 0.1, tz, { count: 3 }); if (!said.has('pp_mantar_ziplama')) say('pp_mantar_ziplama', { gap: 3 }); } });
          it.last -= 0; },
        tick: dt => { sq += dt; const k = sq < 0.6 ? Math.sin(sq * 26) * Math.exp(-sq * 6) : 0; M.cp.scale.set(1.05 * (1 + 0.25 * k), 1.05 * 0.75 * (1 - 0.4 * k), 1.05 * (1 + 0.25 * k)); M.gl.scale.copy(M.cp.scale); } });
    }
    // şarkı söyleyen mantarlar (1. alan): sırayla dokununca do-re-mi; hepsi → ezgi + şeker
    if (T && (L.mzSing || []).length) {
      const NOTES = [1.0, 1.122, 1.26, 1.335, 1.498], cols = [0xff7ec8, 0xffa86a, 0xfff07a, 0x7affa8, 0x7ac8ff];
      let next = 0, done = false;
      L.mzSing.forEach((p, i) => {
        const M = liveMush(p.x, p.z, 0.75 + i * 0.08, 0.5, cols[i], { gc: cols[i] });
        let b = 9;
        T.add({ x: p.x, z: p.z, r: 0.95, hint: i === 0 ? { y: 1.7 } : false, line: i === 0 ? 'pr_mantar_sarki' : null, near: 6, cd: 0.4, repeat: true,
          use: () => {
            b = 0; sfx('bell', { x: p.x, z: p.z, pitch: NOTES[i] * 1.2, vol: 0.7 }); burst('notes', p.x, 1.3, p.z, { count: 2 });
            if (done) return;
            if (i === next) { next++; if (next === L.mzSing.length) { done = true; setTimeout(() => { L.mzSing.forEach((q, j) => setTimeout(() => { sfx('bell', { x: q.x, z: q.z, pitch: NOTES[j] * 1.2, vol: 0.6 }); burst('sparkle', q.x, 1.2, q.z, { color: '#fff0a8', count: 5 }); }, j * 160)); if (K) K.sugar(p.x, p.z, 8, 8); say('pp_mantar_sarki', { gap: 2 }); }, 300); } }
            else next = i === 0 ? 1 : 0;
          },
          tick: dt => { b += dt; const k = b < 0.8 ? Math.sin(b * 22) * Math.exp(-b * 5) : 0; M.g.scale.set(1 + 0.18 * k, 1 - 0.22 * k, 1 + 0.18 * k); } });
      });
    }
    // boss sonu dansçıları: minik mantarcıklar (önceden kurulu, gizli; boss neşelenince çevresinde zıplayıp dans eder)
    const dancers = [];
    if (ar) for (let i = 0; i < 5; i++) { const M = liveMush(ar.x, ar.z, 0.42, 0.4, [0xff7ec8, 0xb47cff, 0x5fd8e8, 0xffa86a, 0xfff07a][i], { gc: GLOWC[i] }); M.g.visible = false; dancers.push(M); }
    // pofuduk toplar: içine girince "püf!" parıltı + birkaç şeker; söner, 10 s sonra yeniden kabarır
    if (T) for (const p of L.mzPuffs || []) {
      const m = new THREE.Mesh(sphG, mm('puff', { color: 0xf4ecff, roughness: 0.9, emissive: new THREE.Color(0xc8b8ff), emissiveIntensity: 0.15 }));
      m.position.set(p.x, 0.42, p.z); m.scale.set(0.5, 0.42, 0.5); m.castShadow = true; api.add(m);
      let t = 99;
      T.add({ x: p.x, z: p.z, r: 0.9, hint: false, cd: 10, use: () => {
        t = 0; sfx('bubblePop', { x: p.x, z: p.z, pitch: 0.7 }); burst('sparkle', p.x, 0.9, p.z, { color: '#e8ffb8', count: 11 }); burst('confetti', p.x, 0.8, p.z, { scale: 0.6 });
        if (K) K.sugar(p.x, p.z, 4, 4); say('pr_mantar_pofuduk', { gap: 3 });
      }, tick: dt => { t += dt; const k = t < 0.3 ? 1 - t / 0.3 * 0.75 : t < 9 ? 0.25 : Math.min(1, 0.25 + (t - 9) * 0.75); m.scale.set(0.5 * k + 0.05, 0.42 * k + 0.04, 0.5 * k + 0.05); m.position.y = 0.42 * k; } });
    }
    // peri halkası (gizli): ortasına basınca mantarlar sırayla yanar → altın şeker + çıkartma
    if (T && L.mzRing) {
      const R0 = L.mzRing, ms = [], off = mm('ringOff', { color: 0xd8c8f0, roughness: 0.6 }), on = glowM('ringOn', 0xfff0a8, 2.4);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU, x = R0.x + Math.sin(a) * 2.1, z = R0.z + Math.cos(a) * 2.1;
        const st = new THREE.Mesh(stemG, mm('stem')); st.position.set(x, 0, z); st.scale.set(0.09, 0.3, 0.09); api.add(st);
        const cp = new THREE.Mesh(capG, off); cp.position.set(x, 0.28, z); cp.scale.set(0.24, 0.2, 0.24); api.add(cp); ms.push(cp);
      }
      api.glow(R0.x, R0.z, 2.6, 0xd8c8ff, 0.14);
      let t = -1;
      T.add({ x: R0.x, z: R0.z, r: 0.9, hint: { y: 1.4 }, line: 'pr_mantar_halka', near: 5, once: true,
        use: () => { t = 0; sfx('unlock', { x: R0.x, z: R0.z, vol: 0.6 }); },
        tick: dt => {
          if (t < 0) return; const n0 = Math.floor(t / 0.18); t += dt; const n1 = Math.floor(t / 0.18);
          for (let i = n0; i < Math.min(n1, 9); i++) { ms[i].material = on; ms[i].scale.multiplyScalar(1.3); sfx('bell', { x: R0.x, z: R0.z, pitch: 1 + i * 0.09, vol: 0.5 }); burst('sparkle', ms[i].position.x, 0.5, ms[i].position.z, { color: '#fff0a8', count: 3 }); }
          if (n0 < 10 && n1 >= 10) {
            burst('confetti', R0.x, 1.2, R0.z, { scale: 1.3 }); burst('star', R0.x, 1.6, R0.z, { count: 5 });
            const g = typeof GAME !== 'undefined' ? GAME : null;
            if (g) { if (g.addGoldSugar) g.addGoldSugar(1); if (K) { K.sugar(R0.x, R0.z, 10, 8); K.sticker('mantar_peri_halkasi'); } }
            say('pr_mantar_halka_bulundu', { gap: 1 });
          }
        } });
    }
    // gizli hazineler: yarı gömülü ışıklı palamutlar (alanların kenarında)
    if (T && K) {
      const kA = new Kit();
      kA.add(G.sphere(16, 12), 0xffc86a, [0, 0, 0], null, [0.55, 0.7, 0.55]);
      kA.add(G.sphere(16, 8), 0x8a5a34, [0, 0.42, 0], null, [0.62, 0.32, 0.62]);
      kA.add(G.cyl(1, 1, 8), 0x6a4428, [0, 0.78, 0], null, [0.07, 0.25, 0.07]);
      const acorn = api.dispose(kA.build());
      const spots = [];
      for (const ai of [0, 2, 3]) {
        const a = (L.areas || [])[ai]; if (!a) continue;
        const rm = L.rooms[a.rooms[a.rooms.length - 1]], rs = K.rimSpots(L, rm, 0.6, 20).filter(s => fN(s.x, s.z) >= 99 && hyp(s.x - L.start.x, s.z - L.start.z) > 6);
        if (rs.length) spots.push(rs[(rnd() * rs.length) | 0]);
      }
      spots.forEach((s, i) => { K.treasure(api, T, s.x, s.z, acorn, { y: 0.35, sc: 1, line: i === 0 ? 'pr_mantar_hazine' : null, gold: 12, n: 7, gs: i === spots.length - 1, sticker: i === 1 ? 'mantar_palamut' : null, hintY: 2.0, cast: true }); api.glow(s.x, s.z, 1.6, 0xffd88a, 0.25); });
    }
    yield;

    // ── canlı dünya: dere sıçraması, damla sesleri, öğretim cümleleri, boss kutlaması ──
    let tt = 0, splashT = 0, dripT = 3, cheerT = -1, cbx = 0, cbz = 0, rainT = 0, zT = 0, prevHp = null, welcomed = false, wT = 0, firstCheer = false, arenaSaid = false;
    const nearStream = (x, z) => { for (const S of streams) for (let i = 0; i < S.sp.length; i += 1) { const q = S.sp[i]; if (dist2(q.x, q.z, x, z) < (S.w * 0.9) * (S.w * 0.9)) return true; } return false; };
    let lastX = 0, lastZ = 0;
    api.anim((dt, hx, hz) => {
      tt += dt;
      if (!inZone()) return;
      const P = GAME.P;
      // dere: içinden yürüyünce ışıltılı su sıçrar
      if (streams.length && live()) {
        const mv = hyp(hx - lastX, hz - lastZ) > dt * 0.8;
        if ((splashT -= dt) <= 0 && mv && nearStream(hx, hz)) { splashT = 0.22; burst('sparkle', hx, 0.25, hz, { color: '#9ff4ff', count: 3 }); burst('bubbles', hx, 0.15, hz, { count: 2 }); if (Math.random() < 0.4) sfx('splash', { x: hx, z: hz, vol: 0.35, pitch: 1.3 + Math.random() * 0.3 }); say('pr_mantar_dere'); }
        if ((dripT -= dt) <= 0) { dripT = 2.5 + Math.random() * 4; const S = streams[(Math.random() * streams.length) | 0], q = S.sp[(Math.random() * S.sp.length) | 0]; if (dist2(q.x, q.z, hx, hz) < 400) { sfx('damla', { x: q.x, z: q.z, vol: 0.5, pitch: 0.9 + Math.random() * 0.4 }); burst('sparkle', q.x, 0.2, q.z, { color: '#c8fff8', count: 2 }); } }
      }
      lastX = hx; lastZ = hz;
      // öğretim: hoş geldin → ilk huysuzu görünce dokun → ilk neşelenmede Pırıl sevinir
      if (live()) {
        wT += dt;
        if (!welcomed && wT > 2.5) welcomed = true;   // (bölüm girişi cümlesini STORY söyler)
        if (welcomed && wT > 12 && !said.has('pr_mantar_surukle') && hyp(hx - L.start.x, hz - L.start.z) < 3) say('pr_mantar_surukle');
        if (!said.has('pr_mantar_ogret_vur')) { for (const e of GAME.enemies) if (!e.dead && !e.boss && dist2(e.x, e.z, hx, hz) < 49) { say('pr_mantar_ogret_vur', { gap: 2 }); break; } }
        if (a4 && !said.has('pr_mantar_tunel')) { const r = L.rooms[a4.rooms[0]]; if (r && dist2(r.x, r.z, hx, hz) < r.r * r.r) say('pr_mantar_tunel'); }
        if (ar && !arenaSaid && dist2(ar.x, ar.z, hx, hz) < (ar.r + 6) * (ar.r + 6)) arenaSaid = true;   // (arena cümlesi STORY'nin)
      }
      // boss kutlaması: neşelenince peri halkası ve arena mantarları ışıl ışıl, havaya ışık tozu fıskiyeleri
      const b = GAME.boss;
      if (b && b.type === 'kocaPofudukMantar') { if (b.dead && prevHp !== null && cheerT < 0) cheerT = 0; prevHp = b.hp; }
      if (cheerT === 0 && b) { cbx = b.x; cbz = b.z; }
      if (cheerT >= 0 && cheerT < 8) {   // sevimli son: Feza ile Pırıl'a ışık sporu yağar, mantarcıklar dans eder, Koca Pofuduk uyur
        const t1 = cheerT;
        if (t1 > 0.6 && t1 < 3.8 && (rainT -= dt) <= 0 && P) { rainT = 0.12; const a = Math.random() * TAU, r = Math.random() * 1.8; burst('sparkle', P.pos.x + Math.sin(a) * r, 1.6 + Math.random() * 1.8, P.pos.z + Math.cos(a) * r, { color: ['#fff4c0', '#c8fff0', '#ffd0f4'][(Math.random() * 3) | 0], count: 2 }); }
        dancers.forEach((M, i) => {
          const on = t1 > 1.2 && t1 < 4.6;
          if (on !== M.g.visible) { M.g.visible = on; burst('sparkle', M.g.position.x, 0.5, M.g.position.z, { color: '#fff0a8', count: 5 }); if (on) sfx('mantarBoing', { x: cbx, z: cbz, vol: 0.5, pitch: 1.2 + i * 0.1 }); }
          if (!on) return;
          const a = i / dancers.length * TAU + t1 * 0.6, r = 2.9;
          M.g.position.set(cbx + Math.sin(a) * r, Math.abs(Math.sin(t1 * 7 + i * 1.3)) * 0.45, cbz + Math.cos(a) * r);
          M.g.rotation.y = t1 * 4 + i; const k = 1 + 0.15 * Math.sin(t1 * 14 + i); M.g.scale.set(k, 2 - k, k);
        });
        if (t1 > 5.0 && t1 < 6.6 && (zT -= dt) <= 0) { zT = 0.7; burst('zzz', cbx + 0.6, 3.4, cbz + 0.8, {}); }
      }
      if (cheerT >= 0 && ar) {
        const n0 = Math.floor(cheerT / 0.25); cheerT += dt; const n1 = Math.floor(cheerT / 0.25);
        if (n1 !== n0 && n1 < 24) { const a = n1 / 12 * TAU, x = ar.x + Math.sin(a) * (ar.r - 1), z = ar.z + Math.cos(a) * (ar.r - 1); burst('sparkle', x, 0.6, z, { color: ['#fff0a8', '#a8fff4', '#ffb8f0'][n1 % 3], count: 9 }); if (n1 % 4 === 0) burst('confetti', x, 1.2, z, { scale: 0.9 }); if (n1 % 3 === 0) sfx('bell', { x, z, pitch: 1 + (n1 % 8) * 0.08, vol: 0.4 }); }
        if (arenaGlow) { const k = cheerT < 6 ? 1.2 + 1.4 * Math.abs(Math.sin(cheerT * 4)) : 1.8; arenaGlow.material.color.setScalar(k); }
      }
      if (!firstCheer && P && P.cikartmalar && P.cikartmalar.zipMantarcik) { firstCheer = true; say('pp_mantar_ilk_nese', { gap: 1 }); }
      for (const f of anims) f(dt, tt);
    });
    // ilk neşelenme Pırıl'ın sevinci (olay ile)
    if (typeof GAME !== 'undefined' && GAME.on && !MANTAR._hooked) {
      MANTAR._hooked = true;
      GAME.on('happy', e => { if (inZone() && e && !e.boss) { if (!said.has('pp_mantar_ilk_nese')) say('pp_mantar_ilk_nese', { gap: 1 }); else if (Math.random() < 0.12) say(['pp_mantar_aferin1', 'pp_mantar_aferin2', 'pp_mantar_aferin3'][(Math.random() * 3) | 0], { once: false, gap: 25 }); } });
      GAME.on('boss', o => { if (inZone() && o && o.on && o.type === 'kocaPofudukMantar') say('pp_mantar_boss', { gap: 4 }); });
    }
  }

  // ── çıkış kapısı: kapının arkasında ışıklı mantar kemeri (kendi malzemesi: boss neşelenince parlayıp nabız gibi atar),
  //    iki yanda dev ışıklı mantar, yerde ışık havuzu ve bir ışık ──
  // GÜZEL: dokunulacak şeylerin üstündeki dev turuncu ipucu yıldızı yerine küçük, yumuşak ışıklı yuvarlak boncuk
  function softHints(api) {
    const T = OK() && ODAKIT.last; if (!T || !T.list) return;
    const THREE = api.THREE, geo = api.dispose(new THREE.SphereGeometry(0.2, 14, 10)), m = api.dispose(new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6c8).multiplyScalar(1.3) }));
    for (const it of T.list) if (it.star) {
      it.star.geometry = geo; it.star.material = m; it.star.scale.setScalar(1);
      for (const c of it.star.children) if (c.isSprite) c.scale.setScalar(1.1);
      it.starY = Math.min(it.starY, 1.6); it.star.position.y = it.starY;
    }
  }
  // GÜZEL: motorun kırılabilir fıçı / sandık / vazoları (başka oyundan gibi duruyordu) mantar vadisine uygun görünüşe çevrilir:
  // fıçı → yosunlu mantar kütüğü (üstünde minik ışıklı mantarlar), sandık → palamut sepeti, vazo → kocaman palamut. Oyun aynı (kırılınca şeker).
  function themedBreakables(api) {
    if (typeof scene === 'undefined') return;
    const THREE = api.THREE, kitGeo = f => { const k = new Kit(); f(k); return k.build(); };
    const geo = {
      barrel: kitGeo(k => {
        k.add(G.cyl(0.92, 1, 14), 0x8a5a3c, [0, 0.3, 0], null, [0.36, 0.6, 0.36]);
        k.add(G.cyl(1, 1, 14), 0xd8b48a, [0, 0.605, 0], null, [0.33, 0.02, 0.33]);
        for (const r of [0.12, 0.22]) k.add(G.torus(TAU, 0.06, 20), 0xb08a64, [0, 0.618, 0], [PI / 2, 0, 0], r);
        k.add(G.sphere(10, 6), 0x4a9a62, [0.12, 0.6, -0.1], null, [0.22, 0.07, 0.18]);
        for (const [x, z, h, c] of [[-0.12, 0.08, 0.16, 0x5fd8e8], [0.02, 0.16, 0.12, 0xff7ec8], [-0.18, -0.08, 0.1, 0xfff0a0]]) {
          k.add(G.cyl(1, 1, 6), 0xf4ecdf, [x, 0.62 + h / 2, z], null, [0.025, h, 0.025]);
          k.add(G.sphere(10, 6), c, [x, 0.62 + h, z], null, [0.07, 0.045, 0.07]);
        }
      }),
      crate: kitGeo(k => {
        k.add(G.cyl(1, 0.8, 16), 0xc89058, [0, 0.22, 0], null, [0.42, 0.44, 0.42]);
        for (const y of [0.08, 0.22, 0.36]) k.add(G.torus(TAU, 0.08, 20), 0xa87040, [0, y, 0], [PI / 2, 0, 0], [0.38 + y * 0.1, 0.38 + y * 0.1, 0.3]);
        for (const [x, z] of [[-0.14, 0.05], [0.12, -0.06], [0, 0.14], [0.05, -0.16], [-0.1, -0.12]]) {
          k.add(G.sphere(10, 8), 0x9a6a3a, [x, 0.46, z], null, [0.1, 0.12, 0.1]);
          k.add(G.sphere(10, 6), 0x6a4426, [x, 0.55, z], null, [0.105, 0.05, 0.105]);
        }
        k.add(G.torus(PI, 0.12, 16), 0xa87040, [0, 0.45, 0], null, [0.36, 0.3, 0.36]);
      }),
      vase: kitGeo(k => {
        k.add(G.sphere(16, 12), 0xb07a48, [0, 0.3, 0], null, [0.3, 0.34, 0.3]);
        k.add(G.sphere(16, 10), 0x6a4426, [0, 0.56, 0], null, [0.32, 0.12, 0.32]);
        k.add(G.cyl(1, 1, 8), 0x5a3a20, [0, 0.7, 0], null, [0.03, 0.1, 0.03]);
        k.add(G.sphere(8, 6), 0xfff0a0, [0.12, 0.42, 0.22], null, 0.04);
      }),
    };
    const mat = api.dispose(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 }));
    for (const g of Object.values(geo)) api.dispose(g);
    const one = new THREE.Color(1, 1, 1);
    scene.traverse(o => {
      if (!o.isInstancedMesh || !/^break-/.test(o.name || '')) return;
      const kind = o.name.slice(6), g = geo[kind] || geo.barrel;
      o.geometry = g; o.material = mat;
      if (o.instanceColor) { for (let i = 0; i < o.count; i++) o.setColorAt(i, one); o.instanceColor.needsUpdate = true; }
      o.computeBoundingSphere();
    });
  }
  // QA4: hazine sandığı mantar vadisine uygun: yosunlu kütük sandık (kabuk gövde, açık renk kesik halkaları), kapağında yosun ve
  // üç küçük ışıklı mantar. Motorun sandığı aynı kalır (açılma, parıltı, ödül); yalnız gövde/kapak geometrisi değişir.
  function themedChests(L, api) {
    if (!L.chestObjs || !L.chestObjs.length) return;
    const THREE = api.THREE, kg = f => { const k = new Kit(); f(k); return api.dispose(k.build()); };
    const BARK = 0x7a4e32, BARK2 = 0x9a6a44, CUT = 0xe2c194, MOSSC = 0x4a9a62;
    const body = kg(k => {
      k.add(G.rbox(2), (x, y, z) => new THREE.Color(BARK).lerp(new THREE.Color(BARK2), 0.5 + 0.5 * Math.sin(x * 40 + y * 9)), [0, 0.27, 0], null, [0.92, 0.54, 0.62]);
      for (const sd of [-1, 1]) { k.add(G.cyl(1, 1, 18), CUT, [sd * 0.465, 0.27, 0], [0, 0, PI / 2], [0.25, 0.02, 0.25]); k.add(G.torus(TAU, 0.08, 18), 0xc8a070, [sd * 0.476, 0.27, 0], [0, PI / 2, 0], 0.15); }
      for (const [x, z, s] of [[-0.38, 0.29, 0.14], [0.36, 0.3, 0.12], [-0.2, 0.31, 0.1]]) k.add(G.sphere(10, 6), MOSSC, [x, 0.06, z], null, [s, s * 0.5, s * 0.6]);
      k.add(G.sphere(12, 8), 0xffd86a, [0, 0.42, 0.315], null, [0.06, 0.07, 0.03]);   // ışıklı kilit boncuğu
    });
    const lid = kg(k => {
      k.add(G.cyl(1, 1, 18, false), (x, y, z) => new THREE.Color(BARK2).lerp(new THREE.Color(BARK), 0.5 + 0.5 * Math.sin(x * 35)), [0, 0.0, 0.31], [0, 0, PI / 2], [0.32, 0.94, 0.32]);
      k.add(G.sphere(12, 8), MOSSC, [0.05, 0.22, 0.31], null, [0.36, 0.12, 0.24]);
      for (const sd of [-1, 1]) k.add(G.cyl(1, 1, 18), CUT, [sd * 0.47, 0.0, 0.31], [0, 0, PI / 2], [0.3, 0.02, 0.3]);
      for (const [x, z, h] of [[-0.18, 0.28, 0.14], [0.02, 0.36, 0.18], [0.2, 0.26, 0.12]]) k.add(G.cyl(1, 1, 6), 0xf4ecdf, [x, 0.26 + h / 2, z], null, [0.025, h, 0.025]);
    });
    const caps = kg(k => { for (const [x, z, h, c] of [[-0.18, 0.28, 0.14, 0x5fd8e8], [0.02, 0.36, 0.18, 0xff7ec8], [0.2, 0.26, 0.12, 0xfff0a0]]) k.add(G.sphere(10, 6), c, [x, 0.26 + h, z], null, [0.08, 0.05, 0.08]); });
    const mat = api.dispose(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 }));
    const glowM = api.dispose(new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.6, 1.6, 1.6) }));
    for (const o of L.chestObjs) {
      const g = o.obj; if (!g) continue;
      const meshes = g.children.filter(c => c.isMesh), piv = g.children.find(c => c.isGroup);
      const bd = meshes.find(m => m.geometry !== (piv && piv.children[0] && piv.children[0].geometry) && m.position.y < 0.1);
      if (bd) { bd.geometry = body; bd.material = mat; }
      const ld = piv && piv.children.find(c => c.isMesh);
      if (ld) { ld.geometry = lid; ld.material = mat; ld.position.y = 0.05; const cm = new THREE.Mesh(caps, glowM); cm.position.copy(ld.position); piv.add(cm); }
    }
  }
  function kurSon(L, api) {
    api = sadeApi(api);
    try { themedChests(L, api); } catch (e) { console.warn('mantar sandık', e); }
    try { softHints(api); } catch (e) { console.warn('mantar ipucu', e); }
    try { themedBreakables(api); } catch (e) { console.warn('mantar kırılabilir', e); }
    const ex = L.exit; if (!ex) return;
    const THREE = api.THREE, k = new Kit(), kd = new Kit(), c = new THREE.Color();
    const po = L.portalObj && L.portalObj.obj, px = po ? po.position.x : ex.x, pz = po ? po.position.z : ex.z, yaw = po ? po.rotation.y : 0;
    const cs = Math.cos(yaw), sn = Math.sin(yaw), at = (lx, y, lz) => [px + lx * cs + lz * sn, y, pz - lx * sn + lz * cs];
    const RX = 3.0, RY = 5.4, N = 15;
    for (let i = 0; i <= N; i++) {   // kemer boyunca ışıklı mantar şapkaları + aralarda parıltı topları
      const t = i / N * PI, lx = Math.cos(t) * RX, y = Math.sin(t) * (RY - 1.6) + 1.6 * Math.min(1, Math.sin(t) * 3), p = at(lx, Math.max(0.4, y), -0.6);
      c.set(GLOWC[i % GLOWC.length]);
      k.add(G.sphere(10, 6), c, p, [0, 0, 0], [0.34, 0.2, 0.34]);
      k.add(G.sphere(8, 5), c.clone().lerp(new THREE.Color(1, 1, 1), 0.5), [p[0], p[1] - 0.2, p[2]], null, 0.12);
      kd.add(G.cyl(1, 1, 6), 0xf4ecdf, [p[0], p[1] - 0.25, p[2]], null, [0.07, 0.3, 0.07]);
    }
    for (const sd of [-1, 1]) {   // yanlardaki dev mantarların şapka altı ışıltısı
      const p = at(sd * (RX + 0.6), 3.25, -0.6);
      k.add(G.cyl(1, 0.8, 16), new THREE.Color(sd < 0 ? 0xffb8f0 : 0xa8fff4), p, null, [1.3, 0.08, 1.3]);
      const q = at(sd * (RX + 0.6), 0, -0.6);
      kd.add(G.cyl(0.9, 1, 12), 0xf6ecdf, [q[0], 1.7, q[2]], null, [0.42, 3.4, 0.42]);
      kd.add(G.sphere(16, 10), sd < 0 ? 0xff7ec8 : 0xb47cff, [q[0], 3.45, q[2]], null, [1.5, 0.7, 1.5]);
    }
    const gm = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(0.9, 0.9, 0.9) });
    const gmesh = new THREE.Mesh(k.build(), gm); gmesh.name = 'mantar-cikis-kemeri'; api.add(gmesh); api.dispose(gm); api.dispose(gmesh.geometry);
    const dm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: new THREE.Color(0x40304a), emissiveIntensity: 0.4 });
    const dmesh = new THREE.Mesh(kd.build(), dm); dmesh.castShadow = true; dmesh.name = 'mantar-cikis-mantarlari'; api.add(dmesh); api.dispose(dm); api.dispose(dmesh.geometry);
    api.glow(px, pz, 4, 0xfff0a8, 0.25);
    api.light(px, 3.2, pz + 0.8, 0xffe0f8, 3.5, 10, 0.1);
    let t = 0, on = 0;
    api.anim(dt => {
      t += dt;
      const b = typeof GAME !== 'undefined' ? GAME.boss : null, open = !!(L.portalObj && L.portalObj.active) || !!(b && b.dead && b.type === 'kocaPofudukMantar') || !(b && b.type === 'kocaPofudukMantar');
      on = damp(on, open ? 1 : 0, 1.5, dt);
      const k2 = 0.75 + on * (1.6 + 0.7 * Math.sin(t * 3.2));
      gm.color.setScalar(k2);
      if (on > 0.5 && Math.random() < dt * 4) { const u = Math.random() * PI, p = at(Math.cos(u) * RX, Math.sin(u) * (RY - 1.6) + 1.2, -0.6); burst('sparkle', p[0], p[1], p[2], { color: '#fff0a8', count: 2 }); }
    });
  }

  BOLUM.define('mantar', {
    ad: 'Işıklı Mantar Vadisi',
    taban: 'forest',
    size: 100, side: 2,
    areas: [{ id: 'a1', ad: 'Parıltı Çayırı', rooms: 2 }, { id: 'a2', ad: 'Dev Mantar Ormanı', rooms: 2 }, { id: 'a3', ad: 'Işıklı Dere', rooms: 2 }, { id: 'a4', ad: 'Kök Tünelleri', rooms: 2 }],
    muzik: 'pr_mantar',
    malzeme: 'isik1',
    kayipEsya: null,
    final: false,
    isik: { fog: [0x2a2250, 30, 88], hemiSky: 0xa898ff, hemiGround: 0x284848, hemi: 1.0, sunColor: 0xffc8e8, sun: 1.25, sunOffset: [-12, 26, 12],
      env: [0x5a4a9a, 0xb080c8, 0x1c3030, 0.75], bloom: 0.3, exposure: 1.02, sat: 1.1, vig: 0.32, fezaLight: 1.6, fezaLightColor: 0xfff0d8, moss: [0x3a8a6a, 0.6], rim: [0xd8c8ff, 0.18] },
    zemin: { tA: 0x5a96a8, tB: 0xc0b8f4, tC: 0xb4b0ec, out: 0x203a48, outAmt: 0.75, macro: 0xc8c0ff },
    minimap: { zemin: '#6a9a8a' },
    harita: { ad: 'Işıklı Mantar Vadisi', detay: 'Parlayan dev mantarlar, ışıklı dere ve Koca Pofuduk Mantar', renk: '#b48cff', x: 26, y: 70, simge: '🍄' },
    yerlesim,
    kur,
    kurSon,
  });
  return { _hooked: false };
})();
