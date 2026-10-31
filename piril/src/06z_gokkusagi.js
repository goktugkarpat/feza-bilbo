/* ── Bölüm 5 (FİNAL): Gökkuşağı Adaları (Feza ile Pırıl) ──
   Bulutların üstünde uçan pastel adalar. Odalar = yüzen adalar (yumuşak çimen, çiçek benekleri, krem bulut-taşı yol), adaların
   kenarından aşağı katman katman pastel kayalık iner, altında bulutlar; adalar arasındaki koridorlar = üstünde yürünen
   gökkuşağı köprüleri. Aşağıda bulut denizi (iki katman, üstteki yavaşça kayar), uzakta pastel bulut kaleleri, dev gökkuşakları,
   uçan sıcak hava balonları; kıyılardan aşağı akan bulut şelaleleri; havada pastel parıltılar.
     1. Bulut Basamakları   nane yeşili adalar, pofuduk bulut çalıları, zıplatan bulut (Feza havaya sıçrar)
     2. Yağmur Adası        taze yeşil, küçük yağmur bulutları (damlalar), su birikintileri, rüzgâr çanı
     3. Gökkuşağı Köprüsü   şeftali-pembe adalar, uzun gökkuşağı köprüleri, rüzgâr çanları
     4. Yıldız Adası        lavanta adalar, yerde parlayan yıldız benekleri, aşağıda yıldızlı gök, yıldız kristalleri
     Arena: inci rengi bulut adası, yerde gökkuşağı halkaları (Koca Fırtına Bulutu: src/05z_gokkusagi.js).
   Gizli köşeler: yan adalarda yıldız hediyeleri (sonuncusu altın şeker), zıplatan bulutlar, rüzgâr çanları (dokununca ezgi).
   Genel ad: GOKKUSAGI (boss davranışı arena kutlaması için `GOKKUSAGI.kutla(x, z)`, `GOKKUSAGI.firtina(k)` çağırır).
   Biçim: PIRIL.md › 5, src/SPEC.md › "Dev Ev API" (kur api). */
