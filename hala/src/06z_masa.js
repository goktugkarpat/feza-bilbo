/* ── Merkez: Aytuğ Hala'nın Mutfak Masası ──
   Oyun buradan başlar (bölge 0). Minicik Feza'nın gözünden dev ahşap mutfak masası: kareli örtü, dev un torbası, çay bardağı,
   tuzluk-biberlik, kurabiye kavanozu, açık tarif defteri; arkada (kuzeyde) aşağıda dev mutfak (pencere, sabah güneşi, buzdolabı).
   Kuzey kenarda odalara giden 4 kapı (kurdele / kaşık / dondurma çubuğu / şeker kamışı rampası), ortada büyüyen pasta (CAKE),
   istasyonlar (Gardırop, Bilbo'nun Köşesi, Çıkartma Albümü, Mini Oyun Köşesi, Günün Sürprizi) ve oyuncaklar (zıplatan sünger,
   yuvarlanan bezelye, müzik kutusu). Huysuz yok: güvenli üs.
   Genel adlar: CAKE (pasta modeli + süsler; dünya ve süsleme ekranı aynı kurucuyu kullanır), MASA (yardımcılar).
   Paneller (HUB) src/09h_hub.js'te. Sözleşme: src/SPEC.md › "Dev Ev API" › Merkez. */
const MASA = (() => {
  'use strict';
  const TAUm = Math.PI * 2;
  // ── Yerleşim (metre): masanın yürünür üstü, kenarlar, kapılar, istasyonlar ──
  const T = { W: 72, H: 62, x0: 14, x1: 58, z0: 15, z1: 45, edge: 1.6, cx: 36, cz: 30 };   // yürünür dikdörtgen; görünen masa 1,6 m daha geniş
  T.top = { x0: T.x0 - T.edge, x1: T.x1 + T.edge, z0: T.z0 - T.edge, z1: T.z1 + T.edge };
  T.cake = { x: 36, z: 28.5, r: 3.55 };
  T.doors = [   // kuzey kenarda, kameraya bakan kapılar (soldan sağa); Balkon tanımlıysa 5. kapı (yerleşimde eklenir)
    { zone: 'oturma', x: 19, col: 0x8fb0d8, col2: 0xdfeaf7, ikon: '🛋️', ramp: 'kurdele' },
    { zone: 'mutfak', x: 27.5, col: 0xf0b45a, col2: 0xfff0d2, ikon: '🍳', ramp: 'kasik' },
    { zone: 'buzdolabi', x: 36, col: 0x7fcbe8, col2: 0xe6f7ff, ikon: '🧊', ramp: 'cubuk' },
    { zone: 'pasta', x: 44.5, col: 0xf28fb4, col2: 0xffe6f0, ikon: '🎂', ramp: 'seker' },
    { zone: 'balkon', x: 53, col: 0x7fcf6a, col2: 0xe8f8d8, ikon: '🌻', ramp: 'kurdele', opt: true },
  ];
  T.doorList = () => T.doors.filter(d => !d.opt || (typeof ZONE_DEFS !== 'undefined' && ZONE_DEFS[d.zone]));
  T.st = {
    gardirop: { x: 15.9, z: 24 }, bilbo: { x: 55, z: 24.5 }, album: { x: 18.6, z: 36.4 }, mini: { x: 51, z: 38.6 }, surpriz: { x: 28.5, z: 25.2 },
  };
  T.toys = { sunger: { x: 27.5, z: 32 }, bezelye: { x: 44.5, z: 33 }, muzik: { x: 40.2, z: 21.8 } };
  // ── küçük yardımcılar ──
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const CV = {};   // çizilmiş tuvaller (bölüm her kurulduğunda yeniden çizilmez)
  function tex(key, draw, rep, aniso = 8) {
    const c = CV[key] || (CV[key] = draw());
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    try { t.anisotropy = Math.min(aniso, renderer.capabilities.getMaxAnisotropy()); } catch (e) { /* yok */ }
    return t;
  }
  // Sıcak bal rengi meşe: tahtalar x boyunca, damarlar, budaklar, tahta araları
  function woodCanvas() {
    const c = cv(1024, 1024), g = c.getContext('2d');
    const planks = 4, ph = 1024 / planks;
    const tones = ['#c98f58', '#d29a62', '#c48852', '#cf9660'];
    for (let p = 0; p < planks; p++) {
      const y0 = p * ph;
      g.fillStyle = tones[p]; g.fillRect(0, y0, 1024, ph);
      for (let k = 0; k < 70; k++) {   // damarlar: yavaşça dalgalanan ince çizgiler
        const yy = y0 + Math.random() * ph, amp = 3 + Math.random() * 9, f = 0.004 + Math.random() * 0.01, ph2 = Math.random() * 9;
        g.strokeStyle = Math.random() < 0.5 ? 'rgba(120,66,28,' + (0.08 + Math.random() * 0.16) + ')' : 'rgba(255,214,160,' + (0.06 + Math.random() * 0.12) + ')';
        g.lineWidth = 0.6 + Math.random() * 2.2;
        g.beginPath();
        for (let x = 0; x <= 1024; x += 16) { const y = yy + Math.sin(x * f + ph2) * amp + Math.sin(x * f * 3.1 + ph2) * amp * 0.25; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
      for (let k = 0; k < 2; k++) {   // budak: halkalı koyu leke
        const kx = Math.random() * 1024, ky = y0 + ph * (0.3 + Math.random() * 0.4);
        for (let r = 22; r > 2; r -= 3) { g.strokeStyle = 'rgba(110,58,24,' + (0.1 + (22 - r) * 0.012) + ')'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(kx, ky, r * 2.4, r * 0.8, 0, 0, TAUm); g.stroke(); }
      }
      const gr = g.createLinearGradient(0, y0, 0, y0 + ph);   // tahta kenarlarında hafif gölge
      gr.addColorStop(0, 'rgba(90,48,20,0.35)'); gr.addColorStop(0.04, 'rgba(90,48,20,0)'); gr.addColorStop(0.96, 'rgba(255,230,190,0)'); gr.addColorStop(1, 'rgba(255,230,190,0.18)');
      g.fillStyle = gr; g.fillRect(0, y0, 1024, ph);
      g.fillStyle = 'rgba(70,36,14,0.55)'; g.fillRect(0, y0, 1024, 2);
    }
    return c;
  }
  // Kırmızı-beyaz kareli (pötikare) örtü
  function ginghamCanvas(c1 = '#e8505b') {
    const c = cv(256, 256), g = c.getContext('2d'), n = 4, s = 256 / n;
    g.fillStyle = '#fffaf4'; g.fillRect(0, 0, 256, 256);
    g.globalAlpha = 0.55; g.fillStyle = c1;
    for (let i = 0; i < n; i += 2) { g.fillRect(i * s, 0, s, 256); g.fillRect(0, i * s, 256, s); }
    g.globalAlpha = 0.5; for (let i = 0; i < n; i += 2) for (let j = 0; j < n; j += 2) g.fillRect(i * s, j * s, s, s);
    g.globalAlpha = 0.08; g.fillStyle = '#7a3a2a';   // kumaş dokusu
    for (let y = 0; y < 256; y += 2) g.fillRect(0, y, 256, 1);
    for (let x = 0; x < 256; x += 2) g.fillRect(x, 0, 1, 256);
    g.globalAlpha = 1;
    return c;
  }
  // Mutfak zemini: krem-terrakota karo
  function tileCanvas() {
    const c = cv(512, 512), g = c.getContext('2d'), s = 128;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.fillStyle = (i + j) % 2 ? '#f3e2c8' : '#e5b48c'; g.fillRect(i * s, j * s, s, s);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(i * s + 6, j * s + 6, s - 40, 10);
    }
    g.strokeStyle = '#d8c6ae'; g.lineWidth = 6; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s, 512); g.moveTo(0, k * s); g.lineTo(512, k * s); g.stroke(); }
    return c;
  }
  // Duvar karosu (tezgâh arkası): nane yeşili küçük karolar
  function wallCanvas() {
    const c = cv(256, 256), g = c.getContext('2d'), s = 64;
    g.fillStyle = '#e9e1cf'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.fillStyle = (i * 7 + j * 3) % 5 === 0 ? '#bfe3d4' : '#d6efe5'; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(i * s + 8, j * s + 8, s - 30, 6);
    }
    return c;
  }
  // Pencereden sabah: açık mavi gök, yumuşak güneş, uzakta yeşil ağaçlar
  function skyCanvas() {
    const c = cv(256, 256), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9fd3f7'); gr.addColorStop(0.65, '#dff1fb'); gr.addColorStop(1, '#fff3da');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const sun = g.createRadialGradient(70, 70, 4, 70, 70, 120); sun.addColorStop(0, 'rgba(255,255,236,1)'); sun.addColorStop(0.2, 'rgba(255,246,200,0.9)'); sun.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = sun; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, r] of [[170, 60, 18], [190, 55, 22], [210, 62, 16], [120, 110, 12], [136, 106, 15]]) { g.beginPath(); g.arc(x, y, r, 0, TAUm); g.fill(); }
    for (let k = 0; k < 14; k++) { g.fillStyle = k % 2 ? '#8cc58a' : '#76b47a'; g.beginPath(); g.arc(k * 20 + 6, 222 - (k % 3) * 8, 26 + (k % 4) * 5, 0, TAUm); g.fill(); }
    g.fillStyle = '#a9d48c'; g.fillRect(0, 236, 256, 20);
    return c;
  }
  function radialCanvas(inner = 'rgba(255,240,200,1)', outer = 'rgba(255,240,200,0)') {
    const c = cv(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return c;
  }
  // Rozet: yuvarlak, renkli halkalı, ortasında emoji (kapı/istasyon tabelası)
  function badgeCanvas(ikon, ring = '#f28fb4', bg = '#fffaf2') {
    const c = cv(256, 256), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.arc(128, 134, 116, 0, TAUm); g.fill();
    g.fillStyle = ring; g.beginPath(); g.arc(128, 126, 116, 0, TAUm); g.fill();
    const gr = g.createRadialGradient(110, 100, 10, 128, 126, 100); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, bg);
    g.fillStyle = gr; g.beginPath(); g.arc(128, 126, 96, 0, TAUm); g.fill();
    g.font = '120px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ikon, 128, 134);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(92, 66, 40, 16, -0.5, 0, TAUm); g.fill();
    return c;
  }
  function seedCanvas() {   // çilek: kırmızı, altın çekirdekler
    const c = cv(128, 128), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#ff6b7f'); gr.addColorStop(0.5, '#ec2f4c'); gr.addColorStop(1, '#d81e3e');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const x = i * 16 + (j % 2) * 8 + 4, y = j * 16 + 6;
      g.fillStyle = 'rgba(150,10,30,0.35)'; g.beginPath(); g.ellipse(x, y + 1, 3.6, 4.6, 0, 0, TAUm); g.fill();
      g.fillStyle = '#ffe28a'; g.beginPath(); g.ellipse(x, y, 1.8, 2.8, 0, 0, TAUm); g.fill();
    }
    return c;
  }
  // Kek gözenekleri (kesit/yan yüz): açık zeminde küçük koyu-açık delikler (döşenir)
  function crumbCanvas() {
    const c = cv(256, 256), g = c.getContext('2d');
    g.fillStyle = '#f4f0ea'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 520; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 1 + Math.random() * 3.6;
      g.fillStyle = 'rgba(150,100,50,' + (0.18 + Math.random() * 0.25) + ')'; g.beginPath(); g.ellipse(x, y, r * 1.3, r, Math.random() * 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.35, 0, 0, Math.PI * 2); g.fill();
    }
    return c;
  }
  // Pişmiş kek üstü: altın-kahve, kenara doğru koyulaşan, ince çatlaklar, pudra şekeri serpintisi
  function bakedTopCanvas() {
    const c = cv(512, 512), g = c.getContext('2d');
    const gr = g.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, '#f2c27e'); gr.addColorStop(0.7, '#dc9e55'); gr.addColorStop(1, '#b8743a');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) { const a = Math.random() * 6.283, r = Math.random() * 240, x = 256 + Math.cos(a) * r, y = 256 + Math.sin(a) * r; g.fillStyle = 'rgba(140,80,30,' + (0.06 + Math.random() * 0.12) + ')'; g.beginPath(); g.arc(x, y, 3 + Math.random() * 10, 0, 6.283); g.fill(); }
    g.strokeStyle = 'rgba(150,84,34,0.22)'; g.lineCap = 'round';
    for (let k = 0; k < 5; k++) { let x = 256 + (Math.random() - 0.5) * 140, y = 256 + (Math.random() - 0.5) * 140; g.lineWidth = 2 + Math.random() * 2; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 900; i++) { const a = Math.random() * 6.283, r = Math.pow(Math.random(), 0.7) * 200, x = 256 + Math.cos(a) * r, y = 256 + Math.sin(a) * r; g.fillStyle = 'rgba(255,255,255,' + (0.35 + Math.random() * 0.5) + ')'; g.fillRect(x, y, 2 + Math.random() * 2, 2 + Math.random() * 2); }
    return c;
  }
  const sx = (o, k = 1) => o;   // (yer tutucu: okunurluk)
  return { T, V2, hash, tex, crumbCanvas, bakedTopCanvas, woodCanvas, ginghamCanvas, tileCanvas, wallCanvas, skyCanvas, radialCanvas, badgeCanvas, seedCanvas, cv, sx };
})();

/* ── CAKE: Aytuğ Hala'nın sürpriz pastası ──
   makeModel(stage, o) → { group, R, y0, top, surf (ışın hedefi meshler), deco (süs grubu), setDecos(list), dispose() }:
   dünya ve süsleme ekranı aynı modeli kurar. stage 0 boş tabak + kalıp, 1 kek tabanı, 2 kabarık iki kat, 3 çilek dolgu + çilekler,
   4 krema kaplama + sıkma süsler (+ final sonrası mumlar). Süs konumu { a: açı, h: 0..1 } yüzey boyunca: 0 = yan yüzün dibi,
   SIDE = üst kenar, 1 = üstün ortası (pasta büyüse de süsler yerinde kalır). */
