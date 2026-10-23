/* ── Hikâye: Aytuğ Hala'nın sürpriz pastası ──
   Başlık sahnesi (normal boy mutfak), giriş sinematiği (hapşırık → minicik olduk → şekerler dağıldı), oda/alan anlatımları,
   malzeme kutlaması, kayıp eşya sevinci, Pasta Krallığı açılışı ve final (büyü çözülür, mumlar, üfleme, jenerik).
   Anlatıcı Aytuğ Hala (ilk ağızdan); cümleler src/02l_hikaye.js (+ gen_voice.py → sesler.js).
   07_game / 06_level / 09_ui şu kancaları çağırır (src/SPEC.md › "Dev Ev API" › STORY):
     intro, zone, area, ingredient, lostItem, locked, station, ending, buildTitle,
     titleTick(dt) (başlıkta karakterleri bu dosya oynatır), ownsWorld(dt) (final sahnesinde dünya durur),
     camera(dt) (sinematik kamera; 09_ui her kare çağırır), playIntro() (UI "Oyna" sonrası, Promise), busy(), logo(el).
   Aytuğ Hala'nın modeli için isteğe bağlı kanca: HALA.pose(dt, {x, y, z, face, scale, act, t}) — act: 'idle' | 'serp' (şeker serpme) |
     'yuru' | 'saskin' | 'isaret' | 'alkis' | 'dans' | 'saril' | 'mum'. Yoksa yer tutucu modeli burada konumlanır.
   Genel ad: STORY. 09_ui'den önce yüklenir. */
