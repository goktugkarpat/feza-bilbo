/* ── Bölüm 3: Buzdolabı ──
   Soğuk ama sıcak hisli, sevimli bir buzdolabı içi: mavi-beyaz ışık, buğu, kar tanesi parıltıları.
     1. Raf Buzulları   cam raflar arası, buzda kayma pisti, süt şişesi sütunları, yoğurt kapları
     2. Jöle Tepeleri   zıplatan jöle tepecikleri (trambolin), meyve kâseleri, dondurma kaydırağı
     3. Dondurucu Kapısı parlayan buz sarkıtları, kar topu yuvarlama (buz duvarını kırar, içinden hazine), Aytuğ Hala'nın tokası
     Arena: buz pateni alanı (Dondurma Kralı). Malzeme: çilek.
   Genel ad: ODAB (bu dosya + src/06z_pasta.js'in ortak araçları: malzemeler, birleştirilmiş çizim, zıplama/kayma/kaydırak
   hareketi, altın şeker, şeker yağmuru). Sesler: src/02l_odalarB.js. Biçim: src/SPEC.md › "Dev Ev API" › Bölüm kaydı. */
const ODAB = (() => {
  'use strict';
  const PI = Math.PI;
  const hyp = Math.hypot;
  // ── Malzemeler (bölümler arası paylaşılır, disposeTree silmez) ──
  const M = {};
  const kp = m => { m.userData.keep = true; return m; };
  function mat(k) {
    if (M[k]) return M[k];
    let m;
    switch (k) {
      case 'ice': m = rimify(vcMat({ roughness: 0.04, metalness: 0.08, transparent: true, opacity: 0.72, emissive: new THREE.Color(0x2e6ea8), emissiveIntensity: 0.22 }), 0xeefcff, 1.0, 1.9); break;
      case 'glass': m = rimify(vcMat({ roughness: 0.03, metalness: 0.15, transparent: true, opacity: 0.3, depthWrite: false }), 0xffffff, 0.9, 2.2); break;
      case 'jelly': m = rimify(vcMat({ roughness: 0.08, transparent: true, opacity: 0.8, emissive: new THREE.Color(0x301018), emissiveIntensity: 0.6 }), 0xffffff, 0.7, 2.0); break;
      case 'cream': m = rimify(vcMat({ roughness: 0.36 }), 0xfff6f0, 0.32, 2.6); break;
      case 'candy': m = rimify(vcMat({ roughness: 0.1, metalness: 0.02 }), 0xffffff, 0.5, 2.3); break;
      case 'gloss': m = rimify(vcMat({ roughness: 0.22 }), 0xffffff, 0.22, 3); break;
      case 'matte': m = vcMat({ roughness: 0.82 }); break;
      case 'snow': m = rimify(vcMat({ roughness: 0.55 }), 0xeaf8ff, 0.55, 2.0); break;
      case 'gold': m = rimify(vcMat({ roughness: 0.18, metalness: 0.65 }), 0xfff0b0, 0.6, 2.2); break;
      case 'glow': m = new THREE.MeshBasicMaterial({ vertexColors: true }); break;
      case 'halo': m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }); break;
      default: m = vcMat({ roughness: 0.5 });
    }
    return (M[k] = kp(m));
  }
  const OPAQUE = { cream: 1, candy: 1, gloss: 1, matte: 1, snow: 1, gold: 1 }, CAST = { cream: 1 };   // (gölge yalnız krema parçalı büyük süslerden: kek, külah, süt şişesi; küçük/parlak süsler gölgesiz)
  const C = (hex, k = 1) => (k === 1 ? new THREE.Color(hex) : new THREE.Color(hex).multiplyScalar(k));

  // ── Birleştirilmiş çizim: malzeme + 24 m'lik parça başına tek mesh (Kit: renkli ilkel parçalar) ──
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
          mesh.name = 'odab-' + mk; api.add(mesh);
        }
      },
    };
    return B;
  }
  // tek parça (hareketli) mesh: Kit → Mesh
  function solo(kit, mk, api, cast) { const m = new THREE.Mesh(kit.build(), mat(mk)); m.castShadow = !!cast && !!OPAQUE[mk]; m.receiveShadow = true; if (api) api.add(m); return m; }

  // ── Oyun bağlantıları ──
  const A = () => (typeof GAME !== 'undefined' && GAME.halaApi) || null;
  const live = () => typeof GAME !== 'undefined' && GAME.state === 'play' && !GAME.paused && GAME.P && !GAME.P.dead && !(typeof MINIGAME !== 'undefined' && MINIGAME && MINIGAME.active);
  function sfx(n, o) { const a = A(); if (a) try { a.sfx(n, o); } catch (e) { /* ses yok */ } }
  function burst(k, x, y, z, o) { const a = A(); if (a) try { a.burst(k, x, y, z, o); } catch (e) { /* efekt yok */ } }
  function fx(n, a1, a2, a3, a4, a5) { const a = A(); if (a) try { a.fx(n, a1, a2, a3, a4, a5); } catch (e) { /* efekt yok */ } }
  let sayAt = -99;
  const said = new Set();
  // Aytuğ Hala'nın bölüm cümlesi: once=true → oyun başına bir kez; arada en az 7 s
  function say(key, o = {}) {
    if (typeof GAME === 'undefined' || !GAME.halaApi) return false;
    const now = GAME.time || 0;
    if (o.once !== false && said.has(key)) return false;
    if (now - sayAt < (o.gap ?? 7)) return false;
    if (!(typeof AUD !== 'undefined' && AUD.LINES && AUD.LINES[key])) return false;
    sayAt = now; said.add(key);
    try { GAME.halaApi.say(key, o.prio || 2); } catch (e) { return false; }
    return true;
  }
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  // şeker (para) fışkırtır: GAME.coins'e 07'deki biçimde eklenir
  function coins(x, z, n = 6, spread = 1, y = 0.8) {
    if (typeof GAME === 'undefined' || !GAME.coins) return;
    for (let i = 0; i < n; i++) {
      if (GAME.coins.length > 70) break;
      const a = Math.random() * TAU, s = (1.2 + Math.random() * 1.8) * spread;
      GAME.coins.push({ x, y, z, vx: Math.sin(a) * s, vy: 4.5 + Math.random() * 2.5, vz: Math.cos(a) * s, value: 1 + (Math.random() < 0.3 ? 1 : 0), t: 0, rot: Math.random() * TAU, mag: false, mt: 0, ph: Math.random() * TAU });
    }
    sfx('drop', { x, z, vol: 0.5, pitch: 1.3 });
  }
  // yerde duran şeker dizisi (Feza yaklaşınca belirir)
  function restCoins(pts) {
    if (typeof GAME === 'undefined' || !GAME.coins) return;
    for (const p of pts) if (GAME.coins.length < 70) GAME.coins.push({ x: p[0], y: 0.21, z: p[1], vx: 0, vy: 0, vz: 0, value: 1, t: 1, rot: Math.random() * TAU, mag: false, mt: 0, ph: Math.random() * TAU });
  }

  // ── Altın şeker modeli (paylaşılan geometri) ──
  let goldGeo = null, haloGeo = null;
  function goldCandy() {
    if (!goldGeo) {
      const k = new Kit(), g = C(0xffc93a), g2 = C(0xffe58a);
      k.add(G.sphere(14, 10), g, [0, 0, 0], null, [0.3, 0.24, 0.24]);
      for (const sd of [-1, 1]) {
        k.add(G.cone(10), g2, [sd * 0.38, 0, 0], [0, 0, sd * PI / 2], [0.17, 0.22, 0.17]);
        k.add(G.sphere(7, 5), g2, [sd * 0.5, 0, 0], null, [0.05, 0.16, 0.16]);
      }
      for (let i = 0; i < 3; i++) k.add(G.torus(TAU, 0.18, 14), C(0xfff2c0), [(-1 + i) * 0.12, 0, 0], [0, PI / 2, 0], [0.235, 0.235, 0.235]);
      goldGeo = k.build(); goldGeo.userData.keep = true;
      const h = new Kit();
      h.add(G.sphere(10, 7), C(0xffd66a, 0.55), [0, 0, 0], null, [0.62, 0.62, 0.62]);
      haloGeo = h.build(); haloGeo.userData.keep = true;
    }
    const g = new THREE.Group();
    const m = new THREE.Mesh(goldGeo, mat('gold')); g.add(m);
    const h = new THREE.Mesh(haloGeo, mat('halo')); h.renderOrder = 3; g.add(h);
    g.userData.spin = m;
    return g;
  }

  // ── Hareket düzeni (her bölüm kurulumunda bir tane): zıplatan tepecikler, buzda kayma, kaydırak/sal yolculuğu, toplanan şeyler ──
  function rig(api, L) {
    const R = { fly: null, ice: [], pads: [], picks: [], zones: [], v: [0, 0], prev: null, lift: 0, cd: 0, trailT: 0, sndT: 0, t: 0, iceOn: false, iceT: 0 };
    ACTIVE = R; R.L = L;
    // yay şeklinde zıplatma: (x1,z1)'e, tepe yüksekliği h, süre dur
    R.arc = (x1, z1, h = 2.6, dur = 0.85, o = {}) => {
      const P = GAME.P;
      R.fly = { kind: 'arc', t: 0, dur, x0: P.pos.x, z0: P.pos.z, x1, z1, h, y0: R.lift || 0, onEnd: o.onEnd, spin: o.spin };
    };
    // yol boyunca taşıma: pts [{x,y,z}], climb: önce dikey çıkış (s), speed: [başlangıç, son] m/s
    R.ride = (pts, o = {}) => {
      const P = GAME.P, cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hyp(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z));
      R.fly = { kind: 'ride', pts, cum, len: cum[cum.length - 1], s: 0, climb: o.climb || 0, ct: 0, x0: P.pos.x, z0: P.pos.z, speed: o.speed || [5, 9], onEnd: o.onEnd, onStep: o.onStep, sit: o.sit || 0 };
    };
    R.busy = () => !!R.fly;
    function landSpot(x0, z0, dx, dz, dMax, dMin) {
      const a0 = Math.atan2(dx, dz);
      for (const da of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1]) {
        const a = a0 + da, sx = Math.sin(a), sz = Math.cos(a);
        for (let d = dMax; d >= dMin; d -= 0.4) {
          const x = x0 + sx * d, z = z0 + sz * d;
          if (api.isFloor(x, z) && api.circleFree(x, z, 0.5) && !R.pads.some(p => !p.chain && hyp(p.x - x, p.z - z) < p.r + 0.3)) return { x, z };
        }
      }
      return null;
    }
    function setHero(x, y, z, face) {
      const P = GAME.P, H = GAME.H;
      P.pos.x = x; P.pos.z = z;
      if (face !== undefined) P.face = face;
      if (H && H.root) { H.root.position.set(x, y, z); H.root.rotation.y = P.face; }
      R.lift = y;
    }
    function stopFly(land) {
      const f = R.fly; R.fly = null; R.lift = 0;
      if (f && land) { const P = GAME.P; const x = f.kind === 'arc' ? f.x1 : f.pts[f.pts.length - 1].x, z = f.kind === 'arc' ? f.z1 : f.pts[f.pts.length - 1].z; P.pos.x = x; P.pos.z = z; }
      R.prev = null;
    }
    R.stop = stopFly;
    api.anim(dt => {
      R.t += dt;
      for (const p of R.pads) if (p.anim) p.anim(dt);
      for (const q of R.picks) if (q.obj && !q.got) { q.obj.position.y = q.y + Math.sin(R.t * 2.2 + q.ph) * 0.12; if (q.obj.userData.spin) q.obj.userData.spin.rotation.y += dt * 2.4; }
      if (!live()) { if (R.fly) stopFly(true); R.v[0] = R.v[1] = 0; return; }
      const P = GAME.P, H = GAME.H;
      R.cd = Math.max(0, R.cd - dt);
      // toplanan şeyler (altın şeker…): yerdekiler yürüyerek, havadakiler zıplarken / kayarken
      for (const q of R.picks) {
        if (q.got) continue;
        if (hyp(q.x - P.pos.x, q.z - P.pos.z) < (q.r || 1.1) && Math.abs((R.lift || 0) + 0.7 - q.y) < (q.dy || 1.4)) {
          q.got = true; if (q.obj) q.obj.visible = false;
          if (q.onGet) q.onGet(q);
        }
      }
      const f = R.fly;
      if (f && f.kind === 'arc') {
        f.t += dt; const u = Math.min(1, f.t / f.dur), x = lerp(f.x0, f.x1, u), z = lerp(f.z0, f.z1, u);
        const y = lerp(f.y0, 0, u) + 4 * f.h * u * (1 - u);
        setHero(x, y, z, Math.atan2(f.x1 - f.x0, f.z1 - f.z0) + (f.spin ? u * TAU : 0));
        if ((R.trailT -= dt) <= 0) { R.trailT = 0.07; burst('sparkle', x, y + 0.6, z, { count: 3 }); }
        if (u >= 1) {
          stopFly(false); setHero(x, 0, z); R.cd = 0.08;
          burst('dust', x, 0.1, z, { count: 6 }); sfx('splat', { x, z, vol: 0.35, pitch: 1.4 });
          if (f.onEnd) f.onEnd();
        }
      } else if (f && f.kind === 'ride') {
        let x, y, z, face = P.face;
        if (f.ct < f.climb) {   // merdivenden yukarı (ya da sala biniş)
          f.ct += dt; const u = smooth01(f.ct / f.climb), p0 = f.pts[0];
          x = lerp(f.x0, p0.x, u); z = lerp(f.z0, p0.z, u); y = lerp(0, p0.y, u);
        } else {
          const sp = lerp(f.speed[0], f.speed[1], Math.min(1, f.s / Math.max(1, f.len)));
          f.s = Math.min(f.len, f.s + sp * dt);
          let i = 1; while (i < f.cum.length - 1 && f.cum[i] < f.s) i++;
          const a = f.pts[i - 1], b = f.pts[i], u = (f.s - f.cum[i - 1]) / Math.max(1e-4, f.cum[i] - f.cum[i - 1]);
          x = lerp(a.x, b.x, u); y = lerp(a.y, b.y, u); z = lerp(a.z, b.z, u); face = Math.atan2(b.x - a.x, b.z - a.z);
          if (f.onStep) f.onStep(x, y, z, f.s / f.len, dt);
          if ((R.trailT -= dt) <= 0) { R.trailT = 0.06; burst('sparkle', x, y + 0.5, z, { count: 3 }); }
        }
        setHero(x, y + f.sit, z, face);
        if (f.ct >= f.climb && f.s >= f.len) {
          const e = f.pts[f.pts.length - 1];
          stopFly(false); setHero(e.x, 0, e.z); R.cd = 0.5;
          if (f.onEnd) f.onEnd();
        }
        R.prev = null;
        return;
      }
      if (R.fly) { R.prev = null; return; }
      const px = P.pos.x, pz = P.pos.z;
      // zıplatan tepecikler
      if (R.cd <= 0) for (const p of R.pads) {
        if (hyp(p.x - px, p.z - pz) > p.r) continue;
        let tx, tz;
        if (p.to) { tx = p.to.x; tz = p.to.z; }
        else {
          let dx = R.v[0], dz = R.v[1];
          if (hyp(dx, dz) < 0.5 && R.prev) { dx = px - R.prev[0]; dz = pz - R.prev[1]; }
          if (hyp(dx, dz) < 1e-3) { dx = px - p.x; dz = pz - p.z; }
          if (hyp(dx, dz) < 1e-3) { dx = Math.sin(P.face); dz = Math.cos(P.face); }
          const l = hyp(dx, dz); dx /= l; dz /= l;
          const s = landSpot(p.x, p.z, dx, dz, p.r + 3.6, p.r + 1.1);
          if (!s) continue;
          tx = s.x; tz = s.z;
        }
        p.hit = 1; R.v[0] = R.v[1] = 0;
        sfx('bounce', { x: p.x, z: p.z, vol: 0.8, pitch: 0.9 + Math.random() * 0.25 });
        burst('jelly', p.x, 0.6, p.z, { color: p.col || '#ff7ab0', count: 8 });
        R.arc(tx, tz, p.h || 2.6, p.dur || 0.85, { spin: Math.random() < 0.25 });
        if (p.onBounce) p.onBounce(p);
        return;
      }
      // buz: kayma (kontrollü: yürüyüşü %25 hızlandırır, durunca birkaç metre süzülür)
      let ice = null;
      for (const e of R.ice) { const dx = (px - e.x) / e.rx, dz = (pz - e.z) / e.rz; if (dx * dx + dz * dz < 1) { ice = e; break; } }
      if (ice && R.prev) {
        const ux = (px - R.prev[0]) / dt, uz = (pz - R.prev[1]) / dt, sp = hyp(ux, uz);
        if (sp < 14) {
          const k = sp > 0.6 ? ice.acc || 2.8 : ice.fric || 1.8, bo = ice.boost || 1.25;
          R.v[0] = damp(R.v[0], ux * bo, k, dt); R.v[1] = damp(R.v[1], uz * bo, k, dt);
          const ex = (R.v[0] - ux) * dt, ez = (R.v[1] - uz) * dt;
          if (Math.abs(ex) + Math.abs(ez) > 1e-4) {
            const bx = P.pos.x, bz = P.pos.z;
            const ha = A(); if (ha && ha.moveXZ) ha.moveXZ(P.pos, ex, ez, 0.42);
            const got = hyp(P.pos.x - bx, P.pos.z - bz), want = hyp(ex, ez);
            if (got < want * 0.5) { R.v[0] *= 0.3; R.v[1] *= 0.3; }
            if (H && H.root) { H.root.position.x = P.pos.x; H.root.position.z = P.pos.z; }
          }
          const vs = hyp(R.v[0], R.v[1]);
          if (vs > 2.2 && (R.trailT -= dt) <= 0) { R.trailT = 0.09; burst('sparkle', P.pos.x, 0.15, P.pos.z, { count: 2, color: ice.spark || '#bfeaff' }); }
          if (vs > 3 && (R.sndT -= dt) <= 0) { R.sndT = 1.1; sfx('ice', { vol: 0.25, pitch: 1.5 + Math.random() * 0.3 }); }
          if (!R.iceOn) { R.iceOn = true; if (ice.onEnter) ice.onEnter(ice); }
        }
      } else { R.v[0] = damp(R.v[0], 0, 8, dt); R.v[1] = damp(R.v[1], 0, 8, dt); R.iceOn = false; }
      R.prev = [P.pos.x, P.pos.z];
      // yakınlık bölgeleri (ipucu cümleleri, istasyonlar)
      for (const zn of R.zones) {
        const inside = hyp(zn.x - P.pos.x, zn.z - P.pos.z) < zn.r;
        if (inside && !zn.in) { zn.in = true; if (zn.enter) zn.enter(zn); }
        else if (!inside && zn.in && hyp(zn.x - P.pos.x, zn.z - P.pos.z) > zn.r + 0.8) zn.in = false;
        if (zn.in && zn.tick) zn.tick(dt, zn);
      }
    });
    return R;
  }
  let ACTIVE = null;
  // Feza şu an zıplıyor / kaydıraktan iniyor / salda mı? (Aytuğ Hala ve Bilbo beklesin diye: ODAB.riding())
  const riding = () => !!(ACTIVE && ACTIVE.fly && typeof GAME !== 'undefined' && GAME.L === ACTIVE.L);
  // altın şeker: hem ödül hem çıkartma
  function goldSugar(api, R, x, y, z, o = {}) {
    const g = goldCandy(); g.position.set(x, y, z); api.add(g);
    api.light(x, y + 0.3, z, 0xffd36a, 2.2, 4.5, 0.15);
    const q = { x, y, z, obj: g, r: o.r || 1.1, dy: o.dy || 1.4, ph: Math.random() * 6, onGet() {
      if (typeof GAME !== 'undefined' && GAME.addGoldSugar) GAME.addGoldSugar(1);
      burst('star', x, y, z, { count: 14 }); burst('confetti', x, y, z, {}); sfx('star', { vol: 0.9 }); sfx('coin', { pitch: 1.5 });
      fx('floatText', x, y + 0.8, z, 'Altın Şeker!', 'gold');
      say(pick(['odb_altin1', 'odb_altin2', 'odb_altin3']), { once: false, gap: 5 });
      if (o.sticker && GAME.giveSticker) GAME.giveSticker(o.sticker, 'gizli');
      if (typeof HALA !== 'undefined' && HALA.cheer) { try { HALA.cheer(1.4); } catch (e) { /* yok */ } }
      if (o.onGet) o.onGet();
    } };
    R.picks.push(q);
    return q;
  }
  // Kar tanesi / şeker parıltıları: Feza'nın çevresinde süzülen minik ışıklar (tek çizim)
  let flakeTex = null;
  function flakeTexture(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    if (kind === 'flake') {
      x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 3; x.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const a = i * PI / 3; x.beginPath(); x.moveTo(32, 32); x.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26); x.stroke();
        for (const s of [-1, 1]) { x.beginPath(); x.moveTo(32 + Math.cos(a) * 15, 32 + Math.sin(a) * 15); x.lineTo(32 + Math.cos(a) * 15 + Math.cos(a + s * 0.9) * 8, 32 + Math.sin(a) * 15 + Math.sin(a + s * 0.9) * 8); x.stroke(); } }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function sparkles(api, o = {}) {
    const n = o.n || 160, W = o.w || 34, D = o.d || 30, Hh = o.h || 9;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seed = [];
    const cols = (o.colors || [0xdff4ff, 0xffffff, 0xbfe6ff]).map(h => C(h, o.k || 1.6));
    for (let i = 0; i < n; i++) {
      seed.push({ x: Math.random() * W, y: Math.random() * Hh, z: Math.random() * D, s: 0.25 + Math.random() * 0.5, w: Math.random() * TAU });
      const c = cols[i % cols.length]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const key = 'pts-' + (o.kind || 'flake');
    if (!M[key]) M[key] = kp(new THREE.PointsMaterial({ size: o.size || 0.32, map: flakeTexture(o.kind || 'flake'), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
    const pts = new THREE.Points(g, M[key]); pts.frustumCulled = false; pts.renderOrder = 4; api.add(pts);
    let t = 0;
    api.anim((dt, fx0, fz0) => {
      t += dt;
      const ox = fx0 - W / 2, oz = fz0 - D * 0.62, fall = o.fall ?? 0.35;
      for (let i = 0; i < n; i++) {
        const s = seed[i];
        s.y -= dt * fall * s.s; if (s.y < 0) s.y += Hh;
        const x = ((s.x - ox + Math.sin(t * 0.6 + s.w) * 0.6) % W + W) % W, z = ((s.z - oz) % D + D) % D;
        pos[i * 3] = ox + x; pos[i * 3 + 1] = (o.y0 || 0.3) + s.y; pos[i * 3 + 2] = oz + z;
      }
      g.attributes.position.needsUpdate = true;
    });
    return pts;
  }
  // Buğu / pus: yürünür alanın kenarlarında yerde süzülen yumuşak bulutçuklar (tek çizim)
  function mist(api, L, o = {}) {
    const spots = edgeSpots(L, api, { dmin: 0.6, dmax: 2.8, space: o.space || 7 }).slice(0, o.n || 16);
    if (!spots.length) return null;
    const n = spots.length, pos = new Float32Array(n * 3);
    spots.forEach((s, i) => { pos[i * 3] = s.x; pos[i * 3 + 1] = 0.5; pos[i * 3 + 2] = s.z; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const key = 'mist-' + (o.color || 0xffffff);
    if (!M[key]) M[key] = kp(new THREE.PointsMaterial({ size: o.size || 7, map: flakeTexture('dot'), color: o.color || 0xffffff, transparent: true, opacity: o.opacity || 0.2, depthWrite: false, sizeAttenuation: true }));
    const pts = new THREE.Points(g, M[key]); pts.renderOrder = 2; pts.frustumCulled = false; api.add(pts);
    let t = 0;
    api.anim(dt => {
      t += dt;
      for (let i = 0; i < n; i++) { pos[i * 3] = spots[i].x + Math.sin(t * 0.21 + i * 1.7) * 0.8; pos[i * 3 + 2] = spots[i].z + Math.cos(t * 0.17 + i) * 0.4; pos[i * 3 + 1] = 0.45 + Math.sin(t * 0.3 + i) * 0.12; }
      g.attributes.position.needsUpdate = true;
    });
    return pts;
  }
  // Zemine yapışık süs desenleri (tek mesh, tek doku): 'kar' (kırağı kar tanesi) | 'kalp' (krema sıkma kalp + serpinti) | 'girdap'
  const DECAL_TEX = {};
  function decalTexture(kind) {
    if (DECAL_TEX[kind]) return DECAL_TEX[kind];
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.translate(128, 128);
    const dot = (px, py, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.arc(px - r * 0.3, py - r * 0.35, r * 0.35, 0, TAU); x.fill(); };
    if (kind === 'kar') {
      x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        x.save(); x.rotate(i * PI / 3); x.lineWidth = 9; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -108); x.stroke();
        x.lineWidth = 6; for (const [d, l] of [[40, 30], [70, 24], [95, 14]]) for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(0, -d); x.lineTo(sd * l * 0.8, -d - l * 0.6); x.stroke(); }
        x.restore();
      }
      x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(0, 0, 14, 0, TAU); x.fill();
    } else if (kind === 'kalp') {
      const pts = [];
      for (let t = 0; t < TAU; t += TAU / 34) { const hx = 16 * Math.pow(Math.sin(t), 3), hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); pts.push([hx * 6, hy * 6 + 6]); }
      for (const [px, py] of pts) dot(px, py, 11, '#ffffff');
      for (const [px, py] of pts) dot(px * 0.62, py * 0.62 + 2, 8, '#ff9ec4');
      const sc = ['#ff5f9e', '#ffb13b', '#6fd6ff', '#9a7bff', '#6fe0a0', '#ffe45a'];
      for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, r = Math.random() * 50; x.save(); x.translate(Math.cos(a) * r, Math.sin(a) * r + 4); x.rotate(Math.random() * TAU); x.fillStyle = sc[i % sc.length]; x.fillRect(-7, -2.5, 14, 5); x.restore(); }
    } else {
      for (let i = 0; i < 60; i++) { const a = i * 0.32, r = 14 + i * 1.6; dot(Math.cos(a) * r, Math.sin(a) * r, 9 - i * 0.06, i % 2 ? '#ffffff' : '#ffd0e4'); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.keep = true;
    return (DECAL_TEX[kind] = t);
  }
  function decals(api, L, kind, n, size, o = {}) {
    const spots = floorSpots(L, api, n, { pmin: o.pmin ?? 1.2, avoid: o.avoid });
    if (!spots.length) return null;
    const pos = [], uv = [], nor = [], idx = [];
    spots.forEach((p, i) => {
      const a = api.rnd() * TAU, s = size * (0.8 + api.rnd() * 0.4) / 2, cs = Math.cos(a) * s, sn = Math.sin(a) * s, b = i * 4;
      for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(p.x + u * cs - v * sn, 0.03, p.z + u * sn + v * cs); uv.push((u + 1) / 2, (v + 1) / 2); nor.push(0, 1, 0); }
      idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    const key = 'decal-' + kind;
    if (!M[key]) M[key] = kp(new THREE.MeshStandardMaterial({ map: decalTexture(kind), transparent: true, depthWrite: false, roughness: 0.4, opacity: o.opacity || 0.9, polygonOffset: true, polygonOffsetFactor: -3, side: THREE.DoubleSide }));
    const m = new THREE.Mesh(g, M[key]); m.receiveShadow = true; m.renderOrder = 1; m.name = 'odab-desen-' + kind; api.add(m);
    return m;
  }
  // Peri ışıkları: kuzey kıyıdaki direkler arasında sarkan ipler, üstünde renkli parlayan ampuller (ışıl ışıl)
  function fairyLights(B, api, L, o = {}) {
    const spots = edgeSpots(L, api, { dmin: 1.6, dmax: 3.0, space: o.space || 4.2, avoid: o.avoid }).filter(c => c.side === 'north' && (!o.rooms || o.rooms.has(c.room)));
    const used = new Set(), cols = (o.colors || [0xffe8a0]).map(h => C(h, o.k || 2.2)), H0 = o.h || 3.0;
    spots.sort((a, b) => a.x - b.x);
    let n = 0;
    for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) {
      const a = spots[i], b = spots[j], d = hyp(a.x - b.x, a.z - b.z);
      if (d < 3 || d > 7 || used.has(j + ':in')) continue;
      used.add(j + ':in');
      for (const p of [a, b]) if (!used.has(p)) { used.add(p); if (o.post) o.post(B, p.x, p.z, H0); }
      const N = Math.max(6, Math.round(d * 2.2));
      let px = a.x, py = H0, pz = a.z;
      for (let s = 1; s <= N; s++) {
        const u = s / N, x = lerp(a.x, b.x, u), z = lerp(a.z, b.z, u), y = H0 - Math.sin(u * PI) * d * 0.12;
        B.seg('matte', [px, py, pz], [x, y, z], 0.018, C(o.wire || 0x5a4a52), 0.018, 4);
        if (s < N) { B.add('glow', G.sphere(7, 5), cols[(s + n) % cols.length], [x, y - 0.12, z], null, [0.09, 0.12, 0.09]); }
        px = x; py = y; pz = z;
      }
      if (n % 2 === 0) api.light((a.x + b.x) / 2, H0 - 0.5, (a.z + b.z) / 2, o.light || 0xffe0b0, 1.1, 6, 0.06);
      n++; break;
    }
    return n;
  }
  // ── Yerleşim yardımcıları ──
  // oda kenarı: merkezden (dx,dz) yönünde zeminin bittiği yer
  function edge(api, rm, dx, dz, max = 20) {
    const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    let d = 0; while (d < max && api.isFloor(rm.x + dx * d, rm.z + dz * d)) d += 0.25;
    return { x: rm.x + dx * d, z: rm.z + dz * d, d, dx, dz };
  }
  // yol (L.path) uzaklığı
  function pathD(L, x, z) {
    let d = 1e9; const p = L.path || [];
    for (let s = 1; s < p.length; s++) {
      const ax = p[s - 1].x, az = p[s - 1].z, bx = p[s].x, bz = p[s].z, vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1;
      const t = clamp(((x - ax) * vx + (z - az) * vz) / l2, 0, 1); d = Math.min(d, hyp(x - ax - vx * t, z - az - vz * t));
    }
    return d;
  }
  // önemli şeylerden uzak mı (sandık, ara kayıt, başlangıç, boss, kapı)
  function clearOf(L, x, z, r) {
    const near = (p, rr) => p && hyp(p.x - x, p.z - z) < rr + r;
    if (near(L.start, 2.5) || near(L.exit, 3) || near(L.boss, 3) || near(L.crystalSpot, 3)) return false;
    for (const c of L.checkpoints || []) if (near(c, 1.8)) return false;
    for (const c of L.chests || []) if (near(c, 1.5)) return false;
    return true;
  }
  // odanın içinde, yoldan off uzaklıkta, çevresi boş bir yer
  function roomSpot(L, api, rm, o = {}) {
    const r = o.r || 1.2, rr = (rm.r || 6) * (o.k || 0.75), taken = o.taken || [];
    for (let t = 0; t < (o.tries || 140); t++) {
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
  // odanın çevresinde, yürünür alanın dışında, ayak izi rad olan süs yerleri. fn(x, z, güney mi, açı)
  function ring(api, rm, n, rad, fn, o = {}) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = (k + (o.off ?? api.rnd() * 0.4)) * TAU / n, R0 = (rm.r || 6) + rad + (o.gap ?? 1.2) + api.rnd() * (o.jit ?? 1.5);
      const x = rm.x + Math.sin(a) * R0, z = rm.z + Math.cos(a) * R0;
      if (api.isFloor(x, z) || api.linkDist(x, z) < rad + (o.link ?? 2.6)) continue;
      let ok = true;
      for (let q = 0; q < 8 && ok; q++) { const b = q * PI / 4; if (api.isFloor(x + Math.sin(b) * rad, z + Math.cos(b) * rad)) ok = false; }
      if (!ok) continue;
      const south = z > rm.z + (rm.r || 6) * 0.35;
      if (o.northOnly && south) continue;
      out.push({ x, z, south, a });
      fn(x, z, south, a);
    }
    return out;
  }
  // Yürünür alanın hemen kıyısındaki süs yerleri (ekranda görünür kalırlar). Her biri: {x, z, nx, nz (zemine doğru), d, side:
  // 'south' (kamera tarafı: alçak olmalı) | 'north' | 'side', room (en yakın oda no)}
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
    const cs = o.space || 2.8, cell = new Map(), out = [], key = (x, z) => Math.floor(x / cs) + ',' + Math.floor(z / cs);
    for (const c of cand) {
      const ci = Math.floor(c.x / cs), cj = Math.floor(c.z / cs);
      let ok = true;
      for (let b = -1; b <= 1 && ok; b++) for (let a = -1; a <= 1 && ok; a++) { const q = cell.get((ci + a) + ',' + (cj + b)); if (q && q.some(p => hyp(p.x - c.x, p.z - c.z) < cs)) ok = false; }
      if (!ok) continue;
      const k = key(c.x, c.z); (cell.get(k) || cell.set(k, []).get(k)).push(c);
      c.side = c.nz < -0.55 ? 'south' : c.nz > 0.45 ? 'north' : 'side';
      let br = 0, bd = 1e9; L.rooms.forEach((rm, ri) => { const d = hyp(rm.x - c.x, rm.z - c.z) - (rm.r || 6); if (d < bd) { bd = d; br = ri; } });
      c.room = br; out.push(c);
    }
    return out;
  }
  // Zemine serpiştirilmiş küçük süsler (katı değil; yoldan biraz uzak)
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
  // düşman gruplarını özel yerlerden uzaklaştır (nazik gruplar)
  function clearSpawns(L, api, spots) {
    for (const s of L.spawns || []) {
      if (s.type && /boss/.test(s.pack || '')) continue;
      const bad = spots.find(q => hyp(q.x - s.x, q.z - s.z) < q.r);
      if (!bad) continue;
      for (let t = 0; t < 20; t++) {
        const p = api.randomFloorNear(s.x, s.z, 2, 7);
        if (p && !spots.some(q => hyp(q.x - p.x, q.z - p.z) < q.r) && api.circleFree(p.x, p.z, 0.6)) { s.x = p.x; s.z = p.z; break; }
      }
    }
  }
  // Bölüm içi mini oyun köşesi (yerleşimde): kayıtlı mini oyunlardan bölüme uyanı (yoksa ilki) → L.stations'a { kind: 'mini' }
  function miniCorner(L, api, rm, prefer, taken) {
    if (!rm || typeof MINIGAME === 'undefined' || !MINIGAME || !MINIGAME.list) return null;
    const ids = MINIGAME.list(); if (!ids.length) return null;
    const id = prefer.find(p => ids.includes(p)) || ids.find(i => prefer.some(p => i.toLowerCase().includes(p.toLowerCase()))) || ids[0];
    const p = roomSpot(L, api, rm, { r: 1.0, pmin: 2.4, pmax: 7, k: 0.8, taken });
    if (!p) return null;
    const st = { id: 'mini_' + id, kind: 'mini', mini: id, x: p.x, z: p.z, r: 1.0 };
    (L.stations || (L.stations = [])).push(st);
    taken.push({ x: p.x, z: p.z, r: 2 });
    return st;
  }
  // mini oyun köşesinin görünüşü: parlayan halka + yıldızlı tabela; yaklaşınca Hala söyler
  function miniCornerLook(B, api, R, st, o = {}) {
    const ring = new Kit(); ring.add(G.torus(TAU, 0.1, 36), C(o.ring || 0x9ae8ff, 1.8), [0, 0.05, 0], [PI / 2, 0, 0], [1.0, 1.0, 1.0]);
    const rm = solo(ring, 'glow', api); rm.position.set(st.x, 0, st.z);
    const sk = new Kit();   // tabela: direk + yıldız
    sk.add(G.cyl(1, 1, 8), C(0xffffff), [0, 1.0, 0], null, [0.06, 2.0, 0.06]);
    sk.add(G.cyl(1, 1, 5), C(o.star || 0xffd24a), [0, 2.25, 0], [PI / 2, 0, 0], [0.26, 0.14, 0.26]);
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; sk.add(G.cone(4), C(o.star || 0xffd24a), [Math.sin(a) * 0.32, 2.25 + Math.cos(a) * 0.32, 0], [0, 0, -a], [0.17, 0.36, 0.1]); }
    const star = solo(sk, 'candy', api); star.position.set(st.x - 1.15, 0, st.z - 0.4);
    if (o.prop) o.prop(B, st.x + 1.1, st.z - 0.5);
    api.light(st.x, 1.6, st.z, o.ring || 0x9ae8ff, 1.4, 5, 0.1);
    api.glow(st.x, st.z, 1.8, o.ring || 0x9ae8ff, 0.25);
    let t = 0;
    api.anim(dt => { t += dt; const s = 1 + Math.sin(t * 3) * 0.07; rm.scale.set(s, 1, s); star.rotation.y = Math.sin(t * 1.4) * 0.5; });
    R.zones.push({ x: st.x, z: st.z, r: 5.5, enter: () => say(o.line || 'odb_mini') });
  }
  // Bilbo'ya binme istasyonu (07 GAME.rideBilbo; UI 'binis' istasyonunda başlatır)
  function binisStation(L, api, rm, id, taken) {
    if (!rm) return null;
    const p = roomSpot(L, api, rm, { r: 1.0, pmin: 2.0, pmax: 7, k: 0.8, taken });
    if (!p) return null;
    const st = { id, kind: 'binis', x: p.x, z: p.z, r: 1.6, sure: 16 };
    (L.stations || (L.stations = [])).push(st); taken.push({ x: p.x, z: p.z, r: 2.2 });
    return st;
  }
  function binisLook(B, api, st) {   // pati izli parlak halka + kemik tabela
    const k = new Kit(); k.add(G.torus(TAU, 0.1, 36), C(0xffc060, 1.7), [0, 0.05, 0], [PI / 2, 0, 0], [1.25, 1.25, 1.25]);
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4; k.add(G.sphere(8, 5), C(0xffd890, 1.4), [Math.sin(a) * 0.55, 0.04, Math.cos(a) * 0.55], null, [0.14, 0.02, 0.12]); }
    k.add(G.sphere(10, 6), C(0xffd890, 1.4), [0, 0.04, 0], null, [0.3, 0.02, 0.26]);
    const ring = solo(k, 'glow', api); ring.position.set(st.x, 0, st.z);
    B.add('gloss', G.cyl(1, 1, 8), C(0xffffff), [st.x + 1.3, 0.9, st.z - 0.5], null, [0.06, 1.8, 0.06]);
    B.add('cream', G.cyl(1, 1, 10), C(0xfff4e0), [st.x + 1.3, 2.0, st.z - 0.5], [0, 0, PI / 2], [0.12, 0.9, 0.12]);
    for (const sd of [-1, 1]) for (const up of [-1, 1]) B.add('cream', G.sphere(10, 7), C(0xfff4e0), [st.x + 1.3 + sd * 0.45, 2.0 + up * 0.12, st.z - 0.5], null, [0.17, 0.17, 0.17]);
    api.light(st.x, 1.4, st.z, 0xffc070, 1.3, 5, 0.1);
    let t = 0; api.anim(dt => { t += dt; const s = 1 + Math.sin(t * 3) * 0.06; ring.scale.set(s, 1, s); });
  }
  // Nazik gruplar: bir grupta en çok `max` huysuz (fazlası, seçkin olmayanlardan başlayarak çıkar)
  function gentlePacks(L, max = 5) {
    const by = {};
    for (const s of L.spawns || []) { const k = s.pack ?? s.room; (by[k] || (by[k] = [])).push(s); }
    const drop = new Set();
    for (const k in by) { const g = by[k]; if (g.length <= max) continue; g.slice().sort((a, b) => (a.elite ? 1 : 0) - (b.elite ? 1 : 0)).slice(0, g.length - max).forEach(s => drop.add(s)); }
    if (drop.size) L.spawns = L.spawns.filter(s => !drop.has(s));
  }
  // Alan geçidi: kemer (iki direk + yay), koridor yönüne dik
  function gateDir(L, k) {
    const a = L.areas[k], prev = L.areas[k - 1];
    const r0 = L.rooms[prev.rooms[0]] && L.rooms[Math.max(...prev.rooms.filter(i => L.rooms[i].kind !== 'side'))], r1 = L.rooms[a.rooms[0]];
    let dx = r1.x - r0.x, dz = r1.z - r0.z; const l = hyp(dx, dz) || 1; return { dx: dx / l, dz: dz / l };
  }
  function corridorHalf(api, x, z, px, pz) {   // koridorun gate noktasındaki yarı genişliği (dik yönde zemin)
    let a = 0, b = 0;
    while (a < 7 && api.isFloor(x + px * a, z + pz * a)) a += 0.25;
    while (b < 7 && api.isFloor(x - px * b, z - pz * b)) b += 0.25;
    return { a, b };
  }
  return { riding, get lift() { return riding() ? ACTIVE.lift || 0 : 0; }, mat, batch, solo, C, A, live, sfx, burst, fx, say, pick, coins, restCoins, goldCandy, goldSugar, rig, sparkles, edge, pathD, clearOf, roomSpot, ring, edgeSpots, floorSpots, mist, decals, fairyLights, clearSpawns, gentlePacks, miniCorner, miniCornerLook, binisStation, binisLook, gateDir, corridorHalf, flakeTexture };
})();

