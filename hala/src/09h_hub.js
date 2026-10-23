/* ── Merkez panelleri (HUB): Aytuğ Hala'nın mutfak masasındaki istasyonlar ──
   UI, Feza bir istasyona girince HUB.open(id, istasyon) çağırır (src/09_ui.js 'station'). Paneller büyük, resimli,
   okuma gerektirmez (her şeyi Aytuğ Hala söyler), iPad'de dokunması kolay (≥ 80 px):
     pasta     → Pasta süsleme: yakın kamera, süs tepsisi, süsü sürükleyip pastaya bırak (GAME.addCakeDecoration)
     gardirop  → Gardırop (GAME.setCostume)            bilbo    → Bilbo'nun Köşesi (GAME.setBilboAccessory)
     album     → Çıkartma Albümü (oda oda sayfalar)     mini     → Mini Oyun Köşesi (MINIGAME.start)
     surpriz   → Günün Sürprizi (GAME.dailySurprise; kurdeleyi çek, kutu açılır)
   Panel açıkken dünya durur (UI.setPaused). Resimler: gerçek 3B modellerden küçük görüntü (renderer ile hedef dokuya çizilir).
   Kataloglar (KOSTUM, AKSESUAR, CIKARTMA) dışarıdan genişletilebilir: HUB.KOSTUM.push({id, ad, ikon, model?}). Genel ad: HUB. */
