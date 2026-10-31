/* ── Hikâye: Feza ile Pırıl — Kayıp Ejderha Işıkları ──
   Başlık sahnesi (gece, Feza'nın yatak odası, yatakta uyuyan Pırıl), giriş masalı (Feza uyuyor → Pırıl'la rüyaya dalıyor →
   Koca Fırtına Bulutu esniyor → 5 ışık savruluyor → "birlikte bulalım"), bölüm girişleri, ışık geri gelince kısa "uyku molası",
   final (Pırıl büyür, Feza sırtına biner, gökkuşağı uçuşu, Fırtına Bulutu dost olur, Feza yatağında uyanır, jenerik).
   Cümleler: src/02l_hikaye.js (pr_ anlatıcı, pp_ Pırıl; gen_voice.py → sesler.js). Sözleşme: PIRIL.md › 2.
   07_game / 06_level / 09_ui şu kancaları çağırır: intro, zone, area, ingredient, lostItem, locked, station, ending, buildTitle,
   titleTick(dt), iconTick(dt), ownsWorld(dt), camera(dt, cam), playIntro() (Promise), busy(), logo(el), endingDone.
   Karakterler oyunun modelleri: GAME.H (Feza) ve GAME.Bilbo (Pırıl'ın modeli; motor içi ad). Genel ad: STORY. */
