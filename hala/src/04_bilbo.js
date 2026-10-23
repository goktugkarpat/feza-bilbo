/* Bilbo — sculpted Labrador, articulated skeleton, shared portrait and distance-driven gait. */
const BILBO = (() => {
  'use strict';
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  // Velvety chocolate coat: a warm fresnel sheen (cheap rim term, no extra lights) keeps the vertex colours.
  function sheen(mat, rgb, k, p, key) {
    mat.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
        `{ float bRim = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
           outgoingLight += diffuseColor.rgb * vec3(${rgb}) * (pow(bRim, ${p}) * ${k}); }
         #include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => key;
    return mat;
  }
  const furMat = sheen(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.74 }), '1.30, 1.12, 0.98', '0.75', '2.8', 'bilboFur');
  const wetMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36 });
  const eyeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16 });
  const shineMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const sphere = new THREE.SphereGeometry(1, 28, 20);
  const detail = new THREE.SphereGeometry(1, 18, 12);
  const COAT = 0x67432f, EAR = 0x573929, MUZZLE = 0x704c36;

  // Continuous sculpted surfaces. Sections: z, horizontal radius, vertical radius, centre y.
  function loft(sections, rows = 40, sides = 32) {
    const pos = [], uv = [], idx = [];
    const sample = (t, k) => {
      const u = t * (sections.length - 1), i = Math.min(sections.length - 2, Math.floor(u)), f = u - i;
      const a = sections[Math.max(0, i - 1)][k], b = sections[i][k], c = sections[i + 1][k], d = sections[Math.min(sections.length - 1, i + 2)][k];
      return 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    };
    for (let i = 0; i <= rows; i++) {
      const t = i / rows, z = sample(t, 0), rx = Math.max(0.001, sample(t, 1)), ry = Math.max(0.001, sample(t, 2)), cy = sample(t, 3);
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * Math.PI * 2;
        pos.push(Math.cos(a) * rx, cy + Math.sin(a) * ry, z); uv.push(j / sides, t);
        if (i < rows && j < sides) { const n = i * (sides + 1) + j; idx.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const trunkGeo = loft([[-0.91, .001, .001, .72], [-.77, .23, .26, .73], [-.52, .32, .33, .75],
    [-.16, .32, .31, .77], [.18, .35, .37, .78], [.42, .33, .38, .83], [.59, .19, .27, .88], [.66, .001, .001, .89]]);
  const headGeo = loft([[-.29, .001, .001, .02], [-.23, .23, .24, .045], [-.08, .315, .29, .07],
    [.10, .31, .27, .07], [.25, .24, .20, .015], [.40, .235, .155, -.055], [.54, .215, .14, -.068], [.63, .13, .08, -.06], [.65, .001, .001, -.05]], 46, 40);
  { const p = headGeo.attributes.position; for (let i=0;i<p.count;i++) if(p.getY(i)>.20) p.setY(i,.20+(p.getY(i)-.20)*.55); headGeo.computeVertexNormals(); }
  function earGeo(side) {
    // A closed, rounded fold attached inside the skull; broad near the cheek, tucked-in at the tip.
    const g = loft([[0, .001, .001, 0], [.035, .064, .034, .012], [.12, .123, .046, .035],
      [.24, .125, .039, .075], [.35, .089, .030, .105], [.43, .039, .018, .11], [.46, .001, .001, .10]], 36, 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getZ(i), u = clamp01(t / .46);
      p.setXYZ(i, p.getX(i) + side * (.045 * Math.sin(u * Math.PI) - .014 * u), -t, p.getY(i));
    }
    g.computeVertexNormals(); return g;
  }
  const earL = earGeo(-1), earR = earGeo(1);
  const foreGeo = loft([[-.07,.065,.08,0],[.04,.127,.15,0],[.17,.118,.125,0],[.30,.099,.103,0],[.44,.085,.087,.015],[.60,.078,.08,.035],[.67,.068,.064,.04]],32,24);
  const hindGeo = loft([[-.09,.065,.09,0],[.02,.18,.21,0],[.15,.17,.185,0],[.29,.12,.13,-.035],[.43,.089,.095,-.02],[.59,.075,.08,.03],[.67,.068,.064,.04]],32,24);
  const tailGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, .03, -.22), new THREE.Vector3(0, .14, -.47), new THREE.Vector3(0, .20, -.73)
  ]), 24, .08, 12, false);
  { const p = tailGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = Math.floor(i / 13) / 24, k = 1 - .86 * t;
      const c = tailGeo.parameters.path.getPointAt(t);
      p.setXYZ(i, p.getX(i) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k); }
    tailGeo.computeVertexNormals(); }

  function create() {
    const root = new THREE.Group(); root.name = 'Bilbo';
    const bones = [], parts = [], owned = [];
    function joint(parent, name, x = 0, y = 0, z = 0) {
      const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); bones.push(b); return b;
    }
    function part(bone, geo, color, pos = [0, 0, 0], scale = [1, 1, 1], mat = furMat, rot = [0, 0, 0]) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
      const p = { bone, geo, color: new THREE.Color(color), m, mat }; parts.push(p); return p;
    }
    const ell = (b, col, p, s, mat = furMat, rot) => part(b, sphere, col, p, s, mat, rot);
    const small = (b, col, p, s, mat = wetMat) => part(b, detail, col, p, s, mat);
    function curve(b, pts, radius, color, mat = wetMat) {
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 20, radius, 6, false);
      owned.push(g); part(b, g, color, undefined, undefined, mat);
    }
    const body = joint(root, 'body'); part(body, trunkGeo, COAT);
    const neck = joint(body, 'neck', 0, .91, .38);
    ell(neck, COAT, [0, .06, .08], [.29, .32, .30], furMat, [-.25, 0, 0]);
    const head = joint(neck, 'head', 0, .18, .13);
    part(head, headGeo, COAT).muzzle = true;
    small(head, 0x563831, [0, -.022, .635], [.137, .073, .070]);
    curve(head, [[0,-.09,.645],[0,-.15,.622],[0,-.174,.598]], .006, 0x402b23);
    for (const side of [-1, 1]) {
      small(head, 0x241b19, [side * .066, -.017, .702], [.032, .023, .015]);
      curve(head, [[0,-.174,.598],[side*.11,-.193,.552],[side*.19,-.150,.43]], .006, 0x402b23);
      ell(head, 0x3b2a21, [side * .202, .131, .262], [.074, .060, .040]);
      const eye = joint(head, 'eye' + side, side * .202, .135, .294);
      small(eye, 0xc08f45, [0, 0, 0], [.061, .053, .020], eyeMat);
      small(eye, 0x171311, [0, .001, .016], [.040, .043, .011], eyeMat);
      small(eye, 0xffffff, [-.015, .020, .027], [.015, .014, .006], shineMat);
      small(eye, 0xfff1d6, [.017, -.017, .026], [.0065, .0065, .004], shineMat);
      ell(head, COAT, [side * .19, .168, .170], [.094, .040, .085]);
      // Soft, rounded cheeks give the long Labrador muzzle a friendlier, puppy-like smile.
      ell(head, MUZZLE, [side * .088, -.072, .500], [.105, .082, .118]);
    }
    const eyes = bones.filter(b => b.name.startsWith('eye'));
    const ears = [-1, 1].map(side => {
      const b = joint(head, 'ear' + side, side * .268, .235, .015); part(b, side < 0 ? earL : earR, EAR); return { b, side, z: 0 };
    });
    const jaw = joint(head, 'jaw', 0, -.12, .26);
    ell(jaw, 0x7a3a40, [0, -.062, .205], [.150, .028, .158], wetMat);   // inside the mouth, tucked inside the lower lip
    ell(jaw, MUZZLE, [0, -.093, .19], [.195, .055, .177]);
    const tongue = joint(jaw, 'tongue', 0, -.060, .25);
    small(tongue, 0xe07c86, [0, 0, .095], [.068, .020, .13]);
    small(tongue, 0xbd5a66, [0, .012, .11], [.008, .010, .10]);
    const mouthAnchor = new THREE.Object3D(); mouthAnchor.name = 'Bilbo mouth';
    mouthAnchor.position.set(0, -.025, .37); jaw.add(mouthAnchor);
    const legs = [];
    for (const front of [true, false]) for (const side of [-1, 1]) {
      const b = joint(body, (front ? 'fore' : 'hind') + side, side * .25, .75, front ? .33 : -.56);
      const shin = joint(b, 'shin', 0, -.30, front ? 0 : -.035);
      const limb = part(b, front ? foreGeo : hindGeo, COAT, [0,0,0], [1,1,1], furMat, [Math.PI/2,0,0]);
      limb.skin = z => { let w = clamp01((z-.20)/.20); w = w*w*(3-2*w); return { bone: shin, w }; };
      const foot = joint(shin, 'paw', 0, -.34, .035);
      ell(foot, COAT, [0, -.02, .075], [.135, .090, .204]);
      for (const x of [-.045, .045]) curve(foot, [[x, .025, .228], [x, .047, .17], [x, .055, .11]], .0035, 0x493023, furMat);
      legs.push({ b, shin, foot, front, side });
    }
    const tail = joint(body, 'tail', 0, .83, -.79); part(tail, tailGeo, COAT);
    // Riding seat: top of the back (world position = where Feza sits).
    const saddle = new THREE.Object3D(); saddle.name = 'Bilbo saddle'; saddle.position.set(0, 1.07, -.10); body.add(saddle);
    root.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(bones), meshes = [];
    // All fur shares one skinned surface; the whole dog uses only four material draws.
    for (const mat of new Set(parts.map(p => p.mat))) {
      const list = parts.filter(p => p.mat === mat), positions = [], normals = [], colors = [], uvs = [], skinI = [], skinW = [], indices = [];
      const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
      const muzzleColor = new THREE.Color(MUZZLE), painted = new THREE.Color();
      let base = 0;
      for (const p of list) {
        const m = p.bone.matrixWorld.clone().multiply(p.m), a = p.geo.attributes, bi = bones.indexOf(p.bone);
        nm.getNormalMatrix(m);
        for (let i = 0; i < a.position.count; i++) {
          v.fromBufferAttribute(a.position, i).applyMatrix4(m); positions.push(v.x, v.y, v.z);
          n.fromBufferAttribute(a.normal, i).applyMatrix3(nm).normalize(); normals.push(n.x, n.y, n.z);
          const shade = mat === furMat ? .91 + .09 * clamp01(n.y * .5 + .5) : 1;
          painted.copy(p.color);
          if (p.muzzle) painted.lerp(muzzleColor, clamp01((a.position.getZ(i)-.20)/.32) * clamp01((.20-a.position.getY(i))/.20));
          colors.push(painted.r * shade, painted.g * shade, painted.b * shade);
          uvs.push(a.uv ? a.uv.getX(i) : 0, a.uv ? a.uv.getY(i) : 0);
          const skin = p.skin ? p.skin(a.position.getZ(i)) : null;
          skinI.push(bi, skin ? bones.indexOf(skin.bone) : 0, 0, 0); skinW.push(skin ? 1-skin.w : 1, skin ? skin.w : 0, 0, 0);
        }
        const index = p.geo.index;
        for (let i = 0; i < (index ? index.count : a.position.count); i++) indices.push(base + (index ? index.getX(i) : i));
        base += a.position.count;
      }
      const g = new THREE.BufferGeometry();
      for (const [key, data, size] of [['position', positions, 3], ['normal', normals, 3], ['color', colors, 3], ['uv', uvs, 2], ['skinWeight', skinW, 4]]) g.setAttribute(key, new THREE.Float32BufferAttribute(data, size));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinI, 4)); g.setIndex(indices); g.computeBoundingSphere();
      const mesh = new THREE.SkinnedMesh(g, mat); mesh.name = 'Bilbo surface'; mesh.castShadow = mat !== shineMat; mesh.receiveShadow = false;
      mesh.frustumCulled = false; root.add(mesh); mesh.bind(skel); meshes.push(mesh);
    }
    owned.forEach(g => g.dispose());
    let t = 0, stride = 0, run = 0, rest = 0, sit = 0, blinkAt = 2.8, blink = 0, fetch = null, chew = 0, fetchYaw = 0;
    let happy = 0, sniff = 0, dig = 0, ride = 0, wagPh = 0, sneezeT = -1, sneezeCb = null;
    const SNEEZE = { wind: 1.05, total: 1.85 };
    const snacks = [], snackGeo = new THREE.SphereGeometry(1, 10, 8);
    const snackMat = new THREE.MeshStandardMaterial({ color: 0xf4b593, roughness: .65, emissive: 0x8b4730, emissiveIntensity: .28 });
    const boneGeo = new THREE.CylinderGeometry(.045, .045, .38, 10);
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xfff2d4, roughness: .65 });
    const FETCH = { fly: .85, catch: .60, chew: .40, sprayGap: .15 };
    function mouthWorld() { return mouthAnchor.getWorldPosition(new THREE.Vector3()); }
    function removeSnack(s) { if (s.mesh.parent) s.mesh.parent.remove(s.mesh); }
    function fetchBone(hero, targets = [], onHit, options = {}) {
      if (fetch || snacks.length || !root.parent || !hero || (options.canLaunch && !options.canLaunch())) return false;
      const bone = new THREE.Group();
      const shaft = new THREE.Mesh(boneGeo, boneMat); shaft.rotation.z = Math.PI / 2; bone.add(shaft);
      for (const side of [-1, 1]) for (const up of [-1, 1]) {
        const knob = new THREE.Mesh(snackGeo, boneMat); knob.scale.set(.072, .067, .058); knob.position.set(side * .19, up * .045, 0); bone.add(knob);
      }
      bone.name = 'Bilbo thrown bone';
      root.parent.add(bone);
      fetch = { age: 0, stage: 'flight', bone, from: new THREE.Vector3(hero.x, (hero.y || 0) + 1.1, hero.z), targets: targets.slice(0, 5), onHit, options, next: 0, emitted: 0, puff: 0 };
      bone.position.copy(fetch.from);
      return true;
    }
    function emitTreat(f, index) {
      const target = f.targets[index], origin = mouthWorld();
      const angle = root.rotation.y + (index - 1) * .22;
      const end = target && !target.dead ? new THREE.Vector3(target.x, (target.y || 0) + Math.max(.4, (target.height || 1) * .5), target.z) : origin.clone().add(new THREE.Vector3(Math.sin(angle) * 3, -.4, Math.cos(angle) * 3));
      const mesh = new THREE.Mesh(snackGeo, snackMat); mesh.name = 'Bilbo tiny meat treat';
      mesh.scale.set(.13, .09, .15); mesh.position.copy(origin); mesh.frustumCulled = false; root.parent.add(mesh);
      snacks.push({ mesh, from: origin, end, target, onHit: f.onHit, canLaunch: f.options.canLaunch, routeClear: f.options.routeClear, age: 0, duration: .52 + Math.min(8, origin.distanceTo(end)) * .055 });
      f.puff = .16;
    }
    function updateSnacks(dt) {
      chew = Math.max(0, chew - dt);
      for (let i = snacks.length - 1; i >= 0; i--) {
        const s = snacks[i];
        if (s.canLaunch && !s.canLaunch()) { removeSnack(s); snacks.splice(i, 1); continue; }
        s.age += dt;
        if (s.target && !s.target.dead) s.end.set(s.target.x, (s.target.y || 0) + Math.max(.4, (s.target.height || 1) * .5), s.target.z);
        const u = clamp01(s.age / s.duration), before = s.mesh.position.clone();
        s.mesh.position.lerpVectors(s.from, s.end, u); s.mesh.position.y += Math.sin(Math.PI * u) * .32;
        s.mesh.rotation.set(s.age * 7, s.age * 4, s.age * 8);
        if (s.routeClear && !s.routeClear(before.x, before.z, s.mesh.position.x, s.mesh.position.z)) { removeSnack(s); snacks.splice(i, 1); continue; }
        if (u >= 1) { removeSnack(s); snacks.splice(i, 1); if (s.target && !s.target.dead && s.onHit) s.onHit(s.target); }
      }
      if (fetch) {
        const f = fetch;
        if (!root.parent || (f.options.canLaunch && !f.options.canLaunch())) { clearActions(); return; }
        f.age += dt; f.puff = Math.max(0, f.puff - dt);
        if (f.stage === 'flight') {
          const u = clamp01(f.age / FETCH.fly), to = mouthWorld();
          f.bone.position.lerpVectors(f.from, to, u); f.bone.position.y += Math.sin(Math.PI * u) * .75;
          f.bone.rotation.set(f.age * 3, root.rotation.y + f.age * 4 * (1-u), .25 * Math.sin(u*Math.PI));
          f.bone.scale.setScalar(1 - u * .16);
          if (u >= 1) { f.stage = 'catch'; f.age -= FETCH.fly; }
        } else if (f.stage === 'catch' || f.stage === 'chew') {
          f.bone.position.copy(mouthWorld()); f.bone.quaternion.copy(root.quaternion); f.bone.rotateZ(.045 * Math.sin(t * 9));
          f.bone.scale.setScalar(f.stage === 'chew' ? .84 * (1 - clamp01(f.age / FETCH.chew) * .4) : .84);
          if (f.stage === 'catch' && f.age >= FETCH.catch) { f.stage = 'chew'; f.age -= FETCH.catch; chew = FETCH.chew; }
          else if (f.stage === 'chew' && f.age >= FETCH.chew) { f.stage = 'spray'; f.age -= FETCH.chew; if(f.bone.parent)f.bone.parent.remove(f.bone); }
        } else if (f.stage === 'spray') {
          while(f.age >= f.next && f.emitted < Math.max(3, f.targets.length)) {
            emitTreat(f, f.emitted++); f.next += FETCH.sprayGap;
          }
          if(f.emitted >= Math.max(3,f.targets.length) && f.puff <= 0)fetch = null;
        }
      }
    }
    function clearActions() {
      if (fetch) { if (fetch.bone.parent) fetch.bone.parent.remove(fetch.bone); fetch = null; }
      snacks.forEach(removeSnack); snacks.length = 0; chew = 0; fetchYaw = 0;
    }
    function fetchFacing() {
      if(!fetch || (fetch.stage!=='chew' && fetch.stage!=='spray'))return null;
      const target=fetch.targets.slice(Math.min(fetch.emitted,fetch.targets.length-1)).find(e=>!e.dead) || [...fetch.targets].reverse().find(e=>!e.dead);
      if(!target)return null;
      const origin=root.getWorldPosition(new THREE.Vector3());
      return Math.atan2(target.x-origin.x,target.z-origin.z);
    }
    function update(dt, state = {}) {
      dt = Math.min(Math.max(dt || 0, 0), .1); t += dt;
      const speed = Math.max(0, state.speed || 0), moving = speed > .10;
      run = smooth(run, clamp01(speed / 5.2), 10, dt);
      stride += speed * dt * 3.8;
      rest = moving || state.bark > 0 || state.pounce > 0 || fetch || chew > 0 || state.sniff || state.dig || state.ride || sneezeT >= 0 ? 0 : rest + dt;
      sit = smooth(sit, state.sit || rest > 7 ? 1 : 0, 4, dt);
      happy = smooth(happy, clamp01(state.happy || 0), 2.5, dt); sniff = smooth(sniff, state.sniff ? 1 : 0, 6, dt);
      dig = smooth(dig, state.dig ? 1 : 0, 8, dt); ride = smooth(ride, state.ride ? 1 : 0, 6, dt);
      const age = 1.30 - (state.bark || 0);
      const bark = state.bark > 0 ? Math.exp(-Math.pow((age - .13) / .11, 2)) + Math.exp(-Math.pow((age - .85) / .12, 2)) : 0;
      body.position.y = run * .018 * Math.cos(stride * 2) + .004 * Math.sin(t * 2.2) - sit * .13;
      body.rotation.set(-.09 * sit + .02 * run * Math.cos(stride), 0, .014 * run * Math.sin(stride));
      for (const { b, shin, foot, front, side } of legs) {
        const phase = stride + (front ? 0 : Math.PI) + (side > 0 ? Math.PI : 0), s = Math.sin(phase);
        b.position.y = .75 + (front ? .08 * sit : 0);
        b.rotation.x = .48 * run * s + (front ? -.10 : 1.03) * sit;
        shin.rotation.x = .60 * run * Math.max(0, -Math.cos(phase)) - (front ? 0 : 1.35) * sit;
        foot.rotation.x = -b.rotation.x * .30 - shin.rotation.x * .55;
      }
      neck.rotation.x = -.035 * run + .025 * bark;
      head.rotation.x = -.02 + .028 * (1 - run) * Math.sin(t * 1.4) - .11 * bark;
      head.rotation.y = state.portrait ? -.035 : .045 * (1 - run) * Math.sin(t * .63);
      head.rotation.z = state.portrait ? -.10 : .02 * (1 - run) * Math.sin(t * .7);
      // The smoothed ear angle lives in e.z, so layered offsets (ride flap, sneeze, catch) never accumulate.
      for (const e of ears) { e.z = smooth(e.z, e.side * (.04 + .10 * run * Math.sin(stride - .6) + .10 * bark), 12, dt); e.b.rotation.z = e.z; }
      // Happy wag: a phase accumulator lets the tempo rise smoothly (no jump) when Feza is close or something smells good.
      const glee = Math.max(happy, sniff, dig, ride);
      wagPh += dt * (5.4 + 9.5 * glee);
      tail.rotation.y = (.18 + .25 * run + .42 * glee) * Math.sin(wagPh);
      tail.rotation.x = -.10 + .07 * Math.sin(t * 2.7) - sit * .18;
      jaw.rotation.x = (state.portrait ? .105 : .012) + .55 * bark;
      tongue.scale.setScalar(state.portrait ? .72 : bark > .1 ? .8 : .1);
      blinkAt -= dt;
      if (blinkAt <= 0) { blink = .18; blinkAt = 2.7 + Math.random() * 2.4; }
      blink = Math.max(0, blink - dt);
      const lid = state.portrait ? 1 : 1 - .92 * Math.sin(Math.PI * clamp01(blink / .18));
      eyes.forEach(b => { b.scale.y = lid; });
      // Anticipation, tucked paws, floppy ears and a soft landing make the playful leap readable.
      const leap = clamp01(state.pounce || 0), nibble = chew > 0 ? Math.sin(t * 25) * .07 + .12 : 0;
      body.rotation.x -= .16 * leap;
      for (const { b, shin, foot, front } of legs) {
        b.rotation.x += (front ? -.9 : .55) * leap;
        shin.rotation.x += (front ? .8 : -.6) * leap; foot.rotation.x -= .22 * leap;
      }
      ears.forEach(({ b, side }) => { b.rotation.x = -.22 * leap + .035 * run * Math.sin(stride + side); });
      head.rotation.x += .09 * nibble - .10 * leap;
      head.rotation.z += .055 * (1 - run) * Math.sin(t * .91) + .02 * nibble;
      jaw.rotation.x += nibble + (run > .45 ? .065 + .025 * Math.sin(t * 8) : 0);
      tongue.scale.setScalar(Math.max(state.portrait ? .72 : .1, run * .55, nibble > 0 ? .6 : 0, bark > .1 ? .8 : 0));
      tail.rotation.y += (fetch || chew > 0 ? .18 * Math.sin(t * 13) : 0);
      funPose(dt, state, bark);
      let actionYaw = 0;
      if (fetch) {
        const f = fetch, hold = f.stage === 'catch' || f.stage === 'chew';
        if (f.stage === 'flight') {
          const aim = root.worldToLocal(f.bone.position.clone());
          actionYaw = Math.max(-.75, Math.min(.75, Math.atan2(aim.x, Math.max(.25, aim.z - .5))));
          head.rotation.x -= .16 * Math.sin(Math.PI * clamp01(f.age / FETCH.fly));
          jaw.rotation.x = .04 + .31 * clamp01(f.age / FETCH.fly);
        } else if (hold) {
          head.rotation.x += .035 * Math.sin(t * 10);
          jaw.rotation.x = f.stage === 'catch' ? .24 : .18 + .045 * Math.sin(t * 18);
          tongue.scale.setScalar(.12); ears.forEach(({b,side})=>b.rotation.z+=side*.08);
        } else {
          const target=f.targets[Math.min(f.emitted,f.targets.length-1)];
          if(target&&!target.dead){const aim=root.worldToLocal(new THREE.Vector3(target.x,0,target.z));actionYaw=Math.max(-.8,Math.min(.8,Math.atan2(aim.x,Math.max(.3,aim.z-.5))));}
          const puff=clamp01(f.puff/.16);jaw.rotation.x=.12+.28*puff;head.rotation.x-=.09*puff;
        }
        tail.rotation.y += .23 * Math.sin(t * 11); eyes.forEach(b=>b.scale.y*=.93);
      }
      fetchYaw = smooth(fetchYaw, actionYaw, 10, dt); head.rotation.y += fetchYaw;
      // Update the geometry after posing so catch and every launch use the animated jaw in this very frame.
      root.updateMatrixWorld(true); updateSnacks(dt);
    }
    // ── Happy / sniff / dig / ride / sneeze poses (layered on the gait above) ──
    function funPose(dt, state, bark) {
      const wig = Math.sin(wagPh);
      // Whole-rear wiggle with the wag; the neck counter-turns so the friendly face stays steady.
      const rear = .075 * Math.max(happy, sniff) * (1 - run) * (1 - sit) * wig;
      body.rotation.y += rear; neck.rotation.y = -rear;
      body.rotation.z += .02 * happy * (1 - run) * Math.sin(wagPh + .8);
      // Open, smiling mouth with the tongue out when he is happy, running or riding.
      const grin = Math.max(happy * (1 - sniff) * (1 - dig), ride);
      jaw.rotation.x += .15 * grin + .035 * grin * Math.sin(t * 9.5);
      tongue.rotation.x = .18 + .32 * grin + .05 * Math.sin(t * 9.5) * grin;
      tongue.scale.setScalar(Math.max(tongue.scale.x, .92 * grin));
      if (ride > .01) for (const { b, side } of ears) b.rotation.z += side * ride * (.10 + .12 * Math.sin(t * 15 + side));
      if (sniff > .01) {
        const burstOn = Math.sin(t * 3.1) > -.2 ? 1 : 0;
        neck.rotation.x += .66 * sniff; head.rotation.x += .26 * sniff + .05 * sniff * burstOn * Math.sin(t * 34);
        head.rotation.y += .22 * sniff * Math.sin(t * 1.7);
        body.rotation.x += .05 * sniff;
        for (const { b } of ears) b.rotation.x -= .2 * sniff;
        for (const e of eyes) e.scale.y *= 1 - .25 * sniff;
      }
      if (dig > .01) {
        body.rotation.x += .27 * dig; body.position.y -= .04 * dig;
        neck.rotation.x += .40 * dig; head.rotation.x += .16 * dig;
        for (const L of legs) {
          if (L.front) {
            const s = Math.sin(t * 17 + (L.side > 0 ? Math.PI : 0));
            L.b.rotation.x += (-.42 - .55 * s - L.b.rotation.x * .6) * dig;
            L.shin.rotation.x += (.75 * Math.max(0, s) + .15) * dig;
            L.foot.rotation.x += (-.35 * Math.max(0, -s)) * dig;
          } else L.b.rotation.x -= .25 * dig;
        }
        for (const e of eyes) e.scale.y *= 1 - .15 * dig;
      }
      if (sneezeT >= 0) sneezePose(dt);
      accPose();
    }
    function ease(u) { u = clamp01(u); return u * u * (3 - 2 * u); }
    function sneezePose(dt) {
      const before = sneezeT; sneezeT += dt;
      if (before < SNEEZE.wind && sneezeT >= SNEEZE.wind) {
        const cb = sneezeCb; sneezeCb = null;
        if (cb) { try { root.updateMatrixWorld(true); cb(mouthWorld()); } catch (err) { console.warn('Bilbo sneeze', err); } }
      }
      if (sneezeT < SNEEZE.wind) {
        // "ha… ha…": head tips back in two little bobs, eyes squeeze, nose wrinkles up.
        const u = sneezeT / SNEEZE.wind, k = ease(u / .85);
        const bob = Math.max(0, Math.sin(u * Math.PI * 2.2)) * (1 - u * .5);
        head.rotation.x -= .30 * k + .10 * bob; neck.rotation.x -= .16 * k;
        jaw.rotation.x += .10 * k;
        for (const e of eyes) e.scale.y *= 1 - .72 * k;
        for (const { b } of ears) b.rotation.x -= .12 * k;
        body.position.y += .015 * bob;
      } else {
        const a = sneezeT - SNEEZE.wind, snap = Math.exp(-9 * a), wob = Math.sin(a * 26) * Math.exp(-6 * a);
        head.rotation.x += .55 * snap - .08 * wob; neck.rotation.x += .32 * snap;
        body.rotation.x += .10 * snap; body.position.y += .07 * snap * Math.max(0, Math.cos(a * 12));
        jaw.rotation.x += .38 * snap;
        for (const e of eyes) e.scale.y *= a < .25 ? .08 : 1 - .6 * snap;
        for (const { b, side } of ears) { b.rotation.z += side * .9 * snap; b.rotation.x -= .5 * snap; }
        if (sneezeT >= SNEEZE.total) sneezeT = -1;
      }
    }
    function sneeze(onAchoo) {
      if (sneezeT >= 0) return false;
      sneezeT = 0; sneezeCb = typeof onAchoo === 'function' ? onAchoo : null; return true;
    }

    // ── Accessories: small meshes on the bones (they follow the skinned animation). Built lazily, cached. ──
    const accCache = {}, accOwned = [];
    let accId = null, acc = null;
    const own = x => { accOwned.push(x); return x; };
    function std(color, o) { return own(new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .55 }, o || {}))); }
    function add(parent, geo, mat, p, s, r) {
      const m = new THREE.Mesh(geo, mat); m.castShadow = true;
      if (p) m.position.set(p[0], p[1], p[2]);
      if (s) m.scale.set(s[0], s[1], s[2]);
      if (r) m.rotation.set(r[0], r[1], r[2]);
      parent.add(m); return m;
    }
    function canvasTex(w, h, draw) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      const tx = own(new THREE.CanvasTexture(c)); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
    }
    function starShape(R, r, n = 5) {
      const s = new THREE.Shape();
      for (let i = 0; i <= n * 2; i++) {
        const a = Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R;
        if (i) s.lineTo(Math.cos(a) * q, Math.sin(a) * q); else s.moveTo(Math.cos(a) * q, Math.sin(a) * q);
      }
      return s;
    }
    let sph = null;
    function ringOnNeck(g, color, tube, mat) {
      // A ring hugging the neck just behind the head (tilted along the neck).
      const ring = new THREE.Group(); ring.position.set(0, .04, .07); ring.rotation.x = -.95; g.add(ring);
      add(ring, own(new THREE.TorusGeometry(.305, tube, 12, 44)), mat || std(color, { roughness: .5 }), null, [1.08, 1, 1]);
      return ring;
    }
    const BUILD = {
      tasma() {
        const g = new THREE.Group(); neck.add(g);
        const ring = ringOnNeck(g, 0xe0303a, .042);
        const gold = std(0xffc53d, { metalness: .55, roughness: .3, emissive: 0x6b4a00, emissiveIntensity: .25 });
        add(ring, own(new THREE.TorusGeometry(.022, .007, 6, 14)), gold, [0, -.335, .02], null, [Math.PI / 2, 0, 0]);
        // Bone-shaped name tag.
        const tag = new THREE.Group(); tag.position.set(0, -.385, .03); tag.rotation.x = .2; ring.add(tag);
        add(tag, own(new THREE.CylinderGeometry(.017, .017, .085, 10)), gold, null, null, [0, 0, Math.PI / 2]);
        for (const x of [-.045, .045]) for (const y of [-.016, .016]) add(tag, sph, gold, [x, y, 0], [.024, .024, .016]);
        return { g, ring };
      },
      bandana() {
        const g = new THREE.Group(); neck.add(g);
        const tex = canvasTex(128, 128, (c, w, h) => {
          c.fillStyle = '#2f78e0'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff';
          for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.beginPath(); c.arc(x * 16 + (y % 2) * 8 + 4, y * 16 + 8, 3.6, 0, Math.PI * 2); c.fill(); }
        });
        const mat = std(0xffffff, { map: tex, roughness: .78, side: THREE.DoubleSide });
        ringOnNeck(g, 0x2f78e0, .036, mat);
        // Triangle cloth draped over the chest (curved around it).
        const W = .30, H = .34, geo = own(new THREE.PlaneGeometry(W * 2, H, 8, 6)), p = geo.attributes.position, uv = geo.attributes.uv;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), v = (y + H / 2) / H;   // v: 0 tip, 1 top
          const nx = x * v; p.setXYZ(i, nx, y, -2.2 * nx * nx - .10 * (1 - v) * (1 - v));
          uv.setXY(i, .5 + nx * 1.4, v);
        }
        geo.computeVertexNormals();
        const cloth = new THREE.Group(); cloth.position.set(0, -.10, .37); cloth.rotation.x = .30; g.add(cloth);
        add(cloth, geo, mat, [0, -H / 2 + .04, 0]);
        return { g, cloth };
      },
      sapka() {
        const g = new THREE.Group(); g.position.set(-.02, .255, -.01); g.rotation.set(-.12, 0, .26); head.add(g);
        const tex = canvasTex(64, 128, (c, w, h) => {
          c.fillStyle = '#ff5fa2'; c.fillRect(0, 0, w, h);
          const cols = ['#ffd84a', '#5fd3ff', '#ffffff'];
          for (let i = 0; i < 6; i++) { c.fillStyle = cols[i % 3]; c.fillRect(0, i * 22 + 6, w, 9); }
        });
        add(g, own(new THREE.ConeGeometry(.115, .30, 28, 1, true)), std(0xffffff, { map: tex, roughness: .6, side: THREE.DoubleSide }), [0, .15, 0]);
        add(g, own(new THREE.TorusGeometry(.112, .018, 8, 28)), std(0xffffff, { roughness: .9 }), [0, .005, 0], null, [Math.PI / 2, 0, 0]);
        const pom = add(g, sph, std(0xffe14d, { roughness: .95 }), [0, .31, 0], [.046, .046, .046]);
        // Thin elastic under the chin.
        const band = own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(-.10, .0, .03), new THREE.Vector3(-.21, -.20, .14), new THREE.Vector3(-.07, -.42, .27),
          new THREE.Vector3(.14, -.36, .26), new THREE.Vector3(.17, -.10, .09), new THREE.Vector3(.10, .0, .03)]), 24, .0055, 5, false));
        add(g, band, std(0xff4d8d, { roughness: .7 }));
        return { g, pom };
      },
      gozluk() {
        const g = new THREE.Group(); head.add(g);
        const frame = std(0x1d1f2a, { roughness: .35 });
        const lens = std(0x16224a, { roughness: .12, metalness: .3, emissive: 0x0a1030, emissiveIntensity: .4 });
        const glint = own(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75 }));
        const disc = own(new THREE.CylinderGeometry(1, 1, 1, 24)), rim = own(new THREE.TorusGeometry(1, .14, 6, 24));
        const arm = own(new THREE.BoxGeometry(.014, .016, .23));
        for (const side of [-1, 1]) {
          const l = new THREE.Group(); l.position.set(side * .192, .145, .338); l.rotation.set(0, side * .42, 0); g.add(l);
          add(l, disc, lens, null, [.080, .014, .068], [Math.PI / 2, 0, 0]);
          add(l, rim, frame, [0, 0, .004], [.082, .070, .10]);
          add(l, sph, glint, [-.024, .022, .012], [.016, .008, .003], [0, 0, .6]).castShadow = false;
          // Arm back toward the ear.
          add(g, arm, frame, [side * .262, .15, .19], null, [0, side * .32, 0]);
        }
        add(g, own(new THREE.TorusGeometry(.09, .011, 6, 16, Math.PI)), frame, [0, .16, .362], [1.05, .55, 1]);
        return { g };
      },
      pelerin() {
        const g = new THREE.Group(); g.position.set(0, 1.16, .24); body.add(g);   // pivot over the shoulders
        const red = std(0xe2343f, { roughness: .6, side: THREE.DoubleSide });
        // Cape surface: v runs shoulders → rump, u wraps down both flanks just outside the trunk; soft folds deepen toward the hem.
        const L = .70;
        const surf = (u, v, out, lift) => {
          const ang = (u * 2 - 1) * (.70 + .50 * v) * (1 - .15 * (1 - v));
          const fold = 1 + (.035 * Math.sin(u * Math.PI * 8 + .4) * v * v) + (out || 0);
          const rx = (.385 + .07 * v * v) * fold, ry = (.405 - .01 * v) * fold, cy = .80 - .03 * v;
          const hem = v > .999 ? .035 * Math.max(0, Math.cos(u * Math.PI * 8 + .4)) : 0;   // gently scalloped hem
          return new THREE.Vector3(Math.sin(ang) * rx, cy + Math.cos(ang) * ry - 1.16 + (lift || 0) - hem * Math.abs(Math.sin(ang)), -v * L);
        };
        const geo = own(new THREE.PlaneGeometry(1, 1, 24, 14)), p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const q = surf(p.getX(i) + .5, .5 - p.getY(i)); p.setXYZ(i, q.x, q.y, q.z); }
        geo.computeVertexNormals();
        const cape = new THREE.Group(); g.add(cape);
        add(cape, geo, red);
        // Golden trim along the shoulder edge and the hem (a hair outside the cloth so it always shows).
        const trim = std(0xffc93c, { roughness: .35, metalness: .35, emissive: 0x7a5200, emissiveIntensity: .35 });
        for (const v of [0, 1]) {
          const pts = [];
          for (let k = 0; k <= 24; k++) pts.push(surf(k / 24, v, .03, .006));
          add(cape, own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .021, 6, false)), trim);
        }
        // Big yellow star with a white outline on the middle of the back.
        const mid = surf(.5, .48, .02, .01);
        const starG = new THREE.Group(); starG.position.copy(mid); starG.rotation.x = -Math.PI / 2 + .03; cape.add(starG);
        add(starG, own(new THREE.ShapeGeometry(starShape(.135, .062))), std(0xffffff, { roughness: .6, side: THREE.DoubleSide }), [0, 0, -.002]);
        add(starG, own(new THREE.ShapeGeometry(starShape(.11, .05))),
          std(0xffd23a, { roughness: .45, emissive: 0x8a6000, emissiveIntensity: .45, side: THREE.DoubleSide }), [0, 0, .004]);
        // Gold clasp at the shoulders.
        add(g, sph, trim, [0, .02, .01], [.05, .05, .035]);
        return { g, cape };
      },
    };
    function setAccessory(id) {
      id = id && BUILD[id] ? id : null;
      if (id === accId) return true;
      if (acc) acc.g.visible = false;
      accId = id; acc = null;
      if (!id) return true;
      if (!sph) sph = own(new THREE.SphereGeometry(1, 16, 12));
      if (!accCache[id]) accCache[id] = BUILD[id]();
      acc = accCache[id]; acc.g.visible = true;
      accPose(); return true;
    }
    function accPose() {
      if (!acc) return;
      if (accId === 'sapka') {
        acc.g.rotation.z = .26 + .07 * run * Math.sin(stride * 2) + .04 * Math.sin(wagPh * .5) * happy;
        acc.pom.position.x = -.02 * run * Math.sin(stride * 2 + 1);
      } else if (accId === 'pelerin') {
        acc.cape.rotation.x = -(.06 + .30 * run + .1 * ride) * (.8 + .2 * Math.sin(t * 11)) - .03 * Math.sin(t * 2.3);
        acc.cape.rotation.z = .05 * run * Math.sin(stride);
      } else if (accId === 'bandana') {
        acc.cloth.rotation.x = .30 + .2 * run + .12 * run * Math.max(0, Math.sin(stride * 2));
      }
    }
    update(0);
    function dispose() { clearActions(); meshes.forEach(m => m.geometry.dispose()); snackGeo.dispose(); snackMat.dispose(); boneGeo.dispose(); boneMat.dispose(); skel.dispose();
      for (const k in accCache) { const g = accCache[k].g; if (g.parent) g.parent.remove(g); } accOwned.forEach(x => x.dispose()); }
    return { root, update, dispose, bones, meshes, mouthAnchor, fetchBone, fetchFacing, clearActions, isFetching: () => !!fetch || snacks.length > 0,
      fetchStage: () => fetch ? fetch.stage : snacks.length ? 'spray' : 'idle',
      saddle, head, neck, body, setAccessory, accessory: () => accId, sneeze, isSneezing: () => sneezeT >= 0 };
  }

  let portraitUrl = null;
  function portrait() {
    if (portraitUrl) return portraitUrl;
    if (typeof renderer === 'undefined') return null;
    const N = 192, sc = new THREE.Scene(), m = create(); m.update(0, { portrait: true }); sc.add(m.root);
    sc.add(new THREE.HemisphereLight(0xfff3dd, 0x5f4b3d, 1.5));
    const key = new THREE.DirectionalLight(0xffe5c4, 3.1); key.position.set(-3, 4, 5); sc.add(key);
    const fill = new THREE.DirectionalLight(0xc5defb, 1.5); fill.position.set(3, 2, -1); sc.add(fill);
    const cam = new THREE.OrthographicCamera(-.54, .54, .54, -.54, .1, 10);
    cam.position.set(.10, 1.28, 4); cam.lookAt(0, 1.15, .55); cam.updateMatrixWorld();
    const rt = new THREE.WebGLRenderTarget(N, N, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const oldRT = renderer.getRenderTarget(), oldC = renderer.getClearColor(new THREE.Color()), oldA = renderer.getClearAlpha();
    try {
      renderer.setRenderTarget(rt); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(sc, cam);
      const pixels = new Uint8Array(N * N * 4); renderer.readRenderTargetPixels(rt, 0, 0, N, N, pixels);
      const c = document.createElement('canvas'); c.width = c.height = N;
      const ctx = c.getContext('2d'), out = ctx.createImageData(N, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const a = ((N - 1 - y) * N + x) * 4, b = (y * N + x) * 4, alpha = pixels[a + 3], k = alpha > 0 ? 255 / alpha : 0;
        for (let j = 0; j < 3; j++) out.data[b + j] = Math.min(255, pixels[a + j] * k);
        out.data[b + 3] = alpha;
      }
      ctx.putImageData(out, 0, 0); portraitUrl = c.toDataURL('image/png'); return portraitUrl;
    } finally { renderer.setRenderTarget(oldRT); renderer.setClearColor(oldC, oldA); rt.dispose(); m.dispose(); }
  }
  // Hub UI list (Bilbo'nun Köşesi): id → model.setAccessory(id); simge = emoji yer tutucu
  const ACCESSORIES = Object.freeze([
    { id: 'tasma', ad: 'Kırmızı Tasma', simge: '🦴' },
    { id: 'bandana', ad: 'Puantiyeli Bandana', simge: '🧣' },
    { id: 'sapka', ad: 'Parti Şapkası', simge: '🥳' },
    { id: 'gozluk', ad: 'Havalı Gözlük', simge: '🕶️' },
    { id: 'pelerin', ad: 'Süper Pelerin', simge: '🦸' },
  ]);
  return { create, portrait, ACCESSORIES };
})();
