/* ── 5. oda: Balkon Bahçesi (isteğe bağlı ödül odası) ──
   Güneşli, rengârenk balkon: kiremit rengi karo zemin, dev saksılar ve yapraklar, dev papatya / gerberalar, kuş yemi bahçesi,
   arena = masa üstü bitki standı. Uzakta bulanık şehir ve gökyüzü. 3 alan + arena (BOLUM.define, src/SPEC.md › Bölüm kaydı).
   Oyuncaklar: sulama kabından damlayan su (yaklaşınca serinletir), zıplatan çiçek yatakları (Feza hoplar), polen bulutları,
   gagalayan serçeler (yaklaşınca uçup geri konar), rüzgâr çanı (yaklaşınca çalar). İstasyonlar: mini oyun 'cicekSula', Bilbo binişi.
   Ödül (boss neşelenince, bir kez): Süper Kahraman kostümü + çiçek pasta süsleri + çıkartma. Pasta Krallığı kilidini değiştirmez
   (malzemesi yok; 06a isOpen yalnız malzemeli odaların bosslarını sayar). Merkezdeki 5. kapı: masa yerleşimini sarar (aşağıda).
   Huysuzlar ve boss: src/05h_balkon.js · sesler: src/02l_balkon.js · mini oyun: src/08n_mini_oyunlar.js (cicekSula). */
