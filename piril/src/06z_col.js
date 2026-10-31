/* ── Bölüm 3: Kum Saati Çölü (Feza ile Pırıl) ──
   Sıcak pastel bir rüya çölü: şeftali-pembe kum dalgaları, uzakta gülümseyen tombul kum tepeleri (ağaç yok), rüzgârla kayan kum şeritleri.
     1. Gülen Kum Tepeleri  kum şeritleri (üstüne basınca Feza'yı nazikçe taşır), kum kaleleri (dokununca "pof" dağılır, şeker; birinde altın şeker)
     2. Palmiyeli Vaha      ışıl ışıl gölcük, palmiyeler, çöl çiçekleri
     3. Akan Kum Vadisi     dev kum saati (kum akar; yanına gidince döner, şeker yağar), küçük kum saatleri
     4. Renkli Çadırlar     çizgili çadırlar, yerde kilimler, fenerler, flamalar
     Arena: kum meydanı (Koca Bukalemun kumla renk değiştirip saklanır), arkada dev kum saati, çevrede çadırlar.
   Işık: isik3 (boss neşelenince Pırıl'a döner → PIRIL_GUC.ac(3) kanat rüzgârı; motor yapar).
   Genel ad: COL. Biçim: PIRIL.md › 5, src/SPEC.md › "Dev Ev API" (kur api). Huysuzlar/boss: src/05z_col.js. Sesler: pr/istek/COL_SES.md. */
