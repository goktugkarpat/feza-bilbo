/* ── Orman yetenekleri: palamutlar, yaprak rüzgârı ve çiçek açan kökler (Savaşçı Feza) ──
   + Büyücü Feza (Yaprak Okları, Çiçek Kalkanı, Ateşböceği Bahçesi) ve Büyülü Şövalye Feza (Yaprak Hilali, Sarmaşık Bağı,
     Mantar Halkası): Huysuzlara Karşı'nın büyü/şövalye yetenekleri, orman renkleri ve adlarıyla (FOREST_MAGIC, aşağıda).
   SKILLS.forClass(heroClass) sınıfın üçlüsünü verir; SKILLS_update yalnız o sınıfın modülünü günceller.
   Üç yuva / seviye 1, 3, 5. SKILLS, SKILLS_update(dt), SKILLS_clear() sözleşmesi korunur.
   Geometriler ve efekt yuvaları bir kez hazırlanır. Bütün süreler oyun saatine bağlıdır;
   duraklama, ölüm ve bölüm değişikliği devam eden yetenekleri de durdurur. */
'use strict';

const FOREST_WARRIOR = (() => {
  const CAST_T = 0.25, LEAF_T = 2.2, LEAF_R = 2.6, BLOOM_T = 3.15, BLOOM_R = 3.6;
  const S = { ready: false, warm: false, time: 0, P: null, castT: 0, root: null };
  const WIND = { t: 0, tick: 0, count: 0, leaves: null, air: null, group: null };
  const BLOOM = { t: 0, tick: 0, count: 0, x: 0, z: 0, damage: 0, group: null, roots: [], rootInstances: null, flowers: null, floor: null };
  const ACORNS = [], C = { P: null, x: 0, z: 0, ax: 0, az: 1, target: null };
  const DUMMY = new THREE.Object3D(), LEAF_COLOR = new THREE.Color();
  const LEAF_COLS = ['#71ba39', '#a5cf53', '#d8b645', '#3d9146', '#e4964c'];
  const U = { time: { value: 0 } };
  const gm = () => typeof GAME !== 'undefined' ? GAME : null;
  const fx = (name, ...args) => typeof FX !== 'undefined' && typeof FX[name] === 'function' ? FX[name](...args) : null;
  const sound = (name, options) => { if (typeof AUD !== 'undefined' && AUD.sfx) AUD.sfx(name, options); };
  const keep = o => { o.userData.keep = true; return o; };
  const damageNow = () => { const g = gm(); return g && g.heroDamageNow ? g.heroDamageNow(false) : (S.P && S.P.dmg) || 10; };
  const near = (x, z, r) => { const g = gm(); return g && g.enemiesNear ? g.enemiesNear(x, z, r) : []; };
  const visible = (x, z, e) => { const g = gm(); return !(g && g.L && typeof LEVEL !== 'undefined' && LEVEL.los) || LEVEL.los(g.L, x, z, e.x, e.z); };
  const floor = (x, z) => { const g = gm(); return !(g && g.L && typeof LEVEL !== 'undefined' && LEVEL.isFloor) || LEVEL.isFloor(g.L, x, z); };
  const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  function particle(x, y, z, color, shape, vx, vy, vz, size, life, add) {
    fx('emit', { x, y, z, vx, vy, vz, color, color1: color, shape, size, size1: 0.02, life,
      alpha: 0.9, add: !!add, glow: add ? 1.25 : 1, grav: 1.3, drag: 0.7, spin: frand(-3, 3), pop: 0.05 });
  }
  function prepare(ctx) {
    const g = gm(), P = ctx && ctx.P || g && g.P;
    if (!P || !P.pos || P.dead) return null;
    ensure(); S.P = C.P = P; C.x = P.pos.x; C.z = P.pos.z;
    let target = ctx && ctx.target;
    if (target === undefined && g && g.nearestEnemy) target = g.nearestEnemy(C.x, C.z, 11);
    C.target = target && target.hp > 0 && visible(C.x, C.z, target) ? target : null;
    const aim = ctx && ctx.aim;
    const dx = aim && (aim.x || aim.z) ? aim.x : C.target ? C.target.x - C.x : Math.sin(P.face || 0);
    const dz = aim && (aim.x || aim.z) ? aim.z : C.target ? C.target.z - C.z : Math.cos(P.face || 0);
    const len = Math.hypot(dx, dz) || 1; C.ax = dx / len; C.az = dz / len;
    return C;
  }
  function pose(c, id, face) {
    S.castT = CAST_T; c.P.castT = CAST_T; c.P.castDur = CAST_T; c.P.castSkill = id;
    if (face) c.P.face = Math.atan2(c.ax, c.az);
  }
  function shader(fragment, color) {
    return keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, uniforms: { uT: U.time, uA: { value: 0 }, uCol: { value: new THREE.Color(color) } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec2 vUv;uniform float uT,uA;uniform vec3 uCol;void main(){' + fragment + '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }));
  }
  function leafGeometry() {
    const v = [], uv = [];
    for (let i = 0; i < 10; i++) {
      const t0 = i / 10, t1 = (i + 1) / 10, y0 = t0 * 2 - 1, y1 = t1 * 2 - 1;
      const w0 = 0.52 * Math.sin(t0 * Math.PI), w1 = 0.52 * Math.sin(t1 * Math.PI);
      for (const side of [-1, 1]) {
        v.push(0, y0, 0.08 * Math.sin(t0 * Math.PI), side * w0, y0, 0, side * w1, y1, 0,
          0, y0, 0.08 * Math.sin(t0 * Math.PI), side * w1, y1, 0, 0, y1, 0.08 * Math.sin(t1 * Math.PI));
        uv.push(0.5, t0, 0.5 + side * w0, t0, 0.5 + side * w1, t1, 0.5, t0, 0.5 + side * w1, t1, 0.5, t1);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return keep(g);
  }
  function ensure() {
    if (S.ready) return; S.ready = true;
    S.root = new THREE.Group(); S.root.name = 'forestSkills'; scene.add(S.root);
    const leafGeo = leafGeometry(), leafMat = keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.76, side: THREE.DoubleSide }));
    if (typeof TEX !== 'undefined' && TEX.leaves) { leafMat.normalMap = TEX.leaves.normalMap; leafMat.normalScale.set(.18, .18); }
    const nutGeo = keep(new THREE.SphereGeometry(1, 16, 10)), capGeo = keep(new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI * 0.52));
    const nutMat = keep(new THREE.MeshStandardMaterial({ color: '#dca45b', roughness: 0.6 }));
    const capMat = keep(new THREE.MeshStandardMaterial({ color: '#895b30', roughness: 0.86 }));
    if (typeof TEX !== 'undefined' && TEX.bark) { capMat.normalMap = TEX.bark.normalMap; capMat.normalScale.set(.28, .28); }
    const acornLeafMat = keep(new THREE.MeshStandardMaterial({ color: '#83b644', roughness: 0.76, side: THREE.DoubleSide }));
    // Six volleys fit in the pool; each acorn returns to its slot through GAME's projectile-dispose hook.
    for (let i = 0; i < 18; i++) {
      const o = new THREE.Group(), nut = new THREE.Mesh(nutGeo, nutMat), cap = new THREE.Mesh(capGeo, capMat), leaf = new THREE.Mesh(leafGeo, acornLeafMat);
      nut.scale.set(0.2, 0.28, 0.2); cap.scale.set(0.23, 0.15, 0.23); cap.position.y = 0.14;
      leaf.scale.set(0.11, 0.17, 0.1); leaf.position.set(0.08, 0.3, 0); leaf.rotation.z = -0.6;
      o.add(nut, cap, leaf); o.visible = false; o.name = 'forestAcorn';
      const slot = { on: false, object: o, spin: nut, cap, leaf };
      o.userData.dispose = () => { slot.on = false; o.visible = false; if (o.parent) o.parent.remove(o); };
      ACORNS.push(slot);
    }
    WIND.group = new THREE.Group(); WIND.group.name = 'forestLeafGust'; WIND.group.visible = false; S.root.add(WIND.group);
    WIND.leaves = new THREE.InstancedMesh(leafGeo, leafMat, 40); WIND.leaves.frustumCulled = false;
    WIND.leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < 40; i++) WIND.leaves.setColorAt(i, LEAF_COLOR.set(LEAF_COLS[i % LEAF_COLS.length]));
    WIND.group.add(WIND.leaves);
    const airMat = shader('float y=vUv.y;float phase=fract(vUv.x*3.0-y*.52-uT*1.35);float width=fwidth(phase)+.012;float ribbon=smoothstep(.75-width,.86,phase)*(1.-smoothstep(.88,.98+width,phase));float taper=pow(max(0.,sin(y*3.14159)),1.8);float wisps=.45+.55*sin(vUv.x*25.1327+y*5.-uT*1.4);gl_FragColor=vec4(uCol*1.05,ribbon*taper*wisps*uA*.16);', '#d9f3ae');
    WIND.air = new THREE.Mesh(keep(new THREE.CylinderGeometry(2.25, 2.2, 1.65, 48, 1, true)), airMat);
    WIND.air.position.y = 0.92; WIND.air.frustumCulled = false; WIND.group.add(WIND.air);
    BLOOM.group = new THREE.Group(); BLOOM.group.name = 'forestRootBlossoms'; BLOOM.group.visible = false; S.root.add(BLOOM.group);
    const rootMat = keep(new THREE.MeshStandardMaterial({ color: '#aa7745', roughness: 0.85 }));
    const rootCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.8, 0.08, -0.06),
      new THREE.Vector3(1.5, 0.25, 0.12), new THREE.Vector3(2.15, 0.5, 0.18), new THREE.Vector3(2.75, 0.82, 0.08), new THREE.Vector3(3.15, 1.18, 0)]);
    const rootGeo = keep(new THREE.TubeGeometry(rootCurve, 28, 0.075, 5, false));
    // Tapered roots share one draw call and keep their individually staggered growth.
    const rootPoint = new THREE.Vector3(), rootVertex = new THREE.Vector3(), rootPos = rootGeo.attributes.position;
    for (let i = 0; i < rootPos.count; i++) { const t = Math.floor(i / 6) / 28; rootCurve.getPointAt(t, rootPoint); rootVertex.fromBufferAttribute(rootPos, i).sub(rootPoint).multiplyScalar(1 - .68 * t).add(rootPoint); rootPos.setXYZ(i, rootVertex.x, rootVertex.y, rootVertex.z); }
    rootGeo.computeVertexNormals();
    BLOOM.rootInstances = new THREE.InstancedMesh(rootGeo, rootMat, 8); BLOOM.rootInstances.frustumCulled = false;
    BLOOM.rootInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage); BLOOM.group.add(BLOOM.rootInstances);
    for (let i = 0; i < 8; i++) { const branch = new THREE.Object3D(); branch.rotation.y = i * TAU / 8; branch.updateMatrix(); BLOOM.rootInstances.setMatrixAt(i, branch.matrix); BLOOM.roots.push(branch); }
    BLOOM.flowers = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(1, 8, 5)), keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.62 })), 48);
    BLOOM.flowers.frustumCulled = false; BLOOM.flowers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < 48; i++) BLOOM.flowers.setColorAt(i, LEAF_COLOR.set(i % 6 === 5 ? '#eabd59' : i % 12 < 6 ? '#f3b6bb' : '#d4dba0'));
    BLOOM.group.add(BLOOM.flowers);
    const floorMat = shader('vec2 p=vUv*2.0-1.0;float r=length(p);if(r>1.0)discard;float a=atan(p.y,p.x);float lobe=0.66+0.12*cos(a*8.0);float line=exp(-pow((r-lobe)/0.025,2.0));float rim=exp(-pow((r-0.91)/0.033,2.0));float heart=exp(-r*r*12.0);gl_FragColor=vec4(uCol*1.35,(line*0.34+rim*0.2+heart*0.15)*uA);', '#b8d77a');
    BLOOM.floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(BLOOM_R * 2, BLOOM_R * 2).rotateX(-Math.PI / 2)), floorMat);
    BLOOM.floor.position.y = 0.045; BLOOM.floor.frustumCulled = false; BLOOM.group.add(BLOOM.floor);
  }
  function warm() {
    S.warm = true; ensure();
    // Include the recycled shots in compilation without rendering them during ordinary gameplay.
    const shots = new THREE.Group(); ACORNS.forEach(a => shots.add(a.object)); S.root.add(shots);
    try { const p = renderer.compileAsync ? renderer.compileAsync(S.root, camera, scene) : renderer.compile(S.root, camera, scene); if (p && p.catch) p.catch(() => {}); } catch (_) { /* browser may compile on its first frame */ }
    ACORNS.forEach(a => shots.remove(a.object)); S.root.remove(shots);
  }
  function acornHit(p) {
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; particle(p.x, p.y, p.z, LEAF_COLS[i], 10, Math.sin(a) * 1.7, 1, Math.cos(a) * 1.7, 0.26, 0.4, false); }
    sound('hit', { vol: 0.32, pitch: 1.5, x: p.x, z: p.z });
  }
  function castAcorns(c) {
    const g = gm(); if (!g || !g.spawnProjectile || ACORNS.filter(a => !a.on).length < 3) return false;
    pose(c, 'palamut', true);
    const targets = near(c.x, c.z, 10.8).filter(e => e.hp > 0 && visible(c.x, c.z, e) &&
      (e.x - c.x) * c.ax + (e.z - c.z) * c.az > -0.1);
    targets.sort((a, b) => a === c.target ? -1 : b === c.target ? 1 : dist2(c.x, c.z, a.x, a.z) - dist2(c.x, c.z, b.x, b.z));
    for (let i = 0; i < 3; i++) {
      const slot = ACORNS.find(a => !a.on), side = (i - 1) * 0.34;
      const x = c.x + c.ax * 0.65 + c.az * side, z = c.z + c.az * 0.65 - c.ax * side;
      const target = targets[i % Math.max(1, targets.length)];
      const a = target ? Math.atan2(target.x - x, target.z - z) : Math.atan2(c.ax, c.az) + (i - 1) * 0.2;
      slot.on = true; slot.object.visible = true; slot.object.rotation.set(0, 0, 0); slot.object.scale.setScalar(1.2);
      g.spawnProjectile({ x, y: 0.95, z, vx: Math.sin(a) * 16, vz: Math.cos(a) * 16, r: 0.5,
        dmg: Math.max(1, Math.round(damageNow() * 0.7 + 3)), owner: 'feza', kind: 'acorn', color: '#a3c752',
        life: 0.8, pierce: 2, obj: slot.object, onHit: acornHit });
    }
    sound('whoosh', { pitch: 1.4, vol: 0.6, x: c.x, z: c.z }); return true;
  }
  function castLeaves(c) {
    if (WIND.t > 0) return false;
    pose(c, 'yaprakkasirgasi', false); WIND.t = LEAF_T; WIND.tick = 0.06; WIND.count = 0;
    WIND.group.position.set(c.x, 0, c.z); WIND.group.visible = true;
    sound('spin', { vol: 0.7, pitch: 1.15, x: c.x, z: c.z }); return true;
  }
  function tickDamage(x, z, r, amount, kind, kb) {
    const g = gm(); if (!g) return;
    const enemies = near(x, z, r);
    for (const e of enemies) if (e.hp > 0 && visible(x, z, e)) g.damage(e, amount, { kb, fromX: x, fromZ: z, kind, silent: true });
    if (g.hitBreakables) g.hitBreakables(x, z, r);
  }
  function castBloom(c) {
    if (BLOOM.t > 0) return false;
    pose(c, 'ormankucaklamasi', true);
    let x = c.target ? c.target.x : c.x + c.ax * 4, z = c.target ? c.target.z : c.z + c.az * 4;
    for (let i = 0; i < 14 && (!floor(x, z) || !visible(c.x, c.z, { x, z })); i++) { x = lerp(x, c.x, 0.3); z = lerp(z, c.z, 0.3); }
    BLOOM.x = x; BLOOM.z = z; BLOOM.t = BLOOM_T; BLOOM.tick = 0.18; BLOOM.count = 0;
    BLOOM.damage = Math.max(1, Math.round(damageNow() * 1.05)); BLOOM.group.position.set(x, 0, z); BLOOM.group.visible = true;
    sound('shield', { vol: 0.65, pitch: 1.2, x, z }); return true;
  }
  function update(dt) {
    if (!S.warm) warm(); if (!(dt > 0) || !Number.isFinite(dt)) return;
    S.time += dt; U.time.value = S.time;
    const P = S.P || gm() && gm().P;
    if (S.castT > 0) { S.castT = Math.max(0, S.castT - dt); if (P) P.castT = S.castT; }
    if (P && P.shield > 0) P.shield = Math.max(0, P.shield - dt);
    if (P && P.dead) { clear(); return; }
    for (const a of ACORNS) if (a.on) a.object.rotation.z += dt * 7;
    if (WIND.t > 0 && P) {
      WIND.t = Math.max(0, WIND.t - dt); WIND.tick -= dt;
      const age = LEAF_T - WIND.t, fade = ease(age / 0.16) * ease(WIND.t / 0.3);
      WIND.group.position.set(P.pos.x, 0, P.pos.z); WIND.air.material.uniforms.uA.value = fade;
      for (let i = 0; i < 40; i++) {
        const a = S.time * (3.5 + i % 3 * 0.3) + i * 2.39996, r = 1.15 + (i % 5) * 0.27;
        DUMMY.position.set(Math.sin(a) * r, 0.28 + (i % 7) * 0.23 + Math.sin(a * 1.3) * 0.13, Math.cos(a) * r);
        DUMMY.rotation.set(a * 0.9, -a, a * 1.4); DUMMY.scale.setScalar((0.17 + i % 4 * 0.035) * fade);
        DUMMY.updateMatrix(); WIND.leaves.setMatrixAt(i, DUMMY.matrix);
      }
      WIND.leaves.instanceMatrix.needsUpdate = true;
      if (WIND.tick <= 0 && WIND.count < 10) {
        WIND.tick += 0.22; WIND.count++; tickDamage(P.pos.x, P.pos.z, LEAF_R, Math.max(1, Math.round(damageNow() * 0.6)), 'leaves', 0.25);
        if (WIND.count % 3 === 1) sound('whoosh', { vol: 0.32, pitch: 1.2, x: P.pos.x, z: P.pos.z });
      }
      if (!WIND.t) WIND.group.visible = false;
    }
    if (BLOOM.t > 0) {
      BLOOM.t = Math.max(0, BLOOM.t - dt); BLOOM.tick -= dt;
      const age = BLOOM_T - BLOOM.t, fade = ease(BLOOM.t / 0.48), open = ease(age / 0.45), beat = 0.5 + 0.5 * Math.sin(age * TAU * 2);
      BLOOM.floor.material.uniforms.uA.value = open * fade * (0.75 + beat * 0.25);
      for (let i = 0; i < 8; i++) {
        const r = BLOOM.roots[i], growth = ease((age - i * 0.02) / 0.5) * fade;
        r.scale.set(growth, growth * (0.94 + beat * 0.06), growth); r.rotation.z = Math.sin(age * 2.5 + i) * 0.016;
        r.updateMatrix(); BLOOM.rootInstances.setMatrixAt(i, r.matrix);
      }
      BLOOM.rootInstances.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 48; i++) {
        const branch = Math.floor(i / 6), petal = i % 6, a = branch * TAU / 8;
        const grow = ease((age - 0.2 - branch * 0.018) / 0.4) * fade, ca = Math.cos(a), sa = -Math.sin(a);
        const petalA = petal * TAU / 5;
        DUMMY.position.set(ca * 3.15 * open + (petal === 5 ? 0 : Math.cos(petalA) * 0.15 * grow),
          1.14 * open * fade + Math.sin(age * 2 + branch) * 0.055 + (petal === 5 ? 0.065 : 0),
          sa * 3.15 * open + (petal === 5 ? 0 : Math.sin(petalA) * 0.15 * grow));
        DUMMY.rotation.set(petal === 5 ? 0 : Math.sin(age * 2.1 + branch) * .12, -petalA, petal === 5 ? 0 : Math.sin(age * 2.6 + petal) * .08); DUMMY.scale.set((petal === 5 ? .09 : .19) * grow, .055 * grow, (petal === 5 ? .09 : .10) * grow);
        DUMMY.updateMatrix(); BLOOM.flowers.setMatrixAt(i, DUMMY.matrix);
      }
      BLOOM.flowers.instanceMatrix.needsUpdate = true;
      if (BLOOM.tick <= 0 && BLOOM.count < 6) {
        BLOOM.tick += 0.48; BLOOM.count++; tickDamage(BLOOM.x, BLOOM.z, BLOOM_R, BLOOM.damage, 'forestBloom', 0.25);
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8; particle(BLOOM.x + Math.sin(a) * 2.8, 0.45, BLOOM.z + Math.cos(a) * 2.8,
          i % 2 ? '#f0b7b5' : '#cee890', 10, Math.sin(a) * 0.8, 1.5, Math.cos(a) * 0.8, 0.3, 0.65, false); }
        sound('star', { vol: 0.22, pitch: 1.25 + BLOOM.count * 0.045, x: BLOOM.x, z: BLOOM.z });
      }
      if (!BLOOM.t) BLOOM.group.visible = false;
    }
  }
  function clear() {
    WIND.t = BLOOM.t = S.castT = 0;
    if (WIND.group) WIND.group.visible = false; if (BLOOM.group) BLOOM.group.visible = false;
    for (const a of ACORNS) a.object.userData.dispose();
    if (S.P) { S.P.castT = 0; S.P.spin = 0; S.P.shield = 0; } S.P = null;
  }
  const wrap = fn => ctx => { const c = prepare(ctx); return c ? fn(c) : false; };
  const list = [
    { id: 'palamut', ad: 'Palamut Yağmuru', icon: '🌰', lvl: 1, cd: 4, color: '#ccaa62', line: null, cast: wrap(castAcorns) },
    { id: 'yaprakkasirgasi', ad: 'Yaprak Kasırgası', icon: '🍃', lvl: 3, cd: 15, color: '#9dca54', line: null, cast: wrap(castLeaves) },
    { id: 'ormankucaklamasi', ad: 'Ormanın Kucaklaması', icon: '🌼', lvl: 5, cd: 24, color: '#e7b8bb', line: null, cast: wrap(castBloom) },
  ];
  return { list, update, clear };
})();

