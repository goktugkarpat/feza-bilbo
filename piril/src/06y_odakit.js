/* ── Oda takımı (ODAKIT): Oturma Odası ve Mutfak'ın ortak araçları ──
   Dev ev zemini (ahşap parke, halı, tezgâh… tek gölgelendiricide; yürünür alan aydınlık, dışı hafif gölgeli),
   sallanan dev halı lifleri (tek çizim), dokununca tepki veren oyuncakların ortak çerçevesi (yaklaşınca tetik, ipucu yıldızı,
   şeker saçma, Feza'yı zıplatma / taşıma), oda içi yerleşim yardımcıları. Genel ad: ODAKIT. Kullananlar: src/06z_oturma.js,
   src/06z_mutfak.js (kur() içinde). Dokular bir kez üretilir ve saklanır; bölüm değişince yalnız bölüme özel şeyler atılır. */
const ODAKIT = (() => {
  'use strict';
  const TEXC = {};   // üretilmiş dokular (kalıcı)
  const MATC = {};   // ortak malzemeler (kalıcı; userData.keep)
  const GEOC = {};   // ortak geometriler (kalıcı)
  const keepG = g => { g.userData.keep = true; return g; };
  const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const sm = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const hex3 = h => [(h >> 16 & 255), (h >> 8 & 255), (h & 255)];

  // ── doku üretimi (piksel piksel, döşenebilir) ──
  // Parça parça da üretilebilir (TEXJ: yarım kalan iş; prewarm(ms) her çağrıda birkaç satır): ilk oda ziyaretinde donma olmasın.
  const TEXJ = {};
  let BUDGET = Infinity;
  function makeTex(key, size, fn, budget = BUDGET) {
    if (TEXC[key]) return TEXC[key];
    let j = TEXJ[key];
    if (!j) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'), img = g.createImageData(size, size);
      j = TEXJ[key] = { c, g, img, y: 0 };
    }
    const d = j.img.data, px = [0, 0, 0], t0 = performance.now();
    for (; j.y < size; j.y++) {
      const y = j.y;
      for (let x = 0; x < size; x++) {
        fn((x + 0.5) / size, (y + 0.5) / size, px);
        const o = (y * size + x) * 4;
        d[o] = px[0] < 0 ? 0 : px[0] > 255 ? 255 : px[0]; d[o + 1] = px[1] < 0 ? 0 : px[1] > 255 ? 255 : px[1]; d[o + 2] = px[2] < 0 ? 0 : px[2] > 255 ? 255 : px[2]; d[o + 3] = 255;
      }
      if ((y & 7) === 7 && performance.now() - t0 > budget) { j.y++; return null; }
    }
    const c = j.c, g = j.g; delete TEXJ[key];
    g.putImageData(j.img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = typeof ANISO !== 'undefined' ? ANISO : 4;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
    return (TEXC[key] = t);
  }
  // Balık sırtı meşe parke: 16 tahta genişliği bir döşeme (tahta = 1 × 4 birim). size = döşemenin metre boyu (dışarıda)
  function parquet() {
    const N = 16, LL = 4, PER = 2 * LL;
    const base = [[0xcf, 0xa0, 0x68], [0xc2, 0x92, 0x5c], [0xd8, 0xae, 0x76], [0xbd, 0x8a, 0x55], [0xd2, 0xa4, 0x6e]];
    return makeTex('parquet', 1024, (u, v, out) => {
      const x = u * N, y = v * N, m = Math.floor(y), r = x - m, k = Math.floor(r / PER), rr = r - k * PER;
      let along, across, id;
      if (rr < LL) { along = rr; across = y - m; id = hash(((m % N) + N) % N, ((k % 2) + 2) % 2, 1); }
      else { const q = Math.floor(x); across = x - q; along = y - q + 2 * LL - 1 + PER * k; along -= Math.floor(along / LL) * LL; id = hash(((q % N) + N) % N, ((k % 2) + 2) % 2, 2); }
      const b = base[Math.floor(id * 5)], tone = 0.9 + id * 0.2;
      // damar: tahta boyunca uzayan ince çizgiler + yumuşak dalga
      const gp = across * 23 + Math.sin(along * 1.7 + id * 40) * 0.9 + Math.sin(along * 5.3 + id * 9) * 0.25;
      const grain = 0.92 + 0.08 * Math.sin(gp * 3.1) * Math.sin(gp * 0.7 + id * 6) + 0.04 * Math.sin(along * 37 + across * 9 + id * 70);
      const knot = Math.max(0, 1 - Math.hypot((along - (0.6 + id * 2.6)) * 1.6, (across - 0.5) * 2.4) * 2.2) * 0.18;
      let k2 = tone * grain * (1 - knot);
      const e = Math.min(across, 1 - across, along * 0.25 * 4 / LL * 1, (LL - along) / LL * 4 * 0.25);   // kenara uzaklık
      const ea = Math.min(across, 1 - across) * 1, eb = Math.min(along, LL - along);
      const edge = Math.min(ea, eb);
      if (edge < 0.025) k2 *= 0.42 + edge * 12; else if (edge < 0.07) k2 *= 1.06;   // derz + pah ışığı
      void e;
      out[0] = b[0] * k2; out[1] = b[1] * k2; out[2] = b[2] * k2;
    });
  }
  // Gri-mavi-krem zikzak örgü halı (8 bant = 1 döngü; 128 px/m, 8 m)
  const BANDS = [0xeee8dc, 0xc3cbd3, 0x8d9db0, 0x5d6e86, 0xe6e0d2, 0xa9b4c0, 0x71829a, 0xd3d5d4];
  // dünya noktasındaki halı rengi (lifler halıyla aynı deseni taşısın; doku 8 m'de bir döşenir, kanvas ters çevrilir)
  function carpetColor(x, z) {
    const X = ((x % 8) + 8) % 8, Y = 8 - (((z % 8) + 8) % 8);
    const zz = Math.abs(((X / 2) % 1 + 1) % 1 - 0.5) * 2, bi = Math.floor((Y + zz * 0.55) / 0.5);
    return new THREE.Color(BANDS[((bi % 8) + 8) % 8]);
  }
  function carpet() {
    const bands = BANDS.map(hex3);
    return makeTex('carpet', 1024, (u, v, out) => {
      const X = u * 8, Y = v * 8;   // metre
      const zz = Math.abs(((X / 2) % 1 + 1) % 1 - 0.5) * 2;   // 0..1 üçgen dalga (2 m)
      const yy = Y + zz * 0.55, bi = Math.floor(yy / 0.5), fr = yy / 0.5 - bi;
      const c = bands[((bi % 8) + 8) % 8], c2 = bands[(((bi + 1) % 8) + 8) % 8];
      // örgü ilmekleri: 0.125 m hücrede iki eğik ilmek (V)
      const sx = X / 0.125, sy = Y / 0.125 + zz * 0.55 / 0.125, fx = sx - Math.floor(sx), fy = sy - Math.floor(sy);
      const vx = Math.abs(fx - 0.5) * 2, loop = Math.sin(Math.PI * Math.min(1, Math.max(0, (fy * 1.0 + vx * 0.45)))) ;
      const sh = 0.78 + 0.26 * loop - 0.1 * Math.pow(Math.abs(fx - 0.5) * 2, 6);
      const mix = fr > 0.94 ? (fr - 0.94) / 0.06 * 0.5 : 0;
      const fuzz = 0.97 + 0.06 * hash(Math.floor(X * 64), Math.floor(Y * 64));
      for (let i = 0; i < 3; i++) out[i] = (c[i] * (1 - mix) + c2[i] * mix) * sh * fuzz;
    });
  }
  // Tezgâh: sıcak meşe kasap tahtası (enine şeritler, uç birleşimleri), 6 m
  function counter() {
    const tones = [[0xc8, 0x8e, 0x58], [0xb9, 0x80, 0x4c], [0xd2, 0x9a, 0x62], [0xbf, 0x86, 0x50], [0xcc, 0x94, 0x5c]];
    return makeTex('counter', 1024, (u, v, out) => {
      const sw = 12, st = Math.floor(v * sw), fv = v * sw - st, seg = Math.floor(u * 3 + K2(st) * 3), id = hash(st, seg, 9), c = tones[Math.floor(id * 5)];
      const gp = fv * 7 + Math.sin(u * TAU * 3 + id * 30) * 0.7 + Math.sin(u * TAU * 11 + id * 9) * 0.15;
      let s = 0.92 + 0.1 * Math.sin(gp * 2.6) * Math.sin(gp * 0.6 + id * 5) + 0.03 * hash(Math.floor(u * 1024), Math.floor(v * 256));
      if (fv < 0.035 || fv > 0.965) s *= 0.78;
      const fu = u * 3 + K2(st) * 3 - seg; if (fu < 0.006 || fu > 0.994) s *= 0.72;
      out[0] = c[0] * s; out[1] = c[1] * s; out[2] = c[2] * s;
    });
  }
  const K2 = i => hash(i, 77, 3);
  // Fırçalanmış çelik süzgeçlik (lavabo kenarı): oluklar + fırça izi, 4 m
  function steel() {
    return makeTex('steel', 512, (u, v, out) => {
      let s = 0.86 + 0.08 * hash(Math.floor(u * 512), Math.floor(v * 8)) + 0.04 * Math.sin(v * TAU * 40 + hash(Math.floor(v * 64), 1) * 6);
      const gu = (u * 8) % 1; s *= 0.9 + 0.16 * Math.sin(gu * Math.PI) ;   // süzgeç olukları (yarım metrede bir)
      if (gu < 0.04 || gu > 0.96) s *= 0.78;
      out[0] = 0xa2 * s; out[1] = 0xae * s; out[2] = 0xbc * s;
    });
  }
  function shelf() {   // dolap rafı: krem beyazı melamin, ince damar, 2 m'de bir birleşim
    return makeTex('shelf', 512, (u, v, out) => {
      const gp = u * 26 + Math.sin(v * TAU * 3) * 0.6 + Math.sin(v * TAU * 7) * 0.15;
      let s = 0.97 + 0.025 * Math.sin(gp) * Math.sin(gp * 0.13 + 2) + 0.015 * hash(Math.floor(u * 512), Math.floor(v * 512));
      const fv = (v * 3) % 1; if (fv < 0.012 || fv > 0.988) s *= 0.8;
      out[0] = 0xcf * s; out[1] = 0xdf * s; out[2] = 0xc6 * s;
    });
  }
  // Ocak üstü: krem emaye (ince benekler, hafif kabartma baklava deseni, parlak), 6 m
  function stove() {
    return makeTex('stove', 1024, (u, v, out) => {
      const h = hash(Math.floor(u * 1024), Math.floor(v * 1024)), h2 = hash(Math.floor(u * 300), Math.floor(v * 300), 4);
      const du = (u * 12) % 1, dv = (v * 12) % 1, dia = Math.abs(du - 0.5) + Math.abs(dv - 0.5);   // baklava
      let s = 0.97 + 0.03 * Math.sin(u * TAU * 2 + Math.sin(v * TAU) * 2) + (dia > 0.47 && dia < 0.5 ? -0.05 : dia < 0.04 ? 0.03 : 0);
      if (h > 0.996) s -= 0.25; else if (h2 > 0.993) s -= 0.1;
      out[0] = 0xf4 * s; out[1] = 0xec * s; out[2] = 0xda * s;
    });
  }
  // Kesme tahtası: sıcak kayın, enine şeritler + bıçak çizikleri, 6 m
  function board() {
    return makeTex('board', 512, (u, v, out) => {
      const strip = Math.floor(u * 10), id = hash(strip, 5), gp = u * 10 * 9 + Math.sin(v * TAU * 2 + id * 20) * 1.4;
      let s = 0.9 + id * 0.16 + 0.06 * Math.sin(gp * 2.2) * Math.sin(gp * 0.5 + id * 7);
      const fu = u * 10 - strip; if (fu < 0.03 || fu > 0.97) s *= 0.8;
      const cut = Math.abs(Math.sin((u * 3 + v * 7) * TAU * 3 + id)) > 0.997 || Math.abs(Math.sin((u * 5 - v * 4) * TAU * 2)) > 0.998;
      if (cut) s *= 0.86;
      out[0] = 0xd6 * s; out[1] = 0xa8 * s; out[2] = 0x70 * s;
    });
  }
  const TEX_BY = { parquet, carpet, counter, steel, shelf, stove, board };
  const tex = n => TEX_BY[n]();
  // Dokuları ms bütçesiyle parça parça üret (+ ekran kartına yükle); hepsi hazırsa true. 07 loadZoneAsync ve boşta çalışan döngü çağırır.
  const UPL = {};
  function prewarm(ms = 6) {
    const t0 = performance.now();
    for (const n in TEX_BY) {
      if (!TEXC[n]) {
        BUDGET = Math.max(1, ms - (performance.now() - t0));
        try { TEX_BY[n](); } finally { BUDGET = Infinity; }
        if (!TEXC[n] || performance.now() - t0 > ms) return false;
      }
      if (!UPL[n]) {
        UPL[n] = true;
        if (typeof renderer !== 'undefined' && renderer && renderer.initTexture) { try { renderer.initTexture(TEXC[n]); } catch (e) { /* ilk çizimde yüklenir */ } }
        if (performance.now() - t0 > ms) return false;
      }
    }
    return true;
  }
  // boşta (başlık / masa / oyun): kare başına ~3 ms, hepsi bitince durur
  if (typeof requestAnimationFrame === 'function') {
    const idle = () => {
      const g = typeof GAME !== 'undefined' ? GAME : null;
      if (g && g.loading) { requestAnimationFrame(idle); return; }
      if (!prewarm(3)) requestAnimationFrame(idle);
    };
    setTimeout(() => requestAnimationFrame(idle), 2500);
  }

  // ── Zemin: 3 doku (yerleşim dokusunun R/B kanalı karışımı), G = yürünür alan, A = loşluk ──
  // o = { mats: [{ tex: 'parquet', size: 13.4, rough: 0.55 }, …(en çok 3)], region(x, z) → [w1, w2, loş] (0..1), out: [r, g, b] dış çarpanı }
  function floor(L, api, o) {
    const pad = 14, ppm = 2, W = L.W + pad * 2, H = L.H + pad * 2, tw = W * ppm, th = H * ppm;
    const raw = new Float32Array(tw * th * 4), tmp = new Float32Array(tw * th * 4);
    for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
      const x = (i + 0.5) / ppm - pad, z = (j + 0.5) / ppm - pad, o4 = (j * tw + i) * 4;
      const gi = Math.floor(x), gj = Math.floor(z), walk = gi >= 0 && gj >= 0 && gi < L.W && gj < L.H && L.grid[gj * L.W + gi] ? 1 : 0;
      const r = o.region ? o.region(x, z) : null;
      raw[o4] = r ? r[0] : 0; raw[o4 + 1] = walk; raw[o4 + 2] = r ? r[1] : 0; raw[o4 + 3] = r ? r[2] || 0 : 0;
    }
    for (let it = 0; it < 2; it++) {   // yumuşat (kutu bulanıklığı ×2)
      tmp.set(raw);
      for (let j = 1; j < th - 1; j++) for (let i = 1; i < tw - 1; i++) {
        const o4 = (j * tw + i) * 4;
        for (let c = 0; c < 4; c++) {
          let s = 0;
          for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) s += tmp[o4 + (b * tw + a) * 4 + c];
          raw[o4 + c] = s / 9;
        }
      }
    }
    const data = new Uint8Array(tw * th * 4);
    for (let k = 0; k < data.length; k++) data[k] = Math.round(Math.min(1, Math.max(0, raw[k])) * 255);
    const lay = new THREE.DataTexture(data, tw, th, THREE.RGBAFormat);
    lay.magFilter = lay.minFilter = THREE.LinearFilter; lay.needsUpdate = true; api.dispose(lay);
    const mats = o.mats.slice(); while (mats.length < 3) mats.push(mats[0]);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
    const oc = o.out || [0.8, 0.82, 0.88];
    const U = {
      tLay: { value: lay }, tM0: { value: tex(mats[0].tex) }, tM1: { value: tex(mats[1].tex) }, tM2: { value: tex(mats[2].tex) },
      uLay: { value: new THREE.Vector4(pad, pad, 1 / W, 1 / H) }, uRep: { value: new THREE.Vector3(1 / mats[0].size, 1 / mats[1].size, 1 / mats[2].size) },
      uRgh: { value: new THREE.Vector3(mats[0].rough ?? 0.6, mats[1].rough ?? 0.6, mats[2].rough ?? 0.6) }, uOut: { value: new THREE.Vector4(oc[0], oc[1], oc[2], o.shade ?? 0.5) },
      uShC: { value: new THREE.Vector3(...(o.shadeColor || [1 - (o.shade ?? 0.5), 1 - (o.shade ?? 0.5), 1 - (o.shade ?? 0.5)])) },
    };
    mat.userData.ok = U;
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vOkW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvOkW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vOkW; uniform sampler2D tLay, tM0, tM1, tM2; uniform vec4 uLay, uOut; uniform vec3 uRep, uRgh, uShC;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `vec4 okL = texture2D(tLay, (vOkW.xz + uLay.xy) * uLay.zw);
          vec3 okC = texture2D(tM0, vOkW.xz * uRep.x).rgb;
          okC = mix(okC, texture2D(tM1, vOkW.xz * uRep.y).rgb, okL.r);
          okC = mix(okC, texture2D(tM2, vOkW.xz * uRep.z).rgb, okL.b);
          okC *= mix(uOut.rgb, vec3(1.0), okL.g);
          okC *= mix(vec3(1.0), uShC, okL.a);
          diffuseColor.rgb *= okC;`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(mix(uRgh.x, uRgh.y, okL.r), uRgh.z, okL.b);');
    };
    mat.customProgramCacheKey = () => 'odakit-floor';
    const geo = new THREE.PlaneGeometry(W, H); geo.rotateX(-Math.PI / 2); geo.translate(L.W / 2, 0, L.H / 2);
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.name = 'odakit-zemin'; m.position.y = -0.002;
    api.add(m);
    if (api.floor) api.floor.visible = false;
    return m;
  }
  // Ayrı yükseltilmiş yüzey (halı, kesme tahtası…): kutu, üst yüzü dünya koordinatlı doku; yürünür alan aydınlatması aynı
  function slab(api, L, o) {   // o = { x, z, w, d, h, tex, size, rough, side: renk, yaw }
    const key = 'slab|' + o.tex + '|' + o.size;
    let mat = MATC[key];
    if (!mat) {
      mat = MATC[key] = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: o.rough ?? 0.95, metalness: 0 }); mat.userData.keep = true;
      const T = tex(o.tex), rep = 1 / o.size;
      mat.onBeforeCompile = sh => {
        sh.uniforms.tS = { value: T };
        sh.vertexShader = 'varying vec3 vOkW; varying float vOkTop;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvOkW = (modelMatrix * vec4(transformed, 1.0)).xyz; vOkTop = step(0.5, normal.y);');
        sh.fragmentShader = 'varying vec3 vOkW; varying float vOkTop; uniform sampler2D tS;\n' + sh.fragmentShader
          .replace('#include <map_fragment>', `vec3 okS = texture2D(tS, vOkW.xz * ${rep.toFixed(5)}).rgb; diffuseColor.rgb *= mix(vec3(0.62, 0.64, 0.7) * okS, okS, vOkTop);`);
      };
      mat.customProgramCacheKey = () => 'odakit-slab-' + o.tex;
    }
    const g = new THREE.BoxGeometry(1, 1, 1);
    const m = new THREE.Mesh(g, mat);
    m.scale.set(o.w, o.h, o.d); m.position.set(o.x, o.h / 2 - 0.01, o.z); m.rotation.y = o.yaw || 0; m.receiveShadow = true; m.name = 'odakit-slab';
    api.add(m);
    // Build-time route stamps follow raised rugs / boards instead of falling beneath them.
    (L._routeSurfaces || (L._routeSurfaces = [])).push({ x: o.x, z: o.z, w: o.w, d: o.d, h: o.h - 0.01, yaw: o.yaw || 0 });
    return m;
  }

  // ── yürünür alan sınırı: alçak yumuşak bordür (renkler bölgeye göre) ──
  function edge(L, api, colors, h = 0.09) {
    const box = G.box();
    for (let j = 0; j < L.H; j++) for (let i = 0; i < L.W; i++) {
      const c = j * L.W + i; if (!L.grid[c]) continue;
      const col = colors(i + 0.5, j + 0.5, c);
      if (!j || !L.grid[c - L.W]) api.put(box, i + 0.5, h * 0.45, j - 0.11, 1.02, h, 0.22, col);
      if (j === L.H - 1 || !L.grid[c + L.W]) api.put(box, i + 0.5, h * 0.3, j + 1.11, 1.02, h * 0.6, 0.22, col);
      if (!i || !L.grid[c - 1]) api.put(box, i - 0.11, h * 0.45, j + 0.5, 0.22, h, 1.02, col);
      if (i === L.W - 1 || !L.grid[c + 1]) api.put(box, i + 1.11, h * 0.45, j + 0.5, 0.22, h, 1.02, col);
    }
  }

  // ── yerleşim yardımcıları ──
  const isF = (L, x, z) => { const i = Math.floor(x), j = Math.floor(z); return i >= 0 && j >= 0 && i < L.W && j < L.H && !!L.grid[j * L.W + i]; };
  // dikdörtgen (merkez x,z; yarı genişlik hw, yarı derinlik hd; pay m) içinde yürünür hücre yok mu?
  function rectFree(L, x, z, hw, hd, m = 0.6) {
    for (let j = Math.floor(z - hd - m); j <= z + hd + m; j++) for (let i = Math.floor(x - hw - m); i <= x + hw + m; i++)
      if (i >= 0 && j >= 0 && i < L.W && j < L.H && L.grid[j * L.W + i]) return false;
    return true;
  }
  // odanın çevresinde (önce kuzey, sonra yanlar) yürünür alanla çakışmayan dikdörtgen yeri
  function outRect(L, rm, hw, hd, m = 0.3, south = false) {
    for (const a of [Math.PI, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 0.62, Math.PI * 1.38, Math.PI / 2, Math.PI * 1.5].concat(south ? [Math.PI * 0.25, Math.PI * 1.75, 0] : [])) {
      const sx = Math.sin(a), sz = Math.cos(a);
      for (let d = rm.r * 0.5; d < rm.r + 16; d += 0.5) {
        const x = rm.x + sx * (d + Math.abs(sx) * hw), z = rm.z + sz * (d + Math.abs(sz) * hd);
        if (rectFree(L, x, z, hw, hd, m)) return { x, z, a };
      }
    }
    return null;
  }
  // kuzeyde (küçük z) ilk boş yer: odanın kuzey kenarından başlayıp kuzeye kayar
  function northOf(L, x, z0, hw, hd, m = 0.6, maxGo = 14) {
    for (let z = z0; z > z0 - maxGo; z -= 0.5) if (rectFree(L, x, z, hw, hd, m)) return { x, z };
    return null;
  }
  // güney taraf kuralı: (x,z)'nin kuzeyinde kaç m içinde zemin var (kameraya göre önündeyse alçak olmalı)
  function floorNorth(L, x, z, max = 8) {
    for (let d = 0.5; d <= max; d += 0.5) if (isF(L, x, z - d) || isF(L, x - 0.8, z - d) || isF(L, x + 0.8, z - d)) return d;
    return 99;
  }
  // zemine en yakın uzaklık (kaba; 0.5 m adım, en çok max)
  function floorDist(L, x, z, max = 10) {
    if (isF(L, x, z)) return 0;
    for (let r = 0.5; r <= max; r += 0.5) for (let k = 0; k < 12; k++) { const a = k * TAU / 12; if (isF(L, x + Math.cos(a) * r, z + Math.sin(a) * r)) return r; }
    return 99;
  }
  // yürünür alanda, oda merkezine göre bir nokta (açı a, oran k) ya da en yakın uygun nokta
  function inRoom(L, api, rm, a, k, r = 0.8) {
    for (let t = 0; t < 14; t++) {
      const kk = k * (1 - t * 0.06), aa = a + (t & 1 ? 1 : -1) * t * 0.15, x = rm.x + Math.sin(aa) * rm.r * kk, z = rm.z + Math.cos(aa) * rm.r * kk;
      if (api.circleFree(x, z, r)) return { x, z };
    }
    return { x: rm.x, z: rm.z };
  }

  // ── sallanan dev lifler (halı ormanı / un tozu otları): tek InstancedMesh ──
  // ilmek (yarım halka yay): örgü halının ipliği. rx yarı genişlik, ry boy, tube kalınlık
  function archGeo(rx, ry, tube, rings = 10, sides = 4) {
    const pos = [], nor = [], uv = [], idx = [];
    for (let i = 0; i <= rings; i++) {
      const t = i / rings * Math.PI, cx = Math.cos(t) * rx, cy = Math.sin(t) * ry;
      let tx = -Math.sin(t) * rx, ty = Math.cos(t) * ry; const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
      const nx = ty, ny = -tx;   // yayın dışa bakan normali (düzlem içinde)
      for (let k = 0; k < sides; k++) {
        const a = k / sides * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const ox = nx * ca, oy = ny * ca, oz = sa;
        pos.push(cx + ox * tube, Math.max(0, cy + oy * tube), oz * tube); nor.push(ox, oy, oz); uv.push(k / sides, i / rings);
      }
    }
    for (let i = 0; i < rings; i++) for (let k = 0; k < sides; k++) {
      const a = i * sides + k, b = i * sides + (k + 1) % sides, c = a + sides, d = b + sides;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  function tuftGeo(kind) {
    const key = 'tuft-' + kind; if (GEOC[key]) return GEOC[key];
    const k = new Kit(), loop = kind === 'loop';
    const col = (x, y) => { const t = Math.min(1, Math.max(0, y)); const v = 0.45 + 0.62 * t * t * (3 - 2 * t); return new THREE.Color(v, v, v); };
    const arcs = loop ? [[0, 0, 0, 1]] : [[0, 0, 0, 1], [1.05, 0.06, 0.05, 0.86], [2.1, -0.05, 0.07, 0.93]];
    for (const [yaw, ox, oz, hh] of arcs) {
      const g = archGeo(0.26, hh, 0.09, loop ? 5 : 7, 3);
      k.add(g, col, [ox, 0, oz], [0, yaw, 0]);
    }
    return (GEOC[key] = keepG(k.build()));
  }
  function swayMat() {
    if (MATC.sway) return MATC.sway;
    const m = MATC.sway = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }); m.userData.keep = true;
    m.onBeforeCompile = sh => {
      sh.uniforms.uOkT = TIME.u;
      sh.vertexShader = 'uniform float uOkT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float okPh = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
        float okH = max(position.y, 0.0);
        transformed.x += sin(uOkT * 1.4 + okPh) * okH * okH * 0.09;
        transformed.z += cos(uOkT * 1.1 + okPh * 1.3) * okH * okH * 0.06;
        #endif`);
    };
    m.customProgramCacheKey = () => 'odakit-sway';
    return m;
  }
  // items: [{x, z, h, s (genişlik), c: THREE.Color, yaw}]
  function tufts(api, items, kind = 'tuft') {
    if (!items.length) return null;
    const chunks = new Map(), CK = 14;   // görüş dışındaki parçalar çizilmesin: 14 m'lik parçalar
    for (const it of items) { const key = Math.floor(it.x / CK) * 4096 + Math.floor(it.z / CK); let a = chunks.get(key); if (!a) chunks.set(key, a = []); a.push(it); }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), out = [];
    for (const list of chunks.values()) {
      const im = new THREE.InstancedMesh(tuftGeo(kind), swayMat(), list.length);
      list.forEach((it, i) => { p.set(it.x, 0, it.z); q.setFromEuler(e.set(0, it.yaw || 0, 0)); s.set(it.s, it.h, it.s); m4.compose(p, q, s); im.setMatrixAt(i, m4); im.setColorAt(i, it.c); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.receiveShadow = true; im.castShadow = false; im.name = 'odakit-lifler'; im.computeBoundingSphere();
      api.add(im); out.push(im);
    }
    return out;
  }

  // ── oyuncak malzemesi (köşe renkli, parlak/mat) ──
  function vmat(rough = 0.5, key = 'v') {
    const k = key + rough; if (MATC[k]) return MATC[k];
    const m = MATC[k] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0 }); m.userData.keep = true; return m;
  }
  function mesh(api, geo, x, y, z, rough = 0.5, cast = true) {
    const m = new THREE.Mesh(geo, vmat(rough)); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; api.add(m); if (!geo.userData.keep) api.dispose(geo); return m;
  }
  // ipucu yıldızı: oyuncağın üstünde zıplayan altın yıldız (kullanılınca söner)
  function starGeo() {
    if (GEOC.star) return GEOC.star;
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, r = i & 1 ? 0.42 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2 }); g.translate(0, 0, -0.14);
    const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = 1; c[i * 3 + 1] = 0.82; c[i * 3 + 2] = 0.3; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return (GEOC.star = keepG(g));
  }
  // SADE7: ipucu işareti = küçük, yumuşak ışıklı yuvarlak boncuk (eski dev eğik sarı yıldız yerine; mantardaki ESYA boncuklarıyla aynı dil)
  function beadGeo() { return GEOC.bead || (GEOC.bead = keepG(new THREE.SphereGeometry(0.2, 14, 10))); }
  function beadMat() {
    if (MATC.bead) return MATC.bead;
    const m = MATC.bead = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6c8).multiplyScalar(1.3) }); m.userData.keep = true; return m;
  }
  function hintMat() {
    if (MATC.hint) return MATC.hint;
    const m = MATC.hint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.2, emissive: 0xffb830, emissiveIntensity: 0.9 }); m.userData.keep = true; return m;
  }
  function haloMat() {   // ipucu yıldızının yumuşak ışıltısı
    if (MATC.halo) return MATC.halo;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,236,160,0.9)'); gr.addColorStop(0.4, 'rgba(255,210,90,0.35)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    const m = MATC.halo = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); m.userData.keep = true; return m;
  }

  // ── oyun tarafı yardımcıları ──
  const G_ = () => (typeof GAME !== 'undefined' ? GAME : null);
  const HA = () => { const g = G_(); return g && g.halaApi; };
  const say = (key, prio = 2) => { const a = HA(); try { return a ? a.say(key, prio) : 0; } catch (e) { return 0; } };
  const sfx = (n, o) => { const a = HA(); try { if (a) a.sfx(n, o); } catch (e) { /* ses yok */ } };
  const burst = (k, x, y, z, o) => { const a = HA(); try { if (a) a.burst(k, x, y, z, o || {}); } catch (e) { /* efekt yok */ } };
  const ring = (x, z, r, color) => { const a = HA(); try { if (a) a.fx('ring', x, z, { r0: 0.3, r1: r, dur: 0.6, color, width: 0.4 }); } catch (e) { /* */ } };
  function sugar(x, z, gold = 8, n = 6) {
    const g = G_(); if (!g) return;
    if (typeof g.dropSugar === 'function') { try { g.dropSugar(x, z, gold, n); } catch (e) { /* */ } }
    burst('coin', x, 1, z, {});
  }
  const playing = () => { const g = G_(); return !!(g && g.state === 'play' && !g.paused && g.P && !g.P.dead); };
  function heroY(y) { const g = G_(); if (!g) return; g.P.pos.y = y; if (g.H && g.H.root) g.H.root.position.y = y; }
  function sticker(id) { const g = G_(); try { if (g && g.giveSticker) g.giveSticker(id, 'gizli'); } catch (e) { /* */ } }

  // ── oyuncak çerçevesi: bölüm başına bir tane (kur içinde ODAKIT.toys(api)) ──
  // t.add({ x, z, r, hint: {y}, line: 'ses anahtarı (ilk yaklaşmada)', near: 6, cd: 4, once, use(T) }) → T; T.used, T.busy
  let BOOST = null;   // hız artışı (Bilbo yarışı): bölüm değişirse eski hız geri gelir
  function unboost() { const g = G_(); if (BOOST && g && g.P) g.P.speed = BOOST.base; const b = BOOST; BOOST = null; if (b && b.end) { try { b.end(); } catch (e) { /* */ } } }
  function toys(api) {
    const list = [], heard = {};
    let ride = null, t = 0;
    if (BOOST) { BOOST.end = null; unboost(); }
    heroY(0);
    const T = {
      list,
      boost(mult, dur, end) { const g = G_(); if (!g || BOOST) return false; BOOST = { base: g.P.speed, mult, left: dur, end }; return true; },
      get boosting() { return !!BOOST; },
      add(o) {
        const it = Object.assign({ r: 1.8, cd: 3, near: 7, used: 0, last: -99, inside: false }, o);
        if (o.hint !== false) {
          const s = new THREE.Mesh(beadGeo(), beadMat()); s.position.set(it.x, Math.min(1.6, (o.hint && o.hint.y) || 2.2), it.z); s.name = 'odakit-ipucu';
          const halo = new THREE.Sprite(haloMat()); halo.scale.setScalar(1.1); s.add(halo);   // (yumuşak, küçük ışıltı)
          api.add(s); it.star = s; it.starY = s.position.y;
        }
        list.push(it); return it;
      },
      // Feza'yı bir yol boyunca taşı (tekne, kaydırak, trambolin): pts [[x,z]…], speed m/s, y(t01) yükseklik, end()
      ride(o) { if (ride) return false; ride = Object.assign({ s: 0, len: 0, segs: [] }, o); let L0 = 0; for (let i = 1; i < o.pts.length; i++) { const a = o.pts[i - 1], b = o.pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); ride.segs.push({ a, b, l, at: L0 }); L0 += l; } ride.len = L0; return true; },
      get riding() { return !!ride; },
    };
    K_.last = T;   // (QA: son kurulan bölümün oyuncakları)
    api.anim((dt, hx, hz) => {
      t += dt;
      const g = G_(), P = g && g.P;
      if (BOOST && P) { BOOST.left -= dt; if (BOOST.left <= 0 || P.dead) unboost(); else P.speed = BOOST.base * BOOST.mult; }
      for (const it of list) {
        const quiet = it.line && /bilbo/.test(it.line) && bossQuiet();   // biniş ipucu boss sırasında susar
        if (it.star) { it.star.visible = (!it.used || it.repeat) && !quiet; if (it.star.visible) { it.star.position.y = it.starY + Math.sin(t * 2 + it.x) * 0.1;   /* SADE7: hafif yukarı-aşağı süzülme */ } }
        if (it.tick) it.tick(dt, t, hx, hz);
        if (!P || !playing()) continue;
        const d = Math.hypot(hx - it.x, hz - it.z);
        if (it.line && !quiet && !heard[it.line] && d < it.near && !it.used) {
          heard[it.line] = 1; say(it.line, it.prio ?? 2);
          if (it.star && typeof PIRIL_GUC !== 'undefined' && PIRIL_GUC && typeof PIRIL_GUC.pointTo === 'function') { try { PIRIL_GUC.pointTo(it.x, it.z); } catch (e) { /* */ } }   // Aytuğ Hala oyuncağı gösterir
        }
        const inside = d < it.r;
        if (inside && !it.inside && t - it.last > it.cd && !(it.once && it.used) && !ride && !(it.can && !it.can())) {
          it.last = t; it.used++;
          try { it.use(T, it); } catch (e) { console.warn('ODAKIT oyuncak', e); }
          if (it.used === 1 && it.star && typeof HALA !== 'undefined' && HALA && !HALA.busy) { try { if (it.dance && HALA.dance) HALA.dance(it.dance); else if (HALA.cheer) HALA.cheer(1.4); } catch (e) { /* */ } }   // Aytuğ Hala sevinir
        }
        it.inside = inside;
      }
      if (ride && P) {
        if (!playing()) { heroY(0); const r0 = ride; ride = null; if (r0.end) r0.end(true); return; }
        ride.s += (ride.speed || 6) * dt;
        const s = Math.min(ride.s, ride.len);
        let sg = ride.segs[ride.segs.length - 1];
        for (const q of ride.segs) if (s <= q.at + q.l) { sg = q; break; }
        const f = sg.l > 0 ? (s - sg.at) / sg.l : 1, x = sg.a[0] + (sg.b[0] - sg.a[0]) * f, z = sg.a[1] + (sg.b[1] - sg.a[1]) * f;
        P.pos.x = x; P.pos.z = z; P.face = Math.atan2(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]);
        const y = ride.y ? ride.y(s / ride.len, s) : 0; heroY(y);
        if (g.H && g.H.root) { g.H.root.position.x = x; g.H.root.position.z = z; g.H.root.rotation.y = P.face; }
        if (ride.tick) ride.tick(s / ride.len, x, z, dt);
        if (s >= ride.len) { heroY(0); const r0 = ride; ride = null; if (r0.end) r0.end(false); }
      }
    });
    return T;
  }

  // Kayıp eşya (Aytuğ Hala'nın): tümsek + parıltı; yaklaşınca Bilbo kazar (GAME.bilboDig varsa o da çağrılır), eşya fırlar ve döner
  // o = { zone, id, x, z, mound: geo, item: geo, itemScale, ipucu, bulundu, color }
  function lost(api, T, o) {
    const g = G_(), done = () => !!(g && g.P && g.P.kayipEsyalar && g.P.kayipEsyalar[o.zone]);
    if (done()) return null;
    const grp = new THREE.Group(); grp.position.set(o.x, 0, o.z); api.add(grp);
    const md = new THREE.Mesh(o.mound, vmat(0.95)); md.castShadow = true; md.receiveShadow = true; grp.add(md);
    const it = new THREE.Mesh(o.item, vmat(0.3)); it.visible = false; it.scale.setScalar(o.itemScale || 1); it.castShadow = true; grp.add(it);
    const sy = md.scale.y; let dig = -1;
    return T.add({ x: o.x, z: o.z, r: 2.2, hint: { y: 2.1 }, line: o.ipucu, near: 8, once: true, can: () => !done(),
      use: () => { dig = 0; sfx('dig', { x: o.x, z: o.z }); const gg = G_(); if (gg && typeof gg.bilboDig === 'function') { try { gg.bilboDig(o.x, o.z, o.id); } catch (e) { /* */ } } },
      tick: (dt, t) => {
        if (dig < 0) { if (Math.random() < dt * 1.5) burst('sparkle', o.x, 0.8, o.z); return; }
        if (dig > 3) return;
        dig += dt;
        if (dig < 1.3) { if (Math.random() < dt * 10) burst(o.dirt || 'dirt', o.x + (Math.random() - 0.5), 0.3, o.z + (Math.random() - 0.5)); md.scale.y = sy * (1 - dig / 1.3) + 0.03; }
        else {
          if (!it.visible) { it.visible = true; sfx('unlock', { x: o.x, z: o.z }); burst('confetti', o.x, 1.5, o.z); ring(o.x, o.z, 3, '#ffe28a');
            const gg = G_(); try { if (gg) gg.foundLostItem(o.id, o.zone); } catch (e) { /* */ }
            if (!(typeof AUD !== 'undefined' && AUD.LINES && AUD.LINES['kayip_' + o.id])) say(o.bulundu); }   // (hikâyenin kendi cümlesi varsa o söyler)
          const u = Math.min(1, (dig - 1.3) / 1.2); it.position.y = 0.4 + Math.sin(u * Math.PI * 0.5) * 2.2; it.rotation.y += dt * 4;
        }
      } });
  }
  // Gizli hazine: yürünür kenarın dışında yarı gömülü dev nesne; yaklaşınca zıplar, döner, şeker saçar
  function treasure(api, T, x, z, geo, o = {}) {
    const m = mesh(api, geo, x, o.y ?? 0.15, z, o.rough ?? 0.4, !!o.cast);
    m.scale.setScalar(o.sc || 1); m.rotation.set(o.tilt ?? 0.35, Math.random() * TAU, 0.2);
    let pop = -1; const y0 = m.position.y;
    return T.add({ x, z, r: o.r || 2.4, hint: { y: o.hintY || 1.9 }, line: o.line || null, near: 6, once: true,
      use: () => { pop = 0; sfx('chest', { x, z }); burst('confetti', x, 1.2, z); ring(x, z, 2.5, '#ffd36a');
        const g = G_(); if (g && g.P) sugar(g.P.pos.x, g.P.pos.z, o.gold || 10, o.n || 6); if (o.say) say(o.say); if (o.gs && g && g.addGoldSugar) { g.addGoldSugar(1); burst('star', x, 2, z); }
        if (o.sticker) sticker(o.sticker); if (o.onUse) o.onUse(); },
      tick: dt => { if (pop < 0 || pop > 1.2) return; pop += dt; const u = Math.min(1, pop / 1.2); m.position.y = y0 + Math.sin(u * Math.PI) * 2.2; m.rotation.y += dt * 9; m.rotation.x = (o.tilt ?? 0.35) * (1 - u); } });
  }
  // Odanın yürünür kenarının hemen dışındaki noktalar (koridor ağızlarından uzak)
  function rimSpots(L, rm, off = 1.0, n = 24) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = k * TAU / n; let last = null;
      for (let d = rm.r * 0.4; d < rm.r + 6; d += 0.25) { const x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d; if (!isF(L, x, z)) { last = { x: x + Math.sin(a) * off, z: z + Math.cos(a) * off, a, ex: x, ez: z, inX: x - Math.sin(a) * 1.2, inZ: z - Math.cos(a) * 1.2 }; break; } }
      if (last && L.links.every(l => !l.curve || l.curve.every(p => Math.hypot(p[0] - last.x, p[1] - last.z) > 3.2))) out.push(last);
    }
    return out;
  }
  // geçitteki koridor yönü (birim vektör)
  function gateDir(L, g) {
    let best = null, bd = 1e9, bi = 0;
    for (const l of L.links) if (l.main && l.curve) l.curve.forEach((p, i) => { const d = Math.hypot(p[0] - g.x, p[1] - g.z); if (d < bd) { bd = d; best = l; bi = i; } });
    if (!best) return [0, -1];
    const c = best.curve, a = c[Math.max(0, bi - 4)], b = c[Math.min(c.length - 1, bi + 4)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  }
  const bbox = (L, ids, m) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const i of ids) { const r = L.rooms[i]; x0 = Math.min(x0, r.x - r.r - m); x1 = Math.max(x1, r.x + r.r + m); z0 = Math.min(z0, r.z - r.r - m); z1 = Math.max(z1, r.z + r.r + m); } return { x0, x1, z0, z1 }; };
  // alan tabanlı nazik huysuz yerleşimi: grup başına en çok `cap`, türler alanın listesinden
  function gentle(L, perArea, cap = 3) {
    const A = L.areas || [], areaOf = {}, packs = {}, keep = [];
    A.forEach((a, k) => a.rooms.forEach(ri => { areaOf[ri] = k; }));
    for (const sp of L.spawns) {
      const n = packs[sp.pack] = (packs[sp.pack] || 0) + 1;
      if (n > cap) continue;
      const ar = areaOf[sp.room] ?? 0, list = perArea[Math.min(perArea.length - 1, ar)];
      sp.type = list[(n - 1 + ar) % list.length]; delete sp.variant;
      keep.push(sp);
    }
    L.spawns.length = 0; L.spawns.push(...keep);
  }
  // fazladan sandık: her alanın ilk odasında, yolun kenarında
  function extraChests(L, api) {
    for (const a of (L.areas || []).slice(0, 3)) {
      const rm = L.rooms[a.rooms[0]];
      for (let t = 0; t < 30; t++) {
        const ang = api.rnd() * TAU, d = rm.r * (0.45 + api.rnd() * 0.25), x = rm.x + Math.sin(ang) * d, z = rm.z + Math.cos(ang) * d;
        if (!api.circleFree(x, z, 1.6) || L.chests.some(c => Math.hypot(c.x - x, c.z - z) < 6) || L.spawns.some(s => Math.hypot(s.x - x, s.z - z) < 2.5) || Math.hypot(x - L.start.x, z - L.start.z) < 4) continue;
        if (L.checkpoints.some(c => Math.hypot(c.x - x, c.z - z) < 4)) continue;
        L.chests.push({ x, z, big: false }); break;
      }
    }
  }

  // Yürünür alanın dışını dev nesnelerle doldur: oda kutusu içinde ızgara (adım step), zemine uzaklık [d0, d1] arası noktalar.
  // cb(x, z, maxH (kamera önündeyse alçak), fd (zemine uzaklık), k) → nesne koyar
  function fill(L, rnd, ids, cb, o = {}) {
    const q = bbox(L, ids, o.margin ?? 8), step = o.step ?? 2.4, d0 = o.d0 ?? 1.5, d1 = o.d1 ?? 7, skip = o.skip;
    let k = 0;
    for (let z = q.z0; z < q.z1; z += step) for (let x = q.x0; x < q.x1; x += step) {
      const px = x + (rnd() - 0.5) * step * 0.6, pz = z + (rnd() - 0.5) * step * 0.6;
      if (isF(L, px, pz) || (skip && skip(px, pz))) continue;
      const fd = floorDist(L, px, pz, d1 + 0.5); if (fd < d0 || fd > d1) continue;
      const fN = floorNorth(L, px, pz, 8), maxH = fN < 99 ? 0.25 + fN * 0.3 : 12;
      cb(px, pz, maxH, fd, k++);
    }
  }
  // yürünür alana küçük, yassı süsler serp (üstünden geçilir): cb(x, z, k)
  function scatter(L, rnd, ids, perRoom, cb) {
    let k = 0;
    for (const ri of ids) { const r0 = L.rooms[ri]; for (let i = 0; i < perRoom; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r0.r * 1.05, x = r0.x + Math.sin(a) * d, z = r0.z + Math.cos(a) * d; if (isF(L, x, z) && floorDist(L, x + 0.6, z, 1) === 0) cb(x, z, k++); } }
  }
  // geçidin iki yanına dikili dev süs (koridorun dışında; kameranın önündeyse konmaz). put(x, z, yaw, s)
  function gatePosts(L, g, h, put) {
    if (!g) return;
    const [dx, dz] = gateDir(L, g), nx = -dz, nz = dx;
    for (const sd of [-1, 1]) {
      for (let off = 2.2; off < 6; off += 0.4) {
        const x = g.x + nx * off * sd, z = g.z + nz * off * sd;
        if (floorDist(L, x, z, 1.5) < 1.1) continue;
        const fN = floorNorth(L, x, z, 8), maxH = fN < 99 ? 0.25 + fN * 0.3 : 99;
        if (maxH >= h) put(x, z, Math.atan2(nx * sd, nz * sd), 1);
        break;
      }
    }
  }
  // Oda içi mini oyun istasyonu (yerlesim'de): tercih listesinden kayıtlı ilk mini oyun; UI içine girince başlatır
  function miniStation(L, api, rm, prefer) {
    if (typeof MINIGAME === 'undefined' || !MINIGAME.list) return null;
    const ids = MINIGAME.list(), id = prefer.find(p => ids.includes(p)) || ids[0];
    if (!id) return null;
    for (let t = 0; t < 40; t++) {
      const a = api.rnd() * TAU, d = rm.r * (0.5 + api.rnd() * 0.25), x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
      if (!api.circleFree(x, z, 1.8) || L.chests.some(c => Math.hypot(c.x - x, c.z - z) < 4) || (L.checkpoints || []).some(c => Math.hypot(c.x - x, c.z - z) < 4)) continue;
      if ((L.path || []).some(p => Math.hypot(p.x - x, p.z - z) < 2.2)) continue;
      const st = { id: 'mini_' + id, kind: 'mini', mini: id, x, z, r: 1.3 };
      (L.stations = L.stations || []).push(st); return st;
    }
    return null;
  }
  // mini oyun hediye kutusu (görsel): kurdeleli kutu + parlayan halka
  function miniBox(api, T, st, line) {
    const k = new Kit(), b = G.rbox(2);
    k.add(b, 0xf48fb1, [0, 0.75, 0], null, [1.5, 1.5, 1.5]); k.add(b, 0xf6a8c4, [0, 1.6, 0], null, [1.7, 0.35, 1.7]);
    k.add(G.box(), 0xffe066, [0, 0.95, 0], null, [0.3, 1.95, 1.72]); k.add(G.box(), 0xffe066, [0, 0.95, 0], null, [1.72, 1.95, 0.3]);
    for (const sd of [-1, 1]) k.add(G.torus(TAU, 0.22, 16), 0xffd23a, [sd * 0.38, 2.05, 0], [0, 0, sd * 0.5], [0.4, 0.3, 0.4]);
    k.add(G.sphere(10, 8), 0xffc21a, [0, 1.98, 0], null, 0.2);
    const m = mesh(api, k.build(), st.x, 0, st.z - 1.6, 0.45);
    api.put(G.torus(TAU, 0.08, 40), st.x, 0.05, st.z, st.r, st.r, 1, 0xffd23a, 0, Math.PI / 2);
    api.light(st.x, 2, st.z, 0xffc0e0, 1.6, 6); api.solid(st.x, st.z - 1.6, 0.95);
    T.add({ x: st.x, z: st.z, r: 0, near: 7, hint: { y: 2.8 }, line, prio: 1, use() {}, tick: (dt, t) => { m.rotation.y = Math.sin(t * 1.5) * 0.12; m.position.y = Math.abs(Math.sin(t * 3)) * 0.12; } });
    return m;
  }
  // boss uyanıkken ya da Feza boss arenasındayken biniş çağrısı ve halkanın parıltısı susar
  function bossQuiet() {
    const g = G_(); if (!g) return false;
    const b = g.boss; if (b && !b.dead && (b.aggro || b.encounter)) return true;
    const A = g.L && g.L.areas, a = A && g.P && A[g.P.area]; return !!(a && a.boss);
  }
  // Bilbo'ya biniş halkası: büyük patili altın disk + nabız gibi atan parlak halka + ışık (istasyon kind 'binis' bunun üstünde)
  function pawPad(api, x, z, sc = 1.5) {
    const key = 'pawPad'; let g = GEOC[key];
    if (!g) {
      const k = new Kit(), cy = G.cyl(1, 1, 36);
      k.add(cy, 0xffd27a, [0, 0, 0], null, [1.45, 0.05, 1.45]); k.add(G.torus(TAU, 0.08, 36), 0xf4a63a, [0, 0.04, 0], [Math.PI / 2, 0, 0], [1.42, 1.42, 0.5]);
      k.add(cy, 0x7a4a2a, [0, 0.04, 0.22], null, [0.46, 0.02, 0.38]);
      for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.55; k.add(cy, 0x7a4a2a, [Math.sin(a) * 0.68, 0.04, 0.22 - Math.cos(a) * 0.68], null, [0.17, 0.02, 0.21]); }
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10; k.add(cy, 0x7a4a2a, [Math.sin(a) * 1.18, 0.045, Math.cos(a) * 1.18], null, [0.08, 0.02, 0.1]); }   // kenarda minik pati izleri
      g = GEOC[key] = keepG(k.build());
    }
    api.put(g, x, 0.03, z, sc, 1, sc, null, 0.4);
    const rm = new THREE.MeshBasicMaterial({ color: 0xffd860, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); api.dispose(rm);
    const ringG = new THREE.RingGeometry(0.88, 1, 48); ringG.rotateX(-Math.PI / 2); api.dispose(ringG);
    const ring = new THREE.Mesh(ringG, rm); ring.position.set(x, 0.1, z); ring.renderOrder = 3; api.add(ring);
    api.light(x, 2, z, 0xffd27a, 1.8, 6);
    api.anim(() => { const u = (TIME.t * 0.7) % 1, q = bossQuiet(); ring.visible = !q; ring.scale.setScalar(sc * (1.1 + u * 0.9)); rm.opacity = 0.7 * (1 - u); });
  }
  // Performans: alçak/küçük birleştirilmiş süsler gölge düşürmesin (görünüş aynı: aynı parlak malzeme, 'shinyNS' parçası).
  // api.put'u sarar: malzeme anahtarı verilmemiş ve tepesi hMax'tan alçak her süs → 'shinyNS'. Büyük nesneler gölgede kalır.
  function lowShadow(api, hMax = 1.7) {
    if (api._lowSh) return api; api._lowSh = true;
    const put0 = api.put;
    api.put = function (geo, x, y, z, sx = 1, sy = sx, sz = sx, color, yaw, rx, rz, matKey) {
      const sMax = Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz));
      if (geo === G.sphere() && sMax < 0.9) geo = G.sphere(10, 7);   // küçük toplar/köpükler: daha az üçgen
      if (!matKey) {
        const bb = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox), s = Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz));
        const top = y + (rx || rz ? Math.max(bb.max.x, bb.max.y, bb.max.z) * s : bb.max.y * Math.abs(sy));
        matKey = top < hMax ? 'shinyNS' : 'shiny';
      }
      return put0.call(api, geo, x, y, z, sx, sy, sz, color, yaw, rx, rz, matKey);
    };
    return api;
  }

  // ── Alan geçitleri (BÜTÜN odalar; 06_level build çağırır): bir alanın çıkışı, o alanın huysuzlarının %70'i neşelenince açılır ──
  // Kapalıyken koridorda renkli şeker çit + kurdele + kalan huysuz rozeti; Feza yaklaşınca Aytuğ Hala söyler, kalan huysuzlar uyanıp
  // Feza'ya gelir, yerde ok onları gösterir. Açılınca çit yere iner, konfeti, "Yol açıldı!". Boss arenası da son alan temizlenince açılır.
  const GATE_K = 0.7;
  let GS = null;   // şu anki bölümün geçit durumu
  const isBossT = t => typeof EDEF !== 'undefined' && EDEF && EDEF[t] && EDEF[t].kind === 'boss';
  function badgeTex(n) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#ff7eb6'; g.beginPath(); g.arc(64, 64, 60, 0, TAU); g.fill(); g.lineWidth = 7; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#b28dff'; g.beginPath(); g.ellipse(40, 70, 22, 20, 0, 0, TAU); g.fill();   // küçük huysuz yüzü (sevimli, somurtkan)
    g.fillStyle = '#fff'; g.beginPath(); g.arc(33, 66, 6, 0, TAU); g.arc(47, 66, 6, 0, TAU); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.arc(34, 67, 3, 0, TAU); g.arc(48, 67, 3, 0, TAU); g.fill();
    g.strokeStyle = '#5a2a7a'; g.lineWidth = 3; g.beginPath(); g.arc(40, 84, 6, Math.PI + 0.4, -0.4); g.stroke();
    g.fillStyle = '#fff'; g.font = '900 64px "Avenir Next", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = '#a0305a'; g.strokeText(String(n), 88, 68); g.fillText(String(n), 88, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function gates(L, api) {
    GS = null;
    const A = L.areas; if (!A || A.length < 2) return;
    const areaOf = {}; A.forEach((a, k) => a.rooms.forEach(ri => { areaOf[ri] = k; }));
    const total = A.map(() => 0); for (const sp of L.spawns || []) { const k = areaOf[sp.room]; if (k !== undefined && !isBossT(sp.type)) total[k]++; }
    const st = GS = { L, areaOf, total, cheered: A.map(() => 0), gates: [], t: 0 };
    const post = G.cyl(1, 1, 12), ball = G.sphere(12, 8);
    for (let k = 1; k < A.length; k++) {
      const g = A[k].gate; if (!g) continue;
      const prev = k - 1, need = Math.ceil(total[prev] * GATE_K);
      const [dx, dz] = gateDir(L, g), nx = -dz, nz = dx;
      const grp = new THREE.Group(); grp.position.set(g.x, 0, g.z); grp.rotation.y = Math.atan2(nx, nz) - Math.PI / 2; api.add(grp);   // yerel x: koridor enine
      const kit = new Kit(), solids = [];
      let lo = 0, hi = 0;
      for (let o = 0; o <= 7; o += 0.5) { if (isF(L, g.x + nx * o, g.z + nz * o)) hi = o; else break; }
      for (let o = 0; o <= 7; o += 0.5) { if (isF(L, g.x - nx * o, g.z - nz * o)) lo = o; else break; }
      const w0 = -lo - 0.5, w1 = hi + 0.5;
      const cols = [0xff6b9a, 0x6bc4ff, 0xffd34a, 0x7ee08a, 0xb28dff];
      let pi = 0;
      for (let o = w0; o <= w1 + 0.01; o += 0.9, pi++) {   // şeker baston direkler (çizgili), tepede top
        const c = cols[pi % cols.length];
        for (let b = 0; b < 6; b++) kit.add(post, b % 2 ? 0xffffff : c, [o, 0.22 + b * 0.36, 0], null, [0.2, 0.36, 0.2]);
        kit.add(ball, c, [o, 2.45, 0], null, 0.3);
        const sx = g.x + nx * o, sz = g.z + nz * o;
        if (isF(L, sx, sz) || isF(L, sx + dx * 0.4, sz + dz * 0.4) || isF(L, sx - dx * 0.4, sz - dz * 0.4)) { const so = { x: sx, z: sz, r: 0.6, alive: true, tag: 'kapi' }; L.solids.push(so); solids.push(so); }
      }
      kit.add(G.box(), 0xff8fc0, [(w0 + w1) / 2, 1.5, 0.12], null, [w1 - w0, 0.3, 0.06]); kit.add(G.box(), 0xffe066, [(w0 + w1) / 2, 0.9, 0.12], null, [w1 - w0, 0.2, 0.05]);   // kurdeleler
      kit.add(G.torus(TAU, 0.18, 16), 0xff6b9a, [(w0 + w1) / 2 - 0.4, 1.5, 0.2], [0, 0, 0.6], [0.4, 0.3, 0.3]); kit.add(G.torus(TAU, 0.18, 16), 0xff6b9a, [(w0 + w1) / 2 + 0.4, 1.5, 0.2], [0, 0, -0.6], [0.4, 0.3, 0.3]);   // fiyonk
      const fence = new THREE.Mesh(kit.build(), vmat(0.35)); fence.castShadow = true; grp.add(fence); api.dispose(fence.geometry);
      const bm = new THREE.SpriteMaterial({ map: badgeTex(need), transparent: true, depthWrite: false, fog: false }); api.dispose(bm);
      const badge = new THREE.Sprite(bm); badge.scale.setScalar(1.0); badge.position.set((w0 + w1) / 2, 2.2, 0); grp.add(badge);   // (Pırıl: küçük, alçak)
      L._sh = null;
      const gt = { k, prev, need, g, grp, fence, badge, bm, solids, open: need <= 0, anim: 0, shown: need, lastSay: -99, lastWake: -99, sayI: 0 };
      if (gt.open) { grp.visible = false; for (const so of solids) so.alive = false; }
      st.gates.push(gt);
    }
    // yerde ok: kalan huysuzu gösterir
    const sh = new THREE.Shape(); sh.moveTo(0, 1.1); sh.lineTo(0.7, 0.2); sh.lineTo(0.28, 0.2); sh.lineTo(0.28, -0.8); sh.lineTo(-0.28, -0.8); sh.lineTo(-0.28, 0.2); sh.lineTo(-0.7, 0.2); sh.closePath();
    const ag = new THREE.ShapeGeometry(sh); ag.rotateX(-Math.PI / 2); ag.scale(0.6, 1, 0.6); api.dispose(ag);
    const am = new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.4, depthWrite: false, fog: false });   // (Pırıl: soluk, küçük ok) api.dispose(am);
    const arrow = new THREE.Mesh(ag, am); arrow.visible = false; arrow.renderOrder = 4; api.add(arrow);
    api.anim((dt, hx, hz) => gateTick(dt, hx, hz, arrow));
  }
  function gateCheer(e) {
    const st = GS; if (!st || e.boss || e.room === undefined) return;
    const g0 = G_(); if (!g0 || g0.L !== st.L) return;
    if (e._gate) { e._gate.c2++; return; }   // ikinci dalga
    const k = st.areaOf[e.room]; if (k === undefined) return;
    st.cheered[k]++;
  }
  // İkinci dalga: alanın kenarlarından, Feza'nın görebileceği yerlerde (5-9 m), mor şeker parıltısıyla doğar ve Feza'ya gelir
  function spawnWave(g0, st, gt, hx, hz) {
    const L = st.L, A = L.areas, area = A[gt.prev], rooms = new Set(area.rooms);
    const types = (L.spawns || []).filter(s => rooms.has(s.room) && !isBossT(s.type)).map(s => s.type);
    if (!types.length || !g0.spawnEnemy) return 0;
    const n = Math.max(2, Math.round(st.total[gt.prev] * 0.8)), pts = [];
    for (let t = 0; t < 160 && pts.length < n; t++) {
      const a = Math.random() * TAU, d = 5 + Math.random() * 4, x = hx + Math.sin(a) * d, z = hz + Math.cos(a) * d;
      if (!LEVEL.isFloor(L, x, z) || !LEVEL.circleFree(L, x, z, 1.0) || (z > hz + 4.5)) continue;   // (güneyde çok aşağıda değil: ekranda görünsün)
      let ri = -1, bd = 1e9; for (const r of area.rooms) { const rm = L.rooms[r], dd = Math.hypot(rm.x - x, rm.z - z) - (rm.r || 6); if (dd < bd) { bd = dd; ri = r; } }
      if (bd > 3 || pts.some(q => Math.hypot(q.x - x, q.z - z) < 1.8) || Math.hypot(x - gt.g.x, z - gt.g.z) < 3) continue;
      pts.push({ x, z, room: ri });
    }
    for (let t = 0; t < 200 && pts.length < n; t++) {   // yakında yer yoksa: alanın odalarında, Feza'ya 4-14 m
      const ri = area.rooms[t % area.rooms.length], rm = L.rooms[ri], a = Math.random() * TAU, d = Math.sqrt(Math.random()) * (rm.r || 6) * 0.8, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d, dh = Math.hypot(x - hx, z - hz);
      if (dh < 4 || dh > 14 || !LEVEL.isFloor(L, x, z) || !LEVEL.circleFree(L, x, z, 1.0) || pts.some(q => Math.hypot(q.x - x, q.z - z) < 1.8)) continue;
      pts.push({ x, z, room: ri });
    }
    gt.wave = []; gt.c2 = 0;
    pts.forEach((q, i) => {
      const type = types[i % types.length], elite = i === 0 && st.total[gt.prev] >= 4;
      gt.wave.push(Object.assign({ type, elite, at: st.t + 0.9 + i * 0.35 }, q));
      burst('magic', q.x, 0.6, q.z, { color: '#b28dff' });
    });
    return pts.length;
  }
  function nearestLeft(g0, area, hx, hz) {
    if (!g0.roomEnemies) return null;
    let best = null, bd = 1e9;
    for (const e of g0.roomEnemies(area.rooms)) { const d = Math.hypot(e.x - hx, e.z - hz); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  const BW = new THREE.Vector3();   // (rozet dünya konumu: her kare yeni nesne yok)
  function gateTick(dt, hx, hz, arrow) {
    const st = GS, g0 = G_(); if (!st || !g0 || g0.L !== st.L) return;
    st.t += dt; arrow.visible = false;
    const P = g0.P, A = st.L.areas;
    for (const gt of st.gates) {
      if (gt.open) { if (gt.anim < 1 && gt.grp.visible) { gt.anim = Math.min(1, gt.anim + dt * 1.6); gt.grp.position.y = -gt.anim * 2.8; gt.grp.scale.setScalar(1 - gt.anim * 0.3); if (gt.anim >= 1) gt.grp.visible = false; } continue; }
      let left = Math.max(0, gt.need - st.cheered[gt.prev]);
      if (left > 0 && Math.hypot(hx - gt.g.x, hz - gt.g.z) < 10 && g0.roomEnemies && !g0.roomEnemies(A[gt.prev].rooms).length) left = 0;   // (alanda huysuz kalmadıysa yine de açılır)
      // ikinci dalga (boss arenasının geçidinde yok): ilk grup bitince Hala uyarır, yeni grup kenarlardan doğar
      const arenaGate = !!A[gt.k].boss;
      if (left <= 0 && !arenaGate && gt.wave === undefined) {
        const n = spawnWave(g0, st, gt, hx, hz);
        if (n > 0) { gt.need2 = Math.ceil(n * GATE_K); say('dalga_' + (1 + (gt.k % 3)), 3); if (typeof HALA !== 'undefined' && HALA && HALA.expr) { try { HALA.expr('saskin', 2); } catch (e) { /* */ } } }
        else gt.wave = null;   // doğamadıysa çıkmaz olmasın: geçit açılır
      }
      if (gt.wave && gt.wave.length) {   // sırayla doğur (mor parıltı + pop), hemen Feza'ya gelsin
        for (let i = gt.wave.length - 1; i >= 0; i--) {
          const w = gt.wave[i]; if (st.t < w.at) continue;
          gt.wave.splice(i, 1);
          let e = null; try { e = g0.spawnEnemy(w.type, w.x, w.z, { elite: w.elite, room: w.room, pack: 'dalga' + gt.k }); } catch (err) { e = null; }
          if (e) { e._gate = gt; gt.spawned = (gt.spawned || 0) + 1; burst('magic', w.x, 1, w.z, { color: '#c08cff' }); burst('sparkle', w.x, 1.2, w.z, { color: '#e0b0ff' }); sfx('pop', { x: w.x, z: w.z, pitch: 0.8 }); }
        }
        if (!gt.wave.length && g0.wakeRooms) { try { g0.wakeRooms(A[gt.prev].rooms); } catch (err) { /* */ } }
      }
      if (gt.wave !== undefined && gt.wave !== null) {
        if (!gt.wave.length && !gt.spawned) gt.need2 = 0;
        left = gt.wave.length ? Math.max(1, gt.need2 - gt.c2) : Math.max(0, gt.need2 - gt.c2);
        if (left > 0 && !gt.wave.length && g0.roomEnemies && !g0.roomEnemies(A[gt.prev].rooms).length) left = 0;
      }
      if (left !== gt.shown) { gt.shown = left; gt.bm.map.dispose(); gt.bm.map = badgeTex(left); gt.bm.needsUpdate = true; }
      if (!gt.kuzey) {   // rozet geçidin kuzey (kameradan uzak) tarafına: güneydeki geçitlerde kameranın dibine düşmesin
        gt.kuzey = 1; const p = gt.badge.getWorldPosition(BW); p.z -= 1.4; gt.grp.worldToLocal(p); gt.badge.position.x = p.x; gt.badge.position.z = p.z;
      }
      gt.badge.position.y = 2.2 + Math.sin(st.t * 3) * 0.08;
      { const wp = gt.badge.getWorldPosition(BW), dd = Math.hypot(wp.x - hx, wp.z - hz); gt.bm.opacity = Math.min(1, Math.max(0, (dd - 1.5) / 2.5)) * 0.9 + 0.1; }   // Feza yakındayken saydam (kameraya yakın iri görünmesin)
      if (left <= 0) {   // yol açıldı!
        gt.open = true; for (const so of gt.solids) so.alive = false; st.L._sh = null;
        burst('confetti', gt.g.x, 2, gt.g.z); burst('star', gt.g.x, 2.5, gt.g.z); ring(gt.g.x, gt.g.z, 4, '#ffd36a'); sfx('unlock', { x: gt.g.x, z: gt.g.z }); sfx('cheer', { x: gt.g.x, z: gt.g.z, vol: 0.7 });
        say('kapi_acildi', 3);
        if (typeof HALA !== 'undefined' && HALA && HALA.cheer) { try { HALA.cheer(1.5); } catch (e) { /* */ } }
        continue;
      }
      const d = Math.hypot(hx - gt.g.x, hz - gt.g.z), here = (P.area ?? -1) === gt.prev;
      if (here && st.t - (gt.fixT || 0) > 1 && g0.roomEnemies) {   // ulaşılamayan yerdeki (yürünmez, sıkışık) huysuzları yürünür bir yere al
        gt.fixT = st.t;
        for (const e of g0.roomEnemies(A[gt.prev].rooms)) {
          if (!e.m || e.dead) continue;
          if (!LEVEL.isFloor(st.L, e.x, e.z) || !LEVEL.circleFree(st.L, e.x, e.z, Math.min(0.5, (e.r || 0.5) * 0.8))) {
            const q = LEVEL.randomFloorNear(st.L, e.x, e.z, 0.5, 4); if (q && LEVEL.circleFree(st.L, q.x, q.z, 0.6)) { e.x = q.x; e.z = q.z; burst('sparkle', q.x, 0.8, q.z); }
          }
        }
      }
      if (d < 7 && st.t - gt.lastSay > 9 && playing()) {
        gt.lastSay = st.t; say('kapi_kapali_' + (1 + (gt.sayI++ % 3)), 2);
        const q = nearestLeft(g0, A[gt.prev], hx, hz);
        if (q && typeof PIRIL_GUC !== 'undefined' && PIRIL_GUC && PIRIL_GUC.pointTo) { try { PIRIL_GUC.pointTo(q.x, q.z); } catch (e) { /* */ } }
      }
      if ((d < 10 || (here && left <= 3)) && st.t - gt.lastWake > 3 && g0.wakeRooms) { gt.lastWake = st.t; try { g0.wakeRooms(A[gt.prev].rooms); } catch (e) { /* */ } }
      if (here || d < 12) {   // ok: Feza'nın ayağının dibinde, en yakın kalan huysuza doğru
        const q = nearestLeft(g0, A[gt.prev], hx, hz);
        if (q && Math.hypot(q.x - hx, q.z - hz) > 5) { arrow.visible = true; arrow.position.set(hx, 0.07, hz); arrow.rotation.y = Math.atan2(q.x - hx, q.z - hz) + Math.PI; arrow.scale.setScalar(1 + Math.sin(st.t * 6) * 0.08); }
      }
    }
  }
  const K_ = { gates, gateCheer, get gateState() { return GS; }, tex, prewarm, carpetColor, pawPad, lowShadow, fill, outRect, scatter, gatePosts, miniStation, miniBox, lost, treasure, rimSpots, gateDir, bbox, gentle, extraChests, archGeo, floor, slab, edge, rectFree, northOf, floorNorth, floorDist, inRoom, isF, tufts, vmat, mesh, starGeo,
    say, sfx, burst, ring, sugar, playing, heroY, sticker, toys, hash, sm, keepG, GEOC, last: null };
  return K_;
})();