const CAKE = (() => {
  'use strict';
  const TAU2 = Math.PI * 2, V2 = MASA.V2, hash = MASA.hash;
  const S = { world: null, stage: 0, spot: null, shown: -1, api: null, anim: null };
  const Y0 = 0.62;   // kek standının üstü (yerden)
  // Aşama ölçüleri: R (dış yarıçap), H (kek yüksekliği, Y0'dan)
  const DIM = [{ R: 2.45, H: 0 }, { R: 2.45, H: 1.15 }, { R: 2.45, H: 2.15 }, { R: 2.45, H: 2.5 }, { R: 2.62, H: 2.72 }];
  const geos = {};   // paylaşılan (keep) geometriler
  const keepG = g => { g.userData.keep = true; return g; };
  function lathe(key, pts, seg = 48) { return geos[key] || (geos[key] = keepG(new THREE.LatheGeometry(pts.map(p => V2(p[0], p[1])), seg))); }
  function cylG(key, seg = 64, hs = 6) { return geos[key] || (geos[key] = keepG(new THREE.CylinderGeometry(1, 1, 1, seg, hs, false))); }
  // Sıkma krema gülü: çıkıntılı, kıvrımlı lathe
  function rosetteG() {
    if (geos.ros) return geos.ros;
    const pts = []; for (let i = 0; i <= 12; i++) { const v = i / 12; pts.push(V2(Math.max(0.001, 0.5 * Math.sin(Math.PI * (0.18 + 0.82 * v)) * (1 - v * 0.55)), v * 0.85)); }
    pts.push(V2(0.001, 0.9));
    const g = new THREE.LatheGeometry(pts, 40), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const h = v.y / 0.9, u = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z);
      const k = 1 + 0.2 * Math.cos(8 * (u + h * 2.4)) * (1 - h * 0.5), uu = u + h * 1.1;
      p.setXYZ(i, Math.cos(uu) * r * k, v.y, Math.sin(uu) * r * k);
    }
    g.computeVertexNormals();
    return geos.ros = keepG(g);
  }
  function domeG() {   // kek üstü kubbe: düzlemsel uv (pişmiş üst dokusu)
    if (geos.dome) return geos.dome;
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(V2(Math.max(0.001, Math.sin(t * Math.PI / 2)), Math.cos(t * Math.PI / 2))); }
    const g = new THREE.LatheGeometry(pts.reverse(), 64), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5 + 0.5, p.getZ(i) * 0.5 + 0.5);
    return geos.dome = keepG(g);
  }
  function berryG() {   // çilek gövdesi (uv'li: çekirdek dokusu)
    return lathe('berry', [[0.001, 0], [0.18, 0.06], [0.32, 0.22], [0.4, 0.42], [0.42, 0.58], [0.38, 0.72], [0.26, 0.82], [0.001, 0.86]], 24);
  }
  function starG() {
    if (geos.star) return geos.star;
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.22 : 0.5, a = i * Math.PI / 5 + Math.PI / 2; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 });
    g.translate(0, 0, -0.09);
    return geos.star = keepG(g);
  }
  function heartG() {
    if (geos.heart) return geos.heart;
    const s = new THREE.Shape(); s.moveTo(0, -0.42);
    s.bezierCurveTo(-0.15, -0.28, -0.5, -0.08, -0.48, 0.16); s.bezierCurveTo(-0.46, 0.38, -0.2, 0.46, 0, 0.26);
    s.bezierCurveTo(0.2, 0.46, 0.46, 0.38, 0.48, 0.16); s.bezierCurveTo(0.5, -0.08, 0.15, -0.28, 0, -0.42);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 4, curveSegments: 16 });
    g.translate(0, 0, -0.08);
    return geos.heart = keepG(g);
  }
  function letterFG() {
    if (geos.F) return geos.F;
    const s = new THREE.Shape(); const P = [[-0.3, -0.5], [-0.3, 0.5], [0.34, 0.5], [0.34, 0.3], [-0.08, 0.3], [-0.08, 0.1], [0.24, 0.1], [0.24, -0.1], [-0.08, -0.1], [-0.08, -0.5]];
    P.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3 });
    g.translate(0, 0, -0.08);
    return geos.F = keepG(g);
  }
  function dogG() {   // Bilbo şekilli kurabiye: yan duran köpek silueti
    if (geos.dog) return geos.dog;
    const s = new THREE.Shape();
    s.moveTo(-0.5, -0.3); s.lineTo(-0.5, -0.05); s.quadraticCurveTo(-0.62, 0.12, -0.56, 0.2); s.lineTo(-0.44, 0.06); s.quadraticCurveTo(-0.2, 0.12, 0.18, 0.1);
    s.quadraticCurveTo(0.22, 0.36, 0.38, 0.4); s.quadraticCurveTo(0.6, 0.4, 0.62, 0.22); s.quadraticCurveTo(0.6, 0.12, 0.46, 0.1);
    s.lineTo(0.4, -0.3); s.lineTo(0.26, -0.3); s.lineTo(0.24, -0.1); s.lineTo(-0.3, -0.1); s.lineTo(-0.34, -0.3); s.lineTo(-0.5, -0.3);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0, -0.07);
    return geos.dog = keepG(g);
  }
  // ── Süs katalogu: her biri Kit'e kendi parçalarını ekler (yerel: taban y=0, yukarı +y, boy ~0.5–0.8 m) ──
  // berry: true → çekirdek dokulu malzeme (çilek gövdesi). flame: mum alevi (ışıklı).
  const ITEMS = {
    cilek: { ad: 'Çilek', ikon: '🍓', parts(k, q) { q.berry.push([0, 0.02, 0, 1.15]); for (let i = 0; i < 5; i++) { const a = i * TAU2 / 5; k.add(G.cone(6), 0x3fae4a, [Math.sin(a) * 0.14, 0.98, Math.cos(a) * 0.14], [Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2], [0.08, 0.3, 0.03]); } k.add(G.cyl(1, 1, 6), 0x5b8a2a, [0, 1.08, 0], null, [0.03, 0.14, 0.03]); } },
    bogurtlen: { ad: 'Böğürtlen', ikon: '🫐', parts(k) { for (let j = 0; j < 4; j++) for (let i = 0; i < 7 - j; i++) { const a = i * TAU2 / (7 - j) + j, r = 0.2 - j * 0.04; k.add(G.sphere(8, 6), j % 2 ? 0x3a1d5a : 0x4b2470, [Math.sin(a) * r, 0.12 + j * 0.12, Math.cos(a) * r], null, 0.1); } k.add(G.sphere(8, 6), 0x55307e, [0, 0.6, 0], null, 0.09); } },
    yildiz: { ad: 'Şeker Yıldız', ikon: '⭐', parts(k) { k.add(starG(), 0xffd23f, [0, 0.5, 0], [0, 0.3, 0], 1); } },
    kremaCicek: { ad: 'Krema Çiçeği', ikon: '🌸', parts(k) { k.add(rosetteG(), 0xffb8d0, [0, 0, 0], null, [1.1, 0.9, 1.1]); k.add(G.sphere(8, 6), 0xffe066, [0, 0.82, 0], null, 0.08); } },
    serpme: { ad: 'Renkli Serpme', ikon: '🌈', parts(k) { const c = [0xff5d8f, 0x5ec8ff, 0xffd23f, 0x7ad16b, 0xb784ff, 0xff9a3c]; for (let i = 0; i < 16; i++) { const a = hash(i, 1, 2) * TAU2, r = Math.sqrt(hash(i, 3, 4)) * 0.5; k.add(G.capsule(1, 6), c[i % 6], [Math.sin(a) * r, 0.05, Math.cos(a) * r], [Math.PI / 2, hash(i, 5, 6) * 6, 0], [0.04, 0.06, 0.04]); } } },
    cikolata: { ad: 'Çikolata', ikon: '🍫', parts(k) { k.add(G.rbox(2), 0x6b3a1f, [0, 0.2, 0], [0.35, 0.4, 0], [0.62, 0.4, 0.1]); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) k.add(G.rbox(1), 0x7c4626, [-0.14 + i * 0.28, 0.1 + j * 0.2 - 0.0, 0.06], [0.35, 0.4, 0], [0.24, 0.16, 0.04]); } },
    mum: { ad: 'Mum', ikon: '🕯️', parts(k, q) { for (let i = 0; i < 6; i++) k.add(G.cyl(1, 1, 12), i % 2 ? 0xff8fb8 : 0xfff6fa, [0, 0.06 + i * 0.12, 0], null, [0.07, 0.12, 0.07]); k.add(G.cyl(1, 1, 6), 0x333333, [0, 0.8, 0], null, [0.012, 0.08, 0.012]); q.flame.push([0, 0.92, 0, 1]); } },
    bilboKurabiye: { ad: 'Bilbo Kurabiyesi', ikon: '🐶', parts(k) { k.add(dogG(), 0xc98a4b, [0, 0.42, 0], null, 0.9); k.add(G.sphere(8, 6), 0x3a2414, [0.46, 0.68, 0.1], null, 0.05); k.add(G.sphere(8, 6), 0x3a2414, [0.6, 0.6, 0.08], null, 0.05); k.add(G.sphere(8, 6), 0x5a3218, [0.32, 0.62, 0.02], [0, 0, 0.6], [0.1, 0.16, 0.06]); } },
    harfF: { ad: 'F Harfi', ikon: '🅵', parts(k) { k.add(letterFG(), 0x3a8ff0, [0, 0.52, 0], null, 1); } },
    kalp: { ad: 'Şeker Kalp', ikon: '💗', parts(k) { k.add(heartG(), 0xff4f7e, [0, 0.46, 0], null, 1); } },
    kiraz: { ad: 'Kiraz', ikon: '🍒', parts(k) { k.add(G.sphere(12, 10), 0xd0122e, [0, 0.24, 0], null, 0.24); k.add(G.sphere(8, 6), 0xff8090, [-0.08, 0.34, 0.12], null, 0.06); k.add(G.cyl(1, 1, 6), 0x5b7a2a, [0.05, 0.6, 0], [0, 0, -0.25], [0.025, 0.42, 0.025]); } },
    makaron: { ad: 'Makaron', ikon: '🧁', parts(k) { k.add(G.cyl(1, 1, 20), 0xa8e4c8, [0, 0.12, 0], null, [0.32, 0.14, 0.32]); k.add(G.cyl(1, 1, 20), 0xfff6ea, [0, 0.24, 0], null, [0.3, 0.1, 0.3]); k.add(G.cyl(1, 1, 20), 0xa8e4c8, [0, 0.36, 0], null, [0.32, 0.14, 0.32]); k.add(G.sphere(12, 8), 0xb8eed4, [0, 0.43, 0], null, [0.3, 0.06, 0.3]); } },
  };
  // açıklık sırası: ilk altısı hep açık; diğerleri çıkartma / pasta aşaması / günün sürprizi ile açılır
  const ORDER = ['cilek', 'kremaCicek', 'serpme', 'yildiz', 'kalp', 'mum', 'bogurtlen', 'cikolata', 'kiraz', 'bilboKurabiye', 'harfF', 'makaron'];
  const FREE = 6;
  function unlocked(P) {
    P = P || (typeof GAME !== 'undefined' && GAME.P) || {};
    const st = Object.keys(P.cikartmalar || {}).length, ac = P.acikSusler || {};
    return ORDER.filter((id, i) => i < FREE || ac[id] || st >= (i - FREE + 1) * 2);   // her 2 çıkartmada bir yeni süs
  }
  // ── Malzemeler (her model kendi kopyası; dünya bölüm değişince disposeTree temizler) ──
  let seedTex = null, crumbTex = null, topTex = null;
  function mats() {
    if (!seedTex) { seedTex = MASA.tex('seed', MASA.seedCanvas); seedTex.userData.keep = true; }
    if (!crumbTex) { crumbTex = MASA.tex('crumb', MASA.crumbCanvas, [6, 2]); topTex = MASA.tex('top', MASA.bakedTopCanvas); }
    return {
      crumb: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, map: crumbTex }),
      top: new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.75 }),
      cream: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0 }),
      gloss: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0 }),
      porc: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.05 }),
      metal: new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.25, metalness: 0.85 }),
      berry: new THREE.MeshStandardMaterial({ map: seedTex, roughness: 0.22 }),
      flame: new THREE.MeshBasicMaterial({ color: 0xffc04a }),
    };
  }
  const C = h => new THREE.Color(h);
  const mesh = (kit, mat, cast = true) => { const m = new THREE.Mesh(kit.build(), mat); m.castShadow = cast; m.receiveShadow = true; return m; };
  // Kek gövdesi rengi: kenarlarda kızarmış kabuk, ortası altın sarısı, gözenek gölgeleri
  const crumbCol = (yb, yt) => (x, y, z) => {
    const t = (y - yb) / Math.max(0.01, yt - yb), crust = Math.max(0, 1 - Math.min(t, 1 - t) * 7), n = hash(Math.round(x * 9), Math.round(y * 9), Math.round(z * 9));
    const c = C(0xf0c27a).lerp(C(0xc98a3e), crust * 0.75);
    return c.multiplyScalar(0.9 + n * 0.16);
  };
  function makeModel(stage, o = {}) {
    stage = Math.max(0, Math.min(4, stage | 0));
    const M = mats(), g = new THREE.Group(), surf = [];
    const D = DIM[stage], R = D.R, top = Y0 + D.H;
    // Porselen kek standı: ayak, sap, tabak (pembe şerit + altın kenar)
    const stand = new Kit();
    const sp = [[0.001, 0], [1.5, 0], [1.55, 0.06], [1.2, 0.14], [0.45, 0.22], [0.32, 0.38], [0.3, 0.44], [0.6, 0.48], [2.7, 0.5], [2.75, 0.5], [2.95, 0.5], [3.0, 0.5], [3.18, 0.5], [3.25, 0.52], [3.35, 0.56], [3.36, 0.6], [3.3, 0.62], [3.2, 0.62], [3.0, 0.62], [2.95, 0.62], [2.75, 0.62], [2.7, 0.62], [0.001, 0.62]];
    stand.add(lathe('stand2', sp, 64), (x, y, z) => { const r = Math.hypot(x, z); return r > 3.22 ? C(0xe6c46a) : r > 2.72 && r < 2.98 && y > 0.49 ? C(0xffb3cc) : C(0xfffcf8); });
    g.add(mesh(stand, M.porc));
    if (stage === 0) {   // boş tabak + kalıp halkası + biraz un
      const ring = new THREE.Mesh(geos.ring2 || (geos.ring2 = keepG(new THREE.CylinderGeometry(2.05, 2.05, 0.6, 56, 1, true))), M.metal);
      M.metal.color.set(0xeef1f5); M.metal.metalness = 0.55; M.metal.roughness = 0.35;
      ring.material.side = THREE.DoubleSide; ring.position.y = Y0 + 0.3; ring.castShadow = true; g.add(ring);
      const lip = new THREE.Mesh(G.torus(TAU2, 0.06, 56), M.metal); lip.rotation.x = Math.PI / 2; lip.scale.setScalar(2.05); lip.position.y = Y0 + 0.6; g.add(lip);   // yumuşak yuvarlak kenar
      const k = new Kit(); k.add(G.cyl(1, 1, 40), 0xfff8ee, [0, Y0 + 0.02, 0], null, [2.0, 0.04, 2.0]);
      for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 0.6 + (i % 3) * 0.5; k.add(G.sphere(10, 8), 0xffffff, [Math.sin(a) * r, Y0 + 0.04, Math.cos(a) * r], null, [0.35, 0.06, 0.3]); }
      const fm = mesh(k, M.crumb, false); g.add(fm); surf.push(fm);
    }
    const body = new Kit(), cream = new Kit(), gloss = new Kit(), berries = new Kit();
    let domeAt = null;
    const layer = (yb, h, r) => body.add(cylG('cake', 64, 6), crumbCol(yb, yb + h), [0, yb + h / 2, 0], null, [r, h, r]);
    if (stage >= 1 && stage < 4) {
      if (stage === 1) { layer(Y0, 1.0, R); domeAt = [Y0 + 1.0, 0.16]; }
      else {
        layer(Y0, 0.95, R);
        cream.add(cylG('cake', 64, 2), (x, y, z) => C(0xfff6ec), [0, Y0 + 1.0, 0], null, [R * 0.985, 0.12, R * 0.985]);
        if (stage >= 3) gloss.add(cylG('cake', 64, 2), () => C(0xe0304f), [0, Y0 + 1.08, 0], null, [R * 0.97, 0.08, R * 0.97]);
        layer(Y0 + (stage >= 3 ? 1.12 : 1.06), 1.02, R);
        if (stage === 2) domeAt = [Y0 + 2.08, 0.14];
        if (stage >= 3) {   // üstte çilek sosu ve çilek halkası, yanlarda damlalar
          gloss.add(G.cyl(1, 1, 56), () => C(0xe8344f), [0, top - 0.02, 0], null, [R * 0.93, 0.06, R * 0.93]);
          for (let i = 0; i < 12; i++) { const a = i * TAU2 / 12; berries.add(berryG(), 0xffffff, [Math.sin(a) * (R - 0.45), top - 0.04, Math.cos(a) * (R - 0.45)], [0.25 * Math.cos(a), 0, -0.25 * Math.sin(a)], 0.95); }
          for (let i = 0; i < 18; i++) { const a = (i + 0.5) * TAU2 / 18, l = 0.25 + hash(i, 2, 9) * 0.55; gloss.add(G.capsule(1, 8), () => C(0xe0304f), [Math.sin(a) * (R + 0.01), top - 0.08 - l / 2, Math.cos(a) * (R + 0.01)], null, [0.1, l * 0.5, 0.1]); }
        }
      }
    }
    if (stage === 4) {   // krema kaplı pasta: yuvarlak kenar, pembe-beyaz geçiş, gül sıkmalar, çilek sosu damlaları
      const rr = 0.22, pts = [[0.001, top], [R - rr, top]];
      for (let i = 1; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push([R - rr + Math.sin(a) * rr, top - rr + Math.cos(a) * rr]); }
      pts.push([R, Y0 + 0.02], [0.001, Y0 + 0.02]);
      cream.add(lathe('frost4', pts.reverse(), 72), (x, y, z) => C(0xffeef4).lerp(C(0xffc9dc), Math.min(1, Math.max(0, (top - y) / (top - Y0)) * 1.1)));
      gloss.add(G.sphere(40, 10), () => C(0xe8344f), [0, top + 0.01, 0], null, [R * 0.42, 0.08, R * 0.42]);
      for (let i = 0; i < 16; i++) { const a = (i + 0.3) * TAU2 / 16, l = 0.15 + hash(i, 4, 1) * 0.45, rr2 = R + 0.005; gloss.add(G.cyl(1, 1, 10), () => C(0xe8344f), [Math.sin(a) * rr2, top - 0.1 - l / 2, Math.cos(a) * rr2], null, [0.07, l, 0.07]); gloss.add(G.sphere(10, 8), () => C(0xe8344f), [Math.sin(a) * rr2, top - 0.1 - l, Math.cos(a) * rr2], null, [0.1, 0.12, 0.1]); }
      for (let i = 0; i < 16; i++) { const a = i * TAU2 / 16; cream.add(rosetteG(), () => C(0xfff4f8), [Math.sin(a) * (R - 0.3), top - 0.02, Math.cos(a) * (R - 0.3)], [0, a, 0], [0.62, 0.62, 0.62]); }
      for (let i = 0; i < 30; i++) { const a = i * TAU2 / 30; cream.add(rosetteG(), () => C(0xffd6e4), [Math.sin(a) * (R + 0.04), Y0, Math.cos(a) * (R + 0.04)], [0, a, 0], [0.42, 0.34, 0.42]); }
      for (let i = 0; i < 8; i++) { const a = (i + 0.5) * TAU2 / 8; berries.add(berryG(), 0xffffff, [Math.sin(a) * (R - 0.3), top + 0.36, Math.cos(a) * (R - 0.3)], [0.5, a, 0], 0.8); }
      const leaves = new Kit(); for (let i = 0; i < 8; i++) { const a = (i + 0.5) * TAU2 / 8; leaves.add(G.cone(6), 0x3fae4a, [Math.sin(a) * (R - 0.3), top + 1.0, Math.cos(a) * (R - 0.3)], [0.5, a, 0], [0.14, 0.12, 0.14]); }
      g.add(mesh(leaves, M.gloss));
      if (o.candles) {   // final sonrası 5 mum (Feza 5 yaşında)
        const k = new Kit(), fl = new Kit();
        for (let i = 0; i < 5; i++) {
          const a = i * TAU2 / 5, x = Math.sin(a) * 1.15, z = Math.cos(a) * 1.15;
          for (let j = 0; j < 8; j++) k.add(G.cyl(1, 1, 12), j % 2 ? [0xff8fb8, 0x8fd0ff, 0xffd23f, 0x9be08a, 0xc7a0ff][i] : 0xfffafc, [x, top + 0.08 + j * 0.11, z], null, [0.09, 0.11, 0.09]);
          fl.add(G.sphere(10, 8), 0xffd36a, [x, top + 1.1, z], null, [0.1, 0.2, 0.1]);
        }
        g.add(mesh(k, M.gloss)); const f = mesh(fl, M.flame, false); g.add(f);
      }
    }
    if (body.parts.length) { const m = mesh(body, M.crumb); g.add(m); surf.push(m); }
    if (domeAt) { const m = new THREE.Mesh(domeG(), M.top); m.position.y = domeAt[0]; m.scale.set(R * 0.995, domeAt[1], R * 0.995); m.castShadow = m.receiveShadow = true; g.add(m); surf.push(m); }
    if (cream.parts.length) { const m = mesh(cream, M.cream); g.add(m); surf.push(m); }
    if (gloss.parts.length) { const m = mesh(gloss, M.gloss); g.add(m); surf.push(m); }
    if (berries.parts.length) g.add(mesh(berries, M.berry));
    if (stage === 3) {   // çilek halkasının yaprakları
      const leaves = new Kit(); for (let i = 0; i < 12; i++) { const a = i * TAU2 / 12; leaves.add(G.cone(6), 0x3fae4a, [Math.sin(a) * (R - 0.45), top + 0.82, Math.cos(a) * (R - 0.45)], [0.25 * Math.cos(a), 0, -0.25 * Math.sin(a)], [0.14, 0.12, 0.14]); }
      g.add(mesh(leaves, M.gloss));
    }
    const deco = new THREE.Group(); deco.name = 'susler'; g.add(deco);
    const model = { group: g, R, y0: Y0, top, stage, surf, deco, M, decoMeshes: [] };
    model.setDecos = list => setDecos(model, list);
    model.dispose = () => { g.traverse(x => { if (x.geometry && !x.geometry.userData.keep && !x.geometry.userData.cached) x.geometry.dispose(); }); for (const k in M) M[k].dispose(); };
    return model;
  }
  // (a, h) ↔ yüzey noktası
  const SIDE = 0.45;   // h < SIDE: yan yüz (0 dip → SIDE üst kenar); h ≥ SIDE: üst yüz (kenar → orta)
  function surfPoint(model, a, h, out) {
    const R = model.R, y0 = model.y0, top = model.top;
    if (model.stage === 0) { const r = Math.max(0, (1 - h) * 2.2); out.p.set(Math.sin(a) * r, y0 + 0.06, Math.cos(a) * r); out.n.set(0, 1, 0); return out; }
    if (h < SIDE) { const y = y0 + 0.25 + (top - y0 - 0.45) * (h / SIDE); out.p.set(Math.sin(a) * (R + 0.02), y, Math.cos(a) * (R + 0.02)); out.n.set(Math.sin(a), 0, Math.cos(a)); }
    else { const r = Math.max(0, (R - 0.35) * (1 - (h - SIDE) / (1 - SIDE))); out.p.set(Math.sin(a) * r, top + 0.01, Math.cos(a) * r); out.n.set(0, 1, 0); }
    return out;
  }
  function surfParam(model, p, n) {   // yerel nokta → {a, h}
    const a = Math.atan2(p.x, p.z), r = Math.hypot(p.x, p.z), R = model.R;
    if (model.stage === 0) return { a, h: Math.max(0, Math.min(1, 1 - r / 2.2)) };
    if (n.y > 0.6 || p.y > model.top - 0.05) return { a, h: Math.max(SIDE, Math.min(1, SIDE + (1 - SIDE) * (1 - r / Math.max(0.1, R - 0.35)))) };
    return { a, h: Math.max(0, Math.min(SIDE - 0.01, SIDE * (p.y - model.y0 - 0.25) / Math.max(0.1, model.top - model.y0 - 0.45))) };
  }
  const _sp = { p: new THREE.Vector3(), n: new THREE.Vector3() }, _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
  // Süs geometrisi: tüm süsler tek Kit (renkli) + çilekler (dokulu) + alevler → en çok 3 çizim
  function setDecos(model, list) {
    for (const m of model.decoMeshes) { model.deco.remove(m); m.geometry.dispose(); }
    model.decoMeshes.length = 0;
    if (!list || !list.length) return;
    const k = new Kit(), kb = new Kit(), kf = new Kit();
    for (const d of list) {
      const it = ITEMS[d.id]; if (!it) continue;
      surfPoint(model, +d.a || 0, d.h == null ? 1 : +d.h, _sp);
      _q.setFromUnitVectors(_up, _sp.n);
      const yaw = new THREE.Quaternion().setFromAxisAngle(_up, _sp.n.y > 0.5 ? (d.r || 0) : (+d.a || 0));   // üstte: öne (kameraya) bakar; yanda: dışa
      const q = _q.clone().multiply(yaw), s = d.s || 1;
      const qq = { berry: [], flame: [] };
      k.push([_sp.p.x, _sp.p.y, _sp.p.z], q, s); it.parts(k, qq); k.pop();
      for (const b of qq.berry) { kb.push([_sp.p.x, _sp.p.y, _sp.p.z], q, s); kb.add(berryG(), 0xffffff, [b[0], b[1], b[2]], null, b[3] * 0.6); kb.pop(); }
      for (const f of qq.flame) { kf.push([_sp.p.x, _sp.p.y, _sp.p.z], q, s); kf.add(G.sphere(8, 6), 0xffcf5a, [f[0], f[1], f[2]], null, [0.07, 0.14, 0.07]); kf.pop(); }
    }
    const add = (kit, mat, cast) => { if (!kit.parts.length) return; const m = new THREE.Mesh(kit.build(), mat); m.castShadow = cast; m.receiveShadow = true; model.deco.add(m); model.decoMeshes.push(m); };
    add(k, model.M.gloss, true); add(kb, model.M.berry, true); add(kf, model.M.flame, false);
  }
  // ── Dünya pastası ──
  function decosNow() { const P = typeof GAME !== 'undefined' && GAME.P; return (P && P.pastaSusleri) || []; }
  function finalDone() { const P = typeof GAME !== 'undefined' && GAME.P; return !!(P && P.bossNese && P.bossNese.pasta); }
  function build(api, spot) {
    S.spot = spot; S.api = api;
    const root = new THREE.Group(); root.name = 'pasta'; root.position.set(spot.x, 0, spot.z);
    api.add(root); S.root = root;
    const st = typeof GAME !== 'undefined' && GAME.cakeStage ? GAME.cakeStage() : 0;
    const from = S.shown >= 0 && S.shown < st ? S.shown : st;   // yeni malzeme geldiyse eski aşamadan büyüyerek
    S.stage = -1; show(from);
    // yeni malzeme: hikâye (10_story) malzemeyi pastaya uçurur ve 'masaya döndük' der; pasta, malzeme varınca büyür (karşılama hikâyenin)
    if (from !== st) setTimeout(() => grow(st), 3300);
    S.shown = st;
    // pastanın çevresinde altın ışıltı (pişmiş ışık havuzu) ve tabak gölgesi
    api.glow(spot.x, spot.z, 5.5, 0xfff0d0, 0.12);
    // hafif dönen ışıltılar
    let t = 0; api.anim(dt => { t += dt; if (S.world) S.world.deco.rotation.y = 0; if (S.pop > 0) { S.pop = Math.max(0, S.pop - dt); const k = S.pop / 0.9, e = 1 + Math.sin((1 - k) * Math.PI * 3) * 0.12 * k; root.scale.set(1 / Math.sqrt(e), e, 1 / Math.sqrt(e)); } else root.scale.set(1, 1, 1); });
  }
  function show(n) {
    if (!S.root) return;
    if (S.world) { S.root.remove(S.world.group); S.world.dispose(); }
    S.world = makeModel(n, { candles: n === 4 && finalDone() });
    S.root.add(S.world.group); S.stage = n;
    S.world.setDecos(decosNow());
  }
  function grow(n) {
    if (!S.root || !S.root.parent) return;
    show(n); S.pop = 0.9;
    const A = typeof GAME !== 'undefined' && GAME.halaApi;
    if (A) {
      try { A.sfx('levelup', { vol: 0.8 }); } catch (e) { /* ses yok */ }
      for (let i = 0; i < 3; i++) setTimeout(() => { try { A.burst('confetti', S.spot.x, 2.5 + i, S.spot.z, {}); } catch (e) { /* yok */ } }, i * 220);
    }
    const key = 'masa_pasta' + n; if (typeof HUB !== 'undefined' && HUB.say) HUB.say(key, 2);
  }
  // n = 0..4: kaç malzeme geldi
  function setStage(n) { n = Math.max(0, Math.min(4, n | 0)); if (n === S.stage) return; if (S.root) grow(n); S.shown = n; }
  // süs: pos = { a: açı (rad), h: 0..1 }; GAME.addCakeDecoration kayda yazdıktan sonra çağırır → dünyadaki pastayı yenile
  function decorate(itemId, pos = {}) { if (S.world) S.world.setDecos(decosNow()); }
  function refresh() { if (S.world) S.world.setDecos(decosNow()); }
  function poke() { S.pop = 0.9; }   // dokununca pasta (ya da boş tabak) jöle gibi sallanır
  return { build, setStage, decorate, refresh, poke, makeModel, surfPoint, surfParam, setDecos, ITEMS, ORDER, unlocked, SIDE, DIM, Y0, _berryG: berryG, _mats: mats,
    get stage() { return S.stage; }, get spot() { return S.spot; }, _S: S };
})();