(() => {
  'use strict';
  const PI = Math.PI;
  const say = (k, prio = 2) => { try { if (typeof AUD !== 'undefined' && AUD.LINES && AUD.LINES[k] && AUD.say) return AUD.say(k, { prio }); } catch (e) { /* yok */ } return 0; };
  const sfx = (n, o) => { try { if (typeof AUD !== 'undefined' && AUD.sfx) AUD.sfx(n, o); } catch (e) { /* yok */ } };
  const fxb = (k, x, y, z, o) => { try { if (typeof FX !== 'undefined' && FX.burst) FX.burst(k, x, y, z, o); } catch (e) { /* yok */ } };
  const inBalkon = () => typeof GAME !== 'undefined' && GAME.L && GAME.L.Z && GAME.L.Z.id === 'balkon';

  // ── Geometriler (her kurulumda yeni; süse birleşince atılır) ──
  function potGeo(THREE) {   // kiremit saksı: dışa açılan gövde, kalın kenar, toprak
    const pts = [[0, 0], [0.7, 0], [0.74, 0.04], [0.86, 0.86], [0.98, 0.9], [1.0, 1.0], [0.97, 1.08], [0.84, 1.06], [0.83, 0.98], [0, 0.98]].map(p => new THREE.Vector2(p[0], p[1]));
    return new THREE.LatheGeometry(pts, 16);
  }
  function leafGeo(THREE) {   // kalp biçimli dev yaprak: ortasından hafif kıvrık, ucu sivri; +z yönüne uzanır, sapı orijinde
    const g = new THREE.SphereGeometry(1, 10, 6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const u = (z + 1) / 2;                                   // 0 sap → 1 uç
      const w = Math.sin(Math.min(1, u * 1.15) * PI) * (1 - 0.35 * u) + 0.05;
      x *= w * 0.55; y *= 0.05; z = u * 1.6;
      y += 0.35 * Math.sin(u * PI * 0.9) - 0.18 * x * x;       // kemer + yanlara sarkma
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals(); return g;
  }
  function petalGeo(THREE) {   // yassı, ucu yuvarlak taç yaprağı (orijinden +z'ye)
    const g = new THREE.SphereGeometry(1, 8, 5), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = (z + 1) / 2;
      p.setXYZ(i, x * 0.22 * (0.55 + 0.6 * Math.sin(u * PI * 0.85)), y * 0.04 + 0.12 * u * u, u);
    }
    g.computeVertexNormals(); return g;
  }
  function seedGeo(THREE) {   // ayçiçeği çekirdeği: damla biçimli yassı tohum
    const g = new THREE.SphereGeometry(1, 8, 6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x * 0.6 * (0.7 + 0.3 * z), y * 0.32 + 0.05, z * 0.85); }
    g.computeVertexNormals(); return g;
  }

  // ── Canlı parçalar (kendi Object3D'leri; bölüm değişince disposeTree) ──
  const ST = { hop: 0, hopT: 0, nearWarn: {}, said: {} };
  function sparrow(THREE, api) {   // minik serçe: tombul kahverengi gövde, krem göğüs, kısa gaga, kocaman gözler
    const g = new THREE.Group();
    const M = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const brown = M(0x9a6a44), cream = M(0xf6e2c4), dark = M(0x2a1a14, 0.3), beak = M(0xf2b04a, 0.4), cheek = M(0xff9a9a);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), brown); body.scale.set(1, 0.92, 1.15); body.position.y = 0.36;
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), cream); belly.position.set(0, 0.32, 0.12); belly.scale.set(0.9, 0.9, 0.85);
    const head = new THREE.Group(); head.position.set(0, 0.64, 0.14);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), brown); head.add(hm);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, PI * 2, 0, PI * 0.45), M(0x6a4028)); cap.position.y = 0.04; head.add(cap);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), cream); face.position.set(0, -0.04, 0.1); face.scale.set(1, 0.8, 0.7); head.add(face);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), beak); bk.rotation.x = PI / 2; bk.position.set(0, -0.02, 0.24); head.add(bk);
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), dark); e.position.set(0.08 * s, 0.04, 0.18); head.add(e);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), M(0xffffff, 0.2)); hl.position.set(0.09 * s, 0.065, 0.215); head.add(hl);
      const ck = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), cheek); ck.position.set(0.12 * s, -0.04, 0.15); ck.scale.z = 0.4; head.add(ck);
    }
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(0.27 * s, 0.42, -0.02);
      const wm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), M(0x7a4e30)); wm.scale.set(0.25, 0.55, 0.9); wm.position.y = -0.04; w.add(wm);
      g.add(w); wings.push(w);
    }
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M(0x6a4028)); tail.scale.set(0.8, 0.2, 1.3); tail.position.set(0, 0.46, -0.4); tail.rotation.x = -0.5;
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), beak); l.position.set(0.09 * s, 0.07, 0.02); g.add(l); }
    g.add(body, belly, head, tail);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return { g, head, wings };
  }

  BOLUM.define('balkon', {
    ad: 'Balkon Bahçesi',
    taban: 'bathroom',            // karo zemin (kiremit tonlarında); dışarısı çiçek yatağı yeşili
    size: 90, side: 2,
    areas: BOLUM.UC_ALAN('Saksı Ormanı', 'Çiçek Tepesi', 'Kuş Yemi Bahçesi'),
    muzik: 'orman',
    malzeme: null, kayipEsya: 'telefon',
    isik: { fog: [0xd6ecff, 42, 112], hemiSky: 0xf2f8ff, hemiGround: 0xb08a62, hemi: 1.0, sunColor: 0xfff1d2, sun: 2.7, sunOffset: [-14, 28, 12],
      env: [0xa8d8ff, 0xfff4e0, 0xb88a60, 1.0], bloom: 0.26, exposure: 1.02, sat: 1.1, vig: 0.2 },
    zemin: { tA: 0xf2b089, tB: 0xffd9b8, tC: 0xffe9c8, out: 0x6fa850, outAmt: 0.7, macro: 0xfff2e2 },
    minimap: { zemin: '#efb08a' },
    harita: { ad: 'Balkon Bahçesi', detay: 'Güneşli çiçek bahçesi ve uykucu hortum', renk: '#9be37a', x: 50, y: 74, simge: '🌻' },

    // saf veri: istasyonlar (mini oyun + Bilbo binişi), zıplatan çiçek yatakları, sulama kabı, serçeler, rüzgâr çanı yerleri
    yerlesim(L, api) {
      const A = L.areas || [], room = (ai, k = 0) => { const a = A[ai]; return a ? L.rooms[a.rooms[Math.min(k, a.rooms.length - 1)]] : null; };
      const spot = (rm, dx, dz) => { if (!rm) return null; let x = rm.x + dx, z = rm.z + dz; if (!api.isFloor(x, z)) { const p = api.randomFloorNear(rm.x, rm.z, 1.5, 4); if (p) { x = p.x; z = p.z; } } return { x, z }; };
      const st = L.stations = L.stations || [];
      const r2 = room(1, 1), r3 = room(2, 0);
      const s1 = spot(r2, 3, 2); if (s1) st.push({ id: 'cicekSula', kind: 'mini', mini: 'cicekSula', x: s1.x, z: s1.z, r: 1.5 });
      // biniş halkası kaldırıldı ('Bin!' düğmesi)
      // zıplatan çiçek yatakları: Çiçek Tepesi'nin odalarında 3'er tane (yürünür zeminde; katı değil, üstüne basılır)
      L.balkonPads = [];
      for (const k of [0, 1]) {
        const rm = room(1, k); if (!rm) continue;
        for (let i = 0; i < 3; i++) { const a = i * 2.1 + k, d = 3.2 + i * 0.8, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d; if (api.isFloor(x, z) && api.circleFree(x, z, 1)) L.balkonPads.push({ x, z, r: 1.05, col: [0xff7aa8, 0xffc23a, 0xb98aff][(i + k) % 3] }); }
      }
      const r1 = room(0, 1); L.balkonCan = r1 ? { x: r1.x - 2.5, z: r1.z - 1.5 } : null;
      L.balkonBirds = []; const rb = room(2, 1) || r3;
      if (rb) for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4, x = rb.x + Math.sin(a) * 4.5, z = rb.z + Math.cos(a) * 3.5; if (api.isFloor(x, z)) L.balkonBirds.push({ x, z }); }
      L.balkonChime = r3 ? { x: r3.x + 3.5, z: r3.z - 3.2 } : null;
      // huysuz karışımı: Çiçek Tepesi'nde dikenli çiçekler (gül, kaktüs çiçeği) daha sık; her alanda en az birkaç kaktüs
      const areaOfRoom = {}; A.forEach((a, k) => { if (!a.boss) a.rooms.forEach(ri => { areaOfRoom[ri] = k; }); });
      const FLOW = ['dikenliGul', 'kaktusCicegi'], kakN = {};
      for (const sp of L.spawns || []) {
        const ai = areaOfRoom[sp.room]; if (ai === undefined || sp.elite || /altin|gokkusagi/i.test(sp.type)) continue;
        if (ai === 1 && sp.type !== 'kaktus' && api.rnd() < 0.45) { sp.type = FLOW[(api.rnd() * 2) | 0]; delete sp.variant; }
        if (sp.type === 'kaktus') kakN[ai] = (kakN[ai] || 0) + 1;
      }
      for (const ai of [0, 1, 2]) {   // eksikse: alanın huysuzlarından birkaçı kaktüs olur
        const list = (L.spawns || []).filter(sp => areaOfRoom[sp.room] === ai && !sp.elite && !/altin|gokkusagi|kaktus/i.test(sp.type) && !(ai === 1 && FLOW.includes(sp.type)));
        const tot = (L.spawns || []).filter(sp => areaOfRoom[sp.room] === ai).length, want = Math.min(3, Math.ceil(tot / 2));
        for (let n = kakN[ai] || 0; n < want && list.length; n++) { const sp = list.splice((api.rnd() * list.length) | 0, 1)[0]; sp.type = 'kaktus'; delete sp.variant; }
      }
    },

    kur(L, api) {
      const THREE = api.THREE, rnd = api.rnd, B = L._b;
      if (typeof ODAKIT !== 'undefined' && ODAKIT.lowShadow) ODAKIT.lowShadow(api);   // (performans: alçak süsler gölge düşürmez)
      api.dreamEdge();
      if (api.floor && api.floor.material && api.floor.material.userData.u && api.floor.material.userData.u.uDream) api.floor.material.userData.u.uDream.value = 0;   // banyo düşü zemini değil: dışarısı çiçek yatağı
      const pot = api.tmp(potGeo(THREE)), leaf = api.tmp(leafGeo(THREE)), petal = api.tmp(petalGeo(THREE)), seed = api.tmp(seedGeo(THREE));
      const sph = api.tmp(new THREE.SphereGeometry(1, 10, 7)), cyl = api.tmp(new THREE.CylinderGeometry(1, 1, 1, 10)), cone = api.tmp(new THREE.ConeGeometry(1, 1, 8));
      const tor = api.tmp(new THREE.TorusGeometry(1, 0.18, 6, 18));
      const POT = [0xd9774a, 0xe08a5a, 0xc8673e, 0x5aa8d8, 0xf2c94c, 0xf08aa8];
      const GREEN = [0x4fae4a, 0x63c25a, 0x3f9a46, 0x78cc5e];
      const out = (x, z, m) => !api.isFloor(x, z) && api.linkDist(x, z) > m;
      // kamera güneyden bakar: güneyinde (9 m içinde) yürünür zemin olan yere uzun şey konmaz
      const southOpen = (x, z) => { for (let dz = 1.5; dz <= 10; dz += 1.5) for (let dx = -3; dx <= 3; dx += 1.5) if (api.isFloor(x + dx, z + dz)) return false; return true; };
      { const gp = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x86c45e, roughness: 0.95 })); gp.rotation.x = -PI / 2; gp.position.y = -0.06; gp.receiveShadow = true; api.add(gp); }   // altta çiçek yatağı yeşili (boşluk görünmez)

      // dev saksı + bitki (kuzey/yan: uzun; güney: kısa)
      function bigPot(x, z, s, low) {
        const c = POT[(rnd() * POT.length) | 0];
        api.put(pot, x, 0, z, s, s * (low ? 0.6 : 1), s, c, rnd() * PI);
        api.put(tor, x, s * (low ? 0.6 : 1) * 1.0, z, s * 0.98, s * 0.98, s * 0.98, c, 0, PI / 2);      // kenar simidi
        api.cyl(x, s * (low ? 0.6 : 1) * 0.97, z, s * 0.84, 0.05, 0x6a4430);                        // toprak
        if (low) { flower(x, z, s * 0.9, s * 0.62, rnd() < 0.5 ? 'papatya' : 'gerbera'); return; }
        const n = 5 + ((rnd() * 4) | 0), h = s * 1.0;
        for (let i = 0; i < n; i++) {                                                                // dev yapraklar saksıdan taşar
          const a = PI + (i / Math.max(1, n - 1) - 0.5) * PI * 1.5 + (rnd() - 0.5) * 0.3, ls = s * (0.6 + rnd() * 0.45);   // yapraklar kuzeye/yanlara taşar (kameraya değil)
          api.put(leaf, x + Math.sin(a) * s * 0.3, h + rnd() * s * 0.4, z + Math.cos(a) * s * 0.3, ls, ls, ls, GREEN[i % 4], a, -0.25 - rnd() * 0.35, 0);
        }
        if (rnd() < 0.6) flower(x + (rnd() - 0.5) * s * 0.4, z + (rnd() - 0.5) * s * 0.4, s * 0.8, h + s * (0.8 + rnd() * 0.8), rnd() < 0.5 ? 'gerbera' : 'papatya');
      }
      // çiçek: papatya (beyaz taç, sarı göbek) / gerbera (pembe-turuncu-sarı) ; y0 = çiçek başının yüksekliği
      function flower(x, z, s, y0, kind, face = rnd() * PI * 2) {
        const P = kind === 'papatya' ? [0xffffff, 0xfff6e8] : [[0xff6fa0, 0xff9ac0], [0xffa23a, 0xffc070], [0xffd23a, 0xffe58a]][(rnd() * 3) | 0];
        api.put(cyl, x, y0 / 2, z, s * 0.06, y0, s * 0.06, 0x58a84a);                                // sap
        api.put(leaf, x, y0 * 0.35, z, s * 0.35, s * 0.35, s * 0.35, 0x5cb850, PI + (rnd() - 0.5) * 2, -0.3, 0);
        const n = kind === 'papatya' ? 14 : 18, tilt = -0.42;
        for (let i = 0; i < n; i++) {
          const a = i / n * PI * 2;
          api.put(petal, x, y0, z, s * 0.62, s * 0.62, s * 0.62, P[i % 2], a, tilt + (i % 2) * 0.12, 0);
        }
        api.put(sph, x, y0 + s * 0.04, z, s * 0.2, s * 0.1, s * 0.2, kind === 'papatya' ? 0xffc21a : 0x7a4a1a);   // göbek
        if (kind !== 'papatya') api.put(sph, x, y0 + s * 0.08, z, s * 0.11, s * 0.06, s * 0.11, 0x4a2a10);
      }
      // dev tohum yığını, kuş yemi kabı
      function seeds(x, z, n, s) {
        for (let i = 0; i < n; i++) {
          const a = rnd() * PI * 2, d = rnd() * s * 1.6, sx = x + Math.sin(a) * d, sz = z + Math.cos(a) * d, k = s * (0.45 + rnd() * 0.3);
          const dark = rnd() < 0.55;
          const yaw = rnd() * PI * 2;
          api.put(seed, sx, k * 0.12, sz, k, k, k, dark ? 0x55505a : 0xf2dca8, yaw, 0, 0);
          if (dark) for (const o of [-0.18, 0.18]) api.put(seed, sx + Math.cos(yaw) * o * k, k * 0.125, sz - Math.sin(yaw) * o * k, k * 0.14, k * 1.04, k * 0.9, 0xf4f0f8, yaw, 0, 0);   // açık çizgiler
        }
      }
      // saksıda süs kaktüsü (Feza kaktüsleri çok seviyor): low = yuvarlak fıçı kaktüs (çiçekli), değilse kollu uzun kaktüs
      const CPOT = [0x7cc8f0, 0xee8a5a, 0xf2c94c, 0xf08aa8, 0xb9a4f0];
      function cactusPot(x, z, s, low) {
        const pc = CPOT[(rnd() * CPOT.length) | 0], ps = s * 0.62, top = ps * 1.0, g = 0x58c266, gd = 0x3fa850;
        api.put(pot, x, 0, z, ps, ps, ps, pc, rnd() * PI);
        api.put(tor, x, top, z, ps * 0.98, ps * 0.98, ps * 0.98, pc, 0, PI / 2);
        api.cyl(x, top * 0.97, z, ps * 0.84, 0.05, 0x6a4430);
        const tufts = (cx, cy, cz, rx, ry, n) => { for (let i = 0; i < n; i++) { const a = PI + (i / n - 0.5) * PI * 1.6, ph = 0.5 + 0.9 * ((i * 0.618) % 1); api.put(sph, cx + Math.sin(a) * Math.sin(ph) * rx, cy + Math.cos(ph) * ry, cz + Math.cos(a) * Math.sin(ph) * rx, s * 0.045, s * 0.045, s * 0.045, 0xfffaf0); } };
        if (low) {   // fıçı kaktüs + sarı/pembe çiçek
          const r0 = ps * 0.7, h = ps * 0.75;
          api.put(sph, x, top + h * 0.8, z, r0, h, r0, g);
          for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; api.put(sph, x + Math.sin(a) * r0 * 0.55, top + h * 0.8, z + Math.cos(a) * r0 * 0.55, r0 * 0.48, h * 0.98, r0 * 0.48, k & 1 ? g : gd); }   // oluklar
          tufts(x, top + h * 0.8, z, r0 * 1.02, h * 1.0, 7);
          const fc = rnd() < 0.5 ? 0xffd23a : 0xff8ab8;
          for (let k = 0; k < 7; k++) api.put(petal, x, top + h * 1.78, z, s * 0.28, s * 0.28, s * 0.28, fc, k / 7 * PI * 2, -0.3, 0);
          api.put(sph, x, top + h * 1.8, z, s * 0.07, s * 0.05, s * 0.07, 0xff9a2e);
          return;
        }
        const r0 = ps * 0.5, h = s * (0.65 + rnd() * 0.35), cy = top + h * 0.85;   // kollu uzun kaktüs: kollar yana ve yukarı
        api.put(sph, x, cy, z, r0, h, r0, g);
        tufts(x, cy, z, r0 * 1.02, h, 8);
        for (const sd of [-1, 1]) {
          if (rnd() < 0.2) continue;
          const ay = cy + h * (0.05 + rnd() * 0.3) * (sd > 0 ? 1 : 0.7), ar = r0 * 0.5, ex = x + sd * (r0 + ar * 1.4), up = h * (0.45 + rnd() * 0.25);
          api.put(cyl, x + sd * (r0 * 0.5 + ar * 0.7), ay, z, ar, r0 + ar * 1.4, ar, g, 0, 0, PI / 2);
          api.put(sph, ex, ay, z, ar, ar, ar, g);
          api.put(cyl, ex, ay + up / 2, z, ar, up, ar, g);
          api.put(sph, ex, ay + up, z, ar, ar * 1.1, ar, gd);
        }
        if (rnd() < 0.5) api.put(sph, x, cy + h * 0.98, z, s * 0.09, s * 0.07, s * 0.09, 0xff8ab8);   // tepede pembe tomurcuk
      }
      // ── alanlara göre süsleme: yürünür alanın kenarı boyunca (ekranda görünsün), her nokta en yakın odanın alanına göre ──
      const A = L.areas || [{ rooms: L.rooms.map((r, i) => i) }];
      const areaOf = (x, z) => { let best = 0, bd = 1e9; A.forEach((ar, ai) => { for (const ri of ar.rooms) { const rm = L.rooms[ri]; if (!rm) continue; const d = (rm.x - x) ** 2 + (rm.z - z) ** 2; if (d < bd) { bd = d; best = ai; } } }); return best; };
      const nearFloor = (x, z, r) => { for (let a = 0; a < 8; a++) if (api.isFloor(x + Math.sin(a * 0.785) * r, z + Math.cos(a * 0.785) * r)) return true; return false; };
      const STEP = 3.6;
      for (let z = 1; z < L.H - 1; z += STEP) for (let x = 1; x < L.W - 1; x += STEP) {
        const px = x + (rnd() - 0.5) * 1.6, pz = z + (rnd() - 0.5) * 1.6;
        if (api.isFloor(px, pz) || api.linkDist(px, pz) < 2.6) continue;
        const edge = nearFloor(px, pz, 2.4), far = !edge && nearFloor(px, pz, 8);
        if (!edge && !far) continue;
        if (far && rnd() < 0.3) continue;
        const ai = areaOf(px, pz), ar = A[ai], low = edge || !southOpen(px, pz), r = rnd();   // kenarda hep alçak; uzun şeyler geride
        if (r > 0.8) { const tall = !edge && !southOpen(px, pz); cactusPot(px, pz, tall ? 1.6 + rnd() * 1.0 : 1.3 + rnd() * 0.7, !tall); continue; }   // uzun kaktüs yalnız oyun alanının arkasında (kameradan uzak)
        if (ar && ar.boss) { if (r < 0.6) bigPot(px, pz, low ? 1.3 + rnd() * 0.4 : 1.8 + rnd() * 0.8, low); else flower(px, pz, low ? 1.3 : 2.2, low ? 0.9 : 3.2 + rnd() * 1.5, rnd() < 0.5 ? 'papatya' : 'gerbera'); continue; }
        if (ai === 0) { if (r < 0.7) bigPot(px, pz, low ? 1.2 + rnd() * 0.5 : 2.0 + rnd() * 1.4, low); else if (low) { for (let k = 0; k < 3; k++) flower(px + (rnd() - 0.5) * 1.6, pz + (rnd() - 0.5) * 1.6, 0.7 + rnd() * 0.3, 0.35 + rnd() * 0.3, rnd() < 0.5 ? 'papatya' : 'gerbera'); } else for (let k = 0; k < 3; k++) { const ls = 0.6 + rnd() * 0.4; api.put(leaf, px, 0.05, pz, ls, ls, ls, GREEN[k % 4], PI + (rnd() - 0.5) * 2.4, 0.15, 0); } }
        else if (ai === 1) { flower(px, pz, low ? 1.2 + rnd() * 0.4 : 2.0 + rnd() * 1.2, low ? 0.6 + rnd() * 0.5 : 2.6 + rnd() * 2.6, rnd() < 0.5 ? 'papatya' : 'gerbera'); }
        else { if (low || r < 0.55) seeds(px, pz, 4 + ((rnd() * 4) | 0), 0.9); else bigPot(px, pz, 1.8 + rnd() * 1.0, false); }
      }
      A.forEach((ar, ai) => {
        for (const ri of ar.rooms) {
          const rm = L.rooms[ri]; if (!rm) continue;
          const R0 = (rm.r || Math.max(rm.hw || 6, rm.hh || 6));
          // yürünür zeminde minik süsler (yolların ortasında değil): yere düşmüş taç yaprakları, tohumlar
          for (let k = 0; k < 12; k++) {
            const a = rnd() * PI * 2, d = rnd() * R0 * 0.9, x = rm.x + Math.sin(a) * d, z = rm.z + Math.cos(a) * d;
            if (!api.isFloor(x, z) || api.linkDist(x, z) < 1.5) continue;
            if (ai === 2) seeds(x, z, 2, 0.45);
            else api.put(petal, x, 0.03, z, 0.4, 0.4, 0.4, [0xffffff, 0xff8ab0, 0xffc23a][k % 3], rnd() * PI * 2, 0, 0);
          }
          api.glow(rm.x, rm.z, R0 * 0.95, ai === 1 ? 0xfff0f6 : 0xfff4dc, 0.1);
        }
      });
      // ── Arena: masa üstü bitki standı (yuvarlak ahşap tabla) ──
      const arena = A.find(a => a.boss), am = arena ? L.rooms[arena.rooms[0]] : L.rooms[L.rooms.length - 1];
      if (am) {
        const R = (am.r || 10) + 1.2;
        const tab = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0xc89060, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2 }));
        tab.position.set(am.x, 0.02, am.z); tab.receiveShadow = true; api.add(tab);
        for (let i = 0; i < 6; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R * (0.25 + i * 0.13), 0.025, 4, 64), new THREE.MeshStandardMaterial({ color: 0xa87048, roughness: 0.7 })); ring.rotation.x = PI / 2; ring.position.set(am.x, 0.085, am.z); api.add(ring); }   // ahşap halkaları
        // arenanın kuzeyinde bahçe köşesi: dev hortum makarası (yeşil hortum sarılı tambur, kırmızı yan diskler, kollu), yanında
        // yatık sulama kabı ve üst üste saksılar (böcek / kovan yok)
        const hx = am.x - 2.5, hz = am.z - R - 2.8;
        for (const sd of [-1, 1]) {
          api.put(cyl, hx + sd * 1.7, 2.4, hz, 2.3, 0.25, 2.3, 0xe8504a, 0, 0, PI / 2);             // yan disk
          api.put(cyl, hx + sd * 1.86, 2.4, hz, 0.5, 0.12, 0.5, 0xffc83a, 0, 0, PI / 2);            // göbek
          api.put(cyl, hx + sd * 1.7, 1.0, hz + 0.9, 0.12, 2.2, 0.12, 0xd04440, 0, 0.5, 0);           // ayak
          api.put(cyl, hx + sd * 1.7, 1.0, hz - 0.9, 0.12, 2.2, 0.12, 0xd04440, 0, -0.5, 0);
        }
        for (let i = 0; i < 6; i++) api.put(tor, hx - 1.35 + i * 0.54, 2.4, hz, 1.55, 1.55, 1.55, i & 1 ? 0x4fc25a : 0x3fae4c, PI / 2, 0);   // sarılı hortum
        api.put(cyl, hx + 2.1, 2.4, hz, 0.12, 0.6, 0.12, 0xb0b8c8, 0, 0, PI / 2); api.put(sph, hx + 2.4, 2.0, hz, 0.22, 0.45, 0.22, 0xffc83a);   // kol
        api.put(tor, hx + 0.6, 0.18, hz + 2.4, 1.0, 1.0, 1.0, 0x4fc25a, 0, PI / 2);                  // yere sarkan hortum halkası
        api.put(cyl, hx + 1.4, 0.2, hz + 3.2, 0.2, 0.9, 0.2, 0xffc83a, 0, 0.4, PI / 2);             // fıskiye ucu
        // yatık dev sulama kabı
        const wx = am.x + 4.2, wz = am.z - R - 2.2;
        api.put(cyl, wx, 1.2, wz, 1.2, 2.4, 1.2, 0x4faee8, 0, 0, PI / 2 - 0.15); api.put(sph, wx - 1.2, 1.35, wz, 0.5, 1.2, 1.2, 0x4faee8);
        api.put(cyl, wx + 1.8, 1.6, wz + 0.6, 0.2, 2.2, 0.2, 0x4faee8, 0.3, 0, -1.2);
        api.put(sph, wx + 2.8, 2.0, wz + 1.0, 0.42, 0.2, 0.42, 0x8fd0ff);
        api.put(tor, wx, 2.5, wz, 0.9, 0.9, 0.9, 0x3a8ad0, 0, 0, 0.15);
        // üst üste saksılar
        for (let i = 0; i < 3; i++) api.put(pot, am.x + 7.6, i * 0.75, am.z - R - 1.2, 1.1 - i * 0.1, 0.75, 1.1 - i * 0.1, POT[i], i);
        flower(am.x + 7.6, am.z - R - 1.2, 1.4, 3.4, 'gerbera');
      }
      // ── sulama kabı (Saksı Ormanı): dev mavi kap, ağzından su damlaları süzülür ──
      const can = L.balkonCan;
      if (can) {
        const cx = can.x - 4, cz = can.z - 3, by = 0;
        api.put(cyl, cx, by + 1.6, cz, 1.6, 3.2, 1.6, 0x4fa8e8); api.put(sph, cx, by + 3.2, cz, 1.6, 0.5, 1.6, 0x4fa8e8);
        api.put(tor, cx, by + 3.6, cz, 1.2, 1.2, 1.2, 0x3a8ad0, 0, 0, 0);                               // sap
        api.put(cyl, cx + 2.2, by + 2.6, cz + 1.3, 0.25, 4.2, 0.25, 0x4fa8e8, 0.55, 0, -1.0);            // ağız borusu
        api.put(sph, cx + 3.8, by + 3.9, cz + 2.3, 0.5, 0.25, 0.5, 0x7fc4f2);                           // süzgeç
        const drops = [], dm = new THREE.MeshStandardMaterial({ color: 0x9fdcff, roughness: 0.05, transparent: true, opacity: 0.85 });
        const dg = new THREE.SphereGeometry(0.12, 10, 8);
        for (let i = 0; i < 10; i++) { const d = new THREE.Mesh(dg, dm); d.scale.set(1, 1.4, 1); api.add(d); drops.push({ m: d, t: i / 10 }); }
        const sx0 = cx + 3.8, sz0 = cz + 2.3, sy0 = 3.8;
        api.anim((dt, hx, hz) => {
          for (const d of drops) {
            d.t += dt * 0.7; if (d.t > 1) { d.t -= 1; if (Math.hypot(hx - sx0 - 0.6, hz - sz0 - 0.4) < 9) fxb('splash', sx0 + 0.6, 0.1, sz0 + 0.4, { count: 3 }); }
            const k = d.t; d.m.position.set(sx0 + 0.6 * k + (d.t * 7 % 1) * 0.3 - 0.15, sy0 * (1 - k * k), sz0 + 0.4 * k);
          }
          const dn = Math.hypot(hx - sx0, hz - sz0);
          if (dn < 4 && !ST.said.damla) { ST.said.damla = 1; say('balkon_damla', 1); }
        });
      }
      // ── zıplatan çiçek yatakları: dev gerbera çiçek başı yere yatık; Feza basınca hoplar ──
      const pads = (L.balkonPads || []).map(p => {
        const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
        const pm = new THREE.MeshStandardMaterial({ color: p.col, roughness: 0.5 }), pm2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.col).lerp(new THREE.Color(0xffffff), 0.35), roughness: 0.5 });
        const pg = petalGeo(THREE); api.dispose(pg);
        for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(pg, i % 2 ? pm : pm2); m.rotation.set(-0.16, i / 18 * PI * 2, 0, 'YXZ'); m.scale.setScalar(1.25); m.position.y = 0.08; g.add(m); }
        const ctr = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.22, 24), new THREE.MeshStandardMaterial({ color: 0xffd23a, roughness: 0.6 })); ctr.position.y = 0.14; g.add(ctr);
        for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 0.12 + (i % 5) * 0.08; const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshStandardMaterial({ color: 0xc87a10 })); dot.position.set(Math.sin(a) * r, 0.26, Math.cos(a) * r); g.add(dot); }
        g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
        api.add(g);
        return { p, g, t: 9, cool: 0 };
      });
      // ── serçeler: tohum gagalar, Feza yaklaşınca havalanıp çevrede tur atar, geri konar ──
      const birds = (L.balkonBirds || []).map((b, i) => { const s = sparrow(THREE, api); s.g.position.set(b.x, 0, b.z); s.g.scale.setScalar(1.3); api.add(s.g); return Object.assign(s, { hx: b.x, hz: b.z, st: 'yer', t: i * 0.7, fly: 0, ang: rnd() * PI * 2 }); });
      // ── rüzgâr çanı: tahta tepelik + 5 renkli boru; yaklaşınca sallanır ve çalar ──
      let chime = null;
      if (L.balkonChime) {
        const c = L.balkonChime, g = new THREE.Group(); g.position.set(c.x, 0, c.z);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.4, 10), new THREE.MeshStandardMaterial({ color: 0xb07a4a, roughness: 0.7 })); pole.position.y = 2.7; g.add(pole);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.14), pole.material); arm.position.set(0.9, 5.3, 0); g.add(arm);
        const top = new THREE.Group(); top.position.set(1.7, 5.2, 0); g.add(top);
        const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0xffd0e0, roughness: 0.5 })); top.add(disk);
        const tubes = [];
        [0x8fd3ff, 0xffb3d1, 0xfff07a, 0xb3f0a8, 0xd2b3ff].forEach((col, i) => {
          const a = i / 5 * PI * 2, t = new THREE.Group(); t.position.set(Math.sin(a) * 0.4, -0.1, Math.cos(a) * 0.4);
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1 + i * 0.18, 10), new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, metalness: 0.3 })); m.position.y = -(0.6 + i * 0.09); t.add(m); top.add(t); tubes.push(t);
        });
        const clap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); clap.position.y = -1.1; top.add(clap);
        g.traverse(o => { if (o.isMesh) o.castShadow = true; });
        api.add(g); api.solid(c.x, c.z, 0.5, 'cani');
        chime = { g, top, tubes, x: c.x + 1.7, z: c.z, sw: 0, ring: 0, note: 0 };
      }
      // ── uzakta gökyüzü ve bulanık şehir (kuzeyde dev fon) + balkon korkuluğu ──
      {
        const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const x = cv.getContext('2d');
        const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#8fcaff'); gr.addColorStop(0.6, '#d6ecff'); gr.addColorStop(1, '#fff1dc'); x.fillStyle = gr; x.fillRect(0, 0, 1024, 256);
        x.filter = 'blur(3px)';
        for (let i = 0; i < 46; i++) { const w = 18 + (i * 37 % 40), h = 40 + (i * 53 % 110), px = (i * 97) % 1024; x.fillStyle = ['#c9d6ea', '#b8c8e0', '#d9e2f0', '#c2cfe6'][i % 4]; x.fillRect(px, 256 - h, w, h); }
        x.fillStyle = '#ffffffcc'; for (let i = 0; i < 9; i++) { const cx2 = (i * 131) % 1024, cy2 = 40 + (i * 29) % 60; x.beginPath(); x.ellipse(cx2, cy2, 60, 18, 0, 0, PI * 2); x.ellipse(cx2 + 40, cy2 - 8, 40, 20, 0, 0, PI * 2); x.fill(); }
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; api.dispose(tex);
        let minZ = 1e9, minX = 1e9, maxX = -1e9; for (const r of L.rooms) { minZ = Math.min(minZ, r.z - 14); minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x); }
        const bg = new THREE.Mesh(new THREE.PlaneGeometry(260, 65), new THREE.MeshBasicMaterial({ map: tex, fog: false, depthWrite: false }));
        bg.position.set((minX + maxX) / 2, 22, minZ - 18); bg.renderOrder = -5; api.add(bg);
        // beyaz metal korkuluk (kuzey kenarında)
        for (let i = -20; i <= 20; i++) api.put(cyl, (minX + maxX) / 2 + i * 2.2, 2.2, minZ - 6, 0.12, 4.4, 0.12, 0xf6f6f6);
        api.put(cyl, (minX + maxX) / 2, 4.4, minZ - 6, 0.2, 90, 0.2, 0xffffff, 0, 0, PI / 2);
      }
      // ── polen bulutları (Çiçek Tepesi): arada bir altın tozları süzülür ──
      let pollenT = 0;
      const a2 = A[1] ? A[1].rooms.map(i => L.rooms[i]).filter(Boolean) : [];
      // ── her kare: zıplatan yataklar, serçeler, çan, polen ──
      api.anim((dt, hx, hz) => {
        if (!inBalkon()) return;
        const G = GAME, H = G.H;
        // çiçek yatakları
        for (const q of pads) {
          q.t += dt; q.cool -= dt;
          const d = Math.hypot(hx - q.p.x, hz - q.p.z);
          if (d < q.p.r && q.cool <= 0 && !G.P.dead && G.state === 'play') {
            q.t = 0; q.cool = 1.2; ST.hop = 0.75; ST.hopT = 0;
            sfx('bounce', { vol: 0.9, pitch: 0.85 + Math.random() * 0.2 }); fxb('confetti', q.p.x, 0.6, q.p.z, { count: 10 }); fxb('sparkle', q.p.x, 0.5, q.p.z, { count: 8, color: '#fff3a0' });
            if (!ST.said.cicek) { ST.said.cicek = 1; say('balkon_cicek', 1); }
          }
          const w = q.t < 0.8 ? Math.exp(-q.t * 5) * Math.cos(q.t * 22) : 0;
          q.g.scale.set(1 + 0.18 * w, 1 - 0.5 * w, 1 + 0.18 * w);
          q.g.rotation.y += dt * 0.15;
        }
        if (ST.hop > 0 && H && H.root) {   // Feza'nın hopu: 07 her kare kökü P.pos'a koyar; burada yalnız yükseklik eklenir
          ST.hopT += dt; const k = ST.hopT / ST.hop;
          if (k >= 1) ST.hop = 0; else H.root.position.y += Math.sin(k * PI) * 1.6;
        }
        // serçeler
        for (const b of birds) {
          b.t += dt;
          const d = Math.hypot(hx - b.g.position.x, hz - b.g.position.z);
          if (b.st === 'yer') {
            const peck = Math.max(0, Math.sin(b.t * 5)) ** 6;
            b.head.rotation.x = 0.7 * peck; b.g.position.y = Math.abs(Math.sin(b.t * 2.3)) < 0.05 ? 0.06 : 0;
            if (((b.t * 0.6) | 0) % 4 === 0) b.g.rotation.y += dt * 1.5;
            b.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * 0.05; });
            if (d < 3.6) { b.st = 'uc'; b.fly = 0; sfx('chirp', { x: b.hx, z: b.hz, vol: 0.7, pitch: 1.1 + Math.random() * 0.3 }); }
          } else {
            b.fly += dt;
            const k = Math.min(1, b.fly / 0.6), a = b.ang + b.fly * 1.4, r = 4.5;
            const tx = b.hx + Math.sin(a) * r, tz = b.hz + Math.cos(a) * r;
            b.g.position.x += (tx - b.g.position.x) * Math.min(1, dt * 3); b.g.position.z += (tz - b.g.position.z) * Math.min(1, dt * 3);
            b.g.position.y = 3.2 * k + 0.3 * Math.sin(b.fly * 3);
            b.g.rotation.y = a + PI / 2;
            b.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.3 + 1.1 * Math.abs(Math.sin(b.fly * 26))); });
            if (b.fly > 4 && d > 5) { // geri kon
              b.g.position.x += (b.hx - b.g.position.x) * Math.min(1, dt * 2.5); b.g.position.z += (b.hz - b.g.position.z) * Math.min(1, dt * 2.5);
              b.g.position.y = Math.max(0, b.g.position.y - dt * 4);
              if (b.g.position.y <= 0.01 && Math.hypot(b.g.position.x - b.hx, b.g.position.z - b.hz) < 0.3) { b.st = 'yer'; b.g.position.y = 0; }
            }
          }
        }
        // rüzgâr çanı
        if (chime) {
          const d = Math.hypot(hx - chime.x, hz - chime.z);
          chime.sw = Math.max(chime.sw * Math.exp(-dt * 0.8), d < 4 ? 1 : 0.15);
          const t = performance.now() / 1000;
          chime.top.rotation.z = Math.sin(t * 1.3) * 0.06 * chime.sw;
          chime.tubes.forEach((tb, i) => { tb.rotation.z = Math.sin(t * (2.2 + i * 0.3) + i) * 0.35 * chime.sw; tb.rotation.x = Math.cos(t * (1.9 + i * 0.25) + i * 2) * 0.25 * chime.sw; });
          chime.ring -= dt;
          if (d < 4 && chime.ring <= 0) {
            chime.ring = 0.35 + Math.random() * 0.4;
            const notes = [0, 2, 4, 7, 9]; sfx('bell', { pitch: 1.4 * Math.pow(2, notes[chime.note++ % 5] / 12), vol: 0.35 });
            if (!ST.said.cani) { ST.said.cani = 1; say('balkon_cani', 1); }
          }
        }
        // polen
        pollenT -= dt;
        if (pollenT <= 0 && a2.length) {
          pollenT = 0.5;
          for (const rm of a2) if (Math.hypot(hx - rm.x, hz - rm.z) < 22) {
            const a = Math.random() * PI * 2, rr = (rm.r || 8) + 3, x = rm.x + Math.sin(a) * rr, z = rm.z + Math.cos(a) * rr;
            fxb('sparkle', x, 2 + Math.random() * 3, z, { count: 4, color: '#ffe066' }); fxb('glitter', x, 2.5, z, { count: 2 });
          }
        }
      });
      // istasyon işaretleri: mini oyun (mavi sulama kabı tabelası) ve biniş (kemik + pati)
      for (const s of L.stations || []) {
        const c = s.kind === 'mini' ? 0x5ac8ff : 0xffb35c;
        api.cyl(s.x, 0.04, s.z, s.r, 0.08, c);
        api.glow(s.x, s.z, 2.4, c, 0.16);
        api.put(cyl, s.x, 0.8, s.z - 1.4, 0.08, 1.6, 0.08, 0xb07a4a);
        api.put(sph, s.x, 1.85, s.z - 1.4, 0.62, 0.62, 0.16, c);
        if (s.kind === 'mini') {   // tabelada minik sulama kabı
          api.put(cyl, s.x - 0.05, 1.82, s.z - 1.2, 0.22, 0.34, 0.12, 0x2f8fd8); api.put(cyl, s.x + 0.25, 1.95, s.z - 1.2, 0.04, 0.4, 0.04, 0x2f8fd8, 0, 0, -0.9);
          api.put(tor, s.x - 0.05, 2.05, s.z - 1.2, 0.12, 0.12, 0.12, 0x2f8fd8);
        } else {                   // tabelada kemik
          api.put(cyl, s.x, 1.85, s.z - 1.2, 0.06, 0.6, 0.06, 0xffffff, 0, 0, PI / 2);
          for (const sx of [-1, 1]) for (const sy of [-1, 1]) api.put(sph, s.x + sx * 0.3, 1.85 + sy * 0.07, s.z - 1.2, 0.09, 0.09, 0.09, 0xffffff);
        }
      }
    },
  });

  // ── Merkez masaya 5. kapı (masa yerleşimini sarar; masa dosyası ne yaparsa yapsın sonuna eklenir) ──
  const M = ZONE_DEFS.masa;
  if (M && typeof M.yerlesim === 'function' && !M._balkon) {
    M._balkon = true;
    const y0 = M.yerlesim;
    M.yerlesim = function (L, api) {
      y0.call(this, L, api);
      const st = L.stations || (L.stations = []);
      if (st.some(s => s.kind === 'kapi' && s.zone === 'balkon')) return;
      const doors = st.filter(s => s.kind === 'kapi');
      let x, z;
      if (doors.length >= 2) { const a = doors[doors.length - 2], b = doors[doors.length - 1]; x = b.x + (b.x - a.x); z = b.z + (b.z - a.z); }
      else if (doors.length) { x = doors[0].x + 5; z = doors[0].z; }
      else { const T = L.rooms[1] || L.rooms[0]; x = T.x + 10; z = T.z - 7.5; }
      if (!api.isFloor(x, z)) { const p = api.randomFloorNear(x, z, 0, 4); if (p) { x = p.x; z = p.z; } }
      st.push({ id: 'kapi_balkon', kind: 'kapi', x, z, r: (doors[0] && doors[0].r) || 1.3, zone: 'balkon' });
    };
    const k0 = M.kur;
    M.kur = function (L, api) {
      if (k0) k0.call(this, L, api);
      const s = (L.stations || []).find(q => q.id === 'kapi_balkon'); if (!s || s.masa) return;   // (masa kendi tarzında çizdiyse)
      // yeşil balkon kapısı: camlı üst panel, çiçekli saksı yanında, güneş ışığı süzülür
      api.box(s.x, 1.6, s.z - 1.2, 2.2, 3.2, 0.25, 0x7fcf6a);
      api.box(s.x, 2.2, s.z - 1.05, 1.5, 1.4, 0.06, 0xcff0ff);
      api.ball(s.x + 0.7, 1.4, s.z - 1.0, 0.12, 0.12, 0.12, 0xf2c44a);
      api.cyl(s.x - 1.5, 0.35, s.z - 0.8, 0.35, 0.7, 0xd9774a);
      api.ball(s.x - 1.5, 0.95, s.z - 0.8, 0.32, 0.32, 0.32, 0xffd23a);
      api.glow(s.x, s.z, 2.4, 0xfff3b0, 0.18);
    };
  }

  // ── Bölüm olayları: girişte Hala, alanlar, ödül ──
  function hook() {
    if (typeof GAME === 'undefined' || !GAME || !GAME.on) { setTimeout(hook, 300); return; }
    GAME.on('zone', () => { ST.said = {}; ST.hop = 0; if (inBalkon()) setTimeout(() => { if (inBalkon()) say('balkon_giris', 3); }, 1800); });
    GAME.on('area', a => { if (!inBalkon() || !a) return; const k = a.boss ? 'balkon_arena' : 'balkon_' + a.id; if (a.index > 0 || a.boss) say(k, 2); });
    GAME.on('station', s => {
      if (!inBalkon() || !s) return;
      if (s.kind === 'mini' && !ST.said.sula) { ST.said.sula = 1; say('balkon_sula', 2); }
      if (s.kind === 'binis' && !ST.said.binis) { ST.said.binis = 1; say('balkon_binis', 2); }
    });
    GAME.on('happy', e => {
      if (!e || !e.boss || !inBalkon()) return;
      const P = GAME.P, first = !(P.cikartmalar && P.cikartmalar.balkon_bahce);
      if (GAME.giveSticker) GAME.giveSticker('balkon_bahce', 'gizli');
      if (!first) return;
      setTimeout(() => {
        if (GAME.unlockCostume) GAME.unlockCostume('superkahraman');
        say('balkon_odul', 3);
        if (GAME.addCakeDecoration) ['cicek_papatya', 'cicek_gerbera', 'cicek_aycicegi'].forEach((id, i) => GAME.addCakeDecoration(id, i * 2.1 + 0.4, 1));
        setTimeout(() => say('balkon_sus', 2), 4500);
      }, 7000);
    });
  }
  hook();
})();
