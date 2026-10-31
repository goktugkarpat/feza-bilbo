/* ── Yetenekler: üç sihirli yetenek (atış anı + süren efektler) ──
   SKILLS[i].cast(ctx) → true | false (false: kullanılamadı, bekleme süresi başlamaz) · SKILLS_update(dt) · SKILLS_clear()
   Three slots per class. SKILLS.forClass(heroClass) selects the wizard or hybrid set; the array itself stays the warrior set.
   Built from FX primitives plus a few own meshes (wind funnel, star meteors, rune circles).
   Player fields written here (GAME reads them):
     P.castT   seconds of cast pose left (0.35 at cast, counted down by SKILLS_update) → H.update st.cast = 1 - P.castT / P.castDur
     P.castDur 0.35 · P.castSkill id of the last skill · P.face turned toward the aim for directional skills
     P.spin    seconds left; owned by this file (set equal to its own timer every SKILLS_update; if GAME zeroes it,
               e.g. on respawn, the whirl ends). P.shield is the wizard frost flower’s brief protection; it is
               counted down here (GAME skips its own countdown while SKILLS_update exists).
   SKILLS_update(dt) must run every simulation step, SKILLS_clear() on zone change. */
'use strict';

const { SKILLS, SKILLS_update, SKILLS_clear } = (function () {
  const CAST_T = 0.35;
  // Four-second volley: a little over two sword hits on a lone target, or three distinct stars through a crowd.
  const STAR_K = 0.7, STAR_ADD = 3, STAR_FAN = 0.22, STAR_GAP = 0.3, STAR_FWD = 0.55, STAR_Y = 0.95;
  const SPIN_T = 2.2, SPIN_R = 2.6, SPIN_TICK = 0.22;
  const MET_N = 8, MET_MAX = 14, MET_SPAN = 1.8, MET_R = 2.2, MET_FALL0 = 0.2, MET_LAND = 0.6;
  // Meteors enter from the upper left of the SCREEN: start = landing spot shifted left/up in camera space, then pulled
  // toward the camera along its ray (gains height without leaving the view – the top-down camera sees little sky).
  const MET_SIDE = 5.2, MET_UP = 1.6, MET_PULL = 0.3;
  const RAINBOW = ['#ff5d73', '#ff9a3c', '#ffd23f', '#72e06a', '#4fc3ff', '#8f7bff', '#ff7ad9', '#ffb35c'];
  const WIND_COLS = ['#ffffff', '#fff1d6', '#ffd9ec'], LEAF_COLS = ['#ff7ab8', '#ffd23f', '#7fd8ff', '#9ff58a', '#c79bff'];   // Dev Ev: kasırgada şeker serpintisi

  const S = { ready: false, warm: false, t: 0, P: null, H: null, castLeft: 0, root: null };
  // ── Dev Ev: yetenek kademeleri (1..3, yıldız şekerle; 08j_his paneli). P.yetenek.kademe[id] ──
  function tier(id) {
    const g = gm(), k = g && g.P && g.P.yetenek && g.P.yetenek.kademe;
    const t = k ? k[id] | 0 : 1;
    return t < 1 ? 1 : t > 3 ? 3 : t;
  }
  const upgradeCost = t => (t <= 1 ? 3 : 6);
  const CREAM_COLS = ['#fff4e2', '#ffbcd8', '#ffe9a8', '#c4f0de', '#ffd0e6'];
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

  // Krema topu: beze/krema sıkma biçimi (yuvarlak taban, 6 oluklu sarmal, kıvrık sivri tepe). Tepe geriye bakar (uçarken kuyruk gibi).
  function creamGeo() {
    const g = new THREE.SphereGeometry(1, 36, 24), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = (y + 1) / 2, th = Math.atan2(z, x);
      const prof = h < 0.3 ? Math.sqrt(Math.max(0, 1 - Math.pow((0.3 - h) / 0.3, 2))) * 0.15 + 0.85 * Math.sin(h / 0.3 * Math.PI / 2) : Math.pow(1 - (h - 0.3) / 0.7, 1.15);
      const ridge = 1 + 0.13 * Math.sin(th * 6 + h * 11) * Math.min(1, h * 3), tw = h * h * 0.35;
      const r = Math.max(0, prof) * ridge, rx = Math.cos(th) * r, rz = Math.sin(th) * r;
      p.setXYZ(i, rx + Math.sin(h * 5) * tw * 0.4, h * 1.7, rz);
    }
    g.computeVertexNormals();
    g.translate(0, -0.55, 0);   // dik duran krema (tepesinde kiraz), ortası y=0
    g.userData.keep = true;
    return g;
  }
  function candyStripes() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 64);
    x.strokeStyle = '#fff'; x.lineWidth = 9;
    for (let i = -4; i < 12; i++) { x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16 + 40, 64); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.userData = { keep: true };
    return t;
  }
  const CREAM = { geo: null, pool: [] };

  // ── Lazy setup: meshes and pools (first cast / first update) ──
  const CIRC = [], METS = [];
  const GARDEN = { grp: null, petals: null, stars: [], flowers: [], mats: [] };
  const HYBRID = { guard: null, blades: [], seal: null, cross: null, mats: [], t: 0, tick: 0, n: 0, dmg: 0, sealT: 0, sealTick: 0, sealN: 0, sealDmg: 0, x: 0, z: 0, shield: null };
  const SPIN = { t: 0, dur: SPIN_T, tick: 0, n: 0, emitT: 0, ang: 0, grp: null, inner: null, outer: null, floor: null };
  const MET = { cx: 0, cz: 0, fx: 0, fz: 0, aimed: [], spots: [], first: true, n: MET_N, r: MET_R, mult: 2 };   // fx, fz: where Feza cast it
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
    const wm = (tw, spd) => { const m = fxMat(SH.wind, { uCol: { value: new THREE.Color('#ffe2bf') }, uA: { value: 0 }, uSpd: { value: spd }, uTw: { value: tw } }); m.vertexShader = VS_WIND; return m; };
    SPIN.inner = mk(GEO.windIn, wm(0.9, 2.6)); SPIN.inner.visible = true;
    SPIN.outer = mk(GEO.windOut, wm(-0.7, 2.0)); SPIN.outer.visible = true;
    SPIN.floor = mk(GEO.plane, fxMat(SH.swirl, { uCol: { value: new THREE.Color('#ffc98a') }, uA: { value: 0 }, uSpd: { value: 1.3 } }), 0.04, 2);
    SPIN.floor.visible = true; SPIN.floor.scale.setScalar(SPIN_R + 0.1);
    sg.add(SPIN.inner, SPIN.outer, SPIN.floor);

    // Yıldız Fırıldağı (eski kaşık kasırgası): Feza'nın çevresinde dönen ışıklı sopalı yıldızlar (kademe ile 3 / 5 / 7)
    SPIN.spoons = [];
    const wood = new THREE.MeshStandardMaterial({ color: '#fff1b0', roughness: 0.35, emissive: '#ffd36a', emissiveIntensity: 0.45 });
    const woodD = new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.25, emissive: '#ffb020', emissiveIntensity: 0.6 });
    const hGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.0, 8).translate(0, 0.5, 0);
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? 0.13 : 0.3; const x = Math.sin(a) * r, y = Math.cos(a) * r; if (i) star.lineTo(x, y); else star.moveTo(x, y); }
    const bGeo = new THREE.ExtrudeGeometry(star, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 }).translate(0, 0, -0.05);
    hGeo.userData.keep = bGeo.userData.keep = true;
    const knob = new THREE.SphereGeometry(0.07, 10, 8); knob.userData.keep = true;
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Group(), h = new THREE.Mesh(hGeo, wood), b = new THREE.Mesh(bGeo, woodD), k = new THREE.Mesh(knob, wood);
      b.position.y = 1.22; k.position.y = 0; sp.add(h, b, k); sp.visible = false; sp.rotation.order = 'YXZ';
      sg.add(sp); SPIN.spoons.push(sp);
    }
    // Krema Fışkırtma: krema topları (beze biçimli, sarmal tepeli), havuzda 12 tane
    CREAM.geo = creamGeo();
    const cherryGeo = new THREE.SphereGeometry(0.2, 16, 12), sprGeo = new THREE.CapsuleGeometry(0.035, 0.13, 3, 6);
    cherryGeo.userData.keep = sprGeo.userData.keep = true;
    const cherryMat = new THREE.MeshStandardMaterial({ color: '#e8233f', roughness: 0.18, emissive: '#7a0010', emissiveIntensity: 0.25 });
    const sprMats = ['#ff5fa8', '#4fc3ff', '#ffd23f', '#72e06a', '#a47bff'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }));
    for (let i = 0; i < 12; i++) {
      // Parıltı Topları (eski krema): pastel, içten ışıyan ışık topları + beyaz parıltı çekirdeği
      const m = new THREE.MeshStandardMaterial({ color: CREAM_COLS[i % CREAM_COLS.length], roughness: 0.3, metalness: 0, emissive: CREAM_COLS[i % CREAM_COLS.length], emissiveIntensity: 0.55 });
      const mesh = new THREE.Group(), body = new THREE.Mesh(CREAM.orb || (CREAM.orb = (g => { g.userData.keep = true; return g.translate(0, 0.55, 0); })(new THREE.SphereGeometry(0.62, 20, 14))), m), ch = new THREE.Mesh(cherryGeo, CREAM.core || (CREAM.core = new THREE.MeshBasicMaterial({ color: '#ffffff' })));
      ch.position.set(0.04, 1.18, 0); mesh.add(body, ch);
      for (let k = 0; k < 6; k++) {   // renkli şeker serpintisi
        const s = new THREE.Mesh(sprGeo, sprMats[(i + k) % 5]), an = k * 1.05 + i, hh = 0.05 + (k % 3) * 0.28;
        const rr = 0.92 * (hh < 0.2 ? 1 : 1 - (hh - 0.2) * 0.75);
        s.position.set(Math.cos(an) * rr, hh - 0.1, Math.sin(an) * rr); s.rotation.set(an, k, 1.2); mesh.add(s);
      }
      mesh.traverse(o => { o.frustumCulled = false; });
      const it = { mesh, free: true };
      mesh.userData.dispose = () => { it.free = true; };
      CREAM.pool.push(it);
    }
    // Şeker Yağmuru: ambalajlı, çizgili parlak şekerler + gökkuşağı kuyruk + parıltı
    const stripes = candyStripes();
    const cGeo = new THREE.SphereGeometry(0.5, 24, 16), wGeo = new THREE.ConeGeometry(0.34, 0.42, 12, 1, true);
    cGeo.userData.keep = wGeo.userData.keep = true;
    for (let i = 0; i < MET_MAX; i++) {
      const col = new THREE.Color(RAINBOW[i % RAINBOW.length]);
      const cm = rimify(new THREE.MeshStandardMaterial({ color: col, emissive: '#ffffff', emissiveMap: stripes, emissiveIntensity: 0.55, roughness: 0.22, metalness: 0.05 }), 0xffffff, 0.7, 2.4);
      const wm2 = new THREE.MeshStandardMaterial({ color: RAINBOW[(i + 3) % RAINBOW.length], roughness: 0.35, side: THREE.DoubleSide, emissive: RAINBOW[(i + 3) % RAINBOW.length], emissiveIntensity: 0.35 });
      const grp = new THREE.Group(); grp.visible = false;
      const core = new THREE.Group(); core.scale.setScalar(0.62);
      const ball = new THREE.Mesh(cGeo, cm), w1 = new THREE.Mesh(wGeo, wm2), w2 = new THREE.Mesh(wGeo, wm2);
      w1.rotation.z = Math.PI / 2; w1.position.x = 0.62; w2.rotation.z = -Math.PI / 2; w2.position.x = -0.62;
      ball.frustumCulled = w1.frustumCulled = w2.frustumCulled = false;
      core.add(ball, w1, w2);
      const tail = new THREE.Mesh(GEO.tail, fxMat(SH.tail, { uCol: { value: col.clone() }, uA: { value: 1 }, uHue: { value: i / 8 } }));
      const glow = new THREE.Mesh(GEO.bill, fxMat(SH.halo2, { uCol: { value: col.clone() }, uA: { value: 0.35 } }));
      glow.scale.setScalar(2.0); glow.renderOrder = 6; tail.renderOrder = 5;
      tail.frustumCulled = glow.frustumCulled = false;
      grp.add(tail, glow, core);
      root.add(grp);
      METS.push({ st: 0, t0: 0, grp, core, tail, glow, col: RAINBOW[i % RAINBOW.length], x: 0, z: 0, emitT: 0,
        s: new THREE.Vector3(), d: new THREE.Vector3() });
    }
    // One reusable constellation flower: thin petal tracery and eight gold stars, no lights or per-cast meshes.
    const garden = GARDEN.grp = new THREE.Group(); garden.name = 'starGarden'; garden.visible = false; root.add(garden);
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
    const lineMat = new THREE.LineBasicMaterial({ color: '#f19bff', transparent: true, opacity: 0.85, depthWrite: false });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#ffd467', emissive: '#ffbc47', emissiveIntensity: 0.65, roughness: 0.3, metalness: 0.25, transparent: true, depthWrite: false });
    GARDEN.mats.push(lineMat, goldMat);
    const petals = GARDEN.petals = new THREE.LineSegments(ge, lineMat); petals.frustumCulled = false; garden.add(petals);
    for (let i = 0; i < 8; i++) {
      const star = new THREE.Mesh(GEO.star, goldMat); star.frustumCulled = false; garden.add(star); GARDEN.stars.push(star);
    }

    // Small raised blossoms around the rim. All eight flowers share one low-poly mesh and material.
    const flowerGeo = new THREE.BufferGeometry(), fv = [];
    for (let petal = 0; petal < 5; petal++) for (let j = 0; j < 8; j++) {
      const a = petal * TAU / 5 + j / 8 * TAU / 5, b = a + TAU / 40;
      const ra = 0.22 + 0.18 * Math.pow(Math.sin(j / 8 * Math.PI), 2), rb = 0.22 + 0.18 * Math.pow(Math.sin((j + 1) / 8 * Math.PI), 2);
      fv.push(0, 0.06, 0, Math.cos(a) * ra, 0.02, Math.sin(a) * ra, Math.cos(b) * rb, 0.02, Math.sin(b) * rb);
    }
    flowerGeo.setAttribute('position', new THREE.Float32BufferAttribute(fv, 3)); flowerGeo.computeVertexNormals(); flowerGeo.userData.keep = true;
    const flowerMat = new THREE.MeshBasicMaterial({ color: '#e99ee9', transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
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
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#b7ffed', emissive: '#39aaac', emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.25, transparent: true });
    const hiltMat = new THREE.MeshBasicMaterial({ color: '#ffd378', transparent: true });
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
    c.on = true; c.alpha = mode === 1 ? 1 : 0.65; c.t = 0; c.dur = dur; c.mode = mode; c.r = r; c.follow = !!follow;
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

  // ── Dev Ev 1. Krema Fışkırtma: önüne yelpaze gibi krema topları (kademe: 3 / 5 / 7 top, daha güçlü, 3. kademede huysuz şaşırır) ──
  function castCream(c) {
    const g = gm(); if (!g || !g.spawnProjectile) return false;
    if (!S.ready) ensure();
    castPose(c, 'krema', true);
    const t = tier('krema'), n = [3, 5, 7][t - 1], mult = [1, 1.2, 1.45][t - 1];
    const base = Math.atan2(c.aim.x, c.aim.z), dmg = Math.max(1, Math.round((STAR_K * sword() + STAR_ADD) * mult));
    const targets = near(c.x, c.z, 10.8).filter(e => {
      const dx = e.x - c.x, dz = e.z - c.z, d = Math.hypot(dx, dz);
      return alive(e) && inSight(c.x, c.z, e) && (d < 0.1 || (dx * c.aim.x + dz * c.aim.z) / d > 0.72);
    });
    targets.sort((a, b) => a === c.target ? -1 : b === c.target ? 1 : dist2(c.x, c.z, a.x, a.z) - dist2(c.x, c.z, b.x, b.z));
    const ax = c.aim.x, az = c.aim.z, rx = az, rz = -ax, fan = n > 3 ? 0.17 : 0.22;
    for (let k = 0; k < n; k++) {
      const i = k - (n - 1) / 2;
      const x0 = c.x + ax * STAR_FWD + rx * i * 0.22, z0 = c.z + az * STAR_FWD + rz * i * 0.22;
      const tg = Math.abs(i) <= 1 && targets.length ? targets[(i === 0 ? 0 : i < 0 ? 1 : 2) % targets.length] : null;
      const a = tg ? Math.atan2(tg.x - x0, tg.z - z0) : base + i * fan, dx = Math.sin(a), dz = Math.cos(a);
      const it = CREAM.pool.find(q => q.free);
      let obj = null;
      if (it) { it.free = false; obj = it.mesh; obj.scale.setScalar(0.34 + 0.04 * t); obj.rotation.set(0, a, 0); }
      const sp = 13.5 + Math.abs(i) * 0.6;
      g.spawnProjectile({ x: x0, y: 0.85, z: z0, vx: dx * sp, vz: dz * sp, r: 0.55, dmg, owner: 'feza', kind: 'cream', life: 0.85, pierce: t + 1, obj,
        color: '#fff3e6', kb: 0.55, stun: t >= 3 ? 0.6 : 0, onHit: creamHit });
      puff(x0, 0.85, z0, dx * 2.2, 0.6, dz * 2.2, 0.3, 0.2, 0.06, fpick(CREAM_COLS), '#ffffff', 3, 2, 2, 1, false);
    }
    for (let i = 0; i < 6; i++) {   // elden fışkıran krema damlaları
      puff(c.x + ax * 0.5, 0.95, c.z + az * 0.5, ax * frand(2, 4) + frand(-0.8, 0.8), frand(0.8, 2.2), az * frand(2, 4) + frand(-0.8, 0.8),
        frand(0.4, 0.6), frand(0.14, 0.22), 0.05, fpick(CREAM_COLS), '#ffffff', 3, 6, 1, 1, false);
    }
    circle(c.x, c.z, '#ffd0e4', 1.25, 0.45, 0, true);
    sfx('splash', { x: c.x, z: c.z, pitch: 1.35, vol: 0.7 }); sfx('squish', { x: c.x, z: c.z, pitch: 1.2 });
    word(c.x + ax, c.z + az, 'Fış!');
    return true;
  }
  function creamHit(p) {
    burst('cream', p.x, p.y, p.z, { count: 5 });
    fxRing(p.x, p.z, { r0: 0.15, r1: 0.72, dur: 0.22, color: '#fff2e2', width: 0.12 });
    sfx('splat', { x: p.x, z: p.z, vol: 0.55, pitch: frand(1.0, 1.3) });
  }

  function starHit(p) {
    fxRing(p.x, p.z, { r0: 0.12, r1: 0.8, dur: 0.22, color: '#ffe285', width: 0.13 });
    burst('sparkle', p.x, p.y, p.z, { color: '#ffd23f', count: 4 });
  }

  // ── 2. Kasırga: Feza whirls, wind funnel hits everything around him ──
  function castSpin(c) {
    if (SPIN.t > 0.3) return false;
    castPose(c, 'kasirga', false);
    const t = SPIN.tier = tier('kasik');   // Dev Ev: Kaşık Kasırgası kademesi (kaşık sayısı, yarıçap, süre, güç)
    SPIN.r = [SPIN_R, 3.0, 3.4][t - 1]; SPIN.mult = [0.6, 0.72, 0.86][t - 1]; SPIN.nSp = [3, 5, 7][t - 1];
    const dur = [SPIN_T, 2.7, 3.2][t - 1];
    SPIN.floor.scale.setScalar(SPIN.r + 0.1);
    for (let i = 0; i < SPIN.spoons.length; i++) SPIN.spoons[i].visible = i < SPIN.nSp;
    SPIN.t = SPIN.dur = dur; SPIN.tick = 0.06; SPIN.n = 0; SPIN.ang = c.P.face || 0;
    c.P.spin = dur;
    SPIN.grp.position.set(c.x, 0, c.z); SPIN.grp.visible = true;
    circle(c.x, c.z, '#ffc98a', 1.6, 0.6, 0, true);
    fxRing(c.x, c.z, { r0: 0.5, r1: 3.2, dur: 0.4, color: '#bff4ff', width: 0.4 });
    burst('dust', c.x, 0.1, c.z, { count: 6 });
    sfx('spin', { x: c.x, z: c.z });
    word(c.x, c.z, 'Fırr!');
    return true;
  }
  function spinHit(P) {
    const R = SPIN.r || SPIN_R, x = P.pos.x, z = P.pos.z, list = near(x, z, R);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      hurt(e, Math.max(1, Math.round((SPIN.mult || 0.6) * sword())), { kb: 0.35, fromX: x, fromZ: z, kind: 'spin' });
      if (i < 3) burst('hit', e.x, eY(e), e.z, { color: '#ffd9a0', count: 3 });
      if (i < 2 && SPIN.n % 2 === 0) sfx('bonk', { x: e.x, z: e.z, vol: 0.35, pitch: frand(1.1, 1.5) });   // kaşık "tok!"
    }
    smash(x, z, R);
    SPIN.n++;
    if (fxOk('slash')) FX.slash(x, 0.75, z, SPIN.ang, 1, '#dff8ff', 2.0, 2.6);
    if (SPIN.n % 3 === 0) fxRing(x, z, { r0: 1.2, r1: R + 0.2, dur: 0.3, color: '#ffe2b0', width: 0.2 });
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
    SPIN.inner.material.uniforms.uA.value = a * 0.7;
    SPIN.outer.material.uniforms.uA.value = a * 0.48;
    SPIN.floor.material.uniforms.uA.value = a * 0.55;
    SPIN.inner.rotation.y += dt * 9; SPIN.outer.rotation.y += dt * 6; SPIN.floor.rotation.y += dt * 4;
    SPIN.inner.scale.setScalar(0.8 + 0.2 * a); SPIN.outer.scale.set(0.75 + 0.25 * a, 0.6 + 0.4 * a, 0.75 + 0.25 * a);
    SPIN.ang += dt * 16;
    // dönen tahta kaşıklar: Feza'nın çevresinde, kasırganın kenarına doğru açılır, kendi çevrelerinde de döner
    const nSp = SPIN.nSp || 3, rr = ((SPIN.r || SPIN_R) - 0.75) * (0.4 + 0.6 * a);
    for (let i = 0; i < nSp; i++) {
      const sp = SPIN.spoons[i], an = SPIN.ang * 0.55 + i * TAU / nSp;
      sp.position.set(Math.sin(an) * rr * 0.45, 0.55 + 0.25 * Math.sin(SPIN.ang * 0.8 + i * 1.7), Math.cos(an) * rr * 0.45);
      sp.rotation.set(1.3 + 0.15 * Math.sin(SPIN.ang * 0.7 + i), an, 0.5 * Math.sin(SPIN.ang + i));   // sap dışa, kepçe uçta (pervane gibi)
      sp.scale.setScalar(Math.max(0.01, a) * rr * 0.5);
    }
    SPIN.tick -= dt;
    if (SPIN.tick <= 0) { SPIN.tick += SPIN_TICK; spinHit(P); }
    SPIN.emitT -= dt;
    while (SPIN.emitT <= 0 && a > 0.2) {   // sparkles and little leaves whirled around Feza
      SPIN.emitT += 0.07;
      const an = frand(0, TAU), r = frand(1.0, 1.9), s = Math.sin(an), co = Math.cos(an);
      orbit(frand(7, 10), x, z);
      puff(x + s * r, frand(0.2, 1.8), z + co * r, s * 1.2, frand(0.6, 1.6), co * 1.2, frand(0.35, 0.5), frand(0.2, 0.32), 0.04,
        fpick(WIND_COLS), '#7ee0ff', 2, 0, 1.5, 1.35);
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
    { const t = tier('seker'); MET.n = [MET_N, 11, 14][t - 1]; MET.r = [MET_R, 2.5, 2.8][t - 1]; MET.mult = [2, 2.25, 2.6][t - 1]; }   // Dev Ev: Şeker Yağmuru kademesi
    let k = 0;
    for (let i = 0; i < METS.length && k < MET.n; i++) {
      const m = METS[i];
      if (m.st) continue;
      m.st = 1; m.t0 = S.t + 0.1 + k / (MET.n - 1) * (MET_SPAN - MET_LAND) + frand(-0.03, 0.03);
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
        circle(m.x, m.z, m.col, MET.r * 0.82, MET_LAND + 0.03, 1, false);
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
          m.emitT += 0.045;
          puff(x + frand(-0.2, 0.2), y + frand(-0.2, 0.2), z + frand(-0.2, 0.2), frand(-0.6, 0.6), frand(-0.2, 0.8), frand(-0.6, 0.6),
            frand(0.25, 0.4), frand(0.18, 0.28), 0, m.col, '#ffffff', frand() < 0.5 ? 1 : 2, -1, 1.5);
        }
        if (age >= MET_LAND) meteorBoom(m);
      }
    }
  }
  function meteorBoom(m) {
    m.st = 0; m.grp.visible = false;
    const x = m.x, z = m.z, list = near(x, z, MET.r);
    // walls stop the blast, as for the frost flower and the seal (seen from the landing spot; a stone aimed at a huysuz by a
    // wall may land a hair inside the wall cell → from the visible centre instead)
    const fl = isFloor(x, z), sx = fl ? x : MET.cx, sz = fl ? z : MET.cz;
    for (let i = 0; i < list.length; i++) if (inSight(sx, sz, list[i]))
      hurt(list[i], Math.max(1, Math.round((MET.mult || 2) * sword())), { kb: 1.2, fromX: x, fromZ: z, kind: 'meteor' });
    smash(x, z, MET.r);
    fxRing(x, z, { r0: 0.4, r1: MET.r + 0.2, dur: 0.3, color: m.col, width: 0.22 });
    burst('hit', x, 0.6, z, { color: m.col, scale: 0.9, count: 3 });
    burst('sparkle', x, 0.6, z, { color: m.col, count: 4 });
    // Only the leading candy lends the scene a little light; later impacts stay local.
    if (MET.first) { lightFlash(x, z, m.col, 1.5, 0.18); shake(0.07); }
    sfx('boom', { vol: MET.first ? 0.55 : 0.3, x, z, pitch: frand(1.0, 1.15) });
    if (MET.first) { MET.first = false; word(x, z, 'Şeker!'); }
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
    castPose(c, 'isikoklari', true);
    const g = gm();
    if (!g || !g.spawnProjectile) return false;
    const targets = near(c.x, c.z, 11).filter(e => alive(e) && inSight(c.x, c.z, e));
    targets.sort((a, b) => dist2(c.x, c.z, a.x, a.z) - dist2(c.x, c.z, b.x, b.z));
    for (let i = 0; i < 3; i++) {
      const side = (i - 1) * 0.32, x = c.x + c.aim.x * 0.6 + c.aim.z * side, z = c.z + c.aim.z * 0.6 - c.aim.x * side;
      const e = targets[i % Math.max(1, targets.length)];
      const a = e ? Math.atan2(e.x - x, e.z - z) : Math.atan2(c.aim.x, c.aim.z) + (i - 1) * 0.16;
      g.spawnProjectile({ x, y: 1.05, z, vx: Math.sin(a) * 17, vz: Math.cos(a) * 17, r: 0.4,
        dmg: Math.max(1, Math.round(sword() * 0.82 + 2)), owner: 'feza', kind: 'arcane', color: '#be8cff', life: 0.72, pierce: 1 });
      puff(x, 1.05, z, 0, 0.4, 0, 0.35, 0.3, 0, '#d7b5ff', '#7f64e8', 2, 0, 1, 1.4);
    }
    circle(c.x, c.z, '#be8cff', 1.2, 0.5, 0, true);
    sfx('star', { x: c.x, z: c.z, pitch: 1.2 });
    return true;
  }
  function frostBloom(p) {
    const list = near(p.x, p.z, 3.1);
    for (let i = 0; i < list.length; i++) if (inSight(p.x, p.z, list[i]))
      hurt(list[i], Math.max(1, Math.round(p.dmg * 1.6)), { freeze: 2.2, kb: 0.3, fromX: p.x, fromZ: p.z, kind: 'ice' });
    smash(p.x, p.z, 3.1);
    circle(p.x, p.z, '#8fe4ff', 3.1, 0.75, 2, false);
    fxRing(p.x, p.z, { r0: 0.2, r1: 3.1, dur: 0.55, color: '#b6f5ff', width: 0.35 });
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      puff(p.x, 0.6, p.z, Math.sin(a) * 4, 1.3, Math.cos(a) * 4, 0.65, 0.4, 0.03, '#c4f7ff', '#73b9ef', 2, 2, 2, 1.5);
    }
    sfx('star', { x: p.x, z: p.z, pitch: 1.5 });
  }
  function castFrost(c) {
    castPose(c, 'buzcicegi', true);
    const g = gm();
    if (!g || !g.spawnProjectile) return false;
    c.P.shield = Math.max(c.P.shield || 0, 2.2);
    if (MAGIC.shield) MAGIC.shield.remove();
    MAGIC.shield = fxOk('shield') ? FX.shield(c.H && c.H.root ? c.H.root : c.P.pos) : null;
    g.spawnProjectile({ x: c.x + c.aim.x * 0.55, y: 1, z: c.z + c.aim.z * 0.55,
      vx: c.aim.x * 13, vz: c.aim.z * 13, r: 0.65, dmg: Math.max(1, Math.round(sword())),
      owner: 'feza', kind: 'ice', color: '#8fe4ff', life: 0.95, freeze: 2.2, onHit: frostBloom });
    circle(c.x, c.z, '#b6f5ff', 1.4, 2.2, 0, true);
    burst('magic', c.x, 1.2, c.z, { color: '#8fe4ff', count: 8 });
    sfx('shield', { x: c.x, z: c.z, vol: 0.6 });
    return true;
  }
  function castGarden(c) {
    castPose(c, 'yildizbahcesi', true);
    let x = c.target ? c.target.x : c.x + c.aim.x * 5, z = c.target ? c.target.z : c.z + c.aim.z * 5;
    // An empty cast at a wall still makes a garden on the nearest reachable floor.
    for (let i = 0; i < 12 && (!isFloor(x, z) || !inSight(c.x, c.z, { x, z })); i++) { x = lerp(x, c.x, 0.3); z = lerp(z, c.z, 0.3); }
    MAGIC.x = x; MAGIC.z = z; MAGIC.t = 3.2; MAGIC.tick = 0.25; MAGIC.emitT = 0; MAGIC.n = 0; MAGIC.dmg = Math.max(1, Math.round(sword() * 0.95));
    GARDEN.grp.position.set(x, 0, z); GARDEN.grp.visible = true; GARDEN.grp.scale.setScalar(0.05);
    const ground = circle(x, z, '#aa68dc', 3.6, MAGIC.t, 0, false); if (ground) ground.alpha = 0.22;
    circle(c.x, c.z, '#f5c6ff', 1.2, 0.55, 0, true);
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
        burst('sparkle', e.x, eY(e), e.z, { color: '#f7c6ff', count: 4 });
      }
      smash(x, z, 3.6);
      fxRing(x, z, { r0: 0.2, r1: 3.6, dur: 0.55, color: '#dca3ff', width: 0.22 });
      // Every damage beat sends a crown of star-petals upward, so the six pulses can be seen as well as heard.
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + MAGIC.n * 0.2, r = 2.4;
        puff(x + Math.cos(a) * r, 0.25, z + Math.sin(a) * r, Math.cos(a) * 0.35, 2.5, Math.sin(a) * 0.35,
          0.7, 0.32, 0.02, i % 2 ? '#ffd976' : '#e9adff', '#a173d9', i % 2 ? 1 : 10, 1.5, 0.4, 1.25);
      }
      sfx('star', { x, z, vol: 0.35, pitch: 1 + MAGIC.n * 0.08 });
    }
    if (MAGIC.emitT <= 0) {
      MAGIC.emitT += 0.09;
      for (let i = 0; i < 3; i++) {
        const a = S.t * 1.5 + i * TAU / 3, r = 2.5;
        puff(x + Math.sin(a) * r, 1.5 + Math.sin(a * 2) * 0.5, z + Math.cos(a) * r, 0, 0.3, 0,
          0.5, 0.35, 0.02, i === 1 ? '#ffe9a2' : '#dba8ff', '#977ae8', 1, 0, 1, 1.5);
      }
    }
  }

  // ── Büyülü Şövalye: a travelling sword crescent, a protective bond, and a crossed rainbow seal ──
  function hybridDamage(P, magic) { return Math.max(1, (magic ? P.magicDmg : P.meleeDmg) || P.dmg || 10); }
  function castCrescent(c) {
    const g = gm(); if (!g || !g.spawnProjectile) return false;
    castPose(c, 'hilaldalgasi', true);
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
        r: 0.65, dmg, owner: 'feza', kind: 'crescent', color: '#7af3df', life: 0.85, pierce: 3, kb: 0.15 });
    }
    if (fxOk('slash')) FX.slash(c.x, 0.8, c.z, c.P.face, 1, '#7af3df', 1.7, 2.5);
    circle(c.x, c.z, '#7af3df', 1.1, 0.45, 0, true);
    sfx('whoosh', { x: c.x, z: c.z, pitch: 1.15 }); return true;
  }
  function castBond(c) {
    castPose(c, 'isikbagi', false);
    HYBRID.t = 3; HYBRID.tick = 0.25; HYBRID.n = 0;
    HYBRID.dmg = Math.round((hybridDamage(c.P, false) + hybridDamage(c.P, true)) * 0.34);
    c.P.shield = Math.max(c.P.shield || 0, 1.8);
    if (HYBRID.shield) HYBRID.shield.remove();
    HYBRID.shield = fxOk('shield') ? FX.shield(c.H && c.H.root ? c.H.root : c.P.pos) : null;
    HYBRID.guard.visible = true; HYBRID.guard.position.set(c.x, 0, c.z);
    const mark = circle(c.x, c.z, '#72f0d8', 2.8, 3, 0, true); if (mark) mark.alpha = 0.32;
    sfx('shield', { x: c.x, z: c.z, vol: 0.7 }); return true;
  }
  function castSeal(c) {
    castPose(c, 'gokkusagimuhru', true);
    let x = c.target ? c.target.x : c.x + c.aim.x * 4.5, z = c.target ? c.target.z : c.z + c.aim.z * 4.5;
    for (let i = 0; i < 12 && (!isFloor(x, z) || !inSight(c.x, c.z, { x, z })); i++) { x = lerp(x, c.x, 0.3); z = lerp(z, c.z, 0.3); }
    HYBRID.x = x; HYBRID.z = z; HYBRID.sealT = 3.3; HYBRID.sealTick = 0.65; HYBRID.sealN = 0;
    HYBRID.sealDmg = Math.round((hybridDamage(c.P, false) + hybridDamage(c.P, true)) * 0.48);
    HYBRID.seal.position.set(x, 0, z); HYBRID.seal.visible = true;
    const mark = circle(x, z, '#ffd378', 3.8, 3.3, 0, false); if (mark) mark.alpha = 0.4;
    circle(c.x, c.z, '#7af3df', 1.3, 0.6, 0, true);
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
          if (i < 3 && fxOk('lightning')) FX.lightning([{ x, y: 1.3, z }, { x: e.x, y: eY(e), z: e.z }], '#7af3df');
        }
        fxRing(x, z, { r0: 1.2, r1: 3.1, dur: 0.4, color: '#7af3df', width: 0.13 });
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
        HYBRID.sealTick += 0.45; const color = RAINBOW[HYBRID.sealN++];
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
  // Dev Ev: ev temalı üç yetenek (resimli büyük simgeler: svg). Her biri yıldız şekerle 3 kademe güçlenir (tier / upgradeCost).
  const ICON = {
    krema: `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="skKb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fe2ff"/><stop offset="1" stop-color="#3b9be0"/></linearGradient></defs>
      <path d="M8 80 L38 52 L52 66 L22 94Z" fill="url(#skKb)" stroke="#1f5f96" stroke-width="3.5" stroke-linejoin="round"/><path d="M14 82 L36 61" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <path d="M38 52 L46 46 L58 58 L52 66Z" fill="#d6dee8" stroke="#6b7a8c" stroke-width="3" stroke-linejoin="round"/>
      <g stroke="#e3b98e" stroke-width="3" stroke-linejoin="round"><path d="M50 44 Q44 36 52 32 Q50 24 60 24 Q62 16 70 20 Q78 18 76 28 Q86 30 80 38 Q86 46 76 48 Q72 56 64 50 Q58 56 50 44Z" fill="#fffaf0"/>
      <path d="M78 12 Q74 6 80 4 Q88 4 86 12 Q92 16 86 20 Q80 22 78 12Z" fill="#ffd3e6"/><path d="M88 34 Q86 28 92 28 Q98 30 95 36 Q92 40 88 34Z" fill="#fff3c9"/></g>
      <path d="M58 32 Q64 28 70 32" stroke="#f0d2b0" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g stroke-width="3.2" stroke-linecap="round"><path d="M60 38 l4 -2" stroke="#ff5fa8"/><path d="M68 42 l3 3" stroke="#4fc3ff"/><path d="M70 30 l4 1" stroke="#ffd23f"/><path d="M56 26 l1 -4" stroke="#72e06a"/></g>
      <circle cx="66" cy="18" r="5" fill="#e8264a" stroke="#9e1430" stroke-width="2"/><path d="M66 13 Q68 6 74 6" stroke="#4a8a2a" stroke-width="2.5" fill="none"/></svg>`,
    kasik: `<svg viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" stroke-linecap="round"><path d="M18 64 Q14 40 36 28 Q60 16 80 34" stroke="#ffe2bf" stroke-width="7" opacity=".9"/><path d="M84 46 Q88 70 64 80 Q40 88 22 72" stroke="#ffc98a" stroke-width="6" opacity=".9"/>
      <path d="M30 52 Q34 36 52 34 Q68 34 72 48" stroke="#fff" stroke-width="4" opacity=".8"/></g>
      <g transform="rotate(-40 50 50)"><rect x="46" y="38" width="8" height="52" rx="4" fill="#d9a05e" stroke="#8a5a26" stroke-width="3"/><ellipse cx="50" cy="26" rx="14" ry="19" fill="#c98a48" stroke="#8a5a26" stroke-width="3.2"/><ellipse cx="46" cy="22" rx="5" ry="8" fill="#e8bd86" opacity=".9"/></g>
      <g transform="rotate(60 50 50)"><rect x="47" y="44" width="6" height="40" rx="3" fill="#e2ad6c" stroke="#8a5a26" stroke-width="2.6"/><ellipse cx="50" cy="35" rx="10" ry="13" fill="#d39552" stroke="#8a5a26" stroke-width="2.8"/></g>
      <g fill="#ff7ab8"><circle cx="20" cy="30" r="3.5"/><circle cx="82" cy="70" r="3.5" fill="#7fd8ff"/><circle cx="76" cy="18" r="3" fill="#ffd23f"/><circle cx="16" cy="78" r="3" fill="#9ff58a"/></g></svg>`,
    seker: `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="skCl" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe8ff"/></radialGradient></defs>
      <path d="M16 40 Q10 26 26 24 Q30 10 46 14 Q56 4 68 14 Q84 12 84 28 Q96 32 88 44 Z" fill="url(#skCl)" stroke="#9fb0e0" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="40" cy="30" r="2.6" fill="#5a4a7a"/><circle cx="58" cy="30" r="2.6" fill="#5a4a7a"/><path d="M44 35 Q49 40 54 35" stroke="#5a4a7a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <g stroke-width="2.6" stroke-linejoin="round">
      <g transform="translate(26 62) rotate(-25)"><path d="M-8 0 L-16 -6 L-16 6Z M8 0 L16 -6 L16 6Z" fill="#7fd8ff" stroke="#2f8fc7"/><circle r="8.5" fill="#ff5fa8" stroke="#b0256a"/><path d="M-5 -3 Q0 -7 5 -3" stroke="#fff" fill="none"/></g>
      <g transform="translate(56 74) rotate(20)"><path d="M-8 0 L-16 -6 L-16 6Z M8 0 L16 -6 L16 6Z" fill="#ff9ec7" stroke="#c44a86"/><circle r="8.5" fill="#ffd23f" stroke="#b07a00"/><path d="M-5 -3 Q0 -7 5 -3" stroke="#fff" fill="none"/></g>
      <g transform="translate(80 58) rotate(-10)"><path d="M-7 0 L-14 -5 L-14 5Z M7 0 L14 -5 L14 5Z" fill="#ffd23f" stroke="#b07a00"/><circle r="7.5" fill="#72e06a" stroke="#2f8a2a"/><path d="M-4 -3 Q0 -6 4 -3" stroke="#fff" fill="none"/></g>
      <g transform="translate(40 90) rotate(8)"><path d="M-6 0 L-12 -5 L-12 5Z M6 0 L12 -5 L12 5Z" fill="#c79bff" stroke="#6a3ab8"/><circle r="6.5" fill="#4fc3ff" stroke="#1f6fa8"/></g></g>
      <g stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".85"><path d="M30 48 l-3 6"/><path d="M62 52 l-3 7"/><path d="M78 44 l-2 5"/></g></svg>`,
  };
  const list = [
    { id: 'krema', ad: 'Parıltı Topları', icon: '✨', lvl: 1, cd: 4, color: '#ffb3d1', line: 'yetenek_krema', tierLine: 'guclendi_krema', cast: wrap(castCream) },
    { id: 'kasik', ad: 'Yıldız Fırıldağı', icon: '🌟', lvl: 3, cd: 15, color: '#ffc98a', line: 'yetenek_kasik', tierLine: 'guclendi_kasik', cast: wrap(castSpin) },
    { id: 'seker', ad: 'Şeker Yağmuru', icon: '💫', lvl: 5, cd: 24, color: '#b9a4ff', line: 'yetenek_seker', tierLine: 'guclendi_seker', cast: wrap(castMeteor) },
  ];
  const wizard = [
    { id: 'isikoklari', ad: 'Işık Okları', icon: '✨', lvl: 1, cd: 4, color: '#be8cff', line: 'buyu1', cast: wrap(castArrows) },
    { id: 'buzcicegi', ad: 'Buz Çiçeği', icon: '❄️', lvl: 3, cd: 15, color: '#8fe4ff', line: 'buyu2', cast: wrap(castFrost) },
    { id: 'yildizbahcesi', ad: 'Yıldız Bahçesi', icon: '🌌', lvl: 5, cd: 24, color: '#e6a5ff', line: 'buyu3', cast: wrap(castGarden) },
  ];
  const hybrid = [
    { id: 'hilaldalgasi', ad: 'Hilal Dalgası', icon: '🌙', lvl: 1, cd: 4, color: '#7af3df', line: 'hibrit1', cast: wrap(castCrescent) },
    { id: 'isikbagi', ad: 'Işık Bağı', icon: '⚔️', lvl: 3, cd: 15, color: '#72f0d8', line: 'hibrit2', cast: wrap(castBond) },
    { id: 'gokkusagimuhru', ad: 'Gökkuşağı Mührü', icon: '🌈', lvl: 5, cd: 24, color: '#ffd378', line: 'hibrit3', cast: wrap(castSeal) },
  ];
  list.forClass = heroClass => heroClass === 'hybrid' ? hybrid : heroClass === 'wizard' ? wizard : list;
  list.tier = tier; list.upgradeCost = upgradeCost; list.ICON = ICON;
  // Büyücü / büyülü şövalye yetenekleri de yıldız şekerle güçlenir: her kademe bekleme süresini kısaltır (%15 / %30)
  for (const d of wizard.concat(hybrid)) {
    const base = d.cd;
    Object.defineProperty(d, 'cd', { get: () => base * [1, 0.85, 0.7][tier(d.id) - 1], enumerable: true });
  }
  return { SKILLS: list, SKILLS_update: update, SKILLS_clear: clear };
})();