/* ── Masa dünyasının görsel kurulumu (BOLUM kur) ── */
MASA.kur = function (L, api) {
  'use strict';
  const T = MASA.T, TP = T.top, TAU3 = Math.PI * 2, hash = MASA.hash, THR = THREE;
  const texs = [];
  const tx = (key, draw, rep) => { const t = MASA.tex(key, draw, rep); texs.push(t); api.dispose(t); return t; };
  const own = (geo, mat, x, y, z, o = {}) => {   // kendi meshi (dokulu / saydam / hareketli)
    const m = new THR.Mesh(geo, mat); m.position.set(x, y, z);
    if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    m.castShadow = !!o.cast; m.receiveShadow = o.recv !== false; api.add(m); return m;
  };
  const kitMesh = (k, mat, cast = true) => { const m = new THR.Mesh(k.build(), mat); m.castShadow = cast; m.receiveShadow = true; api.add(m); return m; };
  const P = typeof GAME !== 'undefined' && GAME.P;
  if (api.floor) api.floor.visible = false;   // masa kendi ahşap yüzeyini çizer
  if (!L._title && typeof CAM !== 'undefined') {   // güvenli üs: kamera biraz geride (masanın daha çoğu görünsün); bölüm değişince eski uzaklık
    const prev = CAM.dist; CAM.dist = prev * 1.2; api.dispose({ dispose() { CAM.dist = prev; } });
  }
  const FLOOR_Y = -19.5;
  // ── 1) Masa: ahşap üst, yuvarlak kenar pervazı, bacaklar ──
  const tw = TP.x1 - TP.x0, td = TP.z1 - TP.z0, tcx = (TP.x0 + TP.x1) / 2, tcz = (TP.z0 + TP.z1) / 2;
  const wood = tx('wood', MASA.woodCanvas, [tw / 9, td / 9]);
  const woodMat = new THR.MeshStandardMaterial({ map: wood, roughness: 0.55, metalness: 0 });
  own(new THR.PlaneGeometry(tw, td), woodMat, tcx, 0, tcz, { rx: -Math.PI / 2 });
  const woodSide = tx('wood', MASA.woodCanvas, [tw / 9, 0.3]);
  const sideMat = new THR.MeshStandardMaterial({ map: woodSide, color: 0xd9b088, roughness: 0.5 });
  const nose = 0.7;   // pervaz: yuvarlak kenar (bullnose) + koyu alt bant
  for (const [x, z, len, rot] of [[tcx, TP.z1, tw, 0], [tcx, TP.z0, tw, 0], [TP.x0, tcz, td, 1], [TP.x1, tcz, td, 1]]) {
    const c = own(new THR.CylinderGeometry(nose, nose, len, 20, 1), sideMat, x, -nose, z, { rz: rot ? 0 : Math.PI / 2, rx: rot ? Math.PI / 2 : 0, cast: true });
    const b = own(new THR.BoxGeometry(rot ? 0.9 : len, 1.6, rot ? len : 0.9), sideMat, x + (rot ? (x < tcx ? 0.35 : -0.35) : 0), -1.9, z + (rot ? 0 : (z < tcz ? 0.35 : -0.35)));
  }
  const legK = new Kit();
  for (const [x, z] of [[TP.x0 + 3, TP.z0 + 3], [TP.x1 - 3, TP.z0 + 3], [TP.x0 + 3, TP.z1 - 3], [TP.x1 - 3, TP.z1 - 3]]) {
    legK.add(G.cyl(1, 0.78, 20), 0xb57c4c, [x, (FLOOR_Y - 2.6) / 2, z], null, [2.1, -FLOOR_Y - 2.6, 2.1]);
    legK.add(G.sphere(16, 10), 0xc58a58, [x, -3.4, z], null, [2.4, 0.8, 2.4]);
  }
  kitMesh(legK, new THR.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  // ── 2) Kareli masa örtüsü: güneydoğu yarısını örter, güney ve doğu kenardan sarkar, fırfırlı ucu ──
  const cl = { x0: 30, x1: TP.x1 + 0.9, z0: 33.5, z1: TP.z1 + 0.9 };
  const ging = tx('ging', () => MASA.ginghamCanvas(), [(cl.x1 - cl.x0) / 3.2, (cl.z1 - cl.z0) / 3.2]);
  const clothMat = new THR.MeshStandardMaterial({ map: ging, roughness: 0.92, side: THR.DoubleSide });
  {
    const g = new THR.PlaneGeometry(cl.x1 - cl.x0, cl.z1 - cl.z0, 40, 20), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.08 + 0.03 * Math.sin(x * 0.9 + y * 0.4) * Math.sin(y * 0.7)); }
    g.computeVertexNormals();
    own(g, clothMat, (cl.x0 + cl.x1) / 2, 0, (cl.z0 + cl.z1) / 2, { rx: -Math.PI / 2 });
    // sarkan kısımlar: dalgalı kıvrımlar
    const hang = (len, ax) => {
      const g2 = new THR.PlaneGeometry(len, 7.5, 60, 10), q = g2.attributes.position;
      for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), k = (3.75 - y) / 7.5; q.setZ(i, (0.35 + 0.55 * k) * Math.sin(x * 1.4) + k * 0.6); }
      g2.computeVertexNormals(); return g2;
    };
    const s = own(hang(cl.x1 - cl.x0, 0), clothMat, (cl.x0 + cl.x1) / 2, -3.7, cl.z1 + 0.15, { cast: false });
    const e = own(hang(cl.z1 - cl.z0, 1), clothMat, cl.x1 + 0.15, -3.7, (cl.z0 + cl.z1) / 2, { ry: Math.PI / 2, cast: false });
    // fırfır: örtünün açık kenarlarında küçük beyaz dalgalar (birleşik süs)
    for (let x = cl.x0; x < cl.x1; x += 0.7) api.put(G.sphere(10, 6), x, 0.07, cl.z0, 0.42, 0.09, 0.3, 0xfff4ee, 0, 0, 0, 'shiny');
    for (let z = cl.z0; z < cl.z1; z += 0.7) api.put(G.sphere(10, 6), cl.x0, 0.07, z, 0.3, 0.09, 0.42, 0xfff4ee, 0, 0, 0, 'shiny');
  }
  // ── 3) Aşağıda dev mutfak: karo zemin, tezgâh, pencere (sabah güneşi), saksılar, buzdolabı, sandalyeler ──
  const tile = tx('tile', MASA.tileCanvas, [26, 26]);
  own(new THR.PlaneGeometry(260, 260), new THR.MeshStandardMaterial({ map: tile, roughness: 0.45 }), 36, FLOOR_Y, 10, { rx: -Math.PI / 2 });
  const WZ = -30;   // arka duvar
  const wallT = tx('wall', MASA.wallCanvas, [40, 16]);
  own(new THR.PlaneGeometry(240, 100), new THR.MeshStandardMaterial({ map: wallT, roughness: 0.6 }), 36, FLOOR_Y + 50, WZ, { recv: false });
  const K = new Kit();   // tezgâh + dolaplar + buzdolabı + pencere çerçevesi + saksılar (tek çizim)
  const CT = 4.2;   // tezgâh üstü (masanın 4 m üstü)
  K.add(G.box(), 0xf4ede0, [12, (FLOOR_Y + CT) / 2, WZ + 7], null, [104, CT - FLOOR_Y, 14]);
  K.add(G.rbox(2), 0xe9e2d6, [12, CT + 0.5, WZ + 7.4], null, [106, 1.0, 15]);   // mermer tezgâh üstü
  for (let i = 0; i < 8; i++) {   // dolap kapakları + kulplar
    const x = -36 + i * 12.5;
    K.add(G.rbox(2), 0xa9d3c4, [x, FLOOR_Y + 12.5, WZ + 14.1], null, [11.6, 21, 0.6]);
    K.add(G.cyl(1, 1, 10), 0xd8b45a, [x + 4.5, FLOOR_Y + 19, WZ + 14.6], [Math.PI / 2, 0, 0], [0.35, 0.8, 0.35]);
  }
  K.add(G.box(), 0x8a9a96, [12, FLOOR_Y + 0.8, WZ + 13.6], null, [104, 1.6, 0.6]);
  // pencere: çerçeve, kayıtlar, denizlik
  const WX = 30, WY0 = CT + 3, WY1 = CT + 26, WW = 30;
  K.add(G.box(), 0xffffff, [WX, (WY0 + WY1) / 2, WZ + 0.4], null, [WW + 2.4, WY1 - WY0 + 2.4, 0.8]);
  K.add(G.rbox(2), 0xffffff, [WX, WY0 - 0.6, WZ + 1.6], null, [WW + 4, 0.9, 3.4]);
  // perdeler: pembe kıvrımlı (dikey kapsüller)
  for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) K.add(G.capsule(4, 8), i % 2 ? 0xf6b4c4 : 0xfac8d4, [WX + sd * (WW / 2 + 1.2 + i * 1.1), (WY0 + WY1) / 2 + 1, WZ + 2.2], null, [0.9, 3.6, 0.9]);
  K.add(G.cyl(1, 1, 10), 0xd8b45a, [WX, WY1 + 2.2, WZ + 2.2], [0, 0, Math.PI / 2], [0.3, WW + 18, 0.3]);
  // saksılar (terrakota, yeşil yapraklar) denizlikte
  for (const [x, s, c] of [[WX - 9, 1.2, 0x5aa85e], [WX + 1, 1.5, 0x4c9c58], [WX + 10, 1.0, 0x6cbc68]]) {
    K.add(G.cyl(1.1, 0.8, 18), 0xd4825a, [x, WY0 + 1.6 * s, WZ + 2.6], null, [1.7 * s, 3.2 * s, 1.7 * s]);
    K.add(G.cyl(1, 1, 18), 0xe0946a, [x, WY0 + 3.2 * s, WZ + 2.6], null, [1.95 * s, 0.6 * s, 1.95 * s]);
    for (let j = 0; j < 9; j++) { const a = j * 2.4, r = 1.3 * s; K.add(G.sphere(10, 8), j % 2 ? c : 0x7ccf74, [x + Math.sin(a) * r * 0.8, WY0 + (4.6 + (j % 3) * 1.3) * s, WZ + 2.6 + Math.cos(a) * r * 0.6], [0, a, 0.5], [1.3 * s, 0.5 * s, 0.8 * s]); }
    K.add(G.sphere(10, 8), 0xff7fa8, [x + 0.5 * s, WY0 + 6.6 * s, WZ + 3.0], null, 0.5 * s);
  }
  // buzdolabı (doğuda, yerde): yuvarlak hatlı nane-krem, kulp, mıknatıslar, Feza'nın resmi
  const FX = 78, FZ = WZ + 9;
  K.add(G.rbox(3), 0xd9f1ea, [FX, FLOOR_Y + 27, FZ], null, [20, 54, 17]);
  K.add(G.box(), 0xbfdcd3, [FX, FLOOR_Y + 36, FZ + 8.55], null, [19.6, 0.4, 0.3]);
  K.add(G.rbox(2), 0xc9ced4, [FX - 7.5, FLOOR_Y + 44, FZ + 9.2], null, [1.0, 8, 1.2]);
  K.add(G.rbox(2), 0xc9ced4, [FX - 7.5, FLOOR_Y + 26, FZ + 9.2], null, [1.0, 8, 1.2]);
  K.add(G.box(), 0xffffff, [FX + 1.5, FLOOR_Y + 44.5, FZ + 8.7], [0, 0, 0.06], [7, 8.5, 0.15]);   // Feza'nın çizimi (kâğıt)
  for (const [x, y, c] of [[FX - 1, 47, 0xffd23f], [FX + 3.5, 42, 0x5ec8ff], [FX + 0.5, 42.5, 0x7ad16b], [FX + 3, 47.5, 0xff8fb8]]) K.add(G.sphere(10, 8), c, [x, FLOOR_Y + y, FZ + 8.85], null, [0.8, 0.8, 0.25]);
  K.add(G.sphere(12, 8), 0xff5d8f, [FX + 1.5, FLOOR_Y + 49.2, FZ + 9.0], null, [0.9, 0.9, 0.5]);
  for (const [x, y, c] of [[FX - 4, 33, 0xff5a5a], [FX + 5, 30, 0xffd23f], [FX - 2, 25, 0x7ad16b]]) K.add(G.sphere(10, 8), c, [x, FLOOR_Y + y, FZ + 8.9], null, [1.1, 1.1, 0.5]);
  // sandalyeler (batı ve doğu): oturak masanın altında, arkalıkları kenardan yükselir
  for (const [cx2, sd] of [[TP.x0 - 7, -1], [TP.x1 + 7, 1]]) {
    const cz2 = tcz + 2, seatY = FLOOR_Y + 11;
    K.add(G.rbox(2), 0xb27a4a, [cx2, seatY, cz2], null, [11, 1.4, 12]);
    for (const [dx, dz] of [[-4.6, -5], [4.6, -5], [-4.6, 5], [4.6, 5]]) K.add(G.cyl(1, 0.8, 10), 0xa06c40, [cx2 + dx, (FLOOR_Y + seatY) / 2, cz2 + dz], null, [0.6, seatY - FLOOR_Y, 0.6]);
    const bx = cx2 + sd * 5.2;
    for (const dz of [-5, 5]) K.add(G.cyl(1, 1, 10), 0xa06c40, [bx, seatY + 9, cz2 + dz], null, [0.65, 18, 0.65]);
    K.add(G.rbox(2), 0xb27a4a, [bx, seatY + 17.5, cz2], null, [1.2, 3.2, 11.6]);
    for (let i = 0; i < 4; i++) K.add(G.cyl(1, 1, 8), 0xb98450, [bx, seatY + 9, cz2 - 3 + i * 2], null, [0.35, 14, 0.35]);
  }
  kitMesh(K, new THR.MeshStandardMaterial({ vertexColors: true, roughness: 0.42 }), false);
  // pencere camı: sabah göğü (ışıklı) + kayıtlar
  const sky = tx('sky', MASA.skyCanvas);
  own(new THR.PlaneGeometry(WW, WY1 - WY0), new THR.MeshBasicMaterial({ map: sky, fog: false }), WX, (WY0 + WY1) / 2, WZ + 0.85, { recv: false });
  const mull = new Kit();
  mull.add(G.box(), 0xffffff, [WX, (WY0 + WY1) / 2, WZ + 1.0], null, [0.7, WY1 - WY0, 0.5]);
  mull.add(G.box(), 0xffffff, [WX, (WY0 + WY1) / 2 + 2, WZ + 1.0], null, [WW, 0.7, 0.5]);
  kitMesh(mull, new THR.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }), false);
  // güneş huzmeleri: pencereden masaya inen yumuşak ışık (toplamsal, saydam)
  const ray = tx('ray', () => { const c = MASA.cv(64, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,240,200,0.55)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 64, 256); return c; });
  const rayMat = new THR.MeshBasicMaterial({ map: ray, transparent: true, opacity: 0.32, blending: THR.AdditiveBlending, depthWrite: false, side: THR.DoubleSide, fog: false });
  const rays = [];
  for (let i = 0; i < 4; i++) {
    const m = own(new THR.PlaneGeometry(4 + i, 46), rayMat, WX - 9 + i * 6, CT + 8, WZ + 20, { rx: -0.95, ry: 0.1 - i * 0.05, recv: false });
    m.renderOrder = 2; rays.push(m);
  }
  // masada güneş lekesi (pencereden gelen sıcak ışık havuzu)
  const pool = tx('pool', () => MASA.radialCanvas('rgba(255,236,190,0.55)', 'rgba(255,236,190,0)'));
  const poolMat = new THR.MeshBasicMaterial({ map: pool, transparent: true, blending: THR.AdditiveBlending, depthWrite: false, fog: false });
  own(new THR.PlaneGeometry(26, 16), poolMat, 30, 0.06, 22, { rx: -Math.PI / 2, recv: false }).renderOrder = 1;
  // ── 4) Masadaki dev eşyalar ──
  const D = new Kit();   // opak, renkli eşyalar (tek çizim)
  // Dev un torbası (kuzeybatı köşe): kraft kâğıt, mavi bant, buğday başağı; ağzı açık, un dökülmüş (Bilbo'nun burnunu soktuğu yer)
  const FBx = 13.4, FBz = 13.0;
  D.add(G.rbox(3), 0xefe1c4, [FBx, 3.2, FBz], [0, 0.25, 0], [6.2, 6.4, 4.6]);
  D.add(G.rbox(2), 0xe6d4b0, [FBx, 6.8, FBz], [0.15, 0.25, 0], [5.9, 1.3, 4.0]);   // kıvrık ağız
  D.add(G.box(), 0x5d8fd6, [FBx + 0.57, 3.0, FBz + 2.2], [0, 0.25, 0], [5.9, 1.8, 0.2]);   // mavi bant
  for (let i = 0; i < 5; i++) D.add(G.sphere(8, 6), 0xf2c25a, [FBx + 0.2 + i * 0.3, 3.3 + i * 0.42, FBz + 2.4], [0, 0.25, 0.4], [0.25, 0.42, 0.12]);   // buğday
  for (let i = 0; i < 9; i++) { const a = i * 0.9, r = 1 + (i % 3) * 1.4; D.add(G.sphere(12, 8), 0xffffff, [FBx + 3.2 + Math.sin(a) * r * 0.7, 0.12, FBz + 3.4 + Math.cos(a) * r * 0.5], null, [1.2, 0.28 + (i % 2) * 0.2, 1.0]); }   // dökülmüş un
  for (let i = 0; i < 6; i++) D.add(G.sphere(12, 8), 0xfffdf8, [FBx + (i - 2.5) * 0.7, 7.4 + (i % 2) * 0.25, FBz + 0.2], null, [0.7, 0.4, 0.7]);
  // Çay bardağı (ince belli) + tabağı + şeker küpü + kaşık (kuzeydoğu)
  const TGx = 59.4, TGz = 16.2;
  D.add(G.cyl(1, 0.85, 32), 0xffffff, [TGx, 0.12, TGz], null, [2.3, 0.24, 2.3]);
  D.add(G.torus(TAU3, 0.08, 32), 0xd0303e, [TGx, 0.25, TGz], [Math.PI / 2, 0, 0], [2.05, 2.05, 2.05]);
  D.add(G.rbox(2), 0xfffefa, [TGx - 2.8, 0.45, TGz + 1.6], [0, 0.4, 0], [0.9, 0.9, 0.9]);
  D.add(G.rbox(2), 0xfffefa, [TGx - 3.5, 0.45, TGz + 0.5], [0, 0.9, 0], [0.9, 0.9, 0.9]);
  D.add(G.capsule(4, 8), 0xc8ccd2, [TGx + 1.6, 0.42, TGz + 1.8], [Math.PI / 2, 0.6, 0], [0.18, 0.5, 0.18]);
  D.add(G.sphere(12, 8), 0xc8ccd2, [TGx + 2.6, 0.42, TGz + 3.1], [0, 0.6, 0], [0.5, 0.15, 0.7]);
  // Tuzluk-biberlik (doğu kenar): cam gövde, gümüş kapak
  for (const [x, z, c] of [[59.3, 27.0, 0xfdfdfd], [59.5, 30.4, 0x5a4a44]]) {
    D.add(G.cyl(0.92, 1, 24), c, [x, 1.2, z], null, [0.95, 2.4, 0.95]);
    D.add(G.hemi(20), 0xd8dde4, [x, 2.4, z], null, [0.92, 0.75, 0.92]);
    D.add(G.cyl(1, 1, 24), 0xc6ccd4, [x, 2.42, z], null, [0.96, 0.18, 0.96]);
  }
  // Kurabiye kavanozu (batı kenar): kurabiyeler (cam ayrı)
  const CJx = 12.9, CJz = 30.5;
  for (let i = 0; i < 9; i++) D.add(G.cyl(1, 1, 18), i % 3 ? 0xd59a55 : 0x8a5430, [CJx + Math.sin(i * 2.1) * 0.8, 0.5 + i * 0.36, CJz + Math.cos(i * 2.1) * 0.6], [0.5 + i * 0.3, 0, 0.4], [0.75, 0.16, 0.75]);
  D.add(G.cyl(1, 1, 28), 0xe4b884, [CJx, 4.15, CJz], null, [1.85, 0.4, 1.85]);   // tahta kapak
  D.add(G.sphere(16, 10), 0xd4a46c, [CJx, 4.6, CJz], null, [0.55, 0.45, 0.55]);
  // Tarif defteri (güneybatı, düz: Feza üstünde yürür) + kalem
  const NBx = 26.2, NBz = 42.3;
  D.add(G.box(), 0xd0605a, [NBx, 0.05, NBz], [0, 0.08, 0], [7.4, 0.1, 4.8]);
  for (let i = 0; i < 9; i++) D.add(G.torus(TAU3, 0.18, 12), 0xc8ccd2, [NBx - 0.02 + (i - 4) * 0.02, 0.18, NBz - 2.0 + i * 0.5], [0, Math.PI / 2 + 0.08, 0], [0.26, 0.26, 0.26]);
  D.add(G.cyl(1, 1, 12), 0x3f7fd8, [NBx + 5.6, 0.26, NBz + 0.9], [0, 0.4, Math.PI / 2], [0.24, 4.4, 0.24]);
  D.add(G.cone(12), 0xf2d6a8, [NBx + 3.35, 0.26, NBz + 1.75], [0, 0.4, Math.PI / 2], [0.24, 0.6, 0.24]);
  D.add(G.cyl(1, 1, 12), 0xffffff, [NBx + 7.65, 0.26, NBz + 0.06], [0, 0.4, Math.PI / 2], [0.26, 0.26, 0.26]);
  kitMesh(D, new THR.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
  // defter sayfaları: çizgili, pasta çizimi, kalpler (doku)
  const page = tx('page', () => {
    const c = MASA.cv(512, 320), g = c.getContext('2d');
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 512, 320);
    g.strokeStyle = '#9cc4e8'; g.lineWidth = 2; for (let y = 40; y < 320; y += 22) { g.beginPath(); g.moveTo(10, y); g.lineTo(246, y); g.moveTo(266, y); g.lineTo(502, y); g.stroke(); }
    g.strokeStyle = '#e8a0a8'; g.beginPath(); g.moveTo(40, 0); g.lineTo(40, 320); g.moveTo(296, 0); g.lineTo(296, 320); g.stroke();
    g.fillStyle = 'rgba(120,80,60,0.12)'; g.fillRect(250, 0, 12, 320);
    // pasta çizimi (sağ sayfa)
    g.fillStyle = '#ffd1df'; g.fillRect(330, 170, 130, 70); g.fillStyle = '#f7b7c9'; g.fillRect(345, 120, 100, 52);
    g.fillStyle = '#e8344f'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(352 + i * 22, 118, 9, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffcf5a'; g.fillRect(392, 82, 6, 26); g.beginPath(); g.ellipse(395, 74, 6, 10, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#a0582f'; g.lineWidth = 3; g.strokeRect(330, 170, 130, 70); g.strokeRect(345, 120, 100, 52);
    // sol sayfa: el yazısı gibi dalgalı satırlar + kalpler + yumurta/un/çilek resmi
    g.strokeStyle = '#7a5a8a'; g.lineWidth = 3;
    for (let r = 0; r < 6; r++) { g.beginPath(); for (let x = 60; x < 220 - (r % 3) * 30; x += 4) { const y = 58 + r * 44 + Math.sin(x * 0.35 + r) * 3; if (x === 60) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = '#ff6b8f'; for (const [x, y] of [[225, 60], [470, 50], [300, 280]]) { g.beginPath(); g.moveTo(x, y + 8); g.bezierCurveTo(x - 14, y - 4, x - 6, y - 14, x, y - 4); g.bezierCurveTo(x + 6, y - 14, x + 14, y - 4, x, y + 8); g.fill(); }
    return c;
  });
  {
    const g = new THR.PlaneGeometry(7.0, 4.5, 16, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.12 + 0.18 * Math.pow(Math.abs(x) / 3.5, 0.6) * (Math.abs(x) > 0.3 ? 1 : 0) - (Math.abs(x) < 0.3 ? 0.05 : 0)); }
    g.computeVertexNormals();
    own(g, new THR.MeshStandardMaterial({ map: page, roughness: 0.9 }), NBx, 0.0, NBz, { rx: -Math.PI / 2, rz: 0.08 });
  }
  // Saydam camlar: çay bardağı (içinde çay), kurabiye kavanozu, tuzluk camı
  const glassMat = new THR.MeshStandardMaterial({ color: 0xeef8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, side: THR.DoubleSide });
  const tulip = [[0.001, 0.24], [1.0, 0.26], [1.15, 0.6], [0.95, 1.5], [0.82, 2.1], [0.95, 2.8], [1.25, 3.6], [1.32, 3.9]].map(p => MASA.V2(p[0], p[1]));
  own(new THR.LatheGeometry(tulip, 36), glassMat, TGx, 0, TGz, { recv: false }).renderOrder = 3;
  const tea = [[0.001, 0.3], [0.92, 0.32], [1.05, 0.6], [0.87, 1.5], [0.75, 2.1], [0.86, 2.75], [0.001, 2.75]].map(p => MASA.V2(p[0], p[1]));
  own(new THR.LatheGeometry(tea, 36), new THR.MeshStandardMaterial({ color: 0xb6461c, roughness: 0.1, emissive: 0x5a1a04, emissiveIntensity: 0.35, transparent: true, opacity: 0.88 }), TGx, 0, TGz);
  const jar = [[0.001, 0.0], [1.9, 0.02], [2.0, 0.3], [2.0, 3.6], [1.75, 3.9], [1.75, 4.0]].map(p => MASA.V2(p[0], p[1]));
  own(new THR.LatheGeometry(jar, 36), glassMat, CJx, 0, CJz, { recv: false }).renderOrder = 3;
  // çay buharı: yükselen yumuşak bulutçuklar
  const puffTex = tx('puff', () => MASA.radialCanvas('rgba(255,255,255,0.7)', 'rgba(255,255,255,0)'));
  const steam = [];
  for (let i = 0; i < 4; i++) { const s = new THR.Sprite(new THR.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0.0 })); s.position.set(TGx, 4, TGz); api.add(s); steam.push({ s, t: i * 0.9 }); }
  // un tozu: torbanın üstünde süzülen parıltılı toz
  const dust = [];
  for (let i = 0; i < 6; i++) { const s = new THR.Sprite(new THR.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0.5 })); api.add(s); dust.push({ s, t: i * 1.3 }); }
  api.solid(FBx, FBz, 3.6, 'un'); api.solid(TGx, TGz, 2.2, 'cay'); api.solid(CJx, CJz, 2.1, 'kavanoz');
  api.solid(59.3, 27.0, 1.05, 'tuz'); api.solid(59.5, 30.4, 1.05, 'biber');
  // ── 5) Yerde dağılmış sihirli şekerler (renkli, parlak; birleşik süs) ──
  const SC = [0xff5d8f, 0x5ec8ff, 0xffd23f, 0x7ad16b, 0xb784ff, 0xff9a3c, 0xff7fd0];
  const busy = (x, z) => Math.hypot(x - T.cake.x, z - T.cake.z) < 5 || Object.values(T.st).some(s => Math.hypot(x - s.x, z - s.z) < 3.6) || Object.values(T.toys).some(s => Math.hypot(x - s.x, z - s.z) < 3) || T.doors.some(d => Math.abs(x - d.x) < 3 && z < T.z0 + 4) || (x < 34 && z > 39.4 && x > 22) || (x < 23 && z > 33 && z < 40);
  let n = 0;
  for (let i = 0; i < 400 && n < 64; i++) {
    const x = T.x0 + 1 + hash(i, 7, 3) * (T.x1 - T.x0 - 2), z = T.z0 + 1 + hash(i, 9, 5) * (T.z1 - T.z0 - 2);
    if (busy(x, z)) continue;
    const c = SC[n % SC.length], k = n % 4, yaw = hash(i, 2, 2) * 6;
    if (k === 0) { api.put(G.hemi(14), x, 0, z, 0.32, 0.36, 0.32, c, yaw, 0, 0, 'shiny'); }                        // jelibon
    else if (k === 1) { api.put(G.capsule(1, 8), x, 0.16, z, 0.16, 0.2, 0.16, c, yaw, Math.PI / 2, 0, 'shiny'); }   // fasulye şeker
    else if (k === 2) { api.put(G.sphere(12, 8), x, 0.2, z, 0.22, 0.2, 0.22, c, yaw, 0, 0, 'shiny'); api.put(G.cone(8), x + 0.3, 0.2, z, 0.12, 0.22, 0.12, c, yaw, 0, Math.PI / 2, 'shiny'); api.put(G.cone(8), x - 0.3, 0.2, z, 0.12, 0.22, 0.12, c, yaw, 0, -Math.PI / 2, 'shiny'); }   // ambalajlı şeker
    else api.put(G.octa(), x, 0.14, z, 0.2, 0.14, 0.2, c, yaw, 0, 0, 'shiny');                                       // şeker kristali
    n++;
  }
  // ── 6) Kapılar: kemerli peri kapısı, oda rozeti, aşağı inen rampa; Pasta Krallığı kilitliyse 3 malzeme yuvası ──
  const archShape = (w, h, inner) => {
    const s = new THR.Shape(), r = w / 2;
    s.moveTo(-r, 0); s.lineTo(-r, h - r); s.absarc(0, h - r, r, Math.PI, 0, true); s.lineTo(r, 0); s.lineTo(-r, 0);
    if (inner) { const hole = new THR.Path(), ri = inner.w / 2; hole.moveTo(-ri, 0); hole.lineTo(ri, 0); hole.lineTo(ri, inner.h - ri); hole.absarc(0, inner.h - ri, ri, 0, Math.PI, false); hole.lineTo(-ri, 0); s.holes.push(hole); }
    return s;
  };
  const frameGeo = new THR.ExtrudeGeometry(archShape(3.3, 4.3, { w: 2.3, h: 3.4 }), { depth: 0.55, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.16, bevelSegments: 3, curveSegments: 24 });
  const holeGeo = new THR.ShapeGeometry(archShape(2.3, 3.4), 24);
  { const p = holeGeo.attributes.position, uv = holeGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 1.15) / 2.3, p.getY(i) / 3.4); }
  // kapının içinden odanın küçük resmi (okumadan anlaşılsın: kapı nereye gidiyor)
  const roomPic = zone => () => {
    const c = MASA.cv(256, 384), g = c.getContext('2d'), F = (col, x, y, w, h, r = 0) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
    const grad = (a, b2, y0 = 0, y1 = 384) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b2); return q; };
    if (zone === 'oturma') {
      g.fillStyle = grad('#9fb4cf', '#dfe8f3', 0, 260); g.fillRect(0, 0, 256, 260);
      for (let i = 0; i < 9; i++) F(i % 2 ? '#b07a4c' : '#c48a58', i * 30 - 10, 260, 34, 124);
      g.fillStyle = '#e9e4dc'; g.beginPath(); g.ellipse(128, 320, 120, 40, 0, 0, 6.283); g.fill();
      g.strokeStyle = '#7f95b5'; g.lineWidth = 6; g.beginPath(); for (let x = 18; x < 240; x += 18) g.lineTo(x, 320 + ((x / 18) % 2 ? -14 : 14)); g.stroke();
      F('#6f87ad', 30, 190, 196, 70, 22); F('#8aa2c6', 40, 160, 176, 50, 20); F('#7d94b9', 22, 175, 34, 80, 14); F('#7d94b9', 200, 175, 34, 80, 14);
      F('#2a2d36', 70, 60, 116, 74, 8); F('#79c4ff', 78, 67, 100, 60, 4); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(128, 97, 14, 0, 6.283); g.fill();
      F('#f2f2f2', 204, 112, 22, 40, 8); for (const [x, y, col] of [[208, 100, '#ffd23f'], [222, 96, '#ff8fb8'], [214, 88, '#ffd23f']]) { g.fillStyle = col; g.beginPath(); g.arc(x, y, 9, 0, 6.283); g.fill(); }
    } else if (zone === 'mutfak') {
      g.fillStyle = grad('#fff3df', '#f6e3c4', 0, 230); g.fillRect(0, 0, 256, 230);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) F((i + j) % 2 ? '#cfeee0' : '#e3f6ec', i * 32 + 2, 120 + j * 26, 28, 22, 4);
      F('#f7f7f4', 0, 226, 256, 18); F('#c9905a', 0, 244, 256, 140); for (let i = 0; i < 4; i++) F('#b47c48', 10 + i * 62, 256, 54, 110, 8);
      F('#a8b2bc', 40, 160, 80, 66, 14); F('#8a949e', 40, 156, 80, 12, 6); F('#2a2a2a', 70, 146, 20, 12, 4);
      g.fillStyle = 'rgba(255,255,255,0.8)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(70 + k * 12, 128 - k * 18, 10 + k * 3, 0, 6.283); g.fill(); }
      F('#f0e2c4', 160, 150, 60, 76, 16); F('#5d8fd6', 160, 186, 60, 16); g.fillStyle = '#fff'; g.beginPath(); g.arc(190, 146, 20, 0, 6.283); g.fill();
      F('#ffd88a', 100, 40, 56, 56, 28); g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(128, 68, 18, 0, 6.283); g.fill();
    } else if (zone === 'buzdolabi') {
      g.fillStyle = grad('#bfe9ff', '#eefaff'); g.fillRect(0, 0, 256, 384);
      for (const y of [110, 220, 320]) { F('rgba(255,255,255,0.9)', 8, y, 240, 8, 4); }
      for (let i = 0; i < 3; i++) { F('#ffffff', 24 + i * 34, 40 + 0, 26, 70, 10); F('#9fd6ef', 24 + i * 34, 30, 26, 14, 6); }
      F('#ff8fb8', 140, 70, 70, 40, 18); F('#ffb8d0', 150, 58, 50, 18, 9);
      for (let i = 0; i < 3; i++) { const x = 40 + i * 70; g.fillStyle = '#e8b878'; g.beginPath(); g.moveTo(x - 16, 180); g.lineTo(x + 16, 180); g.lineTo(x, 216); g.fill(); g.fillStyle = ['#ffd6e4', '#fff3c4', '#c8f0d8'][i]; g.beginPath(); g.arc(x, 172, 20, 0, 6.283); g.fill(); }
      F('#a8e0ff', 30, 250, 60, 60, 10); F('#d0f0ff', 110, 262, 50, 48, 10); F('#a8e0ff', 180, 256, 52, 54, 10);
      g.fillStyle = '#fff'; for (let k = 0; k < 18; k++) { const x = Math.random() * 256, y = Math.random() * 384; g.fillRect(x, y, 3, 3); }
    } else if (zone === 'balkon') {
      g.fillStyle = grad('#8fd0ff', '#e8f6ff', 0, 260); g.fillRect(0, 0, 256, 260);
      g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(196, 60, 26, 0, 6.283); g.fill();
      F('#c97a4a', 0, 250, 256, 134); for (let i = 0; i < 6; i++) F(i % 2 ? '#d98a58' : '#bf6e40', i * 44, 250, 40, 134, 2);
      for (let i = 0; i < 7; i++) F('#ffffff', 6 + i * 36, 170, 10, 80, 4); F('#ffffff', 0, 166, 256, 10, 4);
      for (const [x, c] of [[50, '#ffd23f'], [128, '#ff7aa8'], [206, '#ffffff']]) { F('#d4825a', x - 26, 270, 52, 50, 10); g.fillStyle = '#5aa85e'; g.fillRect(x - 3, 200, 6, 72);
        for (let k = 0; k < 8; k++) { const a = k * 0.785; g.fillStyle = c; g.beginPath(); g.ellipse(x + Math.cos(a) * 16, 196 + Math.sin(a) * 16, 11, 6, a, 0, 6.283); g.fill(); } g.fillStyle = '#c87a1a'; g.beginPath(); g.arc(x, 196, 9, 0, 6.283); g.fill(); }
      g.fillStyle = '#ffe14a'; g.beginPath(); g.ellipse(170, 120, 10, 7, 0, 0, 6.283); g.fill(); g.fillStyle = '#2a2a2a'; g.fillRect(166, 114, 3, 12); g.fillRect(172, 114, 3, 12);
    } else {
      g.fillStyle = grad('#ffd0e4', '#fff1f6'); g.fillRect(0, 0, 256, 384);
      g.fillStyle = '#ffe7a8'; g.beginPath(); g.arc(196, 70, 30, 0, 6.283); g.fill();
      for (const [x, y, r, col] of [[40, 300, 90, '#ffb8d0'], [200, 310, 100, '#ffc8a8'], [128, 330, 110, '#fff4f8']]) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.fill(); }
      F('#fff4f8', 76, 150, 104, 90, 12); F('#ff9ac0', 76, 186, 104, 12); F('#fff4f8', 92, 110, 72, 46, 10); F('#ff9ac0', 92, 136, 72, 10);
      for (let i = 0; i < 4; i++) { F('#8fd0ff', 100 + i * 18, 84, 8, 28, 3); g.fillStyle = '#ffcf5a'; g.beginPath(); g.ellipse(104 + i * 18, 78, 5, 9, 0, 0, 6.283); g.fill(); }
      for (let i = 0; i < 6; i++) { g.fillStyle = '#e8344f'; g.beginPath(); g.arc(84 + i * 18, 150, 8, 0, 6.283); g.fill(); }
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, 360); g.quadraticCurveTo(128, 330, 256, 360); g.lineTo(256, 384); g.lineTo(0, 384); g.fill();
    }
    const v = g.createRadialGradient(128, 230, 60, 128, 200, 260); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(255,250,235,0.55)'); g.fillStyle = v; g.fillRect(0, 0, 256, 384);
    return c;
  };
  const doorZ = T.z0 - 0.9, open = id => typeof BOLUM === 'undefined' || !BOLUM.isOpen || BOLUM.isOpen(id, P);
  const doorAnims = [];
  const DK = new Kit();
  for (const d of T.doorList()) {
    const fr = own(frameGeo, new THR.MeshStandardMaterial({ color: d.col, roughness: 0.38 }), d.x, 0, doorZ - 0.35, { cast: true });
    const isOpen = open(d.zone), done = P && P.bossNese && P.bossNese[d.zone];
    // kapı aralığı: içerisi odanın ışıyan rengi (açık) ya da kapalı kapı kanadı (kilitli)
    const glowC = new THR.Color(d.col2);
    const hm = own(holeGeo, isOpen ? new THR.MeshBasicMaterial({ map: tx('room_' + d.zone, roomPic(d.zone)), fog: false }) : new THR.MeshStandardMaterial({ color: 0xf6a6c4, roughness: 0.5 }), d.x, 0.01, doorZ - 0.05, { recv: !isOpen });
    // eşik basamağı + taban halısı
    DK.add(G.rbox(2), d.col, [d.x, 0.07, doorZ + 0.95], null, [2.8, 0.14, 1.5]);
    DK.add(G.torus(TAU3, 0.1, 32), d.col, [d.x, 0.07, T.z0 + 1.6], [Math.PI / 2, 0, 0], [1.3, 1.3, 1.3]);
    // kemerin tepesinde küçük altın top süsleri
    for (const sx2 of [-1, 1]) DK.add(G.sphere(12, 8), 0xf2c44a, [d.x + sx2 * 1.65, 0.25, doorZ + 0.2], null, 0.26);
    // aşağı inen rampa (kapının arkasından kuzeye)
    const rz0 = doorZ - 0.9, drop = 14;
    if (d.ramp === 'kurdele') for (let i = 0; i < 14; i++) DK.add(G.box(), i % 2 ? 0x7aa6dc : 0x8fb6e6, [d.x + Math.sin(i * 0.8) * 0.6, -i * drop / 14 - 0.1, rz0 - i * 1.0], [-0.75, Math.sin(i * 0.8) * 0.3, 0], [2.6, 0.14, 1.2]);
    else if (d.ramp === 'kasik') { DK.add(G.rbox(2), 0xd9a46a, [d.x, -drop / 2, rz0 - 7], [-0.78, 0, 0], [1.4, 0.4, 19]); DK.add(G.sphere(16, 10), 0xd9a46a, [d.x, -drop - 0.5, rz0 - 13.6], [-0.78, 0, 0], [2.2, 0.5, 3.0]); }
    else if (d.ramp === 'cubuk') for (let i = 0; i < 4; i++) DK.add(G.rbox(2), i % 2 ? 0xf0dcb4 : 0xe8d0a4, [d.x + (i % 2 ? 0.6 : -0.6), -2 - i * 3.6, rz0 - 2.5 - i * 3.2], [-0.8, 0, 0], [1.4, 0.3, 5.6]);
    else for (let i = 0; i < 22; i++) DK.add(G.cyl(1, 1, 14), i % 2 ? 0xff4f6e : 0xffffff, [d.x, -i * 0.64 - 0.2, rz0 - i * 0.6], [-0.82, 0, 0], [0.75, 0.62, 0.75]);
    // oda rozeti (kemerin üstünde, hafifçe sallanır)
    const badge = tx('badge_' + d.zone, () => MASA.badgeCanvas(d.ikon, '#' + d.col.toString(16).padStart(6, '0')));
    const med = own(new THR.CircleGeometry(1.32, 40), new THR.MeshStandardMaterial({ map: badge, roughness: 0.5, transparent: true }), d.x, 0.05, T.z0 + 1.6, { rx: -Math.PI / 2 });   // yerde oda madalyonu (yukarıdan bakan kamera görür)
    med.renderOrder = 1;
    const sp = new THR.Sprite(new THR.SpriteMaterial({ map: badge, transparent: true, depthWrite: false }));
    sp.scale.set(1.8, 1.8, 1); sp.position.set(d.x, 5.15, doorZ); api.add(sp);
    doorAnims.push({ sp, ph: d.x * 0.3, hm, open: isOpen, col: new THR.Color(0xffffff) });
    if (done) {   // bitmiş oda: kemerde altın yıldız
      DK.add(G.sphere(12, 8), 0xffd23f, [d.x + 1.35, 3.9, doorZ + 0.25], null, 0.36);
    }
    if (!isOpen) {   // kilitli Pasta Krallığı: asma kilit + 3 malzeme yuvası (gelenler dolu)
      DK.add(G.torus(Math.PI, 0.2, 16), 0xc9ced4, [d.x, 1.95, doorZ + 0.45], null, [0.45, 0.45, 0.45]);
      DK.add(G.rbox(2), 0xf2c44a, [d.x, 1.55, doorZ + 0.45], null, [0.9, 0.8, 0.35]);
      DK.add(G.cyl(1, 1, 12), 0x6a4a2a, [d.x, 1.5, doorZ + 0.64], [Math.PI / 2, 0, 0], [0.1, 0.08, 0.1]);
      const have = P && P.malzemeler ? Object.keys(P.malzemeler).filter(k => P.malzemeler[k]).length : 0;
      for (let k = 0; k < 3; k++) {
        const x = d.x - 0.85 + k * 0.85;
        DK.add(G.cyl(1, 1, 20), 0xffffff, [x, 2.95, doorZ + 0.52], [Math.PI / 2, 0, 0], [0.36, 0.1, 0.36]);
        DK.add(G.torus(TAU3, 0.14, 24), 0xf2c44a, [x, 2.95, doorZ + 0.58], null, [0.38, 0.38, 0.38]);
        if (k < have) DK.add(G.sphere(14, 10), [0xfff4dc, 0xffe7a8, 0xff5d6e][k], [x, 2.95, doorZ + 0.64], null, [0.27, 0.27, 0.15]);
      }
    }
  }
  kitMesh(DK, new THR.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }));
  // ── 7) İstasyonlar ──
  const S = T.st, SK = new Kit();
  // Gardırop: mor oyuncak dolap, kapakları açık, askıda renkli kostümler, oval ayna, tepede taç
  { const x = S.gardirop.x, z = S.gardirop.z - 2.6; SK.push([x * 0.32, 0, z * 0.32], null, 0.68);
    SK.add(G.rbox(3), 0xb48ad8, [x, 2.9, z], null, [4.2, 5.8, 2.2]);
    SK.add(G.rbox(2), 0x6f4a92, [x, 2.9, z + 0.9], null, [3.6, 5.0, 0.3]);   // iç gölge
    SK.add(G.cyl(1, 1, 8), 0xd8b45a, [x, 4.9, z + 0.7], [0, 0, Math.PI / 2], [0.08, 3.4, 0.08]);
    const cc = [0xffffff, 0xe84a4a, 0x8a8f9a, 0x5aa86a, 0xf0f4ff];   // pastacı, süper kahraman, şövalye, kaşif, astronot
    cc.forEach((c, i) => { const xx = x - 1.3 + i * 0.65; SK.add(G.torus(Math.PI, 0.2, 10), 0xd8b45a, [xx, 4.95, z + 0.7], [0, Math.PI / 2, 0], 0.18); SK.add(G.rbox(2), c, [xx, 3.9, z + 0.7], null, [0.55, 1.9, 0.9]); });
    for (const sd of [-1, 1]) {   // açık kapaklar
      SK.add(G.rbox(2), 0xc9a2e6, [x + sd * 3.0, 2.9, z + 1.2], [0, sd * 0.85, 0], [2.0, 5.4, 0.25]);
      SK.add(G.sphere(10, 8), 0xf2c44a, [x + sd * 2.35, 2.9, z + 1.55], null, 0.18);
    }
    SK.add(G.cyl(1, 1, 28), 0xf2c44a, [x + 3.25, 3.2, z + 1.7], [Math.PI / 2, 0.85, 0], [0.7, 0.1, 1.0]);   // ayna: altın çerçeve, gümüş-mavi cam, parıltı
    SK.add(G.cyl(1, 1, 28), 0xd6ecfa, [x + 3.3, 3.2, z + 1.75], [Math.PI / 2, 0.85, 0], [0.58, 0.1, 0.86]);
    SK.add(G.sphere(8, 6), 0xffffff, [x + 3.15, 3.55, z + 1.95], null, [0.16, 0.08, 0.05]);
    for (let i = 0; i < 5; i++) SK.add(G.cone(8), 0xf2c44a, [x - 0.8 + i * 0.4, 6.15, z], null, [0.16, 0.5, 0.16]);
    SK.add(G.box(), 0xf2c44a, [x, 5.9, z], null, [2.0, 0.25, 0.25]);
    for (const sd of [-1, 1]) SK.add(G.rbox(2), 0x9a70c0, [x + sd * 1.7, 0.2, z], null, [0.5, 0.4, 1.8]);
    SK.pop();
  }
  // Bilbo'nun Köşesi: yuvarlak köpek yatağı, pati, kemik, mama kabı, askılıkta tasma/bandana
  { const x = S.bilbo.x, z = S.bilbo.z - 2.5; SK.push([x * 0.25, 0, z * 0.25], null, 0.75);
    SK.add(G.torus(TAU3, 0.42, 36), 0x4fa0a8, [x, 0.55, z], [Math.PI / 2, 0, 0], [2.2, 2.2, 2.6]);
    SK.add(G.cyl(1, 1, 36), 0xf3e2c4, [x, 0.35, z], null, [2.1, 0.5, 2.1]);
    for (const [dx, dz, s] of [[0, 0.2, 0.55], [-0.55, -0.45, 0.26], [0, -0.7, 0.26], [0.55, -0.45, 0.26]]) SK.add(G.sphere(12, 8), 0xc59a6a, [x + dx, 0.62, z + dz], null, [s, 0.05, s]);
    SK.add(G.capsule(1.6, 8), 0xfffaf0, [x - 2.6, 0.32, z + 2.4], [0, 0.6, Math.PI / 2], [0.25, 0.45, 0.25]);
    for (const sd of [-1, 1]) for (const sz of [-1, 1]) SK.add(G.sphere(10, 8), 0xfffaf0, [x - 2.6 + sd * 0.72 * Math.cos(0.6) + sz * 0.18 * Math.sin(0.6), 0.32, z + 2.4 - sd * 0.72 * Math.sin(0.6) + sz * 0.18 * Math.cos(0.6)], null, 0.3);
    SK.add(G.cyl(1.1, 0.9, 24), 0xe8505b, [x + 2.6, 0.35, z + 2.2], null, [0.9, 0.7, 0.9]);
    SK.add(G.cyl(1, 1, 24), 0x7a4a2a, [x + 2.6, 0.62, z + 2.2], null, [0.75, 0.08, 0.75]);
    SK.add(G.cyl(1, 1, 8), 0xb27a4a, [x + 3.0, 2.0, z - 1.6], null, [0.16, 4.0, 0.16]);
    SK.add(G.cyl(1, 1, 8), 0xb27a4a, [x + 3.0, 3.9, z - 1.6], [0, 0, Math.PI / 2], [0.12, 2.6, 0.12]);
    SK.add(G.torus(TAU3, 0.18, 20), 0xe84a4a, [x + 2.3, 3.2, z - 1.6], null, [0.55, 0.55, 0.55]);
    SK.add(G.sphere(10, 8), 0xf2c44a, [x + 2.3, 2.6, z - 1.5], null, [0.18, 0.18, 0.06]);
    SK.add(G.cone(3), 0x3a8ff0, [x + 3.7, 3.2, z - 1.6], [Math.PI, 0, 0], [0.7, 1.1, 0.12]);
    SK.pop();
  }
  // Çıkartma Albümü: yere açılmış dev kitap (sayfalar dokulu, ayrı)
  { const x = S.album.x, z = S.album.z; SK.push([x * 0.15, 0, z * 0.15], null, 0.85);
    SK.add(G.rbox(2), 0x3a7fd8, [x, 0.08, z], [0, -0.06, 0], [7.4, 0.16, 5.2]);
    SK.add(G.cyl(1, 1, 16), 0x2f6bc0, [x, 0.14, z], [Math.PI / 2, -0.06, 0], [0.32, 5.1, 0.32]);
    SK.pop();
  }
  // Mini Oyun Köşesi: oyun tahtası (yerde), dev zarlar, topaç
  { const x = S.mini.x, z = S.mini.z; SK.push([x * 0.2, 0, z * 0.2], null, 0.8);
    SK.add(G.rbox(2), 0xfff3dc, [x, 0.14, z], [0, 0.05, 0], [6.0, 0.2, 4.6]); SK.add(G.rbox(2), 0x5ac88a, [x, 0.1, z], [0, 0.05, 0], [6.4, 0.14, 5.0]);
    const bc = [0xff5d8f, 0x5ec8ff, 0xffd23f, 0x7ad16b];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU3; SK.add(G.cyl(1, 1, 16), bc[i % 4], [x + Math.cos(a) * 1.9, 0.26, z + Math.sin(a) * 1.5], null, [0.42, 0.06, 0.42]); }
    SK.add(G.cone(16), 0xff5d8f, [x + 0.4, 0.55, z - 3.3], [Math.PI, 0, 0], [0.5, 0.9, 0.5]); SK.add(G.sphere(16, 10), 0xffd23f, [x + 0.4, 1.05, z - 3.3], null, [0.5, 0.18, 0.5]); SK.add(G.cyl(1, 1, 8), 0x5ec8ff, [x + 0.4, 1.3, z - 3.3], null, [0.08, 0.5, 0.08]);   // topaç
    SK.add(G.rbox(3), 0xffffff, [x + 3.9, 0.75, z - 1.6], [0.2, 0.5, 0.1], [1.5, 1.5, 1.5]);
    SK.add(G.rbox(3), 0xff6b6b, [x - 3.8, 0.65, z - 1.8], [0.1, 0.9, 0], [1.3, 1.3, 1.3]);
    for (const [dx, dy, dz] of [[0, 0.76, 0], [0.3, 0.76, 0.3], [-0.3, 0.76, -0.3]]) SK.add(G.sphere(8, 6), 0x2a2a2a, [x + 3.9 + dx * 0.9, 0.75 + dy * 1.0, z - 1.6 + dz * 0.9], null, 0.14);
    SK.pop();
  }
  // Günün Sürprizi: kırmızı hediye kutusu, altın kurdele ve fiyonk
  const opened = !!(P && typeof GAME !== 'undefined' && GAME.dailySurprise && !GAME.dailySurprise(true));
  { const x = S.surpriz.x, z = S.surpriz.z - 1.6; SK.push([x * 0.12, 0, z * 0.12], null, 0.88);
    SK.add(G.rbox(2), 0xe8404f, [x, 0.8, z], [0, 0.2, 0], [1.6, 1.6, 1.6]);
    SK.add(G.box(), 0xf6c443, [x, 0.8, z], [0, 0.2, 0], [1.66, 1.64, 0.36]);
    SK.add(G.box(), 0xf6c443, [x, 0.8, z], [0, 0.2 + Math.PI / 2, 0], [1.66, 1.64, 0.36]);
    SK.pop();
  }
  // kapak + fiyonk ayrı (Günün Sürprizi açılınca uçar, ertesi gün yine kapalı)
  const lid = (() => { const k = new Kit();
    k.add(G.rbox(2), 0xe8404f, [0, 0, 0], null, [1.74, 0.22, 1.74]); k.add(G.box(), 0xf6c443, [0, 0, 0], null, [1.78, 0.24, 0.38]); k.add(G.box(), 0xf6c443, [0, 0, 0], [0, Math.PI / 2, 0], [1.78, 0.24, 0.38]);
    for (const sd of [-1, 1]) k.add(G.torus(TAU3, 0.28, 18), 0xffd45a, [sd * 0.38, 0.18, 0], [0.3, 0, sd * 0.6], [0.42, 0.42, 0.42]);
    k.add(G.sphere(12, 8), 0xffd45a, [0, 0.16, 0], null, 0.16);
    const m = new THR.Mesh(k.build(), new THR.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 })); m.castShadow = true;
    const x = S.surpriz.x, z = S.surpriz.z - 1.6;
    m.scale.setScalar(0.88); m.rotation.y = 0.2;
    if (opened) { m.position.set(x + 1.3, 0.15, z + 0.6); m.rotation.set(0.25, 0.9, 0.3); } else m.position.set(x, 1.47, z);
    api.add(m); return { m, x, z, t: opened ? 9 : -1 };
  })();
  MASA.giftOpened = () => { lid.t = 0; burst('confetti', lid.x, 2, lid.z, {}); sfx('chest', { vol: 0.8 }); };
  kitMesh(SK, new THR.MeshStandardMaterial({ vertexColors: true, roughness: 0.36 }));
  // album sayfaları: çıkartma ızgarası (renkli/gri), yıldızlar
  const albumT = tx('album', () => {
    const c = MASA.cv(512, 360), g = c.getContext('2d');
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, 512, 360); g.fillStyle = 'rgba(80,60,40,0.12)'; g.fillRect(250, 0, 12, 360);
    const cols = ['#ff8fb8', '#8fd0ff', '#ffd23f', '#9be08a', '#c7a0ff', '#ffb36b'];
    for (let p = 0; p < 2; p++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const x = 28 + p * 256 + i * 70, y = 40 + j * 100, on = (i + j + p) % 3 !== 1;
      g.fillStyle = on ? '#ffffff' : '#ece6dc'; g.beginPath(); g.roundRect(x, y, 60, 72, 10); g.fill();
      g.strokeStyle = on ? cols[(i + j * 3 + p) % 6] : '#d0c8bc'; g.lineWidth = 5; g.stroke();
      g.fillStyle = on ? cols[(i * 2 + j + p) % 6] : '#d6cec2'; g.beginPath(); g.arc(x + 30, y + 34, 18, 0, TAU3); g.fill();
      if (on) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 24, y + 30, 4, 0, TAU3); g.arc(x + 36, y + 30, 4, 0, TAU3); g.fill(); }
    }
    return c;
  });
  own(new THR.PlaneGeometry(5.95, 4.16), new THR.MeshStandardMaterial({ map: albumT, roughness: 0.85 }), S.album.x, 0.16, S.album.z, { rx: -Math.PI / 2, rz: -0.06 });
  // istasyon rozetleri (havada süzülür)
  const badges = [];
  for (const [id, ikon, ring, y] of [['gardirop', '👗', '#b48ad8', 5.2], ['bilbo', '🐶', '#4fa0a8', 3.7], ['album', '📒', '#3a7fd8', 2.3], ['mini', '🎲', '#5ac88a', 2.3], ['surpriz', '🎁', '#e8404f', 2.9]]) {
    const t = tx('st_' + id, () => MASA.badgeCanvas(ikon, ring));
    const sp = new THR.Sprite(new THR.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    const zOff = id === 'gardirop' ? -2.6 : id === 'bilbo' ? -2.5 : id === 'surpriz' ? -1.6 : 0;
    sp.scale.set(1.35, 1.35, 1); sp.position.set(S[id].x, y, S[id].z + zOff); api.add(sp);
    badges.push({ sp, y, ph: S[id].x * 0.2, id });
  }
  // istasyon zemin halkaları (ışıyan)
  const ringT = tx('ring', () => { const c = MASA.cv(128, 128), g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 34, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c; });
  const rings = [];
  for (const [id, col] of [['gardirop', 0xc9a2ff], ['bilbo', 0x6fd0d8], ['album', 0x7ab8ff], ['mini', 0x7ae0a0], ['surpriz', 0xffc84a]]) {
    const m = own(new THR.PlaneGeometry(3.6, 3.6), new THR.MeshBasicMaterial({ map: ringT, color: col, transparent: true, blending: THR.AdditiveBlending, depthWrite: false, fog: false }), S[id].x, 0.22, S[id].z, { rx: -Math.PI / 2, recv: false });
    m.renderOrder = 2; rings.push(m);
  }
  for (const d of T.doorList()) { const m = own(new THR.PlaneGeometry(3.4, 3.4), new THR.MeshBasicMaterial({ map: ringT, color: d.col, transparent: true, blending: THR.AdditiveBlending, depthWrite: false, fog: false }), d.x, 0.12, T.z0 + 1.6, { rx: -Math.PI / 2, recv: false }); m.renderOrder = 2; rings.push(m); }
  // ── 8) Oyuncaklar: zıplatan sünger, yuvarlanan bezelye + şeker top, müzik kutusu ──
  const toyMat = new THR.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
  const sponge = (() => { const k = new Kit(), x = 0, z = 0;
    k.add(G.rbox(3), (X, Y, Z) => new THR.Color(0xffd84a).multiplyScalar(0.86 + 0.18 * hash(Math.round(X * 4), Math.round(Y * 4), Math.round(Z * 4))), [x, 0.5, z], null, [3.8, 1.0, 2.6]);
    for (let i = 0; i < 14; i++) k.add(G.sphere(6, 4), 0xc9a032, [x - 1.6 + hash(i, 1, 1) * 3.2, 0.3 + hash(i, 2, 2) * 0.5, z + 1.31], null, [0.12, 0.1, 0.04]);
    const g = new THR.Group(), m = new THR.Mesh(k.build(), toyMat); m.castShadow = true; m.receiveShadow = true; g.add(m);
    const scrubT = tx('scrub', () => { const c = MASA.cv(256, 256), q = c.getContext('2d'); q.fillStyle = '#3aa862'; q.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { q.strokeStyle = Math.random() < 0.5 ? 'rgba(20,90,45,0.55)' : 'rgba(140,230,150,0.45)'; q.lineWidth = 1 + Math.random() * 1.5; const x = Math.random() * 256, y = Math.random() * 256, a = Math.random() * 6.28, l = 6 + Math.random() * 14; q.beginPath(); q.moveTo(x, y); q.quadraticCurveTo(x + Math.cos(a + 1) * l, y + Math.sin(a + 1) * l, x + Math.cos(a) * l, y + Math.sin(a) * l); q.stroke(); }
      return c; }, [2, 1.4]);
    const scrub = new THR.Mesh(new THR.BoxGeometry(3.8, 0.3, 2.6), new THR.MeshStandardMaterial({ map: scrubT, roughness: 0.95 })); scrub.position.y = 1.13; scrub.castShadow = true; scrub.receiveShadow = true; g.add(scrub);
    g.position.set(T.toys.sunger.x, 0, T.toys.sunger.z); api.add(g); return g; })();
  const pea = (() => { const k = new Kit(); k.add(G.sphere(24, 16), (X, Y, Z) => new THR.Color(0x6cc04a).lerp(new THR.Color(0xa8e06a), Math.max(0, Y) * 0.6), [0, 0, 0], null, 0.75); k.add(G.sphere(10, 8), 0xffffff, [-0.25, 0.4, 0.42], null, [0.16, 0.1, 0.05]);
    const m = new THR.Mesh(k.build(), new THR.MeshStandardMaterial({ vertexColors: true, roughness: 0.22 })); m.castShadow = true; m.position.set(T.toys.bezelye.x, 0.75, T.toys.bezelye.z); api.add(m); return m; })();
  const gum = (() => { const k = new Kit(); k.add(G.sphere(24, 16), (X, Y, Z) => (Math.sin(X * 9) * Math.sin(Z * 9) > 0 ? new THR.Color(0xff6fa8) : new THR.Color(0xffffff)), [0, 0, 0], null, 0.62);
    const m = new THR.Mesh(k.build(), new THR.MeshStandardMaterial({ vertexColors: true, roughness: 0.2 })); m.castShadow = true; m.position.set(T.toys.bezelye.x + 2.6, 0.62, T.toys.bezelye.z + 1.6); api.add(m); return m; })();
  const music = (() => { const g = new THR.Group(), k = new Kit();
    k.add(G.rbox(3), 0x9fd0f0, [0, 0.75, 0], null, [2.4, 1.5, 1.7]);
    k.add(G.box(), 0xf2c44a, [0, 1.5, 0], null, [2.46, 0.12, 1.76]);
    k.add(G.box(), 0xf2c44a, [0, 0.1, 0], null, [2.46, 0.12, 1.76]);
    k.add(G.rbox(2), 0x9fd0f0, [0, 2.1, -0.95], [-1.15, 0, 0], [2.4, 0.18, 1.7]);   // açık kapak
    k.add(G.cyl(1, 1, 24), 0xff8fb8, [0, 1.62, 0], null, [0.7, 0.12, 0.7]);
    for (let i = 0; i < 8; i++) { const a = i * TAU3 / 8; k.add(G.sphere(8, 6), i % 2 ? 0xffffff : 0xffd23f, [Math.sin(a) * 1.0, 0.75, Math.cos(a) * 0.86 + (Math.cos(a) > 0 ? 0.01 : 0)], null, 0.1); }
    const box = new THR.Mesh(k.build(), toyMat); box.castShadow = true; box.receiveShadow = true; g.add(box);
    const top = new Kit();   // dönen atlıkarınca: direk, tente, minik atlar
    top.add(G.cyl(1, 1, 8), 0xf2c44a, [0, 2.3, 0], null, [0.06, 1.3, 0.06]);
    top.add(G.cone(16), 0xff8fb8, [0, 3.15, 0], null, [0.75, 0.5, 0.75]);
    top.add(G.sphere(10, 8), 0xffd23f, [0, 3.45, 0], null, 0.12);
    for (let i = 0; i < 3; i++) { const a = i * TAU3 / 3; top.add(G.capsule(1, 8), [0xffffff, 0xb784ff, 0x5ec8ff][i], [Math.sin(a) * 0.5, 2.15, Math.cos(a) * 0.5], [0, a, Math.PI / 2], [0.12, 0.14, 0.12]); top.add(G.sphere(8, 6), [0xffffff, 0xb784ff, 0x5ec8ff][i], [Math.sin(a) * 0.5 + Math.cos(a) * 0.2, 2.3, Math.cos(a) * 0.5 - Math.sin(a) * 0.2], null, 0.1); top.add(G.cyl(1, 1, 6), 0xf2c44a, [Math.sin(a) * 0.5, 2.5, Math.cos(a) * 0.5], null, [0.025, 0.8, 0.025]); }
    const spin = new THR.Mesh(top.build(), toyMat); spin.castShadow = true; g.add(spin);
    const btn = new THR.Mesh(G.cyl(1, 1, 24), new THR.MeshStandardMaterial({ color: 0xff4f6e, roughness: 0.25 })); btn.scale.set(0.6, 0.3, 0.6); btn.position.set(0, 0.15, 1.9); btn.castShadow = true; g.add(btn);
    const ring = new THR.Mesh(G.torus(TAU3, 0.14, 24), new THR.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.scale.setScalar(0.66); ring.position.set(0, 0.1, 1.9); g.add(ring);
    g.position.set(T.toys.muzik.x, 0, T.toys.muzik.z - 0.6); api.add(g);
    return { g, spin, btn };
  })();
  // müzik notaları (♪ ♫) — yükselen sprite'lar
  const noteT = tx('note', () => { const c = MASA.cv(64, 64), g = c.getContext('2d'); g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff6fa8'; g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeText('♪', 32, 34); g.fillText('♪', 32, 34); return c; });
  const notes = [];
  for (let i = 0; i < 6; i++) { const s = new THR.Sprite(new THR.SpriteMaterial({ map: noteT, transparent: true, depthWrite: false, opacity: 0 })); s.scale.set(0.8, 0.8, 1); s.visible = false; api.add(s); notes.push({ s, t: 9 }); }
  // ── 9) Işıklar: pastanın üstünde sıcak ışık, pencere tarafı ──
  api.light(T.cake.x, 6, T.cake.z + 2, 0xffe2b0, 3.2, 12);
  api.light(30, 7, 18, 0xfff0d0, 2.2, 14);
  api.light(S.surpriz.x, 3, S.surpriz.z, 0xffd0a0, 1.6, 7, 0.2);
  // ── 10) Canlandırma: rozetler, buhar, toz, sünger zıplatma, bezelye itme, müzik kutusu ──
  const A = () => (typeof GAME !== 'undefined' && GAME.halaApi) || null;
  const sfx = (n, o) => { const a = A(); if (a) try { a.sfx(n, o); } catch (e) { /* ses yok */ } };
  const burst = (k, x, y, z, o) => { const a = A(); if (a) try { a.burst(k, x, y, z, o || {}); } catch (e) { /* yok */ } };
  let t = 0, bounceT = 9, onSponge = false, musicT = 0, onBtn = false, noteK = 0, noteAt = 0;
  const rollers = [{ m: pea, r: 0.75, vx: 0, vz: 0 }, { m: gum, r: 0.62, vx: 0, vz: 0 }];
  const melody = [1, 1.122, 1.26, 1.335, 1.498, 1.335, 1.26, 1.122, 1, 1.26, 1.498, 2];
  api.anim((dt, fx, fz) => {
    t += dt;
    for (const b of doorAnims) { b.sp.position.y = 5.15 + Math.sin(t * 1.6 + b.ph) * 0.12; if (b.open) b.hm.material.color.copy(b.col).multiplyScalar(0.92 + 0.1 * Math.sin(t * 2.2 + b.ph)); }
    for (const b of badges) { b.sp.position.y = b.y + Math.sin(t * 1.8 + b.ph) * 0.18; }
    if (lid.t >= 0 && lid.t < 1.2) {   // kapak uçar: yukarı zıplar, döner, yana düşer
      lid.t += dt; const k = Math.min(1, lid.t / 1.1), m = lid.m;
      m.position.set(lid.x + 1.3 * k, 1.47 + Math.sin(k * Math.PI) * 2.6 - 1.32 * k, lid.z + 0.6 * k);
      m.rotation.set(0.25 * k + Math.sin(k * Math.PI) * 1.2, 0.2 + 0.7 * k, 0.3 * k);
    } else if (lid.t < 0) lid.m.position.y = 1.47 + Math.max(0, Math.sin(t * 3.1)) * 0.06;   // kapalı kutu kıpır kıpır
    for (let i = 0; i < rings.length; i++) rings[i].material.opacity = 0.55 + 0.3 * Math.sin(t * 2.4 + i);
    for (const s of steam) { s.t += dt; const k = (s.t % 3.6) / 3.6; s.s.position.set(TGx + Math.sin(s.t * 1.3) * 0.4 * k, 3.9 + k * 3.4, TGz + 0.2); s.s.scale.setScalar(0.6 + k * 1.6); s.s.material.opacity = 0.42 * Math.sin(k * Math.PI); }
    for (const s of dust) { s.t += dt; const k = (s.t % 7.8) / 7.8; s.s.position.set(FBx + 1.2 + Math.sin(s.t * 0.7 + 1) * 2.0, 7.4 + k * 2.6, FBz + 1 + Math.cos(s.t * 0.5) * 1.6); s.s.scale.setScalar(1.6 + k * 2.4); s.s.material.opacity = 0.35 * Math.sin(k * Math.PI); }
    for (const r of rays) r.material.opacity = 0.26 + 0.05 * Math.sin(t * 0.6);
    const H = typeof GAME !== 'undefined' && GAME.H, playing = typeof GAME !== 'undefined' && GAME.state === 'play';
    // sünger: üstüne çıkınca Feza zıplar (boing), sünger ezilir
    const sp0 = T.toys.sunger, onS = playing && Math.abs(fx - sp0.x) < 2.1 && Math.abs(fz - sp0.z) < 1.5;
    if (onS && !onSponge && bounceT > 0.5) { bounceT = 0; sfx('bounce', { vol: 0.9 }); burst('sparkle', sp0.x, 1.4, sp0.z, {}); if (typeof HUB !== 'undefined' && Math.random() < 0.35) HUB.say(Math.random() < 0.5 ? 'oyuncak_sunger1' : 'oyuncak_sunger2', 1); }
    onSponge = onS;
    if (onS && bounceT > 0.95) { bounceT = 0; sfx('bounce', { vol: 0.7, pitch: 1.12 }); }
    bounceT += dt;
    const bk = bounceT < 0.95 ? bounceT / 0.95 : 1, hop = bk < 1 ? Math.sin(bk * Math.PI) * 1.7 : 0;
    const squash = bk < 0.15 ? 1 - Math.sin(bk / 0.15 * Math.PI) * 0.35 : bk < 1 ? 1 + Math.sin((bk - 0.15) / 0.85 * Math.PI * 3) * 0.06 * (1 - bk) : 1;
    sponge.scale.set(1 + (1 - squash) * 0.3, squash, 1 + (1 - squash) * 0.3);
    if (H && H.root && hop > 0 && onS) H.root.position.y += hop + 1.0 * squash;
    else if (H && H.root && onS) H.root.position.y += 1.1;
    // bezelye ve şeker top: Feza değince itilir, yuvarlanır, masanın kenarından seker
    for (const r of rollers) {
      const p = r.m.position, dx = p.x - fx, dz = p.z - fz, d = Math.hypot(dx, dz);
      if (playing && d < r.r + 0.6 && d > 0.01) { const sp = 7; r.vx = dx / d * sp; r.vz = dz / d * sp; if (!r.hit) { sfx('bonk', { vol: 0.7 }); r.hit = true; } } else if (d > r.r + 1.2) r.hit = false;
      for (const o of rollers) if (o !== r) { const ex = p.x - o.m.position.x, ez = p.z - o.m.position.z, ed = Math.hypot(ex, ez); if (ed < r.r + o.r && ed > 0.01) { const k = (r.r + o.r - ed) / ed * 0.5; p.x += ex * k; p.z += ez * k; const v = Math.hypot(r.vx, r.vz) * 0.6; r.vx += ex / ed * v; r.vz += ez / ed * v; } }
      p.x += r.vx * dt; p.z += r.vz * dt;
      const sp = Math.hypot(r.vx, r.vz);
      if (sp > 0.01) { r.m.rotation.z -= r.vx * dt / r.r; r.m.rotation.x += r.vz * dt / r.r; }
      const f = Math.max(0, 1 - dt * 1.4); r.vx *= f; r.vz *= f;
      if (p.x < T.x0 + r.r) { p.x = T.x0 + r.r; r.vx = Math.abs(r.vx) * 0.7; } if (p.x > T.x1 - r.r) { p.x = T.x1 - r.r; r.vx = -Math.abs(r.vx) * 0.7; }
      if (p.z < T.z0 + r.r) { p.z = T.z0 + r.r; r.vz = Math.abs(r.vz) * 0.7; } if (p.z > T.z1 - r.r) { p.z = T.z1 - r.r; r.vz = -Math.abs(r.vz) * 0.7; }
      const cd = Math.hypot(p.x - T.cake.x, p.z - T.cake.z), cr = T.cake.r + r.r;   // pastaya çarpınca geri sek
      if (cd < cr) { const nx = (p.x - T.cake.x) / cd, nz = (p.z - T.cake.z) / cd; p.x = T.cake.x + nx * cr; p.z = T.cake.z + nz * cr; const vn = r.vx * nx + r.vz * nz; if (vn < 0) { r.vx -= 1.7 * vn * nx; r.vz -= 1.7 * vn * nz; } }
    }
    // müzik kutusu: önündeki kırmızı düğmeye basınca melodi, atlıkarınca döner, notalar uçar
    const bx = T.toys.muzik.x, bz = T.toys.muzik.z - 0.6 + 1.9, onB = playing && Math.hypot(fx - bx, fz - bz) < 1.0;
    if (onB && !onBtn) { musicT = 6; noteK = 0; noteAt = 0; burst('sparkle', bx, 1, bz, {}); if (typeof HUB !== 'undefined' && Math.random() < 0.4) HUB.say('oyuncak_muzik', 1); }
    onBtn = onB;
    music.btn.scale.y = onB ? 0.12 : 0.3; music.btn.position.y = onB ? 0.07 : 0.15;
    if (musicT > 0) {
      musicT -= dt; noteAt -= dt;
      music.spin.rotation.y += dt * 2.4; music.spin.position.y = Math.sin(t * 6) * 0.05;
      if (noteAt <= 0 && noteK < melody.length) { sfx('bell', { vol: 0.55, pitch: melody[noteK] }); noteAt = 0.42; const n2 = notes[noteK % notes.length]; n2.t = 0; n2.s.visible = true; n2.x = bx + (noteK % 2 ? 0.6 : -0.6); noteK++; }
    } else music.spin.rotation.y += dt * 0.2;
    for (const n2 of notes) if (n2.s.visible) { n2.t += dt; const k = n2.t / 2.2; if (k >= 1) { n2.s.visible = false; continue; } n2.s.position.set(n2.x + Math.sin(n2.t * 3) * 0.4, 3.0 + k * 3.2, T.toys.muzik.z - 0.6); n2.s.material.opacity = Math.sin(k * Math.PI); }
  });
  // ── Sıradaki kapı: bitmemiş ilk oda (oturma → mutfak → buzdolabı → açıksa Pasta Krallığı → Balkon); yerde parlayan iz + kapı üstünde zıplayan yıldız ──
  if (!L._title && P) {
    const done = P.bossNese || {}, open2 = id => typeof BOLUM === 'undefined' || !BOLUM.isOpen || BOLUM.isOpen(id, P);
    const next = ['oturma', 'mutfak', 'buzdolabi', 'pasta', 'balkon'].find(id => !done[id] && open2(id) && T.doorList().some(d => d.zone === id));
    const door = next && T.doorList().find(d => d.zone === next);
    if (door) {
      const tx2 = door.x, tz2 = T.z0 + 1.6, sx0 = L.start ? L.start.x : T.cx, sz0 = L.start ? L.start.z : 40;
      const dotT = tx('dot', () => MASA.radialCanvas('rgba(255,236,120,1)', 'rgba(255,200,60,0)'));
      const dotMat = new THR.MeshBasicMaterial({ map: dotT, transparent: true, blending: THR.AdditiveBlending, depthWrite: false, fog: false });
      const len = Math.hypot(tx2 - sx0, tz2 - sz0), n = Math.max(2, Math.floor(len / 1.3)), dots = [];
      // pastanın çevresinden dolaşan yumuşak eğri (pastanın içinden geçmesin)
      const mx = (sx0 + tx2) / 2, mz = (sz0 + tz2) / 2, dc = Math.hypot(mx - T.cake.x, mz - T.cake.z), push = dc < 6 ? (6 - dc) + 1 : 0, ox = dc > 0.01 ? (mx - T.cake.x) / dc : 1, oz = dc > 0.01 ? (mz - T.cake.z) / dc : 0;
      for (let i = 1; i < n; i++) {
        const u = i / n, cxq = mx + ox * push * 1.6, czq = mz + oz * push * 1.6;
        const x = (1 - u) * (1 - u) * sx0 + 2 * u * (1 - u) * cxq + u * u * tx2, z = (1 - u) * (1 - u) * sz0 + 2 * u * (1 - u) * czq + u * u * tz2;
        if (Math.hypot(x - T.cake.x, z - T.cake.z) < T.cake.r + 0.6) continue;
        const m = own(new THR.CircleGeometry(0.42, 16), dotMat, x, 0.14, z, { rx: -Math.PI / 2, recv: false }); m.renderOrder = 3; dots.push({ m, u });
      }
      const starT = tx('nextstar', () => MASA.badgeCanvas('⭐', '#ffc83a', '#fff8d8'));
      const star = new THR.Sprite(new THR.SpriteMaterial({ map: starT, transparent: true, depthWrite: false })); star.scale.set(1.6, 1.6, 1); api.add(star);
      let tt = 0, off = false;
      api.anim((dt, fx, fz) => {
        tt += dt;
        const near = Math.hypot(fx - tx2, fz - tz2) < 3.2;
        if (near && !off) off = true;
        for (const d of dots) { const k = 0.5 + 0.5 * Math.sin(tt * 4 - d.u * 12); d.m.material.opacity = 1; d.m.scale.setScalar((off ? 0 : 0.7 + 0.5 * k)); }
        star.position.set(tx2, 4.6 + Math.abs(Math.sin(tt * 3.2)) * 0.8, T.z0 - 0.4); star.material.rotation = Math.sin(tt * 2) * 0.15;
      });
      const AD = { oturma: 'masa_git_oturma', mutfak: 'masa_git_mutfak', buzdolabi: 'masa_git_buzdolabi', pasta: 'masa_git_pasta', balkon: 'masa_git_balkon' };
      setTimeout(() => {   // karşılama/pasta cümleleri bittikten sonra, kimse konuşmuyorsa
        const g = typeof GAME !== 'undefined' && GAME; if (!g || g.state !== 'play' || g.L !== L || off) return;
        if (typeof AUD !== 'undefined' && AUD.current) { setTimeout(() => { if (GAME.L === L && !off && !(AUD && AUD.current) && typeof HUB !== 'undefined') HUB.say(AD[next], 1); }, 4000); return; }
        if (typeof HUB !== 'undefined') HUB.say(AD[next], 1);
        const HL = typeof HALA !== 'undefined' && HALA; if (HL && HL.pointTo) try { HL.pointTo(tx2, tz2); } catch (e) { /* yok */ }
      }, 6500);
    }
  }
  // pasta
  if (L.cakeSpot) CAKE.build(api, L.cakeSpot);
  if (!L._title) setTimeout(() => { if (typeof HUB !== 'undefined' && HUB.warm) HUB.warm(); }, 2500);   // panel resimleri boşta hazırlanır
};

BOLUM.define('masa', {
  ad: 'Aytuğ Hala’nın Mutfak Masası',
  hub: true,                 // merkez: huysuz ve boss yok; oyun burada başlar, bölüm bitince buraya dönülür
  taban: 'bathroom',
  size: 80, rooms: 2, side: 0,
  muzik: 'tuvalet',
  huysuzlar: { tozTavsani: 1 }, elitler: [],   // (üretici bir liste ister; yerlesim() hepsini siler)
  zemin: { tA: 0xd29a62, tB: 0xc98f58, tC: 0xdcae7a, out: 0x9a6a44, outAmt: 0.75, macro: 0xfff0dc },
  isik: { fog: [0xf2dcc4, 52, 140], hemiSky: 0xfff0dc, hemiGround: 0x9a6a48, hemi: 0.55, sunColor: 0xffe2b8, sun: 1.7, sunOffset: [10, 26, -16],
    env: [0xfff0e0, 0xffe2c8, 0x8a6248, 0.55], bloom: 0.28, exposure: 0.9, sat: 1.1, vig: 0.26 },
  minimap: { zemin: '#d29a62' },
  harita: { ad: 'Mutfak Masası', detay: 'Aytuğ Hala’nın pastası burada', renk: '#f6c08a', x: 22, y: 34, simge: '🍰' },
  // Saf veri: kendi masa zeminini çizer, istasyonlar, pasta, katı engeller
  yerlesim(L, api) {
    const T = MASA.T;
    L.spawns.length = 0; L.chests.length = 0;
    L.breakables = []; L.torches = []; L.checkpoints = []; L.boss = null; L.npc = null; L.merchant = null;
    if (api.regrid) {
      const rr = 2.2;   // köşeler yuvarlak
      api.regrid(T.W, T.H, (x, z) => {
        if (x < T.x0 || x > T.x1 || z < T.z0 || z > T.z1) return false;
        const qx = Math.max(T.x0 + rr - x, 0, x - (T.x1 - rr)), qz = Math.max(T.z0 + rr - z, 0, z - (T.z1 - rr));
        return qx * qx + qz * qz <= rr * rr;
      });
      L.rooms = [{ x: T.cx, z: 40, r: 7, kind: 'start', hw: 7, hh: 7 }, { x: T.cx, z: T.cz, r: 14, kind: 'boss', hw: 22, hh: 15 }];
      L.links = []; L.path = [{ x: T.cx, z: 44 }, { x: T.cx, z: T.z0 + 2 }];
      L.start = { x: 32, z: 41.5 };
      L.exit = { x: 3, z: 3 };   // (masanın kendi kapısı kullanılmıyor: 4 oda kapısı var; portal masanın altında gizli)
    }
    // odadan dönüş: Feza geldiği odanın kapısının önünde başlar (07 P.zone'u generate'ten sonra değiştirir: burada hâlâ eski oda)
    try {
      const P = typeof GAME !== 'undefined' && GAME.P, Zs = typeof ZONES !== 'undefined' ? ZONES : null, prev = P && Zs && Zs[P.zone] && Zs[P.zone].id;
      const d = prev && T.doorList().find(q => q.zone === prev);
      if (d) { let x = d.x, z = T.z0 + 4.3; if (!api.circleFree(x, z, 0.9)) { const q = api.randomFloorNear(x, z + 1, 0, 2.5); if (q) { x = q.x; z = q.z; } } L.start = { x, z }; }
    } catch (e) { /* başlangıç noktası */ }
    L.cakeSpot = { x: T.cake.x, z: T.cake.z };
    api.solid(T.cake.x, T.cake.z, T.cake.r, 'pasta');
    const st = L.stations = [];
    const put = (id, kind, x, z, o) => st.push(Object.assign({ id, kind, x, z, r: 1.6 }, o));
    for (const d of T.doorList()) put('kapi_' + d.zone, 'kapi', d.x, T.z0 + 1.6, { zone: d.zone, r: 1.5, masa: true });
    put('pasta', 'pasta', T.cake.x, T.cake.z, { r: T.cake.r + 0.65 });   // pastaya değince süsleme açılır
    for (const id of ['gardirop', 'bilbo', 'album', 'mini', 'surpriz']) put(id, id, T.st[id].x, T.st[id].z, { r: id === 'surpriz' ? 1.5 : 1.7 });
    // istasyon nesnelerinin katı gövdeleri (Feza önüne gelir, içine girmez)
    api.solid(T.st.gardirop.x - 0.25, T.st.gardirop.z - 2.7, 1.15, 'gardirop');   // Feza'nın kapıdan gelen yolunu kesmesin
    api.solid(T.st.bilbo.x + 0.25, T.st.bilbo.z - 2.6, 1.15, 'bilbo');
    api.solid(T.st.surpriz.x, T.st.surpriz.z - 1.6, 0.75, 'surpriz');
    api.solid(T.toys.muzik.x, T.toys.muzik.z - 0.6, 1.0, 'muzik');
    for (const s of st) if (!api.isFloor(s.x, s.z)) { const p = api.randomFloorNear(s.x, s.z, 0, 3); if (p) { s.x = p.x; s.z = p.z; } }
  },
  kur(L, api) {
    MASA.kur(L, api);
  },
  kurSon(L, api) {
    if (L.portalObj && L.portalObj.obj) L.portalObj.obj.visible = false;
  },
});