const COL = (() => {
  'use strict';
  const PI = Math.PI, hyp = Math.hypot;
  const PAL = {
    sand: 0xf3d4a2, sandL: 0xfae6c6, sandD: 0xe8b98a, peach: 0xf6c2a0, pink: 0xf6b2bc, lilac: 0xd8c0e8, rose: 0xff9ec2,
    mint: 0x9cebb4, teal: 0x6fd0c8, sky: 0x8fd4ff, saffron: 0xffcf6a, coral: 0xff8f7a, cream: 0xfff6e6, terra: 0xe89a70, stone: 0xf0c8a0,
  };
  const TENT = [[0xff8fb0, 0xfff2e0], [0x7fd0c8, 0xfff2e0], [0xffcf6a, 0xff9a7a], [0xc8a8ff, 0xfff2e0], [0xff9a7a, 0xfff2d0], [0x9fe88a, 0xfff2e0]];
  const FLOWER = [0xff8fc0, 0xffd84a, 0xc8a0ff, 0xff9a7a, 0xffffff, 0x8fd4ff];

  // ════════ Ortak araçlar (malzeme, doku, oyun bağlantıları) ════════
  const MAT = {}, TEXC = {}, GEO = {};
  const keepM = m => { m.userData.keep = true; return m; };
  const keepG = g => { g.userData.keep = true; return g; };
  const geo = (k, f) => GEO[k] || (GEO[k] = keepG(f()));
  const C = h => new THREE.Color(h);
  const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const sm = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const HA = () => (typeof GAME !== 'undefined' && GAME.halaApi) || null;
  const live = () => typeof GAME !== 'undefined' && GAME.state === 'play' && !GAME.paused && GAME.P && !GAME.P.dead && !(typeof MINIGAME !== 'undefined' && MINIGAME && MINIGAME.active);
  function sfx(n, o) { const a = HA(); if (a) try { a.sfx(n, o); } catch (e) { /* ses yok */ } }
  function burst(k, x, y, z, o) { const a = HA(); if (a) try { a.burst(k, x, y, z, o); } catch (e) { /* efekt yok */ } }
  function fx(n, a1, a2, a3, a4, a5) { const a = HA(); if (a) try { a.fx(n, a1, a2, a3, a4, a5); } catch (e) { /* efekt yok */ } }
  let sayAt = -99;
  const said = new Set();
  function say(key, o = {}) {   // anlatıcı / Pırıl cümlesi: once → oyun başına bir kez; aralarında en az 7 s
    const a = HA(); if (!a) return false;
    const now = GAME.time || 0;
    if (o.once !== false && said.has(key)) return false;
    if (now - sayAt < (o.gap ?? 7)) return false;
    if (!(a.hasLine && a.hasLine(key))) return false;
    sayAt = now; said.add(key);
    try { a.say(key, o.prio || 2); } catch (e) { return false; }
    return true;
  }
  function coins(x, z, n = 6, spread = 1) {   // şeker fışkırtır (07'nin biçimi)
    if (typeof GAME === 'undefined' || !GAME.coins) return;
    for (let i = 0; i < n; i++) {
      if (GAME.coins.length > 70) break;
      const a = Math.random() * TAU, s = (1.2 + Math.random() * 1.8) * spread;
      GAME.coins.push({ x, y: 0.8, z, vx: Math.sin(a) * s, vy: 4.5 + Math.random() * 2.5, vz: Math.cos(a) * s, value: 1 + (Math.random() < 0.3 ? 1 : 0), t: 0, rot: Math.random() * TAU, mag: false, mt: 0, ph: Math.random() * TAU });
    }
    sfx('coin', { x, z, vol: 0.5, pitch: 1.3 });
  }
  // ── Dokular (piksel piksel, döşenebilir; bir kez üretilir, saklanır) ──
  function pixTex(key, size, fn) {
    if (TEXC[key]) return TEXC[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data, px = [0, 0, 0];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      fn((x + 0.5) / size, (y + 0.5) / size, px, x, y);
      const o = (y * size + x) * 4; d[o] = px[0]; d[o + 1] = px[1]; d[o + 2] = px[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = typeof ANISO !== 'undefined' ? ANISO : 4;
    t.userData.keep = true;
    return (TEXC[key] = t);
  }
  const rgb = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  function sandTex() {   // ZEMİN: ince rüzgâr dalgacıkları (açık sırt / koyu çukur, ±%5) + kum tanesi (±%3) + seyrek koyu minik çakıl; parıltı yok
    const b = rgb(0xf4d3a2);
    return pixTex('colSand2', 512, (u, v, out, x, y) => {
      const ph = v * 14 + Math.sin(u * TAU * 2) * 0.45 + Math.sin(u * TAU * 5 + v * TAU) * 0.08;   // (döşenebilir: tam sayılı frekanslar)
      const w = Math.sin(ph * TAU), rp = w > 0 ? Math.pow(w, 0.6) : -Math.pow(-w, 1.7);   // keskin sırt, yayvan çukur
      let s = 0.97 + 0.045 * rp + 0.012 * Math.sin(u * TAU * 3 + v * TAU * 2);
      const h = hash(x, y, 1); s += (h - 0.5) * 0.06;
      if (h > 0.994) s *= 0.9;   // seyrek, küçük koyu kum taneleri
      out[0] = b[0] * s; out[1] = b[1] * s; out[2] = b[2] * s;
    });
  }

  function pathTex() {   // açık, sıkışık kum yol (6 m): yuvarlak pastel çakıllar
    const b = rgb(0xfff1dc), P = [rgb(0xf8d8c8), rgb(0xe0e8ee), rgb(0xfbe6c8), rgb(0xece0ee)];   // (zeminden belirgin açık: yol okunsun)
    return pixTex('colPath', 512, (u, v, out, x, y) => {
      let s = 0.97 + 0.03 * Math.sin((u * 4 + v * 3) * TAU) + (hash(x, y, 2) - 0.5) * 0.04, c = b;
      const N = 16, ci = Math.floor(u * N), cj = Math.floor(v * N);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const I = (ci + di + N) % N, J = (cj + dj + N) % N, hh = hash(I, J, 7);
        if (hh > 0.55) continue;
        const px0 = (ci + di + 0.5 + (hash(I, J, 8) - 0.5) * 0.6) / N, py0 = (cj + dj + 0.5 + (hash(I, J, 9) - 0.5) * 0.6) / N, rr = (0.12 + hash(I, J, 5) * 0.16) / N;
        const dd = hyp(u - px0, (v - py0) * 1.2);
        if (dd < rr) { c = P[Math.floor(hash(I, J, 3) * 4)]; s = 1.0 + 0.08 * (1 - dd / rr) - (dd > rr * 0.8 ? 0.08 : 0); }
      }
      out[0] = c[0] * s; out[1] = c[1] * s; out[2] = c[2] * s;
    });
  }
  function stoneTex() {   // sıcak kumtaşı döşeme (5 m): yuvarlatılmış kare taşlar, açık derz
    const b = [rgb(0xe8a486), rgb(0xeeb092), rgb(0xe29c7e), rgb(0xf0b89a)], gr = rgb(0xfff2e0);   // (sıcak terrakota: kumdan net ayrılır)
    return pixTex('colStone', 512, (u, v, out, x, y) => {
      const N = 5, row = Math.floor(v * N), off = row % 2 ? 0.5 : 0, cu = u * N + off, ci = Math.floor(cu), fu = cu - ci, fv = v * N - row;
      const c = b[Math.floor(hash((ci + N) % N, row, 4) * 4)];
      const e = Math.min(fu, 1 - fu, fv, 1 - fv);
      let s = 0.96 + 0.05 * hash(x >> 2, y >> 2, 5) + 0.03 * Math.sin(fu * 9 + fv * 7);
      if (e < 0.035) { out[0] = gr[0]; out[1] = gr[1]; out[2] = gr[2]; return; }
      if (e < 0.08) s *= 1.05;
      out[0] = c[0] * s; out[1] = c[1] * s; out[2] = c[2] * s;
    });
  }
  function canvasTex(key, w, h, draw, rep = true) {
    if (TEXC[key]) return TEXC[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = typeof ANISO !== 'undefined' ? ANISO : 4; t.userData.keep = true;
    return (TEXC[key] = t);
  }
  function kilimTex(i) {   // kilim: kenar bordürü, ortada baklava (eşkenar dörtgen) ve yıldız motifleri, püsküller
    const sets = [['#e8607a', '#fff0d8', '#3fb0a8', '#ffc24a'], ['#5aa8d8', '#fff4e0', '#ff8a6a', '#ffd86a'], ['#b07ad8', '#fff2e4', '#ffb04a', '#5fc8a0']];
    const [A, B, Cc, D] = sets[i % 3];
    return canvasTex('colKilim' + (i % 3), 256, 512, (g, w, h) => {
      g.fillStyle = B; g.fillRect(0, 0, w, h);
      g.fillStyle = A; g.fillRect(14, 14, w - 28, h - 28);
      g.fillStyle = B; g.fillRect(30, 30, w - 60, h - 60);
      g.fillStyle = Cc; g.fillRect(40, 40, w - 80, h - 80);
      for (let k = 0; k < 3; k++) {   // baklavalar
        const cy = 120 + k * 136;
        for (const [rr, col] of [[70, B], [54, A], [36, D], [16, B]]) { g.fillStyle = col; g.beginPath(); g.moveTo(w / 2, cy - rr); g.lineTo(w / 2 + rr * 0.8, cy); g.lineTo(w / 2, cy + rr); g.lineTo(w / 2 - rr * 0.8, cy); g.closePath(); g.fill(); }
      }
      g.fillStyle = D;   // bordürde küçük üçgenler
      for (let y = 20; y < h - 20; y += 22) for (const x of [6, w - 26]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10, y + 10); g.lineTo(x + 20, y); g.closePath(); g.fill(); }
      g.fillStyle = '#fff8ee';   // püsküller
      for (let x = 8; x < w; x += 12) { g.fillRect(x, 0, 4, 10); g.fillRect(x, h - 10, 4, 10); }
    }, false);
  }
  function stripTex() {   // akan kum: akış yönünde (boyuna) yumuşak, kesik kesik kum çizgileri (enine çizgi yok: kaburgaya benzemesin)
    return canvasTex('colStrip2', 128, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.lineCap = 'round';
      const xs = [18, 44, 70, 96, 116];
      xs.forEach((x0, k) => {
        g.strokeStyle = 'rgba(255,248,232,' + (0.5 + 0.2 * (k % 2)) + ')'; g.lineWidth = 5;
        for (let y0 = (k * 37) % 64; y0 < h + 64; y0 += 96) {   // (döşenebilir: 256 / 96 değil ama kesikler rastgele görünür)
          g.beginPath();
          for (let y = 0; y <= 46; y += 4) { const yy = (y0 + y) % h, x = x0 + Math.sin((y0 + y) / h * TAU * 2 + k) * 5; if (y === 0 || yy < 4) g.moveTo(x, yy); else g.lineTo(x, yy); }
          g.stroke();
        }
      });
    });
  }

  function dotTex() {
    return canvasTex('colDot', 64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }, false);
  }

  // ════════ Zemin: 3 doku (kum · yol · kumtaşı), yürünür alan aydınlık, dışarısı sıcak gölgeli ════════
  function floor(L, api, region) {
    const pad = 16, ppm = 2, W = L.W + pad * 2, H = L.H + pad * 2, tw = W * ppm, th = H * ppm;
    const raw = new Float32Array(tw * th * 4), tmp = new Float32Array(tw * th * 4);
    for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
      const x = (i + 0.5) / ppm - pad, z = (j + 0.5) / ppm - pad, o4 = (j * tw + i) * 4;
      const gi = Math.floor(x), gj = Math.floor(z), walk = gi >= 0 && gj >= 0 && gi < L.W && gj < L.H && L.grid[gj * L.W + gi] ? 1 : 0;
      const r = walk ? region(x, z) : null;
      raw[o4] = r ? r[0] : 0; raw[o4 + 1] = walk; raw[o4 + 2] = r ? r[1] : 0; raw[o4 + 3] = 0;
    }
    for (let it = 0; it < 2; it++) {
      tmp.set(raw);
      for (let j = 1; j < th - 1; j++) for (let i = 1; i < tw - 1; i++) {
        const o4 = (j * tw + i) * 4;
        for (let c = 0; c < 3; c++) { let s = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) s += tmp[o4 + (b * tw + a) * 4 + c]; raw[o4 + c] = s / 9; }
      }
    }
    const data = new Uint8Array(tw * th * 4);
    for (let k = 0; k < data.length; k++) data[k] = Math.round(Math.min(1, Math.max(0, raw[k])) * 255);
    const lay = new THREE.DataTexture(data, tw, th, THREE.RGBAFormat);
    lay.magFilter = lay.minFilter = THREE.LinearFilter; lay.needsUpdate = true; api.dispose(lay);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
    const U = {
      tLay: { value: lay }, tM0: { value: sandTex() }, tM1: { value: pathTex() }, tM2: { value: stoneTex() },
      uLay: { value: new THREE.Vector4(pad, pad, 1 / W, 1 / H) }, uRep: { value: new THREE.Vector3(1 / 8, 1 / 6, 1 / 5) },
      uOut: { value: new THREE.Vector3(0.9, 0.68, 0.58) },
    };
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vCoW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCoW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vCoW; uniform sampler2D tLay, tM0, tM1, tM2; uniform vec4 uLay; uniform vec3 uRep, uOut;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `vec4 coL = texture2D(tLay, (vCoW.xz + uLay.xy) * uLay.zw);
          vec3 coC = texture2D(tM0, vCoW.xz * uRep.x).rgb;
          coC = mix(coC, texture2D(tM1, vCoW.xz * uRep.y).rgb, coL.r);
          coC = mix(coC, texture2D(tM2, vCoW.xz * uRep.z).rgb, coL.b);
          float coDune = 0.5 + 0.5 * sin(vCoW.x * 0.21 + sin(vCoW.z * 0.17) * 1.7) * sin(vCoW.z * 0.13 + 1.3);
          float coWind = 0.6 * smoothstep(0.86, 1.0, sin(vCoW.x * 0.55 + vCoW.z * 0.22 + sin(vCoW.z * 0.31 + vCoW.x * 0.07) * 2.6)) * (1.0 - coL.b);
          coC *= (0.95 + 0.08 * coDune) * (1.0 + 0.05 * coWind);   // büyük, yumuşak kum tepecikleri + rüzgâr izleri
          float coTone = 0.5 + 0.5 * sin(vCoW.x * 0.09 + vCoW.z * 0.06 + sin(vCoW.z * 0.11) * 1.3);   // iki tonlu büyük ölçek renk dalgalanması (sıcak ↔ biraz pembe)
          coC *= mix(vec3(1.0), vec3(1.02, 0.965, 0.95), coTone * (1.0 - coL.b * 0.6));
          coC *= mix(uOut * (0.92 + 0.12 * coDune), vec3(1.0), coL.g);
          diffuseColor.rgb *= coC;`);
    };
    mat.customProgramCacheKey = () => 'col-floor';
    api.dispose(mat);
    const g = new THREE.PlaneGeometry(W + 60, H + 60); g.rotateX(-PI / 2); g.translate(L.W / 2, 0, L.H / 2); api.dispose(g);
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.name = 'col-zemin'; m.position.y = -0.002;
    api.add(m);
    if (api.floor) api.floor.visible = false;
    return m;
  }

  // ════════ Yerleşim yardımcıları (06z_buzdolabi ODAB'dan) ════════
  function edge(api, rm, dx, dz, max = 20) {
    const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    let d = 0; while (d < max && api.isFloor(rm.x + dx * d, rm.z + dz * d)) d += 0.25;
    return { x: rm.x + dx * d, z: rm.z + dz * d, d, dx, dz };
  }
  function pathD(L, x, z) {
    let d = 1e9; const p = L.path || [];
    for (let s = 1; s < p.length; s++) {
      const ax = p[s - 1].x, az = p[s - 1].z, vx = p[s].x - ax, vz = p[s].z - az, l2 = vx * vx + vz * vz || 1;
      const t = clamp(((x - ax) * vx + (z - az) * vz) / l2, 0, 1); d = Math.min(d, hyp(x - ax - vx * t, z - az - vz * t));
    }
    return d;
  }
  function clearOf(L, x, z, r) {
    const near = (p, rr) => p && hyp(p.x - x, p.z - z) < rr + r;
    if (near(L.start, 2.5) || near(L.exit, 3) || near(L.boss, 3) || near(L.crystalSpot, 3)) return false;
    for (const c of L.checkpoints || []) if (near(c, 1.8)) return false;
    for (const c of L.chests || []) if (near(c, 1.5)) return false;
    for (const a of L.areas || []) if (a.gate && near(a.gate, 3)) return false;
    return true;
  }
  function roomSpot(L, api, rm, o = {}) {
    const r = o.r || 1.2, rr = (rm.r || 6) * (o.k || 0.75), taken = o.taken || [];
    for (let t = 0; t < (o.tries || 160); t++) {
      const a = api.rnd() * TAU, d = Math.sqrt(api.rnd()) * rr, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
      if (!api.isFloor(x, z) || !api.circleFree(x, z, r) || !clearOf(L, x, z, r)) continue;
      const pd = pathD(L, x, z);
      if (pd < (o.pmin ?? 0) || pd > (o.pmax ?? 99)) continue;
      if (taken.some(q => hyp(q.x - x, q.z - z) < q.r + r)) continue;
      let ok = true;
      for (let k = 0; k < 8 && ok; k++) { const b = k * PI / 4; if (!api.isFloor(x + Math.sin(b) * (r + 0.4), z + Math.cos(b) * (r + 0.4))) ok = false; }
      if (ok) return { x, z };
    }
    return null;
  }
  function edgeSpots(L, api, o = {}) {   // yürünür alanın kıyısı: {x, z, nx, nz (zemine doğru), side 'south'|'north'|'side', room}
    const W = L.W, H = L.H, g = L.grid, fl = (i, j) => i >= 0 && j >= 0 && i < W && j < H && g[j * W + i] === 1;
    const cand = [], dmin = o.dmin ?? 1.3, dmax = o.dmax ?? 2.7, avoid = o.avoid || [];
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      if (fl(i, j)) continue;
      let best = 99, bx = 0, bz = 0;
      for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) if (fl(i + a, j + b)) { const d = hyp(a, b); if (d < best) { best = d; bx = a; bz = b; } }
      if (best < dmin || best > dmax) continue;
      const x = i + 0.5 + (api.rnd() - 0.5) * 0.6, z = j + 0.5 + (api.rnd() - 0.5) * 0.6;
      if (avoid.some(q => hyp(q.x - x, q.z - z) < q.r)) continue;
      cand.push({ x, z, nx: bx / best, nz: bz / best, d: best, k: api.rnd() });
    }
    cand.sort((a, b) => a.k - b.k);
    const cs = o.space || 2.8, cell = new Map(), out = [];
    for (const c of cand) {
      const ci = Math.floor(c.x / cs), cj = Math.floor(c.z / cs);
      let ok = true;
      for (let b = -1; b <= 1 && ok; b++) for (let a = -1; a <= 1 && ok; a++) { const q = cell.get((ci + a) + ',' + (cj + b)); if (q && q.some(p => hyp(p.x - c.x, p.z - c.z) < cs)) ok = false; }
      if (!ok) continue;
      const k = ci + ',' + cj; (cell.get(k) || cell.set(k, []).get(k)).push(c);
      c.side = c.nz < -0.55 ? 'south' : c.nz > 0.45 ? 'north' : 'side';
      let br = 0, bd = 1e9; L.rooms.forEach((rm, ri) => { const d = hyp(rm.x - c.x, rm.z - c.z) - (rm.r || 6); if (d < bd) { bd = d; br = ri; } });
      c.room = br; out.push(c);
    }
    return out;
  }
  function floorSpots(L, api, n, o = {}) {
    const out = [], avoid = o.avoid || [];
    for (let t = 0; t < n * 8 && out.length < n; t++) {
      const x = 1 + api.rnd() * (L.W - 2), z = 1 + api.rnd() * (L.H - 2);
      if (!api.isFloor(x, z) || !api.circleFree(x, z, 0.5) || pathD(L, x, z) < (o.pmin ?? 1.6)) continue;
      if (!clearOf(L, x, z, 0.8) || avoid.some(q => hyp(q.x - x, q.z - z) < q.r)) continue;
      out.push({ x, z });
    }
    return out;
  }
  function clearSpawns(L, api, spots) {
    for (const s of L.spawns || []) {
      if (!spots.find(q => hyp(q.x - s.x, q.z - s.z) < q.r)) continue;
      for (let t = 0; t < 20; t++) {
        const p = api.randomFloorNear(s.x, s.z, 2, 7);
        if (p && !spots.some(q => hyp(q.x - p.x, q.z - p.z) < q.r) && api.circleFree(p.x, p.z, 0.6)) { s.x = p.x; s.z = p.z; break; }
      }
    }
  }
  function gentlePacks(L, max = 5) {   // bir grupta en çok `max` huysuz (5 yaş)
    const by = {};
    for (const s of L.spawns || []) { const k = s.pack ?? s.room; (by[k] || (by[k] = [])).push(s); }
    const drop = new Set();
    for (const k in by) { const g = by[k]; if (g.length <= max) continue; g.slice().sort((a, b) => (a.elite ? 1 : 0) - (b.elite ? 1 : 0)).slice(0, g.length - max).forEach(s => drop.add(s)); }
    if (drop.size) L.spawns = L.spawns.filter(s => !drop.has(s));
  }

  // ════════ Yerleşim (saf veri) → L.colD ════════
  function yerlesim(L, api) {
    const R = L.rooms, A = L.areas || [];
    const mainOf = a => (a ? a.rooms.filter(i => R[i] && R[i].kind !== 'side') : []);
    const a1 = mainOf(A[0]), a2 = mainOf(A[1]), a3 = mainOf(A[2]), a4 = mainOf(A[3]);
    const arenaA = A.find(a => a.boss), arena = arenaA ? R[arenaA.rooms[0]] : R[R.length - 1];
    const D = L.colD = { strips: [], castles: [], pond: null, glass: null, kilims: [], gold: [], taken: [], arena: arena ? { x: arena.x, z: arena.z, r: arena.r } : null, zones: [] };
    const taken = D.taken;
    // 1) Kum şeritleri: Gülen Kum Tepeleri odalarında yol boyunca (Feza'yı yolun ilerisine taşır)
    const P = L.path || [];
    for (const ri of a1.concat(a3)) {   // (Akan Kum Vadisi: akan kum şeritleri de)
      const rm = R[ri]; if (!rm) continue;
      let best = null, bd = 1e9;
      for (let s = 1; s < P.length; s++) { const mx = (P[s - 1].x + P[s].x) / 2, mz = (P[s - 1].z + P[s].z) / 2, d = hyp(mx - rm.x, mz - rm.z); if (d < bd) { bd = d; best = s; } }
      if (best === null || bd > rm.r) continue;
      const a = P[best - 1], b = P[best], dx = b.x - a.x, dz = b.z - a.z, l = hyp(dx, dz) || 1, ux = dx / l, uz = dz / l;
      const len = Math.min(7.5, Math.max(4, l * 0.8)), cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2;
      let ok = true;
      for (let q = -0.5; q <= 0.5 && ok; q += 0.125) for (const w of [-0.8, 0, 0.8]) if (!api.isFloor(cx + ux * len * q - uz * w, cz + uz * len * q + ux * w)) { ok = false; break; }
      if (!ok || !clearOf(L, cx, cz, 1.5)) continue;
      D.strips.push({ x: cx, z: cz, ux, uz, len, w: 2.0 });
      taken.push({ x: cx, z: cz, r: len / 2 + 0.5 });
    }
    // 2) Kum kaleleri: kum tepeleri + vaha odalarında (birinde altın şeker)
    for (const ri of a1.concat(a2)) {
      const rm = R[ri]; if (!rm) continue;
      const p = roomSpot(L, api, rm, { r: 0.9, pmin: 2.2, pmax: 7, k: 0.8, taken });
      if (!p) continue;
      D.castles.push({ x: p.x, z: p.z, gold: false, s: 0.9 + api.rnd() * 0.25 });
      p.solid = api.solid(p.x, p.z, 0.7, 'kale'); D.castles[D.castles.length - 1].solid = p.solid;
      taken.push({ x: p.x, z: p.z, r: 2 });
    }
    if (D.castles.length) D.castles[Math.min(D.castles.length - 1, 2)].gold = true;
    // 3) Vaha gölcüğü: vahanın ilk odasında, yoldan biraz uzakta
    {
      const rm = R[a2[0] ?? a2[1]];
      if (rm) for (const rr of [2.4, 2.0, 1.7]) {
        const p = roomSpot(L, api, rm, { r: rr + 0.5, pmin: rr + 1.6, pmax: 9, k: 0.85, taken });
        if (p) { D.pond = { x: p.x, z: p.z, r: rr, room: a2[0] }; api.solid(p.x, p.z, rr + 0.1, 'gol'); taken.push({ x: p.x, z: p.z, r: rr + 2.6 }); break; }
      }
    }
    // 4) Dev kum saati: Kum Saati Vadisi'nin ilk odasında
    {
      const rm = R[a3[0] ?? a3[1]];
      if (rm) {
        const p = roomSpot(L, api, rm, { r: 1.6, pmin: 2.4, pmax: 5, k: 0.6, taken }) || roomSpot(L, api, rm, { r: 1.6, pmin: 2.4, pmax: 8, k: 0.8, taken });
        if (p) { D.glass = { x: p.x, z: p.z, room: a3[0] }; api.solid(p.x, p.z, 1.15, 'kumsaati'); taken.push({ x: p.x, z: p.z, r: 3 }); }
      }
    }
    // 5) Kilimler: Renkli Çadırlar odasında yere serili (ve arenadan önce son odada)
    for (const ri of a4.length ? a4 : a3.slice(-1)) {
      const rm = R[ri]; if (!rm) continue;
      for (let k = 0; k < 3; k++) {
        const p = roomSpot(L, api, rm, { r: 1.3, pmin: 0, pmax: 6, k: 0.75, taken });
        if (!p) continue;
        D.kilims.push({ x: p.x, z: p.z, yaw: api.rnd() * PI, i: k, w: 2.0, d: 3.2 });
        taken.push({ x: p.x, z: p.z, r: 1.8 });
      }
    }
    // 5b) Akan Kum Vadisi'nin "vay" anları: kum kaplumbağası (selam verir), gömülü sandık (kumdan çıkar), açan kaktüs çiçekleri
    {
      const rooms3 = a3.map(i => R[i]).filter(Boolean);
      const rT = rooms3[1] || rooms3[0], rC = rooms3[0] || rooms3[1];
      if (rT) { const p = roomSpot(L, api, rT, { r: 0.9, pmin: 2.2, pmax: 5.5, k: 0.75, taken }); if (p) { D.turtle = p; api.solid(p.x, p.z, 0.6, 'kaplumbaga'); taken.push({ x: p.x, z: p.z, r: 2.2 }); } }
      if (rC) { const p = roomSpot(L, api, rC, { r: 0.9, pmin: 2.0, pmax: 6, k: 0.8, taken }); if (p) { D.chest = p; taken.push({ x: p.x, z: p.z, r: 2.2 }); } }
      D.buds = [];
      for (const rm of rooms3.concat(a2.map(i => R[i]).filter(Boolean))) {
        if (D.buds.length >= 3) break;
        const p = roomSpot(L, api, rm, { r: 0.7, pmin: 1.8, pmax: 4, k: 0.85, taken });
        if (p && p.z < rm.z + 1 && !(D.glass && hyp(p.x - D.glass.x, p.z - D.glass.z) < 9)) { D.buds.push(p); api.solid(p.x, p.z, 0.45, 'cicek'); taken.push({ x: p.x, z: p.z, r: 1.8 }); }   // (odanın kuzey yarısı: kameranın önünde değil)
      }
      // uzakta yavaşça yürüyen deve kervanı: vadinin kuzeyinde ya da yanında, yürünür alanın dışında (önce kuzey, olmazsa yan)
      const free = (x0, z0, x1, z1) => { const n = Math.ceil(hyp(x1 - x0, z1 - z0)); for (let k = 0; k <= n; k++) { const x = lerp(x0, x1, k / n), z = lerp(z0, z1, k / n); for (const w of [-1.5, 0, 1.5]) if (api.isFloor(x + w, z) || api.isFloor(x, z + w)) return false; } return true; };
      for (const rm of rooms3) {
        if (D.caravan) break;
        for (let dz = 5; dz < 13 && !D.caravan; dz += 1.5) { const z = rm.z - rm.r - dz; for (const half of [12, 8]) if (!D.caravan && free(rm.x - half, z, rm.x + half, z)) D.caravan = { x0: rm.x - half, z0: z, x1: rm.x + half, z1: z }; }
        for (let dx = 4; dx < 20 && !D.caravan; dx += 1.5) for (const sd of [-1, 1]) { const x = rm.x + sd * (rm.r + dx); if (!D.caravan && free(x, rm.z - 10, x, rm.z + 1)) D.caravan = { x0: x, z0: rm.z + 1, x1: x, z1: rm.z - 10 }; }
      }
    }
    // 6) Gizli sürprizler: yan odalarda kilim üstünde altın şeker
    for (const rm of R.filter(r => r.kind === 'side')) {
      const p = roomSpot(L, api, rm, { r: 0.8, pmin: 0, pmax: 99, k: 0.5, taken }) || { x: rm.x, z: rm.z };
      D.gold.push({ x: p.x, z: p.z, sticker: 'gizli_col_kose', kilim: true });
      taken.push({ x: p.x, z: p.z, r: 1.8 });
    }
    // 7) Alan bölgeleri (cümleler)
    const zoneAt = (rooms, key) => { const rm = R[rooms[0]]; if (rm) D.zones.push({ x: rm.x, z: rm.z, r: rm.r + 1, key }); };
    // (bölüm girişi, 3. alan "orta" ve arena cümlelerini STORY söyler; burada yalnız bölüme özel anlar)
    zoneAt(a1.slice(1), 'pr_col_tepeler'); zoneAt(a2, 'pr_col_vaha'); zoneAt(a4, 'pr_col_pazar');
    // 8) Mini oyun köşesi (kayıtlı mini oyunlardan çöle uyan)
    try {
      if (typeof MINIGAME !== 'undefined' && MINIGAME && MINIGAME.list) {
        const ids = MINIGAME.list(), rm = R[a2[1] ?? a2[0]] || R[0];
        const id = ids.find(i => /kum|col|cöl|çöl|saat/i.test(i)) || ids[0];
        const p = id && rm && roomSpot(L, api, rm, { r: 1.0, pmin: 2.4, pmax: 7, k: 0.8, taken });
        if (p) { const st = { id: 'mini_' + id, kind: 'mini', mini: id, x: p.x, z: p.z, r: 1.0 }; (L.stations || (L.stations = [])).push(st); D.mini = st; taken.push({ x: p.x, z: p.z, r: 2 }); }
      }
    } catch (e) { /* mini oyun yok */ }
    clearSpawns(L, api, taken.map(q => ({ x: q.x, z: q.z, r: q.r + 1.2 })));
    gentlePacks(L, 5);
  }

  // ════════ Görsel kurulum ════════
  // SADE (ebeveyn kuralı, okunurluk): ışık havuzları ×0,55, nokta ışıklar ×0,7, titreme ×0,3 (06z_mantar ile aynı)
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
    if (typeof ODAKIT !== 'undefined' && ODAKIT && ODAKIT.lowShadow) ODAKIT.lowShadow(api, 99);   // süsler gölge düşürmez (PIRIL.md §13)
    const D = L.colD || { strips: [], castles: [], kilims: [], gold: [], taken: [], zones: [] };
    const rnd = api.rnd, put = api.put, G = api.G;
    DK = {}; DKapi = api;
    const sph = G.sphere(12, 8), sphL = G.sphere(6, 4), sphB = G.sphere(18, 10), cyl = G.cyl(1, 1, 10), cone = G.cone(10), box = G.box();   // (az üçgen: süsler çok)
    const areaOf = i => (L.areas || []).findIndex(a => a.rooms.includes(i));
    // ── zemin (dokular ayrı karelerde üretilir: oda geçişinde takılma olmasın) ──
    sandTex(); yield; pathTex(); yield; stoneTex(); yield;
    // kumtaşı döşeme yalnız küçük yerlerde: çadır avlusu (Renkli Çadırlar'ın ortası) ve vaha gölcüğünün kıyısı; her yer yumuşak kum
    const a4Rooms = new Set(((L.areas || [])[3] || { rooms: [] }).rooms);
    floor(L, api, (x, z) => {
      const pd = pathD(L, x, z), path = sm((1.4 - pd) / 0.45);   // yol: belirgin sıcak terrakota taş döşeme (≈2,6 m geniş)
      let st = 0;
      for (const ri of a4Rooms) { const rm = L.rooms[ri]; if (rm && rm.kind !== 'side') st = Math.max(st, sm((3.4 - hyp(rm.x - x, rm.z - z)) / 1.2)); }
      if (D.pond) st = Math.max(st, 0.9 * sm((D.pond.r + 1.6 - hyp(D.pond.x - x, D.pond.z - z)) / 0.8));
      const inAr = D.arena ? sm((D.arena.r + 0.5 - hyp(D.arena.x - x, D.arena.z - z)) / 1.5) : 0;   // (arena kum kalsın: bukalemun kuma karışır)
      return [0, Math.max(st, path * (1 - inAr))];   // (yol da kumtaşı döşeme kanalında: kumdan net ayrılır)
    });
    yield;
    // ── kenar süsleri: kıyıda (ekranda görünür): kumtaşları, kum tümsekleri, çöl çiçekleri, küçük yumuşak kaktüsler, testiler ──
    const avoid = (D.taken || []).map(q => ({ x: q.x, z: q.z, r: q.r * 0.5 })).concat((L.areas || []).filter(a => a.gate).map(a => ({ x: a.gate.x, z: a.gate.z, r: 6.5 })));
    if (L.exit) avoid.push({ x: L.exit.x, z: L.exit.z, r: 5 });
    const edges = edgeSpots(L, api, { avoid, space: 2.4 });
    for (const c of edges) {
      const ar = areaOf(c.room), rmk = L.rooms[c.room], boss = rmk && rmk.kind === 'boss';
      if (boss && c.z > rmk.z - 2) continue;   // arenanın güney (kamera) yarısında süs yok
      const low = c.side === 'south' || c.nz < -0.1 || !tallOk(api, c.x, c.z), x = c.x, z = c.z, r = rnd();   // (kameranın önündeki kıyı: yalnız alçak süs)
      if (low) { if (r < 0.45) duneLump(put, sph, x, z, 0.8 + rnd() * 0.5, rnd); else if (r < 0.75) flowers(put, sphL, cyl, x, z, rnd); else rock(put, sph, x, z, 0.45, rnd); continue; }
      if (boss) { if (r < 0.5) tent(put, cyl, cone, box, sph, x - c.nx * 1.2, z - c.nz * 1.2, 1.2, rnd); else pot(put, sph, cyl, x, z, 1.1, rnd); continue; }
      if (ar <= 0 && r > 0.88) { miniCastle(put, cyl, cone, x - c.nx * 0.3, z - c.nz * 0.3, 0.7 + rnd() * 0.3, rnd); continue; }
      if (ar <= 0) { if (r < 0.4) duneLump(put, sph, x, z, 1.2 + rnd() * 0.8, rnd); else if (r < 0.65) rock(put, sph, x, z, 0.9 + rnd() * 0.5, rnd); else if (r < 0.85) softCactus(put, sph, cyl, x, z, 0.8 + rnd() * 0.4, rnd); else flowers(put, sphL, cyl, x, z, rnd); }
      else if (ar === 1) { if (r < 0.33) palm(put, cyl, sph, sphL, x - c.nx * 0.8, z - c.nz * 0.8, 0.8 + rnd() * 0.3, rnd); else if (r < 0.66) bush(put, sph, sphL, x, z, 0.9 + rnd() * 0.4, rnd); else if (r < 0.85) flowers(put, sphL, cyl, x, z, rnd); else softCactus(put, sph, cyl, x, z, 0.9, rnd); }
      else if (ar === 2) { if (r < 0.3) miniGlass(put, cyl, sph, cone, x, z, 0.9 + rnd() * 0.4, rnd); else if (r < 0.55) rock(put, sph, x, z, 1.0, rnd); else if (r < 0.8) pot(put, sph, cyl, x, z, 1.0, rnd); else duneLump(put, sph, x, z, 1.2, rnd); }
      else { if (r < 0.45) tent(put, cyl, cone, box, sph, x - c.nx * 1.3, z - c.nz * 1.3, 1.0 + rnd() * 0.3, rnd); else if (r < 0.7) pot(put, sph, cyl, x, z, 1.0, rnd); else if (r < 0.85) lantern(put, cyl, sph, x, z); else flowers(put, sphL, cyl, x, z, rnd); }
    }
    // ikinci sıra (kıyının biraz gerisi): daha büyük süsler, boş kum kalmasın
    for (const c of edgeSpots(L, api, { avoid, space: 4.2, dmin: 3.4, dmax: 6.5 })) {
      const ar = areaOf(c.room), rmk = L.rooms[c.room], x = c.x, z = c.z, r = rnd();
      if (rmk && rmk.kind === 'boss') continue;
      if (c.side === 'south' || c.nz < -0.1 || !tallOk(api, x, z)) { if (r < 0.6) duneLump(put, sph, x, z, 0.9 + rnd() * 0.4, rnd); else rock(put, sph, x, z, 0.4, rnd); continue; }
      if (ar === 1 && r < 0.4) palm(put, cyl, sph, sphL, x, z, 0.9 + rnd() * 0.3, rnd);
      else if (ar === 1 && r < 0.75) bush(put, sph, sphL, x, z, 1.2 + rnd() * 0.4, rnd);
      else if (ar === 3 && r < 0.55) tent(put, cyl, cone, box, sph, x, z, 1.2 + rnd() * 0.3, rnd);
      else if (ar === 2 && r < 0.4) miniGlass(put, cyl, sph, cone, x, z, 1.3 + rnd() * 0.4, rnd);
      else if (r < 0.5) duneLump(put, sph, x, z, 1.4 + rnd() * 0.5, rnd);
      else if (r < 0.8) rock(put, sph, x, z, 0.6 + rnd() * 0.3, rnd);
      else softCactus(put, sph, cyl, x, z, 1.2 + rnd() * 0.4, rnd);
    }
    yield;
    // ── uzakta gülümseyen tombul kum tepeleri (yürünür alanın dışında; kuzeydekiler büyük, güneydekiler alçak) ──
    distantDunes(L, api, put, sphB, sphL, rnd);
    // zemine serpiştirilmiş minik çiçekler ve çakıllar (yoldan uzak)
    const perRoom = new Map();
    for (const f of floorSpots(L, api, 60, { avoid: D.taken, pmin: 3.0 })) {   // (yürünür alan sade: oda başına en çok 2, odanın güney yarısında hiç)
      let ri = 0, bd = 1e9; L.rooms.forEach((rm, i) => { const d = hyp(rm.x - f.x, rm.z - f.z); if (d < bd) { bd = d; ri = i; } });
      if (f.z > L.rooms[ri].z || (perRoom.get(ri) || 0) >= 2) continue; perRoom.set(ri, (perRoom.get(ri) || 0) + 1);
      const q = rnd(); if (q < 0.45) sprig(put, cone, f.x, f.z, rnd); else if (q < 0.55) shell(put, sphL, cone, f.x, f.z, rnd); else if (rnd() < 0.55) flowers(put, sphL, cyl, f.x, f.z, rnd, 0.5); else rock(put, sph, f.x, f.z, 0.18 + rnd() * 0.12, rnd); }
    yield;
    // (kum tepeleri / kayalar: dunesDone aşağıda)
    // ── alan geçitleri: kumtaşı kemerler (fenerli) ──
    // (alan geçidini motorun şeker çiti gösterir; ek kemer koymuyoruz: okunurluk)
    // ── odaların zemin ışığı ──
    L.rooms.forEach((rm, i) => { const ar = areaOf(i); api.glow(rm.x, rm.z, rm.r * 0.95, [0xfff0d8, 0xe8fff0, 0xfff0e0, 0xffe8f0][Math.max(0, ar) % 4] || 0xfff0d8, 0.09); });
    const R = rig(api, L);
    // ── kum şeritleri ──
    for (const s of D.strips) windStrip(api, R, s);
    if (D.strips.length) R.zones.push({ x: D.strips[0].x, z: D.strips[0].z, r: 6, enter: () => say('pr_col_serit') });
    // ── kum kaleleri ──
    for (const c of D.castles) castle(api, R, c);
    if (D.castles.length) R.zones.push({ x: D.castles[0].x, z: D.castles[0].z, r: 5, enter: () => say('pr_col_kale') });
    yield;
    // ── vaha gölcüğü ──
    if (D.pond) pond(api, R, put, cyl, sph, sphL, D.pond, rnd);
    // ── dev kum saati (Kum Saati Vadisi) ──
    if (D.glass) hourglass(api, R, D.glass.x, D.glass.z, 1.0, { flip: true });
    if (D.turtle) sandTurtle(api, R, D.turtle);
    if (D.chest) buriedChest(api, R, D.chest);
    for (const b of D.buds || []) budCactus(api, R, b);
    // (deve kervanı kaldırıldı: kamera açısından görünmüyordu)
    // ── kilimler + gizli altın şekerler ──
    for (const k of D.kilims) kilim(api, k.x, k.z, k.yaw, k.i, k.w, k.d);
    for (const g of D.gold) { if (g.kilim) kilim(api, g.x, g.z, rnd() * PI, 1, 1.8, 2.6); goldSugar(api, R, g.x, 0.9, g.z, { sticker: g.sticker, line: 'pr_col_kalp_hazine' }); }
    // ── mini oyun köşesi: renkli şemsiyeli kilim ──
    if (D.mini) { kilim(api, D.mini.x, D.mini.z, 0.3, 2, 2.2, 2.2); api.glow(D.mini.x, D.mini.z, 1.8, 0xffd0e8, 0.25); }
    // ── arena: arkada dev kum saati, çevrede flamalar ──
    if (D.arena) arenaDecor(L, api, R, put, cyl, cone, box, sph, D.arena, rnd);
    yield;
    // ── dışarıda, kumların üstünden akan süs rüzgâr şeritleri (yürünmez; yalnız görüntü) ──
    {
      let n = 0;
      for (const c of edgeSpots(L, api, { space: 9, dmin: 3, dmax: 8 })) {
        if (n >= 0 || c.side === 'south' || c.nz < -0.1) continue;
        const a = 0.5 + rnd() * 0.6;
        windStrip(api, R, { x: c.x, z: c.z, ux: Math.cos(a), uz: -Math.sin(a) * 0.4, len: 5 + rnd() * 3, w: 1.4, decor: true }); n++;
      }
    }
    // ── Renkli Çadırlar: fenerler arasında rengârenk kilim flamaları ──
    for (const ri of a4Rooms) {
      const rm = L.rooms[ri]; if (!rm || rm.kind === 'side') continue;
      const posts = edgeSpots(L, api, { space: 4.5, dmin: 1.2, dmax: 2.2 }).filter(c => c.room === ri && c.side !== 'south' && c.nz > -0.1).slice(0, 6);
      posts.sort((p, q) => Math.atan2(p.x - rm.x, p.z - rm.z) - Math.atan2(q.x - rm.x, q.z - rm.z));
      posts.forEach(p => lantern(put, cyl, sph, p.x, p.z));
      for (let i = 1; i < posts.length; i++) {
        const a = posts[i - 1], b2 = posts[i], d = hyp(a.x - b2.x, a.z - b2.z); if (d > 8) continue;
        const N = Math.max(5, Math.round(d * 1.6));
        for (let k = 1; k < N; k++) { const u = k / N, x = lerp(a.x, b2.x, u), z = lerp(a.z, b2.z, u), y = 2.35 - Math.sin(u * PI) * 0.45; put(G.cone(4), x, y, z, 0.16, 0.3, 0.04, [PAL.rose, PAL.teal, PAL.saffron, PAL.lilac, PAL.coral][k % 5], Math.atan2(b2.x - a.x, b2.z - a.z) + PI / 2, PI); }
      }
    }
    dunesDone(api);
    // ── atmosfer: rüzgârla süzülen kum parıltıları + kıyıda kum pusu ──
    motes(api);
    // (kıyı kum pusu kaldırıldı: kameraya yakın bulanık leke gibi duruyordu — okunurluk)
    // (yol kenarındaki küçük renkli çiniler kaldırıldı: kumda saçılmış konfeti gibi okunuyordu; terrakota yol tek başına net)
    // ── alan cümleleri ──
    for (const z of D.zones || []) R.zones.push({ x: z.x, z: z.z, r: z.r, enter: () => say(z.key) });
  }

  // ════════ Hareket / etkileşim düzeni (bölüm başına bir tane) ════════
  function rig(api, L) {
    const R = { zones: [], picks: [], touch: [], strips: [], t: 0 };
    api.anim((dt, hx, hz) => {
      R.t += dt;
      for (const q of R.picks) if (q.obj && !q.got) { q.obj.position.y = q.y + Math.sin(R.t * 2.2 + q.ph) * 0.12; q.spin.rotation.y += dt * 2.4; }
      for (const t of R.touch) if (t.tick) t.tick(dt);
      if (!live()) return;
      const P = GAME.P, px = P.pos.x, pz = P.pos.z;
      if ((R.ambT = (R.ambT ?? 6) - dt) <= 0) { R.ambT = 11 + Math.random() * 8; sfx('kumFisilti', { x: px + 6, z: pz - 4, vol: 0.25 }); }
      for (const q of R.picks) if (!q.got && hyp(q.x - px, q.z - pz) < 1.2) { q.got = true; q.obj.visible = false; q.onGet(); }
      for (const t of R.touch) if (!t.done && hyp(t.x - px, t.z - pz) < t.r) t.fire();
      for (const z of R.zones) {
        const inside = hyp(z.x - px, z.z - pz) < z.r;
        if (inside && !z.in) { z.in = true; z.enter(z); } else if (!inside && z.in) z.in = false;
      }
      // kum şeridi: Feza'yı şeridin yönünde nazikçe taşır (duvar / engel varsa durur)
      const A = HA();
      for (const s of R.strips) {
        const dx = px - s.x, dz = pz - s.z, al = dx * s.ux + dz * s.uz, sd = dx * -s.uz + dz * s.ux;
        if (Math.abs(al) < s.len / 2 && Math.abs(sd) < s.w / 2) {
          const v = 2.4 * Math.min(1, (s.len / 2 - al) / 1.2 + 0.2);
          if (A && A.moveXZ) A.moveXZ(P.pos, s.ux * v * dt, s.uz * v * dt, 0.35);
          if ((s.pT = (s.pT || 0) - dt) <= 0) { s.pT = 0.12; burst('dust', px, 0.2, pz, { count: 2, color: '#fbe6c6' }); }
          if ((s.sT = (s.sT || 0) - dt) <= 0) { s.sT = 1.6; sfx('kumFisilti', { x: px, z: pz, vol: 0.4 }); }
        }
      }
    });
    return R;
  }
  // ── altın şeker (paylaşılan geometri) ──
  function goldSugar(api, R, x, y, z, o = {}) {
    const gg = geo('gold', () => {
      const k = new Kit(), g = C(0xffc93a), g2 = C(0xffe58a);
      k.add(G.sphere(14, 10), g, [0, 0, 0], null, [0.3, 0.24, 0.24]);
      for (const sd of [-1, 1]) { k.add(G.cone(10), g2, [sd * 0.38, 0, 0], [0, 0, sd * PI / 2], [0.17, 0.22, 0.17]); k.add(G.sphere(7, 5), g2, [sd * 0.5, 0, 0], null, [0.05, 0.16, 0.16]); }
      for (let i = 0; i < 3; i++) k.add(G.torus(TAU, 0.18, 14), C(0xfff2c0), [(-1 + i) * 0.12, 0, 0], [0, PI / 2, 0], [0.235, 0.235, 0.235]);
      return k.build();
    });
    const hg = geo('goldHalo', () => { const h = new Kit(); h.add(G.sphere(10, 7), C(0xffd66a).multiplyScalar(0.55), [0, 0, 0], null, [0.62, 0.62, 0.62]); return h.build(); });
    const mg = MAT.gold || (MAT.gold = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.65, emissive: new THREE.Color(0x553300), emissiveIntensity: 0.4 })));
    const mh = MAT.halo || (MAT.halo = keepM(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })));
    const g = new THREE.Group(), m = new THREE.Mesh(gg, mg), h = new THREE.Mesh(hg, mh); h.renderOrder = 3; g.add(m, h); g.position.set(x, y, z); api.add(g);
    api.glow(x, z, 1.3, 0xffd36a, 0.3);
    R.picks.push({ x, y, z, obj: g, spin: m, ph: Math.random() * 6, onGet() {
      if (GAME.addGoldSugar) GAME.addGoldSugar(1);
      burst('star', x, y, z, { count: 7 }); burst('confetti', x, y, z, {}); sfx('star', { vol: 0.9 }); sfx('coin', { pitch: 1.5 });
      if (o.sticker && GAME.giveSticker) GAME.giveSticker(o.sticker, 'gizli');
      if (o.line) say(o.line, { once: false, gap: 4 });
    } });
  }

  // ════════ Kum tepeleri ve kayalar: kendi birleştirilmiş örgümüz (köşe renkli: altta sıcak gölge, üstte ışık, dalga çizgileri) ════════
  let DK = null, DKapi = null;   // 24 m'lik parça başına bir Kit (kur sırasında dolar, sonunda tek malzemeyle çizilir)
  const dk = (x, z) => { const k = Math.floor(x / 24) + ',' + Math.floor(z / 24); return DK[k] || (DK[k] = new Kit()); };
  function duneColor(base, h, k = 1) {   // y = dünya yüksekliği (zemin 0)
    const b = C(base).multiplyScalar(0.9), sh = C(base).lerp(C(0xc8784e), 0.5), top = C(base).lerp(C(0xfbe2bc), 0.2), line = C(base).lerp(C(0xb87048), 0.55);
    return (x, y, z) => {
      const t = clamp(y / Math.max(0.05, h), 0, 1), c = sh.clone().lerp(b, sm(t * 2.2)).lerp(top, sm((t - 0.7) / 0.3) * 0.6);
      const w = Math.sin(y / Math.max(0.05, h) * 3 * PI * 2 + Math.sin(x * 0.9 + z * 0.6) * 0.8);   // 2-3 ince, koyu dalga çizgisi (yükseltiyi okutur)
      if (w > 0.93 && t > 0.15 && t < 0.85) c.lerp(line, 0.7);
      return c;
    };
  }
  function rockColor(h) {
    const bands = [C(0xf0b896), C(0xf8d2b4), C(0xe8a890), C(0xfadcc4)];
    return (x, y, z) => { const t = clamp(y / Math.max(0.05, h), 0, 0.999), i = Math.floor(t * 4 + Math.sin(x * 2 + z) * 0.25); return bands[(i + 4) % 4].clone().multiplyScalar(0.86 + 0.18 * t); };
  }
  function dunesDone(api) {
    const mat = MAT.dune || (MAT.dune = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 })));
    for (const k in DK) { const kit = DK[k]; if (!kit.parts.length) continue; const g = kit.build(); api.dispose(g); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.name = 'col-tepe'; api.add(m); }
    DK = null;
  }

  // ════════ Süs modelleri (api.put: birleştirilmiş statik çizim) ════════
  // Uzun süs (palmiye, çadır, kaktüs…) yalnız arkasında (kuzeyinde, kamera onun üstünden bakar) yürünür zemin yoksa: Feza'yı örtmesin
  function tallOk(api, x, z) { for (const d of [1.5, 3, 4.5, 6, 7.5, 9]) for (const dx of [-2, 0, 2]) if (api.isFloor(x + dx, z - d)) return false; return true; }
  function duneLump(put, sph, x, z, s, rnd) {   // alçak, yumuşak kum tümseği (dalga çizgili, altı sıcak gölgeli)
    if (DKapi) {   // yürünür alana taşmasın: ayak izi zemine değiyorsa küçült
      const hits = k => { for (let q = 0; q < 12; q++) { const b = q * PI / 6; if (DKapi.isFloor(x + Math.sin(b) * 1.45 * k, z + Math.cos(b) * 1.45 * k)) return true; } return false; };
      while (s > 0.45 && hits(s)) s *= 0.85;
      if (hits(s)) return;
    }
    const c = [0xe8b47c, 0xe4a878, 0xeab890][(rnd() * 3) | 0], h = 0.55 * s, yaw = rnd() * PI, hg = G.hemi(16);
    dk(x, z).add(hg, duneColor(c, h), [x, 0, z], [0, yaw, 0], [1.4 * s, h, 1.05 * s]);
  }
  function sprig(put, cone, x, z, rnd) {   // minik çöl otu tutamı (yumuşak, açık yeşil)
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + rnd(), l = 0.25 + rnd() * 0.2; put(cone, x + Math.sin(a) * 0.06, l / 2, z + Math.cos(a) * 0.06, 0.035, l, 0.035, [0xa8d890, 0xc0e0a0, 0x98cc88][i % 3], 0, Math.cos(a) * 0.35, Math.sin(a) * 0.35); }
  }
  function shell(put, sphL, cone, x, z, rnd) {   // renkli çakıl taşı üçlüsü
    for (let i = 0; i < 3; i++) put(sphL, x + (i - 1) * 0.16, 0.04, z + rnd() * 0.12, 0.09, 0.05, 0.07, [0xffd0c0, 0xd8e8f0, 0xe8d8f0, 0xfff0c8][(rnd() * 4) | 0], rnd() * PI);
  }
  function ripple(put, sph, x, z, rnd) {   // zeminde alçak kum dalgacığı (üç ince sırt)
    const yaw = 0.4 + rnd() * 0.4;
    for (let i = -1; i <= 1; i++) put(sph, x + Math.cos(yaw) * i * 0.45, 0, z - Math.sin(yaw) * i * 0.45, 0.14, 0.06, 0.9 - Math.abs(i) * 0.25, PAL.sandL, yaw, 0, 0, 'decor');
  }
  function miniCastle(put, cyl, cone, x, z, s, rnd) {   // kıyıda minik süs kum kalesi (kovalı)
    put(cyl, x, 0.2 * s, z, 0.55 * s, 0.4 * s, 0.55 * s, PAL.sand);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.3, px = x + Math.sin(a) * 0.42 * s, pz = z + Math.cos(a) * 0.42 * s; put(cyl, px, 0.4 * s, pz, 0.16 * s, 0.8 * s, 0.16 * s, PAL.sandL); put(cone, px, 0.92 * s, pz, 0.18 * s, 0.28 * s, 0.18 * s, PAL.sand); }
    put(cyl, x, 1.0 * s, z, 0.012, 0.5 * s, 0.012, 0xffffff); put(G.cone(4), x + 0.08 * s, 1.15 * s, z, 0.06 * s, 0.16 * s, 0.02, FLOWER[(rnd() * 4) | 0], 0, 0, -PI / 2);
    const bx = x + 0.75 * s, bz = z + 0.3 * s, bc = [PAL.teal, PAL.rose, PAL.saffron][(rnd() * 3) | 0];   // devrik kova + kürek
    put(cyl, bx, 0.18 * s, bz, 0.2 * s, 0.36 * s, 0.24 * s, bc, 0, PI / 2 * 0.9);
    put(G.box(), bx - 0.2 * s, 0.05, bz + 0.35 * s, 0.12 * s, 0.03, 0.4 * s, 0xffd27a, 0.6);
  }
  function rock(put, sph, x, z, s, rnd) {   // yuvarlak pastel kumtaşı (katmanlı bantlar)
    const yaw = rnd() * PI, h = 0.85 * s, sg = G.sphere(12, 8);
    dk(x, z).add(sg, rockColor(h), [x, 0.3 * s, z], [0, yaw, 0], [0.9 * s, 0.55 * s, 0.75 * s]);
    dk(x, z).add(sg, rockColor(h), [x + 0.1 * s, 0.68 * s, z], [0, yaw, 0], [0.62 * s, 0.3 * s, 0.52 * s]);
  }
  function flowers(put, sphL, cyl, x, z, rnd, k = 1) {   // çöl çiçeği kümesi
    for (let i = 0; i < 3; i++) {
      const a = rnd() * TAU, d = rnd() * 0.5 * k, fx0 = x + Math.sin(a) * d, fz0 = z + Math.cos(a) * d, h = (0.3 + rnd() * 0.25) * k, c = FLOWER[(rnd() * FLOWER.length) | 0];
      put(cyl, fx0, h / 2, fz0, 0.025 * k, h, 0.025 * k, 0x7cc88a);
      for (let p = 0; p < 5; p++) { const b = p / 5 * TAU; put(sphL, fx0 + Math.sin(b) * 0.08 * k, h, fz0 + Math.cos(b) * 0.08 * k, 0.07 * k, 0.03 * k, 0.07 * k, c); }
      put(sphL, fx0, h + 0.02 * k, fz0, 0.05 * k, 0.04 * k, 0.05 * k, 0xffe680);
      put(sphL, fx0 + 0.08, 0.06 * k, fz0, 0.12 * k, 0.05 * k, 0.08 * k, 0x9be0a0);
    }
  }
  function bush(put, sph, sphL, x, z, s, rnd) {   // vaha çalısı: yuvarlak yeşil-turkuaz yapraklar + pembe çiçekçikler
    const cs = [0x6fcf8a, 0x5cc4a8, 0x86dc8c];
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + rnd(), d = i ? 0.35 * s : 0; put(sph, x + Math.sin(a) * d, 0.35 * s + (i ? 0 : 0.12 * s), z + Math.cos(a) * d, 0.42 * s, 0.38 * s, 0.42 * s, cs[i % 3]); }
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + rnd(); put(sphL, x + Math.sin(a) * 0.42 * s, 0.5 * s + (i % 2) * 0.15 * s, z + Math.cos(a) * 0.42 * s, 0.07 * s, 0.07 * s, 0.07 * s, i % 2 ? 0xff9ec8 : 0xfff2a0); }
  }
  function softCactus(put, sph, cyl, x, z, s, rnd) {   // dikensiz, tombul süs kaktüsü + tepesinde çiçek
    const c = [0x9cebb4, 0x8fe0c0, 0xa8f0a8][(rnd() * 3) | 0];
    put(sph, x, 0.75 * s, z, 0.4 * s, 0.78 * s, 0.4 * s, c);
    for (const sd of [-1, 1]) if (rnd() < 0.75) { put(sph, x + sd * 0.42 * s, 0.85 * s, z, 0.14 * s, 0.14 * s, 0.14 * s, c); put(sph, x + sd * 0.52 * s, 1.08 * s, z, 0.13 * s, 0.28 * s, 0.13 * s, c); }
    for (let i = 0; i < 6; i++) { const a = i * 1.1, yy = (0.4 + (i % 3) * 0.35) * s; put(sph, x + Math.sin(a) * 0.38 * s, yy, z + Math.cos(a) * 0.38 * s, 0.035 * s, 0.035 * s, 0.035 * s, 0xffffff); }
    put(sph, x, 1.55 * s, z, 0.16 * s, 0.08 * s, 0.16 * s, FLOWER[(rnd() * 4) | 0]);
    put(sph, x, 0.1, z, 0.5 * s, 0.14, 0.5 * s, PAL.sandD, 0, 0, 0, 'decor');
  }
  function pot(put, sph, cyl, x, z, s, rnd) {   // boyalı toprak testi (bantlı)
    const c = [PAL.terra, 0xf0a888, 0xe8b090][(rnd() * 3) | 0], band = [PAL.teal, PAL.rose, PAL.saffron, 0xffffff][(rnd() * 4) | 0];
    put(sph, x, 0.5 * s, z, 0.42 * s, 0.5 * s, 0.42 * s, c);
    put(cyl, x, 0.98 * s, z, 0.16 * s, 0.2 * s, 0.16 * s, c);
    put(G.torus(TAU, 0.3, 18), x, 1.08 * s, z, 0.18 * s, 0.18 * s, 0.18 * s, c, 0, PI / 2);
    put(cyl, x, 0.55 * s, z, 0.432 * s, 0.08 * s, 0.432 * s, band);
    put(cyl, x, 0.38 * s, z, 0.405 * s, 0.04 * s, 0.405 * s, 0xfff2e0);
  }
  function lantern(put, cyl, sph, x, z) {   // direkli fener (parlak)
    put(cyl, x, 1.1, z, 0.05, 2.2, 0.05, 0x8a6a5a);
    put(sph, x, 2.25, z, 0.22, 0.3, 0.22, 0xffd27a, 0, 0, 0, 'glow');
    put(G.cone(10), x, 2.62, z, 0.2, 0.18, 0.2, 0xe8607a);
  }
  function tent(put, cyl, cone, box, sph, x, z, s, rnd) {   // çizgili yuvarlak çadır: gövde + çizgiler + koni çatı + flama + kapı
    const [a, b] = TENT[(rnd() * TENT.length) | 0], R0 = 1.25 * s, H0 = 1.5 * s;
    put(cyl, x, H0 / 2, z, R0, H0, R0, b);
    for (let i = 0; i < 10; i++) { const t = i / 10 * TAU; put(box, x + Math.sin(t) * R0 * 1.005, H0 / 2, z + Math.cos(t) * R0 * 1.005, 0.32 * s, H0, 0.04, a, t); }
    put(cone, x, H0 + 0.75 * s, z, R0 * 1.18, 1.5 * s, R0 * 1.18, a);
    for (let i = 0; i < 8; i++) { const t = i / 8 * TAU + 0.2; put(sph, x + Math.sin(t) * R0 * 1.15, H0 + 0.02, z + Math.cos(t) * R0 * 1.15, 0.13 * s, 0.1 * s, 0.13 * s, b); }
    put(cyl, x, H0 + 1.75 * s, z, 0.03, 0.6 * s, 0.03, 0xffffff);
    put(cone, x + 0.17 * s, H0 + 1.92 * s, z, 0.1 * s, 0.32 * s, 0.03, PAL.saffron, 0, 0, -PI / 2);
    put(cone, x, H0 * 0.4, z + R0 * 0.98, 0.45 * s, H0 * 0.8, 0.06, 0x7a4a5a);   // kapı aralığı
  }
  function palm(put, cyl, sph, sphL, x, z, s, rnd) {   // kavisli gövdeli palmiye: halka bantlı gövde, sarkan yapraklar, hindistancevizi
    const lean = (rnd() - 0.5) * 0.6, lz = (rnd() - 0.5) * 0.4, N = 7, Hh = 4.2 * s;
    let px = x, py = 0, pz = z;
    for (let i = 0; i < N; i++) {
      const u = (i + 1) / N, nx = x + Math.sin(u * 1.4) * lean * 1.6 * s, nz = z + Math.sin(u * 1.4) * lz * 1.2 * s, ny = u * Hh, r = (0.2 - 0.07 * u) * s;
      put(cyl, (px + nx) / 2, (py + ny) / 2, (pz + nz) / 2, r, hyp(nx - px, ny - py, nz - pz), r, i % 2 ? 0xd8a070 : 0xe6b488, 0, Math.atan2(nz - pz, ny - py) * 0, -(nx - px) / Math.max(0.01, ny - py) * 0.9);
      put(sphL, nx, ny, nz, r * 1.12, r * 0.45, r * 1.12, 0xc89060);
      px = nx; py = ny; pz = nz;
    }
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + rnd() * 0.3, c = [0x8fd88a, 0x7cc87c, 0xa4e494][i % 3];
      for (let k = 0; k < 3; k++) { const d = (0.45 + k * 0.55) * s, dy = -0.18 * k * k * s; put(sph, px + Math.sin(a) * d, py + 0.1 * s + dy, pz + Math.cos(a) * d, 0.5 * s * (1 - k * 0.18), 0.07 * s, 0.22 * s * (1 - k * 0.2), c, a + PI / 2, 0, 0.25 + k * 0.2); }
    }
    for (let i = 0; i < 3; i++) { const a = i * 2.1; put(sph, px + Math.sin(a) * 0.2 * s, py - 0.18 * s, pz + Math.cos(a) * 0.2 * s, 0.15 * s, 0.15 * s, 0.15 * s, 0x9a6a48); }
  }
  function miniGlass(put, cyl, sph, cone, x, z, s, rnd) {   // küçük süs kum saati (statik)
    const fr = [0xc89a6a, 0xe8a0b0, 0x9ac8d8][(rnd() * 3) | 0];
    put(cyl, x, 0.06 * s, z, 0.45 * s, 0.12 * s, 0.45 * s, fr); put(cyl, x, 1.5 * s, z, 0.45 * s, 0.12 * s, 0.45 * s, fr);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; put(cyl, x + Math.sin(a) * 0.38 * s, 0.78 * s, z + Math.cos(a) * 0.38 * s, 0.04 * s, 1.4 * s, 0.04 * s, fr); }
    put(cone, x, 1.08 * s, z, 0.32 * s, 0.6 * s, 0.32 * s, 0xeef8ff, 0, PI); put(cone, x, 0.48 * s, z, 0.32 * s, 0.6 * s, 0.32 * s, 0xeef8ff);
    put(cone, x, 0.3 * s, z, 0.25 * s, 0.26 * s, 0.25 * s, PAL.saffron);
  }
  function umbrella(put, cyl, cone, sph, x, z) {   // çizgili gölge şemsiyesi
    put(cyl, x, 1.2, z, 0.05, 2.4, 0.05, 0xffffff);
    put(cone, x, 2.46, z, 1.32, 0.56, 1.32, PAL.rose); put(cone, x, 2.48, z, 0.9, 0.38, 0.9, 0xfff2e0); put(cone, x, 2.5, z, 0.5, 0.22, 0.5, PAL.saffron);
    put(sph, x, 2.78, z, 0.08, 0.08, 0.08, 0xffffff);
  }
  function gateArch(L, api, put, cyl, sph, box, k) {   // alan geçidi: iki kumtaşı sütun + yay, tepede fener (koridora dik)
    const a = L.areas[k], prev = L.areas[k - 1];
    const r0 = L.rooms[Math.max(...prev.rooms.filter(i => L.rooms[i].kind !== 'side'))], r1 = L.rooms[a.rooms[0]];
    if (!r0 || !r1) return;
    let dx = r1.x - r0.x, dz = r1.z - r0.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    const px = -dz, pz = dx, x = a.gate.x, z = a.gate.z;
    let A = 0, B = 0; while (A < 7 && api.isFloor(x + px * A, z + pz * A)) A += 0.25; while (B < 7 && api.isFloor(x - px * B, z - pz * B)) B += 0.25;
    const yaw = Math.atan2(px, pz);
    for (const [d, sd] of [[A + 0.6, 1], [B + 0.6, -1]]) {
      const cx = x + px * d * sd, cz = z + pz * d * sd;
      put(cyl, cx, 1.6, cz, 0.42, 3.2, 0.42, 0xf2c8a2, 0, 0, 0, 'stone');
      for (const yy of [0.25, 3.1]) put(cyl, cx, yy, cz, 0.55, 0.3, 0.55, 0xfadcc0, 0, 0, 0, 'stone');
      put(sph, cx, 3.55, cz, 0.3, 0.38, 0.3, 0xffd27a, 0, 0, 0, 'glow');
    }
    const mx = x + px * (A - B) / 2, mz = z + pz * (A - B) / 2, span = A + B + 1.2;
    put(box, mx, 3.45, mz, span, 0.35, 0.5, 0xf6d0aa, yaw - PI / 2, 0, 0, 'stone');
    for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7 - 0.5; put(G.cone(4), mx + px * u * span, 3.18, mz + pz * u * span, 0.16, 0.3, 0.05, [PAL.rose, PAL.teal, PAL.saffron, PAL.lilac][i % 4], yaw - PI / 2, PI); }
    api.light(mx, 3.2, mz, 0xffd8a0, 1.0, 6, 0.05);
  }
  // Uzakta gülen kum tepeleri: yürünür alanın dışında, odaların çevresinde; kuzeydekiler yüksek (kameranın karşısı), güneydekiler alçak
  function distantDunes(L, api, put, sph, sphL, rnd) {
    const cols = [0xe8b47c, 0xe6ac88, 0xe4b0a0, 0xdcb0b8, 0xeab890];
    let faces = 0;
    for (const rm of L.rooms) {
      if (rm.kind === 'side') continue;
      for (let k = 0; k < 7; k++) {
        if (rm.kind === 'boss' && Math.cos((k + 0.25) / 7 * TAU) > -0.3) continue;   // arenanın kamera tarafında uzak tepe yok
        const a = (k + rnd() * 0.5) / 7 * TAU, d = (rm.r || 8) + 7 + rnd() * 5, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
        const south = Math.cos(a) > -0.2, s = south ? 1.8 + rnd() * 1.2 : 5 + rnd() * 4, h = south ? 0.5 + rnd() * 0.4 : 2.0 + rnd() * 2.0;   // (kamera tarafı ve yanlar alçak)
        let ok = !api.isFloor(x, z) && api.linkDist(x, z) > s * 0.9;
        for (let q = 0; q < 8 && ok; q++) { const b = q * PI / 4; for (const k of [0.95, 1.6, 2.4]) if (api.isFloor(x + Math.sin(b) * (s * k + (south ? 1.5 : 0)), z + Math.cos(b) * (s * k + (south ? 1.5 : 0)))) ok = false; }
        if (!ok) continue;
        const c = cols[(rnd() * cols.length) | 0];
        dk(x, z).add(G.hemi(16), duneColor(c, h, 0.5), [x, 0, z], [0, rnd() * PI, 0], [s, h, s * 0.8]);
        if (!south && h > 3.2 && faces < 10 && rnd() < 0.6) {   // sevimli yüz: kameraya (güneye) bakar
          faces++;
          const fz = z + s * 0.8 * 0.55, fy = h * 0.55;
          for (const sd of [-1, 1]) {
            put(sphL, x + sd * s * 0.16, fy, fz + 0.15, 0.18, 0.24, 0.1, 0x5a3a4a);
            put(sphL, x + sd * s * 0.16 - 0.05, fy + 0.08, fz + 0.24, 0.06, 0.06, 0.04, 0xffffff);
            put(sphL, x + sd * s * 0.27, fy - 0.35, fz + 0.05, 0.3, 0.16, 0.08, 0xff9ab4);
          }
          put(G.torus(PI * 0.8, 0.22, 16), x, fy - 0.25, fz + 0.12, 0.28, 0.22, 0.2, 0x5a3a4a, 0, 0, PI + PI * 0.1);
        }
      }
    }
  }

  // ════════ Hareketli / etkileşimli parçalar ════════
  function windStrip(api, R, s) {   // akan kum şeridi: zemine yakın, kayan saydam doku
    const mat = MAT.strip || (MAT.strip = keepM(new THREE.MeshBasicMaterial({ map: stripTex(), transparent: true, opacity: 0.7, depthWrite: false, color: new THREE.Color(1.15, 1.08, 1.0) })));
    const g = geo('strip', () => { const p = new THREE.PlaneGeometry(1, 1); p.rotateX(-PI / 2); return p; });
    const m = new THREE.Mesh(g, mat); m.position.set(s.x, 0.04, s.z); m.scale.set(s.w, 1, s.len); m.rotation.y = Math.atan2(s.ux, s.uz); m.renderOrder = 1;
    api.add(m);
    // şeridin iki ucunda küçük kum tümsekleri + ok gibi kumtaşı
    const put = api.put, sph = api.G.sphere(12, 8);
    if (!s.decor) {
      // (şeridin yanındaki uzun ince tümsekler kaldırıldı: kaburgaya benziyordu)
      api.glow(s.x, s.z, s.len * 0.5, 0xfff4e0, 0.12);
    }
    if (!MAT.stripAnim) { MAT.stripAnim = true; }
    if (!s.decor) R.strips.push(s);
    if (!R.stripT) { R.stripT = true; api.anim(dt => { mat.map.offset.y -= dt * 0.6; }); }
  }
  function castle(api, R, c) {   // kum kalesi: 4 kule + ortada büyük kule, mazgallar, minik flamalar (tek örgü, paylaşılan)
    const g = geo('castle', () => {
      const k = new Kit(), sd = C(0xf2cf98), sl = C(0xfadcb0), fl = [C(0xff8fb0), C(0x7fd0c8), C(0xffcf6a), C(0xc8a8ff)];
      k.add(G.cyl(1, 1, 18), sd, [0, 0.25, 0], null, [1.0, 0.5, 1.0]);
      k.add(G.cyl(1, 1, 18), sl, [0, 0.52, 0], null, [1.02, 0.05, 1.02]);
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + PI / 4, x = Math.sin(a) * 0.72, z = Math.cos(a) * 0.72;
        k.add(G.cyl(0.85, 1, 12), sd, [x, 0.55, z], null, [0.26, 1.1, 0.26]);
        for (let m = 0; m < 5; m++) { const b = m / 5 * TAU; k.add(G.box(), sl, [x + Math.sin(b) * 0.21, 1.15, z + Math.cos(b) * 0.21], [0, b, 0], [0.09, 0.12, 0.09]); }
        k.add(G.cyl(1, 1, 6), C(0xffffff), [x, 1.35, z], null, [0.015, 0.4, 0.015]);
        k.add(G.cone(4), fl[i], [x + 0.09, 1.48, z], [0, 0, -PI / 2], [0.07, 0.18, 0.02]);
      }
      k.add(G.cyl(0.8, 1, 16), sd, [0, 0.9, 0], null, [0.42, 1.6, 0.42]);
      k.add(G.cone(16), sl, [0, 1.95, 0], null, [0.4, 0.5, 0.4]);
      k.add(G.cyl(1, 1, 6), C(0xffffff), [0, 2.35, 0], null, [0.02, 0.35, 0.02]);
      k.add(G.cone(4), C(0xff8fb0), [0.12, 2.45, 0], [0, 0, -PI / 2], [0.1, 0.24, 0.03]);
      k.add(G.box(), C(0xb88a6a), [0, 0.32, 0.98], null, [0.3, 0.4, 0.06]);   // kapı
      for (let i = 0; i < 10; i++) { const a = i * 2.3; k.add(G.sphere(8, 6), [C(0xffffff), C(0xffc0d0), C(0xc0e8ff)][i % 3], [Math.sin(a) * 1.0, 0.1 + (i % 4) * 0.12, Math.cos(a) * 1.0], null, 0.05); }   // deniz kabuğu süsleri
      return k.build();
    });
    const mat = MAT.castle || (MAT.castle = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));
    const m = new THREE.Mesh(g, mat); m.position.set(c.x, 0, c.z); m.scale.setScalar(c.s); m.rotation.y = Math.random() * TAU; m.castShadow = false; m.receiveShadow = true;
    api.add(m);
    if (c.gold) api.glow(c.x, c.z, 1.6, 0xffe08a, 0.2);
    const T = { x: c.x, z: c.z, r: 1.5 * c.s, done: false, k: -1, fire() {
      T.done = true; T.k = 0;
      burst('dust', c.x, 0.6, c.z, { count: 13, scale: 1.6, color: '#f6deb0' }); burst('confetti', c.x, 1.2, c.z, { scale: 0.9 });
      sfx('pop', { x: c.x, z: c.z, pitch: 0.8 }); sfx('kumFisilti', { x: c.x, z: c.z, vol: 0.7 });
      if (c.solid) c.solid.alive = false;
      if (c.gold) { goldSugar(api, R, c.x, 0.9, c.z, { sticker: 'gizli_col_kale', line: 'pr_col_kale_hazine' }); burst('star', c.x, 1.2, c.z, { count: 8 }); }
      else coins(c.x, c.z, 6, 0.9);
    }, tick(dt) {
      if (T.k < 0 || T.k > 1) return;
      T.k += dt / 0.7; const u = Math.min(1, T.k);
      m.scale.set(c.s * (1 + 0.35 * u), c.s * Math.max(0.05, 1 - u) , c.s * (1 + 0.35 * u));
      if (T.k > 1) { m.scale.set(c.s * 1.35, c.s * 0.08, c.s * 1.35); }
    } };
    R.touch.push(T);
  }
  function pond(api, R, put, cyl, sph, sphL, p, rnd) {   // vaha gölcüğü: ışıltılı su, kumtaşı kıyı, nilüferler, palmiyeler, kamışlar
    const mat = MAT.water || (MAT.water = keepM(new THREE.MeshStandardMaterial({ color: 0x8fdcf0, roughness: 0.08, metalness: 0.1, emissive: new THREE.Color(0x3fa8c8), emissiveIntensity: 0.35, transparent: true, opacity: 0.88 })));
    const wg = geo('pondDisc', () => new THREE.CircleGeometry(1, 40).rotateX(-PI / 2));
    const w = new THREE.Mesh(wg, mat); w.position.set(p.x, 0.06, p.z); w.scale.setScalar(p.r); w.receiveShadow = true; api.add(w);
    put(cyl, p.x, 0.02, p.z, p.r + 0.05, 0.04, p.r + 0.05, 0x5ab8d0);   // koyu kenar
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, rr = p.r + 0.75; put(api.G.box(), p.x + Math.sin(a) * rr, 0.03, p.z + Math.cos(a) * rr, 0.42, 0.05, 0.3, i % 2 ? 0x4fc8c8 : 0xfff2dc, a); }   // turkuaz çini halka
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rnd() * 0.15, rr = p.r + 0.2; put(sph, p.x + Math.sin(a) * rr, 0.08, p.z + Math.cos(a) * rr, 0.55 + rnd() * 0.1, 0.16, 0.26, [0xf6d0b0, 0xfadcc0, 0xf0c4a8][i % 3], a, 0, 0, 'stone'); }
    for (let i = 0; i < 4; i++) {   // nilüfer yaprakları + çiçek
      const a = rnd() * TAU, d = rnd() * p.r * 0.6, x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
      put(cyl, x, 0.09, z, 0.32, 0.02, 0.32, 0x7cd090); if (i % 2 === 0) { for (let k = 0; k < 5; k++) { const b = k / 5 * TAU; put(sphL, x + Math.sin(b) * 0.08, 0.15, z + Math.cos(b) * 0.08, 0.08, 0.05, 0.08, 0xffb0d0); } put(sphL, x, 0.17, z, 0.05, 0.04, 0.05, 0xffe680); }
    }
    for (let i = 0; i < 2; i++) { const a = -PI * 0.75 + i * PI * 1.5 * 0.5 + rnd() * 0.3; palm(put, cyl, sph, sphL, p.x + Math.sin(a + PI) * (p.r + 0.8), p.z - Math.abs(Math.cos(a)) * (p.r + 0.8), 0.72 + rnd() * 0.12, rnd); }
    for (let i = 0; i < 5; i++) { const a = PI + (i - 2) * 0.35, x = p.x + Math.sin(a) * (p.r + 0.15), z = p.z + Math.cos(a) * (p.r + 0.15); put(cyl, x, 0.45, z, 0.03, 0.9, 0.03, 0x7cc87c); put(sph, x, 0.92, z, 0.06, 0.16, 0.06, 0xc89060); }
    api.light(p.x, 1.2, p.z, 0x9fe8ff, 1.4, 6, 0.08);
    api.glow(p.x, p.z, p.r + 2.2, 0xc8f4ff, 0.18);
    // ışıltılar + halka dalgaları
    const sp = new THREE.Points(new THREE.BufferGeometry(), MAT.pondPts || (MAT.pondPts = keepM(new THREE.PointsMaterial({ size: 0.2, map: dotTex(), color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))));
    const N = 4, pos = new Float32Array(N * 3), ph = []; for (let i = 0; i < N; i++) ph.push(Math.random() * TAU, Math.random() * p.r * 0.85, Math.random() * TAU);
    sp.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); api.dispose(sp.geometry); sp.frustumCulled = false; api.add(sp);
    let t = 0;
    api.anim(dt => {
      t += dt; mat.emissiveIntensity = 0.32 + 0.06 * Math.sin(t * 1.7);
      for (let i = 0; i < N; i++) { const a = ph[i * 3] + t * 0.1, d = ph[i * 3 + 1]; pos[i * 3] = p.x + Math.sin(a) * d; pos[i * 3 + 1] = 0.12 + 0.05 * Math.abs(Math.sin(t * 2 + ph[i * 3 + 2])); pos[i * 3 + 2] = p.z + Math.cos(a) * d; }
      sp.geometry.attributes.position.needsUpdate = true;
    });
    R.zones.push({ x: p.x, z: p.z, r: p.r + 2.2, enter: z => { say('pr_col_gol'); burst('sparkle', p.x, 0.4, p.z, { color: '#bff4ff', count: 7 }); sfx('splash', { x: p.x, z: p.z, vol: 0.5 }); } });
  }
  // Dev kum saati: altın-pembe çerçeve, iki cam hazne, akan kum. o.flip: yaklaşınca döner (şeker yağmuru), sonra yeniden akar.
  function hourglass(api, R, x, z, s, o = {}) {
    const root = new THREE.Group(); root.position.set(x, 0, z); root.scale.setScalar(s); root.rotation.x = -0.6; root.position.y = -0.2; api.add(root);   // arkaya yaslı (kamera yukarıdan-önden bakar): yan yüzü, iki hazne ve akan kum okunur
    const piv = new THREE.Group(); piv.position.y = 2.1; root.add(piv);
    const fg = geo('hgFrame', () => {
      const k = new Kit(), gold = C(0xf2c070), pink = C(0xff9ec2), cream = C(0xfff2dc);
      for (const sd of [-1, 1]) {
        k.add(G.cyl(1, 1, 24), gold, [0, sd * 1.93, 0], null, [1.1, 0.1, 1.1]);          // ince kapak (yukarıdan camı örtmesin)
        k.add(G.torus(TAU, 0.12, 28), pink, [0, sd * 1.99, 0], [PI / 2, 0, 0], [1.08, 1.08, 1.08]);
      }
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU + PI / 3;   // (direkler yanlarda ve arkada: ön taraf açık, haznelerle kum görünür)
        k.add(G.cyl(1, 1, 10), gold, [Math.sin(a) * 1.0, 0, Math.cos(a) * 1.0], null, [0.08, 3.8, 0.08]);
        for (const yy of [-1.2, 0, 1.2]) k.add(G.sphere(10, 8), pink, [Math.sin(a) * 1.05, yy, Math.cos(a) * 1.05], null, 0.16);
      }
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; k.add(G.sphere(8, 6), [C(0x7fd0c8), C(0xffcf6a), C(0xc8a8ff)][i % 3], [Math.sin(a) * 1.28, 1.95, Math.cos(a) * 1.28], null, 0.09); k.add(G.sphere(8, 6), [C(0x7fd0c8), C(0xffcf6a), C(0xc8a8ff)][i % 3], [Math.sin(a) * 1.28, -1.95, Math.cos(a) * 1.28], null, 0.09); }
      return k.build();
    });
    const fm = MAT.hgFrame || (MAT.hgFrame = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.25 })));
    const frame = new THREE.Mesh(fg, fm); frame.castShadow = false; piv.add(frame);
    // cam: iki yarı (lathe) — saydam
    const gg = geo('hgGlass', () => { const pts = []; for (let i = 0; i <= 20; i++) { const y = -1.82 + i / 20 * 3.64, t = Math.abs(y) / 1.82; pts.push(new THREE.Vector2(0.08 + 0.88 * Math.pow(Math.sin(t * PI * 0.5), 0.9) * (t > 0.92 ? 1 - (t - 0.92) * 4 : 1), y)); } return new THREE.LatheGeometry(pts, 28); });
    const gm = MAT.hgGlass || (MAT.hgGlass = keepM(new THREE.MeshStandardMaterial({ color: 0xeef8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.2, depthWrite: false, emissive: new THREE.Color(0x203040), emissiveIntensity: 0.3 })));
    const glass = new THREE.Mesh(gg, gm); glass.renderOrder = 2; piv.add(glass);
    // kum: üst koni (azalan), alt koni (büyüyen), ince akış
    const sm2 = MAT.hgSand || (MAT.hgSand = keepM(new THREE.MeshStandardMaterial({ color: 0xffb27e, roughness: 0.8, emissive: new THREE.Color(0xff9a6a), emissiveIntensity: 0.22 })));
    const cg = geo('hgCone', () => new THREE.ConeGeometry(1, 1, 24));
    const top = new THREE.Mesh(cg, sm2), bot = new THREE.Mesh(cg, sm2), str = new THREE.Mesh(geo('hgStr', () => new THREE.CylinderGeometry(1, 1, 1, 8)), sm2);
    top.rotation.x = PI; piv.add(top, bot, str);
    api.light(x, 2.2 * s, z + 0.6, 0xffd0a0, 1.3, 7, 0.05);
    api.glow(x, z, 3 * s, 0xffe0c0, 0.22);
    // durum: k = akış (0 → üst dolu, 1 → alt dolu); flip
    const S = { k: 0.15, flip: -1, dir: 1, cd: 0 };
    const set = () => {
      const up = 1 - S.k, dn = S.k;
      top.scale.set(0.82 * Math.sqrt(up) + 0.01, 1.3 * up + 0.01, 0.82 * Math.sqrt(up) + 0.01); top.position.y = 0.25 + 0.65 * up * 0.5 + 0.15;
      bot.scale.set(0.85 * Math.sqrt(dn) + 0.01, 1.2 * dn + 0.01, 0.85 * Math.sqrt(dn) + 0.01); bot.position.y = -1.8 + 0.6 * dn;
      const on = S.flip < 0 && S.k < 0.995;
      str.visible = on; str.scale.set(0.055, 1.6, 0.055); str.position.y = -0.8;
    };
    set();
    let t = 0;
    api.anim(dt => {
      t += dt;
      if (S.flip >= 0) {   // dönüş: 1,4 s
        S.flip += dt / 1.4; const u = sm(Math.min(1, S.flip));
        piv.rotation.z = (S.dir > 0 ? 0 : PI) + PI * u; piv.position.y = 2.1 + Math.sin(PI * u) * 0.5;
        if (S.flip >= 1) { S.flip = -1; S.dir = -S.dir; piv.rotation.z = 0; S.k = 1 - S.k; set(); }
        return;
      }
      S.k = Math.min(1, S.k + dt / 24); set();
      if (S.rain > 0) {
        S.rain -= dt;
        if ((S.rainT -= dt) <= 0) { S.rainT = 0.32; coins(x + (Math.random() - 0.5) * 0.6, z + 0.8, 1, 0.8); }
      }
      str.position.y = -0.8 + Math.sin(t * 30) * 0.01;
      S.cd = Math.max(0, S.cd - dt);
    });
    if (o.flip) {
      const T = { x, z, r: 2.6 * s, done: false, fire() {
        if (S.flip >= 0 || S.cd > 0) return;
        S.flip = 0; S.cd = 9; T.done = false;
        sfx('kumSaati', { x, z, vol: 0.9 }); sfx('whoosh', { x, z, pitch: 0.7 });
        burst('sparkle', x, 2.5 * s, z, { color: '#ffd0a0', count: 11 });
        S.rain = 3.2; S.rainT = 0.9;   // dönüş bitince kum taneleri tek tek şeker olup yağar (sakin, tek efekt)
        if (!T.said) { T.said = true; setTimeout(() => say('pr_col_kumsaati_dondu', { gap: 2 }), 1000); }
      } };
      R.touch.push(T);
      R.zones.push({ x, z, r: 7, enter: () => say('pr_col_kumsaati') });
    }
    return root;
  }
  // ── Kum kaplumbağası: kumda yarı gömülü yuvarlak kabuk; Feza yaklaşınca başını çıkarır, kafa sallar, şeker bırakır, yeniden saklanır ──
  function sandTurtle(api, R, p) {
    const sg = geo('kapKabuk', () => {
      const k = new Kit(), sh = C(0x8fd0a8), shL = C(0xc8f0c8), rim = C(0xf2d6a0);
      k.add(G.hemi(20), (x, y, z) => { const a = Math.atan2(x, z), r = Math.hypot(x, z), hex = Math.sin(a * 6) * Math.sin(r * 14 + y * 6); return (hex > 0.3 ? shL : sh).clone(); }, [0, 0.05, 0], null, [0.75, 0.5, 0.85]);
      k.add(G.torus(TAU, 0.18, 28), rim, [0, 0.07, 0], [PI / 2, 0, 0], [0.78, 0.86, 0.4]);
      return k.build();
    });
    const hg = geo('kapBas', () => {
      const k = new Kit(), sk = C(0xb8e0a0), ey = C(0x2a2030);
      k.add(G.sphere(16, 12), sk, [0, 0, 0], null, [0.26, 0.22, 0.28]);
      for (const sd of [-1, 1]) { k.add(G.sphere(10, 8), C(0xffffff), [sd * 0.11, 0.07, 0.2], null, 0.065); k.add(G.sphere(8, 6), ey, [sd * 0.11, 0.07, 0.25], null, 0.035); k.add(G.sphere(8, 6), C(0xff9ab4), [sd * 0.17, -0.04, 0.2], null, [0.05, 0.03, 0.02]); }
      k.add(G.torus(PI * 0.8, 0.25, 12), ey, [0, -0.06, 0.25], [0, 0, PI + PI * 0.1], [0.07, 0.05, 0.05]);
      return k.build();
    });
    const fg = geo('kapAyak', () => { const k = new Kit(); for (const [x, z] of [[0.55, 0.45], [-0.55, 0.45], [0.55, -0.45], [-0.55, -0.45]]) k.add(G.sphere(10, 8), C(0xb8e0a0), [x, 0.06, z], null, [0.16, 0.08, 0.2]); return k.build(); });
    const mat = MAT.kap || (MAT.kap = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })));
    const g = new THREE.Group(); g.position.set(p.x, -0.12, p.z); g.rotation.y = 0.3;
    const shell = new THREE.Mesh(sg, mat), head = new THREE.Mesh(hg, mat), feet = new THREE.Mesh(fg, mat);
    head.position.set(0, 0.2, 0.55); head.scale.setScalar(0.01); feet.scale.setScalar(0.01);
    g.add(shell, head, feet); api.add(g);
    // kumda küçük tümsek halkası
    const S = { k: 0, t: -1, cd: 0 };
    const T = { x: p.x, z: p.z, r: 2.6, done: false, fire() {
      if (S.t >= 0 || S.cd > 0) return;
      S.t = 0; S.cd = 12;
      sfx('pop', { x: p.x, z: p.z, pitch: 1.4, vol: 0.6 });
      setTimeout(() => { coins(p.x, p.z + 0.6, 4, 0.8); burst('hearts', p.x, 1.0, p.z, { count: 2 }); }, 700);
      if (!T.said) { T.said = true; say('pr_col_kaplumbaga', { gap: 3 }); }
    }, tick(dt) {
      S.cd = Math.max(0, S.cd - dt);
      if (S.t < 0) { shell.position.y = 0.02 * Math.sin(performance.now() / 900); return; }   // uykuda yavaşça nefes alır
      S.t += dt; const u = S.t;
      const out = sm(u / 0.5) * (1 - sm((u - 3.2) / 0.5));   // 0,5 s'de çıkar, 3,2 s bekler, saklanır
      g.position.y = -0.12 + 0.12 * out; head.scale.setScalar(0.01 + 0.99 * out); feet.scale.setScalar(0.01 + 0.99 * out);
      head.rotation.y = Math.sin(u * 3) * 0.35 * out; head.rotation.x = -0.2 * Math.abs(Math.sin(u * 6)) * out;   // selam: başını sallar
      if (u > 3.8) S.t = -1;
    } };
    R.touch.push(T);
  }
  // ── Gömülü hazine sandığı: kumda bir köşesi görünür; Feza basınca kumdan yükselir, kapağı açılır, şeker + altın şeker ──
  function buriedChest(api, R, p) {
    const bg = geo('sandikGovde', () => { const k = new Kit(); k.add(G.rbox(2), C(0xd88a5a), [0, 0.3, 0], null, [1.0, 0.6, 0.7]); for (const x of [-0.42, 0.42]) k.add(G.box(), C(0xffd27a), [x, 0.3, 0], null, [0.08, 0.62, 0.72]); k.add(G.box(), C(0xffd27a), [0, 0.42, 0.36], null, [0.18, 0.2, 0.04]); return k.build(); });
    const lg = geo('sandikKapak', () => { const k = new Kit(); k.add(G.cyl(1, 1, 16, false), C(0xe89a68), [0, 0, 0], [0, 0, PI / 2], [0.35, 1.0, 0.35]); for (const x of [-0.42, 0.42]) k.add(G.cyl(1, 1, 16), C(0xffd27a), [x, 0, 0], [0, 0, PI / 2], [0.36, 0.08, 0.36]); return k.build(); });
    const mat = MAT.sandik || (MAT.sandik = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 })));
    const g = new THREE.Group(); g.position.set(p.x, -0.55, p.z); g.rotation.y = -0.25;
    const body = new THREE.Mesh(bg, mat), lidP = new THREE.Group(), lid = new THREE.Mesh(lg, mat);
    lidP.position.set(0, 0.6, -0.35); lid.position.set(0, 0, 0.35); lid.scale.set(1, 1, 1); lidP.add(lid); g.add(body, lidP); api.add(g);
    const S = { t: -1 };
    const T = { x: p.x, z: p.z, r: 1.6, done: false, fire() {
      T.done = true; S.t = 0;
      sfx('chest', { x: p.x, z: p.z, vol: 0.8 }); burst('dust', p.x, 0.4, p.z, { count: 8, color: '#f6deb0' });
      setTimeout(() => { coins(p.x, p.z, 8, 1.0); say('pr_col_sandik', { gap: 3 }); }, 1100);
    }, tick(dt) {
      if (S.t < 0) return;
      S.t += dt; const u = S.t;
      g.position.y = -0.55 + 0.55 * sm(u / 0.8);                 // kumdan yükselir
      lidP.rotation.x = -1.6 * sm((u - 0.85) / 0.35);              // kapak açılır
      if (u > 1.4) S.t = -2;
    } };
    R.touch.push(T);
  }
  // ── Açan kaktüs çiçeği: dikensiz tombul kaktüsün tepesinde kapalı tomurcuk; Feza yaklaşınca açar, kalp çıkarır ──
  function budCactus(api, R, p) {
    const put = api.put, sph = api.G.sphere(12, 8), c = 0x9cebb4;
    put(sph, p.x, 0.62, p.z, 0.36, 0.64, 0.36, c);
    for (const sd of [-1, 1]) { put(sph, p.x + sd * 0.38, 0.7, p.z, 0.12, 0.12, 0.12, c); put(sph, p.x + sd * 0.46, 0.9, p.z, 0.11, 0.24, 0.11, c); }
    for (let i = 0; i < 6; i++) { const a = i * 1.1, yy = 0.35 + (i % 3) * 0.3; put(sph, p.x + Math.sin(a) * 0.34, yy, p.z + Math.cos(a) * 0.34, 0.03, 0.03, 0.03, 0xffffff); }
    const fgm = geo('tomurcuk', () => { const k = new Kit(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.add(G.sphere(10, 6), C(0xff8fc0), [Math.sin(a) * 0.14, 0.05, Math.cos(a) * 0.14], [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5], [0.1, 0.05, 0.16]); } k.add(G.sphere(10, 8), C(0xffe680), [0, 0.08, 0], null, 0.08); return k.build(); });
    const mat = MAT.tomurcuk || (MAT.tomurcuk = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 })));
    const f = new THREE.Mesh(fgm, mat); f.position.set(p.x, 1.24, p.z); f.scale.set(0.35, 0.8, 0.35); api.add(f);
    const S = { t: -1 };
    const T = { x: p.x, z: p.z, r: 2.0, done: false, fire() {
      T.done = true; S.t = 0; sfx('pop', { x: p.x, z: p.z, pitch: 1.7, vol: 0.5 });
      setTimeout(() => { burst('hearts', p.x, 1.6, p.z, { count: 2 }); coins(p.x, p.z + 0.5, 3, 0.7); }, 500);
    }, tick(dt) {
      if (S.t < 0 || S.t > 1) return;
      S.t = Math.min(1.01, S.t + dt / 0.6); const u = sm(S.t);
      f.scale.set(0.35 + 0.95 * u, 0.8 + 0.4 * u, 0.35 + 0.95 * u); f.rotation.y = u * 1.2;
    } };
    R.touch.push(T);
  }
  // ── Uzakta deve kervanı: üç sevimli deve, yavaşça soldan sağa yürür, sonra baştan (yalnız görüntü, yürünür alanın dışında) ──
  function caravan(api, cv) {
    const cg = geo('deve', () => {
      const k = new Kit(), b = C(0xe8b882), d = C(0xd09a68), bl = C(0xff8fb0), te = C(0x7fd0c8);
      k.add(G.sphere(16, 10), b, [0, 1.3, 0], null, [0.5, 0.42, 0.8]);
      k.add(G.sphere(14, 10), b, [0, 1.75, -0.05], null, [0.32, 0.34, 0.36]);   // hörgüç
      k.add(G.box(), bl, [0, 1.62, 0.15], null, [0.9, 0.06, 0.45]);            // renkli kilim eyer
      k.add(G.box(), te, [0, 1.63, 0.15], null, [0.92, 0.03, 0.2]);
      k.seg([0, 1.4, 0.65], [0, 2.0, 0.95], 0.13, b, 0.1, 8);
      k.add(G.sphere(12, 8), b, [0, 2.05, 1.1], null, [0.16, 0.15, 0.26]);
      for (const sd of [-1, 1]) k.add(G.sphere(8, 6), C(0x3a2a2a), [sd * 0.1, 2.12, 1.2], null, 0.03);
      for (const [x, z] of [[0.25, 0.5], [-0.25, 0.5], [0.25, -0.5], [-0.25, -0.5]]) k.seg([x, 1.1, z], [x, 0.05, z], 0.07, d, 0.06, 6);
      return k.build();
    });
    const mat = MAT.deve || (MAT.deve = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));
    const N = 3, cam = [], len = hyp(cv.x1 - cv.x0, cv.z1 - cv.z0), ux = (cv.x1 - cv.x0) / len, uz = (cv.z1 - cv.z0) / len, yaw = Math.atan2(ux, uz);
    for (let i = 0; i < N; i++) { const m = new THREE.Mesh(cg, mat); m.rotation.y = yaw; m.scale.setScalar(i === 0 ? 1.0 : 0.85); api.add(m); cam.push(m); }
    let t = Math.random() * 30;
    api.anim(dt => {
      t += dt;
      for (let i = 0; i < N; i++) {
        const u = ((t * 0.8 - i * 2.4) % (len + 6) + (len + 6)) % (len + 6) - 3;   // yavaş yürüyüş, sonra baştan
        cam[i].position.set(cv.x0 + ux * u, Math.abs(Math.sin((t + i) * 2.2)) * 0.06, cv.z0 + uz * u);
        cam[i].rotation.z = Math.sin((t + i) * 2.2) * 0.04;
        cam[i].visible = u > -2 && u < len + 2;
      }
    });
  }

  function kilim(api, x, z, yaw, i, w, d) {   // yere serili kilim (ince kutu, üstü desenli)
    const key = 'kilim' + (i % 3);
    const mat = MAT[key] || (MAT[key] = keepM(new THREE.MeshStandardMaterial({ map: kilimTex(i), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 })));
    const g = geo('kilimBox', () => new THREE.BoxGeometry(1, 0.04, 1));
    const m = new THREE.Mesh(g, mat); m.position.set(x, 0.03, z); m.rotation.y = yaw; m.scale.set(w, 1, d); m.receiveShadow = true; api.add(m);
  }
  function arenaDecor(L, api, R, put, cyl, cone, box, sph, A, rnd) {
    // kuzeyde dev kum saati (arenanın dışında, kamera karşısında)
    // (ışığın verildiği çıkış kapısının 8 m çevresinde yüksek bir şey olmasın: kum saati kuzeybatı/kuzeydoğu çaprazında)
    const ex = L.exit, farEx = (x, z, r = 8) => !ex || hyp(x - ex.x, z - ex.z) >= r;
    let hx = null, hz = null;
    for (const a of [PI + 0.75, PI - 0.75, PI + 1.05, PI - 1.05]) {
      for (let d = A.r + 2.2; d < A.r + 8 && hx === null; d += 0.5) { const x = A.x + Math.sin(a) * d, z = A.z + Math.cos(a) * d; if (!api.isFloor(x, z) && !api.isFloor(x, z + 1.6) && farEx(x, z)) { hx = x; hz = z; } }
      if (hx !== null) break;
    }
    if (hx !== null) hourglass(api, R, hx, hz, 1.3, {});
    // kenarda çadırlar + aralarında flama ipleri (yalnız kuzey/yan; güney açık)
    const pts = [];
    for (let k = 0; k < 9; k++) {
      const a = PI * 0.5 + k / 8 * PI, x = A.x + Math.sin(a) * (A.r + 2.6), z = A.z + Math.cos(a) * (A.r + 2.6);
      if (api.isFloor(x, z) || (hx !== null && hyp(x - hx, z - hz) < 4) || !farEx(x, z, 8)) { pts.push(null); continue; }
      tent(put, cyl, cone, box, sph, x, z, 1.15 + rnd() * 0.2, rnd); pts.push({ x, z });
    }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]; if (!a || !b) continue;
      const N = 8;
      for (let s = 1; s < N; s++) { const u = s / N, x = lerp(a.x, b.x, u), z = lerp(a.z, b.z, u), y = 3.4 - Math.sin(u * PI) * 0.6; put(cone, x, y, z, 0.17, 0.32, 0.04, [PAL.rose, PAL.teal, PAL.saffron, PAL.lilac, PAL.coral][s % 5], Math.atan2(b.x - a.x, b.z - a.z) + PI / 2, PI); }
    }
    api.light(A.x, 3, A.z, 0xffe0c0, 1.2, 9, 0.04);
  }
  // Rüzgârla yatay süzülen kum parıltıları (Feza'nın çevresinde, tek çizim)
  function motes(api) {
    const n = 28, W = 34, D = 30, Hh = 6;   // (okunurluk: seyrek)
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seed = [];
    const cols = [0xfff2d8, 0xffd8c0, 0xffffff, 0xffe4f0].map(h => new THREE.Color(h).multiplyScalar(0.7));
    for (let i = 0; i < n; i++) { seed.push({ x: Math.random() * W, y: Math.random() * Hh, z: Math.random() * D, s: 0.5 + Math.random(), w: Math.random() * TAU }); const c = cols[i % 4]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); api.dispose(g);
    const m = MAT.motes || (MAT.motes = keepM(new THREE.PointsMaterial({ size: 0.16, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 4; api.add(pts);
    let t = 0;
    api.anim((dt, fx0, fz0) => {
      t += dt;
      const ox = fx0 - W / 2, oz = fz0 - D * 0.62;
      for (let i = 0; i < n; i++) {
        const s = seed[i]; s.x += dt * 1.6 * s.s; s.y -= dt * 0.1 * s.s; if (s.y < 0) s.y += Hh;
        const x = ((s.x - ox) % W + W) % W, z = ((s.z - oz + Math.sin(t * 0.7 + s.w) * 0.4) % D + D) % D;
        pos[i * 3] = ox + x; pos[i * 3 + 1] = 0.2 + s.y + Math.sin(t * 2 + s.w) * 0.15; pos[i * 3 + 2] = oz + z;
      }
      g.attributes.position.needsUpdate = true;
    });
  }
  function sandMist(api, L) {   // kıyıda yerde süzülen sıcak kum pusu
    const spots = edgeSpots(L, api, { dmin: 0.6, dmax: 2.8, space: 7 }).slice(0, 16);
    if (!spots.length) return;
    const n = spots.length, pos = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); api.dispose(g);
    const m = MAT.mist || (MAT.mist = keepM(new THREE.PointsMaterial({ size: 7, map: dotTex(), color: 0xffe8d0, transparent: true, opacity: 0.12, depthWrite: false })));
    const p = new THREE.Points(g, m); p.renderOrder = 2; p.frustumCulled = false; api.add(p);
    let t = 0;
    api.anim(dt => {
      t += dt;
      for (let i = 0; i < n; i++) { pos[i * 3] = spots[i].x + Math.sin(t * 0.25 + i * 1.7) * 0.9; pos[i * 3 + 1] = 0.45 + Math.sin(t * 0.3 + i) * 0.12; pos[i * 3 + 2] = spots[i].z + Math.cos(t * 0.17 + i) * 0.4; }
      g.attributes.position.needsUpdate = true;
    });
  }

  BOLUM.define('col', {
    ad: 'Kum Saati Çölü',
    taban: 'bathroom',        // (eski zemin gizlenir: kendi kum zeminimiz; 'forest' köy evleri kurar, 'dairy' süt gölü — kullanma)
    size: 100, side: 2,
    areas: [{ id: 'a1', ad: 'Gülen Kum Tepeleri', rooms: 2 }, { id: 'a2', ad: 'Palmiyeli Vaha', rooms: 2 }, { id: 'a3', ad: 'Akan Kum Vadisi', rooms: 2 }, { id: 'a4', ad: 'Renkli Çadırlar', rooms: 1 }],
    muzik: 'pr_col',
    malzeme: 'isik3',
    kayipEsya: null,
    final: false,
    isik: { fog: [0xf8dcc4, 38, 100], hemiSky: 0xfff4e6, hemiGround: 0xe8ac78, hemi: 0.72, sunColor: 0xfff0d6, sun: 2.05, sunOffset: [-12, 26, 14],
      env: [0xc0e0ff, 0xffe8d2, 0xeec49a, 0.75], bloom: 0.16, exposure: 1.0, fezaLight: 0, fezaLightColor: 0xffd9a0, sat: 1.06, vig: 0.22 },   // (okunurluk: az parıltı)
    zemin: { tA: 0xf6d8a8, tB: 0xfbe9cc, tC: 0xf4c9a4, out: 0xe8b88a, outAmt: 0.4, macro: 0xfff0e0 },
    minimap: { zemin: '#f2c26b' },
    harita: { ad: 'Kum Saati Çölü', detay: 'Kum tepeleri, vaha, dev kum saati ve renk değiştiren koca bukalemun', renk: '#f2c26b', x: 58, y: 70, simge: '⏳' },
    yerlesim, kur,
    kurSon(L, api) {   // çıkış kapısının taş kemeri aynı biçimde kalır, yalnız sıcak kumtaşı rengine boyanır (çöl teması)
      const po = L.portalObj && L.portalObj.obj, arch = po && po.children && po.children[0];   // (06_level makePortal: 0 = taş kemer)
      if (!arch || !arch.isMesh || !arch.material || !arch.material.clone) return;
      const m = arch.material.clone(); m.color = new THREE.Color(1.0, 0.86, 0.68);   // (paylaşılan kaya malzemesi değişmesin: kopya)
      arch.material = m; if (api && api.dispose) api.dispose(m);
    },
  });
  // Gizli çıkartmalar (albümün çöl sayfası): HUB yüklenince kaydedilir
  (function gizli(n) {
    if (typeof HUB !== 'undefined' && HUB) { HUB.GIZLI = HUB.GIZLI || {}; HUB.GIZLI.col = Object.assign(HUB.GIZLI.col || {}, { gizli_col_kose: ['Gizli Kilim Köşesi', '🧶'], gizli_col_kale: ['Altın Kum Kalesi', '🏰'] }); return; }
    if (n < 40) setTimeout(() => gizli(n + 1), 250);
  })(0);
  return { tex: { sandTex, pathTex, stoneTex } };
})();
