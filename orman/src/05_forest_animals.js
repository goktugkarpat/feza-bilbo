/* ── Bilbo'nun Saklı Toplar Ormanı: sevimli huysuz hayvanlar ──
   Mevcut EMODEL'in tek çizimlik iskeleti, iki yüz hâli ve ortak geometri önbelleği kullanılır.
   Dokuz ayrı siluet: uzun çeneli timsah, sivri kulaklı tilki, yaban domuzu, tombul ayı,
   desenli kabuklu kaplumbağa, perdeli kurbağa, kıvrık kuyruklu sincap, maskeli rakun ve Koca Timsah.
   Hayvanlar yenilince ölmez: eski oyundaki neşelenme / kalpli vedayı kullanırlar.
   6 bölüm genişlemesi (../BOLUMLER.md): yeni küçükler ordek, sukaplumbagasi, domuzyavrusu, keciyavrusu, kayaliktilki,
   baykusyavrusu, kirpi, ormanyarasa, kunduzyavrusu ve beş bölüm canavarı kunduz, kocakurbaga, uykucuayi, dagkecisi, baykus.
   Canavarların davranışı da burada: FOREST_ANIMALS.bossAI(api) (07 bağlar), BOSS_KITS (cümle, çağırdıkları, can/hasar), FB (hamle
   süreleri: yapay zekâ ve model aynı sayıları okur). Kütük, dalga, taş ve arı kovanı canavarın kendi kemikleridir (st.fo). */
