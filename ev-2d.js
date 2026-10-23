// Yedek ev ekranı (2D çizim): cihazda 3D (WebGL) açılamazsa index.html bunu başlatır.
window.EV2D = function () {
  'use strict';
  var Q = location.search, SESSIZ = /[?&]sessiz\b/.test(Q);
  var MACERA = [
    { id: 'orman', yol: 'orman/index.html', renk: '#3f9b4a', acik: '#8fd47a', isik: '#d8ffb0' },
    { id: 'hala', yol: 'hala/index.html', renk: '#e0609a', acik: '#ffb3d1', isik: '#ffe0f0' },
    { id: 'huysuz', yol: 'huysuz/index.html', renk: '#6a56d8', acik: '#b6a8ff', isik: '#e6e0ff' }
  ];

  // ---------- biten maceralar ----------
  function tamamOku() {
    var m = /[?&]tamam=([a-z,]*)/.exec(Q);           // yalnız test: ?tamam=orman,hala (kaydetmez)
    if (m) return m[1].split(',');
    try { var a = JSON.parse(localStorage.getItem('fezaBilboTamam') || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  var TAMAM = tamamOku();
  function bitti(id) { return TAMAM.indexOf(id) >= 0; }

  // ---------- çizim tuvali ----------
  var cv = document.getElementById('ev');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'ev'; document.body.appendChild(cv); }
  var g = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1, L = null, arka = null;
  function boyut() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    L = duzen(); arka = null;
  }
  function duzen() {
    var dik = H > W * 1.05;
    var lh = Math.min(H * (dik ? 0.075 : 0.085), W * 0.075);
    var top = lh * 1.55 + H * 0.015;
    var dw, dh, floorY;
    if (dik) { dw = W * 0.29; dh = Math.min(dw * 1.85, H * 0.4); }
    else { floorY = H * 0.64; dh = floorY - top; dw = Math.min(W * 0.255, dh * 0.7); dh = Math.min(dh, dw * 1.6); }
    var gap = (W - 3 * dw) / 4;
    floorY = top + dh;
    var doors = [];
    for (var i = 0; i < 3; i++) doors.push({ x: gap + i * (dw + gap), y: top, w: dw, h: dh, m: MACERA[i] });
    // Feza ve Bilbo: yerde, kapıların altında; kapılar onları kapatmaz.
    var feet = H * (dik ? 0.9 : 0.955);
    var fh = Math.min((feet - floorY) * (dik ? 0.8 : 1.0), W * (dik ? 0.38 : 0.26));
    var cx = W * 0.5;
    return { dik: dik, lh: lh, top: top, floorY: floorY, doors: doors, gap: gap, feet: feet, fh: fh,
      feza: { x: cx - fh * 0.36, y: feet, h: fh },
      bilbo: { x: cx + fh * 0.42, y: feet - fh * 0.01, h: fh * 0.78 } };
  }

  // ---------- küçük yardımcılar ----------
  function el(x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, Math.PI * 2); }
  function dolu(c) { g.fillStyle = c; g.fill(); }
  function cizgi(c, w) { g.strokeStyle = c; g.lineWidth = w; g.stroke(); }
  function yuvarlak(x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function kemer(x, y, w, h) {   // üstü yarım daire kapı biçimi
    var r = w / 2; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + r); g.arc(x + r, y + r, r, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath();
  }
  function lgrad(x0, y0, x1, y1, stops) { var gr = g.createLinearGradient(x0, y0, x1, y1); for (var i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]); return gr; }
  function rgrad(x, y, r0, r1, stops) { var gr = g.createRadialGradient(x, y, r0, x, y, r1); for (var i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]); return gr; }
  function yildiz(x, y, r, c) {
    g.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); dolu(c);
  }
  function parilti(x, y, r, c) {   // dört köşeli pırıltı
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); dolu(c);
  }

  // ---------- oda (arka plan; boyut değişince bir kez çizilir) ----------
  function odaCiz() {
    var c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    var keep = g; g = c.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0);
    var fy = L.floorY;
    // duvar kağıdı: sıcak şeftali, yumuşak çizgiler ve küçük kalpler
    g.fillStyle = lgrad(0, 0, 0, fy, [0, '#ffe2bd', 1, '#f8cf9c']); g.fillRect(0, 0, W, fy);
    var sw = Math.max(26, W / 26);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (var x = 0; x < W; x += sw * 2) g.fillRect(x, 0, sw, fy);
    for (var yy = sw * 1.2, row = 0; yy < fy - sw; yy += sw * 1.6, row++)
      for (var xx = (row % 2) * sw + sw * 0.5; xx < W; xx += sw * 2) kalp(xx, yy, sw * 0.16, 'rgba(232,140,120,0.22)');
    // süpürgelik
    g.fillStyle = '#c98b55'; g.fillRect(0, fy - H * 0.012, W, H * 0.02);
    // ahşap zemin
    g.fillStyle = lgrad(0, fy, 0, H, [0, '#d9a066', 1, '#b97a43']); g.fillRect(0, fy + H * 0.008, W, H - fy);
    var ph = Math.max(18, (H - fy) / 7);
    g.strokeStyle = 'rgba(110,60,25,0.22)'; g.lineWidth = 2;
    for (var py = fy + ph, k = 0; py < H; py += ph, k++) {
      g.beginPath(); g.moveTo(0, py); g.lineTo(W, py); g.stroke();
      for (var bx = (k % 2 ? 0.3 : 0.75) * W / 3; bx < W; bx += W / 3) { g.beginPath(); g.moveTo(bx, py - ph); g.lineTo(bx, py); g.stroke(); }
    }
    // yuvarlak halı (Feza ile Bilbo'nun yeri)
    var rx = L.fh * 1.25, ry = Math.min(L.fh * 0.2, (H - L.feet) + L.fh * 0.12), cx = W / 2, cy = L.feet - L.fh * 0.02;
    el(cx, cy + 4, rx, ry); dolu('rgba(80,40,10,0.18)');
    el(cx, cy, rx, ry); dolu('#ef8f86');
    el(cx, cy, rx * 0.82, ry * 0.78); dolu('#ffd27a');
    el(cx, cy, rx * 0.6, ry * 0.56); dolu('#8fd0c8');
    el(cx, cy, rx * 0.36, ry * 0.32); dolu('#ffe9b8');
    // köşelerde saksı bitkileri
    var sy = L.floorY + (H - L.floorY) * (L.dik ? 0.16 : 0.4), sh = L.fh * (L.dik ? 0.42 : 0.5);
    saksi(W * 0.06, sy, sh); saksi(W * 0.94, sy, sh);
    // flama süsü (logonun iki yanında)
    if (!L.dik) flama();
    g = keep; return c;
  }
  function kalp(x, y, r, c) {
    g.beginPath(); g.moveTo(x, y + r * 1.2);
    g.bezierCurveTo(x - r * 2, y - r * 0.2, x - r * 0.8, y - r * 1.6, x, y - r * 0.5);
    g.bezierCurveTo(x + r * 0.8, y - r * 1.6, x + r * 2, y - r * 0.2, x, y + r * 1.2); dolu(c);
  }
  function saksi(x, y, h) {
    var s = h / 100;
    for (var i = 0; i < 7; i++) {
      var a = -Math.PI / 2 + (i - 3) * 0.38;
      g.save(); g.translate(x, y - 30 * s); g.rotate(a + Math.PI / 2);
      el(0, -32 * s, 9 * s, 34 * s); dolu(i % 2 ? '#4f9e4c' : '#62b85a'); g.restore();
    }
    g.beginPath(); g.moveTo(x - 20 * s, y - 34 * s); g.lineTo(x + 20 * s, y - 34 * s); g.lineTo(x + 15 * s, y); g.lineTo(x - 15 * s, y); g.closePath(); dolu('#d9714f');
    yuvarlak(x - 23 * s, y - 38 * s, 46 * s, 9 * s, 3 * s); dolu('#e8865f');
  }
  function flama() {
    var y0 = L.lh * 0.25, renk = ['#ff8a8a', '#ffd166', '#7fd6a8', '#79b8ff', '#c79bff'];
    var yanlar = [[W * 0.01, W * 0.27], [W * 0.73, W * 0.99]];
    for (var s = 0; s < 2; s++) {
      var a = yanlar[s][0], b = yanlar[s][1], n = 6, sag = L.lh * 0.5;
      g.beginPath(); g.moveTo(a, y0); g.quadraticCurveTo((a + b) / 2, y0 + sag, b, y0); cizgi('#a0673a', 2);
      for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n, x = a + (b - a) * t, y = y0 + sag * 2 * t * (1 - t) * 1.0, fw = (b - a) / n * 0.38;
        g.beginPath(); g.moveTo(x - fw, y); g.lineTo(x + fw, y); g.lineTo(x, y + fw * 2.1); g.closePath(); dolu(renk[(i + s) % 5]);
      }
    }
  }

  // ---------- logo: "Feza ve Bilbo'nun Maceraları" ----------
  function logo(t) {
    var h = L.lh, cx = W / 2, cy = h * 0.95, wv = Math.sin(t * 1.3) * 0.012;
    g.save(); g.translate(cx, cy); g.rotate(wv);
    var fs = h * 0.5;
    g.font = '900 ' + fs + 'px "Chalkboard SE", "Comic Sans MS", "Arial Rounded MT Bold", "Avenir Next", system-ui, sans-serif';
    var txt = "Feza ve Bilbo'nun Maceraları", tw = g.measureText(txt).width;
    if (tw > W * 0.86) { fs *= W * 0.86 / tw; g.font = g.font.replace(/\d+(\.\d+)?px/, fs + 'px'); tw = g.measureText(txt).width; }
    var bw = tw + fs * 1.6, bh = fs * 1.7;
    yuvarlak(-bw / 2, -bh / 2 + 4, bw, bh, bh / 2); dolu('rgba(120,60,20,0.25)');
    yuvarlak(-bw / 2, -bh / 2, bw, bh, bh / 2); dolu(lgrad(0, -bh / 2, 0, bh / 2, [0, '#fff6e0', 1, '#ffe0a8']));
    g.lineWidth = Math.max(3, fs * 0.12); g.strokeStyle = '#e59a4c'; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = fs * 0.22; g.strokeStyle = '#ffffff'; g.strokeText(txt, 0, fs * 0.05);
    var gr = lgrad(-tw / 2, 0, tw / 2, 0, [0, '#e2505f', 0.35, '#ef8b2c', 0.65, '#3f9b4a', 1, '#6a56d8']);
    g.fillStyle = gr; g.fillText(txt, 0, fs * 0.05);
    // iki yanda pati izi ve yıldız
    pati(-bw / 2 + fs * 0.45, 0, fs * 0.28, '#8a5a3c'); yildiz(bw / 2 - fs * 0.45, 0, fs * 0.32, '#ffc83d');
    g.restore();
  }
  function pati(x, y, r, c) {
    el(x, y + r * 0.35, r * 0.62, r * 0.5); dolu(c);
    el(x - r * 0.62, y - r * 0.2, r * 0.22, r * 0.28); dolu(c); el(x + r * 0.62, y - r * 0.2, r * 0.22, r * 0.28); dolu(c);
    el(x - r * 0.24, y - r * 0.55, r * 0.22, r * 0.28); dolu(c); el(x + r * 0.24, y - r * 0.55, r * 0.22, r * 0.28); dolu(c);
  }

  // ---------- kapı resimleri (genişlik 100 birim; yükseklik h) ----------
  function topCiz(x, y, r, t) {   // Bilbo'nun mavi topu (krem halkalı)
    el(x, y, r, r); dolu(rgrad(x - r * 0.35, y - r * 0.35, r * 0.1, r, [0, '#a9dcff', 1, '#3d8fd0']));
    g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
    el(x + r * 0.1, y, r * 0.38, r * 1.05, 0.2 + (t || 0)); cizgi('#fff1c9', r * 0.22); g.restore();
    el(x - r * 0.38, y - r * 0.4, r * 0.22, r * 0.14, -0.6); dolu('rgba(255,255,255,0.7)');
  }
  function sahneOrman(h, t) {
    g.fillStyle = lgrad(0, 0, 0, h * 0.6, [0, '#7fd3ff', 1, '#d9f6ff']); g.fillRect(0, 0, 100, h);
    el(78, h * 0.12, 9, 9); dolu('#fff2a0'); el(78, h * 0.12, 13, 13); dolu('rgba(255,240,150,0.35)');
    el(20, h * 0.6, 50, h * 0.14); dolu('#8fd47a'); el(85, h * 0.62, 45, h * 0.12); dolu('#7cc56a');
    agac(12, h * 0.6, 1.0, '#3f9b4a'); agac(88, h * 0.58, 1.1, '#2f8a44'); agac(55, h * 0.55, 0.7, '#4aa850');
    g.fillStyle = '#6cc04a'; g.fillRect(0, h * 0.62, 100, h);
    // dere
    var dy = h * 0.74;
    g.beginPath(); g.moveTo(0, dy - 6);
    for (var x = 0; x <= 100; x += 5) g.lineTo(x, dy - 6 + Math.sin(x * 0.12 + 1) * 2.5);
    for (x = 100; x >= 0; x -= 5) g.lineTo(x, dy + 9 + Math.sin(x * 0.1) * 2.5);
    g.closePath(); dolu('#4ab0e8');
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.4; g.lineCap = 'round';
    for (var i = 0; i < 5; i++) { var sx = ((i * 23 + t * 9) % 110) - 5, sy = dy - 1 + (i % 3) * 3.5; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 6, sy); g.stroke(); }
    // topu burnunda saklayan sevimli timsah
    var bob = Math.sin(t * 2) * 1.2;
    g.save(); g.translate(47, dy + bob);
    el(0, 2, 26, 6); dolu('#3f8f3a');
    for (i = -2; i <= 2; i++) { el(i * 8 - 4, -3, 3, 2.4); dolu('#4fa64a'); }
    el(16, -1, 15, 5.5); dolu('#5bb04a');              // burun
    el(27, -4, 2, 1.4); dolu('#2c6a2a');
    for (i = 0; i < 4; i++) { g.beginPath(); g.moveTo(8 + i * 5, 3); g.lineTo(10 + i * 5, 6); g.lineTo(12 + i * 5, 3); dolu('#fff'); }
    el(4, -6, 5, 5); dolu('#5bb04a'); el(4, -7, 3.6, 3.8); dolu('#fff'); el(5, -6.5, 2, 2.4); dolu('#1d1d1d'); el(5.6, -7.6, 0.8, 0.8); dolu('#fff');
    el(-5, -5, 4.4, 4.4); dolu('#5bb04a'); el(-5, -6, 3.2, 3.4); dolu('#fff'); el(-4.2, -5.6, 1.8, 2.2); dolu('#1d1d1d'); el(-3.6, -6.6, 0.7, 0.7); dolu('#fff');
    el(14, 0, 3, 1.4); dolu('rgba(255,140,140,0.5)');
    topCiz(22, -12 + Math.sin(t * 2 + 0.6) * 0.8, 6, t * 0.3);
    g.restore();
    // çiçekler
    var cr = ['#ff7aa8', '#fff', '#ffd23d'];
    for (i = 0; i < 9; i++) { var fx = 6 + i * 11, fy = h * (0.88 + (i % 3) * 0.035); el(fx, fy, 2.2, 2.2); dolu(cr[i % 3]); el(fx, fy, 0.9, 0.9); dolu('#f39b2a'); }
  }
  function agac(x, y, s, c) {
    g.fillStyle = '#8a5a34'; g.fillRect(x - 3 * s, y - 22 * s, 6 * s, 24 * s);
    el(x, y - 34 * s, 17 * s, 16 * s); dolu(c); el(x - 10 * s, y - 24 * s, 11 * s, 10 * s); dolu(c); el(x + 10 * s, y - 25 * s, 11 * s, 10 * s); dolu(c);
    el(x - 5 * s, y - 40 * s, 7 * s, 5 * s); dolu('rgba(255,255,255,0.18)');
  }
  function mum(x, y, w, hh, t, ph) {   // çizgili pasta mumu + titreyen alev
    g.fillStyle = '#fff'; g.fillRect(x - w / 2, y - hh, w, hh);
    g.save(); g.beginPath(); g.rect(x - w / 2, y - hh, w, hh); g.clip();
    g.strokeStyle = '#ff6fa0'; g.lineWidth = w * 0.45;
    for (var k = -2; k < hh / w + 2; k++) { g.beginPath(); g.moveTo(x - w, y - k * w * 1.4); g.lineTo(x + w, y - k * w * 1.4 - w * 1.2); g.stroke(); }
    g.restore();
    var f = 1 + Math.sin(t * 13 + ph) * 0.12, fx = x + Math.sin(t * 7 + ph) * w * 0.12;
    el(fx, y - hh - w * 1.2, w * 1.6, w * 2.0 * f); dolu('rgba(255,210,90,0.35)');
    g.beginPath(); g.moveTo(fx, y - hh - w * 2.4 * f); g.quadraticCurveTo(fx + w * 0.75, y - hh - w * 0.6, fx, y - hh - w * 0.15);
    g.quadraticCurveTo(fx - w * 0.75, y - hh - w * 0.6, fx, y - hh - w * 2.4 * f); dolu('#ffb52e');
    el(fx, y - hh - w * 0.75, w * 0.28, w * 0.55); dolu('#fff6c0');
  }
  function sahneHala(h, t) {
    g.fillStyle = lgrad(0, 0, 0, h, [0, '#ffe3ef', 1, '#ffc9de']); g.fillRect(0, 0, 100, h);
    for (var y = 6, r = 0; y < h * 0.75; y += 12, r++) for (var x = (r % 2) * 7 + 3; x < 100; x += 14) { el(x, y, 1.8, 1.8); dolu('rgba(255,255,255,0.7)'); }
    // dev masa örtüsü / zemin
    g.fillStyle = '#c99bdc'; g.fillRect(0, h * 0.84, 100, h);
    for (x = 0; x < 100; x += 10) { g.fillStyle = (x / 10) % 2 ? '#b884d0' : '#d8b3e8'; g.fillRect(x, h * 0.84, 10, h); }
    // dev pasta
    var base = h * 0.86, cx = 54;
    var kat = [[78, h * 0.17, '#ff9cc2'], [60, h * 0.15, '#9b5b3a'], [42, h * 0.13, '#ffd6e6']];
    var yy = base;
    for (var i = 0; i < 3; i++) {
      var kw = kat[i][0], kh = kat[i][1];
      yuvarlak(cx - kw / 2, yy - kh, kw, kh, 3); dolu(kat[i][2]);
      g.beginPath(); g.moveTo(cx - kw / 2, yy - kh + 2);   // krema damlaları
      for (var d = 0; d <= 8; d++) { var dx = cx - kw / 2 + kw * d / 8; g.lineTo(dx, yy - kh + 2 + (d % 2 ? kh * 0.32 : kh * 0.12)); }
      g.lineTo(cx + kw / 2, yy - kh); g.lineTo(cx - kw / 2, yy - kh); g.closePath(); dolu('#fffaf2');
      var sp = ['#ff5f7e', '#4ec3ff', '#ffd23d', '#7be07b'];
      for (d = 0; d < 7; d++) { g.save(); g.translate(cx - kw / 2 + 6 + d * (kw - 12) / 6, yy - kh * 0.35 + (d % 2) * 2); g.rotate(d); g.fillStyle = sp[d % 4]; g.fillRect(-1.4, -0.5, 2.8, 1); g.restore(); }
      yy -= kh;
    }
    for (i = 0; i < 3; i++) { el(cx - 12 + i * 12, yy - 1, 3.4, 3.4); dolu('#e8283f'); el(cx - 13 + i * 12, yy - 2.2, 1, 0.8); dolu('#fff'); }
    for (i = 0; i < 5; i++) mum(cx - 16 + i * 8, yy - 2, 3, 13, t, i * 1.7);
    // minicik Feza pastaya bakıyor
    miniFeza(14, base, 20, t);
  }
  function miniFeza(x, y, hh, t) {
    var s = hh / 100;
    g.save(); g.translate(x, y); g.scale(s, s);
    yuvarlak(-14, -50, 28, 34, 10); dolu('#b5cf87');
    g.fillStyle = '#b99a70'; g.fillRect(-13, -20, 26, 10);
    g.fillStyle = '#f2cbb5'; g.fillRect(-10, -12, 7, 10); g.fillRect(3, -12, 7, 10);
    el(-7, -2, 7, 4); dolu('#fff'); el(7, -2, 7, 4); dolu('#fff');
    g.save(); g.translate(13, -44); g.rotate(-2.3 + Math.sin(t * 6) * 0.35); yuvarlak(-4, -2, 26, 9, 4); dolu('#b5cf87'); el(26, 2, 5, 5); dolu('#f2cbb5'); g.restore();
    el(0, -72, 22, 21); dolu('#f2cbb5');
    g.beginPath(); g.arc(0, -74, 23, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(18, -70); g.lineTo(8, -78); g.lineTo(0, -72); g.lineTo(-10, -78); g.lineTo(-19, -68); g.closePath(); dolu('#3a2414');
    el(-7, -66, 3, 4); dolu('#4a2a14'); el(7, -66, 3, 4); dolu('#4a2a14');
    g.beginPath(); g.arc(0, -60, 5, 0.2, Math.PI - 0.2); cizgi('#b0504a', 2);
    g.restore();
  }
  function baloncuk(x, y, r, t) {   // gökkuşağı parıltılı hayal baloncuğu
    el(x, y, r, r); dolu(rgrad(x - r * 0.3, y - r * 0.3, r * 0.1, r, [0, 'rgba(255,255,255,0.08)', 0.75, 'rgba(190,230,255,0.22)', 1, 'rgba(255,255,255,0.5)']));
    g.beginPath(); g.arc(x, y, r * 0.96, 0, Math.PI * 2);
    var gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
    gr.addColorStop(0, 'rgba(255,120,200,0.8)'); gr.addColorStop(0.33, 'rgba(255,230,120,0.8)'); gr.addColorStop(0.66, 'rgba(120,230,200,0.8)'); gr.addColorStop(1, 'rgba(140,150,255,0.8)');
    cizgi(gr, Math.max(0.8, r * 0.07));
    el(x - r * 0.4, y - r * 0.42, r * 0.24, r * 0.13, -0.7); dolu('rgba(255,255,255,0.9)');
    el(x + r * 0.45, y + r * 0.38, r * 0.08, r * 0.08); dolu('rgba(255,255,255,0.7)');
  }
  function kilic(x, y, len, a, t, c) {   // ışın kılıcı
    g.save(); g.translate(x, y); g.rotate(a);
    var p = 0.85 + Math.sin(t * 9) * 0.08;
    yuvarlak(-len, -3.6 * p, len, 7.2 * p, 3.6); dolu(c.replace('1)', '0.28)'));
    yuvarlak(-len, -2.2, len, 4.4, 2.2); dolu(c);
    yuvarlak(-len + 1, -1, len - 2, 2, 1); dolu('#fff');
    yuvarlak(0, -2.6, 13, 5.2, 1.5); dolu('#c9d0da'); g.fillStyle = '#3d4a5c'; g.fillRect(3, -2.6, 2, 5.2); g.fillRect(7, -2.6, 2, 5.2);
    el(1.5, -2.8, 1.2, 1); dolu('#ff4a4a');
    g.restore();
  }
  function sahneHuysuz(h, t) {
    g.fillStyle = lgrad(0, 0, 0, h * 0.5, [0, '#5b3fb8', 1, '#a68bff']); g.fillRect(0, 0, 100, h);
    for (var i = 0; i < 9; i++) yildiz((i * 37) % 96 + 3, (i * 13) % (h * 0.32) + 4, 1.4 + (i % 3) * 0.5, 'rgba(255,240,170,' + (0.6 + 0.4 * Math.sin(t * 3 + i)) + ')');
    // fayanslar
    var ty = h * 0.42;
    g.fillStyle = '#cdeefd'; g.fillRect(0, ty, 100, h);
    g.strokeStyle = 'rgba(120,170,210,0.5)'; g.lineWidth = 0.6;
    for (var y = ty; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(100, y); g.stroke(); }
    for (var x = 0; x < 100; x += 8) { g.beginPath(); g.moveTo(x, ty); g.lineTo(x, h); g.stroke(); }
    // hayal kapıları
    var kr = ['#ff6b6b', '#4fc77a', '#ffb03a'];
    for (i = 0; i < 3; i++) {
      var dx = 10 + i * 30, dh = h * 0.2;
      g.save(); kemer(dx, ty - dh * 0.55, 15, dh); dolu(kr[i]); kemer(dx + 2, ty - dh * 0.55 + 2, 11, dh - 2); dolu('rgba(0,0,0,0.12)');
      el(dx + 12, ty - dh * 0.55 + dh * 0.62, 1.2, 1.2); dolu('#ffe27a'); g.restore();
    }
    // köpüklü küvet
    var by = h * 0.78;
    el(50, h * 0.97, 44, 3); dolu('rgba(60,80,120,0.2)');
    g.fillStyle = '#c0c8d6'; g.fillRect(14, by + h * 0.12, 4, h * 0.06); g.fillRect(82, by + h * 0.12, 4, h * 0.06);
    g.beginPath(); g.moveTo(8, by - 4); g.lineTo(92, by - 4); g.quadraticCurveTo(92, by + h * 0.15, 72, by + h * 0.15); g.lineTo(28, by + h * 0.15); g.quadraticCurveTo(8, by + h * 0.15, 8, by - 4); g.closePath();
    dolu(lgrad(0, by, 0, by + h * 0.15, [0, '#ffffff', 1, '#d8e2f0']));
    for (i = 0; i < 11; i++) { el(12 + i * 7.6, by - 5 - (i % 3) * 2.2, 6 + (i % 2) * 2, 5 + (i % 3)); dolu(i % 2 ? '#ffffff' : '#f2f8ff'); }
    kilic(30, by - 8, 40, -1.05, t, 'rgba(70,170,255,1)');
    // yükselen hayal baloncukları
    for (i = 0; i < 6; i++) {
      var p = ((t * 0.16 + i / 6) % 1), bx = 20 + i * 12 + Math.sin(t * 1.5 + i) * 4, byy = by - 8 - p * h * 0.55;
      baloncuk(bx, byy, 3 + (i % 3) * 1.8 + p * 2.5, t);
    }
    baloncuk(76, h * 0.2, 9, t);
  }
  var SAHNE = [sahneOrman, sahneHala, sahneHuysuz];

  // ---------- kapı ----------
  function kapiCiz(d, i, t, git) {
    var x = d.x, y = d.y, w = d.w, h = d.h, fr = w * 0.075, m = d.m, tamam = bitti(m.id);
    var acil = git && git.i === i ? Math.min(1, (t - git.t0) / 0.6) : 0;
    var hop = (git && git.i === i) ? 0 : Math.sin(t * 2 + i * 1.3) * h * 0.004;
    var bas = basili === i ? 0.97 : 1;
    g.save(); g.translate(x + w / 2, y + h); g.scale(bas, bas); g.translate(-(x + w / 2), -(y + h) + hop);
    // biten macera: altın ışık halesi
    if (tamam) {
      var pul = 0.55 + 0.45 * Math.sin(t * 3 + i);
      g.save(); g.globalAlpha = 0.5 + 0.4 * pul;
      kemer(x - w * 0.09, y - w * 0.09, w * 1.18, h + w * 0.09);
      g.fillStyle = rgrad(x + w / 2, y + h * 0.45, w * 0.3, h * 0.75, [0, 'rgba(255,230,120,0.9)', 1, 'rgba(255,200,60,0)']); g.fill();
      g.restore();
    }
    // gölge
    kemer(x + 5, y + 6, w, h); dolu('rgba(90,45,15,0.22)');
    // çerçeve
    kemer(x, y, w, h); dolu(tamam ? lgrad(x, y, x + w, y + h, [0, '#ffe58a', 0.5, '#f2b632', 1, '#ffd966']) : lgrad(x, y, x + w, y + h, [0, m.acik, 1, m.renk]));
    // resim
    var px = x + fr, py = y + fr, pw = w - 2 * fr, ph = h - fr * 1.6;
    g.save(); kemer(px, py, pw, ph); g.clip();
    g.translate(px, py); g.scale(pw / 100, pw / 100);
    SAHNE[i](ph / (pw / 100), t);
    g.restore();
    // açılınca ışık
    if (acil > 0) {
      g.save(); kemer(px, py, pw, ph); g.clip();
      g.fillStyle = 'rgba(255,250,225,' + (acil * 0.85) + ')'; g.fillRect(px, py, pw, ph); g.restore();
    }
    // kapı kanadı: menteşeden dışarı açık; dokununca tam açılır
    var ang = 0.18 + acil * 0.5, kw = Math.min(L.gap * 0.62, w * 0.2) * (1 - acil * 0.6);
    var hx = x + fr * 0.5, ky = y + w * 0.32;
    g.beginPath(); g.moveTo(hx, ky); g.lineTo(hx - kw, ky - h * 0.05 * (1 + ang)); g.lineTo(hx - kw, y + h + h * 0.035 * (1 + ang)); g.lineTo(hx, y + h); g.closePath();
    dolu(lgrad(hx - kw, 0, hx, 0, [0, '#a7653a', 1, '#c98450']));
    g.save(); g.clip(); g.globalAlpha = 0.35;
    yuvarlak(hx - kw * 0.8, ky + h * 0.08, kw * 0.6, h * 0.22, 3); cizgi('#7a4523', 3);
    yuvarlak(hx - kw * 0.8, ky + h * 0.38, kw * 0.6, h * 0.22, 3); cizgi('#7a4523', 3);
    g.restore();
    el(hx - kw * 0.82, ky + h * 0.34, kw * 0.07 + 2, kw * 0.07 + 2); dolu('#ffd34d');
    // eşik
    yuvarlak(x - w * 0.04, y + h - fr * 0.6, w * 1.08, fr * 0.75, fr * 0.3); dolu(tamam ? '#e6a92a' : m.renk);
    // kemerin tepesinde süs: yıldız (biten) ya da renkli taş
    if (tamam) {
      var ss = w * 0.1 * (1 + 0.08 * Math.sin(t * 4 + i));
      yildiz(x + w / 2, y + fr * 0.4, ss * 1.25, '#fff4b0'); yildiz(x + w / 2, y + fr * 0.4, ss, '#ffb71b');
      for (var k = 0; k < 4; k++) {
        var a = t * 0.9 + k * Math.PI / 2 + i, rr = w * 0.62;
        parilti(x + w / 2 + Math.cos(a) * rr * 0.75, y + h * 0.45 + Math.sin(a) * h * 0.52, w * 0.035 * (1 + Math.sin(t * 5 + k)), 'rgba(255,240,170,0.9)');
      }
    } else { el(x + w / 2, y + fr * 0.4, fr * 0.55, fr * 0.55); dolu('#fff'); el(x + w / 2, y + fr * 0.4, fr * 0.4, fr * 0.4); dolu(m.acik); }
    g.restore();
  }

  // ---------- Feza ----------
  var fezaZipla = 0, bilboZipla = 0, havT = -9, goz = 0;
  function fezaCiz(f, t) {
    var s = f.h / 100, z = fezaZipla > 0 ? Math.sin(Math.min(1, fezaZipla) * Math.PI) * 12 : 0;
    g.save(); g.translate(f.x, f.y); g.scale(s, s);
    el(0, -1, 26, 5); dolu('rgba(80,40,10,0.22)');
    g.translate(0, -z + Math.sin(t * 2.2) * 0.6);
    // bacaklar ve ayakkabılar
    g.fillStyle = '#f2cbb5'; yuvarlak(-11, -16, 8, 14, 3); g.fill(); yuvarlak(3, -16, 8, 14, 3); g.fill();
    for (var sd = -1; sd <= 1; sd += 2) { el(sd * 8, -3.2, 8.5, 4.6); dolu('#f4f2ee'); g.fillStyle = '#3a78e0'; g.fillRect(sd * 8 - 7, -4, 14, 1.6); el(sd * 8 + sd * 2, -2, 4.6, 2); dolu('#e9e4dc'); }
    // şort
    yuvarlak(-15, -27, 30, 13, 4); dolu('#b99a70'); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-0.6, -21, 1.2, 8);
    // sol kol (aşağıda)
    g.save(); g.translate(-13, -48); g.rotate(0.22 + Math.sin(t * 2.2) * 0.04);
    yuvarlak(-4.5, -2, 9, 22, 4.5); dolu('#a8c47a'); el(0, 22, 5, 5); dolu('#f2cbb5'); g.restore();
    // kazak
    g.beginPath(); g.moveTo(-14, -52); g.quadraticCurveTo(0, -57, 14, -52); g.lineTo(17, -25); g.quadraticCurveTo(0, -21, -17, -25); g.closePath(); dolu('#b5cf87');
    g.strokeStyle = 'rgba(90,120,60,0.35)'; g.lineWidth = 1.2;
    for (var r = 0; r < 3; r++) { g.beginPath(); g.moveTo(-15 + r * 0.3, -44 + r * 7); g.lineTo(15 - r * 0.3, -44 + r * 7); g.setLineDash([2, 2.5]); g.stroke(); }
    g.setLineDash([]);
    el(0, -52, 7, 2.6); dolu('#f3eef4');
    el(-7, -38, 2.4, 2.4); dolu('#fff'); el(-7, -38, 1, 1); dolu('#ffd23d');
    // sağ kol: el sallıyor
    var sal = -2.75 + Math.sin(t * 6.5) * 0.33;
    g.save(); g.translate(13, -48); g.rotate(sal);
    yuvarlak(-4.5, -2, 9, 22, 4.5); dolu('#a8c47a'); el(0, 23, 5.6, 5.6); dolu('#f2cbb5');
    el(-3.6, 26, 1.8, 3); dolu('#f2cbb5'); g.restore();
    // baş
    g.save(); g.translate(0, -72); g.rotate(Math.sin(t * 1.6) * 0.04);
    el(-21, 2, 4, 5); dolu('#eebba3'); el(21, 2, 4, 5); dolu('#eebba3');
    el(0, 0, 21.5, 20.5); dolu('#f2cbb5');
    // saç
    g.beginPath(); g.moveTo(-23, 6); g.bezierCurveTo(-27, -20, -12, -27, 0, -26); g.bezierCurveTo(14, -27, 27, -18, 23, 6);
    g.lineTo(20, -3); g.lineTo(16, -6); g.lineTo(13, -9); g.lineTo(8, -5); g.lineTo(4, -10); g.lineTo(-1, -5); g.lineTo(-6, -10); g.lineTo(-10, -5); g.lineTo(-15, -9); g.lineTo(-19, -2); g.closePath();
    dolu(lgrad(0, -26, 0, 6, [0, '#5a3820', 1, '#2c180c']));
    g.strokeStyle = 'rgba(140,90,50,0.55)'; g.lineWidth = 1;
    for (var hk = -2; hk <= 2; hk++) { g.beginPath(); g.moveTo(hk * 6, -23); g.quadraticCurveTo(hk * 7 + 2, -16, hk * 6 + 1, -9); g.stroke(); }
    // yüz
    var kirp = (goz % 4.2) > 4.05 ? 0.15 : 1;
    for (sd = -1; sd <= 1; sd += 2) {
      el(sd * 8, 2, 4.4, 5.2 * kirp); dolu('#4a2a14');
      if (kirp > 0.5) { el(sd * 8, 2.6, 3.2, 3.8); dolu('#7a4a24'); el(sd * 8 - 1.3, 0.4, 1.4, 1.6); dolu('#fff'); el(sd * 8 + 1.4, 4, 0.6, 0.6); dolu('#fff'); }
      g.beginPath(); g.moveTo(sd * 5, -5.5); g.quadraticCurveTo(sd * 8.5, -7.5, sd * 12, -5.8); cizgi('#6a4228', 1.1);
      el(sd * 13, 9, 3.8, 2.4); dolu('rgba(255,130,130,0.45)');
    }
    el(0, 7.5, 1.6, 1.1); dolu('#e2a58c');
    g.beginPath(); g.moveTo(-5, 11.5); g.quadraticCurveTo(0, 16.5, 5, 11.5); g.quadraticCurveTo(0, 13.5, -5, 11.5); dolu('#c4525a');
    g.restore();
    g.restore();
  }

  // ---------- Bilbo: çikolata renkli Labrador, oturuyor ----------
  var COAT = '#67432f', EAR = '#573929', MUZ = '#7a5038';
  function bilboCiz(b, t) {
    var s = b.h / 100, z = bilboZipla > 0 ? Math.sin(Math.min(1, bilboZipla) * Math.PI) * 14 : 0, hav = t - havT < 0.5;
    g.save(); g.translate(b.x, b.y); g.scale(s, s);
    el(0, -1, 34, 6); dolu('rgba(80,40,10,0.22)');
    g.translate(0, -z);
    // kuyruk sallıyor
    var kq = Math.sin(t * (hav || bilboZipla > 0 ? 18 : 9)) * 0.55;
    g.save(); g.translate(22, -10); g.rotate(-0.5 + kq);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(18, -4, 30, -18); cizgi(COAT, 8); g.lineCap = 'round'; g.stroke(); g.lineCap = 'butt';
    g.restore();
    // arka bacaklar + gövde
    el(-21, -12, 15, 12); dolu(EAR); el(21, -12, 15, 12); dolu(EAR);
    el(-25, -2, 10, 4.5); dolu(MUZ); el(25, -2, 10, 4.5); dolu(MUZ);
    el(0, -33, 25, 30); dolu(lgrad(-25, 0, 25, 0, [0, '#5c3b29', 0.5, COAT, 1, '#5a3a28']));
    el(0, -32, 13, 18); dolu('rgba(160,110,75,0.35)');
    // ön bacaklar
    for (var sd = -1; sd <= 1; sd += 2) {
      yuvarlak(sd * 9 - 5.5, -38, 11, 37, 5.5); dolu(sd < 0 ? '#6c4732' : '#62402d');
      el(sd * 9, -2.5, 7.4, 4.4); dolu('#7a5038');
      for (var k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(sd * 9 + k * 2.4, -4.5); g.lineTo(sd * 9 + k * 2.4, -1.5); cizgi('#3e2a1e', 0.8); }
    }
    // tasma
    g.save(); g.translate(0, -56);
    el(0, 0, 15, 5); cizgi('#438b7c', 4.5);
    el(0, 6.5, 3.4, 4); dolu('#e9c45c'); el(0, 6.5, 1.6, 2); dolu('#c59a3a');
    g.restore();
    // baş
    var egik = Math.sin(t * 1.3) * 0.08 + (hav ? -0.05 : 0);
    g.save(); g.translate(0, -74); g.rotate(egik);
    el(0, 0, 21, 19.5); dolu(lgrad(0, -20, 0, 20, [0, '#71492f', 1, '#5f3d2b']));
    el(0, -9, 9, 4); dolu('rgba(255,255,255,0.06)');
    // kulaklar: başın iki yanından sarkar, hafif sallanır
    for (sd = -1; sd <= 1; sd += 2) {
      g.save(); g.translate(sd * 13, -14); g.rotate(sd * (Math.sin(t * 2 + sd) * 0.07 + (bilboZipla > 0 ? 0.35 : 0)));
      g.beginPath(); g.moveTo(-sd * 3, -2); g.bezierCurveTo(sd * 10, -6, sd * 15, 2, sd * 14, 18);
      g.quadraticCurveTo(sd * 13, 27, sd * 6, 26); g.quadraticCurveTo(sd * 1, 24, sd * 1, 12); g.quadraticCurveTo(0, 4, -sd * 3, -2); g.closePath();
      dolu(EAR); g.restore();
    }
    // gözler
    var kirp = ((goz + 1.7) % 3.7) > 3.58 ? 0.15 : 1;
    for (sd = -1; sd <= 1; sd += 2) {
      el(sd * 8.5, -4, 4.1, 4.1 * kirp); dolu('#b88a40');
      if (kirp > 0.5) { el(sd * 8.5, -3.6, 2.8, 3); dolu('#171311'); el(sd * 8.5 - 1.2, -5.3, 1.1, 1.1); dolu('#fff'); }
      g.beginPath(); g.moveTo(sd * 5.5, -10); g.quadraticCurveTo(sd * 9, -11.5, sd * 12, -9.5); cizgi('#4a3022', 1.2);
    }
    // burun ve ağız
    el(0, 9, 11.5, 8.5); dolu(MUZ);
    el(0, 4, 5, 3.4); dolu('#241b19'); el(-1.5, 3, 1.4, 0.8); dolu('rgba(255,255,255,0.45)');
    g.beginPath(); g.moveTo(0, 7.2); g.lineTo(0, 10.5); g.moveTo(-6, 10.5); g.quadraticCurveTo(-3, 13.5, 0, 10.5); g.quadraticCurveTo(3, 13.5, 6, 10.5); cizgi('#3a2620', 1.1);
    var dil = hav ? 1.4 : 1 + Math.sin(t * 7) * 0.08;
    if (hav) { el(0, 14, 5, 3.6); dolu('#3a1e1a'); }
    el(0.5, 14.5 * dil - 0.5, 3.4, 4.6 * dil); dolu('#e07a86'); g.beginPath(); g.moveTo(0.5, 12); g.lineTo(0.5, 16 * dil); cizgi('rgba(150,50,60,0.5)', 0.6);
    g.restore();
    // "hav" çizgileri (yazısız)
    if (hav) {
      g.strokeStyle = 'rgba(120,70,40,0.75)'; g.lineWidth = 2.2; g.lineCap = 'round';
      for (k = 0; k < 3; k++) { g.beginPath(); g.arc(14, -80, 14 + k * 6, -0.9, -0.1); g.stroke(); }
      g.lineCap = 'butt';
    }
    g.restore();
  }

  // ---------- hatıralar ----------
  var acilisT = 0;
  function hatiraCiz(t) {
    var f = L.fh, ft = L.feet, cx = W / 2, gor = Math.min(1, Math.max(0, (t - acilisT - 0.6) / 0.8));
    if (gor <= 0) return;
    var sc = gor < 1 ? 1 + Math.sin(gor * Math.PI) * 0.25 : 1;
    var sx = Math.max(cx - f * 1.02, f * 0.3), rx = Math.min(cx + f * 1.12, W - f * 0.17);
    if (bitti('orman')) {   // Bilbo'nun topu, Bilbo'nun yanında yerde
      var tr = f * 0.12 * sc, tx = rx + Math.sin(t * 0.8) * f * 0.02, ty = ft - tr - Math.abs(Math.sin(t * 2.6)) * f * 0.03;
      el(rx, ft - f * 0.005, tr * 0.9, tr * 0.22); dolu('rgba(80,40,10,0.2)');
      topCiz(tx, ty, tr, t * 0.8);
      if (gor < 1) isilti(tx, ty, tr * 2.2, gor);
    }
    if (bitti('hala')) {   // pasta mumu, küçük sehpanın üstünde
      var ts = f / 100 * sc;
      g.save(); g.translate(sx, ft); g.scale(ts, ts);
      el(0, -1, 22, 4); dolu('rgba(80,40,10,0.2)');
      g.fillStyle = '#a4683c'; g.fillRect(-3, -34, 6, 33); el(0, -2, 10, 3); dolu('#8a5530');
      el(0, -36, 22, 6); dolu('#c4824f'); el(0, -38, 22, 6); dolu('#d99a63');
      el(0, -42, 11, 3.4); dolu('#ffe9f2');                 // tabak
      yuvarlak(-8, -52, 16, 10, 2); dolu('#ff9cc2'); g.fillStyle = '#fffaf2'; g.fillRect(-8, -52, 16, 3);
      mum(0, -52, 3.4, 16, t, 0);
      g.restore();
      if (gor < 1) isilti(sx, ft - f * 0.5, f * 0.3, gor);
    }
    if (bitti('huysuz')) {   // hayal baloncuğu, havada süzülür (karakterlerin üstüne gelmez)
      var br = f * 0.13 * sc, bx = L.dik ? cx + f * 0.3 : cx + f * 1.45, by = (L.dik ? (L.floorY + ft - f) / 2 : L.floorY + f * 0.3) + Math.sin(t * 1.4) * f * 0.04;
      baloncuk(bx + Math.sin(t * 0.9) * f * 0.03, by, br, t);
      if (gor < 1) isilti(bx, by, br * 2, gor);
    }
  }
  function isilti(x, y, r, p) {
    for (var k = 0; k < 6; k++) { var a = k * 1.047 + p * 2; parilti(x + Math.cos(a) * r * p, y + Math.sin(a) * r * p, r * 0.18 * (1 - p), 'rgba(255,236,150,0.95)'); }
  }

  // ---------- yardım eli: bir süre dokunulmazsa kapıları gösterir ----------
  var sonDokunus = 0;
  function yardimEli(t) {
    var bos = t - sonDokunus;
    if (gecis || bos < 7) return;
    var i = Math.floor((bos - 7) / 2.2) % 3, d = L.doors[i], p = ((bos - 7) % 2.2) / 2.2;
    var x = d.x + d.w * 0.62, y = d.y + d.h * 0.62 + Math.sin(p * Math.PI * 4) * d.w * 0.04, s = d.w / 260;
    g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = Math.min(1, Math.sin(p * Math.PI) * 2);
    el(0, -6, 26, 26); dolu('rgba(255,255,255,0.35)');
    g.beginPath(); g.moveTo(-6, 4); g.lineTo(-6, -30); g.quadraticCurveTo(0, -38, 6, -30); g.lineTo(6, 0);
    g.lineTo(24, 2); g.quadraticCurveTo(32, 8, 28, 26); g.quadraticCurveTo(22, 46, 4, 46); g.quadraticCurveTo(-16, 44, -20, 22); g.lineTo(-24, 8); g.quadraticCurveTo(-18, 0, -6, 12); g.closePath();
    dolu('#ffe0c8'); cizgi('#8a5a3c', 3);
    g.restore();
  }

  // ---------- kapıdan geçiş ----------
  var gecis = null, basili = -1;
  function gecisCiz(t) {
    if (!gecis) return;
    var d = L.doors[gecis.i], p = Math.min(1, (t - gecis.t0) / gecis.sure);
    var cx = d.x + d.w / 2, cy = d.y + d.h * 0.55;
    // ışık huzmeleri
    g.save(); g.translate(cx, cy); g.rotate(t * 0.6); g.globalAlpha = Math.min(1, p * 2.5) * 0.55;
    for (var k = 0; k < 12; k++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-W * 0.06, -Math.max(W, H)); g.lineTo(W * 0.06, -Math.max(W, H)); g.closePath(); dolu(d.m.isik); }
    g.restore();
    for (k = 0; k < 14; k++) {
      var a = k * 2.4 + gecis.i, rr = (p * 1.4 + (k % 4) * 0.12) * Math.max(W, H) * 0.5;
      parilti(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, d.w * 0.05 * (1 - p * 0.5), 'rgba(255,245,190,0.95)');
    }
    var beyaz = Math.max(0, (p - 0.45) / 0.55);
    if (beyaz > 0) {
      g.fillStyle = rgrad(cx, cy, 0, Math.max(W, H) * (0.3 + beyaz * 1.2), [0, 'rgba(255,253,240,' + beyaz + ')', 0.7, 'rgba(255,240,200,' + beyaz + ')', 1, 'rgba(255,235,190,' + (beyaz * beyaz) + ')']);
      g.fillRect(0, 0, W, H);
    }
  }
  function kapiyaGit(i, t) {
    if (gecis) return;
    var m = MACERA[i];
    var sure = 1.7;
    if (SES.calisiyor()) { SES.cal(m.id); sure = Math.min(3.0, Math.max(1.7, ((window.EV_SURE || {})[m.id] || 1.7) - 0.25)); }
    SES.cin();
    gecis = { i: i, t0: t, sure: sure }; fezaZipla = 0.001; bilboZipla = 0.001;
    setTimeout(function () { location.href = m.yol + Q; }, sure * 1000);
  }

  // ---------- ses (Emel'in kayıtları + Bilbo havlaması); ?sessiz ile hiç ses yok ----------
  var SES = (function () {
    var ctx = null, tampon = {}, simdiki = null, AC = window.AudioContext || window.webkitAudioContext;
    function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
    function coz(ad, veri) {
      if (!veri || tampon[ad]) return;
      tampon[ad] = 'bekle';
      try { ctx.decodeAudioData(b64(veri), function (b) { tampon[ad] = b; if (bekleyen === ad) { bekleyen = null; cal(ad); } }, function () { tampon[ad] = null; }); }
      catch (e) { tampon[ad] = null; }
    }
    var bekleyen = null;
    function ac() {
      if (SESSIZ || !AC) return false;
      if (!ctx) {
        try { ctx = new AC(); } catch (e) { return false; }
        var S = window.EV_SES || {}; for (var k in S) coz(k, S[k]);
        coz('hav', window.BILBO_BARK_MP3);
      }
      if (ctx.state === 'suspended') ctx.resume();
      // iOS: sessiz bir tampon çalarak ses kilidini aç
      try { var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
      return true;
    }
    function cal(ad, ses) {
      if (!ctx) return;
      var b = tampon[ad];
      if (b === 'bekle') { bekleyen = ad; return; }
      if (!b) return;
      if (ad !== 'hav' && simdiki) { try { simdiki.stop(); } catch (e) {} simdiki = null; }
      var s = ctx.createBufferSource(), gn = ctx.createGain(); gn.gain.value = ses || 1;
      s.buffer = b; s.connect(gn); gn.connect(ctx.destination); s.start(0);
      if (ad !== 'hav') simdiki = s;
    }
    function cin() {   // kapı açılış pırıltı sesi
      if (!ctx) return;
      var n = ctx.currentTime, notes = [784, 988, 1175, 1568, 1976];
      for (var i = 0; i < notes.length; i++) {
        var o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'sine'; o.frequency.value = notes[i];
        gg.gain.setValueAtTime(0.0001, n + i * 0.07); gg.gain.exponentialRampToValueAtTime(0.12, n + i * 0.07 + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, n + i * 0.07 + 0.6);
        o.connect(gg); gg.connect(ctx.destination); o.start(n + i * 0.07); o.stop(n + i * 0.07 + 0.65);
      }
    }
    return { ac: ac, cal: cal, cin: cin, calisiyor: function () { return !!ctx; } };
  })();

  // ---------- dokunma ----------
  var ilkDokunus = true;
  function icinde(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
  function kimde(x, y) {
    for (var i = 0; i < 3; i++) { var d = L.doors[i]; if (icinde(x, y, { x: d.x - d.w * 0.05, y: d.y, w: d.w * 1.1, h: d.h })) return 'k' + i; }
    var f = L.feza, b = L.bilbo;
    if (icinde(x, y, { x: f.x - f.h * 0.3, y: f.y - f.h, w: f.h * 0.6, h: f.h })) return 'feza';
    if (icinde(x, y, { x: b.x - b.h * 0.42, y: b.y - b.h, w: b.h * 0.84, h: b.h })) return 'bilbo';
    return null;
  }
  function selamla() {
    if (!SES.calisiyor()) return;
    var hepsi = bitti('orman') && bitti('hala') && bitti('huysuz'), kut = false;
    try { kut = localStorage.getItem('fezaBilboKutlandi') === '1'; } catch (e) {}
    if (hepsi && !kut) { SES.cal('hepsi'); try { localStorage.setItem('fezaBilboKutlandi', '1'); } catch (e) {} }
    else SES.cal(TAMAM.length ? 'tekrar' : 'giris');
  }
  var simdi = 0;
  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var acildi = SES.ac(), hedef = kimde(e.clientX, e.clientY);
    sonDokunus = simdi;
    if (hedef && hedef.charAt(0) === 'k') { basili = +hedef.charAt(1); ilkDokunus = false; kapiyaGit(basili, simdi); return; }
    if (hedef === 'bilbo') { bilboZipla = 0.001; havT = simdi; SES.cal('hav', 0.8); }
    else if (hedef === 'feza') { fezaZipla = 0.001; if (!ilkDokunus) SES.cal('feza'); }
    if (ilkDokunus && acildi) { ilkDokunus = false; selamla(); }
  });
  cv.addEventListener('pointerup', function () { if (!gecis) basili = -1; });
  window.addEventListener('keydown', function (e) {   // klavye yalnız yedek: 1 2 3
    var i = '123'.indexOf(e.key); if (i >= 0) { SES.ac(); kapiyaGit(i, simdi); }
  });
  window.addEventListener('resize', boyut);
  window.addEventListener('pageshow', function (e) { if (e.persisted) { gecis = null; basili = -1; fezaZipla = bilboZipla = 0; } });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------- döngü ----------
  var once = 0, sesliIdle = false;
  function kare(ms) {
    var t = ms / 1000, dt = Math.min(0.05, t - (once || t)); once = t; simdi = t;
    if (!acilisT) { acilisT = t; sonDokunus = t; }
    goz += dt;
    if (fezaZipla > 0) { fezaZipla += dt * 2.2; if (fezaZipla >= 1) fezaZipla = gecis ? 0.001 : 0; }
    if (bilboZipla > 0) { bilboZipla += dt * 2.5; if (bilboZipla >= 1) bilboZipla = gecis ? 0.001 : 0; }
    if (!sesliIdle && !gecis && !ilkDokunus && t - sonDokunus > 14) { sesliIdle = true; SES.cal('secin'); }
    if (IKON) { ikonCiz(t); requestAnimationFrame(kare); return; }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!arka) arka = odaCiz();
    g.drawImage(arka, 0, 0);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (gecis) {   // seçilen kapıya doğru yakınlaş
      var d = L.doors[gecis.i], p = Math.min(1, (t - gecis.t0) / gecis.sure), z = 1 + Math.pow(p, 2.2) * 2.2;
      var cx = d.x + d.w / 2, cy = d.y + d.h * 0.55;
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#f3d3a6'; g.fillRect(0, 0, cv.width, cv.height);
      g.setTransform(DPR * z, 0, 0, DPR * z, DPR * (cx - cx * z), DPR * (cy - cy * z));
      g.drawImage(arka, 0, 0, W, H);
    }
    logo(t);
    for (var i = 0; i < 3; i++) kapiCiz(L.doors[i], i, t, gecis);
    hatiraCiz(t);
    fezaCiz(L.feza, t);
    bilboCiz(L.bilbo, t);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    yardimEli(t);
    gecisCiz(t);
    requestAnimationFrame(kare);
  }
  // ?ikon: uygulama simgesi için kare çizim (Feza ve Bilbo yakından)
  var IKON = /[?&]ikon\b/.test(Q);
  function ikonCiz(t) {
    var S = Math.min(W, H);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.fillStyle = rgrad(S * 0.5, S * 0.4, S * 0.05, S * 0.8, [0, '#fff3d6', 0.6, '#ffd59a', 1, '#f2a65e']); g.fillRect(0, 0, S, S);
    for (var k = 0; k < 12; k++) { g.save(); g.translate(S / 2, S * 0.42); g.rotate(k * Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-S * 0.08, -S); g.lineTo(S * 0.08, -S); g.closePath(); dolu('rgba(255,255,255,0.16)'); g.restore(); }
    el(S / 2, S * 1.02, S * 0.62, S * 0.2); dolu('#ef8f86'); el(S / 2, S * 1.02, S * 0.5, S * 0.15); dolu('#ffd27a');
    fezaCiz({ x: S * 0.34, y: S * 1.12, h: S * 1.05 }, 0.9);
    bilboCiz({ x: S * 0.72, y: S * 1.06, h: S * 0.8 }, 0.4);
    yildiz(S * 0.12, S * 0.13, S * 0.06, '#ffc83d'); parilti(S * 0.88, S * 0.12, S * 0.05, '#fff'); parilti(S * 0.2, S * 0.28, S * 0.03, '#fff');
  }
  boyut();
  requestAnimationFrame(kare);
  window.__ev = { L: function () { return L; }, kapiyaGit: function (i) { kapiyaGit(i, simdi); }, tamam: TAMAM };

};
