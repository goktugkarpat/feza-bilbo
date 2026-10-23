/* ── Aytuğ Hala: model + canlı animasyon + yapay zekâ yardımcı ──
   Genel ad: HALA (kancalar: src/SPEC.md › "Dev Ev API" › HALA).
   Model: Feza ile aynı teknik — tek iskelet (16 kemik) + üç SkinnedMesh (ten, polar ceket, tayt+terlik); yüz (göz, kirpik,
   kaş, ağız, allık) ten gölgelendiricisinde baş koordinatından çizilir (her yakınlıkta keskin, ek çizim yok). Saç başa bağlı
   ayrı ağlar: omuza dökülen gür, sıkı kıvırcık bukleli saç (bukle tümsekli başlık + yaylı burgu bukleler, ikincil hareket),
   siyah desenli bandana (arkada düğüm) ve başın tepesinde güneş gözlüğü.
   Polar ceket: koddan üretilen tüylü kumaş dokusu (renk + normal), fermuar, dik yaka, manşet ve etek ribanaları, kalp arması.
   Davranış: Feza'yı yanında ve hafif arkasında takip, Pasta Topu, sarılma (can), kaldırma, Polar Kalkan, yol gösterme,
   alkış/övgü, Takım Hamlesi (el ele zıplama), dans, havaya atıp tutma (HALA.boost). Hala hasar almaz. */
