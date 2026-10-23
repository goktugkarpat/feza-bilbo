/* ── Orman yetenekleri: palamutlar, yaprak rüzgârı ve çiçek açan kökler ──
   Üç yuva / seviye 1, 3, 5. SKILLS, SKILLS_update(dt), SKILLS_clear() sözleşmesi korunur.
   Geometriler ve efekt yuvaları bir kez hazırlanır. Bütün süreler oyun saatine bağlıdır;
   duraklama, ölüm ve bölüm değişikliği devam eden yetenekleri de durdurur. */
'use strict';

const { SKILLS, SKILLS_update, SKILLS_clear } = (() => {
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
  list.forClass = () => list;
  return { SKILLS: list, SKILLS_update: update, SKILLS_clear: clear };
})();
