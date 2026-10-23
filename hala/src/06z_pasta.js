/* ── Bölüm 4 (final): Pasta Krallığı ──
   Büyülü, rengârenk, ışıl ışıl: oyunun en güzel bölümü.
     1. Krema Nehri    akan krema nehirleri (zemin sıvısı: pembe-beyaz krema), kurabiye köprüler, bisküvi sal yolculuğu
     2. Çilek Ormanı   dev çilek ağaçları, şekerleme çiçekler, lolipop fenerleri (hepsini yak → hediye), kurabiye evleri (kapı açılır, sürpriz)
     3. Şeker Dağı     renkli şeker kayaları, pamuk şeker bulutları (zıplatır), çikolata şelalesi, mumlar (hepsini yak → hediye)
     Arena: dev pasta platformu — Koca Huysuz Pasta. Boss neşelendikçe arena süslenir (2. aşama: süs bayrakları, 3. aşama: mumlar
     yanar); neşelenince şeker ışığı havai fişekleri + konfeti (STORY.ending sonrası da sürer). Malzeme: krema. Kilit: 3 malzeme.
   Ortak araçlar: ODAB (src/06z_buzdolabi.js). Sesler: src/02l_odalarB.js. Biçim: src/SPEC.md › "Dev Ev API" › Bölüm kaydı. */
