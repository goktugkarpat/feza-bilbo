/* Feza ile Bilbo'nun evi – 3D ev ekranı.
   Maceraların kendi motorunu (hala/src/00_core.js: çizici, ışıklar, parlama), dokularını (01_textures), gerçek Feza (04_feza),
   Bilbo (04_bilbo), Aytuğ Hala (04_hala) ve huysuz/hayvan modellerini (orman/src/05_enemies + 05_forest_animals) kullanır.
   Alt klasörlerdeki dosyalar DEĞİŞTİRİLMEZ; yalnız okunur. Klasik script (file:// ile de çalışır).
   Oda: sıcak gün batımı ışığı, ahşap zemin, halı, minderler, oyuncaklar, pencere. Arka duvarda üç büyülü portal; her portalın
   arkasında o maceranın küçük canlı dünyası var (gerçek derinlik: kamera hafifçe süzüldükçe içleri kayar). */
(function () {
  'use strict';
  var Qs = location.search, SESSIZ = /[?&]sessiz\b/.test(Qs), IKON = /[?&]ikon\b/.test(Qs);
  var V = function (x, y, z) { return new THREE.Vector3(x || 0, y || 0, z || 0); };
  var PI = Math.PI;

  // ---------- biten maceralar ----------
  function tamamOku() {
    var m = /[?&]tamam=([a-z,]*)/.exec(Qs);           // yalnız test: ?tamam=orman,hala (kaydetmez)
    if (m) return m[1].split(',');
    try { var a = JSON.parse(localStorage.getItem('fezaBilboTamam') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  var TAMAM = tamamOku();
  function bitti(id) { return TAMAM.indexOf(id) >= 0; }

  // Portallar: soldan sağa orman · huysuz (ortada, en büyük: en büyük macera) · hala
  var PORTAL = [
    { id: 'orman', yol: 'orman/index.html', x: -3.35, w: 2.2, h: 3.1, cw: 2.8, derin: 4.6, renk: 0x3f9b4a, acik: 0x9be08a, isik: 0xbaff8a },
    { id: 'huysuz', yol: 'huysuz/index.html', x: 0, w: 2.9, h: 3.75, cw: 3.3, derin: 7.5, renk: 0x5a46c8, acik: 0xb6a8ff, isik: 0xc9b4ff },
    { id: 'hala', yol: 'hala/index.html', x: 3.35, w: 2.2, h: 3.1, cw: 2.8, derin: 3.6, renk: 0xe0609a, acik: 0xffb3d1, isik: 0xffb6dc }
  ];
  var DUVAR_Z = -3.5, ODA_X = 6.6, PEN_X = -5.35, RAF_X = 5.35;

  // ---------- yardımcılar ----------
  function std(o) { return new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6, metalness: 0 }, o || {})); }
  function basic(o) { return new THREE.MeshBasicMaterial(o || {}); }
  function parlak(c, k) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k || 2.5), toneMapped: false }); }
  function mesh(geo, mat, p, s, r, par) {
    var m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    if (s !== undefined && s !== null) { if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); }
    if (r) m.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0);
    if (par) par.add(m);
    return m;
  }
  function golge(o, cast, rec) { o.traverse(function (x) { if (x.isMesh) { x.castShadow = !!cast; x.receiveShadow = !!rec; } }); return o; }
  function tuvalDoku(w, h, ciz, tekrar) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; ciz(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (tekrar) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(tekrar[0], tekrar[1]); }
    return t;
  }
  function egimDoku(stops, yildizlar) {   // dikey gökyüzü geçişi (+ isteğe bağlı yıldızlar)
    return tuvalDoku(256, 512, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h);
      for (var i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      if (yildizlar) for (var k = 0; k < yildizlar; k++) {
        var x = Math.random() * w, y = Math.random() * h * 0.55, r = Math.random() * 1.6 + 0.4;
        g.fillStyle = 'rgba(255,250,220,' + (0.5 + Math.random() * 0.5) + ')'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
    });
  }
  var nokta = null;
  function noktaDoku() {
    if (nokta) return nokta;
    nokta = tuvalDoku(64, 64, function (g) {
      var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
    return nokta;
  }
  function hale(c, s, p, par, k) {   // yumuşak ışık halesi (her zaman kameraya bakar)
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: noktaDoku(), color: new THREE.Color(c).multiplyScalar(k || 1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    sp.scale.setScalar(s); sp.position.set(p[0], p[1], p[2]); if (par) par.add(sp); return sp;
  }
  function kemerSekli(w, h, cx, y0) {   // üstü yarım daire kapı biçimi
    var r = w / 2, s = new THREE.Shape();
    s.moveTo(cx - r, y0); s.lineTo(cx - r, y0 + h - r); s.absarc(cx, y0 + h - r, r, PI, 0, true); s.lineTo(cx + r, y0); s.lineTo(cx - r, y0);
    return s;
  }
  function kemerYolu(w, h, n) {   // kemer çizgisi (ışıklı kenar için)
    var r = w / 2, pts = [], i;
    for (i = 0; i <= 6; i++) pts.push(V(-r, (h - r) * i / 6, 0));
    for (i = 1; i < n; i++) { var a = PI - PI * i / n; pts.push(V(Math.cos(a) * r, h - r + Math.sin(a) * r, 0)); }
    for (i = 6; i >= 0; i--) pts.push(V(r, (h - r) * i / 6, 0));
    return new THREE.CatmullRomCurve3(pts);
  }
  var TX = function (ad, rx, ry, o) {   // macera dokuları (TEX) – yoksa düz renk
    try { if (typeof TEX !== 'undefined' && TEX[ad]) return TEX.mat(ad, Object.assign({ repeat: [rx, ry] }, o || {})); } catch (e) {}
    return std(o);
  };

  var anims = [];   // her kare çağrılan küçük canlandırmalar: fn(dt, t)

  // ---------- oda ----------
  function odaKur() {
    scene.background = new THREE.Color(0x3a2418);
    scene.fog = null;
    setLighting({ hemiSky: 0xffeedd, hemiGround: 0x7a5a48, hemi: 0.8, sunColor: 0xffc890, sun: 2.3, bloom: 0.5, exposure: 1.0 });
    setEnvironment(0xffc89a, 0xffe8d0, 0x6a4a32, 0.85);
    POST.vignette = 0.36; POST.saturation = 1.04; POST.threshold = 1.2;
    var sun = LIGHTS.sun, sc = sun.shadow.camera;
    sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 40; sc.updateProjectionMatrix();
    sun.shadow.mapSize.set(QUALITY.tablet ? 1024 : 2048, QUALITY.tablet ? 1024 : 2048);
    sun.target.position.set(0.3, 0, 0.8); sun.position.set(-9.5, 8.5, -5.5);
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;

    // zemin: ahşap parke
    var zem = mesh(new THREE.PlaneGeometry(ODA_X * 2, 12), parke(), [0, 0, 2.5], null, [-PI / 2, 0, 0], scene);
    zem.receiveShadow = true;
    // arka duvar (portal delikli), kalınlıklı
    var DH = 11, s = new THREE.Shape();   // tek çizgi: portal kemerleri duvarın alt kenarından içeri oyulur (delik değil)
    s.moveTo(-ODA_X, 0);
    PORTAL.forEach(function (p) { var r = p.w / 2; s.lineTo(p.x - r, 0); s.lineTo(p.x - r, p.h - r); s.absarc(p.x, p.h - r, r, PI, 0, true); s.lineTo(p.x + r, 0); });
    s.lineTo(ODA_X, 0); s.lineTo(ODA_X, DH); s.lineTo(-ODA_X, DH); s.lineTo(-ODA_X, 0);
    var dg = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 28 });
    var duvarMat = std({ map: duvarKagidi(), roughness: 0.85 });
    var duvar = mesh(dg, duvarMat, [0, 0, DUVAR_Z - 0.3], null, null, scene); duvar.receiveShadow = true;
    // duvar kağıdı bandı (alt kısım) ve süpürgelik
    var supMat = std({ color: 0xc98b55, roughness: 0.5 });
    var aralik = [[-ODA_X, PORTAL[0].x - PORTAL[0].w / 2], [PORTAL[0].x + PORTAL[0].w / 2, PORTAL[1].x - PORTAL[1].w / 2],
      [PORTAL[1].x + PORTAL[1].w / 2, PORTAL[2].x - PORTAL[2].w / 2], [PORTAL[2].x + PORTAL[2].w / 2, ODA_X]];
    aralik.forEach(function (a) {
      var w = a[1] - a[0] - 0.36; if (w <= 0) return;
      golge(mesh(new THREE.BoxGeometry(w, 0.16, 0.06), supMat, [(a[0] + a[1]) / 2, 0.08, DUVAR_Z + 0.03], null, null, scene), false, true);
    });
    // yan duvarlar
    var yanMat = std({ map: duvarKagidi(), roughness: 0.85, color: 0xf4e4d8 });
    var sol = mesh(new THREE.PlaneGeometry(12, DH), yanMat, [-ODA_X, DH / 2, 2.5], null, [0, PI / 2, 0], scene); sol.receiveShadow = true;
    var sag = mesh(new THREE.PlaneGeometry(12, DH), yanMat, [ODA_X, DH / 2, 2.5], null, [0, -PI / 2, 0], scene); sag.receiveShadow = true;
    golge(mesh(new THREE.BoxGeometry(0.06, 0.16, 12), supMat, [-ODA_X + 0.03, 0.08, 2.5], null, null, scene), false, true);
    golge(mesh(new THREE.BoxGeometry(0.06, 0.16, 12), supMat, [ODA_X - 0.03, 0.08, 2.5], null, null, scene), false, true);
    // tavan kirişi (çerçeve hissi)
    mesh(new THREE.BoxGeometry(ODA_X * 2, 0.25, 0.4), supMat, [0, DH - 0.12, DUVAR_Z + 0.2], null, null, scene);

    pencere();
    flama();
    hali();
    minderler();
    oyuncaklar();
    bitki(-4.55, -2.95, 1.05); bitki(4.45, -2.95, 1.0); bitki(-5.6, 3.6, 1.0);
    lamba(5.6, 3.4);
  }
  function parke() {   // ince, açık bal rengi tahtalar; hafif cilalı
    var t = tuvalDoku(512, 512, function (c, w, h) {
      var n = 10, ph = h / n, renk = ['#d9a56e', '#cf9a62', '#e0ae78', '#d4a068', '#c99260'];
      for (var r = 0; r < n; r++) {
        var x = -((r * 137) % 200);
        while (x < w) {
          var L = 160 + ((x * 7 + r * 31) % 140), k = renk[(r * 3 + Math.abs(x)) % 5];
          c.fillStyle = k; c.fillRect(x, r * ph, L, ph);
          c.strokeStyle = 'rgba(120,70,30,0.10)'; c.lineWidth = 1;
          for (var gq = 0; gq < 4; gq++) { var gy = r * ph + 4 + gq * (ph - 8) / 3; c.beginPath(); c.moveTo(x, gy); c.bezierCurveTo(x + L * 0.3, gy + 2, x + L * 0.6, gy - 2, x + L, gy + 1); c.stroke(); }
          c.fillStyle = 'rgba(90,50,20,0.35)'; c.fillRect(x, r * ph, 2, ph);
          x += L;
        }
        c.fillStyle = 'rgba(90,50,20,0.3)'; c.fillRect(0, r * ph, w, 2);
      }
    }, [ODA_X * 2 / 2.0, 12 / 2.0]);
    return std({ map: t, roughness: 0.32, metalness: 0, envMapIntensity: 0.9 });
  }
  function duvarKagidi() {   // sıcak şeftali duvar kâğıdı: iki tonlu şeritler, küçük çiçekler ve yıldızlar
    return tuvalDoku(256, 256, function (c, w, h) {
      c.fillStyle = '#ffd6b0'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffe4c8'; c.fillRect(0, 0, w / 2, h);
      c.fillStyle = 'rgba(210,140,100,0.22)'; c.fillRect(w / 2 - 3, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
      function cicek(x, y, r, renk) {
        c.fillStyle = renk; for (var i = 0; i < 5; i++) { var a = i * 1.2566; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, 7); c.fill(); }
        c.fillStyle = 'rgba(255,220,120,0.9)'; c.beginPath(); c.arc(x, y, r * 0.55, 0, 7); c.fill();
      }
      function yild(x, y, r) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); for (var i = 0; i < 10; i++) { var a = -1.5708 + i * 0.6283, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }
      cicek(64, 50, 7, 'rgba(240,130,130,0.55)'); cicek(64, 178, 7, 'rgba(150,170,240,0.5)');
      cicek(192, 114, 7, 'rgba(130,200,160,0.55)'); cicek(192, 242, 7, 'rgba(240,170,90,0.5)');
      yild(64, 114, 6); yild(192, 50, 6); yild(192, 178, 5); yild(64, 242, 5);
      c.strokeStyle = 'rgba(160,120,90,0.25)'; c.lineWidth = 1.5;
      for (var y = 0; y < h; y += 16) { c.beginPath(); c.moveTo(w / 2 + 10, y); c.lineTo(w / 2 + 14, y + 8); c.stroke(); }
    }, [1.4, 1.4]);
  }
  function pencere() {   // arka duvarda (sol köşe) gün batımı penceresi: dışarıda ağaçlar; perde dalgalanır; sıcak ışık hüzmesi girer
    var PW = 1.3, PH = 1.85, PY = 2.55;
    var g = new THREE.Group(); g.position.set(PEN_X, 0, DUVAR_Z + 0.02); scene.add(g);
    var gok = tuvalDoku(256, 360, function (c, w, h) {
      var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8a6ad0'); gr.addColorStop(0.35, '#e98aa8'); gr.addColorStop(0.62, '#ffb35c'); gr.addColorStop(1, '#ffd9a0');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      var sg = c.createRadialGradient(w * 0.62, h * 0.66, 0, w * 0.62, h * 0.66, 60); sg.addColorStop(0, 'rgba(255,250,210,1)'); sg.addColorStop(0.35, 'rgba(255,230,150,0.9)'); sg.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = sg; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,240,230,0.55)'; [[40, 70, 34], [70, 64, 26], [180, 110, 30], [205, 104, 22]].forEach(function (q) { c.beginPath(); c.ellipse(q[0], q[1], q[2], q[2] * 0.45, 0, 0, 7); c.fill(); });
      c.fillStyle = '#8a5a8a'; c.beginPath(); c.moveTo(0, h); c.quadraticCurveTo(w * 0.3, h * 0.72, w * 0.6, h * 0.82); c.quadraticCurveTo(w * 0.85, h * 0.74, w, h * 0.8); c.lineTo(w, h); c.fill();
      c.fillStyle = '#5a3a6a';
      [[22, 0.78, 24], [58, 0.8, 18], [200, 0.76, 28], [238, 0.8, 20]].forEach(function (q) { c.beginPath(); c.arc(q[0], h * q[1], q[2], 0, 7); c.fill(); c.fillRect(q[0] - 3, h * q[1], 6, h); });
    });
    mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: gok, color: new THREE.Color(1.5, 1.4, 1.3), toneMapped: false }), [0, PY, 0.01], null, null, g);
    var ç = std({ color: 0xfff6ea, roughness: 0.45 });
    golge(mesh(new THREE.BoxGeometry(PW + 0.2, 0.12, 0.14), ç, [0, PY + PH / 2 + 0.05, 0.07], null, null, g), true, true);
    golge(mesh(new THREE.BoxGeometry(PW + 0.35, 0.09, 0.3), ç, [0, PY - PH / 2 - 0.04, 0.15], null, null, g), true, true);
    [-1, 1].forEach(function (sd) { golge(mesh(new THREE.BoxGeometry(0.12, PH, 0.12), ç, [sd * (PW / 2 + 0.04), PY, 0.06], null, null, g), true, true); });
    golge(mesh(new THREE.BoxGeometry(0.06, PH, 0.08), ç, [0, PY, 0.05], null, null, g), true, false);
    golge(mesh(new THREE.BoxGeometry(PW, 0.06, 0.08), ç, [0, PY + 0.15, 0.05], null, null, g), true, false);
    // pervazda küçük saksı + oyuncak
    mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 14), std({ color: 0xd9714f }), [-0.35, PY - PH / 2 + 0.08, 0.18], null, null, g);
    mesh(new THREE.SphereGeometry(0.11, 12, 10), std({ color: 0x6fbf5a, roughness: 0.6 }), [-0.35, PY - PH / 2 + 0.22, 0.18], null, null, g);
    mesh(new THREE.SphereGeometry(0.03, 8, 6), std({ color: 0xff6b8a }), [-0.32, PY - PH / 2 + 0.33, 0.24], null, null, g);
    // perdeler (dalgalanır)
    var perde = TX('fabric', 2, 4, { color: 0xff9f8f });
    [-1, 1].forEach(function (sd) {
      var pg = new THREE.PlaneGeometry(0.42, PH + 0.5, 10, 6), pp = pg.attributes.position;
      var m = mesh(pg, perde, [sd * (PW / 2 + 0.2), PY + 0.05, 0.16], null, null, g); m.material.side = THREE.DoubleSide; golge(m, true, true);
      anims.push(function (dt, t) {
        for (var i = 0; i < pp.count; i++) { var px = pp.getX(i), py = pp.getY(i); pp.setZ(i, Math.sin(px * 30 + t * 1.2) * 0.035 + (PH / 2 - py) * 0.05 * (0.5 + 0.5 * Math.sin(t * 0.8 + sd + py * 1.5))); }
        pp.needsUpdate = true; pg.computeVertexNormals();
      });
    });
    golge(mesh(new THREE.CylinderGeometry(0.025, 0.025, PW + 1.1, 8), std({ color: 0xb07a4a }), [0, PY + PH / 2 + 0.2, 0.18], null, [0, 0, PI / 2], g), true, false);
    // içeri giren ışık hüzmesi (pencereden zemine)
    var hm = new THREE.MeshBasicMaterial({ map: tuvalDoku(64, 256, function (c, w, h) {
      var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,200,130,0.75)'); gr.addColorStop(0.7, 'rgba(255,190,120,0.3)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h); var gx = c.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.2, 'rgba(0,0,0,0)'); gx.addColorStop(0.8, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = gx; c.fillRect(0, 0, w, h);
    }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0.4, toneMapped: false });
    var A = V(PEN_X, PY, DUVAR_Z + 0.1), Bn = V(PEN_X + 1.6, 0.02, DUVAR_Z + 3.4), mid = A.clone().add(Bn).multiplyScalar(0.5), L = A.distanceTo(Bn);
    var huz = mesh(new THREE.PlaneGeometry(PW * 1.1, L), hm, [mid.x, mid.y, mid.z], null, null, scene);
    huz.lookAt(mid.x + 0.0, mid.y + 10, mid.z); huz.up.set(0, 1, 0);
    var dir = Bn.clone().sub(A).normalize(); huz.quaternion.setFromUnitVectors(V(0, -1, 0), dir);
    var huz2 = huz.clone(); huz2.rotateY(PI / 2); huz2.scale.x = 0.7; scene.add(huz2);
    var yer = mesh(new THREE.PlaneGeometry(1.6, 1.3), new THREE.MeshBasicMaterial({ map: noktaDoku(), color: new THREE.Color(0.9, 0.6, 0.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [Bn.x, 0.015, Bn.z - 0.3], null, [-PI / 2, 0, 0], scene);
    anims.push(function (dt, t) { hm.opacity = 0.34 + 0.06 * Math.sin(t * 0.7); });
  }
  function flama() {   // portalların üstünde gerçek kumaş flamalar: dikişli kenar, rüzgârla dalgalanır
    var renk = ['#ff8a8a', '#ffd166', '#7fd6a8', '#79b8ff', '#c79bff'], mats = renk.map(function (r) {
      var t = tuvalDoku(64, 64, function (c, w, h) {
        c.fillStyle = r; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.setLineDash([4, 3]);
        c.beginPath(); c.moveTo(6, 6); c.lineTo(w - 6, 6); c.lineTo(w / 2, h - 4); c.closePath(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(w / 2, h * 0.32, 5, 0, 7); c.fill();
      });
      var m = std({ map: t, roughness: 0.85, side: THREE.DoubleSide });
      if (TEX && TEX.fabric) { m.normalMap = TEX.fabric.normalMap; m.normalScale = new THREE.Vector2(0.5, 0.5); }
      return m;
    });
    var ip = std({ color: 0x9a6a40 }), bayraklar = [];
    [[-ODA_X + 0.2, -1.75], [-1.45, 1.45], [1.75, ODA_X - 0.2]].forEach(function (a, s) {
      var n = Math.max(3, Math.round((a[1] - a[0]) / 0.5)), y0 = 5.55, sag = 0.4, pts = [];
      for (var i = 0; i <= 24; i++) { var u = i / 24; pts.push(V(a[0] + (a[1] - a[0]) * u, y0 - sag * 4 * u * (1 - u), DUVAR_Z + 0.2)); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.014, 5), ip, null, null, null, scene);
      for (i = 0; i < n; i++) {
        var u2 = (i + 0.5) / n, x = a[0] + (a[1] - a[0]) * u2, y = y0 - sag * 4 * u2 * (1 - u2);
        var geo = new THREE.PlaneGeometry(0.36, 0.44, 4, 6), pp = geo.attributes.position;
        for (var k = 0; k < pp.count; k++) { var yy = pp.getY(k), f = (yy + 0.22) / 0.44; pp.setX(k, pp.getX(k) * f); pp.setY(k, yy - 0.22); }
        geo.userData.x0 = Float32Array.from(pp.array);
        var m = mesh(geo, mats[(i + s * 2) % 5], [x, y, DUVAR_Z + 0.21], null, null, scene);
        m.castShadow = true; bayraklar.push({ g: geo, ph: i * 0.9 + s * 2 });
      }
    });
    anims.push(function (dt, t) {
      for (var j = 0; j < bayraklar.length; j++) {
        var b = bayraklar[j], pp = b.g.attributes.position, x0 = b.g.userData.x0;
        for (var k = 0; k < pp.count; k++) {
          var yy = x0[k * 3 + 1], d = -yy / 0.44;
          pp.setZ(k, Math.sin(t * 2.2 + b.ph + yy * 9 + x0[k * 3] * 6) * 0.045 * d + d * d * 0.06);
        }
        pp.needsUpdate = true; b.g.computeVertexNormals();
      }
    });
  }
  function hali() {
    var t = tuvalDoku(512, 512, function (g, w, h) {
      var r = ['#ef8f86', '#ffd27a', '#8fd0c8', '#ffe9b8', '#c9a2f0', '#ffd27a'];
      for (var i = 0; i < r.length; i++) { g.fillStyle = r[i]; g.beginPath(); g.arc(w / 2, h / 2, w / 2 * (1 - i * 0.15), 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 5; g.setLineDash([14, 12]);
      for (i = 1; i < 5; i++) { g.beginPath(); g.arc(w / 2, h / 2, w / 2 * (1 - i * 0.15) + 8, 0, 7); g.stroke(); }
    });
    var m = mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.035, 64), std({ map: t, roughness: 0.95 }), [0, 0.018, 1.95 + ON_Z], [1, 1, 0.72], null, scene);
    m.receiveShadow = true;
    var n = TEX && TEX.carpet ? TEX.rep('carpet', 3, 3) : null; if (n) { m.material.normalMap = n.normalMap; m.material.normalScale = new THREE.Vector2(0.6, 0.6); }
  }
  function minderler() {
    var g = new THREE.SphereGeometry(1, 28, 18);
    [[-2.2, 3.6, 0xffd166, -0.4], [3.4, 3.0, 0xc79bff, 0.2]].forEach(function (c) {
      var m = mesh(g, TX('fabric', 2, 2, { color: c[2] }), [c[0] * (ON_Z ? 0.85 : 1), 0.2, c[1] + ON_Z], [0.62, 0.22, 0.62], [0, c[3], 0], scene); golge(m, true, true);
      golge(mesh(new THREE.SphereGeometry(0.06, 12, 8), std({ color: 0xffffff }), [c[0] * (ON_Z ? 0.85 : 1), 0.42, c[1] + ON_Z], null, null, scene), true, false);
    });
  }
  function oyuncaklar() {
    var rb = G.rbox(2), renk = [0xff6b6b, 0xffd23f, 0x4fa8ff, 0x6fd08c];
    [].forEach(function (b) {
      golge(mesh(rb, std({ color: renk[b[3]], roughness: 0.4 }), [b[0] * (ON_Z ? 0.85 : 1), b[1], b[2] + ON_Z], 0.4, [0, b[4], 0], scene), true, true);
    });
    // oyuncak ayı (yumuşak toplar)
    var ay = new THREE.Group(); ay.position.set(-2.7 * (ON_Z ? 0.85 : 1), 0, 1.0 + ON_Z); ay.rotation.y = 0.6; scene.add(ay);
    var am = TX('fabric', 1, 1, { color: 0xc98a52 }), ac = std({ color: 0xf2d2a8, roughness: 0.9 }), sg = new THREE.SphereGeometry(1, 24, 16);
    mesh(sg, am, [0, 0.32, 0], [0.3, 0.32, 0.26], null, ay); mesh(sg, am, [0, 0.78, 0], 0.22, null, ay);
    mesh(sg, ac, [0, 0.3, 0.17], [0.18, 0.2, 0.12], null, ay); mesh(sg, ac, [0, 0.74, 0.18], [0.1, 0.08, 0.08], null, ay);
    mesh(sg, std({ color: 0x2a1a12, roughness: 0.3 }), [0, 0.77, 0.25], 0.035, null, ay);
    [-1, 1].forEach(function (s) {
      mesh(sg, am, [s * 0.16, 0.96, 0], 0.08, null, ay); mesh(sg, am, [s * 0.3, 0.42, 0.06], [0.09, 0.15, 0.09], [0, 0, s * 0.6], ay);
      mesh(sg, am, [s * 0.16, 0.08, 0.12], [0.1, 0.09, 0.14], null, ay); mesh(sg, std({ color: 0x1a1210, roughness: 0.2 }), [s * 0.08, 0.83, 0.19], 0.03, null, ay);
    });
    golge(ay, true, true);
    // oyuncak tren vagonu gibi küçük araba
    var ar = new THREE.Group(); ar.position.set(3.7 * (ON_Z ? 0.75 : 1), 0, 2.0 + ON_Z); ar.rotation.y = -0.5; scene.add(ar);
    mesh(rb, std({ color: 0xff8a3a, roughness: 0.4 }), [0, 0.22, 0], [0.7, 0.26, 0.4], null, ar);
    mesh(rb, std({ color: 0x4fa8ff, roughness: 0.4 }), [-0.1, 0.45, 0], [0.34, 0.24, 0.34], null, ar);
    [[-0.22, 0.2], [0.22, 0.2], [-0.22, -0.2], [0.22, -0.2]].forEach(function (w) { mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 18), std({ color: 0x333344 }), [w[0], 0.1, w[1]], null, [PI / 2, 0, 0], ar); });
    golge(ar, true, true);
  }
  function bitki(x, z, s) {
    var g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    var pts = [V(0, 0), V(0.26, 0), V(0.3, 0.42), V(0.34, 0.5), V(0.3, 0.52)];
    mesh(new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p.x, p.y); }), 24), std({ color: 0xd9714f, roughness: 0.7 }), [0, 0, 0], null, null, g);
    mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.02, 20), std({ color: 0x5a3a22 }), [0, 0.49, 0], null, null, g);
    var yap = std({ color: 0x4f9e4c, roughness: 0.55, side: THREE.DoubleSide }), yg = new THREE.SphereGeometry(1, 12, 8);
    for (var i = 0; i < 11; i++) {
      var a = i * 2.4, e = 0.35 + (i % 3) * 0.25, L = 0.55 + (i % 4) * 0.1;
      var m = mesh(yg, i % 2 ? yap : std({ color: 0x67b85a, roughness: 0.55 }), [Math.cos(a) * 0.12, 0.5 + L * 0.5 * Math.cos(e), Math.sin(a) * 0.12], [0.09, L * 0.5, 0.03], null, g);
      m.rotation.order = 'YXZ'; m.rotation.y = -a; m.rotation.x = 0; m.rotation.z = e;
      m.position.x = Math.cos(a) * (0.1 + L * 0.45 * Math.sin(e)); m.position.z = Math.sin(a) * (0.1 + L * 0.45 * Math.sin(e));
      m.lookAt(V(x + m.position.x * 4 * s, 3, z + m.position.z * 4 * s)); m.rotateX(PI / 2 - e * 0.6);
    }
    golge(g, true, true);
  }
  function lamba(x, z) {
    var g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    var m = std({ color: 0xd8b07a, metalness: 0.6, roughness: 0.3 });
    mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.06, 24), m, [0, 0.03, 0], null, null, g);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 10), m, [0, 1.08, 0], null, null, g);
    var ab = new THREE.CylinderGeometry(0.28, 0.42, 0.5, 28, 1, true);
    mesh(ab, new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc070, emissiveIntensity: 0.9, side: THREE.DoubleSide, roughness: 0.8 }), [0, 2.2, 0], null, null, g);
    hale(0xffc070, 1.6, [0, 2.15, 0], g, 0.8);
    golge(g, true, false);
    var l = LIGHTS.feza; l.position.set(x, 2.0, z); l.color.set(0xffc27a); l.intensity = 3.0; l.distance = 7; l.decay = 1.6;
  }

  // ---------- zengin oda dekoru ----------
  function dekor() {
    tavan(); lambri(); pencereDisi(); tozZerreleri(); dolgunIsik();
    kitapRafi(RAF_X, DUVAR_Z + 0.25);
    cerceveler();
    cizimler();
    mobil(4.4, 5.05, 1.0);
    oyuncakSandigi(4.5, 0.6 + ON_Z * 0.5);
    bilboYatagi(-3.25, 2.45 + ON_Z);
    kupKalesi(2.85, 1.05 + ON_Z);
    trenYolu(0, 1.95 + ON_Z);
    havaBaloncuklari();
    portalIsiklari();
    temasGolgeleri();
  }
  function tavan() {   // çatı katı: ahşap tavan + kirişler + korniş
    var ah = std({ map: tuvalDoku(256, 256, function (c, w, h) {
      for (var i = 0; i < 8; i++) { c.fillStyle = ['#c98f5a', '#d29a64', '#bf8650', '#cc955e'][i % 4]; c.fillRect(0, i * 32, w, 32); c.fillStyle = 'rgba(80,40,15,0.35)'; c.fillRect(0, i * 32, w, 2); }
    }, [6, 6]), roughness: 0.7 });
    var tv = mesh(new THREE.PlaneGeometry(ODA_X * 2, 12), ah, [0, 6.4, 2.5], null, [PI / 2, 0, 0], scene);
    var km = std({ color: 0x9a6236, roughness: 0.6 });
    for (var z = -3.2; z < 8; z += 1.8) golge(mesh(new THREE.BoxGeometry(ODA_X * 2, 0.28, 0.24), km, [0, 6.28, z], null, null, scene), false, false);
    mesh(new THREE.BoxGeometry(ODA_X * 2, 0.22, 0.2), std({ color: 0xfff4e6, roughness: 0.5 }), [0, 6.12, DUVAR_Z + 0.1], null, null, scene);
  }
  function lambri() {   // alt duvarda ahşap lambri (portal aralarında ve yan duvarlarda)
    var t = tuvalDoku(128, 128, function (c, w, h) {
      c.fillStyle = '#f2d2b0'; c.fillRect(0, 0, w, h);
      for (var i = 0; i < 4; i++) { c.fillStyle = 'rgba(150,90,50,0.35)'; c.fillRect(i * 32, 0, 3, h); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(i * 32 + 3, 0, 2, h); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    var lm = function (w) { var m = std({ map: t.clone(), roughness: 0.5 }); m.map.needsUpdate = true; m.map.repeat.set(w / 0.5, 1); return m; };
    var H = 1.05, ust = std({ color: 0xc98b55, roughness: 0.45 });
    var aralik = [[-ODA_X, PORTAL[0].x - PORTAL[0].w / 2 - 0.22], [PORTAL[0].x + PORTAL[0].w / 2 + 0.22, PORTAL[1].x - PORTAL[1].w / 2 - 0.22],
      [PORTAL[1].x + PORTAL[1].w / 2 + 0.22, PORTAL[2].x - PORTAL[2].w / 2 - 0.22], [PORTAL[2].x + PORTAL[2].w / 2 + 0.22, ODA_X]];
    aralik.forEach(function (a) {
      var w = a[1] - a[0]; if (w <= 0.05) return;
      golge(mesh(new THREE.BoxGeometry(w, H, 0.05), lm(w), [(a[0] + a[1]) / 2, H / 2, DUVAR_Z + 0.03], null, null, scene), false, true);
      golge(mesh(new THREE.BoxGeometry(w, 0.06, 0.1), ust, [(a[0] + a[1]) / 2, H, DUVAR_Z + 0.05], null, null, scene), true, true);
    });
    [-1, 1].forEach(function (sd) {
      golge(mesh(new THREE.BoxGeometry(0.05, H, 12), lm(12), [sd * (ODA_X - 0.03), H / 2, 2.5], null, null, scene), false, true);
      golge(mesh(new THREE.BoxGeometry(0.1, 0.06, 12), ust, [sd * (ODA_X - 0.05), H, 2.5], null, null, scene), true, true);
    });
  }
  function pencereDisi() {}
  function tozZerreleri() {   // ışık huzmesinde süzülen toz zerreleri
    var N = 70, pos = new Float32Array(N * 3), ph = [];
    for (var i = 0; i < N; i++) ph.push([Math.random(), Math.random(), Math.random()]);
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: noktaDoku(), size: 0.045, color: new THREE.Color(1.8, 1.4, 0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    scene.add(pts);
    anims.push(function (dt, t) {
      for (var i = 0; i < N; i++) {
        var p = ph[i], u = (p[0] + t * 0.012 * (0.5 + p[1])) % 1;
        pos[i * 3] = PEN_X - 0.5 + p[1] * 1.2 + u * 1.6 + Math.sin(t * 0.3 + i) * 0.1;
        pos[i * 3 + 1] = 3.2 - u * 2.8 + Math.sin(t * 0.5 + i * 2) * 0.15 + p[2] * 0.5;
        pos[i * 3 + 2] = DUVAR_Z + 0.3 + u * 3.0 + Math.cos(t * 0.4 + i) * 0.1;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }
  function dolgunIsik() {   // mor/pembe dolgu ışığı (gölgesiz) – sıcak ana ışığın karşısından
    var d = new THREE.DirectionalLight(0xc8a0ff, 0.55); d.position.set(8, 5, 6); scene.add(d);
  }
  function kitapRafi(x, z) {   // sağ duvarda kitap rafı: renkli kitaplar, oyuncaklar, kupalar
    var g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    var ah = TX('wood', 1, 1, { color: 0xe8b882 }), W = 1.35, H = 2.3, D = 0.42;
    mesh(new THREE.BoxGeometry(W, H, 0.04), ah, [0, H / 2, -D / 2], null, null, g);
    [-1, 1].forEach(function (s) { mesh(new THREE.BoxGeometry(0.06, H, D), ah, [s * W / 2, H / 2, 0], null, null, g); });
    var raflar = [0.05, 0.62, 1.2, 1.78, 2.3];
    raflar.forEach(function (y) { mesh(new THREE.BoxGeometry(W, 0.05, D), ah, [0, y, 0], null, null, g); });
    var kr = [0xe2505f, 0x4fa8ff, 0xffd23f, 0x6fd08c, 0xc79bff, 0xff9a3a, 0x3a6ff0, 0xff7aa8];
    var rb = G.rbox(1);
    for (var r = 0; r < 3; r++) {
      var x0 = -W / 2 + 0.08, y0 = raflar[r] + 0.025, n = 0;
      while (x0 < (r === 1 ? 0.0 : W / 2 - 0.4)) {
        var kw = 0.05 + ((r * 7 + n * 3) % 4) * 0.012, kh = 0.34 + ((n * 5 + r) % 4) * 0.04, egik = (n % 9 === 8) ? 0.25 : 0;
        mesh(rb, std({ color: kr[(n + r * 3) % kr.length], roughness: 0.6 }), [x0 + kw / 2, y0 + kh / 2, 0.02], [kw, kh, 0.26], [0, 0, egik], g);
        x0 += kw + 0.006; n++;
      }
    }
    // kupalar (altın) – üst rafta
    var altin = std({ color: 0xffc94a, metalness: 0.85, roughness: 0.25 });
    [[-0.38, 0.95], [0.0, 1.1], [0.38, 0.85]].forEach(function (k) {
      var kg = new THREE.Group(); kg.position.set(k[0], raflar[3] + 0.03, 0.02); kg.scale.setScalar(k[1]); g.add(kg);
      mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.05, 16), std({ color: 0x6a3a20 }), [0, 0.025, 0], null, null, kg);
      mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 10), altin, [0, 0.11, 0], null, null, kg);
      mesh(new THREE.LatheGeometry([[0, 0], [0.04, 0.01], [0.09, 0.08], [0.1, 0.18], [0.09, 0.18], [0.08, 0.09], [0, 0.03]].map(function (q) { return new THREE.Vector2(q[0], q[1]); }), 20), altin, [0, 0.17, 0], null, null, kg);
      [-1, 1].forEach(function (s) { mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, PI), altin, [s * 0.1, 0.29, 0], null, [0, 0, s * PI / 2], kg); });
    });
    // oyuncaklar: küçük top, roket, ördek
    mesh(new THREE.SphereGeometry(0.12, 18, 14), std({ color: 0xff5a5a, roughness: 0.4 }), [0.4, raflar[1] + 0.15, 0], null, null, g);
    var rk = new THREE.Group(); rk.position.set(0.42, raflar[2] + 0.03, 0); g.add(rk);
    mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 14), std({ color: 0xffffff, roughness: 0.4 }), [0, 0.15, 0], null, null, rk);
    mesh(new THREE.ConeGeometry(0.06, 0.14, 14), std({ color: 0xe2505f, roughness: 0.4 }), [0, 0.37, 0], null, null, rk);
    mesh(new THREE.SphereGeometry(0.025, 10, 8), std({ color: 0x4fa8ff, roughness: 0.2 }), [0, 0.2, 0.06], null, null, rk);
    var ord = new THREE.Group(); ord.position.set(0.35, raflar[0] + 0.03, 0.05); g.add(ord);
    mesh(new THREE.SphereGeometry(0.11, 16, 12), std({ color: 0xffd23f, roughness: 0.35 }), [0, 0.09, 0], [1.2, 0.85, 1], null, ord);
    mesh(new THREE.SphereGeometry(0.07, 16, 12), std({ color: 0xffd23f, roughness: 0.35 }), [0.07, 0.2, 0], null, null, ord);
    mesh(new THREE.ConeGeometry(0.03, 0.07, 8), std({ color: 0xff8a2a }), [0.15, 0.2, 0], null, [0, 0, -PI / 2], ord);
    golge(g, true, true);
  }
  function resimCiz(boyut, ciz) {   // Feza ve Bilbo'nun çerçeve resmi: gerçek modellerden bir kez çizilir
    try {
      var rt = new THREE.WebGLRenderTarget(boyut, boyut, { samples: 4, colorSpace: THREE.SRGBColorSpace });
      var sc = new THREE.Scene(); sc.background = new THREE.Color(0xffe3c4);
      sc.add(new THREE.HemisphereLight(0xfff3dd, 0x8a6a50, 1.6));
      var k = new THREE.DirectionalLight(0xffe5c4, 2.4); k.position.set(-2, 3, 4); sc.add(k);
      var cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      var temiz = ciz(sc, cam);
      var oldRT = renderer.getRenderTarget(), tm = renderer.toneMapping;
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.setRenderTarget(rt); renderer.render(sc, cam); renderer.setRenderTarget(oldRT);
      renderer.toneMapping = tm;
      if (temiz) temiz();
      return rt.texture;
    } catch (e) { console.warn('resim', e); return null; }
  }
  function cerceveler() {   // arka duvarda iki çerçeve: Feza ile Bilbo'nun resmi, Bilbo'nun resmi
    var t1 = resimCiz(256, function (sc, cam) {
      var f = FEZA.create(), b = BILBO.create(); f.update(0.016, FST); b.update(0.016, { sit: 1, happy: 1 });
      f.root.position.set(-0.32, 0, 0); f.root.rotation.y = 0.25; b.root.position.set(0.38, 0, 0.1); b.root.rotation.y = -0.35;
      sc.add(f.root, b.root); cam.position.set(0, 1.05, 3.1); cam.lookAt(0, 0.85, 0);
      return function () { try { f.root.removeFromParent(); b.root.removeFromParent(); b.dispose && b.dispose(); } catch (e) {} };
    });
    var t2 = resimCiz(256, function (sc, cam) {
      var b = BILBO.create(); b.update(0.016, { sit: 1, happy: 1 }); sc.add(b.root); sc.background = new THREE.Color(0xcfe8ff);
      cam.position.set(0.1, 1.2, 1.9); cam.lookAt(0, 1.0, 0.3);
      return function () { try { b.root.removeFromParent(); b.dispose && b.dispose(); } catch (e) {} };
    });
    [[PORTAL[0].x, 4.25, 0.85, 0.7, t1, 0xe8a05a, 0.04], [PORTAL[2].x, 4.25, 0.7, 0.7, t2, 0x6fbf8a, -0.05]].forEach(function (c) {
      var g = new THREE.Group(); g.position.set(c[0], c[1], DUVAR_Z + 0.06); g.rotation.z = c[6]; scene.add(g);
      golge(mesh(G.rbox(2), std({ color: c[5], roughness: 0.45 }), [0, 0, 0], [c[2] + 0.14, c[3] + 0.14, 0.06], null, g), true, true);
      mesh(new THREE.PlaneGeometry(c[2], c[3]), c[4] ? new THREE.MeshBasicMaterial({ map: c[4] }) : std({ color: 0xffffff }), [0, 0, 0.035], null, null, g);
    });
  }
  function cizimler() {   // çocuk çizimleri (bantlı kâğıtlar)
    var cz = [function (c, w, h) {   // güneş + ev
      c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h); c.lineWidth = 6; c.lineCap = 'round';
      c.strokeStyle = '#ffb000'; c.beginPath(); c.arc(40, 40, 20, 0, 7); c.stroke(); for (var i = 0; i < 8; i++) { var a = i * 0.785; c.beginPath(); c.moveTo(40 + Math.cos(a) * 28, 40 + Math.sin(a) * 28); c.lineTo(40 + Math.cos(a) * 40, 40 + Math.sin(a) * 40); c.stroke(); }
      c.strokeStyle = '#e2505f'; c.strokeRect(70, 70, 60, 50); c.beginPath(); c.moveTo(62, 72); c.lineTo(100, 38); c.lineTo(138, 72); c.stroke();
      c.strokeStyle = '#3a9a4a'; c.beginPath(); c.moveTo(0, 140); c.quadraticCurveTo(80, 120, 160, 140); c.stroke();
    }, function (c, w, h) {   // köpek (Bilbo) + kalp
      c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h); c.lineWidth = 6; c.lineCap = 'round';
      c.strokeStyle = '#7a4a2a'; c.beginPath(); c.ellipse(80, 95, 45, 25, 0, 0, 7); c.stroke(); c.beginPath(); c.arc(125, 65, 20, 0, 7); c.stroke();
      [50, 70, 95, 110].forEach(function (x) { c.beginPath(); c.moveTo(x, 115); c.lineTo(x, 140); c.stroke(); });
      c.beginPath(); c.moveTo(36, 85); c.lineTo(16, 65); c.stroke();
      c.fillStyle = '#ff5a7a'; c.beginPath(); c.moveTo(40, 40); c.bezierCurveTo(10, 15, 30, 0, 40, 18); c.bezierCurveTo(50, 0, 70, 15, 40, 40); c.fill();
    }];
    [[PEN_X, 4.35, 0], [RAF_X, 3.0, 1]].forEach(function (q, i) {
      var t = tuvalDoku(160, 160, cz[q[2]]);
      var m = mesh(new THREE.PlaneGeometry(0.62, 0.62), std({ map: t, roughness: 0.9, side: THREE.DoubleSide }), [q[0], q[1], DUVAR_Z + 0.07], null, [0, 0, i ? -0.08 : 0.07], scene);
      mesh(new THREE.PlaneGeometry(0.16, 0.05), std({ color: 0xfff3b0, transparent: true, opacity: 0.8 }), [q[0], q[1] + 0.3, DUVAR_Z + 0.075], null, [0, 0, 0.2], scene);
    });
  }
  function mobil(x, y, z) {   // tavandan sarkan yıldız + gezegen mobili, yavaşça döner
    var g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 6.4 - y, 4), std({ color: 0xffffff }), [0, (6.4 - y) / 2, 0], null, null, g);
    var kol = new THREE.Group(); g.add(kol);
    mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8), std({ color: 0xd8b07a }), [0, 0, 0], null, [0, 0, PI / 2], kol);
    mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8), std({ color: 0xd8b07a }), [0, 0, 0], null, [PI / 2, 0, 0], kol);
    var parca = [];
    [[0.6, 0, 0.45, 'y'], [-0.6, 0, 0.6, 'g'], [0, 0.6, 0.35, 'g2'], [0, -0.6, 0.5, 'y']].forEach(function (q) {
      var ip = q[2];
      mesh(new THREE.CylinderGeometry(0.004, 0.004, ip, 4), std({ color: 0xffffff }), [q[0], -ip / 2, q[1]], null, null, kol);
      var o;
      if (q[3] === 'y') o = yildiz3(0.13, 0xffd23f, 0.5);
      else { o = new THREE.Group(); mesh(new THREE.SphereGeometry(0.13, 20, 14), std({ color: q[3] === 'g' ? 0x7ab8ff : 0xff9aa8, roughness: 0.4 }), null, null, null, o); mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 30), std({ color: 0xffe08a, roughness: 0.4 }), null, [1, 1, 1], [1.2, 0, 0.3], o); }
      o.position.set(q[0], -ip - 0.12, q[1]); kol.add(o); parca.push(o);
    });
    golge(g, true, false);
    anims.push(function (dt, t) { kol.rotation.y = t * 0.25; for (var i = 0; i < parca.length; i++) parca[i].rotation.y = t * (0.6 + i * 0.2); });
  }
  function oyuncakSandigi(x, z) {   // kapağı aralık sandık: içinden ışın kılıcı ve top görünüyor
    var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.7; scene.add(g);
    var ah = TX('wood', 1, 1, { color: 0x6fa8d8 }), ser = std({ color: 0xffd23f, roughness: 0.4 });
    mesh(new THREE.BoxGeometry(1.1, 0.06, 0.7), ah, [0, 0.03, 0], null, null, g);
    [[0, 0.32, 0.33, 1.1, 0.6, 0.04], [0, 0.32, -0.33, 1.1, 0.6, 0.04], [0.53, 0.32, 0, 0.04, 0.6, 0.7], [-0.53, 0.32, 0, 0.04, 0.6, 0.7]].forEach(function (b) {
      mesh(new THREE.BoxGeometry(b[3], b[4], b[5]), ah, [b[0], b[1], b[2]], null, null, g);
    });
    mesh(new THREE.BoxGeometry(1.14, 0.06, 0.06), ser, [0, 0.55, 0.35], null, null, g);
    var kap = new THREE.Group(); kap.position.set(0, 0.62, -0.35); kap.rotation.x = -0.75; g.add(kap);
    mesh(new THREE.BoxGeometry(1.14, 0.08, 0.72), ah, [0, 0, 0.36], null, null, kap);
    yildiz3(0.12, 0xffd23f, 0.3).position.set(0, 0.05, 0.36); kap.children[0].add(yildiz3(0.12, 0xffd23f, 0.3)); kap.children[0].children[0].position.set(0, 0.05, 0); kap.children[0].children[0].rotation.x = -PI / 2;
    var tp = topModel(0.15); tp.position.set(-0.25, 0.55, 0.05); g.add(tp);
    var kl = new THREE.Group(); kl.position.set(0.2, 0.45, -0.05); kl.rotation.set(0.25, 0, -0.55); g.add(kl);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 10), std({ color: 0xc9d0da, metalness: 0.8, roughness: 0.2 }), [0, 0, 0], null, null, kl);
    mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.7, 10), parlak(0x7dff7a, 3.0), [0, 0.45, 0], null, null, kl);
    hale(0x7dff7a, 0.6, [0, 0.45, 0], kl, 0.8);
    mesh(new THREE.SphereGeometry(0.1, 14, 10), std({ color: 0xff7aa8, roughness: 0.5 }), [0.0, 0.58, 0.12], null, null, g);
    golge(g, true, true);
  }
  function bilboYatagi(x, z) {   // Bilbo'nun minderli yatağı + mama kabı + kemik
    var g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    mesh(new THREE.TorusGeometry(0.55, 0.2, 14, 32), TX('fabric', 3, 1, { color: 0xd9706a }), [0, 0.18, 0], [1, 1, 1], [PI / 2, 0, 0], g);
    mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.12, 32), TX('fabric', 2, 2, { color: 0xf3e0c0 }), [0, 0.08, 0], null, null, g);
    var kab = new THREE.Group(); kab.position.set(0.95, 0, -0.35); g.add(kab);
    mesh(new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.24, 0.1], [0.2, 0.1], [0.17, 0.03], [0, 0.03]].map(function (q) { return new THREE.Vector2(q[0], q[1]); }), 24), std({ color: 0xe2505f, roughness: 0.3, side: THREE.DoubleSide }), null, null, null, kab);
    for (var i = 0; i < 9; i++) mesh(new THREE.SphereGeometry(0.035, 8, 6), std({ color: 0x8a5a30, roughness: 0.8 }), [Math.cos(i * 2.1) * 0.1, 0.06, Math.sin(i * 2.1) * 0.1], null, null, kab);
    var km = new THREE.Group(); km.position.set(0.15, 0.2, 0.1); km.rotation.set(0, 0.6, 0); g.add(km);
    var bm = std({ color: 0xfff6e8, roughness: 0.5 });
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 10), bm, [0, 0, 0], null, [0, 0, PI / 2], km);
    [-1, 1].forEach(function (s) { [-1, 1].forEach(function (u) { mesh(new THREE.SphereGeometry(0.045, 10, 8), bm, [s * 0.14, 0, u * 0.03], null, null, km); }); });
    golge(g, true, true);
  }
  function kupKalesi(x, z) {   // küplerden yapılmış küçük kale
    var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.3; scene.add(g);
    var rb = G.rbox(2), kr = [0xff6b6b, 0xffd23f, 0x4fa8ff, 0x6fd08c, 0xc79bff];
    var s = 0.3, k = 0;
    for (var yy = 0; yy < 2; yy++) for (var xx = -1; xx <= 1; xx++) { if (yy === 1 && xx === 0) continue; mesh(rb, std({ color: kr[k++ % 5], roughness: 0.4 }), [xx * s, s / 2 + yy * s, 0], s * 0.96, [0, (k % 3) * 0.05, 0], g); }
    [-1, 1].forEach(function (sd) { mesh(new THREE.ConeGeometry(0.18, 0.3, 4), std({ color: 0xe2505f, roughness: 0.4 }), [sd * s, s * 2 + 0.15, 0], null, [0, PI / 4, 0], g); });
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 6), std({ color: 0xffffff }), [0, s + 0.17, 0], null, null, g);
    var bayrak = mesh(new THREE.PlaneGeometry(0.16, 0.1), std({ color: 0xffd23f, side: THREE.DoubleSide }), [0.08, s + 0.3, 0], null, null, g);
    anims.push(function (dt, t) { bayrak.rotation.y = Math.sin(t * 3) * 0.3; });
    golge(g, true, true);
  }
  function trenYolu(cx, cz) {   // halının çevresinde oyuncak tren yolu + dönen tren
    var RX = 2.55, RZ = 1.85;
    var g = new THREE.Group(); g.position.set(cx, 0, cz); scene.add(g);
    var ray = std({ color: 0xb8c0cc, metalness: 0.7, roughness: 0.3 }), trav = std({ color: 0xa8743a, roughness: 0.7 });
    [-0.06, 0.06].forEach(function (o) {
      var pts = []; for (var i = 0; i <= 64; i++) { var a = i / 64 * 2 * PI; pts.push(V(Math.cos(a) * (RX + o), 0.03, Math.sin(a) * (RZ + o))); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, 0.012, 5, true), ray, null, null, null, g);
    });
    var tg = new THREE.BoxGeometry(0.22, 0.02, 0.05);
    var inst = new THREE.InstancedMesh(tg, trav, 56), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (var i = 0; i < 56; i++) {
      var a = i / 56 * 2 * PI, px = Math.cos(a) * RX, pz = Math.sin(a) * RZ, yon = Math.atan2(-Math.sin(a) * RZ, Math.cos(a) * RX);
      q.setFromEuler(e.set(0, -Math.atan2(Math.cos(a) * RZ, -Math.sin(a) * RX), 0));
      m4.compose(V(px, 0.012, pz), q, V(1, 1, 1)); inst.setMatrixAt(i, m4);
    }
    inst.receiveShadow = true; g.add(inst);
    var vag = [], renk = [0xe2505f, 0x4fa8ff, 0xffd23f];
    for (i = 0; i < 3; i++) {
      var v = new THREE.Group(); g.add(v); vag.push(v);
      mesh(G.rbox(2), std({ color: renk[i], roughness: 0.35 }), [0, 0.13, 0], [0.32, 0.16, 0.2], null, v);
      if (i === 0) { mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), std({ color: 0x333344 }), [0.08, 0.27, 0], null, null, v); mesh(G.rbox(2), std({ color: 0xffd23f, roughness: 0.4 }), [-0.07, 0.27, 0], [0.14, 0.14, 0.18], null, v); }
      else mesh(new THREE.SphereGeometry(0.06, 10, 8), std({ color: [0x7dff7a, 0xff9aa8][i - 1] }), [0, 0.25, 0], null, null, v);
      [-0.1, 0.1].forEach(function (wx) { [-0.1, 0.1].forEach(function (wz) { mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), std({ color: 0x333344 }), [wx, 0.05, wz], null, [PI / 2, 0, 0], v); }); });
      golge(v, true, false);
    }
    anims.push(function (dt, t) {
      for (var k = 0; k < vag.length; k++) {
        var a = -t * 0.22 - k * 0.15, px = Math.cos(a) * RX, pz = Math.sin(a) * RZ;
        vag[k].position.set(px, 0, pz); vag[k].rotation.y = Math.atan2(-Math.sin(a) * RX, -Math.cos(a) * RZ) + PI / 2;
        vag[k].position.y = Math.abs(Math.sin(t * 9 + k)) * 0.006;
      }
    });
  }
  function havaBaloncuklari() {   // odada süzülen hayal baloncukları
    var bm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.28, iridescence: 1, iridescenceIOR: 1.3, envMapIntensity: 2, depthWrite: false });
    var b = [];
    for (var i = 0; i < 6; i++) { var m = mesh(new THREE.SphereGeometry(1, 24, 16), bm, [0, 0, 0], 0.09 + (i % 3) * 0.05, null, scene); b.push(m); }
    anims.push(function (dt, t) {
      for (var k = 0; k < b.length; k++) {
        var u = (t * 0.03 + k / b.length) % 1;
        b[k].position.set(-3 + k * 1.2 + Math.sin(t * 0.5 + k) * 0.4, 0.6 + u * 4.2, -0.8 + (k % 3) * 0.9 + Math.cos(t * 0.4 + k) * 0.3);
        var s = (0.09 + (k % 3) * 0.05) * Math.min(1, u * 8, (1 - u) * 8); b[k].scale.setScalar(Math.max(0.001, s));
      }
    });
  }
  function portalIsiklari() {   // portallardan zemine düşen renkli ışık
    PORTAL.forEach(function (p) {
      var t = tuvalDoku(128, 128, function (c, w, h) { var gr = c.createRadialGradient(w / 2, 0, 0, w / 2, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
      var m = mesh(new THREE.PlaneGeometry(p.w * 1.7, 2.2), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(bitti(p.id) ? 0xffd070 : p.isik).multiplyScalar(0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [p.x, 0.012, DUVAR_Z + 1.1], null, [-PI / 2, 0, 0], scene);
      anims.push(function (dt, tt) { m.material.opacity = 0.75 + 0.25 * Math.sin(tt * 1.7 + p.x); });
    });
  }
  var temas = [];
  function temasGolgeleri() {   // karakterlerin altında yumuşak temas gölgesi
    var t = tuvalDoku(64, 64, function (c, w, h) { var gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(40,20,10,0.55)'); gr.addColorStop(1, 'rgba(40,20,10,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    var tm = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
    [0.55, 0.75].forEach(function (s) { temas.push(mesh(new THREE.PlaneGeometry(s * 2, s * 2), tm, [0, 0.04, 0], null, [-PI / 2, 0, 0], scene)); });
    // eşyaların altına sabit temas gölgeleri (zemine otursunlar)
    var k = ON_Z ? 0.85 : 1;
    [[-2.7 * k, 1.0 + ON_Z, 0.5, 0.45], [-2.2 * k, 3.6 + ON_Z, 0.8, 0.8], [3.4 * k, 3.0 + ON_Z, 0.8, 0.8], [-3.25, 2.45 + ON_Z, 0.95, 0.95],
     [2.85, 1.05 + ON_Z, 0.65, 0.4], [4.5, 0.6 + ON_Z * 0.5, 0.8, 0.6], [-4.5, -0.9, 0.95, 0.6], [-4.55, -2.95, 0.5, 0.5], [4.45, -2.95, 0.5, 0.5],
     [RAF_X, DUVAR_Z + 0.35, 0.9, 0.35], [3.7 * (ON_Z ? 0.75 : 1), 2.0 + ON_Z, 0.5, 0.35], [5.6, 3.4, 0.4, 0.4]].forEach(function (q) {
      mesh(new THREE.PlaneGeometry(q[2] * 2, q[3] * 2), tm, [q[0], 0.035, q[1]], null, [-PI / 2, 0, 0], scene);
    });
  }

  // ---------- portal çerçevesi + parıltılar ----------
  var portallar = [], vurulabilir = [];
  function portalKur(p, i) {
    var g = new THREE.Group(); g.position.set(p.x, 0, DUVAR_Z + 0.02); scene.add(g);
    var tamam = bitti(p.id), cx = 0, kal = 0.2;
    var R = p.w / 2 + kal, r = p.w / 2, dis = new THREE.Shape();   // halka: tek çizgi (dış kemer → iç kemer)
    dis.moveTo(-R, 0); dis.lineTo(-R, p.h - r); dis.absarc(0, p.h - r, R, PI, 0, true); dis.lineTo(R, 0);
    dis.lineTo(r, 0); dis.lineTo(r, p.h - r); dis.absarc(0, p.h - r, r, 0, PI, false); dis.lineTo(-R, 0);
    var cm = tamam ? std({ color: 0xffc94a, metalness: 0.75, roughness: 0.28, emissive: 0x7a4a00, emissiveIntensity: 0.4 })
      : std({ color: p.renk, roughness: 0.45 });
    var cer = mesh(new THREE.ExtrudeGeometry(dis, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 32 }), cm, [0, 0, 0], null, null, g);
    golge(cer, true, true);
    // ışıklı iç kenar (parlama)
    var yol = kemerYolu(p.w - 0.02, p.h - 0.01, 30);
    var kenarMat = parlak(tamam ? 0xffe08a : p.isik, tamam ? 2.4 : 2.0);
    mesh(new THREE.TubeGeometry(yol, 90, 0.035, 6), kenarMat, [0, 0, 0.26], null, null, g);
    // büyülü zar: hafif dönen ışık (içi görünür kalır)
    var zarMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { t: { value: 0 }, c: { value: new THREE.Color(p.isik) }, k: { value: 0.22 }, w: { value: p.w }, h: { value: p.h } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float t,k,w,h; uniform vec3 c; varying vec2 vP;' +
        'void main(){ vec2 q = vec2(vP.x/(w*0.5), (vP.y-h*0.55)/(h*0.5)); float r = length(q), a = atan(q.y,q.x);' +
        ' float sw = 0.5+0.5*sin(a*3.0 + r*7.0 - t*1.6); float edge = smoothstep(0.55,1.05,r);' +
        ' float v = (0.25*sw + edge*0.5) * k; gl_FragColor = vec4(c*v*2.0, 1.0); }'
    });
    var zar = mesh(new THREE.ShapeGeometry(kemerSekli(p.w, p.h, 0, 0), 32), zarMat, [0, 0, 0.05], null, null, g);
    zar.renderOrder = 5;
    // dokunma alanı
    var hit = mesh(new THREE.ShapeGeometry(kemerSekli(p.w + 0.4, p.h + 0.2, 0, 0), 16), new THREE.MeshBasicMaterial({ visible: false }), [0, 0, 0.3], null, null, g);
    hit.userData.kapi = i; vurulabilir.push(hit);
    // parıltı tanecikleri (kemer boyunca süzülür)
    var N = tamam ? 46 : 26, pos = new Float32Array(N * 3), tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var pm = new THREE.PointsMaterial({ map: noktaDoku(), size: tamam ? 0.16 : 0.12, color: new THREE.Color(tamam ? 0xffe08a : p.isik).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    var pts = new THREE.Points(tg, pm); pts.position.z = 0.35; g.add(pts);
    var ph = []; for (var k = 0; k < N; k++) ph.push(Math.random());
    // süs: her maceranın kendi çerçeve işareti
    var sus = new THREE.Group(); sus.position.set(0, p.id === 'huysuz' ? p.h - 0.12 : p.h + kal * 0.5, 0.3); if (p.id === 'huysuz') sus.scale.setScalar(0.85); g.add(sus);
    if (p.id === 'huysuz') kalkan(sus, tamam); else if (p.id === 'orman') yapraklar(g, p, tamam); else kremalar(g, p, tamam);
    if (tamam) { var yz = yildiz3(0.3, 0xffd34a, 0.9); yz.position.set(0, p.id === 'huysuz' ? 0.75 : 0.32, 0.05); sus.add(yz); anims.push(function (dt, t) { yz.rotation.y = t * 1.5; }); }
    var o = { p: p, g: g, zarMat: zarMat, kenarMat: kenarMat, pts: pts, ph: ph, tamam: tamam, vurgu: 0, tc: new THREE.Color(p.isik) };
    portallar.push(o);
    // ışık halesi (biten portal altın)
    if (tamam) { var hl = hale(0xffd070, p.w * 2.6, [0, p.h * 0.55, -0.05], g, 0.3); o.hale = hl; }
    return o;
  }
  function yildiz3(r, c, k) {
    var s = new THREE.Shape();
    for (var i = 0; i < 10; i++) { var a = PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r; if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    var m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }),
      std({ color: c, metalness: 0.6, roughness: 0.25, emissive: c, emissiveIntensity: k || 0.4 }));
    m.geometry.center(); return golge(m, true, false);
  }
  function kalkan(sus, tamam) {   // Huysuz portalı: kahraman kalkanı + iki yıldız + ışın kılıçları çaprazı
    var s = new THREE.Shape();
    s.moveTo(0, 0.42); s.quadraticCurveTo(0.34, 0.42, 0.42, 0.34); s.lineTo(0.38, -0.05); s.quadraticCurveTo(0.3, -0.36, 0, -0.52);
    s.quadraticCurveTo(-0.3, -0.36, -0.38, -0.05); s.lineTo(-0.42, 0.34); s.quadraticCurveTo(-0.34, 0.42, 0, 0.42);
    var k = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 }),
      std({ color: 0x3a6ff0, metalness: 0.35, roughness: 0.3 }), [0, 0.25, 0], 1.1, null, sus);
    var y = yildiz3(0.22, 0xffd23f, 0.5); y.position.set(0, 0.22, 0.2); sus.add(y);
    [-1, 1].forEach(function (sd) {
      var kl = new THREE.Group(); kl.position.set(sd * 0.25, 0.1, -0.05); kl.rotation.z = sd * -0.75; sus.add(kl);
      mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 10), std({ color: 0xc9d0da, metalness: 0.8, roughness: 0.25 }), [0, -0.5, 0], null, null, kl);
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 10), parlak(sd < 0 ? 0x4ab8ff : 0x7dff7a, 3.0), [0, 0.2, 0], null, null, kl);
    });
    [-1, 1].forEach(function (sd) { var yz = yildiz3(0.14, 0xffe27a, 0.6); yz.position.set(sd * 0.75, -0.05, 0); sus.add(yz); });
    golge(sus, true, false);
  }
  function yapraklar(g, p, tamam) {   // Orman portalı: yapraklı sarmaşık + palamut
    var yg = new THREE.SphereGeometry(1, 10, 8), m1 = std({ color: 0x4f9e4c, roughness: 0.6 }), m2 = std({ color: 0x7cc56a, roughness: 0.6 });
    var yol = kemerYolu(p.w + 0.2, p.h + 0.1, 30);
    for (var i = 0; i < 26; i++) {
      var u = 0.04 + i / 26 * 0.92, q = yol.getPointAt(u);
      var m = mesh(yg, i % 2 ? m1 : m2, [q.x + Math.sin(i * 3.1) * 0.05, q.y, 0.3], [0.13, 0.07, 0.04], [0, 0, i * 1.7], g);
    }
    mesh(new THREE.SphereGeometry(0.11, 16, 12), std({ color: 0xa8743a }), [0, p.h + 0.2, 0.35], [1, 1.15, 1], null, g);
    mesh(new THREE.SphereGeometry(0.115, 16, 8, 0, 2 * PI, 0, PI / 2), std({ color: 0x6b4424, roughness: 0.9 }), [0, p.h + 0.27, 0.35], null, null, g);
    golge(g, true, false);
  }
  function kremalar(g, p, tamam) {   // Dev Ev portalı: krema damlaları + şekerlemeler
    var yol = kemerYolu(p.w + 0.2, p.h + 0.1, 30), sg = new THREE.SphereGeometry(1, 14, 10), kr = std({ color: 0xfff6ee, roughness: 0.35 });
    var sp = [0xff5f7e, 0x4ec3ff, 0xffd23d, 0x7be07b];
    for (var i = 0; i < 22; i++) {
      var u = 0.25 + i / 22 * 0.5, q = yol.getPointAt(u);
      mesh(sg, kr, [q.x, q.y + 0.04, 0.3], [0.12, 0.09, 0.08], null, g);
      if (i % 2) mesh(new THREE.CapsuleGeometry(0.015, 0.05, 3, 6), std({ color: sp[i % 4], roughness: 0.4 }), [q.x, q.y + 0.1, 0.38], null, [0, 0, i], g);
    }
    mesh(new THREE.SphereGeometry(0.12, 18, 14), std({ color: 0xe8283f, roughness: 0.2 }), [0, p.h + 0.3, 0.35], null, null, g);
    golge(g, true, false);
  }

  // ---------- portalların arkasındaki dünyalar ----------
  function bolme(p, gok, zeminMat) {   // portalın arkasında içi görünen kutu (gök duvarları + zemin)
    var g = new THREE.Group(); g.position.set(p.x, 0, DUVAR_Z - 0.3); scene.add(g);
    var w = p.cw, d = p.derin, h = 7.5;
    var gm = new THREE.MeshBasicMaterial({ map: gok, side: THREE.BackSide, toneMapped: true, fog: false });
    var tm = new THREE.MeshBasicMaterial({ color: gok.image ? 0xffffff : 0xffffff, side: THREE.BackSide });
    var kutu = mesh(new THREE.BoxGeometry(w, h, d), [gm, gm, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, visible: false }), new THREE.MeshBasicMaterial({ visible: false }), new THREE.MeshBasicMaterial({ visible: false }), gm], [0, h / 2 - 0.05, -d / 2], null, null, g);
    var zem = mesh(new THREE.PlaneGeometry(w, d), zeminMat, [0, 0.002, -d / 2], null, [-PI / 2, 0, 0], g);
    zem.receiveShadow = false;
    return g;
  }
  function agac(par, x, z, s, renk, yapr) {
    var g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); par.add(g);
    mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.6, 10), TX('bark', 1, 2, { color: 0xa07850 }), [0, 0.8, 0], null, null, g);
    var ym = yapr || std({ color: renk || 0x3f9b4a, roughness: 0.75 }), ig = new THREE.IcosahedronGeometry(1, 2);
    [[0, 2.0, 0, 0.85], [-0.55, 1.65, 0.1, 0.6], [0.55, 1.7, -0.05, 0.62], [0.1, 2.5, -0.1, 0.55], [0.15, 1.8, 0.45, 0.5]].forEach(function (b) {
      mesh(ig, ym, [b[0], b[1], b[2]], b[3], null, g);
    });
    return g;
  }
  function topModel(r) {   // Bilbo'nun mavi topu (krem halkalı)
    var g = new THREE.Group();
    mesh(new THREE.SphereGeometry(r, 28, 20), std({ color: 0x3d8fd0, roughness: 0.3, emissive: 0x0a2a50, emissiveIntensity: 0.3 }), null, null, null, g);
    mesh(new THREE.TorusGeometry(r * 1.0, r * 0.12, 10, 40), std({ color: 0xfff1c9, roughness: 0.35 }), null, null, [0.3, 0.2, 0], g);
    return golge(g, true, false);
  }
  function modelYap(tip, olcek) {   // macera modelleri (EMODEL): yoksa null
    try {
      if (typeof EMODEL === 'undefined') return null;
      var m = EMODEL.build(tip, {}); m.root.scale.setScalar(olcek); golge(m.root, true, false);
      if (m.setMood) try { m.setMood('happy'); } catch (e) {}
      return m;
    } catch (e) { console.warn('model', tip, e); return null; }
  }

  function dunyaOrman(p) {   // kamp, dere, sazlık, meşeler, parlayan saklı toplar, uzakta Koca Timsah
    var gok = egimDoku([0, '#5fb8ff', 0.5, '#bfe9ff', 0.72, '#fff2c8', 1, '#9fd77a']);
    var g = bolme(p, gok, TX('grass', 2, 2, { color: 0xbfe39a }));
    var D = -p.derin;
    // uzak tepeler
    var tm = std({ color: 0x6fbf5a, roughness: 0.9 });
    mesh(new THREE.SphereGeometry(1, 24, 12), tm, [-1.0, -0.2, D + 0.4], [1.8, 1.4, 0.6], null, g);
    mesh(new THREE.SphereGeometry(1, 24, 12), std({ color: 0x5aac4c, roughness: 0.9 }), [1.2, -0.3, D + 0.5], [1.6, 1.2, 0.6], null, g);
    hale(0xfff0b0, 1.6, [0.9, 3.3, D + 0.4], g, 1.4);
    // meşeler
    var ym = TX('leaves', 1, 1, { color: 0x67b14f });
    agac(g, -1.3, D + 0.8, 0.7, 0, ym); agac(g, 1.35, D + 1.1, 0.75, 0, ym);
    // dere (parlak su) + sazlık
    var su = std({ color: 0x3fa8e8, roughness: 0.08, metalness: 0.1, emissive: 0x0a3a60, emissiveIntensity: 0.35 });
    var sg = new THREE.PlaneGeometry(p.cw, 0.9, 30, 4), sp = sg.attributes.position;
    for (var i = 0; i < sp.count; i++) sp.setY(i, sp.getY(i) + Math.sin(sp.getX(i) * 2.2) * 0.18);
    var dere = mesh(sg, su, [0, 0.012, -1.75], null, [-PI / 2, 0, 0], g);
    for (i = 0; i < 16; i++) {
      var rx = -1.4 + (i % 8) * 0.38 + Math.sin(i) * 0.1, rz = i < 8 ? -1.2 : -2.35;
      var sz = mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.55 + (i % 3) * 0.12, 5), std({ color: 0x6a9a3a }), [rx, 0.3, rz], null, [Math.sin(i * 2) * 0.15, 0, Math.cos(i) * 0.12], g);
      if (i % 2) mesh(new THREE.CapsuleGeometry(0.03, 0.1, 3, 6), std({ color: 0x7a4a2a }), [rx, 0.58 + (i % 3) * 0.12, rz], null, null, g);
    }
    // çadır + kamp ateşi
    var cad = mesh(new THREE.ConeGeometry(0.62, 0.95, 4, 1), TX('fabric', 2, 2, { color: 0xff9a3a }), [-0.85, 0.47, -0.55], null, [0, PI / 4, 0], g);
    mesh(new THREE.ConeGeometry(0.2, 0.55, 3, 1), std({ color: 0x5a3020 }), [-0.75, 0.27, -0.12], null, [0, PI / 4 + 0.6, 0], g);
    var ates = new THREE.Group(); ates.position.set(0.75, 0, -0.5); g.add(ates);
    for (i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.42, 8), std({ color: 0x7a4a2a }), [0, 0.05, 0], null, [PI / 2, i * PI / 4, 0.25], ates);
    for (i = 0; i < 8; i++) mesh(new THREE.DodecahedronGeometry(0.07), std({ color: 0x9a9a9a }), [Math.cos(i * 0.8) * 0.28, 0.03, Math.sin(i * 0.8) * 0.28], null, null, ates);
    var alev = [], am = [parlak(0xff8a2a, 3.2), parlak(0xffd24a, 3.6)];
    for (i = 0; i < 3; i++) alev.push(mesh(new THREE.ConeGeometry(0.12 - i * 0.03, 0.4 - i * 0.08, 8), am[i % 2], [Math.sin(i * 2) * 0.04, 0.22, Math.cos(i * 2) * 0.04], null, null, ates));
    hale(0xff9a3a, 1.1, [0, 0.3, 0], ates, 1.0);
    var tl = LIGHTS.torches[0]; tl.color.set(0xff9a40); tl.intensity = 4.5; tl.distance = 4; tl.decay = 1.6;
    var ap = V(); ates.updateMatrixWorld(true);
    // saklı toplar (parlak)
    var toplar = [];
    [[-1.25, -2.9], [1.15, -2.7], [0.1, -1.0], [-0.2, -3.3]].forEach(function (q, k) {
      var tp = topModel(0.11); tp.position.set(q[0], 0.11, q[1]); g.add(tp); hale(0x9fd8ff, 0.55, [q[0], 0.15, q[1]], g, 1.2); toplar.push(tp);
    });
    // Koca Huysuz Timsah (gerçek model) dere kıyısında, küçük timsah suda
    var koca = modelYap('buyuktimsah', 0.42);
    if (koca) { koca.root.position.set(0.35, 0, -3.05); koca.root.rotation.y = -0.35; g.add(koca.root); }
    var kucuk = modelYap('ormantimsah', 0.6);
    if (kucuk) { kucuk.root.position.set(-0.4, -0.12, -1.75); kucuk.root.rotation.y = 0.9; g.add(kucuk.root); }
    anims.push(function (dt, t) {
      for (var k = 0; k < alev.length; k++) { alev[k].scale.set(1 + 0.15 * Math.sin(t * 13 + k), 1 + 0.25 * Math.sin(t * 9 + k * 2), 1); }
      if (!ap.x) { ates.getWorldPosition(ap); }
      tl.position.set(ap.x, 0.5, ap.z); tl.intensity = 4.2 + Math.sin(t * 11) * 0.5 + Math.sin(t * 17) * 0.3;
      dere.material.emissiveIntensity = 0.3 + 0.08 * Math.sin(t * 2);
      for (var j = 0; j < toplar.length; j++) toplar[j].position.y = 0.11 + Math.abs(Math.sin(t * 2.2 + j)) * 0.06;
      if (koca) koca.anim(dt, { move: 0 });
      if (kucuk) { kucuk.anim(dt, { move: 0 }); kucuk.root.position.y = -0.12 + Math.sin(t * 1.8) * 0.03; }
    });
    golge(g, false, false);
    return g;
  }

  function dunyaHuysuz(p) {   // sekiz hayal dünyası katman katman: ay, yanardağ, mağara, orman, kefir vadisi, surlu şehir, en arkada ejderha kalesi
    var gok = egimDoku([0, '#1c1050', 0.35, '#4a2aa0', 0.62, '#c46ad8', 0.8, '#ffb07a', 1, '#ffd9a0'], 140);
    var zm = TX('cobble', 2, 4, { color: 0xb9a8e8 });
    var g = bolme(p, gok, zm), D = -p.derin;
    // ay (Zıp Zıp Ay)
    mesh(new THREE.SphereGeometry(0.55, 32, 20), new THREE.MeshStandardMaterial({ color: 0xfff3c8, emissive: 0xfff0b0, emissiveIntensity: 1.3, roughness: 0.9 }), [-1.15, 5.0, D + 0.6], null, null, g);
    hale(0xfff0c0, 2.4, [-1.15, 5.0, D + 0.7], g, 0.9);
    // en arkada tepe + Ejderhanın Kalesi
    var tepe = std({ color: 0x5a3a8a, roughness: 0.9 });
    mesh(new THREE.SphereGeometry(1, 28, 14), tepe, [0.4, -0.5, D + 0.9], [2.2, 2.0, 1.0], null, g);
    var kale = new THREE.Group(); kale.position.set(0.45, 1.35, D + 1.0); g.add(kale);
    var tas = TX('castleFloor', 1, 1, { color: 0xd8c8ff }), cat = std({ color: 0xe0506a, roughness: 0.5 });
    [[-0.55, 0.9, 0.2], [0.55, 0.85, 0.2], [0, 1.35, 0.26], [-0.25, 0.65, 0.16], [0.28, 0.7, 0.16]].forEach(function (t) {
      mesh(new THREE.CylinderGeometry(t[2], t[2], t[1], 14), tas, [t[0], t[1] / 2, 0], null, null, kale);
      mesh(new THREE.ConeGeometry(t[2] * 1.3, t[2] * 2.2, 14), cat, [t[0], t[1] + t[2] * 1.1, 0], null, null, kale);
      mesh(new THREE.PlaneGeometry(0.06, 0.1), parlak(0xffd27a, 2.4), [t[0], t[1] * 0.6, t[2] + 0.01], null, null, kale);
    });
    mesh(new THREE.BoxGeometry(1.1, 0.5, 0.3), tas, [0, 0.25, 0.05], null, null, kale);
    var ejd = modelYap('ejderha', 0.17);
    if (ejd) { ejd.root.position.set(0.15, 1.9, 0.25); ejd.root.rotation.y = 0.3; kale.add(ejd.root); }
    // yanardağ (Lav Yanardağı)
    var yan = new THREE.Group(); yan.position.set(-1.25, 0, D + 2.4); g.add(yan);
    mesh(new THREE.CylinderGeometry(0.22, 0.95, 1.5, 20, 1, true), TX('basalt', 1, 1, { color: 0x6a4a5a }), [0, 0.75, 0], null, null, yan);
    var lav = mesh(new THREE.CircleGeometry(0.22, 20), parlak(0xff6a2a, 3.0), [0, 1.49, 0], null, [-PI / 2, 0, 0], yan);
    mesh(new THREE.BoxGeometry(0.08, 0.9, 0.02), parlak(0xff7a2a, 2.4), [0.18, 1.0, 0.42], null, [0.45, 0, -0.35], yan);
    hale(0xff7a3a, 1.5, [0, 1.6, 0], yan, 1.1);
    var duman = [];
    for (var i = 0; i < 4; i++) duman.push(mesh(new THREE.SphereGeometry(0.16, 12, 8), std({ color: 0xc8b8d8, roughness: 1, transparent: true, opacity: 0.7 }), [0, 1.7 + i * 0.3, 0], null, null, yan));
    // mağara kemeri (Köstebek ve Salyangoz Mağarası)
    var mag = new THREE.Group(); mag.position.set(1.25, 0, D + 2.7); g.add(mag);
    mesh(new THREE.TorusGeometry(0.55, 0.25, 12, 24, PI), TX('rock', 1, 1, { color: 0x9a8a8a }), [0, 0, 0], null, null, mag);
    mesh(new THREE.CircleGeometry(0.42, 20, 0, PI), basic({ color: 0x1a1020 }), [0, 0, -0.05], null, null, mag);
    for (i = 0; i < 3; i++) hale([0x6af0ff, 0xc08aff, 0x7aff9a][i], 0.25, [-0.2 + i * 0.2, 0.15 + (i % 2) * 0.12, 0.05], mag, 1.6);
    // kefir vadisi: beyaz yumuşak tepecikler + Huysuz Orman ağaçları
    var kef = std({ color: 0xfff8f0, roughness: 0.35 });
    mesh(new THREE.SphereGeometry(1, 20, 12), kef, [0.1, -0.1, D + 3.4], [0.8, 0.45, 0.4], null, g);
    mesh(new THREE.SphereGeometry(1, 20, 12), kef, [-0.6, -0.15, D + 3.6], [0.5, 0.35, 0.3], null, g);
    var om = std({ color: 0x5a8a4a, roughness: 0.8 });
    agac(g, -1.35, D + 4.4, 0.55, 0x4a9a5a); agac(g, 1.4, D + 4.2, 0.6, 0x6a5ab0); agac(g, 1.0, D + 4.9, 0.4, 0x3f8f6a);
    // Köpüklü Tuvalet Rüyası: köpük baloncukları
    var bal = [], bm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.35, iridescence: 1, iridescenceIOR: 1.3, envMapIntensity: 1.5, depthWrite: false });
    for (i = 0; i < 9; i++) { var b = mesh(new THREE.SphereGeometry(1, 24, 16), bm, [0, 0, 0], 0.08 + (i % 3) * 0.05, null, g); b.userData.f = i / 9; bal.push(b); }
    // önde: Feza'nın ışın kılıcı (yere saplı, parlıyor) + sevimli huysuz jöle
    var kl = new THREE.Group(); kl.position.set(-0.75, 0, -1.35); kl.rotation.z = 0.18; kl.rotation.x = -0.1; g.add(kl);
    mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.36, 12), std({ color: 0xc9d0da, metalness: 0.85, roughness: 0.2 }), [0, 1.25, 0], null, null, kl);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), std({ color: 0x3d4a5c }), [0, 1.12, 0], null, null, kl);
    var bicak = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 12), parlak(0x6fd0ff, 3.6), [0, 0.5, 0], null, null, kl);
    var kh = mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3aa0ff).multiplyScalar(1.6), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [0, 0.5, 0], null, null, kl);
    hale(0x6fc8ff, 1.3, [0, 0.6, 0], kl, 1.0);
    var tl = LIGHTS.torches[1]; tl.color.set(0x7ac8ff); tl.intensity = 2.5; tl.distance = 4; tl.decay = 1.6;
    var kp = V();
    var jole = modelYap('jole', 1.0);
    if (jole) { jole.root.position.set(0.75, 0, -1.6); jole.root.rotation.y = -0.4; g.add(jole.root); }
    var mantar = modelYap('mantar', 0.7);
    if (mantar) { mantar.root.position.set(-0.05, 0, -3.0); mantar.root.rotation.y = 0.2; g.add(mantar.root); }
    var yarasa = modelYap('yarasa', 0.8);
    if (yarasa) { g.add(yarasa.root); }
    anims.push(function (dt, t) {
      lav.material.color.setRGB(3.0, 0.9 + 0.3 * Math.sin(t * 3), 0.25);
      for (var k = 0; k < duman.length; k++) { var u = (t * 0.25 + k / duman.length) % 1; duman[k].position.y = 1.6 + u * 1.3; duman[k].scale.setScalar(0.6 + u * 1.2); duman[k].material.opacity = 0.7 * (1 - u); }
      for (k = 0; k < bal.length; k++) { var f = (t * 0.07 + bal[k].userData.f) % 1; bal[k].position.set(-1.3 + (k * 0.37) % 2.6 + Math.sin(t + k) * 0.15, 0.3 + f * 4.5, -0.8 - (k % 4) * 0.9); }
      bicak.material.color.setRGB(0.9, 2.6 + 0.4 * Math.sin(t * 9), 3.8); kh.scale.x = kh.scale.z = 1 + 0.15 * Math.sin(t * 7);
      if (!kp.x) kl.getWorldPosition(kp);
      tl.position.set(kp.x, 0.9, kp.z + 0.2);
      if (ejd) { ejd.anim(dt, { move: 0 }); }
      if (jole) { jole.anim(dt, { move: 0.35 }); jole.root.position.x = 0.75 + Math.sin(t * 0.8) * 0.15; }
      if (mantar) mantar.anim(dt, { move: 0 });
      if (yarasa) { yarasa.anim(dt, { move: 1 }); yarasa.root.position.set(Math.sin(t * 0.6) * 1.0, 2.6 + Math.sin(t * 1.3) * 0.3, -4.2 + Math.cos(t * 0.6) * 0.8); yarasa.root.rotation.y = t * 0.6 + PI / 2; }
    });
    golge(g, false, false);
    return g;
  }

  function dunyaHala(p) {   // dev ev: kareli örtü, dev fincan/çatal/un torbası/çilek, uzakta dev pasta; minicik Feza, Bilbo ve Aytuğ Hala
    var gok = tuvalDoku(256, 512, function (c, w, h) {
      var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd6e6'); gr.addColorStop(1, '#ffeaf2'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (var y = 10, r = 0; y < h; y += 34, r++) for (var x = (r % 2) * 17 + 6; x < w; x += 34) { c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
      c.fillStyle = '#e9b48a'; c.fillRect(0, h * 0.72, w, h * 0.06);   // dev pencere pervazı/raf çizgisi
    });
    var ort = tuvalDoku(256, 256, function (c, w, h) {
      for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#ffffff' : '#ef5a6a'; c.fillRect(i * 32, j * 32, 32, 32); }
      c.fillStyle = 'rgba(239,90,106,0.35)'; for (i = 0; i < 8; i++) { c.fillRect(i * 32, 0, 32, h); }
    }, [3, 3]);
    var g = bolme(p, gok, std({ map: ort, roughness: 0.9 })), D = -p.derin;
    // dev pasta (uzakta)
    var pas = new THREE.Group(); pas.position.set(0.15, 0, D + 1.0); g.add(pas);
    var katlar = [[1.0, 0.7, 0xff9cc2], [0.78, 0.6, 0x9b5b3a], [0.56, 0.5, 0xffd6e6]], y = 0;
    katlar.forEach(function (k) {
      mesh(new THREE.CylinderGeometry(k[0], k[0], k[1], 40), std({ color: k[2], roughness: 0.45 }), [0, y + k[1] / 2, 0], null, null, pas);
      mesh(new THREE.TorusGeometry(k[0], 0.07, 10, 40), std({ color: 0xfffaf2, roughness: 0.3 }), [0, y + k[1], 0], null, [PI / 2, 0, 0], pas);
      for (var d = 0; d < 10; d++) { var a = d / 10 * 2 * PI; mesh(new THREE.CapsuleGeometry(0.05, 0.12 + (d % 3) * 0.06, 3, 8), std({ color: 0xfffaf2, roughness: 0.3 }), [Math.cos(a) * k[0], y + k[1] - 0.1, Math.sin(a) * k[0]], null, null, pas); }
      y += k[1];
    });
    var alev = [];
    for (var i = 0; i < 5; i++) {
      var a = i / 5 * 2 * PI, mx = Math.cos(a) * 0.32, mz = Math.sin(a) * 0.32;
      mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 10), std({ color: i % 2 ? 0x8fd0ff : 0xffe27a, roughness: 0.4 }), [mx, y + 0.19, mz], null, null, pas);
      alev.push(mesh(new THREE.SphereGeometry(0.06, 10, 8), parlak(0xffc04a, 3.6), [mx, y + 0.45, mz], [0.8, 1.5, 0.8], null, pas));
    }
    mesh(new THREE.SphereGeometry(0.12, 16, 12), std({ color: 0xe8283f, roughness: 0.15 }), [0, y + 0.12, 0], null, null, pas);
    hale(0xffc860, 1.4, [0, y + 0.5, 0], pas, 0.8);
    // dev fincan
    var fn = new THREE.Group(); fn.position.set(-1.0, 0, -1.6); g.add(fn);
    var prof = [[0, 0], [0.42, 0], [0.5, 0.08], [0.58, 0.55], [0.62, 0.9], [0.58, 0.9], [0.54, 0.55], [0.46, 0.12], [0, 0.12]].map(function (q) { return new THREE.Vector2(q[0], q[1]); });
    mesh(new THREE.LatheGeometry(prof, 36), std({ color: 0xffffff, roughness: 0.18 }), null, null, null, fn);
    mesh(new THREE.CylinderGeometry(0.61, 0.61, 0.12, 36, 1, true), std({ color: 0x6ac8d8, roughness: 0.3, side: THREE.DoubleSide }), [0, 0.65, 0], null, null, fn);
    mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 24, PI * 1.3), std({ color: 0xffffff, roughness: 0.18 }), [0.62, 0.5, 0], null, [0, 0, -PI * 0.65], fn);
    mesh(new THREE.CircleGeometry(0.55, 32), std({ color: 0x8a5030, roughness: 0.15 }), [0, 0.8, 0], null, [-PI / 2, 0, 0], fn);
    mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.06, 40), std({ color: 0xffffff, roughness: 0.2 }), [0, 0.03, 0], null, null, fn);
    // dev çatal (yatık)
    var ct = new THREE.Group(); ct.position.set(0.95, 0.04, -2.35); ct.rotation.y = -0.6; g.add(ct);
    var gm = std({ color: 0xd8dee8, metalness: 0.9, roughness: 0.18 });
    mesh(new THREE.BoxGeometry(0.16, 0.05, 1.6), gm, [0, 0, 0.6], null, null, ct);
    mesh(new THREE.BoxGeometry(0.4, 0.05, 0.3), gm, [0, 0, -0.32], null, null, ct);
    for (i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.06, 0.05, 0.55), gm, [-0.15 + i * 0.1, 0, -0.72], null, null, ct);
    // un torbası + dev çilek + yumurta
    var un = mesh(G.rbox(3), TX('fabric', 1, 1, { color: 0xf3e6c8 }), [1.0, 0.45, -1.35], [0.62, 0.9, 0.5], [0, -0.3, 0], g);
    mesh(new THREE.ConeGeometry(0.2, 0.25, 12), std({ color: 0xf3e6c8, roughness: 0.9 }), [1.0, 1.0, -1.35], null, null, g);
    mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 16), std({ color: 0xc0504a }), [1.0, 0.92, -1.35], null, [PI / 2, 0, 0], g);
    var cil = mesh(new THREE.SphereGeometry(0.35, 24, 18), std({ color: 0xff3a4a, roughness: 0.25 }), [-0.3, 0.33, -2.7], [1, 1.15, 1], [PI, 0, 0.2], g);
    mesh(new THREE.ConeGeometry(0.22, 0.1, 6), std({ color: 0x4caf50 }), [-0.3, 0.7, -2.7], null, null, g);
    mesh(new THREE.SphereGeometry(0.26, 24, 18), std({ color: 0xfff4e0, roughness: 0.4 }), [-1.2, 0.3, -2.9], [0.85, 1.15, 0.85], null, g);
    // minicik kahramanlar
    var mini = [];
    try {
      var F2 = FEZA.create(); F2.root.scale.multiplyScalar(0.5); F2.root.position.set(-0.15, 0, -0.7); F2.root.rotation.y = 0.35; g.add(F2.root); golge(F2.root, true, false); mini.push(['f', F2]);
    } catch (e) { console.warn('mini feza', e); }
    try {
      var B2 = BILBO.create(); B2.root.scale.multiplyScalar(0.5); B2.root.position.set(0.45, 0, -0.75); B2.root.rotation.y = -0.4; g.add(B2.root); golge(B2.root, true, false); mini.push(['b', B2]);
    } catch (e) { console.warn('mini bilbo', e); }
    var hala = null;
    try {
      if (typeof HALA !== 'undefined' && HALA.create) {
        var hg = new THREE.Group(); hg.position.set(-0.7, 0, -1.1); hg.scale.setScalar(0.5); g.add(hg);
        hala = HALA.create(hg); golge(hala, true, false);
        hala.userData.ctx = halaCtx();
      }
    } catch (e) { console.warn('hala', e); hala = null; }
    anims.push(function (dt, t) {
      for (var k = 0; k < alev.length; k++) alev[k].scale.set(0.8, 1.4 + 0.3 * Math.sin(t * 12 + k * 1.7), 0.8);
      for (k = 0; k < mini.length; k++) {
        var m = mini[k];
        if (m[0] === 'f') { m[1].update(dt, { move: 0, attack: -1, cast: -1, hurt: 0, dead: false, cheer: (t % 6) < 1.6, idleT: t }); }
        else m[1].update(dt, { speed: 0, happy: 1, sit: 1, bark: 0 });
      }
      if (hala) {
        try {
          var c = hala.userData.ctx; c.dt = dt; c.t = t; HALA.update(dt, c);
          hala.position.set(0, 0, 0);
        } catch (e) { hala = null; }
      }
    });
    golge(g, false, false);
    return g;
  }
  function halaCtx() {   // Hala'yı sahnede tutmak için küçük, oyunsuz bir bağlam (yerinde durur, Feza'ya bakar, el sallar)
    var P = { pos: V(1.2, 0, 0.8), face: 0, hp: 100, maxHp: 100, dead: false };
    var no = function () {}, api = { isFloor: function () { return true; }, circleFree: function () { return true; }, los: function () { return true; },
      moveXZ: no, routeTo: function () { return null; }, say: no, hasLine: function () { return false; }, sfx: no, burst: no, fx: no, heal: no,
      enemiesNear: function () { return []; }, nearestEnemy: function () { return null; }, damage: no, heroDamage: no, spawnProjectile: no,
      revive: no, shield: no, emit: no };
    return { P: P, H: null, L: { rooms: [], path: [] }, enemies: [], boss: null, Bilbo: null, state: 'title', dt: 0, t: 0, dead: false, title: true, api: api };
  }

  // ---------- Feza ve Bilbo ----------
  var H = null, B = null, FST = { move: 0, attack: -1, swingDir: 1, cast: -1, spin: false, hurt: 0, dead: false, cheer: false, idleT: 0 };
  var BST = { speed: 0, happy: 1, sit: 1, bark: 0, sniff: false };
  var ON_Z = innerHeight > innerWidth * 1.05 ? 2.2 : 0;   // dikey ekranda Feza, Bilbo ve oyuncaklar kameraya biraz yaklaşır
  var FEZA_EV = V(-0.6, 0, 1.75 + ON_Z), BILBO_EV = V(0.8, 0, 1.85 + ON_Z);
  var fz = { p: FEZA_EV.clone(), yon: 0.15, el: 0, elT: 1.2, sevinc: 0, hedef: null, hiz: 0 };
  var bb = { p: BILBO_EV.clone(), yon: -0.25, durum: 'otur', sure: 10, hedef: null, hiz: 0, hav: 0 };
  var top = null, topV = V();
  function karakterler() {
    H = FEZA.create(); scene.add(H.root); golge(H.root, true, false);
    H.root.position.copy(fz.p); H.root.rotation.y = fz.yon;
    B = BILBO.create(); scene.add(B.root); golge(B.root, true, false);
    B.root.position.copy(bb.p); B.root.rotation.y = bb.yon;
    // dokunma vekilleri (görünmez)
    var fm = mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.5, 8), new THREE.MeshBasicMaterial({ visible: false }), [0, 0.75, 0], null, null, H.root); fm.userData.kim = 'feza'; vurulabilir.push(fm);
    var bm = mesh(new THREE.BoxGeometry(0.8, 1.0, 1.2), new THREE.MeshBasicMaterial({ visible: false }), [0, 0.5, 0], null, null, B.root); bm.userData.kim = 'bilbo'; vurulabilir.push(bm);
  }
  function yonaDon(cur, hedef, k, dt) { return dampAngle(cur, hedef, k, dt); }
  function fezaGuncelle(dt, t) {
    FST.idleT += dt; FST.move = 0; FST.cheer = fz.sevinc > 0;
    if (fz.sevinc > 0) fz.sevinc -= dt;
    if (fz.hedef) {   // koş
      var dx = fz.hedef.x - fz.p.x, dz = fz.hedef.z - fz.p.z, d = Math.hypot(dx, dz);
      fz.hiz = Math.min(4.2, fz.hiz + dt * 9);
      if (d > 0.05) { var s = Math.min(d, fz.hiz * dt); fz.p.x += dx / d * s; fz.p.z += dz / d * s; fz.yon = yonaDon(fz.yon, Math.atan2(dx, dz), 12, dt); }
      FST.move = Math.min(1, fz.hiz / 4.2); FST.idleT = 0;
    } else {
      fz.yon = yonaDon(fz.yon, 0.15 + Math.sin(t * 0.3) * 0.12, 3, dt);
    }
    H.root.position.copy(fz.p); H.root.rotation.y = fz.yon;
    H.update(dt, FST);
    // el sallama (kemik pozunun üstüne): ara ara ve dokununca
    fz.elT -= dt;
    if (!fz.hedef && fz.elT <= 0 && fz.el <= 0) { fz.el = 2.6; fz.elT = 7 + Math.random() * 4; }
    if (fz.el > 0) {
      fz.el -= dt;
      var w = Math.min(1, Math.min(fz.el, 2.6 - fz.el) * 4), Bn = H.bones;
      if (Bn && Bn.armR) {
        var D = [-2.9, 0, 0.3, 0];
        Bn.armR.rotation.z = lerp(Bn.armR.rotation.z, D[0], w);
        Bn.armR.rotation.x = lerp(Bn.armR.rotation.x, D[1], w);
        Bn.armR.rotation.y = lerp(Bn.armR.rotation.y, D[3], w);
        Bn.foreR.rotation.z = lerp(Bn.foreR.rotation.z, D[2] + Math.sin(t * 10) * 0.4, w);
        Bn.head.rotation.z += 0.08 * w * Math.sin(t * 2);
      }
    }
  }
  function bilboGuncelle(dt, t) {
    bb.sure -= dt; if (bb.hav > 0) bb.hav = Math.max(0, bb.hav - dt);
    var hiz = 0;
    if (bb.durum === 'git' || bb.durum === 'koklaGit' || bb.durum === 'topaKos' || bb.durum === 'don' || bb.durum === 'portal') {
      var h = bb.hedef, dx = h.x - bb.p.x, dz = h.z - bb.p.z, d = Math.hypot(dx, dz);
      var vmax = bb.durum === 'topaKos' || bb.durum === 'portal' ? 4.4 : 1.4;
      bb.hiz = Math.min(vmax, bb.hiz + dt * 6);
      if (d > 0.12) { var s = Math.min(d, bb.hiz * dt); bb.p.x += dx / d * s; bb.p.z += dz / d * s; bb.yon = yonaDon(bb.yon, Math.atan2(dx, dz), 8, dt); hiz = bb.hiz; }
      else if (bb.durum !== 'portal') {
        bb.hiz = 0;
        if (bb.durum === 'koklaGit') { bb.durum = 'kokla'; bb.sure = 1.8; }
        else if (bb.durum === 'topaKos') { topV.set(Math.sin(bb.yon) * 2.2, 0, Math.cos(bb.yon) * 2.2); bb.durum = 'don'; bb.hedef = BILBO_EV; }
        else { bb.durum = 'otur'; bb.sure = 9 + Math.random() * 6; }
      }
    } else {
      bb.yon = yonaDon(bb.yon, bb.durum === 'otur' ? -0.25 : bb.yon, 3, dt);
      if (bb.sure <= 0) {
        if (bb.durum === 'kokla') { bb.durum = 'don'; bb.hedef = BILBO_EV; }
        else if (top && Math.random() < 0.55) { bb.durum = 'topaKos'; bb.hedef = top.position; }
        else { bb.durum = 'koklaGit'; var a = Math.random() * 2 * PI; bb.hedef = V(BILBO_EV.x + 0.35 + Math.cos(a) * 0.45, 0, BILBO_EV.z - 0.45 + Math.sin(a) * 0.25); }
      }
    }
    BST.speed = hiz; BST.sit = bb.durum === 'otur' ? 1 : 0; BST.sniff = bb.durum === 'kokla'; BST.happy = 1; BST.bark = bb.hav;
    B.root.position.copy(bb.p); B.root.rotation.y = bb.yon;
    B.update(dt, BST);
  }
  function topGuncelle(dt) {   // ormandan getirilen top: Bilbo itince yuvarlanır
    if (!top) return;
    top.position.x += topV.x * dt; top.position.z += topV.z * dt;
    topV.multiplyScalar(Math.exp(-1.6 * dt));
    if (Math.abs(top.position.x) > 3.5) { top.position.x = Math.sign(top.position.x) * 3.5; topV.x *= -0.6; }
    if (top.position.z < 0.2 + ON_Z || top.position.z > 3.0 + ON_Z) { top.position.z = clamp(top.position.z, 0.2 + ON_Z, 3.0 + ON_Z); topV.z *= -0.6; }
    var v = Math.hypot(topV.x, topV.z); top.rotation.x += topV.z * dt / 0.16; top.rotation.z -= topV.x * dt / 0.16;
    if (v < 0.01) topV.set(0, 0, 0);
  }

  // ---------- hatıralar (biten maceralardan) ----------
  var hatiraNesne = [];
  function hatiralar() {
    // küçük dolap: mum ve hayal baloncuğu bunun üstünde
    var d = new THREE.Group(); d.position.set(-4.5, 0, -0.9); d.rotation.y = 0.45; scene.add(d);
    var ah = TX('wood', 1, 1, { color: 0xe8b27a });
    mesh(G.rbox(2), ah, [0, 0.45, 0], [1.3, 0.9, 0.6], null, d);
    mesh(new THREE.BoxGeometry(1.45, 0.07, 0.7), TX('wood', 1, 1, { color: 0xc98a52 }), [0, 0.93, 0], null, null, d);
    [-0.3, 0.3].forEach(function (x) { mesh(new THREE.SphereGeometry(0.04, 10, 8), std({ color: 0xffd34d, metalness: 0.7, roughness: 0.3 }), [x, 0.6, 0.31], null, null, d); });
    golge(d, true, true);
    if (bitti('hala')) {
      var m = new THREE.Group(); m.position.set(0.3, 0.97, 0); d.add(m);
      mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24), std({ color: 0xffe9f2, roughness: 0.3 }), [0, 0.015, 0], null, null, m);
      mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 24, 1, false, 0, PI * 1.5), std({ color: 0xff9cc2, roughness: 0.5 }), [0, 0.1, 0], null, null, m);
      var cizgili = tuvalDoku(64, 64, function (c) { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#ff6fa0'; c.lineWidth = 9; for (var i = -64; i < 128; i += 22) { c.beginPath(); c.moveTo(i, 64); c.lineTo(i + 40, 0); c.stroke(); } }, [1, 2]);
      mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 12), std({ map: cizgili, roughness: 0.5 }), [0, 0.3, 0], null, null, m);
      var al = mesh(new THREE.SphereGeometry(0.035, 10, 8), parlak(0xffc04a, 3.8), [0, 0.47, 0], [0.8, 1.6, 0.8], null, m);
      hale(0xffc860, 0.7, [0, 0.47, 0], m, 1.0);
      golge(m, true, false);
      anims.push(function (dt, t) { al.scale.set(0.8, 1.5 + 0.3 * Math.sin(t * 13), 0.8); });
      hatiraNesne.push(m);
    }
    if (bitti('huysuz')) {
      var bal = mesh(new THREE.SphereGeometry(0.28, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.32, iridescence: 1, iridescenceIOR: 1.3, envMapIntensity: 2, depthWrite: false }), [0, 0, 0], null, null, scene);
      var yz = yildiz3(0.09, 0xffd23f, 0.6); bal.add(yz);
      anims.push(function (dt, t) { bal.position.set(-4.4 + Math.sin(t * 0.7) * 0.15, 1.75 + Math.sin(t * 1.3) * 0.12, -0.8); yz.rotation.y = t; });
      hatiraNesne.push(bal);
    }
    if (bitti('orman')) {
      top = topModel(0.16); top.position.set(1.7, 0.16, 2.3 + ON_Z); scene.add(top);
      var tw = new THREE.Group(); scene.add(tw);
      anims.push(function () { top.position.y = 0.16; });
      hatiraNesne.push(top);
    }
    // beliriş: büyüyerek çıkar
    hatiraNesne.forEach(function (o) { o.userData.s = o.scale.x; o.scale.setScalar(0.001); });
  }

  // ---------- kamera ----------
  var kam = { x: 0, y: 4.4, z: 10.6, hx: 0, hy: 1.72, hz: -1.0, fov: 38, imx: 0, imy: 0 }, gecis = null;
  function kameraAyarla(t, dt) {
    var asp = innerWidth / innerHeight;
    // yatay görüş en az ~50°: dikey ekranda da üç portal sığsın
    var hf = 53 * PI / 180, vf = 2 * Math.atan(Math.tan(hf / 2) / asp) * 180 / PI;
    var fov = Math.max(38, vf), dik = asp < 1;
    var bx = Math.sin(t * 0.17) * 0.45 + kam.imx * 0.5, by = Math.sin(t * 0.23) * 0.12 - kam.imy * 0.25;
    if (IKON) { camera.position.set(0.1, 1.2, FEZA_EV.z + 3.9); camera.lookAt(0.08, 0.86, FEZA_EV.z - 0.2); bb.sure = 99; fz.elT = 99; if (camera.fov !== 36) { camera.fov = 36; camera.updateProjectionMatrix(); } return; }
    var px = bx, py = kam.y + by + (dik ? 0.4 : 0), pz = kam.z + (dik ? -0.3 : 0) + Math.sin(t * 0.13) * 0.25;
    var hx = bx * 0.2, hy = kam.hy + (dik ? 0.25 : 0), hz = kam.hz;
    if (gecis) {   // seçilen portala doğru yaklaş
      var p = PORTAL[gecis.i], u = smooth01((t - gecis.t0 - 0.35) / (gecis.sure - 0.35));
      px = lerp(px, p.x, u); py = lerp(py, p.h * 0.5, u); pz = lerp(pz, DUVAR_Z + 1.2, u);
      hx = lerp(hx, p.x, u); hy = lerp(hy, p.h * 0.5, u); hz = lerp(hz, DUVAR_Z - 3, u);
      fov = lerp(fov, fov * 0.9, u);
    }
    camera.position.set(px, py, pz); camera.lookAt(hx, hy, hz);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  // ---------- ses (Emel + Bilbo havlaması); ?sessiz → hiç ses yok ----------
  var SES = (function () {
    var ctx = null, tampon = {}, simdiki = null, bekleyen = null, AC = window.AudioContext || window.webkitAudioContext;
    function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
    function coz(ad, veri) {
      if (!veri || tampon[ad]) return; tampon[ad] = 'bekle';
      try { ctx.decodeAudioData(b64(veri), function (b) { tampon[ad] = b; if (bekleyen === ad) { bekleyen = null; cal(ad); } }, function () { tampon[ad] = null; }); } catch (e) { tampon[ad] = null; }
    }
    function ac() {
      if (SESSIZ || !AC) return false;
      if (!ctx) {
        try { ctx = new AC(); } catch (e) { return false; }
        var S = window.EV_SES || {}; for (var k in S) coz(k, S[k]);
        coz('hav', window.BILBO_BARK_MP3);
      }
      if (ctx.state === 'suspended') ctx.resume();
      try { var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
      return true;
    }
    function cal(ad, ses) {
      if (!ctx) return; var b = tampon[ad];
      if (b === 'bekle') { bekleyen = ad; return; }
      if (!b) return;
      if (ad !== 'hav' && simdiki) { try { simdiki.stop(); } catch (e) {} simdiki = null; }
      var s = ctx.createBufferSource(), gn = ctx.createGain(); gn.gain.value = ses || 1;
      s.buffer = b; s.connect(gn); gn.connect(ctx.destination); s.start(0); if (ad !== 'hav') simdiki = s;
    }
    function cin() {
      if (!ctx) return; var n = ctx.currentTime, notes = [784, 988, 1175, 1568, 1976];
      for (var i = 0; i < notes.length; i++) {
        var o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'sine'; o.frequency.value = notes[i];
        gg.gain.setValueAtTime(0.0001, n + i * 0.07); gg.gain.exponentialRampToValueAtTime(0.12, n + i * 0.07 + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, n + i * 0.07 + 0.6);
        o.connect(gg); gg.connect(ctx.destination); o.start(n + i * 0.07); o.stop(n + i * 0.07 + 0.65);
      }
    }
    return { ac: ac, cal: cal, cin: cin, calisiyor: function () { return !!ctx; } };
  })();

  // ---------- dokunma ----------
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ilk = true, sonDokunus = 0, simdi = 0, sesliBos = false, flas = null;
  function kimde(x, y) {
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    var h = ray.intersectObjects(vurulabilir, false);
    if (!h.length) return null;
    var u = h[0].object.userData; return u.kapi !== undefined ? 'k' + u.kapi : u.kim;
  }
  function kapiyaGit(i) {
    if (gecis) return;
    var p = PORTAL[i], sure = 2.5;
    if (SES.calisiyor()) { SES.cal(p.id); SES.cin(); }
    gecis = { i: i, t0: simdi, sure: sure };
    fz.hedef = V(p.x, 0, DUVAR_Z - 1.2); fz.el = 0; fz.hiz = 1.5;
    bb.durum = 'portal'; bb.hedef = V(p.x + 0.5, 0, DUVAR_Z - 1.0); bb.hiz = 2;
    portallar[i].vurgu = 1;
    var lg = document.getElementById('logo');
    if (lg) { lg.style.animation = 'none'; lg.style.transform = 'translate(-50%, 0)'; lg.style.transition = 'opacity 0.5s'; lg.style.opacity = '0'; }
    setTimeout(function () { location.href = p.yol + Qs; }, sure * 1000);
  }
  function selamla() {
    if (!SES.calisiyor()) return;
    var hepsi = bitti('orman') && bitti('hala') && bitti('huysuz'), kut = false;
    try { kut = localStorage.getItem('fezaBilboKutlandi') === '1'; } catch (e) {}
    if (hepsi && !kut) { SES.cal('hepsi'); try { localStorage.setItem('fezaBilboKutlandi', '1'); } catch (e) {} }
    else SES.cal(TAMAM.length ? 'tekrar' : 'giris');
  }
  function dokun(e) {
    e.preventDefault();
    var acildi = SES.ac(), h = kimde(e.clientX, e.clientY);
    sonDokunus = simdi; sesliBos = false;
    if (gecis) return;
    if (h && h.charAt(0) === 'k') { ilk = false; kapiyaGit(+h.charAt(1)); return; }
    if (h === 'bilbo') { bb.hav = 1.3; SES.cal('hav', 0.8); if (bb.durum === 'kokla' || bb.durum === 'otur') { bb.durum = 'otur'; bb.sure = 3; } }
    else if (h === 'feza') { fz.sevinc = 1.4; if (!ilk) SES.cal('feza'); }
    if (ilk && acildi) { ilk = false; selamla(); }
  }
  function imlec(e) { kam.imx = (e.clientX / innerWidth - 0.5) * 2; kam.imy = (e.clientY / innerHeight - 0.5) * 2; }

  // ---------- döngü ----------
  var once = 0, basla = 0;
  function kare(ms) {
    requestAnimationFrame(kare);
    var t = ms / 1000, dt = Math.min(0.05, t - (once || t)); once = t; simdi = t;
    if (!basla) { basla = t; sonDokunus = t; }
    TIME.t = t; TIME.dt = dt; TIME.u.value = t;
    for (var i = 0; i < anims.length; i++) anims[i](dt, t);
    fezaGuncelle(dt, t); bilboGuncelle(dt, t); topGuncelle(dt);
    if (temas.length) { temas[0].position.set(fz.p.x, 0.04, fz.p.z); temas[1].position.set(bb.p.x, 0.04, bb.p.z); }
    // portallar: zar dalgası, parıltılar, yardım vurgusu (bir süre dokunulmazsa sırayla parlar)
    var bos = t - sonDokunus, sira = bos > 7 && !gecis ? Math.floor((bos - 7) / 1.6) % 3 : -1;
    for (i = 0; i < portallar.length; i++) {
      var o = portallar[i], p = o.p;
      o.vurgu = gecis && gecis.i === i ? Math.min(1, o.vurgu + dt * 1.5) : damp(o.vurgu, sira === i ? 1 : 0, 4, dt);
      o.zarMat.uniforms.t.value = t; o.zarMat.uniforms.k.value = 0.1 + o.vurgu * 0.6 + (o.tamam ? 0.08 : 0);
      var pa = o.pts.geometry.attributes.position, r = p.w / 2;
      for (var k = 0; k < o.ph.length; k++) {
        var u = (o.ph[k] + t * 0.05 * (k % 2 ? 1 : -0.7)) % 1; if (u < 0) u += 1;
        var L = (p.h - r) * 2 + PI * r, s = u * L, x, y;
        if (s < p.h - r) { x = -r; y = s; } else if (s < p.h - r + PI * r) { var a = PI - (s - (p.h - r)) / r; x = Math.cos(a) * r; y = p.h - r + Math.sin(a) * r; } else { x = r; y = L - s; }
        var j = 0.12 * Math.sin(t * 2 + k * 7);
        pa.setXYZ(k, x * (1 + j * 0.3) , y + Math.sin(t * 3 + k) * 0.05, Math.sin(t + k) * 0.08);
      }
      pa.needsUpdate = true;
      if (o.hale) o.hale.material.opacity = 0.55 + 0.3 * Math.sin(t * 2.5 + i);
    }
    // hatıralar beliriyor
    var gor = clamp((t - basla - 0.8) / 0.9, 0, 1), ss = gor < 1 ? Math.sin(gor * PI * 0.5) * (1 + Math.sin(gor * PI) * 0.25) : 1;
    for (i = 0; i < hatiraNesne.length; i++) hatiraNesne[i].scale.setScalar(Math.max(0.001, hatiraNesne[i].userData.s * ss));
    if (!sesliBos && !gecis && !ilk && bos > 14) { sesliBos = true; SES.cal('secin'); }
    kameraAyarla(t, dt);
    if (gecis) {
      var gp = clamp((t - gecis.t0 - (gecis.sure - 0.9)) / 0.8, 0, 1);
      flas.style.opacity = gp; POST.exposure = 1.06 + gp * 0.8;
    }
    renderFrame();
  }

  // ---------- başlat ----------
  function baslat() {
    try { TEX.init(); } catch (e) { console.warn('TEX', e); }
    odaKur();
    PORTAL.forEach(portalKur);
    dunyaOrman(PORTAL[0]); dunyaHuysuz(PORTAL[1]); dunyaHala(PORTAL[2]);
    karakterler();
    hatiralar();
    dekor();
    flas = document.getElementById('flas');
    var cv = renderer.domElement;
    cv.addEventListener('pointerdown', dokun);
    cv.addEventListener('pointermove', imlec);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('keydown', function (e) { var i = '123'.indexOf(e.key); if (i >= 0) { SES.ac(); kapiyaGit(i); } });
    window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });
    kameraAyarla(0, 0);
    try { renderer.compile(scene, camera); } catch (e) {}
    requestAnimationFrame(kare);
    var yuk = document.getElementById('yukleniyor');
    if (yuk) setTimeout(function () { yuk.style.opacity = 0; setTimeout(function () { yuk.remove(); }, 600); }, 150);
    window.__ev = {
      kapiyaGit: kapiyaGit, tamam: TAMAM, mod: '3d', salla: function () { fz.el = 2.6; },
      ekran: function () {   // test: portal / Feza / Bilbo ekran noktaları
        var o = { kapilar: PORTAL.map(function (p) { return toScreen(V(p.x, p.h * 0.5, DUVAR_Z)); }) };
        o.feza = toScreen(V(fz.p.x, 0.8, fz.p.z)); o.bilbo = toScreen(V(bb.p.x, 0.5, bb.p.z)); o.sira = PORTAL.map(function (p) { return p.id; });
        return o;
      }
    };
  }
  window.EV3D = baslat;
})();