const STORY = (() => {
  'use strict';
  const MALZEME = { un: 'Un', yumurta: 'Yumurta', cilek: 'Çilek', krema: 'Krema' };
  const KAYIP = { gozluk: 'Gözlük', anahtar: 'Anahtar', toka: 'Toka' };
  const G_ = () => (typeof GAME !== 'undefined' ? GAME : null);
  const A_ = () => (typeof AUD !== 'undefined' ? AUD : null);
  const H_ = () => (typeof HALA !== 'undefined' ? HALA : null);
  const toast = text => { const g = G_(); if (g && g.emit) g.emit('toast', { text }); };
  const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const pick = a => a[Math.floor(Math.random() * a.length)];

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
  function sfx(name, o) { const A = A_(); if (A && A.sfx) { try { A.sfx(name, o || {}); } catch (e) { /* ignore */ } } }
  function burst(kind, x, y, z, o) { if (typeof FX !== 'undefined' && FX.burst) { try { FX.burst(kind, x, y, z, o || {}); } catch (e) { /* ignore */ } } }
  function shake(a, d) { if (typeof FX !== 'undefined' && FX.shake) { try { FX.shake(a, d); } catch (e) { /* ignore */ } } }

  // ───────────────────────── Geometri yardımcıları ─────────────────────────
  const GEO = {};
  function rbox(w, h, d, r = 0.04, seg = 3) {   // gerçek ölçülü, kenarları yuvarlatılmış kutu (yarıçap metre)
    const k = `rb${w}_${h}_${d}_${r}_${seg}`;
    if (GEO[k]) return GEO[k];
    const g = new THREE.BoxGeometry(w, h, d, seg * 2 + 1, seg * 2 + 1, seg * 2 + 1);
    const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3(), dd = new THREE.Vector3();
    r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(clamp(v.x, -w / 2 + r, w / 2 - r), clamp(v.y, -h / 2 + r, h / 2 - r), clamp(v.z, -d / 2 + r, d / 2 - r));
      dd.copy(v).sub(c);
      if (dd.lengthSq() > 1e-10) { dd.normalize(); v.copy(c).addScaledVector(dd, r); p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, dd.x, dd.y, dd.z); }
    }
    return (GEO[k] = g);
  }
  function lathe(key, pts, seg = 32) {
    if (GEO[key]) return GEO[key];
    return (GEO[key] = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg));
  }
  const SPH = () => GEO.sph || (GEO.sph = new THREE.SphereGeometry(1, 24, 16));
  const SPHL = () => GEO.sphl || (GEO.sphl = new THREE.SphereGeometry(1, 12, 8));
  const CYL = (seg = 24) => GEO['cy' + seg] || (GEO['cy' + seg] = new THREE.CylinderGeometry(1, 1, 1, seg));
  const TOR = (arc = TAU, tube = 0.2) => { const k = 'to' + arc.toFixed(3) + tube; return GEO[k] || (GEO[k] = new THREE.TorusGeometry(1, tube, 10, 28, arc)); };
  const CONE = () => GEO.cone || (GEO.cone = new THREE.ConeGeometry(1, 1, 20));
  function canvasTex(w, h, draw, rep) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = typeof ANISO !== 'undefined' ? ANISO : 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  const C = h => new THREE.Color(h);
  // ince kumaş/doku hissi: konuma bağlı küçük ton oynaması (renk işlevi Kit'e)
  const tone = (hex, amt = 0.04, f = 9) => { const c = C(hex), o = new THREE.Color(); return (x, y, z) => { const n = Math.sin(x * f * 1.3 + y * f * 0.7) * Math.sin(z * f * 1.1 - y * f * 0.5); return o.copy(c).multiplyScalar(1 + n * amt); }; };
  const gingham = (a, b, p = 0.07) => { const A = C(a), B = C(b), M = C(a).lerp(C(b), 0.5), o = new THREE.Color(); return (x, y, z) => { const u = Math.floor((x + z) / p) & 1, v = Math.floor(y / p) & 1; return o.copy(u && v ? B : u || v ? M : A); }; };

  // ───────────────────────── Mutfak seti (normal boy) ─────────────────────────
  // Yerel koordinat: zemin y=0, +z kameraya doğru. Feza ≈ 1,45 m. Ada tezgâhı üstü y = 1,15.
  const ISLAND_Y = 1.15;
  const HALA_STEP = 0.16;   // adanın arkasında Aytuğ Hala görünür olsun diye minik bir basamakta durur (ayakları görünmez)
  const SPOT = {
    cake: [-0.55, ISLAND_Y, -0.85], jar: [0.38, ISLAND_Y, -0.72], hala: [-0.35, -1.8], bag: [-2.3, 0.3],
    bilbo: [-1.5, 0.39], feza: [3.3, -3.42], door: [3.4, -3.2],
    group: { feza: [0.42, 0.78], hala: [-0.5, 0.52], bilbo: [1.12, 0.92] },   // sinematikte bir araya geldikleri yer
  };
  function buildKitchen(o = {}) {
    const g = new THREE.Group(); g.name = 'hikayeMutfak';
    const own = [];   // bu sete ait malzeme/doku (disposeTree halleder)
    const matte = vcMat({ roughness: 0.78 }), gloss = vcMat({ roughness: 0.28 }), satin = vcMat({ roughness: 0.5 });
    own.push(matte, gloss, satin);
    const KM = new Kit(), KG = new Kit(), KS = new Kit();
    // zemin: krem / yavruağzı dama karo, derz çizgili
    const floorTex = canvasTex(512, 512, (x, w, h) => {
      const n = 4, s = w / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const a = (i + j) & 1;
        const gr = x.createLinearGradient(i * s, j * s, (i + 1) * s, (j + 1) * s);
        gr.addColorStop(0, a ? '#efb999' : '#fbf1de'); gr.addColorStop(1, a ? '#e6a988' : '#f3e6cc');
        x.fillStyle = gr; x.fillRect(i * s, j * s, s, s);
        x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(i * s + 6, j * s + 6, s * 0.5, 4);
      }
      x.strokeStyle = 'rgba(150,110,90,0.55)'; x.lineWidth = 5;
      for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); }
    }, [8, 5]);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.42 });
    own.push(floorTex, floorMat);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.002, 1.8); floor.receiveShadow = true; g.add(floor);
    // fayans (tezgâh arkası): küçük beyaz-mint karolar
    const tileTex = canvasTex(256, 256, (x, w) => {
      const n = 4, s = w / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        x.fillStyle = (i * 3 + j * 5) % 7 === 0 ? '#bfe6d6' : (i + j * 2) % 5 === 0 ? '#ffe1d2' : '#fbfbf6';
        x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
        x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(i * s + 8, j * s + 8, s * 0.35, 5);
      }
    }, [18, 2]);
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    const tileMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.25, color: 0xf0f0ea });
    own.push(tileTex, tileMat);
    const splash = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.8), tileMat);
    splash.position.set(-1.0, ISLAND_Y + 0.42 - 0.02, -3.185); splash.receiveShadow = true; g.add(splash);
    // duvarlar: yumuşak mint, yukarı doğru açılan ton
    const wallCol = (x, y) => C(0xbfe0d2).lerp(C(0xe8f4ea), clamp(y / 4.4, 0, 1) * 0.8);
    KM.add(G.box(), wallCol, [-2.55, 2.2, -3.3], null, [10.9, 4.4, 0.2]);       // sol kısım (kapıya kadar)
    KM.add(G.box(), wallCol, [6.0, 2.2, -3.3], null, [4.2, 4.4, 0.2]);          // sağ kısım
    KM.add(G.box(), wallCol, [3.4, 3.47, -3.3], null, [1.0, 1.86, 0.2]);         // kapı üstü
    KM.add(G.box(), 0xffffff, [-2.55, 0.07, -3.18], null, [10.9, 0.14, 0.06]);  // süpürgelik
    KM.add(G.box(), 0xffffff, [6.0, 0.07, -3.18], null, [4.2, 0.14, 0.06]);
    // kapı ve koridor: sıcak sarı koridor, açık kapı kanadı, beyaz kasa
    KS.add(rbox(0.13, 2.62, 0.26, 0.03), 0xffffff, [2.86, 1.31, -3.2]);
    KS.add(rbox(0.13, 2.62, 0.26, 0.03), 0xffffff, [3.94, 1.31, -3.2]);
    KS.add(rbox(1.21, 0.13, 0.26, 0.03), 0xffffff, [3.4, 2.62, -3.2]);
    KM.add(G.box(), tone(0xf6d58e, 0.03), [3.4, 2.2, -5.4], null, [2.2, 4.4, 0.2]);   // koridor duvarı
    KM.add(G.box(), tone(0xf3cf86, 0.03), [2.45, 2.2, -4.4], null, [0.2, 4.4, 2.0]);
    KM.add(G.box(), tone(0xf3cf86, 0.03), [4.35, 2.2, -4.4], null, [0.2, 4.4, 2.0]);
    KM.add(G.box(), tone(0xb98352, 0.05, 14), [3.4, 0.005, -4.3], null, [2.2, 0.01, 2.2]);   // koridor tahta zemin
    KS.push([3.92, 0, -3.3], [0, 1.25, 0]);   // kapı kanadı (içeri açık)
    KS.add(rbox(0.95, 2.45, 0.06, 0.02), 0xfff8ee, [-0.48, 1.23, 0]);
    KS.add(rbox(0.7, 0.8, 0.02, 0.01), 0xf2e6d4, [-0.48, 1.75, 0.035]); KS.add(rbox(0.7, 0.8, 0.02, 0.01), 0xf2e6d4, [-0.48, 0.75, 0.035]);
    KG.add(SPHL(), 0xe7b84a, [-0.86, 1.1, 0.07], null, 0.04);
    KS.pop();
    KM.add(rbox(0.66, 0.48, 0.04, 0.02), 0xffffff, [3.1, 1.75, -5.28]);           // koridorda Feza'nın resmi
    // ── arka tezgâh ve dolaplar ──
    const CAB = 0x8fbcd8, CAB2 = 0xa6cde3, WOOD = 0xc98f5a, CREAM = 0xf7f1e6, BRASS = 0xe2b55c;
    KS.add(rbox(7.2, 0.98, 0.72, 0.03), CREAM, [-1.0, 0.57, -2.84]);
    KM.add(G.box(), 0x6b5a4f, [-1.0, 0.05, -2.62], null, [7.2, 0.1, 0.5]);     // süpürgelik girintisi
    for (let i = 0; i < 11; i++) {
      const x = -4.3 + i * 0.64;
      KS.add(rbox(0.58, 0.86, 0.04, 0.02), i % 3 === 1 ? CAB2 : CAB, [x, 0.59, -2.46]);
      KS.add(rbox(0.44, 0.7, 0.03, 0.02), i % 3 === 1 ? 0xbad9ea : 0x9fc7de, [x, 0.59, -2.43]);
      KG.add(SPHL(), BRASS, [x + (i & 1 ? -0.2 : 0.2), 0.86, -2.4], null, 0.032);
    }
    KG.add(rbox(7.4, 0.07, 0.86, 0.025), tone(WOOD, 0.06, 12), [-1.0, ISLAND_Y - 0.06, -2.8]);
    // üst dolaplar (sol) ve raf (sağ)
    for (let i = 0; i < 5; i++) {
      const x = -4.3 + i * 0.66;
      KS.add(rbox(0.64, 0.92, 0.4, 0.02), CREAM, [x, 2.62, -3.0]);
      KS.add(rbox(0.56, 0.8, 0.04, 0.02), i & 1 ? CAB2 : CAB, [x, 2.62, -2.79]);
      KG.add(SPHL(), BRASS, [x + 0.2, 2.32, -2.76], null, 0.03);
    }
    KS.add(rbox(3.4, 0.08, 0.46, 0.02), CREAM, [-2.98, 3.12, -2.98]);
    // pencere: beyaz çerçeve, parlak gökyüzü, perdeler, saksı
    const skyTex = canvasTex(64, 128, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd3ff'); gr.addColorStop(0.7, '#dff1ff'); gr.addColorStop(1, '#fff6dc');
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.ellipse(20, 40, 16, 7, 0, 0, TAU); x.ellipse(34, 37, 12, 8, 0, 0, TAU); x.fill();
    });
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, color: new THREE.Color(1.25, 1.25, 1.25) });
    own.push(skyTex, skyMat);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.6), skyMat); sky.position.set(0.6, 2.25, -3.22); g.add(sky);
    KM.add(G.box(), wallCol, [0.6, 2.2, -3.42], null, [2.7, 1.8, 0.05]);   // pencere arkası (dışı gizler)
    KS.add(rbox(2.7, 0.12, 0.3, 0.03), 0xffffff, [0.6, 3.08, -3.2]); KS.add(rbox(2.8, 0.1, 0.36, 0.03), 0xffffff, [0.6, 1.42, -3.12]);
    KS.add(rbox(0.12, 1.7, 0.3, 0.03), 0xffffff, [-0.66, 2.25, -3.2]); KS.add(rbox(0.12, 1.7, 0.3, 0.03), 0xffffff, [1.86, 2.25, -3.2]);
    KS.add(rbox(0.06, 1.6, 0.08, 0.02), 0xffffff, [0.6, 2.25, -3.2]); KS.add(rbox(2.5, 0.06, 0.08, 0.02), 0xffffff, [0.6, 2.3, -3.2]);
    for (const sd of [-1, 1]) {   // pembe kareli perdeler (toplanmış, kurdeleyle bağlı)
      const cx = 0.6 + sd * 1.45;
      for (let k = 0; k < 5; k++) {
        const t = k / 4;
        KM.add(SPH(), gingham(0xffffff, 0xf08aa8, 0.06), [cx + sd * (0.08 - Math.abs(t - 0.45) * 0.14), 3.0 - t * 1.55, -3.05], null, [0.2 - Math.abs(t - 0.45) * 0.12, 0.26, 0.09]);
      }
      KG.add(TOR(TAU, 0.3), 0xf05a7e, [cx + sd * 0.02, 2.2, -3.02], [Math.PI / 2, 0, 0], [0.11, 0.11, 0.06]);
      KS.add(CYL(10), 0xffffff, [cx, 3.18, -3.05], [0, 0, Math.PI / 2], [0.025, 0.55, 0.025]);
    }
    KG.add(lathe('pot', [[0, 0], [0.11, 0], [0.13, 0.04], [0.15, 0.2], [0.17, 0.22], [0.0, 0.22]], 20), 0xd9764a, [0.05, 1.47, -3.1]);
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4, r = 0.05 + (k % 3) * 0.04;
      KS.add(SPHL(), k % 4 === 0 ? 0xff8fb3 : k % 4 === 2 ? 0xffd66b : 0x5fae5a, [0.05 + Math.cos(a) * r, 1.78 + (k % 4) * 0.06, -3.1 + Math.sin(a) * r * 0.5], null, k % 2 ? [0.07, 0.07, 0.07] : [0.1, 0.13, 0.08]);
    }
    // sağ duvar rafı: kavanozlar ve Feza'nın çizdiği resim
    KS.add(rbox(1.3, 0.06, 0.28, 0.02), WOOD, [5.0, 1.65, -3.08]);
    [[4.55, 0xff9fb8], [4.85, 0x9fe0c2], [5.15, 0xffd27a], [5.45, 0xb9a2ff]].forEach(([x, c], i) => {
      KG.add(rbox(0.2, 0.26, 0.2, 0.06), 0xf8fbff, [x, 1.82, -3.06]);
      KG.add(rbox(0.17, 0.16, 0.17, 0.05), c, [x, 1.77, -3.06]);
      KG.add(CYL(14), i & 1 ? 0xe85d5d : 0xffffff, [x, 1.97, -3.06], null, [0.1, 0.04, 0.1]);
    });
    const art = canvasTex(256, 200, (x, w, h) => {
      x.fillStyle = '#fffdf6'; x.fillRect(0, 0, w, h);
      x.lineWidth = 7; x.lineCap = 'round';
      x.strokeStyle = '#ffc93c'; x.beginPath(); x.arc(40, 40, 22, 0, TAU); x.stroke();
      for (let k = 0; k < 8; k++) { const a = k * TAU / 8; x.beginPath(); x.moveTo(40 + Math.cos(a) * 30, 40 + Math.sin(a) * 30); x.lineTo(40 + Math.cos(a) * 42, 40 + Math.sin(a) * 42); x.stroke(); }
      x.fillStyle = '#ff8fb3'; x.beginPath(); x.moveTo(110, 170); x.lineTo(110, 110); x.lineTo(150, 80); x.lineTo(190, 110); x.lineTo(190, 170); x.closePath(); x.fill();
      x.strokeStyle = '#7a4a2a'; x.beginPath(); x.moveTo(60, 175); x.lineTo(60, 140); x.stroke();   // Bilbo (çöp adam köpek)
      x.fillStyle = '#7a4a2a'; x.beginPath(); x.ellipse(70, 140, 22, 12, 0, 0, TAU); x.fill(); x.beginPath(); x.arc(92, 128, 10, 0, TAU); x.fill();
      x.strokeStyle = '#4aa3ff'; x.lineWidth = 9; x.beginPath(); x.moveTo(8, 190); x.lineTo(248, 190); x.stroke();
    });
    const artMat = new THREE.MeshStandardMaterial({ map: art, roughness: 0.8 }); own.push(art, artMat);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.48), artMat); pic.position.set(5.0, 2.35, -3.19); g.add(pic);
    KG.add(SPHL(), 0xff5a7a, [5.0, 2.62, -3.17], null, 0.03);
    // ── ada tezgâh ──
    const IX = -0.3, IZ = -0.9;
    KS.add(rbox(2.6, ISLAND_Y - 0.1, 1.0, 0.04), CREAM, [IX, (ISLAND_Y - 0.1) / 2 + 0.02, IZ]);
    for (let i = 0; i < 4; i++) {
      KS.add(rbox(0.56, 0.78, 0.04, 0.02), i & 1 ? 0xbfe6d6 : 0xa9dcc6, [IX - 0.93 + i * 0.62, 0.56, IZ + 0.51]);
      KG.add(rbox(0.22, 0.035, 0.035, 0.015), BRASS, [IX - 0.93 + i * 0.62, 0.86, IZ + 0.55]);
    }
    KM.add(G.box(), 0x6b5a4f, [IX, 0.05, IZ + 0.42], null, [2.5, 0.1, 0.2]);
    KG.add(rbox(2.85, 0.08, 1.2, 0.03), tone(0xdcaa72, 0.07, 16), [IX, ISLAND_Y - 0.04, IZ]);
    // ada üstü: karıştırma kâsesi + çırpıcı, oklava, yumurtalar, çilek kâsesi, sıkma torbası
    KG.add(lathe('bowl', [[0, 0], [0.09, 0], [0.11, 0.015], [0.2, 0.09], [0.24, 0.17], [0.235, 0.18], [0.19, 0.1], [0.08, 0.03], [0, 0.03]], 32), 0x8fd3c0, [-1.38, ISLAND_Y, -0.72]);
    KM.add(lathe('batter', [[0, 0], [0.2, 0], [0.205, 0.01], [0, 0.03]], 24), 0xf7e3b0, [-1.38, ISLAND_Y + 0.13, -0.72]);
    for (let k = 0; k < 4; k++) KG.add(TOR(TAU, 0.06), 0xdfe6ee, [-1.32, ISLAND_Y + 0.27, -0.72], [0.35, k * Math.PI / 4, 0], [0.07, 0.14, 0.07]);
    KG.add(CYL(10), 0xf2b35a, [-1.24, ISLAND_Y + 0.45, -0.72], [0, 0, -0.35], [0.025, 0.2, 0.025]);
    KS.add(CYL(20), tone(0xe7c08a, 0.05, 20), [-1.0, ISLAND_Y + 0.045, -1.22], [0, 0.4, Math.PI / 2], [0.045, 0.62, 0.045]);
    for (const sd of [-1, 1]) KS.add(CYL(12), 0xc98f5a, [-1.0 + Math.cos(0.4) * sd * 0.39, ISLAND_Y + 0.045, -1.22 - Math.sin(0.4) * sd * 0.39], [0, 0.4, Math.PI / 2], [0.025, 0.16, 0.025]);
    for (let k = 0; k < 3; k++) KG.add(SPH(), 0xfff4e2, [0.95 + k * 0.12, ISLAND_Y + 0.05, -1.18 + (k & 1) * 0.06], [0.3, 0, 0.2], [0.048, 0.062, 0.048]);
    KG.add(lathe('sbowl', [[0, 0], [0.07, 0], [0.13, 0.06], [0.14, 0.08], [0.0, 0.08]], 24), 0xffffff, [0.92, ISLAND_Y, -0.52]);
    for (let k = 0; k < 6; k++) {
      const a = k * 1.1, r = k ? 0.07 : 0;
      KG.add(SPH(), 0xe8243c, [0.92 + Math.cos(a) * r, ISLAND_Y + 0.1 + (k ? 0 : 0.03), -0.52 + Math.sin(a) * r], null, [0.04, 0.05, 0.04]);
      KS.add(CONE(), 0x4fa64a, [0.92 + Math.cos(a) * r, ISLAND_Y + 0.15 + (k ? 0 : 0.03), -0.52 + Math.sin(a) * r], [Math.PI, 0, 0], [0.03, 0.02, 0.03]);
    }
    KS.add(CONE(), 0xffffff, [-0.02, ISLAND_Y + 0.05, -0.45], [0, 0, Math.PI / 2 - 0.25], [0.07, 0.3, 0.07]);   // krema sıkma torbası
    KG.add(CONE(), 0xffb8cf, [-0.17, ISLAND_Y + 0.01, -0.45], [0, 0, Math.PI / 2 - 0.25], [0.022, 0.06, 0.022]);
    // ── pasta (yarım: iki kat, krema yarıda) ──
    const [cx, cy, cz] = SPOT.cake;
    KG.add(lathe('stand', [[0, 0], [0.13, 0], [0.14, 0.015], [0.05, 0.03], [0.04, 0.1], [0.05, 0.11], [0.36, 0.115], [0.37, 0.13], [0, 0.13]], 40), 0xffffff, [cx, cy, cz]);
    const cakeY = cy + 0.13;
    const sponge = tone(0xe9b56e, 0.05, 30), cream = 0xfff7ef;
    KM.add(CYL(40), sponge, [cx, cakeY + 0.05, cz], null, [0.3, 0.1, 0.3]);
    KS.add(CYL(40), cream, [cx, cakeY + 0.115, cz], null, [0.305, 0.03, 0.305]);
    KM.add(CYL(40), sponge, [cx, cakeY + 0.18, cz], null, [0.3, 0.1, 0.3]);
    KS.add(CYL(40), 0xffe0ea, [cx, cakeY + 0.18, cz], null, [0.27, 0.105, 0.27]);   // çilek kreması iç
    const finished = !!o.finished;
    if (!finished) {
      KS.add(lathe('frost', [[0, 0], [0.31, 0], [0.315, 0.02], [0.24, 0.045], [0, 0.05]], 40), cream, [cx, cakeY + 0.225, cz]);
      for (let k = 0; k < 16; k++) {   // yan yüze akan ince krema damlaları (farklı boyda)
        const a = -1.5 + k * 0.2 + Math.sin(k * 12.9898) * 0.06, L = 0.018 + Math.abs(Math.sin(k * 78.233)) * 0.075;
        KS.add(CYL(10), cream, [cx + Math.sin(a) * 0.304, cakeY + 0.225 - L / 2, cz + Math.cos(a) * 0.304], null, [0.017, L, 0.017]);
        KS.add(SPH(), cream, [cx + Math.sin(a) * 0.304, cakeY + 0.225 - L, cz + Math.cos(a) * 0.304], null, [0.019, 0.022, 0.019]);
      }
      for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.3, r = 0.2; KS.add(SPH(), 0xffd1e0, [cx + Math.sin(a) * r, cakeY + 0.262, cz + Math.cos(a) * r], null, [0.03, 0.022, 0.03]); }   // pembe krema tepecikleri
    }
    // ── un torbası (yerde) + dökülmüş un ──
    const [bx, bz] = SPOT.bag;
    // kese kâğıdı un torbası: krem-kraft, keskin kenarlı mavi bant + kırmızı şerit, kıvrılmış ağız
    const sack = (x, y, z) => {
      const w = 1 + 0.06 * Math.sin(x * 47 + z * 31) * Math.sin(y * 29);   // kâğıt kırışığı tonu
      if (y > 0.20005 && y <= 0.36005) return C(0x3f86d6);
      if (y > 0.36005 && y <= 0.38505) return C(0xe8463f);
      return C(0xe2c99b).multiplyScalar(w);
    };
    KM.add(lathe('sack2', [[0, 0], [0.22, 0], [0.28, 0.03], [0.31, 0.1], [0.32, 0.2], [0.32, 0.2001], [0.318, 0.36], [0.318, 0.3601], [0.315, 0.385], [0.315, 0.3851],
      [0.3, 0.5], [0.27, 0.6], [0.265, 0.62], [0.2, 0.6]], 32), sack, [bx, 0, bz], [0, 0.4, 0]);
    KM.add(TOR(TAU, 0.35), 0xcfb07c, [bx, 0.625, bz], [Math.PI / 2, 0, 0], [0.255, 0.255, 0.18]);   // kıvrılmış ağız
    KM.add(SPH(), 0xffffff, [bx + 0.04, 0.6, bz], null, [0.2, 0.08, 0.2]);
    KM.add(lathe('spill', [[0, 0], [0.5, 0], [0.3, 0.01], [0, 0.016]], 30), 0xf4efe4, [bx + 0.3, 0, bz + 0.12], null, [1, 1, 0.7]);
    for (let k = 0; k < 6; k++) KM.add(SPH(), 0xffffff, [bx + 0.3 + Math.cos(k * 1.7) * 0.5, 0, bz + 0.2 + Math.sin(k * 1.7) * 0.35], null, [0.06 + (k % 3) * 0.02, 0.03, 0.06]);
    // Bilbo'nun mama kabı
    KG.add(lathe('dbowl', [[0, 0], [0.16, 0], [0.18, 0.07], [0.12, 0.08], [0, 0.06]], 24), 0xe85d5d, [4.6, 0, -2.4]);
    // tavandan sarkan lamba (ada üstü)
    KG.add(CYL(8), 0x333333, [IX, 4.0, IZ], null, [0.01, 1.0, 0.01]);
    KG.add(lathe('shade', [[0.05, 0.4], [0.08, 0.38], [0.32, 0.05], [0.34, 0], [0.33, 0.0], [0.07, 0.36]], 32), 0xffc845, [IX, 3.1, IZ]);
    const bulb = new THREE.Mesh(SPHL(), glowMat(0xfff0c0, 2.2)); bulb.scale.setScalar(0.08); bulb.position.set(IX, 3.12, IZ); g.add(bulb); own.push(bulb.material);
    // pencereden süzülen güneş huzmeleri (yumuşak, toplamalı)
    const shaftTex = canvasTex(64, 256, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,244,214,0.95)'); gr.addColorStop(0.6, 'rgba(255,236,200,0.35)'); gr.addColorStop(1, 'rgba(255,236,200,0)');
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      const sg = x.createLinearGradient(0, 0, w, 0); sg.addColorStop(0, 'rgba(0,0,0,1)'); sg.addColorStop(0.25, 'rgba(0,0,0,0)'); sg.addColorStop(0.75, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,1)');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = sg; x.fillRect(0, 0, w, h);
    });
    const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    own.push(shaftTex, shaftMat);
    const shafts = [];
    for (const [x, w, rot] of [[0.1, 0.9, 0.05], [0.95, 0.7, -0.04], [0.55, 1.2, 0.0]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.2), shaftMat);
      m.position.set(x, 2.65 - 1.25, -3.1 + 1.0); m.rotation.set(-0.62, rot, 0); m.renderOrder = 3; g.add(m); shafts.push(m);
    }
    // kavanozun üstünde sihirli parıltı
    const glintMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 1.9), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    own.push(glintMat);
    const glint = new THREE.Mesh(SPHL(), glintMat); glint.position.set(SPOT.jar[0], SPOT.jar[1] + 0.16, SPOT.jar[2]); glint.scale.setScalar(0.16); g.add(glint);
    const mk = (kit, mat) => { const m = new THREE.Mesh(kit.build(), mat); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    mk(KM, matte); mk(KG, gloss); mk(KS, satin);
    // ── cam şeker kavanozu ──
    const [jx, jy, jz] = SPOT.jar;
    const glass = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false });
    own.push(glass);
    const jar = new THREE.Mesh(lathe('jar', [[0, 0], [0.1, 0], [0.11, 0.02], [0.11, 0.2], [0.08, 0.24], [0.08, 0.27], [0, 0.27]], 28), glass);
    jar.position.set(jx, jy, jz); jar.renderOrder = 2; g.add(jar);
    const lid = new THREE.Mesh(CYL(20), new THREE.MeshStandardMaterial({ color: 0xff6b8a, roughness: 0.4 })); own.push(lid.material);
    lid.scale.set(0.095, 0.04, 0.095); lid.position.set(jx, jy + 0.29, jz); lid.castShadow = true; g.add(lid);
    // ── pasta (bitmiş hali: final) ──
    const cake = new THREE.Group(); cake.position.set(cx, cakeY, cz); g.add(cake);
    const candles = [];
    if (finished) {
      const cm = new Kit();
      cm.add(CYL(40), sponge, [0, 0.33, 0], null, [0.26, 0.12, 0.26]);
      cm.add(CYL(40), 0xffffff, [0, 0.27, 0], null, [0.32, 0.04, 0.32]);
      cm.add(lathe('frostF', [[0, 0], [0.31, 0], [0.315, 0.35], [0.28, 0.37], [0.27, 0.39], [0.26, 0.4], [0, 0.4]], 40), cream, [0, 0.02, 0]);
      cm.add(lathe('frostT', [[0, 0], [0.27, 0], [0.275, 0.14], [0.25, 0.16], [0, 0.165]], 40), 0xfff2f6, [0, 0.4, 0]);
      for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; cm.add(SPH(), 0xffd1e0, [Math.sin(a) * 0.3, 0.39, Math.cos(a) * 0.3], null, [0.04, 0.035, 0.04]); }
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU + 0.2;
        cm.add(SPH(), 0xe8243c, [Math.sin(a) * 0.21, 0.6, Math.cos(a) * 0.21], null, [0.04, 0.05, 0.04]);
        cm.add(CONE(), 0x4fa64a, [Math.sin(a) * 0.21, 0.645, Math.cos(a) * 0.21], [Math.PI, 0, 0], [0.028, 0.018, 0.028]);
      }
      for (let k = 0; k < 30; k++) { const a = k * 2.39996, r = Math.sqrt((k + 0.5) / 30) * 0.24; cm.add(CYL(6), [0xff6b8a, 0x6bd0ff, 0xffd84a, 0x8cff8c, 0xc08cff][k % 5], [Math.sin(a) * r, 0.567, Math.cos(a) * r], [Math.PI / 2, a, 0], [0.008, 0.03, 0.008]); }
      const cmMesh = new THREE.Mesh(cm.build(), satin); cmMesh.castShadow = true; cake.add(cmMesh);
      const flameMat = glowMat(0xffb84a, 3.2); own.push(flameMat);
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * TAU + 0.5, x = Math.sin(a) * 0.12, z = Math.cos(a) * 0.12;
        const c = new THREE.Mesh(CYL(10), new THREE.MeshStandardMaterial({ color: [0xff8fb3, 0x7fd0ff, 0xffd84a, 0x9fe89f, 0xc9a2ff][k], roughness: 0.4 }));
        own.push(c.material);
        c.scale.set(0.017, 0.2, 0.017); c.position.set(x, 0.66, z); cake.add(c);
        const f = new THREE.Mesh(SPHL(), flameMat); f.position.set(x, 0.79, z); f.scale.set(0.024, 0.045, 0.024); f.visible = false; cake.add(f);
        candles.push({ f, x, z, on: false, out: 0 });
      }
    }
    g.traverse(m => { if (m.isMesh && m !== floor && m !== sky && m !== jar && m !== bulb && m !== glint && shafts.indexOf(m) < 0) { m.castShadow = true; m.receiveShadow = true; } });
    let dollop = null;
    if (finished) {   // yere düşen krema (Bilbo yalar)
      dollop = new THREE.Mesh(lathe('dollop', [[0, 0], [0.09, 0], [0.1, 0.02], [0.07, 0.05], [0.075, 0.06], [0.04, 0.09], [0.02, 0.12], [0, 0.13]], 20), new THREE.MeshStandardMaterial({ color: 0xfff6fa, roughness: 0.35 }));
      own.push(dollop.material); dollop.castShadow = true; dollop.visible = false; g.add(dollop);
    }
    return { g, own, jar, lid, cake, candles, dollop, shafts, glint, cakeTop: cakeY + (finished ? 0.57 : 0.25) };
  }

  // ───────────────────────── Sihirli şekerler (tek çizim) ─────────────────────────
  // Her şeker: kavanozda dinlenir → serpilir / havaya uçar → döner → dört yana dağılır; finalde geri toplanır.
  const SUGAR_N = 190;
  const SUGAR_COL = [0xff5f9e, 0x5ac8ff, 0xffd23f, 0x7be23a, 0xb06bff, 0xff8a1c, 0xffffff];
  function makeSugars(parent) {
    const geo = GEO.sugar || (GEO.sugar = new THREE.CapsuleGeometry(0.011, 0.028, 2, 6));
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.1, 2.1, 2.1) });
    const im = new THREE.InstancedMesh(geo, mat, SUGAR_N);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.name = 'sihirliSeker';
    const c = new THREE.Color();
    const S = { im, n: SUGAR_N, p: new Float32Array(SUGAR_N * 3), v: new Float32Array(SUGAR_N * 3), home: new Float32Array(SUGAR_N * 3),
      mode: new Uint8Array(SUGAR_N), t: new Float32Array(SUGAR_N), ph: new Float32Array(SUGAR_N), sc: new Float32Array(SUGAR_N), dest: new Float32Array(SUGAR_N * 3),
      glow: 0, center: new THREE.Vector3() };
    for (let i = 0; i < SUGAR_N; i++) {
      im.setColorAt(i, c.set(SUGAR_COL[i % SUGAR_COL.length]));
      S.ph[i] = Math.random() * TAU; S.sc[i] = 0.8 + Math.random() * 0.5;
    }
    im.instanceColor.needsUpdate = true;
    parent.add(im);
    return S;
  }
  // mode: 0 kavanoz (dinlenme), 1 serpme (Hala'nın elinden pastaya düşer, sonra pastada kalır), 2 uçuş (fizik), 3 dönme (merkez etrafı),
  //       4 dağılma (hedefe yay çizerek, sonra kaybolur), 5 kayıp (gizli), 6 toplanma (merkeze akar), 7 pastada
  const _m = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _ee = new THREE.Euler(), _vs = new THREE.Vector3(), _vp = new THREE.Vector3();
  function sugarsHome(S, jx, jy, jz) {
    for (let i = 0; i < S.n; i++) {
      const a = i * 2.39996, r = Math.sqrt((i % 60 + 0.5) / 60) * 0.085, h = Math.floor(i / 60) * 0.022 + (i % 7) * 0.003;
      S.home[i * 3] = jx + Math.cos(a) * r; S.home[i * 3 + 1] = jy + 0.02 + h; S.home[i * 3 + 2] = jz + Math.sin(a) * r;
      S.p[i * 3] = S.home[i * 3]; S.p[i * 3 + 1] = S.home[i * 3 + 1]; S.p[i * 3 + 2] = S.home[i * 3 + 2]; S.mode[i] = 0;
    }
  }
  function sugarsStep(S, dt, T) {
    const P = S.p, V = S.v, D = S.dest, cen = S.center;
    for (let i = 0; i < S.n; i++) {
      const m = S.mode[i], o = i * 3;
      S.t[i] += dt;
      let scale = S.sc[i];
      if (m === 0) { P[o] = S.home[o]; P[o + 1] = S.home[o + 1]; P[o + 2] = S.home[o + 2]; }
      else if (m === 1 || m === 2) {
        V[o + 1] -= (m === 1 ? 3.2 : 1.1) * dt;   // uçuşta yavaş, büyülü süzülme
        if (m === 2) { V[o] *= 1 - 0.6 * dt; V[o + 2] *= 1 - 0.6 * dt; V[o + 1] *= 1 - 0.5 * dt; }
        P[o] += V[o] * dt; P[o + 1] += V[o + 1] * dt; P[o + 2] += V[o + 2] * dt;
        if (m === 1 && P[o + 1] <= D[o + 1]) { P[o + 1] = D[o + 1]; S.mode[i] = 7; }
        if (m === 2 && S.t[i] > 1.3) { S.mode[i] = 3; S.t[i] = 0; }
      } else if (m === 3) {   // merkez etrafında dönme: yarıçap ve yükseklik dalgalanır
        const r = S.orbitR * (0.6 + 0.4 * Math.sin(S.ph[i] * 3 + T * 0.7)), a = S.ph[i] + T * (0.8 + (i % 5) * 0.12) * (i & 1 ? 1 : -1);
        const tx = cen.x + Math.cos(a) * r, ty = cen.y + S.orbitH * (0.3 + 0.7 * ((i * 0.618) % 1)) + Math.sin(T * 2 + S.ph[i]) * 0.08, tz = cen.z + Math.sin(a) * r;
        const k = 1 - Math.exp(-3 * dt);
        P[o] += (tx - P[o]) * k; P[o + 1] += (ty - P[o + 1]) * k; P[o + 2] += (tz - P[o + 2]) * k;
      } else if (m === 4) {   // dağılma: yay çizerek hedefe, giderken küçülür
        const u = clamp(S.t[i] / (S.flyT || 1.6), 0, 1), e = u * u * (3 - 2 * u);
        P[o] = V[o] + (D[o] - V[o]) * e; P[o + 2] = V[o + 2] + (D[o + 2] - V[o + 2]) * e;
        P[o + 1] = V[o + 1] + (D[o + 1] - V[o + 1]) * e + Math.sin(u * Math.PI) * 1.2;
        scale *= 1 - u * 0.7;
        if (u >= 1) S.mode[i] = 5;
      } else if (m === 5) scale = 0;
      else if (m === 6) {   // toplanma: merkeze spiral
        const u = clamp(S.t[i] / 2.2, 0, 1), e = u * u, a = S.ph[i] + u * 6;
        const r = (1 - e) * 1;
        P[o] = V[o] * (1 - e) + (cen.x + Math.cos(a) * r * 0.6) * e; P[o + 1] = V[o + 1] * (1 - e) + cen.y * e + Math.sin(u * Math.PI) * 0.6; P[o + 2] = V[o + 2] * (1 - e) + (cen.z + Math.sin(a) * r * 0.6) * e;
        if (u >= 1) S.mode[i] = 5;
      }
      _vp.set(P[o], P[o + 1], P[o + 2]);
      const spin = m >= 2 && m !== 7 ? T * 6 + S.ph[i] : S.ph[i];
      _qq.setFromEuler(_ee.set(spin, S.ph[i] * 2 + (m >= 2 && m !== 7 ? T * 3 : 0), S.ph[i]));
      const air = m === 2 || m === 3 || m === 4 || m === 6 ? S.air || 2.6 : 1;
      const sg = scale * air * (m === 3 || m === 2 ? 1 + S.glow * 0.6 * (0.5 + 0.5 * Math.sin(T * 9 + S.ph[i] * 5)) : 1);
      _vs.set(sg, sg, sg);
      S.im.setMatrixAt(i, _m.compose(_vp, _qq, _vs));
    }
    S.im.instanceMatrix.needsUpdate = true;
  }

  // ───────────────────────── Karakterler (başlık/sinematik) ─────────────────────────
  const FST = { move: 0, attack: -1, swingDir: 1, cast: -1, spin: false, hurt: 0, dead: false, cheer: false, idleT: 0, sitRead: false, hybrid: false, magicAttack: false };
  const BST = { speed: 0.12, hop: 0, pounce: 0, bark: 0, sit: 0 };
  const CH = { fBase: 0, bBase: 0.78, hBase: 0, bones: null };
  const HCX = { P: { pos: { x: 0, y: 0, z: 0 }, face: 0, dead: false, hp: 1, maxHp: 1 }, H: null, L: null, enemies: [], boss: null, Bilbo: null, state: 'title', dt: 0, t: 0, dead: false, title: true, api: null };
  const ACT = {   // sahnedeki hedef pozlar (sinematik bunları değiştirir)
    feza: { x: 0, z: 0, y: 0, face: 0, s: 1, move: 0, cheer: false, lean: 0 },
    bilbo: { x: 0, z: 0, y: 0, face: 0, s: 1, speed: 0.12, bark: 0, nose: 0, sit: 0, hop: 0, lick: 0 },
    hala: { x: 0, z: 0, y: 0, face: 0, s: 1, act: 'idle' },
  };
  function charRefs() {
    const g = G_(); if (!g) return null;
    const H = g.H, B = g.Bilbo, HL = H_();
    if (H && !CH.fBase) CH.fBase = H.root.scale.x || 1;
    if (HL && HL._S && HL._S.root && !CH.hBase) CH.hBase = HL._S.root.scale.x || 0.88;
    if (B && !CH.bones && B.bones) { CH.bones = {}; for (const b of B.bones) CH.bones[b.name] = b; }
    return { H, B, HL };
  }
  let origin = { x: 0, z: 0 };   // sahne kökü (dünya)
  function poseChars(dt, T) {
    const r = charRefs(); if (!r) return;
    const { H, B, HL } = r, f = ACT.feza, b = ACT.bilbo, h = ACT.hala, ox = origin.x, oz = origin.z;
    if (H) {
      FST.move = f.move; FST.cheer = !!f.cheer; FST.idleT += dt;
      H.root.position.set(ox + f.x, f.y, oz + f.z); H.root.rotation.y = f.face; H.root.scale.setScalar(CH.fBase * f.s);
      if (H.bladeOn && H.retract) { try { H.retract(); } catch (e) { /* ignore */ } }
      try { H.update(dt, FST); } catch (e) { /* ignore */ }
      if (f.lean) H.root.rotation.z = f.lean;
      else H.root.rotation.z = 0;
    }
    if (B) {
      BST.speed = b.speed; BST.bark = b.bark; BST.sit = b.sit; BST.hop = b.hop; BST.pounce = b.pounce || 0;
      B.root.position.set(ox + b.x, b.y, oz + b.z); B.root.rotation.y = b.face; B.root.scale.setScalar(CH.bBase * b.s);
      try { B.update(dt, BST); } catch (e) { /* ignore */ }
      const nk = CH.bones && CH.bones.neck, hd = CH.bones && CH.bones.head;
      if (nk && b.nose) nk.rotation.x += b.nose * 0.85;
      if (hd && b.nose) hd.rotation.x += b.nose * 0.35 + b.nose * 0.08 * Math.sin(T * 9);   // koklarken başı kıpır kıpır
      if (hd && b.lick) { hd.rotation.x += 0.25 * b.lick + 0.12 * Math.sin(T * 14) * b.lick; }
    }
    if (HL) {
      const S = HL._S;
      if (typeof HL.pose === 'function') {
        try { HL.pose(dt, { x: ox + h.x, y: h.y, z: oz + h.z, face: h.face, scale: h.s, act: h.act, t: T }); } catch (e) { /* ignore */ }
      } else if (S && S.root && typeof HL.dance === 'function' && typeof HL.update === 'function') {
        // gerçek Aytuğ Hala modeli (04_hala.js): kendi canlı animasyonu (nefes, göz kırpma, dans/alkış) sürsün diye
        // update'ini başlık kipinde, hedef noktada duracak şekilde sahte bir bağlamla çağır; sonra konumu/yönü/boyu sabitle
        const tx = ox + h.x, tz = oz + h.z, g = G_();
        S.x = tx; S.z = tz; S.face = h.face;
        HCX.P.pos.x = tx - 1.0; HCX.P.pos.z = tz + 0.5; HCX.P.face = h.face;
        HCX.L = g && g.L; HCX.Bilbo = g && g.Bilbo; HCX.api = g && g.halaApi; HCX.dt = dt; HCX.t = T;
        if (h.act !== CH.hAct) {   // eylem değişti: dans / alkış başlat
          CH.hAct = h.act;
          try { if (h.act === 'dans') HL.dance(8); else if (h.act === 'alkis' || h.act === 'saskin' || h.act === 'mum') HL.cheer(h.act === 'alkis' ? 3 : 1.6); } catch (e) { /* ignore */ }
        }
        if (h.act === 'yuru') S.vel = 2.2;
        try { HL.update(dt, HCX); } catch (e) { /* ignore */ }
        S.x = tx; S.z = tz;
        S.root.position.set(tx, h.y + (S.y || 0), tz); S.root.rotation.y = h.face; S.root.scale.setScalar(CH.hBase * h.s);
      } else if (S && S.root) {   // yer tutucu model: konum + basit kol hareketi
        S.x = ox + h.x; S.z = oz + h.z; S.face = h.face;
        let y = h.y;
        if (h.act === 'dans' || h.act === 'alkis') y += Math.abs(Math.sin(T * 7)) * 0.12 * h.s;
        if (h.act === 'yuru') y += Math.abs(Math.sin(T * 9)) * 0.05 * h.s;
        S.root.position.set(S.x, y, S.z); S.root.rotation.y = h.face; S.root.scale.setScalar(CH.hBase * h.s);
        S.root.rotation.z = h.act === 'dans' ? Math.sin(T * 5) * 0.12 : h.act === 'saskin' ? -0.08 : 0;
        if (S.arm) S.arm.rotation.x = h.act === 'serp' ? -1.2 + Math.sin(T * 7) * 0.35 : h.act === 'isaret' || h.act === 'mum' ? -1.5 : h.act === 'alkis' || h.act === 'dans' ? -2.4 + Math.sin(T * 10) * 0.4 : h.act === 'saril' ? -1.1 : h.act === 'yuru' ? Math.sin(T * 9) * 0.5 : Math.sin(T * 1.3) * 0.05;
      }
    }
  }

  // sinematikte Feza'nın elinde kılıç/değnek olmasın (pasta yapıyoruz); sahne bitince oyunun donanımı geri gelir
  function hideWeapon() {
    const g = G_(), H = g && g.H; if (!H || !H.setEquip || CH.noWeapon) return;
    const e = (g.P && g.P.equip) || {};
    try { H.setEquip({ weapon: null, offhand: null, hat: e.hat || null, cape: e.cape || null }); CH.noWeapon = true; } catch (err) { /* ignore */ }
    if (H.setXray) { try { H.setXray(false); CH.xrayOff = true; } catch (err) { /* ignore */ } }   // kapı kasasının arkasında mavi hayalet görünmesin
  }
  function restoreWeapon() {
    const g = G_(), H = g && g.H; if (!H || !H.setEquip || !CH.noWeapon) return;
    CH.noWeapon = false;
    try { H.setEquip(g.P.equip); } catch (err) { /* ignore */ }
    restoreXray();
  }
  function restoreXray() {
    const g = G_(), H = g && g.H; if (!H || !H.setXray || !CH.xrayOff) return;
    CH.xrayOff = false; try { H.setXray(true); } catch (err) { /* ignore */ }
  }
  // sahne bitince modelleri oyunun beklediği hale döndür (boy, eğim)
  function restoreChars() {
    const r = charRefs(); if (!r) return;
    const { H, B, HL } = r;
    if (H) { H.root.scale.setScalar(CH.fBase || 1); H.root.rotation.z = 0; }
    if (B) { B.root.scale.setScalar(CH.bBase); }
    if (HL) {
      if (typeof HL.pose === 'function') { try { HL.pose(0, { x: HL._S ? HL._S.x : 0, y: 0, z: HL._S ? HL._S.z : 0, face: 0, scale: 1, act: 'bitti', t: 0 }); } catch (e) { /* ignore */ } }
      const S = HL._S; if (S && S.root) { S.root.scale.setScalar(CH.hBase || 0.88); S.root.rotation.z = 0; if (S.arm) S.arm.rotation.x = 0; }
    }
  }

  // ───────────────────────── Başlık sahnesi ─────────────────────────
  const TS = { K: null, sugar: null, L: null, t: 0, puffs: null, mug: null, cineOn: false };
  function buildTitle(L, api) {
    const st = L.start || { x: 0, z: 0 };
    origin = { x: st.x, z: st.z };
    const K = buildKitchen({ finished: false });
    K.g.position.set(origin.x, 0, origin.z);
    api.add(K.g);
    if (api.floor) api.floor.visible = false;
    TS.K = K; TS.L = L; TS.t = 0; TS.mug = null;
    TS.sugar = makeSugars(K.g);
    sugarsHome(TS.sugar, SPOT.jar[0], SPOT.jar[1], SPOT.jar[2]);
    TS.puffs = makePuffs(K.g);
    TS.mug = makeMug(K.g);
    L._storyTitle = true; L.storyOrigin = origin; CH.noWeapon = false;
    // sıcak lamba ışığı ve pencereden serin dolgu (havuz ışıkları)
    if (api.light) {
      api.light(origin.x - 0.3, 2.9, origin.z - 0.9, 0xffd9a0, 4, 8);
      api.light(origin.x + 0.6, 2.2, origin.z - 2.4, 0xdcefff, 2.2, 6);
      api.light(origin.x + 3.4, 2.3, origin.z - 4.2, 0xffe2a8, 2.4, 4.5);
    }
    titlePose();
  }
  function titlePose() {   // başlıktaki duruş
    const f = ACT.feza, b = ACT.bilbo, h = ACT.hala;
    Object.assign(f, { x: SPOT.feza[0], z: SPOT.feza[1], y: 0, face: -0.92, s: 1, move: 0, cheer: false, lean: 0 });
    Object.assign(b, { x: SPOT.bilbo[0], z: SPOT.bilbo[1], y: 0, face: -Math.PI / 2 + 0.1, s: 1, speed: 0.12, bark: 0, nose: 1, sit: 0, hop: 0, lick: 0, pounce: 0 });
    Object.assign(h, { x: SPOT.hala[0], z: SPOT.hala[1], y: HALA_STEP, face: -0.12, s: 1, act: 'serp' });
  }
  // kenara yıkılmayan, yuvarlak un bulutları (hapşırık için)
  function makePuffs(parent) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
    const list = [];
    for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(SPHL(), mat); m.visible = false; parent.add(m); list.push({ m, t: -1, v: new THREE.Vector3(), s: 0.1 }); }
    return { mat, list, life: 1.6, peak: 0.6 };
  }
  function puff(Pf, x, y, z, n, power = 1, big = 1) {
    let k = 0;
    for (const p of Pf.list) {
      if (p.t >= 0 && p.t < Pf.life) continue;
      p.t = 0; p.m.position.set(x, y, z); p.v.set((Math.random() - 0.5) * 1.6 * power, (0.4 + Math.random()) * power, (Math.random() - 0.2) * 1.4 * power);
      p.s = (0.06 + Math.random() * 0.08) * big; p.m.visible = true;
      if (++k >= n) break;
    }
  }
  function puffStep(Pf, dt) {
    let any = false;
    for (const p of Pf.list) {
      if (p.t < 0) continue;
      p.t += dt; const u = p.t / Pf.life;
      if (u >= 1) { p.t = -1; p.m.visible = false; continue; }
      any = true;
      p.v.multiplyScalar(1 - 1.8 * dt);
      p.m.position.addScaledVector(p.v, dt);
      p.m.scale.setScalar(p.s * (1 + u * 3.5));
    }
    Pf.mat.opacity = any ? 0.85 : 0;
    // tek malzeme: en yaşlı bulut solarken hepsi biraz saydamlaşır (yumuşak)
    let maxU = 0; for (const p of Pf.list) if (p.t >= 0) maxU = Math.max(maxU, p.t / Pf.life);
    Pf.mat.opacity = any ? Pf.peak * (1 - maxU * 0.85) : 0;
  }
  // canlanan sevimli fincan (huysuz, gülümseyen)
  function makeMug(parent) {
    const g = new THREE.Group(); g.visible = false;
    const k = new Kit(), kg = new Kit();
    const dots = (x, y, z) => (Math.sin(x * 160) * Math.sin(y * 160) * Math.sin(z * 160) > 0.55 ? C(0xffffff) : C(0x7fd3e8));
    k.add(lathe('mug', [[0, 0], [0.04, 0], [0.045, 0.006], [0.05, 0.08], [0.052, 0.1], [0.046, 0.1], [0.044, 0.02], [0, 0.02]], 28), dots);
    k.add(TOR(Math.PI * 1.3, 0.25), 0x7fd3e8, [0.055, 0.055, 0], [0, 0, -Math.PI * 0.65], [0.026, 0.026, 0.026]);
    kg.add(SPH(), 0xffffff, [-0.017, 0.062, 0.044], null, [0.013, 0.016, 0.008]);
    kg.add(SPH(), 0xffffff, [0.017, 0.062, 0.044], null, [0.013, 0.016, 0.008]);
    kg.add(SPH(), 0x2a1a14, [-0.016, 0.06, 0.05], null, [0.0085, 0.011, 0.005]);
    kg.add(SPH(), 0x2a1a14, [0.018, 0.06, 0.05], null, [0.0085, 0.011, 0.005]);
    kg.add(SPH(), 0xffffff, [-0.013, 0.065, 0.054], null, 0.003); kg.add(SPH(), 0xffffff, [0.021, 0.065, 0.054], null, 0.003);
    kg.add(TOR(Math.PI, 0.28), 0x8a3a3a, [0.001, 0.042, 0.049], [0, 0, Math.PI], [0.012, 0.009, 0.01]);   // yaramaz gülümseme
    kg.add(SPH(), 0xff9fb3, [-0.032, 0.046, 0.04], null, [0.009, 0.005, 0.004]); kg.add(SPH(), 0xff9fb3, [0.034, 0.046, 0.04], null, [0.009, 0.005, 0.004]);
    const body = new THREE.Mesh(k.build(), vcMat({ roughness: 0.25 })); body.castShadow = true;
    const face = new THREE.Mesh(kg.build(), vcMat({ roughness: 0.2 })); face.scale.setScalar(0.001);
    g.add(body, face); parent.add(g);
    return { g, face, t: 0, awake: 0 };
  }
  function titleTick(dt) {
    const g = G_(); if (!g || !TS.K || !g.L || !g.L._storyTitle) return false;
    TS.t += dt;
    hideWeapon();
    // seviye çizimlerinin (kapılar, sandıklar, kenar bordürü) başlıkta görünmesin: yalnız mutfak seti
    if (!TS.hidden) { TS.hidden = true; const grp = TS.K.g.parent; if (grp) for (const c of grp.children) if (c !== TS.K.g && c.isMesh !== undefined && c.name !== 'hikayeMutfak') { if (c.userData.storyKeep) continue; c.visible = false; } }
    if (CINE.on && CINE.kind === 'intro') introTick(dt);
    else idleTitle(dt);
    poseChars(dt, TS.t);
    puffStep(TS.puffs, dt);
    sugarsStep(TS.sugar, dt, TS.t);
    const K = TS.K, T = TS.t;
    if (K.glint) { K.glint.visible = K.lid.visible; K.glint.material.opacity = 0.22 + 0.16 * Math.sin(T * 3.1); K.glint.scale.setScalar(0.15 + 0.03 * Math.sin(T * 2.3)); }
    for (let i = 0; i < K.shafts.length; i++) K.shafts[i].material.opacity = 0.2 + 0.05 * Math.sin(T * 0.5 + i);
    if (!CINE.on && (T % 1.7) < dt) burst('sparkle', origin.x + SPOT.jar[0], SPOT.jar[1] + 0.32, origin.z + SPOT.jar[2], { count: 3, color: pick(['#ff8fd8', '#7fe0ff', '#ffe36a', '#b9ff8a']) });
    // P konumu: ışıklar/gölge mutfak ortasını izler
    g.P.pos.set(origin.x + 0.4, 0, origin.z - 0.6);
    return true;
  }
  let sprAt = 0;
  function idleTitle(dt) {
    const T = TS.t, f = ACT.feza, b = ACT.bilbo, h = ACT.hala;
    // Feza kapıdan bakıyor: ara ara öne eğilip geri çekilir
    const peek = 0.5 + 0.5 * Math.sin(T * 0.55);
    f.x = SPOT.feza[0] - 0.12 * peek; f.lean = 0.06 * peek; f.face = -0.92 + 0.1 * Math.sin(T * 0.4);
    // Bilbo burnu un torbasında, kuyruk sallanır; ara ara un pofu
    b.nose = 0.8 + 0.2 * Math.sin(T * 1.7); b.speed = 0.12;
    if ((T % 2.3) < dt) puff(TS.puffs, SPOT.bag[0] + 0.15, 0.82, SPOT.bag[1] + 0.05, 1, 0.25, 0.16);   // ara ara un tozu
    // Hala şeker serper: kavanozdan birkaç şeker pastaya yağar
    h.act = 'serp'; h.face = -0.12 + 0.05 * Math.sin(T * 0.8);
    sprAt -= dt;
    if (sprAt <= 0) { sprAt = 0.09; sprinkle(1); }
  }
  // kavanozdaki bir şekeri Hala'nın elinden pastaya serp (kavanozda azalınca pastadakiler geri döner: sonsuz döngü)
  let sprI = 0;
  function sprinkle(n) {
    const S = TS.sugar; if (!S) return;
    for (let k = 0; k < n; k++) {
      const i = sprI = (sprI + 1) % S.n, o = i * 3;
      const [cx, cy, cz] = SPOT.cake;
      S.mode[i] = 1; S.t[i] = 0;
      S.p[o] = cx + 0.12 + (Math.random() - 0.5) * 0.12; S.p[o + 1] = cy + 0.75; S.p[o + 2] = cz - 0.05 + (Math.random() - 0.5) * 0.1;
      S.v[o] = (Math.random() - 0.5) * 0.4; S.v[o + 1] = 0.2; S.v[o + 2] = (Math.random() - 0.5) * 0.3;
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.27;
      S.dest[o] = cx + Math.cos(a) * r; S.dest[o + 1] = cy + 0.13 + 0.25 + (r < 0.25 ? 0.005 : -0.04); S.dest[o + 2] = cz + Math.sin(a) * r;
      // pastaya ulaşanlar bir süre sonra kavanoza "geri döner" (görünmez geçiş), böylece pasta dolup taşmaz
      const back = (i + Math.floor(S.n / 2)) % S.n;
      if (S.mode[back] === 7) S.mode[back] = 0;
    }
  }

  // ───────────────────────── ?ikon: iPad simgesi (1024x1024) ─────────────────────────
  // Yakın, sıcak kare kompozisyon: ortada kocaman gülen Feza (silahsız), yanında ona sokulmuş Aytuğ Hala, önde dili dışarıda Bilbo,
  // arkada ada tezgâhında pasta, etrafta birkaç renkli sihirli şeker. Önemli her şey ortadaki %80'de (iOS köşeleri yuvarlar).
  const ICONP = { feza: [0.08, 0.72], hala: [-0.48, 0.42], halaFace: 0.6, halaPose: 'hug', bilbo: [0.86, 1.0], look: [0.1, 0.95, 0.55], cam: [0.22, 1.45, 4.7] };
  let iconInit = false;
  function iconTick(dt) {
    const g = G_(); if (!g || !TS.K || !g.L || !g.L._storyTitle) return false;
    TS.t += dt;
    hideWeapon();
    if (!TS.hidden) { TS.hidden = true; const grp = TS.K.g.parent; if (grp) for (const c of grp.children) if (c !== TS.K.g && c.isMesh !== undefined) c.visible = false; }
    const f = ACT.feza, b = ACT.bilbo, h = ACT.hala;
    Object.assign(f, { x: ICONP.feza[0], z: ICONP.feza[1], y: 0, face: -0.08, s: 1, move: 0, cheer: false, lean: 0 });
    Object.assign(h, { x: ICONP.hala[0], z: ICONP.hala[1], y: 0, face: ICONP.halaFace ?? 0.75, s: 1, act: 'idle' });
    const HLq = H_(); if (ICONP.halaPose && HLq && HLq._qa && HLq._qa.pose) try { HLq._qa.pose(ICONP.halaPose, 1); } catch (e) { /* ignore */ }   // Feza'ya sarılır
    Object.assign(b, { x: ICONP.bilbo[0], z: ICONP.bilbo[1], y: 0, face: -0.85, s: 1, speed: 0.12, bark: 0.45, nose: -0.12, sit: 0, hop: 0, lick: 0, pounce: 0 });
    const H = g.H, hs = H && H._S;
    if (hs && !hs.fixed) hs.fixed = (P, face) => { face.happy = 0; face.grin = 1; face.blush = Math.max(face.blush || 0, 0.7); };   // gözler açık, kocaman gülüş
    FST.cheer = false;
    poseChars(dt, TS.t);
    if (!iconInit) {   // birkaç şeker kahramanların çevresinde süzülür (sabit, parıltılı)
      iconInit = true;
      const S = TS.sugar;
      for (let i = 0; i < S.n; i++) S.mode[i] = 5;
      const spots = [[-1.05, 1.9, 0.5], [1.05, 1.75, 0.7], [-0.75, 0.55, 1.2], [1.2, 0.95, 0.25], [0.55, 2.15, 0.2], [-1.2, 1.25, 0.9], [0.95, 0.4, 1.5], [-0.25, 2.25, 0.35]];
      spots.forEach((q, k) => { const o = k * 3; S.mode[k] = 7; S.p[o] = q[0]; S.p[o + 1] = q[1]; S.p[o + 2] = q[2]; S.sc[k] = 2.6; S.ph[k] = k * 1.3; });
    }
    sugarsStep(TS.sugar, 0, TS.t);
    g.P.pos.set(origin.x + 0.1, 0, origin.z + 0.4);
    return true;
  }

  // ───────────────────────── Sinematik altyapı ─────────────────────────
  const CINE = { on: false, kind: '', beats: null, i: -1, t: 0, bt: 0, dur: 0, done: null, skipAll: false, cam: null, w: 0, near: 0.5 };
  const CAM_ = { pos: new THREE.Vector3(), look: new THREE.Vector3(), tpos: new THREE.Vector3(), tlook: new THREE.Vector3(), k: 3, snap: true, fov: 40, tfov: 40 };
  const _cv = new THREE.Vector3();
  function camTo(px, py, pz, lx, ly, lz, k = 2.5, snap = false) {
    CAM_.tpos.set(origin.x + px, py, origin.z + pz); CAM_.tlook.set(origin.x + lx, ly, origin.z + lz); CAM_.k = k;
    if (snap) { CAM_.pos.copy(CAM_.tpos); CAM_.look.copy(CAM_.tlook); }
  }
  function restoreNear() {
    const c = realCam(); if (!c) return;
    if (c.near !== 0.5 || c.fov !== 40) { c.near = 0.5; c.fov = 40; c.updateProjectionMatrix(); }
    CINE.near = 0.5; CAM_.fov = CAM_.tfov = 40;
  }
  function realCam() { try { return window.__storyCam || null; } catch (e) { return null; } }
  function titleCamera() {
    const T = TS.t, aspect = innerWidth / Math.max(1, innerHeight), narrow = aspect < 1.5 ? (1.5 - aspect) * 3.0 : 0;
    camTo(0.45 + Math.sin(T * 0.12) * 0.25, 2.55 + narrow * 0.3, 6.7 + narrow, 0.25, 1.0, -1.1, 1.2, CAM_.snapTitle !== TS.L);
    CAM_.snapTitle = TS.L; CINE.near = 0.5; CAM_.tfov = 40;
  }

  // DOM katmanı: dokununca bir sonraki ana geç, "Geç" düğmesi hepsini atlar
  let ov = null;
  function overlay(on, o = {}) {
    if (!on) { if (ov) { ov.remove(); ov = null; } document.body.classList.remove('st-cinema'); return; }
    if (ov) ov.remove();
    injectCss(); WH.a = WH.to = 0; WH.hold = 0; WH.then = null;
    ov = document.createElement('div'); ov.className = 'st-ov'; document.body.classList.add('st-cinema');
    ov.innerHTML = `<div class="st-white"></div><div class="st-credits"></div>${o.skip !== false ? '<button class="st-skip" aria-label="Geç">Geç ⏩</button>' : ''}<button class="st-blow st-hide" aria-label="Üfle">🌬️<span>Üfle!</span></button>`;
    document.body.appendChild(ov);
    const sk = ov.querySelector('.st-skip');
    if (sk) sk.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); skipAll(); });
    ov.querySelector('.st-blow').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); blowNow(); });
    ov.addEventListener('pointerdown', e => { e.preventDefault(); if (CINE.wait === 'blow') blowNow(); else nextBeat(); });
  }
  // beyaz perde (un bulutu / büyü parlaması): sinematik zamanıyla ilerler (__step ile de doğru)
  const WH = { a: 0, to: 0, v: 3, hold: 0, then: null };
  function white(a, dur = 0.35, holdThen) { WH.to = a; WH.v = 1 / Math.max(0.05, dur); if (holdThen) { WH.hold = holdThen[0]; WH.then = holdThen[1]; } }
  function whiteStep(dt) {
    if (WH.hold > 0 && WH.a === WH.to) { WH.hold -= dt; if (WH.hold <= 0 && WH.then != null) { WH.to = WH.then; WH.then = null; } }
    const d = WH.to - WH.a, st = WH.v * dt;
    WH.a = Math.abs(d) <= st ? WH.to : WH.a + Math.sign(d) * st;
    const w = ov && ov.querySelector('.st-white'); if (w) w.style.opacity = String(WH.a);
  }
  function nextBeat() {
    if (!CINE.on || CINE.wait === 'blow') return;
    const b = CINE.beats[CINE.i];
    if (b && b.noSkip) return;
    if (CINE.bt < 1.0) return;   // çok hızlı art arda dokunuşlar tek sayılır (her cümle en az 1 s duyulur)
    const A = A_(); if (A && A.stopVoice) A.stopVoice();
    CINE.bt = CINE.dur;
  }
  function skipAll() {
    if (!CINE.on) return;
    CINE.skipAll = true;
    const A = A_(); if (A && A.stopVoice) A.stopVoice();
  }
  function runCine(kind, beats) {
    return new Promise(res => {
      Object.assign(CINE, { on: true, kind, beats, i: -1, t: 0, bt: 0, dur: 0, done: res, skipAll: false, wait: null });
      enterBeat(0);
    });
  }
  function enterBeat(i) {
    CINE.i = i; CINE.bt = 0;
    const b = CINE.beats[i];
    if (!b) return endCine();
    let d = b.min || 1.5;
    if (b.key) { const L = line(b.key, null, 4, { interrupt: true }); d = Math.max(d, (L || lineLen(b.key)) + (b.pad ?? 0.35)); }
    CINE.dur = d;
    try { b.enter && b.enter(); } catch (e) { console.warn('STORY beat', e); }
  }
  function cineStep(dt) {
    if (!CINE.on) return;
    CINE.t += dt; CINE.bt += dt; whiteStep(dt);
    const b = CINE.beats[CINE.i];
    if (b && b.tick) { try { b.tick(clamp(CINE.bt / CINE.dur, 0, 1), dt, CINE.bt); } catch (e) { console.warn('STORY tick', e); } }
    if (CINE.skipAll && !(b && b.noSkip)) {   // atla: son ana (ya da işaretli "bitiş" anına) doğrudan geç
      CINE.skipAll = false;
      const j = CINE.beats.findIndex(x => x.final);
      if (j > CINE.i) { enterBeat(j); return; }
    }
    if (CINE.wait) return;
    if (CINE.bt >= CINE.dur) enterBeat(CINE.i + 1);
  }
  function endCine() {
    const res = CINE.done, kind = CINE.kind;
    CINE.on = false; CINE.beats = null; CINE.done = null; CINE.kind = '';
    // beyaz perde, UI'nın yükleme karartması gelene kadar kalır (başlık bir an görünmesin)
    if (ov && WH.a > 0.5) { const o = ov; ov = null; o.style.pointerEvents = 'none'; const sk = o.querySelector('.st-skip'); if (sk) sk.remove(); setTimeout(() => { o.remove(); if (!ov) document.body.classList.remove('st-cinema'); }, 700); }
    else overlay(false);
    WH.a = WH.to = 0; WH.hold = 0; WH.then = null;
    restoreNear();
    if (kind === 'intro') { titlePose(); TS.mug.g.visible = false; restoreXray(); }   // (yeni oyun resetPlayer ile donanımı kendisi giydirir)   // başlık karesi yeni oyun yüklenene kadar normal boyda
    restoreChars();
    if (res) res();
  }

  // ───────────────────────── Giriş sinematiği ─────────────────────────
  // (UI "Oyna"dan sonra, yeni oyun yüklenmeden; başlık mutfağında oynar. Bitince UI yeni oyunu masada başlatır.)
  function gpos(who) { return SPOT.group[who]; }
  function introBeats() {
    const f = ACT.feza, b = ACT.bilbo, h = ACT.hala, S = TS.sugar, cen = () => S.center;
    const [cx, cy, cz] = SPOT.cake, [jx, jy, jz] = SPOT.jar;
    let shrink = 1, sneezeDone = false;
    const focus = { x: 0.35, z: 0.75 };
    const setScale = s => {   // minicik olma: herkes odak noktasına doğru küçülür
      shrink = s;
      for (const [who, A] of [['feza', f], ['hala', h], ['bilbo', b]]) { const p = gpos(who); A.x = focus.x + (p[0] - focus.x) * s; A.z = focus.z + (p[1] - focus.z) * s; A.s = s; }
      CINE.near = clamp(0.5 * s, 0.012, 0.5);
    };
    const lowCam = (s, up = 0) => camTo(focus.x + 0.5 * s, 1.5 * s + 0.02 + up * 0.15, focus.z + 3.4 * s + 0.05, focus.x, 0.75 * s + up * (0.9 - s * 0.5), focus.z - up * 1.4, 3);
    return [
      { key: 'intro_1', min: 3.5, enter() { camTo(-0.1, 1.95, 2.2, -0.45, 1.35, -1.2, 1.4); h.act = 'idle'; },
        tick(u, dt) { idleBits(dt); h.face = -0.1 + Math.sin(CINE.t * 2) * 0.1; } },
      { key: 'intro_2', min: 3.4, enter() { camTo(0.05, 1.85, 1.3, -0.25, 1.3, -1.0, 1.6); h.act = 'serp'; },
        tick(u, dt) { idleBits(dt); sprAt -= dt; if (sprAt <= 0) { sprAt = 0.05; sprinkle(2); } } },
      { key: 'intro_3', min: 3.0, enter() { const [bx, bz] = SPOT.bilbo; camTo(bx + 0.5, 1.3, bz + 2.6, bx - 0.2, 0.45, bz - 0.1, 1.6); h.act = 'idle'; h.face = -0.9; },
        tick(u, dt) { b.nose = 1; f.x = SPOT.feza[0] - 0.1; if ((CINE.bt % 0.8) < dt) puff(TS.puffs, SPOT.bag[0] + 0.12, 0.66, SPOT.bag[1], 2, 0.35, 0.35); } },
      // hapşırık: önce iki kez "ha… ha…" (baş kalkar), sonra HAPŞU!
      { min: 2.4, noSkip: true, enter() { const [bx, bz] = SPOT.bilbo; camTo(bx + 0.9, 1.3, bz + 2.7, bx - 0.3, 0.55, bz - 0.05, 2.4); },
        tick(u, dt, t) {
          const a1 = Math.exp(-Math.pow((t - 0.45) / 0.18, 2)), a2 = Math.exp(-Math.pow((t - 1.15) / 0.22, 2));
          if (t - dt < 0.35 && t >= 0.35) sfx('pop', { vol: 0.35, pitch: 0.8 }); if (t - dt < 1.0 && t >= 1.0) sfx('pop', { vol: 0.45, pitch: 0.95 });
          b.nose = clamp(1 - a1 * 1.2 - a2 * 1.6, -0.6, 1);
          if (t > 1.55 && !sneezeDone) {
            sneezeDone = true; b.nose = -0.5; b.bark = 1.3;
            sfx('bilboBark', { vol: 0.9, pitch: 1.25 }); sfx('whoosh', { vol: 0.9 }); sfx('fizz', { vol: 0.6 }); sfx('bonk', { vol: 0.5, pitch: 1.4 }); shake(0.35, 0.4);
            TS.puffs.peak = 0.92; later(2.2, () => { TS.puffs.peak = 0.6; });
            puff(TS.puffs, SPOT.bag[0] - 0.1, 0.62, SPOT.bag[1], 16, 2.6, 2.4);
            // kavanoz devrilir gibi: bütün şekerler havaya
            for (let i = 0; i < S.n; i++) { const o = i * 3; S.mode[i] = 2; S.t[i] = Math.random() * 0.3; S.v[o] = (Math.random() - 0.5) * 2.2; S.v[o + 1] = 2.2 + Math.random() * 2.2; S.v[o + 2] = (Math.random() - 0.3) * 2.0;
              if (i % 2) { S.p[o] = jx; S.p[o + 1] = jy + 0.25; S.p[o + 2] = jz; } }
            S.center.set(focus.x, 1.2, focus.z - 0.3); S.orbitR = 1.4; S.orbitH = 1.6; S.glow = 1;
            TS.K.lid.visible = false;
          }
          if (t > 1.55) {   // hapşırığın gücüyle Bilbo geri sıçrar (komik)
            b.nose = Math.max(-0.5, b.nose - dt); b.bark = Math.max(0, b.bark - dt);
            const k = (t - 1.55) / 0.5;
            b.y = k < 1 ? Math.sin(k * Math.PI) * 0.28 : 0; b.x = SPOT.bilbo[0] + Math.min(1, k) * 0.35; b.pounce = k < 1 ? Math.sin(k * Math.PI) : 0;
          }
        } },
      { key: 'intro_4', min: 3.6, enter() { camTo(0.9, 2.4, 4.6, 0.6, 1.4, -0.6, 1.6); h.act = 'saskin'; white(0.92, 0.25, [0.25, 0]); WH.v = 4; },
        tick(u, dt, t) {
          if (t > 0.35 && !this._cut) {   // un bulutunun içinde herkes bir araya gelir (sahne kesmesi)
            this._cut = true; setScale(1);
            f.face = 0.4; f.move = 0; b.face = -0.5; b.nose = 0; b.y = 0; b.pounce = 0; h.y = 0; h.face = 0.35; h.act = 'saskin';
            camTo(0.75, 1.75, 3.6, 0.35, 1.25, 0.2, 2, true);
          }
          S.glow = 1;
        } },
      { key: 'intro_5', min: 4.4, enter() { h.act = 'saskin'; f.cheer = false; this._t0 = 0; sfx('star', { vol: 0.7 }); sfx('spin', { vol: 0.5 }); },
        tick(u, dt, t) {
          const s = 1 - 0.9 * ease(clamp((t - 0.3) / 3.2, 0, 1));
          setScale(s);
          lowCam(s, 0);
          CAM_.k = 6;
          f.face = 0.2 + Math.sin(t * 3) * 0.3; h.face = 0.3 + Math.sin(t * 2.4) * 0.25; b.face = -0.4 + Math.sin(t * 3.3) * 0.4;
          S.center.set(focus.x, 0.2 + s * 1.0, focus.z); S.orbitR = 0.25 + s * 1.2; S.orbitH = 0.3 + s * 1.3;
          if ((t % 0.5) < dt) burst('sparkle', origin.x + focus.x, 0.2 + s, origin.z + focus.z, { count: 6, color: pick(['#ff8fd8', '#7fe0ff', '#ffe36a']) });
        } },
      { key: 'intro_6', min: 4.0, enter() {
          setScale(0.1);
          // şekerler dört yana: kapı, pencere, sağ, sol, yukarı
          const D = [[3.4, 1.2, -4.6], [0.6, 2.3, -3.4], [6.5, 1.0, 0.5], [-4.5, 1.6, -1.0], [-0.3, 3.4, -0.9]];
          for (let i = 0; i < S.n; i++) { const o = i * 3, d = D[i % D.length]; S.mode[i] = 4; S.t[i] = -(i % 30) * 0.03;
            S.v[o] = S.p[o]; S.v[o + 1] = S.p[o + 1]; S.v[o + 2] = S.p[o + 2];
            S.dest[o] = d[0] + (Math.random() - 0.5); S.dest[o + 1] = d[1] + Math.random() * 0.4; S.dest[o + 2] = d[2] + (Math.random() - 0.5); }
          S.flyT = 2.6; sfx('whoosh', { vol: 0.7 }); h.act = 'isaret';
        },
        tick(u, dt, t) {
          // arkalarından, aşağıdan yukarı: minicik üçlü önde, şekerler devleşmiş mutfağa saçılıyor
          const k = ease(clamp(t / 1.0, 0, 1));
          camTo(focus.x + 0.12 - k * 0.04, 0.11 + k * 0.03, focus.z + 0.48 + k * 0.08, focus.x - 0.2, 0.2 + k * 0.5, focus.z - 2.4, 3);
          f.face = Math.PI - 0.2; h.face = Math.PI + 0.1; b.face = Math.PI - 0.4;
          if (t > 2.6) { f.face = 0.3; h.face = 0.4; b.face = -0.3; }
          if ((t % 0.12) < dt) { const i = Math.floor(Math.random() * S.n), o = i * 3; if (S.mode[i] === 4) burst('sparkle', origin.x + S.p[o], S.p[o + 1], origin.z + S.p[o + 2], { count: 2 }); }
        } },
      { key: 'intro_7', min: 4.2, enter() {
          const M = TS.mug; M.g.visible = true; M.t = 0; M.awake = 0; M.g.position.set(focus.x - 0.42, 0, focus.z + 0.08); M.g.rotation.y = 0.5;
          camTo(focus.x - 0.05, 0.13, focus.z + 0.55, focus.x - 0.25, 0.07, focus.z, 3);
          // tek bir şeker fincana süzülür
          const i = 0, o = 0; S.mode[i] = 4; S.t[i] = 0; S.v[o] = focus.x - 0.1; S.v[o + 1] = 0.6; S.v[o + 2] = focus.z - 0.4;
          S.dest[o] = M.g.position.x; S.dest[o + 1] = 0.1; S.dest[o + 2] = M.g.position.z;
          h.act = 'idle'; f.face = -1.0; h.face = -0.9; b.face = -1.2;
        },
        tick(u, dt, t) {
          const M = TS.mug; M.t += dt;
          if (t > 1.5 && !M.awake) { M.awake = 1; sfx('pop', { vol: 0.8, pitch: 1.3 }); sfx('bounce', { vol: 0.6 }); burst('sparkle', origin.x + M.g.position.x, 0.1, origin.z + M.g.position.z, { count: 10 }); }
          if (M.awake) {
            M.face.scale.setScalar(Math.min(1, M.face.scale.x + dt * 4));
            const hop = Math.abs(Math.sin(M.t * 5)) * 0.04;
            M.g.position.y = hop; M.g.rotation.z = Math.sin(M.t * 5) * 0.15; M.g.rotation.y = 0.5 + Math.sin(M.t * 2.5) * 0.4;
          }
        } },
      { key: 'intro_8', min: 3.4, enter() { h.act = 'saril'; camTo(focus.x + 0.05, 0.16, focus.z + 0.42, focus.x, 0.09, focus.z - 0.02, 3); f.face = -0.4; h.face = 0.9; b.face = -0.8; b.bark = 0; },
        tick(u, dt, t) {
          const M = TS.mug; M.t += dt; M.g.position.x -= dt * 0.12; M.g.position.y = Math.abs(Math.sin(M.t * 6)) * 0.035; M.g.rotation.y = -1.6;
          b.speed = 0.12; b.hop = 0;
        } },
      { key: 'intro_9', min: 2.8, final: true, enter() {
          TS.mug.g.visible = false; h.act = 'isaret'; f.cheer = true; b.bark = 1.3; sfx('bilboBark', { vol: 0.8 }); sfx('cheer', { vol: 0.5 });
          camTo(focus.x + 0.02, 0.12, focus.z + 0.5, focus.x, 0.1, focus.z - 0.3, 3); setScale(0.1);
          for (let i = 0; i < S.n; i++) S.mode[i] = 5;
        },
        tick(u, dt) { b.bark = Math.max(0, b.bark - dt); f.face = 0.15; h.face = -0.6; b.face = 0.3; } },
      { min: 0.6, noSkip: true, enter() { white(1, 0.5); }, tick() {} },
    ];
  }
  function idleBits(dt) {   // giriş başında başlık hareketleri sürer
    const T = TS.t, f = ACT.feza, b = ACT.bilbo;
    const peek = 0.5 + 0.5 * Math.sin(T * 0.55);
    f.x = SPOT.feza[0] - 0.12 * peek; f.lean = 0.06 * peek; b.nose = 1;
  }
  function introTick(dt) { cineStep(dt); }
  function playIntro() {
    const g = G_();
    if (!g || !g.L || !g.L._storyTitle || !TS.K || CINE.on) return Promise.resolve(false);
    titlePose();
    sugarsHome(TS.sugar, SPOT.jar[0], SPOT.jar[1], SPOT.jar[2]);
    TS.K.lid.visible = true; TS.mug.g.visible = false; TS.mug.face.scale.setScalar(0.001);
    overlay(true);
    CAM_.snap = false;
    return runCine('intro', introBeats()).then(() => { const A = A_(); return true; });
  }

  // ───────────────────────── Oyun içi hikâye anları ─────────────────────────
  // Kısa sahne: dünya durmaz; kamera yumuşakça yaklaşıp Feza'nın etrafında döner, sonra oyun kamerasına döner.
  const MOM = { on: false, t: 0, dur: 0, obj: null, kind: '', x: 0, z: 0, tx: 0, tz: 0, fn: null };
  const _mp = new THREE.Vector3(), _ml = new THREE.Vector3();
  function momentCamera(dt) {
    const c = realCam(); if (!c) return;
    const g = G_(), P = g && g.P; if (!P) return;
    MOM.t += dt;
    const u = MOM.t / MOM.dur, w = ease(Math.min(MOM.t / 0.7, (MOM.dur - MOM.t) / 0.8, 1));
    const a = MOM.a0 + u * 0.9, R = MOM.R || 5.2, cx = MOM.cx ?? P.pos.x, cz = MOM.cz ?? P.pos.z;
    _mp.set(cx + Math.sin(a) * R, MOM.H || 2.4, cz + Math.cos(a) * R);
    _ml.set(cx, 1.55, cz);
    c.position.lerp(_mp, w);
    _cv.set(0, 0, -1).applyQuaternion(c.quaternion).multiplyScalar(6).add(c.position);   // önceki bakış noktası
    _cv.lerp(_ml, w);
    c.lookAt(_cv); c.updateMatrixWorld();
  }
  // oyuncu dokununca / sürükleyince hikâye anı kamerası hemen oyuna döner (Feza'nın kontrolü hiç kilitlenmez)
  addEventListener('pointerdown', e => { if (MOM.on && !(CINE.on) && e.target && e.target.tagName === 'CANVAS') MOM.t = Math.max(MOM.t, MOM.dur - 0.45); }, true);
  addEventListener('keydown', () => { if (MOM.on && !CINE.on) MOM.t = Math.max(MOM.t, MOM.dur - 0.45); }, true);
  function moment(dur, o = {}) {
    const c = realCam(), g = G_();
    MOM.on = true; MOM.t = 0; MOM.dur = dur; MOM.cx = o.x; MOM.cz = o.z; MOM.R = o.R; MOM.H = o.H;
    MOM.a0 = typeof CAM !== 'undefined' ? CAM.yaw || 0 : 0;
    return new Promise(res => { MOM.fn = res; });
  }
  // malzeme / kayıp eşya modeli (dönerek yükselir, parlar, sonra uçar)
  function trophy(kind) {
    const k = new Kit(), g = new THREE.Group();
    if (kind === 'un') {
      k.add(lathe('tsack', [[0, 0], [0.3, 0], [0.36, 0.08], [0.38, 0.35], [0.33, 0.62], [0.28, 0.72], [0.32, 0.78], [0.0, 0.8]], 24), (x, y) => (y > 0.25 && y < 0.45 ? C(0x5a9bd8) : C(0xf3e6c8)));
      k.add(SPH(), 0xffffff, [0, 0.76, 0], null, [0.24, 0.1, 0.24]);
    } else if (kind === 'yumurta') {
      k.add(SPH(), 0xfff3dc, [0, 0.45, 0], null, [0.32, 0.42, 0.32]);
      k.add(SPH(), 0xffffff, [-0.1, 0.62, 0.22], null, [0.06, 0.09, 0.04]);
    } else if (kind === 'cilek') {
      k.add(lathe('berry', [[0, 0], [0.12, 0.05], [0.28, 0.3], [0.32, 0.5], [0.26, 0.66], [0, 0.7]], 24), (x, y, z) => (Math.sin(x * 60) * Math.sin(y * 60 + z * 40) > 0.85 ? C(0xffe36a) : C(0xe8243c)));
      for (let i = 0; i < 6; i++) k.add(CONE(), 0x4fa64a, [Math.sin(i) * 0.1, 0.72, Math.cos(i) * 0.1], [Math.PI / 2 + 0.6, i, 0], [0.06, 0.2, 0.03]);
    } else if (kind === 'krema') {
      k.add(lathe('swirl', [[0, 0], [0.34, 0], [0.36, 0.1], [0.28, 0.2], [0.3, 0.28], [0.2, 0.38], [0.21, 0.46], [0.1, 0.56], [0.04, 0.66], [0, 0.7]], 28), 0xfffaf4);
      k.add(SPH(), 0xe8243c, [0, 0.72, 0], null, 0.07);
    } else if (kind === 'gozluk') {
      for (const sd of [-1, 1]) k.add(TOR(TAU, 0.14), 0xe85d8a, [sd * 0.2, 0.4, 0], null, [0.16, 0.16, 0.16]);
      k.add(TOR(Math.PI, 0.3), 0xe85d8a, [0, 0.45, 0], null, [0.05, 0.05, 0.05]);
      for (const sd of [-1, 1]) k.add(G.box(), 0xe85d8a, [sd * 0.38, 0.42, -0.15], null, [0.03, 0.03, 0.3]);
    } else if (kind === 'anahtar') {
      k.add(TOR(TAU, 0.3), 0xf2c44a, [0, 0.62, 0], null, [0.14, 0.14, 0.14]);
      k.add(CYL(12), 0xf2c44a, [0, 0.3, 0], null, [0.04, 0.42, 0.04]);
      k.add(G.box(), 0xf2c44a, [0.07, 0.14, 0], null, [0.1, 0.05, 0.04]); k.add(G.box(), 0xf2c44a, [0.06, 0.24, 0], null, [0.08, 0.05, 0.04]);
    } else {   // toka (fiyonklu)
      k.add(SPH(), 0xff6fa8, [-0.17, 0.45, 0], [0, 0, 0.4], [0.17, 0.11, 0.06]); k.add(SPH(), 0xff6fa8, [0.17, 0.45, 0], [0, 0, -0.4], [0.17, 0.11, 0.06]);
      k.add(SPH(), 0xffd1e3, [0, 0.45, 0.02], null, 0.07); k.add(G.box(), 0xd8d8e0, [0, 0.42, -0.05], null, [0.5, 0.03, 0.03]);
    }
    const m = new THREE.Mesh(k.build(), vcMat({ roughness: 0.3, emissive: 0x332211 }));
    m.position.y = -0.4; g.add(m);
    const halo = new THREE.Mesh(SPHL(), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.8, 0.45), transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(0.55); g.add(halo);
    g.userData.halo = halo;
    return g;
  }
  const FLY = [];   // havada dönen ödüller
  function flyStep(dt) {
    for (let i = FLY.length - 1; i >= 0; i--) {
      const o = FLY[i]; o.t += dt;
      const g = o.g, u = o.t;
      const rise = easeOut(u / 0.9), out = u > o.hold ? ease((u - o.hold) / (o.to ? 1.3 : 1.0)) : 0;
      if (o.to) {   // pastaya doğru yay çizerek uç
        const y0 = o.y0 + rise * o.h;
        g.position.set(o.x + (o.to.x - o.x) * out, y0 + (o.to.y - y0) * out + Math.sin(out * Math.PI) * 2.2, o.z + (o.to.z - o.z) * out);
        if (out >= 1 && !o.hit) { o.hit = true; burst('sparkle', o.to.x, o.to.y, o.to.z, { count: 26 }); burst('hearts', o.to.x, o.to.y + 0.5, o.to.z, { count: 8 }); sfx('levelup', { vol: 0.5 }); }
      } else g.position.set(o.x, o.y0 + rise * o.h + out * 6, o.z);
      g.rotation.y += dt * (3 + out * 10);
      const s = (0.3 + 0.7 * easeOut(u / 0.5)) * (1 - out * 0.85) * o.s;
      g.scale.setScalar(s);
      if (g.userData.halo) g.userData.halo.material.opacity = 0.1 + 0.06 * Math.sin(u * 8);
      if (Math.random() < dt * 12) burst('sparkle', g.position.x, g.position.y, g.position.z, { count: 2 });
      if (out >= 1) { if (g.parent) g.parent.remove(g); disposeTree(g); FLY.splice(i, 1); }
    }
  }
  function spawnTrophy(kind, x, y, z, o = {}) {
    if (typeof scene === 'undefined') return;
    const g = trophy(kind);
    scene.add(g);
    FLY.push({ g, t: 0, x, z, y0: y, h: o.h ?? 1.6, hold: o.hold ?? 2.6, s: o.s ?? 1, to: o.to || null });
    burst('sparkle', x, y + 1, z, { count: 18 });
  }
  function dance(dur) {   // Hala + Feza + Bilbo sevinç dansı (oyun modelleri; Hala'nın kendi kancası varsa onu kullanır)
    const HL = H_(); if (HL && typeof HL.celebrate === 'function') { try { HL.celebrate('dans', dur); } catch (e) { /* ignore */ } }
    const g = G_(); if (g && g.emit) g.emit('storyDance', { dur });
    if (g && g.storyCheer) { g.storyCheer(dur); for (let t = 1.4; t < dur; t += 1.5) later(t, () => g.storyCheer(0.1, true)); }
  }

  // neşelenmiş Koca Pasta (finalin ilk anı: boss gitmiş olsa da sevinçle zıplar, sonra parıltıya dönüşür)
  function happyCake() {
    const g = new THREE.Group(), k = new Kit(), kf = new Kit();
    const pink = 0xffb3cf, cream = 0xfff6ee, berry = 0xe8243c;
    k.add(lathe('hc1', [[0, 0], [1.7, 0], [1.75, 0.08], [1.72, 1.1], [1.6, 1.18], [0, 1.2]], 40), pink);
    k.add(lathe('hc2', [[0, 0], [1.25, 0], [1.3, 0.08], [1.27, 1.0], [1.15, 1.08], [0, 1.1]], 40), cream, [0, 1.15, 0]);
    k.add(lathe('hc3', [[0, 0], [0.8, 0], [0.84, 0.06], [0.82, 0.8], [0.72, 0.88], [0, 0.9]], 36), pink, [0, 2.2, 0]);
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; k.add(SPH(), cream, [Math.sin(a) * 1.68, 1.15, Math.cos(a) * 1.68], null, [0.2, 0.16, 0.2]); }
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; k.add(SPH(), 0xffd1e0, [Math.sin(a) * 1.24, 2.22, Math.cos(a) * 1.24], null, [0.15, 0.12, 0.15]); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; k.add(SPH(), berry, [Math.sin(a) * 0.55, 3.15, Math.cos(a) * 0.55], null, [0.14, 0.17, 0.14]); }
    k.add(SPH(), berry, [0, 3.35, 0], null, 0.24); k.add(CYL(8), 0x4fa64a, [0.05, 3.62, 0], [0, 0, 0.3], [0.03, 0.25, 0.03]);
    for (let i = 0; i < 40; i++) { const a = i * 2.39996, r = 1.0 + (i % 3) * 0.2, y = 0.3 + (i % 5) * 0.18; if (Math.cos(a) > 0.5) continue; k.add(CYL(6), SUGAR_COL[i % 6], [Math.sin(a) * 1.73, y, Math.cos(a) * 1.73], [Math.PI / 2, a, 0.6], [0.025, 0.1, 0.025]); }
    // yüz (ön, orta kat): mutlu kapalı gözler ^ ^, kocaman gülüş, yanaklar
    for (const sd of [-1, 1]) {
      kf.add(TOR(Math.PI, 0.22), 0x4a2a2a, [sd * 0.42, 1.78, 1.24], null, [0.17, 0.15, 0.12]);
      kf.add(SPH(), 0xff7f9f, [sd * 0.72, 1.5, 1.14], null, [0.17, 0.1, 0.06]);
    }
    kf.add(SPH(), 0x7a2a3a, [0, 1.42, 1.22], null, [0.32, 0.2, 0.08]);
    kf.add(SPH(), 0xff8fa8, [0, 1.36, 1.27], null, [0.18, 0.08, 0.04]);
    kf.add(G.box(), 0xffffff, [0, 1.56, 1.27], null, [0.34, 0.06, 0.03]);
    const body = new THREE.Mesh(k.build(), vcMat({ roughness: 0.45 })), face = new THREE.Mesh(kf.build(), vcMat({ roughness: 0.3 }));
    body.castShadow = true; g.add(body, face);
    return g;
  }

  // ───────────────────────── Final ─────────────────────────
  const END = { K: null, sugar: null, hidden: [], blown: false, t: 0 };
  function endingBeats() {
    const g = G_(), P = g.P, f = ACT.feza, b = ACT.bilbo, h = ACT.hala;
    const focus = { x: 0.35, z: 0.75 };
    let S = null, built = false;
    const setScale = s => {
      for (const [who, A] of [['feza', f], ['hala', h], ['bilbo', b]]) { const p = SPOT.group[who]; A.x = focus.x + (p[0] - focus.x) * s; A.z = focus.z + (p[1] - focus.z) * s; A.s = s; }
      CINE.near = clamp(0.5 * s, 0.012, 0.5);
    };
    const buildSet = () => {   // normal boy mutfak: dünya gizlenir, karakterler mutfağa alınır
      if (built) return; built = true;
      origin = { x: P.pos.x, z: P.pos.z };
      const K = END.K = buildKitchen({ finished: true });
      K.g.position.set(origin.x, 0, origin.z); scene.add(K.g);
      S = END.sugar = makeSugars(K.g);
      for (let i = 0; i < S.n; i++) S.mode[i] = 5;
      END.puffs = makePuffs(K.g);
      const keep = new Set([K.g, g.H && g.H.root, g.Bilbo && g.Bilbo.root, H_() && H_()._S && H_()._S.root]);
      END.hidden = [];
      for (const c of scene.children) { if (keep.has(c) || c.isLight || c.isCamera || !c.visible) continue; if (c.type === 'Object3D' && c.children.some(x => x.isLight)) continue; c.visible = false; END.hidden.push(c); }
      if (typeof POST !== 'undefined') { END.post = { sat: POST.saturation, vig: POST.vignette }; POST.vignette = 0.3; }
      if (typeof scene !== 'undefined' && scene.fog) { END.fog = scene.fog.color.getHex(); scene.fog.color.set(0xf6e2cc); }
    };
    const gather = (cx, cz) => {   // dünyadaki şekerler karakterlere akar
      if (!END.tmpSugar) { END.tmpSugar = makeSugars(scene); }
      const T = END.tmpSugar;
      T.center.set(cx, 1.0, cz);
      for (let i = 0; i < T.n; i++) { const o = i * 3, a = Math.random() * TAU, r = 7 + Math.random() * 9;
        T.mode[i] = 6; T.t[i] = -Math.random() * 1.5; T.v[o] = cx + Math.cos(a) * r; T.v[o + 1] = 1 + Math.random() * 5; T.v[o + 2] = cz + Math.sin(a) * r;
        T.p[o] = T.v[o]; T.p[o + 1] = T.v[o + 1]; T.p[o + 2] = T.v[o + 2]; }
    };
    return [
      { key: 'son_1', min: 3.8, enter() {
          origin = { x: P.pos.x, z: P.pos.z }; ACT.worldMode = true;
          camTo(0.6, 3.0, 8.4, 0, 1.8, -3, 1.5, true); camTo(0.4, 2.6, 7.2, 0, 1.9, -3.2, 1.2);
          burst('hearts', P.pos.x, 2, P.pos.z, { count: 16 });
          if (typeof ODAB !== 'undefined' && ODAB.celebrate) { try { ODAB.celebrate(); } catch (e) { /* ignore */ } }   // Pasta Krallığı'nın havai fişekleri bizimle aynı anda
          if (!END.cake) { END.cake = happyCake(); scene.add(END.cake); }
          END.cake.position.set(P.pos.x + 0.3, 0, P.pos.z - 5.2); END.cake.scale.setScalar(0.9); END.cake.visible = true;
        },
        tick(u, dt, t) {   // Koca Pasta sevinçle zıplar, kalpler saçar
          const c = END.cake; if (!c) return;
          const hop = Math.abs(Math.sin(t * 4.2));
          c.position.y = hop * 0.45; c.scale.set(0.9 * (1 + (1 - hop) * 0.08), 0.9 * (1 - (1 - hop) * 0.1), 0.9 * (1 + (1 - hop) * 0.08));
          c.rotation.z = Math.sin(t * 2.1) * 0.06;
          if ((t % 0.7) < dt) burst('hearts', c.position.x, 3.4, c.position.z, { count: 6 });
        } },
      { key: 'son_2', min: 4.2, enter() { gather(P.pos.x, P.pos.z); sfx('star', { vol: 0.8 }); },
        tick(u, dt, t) {
          camTo(0.2, 2.0 + u, 6.2 - u * 1.5, 0, 1.4, -1.5, 1.5);
          const c = END.cake;
          if (c && c.visible) {   // pasta parıltıya dönüşüp küçülür; şekerleri karakterlere akar
            const k = clamp(t / 2.4, 0, 1); c.scale.setScalar(0.9 * (1 - ease(k))); c.position.y = Math.sin(k * Math.PI) * 0.8; c.rotation.y += dt * (2 + k * 8);
            if ((t % 0.15) < dt) burst('sparkle', c.position.x + (Math.random() - 0.5) * 3, 1 + Math.random() * 2.5, c.position.z, { count: 4 });
            if (k >= 1) c.visible = false;
          }
          if (t > 3.2 && !this._w) { this._w = true; white(1, 0.5); }
        } },
      // mutfaktayız, minicikten normal boya
      { min: 3.4, noSkip: false, enter() {
          buildSet(); ACT.worldMode = false;
          if (END.tmpSugar) { END.tmpSugar.im.parent && END.tmpSugar.im.parent.remove(END.tmpSugar.im); disposeTree(END.tmpSugar.im); END.tmpSugar = null; }
          f.face = 0.2; h.face = 0.3; b.face = -0.3; f.cheer = false; h.act = 'saskin'; h.y = 0; b.y = 0; b.nose = 0; b.lick = 0;
          setScale(0.1); white(0, 0.8); sfx('levelup', { vol: 0.7 });
        },
        tick(u, dt, t) {
          const s = 0.1 + 0.9 * ease(clamp((t - 0.4) / 2.6, 0, 1));
          setScale(s);
          camTo(focus.x + 0.5 * s, 1.5 * s + 0.02, focus.z + 3.4 * s + 0.05, focus.x, 0.75 * s, focus.z, 6);
          if ((t % 0.4) < dt) burst('sparkle', origin.x + focus.x, 0.3 + s, origin.z + focus.z, { count: 5 });
        } },
      { key: 'son_3', min: 3.6, enter() {
          setScale(1);
          white(0.8, 0.15, [0.1, 0]);
          // Hala adanın arkasında mumları yakar, Feza ve Bilbo önde
          Object.assign(h, { x: 0.3, z: -1.75, y: HALA_STEP, face: -0.55, act: 'mum', s: 1 });
          Object.assign(f, { x: 0.45, z: -0.05, face: -2.3, s: 1, cheer: false });
          Object.assign(b, { x: 1.2, z: 0.35, face: -2.0, s: 1, nose: 0, sit: 1 });
          camTo(-1.45, 2.05, 2.9, 0.0, 1.55, -1.0, 2, true);
          END.lit = 0;
        },
        tick(u, dt, t) {
          const K = END.K;
          const n = Math.min(K.candles.length, Math.floor(t / 0.45));
          for (let i = END.lit; i < n; i++) { const c = K.candles[i]; c.on = true; c.f.visible = true; sfx('pop', { vol: 0.5, pitch: 1.6 }); burst('sparkle', origin.x + SPOT.cake[0] + c.x, SPOT.cake[1] + 0.13 + 0.8, origin.z + SPOT.cake[2] + c.z, { count: 3 }); }
          END.lit = n;
        } },
      { key: 'son_ufle', min: 3.2, enter() {
          camTo(-1.2, 1.85, 1.6, -0.2, 1.6, -1.0, 2);
          for (const c of END.K.candles) { c.on = true; c.f.visible = true; }
          const bt = ov && ov.querySelector('.st-blow'); if (bt) bt.classList.remove('st-hide');
          CINE.wait = 'blow'; END.blowT = 0;
        },
        tick(u, dt, t) {
          END.blowT += dt;
          if (CINE.wait === 'blow' && END.blowT > 14) blowNow();   // dokunmazsa kendiliğinden üfler
        } },
      { key: 'son_4', min: 3.6, enter() {
          const dl = END.K.dollop; if (dl) { dl.visible = true; dl.position.set(0.52, 0, 0.5); dl.scale.setScalar(1.5); burst('sparkle', origin.x + 0.52, 0.3, origin.z + 0.5, { count: 8 }); }
          camTo(-0.1, 1.9, 4.6, 0.45, 0.85, 0.0, 2, true);
          Object.assign(b, { x: 1.28, z: 0.5, face: -Math.PI / 2, sit: 0, nose: 1, lick: 1, y: 0 });
          Object.assign(f, { x: -0.55, z: 0.1, face: 0.9 });
          f.cheer = true; h.act = 'alkis';
          burst('confetti', origin.x - 0.3, 2.4, origin.z - 0.4, { count: 30 }); sfx('cheer', { vol: 0.6 });
        },
        tick(u, dt, t) { b.bark = (t % 0.6) < 0.25 ? 0.35 : 0; const dl = END.K.dollop; if (dl) dl.scale.setScalar(Math.max(0.3, 1.5 - t * 0.3)); } },
      { key: 'son_5', min: 3.6, enter() {
          Object.assign(h, { x: -0.8, z: 0.45, y: 0, face: 1.45, act: 'saril' });
          Object.assign(f, { x: -0.25, z: 0.5, face: -1.45, cheer: false });
          Object.assign(b, { x: 0.95, z: 0.35, face: -1.2, lick: 0, nose: 0, y: 0, sit: 1 });
          if (END.K.dollop) END.K.dollop.visible = false;
          camTo(-0.45, 1.8, 3.5, -0.5, 1.2, 0.45, 2);
          burst('hearts', origin.x - 0.65, 1.6, origin.z + 0.3, { count: 14 });
        } },
      { min: 10, final: true, enter() {   // jenerik
          if (!built) { buildSet(); ACT.worldMode = false; white(0, 0.8); }   // "Geç" ile doğrudan buraya gelindiyse
          if (END.tmpSugar) { disposeTree(END.tmpSugar.im); END.tmpSugar = null; }
          if (END.cake) END.cake.visible = false;
          for (const c of END.K.candles) { c.on = false; c.f.visible = false; }
          if (END.K.dollop) END.K.dollop.visible = false;
          setScale(1); CINE.near = 0.5; const bt = ov && ov.querySelector('.st-blow'); if (bt) bt.classList.add('st-hide'); CINE.wait = null;
          credits(0); h.act = 'dans'; f.cheer = true; b.bark = 0; b.sit = 0;
          Object.assign(f, { x: -0.2, z: 0.6, face: 0.2 }); Object.assign(h, { x: -0.9, z: 0.5, y: 0, face: 0.4 }); Object.assign(b, { x: 0.95, z: 0.25, face: -0.5, y: 0 });
          END.t = 0;
        },
        tick(u, dt, t) {
          END.t += dt; credits(END.t);
          const a = 0.6 * Math.sin(t * 0.25);
          camTo(-0.2 + Math.sin(a) * 3.6, 1.6, 0.6 + Math.cos(a) * 3.6, -0.2, 1.0, 0.0, 1.2);
          b.hop = Math.abs(Math.sin(t * 4)) * 0.6; b.y = Math.abs(Math.sin(t * 4)) * 0.12;
          if ((t % 1.2) < dt) burst('confetti', origin.x + (Math.random() - 0.5) * 3, 3, origin.z + (Math.random() - 0.5) * 2, { count: 12 });
        } },
      { key: 'son_6', min: 4.6, noSkip: true, enter() {}, tick(u, dt, t) { END.t += dt; credits(END.t); if (t > CINE.dur - 0.7 && !this._w) { this._w = true; white(1, 0.6); } } },
    ];
  }
  function blowNow() {
    if (CINE.wait !== 'blow' || !END.K) return;
    CINE.wait = null; CINE.bt = Math.max(CINE.bt, CINE.dur - 0.1);
    const bt = ov && ov.querySelector('.st-blow'); if (bt) bt.classList.add('st-hide');
    for (const c of END.K.candles) { c.on = false; c.f.visible = false; puff(END.puffs, SPOT.cake[0] + c.x, SPOT.cake[1] + 0.13 + 0.8, SPOT.cake[2] + c.z, 1, 0.25, 0.35); }
    sfx('whoosh', { vol: 0.8 }); sfx('cheer', { vol: 0.8 }); sfx('levelup', { vol: 0.6 });
    for (let i = 0; i < 4; i++) later((i * 280) / 1000, () => burst('confetti', origin.x - 0.4 + (Math.random() - 0.5) * 2, 2.8, origin.z - 0.4, { count: 26 }));
    ACT.feza.cheer = true;
  }
  // jenerik: sırayla beliren kartlar (sinematik zamanıyla; okuma bilmeyen çocuk için büyük ve kısa)
  const CREDITS = [
    ['', 'Feza, Bilbo ve Aytuğ Hala', 'Dev Ev Macerası'],
    ['Kahraman', 'Feza', '⭐'],
    ['Pastacı ve anlatıcı', 'Aytuğ Hala', '🍰'],
    ['Burnu en akıllı köpek', 'Bilbo', '🐾'],
    ['Neşelenen huysuzlar', 'Uykucu Süpürge · Düdüklü Tencere', 'Dondurma Kralı · Koca Pasta'],
    ['Sevgiyle yapıldı', 'Feza için', '💛'],
    ['', 'İyi ki varsın Feza!', '🎂'],
  ];
  function credits(t) {
    const el = ov && ov.querySelector('.st-credits'); if (!el) return;
    const per = 2.05, i = Math.min(CREDITS.length - 1, Math.floor(t / per));
    if (el._i !== i) {
      el._i = i; const c = CREDITS[i];
      el.innerHTML = `<div class="st-card">${c[0] ? `<b>${c[0]}</b>` : ''}<span>${c[1]}</span><i>${c[2]}</i></div>`;
    }
    el.classList.add('on');
    const k = (t - i * per) / per, card = el.firstChild;
    if (card) { const a = i === CREDITS.length - 1 ? Math.min(1, k * 4) : Math.min(1, k * 4, (1 - k) * 5); card.style.opacity = String(Math.max(0, a)); card.style.transform = `translateY(${(1 - Math.min(1, k * 4)) * 18}px) scale(${0.92 + 0.08 * Math.min(1, k * 4)})`; }
  }
  function ownsWorld(dt) {   // GAME.update 'end' durumunda: final sahnesi karakterleri kendisi oynatır
    if (!(CINE.on && CINE.kind === 'ending')) return false;
    const g = G_();
    cineStep(dt);
    if (!CINE.on) return false;
    END.T = (END.T || 0) + dt;
    if (ACT.worldMode) {   // Pasta Krallığı: oyundaki yerlerinde, sevinçle
      const P = g.P;
      ACT.feza.x = 0; ACT.feza.z = 0; ACT.feza.face = 0.0; ACT.feza.cheer = true; ACT.feza.s = 1;
      ACT.hala.x = -1.3; ACT.hala.z = -0.6; ACT.hala.y = 0; ACT.hala.face = 0.5; ACT.hala.act = 'alkis'; ACT.hala.s = 1; ACT.feza.y = 0;
      ACT.bilbo.x = 1.2; ACT.bilbo.z = -0.2; ACT.bilbo.face = -0.6; ACT.bilbo.s = 1; ACT.bilbo.nose = 0; ACT.bilbo.y = 0;
      origin = { x: P.pos.x, z: P.pos.z };
    }
    poseChars(dt, END.T);
    if (END.puffs) puffStep(END.puffs, dt);
    if (END.sugar) sugarsStep(END.sugar, dt, END.T);
    if (END.tmpSugar) sugarsStep(END.tmpSugar, dt, END.T);
    if (END.K) for (const c of END.K.candles) if (c.on) { c.f.scale.set(0.024 + 0.004 * Math.sin(END.T * 23 + c.x * 50), 0.045 + 0.009 * Math.sin(END.T * 17 + c.z * 40), 0.024); }
    return true;
  }
  function endingCleanup() {
    for (const c of END.hidden) c.visible = true;
    END.hidden = [];
    if (END.K) { disposeTree(END.K.g); END.K = null; END.sugar = null; END.puffs = null; }
    if (END.tmpSugar) { disposeTree(END.tmpSugar.im); END.tmpSugar = null; }
    if (END.cake) { disposeTree(END.cake); END.cake = null; }
    restoreWeapon();
    if (END.post && typeof POST !== 'undefined') { POST.vignette = END.post.vig; END.post = null; }
    if (END.fog != null && scene.fog) { scene.fog.color.setHex(END.fog); END.fog = null; }
    ACT.worldMode = false;
  }
  let endingRan = false;
  function ending(o) {
    const g = G_(); if (!g || !g.P) { line('son', 'Pasta hazır! İyi ki varsın Feza!'); return true; }
    if (CINE.on) return true;
    endingRan = true; CH.noWeapon = false; hideWeapon(); STORY.endingDone = false;
    overlay(true, { skip: true });
    runCine('ending', endingBeats()).then(() => { endingCleanup(); STORY.endingDone = true; });
    return true;
  }

  // ───────────────────────── 07_game kancaları ─────────────────────────
  const seen = { zone: {}, area: {}, introAt: -1e9 };
  let pendingPasta = false, pastaShown = false;
  // Yeni oyun başlarken (07 newGame) — masa yüklendi; giriş sinematiği UI'da çoktan oynadı. Dönen: anlatım süresi (s).
  function intro(o) {
    seen.zone = { masa: true }; seen.area = {}; seen.introAt = performance.now(); pendingPasta = false; pastaShown = false; STORY.endingDone = false;
    const a = line('masa_ilk', 'Burası benim mutfak masam. Pastamız da burada bekliyor!', 3);
    const b = line('masa_ilk2', null, 2);
    seen.cakeIds = malzemeIds();
    const g = G_(), L = g && g.L, cs = L && L.cakeSpot;
    if (cs) later(0.6, () => { if (G_().L === L) moment(2.8, { x: cs.x, z: cs.z, R: 10, H: 5.2 }); });
    return Math.max(a, b);
  }
  function hushChatter(sec, rank) { const A = A_(); if (A && A.hush) try { A.hush(sec, rank); } catch (e) { /* ignore */ } }
  // boss neşelenince: birkaç saniye yalnız boss ve hikâye cümleleri (kutlamada 10 cümlelik kuyruk birikmesin)
  if (typeof GAME !== 'undefined' && GAME.on) GAME.on('happy', d => { if (d && d.boss) hushChatter(6, 4); });
  function malzemeIds() { const g = G_(); const m = g && g.P && g.P.malzemeler; return m ? Object.keys(m).filter(k => m[k]) : []; }
  function malzemeCount() { const g = G_(); const m = g && g.P && g.P.malzemeler; return m ? Object.keys(m).filter(k => m[k]).length : 0; }
  function zone(o) {
    hushChatter(2.5, 3);   // oda girişi: ilk anda yalnız hikâye/görev cümleleri (yetenek, övgü düşer)
    restoreXray();   // başlıktan (Devam Et / harita) oyuna geçiş
    if (!seen.cakeIds) seen.cakeIds = malzemeIds();   // kayıttan devam: zaten pastadaki malzemeler yeniden uçmasın
    const id = o && o.id; if (!id) return;
    if (id === 'masa') {
      // yeni oyunda 07 önce zone() sonra intro() çağırır: bir an bekle, intro geldiyse masa_ilk zaten anlatılıyor
      later(0.15, () => {
        if (performance.now() - seen.introAt < 1500) return;
        const fresh = deliverIngredients();
        if (!pastaShown && malzemeCount() >= 3) { pastaShown = true; later(fresh ? 3.2 : 0, pastaScene); return; }
        if (fresh) { line('masa_donus1', 'Masaya döndük! Bak, pastamız büyüyor.', 3); seen.zone.masa = true; return; }   // (balkon anı bir sonraki dönüşte: tek cümle)
        if (balkonScene()) { seen.zone.masa = true; return; }
        if (seen.zone.masa) line(pick(['masa_donus1', 'masa_donus2', 'masa_donus3']), 'Masaya döndük!', 2);
        seen.zone.masa = true;
      });
      return;
    }
    // bölümün kendi giriş cümlesi varsa (BOLUM.define line) onu yinelemeyelim; görev cümlesi her girişte
    const Z = typeof ZONES !== 'undefined' && o && Number.isInteger(o.index) ? ZONES[o.index] : null, own = !!(Z && Z.line);
    if (!seen.zone[id]) { seen.zone[id] = 1; if (!own) line('oda_' + id, null, 3); line('gorev_' + id, null, 2); }
    else line('gorev_' + id, null, 2);
  }
  // masaya yeni gelen malzemeler (odalarda bulunanlar) havada dönüp pastaya uçar
  function deliverIngredients() {
    const g = G_(), L = g && g.L, cs = L && L.cakeSpot, P = g && g.P;
    const ids = malzemeIds(), had = seen.cakeIds || [], fresh = ids.filter(id => had.indexOf(id) < 0);
    seen.cakeIds = ids;
    if (!fresh.length || !cs || !P) return 0;
    fresh.forEach((id, i) => later(0.9 + i * 0.7, () => {
      if (G_().L !== L) return;
      spawnTrophy(id, P.pos.x + 0.4 * (i - (fresh.length - 1) / 2), 1.0, P.pos.z + 0.6, { h: 1.2, hold: 1.4, s: 1.0, to: { x: cs.x, y: 3.2, z: cs.z } });
    }));
    later(1.4, () => { if (G_().L === L) moment(2.4, { x: cs.x, z: cs.z, R: 9, H: 4.6 }); });   // kısa pasta anı, sonra kamera Feza'ya döner
    if (g.storyCheer) later(2.4, () => g.storyCheer(2, true));
    return fresh.length;
  }
  // Balkon Bahçesi (isteğe bağlı oda): ilk oda bitip masaya dönünce bir kez "balkon kapısı da açık" anı
  function balkonScene() {
    const g = G_(), L = g && g.L, P = g && g.P;
    if (seen.balkon || !L || !P || !P.bossNese || !Object.keys(P.bossNese).some(k => P.bossNese[k])) return false;
    const st = L.stations && L.stations.find(s => s.id === 'kapi_balkon'); if (!st) return false;
    if (P.bossNese.balkon) { seen.balkon = true; return false; }
    seen.balkon = true;
    line('balkon_acildi', 'Bak bak, balkon kapısı da açık!', 3);
    moment(Math.max(3.5, lineLen('balkon_acildi') + 0.8), { x: st.x, z: st.z, R: 8.5, H: 3.8 });
    for (let i = 0; i < 3; i++) later(0.5 + i * 0.8, () => burst('sparkle', st.x, 1.6, st.z, { count: 16, color: '#ffe36a' }));
    const HL = H_(); if (HL && HL.pointTo) try { HL.pointTo(st.x, st.z); } catch (e) { /* ignore */ }
    return true;
  }
  function pastaScene() {   // Pasta Krallığı açıldı: masadaki pembe kapıya kamera gider, kıvılcımlar
    const g = G_(), L = g && g.L;
    const st = L && L.stations && L.stations.find(s => s.id === 'kapi_pasta');
    later(1.4, () => {
      line('pasta_acildi', 'Üç malzeme tamam! Pasta Krallığı açıldı!', 3); line('pasta_acildi2', null, 3);
      if (st) {
        moment(lineLen('pasta_acildi') + lineLen('pasta_acildi2') + 1.2, { x: st.x, z: st.z, R: 8.5, H: 3.6 });
        for (let i = 0; i < 6; i++) later((600 + i * 700) / 1000, () => { burst('magic', st.x, 1.5, st.z, { count: 20, color: '#ff8fd8' }); burst('confetti', st.x, 3, st.z, { count: 14 }); });
        const HL = H_(); if (HL && HL.pointTo) try { HL.pointTo(st.x, st.z); } catch (e) { /* ignore */ }
      }
      sfx('unlock', { vol: 0.9 });
    });
  }
  function area(a) {
    if (!a || a.boss) return;
    const g = G_(), Z = typeof ZONES !== 'undefined' && g ? ZONES[g.P.zone | 0] : null, zid = Z && Z.id;
    if (!zid || zid === 'masa') return;
    const k = zid + ':' + a.index; if (seen.area[k]) return; seen.area[k] = 1;
    if (a.index === 0 && !seen.zone['_a' + zid]) { seen.zone['_a' + zid] = 1; }   // ilk alan: oda girişi zaten konuştu; yine de kısa söyle
    // bölüm ajanı kendi alan cümlesini söylüyorsa (aynı anda) bizimki düşer: öncelik 0 = konuşma varken söylenmez
    const key = 'alan_' + zid + '_' + (a.index + 1);
    if (!hasLine(key) && hasLine(zid + '_a' + (a.index + 1))) return;   // bölümün kendi alan cümleleri var (ör. balkon_a1)
    later(0.3, () => { if (speaking()) return; if (hasLine(key)) line(key, null, 0); else line(a.index & 1 ? 'alan_genel2' : 'alan_genel1', null, 0); });
  }
  function ingredient(id) {
    const g = G_(), P = g && g.P;
    const d = line('malzeme_' + id, (MALZEME[id] || id) + ' bulundu! Pastaya bir adım daha!', 4);
    const d2 = line(pick(['dans_1', 'dans_2', 'dans_3']), null, 3);
    if (P) {
      spawnTrophy(id, P.pos.x + 0.3, 1.0, P.pos.z + 1.1, { h: 0.9, hold: Math.max(2.8, d * 0.9), s: 1.0 });
      moment(Math.max(4, d + 1.2));
      dance(Math.max(4, d + d2));
      for (let i = 0; i < 5; i++) later((300 + i * 600) / 1000, () => { burst('confetti', P.pos.x + (Math.random() - 0.5) * 3, 3, P.pos.z + (Math.random() - 0.5) * 3, { count: 18 }); burst('hearts', P.pos.x, 1.6, P.pos.z, { count: 5 }); });
      sfx('levelup', { vol: 0.7 }); later((400) / 1000, () => sfx('cheer', { vol: 0.6 }));
    }
    if (malzemeCount() >= 3) pendingPasta = true;
    return d;
  }
  function lostItem(o) {
    const id = o && o.id, g = G_();
    const key = 'kayip_' + id;
    // oda ajanı kendi "buldum" cümlesini söylediyse yinelemeyelim (konuşma sürerken bizimki düşer)
    const d = speaking() ? 0 : hasLine(key) ? line(key, null, 3) : line(pick(['kayip_genel1', 'kayip_genel2']), 'Bilbo ' + ((KAYIP[id] || 'kayıp eşyayı').toLocaleLowerCase('tr')) + ' buldu!', 3);
    const B = g && g.Bilbo;
    const x = B ? B.root.position.x : g && g.P.pos.x, z = B ? B.root.position.z : g && g.P.pos.z;
    if (x != null) {
      spawnTrophy(KAYIP[id] ? id : 'toka', x, 0.6, z, { h: 1.0, hold: 2.4, s: 0.9 });
      burst('hearts', x, 1.2, z, { count: 10 });
      sfx('chest', { vol: 0.6 }); later((350) / 1000, () => sfx('bilboBark', { vol: 0.6 }));
    }
    const HL = H_(); if (HL && typeof HL.celebrate === 'function') { try { HL.celebrate('alkis', 2.5); } catch (e) { /* ignore */ } }
    if (g && g.storyCheer) g.storyCheer(1.6, true);
    return d;
  }
  function locked(o) { return line('pasta_kilitli', 'Önce üç malzemeyi bulalım!', 2); }
  function station(st) { /* istasyon anlatımları merkez ajanında */ }

  // her kare (09_ui kamera kancasından): uçan ödüller + an kamerası süresi
  const TQ = [];   // sinematik/oyun zamanıyla zamanlayıcı (__step ile de doğru)
  function later(t, fn) { TQ.push({ t, fn }); }
  function frame(dt) {
    for (let i = TQ.length - 1; i >= 0; i--) { const q = TQ[i]; q.t -= dt; if (q.t <= 0) { TQ.splice(i, 1); try { q.fn(); } catch (e) { console.warn('STORY later', e); } } }
    if (FLY.length) flyStep(dt);
    if (MOM.on && MOM.t >= MOM.dur) { MOM.on = false; const f = MOM.fn; MOM.fn = null; if (f) f(); }
  }
  function cameraHook(dt, cam) {
    window.__storyCam = cam;
    frame(dt);
    return cameraImpl(dt, cam);
  }
  function cameraImpl(dt, c) {
    const g = G_(); if (!g || !c) return false;
    const title = g.state === 'title' && g.L && g.L._storyTitle;
    const ending_ = CINE.on && CINE.kind === 'ending';
    if (!title && !ending_ && !MOM.on) { if (c.near !== 0.5 || c.fov !== 40) restoreNear(); return false; }
    if (MOM.on && !title && !ending_) { momentCamera(dt); return true; }
    if (title && !CINE.on && typeof ICON !== 'undefined' && ICON) {   // simge kamerası
      camTo(ICONP.cam[0], ICONP.cam[1], ICONP.cam[2], ICONP.look[0], ICONP.look[1], ICONP.look[2], 3, true); CINE.near = 0.3;
    } else if (title && !CINE.on && !window.__camHold) titleCamera();   // (__camHold: QA yakın çekim)
    const k = 1 - Math.exp(-CAM_.k * dt);
    CAM_.pos.lerp(CAM_.tpos, CAM_.snap ? 1 : k); CAM_.look.lerp(CAM_.tlook, CAM_.snap ? 1 : k); CAM_.snap = false;
    CAM_.fov += (CAM_.tfov - CAM_.fov) * k;
    c.position.copy(CAM_.pos);
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
.st-ov{position:fixed;inset:0;z-index:40;touch-action:none;-webkit-user-select:none;user-select:none;cursor:pointer}
.st-white{position:absolute;inset:0;background:#fffaf2;opacity:0;pointer-events:none}
.st-skip{position:absolute;top:calc(env(safe-area-inset-top,0px) + 16px);right:calc(env(safe-area-inset-right,0px) + 16px);min-width:120px;height:72px;padding:0 22px;border-radius:40px;border:4px solid #fff;
 background:linear-gradient(#ffb36b,#ff7f50);color:#fff;font:900 26px/1 "Avenir Next Rounded","Arial Rounded MT Bold",ui-rounded,system-ui,sans-serif;box-shadow:0 6px 0 #c4502c,0 10px 20px rgba(0,0,0,.25);opacity:.88}
.st-skip:active{transform:translateY(4px);box-shadow:0 2px 0 #c4502c}
.st-blow{position:absolute;left:50%;bottom:12%;transform:translateX(-50%);width:210px;height:210px;border-radius:50%;border:7px solid #fff;
 background:radial-gradient(circle at 35% 30%,#bff0ff,#4fb8ff 60%,#2a7fd6);color:#fff;font:900 34px/1 "Avenir Next Rounded","Arial Rounded MT Bold",ui-rounded,system-ui,sans-serif;
 display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:76px;box-shadow:0 0 0 0 rgba(255,255,255,.7),0 14px 30px rgba(0,0,0,.3);animation:st-pulse 1.1s ease-in-out infinite}
.st-blow span{font-size:36px;text-shadow:0 3px 0 rgba(0,0,0,.25)}
.st-hide{display:none!important}
@keyframes st-pulse{0%,100%{transform:translateX(-50%) scale(1);box-shadow:0 0 0 0 rgba(255,255,255,.7),0 14px 30px rgba(0,0,0,.3)}50%{transform:translateX(-50%) scale(1.08);box-shadow:0 0 0 26px rgba(255,255,255,0),0 14px 30px rgba(0,0,0,.3)}}
.st-credits{position:absolute;inset:0;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .8s}
.st-credits.on{opacity:1}
.st-card{position:absolute;left:50%;top:9%;translate:-50% 0;min-width:46%;max-width:86%;padding:18px 34px 20px;border-radius:30px;text-align:center;color:#fff;
 background:linear-gradient(rgba(255,120,170,.82),rgba(190,70,140,.82));border:4px solid rgba(255,255,255,.85);box-shadow:0 10px 30px rgba(90,20,60,.3);
 font-family:"Chalkboard SE","Marker Felt","Segoe Print","Comic Sans MS",cursive;text-shadow:0 3px 0 rgba(120,30,80,.55)}
.st-card b{display:block;font-size:24px;color:#fff1a8;font-weight:700;margin-bottom:4px}.st-card span{display:block;font-size:46px;font-weight:900;line-height:1.1}
.st-card i{display:block;font-style:normal;font-size:30px;margin-top:6px}
@media (max-width:820px){.st-card span{font-size:34px}.st-card b{font-size:20px}}
.sl-logo{display:flex;flex-direction:column;align-items:center;font-family:"Chalkboard SE","Marker Felt","Segoe Print","Comic Sans MS",cursive;line-height:1;filter:drop-shadow(0 6px 0 rgba(90,30,60,.35)) drop-shadow(0 12px 18px rgba(0,0,0,.25))}
.sl-row{display:flex;align-items:flex-end;justify-content:center;gap:.04em;white-space:nowrap}
.sl-big{font-size:calc(var(--k,1) * 104px);font-weight:900}
.sl-mid{font-size:calc(var(--k,1) * 50px);font-weight:900;margin-top:-.08em}
.sl-l{display:inline-block;-webkit-text-stroke:.09em #fff;paint-order:stroke fill;animation:st-wob 2.6s ease-in-out infinite}
.sl-l:nth-child(2n){animation-delay:-.6s}.sl-l:nth-child(3n){animation-delay:-1.3s}
.sl-ve{font-size:.62em;color:#fff;margin:0 .22em;-webkit-text-stroke:0;text-shadow:0 2px 0 #b0466e}
.sl-bil{color:#8a5530;-webkit-text-stroke:.1em #fff;paint-order:stroke fill}
.sl-hala{color:#ff5a5f;-webkit-text-stroke:.1em #fff;paint-order:stroke fill}
.sl-rib{margin-top:.25em;font-size:calc(var(--k,1) * 34px);font-weight:900;color:#fff;padding:.18em .9em .24em;border-radius:.6em;
 background:linear-gradient(#ff8fbf,#ff5f9e);box-shadow:0 .14em 0 #c23c76;text-shadow:0 2px 0 rgba(150,30,80,.45);transform:rotate(-2deg)}
@keyframes st-wob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-.06em) rotate(3deg)}}
@media (max-width:820px){.sl-big{font-size:76px}.sl-mid{font-size:38px}.sl-rib{font-size:26px}}
@media (max-height:560px){.sl-big{font-size:64px}.sl-mid{font-size:32px}.sl-rib{font-size:22px}}`;
    document.head.appendChild(s);
  }
  // 09_ui başlık logosu: "Feza, Bilbo ve Aytuğ Hala — Dev Ev Macerası" (el yazısı, renkli)
  function logo(el) {
    if (!el) return;
    injectCss();
    const cols = ['#ff5f9e', '#ffb02e', '#3ec7ff', '#7bd93a', '#b06bff'];
    const letters = 'Feza,'.split('').map((ch, i) => `<span class="sl-l" style="color:${cols[i % cols.length]}">${ch}</span>`).join('');
    el.innerHTML = `<div class="sl-logo"><div class="sl-row sl-big">${letters}</div>
      <div class="sl-row sl-mid"><span class="sl-l sl-bil">Bilbo</span><span class="sl-ve">ve</span><span class="sl-l sl-hala">Aytuğ Hala</span></div>
      <div class="sl-rib">Dev Ev Macerası</div></div>`;
  }

  return {
    MALZEME, KAYIP,
    intro, zone, area, ingredient, lostItem, locked, station, ending,
    buildTitle, titleTick, iconTick, ownsWorld, playIntro, logo,
    camera: cameraHook,
    busy: () => CINE.on,
    endingDone: false,
    get cine() { return CINE.on ? CINE.kind : ''; },
    _CINE: CINE, _TS: TS, _ACT: ACT, _SPOT: SPOT, _END: END, _MOM: MOM, _FLY: FLY, _skip: () => skipAll(), _next: () => nextBeat(), _blow: () => blowNow(), _camTo: camTo,
  };
})();
