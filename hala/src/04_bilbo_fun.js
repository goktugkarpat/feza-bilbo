/* Bilbo oyunları: binme, kayıp eşya kazma, hapşırma (BILBO_FUN).
   07_game her kare çağırır: step(dt, c) → null ya da Bilbo'nun yerini/yönünü belirleyen OUT; pose(st, c) → model durumuna
   happy/sniff/dig/ride ekler; heroLift(c) → Feza'nın sırt yüksekliği. c = 07_game'in tek, yeniden kullanılan bağlam nesnesi
   (P, L, Bilbo, pos, follow, zone, state, t, heroVel, api (HALA_API), speaking, ftext, shake, foundLostItem, recalcStats, push). */
const BILBO_FUN = (() => {
  'use strict';
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ease = u => { u = clamp01(u); return u * u * (3 - 2 * u); };
  const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  const OUT = { x: 0, z: 0, face: 0, speed: 0, hop: 0 };
  const RIDE = { mul: 1.25, mount: .32 };   // 5.2 m/s × 1.25 ≈ 6.5 m/s
  const LOST = { notice: 7, calm: 5, sniff: 1.35, dig: 1.7, fly: .75, show: 2.6, giveUp: 7 };
  let ride = null, rideK = 0, lift = 0, lost = null, lastL = null, item = null, timers = [], happyAt = 0, happyOn = false;
  let prevX = 0, prevZ = 0, measured = 0, overriding = false, lastFace = 0, hooked = false, lastC = null;
  const _v = new THREE.Vector3();

  // ── küçük yardımcılar ──
  const api = c => c.api || {};
  function sfx(c, n, o) { const a = api(c); if (a.sfx) a.sfx(n, o); }
  function burst(c, k, x, y, z, o) { const a = api(c); if (a.burst) a.burst(k, x, y, z, o); }
  function fx(c, n, a1, a2, a3, a4) { const a = api(c); if (a.fx) a.fx(n, a1, a2, a3, a4); }
  function sayLine(c, key, prio = 1) {
    const a = api(c);
    if (!a.say || (c.speaking && c.speaking())) return false;
    a.say(key, prio); return true;
  }
  function express(c, kind, secs) { const H = c.H; if (H && typeof H.express === 'function') { try { H.express(kind, secs); } catch (err) { /* cosmetic */ } } }
  function later(c, s, fn) { timers.push({ at: c.t + s, fn }); }
  function runTimers(c) {
    for (let i = timers.length - 1; i >= 0; i--) if (c.t >= timers[i].at) { const f = timers[i].fn; timers.splice(i, 1); try { f(); } catch (err) { console.warn('BILBO_FUN', err); } }
  }
  function noseWorld(c) {
    const B = c.Bilbo;
    if (B && B.mouthAnchor) return B.mouthAnchor.getWorldPosition(_v);
    return _v.set(c.pos.x, .5, c.pos.z);
  }
  function enemyNear(c, x, z, r) { const a = api(c); return a.nearestEnemy ? a.nearestEnemy(x, z, r) : null; }

  // ── Bilbo'ya binme ──
  function setRide(on, secs, c) {
    if (!c || !c.P) return false;
    if (!on) { if (ride) endRide(c, false); return true; }
    if (c.state !== 'play' || c.P.dead || !c.Bilbo) return false;   // normal savaşta ve boss karşısında da binilebilir
    abortDig(c, 2);
    if (ride) { ride.dur = Math.max(ride.dur - ride.t, secs || 14); ride.t = 0; return true; }
    ride = { t: 0, dur: secs || 14, puff: 0, end: 0, area: c.P.area };
    c.P.rideMul = RIDE.mul; if (c.recalcStats) c.recalcStats();
    if (c.Bilbo.clearActions) c.Bilbo.clearActions();
    sfx(c, 'bilboBark', { x: c.P.pos.x, z: c.P.pos.z, vol: 1, pitch: 1.1 }); sfx(c, 'whoosh', { vol: .6 });
    burst(c, 'dust', c.P.pos.x, .2, c.P.pos.z, { count: 10 });
    burst(c, 'star', c.P.pos.x, 1.4, c.P.pos.z, { count: 8, color: '#ffe680' });
    if (c.ftext) c.ftext(c.P.pos.x, 2.4, c.P.pos.z, 'Vuuş!', 'word');
    express(c, 'sevinc', 2.5);
    sayLine(c, 'bilbo_bin', 2);
    return true;
  }
  function endRide(c, quiet, silent) {
    if (!ride) return;
    ride = null;
    if (c.P) { c.P.rideMul = 1; if (c.recalcStats) c.recalcStats(); }
    // Bilbo hops off to Feza's side; the follow path starts fresh from there.
    const P = c.P, f = P ? P.face : 0, a = api(c);
    let x = c.pos.x, z = c.pos.z;
    if (P) for (const side of [1, -1, 0]) {
      const tx = P.pos.x + Math.cos(f) * 1.1 * side - Math.sin(f) * (side ? .2 : 1.1), tz = P.pos.z - Math.sin(f) * 1.1 * side - Math.cos(f) * (side ? .2 : 1.1);
      if (!a.circleFree || a.circleFree(tx, tz, .34)) { x = tx; z = tz; break; }
    }
    c.pos.x = x; c.pos.z = z;
    if (c.follow && P) c.follow.reset(P.pos, x, z, f);
    if (!quiet) {   // sevimli iniş: Feza hop diye yere atlar, toz + yıldız
      burst(c, 'dust', x, .15, z, { count: 8 }); sfx(c, 'pop', { vol: .5 });
      if (P) { burst(c, 'star', P.pos.x, 1.2, P.pos.z, { count: 6, color: '#ffe680' }); if (c.ftext) c.ftext(P.pos.x, 2.2, P.pos.z, 'Hop!', 'word'); express(c, 'sevinc', 1.2); }
      if (!silent) sayLine(c, 'bilbo_in', 1);
    }
  }
  function rideStep(dt, c) {
    const P = c.P;
    ride.t += dt;
    if (P.dead || c.state !== 'play' || ride.t >= ride.dur) { endRide(c, c.state !== 'play'); return null; }
    // Başka bir alana geçince biniş biter; savaşlar binişi durdurmaz.
    if (ride.area !== P.area) { if (ride.area === undefined || ride.area < 0) ride.area = P.area; else { endRide(c, false, false); return null; } }
    const f = P.face, back = .10 * (c.scale || .78);
    OUT.x = P.pos.x + Math.sin(f) * back; OUT.z = P.pos.z + Math.cos(f) * back; OUT.face = f; OUT.hop = 0;
    OUT.speed = Math.min(8, Math.max(0, c.heroVel || measured) / (c.scale || .78) * .8);
    // Dust puffs from the paws while running, a joyful bark now and then.
    ride.puff -= dt;
    if (ride.puff <= 0 && OUT.speed > 1.5) {
      ride.puff = .14;
      const s = Math.random() < .5 ? -1 : 1;
      burst(c, 'step', OUT.x - Math.sin(f) * .5 + Math.cos(f) * .2 * s, .05, OUT.z - Math.cos(f) * .5 - Math.sin(f) * .2 * s, { count: 2 });
    }
    if (ride.t > 1 && Math.random() < dt * .12 && OUT.speed > 2) {
      sfx(c, 'bilboBark', { x: OUT.x, z: OUT.z, vol: .7, pitch: 1.15 });
      if (c.ftext && Math.random() < .5) c.ftext(OUT.x, 2.3, OUT.z, 'Vuuş!', 'word');
    }
    return OUT;
  }
  // Feza'nın sırttaki yüksekliği (07_game updateHero): { k: 0..1, y }
  const LIFT = { k: 0, y: 0 };
  function heroLift(c, dt) {
    rideK = Math.max(0, Math.min(1, rideK + (ride ? 1 : -1) * (dt || 0) / RIDE.mount));
    if (rideK <= 0) { lift = 0; return null; }
    const B = c.Bilbo;
    let y = .84;
    if (B && B.saddle) { B.saddle.getWorldPosition(_v); y = _v.y; }
    const k = ease(rideK);
    LIFT.k = k; LIFT.y = y * k + .55 * Math.sin(Math.PI * rideK) * (rideK < 1 ? 1 : 0);
    lift = LIFT.y;
    return LIFT;
  }

  // ── Kayıp eşya: yer seçimi, ipucu tümseği, kokla-kaz-bul ──
  let moundGeo = null, moundMat = null, sparkGeo = null, sparkMat = null;
  function moundAssets() {
    if (moundGeo) return;
    moundGeo = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    moundMat = new THREE.MeshStandardMaterial({ color: 0xe9d6b8, roughness: 1, emissive: 0x6a5530, emissiveIntensity: .18 });
    sparkGeo = new THREE.OctahedronGeometry(1, 0);
    sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
  }
  function makeMound(scene, x, z) {
    moundAssets();
    const g = new THREE.Group(); g.name = 'Bilbo lost-item mound'; g.position.set(x, 0, z);
    const lumps = [[0, 0, .42, .16, .36], [.27, .1, .2, .09, .2], [-.24, -.12, .22, .1, .19], [.05, -.3, .17, .07, .15]];
    for (const [lx, lz, sx, sy, sz] of lumps) { const m = new THREE.Mesh(moundGeo, moundMat); m.position.set(lx, 0, lz); m.scale.set(sx, sy, sz); m.receiveShadow = true; g.add(m); }
    const sp = new THREE.Mesh(sparkGeo, sparkMat); sp.scale.set(.05, .1, .05); sp.position.set(.05, .3, 0); g.add(sp);
    g.userData.spark = sp;
    scene.add(g); return g;
  }
  function removeMound() {
    if (lost && lost.mound) { if (lost.mound.parent) lost.mound.parent.remove(lost.mound); lost.mound = null; }
  }
  function spotOK(c, L, x, z) {
    const a = api(c);
    if (a.isFloor && !a.isFloor(x, z)) return false;
    if (a.circleFree && !a.circleFree(x, z, 1.0)) return false;
    const far = (o, r) => !o || dist(o.x, o.z, x, z) > r;
    if (!far(L.exit, 3) || !far(L.start, 4)) return false;
    for (const s of L.stations || []) if (!far(s, 2.5)) return false;
    for (const s of L.checkpoints || []) if (!far(s, 2)) return false;
    return true;
  }
  function pickSpot(c, L) {
    const rooms = L.rooms || [], main = [];
    for (let i = 0; i < rooms.length; i++) if (rooms[i] && rooms[i].kind === 'main') main.push(i);
    if (!main.length) return null;
    // Mid / late main rooms first (never the start room or the boss arena), deterministic offsets.
    const order = main.slice().sort((a, b) => Math.abs(main.indexOf(a) / main.length - .62) - Math.abs(main.indexOf(b) / main.length - .62));
    for (const ri of order) {
      const R = rooms[ri], r = R.r || 5;
      for (let k = 0; k < 14; k++) {
        const ang = k * 2.39996 + ri * .7, rad = r * (k < 7 ? .42 : k < 11 ? .25 : .6);
        const x = R.x + Math.sin(ang) * rad, z = R.z + Math.cos(ang) * rad;
        if (spotOK(c, L, x, z)) return { x, z };
      }
    }
    return null;
  }
  function setupLevel(c) {
    lastL = c.L; removeMound(); lost = null;
    const L = c.L, Z = c.zone, P = c.P;
    if (!L || !Z || Z.hub || !Z.kayipEsya || !P) return;
    if (P.kayipEsyalar && P.kayipEsyalar[Z.id]) return;
    let s = L.lostSpot || (Array.isArray(L.lostSpots) && L.lostSpots[0]) || null;
    if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.z)) s = pickSpot(c, L);
    if (!s) return;
    const scene = c.Bilbo && c.Bilbo.root.parent;
    lost = { x: s.x, z: s.z, id: s.id || Z.kayipEsya, zone: Z.id, phase: 'wait', t: 0, wait: 0, mound: scene ? makeMound(scene, s.x, s.z) : null, sp: 0, plan: null, planAt: 0 };
  }
  function abortDig(c, cool) {
    if (!lost || lost.phase === 'wait' || lost.phase === 'done') return;
    lost.phase = 'wait'; lost.wait = cool || 4; lost.t = 0;
    if (overriding && c.follow && c.P) c.follow.reset(c.P.pos, c.pos.x, c.pos.z, lastFace);
  }
  function calm(c) {
    const P = c.P;
    calm.why = c.state !== 'play' ? 'state' : P.dead ? 'dead' : ride ? 'ride' : c.busy && c.busy() ? 'busy'
      : enemyNear(c, P.pos.x, P.pos.z, LOST.calm) ? 'enemy' : c.Bilbo.isFetching && c.Bilbo.isFetching() ? 'fetch'
      : c.follow && c.follow.isPouncing && c.follow.isPouncing() ? 'pounce' : '';
    return !calm.why;
  }
  function lostStep(dt, c) {
    const P = c.P, l = lost;
    if (l.mound) {   // the hint: a gentle shimmer on the fluff mound + an occasional sparkle
      const sp = l.mound.userData.spark; l.sp += dt;
      sp.rotation.y += dt * 2.2; sp.position.y = .3 + .06 * Math.sin(l.sp * 2.4);
      sp.material.opacity = .55 + .35 * Math.sin(l.sp * 3.1);
      if (l.sp > 1.4 && dist(P.pos.x, P.pos.z, l.x, l.z) < 22) { l.sp = 0; burst(c, 'sparkle', l.x + (Math.random() - .5) * .5, .35, l.z + (Math.random() - .5) * .5, { count: 2 }); }
    }
    if (l.phase === 'wait') {
      l.wait = Math.max(0, l.wait - dt);
      if (l.wait <= 0 && dist(P.pos.x, P.pos.z, l.x, l.z) < LOST.notice && calm(c)) {
        l.phase = 'go'; l.t = 0; l.plan = null; l.planAt = 0;
        sfx(c, 'bilboBark', { x: c.pos.x, z: c.pos.z, vol: .9, pitch: 1.1 });
        if (c.ftext) c.ftext(c.pos.x, 2.0, c.pos.z, 'Hav!', 'word');
        sayLine(c, 'bilbo_kokla', 1);
      }
      return null;
    }
    if (l.phase === 'done') return null;
    if (l.phase !== 'pop' && !calm(c)) { l.why = calm.why; abortDig(c, 4); return null; }
    l.t += dt;
    const a = api(c);
    // Where Bilbo stands: his nose (≈ .45 m ahead of the body centre) over the spot.
    const dx = l.x - c.pos.x, dz = l.z - c.pos.z, d = Math.hypot(dx, dz);
    if (l.phase === 'go') {
      const reach = .42;
      if (d <= reach + .06 || l.t > LOST.giveUp) { l.phase = 'sniff'; l.t = 0; }
      else {
        let tx = l.x, tz = l.z;
        if (a.los && !a.los(c.pos.x, c.pos.z, l.x, l.z)) {
          if (!l.plan || c.t >= l.planAt) { l.plan = a.routeTo ? a.routeTo(l.x, l.z, { x: c.pos.x, z: c.pos.z }) || [] : []; l.planAt = c.t + .8; }
          while (l.plan.length && dist(c.pos.x, c.pos.z, l.plan[0].x, l.plan[0].z) < .3) l.plan.shift();
          if (l.plan.length) { tx = l.plan[0].x; tz = l.plan[0].z; }
        }
        const ex = tx - c.pos.x, ez = tz - c.pos.z, ed = Math.hypot(ex, ez) || 1;
        const sp = Math.min(4.6, 1.2 + d * 2.2), step = Math.min(sp * dt, Math.max(0, d - reach));
        const ox = c.pos.x, oz = c.pos.z;
        if (a.moveXZ) a.moveXZ(c.pos, ex / ed * step, ez / ed * step, .34); else { c.pos.x += ex / ed * step; c.pos.z += ez / ed * step; }
        lastFace = Math.atan2(ex, ez);
        OUT.speed = dt > 0 ? Math.hypot(c.pos.x - ox, c.pos.z - oz) / dt : 0;
      }
    } else OUT.speed = 0;
    OUT.x = c.pos.x; OUT.z = c.pos.z; OUT.hop = 0;
    if (l.phase !== 'go' && d > .05) lastFace = Math.atan2(dx, dz);
    OUT.face = lastFace;
    if (l.phase === 'sniff') {
      l.puff = (l.puff || 0) - dt;
      if (l.puff <= 0) { l.puff = .32; const n = noseWorld(c); burst(c, 'dust', n.x, .12, n.z, { count: 2, scale: .5 }); }
      if (l.t >= LOST.sniff) {
        l.phase = 'dig'; l.t = 0; l.puff = 0;
        sfx(c, 'bilboBark', { x: c.pos.x, z: c.pos.z, vol: 1, pitch: 1.2 });
        later(c, .28, () => sfx(c, 'bilboBark', { x: c.pos.x, z: c.pos.z, vol: .8, pitch: 1.25 }));
        if (c.ftext) c.ftext(c.pos.x, 2.0, c.pos.z, 'Hav hav!', 'word');
      }
    } else if (l.phase === 'dig') {
      l.puff = (l.puff || 0) - dt;
      if (l.puff <= 0) {
        l.puff = .09;
        const f = lastFace, bx = l.x - Math.sin(f) * .2, bz = l.z - Math.cos(f) * .2;
        burst(c, 'debris', bx, .15, bz, { count: 3, color: Math.random() < .5 ? '#e9d6b8' : '#c9a77c', dir: { x: -Math.sin(f), z: -Math.cos(f) } });
        if (Math.random() < .35) burst(c, 'dust', bx, .1, bz, { count: 1 });
      }
      l.dg = (l.dg || 0) - dt; if (l.dg <= 0) { l.dg = .42; sfx(c, 'dig', { x: l.x, z: l.z, vol: .6 }); }
      if (l.mound) { const k = 1 - .65 * ease(l.t / LOST.dig); l.mound.scale.set(1 + .25 * (1 - k), k, 1 + .25 * (1 - k)); }
      if (l.t >= LOST.dig) popItem(c);
    } else if (l.phase === 'pop') {
      return null;   // Bilbo is free again (the item flies on its own)
    }
    return OUT;
  }
  function popItem(c) {
    const l = lost; l.phase = 'pop'; l.t = 0;
    removeMound();
    const scene = c.Bilbo && c.Bilbo.root.parent;
    const P = c.P;
    sfx(c, 'dropRare', { x: l.x, z: l.z, vol: .8 }); sfx(c, 'pop', { vol: .6 });
    burst(c, 'sparkle', l.x, .4, l.z, { count: 14 }); burst(c, 'debris', l.x, .2, l.z, { count: 8, color: '#e9d6b8' });
    if (c.ftext) c.ftext(l.x, 1.8, l.z, 'Buldu!', 'word');
    express(c, 'saskin', 1.2); later(c, 1.3, () => express(c, 'sevinc', 2));
    if (c.follow) c.follow.reset(P.pos, c.pos.x, c.pos.z, lastFace);
    const mesh = scene ? buildItem(l.id) : null;
    if (mesh) scene.add(mesh);
    // Lands beside Feza (not on Bilbo's path back to him), a little toward the camera (+z) so it is seen.
    const fx0 = l.x - P.pos.x, fz0 = l.z - P.pos.z, fl = Math.hypot(fx0, fz0) || 1, a = api(c);
    let tx = P.pos.x, tz = P.pos.z + .9;
    for (const s of [1, -1]) {
      const x = P.pos.x - fz0 / fl * 1.15 * s, z = P.pos.z + fx0 / fl * 1.15 * s + .45;
      if (!a.circleFree || a.circleFree(x, z, .3)) { tx = x; tz = z; break; }
    }
    item = { mesh, from: new THREE.Vector3(l.x, .3, l.z), to: new THREE.Vector3(tx, .55, tz), t: 0, id: l.id, zone: l.zone, landed: false };
    if (mesh) mesh.position.copy(item.from);
  }
  function itemStep(dt, c) {
    const it = item; it.t += dt;
    const m = it.mesh;
    if (!it.landed) {
      const u = clamp01(it.t / LOST.fly);
      if (m) { m.position.lerpVectors(it.from, it.to, u); m.position.y += Math.sin(Math.PI * u) * 1.6; m.rotation.set(0, it.t * 9, Math.sin(it.t * 7) * .4); m.scale.setScalar(.5 + .5 * ease(u * 1.4)); }
      if (u >= 1) {
        it.landed = true; it.t = 0;
        burst(c, 'sparkle', it.to.x, .7, it.to.z, { count: 18 }); burst(c, 'star', it.to.x, .9, it.to.z, { count: 8, color: '#ffe680' });
        fx(c, 'ring', it.to.x, it.to.z, { r0: .2, r1: 1.6, dur: .5, color: '#ffe397', width: .25 });
        sfx(c, 'chest', { x: it.to.x, z: it.to.z, vol: .8 });
        let ok = false;
        try { ok = c.foundLostItem ? c.foundLostItem(it.id, it.zone) : false; } catch (err) { console.warn('foundLostItem', err); }
        if (lost) lost.phase = 'done';
        const key = 'bilbo_buldu_' + it.id, a = api(c);
        later(c, .35, () => { if (ok !== false) sayLine(c, a.hasLine && a.hasLine(key) ? key : 'bilbo_buldu', 2); });
      }
    } else {
      if (m) {
        m.position.set(it.to.x, it.to.y + .12 * Math.sin(it.t * 3.4) + .1 * ease(it.t * 2), it.to.z);
        m.rotation.set(-.15, .55 * Math.sin(it.t * 1.8), 0);   // keeps facing the camera (+z), gently swaying
        if (it.t > LOST.show - .4) m.scale.setScalar(Math.max(.01, (LOST.show - it.t) / .4));
      }
      it.sp = (it.sp || 0) - dt;
      if (it.sp <= 0) { it.sp = .35; burst(c, 'sparkle', it.to.x, it.to.y + .2, it.to.z, { count: 2 }); }
      if (it.t >= LOST.show) { burst(c, 'sparkle', it.to.x, it.to.y, it.to.z, { count: 16 }); sfx(c, 'pop', { vol: .5, pitch: 1.3 }); dropItem(); }
    }
  }
  function dropItem() {
    if (!item) return;
    const m = item.mesh; item = null;
    if (!m) return;
    if (m.parent) m.parent.remove(m);
    m.traverse(o => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(x => x.dispose()); } });
  }

  // ── Eşya modelleri (gözlük, anahtar, toka, yedek: hediye kutusu) ──
  function buildItem(id) {
    const g = new THREE.Group(); g.name = 'Lost item ' + id;
    const M = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .45 }, o || {}));
    const add = (geo, mat, p, s, r) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; if (p) m.position.set(...p); if (s) m.scale.set(...s); if (r) m.rotation.set(...r); g.add(m); return m; };
    if (id === 'gozluk') {   // Aytuğ Hala's red-framed glasses
      const red = M(0xe0283a, { roughness: .3 }), glass = M(0xcfeaff, { roughness: .05, transparent: true, opacity: .45, metalness: .1 });
      for (const s of [-1, 1]) {
        add(new THREE.TorusGeometry(.13, .026, 10, 28), red, [s * .16, 0, 0], [1.1, .9, 1]);
        add(new THREE.CircleGeometry(.13, 24), glass, [s * .16, 0, -.004], [1.1, .9, 1]);
        add(new THREE.BoxGeometry(.025, .025, .32), red, [s * .31, .03, -.16]);
      }
      add(new THREE.TorusGeometry(.04, .02, 6, 12, Math.PI), red, [0, .04, 0]);
      g.scale.setScalar(1.2);
    } else if (id === 'anahtar') {   // golden key with a heart bow
      const gold = M(0xffc53d, { metalness: .6, roughness: .28, emissive: 0x6b4a00, emissiveIntensity: .3 });
      const h = new THREE.Shape(); h.moveTo(0, -.12); h.bezierCurveTo(-.2, .0, -.14, .17, 0, .08); h.bezierCurveTo(.14, .17, .2, 0, 0, -.12);
      const hole = new THREE.Path(); hole.absarc(0, .02, .035, 0, Math.PI * 2, true); h.holes.push(hole);
      add(new THREE.ExtrudeGeometry(h, { depth: .04, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 2, curveSegments: 10 }), gold, [0, .2, -.02]);
      add(new THREE.CylinderGeometry(.024, .024, .34, 10), gold, [0, -.08, 0]);
      add(new THREE.BoxGeometry(.08, .035, .04), gold, [.045, -.2, 0]); add(new THREE.BoxGeometry(.06, .035, .04), gold, [.035, -.13, 0]);
      add(new THREE.SphereGeometry(.03, 10, 8), gold, [0, -.25, 0]);
      g.scale.setScalar(1.25);
    } else if (id === 'toka') {   // pink hair clip with a flower
      const pink = M(0xff7ab8, { roughness: .35 }), white = M(0xffffff, { roughness: .5 }), yel = M(0xffd23a, { roughness: .5 });
      add(new THREE.CapsuleGeometry(.04, .32, 6, 12), pink, null, [1, 1, .6], [0, 0, Math.PI / 2]);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(new THREE.SphereGeometry(.06, 12, 10), i % 2 ? white : pink, [.08 + Math.cos(a) * .07, Math.sin(a) * .07, .04], [1, 1, .45]); }
      add(new THREE.SphereGeometry(.04, 12, 10), yel, [.08, 0, .07]);
      g.scale.setScalar(1.3);
    } else {   // generic: a little gift box
      const box = M(0x7ec8ff), rib = M(0xff5f8f);
      add(new THREE.BoxGeometry(.28, .24, .28), box);
      add(new THREE.BoxGeometry(.29, .245, .06), rib); add(new THREE.BoxGeometry(.06, .245, .29), rib);
      for (const s of [-1, 1]) add(new THREE.TorusGeometry(.05, .018, 6, 14), rib, [s * .05, .15, 0], null, [0, 0, s * .6]);
    }
    return g;
  }

  // ── Hapşırma sesi: WebAudio ile sentezlenir, AUD.sfx üzerinden çalar (?sessiz / ses kapalıyken hiç çalmaz) ──
  const noiseBufs = new WeakMap();
  function noiseBuf(c) {
    let b = noiseBufs.get(c);
    if (!b) { b = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noiseBufs.set(c, b); }
    return b;
  }
  function env(c, o, t, a, hold, rel, vol) {
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.setValueAtTime(vol, t + a + hold);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + hold + rel); g.connect(o); return g;
  }
  // Breathy noise through a band-pass whose centre glides (f0 → f1): the "h", "ş" and the whoosh of air.
  function hiss(c, o, t, dur, vol, type, f0, f1, q) {
    const s = c.createBufferSource(); s.buffer = noiseBuf(c);
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = env(c, o, t, Math.min(.03, dur * .3), dur * .25, dur * .7, vol);
    s.connect(f); f.connect(g); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
    s.onended = () => { try { s.disconnect(); f.disconnect(); g.disconnect(); } catch (e) { /* gone */ } };
  }
  // A little cartoon voice: a buzzy tone through a vowel formant, pitch gliding f0 → f1.
  function voice(c, o, t, dur, vol, f0, f1, formant) {
    const s = c.createOscillator(); s.type = 'sawtooth';
    s.frequency.setValueAtTime(f0, t); s.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = formant; f.Q.value = 2.2;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = formant * 2.2;
    const g = env(c, o, t, .02, dur * .35, dur * .6, vol);
    s.connect(f); f.connect(lp); lp.connect(g); s.start(t); s.stop(t + dur + .05);
    s.onended = () => { try { s.disconnect(); f.disconnect(); lp.disconnect(); g.disconnect(); } catch (e) { /* gone */ } };
  }
  if (typeof AUD !== 'undefined' && AUD && AUD.defineSfx) {
    // "ha… ha…": two rising, breathy little inhales (they line up with the model's head bobs, 0.15 s and 0.55 s).
    AUD.defineSfx('bilboHa', (c, o, t, p) => {
      for (const [dt, k] of [[.12, 1], [.52, 1.18]]) {
        hiss(c, o, t + dt, .30, .22 * k, 'bandpass', 900 * p, 1700 * p * k, 1.2);
        voice(c, o, t + dt + .03, .26, .16 * k, 330 * p * k, 470 * p * k, 900);
      }
      return 1.0;
    }, .9);
    // "HAPŞU!": a puffed "hap" (pop + voice), a long fizzy "ş", a falling silly "u".
    AUD.defineSfx('bilboHapsu', (c, o, t, p) => {
      hiss(c, o, t, .07, .55, 'lowpass', 1800 * p, 600 * p, .7);
      voice(c, o, t + .01, .13, .38, 560 * p, 430 * p, 950);
      hiss(c, o, t + .12, .30, .45, 'highpass', 2600 * p, 4200 * p, .8);
      voice(c, o, t + .30, .28, .26, 330 * p, 190 * p, 420);
      return .7;
    }, .8);
  }

  // ── Hapşırma ──
  function sneeze(c) {
    const B = c && c.Bilbo;
    if (!B || !B.sneeze) return false;
    const ok = B.sneeze(p => achoo(c, p));
    if (!ok) return false;
    const hasOwn = typeof AUD !== 'undefined' && AUD && AUD.defineSfx;
    if (hasOwn) sfx(c, 'bilboHa', { x: c.pos.x, z: c.pos.z, vol: .9 });
    else { sfx(c, 'sigh', { x: c.pos.x, z: c.pos.z, vol: .45, pitch: 1.6 }); later(c, .45, () => sfx(c, 'hiccup', { x: c.pos.x, z: c.pos.z, vol: .35, pitch: 1.5 })); }
    return true;
  }
  function achoo(c, p) {
    const B = c.Bilbo, f = B.root.rotation.y, dx = Math.sin(f), dz = Math.cos(f);
    const x = p.x + dx * .25, y = Math.max(.3, p.y), z = p.z + dz * .25;
    if (typeof AUD !== 'undefined' && AUD && AUD.defineSfx) sfx(c, 'bilboHapsu', { x, z, vol: 1 }); else sfx(c, 'pop', { x, z, vol: .7, pitch: .7 });
    sfx(c, 'whoosh', { x, z, vol: .6, pitch: .8 }); sfx(c, 'squish', { x, z, vol: .3, pitch: 1.4 });
    burst(c, 'smoke', x + dx * .4, y, z + dz * .4, { count: 14, color: '#ffffff', scale: 1.3, dir: { x: dx, z: dz } });
    burst(c, 'confetti', x + dx * .6, y + .2, z + dz * .6, { count: 26 });
    burst(c, 'sparkle', x + dx * .8, y + .1, z + dz * .8, { count: 16 });
    fx(c, 'ring', x + dx * .8, z + dz * .8, { r0: .2, r1: 3.2, dur: .45, color: '#fff7d6', width: .3 });
    if (c.shake) c.shake(.22);
    if (c.ftext) c.ftext(x, y + 1, z, 'HAPŞU!', 'word');
    // Cheerful and harmless: nearby little huysuzlar in front tumble back and stay dazed for a moment.
    const a = api(c), near = a.enemiesNear ? a.enemiesNear(x, z, 3.6) : [];
    for (const e of near) {
      if (!e || e.dead || e.boss) continue;
      const ex = e.x - B.root.position.x, ez = e.z - B.root.position.z, d = Math.hypot(ex, ez) || 1;
      if ((ex * dx + ez * dz) / d < -.2) continue;
      if (c.push) c.push(e, ex / d, ez / d, 1.4);
    }
    later(c, .9, () => sayLine(c, 'bilbo_hapsu', 1));
  }

  // ── 07_game kancaları ──
  function step(dt, c) {
    if (!c || !c.Bilbo || !c.P) return null;
    runTimers(c);
    if (!hooked && typeof GAME !== 'undefined' && GAME && GAME.on) {   // Aytuğ Hala admires a new accessory
      hooked = true;
      GAME.on('bilboAcc', d => {
        if (!d || !d.id || !lastC) return;
        const a = api(lastC), key = 'bilbo_' + d.id;
        sayLine(lastC, a.hasLine && a.hasLine(key) ? key : 'bilbo_aksesuar', 1);
      });
    }
    lastC = c;
    if (c.L !== lastL) { if (ride) endRide(c, true); dropItem(); setupLevel(c); }
    // Feza'nın gerçek hızı (heroVel yoksa)
    if (dt > 0) { measured = measured + (Math.hypot(c.P.pos.x - prevX, c.P.pos.z - prevZ) / dt - measured) * Math.min(1, dt * 10); }
    prevX = c.P.pos.x; prevZ = c.P.pos.z;
    if (item) itemStep(dt, c);
    let out = null;
    if (ride) out = rideStep(dt, c);
    else if (lost) out = lostStep(dt, c);
    if (overriding && !out && !ride && c.follow) c.follow.reset(c.P.pos, c.pos.x, c.pos.z, lastFace);
    overriding = !!out;
    if (out) lastFace = out.face;
    return out;
  }
  // Model durumuna eklenenler (st: 07_game'in Bilbo.update'e verdiği nesne)
  function pose(st, c) {
    st.ride = !!ride || rideK > .5;
    st.sniff = !!(lost && lost.phase === 'sniff');
    st.dig = !!(lost && lost.phase === 'dig');
    if (st.ride) st.sit = false;
    // Happy wag: Feza close by, Bilbo standing, nobody grumpy around (checked a few times per second).
    if (c && c.P && c.t >= happyAt) {
      happyAt = c.t + .3;
      const P = c.P;
      happyOn = !P.dead && dist(P.pos.x, P.pos.z, c.pos.x, c.pos.z) < 3.2 && !enemyNear(c, c.pos.x, c.pos.z, 6);
    }
    st.happy = st.ride || st.sniff || st.dig ? 1 : happyOn && (st.speed || 0) < 1.2 ? 1 : (lost && lost.phase === 'pop') || item ? 1 : 0;
    return st;
  }
  // Bölüm değişti / Feza yeniden yerleştirildi (07_game placeBilbo)
  function onPlace(c) {
    if (ride && c) endRide(c, true);
    rideK = 0; lift = 0;
    if (lost && lost.phase !== 'done' && lost.phase !== 'wait') { lost.phase = 'wait'; lost.wait = 3; }
    overriding = false;
  }
  return {
    step, pose, heroLift, onPlace, sneeze, buildItem,
    ride: setRide,
    get riding() { return !!ride; },
    get rideLeft() { return ride ? Math.max(0, ride.dur - ride.t) : 0; },
    get lost() { return lost ? { x: lost.x, z: lost.z, id: lost.id, zone: lost.zone, phase: lost.phase, why: lost.why || '' } : null; },
    busy: () => !!ride || !!(lost && lost.phase !== 'wait' && lost.phase !== 'done'),
  };
})();