/* ════════════════════════════ Buzdolabı ════════════════════════════ */
(() => {
  'use strict';
  const PI = Math.PI, hyp = Math.hypot, O = ODAB, C = O.C;
  const CORE = { milkCap: [0x4a8ee8, 0xe85a6a, 0x5cc48a, 0xf2b33a], yog: [0xffb3c8, 0xbfe3ff, 0xfff0a8, 0xc8f0c0, 0xe0c8ff], jelly: [0xff4f7a, 0x6fd86a, 0xffa23a, 0x9a6cff, 0xff6fd0] };

  // ── Yerleşim (saf veri): özel yerler L.odb'ye, Bilbo için L.kayipSpot ──
  function yerlesim(L, api) {
    const R = L.rooms, A = L.areas || [], room = i => R[i];
    const mainOf = a => (a ? a.rooms.filter(i => R[i] && R[i].kind !== 'side') : []);
    const a1 = mainOf(A[0]), a2 = mainOf(A[1]), a3 = mainOf(A[2]);
    const arena = A.find(a => a.boss) ? room(A.find(a => a.boss).rooms[0]) : R[R.length - 1];
    const D = L.odb = { ice: [], pads: [], slide: null, ball: null, gold: [], trails: [], taken: [] };
    const taken = D.taken;
    // 1) Raf Buzulları: buz pisti (alanın ikinci odasında; yoksa ilkinde)
    {
      const rm = room(a1[1] ?? a1[0]);
      if (rm) {
        const rx = rm.r * 0.82, rz = rm.r * 0.62;
        D.ice.push({ x: rm.x, z: rm.z, rx, rz, kind: 'pist' });
        const ring = [];
        for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, x = rm.x + Math.sin(a) * rx * 0.62, z = rm.z + Math.cos(a) * rz * 0.62; if (api.isFloor(x, z) && api.circleFree(x, z, 0.3)) ring.push([x, z]); }
        D.trails.push({ x: rm.x, z: rm.z, pts: ring });
      }
    }
    // 2) Jöle Tepeleri: 3 zıplatan tepecik zinciri + üstünde altın şeker; dondurma kaydırağı
    {
      const rm = room(a2[0]);
      if (rm) {
        const pads = [];
        for (let t = 0; t < 6 && pads.length < 3; t++) {
          pads.length = 0;
          const p0 = O.roomSpot(L, api, rm, { r: 1.25, pmin: 1.8, pmax: 6, k: 0.7, taken });
          if (!p0) continue;
          pads.push(p0);
          let ang = api.rnd() * TAU;
          for (let i = 1; i < 3; i++) {
            let got = null;
            for (let s = 0; s < 14 && !got; s++) {
              const a = ang + (s % 2 ? 1 : -1) * Math.ceil(s / 2) * 0.45, q = pads[i - 1], x = q.x + Math.sin(a) * 3.6, z = q.z + Math.cos(a) * 3.6;
              if (api.isFloor(x, z) && api.circleFree(x, z, 1.25) && O.clearOf(L, x, z, 1.25) && hyp(x - rm.x, z - rm.z) < rm.r + 1 && pads.every(p => hyp(p.x - x, p.z - z) > 3)) { got = { x, z }; ang = a; }
            }
            if (!got) break;
            pads.push(got);
          }
        }
        pads.forEach((p, i) => D.pads.push({ x: p.x, z: p.z, r: 1.15, col: CORE.jelly[i % CORE.jelly.length], chain: i < pads.length - 1 ? i + 1 : null }));
        if (pads.length >= 2) D.gold.push({ x: (pads[0].x + pads[1].x) / 2, y: 2.5, z: (pads[0].z + pads[1].z) / 2, high: true, sticker: 'gizli_jole_altin' });
        for (const p of pads) taken.push({ x: p.x, z: p.z, r: 2.4 });
      }
      // kaydırak: alanın ikinci odası (olmazsa diğer odalar), kuzey kenarında kule, içeride sarmal iniş
      const tryRooms = [a2[1], a2[0], a3[0], a1[0]].filter(i => i !== undefined);
      for (const ri of tryRooms) {
        const rm = room(ri); if (!rm || D.slide) continue;
        for (const ang of [0, 0.5, -0.5, 0.9, -0.9]) {
          const dx = Math.sin(PI + ang), dz = Math.cos(PI + ang), e = O.edge(api, rm, dx, dz);
          if (e.d < 4) continue;
          // kuleden (kuzey) kameraya doğru dalgalı iniş: yüksek kısım arkada kalır, odayı kapatmaz
          const sx = e.x - dx * 1.1, sz = e.z - dz * 1.1, fx = -dx, fz = -dz, px = -fz, pz = fx, H0 = 3.3, Ls = Math.min(8.5, e.d + 1.5);
          for (const dir of [1, -1]) {
            const pts = []; let ok = true; const N = 30;
            for (let i = 0; i <= N; i++) {
              const u = i / N, w = Math.sin(u * TAU * 0.9) * 1.3 * dir * Math.min(1, u * 4), x = sx + fx * Ls * u + px * w, z = sz + fz * Ls * u + pz * w;
              const y = 0.22 + (H0 - 0.22) * Math.pow(1 - u, 1.35);
              pts.push({ x, y, z });
              if (!(api.isFloor(x, z) && api.circleFree(x, z, 0.35))) ok = false;
            }
            const la = pts[N], lb = pts[N - 1], tx = la.x - lb.x, tz = la.z - lb.z, tl = hyp(tx, tz) || 1;
            for (let q = 1; q <= 3; q++) { const x = la.x + tx / tl * q * 0.6, z = la.z + tz / tl * q * 0.6; pts.push({ x, y: Math.max(0, 0.22 - q * 0.07), z }); if (!(api.isFloor(x, z) && api.circleFree(x, z, 0.45))) ok = false; }
            const mx = sx + fx * Ls * 0.5, mz = sz + fz * Ls * 0.5;
            if (!ok || !O.clearOf(L, mx, mz, 1.5) || !O.clearOf(L, sx, sz, 1.2)) continue;
            if (taken.some(q => pts.some(p => hyp(q.x - p.x, q.z - p.z) < q.r))) continue;
            D.slide = { sx, sz, tx: e.x + dx * 1.3, tz: e.z + dz * 1.3, pts, H0, room: ri };
            for (let i = 0; i < pts.length; i += 5) taken.push({ x: pts[i].x, z: pts[i].z, r: 1.4 });
            taken.push({ x: sx, z: sz, r: 1.6 });
            break;
          }
          if (D.slide) break;
        }
      }
    }
    // 3) Dondurucu Kapısı: kar topu → buz duvarı (içinde hazine); tokanın gizli yeri
    {
      for (const ri of [a3[0], a3[1]]) {
        const rm = room(ri); if (!rm || D.ball) continue;
        for (let k = 0; k < 12 && !D.ball; k++) {
          const a = (k * 0.55 + 1.2) * (k % 2 ? 1 : -1) + PI / 2, dx = Math.sin(a), dz = Math.cos(a);
          if (dz > 0.45) continue;   // kamera tarafına (güney) değil
          const e = O.edge(api, rm, dx, dz);
          if (e.d < 5) continue;
          const ix = e.x + dx * 1.7, iz = e.z + dz * 1.7;
          if (api.linkDist(ix, iz) < 4.5) continue;
          let bad = false;
          for (let q = 0; q < 8; q++) { const b = q * PI / 4; if (api.isFloor(ix + Math.sin(b) * 1.4, iz + Math.cos(b) * 1.4) && hyp(Math.sin(b) + dx, Math.cos(b) + dz) > 0.9) { bad = true; break; } }
          if (bad) continue;
          const bx = e.x - dx * 4.2, bz = e.z - dz * 4.2;
          if (!api.circleFree(bx, bz, 1.2) || !O.clearOf(L, bx, bz, 1.2) || taken.some(q => hyp(q.x - bx, q.z - bz) < q.r + 1.2)) continue;
          let path = true;
          for (let s = 0; s <= 8; s++) { const x = lerp(bx, e.x - dx * 1.0, s / 8), z = lerp(bz, e.z - dz * 1.0, s / 8); if (!api.isFloor(x, z)) path = false; }
          if (!path) continue;
          D.ball = { x: bx, z: bz, ex: e.x - dx * 1.05, ez: e.z - dz * 1.05, ix, iz, dx, dz, room: ri };
          D.ball.solid = api.solid(bx, bz, 0.95, 'kartopu');
          taken.push({ x: bx, z: bz, r: 2 }, { x: e.x, z: e.z, r: 2 });
        }
      }
      const rmT = room(a3[1] ?? a3[0]);
      if (rmT) {
        const p = O.roomSpot(L, api, rmT, { r: 0.9, pmin: 2.2, pmax: 7, k: 0.78, taken });
        if (p) { L.kayipSpot = { x: p.x, z: p.z, id: 'toka', zone: 'buzdolabi' }; L.lostSpot = { x: p.x, z: p.z, id: 'toka' }; taken.push({ x: p.x, z: p.z, r: 1.8 }); }
      }
      // dondurucu odasında da bir buz kaydırma şeridi (kısa)
      const rm3 = room(a3[0]);
      if (rm3) D.ice.push({ x: rm3.x, z: rm3.z, rx: rm3.r * 0.5, rz: rm3.r * 0.4, kind: 'serit', fric: 2.2 });
    }
    // Buzdolabı ışığı düğmesi: başlangıç odasının kuzey kenarı (lamba kenarın ötesinde)
    {
      const rm = R[0];
      for (const ang of [0, 0.5, -0.5]) {
        const dx = Math.sin(PI + ang), dz = Math.cos(PI + ang), e = O.edge(api, rm, dx, dz);
        if (e.d < 3) continue;
        const bx = e.x - dx * 1.4, bz = e.z - dz * 1.4, lx = e.x + dx * 3.2, lz = e.z + dz * 3.2;
        if (!api.circleFree(bx, bz, 0.9) || !O.clearOf(L, bx, bz, 0.9) || api.isFloor(lx, lz) || api.isFloor(lx - dx * 1.2, lz - dz * 1.2)) continue;
        D.lamp = { bx, bz, lx, lz, yaw: Math.atan2(-dx, -dz) };
        taken.push({ x: bx, z: bz, r: 1.6 });
        break;
      }
    }
    // Buz çanları: dondurucunun ikinci odasında 5 parlak buz kristali (dokununca nota çalar)
    {
      const rm = room(a3[1] ?? a3[0]); D.chimes = [];
      if (rm) for (let k = 0; k < 5; k++) {
        const p = O.roomSpot(L, api, rm, { r: 0.65, pmin: 1.6, pmax: 6.5, k: 0.85, taken: taken.concat(D.chimes.map(q => ({ x: q.x, z: q.z, r: 2.4 }))) });
        if (p) { D.chimes.push(p); p.solid = api.solid(p.x, p.z, 0.3, 'can'); taken.push({ x: p.x, z: p.z, r: 1.2 }); }
      }
    }
    // Arena: buz pateni alanı (yumuşak kayma)
    if (arena) { D.ice.push({ x: arena.x, z: arena.z, rx: arena.r - 1.2, rz: arena.r - 1.2, kind: 'arena', fric: 2.8, acc: 3.4, boost: 1.12 }); D.arena = { x: arena.x, z: arena.z, r: arena.r }; }
    // yan odalarda şeker dizileri
    for (const rm of R.filter(r => r.kind === 'side')) {
      const pts = [];
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, x = rm.x + Math.sin(a) * rm.r * 0.45, z = rm.z + Math.cos(a) * rm.r * 0.45; if (api.isFloor(x, z) && api.circleFree(x, z, 0.3)) pts.push([x, z]); }
      D.trails.push({ x: rm.x, z: rm.z, pts });
    }
    O.clearSpawns(L, api, taken.map(q => ({ x: q.x, z: q.z, r: q.r + 1.5 })));
    D.mini = O.miniCorner(L, api, room(a1[0]) || R[0], ['buzPateni', 'paten', 'buz', 'dondurma', 'sekerYakala'], taken);
    D.binis = [];   // biniş halkası kaldırıldı ('Bin!' düğmesi)
    O.gentlePacks(L, 5);
  }

  // ── Görsel kurulum ──
  function* kur(L, api) {   // üreteç: yield'ler oda geçişinde ayrı karelere düşer (06_level buildSteps)
    const D = L.odb || { ice: [], pads: [], gold: [], trails: [], taken: [] };
    const B = O.batch(api), rnd = api.rnd, R = O.rig(api, L);
    if (api.floor && api.floor.material && api.floor.material.userData && api.floor.material.userData.u) {
      const U = api.floor.material.userData.u;
      if (U.uDream) U.uDream.value = 0;   // ay temasının koyu "uzay" zeminini kapat: dışarısı buğulu açık mavi
    }
    api.dreamEdge();
    const areaOf = i => (L.areas || []).findIndex(a => a.rooms.includes(i));
    // ── Kenar süsleri: oda oda (alanına göre) ──
    L.rooms.forEach((rm, i) => {
      const ar = areaOf(i), boss = rm.kind === 'boss';
      if (boss) return;
      if (ar <= 0) {
        O.ring(api, rm, 4, 1.9, (x, z, south) => (south ? yogurt(B, x, z, 0.55 + rnd() * 0.2, rnd) : milkBottle(B, x, z, 1 + rnd() * 0.25, rnd)));
      } else if (ar === 1) {
        O.ring(api, rm, 4, 2.0, (x, z, south) => (south ? jelloMold(B, x, z, 0.5, rnd) : (rnd() < 0.5 ? fruitBowl(B, x, z, 1, rnd) : jelloMold(B, x, z, 1 + rnd() * 0.3, rnd))));
      } else {
        O.ring(api, rm, 4, 2.0, (x, z, south) => (south ? iceBlock(B, x, z, 0.6, rnd) : peasBag(B, x, z, 1 + rnd() * 0.2, rnd)));
        icicles(B, api, rm);
      }
      api.glow(rm.x, rm.z, rm.r * 0.95, ar === 1 ? 0xffe2ee : 0xe4f6ff, 0.1);
    });
    yield;
    // ── Kıyı süsleri: yürünür alanın hemen kenarında (ekranda görünür), alana göre ──
    const avoid = (D.taken || []).map(q => ({ x: q.x, z: q.z, r: q.r * 0.6 })).concat((L.areas || []).filter(a => a.gate).map(a => ({ x: a.gate.x, z: a.gate.z, r: 4.5 })));
    if (L.exit) avoid.push({ x: L.exit.x, z: L.exit.z, r: 5 });
    if (D.ball) avoid.push({ x: D.ball.ix, z: D.ball.iz, r: 3.2 });
    if (D.slide) avoid.push({ x: D.slide.tx, z: D.slide.tz, r: 3 });
    const edgeList = O.edgeSpots(L, api, { avoid, space: 3.3 });
    for (const c of edgeList) {
      const ar = areaOf(c.room), rmk = L.rooms[c.room];
      if (rmk && rmk.kind === 'boss') continue;
      const low = c.side === 'south', mid = c.side === 'side';
      if (ar <= 0) { if (low) (rnd() < 0.5 ? iceBlock(B, c.x, c.z, 0.35, rnd) : yogurt(B, c.x, c.z, 0.38, rnd)); else if (mid) yogurt(B, c.x, c.z, 0.55 + rnd() * 0.2, rnd); else (rnd() < 0.55 ? milkBottle(B, c.x - c.nx * 0.4, c.z - c.nz * 0.4, 0.7 + rnd() * 0.15, rnd) : yogurt(B, c.x, c.z, 0.75, rnd)); }
      else if (ar === 1) { if (low) berry(B, c.x, c.z, 0.55, rnd); else if (mid) (rnd() < 0.5 ? jelloMold(B, c.x, c.z, 0.5, rnd) : berry(B, c.x, c.z, 0.8, rnd)); else (rnd() < 0.5 ? fruitBowl(B, c.x - c.nx * 0.3, c.z - c.nz * 0.3, 0.75, rnd) : jelloMold(B, c.x, c.z, 0.8, rnd)); }
      else { if (low) iceBlock(B, c.x, c.z, 0.35, rnd); else if (mid) (rnd() < 0.5 ? iceBlock(B, c.x, c.z, 0.6, rnd) : snowMound(B, c.x, c.z, 0.8, rnd)); else (rnd() < 0.5 ? peasBag(B, c.x - c.nx * 0.3, c.z - c.nz * 0.3, 0.75, rnd) : iceBlock(B, c.x, c.z, 0.9, rnd)); }
    }
    // zemine serpiştirilmiş kırağı kristalleri ve minik buz parçaları
    for (const f of O.floorSpots(L, api, 50, { avoid })) frost(B, f.x, f.z, rnd);
    O.decals(api, L, 'kar', 26, 2.6, { avoid, opacity: 0.75 });
    // ── Cam raf bölmeleri: Raf Buzulları odalarının kuzeyinde, şişelerin arkasında dikey cam paneller ──
    for (const ri of ((L.areas || [])[0] || { rooms: [] }).rooms) {
      const rm = L.rooms[ri]; if (!rm || rm.kind === 'side') continue;
      const e = O.edge(api, rm, 0, -1), x = e.x, z = e.z - 4.6, w = 7;
      let ok = true;
      for (let q = -3; q <= 3 && ok; q++) for (const dz of [-0.6, 0, 0.6]) if (api.isFloor(x + q * w / 6, z + dz)) { ok = false; break; }
      if (!ok) continue;
      B.add('glass', G.box(), C(0xe4f6ff), [x, 3.2, z], null, [w, 6.4, 0.16]);
      B.add('gloss', G.rbox(2), C(0xffffff), [x, 6.45, z], null, [w + 0.3, 0.3, 0.4]);
      for (const sd of [-1, 1]) B.add('gloss', G.rbox(2), C(0xf2f6fa), [x + sd * (w / 2 + 0.1), 3.2, z], null, [0.3, 6.5, 0.4]);
      B.add('glow', G.box(), C(0xffffff, 1.2), [x - w * 0.3, 3.4, z + 0.09], [0, 0, 0.35], [0.12, 5.2, 0.01]);
      B.add('glow', G.box(), C(0xffffff, 1.0), [x - w * 0.22, 3.2, z + 0.09], [0, 0, 0.35], [0.05, 4.4, 0.01]);
    }
    yield;
    // ── Geçitler: buz kemerleri ──
    (L.areas || []).forEach((a, k) => { if (k && a.gate) (a.boss ? freezerDoor : iceArch)(B, api, L, k); });
    // ── Buz pistleri ──
    for (const e of D.ice) { iceRink(api, e); R.ice.push(e); }
    const pist = D.ice.find(e => e.kind === 'pist');
    if (pist) {
      pist.onEnter = () => O.say('odb_kay', { once: true });
      R.zones.push({ x: pist.x, z: pist.z, r: pist.rx + 4, enter: () => O.say('odb_pist') });
      skatePenguinProps(B, api, pist, rnd);
    }
    const arena = D.ice.find(e => e.kind === 'arena');
    if (arena) { arenaDecor(B, api, L, arena, rnd); R.zones.push({ x: arena.x, z: arena.z, r: arena.rx, enter: () => O.say('odb_arena') }); }
    // ── Jöle tepecikleri ──
    D.pads.forEach((p, i) => {
      const pad = jellyPad(api, p);
      if (p.chain !== null && D.pads[p.chain]) { const q = D.pads[p.chain]; pad.to = { x: q.x, z: q.z }; }
      R.pads.push(pad);
    });
    if (D.pads.length) R.zones.push({ x: D.pads[0].x, z: D.pads[0].z, r: 6.5, enter: () => O.say('odb_jole') });
    for (const g of D.gold) {
      O.goldSugar(api, R, g.x, g.y, g.z, { sticker: g.sticker, r: g.high ? 1.5 : 1.1, dy: g.high ? 1.2 : 1.4 });
      if (g.high) R.zones.push({ x: g.x, z: g.z, r: 5.5, enter: () => O.say('odb_jole_altin') });
    }
    yield;
    // ── Kaydırak ──
    if (D.slide) slide(B, api, R, D.slide);
    // ── Kar topu + buz duvarı ──
    if (D.ball) snowball(B, api, R, D.ball);
    // ── Tokanın gizli yeri (Bilbo bulur) ──
    if (L.kayipSpot) {
      if (typeof BILBO_FUN === 'undefined') tokaMound(api, R, L.kayipSpot);
      else { const K = L.kayipSpot; R.zones.push({ x: K.x, z: K.z, r: 8, enter: () => { if (!(GAME.P.kayipEsyalar && GAME.P.kayipEsyalar.buzdolabi)) O.say('odb_toka'); } }); }
    }
    for (const b of D.binis || []) O.binisLook(B, api, b);
    // ── Şeker dizileri (Feza yaklaşınca belirir) ──
    for (const t of D.trails) if (t.pts.length) R.zones.push({ x: t.x, z: t.z, r: 11, enter(z) { if (!z.done) { z.done = true; O.restCoins(t.pts); } } });
    // ── Buzdolabı lambası: başlangıç odasının kuzeyinde sıcak beyaz ışık ──
    if (D.lamp) lightSwitch(B, api, R, D.lamp); else fridgeLamp(B, api, L.rooms[0]);
    if (D.chimes && D.chimes.length) chimes(B, api, R, D.chimes);
    O.mist(api, L, { color: 0xeef8ff, n: 16, opacity: 0.2 });
    // peri ışıkları: sıcak beyaz + buz mavisi ampuller, buz direkler
    O.fairyLights(B, api, L, { avoid: avoid.concat(edgeList.map(c => ({ x: c.x, z: c.z, r: 1.5 }))), colors: [0xfff0c8, 0xbfe6ff, 0xffd8e8], k: 2.4, light: 0xfff0d8, wire: 0x8aa8c0,
      rooms: new Set(L.rooms.map((r, i) => (r.kind === 'boss' ? -1 : i))),
      post: (B2, x, z, h) => { B2.add('ice', G.cyl(0.8, 1, 10), C(0xd4f0ff), [x, h / 2, z], null, [0.14, h, 0.14]); B2.add('snow', G.sphere(8, 6), C(0xffffff), [x, h + 0.06, z], null, [0.24, 0.14, 0.24]); B2.add('glow', G.sphere(7, 5), C(0xdff6ff, 2), [x, h + 0.22, z], null, [0.09, 0.09, 0.09]); } });
    // ── Mini oyun köşesi (buz pateni / şeker yakala…) ──
    if (D.mini) O.miniCornerLook(B, api, R, D.mini, { ring: 0x9ae8ff, line: 'odb_mini', prop: (B2, x, z) => {   // buz pateni ayakkabısı
      B2.add('gloss', G.rbox(3), C(0xffffff), [x, 0.75, z], null, [0.55, 0.6, 0.95]);
      B2.add('gloss', G.rbox(2), C(0xffffff), [x, 1.2, z - 0.25], null, [0.52, 0.7, 0.5]);
      B2.add('candy', G.torus(TAU, 0.3, 12), C(0xff7aa8), [x, 1.5, z - 0.25], [PI / 2, 0, 0], [0.27, 0.27, 0.27]);
      B2.add('gold', G.box(), C(0xdfe8f2), [x, 0.28, z + 0.05], null, [0.08, 0.3, 1.2]);
      B2.add('gold', G.torus(PI, 0.2, 10), C(0xdfe8f2), [x, 0.2, z + 0.62], [0, PI / 2, 0], [0.18, 0.18, 0.18]);
      for (let i = 0; i < 3; i++) B2.add('candy', G.sphere(6, 4), C(0xff7aa8), [x + 0.29, 0.9 + i * 0.18, z - 0.1 + i * 0.05], null, [0.05, 0.05, 0.05]);
    } });
    // ── Kar tanesi parıltıları ──
    O.sparkles(api, { n: 64, kind: 'flake', colors: [0xe8f6ff, 0xffffff, 0xcfeaff, 0xfff2d8], k: 1.0, size: 0.2, fall: 0.24 });
    B.done();
  }

  // ═════ Modeller (Kit parçaları; hepsi birleştirilir) ═════
  // Süt şişesi sütunu: cam gövde + içinde süt + kapak + inek benekli etiket
  function milkBottle(B, x, z, s, rnd) {
    const Hh = 5.2 * s, r = 1.25 * s, cap = C(CORE.milkCap[(rnd() * 4) | 0]);
    B.add('cream', G.cyl(1, 1, 18), C(0xfdfdf8), [x, Hh * 0.36, z], null, [r * 0.9, Hh * 0.72, r * 0.9]);   // süt
    B.add('glass', G.cyl(1, 1, 18), C(0xeef8ff), [x, Hh * 0.4, z], null, [r, Hh * 0.8, r]);
    B.add('glass', G.sphere(24, 14), C(0xeef8ff), [x, Hh * 0.8, z], null, [r, r * 0.55, r]);
    B.add('glass', G.cyl(1, 1, 16), C(0xeef8ff), [x, Hh * 0.92, z], null, [r * 0.42, Hh * 0.18, r * 0.42]);
    B.add('candy', G.cyl(1, 1, 16), cap, [x, Hh * 1.02, z], null, [r * 0.5, Hh * 0.05, r * 0.5]);
    B.add('candy', G.torus(TAU, 0.3, 16), cap, [x, Hh * 0.995, z], [PI / 2, 0, 0], [r * 0.48, r * 0.48, r * 0.48]);
    B.add('gloss', G.cyl(1, 1, 18, true), C(0xffffff), [x, Hh * 0.38, z], null, [r * 1.02, Hh * 0.22, r * 1.02]);
    for (const [a, w, hk] of [[-0.75, 0.09, 0.62], [-0.45, 0.04, 0.4]]) B.add('glow', G.box(), C(0xffffff, 1.25), [x + Math.sin(a) * r * 1.01, Hh * 0.5, z + Math.cos(a) * r * 1.01], [0, a, 0], [w * s * 2, Hh * hk, 0.02]);
    for (let k = 0; k < 5; k++) {   // inek benekleri
      const a = k * 1.3 + rnd(), yy = Hh * (0.31 + (k % 3) * 0.05);
      B.add('gloss', G.sphere(8, 6), C(0x2a2a30), [x + Math.sin(a) * r * 1.03, yy, z + Math.cos(a) * r * 1.03], [0, a, 0], [0.22 * s, 0.16 * s, 0.05 * s]);
    }
    B.add('gloss', G.sphere(10, 7), C(0xff9ab4), [x + Math.sin(0.3) * r * 1.03, Hh * 0.43, z + Math.cos(0.3) * r * 1.03], [0, 0.3, 0], [0.3 * s, 0.22 * s, 0.06 * s]);   // pembe kalp
  }
  // Yoğurt kabı: kesik koni + renkli bant + folyo kapak (bir köşesi kalkık) + üstünde çilek
  function yogurt(B, x, z, s, rnd) {
    const col = C(CORE.yog[(rnd() * CORE.yog.length) | 0]), h = 1.8 * s, r = 1.15 * s;
    B.add('gloss', G.cyl(1, 0.8, 18), C(0xfffaf2), [x, h / 2, z], null, [r, h, r]);
    B.add('gloss', G.cyl(1, 0.92, 18, true), col, [x, h * 0.55, z], null, [r * 0.98, h * 0.5, r * 0.98]);
    B.add('gloss', G.torus(TAU, 0.08, 16), C(0xfffaf2), [x, h, z], [PI / 2, 0, 0], [r * 1.02, r * 1.02, r * 1.02]);
    B.add('gold', G.cyl(1, 1, 18), C(0xe8eef6), [x, h + 0.03, z], [0.08, 0, 0.06], [r * 1.0, 0.04, r * 1.0]);
    B.add('gold', G.box(), C(0xdfe8f2), [x + r * 0.7, h + 0.25, z + r * 0.45], [0.2, 0.6, -0.9], [0.5 * s, 0.03, 0.4 * s]);
    if (rnd() < 0.6) strawberry(B, x - r * 0.2, h + 0.3 * s, z, 0.42 * s, rnd);
    { const hc = C(0xff6f9a), zf = z + r * 0.93, yy = h * 0.56;   // etiketteki kalp
      for (const sd of [-1, 1]) B.add('candy', G.sphere(8, 6), hc, [x + sd * 0.11 * s, yy + 0.06 * s, zf], null, [0.14 * s, 0.14 * s, 0.05 * s]);
      B.add('candy', G.cone(4), hc, [x, yy - 0.1 * s, zf], [PI, PI / 4, 0], [0.19 * s, 0.22 * s, 0.07 * s]); }
  }
  function strawberry(B, x, y, z, s, rnd) {
    B.add('candy', G.sphere(12, 9), C(0xff3b5c), [x, y, z], [PI, 0, 0], [s * 0.85, s, s * 0.85]);
    B.add('candy', G.cone(14), C(0xff3b5c), [x, y - s * 0.6, z], [PI, 0, 0], [s * 0.7, s * 0.8, s * 0.7]);
    for (let k = 0; k < 5; k++) { const a = k * TAU / 5; B.add('gloss', G.cone(5), C(0x48b04a), [x + Math.sin(a) * s * 0.35, y + s * 0.8, z + Math.cos(a) * s * 0.35], [Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2], [s * 0.18, s * 0.5, s * 0.08]); }
    for (let k = 0; k < 7; k++) { const a = k * 2.4, yy = y - s * 0.1 - (k % 3) * s * 0.22; B.add('glow', G.sphere(5, 4), C(0xfff2a0, 1.1), [x + Math.sin(a) * s * 0.82, yy, z + Math.cos(a) * s * 0.82], null, [s * 0.05, s * 0.07, s * 0.05]); }
  }
  // Jöle kalıbı: katmanlı, yarı saydam kubbe + krema tepesi + kiraz
  function jelloMold(B, x, z, s, rnd) {
    const c1 = CORE.jelly[(rnd() * CORE.jelly.length) | 0], c2 = CORE.jelly[(rnd() * CORE.jelly.length) | 0];
    B.add('jelly', G.cyl(0.78, 1, 18), C(c1), [x, 0.75 * s, z], null, [1.9 * s, 1.5 * s, 1.9 * s]);
    B.add('jelly', G.cyl(0.6, 0.78, 18), C(c2), [x, 1.95 * s, z], null, [1.9 * s, 0.9 * s, 1.9 * s]);
    for (let k = 0; k < 10; k++) { const a = k * TAU / 10; B.add('jelly', G.sphere(8, 6), C(c1), [x + Math.sin(a) * 1.62 * s, 1.0 * s, z + Math.cos(a) * 1.62 * s], null, [0.32 * s, 0.75 * s, 0.32 * s]); }
    B.add('cream', G.sphere(12, 9), C(0xfffaf4), [x, 2.5 * s, z], null, [0.8 * s, 0.45 * s, 0.8 * s]);
    B.add('cream', G.cone(16), C(0xfffaf4), [x, 2.95 * s, z], null, [0.45 * s, 0.6 * s, 0.45 * s]);
    B.add('candy', G.sphere(11, 8), C(0xe8203a), [x, 3.35 * s, z], null, [0.28 * s, 0.28 * s, 0.28 * s]);
    B.add('gloss', G.cyl(1, 1, 5), C(0x5a8a3a), [x + 0.1 * s, 3.65 * s, z], [0, 0, 0.4], [0.03 * s, 0.4 * s, 0.03 * s]);
  }
  // Meyve kâsesi: cam kâse + portakal dilimi, üzüm, çilek, kivi
  function fruitBowl(B, x, z, s, rnd) {
    B.add('glass', G.sphere(18, 12), C(0xeaf6ff), [x, 1.0 * s, z], null, [2.1 * s, 1.2 * s, 2.1 * s]);
    B.add('glass', G.cyl(0.6, 1, 16), C(0xeaf6ff), [x, 0.1 * s, z], null, [1.0 * s, 0.2 * s, 1.0 * s]);
    for (let k = 0; k < 9; k++) {
      const a = k * 2.3 + rnd(), d = (k % 3) * 0.55 * s, xx = x + Math.sin(a) * d, zz = z + Math.cos(a) * d, yy = (1.55 + (k % 2) * 0.35) * s;
      const t = k % 4;
      if (t === 0) { B.add('candy', G.sphere(12, 9), C(0xff9a2a), [xx, yy, zz], null, [0.6 * s, 0.6 * s, 0.6 * s]); }
      else if (t === 1) { for (let g = 0; g < 6; g++) B.add('candy', G.sphere(8, 6), C(g % 2 ? 0x8a4ad0 : 0xa060e0), [xx + (g % 3 - 1) * 0.22 * s, yy + 0.2 * s - Math.floor(g / 3) * 0.25 * s, zz], null, [0.2 * s, 0.2 * s, 0.2 * s]); }
      else if (t === 2) strawberry(B, xx, yy, zz, 0.42 * s, rnd);
      else { B.add('candy', G.cyl(1, 1, 18), C(0x9ad84a), [xx, yy, zz], [0.5, 0, 0.3], [0.5 * s, 0.14 * s, 0.5 * s]); B.add('glow', G.cyl(1, 1, 12), C(0xf4ffd0, 0.9), [xx, yy + 0.08 * s, zz + 0.04], [0.5, 0, 0.3], [0.2 * s, 0.02, 0.2 * s]); }
    }
  }
  function berry(B, x, z, s, rnd) { if (rnd() < 0.5) strawberry(B, x, 0.6 * s, z, 0.7 * s, rnd); else { B.add('candy', G.sphere(11, 8), C(0x4a5ad8), [x, 0.45 * s, z], null, [0.5 * s, 0.45 * s, 0.5 * s]); B.add('candy', G.sphere(10, 7), C(0x5a6ae8), [x + 0.6 * s, 0.38 * s, z + 0.2], null, [0.4 * s, 0.38 * s, 0.4 * s]); } }
  // Buz küpü yığını
  function iceBlock(B, x, z, s, rnd) {
    for (let k = 0; k < 3; k++) {
      const yy = (0.55 + k * 0.85) * s, ox = (rnd() - 0.5) * 0.4 * s;
      if (k && rnd() < 0.35) break;
      B.add('ice', G.rbox(2), C(k % 2 ? 0xd8f0ff : 0xc4e6ff), [x + ox, yy, z + (rnd() - 0.5) * 0.4], [rnd() * 0.3, rnd() * PI, rnd() * 0.2], [1.3 * s, 1.1 * s, 1.3 * s]);
    }
    B.add('glow', G.sphere(7, 5), C(0xdff6ff, 1.4), [x + 0.3 * s, 1.0 * s, z + 0.5 * s], null, [0.06, 0.06, 0.06]);
  }
  // Dondurulmuş bezelye torbası (sevimli yüzlü değil; parlak paket)
  function peasBag(B, x, z, s, rnd) {
    const c = rnd() < 0.5 ? 0x6ac06a : 0x6aa8e8;
    B.add('gloss', G.rbox(3), C(c), [x, 1.5 * s, z], [0, rnd() * 0.6 - 0.3, 0.08], [2.4 * s, 3.0 * s, 0.9 * s]);
    B.add('gloss', G.rbox(2), C(0xffffff), [x, 2.9 * s, z], [0, 0, 0.08], [2.2 * s, 0.35 * s, 0.85 * s]);
    for (let k = 0; k < 5; k++) B.add('candy', G.sphere(8, 6), C(0x8ad86a), [x - 0.6 * s + k * 0.3 * s, 1.4 * s + (k % 2) * 0.25 * s, z + 0.48 * s], null, [0.18 * s, 0.18 * s, 0.1 * s]);
    B.add('snow', G.sphere(10, 7), C(0xf4fbff), [x, 3.15 * s, z], null, [1.1 * s, 0.25 * s, 0.5 * s]);
    B.add('gloss', G.cyl(1, 1, 18), C(0xffffff), [x, 2.05 * s, z + 0.46 * s], [PI / 2, 0, 0], [0.75 * s, 0.04, 0.55 * s]);
    B.add('candy', G.sphere(10, 7), C(0x5cb84a), [x, 2.05 * s, z + 0.5 * s], [0, 0, 0.3], [0.55 * s, 0.17 * s, 0.08 * s]);
    for (let k = 0; k < 3; k++) B.add('candy', G.sphere(8, 6), C(0x9ae07a), [x - 0.25 * s + k * 0.25 * s, 2.05 * s + (k - 1) * 0.075 * s, z + 0.56 * s], null, [0.1 * s, 0.1 * s, 0.05 * s]);
  }
  function snowMound(B, x, z, s, rnd) {
    B.add('snow', G.sphere(11, 8), C(0xffffff), [x, 0.05, z], null, [1.2 * s, 0.6 * s, 1.0 * s]);
    B.add('snow', G.sphere(10, 7), C(0xf0f8ff), [x + 0.6 * s, 0.05, z + 0.3 * s], null, [0.7 * s, 0.4 * s, 0.7 * s]);
    B.add('glow', G.sphere(6, 4), C(0xdff6ff, 1.6), [x - 0.2, 0.55 * s, z + 0.4], null, [0.05, 0.05, 0.05]);
  }
  function frost(B, x, z, rnd) {
    const k = rnd();
    if (k < 0.45) {   // kar tanesi kristali (yere yatık, parlar)
      const yaw = rnd() * PI;
      for (let i = 0; i < 3; i++) B.add('glow', G.box(), C(0xe4f6ff, 1.25), [x, 0.03, z], [0, yaw + i * PI / 3, 0], [0.62, 0.015, 0.06]);
    } else if (k < 0.8) {   // minik buz parçaları
      for (let i = 0; i < 3; i++) B.add('ice', G.octa(), C(0xcfeaff), [x + (rnd() - 0.5) * 0.5, 0.08, z + (rnd() - 0.5) * 0.5], [rnd(), rnd() * PI, rnd()], [0.12, 0.16, 0.12]);
    } else {   // donmuş bezelye / yaban mersini
      for (let i = 0; i < 3; i++) B.add('candy', G.sphere(8, 6), C(i % 2 ? 0x8ad86a : 0x5a6ad8), [x + (rnd() - 0.5) * 0.6, 0.13, z + (rnd() - 0.5) * 0.6], null, [0.13, 0.13, 0.13]);
      B.add('snow', G.sphere(7, 5), C(0xffffff), [x, 0.02, z], null, [0.4, 0.06, 0.4]);
    }
  }
  // Kuzeydeki rafın kenarından sarkan, parlayan buz sarkıtları (zararsız; yürünür alanın üstünde değil)
  function icicles(B, api, rm) {
    const r = rm.r || 6, z = rm.z - r - 2.6, n = Math.round(r * 1.2), w = r * 2.2;
    for (let q = 0; q <= 8; q++) for (const dz of [-0.9, 0, 0.9]) if (api.isFloor(rm.x - w / 2 + q * w / 8, z + dz)) return;
    // buzlu raf duvarı: karla kaplı alçak duvar, ön kenarından parlayan sarkıtlar
    B.add('ice', G.rbox(2), C(0xcfeaff), [rm.x, 2.3, z - 0.3], null, [w, 4.6, 1.4]);
    B.add('snow', G.rbox(2), C(0xf6fcff), [rm.x, 4.75, z], null, [w + 0.4, 0.5, 2.0]);
    for (let k = 0; k < Math.round(w * 1.2); k++) B.add('snow', G.sphere(8, 6), C(0xffffff), [rm.x - w / 2 + k * 0.85, 4.95, z + 0.9 - (k % 2) * 0.3], null, [0.5, 0.3, 0.5]);
    for (let k = 0; k < n; k++) {
      const x = rm.x - w / 2 + 0.4 + k * ((w - 0.8) / (n - 1)), l = 0.8 + ((k * 7) % 5) * 0.28, top = 4.55;
      B.add('ice', G.cone(10), C(0xd4f0ff), [x, top - l / 2, z + 0.75], [PI, 0, 0], [0.2 + (k % 3) * 0.05, l, 0.2]);
      B.add('glow', G.sphere(7, 5), C(0xbfeaff, 2.2), [x, top - l + 0.06, z + 0.75], null, [0.06, 0.09, 0.06]);
    }
    api.light(rm.x, 3.6, z + 1.6, 0xbfe6ff, 2.4, 8, 0.05);
  }
  // Buz kemeri (alan geçidi): buz küpü direkler + yay + parlayan kar tanesi
  function iceArch(B, api, L, k) {
    const g = L.areas[k].gate, d = O.gateDir(L, k), px = -d.dz, pz = d.dx, w = O.corridorHalf(api, g.x, g.z, px, pz);
    const half = (w.a + w.b) / 2 + 0.75, cx = g.x + px * (w.a - w.b) / 2, cz = g.z + pz * (w.a - w.b) / 2;
    if (half > 6.5 || w.a >= 7 || w.b >= 7) return;
    const yaw = Math.atan2(px, pz);
    for (const sd of [-1, 1]) {
      const x = cx + px * half * sd, z = cz + pz * half * sd;
      for (let i = 0; i < 4; i++) B.add('ice', G.rbox(2), C(i % 2 ? 0xd2eeff : 0xbfe4ff), [x, 0.5 + i * 0.95, z], [0, yaw + i * 0.3, 0], [0.95, 0.9, 0.95]);
      B.add('snow', G.sphere(10, 7), C(0xffffff), [x, 4.0, z], null, [0.7, 0.32, 0.7]);
      B.add('glow', G.sphere(8, 6), C(0xbfeaff, 2), [x, 4.35, z], null, [0.16, 0.16, 0.16]);
    }
    // yay
    const N = 14;
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = PI * u, x = cx + px * Math.cos(a) * half, z = cz + pz * Math.cos(a) * half, y = 4.0 + Math.sin(a) * 1.3;
      B.add('ice', G.sphere(8, 6), C(0xd8f2ff), [x, y, z], null, [0.42, 0.42, 0.42]);
      if (i % 2 === 0) B.add('snow', G.sphere(7, 5), C(0xffffff), [x, y + 0.32, z], null, [0.3, 0.14, 0.3]);
    }
    // kar tanesi amblemi
    const ex = cx, ez = cz, ey = 5.45;
    for (let i = 0; i < 6; i++) { const a = i * PI / 3; B.add('glow', G.box(), C(0xdff6ff, 1.8), [ex + px * Math.cos(a) * 0.35, ey + Math.sin(a) * 0.35, ez + pz * Math.cos(a) * 0.35], [0, yaw, a], [0.7, 0.09, 0.09]); }
    B.add('glow', G.sphere(8, 6), C(0xffffff, 2.2), [ex, ey, ez], null, [0.16, 0.16, 0.16]);
    api.light(cx, 3.2, cz, 0xcfeeff, 2.2, 7, 0);
    api.glow(cx, cz, half + 1, 0xd8f2ff, 0.16);
  }
  // Dondurucu kapısı (arenaya giriş): iki yana açılmış, karlı, kulplu beyaz dondurucu kapakları + üstte buzlu çerçeve
  function freezerDoor(B, api, L, k) {
    const g = L.areas[k].gate, d = O.gateDir(L, k), px = -d.dz, pz = d.dx, w = O.corridorHalf(api, g.x, g.z, px, pz);
    if (w.a >= 7 || w.b >= 7) { iceArch(B, api, L, k); return; }
    const cx = g.x + px * (w.a - w.b) / 2, cz = g.z + pz * (w.a - w.b) / 2, half = (w.a + w.b) / 2 + 0.6;
    for (const sd of [-1, 1]) {
      const hx = cx + px * half * sd, hz = cz + pz * half * sd;
      // kapak: menteşeden dışa ve arenaya doğru 50° açık
      const ox = px * sd * Math.cos(0.87) + d.dx * Math.sin(0.87), oz = pz * sd * Math.cos(0.87) + d.dz * Math.sin(0.87);
      const mx = hx + ox * 1.6, mz = hz + oz * 1.6;
      if (api.isFloor(mx, mz) || api.isFloor(hx + ox * 3, hz + oz * 3)) continue;
      const yaw = Math.atan2(ox, oz) + PI / 2;
      B.add('gloss', G.rbox(3), C(0xf8fbff), [mx, 2.6, mz], [0, yaw, 0], [3.2, 5.2, 0.35]);
      B.add('gloss', G.rbox(2), C(0xdfeaf4), [mx, 2.6, mz], [0, yaw, 0], [2.7, 4.6, 0.42]);
      B.add('gloss', G.rbox(2), C(0x9ab8d8), [mx + ox * 1.1 + Math.cos(yaw) * 0.0, 2.6, mz + oz * 1.1], [0, yaw, 0], [0.18, 2.2, 0.6]);
      B.add('snow', G.rbox(2), C(0xffffff), [mx, 5.3, mz], [0, yaw, 0], [3.3, 0.35, 0.6]);
      for (let i = 0; i < 6; i++) B.add('ice', G.cone(8), C(0xd4f0ff), [mx + ox * (-1.3 + i * 0.52), 4.95, mz + oz * (-1.3 + i * 0.52)], [PI, 0, 0], [0.12, 0.5 + (i % 3) * 0.2, 0.12]);
      for (let i = 0; i < 4; i++) B.add('glow', G.sphere(6, 4), C(0xbfeaff, 1.8), [mx + ox * (-1 + i * 0.7), 1.0 + (i % 2) * 2.4, mz + oz * (-1 + i * 0.7)], null, [0.07, 0.07, 0.07]);
      // menteşe direği
      for (let i = 0; i < 5; i++) B.add('ice', G.rbox(2), C(i % 2 ? 0xd2eeff : 0xbfe4ff), [hx, 0.55 + i * 1.05, hz], [0, i * 0.4, 0], [0.8, 1.0, 0.8]);
      B.add('snow', G.sphere(10, 7), C(0xffffff), [hx, 5.5, hz], null, [0.6, 0.3, 0.6]);
    }
    // üst çerçeve: buz kirişi + kar + parlayan kar tanesi
    const N = 12;
    for (let i = 0; i <= N; i++) { const u = i / N - 0.5, x = cx + px * u * half * 2, z = cz + pz * u * half * 2; B.add('ice', G.rbox(2), C(0xd8f2ff), [x, 5.6, z], [0, Math.atan2(px, pz), 0], [half * 2 / N + 0.1, 0.6, 0.7]); if (i % 2 === 0) B.add('snow', G.sphere(8, 6), C(0xffffff), [x, 5.95, z], null, [0.45, 0.2, 0.45]); }
    const yawF = Math.atan2(px, pz);
    for (let i = 0; i < 6; i++) { const a = i * PI / 3; B.add('glow', G.box(), C(0xdff6ff, 2), [cx + px * Math.cos(a) * 0.55, 6.6 + Math.sin(a) * 0.55, cz + pz * Math.cos(a) * 0.55], [0, yawF, a], [1.1, 0.12, 0.12]); }
    B.add('glow', G.sphere(10, 8), C(0xffffff, 2.4), [cx, 6.6, cz], null, [0.22, 0.22, 0.22]);
    api.light(cx + d.dx * 2, 3.5, cz + d.dz * 2, 0xbfe6ff, 3, 9, 0.05);
    api.glow(cx, cz, half + 1.5, 0xcfeeff, 0.22);
  }
  // Buz pisti: yarı saydam, parlak buz diski + pist çizgileri (tuval doku)
  let rinkTex = null, plainTex = null;
  function rinkTexture(plain) {
    if (plain && plainTex) return plainTex;
    if (!plain && rinkTex) return rinkTex;
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    const gr = x.createRadialGradient(256, 256, 30, 256, 256, 256); gr.addColorStop(0, '#f6fcff'); gr.addColorStop(0.75, '#d6efff'); gr.addColorStop(1, '#bfe2fb');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
    x.globalAlpha = 0.35; x.strokeStyle = '#ffffff'; x.lineWidth = 1.5;
    for (let i = 0; i < 70; i++) { const a = Math.random() * TAU, r = 60 + Math.random() * 180, l = 0.3 + Math.random() * 0.8; x.beginPath(); x.arc(256, 256, r, a, a + l); x.stroke(); }
    if (plain) {   // yalnız buz: çatlak ışıltıları + kar tanesi kırağısı
      x.globalAlpha = 0.5; x.strokeStyle = '#ffffff'; x.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, r = 40 + Math.random() * 190, px = 256 + Math.cos(a) * r, py = 256 + Math.sin(a) * r; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 3; k++) x.lineTo(px + (Math.random() - 0.5) * 50, py + (Math.random() - 0.5) * 50); x.stroke(); }
      plainTex = new THREE.CanvasTexture(c); plainTex.colorSpace = THREE.SRGBColorSpace; plainTex.anisotropy = 4; plainTex.userData.keep = true;
      return plainTex;
    }
    x.globalAlpha = 0.75; x.lineWidth = 7; x.strokeStyle = '#ff9ec0'; x.beginPath(); x.arc(256, 256, 70, 0, TAU); x.stroke();
    x.strokeStyle = '#8fd0ff'; x.lineWidth = 6; x.beginPath(); x.moveTo(256, 20); x.lineTo(256, 492); x.stroke();
    x.beginPath(); x.arc(256, 256, 236, 0, TAU); x.lineWidth = 9; x.strokeStyle = '#a8dcff'; x.stroke();
    x.globalAlpha = 0.9; x.fillStyle = '#ff9ec0'; x.beginPath(); x.arc(256, 256, 12, 0, TAU); x.fill();
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; x.fillStyle = i % 2 ? '#ffd56a' : '#9fd8ff'; x.beginPath(); x.arc(256 + Math.cos(a) * 160, 256 + Math.sin(a) * 160, 9, 0, TAU); x.fill(); }
    rinkTex = new THREE.CanvasTexture(c); rinkTex.colorSpace = THREE.SRGBColorSpace; rinkTex.anisotropy = 4; rinkTex.userData.keep = true;
    return rinkTex;
  }
  function iceRink(api, e) {
    const plain = e.kind === 'serit', mk = plain ? 'plain' : 'rink';
    const m = RINK_MATS[mk] || (RINK_MATS[mk] = (() => { const mm = new THREE.MeshStandardMaterial({ map: rinkTexture(plain), roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.86, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); mm.userData.keep = true; return mm; })());
    const geo = new THREE.CircleGeometry(1, 64); geo.rotateX(-PI / 2);
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(e.x, 0.025, e.z); mesh.scale.set(e.rx, 1, e.rz); mesh.receiveShadow = true; mesh.renderOrder = 1; mesh.name = 'buz-pisti';
    api.add(mesh);
    api.glow(e.x, e.z, Math.max(e.rx, e.rz) * 1.05, 0xd6f0ff, 0.2);
    // kenarda karlı, yumuşak halka
    const tg = new THREE.TorusGeometry(1, 0.2 / Math.max(e.rx, e.rz), 8, 72); tg.rotateX(PI / 2);
    const rim = new THREE.Mesh(tg, ODAB.mat('snow')); rim.position.set(e.x, 0.03, e.z); rim.scale.set(e.rx + 0.1, 1.1, e.rz + 0.1); rim.receiveShadow = true;
    const cg = tg.attributes.position.count, cc = new Float32Array(cg * 3); for (let i = 0; i < cg * 3; i++) cc[i] = 1; tg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    api.add(rim);
  }
  const RINK_MATS = {};
  // pistin kenarında oyuncak penguen değil: sevimli kardan adam şişeleri yerine — buz pateni süsleri (patenli şeker çubukları)
  function skatePenguinProps(B, api, e, rnd) {
    for (let k = 0; k < 4; k++) {
      const a = k * PI / 2 + 0.4, x = e.x + Math.sin(a) * (e.rx + 2.6), z = e.z + Math.cos(a) * (e.rz + 2.6);
      if (api.isFloor(x, z) || z > e.z + e.rz * 0.5) continue;
      // kar küresi (cam küre içinde minik kar taneleri ve yıldız)
      B.add('cream', G.cyl(1, 1.1, 18), C(0xff8fb0), [x, 0.35, z], null, [1.0, 0.7, 1.0]);
      B.add('glass', G.sphere(16, 12), C(0xeaf8ff), [x, 1.6, z], null, [1.0, 1.0, 1.0]);
      B.add('snow', G.sphere(12, 8), C(0xffffff), [x, 0.9, z], null, [0.85, 0.3, 0.85]);
      B.add('glow', G.octa(), C(0xffe080, 2.2), [x, 1.6, z], [0, rnd(), 0.3], [0.28, 0.28, 0.12]);
      for (let i = 0; i < 6; i++) B.add('glow', G.sphere(6, 4), C(0xffffff, 1.6), [x + Math.sin(i * 1.7) * 0.5, 1.3 + (i % 3) * 0.3, z + Math.cos(i * 1.7) * 0.5], null, [0.05, 0.05, 0.05]);
      api.light(x, 1.8, z, 0xffe6a8, 1.6, 5, 0.1);
    }
  }
  // Arena: buz pateni alanı — kenarlarda kar küreleri ve dondurma külahları, kuzeyde Dondurma Kralı'nın tahtı (dev kup)
  function arenaDecor(B, api, L, e, rnd) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, x = e.x + Math.sin(a) * (e.rx + 3.4), z = e.z + Math.cos(a) * (e.rz + 3.4), south = z > e.z + e.rz * 0.4;
      if (api.isFloor(x, z) || api.linkDist(x, z) < 3) continue;
      if (south) { B.add('snow', G.sphere(11, 8), C(0xffffff), [x, 0.2, z], null, [1.2, 0.5, 1.2]); B.add('glow', G.sphere(7, 5), C(i % 2 ? 0xffc0d8 : 0xbfe6ff, 1.8), [x, 0.6, z], null, [0.14, 0.14, 0.14]); continue; }
      cone(B, x, z, 1.25 + (i % 3) * 0.15, i);
    }
    // kuzeyde dev dondurma kupası
    const tx = e.x, tz = e.z - e.rz - 5.5;
    if (!api.isFloor(tx, tz + 2)) {
      B.add('glass', G.cyl(1, 0.35, 18), C(0xeaf8ff), [tx, 3.0, tz], null, [3.6, 2.6, 3.6]);
      B.add('glass', G.cyl(0.3, 0.3, 16), C(0xeaf8ff), [tx, 0.9, tz], null, [0.6, 1.8, 0.6]);
      B.add('glass', G.cyl(1, 1, 18), C(0xeaf8ff), [tx, 0.1, tz], null, [2.2, 0.2, 2.2]);
      const sc = [0xffb8cc, 0xfff2d0, 0xbff0d0, 0xc8a07a];
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.3; B.add('cream', G.sphere(14, 10), C(sc[i]), [tx + Math.sin(a) * 1.4, 4.6, tz + Math.cos(a) * 1.4], null, [1.6, 1.4, 1.6]); }
      B.add('cream', G.sphere(14, 10), C(0xffe6ee), [tx, 5.9, tz], null, [1.5, 1.2, 1.5]);
      B.add('candy', G.sphere(12, 9), C(0xe8203a), [tx, 7.2, tz], null, [0.5, 0.5, 0.5]);
      for (let i = 0; i < 5; i++) B.add('gold', G.cone(6), C(0xffd24a), [tx + Math.sin(i * TAU / 5) * 0.9, 7.0, tz + Math.cos(i * TAU / 5) * 0.9], null, [0.22, 0.6, 0.22]);
      B.add('candy', G.cyl(1, 1, 8), C(0xf4c27a), [tx + 1.2, 6.6, tz + 0.3], [0, 0, -0.5], [0.15, 2.2, 0.15]);
      api.light(tx, 5, tz + 3, 0xffe2c0, 3, 10, 0);
    }
    // asılı kar taneleri (kuzey yarıda, yüksekte)
    for (let i = 0; i < 7; i++) {
      const a = PI + (i - 3) * 0.32, x = e.x + Math.sin(a) * (e.rx + 1.5), z = e.z + Math.cos(a) * (e.rz + 1.5), y = 4.8 + (i % 2) * 0.6;
      for (let j = 0; j < 6; j++) { const b = j * PI / 3; B.add('glow', G.box(), C(0xdff4ff, 1.7), [x + Math.cos(b) * 0.3, y + Math.sin(b) * 0.3, z], [0, 0, b], [0.62, 0.08, 0.08]); }
      B.add('gloss', G.cyl(1, 1, 4), C(0xffffff), [x, y + 1.5, z], null, [0.02, 2.6, 0.02]);
    }
    api.glow(e.x, e.z, e.rx + 1, 0xcfeaff, 0.22);
  }
  function cone(B, x, z, s, i) {
    B.add('candy', G.cone(18), C(0xe0a050), [x, 1.4 * s, z], [PI, 0, 0], [0.75 * s, 2.8 * s, 0.75 * s]);
    for (let k = 0; k < 4; k++) B.add('gloss', G.torus(TAU, 0.06, 18), C(0xc88a3a), [x, (0.9 + k * 0.6) * s, z], [PI / 2, 0, 0], [(0.2 + k * 0.15) * s, (0.2 + k * 0.15) * s, (0.2 + k * 0.15) * s]);
    const sc = [0xffb8cc, 0xfff2d0, 0xbff0d0, 0xc8a07a, 0xd8c0ff][i % 5];
    B.add('cream', G.sphere(14, 10), C(sc), [x, 3.05 * s, z], null, [0.95 * s, 0.85 * s, 0.95 * s]);
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; B.add('cream', G.sphere(7, 5), C(sc), [x + Math.sin(a) * 0.8 * s, 2.7 * s, z + Math.cos(a) * 0.8 * s], null, [0.3 * s, 0.25 * s, 0.3 * s]); }
    for (let k = 0; k < 6; k++) B.add('glow', G.cyl(1, 1, 5), C([0xff6fa0, 0x6fc8ff, 0xffe06a][k % 3], 1.3), [x + Math.sin(k * 1.9) * 0.6 * s, 3.4 * s + (k % 2) * 0.2, z + Math.cos(k * 1.9) * 0.6 * s], [k, 0, k * 0.7], [0.04, 0.24, 0.04]);
  }
  // Buzdolabı lambası
  function fridgeLamp(B, api, rm) {
    if (!rm) return;
    const x = rm.x, z = rm.z - rm.r - 3.2;
    if (api.isFloor(x, z + 1)) return;
    B.add('gloss', G.rbox(3), C(0xffffff), [x, 5.2, z], null, [4.4, 1.6, 1.4]);
    B.add('glow', G.rbox(2), C(0xfff2d6, 2.4), [x, 5.2, z + 0.6], null, [3.6, 1.0, 0.4]);
    api.light(x, 4.5, z + 2.5, 0xfff0d8, 4, 13, 0);
    api.glow(x, z + 4, 6, 0xfff0d0, 0.18);
  }
  // Işık düğmesi: basınca buzdolabının lambası yanar / söner
  function lightSwitch(B, api, R, S) {
    const x = S.lx, z = S.lz, LT = api.B.lights, sy = Math.sin(S.yaw), cy = Math.cos(S.yaw);
    B.add('gloss', G.rbox(3), C(0xffffff), [x, 5.0, z], [0, S.yaw, 0], [4.4, 1.6, 1.4]);
    B.add('gloss', G.rbox(2), C(0xe8f2fa), [x, 5.0, z], [0, S.yaw, 0], [3.7, 1.05, 1.5]);
    const pk = new Kit(); pk.add(G.rbox(2), C(0xfff2d6, 2.4), [0, 0, 0], null, [3.6, 1.0, 0.4]);
    const panel = O.solo(pk, 'glow', api); panel.position.set(x + sy * 0.6, 5.0, z + cy * 0.6); panel.rotation.y = S.yaw;
    const li = api.light(x + sy * 2.5, 4.4, z + cy * 2.5, 0xfff0d8, 4, 13, 0) - 1;
    api.glow(x + sy * 4, z + cy * 4, 6, 0xfff0d0, 0.16);
    // kocaman düğme (beyaz taban + mavi parlak kubbe)
    B.add('gloss', G.cyl(1, 1.12, 18), C(0xffffff), [S.bx, 0.14, S.bz], null, [0.85, 0.28, 0.85]);
    B.add('gloss', G.torus(TAU, 0.2, 16), C(0xdfeaf4), [S.bx, 0.28, S.bz], [PI / 2, 0, 0], [0.78, 0.78, 0.78]);
    const bk = new Kit(); bk.add(G.sphere(16, 10), C(0x5ab8ff), [0, 0, 0], null, [0.62, 0.3, 0.62]); bk.add(G.sphere(8, 6), C(0xffffff), [-0.2, 0.15, -0.15], null, [0.14, 0.06, 0.1]);
    const btn = O.solo(bk, 'candy', api); btn.position.set(S.bx, 0.3, S.bz);
    const hk = new Kit(); hk.add(G.sphere(12, 8), C(0x8fd4ff, 0.7), [0, 0, 0], null, [1, 1, 1]);
    const halo = new THREE.Mesh(hk.build(), O.mat('halo')); halo.position.set(S.bx, 0.35, S.bz); halo.renderOrder = 3; api.add(halo);
    const st = { on: true, press: 0, n: 0, k: 1 };
    api.anim(dt => {
      st.press = Math.max(0, st.press - dt * 4); btn.position.y = 0.3 - Math.sin(st.press * PI) * 0.14;
      st.k = damp(st.k, st.on ? 1 : 0, 9, dt); panel.scale.setScalar(0.2 + st.k * 0.8); panel.visible = st.k > 0.05;
      if (LT[li]) LT[li].int = 0.3 + 3.7 * st.k;
      halo.scale.setScalar(0.75 + Math.sin(R.t * 3) * 0.08);
    });
    R.zones.push({ x: S.bx, z: S.bz, r: 6, enter: () => O.say('odb_dugme') });
    R.zones.push({ x: S.bx, z: S.bz, r: 0.95, enter() {
      st.on = !st.on; st.press = 1; st.n++;
      O.sfx('click', { vol: 0.9 }); O.sfx(st.on ? 'unlock' : 'close', { vol: 0.5 });
      if (st.on) { O.burst('star', x + sy * 1.2, 4.6, z + cy * 1.2, { count: 12 }); O.say(st.n < 3 ? 'odb_isik' : O.pick(['odb_isik', 'odb_isik2']), { once: false, gap: 6 }); }
      else { O.burst('sparkle', S.bx, 0.8, S.bz, { count: 6, color: '#8fd4ff' }); if (st.n === 1) O.say('odb_isik_kapa', { gap: 2 }); }
      if (st.n <= 4) O.coins(S.bx, S.bz, 2, 0.7);
      if (st.n === 4 && GAME.giveSticker) GAME.giveSticker('gizli_buzdolabi_isigi', 'gizli');
    } });
  }
  // Buz çanları: dokununca nota çalar, parlar; hepsi çalınca hediye
  function chimes(B, api, R, list) {
    const notes = [1, 1.122, 1.26, 1.335, 1.498], cols = [0x9fe0ff, 0xc8b0ff, 0xa8f0d8, 0xffc0e0, 0xfff0a0], LT = api.B.lights;
    let lit = 0, done = false;
    list.forEach((p, i) => {
      const c = cols[i % cols.length], k = new Kit();
      k.add(G.octa(), C(c), [0, 1.15, 0], [0, 0.4, 0], [0.42, 1.15, 0.42]);
      k.add(G.octa(), C(c).lerp(C(0xffffff), 0.3), [0.32, 0.55, 0.1], [0.2, 0.8, -0.35], [0.22, 0.55, 0.22]);
      k.add(G.octa(), C(c).lerp(C(0xffffff), 0.3), [-0.28, 0.45, -0.1], [-0.25, 0.2, 0.4], [0.2, 0.45, 0.2]);
      const m = O.solo(k, 'ice', api); m.position.set(p.x, 0, p.z);
      B.add('snow', G.sphere(12, 8), C(0xffffff), [p.x, 0.04, p.z], null, [0.7, 0.18, 0.7]);
      const gk = new Kit(); gk.add(G.sphere(10, 8), C(c, 2.2), [0, 0, 0], null, [1, 1, 1]);
      const core = O.solo(gk, 'glow', api); core.position.set(p.x, 1.15, p.z); core.scale.setScalar(0.12);
      const li = api.light(p.x, 1.6, p.z, c, 0, 5, 0) - 1;
      const st = { on: false, ring: 0 };
      api.anim((dt, fx0, fz0) => {
        if (!st.on && Math.random() < dt * 0.6 && hyp(fx0 - p.x, fz0 - p.z) < 10) O.burst('sparkle', p.x, 1.6, p.z, { count: 2, color: '#' + C(c).getHexString() });
        st.ring = Math.max(0, st.ring - dt * 1.6);
        const w = Math.sin(R.t * 30) * st.ring * 0.08; m.rotation.z = w; m.rotation.x = w * 0.6;
        core.scale.setScalar(0.12 + (st.on ? 0.1 : 0) + st.ring * 0.25);
        if (LT[li]) LT[li].int = (st.on ? 1.2 : 0) + st.ring * 3;
      });
      R.zones.push({ x: p.x, z: p.z, r: 1.3, enter() {
        st.ring = 1;
        O.sfx('star', { x: p.x, z: p.z, pitch: notes[i % 5] * 0.85, vol: 0.8 }); O.sfx('ice', { pitch: notes[i % 5] * 1.2, vol: 0.4 });
        O.burst('sparkle', p.x, 1.5, p.z, { count: 8, color: '#' + C(c).getHexString() }); O.burst('notes', p.x, 2.2, p.z, {});
        if (!st.on) { st.on = true; lit++; O.coins(p.x, p.z, 1, 0.5, 1.6); }
        if (lit === list.length && !done) {
          done = true;
          setTimeout(() => {
            const P = GAME.P; O.burst('confetti', P.pos.x, 2, P.pos.z, {}); O.sfx('cheer', { vol: 0.8 }); O.coins(P.pos.x, P.pos.z, 12, 1.1);
            if (GAME.giveSticker) GAME.giveSticker('gizli_buz_canlari', 'gizli');
            O.say('odb_can_ok', { gap: 0 });
            O.goldSugar(api, R, P.pos.x + 1.2, 0.8, P.pos.z - 0.8, {});
          }, 600);
        }
      } });
    });
    R.zones.push({ x: list[0].x, z: list[0].z, r: 7, enter: () => O.say('odb_can') });
  }
  // Zıplatan jöle tepeciği (tek hareketli mesh: sıkışır, sallanır)
  function jellyPad(api, p) {
    const k = new Kit(), c = C(p.col), c2 = C(p.col).lerp(C(0xffffff), 0.35);
    k.add(G.sphere(18, 12), c, [0, 0, 0], null, [1, 0.62, 1]);
    k.add(G.sphere(14, 10), c2, [0, 0.42, 0], null, [0.62, 0.3, 0.62]);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; k.add(G.sphere(8, 6), C(0xffffff).lerp(c, 0.4), [Math.sin(a) * 0.45, 0.2, Math.cos(a) * 0.45], null, [0.12, 0.12, 0.12]); }
    const fruit = [0xff3b5c, 0xffb13b, 0x6fd86a, 0x8a4ad0];
    for (let i = 0; i < 7; i++) { const a = i * 2.3, r = 0.2 + (i % 3) * 0.17; k.add(G.box(), C(fruit[i % 4]), [Math.sin(a) * r, 0.12 + (i % 2) * 0.14, Math.cos(a) * r], [i, i * 0.7, 0], [0.13, 0.13, 0.13]); }
    const m = O.solo(k, 'jelly', api); m.position.set(p.x, 0, p.z); m.scale.setScalar(p.r * 1.05);
    const top = new Kit();
    top.add(G.sphere(11, 8), C(0xfffaf4), [0, 0.7, 0], null, [0.32, 0.18, 0.32]);
    top.add(G.cone(12), C(0xfffaf4), [0, 0.86, 0], null, [0.18, 0.22, 0.18]);
    top.add(G.sphere(10, 7), C(0xe8203a), [0, 1.0, 0], null, [0.11, 0.11, 0.11]);
    const t = O.solo(top, 'cream', api); t.position.copy(m.position); t.scale.copy(m.scale);
    api.light(p.x, 1.4, p.z, p.col, 1.3, 4, 0);
    api.glow(p.x, p.z, p.r * 1.8, p.col, 0.22);
    const pad = { x: p.x, z: p.z, r: p.r * 0.95, col: '#' + C(p.col).getHexString(), h: 2.7, dur: 0.82, hit: 0, w: 0, wv: 0 };
    pad.anim = dt => {   // yay: sıkış + salınım
      if (pad.hit) { pad.wv -= 9; pad.hit = 0; }
      pad.wv += (-pad.w * 120 - pad.wv * 7) * dt; pad.w += pad.wv * dt;
      pad.idle = (pad.idle || Math.random() * 6) + dt;
      const iw = Math.sin(pad.idle * 2.6) * 0.035;
      const sy = 1 + pad.w * 0.18 + iw, sx = 1 - pad.w * 0.09 - iw * 0.5, s = p.r * 1.05;
      m.scale.set(s * sx, s * sy, s * sx); t.scale.set(s * sx, s * sy, s * sx);
    };
    return pad;
  }
  // Dondurma kaydırağı: kule (üç top dondurma, külah, merdiven) + açık oluk (renkli şeritli) + gofret ayaklar
  function slide(B, api, R, S) {
    const tx = S.tx, tz = S.tz, top = S.H0;
    // kule
    B.add('candy', G.cyl(0.75, 1, 18), C(0xe0a050), [tx, top / 2, tz], null, [1.5, top, 1.5]);
    for (let k = 0; k < 5; k++) B.add('gloss', G.torus(TAU, 0.05, 16), C(0xc88a3a), [tx, 0.5 + k * 0.7, tz], [PI / 2, 0, 0], [1.42 - k * 0.07, 1.42 - k * 0.07, 1.42 - k * 0.07]);
    const sc = [0xffb8cc, 0xbff0d0, 0xfff2d0];
    for (let i = 0; i < 3; i++) B.add('cream', G.sphere(14, 10), C(sc[i]), [tx, top + 0.5 + i * 1.05, tz], null, [1.45 - i * 0.18, 1.0, 1.45 - i * 0.18]);
    B.add('candy', G.sphere(12, 9), C(0xe8203a), [tx, top + 3.3, tz], null, [0.42, 0.42, 0.42]);
    for (let i = 0; i < 10; i++) B.add('glow', G.cyl(1, 1, 5), C([0xff6fa0, 0x6fc8ff, 0xffe06a, 0x9cff8a][i % 4], 1.3), [tx + Math.sin(i * 2.1) * 1.2, top + 0.7 + (i % 3) * 0.8, tz + Math.cos(i * 2.1) * 1.2], [i, 0, i * 0.7], [0.05, 0.3, 0.05]);
    // merdiven: kuleden başlangıç halkasına şeker çubukları
    const sx = S.sx, sz = S.sz;
    for (const sd of [-1, 1]) {
      const dx = tx - sx, dz = tz - sz, l = hyp(dx, dz) || 1, px = -dz / l * 0.45 * sd, pz = dx / l * 0.45 * sd;
      B.seg('candy', [sx + px, 0, sz + pz], [sx + px + dx * 0.25, top, sz + pz + dz * 0.25], 0.07, C(0xff5a7a));
    }
    for (let i = 1; i < 6; i++) { const u = i / 6, x = lerp(sx, sx + (tx - sx) * 0.25, u), z = lerp(sz, sz + (tz - sz) * 0.25, u); B.add('candy', G.cyl(1, 1, 8), C(0xffffff), [x, top * u, z], [0, Math.atan2(tx - sx, tz - sz), PI / 2], [0.06, 0.95, 0.06]); }
    // oluk: U kesitli şerit (iç yüzey), yol boyunca renk şeritleri
    const pts = S.pts, N = pts.length, M = 9, pos = [], col = [], nor = [], idx = [];
    const stripe = [C(0xff7fa8), C(0xfff2dc), C(0x7fdcb0), C(0xfff2dc), C(0xffd25a), C(0xfff2dc)];
    for (let i = 0; i < N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], p = pts[i];
      let tx2 = b.x - a.x, tz2 = b.z - a.z; const tl = hyp(tx2, tz2) || 1; tx2 /= tl; tz2 /= tl;
      const sxn = -tz2, szn = tx2, cc = stripe[Math.floor(i / 2) % 6];
      for (let j = 0; j < M; j++) {
        const th = -PI * 0.62 + (j / (M - 1)) * PI * 1.24, rr = 0.62;
        const ox = Math.sin(th) * rr, oy = -Math.cos(th) * rr;
        pos.push(p.x + sxn * ox, p.y + 0.55 + oy, p.z + szn * ox);
        nor.push(-sxn * Math.sin(th), Math.cos(th), -szn * Math.sin(th));
        col.push(cc.r, cc.g, cc.b);
      }
    }
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const q = i * M + j; idx.push(q, q + M, q + 1, q + 1, q + M, q + M + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const chute = new THREE.Mesh(g, ODAB_CHUTE_MAT || (ODAB_CHUTE_MAT = (() => { const m = rimify(vcMat({ roughness: 0.3, side: THREE.DoubleSide }), 0xffffff, 0.3, 2.5); m.userData.keep = true; return m; })()));
    chute.castShadow = true; chute.receiveShadow = true; chute.name = 'kaydirak'; api.add(chute);
    // kenar boru (beyaz krema) + gofret ayaklar
    for (let i = 0; i < N; i += 1) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
      let tx2 = b.x - a.x, tz2 = b.z - a.z; const tl = hyp(tx2, tz2) || 1; tx2 /= tl; tz2 /= tl;
      for (const sd of [-1, 1]) B.add('cream', G.sphere(7, 5), C(0xfffaf4), [p.x - tz2 * 0.56 * sd, p.y + 0.86, p.z + tx2 * 0.56 * sd], null, [0.13, 0.13, 0.13]);
      if (i % 4 === 2 && p.y > 0.8) B.seg('candy', [p.x, 0, p.z], [p.x, p.y, p.z], 0.13, C(0xe7b062), 0.13, 8);
    }
    // başlangıç halkası
    const ring = new Kit();
    ring.add(G.torus(TAU, 0.12, 16), C(0xffd24a, 1.6), [0, 0.06, 0], [PI / 2, 0, 0], [1, 1, 1]);
    const rm = O.solo(ring, 'glow', api); rm.position.set(sx, 0, sz);
    api.glow(sx, sz, 1.6, 0xffe08a, 0.3);
    api.light(sx, 1.5, sz, 0xffd88a, 1.5, 4.5, 0);
    let rides = 0, pulse = 0;
    api.anim(dt => { pulse += dt; const s = 1 + Math.sin(pulse * 4) * 0.08; rm.scale.set(s, 1, s); });
    R.zones.push({ x: sx, z: sz, r: 6, enter: () => O.say('odb_kaydirak') });
    R.zones.push({ x: sx, z: sz, r: 0.95, enter() {
      if (R.busy() || R.cd > 0) return;
      O.sfx('whoosh', { vol: 0.6 });
      R.ride(pts.map(p => ({ x: p.x, y: p.y + 0.3, z: p.z })), { climb: 0.65, speed: [5, 10.5], onStep: (x, y, z, u) => { if (u > 0.05 && Math.random() < 0.25) O.burst('sparkle', x, y + 0.6, z, { count: 2, color: '#ffd0e0' }); }, onEnd() {
        rides++;
        const e = pts[pts.length - 1];
        O.burst('confetti', e.x, 1, e.z, {}); O.sfx('cheer', { vol: 0.6 });
        if (Math.random() < 0.6) setTimeout(() => O.sfx('bilboBark', { vol: 0.6 }), 350);
        O.coins(e.x, e.z, rides === 1 ? 10 : rides < 4 ? 3 : 1, 1);
        if (rides === 1) O.say('odb_kaydirak_ok', { once: true, gap: 0 }); else if (rides === 3) O.say('odb_kaydirak_tekrar', { once: true, gap: 3 });
        if (rides === 1) { const b = pts[pts.length - 2]; O.goldSugar(api, R, e.x + (e.x - b.x) * 2.2, 0.8, e.z + (e.z - b.z) * 2.2, { sticker: 'gizli_dondurma_kaydiragi' }); }
      } });
    } });
  }
  let ODAB_CHUTE_MAT = null, ICE_PLAIN = null;
  // Kar topu: dokununca buz duvarına yuvarlanır, duvar kırılır, içinden hazine
  function snowball(B, api, R, S) {
    const k = new Kit();
    k.add(G.sphere(18, 12), C(0xffffff), [0, 0, 0], null, [1, 1, 1]);
    for (let i = 0; i < 14; i++) { const a = i * 2.4, b = i * 1.1; k.add(G.sphere(7, 5), C(0xeaf6ff), [Math.sin(a) * Math.cos(b) * 0.9, Math.sin(b) * 0.9, Math.cos(a) * Math.cos(b) * 0.9], null, [0.28, 0.2, 0.28]); }
    const ball = O.solo(k, 'snow', api, true); const rad = 0.95; ball.position.set(S.x, rad, S.z); ball.scale.setScalar(rad);
    // buz duvarı / iglo: buz bloklarından kubbe, içinde parlayan hazine
    const ig = new Kit(), ix = S.ix, iz = S.iz;
    for (let ring = 0; ring < 3; ring++) {
      const n = 9 - ring * 2, rr = 1.9 - ring * 0.55, y = 0.5 + ring * 0.85;
      for (let i = 0; i < n; i++) { const a = i / n * TAU + ring * 0.3; ig.add(G.rbox(2), C(ring % 2 ? 0xc8eaff : 0xdaf2ff), [Math.sin(a) * rr, y, Math.cos(a) * rr], [0, a, 0], [0.95, 0.85, 0.7]); }
    }
    ig.add(G.sphere(11, 8), C(0xe4f6ff), [0, 2.75, 0], null, [0.6, 0.45, 0.6]);
    const igloo = O.solo(ig, 'ice', api); igloo.position.set(ix, 0, iz);
    const inner = new Kit();
    inner.add(G.sphere(11, 8), C(0xffd36a, 2.2), [0, 0.8, 0], null, [0.55, 0.45, 0.55]);
    const glowIn = O.solo(inner, 'glow', api); glowIn.position.set(ix, 0, iz);
    const chest = O.goldCandy(); chest.position.set(ix, 1.0, iz); api.add(chest);
    api.light(ix, 1.4, iz, 0xffd88a, 2.2, 5, 0.1);
    api.glow(ix, iz, 2.6, 0xffe4a0, 0.2);
    // yuvarlanma izi (karda çizgi) – önceden çizilmez; yuvarlanınca kar tozu
    const st = { state: 'wait', t: 0, x: S.x, z: S.z, v: 0 };
    const hr = new Kit(); hr.add(G.torus(TAU, 0.08, 36), C(0x9ae8ff, 1.6), [0, 0.05, 0], [PI / 2, 0, 0], [1.35, 1.35, 1.35]);
    const hint = O.solo(hr, 'glow', api); hint.position.set(S.x, 0, S.z);
    let wob = 0;
    api.anim(dt => { if (st.state !== 'wait') { hint.visible = false; return; } wob += dt; ball.rotation.z = Math.sin(wob * 2.2) * 0.05; const s2 = 1 + Math.sin(wob * 3) * 0.06; hint.scale.set(s2, 1, s2); });
    R.zones.push({ x: S.x, z: S.z, r: 6.5, enter: () => { if (st.state === 'wait') O.say('odb_kartopu'); } });
    R.zones.push({ x: S.x, z: S.z, r: rad + 0.42 + 0.35, enter() {
      if (st.state !== 'wait') return;
      st.state = 'roll'; st.v = 1.5; if (S.solid) S.solid.alive = false;
      if (GAME.L) GAME.L._sh = null;
      O.sfx('roll', { x: S.x, z: S.z, vol: 0.8 }); O.burst('ice', S.x, 0.4, S.z, { count: 10 });
    } });
    api.anim(dt => {
      chest.userData.spin.rotation.y += dt * 1.5;
      if (st.state !== 'roll') return;
      st.t += dt; st.v = Math.min(5.2, st.v + dt * 5);
      const dx = S.ex - st.x, dz = S.ez - st.z, d = hyp(dx, dz);
      const step = Math.min(d, st.v * dt);
      st.x += dx / (d || 1) * step; st.z += dz / (d || 1) * step;
      const grow = 1 + st.t * 0.08;
      ball.position.set(st.x, rad * grow, st.z); ball.scale.setScalar(rad * grow);
      ball.rotateOnWorldAxis(new THREE.Vector3(dz / (d || 1), 0, -dx / (d || 1)), step / (rad * grow));
      if (Math.random() < 0.5) O.burst('ice', st.x, 0.2, st.z, { count: 2 });
      if (d < 0.05) {   // çarptı!
        st.state = 'done';
        ball.visible = false; igloo.visible = false; glowIn.visible = false;
        O.burst('ice', ix, 1.2, iz, { count: 40 }); O.burst('confetti', ix, 1.5, iz, {}); O.burst('star', ix, 1.4, iz, { count: 12 });
        O.fx('shake', 0.25); O.sfx('slam', { vol: 0.6, pitch: 1.4 }); O.sfx('chest', { vol: 0.8 });
        O.coins(ix - S.dx * 1.2, iz - S.dz * 1.2, 14, 1.2);
        chest.position.set(ix - S.dx * 2.2, 0.9, iz - S.dz * 2.2);
        O.goldSugar(api, R, chest.position.x, 0.9, chest.position.z, { sticker: 'gizli_buz_iglo' }).obj.visible = true;
        chest.visible = false;
        O.say('odb_kartopu_ok', { gap: 0 });
      }
    });
  }
  // Tokanın gizli yeri: parlayan küçük kar tümseği; Feza (ya da Bilbo) yaklaşınca Bilbo kazar, toka zıplar
  function tokaMound(api, R, K) {
    const k = new Kit();
    k.add(G.sphere(14, 10), C(0xffffff), [0, 0, 0], null, [1.0, 0.45, 1.0]);
    k.add(G.sphere(10, 7), C(0xeaf6ff), [0.4, 0.15, 0.2], null, [0.45, 0.25, 0.45]);
    const mound = O.solo(k, 'snow', api); mound.position.set(K.x, 0, K.z);
    const tk = new Kit();   // pembe mandal toka
    tk.add(G.torus(PI * 1.1, 0.28, 18), C(0xff6fa8), [0, 0, 0], [0, 0, 0], [0.32, 0.32, 0.32]);
    for (let i = 0; i < 3; i++) tk.add(G.sphere(8, 6), C([0xffd24a, 0xffffff, 0x8fd8ff][i]), [-0.18 + i * 0.18, 0.3, 0.06], null, [0.07, 0.07, 0.07]);
    const toka = O.solo(tk, 'candy', api); toka.position.set(K.x + 0.15, 0.35, K.z + 0.1); toka.rotation.set(0.6, 0.4, 0.3);
    api.light(K.x, 0.8, K.z, 0xffb8d8, 1.2, 3.5, 0.2);
    let tw = 0;
    api.anim(dt => { tw += dt; if (!K.found && Math.random() < dt * 2) O.burst('sparkle', K.x + (Math.random() - 0.5), 0.4, K.z + (Math.random() - 0.5), { count: 1, color: '#ffc0e0' }); });
    R.zones.push({ x: K.x, z: K.z, r: 7, enter: () => { if (!K.found && !(GAME.P.kayipEsyalar && GAME.P.kayipEsyalar.buzdolabi)) O.say('odb_toka'); } });
    R.zones.push({ x: K.x, z: K.z, r: 2.6, enter() {
      if (K.found || K._bilbo) return;   // (Bilbo ajanı kendi kazma davranışını kurduysa K._bilbo = true yapar)
      K.found = true;
      O.sfx('dig', { x: K.x, z: K.z }); O.sfx('bilboBark', { vol: 0.7 });
      O.burst('ice', K.x, 0.4, K.z, { count: 18 }); O.burst('dirt', K.x, 0.2, K.z, { color: '#ffffff' });
      let t = 0;
      api.anim(dt => {
        if (t > 1.6) return; t += dt;
        mound.scale.setScalar(Math.max(0.01, 1 - t * 0.8));
        toka.position.y = 0.35 + Math.sin(Math.min(1, t / 1.2) * PI) * 1.6 + Math.min(1, t / 1.2) * 0.4; toka.rotation.y += dt * 9;
        if (t > 1.2 && !K.done) { K.done = true; O.burst('star', K.x, 1, K.z, { count: 12 }); toka.visible = false; if (GAME.foundLostItem) GAME.foundLostItem('toka', 'buzdolabi'); }
      });
    } });
  }

  // (QA: modelleri yakından incelemek için)
  ODAB.models = Object.assign(ODAB.models || {}, { milkBottle, yogurt, strawberry, jelloMold, fruitBowl, berry, iceBlock, peasBag, snowMound, frost, cone });
  BOLUM.define('buzdolabi', {
    ad: 'Buzdolabı',
    taban: 'moon',   // yumuşak kar dokusu + kenarda buz kayalıkları ("buzul"); ayın koyu uzay zemini kur()'da kapatılır
    size: 90, side: 2,
    areas: [{ id: 'a1', ad: 'Raf Buzulları', rooms: 2 }, { id: 'a2', ad: 'Jöle Tepeleri', rooms: 2 }, { id: 'a3', ad: 'Dondurucu Kapısı', rooms: 2 }],
    muzik: 'magara',
    malzeme: 'cilek', kayipEsya: 'toka',
    isik: { fog: [0xc6e3f6, 42, 104], hemiSky: 0xf0faff, hemiGround: 0x9ab8d0, hemi: 0.62, sunColor: 0xfff4e6, sun: 1.9, sunOffset: [-12, 26, 14],
      env: [0xd6efff, 0xfff0e8, 0x9ab8d0, 0.62], bloom: 0.22, exposure: 0.98, fezaLight: 0, sat: 1.06, vig: 0.2, moss: [0xc7e4f4, 0], rim: [0xf0faff, 0.22] },
    zemin: { tA: 0xeaf5fc, tB: 0xdcedf9, tC: 0xf6fbff, out: 0x9cc8e6, outAmt: 0.7, macro: 0xf2f9ff },
    minimap: { zemin: '#cfe8f7' },
    harita: { ad: 'Buzdolabı', detay: 'Buz pisti, jöle tepeleri, dondurma kaydırağı', renk: '#9fd6ef', x: 76, y: 70, simge: '🧊' },
    yerlesim, kur,
    // çıkış kapısı (portal) buzlansın: taş kemer → yarı saydam buz blokları, üstünde kar, sarkıtlar
    kurSon(L, api) {
      // kırılabilir sandık/fıçı/vazolar buzdolabında donmuş görünsün (buz kaplı)
      if (!ICE_PLAIN) { ICE_PLAIN = rimify(new THREE.MeshStandardMaterial({ color: 0xd2ecff, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.88, emissive: new THREE.Color(0x2a5a8a), emissiveIntensity: 0.25 }), 0xf0fcff, 0.9, 2.0); ICE_PLAIN.userData.keep = true; }
      if (L.group) L.group.traverse(o => { if (o.isInstancedMesh && /^break-/.test(o.name || '')) { o.material = ICE_PLAIN; } });
      const po = L.portalObj; if (!po || !po.obj) return;
      const g = po.obj;
      const arch = g.children.find(o => o.isMesh && o.geometry && o.geometry.attributes.color && !o.material.isShaderMaterial && o.material.vertexColors);
      if (arch) {
        const c = arch.geometry.attributes.color;
        for (let i = 0; i < c.count; i++) { const v = 0.5 + 0.5 * (c.getX(i) + c.getY(i) + c.getZ(i)) / 3; c.setXYZ(i, 0.72 * v + 0.2, 0.86 * v + 0.12, 1.0); }
        c.needsUpdate = true; arch.material = O.mat('ice'); arch.castShadow = false;
      }
      const k = new Kit();
      for (let n = 0; n <= 10; n++) { const a = n / 10 * PI; k.add(G.sphere(8, 6), C(0xffffff), [Math.cos(a) * 1.65, 2.3 + Math.sin(a) * 1.65 + 0.38, 0], null, [0.42, 0.24, 0.5]); }
      for (const sx of [-1, 1]) k.add(G.sphere(8, 6), C(0xffffff), [sx * 1.58, 2.35, 0], null, [0.5, 0.2, 0.5]);
      const snow = new THREE.Mesh(k.build(), O.mat('snow')); g.add(snow);
      const ic = new Kit();
      for (let n = 1; n < 10; n++) { const a = n / 10 * PI, l = 0.35 + (n % 3) * 0.18; ic.add(G.cone(6), C(0xd4f0ff), [Math.cos(a) * 1.3, 2.3 + Math.sin(a) * 1.3 - l / 2, 0.3], [PI, 0, 0], [0.08, l, 0.08]); }
      g.add(new THREE.Mesh(ic.build(), O.mat('ice')));
    },
  });
})();