const FOREST_ANIMALS = (function () {
  'use strict';
  if (typeof EMODEL === 'undefined' || !EMODEL.registerPack) return { types: [] };
  const PI = Math.PI, TAU = PI * 2;
  // Boss move timings (seconds), shared by the AI (bossAI, GAME's clock) and the models (m.anim reads s.pT): one source of truth.
  const FB = {
    kunduz: { damBuild: 2.0, damHold: 5.5, damBreak: 2.6, warn: 2.2, throwLen: 9, throwW: 1.6, logSpeed: 5.0, logR: .26, slapR: 3.4, waveLen: 8.5, waveW: 3.0, waveSpeed: 4.2, chewD: 3.4, every: 3 },
    kocakurbaga: { plopUp: .75, plopAir: .9, plopD: 4.6, plopH: 1.8, warn: 2.1, tongueLen: 6.8, tongueW: 1.3, tongueOut: .22, tongueHold: .3, tongueBack: .4, hopUp: .95, hopR: 3.0, hopMax: 7.5, hopH: 2.0, croakR: 3.4 },
    uykucuayi: { honeyD: 3.8, wakeD: 1.2, warn: 2.0, slamR: 3.7, hiveR: 1.35, hiveFall: .6, hiveSpread: 2.1, yawnD: 1.8, napD: 2.8, every: 3 },
    dagkecisi: { stuckD: 3.2, stuckP: .5, warn: 1.95, chargeW: 2.6, chargeSpeed: 6.0, chargeMax: 8.5, skid: 1.0, rockW: 1.4, rockLen: 9, rockSpeed: 5.0, rockR: .33, leapUp: .8, leapR: 2.8, leapMax: 7, leapH: 1.7 },
    baykus: { specsD: 4.8, warn: 1.95, gustAng: 1.15, gustLen: 6.5, gustD: .7, featherN: 5, featherSpread: 1.0, featherSpeed: 4.2, takeoff: .7, flyD: 2.4, flyH: 2.6, landR: 2.4 },
  };
  const BOSS_KITS = {
    kunduz: { roarSfx: 'beaverSlap', lines: { giris: 'orman_kamp_boss', bitti: 'orman_kamp_bitti' }, add: 'kunduzyavrusu', at: [.60, .30], n: [2, 2], roar: 1.3, col: '#c9905a',
      forest: true, addHp: .6, addDmg: .6, cfg: { per: 150, lo: 10, hi: 40, dmg: 7 } },
    kocakurbaga: { roarSfx: 'frogCroak', lines: { giris: 'orman_gol_boss', bitti: 'orman_gol_bitti' }, add: 'ormankurbaga', at: [.60, .30], n: [2, 2], roar: 1.05, col: '#7fc46e',
      forest: true, addHp: .6, addDmg: .6, cfg: { per: 185, lo: 12, hi: 48, dmg: 8 } },
    uykucuayi: { roarSfx: 'bearYawn', lines: { giris: 'orman_mese_boss', bitti: 'orman_mese_bitti' }, add: 'domuzyavrusu', at: [.60, .30], n: [2, 2], roar: .8, col: '#f0b54a',
      forest: true, addHp: .6, addDmg: .6, cfg: { per: 225, lo: 13, hi: 56, dmg: 9 } },
    dagkecisi: { roarSfx: 'goatBleat', lines: { giris: 'orman_selale_boss', bitti: 'orman_selale_bitti' }, add: 'keciyavrusu', at: [.60, .30], n: [2, 2], roar: 1.35, col: '#e9e2d4',
      forest: true, addHp: .6, addDmg: .6, cfg: { per: 265, lo: 15, hi: 64, dmg: 10 } },
    baykus: { roarSfx: 'owlHoot', lines: { giris: 'orman_gece_boss', bitti: 'orman_gece_bitti' }, add: 'baykusyavrusu', at: [.60, .30], n: [2, 2], roar: 1.5, col: '#b9a7ff',
      forest: true, addHp: .6, addDmg: .6, cfg: { per: 305, lo: 16, hi: 72, dmg: 11 } },
  };
  const types = EMODEL.registerPack(function (K) {
    const { G, face, vgrad, col, mixc, hdr, texOf, lathe, cone, qy, qz, onEll, fluffGeo } = K;
    const DARK = '#352638', CREAM = '#ffefd2', PINK = '#ed9ca7';
    const clamp01 = x => Math.max(0, Math.min(1, x));
    const bell = x => x >= 0 && x <= 1 ? Math.sin(PI * x) : 0;
    const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
    const PALETTES = {
      croc: ['#498855', '#79b36b', '#d8df9f', '#345e3d'], fox: ['#bc652e', '#e29245', '#fff0d6', '#654431'],
      boar: ['#916449', '#b38a61', '#dbc39a', '#674431'], bear: ['#89593b', '#ae7b52', '#dfba88', '#644333'],
      turtle: ['#4e9870', '#8cba74', '#e8d991', '#356f53'], frog: ['#64ab6c', '#a7d38b', '#f2e9b2', '#448854'],
      squirrel: ['#aa6634', '#d99b55', '#f8deb2', '#805335'], raccoon: ['#7f8894', '#b4bcc2', '#eee5cf', '#414952'],
      piglet: ['#a3714e', '#c99b6e', '#f1dcb8', '#6e4a33'], rockfox: ['#8e8984', '#bcb6af', '#f7f0e5', '#59504b'],
    };
    function ell(r, c, p, s, rot, detail = 16) { r.add(G.sphere(detail, Math.round(detail * .7)), c, p, rot || null, s); }
    function softBox(r, c, p, s, rot) { r.add(G.rbox(2), c, p, rot || null, s); }
    function skin(base, light, dark, y0, y1) {
      const grad = vgrad(y0, y1, [[0, dark], [.48, base], [1, light]]), a = col(base), out = new THREE.Color();
      // Authored fine mottling is baked into vertices. No per-frame noise or extra shader / texture upload.
      return (x, y, z) => out.copy(grad(x, y, z)).lerp(a, .08 + .06 * Math.sin(x * 21 + z * 17) * Math.sin(y * 25));
    }
    function bone(r, name, parent, p) { r.bone(name, parent, p); }
    function paws(r, legs, c, light, cfg) {
      const toeCount = cfg.toes || 3, web = cfg.web, long = cfg.long;
      for (const a of legs) {
        const p = a.p, foot = [p[0], .12, p[2] + .07];
        bone(r, a.name, 'body', p);
        r.on(a.name).fx(0, .1, cfg.fur ? .38 : .15);
        // A tapered ankle emerges from the flank: rounded knees, not stacked spherical beads.
        ell(r, c, [p[0], p[1] - .075, p[2] - (a.front ? .018 : -.025)], [(cfg.w || .115) * .84, .19, .105], [a.front ? -.14 : .19, 0, a.side * -.12], 14);
        ell(r, mixc(c, light, .25), [p[0], p[1] - .15, p[2] + .022], [(cfg.w || .115) * .71, .11, .105], null, 12);
        bone(r, a.name + 'Foot', a.name, foot);
        r.on(a.name + 'Foot');
        ell(r, light, foot, [cfg.w || .125, .075, long ? .24 : .18]);
        for (let t = 0; t < toeCount; t++) {
          const x = foot[0] + (t - (toeCount - 1) * .5) * (web ? .085 : .065);
          ell(r, light, [x, .072, foot[2] + (long ? .16 : .13) - Math.abs(t - 1) * .015], [web ? .06 : .04, .036, web ? .12 : .064], null, 10);
          if (web) r.seg([foot[0], .10, foot[2]], [x, .075, foot[2] + .15], .021, c, .025, 8);
        }
        if (!web) {
          for (let t = 0; t < 2; t++) r.seg([foot[0] + (t - .5) * .065, .145, foot[2] + .04], [foot[0] + (t - .5) * .065, .135, foot[2] + .12], .008, mixc(c, '#342b2a', .4), .006, 6);
        }
      }
    }
    function quadRig(r, cfg) {
      bone(r, 'body', 'root', [0, cfg.by || .48, 0]);
      bone(r, 'head', 'body', cfg.head);
      const w = cfg.width, front = cfg.front, back = cfg.back;
      const legs = [
        { name: 'legFL', p: [w, .33, front], side: 1, front: true }, { name: 'legFR', p: [-w, .33, front], side: -1, front: true },
        { name: 'legBL', p: [w, .34, back], side: 1, front: false }, { name: 'legBR', p: [-w, .34, back], side: -1, front: false },
      ];
      paws(r, legs, cfg.color, cfg.paw || cfg.color, cfg);
      bone(r, 'tail0', 'body', [0, cfg.ty || .44, back - .15]);
      bone(r, 'tail1', 'tail0', [0, cfg.ty || .44, back - .43]);
      bone(r, 'tail2', 'tail1', [0, cfg.ty || .44, back - .70]);
      return legs;
    }
    function express(r, p, R, o) {
      face(r, p, R, Object.assign({ bone: 'head', tilt: .35, ex: R * .43, ey: R * .12, er: R * .25,
        iris: '#705129', skin: o.color, browCol: o.brow || DARK, browY: 1.5, browRaise: .30, browSide: 1,
        mouthY: -R * .4, mouthW: R * .34, noTongue: true, blushCol: PINK, heartY: 1.05, heartS: .20, mouthPivot: true,
      }, o));
    }
    function ears(r, head, c, inner, w, tall, floppy) {
      for (const sd of [-1, 1]) {
        const p = [sd * w, head[1] + (tall ? .23 : .13), head[2] - .10];
        // (ANIM) every ear on its own bone at its root: it flops, flicks and lags behind the head
        bone(r, sd > 0 ? 'earL' : 'earR', 'head', [sd * w * .9, head[1] + (tall ? .1 : .07), head[2] - .10]); r.fx(0, .05, .32);
        if (tall) {
          cone(r, [p[0], p[1] - .10, p[2]], [sd * .18, 1, -.10], .31, .12, c, 16);
          ell(r, inner, [p[0] + sd * .02, p[1] + .015, p[2] + .058], [.060, .115, .014], [0, 0, -sd * .14], 12);
        } else {
          ell(r, c, p, [.11, floppy ? .14 : .105, .072], [0, 0, sd * -.2]);
          ell(r, inner, [p[0], p[1] + .012, p[2] + .055], [.06, .063, .022], null, 12);
        }
        // a soft fur tuft inside each ear
        ell(r, CREAM, [p[0] - sd * .012, p[1] - (tall ? .07 : .03), p[2] + .07], [.03, tall ? .07 : .04, .02], [0, 0, sd * .3], 8);
      }
      r.on('head');
    }
    function kerchief(r, color, y, z, span) {
      r.on('body').fx(0, .03, 1);
      // Soft folded scarf and two pointed cloth ends, not a glowing decal.
      r.add(G.torus(TAU, .19, 20), color, [0, y, z], [PI / 2, 0, 0], [span, span * .8, .34]);
      softBox(r, mixc(color, '#ffffff', .20), [.07, y - .045, z + span * .73], [.12, .10, .065], [0, 0, -.15]);
      for (const sd of [-1, 1]) ell(r, color, [sd * .07, y - .12, z + span * .75], [.058, .125, .022], [0, 0, sd * -.25], 12);
      r.fx(0, 0, 0);
    }
    // ── ANIM: shared pieces for the life layer ──
    const STARG = {};
    function starGeo() {   // a puffy five-point star (the "oh!" stars), built once
      if (STARG.g) return STARG.g;
      const sh = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, rr = i & 1 ? .22 : .5; if (i) sh.lineTo(Math.sin(a) * rr, Math.cos(a) * rr); else sh.moveTo(0, rr); }
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: true, bevelThickness: .1, bevelSize: .09, bevelSegments: 2, curveSegments: 3 });
      g.translate(0, 0, -.06); g.computeVertexNormals(); g.userData.keep = true;
      return STARG.g = g;
    }
    // Three little stars on their own bone above the head (hidden until the animal is bonked: m.anim spins them).
    function stars(r, c, rad, parent = 'head') {
      bone(r, 'stars', parent, c); r.fx(.75, .5, 0);
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3;
        r.add(starGeo(), i === 1 ? '#fff0a8' : '#ffd23f', [c[0] + Math.sin(a) * rad, c[1] + (i - 1) * rad * .14, c[2] + Math.cos(a) * rad], [0, a, (i - 1) * .4], rad * (i === 1 ? .36 : .44));
      }
      r.fx(0, 0, 0);
    }
    // A soft fur clump (noise-lumpy sphere) — chest ruffs, cheek tufts, tail tips.
    function fluff(r, c, p, s, rot) { r.add(fluffGeo(14), c, p, rot || null, s); }
    function daisy(r, p, k = 1, petal = '#ffffff', mid = '#ffcf3a', tilt = [0, 0, 0]) {   // a tiny flower (accessory)
      r.fx(0, .3, 0);
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ell(r, petal, [p[0] + Math.sin(a) * .035 * k, p[1], p[2] + Math.cos(a) * .035 * k], [.026 * k, .009 * k, .045 * k], [tilt[0], a + tilt[1], tilt[2]], 8); }
      ell(r, mid, [p[0], p[1] + .008 * k, p[2]], [.022 * k, .016 * k, .022 * k], null, 8);
    }
    const SURFACES = {};
    function surface(kind) {
      if (SURFACES[kind]) return SURFACES[kind];
      const size = 512, c = document.createElement('canvas'); c.width = c.height = size;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#f3f0e8'; ctx.fillRect(0, 0, size, size);
      let seed = kind === 'fur' ? 923 : kind === 'scale' ? 341 : 725;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      if (kind === 'fur') {
        // Soft overlapping brush hairs: directional, varied, low contrast; no fabric weave / checker marks.
        ctx.lineCap = 'round';
        for (let i = 0; i < 8500; i++) {
          const x = random() * size, y = random() * size, length = 5 + random() * 14;
          ctx.strokeStyle = i % 3 ? 'rgba(160,144,116,.11)' : 'rgba(255,255,250,.30)';
          ctx.lineWidth = .6 + random() * .8; ctx.beginPath(); ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + 1.5, y + length * .4, x + (random() - .5) * 4, y + length); ctx.stroke();
        }
      } else {
        // Small irregular rounded scales. Offset tiles wrap seamlessly; the strong scutes are real geometry above them.
        for (let row = -1; row < 21; row++) for (let j = -1; j < 21; j++) {
          const x = j * 27 + (row & 1 ? 13.5 : 0), y = row * 27, w = 11 + random() * 2, h = 9 + random() * 3;
          ctx.fillStyle = 'rgba(182,181,150,.17)'; ctx.beginPath(); ctx.ellipse(x, y, w, h, .14 * (random() - .5), 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(155,162,137,.13)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,240,.26)'; ctx.beginPath(); ctx.ellipse(x - 2, y - 3, w * .48, h * .16, -.15, 0, TAU); ctx.fill();
        }
      }
      const pixels = ctx.getImageData(0, 0, size, size).data;
      const n = document.createElement('canvas'); n.width = n.height = size; const nc = n.getContext('2d'), out = nc.createImageData(size, size);
      const sample = (x, y) => pixels[((y + size) % size * size + (x + size) % size) * 4];
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4; out.data[i] = 128 + (sample(x - 1, y) - sample(x + 1, y)) * .55;
        out.data[i + 1] = 128 + (sample(x, y - 1) - sample(x, y + 1)) * .55; out.data[i + 2] = 254; out.data[i + 3] = 255;
      }
      nc.putImageData(out, 0, 0);
      const map = new THREE.CanvasTexture(c), normalMap = new THREE.CanvasTexture(n);
      map.colorSpace = THREE.SRGBColorSpace;
      for (const t of [map, normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
      return SURFACES[kind] = { map, normalMap };
    }
    function details(r, cfg) {
      return { height: cfg.height, modelScale: cfg.scale || 1, forestSpecies: cfg.species, forestLegs: cfg.legs, flyer: !!cfg.flyer,
        animAs: cfg.animAs || cfg.species, ownHurt: !!cfg.ownHurt, dieHop: cfg.dieHop ?? .075, foBones: cfg.foBones || null,
        hide: ['stars'].concat(cfg.foBones || [], cfg.lifeHide || []), lifeHide: cfg.lifeHide || null, gag: cfg.gag || null,
        portrait: cfg.portrait || { cx: 0, cy: cfg.height * .67, cz: .3, rad: cfg.height * .55 },
        glowC: col('#f5ca7a'), glowK: .35, tex: surface(['croc', 'turtle', 'frog'].includes(cfg.species) ? 'scale' : 'fur'),
        mat: { rough: cfg.rough ?? (cfg.species === 'frog' || cfg.species === 'croc' ? .40 : .64), ns: .28, wob: cfg.wob || 0, wobF: 4, wobS: 3,
          rim: '#f8eed6', rimK: .20, rimP: 2.6, sss: col('#edcaa2').multiplyScalar(.025) } };
    }
    function croc(r, o, boss) {
      const [base, light, belly, dark] = PALETTES.croc, head = [0, .56, .69];
      const legs = quadRig(r, { width: .34, front: .42, back: -.46, head, by: .43, ty: .33, color: base, paw: light, w: .13 });
      r.on('body').fx(0, .1, .35);
      ell(r, skin(base, light, dark, .20, .71), [0, .43, -.02], [.39, .25, .70], null, 26);
      ell(r, belly, [0, .29, .10], [.34, .13, .65], null, 20);
      // Belly segments follow the oval volume rather than float in a grid.
      for (let i = 0; i < 7; i++) softBox(r, mixc(belly, '#92aa6f', .20), [0, .225, -.40 + i * .15], [.46, .018, .09]);
      // Raised, rounded dorsal scutes and a side line, all baked into the same skinned draw.
      for (let row = 0; row < 3; row++) for (let i = 0; i < 8; i++) {
        const z = -.53 + i * .14, x = (row - 1) * .15, q = Math.sqrt(Math.max(.08, 1 - (z / .8) ** 2 - (x / .43) ** 2));
        // Rounded keel scales lie in the back's tangent plane; no block grid sticks out.
        ell(r, row === 1 ? mixc(dark, base, .32) : mixc(base, light, .45), [x, .43 + .245 * q, z], [.068, row === 1 ? .050 : .027, .088], [.16 * z, 0, (row - 1) * -.32], 10);
      }
      for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) ell(r, light, [sd * .36, .47, -.42 + i * .17], [.021, .039, .054], null, 10);
      r.on('head');
      ell(r, light, head, [.32, .245, .34], null, 28);
      ell(r, skin(light, '#b2ce80', base, .4, .77), [0, .515, 1.02], [.307, .143, .415], null, 24);
      // Rounded snout tip and brow hoods give the long face a living outline.
      ell(r, light, [0, .507, 1.335], [.272, .103, .135], null, 18);
      for (const sd of [-1, 1]) ell(r, base, [sd * .16, .74, .785], [.128, .057, .135], [0, sd * -.20, 0], 14);
      // Broad soft snout: nostril humps, a slight bridge and a separate rounded lower jaw.
      for (const sd of [-1, 1]) {
        ell(r, base, [sd * .18, .65, 1.18], [.073, .042, .09], null, 12);
        ell(r, dark, [sd * .18, .671, 1.20], [.026, .009, .036], null, 10);
      }
      bone(r, 'jaw', 'head', [0, .425, .735]);
      r.on('jaw').fx(0, .16, .18); ell(r, belly, [0, .387, 1.035], [.282, .069, .405], null, 22);
      ell(r, '#cf8f87', [0, .430, 1.058], [.232, .014, .316], null, 14);
      // Tiny rounded milk teeth appear only along the moving jaw: friendly, never needle fangs.
      for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) ell(r, CREAM, [sd * (.22 - j * .005), .447, .91 + j * .145], [.021, .027, .022], null, 8);
      r.fx(0, .06, 0).seg([-.20, .438, 1.365], [.20, .438, 1.365], .013, dark, .013, 10);
      for (const sd of [-1, 1]) r.seg([sd * .265, .446, 1.25], [sd * .273, .448, .87], .011, dark, .007, 8);
      // Face sits above the bridge; the mouth already belongs to the articulated jaw.
      express(r, [0, .61, .76], .285, { color: light, noMouth: true, ex: .17, ey: .055, er: .09, tilt: .65, brow: dark, iris: '#b27b2a', heartY: 1.45 });
      const tail = [[-.61, -.94, .25, .16], [-.91, -1.23, .19, .12], [-1.20, -1.55, .13, .052]];
      for (let i = 0; i < 3; i++) {
        r.on('tail' + i).fx(0, .1, .32);
        const a = tail[i]; ell(r, base, [0, .35 - i * .036, (a[0] + a[1]) * .5], [a[2], a[3], .25], [0, 0, 0]);
        for (let j = 0; j < 3; j++) ell(r, mixc(dark, base, .22), [0, .36 - i * .035 + a[3] * .85, a[0] - j * .105], [a[2] * .29, .044 - i * .008, .07], [0, 0, 0], 10);
      }
      kerchief(r, boss ? '#bb6851' : '#dcaf4b', .48, .54, .28);
      // (ANIM) soft cheek rolls and a lighter throat make the long face rounder and friendlier
      r.on('head');
      for (const sd of [-1, 1]) ell(r, mixc(light, belly, .35), [sd * .25, .50, .80], [.09, .075, .13], [0, sd * .3, 0], 12);
      if (!boss) { daisy(r, [.21, .80, .58], 1.25, '#ffffff', '#ffcf3a', [-.4, 0, -.5]); r.fx(0, .1, .35); }
      r.on('head').mark('muzzle', [0, .55, 1.32]);
      if (boss) {
        r.on('head').fx(0, .08, .55);
        // Old river captain's floppy yellow hat: an unmistakable, friendly boss silhouette.
        ell(r, '#e4bf53', [0, .925, .60], [.39, .05, .32], [.04, 0, -.08], 28);
        ell(r, '#cfaa46', [0, .985, .57], [.235, .12, .205], [.04, 0, -.08], 22);
        r.add(G.torus(TAU, .09, 24), '#6e945b', [0, .99, .57], [PI / 2, 0, -.08], [.236, .2, .25]);
        ell(r, '#ede4b8', [.12, 1.03, .75], [.046, .065, .013], [0, 0, -.15], 12);
        // Leaves tucked into the hatband, not a pointed monster crown.
        for (const sd of [-1, 1]) ell(r, '#89b95e', [-.17 + sd * .025, 1.08 + (sd + 1) * .025, .57], [.05, .14, .015], [0, .25, -.55 + sd * .2], 12);
      }
      stars(r, [0, boss ? 1.22 : .9, .7], boss ? .34 : .3);
      if (boss) for (let i = 0; i < 3; i++) {   // three spat bubble-balls it juggles (shown only in that gag)
        fbone(r, 'jb' + i, [0, 1.3, 1.0]); r.fx(.15, .9, 0);
        ell(r, ['#9fd8f5', '#f7b4cf', '#c8f09a'][i], [0, 1.3, 1.0], [.13, .13, .13], null, 16);
        r.fx(.6, .6, 0); ell(r, '#ffffff', [-.045, 1.36, 1.08], [.035, .026, .018], null, 8);
      }
      r.fx(0, 0, 0);
      return details(r, { height: boss ? 1.22 : .91, scale: boss ? 2.35 : 1, species: 'croc', legs, foBones: boss ? ['jb0', 'jb1', 'jb2'] : null,
        portrait: { cx: 0, cy: .65, cz: .8, rad: .7 } });
    }
    function furry(r, o, species, boss, X) {
      X = X || {};
      const [base, light, cream, dark] = PALETTES[species], fox = species === 'fox' || species === 'rockfox', boar = species === 'boar' || species === 'piglet', bear = species === 'bear', raccoon = species === 'raccoon';
      const piglet = species === 'piglet', rockfox = species === 'rockfox';
      const by = bear ? .58 : .50, head = [0, bear ? .82 : .65, fox ? .53 : .46], R = bear ? .34 : boar ? .29 : .285;
      const legs = quadRig(r, { width: bear ? .30 : boar ? .29 : .245, front: .32, back: -.34, head, by, ty: by, color: base, paw: boar ? dark : base, fur: true, w: bear ? .15 : .115 });
      r.on('body').fx(0, .08, .65);
      ell(r, skin(base, light, dark, .18, bear ? 1.02 : .80), [0, by, -.04], [bear ? .41 : boar ? .36 : fox ? .255 : .31, bear ? .37 : boar ? .31 : .245, bear ? .56 : boar ? .57 : fox ? .55 : .49], null, 24);
      ell(r, cream, [0, by - .10, .23], [bear ? .265 : .18, bear ? .30 : .19, .245], [-.25, 0, 0]);
      // Sloped shoulders and haunches overlap the torso continuously, instead of a toy's ball joints.
      for (const sd of [-1, 1]) {
        ell(r, mixc(base, light, .20), [sd * (bear ? .29 : .20), by - .01, .23], [bear ? .19 : .135, bear ? .27 : .19, .20], [0, 0, sd * .13], 14);
        ell(r, base, [sd * (bear ? .28 : .215), by - .02, -.29], [bear ? .19 : .14, bear ? .25 : .20, .23], [0, 0, sd * -.13], 14);
      }
      // Chest ruff and cheek tufts are softly rounded with varied direction; not sharp fur needles.
      if (!boar) for (let i = 0; i < 5; i++) {
        const x = (i - 2) * .075;
        ell(r, cream, [x, by + .02 - Math.abs(i - 2) * .025, .38], [.070, .145, .05], [0, 0, -(i - 2) * .17], 12);
        // (ANIM) lumpy fur clumps over the ruff: reads as soft fur, not a smooth toy
        if (i & 1) fluff(r, mixc(cream, '#ffffff', .25), [x * 1.1, by - .07 - Math.abs(i - 2) * .02, .41], [.065, .075, .045]);
      }
      // a slightly lighter, fluffy back line and soft flank fur
      for (let i = 0; i < 4; i++) fluff(r, mixc(base, light, .18), [0, by + (bear ? .325 : boar ? .265 : .205), -.25 + i * .15], [bear ? .1 : .07, .035, .08]);
      r.on('head').fx(0, .08, .45);
      ell(r, skin(base, light, dark, head[1] - R, head[1] + R), head, [R * (bear ? 1.08 : 1), R * (bear ? .95 : 1), R * .92], null, 24);
      // (ANIM) a little cowlick on top and puffed fur cheeks: each head gets a soft, characterful outline
      for (let i = 0; i < 3; i++) fluff(r, i === 1 ? light : base, [(i - 1) * .055, head[1] + R * .93, head[2] - .02 + (i === 1 ? .03 : 0)], [.055, .07 - Math.abs(i - 1) * .02, .05], [0, 0, (i - 1) * -.45]);
      if (!boar) for (const sd of [-1, 1]) fluff(r, fox ? cream : mixc(base, cream, .35), [sd * R * .86, head[1] - R * .28, head[2] + .05], [.07, .065, .07], [0, 0, sd * .5]);
      ears(r, head, base, boar ? '#c59c87' : PINK, R * .77, fox, boar);
      if (fox) {
        // Long triangular cheek planes and a tapered muzzle differentiate the fox from masked round-headed raccoons.
        for (const sd of [-1, 1]) {
          ell(r, cream, [sd * .145, head[1] - .09, head[2] + .16], [.16, .15, .20], [0, sd * -.25, -sd * .35]);
          ell(r, base, [sd * .215, head[1] - .02, head[2] + .015], [.105, .07, .115], [0, sd * .2, sd * -.4], 14);
        }
        cone(r, [0, head[1] - .075, head[2] + .12], [0, -.11, 1], .36, .17, cream, 20);
        ell(r, DARK, [0, head[1] - .10, head[2] + .44], [.053, .043, .040]);
        if (rockfox) {   // the rock fox: silver coat with russet neck, cheeks and legs
          r.on('body'); for (const sd of [-1, 1]) ell(r, '#c4733f', [sd * .17, by + .07, .27], [.09, .14, .12], [0, 0, sd * .2], 12);
          r.on('head'); for (const sd of [-1, 1]) ell(r, '#c97a45', [sd * .2, head[1] - .04, head[2] + .02], [.07, .06, .08], [0, sd * .2, sd * -.3], 10);
          r.on('body'); ell(r, '#9a7a55', [-.17, .42, .26], [.09, .10, .08]); ell(r, '#7a5d3f', [-.17, .49, .26], [.10, .04, .09]);
          for (let i = 0; i < 3; i++) ell(r, '#a8a198', [-.20 + i * .03, .51, .30], [.025, .02, .025], null, 8);
          r.on('head');
        }
      } else if (boar) {
        ell(r, light, [0, head[1] - .10, head[2] + .22], [.235, .18, .22]);
        ell(r, '#cba18f', [0, head[1] - .08, head[2] + .395], [.16, .115, .075]);
        for (const sd of [-1, 1]) ell(r, '#895d51', [sd * .052, head[1] - .075, head[2] + .456], [.022, .032, .012], [0, 0, sd * -.1], 12);
        // A soft split fringe and tawny flank stripes make this a little wild boar, not a domestic pig.
        r.on('body');
        for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) ell(r, '#d0a774', [sd * .343, by + .045, -.26 + i * .18], [.019, .099, .034], [0, sd * -.12, sd * -.13], 10);
        r.on('head');
        // Friendly untusked boar, curly fringe and little rounded dorsal mane.
        for (let i = 0; i < 6; i++) ell(r, dark, [(i % 2 ? .025 : -.025), head[1] + .27, head[2] - .15 + i * .06], [.065, .085, .074], [0, 0, (i - 2) * .07], 12);
        r.on('body'); for (let i = 0; i < (piglet ? 4 : 7); i++) ell(r, dark, [0, piglet ? .79 : .80, -.35 + i * .08], [.057, piglet ? .07 : .105, .062], [0, 0, .12 * Math.sin(i)], 12);
        if (piglet) for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {   // the striped "watermelon" coat of a wild piglet
          const y = by + .13 - i * .085, rr = .36 * Math.sqrt(Math.max(.2, 1 - ((y - by) / .31) ** 2));
          ell(r, '#f3dcae', [sd * (rr - .012), y, -.06], [.022, .026, .40 - i * .04], [0, sd * -.06, sd * -.18 * (i - 1)], 12);
        }
        r.on('head');
      } else {
        if (raccoon) for (const sd of [-1, 1]) ell(r, dark, [sd * .125, head[1] + .035, head[2] + .235], [.135, .118, .029], [0, sd * .30, sd * .10]);
        ell(r, cream, [0, head[1] - .10, head[2] + .235], [bear ? .20 : .15, .13, .14]);
        ell(r, DARK, [0, head[1] - .055, head[2] + .37], [bear ? .065 : .055, .042, .033]);
      }
      if (bear) {
        for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) ell(r, j % 2 ? light : base, [sd * (.28 + j * .012), head[1] - .12 + j * .060, head[2] + .035], [.073, .089, .068], [0, sd * -.2, sd * -.3], 10);
      } else if (raccoon) {
        for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) ell(r, cream, [sd * (.225 + j * .012), head[1] - .05 - j * .035, head[2] + .12], [.072, .036, .080], [0, sd * -.2, sd * -.3], 10);
      }
      // Eyes above the muzzle, expressive forehead and overjoyed face are shared with the base game's art language.
      express(r, head, R, { color: base, er: bear ? .092 : .082, ex: bear ? .145 : .125, ey: .045,
        mouthY: -.16, mouthW: boar ? .08 : .115, mR: R + .05, mInset: -.02, noTongue: true, tilt: .36,
        iris: fox ? '#916334' : bear ? '#805b36' : '#73948a', heartY: 1.25 });
      if (boar) {
        r.on('tail0').fx(0, .07, .4); r.add(G.torus(PI * 1.75, .23, 22), light, [0, .57, -.65], [PI / 2, .15, .5], [.10, .09, .08]);
      } else if (bear) {
        r.on('tail0').fx(0, .08, .6); ell(r, light, [0, .56, -.59], [.13, .13, .13]);
      } else {
        const tailSize = fox ? [.20, .205, .33] : [.17, .17, .28];
        for (let i = 0; i < 3; i++) {
          r.on('tail' + i).fx(0, .08, .55);
          ell(r, i === 2 && fox ? CREAM : base, [0, by + .05 + i * .09, -.62 - i * .26], [tailSize[0] * (1 - i * .12), tailSize[1], tailSize[2]], [-.22, 0, 0], 18);
          if (fox && i === 2) ell(r, CREAM, [0, by + .23, -1.27], [.103, .13, .19], [-.33, 0, 0], 14);
          // (ANIM) fluffy fur bridges the tail segments into one brush that bends as a whole
          if (!raccoon && i < 2) ell(r, i === 1 ? mixc(base, light, .25) : base, [0, by + .095 + i * .09, -.75 - i * .26], [tailSize[0] * (.9 - i * .1), tailSize[1] * .92, tailSize[2] * .6], [-.22, 0, 0], 16);
          if (raccoon) for (let j = 0; j < 2; j++) {
            r.add(G.torus(TAU, .25, 18), dark, [0, by + .04 + i * .09, -.53 - i * .26 - j * .13], null, [.14 - i * .014, .15, .10]);
          }
        }
      }
      // (ANIM) little personal touches
      if (species === 'fox') { r.on('earL'); ell(r, '#7fb55a', [R * .77 + .02, head[1] + .25, head[2] - .05], [.035, .09, .012], [0, .3, -.7], 8); ell(r, '#a4cf72', [R * .77 + .045, head[1] + .21, head[2] - .04], [.028, .07, .01], [0, .3, -1.2], 8); }
      if (species === 'boar') { r.on('head'); for (let i = 0; i < 3; i++) daisy(r, [(i - 1) * .1, head[1] + R * .9 - Math.abs(i - 1) * .03, head[2] - .06], 1.1, i === 1 ? '#ffd4e2' : '#ffffff', '#ffc93a', [-.3, 0, (i - 1) * -.5]); }
      if (piglet) { r.on('earL'); daisy(r, [R * .77, head[1] + .2, head[2] - .02], 1.0, '#ffe2ef', '#ffcf3a', [-.4, 0, -.6]); }
      if (bear && !boss) { r.on('head'); r.fx(0, .9, 0); ell(r, '#f2b13a', [.05, head[1] - .12, head[2] + .33], [.035, .02, .02], null, 10); ell(r, '#f2b13a', [.06, head[1] - .16, head[2] + .335], [.014, .04, .014], null, 8); ell(r, '#f6c24c', [.062, head[1] - .2, head[2] + .335], [.018, .018, .018], null, 8); r.fx(0, .08, .45); }
      if (X.gang) {   // Rakun Çetesi: a striped burglar shirt and a marshmallow on a twig
        r.on('body').fx(0, .2, .3); ell(r, '#5a6170', [-.2, by + .12, -.2], [.12, .14, .1], [0, 0, .3], 12); r.seg([-.12, by + .2, -.12], [.2, by + .02, .25], .02, '#3b4250', .02, 6);   // a loot sack on its back
        r.on('legFR').fx(0, .2, 0); r.seg([-.24, .2, .5], [-.30, .75, .62], .014, '#7a5434', .01, 6);
        r.fx(0, .4, .2); ell(r, '#fff8ee', [-.30, .80, .63], [.065, .06, .065], null, 12); ell(r, '#e8c79a', [-.30, .77, .63], [.067, .02, .067], null, 10);
        r.fx(0, .08, .45);
      }
      kerchief(r, X.gang ? '#3b4250' : rockfox ? '#d98c3a' : piglet ? '#e98aa5' : fox ? '#54a8ae' : bear ? (boss ? '#d07c9c' : '#6c91b5') : boar ? '#789346' : '#b980b6', bear ? .77 : .59, .30, bear ? .30 : .23);
      if (boss && bear) {
        // Uykucu Ayı: a long striped nightcap that flops with every move (its own bone), honey pot for the happy end,
        // and the three straw beehives that drop in the "kovan" move (hidden until then).
        bone(r, 'cap', 'head', [0, head[1] + R * .8, head[2] - .04]); r.on('cap').fx(0, .1, .7);
        const capC = ['#7fa6d6', '#f4efe2'];
        ell(r, capC[0], [0, head[1] + R * .72, head[2] - .05], [R * .86, R * .38, R * .84], [-.25, 0, 0], 22);
        r.add(G.torus(TAU, .32, 26), '#f4efe2', [0, head[1] + R * .55, head[2] - .02], [PI / 2 - .25, 0, 0], [R * .87, R * .85, R * .3]);
        const pts = [[0, head[1] + R * .95, head[2] - .08], [.06, head[1] + R * 1.35, head[2] - .16], [.2, head[1] + R * 1.55, head[2] - .26], [.36, head[1] + R * 1.45, head[2] - .34], [.46, head[1] + R * 1.18, head[2] - .38]];
        const rad = [.21, .15, .105, .07, .045];
        for (let i = 0; i < 4; i++) r.seg(pts[i], pts[i + 1], rad[i], capC[(i + 1) & 1], rad[i + 1], 16);
        for (let i = 1; i < 4; i++) ell(r, capC[(i + 1) & 1], pts[i], [rad[i], rad[i], rad[i]], null, 12);
        ell(r, '#ffffff', [pts[4][0] + .02, pts[4][1] - .05, pts[4][2]], [.085, .085, .085], null, 14);
        bone(r, 'honey', 'legFL', [.30, .32, .58]); r.on('honey').fx(0, .6, 0);
        ell(r, '#d99a4a', [.30, .30, .58], [.12, .12, .115], null, 18);
        r.add(G.torus(TAU, .22, 20), '#c4823a', [.30, .40, .58], [PI / 2, 0, 0], [.10, .10, .09]);
        ell(r, '#f5b52e', [.30, .42, .58], [.09, .03, .09], null, 14);
        for (let i = 0; i < 3; i++) ell(r, '#f6bb37', [.30 + (i - 1) * .06, .37 - (i & 1) * .03, .67 - Math.abs(i - 1) * .02], [.022, .05, .02], null, 8);
        ell(r, '#f3e6c8', [.30, .29, .697], [.05, .04, .01], null, 10);
        for (let i = 0; i < 3; i++) {
          fbone(r, 'hive' + i, [0, .38, 0]); r.fx(0, .15, .5);
          ell(r, skin('#e2b45c', '#f3d38a', '#b98235', .38, .78), [0, .57, 0], [.15, .20, .15], null, 18);
          ell(r, '#e2b45c', [0, .42, 0], [.16, .05, .16], null, 16);
          for (let k = 0; k < 4; k++) { const y = .45 + k * .075, w = .15 * Math.sqrt(Math.max(.05, 1 - ((y - .57) / .2) ** 2)) + .008;
            r.add(G.torus(TAU, .16, 20), '#c58a3a', [0, y, 0], [PI / 2, 0, 0], [w, w, .06]); }
          ell(r, '#5a3b22', [0, .47, .145], [.045, .045, .02], null, 12);
          ell(r, '#f3d38a', [0, .47, .15], [.06, .016, .02], null, 8);
          r.seg([0, .74, 0], [.02, .86, 0], .014, '#6b4a2e', .01, 6);
          ell(r, '#7cb653', [.07, .84, 0], [.06, .02, .03], [0, 0, -.4], 8);
          ell(r, '#f6b52c', [.11, .60, .08], [.025, .06, .025], null, 8);
        }
      }
      stars(r, [0, head[1] + R * (boss && bear ? 1.75 : 1.3), head[2] - .02], R * 1.05);
      r.on('head').mark('muzzle', [0, head[1] - .05, head[2] + .45]);
      return details(r, { height: bear ? 1.21 : fox ? 1.18 : boar ? 1.05 : 1.00, species: boss ? species + 'boss' : X.gang ? 'gang' : species, legs,
        scale: boss ? 2.15 : piglet ? .74 : 1, animAs: rockfox ? 'raccoon' : piglet ? 'boar' : species, ownHurt: !!boss,
        foBones: boss ? ['hive0', 'hive1', 'hive2'] : null, dieHop: boss ? .1 : undefined,
        portrait: boss ? { cx: 0, cy: .95, cz: .45, rad: .5 } : undefined });
    }
    function turtle(r, o, water) {
      const [base, light, cream, dark] = water ? ['#5f8d4c', '#93b86a', '#efe39a', '#3e6436'] : PALETTES.turtle, head = [0, .40, .61];
      const legs = quadRig(r, { width: .36, front: .35, back: -.35, head, by: .37, color: base, paw: light, w: .13 });
      r.on('body').fx(0, .07, .35);
      ell(r, '#baaa64', [0, .25, -.025], [.50, .14, .64]);
      // Sculpted domed shell with separately bevelled olive plates nested inside its broad golden lip.
      const SH = water ? .37 : .50;   // the pond slider's shell is lower and smoother, olive with golden streaks
      r.add(G.hemi(28), water ? '#4f6e3e' : '#a8a762', [0, .31, -.05], null, [.54, SH, .65]);
      r.add(G.torus(TAU, .10, 32), water ? '#e2c65c' : '#d3c383', [0, .32, -.05], [PI / 2, 0, 0], [.53, .65, .46]);
      const shellColors = water ? ['#57773f', '#6a8a48', '#62813f', '#76955a'] : ['#5f8b65', '#7ca36e', '#80a172', '#9da76e'];
      const centers = [[0, water ? .685 : .82, -.05, .21, .055, .23]];
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < (ring ? 10 : 6); i++) {
        const a = i * TAU / (ring ? 10 : 6) + (ring ? .20 : 0), rr = ring ? .80 : .46;
        centers.push([Math.sin(a) * .50 * rr, .31 + (water ? .355 : .48) * Math.sqrt(1 - rr * rr), -.05 + Math.cos(a) * .61 * rr, ring ? .12 : .17, .05, ring ? .13 : .19, a, rr]);
      }
      for (let i = 0; i < centers.length; i++) {
        const p = centers[i], rr = p[7] || 0, a = p[6] || 0;
        // Curved scutes nest into the shell. The golden channels describe actual plates rather than floating square buttons.
        ell(r, shellColors[i % 4], p.slice(0, 3), [p[3] * 1.22, .025, p[5] * 1.16], [Math.cos(a) * rr * .95, 0, -Math.sin(a) * rr * .95], 12);
        ell(r, mixc(shellColors[i % 4], '#d9d596', .22), [p[0], p[1] + .025, p[2]], [.040, .005, .013], [Math.cos(a) * rr * .95, a, -Math.sin(a) * rr * .95], 10);
      }
      r.on('head').fx(0, .07, .25);
      ell(r, base, [0, .37, .43], [.19, .17, .29]); ell(r, light, head, [.23, .205, .25]);
      express(r, head, .23, { color: light, ex: .105, er: .072, ey: .025, mouthW: .095, mouthY: -.10, iris: '#73532f', tilt: .48 });
      for (const sd of [-1, 1]) ell(r, cream, [sd * .15, .35, .785], [.047, .03, .014], null, 12);
      if (water) for (const sd of [-1, 1]) {   // the slider's yellow face stripes and a rosy cheek patch
        ell(r, '#e85d5a', [sd * .205, .43, .58], [.02, .045, .07], [0, sd * .3, 0], 10);
        for (let i = 0; i < 2; i++) ell(r, '#efd85e', [sd * (.12 + i * .06), .30 + i * .03, .62 - i * .06], [.012, .02, .09], [.3, sd * .5, 0], 8);
      }
      r.on('tail0').fx(0, .06, .25); cone(r, [0, .30, -.59], [0, .05, -1], .26, .10, base, 16);
      r.on('head').fx(0, .08, .18);
      for (const sd of [-1, 1]) { ell(r, dark, [sd * .055, .475, .823], [.010, .010, .012], null, 8); }
      stars(r, [0, .72, .6], .22);
      r.on('body');
      if (!water) {   // (ANIM) a tiny red toadstool and a moss cushion growing on the old shell
        fluff(r, '#7fae55', [-.16, .78, -.22], [.13, .05, .11]); fluff(r, '#94c266', [-.06, .80, -.30], [.09, .04, .08]);
        r.fx(0, .1, 0); r.seg([.14, .76, -.12], [.15, .88, -.12], .028, '#f4ead8', .024, 8);
        r.fx(0, .5, 0); r.add(G.hemi(16), '#e2463c', [.15, .87, -.12], null, [.085, .07, .085]);
        for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + .4; ell(r, '#fff6ea', [.15 + Math.sin(a) * .05, .915, -.12 + Math.cos(a) * .05], [.016, .008, .016], null, 6); }
        r.fx(0, .07, .35);
      } else {   // a lily-pad sun hat on the slider
        r.on('head').fx(0, .3, 0); ell(r, '#5aa64e', [0, .63, .58], [.2, .018, .19], [-.2, 0, 0], 18); ell(r, '#7cc566', [0, .645, .58], [.17, .01, .16], [-.2, 0, 0], 14);
        daisy(r, [.07, .66, .55], 1.1, '#ffc6dc', '#ffd84a', [-.2, 0, 0]);
      }
      r.on('head').mark('muzzle', [0, .41, .85]);
      if (water) kerchief(r, '#f0a35a', .40, .46, .17);
      return details(r, { height: water ? .78 : .87, scale: water ? .9 : 1, species: water ? 'waterturtle' : 'turtle', animAs: 'turtle', legs });
    }
    function frog(r, o, boss, X) {
      X = X || {};
      const [base, light, cream, dark] = PALETTES.frog, head = [0, .43, .30];
      const legs = quadRig(r, { width: .31, front: .34, back: -.31, head, by: .30, color: base, paw: light, w: .12, web: true, toes: 3, long: true });
      r.on('body').fx(0, .24, .10);
      ell(r, skin(base, light, dark, .12, .63), [0, .32, -.08], [.40, .27, .45]);
      ell(r, cream, [0, .24, .24], [.30, .15, .31]);
      for (const sd of [-1, 1]) {
        ell(r, base, [sd * .36, .23, -.22], [.23, .17, .30], [0, sd * -.2, sd * .2]);
        ell(r, dark, [sd * .37, .38, -.20], [.024, .009, .049], [0, sd * .4, 0], 10);
      }
      r.on('head'); ell(r, light, head, [.39, .245, .29]);
      // Raised eye turrets make the silhouette read as frog even without its green colour.
      for (const sd of [-1, 1]) ell(r, base, [sd * .215, .625, .31], [.13, .145, .12]);
      express(r, [0, .55, .36], .28, { color: light, ex: .19, ey: .075, er: .100, tilt: .55, mouthY: -.15, mouthW: .18, mR: .31, iris: '#b89943', heartY: 1.40 });
      // Organic spots, never a regular tiled checker.
      r.on('body');
      for (let i = 0; i < 11; i++) {
        const a = i * 2.399, y = .49 + .06 * Math.sin(i * 1.71), rr = .19 + (i % 3) * .055;
        ell(r, i % 2 ? '#528958' : '#91be77', [Math.sin(a) * rr, y, -.09 + Math.cos(a) * rr], [.022 + (i % 3) * .007, .009, .03], [0, a, 0], 10);
      }
      // A curved throat pouch and shoulder folds read clearly as it takes a breath before hopping.
      if (boss) { bone(r, 'throat', 'head', [0, .31, .44]); r.on('throat'); } else r.on('head');
      r.fx(0, .20, .22); ell(r, cream, [0, .302, .475], [.23, .075, .135], null, 14);
      r.on('head');
      for (const sd of [-1, 1]) ell(r, mixc(base, dark, .18), [sd * .31, .32, .21], [.044, .089, .098], [0, sd * -.45, sd * .2], 10);
      if (boss) {
        // Pond king: a lily-pad hat with a pink water-lily on top, a sticky pink tongue folded in the mouth.
        r.on('head').fx(0, .35, .2);
        ell(r, '#3f8a49', [0, .745, .25], [.31, .04, .28], [-.18, 0, 0], 26);
        ell(r, '#76c46a', [0, .772, .25], [.285, .022, .255], [-.18, 0, 0], 22);
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6; r.seg([0, .786, .25], [Math.sin(a) * .24, .786 - .04 * Math.cos(a), .25 + Math.cos(a) * .22], .006, '#a6db8f', .004, 5); }
        r.fx(0, .3, 0);
        for (let i = 0; i < 7; i++) {
          const a = i * TAU / 7;
          ell(r, i % 2 ? '#f6a9c6' : '#f28db5', [Math.sin(a) * .07, .80, .24 + Math.cos(a) * .07], [.045, .028, .085], [.55, a, 0], 12);
        }
        for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + .3; ell(r, '#ffd1e0', [Math.sin(a) * .035, .835, .24 + Math.cos(a) * .035], [.03, .04, .05], [.3, a, 0], 10); }
        ell(r, '#ffd94e', [0, .855, .24], [.035, .025, .035], null, 10);
        bone(r, 'tongue', 'head', [0, .40, .58]); r.on('tongue').fx(0, .55, 0);
        r.seg([0, .40, .58], [0, .40, .80], .055, '#ef7f9e', .06, 12);
        bone(r, 'tongueTip', 'tongue', [0, .40, .82]); r.on('tongueTip');
        ell(r, '#f490ab', [0, .40, .84], [.095, .065, .075], null, 14);
        r.fx(0, 0, 0);
      }
      if (!boss) {   // (ANIM) a sticky tongue for its silly gag (it ties itself in a knot), hidden until then
        bone(r, 'tongue', 'head', [0, .40, .56]); r.on('tongue').fx(0, .55, 0);
        r.seg([0, .40, .56], [0, .40, .70], .035, '#ef7f9e', .04, 10);
        bone(r, 'tongueTip', 'tongue', [0, .40, .71]); r.on('tongueTip'); ell(r, '#f490ab', [0, .40, .73], [.06, .045, .05], null, 12);
        r.on('head').fx(0, .5, 0);
        // a shiny water droplet on the head and glossy wet highlights on the back
        ell(r, '#bfe9ff', [.13, .66, .18], [.035, .045, .035], null, 10);
        r.fx(.4, .8, 0); ell(r, '#ffffff', [.12, .68, .2], [.012, .015, .01], null, 6); r.fx(0, .24, .10);
      }
      if (X.lily) {   // Nilüfer Kurbağası: rides its own lily pad (root bone: stays flat while the frog bobs), a lily bud crown
        fbone(r, 'pad', [0, .03, 0]); r.fx(0, .35, 0);
        ell(r, skin('#4f9a48', '#7cc566', '#3c7a39', 0, .06), [0, .03, -.02], [.62, .03, .66], null, 26);
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + .2; r.seg([0, .062, -.02], [Math.sin(a) * .55, .058, -.02 + Math.cos(a) * .58], .006, '#a6db8f', .004, 5); }
        r.fx(0, 0, 0); ell(r, '#8fd0f0', [0, .015, -.02], [.72, .008, .76], null, 20);
        r.on('head').fx(0, .3, 0);
        for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ell(r, i & 1 ? '#f6a9c6' : '#ffd1e0', [Math.sin(a) * .04, .69, .26 + Math.cos(a) * .04], [.03, .055, .03], [Math.cos(a) * .5, 0, -Math.sin(a) * .5], 10); }
        ell(r, '#ffd94e', [0, .72, .26], [.025, .02, .025], null, 8);
      }
      stars(r, [0, boss ? .98 : .82, .3], boss ? .32 : .28);
      r.on('head').mark('muzzle', [0, .43, .67]);
      return details(r, { height: boss ? .95 : .83, scale: boss ? 2.6 : X.lily ? .95 : 1, species: boss ? 'frogboss' : X.lily ? 'lilyfrog' : 'frog', animAs: 'frog', legs, ownHurt: !!boss,
        lifeHide: boss ? null : ['tongue'], portrait: boss ? { cx: 0, cy: .55, cz: .4, rad: .5 } : undefined });
    }
    function squirrel(r, o, X) {
      X = X || {};
      const [base, light, cream, dark] = PALETTES.squirrel, head = [0, .80, .15];
      const legs = quadRig(r, { width: .20, front: .15, back: -.21, head, by: .49, color: base, paw: light, fur: true, w: .09 });
      r.on('body').fx(0, .08, .65);
      ell(r, base, [0, .49, -.04], [.235, .34, .30]); ell(r, cream, [0, .48, .19], [.16, .26, .07]);
      r.on('head'); ell(r, light, head, [.24, .25, .235], null, 28);
      ears(r, head, base, '#d8a075', .18, true, false);
      for (const sd of [-1, 1]) { r.on(sd > 0 ? 'earL' : 'earR'); ell(r, dark, [sd * .18, 1.067, .043], [.030, .085, .035], [0, 0, sd * -.14], 10); fluff(r, dark, [sd * .18, 1.13, .04], [.03, .045, .03]); }
      r.on('head');
      for (const sd of [-1, 1]) ell(r, cream, [sd * .10, .72, .32], [.10, .093, .10]);
      ell(r, DARK, [0, .745, .405], [.036, .024, .024]);
      express(r, head, .235, { color: light, ex: .10, ey: .035, er: .074, iris: '#635243', mouthW: .08, mouthY: -.11, buck: true, buckH: .16, noTongue: true });
      // Three articulated lobes curl up and forward. Cross-strand fur ridges are actual rounded geometry.
      const tailPoints = [[0, .58, -.48], [0, .95, -.58], [0, 1.22, -.33]];
      for (let i = 0; i < 3; i++) {
        r.on('tail' + i).fx(0, .05, .60);
        const p = tailPoints[i]; ell(r, i === 2 ? light : base, p, [.27 - i * .024, .335, .275], [i === 2 ? .50 : -.25, 0, 0], 18);
        ell(r, mixc(light, cream, .18), [0, p[1] + .04, p[2] - .205], [.15, .23, .065], [i === 2 ? .50 : -.25, 0, 0], 14);
        for (let j = 0; j < 4; j++) {
          const x = (j - 1.5) * .10;
          ell(r, j % 2 ? light : mixc(base, dark, .16), [x, p[1] + .14 - Math.abs(j - 1.5) * .025, p[2] - .16], [.066, .12, .072], [i === 2 ? .5 : -.3, 0, -x * .8], 12);
        }
      }
      // A little acorn purse hangs against the chest; the thrower takes imaginary acorns from it.
      r.on('body').fx(0, .04, .50);
      ell(r, '#b5844a', [.18, .44, .28], [.10, .12, .09]); ell(r, '#80613d', [.18, .52, .28], [.112, .049, .10]);
      for (let i = 0; i < 5; i++) ell(r, '#d1a666', [.14 + i * .020, .53, .347], [.010, .017, .010], null, 8);
      if (X.soldier) {   // Palamut Askeri: an acorn-cap helmet with a stalk plume and a twig spear with a leaf flag
        r.on('head').fx(0, .3, .2);
        r.add(G.hemi(20), skin('#9a6a3a', '#b8864f', '#7a5230', .9, 1.08), [0, .95, .14], [-.15, 0, 0], [.235, .17, .235]);
        for (let i = 0; i < 10; i++) { const a = i * TAU / 10; ell(r, '#7a5230', [Math.sin(a) * .2, .985, .14 + Math.cos(a) * .2], [.035, .025, .035], null, 6); }
        r.seg([0, 1.1, .12], [.03, 1.2, .1], .016, '#6b4a2e', .01, 6);
        r.on('legFL').fx(0, .2, 0); r.seg([.2, .12, .35], [.24, 1.05, .45], .016, '#8a6238', .012, 6);
        r.fx(0, .3, 0); ell(r, '#8cc463', [.27, 1.0, .46], [.06, .035, .01], [0, 0, -.3], 8);
      }
      kerchief(r, X.soldier ? '#c9483e' : '#8ab46a', .73, .15, .19);
      // (ANIM) the acorn of its gag (tossed up, it bonks its own head), hidden until then
      bone(r, 'nut', 'head', [0, 1.1, .2]); r.on('nut').fx(0, .5, .3);
      ell(r, '#c79a5a', [0, 1.08, .2], [.07, .085, .07], null, 12); r.add(G.hemi(12), '#7a5230', [0, 1.11, .2], null, [.078, .05, .078]);
      stars(r, [0, 1.12, .15], .25);
      r.on('head').mark('muzzle', [0, .75, .42]);
      return details(r, { height: 1.46, species: X.soldier ? 'soldier' : 'squirrel', animAs: 'squirrel', legs, lifeHide: ['nut'], scale: X.soldier ? .85 : 1 });
    }
    // ════════ 6 bölüm genişlemesi: yeni huysuz hayvanlar ve beş bölüm canavarı ════════
    // Hepsi aynı tek çizimlik iskelet + iki yüz hâli. Mermiler (kütük, dalga, taş, arı kovanı) canavarın kendi kemikleridir:
    // m.anim onları st.fo'daki dünya konumlarına yerleştirir, kullanılmayınca küçültüp saklar (sahneye ek nesne yok).
    const HIDE = .0001;
    function fbone(r, name, p) { bone(r, name, 'root', p); r.on(name); }
    // Upright two-legged rig for birds (ördek, baykuş) and the beaver.
    function bipedRig(r, c) {
      bone(r, 'body', 'root', [0, c.by, 0]);
      bone(r, 'head', 'body', c.head);
      for (const sd of [-1, 1]) {
        bone(r, sd > 0 ? 'wingL' : 'wingR', 'body', [sd * c.wx, c.wy, c.wz || 0]);
        bone(r, sd > 0 ? 'legL' : 'legR', 'body', [sd * c.lx, c.ly, c.lz || 0]);
      }
      bone(r, 'tail0', 'body', c.tail);
      if (c.tail1) bone(r, 'tail1', 'tail0', c.tail1);
    }
    function webFoot(r, x, z, c, len = .12, w = .085) {
      ell(r, c, [x, .035, z + len * .45], [w, .028, len], null, 12);
      for (let t = -1; t <= 1; t++) ell(r, mixc(c, '#ffffff', .12), [x + t * w * .62, .04, z + len * 1.15 - Math.abs(t) * .02], [.026, .022, .05], [0, t * .3, 0], 8);
    }
    // ── Ördek: tombul yeşil başlı yaban ördeği, turuncu gaga (alt gagası 'jaw' kemiğinde vaklar), perdeli ayaklar ──
    function duck(r, o) {
      const head = [0, .84, .16];
      bipedRig(r, { by: .42, head: [0, .66, .10], wx: .25, wy: .52, wz: -.04, lx: .11, ly: .26, tail: [0, .48, -.34] });
      r.on('body').fx(0, .12, .5);
      ell(r, skin('#a7a69a', '#d7d6cd', '#7f7d72', .18, .66), [0, .42, -.04], [.30, .25, .38], null, 26);
      ell(r, skin('#a8644a', '#c98e6c', '#7f4a37', .32, .62), [0, .47, .17], [.25, .21, .19], [-.3, 0, 0], 20);
      ell(r, '#efe9db', [0, .30, .02], [.25, .13, .30], null, 18);
      // Long neck feathers in the glossy mallard green, a clean white collar.
      ell(r, '#2f7a52', [0, .64, .13], [.13, .16, .12], [-.2, 0, 0], 16);
      r.add(G.torus(TAU, .28, 22), '#fbfaf3', [0, .585, .145], [PI / 2 - .25, 0, 0], [.135, .125, .14]);
      // A little curled drake feather on the tail.
      r.on('tail0').fx(0, .2, .3);
      ell(r, '#f3f0e6', [0, .46, -.38], [.18, .09, .12], [.4, 0, 0], 14);
      ell(r, '#46514f', [0, .54, -.40], [.10, .07, .09], [.6, 0, 0], 12);
      r.add(G.torus(PI * 1.4, .32, 14), '#2b3a3a', [0, .62, -.38], [0, PI / 2, 0], [.055, .055, .05]);
      r.on('head').fx(0, .35, .25);
      ell(r, skin('#2f8a5a', '#58b47e', '#1e5e40', .66, 1.04), head, [.20, .19, .21], null, 26);
      ell(r, '#3aa06b', [0, .93, .12], [.12, .07, .15], null, 12);
      r.fx(0, .55, 0);
      ell(r, '#f2a43a', [0, .80, .38], [.105, .045, .135], [-.12, 0, 0], 18);
      ell(r, '#f6b958', [0, .815, .36], [.07, .02, .10], [-.12, 0, 0], 12);
      for (const sd of [-1, 1]) ell(r, '#9a5c22', [sd * .028, .825, .455], [.012, .006, .016], null, 8);
      bone(r, 'jaw', 'head', [0, .775, .28]);
      r.on('jaw').fx(0, .5, 0); ell(r, '#e49031', [0, .765, .36], [.092, .028, .118], [-.08, 0, 0], 14);
      express(r, [0, .87, .17], .195, { color: '#2f8a5a', ex: .088, ey: .035, er: .066, tilt: .3, noMouth: true, iris: '#5a3b22', heartY: 1.15 });
      for (const sd of [-1, 1]) {
        r.on(sd > 0 ? 'wingL' : 'wingR').fx(0, .2, .45);
        ell(r, skin('#9a998d', '#cfcdc2', '#77756b', .3, .62), [sd * .275, .48, -.06], [.075, .17, .27], [.18, 0, sd * -.10], 16);
        ell(r, '#3d63b8', [sd * .33, .43, -.15], [.016, .05, .10], [.15, 0, sd * -.1], 10);
        ell(r, '#fbfaf3', [sd * .332, .405, -.15], [.014, .012, .10], [.15, 0, sd * -.1], 8);
        for (let i = 0; i < 3; i++) ell(r, '#6d6c62', [sd * .27, .40 - i * .02, -.27 - i * .05], [.05, .03, .09], [.35, 0, sd * -.1], 10);
        r.on(sd > 0 ? 'legL' : 'legR').fx(0, .3, 0);
        r.seg([sd * .11, .26, 0], [sd * .11, .06, .03], .032, '#ee9a3b', .026, 8);
        webFoot(r, sd * .11, .02, '#f0a040');
      }
      kerchief(r, '#5cb1c9', .56, .17, .18);
      // (ANIM) a curly drake feather on top of the head, glossy cheek highlight
      r.on('head').fx(0, .5, .2);
      r.add(G.torus(PI * 1.3, .3, 12), '#24604a', [0, 1.06, .1], [0, PI / 2, .4], [.05, .05, .045]);
      ell(r, '#2f7a52', [0, 1.02, .13], [.03, .05, .03], [.3, 0, 0], 8);
      stars(r, [0, 1.1, .16], .2);
      r.on('head').mark('muzzle', [0, .80, .48]);
      return details(r, { height: 1.0, species: 'duck', portrait: { cx: 0, cy: .72, cz: .3, rad: .5 } });
    }
    // ── Baykuş (yavru ve Huysuz Baykuş): yumurta biçimli gövde, kalp biçimli yüz diski, kocaman gözler, yumuşak kulak püskülleri ──
    function owl(r, o, boss) {
      const baby = !boss;
      const PAL = boss ? ['#9a6f4c', '#c79c74', '#f3e3c6', '#6b4a33'] : ['#a89a8f', '#d4c8bc', '#f6eee2', '#7a6c62'];
      const [base, light, cream, dark] = PAL;
      bipedRig(r, { by: .40, head: [0, .62, .02], wx: .27, wy: .52, wz: -.02, lx: .095, ly: .16, lz: .05, tail: [0, .24, -.24] });
      r.on('body').fx(0, .08, .6);
      ell(r, skin(base, light, dark, .1, .62), [0, .40, -.02], [.31, .32, .27], null, 26);
      ell(r, skin(cream, '#ffffff', light, .12, .58), [0, .37, .11], [.23, .25, .17], null, 20);
      // Soft chevrons on the chest (rounded little arcs, never a hard grid).
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - (row & 1); i++) {
        const x = (i - (3 - (row & 1)) / 2) * .075, y = .44 - row * .075, z = .11 + .16 * Math.sqrt(Math.max(0, 1 - (x / .23) ** 2 - ((y - .37) / .25) ** 2));
        r.add(G.torus(PI * .8, .28, 10), mixc(light, dark, .45), [x, y, z + .005], [0, 0, PI * 1.1], [.022, .016, .012]);
      }
      if (baby) for (let i = 0; i < 9; i++) {   // fluffy down puffs all over the owlet
        const a = i * 2.4, y = .25 + (i % 3) * .1;
        ell(r, i % 2 ? cream : light, [Math.sin(a) * .27, y, Math.cos(a) * .22 - .02], [.07, .06, .06], null, 10);
      }
      r.on('head').fx(0, .08, .55);
      const H = [0, boss ? .76 : .72, .04], HR = boss ? .27 : .26;
      ell(r, skin(base, light, dark, H[1] - HR, H[1] + HR), H, [HR * 1.1, HR * .96, HR], null, 26);
      // Heart-shaped pale facial disc in two halves, darker rim.
      for (const sd of [-1, 1]) {
        ell(r, mixc(dark, base, .4), [sd * .105, H[1] - .005, H[2] + .175], [.15, .16, .07], [0, sd * .32, 0], 18);
        ell(r, cream, [sd * .10, H[1], H[2] + .19], [.135, .145, .07], [0, sd * .32, 0], 18);
      }
      // Soft ear tufts (round tips), a small hooked beak.
      for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) {   // soft feather tufts: three overlapping rounded feathers each
        const k = baby ? .7 : 1;
        if (!j) { bone(r, sd > 0 ? 'earL' : 'earR', 'head', [sd * .14, H[1] + .14, H[2] - .02]); r.fx(0, .08, .55); }
        ell(r, j === 1 ? dark : mixc(base, dark, .5), [sd * (.14 + j * .035) , H[1] + .2 + j * .02 * k, H[2] - .02 - j * .015], [.035 * k, .11 * k, .03], [0, 0, sd * (-.25 - j * .22)], 10);
      }
      r.on('head');
      if (baby) for (let i = 0; i < 5; i++) ell(r, cream, [(i - 2) * .05, H[1] + .25 - Math.abs(i - 2) * .025, H[2] - .02], [.035, .055, .03], [0, 0, (i - 2) * .3], 8);
      if (baby) {   // (ANIM) the owlet still wears half its eggshell as a little hat
        r.fx(0, .4, 0); r.add(G.hemi(18), '#fbf6ea', [0, H[1] + .2, H[2] - .03], [PI, 0, .18], [.15, .1, .15]);
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8; cone(r, [Math.sin(a) * .135, H[1] + .2, H[2] - .03 + Math.cos(a) * .135], [Math.sin(a) * .2, 1, Math.cos(a) * .2], .06, .035, '#fbf6ea', 6); }
        r.fx(0, .08, .55);
      }
      r.fx(0, .5, 0);
      cone(r, [0, H[1] - .025, H[2] + .25], [0, -.75, .6], .10, .042, '#e2a23c', 12);
      ell(r, '#f0b552', [0, H[1] - .03, H[2] + .255], [.04, .04, .035], null, 10);
      express(r, [0, H[1] + .015, H[2] + .02], .25, { color: cream, ex: .105, ey: .02, er: boss ? .085 : .092, tilt: .18,
        noMouth: true, iris: '#e8a326', inset: .01, browCol: dark, browY: 1.55, heartY: 1.25 });
      if (boss) {
        bone(r, 'specs', 'head', [0, H[1] + .03, H[2] + .26]); r.fx(0, 2, 0);   // (ANIM) on their own bone: they fall off in his gag
        // Little round gold spectacles and a plum bow tie: the grumpy old teacher of the night wood.
        for (const sd of [-1, 1]) r.add(G.torus(TAU, .11, 22), '#d8b04a', [sd * .11, H[1] + .02, H[2] + .262], [-.18, 0, 0], [.118, .118, .1]);
        r.seg([-.02, H[1] + .035, H[2] + .275], [.02, H[1] + .035, H[2] + .275], .009, '#d8b04a', .009, 6);
        for (const sd of [-1, 1]) r.seg([sd * .2, H[1] + .03, H[2] + .26], [sd * .24, H[1] + .05, H[2] + .10], .008, '#d8b04a', .008, 6);
        r.on('body').fx(0, .3, 0);
        for (const sd of [-1, 1]) ell(r, '#8e4f8e', [sd * .075, .58, .23], [.075, .05, .035], [0, 0, sd * .25], 12);
        ell(r, '#a8659f', [0, .58, .25], [.035, .035, .03], null, 10);
      }
      for (const sd of [-1, 1]) {
        r.on(sd > 0 ? 'wingL' : 'wingR').fx(0, .1, .5);
        const wx = sd * (boss ? .29 : .27);
        ell(r, skin(base, light, dark, .2, .6), [wx, .42, -.05], [.08, boss ? .25 : .19, .21], [.16, 0, sd * -.14], 18);
        for (let i = 0; i < 4; i++) ell(r, i % 2 ? dark : mixc(base, dark, .3), [wx + sd * .01, .26 - i * .012 + (boss ? -.03 : .02), -.08 - i * .04], [.055, .10, .06], [.3 + i * .08, 0, sd * -.14], 10);
        for (let i = 0; i < 3; i++) ell(r, cream, [wx + sd * .065, .44 - i * .07, -.02 - i * .02], [.012, .02, .025], null, 8);
        r.on(sd > 0 ? 'legL' : 'legR').fx(0, .25, .2);
        ell(r, light, [sd * .095, .12, .05], [.07, .06, .07], null, 12);
        for (let t = -1; t <= 1; t++) ell(r, '#b9a07a', [sd * .095 + t * .04, .035, .12 + (t ? -.01 : .015)], [.026, .026, .05], null, 8);
      }
      r.on('tail0').fx(0, .1, .5);
      for (let i = -1; i <= 1; i++) ell(r, i ? dark : base, [i * .06, .22, -.28], [.05, .03, .13], [-.5, i * .25, 0], 10);
      if (!boss) kerchief(r, '#e7a6c0', .47, .14, .2);
      stars(r, [0, H[1] + (baby ? .36 : .4), H[2]], boss ? .3 : .27);
      r.on('head').mark('muzzle', [0, H[1] - .05, H[2] + .32]);
      return details(r, { height: boss ? 1.1 : 1.0, scale: boss ? 2.3 : .78, species: boss ? 'owlboss' : 'owlet', flyer: !boss,
        portrait: { cx: 0, cy: .66, cz: .25, rad: .55 } });
    }
    // ── Kunduz (Huysuz Kunduz ve yavrusu): armut gövde, tombul yanaklar, iki kocaman ön diş, kürek gibi düz kuyruk ──
    function beaver(r, o, boss) {
      const base = '#8a5a3a', light = '#b7845a', cream = '#e9cfa8', dark = '#5e3c28', TAIL = '#5a4c4f';
      const head = [0, 1.02, .08];
      bone(r, 'body', 'root', [0, .52, 0]);
      bone(r, 'head', 'body', [0, .92, .06]);
      for (const sd of [-1, 1]) {
        bone(r, sd > 0 ? 'armL' : 'armR', 'body', [sd * .27, .80, .12]);
        bone(r, sd > 0 ? 'legL' : 'legR', 'body', [sd * .22, .28, .02]);
      }
      bone(r, 'tail0', 'body', [0, .24, -.34]);
      bone(r, 'tail1', 'tail0', [0, .14, -.52]);
      r.on('body').fx(0, .08, .65);
      ell(r, skin(base, light, dark, .05, 1.0), [0, .53, -.04], [.40, .44, .37], null, 28);
      ell(r, skin(base, light, dark, .05, .7), [0, .34, -.06], [.45, .29, .41], null, 24);
      ell(r, skin(cream, '#f6e6cc', light, .2, .9), [0, .55, .17], [.29, .36, .20], null, 20);
      // Fur tufts on the shoulders and the round haunches.
      for (const sd of [-1, 1]) {
        ell(r, mixc(base, light, .25), [sd * .30, .74, .02], [.13, .12, .14], null, 12);
        ell(r, base, [sd * .29, .30, .03], [.17, .20, .22], [0, 0, sd * .2], 14);
      }
      r.on('head').fx(0, .08, .5);
      ell(r, skin(base, light, dark, .8, 1.3), head, [.30, .27, .28], null, 28);
      for (const sd of [-1, 1]) {
        ell(r, light, [sd * .14, .95, .27], [.14, .11, .11], null, 16);
        bone(r, sd > 0 ? 'earL' : 'earR', 'head', [sd * .21, 1.15, .01]); r.fx(0, .08, .5);
        ell(r, base, [sd * .23, 1.20, .01], [.075, .075, .045], [0, sd * .3, 0], 12);
        ell(r, PINK, [sd * .23, 1.20, .035], [.045, .045, .02], [0, sd * .3, 0], 10);
        r.on('head');
        fluff(r, mixc(light, cream, .3), [sd * .2, .92, .3], [.09, .07, .06]);   // (ANIM) chubby fluffy cheeks
        for (let w = 0; w < 3; w++) r.seg([sd * .13, .95 - w * .02, .36], [sd * (.33 + w * .02), .97 - w * .045, .36 - w * .02], .005, '#3d2a22', .003, 5);
      }
      ell(r, cream, [0, .955, .32], [.15, .095, .09], null, 16);
      r.fx(0, .6, 0); ell(r, '#3b2620', [0, 1.005, .395], [.07, .045, .04], null, 14); r.fx(0, .08, .5);
      express(r, [0, 1.04, .08], .28, { color: base, ex: .12, ey: .05, er: boss ? .082 : .09, mouthY: -.155, mouthW: .10, mR: .345,
        buck: true, buckH: .19, buckW: .2, toothCol: '#fff4dc', iris: '#6b4a2f', tilt: .38, heartY: 1.3 });
      for (const sd of [-1, 1]) {
        const arm = sd > 0 ? 'armL' : 'armR';
        r.on(arm).fx(0, .08, .6);
        r.seg([sd * .27, .80, .12], [sd * .25, .62, .30], .085, base, .065, 12);
        ell(r, dark, [sd * .245, .60, .33], [.075, .06, .075], null, 12);
        for (let f = -1; f <= 1; f++) ell(r, dark, [sd * .245 + f * .035, .565, .385], [.018, .018, .026], null, 8);
        r.on(sd > 0 ? 'legL' : 'legR').fx(0, .15, .3);
        ell(r, '#4f3428', [sd * .22, .05, .15], [.12, .045, .21], null, 14);
        for (let f = -2; f <= 2; f++) ell(r, '#4f3428', [sd * .22 + f * .045, .05, .34 - Math.abs(f) * .02], [.024, .022, .05], null, 8);
      }
      // Flat paddle tail with soft criss-cross scales (raised geometry, not a texture checker).
      r.on('tail0').fx(0, .1, .4); ell(r, base, [0, .23, -.42], [.15, .10, .13], null, 14);
      r.on('tail1').fx(0, .3, .8);
      ell(r, TAIL, [0, .12, -.80], [.27, .05, .38], null, 22);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
        const z = -.56 - i * .1, x = (j - 1) * .09 + (i & 1 ? .045 : 0);
        if (Math.abs(x) > .2 * Math.sqrt(Math.max(0, 1 - ((z + .8) / .38) ** 2)) + .02) continue;
        ell(r, mixc(TAIL, '#8d7f80', .35), [x, .162, z], [.034, .012, .04], [0, PI / 4, 0], 8);
      }
      if (boss) {
        r.on('body').fx(0, .25, .3);   // a builder's tool belt (no scarf over his big teeth)
        r.add(G.torus(TAU, .09, 30), '#8a5a34', [0, .42, -.05], [PI / 2, 0, 0], [.462, .425, .45]);
        r.fx(0, 2, 0); softBox(r, '#e5b84b', [0, .41, .37], [.09, .07, .03]); r.fx(0, .25, .3);
        softBox(r, '#9a6a3e', [.27, .36, .28], [.08, .10, .05], [0, .6, 0]);
        r.seg([.28, .40, .31], [.30, .52, .31], .018, '#f1d36a', .012, 6);
        r.on('head').fx(0, .55, 0);
        // A cheerful yellow builder's hat (he builds the dam) with a little leaf tucked in.
        r.add(G.hemi(26), '#f2c14a', [0, 1.19, .06], [-.12, 0, 0], [.29, .21, .29]);
        ell(r, '#e8b23a', [0, 1.20, .10], [.35, .028, .37], [-.12, 0, 0], 24);
        ell(r, '#f7d36b', [0, 1.37, .03], [.045, .055, .25], [-.12, 0, 0], 12);
        r.fx(0, .2, 0); ell(r, '#7fb85b', [.17, 1.32, .02], [.03, .09, .015], [0, .3, -.6], 10);
        // The log he throws and gnaws (shown only in those moves) and the water wave of his tail slap.
        fbone(r, 'log', [0, .70, .46]); r.fx(0, .1, .9);
        r.seg([-.36, .70, .46], [.36, .70, .46], .13, '#7a5236', .13, 18);
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .3; ell(r, '#68452e', [(i - 2.5) * .11, .70 + Math.sin(a) * .128, .46 + Math.cos(a) * .128], [.05, .012, .012], [a, 0, 0], 8); }
        for (const sd of [-1, 1]) {
          ell(r, '#e8c99a', [sd * .362, .70, .46], [.012, .118, .118], null, 18);
          r.add(G.torus(TAU, .12, 20), '#c79b6a', [sd * .368, .70, .46], [0, PI / 2, 0], [.075, .075, .05]);
          r.add(G.torus(TAU, .14, 20), '#c79b6a', [sd * .368, .70, .46], [0, PI / 2, 0], [.035, .035, .03]);
        }
        r.fx(0, .2, 0); ell(r, '#86c05c', [.12, .845, .46], [.07, .02, .035], [0, .4, .3], 10); ell(r, '#6fae4a', [.17, .84, .48], [.05, .018, .03], [0, -.5, .2], 10);
        for (let i = 0; i < 3; i++) {   // (ANIM) the three logs of his little dam (the 'dam' fun moment), hidden until then
          const y = .14 + i * .22, w = .5 - i * .08;
          fbone(r, 'dl' + i, [0, y, 1.0]); r.fx(0, .1, .9);
          r.seg([-w, y, 1.0], [w, y, 1.0], .12, i & 1 ? '#86593a' : '#7a5236', .12, 14);
          for (const sd of [-1, 1]) { ell(r, '#e8c99a', [sd * (w + .005), y, 1.0], [.01, .11, .11], null, 12); r.add(G.torus(TAU, .14, 16), '#c79b6a', [sd * (w + .01), y, 1.0], [0, PI / 2, 0], [.06, .06, .04]); }
          r.fx(0, .2, 0); if (i === 2) ell(r, '#86c05c', [.1, y + .13, 1.0], [.06, .02, .03], [0, .4, .3], 8);
        }
        fbone(r, 'wave', [0, 0, 1.6]); r.fx(.15, .9, 0);
        ell(r, '#5fb3df', [0, .16, 1.55], [.74, .18, .24], null, 22);
        ell(r, '#7cc8ec', [0, .34, 1.62], [.68, .17, .14], [-.35, 0, 0], 20);
        ell(r, '#a9dcf2', [0, .47, 1.72], [.62, .09, .10], [-.6, 0, 0], 18);
        for (let i = 0; i < 7; i++) ell(r, '#f4fbff', [(i - 3) * .19, .53 + (i % 2) * .03, 1.78], [.10, .055, .07], null, 10);
        for (let i = 0; i < 5; i++) ell(r, '#ffffff', [(i - 2) * .3 + .1, .58 + (i % 2) * .05, 1.86], [.035, .035, .035], null, 8);
        r.fx(0, 0, 0);
      } else {
        kerchief(r, '#e3b34c', .74, .13, .27);
        r.on('head'); r.fx(0, .3, 0); ell(r, '#7fb85b', [-.1, 1.3, .02], [.035, .1, .015], [0, .3, .6], 10); ell(r, '#9bcf6e', [-.05, 1.31, .03], [.03, .08, .012], [0, -.2, .1], 10);
        r.seg([-.08, 1.27, .02], [-.07, 1.33, .02], .01, '#6b4a2e', .008, 5); r.fx(0, .08, .5);
      }
      for (let i = 0; i < 3; i++) fluff(r, mixc(base, light, .3), [(i - 1) * .06, 1.28, .05], [.05, .05, .045]);
      stars(r, [0, boss ? 1.55 : 1.42, .06], .3);
      r.on('head').mark('muzzle', [0, .96, .42]);
      return details(r, { height: boss ? 1.42 : 1.3, scale: boss ? 2.0 : .7, species: boss ? 'beaverboss' : 'beaver',
        portrait: { cx: 0, cy: .98, cz: .3, rad: .55 }, ownHurt: !!boss, foBones: boss ? ['log', 'wave', 'dl0', 'dl1', 'dl2'] : null, dieHop: boss ? .1 : undefined });
    }
    // ── Kirpi: yumuşak, yuvarlak uçlu diken tutamları (sivri değil), sırtında elma ──
    function hedgehog(r, o) {
      const base = '#b79572', cream = '#f2dcc0', SP = '#7b5a42', TIP = '#efe0c8', head = [0, .31, .30];
      const legs = quadRig(r, { width: .17, front: .16, back: -.18, head, by: .30, color: base, paw: '#c9a585', w: .07, fur: true });
      r.on('body').fx(0, .08, .6);
      ell(r, skin(base, cream, '#8a6c52', .08, .5), [0, .30, -.03], [.30, .24, .35], null, 24);
      // Spine tufts: rounded elongated drops along the outward normal, darker roots, cream tips.
      // A dense, overlapping coat that lies back like a pine cone; the face and belly stay soft and clear.
      const sc = [0, .31, -.05], sa = [.30, .245, .34];
      ell(r, '#8a6a4f', sc, [sa[0] * .98, sa[1] * .98, sa[2] * .98], null, 20);
      for (let ring = 0; ring < 8; ring++) {
        const phi = .12 + ring * .19, n = 7 + ring * 3;
        for (let i = 0; i < n; i++) {
          const th = (i + (ring & 1) * .5) / n * TAU;
          if (Math.cos(th) > (phi < .5 ? .75 : .05)) continue;   // keep the face clear
          if (phi > 1.35 && Math.cos(th) > -.6) continue;
          const [p, nn] = onEll(sc, sa, phi, th), n0 = new THREE.Vector3(nn[0], nn[1], nn[2]).normalize();
          const d = n0.clone().multiplyScalar(.55).add(new THREE.Vector3(0, .05, -1)).normalize();
          const c = (i + ring) % 3 ? SP : mixc(SP, '#5e432f', .5);
          ell(r, c, [p[0] + d.x * .05 + n0.x * .01, p[1] + d.y * .05 + n0.y * .01, p[2] + d.z * .05 + n0.z * .01], [.042, .036, .105], qz(d.x, d.y, d.z), 7);
          if ((i + ring) & 1) ell(r, TIP, [p[0] + d.x * .135 + n0.x * .012, p[1] + d.y * .135 + n0.y * .012, p[2] + d.z * .135 + n0.z * .012], [.026, .023, .035], qz(d.x, d.y, d.z), 6);
        }
      }
      // A shiny red apple (with a leaf) stuck on its back.
      r.fx(0, .7, 0); ell(r, '#d9473b', [.06, .62, -.12], [.11, .10, .11], null, 16);
      r.fx(0, .2, 0); r.seg([.06, .70, -.12], [.07, .76, -.12], .01, '#5d3d27', .008, 6); ell(r, '#79b852', [.11, .75, -.12], [.05, .015, .025], [0, 0, -.4], 8);
      r.on('head').fx(0, .08, .45);
      ell(r, cream, head, [.19, .17, .15], null, 20);
      cone(r, [0, .285, .38], [0, -.12, 1], .17, .085, cream, 16);
      r.fx(0, .7, 0); ell(r, '#2d2020', [0, .27, .555], [.035, .03, .03], null, 10); r.fx(0, .08, .45);
      for (const sd of [-1, 1]) { ell(r, base, [sd * .13, .43, .25], [.05, .05, .03], null, 10); ell(r, PINK, [sd * .13, .43, .27], [.03, .03, .01], null, 8); }
      express(r, [0, .33, .31], .17, { color: cream, ex: .075, ey: .03, er: .055, tilt: .3, mouthY: -.075, mouthW: .06, mR: .21, iris: '#4a3324', heartY: 1.3 });
      stars(r, [0, .62, .2], .22);
      r.on('head').mark('muzzle', [0, .29, .56]);
      return details(r, { height: .82, species: 'hedgehog', legs, animAs: 'boar' });
    }
    const BWG = {};
    function batWingGeo(sd) {
      if (BWG[sd]) return BWG[sd];
      const sh = new THREE.Shape(), X = x => x * sd;
      sh.moveTo(0, .02); sh.lineTo(X(.16), .12); sh.lineTo(X(.31), .15); sh.lineTo(X(.58), .04);
      sh.quadraticCurveTo(X(.45), -.02, X(.50), -.17); sh.quadraticCurveTo(X(.38), -.11, X(.33), -.25);
      sh.quadraticCurveTo(X(.20), -.12, X(.02), -.17); sh.lineTo(0, .02);
      const g = new THREE.ExtrudeGeometry(sh, { depth: .012, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1, curveSegments: 6 });
      g.translate(0, 0, -.012); g.userData.keep = true;   // (a mirrored outline is clockwise: ExtrudeGeometry rewinds it itself)
      return BWG[sd] = g;
    }
    // ── Sevimli meyve yarasası: kocaman kulaklar, pofuduk göğüs, leylak zarlı kanatlar ──
    function bat(r, o) {
      const base = '#8a6a7c', light = '#b896a6', cream = '#f0dccb', MEM = '#b88fc4';
      bipedRig(r, { by: .40, head: [0, .58, .04], wx: .16, wy: .48, lx: .06, ly: .2, tail: [0, .3, -.15] });
      r.on('body').fx(0, .08, .7);
      ell(r, skin(base, light, '#5f4655', .18, .62), [0, .40, 0], [.21, .23, .19], null, 22);
      ell(r, skin(cream, '#ffffff', light, .2, .6), [0, .42, .10], [.15, .16, .11], null, 16);
      for (let i = 0; i < 4; i++) ell(r, cream, [(i - 1.5) * .06, .53, .14], [.045, .06, .035], [0, 0, (i - 1.5) * .3], 8);
      r.on('head').fx(0, .08, .5);
      ell(r, skin(base, light, '#5f4655', .48, .82), [0, .65, .04], [.19, .17, .17], null, 22);
      for (const sd of [-1, 1]) {
        bone(r, sd > 0 ? 'earL' : 'earR', 'head', [sd * .1, .74, 0]); r.fx(0, .08, .5);
        ell(r, base, [sd * .15, .84, -.01], [.085, .15, .05], [0, sd * .1, sd * -.42], 14);
        ell(r, PINK, [sd * .155, .845, .03], [.05, .11, .02], [0, sd * .1, sd * -.42], 12);
        fluff(r, light, [sd * .13, .76, .02], [.04, .04, .03]);
        r.on('head');
      }
      for (let i = 0; i < 3; i++) fluff(r, light, [(i - 1) * .05, .8, .03], [.04, .045, .04]);
      ell(r, light, [0, .60, .18], [.085, .06, .05], null, 12);
      ell(r, '#d58aa0', [0, .62, .225], [.03, .02, .015], null, 8);
      express(r, [0, .66, .06], .17, { color: base, ex: .075, ey: .03, er: .058, tilt: .3, mouthY: -.08, mouthW: .06, mR: .19, iris: '#4b3141', heartY: 1.4 });
      for (const sd of [-1, 1]) {
        r.on(sd > 0 ? 'wingL' : 'wingR').fx(0, .25, .2);
        // A real scalloped membrane (thin bevelled slab), arm and finger bones along its edges.
        r.add(batWingGeo(sd), MEM, [sd * .15, .47, -.03], null, null);
        const P0 = (x, y) => [sd * (.15 + x), .47 + y, -.03];
        r.seg(P0(0, 0), P0(.16, .10), .03, base, .024, 8); r.seg(P0(.16, .10), P0(.31, .13), .024, base, .018, 8);
        for (const f of [[.57, .03], [.50, -.17], [.33, -.25]]) r.seg(P0(.31, .13), P0(f[0], f[1]), .011, '#6f5363', .006, 6);
        ell(r, base, P0(.31, .13), [.03, .03, .03], null, 8);
        r.on(sd > 0 ? 'legL' : 'legR'); ell(r, '#5f4655', [sd * .06, .19, .02], [.035, .03, .04], null, 8);
      }
      r.on('body'); kerchief(r, '#f2c45a', .52, .05, .16);
      stars(r, [0, .92, .04], .2);
      r.on('head').mark('muzzle', [0, .60, .24]);
      return details(r, { height: .95, species: 'bat', flyer: true });
    }
    // ── Dağ keçisi (yavru ve Huysuz Dağ Keçisi): pamuk gibi beyaz yün, sarkık kulaklar, keçi sakalı, yuvarlak toynaklar ──
    function goat(r, o, boss) {
      const base = '#e6ddd0', light = '#f4efe6', cream = '#ead2b8', dark = '#ab9c8c', HORN = '#cfb48a', HOOF = '#6f625c';
      const head = [0, .92, .42];
      const legs = quadRig(r, { width: .21, front: .29, back: -.31, head, by: .55, ty: .64, color: base, paw: HOOF, fur: true, w: .095, toes: 2 });
      r.on('body').fx(0, .06, .7);
      ell(r, skin(base, light, dark, .25, .85), [0, .56, -.04], [.27, .25, .44], null, 26);
      for (let i = 0; i < 12; i++) {   // cotton-ball fleece
        const a = i * 2.399, rr = .12 + (i % 3) * .05, z = -.32 + (i / 11) * .62;
        ell(r, i % 2 ? light : base, [Math.sin(a) * rr, .70 + Math.cos(a) * .04, z], [.11, .085, .11], null, 10);
      }
      ell(r, light, [0, .64, .30], [.18, .20, .14], [-.35, 0, 0], 16);
      ell(r, base, [0, .76, .30], [.13, .18, .14], [-.55, 0, 0], 16);
      r.on('head').fx(0, .08, .5);
      ell(r, skin(base, light, dark, .72, 1.12), head, [.19, .19, .21], null, 24);
      ell(r, skin(cream, '#fff2e2', dark, .75, .95), [0, .86, .57], [.12, .105, .13], [-.15, 0, 0], 18);
      ell(r, '#e7a9a6', [0, .88, .695], [.05, .032, .02], null, 10);
      for (const sd of [-1, 1]) {
        bone(r, sd > 0 ? 'earL' : 'earR', 'head', [sd * .12, .97, .38]); r.fx(0, .08, .5);
        ell(r, base, [sd * .21, .95, .37], [.13, .05, .07], [0, sd * .35, sd * -.35], 14);
        ell(r, PINK, [sd * .22, .945, .395], [.09, .028, .03], [0, sd * .35, sd * -.35], 10);
        r.on('head');
      }
      for (let i = 0; i < 4; i++) fluff(r, i & 1 ? base : light, [(i - 1.5) * .05, 1.1, .45 - Math.abs(i - 1.5) * .03], [.055, .05, .055]);   // (ANIM) woolly fringe
      ell(r, cream, [0, .74, .58], [.045, boss ? .11 : .07, .04], [.25, 0, 0], 10);
      for (let i = 0; i < 3; i++) ell(r, light, [(i - 1) * .05, 1.10, .40 - Math.abs(i - 1) * .02], [.05, .045, .05], null, 10);
      r.fx(0, .35, .2);
      for (const sd of [-1, 1]) {
        if (!boss) { cone(r, [sd * .08, 1.06, .37], [sd * .3, 1, -.35], .12, .045, HORN, 12); ell(r, HORN, [sd * .115, 1.17, .33], [.026, .026, .026], null, 8); continue; }
        // Big ridged horns that curl back: a tapering chain round a circle in the y-z plane.
        let prev = null;
        for (let i = 0; i <= 10; i++) {
          const t = i / 10, a = .25 + t * 3.25, R = .26 - t * .05;
          const p = [sd * (.08 + .13 * t), 1.03 + R * Math.sin(a), .16 + R * Math.cos(a)];
          if (prev) r.seg(prev, p, .068 - .045 * (t - .1), mixc(HORN, '#a88a62', t * .5), .068 - .045 * t, 12);
          if (i && i < 10) r.add(G.torus(TAU, .18, 14), mixc(HORN, '#9c7f58', .4), p, qy(prev[0] - p[0], prev[1] - p[1], prev[2] - p[2]), [.07 - .042 * t, .07 - .042 * t, .05]);
          prev = p;
        }
        ell(r, '#a88a62', prev, [.025, .025, .025], null, 8);
      }
      r.fx(0, .08, .5);
      express(r, head, .19, { color: base, ex: .095, ey: .05, er: boss ? .065 : .07, tilt: .4, mouthY: -.12, mouthW: .07, mR: .25, iris: '#a77f3a', heartY: 1.35 });
      r.on('tail0').fx(0, .08, .6); ell(r, light, [0, .70, -.50], [.06, .09, .06], [-.6, 0, 0], 10);
      kerchief(r, boss ? '#c9483e' : '#7fb3dd', .72, .33, boss ? .19 : .17);
      if (boss) {
        r.on('body').fx(0, 2, 0); ell(r, '#e3b748', [0, .60, .47], [.06, .07, .06], null, 14);
        r.fx(0, .3, 0); ell(r, '#5b4630', [0, .55, .49], [.02, .02, .02], null, 8);
        // Three round, mossy pebbles for the "taş yuvarlar" move (hidden until rolled).
        for (let i = 0; i < 3; i++) {
          fbone(r, 'rock' + i, [0, .30, 0]); r.fx(0, .1, .9);
          ell(r, skin('#a49c92', '#c8c1b6', '#7d756c', .15, .45), [0, .30, 0], [.17, .15, .16], [0, i, 0], 16);
          ell(r, '#8ab35e', [.02, .43, -.01], [.10, .03, .09], [0, i * 1.3, .1], 12);
          ell(r, '#d8d2c6', [.08, .36, .10], [.04, .03, .02], null, 8);
        }
      }
      if (!boss) {   // (ANIM) a little cow-bell on the kid's scarf
        r.on('body').fx(0, 2, 0); r.add(G.hemi(14), '#e3b748', [0, .58, .47], [PI, 0, 0], [.055, .07, .055]);
        r.fx(0, .3, 0); ell(r, '#7a5a2e', [0, .5, .47], [.018, .018, .018], null, 6);
      }
      stars(r, [0, boss ? 1.45 : 1.25, .4], boss ? .3 : .24);
      r.on('head').mark('muzzle', [0, .87, .70]);
      return details(r, { height: boss ? 1.25 : 1.12, scale: boss ? 2.1 : .86, species: boss ? 'goatboss' : 'goat', legs, animAs: 'fox', ownHurt: !!boss,
        foBones: boss ? ['rock0', 'rock1', 'rock2'] : null, dieHop: boss ? .1 : undefined });
    }
    // ── Ateşböceği Sürüsü: a ball of soft light made of six little fireflies; the lead one has the face ──
    function fireflies(r, o) {
      bone(r, 'body', 'root', [0, .45, 0]);
      bone(r, 'head', 'body', [0, .5, .02]);
      const bug = (c, R, face) => {   // one firefly at centre c (radius R), on the current bone
        r.fx(0, .3, .2); ell(r, '#5b3e6e', [c[0], c[1] + R * .25, c[2] + R * .2], [R * .9, R * .85, R * .9], null, 14);   // head+thorax
        r.fx(1, 0, 0); ell(r, hdr('#e8ff7a', 1.3), [c[0], c[1] - R * .1, c[2] - R * .95], [R * .62, R * .6, R * .8], null, 14);   // glowing lantern
        r.fx(.5, .3, 0);
        for (const sd of [-1, 1]) ell(r, '#eef2ff', [c[0] + sd * R * .6, c[1] + R * .85, c[2] - R * .35], [R * .38, R * .08, R * .65], [0, sd * .4, sd * .6], 10);
        r.fx(0, .3, 0); for (const sd of [-1, 1]) r.seg([c[0] + sd * R * .3, c[1] + R * .9, c[2] + R * .7], [c[0] + sd * R * .55, c[1] + R * 1.5, c[2] + R * 1.0], R * .06, '#3d2a4a', R * .05, 5);
        for (const sd of [-1, 1]) ell(r, '#ffe36e', [c[0] + sd * R * .55, c[1] + R * 1.52, c[2] + R * 1.02], [R * .11, R * .11, R * .11], null, 6);
        if (!face) for (const sd of [-1, 1]) { r.fx(0, 1, 0); ell(r, '#20142c', [c[0] + sd * R * .32, c[1] + R * .35, c[2] + R * .95], [R * .17, R * .2, R * .1], null, 8); r.fx(1, 0, 0); ell(r, '#ffffff', [c[0] + sd * R * .28, c[1] + R * .42, c[2] + R * 1.02], [R * .06, R * .06, R * .04], null, 6); }
      };
      // the shared glow: a soft halo ball the swarm hides in
      r.on('body').fx(1, 0, 0);   // a few drifting glow motes between them
      for (let i = 0; i < 6; i++) { const a = i * 2.4; ell(r, hdr('#f4ffb0', 1.3), [Math.sin(a) * .25, .45 + Math.cos(i * 1.7) * .18, Math.cos(a) * .22 - .1], [.025, .025, .025], null, 6); }
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5 + .6, p = [Math.sin(a) * .52, .45 + (i & 1 ? .14 : -.12), Math.cos(a) * .48 - .08];
        bone(r, 'f' + i, 'body', [0, .45, 0]); bug(p, .095, false);
      }
      r.on('head'); bug([0, .5, .02], .17, true);
      express(r, [0, .56, .07], .155, { color: '#5b3e6e', ex: .065, ey: .0, er: .058, tilt: .2, mouthY: -.06, mouthW: .05, mR: .145, iris: '#3d2a4a', heartY: 1.6, heartS: .3, blushCol: '#ff9fc0' });
      stars(r, [0, .78, .02], .18);
      r.on('head').mark('muzzle', [0, .5, .2]);
      return details(r, { height: .95, species: 'firefly', flyer: true, rough: .5, portrait: { cx: 0, cy: .5, cz: .2, rad: .4 } });
    }
    // ── Balçık Topu: a wobbly blob of friendly bog mud with a leaf, a twig and a little puddle at its feet ──
    function mudball(r, o) {
      bone(r, 'body', 'root', [0, .1, 0]);
      bone(r, 'head', 'body', [0, .42, .05]);
      const MUD = '#7a5a3c', MUDL = '#a07a52', MUDD = '#563c28';
      r.on('body').fx(0, .55, .15, (x, y) => .25 + .75 * clamp01(y / .7));
      ell(r, skin(MUD, MUDL, MUDD, 0, .75), [0, .34, 0], [.42, .34, .4], null, 26);
      ell(r, skin(MUD, MUDL, MUDD, 0, .3), [0, .12, 0], [.5, .14, .48], null, 22);   // the sagging bottom
      for (let i = 0; i < 7; i++) {   // drips down the sides
        const a = i * TAU / 7 + .3, x = Math.sin(a) * .4, z = Math.cos(a) * .38;
        if (Math.cos(a) > .7) continue;
        ell(r, MUDD, [x, .22 - (i % 3) * .03, z], [.06, .12 + (i % 2) * .05, .06], null, 10);
      }
      for (let i = 0; i < 6; i++) { const a = i * 2.3; ell(r, MUDL, [Math.sin(a) * .25, .55 + (i % 3) * .04, Math.cos(a) * .22 - .05], [.05, .02, .05], null, 8); }   // shiny wet spots
      r.fx(0, .2, 0);
      ell(r, '#6fae4a', [-.18, .66, -.05], [.06, .015, .14], [.3, .4, .5], 10); r.seg([-.18, .62, -.12], [-.18, .66, .04], .008, '#55803a', .006, 5);
      r.seg([.12, .6, -.15], [.25, .82, -.2], .018, '#6b4a2e', .012, 6); r.seg([.2, .74, -.18], [.28, .76, -.1], .01, '#6b4a2e', .008, 5);
      fbone(r, 'puddle', [0, .01, 0]); r.fx(0, .2, .15);
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .5; ell(r, i & 1 ? MUD : MUDD, [Math.sin(a) * .5, .03, Math.cos(a) * .48], [.12, .04, .1], [0, a, 0], 10); }   // mud splats round its base
      r.on('head').fx(0, .55, .15, .6);
      express(r, [0, .42, .05], .36, { color: MUD, ex: .13, ey: .02, er: .1, tilt: .25, mouthY: -.13, mouthW: .1, mR: .38, iris: '#6b4a2f', heartY: 1.0, browCol: MUDD });
      stars(r, [0, .85, 0], .3);
      r.on('head').mark('muzzle', [0, .4, .4]);
      return details(r, { height: .8, species: 'mud', wob: .02, rough: .35 });
    }
    function animate(m, dt, st, s) {
      const B = m.B, sp = m.def.animAs || m.def.forestSpecies, dying = st.dying >= 0, phase = st.phase || 'idle';
      const mv = clamp01(s.mv), p = clamp01(+st.phaseT || 0), wind = st.windup >= 0 ? smooth(st.windup) : 0;
      const attack = st.attack >= 0 ? st.attack : -1;
      // Keep the end of the preparation through the first instant of release. A reset to the
      // bind pose between two states looked like a hitch, especially on the bear and throwers.
      const prep = wind > 0 ? wind : attack >= 0 && !dying ? 1 - smooth(attack / .24) : 0;
      const glide = typeof EDEF !== 'undefined' && EDEF[m.type] && EDEF[m.type].kind === 'glide' && attack >= 0 && attack < 1;
      const charge = ((phase === 'charge' || phase === 'roll') && st.move > .15) || glide, sprint = mv + (charge ? .8 : 0);
      s.walk += dt * (sp === 'turtle' ? 6 : sp === 'croc' ? 8.5 : sp === 'squirrel' ? 12 : 9) * (.22 + sprint);
      const walk = s.walk, body = B.body, head = B.head;
      const w = Math.sin(walk), w2 = Math.sin(walk * 2);
      body.position.y += Math.sin(s.t * 2.1 + s.ph) * .010 + Math.abs(w) * mv * (sp === 'croc' ? .012 : .031);
      body.rotation.y += w * mv * (sp === 'croc' ? .08 : .025);
      body.rotation.z += w * mv * .025;
      head.rotation.y += Math.sin(s.t * 1.4 + s.ph) * .045 * (1 - mv);
      head.rotation.x += -w2 * mv * .028;
      // A half-cycle of ground contact, then a short rounded recovery. During stance the ankle
      // counters the upper leg and body bounce, keeping paws down instead of rowing through the floor.
      const strideAmp = sp === 'croc' ? .25 : sp === 'turtle' ? .19 : sp === 'bear' ? .29 : .39;
      for (let i = 0; i < m.def.forestLegs.length; i++) {
        const leg = m.def.forestLegs[i], b = B[leg.name], foot = B[leg.name + 'Foot'];
        const a = walk + (i === 0 || i === 3 ? 0 : PI), cycle = a / TAU - Math.floor(a / TAU);
        const swing = cycle < .44, t = swing ? cycle / .44 : (cycle - .44) / .56;
        const lift = swing ? Math.sin(t * PI) : 0;
        const reach = swing ? 1 - 2 * smooth(t) : -1 + 2 * t;
        b.rotation.x += reach * sprint * strideAmp;
        b.rotation.z += leg.side * (sp === 'frog' ? .24 : .025 + lift * sprint * .045);
        b.position.y += lift * mv * (sp === 'turtle' ? .018 : .037);
        foot.rotation.x -= b.rotation.x * .93;
        foot.position.y -= (1 - lift) * Math.abs(w) * mv * (sp === 'croc' ? .012 : .031);
        foot.position.z += reach * mv * .018;
        if (sp === 'squirrel' && leg.front) { b.rotation.x -= .86 * (1 - mv); b.rotation.z -= leg.side * .22 * (1 - mv); }
        if (sp === 'frog' && !leg.front) b.rotation.x -= .28;
      }
      // Body language differs by animal: foxes bound lightly, bears place heavy paws, turtles shift
      // the head independently of their shell, frogs compress their thighs before a small travelling hop.
      if (sp === 'bear') { body.rotation.z += w * mv * .032; head.rotation.x += Math.abs(w) * mv * .022; }
      if (sp === 'fox') { body.rotation.x += w2 * mv * .025; head.position.y += Math.sin(walk + .4) * mv * .010; }
      if (sp === 'boar') { body.rotation.x += w2 * mv * .020; head.rotation.z += w * mv * .038; }
      if (sp === 'turtle') { head.position.z += Math.sin(walk) * mv * .026; body.rotation.z *= .45; }
      if (sp === 'raccoon' && mv < .15 && wind === 0 && attack < 0 && !dying) {
        const sniff = Math.max(0, Math.sin(s.t * 1.2 + s.ph));
        head.rotation.x += sniff * sniff * .055; head.rotation.y += Math.sin(s.t * 2.1 + s.ph) * .040;
      }
      for (let i = 0; i < 3; i++) {
        const tail = B['tail' + i];
        const wag = Math.sin((sp === 'croc' && mv > .15 ? walk * .75 : s.t * (dying ? 6 : 2.2)) - i * .58);
        tail.rotation.y = wag * (sp === 'croc' ? .075 + mv * .15 : sp === 'squirrel' ? .07 + mv * .05 : .09 + mv * .07);
        if (sp === 'croc') tail.rotation.z += Math.sin(walk * .75 - i * .58) * mv * .017;
        if (sp === 'squirrel') tail.rotation.x += Math.sin(s.t * 2.2 - i * .5) * .06;
        if (sp === 'fox') tail.rotation.x += .10 * Math.sin(walk - i * .4) * mv;
      }
      // Each archetype has a recognisable anticipation and release rather than the same squash-and-poke.
      if (prep > 0) {
        if (sp === 'croc') { if (B.jaw) B.jaw.rotation.x = prep * .44; head.rotation.x -= prep * .13; body.position.z -= prep * .065; }
        else if (sp === 'bear') { body.rotation.x -= prep * .22; for (const n of ['legFL', 'legFR']) B[n].rotation.x -= prep * .8; s.mouthO = prep * .7; }
        else if (sp === 'frog') { body.scale.y = 1 - prep * .18; body.position.y -= prep * .05; head.scale.set(1 + prep * .07, 1, 1 + prep * .07); }
        else if (sp === 'turtle') { head.position.z -= prep * .11; head.scale.setScalar(1 - prep * .18); }
        else if (sp === 'squirrel' || sp === 'raccoon') { B.legFR.rotation.x -= prep * .95; head.rotation.y += prep * .16; body.rotation.y += prep * .17; }
        else { body.rotation.x -= prep * .13; head.rotation.x -= prep * .12; body.position.z -= prep * .035; }
      }
      if (attack >= 0 && !dying) {
        const hit = bell(Math.min(1, attack * 2.8));
        if (sp === 'croc') {
          // Close with a quick rounded snap, then relax the jaw. It never abruptly resets mid-bite.
          if (B.jaw) B.jaw.rotation.x = .44 * (1 - smooth(attack / .16)) + .032 * bell((attack - .24) / .58);
          head.position.z += hit * .12; head.rotation.x += hit * .11; body.position.z += hit * .035;
        }
        else if (sp === 'bear') {
          body.rotation.x += hit * .18; body.position.y -= hit * .018;
          B.legFL.rotation.x += hit * .58; B.legFR.rotation.x += hit * .58;
          head.rotation.x += hit * .07;
        }
        else if (sp === 'frog') { body.rotation.x += Math.sin(attack * PI) * -.09; body.scale.y *= 1 + hit * .07; }
        else if (sp === 'squirrel' || sp === 'raccoon') {
          const release = bell(Math.min(1, attack * 2.2));
          B.legFR.rotation.x += release * 1.02; B.legFR.rotation.z -= release * .18;
          body.rotation.y -= release * .15; head.rotation.x += release * .065;
          for (let i = 0; i < 3; i++) B['tail' + i].rotation.y += release * .075;
        }
        else { body.position.z += hit * .075; head.rotation.x += hit * .14;
          if (sp === 'boar') { head.rotation.y += hit * .055; body.rotation.z += hit * .020; }
          if (sp === 'fox') { head.rotation.z -= hit * .035; head.position.z += hit * .028; }
          if (sp === 'turtle') { head.position.z += hit * .09; head.scale.multiplyScalar(1 + hit * .04); } }
      }
      if (sp === 'frog' && !dying && st.air > 0) {
        const air = Math.sin(clamp01(st.air) * PI);
        body.rotation.x -= air * .16;
        for (const n of ['legBL', 'legBR']) B[n].rotation.x -= air * .55;
        for (const n of ['legFL', 'legFR']) B[n].rotation.x += air * .25;
      }
      if (m.boss && sp === 'croc' && !dying) {
        const bite = phase === 'bite' || phase === 'snap', sweep = phase === 'sweep' || phase === 'tail';
        if (bite) {
          const prep = smooth(p / .48), rel = smooth((p - .48) / .16), recover = 1 - smooth((p - .68) / .32);
          B.jaw.rotation.x = .55 * prep * (1 - rel); head.rotation.x -= .15 * prep * (1 - rel);
          head.position.z += .16 * bell((p - .46) / .31); body.position.z += .08 * rel * recover;
          s.eyeK = 1 + .13 * prep;
        }
        if (sweep) {
          const coil = smooth(p / .42), release = smooth((p - .42) / .28), back = 1 - smooth((p - .70) / .30);
          body.rotation.y += (-.28 * coil + .62 * release) * back;
          for (let i = 0; i < 3; i++) B['tail' + i].rotation.y += (-.30 * coil + .85 * release) * back * (.75 + i * .15);
          head.rotation.y -= (-.25 * coil + .38 * release) * back;
        }
        if (phase === 'bubbles' || phase === 'spit' || phase === 'mud') {
          const puff = bell(p); B.jaw.rotation.x += .14 * puff; head.scale.x *= 1 + .06 * puff; head.rotation.x -= .10 * puff;
          body.scale.y *= 1 + .035 * puff; s.mouthO = puff;
        }
        if (phase === 'stomp' || phase === 'slam' || phase === 'hop') {
          const up = bell(p); body.position.y += up * .12; body.rotation.x -= up * .20;
          B.legFL.rotation.x -= up * .65; B.legFR.rotation.x -= up * .65;
        }
        if (phase === 'roar' || phase === 'summon') { head.rotation.x -= bell(p) * .18; B.jaw.rotation.x += bell(p) * .26; s.eyeK = 1 + .12 * bell(p); }
        if (charge) { head.rotation.x -= .05; B.jaw.rotation.x += .10; body.rotation.x -= .04; }
      }
      if (st.hurt > 0 && !dying) {
        const flinch = st.hurt * st.hurt * (m.boss ? .28 : 1);
        head.rotation.x -= flinch * .095; head.rotation.z += flinch * .035 * Math.sin(s.ph);
        for (let i = 0; i < 3; i++) B['tail' + i].rotation.y *= 1 - flinch * .30;
      }
      if (dying) {
        // A happy wag and lifted paws; the base EMODEL applies hearts, hops and the final sparkle twirl.
        const hello = bell(clamp01(st.dying / .72));
        head.rotation.z += Math.sin(s.t * 5.5 + s.ph) * .065 * hello; head.rotation.x -= .055 * hello;
        // A different little thank-you for every silhouette, staying within the original heart/hop farewell.
        if (sp === 'croc') {
          B.legFL.rotation.x -= .20 * hello; B.legFR.rotation.x -= .20 * hello;
          for (let i = 0; i < 3; i++) B['tail' + i].rotation.y += Math.sin(s.t * 6 - i * .50) * .065 * hello;
        } else if (sp === 'bear') {
          B.legFL.rotation.x -= .48 * hello; B.legFL.rotation.z += .13 * Math.sin(s.t * 6) * hello;
          B.legFR.rotation.x -= .20 * hello; head.rotation.x -= .025 * hello;
        } else if (sp === 'squirrel' || sp === 'raccoon') {
          B.legFL.rotation.x -= .36 * hello; B.legFR.rotation.x -= .42 * hello;
          B.legFR.rotation.z -= .15 * Math.sin(s.t * 6.5) * hello;
        } else if (sp === 'frog') {
          B.legFL.rotation.z += .15 * hello; B.legFR.rotation.z -= .15 * hello;
          head.scale.x *= 1 + .018 * hello;
        } else if (sp === 'turtle') {
          head.position.z += .048 * hello; head.rotation.x -= .035 * Math.sin(s.t * 5) * hello;
        } else {
          B.legFL.rotation.x -= .20 * hello; B.legFR.rotation.x -= .13 * hello;
          head.rotation.y += Math.sin(s.t * 4.5) * .055 * hello;
        }
        if (B.jaw) B.jaw.rotation.x = .08 + .03 * Math.sin(s.t * 8);
        s.mouthW = 1;
      }
    }
    // ── Yeni hayvanların ve bölüm canavarlarının hareketleri ──
    const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
    const ramp = (t, a, b) => smooth((t - a) / Math.max(1e-4, b - a));
    // Projectile bones: hidden unless GAME's st.fo lists them for the current phase (world x, y, z; ry = heading, rx = roll, k = size).
    function hideFo(m) { for (const n of m.def.foBones || []) { const b = m.B[n]; if (b) b.scale.setScalar(HIDE); } }
    function placeFo(m, st) {
      const fo = st.fo;
      if (!fo || !fo.length || st.dying >= 0 || (fo.ph && fo.ph !== st.phase)) return;
      const rt = m.root, R = m.B.root, f = rt.rotation.y, c = Math.cos(f), sn = Math.sin(f), sc = m.mesh.scale.x || 1;
      for (const q of fo) {
        const b = m.B[q.b]; if (!b) continue;
        const dx = q.x - rt.position.x, dz = q.z - rt.position.z;
        b.position.set((dx * c - dz * sn) / sc - R.position.x, ((q.y || 0) - rt.position.y) / sc - R.position.y, (dx * sn + dz * c) / sc - R.position.z);
        b.rotation.order = 'YXZ'; b.rotation.set(q.rx || 0, (q.ry || 0) - f, q.rz || 0);
        b.scale.setScalar(Math.max(HIDE, q.k ?? 1));
      }
    }
    function holdAt(m, name, p, k = 1, rot) {   // a projectile bone held near the body: p in unscaled model metres (bind-relative offset)
      const b = m.B[name]; if (!b) return;
      const s = m.def.modelScale || 1, p0 = b.userData.p0;
      b.position.set(p0.x + p[0] * s, p0.y + p[1] * s, p0.z + p[2] * s); b.scale.setScalar(k);
      if (rot) { b.rotation.order = 'YXZ'; b.rotation.set(rot[0], rot[1], rot[2]); }
    }
    function ownHurt(m, st, k = .3) {
      if (!(st.hurt > 0) || st.dying >= 0) return;
      const h = st.hurt * st.hurt * k, b = m.B.body;
      b.scale.x *= 1 + .5 * h; b.scale.z *= 1 + .5 * h; b.scale.y *= 1 - .5 * h; b.rotation.x -= .5 * h;
      if (m.B.head) m.B.head.rotation.x -= .3 * h;
    }
    function cheer(m, st, s) {
      if (st.dying < 0 || s.cheered) return;
      s.cheered = true;
      if (typeof AUD !== 'undefined' && AUD && typeof AUD.hayvan === 'function') {
        try { const p = m.root.position; AUD.hayvan(m.type, 'nese', { x: p.x, z: p.z }); } catch (err) { /* sound is optional */ }
      }
    }
    function bossClock(st, s) { return { ph: st.dying >= 0 ? 'dying' : st.phase || 'idle', t: s.pT || 0 }; }
    // Quadrupeds: the shared walk + per-species extras (hedgehog curl-and-roll, slider spin, goat hops, the three quad bosses).
    function animQuad(m, dt, st, s) {
      hideFo(m); cheer(m, st, s);
      animate(m, dt, st, s);
      const B = m.B, sp = m.def.forestSpecies, body = B.body, head = B.head, dying = st.dying >= 0;
      const wind = st.windup >= 0 ? smooth(st.windup) : 0, attack = st.attack >= 0 ? st.attack : -1;
      if (sp === 'hedgehog' || sp === 'waterturtle') {
        // Wind-up tucks in; along the lane it rolls (hedgehog) / spins flat on its shell (slider); it peeks out after.
        s.curl = damp(s.curl || 0, !dying && (wind > 0 || (attack >= 0 && attack < 1)) ? 1 : 0, 9, dt);
        const c = Math.max(s.curl, wind);
        for (const n of ['legFL', 'legFR', 'legBL', 'legBR']) B[n].scale.setScalar(1 - .75 * c);
        if (sp === 'hedgehog') {
          head.rotation.x += c * .95; head.position.z -= c * .10; head.position.y -= c * .05; body.rotation.x += c * .35;
          if (attack >= 0 && attack < 1) body.rotation.x += attack * TAU * 3.2;
          body.position.y -= c * .06;
        } else {
          head.scale.setScalar(1 - .7 * c); head.position.z -= c * .18;
          if (attack >= 0 && attack < 1) { body.rotation.y += attack * TAU * 2.5; body.rotation.z += Math.sin(attack * 30) * .05; }
        }
      }
      if (sp === 'goat' && !dying) {
        body.position.y -= wind * .06; head.rotation.x += wind * .22;
        const air = st.air > 0 ? Math.sin(clamp01(st.air) * PI) : 0;
        if (air) { body.rotation.x -= air * .2; B.legFL.rotation.x -= air * .8; B.legFR.rotation.x -= air * .8; B.legBL.rotation.x += air * .6; B.legBR.rotation.x += air * .6; }
        if (attack >= 1) head.rotation.x += .25;
      }
      if (sp === 'frogboss') frogBoss(m, dt, st, s);
      else if (sp === 'bearboss') bearBoss(m, dt, st, s);
      else if (sp === 'goatboss') goatBoss(m, dt, st, s);
      placeFo(m, st);
    }
    function frogBoss(m, dt, st, s) {
      const B = m.B, K = FB.kocakurbaga, { ph, t } = bossClock(st, s), body = B.body, head = B.head;
      const tg = B.tongue; tg.scale.setScalar(HIDE);
      B.throat.scale.y *= 1 + .10 * Math.sin(s.t * 3.1 + s.ph);
      ownHurt(m, st);
      if (ph === 'tongue') {
        const prep = ramp(t, 0, K.warn), e = t - K.warn;
        B.throat.scale.multiplyScalar(1 + .45 * prep * (1 - ramp(e, 0, .1)));
        head.rotation.x -= .22 * prep * (1 - ramp(e, 0, .1)); body.scale.y *= 1 - .12 * prep; body.scale.x *= 1 + .05 * prep;
        s.eyeK = 1 + .15 * prep;
        if (e >= 0) {
          const ext = e < K.tongueOut ? smooth(e / K.tongueOut) : e < K.tongueOut + K.tongueHold ? 1 : 1 - ramp(e, K.tongueOut + K.tongueHold, K.tongueOut + K.tongueHold + K.tongueBack);
          if (ext > .01) {
            const L = st.tl || K.tongueLen, k = Math.max(1, ext * L / (.22 * (m.def.modelScale || 1)));
            tg.scale.set(1 + .1 * ext, 1 + .1 * ext, k); B.tongueTip.scale.set(1, 1, 1 / k);
            head.rotation.x += .06 * ext;
          }
        }
      } else if (ph === 'hop') {
        const crouch = ramp(t, 0, K.hopUp) * (1 - ramp(t, K.hopUp, K.hopUp + .12));
        body.scale.y *= 1 - .2 * crouch; body.position.y -= .06 * crouch; s.eyeK = 1 + .2 * crouch;
        const land = t > K.warn ? 1 - ramp(t, K.warn, K.warn + .35) : 0;
        body.scale.y *= 1 - .14 * land; body.scale.x *= 1 + .08 * land;
      } else if (ph === 'croak') {
        const prep = ramp(t, 0, K.warn), pop = t > K.warn ? 1 - ramp(t, K.warn, K.warn + .3) : 0;
        B.throat.scale.multiplyScalar(1 + (.9 * prep + .15 * Math.sin(t * 16) * prep) * (t > K.warn ? pop : 1));
        body.scale.y *= 1 + .06 * prep; head.rotation.x -= .12 * prep;
      } else if (ph === 'summon' || ph === 'roar') {
        const k = bell(clamp01(t / (ph === 'roar' ? 1.6 : 1.8)));
        B.throat.scale.multiplyScalar(1 + .7 * Math.abs(Math.sin(t * 7)) * k);
        head.rotation.x -= .2 * k; s.mouthO = k;
      }
    }
    function bearBoss(m, dt, st, s) {
      const B = m.B, K = FB.uykucuayi, { ph, t } = bossClock(st, s), body = B.body, head = B.head, dying = ph === 'dying';
      B.honey.scale.setScalar(dying ? 1 : HIDE);
      B.cap.rotation.z += Math.sin(s.t * 1.7 + s.ph) * .07; B.cap.rotation.x += Math.sin(s.t * 2.3) * .05 + s.mv * Math.sin(s.walk * 2) * .08;
      ownHurt(m, st);
      if (dying) { s.mouthW = 1; head.rotation.x += .1 * Math.sin(s.t * 6); return; }
      // Sleepy between moves: heavy lids, a slow sway.
      s.eyeK = .58 + .05 * Math.sin(s.t * .8);
      body.rotation.z += Math.sin(s.t * .9 + s.ph) * .035;
      if (ph === 'slam') {
        const prep = ramp(t, 0, K.warn), e = t - K.warn, down = e >= 0 ? 1 - ramp(e, 0, .14) : 1;
        const up = prep * down;
        body.rotation.x -= up * .85; body.position.y += up * .34; body.scale.y *= 1 + .06 * up;
        B.legFL.rotation.x -= up * 1.5; B.legFR.rotation.x -= up * 1.5; head.rotation.x += up * .35;
        if (e >= 0) { const b2 = bell(clamp01(e / .5)); body.rotation.x += b2 * .22; body.scale.y *= 1 - .15 * b2; body.scale.x *= 1 + .08 * b2; }
        s.eyeK = 1.05; s.mouthO = prep * .6;
      } else if (ph === 'hives') {
        const pound = t < K.warn * .62 ? Math.abs(Math.sin(t / (K.warn * .62) * PI * 3)) : 0, side = Math.sin(t / (K.warn * .62) * PI * 3) > 0;
        B[side ? 'legFL' : 'legFR'].rotation.x -= pound * .9;
        body.rotation.x -= pound * .08;
        const look = ramp(t, K.warn * .55, K.warn * .8);
        head.rotation.x -= look * .5; s.eyeK = .7 + .55 * look; s.mouthO = look * .8;
      } else if (ph === 'yawn') {
        const y = bell(clamp01(t / K.yawnD));
        head.rotation.x -= .55 * y; s.mouthO = y; s.eyeK = .58 - .5 * y;
        B.legFL.rotation.x -= .7 * y; B.legFR.rotation.x -= .5 * y; body.rotation.x -= .12 * y;
      } else if (ph === 'nap') {
        const z = ramp(t, 0, .4) * (1 - ramp(t, K.napD - .35, K.napD));
        head.rotation.x += .38 * z; body.position.y -= .1 * z; s.eyeK = .58 - .52 * z;
        body.scale.y *= 1 + .04 * Math.sin(s.t * 1.7) * z; B.cap.rotation.x += .3 * z;
        if (t > K.napD - .35) s.eyeK = 1.3;   // wakes with a start
      } else if (ph === 'summon' || ph === 'roar') {
        const k = bell(clamp01(t / (ph === 'roar' ? 1.6 : 1.8)));
        body.rotation.x -= .35 * k; body.position.y += .12 * k; B.legFL.rotation.x -= 1.1 * k; B.legFR.rotation.x -= 1.1 * k;
        B.legFL.rotation.z += Math.sin(t * 9) * .3 * k; B.legFR.rotation.z -= Math.sin(t * 9) * .3 * k;
        s.mouthO = k; s.eyeK = .7 + .5 * k;
      }
    }
    function goatBoss(m, dt, st, s) {
      const B = m.B, K = FB.dagkecisi, { ph, t } = bossClock(st, s), body = B.body, head = B.head;
      ownHurt(m, st);
      if (ph === 'charge') {
        const prep = ramp(t, 0, K.warn * .5);
        if (t < K.warn) { head.rotation.x += .7 * prep; B.legFR.rotation.x += Math.sin(t * 10) * .65 * prep; body.rotation.x -= .12 * prep; body.position.z -= .1 * prep; body.position.y -= .04 * prep; }
        else if (st.move > .5) { head.rotation.x += .45; body.rotation.x += .05; }
        else { head.rotation.x += .3; body.rotation.x -= .18; B.legFL.rotation.x -= .5; B.legFR.rotation.x -= .5; }   // skids to a stop
      } else if (ph === 'rocks') {
        const prep = ramp(t, 0, K.warn), e = t - K.warn, up = prep * (e >= 0 ? 1 - ramp(e, 0, .14) : 1);
        body.rotation.x -= up * .6; body.position.y += up * .2; B.legFL.rotation.x -= up * 1.3; B.legFR.rotation.x -= up * 1.3; head.rotation.x += up * .2;
        if (e >= 0) { const b2 = bell(clamp01(e / .45)); head.rotation.x += b2 * .4; body.scale.y *= 1 - .06 * b2; }
      } else if (ph === 'leap') {
        const crouch = ramp(t, 0, K.leapUp) * (1 - ramp(t, K.leapUp, K.leapUp + .1));
        body.position.y -= .08 * crouch; head.rotation.x += .2 * crouch; body.rotation.x += .1 * crouch;
        const air = st.air > 0 ? Math.sin(clamp01(st.air) * PI) : 0;
        body.rotation.x -= air * .25; B.legFL.rotation.x -= air * .9; B.legFR.rotation.x -= air * .9; B.legBL.rotation.x += air * .7; B.legBR.rotation.x += air * .7;
      } else if (ph === 'summon' || ph === 'roar') {
        const k = bell(clamp01(t / (ph === 'roar' ? 1.6 : 1.8)));
        head.rotation.x -= .45 * k; head.rotation.z += Math.sin(t * 12) * .12 * k; s.mouthO = Math.abs(Math.sin(t * 6)) * k;
        if (ph === 'summon') { B.legFL.rotation.x -= Math.abs(Math.sin(t * 7)) * .7 * k; }
      }
    }
    // Birds and the bat: waddle on the ground (duck, owl boss), or hover with flapping wings (owlet, bat).
    function animBird(m, dt, st, s) {
      hideFo(m); cheer(m, st, s);
      const B = m.B, sp = m.def.forestSpecies, body = B.body, head = B.head, dying = st.dying >= 0, fly = m.def.flyer;
      const mv = clamp01(s.mv), wind = st.windup >= 0 ? smooth(st.windup) : 0, attack = st.attack >= 0 ? st.attack : -1;
      s.walk += dt * (sp === 'duck' ? 10 : 8) * (.25 + mv);
      const w = Math.sin(s.walk), WL = B.wingL, WR = B.wingR;
      body.position.y += Math.sin(s.t * 2.2 + s.ph) * .012;
      let flap = 0;
      if (fly || (sp === 'owlboss' && (st.phase === 'fly'))) {
        flap = Math.sin(s.t * (sp === 'bat' ? 14 : 11) + s.ph);
        WL.rotation.z += flap * (sp === 'bat' ? .75 : .6) + .1; WR.rotation.z -= flap * (sp === 'bat' ? .75 : .6) + .1;
        body.position.y += flap * .025; B.legL.rotation.x += .35; B.legR.rotation.x += .35;
        body.rotation.x += mv * .18;
      } else {
        body.rotation.z += w * mv * (sp === 'duck' ? .16 : .10);
        B.legL.rotation.x += w * mv * .65; B.legR.rotation.x -= w * mv * .65;
        body.position.y += Math.abs(w) * mv * .03;
        WL.rotation.z += .05 + Math.abs(w) * mv * .12; WR.rotation.z -= .05 + Math.abs(w) * mv * .12;
        if (sp === 'duck') head.position.z += Math.sin(s.walk * 2) * mv * .025;
      }
      // Idle: the duck preens and looks around; owls turn their heads far round, slowly.
      if (mv < .2 && !dying && wind === 0) {
        if (sp === 'owlboss' || sp === 'owlet') { const q = Math.sin(s.t * .55 + s.ph); head.rotation.y += q * q * q * .55; }
        else head.rotation.y += Math.sin(s.t * 1.3 + s.ph) * .12;
      }
      if (B.tail0) B.tail0.rotation.y += Math.sin(s.t * 3 + s.ph) * .12;
      if (wind > 0 && !dying) {   // wind-up: wings up, leaning back; the duck flattens before its belly slide
        body.rotation.x -= wind * .22; WL.rotation.z += wind * .9; WR.rotation.z -= wind * .9; head.rotation.x -= wind * .12;
        if (sp === 'duck') { body.position.y -= wind * .05; if (B.jaw) B.jaw.rotation.x = wind * .35; }
      }
      if (attack >= 0 && !dying) {
        if (sp === 'duck') {
          s.slide = damp(s.slide || 0, attack < 1 ? 1 : 0, 10, dt);
          body.rotation.x += s.slide * .95; body.position.y -= s.slide * .16; head.rotation.x -= s.slide * .65;
          WL.rotation.y -= s.slide * .6; WR.rotation.y += s.slide * .6; B.legL.rotation.x -= s.slide * 1.2; B.legR.rotation.x -= s.slide * 1.2;
          if (B.jaw) B.jaw.rotation.x = .3 * s.slide;
        } else {
          const sw = bell(Math.min(1, attack * 1.6));
          body.position.z += sw * .22; body.rotation.x += sw * .45; WL.rotation.z -= sw * .8; WR.rotation.z += sw * .8;
        }
      } else s.slide = damp(s.slide || 0, 0, 6, dt);
      if (sp === 'owlboss') owlBoss(m, dt, st, s);
      else if (st.hurt > 0 && !dying) head.rotation.x -= st.hurt * st.hurt * .1;
      if (dying) {
        const hello = bell(clamp01(st.dying / .72));
        WL.rotation.z += (.6 + Math.sin(s.t * 16) * .5) * hello; WR.rotation.z -= (.6 + Math.sin(s.t * 16) * .5) * hello;
        head.rotation.z += Math.sin(s.t * 5.5 + s.ph) * .08 * hello;
        if (B.jaw) B.jaw.rotation.x = .25 + .1 * Math.sin(s.t * 9);
        s.mouthW = 1;
      }
    }
    function owlBoss(m, dt, st, s) {
      const B = m.B, K = FB.baykus, { ph, t } = bossClock(st, s), body = B.body, head = B.head, WL = B.wingL, WR = B.wingR;
      ownHurt(m, st);
      if (ph === 'gust') {
        const prep = ramp(t, 0, K.warn), e = t - K.warn, on = e >= 0 && e < K.gustD ? 1 : 0;
        WL.rotation.z += prep * (1 - on) * 1.5; WR.rotation.z -= prep * (1 - on) * 1.5; body.rotation.x -= prep * (1 - on) * .3; body.scale.multiplyScalar(1 + .08 * prep * (1 - on));
        if (on) { const f = Math.sin(e * 24); WL.rotation.z += .5 + f * 1.0; WR.rotation.z -= .5 + f * 1.0; WL.rotation.y -= .4; WR.rotation.y += .4; body.rotation.x += .12; }
        s.eyeK = 1 + .2 * prep;
      } else if (ph === 'feathers') {
        const prep = ramp(t, 0, K.warn), e = t - K.warn, rel = e >= 0 ? bell(clamp01(e / .45)) : 0;
        WL.rotation.z += prep * 1.0 * (1 - rel); WR.rotation.z -= prep * 1.0 * (1 - rel); WL.rotation.y += prep * .5 - rel * .9; WR.rotation.y -= prep * .5 - rel * .9;
        body.scale.multiplyScalar(1 + .05 * prep * (e < 0 ? 1 : 0)); body.rotation.x -= .15 * prep - .3 * rel;
      } else if (ph === 'fly') {
        const f = Math.sin(s.t * 11);
        WL.rotation.z += .5 + f * .9; WR.rotation.z -= .5 + f * .9; body.rotation.x += .15;
        B.legL.rotation.x += .4; B.legR.rotation.x += .4;
        const land = t > K.takeoff + K.flyD - .25 ? ramp(t, K.takeoff + K.flyD - .25, K.takeoff + K.flyD + .2) : 0;
        WL.rotation.z += land * .6; WR.rotation.z -= land * .6;
      } else if (ph === 'summon' || ph === 'roar') {
        const k = bell(clamp01(t / (ph === 'roar' ? 1.6 : 1.8)));
        head.rotation.x -= .25 * k * Math.abs(Math.sin(t * 6)); WL.rotation.z += .9 * k; WR.rotation.z -= .9 * k;
        s.eyeK = 1 + .3 * k;
      }
    }
    // The beaver: waddles upright, slaps with its tail, throws / gnaws its log.
    function animBeaver(m, dt, st, s) {
      hideFo(m); cheer(m, st, s);
      const B = m.B, boss = m.def.forestSpecies === 'beaverboss', body = B.body, head = B.head, dying = st.dying >= 0;
      const mv = clamp01(s.mv), wind = st.windup >= 0 ? smooth(st.windup) : 0, attack = st.attack >= 0 ? st.attack : -1;
      s.walk += dt * 8 * (.25 + mv);
      const w = Math.sin(s.walk), T0 = B.tail0, T1 = B.tail1, AL = B.armL, AR = B.armR;
      body.position.y += Math.sin(s.t * 2 + s.ph) * .012 + Math.abs(w) * mv * .035;
      body.rotation.z += w * mv * .09; body.rotation.y += w * mv * .05;
      B.legL.rotation.x += w * mv * .55; B.legR.rotation.x -= w * mv * .55;
      AL.rotation.x -= w * mv * .35; AR.rotation.x += w * mv * .35;
      T0.rotation.y += Math.sin(s.t * 2.1 + s.ph) * .12 + w * mv * .15; T1.rotation.x += Math.sin(s.t * 2.6) * .04;
      head.rotation.y += Math.sin(s.t * 1.2 + s.ph) * .06 * (1 - mv);
      if (!boss) {
        if (wind > 0 && !dying) { body.rotation.x -= wind * .2; T0.rotation.x += wind * .8; AL.rotation.x -= wind * .9; AR.rotation.x -= wind * .9; }
        if (attack >= 0 && !dying) { const hit = bell(Math.min(1, attack * 2.4)); body.position.z += hit * .1; body.rotation.x += hit * .25; T0.rotation.x -= hit * .4; }
        if (st.hurt > 0 && !dying) head.rotation.x -= st.hurt * st.hurt * .1;
      } else {
        const K = FB.kunduz, { ph, t } = bossClock(st, s);
        ownHurt(m, st);
        if (ph === 'throw') {
          const prep = ramp(t, 0, K.warn), e = t - K.warn, rel = e >= 0 ? bell(clamp01(e / .5)) : 0;
          AL.rotation.x -= prep * 2.5 * (e < 0 ? 1 : 1 - ramp(e, 0, .2)) - rel * .6; AR.rotation.x -= prep * 2.5 * (e < 0 ? 1 : 1 - ramp(e, 0, .2)) - rel * .6;
          body.rotation.x += -prep * .38 * (e < 0 ? 1 : 0) + rel * .42; head.rotation.x -= prep * .18;
          if (e < 0) holdAt(m, 'log', [0, .74 * prep, -.36 * prep]);
          s.eyeK = 1 + .15 * prep;
        } else if (ph === 'slap') {
          const prep = ramp(t, 0, K.warn), e = t - K.warn, hit = e >= 0 ? 1 - ramp(e, 0, .12) : 1, rel = e >= 0 ? bell(clamp01(e / .6)) : 0;
          T0.rotation.x += prep * hit * 1.35 - rel * .3; T1.rotation.x += prep * hit * .7;
          body.rotation.x += prep * .24 * hit; AL.rotation.z += prep * .8; AR.rotation.z -= prep * .8; head.rotation.x -= prep * .15 * hit;
          body.scale.y *= 1 - .07 * rel; body.position.y += rel * .05;
        } else if (ph === 'wave') {
          const prep = ramp(t, 0, K.warn), e = t - K.warn, rel = e >= 0 ? bell(clamp01(e / .55)) : 0, up = prep * (e < 0 ? 1 : 1 - ramp(e, 0, .15));
          AL.rotation.x -= up * 2.7 - rel * .5; AR.rotation.x -= up * 2.7 - rel * .5; body.rotation.x += -up * .34 + rel * .55;
          T0.rotation.x += up * .6; head.rotation.x -= up * .15; s.eyeK = 1 + .2 * up;
        } else if (ph === 'chew') {
          const k = ramp(t, 0, .35) * (1 - ramp(t, K.chewD - .35, K.chewD));
          AL.rotation.x -= 1.05 * k; AR.rotation.x -= 1.05 * k; AL.rotation.z -= .15 * k; AR.rotation.z += .15 * k;
          head.rotation.x += Math.sin(s.t * 19) * .05 * k; s.eyeK = 1 - .35 * k;
          holdAt(m, 'log', [0, .24 * k, -.02 * k], 1, [s.t * 2.2 * k, 0, 0]);
          if (k < .02) B.log.scale.setScalar(HIDE);
        } else if (ph === 'summon' || ph === 'roar') {
          const k = bell(clamp01(t / (ph === 'roar' ? 1.6 : 1.8)));
          AL.rotation.x -= 1.9 * k; AR.rotation.x -= 1.9 * k; AL.rotation.z += (ph === 'summon' ? Math.sin(t * 13) * .5 : .5) * k; AR.rotation.z -= (ph === 'summon' ? Math.sin(t * 13) * .5 : .5) * k;
          T0.rotation.x += Math.abs(Math.sin(t * 8)) * .7 * k; head.rotation.x -= .2 * k; s.mouthO = k;
        }
      }
      if (dying) s.mouthW = 1;   // (the tail-drum dance: life → dance)
      placeFo(m, st);
    }
    // ════════ ANIM: the shared life layer — runs after every animal's own pose, every frame ════════
    // Weight and follow-through from the root's real motion (springs), breathing, idle look-around, ear flicks, foot-plant
    // squash, hop stretch / landing squash, the cute "oh!" when bonked (shake, wide eyes, "O" mouth, three orbiting stars),
    // a stronger coiled tremble before every boss release, each species' silly idle gag and its own happy dance.
    // All state lives in s (per instance); nothing is allocated per frame.
    const EARK = { fox: 1, rockfox: 1, boar: .7, piglet: .8, bear: .6, bearboss: .45, raccoon: .9, gang: .9, squirrel: 1, soldier: .8, beaver: .5, beaverboss: .4, bat: 1.1, goat: 1.2, goatboss: .9, owlet: .5, owlboss: .4 };
    const TAILK = { croc: .45, fox: 1, rockfox: 1, raccoon: .9, gang: .9, squirrel: 1.1, soldier: 1, boar: .4, piglet: .5, bear: .3, bearboss: .3, turtle: .5, waterturtle: .5,
      goat: .8, goatboss: .6, duck: .9, owlet: .6, owlboss: .5, beaver: .7, beaverboss: .55, bat: .5, hedgehog: .3 };
    const WARN_PH = { throw: 1, slap: 1, wave: 1, tongue: 1, croak: 1, slam: 1, hives: 1, charge: 1, rocks: 1, gust: 1, feathers: 1 };
    const LEGS4 = ['legFL', 'legFR', 'legBL', 'legBR'];
    function spring(s, key, target, k, c, dt) {   // damped spring (stiffness k, damping c) toward target; value kept in s[key]
      let x = s[key] || 0, v = s[key + 'V'] || 0;
      if (dt > 0) {
        const T = Math.min(dt, .1), n = Math.ceil(T * 30), h = T / n;
        for (let i = 0; i < n; i++) { v += ((target - x) * k - v * c) * h; x += v * h; }
      }
      s[key] = x; s[key + 'V'] = v; return x;
    }
    function fxAt(m, kind, y, o) {   // a little world FX puff at the animal (optional: FX is absent in previews)
      if (typeof FX === 'undefined' || !FX || !FX.burst) return;
      try { const p = m.root.position; FX.burst(kind, p.x + (o && o.dx || 0), p.y + y, p.z + (o && o.dz || 0), o || {}); } catch (err) { /* cosmetic */ }
    }
    function snd(m, name, vol = .5, pitch = 1) {   // a little sound at the animal (GAME's AUD; silent in ?sessiz / previews)
      if (typeof AUD === 'undefined' || !AUD || typeof AUD.sfx !== 'function') return;
      try { const p = m.root.position; AUD.sfx(name, { x: p.x, z: p.z, vol, pitch }); } catch (err) { /* cosmetic */ }
    }
    function once(s, key, cond) { const was = s[key]; s[key] = !!cond; return !!cond && !was; }   // true on the frame cond turns on
    function life(m, dt, st, s) {
      const B = m.B, body = B.body, head = B.head;
      if (!body || !head) return;
      const sp = m.def.forestSpecies, boss = m.boss, dying = st.dying >= 0, U = m.def.modelScale || 1;
      if (m.def.lifeHide) for (const n of m.def.lifeHide) if (B[n]) B[n].scale.setScalar(HIDE);
      if (boss && sp === 'croc') hideFo(m);
      // ── the root's real motion (GAME moves it): forward speed, acceleration, turning rate ──
      const rt = m.root, idt = dt > 1e-5 ? 1 / dt : 0;
      if (s.lx === undefined) { s.lx = rt.position.x; s.lz = rt.position.z; s.lry = rt.rotation.y; s.vf = 0; s.acc = 0; s.yr = 0; s.gagT = 3 + Math.random() * 6; s.gagN = 0; }
      let vx = (rt.position.x - s.lx) * idt, vz = (rt.position.z - s.lz) * idt, dr = rt.rotation.y - s.lry;
      dr -= Math.round(dr / TAU) * TAU;
      if (vx * vx + vz * vz > 900 || Math.abs(dr) > 1.5) { vx = vz = 0; dr = 0; }   // a teleport / snap
      const f = rt.rotation.y, fwd = vx * Math.sin(f) + vz * Math.cos(f);
      if (idt) {
        s.acc = damp(s.acc, Math.max(-12, Math.min(12, (fwd - s.vf) * idt)), 6, dt);
        s.yr = damp(s.yr, Math.max(-5, Math.min(5, dr * idt)), 7, dt);
      }
      s.vf = fwd; s.lx = rt.position.x; s.lz = rt.position.z; s.lry = rt.rotation.y;
      const mv = clamp01(s.mv), K = boss ? .5 : 1;
      const busy = st.windup >= 0 || st.attack >= 0 || (boss && st.phase && st.phase !== 'idle' && st.phase !== 'move');
      const calm = !dying && !busy;
      let sy = 1;   // the life layer's own vertical squash of the body (the feet stay planted: compensated at the end)
      // ── follow-through: stopping tips the body forward, starting leans it back, turning rolls it; ears / tail lag ──
      const lean = spring(s, 'sLean', dying ? 0 : -s.acc * .02 * K, 55, 8, dt);
      const roll = spring(s, 'sRoll', dying ? 0 : -s.yr * Math.min(1, Math.abs(fwd) * .5) * .07, 40, 7, dt);
      body.rotation.x += lean; body.rotation.z += roll; head.rotation.x -= lean * .5;
      const lagX = spring(s, 'sLagX', lean * 2.5 - mv * .12, 30, 4.2, dt);
      const lagY = spring(s, 'sLagY', -s.yr * .18 * K, 26, 3.8, dt);
      // ── breathing (slower for the big ones; held shallow while it concentrates) ──
      if (!dying) {
        const br = Math.sin(s.t * (boss ? 1.5 : 2.3) + s.ph), bk = (1 - .6 * mv) * (busy ? .5 : 1);
        body.scale.x *= 1 + .024 * br * bk; body.scale.z *= 1 + .016 * br * bk; sy *= 1 + .014 * br * bk;
        head.rotation.x -= .025 * br * bk;
      }
      // ── foot plant: a soft squash each time a foot lands; the head nods a beat later ──
      if (mv > .05 && !dying && !m.def.flyer) {
        const ph = s.walk * 2, plant = Math.pow(Math.max(0, Math.cos(ph)), 6) * mv;
        sy *= 1 - .05 * plant; body.scale.x *= 1 + .03 * plant; body.scale.z *= 1 + .02 * plant;
        head.rotation.x += Math.sin(ph - 1.1) * .05 * mv * K;
      }
      // ── idle: looks around (eases to a spot and holds), tilts the head curiously; looks into a turn ──
      if (dt > 0 && (s.lookT = (s.lookT ?? 1 + Math.random() * 2) - dt) < 0) {
        s.lookT = 1.4 + Math.random() * 2.6;
        s.lookTY = Math.random() < .3 ? 0 : (Math.random() - .5) * (boss ? .6 : 1.1);
        s.lookTZ = Math.random() < .4 ? (Math.random() - .5) * .55 : 0;
        s.lookTX = (Math.random() - .6) * .22;
      }
      const idle = calm && !s.gag ? 1 - mv : 0;
      s.lookY = damp(s.lookY || 0, (s.lookTY || 0) * idle, 5, dt); s.lookZ = damp(s.lookZ || 0, (s.lookTZ || 0) * idle, 4, dt); s.lookX = damp(s.lookX || 0, (s.lookTX || 0) * idle, 4, dt);
      head.rotation.y += s.lookY + s.yr * .08; head.rotation.z += s.lookZ; head.rotation.x += s.lookX;
      // ── the "oh!": a new hit → jolt back, wobble like jelly, wide eyes, an "O" mouth, ears flat, three spinning stars ──
      const h = +st.hurt || 0;
      if (!dying && h > (s.hPrev || 0) + .2 && (s.ouch || 0) < .75) { s.ouch = 1; s.ouchSd = Math.random() < .5 ? -1 : 1; if (s.gag && !s.gag.keep) s.gag = null; }
      s.hPrev = h;
      if (dt > 0) s.ouch = Math.max(0, (s.ouch || 0) - dt / (boss ? .8 : 1.0));
      const o = dying ? 0 : (s.ouch || 0);
      if (o > 0) {
        const u = 1 - o, jolt = smooth(u / .08) * (1 - smooth((u - .08) / .45));
        const shk = Math.sin(s.t * 50) * o * o * (boss ? .045 : .11);
        body.rotation.z += shk * s.ouchSd; head.rotation.z -= shk * 1.5 * s.ouchSd;
        head.rotation.x -= .26 * jolt * K; body.rotation.x -= .08 * jolt * K;
        const jig = Math.sin(u * 24) * o * o;
        sy *= 1 + .08 * jig * K; body.scale.x *= 1 - .045 * jig * K; body.scale.z *= 1 - .035 * jig * K;
        s.eyeK = Math.max(s.eyeK, 1 + .35 * jolt); s.browY = Math.max(s.browY, .04 * jolt); s.mouthO = Math.max(s.mouthO, smooth(o * 1.8 - .5));
      }
      // ── ears: lag, bounce with the steps, idle drift, a random flick, flat when bonked, trail in a hop ──
      const ek = EARK[sp];
      if (ek && B.earL) {
        if (dt > 0 && (s.flT = (s.flT ?? Math.random() * 4) - dt) < 0) { s.flT = 2.2 + Math.random() * 4; s.flE = Math.random() < .5 ? 1 : -1; s.flK = 1; }
        if (dt > 0) s.flK = Math.max(0, (s.flK || 0) - dt / .25);
        const fl = s.flK > 0 ? Math.sin((1 - s.flK) * PI) : 0, hop = st.air > 0 && st.air < 1 ? Math.cos(st.air * PI) : 0;
        for (const sd of [1, -1]) {
          const e = B[sd > 0 ? 'earL' : 'earR'], flick = sd === s.flE ? fl : 0;
          const ax = lagX * .8 - Math.sin(s.walk * 2 - .9) * .17 * mv + Math.sin(s.t * 1.7 + s.ph + sd) * .035 - .55 * o - .3 * hop - .2 * flick;
          const az = lagY * .9 + Math.sin(s.t * 2.3 + s.ph * 2 + sd) * .03 - sd * (.35 * o + .45 * flick);
          e.rotation.x += ax * ek; e.rotation.z += az * ek;
        }
      }
      // ── tail: lags behind turns, bobs with the gait, sways lazily at rest, shoots up stiff at an "oh!" ──
      const tk = TAILK[sp] ?? 0;
      if (tk && B.tail0) for (let i = 0; i < 3; i++) {
        const t = B['tail' + i]; if (!t) break;
        t.rotation.y += lagY * (1.2 + i * .5) * tk + (calm ? Math.sin(s.t * 1.3 + s.ph - i * .6) * .05 * tk : 0);
        t.rotation.x += (lagX * (.5 + i * .3) + Math.sin(s.walk * 2 - 1 - i * .7) * .09 * mv + o * .3) * tk;
      }
      // ── hops: stretched on the way up and down, round at the top; a squash-and-rebound landing ──
      const air = st.air > 0 && st.air < 1 ? st.air : 0;
      if ((s.airP || 0) > .4 && !air) s.land = 1;
      s.airP = air;
      if (dt > 0) s.land = Math.max(0, (s.land || 0) - dt / .4);
      if (air && !dying) {
        const vel = Math.cos(air * PI), a = Math.abs(vel);
        sy *= 1 + .14 * a * K; body.scale.x *= 1 - .06 * a * K; body.scale.z *= 1 - .05 * a * K; body.rotation.x -= .12 * vel * K;
      }
      if (s.land > 0 && !dying) {
        const l = s.land, sq = Math.sin((1 - l) * PI * 2.2) * l;
        sy *= 1 - .22 * sq * K; body.scale.x *= 1 + .13 * sq * K; body.scale.z *= 1 + .11 * sq * K; s.eyeK *= 1 - .35 * Math.max(0, sq);
      }
      // ── bosses: every telegraphed move coils up with a building tremble, then snaps through and settles ──
      if (boss && !dying) {
        const KB = FB[m.type], ph = st.phase, t = s.pT || 0;
        let tr = 0, rel = -1;
        if (KB && WARN_PH[ph]) { const e = t - KB.warn; if (e < 0) tr = ramp(t, KB.warn * .5, KB.warn); else rel = e; }
        else if (sp === 'croc' && (ph === 'bite' || ph === 'sweep')) {
          const p = clamp01(+st.phaseT || 0), at = ph === 'bite' ? .48 : .42;
          if (p < at) tr = ramp(p, at * .45, at); else rel = (p - at) * 2.2;
        }
        if (tr > 0) {
          body.rotation.z += Math.sin(s.t * 41) * .03 * tr; head.rotation.z -= Math.sin(s.t * 37 + 1) * .035 * tr;
          body.position.x += Math.sin(s.t * 53) * .014 * U * tr;
          s.eyeK = Math.max(s.eyeK, 1 + .22 * tr); s.browY = Math.max(s.browY, .025 * tr);
          sy *= 1 - .05 * tr; body.scale.x *= 1 + .03 * tr; body.scale.z *= 1 + .03 * tr;
        } else if (rel >= 0 && rel < .7) {
          const k = Math.exp(-rel * 6) * Math.sin(rel * 20 + .6);
          sy *= 1 + .1 * k; body.scale.x *= 1 - .05 * k; body.scale.z *= 1 - .05 * k;
        }
      }
      // ── gags (small ones, calm and still), the bosses' fun moments, the happy dances ──
      s.dizzy = 0;
      if (dying) { s.gag = null; s.dT = (s.dT || 0) + dt; sy *= dance(m, dt, st, s, sp, U); }
      else {
        s.dT = 0;
        if (boss) sy *= bossFun(m, dt, st, s, sp, U);
        else sy *= gag(m, dt, st, s, sp, U, calm && mv < .08 && !(o > 0));
      }
      if (B.stars) {
        const sk = Math.max(o > 0 ? smooth((1 - o) / .1) * smooth(o / .3) : 0, s.dizzy);
        if (sk > .01) { B.stars.scale.setScalar(sk); B.stars.rotation.y = s.t * 6.5; B.stars.rotation.z = Math.sin(s.t * 3.1) * .18; B.stars.position.y += Math.sin(s.t * 9) * .015 * U; }
        else B.stars.scale.setScalar(HIDE);
      }
      if (s.dizzy > 0) s.eyeWob = Math.max(s.eyeWob || 0, s.dizzy);
      body.scale.y *= sy;
      if (!m.def.flyer) body.position.y -= (1 - sy) * body.userData.p0.y;
    }

    // ── Silly idle gags: when a small animal stands calm for a while it does its own little comedy (≈2–3 s);
    // any move, wind-up, attack or hit ends it at once. Returns a vertical squash factor for the body. ──
    const GAG_D = { duck: 2.3, hedgehog: 2.6, squirrel: 2.6, soldier: 2.6, frog: 2.6, lilyfrog: 2.6, goat: 2.8, piglet: 2.6, boar: 2.2, bat: 3.6, fox: 2.1, rockfox: 2.1,
      raccoon: 2.4, gang: 2.4, bear: 2.6, croc: 2.4, turtle: 3.2, waterturtle: 1.8, owlet: 3.2, beaver: 2.4, firefly: 2.6, mud: 2.4 };
    function gag(m, dt, st, s, sp, U, free) {
      const D = GAG_D[sp]; if (!D) return 1;
      if (!s.gag) {
        if (st.gagNow && !s.gagN) s.gagT = 0;   // (test / preview hook: start the gag right away)
        if (!free) { s.gagT = Math.max(s.gagT, 1.2); return 1; }
        if (dt > 0) s.gagT -= dt;
        if (s.gagT > 0) return 1;
        s.gag = { u: 0 }; s.gagN++; s.gagT = 7 + Math.random() * 8;
      }
      if (!free && !(s.gag.u > D - .25)) { s.gag = null; return 1; }
      const u = (s.gag.u += dt), B = m.B, body = B.body, head = B.head, env = smooth(u / .25) * (1 - smooth((u - D + .35) / .35));
      if (u >= D) { s.gag = null; return 1; }
      let sy = 1;
      const L = n => B[n] || null;
      switch (sp) {
        case 'duck': {   // trips over its own feet, flops on its belly kicking, quacks, gets up and shakes its head
          const fall = smooth((u - .1) / .25) * (1 - smooth((u - 1.5) / .4));
          body.rotation.x += 1.15 * fall; body.position.y -= .12 * U * fall; head.rotation.x -= .7 * fall;
          B.legL.rotation.x -= (1.4 + Math.sin(u * 24) * .5) * fall; B.legR.rotation.x -= (1.4 + Math.sin(u * 24 + PI) * .5) * fall;
          B.wingL.rotation.z += (.9 + Math.sin(u * 20) * .4) * fall; B.wingR.rotation.z -= (.9 + Math.sin(u * 20) * .4) * fall;
          if (B.jaw) B.jaw.rotation.x = .35 * Math.abs(Math.sin(u * 14)) * fall;
          const shake = smooth((u - 1.75) / .15) * (1 - smooth((u - 2.1) / .15));
          head.rotation.y += Math.sin(u * 40) * .35 * shake; s.dizzy = Math.max(s.dizzy, fall * .8);
          if (once(s, 'gk1', u > .35)) { fxAt(m, 'dust', .1, { count: 6, color: '#d8cfb4' }); snd(m, 'quack', .5, 1.15); }
          if (once(s, 'gk2', u > 1.0)) snd(m, 'quack', .45, .95);
          break;
        }
        case 'hedgehog': {   // curls into a ball, rolls off, BONK into something, uncurls dizzy
          const c = smooth(u / .3) * (1 - smooth((u - 1.6) / .3));
          for (const n of LEGS4) B[n].scale.setScalar(1 - .75 * c);
          head.rotation.x += .95 * c; head.position.z -= .1 * U * c; body.rotation.x += .35 * c;
          const roll = smooth((u - .3) / .7); body.rotation.x += roll * TAU * 1.5 * (u < 1.05 ? 1 : 1); body.position.z += .35 * U * roll * (1 - smooth((u - 1.05) / .2));
          const bonk = u > 1.0 ? Math.exp(-(u - 1.0) * 7) * Math.sin((u - 1.0) * 30) : 0;
          sy *= 1 - .18 * bonk; body.scale.z *= 1 - .2 * Math.max(0, bonk);
          if (once(s, 'gk1', u > 1.0)) { fxAt(m, 'sparkle', .5, { count: 5, color: '#ffe27a' }); snd(m, 'bonk', .5, 1.2); }
          s.dizzy = Math.max(s.dizzy, smooth((u - 1.0) / .1) * (1 - smooth((u - D + .4) / .3)));
          head.rotation.z += Math.sin(u * 9) * .15 * smooth((u - 1.6) / .3);
          break;
        }
        case 'squirrel': case 'soldier': {   // tosses its acorn up, admires it… and it lands on its own head. Bonk!
          const nut = B.nut, U2 = U;
          const up = clamp01((u - .35) / .5), dn = clamp01((u - .85) / .5), on = u > .3 && u < 1.9;
          B.legFR.rotation.x -= (1.1 * smooth(u / .3) - 1.6 * bell(clamp01((u - .25) / .25))) * env;
          head.rotation.x -= .55 * smooth((u - .4) / .3) * (1 - smooth((u - 1.3) / .1));
          if (nut && on) {
            const y = u < .85 ? .9 * Math.sin(up * PI * .5) : u < 1.35 ? .9 * (1 - dn * dn) : .02 * Math.max(0, 1 - (u - 1.35) * 3);
            const z = u < .85 ? .25 * (1 - up) : 0;
            nut.scale.setScalar(u > 1.75 ? Math.max(HIDE, 1 - (u - 1.75) / .15) : 1);
            nut.position.y += y * U2; nut.position.z += z * U2; nut.rotation.x = u * 9;
          }
          const bonk = u > 1.35 ? Math.exp(-(u - 1.35) * 6) * Math.sin((u - 1.35) * 28) : 0;
          sy *= 1 - .14 * bonk; head.rotation.x += .3 * Math.max(0, bonk);
          if (once(s, 'gk1', u > 1.35)) { fxAt(m, 'sparkle', 1.4 * U, { count: 4, color: '#ffe27a' }); snd(m, 'bonk', .45, 1.5); }
          s.dizzy = Math.max(s.dizzy, smooth((u - 1.35) / .1) * (1 - smooth((u - D + .4) / .3)));
          break;
        }
        case 'frog': case 'lilyfrog': {   // shoots its tongue out… it loops round and sticks to its own head
          const tg = B.tongue, out = smooth((u - .2) / .3) * (1 - smooth((u - 2.0) / .3));
          if (tg && out > .01) {
            tg.scale.set(1, 1, 1 + 5 * out); B.tongueTip.scale.set(1, 1, 1 / (1 + 5 * out));
            tg.rotation.x = -2.6 * smooth((u - .55) / .5) * (1 - smooth((u - 1.9) / .3)); tg.rotation.y = Math.sin(u * 5) * .2 * out;
          }
          s.eyeWob = Math.max(s.eyeWob || 0, smooth((u - .9) / .2) * (1 - smooth((u - 2.0) / .2)));
          head.rotation.x -= .2 * out; head.rotation.z += Math.sin(u * 6) * .12 * out;
          B.legFL.rotation.z += .3 * out; B.legFR.rotation.z -= .3 * out;
          break;
        }
        case 'goat': {   // a mighty head-butt into the ground — stuck! kicks, wiggles, pops free and tumbles back
          const dive = smooth(u / .35) * (1 - smooth((u - 2.0) / .15));
          head.rotation.x += 1.0 * dive; body.rotation.x += .45 * dive; body.position.y -= .06 * U * dive;
          const kick = dive * smooth((u - .5) / .2);
          B.legBL.rotation.x += (.6 + Math.sin(u * 22) * .55) * kick; B.legBR.rotation.x += (.6 + Math.sin(u * 22 + PI) * .55) * kick;
          body.rotation.z += Math.sin(u * 17) * .12 * kick; B.tail0.rotation.x -= (.6 + Math.sin(u * 40) * .4) * kick;
          const pop = u > 2.0 ? Math.exp(-(u - 2.0) * 5) * Math.sin((u - 2.0) * 14) : 0;
          body.rotation.x -= .5 * Math.max(0, pop); sy *= 1 + .12 * pop;
          if (once(s, 'gk1', u > 2.0)) { fxAt(m, 'dust', .1, { count: 8, color: '#cfc5b2', dz: .3 }); snd(m, 'pop', .45, 1.1); }
          s.dizzy = Math.max(s.dizzy, smooth((u - 2.05) / .1) * (1 - smooth((u - D + .3) / .25)));
          break;
        }
        case 'piglet': {   // a happy belly-flop into the mud: splash! wriggles and wags in it
          const flop = smooth((u - .15) / .3) * (1 - smooth((u - 2.0) / .35));
          body.rotation.x += .25 * flop; body.position.y -= .12 * U * flop;
          for (const n of LEGS4) B[n].rotation.x += (n[3] === 'F' ? -1.0 : 1.0) * flop;
          body.rotation.y += Math.sin(u * 18) * .2 * flop * smooth((u - .5) / .2); body.rotation.z += Math.sin(u * 18) * .1 * flop;
          sy *= 1 - .12 * flop; s.mouthW = flop; s.eyeK = Math.min(s.eyeK, 1 - .5 * flop);
          if (once(s, 'gk1', u > .45)) { fxAt(m, 'jelly', .15, { color: '#7a5a3c', scale: .7 }); fxAt(m, 'dust', .1, { count: 8, color: '#8a6a4a' }); snd(m, 'splash', .4, 1.3); }
          break;
        }
        case 'boar': {   // snuffles in the leaves, snout wiggling… a big sneeze
          const sn = smooth(u / .3) * (1 - smooth((u - 1.6) / .2));
          head.rotation.x += .5 * sn + Math.sin(u * 30) * .05 * sn; head.rotation.y += Math.sin(u * 11) * .15 * sn;
          const ah = bell(clamp01((u - 1.2) / .5)), choo = u > 1.7 ? Math.exp(-(u - 1.7) * 8) : 0;
          head.rotation.x -= .45 * ah - .7 * choo; s.eyeK = Math.min(s.eyeK, 1 - .7 * ah); s.mouthO = Math.max(s.mouthO, ah);
          body.position.z -= .08 * U * choo;
          if (once(s, 'gk1', u > 1.7)) { fxAt(m, 'dust', .3, { count: 6, color: '#e6dcc0', dz: .5 }); snd(m, 'pop', .4, .8); }
          break;
        }
        case 'bat': {   // flips upside down, wraps its wings and dozes off… then shakes awake
          const hang = smooth(u / .4) * (1 - smooth((u - 3.0) / .4));
          body.rotation.z += PI * hang; body.position.y += .45 * U * hang;
          B.wingL.rotation.y -= 1.0 * hang; B.wingR.rotation.y += 1.0 * hang; B.wingL.rotation.z -= .4 * hang; B.wingR.rotation.z += .4 * hang;
          body.rotation.x += Math.sin(u * 1.6) * .08 * hang; s.eyeK = Math.min(s.eyeK, 1 - .92 * hang);
          if (once(s, 'gk1', u > 1.2)) fxAt(m, 'zzz', .9, {});
          break;
        }
        case 'fox': case 'rockfox': {   // chases its own tail round and round
          const c = smooth(u / .3) * (1 - smooth((u - 1.75) / .3));
          body.rotation.y += TAU * 2 * smooth((u - .1) / 1.8); head.rotation.y -= 1.0 * c; head.rotation.x += .2 * c;
          for (let i = 0; i < 3; i++) B['tail' + i].rotation.y += (.6 + Math.sin(u * 22 - i) * .2) * c;
          body.rotation.z -= .15 * c; s.mouthW = c;
          break;
        }
        case 'raccoon': case 'gang': {   // tiptoes, shifty eyes left-right, rubs its paws together with a cheeky giggle
          const k = env;
          body.rotation.x -= .3 * k; B.legFL.rotation.x -= (1.0 + Math.sin(u * 26) * .25) * k; B.legFR.rotation.x -= (1.0 + Math.sin(u * 26 + PI) * .25) * k;
          B.legFL.rotation.z -= .35 * k; B.legFR.rotation.z += .35 * k;
          head.rotation.y += Math.sign(Math.sin(u * 3.2)) * .45 * k * smooth(Math.abs(Math.sin(u * 3.2)) * 3); head.rotation.x += .1 * k;
          sy *= 1 + Math.abs(Math.sin(u * 13)) * .04 * k;
          break;
        }
        case 'bear': {   // sits back and scratches its round tummy, eyes shut with bliss
          const k = env;
          body.rotation.x -= .5 * k; body.position.y -= .05 * U * k;
          B.legFL.rotation.x -= (.9 + Math.sin(u * 20) * .25) * k; B.legFL.rotation.z -= .4 * k; B.legFR.rotation.x -= .5 * k;
          head.rotation.x -= .25 * k; head.rotation.z += Math.sin(u * 3) * .12 * k; s.eyeK = Math.min(s.eyeK, 1 - .85 * k); s.mouthW = k;
          body.scale.x *= 1 + Math.sin(u * 20) * .025 * k;
          break;
        }
        case 'croc': {   // an enormous yawn, eyes shut… then a snap and a little shiver
          const y = bell(clamp01((u - .1) / 1.7));
          if (B.jaw) B.jaw.rotation.x = Math.max(B.jaw.rotation.x, .75 * y);
          head.rotation.x -= .35 * y; s.eyeK = Math.min(s.eyeK, 1 - .9 * y); body.scale.z *= 1 + .05 * y;
          const snap = u > 1.8 ? Math.exp(-(u - 1.8) * 7) * Math.sin((u - 1.8) * 30) : 0;
          head.rotation.z += .1 * snap; body.rotation.z += .05 * snap;
          for (let i = 0; i < 3; i++) B['tail' + i].rotation.y += Math.sin(u * 3 - i) * .2 * env;
          break;
        }
        case 'turtle': {   // pulls into its shell for a snooze (snoring breaths), peeks out again
          const k = smooth(u / .4) * (1 - smooth((u - 2.6) / .4));
          head.position.z -= .14 * U * k; head.scale.setScalar(1 - .55 * k); for (const n of LEGS4) B[n].scale.setScalar(1 - .6 * k);
          sy *= 1 + Math.sin(u * 3.2) * .05 * k; body.position.y -= .04 * U * k;
          if (once(s, 'gk1', u > 1.0)) fxAt(m, 'zzz', .8, {});
          break;
        }
        case 'waterturtle': {   // spins on its shell just for fun, legs out
          const k = env;
          body.rotation.y += TAU * 2 * smooth(u / D); for (const n of LEGS4) B[n].rotation.z += (n[4] === 'L' ? .5 : -.5) * k;
          head.rotation.x -= .25 * k; s.mouthW = k; s.eyeK = Math.min(s.eyeK, 1 - .6 * k);
          break;
        }
        case 'owlet': {   // nods off mid-air, sinking… jolts awake with a flap
          const k = smooth(u / .6) * (1 - smooth((u - 2.6) / .12));
          head.rotation.x += .55 * k + Math.sin(u * 2) * .1 * k; s.eyeK = Math.min(s.eyeK, 1 - .9 * k); body.position.y -= .18 * U * k;
          B.wingL.rotation.z -= .3 * k; B.wingR.rotation.z += .3 * k;
          const jolt = u > 2.6 ? Math.exp(-(u - 2.6) * 6) : 0;
          s.eyeK = Math.max(s.eyeK, 1 + .4 * jolt); B.wingL.rotation.z += 1.2 * jolt; B.wingR.rotation.z -= 1.2 * jolt;
          break;
        }
        case 'beaver': {   // nibbles a twig at top speed: chk-chk-chk
          const k = env;
          B.armL.rotation.x -= 1.3 * k; B.armR.rotation.x -= 1.3 * k; B.armL.rotation.z -= .25 * k; B.armR.rotation.z += .25 * k;
          head.rotation.x += (.12 + Math.sin(u * 32) * .06) * k; s.eyeK = Math.min(s.eyeK, 1 - .4 * k);
          B.tail0.rotation.x += Math.abs(Math.sin(u * 6)) * .3 * k;
          if (once(s, 'gk1', u > .8)) fxAt(m, 'crumbs', .6 * U, { count: 4, color: '#c79b6a' });
          break;
        }
        case 'firefly': {   // the swarm bursts apart like a firework, then swirls back together
          const k = bell(clamp01((u - .1) / 2.2));
          s.swarm = Math.max(s.swarm || 0, k * 1.6);
          break;
        }
        case 'mud': {   // stretches wider and wider as if to split in two… plop, back into one
          const k = bell(clamp01(u / 1.9));
          body.scale.x *= 1 + .55 * k; sy *= 1 - .3 * k; head.rotation.z += Math.sin(u * 7) * .15 * k;
          s.eyeK = Math.max(s.eyeK, 1 + .25 * k); s.mouthO = Math.max(s.mouthO, k);
          const plop = u > 1.9 ? Math.exp(-(u - 1.9) * 7) * Math.sin((u - 1.9) * 26) : 0;
          sy *= 1 + .15 * plop;
          if (once(s, 'gk1', u > 1.9)) { fxAt(m, 'jelly', .2, { color: '#7a5a3c', scale: .6 }); snd(m, 'squish', .45, 1.1); }
          break;
        }
      }
      return sy;
    }

    // ── Happy dances: each animal cheers in its own way while GAME's hearts, hops and the sparkle twirl play on top. ──
    function dance(m, dt, st, s, sp, U) {
      const B = m.B, body = B.body, head = B.head, u = s.dT, boss = m.boss;
      const en = smooth(u / .12) * (1 - smooth((st.dying - (boss ? .6 : .5)) / .15));
      if (en <= 0) return 1;
      let sy = 1;
      const legs = (a, b, ph) => { if (B.legFL) { B.legFL.rotation.x -= a + b * Math.sin(ph); B.legFR.rotation.x -= a + b * Math.sin(ph + PI); } };
      switch (sp) {
        case 'croc': {   // rears up, paddles both front paws, claps its jaw, tail whipping happily
          body.rotation.x -= (boss ? .3 : .18) * en; legs(.5 * en, .45 * en, u * 14);
          if (B.jaw) B.jaw.rotation.x = .1 + .35 * Math.abs(Math.sin(u * 13)) * en;
          for (let i = 0; i < 3; i++) B['tail' + i].rotation.y += Math.sin(u * 16 - i * .7) * .32 * en;
          break;
        }
        case 'fox': case 'rockfox': {   // play-bow wiggles, tail up and wagging like mad
          const bow = en * (.5 + .5 * Math.sin(u * 9));
          body.rotation.x += .28 * bow; legs(.55 * bow, 0, 0); B.tail0.rotation.x -= .5 * en;
          for (let i = 0; i < 3; i++) B['tail' + i].rotation.y += Math.sin(u * 22 - i * .5) * .45 * en;
          head.rotation.z += Math.sin(u * 7) * .2 * en; s.mouthW = 1;
          break;
        }
        case 'boar': case 'piglet': {   // a waggly bottom shake, snout up, trotting on the spot
          body.rotation.y += Math.sin(u * 22) * .22 * en; body.rotation.z += Math.sin(u * 22) * .08 * en;
          B.tail0.rotation.y += Math.sin(u * 30) * .7 * en; head.rotation.x -= .25 * en;
          for (const n of LEGS4) B[n].rotation.x += Math.sin(u * 11 + (n === 'legFL' || n === 'legBR' ? 0 : PI)) * .35 * en;
          break;
        }
        case 'bear': case 'bearboss': {   // up on its hind legs, wobbles its round belly, pats it with both paws
          body.rotation.x -= .55 * en; body.position.y += .1 * U * en;
          body.scale.x *= 1 + Math.sin(u * 24) * .06 * en; body.rotation.z += Math.sin(u * 12) * .1 * en;
          legs(1.0 * en, .3 * en, u * 12); B.legFL.rotation.z -= .3 * en; B.legFR.rotation.z += .3 * en;
          head.rotation.z += Math.sin(u * 6) * .15 * en;
          if (B.cap) B.cap.rotation.z += Math.sin(u * 12 - 1) * .3 * en;
          break;
        }
        case 'turtle': {   // head-bob dance, waving both front flippers
          head.position.z += Math.sin(u * 16) * .06 * U * en; head.rotation.x += Math.sin(u * 16) * .15 * en;
          legs(.6 * en, .3 * en, u * 12); body.rotation.z += Math.sin(u * 8) * .08 * en;
          break;
        }
        case 'waterturtle': {   // a full spin on its shell
          body.rotation.y += TAU * smooth(u / .5) * en; for (const n of LEGS4) B[n].rotation.z += (n[4] === 'L' ? .5 : -.5) * en;
          head.rotation.x -= .2 * en;
          break;
        }
        case 'frog': case 'lilyfrog': case 'frogboss': {   // throat-balloon croaks, clapping front feet, kicking back legs
          if (B.throat) B.throat.scale.multiplyScalar(1 + .9 * Math.abs(Math.sin(u * 5)) * en);
          head.scale.x *= 1 + .08 * Math.abs(Math.sin(u * 14)) * en;
          B.legFL.rotation.z -= (.2 + .3 * Math.sin(u * 14)) * en; B.legFR.rotation.z += (.2 + .3 * Math.sin(u * 14)) * en;
          B.legBL.rotation.x += .6 * Math.abs(Math.sin(u * 7)) * en; B.legBR.rotation.x += .6 * Math.abs(Math.sin(u * 7 + 1)) * en;
          break;
        }
        case 'squirrel': case 'soldier': case 'raccoon': case 'gang': {   // sits up and claps, tail swishing an S
          body.rotation.x -= .35 * en; legs(.9 * en, 0, 0);
          const c = (.25 + .25 * Math.sin(u * 16)) * en; B.legFL.rotation.z -= c; B.legFR.rotation.z += c;
          for (let i = 0; i < 3; i++) if (B['tail' + i]) B['tail' + i].rotation.x += Math.sin(u * 10 - i * .8) * .35 * en;
          head.rotation.z += Math.sin(u * 8) * .15 * en;
          break;
        }
        case 'duck': {   // flaps madly and spins round, quack-quack
          B.wingL.rotation.z += (.8 + Math.sin(u * 28) * .6) * en; B.wingR.rotation.z -= (.8 + Math.sin(u * 28) * .6) * en;
          body.rotation.y += TAU * smooth(u / .55); if (B.jaw) B.jaw.rotation.x = .3 * Math.abs(Math.sin(u * 16)) * en;
          head.rotation.x -= .2 * en;
          break;
        }
        case 'owlet': case 'owlboss': {   // turns its head all the way round, wings open and flapping
          head.rotation.y += TAU * smooth(boss ? (u - .2) / 1.2 : u / .55);
          const fl = boss ? .9 + Math.sin(u * 14) * .5 : .8 + Math.sin(u * 24) * .5;
          B.wingL.rotation.z += fl * en; B.wingR.rotation.z -= fl * en;
          if (boss) body.rotation.z += Math.sin(u * 6) * .08 * en;
          break;
        }
        case 'bat': {   // a loop-the-loop
          body.rotation.x -= TAU * smooth(u / .55); B.wingL.rotation.z += .6 * en; B.wingR.rotation.z -= .6 * en;
          break;
        }
        case 'hedgehog': {   // curls into a ball and bounces like one
          for (const n of LEGS4) B[n].scale.setScalar(1 - .75 * en);
          head.rotation.x += .95 * en; head.position.z -= .1 * U * en; body.rotation.x -= TAU * 2 * smooth(u / .6);
          body.position.y += Math.abs(Math.sin(u * 11)) * .22 * U * en;
          break;
        }
        case 'goat': case 'goatboss': {   // pronks: stiff-legged springy bounces, head tossing, tail a blur
          const hp = Math.abs(Math.sin(u * 9));
          body.position.y += hp * .16 * U * en;
          B.legFL.rotation.x -= .3 * hp * en; B.legFR.rotation.x -= .3 * hp * en; B.legBL.rotation.x += .3 * hp * en; B.legBR.rotation.x += .3 * hp * en;
          head.rotation.z += Math.sin(u * 9) * .25 * en; B.tail0.rotation.x -= (.8 + Math.sin(u * 30) * .3) * en;
          break;
        }
        case 'beaver': case 'beaverboss': {   // drums its tail on the ground like a drum and its belly with both paws
          const beat = Math.abs(Math.sin(u * 14));
          B.tail0.rotation.x += .9 * beat * en; if (B.tail1) B.tail1.rotation.x += .3 * beat * en;
          B.armL.rotation.x -= (.9 + .4 * Math.sin(u * 14)) * en; B.armR.rotation.x -= (.9 + .4 * Math.sin(u * 14 + PI)) * en;
          B.armL.rotation.z -= .3 * en; B.armR.rotation.z += .3 * en;
          sy *= 1 - .04 * beat * en; head.rotation.x -= .1 * en;
          if (boss && u > 1.2) { const w = smooth((u - 1.2) / .3); B.armR.rotation.x -= 1.6 * w; B.armR.rotation.z -= (.3 + Math.sin(u * 9) * .35) * w; }
          if (once(s, 'dk', beat > .95 && boss)) fxAt(m, 'bubbles', .1, { count: 3, color: '#bfe6ff' });
          break;
        }
        case 'firefly': s.swarm = Math.max(s.swarm || 0, 1 + Math.sin(u * 8) * .3); break;
        case 'mud': sy *= 1 + Math.sin(u * 16) * .12 * en; body.scale.x *= 1 - Math.sin(u * 16) * .08 * en; break;
      }
      return sy;
    }

    // ── The bosses' fun moments (phases from bossAI below; times in FB) and the big crocodile's juggling act. ──
    function bossFun(m, dt, st, s, sp, U) {
      const B = m.B, body = B.body, head = B.head, ph = st.phase, t = s.pT || 0;
      let sy = 1;
      if (sp === 'croc') {   // Koca Timsah: juggles three spat bubble-balls (while calling the little ones, and now and then at rest)… achoo!
        let jt = -1, J = 0;
        if (ph === 'summon') { jt = t; J = 2.2; }
        else if (ph === 'idle' && st.aggro !== false && t > 1.5) { const c = (t - 1.5) % 8; if (c < 3.4) { jt = c; J = 3.4; } }
        if (jt >= 0) {
          const k = smooth(jt / .3) * (1 - smooth((jt - J + .15) / .15)), sneeze = J - .75;
          const ah = bell(clamp01((jt - sneeze + .55) / .55)), choo = jt > sneeze ? Math.exp(-(jt - sneeze) * 6) : 0;
          for (let i = 0; i < 3; i++) {
            const q = (jt * 1.5 + i / 3) % 1, fly = jt > sneeze ? (jt - sneeze) * 2.4 : 0;
            holdAt(m, 'jb' + i, [Math.cos(q * TAU) * .28 + (i - 1) * fly, Math.abs(Math.sin(q * PI)) * .42 - .15 + fly * .5, fly * 1.1], Math.max(HIDE, k * (1 - clamp01(fly / 1.4))), [q * 6, 0, 0]);
          }
          head.rotation.x -= .32 * k * (1 - choo) - .45 * choo; head.position.z += .08 * U * choo;
          B.legFL.rotation.x -= (.55 + .35 * Math.sin(jt * 9.4)) * k; B.legFR.rotation.x -= (.55 + .35 * Math.sin(jt * 9.4 + PI)) * k; body.rotation.x -= .12 * k;
          s.eyeK = Math.min(s.eyeK, 1 - .75 * ah); if (B.jaw) B.jaw.rotation.x = Math.max(B.jaw.rotation.x, .45 * ah + .25 * choo);
          s.mouthW = Math.max(s.mouthW, k * (1 - ah));
          if (once(s, 'achoo', jt > sneeze)) { fxAt(m, 'bubbles', 2.2, { count: 14, color: '#d8f1ff' }); snd(m, 'pop', .7, .6); }
          if (once(s, 'jbk', jt > .3 && (jt * 1.5) % 1 < .1)) snd(m, 'bounce', .25, 1.6);
        }
        return sy;
      }
      if (sp === 'beaverboss' && (ph === 'dam' || ph === 'dambreak')) {
        const K = FB.kunduz;
        if (ph === 'dam') {   // stacks three logs into a little dam in front of himself and pats it proudly
          for (let i = 0; i < 3; i++) {
            const t0 = .25 + i * .55, k = smooth((t - t0) / .3);
            holdAt(m, 'dl' + i, [0, (1 - k) * .9, 0], t > t0 ? 1 : HIDE, [0, 0, (1 - k) * .4]);
          }
          const pl = t < 1.9 ? bell(((t - .1) % .55) / .55) : 0, built = smooth((t - K.damBuild) / .3);
          B.armL.rotation.x -= 1.5 * pl + .9 * built * Math.abs(Math.sin(t * 7)); B.armR.rotation.x -= 1.5 * pl + .5 * built;
          body.rotation.x += .25 * pl - .12 * built; head.rotation.x -= .15 * built; s.mouthW = Math.max(s.mouthW, built);
          B.tail0.rotation.x += Math.abs(Math.sin(t * 6)) * .5 * built;
        } else {   // Feza knocked it down: logs tumble away, he sits dizzy with stars
          const e = t;
          for (let i = 0; i < 3; i++) {
            const a = (i - 1) * 1.1 + .2, d = smooth(e / .7) * (1.2 + i * .2), up = Math.sin(clamp01(e / .7) * PI) * .6;
            holdAt(m, 'dl' + i, [Math.sin(a) * d, up - i * .2 * smooth(e / .7), Math.cos(a) * d * .6], Math.max(HIDE, 1 - smooth((e - K.damBreak + .5) / .4)), [e * 5 * (i - 1), e * 2, 0]);
          }
          const dz = smooth(e / .3) * (1 - smooth((e - K.damBreak + .3) / .3));
          s.dizzy = Math.max(s.dizzy, dz); body.rotation.z += Math.sin(e * 5) * .12 * dz; body.position.y -= .06 * U * dz; sy *= 1 - .06 * dz;
          B.armL.rotation.z += .5 * dz; B.armR.rotation.z -= .5 * dz; head.rotation.z -= Math.sin(e * 5) * .15 * dz;
        }
        return sy;
      }
      if (sp === 'frogboss' && ph === 'plop') {   // a giant hop… belly-flop splash! sits soaked, shakes off like a puppy, sneezes
        const K = FB.kocakurbaga, land = K.plopUp + K.plopAir;
        const crouch = ramp(t, 0, K.plopUp) * (1 - ramp(t, K.plopUp, K.plopUp + .1));
        sy *= 1 - .24 * crouch; s.eyeK = Math.max(s.eyeK, 1 + .25 * crouch);
        const flat = ramp(t, land, land + .15) * (1 - ramp(t, K.plopD - .7, K.plopD - .2));
        sy *= 1 - .16 * flat; body.scale.x *= 1 + .1 * flat; s.eyeK = Math.min(s.eyeK, 1 - .45 * flat); head.rotation.z += .14 * flat; head.rotation.x += .12 * flat;
        for (const n of LEGS4) B[n].rotation.z += (n[4] === 'L' ? .5 : -.5) * flat;
        const sh = bell(clamp01((t - land - 1.0) / 1.0));
        body.rotation.y += Math.sin(t * 36) * .28 * sh; head.rotation.y += Math.sin(t * 36 + 1) * .32 * sh;
        const choo = t > K.plopD - .55 ? Math.exp(-(t - K.plopD + .55) * 7) : 0, ah = bell(clamp01((t - K.plopD + 1.0) / .45));
        s.mouthO = Math.max(s.mouthO, ah); head.rotation.x -= .3 * ah - .4 * choo; B.throat.scale.multiplyScalar(1 + .6 * ah);
        if (once(s, 'shk', sh > .2)) fxAt(m, 'bubbles', 1.0, { count: 16, color: '#bfe6ff' });
        return sy;
      }
      if (sp === 'bearboss' && (ph === 'honey' || ph === 'wake')) {
        if (ph === 'honey') {   // he spots a honey pot and simply cannot resist: sits, scoops with his paw, licks, blissful
          const K = FB.uykucuayi, k = smooth(t / .4) * (1 - smooth((t - K.honeyD + .4) / .4));
          B.honey.scale.setScalar(Math.max(HIDE, smooth(t / .3) * (1 - smooth((t - K.honeyD + .2) / .2))));
          body.rotation.x -= .5 * k; body.position.y -= .04 * U * k;
          const lick = Math.max(0, Math.sin(t * 3.4));
          B.legFR.rotation.x -= (1.2 + .5 * lick) * k; B.legFR.rotation.z += .35 * k; B.legFL.rotation.x -= .55 * k;
          head.rotation.x += (.12 * lick - .1) * k; head.rotation.y -= .25 * lick * k;
          s.eyeK = Math.min(s.eyeK, 1 - .85 * k); s.mouthW = Math.max(s.mouthW, k);
          body.scale.x *= 1 + Math.sin(t * 10) * .02 * k; if (B.cap) B.cap.rotation.z += Math.sin(t * 3.4) * .2 * k;
        } else {   // woken by a bonk mid-snooze: leaps up, eyes like saucers, stars spinning
          const K = FB.uykucuayi, j = bell(clamp01(t / .5));
          body.position.y += .22 * U * j; sy *= 1 + .1 * j; s.eyeK = Math.max(s.eyeK, 1.45 - .3 * clamp01(t / K.wakeD));
          s.mouthO = Math.max(s.mouthO, 1 - clamp01(t / .6)); s.dizzy = Math.max(s.dizzy, 1 - smooth((t - K.wakeD + .3) / .3));
          B.legFL.rotation.x -= .8 * j; B.legFR.rotation.x -= .8 * j; if (B.cap) B.cap.rotation.x += .45 * j;
        }
        return sy;
      }
      if (sp === 'goatboss' && ph === 'stuck') {   // his horns got stuck in a rock: kicks and wiggles, pops free and tumbles back
        const K = FB.dagkecisi, D = K.stuckD, k = smooth(t / .2) * (1 - smooth((t - D + .7) / .12));
        holdAt(m, 'rock0', [0, -.08, .82], Math.max(HIDE, 1.7 * (1 - smooth((t - D + .7) / .5))));
        head.rotation.x += .85 * k; body.rotation.x += .3 * k; body.position.y -= .05 * U * k;
        B.legBL.rotation.x += (.6 + Math.sin(t * 20) * .55) * k; B.legBR.rotation.x += (.6 + Math.sin(t * 20 + PI) * .55) * k;
        body.rotation.z += Math.sin(t * 15) * .1 * k; B.tail0.rotation.x -= (.6 + Math.sin(t * 40) * .4) * k;
        const pop = t > D - .7 ? Math.exp(-(t - D + .7) * 5) * Math.sin((t - D + .7) * 13) : 0;
        body.rotation.x -= .45 * Math.max(0, pop); sy *= 1 + .1 * pop;
        s.dizzy = Math.max(s.dizzy, smooth((t - D + .65) / .1) * (1 - smooth((t - D + .15) / .15)));
        return sy;
      }
      if (sp === 'owlboss' && ph === 'specs') {   // "huu-huu", head right round… the spectacles slip off his beak; squinting, he gropes for them
        const K = FB.baykus, D = K.specsD;
        head.rotation.y += TAU * smooth(t / 1.0);
        const slip = smooth((t - 1.0) / .35) * (1 - smooth((t - D + .9) / .4));
        if (B.specs) { B.specs.position.y -= .15 * U * slip; B.specs.position.z += .04 * U * slip; B.specs.rotation.z = .5 * slip; B.specs.rotation.x = .3 * slip; }
        const look = smooth((t - 1.3) / .3) * (1 - smooth((t - D + .9) / .3));
        s.eyeK = Math.min(s.eyeK, 1 - .55 * look); head.rotation.y += Math.sin((t - 1.3) * 2.6) * .5 * look; body.rotation.x += .2 * look; head.rotation.x += .2 * look;
        const grope = look * Math.abs(Math.sin(t * 5));
        B.wingL.rotation.z += .9 * grope; B.wingR.rotation.z -= .9 * Math.abs(Math.sin(t * 5 + 1.3)) * look; B.wingL.rotation.x -= .5 * look; B.wingR.rotation.x -= .5 * look;
        const push = bell(clamp01((t - D + 1.0) / .7)); B.wingR.rotation.z -= 1.4 * push; B.wingR.rotation.x -= .8 * push;
        s.eyeK = Math.max(s.eyeK, 1 + .3 * smooth((t - D + .4) / .2));
        return sy;
      }
      return sy;
    }
    // ── Ateşböceği Sürüsü: five little fireflies orbit the lead one; they spread out in the gags / dance and huddle in to strike ──
    function animFirefly(m, dt, st, s) {
      cheer(m, st, s);
      const B = m.B, body = B.body, head = B.head, mv = clamp01(s.mv), wind = st.windup >= 0 ? smooth(st.windup) : 0, attack = st.attack >= 0 ? st.attack : -1;
      s.walk += dt * 6 * (.3 + mv);
      body.position.y += Math.sin(s.t * 2.6 + s.ph) * .05; body.rotation.x += mv * .15; body.rotation.z += Math.sin(s.t * 1.7) * .06;
      const spread = (s.swarm || 0) - .28 * wind;
      s.swarm = damp(s.swarm || 0, 0, 3, dt);
      for (let i = 0; i < 5; i++) {
        const f = B['f' + i], b = i * TAU / 5, th = s.t * (1.1 + .25 * (i & 1)) * (i % 3 ? 1 : -1) + (wind * 4);
        f.rotation.y = th; const a = b + th, ex = spread * (.45 + .1 * Math.sin(s.t * 3 + i));
        f.position.x += Math.sin(a) * ex; f.position.z += Math.cos(a) * ex; f.position.y += Math.sin(s.t * 3.3 + i * 1.7) * .08;
        f.rotation.z = Math.sin(s.t * 20 + i) * .12;
      }
      head.rotation.z += Math.sin(s.t * 18) * .04; head.position.y += Math.sin(s.t * 4.1) * .03;
      if (attack >= 0 && attack < 1) { const k = bell(Math.min(1, attack * 1.6)); body.position.z += .35 * k; head.position.z += .15 * k; }
      if (st.dying >= 0) s.mouthW = 1;
    }
    // ── Balçık Topu: a jelly that bounces along, flattens to spring, wobbles after every landing ──
    function animMud(m, dt, st, s) {
      cheer(m, st, s);
      const B = m.B, body = B.body, head = B.head, mv = clamp01(s.mv), wind = st.windup >= 0 ? smooth(st.windup) : 0;
      s.walk += dt * 7 * (.3 + mv);
      const w = Math.abs(Math.sin(s.walk));
      body.position.y += w * .1 * mv;
      body.scale.y *= 1 + (.08 * w - .07 * (1 - w)) * mv; body.scale.x *= 1 - .04 * w * mv + .05 * (1 - w) * mv;
      body.rotation.x += mv * .1; head.rotation.z += Math.sin(s.t * 1.9 + s.ph) * .05;
      body.scale.y *= 1 - .25 * wind; body.scale.x *= 1 + .15 * wind; body.scale.z *= 1 + .15 * wind;
      s.eyeK = Math.max(s.eyeK, 1 + .2 * wind);
      if (B.puddle) B.puddle.scale.setScalar(st.air > 0 && st.air < 1 ? HIDE : 1 + .1 * Math.sin(s.t * 2));
      if (st.dying >= 0) s.mouthW = 1;
    }
    const withLife = fn => function (m, dt, st, s) { fn(m, dt, st, s); life(m, dt, st, s); };
    function stats(ad, hp, dmg, speed, r, height, kind, extra) {
      return Object.assign({ ad, hp, dmg, speed, r, height, xp: Math.round(hp * .55), gold: 3, kind, atkRange: 1.4, atkCd: 2.1, windup: .9, fly: false, aggro: 8.5 }, extra || {});
    }
    const pack = {
      ormantimsah: { build: (r, o) => croc(r, o, false), anim: animate, lod: .56, stats: stats('Huysuz Timsah', 40, 5, 2.05, .64, .91, 'melee', { atkRange: 1.6, atkCd: 2.3, windup: .95 }) },
    };
    pack.ormantilki = { build: (r, o) => furry(r, o, 'fox'), anim: animate, lod: .64, stats: stats('Somurtkan Tilki', 32, 5, 2.8, .48, 1.18, 'melee', { atkCd: 2.0 }) };
    pack.ormandomuz = { build: (r, o) => furry(r, o, 'boar'), anim: animate, lod: .64, stats: stats('Homurdanan Yaban Domuzu', 54, 6, 2.5, .61, 1.05, 'glide', { atkRange: 2.5, atkCd: 2.8, windup: 1.1, trail: 'dust' }) };
    pack.ormanayi = { build: (r, o) => furry(r, o, 'bear'), anim: animate, lod: .68, stats: stats('Huysuz Bal Ayısı', 72, 7, 1.5, .70, 1.21, 'slam', { atkRange: 2.0, atkCd: 3.0, windup: 1.2, slamR: 2.0 }) };
    pack.ormankaplumbaga = { build: turtle, anim: animate, lod: .67, stats: stats('Somurtkan Orman Kaplumbağası', 55, 5, 1.3, .65, .87, 'melee', { atkCd: 2.6, windup: 1.0 }) };
    pack.ormankurbaga = { build: frog, anim: animate, lod: .67, stats: stats('Huysuz Su Kurbağası', 30, 5, 2.2, .54, .83, 'hop', { atkRange: 2.8, atkCd: 2.4, windup: .95 }) };
    pack.ormansincap = { build: squirrel, anim: animate, lod: .63, stats: stats('Homurdanan Sincap', 29, 4, 2.5, .43, 1.46, 'ranged', { atkRange: 6, range: 6, atkCd: 2.6, shot: { kind: 'rock', speed: 4.1, r: .22 } }) };
    pack.ormanrakun = { build: (r, o) => furry(r, o, 'raccoon'), anim: animate, lod: .64, stats: stats('Huysuz Rakun', 35, 4, 2.1, .51, 1.0, 'ranged', { atkRange: 5.5, range: 5.5, atkCd: 2.8, shot: { kind: 'bubble', speed: 3.7, r: .26 } }) };
    pack.buyuktimsah = { build: (r, o) => croc(r, o, true), anim: animate, lod: .76, stats: stats('Koca Huysuz Timsah', 950, 9, 1.7, 1.50, 2.87, 'boss', {
      xp: 480, gold: 85, atkRange: 3.2, atkCd: 2.2, windup: 1.2, aggro: 14, shot: { kind: 'bubble', speed: 4.2, r: .42 },
      lines: { giris: 'orman_timsah_giris', bitti: 'orman_timsah_bitti' },
      phases: ['idle', 'move', 'roar', 'bite', 'sweep', 'charge', 'bubbles', 'summon', 'stomp'],
      summon: { type: 'ormantimsah', n: 2, at: [.60, .30] }, slamR: 3.6, chargeSpeed: 5.5,
      cone: { angle: 2.3, len: 2.0 }, chargeAt: [.35, .82], sweepAt: .54,
    }) };
    // ── 6 bölüm genişlemesi: yeni türler (zorluk BOLGE'nin bölge çarpanlarıyla artar; burada 1. bölüm ölçeği) ──
    const FA = 'forest animal';
    pack.ordek = { build: duck, anim: animBird, lod: .62, stats: stats('Huysuz Ördek', 30, 5, 2.4, .48, 1.0, 'glide', { atkRange: 2.4, atkCd: 2.4, windup: .95 }) };
    pack.sukaplumbagasi = { build: (r, o) => turtle(r, o, true), anim: animQuad, lod: .6, stats: stats('Somurtkan Su Kaplumbağası', 44, 5, 1.6, .58, .70, 'roll', { atkRange: 2.4, atkCd: 2.6, windup: 1.0 }) };
    pack.domuzyavrusu = { build: (r, o) => furry(r, o, 'piglet'), anim: animQuad, lod: .6, stats: stats('Yaban Domuzu Yavrusu', 34, 5, 2.6, .46, .78, 'glide', { atkRange: 2.4, atkCd: 2.6, windup: 1.0, trail: 'dust' }) };
    pack.keciyavrusu = { build: (r, o) => goat(r, o, false), anim: animQuad, lod: .6, stats: stats('Dağ Keçisi Yavrusu', 36, 5, 2.5, .48, .96, 'hop', { atkRange: 2.6, atkCd: 2.4, windup: .95 }) };
    pack.kayaliktilki = { build: (r, o) => furry(r, o, 'rockfox'), anim: animQuad, lod: .62, stats: stats('Kayalık Tilkisi', 32, 5, 2.4, .48, 1.18, 'ranged', { atkRange: 6, range: 6, atkCd: 2.8, windup: 1.0, shot: { kind: 'rock', speed: 4.0, r: .22 } }) };
    pack.baykusyavrusu = { build: (r, o) => owl(r, o, false), anim: animBird, lod: .6, stats: stats('Baykuş Yavrusu', 26, 5, 2.4, .44, .78, 'melee', { atkRange: 1.1, atkCd: 2.2, windup: .9, fly: true, hover: .55 }) };
    pack.kirpi = { build: hedgehog, anim: animQuad, lod: .55, stats: stats('Huysuz Kirpi', 38, 5, 2.0, .46, .82, 'roll', { atkRange: 2.4, atkCd: 2.6, windup: 1.0 }) };
    pack.ormanyarasa = { build: bat, anim: animBird, lod: .6, stats: stats('Sevimli Yarasa', 22, 4, 3.0, .42, .95, 'melee', { atkRange: 1.0, atkCd: 2.0, windup: .85, fly: true, hover: .75 }) };
    pack.kunduzyavrusu = { build: (r, o) => beaver(r, o, false), anim: animBeaver, lod: .6, stats: stats('Kunduz Yavrusu', 28, 4, 2.2, .44, .91, 'melee', { atkRange: 1.2, atkCd: 2.3, windup: .9 }) };
    // ── Beş bölüm canavarı (kind 'boss'; can GAME'de Feza'nın gücüne göre: BOSS_KITS.cfg). Hamle zamanları FB'de, model ile aynı. ──
    const bossStats = (ad, hp, dmg, speed, rr, height, extra) => stats(ad, hp, dmg, speed, rr, height, 'boss', Object.assign({ xp: Math.round(hp * .3), gold: 50, atkRange: 3, atkCd: 2.2, windup: 1.2, aggro: 13 }, extra));
    pack.kunduz = { build: (r, o) => beaver(r, o, true), anim: animBeaver, lod: .78, stats: bossStats('Huysuz Kunduz', 700, 7, 1.6, 1.25, 2.84, {
      lines: BOSS_KITS.kunduz.lines, phases: ['idle', 'move', 'roar', 'summon', 'throw', 'slap', 'wave', 'chew', 'dam', 'dambreak'], summon: { type: 'kunduzyavrusu', n: 2, at: [.6, .3] }, slamR: FB.kunduz.slapR }) };
    pack.kocakurbaga = { build: (r, o) => frog(r, o, true), anim: animQuad, lod: .78, stats: bossStats('Koca Kurbağa', 800, 8, 1.7, 1.35, 2.47, {
      lines: BOSS_KITS.kocakurbaga.lines, phases: ['idle', 'move', 'roar', 'summon', 'tongue', 'hop', 'croak', 'plop'], summon: { type: 'ormankurbaga', n: 2, at: [.6, .3] }, slamR: FB.kocakurbaga.hopR }) };
    pack.uykucuayi = { build: (r, o) => furry(r, o, 'bear', true), anim: animQuad, lod: .76, stats: bossStats('Uykucu Ayı', 900, 9, 1.4, 1.45, 2.6, {
      lines: BOSS_KITS.uykucuayi.lines, phases: ['idle', 'move', 'roar', 'summon', 'slam', 'hives', 'yawn', 'nap', 'honey', 'wake'], summon: { type: 'domuzyavrusu', n: 2, at: [.6, .3] }, slamR: FB.uykucuayi.slamR }) };
    pack.dagkecisi = { build: (r, o) => goat(r, o, true), anim: animQuad, lod: .76, stats: bossStats('Huysuz Dağ Keçisi', 1000, 10, 1.9, 1.3, 2.63, {
      lines: BOSS_KITS.dagkecisi.lines, phases: ['idle', 'move', 'roar', 'summon', 'charge', 'rocks', 'leap', 'stuck'], summon: { type: 'keciyavrusu', n: 2, at: [.6, .3] }, slamR: FB.dagkecisi.leapR, chargeSpeed: FB.dagkecisi.chargeSpeed }) };
    pack.baykus = { build: (r, o) => owl(r, o, true), anim: animBird, lod: .78, stats: bossStats('Huysuz Baykuş', 1100, 11, 1.7, 1.15, 2.53, {
      lines: BOSS_KITS.baykus.lines, phases: ['idle', 'move', 'roar', 'summon', 'gust', 'feathers', 'fly', 'specs'], summon: { type: 'baykusyavrusu', n: 2, at: [.6, .3] }, slamR: FB.baykus.landR }) };
    // ── ANIM: dört yeni eğlenceli tür (bölge önerileri BOLUMLER.md Notlar "ANIM: yeni türler") ──
    pack.rakuncete = { build: (r, o) => furry(r, o, 'raccoon', false, { gang: true }), anim: animate, lod: .58, stats: stats('Maskeli Rakun Çetesi', 26, 4, 2.6, .48, .95, 'melee', { atkRange: 1.2, atkCd: 2.2, windup: .85 }) };
    pack.nilufer = { build: (r, o) => frog(r, o, false, { lily: true }), anim: animate, lod: .6, stats: stats('Nilüfer Kurbağası', 30, 5, 2.3, .6, .8, 'glide', { atkRange: 2.4, atkCd: 2.6, windup: 1.0, trail: 'dust' }) };
    pack.palamutasker = { build: (r, o) => squirrel(r, o, { soldier: true }), anim: animate, lod: .58, stats: stats('Palamut Askeri', 28, 4, 2.3, .42, 1.24, 'melee', { atkRange: 1.2, atkCd: 2.2, windup: .9 }) };
    pack.atesbocegi = { build: fireflies, anim: animFirefly, lod: .55, stats: stats('Ateşböceği Sürüsü', 22, 4, 2.6, .5, .95, 'melee', { atkRange: 1.1, atkCd: 2.2, windup: .9, fly: true, hover: .6 }) };
    pack.balcik = { build: mudball, anim: animMud, lod: .6, stats: stats('Balçık Topu', 36, 5, 2.0, .55, .8, 'hop', { atkRange: 2.6, atkCd: 2.5, windup: 1.0 }) };
    for (const k in pack) pack[k].anim = withLife(pack[k].anim);
    return pack;
  });
  // ════════ Bölüm canavarlarının davranışı (GAME bağlar: Object.assign(BOSS_AI, FOREST_ANIMALS.bossAI(api))) ════════
  // Timsahtaki kurallar: her hasarlı hamle sabit bir alanı en az ~2 sn önceden yerde gösterir, bırakışta Feza'yı izlemez,
  // ardından uzun bir dinlenme (Feza'nın sırası). Mermiler canavarın kendi kemikleri (st.fo) ya da tüyler (spawnProjectile obj).
  let FEATHER = null;
  function featherObj() {   // the owl's soft feather shot: shared geometry and material, never disposed
    if (!FEATHER) {
      const vane = new THREE.SphereGeometry(1, 14, 8), tip = new THREE.SphereGeometry(1, 10, 6), quill = new THREE.CylinderGeometry(.014, .02, .7, 6);
      quill.rotateX(PI / 2);
      for (const g of [vane, tip, quill]) g.userData.keep = true;
      const m = (c, e) => new THREE.MeshStandardMaterial({ color: c, roughness: .75, emissive: c, emissiveIntensity: e });
      FEATHER = { vane, tip, quill, mv: m('#f6ead2', .35), mt: m('#9c7aa8', .25), mq: m('#b48a5e', .1) };
    }
    const g = new THREE.Group(), F = FEATHER;
    const v = new THREE.Mesh(F.vane, F.mv); v.scale.set(.13, .03, .33);
    const t = new THREE.Mesh(F.tip, F.mt); t.scale.set(.1, .028, .12); t.position.z = .23;
    const q = new THREE.Mesh(F.quill, F.mq); q.position.z = -.05;
    g.add(v, t, q); g.scale.setScalar(1.35); g.name = 'fezaFeather';
    return g;
  }
  function bossAI(A) {
    A = A || {};
    bossAI.api = A;   // (test runs: FOREST_ANIMALS.bossAI.api)
    const P = A.P, T = A.T || {}, nop = () => null;
    const fx = A.fx || nop, burst = A.burst || nop, sfx = A.sfx || nop, shake = A.shake || nop, remove = A.remove || nop;
    const { bossPhase, bossIdle, bossEnd, pickPhase, hurtPlayer } = A;
    if (!P || !bossPhase || !bossIdle || !bossEnd || !pickPhase || !hurtPlayer) { console.warn('FOREST_ANIMALS.bossAI: eksik api'); return {}; }
    const HR = () => T.heroR || .45;
    const room = () => (A.bossRoom ? A.bossRoom() : null);
    const lane = (x, z, dx, dz, maxL, rad) => (A.laneLen ? A.laneLen(x, z, dx, dz, maxL, rad, room()) : maxL);
    const floorOk = (x, z) => (A.isFloor ? A.isFloor(x, z) : true);
    const teleLine = (x0, z0, x1, z1, w, dur, c) => (A.telegraphLine ? A.telegraphLine(x0, z0, x1, z1, w, dur, c) : fx('telegraphLine', x0, z0, x1, z1, w, dur, c));
    const circle = (x, z, R, dur, c) => fx('telegraph', x, z, R, dur, c);
    const roar = (b, D) => (A.bossRoar ? A.bossRoar(b, D) : b.stT >= D && end(b, .5, .9));
    const summon = (b, D) => (A.bossSummon ? A.bossSummon(b, D) : end(b, .7, 1.1));
    const walk = (b, dx, dz, sp, dt) => (A.bossWalk ? A.bossWalk(b, dx, dz, sp, dt) : (b.x += dx * sp * dt, b.z += dz * sp * dt, sp * dt));
    const pdist = (x, z) => Math.hypot(P.pos.x - x, P.pos.z - z);
    // (ANIM) the narrator's line for a fun moment — only once SES has recorded it (unknown lines stay silent)
    const sayFun = id => { try { if (typeof AUD !== 'undefined' && AUD && AUD.LINES && AUD.LINES[id] && AUD.say) AUD.say(id, { prio: 1 }); } catch (err) { /* optional */ } };
    function clearTeles(b) { if (b.teles) for (const t of b.teles) remove(t); b.teles = null; }
    function end(b, w0, w1) { clearTeles(b); b.st.fo = null; b.st.tl = 0; b.st.air = 0; bossEnd(b, w0, w1); }
    function ring(b, x, z, R, k, kb, c) {
      fx('ring', x, z, { r0: .6, r1: R + .6, dur: .5, color: c, width: .55 });
      shake(.3 * Math.max(.3, Math.min(1, 1.4 - pdist(x, z) / 16)));
      if (pdist(x, z) < R + HR() * .5) { hurtPlayer(b.dmg * k, x, z, kb); return true; }
      return false;
    }
    function laneHit(x0, z0, dx, dz, along, halfLen, halfW) {
      const px = P.pos.x - x0, pz = P.pos.z - z0, f = px * dx + pz * dz, sd = Math.abs(-px * dz + pz * dx);
      return Math.abs(f - along) < halfLen + HR() * .5 && sd < halfW + HR() * .5;
    }
    function aimAtFeza(b, ux, uz) { b.face = Math.atan2(ux, uz); b.aim = b.face; b.rdx = ux; b.rdz = uz; }
    function fo(b, list) { list.ph = b.ph; b.st.fo = list; }
    // A landing spot next to Feza (he is inside the circle, never under the boss), inside the arena.
    function nearFeza(b, maxD) {
      if (A.bossSpot) {
        let dx = b.x - P.pos.x, dz = b.z - P.pos.z; const d = Math.hypot(dx, dz) || 1, gap = b.r + HR() + .3;
        return A.bossSpot(b, P.pos.x + dx / d * gap, P.pos.z + dz / d * gap, maxD);
      }
      const dx = P.pos.x - b.x, dz = P.pos.z - b.z, d = Math.hypot(dx, dz) || 1, want = Math.max(0, Math.min(maxD, d - b.r - HR() - .3));
      const l = lane(b.x, b.z, dx / d, dz / d, want, b.r * .75);
      return { x: b.x + dx / d * l, z: b.z + dz / d * l };
    }
    // A carried jump (frog hop, goat leap, owl flight): the boss moves from (x0, z0) to (x1, z1) over [t0, t1], height h.
    function carry(b, dt, t0, t1, h, fly) {
      const k = Math.max(0, Math.min(1, (b.stT - t0) / (t1 - t0))), s = k * k * (3 - 2 * k);
      const tx = b.hx0 + (b.hx1 - b.hx0) * s, tz = b.hz0 + (b.hz1 - b.hz0) * s;
      if (fly) { b.x = tx; b.z = tz; } else { const dx = tx - b.x, dz = tz - b.z, l = Math.hypot(dx, dz); if (l > 1e-3) walk(b, dx / l, dz / l, l / Math.max(dt, 1e-3), dt); }
      b.y = fly ? h * Math.min(1, Math.sin(Math.min(1, k * 1.25) * PI * .5) * 1.0) * (1 - Math.max(0, (k - .8) / .2)) : 4 * h * k * (1 - k);
      b.st.air = k > 0 && k < 1 ? k : 0;
      return k;
    }
    function rest(b, a = 1.25, c = 1.8) { end(b, a, c); }
    function idleCommon(b, dt, d, ux, uz, keep) {
      if (!bossIdle(b, dt, d, ux, uz, keep)) return false;
      if (b.summon) { bossPhase(b, 'summon', 1.8); return false; }
      b.nMoves = (b.nMoves || 0) + 1;
      return true;
    }

    // ── Huysuz Kunduz: kütük yuvarlar, kuyruğuyla şapırdatır, su dalgası yollar, arada dal kemirir ──
    function kunduzStep(b, dt, d, ux, uz) {
      const K = FB.kunduz, st = b.st, col = '#f3ba69';
      st.move = 0; st.air = 0;
      switch (b.ph) {
        case 'roar': roar(b, 1.6); break;
        case 'summon': summon(b, 1.8); break;
        case 'idle': {
          if (!idleCommon(b, dt, d, ux, uz, b.r + 3.0)) break;
          if (b.nMoves % K.every === 0) { bossPhase(b, 'chew', K.chewD); b.tick = 0; sfx('beaverGnaw', { x: b.x, z: b.z, vol: .7 }); break; }
          if (b.nMoves % 5 === 2) { aimAtFeza(b, ux, uz); bossPhase(b, 'dam', K.damBuild + K.damHold); b.hp0 = b.hp; b.tick = .25; sayFun('orman_kamp_baraj'); break; }   // (ANIM) fun: builds a little dam
          let ph = pickPhase(b, d < b.r + 3.2 ? [['slap', .5], ['throw', .2], ['wave', .3]] : [['throw', .5], ['wave', .4], ['slap', .1]]);
          aimAtFeza(b, ux, uz);
          if (ph === 'throw' || ph === 'wave') {
            const L = lane(b.x + ux * b.r * .6, b.z + uz * b.r * .6, ux, uz, ph === 'throw' ? K.throwLen : K.waveLen, .5);
            if (L < 2.5) ph = 'slap';
            else {
              b.lx = b.x + ux * b.r * .6; b.lz = b.z + uz * b.r * .6; b.len = L;
              const W = ph === 'throw' ? K.throwW : K.waveW, sp = ph === 'throw' ? K.logSpeed : K.waveSpeed;
              bossPhase(b, ph, K.warn + L / sp + .9); b.hit = false;
              b.tele = teleLine(b.lx, b.lz, b.lx + ux * L, b.lz + uz * L, W, K.warn, col);
              sfx(ph === 'throw' ? 'whoosh' : 'splash', { x: b.x, z: b.z, vol: .4, pitch: .8 });
            }
          }
          if (ph === 'slap') { bossPhase(b, 'slap', K.warn + 1.2); b.tele = circle(b.x, b.z, K.slapR, K.warn, col); sfx('splash', { x: b.x, z: b.z, vol: .35, pitch: .7 }); }
          break;
        }
        case 'throw': case 'wave': {
          const thr = b.ph === 'throw', sp = thr ? K.logSpeed : K.waveSpeed, W = thr ? K.throwW : K.waveW;
          if (b.stT >= K.warn) {
            if (!b.did) {
              b.did = 1; remove(b.tele); b.tele = null;
              sfx(thr ? 'roll' : 'splash', { x: b.x, z: b.z, vol: .7, pitch: thr ? .8 : .9 }); if (!thr) sfx('beaverSlap', { x: b.x, z: b.z, vol: .8 });
              burst(thr ? 'dust' : 'bubbles', b.lx, .2, b.lz, { count: 10, color: thr ? '#c9a77a' : '#bfe6ff' });
            }
            const s = Math.min(b.len, (b.stT - K.warn) * sp), x = b.lx + b.rdx * s, z = b.lz + b.rdz * s, gone = (b.stT - K.warn) * sp - b.len;
            const k = gone > 0 ? Math.max(0, 1 - gone / (sp * .6)) : thr ? 1 : Math.min(1, .55 + s / 3);
            if (thr) fo(b, [{ b: 'log', x, y: K.logR, z, ry: b.aim, rx: s / K.logR, k }]);
            else fo(b, [{ b: 'wave', x, y: 0, z, ry: b.aim, k }]);
            if (!thr && Math.random() < .35) burst('bubbles', x, .3, z, { count: 3, color: '#d8f1ff' });
            if (!b.hit && gone <= 0 && laneHit(b.lx, b.lz, b.rdx, b.rdz, s, thr ? .45 : .55, W * .5)) { b.hit = true; hurtPlayer(b.dmg * (thr ? .7 : .6), x - b.rdx, z - b.rdz, thr ? 1.0 : 1.5); }
          }
          if (b.stT >= b.phD) rest(b, 1.3, 1.8);
          break;
        }
        case 'slap': {
          if (!b.did && b.stT >= K.warn) {
            b.did = 1; remove(b.tele); b.tele = null;
            ring(b, b.x, b.z, K.slapR, .75, 1.3, '#9fd6f2');
            burst('bubbles', b.x - Math.sin(b.face) * b.r, .2, b.z - Math.cos(b.face) * b.r, { count: 16, color: '#bfe6ff' });
            sfx('splash', { x: b.x, z: b.z, vol: .8 }); sfx('beaverSlap', { x: b.x, z: b.z, vol: .9 });
          }
          if (b.stT >= b.phD) rest(b, 1.2, 1.7);
          break;
        }
        case 'dam': {   // (ANIM) fun moment, harmless: stacks three logs into a dam and pats it proudly; one bonk from Feza knocks it down
          b.tick -= dt;
          if (b.tick <= 0 && b.stT < K.damBuild) { b.tick = .55; sfx('roll', { x: b.x, z: b.z, vol: .45, pitch: 1.3 }); burst('dust', b.x + Math.sin(b.face) * b.r, .1, b.z + Math.cos(b.face) * b.r, { count: 4, color: '#c9a77a' }); }
          if (b.stT > .5 && b.hp < b.hp0 - .5) {
            bossPhase(b, 'dambreak', K.damBreak);
            sfx('roll', { x: b.x, z: b.z, vol: .8, pitch: .7 }); sfx('bonk', { x: b.x, z: b.z, vol: .6 });
            const fx0 = b.x + Math.sin(b.face) * b.r, fz0 = b.z + Math.cos(b.face) * b.r;
            burst('crumbs', fx0, .6, fz0, { count: 14, color: '#c79b6a' }); burst('sparkle', b.x, b.height * .8, b.z, { count: 8, color: '#ffe08a' });
            break;
          }
          if (b.stT >= b.phD) end(b, .5, .9);
          break;
        }
        case 'dambreak': {   // logs tumble away, he sits dizzy (free hits)
          if (b.stT >= b.phD) end(b, .4, .8);
          break;
        }
        case 'chew': {   // free hits: he sits and gnaws his log, wood chips flying
          b.tick -= dt;
          if (b.tick <= 0 && b.stT > .4 && b.stT < K.chewD - .4) {
            b.tick = .35; const m = A.muzzle ? A.muzzle(b) : { x: b.x, y: 2, z: b.z };
            if (Math.random() < .4) sfx('beaverGnaw', { x: b.x, z: b.z, vol: .5 });
            burst('crumbs', m.x, m.y, m.z, { count: 4, color: '#c79b6a' });
          }
          if (b.stT >= b.phD) end(b, .5, .9);
          break;
        }
        default: end(b, .8, 1.2);
      }
    }

    // ── Koca Kurbağa: dilini uzatır, zıplayıp Feza'nın yanına konar, vıraklayarak halka yollar ──
    function kurbagaStep(b, dt, d, ux, uz) {
      const K = FB.kocakurbaga, st = b.st, col = '#f39ab6';
      st.move = 0; st.air = 0;
      switch (b.ph) {
        case 'roar': roar(b, 1.6); break;
        case 'summon': summon(b, 1.8); break;
        case 'idle': {
          if (!idleCommon(b, dt, d, ux, uz, b.r + 2.8)) break;
          if (b.nMoves % 5 === 2) { bossPhase(b, 'plop', K.plopD); b.hx0 = b.hx1 = b.x; b.hz0 = b.hz1 = b.z; b.up = 0; sayFun('orman_gol_cuptur'); sfx('frogCroak', { x: b.x, z: b.z, vol: .6, pitch: 1.2 }); break; }   // (ANIM) fun: a belly-flop
          let ph = pickPhase(b, d < b.r + 3.0 ? [['croak', .45], ['tongue', .3], ['hop', .25]] : [['tongue', .45], ['hop', .45], ['croak', .1]]);
          aimAtFeza(b, ux, uz);
          if (ph === 'tongue') {
            const x0 = b.x + ux * b.r * .7, z0 = b.z + uz * b.r * .7, L = lane(x0, z0, ux, uz, K.tongueLen, .3);
            if (L < 2.2) ph = 'croak';
            else {
              b.lx = x0; b.lz = z0; b.len = L; st.tl = L + b.r * .3; b.hit = false;
              bossPhase(b, 'tongue', K.warn + K.tongueOut + K.tongueHold + K.tongueBack + .5);
              b.tele = teleLine(x0, z0, x0 + ux * L, z0 + uz * L, K.tongueW, K.warn, col);
              sfx('squish', { x: b.x, z: b.z, vol: .45, pitch: .8 });
            }
          }
          if (ph === 'hop') {
            const t = nearFeza(b, K.hopMax);
            if (Math.hypot(t.x - b.x, t.z - b.z) < 1.2) ph = 'croak';
            else {
              b.hx0 = b.x; b.hz0 = b.z; b.hx1 = t.x; b.hz1 = t.z; b.up = 0;
              bossPhase(b, 'hop', K.warn + 1.1);
              b.tele = circle(t.x, t.z, K.hopR, K.warn, '#ff7a6a');
            }
          }
          if (ph === 'croak') { bossPhase(b, 'croak', K.warn + 1.0); b.tele = circle(b.x, b.z, K.croakR, K.warn, '#b6e07a'); sfx('bubble', { x: b.x, z: b.z, vol: .4, pitch: .6 }); }
          break;
        }
        case 'tongue': {
          const e = b.stT - K.warn;
          if (e >= 0 && !b.did) { b.did = 1; remove(b.tele); b.tele = null; sfx('frogTongue', { x: b.x, z: b.z, vol: .8 }); }
          if (e >= 0 && e < K.tongueOut + K.tongueHold && !b.hit) {
            const reach = b.len * Math.min(1, e / K.tongueOut);
            if (laneHit(b.lx, b.lz, b.rdx, b.rdz, reach * .5, reach * .5, K.tongueW * .5)) { b.hit = true; hurtPlayer(b.dmg * .6, b.x, b.z, .8); burst('jelly', P.pos.x, .8, P.pos.z, { color: '#f490ab', scale: .6 }); }
          }
          if (b.stT >= b.phD) rest(b, 1.2, 1.7);
          break;
        }
        case 'hop': {
          if (b.stT < K.hopUp) break;
          if (!b.up) { b.up = 1; sfx('bounce', { x: b.x, z: b.z, vol: .8, pitch: .6 }); burst('bubbles', b.x, .2, b.z, { count: 8, color: '#bfe6ff' }); }
          if (b.stT < K.warn) { carry(b, dt, K.hopUp, K.warn, K.hopH); break; }
          if (!b.did) {
            b.did = 1; b.y = 0; st.air = 0; remove(b.tele); b.tele = null; carry(b, dt, K.hopUp, K.warn, K.hopH); b.y = 0; st.air = 0;
            ring(b, b.x, b.z, K.hopR, .75, 1.2, '#9bd27a'); sfx('slam', { x: b.x, z: b.z, vol: .7, pitch: 1.1 }); sfx('splash', { x: b.x, z: b.z, vol: .6 });
            burst('dust', b.x, .05, b.z, { count: 14, color: '#b8c98d' });
          }
          if (b.stT >= b.phD) { b.up = 0; rest(b, 1.2, 1.7); }
          break;
        }
        case 'plop': {   // (ANIM) fun moment, harmless: a giant hop on the spot, SPLASH, sits soaked, shakes off, sneezes (free hits)
          const t1 = K.plopUp + K.plopAir;
          if (b.stT >= K.plopUp && b.stT < t1) { if (!b.up) { b.up = 1; sfx('bounce', { x: b.x, z: b.z, vol: .7, pitch: .5 }); } carry(b, dt, K.plopUp, t1, K.plopH); }
          else if (b.stT >= t1 && !b.did) {
            b.did = 1; b.y = 0; st.air = 0;
            sfx('splash', { x: b.x, z: b.z, vol: 1 }); sfx('splat', { x: b.x, z: b.z, vol: .6 }); shake(.12);
            fx('ring', b.x, b.z, { r0: .6, r1: b.r + 2.2, dur: .6, color: '#9fd6f2', width: .5 });
            burst('bubbles', b.x, .4, b.z, { count: 26, color: '#bfe6ff', scale: 1.4 }); burst('jelly', b.x, .5, b.z, { color: '#8fd0f0', scale: 1.3 });
          } else if (b.did && b.stT < b.phD - .4 && Math.random() < .12) burst('bubbles', b.x + (Math.random() - .5) * b.r, b.height * .5, b.z + (Math.random() - .5) * b.r, { count: 2, color: '#d8f1ff' });
          if (b.did && !b.sn && b.stT > b.phD - .55) { b.sn = 1; sfx('pop', { x: b.x, z: b.z, vol: .6, pitch: .7 }); }
          if (b.stT >= b.phD) { b.up = 0; b.sn = 0; end(b, .5, .9); }
          break;
        }
        case 'croak': {
          if (!b.did && b.stT >= K.warn) {
            b.did = 1; remove(b.tele); b.tele = null;
            ring(b, b.x, b.z, K.croakR, .65, 1.4, '#c7ec8a');
            const m = A.muzzle ? A.muzzle(b) : { x: b.x, y: 1.5, z: b.z };
            burst('notes', m.x, m.y, m.z, { count: 10 }); sfx('frogCroak', { x: b.x, z: b.z, vol: .9 });
          }
          if (b.stT >= b.phD) rest(b, 1.2, 1.7);
          break;
        }
        default: end(b, .8, 1.2);
      }
    }

    // ── Uykucu Ayı: yere vurur, ağaçtan arı kovanı düşer (bal sıçrar, arı yok), esneyip kısa uyuklar ──
    function ayiStep(b, dt, d, ux, uz) {
      const K = FB.uykucuayi, st = b.st, col = '#f3ba69';
      st.move = 0; st.air = 0;
      switch (b.ph) {
        case 'roar': roar(b, 1.6); break;
        case 'summon': summon(b, 1.8); break;
        case 'idle': {
          if (!idleCommon(b, dt, d, ux, uz, b.r + 3.0)) break;
          if (b.nMoves % K.every === 0) { bossPhase(b, 'yawn', K.yawnD); sfx('bearYawn', { x: b.x, z: b.z, vol: .8 }); break; }
          if (b.nMoves % 5 === 4) { bossPhase(b, 'honey', K.honeyD); b.tick = .4; sayFun('orman_mese_bal'); sfx('bearHum', { x: b.x, z: b.z, vol: .7 }); break; }   // (ANIM) fun: can't resist honey
          const ph = pickPhase(b, d < b.r + 3.4 ? [['slam', .6], ['hives', .4]] : [['hives', .75], ['slam', .25]]);
          aimAtFeza(b, ux, uz);
          if (ph === 'slam') { bossPhase(b, 'slam', K.warn + 1.3); b.tele = circle(b.x, b.z, K.slamR, K.warn, col); sfx('roar', { x: b.x, z: b.z, vol: .35, pitch: .7 }); }
          else {
            bossPhase(b, 'hives', K.warn + 1.5); b.hit = false; b.teles = []; b.hv = [];
            const px = -uz, pz = ux, base = [[0, 0], [K.hiveSpread, -.6], [-K.hiveSpread, -.6]];
            for (const o of base) {
              let x = P.pos.x + px * o[0] + ux * o[1], z = P.pos.z + pz * o[0] + uz * o[1];
              if (!floorOk(x, z)) { x = P.pos.x; z = P.pos.z; }
              if (b.hv.some(h => Math.hypot(h.x - x, h.z - z) < 1)) continue;
              b.hv.push({ x, z }); b.teles.push(circle(x, z, K.hiveR, K.warn, '#ffb347'));
            }
            sfx('rumble', { x: b.x, z: b.z, vol: .4 });
          }
          break;
        }
        case 'slam': {
          if (!b.did && b.stT >= K.warn) {
            b.did = 1; remove(b.tele); b.tele = null;
            ring(b, b.x, b.z, K.slamR, .8, 1.3, '#e8c27a'); burst('dust', b.x, .05, b.z, { count: 18, color: '#cdb486', scale: 1.2 });
            sfx('bearStomp', { x: b.x, z: b.z, vol: .9 });
          }
          if (b.stT >= b.phD) rest(b, 1.3, 1.8);
          break;
        }
        case 'hives': {
          const t0 = K.warn - K.hiveFall, land = b.stT >= K.warn;
          if (b.stT >= t0 && b.hv) {
            const list = [];
            b.hv.forEach((h, i) => {
              const k = Math.min(1, (b.stT - t0) / K.hiveFall), y = land ? 0 : 7.5 * (1 - k * k), after = b.stT - K.warn;
              const sz = after > .9 ? Math.max(0, 1 - (after - .9) / .4) : 1;
              list.push({ b: 'hive' + i, x: h.x, y, z: h.z, ry: i * 1.7 + (land ? Math.sin(after * 18) * .15 * Math.max(0, 1 - after) : b.stT * 3), k: sz });
            });
            fo(b, list);
          }
          if (land && !b.did) {
            b.did = 1; clearTeles(b); sfx('splat', { x: b.x, z: b.z, vol: .8 });
            for (const h of b.hv) {
              burst('jelly', h.x, .3, h.z, { color: '#f5b43c', scale: 1.1 }); burst('sparkle', h.x, .6, h.z, { color: '#ffe08a', count: 6 });
              if (!b.hit && pdist(h.x, h.z) < K.hiveR + HR() * .5) { b.hit = true; hurtPlayer(b.dmg * .6, h.x, h.z, .9); }
            }
            shake(.15);
          }
          if (b.stT >= b.phD) rest(b, 1.2, 1.7);
          break;
        }
        case 'yawn': {
          if (b.stT >= b.phD) { bossPhase(b, 'nap', K.napD); b.tick = 0; b.hpNap = b.hp; }
          break;
        }
        case 'honey': {   // (ANIM) fun moment, harmless: licks honey from his paw, blissful (free hits)
          b.tick -= dt;
          if (b.tick <= 0 && b.stT < K.honeyD - .4) {
            b.tick = .9; sfx('munch', { x: b.x, z: b.z, vol: .55 });
            const m = A.muzzle ? A.muzzle(b) : { x: b.x, y: 2, z: b.z };
            burst('sparkle', m.x, m.y, m.z, { count: 3, color: '#ffd36a' });
          }
          if (b.stT >= b.phD) end(b, .5, .9);
          break;
        }
        case 'wake': {   // (ANIM) bonked awake mid-snooze: jumps up with stars, then carries on
          if (b.stT >= b.phD) end(b, .4, .7);
          break;
        }
        case 'nap': {   // free hits: a short snooze with floating z's, then he wakes with a start
          b.tick -= dt;
          if (b.stT > .35 && b.hpNap != null && b.hp < b.hpNap - .5) {   // (ANIM) Feza's bonk wakes him: a startled jump
            b.hpNap = null; bossPhase(b, 'wake', K.wakeD); sayFun('orman_mese_uyandi'); sfx('bonk', { x: b.x, z: b.z, vol: .6, pitch: .8 }); sfx('bearYawn', { x: b.x, z: b.z, vol: .5, pitch: 1.4 });
            burst('sparkle', b.x, b.height * .9, b.z, { count: 8, color: '#ffe08a' }); break;
          }
          if (b.tick <= 0 && b.stT < K.napD - .4) { b.tick = .8; if (b.stT < .9) sfx('bearSnore', { x: b.x, z: b.z, vol: .7 }); burst('zzz', b.x + Math.sin(b.face) * b.r * .8, b.height * .75, b.z + Math.cos(b.face) * b.r * .8, {}); }
          if (b.stT >= b.phD) { sfx('bonk', { x: b.x, z: b.z, vol: .5, pitch: .8 }); end(b, .4, .7); }
          break;
        }
        default: end(b, .8, 1.2);
      }
    }

    // ── Huysuz Dağ Keçisi: boynuz hamlesi (koşu şeridi), üç yuvarlanan taş (yelpaze), sıçrayıp konar ──
    function keciStep(b, dt, d, ux, uz) {
      const K = FB.dagkecisi, st = b.st, col = '#f3ba69';
      st.move = 0; st.air = 0;
      switch (b.ph) {
        case 'roar': roar(b, 1.6); break;
        case 'summon': summon(b, 1.8); break;
        case 'idle': {
          if (!idleCommon(b, dt, d, ux, uz, b.r + 3.2)) break;
          let ph = pickPhase(b, d < b.r + 3.4 ? [['leap', .3], ['rocks', .35], ['charge', .35]] : [['charge', .45], ['rocks', .4], ['leap', .15]]);
          aimAtFeza(b, ux, uz);
          if (ph === 'charge') {
            const L = lane(b.x, b.z, ux, uz, Math.min(K.chargeMax, d + 1.5), b.r * .75);
            if (L < 2.5) ph = 'rocks';
            else {
              b.len = L; b.rollD = 0; b.hit = false; b.tick = 0; b.skid = 0;
              bossPhase(b, 'charge', K.warn + L / K.chargeSpeed + K.skid);
              const nose = b.r + .6;
              b.tele = teleLine(b.x + ux * .25, b.z + uz * .25, b.x + ux * (L + nose), b.z + uz * (L + nose), K.chargeW, K.warn, col);
              sfx('step', { x: b.x, z: b.z, vol: .6, pitch: .8 });
            }
          }
          if (ph === 'leap') {
            const t = nearFeza(b, K.leapMax);
            if (Math.hypot(t.x - b.x, t.z - b.z) < 1.2) ph = 'rocks';
            else { b.hx0 = b.x; b.hz0 = b.z; b.hx1 = t.x; b.hz1 = t.z; bossPhase(b, 'leap', K.warn + 1.0); b.tele = circle(t.x, t.z, K.leapR, K.warn, '#ff7a6a'); }
          }
          if (ph === 'rocks') {
            b.rk = []; b.teles = []; b.hit = false;
            for (const a of [-.45, 0, .45]) {
              const dx = Math.sin(b.aim + a), dz = Math.cos(b.aim + a), x0 = b.x + dx * (b.r + .2), z0 = b.z + dz * (b.r + .2);
              const L = lane(x0, z0, dx, dz, K.rockLen, K.rockR);
              if (L < 2) continue;
              b.rk.push({ x0, z0, dx, dz, L });
              b.teles.push(teleLine(x0, z0, x0 + dx * L, z0 + dz * L, K.rockW, K.warn, col));
            }
            if (!b.rk.length) { bossPhase(b, 'roar', 1.2); b.did = 1; break; }
            const mx = Math.max(...b.rk.map(r => r.L));
            bossPhase(b, 'rocks', K.warn + mx / K.rockSpeed + .8);
            sfx('rumble', { x: b.x, z: b.z, vol: .4 });
          }
          break;
        }
        case 'charge': {
          const runEnd = K.warn + b.len / K.chargeSpeed;
          if (b.stT < K.warn) break;
          if (!b.did) { b.did = 1; remove(b.tele); b.tele = null; sfx('goatCharge', { x: b.x, z: b.z, vol: .8 }); }
          if (b.stT < runEnd) {
            const want = Math.min(b.len, (b.stT - K.warn) * K.chargeSpeed), step = Math.max(0, want - b.rollD);
            const moved = step > 0 ? walk(b, b.rdx, b.rdz, step / Math.max(.001, dt), dt) : 0;
            b.rollD += moved; b.face = b.aim; st.move = 1;
            b.tick -= dt;
            if (b.tick <= 0) { b.tick = .18; burst('dust', b.x - b.rdx * .9, .05, b.z - b.rdz * .9, { count: 3, color: '#d9cfb8', scale: .6 }); }
            const px = P.pos.x - b.x, pz = P.pos.z - b.z, front = px * b.rdx + pz * b.rdz, side = Math.abs(px * -b.rdz + pz * b.rdx);
            if (!b.hit && front > -b.r * .6 - HR() && front < b.r + .9 + HR() * .5 && side < K.chargeW * .5 + HR() * .5) { b.hit = true; hurtPlayer(b.dmg * .8, b.x, b.z, 1.4); }
            if (step > .02 && moved < step * .25) b.stT = runEnd;
          } else if (!b.skid) { b.skid = 1; burst('dust', b.x, .05, b.z, { count: 10, color: '#d9cfb8' }); sfx('step', { x: b.x, z: b.z, vol: .5 }); }
          if (b.stT >= b.phD) {
            b.skid = 0;
            if (!b.wasStuck && Math.random() < K.stuckP) {   // (ANIM) fun: his horns stuck fast in a rock
              b.wasStuck = 1; bossPhase(b, 'stuck', K.stuckD); b.tick = .3; sayFun('orman_selale_takildi'); sfx('bonk', { x: b.x, z: b.z, vol: .7, pitch: .7 });
              burst('dust', b.x + b.rdx * b.r, .2, b.z + b.rdz * b.r, { count: 12, color: '#cfc5b2' });
            } else { b.wasStuck = 0; rest(b, 1.3, 1.8); }
          }
          break;
        }
        case 'stuck': {   // (ANIM) fun moment, harmless: kicks and wiggles, pops free and tumbles back dizzy (free hits)
          b.tick -= dt;
          if (b.tick <= 0 && b.stT < K.stuckD - .8) { b.tick = .45; sfx('step', { x: b.x, z: b.z, vol: .45, pitch: 1.3 }); burst('dust', b.x - b.rdx * b.r, .1, b.z - b.rdz * b.r, { count: 3, color: '#d9cfb8', scale: .6 }); }
          if (!b.did && b.stT > K.stuckD - .7) { b.did = 1; sfx('pop', { x: b.x, z: b.z, vol: .8, pitch: .8 }); burst('dust', b.x + b.rdx * b.r, .3, b.z + b.rdz * b.r, { count: 10, color: '#cfc5b2' }); }
          if (b.stT >= b.phD) end(b, .4, .8);
          break;
        }
        case 'rocks': {
          if (b.stT >= K.warn) {
            if (!b.did) { b.did = 1; clearTeles(b); sfx('slam', { x: b.x, z: b.z, vol: .7, pitch: 1.1 }); sfx('roll', { x: b.x, z: b.z, vol: .8, pitch: .7 }); burst('dust', b.x, .05, b.z, { count: 12, color: '#cfc5b2' }); }
            const list = [];
            b.rk.forEach((r, i) => {
              const s = Math.min(r.L, (b.stT - K.warn) * K.rockSpeed), gone = (b.stT - K.warn) * K.rockSpeed - r.L;
              const k = gone > 0 ? Math.max(0, 1 - gone / (K.rockSpeed * .5)) : 1;
              list.push({ b: 'rock' + i, x: r.x0 + r.dx * s, y: K.rockR, z: r.z0 + r.dz * s, ry: Math.atan2(r.dx, r.dz), rx: s / K.rockR, k });
              if (!b.hit && gone <= 0 && laneHit(r.x0, r.z0, r.dx, r.dz, s, K.rockR + .1, K.rockW * .5)) { b.hit = true; hurtPlayer(b.dmg * .6, r.x0 + r.dx * (s - 1), r.z0 + r.dz * (s - 1), 1.0); }
            });
            fo(b, list);
          }
          if (b.stT >= b.phD) rest(b, 1.2, 1.7);
          break;
        }
        case 'leap': {
          if (b.stT < K.leapUp) break;
          if (b.stT < K.warn) { carry(b, dt, K.leapUp, K.warn, K.leapH); break; }
          if (!b.did) {
            b.did = 1; remove(b.tele); b.tele = null; carry(b, dt, K.leapUp, K.warn, K.leapH); b.y = 0; st.air = 0;
            ring(b, b.x, b.z, K.leapR, .7, 1.2, '#e7dcc6'); burst('dust', b.x, .05, b.z, { count: 14, color: '#d9cfb8' }); sfx('slam', { x: b.x, z: b.z, vol: .7, pitch: 1.2 });
          }
          if (b.stT >= b.phD) rest(b, 1.2, 1.7);
          break;
        }
        default: end(b, .8, 1.2);
      }
    }

    // ── Huysuz Baykuş: kanat rüzgârı (koni, Feza'yı iter), yay biçiminde beş tüy, uçup başka yere konar ──
    function baykusStep(b, dt, d, ux, uz) {
      const K = FB.baykus, st = b.st;
      st.move = 0; st.air = 0;
      switch (b.ph) {
        case 'roar': roar(b, 1.6); break;
        case 'summon': summon(b, 1.8); break;
        case 'idle': {
          if (!idleCommon(b, dt, d, ux, uz, b.r + 3.4)) break;
          if (b.nMoves % 5 === 2) { bossPhase(b, 'specs', K.specsD); b.tick = 0; sayFun('orman_gece_gozluk'); sfx('owlHoot', { x: b.x, z: b.z, vol: .7 }); break; }   // (ANIM) fun: loses his glasses
          let ph = pickPhase(b, d < b.r + 4 ? [['gust', .45], ['fly', .3], ['feathers', .25]] : [['feathers', .55], ['fly', .25], ['gust', .2]]);
          aimAtFeza(b, ux, uz);
          if (ph === 'fly') {
            // A perch beside or behind Feza (4–5 m from him, inside the arena, a free straight line from him).
            let best = null;
            for (let i = 0; i < 10 && !best; i++) {
              const a = Math.atan2(b.x - P.pos.x, b.z - P.pos.z) + (i & 1 ? 1 : -1) * (1.2 + .35 * (i >> 1)), dx = Math.sin(a), dz = Math.cos(a);
              const L = lane(P.pos.x, P.pos.z, dx, dz, 4.6, b.r * .8);
              if (L >= 3.5 && floorOk(P.pos.x + dx * L, P.pos.z + dz * L)) best = { x: P.pos.x + dx * L, z: P.pos.z + dz * L };
            }
            if (!best) ph = 'feathers';
            else {
              b.hx0 = b.x; b.hz0 = b.z; b.hx1 = best.x; b.hz1 = best.z;
              bossPhase(b, 'fly', K.takeoff + K.flyD + 1.0);
              b.tele = circle(best.x, best.z, K.landR, K.takeoff + K.flyD, '#c9b6ff');
              sfx('whoosh', { x: b.x, z: b.z, vol: .6, pitch: .7 });
            }
          }
          if (ph === 'gust') { bossPhase(b, 'gust', K.warn + K.gustD + 1.0); b.tele = fx('telegraphCone', b.x, b.z, b.face, K.gustAng, K.gustLen, K.warn, '#b8c8ff'); }
          if (ph === 'feathers') { bossPhase(b, 'feathers', K.warn + 1.1); b.tele = fx('telegraphCone', b.x, b.z, b.face, K.featherSpread * 1.25, 8.5, K.warn, '#e2c8ff'); sfx('owlHoot', { x: b.x, z: b.z, vol: .6 }); }
          break;
        }
        case 'specs': {   // (ANIM) fun moment, harmless: "huu-huu", head right round, glasses slip, he gropes for them (free hits)
          if (!b.h2 && b.stT > .5) { b.h2 = 1; sfx('owlHoot', { x: b.x, z: b.z, vol: .6, pitch: 1.15 }); }
          if (!b.did && b.stT > 1.05) { b.did = 1; sfx('pop', { x: b.x, z: b.z, vol: .5, pitch: 1.4 }); }
          if (!b.fnd && b.stT > K.specsD - .45) { b.fnd = 1; sfx('star', { x: b.x, z: b.z, vol: .6 }); const m = A.muzzle ? A.muzzle(b) : { x: b.x, y: 2, z: b.z }; burst('sparkle', m.x, m.y, m.z, { count: 8, color: '#ffe08a' }); }
          if (b.stT >= b.phD) { b.h2 = b.fnd = 0; end(b, .4, .8); }
          break;
        }
        case 'gust': {
          const e = b.stT - K.warn;
          if (e >= 0 && !b.did) { b.did = 1; remove(b.tele); b.tele = null; sfx('owlFlap', { x: b.x, z: b.z, vol: .9 }); b.hit = false; b.tick = 0; }
          if (e >= 0 && e < K.gustD) {
            b.tick -= dt;
            if (b.tick <= 0) {
              b.tick = .09;
              const a = b.face + (Math.random() - .5) * K.gustAng, r = 1 + Math.random() * K.gustLen;
              burst('dust', b.x + Math.sin(a) * r, .5 + Math.random(), b.z + Math.cos(a) * r, { count: 2, color: '#e9efff', dir: { x: Math.sin(b.face), z: Math.cos(b.face) } });
              burst('sparkle', b.x + Math.sin(a) * r, 1, b.z + Math.cos(a) * r, { count: 1, color: '#d9d2ff' });
            }
            const px = P.pos.x - b.x, pz = P.pos.z - b.z, pd = Math.hypot(px, pz);
            let da = Math.atan2(px, pz) - b.face; while (da > PI) da -= TAU; while (da < -PI) da += TAU;
            if (!b.hit && pd < K.gustLen + HR() && Math.abs(da) < K.gustAng * .5 + .1) { b.hit = true; hurtPlayer(b.dmg * .45, b.x, b.z, 2.8); }
          }
          if (b.stT >= b.phD) rest(b, 1.2, 1.7);
          break;
        }
        case 'feathers': {
          if (!b.did && b.stT >= K.warn) {
            b.did = 1; remove(b.tele); b.tele = null;
            const m = A.muzzle ? A.muzzle(b) : { x: b.x, y: 1.6, z: b.z }, n = K.featherN;
            for (let i = 0; i < n; i++) {
              const a = b.aim + (i / (n - 1) - .5) * K.featherSpread;
              if (A.spawnProjectile) A.spawnProjectile({ x: m.x, y: Math.max(.9, Math.min(1.4, m.y)), z: m.z, vx: Math.sin(a) * K.featherSpeed, vz: Math.cos(a) * K.featherSpeed,
                r: .28, dmg: b.dmg * .45, owner: 'enemy', bossShot: true, kind: 'feather', life: 2.6, obj: featherObj(), kb: .5 });
            }
            burst('sparkle', m.x, m.y, m.z, { count: 10, color: '#efe2ff' }); sfx('owlFeather', { x: b.x, z: b.z, vol: .8 });
          }
          if (b.stT >= b.phD) rest(b, 1.2, 1.7);
          break;
        }
        case 'fly': {
          const t1 = K.takeoff + K.flyD;
          if (b.stT < t1) { carry(b, dt, 0, t1, K.flyH, true); st.air = 0; if (Math.random() < .1) burst('sparkle', b.x, b.y + 1, b.z, { count: 1, color: '#d9d2ff' }); }
          else if (!b.did) {
            b.did = 1; b.x = b.hx1; b.z = b.hz1; b.y = 0; remove(b.tele); b.tele = null;
            ring(b, b.x, b.z, K.landR, .55, 1.1, '#c9b6ff'); burst('dust', b.x, .05, b.z, { count: 12, color: '#d9d2ff' }); sfx('whoosh', { x: b.x, z: b.z, vol: .6, pitch: .9 });
          }
          const dx = b.hx1 - b.hx0, dz = b.hz1 - b.hz0;
          if (b.stT < t1 && Math.hypot(dx, dz) > .1) b.face = Math.atan2(dx, dz); else b.face = Math.atan2(P.pos.x - b.x, P.pos.z - b.z);
          if (b.stT >= b.phD) rest(b, 1.1, 1.6);
          break;
        }
        default: end(b, .8, 1.2);
      }
    }
    return { kunduz: kunduzStep, kocakurbaga: kurbagaStep, uykucuayi: ayiStep, dagkecisi: keciStep, baykus: baykusStep };
  }
  return { types, bossAI, bossKits: BOSS_KITS, FB, featherObj };
})();
