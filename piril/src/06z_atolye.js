/* ── Bölüm 4: Saat Kulesi Oyuncak Atölyesi (Feza ile Pırıl) ──
   Dev bir saat kulesinin içindeki sıcacık oyuncak atölyesi: bal rengi tahta döşeme, yapboz parçası halılar, yıldızlı müzik halısı.
     1. Çark Koridoru   kenarlarda dönen dev pirinç çarklar, sarkaçlı ayaklı saatler, ip makaraları; "Çark Düğmesi" (basınca
                        bütün çarklar fırıl fırıl döner, şeker saçar)
     2. Tren Rayları    oda içinde yuvarlak oyuncak tren yolu: buharlı minik tren "çuf çuf" tur atar; duraktaki zil (yaklaşınca öter)
     3. Blok Kuleleri   harfli oyuncak blok kuleleri, devrik boya kutuları (içinden geçen Feza'nın arkasında renkli parıltı izi),
                        yerde boya kalemleri, ip makaraları
     4. Saat Odası      dans eden balerinli müzik kutuları (yaklaşınca çalar, şeker saçar), raflarda oyuncaklar,
                        kuzeyde kocaman saat kadranı pencere: arkasında gece göğü, ay, yıldızlar
     Arena: kulenin tepesi — dev saat kadranı penceresi, çark duvarı, yapboz zemin (Kurmalı Koca Ayıcık).
   Gizli köşeler: yan odalarda oyuncak sandığı (altın şeker + çıkartma), Çark Düğmesi, boya izi, müzik kutuları.
   Işık: isik4 (boss neşelenince Pırıl'a döner → kalp tozu). Huysuzlar/boss: src/05z_atolye.js. Biçim: PIRIL.md › 5, SPEC.md › kur api.
   Genel ad: ATOLYE. Çizim: statik süs malzeme + 24 m parça başına tek ağ; hareketli parçalar paylaşılan geometri (≤ 40). */