const GOKKUSAGI = (() => {
  'use strict';
  const PI = Math.PI, hyp = Math.hypot;
  const col = (h, k = 1) => (k === 1 ? new THREE.Color(h) : new THREE.Color(h).multiplyScalar(k));
  const K = typeof ODAKIT !== 'undefined' ? ODAKIT : null;
  const RAINBOW = [0xff7a9a, 0xffac63, 0xffe36e, 0x86e39a, 0x6fcbff, 0x9a93ff, 0xd99bff];
  // alan renkleri (çimen tonu): 0 Bulut Basamakları · 1 Yağmur Adası · 2 Gökkuşağı Köprüsü · 3 Yıldız Adası · 4 arena
  const AREA_C = [0x6fd88e, 0x6fd0bd, 0xffa9bd, 0xae94ee, 0xf0a6dc];   // SADE8: ilk ada (nane) daha doygun
  const AREA_ROCK = [[0xffe2c4, 0xf2a6c0, 0xb98ee0, 0x7a68c0], [0xe0f4ea, 0x9fd0e2, 0x8a9ee0, 0x6670c0], [0xffe6cc, 0xff9e9e, 0xe07eb4, 0x9a6ec8],
    [0xe8dcff, 0xb49cf0, 0x8a74d8, 0x5a4eaa], [0xffe8f6, 0xf0a8d8, 0xc28ee0, 0x8a72c8]];

  // ── kalıcı malzemeler (bölümler arası paylaşılır; disposeTree silmez) ──
  const M = {};
  const keep = m => { m.userData.keep = true; return m; };
  function mat(k) {
    if (M[k]) return M[k];
    let m;
    switch (k) {
      case 'cliff': m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }); break;
      case 'bridge': m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.04 }); break;   // SADE5: beyazlatma az → şeritler doygun
      case 'puff': m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, emissive: new THREE.Color(0xffe6f4), emissiveIntensity: 0.22 }); break;
      case 'vc': m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0 }); break;
      case 'chime': m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.45 }); break;
      case 'glow': m = new THREE.MeshBasicMaterial({ vertexColors: true }); break;
      default: m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    }
    return (M[k] = keep(m));
  }
  const GEO = {};
  const kg = (key, make) => GEO[key] || (GEO[key] = (g => { g.userData.keep = true; return g; })(make()));

  // ── yumuşak nokta dokusu (parçacıklar) ──
  let DOT = null;
  function dotTex() {
    if (DOT) return DOT;
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    DOT = new THREE.CanvasTexture(c); DOT.colorSpace = THREE.SRGBColorSpace; DOT.userData.keep = true; return DOT;
  }
  // bulut denizi dokusu (döşenebilir pofuduk bulutlar)
  let SEA = null;
  function seaTex() {
    if (SEA) return SEA;
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    x.fillStyle = '#f3e4f6'; x.fillRect(0, 0, S, S);
    let sd = 7; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) {
      const px = r() * S, py = r() * S, rad = 14 + r() * 34, tint = r();
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        const gr = x.createRadialGradient(px + ox - rad * 0.2, py + oy - rad * 0.3, 0, px + ox, py + oy, rad);
        gr.addColorStop(0, tint < 0.5 ? 'rgba(255,255,255,0.95)' : 'rgba(255,240,250,0.9)'); gr.addColorStop(0.7, 'rgba(250,235,250,0.55)'); gr.addColorStop(1, 'rgba(240,220,245,0)');
        x.fillStyle = gr; x.beginPath(); x.arc(px + ox, py + oy, rad, 0, TAU); x.fill();
      }
    }
    SEA = new THREE.CanvasTexture(c); SEA.wrapS = SEA.wrapT = THREE.RepeatWrapping; SEA.colorSpace = THREE.SRGBColorSpace; SEA.userData.keep = true;
    return SEA;
  }

  // ════════ Ada alanı: yürünür ızgara + odalar → yumuşak ada maskesi (2 örnek/m) ════════
  function field(L) {
    const pad = 14, ppm = 2, W = (L.W + pad * 2) * ppm, H = (L.H + pad * 2) * ppm;
    const isl = new Float32Array(W * H), walk = new Float32Array(W * H), path = new Float32Array(W * H), area = new Int8Array(W * H).fill(-1);
    const rooms = L.rooms, A = L.areas || [], areaOf = {};
    A.forEach((a, k) => a.rooms.forEach(ri => { areaOf[ri] = a.boss ? 4 : Math.min(3, k); }));
    const ext = rm => (rm.hw ? Math.max(rm.hw, rm.hh) * 1.0 + 0.4 : rm.kind === 'boss' ? rm.r * 1.25 + 1 : rm.r * 1.18 + 0.4);
    const isF = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return i >= 0 && j >= 0 && i < L.W && j < L.H && !!L.grid[j * L.W + i]; };
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = (i + 0.5) / ppm - pad, z = (j + 0.5) / ppm - pad, o = j * W + i;
      const w = isF(x, z) ? 1 : 0; walk[o] = w;
      let best = 1e9, bi = -1;
      for (let r = 0; r < rooms.length; r++) { const rm = rooms[r], d = hyp(x - rm.x, z - rm.z) - ext(rm); if (d < best) { best = d; bi = r; } }
      if (bi >= 0 && best < 6) area[o] = areaOf[bi] ?? 0;
      if (w && best < 0) isl[o] = 1;
    }
    // yol: L.path boyunca (kalın, yumuşak)
    const P = L.path || [];
    for (let k = 1; k < P.length; k++) {
      const a = P[k - 1], b = P[k], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
      const i0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - 1.8 + pad) * ppm)), i1 = Math.min(W - 1, Math.ceil((Math.max(a.x, b.x) + 1.8 + pad) * ppm));
      const j0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - 1.8 + pad) * ppm)), j1 = Math.min(H - 1, Math.ceil((Math.max(a.z, b.z) + 1.8 + pad) * ppm));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = (i + 0.5) / ppm - pad, z = (j + 0.5) / ppm - pad, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2));
        const d = hyp(x - a.x - dx * t, z - a.z - dz * t), v = d < 0.9 ? 1 : d < 1.6 ? (1.6 - d) / 0.7 : 0;
        const o = j * W + i; if (v > path[o]) path[o] = v;
      }
    }
    // yumuşat (kutu bulanıklığı) — ada kenarı ~0,7 m dışa taşar (Feza uçurumun tam dibinde durmasın)
    const blur = (arr, it) => {
      const t = new Float32Array(arr.length);
      for (let n = 0; n < it; n++) {
        t.set(arr);
        for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
          const o = j * W + i;
          arr[o] = (t[o - W - 1] + t[o - W] + t[o - W + 1] + t[o - 1] + t[o] + t[o + 1] + t[o + W - 1] + t[o + W] + t[o + W + 1]) / 9;
        }
      }
    };
    blur(isl, 3); blur(walk, 1); blur(path, 1);
    const at = (arr, x, z) => {   // çift doğrusal örnek (dünya koordinatı)
      const fx = (x + pad) * ppm - 0.5, fz = (z + pad) * ppm - 0.5, i = Math.floor(fx), j = Math.floor(fz);
      if (i < 0 || j < 0 || i >= W - 1 || j >= H - 1) return 0;
      const u = fx - i, v = fz - j, o = j * W + i;
      return (arr[o] * (1 - u) + arr[o + 1] * u) * (1 - v) + (arr[o + W] * (1 - u) + arr[o + W + 1] * u) * v;
    };
    const areaAt = (x, z) => { const i = Math.round((x + pad) * ppm - 0.5), j = Math.round((z + pad) * ppm - 0.5); if (i < 0 || j < 0 || i >= W || j >= H) return 0; const a = area[j * W + i]; return a < 0 ? 0 : a; };
    return { pad, ppm, W, H, isl, walk, path, area, at, areaAt, T: 0.3 };
  }

  // ════════ Ada üstü: tek düzlem, ada maskesi dışında kesilir (çimen, çiçek benekleri, krem yol, yıldız ışıltıları) ════════
  function islandTop(L, api, F) {
    const { W, H, pad, ppm } = F, a = new Uint8Array(W * H * 4), b = new Uint8Array(W * H * 4), c3 = new THREE.Color(), cc = AREA_C.map(h => col(h));
    // alan renkleri yumuşak geçsin: önce renk alanı, sonra bulanıklık
    const rgb = new Float32Array(W * H * 3);
    for (let o = 0; o < W * H; o++) { const ar = F.area[o] < 0 ? 0 : F.area[o]; c3.copy(cc[ar]); rgb[o * 3] = c3.r; rgb[o * 3 + 1] = c3.g; rgb[o * 3 + 2] = c3.b; }
    for (let it = 0; it < 4; it++) {
      const t = rgb.slice();
      for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) for (let ch = 0; ch < 3; ch++) {
        const o = (j * W + i) * 3 + ch;
        rgb[o] = (t[o - W * 3] + t[o + W * 3] + t[o - 3] + t[o + 3] + t[o] * 2) / 6;
      }
    }
    const ar = (L.rooms.find(r => r.kind === 'boss') || L.rooms[L.rooms.length - 1]);
    for (let o = 0; o < W * H; o++) {
      a[o * 4] = Math.round(rgb[o * 3] * 255); a[o * 4 + 1] = Math.round(rgb[o * 3 + 1] * 255); a[o * 4 + 2] = Math.round(rgb[o * 3 + 2] * 255);
      a[o * 4 + 3] = Math.round(Math.min(1, F.isl[o]) * 255);
      b[o * 4] = Math.round(Math.min(1, F.path[o]) * 255); b[o * 4 + 1] = Math.round(Math.min(1, F.walk[o]) * 255);
      b[o * 4 + 2] = F.area[o] === 3 ? 255 : 0; b[o * 4 + 3] = F.area[o] === 4 ? 255 : 0;
    }
    const tA = new THREE.DataTexture(a, W, H, THREE.RGBAFormat), tB = new THREE.DataTexture(b, W, H, THREE.RGBAFormat);
    for (const t of [tA, tB]) { t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; api.dispose(t); }
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
    const U = { tGkA: { value: tA }, tGkB: { value: tB }, uGkL: { value: new THREE.Vector4(pad, pad, 1 / (W / ppm), 1 / (H / ppm)) }, uGkT: { value: 0 },
      uGkAr: { value: new THREE.Vector3(ar ? ar.x : 0, ar ? ar.z : 0, ar ? ar.r || 11 : 11) }, uGkF: { value: 0 },
      uGkB: { value: new THREE.Vector3(0, 0, 0) } };   // (boss'un altında yumuşak temas gölgesi: x, z, yarıçap; 0 = yok)
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vGkW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGkW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = `varying vec3 vGkW; uniform sampler2D tGkA, tGkB; uniform vec4 uGkL; uniform float uGkT, uGkF; uniform vec3 uGkAr, uGkB;
        float gkH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float gkN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(gkH(i), gkH(i + vec2(1.0, 0.0)), f.x), mix(gkH(i + vec2(0.0, 1.0)), gkH(i + vec2(1.0, 1.0)), f.x), f.y); }
        vec3 gkRain(float t){ t = fract(t) * 6.0; return clamp(vec3(abs(t - 3.0) - 1.0, 2.0 - abs(t - 2.0), 2.0 - abs(t - 4.0)), 0.0, 1.0); }
        ` + sh.fragmentShader
        .replace('#include <map_fragment>', `
          vec2 gkUV = (vGkW.xz + uGkL.xy) * uGkL.zw;
          vec4 gA = texture2D(tGkA, gkUV), gB = texture2D(tGkB, gkUV);
          if (gA.a < 0.3) discard;
          vec3 gc = gA.rgb;
          gc *= 0.9 + 0.14 * gkN(vGkW.xz * 0.3) + 0.05 * gkN(vGkW.xz * 1.9);   // SADE: çimen dokusu sakin
          float gkP = smoothstep(0.3, 0.75, gB.r);
          vec2 pc = vGkW.xz * 0.9, pf = fract(pc) - 0.5;
          float cob = smoothstep(0.5, 0.3, length(pf + (vec2(gkH(floor(pc)), gkH(floor(pc) + 2.3)) - 0.5) * 0.25));
          vec3 pcol = vec3(1.0, 0.97, 0.91) * (0.95 + 0.05 * cob);   // SADE5: bulut yolu net beyaz-krem
          gc = mix(gc, pcol, gkP);
          float gkE = smoothstep(0.04, 0.26, gB.r) * (1.0 - smoothstep(0.3, 0.6, gB.r));   // SADE5: yolun kenarında yumuşak lila gölge
          gc = mix(gc, vec3(0.58, 0.48, 0.8), gkE * 0.7);
          vec2 fq = vGkW.xz * 1.05, fc = floor(fq);
          float fr = gkH(fc), gkFl = 0.0;
          if (fr > 0.84 && gB.r < 0.4 && gB.g < 0.45) {   // SADE: çiçek benekleri yalnız yürünür alanın dışında
            vec2 fo = fract(fq) - 0.5 - (vec2(gkH(fc + 3.1), gkH(fc + 5.7)) - 0.5) * 0.5; float fd = length(fo), hh = gkH(fc + 9.3);
            vec3 fcol = hh < 0.25 ? vec3(1.0, 0.6, 0.8) : hh < 0.5 ? vec3(1.0, 0.92, 0.5) : hh < 0.75 ? vec3(0.7, 0.8, 1.0) : vec3(1.0, 1.0, 1.0);
            float pet = smoothstep(0.17, 0.12, fd * (1.0 + 0.35 * cos(atan(fo.y, fo.x) * 5.0)));
            gc = mix(gc, fcol, pet); gc = mix(gc, vec3(1.0, 0.88, 0.4), smoothstep(0.055, 0.03, fd)); gkFl = pet * gB.b;
          }
          if (gB.a > 0.02) {   // arena: yerde soluk gökkuşağı halkaları
            float ad = length(vGkW.xz - uGkAr.xy) / uGkAr.z;
            // SADE: sakin ama etkileyici arena — merkezden kenara açık lavanta → pastel pembe, tek yumuşak lila kenar halkası,
            //       ortada tek soluk gökkuşağı halkası
            vec3 arC = mix(vec3(0.86, 0.8, 0.98), vec3(1.0, 0.72, 0.86), smoothstep(0.1, 0.9, ad)) * 0.96;
            float edge = smoothstep(0.05, 0.0, abs(ad - 0.84));
            arC = mix(arC, vec3(0.6, 0.48, 0.88), edge * 0.9);
            float rr = smoothstep(0.045, 0.0, abs(ad - 0.55));
            arC = mix(arC, gkRain(ad * 1.6 + 0.6) * 0.55 + 0.45, rr * 0.55);
            gc = mix(gc, arC, gB.a * smoothstep(1.06, 0.98, ad));
            gc *= 1.0 - 0.35 * uGkF * gB.a;
          }
          gc *= mix(0.6, 1.0, smoothstep(0.3, 0.85, gA.a));
          gc *= mix(0.94, 1.03, gB.g);
          gc = mix(gc, mix(vec3(0.7, 0.63, 0.86), gA.rgb * 0.92, 0.42), 0.78 * smoothstep(0.5, 0.9, gB.g) * (1.0 - gkP) * (1.0 - gB.a) * (1.0 - gkE));   // yol dışı yürünür alan biraz koyu lila: krem yol öne çıksın
          // ZEMİN: bulut pofudukluğu (yumuşak iki tonlu lekeler, ±%7) yürünen zeminde; yolda ince şeker-taş kaplama (±%6). Hareket yok.
          float gkPuf = gkN(vGkW.xz * 0.5) * 0.6 + gkN(vGkW.xz * 1.6 + 4.0) * 0.4;
          float gkCl = smoothstep(0.42, 0.68, gkN(vGkW.xz * 0.32) * 0.7 + gkN(vGkW.xz * 1.1 + 2.0) * 0.3);   // pofuduk bulut kümeleri
          gc *= mix(1.0, 0.87 + 0.13 * gkPuf + 0.12 * gkCl, (1.0 - gkP) * max(smoothstep(0.5, 0.9, gB.g), gB.a));   // ZEMİN2: ±%13, arenada tam
          gc *= mix(1.0, 0.93 + 0.1 * cob, gkP);
          if (uGkB.z > 0.01) { float bd = length(vGkW.xz - uGkB.xy) / uGkB.z; gc *= 1.0 - 0.4 * smoothstep(1.0, 0.2, bd); }   // boss temas gölgesi   // SADE: yürünen zemin sakin, açık-nötr (kirli beyaz-lila)
          diffuseColor.rgb *= gc;
          float gkStar = 0.0;
          if (gB.b > 0.05) {   // Yıldız Adası: yerde göz kırpan minik yıldız ışıltıları
            vec2 sq = vGkW.xz * 0.8, sc = floor(sq); float sh = gkH(sc + 13.7);
            if (sh > 0.9) { vec2 so = fract(sq) - 0.5 - (vec2(gkH(sc + 1.3), gkH(sc + 7.1)) - 0.5) * 0.6; float sd = length(so);
              float tw = 0.6;   // SADE: yanıp sönme yok
              gkStar = (smoothstep(0.09, 0.0, sd) + 0.6 * smoothstep(0.035, 0.0, abs(so.x) * abs(so.y) * 30.0) * smoothstep(0.25, 0.0, sd)) * tw * gB.b; }
          }`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.95, 0.75) * gkStar * 0.4 + vec3(0.6, 0.5, 0.9) * gkFl * 0.12;');
    };
    m.customProgramCacheKey = () => 'gokkusagi-ada';
    api.dispose(m);
    const geo = new THREE.PlaneGeometry(L.W + pad * 2, L.H + pad * 2); geo.rotateX(-PI / 2); geo.translate(L.W / 2, 0, L.H / 2); api.dispose(geo);
    const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; mesh.name = 'gk-ada'; mesh.position.y = -0.002;
    api.add(mesh);
    if (api.floor) api.floor.visible = false;
    return U;
  }

  // ════════ Ada kenarı: yürüyen kareler (marching squares) ile yumuşak kontur → aşağı inen katmanlı pastel kayalık ════════
  function cliffs(L, api, F) {
    const { W, H, pad, ppm, isl, T } = F, segs = [];
    const P = (i, j) => [(i + 0.5) / ppm - pad, (j + 0.5) / ppm - pad];
    const v = (i, j) => isl[j * W + i];
    const lerpP = (i0, j0, i1, j1) => { const a = v(i0, j0), b = v(i1, j1), t = (T - a) / (b - a || 1e-6), p = P(i0, j0), q = P(i1, j1); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
      const a = v(i, j) > T, b = v(i + 1, j) > T, c = v(i + 1, j + 1) > T, d = v(i, j + 1) > T, n = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (d ? 8 : 0);
      if (n === 0 || n === 15) continue;
      const eT = () => lerpP(i, j, i + 1, j), eR = () => lerpP(i + 1, j, i + 1, j + 1), eB = () => lerpP(i, j + 1, i + 1, j + 1), eL = () => lerpP(i, j, i, j + 1);
      switch (n) {
        case 1: case 14: segs.push([eL(), eT()]); break;
        case 2: case 13: segs.push([eT(), eR()]); break;
        case 3: case 12: segs.push([eL(), eR()]); break;
        case 4: case 11: segs.push([eR(), eB()]); break;
        case 6: case 9: segs.push([eT(), eB()]); break;
        case 7: case 8: segs.push([eL(), eB()]); break;
        case 5: segs.push([eL(), eT()], [eR(), eB()]); break;
        case 10: segs.push([eT(), eR()], [eB(), eL()]); break;
      }
    }
    // dış normal: alanın eğiminin tersi (her uç noktada aynı hesap → komşu parçalar birebir birleşir)
    const nrm = (x, z) => { const e = 0.5, gx = F.at(isl, x + e, z) - F.at(isl, x - e, z), gz = F.at(isl, x, z + e) - F.at(isl, x, z - e), l = hyp(gx, gz) || 1; return [-gx / l, -gz / l]; };
    // halkalar: [dış öteleme (m), y, renk sırası, normal eğimi]
    const RING = [[0, 0.0, 0, 1], [0.28, -0.22, 0, 0.6], [0.2, -0.62, 1, 0.1], [-0.5, -2.2, 2, -0.1], [-2.0, -4.6, 3, -0.4], [-4.6, -7.6, 4, -0.8]];
    const nR = RING.length, pos = [], nor = [], cols = [], c = new THREE.Color(), tmp = new THREE.Color();
    const rockC = AREA_ROCK.map(r => r.map(h => col(h))), grassC = AREA_C.map(h => col(h).multiplyScalar(0.9));
    const edgeOut = [];
    const ringPt = (p, n, k, ar, wob) => {
      const R = RING[k], off = R[0] * (k > 2 ? 1 + 0.35 * wob : 1), y = R[1] * (k > 2 ? 1 + 0.25 * wob : 1);
      pos.push(p[0] + n[0] * off, y, p[1] + n[1] * off);
      const ny = R[3], s = Math.sqrt(Math.max(0, 1 - ny * ny)); nor.push(n[0] * s, ny, n[1] * s);
      if (R[2] === 0) c.copy(grassC[ar]); else { c.copy(rockC[ar][R[2] - 1]); const st = Math.sin(y * 3.1 + p[0] * 0.15) * 0.04; c.multiplyScalar(1 + st); }
      cols.push(c.r, c.g, c.b);
    };
    for (const [p0, p1] of segs) {
      const n0 = nrm(p0[0], p0[1]), n1 = nrm(p1[0], p1[1]), ar0 = F.areaAt(p0[0] - n0[0], p0[1] - n0[1]), ar1 = F.areaAt(p1[0] - n1[0], p1[1] - n1[1]);
      const w0 = K ? K.hash(Math.round(p0[0] * 4), Math.round(p0[1] * 4)) - 0.5 : 0, w1 = K ? K.hash(Math.round(p1[0] * 4), Math.round(p1[1] * 4)) - 0.5 : 0;
      for (let k = 0; k < nR - 1; k++) {
        // iki üçgen: (p0,k) (p1,k) (p1,k+1) · (p0,k) (p1,k+1) (p0,k+1)
        ringPt(p0, n0, k, ar0, w0); ringPt(p1, n1, k, ar1, w1); ringPt(p1, n1, k + 1, ar1, w1);
        ringPt(p0, n0, k, ar0, w0); ringPt(p1, n1, k + 1, ar1, w1); ringPt(p0, n0, k + 1, ar0, w0);
      }
      edgeOut.push({ x: (p0[0] + p1[0]) / 2, z: (p0[1] + p1[1]) / 2, nx: (n0[0] + n1[0]) / 2, nz: (n0[1] + n1[1]) / 2, ar: ar0 });
    }
    // üçgen yönü: dışa bakan yüz ön yüz olsun diye DoubleSide yerine sargıyı normalle karşılaştır
    for (let t = 0; t < pos.length; t += 9) {
      const ax = pos[t], ay = pos[t + 1], az = pos[t + 2], bx = pos[t + 3] - ax, by = pos[t + 4] - ay, bz = pos[t + 5] - az, cx = pos[t + 6] - ax, cy = pos[t + 7] - ay, cz = pos[t + 8] - az;
      const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
      if (nx * nor[t] + ny * nor[t + 1] + nz * nor[t + 2] < 0) for (let q = 0; q < 3; q++) { const i1 = t + 3 + q, i2 = t + 6 + q; [pos[i1], pos[i2]] = [pos[i2], pos[i1]]; [nor[i1], nor[i2]] = [nor[i2], nor[i1]]; [cols[i1], cols[i2]] = [cols[i2], cols[i1]]; }
    }
    void tmp;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.computeBoundingSphere(); api.dispose(g);
    const m = new THREE.Mesh(g, mat('cliff')); m.receiveShadow = true; m.name = 'gk-kayalik'; api.add(m);
    return edgeOut;
  }

  // ════════ Gökkuşağı köprüleri: koridorların ada dışında kalan kısımları ════════
  function bridges(L, api, F) {
    const pos = [], nor = [], cols = [], c = new THREE.Color(), RC = [0xff5a7e, 0xff9440, 0xffd84a, 0x5cd67c, 0x4ab4ff, 0x7a6cff, 0xc77cff].map(h => col(h)), ends = [];   // SADE5: doygun köprü renkleri
    const quad = (a, b, cc, d, n, colr) => { for (const p of [a, b, cc, a, cc, d]) { pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); cols.push(colr.r, colr.g, colr.b); } };
    const white = col(0xffffff), under = col(0xf4e8ff);
    for (const l of L.links || []) {
      if (!l.curve || l.curve.length < 3) continue;
      const pts = l.curve, n = pts.length, out = pts.map(p => F.at(F.isl, p[0], p[1]) < 0.62);
      // ada dışındaki koşular (iki uçtan 1,6 m adaya taşar)
      const ext = Math.ceil(1.6 / 0.35);
      let k = 0;
      while (k < n) {
        if (!out[k]) { k++; continue; }
        let e = k; while (e < n && out[e]) e++;
        const s0 = Math.max(0, k - ext), s1 = Math.min(n - 1, e - 1 + ext);
        if (s1 - s0 >= 2) {
          const hw = (l.w || 1.9) + 0.6, run = pts.slice(s0, s1 + 1);
          ends.push({ x: run[0][0], z: run[0][1] }, { x: run[run.length - 1][0], z: run[run.length - 1][1] });
          for (let q = 0; q < run.length - 1; q++) {
            const a = run[q], b = run[q + 1], pa = run[Math.max(0, q - 1)], pb = run[Math.min(run.length - 1, q + 2)];
            const ta = [b[0] - pa[0], b[1] - pa[1]], tb = [pb[0] - a[0], pb[1] - a[1]], la = hyp(...ta) || 1, lb = hyp(...tb) || 1;
            const na = [-ta[1] / la, ta[0] / la], nb = [-tb[1] / lb, tb[0] / lb];
            const ya = 0.035, yb = 0.035;
            for (let s = 0; s < 7; s++) {
              const u0 = -hw + (2 * hw) * s / 7, u1 = -hw + (2 * hw) * (s + 1) / 7;
              const A0 = [a[0] + na[0] * u0, ya, a[1] + na[1] * u0], A1 = [a[0] + na[0] * u1, ya, a[1] + na[1] * u1];
              const B0 = [b[0] + nb[0] * u0, yb, b[1] + nb[1] * u0], B1 = [b[0] + nb[0] * u1, yb, b[1] + nb[1] * u1];
              c.copy(RC[s]).lerp(white, 0.12); if (s === 0 || s === 6) c.multiplyScalar(0.86);   // SADE5: köprü şeritleri doygun, dış şeritler koyu kenar   // SADE: köprü şeritleri pastel, düz (karakterler üstünde net seçilsin)
              quad(A0, B0, B1, A1, [0, 1, 0], c);
            }
            // yan yüzler (beyaz bulut kenar) + alt yüz
            for (const sd of [-1, 1]) {
              const ea = [a[0] + na[0] * hw * sd, a[1] + na[1] * hw * sd], eb = [b[0] + nb[0] * hw * sd, b[1] + nb[1] * hw * sd];
              quad([ea[0], ya, ea[1]], [eb[0], yb, eb[1]], [eb[0], -0.42, eb[1]], [ea[0], -0.42, ea[1]], [na[0] * sd, 0, na[1] * sd], white);
            }
            quad([a[0] - na[0] * hw, -0.42, a[1] - na[1] * hw], [b[0] - nb[0] * hw, -0.42, b[1] - nb[1] * hw], [b[0] + nb[0] * hw, -0.42, b[1] + nb[1] * hw], [a[0] + na[0] * hw, -0.42, a[1] + na[1] * hw], [0, -1, 0], under);
            // korkuluk incileri (yürünür alanın dışında, her ~1,4 m)
            if (q % 4 === 0) for (const sd of [-1, 1]) {
              const x = a[0] + na[0] * (hw + 0.18) * sd, z = a[1] + na[1] * (hw + 0.18) * sd;
              api.put(G.cyl(1, 1, 8), x, 0.2, z, 0.05, 0.4, 0.05, 0xffffff);
              api.put(G.sphere(10, 8), x, 0.46, z, 0.16, 0.16, 0.16, RAINBOW[(q / 4 + (sd > 0 ? 3 : 0)) % 7], 0, 0, 0, 'glow');
            }
          }
        }
        k = e;
      }
    }
    if (!pos.length) return ends;
    // sarım düzeltmesi (üst yüz yukarı baksın)
    for (let t = 0; t < pos.length; t += 9) {
      const ax = pos[t], ay = pos[t + 1], az = pos[t + 2], bx = pos[t + 3] - ax, by = pos[t + 4] - ay, bz = pos[t + 5] - az, cx = pos[t + 6] - ax, cy = pos[t + 7] - ay, cz = pos[t + 8] - az;
      const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
      if (nx * nor[t] + ny * nor[t + 1] + nz * nor[t + 2] < 0) for (let q = 0; q < 3; q++) { const i1 = t + 3 + q, i2 = t + 6 + q; [pos[i1], pos[i2]] = [pos[i2], pos[i1]]; [nor[i1], nor[i2]] = [nor[i2], nor[i1]]; [cols[i1], cols[i2]] = [cols[i2], cols[i1]]; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.computeBoundingSphere(); api.dispose(g);
    const m = new THREE.Mesh(g, mat('bridge')); m.receiveShadow = true; m.name = 'gk-kopru'; api.add(m);
    return ends;
  }

  // ════════ Pofuduk bulutlar: tek InstancedMesh (adaların altı, köprü uçları, kıyı çalıları, boşlukta yüzenler) ════════
  function puffs(api, list) {
    if (!list.length) return null;
    const geo = kg('puffGeo', () => new THREE.SphereGeometry(1, 11, 7));   // (yumuşak, az üçgenli: ~700 örnek)
    const im = new THREE.InstancedMesh(geo, mat('puff'), list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const cc = new THREE.Color();
    list.forEach((o, i) => {
      e.set(0, o.yaw || 0, 0); q.setFromEuler(e); p.set(o.x, o.y, o.z); s.set(o.sx, o.sy, o.sz);
      m4.compose(p, q, s); im.setMatrixAt(i, m4); cc.set(o.c || 0xffffff); im.setColorAt(i, cc);
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.receiveShadow = true; im.castShadow = false; im.name = 'gk-bulut'; im.frustumCulled = false;
    api.add(im);
    return im;
  }

  // ════════ Bulut denizi: iki katman (alttaki durgun, üstteki yarı saydam ve yavaşça kayar) ════════
  function cloudSea(L, api) {
    const t = seaTex(), w = L.W + 420, h = L.H + 420;
    const g = new THREE.PlaneGeometry(w, h); g.rotateX(-PI / 2); api.dispose(g);
    const m0 = new THREE.MeshBasicMaterial({ map: t, color: 0xa9a2e6 }); api.dispose(m0);
    const tl = t.clone(); tl.needsUpdate = true; tl.repeat.set(w / 60, h / 60); api.dispose(tl); m0.map = tl;
    const sea = new THREE.Mesh(g, m0); sea.position.set(L.W / 2, -17, L.H / 2); sea.name = 'gk-deniz'; api.add(sea);
    const t2 = t.clone(); t2.needsUpdate = true; t2.repeat.set(w / 44, h / 44); api.dispose(t2);
    const m1 = new THREE.MeshBasicMaterial({ map: t2, color: 0xf4eaff, transparent: true, opacity: 0.42, depthWrite: false }); api.dispose(m1);
    const top = new THREE.Mesh(g, m1); top.position.set(L.W / 2, -9.5, L.H / 2); top.renderOrder = 1; top.name = 'gk-deniz2'; api.add(top);
    api.anim(dt => { t2.offset.x += dt * 0.004; t2.offset.y += dt * 0.0015; tl.offset.x -= dt * 0.0015; });
  }

  // ════════ Parçacıklar ════════
  function pointsMat(key, o) {
    if (M[key]) return M[key];
    return (M[key] = keep(new THREE.PointsMaterial(Object.assign({ map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true }, o))));
  }
  // Feza'nın çevresinde süzülen pastel parıltılar
  function motes(api) {
    const n = 32, W = 36, D = 30, Hh = 7, pos = new Float32Array(n * 3), cl = new Float32Array(n * 3), sd = [];
    for (let i = 0; i < n; i++) { sd.push({ x: Math.random() * W, y: Math.random() * Hh, z: Math.random() * D, s: 0.3 + Math.random() * 0.6, w: Math.random() * TAU }); const c = col(RAINBOW[i % 7]).lerp(col(0xffffff), 0.45).multiplyScalar(1.4); cl.set([c.r, c.g, c.b], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); api.dispose(g);
    const p = new THREE.Points(g, pointsMat('gkMote', { size: 0.26, blending: THREE.AdditiveBlending, fog: false })); p.frustumCulled = false; p.renderOrder = 4; api.add(p);
    let t = 0;
    api.anim((dt, fx, fz) => {
      t += dt; const ox = fx - W / 2, oz = fz - D * 0.62;
      for (let i = 0; i < n; i++) { const s = sd[i]; s.y += dt * 0.25 * s.s; if (s.y > Hh) s.y -= Hh;
        pos[i * 3] = ox + (((s.x - ox + Math.sin(t * 0.5 + s.w) * 0.8) % W) + W) % W; pos[i * 3 + 1] = 0.3 + s.y; pos[i * 3 + 2] = oz + (((s.z - oz) % D) + D) % D; }
      g.attributes.position.needsUpdate = true;
    });
  }
  // Bulut şelaleleri: kıyıdan aşağı dökülen pofuduk bulut akıntısı (tek Points)
  function cloudFalls(api, spots) {
    if (!spots.length) return;
    const per = 14, n = spots.length * per, pos = new Float32Array(n * 3), cl = new Float32Array(n * 3), sd = [];
    for (let i = 0; i < n; i++) { const sp = spots[(i / per) | 0]; sd.push({ sp, u: Math.random(), o: (Math.random() - 0.5) * 2.6, k: 0.7 + Math.random() * 0.5 }); const c = col(i % 3 ? 0xffffff : 0xffe4f4); cl.set([c.r, c.g, c.b], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); api.dispose(g);
    const p = new THREE.Points(g, pointsMat('gkFall', { size: 1.7, opacity: 0.75 })); p.frustumCulled = false; p.renderOrder = 2; api.add(p);
    api.anim((dt, fx, fz) => {
      for (let i = 0; i < n; i++) {
        const s = sd[i], sp = s.sp; s.u += dt * 0.16 * s.k; if (s.u > 1) s.u -= 1;
        const u = s.u, out = 0.4 + u * 1.2 + u * u * 1.5, y = -0.2 - u * u * 11 - u * 1.5;
        pos[i * 3] = sp.x + sp.nx * out + sp.tx * s.o * (1 + u); pos[i * 3 + 1] = y; pos[i * 3 + 2] = sp.z + sp.nz * out + sp.tz * s.o * (1 + u);
      }
      g.attributes.position.needsUpdate = true;
      void fx; void fz;
    });
  }
  // Yağmur Adası'nın küçük yağmur bulutlarından düşen damlalar
  function rainDrops(api, clouds) {
    if (!clouds.length) return;
    const per = 24, n = clouds.length * per, pos = new Float32Array(n * 3), cl = new Float32Array(n * 3), sd = [];
for (let i = 0; i < n; i++) { sd.push({ c: clouds[(i / per) | 0], x: (Math.random() - 0.5) * 2.4, z: (Math.random() - 0.5) * 1.4, y: Math.random() }); const c = col(0x9fdcff, 1.2); cl.set([c.r, c.g, c.b], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); api.dispose(g);
    const p = new THREE.Points(g, pointsMat('gkRain', { size: 0.16, opacity: 0.9 })); p.frustumCulled = false; p.renderOrder = 3; api.add(p);
    api.anim(dt => {
      for (let i = 0; i < n; i++) { const s = sd[i]; s.y -= dt * 1.1; if (s.y < 0) s.y += 1; const c = s.c;
        pos[i * 3] = c.x + s.x; pos[i * 3 + 1] = (c.rain || 0) > 0.5 ? c.y - 0.4 - (1 - s.y) * (c.y - 0.4) : -60; pos[i * 3 + 2] = c.z + s.z; }
      g.attributes.position.needsUpdate = true;
    });
  }
  // Yıldız Adası'nın altında göz kırpan yıldızlı gök
  function starField(api, box) {
    const n = 80, pos = new Float32Array(n * 3), cl = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = box.x0 - 8 + Math.random() * (box.x1 - box.x0 + 16); pos[i * 3 + 1] = -3 - Math.random() * 9; pos[i * 3 + 2] = box.z0 - 8 + Math.random() * (box.z1 - box.z0 + 16);
      const c = col(i % 4 ? 0xfff6d0 : 0xd8c8ff, 1.6); cl.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); api.dispose(g);
    const m = new THREE.PointsMaterial({ map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, size: 0.55, blending: THREE.AdditiveBlending, fog: false }); api.dispose(m);
    const p = new THREE.Points(g, m); p.renderOrder = 1; api.add(p);
    m.opacity = 0.75;   // SADE: sabit, göz kırpmayan yıldızlar (her kare iş yok)
  }

  // ════════ Süs modelleri (paylaşılan geometriler; api.put ile birleşir) ════════
  const flowerGeo = i => kg('gkFlower' + (i % 4), () => {   // pastel bulut çiçeği: sap, 5 yaprak, sarı göbek
    const k = new Kit(), pc = [0xff9ac8, 0xffe27a, 0xa8c8ff, 0xffffff][i % 4];
    k.seg([0, 0, 0], [0, 0.5, 0], 0.035, 0x7cc98a);
    for (let p = 0; p < 5; p++) { const a = p * TAU / 5; k.add(G.sphere(10, 7), pc, [Math.sin(a) * 0.13, 0.52, Math.cos(a) * 0.13], [0, a, 0], [0.12, 0.05, 0.08]); }
    k.add(G.sphere(8, 6), 0xffd23a, [0, 0.54, 0], null, [0.07, 0.05, 0.07]);
    k.add(G.sphere(8, 6), 0x8fd49a, [0.08, 0.2, 0], [0, 0, -0.6], [0.12, 0.03, 0.06]);
    return k.build();
  });
  // bulut ağacı: kıvrık pastel gövde + pofuduk bulut taç (pembe / nane / lila), tepede yıldız
  const cloudTreeGeo = i => kg('gkTree' + (i % 3), () => {
    const k = new Kit(), crown = [[0xffd6ec, 0xffffff], [0xd2f6e2, 0xffffff], [0xe2d6ff, 0xfff4fb]][i % 3];
    k.seg([0, 0, 0], [0.15, 1.3, 0.05], 0.2, 0xf6e2d0, 0.15, 10); k.seg([0.15, 1.3, 0.05], [-0.05, 2.4, 0], 0.15, 0xf6e2d0, 0.12, 10);
    for (let q = 0; q < 3; q++) k.add(G.torus(TAU, 0.3, 14), RAINBOW[(i * 2 + q) % 7], [0.06, 0.6 + q * 0.55, 0.03], [PI / 2, 0, 0], [0.19, 0.19, 0.19]);
    [[0, 2.9, 0, 1.0], [0.75, 2.6, 0.15, 0.7], [-0.7, 2.65, -0.1, 0.72], [0.2, 3.45, -0.15, 0.7], [-0.3, 3.3, 0.35, 0.62], [0.45, 3.1, 0.55, 0.55]]
      .forEach(([x, y, z, r], q) => k.add(G.sphere(14, 10), q % 2 ? crown[1] : crown[0], [x, y, z], null, [r, r * 0.85, r]));
    for (let p = 0; p < 5; p++) { const a = p * TAU / 5; k.add(G.cone(6), 0xffe36e, [0.2 + Math.sin(a) * 0.16, 4.05 + Math.cos(a) * 0.16, -0.15], [0, 0, -a], [0.08, 0.2, 0.05]); }
    k.add(G.sphere(8, 6), 0xffe36e, [0.2, 4.05, -0.15], null, [0.1, 0.1, 0.07]);
    return k.build();
  });
  // pamuk çalısı: ince saplarda pofuduk pamuk topları
  const cottonGeo = i => kg('gkCotton' + (i % 2), () => {
    const k = new Kit(), c = i % 2 ? 0xffe8f4 : 0xffffff;
    for (let q = 0; q < 6; q++) { const a = q * 1.1, r = 0.15 + (q % 3) * 0.1, h = 0.35 + (q % 3) * 0.17, x = Math.sin(a) * r, z = Math.cos(a) * r;
      k.seg([x * 0.3, 0, z * 0.3], [x, h, z], 0.022, 0x9fd8a8); k.add(G.sphere(10, 8), c, [x, h + 0.08, z], null, [0.16, 0.14, 0.16]); }
    k.add(G.sphere(10, 8), 0x9fd8a8, [0, 0.06, 0], null, [0.3, 0.08, 0.3]);
    return k.build();
  });
  // yıldız çiçeği: sapın ucunda parlayan beş köşeli yıldız
  const starFlowerGeo = i => kg('gkStarFl' + (i % 3), () => {
    const k = new Kit(), c = [0xffe36e, 0xffb0dc, 0xc8b8ff][i % 3];
    k.seg([0, 0, 0], [0.04, 0.6, 0], 0.025, 0x86d49a);
    k.add(G.sphere(8, 6), 0x86d49a, [0.08, 0.25, 0], [0, 0, -0.6], [0.1, 0.025, 0.05]);
    for (let p = 0; p < 5; p++) { const a = p * TAU / 5; k.add(G.cone(6), c, [0.04 + Math.sin(a) * 0.09, 0.72 + Math.cos(a) * 0.09, 0], [0, 0, -a], [0.06, 0.13, 0.035]); }
    k.add(G.sphere(8, 6), 0xffffff, [0.04, 0.72, 0.01], null, [0.06, 0.06, 0.04]);
    return k.build();
  });
  // küçük gökkuşağı yayı (tek ağ: 7 bant, yarıçap 1)
  const miniRainbowGeo = () => kg('gkMiniRb', () => {
    const k = new Kit();
    for (let q = 0; q < 7; q++) { const r = 1 - q * 0.085; k.add(new THREE.TorusGeometry(r, 0.045, 6, 28, PI), RAINBOW[q], [0, 0, 0]); }
    return k.build();
  });
  const crystalGeo = () => kg('gkCrystal', () => {   // yıldız kristali kümesi
    const k = new Kit();
    [[0, 0, 0, 1.4, 0], [0.4, 0, 0.2, 0.9, 0.4], [-0.35, 0, 0.1, 1.0, -0.35], [0.1, 0, -0.35, 0.8, 0.2]].forEach(([x, y, z, h, tl], i) => {
      k.add(G.octa(), [0xe8dcff, 0xfff0c0, 0xd0e4ff, 0xffd8f0][i], [x, y + h * 0.5, z], [tl * 0.4, i, tl], [0.22 * h, h * 0.6, 0.22 * h]);
    });
    return k.build();
  });
  const starGiftGeo = () => kg('gkStarGift', () => {   // gizli hazine: kurdeleli yıldız kutusu
    const k = new Kit(), b = G.rbox(2);
    k.add(b, 0xb69cff, [0, 0.45, 0], null, [0.9, 0.9, 0.9]); k.add(G.box(), 0xffe36e, [0, 0.46, 0], null, [0.2, 0.92, 0.92]); k.add(G.box(), 0xffe36e, [0, 0.46, 0], null, [0.92, 0.92, 0.2]);
    for (let p = 0; p < 5; p++) { const a = p * TAU / 5; k.add(G.cone(6), 0xffe36e, [Math.sin(a) * 0.16, 1.05 + Math.cos(a) * 0.16, 0], [0, 0, -a], [0.1, 0.22, 0.06]); }
    k.add(G.sphere(10, 8), 0xffe36e, [0, 1.05, 0], null, [0.12, 0.12, 0.08]);
    return k.build();
  });
  // pastel bulut kalesi (uzakta, bulut tabanının üstünde): kuleler, konik çatılar, parlak pencereler, bayraklar
  function castle(api, x, z, s, pal, rnd) {
    const y0 = -2.5;
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9, r = 4.2 * s; api.put(G.ico ? G.ico(2) : G.sphere(), x + Math.sin(a) * r, y0 + 0.4, z + Math.cos(a) * r * 0.7, 2.6 * s, 1.5 * s, 2.2 * s, 0xffffff); }
    api.put(G.sphere(18, 12), x, y0 + 0.2, z, 4.4 * s, 1.6 * s, 3.4 * s, 0xfff4fb);
    const tower = (tx, tz, r, h, roof) => {
      api.put(G.cyl(1, 1.05, 18), tx, y0 + h / 2, tz, r, h, r, pal[0]);
      api.put(G.torus(TAU, 0.18, 18), tx, y0 + h, tz, r * 1.05, r * 1.05, r * 1.05, pal[1], 0, PI / 2);
      api.put(G.cone(18), tx, y0 + h + r * 1.1, tz, r * 1.2, r * 2.2, r * 1.2, roof);
      api.put(G.sphere(10, 8), tx, y0 + h + r * 2.3, tz, r * 0.2, r * 0.2, r * 0.2, 0xffe36e, 0, 0, 0, 'glow');
      api.put(G.cone(4), tx + r * 0.35, y0 + h + r * 2.55, tz, r * 0.04, r * 0.5, r * 0.3, RAINBOW[(rnd() * 7) | 0], PI / 2, 0, PI / 2);
      for (let w = 0; w < 3; w++) { const wy = y0 + h * (0.35 + w * 0.22); api.put(G.sphere(10, 8), tx, wy, tz + r * 0.96, r * 0.2, r * 0.3, 0.05, 0xfff2b0, 0, 0, 0, 'glow'); }
    };
    tower(x, z, 1.6 * s, 9 * s, pal[2]);
    tower(x - 3.1 * s, z + 0.6 * s, 1.0 * s, 6 * s, pal[3]);
    tower(x + 3.1 * s, z + 0.4 * s, 1.1 * s, 6.8 * s, pal[3]);
    tower(x - 1.6 * s, z - 2 * s, 0.8 * s, 11 * s, pal[2]);
    api.box(x, y0 + 2.2 * s, z + 0.8 * s, 5.6 * s, 4.4 * s, 1.4 * s, pal[0]);
    api.put(G.cyl(1, 1, 16, false), x, y0 + 1.4 * s, z + 1.52 * s, 0.9 * s, 0.05, 0.9 * s, 0xb98cd8, 0, PI / 2);
    for (let i = -2; i <= 2; i++) api.box(x + i * 1.1 * s, y0 + 4.6 * s, z + 0.8 * s, 0.6 * s, 0.6 * s, 1.4 * s, pal[1]);
  }
  // dev gökkuşağı yayı (boşlukta, ayakları bulutta)
  function bigRainbow(api, x, y, z, R, yaw) {
    for (let i = 0; i < 7; i++) {
      const r = R - i * 0.75, tube = 0.4 / r;
      api.put(G.torus(PI, tube, 56), x, y, z, r, r, r, RAINBOW[i], yaw, 0, 0, 'glow');
    }
  }
  // sıcak hava balonu (hareketli; çizgili zarf + sepet + ipler)
  const balloonGeo = i => kg('gkBalloon' + (i % 3), () => {
    const k = new Kit(), pal = [[0xff9ac8, 0xfff2b0], [0x8fd0ff, 0xffffff], [0xc6a8ff, 0xffd6a0]][i % 3];
    const env = new THREE.SphereGeometry(1, 24, 18); env.scale(1.5, 1.75, 1.5);
    k.add(env, (x, y, z) => col(((Math.atan2(z, x) / TAU * 10 + 10) | 0) % 2 ? pal[0] : pal[1]), [0, 3.2, 0]);
    k.add(G.cone(16), pal[0], [0, 1.25, 0], [PI, 0, 0], [0.75, 0.9, 0.75]);
    k.add(G.rbox(2), 0xc8945c, [0, 0.25, 0], null, [0.7, 0.5, 0.7]);
    k.add(G.torus(TAU, 0.12, 16), 0x9a6a3c, [0, 0.5, 0], [PI / 2, 0, 0], [0.38, 0.38, 0.38]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.seg([sx * 0.3, 0.5, sz * 0.3], [sx * 0.55, 1.4, sz * 0.55], 0.02, 0x8a6a4a);
    return k.build();
  });
  // rüzgâr çanı: direk + kol (birleşik süs) ve sallanan çan demeti (ayrı ağ)
  const chimeGeo = () => kg('gkChime', () => {
    const k = new Kit();
    k.add(G.cyl(1, 1, 20), 0xfff4fb, [0, 0, 0], null, [0.42, 0.08, 0.42]);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6, l = 0.7 + (i % 3) * 0.22; k.add(G.cyl(1, 1, 10), RAINBOW[i], [Math.sin(a) * 0.3, -0.25 - l / 2, Math.cos(a) * 0.3], null, [0.055, l, 0.055]); k.seg([Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3], [Math.sin(a) * 0.3, -0.25, Math.cos(a) * 0.3], 0.008, 0xffffff); }
    k.seg([0, 0, 0], [0, -0.9, 0], 0.01, 0xffffff); k.add(G.sphere(10, 8), 0xffe36e, [0, -0.95, 0], null, [0.1, 0.1, 0.1]);
    k.add(G.cone(4), 0xffc6e0, [0, -1.45, 0], [PI, PI / 4, 0], [0.18, 0.4, 0.04]);
    return k.build();
  });
  // pofuduk bulut (oyuncak: zıplatan bulut) — tek ağ
  const bounceGeo = () => kg('gkBounce', () => {
    const k = new Kit();
    [[0, 0.35, 0, 1.2], [0.85, 0.3, 0.1, 0.8], [-0.85, 0.3, -0.05, 0.85], [0.3, 0.55, -0.45, 0.75], [-0.3, 0.5, 0.45, 0.7]].forEach(([x, y, z, r], i) => k.add(G.ico(2), i % 2 ? 0xffffff : 0xfff0fa, [x, y, z], null, [r, r * 0.6, r]));
    for (const sd of [-1, 1]) { k.add(G.sphere(10, 8), 0x3a2a4a, [sd * 0.3, 0.6, 1.0], null, [0.12, 0.16, 0.06]); k.add(G.sphere(8, 6), 0xffffff, [sd * 0.3 - 0.04, 0.66, 1.05], null, [0.04, 0.05, 0.02]); }
    k.add(G.torus(PI, 0.25, 12), 0x3a2a4a, [0, 0.47, 0.98], [0, 0, PI], [0.16, 0.12, 0.1]);
    for (const sd of [-1, 1]) k.add(G.sphere(10, 8), 0xff9ac8, [sd * 0.55, 0.48, 0.9], null, [0.12, 0.07, 0.04]);
    return k.build();
  });
  const rainCloudGeo = () => kg('gkRainCloud', () => {
    const k = new Kit();
    [[0, 0, 0, 1.0], [0.8, -0.1, 0, 0.75], [-0.8, -0.1, 0.05, 0.8], [0.3, 0.35, -0.1, 0.7], [-0.35, 0.3, 0.1, 0.65]].forEach(([x, y, z, r], i) => k.add(G.ico(2), i % 2 ? 0xdfe8f6 : 0xeef2fb, [x, y, z], null, [r, r * 0.75, r * 0.85]));
    for (const sd of [-1, 1]) k.add(G.sphere(10, 8), 0x3a3a5a, [sd * 0.3, 0.05, 0.82], null, [0.07, 0.09, 0.04]);
    k.add(G.torus(PI, 0.25, 12), 0x3a3a5a, [0, -0.12, 0.85], [0, 0, PI], [0.13, 0.09, 0.08]);
    return k.build();
  });

  // ── yardımcılar ──
  const bbox = (L, ids, m = 0) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const i of ids) { const r = L.rooms[i]; if (!r) continue; const e = (r.r || 6) + m; x0 = Math.min(x0, r.x - e); x1 = Math.max(x1, r.x + e); z0 = Math.min(z0, r.z - e); z1 = Math.max(z1, r.z + e); } return { x0, x1, z0, z1 }; };
  const say = (k, p) => { if (K) K.say(k, p); };
  const sfx = (n, o) => { if (K) K.sfx(n, o); };
  const burst = (k, x, y, z, o) => { if (K) K.burst(k, x, y, z, o); };
  const hasLine = k => typeof AUD !== 'undefined' && AUD && AUD.LINES && !!AUD.LINES[k];
  const sayIf = (k, p = 2) => { if (hasLine(k)) say(k, p); };

  // ════════ Yerleşim (saf veri) ════════
  const PER_AREA = [['yagmurDamlacigi', 'ruzgarBalonu'], ['yagmurDamlacigi', 'simsekcik', 'ruzgarBalonu'], ['simsekcik', 'ruzgarBalonu', 'doluPofudugu'], ['doluPofudugu', 'simsekcik', 'yagmurDamlacigi', 'ruzgarBalonu']];
  function yerlesim(L, api) {
    if (K) { K.gentle(L, PER_AREA, 3); K.extraChests(L, api); }
    for (const sp of L.spawns) if (!api.circleFree(sp.x, sp.z, 1.0)) { const q = api.randomFloorNear(sp.x, sp.z, 0.5, 4); if (q && api.circleFree(q.x, q.z, 1.0)) { sp.x = q.x; sp.z = q.z; } }
    // final: kristal (boss neşelenince) arenanın kuzeyinde
    const ar = (L.rooms.find(r => r.kind === 'boss') || L.rooms[L.rooms.length - 1]);
    if (ar && ar.kind === 'boss') L.crystalSpot = { x: ar.x, z: ar.z - Math.min(5, (ar.r || 11) * 0.45) };
    // zıplatan bulutlar ve rüzgâr çanları için yerler (yolun kenarında, sandıklardan uzak)
    const A = L.areas || [], used = [], gk = L.gk = { bounce: [], chimes: [], gifts: [], rain: [] };
    const okAt = (x, z, r) => api.circleFree(x, z, r) && !(L.chests || []).some(c => hyp(c.x - x, c.z - z) < 2.6) && !(L.checkpoints || []).some(c => hyp(c.x - x, c.z - z) < 4)
      && !L.spawns.some(s => hyp(s.x - x, s.z - z) < 2.5) && hyp(x - L.start.x, z - L.start.z) > 5 && !used.some(u => hyp(u.x - x, u.z - z) < 5)
      && !(L.path || []).some(p => hyp(p.x - x, p.z - z) < 1.8);
    const spotIn = (rm, k0 = 0.45, north = false) => { for (let t = 0; t < 40; t++) { const a = north ? PI + (api.rnd() - 0.5) * 1.5 : api.rnd() * TAU, d = (rm.r || 6) * (k0 + api.rnd() * 0.3), x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d; if (okAt(x, z, 1.7)) { used.push({ x, z }); return { x, z }; } } return null; };
    A.forEach((a, k) => {
      if (a.boss) return;
      const main = a.rooms.filter(i => L.rooms[i] && L.rooms[i].kind !== 'side'), side = a.rooms.filter(i => L.rooms[i] && L.rooms[i].kind === 'side');
      if (k === 0 || k === 2) for (const ri of main.slice(0, k === 0 ? 2 : 1)) { const p = spotIn(L.rooms[ri]); if (p) gk.bounce.push(p); }
      if (k >= 1) { const p = spotIn(L.rooms[main[main.length - 1]], 0.55, true); if (p) gk.chimes.push(p); }   // (uzun direk: yalnız kuzey yarıda, kamerayı kapatmasın)
      for (const ri of side) { const rm = L.rooms[ri]; let p = spotIn(rm, 0.1); if (!p) for (let t = 0; t < 12 && !p; t++) { const q = api.randomFloorNear(rm.x, rm.z, 2.2, Math.max(2.6, (rm.r || 4) * 0.8)); if (q && api.circleFree(q.x, q.z, 0.7) && !(L.chests || []).some(c => hyp(c.x - q.x, c.z - q.z) < 2)) p = q; } if (p) gk.gifts.push(p); }
      if (k === 3) { const p = spotIn(L.rooms[main[0]]); if (p) gk.bounce.push(p); }   // Yıldız Adası'nda da bir zıplatan bulut
      if (k === 1) for (const ri of main) gk.rain.push(ri);
    });
  }

  // ════════ Görsel kurulum (üreteç: yield'ler ayrı karelere düşer) ════════
  const S = { U: null, fir: 0, firT: 0, fest: null, puddles: [], par: null, parList: [] };
  const GIZLI = { gk_hediye: ['Yıldız Hediyesi', '🎁'], gk_can: ['Rüzgâr Çanı Ezgisi', '🎐'], gk_bulut: ['Zıplatan Bulut', '☁️'] };
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
  // SADE6: su birikintisi düz mavi leke gibi okunmasın → koyu mavi kenar, açık iç, iki parlak yansıma (belli ki su)
  function puddleLook(api, x, z, rx, rz, col) {
    api.put(G.cyl(1, 1, 24), x, 0.012, z, rx, 0.02, rz, col, 0, 0, 0, 'glow');
    api.put(G.torus(TAU, 0.07, 28), x, 0.03, z, rx, rz, 1, 0x4f9ee0, 0, PI / 2, 0);
    api.put(G.sphere(10, 6), x - rx * 0.35, 0.035, z - rz * 0.3, rx * 0.22, 0.01, rz * 0.09, 0xffffff, 0.4, 0, 0, 'glow');
    api.put(G.sphere(10, 6), x - rx * 0.05, 0.035, z - rz * 0.45, rx * 0.1, 0.01, rz * 0.06, 0xffffff, 0.4, 0, 0, 'glow');
  }
  function* kur(L, api) {
    api = sadeApi(api);
    if (K) K.lowShadow(api, 99);   // SADE: süsler gölge düşürmez (üçgen bütçesi)
    try { if (typeof HUB !== 'undefined' && HUB && HUB.GIZLI) HUB.GIZLI.gokkusagi = Object.assign(HUB.GIZLI.gokkusagi || {}, GIZLI); } catch (e) { /* albüm yok */ }
    const rnd = api.rnd, A = L.areas || [], gk = L.gk || { bounce: [], chimes: [], gifts: [], rain: [] };
    S.fir = 0; S.firT = 0; S.fest = null; S.puddles = []; S.par = null; S.parList = [];
    const F = field(L);
    yield;
    S.U = islandTop(L, api, F);
    yield;
    const edges = cliffs(L, api, F);
    yield;
    const ends = bridges(L, api, F);
    cloudSea(L, api);
    yield;
    // ── pofuduk bulutlar: adaların altında, köprü uçlarında, boşlukta ──
    const pl = [];
    edges.forEach((e, i) => {
      if (i % 9 === 0) { const s = 1.8 + rnd() * 1.6; pl.push({ x: e.x - e.nx * 2.2, y: -5.5 - rnd() * 2.5, z: e.z - e.nz * 2.2, sx: s * 1.3, sy: s * 0.8, sz: s, c: rnd() < 0.5 ? 0xffffff : 0xffeef8, yaw: rnd() * TAU }); }
      if (i % 14 === 3 && e.nz > -0.3) { const s = 0.9 + rnd() * 0.7; pl.push({ x: e.x + e.nx * 0.9, y: -1.2 - rnd() * 0.8, z: e.z + e.nz * 0.9, sx: s * 1.2, sy: s * 0.65, sz: s, c: 0xffffff, yaw: rnd() * TAU }); }
    });
    for (const e of ends) for (let k = 0; k < 4; k++) { const a = rnd() * TAU; pl.push({ x: e.x + Math.sin(a) * 1.5, y: -0.55 + rnd() * 0.2, z: e.z + Math.cos(a) * 1.5, sx: 1.1, sy: 0.55, sz: 0.9, c: 0xffffff, yaw: a }); }
    const all = bbox(L, L.rooms.map((_, i) => i), 6);
    for (let k = 0; k < 60; k++) {   // boşlukta yüzen bulut kümeleri (adaların üstüne binmesin)
      const x = all.x0 - 25 + rnd() * (all.x1 - all.x0 + 50), z = all.z0 - 30 + rnd() * (all.z1 - all.z0 + 50);
      if (F.at(F.isl, x, z) > 0.01 || F.at(F.walk, x, z) > 0.01) continue;
      const s = 1.5 + rnd() * 2.5, y = -6 - rnd() * 3;
      for (let q = 0; q < 3; q++) pl.push({ x: x + (q - 1) * s * 1.1, y: y + (q === 1 ? s * 0.25 : 0), z: z + (rnd() - 0.5) * s, sx: s * (q === 1 ? 1.2 : 0.9), sy: s * 0.6, sz: s, c: q === 1 ? 0xffffff : 0xfff0fa, yaw: rnd() * TAU });
    }
    puffs(api, pl);
    yield;
    // ── kıyı süsleri: ada kenarı ile yürünür alan arasında çiçekler, bulut çalıları, kristaller ──
    const inBand = (x, z) => F.at(F.isl, x, z) > 0.45 && F.at(F.walk, x, z) < 0.25;
    edges.forEach((e, i) => {
      if (i % 3) return;
      const x = e.x - e.nx * 0.55, z = e.z - e.nz * 0.55;
      if (!inBand(x, z)) return;
      const ar = e.ar, low = e.nz > 0.4;   // güney kıyısı (kameranın önü): alçak
      if (ar === 3 && i % 12 === 0 && !low) api.put(crystalGeo(), x, 0, z, 0.8 + rnd() * 0.5, 0.8 + rnd() * 0.5, 0.8 + rnd() * 0.5, null, rnd() * TAU, 0, 0, 'glow');
      else if (i % 6 === 0) { const s = low ? 0.45 : 0.6 + rnd() * 0.4; api.put(G.ico(2), x, s * 0.35, z, s * 1.2, s * 0.7, s, ar === 1 ? 0xf2fbff : 0xffffff, rnd() * TAU); api.put(G.ico(2), x + 0.5, s * 0.25, z + 0.2, s * 0.8, s * 0.5, s * 0.7, 0xfff0fa, rnd() * TAU); }
      else api.put(flowerGeo(i), x, 0, z, low ? 0.7 : 1 + rnd() * 0.4, low ? 0.6 : 1 + rnd() * 0.5, low ? 0.7 : 1 + rnd() * 0.4, null, rnd() * TAU);
    });
    // ── ada içi süsler: yürünür alanda, yoldan uzak, alçak (üstünden geçilir) — alana göre ──
    const avoid = (L.chests || []).concat(L.checkpoints || [], gk.bounce, gk.chimes, gk.gifts);
    L.rooms.forEach((rm, ri) => {
      if (rm.kind === 'boss' || rm.kind === 'start') return;
      const ar = F.areaAt(rm.x, rm.z), n = ar === 0 ? 0 : rm.kind === 'side' ? 1 : 2;   // SADE: yürünür alanda yalnız birkaç oyun öğesi (su birikintisi, gökkuşağı halkası, kristal)
      for (let k = 0, t = 0; k < n && t < n * 6; t++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * (rm.r || 6) * 1.05, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
        if (F.at(F.walk, x, z) < 0.8 || F.at(F.path, x, z) > 0.12 || avoid.some(q => hyp(q.x - x, q.z - z) < 2.2)) continue;
        k++;
        const yaw = rnd() * TAU, v = 0;
        if (ar === 0) { if (v) { for (let q = 0; q < 3; q++) api.put(G.sphere(12, 8), x + (q - 1) * 0.32, 0.12 + (q === 1 ? 0.08 : 0), z + (rnd() - 0.5) * 0.2, 0.3, 0.22, 0.28, q === 1 ? 0xffffff : 0xfff0fa); } else for (let q = 0; q < 3; q++) api.put(flowerGeo(q + k), x + Math.sin(q * 2.1) * 0.35, 0, z + Math.cos(q * 2.1) * 0.35, 0.8, 0.7, 0.8, null, yaw + q); }
        else if (ar === 1) { if (v === 0) { const px = 0.7 + rnd() * 0.4, pz = 0.5 + rnd() * 0.3; puddleLook(api, x, z, px, pz, 0x9fd8ff); S.puddles.push({ x, z, rx: px, rz: pz, in: false, cd: 0 }); } else for (let q = 0; q < 2; q++) api.put(flowerGeo(2 + q * 2 + k), x + q * 0.4, 0, z + q * 0.2, 0.85, 0.8, 0.85, null, yaw + q); }
        else if (ar === 2) { if (v === 0) { for (let q = 0; q < 7; q++) { const r = 0.62 - q * 0.06; api.put(G.torus(PI, 0.05 / r, 20), x, 0, z, r, r, r, RAINBOW[q], yaw, 0, 0, 'glow'); } } else for (let q = 0; q < 3; q++) api.put(flowerGeo(q * 3 + k), x + Math.sin(q * 2.1) * 0.35, 0, z + Math.cos(q * 2.1) * 0.35, 0.8, 0.75, 0.8, null, yaw + q); }
        else { if (v === 0) api.put(crystalGeo(), x, 0, z, 0.4, 0.45, 0.4, null, yaw, 0, 0, 'glow'); else api.put(G.octa(), x, 0.18, z, 0.12, 0.18, 0.12, 0xfff2b0, yaw, 0, 0, 'glow'); }
      }
    });
    // büyülü ikinci kat: odanın kuzey yarısında bulut ağaçları (katı), her yerde pamuk çalıları, yıldız çiçekleri, kristaller
    const deep = (x, z, r) => { for (let a = 0; a < 8; a++) if (F.at(F.walk, x + Math.sin(a * 0.785) * r, z + Math.cos(a * 0.785) * r) < 0.9) return false; return true; };
    const nearPath = (x, z, r) => (L.path || []).some(q => hyp(q.x - x, q.z - z) < r);
    const spawnsNear = (x, z, r) => L.spawns.some(q => hyp(q.x - x, q.z - z) < r);
    const placed = [];
    L.rooms.forEach((rm, ri) => {
      if (rm.kind === 'boss' || rm.kind === 'start') return;
      const ar = F.areaAt(rm.x, rm.z), R0 = (rm.r || 6);
      let trees = 0;
      for (let t = 0; t < 40 && trees < (rm.kind === 'side' ? 1 : 3); t++) {
        const a = PI + (rnd() - 0.5) * 2.2, d = R0 * (0.35 + rnd() * 0.55), x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
        if (z > rm.z - 1 || !deep(x, z, 1.6) || nearPath(x, z, 3.2) || spawnsNear(x, z, 2.5) || avoid.some(q => hyp(q.x - x, q.z - z) < 3) || placed.some(q => hyp(q.x - x, q.z - z) < 3.5) || !api.circleFree(x, z, 1.2)) continue;
        const s = 0.85 + rnd() * 0.35; api.put(cloudTreeGeo(ri + trees), x, 0, z, s, s, s, null, rnd() * TAU); api.solid(x, z, 0.45 * s); placed.push({ x, z }); trees++;
      }
      const n = rm.kind === 'side' ? 0 : 2;   // SADE: ikinci kat süsler seyrek, yalnız pamuk çalısı
      for (let k = 0, t = 0; k < n && t < n * 6; t++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * R0, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
        if (!deep(x, z, 1.1) || F.at(F.path, x, z) > 0.05 || avoid.some(q => hyp(q.x - x, q.z - z) < 2) || placed.some(q => hyp(q.x - x, q.z - z) < 1.4)) continue;
        k++; placed.push({ x, z }); const yaw = rnd() * TAU, v = k % 4;
        if (true) api.put(cottonGeo(k), x, 0, z, 1.1, 1.1, 1.1, null, yaw);
        else if (v === 1 || ar === 1) for (let q = 0; q < 3; q++) api.put(starFlowerGeo(q + k), x + Math.sin(q * 2.1 + yaw) * 0.3, 0, z + Math.cos(q * 2.1 + yaw) * 0.3, 1, 0.9 + q * 0.1, 1, null, yaw + q, 0, 0, 'glow');
        else api.put(crystalGeo(), x, 0, z, 0.55, 0.6, 0.55, null, yaw, 0, 0, 'glow');
      }
    });
    yield;
    // ── uzak süsler: bulut kaleleri, dev gökkuşakları, kuzeydeki boşlukta ──
    const pals = [[0xfff4fb, 0xffd6ec, 0xff9ac8, 0xb69cff], [0xf4f8ff, 0xd6e8ff, 0x8fbcff, 0xffb3d6], [0xfffbea, 0xffe8c0, 0xffb98a, 0x9adfc0], [0xf8f0ff, 0xe4d4ff, 0xb69cff, 0xff9ac8]];
    const free = (x, z, r) => { for (let a = 0; a < 8; a++) if (F.at(F.isl, x + Math.sin(a) * r, z + Math.cos(a) * r) > 0.01 || F.at(F.walk, x + Math.sin(a) * r, z + Math.cos(a) * r) > 0.01) return false; return F.at(F.isl, x, z) < 0.01; };
    let nc = 0;
    for (let t = 0; t < 80 && nc < 5; t++) {
      const x = all.x0 + rnd() * (all.x1 - all.x0), z = all.z0 - 6 + rnd() * (all.z1 - all.z0) * 0.8;
      if (!free(x, z, 9)) continue;
      // kuzeyinde (kameranın arkasında) olmalı: güneyinde 6-14 m içinde ada varsa uygun
      let south = false; for (let d = 4; d < 16; d += 2) if (F.at(F.isl, x, z + d) > 0.3) south = true;
      if (!south) continue;
      castle(api, x, z, 0.9 + rnd() * 0.4, pals[nc % 4], rnd); nc++;
    }
    for (let t = 0, nr = 0; t < 60 && nr < 3; t++) {
      const x = all.x0 + rnd() * (all.x1 - all.x0), z = all.z0 - 10 + rnd() * (all.z1 - all.z0) * 0.5;
      if (!free(x, z, 14)) continue;
      bigRainbow(api, x, -6, z, 12 + rnd() * 5, (rnd() - 0.5) * 0.6); nr++;
    }
    yield;
    // ── uçan balonlar (hareketli, boşlukta) ──
    const balloons = [], vm = mat('vc');
    for (let t = 0; t < 80 && balloons.length < 7; t++) {
      const x = all.x0 - 10 + rnd() * (all.x1 - all.x0 + 20), z = all.z0 - 10 + rnd() * (all.z1 - all.z0 + 10);
      if (!free(x, z, 4) || balloons.some(b => hyp(b.x - x, b.z - z) < 14)) continue;
      const m = new THREE.Mesh(balloonGeo(balloons.length), vm); const s = 1.3 + rnd() * 0.8; m.scale.setScalar(s); m.position.set(x, -2 + rnd() * 3, z); m.rotation.y = rnd() * TAU; api.add(m);
      balloons.push({ m, x, z, y: m.position.y, ph: rnd() * TAU });
    }
    // ── Yıldız Adası: yıldızlı gök ──
    const a4 = A[3]; if (a4) starField(api, bbox(L, a4.rooms, 4));
    // ── bulut şelaleleri: güney ve yan kıyılardan (kameradan görünür) ──
    const fallSpots = [];
    for (const e of edges) {
      if (e.nz < 0.15 || fallSpots.length >= 9 || fallSpots.some(f => hyp(f.x - e.x, f.z - e.z) < 16)) continue;
      if (F.at(F.walk, e.x - e.nx * 1.5, e.z - e.nz * 1.5) > 0.5 && rnd() < 0.5) continue;
      fallSpots.push({ x: e.x, z: e.z, nx: e.nx, nz: e.nz, tx: -e.nz, tz: e.nx });
    }
    cloudFalls(api, fallSpots);
    motes(api);
    yield;
    // ── oyuncaklar: zıplatan bulut, rüzgâr çanı, gizli yıldız hediyeleri, yağmur bulutları ──
    const T = K ? K.toys(api) : null;
    const B0 = bounceGeo(), CH = chimeGeo();
    gk.bounce.forEach((p, i) => {
      const m = new THREE.Mesh(B0, mat('vc')); m.position.set(p.x, 0, p.z); m.scale.setScalar(1.0); m.receiveShadow = true; api.add(m);
      api.light(p.x, 1.8, p.z, 0xffd6f0, 1.2, 5);
      let bt = -1, first = true;
      if (T) T.add({ x: p.x, z: p.z, r: 1.5, hint: { y: 2.0 }, line: i === 0 ? 'pr_gk_ziplabulut' : null, near: 7, cd: 1.2, repeat: true,
        use: () => { bt = 0; sfx('bounce', { x: p.x, z: p.z, pitch: 0.9 }); sfx('bulutPuf', { x: p.x, z: p.z }); burst('star', p.x, 1.2, p.z, { count: 5 });
          if (first) { first = false; K.sugar(p.x, p.z, 8, 6); K.sticker('gk_bulut'); } },
        tick: (dt, t) => {
          m.scale.y = 1.0 * (1 + Math.sin(t * 2.2 + i) * 0.04); m.rotation.y = Math.sin(t * 0.6 + i) * 0.15;
          if (bt >= 0) {
            bt += dt; const u = bt / 1.0;
            if (u < 0.15) m.scale.y = 1.0 * (1 - Math.sin(u / 0.15 * PI) * 0.35);
            if (u < 1) K.heroY(Math.sin(Math.min(1, u) * PI) * 2.6); else { K.heroY(0); bt = -1; burst('confetti', GAME.P.pos.x, 0.6, GAME.P.pos.z, {}); }
          }
        } });
    });
    gk.chimes.forEach((p, i) => {
      api.put(G.cyl(1, 1, 12), p.x, 1.6, p.z, 0.09, 3.2, 0.09, 0xfff4fb); api.put(G.sphere(10, 8), p.x, 3.25, p.z, 0.16, 0.16, 0.16, 0xffe36e, 0, 0, 0, 'glow');
      api.put(G.cyl(1, 1, 8), p.x + 0.45, 3.05, p.z, 0.05, 0.9, 0.05, 0xfff4fb, 0, 0, PI / 2);
      api.solid(p.x, p.z, 0.35);
      const m = new THREE.Mesh(CH, mat('chime')); m.position.set(p.x + 0.85, 3.0, p.z); api.add(m);
      api.light(p.x, 3, p.z + 0.5, RAINBOW[(i * 2) % 7], 1.4, 6);
      let ring = 0, note = 0, nT = 0;
      if (T) T.add({ x: p.x, z: p.z + 1.0, r: 2.2, hint: { y: 4.2 }, line: i === 0 ? 'pr_gk_ruzgarcani' : null, near: 8, cd: 3, repeat: true,
        use: () => { ring = 2.4; note = 0; nT = 0; burst('notes', p.x + 0.85, 2.6, p.z, { count: 5 }); K.sticker('gk_can'); if (i === gk.chimes.length - 1) K.sugar(p.x, p.z + 1, 6, 4); },
        tick: (dt, t) => {
          const w = 0.06 + ring * 0.25;
          m.rotation.z = Math.sin(t * 1.7 + i) * w; m.rotation.x = Math.sin(t * 1.3 + i * 2) * w * 0.6;
          if (ring > 0) { ring = Math.max(0, ring - dt); nT -= dt; if (nT <= 0 && note < 6) { nT = 0.16; sfx('bell', { x: p.x, z: p.z, pitch: [1, 1.25, 1.5, 1.33, 1.68, 2][note], vol: 0.5 }); note++; } }
        } });
    });
    gk.gifts.forEach((p, i) => {
      if (T) K.treasure(api, T, p.x, p.z, starGiftGeo(), { y: 0.05, sc: 1.1, tilt: 0.1, line: i === 0 ? 'pr_gk_hazine' : null, gs: i === gk.gifts.length - 1, gold: 12, n: 8, sticker: 'gk_hediye' });
      api.glow(p.x, p.z, 2.2, 0xe8d8ff, 0.18);
    });
    // yağmur bulutları (Yağmur Adası; yürünür alanın kuzey kıyısında, yolun üstünde değil)
    const rc = [], puddles = S.puddles;
    for (const ri of gk.rain) {
      const rm = L.rooms[ri]; if (!rm) continue;
      for (let t = 0; t < 20; t++) {
        const a = PI + (rnd() - 0.5) * 1.6, d = (rm.r || 6) * (0.6 + rnd() * 0.3), x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
        if ((L.path || []).some(q => hyp(q.x - x, q.z - z) < 2.2) || rc.some(c => hyp(c.x - x, c.z - z) < 5)) continue;
        const m = new THREE.Mesh(rainCloudGeo(), mat('vc')); m.position.set(x, 4.2, z); m.scale.setScalar(1.15); api.add(m);
        const rb = new THREE.Mesh(miniRainbowGeo(), M.rbMat || (M.rbMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }))));
        rb.position.set(x, 0, z + 0.2); rb.scale.setScalar(0.0001); rb.visible = false; rb.renderOrder = 2; api.add(rb);
        rc.push({ x, y: 4.2, z, m, ph: rnd() * TAU, rain: 1, rb, cyc: rnd() * 6 });
        puddleLook(api, x, z, 1.3, 0.9, 0x9fd4ff);   // su birikintisi
        puddles.push({ x, z, rx: 1.3, rz: 0.9, in: false, cd: 0 });
        break;
      }
    }
    rainDrops(api, rc);
    // hareketli şeylerin ortak döngüsü
    let t = 0;
    api.anim(dt => {
      t += dt;
      if (S.U) { S.U.uGkT.value = t; S.U.uGkF.value += ((S.fir || 0) - S.U.uGkF.value) * Math.min(1, dt * 2);
        const bb = typeof GAME !== 'undefined' ? GAME.boss : null;   // boss'un altında yumuşak gölge (zeminde, gölgelendiricide; ek çizim yok)
        if (bb && !bb.dead && bb.m && bb.m.root && bb.m.root.visible) S.U.uGkB.value.set(bb.x, bb.z + 0.4, (bb.r || 1.7) * 1.45); else S.U.uGkB.value.z = 0; }
      for (const b of balloons) { b.m.position.y = b.y + Math.sin(t * 0.5 + b.ph) * 0.6; b.m.rotation.y += dt * 0.05; }
      for (const c of rc) {
        c.m.position.y = c.y + Math.sin(t * 1.1 + c.ph) * 0.12; c.m.rotation.z = Math.sin(t * 0.8 + c.ph) * 0.05;
        // 9 s yağmur, sonra 6 s küçük gökkuşağı (birikintinin üstünde yükselir)
        const u = (t + c.cyc) % 15; c.rain = u < 9 ? 1 : 0;
        const k = u < 9 ? 0 : Math.min(1, (u - 9) / 0.8) * Math.min(1, (15 - u) / 0.8), e = k * k * (3 - 2 * k);
        c.rb.visible = e > 0.01; if (c.rb.visible) c.rb.scale.set(1.6 * e, 1.6 * e, 1);
        if (u >= 9 && !c.rbSaid) { c.rbSaid = 1; burst('sparkle', c.x, 1.2, c.z + 0.2, { count: 5, color: '#fff1a8' }); } else if (u < 9) c.rbSaid = 0;
      }
      // su birikintisine basınca sıçrama
      const G0 = typeof GAME !== 'undefined' ? GAME : null, P = G0 && G0.P;
      if (P && G0.state === 'play' && puddles.length) for (const q of puddles) {
        q.cd -= dt; const dx = (P.pos.x - q.x) / q.rx, dz = (P.pos.z - q.z) / q.rz, inside = dx * dx + dz * dz < 1 && (P.pos.y || 0) < 0.3;
        if (inside && !q.in && q.cd <= 0) { q.cd = 0.5; burst('splash', P.pos.x, 0.2, P.pos.z, { count: 7, color: '#9fdcff' }); sfx('splash', { x: P.pos.x, z: P.pos.z, vol: 0.5, pitch: 1.1 + Math.random() * 0.3 }); if (K) K.ring(P.pos.x, P.pos.z, 1.4, '#bfe8ff'); }
        q.in = inside;
      }
      if (S.par) paradeTick(dt);
      if (S.fest) festTick(dt);
    });
    yield;
    // ── geçit süsleri: iki yanda gökkuşağı direkleri ──
    A.forEach((a, k) => { if (k && a.gate && K) K.gatePosts(L, a.gate, 3.2, (x, z) => { for (let i = 0; i < 7; i++) api.put(G.cyl(1, 1, 12), x, 0.2 + i * 0.42, z, 0.24, 0.42, 0.24, RAINBOW[i]); api.put(G.sphere(12, 10), x, 3.25, z, 0.36, 0.36, 0.36, 0xffe36e, 0, 0, 0, 'glow'); }); });
    // ── arena: inci bulut adası; kenarında gökkuşağı sütunları (kuzeyde uzun, güneyde alçak) ──
    const ar = (L.rooms.find(r => r.kind === 'boss') || L.rooms[L.rooms.length - 1]);
    if (ar && ar.kind === 'boss') {
      const R = (ar.r || 11) + 2.4;
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12, x = ar.x + Math.sin(a) * R, z = ar.z + Math.cos(a) * R;
        if (F.at(F.walk, x, z) > 0.2) continue;
        const h = Math.cos(a) > 0.3 ? 0.6 : 3.4 + (i % 2) * 0.8;   // cos(a) > 0 → güney (z büyük)
        for (let q = 0; q < 7; q++) api.put(G.cyl(1, 1, 12), x, h * (q + 0.5) / 7, z, 0.34, h / 7, 0.34, RAINBOW[q]);
        api.put(G.ico(2), x, h + 0.3, z, 0.7, 0.45, 0.7, 0xffffff);
      }
      api.light(ar.x, 4, ar.z, 0xffe6f6, 2.2, 16);
      yield* paradeBuild(L, api, ar);
    }
  }
  // ════════ Final geçidi: neşelenen bütün bosslar ve huysuzlar arenanın kuzeyinde belirip el sallar ════════
  function* paradeBuild(L, api, ar) {
    if (typeof EMODEL === 'undefined' || !EMODEL.build || typeof HUYSUZ === 'undefined') return;
    const zones = ['mantar', 'mercan', 'col', 'atolye', 'gokkusagi'], list = [];
    for (const z of zones) { const Z = HUYSUZ.forZone(z); if (!Z) continue; const en = Object.keys(Z.enemies || {}).filter(id => !/altin|gokkusagiDamla/.test(id)); if (en[0]) list.push({ t: en[0], boss: false }); if (Z.boss && z !== 'gokkusagi') list.push({ t: Z.boss, boss: true }); }
    const R0 = (ar.r || 11), cx = L.crystalSpot ? L.crystalSpot.x : ar.x, z0 = (L.crystalSpot ? L.crystalSpot.z : ar.z - R0 * 0.45) + 0.6, n = list.length, gap = Math.min(2.3, (R0 * 1.5 - 3) / Math.max(1, n - 1));
    for (let i = 0; i < n; i++) {
      const e = list[i];
      let m = null;
      try { m = EMODEL.build(e.t, {}); } catch (err) { m = null; }
      if (m && m.root) {
        const h = m.height || 1, s = e.boss ? Math.min(1, 2.3 / h) : Math.min(1.2, 1.15 / h);
        m.root.scale.multiplyScalar(s); m.root.visible = false;
        const half = (n - 1) / 2, x = cx + (i - half) * gap + Math.sign(i - half + 0.01) * 1.6, z = z0 - (e.boss ? 0.9 : 0) - Math.abs(i - half) * 0.35;   // (ortada kristale yer: hafif yay)
        m.root.position.set(x, 0, z); api.add(m.root);
        try { if (m.setMood) m.setMood('happy'); } catch (err) { /* */ }
        S.parList.push({ m, x, z, at: 0.35 * i, ph: i * 1.3, st: { move: 0, windup: -1, attack: -1, hurt: 0, frozen: 0, dying: -1, t: 0, phase: 'idle', phaseT: 0, aggro: false }, ok: true });
      }
      yield;
    }
  }
  function paradeTick(dt) {
    const P = S.par; P.t += dt;
    for (const e of S.parList) {
      const u = P.t - e.at; if (u < 0) continue;
      if (!e.m.root.visible) { e.m.root.visible = true; burst('confetti', e.x, 1.5, e.z, {}); burst('dust', e.x, 0.4, e.z, { count: 5, color: '#ffffff' }); sfx('bulutPuf', { x: e.x, z: e.z, pitch: 1 + Math.random() * 0.4 }); }
      const pop = Math.min(1, u / 0.35), r = e.m.root, base = r.userData.gkS || (r.userData.gkS = r.scale.x);
      r.scale.setScalar(base * (pop < 1 ? 0.3 + 0.7 * Math.sin(pop * PI / 2) * 1.08 : 1));
      r.position.y = Math.abs(Math.sin(u * 4 + e.ph)) * 0.28;   // sevinçle zıplar
      r.rotation.y = Math.sin(u * 1.6 + e.ph) * 0.35; r.rotation.z = Math.sin(u * 5 + e.ph) * 0.12;   // el sallar gibi sağa sola
      if (e.ok) { e.st.t += dt; try { e.m.anim(dt, e.st); } catch (err) { e.ok = false; } }
      if ((e.hT = (e.hT ?? Math.random() * 1.5) - dt) <= 0) { e.hT = 1.4 + Math.random(); burst('hearts', e.x, 2.2, e.z, { count: 2 }); }
    }
    if (P.t > 40) S.par = null;
  }

  // ════════ Boss bağlantıları (src/05z_gokkusagi.js çağırır) ════════
  // fırtına koyuluğu (0..1): arena zemini biraz kararır (boss canına göre)
  function firtina(k) { S.fir = Math.max(0, Math.min(1, k)); }
  // boss neşelenince: arenaya gökkuşağı yağmuru (renkli parıltılar + konfeti dalgaları ~6 s), zemin aydınlanır
  function kutla(x, z) { S.fir = 0; S.fest = { x, z, t: 0, n: 0 }; sfx('gokkusagiTini', { x, z }); S.par = { t: -2.2 }; }
  function festTick(dt) {
    const f = S.fest; f.t += dt;
    if (f.t > 9) { S.fest = null; return; }
    if ((f.n -= dt) <= 0) {
      f.n = 0.12;
      const a = Math.random() * TAU, r = Math.random() * 9, x = f.x + Math.sin(a) * r, z = f.z + Math.cos(a) * r;
      burst('sparkle', x, 3 + Math.random() * 3, z, { count: 3, color: '#' + col(RAINBOW[(Math.random() * 7) | 0]).getHexString() });
      if (Math.random() < 0.25) burst('confetti', x, 4, z, {});
      if (Math.random() < 0.15) sfx('bell', { x, z, pitch: 1 + Math.random(), vol: 0.35 });
    }
  }

  BOLUM.define('gokkusagi', {
    ad: 'Gökkuşağı Adaları',
    taban: 'moon',   // (eski zemin gizlenir: kendi ada üstümüz; eski tema yalnız ışık tabanı)
    size: 100, side: 2,
    areas: [{ id: 'a1', ad: 'Bulut Basamakları', rooms: 2 }, { id: 'a2', ad: 'Yağmur Adası', rooms: 2 }, { id: 'a3', ad: 'Gökkuşağı Köprüsü', rooms: 2 }, { id: 'a4', ad: 'Yıldız Adası', rooms: 2 }],
    muzik: 'pr_gokkusagi',
    malzeme: 'isik5',
    kayipEsya: null,
    final: true,
    isik: { fog: [0xb9b0ec, 120, 280], hemiSky: 0xfff0fa, hemiGround: 0x9a88d8, hemi: 0.52, sunColor: 0xfff0dc, sun: 2.15, sunOffset: [-12, 26, 14],
      env: [0xe8dcfa, 0xfff2e6, 0xa898dc, 0.55], bloom: 0.1, exposure: 0.88, sat: 1.16, vig: 0.26, fezaLight: 0, moss: [0xf4e4f6, 0], rim: [0xfff4fb, 0.18] },
    zemin: { tA: 0xd8f4dc, tB: 0xfff0e0, tC: 0xffffff, out: 0xf3dcf0, outAmt: 1, macro: 0xffffff },
    minimap: { zemin: '#ffc8ec' },
    harita: { ad: 'Gökkuşağı Adaları', detay: 'Uçan adalar, gökkuşağı köprüleri, bulut kaleleri', renk: '#ff9ad5', x: 88, y: 68, simge: '🌈' },
    yerlesim, kur,
    // kırılabilir fıçı/vazo/sandıklar: inci gibi pastel bulut şekeri görünsün (ahşap kahve yerine)
    kurSon(L) {
      if (!M.pearl) { M.pearl = keep(new THREE.MeshStandardMaterial({ color: 0xf6e8ff, roughness: 0.3, metalness: 0.05, emissive: new THREE.Color(0xffd8f0), emissiveIntensity: 0.18 })); }
      if (L.group) L.group.traverse(o => { if (o.isInstancedMesh && /^break-/.test(o.name || '')) o.material = M.pearl; });
      // SADE10: hazine sandığı tema dışı (tahta + altın) → bulut-gökkuşağı kutusu: pastel pembe-beyaz gövde, önde gökkuşağı şeritleri,
      //   bulut kapak (pofuduk toplar). Boyut/pivot motorun sandığıyla aynı: açılma, ışık, ödül değişmez. Geometri bölüm başına bir kez.
      if (L.chestObjs && L.chestObjs.length) {
        if (!M.chestGeo) {
          const b = new Kit(), Wd = 0.9, D = 0.62, Hh = 0.5;
          b.add(G.box(), 0xffe0f0, [0, Hh / 2 + 0.04, 0], null, [Wd, Hh, D]);
          b.add(G.box(), 0xffffff, [0, 0.05, 0], null, [Wd + 0.05, 0.08, D + 0.05]);
          const RB = [0xff7a9a, 0xffac63, 0xffe36e, 0x86e39a, 0x6fcbff, 0x9a93ff, 0xd99bff];
          for (let i = 0; i < 7; i++) b.add(G.box(), RB[i], [-Wd / 2 + (i + 0.5) * Wd / 7, Hh / 2 + 0.06, D / 2 + 0.008], null, [Wd / 7 - 0.012, Hh - 0.1, 0.014]);
          b.add(G.sphere(12, 8), 0xffffff, [0, Hh * 0.8, D / 2 + 0.03], null, [0.1, 0.1, 0.05]);   // ön kilit yerine bulut düğme
          const l = new Kit();
          l.add(G.box(), 0xffffff, [0, 0.05, D / 2], null, [Wd + 0.04, 0.1, D + 0.04]);
          for (let i = 0; i < 4; i++) l.add(G.sphere(12, 8), i % 2 ? 0xfff0fa : 0xffffff, [-0.33 + i * 0.22, 0.13, D / 2 + (i % 2 ? 0.08 : -0.06)], null, [0.17, 0.12, 0.17]);
          l.add(G.sphere(12, 8), 0xffffff, [0, 0.2, D / 2], null, [0.2, 0.14, 0.2]);
          M.chestGeo = { body: keep(b.build()), lid: keep(l.build()) };
          M.chestMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0, emissive: new THREE.Color(0xfff0f8), emissiveIntensity: 0.08 }));   // (motorun ahşap dokulu malzemesi yerine düz pastel)
        }
        for (const c of L.chestObjs) {
          const g = c.obj; if (!g || !g.children) continue;
          const body = g.children[0], pivot = g.children[1], lid = pivot && pivot.children && pivot.children[0];
          if (body && body.isMesh) { body.geometry = M.chestGeo.body; body.material = M.chestMat; }
          if (lid && lid.isMesh) { lid.geometry = M.chestGeo.lid; lid.material = M.chestMat; }
        }
      }
    },
  });
  return { firtina, kutla, gecit: () => { S.par = { t: 0 }; }, _S: S };
})();