const HUB = (() => {
  'use strict';
  const TAU4 = Math.PI * 2;
  const Gm = () => (typeof GAME !== 'undefined' ? GAME : null);
  const PP = () => (Gm() && Gm().P) || {};
  // ── ses ──
  const said = {};
  function say(key, prio = 3) {
    if (typeof AUD === 'undefined' || !AUD.LINES || !AUD.LINES[key] || !AUD.say) return 0;
    try { return AUD.say(key, { prio, interrupt: prio >= 4 || !!S.cur }) || 0; } catch (e) { return 0; }   // panel açıkken eski cümle beklemez
  }
  function sayOnce(key, prio) { if (said[key]) return 0; said[key] = 1; return say(key, prio); }
  let praiseN = 0, lastPraise = '';
  function praise(keys, every = 3) {   // övgü ara sıra ve çeşitli (her seferinde değil)
    praiseN++;
    if (praiseN < every && Math.random() > 0.25) return;
    praiseN = 0;
    const pool = keys.filter(k => k !== lastPraise), k = pool[Math.floor(Math.random() * pool.length)] || keys[0];
    lastPraise = k; say(k, 3);
  }
  const sfx = (n, o) => { const g = Gm(); if (g && g.halaApi) try { g.halaApi.sfx(n, o); } catch (e) { /* ses yok */ } };
  // ── kataloglar ──
  const KOSTUM = [
    { id: null, ad: 'Kendi Kıyafetim', renk: '#8fc4ff' },
    { id: 'pastaci', ad: 'Pastacı Feza', renk: '#ffe2b8' },
    { id: 'superKahraman', ad: 'Süper Kahraman Feza', renk: '#ff9a9a' },
    { id: 'sovalye', ad: 'Şövalye Feza', renk: '#c9d2e4' },
    { id: 'kasif', ad: 'Kaşif Feza', renk: '#bfe3a8' },
    { id: 'astronot', ad: 'Astronot Feza', renk: '#c7c3ff' },
  ];
  const AKSESUAR = [
    { id: null, ad: 'Hiçbiri', renk: '#d8c4ae' },
    { id: 'tasma', ad: 'Kırmızı Tasma', renk: '#ffb0b0' },
    { id: 'bandana', ad: 'Bandana', renk: '#a8d0ff' },
    { id: 'sapka', ad: 'Parti Şapkası', renk: '#ffe08a' },
    { id: 'gozluk', ad: 'Güneş Gözlüğü', renk: '#c8f0d8' },
    { id: 'papyon', ad: 'Papyon', renk: '#f4c0ff' },
  ];
  const ODALAR = [
    { id: 'oturma', ad: 'Oturma Odası', ikon: '🛋️', renk: '#8fb0d8' },
    { id: 'mutfak', ad: 'Mutfak', ikon: '🍳', renk: '#f0b45a' },
    { id: 'buzdolabi', ad: 'Buzdolabı', ikon: '🧊', renk: '#7fcbe8' },
    { id: 'pasta', ad: 'Pasta Krallığı', ikon: '🎂', renk: '#f28fb4' },
    { id: 'balkon', ad: 'Balkon Bahçesi', ikon: '🌻', renk: '#7fcf6a', opt: true },
  ];
  const odalar = () => ODALAR.filter(o => !o.opt || (typeof ZONE_DEFS !== 'undefined' && ZONE_DEFS[o.id]));
  const KAYIP = { gozluk: 'Aytuğ Hala’nın Gözlüğü', anahtar: 'Aytuğ Hala’nın Anahtarı', toka: 'Aytuğ Hala’nın Tokası', telefon: 'Aytuğ Hala’nın Telefonu' };
  const KAYIP_IKON = { gozluk: '👓', anahtar: '🔑', toka: '🎀', telefon: '📱' };
  // Gizli / sürpriz çıkartmaları: {id: {ad, ikon}} (bölüm ajanları HUB.CIKARTMA[id] = {ad, ikon} ile ekleyebilir)
  // Odaların gizli çıkartmaları (bölüm ajanlarının verdiği id'ler; albümde sayfasında adlı/simgeli boş yuva olarak durur)
  const GIZLI = {
    oturma: { oturma_hazine: ['Halı Hazinesi', '💰'], oturma_tv: ['Çizgi Film Televizyonu', '📺'], oturma_domino: ['Domino Kitaplar', '📚'], oturma_kaset: ['Uzayan Kaset', '📼'], oturma_bilbo: ['Bilbo Koşusu', '🐕'] },
    mutfak: { mutfak_hazine: ['Kurabiye Hazinesi', '🍪'], mutfak_sunger: ['Zıplayan Sünger', '🧽'], mutfak_tereyag: ['Tereyağı Kaydırağı', '🧈'], mutfak_un: ['Un Dağı', '🏔️'],
      mutfak_musluk: ['Musluk Oyunu', '🚰'], mutfak_tekne: ['Kap Tekne', '⛵'], mutfak_kapak: ['Tencere Kapakları', '🥁'], mutfak_baharat: ['Baharat Kuleleri', '🧂'], mutfak_kavanoz: ['Şeker Kavanozu', '🍬'] },
    buzdolabi: { gizli_jole_altin: ['Altın Jöle', '🟨'], gizli_buz_iglo: ['Buz Evi', '🛖'], gizli_buzdolabi_isigi: ['Buzdolabı Işığı', '💡'], gizli_buz_canlari: ['Buz Çanları', '🔔'], gizli_dondurma_kaydiragi: ['Dondurma Kaydırağı', '🍦'] },
    pasta: { gizli_krema_sal: ['Krema Salı', '🛶'], gizli_krema_torbasi: ['Krema Torbası', '🎂'], gizli_lolipop_fener: ['Lolipop Fener', '🍭'], gizli_kurabiye_ev: ['Kurabiye Ev', '🏠'], gizli_seker_mum: ['Şeker Mum', '🕯️'], gizli_pamuk_altin: ['Altın Pamuk Şeker', '☁️'] },
    balkon: { balkon_bahce: ['Balkon Bahçesi', '🌻'] },
  };
  const CIKARTMA = {
    surpriz_gokkusagi: { ad: 'Gökkuşağı', ikon: '🌈' }, surpriz_yildiz: { ad: 'Parlak Yıldız', ikon: '🌟' }, surpriz_kalp: { ad: 'Kocaman Kalp', ikon: '💖' },
    surpriz_yunikorn: { ad: 'Yunikorn', ikon: '🦄' }, surpriz_roket: { ad: 'Roket', ikon: '🚀' }, surpriz_cicek: { ad: 'Ayçiçeği', ikon: '🌻' },
    surpriz_balon: { ad: 'Balonlar', ikon: '🎈' }, surpriz_dondurma: { ad: 'Dondurma', ikon: '🍦' },
  };
  const tr = s => String(s || '').replace(/([a-zçğışöü])([A-ZÇĞİŞÖÜ])/g, '$1 $2').replace(/^./, c => c.toLocaleUpperCase('tr'));
  // ── küçük resim (3B modelden PNG) ──
  const TH = {};
  const THS = { sc: null, cam: null, lights: null };
  function thumbScene() {
    if (THS.sc) return THS;
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xfff6ee, 0x8a7068, 1.5));
    const k = new THREE.DirectionalLight(0xfff0e0, 2.4); k.position.set(-2, 4, 5); sc.add(k);
    const r = new THREE.DirectionalLight(0xffd0ec, 1.0); r.position.set(3, 2, -4); sc.add(r);
    THS.sc = sc; THS.cam = new THREE.PerspectiveCamera(26, 1, 0.05, 200);
    return THS;
  }
  // build() → Object3D (ya da {root, dispose}); o.dir: bakış yönü [x,y,z]
  // thumb(): hepsi bir kerede (panel açıkken eksik kalan resim). thumbSteps(): aynı iş, aşamalara bölünmüş (boşta ısınma:
  // kur → gölgelendiriciyi arka planda derle → çiz/oku/PNG — her biri ayrı kare, oyun takılmasın).
  let CAP = null;   // warm(): img*() çağrıları çizmek yerine işi buraya yazar
  function thumb(key, build, o = {}) {
    if (key in TH) return TH[key];
    if (CAP) { CAP.push([key, build, o]); return 'yakinda'; }
    const it = thumbSteps(key, build, o, false);
    let r; while (!(r = it.next()).done) { /* tek seferde */ }
    return r.value;
  }
  function* thumbSteps(key, build, o = {}, async = true) {
    if (key in TH) return TH[key];
    if (typeof renderer === 'undefined' || !renderer || !renderer.readRenderTargetPixels) { TH[key] = null; return null; }
    const N = o.n || 192, T = thumbScene();
    let obj = null, disp = null, rt = null;
    try {
      const b = build(); if (!b) { TH[key] = null; return null; }
      obj = b.isObject3D ? b : b.root; disp = b.dispose || null;
      obj.traverse(x => { if (x.isMesh) x.frustumCulled = false; });
      T.sc.add(obj); obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj); if (box.isEmpty()) { TH[key] = null; return null; }
      const sph = box.getBoundingSphere(new THREE.Sphere()), dir = new THREE.Vector3(...(o.dir || [0.35, 0.42, 1])).normalize();
      const cam = T.cam, dist = sph.radius * (o.zoom || 1.08) / Math.sin(cam.fov * Math.PI / 360);
      cam.position.copy(sph.center).addScaledVector(dir, dist); cam.near = dist * 0.2; cam.far = dist * 4; cam.updateProjectionMatrix(); cam.lookAt(sph.center);
      if (async) {
        yield 'kur';
        if (renderer.compileAsync) {   // resmin kendi hedefine bağlıyken derle (çıktı renk uzayı aynı program olsun)
          rt = new THREE.WebGLRenderTarget(N, N, { samples: 4, colorSpace: THREE.SRGBColorSpace, depthBuffer: true });
          const prev = renderer.getRenderTarget(); let p = null;
          try { renderer.setRenderTarget(rt); p = renderer.compileAsync(T.sc, cam); } catch (e) { /* yok */ } finally { renderer.setRenderTarget(prev); }
          if (p) yield p;
        }
        yield 'derle';
        if (renderer.initTexture) {   // dokular ekran kartına (ilk çizimde yüklenmesin)
          const seen = new Set();
          obj.traverse(x => { const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : [];
            const up = t => { if (t && t.isTexture && !seen.has(t)) { seen.add(t); try { renderer.initTexture(t); } catch (e) { /* yok */ } } };
            for (const m of ms) {
              for (const k in m) up(m[k]);
              for (const U of [m.uniforms, m.userData && m.userData.u, m.userData && m.userData.ok]) if (U) for (const k in U) up(U[k] && U[k].value);
            } });
          yield 'doku';
        }
        if (key in TH) return TH[key];   // bu arada panel kendisi çizdi
      }
      const prevRT = renderer.getRenderTarget(), prevCol = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
      if (!rt) rt = new THREE.WebGLRenderTarget(N, N, { samples: 4, colorSpace: THREE.SRGBColorSpace, depthBuffer: true });
      const buf = new Uint8Array(N * N * 4);
      try {
        renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
        renderer.render(T.sc, cam);
        renderer.readRenderTargetPixels(rt, 0, 0, N, N, buf);
      } finally { try { renderer.setRenderTarget(prevRT); renderer.setClearColor(prevCol, prevA); } catch (e) { /* yok */ } }
      const c = document.createElement('canvas'); c.width = c.height = N;
      const g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
      let cover = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const s = ((N - 1 - y) * N + x) * 4, t = (y * N + x) * 4, a = buf[s + 3], k = a > 0 && a < 255 ? 255 / a : 1;
        d[t] = Math.min(255, buf[s] * k); d[t + 1] = Math.min(255, buf[s + 1] * k); d[t + 2] = Math.min(255, buf[s + 2] * k); d[t + 3] = a; cover += a;
      }
      if (cover < N * N * 255 * 0.02) { TH[key] = null; return null; }
      g.putImageData(img, 0, 0);
      return (TH[key] = c.toDataURL('image/png'));
    } catch (e) { console.warn('[HUB] thumb ' + key, e); TH[key] = null; return null; }
    finally {
      if (rt) rt.dispose();
      if (obj) { T.sc.remove(obj); if (disp) try { disp(); } catch (e) { /* yok */ } else obj.traverse(x => { if (x.geometry && !x.geometry.userData.keep && !x.geometry.userData.cached) x.geometry.dispose(); if (x.material && !x.material.userData.keep) x.material.dispose(); }); }
    }
  }
  const kitObj = (fill, mat) => { const k = new Kit(); fill(k); return new THREE.Mesh(k.build(), mat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 })); };
  // Kostüm simgeleri (3B): şapka / pelerin / miğfer …
  const KOSTUM_MODEL = {
    _kendi: k => { for (let i = 0; i < 6; i++) k.add(G.box(), i % 2 ? 0xffffff : 0x3a7fd8, [0, 0.25 + i * 0.25, 0], null, [1.6, 0.25, 0.8]); for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) k.add(G.box(), i % 2 ? 0xffffff : 0x3a7fd8, [sd * 1.15, 1.1 + i * 0.2, 0], [0, 0, sd * 0.5], [0.8, 0.2, 0.7]); k.add(G.torus(Math.PI, 0.18, 12), 0xffffff, [0, 1.75, 0.1], [0, 0, Math.PI], [0.35, 0.25, 0.35]); },
    pastaci: k => { k.add(G.cyl(1, 1, 24), 0xffffff, [0, 0.5, 0], null, [0.75, 1.0, 0.75]); for (let i = 0; i < 6; i++) { const a = i * TAU4 / 6; k.add(G.sphere(14, 10), 0xffffff, [Math.sin(a) * 0.55, 1.25, Math.cos(a) * 0.55], null, 0.55); } k.add(G.sphere(14, 10), 0xffffff, [0, 1.5, 0], null, 0.6); k.add(G.torus(TAU4, 0.12, 24), 0xf2a6c0, [0, 0.12, 0], [Math.PI / 2, 0, 0], [0.78, 0.78, 0.78]); k.add(G.cyl(1, 1, 8), 0xc8ccd2, [1.2, 0.6, 0.3], [0, 0, -0.5], [0.06, 1.2, 0.06]); for (let i = 0; i < 4; i++) k.add(G.torus(TAU4, 0.05, 12), 0xc8ccd2, [1.5, 1.25, 0.3], [0, i * 0.8, -0.5], [0.22, 0.4, 0.22]); },
    superKahraman: k => { k.add(G.cone(4), 0xe83a3a, [0, 0.9, -0.2], [0.1, Math.PI / 4, 0], [1.3, 1.9, 0.25]); k.add(G.cyl(1, 1, 28), 0xffd23f, [0, 1.2, 0.2], [Math.PI / 2, 0, 0], [0.62, 0.12, 0.62]); k.add(G.sphere(8, 6), 0xe83a3a, [0, 1.2, 0.3], [0, 0, 0], [0.32, 0.32, 0.06]); const s = []; for (let i = 0; i < 5; i++) { const a = i * TAU4 / 5; k.add(G.cone(4), 0xe83a3a, [Math.sin(a) * 0.28, 1.2 + Math.cos(a) * 0.28, 0.32], [0, 0, -a], [0.1, 0.24, 0.04]); } k.add(G.box(), 0x2a2a6a, [0, 2.0, 0.2], null, [1.3, 0.32, 0.2]); for (const sd of [-1, 1]) k.add(G.sphere(10, 8), 0xffffff, [sd * 0.3, 2.0, 0.31], null, [0.16, 0.1, 0.04]); },
    sovalye: k => { k.add(G.sphere(20, 14), 0xc9d0da, [0, 1.0, 0], null, [0.85, 0.95, 0.85]); k.add(G.box(), 0x4a5260, [0, 1.0, 0.72], null, [0.9, 0.12, 0.3]); k.add(G.box(), 0x4a5260, [0, 0.82, 0.74], null, [0.12, 0.45, 0.28]); for (let i = 0; i < 5; i++) k.add(G.sphere(10, 8), 0xe84a6a, [0, 1.9 + i * 0.05, -0.2 - i * 0.18], null, [0.22, 0.3, 0.22]); k.add(G.cyl(1, 1, 24), 0xc9d0da, [0, 0.12, 0], null, [0.95, 0.24, 0.95]); k.add(G.rbox(2), 0x3a7fd8, [1.3, 0.8, 0.4], [0, -0.4, 0], [1.0, 1.3, 0.16]); k.add(G.box(), 0xffd23f, [1.3, 0.8, 0.5], [0, -0.4, 0], [0.16, 1.1, 0.06]); k.add(G.box(), 0xffd23f, [1.3, 0.95, 0.5], [0, -0.4, 0], [0.8, 0.16, 0.06]); },
    kasif: k => { k.add(G.cyl(1, 1, 28), 0xc8a46a, [0, 0.1, 0], null, [1.4, 0.12, 1.4]); k.add(G.sphere(20, 12), 0xd8b47a, [0, 0.2, 0], null, [0.85, 0.8, 0.85]); k.add(G.cyl(1, 1, 28), 0x7a5a3a, [0, 0.38, 0], null, [0.88, 0.22, 0.88]); k.add(G.torus(TAU4, 0.14, 24), 0x5a4a3a, [1.0, 0.9, 0.7], [0.2, 0.4, 0], [0.5, 0.5, 0.5]); k.add(G.cyl(1, 1, 24), 0xbfe8ff, [1.0, 0.9, 0.7], [Math.PI / 2 + 0.2, 0, 0.4], [0.45, 0.04, 0.45]); k.add(G.cyl(1, 1, 8), 0x5a4a3a, [1.45, 0.4, 0.75], [0, 0, 0.6], [0.09, 0.8, 0.09]); },
    astronot: k => { k.add(G.sphere(24, 16), 0xf6f8fc, [0, 1.0, 0], null, 1.0); k.add(G.sphere(20, 14), 0x2a3a6a, [0, 1.0, 0.42], null, [0.72, 0.6, 0.62]); k.add(G.sphere(10, 8), 0xffffff, [-0.25, 1.2, 0.95], null, [0.16, 0.1, 0.05]); k.add(G.cyl(1, 1, 24), 0xc8ccd6, [0, 0.12, 0], null, [0.85, 0.25, 0.85]); k.add(G.cyl(1, 1, 8), 0xc8ccd6, [0.6, 2.0, 0], [0, 0, -0.3], [0.04, 0.6, 0.04]); k.add(G.sphere(10, 8), 0xff5d6e, [0.72, 2.3, 0], null, 0.12); k.add(G.box(), 0xe84a4a, [-0.95, 1.0, 0.1], null, [0.12, 0.4, 0.3]); },
  };
  const AKS_MODEL = {
    _yok: k => { k.add(G.torus(TAU4, 0.3, 24), 0xcfc0ae, [0, 0.6, 0], null, [0.7, 0.7, 0.7]); k.add(G.sphere(14, 10), 0xcfc0ae, [0, 0.6, 0], null, [0.12, 0.12, 0.12]); },
    tasma: k => { k.add(G.torus(TAU4, 0.16, 32), 0xe8404f, [0, 0.8, 0], [1.2, 0, 0], [1, 1, 1]); for (let i = 0; i < 6; i++) { const a = i * TAU4 / 6; k.add(G.sphere(8, 6), 0xffd23f, [Math.cos(a), 0.8 + Math.sin(a) * Math.sin(1.2) * 0.36, Math.sin(a) * Math.cos(1.2) * 0.36 + 0], null, 0.08); } k.add(G.cyl(1, 1, 20), 0xf2c44a, [0, 0.0, 0.42], [Math.PI / 2, 0, 0], [0.32, 0.06, 0.32]); k.add(G.torus(TAU4, 0.25, 12), 0xc8a030, [0, 0.36, 0.38], null, [0.12, 0.12, 0.12]); },
    bandana: k => { k.add(G.cone(3), 0x3a8ff0, [0, 0.6, 0], [Math.PI, 0, 0], [1.2, 1.3, 0.15]); for (let i = 0; i < 9; i++) k.add(G.sphere(8, 6), 0xffffff, [(hashH(i, 1) - 0.5) * 1.2 * (1 - hashH(i, 2)), 0.9 - hashH(i, 2) * 0.9, 0.09], null, [0.08, 0.08, 0.03]); k.add(G.capsule(1, 8), 0x3a8ff0, [0, 1.2, -0.05], [0, 0, Math.PI / 2], [0.12, 0.9, 0.12]); },
    sapka: k => { for (let i = 0; i < 5; i++) k.add(G.cyl(Math.max(0.01, 1 - (i + 1) / 5), 1 - i / 5, 24), i % 2 ? 0xffd23f : 0xff5d8f, [0, 0.2 + i * 0.4, 0], null, [0.8, 0.4, 0.8]); k.add(G.sphere(14, 10), 0x5ec8ff, [0, 2.2, 0], null, 0.24); for (let i = 0; i < 6; i++) k.add(G.sphere(8, 6), [0x5ec8ff, 0x7ad16b, 0xb784ff][i % 3], [Math.sin(i) * 0.5, 0.5 + i * 0.22, Math.cos(i) * 0.5 * (1 - i * 0.12) + 0.2], null, 0.07); },
    gozluk: k => { for (const sd of [-1, 1]) { k.add(G.cyl(1, 1, 24), 0x1e2a3a, [sd * 0.55, 0.6, 0], [Math.PI / 2, 0, 0], [0.48, 0.1, 0.4]); k.add(G.torus(TAU4, 0.1, 24), 0xffd23f, [sd * 0.55, 0.6, 0.03], null, [0.5, 0.42, 0.5]); k.add(G.sphere(8, 6), 0xffffff, [sd * 0.55 - 0.2, 0.75, 0.08], null, [0.1, 0.06, 0.02]); } k.add(G.torus(Math.PI, 0.18, 12), 0xffd23f, [0, 0.65, 0.03], null, [0.14, 0.12, 0.14]); },
    papyon: k => { for (const sd of [-1, 1]) k.add(G.cone(16), 0xb056e0, [sd * 0.45, 0.6, 0], [0, 0, -sd * Math.PI / 2], [0.42, 0.9, 0.3]); k.add(G.sphere(14, 10), 0x9040c8, [0, 0.6, 0], null, [0.22, 0.26, 0.2]); for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) k.add(G.sphere(8, 6), 0xffffff, [sd * (0.5 + i * 0.2), 0.6 + (i ? -0.12 : 0.12), 0.18], null, 0.06); },
  };
  const KAYIP_MODEL = {
    gozluk: k => { for (const sd of [-1, 1]) { k.add(G.torus(TAU4, 0.1, 28), 0xd0303e, [sd * 0.6, 0.6, 0], null, [0.48, 0.48, 0.48]); k.add(G.cyl(1, 1, 24), 0xe8f6ff, [sd * 0.6, 0.6, 0], [Math.PI / 2, 0, 0], [0.46, 0.02, 0.46]); k.add(G.cyl(1, 1, 8), 0xd0303e, [sd * 1.1, 0.6, -0.5], [Math.PI / 2, 0, 0], [0.05, 1.0, 0.05]); } k.add(G.torus(Math.PI, 0.18, 12), 0xd0303e, [0, 0.66, 0], null, [0.14, 0.12, 0.14]); },
    anahtar: k => { k.add(G.torus(TAU4, 0.22, 28), 0xf2c44a, [-0.8, 0.6, 0], null, [0.5, 0.5, 0.5]); k.add(G.box(), 0xf2c44a, [0.3, 0.6, 0], null, [1.6, 0.22, 0.14]); for (const [x, h] of [[0.75, 0.38], [0.95, 0.28], [0.5, 0.3]]) k.add(G.box(), 0xf2c44a, [x, 0.6 - 0.11 - h / 2, 0], null, [0.14, h, 0.14]); k.add(G.sphere(10, 8), 0xff6fa8, [-0.8, 0.6, 0], null, [0.18, 0.18, 0.1]); },
    toka: k => { k.add(G.capsule(3, 10), 0xff6fa8, [0, 0.5, 0], [0, 0, Math.PI / 2], [0.16, 0.36, 0.1]); for (let i = 0; i < 5; i++) { const a = i * TAU4 / 5; k.add(G.sphere(12, 8), 0xffffff, [Math.sin(a) * 0.3, 0.95 + Math.cos(a) * 0.3, 0.12], null, [0.2, 0.2, 0.08]); } k.add(G.sphere(12, 8), 0xffd23f, [0, 0.95, 0.18], null, [0.16, 0.16, 0.1]); },
  };
  function hashH(a, b) { const s = Math.sin(a * 91.7 + b * 47.3) * 43758.5453; return s - Math.floor(s); }
  // Gerçek modelle önizleme: Feza kostümüyle (FEZA.create + setCostume), Bilbo aksesuarıyla (BILBO.create + setAccessory); olmazsa 3B simge
  const realFeza = id => () => {
    if (typeof FEZA === 'undefined' || !FEZA.create) return null;
    const m = FEZA.create(); if (!m || !m.root) return null;
    if (m.setCostume) m.setCostume(id || null);
    if (m.update) try { m.update(0, { move: 0, attack: -1, cast: -1, idleT: 0 }); } catch (e) { /* yok */ }
    return { root: m.root, dispose: () => { try { if (m.dispose) m.dispose(); } catch (e) { /* yok */ } } };
  };
  const realBilbo = id => () => {
    if (typeof BILBO === 'undefined' || !BILBO.create) return null;
    const m = BILBO.create(); if (!m || !m.root) return null;
    if (m.setAccessory) m.setAccessory(id || null);
    if (m.update) try { m.update(0, { portrait: true }); } catch (e) { /* yok */ }
    return { root: m.root, dispose: () => { try { if (m.dispose) m.dispose(); } catch (e) { /* yok */ } } };
  };
  const ICONK = { superkahraman: 'superKahraman', gunluk: '_kendi' };
  const imgKostum = id => thumb('kf_' + (id || '_'), realFeza(id), { dir: [0.25, 0.15, 1], zoom: 0.78 }) || thumb('k_' + (id || '_kendi'), () => kitObj(KOSTUM_MODEL[ICONK[id] || id || '_kendi'] || KOSTUM_MODEL._kendi));
  const imgAks = id => thumb('ab_' + (id || '_'), realBilbo(id), { dir: [0.7, 0.3, 1], zoom: 0.95 }) || thumb('a_' + (id || '_yok'), () => kitObj(AKS_MODEL[id || '_yok'] || AKS_MODEL._yok));
  const imgKayip = id => thumb('ky_' + id, () => kitObj(KAYIP_MODEL[id] || KAYIP_MODEL.anahtar));
  function imgSus(id) {
    return thumb('s_' + id, () => {
      const it = CAKE.ITEMS[id]; if (!it) return null;
      const k = new Kit(), kb = new Kit(), q = { berry: [], flame: [] };
      it.parts(k, q);
      for (const b of q.berry) kb.add(CAKE._berryG(), 0xffffff, [b[0], b[1], b[2]], null, b[3] * 0.6);
      for (const f of q.flame) k.add(G.sphere(8, 6), 0xffcf5a, [f[0], f[1], f[2]], null, [0.07, 0.14, 0.07]);
      const g = new THREE.Group(), M = CAKE._mats();
      if (k.parts.length) g.add(new THREE.Mesh(k.build(), M.gloss));
      if (kb.parts.length) g.add(new THREE.Mesh(kb.build(), M.berry));
      return { root: g, dispose: () => { g.traverse(x => { if (x.geometry) x.geometry.dispose(); }); for (const m in M) M[m].dispose(); } };
    }, { dir: id === 'serpme' ? [0.2, 1.4, 1] : [0.3, 0.55, 1], zoom: 1.0 });
  }
  const ST = { move: 0, windup: 0, attack: 0, hurt: 0, frozen: 0, dying: 0, t: 0.4, walk: 0, speed: 0 };
  function imgHuysuz(type) {
    return thumb('h_' + type, () => {
      if (typeof EMODEL === 'undefined' || !EMODEL.build) return null;
      const m = EMODEL.build(type, {}); if (!m || !m.root) return null;
      if (m.setMood) try { m.setMood('happy'); } catch (e) { /* yok */ }
      if (m.anim) try { m.anim(0, ST); } catch (e) { /* yok */ }
      return { root: m.root, dispose: () => { if (m.dispose) m.dispose(); } };
    }, { dir: [0.25, 0.3, 1], zoom: 1.02 });
  }
  // ── DOM yardımcıları ──
  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const S = { root: null, cur: null, closing: false, decor: null, seen: null };
  function rootEl() {
    if (S.root) return S.root;
    S.root = el('div', 'hb-root', document.body);
    S.root.addEventListener('pointerdown', e => e.stopPropagation());
    window.addEventListener('keydown', e => { if (!S.cur) return; if (e.key === 'Escape') { close(); } e.stopPropagation(); }, true);
    return S.root;
  }
  const pause = on => { try { if (typeof UI !== 'undefined' && UI.setPaused) UI.setPaused(on); else if (Gm()) Gm().paused = on; } catch (e) { /* yok */ } };
  // Ortak panel: başlık kurdelesi (simge + ad), büyük kapat düğmesi, içerik
  function panel(id, title, ikon, color) {
    const r = rootEl();
    r.innerHTML = '';
    r.classList.remove('hb-out'); r.classList.add('hb-on');
    const back = el('div', 'hb-back', r);
    const card = el('div', 'hb-card hb-' + id, r);
    card.style.setProperty('--c', color || '#f28fb4');
    const head = el('div', 'hb-head', card);
    el('div', 'hb-ikon', head, ikon);
    el('div', 'hb-title', head, title);
    const x = el('button', 'hb-x', card, '<span>✕</span>'); x.setAttribute('aria-label', 'Kapat');
    x.addEventListener('click', () => close());
    back.addEventListener('click', () => close());
    const body = el('div', 'hb-body', card);
    S.cur = { id, card, body };
    pause(true); sfx('open', { vol: 0.7 });
    return { card, body };
  }
  function close(silent) {
    if (!S.cur || S.closing) return;
    const c = S.cur; S.closing = true;
    if (c.onClose) try { c.onClose(); } catch (e) { console.warn('[HUB] close', e); }
    if (!silent) sfx('close', { vol: 0.6 });
    S.root.classList.add('hb-out');
    setTimeout(() => { S.root.classList.remove('hb-on', 'hb-out'); S.root.innerHTML = ''; S.closing = false; }, 260);
    S.cur = null;
    pause(false);
  }
  // Konfeti / yıldız patlaması (DOM): x, y ekran px
  function pop(x, y, n = 14, kind = 'star') {
    const r = rootEl(), cols = ['#ff5d8f', '#5ec8ff', '#ffd23f', '#7ad16b', '#b784ff', '#ff9a3c'];
    for (let i = 0; i < n; i++) {
      const p = el('i', 'hb-pop ' + kind, r);
      const a = Math.random() * TAU4, d = 50 + Math.random() * 90;
      p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d - 30 + 'px');
      p.style.setProperty('--col', cols[i % cols.length]); p.style.animationDelay = Math.random() * 0.08 + 's';
      setTimeout(() => p.remove(), 1000);
    }
  }
  const centerOf = e => { const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
  // Resimli kart: img (dataURL ya da null → emoji), durum: kilitli / seçili
  function tile(parent, o) {
    const b = el('button', 'hb-tile' + (o.locked ? ' locked' : '') + (o.sel ? ' sel' : '') + (o.big ? ' big' : ''), parent);
    b.style.setProperty('--tc', o.renk || '#ffe6f0');
    const pic = el('div', 'hb-pic', b);
    if (o.img) { const im = el('img', '', pic); im.src = o.img; im.alt = ''; im.draggable = false; } else el('div', 'hb-emo', pic, o.ikon || '⭐');
    if (o.locked) el('div', 'hb-lock', b, '🔒');
    if (o.sel) el('div', 'hb-check', b, '✓');
    if (o.ad) el('div', 'hb-name', b, o.ad);
    if (o.stars != null) { const s = el('div', 'hb-stars', b); for (let i = 0; i < 3; i++) el('span', i < o.stars ? 'on' : '', s, '★'); }
    if (o.onTap) b.addEventListener('click', ev => o.onTap(b, ev));
    return b;
  }
  const shake = b => { b.classList.remove('hb-shake'); void b.offsetWidth; b.classList.add('hb-shake'); sfx('nope', { vol: 0.6 }); };
  // ── Gardırop ──
  const RENK = ['#8fc4ff', '#ffe2b8', '#ff9a9a', '#c9d2e4', '#bfe3a8', '#c7c3ff', '#ffd0e8', '#d8f5e2'];
  function kostumListe() {
    let L = KOSTUM.slice();
    if (typeof FEZA !== 'undefined' && FEZA.costumes) try { L = FEZA.costumes().map((c, i) => ({ id: c.id === 'gunluk' ? null : c.id, ad: c.ad, arti: c.arti, renk: RENK[i % RENK.length] })); } catch (e) { /* katalog */ }
    const P = PP(), ids = new Set(L.map(k => k.id));
    for (const id in P.kostumler || {}) if (!ids.has(id)) L.push({ id, ad: tr(id), renk: '#ffe0f0' });
    return L;
  }
  function openGardirop() {
    const { body } = panel('gardirop', 'Gardırop', '👗', '#b48ad8');
    const grid = el('div', 'hb-grid', body);
    const draw = () => {
      grid.innerHTML = '';
      const P = PP();
      for (const k of kostumListe()) {
        const own = !k.id || (P.kostumler && P.kostumler[k.id]), sel = (P.kostum || null) === k.id;
        tile(grid, { img: imgKostum(k.id), ad: k.ad, renk: k.renk, locked: !own, sel, onTap: b => {
          if (!own) { shake(b); say('gardirop_kilit', 3); return; }
          if (sel) { say('gardirop_ayni', 2); return; }
          const g = Gm(); if (g && g.setCostume) g.setCostume(k.id);
          sfx('star', { vol: 0.8 }); pop(...centerOf(b), 18);
          if (!k.id) say('gardirop_kendi', 3); else praise(['gardirop_sec1', 'gardirop_sec2', 'gardirop_sec3'], 1);
          draw();
        } });
      }
    };
    draw();
    if (!sayOnce('gardirop_tanit', 3)) { /* ikinci gelişte sessiz */ }
  }
  // ── Bilbo'nun Köşesi ──
  function aksListe() {
    let L = AKSESUAR.slice();
    if (typeof BILBO !== 'undefined' && BILBO.ACCESSORIES) L = [AKSESUAR[0]].concat(BILBO.ACCESSORIES.map((a, i) => ({ id: a.id, ad: a.ad, renk: RENK[(i + 1) % RENK.length] })));
    const P = PP(), ids = new Set(L.map(k => k.id));
    for (const id in (P.bilboAksesuar && P.bilboAksesuar.sahip) || {}) if (!ids.has(id)) L.push({ id, ad: tr(id), renk: '#e0f0ff' });
    return L;
  }
  function openBilbo() {
    const { body } = panel('bilbo', 'Bilbo’nun Köşesi', '🐶', '#4fa0a8');
    const grid = el('div', 'hb-grid', body);
    const draw = () => {
      grid.innerHTML = '';
      const P = PP(), ba = P.bilboAksesuar || { sahip: {}, takili: null };
      for (const k of aksListe()) {
        const own = !k.id || (ba.sahip && ba.sahip[k.id]), sel = (ba.takili || null) === k.id;
        tile(grid, { img: imgAks(k.id), ad: k.ad, renk: k.renk, locked: !own, sel, onTap: b => {
          if (!own) { shake(b); say('bilbo_kilit', 3); return; }
          if (sel) return;
          const g = Gm(); if (g && g.setBilboAccessory) g.setBilboAccessory(k.id);
          sfx('bilboBark', { vol: 0.8 }); sfx('star', { vol: 0.6 }); pop(...centerOf(b), 16, 'heart');
          if (!k.id) say('bilbo_hic', 3); else praise(['bilbo_sec1', 'bilbo_sec2', 'bilbo_sec3'], 1);
          draw();
        } });
      }
    };
    draw();
    sayOnce('bilbo_tanit', 3);
  }
  // ── Çıkartma Albümü ──
  // Huysuz türlerinin hangi odaya ait olduğu: oda listesi (normal + elit + boss + bossun çağırdığı minikler); kalanlar Sürprizler sayfasında
  function huysuzOdasi() {
    const map = {};
    if (typeof HUYSUZ === 'undefined' || !HUYSUZ.forZone) return map;
    for (const o of odalar()) {
      const H = HUYSUZ.forZone(o.id); if (!H) continue;
      for (const t in H.enemies || {}) map[t] = map[t] || o.id;
      for (const t of H.elites || []) map[t] = map[t] || o.id;
      if (H.boss) { map[H.boss] = o.id; const bd = HUYSUZ.get(H.boss), add = bd && bd.bossKit && bd.bossKit.add; if (add && !map[add]) map[add] = o.id; }
    }
    return map;
  }
  function albumSayfa(z) {
    const P = PP(), C = P.cikartmalar || {}, out = [], map = huysuzOdasi();
    const H = typeof HUYSUZ !== 'undefined' && HUYSUZ.forZone ? HUYSUZ.forZone(z.id) : null, eli = new Set((H && H.elites) || []);
    const ids = Object.keys(map).filter(t => map[t] === z.id && !(H && H.boss === t));
    for (const t of ids) { const d = HUYSUZ.get && HUYSUZ.get(t); out.push({ id: t, tur: 'huysuz', ad: (d && d.ad) || tr(t), have: !!C[t], etiket: d && (d.nadir || /altin/i.test(t)) ? '✨' : eli.has(t) ? '⭐' : null }); }
    if (H && H.boss) { const d = HUYSUZ.get && HUYSUZ.get(H.boss); out.push({ id: H.boss, tur: 'boss', ad: (d && d.ad) || tr(H.boss), have: !!C[H.boss], big: true }); }
    const zd = typeof ZONE_DEFS !== 'undefined' && ZONE_DEFS[z.id], ky = zd && zd.kayipEsya;
    if (ky) out.push({ id: 'kayip_' + ky, kayip: ky, tur: 'kayip', ad: KAYIP[ky] || tr(ky), ikon: KAYIP_IKON[ky], have: !!(P.kayipEsyalar && P.kayipEsyalar[z.id]) });
    const GZ = GIZLI[z.id] || {};
    for (const id in GZ) out.push({ id, tur: 'gizli', ad: GZ[id][0], ikon: GZ[id][1], have: !!C[id] });
    for (const id in C) { const c = C[id]; if (c && c.tur === 'gizli' && c.bolum === z.id && !out.some(o => o.id === id) && !/^mini_/.test(id)) out.push({ id, tur: 'gizli', ad: (CIKARTMA[id] && CIKARTMA[id].ad) || tr(id), ikon: (CIKARTMA[id] && CIKARTMA[id].ikon) || '⭐', have: true }); }
    return out;
  }
  function albumOzel() {   // Günün Sürprizi, mini oyun ve odası olmayan çıkartmalar
    const P = PP(), C = P.cikartmalar || {}, out = [], map = huysuzOdasi(), known = new Set();
    for (const z in GIZLI) for (const id in GIZLI[z]) known.add(id);
    for (const id in CIKARTMA) { out.push({ id, tur: 'gizli', ad: CIKARTMA[id].ad, ikon: CIKARTMA[id].ikon, have: !!C[id] }); known.add(id); }
    const ml = typeof MINIGAME !== 'undefined' ? MINIGAME.list() : [];
    for (const m of ml) { const d = MINIGAME.get(m) || {}, id = 'mini_' + m; known.add(id); out.push({ id, tur: 'gizli', ad: d.ad || tr(m), ikon: MINI_IKON[m] || '🎮', have: !!C[id] }); }
    for (const id in C) {
      if (known.has(id) || map[id]) continue;
      const c = C[id] || {};
      if (c.tur === 'huysuz' || c.tur === 'boss') { const d = HUYSUZ.get && HUYSUZ.get(id); out.push({ id, tur: c.tur, ad: (d && d.ad) || tr(id), have: true }); continue; }
      if (c.tur === 'gizli' && odalar().some(o => o.id === c.bolum)) continue;   // (odasının sayfasında)
      out.push({ id, tur: 'gizli', ad: tr(id), ikon: '⭐', have: true });
    }
    return out;
  }
  function seenInit() { if (S.seen) return; S.seen = new Set(Object.keys(PP().cikartmalar || {})); }
  function openAlbum(sayfa) {
    seenInit();
    const { body, card } = panel('album', 'Çıkartma Albümü', '📒', '#3a7fd8');
    const tabs = el('div', 'hb-tabs', body), page = el('div', 'hb-page', body);
    const P = PP();
    const pages = odalar().map(o => ({ o, list: () => albumSayfa(o) })).concat([{ o: { id: 'ozel', ad: 'Sürprizler', ikon: '🎁', renk: '#ffb36b' }, list: albumOzel }]);
    let cur = Math.max(0, Math.min(pages.length - 1, sayfa | 0));
    const show = i => {
      cur = i; tabs.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i));
      page.innerHTML = ''; page.style.setProperty('--pc', pages[i].o.renk);
      const list = pages[i].list(), have = list.filter(s => s.have).length;
      const top = el('div', 'hb-pagetop', page);
      el('div', 'hb-pageikon', top, pages[i].o.ikon);
      const bar = el('div', 'hb-count', top); for (let k = 0; k < list.length; k++) el('span', k < have ? 'on' : '', bar, '');
      const grid = el('div', 'hb-sgrid', page); let newAny = false;
      list.forEach((s, k) => {
        const isNew = s.have && !S.seen.has(s.id); if (s.have) S.seen.add(s.id);
        const img = s.have ? (s.tur === 'kayip' ? imgKayip(s.kayip) : s.tur === 'huysuz' || s.tur === 'boss' ? imgHuysuz(s.id) : null) : null;
        const b = el('button', 'hb-stk' + (s.have ? ' have' : '') + (s.big ? ' big' : '') + ' t-' + s.tur, grid);
        b.style.setProperty('--rot', ((k * 37) % 9 - 4) + 'deg'); b.style.animationDelay = (k * 0.05) + 's';
        const pic = el('div', 'hb-spic', b);
        if (s.have) { if (img) { const im = el('img', '', pic); im.src = img; im.draggable = false; } else el('div', 'hb-emo', pic, s.ikon || (s.tur === 'boss' ? '👑' : '⭐')); }
        else {   // gri siluet: kazanılmamış
          const sil = s.tur === 'huysuz' || s.tur === 'boss' ? imgHuysuzSil(s.id) : s.tur === 'kayip' ? imgKayip(s.kayip) : null;
          if (sil) { const im = el('img', 'sil', pic); im.src = sil; im.draggable = false; } else el('div', 'hb-emo sil', pic, s.ikon || '❓');
        }
        if (s.tur === 'boss') el('div', 'hb-crown', b, '👑');
        if (s.etiket) el('div', 'hb-etiket', b, s.etiket);
        el('div', 'hb-sname', b, s.have ? s.ad : '');
        if (isNew) { b.classList.add('yeni'); el('div', 'hb-new', b, '✨'); newAny = true; }
        b.addEventListener('click', () => zoom(s, b, img));
      });
      if (have === list.length && list.length) el('div', 'hb-full', page, '🌟');
      if (newAny) { setTimeout(() => sfx('star', { vol: 0.7 }), 300); say('album_yeni', 3); }
    };
    pages.forEach((p, i) => {
      const t = el('button', 'hb-tab', tabs); t.style.setProperty('--tc', p.o.renk);
      el('span', 'e', t, p.o.ikon);
      const n = p.list().filter(s => s.have).length; if (n) el('b', '', t, String(n));
      t.addEventListener('click', () => { if (cur !== i) { sfx('click', { vol: 0.6 }); show(i); } });
    });
    // en son kazanılan çıkartmanın sayfasından aç
    if (sayfa == null) { const last = Object.values(P.cikartmalar || {}).pop(); const k = last ? pages.findIndex(p => p.o.id === last.bolum) : -1; cur = k >= 0 ? k : 0; }
    show(cur);
    sayOnce('album_tanit', 3);
    function zoom(s, b, img) {
      const z = el('div', 'hb-zoom', S.cur.card);
      const big = el('div', 'hb-zstk' + (s.have ? ' have' : ''), z);
      if (s.have) { if (img) { const im = el('img', '', big); im.src = img; } else el('div', 'hb-emo', big, s.ikon || '⭐'); el('div', 'hb-zname', z, s.ad); }
      else { el('div', 'hb-emo sil', big, '❓'); }
      z.addEventListener('click', () => z.remove());
      if (s.have) { sfx('star', { vol: 0.8 }); pop(innerWidth / 2, innerHeight / 2, 20); const key = 'ck_' + s.id; if (AUD && AUD.LINES && AUD.LINES[key]) say(key, 4); else say('cikartma_genel', 4); }
      else { sfx('click', { vol: 0.5 }); say('album_bos', 4); }
    }
  }
  function imgHuysuzSil(type) {   // siluet: aynı resim, CSS ile karartılır
    return imgHuysuz(type);
  }
  // ── Mini Oyun Köşesi ──
  function miniStars(id, best) {
    const d = typeof MINIGAME !== 'undefined' && MINIGAME.get ? MINIGAME.get(id) : null;
    if (d && typeof d.yildiz === 'function') try { return Math.max(0, Math.min(3, d.yildiz(best) | 0)); } catch (e) { /* yok */ }
    if (d && Array.isArray(d.yildizlar)) return d.yildizlar.filter(v => best >= v).length;
    return best <= 0 ? 0 : best < 10 ? 1 : best < 20 ? 2 : 3;
  }
  const MINI_IKON = { sekerYakala: '🍬', tencereMuzik: '🍳', buzPateni: '⛸️', balonPatlat: '🎈', kekSusle: '🧁', cicekSula: '🌷' };
  const MINI_IKON2 = { sekerYakala: '🧺', tencereMuzik: '🎵', buzPateni: '❄️', balonPatlat: '💥', kekSusle: '🍓', cicekSula: '💧' };
  const MINI_RENK = { sekerYakala: '#ffd6e8', tencereMuzik: '#ffe6b8', buzPateni: '#d6f0ff', balonPatlat: '#ffe0d0', kekSusle: '#f8dcff', cicekSula: '#d8f5d0' };
  function openMini() {
    const { body } = panel('mini', 'Mini Oyunlar', '🎲', '#5ac88a');
    const grid = el('div', 'hb-grid hb-minigrid', body);
    const P = PP(), ids = typeof MINIGAME !== 'undefined' ? MINIGAME.list() : [];
    let any = false;
    for (const id of ids) {
      const d = MINIGAME.get(id) || {}, r = (P.miniOyunlar || {})[id], open = !d.kilitli || (r && r.acik);
      any = any || open;
      const t = tile(grid, { big: true, ikon: d.ikon || MINI_IKON[id] || '🎮', img: d.resim || null, ad: d.ad || tr(id), renk: d.renk || MINI_RENK[id] || '#d8f5e2', locked: !open, stars: open ? miniStars(id, (r && r.enIyi) || 0) : null, onTap: b => {
        if (!open) { shake(b); say('mini_kilit', 3); return; }
        sfx('star', { vol: 0.8 }); pop(...centerOf(b), 14);
        close(true);
        setTimeout(() => { if (typeof MINIGAME !== 'undefined') MINIGAME.start(id, { from: 'hub' }); }, 280);
      } });
      if (r && r.kez) el('div', 'hb-best', t, '🏆 ' + (r.enIyi | 0));
      if (!d.resim && MINI_IKON2[id]) el('div', 'hb-emo2', t.querySelector('.hb-pic'), MINI_IKON2[id]);
    }
    if (!ids.length) el('div', 'hb-empty', grid, '🎲');
    if (!sayOnce('mini_tanit', 3) && !any) say('mini_kilit', 3);
  }
  // ── Günün Sürprizi ──
  function surprizOdul() {
    const P = PP(), g = Gm(), R = [];
    const lockedSus = CAKE.ORDER.filter(id => !CAKE.unlocked(P).includes(id));
    if (lockedSus.length) R.push({ w: 3, tur: 'sus', id: lockedSus[0] });
    const aks = aksListe().filter(a => a.id && !(P.bilboAksesuar && P.bilboAksesuar.sahip && P.bilboAksesuar.sahip[a.id]));
    if (aks.length) R.push({ w: 2, tur: 'bilbo', id: aks[Math.floor(Math.random() * aks.length)].id });
    const st = Object.keys(CIKARTMA).filter(id => !(P.cikartmalar && P.cikartmalar[id]));
    if (st.length) R.push({ w: 2, tur: 'cikartma', id: st[Math.floor(Math.random() * st.length)] });
    const ko = kostumListe().filter(k => k.id && !(P.kostumler && P.kostumler[k.id]));
    if (ko.length && Object.keys(P.kostumler || {}).length < 2) R.push({ w: 1, tur: 'kostum', id: ko[Math.floor(Math.random() * ko.length)].id });
    R.push({ w: 1.5, tur: 'altin', n: 3 });
    let tot = R.reduce((a, r) => a + r.w, 0), x = Math.random() * tot;
    for (const r of R) { x -= r.w; if (x <= 0) return r; }
    return R[R.length - 1];
  }
  function verOdul(r) {
    const P = PP(), g = Gm();
    if (r.tur === 'sus') { if (!P.acikSusler) P.acikSusler = {}; P.acikSusler[r.id] = true; return { img: imgSus(r.id), ad: CAKE.ITEMS[r.id].ad, line: 'surpriz_sus' }; }
    if (r.tur === 'bilbo') { g.unlockBilboAccessory(r.id); const a = aksListe().find(k => k.id === r.id); return { img: imgAks(r.id), ad: a ? a.ad : tr(r.id), line: 'surpriz_bilbo' }; }
    if (r.tur === 'kostum') { g.unlockCostume(r.id); const k = kostumListe().find(q => q.id === r.id); return { img: imgKostum(r.id), ad: k ? k.ad : tr(r.id), line: 'surpriz_kostum' }; }
    if (r.tur === 'cikartma') { if (!P.cikartmalar) P.cikartmalar = {}; P.cikartmalar[r.id] = { tur: 'gizli', bolum: 'masa' }; g.emit('sticker', { id: r.id, kind: 'gizli' }); return { ikon: CIKARTMA[r.id].ikon, ad: CIKARTMA[r.id].ad, line: 'surpriz_cikartma' }; }
    g.addGoldSugar(r.n || 3); return { ikon: '🍬', ad: 'Altın Şeker ×' + (r.n || 3), line: 'surpriz_altin', gold: true };
  }
  function openSurpriz(st) {
    const g = Gm(); if (!g || !g.dailySurprise) return;
    const { body } = panel('surpriz', 'Günün Sürprizi', '🎁', '#e8404f');
    const can = g.dailySurprise(true);
    const stage = el('div', 'hb-gift' + (can ? '' : ' asleep'), body);
    const rays = el('div', 'hb-rays', stage);
    const box = el('div', 'hb-box', stage);
    el('div', 'hb-boxbody', box); el('div', 'hb-rib v', box);
    const lid = el('div', 'hb-lid', box); el('div', 'hb-rib lv', lid);
    const bow = el('div', 'hb-bow', lid); el('i', 'l', bow); el('i', 'r', bow); el('i', 'k', bow);
    if (!can) { el('div', 'hb-zz', stage, '🌙'); say('surpriz_yarin', 3); return; }
    const tail = el('div', 'hb-tail', stage); el('div', 'hb-pull', tail, '<span>👆</span>');
    sayOnce('surpriz_tanit', 3);
    let done = false, y0 = null, dy = 0;
    const openIt = () => {
      if (done) return; done = true;
      if (!g.dailySurprise(false)) return;
      tail.classList.add('gone'); stage.classList.add('open');
      sfx('chest', { vol: 0.9 }); setTimeout(() => sfx('levelup', { vol: 0.8 }), 350);
      const res = verOdul(surprizOdul());
      setTimeout(() => {
        const pz = el('div', 'hb-prize', stage);
        if (res.img) { const im = el('img', '', pz); im.src = res.img; } else el('div', 'hb-emo' + (res.gold ? ' gold' : ''), pz, res.ikon || '⭐');
        el('div', 'hb-pname', stage, res.ad);
        pop(innerWidth / 2, innerHeight * 0.42, 30); setTimeout(() => pop(innerWidth / 2, innerHeight * 0.42, 24, 'heart'), 250);
        say('surpriz_ac', 4); setTimeout(() => say(res.line, 3), 1600);
        if (st) st._used = true;
        if (typeof MASA !== 'undefined' && MASA.giftOpened) MASA.giftOpened();
      }, 650);
    };
    // kurdeleyi aşağı çek (ya da dokun)
    tail.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; tail.setPointerCapture(e.pointerId); sfx('click', { vol: 0.5 }); });
    tail.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, Math.min(160, e.clientY - y0)); tail.style.setProperty('--pull', dy + 'px'); if (dy > 110) { y0 = null; openIt(); } });
    const up = () => { if (y0 == null) return; y0 = null; if (dy < 12) openIt(); else tail.style.setProperty('--pull', '0px'); };
    tail.addEventListener('pointerup', up); tail.addEventListener('pointercancel', up);
    box.addEventListener('click', openIt);
  }
  // ── Pasta süsleme ──
  function openPasta() {
    const g = Gm(), stage = g && g.cakeStage ? g.cakeStage() : 0;
    if (!stage) { say(said.p0 ? 'masa_pasta_bos' : 'masa_pasta0', 3); said.p0 = 1; if (CAKE.poke) CAKE.poke(); sfx('bonk', { vol: 0.6 }); return; }
    const r = rootEl(); r.innerHTML = ''; r.classList.remove('hb-out'); r.classList.add('hb-on', 'hb-deco-on');
    const ui = el('div', 'hb-deco', r);
    const done = el('button', 'hb-done', ui, '<span>✓</span>');
    const undo = el('button', 'hb-undo', ui, '<span>↶</span>');
    const wipe = el('button', 'hb-wipe', ui, '<span>🧽</span><i></i>');
    const tray = el('div', 'hb-tray', ui);
    const touch = el('div', 'hb-touch', ui);
    S.cur = { id: 'pasta', card: ui, body: ui };
    pause(true); sfx('open', { vol: 0.7 });
    const D = S.decor = decorScene(stage);
    document.body.classList.add('hb-deco-body');
    say('susle_basla', 3);
    // süs tepsisi
    const P = g.P, open = CAKE.unlocked(P);
    for (const id of CAKE.ORDER) {
      const it = CAKE.ITEMS[id], ok = open.includes(id);
      const b = el('button', 'hb-titem' + (ok ? '' : ' locked'), tray);
      const im = imgSus(id); if (im) { const i2 = el('img', '', b); i2.src = im; i2.draggable = false; } else el('div', 'hb-emo', b, it.ikon);
      if (!ok) el('div', 'hb-lock', b, '🔒');
      b.addEventListener('pointerdown', e => { if (!ok) { shake(b); say('susle_kilit', 3); return; } startDrag(id, e, b, im, it.ikon); });
    }
    // sürükle-bırak: süse dokun → yukarı sürükle (pastaya bırak) · yana kaydır → tepsi kayar · dokunup bırak → pastada güzel bir yere konur
    let drag = null;
    function startDrag(id, e, b, im, ikon) {
      e.preventDefault();
      drag = { id, b, im, ikon, gh: null, x0: e.clientX, y0: e.clientY, sl: tray.scrollLeft, moved: false, scroll: false, pid: e.pointerId };
      b.classList.add('hold'); sfx('click', { vol: 0.5 });
    }
    function lift() {   // gerçekten sürüklenmeye başladı: elde süs hayaleti
      const d = drag; d.moved = true; d.b.classList.remove('hold');
      d.gh = el('div', 'hb-ghost', ui); if (d.im) { const i2 = el('img', '', d.gh); i2.src = d.im; } else el('div', 'hb-emo', d.gh, d.ikon);
    }
    function moveGhost(x, y) { if (!drag || !drag.gh) return; drag.gh.style.left = (x - 60) + 'px'; drag.gh.style.top = (y - 130) + 'px'; drag.hit = D.pick(x, y - 70); D.preview(drag.id, drag.hit); drag.gh.style.opacity = drag.hit ? '0.2' : '1'; }
    window.addEventListener('pointermove', onMove, true); window.addEventListener('pointerup', onUp, true); window.addEventListener('pointercancel', onUp, true);
    function onMove(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved && !drag.scroll) {
        if (Math.hypot(dx, dy) < 12) return;
        if (-dy > Math.abs(dx) * 0.6) lift(); else { drag.scroll = true; drag.b.classList.remove('hold'); }
      }
      if (drag.scroll) { tray.scrollLeft = drag.sl - dx; return; }
      moveGhost(e.clientX, e.clientY);
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      const d = drag; drag = null; if (d.gh) d.gh.remove(); d.b.classList.remove('hold'); D.preview(null);
      if (d.scroll) return;
      if (e.type === 'pointercancel' && !d.moved) return;
      const at = d.moved ? d.hit : D.autoSpot();   // dokunup bırakınca: pastada boş güzel bir yer
      if (!at) { sfx('whoosh', { vol: 0.4 }); return; }
      place(d.id, at, d.moved ? [e.clientX, e.clientY - 70] : D.screenOf(at));
    }
    function place(id, at, scr) {
      const P2 = g.P;
      if ((P2.pastaSusleri || []).length >= 90) { say('susle_dolu', 3); shake(undo); return; }
      g.addCakeDecoration(id, at.a, at.h);
      D.fresh(id, at);
      sfx('pop', { vol: 0.9, pitch: 0.9 + Math.random() * 0.3 }); if (scr) pop(scr[0], scr[1], 12);
      praise(['susle_ovgu1', 'susle_ovgu2', 'susle_ovgu3', 'susle_ovgu4', 'susle_ovgu5'], 4);
    }
    undo.addEventListener('click', () => {
      const P2 = g.P; if (!P2.pastaSusleri || !P2.pastaSusleri.length) { shake(undo); return; }
      P2.pastaSusleri.pop(); D.refresh(); if (typeof CAKE !== 'undefined') CAKE.refresh(); sfx('whoosh', { vol: 0.6 });
    });
    // temizle: basılı tut (yanlışlıkla silinmesin)
    let wipeT = null;
    wipe.addEventListener('pointerdown', () => { wipe.classList.add('holding'); wipeT = setTimeout(() => { wipe.classList.remove('holding'); const P2 = g.P; if (P2.pastaSusleri && P2.pastaSusleri.length) { P2.pastaSusleri.length = 0; D.refresh(); CAKE.refresh(); sfx('splash', { vol: 0.8 }); say('susle_temiz', 3); pop(innerWidth / 2, innerHeight * 0.4, 20); } }, 1000); });
    const wipeOff = () => { clearTimeout(wipeT); wipe.classList.remove('holding'); };
    wipe.addEventListener('pointerup', wipeOff); wipe.addEventListener('pointerleave', wipeOff); wipe.addEventListener('pointercancel', wipeOff);
    done.addEventListener('click', () => { say((g.P.pastaSusleri || []).length ? 'susle_bitti' : 'susle_bos', 4); pop(...centerOf(done), 24); sfx('cheer', { vol: 0.7 }); close(); });
    // boş alanda yatay kaydırma: pastayı döndür
    let rot = null;
    touch.addEventListener('pointerdown', e => { rot = { x: e.clientX, r: D.rot, pid: e.pointerId, t: performance.now(), x0: e.clientX, y0: e.clientY }; touch.setPointerCapture(e.pointerId); });
    touch.addEventListener('pointermove', e => { if (!rot || e.pointerId !== rot.pid) return; D.spin(rot.r + (e.clientX - rot.x) * 0.008); });
    touch.addEventListener('pointerup', e => {
      if (!rot) return;
      const tap = Math.hypot(e.clientX - rot.x0, e.clientY - rot.y0) < 10;
      rot = null;
      if (tap) { const h = D.pick(e.clientX, e.clientY); if (h) { D.wiggle(); sfx('squish', { vol: 0.6 }); pop(e.clientX, e.clientY, 8, 'heart'); } }
    });
    S.cur.onClose = () => { D.stop(); r.classList.remove('hb-deco-on'); document.body.classList.remove('hb-deco-body'); window.removeEventListener('pointermove', onMove, true); window.removeEventListener('pointerup', onUp, true); window.removeEventListener('pointercancel', onUp, true); };
  }
  // Süsleme sahnesi: ana renderer ile kendi sahnemizi çizer (dünya o sırada durur ve çizilmez)
  function decorScene(stage) {
    const g = Gm(), P = g.P, sc = new THREE.Scene();
    const bgc = document.createElement('canvas'); bgc.width = 512; bgc.height = 512;
    { const x = bgc.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#fff1de'); gr.addColorStop(0.5, '#f8d2ae'); gr.addColorStop(1, '#d69a66'); x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
      // bulanık mutfak: pencere ışığı ve yumuşak ışık lekeleri (bokeh)
      const w = x.createRadialGradient(130, 90, 10, 130, 90, 170); w.addColorStop(0, 'rgba(255,255,240,0.95)'); w.addColorStop(1, 'rgba(255,250,230,0)'); x.fillStyle = w; x.fillRect(0, 0, 512, 512);
      const cols = ['255,214,170', '255,190,210', '200,235,220', '255,240,190'];
      for (let i = 0; i < 26; i++) { const cx = Math.random() * 512, cy = Math.random() * 300, r = 14 + Math.random() * 38, q = x.createRadialGradient(cx, cy, 0, cx, cy, r); q.addColorStop(0, 'rgba(' + cols[i % 4] + ',0.55)'); q.addColorStop(0.7, 'rgba(' + cols[i % 4] + ',0.35)'); q.addColorStop(1, 'rgba(' + cols[i % 4] + ',0)'); x.fillStyle = q; x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.fill(); } }
    const bg = new THREE.CanvasTexture(bgc); bg.colorSpace = THREE.SRGBColorSpace; sc.background = bg;
    sc.add(new THREE.HemisphereLight(0xfff6ee, 0xa07a60, 1.7));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.position.set(-4, 12, 10); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); key.shadow.bias = -0.0008; sc.add(key);
    const rim = new THREE.DirectionalLight(0xffd6ea, 0.9); rim.position.set(6, 5, -8); sc.add(rim);
    const fill = new THREE.PointLight(0xffe0b0, 12, 22, 1.6); fill.position.set(3, 6, 6); sc.add(fill);
    // masa: ahşap disk
    const wt = MASA.tex('wood', MASA.woodCanvas, [3, 3]);
    const table = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.55 }));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; sc.add(table);
    const turn = new THREE.Group(); sc.add(turn);
    let model = CAKE.makeModel(stage, { candles: stage === 4 && P.bossNese && P.bossNese.pasta });
    model.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    turn.add(model.group); model.setDecos(P.pastaSusleri || []); S.dm = { model, sc };
    // önizleme süsü (saydam) + yeni konan süsün zıplaması
    const ghostMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, transparent: true, opacity: 0.6, depthWrite: false });
    let ghost = null, ghostId = null, fresh = null;
    const itemMesh = (id, mat) => { const k = new Kit(), q = { berry: [], flame: [] }; CAKE.ITEMS[id].parts(k, q); for (const b of q.berry) k.add(CAKE._berryG(), 0xff3050, [b[0], b[1], b[2]], null, b[3] * 0.6); for (const f of q.flame) k.add(G.sphere(8, 6), 0xffcf5a, [f[0], f[1], f[2]], null, [0.07, 0.14, 0.07]); return new THREE.Mesh(k.build(), mat); };
    const sp = { p: new THREE.Vector3(), n: new THREE.Vector3() }, up = new THREE.Vector3(0, 1, 0);
    const orient = (m, at) => { CAKE.surfPoint(model, at.a, at.h, sp); m.position.copy(sp.p); m.quaternion.setFromUnitVectors(up, sp.n).multiply(new THREE.Quaternion().setFromAxisAngle(up, sp.n.y > 0.5 ? 0 : at.a)); };
    const cam = new THREE.PerspectiveCamera(34, 1, 0.5, 200), ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
    let rot = 0.3, rotV = 0, t = 0, wig = 0, raf = 0, alive = true;
    // ekranın çerçeve arabelleğinde derinlik yok (oyun sahnesi kendi hedefine çizer): süsleme sahnesi derinlikli hedefe çizilip ekrana kopyalanır
    const bsz = new THREE.Vector2(), qsc = new THREE.Scene(), ocam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false, toneMapped: false })); qsc.add(quad);
    let rt = null;
    const ensureRT = () => { renderer.getDrawingBufferSize(bsz); if (!rt || rt.width !== bsz.x || rt.height !== bsz.y) { if (rt) rt.dispose(); rt = new THREE.WebGLRenderTarget(bsz.x, bsz.y, { samples: 4, colorSpace: THREE.SRGBColorSpace, depthBuffer: true }); quad.material.map = rt.texture; quad.material.needsUpdate = true; } };
    function frameCam() {
      const w = innerWidth, h = innerHeight; cam.aspect = w / h;
      const top = model.top, tgt = new THREE.Vector3(0, top * 0.55 + 0.1, 0);
      const need = 3.75 + (stage >= 2 ? 0.3 : 0);   // pastanın yarıçapı + biraz pay (tabak kenarı taşabilir)
      const vfov = cam.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
      const dist = Math.max(need / Math.tan(hfov / 2), (need * 0.95) / Math.tan(vfov / 2)) * 1.08;
      const pitch = 0.66;
      cam.position.set(0, tgt.y + Math.sin(pitch) * dist, Math.cos(pitch) * dist);
      cam.lookAt(tgt);
      cam.setViewOffset(w, h, 0, h * 0.045, w, h);   // pasta biraz yukarıda: alttaki tepsiye yer
      cam.updateProjectionMatrix();
    }
    function render() {
      if (!alive) return;
      raf = requestAnimationFrame(render);
      const dt = 1 / 60; t += dt;
      if (Math.abs(rotV) > 0.0001) { rot += rotV; rotV *= 0.9; }
      turn.rotation.y = rot + Math.sin(t * 0.4) * 0.03;
      if (wig > 0) { wig = Math.max(0, wig - dt); const k = wig / 0.6, e = 1 + Math.sin((1 - k) * Math.PI * 4) * 0.06 * k; model.group.scale.set(1 / Math.sqrt(e), e, 1 / Math.sqrt(e)); }
      if (fresh) { fresh.t += dt; const k = Math.min(1, fresh.t / 0.45), s = k < 1 ? (1 - Math.pow(1 - k, 3)) * (1 + Math.sin(k * Math.PI) * 0.35) : 1; fresh.m.scale.setScalar(Math.max(0.01, s)); if (fresh.t > 0.6) { model.deco.remove(fresh.m); fresh.m.geometry.dispose(); fresh = null; model.setDecos(P.pastaSusleri || []); } }
      if (ghost) ghost.material.opacity = 0.45 + 0.2 * Math.sin(t * 8);
      try {
        frameCam();
        ensureRT(); renderer.setRenderTarget(rt); renderer.clear(true, true, true); renderer.render(sc, cam);
        renderer.setRenderTarget(null); renderer.render(qsc, ocam);
      } catch (e) { console.warn('[HUB] süsleme çizimi', e); alive = false; }
    }
    raf = requestAnimationFrame(render);
    const toLocal = (hit) => {
      const p = model.group.worldToLocal(hit.point.clone());
      const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      const inv = new THREE.Quaternion(); model.group.getWorldQuaternion(inv); n.applyQuaternion(inv.invert());
      return CAKE.surfParam(model, p, n);
    };
    return {
      get rot() { return rot; },
      spin(r) { rot = r; },
      wiggle() { wig = 0.6; },
      pick(x, y) {
        v2.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
        ray.setFromCamera(v2, cam);
        const hits = ray.intersectObjects(model.surf.concat(model.decoMeshes), false);
        if (!hits.length) return null;
        const h = hits[0]; if (model.decoMeshes.includes(h.object)) { const q = ray.intersectObjects(model.surf, false); return q.length ? toLocal(q[0]) : null; }
        return toLocal(h);
      },
      preview(id, at) {
        if (!id || !at) { if (ghost) ghost.visible = false; return; }
        if (!ghost || ghostId !== id) { if (ghost) { model.deco.remove(ghost); ghost.geometry.dispose(); } ghost = itemMesh(id, ghostMat); ghostId = id; model.deco.add(ghost); }
        ghost.visible = true; orient(ghost, at);
      },
      fresh(id, at) {
        if (fresh) { model.deco.remove(fresh.m); fresh.m.geometry.dispose(); fresh = null; }
        model.setDecos((P.pastaSusleri || []).slice(0, -1));
        const m = itemMesh(id, model.M.gloss); m.castShadow = true; orient(m, at); m.scale.setScalar(0.01); model.deco.add(m); fresh = { m, t: 0 };
      },
      refresh() { if (fresh) { model.deco.remove(fresh.m); fresh.m.geometry.dispose(); fresh = null; } model.setDecos(P.pastaSusleri || []); },
      autoSpot() {   // üst yüzde mevcut süslerden uzak rastgele bir yer
        const L = P.pastaSusleri || [];
        let best = null, bd = -1;
        for (let i = 0; i < 24; i++) {
          const a = Math.random() * TAU4 - rot, h = CAKE.SIDE + 0.06 + Math.random() * (0.98 - CAKE.SIDE - 0.06);
          CAKE.surfPoint(model, a, h, sp); const p = sp.p.clone();
          let d = 9; for (const q of L) { CAKE.surfPoint(model, q.a, q.h, sp); d = Math.min(d, p.distanceTo(sp.p)); }
          const front = Math.cos(a + rot) * 0.4;   // kameraya bakan tarafı tercih et
          if (d + front > bd) { bd = d + front; best = { a, h }; }
        }
        return best;
      },
      screenOf(at) { CAKE.surfPoint(model, at.a, at.h, sp); const p = sp.p.clone(); model.group.localToWorld(p); p.project(cam); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; },
      stop() {
        alive = false; cancelAnimationFrame(raf);
        if (ghost) ghost.geometry.dispose(); ghostMat.dispose();
        model.dispose(); if (rt) rt.dispose(); quad.geometry.dispose(); quad.material.dispose(); table.geometry.dispose(); table.material.dispose(); wt.dispose(); bg.dispose();
        key.dispose && key.dispose(); if (key.shadow && key.shadow.map) key.shadow.map.dispose();
        S.decor = null;
      },
    };
  }
  // ── Küçük resimleri boşta önceden hazırla (ilk panel açılışı takılmasın): masada, oyun akarken. Her resim aşamalara bölünür
  // (model kur · gölgelendirici arka planda derlenir · çiz+oku+PNG); adımlar arasında ~80 ms, kare başına en çok bir adım. ──
  let warmQ = null;
  const WT = [];   // [resim, aşama, ms] (test)
  function warm() {
    if (warmQ) return;
    warmQ = [].concat(CAKE.ORDER.map(id => () => imgSus(id)), kostumListe().map(k => () => imgKostum(k.id)), aksListe().map(k => () => imgAks(k.id)),
      Object.keys(KAYIP_MODEL).map(id => () => imgKayip(id)));
    const P = PP(); for (const id in P.cikartmalar || {}) if (P.cikartmalar[id].tur !== 'gizli') warmQ.push(() => imgHuysuz(id));
    let jobs = [], cur = null, waiting = false;
    const tick = () => {
      const g = Gm();
      if (!cur && !jobs.length && !warmQ.length) { warmQ = null; return; }
      if (!waiting && g && g.state === 'play' && !g.loading && !g.paused && !S.cur && g.P.zone === 0) {
        if (!cur && !jobs.length) { const f = warmQ.shift(); CAP = []; try { f(); } catch (e) { /* yok */ } jobs = CAP; CAP = null; }
        if (!cur && jobs.length) { const j = jobs.shift(); cur = thumbSteps(j[0], j[1], j[2], true); cur.key = j[0]; }
        if (cur) {
          let r = null; const t0 = performance.now();
          try { r = cur.next(); } catch (e) { r = { done: true }; }
          WT.push([cur.key, r.done ? 'ciz' : typeof r.value === 'string' ? r.value : 'derle', Math.round(performance.now() - t0)]);
          if (r.done) cur = null;
          else if (r.value && typeof r.value.then === 'function') { waiting = true; r.value.then(() => { waiting = false; }, () => { waiting = false; }); }
        }
      }
      setTimeout(() => requestAnimationFrame(tick), 80);
    };
    setTimeout(tick, 400);
  }
  // Masaya girerken (yükleme perdesi arkasında, 07 loadSteps): Feza'nın ve Bilbo'nun ilk resmi. Bu ikisinin ilk çizimi pahalı
  // (gölgelendiricilerin ekran kartında ilk kez kurulması); sonraki kostüm/aksesuar resimleri boşta birkaç ms sürer.
  function* warmSteps(async = true) {
    // Prepare station pictures behind the loading curtain, not during play.
    const pictures = [() => imgKostum(null), () => imgAks(null)]
      .concat(CAKE.ORDER.map(id => () => imgSus(id)), kostumListe().map(k => () => imgKostum(k.id)),
        aksListe().map(k => () => imgAks(k.id)), Object.keys(KAYIP_MODEL).map(id => () => imgKayip(id)));
    const P = PP();
    for (const id in P.cikartmalar || {}) if (P.cikartmalar[id].tur !== 'gizli') pictures.push(() => imgHuysuz(id));
    for (const f of pictures) {
      CAP = []; try { f(); } catch (e) { /* yok */ } const js = CAP; CAP = null;
      for (const j of js) yield* thumbSteps(j[0], j[1], j[2], async);
    }
  }
  // ── Giriş noktası (UI 'station') ──
  const OPEN = { pasta: openPasta, gardirop: openGardirop, bilbo: openBilbo, album: () => openAlbum(), mini: openMini, surpriz: openSurpriz };
  // İstemeden açılmasın: Feza istasyonda ~0,6 s durunca açılır (içinden geçip gidince açılmaz). HUB.open(id) (istasyonsuz) hemen açar.
  let pend = null;
  function open(id, st) {
    if (st && st.x != null && !st.now) {
      const g = Gm(); if (!g) return;
      pend = { id, st, t0: g.time || 0 };
      const tick = () => {
        const q = pend; if (!q || q.st !== st) return;
        const G2 = Gm(), P = G2.P, r = (st.r || 1.6) + 0.3;
        if (G2.state !== 'play' || P.dead || Math.hypot(P.pos.x - st.x, P.pos.z - st.z) > r) { pend = null; return; }
        if (q.px != null && Math.hypot(P.pos.x - q.px, P.pos.z - q.pz) > 0.12) q.t0 = G2.time || 0;   // hâlâ yürüyor: saymaya baştan
        q.px = P.pos.x; q.pz = P.pos.z;
        if ((G2.time || 0) - q.t0 >= 0.6 || G2.paused) { pend = null; if (!G2.paused) openNow(id, st); return; }
        setTimeout(tick, 60);
      };
      setTimeout(tick, 60);
      return;
    }
    openNow(id, st);
  }
  function openNow(id, st) {
    if (S.cur || S.closing) return;
    const g = Gm(); if (!g || g.state !== 'play' || g.P.dead) return;
    if (typeof UI !== 'undefined' && (UI.menu || UI.mode !== 'play')) return;
    if (typeof MINIGAME !== 'undefined' && MINIGAME.active) return;
    seenInit();
    const f = OPEN[id]; if (!f) return;
    try { f(st); } catch (e) { console.warn('[HUB] open ' + id, e); close(true); }
  }
  return { open, close, say, warm, warmSteps, warmT: WT, KOSTUM, AKSESUAR, CIKARTMA, ODALAR, thumb, imgSus, imgHuysuz, imgKostum, imgAks, imgKayip,
    get current() { return S.cur ? S.cur.id : null; }, _S: S, _openAlbum: openAlbum };
})();
