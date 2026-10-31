/* ── Pırıl'ın mini oyunları (MINIGAME.register) — her biri bir diyardan:
   isikYakala (Kum Saati Çölü, gece: Pırıl sepetle düşen ejderha ışıklarını yakalar) · mantarMuzik (Işıklı Mantar Vadisi: ışık halkası
   mantara gelince dokun, mantar zıplar ve nota çalar) · kabarcikPatlat (Mercan Denizi: Pırıl'ın söylediği renkteki kabarcıkları patlat) ·
   bulutTopla (Gökkuşağı Adaları: Feza Pırıl'ın sırtında uçar, bulut koyunlarını toplar) · yumurtaSusle (Oyuncak Atölyesi: ejderha
   yumurtasına resimdeki süsleri yapıştır).
   Hepsi tek bir Canvas 2D katmanında çizilir (ctx.root içinde). Ortak akış: giriş kartı (Pırıl anlatır, ▶ ya da kendiliğinden
   3-2-1) → oyun (zaman halkası, skor, X) → bitiş (1-3 yıldız, yıldız şeker ödülü, ilk 3 yıldızda gizli çıkartma, ✓ Tamam).
   Pırıl'ın tepkileri (ortak): doğru hamlede sevinç zıplaması, yanlışta sevimli "hıh?" yüzü (kızmak yok), her 6'lı seride dans +
   oyuna özel sürpriz (mantar dalgası, havada takla, yumurtadan yavru çıkışı). Ekran sade: "+1" yazısı yok, parçacık az.
   Kaybetmek yok; her oyun 35-45 s, okuma yok. Sesler yalnız AUD.sfx / AUD.say (anahtarlar mini_<id>_giris/_1/_2/_3/_son …).
   Kare çizimi update() içinde. */