(() => {
  'use strict';
  const PI = Math.PI, hyp = Math.hypot, O = ODAB, C = O.C;
  const CANDY = [0xff5f9e, 0xffb13b, 0x6fd6ff, 0x9a7bff, 0x6fe0a0, 0xffe45a, 0xff7a6a];
  const PASTEL = [0xffc4dc, 0xffe2b0, 0xc8ecff, 0xe2d2ff, 0xc8f4dc, 0xfff2b0];

  // ── Yerleşim (saf veri) ──
  function yerlesim(L, api) {
    const R = L.rooms, A = L.areas || [], room = i => R[i];
    const mainOf = a => (a ? a.rooms.filter(i => R[i] && R[i].kind !== 'side') : []);
    const a1 = mainOf(A[0]), a2 = mainOf(A[1]), a3 = mainOf(A[2]);
    const ar = A.find(a => a.boss), arena = ar ? room(ar.rooms[0]) : R[R.length - 1];
    const D = L.odp = { raft: null, lanterns: [], houses: [], candles: [], pads: [], gold: [], trails: [], fall: null, taken: [] };
    const taken = D.taken;
    // 1) Krema Nehri: bisküvi sal halkası (odanın krema tarafında; önce güney = kamera tarafı)
    for (const ri of [a1[1], a1[0], a2[0]].filter(i => i !== undefined)) {
      const rm = room(ri); if (!rm || D.raft) continue;
      for (const ang of [0, 0.5, -0.5, 1.0, -1.0, PI / 2, -PI / 2, 2.2, -2.2]) {
        const dx = Math.sin(ang), dz = Math.cos(ang), e = O.edge(api, rm, dx, dz);
        if (e.d < 3) continue;
        if (api.linkDist(e.x + dx, e.z + dz) < 3.5) continue;
        const px = -dz, pz = dx;
        for (const [rx, ry] of [[5, 2.3], [4.2, 2.0], [3.4, 1.7]]) {
          const cx = e.x + dx * (1.3 + ry), cz = e.z + dz * (1.3 + ry);
          let ok = true; const loop = [];
          const N = 36;
          for (let i = 0; i <= N && ok; i++) {
            const a = -PI / 2 + i / N * TAU, lx = Math.cos(a) * rx, ly = Math.sin(a) * ry;   // a=-π/2 → odaya en yakın nokta
            const x = cx + px * lx + dx * ly, z = cz + pz * lx + dz * ly;
            for (const o of [[0, 0], [0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) if (api.isFloor(x + o[0], z + o[1])) { ok = false; break; }
            if (x < 2 || z < 2 || x > L.W - 2 || z > L.H - 2) ok = false;
            loop.push({ x, y: 0, z });
          }
          if (!ok) continue;
          const dock = { x: e.x - dx * 1.0, z: e.z - dz * 1.0 };
          if (!api.circleFree(dock.x, dock.z, 0.6) || !O.clearOf(L, dock.x, dock.z, 1)) continue;
          D.raft = { dock, e: { x: e.x, z: e.z }, dx, dz, px, pz, cx, cz, rx, ry, loop };
          taken.push({ x: dock.x, z: dock.z, r: 1.8 });
          break;
        }
        if (D.raft) break;
      }
    }
    // 1b) Dev krema torbası: alanın ilk odasının kenarında, ucu odaya bakar; her dokunuşta yere krema çiçeği sıkar
    {
      const rm = room(a1[0]);
      if (rm) for (const ang of [PI, PI - 0.6, PI + 0.6, PI / 2, -PI / 2, PI - 1.1, PI + 1.1]) {
        const dx = Math.sin(ang), dz = Math.cos(ang), e = O.edge(api, rm, dx, dz);
        if (e.d < 3.5) continue;
        const bx = e.x + dx * 2.0, bz = e.z + dz * 2.0, sx = e.x - dx * 1.1, sz = e.z - dz * 1.1;
        if (api.linkDist(bx, bz) < 4 || D.raft && hyp(D.raft.dock.x - sx, D.raft.dock.z - sz) < 5) continue;
        let bad = false;
        for (let q = 0; q < 8; q++) { const b = q * PI / 4; if (api.isFloor(bx + Math.sin(b) * 1.3, bz + Math.cos(b) * 1.3)) { bad = true; break; } }
        if (bad || !api.circleFree(sx, sz, 0.8) || !O.clearOf(L, sx, sz, 1)) continue;
        const spots = [];
        for (let i = 0; i < 6; i++) {
          const a = (i - 2.5) * 0.42, d = 2.4 + (i % 2) * 0.9, x = e.x - (dx * Math.cos(a) - dz * Math.sin(a)) * d, z = e.z - (dz * Math.cos(a) + dx * Math.sin(a)) * d;
          if (api.isFloor(x, z) && api.circleFree(x, z, 0.4)) spots.push({ x, z });
        }
        D.bag = { bx, bz, sx, sz, ex: e.x, ez: e.z, dx, dz, spots };
        taken.push({ x: sx, z: sz, r: 1.8 });
        break;
      }
    }
    // 2) Çilek Ormanı: lolipop fenerleri (alanın ilk odası), kurabiye evleri (ikinci oda kenarı)
    {
      const rm = room(a2[0]);
      if (rm) for (let k = 0; k < 5; k++) {
        const p = O.roomSpot(L, api, rm, { r: 0.7, pmin: 1.6, pmax: 6, k: 0.85, taken: taken.concat(D.lanterns.map(q => ({ x: q.x, z: q.z, r: 2.6 }))) });
        if (p) { D.lanterns.push(p); p.solid = api.solid(p.x, p.z, 0.28, 'fener'); taken.push({ x: p.x, z: p.z, r: 1.2 }); }
      }
      for (const ri of [a2[1], a2[0]]) {
        const rm2 = room(ri); if (!rm2 || D.houses.length >= 2) continue;
        for (let k = 0; k < 10 && D.houses.length < 2; k++) {
          const a = PI + (k % 2 ? 1 : -1) * (0.3 + Math.floor(k / 2) * 0.42), dx = Math.sin(a), dz = Math.cos(a);
          if (dz > 0.3) continue;
          const e = O.edge(api, rm2, dx, dz);
          if (e.d < 4) continue;
          const hx = e.x + dx * 2.4, hz = e.z + dz * 2.4;
          if (api.linkDist(hx, hz) < 4.5 || D.houses.some(h => hyp(h.x - hx, h.z - hz) < 6)) continue;
          let bad = false;
          for (let q = 0; q < 8; q++) { const b = q * PI / 4; if (api.isFloor(hx + Math.sin(b) * 1.9, hz + Math.cos(b) * 1.9)) { bad = true; break; } }
          if (bad) continue;
          const door = { x: e.x - dx * 0.9, z: e.z - dz * 0.9 };
          if (!api.circleFree(door.x, door.z, 0.6) || !O.clearOf(L, door.x, door.z, 0.8)) continue;
          D.houses.push({ x: hx, z: hz, yaw: Math.atan2(-dx, -dz), door });
          taken.push({ x: door.x, z: door.z, r: 1.6 });
        }
      }
    }
    // 3) Şeker Dağı: mumlar (ilk oda), pamuk şeker bulutu zıplatıcıları + altın şeker (ikinci oda), çikolata şelalesi (kuzey kenar)
    {
      const rm = room(a3[0]);
      if (rm) for (let k = 0; k < 5; k++) {
        const p = O.roomSpot(L, api, rm, { r: 0.6, pmin: 1.6, pmax: 6, k: 0.85, taken: taken.concat(D.candles.map(q => ({ x: q.x, z: q.z, r: 2.6 }))) });
        if (p) { D.candles.push(p); p.solid = api.solid(p.x, p.z, 0.32, 'mum'); taken.push({ x: p.x, z: p.z, r: 1.2 }); }
      }
      const rm2 = room(a3[1] ?? a3[0]);
      if (rm2) {
        const pads = [];
        for (let t = 0; t < 6 && pads.length < 3; t++) {
          pads.length = 0;
          const p0 = O.roomSpot(L, api, rm2, { r: 1.25, pmin: 1.8, pmax: 6, k: 0.7, taken });
          if (!p0) continue;
          pads.push(p0); let ang = api.rnd() * TAU;
          for (let i = 1; i < 3; i++) {
            let got = null;
            for (let s = 0; s < 14 && !got; s++) {
              const a = ang + (s % 2 ? 1 : -1) * Math.ceil(s / 2) * 0.45, q = pads[i - 1], x = q.x + Math.sin(a) * 3.6, z = q.z + Math.cos(a) * 3.6;
              if (api.isFloor(x, z) && api.circleFree(x, z, 1.25) && O.clearOf(L, x, z, 1.25) && pads.every(p => hyp(p.x - x, p.z - z) > 3) && !taken.some(q2 => hyp(q2.x - x, q2.z - z) < q2.r + 1.2)) { got = { x, z }; ang = a; }
            }
            if (!got) break;
            pads.push(got);
          }
        }
        pads.forEach((p, i) => D.pads.push({ x: p.x, z: p.z, r: 1.15, col: [0xffb8d8, 0xbfe4ff, 0xe0ccff][i % 3], chain: i < pads.length - 1 ? i + 1 : null }));
        if (pads.length >= 2) D.gold.push({ x: (pads[pads.length - 2].x + pads[pads.length - 1].x) / 2, y: 2.5, z: (pads[pads.length - 2].z + pads[pads.length - 1].z) / 2, high: true, sticker: 'gizli_pamuk_altin' });
        for (const p of pads) taken.push({ x: p.x, z: p.z, r: 2.4 });
        // çikolata şelalesi: odanın kuzey kenarının ötesinde
        for (const ang of [0, 0.4, -0.4, 0.8, -0.8]) {
          const dx = Math.sin(PI + ang), dz = Math.cos(PI + ang), e = O.edge(api, rm2, dx, dz);
          if (e.d < 3) continue;
          const fx = e.x + dx * 3.2, fz = e.z + dz * 3.2;
          if (api.linkDist(fx, fz) < 5) continue;
          let bad = false;
          for (let q = 0; q < 8; q++) { const b = q * PI / 4; if (api.isFloor(fx + Math.sin(b) * 2.4, fz + Math.cos(b) * 2.4)) { bad = true; break; } }
          if (bad) continue;
          D.fall = { x: fx, z: fz, ex: e.x, ez: e.z, dx, dz };
          break;
        }
      }
    }
    if (arena) D.arena = { x: arena.x, z: arena.z, r: arena.r };
    // şeker dizileri: yan odalar + her alanın ilk odası
    for (const rm of R.filter(r => r.kind === 'side').concat([room(a1[0]), room(a2[1]), room(a3[1])].filter(Boolean))) {
      const pts = [];
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, x = rm.x + Math.sin(a) * rm.r * 0.5, z = rm.z + Math.cos(a) * rm.r * 0.5; if (api.isFloor(x, z) && api.circleFree(x, z, 0.3) && !taken.some(q => hyp(q.x - x, q.z - z) < q.r)) pts.push([x, z]); }
      D.trails.push({ x: rm.x, z: rm.z, pts });
    }
    O.clearSpawns(L, api, taken.map(q => ({ x: q.x, z: q.z, r: q.r + 1.5 })));
    D.mini = O.miniCorner(L, api, room(a3[0]) || room(a2[1]), ['kekSusle', 'sekerYakala', 'pasta', 'krema', 'mum'], taken);
    D.binis = [];   // biniş halkası kaldırıldı ('Bin!' düğmesi)
    O.gentlePacks(L, 5);
  }

  // ── Görsel kurulum ──
  function* kur(L, api) {   // üreteç: yield'ler oda geçişinde ayrı karelere düşer (06_level buildSteps)
    const D = L.odp || { lanterns: [], houses: [], candles: [], pads: [], gold: [], trails: [], taken: [] };
    const B = O.batch(api), rnd = api.rnd, R = O.rig(api, L);
    tintFloor(api);
    api.dreamEdge();
    const areaOf = i => (L.areas || []).findIndex(a => a.rooms.includes(i));
    L.rooms.forEach((rm, i) => {
      if (rm.kind === 'boss') return;
      const ar = areaOf(i);
      if (ar <= 0) {
        O.ring(api, rm, 5, 1.6, (x, z, south) => (south ? creamSwirl(B, x, z, 0.7, rnd) : rnd() < 0.5 ? cupcake(B, api, x, z, 1.1 + rnd() * 0.3, rnd) : creamSwirl(B, x, z, 1.3, rnd)));
      } else if (ar === 1) {
        O.ring(api, rm, 4, 2.2, (x, z, south) => (south ? candyFlowerPatch(B, x, z, 0.7, rnd) : strawberryTree(B, api, x, z, 1 + rnd() * 0.25, rnd)));
      } else {
        O.ring(api, rm, 4, 2.0, (x, z, south) => (south ? rockCandy(B, x, z, 0.55, rnd) : rnd() < 0.6 ? candyMountain(B, x, z, 1 + rnd() * 0.3, rnd) : rockCandy(B, x, z, 1.2, rnd)));
      }
      api.glow(rm.x, rm.z, rm.r * 0.95, ar === 1 ? 0xffd8e4 : ar === 2 ? 0xffe8c8 : 0xffe4f0, 0.12);
    });
    // kıyı süsleri: yürünür alanın hemen kenarında, alana göre
    const avoid = (D.taken || []).map(q => ({ x: q.x, z: q.z, r: q.r * 0.6 })).concat((L.areas || []).filter(a => a.gate).map(a => ({ x: a.gate.x, z: a.gate.z, r: 4.5 })));
    if (D.raft) avoid.push({ x: D.raft.cx, z: D.raft.cz, r: Math.max(D.raft.rx, D.raft.ry) + 2.2 }, { x: D.raft.e.x, z: D.raft.e.z, r: 2.5 });
    D.houses.forEach(h => avoid.push({ x: h.x, z: h.z, r: 3.4 }));
    if (D.fall) avoid.push({ x: D.fall.x, z: D.fall.z, r: 4.5 });
    if (L.crystalSpot) avoid.push({ x: L.crystalSpot.x, z: L.crystalSpot.z, r: 4 });
    const edgeList = O.edgeSpots(L, api, { avoid, space: 3.2 });
    for (const c of edgeList) {
      const ar = areaOf(c.room), rmk = L.rooms[c.room];
      if (rmk && rmk.kind === 'boss') continue;
      const low = c.side === 'south', mid = c.side === 'side', bx = c.x - c.nx * 0.3, bz = c.z - c.nz * 0.3;
      if (ar <= 0) { if (low) (rnd() < 0.5 ? macaron(B, c.x, c.z, 0.6, rnd) : sprinkleDrop(B, c.x, c.z, rnd)); else if (mid) creamSwirl(B, c.x, c.z, 0.6, rnd); else (rnd() < 0.5 ? cupcake(B, api, bx, bz, 0.75, rnd) : creamSwirl(B, c.x, c.z, 0.95, rnd)); }
      else if (ar === 1) { if (low) candyFlowerPatch(B, c.x, c.z, 0.55, rnd); else if (mid) (rnd() < 0.5 ? meringue(B, c.x, c.z, 0.8, rnd) : candyFlowerPatch(B, c.x, c.z, 0.85, rnd)); else (rnd() < 0.6 ? strawberryTree(B, api, bx, bz, 0.72, rnd) : meringue(B, c.x, c.z, 1.1, rnd)); }
      else { if (low) gumdrops(B, c.x, c.z, 0.7, rnd); else if (mid) rockCandy(B, c.x, c.z, 0.6, rnd); else (rnd() < 0.5 ? candyMountain(B, bx, bz, 0.62, rnd) : rockCandy(B, c.x, c.z, 0.95, rnd)); }
    }
    for (const f of O.floorSpots(L, api, 55, { avoid })) floorCandy(B, f.x, f.z, areaOf(f.room), rnd);
    O.decals(api, L, 'kalp', 16, 2.4, { avoid }); O.decals(api, L, 'girdap', 14, 2.2, { avoid, opacity: 0.85 });
    yield;
    // geçitler: şeker kamışı kemerleri + kurabiye köprü
    (L.areas || []).forEach((a, k) => { if (k && a.gate) candyArch(B, api, L, k); });
    // ── Krema Nehri: bisküvi sal ──
    if (D.raft) raft(B, api, R, D.raft);
    if (D.bag) pipingBag(B, api, R, D.bag);
    yield;
    // ── Çilek Ormanı: fenerler, kurabiye evleri ──
    if (D.lanterns.length) lanterns(B, api, R, D.lanterns);
    D.houses.forEach((h, i) => cookieHouse(B, api, R, h, i));
    // ── Şeker Dağı: mumlar, pamuk şeker bulutları, şelale ──
    if (D.candles.length) candles(B, api, R, D.candles);
    D.pads.forEach(p => { const pad = cloudPad(api, p); if (p.chain !== null && D.pads[p.chain]) pad.to = { x: D.pads[p.chain].x, z: D.pads[p.chain].z }; R.pads.push(pad); });
    if (D.pads.length) R.zones.push({ x: D.pads[0].x, z: D.pads[0].z, r: 6.5, enter: () => O.say('odp_bulut') });
    for (const g of D.gold) O.goldSugar(api, R, g.x, g.y, g.z, { sticker: g.sticker, r: g.high ? 1.5 : 1.1, dy: g.high ? 1.2 : 1.4 });
    if (D.fall) chocoFall(B, api, R, D.fall);
    // krema dalgaları: Krema Nehri odalarının kamera tarafındaki kremada süzülen pembe-beyaz kıvrımlar (tek mesh, yavaşça dalgalanır)
    {
      const wk = new Kit(), A0 = (L.areas || [])[0];
      const rset = new Set(A0 ? A0.rooms : []);
      for (const c of O.edgeSpots(L, api, { dmin: 2.6, dmax: 3.0, space: 3.4, avoid })) {
        if (!rset.has(c.room) || c.side === 'north') continue;
        const yaw = Math.atan2(c.nx, c.nz) + PI / 2, col = rnd() < 0.5 ? 0xffffff : 0xffc8dc;
        wk.add(G.torus(PI, 0.32, 12), C(col), [c.x, 0.05, c.z], [0, yaw, 0], [0.7, 0.42, 0.55]);
        wk.add(G.sphere(8, 6), C(0xffffff), [c.x + Math.cos(yaw) * 0.7, 0.12, c.z - Math.sin(yaw) * 0.7], null, [0.18, 0.16, 0.18]);
      }
      if (wk.parts.length) { const wm = O.solo(wk, 'cream', api); wm.castShadow = false; let t = 0; api.anim(dt => { t += dt; wm.position.y = Math.sin(t * 1.3) * 0.06; wm.position.x = Math.sin(t * 0.7) * 0.12; }); }
    }
    floatingClouds(api, L, rnd);
    // peri ışıkları: şeker kamışı direkler arasında rengârenk ampuller (ışıl ışıl)
    O.fairyLights(B, api, L, { avoid: avoid.concat(edgeList.map(c => ({ x: c.x, z: c.z, r: 1.5 }))), colors: CANDY, k: 1.15, light: 0xffd8ec, wire: 0xffffff, space: 6.4,
      rooms: new Set(L.rooms.map((r, i) => (r.kind === 'boss' ? -1 : i))),
      post: (B2, x, z, h) => { B2.add('candy', cylH(), stripes(x, z, C(0xff3b5c), C(0xffffff), 2, 6), [x, h / 2, z], null, [0.13, h, 0.13]); B2.add('candy', G.sphere(10, 7), C(0xffd24a), [x, h + 0.1, z], null, [0.2, 0.2, 0.2]); } });
    yield;
    // ── Arena: dev pasta ──
    if (D.arena) cakeArena(B, api, R, L, D.arena, rnd);
    // ── alan ipuçları (ilk odalarına girince) ──
    const A = L.areas || [], firstRoom = k => A[k] && L.rooms[A[k].rooms[0]];
    if (firstRoom(0)) R.zones.push({ x: firstRoom(0).x, z: firstRoom(0).z, r: 4, enter: () => setTimeout(() => O.say('odp_nehir'), 4500) });
    if (firstRoom(1)) R.zones.push({ x: firstRoom(1).x, z: firstRoom(1).z, r: firstRoom(1).r, enter: () => O.say('odp_orman') });
    if (firstRoom(2)) R.zones.push({ x: firstRoom(2).x, z: firstRoom(2).z, r: firstRoom(2).r, enter: () => O.say('odp_dag') });
    for (const t of D.trails) if (t.pts.length) R.zones.push({ x: t.x, z: t.z, r: 11, enter(z) { if (!z.done) { z.done = true; O.restCoins(t.pts); } } });
    for (const b of D.binis || []) O.binisLook(B, api, b);
    if (D.mini) O.miniCornerLook(B, api, R, D.mini, { ring: 0xffa8d0, star: 0xff5f9e, line: 'odp_mini', prop: (B2, x, z) => {   // şeker kavanozu
      B2.add('glass', G.cyl(1, 1, 18), C(0xeaf8ff), [x, 0.85, z], null, [0.6, 1.7, 0.6]);
      B2.add('candy', G.cyl(1, 1, 16), C(0xff5f9e), [x, 1.78, z], null, [0.64, 0.16, 0.64]);
      for (let i = 0; i < 14; i++) B2.add('candy', G.sphere(7, 5), C(CANDY[i % CANDY.length]), [x + Math.sin(i * 2.4) * 0.35, 0.25 + (i % 7) * 0.17, z + Math.cos(i * 2.4) * 0.35], null, [0.15, 0.15, 0.15]);
    } });
    O.sparkles(api, { n: 48, kind: 'dot', colors: [0xff9ac8, 0xffe08a, 0x9ae8ff, 0xd6b0ff, 0xffffff], k: 1.05, size: 0.13, fall: -0.12, y0: 0.2, h: 7 });
    B.done();
  }
  // zemin: pembe-beyaz krema nehirleri, karamel kenar
  function tintFloor(api) {
    const U = api.floor && api.floor.material && api.floor.material.userData && api.floor.material.userData.u;
    if (!U) return;
    const set = (k, hex, m = 1) => { if (U[k] && U[k].value && U[k].value.isColor) U[k].value.set(hex).multiplyScalar(m); };
    set('uLiqA', 0xffe0ec, 1.06); set('uLiqB', 0xfff6ea, 1.05); set('uLiqC', 0xffb4cc, 1.04); set('uEdge', 0xf7a8c4);
  }

  // ═════ Modeller ═════
  const CYLH = {};
  const cylH = (rt = 1) => CYLH[rt] || (CYLH[rt] = (() => { const g = new THREE.CylinderGeometry(rt, 1, 1, 16, 12); g.userData.keep = true; return g; })());   // boyuna bölümlü: sarmal şeritler için
  const stripes = (cx, cz, a, b, k = 2, f = 5) => (x, y, z) => (Math.sin(Math.atan2(x - cx, z - cz) * k + y * f) > 0 ? a : b);
  function creamSwirl(B, x, z, s, rnd) {
    const c = C(PASTEL[(rnd() * PASTEL.length) | 0]);
    for (let i = 0; i < 4; i++) B.add('cream', G.torus(TAU, 0.42, 16), c, [x, (0.3 + i * 0.42) * s, z], [PI / 2, 0, i * 0.7], [(1.1 - i * 0.24) * s, (1.1 - i * 0.24) * s, (1.0 - i * 0.2) * s]);
    B.add('cream', G.cone(16), c, [x, 1.95 * s, z], null, [0.32 * s, 0.6 * s, 0.32 * s]);
    if (rnd() < 0.6) B.add('candy', G.sphere(11, 8), C(0xe8203a), [x, 2.35 * s, z], null, [0.25 * s, 0.25 * s, 0.25 * s]);
    for (let i = 0; i < 6; i++) B.add('glow', G.cyl(1, 1, 5), C(CANDY[i % CANDY.length], 1.2), [x + Math.sin(i * 2.3) * 0.7 * s, (0.9 + (i % 3) * 0.4) * s, z + Math.cos(i * 2.3) * 0.7 * s], [i, 0, i * 0.7], [0.04, 0.24, 0.04]);
  }
  function cupcake(B, api, x, z, s, rnd) {
    const wr = C(PASTEL[(rnd() * PASTEL.length) | 0]), fr = C(CANDY[(rnd() * CANDY.length) | 0]).lerp(C(0xffffff), 0.45);
    B.add('gloss', G.cyl(1.15, 0.85, 40), (xx, yy, zz) => (Math.sin(Math.atan2(xx - x, zz - z) * 10) > 0 ? wr : C(0xffffff).lerp(wr, 0.6)), [x, 0.75 * s, z], null, [1.3 * s, 1.5 * s, 1.3 * s]);
    for (let i = 0; i < 3; i++) B.add('cream', G.sphere(14, 10), fr, [x, (1.7 + i * 0.55) * s, z], null, [(1.45 - i * 0.38) * s, 0.6 * s, (1.45 - i * 0.38) * s]);
    B.add('candy', G.sphere(11, 8), C(0xe8203a), [x, 3.2 * s, z], null, [0.32 * s, 0.32 * s, 0.32 * s]);
    for (let i = 0; i < 10; i++) { const a = i * 2.4, r = (0.5 + (i % 3) * 0.3) * s; B.add('glow', G.cyl(1, 1, 5), C(CANDY[i % CANDY.length], 1.15), [x + Math.sin(a) * r, (2.05 + (i % 4) * 0.25) * s, z + Math.cos(a) * r], [i, 0, i * 0.6], [0.05, 0.3, 0.05]); }
  }
  function macaron(B, x, z, s, rnd) {
    const c = C(PASTEL[(rnd() * PASTEL.length) | 0]).lerp(C(CANDY[(rnd() * CANDY.length) | 0]), 0.35);
    B.add('gloss', G.sphere(14, 10), c, [x, 0.35 * s, z], null, [0.8 * s, 0.3 * s, 0.8 * s]);
    B.add('cream', G.cyl(1, 1, 16), C(0xfffaf0), [x, 0.66 * s, z], null, [0.72 * s, 0.16 * s, 0.72 * s]);
    B.add('gloss', G.sphere(14, 10), c, [x, 0.95 * s, z], null, [0.8 * s, 0.3 * s, 0.8 * s]);
  }
  function sprinkleDrop(B, x, z, rnd) {
    B.add('cream', G.sphere(12, 8), C(0xfff2f6), [x, 0.12, z], null, [0.9, 0.3, 0.9]);
    for (let i = 0; i < 8; i++) B.add('glow', G.cyl(1, 1, 5), C(CANDY[i % CANDY.length], 1.2), [x + Math.sin(i * 2.4) * 0.55, 0.32, z + Math.cos(i * 2.4) * 0.55], [PI / 2, i, 0], [0.04, 0.27, 0.04]);
  }
  function strawberryTree(B, api, x, z, s, rnd) {
    // gövde: yeşil-krem çizgili şeker sapı; taç: yumuşak yaprak bulutları; sarkan dev çilekler
    B.add('candy', cylH(0.7), stripes(x, z, C(0x6fc85a), C(0xe8ffd8), 1, 3), [x, 2.0 * s, z], null, [0.38 * s, 4.0 * s, 0.38 * s]);
    const leaf = [0x5cc85a, 0x7ad86a, 0x4ab84e];
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3, r = 1.5 * s; B.add('cream', G.sphere(12, 9), C(leaf[i % 3]), [x + Math.sin(a) * r, 4.4 * s + (i % 2) * 0.4 * s, z + Math.cos(a) * r], null, [1.3 * s, 0.9 * s, 1.3 * s]); }
    B.add('cream', G.sphere(14, 10), C(0x6ad05e), [x, 5.0 * s, z], null, [1.7 * s, 1.1 * s, 1.7 * s]);
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 + 0.6, r = 1.6 * s, bx = x + Math.sin(a) * r, bz = z + Math.cos(a) * r, by = 3.5 * s - (i % 2) * 0.3 * s;
      B.add('candy', G.sphere(12, 8), C(0xff3b5c), [bx, by, bz], null, [0.42 * s, 0.5 * s, 0.42 * s]);
      B.add('candy', G.cone(12), C(0xff3b5c), [bx, by - 0.38 * s, bz], [PI, 0, 0], [0.36 * s, 0.4 * s, 0.36 * s]);
      for (let k = 0; k < 4; k++) B.add('glow', G.sphere(5, 4), C(0xfff2a0, 1.2), [bx + Math.sin(k * 1.6 + a) * 0.4 * s, by - 0.1 * s - (k % 2) * 0.2 * s, bz + Math.cos(k * 1.6 + a) * 0.4 * s], null, [0.04, 0.06, 0.04]);
      B.add('gloss', G.cone(5), C(0x48b04a), [bx, by + 0.48 * s, bz], null, [0.25 * s, 0.2 * s, 0.25 * s]);
    }
    for (let i = 0; i < 4; i++) B.add('glow', G.sphere(6, 4), C(0xfff0c0, 1.6), [x + Math.sin(i * 1.9) * 1.9 * s, 5.0 * s + (i % 2) * 0.6, z + Math.cos(i * 1.9) * 1.9 * s], null, [0.09, 0.09, 0.09]);
  }
  function candyFlower(B, x, z, s, c) {
    B.add('gloss', G.cyl(1, 1, 6), C(0x5cc85a), [x, 0.55 * s, z], null, [0.06 * s, 1.1 * s, 0.06 * s]);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; B.add('candy', G.sphere(8, 6), C(c), [x + Math.sin(a) * 0.26 * s, 1.15 * s, z + Math.cos(a) * 0.26 * s * 0.5 + 0.05], null, [0.2 * s, 0.2 * s, 0.12 * s]); }
    B.add('glow', G.sphere(8, 6), C(0xffe45a, 1.4), [x, 1.15 * s, z + 0.1 * s], null, [0.13 * s, 0.13 * s, 0.1 * s]);
    B.add('gloss', G.sphere(7, 5), C(0x7ad86a), [x + 0.15 * s, 0.4 * s, z], [0, 0, 0.8], [0.22 * s, 0.08 * s, 0.12 * s]);
  }
  function candyFlowerPatch(B, x, z, s, rnd) {
    for (let i = 0; i < 4; i++) candyFlower(B, x + (rnd() - 0.5) * 1.6 * s, z + (rnd() - 0.5) * 1.6 * s, s * (0.8 + rnd() * 0.5), CANDY[(rnd() * CANDY.length) | 0]);
  }
  function meringue(B, x, z, s, rnd) {   // beze mantarları: beyaz sap, pembe benekli şapka
    for (let i = 0; i < 2; i++) {
      const xx = x + (i ? 0.7 * s : 0), zz = z + (i ? 0.3 * s : 0), k = i ? 0.65 : 1, c = [0xff8ab8, 0xffc04a, 0x8ad0ff][(rnd() * 3) | 0];
      B.add('cream', G.cyl(0.8, 1, 12), C(0xfffaf2), [xx, 0.45 * s * k, zz], null, [0.22 * s * k, 0.9 * s * k, 0.22 * s * k]);
      B.add('candy', G.sphere(12, 8), C(c), [xx, 0.95 * s * k, zz], null, [0.62 * s * k, 0.38 * s * k, 0.62 * s * k]);
      for (let j = 0; j < 6; j++) { const a = j * TAU / 6 + 0.3, rr = j ? 0.42 : 0; B.add('cream', G.sphere(7, 5), C(0xffffff), [xx + Math.sin(a) * rr * s * k, (j ? 1.21 : 1.32) * s * k, zz + Math.cos(a) * rr * s * k], null, [0.1 * s * k, 0.06 * s * k, 0.1 * s * k]); }
    }
  }
  function gumdrops(B, x, z, s, rnd) {
    for (let i = 0; i < 3; i++) { const c = CANDY[(rnd() * CANDY.length) | 0]; B.add('jelly', G.sphere(10, 7), C(c), [x + (i - 1) * 0.55 * s, 0.05, z + (rnd() - 0.5) * 0.5 * s], null, [0.36 * s, 0.5 * s, 0.36 * s]); }
  }
  function floorCandy(B, x, z, ar, rnd) {
    const k = rnd();
    if (k < 0.45) { for (let i = 0; i < 5; i++) B.add('glow', G.cyl(1, 1, 5), C(CANDY[(rnd() * CANDY.length) | 0], 1.1), [x + (rnd() - 0.5) * 0.9, 0.05, z + (rnd() - 0.5) * 0.9], [PI / 2, rnd() * PI, 0], [0.035, 0.24, 0.035]); }
    else if (k < 0.75) {   // sarılı şeker
      const c = C(CANDY[(rnd() * CANDY.length) | 0]), yaw = rnd() * PI;
      B.add('candy', G.sphere(8, 6), c, [x, 0.13, z], [0, yaw, 0], [0.22, 0.14, 0.14]);
      for (const sd of [-1, 1]) B.add('candy', G.cone(6), c, [x + Math.cos(yaw) * sd * 0.27, 0.13, z - Math.sin(yaw) * sd * 0.27], [0, yaw, sd * PI / 2], [0.1, 0.14, 0.1]);
    } else if (ar === 1) { candyFlower(B, x, z, 0.45, CANDY[(rnd() * CANDY.length) | 0]); }
    else { B.add('jelly', G.sphere(8, 6), C(CANDY[(rnd() * CANDY.length) | 0]), [x, 0.05, z], null, [0.2, 0.26, 0.2]); }
  }
  function rockCandy(B, x, z, s, rnd) {
    const n = 3 + ((rnd() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const c = CANDY[(rnd() * CANDY.length) | 0], a = rnd() * TAU, d = rnd() * 0.8 * s, h = (1.2 + rnd() * 1.6) * s;
      B.add('jelly', G.octa(), C(c), [x + Math.sin(a) * d, h * 0.45, z + Math.cos(a) * d], [rnd() * 0.5 - 0.25, rnd() * PI, rnd() * 0.5 - 0.25], [0.5 * s, h * 0.5, 0.5 * s]);
    }
    B.add('glow', G.sphere(7, 5), C(0xffffff, 1.5), [x, 1.0 * s, z + 0.3 * s], null, [0.06, 0.06, 0.06]);
  }
  // Şeker dağı: kat kat renkli şeker tepesi + karlı krema zirve
  function candyMountain(B, x, z, s, rnd) {
    const cols = [0xff9ac8, 0xffd27a, 0x9ae0ff, 0xc8a8ff];
    for (let i = 0; i < 4; i++) B.add('candy', G.cyl(0.78, 1, 18), C(cols[(i + ((rnd() * 4) | 0)) % 4]), [x, (0.55 + i * 1.05) * s, z], [0, i * 0.4, 0], [(2.4 - i * 0.5) * s, 1.1 * s, (2.4 - i * 0.5) * s]);
    B.add('cream', G.sphere(12, 9), C(0xfffaf4), [x, 4.6 * s, z], null, [0.95 * s, 0.6 * s, 0.95 * s]);
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7; B.add('cream', G.sphere(7, 5), C(0xfffaf4), [x + Math.sin(a) * 0.9 * s, 4.25 * s, z + Math.cos(a) * 0.9 * s], null, [0.25 * s, 0.45 * s, 0.25 * s]); }
    B.add('candy', G.sphere(10, 7), C(0xe8203a), [x, 5.15 * s, z], null, [0.3 * s, 0.3 * s, 0.3 * s]);
    for (let i = 0; i < 12; i++) B.add('glow', G.cyl(1, 1, 5), C(CANDY[i % CANDY.length], 1.15), [x + Math.sin(i * 2.4) * (1.2 + (i % 3) * 0.4) * s, (0.8 + (i % 4) * 0.9) * s, z + Math.cos(i * 2.4) * (1.2 + (i % 3) * 0.4) * s], [i, 0, i * 0.6], [0.06, 0.36, 0.06]);
  }
  // Şeker kamışı kemeri + kurabiye köprü (alan geçidi)
  function candyArch(B, api, L, k) {
    const g = L.areas[k].gate, d = O.gateDir(L, k), px = -d.dz, pz = d.dx, w = O.corridorHalf(api, g.x, g.z, px, pz);
    const half = (w.a + w.b) / 2 + 0.75, cx = g.x + px * (w.a - w.b) / 2, cz = g.z + pz * (w.a - w.b) / 2;
    if (half > 6.5 || w.a >= 7 || w.b >= 7) return;
    const red = C(0xff3b5c), wh = C(0xffffff);
    for (const sd of [-1, 1]) {
      const x = cx + px * half * sd, z = cz + pz * half * sd;
      B.add('candy', cylH(), stripes(x, z, red, wh, 2, 6), [x, 2.1, z], null, [0.28, 4.2, 0.28]);
      B.add('candy', G.sphere(11, 8), C(CANDY[k % CANDY.length]), [x, 4.35, z], null, [0.45, 0.45, 0.45]);
      B.add('cream', G.torus(TAU, 0.4, 16), C(0xfff2f6), [x, 0.2, z], [PI / 2, 0, 0], [0.5, 0.5, 0.5]);
    }
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = PI * u, x = cx + px * Math.cos(a) * half, z = cz + pz * Math.cos(a) * half, y = 4.3 + Math.sin(a) * 1.4;
      B.add('candy', G.sphere(8, 6), C(CANDY[i % CANDY.length]), [x, y, z], null, [0.34, 0.3, 0.34]);
    }
    // kalp lolipop
    const hy = 6.3;
    for (const sd of [-1, 1]) B.add('candy', G.sphere(11, 8), C(0xff5f9e), [cx + px * 0.28 * sd, hy + 0.12, cz + pz * 0.28 * sd], null, [0.42, 0.42, 0.25]);
    B.add('candy', G.cone(14), C(0xff5f9e), [cx, hy - 0.3, cz], [PI, 0, 0], [0.55, 0.62, 0.3]);
    B.add('glow', G.sphere(7, 5), C(0xffffff, 1.6), [cx + px * 0.2, hy + 0.3, cz + pz * 0.2], null, [0.09, 0.09, 0.09]);
    // kurabiye köprü (koridorun ortasına yassı dev kurabiye) + kenarda krema
    const yaw = Math.atan2(px, pz);
    const cr = Math.min(half, 2.8, 2.4);
    B.add('gloss', G.cyl(1, 1, 36), C(0xe0a35a), [cx, 0.05, cz], null, [cr, 0.1, cr]);
    B.add('cream', G.torus(TAU, 0.07, 40), C(0xfff6fa), [cx, 0.12, cz], [PI / 2, 0, 0], [cr * 0.93, cr * 0.93, cr * 0.93]);
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16; B.add('glow', G.cyl(1, 1, 5), C(CANDY[i % CANDY.length], 1.1), [cx + Math.sin(a) * cr * 0.93, 0.2, cz + Math.cos(a) * cr * 0.93], [PI / 2, a, 0], [0.035, 0.2, 0.035]); }
    for (let i = 0; i < 12; i++) { const a = i * 2.4, r = 0.4 + (i % 4) * 0.5; B.add('gloss', G.sphere(7, 5), C(0x5a3020), [cx + Math.sin(a) * r, 0.12, cz + Math.cos(a) * r], null, [0.18, 0.08, 0.18]); }
    api.light(cx, 3.5, cz, 0xffd0e4, 2.2, 7, 0.08);
    api.glow(cx, cz, half + 1, 0xffd8ea, 0.16);
  }
  // ── Bisküvi sal: iskeleye gelince krema gölünde bir tur ──
  function raft(B, api, R, S) {
    // iskele: kurabiye tahtalar
    const yaw = Math.atan2(S.dx, S.dz);
    for (let i = 0; i < 3; i++) B.add('gloss', G.rbox(2), C(i % 2 ? 0xe8b06a : 0xd89a52), [S.e.x + S.dx * (i * 0.7 - 0.4), 0.12, S.e.z + S.dz * (i * 0.7 - 0.4)], [0, yaw, 0], [2.0, 0.18, 0.6]);
    for (const sd of [-1, 1]) {
      const x = S.e.x + S.px * 1.1 * sd + S.dx * 0.6, z = S.e.z + S.pz * 1.1 * sd + S.dz * 0.6;
      B.add('candy', cylH(), stripes(x, z, C(0xff5f9e), C(0xffffff), 2, 6), [x, 0.6, z], null, [0.12, 1.2, 0.12]);
      B.add('glow', G.sphere(8, 6), C(0xffd0e8, 1.8), [x, 1.3, z], null, [0.16, 0.16, 0.16]);
    }
    // gölün kendi kreması (zemin sıvısını güçlendirir): yumuşak, parlak, hafif dalgalı
    const pg = new THREE.CircleGeometry(1, 48); pg.rotateX(-PI / 2);
    const cm = poolMat(0xffe4ee, 0xffffff), pool = new THREE.Mesh(pg, cm);
    pool.position.set(S.cx, 0.02, S.cz); pool.scale.set(1, 1, 1); pool.rotation.y = Math.atan2(S.px, S.pz) - PI / 2;
    pool.scale.set(S.rx + 1.4, 1, S.ry + 1.4); pool.renderOrder = 1; api.add(pool);
    // ortadaki ada: altın şeker
    const ix = S.cx, iz = S.cz;
    B.add('cream', G.sphere(12, 8), C(0xfff6fa), [ix, 0.05, iz], null, [Math.min(1.3, S.rx * 0.3), 0.4, Math.min(1.0, S.ry * 0.4)]);
    const k = new Kit();   // sal: kare bisküvi + delikler + minik lolipop bayrak
    k.add(G.rbox(2), C(0xe6ad62), [0, 0.12, 0], null, [1.6, 0.22, 1.25]);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) k.add(G.sphere(6, 4), C(0xb07838), [-0.5 + a * 0.5, 0.235, -0.3 + b * 0.6], null, [0.06, 0.02, 0.06]);
    k.add(G.cyl(1, 1, 6), C(0xffffff), [0.6, 0.75, -0.45], null, [0.03, 1.1, 0.03]);
    k.add(G.cyl(1, 1, 16), (x, y, z) => (Math.sin(Math.atan2(y - 1.3, x - 0.6) + Math.hypot(x - 0.6, y - 1.3) * 18) > 0 ? C(0xff5f9e) : C(0xfff2a0)), [0.6, 1.3, -0.45], [PI / 2, 0, 0], [0.26, 0.06, 0.26]);
    const boat = O.solo(k, 'gloss', api);
    const home = { x: S.e.x + S.dx * 0.9, z: S.e.z + S.dz * 0.9 };
    boat.position.set(home.x, 0, home.z); boat.rotation.y = yaw;
    api.glow(S.dock.x, S.dock.z, 1.6, 0xffd0e4, 0.25);
    const ring = new Kit(); ring.add(G.torus(TAU, 0.12, 16), C(0xffd24a, 1.6), [0, 0.06, 0], [PI / 2, 0, 0], [0.9, 0.9, 0.9]);
    const rmk = O.solo(ring, 'glow', api); rmk.position.set(S.dock.x, 0, S.dock.z);
    // yol: iskele → giriş → halka → giriş → iskele
    const entry = { x: S.e.x + S.dx * 1.2, y: 0, z: S.e.z + S.dz * 1.2 };
    const loop = S.loop.slice();
    const path = [{ x: S.dock.x, y: 0, z: S.dock.z }, entry].concat(loop).concat([entry, { x: S.dock.x, y: 0, z: S.dock.z }]);
    let rides = 0, bob = 0, riding = false;
    const gs = O.goldSugar(api, R, ix, 0.75, iz, { sticker: 'gizli_krema_sal', r: 0.01, dy: 0.01 });
    api.anim((dt) => {
      bob += dt; const s = 1 + Math.sin(bob * 4) * 0.08; rmk.scale.set(s, 1, s);
      if (!riding) { boat.position.set(home.x, 0.02 + Math.sin(bob * 1.6) * 0.04, home.z); boat.rotation.z = Math.sin(bob * 1.3) * 0.04; }
    });
    R.zones.push({ x: S.dock.x, z: S.dock.z, r: 6, enter: () => O.say('odp_sal') });
    R.zones.push({ x: S.dock.x, z: S.dock.z, r: 0.95, enter() {
      if (R.busy() || R.cd > 0) return;
      riding = true; O.sfx('splash', { vol: 0.5 }); O.burst('cream', S.dock.x, 0.3, S.dock.z, {});
      R.ride(path, { climb: 0.3, speed: [2.6, 3.2], sit: 0.2, onStep(x, y, z, u, dt) {
        const i = Math.min(path.length - 2, Math.floor(u * (path.length - 1))), a = path[i], b = path[i + 1];
        boat.position.set(x, 0.02 + Math.sin(bob * 3) * 0.05, z); boat.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); boat.rotation.z = Math.sin(bob * 2.2) * 0.06;
        if (Math.random() < 0.3) O.burst('cream', x, 0.15, z, { count: 2 });
        if (!gs.got && u > 0.35 && u < 0.75 && hyp(x - ix, z - iz) < Math.max(S.rx, S.ry) + 0.5) { gs.got = true; gs.obj.visible = false; gs.onGet(gs); }
      }, onEnd() {
        riding = false; rides++;
        O.burst('confetti', S.dock.x, 1, S.dock.z, {}); O.sfx('cheer', { vol: 0.5 });
        O.coins(S.dock.x, S.dock.z, rides === 1 ? 8 : rides < 4 ? 2 : 1, 0.8);
        if (rides === 1) O.say('odp_sal_ok', { gap: 0 });
      } });
    } });
  }
  // ── Dev krema torbası: dokununca sıkılır, yere krema çiçeği + şekerler ──
  function pipingBag(B, api, R, S) {
    const k = new Kit();   // yerel: uç +z yönünde
    k.add(G.cone(18), (x, y, z) => (Math.sin(Math.atan2(x, y) * 6) > 0 ? C(0xffffff) : C(0xffd6e6)), [0, 0, 0.4], [PI / 2, 0, 0], [1.15, 3.0, 1.15]);
    k.add(G.sphere(14, 10), C(0xffd6e6), [0, 0, -1.15], null, [1.15, 1.15, 0.5]);
    k.add(G.sphere(12, 8), C(0xffffff), [0, 0.1, -1.6], null, [0.55, 0.45, 0.45]);
    k.add(G.torus(TAU, 0.3, 14), C(0xff7aa8), [0, 0, -1.2], null, [1.0, 1.0, 1.0]);
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; k.add(G.cone(4), C(0xd8dee8), [Math.sin(a) * 0.14, Math.cos(a) * 0.14, 2.05], [PI / 2, 0, 0], [0.09, 0.4, 0.09]); }
    k.add(G.sphere(12, 8), C(0xffe6f0), [0, 0, 2.25], null, [0.3, 0.3, 0.3]);
    const bag = O.solo(k, 'cream', api, true), yaw = Math.atan2(-S.dx, -S.dz);
    bag.position.set(S.bx, 1.15, S.bz); bag.rotation.set(0, yaw, 0); bag.rotateX(0.32);
    B.add('cream', G.sphere(12, 8), C(0xfff2f6), [S.bx, 0.05, S.bz], null, [1.6, 0.3, 1.3]);
    const ring = new Kit(); ring.add(G.torus(TAU, 0.12, 32), C(0xffd24a, 1.6), [0, 0.06, 0], [PI / 2, 0, 0], [0.85, 0.85, 0.85]);
    const rmk = O.solo(ring, 'glow', api); rmk.position.set(S.sx, 0, S.sz);
    api.light(S.sx, 1.6, S.sz, 0xffc8e0, 1.4, 5, 0);
    // krema çiçekleri (önceden kurulur, sırayla belirir)
    const ros = S.spots.map((p, i) => {
      const c = PASTEL[i % PASTEL.length], rk = new Kit();
      for (let j = 0; j < 3; j++) rk.add(G.torus(TAU, 0.42, 14), C(c), [0, 0.12 + j * 0.16, 0], [PI / 2, 0, j * 0.8], [0.42 - j * 0.11, 0.42 - j * 0.11, 0.36 - j * 0.08]);
      rk.add(G.cone(10), C(c), [0, 0.62, 0], null, [0.12, 0.25, 0.12]);
      rk.add(G.sphere(8, 6), C(CANDY[i % CANDY.length]), [0, 0.8, 0], null, [0.1, 0.1, 0.1]);
      const m = O.solo(rk, 'cream', api); m.position.set(p.x, 0, p.z); m.visible = false; m.userData.t = -1;
      return m;
    });
    let n = 0, sq = 0, pulse = 0;
    api.anim(dt => {
      pulse += dt; rmk.scale.setScalar(1 + Math.sin(pulse * 4) * 0.08);
      sq = Math.max(0, sq - dt * 2.5);
      const w = Math.sin(sq * PI);
      bag.scale.set(1 - w * 0.12, 1 - w * 0.12, 1 + w * 0.06);
      for (const m of ros) if (m.userData.t >= 0 && m.userData.t < 1) { m.userData.t = Math.min(1, m.userData.t + dt * 2.5); const u = m.userData.t, b = 1 + Math.sin(u * PI) * 0.35; m.scale.set(b * u, u, b * u); }
    });
    R.zones.push({ x: S.sx, z: S.sz, r: 6, enter: () => O.say('odp_torba') });
    R.zones.push({ x: S.sx, z: S.sz, r: 1.1, enter() {
      sq = 1; n++;
      O.sfx('squish', { vol: 0.9, pitch: 0.9 + Math.random() * 0.3 });
      const tipX = S.ex - S.dx * 0.2, tipZ = S.ez - S.dz * 0.2;
      O.burst('cream', tipX, 0.6, tipZ, { count: 10 }); O.burst('sparkle', tipX, 0.8, tipZ, { count: 6, color: '#ffc0d8' });
      const m = ros[(n - 1) % Math.max(1, ros.length)];
      if (m) { m.visible = true; m.userData.t = 0; m.scale.setScalar(0.01); O.burst('confetti', m.position.x, 0.8, m.position.z, {}); }
      if (n <= 6) O.coins(tipX, tipZ, 2, 0.8);
      if (n === 3) { O.say('odp_torba_ok', { gap: 0 }); if (GAME.giveSticker) GAME.giveSticker('gizli_krema_torbasi', 'gizli'); O.goldSugar(api, R, tipX - S.dx * 1.6, 0.8, tipZ - S.dz * 1.6, {}); }
    } });
  }
  // akan krema / çikolata yüzeyi (paylaşılan gölge: hafif dalga + parıltı)
  const POOL = {};
  function poolMat(a, b, choc) {
    const key = a + '-' + b;
    if (POOL[key]) return POOL[key];
    const m = new THREE.MeshStandardMaterial({ color: a, roughness: choc ? 0.18 : 0.25, metalness: 0.0, transparent: true, opacity: 0.96, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    patchMat(m, { uniforms: { uT: TIME.u, uB: { value: new THREE.Color(b) } }, vDecl: 'varying vec3 vPw;', vBegin: 'vPw = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      fDecl: 'uniform float uT; uniform vec3 uB; varying vec3 vPw;',
      fMap: 'float sw = sin(vPw.x * 1.7 + uT * 1.1 + sin(vPw.z * 1.3 - uT * 0.7) * 1.5) * 0.5 + 0.5; diffuseColor.rgb = mix(diffuseColor.rgb, uB, smoothstep(0.55, 0.95, sw) * 0.55);',
      fOut: 'outgoingLight += uB * 0.05 * smoothstep(0.7, 1.0, sin(vPw.x * 3.1 - uT * 1.6 + vPw.z * 2.3) * 0.5 + 0.5);', key: 'odpPool' });
    m.userData.keep = true;
    return (POOL[key] = m);
  }
  // ── Lolipop fenerleri ──
  function lanterns(B, api, R, list) {
    let lit = 0, done = false;
    const LT = api.B.lights;
    list.forEach((p, i) => {
      const c = CANDY[(i * 2) % CANDY.length];
      B.add('candy', cylH(), stripes(p.x, p.z, C(0xffffff), C(0xffd0e4), 1, 4), [p.x, 1.1, p.z], null, [0.07, 2.2, 0.07]);
      B.add('cream', G.torus(TAU, 0.35, 16), C(0x7ad86a), [p.x, 1.2, p.z], [0, 0.4, 0], [0.18, 0.18, 0.18]);
      const k = new Kit();
      k.add(G.sphere(28, 18), (x, y, z) => (Math.sin(Math.atan2(y, x) * 2 + Math.hypot(x, y) * 14) > 0 ? C(c) : C(0xffffff)), [0, 0, 0], null, [0.62, 0.62, 0.16]);
      k.add(G.torus(TAU, 0.08, 16), C(c), [0, 0, 0], null, [0.63, 0.63, 0.9]);
      const pop = O.solo(k, 'candy', api); pop.position.set(p.x, 2.65, p.z);
      const h = new Kit(); h.add(G.sphere(12, 9), C(c, 0.8), [0, 0, 0], null, [1, 1, 1]);
      const halo = new THREE.Mesh(h.build(), O.mat('halo')); halo.position.copy(pop.position); halo.scale.setScalar(0.01); halo.renderOrder = 3; api.add(halo);
      const li = api.light(p.x, 2.8, p.z, c, 0, 6, 0.08) - 1, L0 = LT[li];
      p.state = { on: false, t: 0 };
      api.glow(p.x, p.z, 1.0, c, 0.12);
      api.anim((dt, fx0, fz0) => {
        pop.rotation.y = Math.sin(R.t * 1.2 + i) * 0.35;
        if (!p.state.on && Math.random() < dt * 0.6 && hyp(fx0 - p.x, fz0 - p.z) < 10) O.burst('sparkle', p.x, 2.7, p.z, { count: 2, color: '#' + C(c).getHexString() });
        if (p.state.on) { p.state.t = Math.min(1, p.state.t + dt * 2.5); const s = 0.9 + Math.sin(R.t * 3 + i) * 0.08; halo.scale.setScalar(s * p.state.t); if (L0) L0.int = 2.6 * p.state.t; }
      });
      R.zones.push({ x: p.x, z: p.z, r: 1.5, enter() {
        if (p.state.on) { O.sfx('bubblePop', { pitch: 1.4 }); O.burst('sparkle', p.x, 2.6, p.z, { count: 6, color: '#' + C(c).getHexString() }); return; }
        p.state.on = true; lit++;
        O.sfx('star', { x: p.x, z: p.z, pitch: 0.9 + lit * 0.12 }); O.burst('star', p.x, 2.7, p.z, { count: 8 });
        O.coins(p.x, p.z, 2, 0.6, 2);
        if (lit === list.length && !done) {
          done = true;
          setTimeout(() => {
            const P = GAME.P; O.burst('confetti', P.pos.x, 2, P.pos.z, {}); O.sfx('cheer', { vol: 0.8 }); O.coins(P.pos.x, P.pos.z, 12, 1.1);
            if (GAME.giveSticker) GAME.giveSticker('gizli_lolipop_fener', 'gizli');
            O.say('odp_fener_ok', { gap: 0 });
            O.goldSugar(api, R, P.pos.x + 1.2, 0.8, P.pos.z - 0.8, {});
          }, 500);
        }
      } });
    });
    R.zones.push({ x: list[0].x, z: list[0].z, r: 7, enter: () => O.say('odp_fener') });
  }
  // ── Kurabiye evi: kapısı açılır, yaylı şekerleme fırlar ──
  function cookieHouse(B, api, R, h, idx) {
    const k = new Kit();
    const dough = C(0xdc9a50), icing = C(0xfffaf4), choc = C(0x6a3a22);
    k.add(G.rbox(3), dough, [0, 1.4, 0], null, [3.2, 2.8, 3.0]);
    for (const sd of [-1, 1]) {
      k.add(G.rbox(2), choc, [sd * 0.95, 3.45, 0], [0, 0, -sd * 0.72], [2.25, 0.32, 3.4]);
      for (let i = 0; i < 7; i++) k.add(G.sphere(7, 5), icing, [sd * 1.75, 2.62 - (i % 2) * 0.12, -1.5 + i * 0.5], null, [0.2, 0.28, 0.2]);
    }
    for (let i = 0; i < 6; i++) k.add(G.sphere(8, 6), C(CANDY[i % CANDY.length]), [0, 4.3, -1.25 + i * 0.5], null, [0.22, 0.22, 0.22]);
    k.add(G.rbox(2), C(0xffffff), [0, 2.82, 1.52], null, [3.25, 0.12, 0.12]);
    for (const sd of [-1, 1]) {   // pencereler (sıcak ışık)
      k.add(G.rbox(2), C(0xffd88a, 1.8), [sd * 1.0, 1.75, 1.51], null, [0.62, 0.62, 0.06]);
      k.add(G.box(), icing, [sd * 1.0, 1.75, 1.55], null, [0.7, 0.08, 0.04]); k.add(G.box(), icing, [sd * 1.0, 1.75, 1.55], null, [0.08, 0.7, 0.04]);
    }
    k.add(G.cyl(1, 1, 12), C(0xff7aa8), [1.0, 4.0, -0.6], null, [0.28, 1.2, 0.28]);
    for (let i = 0; i < 3; i++) k.add(G.sphere(8, 6), C(0xffd0e4), [1.0 + i * 0.25, 4.85 + i * 0.4, -0.6], null, [0.35 + i * 0.1, 0.3 + i * 0.08, 0.35 + i * 0.1]);
    const house = O.solo(k, 'gloss', api, true); house.position.set(h.x, 0, h.z); house.rotation.y = h.yaw;
    api.light(h.x + Math.sin(h.yaw) * 2.2, 1.8, h.z + Math.cos(h.yaw) * 2.2, 0xffd08a, 1.8, 5.5, 0.12);
    // kapı (çikolata tablet): menteşeden açılır
    const dk = new Kit();
    dk.add(G.rbox(2), choc, [0.45, 0.75, 0], null, [0.9, 1.5, 0.12]);
    for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) dk.add(G.rbox(2), C(0x7e4a2c), [0.24 + a * 0.42, 0.3 + b * 0.45, 0.07], null, [0.34, 0.36, 0.05]);
    dk.add(G.sphere(7, 5), C(0xffd24a), [0.78, 0.75, 0.12], null, [0.07, 0.07, 0.07]);
    const door = O.solo(dk, 'gloss', api);
    const hinge = new THREE.Group(); hinge.position.set(h.x + Math.sin(h.yaw) * 1.53 + Math.cos(h.yaw) * -0.45, 0, h.z + Math.cos(h.yaw) * 1.53 - Math.sin(h.yaw) * -0.45); hinge.rotation.y = h.yaw;
    api.add(hinge); hinge.add(door); door.position.set(0, 0, 0);
    // yaylı sürpriz: yay + gülen şekerleme topu
    const jk = new Kit();
    for (let i = 0; i < 6; i++) jk.add(G.torus(TAU, 0.12, 16), C(0xc0c8d8), [0, 0.1 + i * 0.13, 0], [PI / 2, 0, 0], [0.22, 0.22, 0.22]);
    jk.add(G.sphere(14, 10), C(CANDY[idx % CANDY.length]), [0, 1.05, 0], null, [0.42, 0.42, 0.42]);
    for (const sd of [-1, 1]) jk.add(G.sphere(7, 5), C(0x2a2030), [sd * 0.14, 1.12, 0.37], null, [0.06, 0.08, 0.04]);
    jk.add(G.torus(PI, 0.25, 12), C(0x2a2030), [0, 0.98, 0.38], [0, 0, PI], [0.12, 0.12, 0.12]);
    for (const sd of [-1, 1]) jk.add(G.sphere(7, 5), C(0xff8aa8), [sd * 0.26, 1.0, 0.33], null, [0.08, 0.05, 0.03]);
    const jack = O.solo(jk, 'candy', api); jack.visible = false;
    const st = { open: 0, t: 0, used: false, jt: -1 };
    const dx = h.door.x, dz = h.door.z;
    api.anim(dt => {
      const tgt = st.used ? 1 : 0;
      st.open = damp(st.open, tgt, 5, dt); hinge.rotation.y = h.yaw - st.open * 1.7;
      if (st.jt >= 0) {
        st.jt += dt; const u = Math.min(1, st.jt / 0.35), wob = Math.sin(st.jt * 18) * Math.exp(-st.jt * 3) * 0.25;
        jack.visible = true; jack.position.set(h.x + Math.sin(h.yaw) * 1.9, 0, h.z + Math.cos(h.yaw) * 1.9); jack.rotation.y = h.yaw;
        jack.scale.set(1 - wob * 0.5, Math.max(0.05, u * (1.4 + wob)), 1 - wob * 0.5);
      }
    });
    R.zones.push({ x: dx, z: dz, r: 1.6, enter() {
      if (st.used) return;
      st.used = true; st.jt = 0;
      O.sfx('open', { vol: 0.8 }); setTimeout(() => { O.sfx('bounce', { pitch: 1.5 }); O.sfx('cheer', { vol: 0.5 }); }, 250);
      O.burst('confetti', dx, 1.6, dz, {}); O.burst('star', dx, 1.2, dz, { count: 10 });
      O.coins(dx, dz, 10, 1);
      O.say('odp_ev', { gap: 0 });
      if (idx === 0) O.goldSugar(api, R, dx + Math.cos(h.yaw) * 1.0, 0.8, dz - Math.sin(h.yaw) * 1.0, { sticker: 'gizli_kurabiye_ev' });
    } });
  }
  // ── Mumlar: dokununca yanar; hepsi yanınca hediye ──
  function candles(B, api, R, list) {
    let lit = 0, done = false;
    const LT = api.B.lights, flame = flameGeo();
    list.forEach((p, i) => {
      const c = CANDY[(i * 3 + 1) % CANDY.length], h = 1.5 + (i % 3) * 0.35;
      B.add('candy', cylH(), stripes(p.x, p.z, C(c), C(0xffffff), 2, 5), [p.x, h / 2, p.z], null, [0.26, h, 0.26]);
      B.add('cream', G.cyl(1, 1.15, 16), C(0xfff6f0), [p.x, 0.1, p.z], null, [0.5, 0.2, 0.5]);
      B.add('cream', G.sphere(8, 6), C(0xfff6f0), [p.x + 0.12, h - 0.05, p.z + 0.1], null, [0.12, 0.2, 0.12]);
      B.add('matte', G.cyl(1, 1, 6), C(0x3a2a20), [p.x, h + 0.08, p.z], null, [0.025, 0.16, 0.025]);
      const fl = new THREE.Mesh(flame, O.mat('glow')); fl.position.set(p.x, h + 0.16, p.z); fl.scale.setScalar(0.01); api.add(fl);
      const li = api.light(p.x, h + 0.6, p.z, 0xffc070, 0, 6, 0.25) - 1, L0 = LT[li];
      let t = 0, on = false;
      api.anim((dt, fx0, fz0) => { if (!on) { if (Math.random() < dt * 0.6 && hyp(fx0 - p.x, fz0 - p.z) < 10) O.burst('sparkle', p.x, h + 0.25, p.z, { count: 2, color: '#ffd080' }); return; } t = Math.min(1, t + dt * 3); const f = 1 + Math.sin(R.t * 17 + i) * 0.08 + Math.sin(R.t * 29 + i * 2) * 0.05; fl.scale.set(t * f, t * (1.1 + (f - 1) * 2), t * f); if (L0) L0.int = 2.4 * t; });
      R.zones.push({ x: p.x, z: p.z, r: 1.35, enter() {
        if (on) return;
        on = true; lit++;
        O.sfx('fireball', { x: p.x, z: p.z, vol: 0.4, pitch: 1.6 }); O.burst('sparkle', p.x, h + 0.3, p.z, { count: 8, color: '#ffd080' });
        O.coins(p.x, p.z, 2, 0.6, 1.5);
        if (lit === list.length && !done) {
          done = true;
          setTimeout(() => {
            const P = GAME.P; O.burst('confetti', P.pos.x, 2, P.pos.z, {}); O.sfx('cheer', { vol: 0.8 }); O.coins(P.pos.x, P.pos.z, 12, 1.1);
            if (GAME.giveSticker) GAME.giveSticker('gizli_seker_mum', 'gizli');
            O.say('odp_mum_ok', { gap: 0 });
            O.goldSugar(api, R, P.pos.x - 1.2, 0.8, P.pos.z - 0.8, {});
          }, 500);
        }
      } });
    });
    R.zones.push({ x: list[0].x, z: list[0].z, r: 7, enter: () => O.say('odp_mum') });
  }
  let FLAME = null;
  function flameGeo() {
    if (FLAME) return FLAME;
    const k = new Kit();
    k.add(G.sphere(10, 7), C(0xffb040, 2.6), [0, 0.12, 0], null, [0.12, 0.16, 0.12]);
    k.add(G.cone(12), C(0xffd070, 2.8), [0, 0.32, 0], null, [0.1, 0.3, 0.1]);
    k.add(G.sphere(7, 5), C(0xfff6d0, 3.4), [0, 0.12, 0], null, [0.06, 0.09, 0.06]);
    FLAME = k.build(); FLAME.userData.keep = true; return FLAME;
  }
  // ── Pamuk şeker bulutu zıplatıcı ──
  function cloudPad(api, p) {
    const k = new Kit(), c = C(p.col);
    k.add(G.sphere(14, 10), c, [0, 0.2, 0], null, [0.85, 0.5, 0.85]);
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7; k.add(G.sphere(11, 8), C(p.col).lerp(C(0xffffff), (i % 2) * 0.3), [Math.sin(a) * 0.62, 0.25 + (i % 2) * 0.12, Math.cos(a) * 0.62], null, [0.42, 0.36, 0.42]); }
    k.add(G.sphere(11, 8), C(0xffffff).lerp(c, 0.4), [0, 0.55, 0], null, [0.5, 0.32, 0.5]);
    const m = O.solo(k, 'cream', api); m.position.set(p.x, 0, p.z);
    api.light(p.x, 1.4, p.z, p.col, 1.2, 4, 0); api.glow(p.x, p.z, p.r * 1.8, p.col, 0.22);
    const pad = { x: p.x, z: p.z, r: p.r * 0.95, col: '#' + C(p.col).getHexString(), h: 2.8, dur: 0.85, hit: 0, w: 0, wv: 0 };
    pad.anim = dt => {
      if (pad.hit) { pad.wv -= 9; pad.hit = 0; }
      pad.wv += (-pad.w * 110 - pad.wv * 6) * dt; pad.w += pad.wv * dt;
      const s = p.r * 1.15; m.scale.set(s * (1 - pad.w * 0.1), s * (1 + pad.w * 0.2), s * (1 - pad.w * 0.1));
      m.position.y = Math.sin(R0t() * 1.5 + p.x) * 0.04;
    };
    return pad;
  }
  let _t0 = 0; const R0t = () => (_t0 = (typeof TIME !== 'undefined' ? TIME.t : _t0 + 0.016));
  // Uçan pamuk şeker bulutları (kuzeyde, yüksekte; hafifçe süzülür)
  function floatingClouds(api, L, rnd) {
    const k = new Kit(), list = [];
    const A = L.areas || [];
    const rooms = A[2] ? A[2].rooms.map(i => L.rooms[i]).filter(r => r.kind !== 'side') : [];
    for (const rm of rooms) for (let i = 0; i < 3; i++) {
      const x = rm.x + (i - 1) * rm.r * 0.9 + (rnd() - 0.5) * 2, z = rm.z - rm.r - 3 - rnd() * 4, y = 5.5 + rnd() * 2;
      if (api.isFloor(x, z + 3) || api.isFloor(x, z) || api.isFloor(x, z + 6) || L.rooms.some(q => q.kind === 'boss' && Math.hypot(q.x - x, q.z - z) < (q.r || 11) + 6)) continue;
      const c = [0xffc4dc, 0xc8ecff, 0xe2d2ff][i % 3];
      for (let j = 0; j < 6; j++) k.add(G.sphere(11, 8), C(c).lerp(C(0xffffff), (j % 2) * 0.35), [x + (j - 2.5) * 0.7, y + Math.sin(j * 1.7) * 0.3, z + Math.cos(j * 2.1) * 0.4], null, [0.9 + (j % 3) * 0.25, 0.7, 0.8]);
    }
    if (!k.parts.length) return;
    const m = O.solo(k, 'cream', api); m.castShadow = false;
    let t = 0; api.anim(dt => { t += dt; m.position.y = Math.sin(t * 0.6) * 0.25; m.position.x = Math.sin(t * 0.25) * 0.4; });
  }
  // ── Çikolata şelalesi: çikolatalı kek yamacından akan, parlak, akan doku ──
  let FALL_MAT = null;
  function chocoFall(B, api, R, F) {
    const { x, z, dx, dz } = F, yaw = Math.atan2(dx, dz), Hh = 5.2;
    // yamaç: kat kat çikolatalı kek
    for (let i = 0; i < 3; i++) B.add('gloss', G.rbox(3), C(i % 2 ? 0x7a4426 : 0x5e321c), [x + dx * 1.0, 0.9 + i * 1.7, z + dz * 1.0], [0, yaw, 0], [6.4 - i * 0.6, 1.75, 3.4]);
    for (let i = 0; i < 3; i++) B.add('cream', G.rbox(2), C(0xfff4f8), [x + dx * 1.0, 1.75 + i * 1.7, z + dz * 1.0], [0, yaw, 0], [6.5 - i * 0.6, 0.16, 3.5]);
    for (let i = 0; i < 9; i++) B.add('candy', G.sphere(10, 7), C(0xe8203a), [x + dx * 1.2 + Math.cos(yaw) * (i - 4) * 0.65, Hh + 0.25, z + dz * 1.2 - Math.sin(yaw) * (i - 4) * 0.65], null, [0.28, 0.28, 0.28]);
    // akan çikolata perdesi
    if (!FALL_MAT) {
      FALL_MAT = new THREE.MeshStandardMaterial({ color: 0x6a3418, roughness: 0.15, metalness: 0.05, side: THREE.DoubleSide });
      patchMat(FALL_MAT, { uniforms: { uT: TIME.u }, vDecl: 'varying vec2 vU2;', vBegin: 'vU2 = uv;', fDecl: 'uniform float uT; varying vec2 vU2;',
        fMap: 'float fl = sin(vU2.x * 40.0 + sin(vU2.y * 6.0) * 2.0) * 0.5 + 0.5; float st = fract(vU2.y * 3.0 + uT * 1.4 + fl * 0.15); diffuseColor.rgb *= 0.8 + 0.45 * smoothstep(0.6, 1.0, st) + 0.15 * fl;', key: 'odpFall' });
      FALL_MAT.userData.keep = true;
    }
    const fg = new THREE.PlaneGeometry(2.6, Hh, 1, 12);
    const p = fg.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = (p.getY(i) + Hh / 2) / Hh; p.setZ(i, Math.pow(1 - v, 2) * 1.6); }
    fg.computeVertexNormals();
    const fall = new THREE.Mesh(fg, FALL_MAT); fall.position.set(x - dx * 0.6, Hh / 2, z - dz * 0.6); fall.rotation.y = yaw + PI; api.add(fall);
    // havuz
    const pg = new THREE.CircleGeometry(1, 40); pg.rotateX(-PI / 2);
    const pool = new THREE.Mesh(pg, poolMat(0x6a3418, 0xa8683a, true)); pool.position.set(x - dx * 2.2, 0.03, z - dz * 2.2); pool.scale.set(2.6, 1, 2.0); pool.rotation.y = yaw; api.add(pool);
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10; B.add('cream', G.sphere(8, 6), C(0xfff4f8), [pool.position.x + Math.sin(a) * 2.6, 0.1, pool.position.z + Math.cos(a) * 2.0], null, [0.42, 0.22, 0.42]); }
    api.light(x - dx * 2.5, 2.5, z - dz * 2.5, 0xffd0a0, 2.0, 7, 0.05);
    let t = 0;
    api.anim(dt => { t += dt; if (Math.random() < dt * 6) O.burst('cream', pool.position.x + (Math.random() - 0.5) * 1.6, 0.2, pool.position.z + (Math.random() - 0.5) * 0.6, { count: 2, color: '#7a4426' }); });
    R.zones.push({ x: pool.position.x, z: pool.position.z, r: 6, enter: () => O.say('odp_selale') });
  }
  // ── Arena: dev pasta platformu, aşamalara göre süslenir; final kutlaması ──
  let CAKE_TEX = null;
  function cakeTexture() {
    if (CAKE_TEX) return CAKE_TEX;
    const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
    const gr = x.createRadialGradient(512, 512, 40, 512, 512, 512); gr.addColorStop(0, '#9a5636'); gr.addColorStop(0.7, '#7e4128'); gr.addColorStop(1, '#5e2e1c');
    x.fillStyle = gr; x.fillRect(0, 0, 1024, 1024);
    // krema sıkma halkaları
    for (const [r, col] of [[470, '#fff6ee'], [330, '#ff9ec4'], [180, '#fff6ee']]) {
      for (let i = 0; i < Math.round(r / 7); i++) { const a = i / Math.round(r / 7) * TAU; x.fillStyle = col; x.beginPath(); x.arc(512 + Math.cos(a) * r, 512 + Math.sin(a) * r, 16, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.arc(512 + Math.cos(a) * r - 4, 512 + Math.sin(a) * r - 5, 5, 0, TAU); x.fill(); }
    }
    // şeker serpintisi
    const sc = ['#ff5f9e', '#ffb13b', '#6fd6ff', '#9a7bff', '#6fe0a0', '#ffe45a'];
    for (let i = 0; i < 700; i++) { const a = Math.random() * TAU, r = Math.random() * 500, px = 512 + Math.cos(a) * r, py = 512 + Math.sin(a) * r; x.save(); x.translate(px, py); x.rotate(Math.random() * TAU); x.fillStyle = sc[i % sc.length]; x.fillRect(-7, -2.5, 14, 5); x.restore(); }
    CAKE_TEX = new THREE.CanvasTexture(c); CAKE_TEX.colorSpace = THREE.SRGBColorSpace; CAKE_TEX.anisotropy = 4; CAKE_TEX.userData.keep = true;
    return CAKE_TEX;
  }
  let CAKE_MAT = null;
  function cakeArena(B, api, R, L, A, rnd) {
    const r = A.r - 0.8;
    if (!CAKE_MAT) { CAKE_MAT = rimify(new THREE.MeshStandardMaterial({ map: cakeTexture(), roughness: 0.28, color: 0xd8c8c0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 0xffffff, 0.15, 3); CAKE_MAT.userData.keep = true; }
    const dg = new THREE.CircleGeometry(1, 72); dg.rotateX(-PI / 2);
    const top = new THREE.Mesh(dg, CAKE_MAT); top.position.set(A.x, 0.03, A.z); top.scale.set(r, 1, r); top.receiveShadow = true; top.renderOrder = 1; api.add(top);
    // pastanın kenarı: kat kat krema bordür + çilekler (yürünmez kenarda; güneyde alçak)
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, x = A.x + Math.sin(a) * (A.r + 0.9), z = A.z + Math.cos(a) * (A.r + 0.9);
      if (api.isFloor(x, z) && api.linkDist(x, z) < 3) continue;
      B.add('cream', G.sphere(11, 8), C(i % 2 ? 0xfff6fa : 0xffd0e0), [x, 0.3, z], null, [0.8, 0.5, 0.8]);
      if (i % 2 === 0) strawberryBig(B, x, 0.85, z, 0.42);
    }
    // aşama süsleri: çevrede dev mumlar (kuzey yarı), aralarında bayraklı süs ipleri (2. aşama), mum alevleri (3. aşama)
    const LT = api.B.lights, candlesA = [], ropes = new Kit(), flags = [];
    const nC = 9;
    for (let i = 0; i < nC; i++) {
      const a = PI / 2 + (i / (nC - 1)) * PI, x = A.x + Math.sin(a) * (A.r + 2.6), z = A.z + Math.cos(a) * (A.r + 2.6), h = 3.4 + (i % 2) * 0.8;
      if (api.isFloor(x, z)) continue;
      const c = CANDY[i % CANDY.length];
      B.add('candy', cylH(), stripes(x, z, C(c), C(0xffffff), 2, 3), [x, h / 2, z], null, [0.42, h, 0.42]);
      B.add('cream', G.sphere(8, 6), C(0xfff6f0), [x + 0.2, h - 0.1, z + 0.15], null, [0.18, 0.32, 0.18]);
      B.add('matte', G.cyl(1, 1, 6), C(0x3a2a20), [x, h + 0.1, z], null, [0.035, 0.22, 0.035]);
      candlesA.push({ x, z, h, c });
    }
    for (let i = 1; i < candlesA.length; i++) {   // süs ipi + bayraklar (2. aşama)
      const a = candlesA[i - 1], b = candlesA[i];
      for (let s = 0; s <= 8; s++) {
        const u = s / 8, x = lerp(a.x, b.x, u), z = lerp(a.z, b.z, u), y = lerp(a.h, b.h, u) - 0.25 - Math.sin(u * PI) * 0.9;
        if (s > 0 && s < 8) ropes.add(G.cone(4), C(CANDY[(i + s) % CANDY.length]), [x, y - 0.25, z], [PI, Math.atan2(b.x - a.x, b.z - a.z) + PI / 2, 0], [0.24, 0.42, 0.04]);
        ropes.add(G.sphere(6, 4), C(0xffffff), [x, y, z], null, [0.06, 0.06, 0.06]);
      }
    }
    const ropeMesh = ropes.parts.length ? O.solo(ropes, 'candy', api) : null;
    if (ropeMesh) { ropeMesh.visible = false; ropeMesh.scale.set(1, 1, 1); }
    const flameIM = new THREE.InstancedMesh(flameGeo(), O.mat('glow'), Math.max(1, candlesA.length)); flameIM.count = candlesA.length; flameIM.frustumCulled = false; api.add(flameIM);
    const _fm = new THREE.Matrix4(), _fp = new THREE.Vector3(), _fq = new THREE.Quaternion(), _fs = new THREE.Vector3();
    candlesA.forEach((c, i) => { _fp.set(c.x, -5, c.z); _fs.set(0.01, 0.01, 0.01); flameIM.setMatrixAt(i, _fm.compose(_fp, _fq, _fs)); });
    const flameLi = candlesA.map(c => api.light(c.x, c.h + 0.8, c.z, 0xffc070, 0, 9, 0.2) - 1);
    const setFlames = k => { candlesA.forEach((c, i) => { const f = 1 + Math.sin(st.t * 15 + i) * 0.08; _fp.set(c.x, c.h + 0.2, c.z); _fs.set(Math.max(0.01, 1.5 * k * f), Math.max(0.01, 1.6 * k * (1 + (f - 1) * 2)), Math.max(0.01, 1.5 * k * f)); flameIM.setMatrixAt(i, _fm.compose(_fp, _fq, _fs)); }); flameIM.instanceMatrix.needsUpdate = true; };
    // arenanın üstünde süzülen ışık balonları (2. aşamada belirir)
    const orbs = new Kit();
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, x = A.x + Math.sin(a) * (A.r * 0.7), z = A.z + Math.cos(a) * (A.r * 0.7) - 2; orbs.add(G.sphere(10, 7), C(CANDY[i % CANDY.length], 1.6), [x - A.x, 6.5 + (i % 3) * 0.6, z - A.z], null, [0.28, 0.28, 0.28]); }
    const orbMesh = O.solo(orbs, 'glow', api); orbMesh.position.set(A.x, 0, A.z); orbMesh.visible = false;
    const lights2 = [0, 1, 2].map(i => api.light(A.x + Math.sin(i * 2.1) * A.r * 0.6, 5, A.z + Math.cos(i * 2.1) * A.r * 0.6 - 1, [0xff9ac8, 0xffe08a, 0x9ae8ff][i], 0, 12, 0.05) - 1);
    // kutlama
    const st = { phase: 1, t: 0, fin: false, finT: 0, fwT: 0, ph2: 0, ph3: 0, wasDone: !!(typeof GAME !== 'undefined' && GAME.P && GAME.P.bossNese && GAME.P.bossNese.pasta) };
    R.zones.push({ x: A.x, z: A.z, r: A.r, enter: () => O.say('odp_arena', { gap: 3 }) });
    // STORY.ending (ya da başka biri) büyük kutlamayı başlatabilir: ODAB.celebrate() → üç hafif havai fişek, sonra kısa ve seyrek kutlama
    O.celebrate = () => {
      if (!GAME.L || GAME.L !== L) return false;
      st.fin = true; st.finT = 0; st.phase = 3;
      const P = GAME.P;
      for (let i = 0; i < 3; i++) setTimeout(() => firework(api, P.pos.x + (Math.random() - 0.5) * 10, 3.8 + Math.random() * 2, P.pos.z - 1 - Math.random() * 6, CANDY[i % CANDY.length]), i * 420);
      O.burst('confetti', P.pos.x, 3, P.pos.z, {}); O.burst('hearts', P.pos.x, 2, P.pos.z, {});
      return true;
    };
    api.anim(dt => {
      st.t += dt;
      const b = GAME.boss;
      const inArena = b && hyp(b.x - A.x, b.z - A.z) < A.r + 6;
      let frac = 1;
      if (b && inArena && b.maxHp) frac = b.dead ? 0 : b.hp / b.maxHp;
      const P = GAME.P, nowDone = !st.wasDone && !!(P && P.bossNese && P.bossNese.pasta);
      if (nowDone) frac = 0;
      const want = frac <= 0.34 ? 3 : frac <= 0.67 ? 2 : 1;
      if (want > st.phase) {
        st.phase = want;
        if (want === 2) { O.say('odp_asama2', { gap: 2 }); O.sfx('unlock'); O.burst('confetti', A.x, 3.5, A.z, { count: 8, scale: 0.65 }); }
        if (want === 3) { O.say('odp_asama3', { gap: 2 }); O.sfx('star'); for (const c of candlesA) O.burst('sparkle', c.x, c.h + 0.3, c.z, { count: 6, color: '#ffd080' }); }
      }
      if (st.phase >= 2) {
        st.ph2 = Math.min(1, st.ph2 + dt * 1.5);
        if (ropeMesh) { ropeMesh.visible = true; ropeMesh.scale.y = st.ph2; ropeMesh.position.y = (1 - st.ph2) * 3; }
        orbMesh.visible = true; orbMesh.scale.setScalar(st.ph2); orbMesh.position.y = Math.sin(st.t * 0.8) * 0.3; orbMesh.rotation.y = st.t * 0.08;
        for (const li of lights2) if (api.B.lights[li]) api.B.lights[li].int = 1.15 * st.ph2;
      }
      if (st.phase >= 3) {
        st.ph3 = Math.min(1, st.ph3 + dt * 1.2);
        setFlames(st.ph3); for (const li of flameLi) { const L0 = LT[li]; if (L0) L0.int = 1.3 * st.ph3; }
      }
      // final: Koca Huysuz Pasta neşelendi → şeker ışığı havai fişekleri
      if (frac <= 0 && !st.fin && ((b && b.dead) || nowDone)) { st.fin = true; st.finT = 0; setTimeout(() => O.say('odp_kutlama', { gap: 0 }), 4200); }
      if (st.fin) {
        st.finT += dt;
        if ((st.fwT -= dt) <= 0 && st.finT < 14) {
          st.fwT = 1.8 + Math.random() * 0.8;
          const fx0 = P ? P.pos.x : A.x, fz0 = P ? P.pos.z : A.z, x = fx0 + (Math.random() - 0.5) * 12, z = fz0 - 1 - Math.random() * 7, y = 3.6 + Math.random() * 2.2;
          firework(api, x, y, z, CANDY[(Math.random() * CANDY.length) | 0]);
        }
      }
    });
    api.glow(A.x, A.z, A.r + 1, 0xffc890, 0.06);
  }
  function strawberryBig(B, x, y, z, s) {
    B.add('candy', G.sphere(12, 9), C(0xff3b5c), [x, y, z], [PI, 0, 0], [s * 0.85, s, s * 0.85]);
    B.add('candy', G.cone(14), C(0xff3b5c), [x, y - s * 0.6, z], [PI, 0, 0], [s * 0.7, s * 0.8, s * 0.7]);
    for (let k = 0; k < 5; k++) { const a = k * TAU / 5; B.add('gloss', G.cone(5), C(0x48b04a), [x + Math.sin(a) * s * 0.35, y + s * 0.8, z + Math.cos(a) * s * 0.35], [Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2], [s * 0.18, s * 0.5, s * 0.08]); }
  }
  // şeker ışığı havai fişeği: parlak top yükselir, yıldız + konfeti saçar, renkli ışık parlar
  const FW = [];
  function firework(api, x, y, z, col) {
    for (let i = FW.length - 1; i >= 0; i--) if (FW[i].api !== api) FW.splice(i, 1);   // (önceki bölüm kurulumundan kalanlar)
    let m = FW.find(f => !f.on && f.api === api);
    if (!m) {
      const k = new Kit(); k.add(G.sphere(8, 6), C(0xffffff, 2.5), [0, 0, 0], null, [0.18, 0.18, 0.18]);
      const mesh = O.solo(k, 'glow', api); mesh.castShadow = false;
      m = { mesh, on: false, api }; FW.push(m);
      api.anim(dt => {
        if (!m.on) return;
        m.t += dt; const u = Math.min(1, m.t / 0.7);
        m.mesh.position.set(m.x, lerp(0.5, m.y, 1 - (1 - u) * (1 - u)), m.z);
        if (u >= 1) {
          m.on = false; m.mesh.visible = false;
          O.burst('star', m.x, m.y, m.z, { count: 18 }); O.burst('confetti', m.x, m.y, m.z, {}); O.burst('sparkle', m.x, m.y, m.z, { count: 16, color: '#' + C(m.col).getHexString() });
          O.fx('lightFlash', m.x, m.z, '#' + C(m.col).getHexString(), 7, 0.5);
          O.sfx('bubblePop', { x: m.x, z: m.z, vol: 0.6, pitch: 0.7 + Math.random() * 0.5 });
        }
      });
    }
    m.on = true; m.t = 0; m.x = x; m.y = y; m.z = z; m.col = col; m.mesh.visible = true;
    O.sfx('whoosh', { x, z, vol: 0.25, pitch: 1.6 });
  }

  ODAB.models = Object.assign(ODAB.models || {}, { creamSwirl, cupcake: (B, x, z, s, r) => cupcake(B, null, x, z, s, r), macaron, sprinkleDrop, strawberryTree: (B, x, z, s, r) => strawberryTree(B, null, x, z, s, r), candyFlowerPatch, rockCandy, candyMountain, meringue, gumdrops });
  BOLUM.define('pasta', {
    ad: 'Pasta Krallığı',
    taban: 'dairy',   // Kefir Vadisi zemini: akan sıvı (burada pembe-beyaz krema), bisküvi kırıntısı yol, krema tepeler
    size: 96, side: 2,
    areas: [{ id: 'a1', ad: 'Krema Nehri', rooms: 2 }, { id: 'a2', ad: 'Çilek Ormanı', rooms: 2 }, { id: 'a3', ad: 'Şeker Dağı', rooms: 2 }],
    muzik: 'kale',
    final: true, malzeme: 'krema', kayipEsya: null,
    isik: { fog: [0xffd6e6, 42, 104], hemiSky: 0xfff4fa, hemiGround: 0xe0a0bc, hemi: 0.58, sunColor: 0xfff0dc, sun: 1.95, sunOffset: [-12, 26, 14],
      env: [0xffe0f0, 0xfff0e4, 0xd8a8c0, 0.6], bloom: 0.18, exposure: 0.95, sat: 1.04, vig: 0.22, fezaLight: 0, moss: [0xffe0ec, 0], rim: [0xfff0f6, 0.12] },
    zemin: { tA: 0xffdde9, tB: 0xffe4c0, tC: 0xffffff, out: 0xf0a8c0, outAmt: 0.5, macro: 0xfff0f6 },
    minimap: { zemin: '#f6c8d8' },
    harita: { ad: 'Pasta Krallığı', detay: 'Krema nehirleri, çilek ormanı, şeker dağı', renk: '#f4a8c4', x: 22, y: 70, simge: '🎂' },
    yerlesim, kur,
  });
})();
