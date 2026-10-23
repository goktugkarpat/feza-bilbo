/* ── Bilbo'nun Saklı Toplar Ormanı: sevimli huysuz hayvanlar ──
   Mevcut EMODEL'in tek çizimlik iskeleti, iki yüz hâli ve ortak geometri önbelleği kullanılır.
   Dokuz ayrı siluet: uzun çeneli timsah, sivri kulaklı tilki, yaban domuzu, tombul ayı,
   desenli kabuklu kaplumbağa, perdeli kurbağa, kıvrık kuyruklu sincap, maskeli rakun ve Koca Timsah.
   Hayvanlar yenilince ölmez: eski oyundaki neşelenme / kalpli vedayı kullanırlar. */
const FOREST_ANIMALS = (function () {
  'use strict';
  if (typeof EMODEL === 'undefined' || !EMODEL.registerPack) return { types: [] };
  const PI = Math.PI, TAU = PI * 2;
  const types = EMODEL.registerPack(function (K) {
    const { G, face, vgrad, col, mixc, texOf, lathe, cone, qy, fluffGeo } = K;
    const DARK = '#352638', CREAM = '#ffefd2', PINK = '#ed9ca7';
    const clamp01 = x => Math.max(0, Math.min(1, x));
    const bell = x => x >= 0 && x <= 1 ? Math.sin(PI * x) : 0;
    const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
    const PALETTES = {
      croc: ['#498855', '#79b36b', '#d8df9f', '#345e3d'], fox: ['#bc652e', '#e29245', '#fff0d6', '#654431'],
      boar: ['#916449', '#b38a61', '#dbc39a', '#674431'], bear: ['#89593b', '#ae7b52', '#dfba88', '#644333'],
      turtle: ['#4e9870', '#8cba74', '#e8d991', '#356f53'], frog: ['#64ab6c', '#a7d38b', '#f2e9b2', '#448854'],
      squirrel: ['#aa6634', '#d99b55', '#f8deb2', '#805335'], raccoon: ['#7f8894', '#b4bcc2', '#eee5cf', '#414952'],
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
        mouthY: -R * .4, mouthW: R * .34, noTongue: true, blushCol: PINK, heartY: 1.05, heartS: .20,
      }, o));
    }
    function ears(r, head, c, inner, w, tall, floppy) {
      r.on('head').fx(0, .05, .32);
      for (const sd of [-1, 1]) {
        const p = [sd * w, head[1] + (tall ? .23 : .13), head[2] - .10];
        if (tall) {
          cone(r, [p[0], p[1] - .10, p[2]], [sd * .18, 1, -.10], .31, .12, c, 16);
          ell(r, inner, [p[0] + sd * .02, p[1] + .015, p[2] + .058], [.060, .115, .014], [0, 0, -sd * .14], 12);
        } else {
          ell(r, c, p, [.11, floppy ? .14 : .105, .072], [0, 0, sd * -.2]);
          ell(r, inner, [p[0], p[1] + .012, p[2] + .055], [.06, .063, .022], null, 12);
        }
      }
    }
    function kerchief(r, color, y, z, span) {
      r.on('body').fx(0, .03, 1);
      // Soft folded scarf and two pointed cloth ends, not a glowing decal.
      r.add(G.torus(TAU, .19, 20), color, [0, y, z], [PI / 2, 0, 0], [span, span * .8, .34]);
      softBox(r, mixc(color, '#ffffff', .20), [.07, y - .045, z + span * .73], [.12, .10, .065], [0, 0, -.15]);
      for (const sd of [-1, 1]) ell(r, color, [sd * .07, y - .12, z + span * .75], [.058, .125, .022], [0, 0, sd * -.25], 12);
      r.fx(0, 0, 0);
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
      return { height: cfg.height, modelScale: cfg.scale || 1, forestSpecies: cfg.species, forestLegs: cfg.legs,
        portrait: cfg.portrait || { cx: 0, cy: cfg.height * .67, cz: .3, rad: cfg.height * .55 },
        glowC: col('#f5ca7a'), glowK: .35, dieHop: .075, tex: surface(['croc', 'turtle', 'frog'].includes(cfg.species) ? 'scale' : 'fur'),
        mat: { rough: cfg.species === 'frog' || cfg.species === 'croc' ? .40 : .64, ns: .28,
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
      return details(r, { height: boss ? 1.22 : .91, scale: boss ? 2.35 : 1, species: 'croc', legs,
        portrait: { cx: 0, cy: .65, cz: .8, rad: .7 } });
    }
    function furry(r, o, species) {
      const [base, light, cream, dark] = PALETTES[species], fox = species === 'fox', boar = species === 'boar', bear = species === 'bear', raccoon = species === 'raccoon';
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
      }
      r.on('head').fx(0, .08, .45);
      ell(r, skin(base, light, dark, head[1] - R, head[1] + R), head, [R * (bear ? 1.08 : 1), R * (bear ? .95 : 1), R * .92], null, 24);
      ears(r, head, base, boar ? '#c59c87' : PINK, R * .77, fox, boar);
      if (fox) {
        // Long triangular cheek planes and a tapered muzzle differentiate the fox from masked round-headed raccoons.
        for (const sd of [-1, 1]) {
          ell(r, cream, [sd * .145, head[1] - .09, head[2] + .16], [.16, .15, .20], [0, sd * -.25, -sd * .35]);
          ell(r, base, [sd * .215, head[1] - .02, head[2] + .015], [.105, .07, .115], [0, sd * .2, sd * -.4], 14);
        }
        cone(r, [0, head[1] - .075, head[2] + .12], [0, -.11, 1], .36, .17, cream, 20);
        ell(r, DARK, [0, head[1] - .10, head[2] + .44], [.053, .043, .040]);
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
        r.on('body'); for (let i = 0; i < 7; i++) ell(r, dark, [0, .80, -.35 + i * .08], [.057, .105, .062], [0, 0, .12 * Math.sin(i)], 12);
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
          if (raccoon) for (let j = 0; j < 2; j++) {
            r.add(G.torus(TAU, .25, 18), dark, [0, by + .04 + i * .09, -.53 - i * .26 - j * .13], null, [.14 - i * .014, .15, .10]);
          }
        }
      }
      kerchief(r, fox ? '#54a8ae' : bear ? '#6c91b5' : boar ? '#789346' : '#b980b6', bear ? .77 : .59, .30, bear ? .30 : .23);
      r.on('head').mark('muzzle', [0, head[1] - .05, head[2] + .45]);
      return details(r, { height: bear ? 1.21 : fox ? 1.18 : boar ? 1.05 : 1.00, species, legs });
    }
    function turtle(r, o) {
      const [base, light, cream, dark] = PALETTES.turtle, head = [0, .40, .61];
      const legs = quadRig(r, { width: .36, front: .35, back: -.35, head, by: .37, color: base, paw: light, w: .13 });
      r.on('body').fx(0, .07, .35);
      ell(r, '#baaa64', [0, .25, -.025], [.50, .14, .64]);
      // Sculpted domed shell with separately bevelled olive plates nested inside its broad golden lip.
      r.add(G.hemi(28), '#a8a762', [0, .31, -.05], null, [.54, .50, .65]);
      r.add(G.torus(TAU, .10, 32), '#d3c383', [0, .32, -.05], [PI / 2, 0, 0], [.53, .65, .46]);
      const shellColors = ['#5f8b65', '#7ca36e', '#80a172', '#9da76e'];
      const centers = [[0, .82, -.05, .21, .055, .23]];
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < (ring ? 10 : 6); i++) {
        const a = i * TAU / (ring ? 10 : 6) + (ring ? .20 : 0), rr = ring ? .80 : .46;
        centers.push([Math.sin(a) * .50 * rr, .31 + .48 * Math.sqrt(1 - rr * rr), -.05 + Math.cos(a) * .61 * rr, ring ? .12 : .17, .05, ring ? .13 : .19, a, rr]);
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
      r.on('tail0').fx(0, .06, .25); cone(r, [0, .30, -.59], [0, .05, -1], .26, .10, base, 16);
      r.on('head').fx(0, .08, .18);
      for (const sd of [-1, 1]) { ell(r, dark, [sd * .055, .475, .823], [.010, .010, .012], null, 8); }
      r.on('head').mark('muzzle', [0, .41, .85]);
      return details(r, { height: .87, species: 'turtle', legs });
    }
    function frog(r, o) {
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
      r.on('head').fx(0, .20, .22); ell(r, cream, [0, .302, .475], [.23, .075, .135], null, 14);
      for (const sd of [-1, 1]) ell(r, mixc(base, dark, .18), [sd * .31, .32, .21], [.044, .089, .098], [0, sd * -.45, sd * .2], 10);
      r.on('head').mark('muzzle', [0, .43, .67]);
      return details(r, { height: .83, species: 'frog', legs });
    }
    function squirrel(r, o) {
      const [base, light, cream, dark] = PALETTES.squirrel, head = [0, .80, .15];
      const legs = quadRig(r, { width: .20, front: .15, back: -.21, head, by: .49, color: base, paw: light, fur: true, w: .09 });
      r.on('body').fx(0, .08, .65);
      ell(r, base, [0, .49, -.04], [.235, .34, .30]); ell(r, cream, [0, .48, .19], [.16, .26, .07]);
      r.on('head'); ell(r, light, head, [.24, .25, .235], null, 28);
      ears(r, head, base, '#d8a075', .18, true, false);
      for (const sd of [-1, 1]) ell(r, dark, [sd * .18, 1.067, .043], [.030, .085, .035], [0, 0, sd * -.14], 10);
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
      kerchief(r, '#8ab46a', .73, .15, .19);
      r.on('head').mark('muzzle', [0, .75, .42]);
      return details(r, { height: 1.46, species: 'squirrel', legs });
    }
    function animate(m, dt, st, s) {
      const B = m.B, sp = m.def.forestSpecies, dying = st.dying >= 0, phase = st.phase || 'idle';
      const mv = clamp01(s.mv), p = clamp01(+st.phaseT || 0), wind = st.windup >= 0 ? smooth(st.windup) : 0;
      const attack = st.attack >= 0 ? st.attack : -1;
      // Keep the end of the preparation through the first instant of release. A reset to the
      // bind pose between two states looked like a hitch, especially on the bear and throwers.
      const prep = wind > 0 ? wind : attack >= 0 && !dying ? 1 - smooth(attack / .24) : 0;
      const charge = (phase === 'charge' || phase === 'roll') && st.move > .15, sprint = mv + (charge ? .8 : 0);
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
      if (m.boss && !dying) {
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
    return pack;
  });
  return { types };
})();