'use strict';
const HALA = (() => {
  // ── yardımcılar ──
  const sq = x => x * x;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeIO = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const bump = (t, a, b, c, d) => sstep(a, b, t) * (1 - sstep(c, d, t));   // 0 → 1 (a..b) … 1 → 0 (c..d)
  const keep = o => { o.userData.keep = true; return o; };
  const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const V2 = (x, y = x) => new THREE.Vector2(x, y);
  const pick = a => a[(Math.random() * a.length) | 0];
  function stencil(m) {   // Feza'nın x-ışını silueti Hala'nın üstüne çizilmesin
    m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc;
    m.stencilZPass = THREE.ReplaceStencilOp; m.stencilFail = THREE.KeepStencilOp; m.stencilZFail = THREE.KeepStencilOp;
    return m;
  }

  // ── geometri yapıcılar (04_feza.js ile aynı yöntem) ──
  function paramGeo(fn, nu, nv, ctr, wrapU) {
    const n1 = nu + 1, nV = n1 * (nv + 1);
    const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
    const p = v3(), a = v3(), b = v3(), c = v3(), d = v3(), n = v3(), e = 1e-3;
    for (let j = 0, k = 0; j <= nv; j++) for (let i = 0; i <= nu; i++, k++) {
      const u = i / nu, v = j / nv;
      fn(u, v, p);
      fn(wrapU ? u + e : Math.min(1, u + e), v, a); fn(wrapU ? u - e : Math.max(0, u - e), v, b); a.sub(b);
      fn(u, Math.min(1, v + e), c); fn(u, Math.max(0, v - e), d); c.sub(d);
      n.crossVectors(a, c);
      if (n.lengthSq() < 1e-14) n.copy(p).sub(ctr);
      n.normalize();
      if (n.dot(d.copy(p).sub(ctr)) < 0) n.negate();
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
      nor[k * 3] = n.x; nor[k * 3 + 1] = n.y; nor[k * 3 + 2] = n.z;
      uv[k * 2] = u; uv[k * 2 + 1] = v;
    }
    const idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const q = j * n1 + i; idx.push(q, q + 1, q + n1 + 1, q, q + n1 + 1, q + n1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    fixWinding(g);
    return g;
  }
  function fixWinding(g) {
    const I = g.index.array, P = g.attributes.position, N = g.attributes.normal, a = v3(), b = v3(), c = v3(), n = v3();
    let s = 0;
    for (let t = 0; t < I.length; t += 3 * Math.max(1, (I.length / 3 / 60) | 0)) {
      a.fromBufferAttribute(P, I[t]); b.fromBufferAttribute(P, I[t + 1]).sub(a); c.fromBufferAttribute(P, I[t + 2]).sub(a);
      n.crossVectors(b, c); if (n.lengthSq() < 1e-16) continue;
      a.fromBufferAttribute(N, I[t]); s += n.dot(a) > 0 ? 1 : -1;
    }
    if (s < 0) for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; }
  }
  function lathe(prof, seg, cx, cz, sx, sz, tile) {
    const pts = prof.map(p => V2(p[0], p[1]));
    const g = new THREE.LatheGeometry(pts, seg, Math.PI, TAU);
    g.applyMatrix4(new THREE.Matrix4().makeScale(sx, 1, sz));
    g.translate(cx, 0, cz);
    if (tile) {
      const uv = g.attributes.uv, n = pts.length, L = [0];
      let rMax = 0;
      for (let j = 0; j < n; j++) { rMax = Math.max(rMax, pts[j].x); if (j) L[j] = L[j - 1] + pts[j].distanceTo(pts[j - 1]); }
      const C = TAU * rMax * (sx + sz) / 2;
      for (let i = 0; i <= seg; i++) for (let j = 0; j < n; j++) uv.setXY(i * n + j, i / seg * C / tile, L[j] / tile);
    }
    return g;
  }
  // Eliptik kesiti P[i] noktaları boyunca süpür (U[i] yukarı yönler). wf/tf(t): yarı genişlik/kalınlık.
  function sweep(P, U, wf, tf, M, flat, colf, flexf) {
    const N = P.length - 1, nv = (N + 1) * (M + 1);
    const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), fl = new Float32Array(nv);
    const T = v3(), Nn = v3(), B = v3(), q = v3(), c = new THREE.Color();
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      T.subVectors(P[Math.min(N, i + 1)], P[Math.max(0, i - 1)]).normalize();
      Nn.copy(U[i]).addScaledVector(T, -U[i].dot(T)).normalize();
      B.crossVectors(T, Nn).normalize();
      const w = wf(t), th = tf(t), f = flexf ? flexf(t) : 0;
      colf(t, c);
      for (let k = 0; k <= M; k++) {
        const a = k / M * TAU, ca = Math.cos(a), sa = Math.sin(a), o = i * (M + 1) + k;
        q.copy(P[i]).addScaledVector(B, ca * w).addScaledVector(Nn, sa < 0 ? sa * th * flat : sa * th);
        pos[o * 3] = q.x; pos[o * 3 + 1] = q.y; pos[o * 3 + 2] = q.z;
        uv[o * 2] = k / M; uv[o * 2 + 1] = t * 4;
        col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b;
        fl[o] = f;
      }
    }
    const idx = [];
    for (let i = 0; i < N; i++) for (let k = 0; k < M; k++) { const a = i * (M + 1) + k, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aFlex', new THREE.BufferAttribute(fl, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    const k4 = Math.round(M / 4), mi = Math.floor(N / 2), mid = mi * (M + 1), nA = g.attributes.normal;
    T.subVectors(P[Math.min(N, mi + 1)], P[Math.max(0, mi - 1)]).normalize();
    Nn.copy(U[mi]).addScaledVector(T, -U[mi].dot(T)).normalize();
    if (q.fromBufferAttribute(nA, mid + k4).dot(Nn) < 0) {
      const I = g.index.array; for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; }
      g.computeVertexNormals();
    }
    return g;
  }
  const curvePts = (pts, N) => new THREE.CatmullRomCurve3(pts, false, 'centripetal').getPoints(N);
  // ortak öznitelik takımına getir (renk / aFlex yoksa ekle) ve birleştir
  function withAttrs(g, color, flex) {
    const n = g.attributes.position.count;
    if (!g.attributes.color) {
      const c = new Float32Array(n * 3), cc = new THREE.Color(), P = g.attributes.position;
      for (let i = 0; i < n; i++) { const k = typeof color === 'function' ? color(P.getX(i), P.getY(i), P.getZ(i), cc) : cc.set(color ?? 0xffffff); c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    if (!g.attributes.aFlex) {
      const f = new Float32Array(n), P = g.attributes.position;
      if (flex) for (let i = 0; i < n; i++) f[i] = typeof flex === 'function' ? flex(P.getX(i), P.getY(i), P.getZ(i)) : flex;
      g.setAttribute('aFlex', new THREE.BufferAttribute(f, 1));
    }
    if (!g.index) { const I = new Uint32Array(n); for (let i = 0; i < n; i++) I[i] = i; g.setIndex(new THREE.BufferAttribute(I, 1)); }
    return g;
  }
  function concat(geos) {
    const names = ['position', 'normal', 'uv', 'color', 'aFlex'];
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
    const out = new THREE.BufferGeometry(), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    for (const n of names) {
      const s = geos[0].attributes[n].itemSize, arr = new Float32Array(nv * s);
      let vo = 0;
      for (const g of geos) { const a = g.attributes[n]; for (let i = 0; i < a.count * s; i++) arr[vo * s + i] = a.array[i]; vo += g.attributes.position.count; }
      out.setAttribute(n, new THREE.BufferAttribute(arr, s));
    }
    let vo = 0, io = 0;
    for (const g of geos) { const I = g.index.array; for (let i = 0; i < I.length; i++) idx[io + i] = I[i] + vo; io += I.length; vo += g.attributes.position.count; }
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return keep(out);
  }
  // Kemik ağırlıklı birleştirme. part: {geo, bone} ya da {geo, w(x,y,z) → [kemik0, kemik1, ağırlık1]}, color hex|fn, flex fn
  function mergeSkinned(parts, withFace) {
    let nv = 0, ni = 0;
    for (const p of parts) { nv += p.geo.attributes.position.count; ni += p.geo.index ? p.geo.index.count : p.geo.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), fl = new Float32Array(nv);
    const si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), face = withFace ? new Float32Array(nv * 2).fill(-10) : null;
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    const cc = new THREE.Color();
    for (const p of parts) {
      const g = p.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, F = g.attributes.aFace, C = g.attributes.color;
      const cfn = typeof p.color === 'function' ? p.color : null, cfix = cfn ? null : new THREE.Color(p.color ?? 0xffffff);
      for (let i = 0; i < P.count; i++) {
        const o = vo + i, x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        pos[o * 3] = x; pos[o * 3 + 1] = RY(y); pos[o * 3 + 2] = z;
        const sy = RYs(y), nx = N.getX(i), ny = N.getY(i) / sy, nz = N.getZ(i), nl = Math.hypot(nx, ny, nz) || 1;
        nor[o * 3] = nx / nl; nor[o * 3 + 1] = ny / nl; nor[o * 3 + 2] = nz / nl;
        if (U) { uv[o * 2] = U.getX(i); uv[o * 2 + 1] = U.getY(i); }
        const c = cfn ? cfn(x, y, z, cc) : C ? cc.setRGB(C.getX(i), C.getY(i), C.getZ(i)).multiply(cfix) : cfix;
        col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b;
        fl[o] = p.flex ? p.flex(x, y, z) : 0;
        if (p.w) { const w = p.w(x, y, z); si[o * 4] = w[0]; si[o * 4 + 1] = w[1]; sw[o * 4] = 1 - w[2]; sw[o * 4 + 1] = w[2]; }
        else { si[o * 4] = p.bone; sw[o * 4] = 1; }
        if (face && F) { face[o * 2] = F.getX(i); face[o * 2 + 1] = F.getY(i); }
      }
      if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) idx[io + i] = I[i] + vo; io += I.length; }
      else { for (let i = 0; i < P.count; i++) idx[io + i] = vo + i; io += P.count; }
      vo += P.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setAttribute('aFlex', new THREE.BufferAttribute(fl, 1));
    out.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    if (face) out.setAttribute('aFace', new THREE.BufferAttribute(face, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return keep(out);
  }
  const kitGeo = f => { const k = new Kit(); f(k); return k.build(); };
  // Boy oranı: modeller "uzun" ölçülerle kurulur, sonra bacak ve gövde kısaltılır (daha sevimli, baş görece büyük).
  // Ağırlık/renk işlevleri hep ÖZGÜN y'yi görür; konumlar ve kemikler RY ile eşlenir.
  const RY = y => (y <= 0.08 ? y : y <= 0.98 ? 0.08 + (y - 0.08) * 0.9 : y <= 1.5 ? 0.89 + (y - 0.98) * 0.92 : 1.3684 + (y - 1.5));
  const RYs = y => (y <= 0.08 ? 1 : y <= 0.98 ? 0.9 : y <= 1.5 ? 0.92 : 1);
  const qAlign = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize());

  // ── Baş (baş kemiği uzayı; kemik boyun dibinde, bağlama pozunda dünya y = HB) ──
  const HB = 1.50, HC = v3(0, 0.215, 0.012);
  function headSurf(th, ph, o) {
    const cp = Math.cos(ph), dx = Math.sin(th) * cp, dy = Math.sin(ph), dz = Math.cos(th) * cp;
    let x = dx * 0.163, y = dy * lerp(0.172, 0.2, sstep(-0.3, 0.3, dy)), z = dz * lerp(0.19, 0.196, sstep(-0.3, 0.3, dz));
    const jaw = sstep(-0.1, 1.35, -ph);                                 // zarif, yumuşak U çene
    x *= 1 - 0.38 * jaw * jaw - 0.06 * jaw; z *= 1 - 0.12 * jaw * jaw;
    z *= 1 + 0.06 * sstep(0.1, -0.7, dz) * sstep(-0.4, 0.3, dy);        // yuvarlak kafa arkası
    const at = Math.abs(th), front = sstep(-0.1, 0.45, dz);
    let b = 0.011 * Math.exp(-sq((at - 0.5) / 0.28) - sq((ph + 0.2) / 0.2)) * front;     // elma yanaklar
    b += 0.005 * Math.exp(-sq((at - 0.75) / 0.25) - sq((ph + 0.02) / 0.12)) * front;    // elmacık kemiği
    b += 0.021 * Math.exp(-sq(th / 0.072) - sq((ph + 0.19) / 0.062));                  // burun ucu
    b += 0.009 * Math.exp(-sq(th / 0.048) - sq((ph + 0.07) / 0.1));                    // burun kemeri
    b += 0.006 * Math.exp(-sq((at - 0.075) / 0.035) - sq((ph + 0.215) / 0.035));        // burun kanatları
    b += 0.0045 * Math.exp(-sq(th / 0.13) - sq((ph + 0.43) / 0.05));                   // dudaklar
    b += 0.006 * Math.exp(-sq(th / 0.17) - sq((ph + 0.76) / 0.13));                    // çene ucu
    b -= 0.004 * Math.exp(-sq((at - 0.27) / 0.12) - sq((ph - 0.0) / 0.08)) * front;    // göz çukuru (hafif)
    o.set(HC.x + x + dx * b, HC.y + y + dy * b, HC.z + z + dz * b);
    return o;
  }
  const _ha = v3(), _hb = v3(), _hc = v3(), _hd = v3();
  function headNormal(th, ph, o) {
    const e = 1e-3;
    headSurf(th + e, ph, _ha); headSurf(th - e, ph, _hb); _ha.sub(_hb);
    headSurf(th, Math.min(ph + e, 1.5707), _hc); headSurf(th, Math.max(ph - e, -1.5707), _hd); _hc.sub(_hd);
    o.crossVectors(_ha, _hc);
    if (o.lengthSq() < 1e-12) { headSurf(th, ph, o); o.sub(HC); }
    return o.normalize();
  }
  const headTh = u => { const s = 2 * u - 1; return Math.PI * s * (0.36 + 0.64 * s * s); };   // yüzde sık, arkada seyrek
  const PH_CDF = (() => {
    const N = 256, d = ph => 1 + 1.6 * Math.exp(-sq((ph + 0.2) / 0.55)), c = [0];
    for (let i = 1; i <= N; i++) c.push(c[i - 1] + d(-Math.PI / 2 + (i - 0.5) / N * Math.PI));
    return c.map(x => x / c[N]);
  })();
  function headPh(v) {
    v = clamp(v, 0, 1);
    let lo = 0, hi = PH_CDF.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PH_CDF[m] <= v) lo = m; else hi = m; }
    const f = (v - PH_CDF[lo]) / Math.max(1e-9, PH_CDF[hi] - PH_CDF[lo]);
    return -Math.PI / 2 + (lo + f) / (PH_CDF.length - 1) * Math.PI;
  }
  function headGeo() {
    const NU = 72, NV = 48, ctr = v3(0, HB + HC.y, HC.z);
    const g = paramGeo((u, v, o) => { headSurf(headTh(u), headPh(v), o); o.y += HB; }, NU, NV, ctr, true);
    const f = new Float32Array((NU + 1) * (NV + 1) * 2);
    const col = new Float32Array((NU + 1) * (NV + 1) * 3);
    for (let j = 0, k = 0; j <= NV; j++) for (let i = 0; i <= NU; i++, k++) {
      const th = headTh(i / NU), ph = headPh(j / NV), at = Math.abs(th);
      f[k * 2] = th; f[k * 2 + 1] = ph;
      // yumuşak gölgeler: çene altı, kulak çevresi ve saç dibi biraz koyu/sıcak, burun ucu ve yanaklar hafif pembe
      let r = 1, gg = 1, b = 1;
      const under = sstep(-0.55, -1.15, ph) * (0.6 + 0.4 * sstep(0.4, 1.2, at)), side = Math.exp(-sq((at - 1.6) / 0.35) - sq((ph + 0.1) / 0.45));
      const k1 = 0.16 * under + 0.08 * side; r -= k1 * 0.7; gg -= k1 * 1.05; b -= k1 * 1.0;
      const nose = Math.exp(-sq(th / 0.07) - sq((ph + 0.2) / 0.06)); gg -= 0.05 * nose; b -= 0.04 * nose;
      col[k * 3] = r; col[k * 3 + 1] = gg; col[k * 3 + 2] = b;
    }
    g.setAttribute('aFace', new THREE.BufferAttribute(f, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }
  const EAR = { th: 1.6, ph: 0.0 };
  function earGeo(s) {
    const th = s * EAR.th, p = headSurf(th, EAR.ph, v3()), n = headNormal(th, EAR.ph, v3());
    const X = n.clone(), Y = v3(0, 1, 0).addScaledVector(X, -X.y).normalize().applyAxisAngle(X, -0.18 * s), Z = v3().crossVectors(X, Y);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const c = p.clone().addScaledVector(n, 0.003); c.y += HB;
    const o = c.clone().addScaledVector(X, 0.006), inner = new THREE.Color(0xe4a08a), outer = new THREE.Color(0xf3c6ae), tmp = new THREE.Color(), w = v3();
    const col = (x, y, z) => { w.set(x, y, z).sub(o); return tmp.copy(inner).lerp(outer, sstep(0.006, 0.017, Math.hypot(w.dot(Y), w.dot(Z) * 1.3))); };
    return kitGeo(k => {
      k.add(G.sphere(12, 8), col, [c.x, c.y, c.z], q, [0.006, 0.026, 0.016]);
      k.push([o.x, o.y, o.z], q).add(G.torus(TAU, 0.34, 18), 0xf3c6ae, [0, 0.002, 0], [0, Math.PI / 2, 0], [0.012, 0.019, 0.0135]).pop();
      k.add(G.sphere(10, 8), 0xf0bea6, [c.x + X.x * 0.003, c.y - 0.021, c.z + X.z * 0.003], q, [0.0065, 0.0095, 0.008]);   // kulak memesi
    });
  }

  // ── Saç (gerçek Aytuğ Hala'nın fotoğrafındaki gibi): omuza dökülen gür, sıkı kıvırcık bukleler, siyah desenli bandana,
  //    bandananın üstünde, başın tepesinde güneş gözlüğü ──
  // Hacim: başı saran tek bir "başlık" yüzeyi (azimut a: 0 ön, ±π arka — headSurf'ün th'si; yükselim φ, HC'den). Üstte kafa + kalınlık,
  // altta dikey dökülüp uca doğru kabaran perde. Yüzeye yüzlerce yuvarlak bukle tümseği (hafif sarmal oluklu) oyulur; tepeler açık
  // kestane, aralar koyu → kıvırcık doku ışıkta parlar. Alt kenarda ve yüzün iki yanında yaylı burgu bukleler (aFlex uca doğru artar:
  // yürürken/koşarken zıplar). Hepsi tek ağ = tek çizim; bandana (+ düğüm, uçlar) ve gözlük ayrı birer küçük ağ.
  const dirOf = (th, ph) => v3(Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph));
  const _sa = v3(), _sn = v3(), _sb = v3();
  function surfAt(d, lift, o) {
    const th = Math.atan2(d.x, d.z), ph = Math.asin(clamp(d.y, -1, 1));
    headSurf(th, ph, o); headNormal(th, ph, _sn);
    return o.addScaledVector(_sn, lift);
  }
  const HAIR_CRE = new THREE.Color(0x160a05), HAIR_MID = new THREE.Color(0x371c12), HAIR_CR = new THREE.Color(0x63361f), HAIR_AUB = new THREE.Color(0x8c4626);
  const headR = (a, ph) => headSurf(a, ph, _sb).sub(HC).length();
  const sideOf = a => Math.abs(a) / Math.PI;    // 0 ön … 1 arka
  // bandana orta çizgisi (yükselim, radyan) ve yarı genişliği: alından geçer, kulakların üstünden arkaya iner
  const bandPh = a => { const s = sideOf(a); return lerp(0.5, 0.34, sstep(0.0, 0.5, s)) - 0.3 * sstep(0.5, 1.0, s); };
  const bandW = a => lerp(0.13, 0.085, sstep(0.25, 1.0, sideOf(a)));
  const smax = (a, b, k) => { const h = clamp(0.5 + 0.5 * (a - b) / k, 0, 1); return lerp(b, a, h) + k * h * (1 - h); };
  function hoodR(a, ph) {
    const s = sideOf(a), fr = 1 - sstep(0.17, 0.32, s);
    let T = lerp(0.036, lerp(0.085, 0.095, sstep(0.5, 1, s)), sstep(0.12, 0.5, s)) * (0.62 + 0.38 * Math.cos(ph));
    T *= lerp(1, 0.1 + 0.9 * sstep(bandPh(a) + bandW(a) * 0.5, bandPh(a) + bandW(a) + 0.2, ph), fr);   // önde bandananın altına incelir
    let r = headR(a, ph) + T;
    if (ph < 0.2) {   // perde: başın altına dikey dökülür, uca doğru kabarır
      const rf = lerp(0.222, 0.295, sstep(0.3, 0.85, s));
      const y = HC.y + rf * Math.tan(Math.max(ph, -1.3));
      r = smax(r, (rf + 0.055 * sstep(0.17, -0.03, y)) / Math.max(0.25, Math.cos(ph)), 0.03);
    }
    return r;
  }
  const yBot = a => lerp(0.08, -0.022, sstep(0.3, 0.72, sideOf(a)));
  const PHMIN = (() => {   // alt kenarın yükselimi (azimuta göre, 256 örnek)
    const N = 256, out = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI + i / N * TAU, yb = yBot(a); let lo = -1.35, hi = 0.45;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (HC.y + hoodR(a, m) * Math.sin(m) > yb) hi = m; else lo = m; }
      out[i] = (lo + hi) / 2;
    }
    return a => { const f = (a + Math.PI) / TAU * N, i = clamp(Math.floor(f), 0, N - 1), t = f - i; return lerp(out[i], out[i + 1], t); };
  })();
  const phEnd = a => lerp(bandPh(a), PHMIN(a), sstep(0.235, 0.43, sideOf(a)));   // önde bandananın altında biter, yanlarda omza iner
  const hoodN = (a, ph, o) => { const k = ph < 0 ? lerp(1, 0.25, sstep(0, -0.6, ph)) : 1; return o.set(Math.sin(a) * Math.cos(ph), Math.sin(ph) * k, Math.cos(a) * Math.cos(ph)).normalize(); };
  const GD_PH = 0.97, GD = dirOf(0, GD_PH);   // güneş gözlüğü: başın tepesinde, bandananın hemen arkasında
  // bukle tümsekleri: taban yüzeyinde Poisson dağılımı (bandana ve gözlüğün altında yok)
  let CURLS = null;
  function curlField() {
    if (CURLS) return CURLS;
    const R = mulberry32(77), out = [], MIN = 0.045, p = v3(), n = v3();
    for (let i = 0; i < 7000; i++) {
      const a = -Math.PI + R() * TAU, pe = phEnd(a), ph = lerp(Math.PI / 2, pe - 0.05, Math.sqrt(R()));
      if (Math.abs(ph - bandPh(a)) < bandW(a) + 0.03) continue;
      const d = dirOf(a, ph);
      if (d.angleTo(GD) < 0.26) continue;
      p.copy(d).multiplyScalar(hoodR(a, ph)).add(HC);
      let ok = true; for (const c of out) if (c.p.distanceToSquared(p) < MIN * MIN) { ok = false; break; }
      if (!ok) continue;
      hoodN(a, ph, n);
      const t1 = v3().crossVectors(n, Math.abs(n.y) > 0.9 ? v3(1, 0, 0) : v3(0, 1, 0)).normalize(), t2 = v3().crossVectors(n, t1);
      const r = (0.032 + R() * 0.01) * (1 + 0.1 * sstep(0.1, -0.02, p.y));
      out.push({ p: p.clone(), r, R2: sq(r * 1.32), t1, t2, ph: R() * TAU, sp: R() < 0.5 ? -1 : 1 });
    }
    return (CURLS = out);
  }
  const _hinf = { h: 0, k: 0 };
  function hoodPt(u, v, o, info) {
    const a = -Math.PI + u * TAU, pe = phEnd(a), ph = lerp(Math.PI / 2, pe, Math.pow(v, 0.92));
    const d = dirOf(a, ph);
    o.copy(d).multiplyScalar(hoodR(a, ph)).add(HC);
    const L = curlField();
    let best = 0, kk = 0;
    for (let i = 0; i < L.length; i++) {
      const c = L[i], dx = o.x - c.p.x, dy = o.y - c.p.y, dz = o.z - c.p.z, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= c.R2) continue;
      const q = d2 / c.R2, rr = Math.sqrt(q);
      const th = Math.atan2(dx * c.t2.x + dy * c.t2.y + dz * c.t2.z, dx * c.t1.x + dy * c.t1.y + dz * c.t1.z);
      const sw = 1 + 0.2 * Math.sin(2 * th * c.sp - 9 * rr + c.ph) * sstep(0.12, 0.45, rr);   // sarmal bukle oluğu
      const h = c.r * 0.8 * Math.sqrt(1 - q) * sw;
      if (h > best) { best = h; kk = Math.sqrt(1 - q) * (0.75 + 1.5 * (sw - 1)); }
    }
    const band = sstep(bandW(a) * 0.85, bandW(a) * 1.3, Math.abs(ph - bandPh(a)));
    const gl = 1 - 0.8 * (1 - sstep(0.2, 0.33, d.angleTo(GD)));
    const h = best * band * gl;
    o.addScaledVector(hoodN(a, ph, _sn), h - 0.003);
    if (info) { info.h = h; info.k = kk * band * gl; info.ph = ph; info.a = a; }
    return o;
  }
  function hoodGeo() {
    const NU = 128, NV = 46;
    const g = paramGeo((u, v, o) => hoodPt(u, v, o), NU, NV, HC, true);
    const n = g.attributes.position.count, col = new Float32Array(n * 3), fl = new Float32Array(n), P = g.attributes.position, c = new THREE.Color();
    for (let j = 0, k = 0; j <= NV; j++) for (let i = 0; i <= NU; i++, k++) {
      hoodPt(i / NU, j / NV, _sa, _hinf);
      const y = P.getY(k), crest = _hinf.k;
      c.copy(HAIR_CRE).lerp(HAIR_MID, sstep(0.0, 0.35, crest)).lerp(HAIR_CR, sstep(0.4, 1.0, crest));
      c.lerp(HAIR_AUB, (0.12 + 0.45 * sstep(0.2, -0.02, y)) * sstep(0.35, 1.0, crest));     // uçlara doğru kızıl-kestane ışıltı
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
      fl[k] = 0.95 * sstep(0.2, -0.03, y);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aFlex', new THREE.BufferAttribute(fl, 1));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));   // uv = 0: tel normal dokusu ve tel parlaması yok, bukleler kendi parlar
    return g;
  }
  // burgu bukle: P0'dan 'down' yönünde sarkar, uca doğru yaylanır
  function ringlet(P0, down, out, L, r0, turns, w, tone, M = 6) {
    const ax = down.clone().normalize(), o1 = out.clone().addScaledVector(ax, -out.dot(ax)).normalize(), t1 = v3().crossVectors(ax, o1);
    const N = Math.round(11 * turns), P = [], U = [], ph0 = tone * 9;
    for (let i = 0; i <= N; i++) {
      const f = i / N, an = f * turns * TAU + ph0, r = r0 * (0.45 + 0.55 * sstep(0, 0.2, f)) * (1 - 0.25 * f);
      const rad = v3().addScaledVector(o1, Math.cos(an)).addScaledVector(t1, Math.sin(an));
      P.push(P0.clone().addScaledVector(ax, L * f).addScaledVector(rad, r)); U.push(rad);
    }
    const c0 = new THREE.Color();
    return sweep(P, U, t => w * (1 - 0.3 * t), t => w * (1 - 0.3 * t), M, 1,
      (t, c) => c.copy(HAIR_MID).lerp(HAIR_CR, 0.45 + 0.35 * Math.sin(t * turns * TAU + ph0 + 1.2)).lerp(HAIR_AUB, 0.15 + 0.4 * t + 0.1 * tone), t => 0.35 + 0.65 * t);
  }
  function hairGeo() {
    const parts = [hoodGeo()];
    const R = mulberry32(31), p = v3(), n = v3();
    // alt kenar boyunca omuza dökülen burgu bukleler + yüzün iki yanında çerçeve bukleler
    const spec = [];
    for (const a of [1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 2.98]) for (const s of [-1, 1]) spec.push([s * (a + (R() - 0.5) * 0.08), 0.1 + R() * 0.035, 0.07]);
    spec.push([Math.PI, 0.11, 0.07]);
    for (const s of [-1, 1]) { spec.push([s * 1.2, 0.1, 0.35]); spec.push([s * 1.33, 0.12, 0.22]); }
    for (const [a, L, up] of spec) {
      const ph = phEnd(a) + up;
      p.copy(dirOf(a, ph)).multiplyScalar(hoodR(a, ph) - 0.006).add(HC);
      const out = v3(Math.sin(a), 0, Math.cos(a));
      const front = Math.abs(a) < 1.4;
      const down = v3(0, -1, 0).addScaledVector(out, front ? 0.12 : 0.3);
      parts.push(ringlet(p.clone().addScaledVector(out, 0.012), down, out, L, 0.017 + R() * 0.004, 1.9 + R() * 0.6, 0.0125 + R() * 0.002, R()));
    }
    // perdenin üstünden fışkıran kısa burgu bukleler (yandan/arkadan bakınca da kıvırcık okunsun)
    for (const c of curlField()) {
      const a = Math.atan2(c.p.x - HC.x, c.p.z - HC.z);
      if (c.p.y > 0.2 || sideOf(a) < 0.36 || R() < 0.35) continue;
      const out = v3(Math.sin(a), 0, Math.cos(a)), down = v3(0, -1, 0).addScaledVector(out, 0.55);
      parts.push(ringlet(c.p.clone().addScaledVector(out, c.r * 0.45), down, out, 0.05 + R() * 0.025, 0.0125 + R() * 0.003, 1.3 + R() * 0.5, 0.0098 + R() * 0.0015, R(), 5));
    }
    return concat(parts.map(g => withAttrs(g, null, 0)));
  }
  // ── Bandana: siyah, beyaz küçük çiçek/nokta desenli; alından geçer, arkada fiyonk düğüm + iki uç ──
  let BANDTEX = null;
  function bandTex() {
    if (BANDTEX) return BANDTEX;
    const W = 128, H = 64, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#16131a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e8e0d4'; g.strokeStyle = '#e8e0d4';
    g.fillRect(0, 4, W, 1.5); g.fillRect(0, H - 5.5, W, 1.5);                      // kenar şeritleri
    for (let x = 4; x < W; x += 16) { g.beginPath(); g.arc(x, 10, 1, 0, TAU); g.fill(); g.beginPath(); g.arc(x + 8, H - 10, 1, 0, TAU); g.fill(); }
    const flower = (cx, cy, r) => {                                                // küçük beş yapraklı çiçek
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.75, r * 0.5, a, 0, TAU); g.fill(); }
      g.fillStyle = '#16131a'; g.beginPath(); g.arc(cx, cy, r * 0.45, 0, TAU); g.fill(); g.fillStyle = '#e8e0d4';
    };
    for (let i = 0; i < 4; i++) { flower(16 + i * 32, 24, 3.2); flower(i * 32, 41, 3.2); }
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(8 + i * 32, 33, 1.1, 0, TAU); g.fill(); }
    for (let i = 0; i < 4; i++) {                                                  // minik şal (paisley) damlaları
      g.beginPath(); g.ellipse(32 * i + 4, 18, 2.6, 1.5, -0.6, 0, TAU); g.fill(); g.beginPath(); g.ellipse(32 * i + 21, 47, 2.6, 1.5, 0.6, 0, TAU); g.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; t.needsUpdate = true;
    return (BANDTEX = keep(t));
  }
  const bandRad = (a, ph) => lerp(headR(a, ph) + 0.0075, hoodR(a, ph) + 0.0015, sstep(0.15, 0.3, sideOf(a)));
  function bandanaGeo() {
    const A0 = -Math.PI + 0.3, A1 = Math.PI - 0.3, N = 84, P = [], U = [], n = v3();
    for (let i = 0; i <= N; i++) {
      const a = lerp(A0, A1, i / N), ph = bandPh(a);
      P.push(dirOf(a, ph).multiplyScalar(bandRad(a, ph)).add(HC)); U.push(hoodN(a, Math.max(ph, 0.05), v3()));
    }
    let len = 0; for (let i = 1; i <= N; i++) len += P[i].distanceTo(P[i - 1]);
    const band = sweep(P, U, t => { const a = lerp(A0, A1, t); return bandW(a) * bandRad(a, bandPh(a)) * (1 - 0.25 * sstep(0.8, 1, sideOf(a))); }, () => 0.0042, 10, 0.5, (t, c) => c.set(0xffffff), null);
    const uv = band.attributes.uv; for (let i = 0; i < uv.count; i++) { const k = uv.getX(i), t = uv.getY(i) / 4; uv.setXY(i, t * len / 0.06, k * 2); }
    // arkada düğüm: iki küçük fiyonk kanadı + ortada düğüm + aşağı sarkan iki uç (yaylı)
    const a = Math.PI, ph = bandPh(a), K = dirOf(a, ph).multiplyScalar(bandRad(a, ph) + 0.009).add(HC);
    const nn = hoodN(a, ph, v3()), X = v3(1, 0, 0), Y = v3().crossVectors(nn, X).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, nn));
    const knot = kitGeo(k => {
      k.push([K.x, K.y, K.z], q);
      for (const s of [-1, 1]) k.add(G.sphere(14, 10), 0xffffff, [s * 0.022, 0.002, 0], [0, 0, s * 0.3], [0.025, 0.016, 0.011]);
      k.add(G.sphere(12, 9), 0xffffff, [0, 0, 0.004], 0, [0.012, 0.013, 0.01]);
      k.pop();
    });
    const tails = [];
    for (const s of [-1, 1]) {
      const TP = [], TU = [];
      for (let i = 0; i <= 10; i++) { const f = i / 10; TP.push(K.clone().addScaledVector(X, s * (0.006 + 0.022 * f)).add(v3(0, -0.085 * f, 0)).addScaledVector(nn, 0.003 + 0.012 * Math.sin(f * Math.PI * 0.8))); TU.push(nn); }
      const tg = sweep(TP, TU, t => 0.0125 * (1 - 0.15 * t) + 0.004 * sstep(0.85, 1, t), () => 0.0028, 8, 0.6, (t, c) => c.set(0xffffff), t => 0.25 + 0.75 * t);
      const tuv = tg.attributes.uv; for (let i = 0; i < tuv.count; i++) { const k = tuv.getX(i), t = tuv.getY(i) / 4; tuv.setXY(i, t * 1.4 + s * 0.3, k * 2); }
      tails.push(tg);
    }
    return concat([band, withAttrs(knot, null, 0.15), ...tails].map(g => withAttrs(g, null, 0)));
  }
  // ── Güneş gözlüğü (başın tepesinde): koyu çerçeve, hafif yansımalı kahve camlar, saçın içine giren saplar ──
  function glassesGeo() {
    const C0 = GD.clone().multiplyScalar(hoodR(0, GD_PH) + 0.008).add(HC);
    const Z = GD.clone(), X = v3(1, 0, 0), Y = v3().crossVectors(Z, X).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const FR = 0x17110f, LENS = 0x3b2621, parts = [];
    parts.push(kitGeo(k => {
      k.push([C0.x, C0.y, C0.z], q);
      for (const s of [-1, 1]) {
        k.push([s * 0.041, 0, 0], [0, s * 0.18, s * -0.06]);
        k.add(G.sphere(20, 12), LENS, [0, 0, 0.0005], 0, [0.0335, 0.0265, 0.0065]);
        k.add(G.torus(TAU, 0.2, 30), FR, [0, 0, 0.001], 0, [0.0355, 0.0285, 0.03]);
        k.pop();
      }
      k.add(G.torus(Math.PI, 0.32, 10), FR, [0, 0.008, 0.0045], [0, 0, 0], [0.009, 0.008, 0.012]);   // köprü
      k.pop();
    }));
    for (const s of [-1, 1]) {   // saplar: menteşeden saçın içine, başın yanlarına doğru
      const h0 = v3(s * 0.076, 0.004, 0.001).applyQuaternion(q).add(C0), P = [h0], U = [GD.clone()];
      for (let i = 1; i <= 9; i++) {
        const f = i / 9, a = s * lerp(0.42, 1.45, f), ph = lerp(GD_PH - 0.12, 0.66, f);
        P.push(dirOf(a, ph).multiplyScalar(hoodR(a, ph) + 0.006 - 0.01 * f).add(HC)); U.push(hoodN(a, ph, v3()));
      }
      parts.push(sweep(curvePts(P, 18), curvePts(U, 18), () => 0.0036, () => 0.0026, 6, 1, (t, c) => c.set(FR), null));
    }
    return concat(parts.map(g => withAttrs(g, null, 0)));
  }
  // saç teli normal dokusu (bir kez, 128²)
  let STRAND = null;
  function strandTex() {
    if (STRAND) return STRAND;
    const S = 128, D = new Uint8Array(S * S * 4), H = new Float32Array(S * S), R = mulberry32(91);
    const ph = [], fr = [3, 6, 11, 17, 26, 37, 53], am = [0.3, 0.26, 0.22, 0.17, 0.12, 0.09, 0.06];
    for (let i = 0; i < fr.length; i++) ph.push(R() * TAU);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let h = 0; const u = x / S, v = y / S;
      for (let i = 0; i < fr.length; i++) h += am[i] * Math.sin(TAU * fr[i] * u + ph[i] + 0.7 * Math.sin(TAU * v + i));
      H[y * S + x] = h;
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = H[y * S + (x + 1) % S] - H[y * S + (x + S - 1) % S], dy = H[((y + 1) % S) * S + x] - H[((y + S - 1) % S) * S + x];
      const nx = -dx * 2.2, ny = -dy * 2.2, l = Math.hypot(nx, ny, 1), o = (y * S + x) * 4;
      D[o] = (nx / l * 0.5 + 0.5) * 255; D[o + 1] = (ny / l * 0.5 + 0.5) * 255; D[o + 2] = (1 / l * 0.5 + 0.5) * 255; D[o + 3] = 255;
    }
    const t = new THREE.DataTexture(D, S, S, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.anisotropy = ANISO; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
    return (STRAND = keep(t));
  }
  // polar kumaş: kısa tüy kümeleri (renk dalgalanması + normal), 128², döşenir
  let FLEECE = null;
  function fleeceTex() {
    if (FLEECE) return FLEECE;
    const S = 128, H = new Float32Array(S * S), R = mulberry32(17);
    for (let n = 0; n < 900; n++) {   // tüy kümeleri: küçük yumuşak tepecikler
      const cx = R() * S, cy = R() * S, r = 1.6 + R() * 3.2, h = 0.5 + R() * 0.7;
      for (let y = Math.floor(cy - r * 2); y <= cy + r * 2; y++) for (let x = Math.floor(cx - r * 2); x <= cx + r * 2; x++) {
        const d2 = (sq(x - cx) + sq(y - cy)) / (r * r); if (d2 > 4) continue;
        const k = ((y % S + S) % S) * S + ((x % S + S) % S); H[k] = Math.max(H[k], h * Math.exp(-d2 * 1.2));
      }
    }
    for (let i = 0; i < S * S; i++) H[i] += (R() - 0.5) * 0.18;
    const N = new Uint8Array(S * S * 4), Cc = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const k = y * S + x, dx = H[y * S + (x + 1) % S] - H[y * S + (x + S - 1) % S], dy = H[((y + 1) % S) * S + x] - H[((y + S - 1) % S) * S + x];
      const nx = -dx * 1.6, ny = -dy * 1.6, l = Math.hypot(nx, ny, 1), o = k * 4;
      N[o] = (nx / l * 0.5 + 0.5) * 255; N[o + 1] = (ny / l * 0.5 + 0.5) * 255; N[o + 2] = (1 / l * 0.5 + 0.5) * 255; N[o + 3] = 255;
      const v = clamp(0.8 + 0.2 * H[k], 0, 1) * 255; Cc[o] = v; Cc[o + 1] = v * 0.985; Cc[o + 2] = v * 0.98; Cc[o + 3] = 255;
    }
    const mk = (D, cs) => { const t = new THREE.DataTexture(D, S, S, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = ANISO; t.colorSpace = cs; t.needsUpdate = true; return keep(t); };
    return (FLEECE = { map: mk(Cc, THREE.SRGBColorSpace), normal: mk(N, THREE.NoColorSpace) });
  }

  // ── Gövde (bağlama pozu, metre; Hala +z'ye bakar, sol tarafı +x) ──
  // Kemikler: 0 kök, 1 kalça, 2 göğüs, 3 baş, 4 kolL, 5 önkolL, 6 elL, 7 kolR, 8 önkolR, 9 elR, 10 uylukL, 11 baldırL, 12 ayakL, 13 uylukR, 14 baldırR, 15 ayakR
  const BONES = [['root', -1, 0, 0, 0], ['hips', 0, 0, 0.98, 0], ['chest', 1, 0, 0.22, 0], ['head', 2, 0, 0.30, 0],
    ['armL', 2, 0.193, 0.22, -0.01], ['foreL', 4, 0, -0.29, 0], ['handL', 5, 0, -0.25, 0],
    ['armR', 2, -0.193, 0.22, -0.01], ['foreR', 7, 0, -0.29, 0], ['handR', 8, 0, -0.25, 0],
    ['thighL', 1, 0.095, -0.05, 0], ['shinL', 10, 0, -0.44, 0], ['footL', 11, 0, -0.41, 0],
    ['thighR', 1, -0.095, -0.05, 0], ['shinR', 13, 0, -0.44, 0], ['footR', 14, 0, -0.41, 0]];
  const SKIN = 0xf1c6aa, COAT = 0xe8473d, COAT_DK = 0xb83129, NAVY = 0x1f2747, TILE = 0.09;
  // ceket gövdesi: y → [rx, rz] (Catmull-Rom), üstte omuz kare, önde hafif göğüs
  const TK = [[0.785, 0.226, 0.166], [0.86, 0.232, 0.168], [0.95, 0.218, 0.161], [1.05, 0.192, 0.145], [1.15, 0.196, 0.147], [1.25, 0.205, 0.153],
    [1.33, 0.208, 0.15], [1.4, 0.204, 0.137], [1.455, 0.165, 0.108], [1.5, 0.094, 0.079], [1.535, 0.068, 0.062]];
  function tprof(y) {
    const n = TK.length; let i = 0;
    if (y <= TK[0][0]) return [TK[0][1], TK[0][2]];
    if (y >= TK[n - 1][0]) return [TK[n - 1][1], TK[n - 1][2]];
    while (i < n - 2 && y > TK[i + 1][0]) i++;
    const a = TK[Math.max(0, i - 1)], b = TK[i], c = TK[i + 1], d = TK[Math.min(n - 1, i + 2)], t = (y - b[0]) / (c[0] - b[0]);
    const cr = (p0, p1, p2, p3) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    return [cr(a[1], b[1], c[1], d[1]), cr(a[2], b[2], c[2], d[2])];
  }
  function torsoPt(th, y, o, out = 0) {
    const [rx, rz0] = tprof(y), s = Math.sin(th), c = Math.cos(th);
    const n = 2 + 0.45 * bump(y, 1.3, 1.39, 1.43, 1.47);                       // omuzda daha köşeli kesit
    const ex = 2 / n, rz = rz0 * (c < 0 ? 0.92 + 0.1 * bump(y, 0.78, 0.86, 0.94, 1.04) : 1);
    let x = rx * Math.sign(s) * Math.pow(Math.abs(s), ex), z = rz * Math.sign(c) * Math.pow(Math.abs(c), ex);
    const bust = 0.022 * Math.exp(-sq((Math.abs(th) - 0.48) / 0.33) - sq((y - 1.27) / 0.07));   // yumuşak göğüs
    const k = 1 + (bust + out) / Math.max(0.05, Math.hypot(x, z));
    return o.set(x * k, y, z * k + 0.004);
  }
  const torsoN = (th, y, o) => { const a = torsoPt(th + 1e-3, y, v3()), b = torsoPt(th - 1e-3, y, v3()), c = torsoPt(th, y + 1e-3, v3()), d = torsoPt(th, y - 1e-3, v3());
    return o.crossVectors(c.sub(d), a.sub(b)).normalize(); };
  function torsoGeo() {
    const Y0 = 0.785, Y1 = 1.535;
    const g = paramGeo((u, v, o) => torsoPt(u * TAU - Math.PI, lerp(Y0, Y1, v), o), 64, 46, v3(0, 1.15, 0), true);
    const uv = g.attributes.uv, P = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * TAU * 0.17 / TILE, P.getY(i) / TILE);
    return g;
  }
  const ARM_SLEEVE = [[0, 1.475], [0.034, 1.47], [0.06, 1.452], [0.071, 1.42], [0.075, 1.38], [0.076, 1.33], [0.076, 1.24], [0.071, 1.17], [0.069, 1.12],
    [0.067, 1.06], [0.064, 0.99], [0.061, 0.94], [0.058, 0.925], [0, 0.92]];
  const CUFF = [[0.046, 0.866], [0.054, 0.864], [0.06, 0.872], [0.061, 0.885], [0.061, 0.917], [0.059, 0.93], [0.054, 0.934]];
  const LEG_P = [[0, 0.055], [0.034, 0.058], [0.041, 0.08], [0.04, 0.12], [0.047, 0.18], [0.06, 0.27], [0.067, 0.34], [0.065, 0.4], [0.059, 0.47],
    [0.062, 0.53], [0.076, 0.62], [0.089, 0.72], [0.099, 0.82], [0.104, 0.9], [0.094, 0.96], [0, 0.985]];
  const PELVIS_P = [[0, 0.745], [0.07, 0.748], [0.135, 0.772], [0.175, 0.83], [0.185, 0.9], [0.175, 0.97], [0.15, 1.01], [0, 1.02]];
  const NECK_P = [[0, 1.41], [0.06, 1.415], [0.055, 1.47], [0.053, 1.53], [0.056, 1.58], [0, 1.6]];
  function heartShape(w) {
    const s = new THREE.Shape(), h = w * 0.9;
    s.moveTo(0, -h / 2);
    s.bezierCurveTo(-w * 0.1, -h * 0.3, -w / 2, -h * 0.05, -w / 2, h * 0.2);
    s.bezierCurveTo(-w / 2, h * 0.5, -w * 0.08, h * 0.55, 0, h * 0.28);
    s.bezierCurveTo(w * 0.08, h * 0.55, w / 2, h * 0.5, w / 2, h * 0.2);
    s.bezierCurveTo(w / 2, -h * 0.05, w * 0.1, -h * 0.3, 0, -h / 2);
    return s;
  }
  function onTorso(geo, th, y, out, spin = 0) {   // düz bir parçayı ceket yüzeyine yapıştır (z → yüzey normali)
    const p = torsoPt(th, y, v3(), out), n = torsoN(th, y, v3());
    const q = qAlign(v3(0, 0, 1), n); if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 0, 1), spin));
    geo.applyMatrix4(new THREE.Matrix4().compose(p, q, v3(1, 1, 1)));
    return geo;
  }
  let BODY = null;
  function buildBody() {
    if (BODY) return BODY;
    const t0 = performance.now();
    const skin = [], coat = [], knit = [];
    // ten: baş, kulaklar, boyun, eller
    skin.push({ geo: headGeo(), bone: 3 });
    for (const s of [1, -1]) skin.push({ geo: earGeo(s), bone: 3 });
    skin.push({ geo: lathe(NECK_P, 18, 0, 0.004, 1, 0.94), w: (x, y) => [2, 3, sstep(1.5, 1.56, y)],
      color: (x, y, z, c) => { const k = 0.86 + 0.14 * sstep(1.6, 1.5, y); return c.setRGB(k + 0.04 * (1 - k), k * 0.97, k * 0.96); } });
    for (const s of [1, -1]) {
      const up = s > 0 ? 4 : 7, fo = up + 1, hd = up + 2, ax = 0.193 * s;
      // el: yassı avuç (avuç içi gövdeye bakar), dört parmak, başparmak
      skin.push({ geo: kitGeo(k => {
        k.add(G.sphere(16), 0xffffff, [ax - 0.002 * s, 0.808, 0.004], [0, 0, 0.06 * s], [0.021, 0.05, 0.037]);
        for (let i = 0; i < 4; i++) {
          const z = -0.022 + i * 0.0148, L = [0.026, 0.031, 0.03, 0.024][i];
          k.add(G.sphere(12, 9), 0xffffff, [ax - 0.006 * s, 0.762 - L * 0.5 + 0.012, z + 0.004], [0.08 * (i - 1.5), 0, -0.22 * s], [0.0088, L, 0.0088]);
        }
        k.add(G.sphere(12, 9), 0xffffff, [ax - 0.014 * s, 0.785, 0.036], [0.55, 0, -0.5 * s], [0.0095, 0.026, 0.0105]);
        k.add(G.cyl(1, 1, 14), 0xffffff, [ax, 0.86, 0.002], 0, [0.027, 0.05, 0.027]);   // bilek
      }), w: (x, y) => [fo, hd, sstep(0.875, 0.86, y)], color: 0xffffff });
    }
    // polar ceket
    const coatCol = (x, y, z, c) => {   // koltuk altı, yaka dibi ve yan dikişlerde hafif gölge (doku derinliği)
      const ax = Math.abs(x), pit = Math.exp(-sq((ax - 0.175) / 0.045) - sq((y - 1.3) / 0.09)), neck = Math.exp(-sq((y - 1.47) / 0.03)) * sstep(0.12, 0.05, ax);
      const side = Math.exp(-sq(Math.atan2(ax, z) - Math.PI / 2) / 0.05) * sstep(1.25, 1.0, y) * 0.5;
      return c.set(COAT).multiplyScalar((0.97 + 0.03 * Math.sin(y * 40)) * (1 - 0.22 * pit - 0.15 * neck - 0.08 * side));
    };
    coat.push({ geo: torsoGeo(), w: (x, y) => {
      const ax = Math.abs(x);
      if (y > 1.3 && ax > 0.13) return [2, x > 0 ? 4 : 7, 0.45 * sstep(0.13, 0.2, ax) * sstep(1.32, 1.42, y)];
      return [1, 2, sstep(0.98, 1.17, y)];
    }, color: coatCol, flex: (x, y) => sstep(0.97, 0.8, y) });
    for (const s of [1, -1]) {
      const up = s > 0 ? 4 : 7, fo = up + 1, ax = 0.193 * s;
      coat.push({ geo: lathe(ARM_SLEEVE, 28, ax, -0.01, 1, 0.96, TILE), w: (x, y) => (y > 1.3 ? [2, up, sstep(1.47, 1.39, y)] : [up, fo, sstep(1.17, 1.09, y)]), color: coatCol });
      // manşet (ribana): koyu mercan, dikey çizgili
      coat.push({ geo: lathe(CUFF, 48, ax, -0.01, 1, 0.96, TILE), bone: fo,
        color: (x, y, z, c) => c.set(COAT_DK).multiplyScalar(0.9 + 0.12 * Math.cos(Math.atan2(x - ax, z + 0.01) * 24)) });
    }
    // etek ribanası, yaka, fermuar, cepler, kalp arması
    const ring = (y, out, w, th, a0, a1, n, col) => {
      const P = [], U = [];
      for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); P.push(torsoPt(a, y, v3(), out)); U.push(v3(0, 1, 0)); }
      return sweep(P, U, () => w, () => th, 10, 1, (t, c) => c.set(col), null);
    };
    coat.push({ geo: ring(0.805, 0.006, 0.011, 0.024, -Math.PI, Math.PI, 72, COAT_DK), w: (x, y) => [1, 2, 0], color: (x, y, z, c) => c.set(COAT_DK).multiplyScalar(0.9 + 0.12 * Math.cos(Math.atan2(x, z) * 60)) });
    {   // dik yaka: boynu saran, önde hafif açık bant
      const P = [], U = [];
      for (let i = 0; i <= 44; i++) {
        const a = lerp(0.3, TAU - 0.3, i / 44), sa = Math.sin(a), ca = Math.cos(a);
        P.push(v3(sa * 0.09, 1.535 - 0.016 * sq(Math.cos(a / 2)), ca * 0.083 + 0.004)); U.push(v3(sa, 0, ca));
      }
      coat.push({ geo: sweep(P, U, () => 0.046, () => 0.012, 10, 1, (t, c) => c.set(COAT), null), w: (x, y) => [2, 3, 0.12 * sstep(1.5, 1.55, y)], color: coatCol });
    }
    {   // fermuar bandı + dişler
      const P = [], U = [];
      for (let y = 0.79; y <= 1.5; y += 0.02) { P.push(torsoPt(0, y, v3(), 0.003)); U.push(torsoN(0, y, v3())); }
      coat.push({ geo: sweep(P, U, () => 0.011, () => 0.003, 6, 1, (t, c) => c.set(0x9f2a24), null), w: (x, y) => [1, 2, sstep(0.98, 1.17, y)] });
      const teeth = kitGeo(k => {
        for (let y = 0.8, i = 0; y <= 1.495; y += 0.0072, i++) {
          const p = torsoPt(0, y, v3(), 0.0055), n = torsoN(0, y, v3());
          k.add(G.box(), 0x3d3a40, [p.x + (i & 1 ? 0.0024 : -0.0024), p.y, p.z], qAlign(v3(0, 0, 1), n), [0.0085, 0.0042, 0.004]);
        }
      });
      coat.push({ geo: teeth, w: (x, y) => [1, 2, sstep(0.98, 1.17, y)] });
    }
    {   // dikiş çizgileri: önde ve arkada omuz boyunduruğu (kumaş parçalı görünsün)
      const seam = (pts, w) => { const P = [], U = []; for (const [a, y] of pts) { P.push(torsoPt(a, y, v3(), 0.0025)); U.push(torsoN(a, y, v3())); }
        return sweep(curvePts(P, P.length * 3), curvePts(U, P.length * 3), () => w, () => 0.002, 5, 1, (t, c) => c.set(0xbf3a31), null); };
      for (const s of [1, -1]) coat.push({ geo: seam([[s * 0.06, 1.35], [s * 0.45, 1.362], [s * 0.9, 1.385], [s * 1.25, 1.41]], 0.0028), bone: 2 });
      coat.push({ geo: seam([[1.75, 1.39], [2.3, 1.33], [Math.PI, 1.31], [-2.3, 1.33], [-1.75, 1.39]], 0.0028), bone: 2 });
    }
    for (const s of [1, -1]) {   // yan cepler (fermuarlı yarık)
      const P = [], U = [];
      for (let i = 0; i <= 8; i++) { const f = i / 8, a = s * lerp(0.62, 0.98, f), y = lerp(0.85, 1.01, f); P.push(torsoPt(a, y, v3(), 0.003)); U.push(torsoN(a, y, v3())); }
      coat.push({ geo: sweep(P, U, () => 0.0042, () => 0.0028, 6, 1, (t, c) => c.set(0x8e231e), null), w: (x, y) => [1, 2, sstep(0.98, 1.17, y)] });
    }
    {   // sol göğüste krem rengi kalp arması
      const hg = new THREE.ExtrudeGeometry(heartShape(0.04), { depth: 0.002, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 10 });
      onTorso(hg, 0.5, 1.33, 0.001, 0);
      coat.push({ geo: hg, bone: 2, color: 0xfff0e2 });
      const hg2 = new THREE.ExtrudeGeometry(heartShape(0.022), { depth: 0.002, bevelEnabled: false, curveSegments: 10 });
      onTorso(hg2, 0.5, 1.332, 0.0045, 0);
      coat.push({ geo: hg2, bone: 2, color: 0xf06a76 });
    }
    // tayt, kalça, terlik
    knit.push({ geo: lathe(PELVIS_P, 32, 0, 0.0, 1, 0.74, TILE), w: (x, y) => (y < 0.86 && Math.abs(x) > 0.02 ? [1, x > 0 ? 10 : 13, 0.8 * sstep(0.86, 0.75, y)] : [1, 1, 0]), color: NAVY });
    for (const s of [1, -1]) {
      const th = s > 0 ? 10 : 13, sh = th + 1, ft = th + 2, x0 = 0.095 * s;
      knit.push({ geo: lathe(LEG_P, 22, x0, 0, 1, 1, TILE), w: (x, y) => (y > 0.3 ? [th, sh, sstep(0.53, 0.45, y)] : [sh, ft, sstep(0.13, 0.075, y)]), color: NAVY });
      knit.push({ geo: kitGeo(k => {   // yumuşak ev terliği: koyu mor-gri keçe, açık renk tüylü ağız, mercan fiyonk
        const DK = 0x3b3442, LIN = 0xb3a6b4;
        k.add(G.sphere(20, 12), 0xcdbfb4, [x0, 0.017, 0.036], 0, [0.052, 0.019, 0.124]);   // yumuşak, yuvarlak taban
        k.add(G.sphere(18), DK, [x0, 0.047, 0.056], 0, [0.05, 0.043, 0.112]);
        k.add(G.sphere(16), DK, [x0, 0.055, -0.03], 0, [0.048, 0.05, 0.055]);
        k.add(G.torus(TAU, 0.42, 24), LIN, [x0, 0.093, -0.012], [Math.PI / 2, 0, 0], [0.043, 0.046, 0.04]);
        k.add(G.sphere(10, 8), 0xe0483f, [x0 - 0.013, 0.083, 0.1], [0, 0, 0.5], [0.014, 0.009, 0.008]);
        k.add(G.sphere(10, 8), 0xe0483f, [x0 + 0.013, 0.083, 0.1], [0, 0, -0.5], [0.014, 0.009, 0.008]);
        k.add(G.sphere(8, 6), 0xc8352d, [x0, 0.084, 0.102], 0, [0.006, 0.006, 0.006]);
      }), bone: ft });
    }
    BODY = { skin: mergeSkinned(skin, true), coat: mergeSkinned(coat), knit: mergeSkinned(knit), hair: hairGeo(), band: bandanaGeo(), glasses: glassesGeo() };
    BODY.ms = Math.round(performance.now() - t0); S.buildMs = BODY.ms;
    return BODY;
  }
  // altın küpeler (baş kemiği uzayında) ve fermuar çekeceği (göğüs kemiği uzayında)
  function earringGeo() {
    return kitGeo(k => {
      for (const s of [1, -1]) {
        const th = s * EAR.th, p = headSurf(th, EAR.ph, v3()), n = headNormal(th, EAR.ph, v3());
        const lobe = p.clone().addScaledVector(n, 0.008); lobe.y -= 0.023;
        k.add(G.sphere(12, 9), 0xffffff, [lobe.x, lobe.y, lobe.z], 0, 0.0052);
        k.add(G.torus(TAU, 0.18, 20), 0xffffff, [lobe.x, lobe.y - 0.014, lobe.z], [0, Math.PI / 2 + th, 0], [0.012, 0.012, 0.012]);
      }
    });
  }
  function zipPullGeo() {
    const p = torsoPt(0, 1.4, v3(), 0.011), n = torsoN(0, 1.4, v3()), q = qAlign(v3(0, 0, 1), n);
    return kitGeo(k => {
      k.push([p.x, RY(p.y) - RY(1.2), p.z], q);
      k.add(G.rbox(1), 0xffffff, [0, 0.004, 0], 0, [0.012, 0.012, 0.007]);
      k.add(G.rbox(1), 0xffffff, [0, -0.016, 0.002], [0.12, 0, 0], [0.011, 0.028, 0.0035]);
      k.pop();
    });
  }

  // ── Yüz: ten gölgelendiricisinde çizilir ──
  const FACE_GLSL = `
    uniform vec4 hzEye; uniform vec3 hzEyeW; uniform vec4 hzMouth; uniform vec4 hzBrow;
    varying vec2 vFace;
    #define SRGB(r, g, b) pow(vec3(r, g, b), vec3(2.2))
    float hzSq(float x) { return x * x; }
    float hzSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
    float hzLine(float d, float w, float aa) { return 1.0 - smoothstep(w - aa, w + aa, d); }
    void hzFace(inout vec3 col, inout float gloss, inout vec3 emis, vec2 q, float aa) {
      // allık + burun delikleri
      float bl = exp(-hzSq((abs(q.x) - 0.37) / 0.11) - hzSq((q.y + 0.2) / 0.075));
      col = mix(col, SRGB(0.96, 0.55, 0.52), bl * (0.3 + 0.45 * hzBrow.z));
      col *= 1.0 - 0.3 * exp(-hzSq((abs(q.x) - 0.05) / 0.016) - hzSq((q.y + 0.232) / 0.011));
      // gözler (e: göz yerel, +x = dış köşe)
      float side = q.x < 0.0 ? -1.0 : 1.0;
      vec2 ec = vec2(0.3 * side, 0.0), er = vec2(0.158, 0.138);
      vec2 e = vec2((q.x - ec.x) * side, q.y - ec.y) / er;
      float aE = aa / er.y;
      float xx = clamp(e.x, -1.0, 1.0), cx = sqrt(max(0.0, 1.0 - xx * xx));
      float top = pow(cx, 0.62) * 0.93 + 0.1 * xx, bot = -pow(cx, 0.85) * 0.72 + 0.06 * xx;
      float hx = clamp(e.x, -0.95, 0.95), hy = -0.12 + 0.62 * (1.0 - hx * hx);
      float sqz = clamp(1.0 - hzEyeW.x, 0.0, 1.0), cmp = hzEyeW.y / max(hzEyeW.y + hzEyeW.z, 1e-3);
      float cy = 0.08 - 0.34 * (1.0 - hx * hx);                       // huzurlu kapalı göz (aşağı kavis)
      float tgt = mix(cy + 0.02, hy, cmp);
      float lid = mix(mix(top, tgt + 0.03, sqz), bot * 0.85 + 0.05, hzEye.x);
      lid = min(lid, top - hzEye.w * 0.45 * cx);
      float lidL = mix(bot, tgt - 0.03, sqz);
      float inX = 1.0 - smoothstep(1.0 - aE * 1.5, 1.0 + aE * 1.5, abs(e.x));
      float vis = smoothstep(-aE, aE, lid - e.y) * smoothstep(-aE, aE, e.y - lidL) * inX;
      // far + göz kapağı çizgisi
      float above = e.y - top;
      col = mix(col, col * SRGB(0.86, 0.67, 0.67), 0.5 * exp(-hzSq((above - 0.2) / 0.22)) * exp(-hzSq(e.x / 1.15)) * step(0.0, above + 0.1));
      float crease = hzLine(abs(e.y - (top + 0.36 + 0.05 * xx)), 0.04, aE) * (1.0 - smoothstep(0.55, 1.0, abs(e.x + 0.05))) * hzEyeW.x * (1.0 - hzEye.x);
      col = mix(col, col * SRGB(0.74, 0.52, 0.49), crease * 0.6);
      // iris: sıcak kahve, bal rengi halka, iki parıltı
      vec2 ic = ec + vec2(hzEye.y * 0.034, hzEye.z * 0.026 - 0.01);
      vec2 di = q - ic; float ir = 0.106, dr = length(di) / ir, aI = aa / ir;
      vec3 iris = mix(SRGB(0.28, 0.15, 0.07), SRGB(0.62, 0.39, 0.17), smoothstep(0.25, -0.95, di.y / ir));
      iris = mix(iris, SRGB(0.8, 0.6, 0.28), 0.3 * exp(-hzSq((dr - 0.56) / 0.13)));
      iris *= 0.85 + 0.15 * sin(atan(di.y, di.x) * 17.0 + dr * 6.0);
      iris = mix(iris, SRGB(0.12, 0.06, 0.03), smoothstep(0.72, 0.98, dr));
      iris = mix(iris, SRGB(0.04, 0.02, 0.015), 1.0 - smoothstep(0.4 - aI, 0.4 + aI, dr));
      vec3 scl = SRGB(0.97, 0.96, 0.975) * (1.0 - 0.12 * smoothstep(0.55, 1.0, length(e)));
      vec3 eye = mix(scl, iris, 1.0 - smoothstep(1.0 - aI, 1.0 + aI, dr));
      eye *= 1.0 - 0.5 * smoothstep(lid - 0.55, lid, e.y);
      float c1 = 1.0 - smoothstep(0.24 - aI, 0.24 + aI, length(di / ir - vec2(-0.32, 0.34)));
      float c2 = 1.0 - smoothstep(0.11 - aI, 0.11 + aI, length(di / ir - vec2(0.36, -0.34)));
      float cl = max(c1, c2 * 0.85);
      eye = mix(eye, vec3(1.0), cl);
      // kirpik çizgisi (dış köşeye doğru kalınlaşır) + kanat
      float ly = e.y - lid;
      float bold = hzBrow.w;
      float lw = mix(0.09, 0.2, smoothstep(-0.6, 1.0, e.x)) + 0.06 * hzEye.x + 0.13 * bold;
      float lash = smoothstep(-0.06 - aE, -0.06 + aE, ly) * (1.0 - smoothstep(lw - aE, lw + aE, ly)) * (1.0 - smoothstep(0.95, 1.05, abs(e.x)));
      float shut = max(hzEye.x, sqz);
      float wy = mix(0.34, 0.06, shut);
      float wt = clamp((e.x - 0.84) / 0.46, 0.0, 1.0);
      float wing = hzLine(hzSeg(e, vec2(0.84, wy + 0.04), vec2(1.3 + 0.12 * bold, wy + 0.32 + 0.08 * bold)), mix(0.085, 0.02, wt) * (1.0 + 0.9 * bold), aE);
      float lower = hzLine(abs(e.y - lidL - 0.035), 0.03, aE) * smoothstep(1.0, 0.3, abs(e.x - 0.15)) * (1.0 - shut);
      float happy = hzLine(abs(e.y - hy) / sqrt(1.0 + hzSq(1.24 * hx)), 0.14, aE) * (1.0 - smoothstep(0.9, 1.02, abs(e.x)));
      float calm = hzLine(abs(e.y - cy) / sqrt(1.0 + hzSq(0.7 * hx)), 0.12, aE) * (1.0 - smoothstep(0.9, 1.02, abs(e.x)));
      vec3 lashC = SRGB(0.1, 0.05, 0.04);
      // dış köşede üç kıvrık kirpik teli (kapak çizgisinden yukarı-dışa)
      float strands = 0.0;
      for (int i = 0; i < 3; i++) {
        float lx = 0.42 + 0.22 * float(i), lc = sqrt(max(0.0, 1.0 - lx * lx));
        float ltop = pow(lc, 0.62) * 0.93 + 0.1 * lx, lbot = -pow(lc, 0.85) * 0.72 + 0.06 * lx;
        float lhy = -0.12 + 0.62 * (1.0 - lx * lx), lcy = 0.08 - 0.34 * (1.0 - lx * lx);
        float llid = mix(mix(ltop, mix(lcy + 0.02, lhy, cmp) + 0.03, sqz), lbot * 0.85 + 0.05, hzEye.x);
        vec2 p0 = vec2(lx, llid + 0.06), dir = normalize(vec2(0.3 + 0.35 * float(i), 1.0));
        float h = clamp(dot(e - p0, dir) / 0.26, 0.0, 1.0);
        strands = max(strands, hzLine(length(e - p0 - dir * h * 0.26), mix(0.045, 0.012, h) * (1.0 + 0.8 * hzBrow.w), aE));
      }
      float ow = smoothstep(0.05, 0.35, hzEyeW.x), cw = smoothstep(0.45, 0.9, sqz);
      col = mix(col, lashC, strands * mix(0.85, 0.6, cw));
      col = mix(col, col * SRGB(0.82, 0.64, 0.6), lower * 0.6 * ow);
      col = mix(col, eye, vis * ow);
      col = mix(col, lashC, lash * ow);
      col = mix(col, lashC, wing);
      col = mix(col, lashC, happy * hzEyeW.y * cw);
      col = mix(col, lashC, calm * hzEyeW.z * cw);
      gloss = max(gloss, vis * ow);
      emis += vec3(0.5) * cl * vis * ow;
      // kaşlar: kavisli, içte dolgun, dışa doğru incelen
      float bx = e.x;
      float by = 0.25 + 0.045 * (1.0 - hzSq((bx - 0.25) / 1.1)) + hzBrow.x * 0.042 - hzBrow.y * 0.032 * bx;
      float bw = mix(0.021, 0.0085, smoothstep(-1.0, 1.15, bx)) * (1.0 + 0.35 * bold);
      float brow = hzLine(abs(q.y - by), bw, aa) * (1.0 - smoothstep(0.95, 1.12, abs(bx - 0.1))) * mix(0.75, 1.0, smoothstep(-1.0, -0.7, bx));
      col = mix(col, SRGB(0.2, 0.11, 0.07), brow * 0.95);
      // ağız
      vec2 m = q - vec2(0.0, -0.445);
      vec3 lipC = SRGB(0.85, 0.36, 0.42), lineC = SRGB(0.4, 0.13, 0.15), inner = SRGB(0.4, 0.07, 0.11);
      float W = 0.125, cs = hzMouth.x;
      float sx = clamp(m.x, -W, W);
      float sy = 1.9 * sx * sx - 0.006 + 5.0 * hzSq(max(0.0, abs(sx) - 0.085));
      float sd = abs(m.y - sy) / sqrt(1.0 + hzSq(3.8 * sx));
      float inM = 1.0 - smoothstep(W - 0.012, W + 0.004, abs(m.x));
      float smileL = hzLine(sd, 0.0075 * (1.0 - 0.5 * smoothstep(0.06, 0.12, abs(m.x))), aa) * inM;
      float lipUp = exp(-hzSq(m.x / 0.085) - hzSq((m.y - sy - 0.012) / 0.0095)) * (1.0 - 0.4 * exp(-hzSq(m.x / 0.012) - hzSq((m.y - sy - 0.019) / 0.006)));
      float lipLo = exp(-hzSq(m.x / 0.078) - hzSq((m.y - sy + 0.021) / 0.016));
      float dimple = exp(-hzSq((abs(m.x) - 0.128) / 0.01) - hzSq((m.y - 0.032) / 0.012));
      col = mix(col, mix(lipC, SRGB(0.9, 0.28, 0.4), bold), clamp((0.85 * lipLo + 0.7 * lipUp) * (1.0 + 0.6 * bold), 0.0, 1.0) * cs);
      col = mix(col, col * 1.18, 0.3 * exp(-hzSq((m.x + 0.015) / 0.025) - hzSq((m.y - sy + 0.024) / 0.006)) * cs);
      col = mix(col, col * SRGB(0.82, 0.62, 0.6), dimple * 0.55 * cs);
      col = mix(col, lineC, smileL * cs);
      // açık ağız (gülme / konuşma): hzMouth.y = görünürlük, .z = derinlik, .w = genişlik (gülüş)
      float oa = smoothstep(0.0, 0.25, hzMouth.y);
      float ow2 = mix(0.062, 0.118, hzMouth.w), dep = mix(0.022, 0.12, hzMouth.z);
      float gx = m.x / ow2;
      float gt = 0.012 + 1.35 * m.x * m.x * hzMouth.w + 0.004 * (1.0 - hzMouth.w);
      float gb = gt - dep * sqrt(max(0.0, 1.0 - gx * gx));
      float gin = min(min(gt - m.y, m.y - gb), (1.0 - abs(gx)) * 0.03);
      float gI = smoothstep(-aa, aa, gin), gLip = smoothstep(-aa, aa, gin + 0.013) - gI;
      vec3 gc = mix(inner, SRGB(0.92, 0.45, 0.5), 1.0 - smoothstep(0.03 - aa, 0.03 + aa, length((m - vec2(0.0, gb + 0.016)) / vec2(1.7, 1.0))));
      float tY = gt - 0.017 * mix(0.6, 1.0, hzMouth.z);
      gc = mix(gc, vec3(0.97), smoothstep(tY - aa, tY + aa, m.y));
      col = mix(col, mix(lipC, SRGB(0.9, 0.28, 0.4), bold), gLip * oa);
      col = mix(col, gc, gI * oa);
      gloss = max(gloss, max(gI * oa * 0.6, lipLo * 0.45 * cs));
    }`;
  const KNEE = 'outgoingLight = mix(outgoingLight, 1.0 + (outgoingLight - 1.0) / (1.0 + (outgoingLight - 1.0) * 5.0), step(1.0, outgoingLight));';
  const WRAP = `vec3 hzWrap = vec3(0.0); float hzNL;
          #if NUM_POINT_LIGHTS > 0
          #pragma unroll_loop_start
          for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) { getPointLightInfo( pointLights[ i ], geometryPosition, directLight ); hzNL = dot( geometryNormal, directLight.direction ); hzWrap += directLight.color * ( 0.5 * hzNL + 0.5 - saturate( hzNL ) ); }
          #pragma unroll_loop_end
          #endif
          #if NUM_DIR_LIGHTS > 0
          #pragma unroll_loop_start
          for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) { getDirectionalLightInfo( directionalLights[ i ], directLight ); hzNL = dot( geometryNormal, directLight.direction ); hzWrap += directLight.color * ( 0.5 * hzNL + 0.5 - saturate( hzNL ) ); }
          #pragma unroll_loop_end
          #endif`;
  // ikincil hareket (ceket eteği dalgalanır/geriye uçuşur; saçta yay)
  const FLEX_D = 'attribute float aFlex; uniform vec3 hzOff; uniform float hzFlare;';
  const FLEX_V = 'transformed += hzOff * aFlex; transformed.xz += normalize(transformed.xz + vec2(1e-4)) * hzFlare * aFlex;';
  function makeSkinMat() {
    const m = stencil(vcMat({ color: SKIN, roughness: 0.55, envMapIntensity: 0.75 }));
    const U = { hzEye: { value: new THREE.Vector4() }, hzEyeW: { value: v3(1, 0, 0) }, hzMouth: { value: new THREE.Vector4(1, 0, 0, 0) }, hzBrow: { value: new THREE.Vector4() } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aFace; varying vec2 vFace;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFace = aFace;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FACE_GLSL)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float hzGloss = 0.0; vec3 hzEmis = vec3(0.0);
          vec2 hzQ = vec2(vFace.x * cos(vFace.y), vFace.y); float hzAA = max(length(fwidth(hzQ)) * 0.7, 1e-4);
          if (vFace.x > -9.0 && abs(vFace.x) < 1.2) hzFace(diffuseColor.rgb, hzGloss, hzEmis, hzQ, hzAA);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, hzGloss);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += hzEmis;')
        .replace('#include <opaque_fragment>', `float hzF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
          outgoingLight += diffuseColor.rgb * vec3(0.6, 0.2, 0.12) * hzF * hzF * 0.38 + vec3(1.0, 0.74, 0.56) * pow(hzF, 3.0) * 0.12 * (1.0 - hzGloss);
          ${WRAP}
          float hzLow = (vFace.x > -9.0 && abs(vFace.x) < 1.6) ? smoothstep(-0.12, -0.6, vFace.y) : 0.0;
          outgoingLight += (BRDF_Lambert(diffuseColor.rgb) * hzWrap * vec3(0.62, 0.36, 0.28) + reflectedLight.indirectDiffuse * vec3(0.25, 0.1, 0.04) * hzLow) * (1.0 - hzGloss);
          ${KNEE}
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'halaSkin1';
    m.userData.hz = U;
    return m;
  }
  function makeCoatMat(flexU) {   // polar: mat, tüylü, kenarlarda sıcak kadife parıltısı
    const f = fleeceTex();
    const m = stencil(vcMat({ roughness: 0.96, envMapIntensity: 0.45, map: f.map, normalMap: f.normal, normalScale: V2(1.1, 1.1) }));
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, flexU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + FLEX_D).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + FLEX_V);
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `float hzF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
          outgoingLight += diffuseColor.rgb * vec3(1.0, 0.72, 0.66) * (pow(hzF, 2.2) * 0.55 + 0.04);
          ${WRAP}
          outgoingLight += BRDF_Lambert(diffuseColor.rgb) * hzWrap * vec3(0.35, 0.16, 0.12);
          ${KNEE}
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'halaCoat1';
    const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    d.onBeforeCompile = sh => { Object.assign(sh.uniforms, flexU); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + FLEX_D).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + FLEX_V); };
    d.customProgramCacheKey = () => 'halaCoatD';
    m.userData.depth = d;
    return m;
  }
  function makeKnitMat() {
    const m = stencil(vcMat({ roughness: 0.62, envMapIntensity: 0.6, normalMap: strandTex(), normalScale: V2(0.25, 0.25) }));
    return rimify(m, 0x9fb0ff, 0.16, 2.4);
  }
  function makeHairMat(flexU) {
    const m = stencil(vcMat({ roughness: 0.48, normalMap: strandTex(), normalScale: V2(0.5, 0.5), envMapIntensity: 0.6, side: THREE.DoubleSide }));
    const vp = sh => { Object.assign(sh.uniforms, flexU); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFlex; uniform vec3 hzOff;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += hzOff * aFlex;'); };
    m.onBeforeCompile = sh => {
      vp(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb *= 0.3;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `float hzF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
          outgoingLight += vec3(1.0, 0.78, 0.6) * pow(hzF, 3.0) * 0.14;
          // saç parlaklık bandı (Kajiya-Kay benzeri): tel yönü = doku v yönü, ekran türevlerinden
          #if NUM_DIR_LIGHTS > 0
          {
            vec3 hzV = normalize(vViewPosition);
            vec2 duvx = dFdx(vNormalMapUv), duvy = dFdy(vNormalMapUv);
            vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
            vec3 hzT = dpx * duvy.x - dpy * duvx.x;
            hzT = hzT - normal * dot(hzT, normal);
            if (dot(hzT, hzT) > 1e-12) {
              hzT = normalize(hzT);
              vec3 hzL = directionalLights[0].direction, hzH = normalize(hzL + hzV);
              float lit = smoothstep(-0.15, 0.45, dot(normal, hzL));
              float t1 = dot(normalize(hzT + normal * 0.12), hzH), t2 = dot(normalize(hzT - normal * 0.22), hzH);
              float s1 = pow(max(0.0, 1.0 - t1 * t1), 90.0), s2 = pow(max(0.0, 1.0 - t2 * t2), 18.0);
              outgoingLight += directionalLights[0].color * lit * (vec3(1.0, 0.9, 0.78) * s1 * 0.22 + diffuseColor.rgb * s2 * 0.55);
            }
          }
          #endif
          ${KNEE}
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'halaHair3';
    const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    d.onBeforeCompile = vp; d.customProgramCacheKey = () => 'halaHairD';
    m.userData.depth = d;
    return m;
  }
  function makeBandMat(flexU) {   // pamuklu bandana: desen dokusu, yumuşak kumaş parıltısı, uçlar saçla birlikte yaylanır
    const m = stencil(vcMat({ map: bandTex(), roughness: 0.78, envMapIntensity: 0.5 }));
    const vp = sh => { Object.assign(sh.uniforms, flexU); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFlex; uniform vec3 hzOff;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += hzOff * aFlex;'); };
    m.onBeforeCompile = sh => {
      vp(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `float hzF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
          outgoingLight += vec3(0.55, 0.5, 0.62) * pow(hzF, 2.5) * 0.22;
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'halaBand1';
    const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    d.onBeforeCompile = vp; d.customProgramCacheKey = () => 'halaBandD';
    m.userData.depth = d;
    return m;
  }
  function makeGlassMat() {   // parlak çerçeve + hafif yansımalı camlar (gökyüzü şeridi + kenar parıltısı)
    const m = stencil(vcMat({ roughness: 0.12, metalness: 0.25, envMapIntensity: 1.8 }));
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `float hzF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
          vec3 hzR = reflect(-normalize(vViewPosition), normal);
          float hzS = smoothstep(0.55, 0.95, sin(hzR.x * 4.0 + hzR.y * 6.0 + 0.6));
          outgoingLight += vec3(0.82, 0.9, 1.0) * (pow(hzF, 2.0) * 0.4 + hzS * 0.32 * smoothstep(0.15, 0.6, normal.z));
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'halaGlass1';
    return m;
  }
  let GOLD = null;
  const goldMat = () => GOLD || (GOLD = keep(stencil(new THREE.MeshStandardMaterial({ color: 0xffd27a, metalness: 1, roughness: 0.28, envMapIntensity: 1.4, vertexColors: true }))));

  // ── Poz kanalları ──
  const CHN = ['bX', 'bY', 'bZ', 'bRX', 'bRY', 'bRZ', 'pRX', 'pRY', 'pRZ', 'cRX', 'cRY', 'cRZ', 'kRX', 'kRY', 'kRZ',
    'aLX', 'aLY', 'aLZ', 'fL', 'fLZ', 'wLX', 'wLZ', 'aRX', 'aRY', 'aRZ', 'fR', 'fRZ', 'wRX', 'wRZ',
    'tLX', 'tLY', 'tLZ', 'sL', 'ftL', 'tRX', 'tRY', 'tRZ', 'sR', 'ftR'];
  const C = {}; CHN.forEach((n, i) => { C[n] = i; });
  const NCH = CHN.length;
  const K = o => { const a = new Float32Array(NCH).fill(NaN); for (const k in o) a[C[k]] = o[k]; return a; };
  const BASE = new Float32Array(NCH);
  Object.entries({ kRX: 0.04, aLX: -0.04, aLY: 0.12, aLZ: 0.13, fL: -0.42, fLZ: -0.12, aRX: -0.04, aRY: -0.12, aRZ: -0.13, fR: -0.42, fRZ: 0.12, wLZ: -0.12, wRZ: 0.12, wLX: -0.1, wRX: -0.1,
    tLZ: 0.02, tRZ: -0.02 }).forEach(([k, v]) => { BASE[C[k]] = v; });
  function mixK(P, Kf, w, legW) {   // NaN = o kanala dokunma
    const lw = legW === undefined ? w : legW;
    for (let i = 0; i < NCH; i++) { const v = Kf[i]; if (v === v) P[i] += (v - P[i]) * (i >= C.tLX ? lw : w); }
  }
  const POSE = {
    // dizlerin üstüne çöküp sarılma (kollar Feza'nın sırtında buluşur)
    hug: K({ bY: -0.41, bRX: 0.0, pRX: 0.08, cRX: 0.24, kRX: 0.12, kRZ: 0.28, kRY: -0.12,
      aLX: -1.28, aLY: -0.62, aLZ: 0.12, fL: -0.35, fLZ: -1.05, wLZ: -0.2, aRX: -1.28, aRY: 0.62, aRZ: -0.12, fR: -0.35, fRZ: 1.05, wRZ: 0.2,
      tLX: -1.45, tLZ: 0.08, sL: 1.42, ftL: 0.05, tRX: 0.15, tRZ: -0.06, sR: 1.62, ftR: 0.7 }),
    kneel: K({ bY: -0.41, pRX: 0.05, cRX: 0.2, kRX: 0.2, tLX: -1.45, tLZ: 0.1, sL: 1.42, ftL: 0.05, tRX: 0.15, tRZ: -0.06, sR: 1.62, ftR: 0.7,
      aLX: -0.4, aLZ: 0.2, fL: -1.2 }),
    point: K({ aRX: -1.62, aRY: 0.08, aRZ: -0.05, fR: -0.06, wRX: -0.25, cRY: -0.12, kRY: -0.05, kRX: -0.06,
      aLX: 0.22, aLY: 0.25, aLZ: 0.5, fL: -1.75, fLZ: 0.2, wLX: 0.2, pRZ: 0.05, bX: 0.02 }),
    shield: K({ aLX: -1.95, aLY: 0.1, aLZ: 0.85, fL: -0.25, aRX: -1.95, aRY: -0.1, aRZ: -0.85, fR: -0.25, wLX: -0.5, wRX: -0.5,
      cRX: -0.12, kRX: -0.16, bRX: -0.04, tLX: -0.25, sL: 0.3, tRX: 0.25, sR: 0.05, tLZ: 0.12, tRZ: -0.12 }),
    cheer: K({ aLX: -2.75, aLZ: 0.42, fL: -0.3, aRX: -2.75, aRZ: -0.42, fR: -0.3, cRX: -0.08, kRX: -0.18, wLX: -0.3, wRX: -0.3 }),
    throwA: K({ aRX: -2.55, aRY: -0.25, aRZ: -0.35, fR: -1.35, wRX: 0.4, cRY: -0.5, pRY: -0.15, kRY: 0.35, bRX: -0.05,
      aLX: -1.0, aLZ: 0.35, fL: -0.5, tLX: -0.35, sL: 0.2, tRX: 0.2, sR: 0.25 }),
    throwB: K({ aRX: -1.25, aRY: 0.25, aRZ: -0.1, fR: -0.15, wRX: -0.2, cRY: 0.42, pRY: 0.15, kRY: -0.2, bRX: 0.1, kRX: 0.12,
      aLX: 0.35, aLZ: 0.3, fL: -0.6, tLX: -0.4, sL: 0.25, tRX: 0.3, sR: 0.4 }),
    squat: K({ bY: -0.2, bRX: 0.12, cRX: 0.28, kRX: -0.15, tLX: -0.85, sL: 1.3, ftL: -0.45, tRX: -0.85, sR: 1.3, ftR: -0.45, tLZ: 0.12, tRZ: -0.12,
      aLX: -0.85, aLY: -0.42, aLZ: 0.1, fL: -0.6, aRX: -0.85, aRY: 0.42, aRZ: -0.1, fR: -0.6, wLX: -0.6, wRX: -0.6 }),
    hips: K({ aLX: 0.25, aLY: 0.3, aLZ: 0.55, fL: -1.8, fLZ: 0.25, aRX: 0.25, aRY: -0.3, aRZ: -0.55, fR: -1.8, fRZ: -0.25, wLX: 0.3, wRX: 0.3, pRZ: 0.05, kRZ: 0.08 }),
    tuck: K({ aLX: -2.1, aLY: -0.3, aLZ: 0.42, fL: -2.15, fLZ: -0.2, wLX: 0.2, kRZ: 0.16, kRY: 0.12 }),
    clasp: K({ aLX: -0.38, aLY: -0.45, aLZ: 0.06, fL: -1.0, fLZ: -0.55, aRX: -0.38, aRY: 0.45, aRZ: -0.06, fR: -1.0, fRZ: 0.55, wLX: 0.1, wRX: 0.1, kRZ: 0.1 }),
    wave: K({ aRX: -2.5, aRZ: -0.55, fR: -0.55, wRX: -0.1, kRZ: -0.08 }),
    pet: K({ bY: -0.13, bRX: 0.2, pRX: 0.1, cRX: 0.32, kRX: 0.2, tLX: -0.65, sL: 0.95, ftL: -0.3, tRX: -0.15, sR: 0.55, ftR: -0.2, tLZ: 0.08, tRZ: -0.08,
      aLX: 0.15, aLZ: 0.35, fL: -1.6, fLZ: 0.2 }),
  };

  // ── Model örneği ──
  const S = {
    root: null, mesh: null, B: null, x: 0, z: 0, y: 0, face: 0, ctx: null, L: null, t: 0, vel: 0, vx: 0, vz: 0,
    act: null, side: 1, stuck: 0, lastD: 0, fx: 0, fz: 0, fvx: 0, fvz: 0, still: 0, prevTele: false,
    cd: { throw: 3, hug: 0, shield: 0, praise: 8, clap: 4, point: 20, ready: 0, love: 60, pasta: 12, pet: 20 },
    hugW: 0, pointQ: null, lastKey: {}, chargeWasFull: false, teamHop: 0, look: null,
  };
  const api = { charge: 0 };
  const M = {   // animasyon durumu
    P: new Float32Array(NCH), Q: new Float32Array(NCH), ph: 0, wMove: 0, run: 0, idleT: 0, fid: -1, fidU: 0, fidW: 0,
    blinkT: 2, blinkDur: 0, sacT: 0, sacX: 0, sacY: 0, lookX: 0, lookY: 0, eyeW: v3(1, 0, 0), mouth: new THREE.Vector4(1, 0, 0, 0), brow: new THREE.Vector4(),
    squint: 0, talk: 0, talkPh: 0, hOff: v3(), hVel: v3(), hPrev: null, hPrevV: v3(), flare: 0, cOff: v3(),
  };
  const face = { blink: 0, happy: 0, calm: 0, grin: 0, talk: 0, o: 0, browR: 0, browW: 0, blush: 0, squint: 0, look: 0, lookX: 0, lookY: 0 };
  let U = null, HU = null, CU = null;
  const _v = v3(), _w = v3(), _a = v3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();

  function buildModel() {
    const body = buildBody();
    const root = new THREE.Group(); root.name = 'aytugHala';
    const wy = []; BONES.forEach((b, i) => { wy[i] = b[3] + (b[1] >= 0 ? wy[b[1]] : 0); });   // bağlama pozu dünya y → RY
    const bones = BONES.map((b, i) => { const o = new THREE.Bone(); o.name = b[0]; o.position.set(b[2], RY(wy[i]) - (b[1] >= 0 ? RY(wy[b[1]]) : 0), b[4]); o.rotation.order = 'YXZ'; return o; });
    BONES.forEach((b, i) => { if (b[1] >= 0) bones[b[1]].add(bones[i]); });
    root.add(bones[0]); root.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(bones);
    CU = { hzOff: { value: v3() }, hzFlare: { value: 0 } };
    HU = { hzOff: { value: v3() } };
    const skinMat = makeSkinMat(), coatMat = makeCoatMat(CU), knitMat = makeKnitMat(), hairMat = makeHairMat(HU);
    U = skinMat.userData.hz;
    const sk = (geo, m) => { const o = new THREE.SkinnedMesh(geo, m); root.add(o); o.bind(skel); o.frustumCulled = false; o.castShadow = true; return o; };
    sk(body.skin, skinMat);
    const coat = sk(body.coat, coatMat); coat.customDepthMaterial = coatMat.userData.depth;
    sk(body.knit, knitMat);
    const B = {}; BONES.forEach((b, i) => { B[b[0]] = bones[i]; });
    const hair = new THREE.Mesh(body.hair, hairMat); hair.castShadow = true; hair.frustumCulled = false; hair.customDepthMaterial = hairMat.userData.depth;
    B.head.add(hair);
    const band = new THREE.Mesh(body.band, makeBandMat(HU)); band.castShadow = true; band.frustumCulled = false; band.customDepthMaterial = band.material.userData.depth; B.head.add(band);
    const glasses = new THREE.Mesh(body.glasses, makeGlassMat()); glasses.frustumCulled = false; B.head.add(glasses);
    const ear = new THREE.Mesh(keep(earringGeo()), goldMat()); ear.frustumCulled = false; B.head.add(ear);
    const zip = new THREE.Mesh(keep(zipPullGeo()), goldMat()); zip.frustumCulled = false; zip.castShadow = false; B.chest.add(zip);
    const headC = new THREE.Object3D(); headC.position.copy(HC); B.head.add(headC);
    const handR = new THREE.Object3D(); handR.position.set(0, -0.08, 0.01); B.handR.add(handR);
    const handL = new THREE.Object3D(); handL.position.set(0, -0.08, 0.01); B.handL.add(handL);
    // elde Pasta Topu (fırlatırken görünür)
    const held = new THREE.Mesh(pieGeo(), pieMat()); held.scale.setScalar(0.9); held.position.set(0, -0.09, 0.035); held.visible = false; held.castShadow = true; B.handR.add(held);
    root.traverse(o => { if (o.isMesh) { o.renderOrder = 5; o.receiveShadow = false; } });
    S.B = B; S.headC = headC; S.handR = handR; S.handL = handL; S.held = held; S.skin = skinMat;
    return root;
  }

  // ── Pasta Topu (fırlatılan, kremalı küçük pasta) ──
  let PIE_G = null, PIE_M = null;
  function pieGeo() {
    return PIE_G || (PIE_G = keep(kitGeo(k => {
      k.add(G.sphere(18), 0xf2c98c, [0, 0, 0], 0, [0.085, 0.07, 0.085]);                                    // pandispanya
      k.add(G.cyl(1, 1, 22), 0xffe6ef, [0, 0.0, 0], 0, [0.088, 0.018, 0.088]);                              // krema katı
      k.add(G.sphere(18, 10), 0xfff6f9, [0, 0.05, 0], 0, [0.08, 0.042, 0.08]);                              // tepe kreması
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; k.add(G.sphere(10, 7), 0xffd9e6, [Math.cos(a) * 0.065, 0.058, Math.sin(a) * 0.065], 0, 0.02); }
      k.add(G.sphere(14), 0xe8243c, [0, 0.105, 0], 0, 0.026);                                              // kiraz
      k.add(G.cyl(1, 1, 6), 0x5a8a2a, [0.008, 0.135, 0], [0, 0, -0.4], [0.003, 0.03, 0.003]);
      for (let i = 0; i < 10; i++) { const a = i * 2.39, r = 0.03 + (i % 3) * 0.015; k.add(G.box(), [0xff6fa8, 0x6fd3ff, 0xffd23f, 0x8be36b][i & 3], [Math.cos(a) * r, 0.085 - r * 0.25, Math.sin(a) * r], [a, a * 2, 0], [0.012, 0.004, 0.004]); }
    })));
  }
  const pieMat = () => PIE_M || (PIE_M = keep(rimify(vcMat({ roughness: 0.55, envMapIntensity: 0.6 }), 0xfff0f5, 0.25)));
  const PIES = [];
  function throwPie(x0, y0, z0, e) {
    let p = PIES.find(q => !q.on);
    if (!p) { if (PIES.length >= 4) return; const m = new THREE.Mesh(pieGeo(), pieMat()); m.castShadow = true; m.scale.setScalar(1.6); scene.add(m); p = { m }; PIES.push(p); }
    if (!p.m.parent) scene.add(p.m);
    const tx = e.x, tz = e.z, d = Math.hypot(tx - x0, tz - z0);
    Object.assign(p, { on: true, t: 0, dur: clamp(0.45 + d * 0.055, 0.5, 0.95), x0, y0, z0, x1: tx, z1: tz, y1: Math.min(0.9, (e.height || 1) * 0.6), h: 1.1 + d * 0.12, e, spin: frand(-12, 12) });
    p.m.visible = true; p.m.position.set(x0, y0, z0);
  }
  function piesStep(dt) {
    for (const p of PIES) {
      if (!p.on) continue;
      p.t += dt; const u = Math.min(1, p.t / p.dur);
      p.m.position.set(lerp(p.x0, p.x1, u), lerp(p.y0, p.y1, u) + p.h * 4 * u * (1 - u), lerp(p.z0, p.z1, u));
      p.m.rotation.set(p.t * p.spin * 0.6, p.t * 3, p.t * p.spin);
      p.tr = (p.tr || 0) - dt;
      if (p.tr <= 0 && S.ctx && S.ctx.api) { p.tr = 0.06; S.ctx.api.burst('sparkle', p.m.position.x, p.m.position.y, p.m.position.z, { color: '#ffc2dc', count: 2 }); }
      if (u >= 1) { p.on = false; p.m.visible = false; pieSplat(p); }
    }
  }
  function pieSplat(p) {
    const A = S.ctx && S.ctx.api; if (!A) return;
    const x = p.x1, z = p.z1, y = p.y1 + 0.2;
    A.burst('foam', x, y, z, { color: '#fff1f6', speed: 2.5 });
    A.burst('confetti', x, y + 0.3, z, {});
    A.burst('hearts', x, y + 0.4, z, { count: 6 });
    A.fx('ring', x, z, { r0: 0.2, r1: 1.4, dur: 0.35, color: '#ffc6da', width: 0.3 });
    A.sfx('splat', { x, z, vol: 0.7, pitch: frand(1.05, 1.25) });
    const P = S.ctx.P, dmg = Math.max(2, Math.round((A.heroDamage() || 10) * 0.45));
    for (const e of A.enemiesNear(x, z, 1.4) || []) {
      if (!e || e.dead) continue;
      // Feza hep kahraman: Pasta Topu hiçbir huysuzu tek başına neşelendirmez (son dokunuş Feza'nın)
      const n = Math.min(e.boss ? Math.round(dmg * 0.5) : dmg, (e.hp | 0) - 1);
      if (n > 0) A.damage(e, n, { kind: 'pasta', fromX: P.pos.x, fromZ: P.pos.z, kb: 0.25 });
    }
  }

  // ── Polar Kalkan baloncuğu ──
  let SHIELD = null;
  function shieldMesh() {
    if (SHIELD) return SHIELD;
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uT: { value: 0 }, uA: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 w = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -w.xyz; gl_Position = projectionMatrix * w; }',
      fragmentShader: `uniform float uT, uA; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        float hs(vec2 p){ p.y -= 0.25*sqrt(abs(p.x)); return length(p) - 0.32; }
        void main(){
          float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
          float rim = pow(f, 2.2);
          vec2 uv = vec2(atan(vP.x, vP.z) * 2.6, vP.y * 3.2 - uT * 0.5);
          vec2 cell = fract(uv) - 0.5; float h = smoothstep(0.04, -0.02, hs(cell * vec2(1.0, -1.0) * 1.4));
          float fuzz = 0.5 + 0.5 * sin(vP.y * 40.0 + uT * 3.0) * sin(atan(vP.x, vP.z) * 30.0);
          vec3 col = mix(vec3(1.0, 0.42, 0.38), vec3(1.0, 0.75, 0.85), rim);
          float a = (0.025 + 0.7 * rim + 0.16 * h * (0.25 + 0.75 * rim) + 0.03 * fuzz * rim) * uA;
          gl_FragColor = vec4(col * a * 1.6, 1.0);
        }`,
    });
    SHIELD = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), m);
    SHIELD.frustumCulled = false; SHIELD.renderOrder = 30; SHIELD.visible = false;
    return keep(SHIELD);
  }

  // ── Animasyon ──
  function applyPose(p) {
    const B = S.B;
    B.root.position.set(p[C.bX], p[C.bY], p[C.bZ]); B.root.rotation.set(p[C.bRX], p[C.bRY], p[C.bRZ]);
    B.hips.rotation.set(p[C.pRX], p[C.pRY], p[C.pRZ]);
    B.chest.rotation.set(p[C.cRX], p[C.cRY], p[C.cRZ]);
    B.head.rotation.set(p[C.kRX], p[C.kRY], p[C.kRZ]);
    B.armL.rotation.set(p[C.aLX], p[C.aLY], p[C.aLZ]); B.foreL.rotation.set(p[C.fL], 0, p[C.fLZ]); B.handL.rotation.set(p[C.wLX], 0, p[C.wLZ]);
    B.armR.rotation.set(p[C.aRX], p[C.aRY], p[C.aRZ]); B.foreR.rotation.set(p[C.fR], 0, p[C.fRZ]); B.handR.rotation.set(p[C.wRX], 0, p[C.wRZ]);
    B.thighL.rotation.set(p[C.tLX], p[C.tLY], p[C.tLZ]); B.shinL.rotation.set(p[C.sL], 0, 0); B.footL.rotation.set(p[C.ftL], 0, 0);
    B.thighR.rotation.set(p[C.tRX], p[C.tRY], p[C.tRZ]); B.shinR.rotation.set(p[C.sR], 0, 0); B.footR.rotation.set(p[C.ftR], 0, 0);
  }
  function idlePose(p, t) {
    p.set(BASE);
    const br = Math.sin(t * 2.1), sw = Math.sin(t * 0.7);
    // nefes + ağırlık bir ayakta (kontrapost), yavaşça diğerine geçer
    p[C.cRX] += 0.022 * br; p[C.aLZ] += 0.018 * br; p[C.aRZ] -= 0.018 * br; p[C.bY] += 0.004 * br; p[C.kRX] -= 0.014 * br;
    const wgt = Math.sin(t * 0.35) * 0.9;
    p[C.pRZ] = 0.045 * wgt; p[C.bX] = -0.018 * wgt; p[C.cRZ] = -0.035 * wgt; p[C.kRZ] = 0.04 * wgt + 0.02 * Math.sin(t * 0.9 + 1);
    p[C.tLZ] += -0.04 * wgt; p[C.tRZ] += -0.04 * wgt;
    p[C.sL] = 0.12 * Math.max(0, wgt) + 0.02; p[C.tLX] = -0.06 * Math.max(0, wgt);
    p[C.sR] = 0.12 * Math.max(0, -wgt) + 0.02; p[C.tRX] = -0.06 * Math.max(0, -wgt);
    p[C.bY] -= 0.006 * Math.abs(wgt);
    p[C.kRY] = 0.05 * sw;
  }
  function walkPose(p, ph, m, run) {
    p.set(BASE);
    const s = Math.sin(ph), c = Math.cos(ph), A = lerp(0.48, 0.8, run);
    p[C.bY] = m * (lerp(0.022, 0.06, run) * Math.abs(c) - lerp(0.012, 0.035, run)); p[C.bRX] = lerp(0.04, 0.17, run) * m;
    p[C.pRY] = 0.14 * s * m; p[C.cRY] = -0.2 * s * m; p[C.pRZ] = lerp(0.07, 0.04, run) * c * m; p[C.cRZ] = -0.03 * c * m;
    p[C.kRX] = -0.04 - 0.12 * run * m; p[C.kRY] = 0.07 * s * m;
    p[C.tLX] = -A * s * m; p[C.tRX] = A * s * m;
    p[C.sL] = m * (0.12 + lerp(0.7, 1.35, run) * Math.pow(Math.max(0, -c), 0.8)); p[C.sR] = m * (0.12 + lerp(0.7, 1.35, run) * Math.pow(Math.max(0, c), 0.8));
    p[C.ftL] = 0.2 * Math.max(0, s) * m; p[C.ftR] = 0.2 * Math.max(0, -s) * m;
    p[C.aLX] = 0.04 + lerp(0.45, 0.85, run) * s * m; p[C.aLZ] = 0.12 + 0.05 * run; p[C.fL] = -0.25 - lerp(0.3, 1.25, run) * m;
    p[C.aRX] = 0.04 - lerp(0.45, 0.85, run) * s * m; p[C.aRZ] = -0.12 - 0.05 * run; p[C.fR] = -0.25 - lerp(0.3, 1.25, run) * m;
  }
  const FIDGETS = ['look', 'tuck', 'hips', 'clasp', 'wave'];
  function fidget(p, name, u, E) {
    const ss = Math.sin(u * TAU);
    if (name === 'look') { p[C.kRY] += 0.5 * ss * E; face.look = E; face.lookX = ss * 1.1 * E; }
    else if (name === 'tuck') { const k = bump(u, 0, 0.25, 0.7, 1); mixK(p, POSE.tuck, k * E); face.happy = 0; face.squint = 0.25 * k; }
    else if (name === 'hips') { mixK(p, POSE.hips, E); p[C.pRZ] += 0.04 * Math.sin(u * TAU * 2) * E; face.grin = 0.45 * E; face.browR = 0.4 * E; }
    else if (name === 'clasp') { mixK(p, POSE.clasp, E); p[C.kRZ] += 0.08 * ss * E; face.happy = 0.8 * E; face.blush = E; }
    else if (name === 'wave') { mixK(p, POSE.wave, E); p[C.fR] += 0.45 * Math.sin(u * Math.PI * 10) * E; p[C.aRY] = 0.3 * Math.sin(u * Math.PI * 10) * E; face.grin = E; face.happy = E; }
  }
  // kolu dünya noktasına uzat (düz kol): kemiğin ebeveyn uzayında yön → (x, z) Euler
  function aimArm(bone, target, w, out) {
    bone.parent.updateWorldMatrix(true, false);
    _v.copy(target); bone.parent.worldToLocal(_v); _v.sub(bone.position);
    const L = _v.length(); if (L < 1e-4) return;
    _v.divideScalar(L);
    const z = Math.asin(clamp(_v.x, -1, 1)), cz = Math.max(1e-3, Math.cos(z)), x = Math.atan2(-_v.z / cz, -_v.y / cz);
    out[0] = x; out[1] = z; out[2] = w;
  }
  const AIM = { L: [0, 0, 0], R: [0, 0, 0] };

  function animate(dt) {
    const t = S.t, P = M.P, Q = M.Q, act = S.act;
    for (const k in face) face[k] = 0;
    const mv = clamp(S.vel / 5.2, 0, 1), run = sstep(2.6, 4.6, S.vel);
    M.wMove = damp(M.wMove, S.vel > 0.25 ? 1 : 0, 10, dt);
    // adım hızı yürüme hızına bağlı (ayak kaymasın): bir döngüde ~4·bacak·sin(genlik) metre
    M.ph += dt * (S.vel > 0.05 ? clamp(TAU * S.vel / (4 * 0.78 * Math.sin(lerp(0.48, 0.8, run))), 4.5, 15) : 0);
    idlePose(P, t);
    if (M.wMove > 0.01) { walkPose(Q, M.ph, Math.max(0.35, mv), run); for (let i = 0; i < NCH; i++) P[i] += (Q[i] - P[i]) * M.wMove; }
    // boşta kıpırdanmalar
    M.idleT = M.wMove < 0.1 && !act ? M.idleT + dt : 0;
    let fidTarget = 0;
    if (M.idleT > 3) {
      const ft = M.idleT - 3, per = 5.5, len = 3, i = Math.floor(ft / per), u = (ft - i * per) / len;
      if (u < 1) { M.fid = (i * 3 + 1) % FIDGETS.length; M.fidU = u; fidTarget = 1; }
    }
    M.fidW = damp(M.fidW, fidTarget, fidTarget ? 5 : 9, dt);
    if (M.fidW > 0.01 && M.fid >= 0) fidget(P, FIDGETS[M.fid], M.fidU, M.fidW * bump(M.fidU, 0, 0.15, 0.85, 1));
    face.grin = Math.max(face.grin, 0.15);
    if (S.expr && S.t < S.expr.until) {   // hikâye ifadesi (HALA.expr)
      const n = S.expr.name, w = Math.min(1, (S.expr.until - S.t) / 0.25, (S.t - S.expr.from) / 0.2);
      if (n === 'mutlu') { face.happy = w; face.grin = w; face.blush = w; }
      else if (n === 'saskin') { face.o = w; face.browR = w; face.squint = 0; face.grin = 0; }
      else if (n === 'sevgi') { face.calm = w; face.grin = 0.5 * w; face.blush = w; }
      else if (n === 'merak') { face.browR = 0.7 * w; face.browW = 0.3 * w; face.look = w; face.lookX = 0.6; face.lookY = 0.3; }
      else if (n === 'uzgun') { face.browW = w; face.grin = 0; face.squint = 0.2 * w; }
    }
    // eylem pozları
    AIM.L[2] = AIM.R[2] = 0;
    if (act) actPose(act, P, Q, t, dt);
    // Feza'ya bak (baş + göz)
    if (S.look && (!act || act.look)) {
      const dx = S.look.x - S.x, dz = S.look.z - S.z, a = angDiff(S.face, Math.atan2(dx, dz));
      const k = clamp(a, -1.1, 1.1);
      P[C.kRY] += k * 0.65; P[C.cRY] += k * 0.25;
      face.look = Math.max(face.look, 0.6); face.lookX = clamp(k * 1.2, -1, 1);
      const dd = Math.hypot(dx, dz); face.lookY = clamp(-0.5 + 0.3 * sstep(0.5, 4, dd), -1, 1);
      P[C.kRX] += 0.18 * (1 - sstep(0.5, 3, dd));
    }
    if (S.qaPose && POSE[S.qaPose.name]) mixK(P, POSE[S.qaPose.name], S.qaPose.w);
    // yumuşatma: eylem geçişlerinde ani sıçrama olmasın (gövde dönüşü açı olarak)
    const PS = M.PS || (M.PS = Float32Array.from(P));
    if (dt <= 0) PS.set(P);
    else {
      const ks = 1 - Math.exp(-dt * 20);
      for (let i = 0; i < NCH; i++) PS[i] += (i === C.bRY ? angDiff(PS[i], P[i]) : P[i] - PS[i]) * ks;
    }
    applyPose(PS);
    // kol hedefleme (el ele, kaldırma)
    if (AIM.L[2] > 0.01 || AIM.R[2] > 0.01) {
      S.root.updateMatrixWorld(true);
      for (const sd of ['L', 'R']) {
        const a = AIM[sd]; if (a[2] <= 0.01) continue;
        const arm = S.B['arm' + sd], fore = S.B['fore' + sd];
        const tx = arm.rotation.x, tz = arm.rotation.z;
        aimArm(arm, a.target, a[2], a);
        arm.rotation.set(lerp(tx, a[0], a[2]), arm.rotation.y * (1 - a[2]), lerp(tz, a[1], a[2]));
        fore.rotation.x *= 1 - a[2] * 0.85; fore.rotation.z *= 1 - a[2];
      }
    }
    // ── yüz ──
    M.blinkT -= dt;
    if (M.blinkT <= 0) { M.blinkDur = 0.16; M.blinkT = Math.random() < 0.2 ? 0.28 : 2 + Math.random() * 3.5; }
    let bl = 0;
    if (M.blinkDur > 0) { M.blinkDur -= dt; const u = 1 - M.blinkDur / 0.16; bl = u < 0.35 ? u / 0.35 : u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5; }
    const closed = clamp(face.happy + face.calm, 0, 1);
    const blink = Math.max(bl * (1 - closed), face.blink);
    const k = 1 - Math.exp(-20 * dt);
    M.eyeW.x += (clamp(1 - closed, 0, 1) - M.eyeW.x) * k; M.eyeW.y += (clamp(face.happy, 0, 1) - M.eyeW.y) * k; M.eyeW.z += (clamp(face.calm, 0, 1) - M.eyeW.z) * k;
    // konuşma: Aytuğ Hala anlatıcıdır; bir cümle çalarken ağzı oynar
    const talking = typeof AUD !== 'undefined' && AUD && AUD.current ? 1 : 0;
    M.talk = damp(M.talk, talking, 12, dt);
    M.talkPh += dt * (9 + 3 * Math.sin(t * 1.7));
    const syll = M.talk * (0.35 + 0.65 * Math.abs(Math.sin(M.talkPh)) * (0.6 + 0.4 * Math.sin(M.talkPh * 0.37 + 1)));
    const grin = clamp(face.grin, 0, 1), openW = clamp(Math.max(sstep(0.35, 0.6, grin), M.talk * 0.999), 0, 1);
    const dep = clamp(Math.max(grin * 0.8, syll * 0.75 + face.o * 0.6), 0, 1), wid = clamp(Math.max(grin, 0.25 + 0.3 * syll), 0, 1);
    M.mouth.x += (1 - openW - M.mouth.x) * k; M.mouth.y += (openW - M.mouth.y) * k;
    M.mouth.z += (dep - M.mouth.z) * Math.min(1, k * 1.6); M.mouth.w += (wid - M.mouth.w) * k;
    M.brow.x += (face.browR + 0.25 * M.talk * Math.abs(Math.sin(M.talkPh * 0.5)) - M.brow.x) * k; M.brow.y += (face.browW - M.brow.y) * k;
    M.brow.z += (Math.max(face.blush, 0.25) - M.brow.z) * k;
    M.squint += (face.squint - M.squint) * k;
    M.sacT -= dt;
    if (M.sacT <= 0) { M.sacT = 0.6 + Math.random() * 2.2; M.sacX = (Math.random() - 0.5) * 0.45; M.sacY = (Math.random() - 0.5) * 0.25; }
    let lx = M.sacX, ly = M.sacY + 0.05;
    if (face.look) { lx = lerp(lx, face.lookX, face.look); ly = lerp(ly, face.lookY, face.look); }
    else if (typeof camera !== 'undefined') {   // boşken kameraya (oyuncuya) sıcak bakış
      S.headC.getWorldPosition(_w); _v.copy(camera.position); S.headC.worldToLocal(_v);
      if (_v.z > 0.05) { lx = lerp(lx, clamp(Math.atan2(_v.x, _v.z) / 0.6, -1, 1), 0.7); ly = lerp(ly, clamp(Math.atan2(_v.y, Math.hypot(_v.x, _v.z)) / 0.8, -1, 1), 0.6); }
    }
    M.lookX = damp(M.lookX, clamp(lx, -1, 1), 16, dt); M.lookY = damp(M.lookY, clamp(ly, -1, 1), 16, dt);
    U.hzEye.value.set(blink, M.lookX, M.lookY, M.squint);
    U.hzEyeW.value.copy(M.eyeW); U.hzMouth.value.copy(M.mouth); U.hzBrow.value.copy(M.brow);
    S.root.updateMatrixWorld(true);
    // ── saç yayı + ceket eteği ──
    S.headC.getWorldPosition(_v);
    if (!M.hPrev || dt <= 0) { M.hPrev = (M.hPrev || v3()).copy(_v); M.hPrevV.set(0, 0, 0); }
    else {
      _w.copy(_v).sub(M.hPrev).divideScalar(dt);
      const acc = _a.copy(_w).sub(M.hPrevV).divideScalar(dt); M.hPrevV.copy(_w); M.hPrev.copy(_v);
      if (acc.lengthSq() > 900) acc.setLength(30);
      S.B.head.getWorldQuaternion(_q).invert(); acc.applyQuaternion(_q);
      const tz = -0.012 * run;
      // kıvırcık bukleler: daha yumuşak, daha az sönümlü yay → adımlarda hafifçe zıplar
      M.hVel.x += (-(M.hOff.x) * 95 - M.hVel.x * 5 - acc.x * 0.4) * dt;
      M.hVel.y += (-(M.hOff.y) * 95 - M.hVel.y * 4.5 - acc.y * 0.45) * dt;
      M.hVel.z += (-(M.hOff.z - tz) * 95 - M.hVel.z * 5 - acc.z * 0.4) * dt;
      M.hOff.addScaledVector(M.hVel, dt);
      if (M.hOff.length() > 0.045) M.hOff.setLength(0.045);
    }
    HU.hzOff.value.copy(M.hOff);
    const jump = S.y > 0.02 ? 1 : 0;
    M.flare = damp(M.flare, 0.006 * mv + (act && act.k === 'dance' ? 0.012 : 0) + 0.01 * jump, 5, dt);
    M.cOff.set(0, 0.004 * jump - 0.003 * run * Math.abs(Math.sin(M.ph)), -0.012 * mv);
    CU.hzOff.value.copy(M.cOff); CU.hzFlare.value = M.flare;
  }

  // ── Eylemler ──
  function startAct(k, o = {}) {
    if (S.act && S.act.end) { try { S.act.end(S.act, true); } catch (e) { /* yut */ } }
    S.act = Object.assign({ k, t: 0, ph: 0, phT: 0, look: false }, o);
    if (S.held) S.held.visible = false;
    if (SHIELD) SHIELD.visible = false;
    return S.act;
  }
  function endAct() {
    const a = S.act; S.act = null;
    if (S.held) S.held.visible = false;
    if (SHIELD) SHIELD.visible = false;
    if (a && a.end) { try { a.end(a, false); } catch (e) { /* yut */ } }
  }
  function actPose(a, P, Q, t, dt) {
    const u = a.dur ? clamp(a.t / a.dur, 0, 1) : 0;
    switch (a.k) {
      case 'throw': {
        const k = a.t;
        if (k < 0.38) mixK(P, POSE.throwA, easeOut(k / 0.3));
        else if (k < 0.6) { Q.set(P); mixK(Q, POSE.throwA, 1); mixK(Q, POSE.throwB, easeIO((k - 0.38) / 0.16)); P.set(Q); }
        else { mixK(P, POSE.throwB, 1 - sstep(0.6, 1.05, k)); }
        face.grin = 0.9; face.browR = 0.6; if (k > 0.35 && k < 0.55) face.squint = 0.3;
        break;
      }
      case 'hug': {
        const w = a.ph === 1 ? sstep(0, 0.35, a.phT) : a.ph === 2 ? 1 - sstep(0, 0.4, a.phT) : 0;
        if (w > 0) {
          mixK(P, POSE.hug, w);
          P[C.cRZ] += 0.07 * Math.sin(t * 3.2) * w; P[C.kRZ] += 0.05 * Math.sin(t * 3.2 + 0.5) * w;
          face.calm = w; face.grin = 0.55 * w; face.blush = w; face.browW = 0.25 * w;
        } else { face.grin = 0.3; face.browW = 0.5; face.browR = 0.3; }
        break;
      }
      case 'lift': {
        if (a.ph === 0) { face.browW = 0.6; face.o = 0.4; break; }
        const kn = a.ph === 1 ? sstep(0, 0.45, a.phT) : a.ph === 2 ? 1 - easeIO(a.phT / 0.55) : 0;
        mixK(P, POSE.kneel, kn);
        if (a.ph >= 1 && a.ph <= 2) { AIM.R.target = a.hand; AIM.R[2] = a.ph === 1 ? sstep(0.15, 0.55, a.phT) : 1 - sstep(0.3, 0.6, a.phT); P[C.cRX] += 0.15 * kn; }
        if (a.ph === 2) { P[C.cRX] -= 0.15 * Math.sin(Math.min(1, a.phT / 0.4) * Math.PI); }
        if (a.ph === 3) { mixK(P, POSE.cheer, bump(a.phT, 0, 0.15, 0.6, 0.9) * 0.7); face.happy = 1; face.grin = 1; }
        else { face.grin = 0.75; face.browR = 0.5; face.blush = 0.6; }
        break;
      }
      case 'point': {
        const w = bump(u, 0, 0.12, 0.85, 1);
        mixK(P, POSE.point, w);
        P[C.wRX] += 0.15 * Math.sin(a.t * 9) * w;
        face.grin = 0.8 * w; face.browR = 0.7 * w; face.look = w; face.lookX = 0; face.lookY = 0.1;
        break;
      }
      case 'clap': {
        const w = bump(u, 0, 0.15, 0.82, 1), c = Math.sin(a.t * 17);
        Q.set(P);
        mixK(Q, K({ aLX: -1.0, aLY: -0.26, aLZ: 0.05, fL: -0.75, fLZ: -0.2, aRX: -1.0, aRY: 0.26, aRZ: -0.05, fR: -0.75, fRZ: 0.2, wLZ: 0.0, wRZ: 0.0, wLX: -0.2, wRX: -0.2, kRX: -0.06 }), 1);
        const op = 0.5 + 0.5 * c; Q[C.aLY] += 0.2 * op; Q[C.aRY] -= 0.2 * op; Q[C.bY] += 0.012 * (1 - op);
        for (let i = 0; i < NCH; i++) P[i] += (Q[i] - P[i]) * w;
        face.happy = w; face.grin = w; face.browR = 0.7 * w; face.blush = 0.8 * w;
        break;
      }
      case 'cheer': {
        const w = bump(u, 0, 0.1, 0.85, 1), j = Math.abs(Math.sin(a.t * 7));
        mixK(P, POSE.cheer, w); P[C.aLZ] += 0.15 * Math.sin(a.t * 14) * w; P[C.aRZ] -= 0.15 * Math.sin(a.t * 14) * w;
        S.y = 0.16 * j * w; P[C.sL] += 0.5 * (1 - j) * w; P[C.sR] += 0.5 * (1 - j) * w; P[C.tLX] -= 0.2 * (1 - j) * w; P[C.tRX] -= 0.2 * (1 - j) * w;
        face.happy = w; face.grin = w; face.browR = w; face.blush = w;
        break;
      }
      case 'shield': {
        const w = a.ph === 0 ? 0 : bump(a.phT / a.hold, 0, 0.1, 0.88, 1);
        if (a.ph === 0) { face.browW = 0.7; face.o = 0.5; break; }
        mixK(P, POSE.shield, w); P[C.aLZ] += 0.05 * Math.sin(a.t * 6) * w; P[C.aRZ] -= 0.05 * Math.sin(a.t * 6) * w;
        face.grin = 0.85 * w; face.browR = 0.3 * w; face.browW = 0.3 * w; face.squint = 0.2 * w;
        break;
      }
      case 'team': {
        // el ele: sağ el Feza'nın sol eliyle buluşur; tepede serbest kol havaya
        const crouch = a.ph === 1 ? sstep(0, 0.18, a.phT) : a.ph === 3 ? 1 - sstep(0, 0.25, a.phT) : 0;
        if (crouch > 0) { Q.set(P); mixK(Q, K({ bY: -0.12, tLX: -0.6, sL: 0.95, ftL: -0.3, tRX: -0.6, sR: 0.95, ftR: -0.3, bRX: 0.08, cRX: 0.12 }), 1); for (let i = 0; i < NCH; i++) P[i] += (Q[i] - P[i]) * crouch; }
        if (a.ph === 2) { const up = Math.sin(clamp(a.phT / a.air, 0, 1) * Math.PI); P[C.aLX] = lerp(P[C.aLX], -2.7, up); P[C.aLZ] = lerp(P[C.aLZ], 0.45, up); P[C.fL] = lerp(P[C.fL], -0.3, up);
          P[C.tLX] -= 0.4 * up; P[C.sL] += 0.7 * up; P[C.tRX] -= 0.1 * up; P[C.sR] += 0.4 * up; }
        if (a.meet) { AIM.R.target = a.meet; AIM.R[2] = a.ph >= 4 ? 1 - sstep(0, 0.3, a.phT) : sstep(0, 0.15, a.t); }
        face.happy = a.ph === 2 ? 1 : 0.6; face.grin = 1; face.blush = 1; face.browR = 0.8;
        break;
      }
      case 'boost': {
        if (a.ph === 1) mixK(P, POSE.squat, sstep(0, 0.3, a.phT));
        else if (a.ph === 2) { const k = sstep(0, 0.22, a.phT); Q.set(P); mixK(Q, POSE.squat, 1 - k); mixK(Q, POSE.cheer, k); for (let i = 0; i < NCH; i++) P[i] = Q[i]; }
        else if (a.ph === 3) { mixK(P, POSE.cheer, 1 - sstep(0.2, 0.7, a.phT)); }
        face.grin = 1; face.happy = a.ph === 2 ? 0.7 : 0; face.browR = 0.8;
        break;
      }
      case 'wave': {
        const w = bump(u, 0, 0.12, 0.85, 1);
        mixK(P, POSE.wave, w); P[C.fR] += 0.45 * Math.sin(a.t * 11) * w; P[C.aRY] = 0.3 * Math.sin(a.t * 11) * w;
        face.grin = w; face.happy = 0.6 * w; face.browR = 0.6 * w;
        break;
      }
      case 'goto': break;
      case 'pet': {
        const w = a.ph === 1 ? bump(a.phT / 2.4, 0, 0.15, 0.85, 1) : 0;
        if (w > 0) { mixK(P, POSE.pet, w); if (a.head) { AIM.R.target = a.head; AIM.R[2] = w; } }
        face.happy = 0.8 * w; face.grin = 0.6 + 0.4 * w; face.blush = w;
        break;
      }
      case 'dance': {
        const w = bump(u, 0, 0.08, 0.92, 1), bt = a.t * 5.2, s1 = Math.sin(bt), s2 = Math.sin(bt * 2);
        Q.set(P);
        Q[C.pRZ] = 0.13 * s1; Q[C.bX] = 0.05 * s1; Q[C.cRZ] = -0.1 * s1; Q[C.kRZ] = 0.12 * s1;
        Q[C.bY] = -0.03 + 0.035 * Math.abs(s2);
        Q[C.sL] = 0.25 + 0.25 * Math.max(0, s1); Q[C.sR] = 0.25 + 0.25 * Math.max(0, -s1); Q[C.tLX] = -0.15 * Math.max(0, s1); Q[C.tRX] = -0.15 * Math.max(0, -s1);
        const arms = Math.floor(a.t / 1.6) % 3;
        if (arms === 0) { Q[C.aLX] = -2.6; Q[C.aLZ] = 0.5 + 0.25 * s1; Q[C.fL] = -0.4; Q[C.aRX] = -2.6; Q[C.aRZ] = -0.5 + 0.25 * s1; Q[C.fR] = -0.4; Q[C.wLZ] = 0.4 * s2; Q[C.wRZ] = 0.4 * s2; }
        else if (arms === 1) { Q[C.aLX] = -1.2 + 0.5 * s1; Q[C.aLZ] = 0.6; Q[C.fL] = -1.6; Q[C.aRX] = -1.2 - 0.5 * s1; Q[C.aRZ] = -0.6; Q[C.fR] = -1.6; Q[C.cRY] = 0.25 * s1; }
        else { Q[C.aRX] = -2.8; Q[C.aRZ] = -0.2; Q[C.fR] = -0.2 + 0.4 * s2; Q[C.aLX] = 0.2; Q[C.aLZ] = 0.55; Q[C.fL] = -1.8; Q[C.fLZ] = 0.3; Q[C.bRY] = 0; }
        if (arms === 2) Q[C.bRY] = TAU * easeIO(clamp((a.t % 1.6) / 1.0, 0, 1));   // fırıl fırıl dönüş
        for (let i = 0; i < NCH; i++) P[i] += (Q[i] - P[i]) * w;
        face.happy = 0.7 * w; face.grin = w; face.blush = w; face.browR = 0.7 * w;
        break;
      }
    }
  }

  // Feza'nın kolları (FEZA modelinin genel kemikleri: H.bones.armL/R, foreL/R; Feza'nın kendi pozundan SONRA, aynı karede)
  function fezaArms(H, w, aX, aY, aZ, fX, fZ) {
    const B = H && H.bones; if (!B || !B.armL || !B.armR || w <= 0.001) return;
    B.armL.rotation.x = lerp(B.armL.rotation.x, aX, w); B.armL.rotation.y = lerp(B.armL.rotation.y, -aY, w); B.armL.rotation.z = lerp(B.armL.rotation.z, aZ, w);
    B.armR.rotation.x = lerp(B.armR.rotation.x, aX, w); B.armR.rotation.y = lerp(B.armR.rotation.y, aY, w); B.armR.rotation.z = lerp(B.armR.rotation.z, -aZ, w);
    if (B.foreL) { B.foreL.rotation.x = lerp(B.foreL.rotation.x, fX, w); B.foreL.rotation.z = lerp(B.foreL.rotation.z, -fZ, w); }
    if (B.foreR) { B.foreR.rotation.x = lerp(B.foreR.rotation.x, fX, w); B.foreR.rotation.z = lerp(B.foreR.rotation.z, fZ, w); }
  }
  const fezaHug = (H, w) => fezaArms(H, w, -1.75, 0.55, 0.2, -0.5, 0.9);
  const fezaUp = (H, w) => fezaArms(H, w, -2.7, 0, 0.35, -0.25, 0);

  // ── Yapay zekâ ──
  const VAR = {
    hug: ['hala_saril', 'hala_saril2', 'hala_saril3', 'hala_saril4', 'hala_saril5'],
    kalk: ['hala_kalk', 'hala_kalk2', 'hala_kalk3', 'hala_kalk4'], kalkti: ['hala_kalkti', 'hala_kalkti2'],
    yon: ['hala_yon', 'hala_yon2', 'hala_yon3', 'hala_yon4', 'hala_yon5'],
    ovgu: ['hala_ovgu', 'hala_ovgu2', 'hala_ovgu3', 'hala_ovgu4', 'hala_ovgu5', 'hala_ovgu6', 'hala_ovgu7', 'hala_ovgu8', 'hala_ovgu9', 'hala_ovgu10', 'hala_ovgu11'],
    boss: ['hala_boss', 'hala_boss2'], dans: ['hala_dans', 'hala_dans2'],
    takim: ['hala_takim', 'hala_takim2', 'hala_takim3', 'hala_takim4'], kalkan: ['hala_kalkan', 'hala_kalkan2', 'hala_kalkan3'],
    pasta: ['hala_pasta', 'hala_pasta2', 'hala_pasta3', 'hala_pasta4', 'hala_pasta5'], hop: ['hala_hop', 'hala_hop2', 'hala_hop3'],
  };
  function say(key, prio = 2) {
    const A = S.ctx && S.ctx.api;
    if (A && A.hasLine && A.hasLine(key)) return A.say(key, prio);
    return 0;
  }
  function sayVar(group, prio = 2) {   // aynı cümle art arda gelmesin
    const L = VAR[group].filter(k => !S.ctx || !S.ctx.api || S.ctx.api.hasLine(k));
    if (!L.length) return 0;
    let k = pick(L); if (L.length > 1 && k === S.lastKey[group]) k = pick(L.filter(x => x !== k));
    S.lastKey[group] = k;
    return say(k, prio);
  }
  const fezaY = () => 0;
  function free(A, x, z, r = 0.35) { try { return !A || !A.circleFree || A.circleFree(x, z, r) !== false; } catch (e) { return true; } }
  function poof(A, x, z) { if (A) { A.burst('sparkle', x, 1.0, z, { color: '#ffd6e2', count: 14 }); A.burst('hearts', x, 1.2, z, { count: 4 }); } }
  function teleportNear(A, P, ox, oz) {
    const tries = [[ox, oz], [-ox, oz], [ox * 0.6, oz - 0.6], [0, -1.3], [1.2, 0], [-1.2, 0], [0, 1.2]];
    S.tpN = (S.tpN || 0) + 1;
    for (const [dx, dz] of tries) { const x = P.pos.x + dx, z = P.pos.z + dz; if (free(A, x, z)) { poof(A, S.x, S.z); S.x = x; S.z = z; poof(A, x, z); S.stuck = 0; return true; } }
    S.x = P.pos.x + ox; S.z = P.pos.z + oz; return false;
  }
  function moveTo(A, tx, tz, maxSpd, dt, arrive = 0.25) {
    const dx = tx - S.x, dz = tz - S.z, d = Math.hypot(dx, dz);
    const want = d < arrive ? 0 : Math.min(maxSpd, d * 2.4 + 0.4);
    S.vel = damp(S.vel, want, want > S.vel ? 6 : 9, dt);
    if (S.vel < 0.02 || d < 1e-4) return d;
    const st = Math.min(d, S.vel * dt), ux = dx / d, uz = dz / d, p = { x: S.x, z: S.z };
    if (A && A.moveXZ) { try { A.moveXZ(p, ux * st, uz * st, 0.33); } catch (e) { p.x += ux * st; p.z += uz * st; } } else { p.x += ux * st; p.z += uz * st; }
    const moved = Math.hypot(p.x - S.x, p.z - S.z);
    S.stuck = moved < st * 0.3 && d > 1 ? S.stuck + dt : Math.max(0, S.stuck - dt * 2);
    S.x = p.x; S.z = p.z;
    if (S.vel > 0.4) S.face = dampAngle(S.face, Math.atan2(ux, uz), 10, dt);
    return d;
  }
  function faceTo(x, z, dt, k = 8) { S.face = dampAngle(S.face, Math.atan2(x - S.x, z - S.z), k, dt); }
  // Feza'nın yanında, biraz arkasında (kameradan bakınca onu örtmeyen) yer; yolunu kesmez
  function followSpot(P, A) {
    const sp = Math.hypot(S.fvx, S.fvz), mx = sp > 0.3 ? S.fvx / sp : 0, mz = sp > 0.3 ? S.fvz / sp : 0;
    const spot = s => {
      let ox = s * 1.15, oz = -0.65;
      const dot = ox * mx + oz * mz;
      if (dot > 0) { ox -= mx * (dot + 0.6); oz -= mz * (dot + 0.6); }   // önüne geçme: hareket yönünün arkasına
      if (oz > 0.1 && Math.abs(ox) < 1.0) ox = (ox >= 0 ? 1 : -1) * (s > 0 ? 1 : 1) * 1.0;   // kameradan bakınca Feza'nın önünü kapatma: yanda kal
      const l = Math.hypot(ox, oz) || 1, r = clamp(l, 1.1, 1.5);
      return { x: P.pos.x + ox / l * r, z: P.pos.z + oz / l * r };
    };
    let f = spot(S.side);
    const Bp = S.ctx && S.ctx.Bilbo && S.ctx.Bilbo.root ? S.ctx.Bilbo.root.position : null;   // Bilbo'nun üstüne basma
    if (Bp && Math.hypot(Bp.x - f.x, Bp.z - f.z) < 0.9 && S.t - (S.sideT || 0) > 2.5) { const g = spot(-S.side); if (free(A, g.x, g.z) && Math.hypot(Bp.x - g.x, Bp.z - g.z) > 1.2) { S.side = -S.side; S.sideT = S.t; f = g; } }
    if (!free(A, f.x, f.z)) { const g = spot(-S.side); if (free(A, g.x, g.z)) { S.side = -S.side; f = g; } else { const b = { x: P.pos.x - mx * 1.3, z: P.pos.z - mz * 1.3 - (sp > 0.3 ? 0 : 1.2) }; if (free(A, b.x, b.z)) f = b; } }
    return f;
  }
  function onScreenDist(P) { return Math.hypot(P.pos.x - S.x, P.pos.z - S.z); }

  function update(dt, ctx) {
    if (!S.root || !ctx || !ctx.P) return;
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    S.ctx = ctx; S.t += dt;
    const P = ctx.P, A = ctx.api, play = ctx.state === 'play' || ctx.state === 'dead';
    // Feza'nın hızı (yolunu kesmemek için)
    if (dt > 0) { const vx = (P.pos.x - S.fx) / dt, vz = (P.pos.z - S.fz) / dt; if (Math.hypot(vx, vz) < 30) { S.fvx = damp(S.fvx, vx, 8, dt); S.fvz = damp(S.fvz, vz, 8, dt); } }
    const fmoved = Math.hypot(P.pos.x - S.fx, P.pos.z - S.fz); S.fx = P.pos.x; S.fz = P.pos.z;
    // Feza kalktı (Hala kaldırdı ya da oyun kaldırdı): can en az %60, 2 s kısa koruma (birkaç kare daha denetlenir)
    if (S.wasDead && !P.dead) S.upGuard = 0.5;
    S.wasDead = !!P.dead;
    if (S.upGuard > 0) { S.upGuard -= dt; const min = Math.round((P.maxHp || 100) * 0.6); if (P.hp < min) P.hp = min; if (ctx.api && ctx.api.shield && !S.upShield) { ctx.api.shield(2); S.upShield = true; } }
    else S.upShield = false;
    if (ctx.L !== S.L) {   // yeni bölüm: Feza'nın yanında başla
      S.L = ctx.L; if (S.act) endAct(); S.side = 1;
      const f = followSpot(P, A); S.x = f.x; S.z = f.z; S.face = P.face || 0; S.vel = 0; S.still = 0; S.prevTele = false;
      S.cd.throw = 4; S.cd.point = 20; M.hPrev = null;
    }
    for (const k in S.cd) S.cd[k] = Math.max(0, S.cd[k] - dt);
    if (ctx.state === 'play') api.charge = Math.min(1, api.charge + dt * TEAM_FILL);
    if (api.charge >= 1) S.chargeWasFull = true;
    if (api.charge < 1) S.chargeWasFull = false;
    if (!S.hooked && typeof GAME !== 'undefined' && GAME && GAME.on) {   // oyun olaylarına sevinç
      S.hooked = true;
      GAME.on('levelup', () => { if (!S.act && S.ctx && !S.ctx.P.dead) startAct('cheer', { dur: 1.5 }); });
      GAME.on('lostItem', () => { if (!S.act || S.act.k === 'clap' || S.act.k === 'point') { startAct('cheer', { dur: 2 }); if (S.ctx) S.ctx.api.burst('hearts', S.x, 2.1, S.z, { count: 10 }); } });
    }
    for (let i = S.timers.length - 1; i >= 0; i--) { const tm = S.timers[i]; tm[0] -= dt; if (tm[0] <= 0) { S.timers.splice(i, 1); try { tm[1](); } catch (e) { /* yut */ } } }
    // bakış: Feza'ya ve oyuncuya (kameraya) sırayla; Feza koşarken/savaşta hep Feza'ya
    S.lookT = (S.lookT || 0) - dt;
    if (S.lookT <= 0) { S.lookFeza = !S.lookFeza; S.lookT = S.lookFeza ? 1.6 + Math.random() * 1.6 : 2.5 + Math.random() * 3; }
    const busyF = Math.hypot(S.fvx, S.fvz) > 1 || (ctx.enemies || []).some(e => e && !e.dead && e.aggro && Math.hypot(e.x - P.pos.x, e.z - P.pos.z) < 9);
    S.look = S.lookFeza || busyF || (S.act && S.act.look) ? (S.lookP || (S.lookP = { x: 0, z: 0 })) : null;
    if (S.look) { S.look.x = P.pos.x; S.look.z = P.pos.z; }
    S.y = 0;
    // Feza'yı havada bıraktıysak (yarıda kesilen zıplama/fırlatma) yere indir
    if (S.liftY && !(S.act && (S.act.k === 'team' || S.act.k === 'boost'))) { P.pos.y = 0; if (ctx.H) ctx.H.root.position.y = 0; S.liftY = false; }
    const dF = onScreenDist(P);
    // Feza sala/kaydırağa/tekneye bindi: Hala kremaya/suya girmez, kenarda bekler; Feza inince yanına gelir
    S.rideT = fezaRiding() ? (S.rideT || 0) + dt : 0;
    const riding = S.rideT > 0 && S.rideT < 25 && !P.dead;   // (25 s'den uzun "biniş" eski bölümden kalmış sayılır)
    if (riding) {
      if (!S.rideWait) { S.rideWait = true; if (S.act && S.act.k !== 'shield') endAct(); }
      S.vel = damp(S.vel, 0, 8, dt); faceTo(P.pos.x, P.pos.z, dt, 4);
      if (!S.act || S.act.k === 'shield') { if (S.act) runAct(S.act, dt, ctx); }
      piesStep(dt); S.mode = 'bekle'; animate(dt);
      S.root.position.set(S.x, S.y, S.z); S.root.rotation.y = S.face; S.root.scale.setScalar(HALA_SCALE);
      return;
    }
    if (S.rideWait) {   // indi: uzaksa kalpli parıltıyla yanına gel
      S.rideWait = false; S.stuck = 0;
      if (dF > 4) { const f = followSpot(P, A); if (free(A, f.x, f.z)) { poof(A, S.x, S.z); S.x = f.x; S.z = f.z; poof(A, f.x, f.z); } else teleportNear(A, P, S.side * 1.15, -0.65); }
    }
    if (S.act) runAct(S.act, dt, ctx);
    else if (ctx.title) {
      const f = { x: P.pos.x + 1.0, z: P.pos.z - 0.5 };
      if (Math.hypot(f.x - S.x, f.z - S.z) > 4) { S.x = f.x; S.z = f.z; }
      const d = moveTo(A, f.x, f.z, 3, dt, 0.2);
      if (d < 0.3) faceTo(S.x - 0.6, S.z + 4, dt, 3);   // başlıkta oyuncuya gülümser, ara sıra Feza'ya bakar
    } else {
      if (play && !P.dead) think(dt, ctx, fmoved);
      if (!S.act) {
        const f = followSpot(P, A), d = Math.hypot(f.x - S.x, f.z - S.z);
        const maxS = Math.max(3.2, Math.hypot(S.fvx, S.fvz) + (d > 3 ? 2.2 : 0.6));
        moveTo(A, f.x, f.z, d > 5 ? Math.max(7.5, Math.hypot(S.fvx, S.fvz) + 2.5) : maxS, dt, 0.35);
        if (S.vel < 0.5) faceTo(lerp(P.pos.x, f.x + (f.x - P.pos.x), 0.3), P.pos.z + 2, dt, 3);   // Feza'nın yanında, kameraya dönük
      }
    }
    // çok uzak ya da sıkıştı: Feza'nın yanına ışınlan (kalpli parıltıyla)
    if (!(S.act && S.act.k === 'goto') && (dF > 15 || (S.stuck > 1.6 && dF > 2.5))) teleportNear(A, P, S.side * 1.15, -0.65);
    piesStep(dt);
    S.mode = S.act ? S.act.k : 'follow';
    animate(dt);
    S.root.position.set(S.x, S.y, S.z); S.root.rotation.y = S.face;
    // kapıdan geçerken Feza ile birlikte küçülüp döner (yeni bölümde yine tam boy)
    const tr = ctx.state === 'transition' && ctx.H ? clamp(ctx.H.root.scale.x / (S.fezaScale || 1), 0.05, 1) : 1;
    if (ctx.state !== 'transition' && ctx.H) S.fezaScale = ctx.H.root.scale.x || 1;
    S.root.scale.setScalar(HALA_SCALE * tr);
    if (tr < 1) S.root.rotation.y += (1 - tr) * 9;
  }
  const HALA_SCALE = 1.06;
  function fezaRiding() {
    try {
      if (typeof ODAB !== 'undefined' && ODAB && ODAB.riding && ODAB.riding()) return true;
      const T = typeof ODAKIT !== 'undefined' && ODAKIT && ODAKIT.last;
      if (T && T.riding && (!T.L || !S.ctx || T.L === S.ctx.L)) return true;
    } catch (e) { /* yut */ }
    return false;
  }   // Feza ≈ 1,54 m (saçıyla), Hala ≈ 1,95 m
  function sayVar2(key, prio) { return say(key, prio); }
  const TEAM_FILL = 1 / 45;   // kendiliğinden dolum (/s); her neşelenen huysuz +0.06, boss +0.3

  // savaşta Pasta Topu, Feza durunca/kaybolunca yol gösterme, boss işaretinde kalkan
  function think(dt, ctx, fmoved) {
    const P = ctx.P, A = ctx.api, b = ctx.boss;
    // Polar Kalkan: boss vuruş işareti (yer işareti / hazırlık) belirince
    const tele = !!(b && !b.dead && b.aggro && (b.tele || b.state === 'windup'));
    if (tele && !S.prevTele && S.cd.shield <= 0 && Math.hypot(b.x - P.pos.x, b.z - P.pos.z) < 11) { S.prevTele = tele; startShield(ctx); return; }
    S.prevTele = tele;
    // bir yere gidilecek işaret kuyrukta: sakinse göster
    const fight = (ctx.enemies || []).some(e => e && !e.dead && e.aggro && Math.hypot(e.x - P.pos.x, e.z - P.pos.z) < 10);
    if (S.pointQ && (!fight || S.t - S.pointQ.at > 6)) { const q = S.pointQ; S.pointQ = null; startPoint(q.x, q.z, q.line); return; }
    // Pasta Topu
    if (fight && S.cd.throw <= 0) {
      let best = null, bd = 1e9;
      for (const e of ctx.enemies) {
        if (!e || e.dead || !e.aggro || (e.hp | 0) <= 1 || e.hidden || e.bur > 0.5) continue;
        const d = Math.hypot(e.x - S.x, e.z - S.z), dfz = Math.hypot(e.x - P.pos.x, e.z - P.pos.z);
        if (d > 10 || d < 1.5 || dfz > 10) continue;
        const s = d + (e.boss ? 3 : 0) + (dfz < 1.6 ? 2 : 0);   // Feza'nın burnunun dibindekini değil, yandakileri tercih et
        if (s < bd) { bd = s; best = e; }
      }
      if (best && (!A.los || A.los(S.x, S.z, best.x, best.z) !== false)) { startThrow(best, ctx); return; }
      S.cd.throw = 0.8;
    }
    // Feza bir süredir duruyorsa (kaybolduysa) yolu göster
    S.still = fmoved < 0.02 && !fight ? S.still + dt : Math.max(0, S.still - dt * 3);
    if (S.still > 14 && S.cd.point <= 0 && ctx.L && ctx.L.path && ctx.L.path.length > 2) {
      const path = ctx.L.path; let bi = 0, bd2 = 1e18;
      for (let i = 0; i < path.length; i++) { const d = dist2(path[i].x, path[i].z, P.pos.x, P.pos.z); if (d < bd2) { bd2 = d; bi = i; } }
      let tgt = path[Math.min(path.length - 1, bi + 3)];
      if (b && !b.dead && bi >= path.length - 3) tgt = { x: b.x, z: b.z };
      else if (ctx.L.exit && b && b.dead && Math.hypot(ctx.L.exit.x - P.pos.x, ctx.L.exit.z - P.pos.z) > 4) tgt = ctx.L.exit;
      if (tgt && Math.hypot(tgt.x - P.pos.x, tgt.z - P.pos.z) > 3) { S.still = 0; S.cd.point = 35; startPoint(tgt.x, tgt.z, Math.random() < 0.4 ? 'hala_burada' : null); return; }
      S.still = 0; S.cd.point = 20;
    }
    // Feza dinlenirken ara sıra Bilbo'yu sev
    const Bi = ctx.Bilbo && ctx.Bilbo.root;
    if (!fight && S.still > 5 && S.cd.pet <= 0 && Bi && Math.hypot(Bi.position.x - S.x, Bi.position.z - S.z) < 3.5) { S.cd.pet = 40 + Math.random() * 30; startAct('pet', { look: false }); return; }
    // ara sıra sevgi sözü (sakin anlarda, çok seyrek)
    if (!fight && S.cd.love <= 0 && fmoved > 0.01) { S.cd.love = 150 + Math.random() * 120; if (Math.random() < 0.5) say('hala_yaninda', 1); }
  }
  function startThrow(e, ctx) {
    S.cd.throw = (e.boss ? 6.5 : 4.2) + Math.random() * 2.5;
    const a = startAct('throw', { dur: 1.05, e, thrown: false });
    if (S.held) S.held.visible = true;
    if (S.cd.pasta <= 0 && Math.random() < 0.35) { S.cd.pasta = 25; sayVar('pasta', 1); }
    return a;
  }
  function startPoint(x, z, line) {
    const L = S.ctx && S.ctx.L, isExit = L && L.exit && Math.hypot(L.exit.x - x, L.exit.z - z) < 1.5 && S.ctx.boss && S.ctx.boss.dead;
    startAct('point', { dur: 2.4, tx: x, tz: z });
    if (line) say(line, 2); else if (isExit) say('hala_kapi', 2); else sayVar('yon', 2);
    const A = S.ctx && S.ctx.api;
    if (A) {   // yön boyunca parıltı izi
      const dx = x - S.x, dz = z - S.z, d = Math.hypot(dx, dz) || 1;
      for (let i = 1; i <= 4; i++) { const k = i * 0.9; S.timers.push([0.25 + i * 0.12, () => A.burst('sparkle', S.x + dx / d * (k + 0.6), 1.2, S.z + dz / d * (k + 0.6), { color: '#ffe59a', count: 6 })]); }
    }
  }
  function startShield(ctx) {
    S.cd.shield = 14;
    startAct('shield', { hold: 2.6 });
    sayVar('kalkan', 3);
  }
  function runAct(a, dt, ctx) {
    const P = ctx.P, A = ctx.api;
    a.t += dt; a.phT += dt;
    const next = () => { a.ph++; a.phT = 0; };
    switch (a.k) {
      case 'throw': {
        S.vel = damp(S.vel, 0, 10, dt);
        const e = a.e; if (e && !e.dead) faceTo(e.x, e.z, dt, 12);
        if (!a.thrown && a.t >= 0.47) {
          a.thrown = true; if (S.held) S.held.visible = false;
          S.handR.getWorldPosition(_v);
          if (e && !e.dead) { throwPie(_v.x, _v.y, _v.z, e); A.sfx('whoosh', { x: S.x, z: S.z, vol: 0.5, pitch: 1.3 }); }
        }
        if (a.t >= a.dur) endAct();
        break;
      }
      case 'hug': {
        // 0: koş, 1: sarıl, 2: bırak
        // Feza'nın yanına (kameradan ikisi de görünsün) diz çöker, Feza ona döner ve kollarını boynuna dolar
        if (a.s === undefined) a.s = S.x < P.pos.x ? -1 : 1;
        const hx = P.pos.x + a.s * 0.44, hz = P.pos.z - 0.06;
        if (a.ph === 0) {
          const d = moveTo(A, hx, hz, 7.5, dt, 0.05);
          if (d > 0.6) a.look = false; else { a.look = true; faceTo(P.pos.x, P.pos.z, dt, 14); }
          if (d < 0.12 || a.phT > 2.4) { if (d > 1.2) poof(A, hx, hz); S.x = hx; S.z = hz; next(); A.shield(2.3); A.sfx('heart', { vol: 0.6 }); a.healed = 0; a.ax = P.pos.x; a.az = P.pos.z; }
        } else if (a.ph === 1) {
          S.vel = 0; S.x = damp(S.x, hx, 10, dt); S.z = damp(S.z, hz, 10, dt); faceTo(P.pos.x, P.pos.z, dt, 14);
          const still = Math.hypot(P.pos.x - a.ax, P.pos.z - a.az) < 0.25;
          if (still) { P.face = dampAngle(P.face, Math.atan2(S.x - P.pos.x, S.z - P.pos.z), 10, dt); fezaHug(ctx.H, sstep(0.1, 0.45, a.phT)); }
          if (a.healed < 3 && a.phT > 0.35 + a.healed * 0.45) { a.healed++; A.heal(0.14, a.healed < 3); A.burst('hearts', (P.pos.x + S.x) / 2, 1.5, P.pos.z, { count: 7 }); if (a.healed === 1) A.sfx('heart', { vol: 0.5, pitch: 1.2 }); }
          if (a.phT > 1.9 || !still && Math.hypot(P.pos.x - a.ax, P.pos.z - a.az) > 0.9) next();
        } else { if (a.phT < 0.3) fezaHug(ctx.H, 1 - a.phT / 0.3); if (a.phT > 0.45) { S.cd.hug = 22; endAct(); } }
        break;
      }
      case 'lift': {
        // 0: koş, 1: diz çök + el uzat, 2: çek (Feza kalkar), 3: sevinç
        const fz = P.pos, s = S.x < fz.x ? -1 : 1, lx = fz.x + s * 0.55, lz = fz.z + 0.05;
        const H = ctx.H;
        if (a.ph === 0) {
          if (Math.hypot(lx - S.x, lz - S.z) > 9) teleportNear(A, P, s * 1.6, -0.3);
          const d = moveTo(A, lx, lz, 7.5, dt, 0.06);
          if (d < 0.12 || a.phT > 2.2) { S.x = lx; S.z = lz; next(); }
        } else {
          S.vel = 0; faceTo(fz.x, fz.z, dt, 12);
          const B = H && H.bones;
          if (B && B.foreL && B.foreR && B.armL && B.armR) {
            // Feza'nın Hala'ya yakın eli: Hala o eli tutar, Feza da kolunu ona uzatır
            if (!a.side) { B.foreL.updateWorldMatrix(true, false); B.foreR.updateWorldMatrix(true, false);
              const l = B.foreL.localToWorld(v3(0, -0.2, 0)), r = B.foreR.localToWorld(v3(0, -0.2, 0));
              a.side = Math.hypot(l.x - S.x, l.z - S.z) < Math.hypot(r.x - S.x, r.z - S.z) ? 'L' : 'R'; }
            const arm = B['arm' + a.side], fore = B['fore' + a.side];
            const w = a.ph === 1 ? sstep(0.2, 0.7, a.phT) : a.ph === 2 ? 1 - sstep(0.35, 0.6, a.phT) : 0;
            if (w > 0.01) {
              S.handR.getWorldPosition(_w); H.root.updateMatrixWorld(true);
              const o = [0, 0, 0]; aimArm(arm, _w, 1, o);
              arm.rotation.set(lerp(arm.rotation.x, o[0], w), arm.rotation.y * (1 - w), lerp(arm.rotation.z, o[1], w)); fore.rotation.x *= 1 - 0.8 * w; fore.rotation.z *= 1 - w;
              H.root.updateMatrixWorld(true);
            }
            fore.updateWorldMatrix(true, false); a.hand.set(0, -0.2, 0); fore.localToWorld(a.hand);
          }
          if (a.ph === 1 && a.phT > 0.9) { next(); if (A.revive(1)) { A.burst('heal', fz.x, 0.8, fz.z, {}); A.burst('hearts', fz.x, 1.3, fz.z, { count: 10 }); A.sfx('levelup', { vol: 0.4, pitch: 1.3 }); } }
          else if (a.ph === 2 && a.phT > 0.6) { next(); sayVar('kalkti', 2); }
          else if (a.ph === 3 && a.phT > 1.0) endAct();
        }
        break;
      }
      case 'point': {
        S.vel = damp(S.vel, 0, 10, dt); faceTo(a.tx, a.tz, dt, 7);
        if (a.t >= a.dur) endAct();
        break;
      }
      case 'clap': case 'cheer': {
        S.vel = damp(S.vel, 0, 8, dt); faceTo(P.pos.x, P.pos.z + 3, dt, 4);
        if (a.k === 'clap' && Math.floor(a.t * 17 / Math.PI) !== Math.floor((a.t - dt) * 17 / Math.PI) && a.t > 0.2 && a.t < a.dur - 0.25 && Math.floor(a.t * 17 / Math.PI) % 2 === 0)
          A.sfx('pop', { x: S.x, z: S.z, vol: 0.25, pitch: frand(1.5, 1.8) });
        if (a.t >= a.dur) { endAct(); if (a.then) a.then(); }
        break;
      }
      case 'shield': {
        // 0: Feza'nın yanına koş, 1: kalkan açık
        const s = S.x < P.pos.x ? -1 : 1, tx = P.pos.x + s * 0.85, tz = P.pos.z - 0.45;
        if (a.ph === 0) {
          const d = moveTo(A, tx, tz, 9, dt, 0.1);
          if (d < 0.2 || a.phT > 0.45) { if (d > 0.8) { poof(A, S.x, S.z); S.x = tx; S.z = tz; } next(); A.shield(a.hold); A.sfx('shield', { vol: 0.7, pitch: 1.1 }); A.burst('sparkle', P.pos.x, 1, P.pos.z, { color: '#ffb3c2', count: 18 }); }
        } else {
          moveTo(A, tx, tz, 4, dt, 0.15); faceTo(P.pos.x, P.pos.z + 2.5, dt, 6);
          const sh = shieldMesh(); if (!sh.parent) scene.add(sh);
          const w = bump(a.phT / a.hold, 0, 0.08, 0.85, 1), r = 1.15 + 0.06 * Math.sin(a.t * 5);
          sh.visible = w > 0.01; sh.position.set(P.pos.x, 0.55, P.pos.z); sh.scale.set(r * (0.6 + 0.4 * w), r * 1.05 * (0.6 + 0.4 * w), r * (0.6 + 0.4 * w));
          sh.material.uniforms.uT.value = a.t; sh.material.uniforms.uA.value = w;
          if (a.phT >= a.hold) { sh.visible = false; endAct(); }
        }
        break;
      }
      case 'team': {
        // 0: Feza'nın soluna geç, 1: çömel, 2: el ele zıpla (tepede blast), 3: in, 4: bırak
        const tx = P.pos.x + 0.98 * a.s, tz = P.pos.z - 0.02;
        if (a.ph === 0) {
          if (Math.hypot(tx - S.x, tz - S.z) > 2.2) { poof(A, S.x, S.z); S.x = tx; S.z = tz; poof(A, tx, tz); }
          const d = moveTo(A, tx, tz, 9, dt, 0.05);
          S.face = dampAngle(S.face, 0, 14, dt); P.face = dampAngle(P.face, 0, 14, dt);
          if (d < 0.1 || a.phT > 0.3) { S.x = tx; S.z = tz; next(); }
        } else {
          S.vel = 0; S.x = tx; S.z = tz; S.face = dampAngle(S.face, 0, 14, dt); P.face = dampAngle(P.face, 0, 14, dt);
          if (a.ph === 1 && a.phT > 0.2) { next(); A.sfx('bounce', { vol: 0.6, pitch: 1.1 }); }
          else if (a.ph === 2) {
            const u = clamp(a.phT / a.air, 0, 1), h = 1.15 * Math.sin(u * Math.PI);
            S.y = h; P.pos.y = h * 0.95; S.liftY = true; if (ctx.H) ctx.H.root.position.y = P.pos.y;
            if (!a.blasted && u >= 0.5) {
              a.blasted = true;
              const n = a.blast ? a.blast(P.pos.x, P.pos.z, 8) : 0;
              A.burst('confetti', P.pos.x, 2.2, P.pos.z, {}); A.burst('confetti', S.x, 2.4, S.z, {}); A.burst('hearts', (P.pos.x + S.x) / 2, 2.4, P.pos.z, { count: 16 });
              A.burst('star', (P.pos.x + S.x) / 2, 2.0, P.pos.z, { count: 14, color: '#ffe08a' }); A.sfx('cheer', { vol: 0.7 });
              A.fx('ring', P.pos.x, P.pos.z, { r0: 0.6, r1: 8, dur: 0.7, color: '#ffd166', width: 0.5 });
            }
            if (u >= 1) { P.pos.y = 0; if (ctx.H) ctx.H.root.position.y = 0; next(); A.sfx('bounce', { vol: 0.5, pitch: 0.9 }); A.burst('dust', P.pos.x, 0.1, P.pos.z, {}); }
          } else if (a.ph === 3 && a.phT > 0.3) next();
          else if (a.ph === 4 && a.phT > 0.35) endAct();
        }
        // buluşma noktası: ikisinin arasında, el yüksekliğinde (Feza'nın kolu da oraya uzanır)
        if (a.ph >= 1) {
          a.meet = a.meet || v3(); a.meet.set((P.pos.x + S.x) / 2, 0.8 + S.y * 0.97, (P.pos.z + S.z) / 2 + 0.06);
          const B = ctx.H && ctx.H.bones, fa = B && (a.s > 0 ? B.armL : B.armR), fo = B && (a.s > 0 ? B.foreL : B.foreR), fr = B && (a.s > 0 ? B.armR : B.armL);
          const w = a.ph >= 4 ? 1 - sstep(0, 0.3, a.phT) : 1;
          if (fa && fo) {
            ctx.H.root.position.y = P.pos.y; ctx.H.root.updateMatrixWorld(true);
            const o = [0, 0, 0]; aimArm(fa, a.meet, 1, o);
            fa.rotation.set(lerp(fa.rotation.x, o[0], w), fa.rotation.y * (1 - w), lerp(fa.rotation.z, o[1], w)); fo.rotation.x *= 1 - 0.85 * w; fo.rotation.z *= 1 - w;
            if (a.ph === 2 && fr) { const up = Math.sin(clamp(a.phT / a.air, 0, 1) * Math.PI); fr.rotation.x = lerp(fr.rotation.x, -2.7, up); fr.rotation.z = lerp(fr.rotation.z, (a.s > 0 ? -1 : 1) * 0.35, up); }
          }
        }
        break;
      }
      case 'boost': {
        // 0: Feza'ya git, 1: çömel (avuçlar), 2: fırlat (Feza havada), 3: izle/tut
        const s = S.x < P.pos.x ? -1 : 1;
        if (a.ph === 0) {
          const tx = P.pos.x + s * 0.5, tz = P.pos.z - 0.3;
          if (Math.hypot(tx - S.x, tz - S.z) > 7) teleportNear(A, P, s * 1.2, -0.4);
          const d = moveTo(A, tx, tz, 7.5, dt, 0.05); faceTo(P.pos.x, P.pos.z, dt, 10);
          if (d < 0.1 || a.phT > 2) { a.fx0 = P.pos.x; a.fz0 = P.pos.z; next(); }
        } else if (a.ph === 1) {
          S.vel = 0; faceTo(P.pos.x, P.pos.z, dt, 10);
          P.pos.x = a.fx0; P.pos.z = a.fz0;
          if (a.phT > 0.38) { next(); A.sfx('whoosh', { vol: 0.6, pitch: 0.9 }); A.burst('star', P.pos.x, 0.6, P.pos.z, { count: 10, color: '#fff0b3' }); A.shield(a.dur + 0.6); }
        } else if (a.ph === 2) {
          const u = clamp(a.phT / a.dur, 0, 1), tx = a.x ?? a.fx0, tz = a.z ?? a.fz0;
          P.pos.x = lerp(a.fx0, tx, easeIO(u)); P.pos.z = lerp(a.fz0, tz, easeIO(u)); P.pos.y = a.h * 4 * u * (1 - u); S.liftY = true;
          if (ctx.H) { ctx.H.root.position.copy(P.pos); fezaUp(ctx.H, Math.sin(u * Math.PI) * 0.8 + 0.2); }
          if (Math.hypot(tx - a.fx0, tz - a.fz0) > 0.5) P.face = Math.atan2(tx - a.fx0, tz - a.fz0);
          faceTo(P.pos.x, P.pos.z, dt, 8);
          if (u >= 1) {
            P.pos.y = 0; if (ctx.H) ctx.H.root.position.y = 0; next();
            A.sfx('bounce', { vol: 0.6 }); A.burst('star', P.pos.x, 0.3, P.pos.z, { count: 12, color: '#ffe08a' }); A.burst('dust', P.pos.x, 0.1, P.pos.z, {});
            if (a.x === undefined) say('hala_tut', 2);
            if (a.onLand) { try { a.onLand(); } catch (e) { /* yut */ } }
          }
        } else if (a.phT > 0.8) endAct();
        break;
      }
      case 'wave': {
        S.vel = damp(S.vel, 0, 8, dt);
        if (a.tx !== undefined) faceTo(a.tx, a.tz, dt, 6);
        if (a.t >= a.dur) endAct();
        break;
      }
      case 'goto': {   // hikâye/bölüm: belli bir yere yürü, orada dur (süre bitince ya da HALA.release() ile takibe döner)
        const d = moveTo(A, a.x, a.z, a.speed || 4, dt, 0.12);
        if (d < 0.2) { if (a.face !== undefined) S.face = dampAngle(S.face, a.face, 6, dt); if (!a.arrived) { a.arrived = true; if (a.then) { try { a.then(); } catch (e) { /* yut */ } } } }
        if (a.t > (a.hold ?? 30)) endAct();
        break;
      }
      case 'pet': {
        // Bilbo'nun başını okşa
        const Bi = ctx.Bilbo && ctx.Bilbo.root; if (!Bi) { endAct(); break; }
        const bp = Bi.position, f = Bi.rotation.y, hx = bp.x + Math.sin(f) * 0.42, hz = bp.z + Math.cos(f) * 0.42;
        if (a.ph === 0) {
          const sx = Math.cos(f), sz = -Math.sin(f), sd = (S.x - hx) * sx + (S.z - hz) * sz >= 0 ? 1 : -1;   // başın yanında dur (sırtının üstünde değil)
          const tx = hx + sx * sd * 0.58 + Math.sin(f) * 0.12, tz = hz + sz * sd * 0.58 + Math.cos(f) * 0.12;
          const d = moveTo(A, tx, tz, 3.4, dt, 0.08);
          if (d < 0.15) { next(); A.burst('hearts', hx, 0.9, hz, { count: 5 }); }
          else if (a.phT > 3 || Math.hypot(bp.x - S.x, bp.z - S.z) > 5) endAct();
        } else {
          S.vel = 0; faceTo(hx, hz, dt, 10);
          a.head = a.head || v3(); a.head.set(hx, 0.74 + 0.035 * Math.max(0, Math.sin(a.phT * 9)), hz);
          if (Math.floor(a.phT * 9 / Math.PI) !== Math.floor((a.phT - dt) * 9 / Math.PI) && Math.floor(a.phT * 9 / Math.PI) % 2 === 0) A.burst('sparkle', hx, 0.75, hz, { color: '#ffd6e2', count: 3 });
          if (a.phT > 2.4) endAct();
        }
        if (Math.hypot(S.fvx, S.fvz) > 0.5 || (ctx.enemies || []).some(e => e && !e.dead && e.aggro)) endAct();   // Feza yürüdü / huysuz geldi
        break;
      }
      case 'dance': {
        S.vel = damp(S.vel, 0, 8, dt);
        if (a.t < 0.3) faceTo(S.x, S.z + 5, dt, 6);
        if (Math.floor(a.t * 1.3) !== Math.floor((a.t - dt) * 1.3)) A.burst('notes', S.x, 2.1, S.z, { count: 2 });
        // yanında duran Feza da kollarını sallayarak katılır
        if (ctx.H && Math.hypot(P.pos.x - S.x, P.pos.z - S.z) < 3.5 && Math.hypot(S.fvx, S.fvz) < 0.3) {
          const w = bump(a.t / a.dur, 0, 0.1, 0.9, 1), sw = Math.sin(a.t * 5.2);
          fezaArms(ctx.H, w, -2.5 + 0.25 * sw, 0, 0.45 + 0.25 * sw, -0.4 - 0.3 * Math.max(0, sw), 0);
        }
        if (a.t >= a.dur || (ctx.state === 'play' && Math.hypot(P.pos.x - S.x, P.pos.z - S.z) > 7)) endAct();
        break;
      }
      default: endAct();
    }
    if (S.act === a && a.k !== 'team' && a.k !== 'boost' && a.k !== 'shield' && a.k !== 'goto' && Math.hypot(P.pos.x - S.x, P.pos.z - S.z) > 16) endAct();
  }
  S.timers = [];

  // ── 07_game'in çağırdığı kancalar ──
  function create(scene_) {
    if (S.root) return S.root;
    const g = buildModel();
    g.scale.setScalar(HALA_SCALE);
    S.root = g; (scene_ || scene).add(g);
    shieldMesh();
    animate(0);
    try { portrait(); } catch (e) { /* arayüz yer tutucuyu kullanır */ }   // yükleme sırasında bir kez çiz (oyun içinde takılma olmasın)
    return g;
  }
  function onFezaHurt(o) {
    // büyük bir darbe (canın %22'sinden fazlası) ve kalkan hazırsa: kalkan
    if (!o || !S.ctx || S.cd.shield > 0 || (S.act && (S.act.k === 'hug' || S.act.k === 'lift' || S.act.k === 'team' || S.act.k === 'boost'))) return;
    const P = S.ctx.P; if (o.amount > P.maxHp * 0.22 && o.frac > 0.35) startShield(S.ctx);
  }
  function onFezaLow(o) {
    if (S.cd.hug > 0 || !S.ctx || S.ctx.P.dead) return;
    if (S.act && (S.act.k === 'hug' || S.act.k === 'lift' || S.act.k === 'team' || S.act.k === 'boost')) return;
    S.cd.hug = 30;   // (bitince 22'ye iner)
    startAct('hug', { look: true });
    sayVar('hug', 3);
  }
  function onFezaDown(o) {
    if (S.act && S.act.k === 'team') { const P = S.ctx && S.ctx.P; if (P) P.pos.y = 0; }
    startAct('lift', { hand: v3(o ? o.x : S.x, 0.3, o ? o.z : S.z), look: true });
    S.timers.push([0.6, () => sayVar('kalk', 3)]);
    const P = S.ctx && S.ctx.P, d = P ? Math.hypot(P.pos.x - S.x, P.pos.z - S.z) : 3;
    return Math.min(9, 0.6 + Math.min(d, 9) / 6 + 1.6 + 2.5);   // Hala genelde daha önce kaldırır (revive); bu yalnız güvenlik süresi
  }
  function onCheer(e) {
    api.charge = Math.min(1, api.charge + (e && e.boss ? 0.3 : 0.06));
    if (!S.ctx || !e) return;
    if (e.boss) {
      if (S.act && S.act.k !== 'throw' && S.act.k !== 'clap' && S.act.k !== 'point') return;
      startAct('cheer', { dur: 2.2, then: () => { startAct('dance', { dur: 5.5 }); S.timers.push([0.3, () => sayVar('dans', 2)]); } });
      S.timers.push([0.5, () => sayVar('boss', 3)]);
      return;
    }
    if (S.act) return;
    const r = Math.random();
    if (S.cd.clap <= 0 && r < (e.elite ? 0.7 : 0.3)) { S.cd.clap = 7 + Math.random() * 5; startAct('clap', { dur: 1.15 }); }
    if (S.cd.praise <= 0 && Math.random() < (e.elite ? 0.8 : 0.35)) { S.cd.praise = 14 + Math.random() * 12; sayVar('ovgu', 1); }
  }
  const teamReady = () => api.charge >= 1;
  function teamMove(o) {
    if (!teamReady() || !S.ctx) return false;
    api.charge = 0;
    const P = S.ctx.P, A = S.ctx.api;
    let s = S.x < P.pos.x ? -1 : 1;
    if (!free(A, P.pos.x + 0.98 * s, P.pos.z) && free(A, P.pos.x - 0.98 * s, P.pos.z)) s = -s;   // duvar tarafına değil
    startAct('team', { s, air: 0.72, blast: o && o.blast, look: false });
    sayVar('takim', 3);
    S.ctx.api.shield(1.6);
    return true;
  }
  function pointTo(x, z) {
    if (!S.ctx || S.ctx.title) return;
    if (S.act && S.act.k !== 'clap' && S.act.k !== 'point') { S.pointQ = { x, z, at: S.t }; return; }
    const fight = (S.ctx.enemies || []).some(e => e && !e.dead && e.aggro && Math.hypot(e.x - S.ctx.P.pos.x, e.z - S.ctx.P.pos.z) < 10);
    if (fight) { S.pointQ = { x, z, at: S.t }; return; }
    S.cd.point = Math.max(S.cd.point, 20);
    startPoint(x, z);
  }
  // Bölüm tasarımcıları için: Feza'yı (x, z)'ye havaya atıp ulaştır (yüksek yer, karşı kıyı…). Hedefsiz: havaya atıp tutar.
  // o = { h: tepe yüksekliği (m), dur: uçuş süresi (s), onLand(), sessiz }. Başladıysa true.
  function boost(x, z, o = {}) {
    if (!S.ctx || S.ctx.state !== 'play' || S.ctx.P.dead) return false;
    if (S.act && (S.act.k === 'lift' || S.act.k === 'team' || S.act.k === 'boost')) return false;
    const P = S.ctx.P, d = x === undefined ? 0 : Math.hypot(x - P.pos.x, z - P.pos.z);
    startAct('boost', { x, z, h: o.h || (d ? 2.0 + d * 0.12 : 2.2), dur: o.dur || clamp(0.75 + d * 0.06, 0.75, 1.4), onLand: o.onLand, look: true });
    if (!o.sessiz) sayVar('hop', 2);
    return true;
  }
  function dance(dur = 5.5) { if (!S.ctx) return false; startAct('dance', { dur }); return true; }
  // Hikâye/bölüm yardımcıları: el salla, bir yere git (ve orada bekle), takibe dön, yüz ifadesi
  function wave(x, z, dur = 1.8) { if (!S.ctx) return false; startAct('wave', { dur, tx: x, tz: z }); return true; }
  function goTo(x, z, o = {}) { if (!S.ctx) return false; startAct('goto', { x, z, face: o.face, hold: o.hold, speed: o.speed, then: o.then, look: !!o.look }); return true; }
  function release() { if (S.act && S.act.k === 'goto') endAct(); }
  function expr(name, dur = 2) { S.expr = { name, from: S.t, until: S.t + dur }; return true; }
  function cheer(dur = 1.6) { if (!S.ctx) return false; startAct('cheer', { dur }); return true; }

  // ── Arayüz için yüz resmi (konuşma balonu / sol üst köşe): { smile, talk, blink } dataURL (256², yuvarlak rozet) ──
  // Bir kez çizilir ve saklanır; arayüz konuşurken 'smile' ↔ 'talk' arasında gidip gelerek ağzı oynatabilir.
  let PORTRAIT = null;
  function portrait() {
    if (PORTRAIT) return PORTRAIT;
    if (!S.root || typeof renderer === 'undefined' || renderer.getContext().isContextLost()) return null;
    const N = 256, root = S.root, parent = root.parent, pos = root.position.clone(), ry = root.rotation.y;
    const rt = new THREE.WebGLRenderTarget(N, N, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const sc = new THREE.Scene(); sc.environment = scene.environment;
    sc.add(new THREE.HemisphereLight(0xfff4ea, 0x9a7a65, 0.75));
    const key = new THREE.DirectionalLight(0xfff0dc, 1.6); key.position.set(-1.0, 3.2, 2.6); sc.add(key);
    const cam = new THREE.PerspectiveCamera(22, 1, 0.1, 10);
    const saved = { eye: U.hzEye.value.clone(), ew: U.hzEyeW.value.clone(), mo: U.hzMouth.value.clone(), br: U.hzBrow.value.clone(), ho: HU.hzOff.value.clone(), held: S.held.visible };
    const prevRT = renderer.getRenderTarget(), prevCol = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
    const buf = new Uint8Array(N * N * 4), cv = document.createElement('canvas'); cv.width = cv.height = N;
    const out = {};
    try {
      idlePose(M.P, 0); M.P[C.kRZ] = -0.1; M.P[C.kRX] = 0.02; M.P[C.kRY] = 0.16; M.P[C.cRY] = 0.12; applyPose(M.P);
      HU.hzOff.value.set(0, 0, 0); S.held.visible = false;
      root.position.set(0, 0, 0); root.rotation.y = 0; sc.add(root); root.updateMatrixWorld(true);
      S.headC.getWorldPosition(_v);
      // 3/4 açı, hafif yukarıdan: kıvırcık saç, bandana ve tepedeki gözlük görünsün, kırmızı polar yaka kadrajda
      const ca = 0.7; cam.fov = 27; cam.updateProjectionMatrix();
      cam.position.set(_v.x + Math.sin(ca) * 1.72, _v.y + 0.3, _v.z + Math.cos(ca) * 1.72); cam.lookAt(_v.x - 0.04, _v.y + 0.045, _v.z - 0.07);
      const spark = new THREE.PointLight(0xfff2d0, 1.6, 4, 1.5); spark.position.copy(cam.position).add(v3(0.3, 0.25, 0)); sc.add(spark);
      const rim = new THREE.DirectionalLight(0xffd6c2, 1.1); rim.position.set(_v.x - 1.5, _v.y + 1.2, _v.z - 1.6); sc.add(rim);
      const g = cv.getContext('2d');
      for (const [k, mo, eye, ew] of [['smile', [0.15, 0.85, 0.35, 1], [0, 0.15, 0.05, 0], [1, 0, 0]], ['talk', [0, 1, 0.95, 0.65], [0, 0.15, 0.05, 0], [1, 0, 0]],
        ['blink', [0.3, 0.75, 0.42, 0.9], [0, 0, 0, 0], [0, 1, 0]]]) {
        U.hzMouth.value.set(...mo); U.hzEye.value.set(eye[0], 0.7, 0.0, 0); U.hzEyeW.value.set(...ew); U.hzBrow.value.set(0.4, 0, 0.75, 1);
        renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
        renderer.render(sc, cam);
        renderer.readRenderTargetPixels(rt, 0, 0, N, N, buf);
        const id = g.createImageData(N, N), D = id.data;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const s = ((N - 1 - y) * N + x) * 4, d = (y * N + x) * 4, a = buf[s + 3], kk = a > 0 && a < 255 ? 255 / a : 1;
          D[d] = Math.min(255, buf[s] * kk); D[d + 1] = Math.min(255, buf[s + 1] * kk); D[d + 2] = Math.min(255, buf[s + 2] * kk); D[d + 3] = a;
        }
        const pic = document.createElement('canvas'); pic.width = pic.height = N; pic.getContext('2d').putImageData(id, 0, 0);
        g.clearRect(0, 0, N, N);
        g.save(); g.beginPath(); g.arc(N / 2, N / 2, N / 2 - 4, 0, TAU); g.clip();
        const gr = g.createRadialGradient(N * 0.45, N * 0.38, 10, N / 2, N / 2, N / 2); gr.addColorStop(0, '#ffe9df'); gr.addColorStop(1, '#ff9f8f');
        g.fillStyle = gr; g.fillRect(0, 0, N, N); g.drawImage(pic, 0, 0); g.restore();
        g.lineWidth = 7; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(N / 2, N / 2, N / 2 - 4.5, 0, TAU); g.stroke();
        out[k] = cv.toDataURL('image/png');
      }
    } catch (e) { console.warn('HALA.portrait', e); }
    finally {
      if (parent) parent.add(root); root.position.copy(pos); root.rotation.y = ry; root.updateMatrixWorld(true);
      U.hzEye.value.copy(saved.eye); U.hzEyeW.value.copy(saved.ew); U.hzMouth.value.copy(saved.mo); U.hzBrow.value.copy(saved.br); HU.hzOff.value.copy(saved.ho); S.held.visible = saved.held;
      renderer.setRenderTarget(prevRT); renderer.setClearColor(prevCol, prevA); rt.dispose();
    }
    if (out.smile) PORTRAIT = out;
    return out.smile ? out : null;
  }

  // QA: belirli bir hareketi zorla (ekran görüntüsü için) — HALA._qa.act('hug') vb.
  const _qa = {
    act(k, o = {}) {
      if (!S.ctx) return false;
      if (k === 'hug') { S.cd.hug = 0; onFezaLow({}); }
      else if (k === 'team') { api.charge = 1; teamMove({ blast: S.ctx.api && GAME.teamBlast }); }
      else if (k === 'point') startPoint(o.x ?? S.x + 5, o.z ?? S.z - 3, null);
      else if (k === 'shield') startShield(S.ctx);
      else if (k === 'throw') { let e = null, bd = 1e9; for (const q of S.ctx.enemies || []) { const d = q && !q.dead ? Math.hypot(q.x - S.x, q.z - S.z) : 1e9; if (d < bd) { bd = d; e = q; } } if (e) startThrow(e, S.ctx); }
      else if (k === 'boost') boost(o.x, o.z, o);
      else startAct(k, Object.assign({ dur: 3 }, o));
      return true;
    },
    pose(name, w = 1) { S.qaPose = name ? { name, w } : null; },
    get act_() { return S.act && S.act.k; },
  };

  Object.defineProperty(api, 'busy', { get: () => (S.act ? S.act.k : null), enumerable: true });   // şu anki eylem (yoksa null)
  return Object.assign(api, { create, update, onFezaHurt, onFezaLow, onFezaDown, onCheer, teamReady, teamMove, pointTo, say, boost, dance, cheer, portrait,
    wave, goTo, release, expr,
    _S: S, _M: M, _qa, _pies: PIES });
})();
