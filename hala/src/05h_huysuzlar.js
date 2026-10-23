/* ── Normal huysuzlar: canlanmış ev eşyaları (Dev Ev Macerası) ──
   Hepsi SEVİMLİ: gülen / yaramaz yüz (kızgın kaş, diş, korkutucu şey yok), kendine has yürüyüş ve önceden belli saldırı hazırlığı,
   vurulunca komik "boing" yaylanması, neşelenince ^ ^ gözler, kocaman gülümseme, kalpler (EMODEL ortak yüz/iskelet araçları).
   Modeller EMODEL.KIT ile kurulur (tek parça deri + kemik, örnek başına 1 çizim; geometri tipler arasında paylaşılır),
   EMODEL.addType ile kaydedilir; HUYSUZ.type'ın model(o) kancası EMODEL.buildRaw ile kurar. Davranış base tipinden gelir.
   Oda başına: 3 huysuz + 1 elit (taçlı, parlak) + 1 nadir (gökkuşağı / altın; neşelenince "gizli" çıkartma + altın şeker).
   Biçim: src/SPEC.md › "Dev Ev API" › Huysuz kaydı. Sesler: src/02l_huysuz.js. */
(() => {
  'use strict';
  const PI = Math.PI;
  const HAS = typeof EMODEL !== 'undefined' && EMODEL && EMODEL.KIT && EMODEL.addType && EMODEL.buildRaw;
  const K = HAS ? EMODEL.KIT : null, G = HAS ? K.G : null;
  const col = h => new THREE.Color(h), hdr = (h, k) => new THREE.Color(h).multiplyScalar(k);
  const mixc = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  const hash = (a, b, c) => (K ? K.hash3(a, b, c) : 0.5);
  const sm = x => smooth01(x);

  // ── ortak parçalar ──
  // Gerçek ölçülü yumuşak kutu (köşe yarıçapı rad metre), önbellekli
  function sbox(w, h, d, rad, seg = 3) {
    const s = Math.max(2, Math.round(seg * 1));
    return K.gx(`hz_sbox_${w}_${h}_${d}_${rad}_${s}`, () => {
      const g = new THREE.BoxGeometry(w, h, d, s * 2 + 1, s * 2 + 1, s * 2 + 1);
      const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        c.set(clamp(v.x, -w / 2 + rad, w / 2 - rad), clamp(v.y, -h / 2 + rad, h / 2 - rad), clamp(v.z, -d / 2 + rad, d / 2 - rad));
        const dd = v.clone().sub(c);
        if (dd.lengthSq() > 1e-10) { dd.normalize(); v.copy(c).addScaledVector(dd, rad); p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, dd.x, dd.y, dd.z); }
      }
      return K.seamNormals(g);
    });
  }
  // Lathe + dalgalı yüzey (krema kıvrımı, çilek): fn(x, y, z, a) → yarıçap çarpanı
  function wavyLathe(key, pts, seg, fn) {
    const sg = K.sN(seg, 24);
    return K.gx('hz_wl_' + key + '@' + sg, () => {
      const v = new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(pts.length * 5);
      v.forEach(q => { q.x = Math.max(0, q.x); });
      const g = new THREE.LatheGeometry(v, sg), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), k = fn(x, y, z, a);
        p.setXYZ(i, x * k, y, z * k);
      }
      g.computeVertexNormals();
      return K.seamNormals(g);
    });
  }
  // kumaş dokusu (çorap örgüsü, çuval bezi): TEX.rep → {map, normalMap}
  const fabTex = k => (typeof TEX !== 'undefined' && TEX && TEX.fabric ? (TEX.rep ? TEX.rep('fabric', k, k) || TEX.fabric : TEX.fabric) : undefined);
  const yuz = (o) => Object.assign({ tilt: 0.3, browT: 0.32, browRaise: 0.26 }, o);
  // küçük yuvarlak ayakkabı / ayak
  function shoe(r, x, y, z, sx, sy, sz, c, glossy = 0.6) {
    r.fx(0, glossy).add(G.sphere(16, 10), c, [x, y, z], null, [sx, sy, sz]);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.05), [x - sx * 0.25, y + sy * 0.6, z + sz * 0.45], null, [sx * 0.22, sy * 0.15, sz * 0.18]);
    r.fx(0, 0);
  }
  // beyaz çizgi film eldiveni
  function mitt(r, p, s, c = '#fffaf4') {
    r.fx(0, 0.3).add(G.sphere(14, 10), c, p, null, [s, s * 0.92, s * 0.9]);
    r.add(G.sphere(10, 8), c, [p[0] + s * 0.55 * Math.sign(p[0] || 1), p[1] + s * 0.35, p[2] + s * 0.3], null, s * 0.42);
    r.fx(0, 0);
  }
  // parıltı yıldızcıkları (nadir huysuzlar): ışıklı küçük sekizyüzlüler
  function glints(r, pts, c = '#fff6c8') {
    r.fx(1, 0);
    for (const p of pts) {
      r.add(G.octa(), hdr(c, 2.2), p, [0, 0, 0], [p[3], p[3] * 1.9, p[3] * 0.5]);
      r.add(G.octa(), hdr(c, 2.2), p, [0, 0, PI / 2], [p[3], p[3] * 1.9, p[3] * 0.5]);
    }
    r.fx(0, 0);
  }
  // neşeli yüz kalpleri (yüzü arkadaki büyük küreye oturan düz yüzlüler için: kumanda, kaşık, buz)
  function hearts(r, pts) {
    r.mood = 2; r.on('joy').fx(0.5, 0.6);
    for (const p of pts) r.add(K.heartGeo(), '#ff4f93', [p[0], p[1], p[2]], [-0.2, 0, -Math.sign(p[0]) * 0.35], p[3]);
    r.fx(0, 0); r.mood = 0;
  }
  const RAINBOW = ['#ff5f6d', '#ff9f43', '#ffd84a', '#5fd38a', '#4fb3ff', '#9b7bff'];
  const rainbowAt = (t) => { const n = RAINBOW.length, u = ((t % 1) + 1) % 1 * n, i = Math.floor(u); return mixc(RAINBOW[i % n], RAINBOW[(i + 1) % n], sm(u - i)); };

  // ── ortak hareket yardımcıları ──
  // Vurulunca "boing": sönümlü yay (st.hurt yeni yükselince başlar)
  function boing(s, st, dt, b, k = 1) {
    if (st.hurt > (s.hzH || 0) + 0.25) s.hzB = 0;
    s.hzH = st.hurt;
    if (s.hzB === undefined || s.hzB > 1.2) return;
    s.hzB += dt;
    const w = Math.sin(s.hzB * 30) * Math.exp(-s.hzB * 5.5) * 0.22 * k;
    b.scale.y *= 1 + w; b.scale.x *= 1 - w * 0.6; b.scale.z *= 1 - w * 0.6;
  }
  // Komik bekleme hareketi: dururken (yürümüyor, saldırmıyor) arada bir D saniyelik bir gösteri; dönen 0..1 = ilerleme, -1 = yok
  function gag(s, st, dt, D, every = 5) {
    const idle = s.mv < 0.15 && st.windup < 0 && st.attack < 0 && !(st.dying >= 0) && !(st.hurt > 0.3);
    if (s.gagT === undefined) s.gagT = frand(1.5, every);
    if (!idle) { if (s.gagU >= 0) s.gagU = -1; s.gagT = Math.max(s.gagT, 1.2); return -1; }
    if (s.gagU >= 0) { s.gagU += dt / D; if (s.gagU >= 1) { s.gagU = -1; s.gagT = frand(every * 0.7, every * 1.5); return -1; } return s.gagU; }
    s.gagT -= dt;
    if (s.gagT <= 0) { s.gagU = 0; return 0; }
    return -1;
  }
  const bumpU = (u, a, b) => (u > a && u < b ? Math.sin(PI * (u - a) / (b - a)) : 0);
  // zıplayarak ilerleme (toz tavşanı, jöle ayıcık, kaşık): {y, sy, sxz, u}
  const HOP = { y: 0, sy: 1, sxz: 1, u: 0, air: 0 };
  function hopGait(s, st, dt, rate, h) {
    s.hopK = damp(s.hopK || 0, st.move > 0.05 ? 1 : 0, 6, dt);
    if (s.hopK > 0.02 || (s.hop % 1) > 0.03) s.hop += dt * (rate + 0.8 * s.mv);
    const u = s.hop % 1, A = s.hopK;
    let y = 0, sy = 1, sxz = 1, air = 0;
    if (u < 0.2) { const k = Math.sin(PI * u / 0.2); sy -= 0.18 * k * A; sxz += 0.1 * k * A; }
    else if (u < 0.82) { const k = (u - 0.2) / 0.62; air = Math.sin(PI * k) * A; y = air * h; const st2 = Math.abs(Math.cos(PI * k)); sy += 0.14 * st2 * A; sxz -= 0.06 * st2 * A; }
    else { const k = Math.sin(PI * (u - 0.82) / 0.18); sy -= 0.2 * k * A; sxz += 0.12 * k * A; }
    HOP.y = y; HOP.sy = sy; HOP.sxz = sxz; HOP.u = u; HOP.air = air;
    return HOP;
  }
  // yürüyüş evresi
  function walkPh(s, dt, rate) { if (s.mv > 0.03) s.walk += dt * (rate + 5 * s.mv); return Math.min(1, s.mv * 1.4); }
  // nefes
  const breath = (s, f = 2.4) => Math.sin(s.t * f + s.ph);

  // ════════════════ OTURMA ODASI ════════════════
  // ── Toz Tavşanı: pofuduk gri toz yumağı, uzun kulaklar, pamuk kuyruk; zıplayarak gelir, çömelip üstüne zıplar ──
  function buildToz(r, o) {
    const E = o.elite;
    const base = E ? col('#b3a8d0') : col('#a8abb9'), light = E ? col('#e6defa') : col('#d9dbe4'), deep = E ? col('#7a6ea0') : col('#70738a');
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('earL', 'body', [0.12, 0.66, -0.06]); r.bone('earR', 'body', [-0.12, 0.66, -0.06]);
    r.bone('tail', 'body', [0, 0.28, -0.34]);
    r.bone('feet', 'root', [0, 0.04, 0.12]);
    const C = [0, 0.4, 0], R = 0.35;
    const g = K.vgrad(0.05, 0.76, [[0, deep], [0.45, base], [1, light]]);
    r.on('body').fx(0, 0).add(G.sphere(28, 20), g, C, null, [R, R * 0.96, R * 0.94]);
    // pofuduk tüy topakları (yüz bölgesi açık kalır); tüyler hafifçe titrer
    r.fx(0, 0, 0, 1);
    const N = 74, ga = PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const yy = 1 - (i + 0.5) / N * 2, rr = Math.sqrt(1 - yy * yy), a = i * ga;
      const dx = Math.sin(a) * rr, dz = Math.cos(a) * rr;
      if (dz > 0.42 && Math.abs(dx) < 0.72 && yy > -0.62 && yy < 0.55) continue;   // yüz
      if (yy < -0.8) continue;
      const rad = 0.07 + 0.05 * hash(i, 3, 7), out = R * (0.9 + 0.06 * hash(i, 9, 1));
      const c2 = mixc(g(0, C[1] + yy * R, 0), hash(i, 5, 5) > 0.7 ? '#f4f4fa' : '#7d8194', 0.35 * hash(i, 1, 4));
      r.add(G.sphere(10, 8), c2, [C[0] + dx * out, C[1] + yy * out * 0.96, C[2] + dz * out * 0.94], null, [rad, rad * 0.9, rad]);
    }
    // yüzün çevresine kabarık yanak tüyleri
    for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) {
      const a = sd * (0.62 + k * 0.1), yy = -0.28 + k * 0.08;
      r.add(G.sphere(10, 8), mixc(base, light, 0.35), [Math.sin(a) * R * 0.95, C[1] + yy * R, Math.cos(a) * R * 0.92], null, 0.06 + 0.01 * k);
    }
    r.fx(0, 0);
    // pamuk kuyruk
    r.on('tail').fx(0, 0, 0, 1).add(G.sphere(14, 10), light, [0, 0.29, -0.36], null, 0.1);
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; r.add(G.sphere(8, 6), light, [Math.sin(a) * 0.07, 0.29 + Math.cos(a) * 0.07, -0.38], null, 0.05); }
    r.fx(0, 0);
    // uzun kulaklar (iç pembe, uç tüylü)
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'earL' : 'earR');
      const rot = [-0.12, 0, -sd * 0.22];
      r.add(G.sphere(18, 12), K.vgrad(0.62, 1.12, [[0, base], [1, light]]), [0.15 * sd, 0.88, -0.06], rot, [0.08, 0.26, 0.055]);
      r.fx(0, 0.2).add(G.sphere(14, 10), '#f6b3c8', [0.152 * sd, 0.87, -0.012], rot, [0.048, 0.19, 0.02]).fx(0, 0);
      r.fx(0, 0, 0, 1).add(G.sphere(10, 8), light, [0.205 * sd, 1.11, -0.08], null, 0.055).fx(0, 0);
    }
    // ayaklar (pembe patili)
    r.on('feet');
    for (const sd of [-1, 1]) {
      r.add(G.sphere(16, 10), light, [0.15 * sd, 0.05, 0.16], null, [0.09, 0.055, 0.13]);
      r.fx(0, 0.2).add(G.sphere(10, 8), '#f4a9c0', [0.15 * sd, 0.045, 0.285], null, [0.035, 0.03, 0.012]).fx(0, 0);
    }
    // yüz + pembe burun + bıyık
    r.on('body');
    K.face(r, C, R, yuz({ bone: 'body', tilt: 0.22, ex: 0.12, ey: 0.03, er: 0.105, iris: '#3b2b55', skin: mixc(base, light, 0.4), browCol: '#5b5870', browY: 1.38,
      mouthY: -0.125, mouthW: 0.1, heartY: 0.9, heartX: 1.1 }));
    r.on('body').push(C, [-0.22, 0, 0]);
    { const [p, q] = onSphere(0, -0.06, R, -0.01); r.push(p, q).fx(0, 0.7).add(G.sphere(12, 8), '#ff8fb3', [0, 0, 0], null, [0.032, 0.022, 0.02]).fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.3), [-0.01, 0.009, 0.016], null, 0.007).pop(); }
    r.fx(0, 0.2);
    for (const sd of [-1, 1]) for (const k of [-1, 1]) {
      const [p] = onSphere(sd * 0.1, -0.075 + k * 0.012, R, -0.005);
      r.seg(p, [p[0] + sd * 0.11, p[1] + k * 0.02 + 0.01, p[2] - 0.03], 0.0045, '#6e6a80', 0.003, 5);
    }
    r.pop().fx(0, 0);
    if (E) K.crown(r.on('body'), [0, 0.74, 0.0], 0.62);
    r.on('body').mark('muzzle', [0, 0.4, 0.38]);
    return { height: 0.8, glowC: col('#ff7ab0'), mat: { rough: 0.88, sss: col('#ffffff').multiplyScalar(0.03), rim: '#ffffff', rimK: 0.42, rimP: 1.9, wob: 0.01, wobF: 7, wobS: 5 } };
  }
  function animToz(m, dt, st, s) {
    const B = m.B, b = B.body;
    const g = hopGait(s, st, dt, 2.3, 0.22);
    let y = g.y, sy = g.sy * (1 + 0.025 * breath(s, 3)), sxz = g.sxz, rx = 0.12 * g.air, ear = -0.25 * g.air + 0.1 * (1 - s.hopK);
    // ara sıra burun kıpırtısı + kulak seğirmesi
    const tw = Math.max(0, Math.sin(s.t * 0.8 + s.ph * 3) - 0.9) * 10;
    B.earL.rotation.z = -0.06 + Math.sin(s.t * 2 + s.ph) * 0.06 + tw * 0.04 * Math.sin(s.t * 40);
    B.earR.rotation.z = 0.06 - Math.sin(s.t * 2.2 + s.ph) * 0.06;
    if (st.windup >= 0) {   // çömel, kulaklar geriye yatar, kıpır kıpır
      const w = sm(st.windup * 1.4);
      sy *= 1 - 0.3 * w; sxz *= 1 + 0.16 * w; rx -= 0.15 * w; ear -= 0.9 * w;
      b.position.x = Math.sin(s.t * 60) * 0.012 * st.windup;
      B.tail.rotation.y = Math.sin(s.t * 40) * 0.4 * w;
    }
    if (st.attack >= 0) {
      const a = st.attack;
      if (a < 1) { const k = Math.sin(PI * a); sy *= 1 + 0.25 * k; sxz *= 1 - 0.1 * k; rx += 0.3 * k; ear -= 0.6 * k; }
      else { sy *= 0.85; sxz *= 1.1; ear += 0.3; }   // inişten sonra yayvan
    }
    { const u = gag(s, st, dt, 2.2, 4.5);   // bekleme: burun kıpır kıpır → derin nefes → hapşırık (kulaklar fırlar)
      if (u >= 0) {
        const tw = bumpU(u, 0, 0.45), inh = sm((u - 0.4) / 0.3) * (1 - sm((u - 0.72) / 0.05)), sn = bumpU(u, 0.72, 0.9);
        b.position.x += Math.sin(s.t * 70) * 0.006 * tw; rx -= 0.28 * inh; sy *= 1 + 0.12 * inh; ear += 0.5 * inh;
        rx += 0.45 * sn; sy *= 1 - 0.22 * sn; sxz *= 1 + 0.12 * sn; ear -= 1.2 * sn; y += 0.06 * sn;
        s.eyeK = 1 - 0.85 * Math.max(inh, sn);
      }
    }
    B.earL.rotation.x = ear; B.earR.rotation.x = ear;
    b.position.y = y; b.scale.set(sxz, sy, sxz); b.rotation.x = rx;
    B.feet.position.y += g.air * 0.12; B.feet.rotation.x = -0.4 * g.air;
    boing(s, st, dt, b);
  }

  // ── Haylaz Kumanda: yuvarlak köşeli TV kumandası; açık renkli ön panelde kocaman renkli tuşlar (bazıları yanıp söner), tepede
  // anten ucunda kızılötesi göz. Bekleme: kendi tuşuna basıp şaşırır. Saldırı: tuşlar sırayla parlar, antenden zararsız ışık topu. ──
  const KM_BTN = [['#ff4f6a', '#ffd23f', '#3fd27a'], ['#4fa8ff', '#ff9a2e', '#b07aff'], ['#ff7ac0', '#3fd8d8', '#ffffff']];
  const KM_BLINK = [[0, 0], [1, 1], [2, 2], [0, 2]];   // yanıp sönen tuşlar (satır, sütun)
  const kmBtnPos = (row, c2) => [(c2 - 1) * 0.092, 0.42 - row * 0.078, 0.112];
  function buildKumanda(r, o) {
    const shell = col('#4a4c8a'), shellL = col('#7a7cc8'), shellD = col('#2c2d58');
    r.bone('hips', 'root', [0, 0.16, 0]);
    r.bone('body', 'hips', [0, 0.2, 0]);
    r.bone('armL', 'body', [0.2, 0.55, 0]); r.bone('armR', 'body', [-0.2, 0.55, 0]);
    r.bone('legL', 'hips', [0.08, 0.17, 0]); r.bone('legR', 'hips', [-0.08, 0.17, 0]);
    r.bone('ant', 'body', [0.08, 0.94, -0.02]);
    for (let i = 0; i < 4; i++) { const p = kmBtnPos(...KM_BLINK[i]); r.bone('blink' + i, 'body', p); }
    // bacaklar + kırmızı spor ayakkabılar
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'legL' : 'legR');
      r.seg([0.08 * sd, 0.2, 0], [0.085 * sd, 0.07, 0.01], 0.03, '#2b2f3a', 0.028, 8);
      shoe(r, 0.09 * sd, 0.05, 0.05, 0.07, 0.05, 0.105, '#ff5a5f');
      r.fx(0, 0.3).add(G.sphere(10, 6), '#ffffff', [0.09 * sd, 0.025, 0.05], null, [0.074, 0.016, 0.11]).fx(0, 0);
    }
    // gövde: iyice yuvarlatılmış kutu (mor-lacivert), açık lila ön panel, koyu ekran
    r.on('body').fx(0, 0.5);
    r.add(sbox(0.42, 0.82, 0.2, 0.11, 4), K.vgrad(0.14, 0.95, [[0, shellD], [0.45, shell], [1, shellL]]), [0, 0.55, 0]);
    r.fx(0, 0.3).add(sbox(0.33, 0.36, 0.03, 0.06, 3), K.vgrad(0.18, 0.56, [[0, '#cfcbe8'], [1, '#f4f2ff']]), [0, 0.37, 0.092]);
    r.fx(0, 0.9).add(sbox(0.33, 0.22, 0.03, 0.06, 3), K.vgrad(0.62, 0.84, [[0, '#14182c'], [1, '#2a3354']]), [0, 0.73, 0.092]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#9fe8ff', 0.9), [-0.1, 0.8, 0.108], [0, 0, 0.5], [0.05, 0.008, 0.003]);   // ekran parıltısı
    // arkada pil kapağı: ince çizgili dikdörtgen + tırnak oyukları
    r.fx(0, 0.2);
    for (const [x, y, w, h] of [[0, 0.62, 0.26, 0.012], [0, 0.22, 0.26, 0.012], [0.13, 0.42, 0.012, 0.41], [-0.13, 0.42, 0.012, 0.41]]) r.add(G.box(), '#24264a', [x, y, -0.1], null, [w, h, 0.01]);
    for (let k = 0; k < 3; k++) r.add(G.box(), '#24264a', [0, 0.57 - k * 0.025, -0.1], null, [0.08, 0.008, 0.01]);
    r.fx(0, 0);
    // anten + kızılötesi göz (yuvarlak kırmızı cam)
    r.on('ant').fx(0, 0.6).seg([0.08, 0.93, -0.02], [0.12, 1.08, -0.02], 0.012, '#b8bce0', 0.009, 6);
    r.fx(0.85, 1).add(G.sphere(14, 10), hdr('#ff3a5a', 1.5), [0.12, 1.1, -0.02], null, 0.035);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.6), [0.11, 1.115, 0.008], null, 0.01);
    r.on('body').fx(0.85, 1).add(G.sphere(14, 10), hdr('#ff3a5a', 1.3), [-0.08, 0.955, 0.04], null, [0.05, 0.028, 0.04]);   // tepedeki ışık camı
    r.fx(0, 0);
    // yüz: koyu ekranın üstünde büyük gözler (yüz hafif yukarı bakar; yukarıdaki kameradan da görünür)
    K.face(r, [0, 0.73, -0.6], 0.704, yuz({ bone: 'body', tilt: 0.0, ex: 0.075, ey: 0.01, er: 0.064, iris: '#3fa8ff', skin: col('#20263e'), browCol: '#d8e0ff', browY: 1.32,
      mouthY: -0.075, mouthW: 0.072, noHearts: true, blushCol: '#ff7fa8', inset: 0.006, mouthCol: '#ffffff', tongue: '#ff6f9a' }));
    hearts(r, [[0.27, 1.0, 0.1, 0.075], [-0.25, 1.06, 0.1, 0.06]]);
    // tuşlar: artı yön tuşu + 3x3 kocaman renkli tuş + güç tuşu
    r.on('body').fx(0, 0.8);
    r.add(G.rbox(2), '#ff9a2e', [0, 0.515, 0.113], null, [0.11, 0.032, 0.02]);
    r.add(G.rbox(2), '#ff9a2e', [0, 0.515, 0.113], null, [0.032, 0.11, 0.02]);
    r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.2), [-0.03, 0.524, 0.124], null, [0.012, 0.005, 0.003]);
    for (let row = 0; row < 3; row++) for (let c2 = 0; c2 < 3; c2++) {
      const [x, y, z] = kmBtnPos(row, c2);
      r.fx(0.15, 0.8).add(G.cyl(1, 1, 16), KM_BTN[row][c2], [x, y, z], [PI / 2, 0, 0], [0.034, 0.02, 0.034]);
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.25), [x - 0.011, y + 0.012, z + 0.011], null, [0.009, 0.006, 0.003]);
    }
    r.fx(0.45, 0.9).add(G.cyl(1, 1, 18), '#ff3a4a', [0.15, 0.655, 0.08], [PI / 2, 0, 0], [0.026, 0.02, 0.026]);   // güç tuşu (yanda)
    r.fx(0, 0);
    // yanıp sönen tuş ışıkları (ayrı kemikte, anim açar/kapar)
    for (let i = 0; i < 4; i++) {
      const [row, c2] = KM_BLINK[i], p = kmBtnPos(row, c2);
      r.on('blink' + i).fx(1, 0).add(G.cyl(1, 1, 16), hdr(KM_BTN[row][c2] === '#ffffff' ? '#ffffc0' : KM_BTN[row][c2], 1.9), [p[0], p[1], p[2] + 0.004], [PI / 2, 0, 0], [0.037, 0.022, 0.037]);
    }
    r.fx(0, 0);
    // kollar + beyaz eldivenler
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR');
      r.seg([0.2 * sd, 0.55, 0], [0.29 * sd, 0.37, 0.05], 0.026, '#2b2f3a', 0.024, 8);
      mitt(r, [0.3 * sd, 0.34, 0.06], 0.055);
    }
    r.on('ant').mark('muzzle', [0.12, 1.1, 0.02]);
    return { height: 1.1, glowC: col('#ff4058'), glowK: 0.6, hide: ['blink0', 'blink1', 'blink2', 'blink3'],
      mat: { rough: 0.32, rim: '#c8d0ff', rimK: 0.4, rimP: 2.2 } };
  }
  const _kq = HAS ? new THREE.Quaternion() : null;
  const KM_PRESS = HAS ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-0.09, -0.18, 0.05).normalize(), new THREE.Vector3(0.21, -0.1, 0.16).normalize()) : null;
  const KM_ID = HAS ? new THREE.Quaternion() : null;
  function animKumanda(m, dt, st, s) {
    const B = m.B, k = walkPh(s, dt, 7), ph = s.walk;
    B.legL.rotation.x = Math.sin(ph) * 0.7 * k; B.legR.rotation.x = -Math.sin(ph) * 0.7 * k;
    B.hips.position.y += Math.abs(Math.cos(ph)) * 0.035 * k;
    B.body.rotation.z = Math.sin(ph) * 0.12 * k + Math.sin(s.t * 1.6 + s.ph) * 0.03;   // paytak paytak
    B.body.rotation.x = -0.12 + 0.08 * k;   // hafif geriye yaslı: yüzü yukarıdan da görünür
    B.armL.rotation.x = -Math.sin(ph) * 0.6 * k; B.armR.rotation.x = Math.sin(ph) * 0.6 * k;
    B.armL.rotation.z = 0.15 + 0.08 * breath(s); B.armR.rotation.z = -0.15 - 0.08 * breath(s);
    B.ant.rotation.z = Math.sin(s.t * 3.1 + s.ph) * 0.12 + Math.sin(ph * 2) * 0.15 * k;
    // tuş ışıkları: kendi kendine ağır ağır yanıp söner
    const on = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) on[i] = Math.sin(s.t * (1.3 + i * 0.4) + s.ph + i * 1.7) > 0.55 ? 1 : 0;
    // bekleme: sağ eliyle kendi tuşuna basar → bütün tuşlar yanar, şaşırıp zıplar
    const u = gag(s, st, dt, 2.2, 5);
    if (u >= 0) {
      const reach = sm(u / 0.25) * (1 - sm((u - 0.55) / 0.2));
      _kq.copy(KM_ID).slerp(KM_PRESS, reach); B.armR.quaternion.multiply(_kq);
      B.body.rotation.y = -0.2 * reach;
      if (u > 0.3 && u < 0.6) on.fill(1);
      const hop = bumpU(u, 0.4, 0.62);
      B.hips.position.y += hop * 0.12; B.armL.rotation.z += hop * 1.2; B.legL.rotation.x -= hop * 0.4; B.legR.rotation.x += hop * 0.4;
      s.eyeK = 1 + 0.35 * hop;
    }
    if (st.windup >= 0) {   // hazırlık: geriye yaslanıp anteni Feza'ya doğrultur, iki eliyle tuşlara basar; tuşlar sırayla yanar
      const w = sm(st.windup * 1.5);
      B.body.rotation.x = -0.12 - 0.45 * w; B.hips.position.z -= 0.05 * w;
      _kq.copy(KM_ID).slerp(KM_PRESS, w); B.armR.quaternion.multiply(_kq);
      B.armL.rotation.x = -0.9 * w; B.armL.rotation.z = 0.15 + 0.5 * w * Math.abs(Math.sin(s.t * 18));
      const seq = Math.floor(st.windup * 10) % 4;
      on.fill(0); on[seq] = 1; if (st.windup > 0.85) on.fill(1);
      B.ant.rotation.z = Math.sin(s.t * 40) * 0.15 * w; B.ant.rotation.x = -0.5 * w;
      B.body.position.x += Math.sin(s.t * 55) * 0.006 * st.windup;
    }
    if (st.attack >= 0 && st.attack < 1) {   // geri tepme, bütün tuşlar parlar
      const a = st.attack, kk = Math.sin(PI * Math.min(1, a * 2));
      B.body.rotation.x = -0.12 - 0.45 * (1 - sm(a * 1.5)) - 0.15 * kk; B.hips.position.z -= 0.06 * kk;
      if (a < 0.5) on.fill(1);
    }
    for (let i = 0; i < 4; i++) B['blink' + i].scale.setScalar(on[i] ? 1 : 0.0001);
    boing(s, st, dt, B.body);
  }
  // ── Tek Çorap: eşini kaybetmiş çizgili çorap; yay gibi kıvrılarak gelir, geriye esneyip "şap" diye vurur ──
  function sockCols(o) {
    if (o.rare) return { band: y => rainbowAt(y * 2.6), toe: col('#ffffff'), cuff: col('#ffffff') };
    const A = col('#ff6b78'), B2 = col('#fff4e8'), C2 = col('#3cc4c0');
    return { band: y => (Math.floor(y / 0.075) % 2 ? B2 : (Math.floor(y / 0.15) % 2 ? A : C2)), toe: col('#3cc4c0'), cuff: col('#ff6b78') };
  }
  const SOCK_P = [[0.19, 0.12], [0.2, 0.2], [0.205, 0.35], [0.205, 0.5], [0.2, 0.65], [0.195, 0.78]];
  function buildCorap(r, o) {
    const S = sockCols(o), soft = col('#ffffff'), out = new THREE.Color();
    const band = (x, y, z) => out.copy(S.band(y)).lerp(soft, 0.05 + 0.08 * (0.5 + 0.5 * Math.sin(x * 120 + z * 90)));   // örgü dokusu
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('top', 'body', [0, 0.4, 0]);
    // ayak kısmı: topuk + öne uzanan burun
    r.on('body').fx(0, 0.15, 0, 0);
    r.add(G.capsule(1, 14), (x, y, z) => (x > 0.22 ? S.toe : band(z, x * 0.8 + 0.1, y)), [0.13, 0.135, 0], [0, 0, -PI / 2], [0.135, 0.15, 0.135]);
    r.add(G.sphere(18, 12), S.toe, [-0.07, 0.14, 0], null, [0.15, 0.14, 0.17]);   // topuk
    r.add(K.lathe('hzSockLo', SOCK_P.slice(0, 4), 28, 3), band, [0, 0, 0]);
    // üst boru + manşet
    r.on('top');
    r.add(K.lathe('hzSockHi', SOCK_P.slice(2), 28, 3), band, [0, 0, 0]);
    r.fx(0, 0.1).add(G.torus(TAU, 0.32, 28), S.cuff, [0, 0.8, 0], [PI / 2, 0, 0], [0.19, 0.19, 0.17]);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; r.add(G.sphere(6, 4), mixc(S.cuff, '#ffffff', 0.15), [Math.sin(a) * 0.205, 0.8, Math.cos(a) * 0.205], [0, a, 0], [0.012, 0.05, 0.02]); }
    r.fx(0, 0).add(G.cyl(1, 1, 24), '#3a2238', [0, 0.815, 0], null, [0.15, 0.01, 0.15]);   // ağız (içi)
    // yüz
    K.face(r, [0, 0.52, 0], 0.205, yuz({ bone: 'top', tilt: 0.12, ex: 0.075, ey: 0.03, er: 0.066, iris: '#4a2a1a', skin: S.band(0.5), browCol: '#5a2a3a', browY: 1.36,
      mouthY: -0.085, mouthW: 0.07, heartY: 1.4, heartX: 1.4, heartS: 0.3 }));
    if (o.rare) glints(r.on('top'), [[0.22, 0.86, 0.05, 0.03], [-0.2, 0.62, 0.12, 0.025], [0.1, 0.3, 0.2, 0.02]]);
    r.on('top').mark('muzzle', [0, 0.5, 0.25]);
    return { height: 0.85, glowC: col('#ff7a8a'), tex: fabTex(2),
      mat: { rough: 0.85, rim: '#ffffff', rimK: o.rare ? 0.5 : 0.32, rimP: 2.2 } };
  }
  function animCorap(m, dt, st, s) {
    const B = m.B;
    if (s.mv > 0.03) s.walk += dt * (5 + 4 * s.mv);
    const k = Math.min(1, s.mv * 1.4), ph = s.walk;
    // yay gibi: üst kısım öne-arkaya kıvrılır, gövde ezilip uzar
    let bend = Math.sin(ph) * 0.35 * k + Math.sin(s.t * 1.7 + s.ph) * 0.06, sy = 1 + Math.cos(ph) * 0.08 * k + 0.02 * breath(s);
    B.top.rotation.z = Math.sin(s.t * 1.3 + s.ph) * 0.08;
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); bend = lerp(bend, -0.75, w); sy *= 1 + 0.1 * w; B.top.rotation.z += Math.sin(s.t * 45) * 0.05 * w; }
    if (st.attack >= 0 && st.attack < 1) { const a = st.attack, hit = sm(a / 0.3), back = sm((a - 0.45) / 0.55); bend = lerp(-0.75, 1.0, hit) * (1 - back); }
    { const u = gag(s, st, dt, 2.6, 5);
      if (u >= 0) { const str = bumpU(u, 0.02, 0.72), flop = bumpU(u, 0.7, 1); bend += -0.5 * str + 0.55 * flop; B.top.scale.y = 1 + 0.28 * str; B.top.scale.x = B.top.scale.z = 1 - 0.08 * str; s.eyeK = 1 - 0.85 * str; B.top.rotation.z += Math.sin(u * 20) * 0.08 * str; }
    }
    B.top.rotation.x = bend;
    B.body.scale.set(1 - (sy - 1) * 0.5, sy, 1 - (sy - 1) * 0.5);
    B.body.position.z = Math.sin(ph) * 0.03 * k;
    boing(s, st, dt, B.top);
  }

  // ════════════════ MUTFAK ════════════════
  // ── Haylaz Kaşık: tahta kaşık; tek ayağında yay gibi sıçrar, geriye eğilip kepçe başıyla "tonk" diye vurur ──
  function buildKasik(r, o) {
    const E = o.elite, gold = o.rare;
    const wA = col(gold ? '#ffd24a' : E ? '#c98a56' : '#e8be8a'), wB = col(gold ? '#d99a1e' : E ? '#9a5e34' : '#b9824e'), out = new THREE.Color();
    const wood = (x, y, z) => out.copy(wA).lerp(wB, 0.5 + 0.5 * Math.sin(x * 26 + y * 9 + 3 * K.fbm3(x * 6, y * 3, z * 6)));   // tahta damarı
    r.bone('leg', 'root', [0, 0.08, 0]);
    r.bone('body', 'leg', [0, 0.45, 0]);
    r.bone('armL', 'body', [0.06, 0.62, 0]); r.bone('armR', 'body', [-0.06, 0.62, 0]);
    r.bone('head', 'body', [0, 0.68, 0]);   // kepçe hep hafif yukarı bakar (anim): yukarıdaki kameradan yüz görünür
    const gl = gold ? 2 : 0.25;
    // sap (ayak) + küçük kırmızı çizme
    r.on('leg').fx(0, gl);
    r.seg([0, 0.1, 0], [0, 0.45, 0], 0.048, wood, 0.05, 14);
    r.fx(0, 0); shoe(r, 0, 0.055, 0.04, 0.085, 0.06, 0.12, gold ? '#ff5a8a' : '#e84a5a');
    r.fx(0, 0.3).add(G.torus(TAU, 0.3, 18), '#ffffff', [0, 0.1, 0], [PI / 2, 0, 0], [0.06, 0.06, 0.05]).fx(0, 0);
    // sapın üstü + kepçe (baş)
    r.on('body').fx(0, gl);
    r.seg([0, 0.44, 0], [0, 0.66, 0], 0.05, wood, 0.055, 14);
    r.add(G.sphere(16, 10), wood, [0, 0.66, 0], null, [0.06, 0.05, 0.05]);
    r.on('head').fx(0, gl).add(G.sphere(16, 10), wood, [0, 0.68, 0], null, [0.055, 0.05, 0.05]);
    r.add(G.sphere(32, 24), wood, [0, 0.9, -0.03], null, [0.23, 0.29, 0.1]);
    // ön yüz: sığ kepçe çukuru (açık renk iç yüzey + çevresinde kalın yuvarlak kenar)
    r.fx(0, gl * 0.8).add(G.sphere(32, 20), (x, y, z) => out.copy(wood(x, y, z)).lerp(col(gold ? '#fff0a0' : '#f6d6a8'), 0.45), [0, 0.9, 0.035], null, [0.2, 0.26, 0.035]);
    r.fx(0, gl).add(G.torus(TAU, 0.16, 40), wood, [0, 0.9, 0.04], null, [0.205, 0.265, 0.12]);
    r.fx(0, 0);
    // sapın üstünde yakılmış minik kalp
    r.on('body').fx(0, 0.2).add(K.heartGeo(), gold ? '#c06a10' : '#7a4220', [0, 0.53, 0.05], null, [0.045, 0.045, 0.02]).fx(0, 0);
    r.on('head');
    K.face(r, [0, 0.9, -0.62], 0.69, yuz({ bone: 'head', tilt: 0.0, ex: 0.08, ey: 0.03, er: 0.066, inset: 0.01, iris: '#3a2412', skin: wA, browCol: '#5a3214', browY: 1.35,
      mouthY: -0.1, mouthW: 0.08, noHearts: true }));
    hearts(r, [[0.29, 1.1, 0.12, 0.08], [-0.27, 1.16, 0.12, 0.065]]);
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, gl);
      r.seg([0.05 * sd, 0.62, 0], [0.16 * sd, 0.52, 0.04], 0.02, wood, 0.018, 8);
      r.fx(0, 0); mitt(r, [0.18 * sd, 0.5, 0.05], 0.045);
    }
    if (E) K.crown(r.on('head'), [0, 1.16, -0.02], 0.55);
    if (gold) { glints(r.on('head'), [[0.2, 1.1, 0.06, 0.035], [-0.24, 0.8, 0.08, 0.028]]); glints(r.on('body'), [[0.12, 0.4, 0.1, 0.022]]); }
    r.on('head').mark('muzzle', [0, 0.9, 0.2]);
    return { height: 1.2, glowC: col('#ff9a4a'), mat: { rough: gold ? 0.25 : 0.62, rim: gold ? '#fff2b0' : '#ffe4c4', rimK: gold ? 0.45 : 0.3, rimP: 2.4 } };
  }
  function animKasik(m, dt, st, s) {
    const B = m.B;
    // tek ayakta sürekli küçük sıçramalar; yürürken daha yüksek
    s.pogo = (s.pogo || 0) + dt * (2.6 + 2.2 * s.mv);
    const u = s.pogo % 1, air = u < 0.7 ? Math.sin(PI * u / 0.7) : 0, land = u >= 0.7 ? Math.sin(PI * (u - 0.7) / 0.3) : 0;
    const h = 0.05 + 0.13 * s.mv;
    let y = air * h, sy = 1 + 0.08 * air - 0.16 * land, lean = 0.12 * s.mv + Math.sin(s.t * 1.9 + s.ph) * 0.05;
    B.armL.rotation.z = 0.3 + 0.5 * air; B.armR.rotation.z = -0.3 - 0.5 * air;   // dengede durmak için kollar açılır
    B.body.rotation.z = Math.sin(s.t * 2.3 + s.ph) * 0.07;
    if (st.windup >= 0) {   // geriye eğil, kepçeyi kaldır
      const w = sm(st.windup * 1.4);
      y *= 1 - w; sy = lerp(sy, 0.86, w); lean = lerp(lean, -0.6, w);
      B.armL.rotation.z = 0.3 + 0.9 * w; B.armR.rotation.z = -0.3 - 0.9 * w;
      B.leg.position.x = Math.sin(s.t * 50) * 0.01 * st.windup;
    }
    if (st.attack >= 0 && st.attack < 1) {   // öne "tonk"
      const a = st.attack, hit = sm(a / 0.28), back = sm((a - 0.45) / 0.55);
      lean = lerp(-0.6, 0.9, hit) * (1 - back); y = 0.06 * Math.sin(PI * Math.min(1, a * 1.5));
    }
    // bekleme: tek ayakta dengesi bozulur, sağa sola gittikçe çok sallanır, kollarını çırpıp toparlanır
    const g = gag(s, st, dt, 2.6, 5.5);
    if (g >= 0) {
      const amp = sm(g / 0.6) * (1 - sm((g - 0.75) / 0.2));
      B.leg.rotation.z += Math.sin(g * 26) * 0.32 * amp;
      B.armL.rotation.z += 1.1 * amp + Math.sin(s.t * 30) * 0.5 * amp; B.armR.rotation.z -= 1.1 * amp + Math.sin(s.t * 30 + 1) * 0.5 * amp;
      s.eyeK = 1 + 0.3 * amp; y *= 1 - amp;
      if (g > 0.78) y += bumpU(g, 0.78, 0.98) * 0.08;   // "hop!" toparlandı
    }
    B.leg.position.y += y; B.leg.scale.set(1 - (sy - 1) * 0.4, sy, 1 - (sy - 1) * 0.4);
    B.body.rotation.x = lean;
    B.head.rotation.x = -0.5 * (1 - sm(Math.max(0, lean) / 0.6)) + Math.sin(s.t * 2.1 + s.ph) * 0.04;   // yüz yukarı bakar (vururken öne döner)
    boing(s, st, dt, B.head, 1.2);
  }

  // ── Köpük Balonu: deterjan köpüğü; havada süzülür, şişip köpük atar (sedef renkli baloncuk kümesi) ──
  function pearl(c0) {
    const base = col(c0), out = new THREE.Color(), tA = col('#ff9ad2'), tB = col('#7fd6ff'), tC = col('#ffe680');
    return (x, y, z) => {
      const a = Math.sin(x * 9 + y * 6) * 0.5 + 0.5, b = Math.sin(z * 8 - y * 7 + 1.3) * 0.5 + 0.5;
      return out.copy(base).lerp(tA, 0.4 * a).lerp(tB, 0.42 * b).lerp(tC, 0.2 * (1 - a) * b);
    };
  }
  const KB = [[0.25, 0.46, -0.06, 0.13, 'b0'], [-0.27, 0.5, -0.04, 0.12, 'b1'], [0.16, 0.74, -0.08, 0.1, 'b0'], [-0.12, 0.79, -0.1, 0.09, 'b1'],
    [0.02, 0.22, -0.02, 0.11, 'b2'], [0.3, 0.27, -0.1, 0.075, 'b2'], [-0.3, 0.28, -0.08, 0.08, 'b2'], [0.0, 0.84, -0.16, 0.07, 'b0']];
  function buildKopuk(r, o) {
    r.bone('body', 'root', [0, 0.5, 0]);
    r.bone('b0', 'body', [0.2, 0.6, -0.08]); r.bone('b1', 'body', [-0.2, 0.62, -0.06]); r.bone('b2', 'body', [0, 0.25, -0.05]);
    r.bone('armL', 'body', [0.3, 0.45, 0.08]); r.bone('armR', 'body', [-0.3, 0.45, 0.08]);
    const P = pearl('#cfdcff');
    r.on('body').fx(0, 1, 0, 1).add(G.sphere(30, 22), P, [0, 0.5, 0], null, [0.29, 0.28, 0.27]);
    // parlak yansımalar (pencere ışığı gibi)
    r.fx(1, 0, 0, 1).add(G.sphere(12, 8), hdr('#ffffff', 1.5), [-0.13, 0.66, 0.17], [0.4, -0.5, 0.5], [0.06, 0.03, 0.01]);
    r.add(G.sphere(8, 6), hdr('#ffffff', 1.3), [-0.17, 0.6, 0.18], null, 0.014);
    for (const b of KB) {
      r.on(b[4]).fx(0, 1, 0, 1).add(G.sphere(18, 12), P, [b[0], b[1], b[2]], null, b[3]);
      r.fx(1, 0, 0, 1).add(G.sphere(8, 6), hdr('#ffffff', 1.4), [b[0] - b[3] * 0.35, b[1] + b[3] * 0.4, b[2] + b[3] * 0.75], null, b[3] * 0.16);
    }
    // minik baloncuk elleri
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 1, 0, 1).add(G.sphere(14, 10), P, [0.34 * sd, 0.42, 0.1], null, 0.065);
      r.add(G.sphere(10, 8), P, [0.38 * sd, 0.47, 0.13], null, 0.035);
    }
    r.fx(0, 0);
    K.face(r, [0, 0.5, 0], 0.285, yuz({ bone: 'body', tilt: 0.2, ex: 0.105, ey: 0.035, er: 0.096, iris: '#1a5ab8', skin: col('#e4ebff'), browCol: '#4a5a9a', browY: 1.36,
      mouthY: -0.1, mouthW: 0.085, heartY: 0.95, heartX: 1.15, blushCol: '#ff6fae' }));
    r.on('body').mark('muzzle', [0, 0.42, 0.3]);
    return { height: 0.9, glowC: col('#9ad8ff'), mat: { rough: 0.1, sss: col('#e8f4ff').multiplyScalar(0.03), rim: '#90d070', rimK: -0.45, rimP: 2.8, wob: 0.012, wobF: 4, wobS: 4 } };
  }
  function animKopuk(m, dt, st, s) {
    const B = m.B;
    B.body.position.y += Math.sin(s.t * 1.8 + s.ph) * 0.05;
    B.body.rotation.z = Math.sin(s.t * 1.1 + s.ph) * 0.08;
    B.body.rotation.y = Math.sin(s.t * 0.7) * 0.15;
    for (let i = 0; i < 3; i++) { const b = B['b' + i]; b.position.y += Math.sin(s.t * 2.4 + i * 2.1) * 0.025; b.position.x += Math.cos(s.t * 1.7 + i) * 0.015; b.scale.setScalar(1 + 0.06 * Math.sin(s.t * 3 + i)); }
    B.armL.rotation.z = 0.2 * Math.sin(s.t * 3 + s.ph); B.armR.rotation.z = -0.2 * Math.sin(s.t * 3.3 + s.ph);
    let sc = 1 + 0.03 * breath(s, 2);
    if (st.windup >= 0) { const w = sm(st.windup * 1.3); sc *= 1 + 0.22 * w; B.body.rotation.x = -0.25 * w; B.armL.rotation.z = 0.9 * w; B.armR.rotation.z = -0.9 * w; }
    if (st.attack >= 0 && st.attack < 1) { const kk = Math.sin(PI * st.attack); sc *= 1 - 0.15 * kk; B.body.rotation.x = 0.3 * kk; }
    { const u = gag(s, st, dt, 2.0, 5);
      if (u >= 0) { B.body.rotation.y += TAU * sm(u / 0.7); sc *= 1 + 0.08 * Math.sin(u * 30) * (1 - u); B.b0.scale.multiplyScalar(u < 0.35 ? 1 + u : u < 0.4 ? 0.0001 : sm((u - 0.4) / 0.5)); s.eyeK = 1 - 0.7 * bumpU(u, 0.3, 0.5); }
    }
    B.body.scale.setScalar(sc);
    boing(s, st, dt, B.body);
  }

  // ── Un Torbacığı: bağcıklı küçük un torbası; yuvarlanarak gelir, puf diye un tozu kaldırır ──
  const SACK_P = [[0, 0.0], [0.24, 0.0], [0.3, 0.04], [0.325, 0.14], [0.33, 0.3], [0.31, 0.44], [0.26, 0.54], [0.17, 0.62], [0.1, 0.665], [0.085, 0.69]];
  const RUF_P = [[0.08, 0.68], [0.13, 0.72], [0.19, 0.77], [0.2, 0.8], [0.16, 0.81], [0.1, 0.79], [0, 0.78]];
  function buildUn(r, o) {
    const E = o.elite;
    const cloth = col(E ? '#f6e6c4' : '#efe2c6'), clothD = col('#cdb894'), out = new THREE.Color();
    r.bone('body', 'root', [0, 0.36, 0]);
    r.bone('feet', 'root', [0, 0.03, 0.05]);
    r.on('body').fx(0, 0, 1).uv(3, 2);
    // un serpintili çuval bezi
    r.add(wavyLathe('hzSack', SACK_P, 40, (x, y, z, a) => 1 + 0.025 * Math.sin(a * 5 + y * 8) * sm((y - 0.1) / 0.2)),
      (x, y, z) => out.copy(clothD).lerp(cloth, sm((y - 0.02) / 0.35)).lerp(col('#ffffff'), 0.5 * sm((K.fbm3(x * 9, y * 9, z * 9) - 0.56) / 0.1) * (y < 0.2 || y > 0.55 ? 1 : 0.4)));
    r.add(wavyLathe('hzRuf', RUF_P, 32, (x, y, z, a) => 1 + 0.12 * Math.sin(a * 9) * sm((y - 0.72) / 0.05)), cloth);
    r.uv(null).fx(0, 0.2);
    r.add(G.torus(TAU, 0.28, 24), '#b07a44', [0, 0.69, 0], [PI / 2, 0, 0], [0.095, 0.095, 0.08]);   // ip
    for (const sd of [-1, 1]) r.add(G.torus(TAU, 0.3, 16), '#b07a44', [0.07 * sd, 0.7, 0.07], [0.3, sd * 0.6, 0], [0.04, 0.03, 0.03]);   // fiyonk
    r.fx(0, 0);
    // tepeden taşan un bulutu (kendi kemiğinde: bekleme hareketinde "puf" diye kabarır)
    r.bone('puf', 'body', [0, 0.8, 0]);
    r.fx(0.15, 0, 0, 1);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; r.add(G.sphere(10, 8), '#ffffff', [Math.sin(a) * 0.06, 0.81 + 0.02 * (k & 1), Math.cos(a) * 0.06], null, 0.045); }
    r.add(G.sphere(12, 8), '#ffffff', [0, 0.85, 0], null, 0.055);
    r.fx(0, 0);
    r.on('body');
    // ön etiket: mavi şerit ve buğday başağı
    r.fx(0, 0.3);
    { const [p, n] = K.onLathe(SACK_P, 0.2, 0, 0.004); r.add(G.cyl(1, 1, 30, true), '#4f8fe0', [0, 0.2, 0], null, [0.333, 0.07, 0.333]); r.add(G.sphere(14, 8), '#ffffff', p, K.qz(...n), [0.06, 0.045, 0.01]); }
    { const [p, n] = K.onLathe(SACK_P, 0.2, 0, 0.012); r.push(p, K.qz(...n)); for (let k = 0; k < 4; k++) r.add(G.sphere(6, 4), '#e8b440', [0, -0.02 + k * 0.012, 0], [0, 0, (k & 1 ? 0.5 : -0.5)], [0.01, 0.007, 0.004]); r.pop(); }
    r.fx(0, 0);
    K.face(r, [0, 0.36, 0], 0.32, yuz({ bone: 'body', tilt: 0.12, ex: 0.1, ey: 0.05, er: 0.09, iris: '#5a3a1e', skin: cloth, browCol: '#8a6a44', browY: 1.36,
      mouthY: -0.075, mouthW: 0.08, heartY: 1.25, heartX: 1.2, heartS: 0.3 }));
    // köşe kulakçıkları (eller)
    r.on('body').fx(0, 0, 1).uv(2, 2);
    for (const sd of [-1, 1]) r.add(G.sphere(14, 10), cloth, [0.31 * sd, 0.42, 0.05], [0, 0, sd * 0.6], [0.06, 0.09, 0.06]);
    r.uv(null).fx(0, 0);
    r.on('feet');
    for (const sd of [-1, 1]) shoe(r, 0.13 * sd, 0.03, 0.12, 0.07, 0.04, 0.09, '#8a5a3a', 0.3);
    if (E) K.crown(r.on('body'), [0, 0.86, 0], 0.5);
    r.on('body').mark('muzzle', [0, 0.4, 0.33]);
    return { height: 0.8, glowC: col('#ffd890'), tex: fabTex(1),
      mat: { rough: 0.9, rim: '#fff6e0', rimK: 0.3, rimP: 2.4, wob: 0.008, wobF: 6, wobS: 3 } };
  }
  function animUn(m, dt, st, s) {
    const B = m.B, b = B.body;
    const k = walkPh(s, dt, 7), ph = s.walk;
    b.rotation.z = Math.sin(ph) * 0.14 * k + Math.sin(s.t * 1.5 + s.ph) * 0.04;
    b.position.y += Math.abs(Math.sin(ph)) * 0.04 * k;
    let sy = 1 + 0.025 * breath(s);
    if (st.windup >= 0) {   // geriye çekilip hazırlanır, kıpır kıpır
      const w = sm(st.windup * 1.4);
      b.rotation.x = -0.35 * w; sy *= 1 - 0.12 * w; b.position.z -= 0.08 * w; b.position.x += Math.sin(s.t * 60) * 0.012 * st.windup;
    }
    if (st.attack >= 0) {
      if (st.attack < 1 && s.mv > 0.5) {   // yuvarlanma: top gibi döner, ayaklar içeri
        s.roll = (s.roll || 0) + dt * 14;
        b.rotation.x = s.roll; B.feet.scale.setScalar(0.0001); b.position.y += 0.02;
      } else {   // sersem: başı döner
        s.roll = 0; b.rotation.z += Math.sin(s.t * 9) * 0.18; b.rotation.y = Math.sin(s.t * 6) * 0.3;
      }
    } else s.roll = 0;
    { const u = gag(s, st, dt, 2.0, 5);   // bekleme: titrer, "puf!" — tepesindeki un bulutu kabarır, kendisi de şaşırır
      if (u >= 0) { const sh = bumpU(u, 0, 0.4), pf = bumpU(u, 0.35, 1); b.position.x += Math.sin(s.t * 60) * 0.012 * sh; sy *= 1 - 0.1 * sh + 0.12 * bumpU(u, 0.35, 0.55);
        B.puf.scale.setScalar(1 + 1.6 * pf); B.puf.position.y += 0.12 * pf; s.eyeK = 1 + 0.35 * pf; }
    }
    b.scale.set(1 - (sy - 1) * 0.5, sy, 1 - (sy - 1) * 0.5);
    boing(s, st, dt, b);
  }

  // ════════════════ BUZDOLABI ════════════════
  // ── Buz Küpü: yumuşak köşeli parlak buz; kayarak gelir (kızak gibi), titreyip hazırlanır ──
  function buildBuz(r, o) {
    const E = o.elite;
    r.bone('body', 'root', [0, 0.27, 0]);
    r.bone('armL', 'body', [0.27, 0.27, 0.02]); r.bone('armR', 'body', [-0.27, 0.27, 0.02]);
    const ice = K.vgrad(0.02, 0.54, [[0, '#4aa6e4'], [0.45, '#8fd0fa'], [1, '#cdeeff']]), out = new THREE.Color();
    r.on('body').fx(0, 1);
    r.add(sbox(0.54, 0.5, 0.5, 0.11, 4), (x, y, z) => out.copy(ice(x, y, z)).lerp(col('#eaf8ff'), 0.25 * sm((Math.max(Math.abs(x) / 0.27, Math.abs(z) / 0.25, Math.abs(y - 0.27) / 0.25) - 0.82) / 0.18)), [0, 0.27, 0]);
    // donmuş kabarcıklar + çatlak çizgisi (içeride gibi)
    r.fx(0.5, 1);
    for (const b of [[0.16, 0.42, 0.2, 0.025], [-0.18, 0.12, 0.2, 0.02], [0.2, 0.1, 0.18, 0.016], [-0.12, 0.45, -0.2, 0.02]]) r.add(G.sphere(10, 8), '#ffffff', [b[0], b[1], b[2]], null, b[3]);
    r.fx(1, 0).add(G.sphere(12, 8), hdr('#ffffff', 1.5), [-0.17, 0.46, 0.21], [0.3, -0.4, 0.6], [0.07, 0.022, 0.01]);
    r.add(G.sphere(8, 6), hdr('#ffffff', 1.3), [0.2, 0.47, 0.18], null, 0.016);
    // tepede kar kırağısı
    r.fx(0, 0.2, 0, 0);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr = 0.1 + 0.08 * hash(i, 2, 3); r.add(G.sphere(10, 6), '#ffffff', [Math.sin(a) * rr, 0.52, Math.cos(a) * rr - 0.02], null, [0.07, 0.03, 0.07]); }
    r.add(G.sphere(14, 8), '#ffffff', [0, 0.525, -0.02], null, [0.14, 0.035, 0.14]);
    r.fx(0, 0);
    K.face(r, [0, 0.27, -0.62], 0.873, yuz({ bone: 'body', tilt: 0.0, ex: 0.1, ey: 0.02, er: 0.075, iris: '#2a5fae', skin: col('#c6ecff'), browCol: '#4a7ab8', browY: 1.32,
      mouthY: -0.095, mouthW: 0.085, noHearts: true, blushCol: '#ff9ac0', inset: 0.015 }));
    hearts(r, [[0.33, 0.6, 0.18, 0.085], [-0.31, 0.66, 0.18, 0.07]]);
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 1);
      r.add(sbox(0.1, 0.09, 0.09, 0.03, 2), '#c4ecff', [0.31 * sd, 0.24, 0.04]);
      r.fx(0, 0);
    }
    if (E) K.crown(r.on('body'), [0, 0.56, -0.02], 0.6);
    r.on('body').mark('muzzle', [0, 0.3, 0.3]);
    return { height: 0.62, glowC: col('#b8ecff'), mat: { rough: 0.08, sss: col('#bfe8ff').multiplyScalar(0.12), rim: '#eafaff', rimK: 0.6, rimP: 1.8 } };
  }
  function animBuz(m, dt, st, s) {
    const B = m.B, b = B.body;
    // kayarken öne eğik ve hafif sağa sola süzülür
    b.rotation.x = 0.12 * s.mv; b.rotation.z = Math.sin(s.t * 3 + s.ph) * 0.08 * s.mv + Math.sin(s.t * 1.3 + s.ph) * 0.03;
    b.position.y += Math.abs(Math.sin(s.t * 2 + s.ph)) * 0.015;
    B.armL.rotation.z = 0.3 * s.mv + 0.1 * breath(s); B.armR.rotation.z = -0.3 * s.mv - 0.1 * breath(s);
    let sy = 1;
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); sy -= 0.12 * w; b.rotation.x = -0.25 * w; b.position.x += Math.sin(s.t * 70) * 0.014 * st.windup; }
    if (st.attack >= 0 && st.attack < 1) { b.rotation.x = 0.3; b.rotation.y = Math.sin(st.attack * PI * 4) * 0.25; sy = 0.95; }
    else if (st.attack >= 1) { b.rotation.y = s.t * 8 % TAU; }   // döne döne durur
    { const u = gag(s, st, dt, 2.2, 5);
      if (u >= 0) { const sl = bumpU(u, 0, 0.75), tip = sm((u - 0.15) / 0.3) * (1 - sm((u - 0.62) / 0.2));
        b.position.x += 0.18 * sl; b.rotation.z += 0.55 * tip + Math.sin(u * 40) * 0.06 * tip; b.position.y += 0.05 * tip;
        B.armL.rotation.z += 1.4 * tip + Math.sin(s.t * 34) * 0.6 * tip; B.armR.rotation.z -= 1.4 * tip + Math.sin(s.t * 34 + 1) * 0.6 * tip; s.eyeK = 1 + 0.4 * tip; }
    }
    b.scale.set(1 + (1 - sy) * 0.5, sy, 1 + (1 - sy) * 0.5);
    boing(s, st, dt, b);
  }

  // ── Jöle Ayıcık: titrek, parlak jöle ayı; zıplayarak gelir, kollarını kaldırıp üstüne zıplar ──
  const JBEAR = { kirmizi: ['#ff4f6e', '#ffb0c0', '#c81e48'], yesil: ['#5fd36a', '#c6f7b0', '#2c9a44'], turuncu: ['#ff9a2e', '#ffd8a0', '#e0661a'] };
  function buildJole(r, o) {
    const E = o.elite, rb = o.rare;
    let [base, light, deep] = (JBEAR[o.variant] || JBEAR.kirmizi).map(col);
    if (E) { base = col('#b06aff'); light = col('#e6c8ff'); deep = col('#7a3ad8'); }
    const out = new THREE.Color();
    const jc = rb ? (x, y) => out.copy(rainbowAt(y * 1.3 + 0.05)).lerp(col('#ffffff'), 0.08) : K.vgrad(0.02, 0.9, [[0, deep], [0.5, base], [1, mixc(base, light, 0.35)]]);
    r.bone('body', 'root', [0, 0.05, 0]);
    r.bone('head', 'body', [0, 0.56, 0]);
    r.bone('armL', 'body', [0.2, 0.46, 0]); r.bone('armR', 'body', [-0.2, 0.46, 0]);
    r.bone('legL', 'root', [0.1, 0.16, 0]); r.bone('legR', 'root', [-0.1, 0.16, 0]);
    const wob = (x, y) => sm((y - 0.05) / 0.5);
    r.on('body').fx(0, 1, 0, wob);
    { const bl = rb ? col('#fff4c0') : mixc(base, light, 0.5), o2 = new THREE.Color();   // açık renkli karın (yumuşak geçiş)
      r.add(G.sphere(28, 20), (x, y, z) => o2.copy(jc(x, y, z)).lerp(bl, 0.75 * sm((z / 0.19 - 0.55) / 0.3) * sm((1 - Math.hypot(x / 0.15, (y - 0.31) / 0.17)) / 0.4)), [0, 0.34, 0], null, [0.22, 0.25, 0.19]); }
    r.on('head').fx(0, 1, 0, 1).add(G.sphere(30, 22), jc, [0, 0.68, 0], null, [0.215, 0.195, 0.19]);
    r.add(G.sphere(18, 12), mixc(light, base, 0.4), [0, 0.63, 0.15], null, [0.09, 0.065, 0.06]);   // ağız çevresi
    for (const sd of [-1, 1]) {
      r.add(G.sphere(16, 12), jc, [0.15 * sd, 0.85, -0.02], null, [0.07, 0.07, 0.05]);
      r.fx(0.2, 1, 0, 1).add(G.sphere(12, 8), light, [0.15 * sd, 0.85, 0.02], null, [0.04, 0.04, 0.02]).fx(0, 1, 0, 1);
    }
    r.on('head').fx(1, 0, 0, 1).add(G.sphere(12, 8), hdr('#ffffff', 1.4), [-0.1, 0.8, 0.13], [0.5, -0.5, 0.4], [0.055, 0.022, 0.01]);
    r.on('body').fx(1, 0, 0, wob).add(G.sphere(12, 8), hdr('#ffffff', 1.3), [-0.13, 0.44, 0.13], [0.3, -0.6, 0.5], [0.05, 0.02, 0.01]);
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 1, 0, 1).add(G.sphere(16, 10), jc, [0.25 * sd, 0.38, 0.04], [0, 0, sd * 0.7], [0.065, 0.12, 0.065]);
      r.on(sd > 0 ? 'legL' : 'legR').fx(0, 1, 0, 0).add(G.sphere(16, 10), jc, [0.11 * sd, 0.07, 0.05], null, [0.08, 0.075, 0.1]);
    }
    r.fx(0, 0);
    K.face(r, [0, 0.68, 0], 0.195, yuz({ bone: 'head', tilt: 0.2, ex: 0.078, ey: 0.045, er: 0.067, iris: rb ? '#5a2a8a' : mixc(deep, '#1a0f24', 0.6), skin: rb ? col('#ffd84a') : mixc(base, light, 0.15),
      browCol: mixc(deep, '#1a0a14', 0.6), browY: 1.38, mouthY: -0.09, mouthW: 0.065, heartY: 1.0, heartX: 1.3, heartS: 0.32 }));
    if (E) K.crown(r.on('head'), [0, 0.87, 0], 0.45);
    if (rb) glints(r.on('head'), [[0.22, 0.9, 0.08, 0.03], [-0.26, 0.55, 0.1, 0.025], [0.24, 0.3, 0.1, 0.02]]);
    r.on('head').mark('muzzle', [0, 0.65, 0.2]);
    return { height: 0.9, glowC: col(rb ? '#ffffff' : '#ff8aa0'), mat: { rough: 0.1, sss: mixc(base, '#ffffff', 0.3).multiplyScalar(0.14), rim: mixc(light, '#ffffff', 0.5), rimK: 0.35, rimP: 2.2, wob: 0.014, wobF: 3, wobS: 6 } };
  }
  function animJoleT(m, dt, st, s) {
    const B = m.B, b = B.body;
    const g = hopGait(s, st, dt, 2.1, 0.2);
    let sy = g.sy * (1 + 0.03 * breath(s, 3.2)), sxz = g.sxz, armZ = 0.15 + 0.6 * g.air, rx = 0.08 * g.air;
    B.head.rotation.z = Math.sin(s.t * 2.1 + s.ph) * 0.08;
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); sy *= 1 - 0.25 * w; sxz *= 1 + 0.14 * w; armZ = lerp(armZ, 2.4, w); rx -= 0.2 * w; b.position.x = Math.sin(s.t * 55) * 0.012 * st.windup; }
    if (st.attack >= 0) {
      if (st.attack < 1) { const k = Math.sin(PI * st.attack); sy *= 1 + 0.2 * k; sxz *= 1 - 0.08 * k; armZ = 2.6; rx += 0.25 * k; }
      else { sy *= 0.82; sxz *= 1.12; armZ = 0.9; }
    }
    b.position.y += g.y; b.scale.set(sxz, sy, sxz); b.rotation.x = rx;
    B.armL.rotation.z = armZ; B.armR.rotation.z = -armZ;
    B.legL.position.y += g.y + 0.02 * g.air; B.legR.position.y += g.y + 0.02 * g.air;
    s.wobA = damp(s.wobA ?? 0.014, 0.014, 3.5, dt);
    if (g.u > 0.85 && s.hopK > 0.3) s.wobA = 0.04;
    if (st.hurt > 0.5) s.wobA = Math.max(s.wobA, 0.05 * st.hurt);
    { const u = gag(s, st, dt, 1.8, 4.5);
      if (u >= 0) { const hop = Math.abs(Math.sin(u * PI * 3)) * (1 - u * 0.5); b.position.y += 0.1 * hop; b.scale.y *= 1 + 0.12 * Math.sin(u * 45) * (1 - u);
        B.armL.rotation.z = 0.4 + 2.0 * hop; B.armR.rotation.z = -0.4 - 2.0 * hop; B.legL.position.y += 0.1 * hop; B.legR.position.y += 0.1 * hop; s.wobA = Math.max(s.wobA, 0.05 * (1 - u)); }
    }
    m.U.uWob.value.x = s.wobA;
    boing(s, st, dt, b, 1.3);
  }

  // ── Süt Damlası: parlak beyaz damla, kıvrık tepeli; kayarak gezer, şişip süt sıçratır (uzaktan) ──
  const DROP_P = [[0, 0], [0.18, 0.005], [0.27, 0.05], [0.31, 0.15], [0.3, 0.27], [0.25, 0.39], [0.17, 0.5], [0.09, 0.6], [0.035, 0.68], [0, 0.72]];
  function buildSut(r, o) {
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('tip', 'body', [0, 0.62, 0]);
    const milk = K.vgrad(0, 0.72, [[0, '#a9bbe8'], [0.3, '#e4ecfb'], [0.6, '#fbfdff'], [1, '#ffffff']]);
    r.on('body').fx(0, 0.9, 0, (x, y) => sm(y / 0.5)).add(K.lathe('hzDrop', DROP_P, 36), milk, [0, 0.01, 0]);
    // dibindeki minik sıçrama tacı
    r.fx(0, 0.9, 0, 0);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.2, rr = 0.3; r.add(G.sphere(10, 8), '#f4f8ff', [Math.sin(a) * rr, 0.03, Math.cos(a) * rr], null, [0.045, 0.03 + 0.012 * (i & 1), 0.045]); }
    r.fx(1, 0).add(G.sphere(12, 8), hdr('#ffffff', 1.5), [-0.15, 0.36, 0.2], [0.4, -0.6, 0.4], [0.06, 0.025, 0.01]).fx(0, 0);
    // kıvrık tepe
    r.on('tip').fx(0, 0.9);
    r.add(G.sphere(12, 8), '#ffffff', [0.02, 0.73, -0.01], null, 0.04);
    r.add(G.sphere(10, 8), '#ffffff', [0.06, 0.78, -0.02], null, 0.03);
    r.add(G.sphere(8, 6), '#ffffff', [0.1, 0.8, -0.02], null, 0.022);
    r.fx(0, 0);
    K.face(r, [0, 0.25, 0], 0.318, yuz({ bone: 'body', tilt: 0.18, ex: 0.105, ey: 0.045, er: 0.098, iris: '#1f4fb0', skin: col('#e8eefb'), browCol: '#4a5a8a', browY: 1.35,
      mouthY: -0.1, mouthW: 0.085, heartY: 1.2, heartX: 1.25, blushCol: '#ff6f9f' }));
    r.on('body').mark('muzzle', [0, 0.25, 0.32]);
    return { height: 0.8, glowC: col('#9ad0ff'), mat: { rough: 0.15, sss: col('#ffffff').multiplyScalar(0.04), rim: '#ffd890', rimK: -0.42, rimP: 3.0, wob: 0.012, wobF: 3, wobS: 4 } };
  }
  function animSut(m, dt, st, s) {
    const B = m.B, b = B.body;
    let sy = 1 + 0.04 * breath(s, 2.6), sxz = 1 - 0.02 * breath(s, 2.6);
    b.rotation.z = Math.sin(s.t * 3.4 + s.ph) * 0.1 * s.mv + Math.sin(s.t * 1.4 + s.ph) * 0.03;
    b.rotation.x = 0.1 * s.mv;
    sy += Math.sin(s.t * 7) * 0.04 * s.mv;
    B.tip.rotation.z = Math.sin(s.t * 2.2 + s.ph) * 0.3; B.tip.rotation.x = -0.15 * s.mv;
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); sy *= 1 + 0.18 * w; sxz *= 1 - 0.08 * w; b.rotation.x = -0.25 * w; B.tip.rotation.z += Math.sin(s.t * 30) * 0.3 * w; }
    if (st.attack >= 0 && st.attack < 1) { const kk = Math.sin(PI * st.attack); sy *= 1 - 0.22 * kk; sxz *= 1 + 0.14 * kk; b.rotation.x = 0.25 * kk; }
    { const u = gag(s, st, dt, 2.0, 5);
      if (u >= 0) { const bb = Math.abs(Math.sin(u * PI * 2)); b.position.y += 0.08 * bb; sy *= 1 + 0.15 * bb - 0.18 * bumpU((u * 2) % 1, 0.85, 1); B.tip.rotation.y += u * TAU * 2; B.tip.rotation.z += 0.6 * bb; b.rotation.z += Math.sin(u * TAU * 2) * 0.15; }
    }
    b.scale.set(sxz, sy, sxz);
    boing(s, st, dt, b);
  }

  // ════════════════ PASTA KRALLIĞI ════════════════
  // ── Şekerleme: nane şekeri desenli, kâğıt şapkalı minik asker; ambalajının uçları kolları, elinde lolipop ──
  function buildSeker(r, o) {
    const red = col('#f0203f'), wht = col('#fffaf6'), out = new THREE.Color();
    r.bone('hips', 'root', [0, 0.2, 0]);
    r.bone('body', 'hips', [0, 0.28, 0]);
    r.bone('armL', 'body', [0.27, 0.52, 0]); r.bone('armR', 'body', [-0.27, 0.52, 0]);
    r.bone('legL', 'hips', [0.08, 0.22, 0]); r.bone('legR', 'hips', [-0.08, 0.22, 0]);
    r.bone('pop', 'armR', [-0.42, 0.52, 0.06]);
    r.bone('hat', 'body', [0, 0.78, 0]);
    // bacaklar: şeker çubuğu çizgili + parlak siyah çizmeler
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'legL' : 'legR').fx(0, 0.8);
      r.seg([0.08 * sd, 0.26, 0], [0.085 * sd, 0.08, 0.01], 0.036, (x, y) => (Math.floor((y + x * 0.3) / 0.045) % 2 ? red : wht), 0.034, 10);
      r.fx(0, 0); shoe(r, 0.09 * sd, 0.05, 0.04, 0.065, 0.05, 0.095, '#2a2440', 0.9);
    }
    // gövde: nane şekeri girdabı (yüz bölgesi beyaz)
    r.on('body').fx(0, 1);
    const swirl = (x, y, z) => {
      const a = Math.atan2(x, z), fz = sm((z / 0.26 - 0.55) / 0.2) * sm((0.17 - Math.abs(y - 0.56)) / 0.08);
      const st2 = Math.sin(a * 6 + (y - 0.52) * 9) > -0.15 ? red : wht;
      return out.copy(st2).lerp(wht, fz);
    };
    r.add(G.sphere(32, 24), swirl, [0, 0.52, 0], null, [0.265, 0.26, 0.25]);
    r.fx(1, 0).add(G.sphere(12, 8), hdr('#ffffff', 1.4), [-0.13, 0.66, 0.17], [0.4, -0.5, 0.5], [0.06, 0.022, 0.01]).fx(0, 0);
    // asker kemeri
    r.fx(0, 0.6).add(G.torus(TAU, 0.18, 32), '#4a7ae8', [0, 0.38, 0], [PI / 2, 0, 0], [0.235, 0.235, 0.12]);
    r.fx(0, 2).add(G.sphere(10, 8), K.GOLD, [0, 0.38, 0.235], null, [0.03, 0.03, 0.015]).fx(0, 0);
    // kâğıt şapka (katlanmış gazete kayığı)
    r.on('hat').fx(0, 0.1);
    const hatS = () => { const s2 = new THREE.Shape(); s2.moveTo(-0.24, 0); s2.lineTo(0.24, 0); s2.quadraticCurveTo(0.12, 0.08, 0.02, 0.24); s2.quadraticCurveTo(0, 0.26, -0.02, 0.24); s2.quadraticCurveTo(-0.12, 0.08, -0.24, 0); return s2; };
    r.add(K.extrude('hzHat', hatS, 0.12, 0.014, 8), (x, y) => (y < 0.83 ? col('#ffffff') : col('#fff2c8')), [0, 0.75, -0.01], null, [1.1, 1.1, 1]);
    r.fx(0, 0.4).add(sbox(0.55, 0.065, 0.15, 0.02, 2), '#e8204a', [0, 0.775, -0.01]);
    r.fx(0.3, 1).add(G.cyl(1, 1, 5), '#2f6fff', [0, 0.9, 0.07], [PI / 2, 0, 0], [0.05, 0.012, 0.05]);   // şapka rozeti (mavi beşgen)
    r.fx(0.4, 1).add(G.sphere(10, 8), '#ffd23f', [0, 0.9, 0.08], null, [0.026, 0.026, 0.01]);
    r.fx(0, 0);
    // kollar: ambalajın kıvrılmış uçları (yelpaze)
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0.05, 1);
      K.cone(r, [0.25 * sd, 0.52, 0], [sd, 0.1, 0], 0.08, 0.05, '#ffc2d2', 12);
      r.add(G.cone(16), '#ff9cbc', [0.38 * sd, 0.52, 0.02], [0, 0, sd * PI / 2], [0.13, 0.15, 0.13]);
      r.add(G.sphere(10, 8), '#ffd0de', [0.3 * sd, 0.52, 0.02], null, 0.035);
      r.fx(0, 0);
    }
    // lolipop
    r.on('pop').fx(0, 0.3);
    r.seg([-0.42, 0.42, 0.06], [-0.42, 0.78, 0.06], 0.016, (x, y) => (Math.floor(y / 0.05) % 2 ? col('#ff4a7a') : col('#ffffff')), 0.016, 8);
    r.fx(0, 1).add(G.cyl(1, 1, 28), (x, y, z) => rainbowAt(Math.atan2(y - 0.84, x + 0.42) / TAU + Math.hypot(y - 0.84, x + 0.42) * 6), [-0.42, 0.84, 0.06], [PI / 2, 0, 0], [0.085, 0.03, 0.085]);
    r.fx(0, 0);
    K.face(r, [0, 0.52, 0], 0.275, yuz({ bone: 'body', tilt: 0.2, ex: 0.09, ey: 0.04, er: 0.084, iris: '#1a2458', skin: wht, browCol: '#5a2a3a', browY: 1.36,
      mouthY: -0.09, mouthW: 0.075, heartY: 1.15, heartX: 1.3, heartS: 0.3 }));
    r.on('body').mark('muzzle', [0, 0.52, 0.28]);
    return { height: 1.0, glowC: col('#ff7a9a'), mat: { rough: 0.2, sss: col('#ffffff').multiplyScalar(0.02), rim: '#60c8c8', rimK: -0.38, rimP: 3.2 } };
  }
  function animSeker(m, dt, st, s) {
    const B = m.B, k = walkPh(s, dt, 7.5), ph = s.walk;
    // tahta asker gibi dimdik uygun adım
    B.legL.rotation.x = Math.sin(ph) * 0.75 * k; B.legR.rotation.x = -Math.sin(ph) * 0.75 * k;
    B.hips.position.y += Math.abs(Math.cos(ph)) * 0.04 * k + 0.008 * breath(s);
    B.body.rotation.z = Math.sin(ph) * 0.06 * k;
    B.armL.rotation.x = -Math.sin(ph) * 0.5 * k; B.armR.rotation.x = Math.sin(ph) * 0.3 * k;
    B.armL.rotation.z = 0.1 * breath(s, 3); B.armR.rotation.z = -0.1 * breath(s, 3);
    B.hat.rotation.z = Math.sin(ph) * 0.06 * k + Math.sin(s.t * 1.5 + s.ph) * 0.03;
    { const u = gag(s, st, dt, 2.2, 5);
      if (u >= 0) { const sal = sm(u / 0.2) * (1 - sm((u - 0.75) / 0.2)), click = bumpU(u, 0.05, 0.2);
        B.armL.rotation.z = 2.3 * sal; B.armL.rotation.x = -0.4 * sal; B.hips.position.y += 0.05 * click; B.legL.rotation.z = 0.3 * click; B.legR.rotation.z = -0.3 * click;
        B.hat.rotation.z += Math.sin(u * 30) * 0.08 * bumpU(u, 0.2, 0.5); B.body.rotation.x -= 0.1 * sal; }
    }
    if (st.windup >= 0) {   // lolipopu havaya kaldırır
      const w = sm(st.windup * 1.3);
      B.armR.rotation.x = -2.3 * w; B.armR.rotation.z = -0.25 * w; B.pop.rotation.x = 0.8 * w;
      B.body.rotation.x = -0.25 * w; B.hips.position.x += Math.sin(s.t * 50) * 0.008 * st.windup;
    }
    if (st.attack >= 0 && st.attack < 1) {   // "bonk"
      const a = st.attack, hit = sm(a / 0.26), back = sm((a - 0.4) / 0.6);
      B.armR.rotation.x = lerp(-2.3, -0.5, hit) * (1 - back); B.pop.rotation.x = lerp(0.8, 1.2, hit) * (1 - back);
      B.body.rotation.x = 0.25 * Math.sin(PI * Math.min(1, a * 1.6));
    }
    boing(s, st, dt, B.body);
  }

  // ── Çilekçik: minik tombul çilek; yaprak şapkalı, sarı benekli; top gibi yuvarlanarak gelir ──
  const BERRY_P = [[0, 0.0], [0.07, 0.015], [0.17, 0.09], [0.26, 0.2], [0.305, 0.33], [0.31, 0.44], [0.27, 0.53], [0.17, 0.585], [0, 0.6]];
  function buildCilek(r, o) {
    const gold = o.rare, E = o.elite;
    const red = col(gold ? '#ffcf3a' : E ? '#ff2f5a' : '#ff3d55'), redL = col(gold ? '#fff2a0' : '#ff7a8a'), redD = col(gold ? '#d8901a' : '#c8163a');
    r.bone('body', 'root', [0, 0.36, 0]);
    r.bone('leaf', 'body', [0, 0.68, 0]);
    r.bone('feet', 'root', [0, 0.04, 0.04]);
    r.bone('armL', 'body', [0.28, 0.4, 0.04]); r.bone('armR', 'body', [-0.28, 0.4, 0.04]);
    const gl = gold ? 2 : 1;
    r.on('body').fx(0, gl);
    r.add(K.lathe('hzBerry', BERRY_P, 40), K.vgrad(0.08, 0.68, [[0, redD], [0.45, red], [1, mixc(red, redL, 0.4)]]), [0, 0.08, 0]);
    // tohumlar (yüz bölgesi boş)
    r.fx(0, gold ? 2 : 0.6);
    for (let i = 0; i < 46; i++) {
      const y = 0.08 + 0.48 * ((i * 0.618) % 1), a = i * 2.39996, aw = ((a + PI) % TAU) - PI;
      if (Math.abs(aw) < 0.95 && y > 0.22 && y < 0.58) continue;
      const [p, n] = K.onLathe(BERRY_P, y, a, -0.002);
      r.add(G.sphere(8, 6), gold ? '#fff8d0' : '#ffe27a', [p[0], p[1] + 0.08, p[2]], K.qz(...n, a), [0.02, 0.03, 0.012]);
    }
    r.fx(1, 0).add(G.sphere(12, 8), hdr('#ffffff', 1.4), [-0.16, 0.58, 0.19], [0.4, -0.5, 0.5], [0.06, 0.022, 0.01]).fx(0, 0);
    // yaprak şapka + sap
    r.on('leaf').fx(0, 0.5);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; r.add(G.sphere(14, 8), i & 1 ? '#4cc45c' : '#3aae4e', [Math.sin(a) * 0.12, 0.665, Math.cos(a) * 0.12], [0.25 * Math.cos(a), a, -0.25 * Math.sin(a)], [0.06, 0.018, 0.13]); }
    r.seg([0, 0.66, 0], [0.02, 0.76, -0.01], 0.022, '#3a9a46', 0.016, 8);
    r.add(G.sphere(8, 6), '#3a9a46', [0.02, 0.765, -0.01], null, 0.018);
    r.fx(0, 0);
    K.face(r, [0, 0.46, 0], 0.31, yuz({ bone: 'body', tilt: 0.16, ex: 0.1, ey: 0.0, er: 0.085, iris: '#2a0e08', skin: red, browCol: '#6a0a20', browY: 1.36,
      mouthY: -0.1, mouthW: 0.08, heartY: 1.2, heartX: 1.25, blushCol: '#ffb0c8' }));
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.5);
      r.seg([0.27 * sd, 0.4, 0.04], [0.34 * sd, 0.32, 0.07], 0.016, '#3aae4e', 0.014, 6);
      r.add(G.sphere(10, 8), '#4cc45c', [0.35 * sd, 0.31, 0.075], null, 0.03);
      r.fx(0, 0);
    }
    r.on('feet');
    for (const sd of [-1, 1]) shoe(r, 0.1 * sd, 0.04, 0.07, 0.06, 0.045, 0.085, '#3aae4e', 0.5);
    if (E) K.crown(r.on('leaf'), [0, 0.74, 0], 0.5);
    if (gold) glints(r.on('body'), [[0.26, 0.66, 0.08, 0.032], [-0.3, 0.3, 0.1, 0.025], [0.2, 0.14, 0.18, 0.02]]);
    r.on('body').mark('muzzle', [0, 0.38, 0.32]);
    return { height: 0.78, glowC: col(gold ? '#fff0a0' : '#ff7a8a'), mat: { rough: gold ? 0.22 : 0.3, sss: col('#ff5a6a').multiplyScalar(gold ? 0 : 0.05), rim: gold ? '#fff2b0' : '#ffe0e6', rimK: 0.35, rimP: 2.3 } };
  }
  function animCilek(m, dt, st, s) {
    const B = m.B, b = B.body;
    const k = walkPh(s, dt, 9), ph = s.walk;
    b.position.y += Math.abs(Math.sin(ph)) * 0.05 * k; b.rotation.z = Math.sin(ph) * 0.1 * k + Math.sin(s.t * 1.6 + s.ph) * 0.04;
    B.feet.rotation.x = Math.sin(ph) * 0.3 * k;
    B.leaf.rotation.y = Math.sin(s.t * 2 + s.ph) * 0.2; B.leaf.rotation.z = Math.sin(s.t * 2.6) * 0.06;
    B.armL.rotation.z = 0.2 * Math.sin(ph) * k + 0.1; B.armR.rotation.z = -0.2 * Math.sin(ph) * k - 0.1;
    let sy = 1 + 0.03 * breath(s);
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); b.rotation.x = 0.35 * w; sy *= 1 - 0.12 * w; b.position.z -= 0.06 * w; b.position.x += Math.sin(s.t * 60) * 0.012 * st.windup; }
    if (st.attack >= 0) {
      if (st.attack < 1 && s.mv > 0.5) { s.roll = (s.roll || 0) + dt * 15; b.rotation.x = s.roll; B.feet.scale.setScalar(0.0001); B.armL.scale.setScalar(0.0001); B.armR.scale.setScalar(0.0001); }
      else { s.roll = 0; b.rotation.y = Math.sin(s.t * 7) * 0.35; b.rotation.z += Math.sin(s.t * 10) * 0.15; }
    } else s.roll = 0;
    { const u = gag(s, st, dt, 1.8, 5);
      if (u >= 0) { const up = bumpU(u, 0, 1); b.rotation.y += TAU * sm(u); b.position.y += 0.07 * up; sy *= 1 + 0.08 * up; B.armL.rotation.z += 1.6 * up; B.armR.rotation.z -= 1.6 * up; B.leaf.rotation.y += TAU * u; }
    }
    b.scale.set(1 - (sy - 1) * 0.5, sy, 1 - (sy - 1) * 0.5);
    boing(s, st, dt, b);
  }

  // ── Krema Topu: çırpılmış krema kıvrımı, tepesinde kiraz, kurabiye tabanda; şişip krema fışkırtır (uzaktan) ──
  const CREAM_P = [[0, 0.0], [0.3, 0.0], [0.34, 0.04], [0.34, 0.12], [0.31, 0.17], [0.32, 0.22], [0.3, 0.3], [0.25, 0.35], [0.255, 0.4], [0.22, 0.47],
    [0.16, 0.51], [0.15, 0.55], [0.09, 0.62], [0.04, 0.69], [0, 0.72]];
  function buildKrema(r, o) {
    const E = o.elite;
    const cream = col(E ? '#ffd8ec' : '#fff4ea'), creamD = col(E ? '#e890c0' : '#eeb0bc'), out = new THREE.Color();
    r.bone('body', 'root', [0, 0.06, 0]);
    r.bone('top', 'body', [0, 0.55, 0]);
    // kurabiye taban
    r.on('root').fx(0, 0.2, 1).add(G.cyl(1, 0.94, 28), K.vgrad(0, 0.07, [[0, '#b8783a'], [1, '#e0a45a']]), [0, 0.035, 0], null, [0.36, 0.07, 0.36]);
    r.fx(0, 0);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; r.add(G.sphere(6, 4), '#7a4a22', [Math.sin(a) * 0.3, 0.07, Math.cos(a) * 0.3], null, [0.018, 0.008, 0.018]); }
    // krema kıvrımı: sarmal oluklar (yüzün önünde yumuşar)
    const swirl = (x, y, z, a) => {
      const face = Math.exp(-((a / 0.75) ** 4)) * sm((y - 0.1) / 0.06) * (1 - sm((y - 0.45) / 0.06));
      return 1 + 0.07 * Math.sin(a * 7 + y * 26) * sm(y / 0.08) * (1 - 0.85 * face);
    };
    r.on('body').fx(0, 0.55, 0, (x, y) => sm((y - 0.1) / 0.5));
    r.add(wavyLathe('hzCream', CREAM_P, 64, swirl), (x, y, z) => out.copy(creamD).lerp(cream, sm((y - 0.07) / 0.2) * (0.55 + 0.45 * sm(0.5 + 0.5 * Math.sin(Math.atan2(x, z) * 7 + y * 26 + 1.2)))), [0, 0.06, 0]);
    // renkli şeker serpintisi
    r.fx(0.1, 0.8, 0, (x, y) => sm((y - 0.1) / 0.5));
    const SP = ['#ff6a9a', '#ffd23f', '#5fd3c8', '#9b7bff', '#ff9f43'];
    for (let i = 0; i < 18; i++) {
      const y = 0.4 + 0.28 * hash(i, 4, 1), a = hash(i, 7, 3) * TAU, aw = ((a + PI) % TAU) - PI;
      if (Math.abs(aw) < 0.6 && y < 0.5) continue;
      const [p, n] = K.onLathe(CREAM_P, y, a, 0.004);
      r.add(G.capsule(1, 6), SP[i % 5], [p[0], p[1] + 0.06, p[2]], K.qz(...n, a * 3), [0.009, 0.012, 0.009]);
    }
    r.fx(0, 0);
    // kiraz
    r.on('top').fx(0, 1).add(G.sphere(20, 14), K.vgrad(0.72, 0.86, [[0, '#c8102e'], [1, '#ff3a50']]), [0, 0.8, 0], null, 0.075);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.5), [-0.025, 0.83, 0.05], null, 0.014);
    r.fx(0, 0.4); r.seg([0, 0.86, 0], [0.04, 0.97, -0.03], 0.008, '#5a8a2a', 0.006, 6);
    r.fx(0, 0);
    K.face(r, [0, 0.33, 0], 0.365, yuz({ bone: 'body', tilt: 0.2, ex: 0.105, ey: 0.035, er: 0.096, iris: '#2a1420', skin: mixc(cream, creamD, 0.5), browCol: '#7a3a52', browY: 1.35,
      mouthY: -0.1, mouthW: 0.085, heartY: 1.15, heartX: 1.25, blushCol: '#ff6fa0' }));
    if (E) K.crown(r.on('top'), [0, 0.86, 0], 0.5);
    r.on('top').mark('muzzle', [0, 0.72, 0.1]);
    return { height: 0.95, glowC: col('#ffc0dc'), mat: { rough: 0.4, sss: col('#fff0e8').multiplyScalar(0.03), rim: '#70c0a0', rimK: -0.38, rimP: 3.2, wob: 0.01, wobF: 4, wobS: 4 } };
  }
  function animKrema(m, dt, st, s) {
    const B = m.B, b = B.body;
    let sy = 1 + 0.035 * breath(s, 2.2), sxz = 1 - 0.015 * breath(s, 2.2);
    b.rotation.z = Math.sin(s.t * 6 + s.ph) * 0.07 * s.mv + Math.sin(s.t * 1.3 + s.ph) * 0.03;
    b.position.y += Math.abs(Math.sin(s.t * 6 + s.ph)) * 0.03 * s.mv;
    B.top.rotation.z = Math.sin(s.t * 2 + s.ph) * 0.12; B.top.rotation.y = s.t * 0.6;
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); sy *= 1 + 0.2 * w; sxz *= 1 - 0.1 * w; b.rotation.x = -0.2 * w; B.top.position.y += 0.05 * w; b.rotation.y = Math.sin(s.t * 40) * 0.05 * w; }
    if (st.attack >= 0 && st.attack < 1) { const kk = Math.sin(PI * st.attack); sy *= 1 - 0.25 * kk; sxz *= 1 + 0.15 * kk; b.rotation.x = 0.2 * kk; }
    { const u = gag(s, st, dt, 2.0, 5);
      if (u >= 0) { const sq = bumpU(u, 0, 0.18), fly = bumpU(u, 0.15, 0.75), cat = bumpU(u, 0.72, 0.95);
        sy *= 1 - 0.18 * sq - 0.15 * cat; sxz *= 1 + 0.1 * sq + 0.08 * cat; B.top.position.y += 0.45 * fly; B.top.rotation.y += TAU * 2 * sm((u - 0.15) / 0.6); s.eyeK = 1 + 0.4 * fly; }
    }
    b.scale.set(sxz, sy, sxz);
    boing(s, st, dt, b);
  }

  // ════════════════ 3. TUR: her odaya 2 yeni huysuz ════════════════
  // Basit sevimli yüz (bezelyenin yan taneleri gibi ikinci/üçüncü yüzler için): iki göz + gülüş; neşede ^ ^ + kocaman gülüş
  function miniFace(r, c, R, er, tilt = 0.2) {
    r.push(c, [-tilt, 0, 0]);
    for (const sd of [-1, 1]) {
      const [p, q] = onSphere(sd * R * 0.36, R * 0.12, R, er * 0.25);
      r.push(p, q);
      r.mood = 1;
      r.fx(0, 1).add(G.sphere(12, 10), '#fbfbff', [0, 0, 0], null, [er, er * 1.1, er * 0.6]);
      r.add(G.sphere(10, 8), '#1a1024', [0, -er * 0.1, er * 0.42], null, [er * 0.62, er * 0.7, er * 0.3]);
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.6), [-er * 0.22, er * 0.22, er * 0.66], null, er * 0.2);
      r.mood = 2;
      r.fx(0, 0.3).add(G.torus(PI * 0.8, 0.34, 12), K.DARK, [0, -er * 0.3, er * 0.1], [0, 0, PI * 0.1], [er * 0.9, er * 0.85, er * 0.7]);
      r.mood = 0; r.fx(0, 0);
      r.pop();
      const [pb, qb2] = onSphere(sd * R * 0.5, -R * 0.12, R, -er * 0.05);
      r.push(pb, qb2).fx(0.35, 0).add(G.sphere(10, 6), '#ff7aa8', [0, 0, 0], null, [er * 0.7, er * 0.4, er * 0.2]).fx(0, 0).pop();
    }
    const [pm, qm] = onSphere(0, -R * 0.2, R, 0);
    r.push(pm, qm);
    r.mood = 1; r.fx(0, 0.3).add(G.torus(PI * 0.6, 0.38, 12), K.DARK, [0, er * 0.35, 0], [0, 0, -PI / 2 - PI * 0.3], [er * 0.75, er * 0.65, er * 0.5]);
    r.mood = 2; r.fx(0, 0.5).add(G.hemi(14), '#6a1f3c', [0, 0, 0], [PI, 0, 0], [er * 0.85, er * 0.75, er * 0.4]);
    r.add(G.sphere(8, 6), '#ff7fa4', [0, -er * 0.35, er * 0.15], null, [er * 0.45, er * 0.22, er * 0.2]);
    r.mood = 0; r.fx(0, 0);
    r.pop(); r.pop();
  }

  // ── Kalemcik: tombul boya kalemi (kâğıt sargılı); zikzak koşar, uç tarafıyla kayarak gelip yere renkli çizgi çizer ──
  function buildKalem(r, o) {
    const wax = col('#f0281e'), waxL = col('#ff6a4a'), paper = col('#fff3dc'), out = new THREE.Color();
    r.bone('body', 'root', [0, 0.1, 0]);
    r.bone('legL', 'root', [0.07, 0.12, 0]); r.bone('legR', 'root', [-0.07, 0.12, 0]);
    r.bone('armL', 'body', [0.16, 0.42, 0]); r.bone('armR', 'body', [-0.16, 0.42, 0]);
    for (const sd of [-1, 1]) { r.on(sd > 0 ? 'legL' : 'legR'); r.seg([0.07 * sd, 0.13, 0], [0.075 * sd, 0.05, 0.01], 0.025, '#3a2a4a', 0.024, 6); shoe(r, 0.08 * sd, 0.04, 0.04, 0.06, 0.045, 0.09, '#4fa8ff'); }
    r.on('body').fx(0, 0.6);
    r.add(G.cyl(1, 1, 24), wax, [0, 0.16, 0], null, [0.165, 0.08, 0.165]);
    r.add(G.sphere(20, 8), wax, [0, 0.12, 0], null, [0.165, 0.03, 0.165]);
    // kâğıt sargı: krem kâğıt, üstte ve altta koyu çizgiler, ortada dalgalı desen
    r.fx(0, 0.15).add(G.cyl(1, 1, 28), (x, y, z) => {
      const a = Math.atan2(x, z), band = Math.abs(y - 0.22) < 0.018 || Math.abs(y - 0.66) < 0.018;
      return out.copy(band ? col('#3a2a4a') : paper).lerp(wax, !band && Math.abs(y - 0.3 - 0.02 * Math.sin(a * 6)) < 0.012 ? 0.9 : 0);
    }, [0, 0.44, 0], null, [0.17, 0.5, 0.17]);
    r.fx(0, 0.6).add(G.cyl(0.92, 1, 24), wax, [0, 0.74, 0], null, [0.165, 0.1, 0.165]);
    r.add(G.cone(24), K.vgrad(0.78, 1.05, [[0, wax], [1, waxL]]), [0, 0.9, 0], null, [0.15, 0.24, 0.15]);
    r.add(G.sphere(12, 8), waxL, [0, 1.02, 0], null, [0.035, 0.02, 0.035]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.2), [-0.08, 0.86, 0.1], [0, 0, 0.5], [0.025, 0.08, 0.01]).fx(0, 0);
    K.face(r, [0, 0.45, 0], 0.18, yuz({ bone: 'body', tilt: 0.15, ex: 0.066, ey: 0.03, er: 0.06, iris: '#2a1a40', skin: paper, browCol: '#5a2a3a', browY: 1.36,
      mouthY: -0.085, mouthW: 0.065, heartY: 1.6, heartX: 1.6, heartS: 0.35 }));
    for (const sd of [-1, 1]) { r.on(sd > 0 ? 'armL' : 'armR').seg([0.16 * sd, 0.42, 0], [0.25 * sd, 0.3, 0.04], 0.02, '#3a2a4a', 0.018, 6); mitt(r, [0.26 * sd, 0.28, 0.05], 0.042); }
    r.on('body').mark('muzzle', [0, 0.45, 0.2]);
    return { height: 1.05, glowC: col('#ff6a5a'), mat: { rough: 0.45, rim: '#ffffff', rimK: 0.3, rimP: 2.4 } };
  }
  function animKalem(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 10), ph = s.walk;
    B.legL.rotation.x = Math.sin(ph) * 0.8 * k; B.legR.rotation.x = -Math.sin(ph) * 0.8 * k;
    b.position.y += Math.abs(Math.cos(ph)) * 0.04 * k;
    // zikzak: koşarken bir sağa bir sola yatıp kayar
    const zz = Math.sin(s.t * 4 + s.ph) * k;
    b.rotation.z = zz * 0.3 + Math.sin(s.t * 1.7 + s.ph) * 0.04; b.position.x += zz * 0.12; b.rotation.y = zz * 0.4;
    B.armL.rotation.x = -Math.sin(ph) * 0.7 * k; B.armR.rotation.x = Math.sin(ph) * 0.7 * k;
    B.armL.rotation.z = 0.2; B.armR.rotation.z = -0.2;
    { const u = gag(s, st, dt, 1.8, 5);   // bekleme: kalemtıraşta gibi fırıl fırıl döner, sonra başı döner sendeler
      if (u >= 0) { b.rotation.y += TAU * 2 * sm(u / 0.6); b.position.y += 0.05 * bumpU(u, 0, 0.6); b.rotation.z += Math.sin(s.t * 8) * 0.15 * bumpU(u, 0.6, 1); s.eyeK = 1 - 0.8 * bumpU(u, 0.55, 0.95); } }
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); b.rotation.x = -0.3 * w; b.scale.y *= 1 - 0.1 * w; B.armL.rotation.z = 1.2 * w; B.armR.rotation.z = -1.2 * w; b.position.x += Math.sin(s.t * 60) * 0.01 * st.windup; }
    if (st.attack >= 0 && st.attack < 1) { b.rotation.x = 1.15; b.position.z += 0.2; b.position.y += 0.05; b.rotation.z = Math.sin(s.t * 20) * 0.08; B.legL.rotation.x = B.legR.rotation.x = -0.8; }   // ucuyla yerde çizerek kayar
    else if (st.attack >= 1) { b.rotation.z += Math.sin(s.t * 9) * 0.2; }
    boing(s, st, dt, b);
  }

  // ── Yastıkçık: pofuduk minik kırlent (puantiyeli, köşe püsküllü); zıplayarak gelir, neşelenince ikiye bölünür: iki minik yastık ──
  function buildYastik(r, o) {
    const mini = o.mini, base = col(mini ? '#9fe0d0' : '#ffb0cc'), dot = col('#ffffff'), deep = col(mini ? '#5fb8a8' : '#e87aa0'), out = new THREE.Color();
    const cloth = (x, y, z) => { const u = x * 11, v = y * 11 + (Math.floor(x * 11 + 0.5) & 1) * 0.5, d = Math.hypot(u - Math.round(u), v - Math.round(v)), fz = Math.hypot(x / 0.2, (y - 0.4) / 0.16) < 1 && z > 0; return out.copy(base).lerp(deep, sm((0.22 - y) / 0.2) * 0.4).lerp(dot, d < 0.18 && !fz ? 0.9 : 0); };
    r.bone('body', 'root', [0, 0.05, 0]);
    r.bone('feet', 'root', [0, 0.03, 0.04]);
    r.on('body').fx(0, 0.15, 0.25, 0.6).uv(2, 2);
    r.add(G.sphere(30, 22), cloth, [0, 0.38, 0], null, [0.34, 0.3, 0.16]);
    for (const [x, y] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) r.add(G.sphere(14, 10), cloth, [0.27 * x, 0.38 + 0.22 * y, 0], null, [0.1, 0.09, 0.08]);
    r.uv(null).fx(0, 0.3, 0, 0.6);
    for (const [x, y] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { r.add(G.sphere(10, 8), '#ffd23f', [0.36 * x, 0.38 + 0.3 * y, 0], null, 0.035); r.add(G.cone(8), '#ffd23f', [0.39 * x, 0.38 + 0.33 * y, 0], [0, 0, -x * y * 0.8 + (y < 0 ? PI : 0)], [0.025, 0.05, 0.025]); }
    r.fx(0, 0.4).add(G.torus(TAU, 0.06, 40), deep, [0, 0.38, 0], [0, 0, 0], [0.335, 0.295, 0.25]);   // dikiş kenarı
    r.fx(0, 0);
    K.face(r, [0, 0.39, -0.26], 0.415, yuz({ bone: 'body', tilt: 0.0, ex: 0.1, ey: 0.03, er: 0.085, inset: 0.012, iris: '#3a1a40', skin: base, browCol: '#8a3a5a', browY: 1.32,
      mouthY: -0.1, mouthW: 0.085, noHearts: true }));
    hearts(r, [[0.36, 0.78, 0.12, 0.085], [-0.34, 0.84, 0.12, 0.07]]);
    r.on('feet'); for (const sd of [-1, 1]) shoe(r, 0.13 * sd, 0.04, 0.06, 0.07, 0.045, 0.08, mini ? '#ff8ab0' : '#7a5ad0', 0.4);
    r.on('body').mark('muzzle', [0, 0.38, 0.2]);
    return { height: 0.8, glowC: col('#ff9ac0'), tex: fabTex(2), mat: { rough: 0.9, rim: '#ffffff', rimK: 0.35, rimP: 2.2, wob: 0.008, wobF: 5, wobS: 3 } };
  }
  function animYastik(m, dt, st, s) {
    const B = m.B, b = B.body;
    const g = hopGait(s, st, dt, 2.2, 0.18);
    let sy = g.sy * (1 + 0.03 * breath(s, 2)), sxz = g.sxz, rx = 0.1 * g.air;
    { const u = gag(s, st, dt, 3.0, 5);   // bekleme: uykusu gelir, yana devrilip kestirir, "hop" diye uyanır
      if (u >= 0) { const nap = sm(u / 0.25) * (1 - sm((u - 0.8) / 0.1)); b.rotation.z += 0.5 * nap; b.position.x += 0.06 * nap; s.eyeK = 1 - 0.95 * nap; sy *= 1 + 0.04 * Math.sin(s.t * 3) * nap; b.position.y += 0.1 * bumpU(u, 0.85, 1); } }
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); sy *= 1 - 0.28 * w; sxz *= 1 + 0.15 * w; rx -= 0.2 * w; b.position.x += Math.sin(s.t * 55) * 0.012 * st.windup; }
    if (st.attack >= 0) { if (st.attack < 1) { const kk = Math.sin(PI * st.attack); sy *= 1 + 0.2 * kk; rx += 0.5 * kk; } else { sy *= 0.8; sxz *= 1.12; } }
    b.position.y += g.y; b.scale.set(sxz, sy, sxz); b.rotation.x = rx;
    B.feet.position.y += g.air * 0.1;
    boing(s, st, dt, b, 1.4);
  }

  // ── Çatalcık: ters duran gümüş çatal; üç dişi üç minik ayak, tıpış tıpış koşar; geriye çekilip öne "saplama" hamlesi (zıplayarak) ──
  function buildCatal(r, o) {
    const met = K.vgrad(0, 1.1, [[0, '#9aa4b8'], [0.5, '#dfe6f2'], [1, '#ffffff']]);
    r.bone('body', 'root', [0, 0.26, 0]);
    r.bone('t0', 'root', [-0.07, 0.24, 0]); r.bone('t1', 'root', [0, 0.24, 0]); r.bone('t2', 'root', [0.07, 0.24, 0]);
    r.bone('armL', 'body', [0.06, 0.58, 0]); r.bone('armR', 'body', [-0.06, 0.58, 0]);
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.07;
      r.on('t' + i).fx(0, 2).seg([x, 0.26, 0], [x, 0.04, 0.01], 0.022, met, 0.018, 8);
      r.add(G.sphere(10, 8), '#eef2fa', [x, 0.035, 0.012], null, [0.024, 0.024, 0.03]);
      r.fx(0, 0.4).add(G.sphere(10, 6), '#ff6a8a', [x, 0.03, 0.02], null, [0.03, 0.022, 0.04]);   // pembe ayak uçları (patik)
    }
    r.on('body').fx(0, 2);
    r.add(sbox(0.22, 0.1, 0.05, 0.02, 2), met, [0, 0.3, 0]);
    r.add(G.sphere(16, 10), met, [0, 0.37, 0], null, [0.08, 0.06, 0.035]);
    r.seg([0, 0.38, 0], [0, 0.68, 0], 0.035, met, 0.045, 12);
    r.add(G.sphere(28, 20), met, [0, 0.84, -0.01], null, [0.13, 0.19, 0.055]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.3), [-0.07, 0.95, 0.04], [0, 0, 0.4], [0.02, 0.06, 0.008]).fx(0, 0);
    K.face(r, [0, 0.84, -0.5], 0.545, yuz({ bone: 'body', tilt: 0.0, ex: 0.058, ey: 0.03, er: 0.05, inset: 0.008, iris: '#2a3a7a', skin: col('#e6ecf6'), browCol: '#4a5a7a', browY: 1.35,
      mouthY: -0.075, mouthW: 0.06, noHearts: true }));
    hearts(r, [[0.2, 1.06, 0.06, 0.065], [-0.19, 1.1, 0.06, 0.055]]);
    for (const sd of [-1, 1]) { r.on(sd > 0 ? 'armL' : 'armR').fx(0, 2).seg([0.03 * sd, 0.58, 0], [0.13 * sd, 0.5, 0.04], 0.016, met, 0.014, 6); r.fx(0, 0); mitt(r, [0.145 * sd, 0.48, 0.05], 0.04); }
    r.on('body').mark('muzzle', [0, 0.84, 0.1]);
    return { height: 1.05, glowC: col('#bcd4ff'), mat: { rough: 0.2, rim: '#ffffff', rimK: 0.35, rimP: 2.2 } };
  }
  function animCatal(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 14), ph = s.walk;
    for (let i = 0; i < 3; i++) { const p = ph + i * 2.1; B['t' + i].position.y += Math.max(0, Math.sin(p)) * 0.05 * k; B['t' + i].rotation.x = Math.cos(p) * 0.3 * k; }
    b.position.y += Math.abs(Math.sin(ph * 1.5)) * 0.03 * k; b.rotation.z = Math.sin(ph) * 0.08 * k + Math.sin(s.t * 1.8 + s.ph) * 0.04; b.rotation.x = -0.1 + 0.1 * k;
    B.armL.rotation.z = 0.3 + 0.2 * Math.sin(ph) * k; B.armR.rotation.z = -0.3 - 0.2 * Math.sin(ph) * k;
    { const u = gag(s, st, dt, 2.4, 5);   // bekleme: dişleriyle step dansı (tık tık tık), kollar iki yana
      if (u >= 0) { const d = bumpU(u, 0, 1); for (let i = 0; i < 3; i++) B['t' + i].position.y += Math.max(0, Math.sin(s.t * 18 + i * 2.1)) * 0.06 * d; b.rotation.z += Math.sin(s.t * 9) * 0.12 * d; B.armL.rotation.z += 1.0 * d; B.armR.rotation.z -= 1.0 * d; b.position.y += 0.02 * d; } }
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); b.rotation.x = -0.1 - 0.5 * w; b.position.z -= 0.08 * w; b.scale.y *= 1 - 0.1 * w; B.armL.rotation.z = 1.2 * w; B.armR.rotation.z = -1.2 * w; b.position.x += Math.sin(s.t * 60) * 0.008 * st.windup; }
    if (st.attack >= 0 && st.attack < 1) { const a = st.attack, hit = sm(a / 0.25), back = sm((a - 0.45) / 0.55); b.rotation.x = lerp(-0.6, 0.7, hit) * (1 - back); b.position.z += 0.25 * hit * (1 - back); b.position.y += 0.1 * Math.sin(PI * Math.min(1, a * 2)); }
    boing(s, st, dt, b);
  }

  // ── Çay Bardağı: ince belli çay bardağı, tabağıyla; içindeki çay çalkalanır, buhar halkası atar (uzaktan); neşelenince şıngırdar ──
  const TEA_P = [[0, 0.06], [0.14, 0.06], [0.17, 0.09], [0.15, 0.16], [0.13, 0.26], [0.145, 0.36], [0.2, 0.5], [0.23, 0.62], [0.24, 0.72], [0.235, 0.78]];
  function buildCay(r, o) {
    const out = new THREE.Color(), tea = K.vgrad(0.06, 0.73, [[0, '#7a1a08'], [0.5, '#c8401c'], [1, '#ec7a2a']]), glass = col('#eef6ff');
    r.bone('body', 'root', [0, 0.06, 0]);
    r.bone('steam', 'body', [0, 0.85, 0]);
    r.bone('saucer', 'root', [0, 0, 0]);
    r.on('saucer').fx(0, 0.6).add(G.cyl(1, 0.8, 32), K.vgrad(0, 0.06, [[0, '#c8c4e0'], [1, '#f2eefc']]), [0, 0.03, 0], null, [0.3, 0.05, 0.3]);
    r.fx(0, 1).add(G.torus(TAU, 0.12, 36), '#e8c060', [0, 0.055, 0], [PI / 2, 0, 0], [0.29, 0.29, 0.2]);   // altın yaldız
    r.on('body').fx(0, 1, 0, (x, y) => sm((y - 0.5) / 0.3) * 0.5);
    r.add(K.lathe('hzTea', TEA_P, 36), (x, y, z) => (y < 0.73 ? out.copy(tea(x, y, z)) : out.copy(glass)), [0, 0, 0]);
    r.fx(0, 2).add(G.torus(TAU, 0.08, 36), '#f0cc70', [0, 0.78, 0], [PI / 2, 0, 0], [0.235, 0.235, 0.15]);   // ağız yaldızı
    r.fx(0.2, 0.9).add(G.cyl(1, 1, 30), '#e8803a', [0, 0.73, 0], null, [0.238, 0.008, 0.238]);   // çay yüzeyi
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.4), [-0.16, 0.6, 0.15], [0, 0, 0.35], [0.02, 0.1, 0.008]);
    r.add(G.sphere(8, 6), hdr('#ffffff', 1.2), [0.13, 0.72, 0.18], null, 0.012);
    r.fx(0, 2).seg([0.08, 0.6, -0.08], [0.16, 0.98, -0.12], 0.012, '#e6ecf6', 0.01, 6);   // çay kaşığı
    r.add(G.sphere(10, 6), '#e6ecf6', [0.165, 1.0, -0.12], null, [0.03, 0.02, 0.04]);
    r.fx(0, 0);
    K.face(r, [0, 0.56, 0], 0.235, yuz({ bone: 'body', tilt: 0.15, ex: 0.085, ey: 0.03, er: 0.074, iris: '#2a0e04', skin: col('#c8401c'), browCol: '#4a1004', browY: 1.36,
      mouthY: -0.1, mouthW: 0.07, heartY: 1.6, heartX: 1.4, heartS: 0.35, blushCol: '#ff7aa0', mouthCol: '#3a0a02' }));
    // buhar halkaları (hazırlıkta ve beklemede görünür)
    r.on('steam').fx(0.4, 0.2, 0, 1);
    r.add(G.torus(TAU, 0.22, 20), '#ffffff', [0, 0.9, 0], [PI / 2, 0, 0], [0.08, 0.08, 0.06]);
    r.add(G.torus(TAU, 0.22, 20), '#ffffff', [0.03, 1.02, 0], [PI / 2, 0, 0], [0.06, 0.06, 0.05]);
    r.add(G.sphere(10, 6), '#ffffff', [-0.02, 1.12, 0], null, 0.035);
    r.fx(0, 0);
    r.on('body').mark('muzzle', [0, 0.85, 0.05]);
    return { height: 1.0, glowC: col('#ffb070'), hide: ['steam'], mat: { rough: 0.08, sss: col('#ff8a40').multiplyScalar(0.06), rim: '#ffffff', rimK: 0.45, rimP: 2.0, wob: 0.006, wobF: 8, wobS: 6 } };
  }
  function animCay(m, dt, st, s) {
    const B = m.B, b = B.body;
    // yürürken tabağıyla birlikte tıpış tıpış zıplar (tabak kayar)
    const hop = Math.abs(Math.sin(s.t * 9 + s.ph)) * s.mv;
    B.saucer.position.y += hop * 0.04; b.position.y += hop * 0.06; b.rotation.z = Math.sin(s.t * 9 + s.ph) * 0.06 * s.mv + Math.sin(s.t * 1.5 + s.ph) * 0.03;
    let steam = 0;
    { const u = gag(s, st, dt, 2.2, 5);   // bekleme: çay çalkalanır, "püf" buhar halkası, keyifle gözlerini kapatır
      if (u >= 0) { const sl = bumpU(u, 0, 0.5); b.rotation.z += Math.sin(s.t * 14) * 0.1 * sl; steam = bumpU(u, 0.35, 1); s.eyeK = 1 - 0.85 * bumpU(u, 0.45, 0.95); m.U.uWob.value.x = 0.02 * sl; } else m.U.uWob.value.x = 0.006; }
    if (st.windup >= 0) { const w = sm(st.windup * 1.3); steam = Math.max(steam, w); b.scale.y *= 1 + 0.12 * w; b.rotation.x = -0.25 * w; b.position.x += Math.sin(s.t * 50) * 0.01 * st.windup; }
    if (st.attack >= 0 && st.attack < 1) { const kk = Math.sin(PI * st.attack); b.scale.y *= 1 - 0.18 * kk; b.rotation.x = 0.2 * kk; }
    if (steam > 0.01) { B.steam.scale.setScalar(0.4 + 0.6 * steam); B.steam.position.y += 0.1 * steam + 0.03 * Math.sin(s.t * 5); B.steam.rotation.y = s.t * 2; }
    else B.steam.scale.setScalar(0.0001);
    boing(s, st, dt, b);
  }

  // ── Penguen Şişe: penguen kılıklı süt şişesi (lacivert ceket, beyaz göbek, mavi folyo kapak, turuncu gaga ve ayaklar); karnı üstünde kayarak gelir ──
  const PEN_P = [[0, 0.05], [0.18, 0.05], [0.22, 0.09], [0.24, 0.2], [0.24, 0.46], [0.21, 0.58], [0.15, 0.67], [0.12, 0.74], [0.125, 0.79], [0.115, 0.81]];
  function buildPenguen(r, o) {
    const navy = col('#2a3a78'), navyL = col('#4a5ab0'), wht = col('#ffffff'), out = new THREE.Color();
    r.bone('body', 'root', [0, 0.05, 0]);
    r.bone('finL', 'body', [0.23, 0.45, 0]); r.bone('finR', 'body', [-0.23, 0.45, 0]);
    r.bone('feet', 'root', [0, 0.03, 0.05]);
    r.on('body').fx(0, 0.9);
    r.add(K.lathe('hzPen', PEN_P, 36), (x, y, z) => { const belly = z > 0.04 && Math.hypot(x / 0.17, (y - 0.33) / 0.3) < 1; return belly ? out.copy(wht).lerp(col('#dfe8ff'), sm((0.2 - y) / 0.15) * 0.5) : out.copy(navy).lerp(navyL, sm((y - 0.3) / 0.4) * 0.6); }, [0, 0, 0]);
    r.fx(0, 2).add(G.cyl(1, 0.95, 24), '#3fa0ff', [0, 0.825, 0], null, [0.135, 0.05, 0.135]);   // folyo kapak
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; r.add(G.sphere(6, 4), '#5ab8ff', [Math.sin(a) * 0.135, 0.8, Math.cos(a) * 0.135], null, [0.018, 0.02, 0.018]); }
    r.fx(0.3, 0.8).add(G.sphere(10, 6), '#ffffff', [0, 0.855, 0], null, [0.05, 0.012, 0.05]);
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#ffffff', 1.3), [-0.15, 0.5, 0.17], [0, 0, 0.3], [0.02, 0.09, 0.008]).fx(0, 0);
    K.face(r, [0, 0.5, 0], 0.235, yuz({ bone: 'body', tilt: 0.12, ex: 0.08, ey: 0.05, er: 0.07, iris: '#1a2058', skin: navy, browCol: '#d0d8ff', browY: 1.3,
      mouthY: -0.12, mouthW: 0.06, heartY: 1.4, heartX: 1.4, heartS: 0.35 }));
    r.on('body').push([0, 0.5, 0], [-0.12, 0, 0]);
    { const [p, q] = onSphere(0, -0.045, 0.235, -0.01); r.push(p, q).fx(0, 0.7).add(G.cone(12), '#ff9a2e', [0, 0, 0.03], [PI / 2, 0, 0], [0.035, 0.07, 0.025]).fx(0, 0).pop(); }
    r.pop();
    for (const sd of [-1, 1]) r.on(sd > 0 ? 'finL' : 'finR').fx(0, 0.6).add(G.sphere(14, 10), navy, [0.26 * sd, 0.36, 0], [0, 0, sd * 0.3], [0.04, 0.14, 0.08]);
    r.on('feet'); for (const sd of [-1, 1]) r.fx(0, 0.5).add(G.sphere(12, 8), '#ff9a2e', [0.09 * sd, 0.025, 0.12], [0, sd * 0.3, 0], [0.065, 0.025, 0.1]);
    r.fx(0, 0);
    r.on('body').mark('muzzle', [0, 0.45, 0.25]);
    return { height: 0.9, glowC: col('#9ad0ff'), mat: { rough: 0.15, rim: '#e0eaff', rimK: 0.4, rimP: 2.2 } };
  }
  function animPenguen(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 9), ph = s.walk;
    b.rotation.z = Math.sin(ph) * 0.16 * k + Math.sin(s.t * 1.5 + s.ph) * 0.03;   // paytak penguen yürüyüşü
    b.position.y += Math.abs(Math.sin(ph)) * 0.025 * k;
    B.feet.rotation.z = Math.sin(ph) * 0.15 * k;
    B.finL.rotation.z = 0.2 + 0.25 * Math.abs(Math.sin(ph)) * k; B.finR.rotation.z = -0.2 - 0.25 * Math.abs(Math.sin(ph)) * k;
    { const u = gag(s, st, dt, 2.2, 5);   // bekleme: kanatlarını çırpıp uçmaya çalışır, olmaz, utanır
      if (u >= 0) { const f = bumpU(u, 0, 0.7); B.finL.rotation.z += (1.0 + Math.sin(s.t * 30) * 0.6) * f; B.finR.rotation.z -= (1.0 + Math.sin(s.t * 30) * 0.6) * f; b.position.y += 0.06 * f * Math.abs(Math.sin(s.t * 15)); s.eyeK = 1 + 0.3 * f - 0.8 * bumpU(u, 0.72, 1); } }
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); b.rotation.x = -0.25 * w; b.scale.y *= 1 - 0.1 * w; B.finL.rotation.z = 1.4 * w; B.finR.rotation.z = -1.4 * w; b.position.x += Math.sin(s.t * 55) * 0.01 * st.windup; }
    if (st.attack >= 0 && st.attack < 1) {   // karnının üstüne yatıp kızak gibi kayar
      b.rotation.x = 1.3; b.position.y += 0.18; b.position.z += 0.25; B.finL.rotation.z = 1.4; B.finR.rotation.z = -1.4; B.feet.position.y += 0.15; B.feet.rotation.x = -1.2;
    } else if (st.attack >= 1) b.rotation.y = Math.sin(s.t * 8) * 0.3;
    boing(s, st, dt, b);
  }

  // ── Bezelyeler: üç minik yeşil bezelye takımı; birlikte yuvarlanır, beklerken dağılıp yeniden toplanır ──
  const PEA = [[-0.17, 0.15, 0.04], [0.17, 0.15, 0.04], [0, 0.38, -0.02]];
  function buildBezelye(r, o) {
    const g = (y0) => K.vgrad(y0 - 0.15, y0 + 0.15, [[0, '#3a9a36'], [0.5, '#6ad04a'], [1, '#a8ec7a']]);
    r.bone('grp', 'root', [0, 0.25, 0]);
    for (let i = 0; i < 3; i++) r.bone('p' + i, 'grp', PEA[i]);
    for (let i = 0; i < 3; i++) {
      const [x, y, z] = PEA[i];
      r.on('p' + i).fx(0, 0.8).add(G.sphere(26, 18), g(y), [x, y, z], null, 0.16);
      r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.3), [x - 0.06, y + 0.08, z + 0.12], [0, 0, 0.5], [0.02, 0.04, 0.008]);
      r.fx(0, 0.5).seg([x, y + 0.15, z], [x + 0.03, y + 0.21, z - 0.01], 0.012, '#4ab040', 0.008, 5);   // filiz
      r.add(G.sphere(8, 6), '#6ad04a', [x + 0.055, y + 0.225, z - 0.01], [0, 0, -0.6], [0.035, 0.016, 0.025]);
      r.fx(0, 0);
      if (i === 2) K.face(r, [x, y, z], 0.16, yuz({ bone: 'p2', tilt: 0.25, ex: 0.058, ey: 0.02, er: 0.055, iris: '#1a3a0a', skin: col('#6ad04a'), browCol: '#1a4a10', browY: 1.36, mouthY: -0.07, mouthW: 0.055, heartY: 1.4, heartX: 1.5, heartS: 0.35 }));
      else { r.on('p' + i); miniFace(r, [x, y, z], 0.16, 0.042); }
    }
    r.on('p2').mark('muzzle', [0, 0.38, 0.18]);
    return { height: 0.75, glowC: col('#a8ff7a'), mat: { rough: 0.3, sss: col('#7ad05a').multiplyScalar(0.06), rim: '#f0ffd0', rimK: 0.35, rimP: 2.2 } };
  }
  function animBezelye(m, dt, st, s) {
    const B = m.B;
    const hop = (i) => Math.abs(Math.sin(s.t * 7 + i * 1.3 + s.ph)) * s.mv;
    for (let i = 0; i < 3; i++) { B['p' + i].position.y += hop(i) * 0.06 + Math.sin(s.t * 2 + i) * 0.008; B['p' + i].rotation.z = Math.sin(s.t * 2.2 + i * 2) * 0.1; }
    { const u = gag(s, st, dt, 2.6, 4.5);   // bekleme: üçü dağılır (fırıl fırıl), sonra "hop" diye yine üst üste toplanır
      if (u >= 0) { const sp = bumpU(u, 0, 1); const D = [[-1, 0.3], [1, 0.4], [0.2, -1]];
        for (let i = 0; i < 3; i++) { const P = B['p' + i]; P.position.x += D[i][0] * 0.3 * sp; P.position.z += D[i][1] * 0.3 * sp; P.position.y += (i === 2 ? -0.22 : 0) * sp + 0.1 * Math.abs(Math.sin(u * PI * 4)) * sp; P.rotation.y += TAU * u * (i - 1); } } }
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); for (let i = 0; i < 3; i++) B['p' + i].scale.setScalar(1 - 0.1 * w + 0.05 * Math.sin(s.t * 40 + i)); B.grp.rotation.x = -0.2 * w; }
    if (st.attack >= 0) {
      if (st.attack < 1 && s.mv > 0.5) { s.roll = (s.roll || 0) + dt * 16; for (let i = 0; i < 3; i++) B['p' + i].rotation.x = s.roll + i; B.p2.position.y -= 0.12; B.p2.position.z += 0.1; }
      else { s.roll = 0; for (let i = 0; i < 3; i++) B['p' + i].rotation.y = Math.sin(s.t * 8 + i) * 0.5; }
    } else s.roll = 0;
    boing(s, st, dt, B.grp);
  }

  // ── Kurabiye Adam: zencefilli kurabiye; kaçıp yere (kurabiye kırıntısı yığınına) saklanır, Feza'nın yanında "cee!" diye çıkar ──
  function buildKurabiye(r, o) {
    const ck = K.vgrad(0.05, 1.0, [[0, '#a8622a'], [0.5, '#c8803e'], [1, '#d89a52']]), ice = '#ffffff';
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('head', 'body', [0, 0.62, 0]);
    r.bone('armL', 'body', [0.15, 0.55, 0]); r.bone('armR', 'body', [-0.15, 0.55, 0]);
    r.bone('legL', 'body', [0.08, 0.28, 0]); r.bone('legR', 'body', [-0.08, 0.28, 0]);
    r.bone('mound', 'root', [0, 0, 0]);
    r.on('body').fx(0, 0.2, 1).uv(2, 2);
    r.add(G.sphere(24, 16), ck, [0, 0.45, 0], null, [0.17, 0.2, 0.08]);
    r.uv(null).fx(0.2, 0.6);
    for (const [y, c] of [[0.52, '#ff4a6a'], [0.42, '#3fd27a']]) r.add(G.sphere(10, 8), c, [0, y, 0.075], null, [0.025, 0.025, 0.015]);   // şeker düğmeler
    r.fx(0, 0);
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.2, 1).add(G.capsule(1, 10), ck, [0.24 * sd, 0.5, 0], [0, 0, sd * 1.1], [0.055, 0.05, 0.05]);
      r.fx(0.2, 0.4).add(G.torus(PI, 0.25, 12), ice, [0.31 * sd, 0.47, 0.035], [0, 0, sd * 1.1], [0.04, 0.025, 0.02]).fx(0, 0);
      r.on(sd > 0 ? 'legL' : 'legR').fx(0, 0.2, 1).add(G.capsule(1, 10), ck, [0.09 * sd, 0.15, 0], [0, 0, sd * 0.2], [0.065, 0.06, 0.06]);
      r.fx(0.2, 0.4).add(G.torus(PI, 0.25, 12), ice, [0.105 * sd, 0.07, 0.04], [0, 0, PI], [0.045, 0.025, 0.02]).fx(0, 0);
    }
    r.on('head').fx(0, 0.2, 1).uv(2, 2).add(G.sphere(28, 20), ck, [0, 0.78, 0], null, [0.18, 0.17, 0.085]);
    r.uv(null).fx(0, 0);
    K.face(r, [0, 0.78, -0.22], 0.305, yuz({ bone: 'head', tilt: 0.0, ex: 0.065, ey: 0.03, er: 0.058, inset: 0.008, iris: '#2a1206', skin: col('#c8803e'), browCol: '#ffffff', browY: 1.3,
      mouthY: -0.07, mouthW: 0.065, noHearts: true }));
    hearts(r, [[0.24, 0.98, 0.08, 0.07], [-0.22, 1.02, 0.08, 0.06]]);
    // saklanma yığını: kurabiye kırıntıları (yalnız saklanırken görünür)
    r.on('mound').fx(0, 0.2);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr = 0.12 + 0.12 * hash(i, 4, 2); r.add(G.dodeca(), i & 1 ? '#c8803e' : '#a8622a', [Math.sin(a) * rr, 0.05, Math.cos(a) * rr], [a, a * 2, 0], 0.06 + 0.03 * hash(i, 1, 1)); }
    r.add(G.sphere(16, 8), '#b8743a', [0, 0.03, 0], null, [0.28, 0.08, 0.28]);
    r.fx(0, 0);
    r.on('head').mark('muzzle', [0, 0.75, 0.15]);
    return { height: 0.98, glowC: col('#ffc080'), hide: ['mound'], tex: fabTex(3), mat: { rough: 0.75, rim: '#fff0d8', rimK: 0.32, rimP: 2.4 } };
  }
  function animKurabiye(m, dt, st, s) {
    const B = m.B, b = B.body, k = walkPh(s, dt, 12), ph = s.walk;
    B.legL.rotation.x = Math.sin(ph) * 0.9 * k; B.legR.rotation.x = -Math.sin(ph) * 0.9 * k;
    B.armL.rotation.x = -Math.sin(ph) * 0.9 * k; B.armR.rotation.x = Math.sin(ph) * 0.9 * k;
    b.position.y += Math.abs(Math.cos(ph)) * 0.05 * k; b.rotation.x = 0.15 * k; B.head.rotation.z = Math.sin(s.t * 2 + s.ph) * 0.08;
    // kaçarken arada geriye bakıp kıkırdar
    B.head.rotation.y = Math.max(0, Math.sin(s.t * 1.3 + s.ph) - 0.6) * 2.5 * k;
    { const u = gag(s, st, dt, 2.4, 5);   // bekleme: elleriyle gözlerini kapatır… "cee!" diye açar, kollar havaya
      if (u >= 0) { const hide = sm(u / 0.15) * (1 - sm((u - 0.6) / 0.08)), cee = bumpU(u, 0.62, 1);
        B.armL.rotation.z += 1.6 * hide + 2.0 * cee; B.armR.rotation.z -= 1.6 * hide + 2.0 * cee; B.armL.rotation.x -= 0.6 * hide; B.armR.rotation.x -= 0.6 * hide; b.position.y += 0.08 * cee; s.eyeK = 1 + 0.35 * cee; } }
    if (st.windup >= 0) { const w = sm(st.windup * 1.4); b.scale.y *= 1 - 0.12 * w; B.armL.rotation.z = 1.5 * w; B.armR.rotation.z = -1.5 * w; }
    if (st.attack >= 0 && st.attack < 1) { const kk = Math.sin(PI * st.attack); b.position.y += 0.1 * kk; B.armL.rotation.z = 2.2 * kk; B.armR.rotation.z = -2.2 * kk; }
    const bu = st.burrow || 0;   // saklanma: kırıntı yığınına gömülür
    if (bu > 0.01) { b.position.y -= bu * 1.1; b.rotation.z += Math.sin(s.t * 30) * 0.05 * bu; B.mound.scale.setScalar(Math.min(1, bu * 1.5)); B.mound.position.y += Math.sin(s.t * 12) * 0.01; }
    else B.mound.scale.setScalar(0.0001);
    boing(s, st, dt, b);
  }

  // ── Marshmallow: yumuşacık pembe-beyaz marshmallow; zıplayıp yere "pof" diye iner, etrafa zıplatan dalga yayılır ──
  const MAR_P = [[0, 0], [0.22, 0], [0.27, 0.025], [0.295, 0.09], [0.3, 0.3], [0.295, 0.48], [0.27, 0.545], [0.22, 0.57], [0, 0.575]];
  function buildMarsh(r, o) {
    const E = o.elite, top = col(E ? '#ffc0dc' : '#ffffff'), side = col(E ? '#ff8ab8' : '#ffd0e2'), out = new THREE.Color();
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('armL', 'body', [0.29, 0.3, 0.02]); r.bone('armR', 'body', [-0.29, 0.3, 0.02]);
    r.on('body').fx(0, 0.25, 0, (x, y) => sm(y / 0.5));
    r.add(K.lathe('hzMarsh', MAR_P, 40), (x, y, z) => out.copy(side).lerp(top, sm((y - 0.4) / 0.15) * 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(y * 30))), [0, 0, 0]);
    r.fx(0, 0.2).add(G.sphere(20, 8), K.vgrad(0.55, 0.6, [[0, '#f0c890'], [1, '#e0a060']]), [0, 0.565, 0], null, [0.2, 0.025, 0.2]);   // hafif kızarmış tepe
    r.fx(0.3, 0.4, 0, 1); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; r.add(G.sphere(6, 4), '#ffffff', [Math.sin(a) * 0.12, 0.585, Math.cos(a) * 0.12], null, [0.015, 0.006, 0.015]); }   // pudra şekeri
    r.fx(0, 0);
    K.face(r, [0, 0.3, 0], 0.31, yuz({ bone: 'body', tilt: 0.15, ex: 0.1, ey: 0.02, er: 0.092, iris: '#24102c', skin: side, browCol: '#a04a70', browY: 1.33,
      mouthY: -0.1, mouthW: 0.085, heartY: 1.15, heartX: 1.2, blushCol: '#ff6fa0' }));
    for (const sd of [-1, 1]) r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.25).add(G.sphere(12, 10), side, [0.32 * sd, 0.28, 0.03], [0, 0, sd * 0.5], [0.05, 0.08, 0.05]);
    if (E) K.crown(r.on('body'), [0, 0.6, 0], 0.55);
    r.on('body').mark('muzzle', [0, 0.3, 0.32]);
    return { height: 0.62, glowC: col('#ffb0d0'), mat: { rough: 0.85, sss: col('#ffe0ee').multiplyScalar(0.06), rim: '#ffffff', rimK: 0.3, rimP: 2.4, wob: 0.012, wobF: 3, wobS: 5 } };
  }
  function animMarsh(m, dt, st, s) {
    const B = m.B, b = B.body;
    const g = hopGait(s, st, dt, 2.0, 0.12);
    let sy = g.sy * (1 + 0.04 * breath(s, 2.5)), sxz = g.sxz, y = g.y;
    B.armL.rotation.z = 0.2 + 0.5 * g.air; B.armR.rotation.z = -0.2 - 0.5 * g.air;
    { const u = gag(s, st, dt, 2.0, 5);   // bekleme: kendini sıkıp yayvanlaşır, "boing" diye fırlar, havada takla
      if (u >= 0) { const sq = bumpU(u, 0, 0.35), fl = bumpU(u, 0.3, 0.85); sy *= 1 - 0.35 * sq; sxz *= 1 + 0.2 * sq; y += 0.35 * fl; b.rotation.x = TAU * sm((u - 0.35) / 0.45); s.eyeK = 1 - 0.8 * sq; } }
    if (st.windup >= 0) {   // ezilip hazırlanır, sonunda havaya zıplar
      const w = st.windup; sy *= 1 - 0.3 * bumpU(w, 0, 0.75); sxz *= 1 + 0.18 * bumpU(w, 0, 0.75);
      y += 0.4 * sm((w - 0.65) / 0.35); B.armL.rotation.z = 0.2 + 2.0 * sm(w); B.armR.rotation.z = -0.2 - 2.0 * sm(w);
    }
    if (st.attack >= 0 && st.attack < 1) {   // "pof!" iner ve yayvanlaşır
      const a = st.attack, land = sm(a / 0.12); y += 0.4 * (1 - land); const sq = land * (1 - sm((a - 0.15) / 0.5));
      sy *= 1 - 0.4 * sq; sxz *= 1 + 0.3 * sq; B.armL.rotation.z = 1.5 * (1 - sq); B.armR.rotation.z = -1.5 * (1 - sq);
    }
    b.position.y += y; b.scale.set(sxz, sy, sxz);
    boing(s, st, dt, b, 1.4);
  }

  // ════════════════ Kayıt ════════════════
  // Denge (5 yaş): eski tabanların yumuşatılmış değerleri; GAME bölgeye göre çarpar.
  const RARE_STATS = { hp: 14, dmg: 2, speed: 3.0, xp: 30, gold: 12, aggro: 7 };
  const T = [
    // id, ad, base, saldiri, stats, kurucu, anim, lod, ek
    ['tozTavsani', 'Toz Tavşanı', 'yogurt', 'ziplayan', { eliteAd: 'Kocaman Toz Tavşanı', hp: 20, dmg: 4, speed: 2.6, r: 0.45, height: 0.8, atkRange: 2.4, atkCd: 2.0, windup: 0.75, aggro: 8.5 }, buildToz, animToz, 0.55],
    ['kumanda', 'Haylaz Kumanda', 'mantar', 'uzak', { eliteAd: 'Kocaman Kumanda', hp: 22, dmg: 4, speed: 1.9, r: 0.45, height: 1.0, atkRange: 6.5, range: 6.5, atkCd: 2.7, windup: 0.9, aggro: 9, shot: { kind: 'ghost', speed: 3.8, r: 0.28, col: '#ff6a7a' } }, buildKumanda, animKumanda, 0.6],
    ['corap', 'Tek Çorap', 'goblin', 'yakin', { eliteAd: 'Kocaman Çorap', hp: 24, dmg: 4, speed: 2.3, r: 0.45, height: 0.85, atkRange: 1.0, atkCd: 1.9, windup: 0.8, aggro: 8.5 }, buildCorap, animCorap, 0.6],
    ['kasik', 'Haylaz Kaşık', 'goblin', 'yakin', { eliteAd: 'Kocaman Kaşık', hp: 30, dmg: 5, speed: 2.7, r: 0.45, height: 1.2, atkRange: 1.1, atkCd: 1.8, windup: 0.75, aggro: 9 }, buildKasik, animKasik, 0.6],
    ['kopukBalonu', 'Köpük Balonu', 'kopuk', 'uzak', { eliteAd: 'Kocaman Köpük', hp: 18, dmg: 4, speed: 2.1, r: 0.45, height: 0.9, atkRange: 6.5, range: 6.5, atkCd: 2.8, windup: 0.85, fly: true, hover: 0.7, aggro: 9 }, buildKopuk, animKopuk, 0.5],
    ['unTorbasi', 'Un Torbacığı', 'goblin', 'yuvarlanan', { eliteAd: 'Kocaman Un Torbası', hp: 26, dmg: 5, speed: 2.4, r: 0.48, height: 0.8, atkRange: 2.4, atkCd: 2.2, windup: 0.8, aggro: 9, trailCol: '#fffaf0' }, buildUn, animUn, 0.55],
    ['buzKupu', 'Buz Küpü', 'cisdamlasi', 'kayan', { eliteAd: 'Kocaman Buz Küpü', hp: 24, dmg: 5, speed: 2.8, r: 0.45, height: 0.62, atkRange: 2.4, atkCd: 2.2, windup: 0.8, aggro: 9, trail: 'milk', trailCol: '#dff4ff' }, buildBuz, animBuz, 0.6],
    ['joleTatlisi', 'Jöle Ayıcık', 'yogurt', 'ziplayan', { eliteAd: 'Kocaman Jöle Ayıcık', hp: 22, dmg: 4, speed: 2.5, r: 0.45, height: 0.9, atkRange: 2.4, atkCd: 2.0, windup: 0.75, aggro: 9 }, buildJole, animJoleT, 0.55, ['kirmizi', 'yesil', 'turuncu']],
    ['sutDamlasi', 'Süt Damlası', 'mantar', 'uzak', { eliteAd: 'Kocaman Süt Damlası', hp: 18, dmg: 4, speed: 2.0, r: 0.42, height: 0.8, atkRange: 6.5, range: 6.5, atkCd: 2.7, windup: 0.85, aggro: 9, trail: 'milk', shot: { kind: 'bubble', speed: 3.6, r: 0.28, col: '#f4fbff' } }, buildSut, animSut, 0.6],
    ['sekerleme', 'Şekerleme Askeri', 'goblin', 'yakin', { eliteAd: 'Kocaman Şekerleme', hp: 30, dmg: 5, speed: 2.6, r: 0.45, height: 1.0, atkRange: 1.15, atkCd: 1.9, windup: 0.75, aggro: 9 }, buildSeker, animSeker, 0.55],
    ['cilekcik', 'Çilekçik', 'goblin', 'yuvarlanan', { eliteAd: 'Kocaman Çilek', hp: 24, dmg: 5, speed: 2.6, r: 0.45, height: 0.78, atkRange: 2.4, atkCd: 2.1, windup: 0.75, aggro: 9, trailCol: '#ffc0d0' }, buildCilek, animCilek, 0.6],
    ['kremaTopu', 'Krema Topu', 'mantar', 'uzak', { eliteAd: 'Kocaman Krema Topu', hp: 24, dmg: 5, speed: 1.8, r: 0.48, height: 0.95, atkRange: 6.5, range: 6.5, atkCd: 2.8, windup: 0.9, aggro: 9, shot: { kind: 'jelly', speed: 3.4, r: 0.3, col: '#ffd0e4' } }, buildKrema, animKrema, 0.55],
    // nadir (gizli) huysuzlar: neşelenince "gizli" çıkartma + altın şeker
    // 3. tur: her odaya 2 yeni tip (farklı davranışlar)
    ['kalemcik', 'Boya Kalemi', 'cisdamlasi', 'kayan', { eliteAd: 'Kocaman Boya Kalemi', hp: 20, dmg: 4, speed: 3.2, r: 0.42, height: 1.05, atkRange: 2.4, atkCd: 2.0, windup: 0.75, aggro: 9, trail: 'milk', trailCol: '#ff5a6a' }, buildKalem, animKalem, 0.6],
    ['yastikcik', 'Yastıkçık', 'yogurt', 'ziplayan', { eliteAd: 'Kocaman Yastık', hp: 22, dmg: 4, speed: 2.3, r: 0.48, height: 0.8, atkRange: 2.4, atkCd: 2.2, windup: 0.8, aggro: 8.5 }, buildYastik, animYastik, 0.55],
    ['minikYastik', 'Minik Yastık', 'yogurt', 'ziplayan', { hp: 8, dmg: 2, speed: 2.8, r: 0.32, height: 0.5, atkRange: 2.0, atkCd: 2.4, windup: 0.8, aggro: 10, xp: 4, gold: 1 }, (r, o) => buildYastik(r, Object.assign({}, o, { mini: true })), animYastik, 0.5, null, false, { boyut: 0.62 }],
    ['catalcik', 'Çatalcık', 'goblin', 'yakin', { eliteAd: 'Kocaman Çatal', hp: 22, dmg: 4, speed: 3.1, r: 0.4, height: 1.05, atkRange: 1.2, atkCd: 1.7, windup: 0.7, aggro: 9 }, buildCatal, animCatal, 0.6],
    ['cayBardagi', 'Çay Bardağı', 'mantar', 'uzak', { eliteAd: 'Kocaman Çay Bardağı', hp: 20, dmg: 4, speed: 1.8, r: 0.42, height: 1.0, atkRange: 6.5, range: 6.5, atkCd: 2.8, windup: 0.9, aggro: 9, shot: { kind: 'bubble', speed: 3.4, r: 0.28, col: '#fff4ec' } }, buildCay, animCay, 0.6],
    ['penguenSise', 'Penguen Şişe', 'cisdamlasi', 'kayan', { eliteAd: 'Kocaman Penguen Şişe', hp: 24, dmg: 5, speed: 2.5, r: 0.45, height: 0.9, atkRange: 2.6, atkCd: 2.2, windup: 0.8, aggro: 9, trail: 'milk', trailCol: '#eef6ff' }, buildPenguen, animPenguen, 0.6],
    ['bezelyeler', 'Bezelye Takımı', 'goblin', 'yuvarlanan', { eliteAd: 'Kocaman Bezelyeler', hp: 24, dmg: 4, speed: 2.5, r: 0.48, height: 0.75, atkRange: 2.4, atkCd: 2.2, windup: 0.8, aggro: 9, trailCol: '#a8ec7a' }, buildBezelye, animBezelye, 0.55],
    ['kurabiyeAdam', 'Kurabiye Adam', 'kostebek', 'kazici', { eliteAd: 'Kocaman Kurabiye Adam', hp: 24, dmg: 4, speed: 3.0, r: 0.42, height: 0.98, atkRange: 1.1, atkCd: 1.9, windup: 0.8, aggro: 9 }, buildKurabiye, animKurabiye, 0.6],
    ['marshmallow', 'Marshmallow', 'peynir', 'agir', { eliteAd: 'Kocaman Marshmallow', hp: 34, dmg: 5, speed: 1.9, r: 0.5, height: 0.65, atkRange: 1.7, atkCd: 2.8, windup: 1.0, slamR: 1.8, aggro: 9 }, buildMarsh, animMarsh, 0.55],
    ['gokkusagiCorap', 'Gökkuşağı Çorap', 'goblin', 'yakin', Object.assign({ r: 0.45, height: 0.85, atkRange: 1.0, atkCd: 2.2, windup: 0.9 }, RARE_STATS), (r, o) => buildCorap(r, Object.assign({}, o, { rare: true })), animCorap, 0.6, null, true],
    ['altinKasik', 'Altın Kaşık', 'goblin', 'yakin', Object.assign({ r: 0.45, height: 1.2, atkRange: 1.1, atkCd: 2.2, windup: 0.9 }, RARE_STATS), (r, o) => buildKasik(r, Object.assign({}, o, { rare: true })), animKasik, 0.6, null, true],
    ['gokkusagiJole', 'Gökkuşağı Jöle', 'yogurt', 'ziplayan', Object.assign({ r: 0.45, height: 0.9, atkRange: 2.4, atkCd: 2.4, windup: 0.9 }, RARE_STATS), (r, o) => buildJole(r, Object.assign({}, o, { rare: true })), animJoleT, 0.55, null, true],
    ['altinCilek', 'Altın Çilek', 'goblin', 'yuvarlanan', Object.assign({ r: 0.45, height: 0.78, atkRange: 2.4, atkCd: 2.4, windup: 0.9 }, RARE_STATS), (r, o) => buildCilek(r, Object.assign({}, o, { rare: true })), animCilek, 0.6, null, true],
  ];
  const RARE = {};
  for (const [id, ad, base, saldiri, stats, mk, an, lod, variants, rare, ek] of T) {
    const def = Object.assign({ ad, base, saldiri, stats, ilkSoz: 'ilk_' + id }, ek || {});
    if (HAS) {
      EMODEL.addType(id, mk, an, lod, variants || undefined);
      def.model = o => EMODEL.buildRaw(id, o || {});
    }
    if (rare) RARE[id] = true;
    HUYSUZ.type(id, def);
  }
  // Oda listeleri: 3 huysuz + 1 elit + 1 nadir (düşük ağırlık: oda başına arada bir çıkar)
  HUYSUZ.zone('oturma', { enemies: { tozTavsani: 4, kumanda: 3, corap: 3, kalemcik: 2.5, yastikcik: 2.5, gokkusagiCorap: 0.3, minikYastik: 0.01 }, elites: ['tozTavsani'] });
  HUYSUZ.zone('mutfak', { enemies: { kasik: 4, kopukBalonu: 3, unTorbasi: 3, catalcik: 2.5, cayBardagi: 2.5, altinKasik: 0.3 }, elites: ['kasik'] });
  HUYSUZ.zone('buzdolabi', { enemies: { buzKupu: 4, joleTatlisi: 3, sutDamlasi: 3, penguenSise: 2.5, bezelyeler: 2.5, gokkusagiJole: 0.3 }, elites: ['joleTatlisi'], variants: { joleTatlisi: ['kirmizi', 'yesil', 'turuncu'] } });
  HUYSUZ.zone('pasta', { enemies: { sekerleme: 3, cilekcik: 4, kremaTopu: 3, kurabiyeAdam: 2.5, marshmallow: 2.5, altinCilek: 0.3 }, elites: ['kremaTopu'] });

  // Nadir huysuz neşelenince: çıkartma "gizli" sayılır, altın şeker + şeker yağmuru + Hala'nın sevinci
  let saidRare = 0, confT = [];
  function hook() {
    if (typeof GAME === 'undefined' || !GAME || !GAME.on) { setTimeout(hook, 250); return; }
    GAME.on('happy', e => {
      if (!e || !HUYSUZ.get(e.type) || e.boss) return;
      // elit ya da nadir huysuz neşelenince konfeti serpintisi (normallerde GAME'in kalp + parıltısı yeter; iPad performansı).
      // Aynı anda en çok 4 konfeti patlaması (hepsi bir anda neşelenince birikmesin).
      const now = performance.now(); confT = confT.filter(t => now - t < 1200);
      if ((e.elite || RARE[e.type]) && confT.length < 4 && typeof FX !== 'undefined' && FX && FX.burst) { confT.push(now); try { FX.burst('confetti', e.x, 0.9, e.z, { scale: e.elite ? 1.1 : 0.7 }); } catch (err) { /* yok say */ } }
      // Yastıkçık neşelenince "pıt" diye ikiye bölünür: iki minik yastık (onlar bölünmez)
      if (e.type === 'yastikcik' && GAME.spawnEnemy) {
        setTimeout(() => { try { for (const sd of [-1, 1]) GAME.spawnEnemy('minikYastik', e.x + sd * 0.55, e.z + 0.1, {}); if (FX && FX.burst) FX.burst('confetti', e.x, 0.6, e.z, { scale: 0.8 }); } catch (err) { console.warn('[huysuzlar] yastık', err); } }, 450);
      }
      // Çay bardağı neşelenince şıngırdar
      if (e.type === 'cayBardagi' && typeof AUD !== 'undefined' && AUD && AUD.sfx) { try { AUD.sfx('bell', { x: e.x, z: e.z, vol: 0.6, pitch: 1.6 }); setTimeout(() => AUD.sfx('bell', { x: e.x, z: e.z, vol: 0.5, pitch: 1.9 }), 140); } catch (err) { /* yok say */ } }
      if (!RARE[e.type]) return;
      try {
        const P = GAME.P;
        if (P && P.cikartmalar && P.cikartmalar[e.type]) P.cikartmalar[e.type].tur = 'gizli';
        if (GAME.addGoldSugar) GAME.addGoldSugar(1);
        if (typeof FX !== 'undefined' && FX) {
          if (FX.burst) { FX.burst('confetti', e.x, 1.0, e.z, { scale: 1.4 }); FX.burst('sparkle', e.x, 1.2, e.z, { color: '#ffd84a', count: 20 }); }
          if (FX.floatText) FX.floatText(e.x, 1.9, e.z, '+1 altın şeker', 'word');
        }
        if (typeof AUD !== 'undefined' && AUD && AUD.say) AUD.say(saidRare++ % 2 ? 'nadir_yakalandi2' : 'nadir_yakalandi', { prio: 2 });
      } catch (err) { console.warn('[huysuzlar] nadir', err); }
    });
  }
  hook();
})();