(() => {
  'use strict';
  if (typeof MINIGAME === 'undefined') return;
  // 08m_minigame.js'deki yer tutucu 'sekerYakala' (5 sn dokun) bu macerada yok: Mini Oyun Köşesi listesinde görünmesin
  try {
    const _list = MINIGAME.list;
    if (typeof _list === 'function') MINIGAME.list = () => _list().filter(id => id !== 'sekerYakala');
  } catch (e) { /* yok */ }
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
    S.rays = spr(300, 300, c => {   // bitiş ekranı ışınları (önceden çizilir)
      const g = c.createRadialGradient(0, 0, 10, 0, 0, 150); g.addColorStop(0, 'rgba(255,245,190,1)'); g.addColorStop(1, 'rgba(255,245,190,0)');
      c.fillStyle = g; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 150, a, a + TAU / 30); c.closePath(); c.fill(); }
    });
    S.prHappy = spr(230, 250, c => { c.translate(0, -6); pirilDraw(c, true, 0.98, 'happy'); });
    S.prHuh = spr(230, 250, c => { c.translate(0, -6); pirilDraw(c, false, 0.98, 'huh'); });
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
  // Pırıl (2B): mor peluş yavru ejderha — yeşil ibik, fıstık yeşili karın, kocaman gözler, minik kanatlar. talk/open: ağız açık
  const PR = { pur: '#b28ae6', purL: '#d2b6f7', purD: '#8660c4', line: '#52338c', lime: '#bde43a', limeD: '#93bd28', crest: '#2f8a2c', crestL: '#55ad44', eye: '#1c1228', blush: '#ff8cc6', tongue: '#ff8fb8' };
  function pirilDraw(c, open, k = 1, mood) {   // mood: undefined | 'happy' (^ ^ gözler) | 'huh' ("hıh?": bir kaş havada, minik o ağız)
    c.save(); c.scale(k, k);
    // kanatlar (arkada)
    for (const d of [-1, 1]) {
      c.beginPath(); c.moveTo(d * 40, 40); c.quadraticCurveTo(d * 120, -10, d * 112, 50); c.quadraticCurveTo(d * 98, 60, d * 86, 70); c.quadraticCurveTo(d * 74, 64, d * 60, 76); c.closePath();
      c.fillStyle = fillGrad(c, PR.purL, 0, -10, 0, 80, -0.05, 0.25); c.fill(); c.lineWidth = 4; c.strokeStyle = PR.line; c.stroke();
    }
    // gövde + karın
    ball(c, 0, 72, 66, 54, PR.pur, { stroke: PR.line, line: 4, gloss: false });
    ball(c, 0, 80, 38, 38, PR.lime, { stroke: PR.limeD, line: 3, gloss: false });
    c.strokeStyle = PR.limeD; c.lineWidth = 2.5; for (const y of [66, 80, 94]) { c.beginPath(); c.moveTo(-26, y); c.quadraticCurveTo(0, y + 6, 26, y); c.stroke(); }
    // ibik (üç yeşil diken)
    for (const [x, y, r] of [[-26, -92, 14], [0, -104, 17], [26, -92, 14]]) ball(c, x, y, r, r * 1.25, PR.crestL, { stroke: PR.crest, line: 3.5, gloss: false });
    // baş
    ball(c, 0, -34, 78, 66, PR.pur, { stroke: PR.line, line: 4.5, gloss: false });
    gloss(c, -32, -70, 24, 11, -0.35, 0.3);
    // burun bölgesi
    ball(c, 0, -2, 40, 26, PR.purL, { stroke: PR.purD, line: 3, gloss: false });
    c.fillStyle = PR.line; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 11, -10, 3.5, 2.5, 0, 0, TAU); c.fill(); }
    // gözler
    if (mood === 'happy') {
      c.strokeStyle = PR.eye; c.lineWidth = 6;
      for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 30, -38, 13, PI * 1.12, PI * 1.88); c.stroke(); }
    } else for (const d of [-1, 1]) {
      const big = mood === 'huh' ? 1.12 : 1, lx = mood === 'huh' ? 5 : 0, ly = mood === 'huh' ? -5 : 0;
      c.fillStyle = PR.eye; c.beginPath(); c.ellipse(d * 30, -44, 13 * big, 16 * big, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(d * 30 - 4 + lx, -50 + ly, 5, 0, TAU); c.fill(); c.beginPath(); c.arc(d * 30 + 4 + lx, -38 + ly, 2.2, 0, TAU); c.fill();
    }
    if (mood === 'huh') {   // kaşlar: biri yukarıda
      c.strokeStyle = PR.line; c.lineWidth = 5;
      c.beginPath(); c.moveTo(-42, -70); c.quadraticCurveTo(-30, -74, -18, -70); c.stroke();
      c.beginPath(); c.moveTo(18, -80); c.quadraticCurveTo(30, -90, 42, -82); c.stroke();
    }
    c.fillStyle = 'rgba(255,140,198,0.45)'; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 54, -18, 12, 7, 0, 0, TAU); c.fill(); }
    // ağız
    if (mood === 'huh') {
      c.fillStyle = '#4a1d4a'; c.beginPath(); c.ellipse(6, 14, 6, 7, 0, 0, TAU); c.fill();
    } else if (open || mood === 'happy') {
      c.beginPath(); c.moveTo(-18, 6); c.quadraticCurveTo(0, 36, 18, 6); c.quadraticCurveTo(0, 12, -18, 6); c.closePath();
      c.fillStyle = '#4a1d4a'; c.fill(); c.save(); c.clip(); c.fillStyle = PR.tongue; c.beginPath(); c.ellipse(0, 24, 10, 8, 0, 0, TAU); c.fill(); c.restore();
      c.lineWidth = 3; c.strokeStyle = PR.line; c.stroke();
    } else { c.strokeStyle = PR.line; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-14, 8); c.quadraticCurveTo(0, 20, 14, 8); c.stroke(); }
    c.restore();
  }
  function halaFace(talk) {   // (eski ad: mini oyunların anlatıcı yüzü artık Pırıl)
    return spr(230, 250, c => { c.translate(0, -6); pirilDraw(c, talk, 0.98); });
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
  // Pırıl'ın mini oyunları: her biri bir diyardan (çöl, mantar vadisi, mercan denizi, gökkuşağı adaları, oyuncak atölyesi)
  function shell(id, cfg) {
    const d = MINIGAME.register(id, {
      ad: cfg.ad, holdsWorld: true, yildizlar: cfg.stars ? [1, cfg.stars[0], cfg.stars[1]] : undefined,   // (merkez Mini Oyun Köşesi yıldızları)
      ikon: cfg.ikon, renk: cfg.renk,
      start(ctx) { ctx.data.G = makeG(ctx, cfg); },
      update(dt, ctx) { const G = ctx.data.G; return G ? tick(G, Math.min(Math.max(dt, 0), 0.05)) : 'done'; },
      end(ctx) { const G = ctx.data.G; if (G) cleanup(G); return ctx.score; },
    });
    // Mini Oyun Köşesi kartı için oyunun resmi (ilk istenince bir kez çizilir)
    let pic = null;
    try {
      Object.defineProperty(d, 'resim', { configurable: true, enumerable: true, get() {
        if (pic === null) {
          try {
            const S = cfg.sprites ? cfg.sprites() : {}, ic = spr(320, 220, c => cfg.icon(c, S, common()));
            const cv = document.createElement('canvas'); cv.width = 320; cv.height = 220;
            const x2 = cv.getContext('2d'); rr(x2, 0, 0, 320, 220, 34); x2.clip(); x2.drawImage(ic.cv, 0, 0, 320, 220); pic = cv.toDataURL('image/png');
          } catch (e) { pic = ''; }
        }
        return pic || null;
      } });
    } catch (e) { /* yok */ }
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
      lastCheer: 0, cheerLast: '', talkT: 0, mood: { k: '', t: 0, d: 0 }, streak: 0, lastOops: -9, safe: { t: 0, r: 0, b: 0, l: 0 }, btn: {}, cd: -1, endT: 0, revealed: 0, sticker: false, record: false };
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
  function addScore(G, n, x, y, col) {   // ekran sade kalsın: "+1" yazısı yok, yalnız 2+ puanda küçük "+3"
    G.score += n; G.ctx.score = G.score; G.bump = 1;
    if (x !== undefined && n > 1) scorePop(G, x, y, '+' + n, col);
  }
  // ───────── Pırıl'ın tepkileri (her oyunda ortak) ─────────
  // react: 'happy' (sevinç zıplaması) · 'huh' ("hıh?" şaşkın yüz, başını yana eğer) · 'dance' (seri kutlaması: sallanarak dans)
  function react(G, k, d) { if (G.mood.k === 'dance' && k !== 'dance' && G.mood.t < G.mood.d) return; G.mood.k = k; G.mood.t = 0; G.mood.d = d || 0.7; }
  function good(G, x, y) {   // doğru hamle: seri sayılır; her 6'lı seride küçük kutlama
    G.streak++;
    if (G.streak % 6 === 0) {
      react(G, 'dance', 1.8); sfx('levelup', { vol: 0.45 });
      const b = G.buddyAt; if (b) hearts(G, b.x, b.y - 40 * G.u, 3); else if (x !== undefined) hearts(G, x, y, 3);
      G_cheer(G, true);
      if (G.cfg.onStreak) G.cfg.onStreak(G);
      return true;
    }
    react(G, 'happy', 0.5); return false;
  }
  function oops(G, soft) {   // yanlış ya da kaçan: kızmak yok, Pırıl'ın sevimli "hıh?" yüzü (soft: kaçırma — seyrek tepki)
    G.streak = 0;
    if (G.time - G.lastOops < (soft ? 4 : 0.6)) return;
    G.lastOops = G.time; react(G, 'huh', 1.1); sfx('hiccup', { vol: 0.45, pitch: 1.25 });
  }
  function moodSprite(G, talking) {
    const m = G.mood;
    if (m.t < m.d) { if (m.k === 'huh') return G.com.prHuh; if (m.k === 'happy' || m.k === 'dance') return G.com.prHappy; }
    return talking ? G.com.halaTalk : G.com.hala;
  }
  function moodPose(G) {   // dönüş, zıplama, ölçek (çizimlerde ortak)
    const m = G.mood, q = m.d > 0 ? clamp(m.t / m.d, 0, 1) : 1, on = m.t < m.d;
    if (!on) return { rot: 0, hop: 0, sx: 1, sy: 1 };
    if (m.k === 'huh') return { rot: 0.22 * Math.sin(Math.min(1, m.t * 6) * PI / 2) * (1 - Math.max(0, q - 0.8) * 5), hop: 0, sx: 1, sy: 1 };
    if (m.k === 'happy') { const h = Math.sin(q * PI); return { rot: 0, hop: h * 18, sx: 1 - h * 0.05, sy: 1 + h * 0.06 }; }
    const a = m.t * 9; return { rot: Math.sin(a) * 0.2, hop: Math.abs(Math.sin(a)) * 16, sx: 1 + Math.sin(a * 2) * 0.04, sy: 1 - Math.sin(a * 2) * 0.04 };
  }
  function drawQuestion(G, c, x, y, k) {   // "hıh?" balonu: küçük soru işareti
    const m = G.mood; if (m.k !== 'huh' || m.t >= m.d) return;
    const q = outBack(Math.min(1, m.t / 0.25)) * (m.t > m.d - 0.2 ? (m.d - m.t) / 0.2 : 1);
    c.save(); c.translate(x, y + Math.sin(m.t * 8) * 3 * k); c.scale(q, q);
    ball(c, 0, 0, 30 * k, 30 * k, '#ffffff', { line: 3 * k, stroke: '#8660c4', gloss: false });
    txt(c, '?', 0, 2 * k, 40 * k, '#8660c4', '#ffffff'); c.restore();
  }
  function drawBuddy(G, c, x, y, k) {   // köşedeki Pırıl (tepkileriyle)
    G.buddyAt = { x, y };
    const talking = (G.cap || G.talkT > 0) && Math.sin(G.pt * 18) > -0.2, P = moodPose(G), bob = Math.sin(G.pt * 2.4) * 4 * k;
    c.fillStyle = 'rgba(30,20,40,0.22)'; c.beginPath(); c.ellipse(x, y + 120 * k, 80 * k * (1 - P.hop / 80), 12 * k, 0, 0, TAU); c.fill();
    blit(c, moodSprite(G, talking), x, y + bob - P.hop * k * 1.6, k, P.rot, P.sx, P.sy);
    drawQuestion(G, c, x + 70 * k, y - 120 * k, Math.max(0.6, k * 1.8));
  }
  function resize(G) {
    const W = Math.max(320, G.root.clientWidth || window.innerWidth), H = Math.max(240, G.root.clientHeight || window.innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    G.W = W; G.H = H; G.dpr = dpr; G.u = W >= H ? Math.min(W / 1180, H / 820) : Math.min(W / 860, H / 1000);   // dikeyde de büyük kalsın
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
    // sol üstteki "Eve dön" düğmesi (ev-dugmesi.js) skorun üstüne binmesin: HUD'u sağına kaydır
    G.hudL = 0;
    try {
      const eb = document.getElementById('fbEv');
      if (eb && eb.getClientRects().length) { const r = eb.getBoundingClientRect(), rr0 = G.root.getBoundingClientRect(); if (r.left - rr0.left < W * 0.3 && r.top - rr0.top < 160) G.hudL = r.right - rr0.left + 10; }
    } catch (e) { /* yok */ }
    G.hudR = Math.max(s.l + G.pad, G.hudL) + (186 + 18 + 76 + 4) * u;   // skor + zaman halkasının sağ kenarı
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
    confetti(G, G.W / 2, G.H * 0.35, 22, 1.1);
  }
  function tick(G, dt) {
    if (G.done) return 'done';
    if (G.root.clientWidth && (Math.abs(G.root.clientWidth - G.W) > 1 || Math.abs(G.root.clientHeight - G.H) > 1)) resize(G);
    G.pt += dt; G.talkT = Math.max(0, G.talkT - dt); G.capT = (G.capT || 0) + dt; G.mood.t += dt;
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
        const L = G.endLayout; if (L) { const sx = L.starX[G.revealed - 1]; confetti(G, sx, L.starY, 10, 0.7); sparkles(G, sx, L.starY, 4, 1); G.starHop = 1; }
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
    drawHalaMini(G, c, x + 34 * u, y + h / 2, u * 0.36, true);
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
    const u = G.u, s = G.safe, y = G.hudY, x0 = Math.max(s.l + G.pad, G.hudL || 0), h = 76 * u;
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
    if (happyBob) {   // bitiş: Pırıl dans eder (sağa-sola sallanır, zıplar; her yıldızda daha yükseğe)
      G.starHop = Math.max(0, (G.starHop || 0) - 1 / 40);
      const a = G.pt * 6.5, hop = Math.abs(Math.sin(a)) * 16 * G.u + Math.sin((1 - G.starHop) * PI) * G.starHop * 60 * G.u, sq = Math.sin(a * 2) * 0.05;
      const spr2 = talking ? G.com.halaTalk : (Math.floor(G.pt * 1.3) % 2 ? G.com.prHappy : G.com.halaTalk);
      blit(c, spr2, x, y - hop, k, Math.sin(a) * 0.16, 1 + sq, 1 - sq);
    } else blit(c, talking ? G.com.halaTalk : G.com.hala, x, y + bob, k, tilt);
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
    c.save(); c.globalAlpha = 0.5 * clamp((t - 0.5) / 0.6, 0, 1); blit(c, G.com.rays, cx, L.starY, Math.max(cw, ch) / 300 * 1.7, t * 0.25); c.restore();
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
  const BROWN = '#b28ae6', BROWN_D = '#52338c', BROWN_L = '#d2b6f7';   // (Pırıl'ın mor peluş renkleri: sepeti tutan patiler, kuyruk)
  // Ejderha ışıkları: 0 yuvarlak ışık, 1 alev damlası, 2 yıldız ışık, 3 kalp ışık (hepsi gülen yüzlü, parlak hâleli)
  function lightSprite(kind, col) {
    return spr(110, 110, c => {
      const g0 = c.createRadialGradient(0, 0, 4, 0, 0, 54);
      g0.addColorStop(0, rgba(shade(col, 0.6), 0.75)); g0.addColorStop(0.45, rgba(col, 0.32)); g0.addColorStop(1, rgba(col, 0));
      c.fillStyle = g0; c.beginPath(); c.arc(0, 0, 54, 0, TAU); c.fill();
      if (kind === 0) {
        ball(c, 0, 0, 30, 30, col, { line: 3, stroke: shade(col, -0.35) });
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(0, 0, 18, 0, TAU); c.fill();
        face(c, 0, 3, 18, 'smile');
      } else if (kind === 1) {   // alev damlası (Pırıl'ın ışığı)
        c.beginPath(); c.moveTo(0, -42); c.bezierCurveTo(16, -22, 32, -2, 28, 14); c.bezierCurveTo(24, 34, -24, 34, -28, 14); c.bezierCurveTo(-32, -2, -16, -22, 0, -42); c.closePath();
        const g = c.createRadialGradient(-6, 6, 3, 0, 8, 40); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, shade(col, 0.55)); g.addColorStop(1, col);
        c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = shade(col, -0.35); c.stroke();
        gloss(c, -10, -6, 5, 9, 0.3, 0.7); face(c, 0, 12, 16, 'smile');
      } else if (kind === 2) {
        star(c, 0, 2, 36, col, { face: 'smile', stroke: shade(col, -0.35) });
      } else {
        heartPath(c, 0, 8, 34); c.fillStyle = fillGrad(c, col, 0, -30, 0, 30, -0.15, 0.5); c.fill(); c.lineWidth = 3; c.strokeStyle = shade(col, -0.35); c.stroke();
        gloss(c, -12, -8, 7, 4, -0.6, 0.75); face(c, 0, 0, 15, 'smile');
      }
    });
  }
  function rainbowLightSprite() {   // gökkuşağı ışığı (3 puan)
    return spr(130, 130, c => {
      const g0 = c.createRadialGradient(0, 0, 6, 0, 0, 64); g0.addColorStop(0, 'rgba(255,255,230,0.9)'); g0.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g0; c.beginPath(); c.arc(0, 0, 64, 0, TAU); c.fill();
      const cols = ['#ff5a7a', '#ffb23f', '#ffe14d', '#5ccf6a', '#4fb3ff', '#b37cff'];
      c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.fillStyle = '#fff'; c.fill();
      cols.forEach((col, i) => { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 36, i / 6 * TAU - PI / 2, (i + 1) / 6 * TAU - PI / 2); c.closePath(); c.fillStyle = col; c.fill(); });
      c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fill();
      c.lineWidth = 4; c.strokeStyle = '#8a4ab0'; c.beginPath(); c.arc(0, 0, 37, 0, TAU); c.stroke();
      gloss(c, -14, -18, 9, 5, -0.6, 0.8); face(c, 0, 3, 18, 'happy');
    });
  }
  function sleepyCloudSprite() {   // uykucu bulutçuk: sepete sığmaz, "boing" diye seker
    return spr(120, 90, c => {
      const puffs = [[-30, 8, 24], [-6, -8, 30], [24, -2, 26], [36, 14, 18], [0, 16, 24]];
      c.fillStyle = '#b9b2e6'; for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x, y + 4, r + 3, 0, TAU); c.fill(); }
      c.fillStyle = '#fbfaff'; for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      gloss(c, -14, -18, 10, 5, -0.4, 0.8);
      c.strokeStyle = '#4a3a7a'; c.lineWidth = 3;
      for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 11, 6, 6, 0.15 * PI, 0.85 * PI); c.stroke(); }
      c.fillStyle = 'rgba(255,140,198,0.5)'; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 22, 14, 6, 3.5, 0, 0, TAU); c.fill(); }
      c.fillStyle = '#8a2a5a'; c.beginPath(); c.ellipse(0, 19, 3.5, 4.5, 0, 0, TAU); c.fill();
      txt(c, 'z', 40, -30, 18, '#fff', '#7a6ac0'); txt(c, 'z', 52, -44, 13, '#fff', '#7a6ac0');
    });
  }
  function bilboSprite(open, mood) {   // (eski ad: sepetle ışık yakalayan Pırıl)
    return spr(260, 230, c => { c.translate(0, 4); pirilDraw(c, open, 0.95, mood); });
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
  shell('isikYakala', {
    ad: 'Işık Yakala', color: '#7a6cf0', iconBg: '#2a2a6a', bgCol: '#1d1f5a', dur: 35, stars: [20, 40], ikon: '✨', renk: '#d8d4ff',
    sprites() {
      const S = { candy: [], cols: ['#ff7aa8', '#5fc8ff', '#8ee05a', '#c08aff', '#ffb04a', '#ffe14d'] };
      for (let k = 0; k < 4; k++) S.candy.push(S.cols.map(col => lightSprite(k, col)));
      S.gold = rainbowLightSprite(); S.sock = sleepyCloudSprite();
      S.bilbo = bilboSprite(false); S.bilboOpen = bilboSprite(true); S.basket = basketSprite();
      S.bilboHuh = bilboSprite(false, 'huh'); S.bilboHappy = bilboSprite(true, 'happy');
      S.scoreIcon = S.candy[1][5];
      return S;
    },
    icon(c, S) {
      const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#1d1f5a'); g.addColorStop(1, '#5a3a8a'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      c.fillStyle = '#e8b26a'; c.beginPath(); c.moveTo(-160, 80); c.quadraticCurveTo(-60, 50, 40, 78); c.quadraticCurveTo(110, 60, 160, 72); c.lineTo(160, 110); c.lineTo(-160, 110); c.fill();
      blit(c, S.bilboOpen, 0, 2, 0.55); blit(c, S.basket, 0, 54, 0.55);
      blit(c, S.candy[0][0], -100, -60, 0.8, 0.3); blit(c, S.candy[1][1], 110, -50, 0.75, -0.3); blit(c, S.candy[2][5], -40, -88, 0.6, 0.2);
      blit(c, S.gold, 60, -84, 0.6, -0.2); blit(c, S.candy[3][3], -125, 10, 0.6);
    },
    bg(b, W, H, u) {
      // Kum Saati Çölü, gece: mor-lacivert gök, yıldızlar, gülen ay, kum tepeleri, kum saati kuleleri
      const fy = H * 0.84;
      let g = b.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, '#15174a'); g.addColorStop(0.6, '#3a2f7a'); g.addColorStop(1, '#8a5a9a'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) {
        const x = ((i * 389) % 1000) / 1000 * W, y = ((i * 677) % 1000) / 1000 * fy * 0.75, r = (1 + (i % 3)) * u;
        b.fillStyle = 'rgba(255,255,230,' + (0.45 + (i % 4) * 0.13) + ')'; b.beginPath(); b.arc(x, y, r, 0, TAU); b.fill();
        if (i % 9 === 0) { starPath(b, x, y, 7 * u, 2 * u, 4, 0); b.fill(); }
      }
      // ay
      const mx = W * 0.82, my = H * 0.2, mr = 58 * u;
      g = b.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3); g.addColorStop(0, 'rgba(255,245,200,0.35)'); g.addColorStop(1, 'rgba(255,245,200,0)'); b.fillStyle = g; b.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
      ball(b, mx, my, mr, mr, '#fff3b8', { line: 3 * u, stroke: '#e0c060', gloss: false });
      b.fillStyle = 'rgba(224,192,96,0.35)'; for (const [dx, dy, r] of [[-20, -18, 10], [18, 16, 8], [24, -20, 6]]) { b.beginPath(); b.arc(mx + dx * u, my + dy * u, r * u, 0, TAU); b.fill(); }
      face(b, mx, my + 6 * u, 26 * u, 'happy');
      // uzak tepeler
      const dune = (y0, amp, col, ph) => {
        b.fillStyle = col; b.beginPath(); b.moveTo(0, H);
        for (let x = 0; x <= W + 20; x += 20) b.lineTo(x, y0 + Math.sin(x / W * TAU * 1.3 + ph) * amp + Math.sin(x / W * TAU * 3.1 + ph * 2) * amp * 0.3);
        b.lineTo(W, H); b.closePath(); b.fill();
      };
      dune(H * 0.62, 26 * u, '#6a4a8a', 0.5);
      // kum saati kuleleri (uzakta)
      const glass = (x, y, s) => {
        b.save(); b.translate(x, y); b.scale(s, s);
        b.fillStyle = '#c98a4a'; rr(b, -40, -110, 80, 14, 6); b.fill(); rr(b, -40, 0, 80, 14, 6); b.fill();
        b.fillStyle = 'rgba(220,240,255,0.55)'; b.beginPath(); b.moveTo(-32, -96); b.lineTo(32, -96); b.quadraticCurveTo(30, -60, 4, -48); b.quadraticCurveTo(30, -36, 32, 0); b.lineTo(-32, 0); b.quadraticCurveTo(-30, -36, -4, -48); b.quadraticCurveTo(-30, -60, -32, -96); b.closePath(); b.fill();
        b.fillStyle = '#ffd27a'; b.beginPath(); b.moveTo(-22, -74); b.lineTo(22, -74); b.lineTo(3, -50); b.lineTo(-3, -50); b.fill(); b.beginPath(); b.moveTo(-30, 0); b.quadraticCurveTo(0, -30, 30, 0); b.fill();
        b.fillStyle = '#ffd27a'; b.fillRect(-1.5, -50, 3, 40);
        b.restore();
      };
      glass(W * 0.12, H * 0.62, u * 1.1); glass(W * 0.62, H * 0.6, u * 0.8); glass(W * 0.92, H * 0.66, u * 0.9);
      dune(H * 0.72, 18 * u, '#a8708a', 2.1);
      // ön kum
      g = b.createLinearGradient(0, fy - 30 * u, 0, H); g.addColorStop(0, '#f0b874'); g.addColorStop(1, '#c98a4a');
      b.fillStyle = g; b.beginPath(); b.moveTo(0, H);
      for (let x = 0; x <= W + 20; x += 20) b.lineTo(x, fy - 10 * u + Math.sin(x / W * TAU * 0.8 + 1) * 12 * u);
      b.lineTo(W, H); b.closePath(); b.fill();
      b.strokeStyle = 'rgba(255,240,210,0.45)'; b.lineWidth = 3 * u;
      for (let i = 0; i < 7; i++) { const x = W * (0.08 + i * 0.14), y = fy + (18 + (i % 3) * 22) * u; b.beginPath(); b.moveTo(x - 40 * u, y); b.quadraticCurveTo(x, y - 8 * u, x + 40 * u, y); b.stroke(); }
      // sevimli kaktüsler
      const cac = (x, y, s) => {
        b.save(); b.translate(x, y); b.scale(s, s);
        for (const [cx, cy, w, h] of [[0, -50, 30, 100], [-26, -56, 18, 40], [26, -66, 18, 44]]) { rr(b, cx - w / 2, cy - h / 2, w, h, w / 2); b.fillStyle = '#5cbf6a'; b.fill(); b.lineWidth = 3; b.strokeStyle = '#2e7a3a'; b.stroke(); }
        b.fillStyle = '#5cbf6a'; b.fillRect(-26, -40, 26, 12); b.fillRect(0, -50, 26, 12);
        face(b, 0, -70, 12, 'smile'); b.restore();
      };
      cac(W * 0.04 + 20 * u, fy + 8 * u, u * 0.9); cac(W * 0.96 - 20 * u, fy + 14 * u, u * 0.75);
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
      const half = 128 * st.k; tx = clamp(tx, half, W - half);
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
          if (it.kind === 4 && G.time - st.goldSaid > 12 && R() < 0.6) { st.goldSaid = G.time; say(G, 'mini_isikYakala_3', 2); G.lastCheer = G.time; }
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
              sfx('bounce', { vol: 0.9 }); sfx('hiccup', { vol: 0.5 }); st.open = 0.5; st.sq = 1; puff(G, it.x, it.y, '#ffffff', 50 * u); react(G, 'huh', 1.1);
              if (!st.sockSaid) { st.sockSaid = true; say(G, 'mini_isikYakala_bulut', 2); G.lastCheer = G.time; }
            } else {
              it.on = false;
              const gold = it.kind === 4, n = gold ? 3 : 1;
              addScore(G, n, it.x, st.rimY - 60 * u, gold ? '#ffb000' : G.S.cols[it.col]);
              st.caught += n; st.open = 0.35; st.sq = 1;
              sfx(gold ? 'coin' : 'pop', { vol: 0.9 }); if (R() < 0.35) sfx('sparkle', { vol: 0.4 });
              sparkles(G, it.x, st.rimY - 10 * u, gold ? 6 : 2, gold ? 1.2 : 0.8);
              if (gold) { confetti(G, it.x, st.rimY - 20 * u, 12, 0.7); G.shake = 0.35; }
              good(G, it.x, st.rimY - 80 * u); G_cheer(G);
            }
          } else if (it.y > st.floorY - 18 * u) {   // yere düştü: zıplar, solar
            it.state = 2; it.y = st.floorY - 18 * u; it.vy = -it.vy * 0.28; it.t = 0;
            if (it.kind !== 5) oops(G, true);
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
      const P = moodPose(G), m = G.mood, mon = m.t < m.d;
      const pspr2 = mon && m.k === 'huh' ? S.bilboHuh : mon ? S.bilboHappy : st.open > 0 ? S.bilboOpen : S.bilbo;
      blit(c, pspr2, 0, -205 * k - bob - P.hop * k, k, -st.lean * 0.4 + P.rot, P.sx, P.sy);
      if (st.tw % 3.4 < 0.13 && st.open <= 0 && !mon) {   // göz kırpma
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
      G.buddyAt = { x: bx, y: st.floorY - 260 * k };
      drawQuestion(G, c, bx + 95 * k, st.floorY - 340 * k, k * 1.1);
      // düşen ışıklar
      for (const it of st.items) {
        if (!it.on) continue;
        const a = it.state === 2 ? 1 - it.t / 0.7 : 1;
        if (it.state === 0) { c.fillStyle = 'rgba(90,40,10,0.12)'; c.beginPath(); c.ellipse(it.x, st.floorY + 6 * u, 22 * u * clamp(it.y / st.floorY, 0.2, 1), 6 * u, 0, 0, TAU); c.fill(); }
        if (it.kind === 4) {
          const p = 1 + Math.sin(it.t * 8) * 0.12;
          c.save(); c.globalAlpha = 0.55 * a; blit(c, G.com.spark, it.x, it.y, u * 2.4 * p, it.t * 2); c.restore();
          blit(c, S.gold, it.x, it.y, u * 1.05, it.rot, 1, 1, a);
        } else if (it.kind === 5) blit(c, S.sock, it.x, it.y, u * 0.95, it.rot, 1, 1, a);
        else blit(c, S.candy[it.kind][it.col], it.x, it.y, u * 1.15, it.kind === 3 ? it.rot : it.rot * 0.5, 1, 1, a);
      }
    },
  });

  // ═════════════════════════════════════════ 2) MANTAR MÜZİĞİ (Işıklı Mantar Vadisi) ═════════════════════════════════════════
  const POTS = [   // büyük mantar = kalın ses (pentatonik: Do Re Mi Sol La)
    { col: '#ff5a7a', semi: 0, size: 1.12 }, { col: '#ff9a2e', semi: 2, size: 1.04 }, { col: '#ffd23f', semi: 4, size: 0.97 },
    { col: '#4cc95a', semi: 7, size: 0.9 }, { col: '#4fa8ff', semi: 9, size: 0.84 },
  ];
  const BPM = 76;   // 5 yaş için sakin tempo
  const SONG = [0, 1, 2, -1, 2, 3, 4, -1, 4, 3, 2, 1, 2, -1, 0, -1, 2, 2, 3, -1, 4, 4, 3, -1, 2, 3, 2, 1, 0, -1, -1, -1];
  function potSprite(col, happy) {   // mantar sapı (yüzlü) + çimen öbeği
    return spr(230, 130, c => {
      c.fillStyle = '#3f9a4a'; for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(i * 16 - 7, 62); c.quadraticCurveTo(i * 16 + (i % 2 ? 6 : -6), 30, i * 16 + 2, 24 + Math.abs(i) * 3); c.lineTo(i * 16 + 7, 62); c.fill(); }
      c.beginPath(); c.moveTo(-50, -44); c.quadraticCurveTo(-60, 20, -46, 54); c.quadraticCurveTo(0, 66, 46, 54); c.quadraticCurveTo(60, 20, 50, -44); c.closePath();
      const g = c.createLinearGradient(-56, 0, 56, 0); g.addColorStop(0, '#e8dcc0'); g.addColorStop(0.35, '#fffaf0'); g.addColorStop(1, '#d8c8a8');
      c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = '#a89070'; c.stroke();
      c.fillStyle = rgba(col, 0.25); c.beginPath(); c.ellipse(0, -40, 50, 10, 0, 0, TAU); c.fill();
      c.fillStyle = '#5ab84a'; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 50, 50, 22, 10, d * 0.3, 0, TAU); c.fill(); }
      face(c, 0, 4, 40, happy ? 'happy' : 'smile');
    });
  }
  function lidSprite(col) {   // mantar şapkası: renkli kubbe, beyaz benekler
    return spr(220, 110, c => {
      const g0 = c.createRadialGradient(0, 0, 10, 0, 0, 104); g0.addColorStop(0, rgba(col, 0.35)); g0.addColorStop(1, rgba(col, 0)); c.fillStyle = g0; c.beginPath(); c.arc(0, 0, 104, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-100, 26); c.bezierCurveTo(-100, -50, 100, -50, 100, 26); c.quadraticCurveTo(0, 40, -100, 26); c.closePath();
      const g = c.createLinearGradient(-100, 0, 100, 0); g.addColorStop(0, shade(col, -0.15)); g.addColorStop(0.3, shade(col, 0.4)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, -0.3));
      c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = shade(col, -0.5); c.stroke();
      c.fillStyle = '#fffaf0'; for (const [x, y, r] of [[-56, 4, 12], [-18, -18, 15], [28, -14, 11], [64, 6, 10], [6, 10, 8]]) { c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, TAU); c.fill(); }
      gloss(c, -46, -16, 22, 7, -0.3, 0.5);
      c.fillStyle = shade(col, -0.35); c.beginPath(); c.ellipse(0, 30, 80, 8, 0, 0, PI); c.fill();
    });
  }
  shell('mantarMuzik', {
    ad: 'Mantar Müziği', color: '#4fa8ff', iconBg: '#2a3a6a', bgCol: '#1f3050', dur: 40, stars: [15, 28], ikon: '🍄', renk: '#d6f5e0',
    sprites() {
      const S = { pot: POTS.map(p => potSprite(p.col, false)), potH: POTS.map(p => potSprite(p.col, true)), lid: POTS.map(p => lidSprite(p.col)) };
      S.ring = POTS.map(p => spr(120, 120, c => {   // düşen ışık halkası (nota)
        const g = c.createRadialGradient(0, 0, 20, 0, 0, 56); g.addColorStop(0, rgba(p.col, 0)); g.addColorStop(0.7, rgba(p.col, 0.45)); g.addColorStop(1, rgba(p.col, 0));
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
      const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#1f2a5a'); g.addColorStop(1, '#3a6a6a'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      c.fillStyle = '#2e7a4a'; c.fillRect(-160, 70, 320, 40);
      [[-95, 0], [0, 2], [95, 4]].forEach(([x, i], j) => { blit(c, S.pot[i], x, 66, 0.5); blit(c, S.lid[i], x, 34 - (j === 1 ? 20 : 0), 0.5, j === 1 ? -0.15 : 0); });
      blit(c, S.ring[2], 0, -54, 0.75); blit(c, S.ring[0], -95, -80, 0.55); blit(c, common().notes[3], 70, -60, 0.9, 0.2); blit(c, common().notes[1], 120, -20, 0.7, -0.2);
    },
    bg(b, W, H, u) {
      // Işıklı Mantar Vadisi, alacakaranlık: koyu mavi-yeşil gök, dev parlayan mantarlar, süzülen ışık tozları, yosunlu yer
      const sy = H * 0.66;
      let g = b.createLinearGradient(0, 0, 0, sy); g.addColorStop(0, '#162452'); g.addColorStop(0.7, '#2a4a7a'); g.addColorStop(1, '#3a6a7a'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      for (let i = 0; i < 45; i++) { const x = ((i * 389) % 1000) / 1000 * W, y = ((i * 677) % 1000) / 1000 * sy * 0.6; b.fillStyle = 'rgba(255,255,230,' + (0.35 + (i % 4) * 0.15) + ')'; b.beginPath(); b.arc(x, y, (1 + i % 3) * u, 0, TAU); b.fill(); }
      const giant = (x, y, s, col) => {
        b.save(); b.translate(x, y); b.scale(s, s);
        const gg = b.createRadialGradient(0, -150, 20, 0, -150, 220); gg.addColorStop(0, rgba(col, 0.35)); gg.addColorStop(1, rgba(col, 0)); b.fillStyle = gg; b.fillRect(-220, -370, 440, 440);
        b.fillStyle = '#d8d0e8'; b.beginPath(); b.moveTo(-26, 0); b.quadraticCurveTo(-34, -80, -18, -150); b.lineTo(18, -150); b.quadraticCurveTo(34, -80, 26, 0); b.fill();
        b.beginPath(); b.moveTo(-120, -140); b.bezierCurveTo(-120, -260, 120, -260, 120, -140); b.quadraticCurveTo(0, -120, -120, -140); b.fillStyle = col; b.fill();
        b.fillStyle = 'rgba(255,255,255,0.7)'; for (const [dx, dy, r] of [[-60, -170, 14], [0, -210, 18], [56, -176, 12]]) { b.beginPath(); b.arc(dx, dy, r, 0, TAU); b.fill(); }
        b.restore();
      };
      giant(W * 0.08, sy + 10 * u, u * 1.1, '#b37cff'); giant(W * 0.93, sy + 10 * u, u * 1.25, '#ff7ab8'); giant(W * 0.6, sy - 10 * u, u * 0.6, '#5fe0d0'); giant(W * 0.32, sy - 10 * u, u * 0.5, '#ffd23f');
      // uzak tepe
      b.fillStyle = '#2a5a5a'; b.beginPath(); b.moveTo(0, sy); for (let x = 0; x <= W + 20; x += 20) b.lineTo(x, sy - 30 * u + Math.sin(x / W * TAU * 1.5) * 16 * u); b.lineTo(W, sy); b.fill();
      // yosunlu yer
      g = b.createLinearGradient(0, sy, 0, H); g.addColorStop(0, '#3f9a5a'); g.addColorStop(1, '#246a3e'); b.fillStyle = g; b.fillRect(0, sy, W, H - sy);
      b.fillStyle = 'rgba(255,255,255,0.12)'; b.fillRect(0, sy, W, 5 * u);
      // yerde minik parlayan mantarlar
      for (let i = 0; i < 16; i++) {
        const x = ((i * 433) % 1000) / 1000 * W, y = sy + (20 + (i * 97) % 140) * u, col = CONF[i % 8];
        if (y > H * 0.86) continue;
        b.fillStyle = '#efe6d0'; rr(b, x - 4 * u, y - 14 * u, 8 * u, 16 * u, 4 * u); b.fill();
        b.fillStyle = col; b.beginPath(); b.ellipse(x, y - 14 * u, 13 * u, 9 * u, 0, PI, TAU); b.fill();
        const gg = b.createRadialGradient(x, y - 16 * u, 2, x, y - 16 * u, 30 * u); gg.addColorStop(0, rgba(col, 0.35)); gg.addColorStop(1, rgba(col, 0)); b.fillStyle = gg; b.fillRect(x - 30 * u, y - 46 * u, 60 * u, 60 * u);
      }
      // önde taş yol (mantarların durduğu yer)
      b.fillStyle = 'rgba(20,60,30,0.35)'; b.fillRect(0, H - 60 * u, W, 60 * u);
      for (let i = 0; i < 14; i++) { const x = W * (i + 0.5) / 14; ball(b, x, H - 28 * u, 30 * u, 13 * u, '#9ab0a8', { line: 2 * u, stroke: '#5a7068', gloss: false }); }
    },
    layout(G) {
      const W = G.W, H = G.H, u = G.u, st = G.st;
      st.k = Math.min(u * 0.95, W * 0.155 / 200);
      st.lanes = POTS.map((p, i) => ({ x: W * (0.235 + i * 0.165), y: H * 0.74 + (i % 2 ? -8 : 8) * u, k: st.k * p.size }));
      st.buddy = { x: G.safe.l + Math.max(W * 0.09, 70 * u), y: H * 0.74 - 20 * u, k: Math.min(u * 0.42, W * 0.12 / 230) };   // şef Pırıl
      st.top = G.hudBottom + 30 * u;
    },
    onPlay(G) { G.st.song0 = G.time; },
    onStreak(G) { G.st.wave = [0.05, 0.17, 0.29, 0.41, 0.53]; },
    update(G, dt, live) {
      const st = G.st;
      if (!st.rings) { st.rings = []; for (let i = 0; i < 24; i++) st.rings.push({ on: false }); st.jump = [0, 0, 0, 0, 0]; st.glow = [0, 0, 0, 0, 0]; st.next = 0; st.beat = -1; st.travel = 3 * 60 / BPM; }
      for (let i = 0; i < 5; i++) { st.jump[i] = Math.max(0, st.jump[i] - dt * 2.6); st.glow[i] = Math.max(0, st.glow[i] - dt * 2); }
      if (st.wave) for (let i = 0; i < 5; i++) if (st.wave[i] > 0) {   // mantar dalgası (seri ödülü)
        st.wave[i] -= dt;
        if (st.wave[i] <= 0) { st.jump[i] = 1; sfx('bell', { pitch: semi(POTS[i].semi + 12), vol: 0.4 }); }
      }
      if (!live) return;
      const spb = 60 / BPM, lead = st.travel, t = G.time - lead;   // şarkı zamanı (ilk nota halka yolunu bitirince)
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
        if (t > r.nt + 0.6) { r.miss = true; r.ft = 0; sfx('bubblePop', { vol: 0.25 }); oops(G, true); }
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
        notesBurst(G, L.x, lidY - 20 * G.u, bdt < 0.18 ? 2 : 1);
        puff(G, L.x, lidY, bdt < 0.18 ? POTS[li].col : '#fff', 80 * L.k);
        good(G); G_cheer(G);
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
        const beatP = playing ? 1 + Math.max(0, Math.cos((G.time / (60 / BPM)) * TAU)) * 0.05 : 1;
        c.lineWidth = 6 * u; c.strokeStyle = rgba(col, 0.75); c.beginPath(); c.arc(L.x, lidY - 4 * u, 46 * L.k * beatP, 0, TAU); c.stroke();
        c.lineWidth = 3 * u; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(L.x, lidY - 4 * u, 52 * L.k * beatP, 0, TAU); c.stroke();
      });
      if (st.buddy) drawBuddy(G, c, st.buddy.x, st.buddy.y, st.buddy.k);
      // mantarlar
      st.lanes.forEach((L, i) => {
        const j = st.jump ? st.jump[i] : 0, hop = Math.sin(j * PI) * 46 * u * Math.min(1, j * 1.6), sq = Math.sin(j * PI * 2) * 0.08 * j;
        c.fillStyle = 'rgba(80,60,30,0.22)'; c.beginPath(); c.ellipse(L.x, L.y + 52 * L.k, 96 * L.k, 16 * L.k, 0, 0, TAU); c.fill();
        blit(c, j > 0.15 ? S.potH[i] : S.pot[i], L.x, L.y, L.k, 0, 1 + sq, 1 - sq);
        blit(c, S.lid[i], L.x, L.y - 58 * L.k - hop, L.k, j * Math.sin(j * 20) * 0.25);
        if (st.glow && st.glow[i] > 0) { c.save(); c.globalAlpha = st.glow[i] * 0.4; blit(c, G.com.spark, L.x, L.y - 70 * L.k - hop, L.k * 2 * (1.4 - st.glow[i] * 0.4)); c.restore(); }
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

  // ═════════════════════════════════════════ 3) BULUT TOPLA (Gökkuşağı Adaları) ═════════════════════════════════════════
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
  // Pırıl uçuyor, Feza sırtında (Feza'nın üst gövdesi Pırıl'ın başının arkasından görünür)
  function pirilRideSprite() {
    const fz = fezaSprite();
    return spr(200, 250, c => {
      c.save(); c.beginPath(); c.rect(-100, -125, 200, 125); c.clip();
      c.drawImage(fz.cv, -46, -87, 104, 120); c.restore();   // Feza (bel altı Pırıl'ın başının arkasında kalır)
      c.save(); c.translate(0, 40); pirilDraw(c, true, 0.62); c.restore();
    });
  }
  function scoopSprite(col, col2) {   // zıp zıp top (çarpınca seker)
    return spr(120, 120, c => {
      ball(c, 0, 0, 46, 46, col, { line: 4, stroke: shade(col, -0.45), gloss: false });
      c.save(); c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.clip();
      c.fillStyle = col2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 50, i * TAU / 3, i * TAU / 3 + PI / 3); c.closePath(); c.fill(); }
      c.restore();
      c.beginPath(); c.arc(0, 0, 46, 0, TAU); c.lineWidth = 4; c.strokeStyle = shade(col, -0.45); c.stroke();
      ball(c, 0, 4, 22, 18, '#fffaf0', { line: 2.5, stroke: '#c0b0a0', gloss: false }); face(c, 0, 4, 14, 'smile');
      gloss(c, -20, -24, 12, 6, -0.6, 0.85);
    });
  }
  function sheepSprite(rainbow) {   // bulut koyunu: pofuduk bulut gövde, lila yüz, minik bacaklar
    return spr(130, 120, c => {
      c.fillStyle = '#8a7ab0'; for (const x of [-22, -8, 10, 24]) { rr(c, x - 5, 18, 10, 26, 5); c.fill(); }
      const puffs = [[-34, 4, 22], [-14, -12, 26], [12, -14, 26], [34, 0, 22], [-20, 16, 22], [16, 16, 22], [0, 2, 26]];
      const cols = ['#ff9ab8', '#ffc870', '#fff07a', '#9ae0a0', '#9ad0ff', '#c8a8ff', '#ffffff'];
      c.fillStyle = '#c8c0e8'; for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x, y + 3, r + 3, 0, TAU); c.fill(); }
      puffs.forEach(([x, y, r], i) => { c.fillStyle = rainbow ? cols[i] : '#ffffff'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
      gloss(c, -16, -22, 12, 6, -0.4, 0.8);
      // baş
      for (const d of [-1, 1]) ball(c, -44 + d * 14, -18, 9, 5, '#a898d0', { line: 2, stroke: '#6a5a90', gloss: false, rot: d * 0.5 });
      ball(c, -44, -4, 20, 22, '#b8a8e0', { line: 3, stroke: '#6a5a90', gloss: false });
      c.fillStyle = '#fff'; for (const [x, y, r] of [[-52, -22, 8], [-40, -26, 9], [-30, -20, 7]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      face(c, -44, -2, 14, 'smile');
    });
  }
  shell('bulutTopla', {
    ad: 'Bulut Topla', color: '#5ab8f0', iconBg: '#cfeaff', bgCol: '#bfe6ff', dur: 40, stars: [14, 26], ikon: '☁️', renk: '#e2f0ff',
    sprites() {
      const S = { feza: pirilRideSprite(), scoops: [['#ff7a9a', '#ffd0dc'], ['#5fc8ff', '#d8f2ff'], ['#ffd23f', '#fff4c0'], ['#8ee05a', '#e0fac8']].map(([a, b2]) => scoopSprite(a, b2)) };
      S.star = sheepSprite(false);
      S.big = sheepSprite(true);
      S.scoreIcon = S.star;
      return S;
    },
    icon(c, S) {
      const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#8fd0ff'); g.addColorStop(1, '#ffe0f0'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      ['#ff7a9a', '#ffb04a', '#ffe14d', '#7bd65a', '#4fb3ff', '#b37cff'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 8; c.beginPath(); c.arc(0, 130, 190 - i * 8, PI * 1.12, PI * 1.88); c.stroke(); });
      blit(c, S.scoops[0], -120, 70, 0.55); blit(c, S.star, 110, -60, 0.75, 0.1); blit(c, S.big, -110, -55, 0.7, -0.1); blit(c, S.star, 120, 60, 0.6);
      blit(c, S.feza, 0, 10, 0.95, -0.1);
    },
    bg(b, W, H, u, G) {
      // Gökkuşağı Adaları: pastel gök, kocaman gökkuşağı, uçan adacıklar, pofuduk bulutlar
      let g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7cc8ff'); g.addColorStop(0.6, '#cdeeff'); g.addColorStop(1, '#ffe2f0'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      const rx = W * 0.5, ry = H * 1.1, R1 = Math.max(W, H) * 0.62;
      b.globalAlpha = 0.5;
      ['#ff7a9a', '#ffb04a', '#ffe14d', '#7bd65a', '#4fb3ff', '#b37cff'].forEach((col, i) => { b.strokeStyle = col; b.lineWidth = 26 * u; b.beginPath(); b.arc(rx, ry, R1 - i * 26 * u, PI, TAU); b.stroke(); });
      b.globalAlpha = 1;
      const cloud = (x, y, s, a) => {
        b.globalAlpha = a; b.fillStyle = '#ffffff';
        for (const [dx, dy, r] of [[-60, 10, 40], [-15, -8, 52], [45, 4, 44], [0, 22, 42]]) { b.beginPath(); b.arc(x + dx * s, y + dy * s, r * s, 0, TAU); b.fill(); }
        b.globalAlpha = 1;
      };
      cloud(W * 0.15, H * 0.3, u, 0.7); cloud(W * 0.8, H * 0.22, u * 0.8, 0.7); cloud(W * 0.55, H * 0.82, u * 0.9, 0.6); cloud(W * 0.3, H * 0.65, u * 0.6, 0.5);
      const isle = (x, y, s) => {
        b.save(); b.translate(x, y); b.scale(s, s);
        b.fillStyle = '#c98a5a'; b.beginPath(); b.moveTo(-80, 0); b.quadraticCurveTo(-40, 90, 0, 110); b.quadraticCurveTo(40, 90, 80, 0); b.fill();
        ball(b, 0, 0, 86, 22, '#7bd65a', { line: 4, stroke: '#3a8a3a', gloss: false });
        ['#ff7a9a', '#ffe14d', '#4fb3ff'].forEach((col, i) => { b.strokeStyle = col; b.lineWidth = 8; b.beginPath(); b.arc(10, -6, 46 - i * 8, PI, TAU); b.stroke(); });
        b.restore();
      };
      isle(G.safe.l + 40 * u, H * 0.88, u * 0.8); isle(W - G.safe.r - 50 * u, H * 0.5, u * 0.65); isle(W * 0.42, H * 0.97, u * 0.5);
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
    onStreak(G) { G.st.spin = 0.001; sfx('whoosh', { vol: 0.6, pitch: 1.2 }); },   // seri ödülü: Pırıl havada takla atar
    update(G, dt, live) {
      const st = G.st, u = G.u, R0 = st.R;
      if (!st.stars) {
        st.stars = []; for (let i = 0; i < 6; i++) st.stars.push({ on: false }); st.vx = 0; st.vy = 0; st.trail = []; for (let i = 0; i < 26; i++) st.trail.push({ x: st.x, y: st.y });
        st.ti = 0; st.trT = 0; st.bigT = 9; st.tw = 0; st.face = 1; st.spT = 0;
      }
      st.tw += dt; if (st.spin) { st.spin += dt / 0.9; if (st.spin >= 1) st.spin = 0; } st.dizzy = Math.max(0, (st.dizzy || 0) - dt);
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
          if (b.j < 0.5) { sfx('bounce', { vol: 0.9, pitch: rnd(0.9, 1.25) }); hearts(G, b.x, b.y - 40 * u, 1); st.dizzy = 0.9; if (R() < 0.3 && G.time - G.lastCheer > 8) { G.lastCheer = G.time; say(G, 'mini_bulutTopla_2', 2); } }
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
          sfx(s.big ? 'levelup' : 'coin', { vol: s.big ? 0.6 : 0.9 }); if (s.big) { sfx('star'); confetti(G, s.x, s.y, 12, 0.7); G.shake = 0.3; }
          else sfx('chirp', { vol: 0.35, pitch: rnd(0.8, 1.1) });   // koyuncuk "mee" der gibi
          sparkles(G, s.x, s.y, s.big ? 6 : 3, 1); good(G, st.x, st.y - 60 * u); G_cheer(G);
        }
      }
      st.starT -= dt; st.bigT -= dt;
      if (alive < 3 && st.starT <= 0) { spawnStar(G, false); st.starT = 0.35; }
      if (st.bigT <= 0) { st.bigT = rnd(9, 12); spawnStar(G, true); if (G.time > 6 && G.time - G.lastCheer > 8) { G.lastCheer = G.time; say(G, 'mini_bulutTopla_3', 2); } }
    },
    draw(G, c) {
      const st = G.st, S = G.S, u = G.u;
      if (!st.stars) return;
      // iz
      const n = st.trail.length;
      c.lineWidth = 7 * u;   // gökkuşağı izi
      ['#ff7a9a', '#ffe14d', '#4fb3ff'].forEach((col, j) => {
        c.strokeStyle = col; c.beginPath();
        for (let i = 0; i < n; i++) { const p = st.trail[(st.ti + 1 + i) % n]; c.lineTo(p.x + (j - 1) * 7 * u, p.y - 20 * u); }
        c.globalAlpha = 0.55; c.stroke(); c.globalAlpha = 1;
      });
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
        blit(c, s.big ? S.big : S.star, s.x, s.y - Math.abs(Math.sin(s.t * 3)) * 6 * u, u * (s.big ? 1.1 : 0.95) * k, Math.sin(s.t * 2) * 0.2, 1, 1, blink);
      }
      const sp = Math.hypot(st.vx, st.vy), lean = clamp(st.vx / (900 * u), -0.3, 0.3);
      c.fillStyle = 'rgba(40,100,150,0.16)'; c.beginPath(); c.ellipse(st.x, st.y + 80 * u, 44 * u, 11 * u, 0, 0, TAU); c.fill();
      const bob = Math.sin(st.tw * 8) * Math.min(1, sp / (300 * u)) * 3 * u;
      const flap = Math.sin(st.tw * 9) * 0.04;
      const spinA = st.spin ? outCubic(st.spin) * TAU : 0, dz = st.dizzy > 0 ? Math.sin(st.dizzy * 30) * 0.12 * st.dizzy : 0;
      blit(c, S.feza, st.x, st.y - 30 * u + bob - Math.sin(st.tw * 3) * 6 * u - Math.sin((st.spin || 0) * PI) * 50 * u, st.k * 0.9, lean + spinA + dz, st.face * (1 + flap), 1 - flap);
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

  // ═════════════════════════════════════════ 4) KABARCIK PATLAT (Mercan Denizi Bahçesi) ═════════════════════════════════════════
  const BCOL = { kirmizi: '#ff4d5e', mavi: '#3d8bff', sari: '#ffd23f', yesil: '#4cc95a', mor: '#9b5cf0', turuncu: '#ff8a2a', pembe: '#ff79c6' };
  function balloonSprite(col) {   // renkli kabarcık (yüzlü, yarı saydam); merkez (0,-34) — dokunma alanı balonla aynı
    return spr(130, 220, c => {
      const cy = -34, r = 58;
      const g = c.createRadialGradient(-18, cy - 22, 4, 0, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, rgba(shade(col, 0.45), 0.55)); g.addColorStop(0.85, rgba(col, 0.75)); g.addColorStop(1, rgba(shade(col, -0.2), 0.95));
      c.fillStyle = g; c.beginPath(); c.arc(0, cy, r, 0, TAU); c.fill();
      c.lineWidth = 5; c.strokeStyle = shade(col, -0.25); c.stroke();
      c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(0, cy, r - 6, 0.2 * PI, 0.75 * PI); c.stroke();
      gloss(c, -22, cy - 28, 16, 9, -0.6, 0.9); gloss(c, 26, cy + 26, 6, 4, -0.6, 0.6); gloss(c, -6, cy - 44, 5, 4, 0, 0.8);
      face(c, 0, cy + 6, 28, 'smile');
      c.fillStyle = 'rgba(255,255,255,0.75)'; for (const [x, y, rr2] of [[30, 50, 8], [18, 78, 5], [34, 98, 3.5]]) { c.beginPath(); c.arc(x, y, rr2, 0, TAU); c.fill(); }
    });
  }
  function fishSprite(col) {   // arka plandaki sevimli balık
    return spr(110, 70, c => {
      c.beginPath(); c.moveTo(30, 0); c.lineTo(52, -20); c.lineTo(50, 20); c.closePath(); c.fillStyle = shade(col, -0.1); c.fill(); c.lineWidth = 3; c.strokeStyle = shade(col, -0.45); c.stroke();
      ball(c, -6, 0, 40, 26, col, { line: 3, stroke: shade(col, -0.45) });
      c.fillStyle = '#2a140a'; c.beginPath(); c.arc(-24, -5, 5.5, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-26, -7, 2, 0, TAU); c.fill();
      c.strokeStyle = '#3a1a0e'; c.lineWidth = 2.5; c.beginPath(); c.arc(-36, 6, 5, 0.1 * PI, 0.8 * PI); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3; for (const x of [0, 12]) { c.beginPath(); c.arc(x, 0, 16, -0.9, 0.9); c.stroke(); }
    });
  }
  shell('kabarcikPatlat', {
    ad: 'Kabarcık Patlat', color: '#3db8d8', iconBg: '#4ac0e0', bgCol: '#1a7ab0', dur: 40, stars: [10, 20], ikon: '🫧', renk: '#cdeefc',
    sprites() {
      const S = { b: {} }; for (const k in BCOL) S.b[k] = balloonSprite(BCOL[k]);
      S.scoreIcon = spr(90, 100, c => c.drawImage(S.b.mavi.cv, -45, -36, 90, 152));
      S.fish = ['#ffb04a', '#ff7ab8', '#ffe14d'].map(fishSprite);
      return S;
    },
    icon(c, S) {
      const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#5fd0f0'); g.addColorStop(1, '#1a6aa0'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      c.fillStyle = '#f0d8a0'; c.beginPath(); c.ellipse(0, 120, 220, 40, 0, 0, TAU); c.fill();
      for (const [x, col] of [[-130, '#ff7a9a'], [130, '#ffb04a']]) { c.strokeStyle = col; c.lineWidth = 12; c.beginPath(); c.moveTo(x, 110); c.quadraticCurveTo(x - 10, 60, x + 8, 30); c.moveTo(x, 80); c.lineTo(x + 24, 50); c.stroke(); }
      blit(c, S.fish[0], 100, -70, 0.6);
      blit(c, S.b.mavi, -95, 20, 0.75, -0.15); blit(c, S.b.sari, 95, 30, 0.7, 0.15); blit(c, S.b.yesil, 40, 60, 0.55, 0.1); blit(c, S.b.pembe, -5, 5, 0.95);
    },
    bg(b, W, H, u) {
      // Mercan Denizi Bahçesi: turkuaz su, ışık huzmeleri, kum, mercanlar, deniz otu, uzakta balıklar
      let g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5fd4f2'); g.addColorStop(0.55, '#2a9ad0'); g.addColorStop(1, '#1a6aa8'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      b.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 4; i++) { const x = W * (0.12 + i * 0.25); b.beginPath(); b.moveTo(x, 0); b.lineTo(x + 70 * u, 0); b.lineTo(x + 220 * u, H); b.lineTo(x + 90 * u, H); b.closePath(); b.fill(); }
      // su yüzeyi dalgası
      b.fillStyle = 'rgba(255,255,255,0.35)'; b.beginPath(); b.moveTo(0, 0); for (let x = 0; x <= W + 20; x += 20) b.lineTo(x, 14 * u + Math.sin(x / (60 * u)) * 6 * u); b.lineTo(W, 0); b.fill();
      // kum
      const sy = H * 0.86;
      g = b.createLinearGradient(0, sy, 0, H); g.addColorStop(0, '#f6dea6'); g.addColorStop(1, '#d8b878'); b.fillStyle = g;
      b.beginPath(); b.moveTo(0, H); for (let x = 0; x <= W + 20; x += 20) b.lineTo(x, sy + Math.sin(x / W * TAU * 1.2) * 10 * u); b.lineTo(W, H); b.fill();
      // deniz otu
      const weed = (x, h, col) => { b.strokeStyle = col; b.lineWidth = 12 * u; b.beginPath(); b.moveTo(x, sy + 10 * u); for (let y = 0; y < h; y += 10 * u) b.lineTo(x + Math.sin(y / (30 * u)) * 14 * u, sy - y); b.stroke(); };
      b.globalAlpha = 0.75;
      weed(W * 0.03 + 10 * u, H * 0.45, '#3aa86a'); weed(W * 0.07 + 10 * u, H * 0.32, '#5cc07a'); weed(W * 0.95, H * 0.4, '#3aa86a'); weed(W * 0.91, H * 0.26, '#5cc07a'); weed(W * 0.5, H * 0.16, '#3aa86a');
      // mercanlar
      const coral = (x, s, col) => {
        b.save(); b.translate(x, sy + 6 * u); b.scale(s, s); b.strokeStyle = col; b.lineCap = 'round';
        const br = (x0, y0, a, len, w, d) => { if (d > 3) return; const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; b.lineWidth = w; b.beginPath(); b.moveTo(x0, y0); b.lineTo(x1, y1); b.stroke(); br(x1, y1, a - 0.5, len * 0.72, w * 0.75, d + 1); br(x1, y1, a + 0.45, len * 0.7, w * 0.75, d + 1); };
        br(0, 0, -PI / 2, 60, 18, 0);
        b.fillStyle = shade(col, 0.4); for (let i = 0; i < 6; i++) { b.beginPath(); b.arc(((i * 37) % 80) - 40, -60 - (i * 23) % 60, 5, 0, TAU); b.fill(); }
        b.restore();
      };
      coral(W * 0.16, u * 1.1, '#ff7a9a'); coral(W * 0.82, u * 1.2, '#ffb04a'); coral(W * 0.36, u * 0.7, '#c08aff'); coral(W * 0.66, u * 0.8, '#ff6a6a');
      b.globalAlpha = 1;
      // istiridye + deniz yıldızı
      ball(b, W * 0.27, sy + 30 * u, 30 * u, 16 * u, '#e8c8ff', { line: 3 * u, stroke: '#9a7ac0' });
      star(b, W * 0.74, sy + 34 * u, 24 * u, '#ff9a5a', { face: 'smile' });
      // uzak balıklar
      b.globalAlpha = 0.5;
      for (const [fx, fy, k, col] of [[0.25, 0.3, 0.7, '#ffb04a'], [0.7, 0.5, 0.55, '#ff7ab8'], [0.45, 0.7, 0.5, '#ffe14d']]) {
        b.save(); b.translate(W * fx, H * fy); b.scale(k * u, k * u); b.fillStyle = col;
        b.beginPath(); b.ellipse(0, 0, 40, 24, 0, 0, TAU); b.fill(); b.beginPath(); b.moveTo(34, 0); b.lineTo(58, -18); b.lineTo(58, 18); b.fill(); b.restore();
      }
      b.globalAlpha = 1;
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
        if (b.wob) { b.wob = Math.max(0, b.wob - dt * 1.6); b.x += (b.vx || 0) * b.wob * dt; }
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
      if (b.c === st.target) {
        b.pop = true; b.pt = 0;
        sfx('bubblePop', { vol: 1 }); sfx('pop', { vol: 0.5 }); addScore(G, 1, b.x, cy - 40 * u, col);
        confetti(G, b.x, cy, 8, 0.6); puff(G, b.x, cy, col, 90 * k);
        G.shake = Math.max(G.shake, 0.2); good(G); G_cheer(G);
      } else {   // yanlış renk: patlamaz, "boing" diye seker ve yana kayar; Pırıl "hıh?"
        b.wob = 1; b.vx = (x < b.x ? 1 : -1) * 160 * u;
        sfx('bounce', { vol: 0.5, pitch: 1.5 }); oops(G);
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
        const w = b.wob ? Math.sin(b.wob * 26) * 0.14 * b.wob : 0;
        blit(c, S.b[b.c], b.x, b.y, k, rot, 1 + w, 1 - w);
      }
      // hedef renk rozeti
      if (G.phase === 'play' || G.phase === 'count') {
        const x = Math.max(G.W / 2, (G.hudR || 0) + 168 * u), y = G.hudY + 26 * u, r = 66 * u, p = 1 + Math.sin(G.time * 4) * 0.04 + st.sw * 0.12 * Math.sin(G.pt * 30);
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
  function drawHalaMini(G, c, x, y, k, caption) {
    const talking = (G.cap || G.talkT > 0) && Math.sin(G.pt * 18) > -0.2;
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 64 * k * 1.25, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.arc(x, y, 60 * k * 1.25, 0, TAU); c.clip();
    c.fillStyle = '#ffe2c8'; c.fillRect(x - 80 * k * 1.25, y - 80 * k * 1.25, 160 * k * 1.25, 160 * k * 1.25);
    const P = moodPose(G);
    blit(c, moodSprite(G, talking), x, y + 30 * k - P.hop * k * 0.8, k * 0.95, P.rot, P.sx, P.sy);
    c.restore();
    c.lineWidth = 6 * k; c.strokeStyle = '#ff6b57'; c.beginPath(); c.arc(x, y, 62 * k * 1.25, 0, TAU); c.stroke();
    if (caption) return;
    G.buddyAt = { x, y };
    drawQuestion(G, c, x + 62 * k, y + 70 * k, Math.max(0.7, k * 1.6));
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
    b.on = true; b.pop = false; b.wob = 0; b.vx = 0; b.t = 0; b.x = x; b.y = y; b.s = rnd(0.85, 1.1);
    b.c = R() < tShare ? st.target : pick(st.cols.filter(k => k !== st.target));
    b.vy = rnd(85, 130) * u; b.f = rnd(1, 1.8); b.ph = rnd(0, TAU);
  }
  function newTarget(G, first) {
    const st = G.st;
    if (!first) st.target = pick(st.cols.filter(k => k !== st.target));
    st.tT = 0; say(G, 'mini_kabarcik_' + st.target, 3); sfx('chirp', { vol: 0.6 });
    G.lastCheer = Math.max(G.lastCheer, G.time - 4);
  }

  // ═════════════════════════════════════════ 5) EJDERHA YUMURTASI SÜSLE (Saat Kulesi Oyuncak Atölyesi) ═════════════════════════════════════════
  const TOPS = ['nokta', 'serit', 'yildiz', 'kalp', 'ay'];
  const CUPC = [['#bfe8ff', '#7ab8e8'], ['#ffd6ea', '#e890b8'], ['#d8f5c0', '#8ac870'], ['#fff0b8', '#e0b850']];
  function eggPath(c) {
    c.beginPath(); c.moveTo(0, -125); c.bezierCurveTo(52, -125, 80, -40, 80, 10); c.bezierCurveTo(80, 55, 44, 78, 0, 78);
    c.bezierCurveTo(-44, 78, -80, 55, -80, 10); c.bezierCurveTo(-80, -40, -52, -125, 0, -125); c.closePath();
  }
  function topSprite(id) {   // tepsideki süs simgesi
    return spr(110, 120, c => {
      if (id === 'nokta') {
        ball(c, 0, 4, 46, 46, '#fffaf0', { line: 3, stroke: '#d8c8b8', gloss: false });
        [[-20, -14, '#ff5a7a'], [16, -18, '#4fb3ff'], [0, 10, '#ffd23f'], [-22, 22, '#7bd65a'], [22, 22, '#b37cff']].forEach(([x, y, col]) => ball(c, x, y + 4, 10, 10, col, { line: 2 }));
      } else if (id === 'serit') {
        rr(c, -48, -16, 96, 40, 12); c.fillStyle = '#ff8a2a'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#b8540a'; c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo(-44 + i * 11, i % 2 ? -6 : 14); c.stroke();
      } else if (id === 'yildiz') {
        star(c, 0, 4, 40, '#ffd23f', { stroke: '#c98100', face: 'smile' });
      } else if (id === 'kalp') {
        heartPath(c, 0, 14, 40); c.fillStyle = fillGrad(c, '#ff5a8a', 0, -26, 0, 40); c.fill(); c.lineWidth = 3.5; c.strokeStyle = '#c42a5a'; c.stroke();
        gloss(c, -14, -4, 8, 5, -0.6, 0.7); face(c, 0, 6, 18, 'smile');
      } else {   // hilal ay
        c.save(); c.beginPath(); c.arc(0, 4, 42, 0, TAU);
        c.fillStyle = fillGrad(c, '#9ab8ff', 0, -40, 0, 46, -0.15, 0.45); c.fill(); c.lineWidth = 3.5; c.strokeStyle = '#4a5ab0'; c.stroke();
        c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(20, -8, 36, 0, TAU); c.fill();   // hilal: içini oy
        c.globalCompositeOperation = 'source-over'; c.beginPath(); c.arc(0, 4, 43.5, 0, TAU); c.clip();
        c.beginPath(); c.arc(20, -8, 36, 0, TAU); c.stroke(); c.restore();
        c.fillStyle = '#2a140a'; c.beginPath(); c.arc(-24, 2, 3.5, 0, TAU); c.fill();
        c.strokeStyle = '#3a1a0e'; c.lineWidth = 2.5; c.beginPath(); c.arc(-20, 14, 6, 0.2 * PI, 0.9 * PI); c.stroke();
      }
    });
  }
  function eggOverlay(id) {   // yumurtanın üstüne yapışan desen (yumurta biçimine kırpılmış)
    return spr(230, 260, c => {
      c.save(); eggPath(c); c.clip();
      if (id === 'nokta') {
        let i = 0;
        for (let y = -108, row = 0; y < 76; y += 30, row++) for (let x = -84 + (row % 2) * 17; x < 90; x += 34) { ball(c, x + ((i * 7) % 9) - 4, y + ((i * 5) % 7) - 3, 7.5, 7.5, CONF[i % 8], { line: 2 }); i++; }
      } else {
        c.fillStyle = '#ff8a2a'; c.fillRect(-90, -34, 180, 34); c.fillStyle = '#ffd23f'; c.fillRect(-90, -30, 180, 4); c.fillRect(-90, -8, 180, 4);
        c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); for (let i = 0; i <= 18; i++) c.lineTo(-90 + i * 10, i % 2 ? -26 : -10); c.stroke();
        c.strokeStyle = 'rgba(140,60,0,0.4)'; c.lineWidth = 2; c.strokeRect(-92, -34, 184, 34);
      }
      c.restore();
    });
  }
  function cupSprite(cw, fr, happy) {   // ejderha yumurtası (yüzlü, benekli)
    return spr(230, 260, c => {
      eggPath(c); const g = c.createRadialGradient(-26, -60, 8, 0, -10, 140); g.addColorStop(0, shade(cw, 0.7)); g.addColorStop(0.6, cw); g.addColorStop(1, shade(cw, -0.2));
      c.fillStyle = g; c.fill(); c.lineWidth = 4.5; c.strokeStyle = shade(fr, -0.35); c.stroke();
      c.save(); eggPath(c); c.clip(); c.fillStyle = rgba(fr, 0.45);
      for (const [x, y, r] of [[-50, -50, 12], [44, -70, 9], [56, 20, 13], [-58, 36, 10], [20, -104, 7]]) { c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0.4, 0, TAU); c.fill(); }
      c.restore();
      gloss(c, -34, -80, 14, 26, 0.35, 0.55);
      face(c, 0, 32, 30, happy ? 'happy' : 'smile');
    });
  }
  function nestSprite() {   // saman yuva (yumurtanın önünde)
    return spr(260, 90, c => {
      c.beginPath(); c.moveTo(-110, -14); c.quadraticCurveTo(0, 6, 110, -14); c.quadraticCurveTo(104, 34, 60, 40); c.lineTo(-60, 40); c.quadraticCurveTo(-104, 34, -110, -14); c.closePath();
      c.fillStyle = fillGrad(c, '#d8a058', 0, -14, 0, 40, -0.2, 0.15); c.fill(); c.lineWidth = 4; c.strokeStyle = '#8a5a20'; c.stroke();
      c.strokeStyle = 'rgba(255,230,170,0.7)'; c.lineWidth = 3;
      for (let i = 0; i < 16; i++) { const x = -100 + i * 13; c.beginPath(); c.moveTo(x, -8 + (i % 3) * 8); c.quadraticCurveTo(x + 12, 2 + (i % 2) * 14, x + 26, -4 + (i % 4) * 7); c.stroke(); }
      c.strokeStyle = 'rgba(120,70,20,0.45)'; c.lineWidth = 2.5; for (let i = 0; i < 10; i++) { c.beginPath(); c.moveTo(-90 + i * 19, 4); c.lineTo(-80 + i * 19, 30); c.stroke(); }
    });
  }
  shell('yumurtaSusle', {
    ad: 'Yumurta Süsle', color: '#ff8fb8', iconBg: '#ffe9d0', bgCol: '#f6dcc0', dur: 45, stars: [3, 6], ikon: '🥚', renk: '#ffe6f0',
    sprites() {
      const S = { top: {}, cup: CUPC.map(([a, b]) => cupSprite(a, b)), ov: { nokta: eggOverlay('nokta'), serit: eggOverlay('serit') }, nest: nestSprite() };
      for (const id of TOPS) S.top[id] = topSprite(id);
      S.cupHappy = CUPC.map(([a, b]) => cupSprite(a, b, true));
      S.scoreIcon = spr(120, 130, c => { c.drawImage(S.cup[1].cv, -50, -60, 100, 113); c.drawImage(S.top.yildiz.cv, -6, -50, 40, 44); });
      return S;
    },
    icon(c, S) {
      const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#ffeedd'); g.addColorStop(1, '#f0c8a0'); c.fillStyle = g; c.fillRect(-160, -110, 320, 220);
      blit(c, S.cup[0], 0, 0, 0.75); blit(c, S.ov.serit, 0, 0, 0.75); blit(c, S.top.yildiz, -22, -52, 0.5); blit(c, S.top.kalp, 26, -28, 0.42); blit(c, S.nest, 0, 72, 0.75);
      blit(c, S.top.ay, -115, -50, 0.65, -0.3); blit(c, S.top.kalp, 118, -45, 0.6, 0.25); blit(c, S.top.nokta, -115, 60, 0.6); blit(c, S.top.yildiz, 118, 62, 0.55);
    },
    bg(b, W, H, u) {
      // Saat Kulesi Oyuncak Atölyesi: sıcak ahşap duvar, çarklar, kocaman gülen saat, oyuncak rafı, çalışma tezgâhı
      const ty = H * 0.6;
      let g = b.createLinearGradient(0, 0, 0, ty); g.addColorStop(0, '#f4d6b0'); g.addColorStop(1, '#e8b888'); b.fillStyle = g; b.fillRect(0, 0, W, ty);
      b.strokeStyle = 'rgba(150,90,40,0.18)'; b.lineWidth = 3 * u; for (let x = 0; x < W; x += 70 * u) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x, ty); b.stroke(); }
      const gear = (x, y, r, col, n) => {
        b.save(); b.translate(x, y); b.fillStyle = col;
        b.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, rr2 = i % 2 ? r : r * 1.18; b.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } b.closePath(); b.fill();
        b.fillStyle = shade(col, 0.35); b.beginPath(); b.arc(0, 0, r * 0.55, 0, TAU); b.fill(); b.fillStyle = shade(col, -0.3); b.beginPath(); b.arc(0, 0, r * 0.2, 0, TAU); b.fill(); b.restore();
      };
      b.globalAlpha = 0.55; gear(W * 0.08, H * 0.16, 46 * u, '#c9a050', 10); gear(W * 0.16, H * 0.27, 30 * u, '#b88a3a', 8); gear(W * 0.93, H * 0.42, 40 * u, '#c9a050', 9); gear(W * 0.84, H * 0.5, 24 * u, '#b88a3a', 7); b.globalAlpha = 1;
      // saat
      const cx = W * 0.22, cy = H * 0.4, cr = 62 * u;
      ball(b, cx, cy, cr + 10 * u, cr + 10 * u, '#b8743e', { line: 4 * u, stroke: '#6a3a14', gloss: false });
      ball(b, cx, cy, cr, cr, '#fffaf0', { line: 3 * u, stroke: '#c9a070', gloss: false });
      b.fillStyle = '#6a3a14'; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; b.beginPath(); b.arc(cx + Math.cos(a) * cr * 0.8, cy + Math.sin(a) * cr * 0.8, 3.5 * u, 0, TAU); b.fill(); }
      face(b, cx, cy + 14 * u, 30 * u, 'happy');
      b.strokeStyle = '#6a3a14'; b.lineWidth = 5 * u; b.beginPath(); b.moveTo(cx, cy - 6 * u); b.lineTo(cx, cy - cr * 0.6); b.moveTo(cx, cy - 6 * u); b.lineTo(cx + cr * 0.45, cy - 6 * u); b.stroke();
      // oyuncak rafı
      const sy = H * 0.33, sx = W * 0.7;
      b.fillStyle = '#a8683a'; rr(b, sx, sy, W * 0.26, 16 * u, 6 * u); b.fill();
      for (const [f, col, ch] of [[0.02, '#ff5a7a', 'B'], [0.08, '#4fb3ff', 'C'], [0.05, '#ffd23f', '']]) {
        const x = sx + W * f, h = 42 * u, y = sy - (ch ? h : 2 * h);
        rr(b, x, y, h, h, 6 * u); b.fillStyle = col; b.fill(); b.lineWidth = 3 * u; b.strokeStyle = shade(col, -0.4); b.stroke();
      }
      ball(b, sx + W * 0.17, sy - 30 * u, 30 * u, 30 * u, '#7bd65a', { line: 3 * u }); b.fillStyle = '#fff'; b.beginPath(); b.arc(sx + W * 0.17, sy - 30 * u, 10 * u, 0, TAU); b.fill();
      b.fillStyle = '#ff8a2a'; b.beginPath(); b.moveTo(sx + W * 0.22, sy); b.lineTo(sx + W * 0.25, sy - 60 * u); b.lineTo(sx + W * 0.28 - 4 * u, sy); b.fill();
      // tezgâh
      g = b.createLinearGradient(0, ty, 0, H); g.addColorStop(0, '#c98a55'); g.addColorStop(1, '#9a5e30'); b.fillStyle = g; b.fillRect(0, ty, W, H - ty);
      b.fillStyle = '#e0a870'; b.fillRect(0, ty, W, 14 * u);
      b.strokeStyle = 'rgba(100,50,20,0.3)'; b.lineWidth = 2.5 * u; for (let y = ty + 40 * u; y < H; y += 46 * u) { b.beginPath(); b.moveTo(0, y); b.bezierCurveTo(W * 0.3, y - 8 * u, W * 0.6, y + 8 * u, W, y); b.stroke(); }
      // tezgâhta minik çarklar ve vidalar
      b.globalAlpha = 0.8; gear(W * 0.06, H * 0.92, 18 * u, '#d8b060', 7); gear(W * 0.3, H * 0.95, 12 * u, '#c0c8d0', 6); b.globalAlpha = 1;
    },
    layout(G) {
      const W = G.W, H = G.H, u = G.u, st = G.st;
      st.k = Math.min(u * 1.25, H / 820 * 1.25);
      st.cx = W * 0.5; st.cy = H * 0.56;
      const y0 = G.hudBottom + 80 * u, y1 = H - G.safe.b - 70 * u, gap = (y1 - y0) / 4, r = Math.max(48, Math.min(62 * u, gap * 0.44));
      const tx = W - G.safe.r - Math.max(r + 30 * u, W * 0.1);
      st.tray = TOPS.map((id, i) => ({ id, x: tx + (i % 2 ? -14 : 14) * u, y: y0 + i * gap, r, wob: 0, glow: 0 }));
      st.stand = { x: G.safe.l + Math.max(160 * u, W * 0.15), y: H * 0.64 };
      st.order = { x: Math.max(W * 0.47, (G.hudR || 0) + 238 * u), y: G.hudY + 18 * u };
      if (st.order.x + 230 * u > G.btn.close.x - G.btn.close.r - 6 * u) st.order = { x: W * 0.5, y: G.hudBottom + 80 * u };   // dar ekran: HUD'un altına
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
          sfx(f.id === 'nokta' ? 'fizz' : f.id === 'serit' ? 'squish' : 'pop', { vol: 0.8 }); sparkles(G, f.tx, f.ty, 7, 1);
          if (cp.need.every(id => cp.has[id]) && !cp.complete) {
            cp.complete = true; cp.ct = 0; addScore(G, 1, st.cx, st.cy - 200 * st.k, '#ff5a8a');
            sfx('levelup', { vol: 0.6 }); confetti(G, st.cx, st.cy - 80 * st.k, 12, 0.8); G.shake = 0.3;
            if (st.n === 1) { G.lastCheer = G.time; say(G, 'mini_yumurtaSusle_1', 2); } else G_cheer(G, st.n % 2 === 0);
          }
        }
      }
      for (const id in cp.land) cp.land[id] = Math.max(0, cp.land[id] - dt * 3);
      if (cp.complete) {
        cp.ct += dt;
        // sürpriz: yumurta çatlar, minik ejderha yavrusu kabuğu şapka gibi başında "rawr?" diye çıkar
        if (cp.ct > 0.3 && !cp.hatched) {
          cp.hatched = true; sfx('pop', { vol: 0.9 }); sfx('pirilKukre', { vol: 0.8, pitch: 1.35 }); hearts(G, st.cx, st.cy - 170 * st.k, 3); react(G, 'dance', 1.6);
          if (!st.yavruSaid) { st.yavruSaid = true; G.lastCheer = G.time; say(G, 'mini_yumurtaSusle_yavru', 2); }
        }
        if (cp.ct > 2.1 && !cp.leaving) { cp.leaving = true; cp.lt = 0; sfx('whoosh', { vol: 0.6 }); }
      }
      if (cp.leaving) {
        cp.lt += dt / 0.55;
        if (cp.lt >= 1) { st.done.push({ v: cp.v, has: Object.assign({}, cp.has), t: 0 }); newCup(G, false); sfx('bounce', { vol: 0.4, pitch: 1.3 }); }
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
        hit.wob = 0.6; sfx('whoosh', { vol: 0.5, pitch: 1.3 }); sfx('click', { vol: 0.6 }); good(G);
      } else {
        hit.wob = 1; sfx('bounce', { vol: 0.45, pitch: 1.3 });
        cp.hint = 1; oops(G);
      }
    },
    draw(G, c) {
      const st = G.st, S = G.S, u = G.u, k = st.k;
      if (!st.cup) return;
      const cp = st.cup;
      // biten yumurtalar: duvar rafı (iki tahta, her birinde 3 yer)
      const sd = st.stand, sk = k * 0.36;
      for (const py of [sd.y + 70 * u, sd.y - 95 * u]) {
        c.fillStyle = 'rgba(90,40,10,0.22)'; rr(c, sd.x - 150 * u, py + 8 * u, 300 * u, 16 * u, 6 * u); c.fill();
        c.fillStyle = '#b8743e'; rr(c, sd.x - 150 * u, py, 300 * u, 16 * u, 6 * u); c.fill();
        c.fillStyle = '#d89a5e'; rr(c, sd.x - 150 * u, py, 300 * u, 6 * u, 3 * u); c.fill();
        c.fillStyle = '#8a5428'; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(sd.x + d * 110 * u, py + 16 * u); c.lineTo(sd.x + d * 110 * u, py + 40 * u); c.lineTo(sd.x + d * 88 * u, py + 16 * u); c.fill(); }
      }
      for (let i = Math.min(6, st.done.length) - 1; i >= 0; i--) {
        const d = st.done[i], p = standSlot(G, i), kk = sk * outBack(Math.min(1, d.t / 0.4));
        drawCup(G, c, p.x, p.y, kk, d.v, d.has, 0, true, null, 0, 1);
      }
      if (st.done.length > 6) { const q = 1 + G.bump * 0.3; c.save(); c.translate(sd.x + 120 * u, sd.y - 215 * u); c.scale(q, q); pill(c, -44 * u, -28 * u, 88 * u, 56 * u, '#ff8fb8'); txt(c, '+' + (st.done.length - 6), 0, 2 * u, 34 * u, '#fff', '#c43a7a'); c.restore(); }
      // ana kek
      let x = st.cx, y = st.cy, sc = k, rot = 0;
      if (cp.in < 1) { const q = outBack(cp.in); y = lerp(-260 * u, st.cy, q); sc = k * (1 + (1 - Math.min(1, cp.in * 1.4)) * 0.15); }
      if (cp.leaving) {
        const q = clamp(cp.lt, 0, 1), p = standSlot(G, Math.min(5, st.done.length)), tx = p.x, ty = p.y;
        x = lerp(st.cx, tx, q); y = lerp(st.cy, ty, q) - Math.sin(q * PI) * 160 * u; sc = lerp(k, k * 0.36, q); rot = Math.sin(q * PI) * 0.4;
      }
      const hop = cp.complete && !cp.leaving && cp.ct < 0.3 ? Math.abs(Math.sin(cp.ct * 18)) * 14 * u : 0;
      const hatch = cp.complete ? outBack(clamp((cp.ct - 0.3) / 0.4, 0, 1)) : 0;
      if (!cp.leaving) { c.fillStyle = 'rgba(120,60,40,0.25)'; c.beginPath(); c.ellipse(x, y + 110 * sc, 95 * sc, 18 * sc, 0, 0, TAU); c.fill(); }
      const js = Math.sin(cp.jt * PI * 2) * 0.08 * cp.jt;
      drawCup(G, c, x, y - hop, sc, cp.v, cp.has, js, cp.complete, cp.land, rot, hatch, cp.ct);
      // uçan süsler
      for (const f of st.fly) {
        if (!f.on) continue;
        const q = outCubic(f.t), fx = lerp(f.sx, f.tx, q), fy = lerp(f.sy, f.ty, q) - Math.sin(q * PI) * 180 * u;
        blit(c, S.top[f.id], fx, fy, lerp(u * 0.85, f.k, q), q * TAU);
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
  function standSlot(G, i) {   // raftaki yer: alt tahtada 3, üstte 3 (yumurtanın merkezi; yuva tahtaya oturur)
    const sd = G.st.stand, u = G.u, kk = G.st.k * 0.36, row = i < 3 ? 0 : 1, col = i % 3;
    return { x: sd.x + (col - 1) * 96 * u, y: (row ? sd.y - 95 * u : sd.y + 70 * u) - 128 * kk };
  }
  function topPos(G, id, cp) {   // süsün yumurta üzerindeki yeri (ekran)
    const st = G.st, k = st.k, x = st.cx, y = st.cy;
    const P = { nokta: [0, -30, 1], serit: [0, -16, 1], yildiz: [-30, -60, 0.6], kalp: [36, -48, 0.55], ay: [2, -102, 0.5] }[id];
    return { x: x + P[0] * k, y: y + P[1] * k, k: k * P[2] };
  }
  function crackPath(c, below) {   // yumurtanın çatlak çizgisi (zikzak); below: alt parça, değilse kapak
    c.beginPath(); c.moveTo(-100, -82);
    for (let i = 0; i <= 10; i++) c.lineTo(-90 + i * 18, i % 2 ? -92 : -76);
    c.lineTo(100, -82);
    if (below) { c.lineTo(100, 140); c.lineTo(-100, 140); } else { c.lineTo(100, -150); c.lineTo(-100, -150); }
    c.closePath();
  }
  function eggLayers(G, c, k, v, has, happy, L) {   // yumurta + yapışan süsler
    const S = G.S;
    blit(c, happy ? S.cupHappy[v] : S.cup[v], 0, 0, k);
    const sq = id => 1 + Math.sin(((L && L[id]) || 0) * PI) * 0.25;
    if (has.nokta) blit(c, S.ov.nokta, 0, 0, k, 0, sq('nokta'), 1);
    if (has.serit) blit(c, S.ov.serit, 0, 0, k, 0, sq('serit'), 1);
    if (has.yildiz) blit(c, S.top.yildiz, -30 * k, -60 * k, k * 0.6 * sq('yildiz'), -0.2);
    if (has.kalp) blit(c, S.top.kalp, 36 * k, -48 * k, k * 0.55 * sq('kalp'), 0.15);
    if (has.ay) blit(c, S.top.ay, 2 * k, -102 * k, k * 0.5 * sq('ay'), -0.1);
  }
  function drawCup(G, c, x, y, k, v, has, js, happy, land, rot, hatch, ct) {   // yumurta (+ çatlayıp çıkan yavru) + yuva
    const S = G.S;
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(1 + (js || 0), 1 - (js || 0));
    if (hatch > 0) {
      const wave = ct ? Math.sin(ct * 7) * 0.12 : Math.sin(G.pt * 2 + x) * 0.06;
      blit(c, G.com.prHappy, 0, (-60 - 46 * hatch) * k, k * 0.42, wave);           // yavru (yumurtanın arkasından çıkar)
      c.save(); c.scale(k, k); crackPath(c, true); c.restore();
      c.save(); c.clip(); eggLayers(G, c, k, v, has, happy, land); c.restore();
      c.save(); c.translate(wave * 20 * k, (-103 - 56 * hatch) * k); c.rotate(-0.3 * hatch + wave); c.translate(0, 103 * k);   // kabuk şapka
      c.save(); c.scale(k, k); crackPath(c, false); c.restore();
      c.clip(); eggLayers(G, c, k, v, has, false, land); c.restore();
    } else eggLayers(G, c, k, v, has, happy, land);
    blit(c, S.nest, 0, 84 * k, k);
    c.restore();
  }
  function newCup(G, first) {
    const st = G.st;
    if (!st.fly) { st.fly = []; for (let i = 0; i < 6; i++) st.fly.push({ on: false }); }
    const nNeed = st.n < 2 ? 2 : 3;
    const pool = TOPS.slice().sort(() => R() - 0.5), need = pool.slice(0, nNeed);
    need.sort((a, b) => TOPS.indexOf(a) - TOPS.indexOf(b));
    st.cup = { v: st.n % CUPC.length, need, has: {}, land: {}, t: 0, jt: 0, complete: false, hatched: false, leaving: false, in: first ? 1 : 0, ct: 0, lt: 0, hint: 0 };
    st.n++;
    if (!first) { sfx('whoosh', { vol: 0.5 }); if (st.n === 4 && G.time - G.lastCheer > 6) { G.lastCheer = G.time; say(G, 'mini_yumurtaSusle_3', 2); } }
  }
})();