const STORY = (() => {
  'use strict';
  const G_ = () => (typeof GAME !== 'undefined' ? GAME : null);
  const A_ = () => (typeof AUD !== 'undefined' ? AUD : null);
  const GUC = () => (typeof PIRIL_GUC !== 'undefined' ? PIRIL_GUC : null);
  const toast = text => { const g = G_(); if (g && g.emit) g.emit('toast', { text }); };
  const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const lerp = (a, b, k) => a + (b - a) * k;
  const ISIK_RENK = [0xff9ad5, 0x7fe0ff, 0xffe36a, 0x9dff8a, 0xc49bff];   // 5 ejderha ışığı

  // ── ses ──
  function hasLine(key) { const A = A_(); return !!(A && A.LINES && A.LINES[key]); }
  function line(key, text, prio = 3, o) {
    const A = A_();
    if (A && A.LINES && A.LINES[key] && A.say) return A.say(key, Object.assign({ prio }, o || {})) || 0;
    if (text) toast(text);
    return 0;
  }
  function speaking() { const A = A_(); return !!(A && A.speaking && A.speaking()); }
  function lineLen(key) { const A = A_(); return A && A.estimate ? A.estimate(key) || 0 : 0; }
  function sfx(name, o) { const A = A_(); if (A && A.sfx) { try { A.sfx(name, o || {}); } catch (e) { /* yok */ } } }
  function music(name) { const A = A_(); if (A && A.music) { try { A.music(name); } catch (e) { /* yok */ } } }
  function burst(kind, x, y, z, o) { if (typeof FX !== 'undefined' && FX.burst) { try { FX.burst(kind, x, y, z, o || {}); } catch (e) { /* yok */ } } }
  function shake(a, d) { if (typeof FX !== 'undefined' && FX.shake) { try { FX.shake(a, d); } catch (e) { /* yok */ } } }

  // ───────────────────────── Sahne parçaları (paylaşılan malzemeler) ─────────────────────────
  const MAT = {};
  const matStd = () => MAT.std || (MAT.std = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  const matGlow = () => MAT.glow || (MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  const ORB_GEO = () => MAT.orbG || (MAT.orbG = new THREE.SphereGeometry(1, 16, 12));
  function kitMesh(k, mat) { const m = new THREE.Mesh(k.build(), mat); m.castShadow = false; m.receiveShadow = true; return m; }

  // Yatak odası (birim m; köken = odanın ortası, kuzey = -z duvar; yatak batı-doğu, yastık batıda)
  const BED = { x: -0.6, z: -1.3, w: 2.1, d: 1.15, top: 0.58 };
  function buildBedroom(sabah) {   // sabah: finaldeki uyanış — pencerede güneş, açık mavi gök ve bulutlar, oda sıcak gün ışığıyla
    const g = new THREE.Group(); g.name = 'hikayeOda';
    const k = new Kit(), b = G.box(), rb = G.rbox(2), s = G.sphere(16, 12), cy = G.cyl(1, 1, 20);
    // zemin: sıcak ahşap + yuvarlak halı
    k.add(b, 0x8a6a8f, [0, -0.05, 0], null, [9, 0.1, 8]);
    k.add(cy, 0xb9a6ff, [0.4, 0.01, 0.6], null, [1.9, 0.02, 1.5]);
    k.add(cy, 0xe4dcff, [0.4, 0.02, 0.6], null, [1.4, 0.02, 1.05]);
    // duvarlar (gece mavisi) + pencere çerçevesi
    k.add(b, 0x3b4382, [0, 2, -3], null, [9, 4, 0.2]);
    k.add(b, 0x353c78, [-4.4, 2, 0], null, [0.2, 4, 8]);
    k.add(b, 0xf2e6ff, [1.6, 2.35, -2.88], null, [2.0, 1.6, 0.06]);
    k.add(b, 0x1d2350, [1.6, 2.35, -2.84], null, [1.8, 1.4, 0.04]);
    k.add(b, 0xf2e6ff, [1.6, 2.35, -2.8], null, [0.08, 1.4, 0.04]);
    k.add(b, 0xf2e6ff, [1.6, 2.35, -2.8], null, [1.8, 0.08, 0.04]);
    for (const sx of [-1, 1]) k.add(rb, 0xff9fc8, [1.6 + sx * 1.15, 2.3, -2.78], null, [0.35, 1.9, 0.08]);   // perdeler
    // yatak: çerçeve, şilte, yorgan, yastık, başlık (yıldızlı)
    const { x, z, w, d } = BED;
    k.add(rb, 0xc99a6a, [x, 0.2, z], null, [w + 0.15, 0.3, d + 0.12]);
    k.add(rb, 0xffffff, [x, 0.42, z], null, [w, 0.2, d]);
    k.add(rb, 0x8fb8ff, [x + 0.25, 0.53, z + 0.02], null, [w - 0.45, 0.08, d + 0.06]);
    for (let i = 0; i < 6; i++) k.add(s, 0xfff3a0, [x - 0.3 + i * 0.27, 0.575, z + (i & 1 ? 0.2 : -0.2)], null, [0.05, 0.012, 0.05]);
    k.add(s, 0xfff4fa, [x - w / 2 + 0.3, 0.6, z], null, [0.22, 0.1, 0.38]);
    k.add(rb, 0xb88658, [x - w / 2 - 0.05, 0.6, z], null, [0.12, 1.1, d + 0.15]);
    k.add(rb, 0xb88658, [x + w / 2 + 0.05, 0.42, z], null, [0.12, 0.75, d + 0.15]);
    // komodin + gece lambası ayağı, oyuncak rafı, oyuncak ayı yok (yalnız toplar ve küpler)
    k.add(rb, 0xe8c9a0, [x - w / 2 - 0.55, 0.3, z - 0.15], null, [0.6, 0.6, 0.5]);
    k.add(cy, 0xffffff, [x - w / 2 - 0.55, 0.7, z - 0.15], null, [0.06, 0.2, 0.06]);
    k.add(rb, 0xd8b08a, [-3.6, 1.2, -1.2], null, [0.4, 0.08, 1.6]);
    k.add(s, 0xff7f9f, [-3.6, 1.38, -1.7], null, 0.16); k.add(rb, 0x7fd18a, [-3.6, 1.36, -1.2], null, 0.24); k.add(s, 0x7fb8ff, [-3.6, 1.38, -0.7], null, 0.15);
    g.add(kitMesh(k, matStd()));
    // ışıyanlar: ay, yıldızlar, gece lambası
    const e = new Kit();
    if (sabah) {
      e.add(b, 0xa6dcff, [1.6, 2.35, -2.83], null, [1.8, 1.4, 0.02]);                       // aydınlık sabah göğü
      e.add(s, 0xffe46a, [2.05, 2.7, -2.81], null, [0.26, 0.26, 0.03]);                     // güneş
      for (const [cx, cy2, r] of [[1.15, 2.15, 0.13], [1.32, 2.2, 0.17], [1.5, 2.14, 0.12], [2.0, 1.95, 0.1], [2.15, 2.0, 0.13]]) e.add(s, 0xffffff, [cx, cy2, -2.805], null, [r, r * 0.75, 0.02]);
    } else {
      e.add(s, 0xfff6c8, [1.95, 2.6, -2.9], null, [0.32, 0.32, 0.05]);
      for (let i = 0; i < 9; i++) e.add(s, 0xfff8d8, [0.85 + (i * 0.37) % 1.55, 1.75 + ((i * 0.53) % 1.2), -2.85], null, 0.025);
    }
    e.add(s, 0xffd890, [x - w / 2 - 0.55, 0.9, z - 0.15], null, [0.16, 0.13, 0.16]);
    g.add(new THREE.Mesh(e.build(), matGlow()));
    const lamp = new THREE.PointLight(0xffc98a, 6, 7, 1.2); lamp.position.set(x - w / 2 - 0.55, 1.2, z + 0.2); g.add(lamp);
    const sicak = new THREE.PointLight(0xffd7a8, 4, 7, 1.2); sicak.position.set(0.6, 2.2, 1.6); g.add(sicak);   // gece lambasının sıcak dolgusu (yüzler)
    if (sabah) {   // pencereden giren sıcak gün ışığı (ay ışığı yerine) ve odayı dolduran yumuşak sabah aydınlığı
      const gun = new THREE.PointLight(0xfff0c8, 9, 9, 1.2); gun.position.set(1.6, 2.4, -2.0); g.add(gun);
      sicak.color.setHex(0xffe2b8); sicak.intensity = 6.5; lamp.intensity = 3;   // (ışık sayısı gece odasıyla aynı: gölgelendirici yeniden derlenmez)
    } else { const moon = new THREE.PointLight(0xb8c8ff, 2.2, 7, 1.5); moon.position.set(1.6, 2.4, -2.2); g.add(moon); }
    return g;
  }

  // Rüya: bulut zemin, yıldızlar ve sevimli Koca Fırtına Bulutu (gülümseyen, uykulu; esneyince ağzı açılır)
  function buildDream() {
    const g = new THREE.Group(); g.name = 'hikayeRuya';
    const k = new Kit(), s = G.sphere(16, 12);
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2, r = 2.6 + (i % 3) * 0.9;
      k.add(s, i % 2 ? 0xf4f0ff : 0xe6e2ff, [Math.sin(a) * r, -0.35 - (i % 2) * 0.15, Math.cos(a) * r * 0.8], null, [1.1, 0.5, 0.9]);
    }
    k.add(s, 0xf0ecff, [0, -0.55, 0], null, [3.2, 0.6, 2.6]);
    g.add(kitMesh(k, matStd()));
    const e = new Kit();
    for (let i = 0; i < 60; i++) e.add(s, i % 4 ? 0xfff8d8 : 0xd8e8ff, [(i * 1.37 % 14) - 7, 1.5 + (i * 0.71 % 6), -6 - (i * 0.43 % 4)], null, 0.04 + (i % 3) * 0.02);
    g.add(new THREE.Mesh(e.build(), matGlow()));
    const bulut = buildCloud(); bulut.g.position.set(0.6, 3.4, -5.2); g.add(bulut.g);
    return { g, bulut };
  }
  function buildCloud() {
    const g = new THREE.Group(), s = G.sphere(18, 14), k = new Kit();
    for (const [x, y, z, r] of [[0, 0, 0, 1.25], [-1.2, -0.2, 0.1, 0.95], [1.2, -0.15, 0.1, 1.0], [-0.6, 0.65, -0.1, 0.85], [0.7, 0.6, -0.1, 0.9], [-2.0, -0.45, 0, 0.6], [2.0, -0.4, 0, 0.62]])
      k.add(s, 0xdcd8f0, [x, y, z], null, r);
    for (const sx of [-1, 1]) {   // uykulu kapalı gözler (yay) + pembe yanaklar
      k.add(G.torus(Math.PI, 0.25, 12), 0x4a3a6a, [sx * 0.45, 0.25, 1.18], [0, 0, Math.PI], [0.18, 0.18, 0.18]);
      k.add(s, 0xffb3cf, [sx * 0.8, -0.05, 1.08], null, [0.2, 0.12, 0.06]);
    }
    const body = kitMesh(k, matStd()); g.add(body);
    const mouth = new THREE.Mesh(s, MAT.mouth || (MAT.mouth = new THREE.MeshStandardMaterial({ color: 0x6a3a5a, roughness: 0.6 })));
    mouth.position.set(0, -0.3, 1.2); mouth.scale.set(0.22, 0.06, 0.08); g.add(mouth);
    return { g, mouth };
  }
  // Gökkuşağı (final): 7 renkli yay, tek çizim
  function buildRainbow() {
    const k = new Kit(), cols = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0x9775fa, 0xf783ac];
    cols.forEach((c, i) => k.add(G.torus(Math.PI, 0.06, 40), c, [0, 0, 0], null, 6 - i * 0.22));
    const m = new THREE.Mesh(k.build(), matGlow()); m.name = 'hikayeGokkusagi';
    return m;
  }
  // 5 ejderha ışığı (havada dönen küreler; paylaşılan geometri, renk başına bir malzeme)
  function buildOrbs() {
    const g = new THREE.Group();
    // her ışık: parlak çekirdek + yumuşak hale; savrulurken arkasında kuyruklu yıldız gibi 7 küçülen iz (önceden kurulur)
    const list = ISIK_RENK.map((c, i) => {
      const m = new THREE.Mesh(ORB_GEO(), MAT['orb' + i] || (MAT['orb' + i] = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95, fog: false })));
      const haloM = MAT['orbH' + i] || (MAT['orbH' + i] = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      const halo = new THREE.Mesh(ORB_GEO(), haloM); halo.scale.setScalar(2.3); m.add(halo);
      const core = new THREE.Mesh(ORB_GEO(), MAT.orbCore || (MAT.orbCore = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }))); core.scale.setScalar(0.5); m.add(core);
      m.scale.setScalar(0.09); g.add(m);
      const trail = [];
      for (let j = 0; j < 7; j++) { const t = new THREE.Mesh(ORB_GEO(), haloM); t.visible = false; g.add(t); trail.push(t); }
      return { m, a: i / 5 * Math.PI * 2, out: 0, vx: 0, vy: 0, vz: 0, trail, hist: [], t: 0 };
    });
    return { g, list };
  }

  // ───────────────────────── Karakterler ─────────────────────────
  const FST = { move: 0, attack: -1, swingDir: 1, cast: -1, spin: false, hurt: 0, dead: false, cheer: false, idleT: 0, sitRead: false, hybrid: false, magicAttack: false, ride: 0 };
  const BST = { speed: 0.1, hop: 0, pounce: 0, bark: 0, sit: false, happy: 0, sniff: false, dig: false, ride: false };
  const CH = { fBase: 0, bBase: 0.78 };
  const ACT = {
    feza: { x: 0, z: 0, y: 0, face: 0, s: 1, move: 0, cheer: false, sleep: false, ride: 0 },
    piril: { x: 0, z: 0, y: 0, face: 0, s: 1, hop: 0, sit: false, happy: 0, speed: 0.1 },
  };
  let origin = { x: 0, z: 0 };
  const _w = new THREE.Vector3();
  function refs() { const g = G_(); if (!g) return null; if (g.H && !CH.fBase) CH.fBase = g.H.root.scale.x || 1; return { H: g.H, B: g.Bilbo }; }
  function poseChars(dt) {
    const r = refs(); if (!r) return;
    const { H, B } = r, f = ACT.feza, p = ACT.piril, ox = origin.x, oz = origin.z;
    if (B) {
      BST.speed = p.speed; BST.hop = p.hop; BST.sit = !!p.sit; BST.happy = p.happy; BST.ride = f.ride > 0.5;
      BST.kivril = !!p.sit && p.y > 0.3;   // yatakta (başlık, giriş, final sabahı): kıvrılıp uyur, havada süzülmez
      if (B.uyu && p.sit !== CH.uyu) { CH.uyu = p.sit; try { B.uyu(!!p.sit); } catch (e) { /* yok */ } }
      // uyurken (yatakta) modelin kendi havada durma yüksekliğini düş: karnı yatağa değsin
      const yer = (p.sit || p.stand) && typeof B.yukseklik === 'number' ? -(B.yukseklik - 0.32) * CH.bBase * p.s : 0;
      B.root.position.set(ox + p.x, p.y + p.hop + yer, oz + p.z); B.root.rotation.y = p.face; B.root.scale.setScalar(CH.bBase * p.s);
      try { B.update(dt, BST); } catch (e) { /* yok */ }
    }
    if (H && CH.noWeapon && H.setEquip && CH.hatOff !== !!f.sleep) {
      CH.hatOff = !!f.sleep;
      const e = (G_() && G_().P && G_().P.equip) || {};
      try { H.setEquip({ weapon: null, offhand: null, hat: CH.hatOff ? null : e.hat || null, cape: e.cape || null }); } catch (err) { /* yok */ }
    }
    if (H) {
      FST.move = f.move; FST.cheer = !!f.cheer; FST.dead = !!f.sleep; FST.ride = f.ride; FST.idleT += dt;
      if (f.ride > 0.5 && B) {   // Pırıl'ın sırtında: eyer noktasına otur
        const sd = B.saddle || B.root; B.root.updateMatrixWorld(true); sd.getWorldPosition(_w);
        H.root.position.set(_w.x, _w.y + 0.12, _w.z); H.root.rotation.y = p.face;   // (eyerin biraz üstünde: büyük Pırıl'ın sırtında gövdesi görünsün)
      } else { H.root.position.set(ox + f.x, f.y, oz + f.z); H.root.rotation.y = f.face; }
      H.root.scale.setScalar(CH.fBase * f.s); H.root.rotation.z = 0;
      if (H.bladeOn && H.retract) { try { H.retract(); } catch (e) { /* yok */ } }
      try { H.update(dt, FST); } catch (e) { /* yok */ }
    }
  }
  function hideWeapon() {
    const g = G_(), H = g && g.H; if (!H || !H.setEquip || CH.noWeapon) return;
    const e = (g.P && g.P.equip) || {};
    try { H.setEquip({ weapon: null, offhand: null, hat: e.hat || null, cape: e.cape || null }); CH.noWeapon = true; } catch (err) { /* yok */ }
  }
  function restoreWeapon() {
    const g = G_(), H = g && g.H; if (!H || !H.setEquip || !CH.noWeapon) return;
    CH.noWeapon = false; CH.hatOff = false; try { H.setEquip(g.P.equip); } catch (err) { /* yok */ }
  }
  function pirilIsik(n) { const g = G_(), B = g && g.Bilbo; if (B && B.isik) { try { B.isik(n); } catch (e) { /* yok */ } } }
  function restoreChars() {
    const r = refs(); if (!r) return;
    if (r.H) { r.H.root.scale.setScalar(CH.fBase || 1); r.H.root.rotation.z = 0; }
    if (r.B) r.B.root.scale.setScalar(CH.bBase);
    FST.dead = false; FST.ride = 0; BST.ride = false; BST.sit = false;
    if (r.B && r.B.uyu) { try { r.B.uyu(false); } catch (e) { /* yok */ } } CH.uyu = false;
    const g = G_(); pirilIsik(g && g.P ? g.P.isiklar || 0 : 0);
    const Y = GUC(); if (Y && Y.buyu) { try { Y.buyu(false); } catch (e) { /* yok */ } }
  }

  // ───────────────────────── Başlık sahnesi ─────────────────────────
  const TS = { room: null, dream: null, orbs: null, L: null, t: 0, hidden: false };
  function buildTitle(L, api) {
    const st = L.start || { x: 0, z: 0 };
    origin = { x: st.x, z: st.z };
    const room = buildBedroom(); room.position.set(origin.x, 0, origin.z); api.add(room);
    const D = buildDream(); D.g.position.set(origin.x, 0, origin.z); D.g.visible = false; api.add(D.g);
    const O = buildOrbs(); api.add(O.g);
    if (api.floor) api.floor.visible = false;
    Object.assign(TS, { room, dream: D, orbs: O, L, t: 0, hidden: false });
    L._storyTitle = true; L.storyOrigin = origin; CH.noWeapon = false;
    quietZzz(); titlePose();
  }
  function titlePose() {
    Object.assign(ACT.feza, { x: 0.55, z: 0.35, y: 0, face: -0.35, s: 1, move: 0, cheer: false, sleep: false, ride: 0 });
    // başlıkta Pırıl uyanık: yatağın üstünde durur (süzülmez), Feza'ya bakıp gülümser ve selam verir
    Object.assign(ACT.piril, { x: BED.x + 0.35, z: BED.z + 0.05, y: BED.top, face: Math.atan2(0.55 - (BED.x + 0.35), 0.35 - (BED.z + 0.05)), s: 1, hop: 0, sit: false, stand: true, happy: 1, speed: 0 });
    if (TS.room) TS.room.visible = true;
    if (TS.dream) TS.dream.g.visible = false;
    if (TS.orbs) TS.orbs.g.visible = false;
  }
  function hideLevelBits() {   // başlıkta seviye çizimleri (kapılar, bordür) görünmesin: yalnız hikâye setleri
    if (TS.hidden || !TS.room) return; TS.hidden = true;
    const grp = TS.room.parent; if (!grp) return;
    for (const c of grp.children) if (c !== TS.room && c !== TS.dream.g && c !== TS.orbs.g && !c.isLight) c.visible = false;
  }
  function titleTick(dt) {
    const g = G_(); if (!g || !TS.room || !g.L || !g.L._storyTitle) return false;
    TS.t += dt; hideWeapon(); hideLevelBits();
    if (CINE.on && CINE.kind === 'intro') cineStep(dt);
    else {   // boşta: Feza halıda hafifçe sallanır, Pırıl yatakta uyur; ara ara Zzz parıltısı
      const T = TS.t; ACT.feza.face = -0.35 + 0.12 * Math.sin(T * 0.5);
      if ((T % 2.4) < dt) burst('sparkle', origin.x + ACT.piril.x, BED.top + 0.6, origin.z + ACT.piril.z, { count: 3, color: '#cfe0ff' });
    }
    orbsStep(dt);
    poseChars(dt);
    g.P.pos.set(origin.x, 0, origin.z);
    return true;
  }
  function iconTick(dt) {   // ?ikon: yakın, sıcak kare (başlık sahnesiyle aynı)
    if (!titleTick(dt)) return false;
    ACT.feza.cheer = true; return true;
  }
  // ışık küreleri: 'orbit' (Pırıl'ın çevresinde), 'out' (dört yana savrulur), 'off'
  let orbMode = 'off';
  function orbsStep(dt) {
    const O = TS.orbs; if (!O || !O.g.visible) return;
    const p = ACT.piril, cx = origin.x + p.x, cy = p.y + p.hop + 0.55, cz = origin.z + p.z;
    for (const o of O.list) {
      if (orbMode === 'orbit') { o.a += dt * 1.6; o.m.position.set(cx + Math.sin(o.a) * 0.75, cy + 0.15 * Math.sin(o.a * 2), cz + Math.cos(o.a) * 0.75); o.m.scale.setScalar(0.1); for (const t of o.trail) t.visible = false; }
      else if (orbMode === 'out') {   // kuyruklu yıldız: yavaşlayarak kendi yönüne uçar, izi arkasında incelir; 1,6 s sonra uzakta söner
        o.t += dt; const dr = Math.exp(-dt * 0.6); o.vx *= dr; o.vz *= dr; o.vy = o.vy * dr - dt * 0.4;
        o.m.position.x += o.vx * dt; o.m.position.y += o.vy * dt; o.m.position.z += o.vz * dt;
        const sc = 0.1 * Math.min(1, 0.3 + o.t * 2.5) * (o.t < 1.6 ? 1 : Math.max(0, 1 - (o.t - 1.6) / 0.8)); o.m.scale.setScalar(Math.max(0.001, sc));
        o.hist.unshift(o.m.position.x, o.m.position.y, o.m.position.z); if (o.hist.length > 45) o.hist.length = 45;
        o.trail.forEach((tm, j) => { const q = (j + 1) * 6; if (o.hist.length > q + 2) { tm.visible = sc > 0.01; tm.position.set(o.hist[q], o.hist[q + 1], o.hist[q + 2]); tm.scale.setScalar(sc * 1.6 * (1 - (j + 1) / 8)); } });
      }
    }
  }
  function orbsOut() {
    orbMode = 'out'; TS.orbs.g.visible = true;
    // beş ışık Pırıl'ın kanatlarından kopar, beş ayrı yöne (yelpaze gibi göğe) savrulur
    const p = ACT.piril, cx = origin.x + p.x, cy = p.y + p.hop + 0.6, cz = origin.z + p.z;
    TS.orbs.list.forEach((o, i) => {
      const a = (i - 2) * 0.62; o.t = 0; o.hist.length = 0;
      o.m.position.set(cx + (i - 2) * 0.32, cy + 0.1, cz);
      o.vx = Math.sin(a) * 5.2; o.vy = 2.6 - Math.abs(i - 2) * 0.5; o.vz = -Math.cos(a) * 2.4;
    });
    burst('sparkle', cx, cy, cz, { count: 10, color: '#fff3c8' });
  }

  // ───────────────────────── Sinematik altyapı ─────────────────────────
  const CINE = { on: false, kind: '', beats: null, i: -1, t: 0, bt: 0, dur: 0, done: null, skipAll: false, near: 0.5 };
  const CAM_ = { pos: new THREE.Vector3(), look: new THREE.Vector3(), tpos: new THREE.Vector3(), tlook: new THREE.Vector3(), k: 3, snap: true, fov: 40, tfov: 40 };
  function camTo(px, py, pz, lx, ly, lz, k = 2.5, snap = false) {
    CAM_.tpos.set(origin.x + px, py, origin.z + pz); CAM_.tlook.set(origin.x + lx, ly, origin.z + lz); CAM_.k = k;
    if (snap) { CAM_.pos.copy(CAM_.tpos); CAM_.look.copy(CAM_.tlook); }
  }
  function realCam() { try { return window.__storyCam || null; } catch (e) { return null; } }
  function restoreNear() {
    const c = realCam(); if (!c) return;
    if (c.near !== 0.5 || c.fov !== 40) { c.near = 0.5; c.fov = 40; c.updateProjectionMatrix(); }
    CINE.near = 0.5; CAM_.fov = CAM_.tfov = 40;
  }
  function titleCamera() {
    const T = TS.t, aspect = innerWidth / Math.max(1, innerHeight), narrow = aspect < 1.5 ? (1.5 - aspect) * 2.6 : 0;
    camTo(0.6 + Math.sin(T * 0.12) * 0.2, 2.1 + narrow * 0.3, 4.6 + narrow, -0.1, 1.0, -1.2, 1.2, CAM_.snapTitle !== TS.L);
    CAM_.snapTitle = TS.L; CINE.near = 0.1; CAM_.tfov = 42;
  }
  let ov = null;
  function overlay(on, o = {}) {
    if (!on) { if (ov) { ov.remove(); ov = null; } document.body.classList.remove('st-cinema'); return; }
    if (ov) ov.remove();
    injectCss(); WH.a = WH.to = 0;
    ov = document.createElement('div'); ov.className = 'st-ov'; document.body.classList.add('st-cinema');
    ov.innerHTML = `<div class="st-white"></div><div class="st-credits"></div>${o.skip !== false ? '<button class="st-skip" aria-label="Geç">Geç ⏩</button>' : ''}`;
    document.body.appendChild(ov);
    const sk = ov.querySelector('.st-skip');
    if (sk) sk.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); skipAll(); });
    ov.addEventListener('pointerdown', e => { e.preventDefault(); nextBeat(); });
  }
  const WH = { a: 0, to: 0, v: 3 };
  function white(a, dur = 0.35) { WH.to = a; WH.v = 1 / Math.max(0.05, dur); }
  function whiteStep(dt) {
    const d = WH.to - WH.a, st = WH.v * dt;
    WH.a = Math.abs(d) <= st ? WH.to : WH.a + Math.sign(d) * st;
    const w = ov && ov.querySelector('.st-white'); if (w) w.style.opacity = String(WH.a);
  }
  function nextBeat() {
    if (!CINE.on) return;
    const b = CINE.beats[CINE.i]; if (b && b.noSkip) return;
    if (CINE.bt < 0.5) return;   // art arda dokunuşlar tek sayılır
    const A = A_(); if (A && A.stopVoice) A.stopVoice();
    CINE.bt = CINE.dur;
  }
  function skipAll() { if (!CINE.on) return; CINE.skipAll = true; const A = A_(); if (A && A.stopVoice) A.stopVoice(); }
  let zzzWrapped = false;
  function quietZzz() {   // (uyku zaten kapalı göz ve anlatımla belli; yakın kamerada Z harfleri ekranı kaplıyor)
    if (zzzWrapped || typeof FX === 'undefined' || !FX || typeof FX.burst !== 'function') return;
    zzzWrapped = true;
    const b0 = FX.burst;
    try { FX.burst = function (kind) { if (kind === 'zzz' && (CINE.on || NAPP.on || (G_() && G_().state === 'title'))) return; return b0.apply(this, arguments); }; } catch (e) { /* yok */ }
  }
  function runCine(kind, beats) {
    quietZzz();
    return new Promise(res => { Object.assign(CINE, { on: true, kind, beats, i: -1, t: 0, bt: 0, dur: 0, done: res, skipAll: false }); enterBeat(0); });
  }
  function enterBeat(i) {
    CINE.i = i; CINE.bt = 0;
    const b = CINE.beats[i]; if (!b) return endCine();
    let d = b.min || 1.5;
    for (const key of [].concat(b.key || [])) { const L = line(key, null, 4, { interrupt: key === [].concat(b.key)[0] }); d = Math.max(d, (L || lineLen(key)) + (b.pad ?? 0.35)); }
    if (Array.isArray(b.key) && b.key.length > 1) d = b.key.reduce((s, k) => s + lineLen(k) + 0.3, 0) || d;
    CINE.dur = Math.max(b.min || 1.5, d);
    try { b.enter && b.enter(); } catch (e) { console.warn('STORY beat', e); }
  }
  function cineStep(dt) {
    if (!CINE.on) return;
    CINE.t += dt; CINE.bt += dt; whiteStep(dt);
    const b = CINE.beats[CINE.i];
    if (b && b.tick) { try { b.tick(clamp(CINE.bt / CINE.dur, 0, 1), dt, CINE.bt); } catch (e) { console.warn('STORY tick', e); } }
    if (CINE.skipAll && !(b && b.noSkip)) {
      CINE.skipAll = false;
      const j = CINE.beats.findIndex(x => x.final);
      if (j > CINE.i) { enterBeat(j); return; }
      if (j < 0) { endCine(); return; }
    }
    if (CINE.bt >= CINE.dur) enterBeat(CINE.i + 1);
  }
  function endCine() {
    const res = CINE.done, kind = CINE.kind;
    CINE.on = false; CINE.beats = null; CINE.done = null; CINE.kind = '';
    if (ov && WH.a > 0.5) { const o = ov; ov = null; o.style.pointerEvents = 'none'; const sk = o.querySelector('.st-skip'); if (sk) sk.remove(); setTimeout(() => { o.remove(); if (!ov) document.body.classList.remove('st-cinema'); }, 700); }
    else overlay(false);
    WH.a = WH.to = 0;
    restoreNear();
    if (kind === 'intro') titlePose();
    restoreChars();
    if (res) res();
  }

  // ───────────────────────── Giriş masalı ─────────────────────────
  function introBeats() {
    const f = ACT.feza, p = ACT.piril, D = TS.dream;
    const sleepPose = () => {
      Object.assign(f, { x: BED.x + 0.25, z: BED.z, y: BED.top - 0.05, face: 0, sleep: true, cheer: false, move: 0 });
      Object.assign(p, { x: BED.x - 0.3, z: BED.z - 0.4, y: BED.top, face: 0.7, hop: 0, sit: true, stand: false, happy: 0 });   // (yastığın yanında, Feza'nın omzunun arkasında; kamera üstten bakar, ikisi de görünür)
    };
    // ~25 s: uyuyorlar (1) → beş ışık (3) → Pırıl uyandırır (uyan) → rüyaya geçiş → bulut esner, ışıklar savrulur (4) →
    // ışıklar dağıldı, kanatlar söndü (6) → "birlikte bulalım" (hadi). (pr_giris_2/5/7, pp_giris_ruzgar/uzgun kısalık için çalınmaz)
    return [
      { key: 'pr_giris_1', min: 3, pad: 0.2, enter() { sleepPose(); camTo(1.0, 2.35, 1.8, BED.x - 0.15, 0.6, BED.z - 0.1, 2, true); CINE.near = 0.08; music('pr_menu'); },
        tick(u) { camTo(1.0 - u * 0.3, 2.35, 1.8 - u * 0.2, BED.x - 0.15, 0.6, BED.z - 0.1, 1.2); } },
      { key: 'pr_giris_3', min: 3, pad: 0.2, enter() {
          // beş ışık Pırıl'ın kanatlarında küçük parlak noktalar (model: pirilIsik); ortada uçuşan büyük toplar yok
          TS.orbs.g.visible = false; orbMode = 'off'; pirilIsik(5);
          sfx('isikKirinti', { vol: 0.7 }); camTo(0.45, 2.15, 1.2, BED.x - 0.3, 0.7, BED.z - 0.3, 1.6);
        } },
      { key: 'pp_giris_uyan', min: 2.6, pad: 0.2, enter() { p.sit = false; p.stand = false; p.happy = 1; p.hop = 0.5; sfx('kanat', { vol: 0.8 }); camTo(0.65, 1.75, 2.6, BED.x + 0.05, 1.05, BED.z + 0.1, 1.8); },
        tick(u) { p.hop = 0.5 + 0.12 * Math.sin(CINE.t * 6); if (u > 0.55 && f.sleep) { f.sleep = false; f.x = 0.3; f.z = BED.z + 0.9; f.y = 0; f.face = -0.4; } } },
      { min: 1.3, noSkip: true, enter() { white(1, 0.5); sfx('buyume', { vol: 0.6 }); },
        tick(u) { if (u > 0.6 && TS.room.visible) {   // rüyaya geçiş: oda kaybolur, bulut diyarı belirir
          TS.room.visible = false; D.g.visible = true; TS.orbs.g.visible = false;   // (rüyada ışıklar kanatlarda: kopana dek görünmez)
          Object.assign(f, { x: -0.4, z: 0.6, y: 0, face: 0.2, sleep: false });
          Object.assign(p, { x: 0.6, z: 0.4, y: 0, hop: 0.9, face: -0.3, sit: false });
          camTo(0.3, 1.8, 4.2, 0.2, 1.4, -1.5, 3, true); white(0, 0.6);
        } } },
      { key: 'pr_giris_4', min: 3.6, pad: 0.2, enter() { camTo(0.2, 1.9, 4.6, 0.4, 2.6, -4, 1.4); sfx('bulutPuf', { vol: 0.8 }); },
        tick(u, dt) {
          const m = D.bulut.mouth, open = u < 0.3 ? u / 0.3 : u < 0.75 ? 1 : Math.max(0, 1 - (u - 0.75) / 0.2);
          m.scale.set(0.22 + 0.18 * open, 0.06 + 0.42 * open, 0.08); D.bulut.g.scale.setScalar(1 + 0.06 * open);
          if (open > 0.8) { shake(0.06, 0.2); f.face = 0.6; }
          if (u > 0.45 && orbMode !== 'out') { orbsOut(); pirilIsik(0); sfx('kanatRuzgar', { vol: 0.9 }); }   // esneme rüzgârı ışıkları savurur
          p.hop = 0.9 + 0.1 * Math.sin(CINE.t * 5);
        } },
      { key: 'pr_giris_6', min: 3.6, pad: 0.2, enter() { TS.orbs.g.visible = false; orbMode = 'off'; p.hop = 0.45; p.sit = false; p.happy = 0; p.face = -0.2; camTo(0.25, 1.5, 3.7, 0.15, 0.95, 0.45, 1.8); } },   // (sönük kanatlı, hafif şaşkın Pırıl; ikisi de tam kadrajda)
      { key: 'pp_giris_hadi', min: 3.4, pad: 0.2, final: true, enter() {
          Object.assign(f, { x: -0.4, z: 0.6, y: 0, face: 0.2, sleep: false }); TS.room.visible = false; D.g.visible = true;
          p.sit = false; p.hop = 0.5; p.happy = 1; f.cheer = true; sfx('pirilMutlu', { vol: 0.8 });
          camTo(0.15, 1.45, 4.1, 0.1, 1.05, 0.4, 1.6);   // geniş: havadaki Pırıl da tam kadrajda
          burst('confetti', origin.x, 2.2, origin.z + 0.5, { count: 20 });
        } },
    ];
  }
  function playIntro() {
    const g = G_();
    if (!g || !g.L || !g.L._storyTitle || !TS.room || CINE.on) return Promise.resolve(false);
    titlePose(); overlay(true); CAM_.snap = false;
    return runCine('intro', introBeats()).then(() => true);
  }

  // ───────────────────────── Oyun içi anlar ─────────────────────────
  const MOM = { on: false, t: 0, dur: 0, fn: null, a0: 0 };
  const _mp = new THREE.Vector3(), _ml = new THREE.Vector3(), _cv = new THREE.Vector3();
  function momentCamera(dt) {
    const c = realCam(); if (!c) return;
    const g = G_(), P = g && g.P; if (!P) return;
    MOM.t += dt;
    const u = MOM.t / MOM.dur, w = ease(Math.min(MOM.t / 0.7, (MOM.dur - MOM.t) / 0.8, 1));
    const a = MOM.a0 + u * (MOM.spin ?? 0.9), R = MOM.R || 5.2;
    let cx = MOM.cx ?? P.pos.x, cz = MOM.cz ?? P.pos.z;
    if ((MOM.nap || MOM.pair) && g.Bilbo && g.Bilbo.root) { cx = (P.pos.x + g.Bilbo.root.position.x) / 2; cz = (P.pos.z + g.Bilbo.root.position.z) / 2; }   // mola: ikisinin ortası
    const asp = c.aspect || 1.44, kd = asp < 1.3 ? Math.min(1.6, Math.pow(1.44 / asp, 0.58)) : 1, ly = MOM.ly ?? 1.4;   // dikey: geri çekil
    _mp.set(cx + Math.sin(a) * R * kd, ly + ((MOM.H || 2.4) - ly) * kd, cz + Math.cos(a) * R * kd); _ml.set(cx, ly, cz);
    c.position.lerp(_mp, w);
    _cv.set(0, 0, -1).applyQuaternion(c.quaternion).multiplyScalar(6).add(c.position); _cv.lerp(_ml, w);
    c.lookAt(_cv); c.updateMatrixWorld();
  }
  addEventListener('pointerdown', e => { if (MOM.on && !CINE.on && e.target && e.target.tagName === 'CANVAS') MOM.t = Math.max(MOM.t, MOM.dur - 0.45); }, true);
  addEventListener('keydown', () => { if (MOM.on && !CINE.on) MOM.t = Math.max(MOM.t, MOM.dur - 0.45); }, true);
  const BOSSAT = { x: 0, z: 0, on: false };   // son neşelenen bossun yeri (yakın plan onun olmadığı yandan çekilir)
  const angD = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  // Kamera–Feza koridorunda dekor (deniz otu, mercan, mantar…) var mı: aday açıları sırayla (şimdikine en yakından) ışınla dene,
  // 0,4 m'den yüksek bir şeye çarpmayan ilk açıyı al (yer, karakterler, mola yatağı sayılmaz). Yalnız an başında, birkaç ışın.
  const _rc = typeof THREE !== 'undefined' ? new THREE.Raycaster() : null, _ro = _rc && new THREE.Vector3(), _rd = _rc && new THREE.Vector3();
  function rayBlocked(ox, oy, oz, tx, ty, tz, skip) {   // skip: ışınlanacak (süzülmüş) mesh listesi
    _ro.set(ox, oy, oz); _rd.set(tx - ox, ty - oy, tz - oz); const d = _rd.length(); if (d < 0.01) return false;
    _rd.multiplyScalar(1 / d); _rc.set(_ro, _rd); _rc.near = 0.3; _rc.far = d; _rc.camera = realCam() || _rc.camera;   // (yazı/işaret sprite'ları için gerekli)
    if (!_rc.camera) return false;
    let hits; try { hits = _rc.intersectObjects(skip, false); } catch (e) { return false; }
    for (const h of hits) {
      if (h.point.y < 0.4 || h.object.isSprite || h.object.isPoints || h.object.isLine) continue;
      return true;
    }
    return false;
  }
  // yüksek dekor listesi (bölge başına bir kez): karakterler, düz zeminler (yüksekliği < 0,4 m) ve görünmezler dışarıda
  const RAYC = { L: null, list: [] };
  function rayList(g) {
    if (RAYC.L === g.L) return RAYC.list;
    RAYC.L = g.L; RAYC.list = [];
    const skip = new Set([g.H && g.H.root, g.Bilbo && g.Bilbo.root, NBED.g, TS.orbs && TS.orbs.g].filter(Boolean));
    const walk = o => {
      if (!o.visible || skip.has(o)) return;
      if ((o.isMesh || o.isInstancedMesh) && !o.isSprite && o.geometry) {
        const gm = o.geometry; if (!gm.boundingBox) gm.computeBoundingBox();
        const bb = gm.boundingBox, sy = Math.abs(o.matrixWorld.elements[5]) || 1;
        if (bb && (bb.max.y - bb.min.y) * sy > 0.4 && !(o.material && o.material.transparent && o.material.opacity < 0.3)) RAYC.list.push(o);
      }
      for (const c of o.children) walk(c);
    };
    walk(scene); return RAYC.list;
  }
  function scanStep() {   // her kare 1 aday açı: açık koridor bulunca MOM.a0 = o açı (yakın plan daha 0,2 s içinde, fark edilmez)
    const S = MOM.scan; if (!S || S.done || !MOM.on) return;
    const g = G_(), P = g && g.P; if (!P || !_rc) { S.done = true; return; }
    for (let k = 0; k < 1 && !S.done; k++, S.i++) {
      if (S.i >= 12) { S.done = true; break; }
      const d = (S.i % 2 ? 1 : -1) * Math.ceil(S.i / 2) * (Math.PI / 6), a = S.base + d;
      if (angleClear(a, P, g)) { MOM.a0 = a; S.done = true; }
    }
  }
  function angleClear(a, P, g) {
    const c = realCam(), asp = (c && c.aspect) || 1.44, kd = asp < 1.3 ? Math.min(1.6, Math.pow(1.44 / asp, 0.58)) : 1;
    const R = (MOM.R || 5.2) * kd, ly = MOM.ly ?? 1.4, Hc = ly + ((MOM.H || 2.4) - ly) * kd, sp = MOM.spin ?? 0.9;
    const bx = g.Bilbo && g.Bilbo.root ? g.Bilbo.root.position.x : P.pos.x, bz = g.Bilbo && g.Bilbo.root ? g.Bilbo.root.position.z : P.pos.z;
    const mx = (P.pos.x + bx) / 2, mz = (P.pos.z + bz) / 2, list = rayList(g);
    for (const q of [0, 1]) {
      const aa = a + sp * q, cx = mx + Math.sin(aa) * R, cz = mz + Math.cos(aa) * R;
      if (BOSSAT.on && Math.hypot(cx - BOSSAT.x, cz - BOSSAT.z) < 6.5) return false;   // (dev boss gövdesi kameranın önüne girmesin)
      if (BOSSAT.on) { const t = ((BOSSAT.x - mx) * (cx - mx) + (BOSSAT.z - mz) * (cz - mz)) / (R * R); if (t > 0 && t < 1.2 && Math.hypot(mx + (cx - mx) * t - BOSSAT.x, mz + (cz - mz) * t - BOSSAT.z) < 3.2) return false; }
      if (rayBlocked(mx, 0.8, mz, cx, Hc, cz, list)) return false;
    }
    return true;
  }
  function moment(dur, o = {}) {
    if (MOM.on && MOM.fn) { const f0 = MOM.fn; MOM.fn = null; f0(); }   // (önceki yakın plan yerine yenisi)
    MOM.on = true; MOM.t = 0; MOM.dur = dur; MOM.cx = o.x; MOM.cz = o.z; MOM.R = o.R; MOM.H = o.H; MOM.spin = o.spin; MOM.ly = o.ly; MOM.nap = false; MOM.pair = false; MOM.scan = null;
    MOM.a0 = typeof CAM !== 'undefined' ? CAM.yaw || 0 : 0;
    // açı seçimi: kamera ile Feza arasındaki ~6 m'lik koridorda (ve dönüş boyunca) neşelenen boss ya da çıkış kapısı kalmasın.
    // 16 aday açı denenir; engellere en uzak (eşitlikte şimdiki açıya en yakın) olan seçilir.
    const g = G_(), P = g && g.P;
    if (P) {
      const obs = [];
      const bossR = BOSSAT.on ? Math.max(2.6, ((g.boss && g.boss.height) || 3) * 0.9) : 0;   // büyük boss (ayıcık) daha geniş tutulur
      if (BOSSAT.on) obs.push([BOSSAT.x, BOSSAT.z, bossR]);
      const po = g.L && (g.L.portalObj || g.L.exit); if (po && Number.isFinite(po.x)) obs.push([po.x, po.z, 2.4]);
      const near = obs.filter(o => Math.hypot(o[0] - P.pos.x, o[1] - P.pos.z) < 12);
      if (near.length) {
        const sp = MOM.spin ?? 0.9, L6 = Math.max(6, (MOM.R || 5.2) * 1.3);
        const clear = a => {   // bu açıdaki koridordan engellere en kısa boşluk (m)
          let m = 99;
          for (const q of [0, 0.5, 1]) {
            const aa = a + sp * q, dx = Math.sin(aa), dz = Math.cos(aa);
            for (const o of near) {
              const ox = o[0] - P.pos.x, oz = o[1] - P.pos.z, t = Math.max(0, Math.min(L6, ox * dx + oz * dz));
              m = Math.min(m, Math.hypot(ox - dx * t, oz - dz * t) - o[2]);
            }
            if (BOSSAT.on) {   // kamera noktasının kendisi de bosstan uzak (yakın plan boss ekranı kaplamasın: ≈ ekranın ≤ %20'si)
              const R0 = (MOM.R || 5.2) * 1.2, cx = P.pos.x + dx * R0, cz = P.pos.z + dz * R0;
              m = Math.min(m, Math.hypot(cx - BOSSAT.x, cz - BOSSAT.z) - (bossR + 4.5));
            }
          }
          return m;
        };
        let best = MOM.a0, bs = -1e9;
        for (let i = 0; i < 16; i++) {
          const a = MOM.a0 + i / 16 * Math.PI * 2, c = Math.min(clear(a), 3) - Math.abs(angD(a, MOM.a0)) * 0.15;
          if (c > bs) { bs = c; best = a; }
        }
        MOM.a0 = best;
      }
      MOM.scan = { i: 0, base: MOM.a0, done: false };   // ışın taraması frame()'de, kare başına 2 aday
    }
    return new Promise(res => { MOM.fn = res; });
  }
  // Uyku molası: ekran hafifçe kararır, yıldızlar ve "z z z" süzülür, ninni; dokununca geçer (dünya durmaz, kısa).
  // NAP.tok: her mola/iptal yeni bir jeton; eski zamanlayıcılar jeton tutmazsa hiçbir şey yapmaz (bölüm değişince sessizce düşer).
  let napEl = null;
  const NAP = { tok: 0, zone: -1, after: null };
  const napZone = () => { const g = G_(); return g && g.P ? g.P.zone | 0 : -1; };
  function napLater(tk, t, fn) { later(t, () => { if (tk === NAP.tok && napZone() === NAP.zone) fn(); }); }
  function napClose(instant) {
    const el = napEl; napEl = null; if (!el) return;
    el.classList.add('off'); setTimeout(() => el.remove(), instant ? 0 : 700);
  }
  function napCancel() {   // Feza kapıdan geçti / bölüm değişti: mola ve ona bağlı bütün cümleler düşer
    const was = !!napEl || !!NAP.after; NAP.tok++; NAP.after = null; napClose(true); PH.on = false; PH.held = false; napPose(false);
    const A = A_(), cur = A && A.current;
    if (cur && /^(pp_uyku_|pr_uyku_|pr_isik_|pp_guc_)/.test(cur) && A.stopVoice) A.stopVoice();
    if (was) later(0.05, () => { const Z = typeof ZONES !== 'undefined' ? ZONES[napZone()] : null; music(Z && Z.music ? Z.music : null); });
  }
  // Mola pozu: Feza olduğu yere yan yatıp gözlerini kapar (04_feza'nın uyku pozu: S.dead — finaldeki yatak pozu), Pırıl gelip yanına
  // kıvrılır (PIRIL_GUC.mola). Çocuk yürürse Feza kalkıp yürür (mola sürer), durunca yine uzanır. Bitince ikisi gerinip kalkar.
  const NAPP = { on: false };
  const _zv = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
  function fezaNapWrap() {
    const g = G_(), H = g && g.H; if (!H || H._napWrap || typeof H.update !== 'function') return;
    const u0 = H.update; H._napWrap = true;
    H.update = function (dt, S) {
      if (NAPP.on && S) NAPP.moving = S.move > 0.05;
      if (NAPP.on && S && !S.dead && !(S.move > 0.05) && !(S.attack >= 0) && !(S.cast >= 0) && !S.ride) {
        S.dead = true; try { return u0.call(this, dt, S); } finally { S.dead = false; }
      }
      return u0.call(this, dt, S);
    };
  }
  function napPoseStep(dt) {
    if (!NAPP.on) return;
    NAPP.t = (NAPP.t || 0) + (dt || 0);
    const g = G_(), P = g && g.P, Y = GUC(); if (!P || !P.pos) return;
    napBedStep(dt || 0, P, !NAPP.moving && NAPP.t > 0.4);
    // Feza'nın yanı, kameraya göre sağında (ikisi de görünsün; Pırıl kamerayla Feza'nın arasına girmesin)
    const yaw = MOM.on && MOM.nap ? MOM.a0 + (MOM.t / MOM.dur) * (MOM.spin ?? 0) : (typeof CAM !== 'undefined' && CAM.yaw) || 0;
    const x = P.pos.x + Math.cos(yaw) * 0.95, z = P.pos.z - Math.sin(yaw) * 0.95;
    // Pırıl önce "Uykum geldi…" cümlesini gözleri açık bitirir, sonra yanına gelip kıvrılır
    if (NAPP.t >= NAPP.wait && Y && Y.mola) { try { Y.mola(true, x, z, Math.atan2(P.pos.x - x, P.pos.z - z)); } catch (e) { /* yok */ } }
    if (NAPP.moving && MOM.on && MOM.nap) MOM.t = Math.max(MOM.t, MOM.dur - 0.8);
    // küçük z'ler: Feza ile Pırıl'ın ortasının biraz üstünde (ekran koordinatı)
    const c = realCam(); if (napEl && c && typeof THREE !== 'undefined') {
      const bx = g.Bilbo && g.Bilbo.root ? (P.pos.x + g.Bilbo.root.position.x) / 2 : P.pos.x, bz = g.Bilbo && g.Bilbo.root ? (P.pos.z + g.Bilbo.root.position.z) / 2 : P.pos.z;
      _zv.set(bx, 1.0, bz).project(c);
      if (_zv.z < 1) { napEl.style.setProperty('--zx', ((_zv.x + 1) * 50).toFixed(1) + '%'); napEl.style.setProperty('--zy', ((1 - _zv.y) * 50).toFixed(1) + '%'); }
    }
  }
  // Mola yatağı: yumuşak yastık + küçük yıldızlı battaniye (bir kez kurulur, paylaşılır). Feza uzanınca "pof" diye belirir,
  // kalkıp yürüyünce kaybolur, durup uzanınca yeniden belirir; mola bitince kaybolur. Feza'nın uyku pozunda başı yerel -x yönünde.
  const NBED = { g: null, k: 0, want: false };
  function napBedBuild() {
    if (NBED.g || typeof THREE === 'undefined') return NBED.g;
    const g = new THREE.Group(); g.visible = false;
    const pil = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), new THREE.MeshStandardMaterial({ color: 0xf3e6ff, roughness: 0.9 }));
    pil.scale.set(0.48, 0.2, 0.62); pil.position.set(-0.78, 0.1, 0); g.add(pil);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d'); x.fillStyle = '#7f8cf0'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#fff3a8'; for (let i = 0; i < 14; i++) { const cx = (i * 37) % 120 + 4, cy = (i * 59) % 120 + 4, r = 5 + (i % 3) * 2; x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); }
    x.strokeStyle = '#ffd6f0'; x.lineWidth = 8; x.strokeRect(4, 4, 120, 120);
    const tex = new THREE.CanvasTexture(cv); if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    bl.scale.set(1.2, 0.95, 1.0); bl.position.set(0.3, -0.05, 0); g.add(bl);   // yumuşak, kubbe gibi örtü: omuzdan ayağa
    for (const m of [pil, bl]) { m.castShadow = false; m.receiveShadow = true; }
    scene.add(g); NBED.g = g; return g;
  }
  function napBedStep(dt, P, lying) {
    const g = NBED.g || napBedBuild(); if (!g || !P) return;
    if (lying && !NBED.want) {   // yeni yere uzandı: yatak oraya "pof" diye gelir
      g.position.set(P.pos.x, 0.01, P.pos.z); g.rotation.y = (P.face || 0) - Math.PI / 2 + Math.PI / 2;
      burst('sparkle', P.pos.x, 0.6, P.pos.z, { count: 8, color: '#fff3c8' }); sfx('pop', { vol: 0.5 });
    }
    NBED.want = !!lying;
    NBED.k = Math.max(0, Math.min(1, NBED.k + (lying ? dt * 3 : -dt * 4)));
    g.visible = NBED.k > 0.01; const k = NBED.k < 1 ? NBED.k * (1.15 - 0.15 * NBED.k) : 1; g.scale.setScalar(Math.max(0.01, k));
  }
  function napUi(on) {   // molada arayüz (can küresi, düğmeler) yumuşakça gizlenir; dokunuşlar yine çalışır
    const b = document.body; if (!b) return; injectCss();
    if (on) { b.classList.remove('st-napui-out'); b.classList.add('st-napui'); }
    else if (b.classList.contains('st-napui')) { b.classList.remove('st-napui'); b.classList.add('st-napui-out'); setTimeout(() => b.classList.remove('st-napui-out'), 800); }
  }
  function napPose(on) {
    if (on) { quietZzz(); fezaNapWrap(); NAPP.on = true; NAPP.t = 0; NAPP.wait = Math.max(1.2, (lineLen('pp_uyku_esne') || 2.5) - 0.5); napUi(true); return; }   // (Pırıl cümlenin sonunda süzülüp gelir, cümle bitince kıvrılır)
    if (!NAPP.on) return;
    NAPP.on = false; napUi(false); NBED.want = false;
    const Y = GUC(); if (Y && Y.mola) { try { Y.mola(false); } catch (e) { /* yok */ } }
    const g = G_(); if (g && g.storyCheer) { try { g.storyCheer(1.4, false); } catch (e) { /* yok */ } }   // kalkıp gerinir
  }
  function uykuMolasi(sec = 4.2, after) {
    injectCss();
    if (napEl) napEl.remove();
    const tk = ++NAP.tok; NAP.zone = napZone(); NAP.after = after || null;
    napEl = document.createElement('div'); napEl.className = 'st-nap';
    napEl.innerHTML = '<i>✦</i><i>✧</i><i>✦</i><b>z</b><b>z</b><b>z</b><span>🌙</span>';
    document.body.appendChild(napEl);
    let ended = false;
    const end = () => {
      if (ended || tk !== NAP.tok) return; ended = true;
      napClose(false); music(null); napPose(false);
      later(0.6, () => { if (tk !== NAP.tok) return; const g = G_(), Z = g && typeof ZONES !== 'undefined' ? ZONES[g.P.zone | 0] : null; if (Z && Z.music) music(Z.music); });
      const f = NAP.after; NAP.after = null;
      if (napZone() === NAP.zone) { if (f) f(); else line('pp_uyku_hazir', null, 2); }
    };
    // (dokunuş molayı bitirmez ve oyunu kilitlemez: katman dokunuşları geçirir, çocuk yürüyebilir; mola zamanlayıcısı sürer)
    requestAnimationFrame(() => napEl && napEl.classList.add('on'));
    napPose(true);
    { const g = G_(); if (g && g.P) { moment(sec + 3.4, { R: 4.6, H: 2.2, spin: 0.2, ly: 0.45 }); MOM.nap = true; } }
    music('pr_uyku');
    hushChatter(sec + 1.5, 5);   // mola sürerken yol gösterme / övgü cümleleri susar
    const n = Math.min(4, Math.max(1, isikSayisi()));
    napLater(tk, 0.2, () => { line('pp_uyku_esne', null, 3); line('pr_uyku_' + n, 'Uyku molası!', 3); });
    napLater(tk, sec + 1.2, end);
  }

  // ───────────────────────── Final ─────────────────────────
  const END = { hidden: [], rainbow: null, cloud: null, room: null, T: 0 };
  const CREDITS = [
    ['', 'Feza ile Pırıl', 'Kayıp Ejderha Işıkları'],
    ['Cesur kahraman', 'Feza', '⭐'],
    ['Işıl ışıl ejderha', 'Pırıl', '💜'],
    ['Neşelenen dostlar', 'Pofuduk Mantar · Kirpi Balık · Bukalemun', 'Kurmalı Ayıcık · Fırtına Bulutu'],
    ['Sevgiyle yapıldı', 'Feza için', '💛'],
    ['', 'Tatlı rüyalar Feza!', '🌙'],
  ];
  function credits(t) {
    const el = ov && ov.querySelector('.st-credits'); if (!el) return;
    el.classList.add('on');
    const per = 2.05, i = Math.min(CREDITS.length - 1, Math.floor(t / per));
    if (el._i !== i) { el._i = i; const c = CREDITS[i]; el.innerHTML = `<div class="st-card">${c[0] ? `<b>${c[0]}</b>` : ''}<span>${c[1]}</span><i>${c[2]}</i></div>`; }
    const k = (t - i * per) / per, card = el.firstChild;
    if (card) { const a = i === CREDITS.length - 1 ? Math.min(1, k * 4) : Math.min(1, k * 4, (1 - k) * 5); card.style.opacity = String(Math.max(0, a)); }
  }
  // yataktan kalkmış Feza ile yanında süzülen Pırıl: ikisi de tam kadrajda, yüzler ekranın üst yarısında (kartlar alt üçte birde)
  function finalCam(k) { camTo(-0.05, 1.45, BED.z + 1.0 + 3.1, -0.07, 1.12, BED.z + 1.0, k); }
  function endingBeats() {
    const f = ACT.feza, p = ACT.piril, g = G_(), add = o => { scene.add(o); return o; };
    // binişte kamera Pırıl'ın 110° yanından ve eyerin üstünden: Pırıl'ın büyük başı Feza'yı örtmesin
    // binişte kamera hafif önden 3/4 açıdan ve eyerin biraz üstünden: Pırıl'ın yüzü de Feza'nın yüzü de görünür
    // büyük Pırıl (~3,6 m boy, 4,5 m kanat; PIRIL3D): bakış eyer yüksekliğine (B.saddle, ~2,7 m + uçuş), uzaklık 9–11 m, hafif önden 3/4
    const _sd = new THREE.Vector3();
    let sideSign = 1;   // uçuş başında seçilir: kamera gökkuşağının (−z) tarafına düşmesin; uçuş boyunca sabit
    const sideCam = (d, up, k) => {
      const a = p.face + 1.3 * sideSign, B = g && g.Bilbo; let sy = 2.7 + p.hop;
      if (B && B.saddle) { try { B.root.updateMatrixWorld(true); B.saddle.getWorldPosition(_sd); if (Number.isFinite(_sd.y) && _sd.y > 0.5) sy = _sd.y; } catch (e) { /* yok */ } }
      camTo(p.x + Math.sin(a) * d, sy + up + 1.2, p.z + Math.cos(a) * d, p.x, sy + 0.3, p.z, k);   // (yandan ve üstten: sırttaki Feza'nın yüzü ve gövdesi görünür)
    };
    let grow = 1;
    return [
      { key: ['pr_final_1', 'pp_final_1'], min: 4, enter() {
          Object.assign(f, { x: 0, z: 0, y: 0, face: 0, cheer: true, sleep: false, ride: 0, s: 1 });
          Object.assign(p, { x: 0.95, z: 0.55, y: 0, face: -0.5, hop: 0.6, sit: false, stand: false, happy: 1, s: 1 });   // (parti: Pırıl önde, Feza'nın yanında)
          camTo(0.4, 2.0, 4.6, 0.4, 1.0, -0.2, 2, true); CINE.near = 0.2; music('pr_final'); sfx('isikGeldi', { vol: 0.9 }); pirilIsik(5);
        },
        tick() { if ((CINE.bt % 0.5) < 0.02) burst('sparkle', origin.x + p.x, 1.2, origin.z + p.z, { count: 6, color: '#' + ISIK_RENK[(CINE.bt * 2 | 0) % 5].toString(16).padStart(6, '0') }); } },
      // büyüme PIRIL_GUC.buyu'da (p.s = 1); kamera ~9,6 m uzak, y ~3,5, bakış ~1,8 (büyük Pırıl ve Feza birlikte)
      { key: 'pr_final_2', min: 3.5, enter() { sfx('buyume', { vol: 0.9 }); const Y = GUC(); if (Y && Y.buyu) { try { Y.buyu(true); } catch (e) { /* yok */ } } },
        tick(u) { grow = 2.2; p.s = 1; p.hop = 0.6 * (1 - u); p.x = 1.1 + 0.4 * u; camTo(0.6, 3.5, 9.6, 1.3, 1.8, -0.3, 1.5); if ((CINE.bt % 0.3) < 0.02) burst('magic', origin.x + p.x, 1.5 * grow, origin.z + p.z, { count: 10, color: '#ffd6f4' }); } },
      { key: 'pp_final_bin', min: 2.6, enter() { f.cheer = false; camTo(0.9, 3.5, 9.6, 1.5, 1.8, -0.3, 1.5); },
        tick(u) { if (u > 0.5 && !f.ride) { f.ride = 1; sfx('bounce', { vol: 0.7 }); burst('hearts', origin.x + p.x, 2, origin.z + p.z, { count: 10 }); } } },
      { key: ['pr_final_3', 'pp_final_ucus'], min: 6, enter() {
          END.rainbow = add(buildRainbow()); END.rainbow.position.set(origin.x + 1, 2, origin.z - 11); sfx('ucus', { vol: 0.8 });   // (gökkuşağı geride: kamera içinden geçmesin)
          p.hop = 0.6; p.x = 1.5; p.z = -0.3; p.face = Math.PI / 2;
          sideSign = Math.cos(p.face + 1.3) >= Math.cos(p.face - 1.3) ? 1 : -1;
          sideCam(10, 2.0, 4); CAM_.pos.copy(CAM_.tpos); CAM_.look.copy(CAM_.tlook); CAM_.snap = true;   // (kesme: ilk karede doğrudan hedefte)   // (uçuşa kesmeyle geç: kamera Pırıl'ın içinden süzülmesin)
        },
        tick(u) { const a = u * Math.PI * 1.2; p.x = 1.5 + Math.sin(a) * 3; p.z = -0.3 - (1 - Math.cos(a)) * 2.5; p.y = 0; p.hop = 0.6 + ease(Math.min(1, u * 2)) * 5; p.face = a + Math.PI / 2;
          sideCam(10, 2.0, 4); } },
      { key: ['pr_final_4', 'pp_final_bulut'], min: 5, enter() {
          const c = buildCloud(); END.cloud = c; c.g.position.set(origin.x + p.x - 2, p.hop + 2.5, origin.z + p.z - 7); add(c.g);
          sfx('bulutPuf', { vol: 0.7 });
        },
        tick(u) { END.cloud.g.rotation.z = 0.15 * Math.sin(CINE.t * 3); END.cloud.mouth.scale.set(0.35, 0.12 + 0.05 * Math.sin(CINE.t * 4), 0.08);
          sideCam(10.5, 1.8, 3); } },
      { min: 1.6, noSkip: true, enter() { white(1, 0.6); },
        tick(u) { if (u > 0.6 && !END.room) {   // sabah: yatak odası (dünyanın üstünde, kendi ışığıyla)
          for (const c of scene.children) if (c.visible && !c.isLight && !c.isCamera && c !== g.H.root && c !== (g.Bilbo && g.Bilbo.root)) { END.hidden.push(c); c.visible = false; }
          if (END.rainbow) END.rainbow.visible = false; if (END.cloud) END.cloud.g.visible = false;
          END.room = add(buildBedroom(true)); END.room.position.set(origin.x, 0, origin.z);
          const Y = GUC(); if (Y && Y.buyu) { try { Y.buyu(false); } catch (e) { /* yok */ } }
          Object.assign(f, { x: BED.x + 0.25, z: BED.z, y: BED.top - 0.05, face: 0, sleep: true, ride: 0, cheer: false });
          Object.assign(p, { x: BED.x - 0.55, z: BED.z - 0.36, y: BED.top, face: 0.9, s: 1, hop: 0, sit: true, stand: false, happy: 0 });
          camTo(0.9, 1.6, 1.6, BED.x, 0.6, BED.z, 2, true); CINE.near = 0.08; white(0, 1.2);
        } } },
      { key: ['pr_final_5', 'pp_final_son'], min: 5, enter() { music('pr_menu'); },
        tick(u) {
          if (u > 0.2 && f.sleep) {   // (Pırıl'ın "Günaydın" cümlesinden ~2 s önce: esneyip gerinerek uyanır)
            f.sleep = false; Object.assign(f, { x: 0.35, z: BED.z + 1.0, y: 0, face: -0.25, cheer: true });
            Object.assign(p, { x: -0.5, z: BED.z + 1.05, y: 0, face: 0.3, sit: false, stand: false, hop: 0.45, happy: 0 });   // (gözleri açık konuşsun; sevinç kartlarda)
          }
          if (f.sleep) camTo(0.9 - u * 0.3, 1.7, 2.4, -0.2, 0.8, -0.7, 1.2); else finalCam(1.4);
        } },
      { key: 'pr_final_6', min: CREDITS.length * 2.05 + 0.5, final: true, enter() { f.sleep = false; f.cheer = true; f.ride = 0; END.T = 0; p.happy = 1; },
        tick(u, dt, bt) { credits(bt); p.hop = 0.45 + 0.1 * Math.sin(CINE.t * 5); finalCam(1.4); } },
    ];
  }
  function ownsWorld(dt) {
    if (!(CINE.on && CINE.kind === 'ending')) return false;
    cineStep(dt);
    if (!CINE.on) return false;
    poseChars(dt);
    return true;
  }
  function endingCleanup() {
    for (const c of END.hidden) c.visible = true;
    END.hidden = [];
    for (const k of ['rainbow', 'room']) if (END[k]) { scene.remove(END[k]); disposeTree(END[k]); END[k] = null; }
    if (END.cloud) { scene.remove(END.cloud.g); END.cloud = null; }
    restoreWeapon();
  }
  function ending() {
    const g = G_(); if (!g || !g.P) { line('pr_final_5', 'Tatlı rüyalar Feza!'); return true; }
    if (CINE.on) return true;
    const P = g.P; origin = { x: P.pos.x, z: P.pos.z };
    CH.noWeapon = false; hideWeapon(); STORY.endingDone = false;
    overlay(true, { skip: true });
    runCine('ending', endingBeats()).then(() => { endingCleanup(); STORY.endingDone = true; });
    return true;
  }

  // ───────────────────────── 07_game kancaları ─────────────────────────
  const seen = { zone: {}, area: {}, introAt: -1e9 };
  function hushChatter(sec, rank) { const A = A_(); if (A && A.hush) try { A.hush(sec, rank); } catch (e) { /* yok */ } }
  if (typeof GAME !== 'undefined' && GAME.on) GAME.on('happy', d => { if (d && d.boss) { hushChatter(6, 4); BOSSAT.x = d.x; BOSSAT.z = d.z; BOSSAT.on = true; } });
  if (typeof GAME !== 'undefined' && GAME.on) GAME.on('zone', () => { BOSSAT.on = false; });
  // ışık alındığı an (07 'ingredient' olayı; anlatım 2,5 s sonra): çıkış kapısı mola bitene dek kapalı kalsın (5. ışık hariç: final)
  if (typeof GAME !== 'undefined' && GAME.on) GAME.on('ingredient', () => { const g = G_(), m = g && g.P && g.P.malzemeler; if (m && Object.keys(m).filter(k => m[k]).length < 5) portalHold(true); });
  const isikSayisi = () => { const g = G_(), P = g && g.P; if (P && P.isiklar) return P.isiklar; const m = P && P.malzemeler; return m ? Object.keys(m).filter(k => m[k]).length : 0; };
  // Yeni oyun (07 newGame): Uyku Yuvası yüklendi. Dönen: anlatım süresi (s).
  function intro() {
    seen.zone = { yuva: true }; seen.area = {}; seen.introAt = performance.now(); STORY.endingDone = false;
    const a = line('pr_yuva_ilk', 'Burası Uyku Yuvası. Rüya kapıları seni bekliyor!', 3);
    const a2 = line('pr_yuva_ilk2', null, 2);
    const b = line('pp_yuva_ilk', null, 2);
    return Math.max(a, a2, b);
  }
  function zone(o) {
    TQ.length = 0;   // bölüm değişti: önceki bölümün/yuvanın bekleyen bütün gecikmeli cümleleri ve zamanlayıcıları düşer
    if (CINE.on) { const k = CINE.kind; endCine(); if (k === 'ending') endingCleanup(); }   // (güvenlik: sinematik/jenerik katmanı bölüme sızmasın)
    if (MOM.on) { MOM.t = MOM.dur; }
    napCancel();
    hushChatter(2.5, 3);
    const id = o && o.id; if (!id) return;
    if (id === 'yuva') {
      later(0.15, () => {
        if (performance.now() - seen.introAt < 1500) return;
        if (seen.zone.yuva) {   // 5 ışık tamamsa "biraz daha parlıyor / sıradaki ışık" denmez
          const n = isikSayisi(), k = n >= 5 ? (hasLine('pr_yuva_donus_son') ? 'pr_yuva_donus_son' : 'pr_yuva_donus_3')
            : n > (seen.isikYuva || 0) && n > 0 ? 'pr_yuva_donus_1' : pick(['pr_yuva_donus_2', 'pr_yuva_donus_3']);
          seen.isikYuva = n; line(k, 'Uyku Yuvası\'na döndük!', 2);
        }
        seen.zone.yuva = true;
        const nx = typeof ZONES !== 'undefined' ? ZONES.find(z => !z.def.hub && !(G_().P.bossNese || {})[z.id]) : null;
        if (nx) later(lineLen('pr_yuva_donus_1') + 0.6, () => line('pr_git_' + nx.id, null, 1));
      });
      return;
    }
    // bölüm girişi: anlatıcı + Pırıl (ilk kez); sonraki girişlerde yalnız Pırıl
    later(0.6, () => {
      if (!seen.zone[id]) { seen.zone[id] = 1; line('pr_' + id + '_giris', null, 3); line('pp_' + id + '_giris', null, 2); }
      else if (!speaking()) line(hasLine('pp_' + id + '_giris') ? 'pp_' + id + '_giris' : pick(['pp_bak', 'pp_vay']), null, 1);
    });
  }
  // Feza başka alana geçince, önceki alan için söylenmeye başlamış bölüm cümlesi (ör. "Rengârenk çadırlar…") kesilir.
  // Yeni alanın kendi cümlesi (az önce başlayan, < 0,7 s) ve bölüm giriş/arena cümleleri kesilmez.
  const VOX = { key: null, since: 0 };
  function staleCut(zid) {
    const A = A_(), cur = A && A.current; if (!cur || !A.stopVoice) return;
    if (!(cur.startsWith('pr_' + zid + '_') || cur.startsWith('pp_' + zid + '_')) || /_(giris|arena)$/.test(cur)) return;
    if (performance.now() - VOX.since < 700) return;
    A.stopVoice();
  }
  // alan girişleri: 3. alan "yarı yol", boss arenası (alan listesinin sonu)
  function area(a) {
    if (!a) return;
    const g = G_(), Z = typeof ZONES !== 'undefined' && g ? ZONES[g.P.zone | 0] : null, zid = Z && Z.id;
    if (!zid || (Z.def && Z.def.hub)) return;
    staleCut(zid);
    const k = zid + ':' + (a.boss ? 'arena' : a.index); if (seen.area[k]) return; seen.area[k] = 1;
    if (a.boss) { line('pr_' + zid + '_arena', null, 3, { interrupt: true }); return; }
    if (a.index === 2) later(0.4, () => { if (!speaking()) line(Math.random() < 0.5 && hasLine('pp_' + zid + '_orta') ? 'pp_' + zid + '_orta' : 'pr_' + zid + '_orta', null, 1); });
  }
  // Işık geri geldi (07: boss neşelenince 2,5 s sonra; PIRIL_GUC.ac(n) 07'de çağrıldı): anlatım + Pırıl'ın gücü + uyku molası
  // Işık anı: 07 tek ışık topunu boss'tan Pırıl'a uçurur; top Pırıl'a DEĞDİĞİ an STORY.isikDegdi(n) gelir → ışık cümlesi o an başlar.
  // (07 ayrıca ~2,5 s sonra STORY.ingredient çağırır: değme olayı gelmediyse yedek olarak o başlatır; ikisi bir kez çalışır.)
  const ING = { n: 0, zone: -1 };
  function isikDegdi(n) { return isikAni(n | 0 || isikSayisi()); }
  function ingredient(id) { return isikAni(isikSayisi()); }
  function isikAni(nn) {
    const n = Math.max(1, nn | 0), g = G_(), P = g && g.P;
    if (n >= 5) return 0;   // beşinci ışık: final sinematiği anlatır
    const z = napZone(); if (ING.n === n && ING.zone === z) return 0; ING.n = n; ING.zone = z;
    // Sıra: ışık cümlesi (Pırıl kameraya dönük, kanatları parlar) → bitince uyku molası → mola bitince çıkış kapısı açılır.
    // Kapı mola bitene dek kapalı tutulur (portalHold); bölüm yine de değişirse mola ve cümleleri düşer.
    const d1 = line('pr_isik_' + n, n + '. ışık geri geldi!', 4) || 3.5;
    if (P) {
      moment(d1 + 0.6, { R: 4.8, H: 2.2, spin: 0.35 }); MOM.pair = true;
      for (let i = 0; i < 3; i++) later(0.3 + i * 0.7, () => burst('sparkle', P.pos.x + (Math.random() - 0.5) * 2, 2.2, P.pos.z + (Math.random() - 0.5) * 2, { count: 10, color: '#' + ISIK_RENK[(n - 1) % 5].toString(16).padStart(6, '0') }));
      if (g.storyCheer) try { g.storyCheer(2, true); } catch (e) { /* yok */ }
    }
    const tk = ++NAP.tok; NAP.zone = napZone(); portalHold(true);
    napLater(tk, d1 + 0.75, () => uykuMolasi(lineLen('pp_uyku_esne') + lineLen('pr_uyku_1') + 0.5, () => {
      // uyanınca: önce gerinme (~2 s, gözler açılır), sonra yeni güç + "Dinlendim!" (yalnız aynı bölümdeyken), sonra kapı
      const t2 = NAP.tok; napLater(t2, 2.0, () => { line('pp_guc_' + n, null, 4); line('pp_uyku_hazir', null, 2); });
      portalHold(false);
    }));
    return d1 + 1;
  }
  // çıkış kapısı (L.portalObj) mola bitene dek uyur; bırakılınca kısa bir parıltıyla açılır. Güvenlik: en çok 30 s tutulur.
  const PH = { on: false, held: false, t: 0 };
  function portalHold(on) {
    if (on) { PH.on = true; PH.t = 0; return; }
    if (!PH.on) return;
    PH.on = false;
    const g = G_(), po = g && g.L && g.L.portalObj;
    if (PH.held && po && po.setActive) {
      try { po.setActive(true); } catch (e) { /* yok */ } po.active = true; PH.held = false;
      burst('portal', po.x, 1.2, po.z, { count: 30 }); sfx('portal', { vol: 0.8 });
    }
    PH.held = false;
  }
  function portalStep(dt) {
    if (!PH.on) return;
    PH.t += dt; if (PH.t > 30) { portalHold(false); return; }
    const g = G_(), po = g && g.L && g.L.portalObj;
    if (po && po.active && po.setActive) { try { po.setActive(false); } catch (e) { /* yok */ } po.active = false; PH.held = true; }
  }
  function lostItem() { return 0; }
  function locked(o) {
    const id = o && (o.id || (typeof ZONES !== 'undefined' && ZONES[o.index] && ZONES[o.index].id));
    return line('pr_harita_kilitli', 'Önce önceki ışığı bulalım!', 2) || line('pp_kapi_kapali', null, 2) || (id ? 0 : 0);
  }
  function station(st) { if (st && st.kind === 'kapi' && !speaking()) line(pick(['pp_kapi', 'pp_kapi_2']), null, 1); }

  // her kare (09_ui kamera kancasından): zamanlayıcılar + an kamerası süresi
  const TQ = [];
  function later(t, fn) { TQ.push({ t, fn }); }
  function frame(dt) {
    const A = A_(), cur = A && A.current; if (cur !== VOX.key) { VOX.key = cur; VOX.since = performance.now(); }
    portalStep(dt); napPoseStep(dt); scanStep(); if (!NAPP.on && NBED.g && NBED.k > 0) napBedStep(dt, G_() && G_().P, false);
    for (let i = TQ.length - 1; i >= 0; i--) { const q = TQ[i]; q.t -= dt; if (q.t <= 0) { TQ.splice(i, 1); try { q.fn(); } catch (e) { console.warn('STORY later', e); } } }
    if (MOM.on && MOM.t >= MOM.dur) { MOM.on = false; MOM.nap = false; MOM.pair = false; const f = MOM.fn; MOM.fn = null; if (f) f(); }
  }
  function cameraHook(dt, cam) { window.__storyCam = cam; frame(dt); return cameraImpl(dt, cam); }
  function cameraImpl(dt, c) {
    const g = G_(); if (!g || !c) return false;
    const title = g.state === 'title' && g.L && g.L._storyTitle;
    const ending_ = CINE.on && CINE.kind === 'ending';
    if (!title && !ending_ && !MOM.on) { if (c.near !== 0.5 || c.fov !== 40) restoreNear(); return false; }
    if (MOM.on && !title && !ending_) { momentCamera(dt); return true; }
    if (title && !CINE.on && !window.__camHold) titleCamera();
    const k = 1 - Math.exp(-CAM_.k * dt);
    CAM_.pos.lerp(CAM_.tpos, CAM_.snap ? 1 : k); CAM_.look.lerp(CAM_.tlook, CAM_.snap ? 1 : k); CAM_.snap = false;
    CAM_.fov += (CAM_.tfov - CAM_.fov) * k;
    c.position.copy(CAM_.pos);
    // dikey ekran: yatay görüş dar → kamera bakış noktasından geri çekilir (en-boy oranına göre), kimse kenarda kesilmesin
    const asp = c.aspect || (innerWidth / Math.max(1, innerHeight));
    if (asp < 1.3) { const kd = Math.min(1.7, Math.pow(1.44 / asp, 0.58)); c.position.sub(CAM_.look).multiplyScalar(kd).add(CAM_.look); }
    const sh = typeof FX !== 'undefined' && FX.shakeOffset ? FX.shakeOffset : null;
    if (sh) c.position.add(sh);
    c.lookAt(CAM_.look);
    let ch = false;
    if (Math.abs(c.near - CINE.near) > 1e-4) { c.near = CINE.near; ch = true; }
    if (Math.abs(c.fov - CAM_.fov) > 1e-3) { c.fov = CAM_.fov; ch = true; }
    if (ch) c.updateProjectionMatrix();
    c.updateMatrixWorld();
    return true;
  }

  // ───────────────────────── Logo + stiller ─────────────────────────
  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style'); s.id = 'storyCss';
    s.textContent = `
.st-cinema #ui>:not(.u-sub){opacity:0!important;pointer-events:none!important;transition:opacity .3s}
@media (orientation:portrait){.st-cinema #ui .u-sub{left:6vw!important;right:6vw!important;top:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 3vh)!important}}   /* dikey sinematik: altyazı alt %20'de, karakterlerin üstüne binmez */
.st-ov{position:fixed;inset:0;z-index:40;touch-action:none;-webkit-user-select:none;user-select:none;cursor:pointer}
.st-white{position:absolute;inset:0;background:#f6f2ff;opacity:0;pointer-events:none}
.st-skip{position:absolute;top:calc(env(safe-area-inset-top,0px) + 16px);right:calc(env(safe-area-inset-right,0px) + 16px);min-width:120px;height:72px;padding:0 22px;border-radius:40px;border:4px solid #fff;
 background:linear-gradient(#9fa8ff,#6a74e8);color:#fff;font:900 26px/1 "Avenir Next Rounded","Arial Rounded MT Bold",ui-rounded,system-ui,sans-serif;box-shadow:0 6px 0 #434bb0,0 10px 20px rgba(0,0,0,.25);opacity:.88}
.st-skip:active{transform:translateY(4px);box-shadow:0 2px 0 #434bb0}
.st-credits{position:absolute;inset:0;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .8s}
.st-credits.on{opacity:1}
.st-card{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 14px);bottom:auto;translate:-50% 0;min-width:34%;max-width:80%;padding:10px 26px 12px;border-radius:26px;text-align:center;color:#fff;
 background:linear-gradient(rgba(120,110,230,.85),rgba(70,60,160,.85));border:4px solid rgba(255,255,255,.85);box-shadow:0 10px 30px rgba(20,20,80,.35);
 font-family:"Chalkboard SE","Marker Felt","Segoe Print","Comic Sans MS",cursive;text-shadow:0 3px 0 rgba(30,20,90,.55)}
.st-card b{display:block;font-size:19px;color:#fff1a8;font-weight:700;margin-bottom:2px}.st-card span{display:block;font-size:34px;font-weight:900;line-height:1.1}
.st-card i{display:block;font-style:normal;font-size:22px;margin-top:4px}
@media (max-width:820px){.st-card span{font-size:28px}.st-card b{font-size:17px}}
.st-napui #ui>:not(.u-sub){opacity:0!important;transition:opacity .6s}.st-napui-out #ui>:not(.u-sub){transition:opacity .6s}
.st-nap{position:fixed;inset:0;z-index:35;background:radial-gradient(circle at 50% 55%,rgba(40,40,110,0) 0,rgba(40,40,110,.1) 30%,rgba(15,15,50,.5) 100%);opacity:0;transition:opacity .7s;pointer-events:none}
.st-nap.on{opacity:1}.st-nap.off{opacity:0;pointer-events:none}
.st-nap span{position:absolute;right:12%;top:12%;font-size:90px;filter:drop-shadow(0 0 20px #fff6c0)}
.st-nap i{position:absolute;font-style:normal;color:#fff6c0;font-size:44px;animation:st-tw 1.6s ease-in-out infinite}
.st-nap i:nth-child(1){left:18%;top:20%}.st-nap i:nth-child(2){left:70%;top:34%;animation-delay:-.5s}.st-nap i:nth-child(3){left:40%;top:14%;animation-delay:-1s}
.st-nap b{position:absolute;left:var(--zx,50%);top:var(--zy,45%);color:#fff;font:900 30px/1 "Chalkboard SE","Comic Sans MS",cursive;text-shadow:0 2px 0 rgba(60,40,120,.6);animation:st-z 2.4s ease-in infinite;opacity:0}
.st-nap b:nth-of-type(2){animation-delay:.8s}.st-nap b:nth-of-type(3){animation-delay:1.6s}
@keyframes st-tw{0%,100%{transform:scale(.7);opacity:.5}50%{transform:scale(1.2);opacity:1}}
@keyframes st-z{0%{transform:translate(0,0) scale(.6);opacity:0}20%{opacity:1}100%{transform:translate(36px,-90px) scale(1.15);opacity:0}}
.sl-logo{display:flex;flex-direction:column;align-items:center;font-family:"Chalkboard SE","Marker Felt","Segoe Print","Comic Sans MS",cursive;line-height:1;filter:drop-shadow(0 6px 0 rgba(30,20,90,.4)) drop-shadow(0 12px 18px rgba(0,0,0,.3))}
.sl-row{display:flex;align-items:flex-end;justify-content:center;gap:.04em;white-space:nowrap}
.sl-big{font-size:calc(var(--k,1) * 96px);font-weight:900}
.sl-l{display:inline-block;-webkit-text-stroke:.09em #fff;paint-order:stroke fill;animation:st-wob 2.6s ease-in-out infinite}
.sl-l:nth-child(2n){animation-delay:-.6s}.sl-l:nth-child(3n){animation-delay:-1.3s}
.sl-ve{font-size:.5em;color:#fff;margin:0 .22em;-webkit-text-stroke:0;text-shadow:0 2px 0 #4a3ea0;align-self:center}
.sl-rib{margin-top:.25em;font-size:calc(var(--k,1) * 32px);font-weight:900;color:#fff;padding:.18em .9em .24em;border-radius:.6em;
 background:linear-gradient(#9d8cff,#6a5ae0);box-shadow:0 .14em 0 #43389a;text-shadow:0 2px 0 rgba(30,20,90,.45);transform:rotate(-2deg)}
@keyframes st-wob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-.06em) rotate(3deg)}}
@media (max-width:820px){.sl-big{font-size:68px}.sl-rib{font-size:24px}}
@media (max-height:560px){.sl-big{font-size:58px}.sl-rib{font-size:20px}}`;
    document.head.appendChild(s);
  }
  // 09_ui başlık logosu: "Feza ile Pırıl — Kayıp Ejderha Işıkları" (el yazısı, renkli)
  function logo(el) {
    if (!el) return;
    injectCss();
    const cols = ['#ff7fbf', '#ffc94a', '#5fd0ff', '#8be36a', '#c49bff'];
    const word = (w, o) => w.split('').map((ch, i) => `<span class="sl-l" style="color:${cols[(i + o) % cols.length]}">${ch}</span>`).join('');
    el.innerHTML = `<div class="sl-logo"><div class="sl-row sl-big">${word('Feza', 0)}<span class="sl-ve">ile</span>${word('Pırıl', 2)}</div>
      <div class="sl-rib">Kayıp Ejderha Işıkları</div></div>`;
  }

  return {
    intro, zone, area, ingredient, isikDegdi, lostItem, locked, station, ending,
    buildTitle, titleTick, iconTick, ownsWorld, playIntro, logo, uykuMolasi,
    camera: cameraHook,
    busy: () => CINE.on,
    endingDone: false,
    kapiBekle: () => PH.on,   // true: uyku molası bitene dek çıkış kapısı kapalı kalmalı (07 openPortal bunu bekleyebilir)
    get cine() { return CINE.on ? CINE.kind : ''; },
    _CINE: CINE, _TS: TS, _ACT: ACT, _END: END, _skip: () => skipAll(), _next: () => nextBeat(), _camTo: camTo,
  };
})();
