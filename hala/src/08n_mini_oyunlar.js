/* ── Mini oyunlar (MINIGAME.register): şeker yakala, tencere müziği, buz pateni, balon patlat, kek süsle ──
   Hepsi tek bir Canvas 2D katmanında çizilir (ctx.root içinde). Ortak akış: giriş kartı (Aytuğ Hala anlatır, ▶ ya da kendiliğinden
   3-2-1) → oyun (zaman halkası, skor, X) → bitiş (1-3 yıldız, yıldız şeker ödülü, ilk 3 yıldızda gizli çıkartma, ✓ Tamam).
   Kaybetmek yok; her oyun 35-45 s. Sesler yalnız AUD.sfx / AUD.say; cümleler src/02l_mini.js. Kare çizimi update() içinde. */
(() => {
  'use strict';
  if (typeof MINIGAME === 'undefined') return;
  const TAU = Math.PI * 2, PI = Math.PI, R = Math.random;
  const rnd = (a, b) => a + R() * (b - a), clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
  const pick = a => a[(R() * a.length) | 0];
  const outBack = t => { t = clamp(t, 0, 1) - 1; return Math.max(0, t * t * (2.7 * t + 1.7) + 1); };
  const outElastic = t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 9 - 0.75) * TAU / 3) + 1);
  const outCubic = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const FONT = '"Avenir Next Rounded", "Avenir Next", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif';
  const CONF = ['#ff5a7a', '#ffd23f', '#4fb3ff', '#7bd65a', '#b37cff', '#ff8a2a', '#ff7ad9', '#5fe0d0'];

  // ───────── renk / ses yardımcıları ─────────
  const HEXC = {};
  function rgb(h) {
    if (HEXC[h]) return HEXC[h];
    let s = h.replace('#', ''); if (s.length === 3) s = s.split('').map(x => x + x).join('');
    const n = parseInt(s, 16); return (HEXC[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  function shade(h, f) {   // f > 0 açar, f < 0 koyulaştırır
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    return '#' + rgb(h).map(v => Math.round(v + (t - v) * p).toString(16).padStart(2, '0')).join('');
  }
  const rgba = (h, a) => { const c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const hasAud = () => typeof AUD !== 'undefined' && AUD;
  function sfx(name, o) { try { if (hasAud() && AUD.sfx) AUD.sfx(name, o); } catch (e) { /* ses yoksa sessiz */ } }
  const semi = n => Math.pow(2, n / 12);

  // ───────── çizim ilkelleri ─────────
  const RS = 2;   // sprite çözünürlüğü (tasarım biriminin 2 katı)
  function spr(w, h, fn) {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * RS); cv.height = Math.ceil(h * RS);
    const c = cv.getContext('2d'); c.scale(RS, RS); c.translate(w / 2, h / 2); c.lineJoin = 'round'; c.lineCap = 'round';
    fn(c, w, h); return { cv, w, h };
  }
  function blit(c, s, x, y, k, rot, sx, sy, a) {
    c.save(); c.translate(x, y); if (rot) c.rotate(rot);
    c.scale(k * (sx || 1), k * (sy || 1)); if (a !== undefined && a < 1) c.globalAlpha *= Math.max(0, a);
    c.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h); c.restore();
  }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function gloss(c, x, y, rx, ry, rot, a) {
    c.save(); c.globalAlpha *= a === undefined ? 0.7 : a; c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU);
    c.fillStyle = '#fff'; c.fill(); c.restore();
  }
  function ball(c, x, y, rx, ry, col, o) {
    o = o || {}; rx = Math.abs(rx) || 0.01; ry = Math.abs(ry) || 0.01;
    const g = c.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.08, x, y, Math.max(rx, ry) * 1.08);
    g.addColorStop(0, shade(col, 0.5)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.3));
    c.beginPath(); c.ellipse(x, y, rx, ry, o.rot || 0, 0, TAU); c.fillStyle = g; c.fill();
    if (o.line !== 0) { c.lineWidth = o.line || Math.max(1.5, Math.min(rx, ry) * 0.09); c.strokeStyle = o.stroke || shade(col, -0.5); c.stroke(); }
    if (o.gloss !== false) gloss(c, x - rx * 0.36, y - ry * 0.46, rx * 0.3, ry * 0.17, -0.55, 0.75);
  }
  function fillGrad(c, col, x0, y0, x1, y1, lo, hi) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, shade(col, hi === undefined ? 0.35 : hi)); g.addColorStop(1, shade(col, lo === undefined ? -0.2 : lo)); return g;
  }
  function face(c, x, y, s, mood) {   // s: yüz ölçüsü (≈ göz arası mesafe)
    const ex = s * 0.42;
    c.save();
    c.fillStyle = 'rgba(255,92,122,0.38)';
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + d * ex * 1.42, y + s * 0.2, s * 0.15, s * 0.09, 0, 0, TAU); c.fill(); }
    if (mood === 'happy') {
      c.strokeStyle = '#3a1a0e'; c.lineWidth = s * 0.11;
      for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * ex, y + s * 0.06, s * 0.15, PI * 1.15, PI * 1.85); c.stroke(); }
    } else {
      for (const d of [-1, 1]) {
        c.fillStyle = '#2a140a'; c.beginPath(); c.ellipse(x + d * ex, y, s * 0.13, s * 0.17, 0, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x + d * ex - s * 0.04, y - s * 0.07, s * 0.055, 0, TAU); c.fill();
        c.beginPath(); c.arc(x + d * ex + s * 0.05, y + s * 0.06, s * 0.025, 0, TAU); c.fill();
      }
    }
    if (mood === 'happy' || mood === 'open') {
      c.beginPath(); c.moveTo(x - s * 0.2, y + s * 0.2); c.quadraticCurveTo(x, y + s * 0.62, x + s * 0.2, y + s * 0.2); c.closePath();
      c.fillStyle = '#8a2232'; c.fill();
      c.save(); c.clip(); c.fillStyle = '#ff7f95'; c.beginPath(); c.ellipse(x, y + s * 0.44, s * 0.13, s * 0.09, 0, 0, TAU); c.fill(); c.restore();
    } else if (mood === 'o') {
      c.fillStyle = '#8a2232'; c.beginPath(); c.ellipse(x, y + s * 0.3, s * 0.09, s * 0.11, 0, 0, TAU); c.fill();
    } else {
      c.strokeStyle = '#3a1a0e'; c.lineWidth = s * 0.09;
      c.beginPath(); c.arc(x, y + s * 0.1, s * 0.16, 0.18 * PI, 0.82 * PI); c.stroke();
    }
    c.restore();
  }
  function starPath(c, x, y, r1, r2, n, rot) {
    n = n || 5; rot = rot === undefined ? -PI / 2 : rot;
    c.beginPath();
    for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + i * PI / n; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath();
  }
  function star(c, x, y, r, col, o) {
    o = o || {};
    starPath(c, x, y, r, r * 0.5);
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.05, x, y, r * 1.1);
    g.addColorStop(0, shade(col, 0.6)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.25));
    c.fillStyle = g; c.lineWidth = r * 0.16; c.strokeStyle = o.stroke || shade(col, -0.45); c.stroke(); c.fill();
    starPath(c, x - r * 0.05, y - r * 0.1, r * 0.5, r * 0.22); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
    if (o.face) face(c, x, y + r * 0.05, r * 0.42, o.face);
  }
  function heartPath(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y + s * 0.35);
    c.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
    c.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35); c.closePath();
  }
  function txt(c, s, x, y, size, fill, stroke, align) {
    c.font = '900 ' + size + 'px ' + FONT; c.textAlign = align || 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = size * 0.22; c.strokeStyle = stroke || '#5a2a12'; c.strokeText(s, x, y);
    c.fillStyle = fill || '#fff'; c.fillText(s, x, y);
  }
  function noteGlyph(c, x, y, s, col) {   // ♪ notası
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = s * 0.16;
    c.beginPath(); c.ellipse(x - s * 0.18, y + s * 0.42, s * 0.3, s * 0.22, -0.4, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(x + s * 0.08, y + s * 0.4); c.lineTo(x + s * 0.08, y - s * 0.55); c.stroke();
    c.beginPath(); c.moveTo(x + s * 0.08, y - s * 0.55); c.quadraticCurveTo(x + s * 0.5, y - s * 0.4, x + s * 0.45, y - s * 0.05);
    c.quadraticCurveTo(x + s * 0.4, y - s * 0.3, x + s * 0.08, y - s * 0.28); c.fill();
  }

  // ───────── ortak sprite'lar (bir kez) ─────────
  let COMMON = null;
  function common() {
    if (COMMON) return COMMON;
    const S = {};
    S.hala = halaFace(false); S.halaTalk = halaFace(true);
    S.starOn = spr(120, 120, c => star(c, 0, 4, 52, '#ffcf2e', { stroke: '#c97a00', face: 'happy' }));
    S.starOff = spr(120, 120, c => { starPath(c, 0, 4, 52, 26); c.fillStyle = 'rgba(120,80,40,0.18)'; c.fill(); c.lineWidth = 7; c.strokeStyle = 'rgba(120,80,40,0.28)'; c.stroke(); });
    S.starCandy = spr(130, 80, c => {
      for (const d of [-1, 1]) {
        c.beginPath(); c.moveTo(d * 22, 0); c.lineTo(d * 58, -22); c.quadraticCurveTo(d * 50, 0, d * 58, 22); c.closePath();
        c.fillStyle = fillGrad(c, '#ff8ac0', 0, -22, 0, 22); c.fill(); c.lineWidth = 3; c.strokeStyle = '#c4407e'; c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(d * 30, -3); c.lineTo(d * 50, -14); c.moveTo(d * 30, 3); c.lineTo(d * 50, 13); c.stroke();
      }
      star(c, 0, 2, 32, '#ffd23f', { stroke: '#c98100', face: 'smile' });
    });
    S.crown = spr(110, 80, c => {
      c.beginPath(); c.moveTo(-44, 26); c.lineTo(-50, -18); c.lineTo(-24, 4); c.lineTo(0, -30); c.lineTo(24, 4); c.lineTo(50, -18); c.lineTo(44, 26); c.closePath();
      c.fillStyle = fillGrad(c, '#ffc928', 0, -30, 0, 26, -0.15, 0.5); c.fill(); c.lineWidth = 5; c.strokeStyle = '#b8740a'; c.stroke();
      for (const [x, y, col] of [[-50, -20, '#ff5a7a'], [0, -32, '#4fb3ff'], [50, -20, '#7bd65a']]) ball(c, x, y, 8, 8, col, { line: 2 });
      ball(c, 0, 12, 9, 9, '#ff5a7a', { line: 2 });
    });
    S.check = spr(80, 80, c => {
      ball(c, 0, 0, 34, 34, '#4cc95a', { line: 4, stroke: '#2a8a37' });
      c.strokeStyle = '#fff'; c.lineWidth = 9; c.beginPath(); c.moveTo(-15, 1); c.lineTo(-4, 13); c.lineTo(17, -12); c.stroke();
    });
    S.heart = spr(60, 60, c => {
      heartPath(c, 0, 6, 26); c.fillStyle = fillGrad(c, '#ff5a8a', 0, -20, 0, 20); c.fill(); c.lineWidth = 3; c.strokeStyle = '#c42a5a'; c.stroke();
      gloss(c, -10, -6, 6, 4, -0.6, 0.7);
    });
    S.notes = CONF.slice(0, 6).map(col => spr(60, 70, c => {
      c.save(); c.shadowColor = shade(col, -0.5); c.shadowBlur = 0; c.shadowOffsetY = 3; noteGlyph(c, -2, -4, 46, shade(col, -0.1)); c.restore();
      noteGlyph(c, -2, -6, 46, col); gloss(c, -14, 10, 6, 3, -0.4, 0.6);
    }));
    S.spark = spr(64, 64, c => {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,250,200,0.9)'); g.addColorStop(1, 'rgba(255,240,150,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fill();
      starPath(c, 0, 0, 30, 4, 4, 0); c.fillStyle = '#fff'; c.fill();
    });
    COMMON = S; return S;
  }
  function halaFace(talk) {
    return spr(230, 250, c => {
      const hair = '#4a2817', skin = '#f7c9a3';
      // fleece yaka
      c.save();
      c.beginPath(); c.moveTo(-100, 125); c.quadraticCurveTo(-96, 62, -40, 58); c.lineTo(40, 58); c.quadraticCurveTo(96, 62, 100, 125); c.closePath();
      c.fillStyle = fillGrad(c, '#ff6b57', 0, 55, 0, 125, -0.18, 0.2); c.fill(); c.lineWidth = 4; c.strokeStyle = '#b8382a'; c.stroke();
      c.beginPath(); c.moveTo(-46, 52); c.quadraticCurveTo(-60, 82, -34, 96); c.lineTo(0, 74); c.lineTo(34, 96); c.quadraticCurveTo(60, 82, 46, 52); c.closePath();
      c.fillStyle = fillGrad(c, '#ff7a63', 0, 50, 0, 96, -0.1, 0.3); c.fill(); c.stroke();
      c.strokeStyle = '#d24a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 76); c.lineTo(0, 125); c.stroke();
      c.fillStyle = 'rgba(255,220,210,0.35)';
      for (let i = 0; i < 26; i++) { const a = i * 2.4, rr2 = 30 + (i * 37 % 60); c.beginPath(); c.arc(Math.cos(a) * rr2, 100 + Math.sin(a) * 18, 2.5, 0, TAU); c.fill(); }
      c.restore();
      // boyun
      c.fillStyle = shade(skin, -0.08); rr(c, -20, 30, 40, 34, 12); c.fill();
      // arka saç + topuz
      c.fillStyle = fillGrad(c, hair, 0, -110, 0, 60, -0.15, 0.15);
      c.beginPath(); c.ellipse(0, -14, 82, 86, 0, 0, TAU); c.fill();
      ball(c, 0, -98, 38, 30, '#5a311d', { line: 4, stroke: '#2e160b' });
      c.strokeStyle = '#3a1d10'; c.lineWidth = 3; c.beginPath(); c.arc(0, -98, 22, PI * 1.1, PI * 1.9); c.stroke(); c.beginPath(); c.arc(4, -96, 12, PI * 0.9, PI * 1.8); c.stroke();
      // kulaklar + küpe
      for (const d of [-1, 1]) {
        ball(c, d * 66, -4, 12, 17, skin, { line: 3, stroke: '#c98b68', gloss: false });
        ball(c, d * 68, 16, 5, 5, '#ffcf3a', { line: 1.5, stroke: '#b8840a' });
      }
      // yüz
      ball(c, 0, -6, 64, 70, skin, { line: 4, stroke: '#c98b68', gloss: false });
      gloss(c, -26, -40, 20, 10, -0.4, 0.25);
      // dalgalı perçem
      c.fillStyle = fillGrad(c, hair, -60, -80, 60, -20, -0.1, 0.18);
      c.beginPath(); c.moveTo(-70, -6); c.bezierCurveTo(-78, -70, -40, -92, 0, -86); c.bezierCurveTo(44, -92, 80, -64, 70, -6);
      c.bezierCurveTo(64, -36, 46, -50, 26, -48); c.bezierCurveTo(20, -36, 6, -30, -6, -40);
      c.bezierCurveTo(-18, -50, -36, -46, -46, -38); c.bezierCurveTo(-58, -30, -62, -20, -70, -6); c.closePath(); c.fill();
      c.lineWidth = 3.5; c.strokeStyle = '#2e160b'; c.stroke();
      c.strokeStyle = 'rgba(255,200,160,0.35)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-40, -76); c.quadraticCurveTo(-20, -84, 4, -78); c.stroke();
      // yanlardaki dalgalı tutamlar
      c.strokeStyle = hair; c.lineWidth = 9;
      for (const d of [-1, 1]) {
        c.beginPath(); c.moveTo(d * 66, -24); c.bezierCurveTo(d * 80, 0, d * 62, 18, d * 76, 40); c.bezierCurveTo(d * 82, 52, d * 72, 60, d * 70, 66); c.stroke();
      }
      // kaşlar
      c.strokeStyle = '#3a1d10'; c.lineWidth = 4.5;
      for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 26, -14, 15, PI * 1.25, PI * 1.75); c.stroke(); }
      // gözler (sıcak, gülen)
      for (const d of [-1, 1]) {
        c.fillStyle = '#2b150a'; c.beginPath(); c.ellipse(d * 26, 4, 8.5, 11, 0, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(d * 26 - 2.5, -0.5, 3.5, 0, TAU); c.fill(); c.beginPath(); c.arc(d * 26 + 3, 8, 1.6, 0, TAU); c.fill();
        c.strokeStyle = '#2b150a'; c.lineWidth = 2.5; c.beginPath(); c.arc(d * 26, 4, 11, d > 0 ? -1.1 : PI + 0.75, d > 0 ? -0.75 : PI + 1.1); c.stroke();
      }
      c.fillStyle = 'rgba(255,100,110,0.32)';
      for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 40, 24, 13, 8, 0, 0, TAU); c.fill(); }
      c.strokeStyle = '#c98b68'; c.lineWidth = 3; c.beginPath(); c.moveTo(-2, 14); c.quadraticCurveTo(4, 22, -2, 26); c.stroke();
      // ağız
      if (talk) {
        c.beginPath(); c.ellipse(0, 40, 15, 12, 0, 0, TAU); c.fillStyle = '#8a2232'; c.fill();
        c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-15, 28, 30, 6); c.fillStyle = '#ff7f95'; c.beginPath(); c.ellipse(0, 50, 10, 6, 0, 0, TAU); c.fill(); c.restore();
        c.lineWidth = 2.5; c.strokeStyle = '#6a1a25'; c.stroke();
      } else {
        c.beginPath(); c.moveTo(-20, 34); c.quadraticCurveTo(0, 56, 20, 34); c.quadraticCurveTo(0, 42, -20, 34); c.closePath();
        c.fillStyle = '#8a2232'; c.fill(); c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-20, 33, 40, 6); c.restore();
        c.lineWidth = 2.5; c.strokeStyle = '#6a1a25'; c.stroke();
      }
    });
  }

  // ───────── parçacıklar ─────────
  function emitP(G, k, x, y, o) {
    const p = G.parts[G.pi]; G.pi = (G.pi + 1) % G.parts.length;
    p.on = true; p.k = k; p.x = x; p.y = y; p.vx = o.vx || 0; p.vy = o.vy || 0; p.g = o.g || 0; p.drag = o.drag || 0;
    p.life = 0; p.max = o.max || 1; p.s = o.s || 10; p.rot = o.rot || 0; p.vr = o.vr || 0; p.col = o.col || '#fff'; p.spr = o.spr || null;
    p.t = o.t || ''; p.ph = R() * TAU; return p;
  }
  function confetti(G, x, y, n, power) {
    const u = G.u; power = power || 1;
    for (let i = 0; i < n; i++) {
      const a = -PI / 2 + rnd(-1.2, 1.2), v = rnd(250, 650) * u * power;
      emitP(G, 'c', x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900 * u, drag: 2.2, max: rnd(1.2, 2.2), s: rnd(7, 13) * u, rot: rnd(0, TAU), vr: rnd(-12, 12), col: pick(CONF) });
    }
  }
  function sparkles(G, x, y, n, sp) {
    const u = G.u;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), v = rnd(80, 300) * u * (sp || 1);
      emitP(G, 's', x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 3, max: rnd(0.4, 0.8), s: rnd(14, 28) * u, rot: rnd(0, TAU), vr: rnd(-4, 4) });
    }
  }
  function puff(G, x, y, col, r) { emitP(G, 'r', x, y, { max: 0.45, s: r, col }); }
  function hearts(G, x, y, n) {
    const u = G.u;
    for (let i = 0; i < n; i++) emitP(G, 'h', x + rnd(-20, 20) * u, y, { vx: rnd(-80, 80) * u, vy: rnd(-260, -140) * u, drag: 1.2, max: rnd(0.9, 1.4), s: rnd(0.5, 0.9) * u, vr: rnd(-1, 1) });
  }
  function notesBurst(G, x, y, n) {
    const u = G.u, S = common();
    for (let i = 0; i < n; i++) emitP(G, 'n', x + rnd(-30, 30) * u, y, { vx: rnd(-140, 140) * u, vy: rnd(-380, -220) * u, drag: 1.4, max: rnd(0.9, 1.4), s: rnd(0.55, 0.95) * u, spr: pick(S.notes), vr: rnd(-2, 2) });
  }
  function scorePop(G, x, y, t, col) { emitP(G, 't', x, y, { vy: -150 * G.u, drag: 2.5, max: 0.95, s: 46 * G.u, t, col: col || '#ff8a2a' }); }
  function drawParts(G, c, dt) {
    const S = common();
    for (const p of G.parts) {
      if (!p.on) continue;
      p.life += dt; if (p.life >= p.max) { p.on = false; continue; }
      const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const q = p.life / p.max, fade = q > 0.7 ? 1 - (q - 0.7) / 0.3 : 1;
      if (p.k === 'c') {
        c.save(); c.globalAlpha = fade; c.translate(p.x + Math.sin(p.life * 9 + p.ph) * 6 * G.u, p.y); c.rotate(p.rot);
        c.scale(1, Math.abs(Math.cos(p.life * 7 + p.ph)) * 0.8 + 0.2); c.fillStyle = p.col; c.fillRect(-p.s / 2, -p.s * 0.32, p.s, p.s * 0.64); c.restore();
      } else if (p.k === 's') {
        blit(c, S.spark, p.x, p.y, (p.s / 40) * (1 - q * 0.6), p.rot, 1, 1, fade);
      } else if (p.k === 'r') {
        c.save(); c.globalAlpha = (1 - q) * 0.8; c.strokeStyle = p.col; c.lineWidth = Math.max(1, 10 * G.u * (1 - q));
        c.beginPath(); c.arc(p.x, p.y, p.s * (0.4 + outCubic(q) * 0.9), 0, TAU); c.stroke(); c.restore();
      } else if (p.k === 'h') {
        blit(c, S.heart, p.x + Math.sin(p.life * 5 + p.ph) * 10 * G.u, p.y, p.s * (q < 0.15 ? q / 0.15 : 1), p.rot * 0.3, 1, 1, fade);
      } else if (p.k === 'n') {
        blit(c, p.spr, p.x + Math.sin(p.life * 6 + p.ph) * 14 * G.u, p.y, p.s * (q < 0.12 ? q / 0.12 : 1), Math.sin(p.life * 5 + p.ph) * 0.3, 1, 1, fade);
      } else if (p.k === 't') {
        c.save(); c.globalAlpha = fade; const k = q < 0.2 ? outBack(q / 0.2) : 1;
        c.translate(p.x, p.y); c.scale(k, k); txt(c, p.t, 0, 0, p.s, '#fff', shade(p.col, -0.35)); c.restore();
      } else if (p.k === 'w') {   // su damlası
        c.save(); c.globalAlpha = fade; c.translate(p.x, p.y); c.rotate(Math.atan2(p.vy, p.vx) - PI / 2);
        c.fillStyle = '#5fb8ff'; c.beginPath(); c.ellipse(0, 0, p.s * 0.55, p.s, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(-p.s * 0.15, p.s * 0.3, p.s * 0.2, 0, TAU); c.fill(); c.restore();
      } else if (p.k === 'i') {
        blit(c, p.spr, p.x, p.y, p.s, p.rot, 1, 1, fade);
      }
    }
  }

  // ───────── ortak kabuk: giriş → oyun → bitiş ─────────
  function shell(id, cfg) {
    MINIGAME.register(id, {
      ad: cfg.ad, holdsWorld: true, yildizlar: cfg.stars ? [1, cfg.stars[0], cfg.stars[1]] : undefined,   // (merkez Mini Oyun Köşesi yıldızları)
      start(ctx) { ctx.data.G = makeG(ctx, cfg); },
      update(dt, ctx) { const G = ctx.data.G; return G ? tick(G, Math.min(Math.max(dt, 0), 0.05)) : 'done'; },
      end(ctx) { const G = ctx.data.G; if (G) cleanup(G); return ctx.score; },
    });
  }
  function makeG(ctx, cfg) {
    const root = ctx.root;
    root.style.cssText = 'position:fixed;inset:0;z-index:60;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;' +
      '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;overflow:hidden;background:' + (cfg.bgCol || '#fbe3c4');
    root.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none';
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    root.appendChild(cv); root.appendChild(probe);
    const G = { ctx, cfg, id: ctx.id, root, cv, c: cv.getContext('2d'), probe, W: 0, H: 0, u: 1, dpr: 1, bg: null,
      phase: 'intro', pt: 0, time: 0, score: 0, disp: 0, bump: 0, parts: [], pi: 0, shake: 0, flash: 0,
      ptr: { x: 0, y: 0, down: false, id: -1, seen: false }, keys: {}, st: {}, S: {}, done: false, stars: 0, early: false,
      lastCheer: 0, cheerLast: '', talkT: 0, safe: { t: 0, r: 0, b: 0, l: 0 }, btn: {}, cd: -1, endT: 0, revealed: 0, sticker: false, record: false };
    for (let i = 0; i < 380; i++) G.parts.push({ on: false });
    root._mini = G;   // QA için (genel ad değil)
    G.com = common();
    G.S = cfg.sprites ? cfg.sprites() : {};
    G.icon = spr(320, 220, c => cfg.icon(c, G.S, G.com));
    const pos = e => { const r = root.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    G.onDown = e => {
      e.preventDefault(); const [x, y] = pos(e);
      if (!G.ptr.down || e.pointerId === G.ptr.id) { G.ptr.x = x; G.ptr.y = y; G.ptr.down = true; G.ptr.id = e.pointerId; G.ptr.seen = true; }
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* yok */ }
      press(G, x, y);
    };
    G.onMove = e => {
      if (G.ptr.down && e.pointerId !== G.ptr.id) return;
      if (!G.ptr.down && e.pointerType !== 'mouse') return;
      const [x, y] = pos(e); G.ptr.x = x; G.ptr.y = y; G.ptr.seen = true;
    };
    G.onUp = e => {
      if (e.pointerId !== G.ptr.id) return;
      const [x, y] = pos(e); G.ptr.x = x; G.ptr.y = y; G.ptr.down = false; G.ptr.id = -1;
      if (G.phase === 'play' && cfg.up) cfg.up(G, x, y);
    };
    G.onKey = e => {
      const k = e.key, dn = e.type === 'keydown';
      if (dn) e.stopPropagation();   // mini oyun açıkken oyunun kısayolları (duraklat, iksir…) çalışmasın
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') { G.keys[k] = dn; e.preventDefault(); e.stopPropagation(); }
      if (dn && !e.repeat && (k === 'Enter' || k === ' ')) {
        e.preventDefault(); e.stopPropagation();
        if (G.phase === 'intro') startCount(G); else if (G.phase === 'end' && G.pt > 1) G.done = true;
      }
      if (dn && k === 'Escape') { e.preventDefault(); closeBtn(G); }
      if (dn && G.phase === 'play' && cfg.key) cfg.key(G, k);
    };
    root.addEventListener('pointerdown', G.onDown); root.addEventListener('pointermove', G.onMove);
    root.addEventListener('pointerup', G.onUp); root.addEventListener('pointercancel', G.onUp);
    root.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', G.onKey, true); window.addEventListener('keyup', G.onKey, true);
    // Altyazı: oyunun kendi altyazısı bu katmanın altında kalır; metni burada (Hala'nın yanında) gösteriyoruz
    if (hasAud()) {
      G.prevSub = AUD.onSubtitle;
      G.subFn = (text, key) => { G.cap = text || ''; G.capT = 0; if (typeof G.prevSub === 'function') { try { G.prevSub(text, key); } catch (e) { /* yok */ } } };
      AUD.onSubtitle = G.subFn;
    }
    resize(G);
    say(G, 'mini_' + G.id + '_giris', 3);
    sfx('open', { vol: 0.7 });
    return G;
  }
  function cleanup(G) {
    window.removeEventListener('keydown', G.onKey, true); window.removeEventListener('keyup', G.onKey, true);
    if (hasAud() && AUD.onSubtitle === G.subFn) AUD.onSubtitle = G.prevSub;
    G.parts.length = 0; G.bg = null;
  }
  function say(G, key, prio) {
    try {
      if (!hasAud() || !AUD.say) return;
      const d = prio >= 3 ? AUD.say(key, { prio: 3, interrupt: true }) : AUD.say(key, { prio: prio || 2 });
      if (prio >= 3 && !G.subFn) G.talkT = Math.min(3.2, (typeof d === 'number' && d > 0 ? d : 2.2));
    } catch (e) { /* ses yok */ }
  }
  function G_cheer(G, force) {   // ara sıra, çeşitli övgü
    if (G.phase !== 'play' || G.time - G.lastCheer < 8) return;
    if (!force && R() > 0.35) return;
    let k; do k = 'mini_' + G.id + '_' + (1 + ((R() * 3) | 0)); while (k === G.cheerLast);
    G.cheerLast = k; G.lastCheer = G.time; say(G, k, 2);
  }
  function addScore(G, n, x, y, col) {
    G.score += n; G.ctx.score = G.score; G.bump = 1;
    if (x !== undefined) scorePop(G, x, y, '+' + n, col);
  }
  function resize(G) {
    const W = Math.max(320, G.root.clientWidth || window.innerWidth), H = Math.max(240, G.root.clientHeight || window.innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    G.W = W; G.H = H; G.dpr = dpr; G.u = Math.min(W / 1180, H / 820);
    G.cv.width = Math.round(W * dpr); G.cv.height = Math.round(H * dpr);
    try {
      const cs = getComputedStyle(G.probe);
      G.safe = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    } catch (e) { /* yok */ }
    G.pad = 14 * G.u + 6;
    // ortak düğmeler
    const u = G.u, s = G.safe;
    G.btn.close = { x: W - s.r - G.pad - 40 * u - 4, y: s.t + G.pad + 40 * u + 4, r: Math.max(37, 40 * u) };
    G.hudY = s.t + G.pad + 40 * u + 4;   // HUD satırının ortası
    G.hudBottom = G.hudY + 48 * u;
    const bg = document.createElement('canvas'); bg.width = G.cv.width; bg.height = G.cv.height;
    const b = bg.getContext('2d'); b.scale(dpr, dpr); b.lineJoin = 'round'; b.lineCap = 'round';
    G.cfg.bg(b, W, H, G.u, G);
    G.bg = bg;
    if (G.cfg.layout) G.cfg.layout(G);
  }
  const inC = (b, x, y, extra) => b && (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) <= Math.pow(b.r + (extra || 0), 2);
  function closeBtn(G) {
    sfx('click');
    if (G.phase === 'play') { G.early = true; toEnd(G); } else G.done = true;
  }
  function press(G, x, y) {
    if (inC(G.btn.close, x, y, 10)) { closeBtn(G); return; }
    if (G.phase === 'intro') { if (G.pt > 0.25) startCount(G); return; }
    if (G.phase === 'play') { if (G.cfg.down) G.cfg.down(G, x, y); return; }
    if (G.phase === 'end' && G.pt > 0.8 && inC(G.btn.ok, x, y, 16)) { sfx('click'); G.done = true; }
  }
  function startCount(G) {
    if (G.phase !== 'intro') return;
    G.phase = 'count'; G.pt = 0; G.cd = -1; sfx('whoosh', { vol: 0.6 });
  }
  function toEnd(G) {
    if (G.phase === 'end') return;
    const cfg = G.cfg, sc = G.score;
    let st = sc >= cfg.stars[1] ? 3 : sc >= cfg.stars[0] ? 2 : 1;
    if (G.early && sc <= 0) st = 0;
    G.stars = st; G.phase = 'end'; G.pt = 0; G.revealed = 0;
    let prev = 0;
    try { const r = GAME.P.miniOyunlar && GAME.P.miniOyunlar[G.id]; prev = r ? r.enIyi || 0 : 0; } catch (e) { /* yok */ }
    G.record = prev > 0 && sc > prev;
    try { if (st > 0 && typeof HIS !== 'undefined' && HIS && HIS.addStarCandy) HIS.addStarCandy(st); } catch (e) { /* yok */ }
    try { if (st === 3 && typeof GAME !== 'undefined' && GAME.giveSticker) G.sticker = !!GAME.giveSticker('mini_' + G.id, 'gizli'); } catch (e) { /* yok */ }
    if (cfg.onEnd) cfg.onEnd(G);
    sfx('cheer', { vol: 0.7 });
    if (st > 0) { say(G, 'mini_' + G.id + '_son', 3); say(G, 'mini_son_' + st, 2); }
    if (G.record) say(G, 'mini_rekor', 2);
    if (G.sticker) say(G, 'mini_cikartma', 2);
    confetti(G, G.W / 2, G.H * 0.35, 50, 1.2);
  }
  function tick(G, dt) {
    if (G.done) return 'done';
    if (G.root.clientWidth && (Math.abs(G.root.clientWidth - G.W) > 1 || Math.abs(G.root.clientHeight - G.H) > 1)) resize(G);
    G.pt += dt; G.talkT = Math.max(0, G.talkT - dt); G.capT = (G.capT || 0) + dt;
    const cfg = G.cfg;
    if (G.phase === 'intro' && G.pt > 6.5) startCount(G);
    if (G.phase === 'count') {
      const n = Math.floor(G.pt / 0.75);
      if (n !== G.cd) {
        G.cd = n;
        if (n < 3) sfx('bell', { pitch: semi([0, 4, 7][n]), vol: 0.75 });
        else { G.phase = 'play'; G.pt = 0; G.time = 0; sfx('levelup', { vol: 0.6 }); if (cfg.onPlay) cfg.onPlay(G); }
      }
    }
    if (G.phase === 'play') {
      G.time += dt;
      cfg.update(G, dt, true);
      if (G.time >= cfg.dur) toEnd(G);
    } else if (G.phase !== 'end') cfg.update(G, dt, false);
    else cfg.update(G, dt * 0.5, false);
    if (G.phase === 'end') {
      const need = G.stars, t0 = 0.7, gap = 0.55;
      while (G.revealed < need && G.pt > t0 + G.revealed * gap) {
        G.revealed++;
        sfx('bell', { pitch: semi([0, 4, 7][G.revealed - 1] + 12), vol: 0.9 }); sfx('star', { vol: 0.6 });
        const L = G.endLayout; if (L) { const sx = L.starX[G.revealed - 1]; confetti(G, sx, L.starY, 22, 0.8); sparkles(G, sx, L.starY, 10, 1.2); }
        G.shake = Math.max(G.shake, 0.5);
      }
      if (G.pt > t0 + need * gap + 5.5) G.done = true;
    }
    G.disp += (G.score - G.disp) * Math.min(1, dt * 10); if (Math.abs(G.score - G.disp) < 0.5) G.disp = G.score;
    G.bump = Math.max(0, G.bump - dt * 3.5); G.shake = Math.max(0, G.shake - dt * 2.5); G.flash = Math.max(0, G.flash - dt * 3);
    render(G, dt);
    return G.done ? 'done' : undefined;
  }

  // ───────── çizim: sahne + HUD + kartlar ─────────
  function render(G, dt) {
    const c = G.c, W = G.W, H = G.H, u = G.u;
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(G.bg, 0, 0);
    c.setTransform(G.dpr, 0, 0, G.dpr, 0, 0); c.lineJoin = 'round'; c.lineCap = 'round';
    c.save();
    if (G.shake > 0) { const a = G.shake * G.shake * 9 * u; c.translate(Math.sin(G.pt * 61) * a, Math.cos(G.pt * 53) * a); }
    G.cfg.draw(G, c);
    drawParts(G, c, dt);
    c.restore();
    if (G.flash > 0) { c.fillStyle = 'rgba(255,255,240,' + (G.flash * 0.35) + ')'; c.fillRect(0, 0, W, H); }
    if (G.phase === 'play' || G.phase === 'count') drawHud(G, c);
    if (G.phase === 'intro') drawIntro(G, c);
    if (G.phase === 'count') drawCount(G, c);
    if (G.phase === 'end') drawEnd(G, c);
    drawCaption(G, c);
    drawClose(G, c);
  }
  function drawCaption(G, c) {
    if (G.cap && (G.capT || 0) > 1.6 + G.cap.length * 0.075) G.cap = '';   // kayıt/ses yoksa da bir süre sonra kaybolsun
    if (!G.cap) return;
    const u = G.u, fs = Math.max(15, 23 * u), maxW = Math.min(G.W * 0.6, 640 * u);
    if (G.capFor !== G.cap) {   // satırlara böl (bir kez)
      G.capFor = G.cap; c.font = '800 ' + fs + 'px ' + FONT;
      const words = G.cap.split(/\s+/), lines = []; let ln = '';
      for (const w of words) { const t = ln ? ln + ' ' + w : w; if (c.measureText(t).width > maxW - 90 * u && ln) { lines.push(ln); ln = w; } else ln = t; }
      if (ln) lines.push(ln);
      G.capLines = lines.slice(0, 3); G.capW = Math.max(...G.capLines.map(l => c.measureText(l).width));
    }
    const lh = fs * 1.25, h = Math.max(56 * u, G.capLines.length * lh + 22 * u), w = G.capW + 96 * u;
    const x = G.W / 2 - w / 2, y = G.H - G.safe.b - h - 10 * u;
    c.save();
    c.fillStyle = 'rgba(40,15,50,0.25)'; rr(c, x, y + 5 * u, w, h, h / 2); c.fill();
    c.fillStyle = 'rgba(58,28,72,0.86)'; rr(c, x, y, w, h, Math.min(h / 2, 30 * u)); c.fill();
    c.lineWidth = 3 * u; c.strokeStyle = 'rgba(255,214,140,0.9)'; c.stroke();
    drawHalaMini(G, c, x + 34 * u, y + h / 2, u * 0.36);
    c.font = '800 ' + fs + 'px ' + FONT; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    G.capLines.forEach((l, i) => c.fillText(l, x + 70 * u, y + h / 2 + (i - (G.capLines.length - 1) / 2) * lh + 1));
    c.restore();
  }
  function drawClose(G, c) {
    const b = G.btn.close, r = b.r;
    c.save(); c.translate(b.x, b.y);
    c.fillStyle = 'rgba(70,20,10,0.25)'; c.beginPath(); c.ellipse(0, r * 0.12, r, r, 0, 0, TAU); c.fill();
    ball(c, 0, 0, r * 0.94, r * 0.94, '#ff6f61', { line: r * 0.1, stroke: '#ffffff' });
    c.strokeStyle = '#fff'; c.lineWidth = r * 0.2; const a = r * 0.32;
    c.beginPath(); c.moveTo(-a, -a); c.lineTo(a, a); c.moveTo(a, -a); c.lineTo(-a, a); c.stroke();
    c.restore();
  }
  function pill(c, x, y, w, h, col) {
    c.fillStyle = 'rgba(70,30,10,0.22)'; rr(c, x, y + h * 0.08, w, h, h / 2); c.fill();
    rr(c, x, y, w, h, h / 2); c.fillStyle = fillGrad(c, '#fffaf0', 0, y, 0, y + h, -0.06, 0.4); c.fill();
    c.lineWidth = h * 0.08; c.strokeStyle = col; c.stroke();
  }
  function drawHud(G, c) {
    const u = G.u, s = G.safe, y = G.hudY, x0 = s.l + G.pad, h = 76 * u;
    // skor
    const w = 186 * u;
    pill(c, x0, y - h / 2, w, h, G.cfg.color);
    const b = 1 + Math.sin(G.bump * PI) * 0.35 * G.bump;
    blit(c, G.S.scoreIcon || G.com.starCandy, x0 + h * 0.52, y, u * 0.62 * b, Math.sin(G.bump * 12) * 0.2 * G.bump);
    c.save(); c.translate(x0 + h + (w - h) * 0.45, y + 2 * u); c.scale(b * 0.9 + 0.1, b * 0.9 + 0.1);
    txt(c, String(Math.round(G.disp)), 0, 0, 46 * u, '#fff', shade(G.cfg.color, -0.4)); c.restore();
    // zaman halkası
    const cx = x0 + w + 18 * u + 38 * u, r = 36 * u, f = G.phase === 'play' ? clamp(1 - G.time / G.cfg.dur, 0, 1) : 1;
    c.fillStyle = 'rgba(70,30,10,0.22)'; c.beginPath(); c.arc(cx, y + r * 0.1, r + 4 * u, 0, TAU); c.fill();
    c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(cx, y, r + 4 * u, 0, TAU); c.fill();
    const col = f > 0.5 ? '#5ccf6a' : f > 0.22 ? '#ffc23a' : '#ff8a4a';
    c.fillStyle = rgba(col, 0.22); c.beginPath(); c.arc(cx, y, r - 4 * u, 0, TAU); c.fill();
    if (f > 0) {
      c.beginPath(); c.moveTo(cx, y); c.arc(cx, y, r - 4 * u, -PI / 2, -PI / 2 + TAU * f); c.closePath();
      c.fillStyle = fillGrad(c, col, 0, y - r, 0, y + r, -0.15, 0.25); c.fill();
    }
    c.lineWidth = 5 * u; c.strokeStyle = shade(col, -0.35); c.beginPath(); c.arc(cx, y, r, 0, TAU); c.stroke();
    // akrep ucu: küçük güneş yüzü
    const a = -PI / 2 + TAU * f, warn = f < 0.22 && G.phase === 'play' ? 1 + Math.sin(G.time * 12) * 0.12 : 1;
    ball(c, cx, y, 13 * u * warn, 13 * u * warn, '#ffd23f', { line: 2.5 * u, stroke: '#c98100' });
    face(c, cx, y - 1 * u, 10 * u, 'smile');
    ball(c, cx + Math.cos(a) * (r - 4 * u), y + Math.sin(a) * (r - 4 * u), 6 * u, 6 * u, '#fff', { line: 2 * u, stroke: shade(col, -0.4), gloss: false });
  }
  function card(c, x, y, w, h, col) {
    c.fillStyle = 'rgba(60,20,0,0.28)'; rr(c, x + 4, y + 14, w, h, 36); c.fill();
    rr(c, x, y, w, h, 36);
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fffdf6'); g.addColorStop(1, '#ffe9c8');
    c.fillStyle = g; c.fill(); c.lineWidth = 9; c.strokeStyle = col; c.stroke();
    rr(c, x + 10, y + 10, w - 20, h - 20, 28); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.stroke();
  }
  function bigBtn(c, b, col, kind, t) {
    const r = b.r, p = 1 + Math.sin(t * 5) * 0.05;
    c.save(); c.translate(b.x, b.y); c.scale(p, p);
    c.fillStyle = 'rgba(30,60,10,0.3)'; c.beginPath(); c.arc(0, r * 0.14, r, 0, TAU); c.fill();
    ball(c, 0, 0, r, r, col, { line: r * 0.09, stroke: '#fff' });
    c.fillStyle = '#fff'; c.strokeStyle = '#fff';
    if (kind === 'play') {
      c.beginPath(); c.moveTo(-r * 0.26, -r * 0.4); c.lineTo(r * 0.44, 0); c.lineTo(-r * 0.26, r * 0.4); c.closePath();
      c.lineWidth = r * 0.14; c.stroke(); c.fill();
    } else {
      c.lineWidth = r * 0.2; c.beginPath(); c.moveTo(-r * 0.38, r * 0.02); c.lineTo(-r * 0.1, r * 0.3); c.lineTo(r * 0.42, -r * 0.3); c.stroke();
    }
    c.restore();
  }
  function drawHala(G, c, x, y, k, happyBob) {
    if (!(k > 0.01)) return;
    const talking = (G.cap || G.talkT > 0) && Math.sin(G.pt * 18) > -0.2;
    const bob = Math.sin(G.pt * 2.4) * 4 * G.u, tilt = Math.sin(G.pt * 1.7) * 0.05;
    c.fillStyle = 'rgba(60,20,0,0.22)'; c.beginPath(); c.ellipse(x, y + 128 * k, 92 * k, 14 * k, 0, 0, TAU); c.fill();
    blit(c, talking ? G.com.halaTalk : G.com.hala, x, y + bob + (happyBob ? -Math.abs(Math.sin(G.pt * 6)) * 8 * G.u : 0), k, tilt);
    if (G.cap || G.talkT > 0) {   // ses dalgaları
      c.save(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 6 * k;
      for (let i = 0; i < 3; i++) {
        const q = (G.pt * 1.6 + i / 3) % 1; c.globalAlpha = 1 - q;
        c.beginPath(); c.arc(x + 70 * k, y - 10 * k, (40 + q * 50) * k, -0.6, 0.6); c.stroke();
      }
      c.restore();
    }
  }
  function dim(G, c, a) { c.fillStyle = 'rgba(50,20,40,' + a + ')'; c.fillRect(0, 0, G.W, G.H); }
  function drawIntro(G, c) {
    const W = G.W, H = G.H, u = G.u, t = G.pt, cfg = G.cfg;
    dim(G, c, 0.3 * Math.min(1, t * 4));
    const k = outBack(t / 0.5);
    const cw = Math.min(560 * u, W * 0.52), ch = cw * 0.9, cx = W * 0.56, cy = H * 0.45;
    c.save(); c.translate(cx, cy); c.scale(k, k); c.rotate((1 - k) * 0.1);
    card(c, -cw / 2, -ch / 2, cw, ch, cfg.color);
    // resim
    const pw = cw - 44 * u, ph = pw * 0.62, px = -pw / 2, py = -ch / 2 + 22 * u;
    c.save(); rr(c, px, py, pw, ph, 26 * u); c.clip();
    c.fillStyle = cfg.iconBg || '#bfe6ff'; c.fillRect(px, py, pw, ph);
    const ik = Math.max(pw / 320, ph / 220); blit(c, G.icon, 0, py + ph / 2 + Math.sin(t * 2) * 3 * u, ik);
    c.restore();
    rr(c, px, py, pw, ph, 26 * u); c.lineWidth = 5 * u; c.strokeStyle = shade(cfg.color, -0.15); c.stroke();
    txt(c, cfg.ad, 0, (py + ph + ch / 2 - 56 * u) / 2 + 4 * u, Math.min(52 * u, cw * 0.095), '#fff', shade(cfg.color, -0.45));
    c.restore();
    // Hala
    const hk = Math.min(u * 1.05, (cx - cw / 2) / 260);
    drawHala(G, c, cx - cw / 2 - 110 * hk, cy + 30 * u, hk * outBack((t - 0.15) / 0.5));
    // ▶
    const r = Math.max(50, 62 * u);
    G.btn.play = { x: cx, y: cy + ch / 2 + 6 * u, r };
    if (t > 0.3) bigBtn(c, G.btn.play, '#4cc95a', 'play', t);
    // kendiliğinden başlama ipucu: düğmenin etrafında dolan halka
    if (t > 1.5) {
      const q = clamp((t - 1.5) / 5, 0, 1);
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 7 * u;
      c.beginPath(); c.arc(G.btn.play.x, G.btn.play.y, r + 12 * u, -PI / 2, -PI / 2 + TAU * q); c.stroke();
    }
  }
  function drawCount(G, c) {
    const n = 3 - Math.floor(G.pt / 0.75), q = (G.pt % 0.75) / 0.75, u = G.u;
    if (n < 1) return;
    const k = outElastic(q * 1.6) * (q > 0.8 ? 1 - (q - 0.8) * 2.5 : 1);
    const col = ['#4cc95a', '#4fb3ff', '#ff5a7a'][n - 1];
    c.save(); c.translate(G.W / 2, G.H * 0.47); c.scale(k, k); c.rotate((1 - k) * 0.3);
    c.fillStyle = 'rgba(60,20,0,0.25)'; c.beginPath(); c.arc(0, 14 * u, 130 * u, 0, TAU); c.fill();
    ball(c, 0, 0, 130 * u, 130 * u, col, { line: 10 * u, stroke: '#fff' });
    txt(c, String(n), 0, 8 * u, 190 * u, '#fff', shade(col, -0.45));
    c.restore();
  }
  function drawEnd(G, c) {
    const W = G.W, H = G.H, u = G.u, t = G.pt, cfg = G.cfg;
    dim(G, c, 0.38 * Math.min(1, t * 3));
    const k = outBack(t / 0.55);
    const cw = Math.min(600 * u, W * 0.56), ch = Math.min(520 * u, H * 0.72), cx = W * 0.56, cy = H * 0.48;
    const L = G.endLayout || (G.endLayout = {});
    L.starY = cy - ch * 0.22; L.starX = [cx - cw * 0.27, cx, cx + cw * 0.27];
    c.save(); c.translate(cx, cy); c.scale(k, k); c.translate(-cx, -cy);
    card(c, cx - cw / 2, cy - ch / 2, cw, ch, cfg.color);
    // yıldızlar
    for (let i = 0; i < 3; i++) {
      const sx = L.starX[i], sy = L.starY + (i === 1 ? -16 * u : 0), sz = (i === 1 ? 1.25 : 1.05) * u;
      blit(c, G.com.starOff, sx, sy, sz);
      if (i < G.revealed) {
        const q = (t - (0.7 + i * 0.55)) / 0.5, kk = outElastic(clamp(q, 0, 1)) * (1 + Math.sin(t * 3 + i) * 0.04);
        blit(c, G.com.starOn, sx, sy, sz * kk, (1 - clamp(q, 0, 1)) * 1.4);
      }
    }
    // skor satırı
    const rowY = cy + ch * 0.04;
    blit(c, G.S.scoreIcon || G.com.starCandy, cx - 70 * u, rowY, 0.8 * u, Math.sin(t * 3) * 0.08);
    txt(c, String(G.score), cx + 26 * u, rowY + 3 * u, 70 * u, '#fff', shade(cfg.color, -0.45));
    if (G.record && t > 0.9) {
      const q = outBack((t - 0.9) / 0.5);
      blit(c, G.com.crown, cx + 26 * u, rowY - 62 * u, 0.75 * u * q, Math.sin(t * 2.5) * 0.12);
    }
    // ödül: yıldız şeker × n  (+ çıkartma)
    const rwY = cy + ch * 0.27;
    if (G.stars > 0 && t > 0.7 + G.stars * 0.55) {
      const q = outBack((t - 0.7 - G.stars * 0.55) / 0.45);
      c.save(); c.translate(cx - (G.sticker ? 90 * u : 0), rwY); c.scale(q, q);
      pill(c, -110 * u, -40 * u, 220 * u, 80 * u, '#ffb23f');
      blit(c, G.com.starCandy, -50 * u, 0, 0.72 * u, Math.sin(t * 4) * 0.12);
      txt(c, '+' + G.stars, 48 * u, 3 * u, 50 * u, '#fff', '#b86a00');
      c.restore();
      if (G.sticker) {
        const sx = cx + 120 * u, r = 62 * u, kk = outElastic(clamp((t - 0.9 - G.stars * 0.55) / 0.6, 0, 1));
        c.save(); c.translate(sx, rwY - 6 * u); c.rotate(0.12 + Math.sin(t * 2) * 0.05); c.scale(kk, kk);
        c.fillStyle = 'rgba(60,20,0,0.25)'; c.beginPath(); c.arc(4 * u, 8 * u, r, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        c.save(); c.beginPath(); c.arc(0, 0, r - 7 * u, 0, TAU); c.clip(); c.fillStyle = cfg.iconBg || '#bfe6ff'; c.fillRect(-r, -r, 2 * r, 2 * r);
        blit(c, G.icon, 0, 0, (2 * r) / 200); c.restore();
        c.lineWidth = 3 * u; c.strokeStyle = shade(cfg.color, -0.2); c.beginPath(); c.arc(0, 0, r - 7 * u, 0, TAU); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(r * 0.3, -r * 0.95); c.lineTo(r * 0.95, -r * 0.3); c.lineTo(r * 0.55, -r * 0.55); c.fill();
        c.restore();
      }
    }
    c.restore();
    drawHala(G, c, cx - cw / 2 - 120 * Math.min(u, (cx - cw / 2) / 250), cy + 40 * u, Math.min(u * 1.05, (cx - cw / 2) / 250), true);
    const r = Math.max(50, 60 * u);
    G.btn.ok = { x: cx, y: cy + ch / 2 + 4 * u, r };
    if (t > 0.6) bigBtn(c, G.btn.ok, '#4cc95a', 'ok', t);
  }

  // ═════════════════════════════════════════ 1) ŞEKER YAKALA ═════════════════════════════════════════
  const BROWN = '#7a4a2b', BROWN_D = '#4e2a16', BROWN_L = '#a8724a';
  function candySprite(kind, col) {
    return spr(90, kind === 1 ? 120 : 90, c => {
      if (kind === 0) {   // sargılı bonbon
        for (const d of [-1, 1]) {
          c.beginPath(); c.moveTo(d * 18, 0); c.lineTo(d * 42, -16); c.quadraticCurveTo(d * 36, 0, d * 42, 16); c.closePath();
          c.fillStyle = fillGrad(c, shade(col, 0.25), 0, -16, 0, 16); c.fill(); c.lineWidth = 2.5; c.strokeStyle = shade(col, -0.45); c.stroke();
          c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(d * 24, -3); c.lineTo(d * 37, -10); c.stroke();
        }
        ball(c, 0, 0, 25, 21, col, { line: 3 });
        c.save(); c.beginPath(); c.ellipse(0, 0, 23, 19, 0, 0, TAU); c.clip(); c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 5;
        for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 12 - 14, -22); c.lineTo(i * 12 + 14, 22); c.stroke(); } c.restore();
        gloss(c, -9, -10, 8, 4, -0.5, 0.8);
        face(c, 0, 1, 15, 'smile');
      } else if (kind === 1) {   // lolipop
        c.fillStyle = '#fff'; c.strokeStyle = '#d6c4b0'; c.lineWidth = 2; rr(c, -4, 8, 8, 50, 4); c.fill(); c.stroke();
        c.strokeStyle = rgba(col, 0.6); c.lineWidth = 3; for (let y = 16; y < 56; y += 10) { c.beginPath(); c.moveTo(-4, y); c.lineTo(4, y - 5); c.stroke(); }
        ball(c, 0, -16, 32, 32, col, { line: 3.5, gloss: false });
        c.save(); c.beginPath(); c.arc(0, -16, 30, 0, TAU); c.clip(); c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 6;
        c.beginPath(); for (let a = 0; a < 16; a += 0.15) { const r = a * 2.1; c.lineTo(Math.cos(a) * r, -16 + Math.sin(a) * r); } c.stroke(); c.restore();
        gloss(c, -12, -30, 9, 5, -0.6, 0.85);
        face(c, 0, -14, 14, 'smile');
      } else if (kind === 2) {   // jelibon
        c.beginPath(); c.moveTo(-28, 4); c.bezierCurveTo(-30, -22, 0, -20, 4, -8); c.bezierCurveTo(8, -18, 32, -18, 30, 4);
        c.bezierCurveTo(28, 24, -26, 26, -28, 4); c.closePath();
        const g = c.createRadialGradient(-8, -10, 2, 0, 0, 34); g.addColorStop(0, shade(col, 0.55)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.3));
        c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = shade(col, -0.5); c.stroke();
        gloss(c, -14, -8, 8, 4, -0.3, 0.85); gloss(c, 16, -6, 5, 3, 0.3, 0.6);
        face(c, 2, 4, 14, 'smile');
      } else {   // yıldız şeker
        star(c, 0, 2, 36, col, { face: 'smile' });
      }
    });
  }
  function sockSprite() {
    return spr(80, 110, c => {
      const sock = () => { c.beginPath(); c.moveTo(-16, -48); c.lineTo(16, -48); c.lineTo(16, 14); c.quadraticCurveTo(18, 36, 0, 42);
        c.lineTo(-24, 42); c.quadraticCurveTo(-40, 40, -38, 26); c.quadraticCurveTo(-36, 14, -16, 10); c.closePath(); };
      sock(); c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-50, -60, 100, 120);
      for (let y = -46; y < 10; y += 14) { c.fillStyle = y % 28 === 0 ? '#ff5a7a' : '#4fb3ff'; c.fillRect(-50, y, 100, 7); }
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(-28, 34, 14, 0, TAU); c.fill(); c.beginPath(); c.arc(10, 32, 10, 0, TAU); c.fill();
      c.restore(); sock(); c.lineWidth = 3.5; c.strokeStyle = '#7a5a8a'; c.stroke();
      c.fillStyle = '#ff5a7a'; rr(c, -18, -54, 36, 10, 5); c.fill(); c.stroke();
    });
  }
  function bilboSprite(open) {
    return spr(260, 230, c => {
      // gövde (göğüs)
      ball(c, 0, 70, 78, 62, BROWN, { gloss: false, stroke: BROWN_D, line: 4 });
      c.fillStyle = rgba('#c08a5e', 0.6); c.beginPath(); c.ellipse(0, 70, 36, 40, 0, 0, TAU); c.fill();
      // kulaklar
      for (const d of [-1, 1]) {
        c.save(); c.translate(d * 66, -34); c.rotate(d * -0.28);
        c.beginPath(); c.ellipse(0, 18, 25, 46, 0, 0, TAU); c.fillStyle = fillGrad(c, '#5e3520', 0, -30, 0, 60, -0.2, 0.15); c.fill();
        c.lineWidth = 4; c.strokeStyle = '#3a1d0e'; c.stroke(); c.restore();
      }
      // kafa
      ball(c, 0, -34, 76, 66, BROWN, { stroke: BROWN_D, line: 4.5, gloss: false });
      gloss(c, -30, -72, 24, 11, -0.35, 0.3);
      // ağız bölgesi
      ball(c, 0, -2, 44, 31, BROWN_L, { stroke: shade(BROWN_L, -0.35), line: 3, gloss: false });
      // ağız
      if (open) {
        c.beginPath(); c.moveTo(-24, 4); c.quadraticCurveTo(0, 46, 24, 4); c.quadraticCurveTo(0, 12, -24, 4); c.closePath();
        c.fillStyle = '#7a1f2b'; c.fill(); c.save(); c.clip(); c.fillStyle = '#ff7f95'; c.beginPath(); c.ellipse(0, 28, 14, 10, 0, 0, TAU); c.fill(); c.restore();
        c.lineWidth = 3; c.strokeStyle = '#3a1d0e'; c.stroke();
      } else {
        c.strokeStyle = '#3a1d0e'; c.lineWidth = 3.5;
        c.beginPath(); c.moveTo(0, -4); c.lineTo(0, 6); c.arc(-9, 6, 9, 0, PI * 0.9); c.moveTo(0, 6); c.arc(9, 6, 9, PI, PI * 0.1, true); c.stroke();
        c.fillStyle = '#ff7f95'; c.beginPath(); c.ellipse(0, 18, 8, 9, 0, 0, PI); c.fill(); c.strokeStyle = '#c4405a'; c.lineWidth = 2; c.stroke();
      }
      // burun
      ball(c, 0, -18, 16, 11, '#2a1610', { line: 2, stroke: '#140a06' });
      // gözler
      for (const d of [-1, 1]) {
        c.fillStyle = '#1e0f08'; c.beginPath(); c.ellipse(d * 30, -50, 10, 12, 0, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(d * 30 - 3, -54, 4, 0, TAU); c.fill(); c.beginPath(); c.arc(d * 30 + 3.5, -45, 1.8, 0, TAU); c.fill();
        c.strokeStyle = '#3a1d0e'; c.lineWidth = 3; c.beginPath(); c.arc(d * 30, -62, 12, PI * 1.25, PI * 1.75); c.stroke();
      }
      c.fillStyle = 'rgba(255,110,120,0.35)'; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 50, -24, 12, 7, 0, 0, TAU); c.fill(); }
      // tasma
      c.fillStyle = '#ff4d5e'; rr(c, -46, 24, 92, 14, 7); c.fill(); c.strokeStyle = '#a8202e'; c.lineWidth = 2.5; c.stroke();
      ball(c, 0, 42, 10, 10, '#ffd23f', { line: 2, stroke: '#b8840a' });
    });
  }
  function basketSprite() {
    return spr(250, 140, c => {
      // gövde (yamuk)
      const body = () => { c.beginPath(); c.moveTo(-104, -40); c.lineTo(104, -40); c.lineTo(86, 52); c.quadraticCurveTo(84, 62, 72, 62); c.lineTo(-72, 62); c.quadraticCurveTo(-84, 62, -86, 52); c.closePath(); };
      body();
      c.fillStyle = fillGrad(c, '#e0a85c', 0, -40, 0, 62, -0.25, 0.1); c.fill();
      c.save(); c.clip();
      c.strokeStyle = 'rgba(140,80,20,0.45)'; c.lineWidth = 3;
      for (let y = -30; y < 62; y += 15) { c.beginPath(); c.moveTo(-110, y); c.lineTo(110, y); c.stroke(); }
      for (let i = -7; i <= 7; i++) for (let y = -38; y < 62; y += 30) { c.fillStyle = 'rgba(255,230,180,0.35)'; rr(c, i * 15 - 5 + ((y / 15) & 1) * 7, y, 10, 13, 4); c.fill(); }
      c.restore();
      body(); c.lineWidth = 4; c.strokeStyle = '#8a5418'; c.stroke();
      // kenar (rulo)
      c.fillStyle = fillGrad(c, '#f0bd70', 0, -52, 0, -28, -0.2, 0.25); rr(c, -114, -52, 228, 24, 12); c.fill(); c.lineWidth = 4; c.strokeStyle = '#8a5418'; c.stroke();
      c.strokeStyle = 'rgba(140,80,20,0.5)'; c.lineWidth = 2.5; for (let x = -104; x < 110; x += 12) { c.beginPath(); c.moveTo(x, -50); c.lineTo(x + 8, -30); c.stroke(); }
      // kurdele
      ball(c, 70, -10, 14, 10, '#ff5a7a', { line: 2.5 }); ball(c, 92, -10, 14, 10, '#ff5a7a', { line: 2.5 }); ball(c, 81, -10, 7, 7, '#ff8aa0', { line: 2.5, stroke: '#b8304a' });
      // patiler kenarda
      for (const d of [-1, 1]) {
        ball(c, d * 54, -50, 24, 17, BROWN_L, { stroke: BROWN_D, line: 3.5, gloss: false });
        c.strokeStyle = BROWN_D; c.lineWidth = 2.5; for (const o of [-7, 7]) { c.beginPath(); c.moveTo(d * 54 + o, -40); c.lineTo(d * 54 + o, -46); c.stroke(); }
      }
    });
  }
  shell('sekerYakala', {
    ad: 'Şeker Yakala', color: '#ff7a59', iconBg: '#ffe0b8', bgCol: '#ffd9b0', dur: 35, stars: [12, 25],
    sprites() {
      const S = { candy: [], cols: ['#ff5a7a', '#4fb3ff', '#7bd65a', '#b37cff', '#ff8a2a', '#ff7ad9'] };
      for (let k = 0; k < 4; k++) S.candy.push(S.cols.map(col => candySprite(k, col)));
      S.gold = candySprite(0, '#ffc21a'); S.sock = sockSprite();
      S.bilbo = bilboSprite(false); S.bilboOpen = bilboSprite(true); S.basket = basketSprite();
      S.scoreIcon = S.candy[0][0];
      return S;
    },
    icon(c, S) {
      const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#ffe7c6'); g.addColorStop(1, '#ffc996'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      c.fillStyle = '#d99a62'; c.fillRect(-160, 70, 320, 40);
      blit(c, S.bilboOpen, 0, 2, 0.55); blit(c, S.basket, 0, 54, 0.55);
      blit(c, S.candy[0][0], -100, -60, 0.8, 0.3); blit(c, S.candy[1][1], 110, -50, 0.65, -0.3); blit(c, S.candy[3][2], -40, -88, 0.6, 0.2);
      blit(c, S.gold, 60, -86, 0.7, -0.2); blit(c, S.candy[2][4], -125, 10, 0.6);
    },
    bg(b, W, H, u) {
      const fy = H * 0.84;
      let g = b.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, '#ffe9cf'); g.addColorStop(1, '#ffcf9e'); b.fillStyle = g; b.fillRect(0, 0, W, fy);
      const sw = 60 * u; for (let x = 0; x < W; x += sw * 2) { b.fillStyle = 'rgba(255,255,255,0.25)'; b.fillRect(x, 0, sw, fy); }
      b.fillStyle = 'rgba(255,140,120,0.18)';
      for (let x = sw / 2; x < W; x += sw * 2) for (let y = 30 * u; y < fy; y += 70 * u) { heartPath(b, x + sw, y + ((x / sw) % 4 ? 35 * u : 0), 9 * u); b.fill(); }
      // pencere
      const wx = W * 0.07, wy = H * 0.2, ww = W * 0.24, wh = H * 0.36;
      b.fillStyle = 'rgba(120,60,20,0.18)'; rr(b, wx + 6, wy + 10, ww, wh, 20 * u); b.fill();
      rr(b, wx, wy, ww, wh, 20 * u); g = b.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#7fc8ff'); g.addColorStop(1, '#d6f0ff'); b.fillStyle = g; b.fill();
      b.save(); b.clip(); b.fillStyle = '#fff';
      for (const [x, y, s] of [[0.3, 0.3, 1], [0.75, 0.55, 0.8]]) { const cx = wx + ww * x, cy = wy + wh * y, r = 26 * u * s; b.beginPath(); b.arc(cx, cy, r, 0, TAU); b.arc(cx + r, cy + 6 * u, r * 0.8, 0, TAU); b.arc(cx - r, cy + 8 * u, r * 0.7, 0, TAU); b.fill(); }
      b.fillStyle = 'rgba(255,255,255,0.35)'; b.beginPath(); b.moveTo(wx + ww * 0.6, wy); b.lineTo(wx + ww * 0.8, wy); b.lineTo(wx + ww * 0.35, wy + wh); b.lineTo(wx + ww * 0.15, wy + wh); b.fill();
      b.restore();
      b.lineWidth = 14 * u; b.strokeStyle = '#fff6ea'; rr(b, wx, wy, ww, wh, 20 * u); b.stroke();
      b.lineWidth = 9 * u; b.beginPath(); b.moveTo(wx + ww / 2, wy); b.lineTo(wx + ww / 2, wy + wh); b.moveTo(wx, wy + wh / 2); b.lineTo(wx + ww, wy + wh / 2); b.stroke();
      // raf + kavanozlar
      const sy = H * 0.34, sx0 = W * 0.66, sx1 = W * 0.95;
      b.fillStyle = 'rgba(120,60,20,0.2)'; b.fillRect(sx0, sy + 12 * u, sx1 - sx0, 10 * u);
      b.fillStyle = '#c98a55'; rr(b, sx0, sy, sx1 - sx0, 16 * u, 6 * u); b.fill();
      [['#ff7a8a', 0.12], ['#7bd65a', 0.42], ['#4fb3ff', 0.72]].forEach(([col, f], i) => {
        const x = sx0 + (sx1 - sx0) * f, w = 52 * u, h = (70 + i * 10) * u;
        rr(b, x, sy - h, w, h, 14 * u); b.fillStyle = 'rgba(230,248,255,0.75)'; b.fill(); b.lineWidth = 3 * u; b.strokeStyle = '#a7c4d4'; b.stroke();
        for (let j = 0; j < 6; j++) { b.fillStyle = pick(CONF); b.beginPath(); b.arc(x + (10 + (j % 3) * 16) * u, sy - (12 + Math.floor(j / 3) * 16) * u, 7 * u, 0, TAU); b.fill(); }
        b.fillStyle = col; rr(b, x - 3 * u, sy - h - 10 * u, w + 6 * u, 14 * u, 6 * u); b.fill();
        gloss(b, x + 12 * u, sy - h * 0.6, 5 * u, 16 * u, 0, 0.6);
      });
      // flama
      b.lineWidth = 3 * u; b.strokeStyle = '#b8784a'; b.beginPath(); b.moveTo(0, 30 * u); b.quadraticCurveTo(W / 2, 110 * u, W, 30 * u); b.stroke();
      for (let i = 0; i < 18; i++) {
        const t = (i + 0.5) / 18, x = t * W, y = lerp(30 * u, 30 * u, t) + 2 * (1 - t) * t * 80 * u;
        b.fillStyle = CONF[i % CONF.length]; b.beginPath(); b.moveTo(x - 20 * u, y); b.lineTo(x + 20 * u, y); b.lineTo(x, y + 36 * u); b.closePath(); b.fill();
      }
      // süpürgelik + parke
      b.fillStyle = '#fff3e3'; b.fillRect(0, fy - 18 * u, W, 18 * u);
      g = b.createLinearGradient(0, fy, 0, H); g.addColorStop(0, '#d99a62'); g.addColorStop(1, '#b8743e'); b.fillStyle = g; b.fillRect(0, fy, W, H - fy);
      b.strokeStyle = 'rgba(110,55,20,0.35)'; b.lineWidth = 2 * u;
      for (let y = fy + 22 * u, r = 0; y < H; y += 26 * u, r++) {
        b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke();
        for (let x = (r % 2) * 90 * u; x < W; x += 180 * u) { b.beginPath(); b.moveTo(x, y - 26 * u); b.lineTo(x, y); b.stroke(); }
      }
      b.fillStyle = 'rgba(255,255,255,0.12)'; b.fillRect(0, fy, W, 6 * u);
    },
    layout(G) { const st = G.st; st.floorY = G.H * 0.84; st.rimY = st.floorY - 95 * G.u; st.k = G.u * 1.0; if (st.x === undefined) st.x = G.W / 2; st.x = clamp(st.x, 0, G.W); },
    onPlay(G) { G.st.spawnT = 0.3; },
    update(G, dt, live) {
      const st = G.st, u = G.u, W = G.W;
      if (!st.items) { st.items = []; for (let i = 0; i < 40; i++) st.items.push({ on: false }); st.vx = 0; st.lean = 0; st.open = 0; st.sq = 0; st.caught = 0; st.spawnT = 99; st.tw = 0; st.sockSaid = false; st.goldSaid = 0; }
      st.tw += dt;
      // Bilbo hareketi
      let tx = st.x;
      if (G.ptr.seen) tx = G.ptr.x;
      if (G.keys.ArrowLeft) tx = st.x - 900 * u * dt * 1.2, G.ptr.seen = false;
      if (G.keys.ArrowRight) tx = st.x + 900 * u * dt * 1.2, G.ptr.seen = false;
      const half = 110 * st.k; tx = clamp(tx, half, W - half);
      const nx = st.x + (tx - st.x) * Math.min(1, dt * 14);
      st.vx = (nx - st.x) / Math.max(dt, 1e-4); st.x = nx;
      st.lean += (clamp(st.vx / (2400 * u), -0.22, 0.22) - st.lean) * Math.min(1, dt * 10);
      st.open = Math.max(0, st.open - dt); st.sq = Math.max(0, st.sq - dt * 4);
      if (!live) return;
      // doğma
      const prog = clamp(G.time / G.cfg.dur, 0, 1);
      st.spawnT -= dt;
      if (st.spawnT <= 0) {
        st.spawnT = lerp(0.85, 0.45, prog) * rnd(0.8, 1.2);
        const it = st.items.find(i => !i.on);
        if (it) {
          const r = R();
          it.on = true; it.state = 0; it.t = 0;
          it.kind = G.time > 4 && r < 0.07 ? 5 : r < 0.14 ? 4 : (R() * 4) | 0;
          it.col = (R() * 6) | 0;
          it.x = rnd(70 * u, W - 70 * u); it.y = -60 * u; it.vy = lerp(230, 380, prog) * u * rnd(0.9, 1.1); it.vx = 0;
          it.rot = rnd(-0.4, 0.4); it.vr = rnd(-1.5, 1.5); it.ph = rnd(0, TAU);
          if (it.kind === 4 && G.time - st.goldSaid > 12 && R() < 0.6) { st.goldSaid = G.time; say(G, 'mini_sekerYakala_3', 2); G.lastCheer = G.time; }
        }
      }
      for (const it of st.items) {
        if (!it.on) continue;
        it.t += dt;
        if (it.state === 0) {
          it.y += it.vy * dt; it.x += Math.sin(it.t * 2.2 + it.ph) * 30 * u * dt; it.rot += it.vr * dt;
          // mıknatıs: sepete yakın şekerler biraz sepete kayar
          const dx = st.x - it.x;
          if (it.kind !== 5 && it.y > st.rimY - 200 * u && Math.abs(dx) < 140 * st.k) it.x += dx * Math.min(1, dt * 1.5);
          if (it.y > st.rimY - 14 * u && it.y < st.rimY + 34 * u && Math.abs(st.x - it.x) < 108 * st.k) {
            if (it.kind === 5) {   // çorap: zıplar gider
              it.state = 1; it.vy = -560 * u; it.vx = (it.x - st.x >= 0 ? 1 : -1) * rnd(180, 300) * u; it.vr = rnd(-9, 9);
              sfx('bounce', { vol: 0.9 }); sfx('hiccup', { vol: 0.5 }); st.open = 0.5; st.sq = 1; puff(G, it.x, it.y, '#ffffff', 50 * u);
              if (!st.sockSaid) { st.sockSaid = true; say(G, 'mini_sekerYakala_corap', 2); G.lastCheer = G.time; }
            } else {
              it.on = false;
              const gold = it.kind === 4, n = gold ? 3 : 1;
              addScore(G, n, it.x, st.rimY - 60 * u, gold ? '#ffb000' : G.S.cols[it.col]);
              st.caught += n; st.open = 0.35; st.sq = 1;
              sfx(gold ? 'coin' : 'pop', { vol: 0.9 }); if (R() < 0.35) sfx('munch', { vol: 0.35 });
              sparkles(G, it.x, st.rimY - 10 * u, gold ? 14 : 6, gold ? 1.4 : 1);
              if (gold) { confetti(G, it.x, st.rimY - 20 * u, 24, 0.8); G.shake = 0.6; G.flash = 0.6; }
              G_cheer(G);
            }
          } else if (it.y > st.floorY - 18 * u) {   // yere düştü: zıplar, solar
            it.state = 2; it.y = st.floorY - 18 * u; it.vy = -it.vy * 0.28; it.t = 0;
          }
        } else if (it.state === 1) {
          it.vy += 1500 * u * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
          if (it.y > G.H + 120 * u || it.x < -120 * u || it.x > W + 120 * u) it.on = false;
        } else {
          it.vy += 1800 * u * dt; it.y += it.vy * dt; if (it.y > st.floorY - 18 * u) { it.y = st.floorY - 18 * u; it.vy = 0; }
          if (it.t > 0.7) it.on = false;
        }
      }
    },
    draw(G, c) {
      const st = G.st, S = G.S, u = G.u, k = st.k;
      if (!st.items) return;
      // şekerler (arkada değil, önde düşer) — önce gölgeler
      // Bilbo
      const bx = st.x, sq = Math.sin(st.sq * PI) * 0.12;
      c.fillStyle = 'rgba(90,40,10,0.28)'; c.beginPath(); c.ellipse(bx, st.floorY + 4 * u, 125 * k, 18 * k, 0, 0, TAU); c.fill();
      c.save(); c.translate(bx, st.floorY); c.rotate(st.lean); c.scale(1 + sq, 1 - sq);
      // kuyruk (sepetin arkasından sallanır)
      const wag = Math.sin(st.tw * 14) * 0.45;
      c.save(); c.translate(84 * k, -128 * k); c.rotate(0.15 + wag);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(34 * k, -6 * k, 44 * k, -46 * k);
      c.strokeStyle = BROWN_D; c.lineWidth = 19 * k; c.stroke(); c.strokeStyle = BROWN; c.lineWidth = 12 * k; c.stroke();
      c.restore();
      const bob = Math.abs(Math.sin(st.tw * 6)) * Math.min(1, Math.abs(st.vx) / (500 * u)) * 6 * k;
      blit(c, st.open > 0 ? S.bilboOpen : S.bilbo, 0, -205 * k - bob, k, -st.lean * 0.4);
      if (st.tw % 3.4 < 0.13 && st.open <= 0) {   // göz kırpma
        c.save(); c.translate(0, -205 * k - bob); c.rotate(-st.lean * 0.4); c.scale(k, k);
        for (const d of [-1, 1]) {
          c.fillStyle = BROWN; c.beginPath(); c.ellipse(d * 30, -50, 13, 14, 0, 0, TAU); c.fill();
          c.strokeStyle = '#1e0f08'; c.lineWidth = 3.5; c.beginPath(); c.arc(d * 30, -54, 10, 0.2 * PI, 0.8 * PI); c.stroke();
        }
        c.restore();
      }
      // sepette biriken şekerler
      const pile = Math.min(9, Math.ceil(st.caught / 3));
      for (let i = 0; i < pile; i++) {
        const px = (i % 2 ? 1 : -1) * (((i + 1) >> 1) * 22) * k, py = -150 * k - (i % 3) * 5 * k;
        blit(c, S.candy[i % 4][(i * 5) % 6], px, py, k * 0.55, (i % 3 - 1) * 0.5);
      }
      blit(c, S.basket, 0, -95 * k, k);
      c.restore();
      // düşen şekerler
      for (const it of st.items) {
        if (!it.on) continue;
        const a = it.state === 2 ? 1 - it.t / 0.7 : 1;
        if (it.state === 0) { c.fillStyle = 'rgba(90,40,10,0.12)'; c.beginPath(); c.ellipse(it.x, st.floorY + 6 * u, 22 * u * clamp(it.y / st.floorY, 0.2, 1), 6 * u, 0, 0, TAU); c.fill(); }
        if (it.kind === 4) {
          const p = 1 + Math.sin(it.t * 8) * 0.12;
          c.save(); c.globalAlpha = 0.55 * a; blit(c, G.com.spark, it.x, it.y, u * 2.4 * p, it.t * 2); c.restore();
          blit(c, S.gold, it.x, it.y, u * 1.05, it.rot, 1, 1, a);
        } else if (it.kind === 5) blit(c, S.sock, it.x, it.y, u * 0.95, it.rot, 1, 1, a);
        else blit(c, S.candy[it.kind][it.col], it.x, it.y, u * 0.95, it.rot, 1, 1, a);
      }
    },
  });

  // ═════════════════════════════════════════ 2) TENCERE MÜZİĞİ ═════════════════════════════════════════
  const POTS = [   // büyük kapak = kalın ses (pentatonik: Do Re Mi Sol La)
    { col: '#ff5a5a', semi: 0, size: 1.12 }, { col: '#ff9a2e', semi: 2, size: 1.04 }, { col: '#ffd23f', semi: 4, size: 0.97 },
    { col: '#4cc95a', semi: 7, size: 0.9 }, { col: '#4fa8ff', semi: 9, size: 0.84 },
  ];
  const SONG = [0, 1, 2, -1, 2, 3, 4, -1, 4, 3, 2, 1, 2, -1, 0, -1, 2, 2, 3, -1, 4, 4, 3, -1, 2, 3, 2, 1, 0, -1, -1, -1];
  function potSprite(col, happy) {
    return spr(230, 130, c => {
      for (const d of [-1, 1]) { c.fillStyle = shade(col, -0.35); rr(c, d * 96 - 16, -30, 32, 18, 9); c.fill(); c.lineWidth = 3; c.strokeStyle = shade(col, -0.55); c.stroke(); }
      rr(c, -88, -40, 176, 92, 26); c.fillStyle = fillGrad(c, col, -88, 0, 88, 0, -0.25, 0.15);
      const g = c.createLinearGradient(-88, 0, 88, 0); g.addColorStop(0, shade(col, -0.2)); g.addColorStop(0.3, shade(col, 0.25)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.3));
      c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = shade(col, -0.5); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.4)'; rr(c, -70, -30, 22, 60, 11); c.fill();
      c.fillStyle = shade(col, -0.15); rr(c, -92, -44, 184, 14, 7); c.fill(); c.stroke();
      face(c, 4, 4, 46, happy ? 'happy' : 'smile');
    });
  }
  function lidSprite(col) {
    return spr(220, 100, c => {
      c.beginPath(); c.moveTo(-96, 22); c.bezierCurveTo(-92, -38, 92, -38, 96, 22); c.closePath();
      const g = c.createLinearGradient(-96, 0, 96, 0); g.addColorStop(0, shade(col, -0.15)); g.addColorStop(0.3, shade(col, 0.45)); g.addColorStop(0.6, shade(col, 0.1)); g.addColorStop(1, shade(col, -0.3));
      c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = shade(col, -0.5); c.stroke();
      c.beginPath(); c.ellipse(0, 22, 98, 10, 0, 0, TAU); c.fillStyle = shade(col, -0.2); c.fill(); c.stroke();
      gloss(c, -42, -6, 26, 7, -0.25, 0.55);
      c.fillStyle = '#e8e8f0'; rr(c, -9, -30, 18, 14, 4); c.fill(); c.lineWidth = 3; c.strokeStyle = '#8888a0'; c.stroke();
      ball(c, 0, -36, 17, 12, '#fff2b0', { line: 3, stroke: '#b8940a' });
    });
  }
  shell('tencereMuzik', {
    ad: 'Tencere Müziği', color: '#4fa8ff', iconBg: '#d4f2ec', bgCol: '#cfeee6', dur: 40, stars: [12, 24],
    sprites() {
      const S = { pot: POTS.map(p => potSprite(p.col, false)), potH: POTS.map(p => potSprite(p.col, true)), lid: POTS.map(p => lidSprite(p.col)) };
      S.ring = POTS.map(p => spr(120, 120, c => {
        const g = c.createRadialGradient(0, 0, 20, 0, 0, 56); g.addColorStop(0, rgba(p.col, 0)); g.addColorStop(0.7, rgba(p.col, 0.35)); g.addColorStop(1, rgba(p.col, 0));
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 56, 0, TAU); c.fill();
        c.lineWidth = 10; c.strokeStyle = '#fff'; c.beginPath(); c.arc(0, 0, 40, 0, TAU); c.stroke();
        c.lineWidth = 6; c.strokeStyle = p.col; c.stroke();
        ball(c, 0, 0, 30, 30, shade(p.col, 0.55), { line: 0, gloss: false });
        noteGlyph(c, 0, -2, 34, shade(p.col, -0.35));
      }));
      S.scoreIcon = common().notes[0];
      return S;
    },
    icon(c, S) {
      const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#d4f2ec'); g.addColorStop(1, '#a8ddd0'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      c.fillStyle = '#f3ede4'; c.fillRect(-160, 30, 320, 80);
      [[-95, 0], [0, 2], [95, 4]].forEach(([x, i], j) => { blit(c, S.pot[i], x, 66, 0.5); blit(c, S.lid[i], x, 32 - (j === 1 ? 18 : 0), 0.5, j === 1 ? -0.15 : 0); });
      blit(c, S.ring[2], 0, -50, 0.75); blit(c, S.ring[0], -95, -80, 0.55); blit(c, common().notes[3], 70, -60, 0.9, 0.2); blit(c, common().notes[1], 120, -20, 0.7, -0.2);
    },
    bg(b, W, H, u) {
      const sy = H * 0.6;
      // fayans duvar
      b.fillStyle = '#e7f6f1'; b.fillRect(0, 0, W, sy);
      const ts = 64 * u;
      for (let y = 0, r = 0; y < sy; y += ts, r++) for (let x = (r % 2) * ts / 2 - ts; x < W; x += ts) {
        rr(b, x + 3 * u, y + 3 * u, ts - 6 * u, ts - 6 * u, 10 * u);
        b.fillStyle = (Math.floor(x / ts) + r) % 3 === 0 ? '#bfe7dc' : '#d3f0e8'; b.fill();
        gloss(b, x + ts * 0.3, y + ts * 0.25, ts * 0.18, ts * 0.06, -0.3, 0.45);
      }
      // asılı kepçeler
      const rail = 70 * u + 40 * u;
      b.fillStyle = '#c0c6d0'; rr(b, W * 0.3, rail, W * 0.4, 10 * u, 5 * u); b.fill();
      [['#ff7a59', 0.36], ['#4fa8ff', 0.5], ['#ffd23f', 0.64]].forEach(([col, f]) => {
        const x = W * f; b.strokeStyle = '#8a92a0'; b.lineWidth = 4 * u; b.beginPath(); b.arc(x, rail + 5 * u, 8 * u, PI, TAU); b.stroke();
        b.fillStyle = col; rr(b, x - 6 * u, rail + 10 * u, 12 * u, 90 * u, 6 * u); b.fill();
        ball(b, x, rail + 118 * u, 26 * u, 20 * u, col, { line: 3 * u });
      });
      // ocak yüzeyi
      let g = b.createLinearGradient(0, sy, 0, H); g.addColorStop(0, '#fbf6ee'); g.addColorStop(1, '#e3d8c8'); b.fillStyle = g; b.fillRect(0, sy, W, H - sy);
      b.fillStyle = '#c9bba6'; b.fillRect(0, sy, W, 8 * u);
      b.fillStyle = 'rgba(255,255,255,0.6)'; b.fillRect(0, sy + 8 * u, W, 4 * u);
      // düğmeler
      b.fillStyle = '#d9cbb6'; b.fillRect(0, H - 56 * u, W, 56 * u);
      for (let i = 0; i < 5; i++) { const x = W * (0.14 + i * 0.18); ball(b, x, H - 28 * u, 18 * u, 18 * u, '#f4f0ea', { line: 3 * u, stroke: '#9c8c76' }); b.fillStyle = '#9c8c76'; b.fillRect(x - 3 * u, H - 44 * u, 6 * u, 14 * u); }
    },
    layout(G) {
      const W = G.W, H = G.H, u = G.u, st = G.st;
      st.k = Math.min(u * 0.95, W * 0.17 / 200);
      st.lanes = POTS.map((p, i) => ({ x: W * (0.14 + i * 0.18), y: H * 0.74 + (i % 2 ? -8 : 8) * u, k: st.k * p.size }));
      st.top = G.hudBottom + 30 * u;
    },
    onPlay(G) { G.st.song0 = G.time; },
    update(G, dt, live) {
      const st = G.st;
      if (!st.rings) { st.rings = []; for (let i = 0; i < 24; i++) st.rings.push({ on: false }); st.jump = [0, 0, 0, 0, 0]; st.glow = [0, 0, 0, 0, 0]; st.next = 0; st.beat = -1; st.travel = 3 * 60 / 84; }
      for (let i = 0; i < 5; i++) { st.jump[i] = Math.max(0, st.jump[i] - dt * 2.6); st.glow[i] = Math.max(0, st.glow[i] - dt * 2); }
      if (!live) return;
      const spb = 60 / 84, lead = st.travel, t = G.time - lead;   // şarkı zamanı (ilk nota halka yolunu bitirince)
      // ritim davulu
      const beat = Math.floor((G.time) / spb);
      if (beat !== st.beat) { st.beat = beat; if (beat % 2 === 0) sfx('drum', { vol: 0.22, pitch: beat % 4 === 0 ? 1 : 1.2 }); }
      // halkaları doğur (nota zamanı - yol süresi)
      while (true) {
        const idx = st.next, nt = idx * spb, lane = SONG[idx % SONG.length];
        if (nt - lead > t) break;
        st.next++;
        if (lane < 0 || nt + lead > G.cfg.dur - 0.3) continue;
        const r = st.rings.find(q => !q.on);
        if (r) { r.on = true; r.lane = lane; r.nt = nt; r.hit = false; r.miss = false; r.ft = 0; }
      }
      for (const r of st.rings) {
        if (!r.on) continue;
        if (r.hit || r.miss) { r.ft += dt; if (r.ft > 0.4) r.on = false; continue; }
        if (t > r.nt + 0.5) { r.miss = true; r.ft = 0; sfx('bubblePop', { vol: 0.25 }); }
      }
    },
    down(G, x, y) {
      const st = G.st; if (!st.lanes) return;
      if (y < st.top - 20 * G.u) return;
      let li = 0, bd = 1e9;
      st.lanes.forEach((L, i) => { const d = Math.abs(x - L.x); if (d < bd) { bd = d; li = i; } });
      const L = st.lanes[li], t = G.time - st.travel;
      let best = null, bdt = 9;
      for (const r of st.rings) if (r.on && !r.hit && !r.miss && r.lane === li) { const d = Math.abs(r.nt - t); if (d < bdt && (d < 0.5 || (t > r.nt - 0.95))) { bdt = d; best = r; } }
      st.jump[li] = 1;
      const lidY = L.y - 58 * L.k;
      if (best) {
        best.hit = true; best.ft = 0;
        sfx('bell', { pitch: semi(POTS[li].semi), vol: 1 });
        st.glow[li] = 1; addScore(G, 1, L.x, lidY - 70 * G.u, POTS[li].col);
        notesBurst(G, L.x, lidY - 20 * G.u, bdt < 0.18 ? 4 : 2);
        puff(G, L.x, lidY, '#fff', 70 * G.u * L.k / G.u);
        if (bdt < 0.18) { sparkles(G, L.x, lidY, 8, 1.2); puff(G, L.x, lidY, POTS[li].col, 100 * L.k); }
        G_cheer(G);
      } else {
        sfx('bell', { pitch: semi(POTS[li].semi), vol: 0.6 }); notesBurst(G, L.x, lidY - 10 * G.u, 1);
      }
    },
    key(G, k) { const m = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 }; if (k in m && G.st.lanes) G.cfg.down(G, G.st.lanes[m[k]].x, G.H * 0.8); },
    draw(G, c) {
      const st = G.st, S = G.S, u = G.u;
      if (!st.lanes) return;
      const t = G.time - (st.travel || 2.1), playing = G.phase === 'play';
      // şeritler
      st.lanes.forEach((L, i) => {
        const col = POTS[i].col, lidY = L.y - 58 * L.k;
        const g = c.createLinearGradient(0, st.top, 0, lidY); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 0.28 + (st.glow ? st.glow[i] * 0.3 : 0)));
        c.fillStyle = g; rr(c, L.x - 46 * L.k, st.top, 92 * L.k, lidY - st.top, 40 * L.k); c.fill();
        c.strokeStyle = rgba('#ffffff', 0.7); c.lineWidth = 4 * u; c.setLineDash([2 * u, 18 * u]);
        c.beginPath(); c.moveTo(L.x, st.top + 20 * u); c.lineTo(L.x, lidY - 60 * u); c.stroke(); c.setLineDash([]);
        // hedef halka
        const beatP = playing ? 1 + Math.max(0, Math.cos((G.time / (60 / 84)) * TAU)) * 0.05 : 1;
        c.lineWidth = 6 * u; c.strokeStyle = rgba(col, 0.75); c.beginPath(); c.arc(L.x, lidY - 4 * u, 46 * L.k * beatP, 0, TAU); c.stroke();
        c.lineWidth = 3 * u; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(L.x, lidY - 4 * u, 52 * L.k * beatP, 0, TAU); c.stroke();
      });
      // tencereler
      st.lanes.forEach((L, i) => {
        const j = st.jump ? st.jump[i] : 0, hop = Math.sin(j * PI) * 46 * u * Math.min(1, j * 1.6), sq = Math.sin(j * PI * 2) * 0.08 * j;
        c.fillStyle = 'rgba(80,60,30,0.22)'; c.beginPath(); c.ellipse(L.x, L.y + 52 * L.k, 96 * L.k, 16 * L.k, 0, 0, TAU); c.fill();
        blit(c, j > 0.15 ? S.potH[i] : S.pot[i], L.x, L.y, L.k, 0, 1 + sq, 1 - sq);
        blit(c, S.lid[i], L.x, L.y - 58 * L.k - hop, L.k, j * Math.sin(j * 20) * 0.25);
        if (st.glow && st.glow[i] > 0) { c.save(); c.globalAlpha = st.glow[i] * 0.6; blit(c, G.com.spark, L.x, L.y - 70 * L.k - hop, L.k * 3 * (1.4 - st.glow[i] * 0.4)); c.restore(); }
      });
      // halkalar
      if (st.rings) for (const r of st.rings) {
        if (!r.on) continue;
        const L = st.lanes[r.lane], lidY = L.y - 58 * L.k - 4 * u;
        const p = clamp(1 - (r.nt - t) / st.travel, 0, 1.25), y = lerp(st.top, lidY, p);
        let k = L.k * (0.75 + 0.35 * Math.min(1, p)), a = 1;
        if (r.hit) { k *= 1 + r.ft * 3; a = 1 - r.ft / 0.4; }
        if (r.miss) { a = 0.5 * (1 - r.ft / 0.4); k *= 1 - r.ft; }
        if (p > 0.82 && !r.hit && !r.miss) k *= 1 + Math.sin(G.time * 20) * 0.04;
        blit(c, S.ring[r.lane], L.x, r.hit ? lidY : y, k, 0, 1, 1, a);
      }
    },
  });

  // ═════════════════════════════════════════ 3) BUZ PATENİ ═════════════════════════════════════════
  function fezaSprite() {
    return spr(130, 150, c => {
      const skin = '#f8cfae', hair = '#6b3f22';
      // patenler
      for (const d of [-1, 1]) {
        c.strokeStyle = '#a8b4c4'; c.lineWidth = 4; c.beginPath(); c.moveTo(d * 13 - 13, 64); c.lineTo(d * 13 + 13, 64); c.stroke();
        ball(c, d * 13, 55, 13, 9, '#f4f7fb', { line: 3, stroke: '#7d8ba0', gloss: false });
        c.fillStyle = '#4fa8ff'; c.fillRect(d * 13 - 8, 50, 16, 3);
      }
      // bacaklar
      c.fillStyle = '#4b4f58'; for (const d of [-1, 1]) { rr(c, d * 11 - 8, 22, 16, 32, 7); c.fill(); }
      c.strokeStyle = '#2e3138'; c.lineWidth = 2.5; for (const d of [-1, 1]) { rr(c, d * 11 - 8, 22, 16, 32, 7); c.stroke(); }
      // kollar (denge için açık)
      for (const d of [-1, 1]) {
        c.lineWidth = 14; c.strokeStyle = '#24477f'; c.beginPath(); c.moveTo(d * 18, -2); c.quadraticCurveTo(d * 36, -6, d * 46, -20); c.stroke();
        c.lineWidth = 10; c.strokeStyle = '#ffffff'; c.stroke();
        c.setLineDash([4, 5]); c.strokeStyle = '#2f6fd6'; c.stroke(); c.setLineDash([]);
        ball(c, d * 48, -23, 7.5, 7.5, skin, { line: 2.5, stroke: '#c98b68', gloss: false });
      }
      // gövde (çizgili)
      rr(c, -22, -12, 44, 40, 14); c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-24, -14, 48, 44);
      c.fillStyle = '#2f6fd6'; for (let y = -10; y < 30; y += 9) c.fillRect(-24, y, 48, 4.5); c.restore();
      rr(c, -22, -12, 44, 40, 14); c.lineWidth = 3; c.strokeStyle = '#24477f'; c.stroke();
      // kafa
      for (const d of [-1, 1]) ball(c, d * 30, -40, 6, 8, skin, { line: 2.5, stroke: '#c98b68', gloss: false });
      ball(c, 0, -42, 31, 30, skin, { line: 3, stroke: '#c98b68', gloss: false });
      // saç
      c.beginPath(); c.moveTo(-32, -40); c.bezierCurveTo(-36, -80, 36, -82, 32, -40);
      c.quadraticCurveTo(26, -54, 16, -54); c.quadraticCurveTo(10, -46, 2, -54); c.quadraticCurveTo(-6, -46, -12, -54); c.quadraticCurveTo(-24, -52, -32, -40); c.closePath();
      c.fillStyle = fillGrad(c, hair, 0, -76, 0, -40, -0.1, 0.2); c.fill(); c.lineWidth = 3; c.strokeStyle = '#3e220f'; c.stroke();
      gloss(c, -10, -68, 10, 4, -0.3, 0.35);
      face(c, 0, -36, 22, 'happy');
    });
  }
  function scoopSprite(col, cherry, cup) {
    return spr(140, 150, c => {
      // kâse
      c.beginPath(); c.moveTo(-50, 14); c.lineTo(50, 14); c.lineTo(36, 62); c.quadraticCurveTo(34, 68, 26, 68); c.lineTo(-26, 68); c.quadraticCurveTo(-34, 68, -36, 62); c.closePath();
      c.fillStyle = fillGrad(c, cup, -50, 0, 50, 0, -0.2, 0.3); c.fill();
      c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.55)'; for (let x = -60; x < 60; x += 18) { c.beginPath(); c.moveTo(x, 14); c.lineTo(x + 8, 14); c.lineTo(x + 4, 70); c.lineTo(x - 4, 70); c.fill(); } c.restore();
      c.beginPath(); c.moveTo(-50, 14); c.lineTo(50, 14); c.lineTo(36, 62); c.quadraticCurveTo(34, 68, 26, 68); c.lineTo(-26, 68); c.quadraticCurveTo(-34, 68, -36, 62); c.closePath();
      c.lineWidth = 3.5; c.strokeStyle = shade(cup, -0.45); c.stroke();
      // top + damlalar
      const dk = shade(col, -0.45);
      c.fillStyle = dk; for (const [x, r] of [[-38, 13], [-14, 15], [12, 14], [36, 12]]) { c.beginPath(); c.arc(x, 16, r + 2, 0, TAU); c.fill(); }
      c.beginPath(); c.arc(0, -14, 50, 0, TAU); c.fill();
      const g = c.createRadialGradient(-18, -34, 4, 0, -10, 60); g.addColorStop(0, shade(col, 0.6)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.18));
      c.fillStyle = g; c.beginPath(); c.arc(0, -14, 47.5, 0, TAU); c.fill();
      for (const [x, r] of [[-38, 13], [-14, 15], [12, 14], [36, 12]]) { c.beginPath(); c.arc(x, 16, r, 0, TAU); c.fill(); }
      gloss(c, -20, -40, 15, 8, -0.5, 0.75);
      for (let i = 0; i < 9; i++) { const a = i * 2.3, r = 16 + (i * 13) % 22; c.save(); c.translate(Math.cos(a) * r, -22 + Math.sin(a) * r * 0.7); c.rotate(a); c.fillStyle = CONF[i % CONF.length]; rr(c, -5, -2, 10, 4, 2); c.fill(); c.restore(); }
      face(c, 0, -2, 26, 'smile');
      if (cherry) { c.strokeStyle = '#4a8a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, -68); c.quadraticCurveTo(10, -80, 20, -84); c.stroke(); ball(c, 2, -62, 12, 12, '#ff3a4a', { line: 2.5 }); }
    });
  }
  shell('buzPateni', {
    ad: 'Buz Pateni', color: '#5ab8f0', iconBg: '#d8f1ff', bgCol: '#bfe6ff', dur: 40, stars: [10, 18],
    sprites() {
      const S = { feza: fezaSprite(), scoops: [['#ff9ec4', true, '#8fd8ff'], ['#8fe3c0', false, '#ffb3c9'], ['#a8724f', true, '#ffe08a'], ['#fff1c9', false, '#c9a0ff']].map(([col, ch, cup]) => scoopSprite(col, ch, cup)) };
      S.star = spr(100, 100, c => star(c, 0, 3, 40, '#ffd23f', { stroke: '#c98100', face: 'smile' }));
      S.big = spr(130, 130, c => {
        starPath(c, 0, 4, 54, 27); const g = c.createLinearGradient(-50, -50, 50, 50);
        ['#ff5a7a', '#ffb23f', '#ffe14d', '#5ccf6a', '#4fb3ff', '#b37cff'].forEach((col, i) => g.addColorStop(i / 5, col));
        c.fillStyle = g; c.lineWidth = 9; c.strokeStyle = '#fff'; c.stroke(); c.fill(); c.lineWidth = 3; c.strokeStyle = '#8a4ab0'; c.stroke();
        starPath(c, -3, -4, 26, 12); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fill(); face(c, 0, 8, 22, 'happy');
      });
      S.scoreIcon = S.star;
      return S;
    },
    icon(c, S) {
      const g = c.createRadialGradient(0, 0, 10, 0, 0, 200); g.addColorStop(0, '#f4fcff'); g.addColorStop(1, '#a8daf8'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-150, 70); c.bezierCurveTo(-80, 90, -40, 20, 0, 30); c.stroke();
      blit(c, S.scoops[0], -110, -50, 0.65); blit(c, S.scoops[1], 115, 50, 0.6); blit(c, S.star, 90, -60, 0.8, 0.2); blit(c, S.big, -100, 60, 0.5, -0.2);
      blit(c, S.feza, 10, 10, 1.05, -0.15);
    },
    bg(b, W, H, u, G) {
      let g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#cdeeff'); g.addColorStop(1, '#8fc9f0'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      // buz kristalleri
      b.strokeStyle = 'rgba(255,255,255,0.55)'; b.lineWidth = 3 * u;
      for (let i = 0; i < 22; i++) {
        const x = ((i * 397) % 1000) / 1000 * W, y = ((i * 613) % 1000) / 1000 * H, s = (12 + (i % 4) * 6) * u;
        for (let a = 0; a < 3; a++) { const an = a * PI / 3; b.beginPath(); b.moveTo(x - Math.cos(an) * s, y - Math.sin(an) * s); b.lineTo(x + Math.cos(an) * s, y + Math.sin(an) * s); b.stroke(); }
      }
      const R0 = G.cfg.rink(G, W, H, u);
      // pist
      b.fillStyle = 'rgba(40,90,140,0.25)'; rr(b, R0.x - 14 * u, R0.y - 6 * u, R0.w + 28 * u, R0.h + 34 * u, 70 * u); b.fill();
      rr(b, R0.x, R0.y, R0.w, R0.h, 60 * u);
      g = b.createRadialGradient(R0.x + R0.w * 0.4, R0.y + R0.h * 0.35, 20 * u, R0.x + R0.w / 2, R0.y + R0.h / 2, Math.max(R0.w, R0.h) * 0.7);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#e6f7ff'); g.addColorStop(1, '#bfe6fb'); b.fillStyle = g; b.fill();
      b.save(); b.clip();
      b.strokeStyle = 'rgba(160,210,240,0.55)'; b.lineWidth = 2 * u;
      for (let i = 0; i < 18; i++) { const cx = R0.x + ((i * 271) % 1000) / 1000 * R0.w, cy = R0.y + ((i * 541) % 1000) / 1000 * R0.h, r = (60 + (i % 5) * 40) * u; b.beginPath(); b.arc(cx, cy, r, i, i + 1.2); b.stroke(); }
      b.fillStyle = 'rgba(255,255,255,0.5)'; b.beginPath(); b.moveTo(R0.x + R0.w * 0.15, R0.y); b.lineTo(R0.x + R0.w * 0.3, R0.y); b.lineTo(R0.x + R0.w * 0.12, R0.y + R0.h); b.lineTo(R0.x - R0.w * 0.03, R0.y + R0.h); b.fill();
      b.restore();
      // kar kenarı
      b.fillStyle = '#ffffff';
      const per = 2 * (R0.w + R0.h), n = Math.floor(per / (34 * u));
      for (let i = 0; i < n; i++) {
        const d = i / n * per; let x, y;
        if (d < R0.w) { x = R0.x + d; y = R0.y; } else if (d < R0.w + R0.h) { x = R0.x + R0.w; y = R0.y + d - R0.w; } else if (d < 2 * R0.w + R0.h) { x = R0.x + R0.w - (d - R0.w - R0.h); y = R0.y + R0.h; } else { x = R0.x; y = R0.y + R0.h - (d - 2 * R0.w - R0.h); }
        x = clamp(x, R0.x + 30 * u, R0.x + R0.w - 30 * u); y = clamp(y, R0.y + 30 * u, R0.y + R0.h - 30 * u);
        const ox = x <= R0.x + 31 * u ? -1 : x >= R0.x + R0.w - 31 * u ? 1 : 0, oy = y <= R0.y + 31 * u ? -1 : y >= R0.y + R0.h - 31 * u ? 1 : 0;
        b.fillStyle = 'rgba(120,180,220,0.5)'; b.beginPath(); b.arc(x + ox * 26 * u, y + oy * 26 * u + 5 * u, (19 + (i % 3) * 4) * u, 0, TAU); b.fill();
        b.fillStyle = '#fff'; b.beginPath(); b.arc(x + ox * 26 * u, y + oy * 26 * u, (19 + (i % 3) * 4) * u, 0, TAU); b.fill();
      }
      // köşelerde dondurma külahları
      const cone = (x, y, s, col) => {
        b.save(); b.translate(x, y); b.scale(s, s);
        b.beginPath(); b.moveTo(-30, -10); b.lineTo(30, -10); b.lineTo(0, 70); b.closePath(); b.fillStyle = '#e8b06a'; b.fill(); b.lineWidth = 4; b.strokeStyle = '#a8702e'; b.stroke();
        b.save(); b.clip(); b.strokeStyle = 'rgba(160,100,40,0.6)'; b.lineWidth = 3; for (let k = -60; k < 60; k += 12) { b.beginPath(); b.moveTo(k, -10); b.lineTo(k + 60, 70); b.moveTo(k + 60, -10); b.lineTo(k, 70); b.stroke(); } b.restore();
        ball(b, 0, -26, 34, 30, col, { line: 4 }); face(b, 0, -24, 18, 'smile'); b.restore();
      };
      cone(R0.x - 4 * u, R0.y + R0.h - 60 * u, u * 0.9, '#ff9ec4'); cone(R0.x + R0.w + 4 * u, R0.y + R0.h * 0.45, u * 0.9, '#8fe3c0');
    },
    rink(G, W, H, u) { const t = G.hudBottom + 22 * u, x = 60 * u + G.safe.l, x2 = W - 60 * u - G.safe.r; return { x, y: t, w: x2 - x, h: H - t - 40 * u - G.safe.b }; },
    layout(G) {
      const st = G.st, u = G.u, R0 = G.cfg.rink(G, G.W, G.H, u);
      st.R = R0; st.k = u * 1.0; st.fr = 34 * u;
      st.bump = [[0.27, 0.32], [0.73, 0.3], [0.22, 0.75], [0.76, 0.74]].map(([fx, fy], i) => ({ x: R0.x + R0.w * fx, y: R0.y + R0.h * fy, r: 46 * u, j: 0, i }));
      if (st.x === undefined) { st.x = R0.x + R0.w / 2; st.y = R0.y + R0.h * 0.55; }
      st.x = clamp(st.x, R0.x + 40 * u, R0.x + R0.w - 40 * u); st.y = clamp(st.y, R0.y + 40 * u, R0.y + R0.h - 40 * u);
    },
    onPlay(G) { G.st.starT = 0; },
    update(G, dt, live) {
      const st = G.st, u = G.u, R0 = st.R;
      if (!st.stars) {
        st.stars = []; for (let i = 0; i < 6; i++) st.stars.push({ on: false }); st.vx = 0; st.vy = 0; st.trail = []; for (let i = 0; i < 26; i++) st.trail.push({ x: st.x, y: st.y });
        st.ti = 0; st.trT = 0; st.bigT = 9; st.tw = 0; st.face = 1; st.spT = 0;
      }
      st.tw += dt;
      for (const b of st.bump) b.j = Math.max(0, b.j - dt * 2.5);
      if (!live) { for (const s of st.stars) if (s.on) s.t += dt; if (G.phase === 'count' && !st.stars.some(s => s.on)) for (let i = 0; i < 3; i++) spawnStar(G, false); return; }
      // kuvvet
      let ax = 0, ay = 0;
      if (G.ptr.down) {
        const dx = G.ptr.x - st.x, dy = G.ptr.y - st.y, d = Math.hypot(dx, dy);
        if (d > 8 * u) { const f = 1300 * u * Math.min(1, d / (160 * u)); ax = dx / d * f; ay = dy / d * f; }
      }
      if (G.keys.ArrowLeft) ax -= 1100 * u; if (G.keys.ArrowRight) ax += 1100 * u; if (G.keys.ArrowUp) ay -= 1100 * u; if (G.keys.ArrowDown) ay += 1100 * u;
      st.vx += ax * dt; st.vy += ay * dt;
      const fr = Math.exp(-(G.ptr.down ? 1.3 : 0.55) * dt); st.vx *= fr; st.vy *= fr;
      const sp = Math.hypot(st.vx, st.vy), mx = 560 * u; if (sp > mx) { st.vx *= mx / sp; st.vy *= mx / sp; }
      st.x += st.vx * dt; st.y += st.vy * dt;
      if (Math.abs(st.vx) > 30 * u) st.face = st.vx > 0 ? 1 : -1;
      // duvarlar
      const m = 40 * u;
      const wall = (hit, nx) => { if (hit) { sfx('bounce', { vol: 0.5, pitch: 0.9 }); sparkles(G, st.x, st.y, 4, 0.8); } };
      if (st.x < R0.x + m) { st.x = R0.x + m; wall(st.vx < -60 * u); st.vx = Math.abs(st.vx) * 0.75; }
      if (st.x > R0.x + R0.w - m) { st.x = R0.x + R0.w - m; wall(st.vx > 60 * u); st.vx = -Math.abs(st.vx) * 0.75; }
      if (st.y < R0.y + m) { st.y = R0.y + m; wall(st.vy < -60 * u); st.vy = Math.abs(st.vy) * 0.75; }
      if (st.y > R0.y + R0.h - m * 0.6) { st.y = R0.y + R0.h - m * 0.6; wall(st.vy > 60 * u); st.vy = -Math.abs(st.vy) * 0.75; }
      // dondurma tamponları
      for (const b of st.bump) {
        const dx = st.x - b.x, dy = (st.y + 20 * u) - b.y, d = Math.hypot(dx, dy), rr2 = b.r + st.fr;
        if (d < rr2 && d > 0.01) {
          const nx = dx / d, ny = dy / d, vn = st.vx * nx + st.vy * ny;
          st.x = b.x + nx * rr2; st.y = b.y + ny * rr2 - 20 * u;
          if (vn < 0) { st.vx -= 2 * vn * nx; st.vy -= 2 * vn * ny; }
          st.vx += nx * 260 * u; st.vy += ny * 260 * u;
          if (b.j < 0.5) { sfx('bounce', { vol: 0.9, pitch: rnd(0.9, 1.25) }); hearts(G, b.x, b.y - 40 * u, 2); puff(G, b.x, b.y, '#fff', 70 * u); if (R() < 0.3 && G.time - G.lastCheer > 8) { G.lastCheer = G.time; say(G, 'mini_buzPateni_2', 2); } }
          b.j = 1;
        }
      }
      // iz
      st.trT += dt;
      if (st.trT > 0.03) { st.trT = 0; st.ti = (st.ti + 1) % st.trail.length; const p = st.trail[st.ti]; p.x = st.x; p.y = st.y + 50 * u; }
      if (sp > 200 * u) { st.spT -= dt; if (st.spT <= 0) { st.spT = 0.07; emitP(G, 's', st.x + rnd(-14, 14) * u, st.y + 55 * u, { vx: -st.vx * 0.1, vy: -st.vy * 0.1, drag: 3, max: 0.5, s: rnd(10, 18) * u, rot: rnd(0, TAU) }); } }
      // yıldızlar
      let alive = 0;
      for (const s of st.stars) {
        if (!s.on) continue; s.t += dt; alive++;
        if (s.big && s.t > 7) { s.on = false; puff(G, s.x, s.y, '#fff', 40 * u); continue; }
        const dx = st.x - s.x, dy = st.y - s.y, d = Math.hypot(dx, dy);
        if (d < 110 * u && s.t > 0.3) { s.x += dx * Math.min(1, dt * 4); s.y += dy * Math.min(1, dt * 4); }
        if (d < 56 * u && s.t > 0.3) {
          s.on = false; const n = s.big ? 3 : 1;
          addScore(G, n, s.x, s.y - 40 * u, s.big ? '#b37cff' : '#ffb000');
          sfx(s.big ? 'levelup' : 'coin', { vol: s.big ? 0.6 : 0.9 }); if (s.big) { sfx('star'); confetti(G, s.x, s.y, 30, 0.9); G.shake = 0.6; G.flash = 0.5; }
          sparkles(G, s.x, s.y, s.big ? 14 : 8, 1.2); G_cheer(G);
        }
      }
      st.starT -= dt; st.bigT -= dt;
      if (alive < 3 && st.starT <= 0) { spawnStar(G, false); st.starT = 0.35; }
      if (st.bigT <= 0) { st.bigT = rnd(9, 12); spawnStar(G, true); if (G.time > 6 && G.time - G.lastCheer > 8) { G.lastCheer = G.time; say(G, 'mini_buzPateni_3', 2); } }
    },
    draw(G, c) {
      const st = G.st, S = G.S, u = G.u;
      if (!st.stars) return;
      // iz
      const n = st.trail.length;
      c.lineWidth = 4 * u; c.strokeStyle = 'rgba(255,255,255,0.9)';
      for (let side = -1; side <= 1; side += 2) {
        c.beginPath();
        for (let i = 0; i < n; i++) { const p = st.trail[(st.ti + 1 + i) % n]; c.lineTo(p.x + side * 9 * u, p.y); }
        c.globalAlpha = 0.6; c.stroke(); c.globalAlpha = 1;
      }
      // tamponlar + yıldızlar + Feza (y sırasına göre basitçe: tamponlar önce)
      for (const b of st.bump) {
        const j = b.j, sq = Math.sin(j * PI * 3) * 0.18 * j;
        c.fillStyle = 'rgba(40,100,150,0.2)'; c.beginPath(); c.ellipse(b.x, b.y + 34 * u, 50 * u, 14 * u, 0, 0, TAU); c.fill();
        blit(c, S.scoops[b.i], b.x, b.y, u * 0.85, 0, 1 + sq, 1 - sq);
      }
      for (const s of st.stars) {
        if (!s.on) continue;
        const k = outBack(s.t / 0.4) * (1 + Math.sin(s.t * 5) * 0.07), blink = s.big && s.t > 5.5 ? (Math.sin(s.t * 20) > 0 ? 1 : 0.4) : 1;
        c.fillStyle = 'rgba(40,100,150,0.16)'; c.beginPath(); c.ellipse(s.x, s.y + 34 * u, 28 * u * k + 0.1, 8 * u * k + 0.1, 0, 0, TAU); c.fill();
        c.save(); c.globalAlpha = 0.5 * blink; blit(c, G.com.spark, s.x, s.y, u * (s.big ? 3 : 2) * k, s.t); c.restore();
        blit(c, s.big ? S.big : S.star, s.x, s.y - Math.abs(Math.sin(s.t * 3)) * 6 * u, u * (s.big ? 0.95 : 0.8) * k, Math.sin(s.t * 2) * 0.2, 1, 1, blink);
      }
      const sp = Math.hypot(st.vx, st.vy), lean = clamp(st.vx / (900 * u), -0.3, 0.3);
      c.fillStyle = 'rgba(40,100,150,0.22)'; c.beginPath(); c.ellipse(st.x, st.y + 62 * u, 34 * u, 10 * u, 0, 0, TAU); c.fill();
      const bob = Math.sin(st.tw * 8) * Math.min(1, sp / (300 * u)) * 3 * u;
      blit(c, S.feza, st.x, st.y + bob, st.k * 1.05, lean, st.face, 1);
    },
  });
  function spawnStar(G, big) {
    const st = G.st, u = G.u, R0 = st.R, s = st.stars.find(q => !q.on);
    if (!s) return;
    for (let tries = 0; tries < 30; tries++) {
      const x = rnd(R0.x + 70 * u, R0.x + R0.w - 70 * u), y = rnd(R0.y + 60 * u, R0.y + R0.h - 70 * u);
      if (Math.hypot(x - st.x, y - st.y) < 170 * u) continue;
      if (st.bump.some(b => Math.hypot(x - b.x, y - b.y) < 110 * u)) continue;
      if (st.stars.some(q => q.on && Math.hypot(x - q.x, y - q.y) < 120 * u)) continue;
      s.on = true; s.x = x; s.y = y; s.t = 0; s.big = big; sfx('chirp', { vol: 0.3 }); return;
    }
  }

  // ═════════════════════════════════════════ 4) BALON PATLAT ═════════════════════════════════════════
  const BCOL = { kirmizi: '#ff4d5e', mavi: '#3d8bff', sari: '#ffd23f', yesil: '#4cc95a', mor: '#9b5cf0', turuncu: '#ff8a2a', pembe: '#ff79c6' };
  function balloonSprite(col) {
    return spr(130, 220, c => {
      c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, 36); for (let y = 36; y < 104; y += 4) c.lineTo(Math.sin(y * 0.16) * 6, y); c.stroke();
      c.strokeStyle = 'rgba(80,80,120,0.35)'; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.moveTo(0, -100); c.bezierCurveTo(56, -100, 62, -30, 30, 10); c.quadraticCurveTo(12, 30, 0, 30); c.quadraticCurveTo(-12, 30, -30, 10);
      c.bezierCurveTo(-62, -30, -56, -100, 0, -100); c.closePath();
      const g = c.createRadialGradient(-18, -66, 4, 0, -40, 78); g.addColorStop(0, shade(col, 0.6)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, -0.32));
      c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = shade(col, -0.45); c.stroke();
      c.beginPath(); c.moveTo(-8, 38); c.lineTo(8, 38); c.lineTo(0, 28); c.closePath(); c.fillStyle = shade(col, -0.15); c.fill(); c.lineWidth = 3; c.stroke();
      gloss(c, -24, -68, 12, 20, 0.45, 0.75); gloss(c, -10, -88, 5, 4, 0, 0.8);
      face(c, 0, -32, 30, 'smile');
    });
  }
  shell('balonPatlat', {
    ad: 'Balon Patlat', color: '#ff79c6', iconBg: '#bfe6ff', bgCol: '#a8dcff', dur: 40, stars: [8, 16],
    sprites() {
      const S = { b: {} }; for (const k in BCOL) S.b[k] = balloonSprite(BCOL[k]);
      S.scoreIcon = spr(90, 100, c => c.drawImage(S.b.kirmizi.cv, -38, -40, 76, 129));
      S.cloud = spr(240, 110, c => {
        c.fillStyle = 'rgba(120,170,220,0.35)';
        const puffs = [[-70, 20, 40], [-20, 0, 52], [40, 8, 46], [85, 26, 32], [0, 30, 40]];
        for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x, y + 8, r, 0, TAU); c.fill(); }
        c.fillStyle = '#fff'; for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      });
      return S;
    },
    icon(c, S) {
      const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#e0f4ff'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      blit(c, S.cloud, -90, 70, 0.7); blit(c, S.cloud, 110, -70, 0.5);
      blit(c, S.b.mavi, -95, 10, 0.75, -0.15); blit(c, S.b.sari, 95, 20, 0.75, 0.15); blit(c, S.b.yesil, 40, 50, 0.6, 0.1); blit(c, S.b.kirmizi, -5, -5, 0.95);
      for (let i = 0; i < 14; i++) { c.fillStyle = CONF[i % 8]; c.save(); c.translate(-140 + i * 21, -80 + (i * 37) % 50); c.rotate(i); c.fillRect(-5, -3, 10, 6); c.restore(); }
    },
    bg(b, W, H, u) {
      let g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7cc8ff'); g.addColorStop(0.7, '#cdeeff'); g.addColorStop(1, '#eaf8ff'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      // güneş
      const sx = W * 0.8, sy = H * 0.24;
      g = b.createRadialGradient(sx, sy, 10 * u, sx, sy, 200 * u); g.addColorStop(0, 'rgba(255,250,200,0.9)'); g.addColorStop(1, 'rgba(255,250,200,0)'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      b.fillStyle = 'rgba(255,214,74,0.55)';
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; b.save(); b.translate(sx, sy); b.rotate(a); rr(b, 66 * u, -9 * u, 34 * u, 18 * u, 9 * u); b.fill(); b.restore(); }
      ball(b, sx, sy, 56 * u, 56 * u, '#ffd84a', { line: 4 * u, stroke: '#f0a820' }); face(b, sx, sy, 34 * u, 'happy');
      // bulutlar
      const cloud = (x, y, s) => {
        b.fillStyle = 'rgba(120,170,220,0.3)'; for (const [dx, dy, r] of [[-60, 10, 40], [-15, -8, 52], [45, 4, 44], [0, 22, 42]]) { b.beginPath(); b.arc(x + dx * s, y + (dy + 8) * s, r * s, 0, TAU); b.fill(); }
        b.fillStyle = '#fff'; for (const [dx, dy, r] of [[-60, 10, 40], [-15, -8, 52], [45, 4, 44], [0, 22, 42]]) { b.beginPath(); b.arc(x + dx * s, y + dy * s, r * s, 0, TAU); b.fill(); }
      };
      cloud(W * 0.22, H * 0.3, u); cloud(W * 0.55, H * 0.55, u * 0.8); cloud(W * 0.88, H * 0.62, u * 0.7); cloud(W * 0.12, H * 0.72, u * 0.6);
      // pencere çerçevesi + perdeler
      const fw = 26 * u;
      b.fillStyle = '#fff6ea'; b.fillRect(0, 0, W, fw * 0.6); b.fillRect(0, H - fw, W, fw);
      const curtain = (x0, dir) => {
        const w = W * 0.085;
        b.save(); b.beginPath(); b.moveTo(x0, 0); b.lineTo(x0 + dir * w, 0);
        b.bezierCurveTo(x0 + dir * w * 0.75, H * 0.4, x0 + dir * w * 0.35, H * 0.6, x0 + dir * w * 0.6, H); b.lineTo(x0, H); b.closePath();
        const gg = b.createLinearGradient(x0, 0, x0 + dir * w, 0); gg.addColorStop(0, '#e8486a'); gg.addColorStop(0.5, '#ff7a90'); gg.addColorStop(1, '#d83a5e');
        b.fillStyle = gg; b.fill(); b.clip();
        b.strokeStyle = 'rgba(150,20,50,0.3)'; b.lineWidth = 6 * u;
        for (let i = 1; i < 4; i++) { b.beginPath(); b.moveTo(x0 + dir * w * i / 4, 0); b.lineTo(x0 + dir * w * i / 4 * 0.6, H); b.stroke(); }
        b.fillStyle = 'rgba(255,255,255,0.5)'; for (let y = 30 * u; y < H; y += 60 * u) for (let x = 10 * u; x < w; x += 36 * u) { b.beginPath(); b.arc(x0 + dir * x, y + (x / u % 2) * 20 * u, 5 * u, 0, TAU); b.fill(); }
        b.restore();
      };
      curtain(0, 1); curtain(W, -1);
      b.fillStyle = '#c98a55'; rr(b, -10, -4 * u, W + 20, 18 * u, 8 * u); b.fill();
    },
    layout(G) { const st = G.st; st.k = Math.min(G.u, G.H / 820) * 0.95; },
    onPlay(G) { newTarget(G, true); },
    update(G, dt, live) {
      const st = G.st, u = G.u, W = G.W, H = G.H;
      if (!st.bl) {
        st.bl = []; for (let i = 0; i < 24; i++) st.bl.push({ on: false });
        const keys = Object.keys(BCOL).sort(() => R() - 0.5); st.cols = keys.slice(0, 5); st.target = st.cols[0]; st.tT = 0; st.spT = 0; st.repT = -9; st.sw = 0;
        for (let i = 0; i < 7; i++) spawnBalloon(G, rnd(H * 0.25, H * 0.95));
      }
      st.sw = Math.max(0, st.sw - dt * 2);
      for (const b of st.bl) {
        if (!b.on) continue; b.t += dt;
        if (b.pop) { b.pt += dt; if (b.pt > 0.25) b.on = false; continue; }
        b.y -= b.vy * dt * (live ? 1 : 0.5); b.x += Math.sin(b.t * b.f + b.ph) * 22 * u * dt;
        if (b.y < -180 * u) b.on = false;
      }
      if (!live) return;
      st.tT += dt; if (st.tT > 8.5) newTarget(G, false);
      st.spT -= dt;
      if (st.spT <= 0) { st.spT = rnd(0.5, 0.75); spawnBalloon(G, H + 140 * u); }
    },
    down(G, x, y) {
      const st = G.st, u = G.u; if (!st.bl) return;
      let best = null, bd = 1e9;
      for (const b of st.bl) {
        if (!b.on || b.pop) continue;
        const k = st.k * b.s, dx = x - b.x, dy = y - (b.y - 34 * k), d = Math.hypot(dx / 1.0, dy / 1.2);
        if (d < 82 * k && d < bd) { bd = d; best = b; }
      }
      if (!best) return;
      const b = best, k = st.k * b.s, cy = b.y - 34 * k, col = BCOL[b.c];
      b.pop = true; b.pt = 0;
      if (b.c === st.target) {
        sfx('pop', { vol: 1 }); addScore(G, 1, b.x, cy - 40 * u, col);
        confetti(G, b.x, cy, 18, 0.7); puff(G, b.x, cy, col, 90 * k); puff(G, b.x, cy, '#fff', 60 * k);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; emitP(G, 'c', b.x, cy, { vx: Math.cos(a) * 380 * u, vy: Math.sin(a) * 380 * u, g: 700 * u, drag: 3, max: 0.8, s: 16 * u, rot: a, vr: rnd(-10, 10), col }); }
        G.shake = Math.max(G.shake, 0.35); G_cheer(G);
      } else {
        sfx('bubblePop', { vol: 0.7 }); puff(G, b.x, cy, col, 60 * k);
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; emitP(G, 'c', b.x, cy, { vx: Math.cos(a) * 200 * u, vy: Math.sin(a) * 200 * u, g: 500 * u, drag: 3, max: 0.6, s: 10 * u, rot: a, vr: 5, col }); }
        st.sw = 1;
        if (G.time - st.repT > 4) { st.repT = G.time; say(G, 'mini_balon_yine_' + st.target, 3); }
      }
    },
    draw(G, c) {
      const st = G.st, S = G.S, u = G.u;
      if (!st.bl) return;
      for (const b of st.bl) {
        if (!b.on) continue;
        const k = st.k * b.s, rot = Math.sin(b.t * b.f + b.ph) * 0.1;
        if (b.pop) { const q = b.pt / 0.25; blit(c, S.b[b.c], b.x, b.y, k * (1 + q * 0.5), rot, 1, 1, 1 - q); continue; }
        blit(c, S.b[b.c], b.x, b.y, k, rot);
      }
      // hedef renk rozeti
      if (G.phase === 'play' || G.phase === 'count') {
        const x = G.W / 2, y = G.hudY + 26 * u, r = 66 * u, p = 1 + Math.sin(G.time * 4) * 0.04 + st.sw * 0.12 * Math.sin(G.pt * 30);
        const col = BCOL[st.target];
        c.save(); c.translate(x, y); c.scale(p, p);
        c.fillStyle = 'rgba(30,60,120,0.25)'; c.beginPath(); c.arc(0, 8 * u, r, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        c.lineWidth = 9 * u; c.strokeStyle = col; c.stroke();
        blit(c, S.b[st.target], 0, 22 * u, u * 0.62);
        c.restore();
        drawHalaMini(G, c, x - r - 52 * u, y + 4 * u, u * 0.5);
        // ok işareti: hedef renk değişince
        if (st.tT < 1.2) { const q = st.tT / 1.2; c.save(); c.globalAlpha = 1 - q; c.lineWidth = 8 * u; c.strokeStyle = col; c.beginPath(); c.arc(x, y, r * (1 + q * 0.8), 0, TAU); c.stroke(); c.restore(); }
      }
    },
  });
  function drawHalaMini(G, c, x, y, k) {
    const talking = (G.cap || G.talkT > 0) && Math.sin(G.pt * 18) > -0.2;
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 64 * k * 1.25, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.arc(x, y, 60 * k * 1.25, 0, TAU); c.clip();
    c.fillStyle = '#ffe2c8'; c.fillRect(x - 80 * k * 1.25, y - 80 * k * 1.25, 160 * k * 1.25, 160 * k * 1.25);
    blit(c, talking ? G.com.halaTalk : G.com.hala, x, y + 30 * k, k * 0.95);
    c.restore();
    c.lineWidth = 6 * k; c.strokeStyle = '#ff6b57'; c.beginPath(); c.arc(x, y, 62 * k * 1.25, 0, TAU); c.stroke();
  }
  function spawnBalloon(G, y) {
    const st = G.st, u = G.u, b = st.bl.find(q => !q.on);
    if (!b) return;
    let x = 0;
    for (let tries = 0; tries < 12; tries++) {
      x = rnd(110 * u + G.W * 0.06, G.W - 110 * u - G.W * 0.06);
      if (!st.bl.some(q => q.on && q !== b && Math.abs(q.x - x) < 110 * u && Math.abs(q.y - y) < 230 * u)) break;
    }
    const tShare = st.bl.filter(q => q.on && !q.pop && q.c === st.target).length < 3 ? 0.65 : 0.38;
    b.on = true; b.pop = false; b.t = 0; b.x = x; b.y = y; b.s = rnd(0.85, 1.1);
    b.c = R() < tShare ? st.target : pick(st.cols.filter(k => k !== st.target));
    b.vy = rnd(85, 130) * u; b.f = rnd(1, 1.8); b.ph = rnd(0, TAU);
  }
  function newTarget(G, first) {
    const st = G.st;
    if (!first) st.target = pick(st.cols.filter(k => k !== st.target));
    st.tT = 0; say(G, 'mini_balon_' + st.target, 3); sfx('chirp', { vol: 0.6 });
    G.lastCheer = Math.max(G.lastCheer, G.time - 4);
  }

  // ═════════════════════════════════════════ 5) KEK SÜSLE ═════════════════════════════════════════
  const TOPS = ['krema', 'serpme', 'kiraz', 'cilek', 'mum'];
  const CUPC = [['#ff9ec4', '#ffd0e4'], ['#8fd8ff', '#fff5d6'], ['#b8e986', '#ffc6dd'], ['#ffd27a', '#c9a0ff']];
  function topSprite(id) {
    return spr(110, 120, c => {
      if (id === 'krema') {
        const tiers = [[0, 30, 44, 18], [0, 8, 34, 16], [0, -12, 24, 14]];
        for (const [x, y, rx, ry] of tiers) ball(c, x, y, rx, ry, '#fffaf2', { line: 3, stroke: '#d8c8b8' });
        c.beginPath(); c.moveTo(-10, -20); c.quadraticCurveTo(0, -48, 6, -40); c.quadraticCurveTo(10, -30, 10, -20); c.closePath(); c.fillStyle = '#fffaf2'; c.fill(); c.strokeStyle = '#d8c8b8'; c.lineWidth = 3; c.stroke();
        gloss(c, -14, 2, 10, 4, -0.2, 0.9);
      } else if (id === 'serpme') {
        ball(c, 0, 18, 46, 26, '#fff', { line: 3, stroke: '#d8c8b8', gloss: false });
        for (let i = 0; i < 18; i++) { const a = i * 2.4, r = (i * 7) % 34; c.save(); c.translate(Math.cos(a) * r, 12 + Math.sin(a) * r * 0.5 - (34 - r) * 0.4); c.rotate(a * 1.7); c.fillStyle = CONF[i % 8]; rr(c, -7, -2.5, 14, 5, 2.5); c.fill(); c.restore(); }
      } else if (id === 'kiraz') {
        c.strokeStyle = '#4a8a2a'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(6, -36, 22, -46); c.stroke();
        c.fillStyle = '#5cbf3a'; c.beginPath(); c.ellipse(28, -40, 13, 6, -0.6, 0, TAU); c.fill(); c.strokeStyle = '#2e7a1a'; c.lineWidth = 2; c.stroke();
        ball(c, 0, 16, 28, 26, '#ff2a40', { line: 3.5 });
      } else if (id === 'cilek') {
        c.beginPath(); c.moveTo(0, 46); c.bezierCurveTo(-40, 20, -40, -18, -18, -20); c.quadraticCurveTo(0, -24, 18, -20); c.bezierCurveTo(40, -18, 40, 20, 0, 46); c.closePath();
        const g = c.createRadialGradient(-10, -6, 3, 0, 8, 46); g.addColorStop(0, '#ff8a8a'); g.addColorStop(0.5, '#ff3b4e'); g.addColorStop(1, '#c41a32');
        c.fillStyle = g; c.fill(); c.lineWidth = 3.5; c.strokeStyle = '#8a1022'; c.stroke();
        c.fillStyle = '#ffe680'; for (let i = 0; i < 12; i++) { const x = ((i * 37) % 50) - 25, y = ((i * 23) % 50) - 10; if (Math.abs(x) < 24 - y * 0.35) { c.beginPath(); c.ellipse(x, y, 2, 3, 0, 0, TAU); c.fill(); } }
        gloss(c, -14, -4, 7, 4, -0.5, 0.7);
        c.fillStyle = '#4cc95a'; c.strokeStyle = '#2e7a1a'; c.lineWidth = 2.5;
        for (let i = 0; i < 5; i++) { const a = PI + i * PI / 4; c.beginPath(); c.ellipse(Math.cos(a) * 12, -22 + Math.sin(a) * 6, 10, 5, a, 0, TAU); c.fill(); c.stroke(); }
      } else {
        rr(c, -10, -20, 20, 66, 7); c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-12, -22, 24, 70);
        c.strokeStyle = '#4fb3ff'; c.lineWidth = 6; for (let y = -30; y < 60; y += 14) { c.beginPath(); c.moveTo(-14, y); c.lineTo(14, y + 12); c.stroke(); } c.restore();
        rr(c, -10, -20, 20, 66, 7); c.lineWidth = 3; c.strokeStyle = '#3a78c8'; c.stroke();
        c.strokeStyle = '#333'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -20); c.lineTo(0, -28); c.stroke();
        const g = c.createRadialGradient(0, -40, 2, 0, -38, 18); g.addColorStop(0, '#fff8c0'); g.addColorStop(0.5, '#ffc928'); g.addColorStop(1, '#ff7a1a');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, -58); c.quadraticCurveTo(14, -36, 0, -27); c.quadraticCurveTo(-14, -36, 0, -58); c.fill();
      }
    });
  }
  function cupSprite(cw, fr, happy) {
    return spr(230, 240, c => {
      // kağıt kap
      const paper = () => { c.beginPath(); c.moveTo(-78, 10); c.lineTo(78, 10); c.lineTo(58, 100); c.quadraticCurveTo(56, 106, 48, 106); c.lineTo(-48, 106); c.quadraticCurveTo(-56, 106, -58, 100); c.closePath(); };
      paper(); c.fillStyle = fillGrad(c, cw, -78, 0, 78, 0, -0.15, 0.25); c.fill();
      c.save(); c.clip(); c.strokeStyle = rgba('#ffffff', 0.5); c.lineWidth = 6; for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(i * 13, 10); c.lineTo(i * 10, 106); c.stroke(); } c.restore();
      paper(); c.lineWidth = 4; c.strokeStyle = shade(cw, -0.45); c.stroke();
      // kek
      ball(c, 0, 6, 82, 18, '#c98a4a', { line: 3, stroke: '#7a4a1e', gloss: false });
      // krema tabanı (bulut)
      const bumps = [[-56, -6, 32], [-24, -18, 38], [18, -20, 38], [54, -8, 32], [0, -40, 36], [-34, -36, 26], [34, -38, 26]];
      c.fillStyle = shade(fr, -0.35); for (const [x, y, r] of bumps) { c.beginPath(); c.arc(x, y + 4, r + 3, 0, TAU); c.fill(); }
      for (const [x, y, r] of bumps) { const g = c.createRadialGradient(x - r * 0.3, y - r * 0.4, 2, x, y, r); g.addColorStop(0, shade(fr, 0.6)); g.addColorStop(1, fr); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      gloss(c, -30, -40, 14, 6, -0.4, 0.6);
      face(c, 0, 56, 30, happy ? 'happy' : 'smile');
    });
  }
  shell('kekSusle', {
    ad: 'Kek Süsle', color: '#ff8fb8', iconBg: '#ffe9f2', bgCol: '#ffe9d6', dur: 45, stars: [3, 5],
    sprites() {
      const S = { top: {}, cup: CUPC.map(([a, b]) => cupSprite(a, b)) };
      for (const id of TOPS) S.top[id] = topSprite(id);
      S.cupHappy = CUPC.map(([a, b]) => cupSprite(a, b, true));
      S.sprOver = spr(180, 90, c => { for (let i = 0; i < 26; i++) { const x = ((i * 53) % 150) - 75, y = ((i * 31) % 50) - 25; if (x * x / 5600 + y * y / 900 > 1) continue; c.save(); c.translate(x, y); c.rotate(i * 1.3); c.fillStyle = CONF[i % 8]; rr(c, -6, -2.2, 12, 4.4, 2.2); c.fill(); c.restore(); } });
      S.scoreIcon = spr(120, 130, c => { c.drawImage(S.cup[0].cv, -55, -57, 110, 115); c.drawImage(S.top.kiraz.cv, -22, -78, 44, 48); });
      return S;
    },
    icon(c, S) {
      const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#fff2dc'); g.addColorStop(1, '#ffd6c0'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      c.fillStyle = '#ff7a8a'; for (let x = -160; x < 160; x += 40) for (let y = 50; y < 110; y += 40) if (((x + y) / 40 & 1) === 0) c.fillRect(x, y, 40, 40);
      blit(c, S.cup[0], 0, 20, 0.75); blit(c, S.top.krema, 0, -40, 0.75); blit(c, S.top.kiraz, 0, -80, 0.55);
      blit(c, S.top.cilek, -110, -50, 0.65, -0.3); blit(c, S.top.mum, 115, -45, 0.7, 0.25); blit(c, S.top.serpme, -110, 60, 0.6);
    },
    bg(b, W, H, u) {
      const ty = H * 0.6;
      let g = b.createLinearGradient(0, 0, 0, ty); g.addColorStop(0, '#fff3d6'); g.addColorStop(1, '#ffe0b0'); b.fillStyle = g; b.fillRect(0, 0, W, ty);
      b.fillStyle = 'rgba(255,160,120,0.25)';
      for (let y = 30 * u, r = 0; y < ty; y += 60 * u, r++) for (let x = (r % 2) * 40 * u; x < W; x += 80 * u) {
        for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; b.beginPath(); b.arc(x + Math.cos(a) * 7 * u, y + Math.sin(a) * 7 * u, 5 * u, 0, TAU); b.fill(); }
      }
      // raf + kavanozlar + sevimli tencere
      const sy = H * 0.33;
      b.fillStyle = '#c98a55'; rr(b, W * 0.04, sy, W * 0.24, 16 * u, 6 * u); b.fill(); rr(b, W * 0.72, sy, W * 0.24, 16 * u, 6 * u); b.fill();
      [[0.06, '#ff9ec4'], [0.15, '#ffd23f'], [0.75, '#8fd8ff'], [0.86, '#b8e986']].forEach(([f, col], i) => {
        const x = W * f, w = 60 * u, h = (66 + (i % 2) * 18) * u;
        rr(b, x, sy - h, w, h, 14 * u); b.fillStyle = 'rgba(255,255,255,0.7)'; b.fill(); b.lineWidth = 3 * u; b.strokeStyle = '#d9b48a'; b.stroke();
        b.fillStyle = col; rr(b, x + 6 * u, sy - h * 0.7, w - 12 * u, h * 0.62, 10 * u); b.fill();
        b.fillStyle = shade(col, -0.2); rr(b, x - 3 * u, sy - h - 10 * u, w + 6 * u, 14 * u, 6 * u); b.fill();
        gloss(b, x + 14 * u, sy - h * 0.55, 5 * u, 14 * u, 0, 0.6);
      });
      // masa örtüsü (pötikare)
      g = b.createLinearGradient(0, ty, 0, H); g.addColorStop(0, '#fff'); g.addColorStop(1, '#f6e8e8'); b.fillStyle = g; b.fillRect(0, ty, W, H - ty);
      const cs = 46 * u;
      for (let y = ty, r = 0; y < H; y += cs, r++) for (let x = 0, q = 0; x < W; x += cs, q++) {
        if (r % 2 === 0 || q % 2 === 0) { b.fillStyle = (r % 2 === 0 && q % 2 === 0) ? 'rgba(255,90,110,0.75)' : 'rgba(255,90,110,0.35)'; b.fillRect(x, y, cs, cs); }
      }
      b.fillStyle = 'rgba(160,60,60,0.18)'; b.fillRect(0, ty, W, 10 * u);
      // altlık tabak (sağda biten kekler için) — çizimde
    },
    layout(G) {
      const W = G.W, H = G.H, u = G.u, st = G.st;
      st.k = Math.min(u * 1.25, H / 820 * 1.25);
      st.cx = W * 0.5; st.cy = H * 0.56;
      const y0 = G.hudBottom + 80 * u, y1 = H - G.safe.b - 70 * u, gap = (y1 - y0) / 4, r = Math.max(48, Math.min(62 * u, gap * 0.44));
      const tx = W - G.safe.r - Math.max(r + 30 * u, W * 0.1);
      st.tray = TOPS.map((id, i) => ({ id, x: tx + (i % 2 ? -14 : 14) * u, y: y0 + i * gap, r, wob: 0, glow: 0 }));
      st.stand = { x: G.safe.l + Math.max(150 * u, W * 0.15), y: H * 0.64 };
      st.order = { x: W * 0.47, y: G.hudY + 18 * u };
    },
    update(G, dt, live) {
      const st = G.st, u = G.u;
      if (!st.cup) { st.done = []; st.n = 0; newCup(G, true); st.idle = 0; }
      const cp = st.cup;
      cp.t += dt; cp.jt = Math.max(0, cp.jt - dt * 3);
      for (const b of st.tray) { b.wob = Math.max(0, b.wob - dt * 2.5); b.glow = Math.max(0, b.glow - dt); }
      // uçan süsler
      for (const f of st.fly) {
        if (!f.on) continue; f.t += dt / 0.42;
        if (f.t >= 1) {
          f.on = false; cp.has[f.id] = true; cp.land[f.id] = 1; cp.jt = 1;
          sfx(f.id === 'serpme' ? 'fizz' : f.id === 'krema' ? 'squish' : 'pop', { vol: 0.8 }); sparkles(G, f.tx, f.ty, 7, 1);
          if (cp.need.every(id => cp.has[id]) && !cp.complete) {
            cp.complete = true; cp.ct = 0; addScore(G, 1, st.cx, st.cy - 200 * st.k, '#ff5a8a');
            sfx('levelup', { vol: 0.7 }); hearts(G, st.cx, st.cy - 120 * st.k, 5); confetti(G, st.cx, st.cy - 80 * st.k, 26, 0.9); G.shake = 0.5;
            if (st.n === 1) { G.lastCheer = G.time; say(G, 'mini_kekSusle_1', 2); } else G_cheer(G, st.n % 2 === 0);
          }
        }
      }
      for (const id in cp.land) cp.land[id] = Math.max(0, cp.land[id] - dt * 3);
      if (cp.complete) {
        cp.ct += dt;
        if (cp.ct > 0.9 && !cp.leaving) { cp.leaving = true; cp.lt = 0; sfx('whoosh', { vol: 0.6 }); }
      }
      if (cp.leaving) {
        cp.lt += dt / 0.55;
        if (cp.lt >= 1) { st.done.push({ v: cp.v, has: Object.assign({}, cp.has), t: 0 }); newCup(G, false); }
      }
      st.idle += dt;
      if (live && st.idle > 3.5 && !cp.complete && cp.in >= 1) {
        const want = cp.need.find(id => !cp.has[id] && !st.fly.some(f => f.on && f.id === id));
        const b = want && st.tray.find(q => q.id === want); if (b) b.glow = 1;
        if (st.idle > 5) st.idle = 3.5;
      }
      cp.in = Math.min(1, cp.in + dt / 0.5);
      for (const d of st.done) d.t += dt;
    },
    down(G, x, y) {
      const st = G.st, cp = st.cup; if (!cp || cp.complete || cp.in < 0.6) return;
      let hit = null; for (const b of st.tray) if (inC(b, x, y, 14)) hit = b;
      if (!hit) { const dx = x - st.cx, dy = y - st.cy; if (dx * dx + dy * dy < Math.pow(110 * st.k, 2)) { cp.jt = 0.6; sfx('squish', { vol: 0.5 }); } return; }
      st.idle = 0;
      const id = hit.id;
      if (cp.need.includes(id) && !cp.has[id] && !st.fly.some(f => f.on && f.id === id)) {
        const f = st.fly.find(q => !q.on); const tp = topPos(G, id, cp);
        f.on = true; f.id = id; f.t = 0; f.sx = hit.x; f.sy = hit.y; f.tx = tp.x; f.ty = tp.y; f.k = tp.k;
        hit.wob = 0.6; sfx('whoosh', { vol: 0.5, pitch: 1.3 }); sfx('click', { vol: 0.6 });
      } else {
        hit.wob = 1; sfx('bounce', { vol: 0.45, pitch: 1.3 });
        cp.hint = 1;
      }
    },
    draw(G, c) {
      const st = G.st, S = G.S, u = G.u, k = st.k;
      if (!st.cup) return;
      const cp = st.cup;
      // biten kekler: kek standı
      const sd = st.stand, sk = k * 0.42;
      c.fillStyle = 'rgba(120,60,40,0.22)'; c.beginPath(); c.ellipse(sd.x, sd.y + 168 * u, 120 * u, 18 * u, 0, 0, TAU); c.fill();
      c.fillStyle = '#e6d6f0'; rr(c, sd.x - 12 * u, sd.y + 60 * u, 24 * u, 105 * u, 10 * u); c.fill(); c.lineWidth = 3 * u; c.strokeStyle = '#9a84b0'; c.stroke();
      ball(c, sd.x, sd.y + 165 * u, 70 * u, 14 * u, '#e6d6f0', { line: 3 * u, stroke: '#9a84b0', gloss: false });
      ball(c, sd.x, sd.y + 60 * u, 135 * u, 20 * u, '#f4ecfa', { line: 4 * u, stroke: '#9a84b0' });
      c.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = -6; i <= 6; i++) { c.beginPath(); c.arc(sd.x + i * 20 * u, sd.y + 74 * u + Math.cos(i / 6 * 1.4) * 4 * u, 5 * u, 0, PI); c.fill(); }
      for (let i = Math.min(6, st.done.length) - 1; i >= 0; i--) {
        const d = st.done[i], p = standSlot(G, i), kk = sk * outBack(Math.min(1, d.t / 0.4));
        drawCup(G, c, p.x, p.y, kk, d.v, d.has, 0, false);
      }
      if (st.done.length > 6) { const q = 1 + G.bump * 0.3; c.save(); c.translate(sd.x + 110 * u, sd.y - 150 * u); c.scale(q, q); pill(c, -48 * u, -30 * u, 96 * u, 60 * u, '#ff8fb8'); txt(c, '+' + (st.done.length - 6), 0, 2 * u, 36 * u, '#fff', '#c43a7a'); c.restore(); }
      // ana kek
      let x = st.cx, y = st.cy, sc = k, rot = 0;
      if (cp.in < 1) { const q = outBack(cp.in); y = lerp(-260 * u, st.cy, q); sc = k * (1 + (1 - Math.min(1, cp.in * 1.4)) * 0.15); }
      if (cp.leaving) {
        const q = clamp(cp.lt, 0, 1), p = standSlot(G, Math.min(5, st.done.length)), tx = p.x, ty = p.y;
        x = lerp(st.cx, tx, q); y = lerp(st.cy, ty, q) - Math.sin(q * PI) * 160 * u; sc = lerp(k, sk, q); rot = Math.sin(q * PI) * 0.4;
      }
      const hop = cp.complete && !cp.leaving ? Math.abs(Math.sin(cp.ct * 9)) * 22 * u : 0;
      if (!cp.leaving) { c.fillStyle = 'rgba(120,60,40,0.25)'; c.beginPath(); c.ellipse(x, y + 110 * sc, 95 * sc, 18 * sc, 0, 0, TAU); c.fill(); }
      const js = Math.sin(cp.jt * PI * 2) * 0.08 * cp.jt;
      drawCup(G, c, x, y - hop, sc, cp.v, cp.has, js, cp.complete, cp.land, rot);
      // uçan süsler
      for (const f of st.fly) {
        if (!f.on) continue;
        const q = outCubic(f.t), fx = lerp(f.sx, f.tx, q), fy = lerp(f.sy, f.ty, q) - Math.sin(q * PI) * 180 * u;
        blit(c, f.id === 'serpme' ? S.top.serpme : S.top[f.id], fx, fy, lerp(u * 0.85, f.k, q), q * TAU);
      }
      // tepsi
      for (const b of st.tray) {
        const w = Math.sin(b.wob * 22) * 0.18 * b.wob, gl = b.glow > 0 ? 1 + Math.sin(G.pt * 10) * 0.08 : 1;
        c.fillStyle = 'rgba(120,40,40,0.25)'; c.beginPath(); c.ellipse(b.x, b.y + b.r * 0.85, b.r * 0.95, b.r * 0.28, 0, 0, TAU); c.fill();
        if (b.glow > 0) { c.save(); c.globalAlpha = 0.8; blit(c, G.com.spark, b.x, b.y, b.r / 18 * gl, G.pt); c.restore(); }
        c.save(); c.translate(b.x, b.y); c.rotate(w); c.scale(gl, gl);
        ball(c, 0, 0, b.r, b.r, '#ffffff', { line: b.r * 0.08, stroke: '#ffb3c9', gloss: false });
        c.lineWidth = b.r * 0.05; c.strokeStyle = '#ffe0ea'; c.beginPath(); c.arc(0, 0, b.r * 0.78, 0, TAU); c.stroke();
        blit(c, S.top[b.id], 0, 0, b.r / 62 * 0.92);
        c.restore();
      }
      // sipariş balonu
      const o = st.order, n = cp.need.length, iw = 92 * u, bw = 120 * u + n * iw, bh = 104 * u, bx = o.x - bw / 2 + 30 * u, by = o.y - bh / 2;
      const pk = outBack(Math.min(1, cp.t / 0.4)), hint = cp.hint ? 1 + Math.sin(G.pt * 18) * 0.06 * cp.hint : 1;
      if (cp.hint) cp.hint = Math.max(0, cp.hint - 0.016);
      c.save(); c.translate(o.x, o.y); c.scale(pk * hint, pk * hint); c.translate(-o.x, -o.y);
      c.fillStyle = 'rgba(120,40,40,0.22)'; rr(c, bx, by + 8 * u, bw, bh, 40 * u); c.fill();
      c.fillStyle = '#fff'; rr(c, bx, by, bw, bh, 40 * u); c.fill(); c.lineWidth = 6 * u; c.strokeStyle = '#ff8fb8'; c.stroke();
      drawHalaMini(G, c, bx + 6 * u, o.y + 4 * u, u * 0.56);
      cp.need.forEach((id, i) => {
        const ix = bx + 96 * u + i * iw + iw / 2 - 30 * u, iy = o.y;
        c.fillStyle = cp.has[id] ? '#eaffea' : '#fff4f8'; c.beginPath(); c.arc(ix, iy, 38 * u, 0, TAU); c.fill();
        blit(c, S.top[id], ix, iy, u * 0.58, 0, 1, 1, cp.has[id] ? 0.55 : 1);
        if (cp.has[id]) blit(c, G.com.check, ix + 24 * u, iy + 24 * u, u * 0.5);
      });
      c.restore();
    },
  });
  function standSlot(G, i) {   // kek standında yer: altta 3, ortada 2, tepede 1
    const sd = G.st.stand, u = G.u, P = [[-1, 0], [0, 0], [1, 0], [-0.5, 1], [0.5, 1], [0, 2]][i];
    return { x: sd.x + P[0] * 82 * u, y: sd.y + 22 * u - P[1] * 74 * u };
  }
  function topPos(G, id, cp) {   // süsün kek üzerindeki yeri (ekran)
    const st = G.st, k = st.k, x = st.cx, y = st.cy, hi = cp.need.includes('krema') ? -26 : 0;
    const P = { krema: [0, -78, 1], serpme: [0, -46, 1], kiraz: [0, -98 + hi * 1.6, 0.85], cilek: [-46, -70 + hi * 0.5, 0.8], mum: [44, -96 + hi * 0.6, 0.85] }[id];
    return { x: x + P[0] * k, y: y + P[1] * k, k: k * P[2] };
  }
  function drawCup(G, c, x, y, k, v, has, js, happy, land, rot) {
    const S = G.S;
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(1 + (js || 0), 1 - (js || 0));
    blit(c, happy ? S.cupHappy[v] : S.cup[v], 0, 0, k);
    const hi = has.krema ? -26 : 0, L = land || {};
    const sq = id => 1 + Math.sin((L[id] || 0) * PI) * 0.25;
    if (has.serpme) blit(c, S.sprOver, 0, -30 * k, k * sq('serpme'));
    if (has.krema) blit(c, S.top.krema, 0, -78 * k, k * sq('krema'));
    if (has.serpme && has.krema) blit(c, S.sprOver, 0, -80 * k, k * 0.45);
    if (has.cilek) blit(c, S.top.cilek, -46 * k, (-70 + hi * 0.5) * k, k * 0.8 * sq('cilek'), -0.25);
    if (has.mum) {
      blit(c, S.top.mum, 44 * k, (-96 + hi * 0.6) * k, k * 0.85 * sq('mum'), 0.12);
      c.save(); c.globalAlpha = 0.45 + Math.sin(G.pt * 13) * 0.15; blit(c, G.com.spark, 44 * k + 7 * k, (-96 + hi * 0.6 - 36) * k, k * 1.1); c.restore();
    }
    if (has.kiraz) blit(c, S.top.kiraz, 0, (-98 + hi * 1.6) * k, k * 0.85 * sq('kiraz'));
    c.restore();
  }
  function newCup(G, first) {
    const st = G.st;
    if (!st.fly) { st.fly = []; for (let i = 0; i < 6; i++) st.fly.push({ on: false }); }
    const nNeed = st.n < 2 ? 2 : 3;
    const pool = TOPS.slice().sort(() => R() - 0.5), need = pool.slice(0, nNeed);
    need.sort((a, b) => TOPS.indexOf(a) - TOPS.indexOf(b));
    st.cup = { v: st.n % CUPC.length, need, has: {}, land: {}, t: 0, jt: 0, complete: false, leaving: false, in: first ? 1 : 0, ct: 0, lt: 0, hint: 0 };
    st.n++;
    if (!first) { sfx('whoosh', { vol: 0.5 }); if (st.n === 4 && G.time - G.lastCheer > 6) { G.lastCheer = G.time; say(G, 'mini_kekSusle_3', 2); } }
  }

  // ═════════════════════════════════════════ 6) ÇİÇEK SULA ═════════════════════════════════════════
  const FLW = [
    { id: 'papatya', col: '#ffffff', mid: '#ffd23f', band: '#ffd23f' }, { id: 'lale', col: '#ff4d5e', mid: '#ff8a8a', band: '#ff7a8a' },
    { id: 'gul', col: '#ff7ab8', mid: '#ff4f9a', band: '#ff9ec4' }, { id: 'aycicegi', col: '#ffc928', mid: '#8a5a2b', band: '#ffb23f' },
    { id: 'menekse', col: '#9b5cf0', mid: '#ffe14d', band: '#b88cff' },
  ];
  function bloomSprite(f) {
    return spr(170, 170, c => {
      const id = f.id;
      if (id === 'papatya') {
        for (let i = 0; i < 14; i++) { c.save(); c.rotate(i / 14 * TAU); ball(c, 0, -44, 13, 30, '#ffffff', { stroke: '#c9c2d8', line: 3, gloss: false }); c.restore(); }
        ball(c, 0, 0, 34, 34, f.mid, { stroke: '#c98100', line: 3.5 }); face(c, 0, 0, 26, 'happy');
      } else if (id === 'lale') {
        c.beginPath(); c.moveTo(-46, -40); c.quadraticCurveTo(-30, -10, -18, -44); c.quadraticCurveTo(0, -12, 18, -44); c.quadraticCurveTo(30, -10, 46, -40);
        c.bezierCurveTo(54, 20, 30, 48, 0, 48); c.bezierCurveTo(-30, 48, -54, 20, -46, -40); c.closePath();
        const g = c.createRadialGradient(-12, -10, 4, 0, 6, 60); g.addColorStop(0, '#ff9aa6'); g.addColorStop(0.55, f.col); g.addColorStop(1, '#c41a3a');
        c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = '#8a1022'; c.stroke();
        c.strokeStyle = 'rgba(140,16,34,0.45)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-18, -40); c.quadraticCurveTo(-24, 0, -14, 30); c.moveTo(18, -40); c.quadraticCurveTo(24, 0, 14, 30); c.stroke();
        gloss(c, -26, -12, 8, 14, 0.2, 0.6); face(c, 0, 10, 28, 'happy');
      } else if (id === 'gul') {
        for (let i = 0; i < 7; i++) { c.save(); c.rotate(i / 7 * TAU + 0.3); ball(c, 0, -36, 26, 24, '#ff8cc4', { stroke: '#c43a7a', line: 3, gloss: false }); c.restore(); }
        ball(c, 0, 0, 44, 44, f.col, { stroke: '#c43a7a', line: 3.5 });
        c.strokeStyle = 'rgba(180,40,110,0.55)'; c.lineWidth = 3.5;
        c.beginPath(); for (let a = 0; a < 13; a += 0.2) { const r = 6 + a * 2.6; c.lineTo(Math.cos(a) * r, -14 + Math.sin(a) * r * 0.6); } c.stroke();
        face(c, 0, 10, 26, 'happy');
      } else if (id === 'aycicegi') {
        for (let i = 0; i < 18; i++) {
          c.save(); c.rotate(i / 18 * TAU); c.beginPath(); c.moveTo(-13, -36); c.quadraticCurveTo(-8, -66, 0, -78); c.quadraticCurveTo(8, -66, 13, -36); c.closePath();
          c.fillStyle = fillGrad(c, f.col, 0, -78, 0, -36, -0.1, 0.35); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#c98100'; c.stroke(); c.restore();
        }
        ball(c, 0, 0, 42, 42, f.mid, { stroke: '#4a2a12', line: 4 });
        c.fillStyle = 'rgba(60,30,10,0.45)'; for (let i = 0; i < 40; i++) { const a = i * 2.4, r = Math.sqrt(i) * 5.6; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 2, 0, TAU); c.fill(); }
        ball(c, 0, 4, 26, 20, '#a8784a', { line: 0, gloss: false }); face(c, 0, 2, 28, 'happy');
      } else {
        const pet = [[-22, -26, -0.5], [22, -26, 0.5], [-30, 10, -1.9], [30, 10, 1.9], [0, 30, PI]];
        pet.forEach(([x, y, r], i) => { c.save(); c.translate(x, y); c.rotate(r); ball(c, 0, -8, 25, 30, i < 2 ? '#8a4ae0' : f.col, { stroke: '#5a2a9a', line: 3.5, gloss: false }); c.restore(); });
        ball(c, 0, 0, 22, 22, f.mid, { stroke: '#c98100', line: 3 }); face(c, 0, 0, 18, 'happy');
      }
    });
  }
  function budSprite(f) {
    return spr(90, 110, c => {
      for (const d of [-1, 1]) { c.save(); c.rotate(d * 0.5); ball(c, 0, 30, 10, 22, '#5cbf3a', { stroke: '#2e7a1a', line: 3, gloss: false }); c.restore(); }
      const col = f.id === 'papatya' ? '#f4f0ff' : f.col, edge = f.id === 'papatya' ? '#9a94b0' : col;
      c.beginPath(); c.moveTo(0, -46); c.bezierCurveTo(30, -26, 34, 20, 0, 34); c.bezierCurveTo(-34, 20, -30, -26, 0, -46); c.closePath();
      const g = c.createRadialGradient(-8, -14, 3, 0, 0, 44); g.addColorStop(0, shade(col, 0.55)); g.addColorStop(0.6, col); g.addColorStop(1, shade(edge, -0.2));
      c.fillStyle = g; c.fill(); c.lineWidth = 3.5; c.strokeStyle = shade(edge, -0.45); c.stroke();
      gloss(c, -10, -18, 5, 9, 0.2, 0.6); face(c, 0, 6, 18, 'smile');
    });
  }
  function sproutSprite() {
    return spr(110, 90, c => {
      for (const d of [-1, 1]) { c.save(); c.translate(d * 14, -2); c.rotate(d * 0.9); ball(c, 0, -18, 15, 26, '#7bd65a', { stroke: '#3a8a2a', line: 3 }); c.restore(); }
      ball(c, 0, 14, 22, 20, '#8ee070', { stroke: '#3a8a2a', line: 3 }); face(c, 0, 14, 16, 'smile');
    });
  }
  function flowerPotSprite(band) {
    return spr(170, 140, c => {
      const body = () => { c.beginPath(); c.moveTo(-62, -30); c.lineTo(62, -30); c.lineTo(48, 58); c.quadraticCurveTo(46, 66, 36, 66); c.lineTo(-36, 66); c.quadraticCurveTo(-46, 66, -48, 58); c.closePath(); };
      body();
      const g = c.createLinearGradient(-62, 0, 62, 0); g.addColorStop(0, '#c4602e'); g.addColorStop(0.35, '#f09460'); g.addColorStop(1, '#b85428'); c.fillStyle = g; c.fill();
      c.save(); c.clip(); c.fillStyle = band; c.fillRect(-70, 8, 140, 16);
      c.fillStyle = '#fff'; for (let x = -54; x < 60; x += 22) { c.beginPath(); c.arc(x, 16, 4, 0, TAU); c.fill(); } c.restore();
      body(); c.lineWidth = 4; c.strokeStyle = '#8a3a18'; c.stroke();
      rr(c, -72, -46, 144, 24, 10); c.fillStyle = fillGrad(c, '#f08a52', 0, -46, 0, -22, -0.15, 0.25); c.fill(); c.stroke();
      c.fillStyle = '#5a3418'; c.beginPath(); c.ellipse(0, -46, 60, 8, 0, PI, TAU); c.fill();
      gloss(c, -42, 8, 6, 20, 0.15, 0.35);
    });
  }
  function canSprite() {
    return spr(200, 150, c => {
      const col = '#4fc3c8';
      c.lineWidth = 12; c.strokeStyle = shade(col, -0.35); c.beginPath(); c.arc(14, -28, 40, PI * 1.05, PI * 1.95); c.stroke();
      c.lineWidth = 7; c.strokeStyle = shade(col, 0.2); c.stroke();
      c.beginPath(); c.moveTo(-34, 0); c.lineTo(-92, -44); c.lineTo(-84, -54); c.lineTo(-26, -14); c.closePath();
      c.fillStyle = fillGrad(c, col, 0, -50, 0, 0, -0.2, 0.2); c.fill(); c.lineWidth = 3.5; c.strokeStyle = shade(col, -0.5); c.stroke();
      ball(c, -92, -52, 13, 9, '#ffd23f', { stroke: '#b8840a', line: 3, rot: -0.65 });
      rr(c, -42, -26, 104, 86, 26);
      const g = c.createLinearGradient(-42, 0, 62, 0); g.addColorStop(0, shade(col, -0.15)); g.addColorStop(0.3, shade(col, 0.35)); g.addColorStop(1, shade(col, -0.3)); c.fillStyle = g; c.fill();
      c.lineWidth = 4; c.strokeStyle = shade(col, -0.5); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.75)'; for (const [x, y] of [[-20, 40], [42, 8], [30, 46]]) { c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); }
      gloss(c, -26, -8, 7, 16, 0, 0.5);
      face(c, 12, 14, 30, 'smile');
    });
  }
  function drawVisitor(G, c, v, x, y) {   // çiçeği açılınca uçup gelen kuşlar: kahverengi serçe ya da renkli minik kuş (böcek yok)
    const u = G.u, fl = Math.sin(v.t * 18 + v.ph), dir = Math.cos(v.t * 1.4 + v.ph) > 0 ? 1 : -1;
    const body = v.bird ? '#a8744a' : v.col, belly = v.bird ? '#f6e2c4' : shade(v.col, 0.55), wing = shade(body, -0.25);
    c.save(); c.translate(x, y); c.scale(u * dir, u);
    c.fillStyle = shade(body, -0.2); c.beginPath(); c.moveTo(-14, -2); c.lineTo(-30, -10 + fl * 2); c.lineTo(-28, 4); c.closePath(); c.fill();   // kuyruk
    ball(c, 0, 0, 19, 15, body, { stroke: shade(body, -0.5), line: 2.5 });
    ball(c, 4, 5, 12, 9, belly, { gloss: false });
    ball(c, 13, -10, 11, 11, body, { stroke: shade(body, -0.5), line: 2.5 });
    if (v.bird) { c.fillStyle = '#6a4028'; c.beginPath(); c.arc(13, -12, 10, PI * 1.05, PI * 1.95); c.fill(); }
    c.fillStyle = '#ffb03a'; c.beginPath(); c.moveTo(22, -12); c.lineTo(31, -9); c.lineTo(22, -6); c.closePath(); c.fill();   // gaga
    c.fillStyle = '#2a140a'; c.beginPath(); c.arc(16, -12, 2.6, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(16.8, -12.9, 0.9, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,120,150,0.55)'; c.beginPath(); c.arc(17, -6, 2.6, 0, TAU); c.fill();
    c.save(); c.translate(-2, -4); c.rotate(-0.4 - fl * 0.7); ball(c, -6, -8, 11, 6, wing, { stroke: shade(wing, -0.45), line: 2, gloss: false }); c.restore();   // kanat
    c.restore();
  }
  shell('cicekSula', {
    ad: 'Çiçek Sula', color: '#5cbf3a', iconBg: '#cfefff', bgCol: '#bfe6ff', dur: 40, stars: [10, 22],
    sprites() {
      const S = { bloom: FLW.map(bloomSprite), bud: FLW.map(budSprite), sprout: sproutSprite(), pot: FLW.map(f => flowerPotSprite(f.band)), can: canSprite() };
      S.scoreIcon = spr(100, 100, c => c.drawImage(S.bloom[0].cv, -48, -48, 96, 96));
      return S;
    },
    icon(c, S) {
      const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#9ad8ff'); g.addColorStop(1, '#e4f6ff'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      c.fillStyle = '#e8d6bf'; for (let x = -150; x < 160; x += 30) c.fillRect(x, 80, 12, 40);
      c.fillStyle = '#d99a62'; c.fillRect(-160, 70, 320, 14);
      [[-95, 3], [0, 0], [95, 1]].forEach(([x, i], j) => {
        c.strokeStyle = '#3a8a2a'; c.lineWidth = 7; c.beginPath(); c.moveTo(x, 40); c.lineTo(x, j === 1 ? -36 : -14); c.stroke();
        c.strokeStyle = '#6fcf4a'; c.lineWidth = 4; c.stroke();
        blit(c, S.pot[i], x, 50, 0.45);
        if (j === 2) blit(c, S.bud[i], x, -20, 0.6); else blit(c, S.bloom[i], x, j === 1 ? -44 : -22, j === 1 ? 0.62 : 0.5);
      });
      blit(c, S.can, 100, -72, 0.5, -0.45);
      c.fillStyle = '#5fb8ff'; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(62 - i * 7, -64 + i * 12, 3.5, 6, 0.4, 0, TAU); c.fill(); }
    },
    bg(b, W, H, u) {
      const rail = H * 0.8;
      let g = b.createLinearGradient(0, 0, 0, rail); g.addColorStop(0, '#7cc8ff'); g.addColorStop(1, '#d8f1ff'); b.fillStyle = g; b.fillRect(0, 0, W, rail);
      const sx = W * 0.84, sy = H * 0.26;
      g = b.createRadialGradient(sx, sy, 10 * u, sx, sy, 230 * u); g.addColorStop(0, 'rgba(255,250,200,0.95)'); g.addColorStop(1, 'rgba(255,250,200,0)'); b.fillStyle = g; b.fillRect(0, 0, W, rail);
      b.fillStyle = 'rgba(255,214,74,0.6)';
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; b.save(); b.translate(sx, sy); b.rotate(a); rr(b, 62 * u, -8 * u, 30 * u, 16 * u, 8 * u); b.fill(); b.restore(); }
      ball(b, sx, sy, 52 * u, 52 * u, '#ffd84a', { line: 4 * u, stroke: '#f0a820' }); face(b, sx, sy, 32 * u, 'happy');
      const cloud = (x, y, s) => {
        for (const [col, oy] of [['rgba(120,170,220,0.3)', 8], ['#fff', 0]]) { b.fillStyle = col; for (const [dx, dy, r] of [[-60, 10, 40], [-15, -8, 52], [45, 4, 44], [0, 22, 42]]) { b.beginPath(); b.arc(x + dx * s, y + (dy + oy) * s, r * s, 0, TAU); b.fill(); } }
      };
      cloud(W * 0.2, H * 0.3, u * 0.9); cloud(W * 0.58, H * 0.2, u * 0.6);
      // uzak çatılar
      b.fillStyle = 'rgba(120,160,200,0.3)';
      for (let i = 0; i < 9; i++) {
        const x = i / 8 * W, w = 120 * u, h = (60 + (i * 37) % 70) * u, top = rail - 120 * u - h;
        b.fillRect(x - w / 2, top, w, h + 120 * u); b.beginPath(); b.moveTo(x - w / 2 - 10 * u, top); b.lineTo(x, top - 50 * u); b.lineTo(x + w / 2 + 10 * u, top); b.fill();
      }
      // flama
      b.lineWidth = 3 * u; b.strokeStyle = '#b8784a'; b.beginPath(); b.moveTo(0, 26 * u); b.quadraticCurveTo(W / 2, 90 * u, W, 26 * u); b.stroke();
      for (let i = 0; i < 16; i++) { const t = (i + 0.5) / 16, x = t * W, y = 26 * u + 2 * (1 - t) * t * 64 * u; b.fillStyle = ['#ff7ab8', '#ffd23f', '#7bd65a', '#4fb3ff'][i % 4]; b.beginPath(); b.moveTo(x - 18 * u, y); b.lineTo(x + 18 * u, y); b.lineTo(x, y + 30 * u); b.fill(); }
      // korkuluk
      b.fillStyle = '#ead8c0'; b.fillRect(0, rail, W, H - rail);
      for (let x = 10 * u; x < W; x += 54 * u) { rr(b, x, rail + 10 * u, 22 * u, H - rail, 10 * u); b.fillStyle = '#fffaf2'; b.fill(); b.lineWidth = 2.5 * u; b.strokeStyle = '#c9b090'; b.stroke(); }
      b.fillStyle = 'rgba(120,80,40,0.25)'; b.fillRect(0, rail + 16 * u, W, 8 * u);
      rr(b, -10, rail - 8 * u, W + 20, 26 * u, 10 * u); b.fillStyle = fillGrad(b, '#d99a62', 0, rail - 8 * u, 0, rail + 18 * u, -0.15, 0.25); b.fill(); b.lineWidth = 3 * u; b.strokeStyle = '#8a5a2a'; b.stroke();
      // yan sarmaşıklar
      for (const x0 of [6 * u, W - 6 * u]) for (let y = 120 * u; y < rail; y += 34 * u) { b.save(); b.translate(x0 + Math.sin(y / 40) * 10 * u, y); b.rotate(Math.sin(y) * 0.6); ball(b, 0, 0, 13 * u, 8 * u, '#6fcf4a', { line: 2 * u, stroke: '#3a8a2a', gloss: false }); b.restore(); }
    },
    layout(G) {
      const W = G.W, H = G.H, u = G.u, st = G.st, rail = H * 0.8;
      st.k = Math.min(u, W * 0.16 / 170);
      st.pots = FLW.map((f, i) => ({ x: W * (0.14 + i * 0.18), y: rail - 42 * st.k, i }));
      st.top = G.hudBottom + 20 * u;
      if (!st.can) st.can = { x: W * 0.5, y: H * 0.36, tilt: 0 };
    },
    onPlay(G) { pickFlower(G, true); },
    update(G, dt, live) {
      const st = G.st, u = G.u;
      if (!st.fl) { st.fl = FLW.map(() => ({ stage: 0, h: 0.25, j: 0, wob: 0, bl: 0 })); st.vis = []; st.pour = null; st.queue = -1; st.tT = 0; st.round = 0; st.celeb = 0; st.repT = -9; st.sw = 0; st.target = -1; }
      for (const f of st.fl) { const th = [0.25, 0.62, 1][f.stage]; f.h += (th - f.h) * Math.min(1, dt * 6); f.j = Math.max(0, f.j - dt * 2.2); f.wob = Math.max(0, f.wob - dt * 1.6); f.bl += dt; }
      for (const v of st.vis) v.t += dt;
      st.sw = Math.max(0, st.sw - dt * 2);
      // sulama kabı
      const cn = st.can;
      let tx = cn.x, ty = cn.y, tilt = 0;
      if (st.pour) {
        const P = st.pots[st.pour.i]; tx = P.x + 95 * st.k; ty = P.y - 300 * st.k; st.pour.t += dt;
        const q = st.pour.t; tilt = q > 0.12 ? -0.95 : 0;
        if (q > 0.2 && q < 0.68) {   // damlalar
          st.pour.dt = (st.pour.dt || 0) - dt;
          if (st.pour.dt <= 0) {
            st.pour.dt = 0.03;
            const kk = st.k * 0.95, ca = Math.cos(cn.tilt), sa = Math.sin(cn.tilt);   // emzik ucu
            const sx = cn.x + (-92 * ca + 52 * sa) * kk, sy = cn.y + (-92 * sa - 52 * ca) * kk;
            emitP(G, 'w', sx + rnd(-5, 5) * u, sy, { vx: rnd(-70, 0) * u, vy: rnd(0, 90) * u, g: 1400 * u, max: 0.55, s: rnd(5, 8) * u });
          }
          if (!st.pour.snd) { st.pour.snd = 1; sfx('splash', { vol: 0.5 }); }
        }
        if (q > 0.7) finishPour(G);
      } else if (G.ptr.down && st.drag) { tx = G.ptr.x + 40 * u; ty = G.ptr.y - 60 * u; }
      else { ty = G.H * 0.36 + Math.sin(G.pt * 2) * 8 * u; }
      cn.x += (tx - cn.x) * Math.min(1, dt * 12); cn.y += (ty - cn.y) * Math.min(1, dt * 12); cn.tilt += (tilt - cn.tilt) * Math.min(1, dt * 10);
      if (!live) return;
      st.tT += dt;
      if (st.celeb > 0) { st.celeb -= dt; if (st.celeb <= 0) newGarden(G); } else if (st.tT > 7) pickFlower(G, false);
    },
    down(G) { const st = G.st; if (st.fl) st.drag = true; },
    up(G, x, y) {
      const st = G.st; if (!st.fl || !st.drag) return; st.drag = false;
      if (y < st.top) return;
      let bi = 0, bd = 1e9; st.pots.forEach((P, i) => { const d = Math.abs(x - P.x); if (d < bd) { bd = d; bi = i; } });
      if (st.pour) { st.queue = bi; return; }
      startPour(G, bi);
    },
    key(G, k) { const m = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 3, ArrowRight: 4 }; if (k in m && G.st.fl && !G.st.pour) startPour(G, m[k]); },
    draw(G, c) {
      const st = G.st, S = G.S, u = G.u, k = st.k;
      if (!st.fl) return;
      st.pots.forEach((P, i) => {
        const f = st.fl[i], sway = Math.sin(G.pt * 1.6 + i) * 0.04 + Math.sin(f.wob * 18) * 0.14 * f.wob;
        const stemH = (30 + f.h * 200) * k, hx = P.x + Math.sin(sway) * stemH, hy = P.y - 50 * k - stemH;
        P.hx = hx; P.hy = hy;
        if (f.h > 0.3) {   // gövde + yapraklar
          c.strokeStyle = '#3a8a2a'; c.lineWidth = 11 * k; c.beginPath(); c.moveTo(P.x, P.y - 46 * k); c.quadraticCurveTo(P.x, hy + stemH * 0.4, hx, hy); c.stroke();
          c.strokeStyle = '#6fcf4a'; c.lineWidth = 6 * k; c.stroke();
          for (const d of [-1, 1]) { const ly = P.y - 46 * k - stemH * (d > 0 ? 0.3 : 0.5); c.save(); c.translate(P.x + d * 4 * k, ly); c.rotate(d * 0.9 + sway); ball(c, 0, -20 * k, 13 * k, 26 * k, '#7bd65a', { stroke: '#3a8a2a', line: 3 * k }); c.restore(); }
        }
        c.fillStyle = 'rgba(90,50,20,0.25)'; c.beginPath(); c.ellipse(P.x, P.y + 66 * k, 60 * k, 10 * k, 0, 0, TAU); c.fill();
        blit(c, S.pot[i], P.x, P.y, k);
        const pj = 1 + Math.sin(f.j * PI) * 0.35 * f.j;
        if (f.h <= 0.3) blit(c, S.sprout, P.x, P.y - 66 * k, k * 0.95 * pj, sway);
        else if (f.stage < 2) blit(c, S.bud[i], hx, hy - 18 * k, k * 0.9 * pj, sway);
        else {
          c.save(); c.globalAlpha = 0.35 + Math.sin(f.bl * 3) * 0.1; blit(c, G.com.spark, hx, hy - 10 * k, k * 3.4, f.bl * 0.4); c.restore();
          blit(c, S.bloom[i], hx, hy - 10 * k, k * 0.95 * pj * Math.min(1, 0.4 + f.h * 0.6), sway + Math.sin(f.bl * 2) * 0.05);
        }
      });
      // ziyaretçiler (serçe, renkli minik kuş)
      for (const v of st.vis) {
        const P = st.pots[v.i]; if (P.hx === undefined) continue;
        const q = outCubic(Math.min(1, v.t / 1.2)), sx = lerp(v.sx, P.hx, q), sy = lerp(v.sy, P.hy, q);
        drawVisitor(G, c, v, sx + Math.cos(v.t * 1.4 + v.ph) * 70 * k * q, sy - 60 * k + Math.sin(v.t * 2.3 + v.ph) * 30 * k * q);
      }
      // sulama kabı
      const cn = st.can;
      blit(c, S.can, cn.x, cn.y + Math.sin(G.pt * 3) * 3 * u, k * 0.95, cn.tilt);
      // hedef rozeti
      if (G.phase === 'play' || G.phase === 'count') {
        const x = G.W / 2, y = G.hudY + 26 * u, r = 66 * u, p = 1 + Math.sin(G.time * 4) * 0.04 + st.sw * 0.12 * Math.sin(G.pt * 30);
        const fi = st.target >= 0 ? st.target : 0, col = FLW[fi].band;
        c.save(); c.translate(x, y); c.scale(p, p);
        c.fillStyle = 'rgba(30,60,120,0.25)'; c.beginPath(); c.arc(0, 8 * u, r, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.lineWidth = 9 * u; c.strokeStyle = st.celeb > 0 ? '#ffd23f' : col; c.stroke();
        if (st.celeb > 0) { for (let i = 0; i < 5; i++) blit(c, S.bloom[i], Math.cos(i / 5 * TAU + G.pt) * 30 * u, Math.sin(i / 5 * TAU + G.pt) * 30 * u, u * 0.3); }
        else if (G.phase === 'play') blit(c, S.bloom[fi], 0, 0, u * 0.66);
        c.restore();
        drawHalaMini(G, c, x - r - 52 * u, y + 4 * u, u * 0.5);
        if (st.tT < 1.2 && st.celeb <= 0 && G.phase === 'play') { const q = st.tT / 1.2; c.save(); c.globalAlpha = 1 - q; c.lineWidth = 8 * u; c.strokeStyle = col; c.beginPath(); c.arc(x, y, r * (1 + q * 0.8), 0, TAU); c.stroke(); c.restore(); }
      }
    },
  });
  function startPour(G, i) { G.st.pour = { i, t: 0 }; sfx('whoosh', { vol: 0.35, pitch: 1.2 }); }
  function finishPour(G) {
    const st = G.st, u = G.u, i = st.pour.i, P = st.pots[i], f = st.fl[i];
    st.pour = null;
    puff(G, P.x, P.y - 50 * st.k, '#5fb8ff', 50 * st.k);
    for (let n = 0; n < 5; n++) emitP(G, 'w', P.x + rnd(-30, 30) * u, P.y - 50 * st.k, { vx: rnd(-120, 120) * u, vy: rnd(-260, -120) * u, g: 1200 * u, max: 0.45, s: rnd(4, 6) * u });
    if (st.celeb > 0 || G.phase !== 'play') sfx('bubble', { vol: 0.5 });
    else if (i === st.target && f.stage < 2) {
      f.stage++; f.j = 1;
      sfx('bell', { pitch: semi([0, 4, 7, 9, 12][i] + (f.stage === 2 ? 12 : 0)), vol: 0.8 });
      addScore(G, f.stage === 2 ? 3 : 1, P.x, P.y - 320 * st.k, FLW[i].band === '#ffd23f' ? '#ffb000' : FLW[i].band);
      sparkles(G, P.hx, P.hy, f.stage === 2 ? 14 : 6, 1.2);
      if (f.stage === 2) {
        sfx('pop', { vol: 0.8 }); sfx('chirp', { vol: 0.6 }); confetti(G, P.hx, P.hy - 20 * u, 22, 0.8); hearts(G, P.hx, P.hy - 40 * u, 3); G.shake = 0.4;
        st.vis.push({ i, t: 0, ph: rnd(0, TAU), bird: st.vis.length % 2 === 1, col: pick(['#ff7ab8', '#4fb3ff', '#ffd23f', '#6fd36a']), sx: R() < 0.5 ? -60 * u : G.W + 60 * u, sy: rnd(G.H * 0.2, G.H * 0.5) });
        if (st.fl.every(q => q.stage === 2)) {
          st.celeb = 2.2; sfx('levelup', { vol: 0.8 }); sfx('cheer', { vol: 0.6 }); confetti(G, G.W / 2, G.H * 0.4, 60, 1.3); G.flash = 0.6;
          G.lastCheer = G.time; say(G, 'mini_cicekSula_2', 3);
        } else { if (G.time - G.lastCheer > 6) { G.lastCheer = G.time; say(G, pick(['mini_cicekSula_1', 'mini_cicekSula_3']), 2); } pickFlower(G, false); }
      }
    } else {
      f.wob = 1; st.sw = 1; sfx('bubble', { vol: 0.6 });
      if (G.time - st.repT > 4) { st.repT = G.time; say(G, 'mini_cicek_' + FLW[st.target].id, 3); }
    }
    if (st.queue >= 0) { const q = st.queue; st.queue = -1; startPour(G, q); }
  }
  function pickFlower(G, first) {
    const st = G.st, open = [0, 1, 2, 3, 4].filter(i => st.fl[i].stage < 2);
    if (!open.length) return;
    const ch = open.filter(i => i !== st.target);
    st.target = first || !ch.length ? pick(open) : pick(ch);
    st.tT = 0; say(G, 'mini_cicek_' + FLW[st.target].id, 3); sfx('chirp', { vol: 0.5 });
  }
  function newGarden(G) {
    const st = G.st;
    st.round++; st.vis.length = 0;
    st.fl.forEach(f => { f.stage = 0; f.j = 1; });
    sfx('pop', { vol: 0.6 }); sparkles(G, G.W / 2, G.H * 0.6, 16, 2);
    st.target = -1; pickFlower(G, true);
  }
})();