// ── Büyücü / Büyülü Şövalye (../huysuz/src/08_skills.js'ten taşındı; savaşçı üçlüsü orada kullanılmaz) ──

const FOREST_MAGIC = (function () {
  const CAST_T = 0.35;
  // Four-second volley: a little over two sword hits on a lone target, or three distinct stars through a crowd.
  const STAR_K = 0.7, STAR_ADD = 3, STAR_FAN = 0.22, STAR_GAP = 0.3, STAR_FWD = 0.55, STAR_Y = 0.95;
  const SPIN_T = 2.2, SPIN_R = 2.6, SPIN_TICK = 0.22;
  const MET_N = 8, MET_SPAN = 1.8, MET_R = 2.2, MET_FALL0 = 0.2, MET_LAND = 0.6;
  // Meteors enter from the upper left of the SCREEN: start = landing spot shifted left/up in camera space, then pulled
  // toward the camera along its ray (gains height without leaving the view – the top-down camera sees little sky).
  const MET_SIDE = 5.2, MET_UP = 1.6, MET_PULL = 0.3;
  const RAINBOW = ['#ff5d73', '#ff9a3c', '#ffd23f', '#72e06a', '#4fc3ff', '#8f7bff', '#ff7ad9', '#ffb35c'];
  const WIND_COLS = ['#ffffff', '#bff4ff', '#7ee0ff'], LEAF_COLS = ['#7ed957', '#a6e35a', '#5cc24a', '#ffd23f', '#ff9ec7'];

  const S = { ready: false, warm: false, t: 0, P: null, H: null, castLeft: 0, root: null };
  const uT = { value: 0 };                        // shared time uniform of this file's shaders
  const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();

  // ── Other modules (all optional, so the file also works half-wired) ──
  const fxOk = n => typeof FX !== 'undefined' && FX && typeof FX[n] === 'function';
  const gm = () => (typeof GAME !== 'undefined' && GAME ? GAME : null);
  function sfx(name, o) { if (typeof AUD !== 'undefined' && AUD && AUD.sfx) AUD.sfx(name, o); }
  // Comic words (Vuuş!, Güm!) go through GAME's shared limiter so skills never add to a pile of words on screen.
  const wordOK = () => (typeof GAME !== 'undefined' && GAME.wordOK ? GAME.wordOK() : true);
  function word(x, z, text) { if (fxOk('floatText') && wordOK()) FX.floatText(x, 2.3, z, text, 'word'); }
  function sword() { const g = gm(); const d = g && g.heroDamageNow ? g.heroDamageNow(!!(S.P && S.P.heroClass === 'wizard')) : 0; return d > 0 ? d : (S.P && S.P.dmg) || 10; }
  function near(x, z, r) { const g = gm(); return (g && g.enemiesNear && g.enemiesNear(x, z, r)) || []; }
  function nearest(x, z, r) { const g = gm(); return (g && g.nearestEnemy && g.nearestEnemy(x, z, r)) || null; }
  function hurt(e, amt, o) { const g = gm(); return !!(g && g.damage && g.damage(e, amt, o)); }
  function smash(x, z, r) { const g = gm(); if (g && g.hitBreakables) g.hitBreakables(x, z, r); }
  function isFloor(x, z) { const g = gm(); return !(g && g.L && typeof LEVEL !== 'undefined' && LEVEL.isFloor) || !!LEVEL.isFloor(g.L, x, z); }
  const alive = e => !!e && !(e.hp <= 0);
  function eY(e) {   // middle of an enemy's body (flyers included)
    const m = e.m, base = e.y !== undefined ? e.y : m && m.root ? m.root.position.y : 0;
    return base + (e.height || (m && m.height) || (e.def && e.def.height) || 1) * 0.5;
  }
  const burst = (k, x, y, z, o) => { if (fxOk('burst')) FX.burst(k, x, y, z, o); };
  const fxRing = (x, z, o) => { if (fxOk('ring')) FX.ring(x, z, o); };
  const shake = a => { if (fxOk('shake')) FX.shake(a); };
  const lightFlash = (x, z, c, i, d) => { if (fxOk('lightFlash')) FX.lightFlash(x, z, c, i, d); };
  // One reused particle record (FX.emit copies the fields into its pool).
  // grav > 0 pulls down; glow multiplies the colour (HDR > ~1.25 blooms).
  // Shapes: 1 star, 2 sparkle, 3 smoke, 10 petal (FX atlas). orbit = rad/s around (ox, oz).
  const PT = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0.5, size: 0.3, size1: 0, color: '#fff', color1: '#fff', alpha: 1, shape: 2, add: true,
    grav: 0, drag: 0, spin: 0, glow: 1, pop: 0, orbit: 0, ox: undefined, oz: undefined };
  function puff(x, y, z, vx, vy, vz, life, size, size1, color, color1, shape, grav, drag, glow, add) {
    if (!fxOk('emit')) return;
    PT.x = x; PT.y = y; PT.z = z; PT.vx = vx; PT.vy = vy; PT.vz = vz; PT.life = life; PT.size = size; PT.size1 = size1;
    PT.color = color; PT.color1 = color1; PT.shape = shape; PT.grav = grav; PT.drag = drag; PT.spin = frand(-4, 4);
    PT.add = add !== false; PT.glow = PT.add ? (glow || 2.2) : 1; PT.pop = shape === 3 ? 0 : 0.08;
    FX.emit(PT);
    PT.orbit = 0; PT.ox = PT.oz = undefined;
  }
  const orbit = (w, x, z) => { PT.orbit = w; PT.ox = x; PT.oz = z; };

  // ── Shaders (linear HDR out; > ~1.25 blooms) ──
  const VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
  const VS_WIND = `uniform float uT; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() {
      vUv = uv; vec3 p = position;
      p.xz *= 1.0 + 0.09 * sin(uv.x * 18.85 + uT * 7.0 + uv.y * 5.0);
      p.x += sin(uT * 3.1 + uv.y * 2.0) * 0.06 * uv.y; p.z += cos(uT * 2.7 + uv.y * 2.0) * 0.06 * uv.y;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv;
    }`;
  const FS_HEAD = `uniform float uT; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    float ring(float r, float c, float w) { float d = (r - c) / w; return exp(-d * d); }
    vec3 hsv(float h, float s, float v) { vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return v * mix(vec3(1.0), k * k, s); }
    `;
  const FS_END = `
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`;
  const SH = {
    // Rune circle: mode 0 = cast circle, 1 = meteor target marker (fills with uK), 2 = impact splash ring
    circle: `uniform vec3 uCol; uniform float uA, uK, uMode, uRot;
      float sdStar5(vec2 p, float r, float rf) {
        const vec2 k1 = vec2(0.809016994375, -0.587785252292); const vec2 k2 = vec2(-k1.x, k1.y);
        p.x = abs(p.x); p -= 2.0 * max(dot(k1, p), 0.0) * k1; p -= 2.0 * max(dot(k2, p), 0.0) * k2;
        p.x = abs(p.x); p.y -= r;
        vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
        float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
        return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
      }
      void main() {
        vec2 p = vUv * 2.0 - 1.0; float r = length(p);
        if (r > 1.0) discard;
        float c = cos(uRot), s = sin(uRot); vec2 q = mat2(c, -s, s, c) * p;
        float v;
        if (uMode < 0.5) {
          float d = sdStar5(q, 0.6, 0.42), a = atan(q.y, q.x);
          float dots = pow(max(0.0, cos(a * 10.0)), 30.0) * ring(r, 0.815, 0.035);
          v = ring(r, 0.93, 0.03) * 1.4 + ring(r, 0.7, 0.016) * 0.9 + ring(d, 0.0, 0.022) * 1.2 + dots * 1.6
            + smoothstep(0.02, -0.25, d) * 0.14 + (1.0 - r) * 0.12;
        } else if (uMode < 1.5) {
          float d = sdStar5(q, 0.3, 0.42), a = atan(q.y, q.x);
          float ticks = pow(max(0.0, cos(a * 8.0)), 40.0) * ring(r, 0.85, 0.05);
          v = ring(r, 0.95, 0.035) * 1.5 + step(r, uK) * (0.16 + 0.1 * r) + ring(r, uK, 0.03) * 1.1
            + ring(d, 0.0, 0.03) * 1.1 + smoothstep(0.0, -0.12, d) * 0.35 + ticks * 1.2;
        } else {
          v = ring(r, uK, 0.08 + 0.12 * uK) * 1.3 + smoothstep(uK, 0.0, r) * 0.22;
        }
        float al = clamp(v * uA, 0.0, 1.0);
        gl_FragColor = vec4(mix(uCol, vec3(1.0), clamp(v - 1.0, 0.0, 1.0) * 0.6) * 2.4, al);`,
    // Funnel of swirling wind streaks (open cylinder, additive, both sides)
    wind: `uniform vec3 uCol; uniform float uA, uSpd, uTw;
      void main() {
        float s = fract(vUv.x * 3.0 + vUv.y * uTw - uT * uSpd);
        float band = pow(s, 2.2) * smoothstep(1.0, 0.94, s);                 // bright leading edge, soft tail
        float s2 = fract(vUv.x * 5.0 + vUv.y * uTw * 1.7 - uT * uSpd * 1.4);
        float thin = pow(s2, 10.0) * smoothstep(1.0, 0.97, s2);
        float edge = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.62, vUv.y);
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float a = (band * 0.55 + thin * 0.9) * edge * (0.35 + 0.65 * f) * uA;
        gl_FragColor = vec4(mix(uCol, vec3(1.0), clamp(band * 0.5 + thin, 0.0, 1.0)) * 1.7, a);`,
    // Spiral wind arms on the ground, edge ring = reach of the whirl
    swirl: `uniform vec3 uCol; uniform float uA, uSpd;
      void main() {
        vec2 p = vUv * 2.0 - 1.0; float r = length(p);
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float sp = fract(a / 6.28318 * 4.0 - r * 1.5 + uT * uSpd);
        float arms = smoothstep(0.0, 0.22, sp) * smoothstep(0.75, 0.3, sp);
        float mask = smoothstep(0.28, 0.6, r) * smoothstep(1.0, 0.9, r);
        float v = arms * mask * 0.42 + ring(r, 0.955, 0.025) * 0.7;
        gl_FragColor = vec4(mix(uCol, vec3(1.0), 0.35) * 1.8, clamp(v * uA, 0.0, 1.0));`,
    // Comet tail: head colour → rainbow toward the end, bright view-facing core
    tail: `uniform vec3 uCol; uniform float uA, uHue;
      void main() {
        float v = vUv.y;
        float f = abs(dot(normalize(vN), normalize(vV)));
        float core = pow(f, 1.6);
        vec3 rb = hsv(fract(uHue + (1.0 - v) * 0.85 - uT * 0.6), 0.9, 1.0);
        vec3 col = mix(rb, uCol, smoothstep(0.6, 1.0, v));
        col = mix(col, vec3(1.0), core * core * core * smoothstep(0.5, 1.0, v) * 0.5);
        gl_FragColor = vec4(col * 2.2, clamp(pow(v, 1.25) * smoothstep(1.0, 0.9, v) * core * uA, 0.0, 1.0));`,
    // Camera-facing glow with a 4-point twinkle
    halo2: `uniform vec3 uCol; uniform float uA;
      void main() {
        vec2 p = vUv * 2.0 - 1.0; float r2 = dot(p, p);
        float g = exp(-r2 * 5.0), core = exp(-r2 * 34.0);
        float rays = (exp(-abs(p.x) * 38.0) + exp(-abs(p.y) * 38.0)) * exp(-r2 * 3.2) * 0.7;
        gl_FragColor = vec4(mix(uCol, vec3(1.0), core) * 2.6, clamp((g * 0.65 + rays + core) * uA, 0.0, 1.0));`,
  };
  function fxMat(fs, uniforms, o) {
    uniforms.uT = uT;
    return new THREE.ShaderMaterial(Object.assign({
      uniforms, vertexShader: VS, fragmentShader: FS_HEAD + fs + FS_END,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }, o));
  }

  // ── Shared geometry ──
  let GEO = null;
  // Puffy five-point star (a sphere pushed into a star outline and flattened) – smooth, cute, catches highlights.
  function starGeo() {
    const g = new THREE.SphereGeometry(1, 80, 14);
    g.rotateX(Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = Math.atan2(y, x) - Math.PI / 2;
      const f = Math.pow(0.5 + 0.5 * Math.cos(5 * th), 1.7), R = 0.47 + 0.53 * f;
      p.setXYZ(i, x * R, y * R, z * (0.42 - 0.16 * f));
    }
    g.computeVertexNormals();
    g.userData.keep = true;
    return g;
  }

  // ── Lazy setup: meshes and pools (first cast / first update) ──
  const CIRC = [], METS = [];
  const GARDEN = { grp: null, petals: null, stars: [], flowers: [], mats: [] };
  const HYBRID = { guard: null, blades: [], seal: null, cross: null, mats: [], t: 0, tick: 0, n: 0, dmg: 0, sealT: 0, sealTick: 0, sealN: 0, sealDmg: 0, x: 0, z: 0, shield: null };
  const SPIN = { t: 0, dur: SPIN_T, tick: 0, n: 0, emitT: 0, ang: 0, grp: null, inner: null, outer: null, floor: null };
  const MET = { cx: 0, cz: 0, fx: 0, fz: 0, aimed: [], spots: [], first: true };   // fx, fz: where Feza cast it
  let starMat = null;

  function ensure() {
    if (S.ready) return;
    S.ready = true;
    const root = S.root = new THREE.Group();
    root.name = 'skills';
    scene.add(root);
    GEO = {
      plane: new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
      bill: new THREE.PlaneGeometry(1, 1),
      star: starGeo(),
      windIn: new THREE.CylinderGeometry(1.2, 0.62, 2.0, 40, 6, true).translate(0, 1.0, 0),
      windOut: new THREE.CylinderGeometry(1.85, 1.0, 2.5, 44, 6, true).translate(0, 1.25, 0),
      tail: new THREE.CylinderGeometry(1, 0.06, 1, 18, 10, true).translate(0, -0.5, 0),
    };
    const mk = (geo, mat, y, order) => { const m = new THREE.Mesh(geo, mat); m.position.y = y || 0; m.renderOrder = order || 0; m.frustumCulled = false; m.visible = false; return m; };

    // rune circles (cast circles, meteor markers): at most ~11 at once (meteor: 8 markers + cast circles)
    for (let i = 0; i < 14; i++) {
      const mat = fxMat(SH.circle, { uCol: { value: new THREE.Color() }, uA: { value: 0 }, uK: { value: 0 }, uMode: { value: 0 }, uRot: { value: 0 } });
      const mesh = mk(GEO.plane, mat, 0.035, 2);
      root.add(mesh);
      CIRC.push({ on: false, mesh, u: mat.uniforms, t: 0, dur: 1, mode: 0, r: 1, follow: false });
    }

    // kasırga: two counter-twisted wind funnels + ground swirl
    const sg = SPIN.grp = new THREE.Group(); sg.visible = false; root.add(sg);
    const wm = (tw, spd) => { const m = fxMat(SH.wind, { uCol: { value: new THREE.Color('#8fe6ff') }, uA: { value: 0 }, uSpd: { value: spd }, uTw: { value: tw } }); m.vertexShader = VS_WIND; return m; };
    SPIN.inner = mk(GEO.windIn, wm(0.9, 2.6)); SPIN.inner.visible = true;
    SPIN.outer = mk(GEO.windOut, wm(-0.7, 2.0)); SPIN.outer.visible = true;
    SPIN.floor = mk(GEO.plane, fxMat(SH.swirl, { uCol: { value: new THREE.Color('#7ee0ff') }, uA: { value: 0 }, uSpd: { value: 1.3 } }), 0.04, 2);
    SPIN.floor.visible = true; SPIN.floor.scale.setScalar(SPIN_R + 0.1);
    sg.add(SPIN.inner, SPIN.outer, SPIN.floor);

    // meteor: puffy glowing star + rainbow comet tail + twinkle glow
    for (let i = 0; i < MET_N; i++) {
      const col = new THREE.Color(RAINBOW[i % RAINBOW.length]);
      const cm = rimify(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.75, roughness: 0.3, metalness: 0.05 }), 0xffffff, 0.7, 2.4);
      const grp = new THREE.Group(); grp.visible = false;
      const core = new THREE.Mesh(GEO.star, cm); core.scale.setScalar(0.62);
      const tail = new THREE.Mesh(GEO.tail, fxMat(SH.tail, { uCol: { value: col.clone() }, uA: { value: 1 }, uHue: { value: i / 8 } }));
      const glow = new THREE.Mesh(GEO.bill, fxMat(SH.halo2, { uCol: { value: col.clone() }, uA: { value: 0.5 } }));
      glow.scale.setScalar(2.2); glow.renderOrder = 6; tail.renderOrder = 5;
      core.frustumCulled = tail.frustumCulled = glow.frustumCulled = false;
      grp.add(tail, glow, core);
      root.add(grp);
      METS.push({ st: 0, t0: 0, grp, core, tail, glow, col: RAINBOW[i % RAINBOW.length], x: 0, z: 0, emitT: 0,
        s: new THREE.Vector3(), d: new THREE.Vector3() });
    }
    // One reusable constellation flower: thin petal tracery and eight gold stars, no lights or per-cast meshes.
    const FLY_GEO = new THREE.SphereGeometry(0.42, 10, 8); FLY_GEO.userData.keep = true;
    const garden = GARDEN.grp = new THREE.Group(); garden.name = 'fireflyGarden'; garden.visible = false; root.add(garden);
    const pts = [];
    const edge = (a, b) => pts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    for (let petal = 0; petal < 8; petal++) {
      const a = petal * TAU / 8, ca = Math.cos(a), sa = Math.sin(a);
      let prev = null;
      for (let j = 0; j <= 40; j++) {
        const t = j / 40 * TAU, along = 1.62 * (1 - Math.cos(t)), side = 0.57 * Math.sin(t);
        const v = [ca * along - sa * side, 0.09 + 0.13 * Math.sin(t / 2), sa * along + ca * side];
        if (prev) edge(prev, v); prev = v;
      }
    }
    for (const r of [0.72, 3.55]) for (let j = 0; j < 96; j++) {
      const a = j / 96 * TAU, b = (j + 1) / 96 * TAU;
      edge([Math.cos(a) * r, 0.075, Math.sin(a) * r], [Math.cos(b) * r, 0.075, Math.sin(b) * r]);
    }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); ge.userData.keep = true;
    const lineMat = new THREE.LineBasicMaterial({ color: '#d8ff7a', transparent: true, opacity: 0.85, depthWrite: false });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#f2ff9e', emissive: '#d8ff5a', emissiveIntensity: 0.65, roughness: 0.3, metalness: 0.25, transparent: true, depthWrite: false });
    GARDEN.mats.push(lineMat, goldMat);
    const petals = GARDEN.petals = new THREE.LineSegments(ge, lineMat); petals.frustumCulled = false; garden.add(petals);
    for (let i = 0; i < 8; i++) {
      const star = new THREE.Mesh(FLY_GEO, goldMat); star.frustumCulled = false; garden.add(star); GARDEN.stars.push(star);   // ateşböcekleri
    }

    // Small raised blossoms around the rim. All eight flowers share one low-poly mesh and material.
    const flowerGeo = new THREE.BufferGeometry(), fv = [];
    for (let petal = 0; petal < 5; petal++) for (let j = 0; j < 8; j++) {
      const a = petal * TAU / 5 + j / 8 * TAU / 5, b = a + TAU / 40;
      const ra = 0.22 + 0.18 * Math.pow(Math.sin(j / 8 * Math.PI), 2), rb = 0.22 + 0.18 * Math.pow(Math.sin((j + 1) / 8 * Math.PI), 2);
      fv.push(0, 0.06, 0, Math.cos(a) * ra, 0.02, Math.sin(a) * ra, Math.cos(b) * rb, 0.02, Math.sin(b) * rb);
    }
    flowerGeo.setAttribute('position', new THREE.Float32BufferAttribute(fv, 3)); flowerGeo.computeVertexNormals(); flowerGeo.userData.keep = true;
    const flowerMat = new THREE.MeshBasicMaterial({ color: '#bff27a', transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
    GARDEN.mats.push(flowerMat);
    const heartGeo = new THREE.IcosahedronGeometry(1, 0); heartGeo.userData.keep = true;
    for (let i = 0; i < 8; i++) {
      const blossom = new THREE.Group(), flower = new THREE.Mesh(flowerGeo, flowerMat), gem = new THREE.Mesh(heartGeo, goldMat);
      gem.scale.setScalar(0.09); gem.rotation.x = -Math.PI / 2; gem.position.y = 0.09;
      blossom.add(flower, gem); garden.add(blossom); GARDEN.flowers.push(blossom);
    }

    // The hybrid's orbiting blades and crossed seal are allocated once, then hidden between casts.
    const bladeGeo = new THREE.OctahedronGeometry(1, 0), barGeo = new THREE.BoxGeometry(0.48, 0.09, 0.09);
    bladeGeo.userData.keep = barGeo.userData.keep = true;
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#c8f5a0', emissive: '#4f9a3c', emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.25, transparent: true });
    const hiltMat = new THREE.MeshBasicMaterial({ color: '#a8743f', transparent: true });
    HYBRID.mats.push(bladeMat, hiltMat);
    const makeBlade = () => {
      const g = new THREE.Group(), b = new THREE.Mesh(bladeGeo, bladeMat), h = new THREE.Mesh(barGeo, hiltMat);
      b.scale.set(0.12, 0.55, 0.07); b.position.y = 0.27; h.position.y = -0.22; g.add(b, h); return g;
    };
    HYBRID.guard = new THREE.Group(); HYBRID.guard.name = 'hybridGuard'; HYBRID.guard.visible = false; root.add(HYBRID.guard);
    for (let i = 0; i < 3; i++) { const b = makeBlade(); HYBRID.guard.add(b); HYBRID.blades.push(b); }
    HYBRID.seal = new THREE.Group(); HYBRID.seal.name = 'hybridSeal'; HYBRID.seal.visible = false; root.add(HYBRID.seal);
    const cross = HYBRID.cross = new THREE.Group(), sealSword = makeBlade(); sealSword.rotation.z = -0.65; sealSword.scale.setScalar(1.7); cross.add(sealSword);
    const wand = new THREE.Group(), stick = new THREE.Mesh(barGeo, hiltMat), jewel = new THREE.Mesh(bladeGeo, bladeMat);
    stick.scale.set(0.23, 15, 1); jewel.scale.setScalar(0.19); jewel.position.y = 0.72; wand.add(stick, jewel); wand.rotation.z = 0.65;
    cross.add(wand); HYBRID.seal.add(cross);

    starMat = glowMat('#ffd23f', 3.2); starMat.userData.keep = true;   // fallback star projectile (no FX.projectile)
  }

  // Compile all programs once against the live scene (lights/fog) so the first cast doesn't stutter.
  function warmUp() {
    S.warm = true;
    ensure();
    try { if (renderer.compileAsync) renderer.compileAsync(S.root, camera, scene).catch(() => {}); else renderer.compile(S.root, camera, scene); } catch (e) { /* ignore */ }
  }

  // ── Rune circles ──
  function circle(x, z, color, r, dur, mode, follow) {
    let c = null;
    for (let i = 0; i < CIRC.length; i++) if (!CIRC[i].on) { c = CIRC[i]; break; }
    if (!c) return null;
    c.on = true; c.alpha = 1; c.t = 0; c.dur = dur; c.mode = mode; c.r = r; c.follow = !!follow;
    c.u.uCol.value.set(color); c.u.uMode.value = mode; c.u.uA.value = 0; c.u.uRot.value = frand(0, TAU);
    c.mesh.position.set(x, 0.035 + mode * 0.008, z); c.mesh.scale.setScalar(r); c.mesh.visible = true;
    return c;
  }
  function updateCircles(dt) {
    const P = S.P;
    for (let i = 0; i < CIRC.length; i++) {
      const c = CIRC[i];
      if (!c.on) continue;
      c.t += dt;
      const k = c.t / c.dur;
      if (k >= 1) { c.on = false; c.mesh.visible = false; continue; }
      const u = c.u;
      if (c.mode === 0) {
        const g = Math.min(1, k * 4);
        c.mesh.scale.setScalar(c.r * (0.45 + 0.55 * (1 - (1 - g) * (1 - g) * (1 - g))));
        u.uA.value = Math.min(1, k * 10) * (1 - k * k);
        u.uRot.value += dt * 2.2;
        if (c.follow && P) c.mesh.position.set(P.pos.x, 0.035, P.pos.z);
      } else if (c.mode === 1) {
        u.uK.value = Math.min(1, k * 1.05);
        u.uA.value = Math.min(1, k * 8) * (k > 0.93 ? (1 - k) / 0.07 : 1);
        u.uRot.value -= dt * 2.5;
        c.mesh.scale.setScalar(c.r * (1.15 - 0.15 * Math.min(1, k * 5)));
      } else {
        u.uK.value = 0.25 + 0.72 * (1 - (1 - k) * (1 - k));
        u.uA.value = 1 - k;
      }
      u.uA.value *= c.alpha;
    }
  }

  // ── Cast helpers ──
  const CTX = { P: null, H: null, target: null, aim: { x: 0, z: 1 }, x: 0, z: 0 };
  function prep(ctx) {
    const g = gm();
    ctx = ctx || {};
    const P = ctx.P || (g && g.P);
    if (!P || !P.pos || P.dead) return null;
    if (!S.ready) ensure();
    S.P = CTX.P = P; S.H = CTX.H = ctx.H || (g && g.H) || null;
    CTX.x = P.pos.x; CTX.z = P.pos.z;
    let t = ctx.target;
    if (t === undefined) t = nearest(CTX.x, CTX.z, 12);
    CTX.target = alive(t) ? t : null;
    const a = ctx.aim;
    if (a && (a.x || a.z)) { const l = Math.hypot(a.x, a.z); CTX.aim.x = a.x / l; CTX.aim.z = a.z / l; }
    else if (CTX.target) aimAt(CTX.target.x, CTX.target.z);
    else { CTX.aim.x = Math.sin(P.face || 0); CTX.aim.z = Math.cos(P.face || 0); }
    return CTX;
  }
  function aimAt(x, z) {
    const dx = x - CTX.x, dz = z - CTX.z, l = Math.hypot(dx, dz);
    if (l > 1e-4) { CTX.aim.x = dx / l; CTX.aim.z = dz / l; }
  }
  function castPose(c, id, face) {
    const P = c.P;
    S.castLeft = CAST_T; P.castT = CAST_T; P.castDur = CAST_T; P.castSkill = id;
    if (face) P.face = Math.atan2(c.aim.x, c.aim.z);
  }

  // ── 1. Yıldız Atışı: three bright stars converge on visible foes, then pierce through the crowd ──
  // The stars start STAR_GAP apart (not all on one point) and the hand burst stays soft (colour ≤ 1, no bloom),
  // so the first frames show three distinct stars instead of one white flash.
  function castStar(c) {
    const g = gm(); if (!g || !g.spawnProjectile) return false;
    castPose(c, 'yildiz', true);
    const base = Math.atan2(c.aim.x, c.aim.z), dmg = Math.max(1, Math.round(STAR_K * sword() + STAR_ADD));
    const targets = near(c.x, c.z, 10.8).filter(e => {
      const dx = e.x - c.x, dz = e.z - c.z, d = Math.hypot(dx, dz);
      return alive(e) && inSight(c.x, c.z, e) && (d < 0.1 || (dx * c.aim.x + dz * c.aim.z) / d > 0.72);
    });
    targets.sort((a, b) => a === c.target ? -1 : b === c.target ? 1 : dist2(c.x, c.z, a.x, a.z) - dist2(c.x, c.z, b.x, b.z));
    const ax = c.aim.x, az = c.aim.z, rx = az, rz = -ax;   // aim and its side (same side as a positive fan angle)
    for (let i = -1; i <= 1; i++) {
      const x0 = c.x + ax * STAR_FWD + rx * i * STAR_GAP, z0 = c.z + az * STAR_FWD + rz * i * STAR_GAP;
      const target = targets[(i === 0 ? 0 : i < 0 ? 1 : 2) % Math.max(1, targets.length)];
      const a = target ? Math.atan2(target.x - x0, target.z - z0) : base + i * STAR_FAN, dx = Math.sin(a), dz = Math.cos(a);
      let obj = fxOk('projectile') ? FX.projectile('star', '#ffd23f') : null;
      if (!obj) { obj = new THREE.Mesh(GEO.star, starMat); obj.scale.setScalar(0.3); }
      obj.scale.multiplyScalar(1.25); obj.position.set(x0, STAR_Y, z0);
      g.spawnProjectile({ x: x0, y: STAR_Y, z: z0, vx: dx * 16, vz: dz * 16, r: 0.5, dmg, owner: 'feza', kind: 'star', life: 0.8, pierce: 2, obj, color: '#ffd23f', onHit: starHit });
      puff(x0, STAR_Y, z0, dx * 1.6, 0.25, dz * 1.6, 0.28, 0.3, 0.05, '#ffe27a', '#ffb638', 1, 0, 3, 1);   // soft kick-off star
    }
    for (let i = 0; i < 3; i++) {   // a few faint twinkles around the hand
      puff(c.x + ax * 0.4 + frand(-0.3, 0.3), STAR_Y + frand(-0.15, 0.25), c.z + az * 0.4 + frand(-0.3, 0.3),
        frand(-0.4, 0.4), frand(0.3, 0.9), frand(-0.4, 0.4), frand(0.3, 0.45), frand(0.16, 0.24), 0.02, '#fff1b0', '#ffd23f', 2, 0, 1, 1);
    }
    circle(c.x, c.z, '#ffd23f', 1.25, 0.45, 0, true);
    sfx('star', { x: c.x, z: c.z });
    return true;
  }

  function starHit(p) {
    fxRing(p.x, p.z, { r0: 0.12, r1: 0.8, dur: 0.22, color: '#ffe285', width: 0.13 });
    burst('sparkle', p.x, p.y, p.z, { color: '#ffd23f', count: 4 });
  }

  // ── 2. Kasırga: Feza whirls, wind funnel hits everything around him ──
  function castSpin(c) {
    if (SPIN.t > 0.3) return false;
    castPose(c, 'kasirga', false);
    SPIN.t = SPIN.dur = SPIN_T; SPIN.tick = 0.06; SPIN.n = 0; SPIN.ang = c.P.face || 0;
    c.P.spin = SPIN_T;
    SPIN.grp.position.set(c.x, 0, c.z); SPIN.grp.visible = true;
    circle(c.x, c.z, '#7ee0ff', 1.6, 0.6, 0, true);
    fxRing(c.x, c.z, { r0: 0.5, r1: 3.2, dur: 0.4, color: '#bff4ff', width: 0.4 });
    burst('dust', c.x, 0.1, c.z, { count: 14 });
    sfx('spin', { x: c.x, z: c.z });
    word(c.x, c.z, 'Vuuş!');
    return true;
  }
  function spinHit(P) {
    const x = P.pos.x, z = P.pos.z, list = near(x, z, SPIN_R);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      hurt(e, Math.max(1, Math.round(0.6 * sword())), { kb: 0.35, fromX: x, fromZ: z, kind: 'spin' });
      burst('hit', e.x, eY(e), e.z, { color: '#bff4ff' });
    }
    smash(x, z, SPIN_R);
    SPIN.n++;
    if (fxOk('slash')) FX.slash(x, 0.75, z, SPIN.ang, 1, '#dff8ff', 2.0, 2.6);
    if (SPIN.n % 3 === 0) fxRing(x, z, { r0: 1.2, r1: SPIN_R + 0.2, dur: 0.3, color: '#9fe9ff', width: 0.2 });
    if (SPIN.n % 3 === 1) sfx('whoosh', { vol: 0.5, pitch: 1 + (SPIN.n % 2) * 0.1, x, z });
  }
  function updateSpin(dt) {
    const P = S.P;
    if (!P || P.dead || (P.spin <= 0 && SPIN.t < SPIN.dur - 0.05)) { endSpin(); return; }
    SPIN.t -= dt;
    P.spin = Math.max(0, SPIN.t);
    const x = P.pos.x, z = P.pos.z;
    SPIN.grp.position.set(x, 0, z);
    const el = SPIN.dur - SPIN.t, a = smooth01(el / 0.18) * smooth01(SPIN.t / 0.35);
    SPIN.inner.material.uniforms.uA.value = a;
    SPIN.outer.material.uniforms.uA.value = a * 0.85;
    SPIN.floor.material.uniforms.uA.value = a;
    SPIN.inner.rotation.y += dt * 9; SPIN.outer.rotation.y += dt * 6; SPIN.floor.rotation.y += dt * 4;
    SPIN.inner.scale.setScalar(0.8 + 0.2 * a); SPIN.outer.scale.set(0.75 + 0.25 * a, 0.6 + 0.4 * a, 0.75 + 0.25 * a);
    SPIN.ang += dt * 16;
    SPIN.tick -= dt;
    if (SPIN.tick <= 0) { SPIN.tick += SPIN_TICK; spinHit(P); }
    SPIN.emitT -= dt;
    while (SPIN.emitT <= 0 && a > 0.2) {   // sparkles and little leaves whirled around Feza
      SPIN.emitT += 0.028;
      const an = frand(0, TAU), r = frand(1.0, 1.9), s = Math.sin(an), co = Math.cos(an);
      orbit(frand(7, 10), x, z);
      puff(x + s * r, frand(0.2, 1.8), z + co * r, s * 1.2, frand(0.6, 1.6), co * 1.2, frand(0.35, 0.5), frand(0.2, 0.32), 0.04,
        fpick(WIND_COLS), '#7ee0ff', 2, 0, 1.5, 2.4);
      const k = frand();
      if (k < 0.35) {
        orbit(frand(6, 8.5), x, z);
        puff(x + s * r * 1.15, frand(0.3, 1.5), z + co * r * 1.15, s * 0.8, frand(1.0, 2.0), co * 0.8, frand(0.6, 0.8), frand(0.46, 0.58), 0.3,
          fpick(LEAF_COLS), null, 10, 1.5, 0.6, 1, false);
      } else if (k < 0.42) puff(x + s * r * 1.1, 0.12, z + co * r * 1.1, co * 3, 0.5, -s * 3, 0.5, 0.35, 0.8, '#eef8ff', '#ffffff', 3, 0, 2, 1, false);
    }
    if (SPIN.t <= 0) endSpin();
  }
  function endSpin() {
    if (SPIN.t > 0 && S.P && S.P.spin > 0) S.P.spin = 0;
    SPIN.t = 0;
    if (SPIN.grp) SPIN.grp.visible = false;
  }

  // ── 3. Meteor Yağmuru: rainbow star-stones rain on the huysuz crowd ──
  function castMeteor(c) {
    castPose(c, 'meteor', true);
    let cx = c.x + c.aim.x * 5, cz = c.z + c.aim.z * 5;
    if (c.target) {   // centre on the crowd around the target (the ones Feza can see: not a group behind the wall)
      const cl = near(c.target.x, c.target.z, 4.5);
      let sx = c.target.x * 2, sz = c.target.z * 2, n = 2;
      for (let i = 0; i < cl.length; i++) if (inSight(c.x, c.z, cl[i])) { sx += cl[i].x; sz += cl[i].z; n++; }
      cx = sx / n; cz = sz / n;
    }
    // (an empty cast toward a wall rains on the nearest floor he can see, like the garden and the seal)
    for (let i = 0; i < 12 && (!isFloor(cx, cz) || !inSight(c.x, c.z, { x: cx, z: cz })); i++) { cx = lerp(cx, c.x, 0.3); cz = lerp(cz, c.z, 0.3); }
    MET.cx = cx; MET.cz = cz; MET.fx = c.x; MET.fz = c.z; MET.aimed.length = 0; MET.spots.length = 0; MET.first = true;
    let k = 0;
    for (let i = 0; i < METS.length && k < MET_N; i++) {
      const m = METS[i];
      if (m.st) continue;
      m.st = 1; m.t0 = S.t + 0.1 + k / (MET_N - 1) * (MET_SPAN - MET_LAND) + frand(-0.03, 0.03);
      k++;
    }
    circle(c.x, c.z, '#ff9a3c', 1.6, 0.6, 0, true);
    burst('magic', c.x, 1.4, c.z, { color: '#ff9a3c' });
    sfx('star', { x: c.x, z: c.z, pitch: 0.8 });
    return true;
  }
  function meteorSpot(m) {
    const cand = near(MET.cx, MET.cz, 5.5);
    let best = null, bs = 1e9;
    for (let i = 0; i < cand.length; i++) {
      const e = cand[i];
      if (!alive(e) || !inSight(MET.fx, MET.fz, e)) continue;   // (seen from where Feza cast it)
      let n = 0;
      for (let j = 0; j < MET.aimed.length; j++) if (MET.aimed[j] === e) n++;
      const s = n * 3 + Math.sqrt(dist2(MET.cx, MET.cz, e.x, e.z)) * 0.25 + frand(0, 1.2);
      if (n < 2 && s < bs) { bs = s; best = e; }
    }
    let x = 0, z = 0;
    if (best && MET.aimed.length < 6) {
      MET.aimed.push(best);
      x = best.x + frand(-0.35, 0.35); z = best.z + frand(-0.35, 0.35);
    } else {
      let found = false;
      for (let tries = 0; tries < 12 && !found; tries++) {
        const a = frand(0, TAU), r = Math.sqrt(frand()) * 3.6;
        x = MET.cx + Math.sin(a) * r; z = MET.cz + Math.cos(a) * r;
        let ok = isFloor(x, z) && inSight(MET.fx, MET.fz, { x, z });   // (floor Feza can see: not the room behind the wall)
        for (let j = Math.max(0, MET.spots.length - 6); ok && j < MET.spots.length; j += 2) if (dist2(x, z, MET.spots[j], MET.spots[j + 1]) < 2.2) ok = false;
        found = ok;
      }
      if (!found) { x = MET.cx; z = MET.cz; }   // (castMeteor made the centre visible floor)
    }
    MET.spots.push(x, z);
    m.x = x; m.z = z;
    const cw = camera.matrixWorld;
    V1.setFromMatrixColumn(cw, 0).multiplyScalar(-MET_SIDE); V2.setFromMatrixColumn(cw, 1).multiplyScalar(MET_UP);
    m.s.set(x, 0.25, z).add(V1).add(V2);
    m.s.lerp(camera.position, MET_PULL);
    m.d.set(x, 0.25, z).sub(m.s);
    const len = m.d.length();
    m.d.multiplyScalar(1 / len);
    m.tail.quaternion.setFromUnitVectors(UP, m.d);
  }
  function updateMeteors(dt) {
    for (let i = 0; i < METS.length; i++) {
      const m = METS[i];
      if (!m.st) continue;
      const age = S.t - m.t0;
      if (age < 0) continue;
      if (m.st === 1) {
        meteorSpot(m);
        circle(m.x, m.z, m.col, MET_R * 0.82, MET_LAND + 0.03, 1, false);
        m.st = 2;
      }
      if (m.st === 2 && age >= MET_FALL0) {
        m.st = 3; m.grp.visible = true; m.emitT = 0;
        sfx('meteorFall', { vol: 0.7, x: m.x, z: m.z });
      }
      if (m.st === 3) {
        const k = clamp((age - MET_FALL0) / (MET_LAND - MET_FALL0), 0, 1), e = Math.pow(k, 1.35);
        const x = lerp(m.s.x, m.x, e), y = lerp(m.s.y, 0.25, e), z = lerp(m.s.z, m.z, e);
        m.grp.position.set(x, y, z);
        m.core.quaternion.copy(camera.quaternion);          // star face toward the camera, spinning like a pinwheel
        m.core.rotateX(0.35); m.core.rotateZ(-S.t * 7 - i);
        m.core.scale.setScalar(0.72 * (1 + 0.07 * Math.sin(S.t * 30)));
        m.glow.quaternion.copy(camera.quaternion);
        const tl = 4.2 * Math.min(1, k * 3 + 0.25);
        m.tail.scale.set(0.42, tl, 0.42);
        m.emitT -= dt;
        while (m.emitT <= 0) {   // sparkly rainbow trail
          m.emitT += 0.016;
          puff(x + frand(-0.2, 0.2), y + frand(-0.2, 0.2), z + frand(-0.2, 0.2), frand(-0.6, 0.6), frand(-0.2, 0.8), frand(-0.6, 0.6),
            frand(0.35, 0.6), frand(0.25, 0.45), 0, fpick(RAINBOW), '#ffffff', frand() < 0.5 ? 1 : 2, -1, 1.5);
        }
        if (age >= MET_LAND) meteorBoom(m);
      }
    }
  }
  function meteorBoom(m) {
    m.st = 0; m.grp.visible = false;
    const x = m.x, z = m.z, list = near(x, z, MET_R);
    // walls stop the blast, as for the frost flower and the seal (seen from the landing spot; a stone aimed at a huysuz by a
    // wall may land a hair inside the wall cell → from the visible centre instead)
    const fl = isFloor(x, z), sx = fl ? x : MET.cx, sz = fl ? z : MET.cz;
    for (let i = 0; i < list.length; i++) if (inSight(sx, sz, list[i]))
      hurt(list[i], Math.max(1, Math.round(2 * sword())), { kb: 1.2, fromX: x, fromZ: z, kind: 'meteor' });
    smash(x, z, MET_R);
    fxRing(x, z, { r0: 0.4, r1: MET_R + 0.5, dur: 0.4, color: m.col, width: 0.5 });
    burst('hit', x, 0.6, z, { color: m.col, scale: 1.4 });
    burst('sparkle', x, 0.6, z, { color: m.col, count: 14 });
    lightFlash(x, z, m.col, 4, 0.28);
    shake(0.22);
    sfx('boom', { vol: 0.8, x, z, pitch: frand(0.9, 1.15) });
    if (MET.first) { MET.first = false; word(x, z, 'Güm!'); }
  }

  // ── Büyücü: light arrows, a frost flower and a little garden of stars ──
  // Reuse the FX pools and rune circles. No wall-clock timers: pause, sleep and a new zone stop the magic together.
  const MAGIC = { t: 0, tick: 0, emitT: 0, x: 0, z: 0, n: 0, dmg: 0, shield: null };
  function clearMagic() {
    MAGIC.t = MAGIC.tick = MAGIC.emitT = 0;
    if (GARDEN.grp) GARDEN.grp.visible = false;
    if (MAGIC.shield) { MAGIC.shield.remove(); MAGIC.shield = null; }
  }
  function inSight(x, z, e) {
    const g = gm();
    return !(g && g.L && typeof LEVEL !== 'undefined' && LEVEL.los) || LEVEL.los(g.L, x, z, e.x, e.z);
  }
  function castArrows(c) {
    castPose(c, 'yaprakoklari', true);
    const g = gm();
    if (!g || !g.spawnProjectile) return false;
    const targets = near(c.x, c.z, 11).filter(e => alive(e) && inSight(c.x, c.z, e));
    targets.sort((a, b) => dist2(c.x, c.z, a.x, a.z) - dist2(c.x, c.z, b.x, b.z));
    for (let i = 0; i < 3; i++) {
      const side = (i - 1) * 0.32, x = c.x + c.aim.x * 0.6 + c.aim.z * side, z = c.z + c.aim.z * 0.6 - c.aim.x * side;
      const e = targets[i % Math.max(1, targets.length)];
      const a = e ? Math.atan2(e.x - x, e.z - z) : Math.atan2(c.aim.x, c.aim.z) + (i - 1) * 0.16;
      g.spawnProjectile({ x, y: 1.05, z, vx: Math.sin(a) * 17, vz: Math.cos(a) * 17, r: 0.4,
        dmg: Math.max(1, Math.round(sword() * 0.82 + 2)), owner: 'feza', kind: 'arcane', color: '#9be06a', life: 0.72, pierce: 1 });
      puff(x, 1.05, z, 0, 0.4, 0, 0.35, 0.3, 0, '#e2f7b8', '#4f9a3c', 2, 0, 1, 1.4);
    }
    circle(c.x, c.z, '#9be06a', 1.2, 0.5, 0, true);
    sfx('star', { x: c.x, z: c.z, pitch: 1.2 });
    return true;
  }
  function frostBloom(p) {
    const list = near(p.x, p.z, 3.1);
    for (let i = 0; i < list.length; i++) if (inSight(p.x, p.z, list[i]))
      hurt(list[i], Math.max(1, Math.round(p.dmg * 1.6)), { freeze: 2.2, kb: 0.3, fromX: p.x, fromZ: p.z, kind: 'ice' });
    smash(p.x, p.z, 3.1);
    circle(p.x, p.z, '#ffb3d1', 3.1, 0.75, 2, false);
    fxRing(p.x, p.z, { r0: 0.2, r1: 3.1, dur: 0.55, color: '#ffd6e6', width: 0.35 });
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      puff(p.x, 0.6, p.z, Math.sin(a) * 4, 1.3, Math.cos(a) * 4, 0.65, 0.4, 0.03, '#ffe0ec', '#f08ab5', 2, 2, 2, 1.5);
    }
    sfx('star', { x: p.x, z: p.z, pitch: 1.5 });
  }
  function castFrost(c) {
    castPose(c, 'cicekkalkani', true);
    const g = gm();
    if (!g || !g.spawnProjectile) return false;
    c.P.shield = Math.max(c.P.shield || 0, 2.2);
    if (MAGIC.shield) MAGIC.shield.remove();
    MAGIC.shield = fxOk('shield') ? FX.shield(c.H && c.H.root ? c.H.root : c.P.pos) : null;
    g.spawnProjectile({ x: c.x + c.aim.x * 0.55, y: 1, z: c.z + c.aim.z * 0.55,
      vx: c.aim.x * 13, vz: c.aim.z * 13, r: 0.65, dmg: Math.max(1, Math.round(sword())),
      owner: 'feza', kind: 'ice', color: '#ffb3d1', life: 0.95, freeze: 2.2, onHit: frostBloom });
    circle(c.x, c.z, '#ffd6e6', 1.4, 2.2, 0, true);
    burst('magic', c.x, 1.2, c.z, { color: '#ffb3d1', count: 8 });
    sfx('shield', { x: c.x, z: c.z, vol: 0.6 });
    return true;
  }
  function castGarden(c) {
    castPose(c, 'atesbocegibahcesi', true);
    let x = c.target ? c.target.x : c.x + c.aim.x * 5, z = c.target ? c.target.z : c.z + c.aim.z * 5;
    // An empty cast at a wall still makes a garden on the nearest reachable floor.
    for (let i = 0; i < 12 && (!isFloor(x, z) || !inSight(c.x, c.z, { x, z })); i++) { x = lerp(x, c.x, 0.3); z = lerp(z, c.z, 0.3); }
    MAGIC.x = x; MAGIC.z = z; MAGIC.t = 3.2; MAGIC.tick = 0.25; MAGIC.emitT = 0; MAGIC.n = 0; MAGIC.dmg = Math.max(1, Math.round(sword() * 0.95));
    GARDEN.grp.position.set(x, 0, z); GARDEN.grp.visible = true; GARDEN.grp.scale.setScalar(0.05);
    const ground = circle(x, z, '#7fbf4a', 3.6, MAGIC.t, 0, false); if (ground) ground.alpha = 0.22;
    circle(c.x, c.z, '#eaffb0', 1.2, 0.55, 0, true);
    sfx('star', { x, z, pitch: 0.8 });
    return true;
  }
  function updateMagic(dt) {
    const P = S.P;
    if (P && P.dead) { clearMagic(); return; }
    if (MAGIC.shield && (!P || !(P.shield > 0))) { MAGIC.shield.remove(); MAGIC.shield = null; }
    if (MAGIC.t <= 0) { if (GARDEN.grp) GARDEN.grp.visible = false; return; }
    MAGIC.t -= dt; MAGIC.tick -= dt; MAGIC.emitT -= dt;
    const x = MAGIC.x, z = MAGIC.z, age = 3.2 - MAGIC.t;
    const fade = smooth01(Math.max(0, MAGIC.t) / 0.45), open = smooth01(age / 0.35), beat = Math.pow(Math.max(0, Math.cos((age - 0.25) * TAU * 2)), 5);
    GARDEN.grp.visible = MAGIC.t > 0;
    GARDEN.grp.scale.setScalar(0.1 + 0.9 * open);
    GARDEN.petals.rotation.y = age * 0.18;
    GARDEN.mats[0].opacity = fade * (0.55 + 0.35 * beat); GARDEN.mats[1].opacity = fade; GARDEN.mats[2].opacity = fade * 0.72;
    for (let i = 0; i < GARDEN.flowers.length; i++) {
      const blossom = GARDEN.flowers[i], a = i * TAU / 8 + age * 0.18;
      blossom.position.set(Math.cos(a) * 2.75, 0.16 + 0.12 * Math.sin(age * 3 + i), Math.sin(a) * 2.75);
      blossom.scale.setScalar((0.7 + 0.3 * open + beat * 0.22) * fade); blossom.rotation.y = -age * 0.45 + i;
    }
    for (let i = 0; i < GARDEN.stars.length; i++) {
      const star = GARDEN.stars[i], a = i * TAU / 8 - age * 0.3, r = 3.1;
      star.position.set(Math.cos(a) * r, 0.6 + 0.28 * Math.sin(age * 3 + i) + beat * 0.45, Math.sin(a) * r);
      star.quaternion.copy(camera.quaternion); star.rotateZ(Math.sin(age * 2 + i) * 0.18);
      star.scale.setScalar((0.25 + beat * 0.09) * (0.5 + 0.5 * fade));
    }
    if (MAGIC.tick <= 0 && MAGIC.n < 6) {
      MAGIC.tick += 0.5; MAGIC.n++;
      const list = near(x, z, 3.6);
      for (let i = 0; i < list.length; i++) if (inSight(x, z, list[i])) {
        const e = list[i];
        hurt(e, MAGIC.dmg, { kind: 'magic', fromX: x, fromZ: z, kb: 0.08 });
        burst('sparkle', e.x, eY(e), e.z, { color: '#f2ff9e', count: 4 });
      }
      smash(x, z, 3.6);
      fxRing(x, z, { r0: 0.2, r1: 3.6, dur: 0.55, color: '#d8ff7a', width: 0.22 });
      // Every damage beat sends a crown of star-petals upward, so the six pulses can be seen as well as heard.
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + MAGIC.n * 0.2, r = 2.4;
        puff(x + Math.cos(a) * r, 0.25, z + Math.sin(a) * r, Math.cos(a) * 0.35, 2.5, Math.sin(a) * 0.35,
          0.7, 0.32, 0.02, i % 2 ? '#f2ff9e' : '#c8f07a', '#6fa83a', i % 2 ? 1 : 10, 1.5, 0.4, 1.25);
      }
      sfx('star', { x, z, vol: 0.35, pitch: 1 + MAGIC.n * 0.08 });
    }
    if (MAGIC.emitT <= 0) {
      MAGIC.emitT += 0.09;
      for (let i = 0; i < 3; i++) {
        const a = S.t * 1.5 + i * TAU / 3, r = 2.5;
        puff(x + Math.sin(a) * r, 1.5 + Math.sin(a * 2) * 0.5, z + Math.cos(a) * r, 0, 0.3, 0,
          0.5, 0.35, 0.02, i === 1 ? '#fff7b0' : '#d8ff7a', '#7fbf4a', 1, 0, 1, 1.5);
      }
    }
  }

  // ── Büyülü Şövalye: a travelling sword crescent, a protective bond, and a crossed rainbow seal ──
  const MUSH = ['#ff7b6b', '#ffd166', '#fff3dc', '#ff9f6a', '#c8f07a', '#ffb3d1'];   // Mantar Halkası: kırmızı-benekli, sarı, krem mantar renkleri
  function hybridDamage(P, magic) { return Math.max(1, (magic ? P.magicDmg : P.meleeDmg) || P.dmg || 10); }
  function castCrescent(c) {
    const g = gm(); if (!g || !g.spawnProjectile) return false;
    castPose(c, 'yaprakhilali', true);
    // Three visible crescents share a modest +20% volley, rather than tripling the old hit.
    const total = Math.max(3, Math.round(hybridDamage(c.P, false) * 1.62 + hybridDamage(c.P, true) * 0.78));
    const targets = near(c.x, c.z, 10.8).filter(e => {
      const dx = e.x - c.x, dz = e.z - c.z, d = Math.hypot(dx, dz);
      return alive(e) && inSight(c.x, c.z, e) && (d < 0.1 || (dx * c.aim.x + dz * c.aim.z) / d > 0.72);
    });
    targets.sort((a, b) => a === c.target ? -1 : b === c.target ? 1 : dist2(c.x, c.z, a.x, a.z) - dist2(c.x, c.z, b.x, b.z));
    for (let i = 0; i < 3; i++) {
      const side = (i - 1) * 0.7, x = c.x + c.aim.x * 0.6 + c.aim.z * side, z = c.z + c.aim.z * 0.6 - c.aim.x * side;
      const e = targets[(i === 1 ? 0 : i === 0 ? 1 : 2) % Math.max(1, targets.length)];
      const a = e ? Math.atan2(e.x - x, e.z - z) : Math.atan2(c.aim.x, c.aim.z) + (i - 1) * 0.16;
      const dmg = Math.floor(total / 3) + (i < total % 3 ? 1 : 0);
      g.spawnProjectile({ x, y: 0.85, z, vx: Math.sin(a) * 13, vz: Math.cos(a) * 13,
        r: 0.65, dmg, owner: 'feza', kind: 'crescent', color: '#9be06a', life: 0.85, pierce: 3, kb: 0.15 });
    }
    if (fxOk('slash')) FX.slash(c.x, 0.8, c.z, c.P.face, 1, '#9be06a', 1.7, 2.5);
    circle(c.x, c.z, '#9be06a', 1.1, 0.45, 0, true);
    sfx('whoosh', { x: c.x, z: c.z, pitch: 1.15 }); return true;
  }
  function castBond(c) {
    castPose(c, 'sarmasikbagi', false);
    HYBRID.t = 3; HYBRID.tick = 0.25; HYBRID.n = 0;
    HYBRID.dmg = Math.round((hybridDamage(c.P, false) + hybridDamage(c.P, true)) * 0.34);
    c.P.shield = Math.max(c.P.shield || 0, 1.8);
    if (HYBRID.shield) HYBRID.shield.remove();
    HYBRID.shield = fxOk('shield') ? FX.shield(c.H && c.H.root ? c.H.root : c.P.pos) : null;
    HYBRID.guard.visible = true; HYBRID.guard.position.set(c.x, 0, c.z);
    const mark = circle(c.x, c.z, '#7fd38a', 2.8, 3, 0, true); if (mark) mark.alpha = 0.32;
    sfx('shield', { x: c.x, z: c.z, vol: 0.7 }); return true;
  }
  function castSeal(c) {
    castPose(c, 'mantarhalkasi', true);
    let x = c.target ? c.target.x : c.x + c.aim.x * 4.5, z = c.target ? c.target.z : c.z + c.aim.z * 4.5;
    for (let i = 0; i < 12 && (!isFloor(x, z) || !inSight(c.x, c.z, { x, z })); i++) { x = lerp(x, c.x, 0.3); z = lerp(z, c.z, 0.3); }
    HYBRID.x = x; HYBRID.z = z; HYBRID.sealT = 3.3; HYBRID.sealTick = 0.65; HYBRID.sealN = 0;
    HYBRID.sealDmg = Math.round((hybridDamage(c.P, false) + hybridDamage(c.P, true)) * 0.48);
    HYBRID.seal.position.set(x, 0, z); HYBRID.seal.visible = true;
    const mark = circle(x, z, '#ff9f6a', 3.8, 3.3, 0, false); if (mark) mark.alpha = 0.4;
    circle(c.x, c.z, '#9be06a', 1.3, 0.6, 0, true);
    sfx('star', { x, z, pitch: 0.75 }); return true;
  }
  function clearHybrid() {
    HYBRID.t = HYBRID.sealT = HYBRID.tick = HYBRID.sealTick = 0;
    if (HYBRID.guard) HYBRID.guard.visible = false;
    if (HYBRID.seal) HYBRID.seal.visible = false;
    if (HYBRID.shield) { HYBRID.shield.remove(); HYBRID.shield = null; }
  }
  function updateHybrid(dt) {
    const P = S.P;
    if (!P || P.dead || P.heroClass !== 'hybrid') { clearHybrid(); return; }
    if (HYBRID.shield && !(P.shield > 0)) { HYBRID.shield.remove(); HYBRID.shield = null; }
    if (HYBRID.t > 0) {
      HYBRID.t -= dt; HYBRID.tick -= dt;
      const x = P.pos.x, z = P.pos.z, fade = smooth01(Math.max(0, HYBRID.t) / 0.35);
      HYBRID.guard.visible = HYBRID.t > 0; HYBRID.guard.position.set(x, 0, z);
      for (let i = 0; i < HYBRID.blades.length; i++) {
        const b = HYBRID.blades[i], a = S.t * 3.8 + i * TAU / 3;
        b.position.set(Math.sin(a) * 1.8, 1 + Math.sin(a * 2) * 0.2, Math.cos(a) * 1.8);
        b.rotation.set(0.35, a, -0.3); b.scale.setScalar(fade);
      }
      if (HYBRID.tick <= 0 && HYBRID.n < 4) {
        HYBRID.tick += 0.7; HYBRID.n++;
        const list = near(x, z, 3.1).filter(e => alive(e) && inSight(x, z, e));
        for (let i = 0; i < list.length; i++) {
          const e = list[i]; hurt(e, HYBRID.dmg, { kb: 0.18, fromX: x, fromZ: z, kind: 'magic' });
          if (i < 3 && fxOk('lightning')) FX.lightning([{ x, y: 1.3, z }, { x: e.x, y: eY(e), z: e.z }], '#9be06a');
        }
        fxRing(x, z, { r0: 1.2, r1: 3.1, dur: 0.4, color: '#9be06a', width: 0.13 });
        smash(x, z, 3.1);
      }
    }
    if (HYBRID.sealT > 0) {
      HYBRID.sealT -= dt; HYBRID.sealTick -= dt;
      const x = HYBRID.x, z = HYBRID.z, age = 3.3 - HYBRID.sealT, fade = smooth01(Math.max(0, HYBRID.sealT) / 0.35);
      HYBRID.seal.visible = HYBRID.sealT > 0;
      HYBRID.cross.position.y = 1.45 + Math.sin(age * 2) * 0.15;
      HYBRID.cross.quaternion.copy(camera.quaternion); HYBRID.cross.rotateZ(Math.sin(age * 3) * 0.08);
      HYBRID.cross.scale.setScalar(smooth01(age / 0.55) * fade);
      if (HYBRID.sealTick <= 0 && HYBRID.sealN < 6) {
        HYBRID.sealTick += 0.45; const color = MUSH[HYBRID.sealN++ % MUSH.length];
        const list = near(x, z, 3.8);
        for (let i = 0; i < list.length; i++) if (inSight(x, z, list[i]))
          hurt(list[i], HYBRID.sealDmg, { kb: 0.12, fromX: x, fromZ: z, kind: 'magic' });
        smash(x, z, 3.8);
        fxRing(x, z, { r0: 0.35, r1: 3.8, dur: 0.55, color, width: 0.22 });
        if (fxOk('slash')) FX.slash(x, 0.9, z, age * 2, 1, color, 2.4, 2.8);
        for (let i = 0; i < 10; i++) {
          const a = i * TAU / 10 + age;
          puff(x + Math.sin(a) * 2.8, 0.3, z + Math.cos(a) * 2.8, 0, 1.8, 0, 0.65, 0.28, 0.02, color, '#ffffff', 2, 1, 0.3, 1.3);
        }
        sfx('star', { x, z, vol: 0.4, pitch: 0.9 + HYBRID.sealN * 0.1 });
      }
    }
  }

  // ── Main hooks ──
  function update(dt) {
    if (!S.warm) warmUp();
    S.t += dt; uT.value = S.t;
    const P = S.P || (gm() && gm().P);
    if (S.castLeft > 0) { S.castLeft = Math.max(0, S.castLeft - dt); if (P) P.castT = S.castLeft; }
    if (P && P.shield > 0) P.shield = Math.max(0, P.shield - dt);
    if (SPIN.t > 0) updateSpin(dt);
    updateMeteors(dt);
    updateMagic(dt);
    updateHybrid(dt);
    updateCircles(dt);
  }
  function clear() {
    endSpin();
    clearMagic();
    clearHybrid();
    for (let i = 0; i < METS.length; i++) { METS[i].st = 0; METS[i].grp.visible = false; }
    MET.aimed.length = 0;
    for (let i = 0; i < CIRC.length; i++) { CIRC[i].on = false; CIRC[i].mesh.visible = false; }
    S.castLeft = 0;
    if (S.P) { S.P.castT = 0; S.P.spin = 0; S.P.shield = 0; }
    S.P = S.H = null;
  }

  const wrap = fn => function (ctx) { const c = prep(ctx); return c ? fn(c) : false; };
  // Cooldowns (parent: "skills could be used far too often, the game got easy"): were 1 / 7 / 16 s.
  const list = [
    { id: 'yildiz', ad: 'Yıldız Atışı', icon: '⭐', lvl: 1, cd: 4, color: '#ffd23f', line: 'yetenek_yildiz', cast: wrap(castStar) },
    { id: 'kasirga', ad: 'Kasırga', icon: '🌪️', lvl: 3, cd: 15, color: '#7ee0ff', line: 'yetenek_kasirga', cast: wrap(castSpin) },
    { id: 'meteor', ad: 'Meteor Yağmuru', icon: '☄️', lvl: 5, cd: 24, color: '#ff9a3c', line: 'yetenek_meteor', cast: wrap(castMeteor) },
  ];
  const wizard = [
    { id: 'yaprakoklari', ad: 'Yaprak Okları', icon: '🍃', lvl: 1, cd: 4, color: '#9be06a', line: 'orman_buyu1', cast: wrap(castArrows) },
    { id: 'cicekkalkani', ad: 'Çiçek Kalkanı', icon: '🌸', lvl: 3, cd: 15, color: '#ffb3d1', line: 'orman_buyu2', cast: wrap(castFrost) },
    { id: 'atesbocegibahcesi', ad: 'Ateşböceği Bahçesi', icon: '✨', lvl: 5, cd: 24, color: '#e9ff7a', line: 'orman_buyu3', cast: wrap(castGarden) },
  ];
  const hybrid = [
    { id: 'yaprakhilali', ad: 'Yaprak Hilali', icon: '🌙', lvl: 1, cd: 4, color: '#9be06a', line: 'orman_hibrit1', cast: wrap(castCrescent) },
    { id: 'sarmasikbagi', ad: 'Sarmaşık Bağı', icon: '🌿', lvl: 3, cd: 15, color: '#7fd38a', line: 'orman_hibrit2', cast: wrap(castBond) },
    { id: 'mantarhalkasi', ad: 'Mantar Halkası', icon: '🍄', lvl: 5, cd: 24, color: '#ff9f6a', line: 'orman_hibrit3', cast: wrap(castSeal) },
  ];
  return { wizard, hybrid, update, clear };
})();

// ── Ortak sözleşme: SKILLS (savaşçı dizisi) + forClass, SKILLS_update(dt), SKILLS_clear() ──
const SKILLS = FOREST_WARRIOR.list;
SKILLS.forClass = heroClass => heroClass === 'wizard' ? FOREST_MAGIC.wizard : heroClass === 'hybrid' ? FOREST_MAGIC.hybrid : SKILLS;
let SKILLS_CLASS = 'warrior';
function SKILLS_update(dt) {
  const g = typeof GAME !== 'undefined' ? GAME : null, cls = (g && g.P && g.P.heroClass) || 'warrior';
  const mod = c => (c === 'wizard' || c === 'hybrid' ? FOREST_MAGIC : FOREST_WARRIOR);
  if (cls !== SKILLS_CLASS) { if (mod(cls) !== mod(SKILLS_CLASS)) mod(SKILLS_CLASS).clear(); SKILLS_CLASS = cls; }
  mod(cls).update(dt);
}
function SKILLS_clear() { FOREST_WARRIOR.clear(); FOREST_MAGIC.clear(); }