const ATOLYE = (() => {
  'use strict';
  const PI = Math.PI, hyp = Math.hypot;

  // ════════ Malzemeler (kalıcı, bölümler arası paylaşılır) ════════
  const M = {};
  const kp = m => { m.userData.keep = true; return m; };
  function mat(k) {
    if (M[k]) return M[k];
    let m;
    switch (k) {
      case 'wood': m = rimify(vcMat({ roughness: 0.62 }), 0xfff0dc, 0.18, 2.8); break;
      case 'paint': m = rimify(vcMat({ roughness: 0.28 }), 0xffffff, 0.22, 2.6); break;
      case 'brass': m = rimify(vcMat({ roughness: 0.26, metalness: 0.7 }), 0xfff0b0, 0.4, 2.2); break;
      case 'cloth': m = vcMat({ roughness: 0.9 }); break;
      case 'glass': m = rimify(vcMat({ roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false }), 0xffffff, 0.8, 2.2); break;
      case 'glow': m = new THREE.MeshBasicMaterial({ vertexColors: true }); break;
      case 'halo': m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }); break;
      default: m = vcMat({ roughness: 0.5 });
    }
    return (M[k] = kp(m));
  }
  const CAST = {};   // (PIRIL.md: gölge yalnız Feza/Pırıl/boss; süsler gölge düşürmez, alır)
  const C = (hex, k = 1) => (k === 1 ? new THREE.Color(hex) : new THREE.Color(hex).multiplyScalar(k));

  // ── birleştirilmiş çizim: malzeme + 24 m parça başına tek ağ ──
  function batch(api) {
    const kits = {}, CK = 24;
    const B = {
      kit(mk, x, z) { const key = mk + '|' + Math.floor(x / CK) + '|' + Math.floor(z / CK); return kits[key] || (kits[key] = new Kit()); },
      add(mk, geo, color, pos, rot, scl) { B.kit(mk, pos[0], pos[2]).add(geo, color, pos, rot, scl); return B; },
      seg(mk, p0, p1, r, color, r1, sides) { B.kit(mk, p0[0], p0[2]).seg(p0, p1, r, color, r1, sides); return B; },
      done() {
        for (const key in kits) {
          const k = kits[key]; if (!k.parts.length) continue;
          const mk = key.split('|')[0], mesh = new THREE.Mesh(k.build(), mat(mk));
          mesh.castShadow = !!CAST[mk]; mesh.receiveShadow = mk !== 'glow' && mk !== 'halo';
          if (mk === 'glass' || mk === 'halo') mesh.renderOrder = 2;
          mesh.name = 'atolye-' + mk; api.add(mesh);
          delete kits[key];
        }
      },
    };
    return B;
  }
  function solo(kit, mk, api, cast) { const m = new THREE.Mesh(kit.build(), mat(mk)); m.castShadow = !!cast; m.receiveShadow = true; api.add(m); return m; }
  // paylaşılan (kalıcı) geometri: bir kez kurulur
  const GEO = {};
  const keepGeo = (key, make) => GEO[key] || (GEO[key] = (() => { const g = make(); g.userData.keep = true; return g; })());

  // ════════ Oyun bağlantıları ════════
  const live = () => typeof GAME !== 'undefined' && GAME.state === 'play' && !GAME.paused && GAME.P && !GAME.P.dead && !(typeof MINIGAME !== 'undefined' && MINIGAME && MINIGAME.active);
  const sfx = (n, o) => { try { if (typeof AUD !== 'undefined' && AUD.sfx) AUD.sfx(n, o); } catch (e) { /* ses yok */ } };
  const burst = (k, x, y, z, o) => { try { if (typeof FX !== 'undefined' && FX.burst) FX.burst(k, x, y, z, o); } catch (e) { /* yok */ } };
  const ftext = (x, y, z, t) => { try { if (typeof FX !== 'undefined' && FX.floatText) FX.floatText(x, y, z, t, 'word'); } catch (e) { /* yok */ } };
  const said = new Set(); let sayAt = -99;
  function say(key, o = {}) {
    if (typeof GAME === 'undefined' || !(typeof AUD !== 'undefined' && AUD.LINES && AUD.LINES[key])) return false;
    const now = GAME.time || performance.now() / 1000;
    if (o.once !== false && said.has(key)) return false;
    if (now - sayAt < (o.gap ?? 7)) return false;
    sayAt = now; said.add(key);
    try { if (GAME.halaApi && GAME.halaApi.say) GAME.halaApi.say(key, o.prio || 2); else if (AUD.say) AUD.say(key, { prio: o.prio || 2 }); } catch (e) { return false; }
    return true;
  }
  const sugar = (x, z, n = 6) => { try { if (GAME.dropSugar) GAME.dropSugar(x, z, 8, n); } catch (e) { /* yok */ } };
  function gold(x, z, sticker) {
    try {
      if (GAME.addGoldSugar) GAME.addGoldSugar(1);
      if (sticker && GAME.giveSticker) GAME.giveSticker(sticker, 'gizli');
    } catch (e) { /* yok */ }
    burst('star', x, 1.2, z, { count: 7 });   // ATOLYE2: tek efekt sfx('star', { vol: 0.9 }); sfx('coin', { pitch: 1.5 });
  }

  // ════════ Yerleşim yardımcıları (06z_buzdolabi ODAB'dan uyarlandı) ════════
  function pathD(L, x, z) {
    let d = 1e9; const p = L.path || [];
    for (let s = 1; s < p.length; s++) {
      const ax = p[s - 1].x, az = p[s - 1].z, bx = p[s].x, bz = p[s].z, vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1;
      const t = clamp(((x - ax) * vx + (z - az) * vz) / l2, 0, 1); d = Math.min(d, hyp(x - ax - vx * t, z - az - vz * t));
    }
    return d;
  }
  function clearOf(L, x, z, r) {
    const near = (p, rr) => p && hyp(p.x - x, p.z - z) < rr + r;
    if (near(L.start, 2.5) || near(L.exit, 3) || near(L.boss, 3) || near(L.crystalSpot, 3)) return false;
    for (const c of L.checkpoints || []) if (near(c, 1.8)) return false;
    for (const c of L.chests || []) if (near(c, 1.5)) return false;
    for (const s of L.stations || []) if (near(s, 1.8)) return false;
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
  function edge(api, rm, dx, dz, max = 22) {
    const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    let d = 0; while (d < max && api.isFloor(rm.x + dx * d, rm.z + dz * d)) d += 0.25;
    return { x: rm.x + dx * d, z: rm.z + dz * d, d, dx, dz };
  }
  // Yüksek süs burada durabilir mi? Kamera +z'den (güneyden) bakar: kuzeyinde ~9 m içinde yürünür zemin varsa süs Feza'nın
  // önünü kapatır → alçak olmalı (oda sırası kuzeye ilerlediği için bir odanın kuzeyi sonraki odanın güneyidir).
  function tallOk(api, x, z, d = 9, w = 2.5) {
    for (let k = 0.75; k <= d; k += 0.75) for (const dx of [-w, 0, w]) if (api.isFloor(x + dx, z - k)) return false;
    return true;
  }
  // odanın çevresinde yürünmez alanda süs yerleri (fn(x, z, alçak mı, açı))
  function ring(api, rm, n, rad, fn, o = {}) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = (k + (o.off ?? api.rnd() * 0.4)) * TAU / n, R0 = (rm.r || 6) + rad + (o.gap ?? 1.2) + api.rnd() * (o.jit ?? 1.5);
      const x = rm.x + Math.sin(a) * R0, z = rm.z + Math.cos(a) * R0;
      if (api.isFloor(x, z) || api.linkDist(x, z) < rad + (o.link ?? 2.6)) continue;
      let ok = true;
      for (let q = 0; q < 8 && ok; q++) { const b = q * PI / 4; if (api.isFloor(x + Math.sin(b) * rad, z + Math.cos(b) * rad)) ok = false; }
      if (!ok) continue;
      const south = z > rm.z + (rm.r || 6) * 0.35 || !tallOk(api, x, z, o.view || 9);
      out.push({ x, z, south, a }); fn(x, z, south, a);
    }
    return out;
  }
  // yürünür alanın hemen kıyısı: { x, z, nx, nz (zemine doğru), side: south|north|side, room }
  function edgeSpots(L, api, o = {}) {
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
      const key = ci + ',' + cj; (cell.get(key) || cell.set(key, []).get(key)).push(c);
      c.side = c.nz < -0.55 || !tallOk(api, c.x, c.z, 8) ? 'south' : c.nz > 0.45 ? 'north' : 'side';
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
      let br = 0, bd = 1e9; L.rooms.forEach((rm, ri) => { const d = hyp(rm.x - x, rm.z - z); if (d < bd) { bd = d; br = ri; } });
      out.push({ x, z, room: br });
    }
    return out;
  }
  function clearSpawns(L, api, spots) {
    for (const s of L.spawns || []) {
      if (!spots.some(q => hyp(q.x - s.x, q.z - s.z) < q.r)) continue;
      for (let t = 0; t < 20; t++) {
        const p = api.randomFloorNear ? api.randomFloorNear(s.x, s.z, 2, 7) : null;
        if (p && !spots.some(q => hyp(q.x - p.x, q.z - p.z) < q.r) && api.circleFree(p.x, p.z, 0.6)) { s.x = p.x; s.z = p.z; break; }
      }
    }
  }
  function gentlePacks(L, max = 5) {
    const by = {};
    for (const s of L.spawns || []) { const k = s.pack ?? s.room; (by[k] || (by[k] = [])).push(s); }
    const drop = new Set();
    for (const k in by) { const g = by[k]; if (g.length <= max) continue; g.slice().sort((a, b) => (a.elite ? 1 : 0) - (b.elite ? 1 : 0)).slice(0, g.length - max).forEach(s => drop.add(s)); }
    if (drop.size) L.spawns = L.spawns.filter(s => !drop.has(s));
  }

  // ════════ Zemin dokuları (tuval çizimi; bir kez, kalıcı) ════════
  const TEXC = {};
  function canvasTex(key, size, draw) {
    if (TEXC[key]) return TEXC[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); draw(g, size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = typeof ANISO !== 'undefined' ? ANISO : 4;
    t.userData.keep = true;
    return (TEXC[key] = t);
  }
  // bal rengi tahta döşeme: 12 sıra tahta (6 m döşeme), kayık uçlar, damar, çivi
  const planks = () => canvasTex('atPlank', 1024, (g, S) => {
    const rows = 12, h = S / rows, cols = ['#c99c70', '#be9065', '#d3a87c', '#b88a60', '#cba074', '#c39668'];
    let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < rows; i++) {
      let x = -r() * S * 0.5;
      while (x < S) {
        const w = S * (0.35 + r() * 0.4), c = cols[(r() * cols.length) | 0];
        g.fillStyle = c; g.fillRect(x, i * h, w, h);
        g.strokeStyle = 'rgba(120,70,30,0.18)'; g.lineWidth = 2;
        for (let k = 0; k < 5; k++) { const y = i * h + h * (0.15 + k * 0.17 + r() * 0.05); g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + w * 0.3, y + (r() - 0.5) * 10, x + w * 0.7, y + (r() - 0.5) * 10, x + w, y); g.stroke(); }
        if (r() < 0.4) { g.fillStyle = 'rgba(110,60,25,0.25)'; g.beginPath(); g.ellipse(x + w * r(), i * h + h * 0.5, 9, 5, 0, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(80,45,20,0.55)'; g.fillRect(x, i * h, 3, h);
        g.fillStyle = 'rgba(90,60,40,0.6)'; for (const yy of [0.25, 0.75]) { g.beginPath(); g.arc(x + 9, i * h + h * yy, 2.6, 0, TAU); g.fill(); }
        x += w;
      }
      g.fillStyle = 'rgba(80,45,20,0.5)'; g.fillRect(0, i * h, S, 3);
      g.fillStyle = 'rgba(255,240,210,0.25)'; g.fillRect(0, i * h + 3, S, 2);
    }
  });
  // yapboz halı: 4×4 parça (4 m), yuvarlak çıkıntılı, canlı renkler
  const puzzle = () => canvasTex('atPuzzle', 1024, (g, S) => {
    // ATOLYE2: pastel ama doygun (sis yok), mor yok (mor yalnız Pırıl'ın); parçalar arasında ince sıcak kahve çizgi
    const n = 4, s = S / n, cols = ['#f49aa4', '#f6cf62', '#8fd29c', '#86c1ee', '#7fd0c8', '#f5aa72'];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { g.fillStyle = cols[(i + j * 2) % cols.length]; g.fillRect(i * s, j * s, s, s); }
    // çıkıntılar: komşu parçanın rengiyle yuvarlak
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const c = cols[(i + j * 2) % cols.length];
      g.fillStyle = c;
      if ((i + j) % 2) { g.beginPath(); g.arc((i + 1) * s, j * s + s / 2, s * 0.13, 0, TAU); g.fill(); }
      else { g.beginPath(); g.arc(i * s + s / 2, (j + 1) * s, s * 0.13, 0, TAU); g.fill(); }
    }
    g.strokeStyle = 'rgba(120,70,50,0.42)'; g.lineWidth = 3;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      g.beginPath(); g.moveTo(i * s, j * s); g.lineTo((i + 1) * s, j * s); g.stroke();
      g.beginPath(); g.moveTo(i * s, j * s); g.lineTo(i * s, (j + 1) * s); g.stroke();
      if ((i + j) % 2) { g.beginPath(); g.arc((i + 1) * s, j * s + s / 2, s * 0.13, -PI / 2, PI / 2); g.stroke(); }
      else { g.beginPath(); g.arc(i * s + s / 2, (j + 1) * s, s * 0.13, 0, PI); g.stroke(); }
      // her parçada kabartma şekil: yıldız / kalp / daire
      const cx = i * s + s / 2, cy = j * s + s / 2, k = (i * 3 + j) % 3; g.fillStyle = 'rgba(255,255,255,0.22)';
      if (k === 0) { g.beginPath(); for (let q = 0; q < 10; q++) { const a = q / 10 * TAU - PI / 2, rr = q % 2 ? s * 0.09 : s * 0.2; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.fill(); }
      else if (k === 1) { g.beginPath(); g.arc(cx, cy, s * 0.16, 0, TAU); g.fill(); }
      else { g.beginPath(); g.moveTo(cx, cy + s * 0.16); g.bezierCurveTo(cx - s * 0.3, cy - s * 0.05, cx - s * 0.1, cy - s * 0.25, cx, cy - s * 0.08); g.bezierCurveTo(cx + s * 0.1, cy - s * 0.25, cx + s * 0.3, cy - s * 0.05, cx, cy + s * 0.16); g.fill(); }
    }
  });
  // ZEMİN turu: ince keçe/lif dokusu (gri 128 çevresinde, düşük kontrast; R = ince lif/benek, G = yumuşak büyük leke). Tek doku, kalıcı.
  const feltTex = () => canvasTex('atFelt', 256, (g, S) => {
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, S, S);
    let seed = 11; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.globalCompositeOperation = 'source-over'; g.lineCap = 'round';
    // R kanalı: kısa, rastgele yönlü keçe lifleri (açık/koyu), kenarlarda sarılarak döşenir
    for (let k = 0; k < 1400; k++) {
      const x = r() * S, y = r() * S, a = r() * TAU, l = 2 + r() * 6, v = r() < 0.5 ? 255 : 0;
      g.strokeStyle = `rgba(${v},128,128,${0.08 + r() * 0.1})`; g.lineWidth = 0.8 + r() * 0.8;
      for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); }
    }
    // G kanalı: yumuşak büyük lekeler (iki tonlu renk dalgalanması için)
    for (let k = 0; k < 26; k++) {
      const x = r() * S, y = r() * S, rr = S * (0.1 + r() * 0.18), v = r() < 0.5 ? 255 : 0;
      for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr);
        gr.addColorStop(0, `rgba(128,${v},128,0.22)`); gr.addColorStop(1, 'rgba(128,128,128,0)');
        g.fillStyle = gr; g.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2);
      }
    }
  });
  // müzik halısı: lacivert, altın yıldızlar ve nota desenleri
  const starRug = () => canvasTex('atRug', 512, (g, S) => {
    const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, '#2f4a8f'); gr.addColorStop(1, '#2c4486');   // ATOLYE2: gece mavisi (mor yalnız Pırıl'ın) g.fillStyle = gr; g.fillRect(0, 0, S, S);
    let seed = 3; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 14; k++) { const x = r() * S, y = r() * S, rr = 3 + r() * 7; g.fillStyle = k % 3 ? '#ffe9a0' : '#ffffff'; g.beginPath(); for (let q = 0; q < 10; q++) { const a = q / 10 * TAU, l = q % 2 ? rr * 0.45 : rr; g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); } g.fill(); }
    g.fillStyle = 'rgba(255,200,230,0.6)';
    for (let k = 0; k < 3; k++) { const x = r() * S, y = r() * S; g.beginPath(); g.ellipse(x, y, 10, 7, -0.4, 0, TAU); g.fill(); g.fillRect(x + 8, y - 30, 3, 30); }
    g.strokeStyle = 'rgba(255,220,140,0.5)'; g.lineWidth = 6; g.strokeRect(10, 10, S - 20, S - 20);
  });

  // zemin: 3 doku (yerleşim dokusu R = yapboz, B = müzik halısı), G = yürünür alan (dışı loş)
  function floor(L, api, region) {
    const pad = 16, ppm = 2, W = L.W + pad * 2, H = L.H + pad * 2, tw = W * ppm, th = H * ppm;
    const raw = new Float32Array(tw * th * 4), tmp = new Float32Array(tw * th * 4);
    for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
      const x = (i + 0.5) / ppm - pad, z = (j + 0.5) / ppm - pad, o4 = (j * tw + i) * 4;
      const gi = Math.floor(x), gj = Math.floor(z), walk = gi >= 0 && gj >= 0 && gi < L.W && gj < L.H && L.grid[gj * L.W + gi] ? 1 : 0;
      const r = region(x, z);
      raw[o4] = r[0]; raw[o4 + 1] = walk; raw[o4 + 2] = r[1]; raw[o4 + 3] = 0;
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
    const m0 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0 });
    const U = { tLay: { value: lay }, tM0: { value: planks() }, tM1: { value: puzzle() }, tM2: { value: starRug() }, uLay: { value: new THREE.Vector4(pad, pad, 1 / W, 1 / H) }, tFelt: { value: feltTex() } };
    m0.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vAtW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvAtW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vAtW; uniform sampler2D tLay, tM0, tM1, tM2, tFelt; uniform vec4 uLay;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `vec4 atL = texture2D(tLay, (vAtW.xz + uLay.xy) * uLay.zw);
          vec3 atC = texture2D(tM0, vAtW.xz / 6.0).rgb;
          vec3 atP = texture2D(tM1, vAtW.xz / 4.0).rgb; atP = mix(atP, vec3(dot(atP, vec3(0.3, 0.59, 0.11))), 0.24); atP = mix(atP, vec3(0.96, 0.88, 0.78), 0.1) * 0.9;   // ATOLYE2: yapboz net ve sıcak, ama karakterlerden sakin (sis/bej perde yok)
          float atIn = smoothstep(0.42, 0.5, atL.r), atRim = smoothstep(0.3, 0.36, atL.r) - atIn;   // halının keskin kenarı + krem bordür
          // ZEMİN turu: ince doku (±%8–10): parkede boyuna uzayan tahta damarı, yapbozda keçe lifi; üstüne büyük ölçekli iki ton dalgalanma
          float atFw = texture2D(tFelt, vAtW.xz * vec2(0.1, 0.8)).r - 0.5;    // parke damarı (tahtalar x boyunca)
          float atFf = texture2D(tFelt, vAtW.xz * 0.35).r - 0.5;                // keçe lifi
          float atMac = texture2D(tFelt, vAtW.xz * 0.045).g - 0.5;             // büyük yumuşak leke
          atC *= 1.0 + atFw * 0.72;
          atP *= 1.0 + atFf * 1.12;
          atC = mix(atC, atP, atIn);
          atC *= 1.0 + atMac * 0.4;
          atC = mix(atC, vec3(0.97, 0.9, 0.78), atRim * 0.9);
          atC *= 1.0 - 0.28 * (smoothstep(0.36, 0.42, atL.r) - atIn);
          vec3 atR = texture2D(tM2, vAtW.xz / 3.0).rgb; atR = mix(atR, vec3(0.24, 0.32, 0.52), 0.45);   // SADE: yıldızlı halı sönük
          atC = mix(atC, atR, atL.b);
          // ATOLYE2 (QA3): dış alan eskiden ×0,42 kararıyordu → bulanık katmanla parkede "dumanlı koyu leke" gibi duruyordu.
          //   Şimdi dışı yalnız hafif sönük (×0,8), sınır keskin; kıyıda ince sıcak çizgi yolu belli eder.
          atC *= mix(vec3(0.8, 0.76, 0.74), vec3(1.0), smoothstep(0.42, 0.58, atL.g));
          atC *= 1.0 - 0.1 * (smoothstep(0.36, 0.46, atL.g) - smoothstep(0.5, 0.6, atL.g));
          diffuseColor.rgb *= atC;`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.62, 0.5, atL.r);');
    };
    m0.customProgramCacheKey = () => 'atolye-zemin';
    const geo = new THREE.PlaneGeometry(W, H); geo.rotateX(-PI / 2); geo.translate(L.W / 2, 0, L.H / 2);
    api.dispose(geo); api.dispose(m0);
    const m = new THREE.Mesh(geo, m0); m.receiveShadow = true; m.name = 'atolye-zemin'; m.position.y = -0.002;
    api.add(m);
    if (api.floor) api.floor.visible = false;
    return m;
  }

  // ════════ Yerleşim (saf veri) ════════
  const PAL = { brass: 0xe8b850, brassD: 0xb8862a, wood: 0xc98a52, woodD: 0x8f5a32, woodL: 0xe6b884, red: 0xff5f6d, yel: 0xffd25a, grn: 0x5fd38a, blu: 0x4fb3ff, pur: 0x3fc8c0 /* ATOLYE2: eskiden mor; mor yalnız Pırıl'ın → turkuaz */, ora: 0xff9f43, pink: 0xff8fb8, cream: 0xfff4e2 };
  const TOYC = [PAL.red, PAL.yel, PAL.grn, PAL.blu, PAL.pur, PAL.ora, PAL.pink];
  function yerlesim(L, api) {
    const R = L.rooms, A = L.areas || [], room = i => R[i];
    const mainOf = a => (a ? a.rooms.filter(i => R[i] && R[i].kind !== 'side') : []);
    const a1 = mainOf(A[0]), a2 = mainOf(A[1]), a3 = mainOf(A[2]), a4 = mainOf(A[3]);
    const arenaA = A.find(a => a.boss), arena = arenaA ? room(arenaA.rooms[0]) : R[R.length - 1];
    const D = L.atl = { taken: [], train: null, button: null, boxes: [], puddles: [], chest: null, bell: null, arena, rugs: [], puzz: [] };
    const taken = D.taken;
    // 1) Çark Düğmesi: çark koridorunun ilk odasında
    { const rm = room(a1[0] ?? 0); const p = rm && roomSpot(L, api, rm, { r: 0.9, pmin: 2.0, pmax: 6.5, k: 0.75, taken });
      if (p) { D.button = { x: p.x, z: p.z }; taken.push({ x: p.x, z: p.z, r: 2 }); } }
    // 2) Tren yolu: tren alanının bir odasında, odaya sığan elips (rayları yürünür zemine döşenir; tren zararsız geçer)
    for (const ri of [a2[0], a2[1]].filter(i => i !== undefined)) {
      const rm = room(ri); if (!rm || D.train) continue;
      for (const k of [0.62, 0.55, 0.48, 0.42]) {
        const rx = rm.r * k * 1.15, rz = rm.r * k * 0.8, pts = [];
        let ok = true;
        for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, x = rm.x + Math.sin(a) * rx, z = rm.z + Math.cos(a) * rz; if (!api.isFloor(x, z) || !api.isFloor(x + Math.sin(a) * 0.8, z + Math.cos(a) * 0.8)) { ok = false; break; } pts.push({ x, z }); }
        if (!ok || rx < 3) continue;
        D.train = { x: rm.x, z: rm.z, rx, rz, room: ri };
        break;
      }
      if (D.train) {   // durak zili: rayların dışında, odanın kenarına yakın
        const T = D.train;
        for (const ang of [1.2, -1.2, 0.8, -0.8, 1.6, -1.6, 2.2]) {
          const e = edge(api, rm, Math.sin(PI + ang), Math.cos(PI + ang)), x = e.x - e.dx * 1.1, z = e.z - e.dz * 1.1;
          if (((x - T.x) / T.rx) ** 2 + ((z - T.z) / T.rz) ** 2 < 1.5 || !api.circleFree(x, z, 0.4) || !clearOf(L, x, z, 0.6)) continue;
          D.bell = { x, z }; api.solid(x, z, 0.25, 'durak'); taken.push({ x, z, r: 1.4 }); break;
        }
      }
    }
    // 3) Blok kuleleri: devrik boya kutuları (oda içinde 2 birikinti) + yapboz halıları
    for (const ri of a3) {
      const rm = room(ri); if (!rm) continue;
      D.puzz.push({ x: rm.x, z: rm.z, r: rm.r * 0.85 });
      const p = roomSpot(L, api, rm, { r: 0.8, pmin: 1.5, pmax: 6, k: 0.7, taken });
      if (p) { D.puddles.push({ x: p.x, z: p.z, c: TOYC[D.puddles.length % TOYC.length] }); taken.push({ x: p.x, z: p.z, r: 1.6 }); }
    }
    // küçük halılar: çark koridorunda yapboz, tren alanının ikinci odasında yıldızlı halı
    D.floorGears = [];   // ATOLYE2: yere gömülü dev çark kapalı (Feza'nın altında anlamsız dev halka gibi görünüyordu; çarklar kenarda dik durur)
    { const rm = room(a2[1]); if (rm && !(D.train && D.train.room === a2[1])) D.rugs.push({ x: rm.x, z: rm.z, r: rm.r * 0.5 }); }
    // 4) Saat odası: müzik kutuları (katı) + yıldızlı müzik halısı
    for (const ri of a4) {
      const rm = room(ri); if (!rm) continue;
      D.rugs.push({ x: rm.x, z: rm.z, r: rm.r * 0.8 });
      const p = roomSpot(L, api, rm, { r: 1.0, pmin: 2.2, pmax: 7, k: 0.7, taken });
      if (p) { const s = { x: p.x, z: p.z, c: D.boxes.length % 2 }; s.solid = api.solid(p.x, p.z, 0.75, 'muzikKutusu'); D.boxes.push(s); taken.push({ x: p.x, z: p.z, r: 2.4 }); }
    }
    if (arena) D.puzz.push({ x: arena.x, z: arena.z, r: arena.r * 0.95 });
    // gizli oyuncak sandığı: en uzak yan oda
    const sides = R.map((r, i) => ({ r, i })).filter(o => o.r.kind === 'side');
    if (sides.length) {
      const s = sides[sides.length - 1].r, p = roomSpot(L, api, s, { r: 0.9, pmin: 0, k: 0.55, taken });
      if (p) { D.chest = { x: p.x, z: p.z }; D.chest.solid = api.solid(p.x, p.z, 0.7, 'oyuncakSandigi'); taken.push({ x: p.x, z: p.z, r: 2 }); }
    }
    clearSpawns(L, api, taken.map(q => ({ x: q.x, z: q.z, r: q.r + 1.2 })));
    // mini oyun köşesi (varsa): saat odasında
    try {
      if (typeof MINIGAME !== 'undefined' && MINIGAME && MINIGAME.list) {
        const ids = MINIGAME.list(), pref = ['muzik', 'kutu', 'blok', 'yakala', 'tren'];
        const id = ids.find(i => pref.some(p => i.toLowerCase().includes(p))) || ids[0];
        const rm = room(a3[1] ?? a3[0]);
        const p = id && rm && roomSpot(L, api, rm, { r: 1.0, pmin: 2.4, pmax: 7, k: 0.8, taken });
        if (p) { (L.stations || (L.stations = [])).push({ id: 'mini_' + id, kind: 'mini', mini: id, x: p.x, z: p.z, r: 1.0 }); D.mini = { x: p.x, z: p.z }; taken.push({ x: p.x, z: p.z, r: 2 }); }
      }
    } catch (e) { /* mini oyun yok */ }
    gentlePacks(L, 5);
  }

  // ════════ Süs modelleri (Kit parçaları; hepsi birleştirilir) ════════
  // pirinç çark geometrisi (birim yarıçap, z kalınlığı 1): göbek + 6 kol + dişli halka (paylaşılan)
  const gearGeo = teeth => keepGeo('gear' + teeth, () => {
    const k = new Kit(), c = C(0xffffff);
    k.add(G.torus(TAU, 0.14, 28), c, [0, 0, 0], null, [0.84, 0.84, 1.4]);
    for (let i = 0; i < teeth; i++) { const a = i / teeth * TAU; k.add(G.box(), c, [Math.sin(a) * 0.98, Math.cos(a) * 0.98, 0], [0, 0, -a], [0.17, 0.2, 0.22]); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.add(G.box(), c, [Math.sin(a) * 0.42, Math.cos(a) * 0.42, 0], [0, 0, -a], [0.1, 0.72, 0.12]); }
    k.add(G.cyl(1, 1, 20), c, [0, 0, 0], [PI / 2, 0, 0], [0.2, 0.3, 0.2]);
    k.add(G.cyl(1, 1, 16), C(0xffe6a0), [0, 0, 0], [PI / 2, 0, 0], [0.09, 0.34, 0.09]);
    return k.build();
  });
  // ayaklı sarkaçlı saat (gövde statik; sarkaç ayrı ağ)
  function grandClock(B, x, z, s, face) {
    const h = 5.2 * s, w = 1.5 * s, d = 0.9 * s, wood = C(PAL.woodD), woodL = C(PAL.wood);
    B.add('wood', G.rbox(2), wood, [x, h * 0.42, z], [0, face, 0], [w, h * 0.84, d]);
    B.add('wood', G.rbox(2), woodL, [x, h * 0.88, z], [0, face, 0], [w * 1.12, h * 0.26, d * 1.1]);
    B.add('wood', G.cyl(1, 1, 3), woodL, [x, h * 1.03, z], [PI / 2, face, PI / 2], [w * 0.42, d * 1.0, w * 0.15]);
    const fx = x + Math.sin(face) * d * 0.56, fz = z + Math.cos(face) * d * 0.56;
    B.add('paint', G.cyl(1, 1, 28), C(0xfff8e8), [fx, h * 0.88, fz], [PI / 2, face, 0], [w * 0.4, 0.06, w * 0.4]);
    B.add('brass', G.torus(TAU, 0.12, 28), C(PAL.brass), [fx, h * 0.88, fz], [0, face, 0], [w * 0.42, w * 0.42, w * 0.42]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; B.add('wood', G.box(), C(0x5a3a28), [fx + Math.cos(face) * Math.sin(a) * w * 0.32, h * 0.88 + Math.cos(a) * w * 0.32, fz - Math.sin(face) * Math.sin(a) * w * 0.32], [0, face, -a], [0.04 * s, i % 3 ? 0.08 * s : 0.15 * s, 0.03]); }
    B.add('wood', G.box(), C(0x3a2a20), [fx, h * 0.88 + w * 0.12, fz], [0, face, 0], [0.05 * s, w * 0.26, 0.03]);
    B.add('wood', G.box(), C(0x3a2a20), [fx + Math.cos(face) * w * 0.09, h * 0.88, fz - Math.sin(face) * w * 0.09], [0, face, PI / 2], [0.05 * s, w * 0.2, 0.03]);
    B.add('glass', G.box(), C(0xfff2d8), [fx, h * 0.45, fz], [0, face, 0], [w * 0.62, h * 0.5, 0.04]);
    B.add('brass', G.sphere(10, 8), C(PAL.brass), [x, h * 1.1, z], null, [0.18 * s, 0.18 * s, 0.18 * s]);
    return { px: fx - Math.sin(face) * 0.12, py: h * 0.72, pz: fz - Math.cos(face) * 0.12, len: h * 0.4, face, s };
  }
  const pendGeo = () => keepGeo('pend', () => { const k = new Kit(); k.add(G.box(), C(0xffffff), [0, -0.5, 0], null, [0.025, 1, 0.015]); k.add(G.cyl(1, 1, 24), C(0xffffff), [0, -1, 0], [PI / 2, 0, 0], [0.14, 0.03, 0.14]); return k.build(); });
  // ip makarası
  function spool(B, x, z, s, c, rnd) {
    const r = 0.7 * s, h = 1.2 * s;
    for (const y of [0.06 * s, h - 0.06 * s]) B.add('wood', G.cyl(1, 1, 14), C(PAL.woodL), [x, y, z], null, [r, 0.12 * s, r]);
    B.add('cloth', G.cyl(1, 1, 14), C(c), [x, h / 2, z], null, [r * 0.82, h * 0.82, r * 0.82]);
    for (let k = 0; k < 2; k++) B.add('cloth', G.torus(TAU, 0.05, 14), C(c, 0.9), [x, h * (0.3 + k * 0.4), z], [PI / 2, 0, 0], [r * 0.83, r * 0.83, r * 0.83]);
    const a = rnd() * TAU; B.seg('cloth', [x + Math.sin(a) * r * 0.82, h * 0.5, z + Math.cos(a) * r * 0.82], [x + Math.sin(a) * r * 2.2, 0.05, z + Math.cos(a) * r * 2.4], 0.03 * s, C(c), 0.03 * s, 5);
  }
  // harfli oyuncak blok yığını (n kat)
  function blocks(B, x, z, n, s, rnd) {
    let y = 0;
    for (let i = 0; i < n; i++) {
      const w = (1.1 - i * 0.06) * s, c = TOYC[(rnd() * TOYC.length) | 0], c2 = TOYC[(rnd() * TOYC.length) | 0], yaw = (rnd() - 0.5) * 0.6, cx = x + (rnd() - 0.5) * 0.15 * s, cz = z + (rnd() - 0.5) * 0.15 * s;
      B.add('paint', G.rbox(1), C(c), [cx, y + w / 2, cz], [0, yaw, 0], [w, w, w]);
      const k = (rnd() * 3) | 0, fx = cx + Math.sin(yaw) * w * 0.51, fz = cz + Math.cos(yaw) * w * 0.51;
      if (k === 0) B.add('paint', G.cyl(1, 1, 12), C(c2), [fx, y + w / 2, fz], [PI / 2, yaw, 0], [w * 0.3, 0.04, w * 0.3]);
      else if (k === 1) { for (let q = 0; q < 5; q++) { const a = q / 5 * TAU; B.add('paint', G.cone(4), C(c2), [fx + Math.cos(yaw) * Math.sin(a) * w * 0.17, y + w / 2 + Math.cos(a) * w * 0.17, fz - Math.sin(yaw) * Math.sin(a) * w * 0.17], [0, yaw, -a], [w * 0.1, w * 0.22, 0.03]); } }
      else { B.add('paint', G.box(), C(c2), [fx, y + w / 2, fz], [0, yaw, 0], [w * 0.12, w * 0.55, 0.04]); B.add('paint', G.box(), C(c2), [fx, y + w / 2, fz], [0, yaw, PI / 2], [w * 0.12, w * 0.55, 0.04]); }
      y += w;
    }
    return y;
  }
  // boya kutusu (devrik olabilir) + fırça
  function paintPot(B, x, z, s, c, tipped, rnd) {
    const r = 0.55 * s, h = 0.9 * s;
    if (!tipped) {
      B.add('brass', G.cyl(1, 1, 14), C(0xd8dde8), [x, h / 2, z], null, [r, h, r]);
      B.add('paint', G.cyl(1, 1, 14), C(c), [x, h * 0.6, z], null, [r * 1.01, h * 0.35, r * 1.01]);
      B.add('paint', G.cyl(1, 1, 14), C(c), [x, h + 0.01, z], null, [r * 0.92, 0.03, r * 0.92]);
      B.add('brass', G.torus(TAU, 0.08, 14), C(0xeef2f8), [x, h, z], [PI / 2, 0, 0], [r, r, r]);
      for (let k = 0; k < 3; k++) { const a = rnd() * TAU; B.add('paint', G.capsule(1, 8), C(c), [x + Math.sin(a) * r, h * 0.82, z + Math.cos(a) * r], null, [0.06 * s, 0.12 * s + rnd() * 0.12 * s, 0.06 * s]); }
      B.seg('wood', [x + r * 0.2, h * 0.9, z], [x + r * 1.1, h * 2.0, z - r * 0.3], 0.05 * s, C(PAL.woodL), 0.04 * s, 6);
      B.add('cloth', G.sphere(10, 8), C(c), [x + r * 0.15, h * 0.88, z + 0.02], null, [0.09 * s, 0.14 * s, 0.09 * s]);
    } else {
      const a = rnd() * TAU, dx = Math.sin(a), dz = Math.cos(a);
      B.add('brass', G.cyl(1, 1, 14), C(0xd8dde8), [x, r, z], [PI / 2, a, 0], [r, h, r]);
      B.add('paint', G.cyl(1, 1, 20), C(c), [x + dx * h * 0.51, r, z + dz * h * 0.51], [PI / 2, a, 0], [r * 0.92, 0.03, r * 0.92]);
    }
  }
  // boya birikintisi (zemin): tek ağ yassı lekeler
  function puddle(B, x, z, c, rnd) {
    for (let k = 0; k < 6; k++) { const a = rnd() * TAU, d = k ? 0.4 + rnd() * 0.8 : 0; B.add('paint', G.sphere(14, 6), C(c), [x + Math.sin(a) * d, 0.02, z + Math.cos(a) * d], null, [k ? 0.35 + rnd() * 0.3 : 1.1, 0.025, k ? 0.3 + rnd() * 0.3 : 0.9]); }
    B.add('glow', G.sphere(8, 4), C(0xffffff, 0.9), [x - 0.3, 0.05, z - 0.2], null, [0.2, 0.01, 0.1]);
  }
  // boya kalemi (yerde yatan)
  function crayon(B, x, z, s, c, a) {
    const dx = Math.sin(a), dz = Math.cos(a);
    B.add('paint', G.cyl(1, 1, 12), C(c), [x, 0.16 * s, z], [PI / 2, a, 0], [0.16 * s, 1.6 * s, 0.16 * s]);
    B.add('paint', G.cone(12), C(c), [x + dx * 0.95 * s, 0.16 * s, z + dz * 0.95 * s], [PI / 2, a, 0], [0.16 * s, 0.32 * s, 0.16 * s]);
    B.add('cloth', G.cyl(1, 1, 12), C(0xfff4e2), [x, 0.16 * s, z], [PI / 2, a, 0], [0.165 * s, 0.7 * s, 0.165 * s]);
  }
  // oyuncak rafı (kuzey): iki raf tahtası, üstünde oyuncaklar
  function toyShelf(B, x, z, s, rnd) {
    const w = 4.2 * s, wood = C(PAL.wood);
    for (const sd of [-1, 1]) B.add('wood', G.box(), C(PAL.woodD), [x + sd * w / 2, 2.2 * s, z], null, [0.2 * s, 4.4 * s, 0.9 * s]);
    for (const y of [0.1, 1.5, 2.9, 4.3]) B.add('wood', G.box(), wood, [x, y * s, z], null, [w, 0.14 * s, 1.0 * s]);
    B.add('wood', G.box(), C(PAL.woodD, 0.85), [x, 2.2 * s, z - 0.45 * s], null, [w, 4.4 * s, 0.08]);
    for (const y of [0.17, 1.57, 2.97]) {
      let px = x - w / 2 + 0.5 * s;
      while (px < x + w / 2 - 0.5 * s) {
        const k = (rnd() * 5) | 0, yy = y * s, c = TOYC[(rnd() * TOYC.length) | 0];
        if (k === 0) { // ayıcık
          B.add('cloth', G.sphere(9, 7), C(0xc98a4e), [px, yy + 0.35 * s, z], null, [0.3 * s, 0.34 * s, 0.26 * s]);
          B.add('cloth', G.sphere(9, 7), C(0xc98a4e), [px, yy + 0.82 * s, z + 0.03], null, 0.24 * s);
          for (const sd of [-1, 1]) B.add('cloth', G.sphere(8, 6), C(0xc98a4e), [px + sd * 0.17 * s, yy + 1.02 * s, z], null, 0.09 * s);
          B.add('cloth', G.sphere(8, 6), C(0xfbe8cc), [px, yy + 0.76 * s, z + 0.2 * s], null, [0.11 * s, 0.08 * s, 0.07 * s]);
          for (const sd of [-1, 1]) B.add('glow', G.sphere(6, 4), C(0x2a1a10), [px + sd * 0.08 * s, yy + 0.88 * s, z + 0.21 * s], null, 0.03 * s);
          px += 0.8 * s;
        } else if (k === 1) { // roket
          B.add('paint', G.cyl(1, 1, 14), C(0xffffff), [px, yy + 0.5 * s, z], null, [0.17 * s, 0.8 * s, 0.17 * s]);
          B.add('paint', G.cone(14), C(c), [px, yy + 1.1 * s, z], null, [0.17 * s, 0.4 * s, 0.17 * s]);
          for (let q = 0; q < 3; q++) { const a = q / 3 * TAU; B.add('paint', G.box(), C(c), [px + Math.sin(a) * 0.18 * s, yy + 0.2 * s, z + Math.cos(a) * 0.18 * s], [0, a, 0], [0.03, 0.3 * s, 0.2 * s]); }
          B.add('glow', G.sphere(8, 6), C(0x9fe0ff, 1.2), [px, yy + 0.6 * s, z + 0.17 * s], null, 0.07 * s);
          px += 0.6 * s;
        } else if (k === 2) { // top
          B.add('paint', G.sphere(10, 8), C(c), [px, yy + 0.33 * s, z], null, 0.33 * s);
          B.add('paint', G.torus(TAU, 0.12, 12), C(0xffffff), [px, yy + 0.33 * s, z], [0.4, 0, 0.3], [0.33 * s, 0.33 * s, 0.33 * s]);
          px += 0.8 * s;
        } else if (k === 3) { // davul
          B.add('paint', G.cyl(1, 1, 16), C(c), [px, yy + 0.3 * s, z], null, [0.3 * s, 0.5 * s, 0.3 * s]);
          B.add('paint', G.cyl(1, 1, 16), C(0xfff8ec), [px, yy + 0.56 * s, z], null, [0.29 * s, 0.03, 0.29 * s]);
          px += 0.75 * s;
        } else { // ördekçik
          B.add('paint', G.sphere(12, 9), C(0xffd84a), [px, yy + 0.25 * s, z], null, [0.3 * s, 0.22 * s, 0.24 * s]);
          B.add('paint', G.sphere(12, 9), C(0xffd84a), [px, yy + 0.52 * s, z + 0.08 * s], null, 0.16 * s);
          B.add('paint', G.sphere(8, 6), C(0xff8a3a), [px, yy + 0.5 * s, z + 0.24 * s], null, [0.08 * s, 0.04 * s, 0.08 * s]);
          px += 0.7 * s;
        }
      }
    }
  }
  // kocaman saat kadranı penceresi (kuzey duvarda): duvar + pirinç çerçeve + gece göğü + rakam işaretleri; akrep/yelkovan ayrı (hareketli)
  function clockWindow(B, api, x, z, R) {
    const y = R + 1.2;
    B.add('wood', G.box(), C(0x9a6440), [x, y, z - 0.6], null, [R * 2.8, y * 2 + 0.4, 0.8]);
    for (const sd of [-1, 1]) B.add('wood', G.box(), C(0x7a4a2c), [x + sd * R * 1.4, y, z - 0.15], null, [0.5, y * 2 + 0.4, 0.4]);
    B.add('wood', G.box(), C(0x7a4a2c), [x, y * 2 + 0.3, z - 0.15], null, [R * 2.9, 0.5, 0.5]);
    B.add('glow', G.cyl(1, 1, 48), C(0x1c2a5c), [x, y, z - 0.18], [PI / 2, 0, 0], [R, 0.05, R]);
    B.add('glow', G.cyl(1, 1, 48), C(0x2c3c78), [x, y - R * 0.2, z - 0.16], [PI / 2, 0, 0], [R * 0.75, 0.05, R * 0.6]);
    for (let k = 0; k < 26; k++) { const a = (k * 2.39996) % TAU, rr = R * 0.9 * Math.sqrt((k + 0.5) / 26); B.add('glow', G.octa(), C(k % 4 ? 0xfff2c0 : 0xbfe6ff, 1.6), [x + Math.cos(a) * rr, y + Math.sin(a) * rr, z - 0.12], [0, 0, a], [0.05 + (k % 3) * 0.03, 0.09 + (k % 3) * 0.04, 0.02]); }
    // hilal ay
    B.add('glow', G.sphere(20, 14), C(0xfff2b0, 1.5), [x + R * 0.45, y + R * 0.4, z - 0.11], null, [R * 0.17, R * 0.17, 0.03]);
    B.add('glow', G.sphere(20, 14), C(0x1c2a5c), [x + R * 0.52, y + R * 0.45, z - 0.09], null, [R * 0.15, R * 0.15, 0.03]);
    B.add('brass', G.torus(TAU, 0.1, 64), C(PAL.brass), [x, y, z - 0.1], null, [R, R, 1.2]);
    B.add('brass', G.torus(TAU, 0.05, 64), C(PAL.brassD), [x, y, z - 0.08], null, [R * 0.82, R * 0.82, 1]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; B.add('paint', G.rbox(2), C(i % 3 ? 0xfff4e2 : 0xffd25a), [x + Math.sin(a) * R * 0.9, y + Math.cos(a) * R * 0.9, z - 0.04], [0, 0, -a], [i % 3 ? 0.18 : 0.3, i % 3 ? 0.45 : 0.7, 0.1]); }
    B.add('glass', G.cyl(1, 1, 32), C(0xdfe8ff), [x, y, z - 0.02], [PI / 2, 0, 0], [R * 0.98, 0.02, R * 0.98]);
    api.light(x, y, z + 1.4, 0x9fb8ff, 1.6, 9, 0.05);
    api.glow(x, z + 2.2, R * 1.1, 0xb8c8ff, 0.12);
    // akrep + yelkovan (ayrı ağlar, yavaşça döner)
    const hk = new Kit(); hk.add(G.rbox(2), C(0x3a2a20), [0, R * 0.25, 0], null, [0.22, R * 0.55, 0.06]); hk.add(G.sphere(10, 8), C(0xffd25a), [0, 0, 0], null, 0.2);
    const mk = new Kit(); mk.add(G.rbox(2), C(0x3a2a20), [0, R * 0.36, 0], null, [0.15, R * 0.78, 0.05]); mk.add(K_star(), C(0xffd25a), [0, R * 0.72, 0.02], null, [0.5, 0.5, 0.3]);
    const hm = solo(hk, 'paint', api), mm = solo(mk, 'paint', api);
    hm.position.set(x, y, z + 0.06); mm.position.set(x, y, z + 0.1);
    return { hm, mm, x, y, z, R };
  }
  const K_star = () => keepGeo('star5', () => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, rr = i & 1 ? 0.2 : 0.5; s[i ? 'lineTo' : 'moveTo'](Math.sin(a) * rr, Math.cos(a) * rr); } const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }); g.translate(0, 0, -0.06); return g; });
  // müzik kutusu: gövde (statik) + dönen balerin + kurma kolu (ayrı ağlar)
  function musicBox(B, api, x, z, c) {
    const body = c ? 0x7fd8c8 : 0xff9ec2, trim = PAL.brass;
    B.add('paint', G.rbox(3), C(body), [x, 0.5, z], null, [1.7, 1.0, 1.3]);
    B.add('brass', G.box(), C(trim), [x, 0.08, z], null, [1.76, 0.12, 1.36]);
    B.add('brass', G.box(), C(trim), [x, 0.98, z], null, [1.74, 0.07, 1.34]);
    for (let k = 0; k < 4; k++) B.add('brass', G.sphere(8, 6), C(trim), [x + (k % 2 ? 0.8 : -0.8), 0.04, z + (k < 2 ? 0.6 : -0.6)], null, 0.12);
    // kapak (arkaya açık) + içinde ayna
    B.add('paint', G.rbox(2), C(body), [x, 1.62, z - 0.72], [-0.25, 0, 0], [1.7, 1.25, 0.12]);
    B.add('glass', G.box(), C(0xffffff), [x, 1.62, z - 0.64], [-0.25, 0, 0], [1.4, 1.0, 0.02]);
    for (let k = 0; k < 5; k++) B.add('paint', G.sphere(8, 6), C(TOYC[k]), [x - 0.6 + k * 0.3, 0.5, z + 0.66], null, [0.08, 0.08, 0.03]);
    B.add('paint', G.cyl(1, 1, 22), C(0xfff4e2), [x, 1.03, z], null, [0.45, 0.04, 0.45]);
    // balerin
    const bk = new Kit();
    bk.add(G.cyl(1, 1, 12), C(0xfff4e2), [0, 0.05, 0], null, [0.06, 0.1, 0.06]);
    bk.add(G.cyl(1, 1, 8), C(0xffd9c0), [0.02, 0.32, 0], null, [0.035, 0.42, 0.035]);
    bk.add(G.cone(18), C(0xffb3d6), [0, 0.58, 0], [PI, 0, 0], [0.32, 0.14, 0.32]);
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; bk.add(G.sphere(6, 4), C(0xffd6ea), [Math.sin(a) * 0.3, 0.52, Math.cos(a) * 0.3], null, [0.07, 0.03, 0.07]); }
    bk.add(G.cyl(0.7, 1, 12), C(0xff8fbf), [0, 0.75, 0], null, [0.09, 0.26, 0.07]);
    bk.add(G.sphere(12, 9), C(0xffd9c0), [0, 0.98, 0], null, 0.1);
    bk.add(G.sphere(10, 8), C(0x6a3a2a), [0, 1.04, -0.03], null, [0.1, 0.08, 0.09]);
    bk.add(G.sphere(8, 6), C(0x6a3a2a), [0, 1.09, -0.07], null, 0.05);
    bk.add(G.torus(PI, 0.09, 16), C(0xffd9c0), [0, 1.12, 0], [0, 0, 0], [0.22, 0.22, 0.22]);
    for (const sd of [-1, 1]) bk.add(G.sphere(6, 4), C(0xff7fa8), [sd * 0.05, 0.96, 0.085], null, 0.02);
    const bal = solo(bk, 'paint', api, false); bal.position.set(x, 1.05, z);
    const ck = new Kit(); ck.add(G.cyl(1, 1, 8), C(trim), [0.12, 0, 0], [0, 0, PI / 2], [0.04, 0.24, 0.04]); ck.add(G.box(), C(trim), [0.24, 0.15, 0], null, [0.05, 0.3, 0.05]); ck.add(G.sphere(8, 6), C(0xff5f9e), [0.24, 0.32, 0], null, 0.07);
    const crank = solo(ck, 'brass', api, false); crank.position.set(x + 0.85, 0.55, z);
    api.light(x, 2.2, z + 0.6, c ? 0x9ff0e0 : 0xffb8d8, 1.2, 5, 0.05);
    return { bal, crank, x, z };
  }
  // oyuncak tren yolu + tren (lokomotif + 2 vagon)
  function trainGeo(kind) {
    return keepGeo('train' + kind, () => {
      const k = new Kit();
      if (kind === 0) {
        k.add(G.rbox(2), C(PAL.red), [0, 0.55, -0.35], null, [0.9, 0.7, 0.8]);
        k.add(G.rbox(2), C(0x2a3a6a), [0, 1.0, -0.35], null, [1.0, 0.14, 0.95]);
        k.add(G.cyl(1, 1, 18), C(PAL.blu), [0, 0.6, 0.35], [PI / 2, 0, 0], [0.38, 0.9, 0.38]);
        k.add(G.cyl(1, 1, 18), C(PAL.yel), [0, 0.6, 0.82], [PI / 2, 0, 0], [0.3, 0.06, 0.3]);
        k.add(G.cyl(1.4, 1, 14), C(0x3a3a4a), [0, 1.12, 0.5], null, [0.14, 0.35, 0.14]);
        k.add(G.sphere(10, 8), C(PAL.yel), [0, 0.94, 0.1], null, 0.12);
        for (const sd of [-1, 1]) k.add(G.box(), C(0xbfe6ff), [sd * 0.46, 0.68, -0.35], null, [0.02, 0.28, 0.4]);
        k.add(G.cone(4), C(PAL.yel), [0, 0.22, 0.95], [PI / 2 + 0.6, PI / 4, 0], [0.4, 0.3, 0.2]);
      } else {
        const c = kind === 1 ? PAL.grn : PAL.pur;
        k.add(G.rbox(2), C(c), [0, 0.45, 0], null, [0.9, 0.42, 1.2]);
        for (let q = 0; q < 3; q++) k.add(G.rbox(2), C(TOYC[(q + kind * 2) % TOYC.length]), [(q - 1) * 0.26, 0.82, (q % 2 - 0.5) * 0.4], [0, q, 0], [0.32, 0.32, 0.32]);
        k.add(G.box(), C(0x3a3a4a), [0, 0.45, -0.68], null, [0.12, 0.08, 0.2]);
      }
      for (const sd of [-1, 1]) for (const zz of kind === 0 ? [-0.5, 0.15, 0.6] : [-0.4, 0.4]) { k.add(G.cyl(1, 1, 16), C(kind === 0 ? PAL.yel : 0xffffff), [sd * 0.46, 0.2, zz], [0, 0, PI / 2], [0.2, 0.08, 0.2]); k.add(G.cyl(1, 1, 10), C(PAL.red), [sd * 0.5, 0.2, zz], [0, 0, PI / 2], [0.06, 0.04, 0.06]); }
      return k.build();
    });
  }
  function trainTrack(B, T) {
    const N = 64;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, x = T.x + Math.sin(a) * T.rx, z = T.z + Math.cos(a) * T.rz, a2 = (i + 1) / N * TAU, x2 = T.x + Math.sin(a2) * T.rx, z2 = T.z + Math.cos(a2) * T.rz;
      const yaw = Math.atan2(x2 - x, z2 - z);
      B.add('wood', G.box(), C(PAL.woodD), [x, 0.04, z], [0, yaw, 0], [1.25, 0.07, 0.22]);
      for (const sd of [-1, 1]) { const nx = Math.cos(yaw) * sd * 0.42, nz = -Math.sin(yaw) * sd * 0.42; B.seg('brass', [x + nx, 0.11, z + nz], [x2 + nx, 0.11, z2 + nz], 0.05, C(0xd8dde8), 0.05, 5); }
    }
  }
  // tren durağı tabelası + zil direği
  function trainStop(B, x, z) {
    B.add('wood', G.cyl(1, 1, 10), C(0xffffff), [x, 0.95, z], null, [0.06, 1.9, 0.06]);
    B.add('paint', G.rbox(2), C(PAL.red), [x, 1.95, z], null, [0.75, 0.42, 0.1]);
    B.add('paint', G.sphere(10, 8), C(0xffffff), [x - 0.17, 1.95, z + 0.06], null, [0.08, 0.08, 0.03]);
    B.add('paint', G.sphere(10, 8), C(0xffffff), [x + 0.17, 1.95, z + 0.06], null, [0.08, 0.08, 0.03]);
    B.add('brass', G.cone(16), C(PAL.brass), [x, 2.3, z], null, [0.16, 0.24, 0.16]);
  }
  // oyuncak sandığı (gizli): gövde statik, kapak ayrı (açılır)
  function toyChest(B, api, x, z) {
    B.add('wood', G.rbox(2), C(0x6fb8ff), [x, 0.45, z], null, [1.5, 0.9, 1.0]);
    for (const sd of [-1, 1]) B.add('brass', G.box(), C(PAL.brass), [x + sd * 0.55, 0.45, z], null, [0.1, 0.92, 1.02]);
    for (let k = 0; k < 3; k++) B.add('paint', K_star(), C(TOYC[k * 2]), [x - 0.3 + k * 0.3, 0.5, z + 0.51], null, [0.3, 0.3, 0.2]);
    const lk = new Kit(); lk.add(G.rbox(2), C(0x8fd0ff), [0, 0.08, 0.5], null, [1.55, 0.18, 1.05]); lk.add(G.box(), C(PAL.brass), [0, 0.1, 1.02], null, [0.2, 0.2, 0.06]);
    const lid = solo(lk, 'paint', api, false); lid.position.set(x, 0.9, z - 0.5);
    return lid;
  }
  // geçit kemeri: iki blok kule + üstte çark (koridorun iki yanında, yürünmez alanda)
  function gateArch(B, api, L, k, rnd) {
    const a = L.areas[k], prev = L.areas[k - 1];
    if (!a || !a.gate || !prev) return;
    const r0 = L.rooms[Math.max(...prev.rooms.filter(i => L.rooms[i].kind !== 'side'))], r1 = L.rooms[a.rooms[0]];
    if (!r0 || !r1) return;
    let dx = r1.x - r0.x, dz = r1.z - r0.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    const px = -dz, pz = dx, x = a.gate.x, z = a.gate.z;
    let ha = 0, hb = 0;
    while (ha < 7 && api.isFloor(x + px * ha, z + pz * ha)) ha += 0.25;
    while (hb < 7 && api.isFloor(x - px * hb, z - pz * hb)) hb += 0.25;
    for (const [sd, h] of [[1, ha], [-1, hb]]) {
      const tx = x + px * sd * (h + 0.9), tz = z + pz * sd * (h + 0.9);
      if (api.isFloor(tx, tz)) continue;
      const south = pz * sd > 0.5 || !tallOk(api, tx, tz, 8);
      blocks(B, tx, tz, south ? 1 : 4, 0.95, rnd);
    }
  }

  // ── Büyük oyuncaklar (geçitlerde / kenarlarda "işaret" olsun) ──
  // dev oturan oyuncak ayı (statik, birleştirilmiş): yüzü odaya döner
  function giantTeddy(B, x, z, s, face) {
    const fur = C(0xd29a62), furL = C(0xecc292), pad = C(0xffb8c8), fx = Math.sin(face), fz = Math.cos(face), rx = Math.cos(face), rz = -Math.sin(face);
    const P3 = (lx, y, lz) => [x + rx * lx + fx * lz, y, z + rz * lx + fz * lz];
    B.add('cloth', G.sphere(18, 14), fur, P3(0, 1.5 * s, 0), [0, face, 0], [1.45 * s, 1.5 * s, 1.3 * s]);
    B.add('cloth', G.sphere(16, 12), furL, P3(0, 1.35 * s, 0.75 * s), [0, face, 0], [0.95 * s, 1.0 * s, 0.6 * s]);
    B.add('cloth', G.sphere(18, 14), fur, P3(0, 3.35 * s, 0.1 * s), null, [1.1 * s, 1.05 * s, 1.0 * s]);
    B.add('cloth', G.sphere(14, 10), C(0xfbe8cc), P3(0, 3.15 * s, 0.95 * s), [0, face, 0], [0.48 * s, 0.38 * s, 0.32 * s]);
    B.add('paint', G.sphere(10, 8), C(0x4a2a1a), P3(0, 3.3 * s, 1.24 * s), null, [0.17 * s, 0.12 * s, 0.1 * s]);
    for (const sd of [-1, 1]) {
      B.add('cloth', G.sphere(12, 10), fur, P3(sd * 0.85 * s, 4.2 * s, 0), [0, face, 0], [0.42 * s, 0.42 * s, 0.22 * s]);
      B.add('cloth', G.sphere(10, 8), pad, P3(sd * 0.85 * s, 4.18 * s, 0.12 * s), [0, face, 0], [0.26 * s, 0.26 * s, 0.1 * s]);
      B.add('paint', G.sphere(10, 8), C(0x2a1a10), P3(sd * 0.38 * s, 3.6 * s, 0.95 * s), null, 0.13 * s);
      B.add('glow', G.sphere(6, 4), C(0xffffff, 1.3), P3(sd * 0.38 * s - 0.04 * s, 3.66 * s, 1.07 * s), null, 0.045 * s);
      B.add('cloth', G.sphere(10, 8), C(0xff9eb4), P3(sd * 0.62 * s, 3.1 * s, 0.8 * s), null, [0.18 * s, 0.1 * s, 0.05 * s]);
      B.add('cloth', G.sphere(14, 10), fur, P3(sd * 1.35 * s, 1.7 * s, 0.45 * s), [0, face, sd * 0.5], [0.45 * s, 0.85 * s, 0.45 * s]);
      B.add('cloth', G.sphere(14, 10), fur, P3(sd * 0.75 * s, 0.5 * s, 1.0 * s), [0, face, 0], [0.55 * s, 0.5 * s, 0.85 * s]);
      B.add('cloth', G.sphere(12, 8), pad, P3(sd * 0.75 * s, 0.5 * s, 1.84 * s), [0, face, 0], [0.36 * s, 0.36 * s, 0.06 * s]);
      B.add('paint', G.sphere(12, 8), C(0xff4f7a), P3(sd * 0.28 * s, 2.55 * s, 0.98 * s), [0, face, 0], [0.32 * s, 0.2 * s, 0.12 * s]);
    }
    B.add('paint', G.torus(PI, 0.06, 12), C(0x5a2a1a), P3(0, 3.05 * s, 1.18 * s), [PI, face, 0], [0.16 * s, 0.12 * s, 0.16 * s]);
    B.add('cloth', G.rbox(1), C(0x7ab8ff), P3(0.6 * s, 1.0 * s, 1.12 * s), [0, face, 0.2], [0.5 * s, 0.45 * s, 0.05 * s]);
  }
  // dönme dolap: ayaklar statik, çark + 8 renkli kabin tek ağ (yavaşça döner)
  const wheelGeo = () => keepGeo('dolap', () => {
    const k = new Kit(), R = 1;
    for (const zz of [-0.32, 0.32]) {
      k.add(G.torus(TAU, 0.035, 40), C(0xffffff), [0, 0, zz], null, [R, R, R]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; k.add(G.box(), C(0xffd25a), [Math.sin(a) * R / 2, Math.cos(a) * R / 2, zz], [0, 0, -a], [0.035, R, 0.035]); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; k.add(G.sphere(6, 4), C(TOYC[i % 7]), [Math.sin(a) * R, Math.cos(a) * R, zz * 1.12], null, 0.045); }
    }
    k.add(G.cyl(1, 1, 16), C(0xff5f9e), [0, 0, 0], [PI / 2, 0, 0], [0.12, 0.8, 0.12]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, cx = Math.sin(a) * R, cy = Math.cos(a) * R - 0.2;
      k.add(G.rbox(1), C(TOYC[i % 7]), [cx, cy, 0], null, [0.24, 0.22, 0.42]); k.add(G.cyl(1, 1, 6), C(0xffffff), [cx, cy + 0.15, 0], null, [0.02, 0.1, 0.02]); }
    return k.build();
  });
  function ferrisWheel(B, api, x, z, s) {
    const R = 2.6 * s, H = R + 0.7;
    B.add('paint', G.rbox(1), C(0x3fc8c0), [x, 0.25, z], null, [R * 1.9, 0.5, 1.4]);
    for (const zz of [-0.55, 0.55]) for (const sd of [-1, 1]) B.seg('paint', [x + sd * R * 0.85, 0.4, z + zz], [x, H, z + zz * 0.7], 0.09, C(0xfff4e2), 0.07, 8);
    const m = new THREE.Mesh(wheelGeo(), mat('paint')); m.position.set(x, H, z); m.scale.set(R, R, 1.3); m.receiveShadow = true; api.add(m);
    api.light(x, H, z + 2, 0xffd8f0, 1.0, 7, 0.08);
    return m;
  }
  // büyük oyuncak yeri: (x0,z0) çevresinde dMin..dMax uzakta, yarıçap rad içinde yürünür zemin yok, önü (kuzeyi) açık
  function bigSpot(api, L, x0, z0, dMin, dMax, rad, taken) {
    for (let d = dMin; d <= dMax; d += 1) for (let k = 0; k < 16; k++) {
      const a = k / 16 * TAU + d, x = x0 + Math.sin(a) * d, z = z0 + Math.cos(a) * d;
      if (x < 0 || z < 0 || x > L.W || z > L.H || api.linkDist(x, z) < rad + 1) continue;
      let ok = true;
      for (let q = 0; q < 12 && ok; q++) { const b = q / 12 * TAU; for (const rr of [rad * 0.5, rad]) if (api.isFloor(x + Math.sin(b) * rr, z + Math.cos(b) * rr)) { ok = false; break; } }
      if (z > z0 - 1.5 || !ok || !tallOk(api, x, z, 10, rad) || taken.some(t => hyp(t.x - x, t.z - z) < t.r + rad)) continue;   // (yalnız kuzey: kamera tarafında büyük oyuncak yok)
      return { x, z };
    }
    return null;
  }

  // ════════ Görsel kurulum ════════
  let ANIM = null;   // { gears, pend, … } (bölüm başına)
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
    const D = L.atl || { taken: [], boxes: [], puddles: [], rugs: [], puzz: [] };
    const B = batch(api), rnd = api.rnd, R = L.rooms;
    const areaOf = i => (L.areas || []).findIndex(a => a.rooms.includes(i));
    const S = ANIM = { gears: [], pend: [], hands: [], boxes: [], wheels: [], train: null, zones: [], t: 0, gearK: 1, trail: 0, trailC: 0xffffff };
    // ── zemin: tahta + yapboz (blok kuleleri, arena) + müzik halısı (saat odası) ──
    floor(L, api, (x, z) => {
      let p = 0, rg = 0;
      for (const q of D.puzz) { const d = hyp(x - q.x, z - q.z); if (d < q.r) p = Math.max(p, d < q.r - 1 ? 1 : (q.r - d)); }
      for (const q of D.rugs) { const d = hyp(x - q.x, z - q.z); if (d < q.r) rg = Math.max(rg, d < q.r - 1 ? 1 : (q.r - d)); }
      return [p, rg];
    });
    yield;
    api.dreamEdge();
    // ── oda çevresi (yürünmez alan): alana göre dev süsler; kuzey yüksek, güney alçak ──
    const gearSpots = [];
    R.forEach((rm, i) => {
      const ar = areaOf(i), boss = rm.kind === 'boss';
      if (boss) return;
      ring(api, rm, 9, 1.9, (x, z, south) => {
        if (south) { (rnd() < 0.5 ? spool(B, x, z, 0.7 + rnd() * 0.2, TOYC[(rnd() * 7) | 0], rnd) : blocks(B, x, z, 1, 0.8, rnd)); return; }
        if (ar <= 0) { if (rnd() < 0.55) gearSpots.push({ x, z, R: 1.6 + rnd() * 1.4 }); else S.pend.push(grandClock(B, x, z, 0.9 + rnd() * 0.2, Math.atan2(rm.x - x, rm.z - z))); }
        else if (ar === 1) { blocks(B, x, z, 3 + ((rnd() * 3) | 0), 1.0, rnd); }
        else if (ar === 2) { if (rnd() < 0.5) blocks(B, x, z, 4 + ((rnd() * 3) | 0), 1.1, rnd); else paintPot(B, x, z, 1.4, TOYC[(rnd() * 7) | 0], false, rnd); }
        else { if (rnd() < 0.5) toyShelf(B, x, z, 0.85, rnd); else S.pend.push(grandClock(B, x, z, 1.0, Math.atan2(rm.x - x, rm.z - z))); }
      });
      // dış halka: daha uzakta, kuzeyde yüksek dolgu (kenar boş kalmasın)
      ring(api, rm, 8, 2.4, (x, z, south) => {
        if (south) { blocks(B, x, z, 1, 1.1, rnd); return; }
        const k = rnd();
        if (k < 0.35) blocks(B, x, z, 4 + ((rnd() * 3) | 0), 1.3, rnd);
        else if (k < 0.6) toyShelf(B, x, z, 1.0, rnd);
        else if (k < 0.8) spool(B, x, z, 1.5, TOYC[(rnd() * 7) | 0], rnd);
        else B.add('brass', gearGeo(16), C(PAL.brass), [x, 3.2, z], [0, 0, rnd()], [3, 3, 0.5]);
      }, { gap: 5.0, jit: 2.5, link: 3.5 });
      api.glow(rm.x, rm.z, rm.r * 0.95, ar === 3 ? 0xd8c8ff : 0xffe2b8, 0.1);
    });
    yield;
    // ── kıyı süsleri (ekranda görünür) ──
    const avoid = (D.taken || []).map(q => ({ x: q.x, z: q.z, r: q.r * 0.7 })).concat((L.areas || []).filter(a => a.gate).map(a => ({ x: a.gate.x, z: a.gate.z, r: 4.5 })));
    if (L.exit) avoid.push({ x: L.exit.x, z: L.exit.z, r: 5 });
    if (D.train) avoid.push({ x: D.train.x, z: D.train.z, r: Math.max(D.train.rx, D.train.rz) + 1.5 });
    const edgeList = edgeSpots(L, api, { avoid, space: 2.6 });
    for (const c of edgeList) {
      const ar = areaOf(c.room), rmk = R[c.room];
      if (rmk && rmk.kind === 'boss') continue;
      const low = c.side === 'south', mid = c.side === 'side';
      if (low) { const k = rnd(); if (k < 0.3) spool(B, c.x, c.z, 0.55, TOYC[(rnd() * 7) | 0], rnd); else if (k < 0.65) blocks(B, c.x, c.z, 1, 0.6, rnd); else if (k < 0.8) paintPot(B, c.x, c.z, 0.7, TOYC[(rnd() * 7) | 0], rnd() < 0.5, rnd); else crayon(B, c.x, c.z, 0.9, TOYC[(rnd() * 7) | 0], rnd() * TAU); continue; }
      if (ar <= 0) { if (mid) spool(B, c.x, c.z, 0.65, TOYC[(rnd() * 7) | 0], rnd); else gearSpots.push({ x: c.x - c.nx * 0.6, z: c.z - c.nz * 0.6, R: 0.9 + rnd() * 0.5, small: true }); }
      else if (ar === 1) { blocks(B, c.x, c.z, mid ? 2 : 3, 0.75, rnd); }
      else if (ar === 2) { if (mid) paintPot(B, c.x, c.z, 0.8, TOYC[(rnd() * 7) | 0], rnd() < 0.4, rnd); else blocks(B, c.x, c.z, 3 + ((rnd() * 2) | 0), 0.8, rnd); }
      else { if (mid) spool(B, c.x, c.z, 0.7, TOYC[(rnd() * 7) | 0], rnd); else blocks(B, c.x, c.z, 2, 0.7, rnd); }
    }
    // zemine serpili küçük şeyler: boya kalemleri, minik çarklar, düğmeler
    for (const f of floorSpots(L, api, 14, { avoid })) {   // SADE: yürünür alanda az, küçük süs
      const ar = areaOf(f.room), k = rnd();
      if (ar === 2 || k < 0.3) crayon(B, f.x, f.z, 0.45, TOYC[(rnd() * 7) | 0], rnd() * TAU);
      else if (k < 0.65) { B.add('brass', gearGeo(10), C(PAL.brass), [f.x, 0.05, f.z], [PI / 2, 0, rnd()], [0.32, 0.32, 0.08]); }
      else { const c = TOYC[(rnd() * 7) | 0]; B.add('paint', G.cyl(1, 1, 16), C(c), [f.x, 0.04, f.z], null, [0.28, 0.06, 0.28]); for (let q = 0; q < 4; q++) B.add('glow', G.sphere(5, 4), C(0x3a2a20), [f.x + (q % 2 - 0.5) * 0.12, 0.08, f.z + ((q >> 1) - 0.5) * 0.12], null, 0.03); }
    }
    yield;
    // ── uzak dolgu: yürünür alandan 3–13 m uzaktaki boşluğa ızgara + sapma ile oyuncak yığınları (kenar boş görünmesin) ──
    {
      const STEP = 4.6;
      for (let z = 1; z < L.H - 1; z += STEP) for (let x = 1; x < L.W - 1; x += STEP) {
        const px = x + (rnd() - 0.5) * 2, pz = z + (rnd() - 0.5) * 2;
        if (api.isFloor(px, pz) || api.linkDist(px, pz) < 3) continue;
        let dmin = 99;
        for (let a = 0; a < 16 && dmin > 3; a++) { const ca = Math.sin(a / 16 * TAU), cb = Math.cos(a / 16 * TAU); for (let d = 1; d < Math.min(dmin, 13); d += 1) if (api.isFloor(px + ca * d, pz + cb * d)) { dmin = d; break; } }
        if (dmin < 3 || dmin > 12) continue;
        const tallFar = dmin >= 4;   // (yüksek yığınlar yürünür alana 4 m'den yakın değil)
        if (avoid.some(q => hyp(q.x - px, q.z - pz) < q.r)) continue;
        const tall = tallFar && tallOk(api, px, pz, 10), k = rnd(), c = TOYC[(rnd() * 7) | 0];
        if (tall) {
          if (k < 0.35) blocks(B, px, pz, 2 + ((rnd() * 3) | 0), 1.0 + rnd() * 0.2, rnd);
          else if (k < 0.55) spool(B, px, pz, 1.4 + rnd() * 0.6, c, rnd);
          else if (k < 0.62) toyShelf(B, px, pz, 1.0, rnd);
          else if (k < 0.85) paintPot(B, px, pz, 1.8, c, false, rnd);
          else B.add('brass', gearGeo(16), C(rnd() < 0.5 ? PAL.brass : 0xd88a4a), [px, 2.4, pz], [0, 0, rnd()], [2.2, 2.2, 0.4]);
        } else {
          if (k < 0.4) blocks(B, px, pz, 1, 0.7, rnd);
          else if (k < 0.7) spool(B, px, pz, 0.65, c, rnd);
          else if (k < 0.85) paintPot(B, px, pz, 0.75, c, rnd() < 0.5, rnd);
          else crayon(B, px, pz, 1.4, c, rnd() * TAU);
        }
      }
    }
    yield;
    // ── dönen çarklar (hareketli: en büyük 14 tanesi ayrı ağ, gerisi statik) ──
    gearSpots.sort((a, b) => b.R - a.R);
    gearSpots.forEach((g, i) => {
      const teeth = g.R > 1.5 ? 16 : 10, y = g.R + 0.15, c = i % 3 === 2 ? 0xd88a4a : PAL.brass;
      if (i < 8) {   // SADE: aynı anda az hareketli süs
        // (hareketli çarklar: tek renkli paylaşılan malzeme — pirinç ya da bakır)
        const m = new THREE.Mesh(gearGeo(teeth), i % 3 === 2 ? copperMat() : brassMat()); m.castShadow = false; m.receiveShadow = true;
        m.position.set(g.x, y, g.z); m.scale.set(g.R, g.R, 0.35 * Math.min(1.4, g.R));
        api.add(m); S.gears.push({ m, w: (i % 2 ? 1 : -1) * (0.5 / g.R) });
        B.add('wood', G.cyl(1, 1, 10), C(PAL.woodD), [g.x, y / 2, g.z - 0.3], null, [0.12, y, 0.12]);
      } else B.add('brass', gearGeo(teeth), C(c), [g.x, y, g.z], [0, 0, rnd()], [g.R, g.R, 0.35]);
    });
    // çark koridorunda yere gömülü, yavaşça dönen dev pirinç çark (üstünden yürünür; yalnız görüntü)
    for (const fg of D.floorGears || []) {
      const m = new THREE.Mesh(gearGeo(16), brassMat()); m.rotation.x = -PI / 2; m.position.set(fg.x, 0.02, fg.z); m.scale.set(fg.R, fg.R, 0.05);
      api.add(m); S.gears.push({ m, w: 0.12, floor: true });
      B.add('paint', G.cyl(1, 1, 24), C(0xff8f9a), [fg.x, 0.035, fg.z], null, [fg.R * 0.16, 0.03, fg.R * 0.16]);
    }
    // sarkaçlar
    S.pend = S.pend.slice(0, 10);
    for (const p of S.pend) { const m = new THREE.Mesh(pendGeo(), brassMat()); m.position.set(p.px, p.py, p.pz); m.rotation.y = p.face; m.scale.setScalar(p.len); api.add(m); p.m = m; p.ph = rnd() * TAU; }
    // ── geçit kemerleri ──
    (L.areas || []).forEach((a, k) => { if (k && a.gate) gateArch(B, api, L, k, rnd); });
    // ── büyük oyuncaklar: alan geçitlerinin yanında + oda kenarlarında (dönme dolap, dev ayıcık, dev blok kulesi) ──
    {
      const big = [], near = (x, z) => { let br = R[0], bd = 1e9; for (const rm of R) { const d = hyp(rm.x - x, rm.z - z); if (d < bd) { bd = d; br = rm; } } return br; };
      const KINDS = ['dolap', 'ayi', 'kule'];
      const place = (kind, p) => {
        const rm = near(p.x, p.z);
        if (kind === 'dolap') { if (S.wheels.length < 2) S.wheels.push(ferrisWheel(B, api, p.x, p.z, 1)); else giantTeddy(B, p.x, p.z, 0.85, Math.atan2(rm.x - p.x, rm.z - p.z)); }
        else if (kind === 'ayi') giantTeddy(B, p.x, p.z, 0.95, Math.atan2(rm.x - p.x, rm.z - p.z));
        else { blocks(B, p.x, p.z, 5 + ((rnd() * 2) | 0), 1.3, rnd); }
        big.push({ x: p.x, z: p.z, r: 3.5 });
      };
      (L.areas || []).forEach((a, k) => { if (!k || !a.gate) return; const p = bigSpot(api, L, a.gate.x, a.gate.z, 4.5, 10, 4, big); if (p) place(KINDS[(k - 1) % 3], p); });
      let n = 0;
      R.forEach((rm, i) => { if (rm.kind === 'boss' || n >= 3 || i % 2) return; const p = bigSpot(api, L, rm.x, rm.z, rm.r + 4, rm.r + 9, 4, big); if (p) { place(KINDS[(i / 2 + 1) % 3 | 0], p); n++; } });
    }
    yield;
    // ── Çark Düğmesi ──
    if (D.button) {
      const b = D.button;
      B.add('brass', G.cyl(1, 1, 24), C(PAL.brassD), [b.x, 0.12, b.z], null, [0.9, 0.24, 0.9]);
      B.add('brass', gearGeo(12), C(PAL.brass), [b.x, 0.26, b.z], [PI / 2, 0, 0], [0.95, 0.95, 0.12]);
      const k = new Kit(); k.add(G.cyl(1, 1, 24), C(0xff5f6d), [0, 0, 0], null, [0.55, 0.22, 0.55]); k.add(G.sphere(16, 8), C(0xff8f9a), [0, 0.11, 0], null, [0.5, 0.1, 0.5]);
      const top = solo(k, 'paint', api, false); top.position.set(b.x, 0.38, b.z);
      api.light(b.x, 1.5, b.z, 0xffb070, 1.2, 4.5, 0.1);
      const st = { x: b.x, z: b.z, r: 1.1, top, pressed: 0, cd: 0 };
      S.zones.push({ x: b.x, z: b.z, r: 6, enter: () => say('pr_atolye_dugme') });
      S.button = st;
    }
    // ── Tren ──
    if (D.train) {
      const T = D.train;
      trainTrack(B, T);
      const cars = [0, 1, 2].map(k => { const m = new THREE.Mesh(trainGeo(k), mat('paint')); m.castShadow = false; m.receiveShadow = true; api.add(m); return m; });
      S.train = { T, cars, u: 0, puffT: 0, tootT: 3 };
      if (D.bell) { trainStop(B, D.bell.x, D.bell.z); S.zones.push({ x: D.bell.x, z: D.bell.z, r: 2.4, enter: () => { sfx('bell', { x: D.bell.x, z: D.bell.z, pitch: 1.4 }); sfx('bell', { x: D.bell.x, z: D.bell.z, pitch: 1.8 }); S.train.tootT = 0; } }); }
      S.zones.push({ x: T.x, z: T.z, r: Math.max(T.rx, T.rz) + 4, enter: () => say('pr_atolye_tren') });
      api.light(T.x, 2.6, T.z, 0xffe0a0, 1.2, 7, 0.05);
    }
    // ── Boya birikintileri (renkli iz) ──
    for (const p of D.puddles || []) {
      puddle(B, p.x, p.z, p.c, rnd); paintPot(B, p.x - 1.3, p.z - 0.6, 0.9, p.c, true, rnd);
      S.zones.push({ x: p.x, z: p.z, r: 1.4, enter: () => { S.trail = 6; S.trailC = p.c; sfx('splat', { x: p.x, z: p.z, pitch: 1.4, vol: 0.5 }); burst('sparkle', p.x, 0.4, p.z, { color: '#' + new THREE.Color(p.c).getHexString(), count: 7 }); say('pr_atolye_boya'); } });
    }
    // ── Müzik kutuları ──
    for (const bx of D.boxes || []) {
      const mb = musicBox(B, api, bx.x, bx.z, bx.c);
      mb.play = 0; S.boxes.push(mb);
      S.zones.push({ x: bx.x, z: bx.z, r: 2.6, enter: () => {
        if (mb.play > 0) return;
        mb.play = 7; sfx('oyuncakDans', { x: bx.x, z: bx.z, vol: 0.8 }); burst('note', bx.x, 2.2, bx.z, { count: 3 });
        if (!mb.paid) { mb.paid = true; sugar(bx.x, bx.z + 1.2, 6); }
        say('pr_atolye_muzik');
      } });
    }
    // ── Oyuncak sandığı (gizli) ──
    if (D.chest) {
      const c = D.chest, lid = toyChest(B, api, c.x, c.z);
      api.light(c.x, 1.6, c.z, 0xffe080, 1.4, 4, 0.15);
      const st = { lid, open: 0, done: false };
      S.chest = st;
      S.zones.push({ x: c.x, z: c.z, r: 2.0, enter: () => {
        if (st.done) return; st.done = true; st.open = 0.001;
        sfx('chest', { x: c.x, z: c.z }); setTimeout(() => { gold(c.x, c.z + 0.8, 'atolye_sandik'); sugar(c.x, c.z + 1, 8); }, 500);
        say('pr_atolye_sandik', { gap: 0 });
      } });
    }
    yield;
    // ── Saat kadranı pencereleri: saat odasının ilk odası (kuzey) + arena ──
    const a4 = ((L.areas || [])[3] || { rooms: [] }).rooms.filter(i => R[i] && R[i].kind !== 'side');
    const winRooms = [a4[0], a4[1]].filter(i => i !== undefined).map(i => R[i]);
    if (D.arena) winRooms.push(D.arena);
    for (const rm of winRooms) {
      const big = rm === D.arena, e = edge(api, rm, 0, -1), Rw = big ? 4.6 : 3.2, z = e.z - (big ? 2.4 : 1.8);
      let ok = tallOk(api, rm.x, z, 12, Rw * 1.3);
      for (let q = -3; q <= 3 && ok; q++) for (const dz of [-0.5, 0, 0.6]) if (api.isFloor(rm.x + q * Rw * 0.4, z + dz)) ok = false;
      if (!ok) continue;
      S.hands.push(clockWindow(B, api, rm.x, z, Rw));
      if (big) { // arena: iki yanda çark duvarı + müzik kutusu kaideleri
        for (const sd of [-1, 1]) {
          const gx = rm.x + sd * Rw * 1.9, gz = z + 0.3;
          if (api.isFloor(gx, gz + 1) || !tallOk(api, gx, gz, 10, 2.5)) continue;
          const m = new THREE.Mesh(gearGeo(16), brassMat()); m.position.set(gx, 2.6, gz); m.scale.set(2.2, 2.2, 0.6); api.add(m); S.gears.push({ m, w: sd * 0.25 });
          const m2 = new THREE.Mesh(gearGeo(10), copperMat()); m2.position.set(gx - sd * 2.2, 5.0, gz - 0.2); m2.scale.set(1.3, 1.3, 0.5); api.add(m2); S.gears.push({ m: m2, w: -sd * 0.42 });
        }
      }
    }
    // arena kıyısı: blok kuleleri + ip makaraları (güney alçak)
    if (D.arena) {
      ring(api, D.arena, 10, 1.6, (x, z, south) => { if (south) spool(B, x, z, 0.6, TOYC[(rnd() * 7) | 0], rnd); else blocks(B, x, z, 3 + ((rnd() * 3) | 0), 1.1, rnd); }, { gap: 0.8 });
      api.glow(D.arena.x, D.arena.z, D.arena.r, 0xffe8c8, 0.12);
      api.light(D.arena.x, 4, D.arena.z + 2, 0xffd8a8, 1.4, 12, 0.03);
    }
    // ── çıkış kapısı arkasında saat kulesi kapısı ──
    if (L.exit && tallOk(api, L.exit.x, L.exit.z - 1.8, 9, 2.4)) {
      const ex = L.exit;
      B.add('wood', G.rbox(2), C(0x8a5430), [ex.x, 3.6, ex.z - 1.8], null, [4.8, 7.2, 0.4]);
      B.add('wood', G.cyl(1, 1, 3), C(0x8a5430), [ex.x, 7.2, ex.z - 1.8], [PI / 2, 0, 0], [2.4, 0.4, 2.4]);
      B.add('brass', gearGeo(12), C(PAL.brass), [ex.x, 7.6, ex.z - 1.55], null, [1.1, 1.1, 0.2]);
      for (let k = 0; k < 4; k++) B.add('wood', G.box(), C(0x6a3c20), [ex.x - 1.5 + k, 3.4, ex.z - 1.58], null, [0.08, 6.4, 0.06]);
      api.glow(ex.x, ex.z, 3, 0xfff0c0, 0.14);
    }
    // ── yakınlık bölgeleri (ipuçları) ──
    // gizli çıkartmalar albümde (09h_hub HUB.GIZLI)
    try { if (typeof HUB !== 'undefined' && HUB && HUB.GIZLI) HUB.GIZLI.atolye = Object.assign(HUB.GIZLI.atolye || {}, { atolye_sandik: ['Oyuncak Sandığı', '🧸'], atolye_cark: ['Çark Düğmesi', '⚙️'], altinFare: ['Altın Fare', '🐭'] }); } catch (e) { /* albüm yok */ }
    // ── toz zerreleri (altın parıltı) + tik-tak ──
    motes(api, { n: 16 });   // SADE: az toz zerresi
    B.done();
    // ── hareket ──
    api.anim((dt, fx0, fz0) => step(dt, fx0, fz0));
  }
  let COPPER = null, BRASS = null;
  function brassMat() { if (!BRASS) BRASS = kp(rimify(new THREE.MeshStandardMaterial({ color: 0xf0c060, roughness: 0.28, metalness: 0.7 }), 0xfff0b0, 0.4, 2.2)); return BRASS; }
  function copperMat() { if (!COPPER) COPPER = kp(rimify(new THREE.MeshStandardMaterial({ color: 0xe0905a, roughness: 0.3, metalness: 0.65 }), 0xffd0a0, 0.35, 2.2)); return COPPER; }
  // havada süzülen sıcak toz zerreleri (tek çizim)
  let moteTex = null;
  function motes(api, o) {
    const n = o.n, W = 34, Dd = 30, Hh = 7;
    if (!moteTex) {
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); moteTex = new THREE.CanvasTexture(c); moteTex.colorSpace = THREE.SRGBColorSpace; moteTex.userData.keep = true;
    }
    const pos = new Float32Array(n * 3), colA = new Float32Array(n * 3), seed = [];
    const cols = [0xffe2a0, 0xffe8c8, 0xffc8e0, 0xc8e4ff].map(h => C(h, 0.8));
    for (let i = 0; i < n; i++) { seed.push({ x: Math.random() * W, y: Math.random() * Hh, z: Math.random() * Dd, s: 0.2 + Math.random() * 0.4, w: Math.random() * TAU }); const c = cols[i % 4]; colA[i * 3] = c.r; colA[i * 3 + 1] = c.g; colA[i * 3 + 2] = c.b; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colA, 3));
    api.dispose(g);
    if (!M.mote) M.mote = kp(new THREE.PointsMaterial({ size: 0.12, map: moteTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
    const pts = new THREE.Points(g, M.mote); pts.frustumCulled = false; pts.renderOrder = 4; api.add(pts);
    let t = 0;
    api.anim((dt, fx0, fz0) => {
      t += dt; const ox = fx0 - W / 2, oz = fz0 - Dd * 0.62;
      for (let i = 0; i < n; i++) {
        const s = seed[i]; s.y += dt * 0.12 * s.s; if (s.y > Hh) s.y -= Hh;
        const x = ((s.x - ox + Math.sin(t * 0.4 + s.w) * 0.8) % W + W) % W, z = ((s.z - oz) % Dd + Dd) % Dd;
        pos[i * 3] = ox + x; pos[i * 3 + 1] = 0.3 + s.y; pos[i * 3 + 2] = oz + z;
      }
      g.attributes.position.needsUpdate = true;
    });
  }

  // ════════ Her kare ════════
  function step(dt, fx0, fz0) {
    const S = ANIM; if (!S) return;
    S.t += dt;
    S.gearK = damp(S.gearK, S.boost > 0 ? 6 : 1, 2, dt);
    if (S.boost > 0) S.boost -= dt;
    for (const g of S.gears) g.m.rotation.z += g.w * S.gearK * dt * 0.55;   // SADE: çarklar yavaş ve sakin döner
    for (const w of S.wheels) w.rotation.z += 0.22 * S.gearK * dt;   // (yer çarkı: x −90° yatık, z ekseni dikey → yine z)
    for (const p of S.pend) if (p.m) p.m.rotation.z = Math.sin(S.t * 2.1 + p.ph) * 0.32;
    for (const h of S.hands) { h.mm.rotation.z = -S.t * 0.25 * S.gearK; h.hm.rotation.z = -S.t * 0.25 / 12 * S.gearK - 1.2; }
    for (const b of S.boxes) {
      const on = b.play > 0 ? 1 : 0.15;
      b.bal.rotation.y += dt * (0.6 + 3.4 * on); b.bal.position.y = 1.05 + (b.play > 0 ? Math.abs(Math.sin(S.t * 4)) * 0.08 : 0);
      b.crank.rotation.x += dt * 3 * on;
      if (b.play > 0) { b.play -= dt; if ((b.noteT = (b.noteT || 0) - dt) <= 0) { b.noteT = 0.5; burst('note', b.x + Math.sin(S.t) * 0.5, 2.4, b.z, { count: 1 }); } }
    }
    if (S.train) {
      const tr = S.train, T = tr.T;
      tr.u += dt * 3.2 / ((T.rx + T.rz) * 0.5);
      tr.cars.forEach((m, k) => {
        const a = tr.u - k * 1.35 / ((T.rx + T.rz) * 0.5), x = T.x + Math.sin(a) * T.rx, z = T.z + Math.cos(a) * T.rz;
        const dx = Math.cos(a) * T.rx, dz = -Math.sin(a) * T.rz;
        m.position.set(x, Math.abs(Math.sin(S.t * 14 + k)) * 0.02, z); m.rotation.y = Math.atan2(dx, dz);
      });
      const e = tr.cars[0];
      // sürpriz: Feza trene dokununca Pırıl son vagona atlayıp bir tur biner (motor her kare Pırıl'ı yerine koyar; LEVEL.update
      // ondan sonra çalıştığı için burada vagonun üstüne taşınır; tur bitince parıltıyla Feza'nın yanına döner)
      tr.cd = Math.max(0, (tr.cd || 0) - dt);
      const Bi = typeof GAME !== 'undefined' ? GAME.Bilbo : null;
      if (Bi && Bi.root && !tr.ride && tr.cd <= 0 && live() && tr.cars.some(c => hyp(c.position.x - fx0, c.position.z - fz0) < 1.9)) {
        tr.ride = { t: 0, sx: Bi.root.position.x, sy: Bi.root.position.y, sz: Bi.root.position.z, lap: TAU / (3.2 / ((T.rx + T.rz) * 0.5)) };
        sfx('horn', { x: e.position.x, z: e.position.z, vol: 0.5, pitch: 1.6 }); sfx('pirilMutlu', { vol: 0.7 }); /* SADE: sözcük balonu yok */
        say('pp_atolye_tren_bin', { gap: 0 }); burst('sparkle', tr.ride.sx, 1, tr.ride.sz, { count: 5 });
      }
      if (tr.ride) {
        const rd = tr.ride, car = tr.cars[2], end = rd.lap + 0.6;
        rd.t += dt;
        if (!Bi || !Bi.root || rd.t > end || !live()) {
          if (Bi && Bi.root) burst('sparkle', Bi.root.position.x, 1, Bi.root.position.z, { count: 6 });
          tr.ride = null; tr.cd = 8;
        } else {
          const tx = car.position.x, ty = 0.95, tz = car.position.z;
          if (rd.t < 0.55) { const u = smooth01(rd.t / 0.55); Bi.root.position.set(lerp(rd.sx, tx, u), lerp(rd.sy, ty, u) + Math.sin(u * PI) * 1.6, lerp(rd.sz, tz, u)); }
          else Bi.root.position.set(tx, ty + Math.abs(Math.sin(S.t * 9)) * 0.06, tz);
          Bi.root.rotation.y = car.rotation.y;
          if ((rd.hT = (rd.hT || 0) - dt) <= 0) { rd.hT = 0.9; burst('heart', tx, 1.7, tz, { count: 1 }); try { if (Bi.sevin) Bi.sevin(1); } catch (err) { /* yok */ } }
        }
      }
      if ((tr.puffT -= dt) <= 0) { tr.puffT = 0.45; burst('smoke', e.position.x + Math.sin(e.rotation.y) * 0.5, 1.4, e.position.z + Math.cos(e.rotation.y) * 0.5, { count: 2, scale: 0.6 }); }
      if ((tr.tootT -= dt) <= 0 && live()) { tr.tootT = 9 + Math.random() * 5; if (hyp(e.position.x - fx0, e.position.z - fz0) < 14) { sfx('horn', { x: e.position.x, z: e.position.z, vol: 0.4, pitch: 1.5 }); } }
    }
    if (!live()) return;
    const P = GAME.P, px = P.pos.x, pz = P.pos.z;
    // tik-tak ortam sesi (çark koridorunda / saat odasında daha belirgin)
    if ((S.tickT = (S.tickT ?? 3) - dt) <= 0) { S.tickT = 4.5; if (!(GAME.boss && !GAME.boss.dead && GAME.boss.aggro)) sfx('tikTak', { vol: 0.18 }); }
    // Çark Düğmesi
    const bt = S.button;
    if (bt) {
      bt.cd = Math.max(0, bt.cd - dt);
      const on = hyp(px - bt.x, pz - bt.z) < bt.r;
      bt.top.position.y = damp(bt.top.position.y, on ? 0.24 : 0.38 + (bt.cd <= 0 ? 0.05 * Math.max(0, Math.sin(S.t * 3.2)) : 0), 14, dt);   // ATOLYE2: hazırken hafifçe zıplar ("bas bana")
      if (on && bt.cd <= 0) {
        bt.cd = 8; S.boost = 5;
        sfx('kurma', { x: bt.x, z: bt.z, vol: 0.9 }); sfx('bell', { x: bt.x, z: bt.z, pitch: 1.6 }); burst('star', bt.x, 1, bt.z, { count: 6 });   // ATOLYE2: tek efekt (asıl "vay": bütün çarklar fırıl fırıl döner)
        if (!bt.paid) { bt.paid = true; sugar(bt.x, bt.z + 1, 8); try { if (GAME.giveSticker) GAME.giveSticker('atolye_cark', 'gizli'); } catch (e) { /* yok */ } }
        /* SADE: sözcük balonu yok (ses ve hareket anlatıyor) */
      }
    }
    // boya izi
    if (S.trail > 0) { S.trail -= dt; if ((S.trailT = (S.trailT || 0) - dt) <= 0) { S.trailT = 0.08; burst('sparkle', px, 0.15, pz, { count: 2, color: '#' + new THREE.Color(S.trailC).getHexString() }); } }
    // sandık kapağı
    if (S.chest && S.chest.open > 0 && S.chest.open < 1) { S.chest.open = Math.min(1, S.chest.open + dt * 2); S.chest.lid.rotation.x = -1.9 * smooth01(S.chest.open); }
    // yakınlık bölgeleri
    for (const zn of S.zones) {
      const d = hyp(zn.x - px, zn.z - pz), inside = d < zn.r;
      if (inside && !zn.in) { zn.in = true; if (zn.enter) zn.enter(zn); }
      else if (!inside && zn.in && d > zn.r + 0.8) zn.in = false;
    }
  }

  BOLUM.define('atolye', {
    ad: 'Saat Kulesi Oyuncak Atölyesi',
    taban: 'bathroom',   // (zemin bölümün kendi tahta/yapboz döşemesi; eski tema yalnız ışık tabanı)
    size: 100, side: 2,
    areas: [{ id: 'a1', ad: 'Çark Koridoru', rooms: 2 }, { id: 'a2', ad: 'Tren Rayları', rooms: 2 }, { id: 'a3', ad: 'Blok Kuleleri', rooms: 2 }, { id: 'a4', ad: 'Saat Odası', rooms: 2 }],
    muzik: 'pr_atolye',
    malzeme: 'isik4',
    kayipEsya: null,
    final: false,
    isik: { fog: [0xe8dcd0, 34, 92], hemiSky: 0xf6f2ff, hemiGround: 0x8a7064, hemi: 0.66, sunColor: 0xfff0dc, sun: 1.7, sunOffset: [-10, 26, 14],
      env: [0xeee6f0, 0xfff0e0, 0x7a6058, 0.8], bloom: 0.12, exposure: 0.94, sat: 1.0, vig: 0.28, fezaLight: 0 },
    zemin: { tA: 0xd9a066, tB: 0xcf955c, tC: 0xe2ad72, out: 0x8a5a3a, outAmt: 0.6, macro: 0xfff0dc },
    minimap: { zemin: '#d9a066' },
    harita: { ad: 'Saat Kulesi Oyuncak Atölyesi', detay: 'Dönen çarklar, oyuncak tren, müzik kutuları', renk: '#e88f6a', x: 74, y: 32, simge: '🧸' },
    yerlesim, kur,
  });
  return { get anim() { return ANIM; }, mat, gearGeo };
})();
