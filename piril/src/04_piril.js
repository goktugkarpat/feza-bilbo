/* Pırıl — Feza'nın peluş yavru ejderhası (3B). Klasik script; yalnız THREE gerekir (ev ekranı da bu dosyayı tek başına okur).
   Kaynak: ../feza-piril/src/piril.js (2B çizim: oranlar, renkler, göz/ibik/kuyruk/karın). Ölçek: 2B birim × 0,02 m.
   Yapı: kemik iskeleti + tek parça "yumuşak" yüzey (Bilbo gibi): tüm parçalar malzemeye göre birleştirilir →
   4 çizim çağrısı (peluş, göz, parıltı, ışık kanat), ~14,9k üçgen (takılı süs +1 çizim).

   Genel API:
     PIRIL.create()            → model m (BILBO.create ile aynı biçim: root, update(dt, durum), dispose, bones, meshes, mouthAnchor,
                                 fetchBone/fetchFacing/clearActions/isFetching/fetchStage (ışık nefesi atışı), saddle, head, neck, body,
                                 setAccessory/accessory (yok sayılır), sneeze/isSneezing)
     PIRIL.yap(opts)           → m (+ m.group = m.root, m.guncelle(dt) = m.update(dt, m.durum)); opts: { isik: 0..5, uyku, ucus }
     PIRIL.portrait()          → yüz resmi dataURL (renderer varsa)
     PIRIL.ACCESSORIES         → 5 süs (her ışıkla biri açılır): mantar şapka, inci kolye, çöl fuları, papyon, gökkuşağı tacı; m.setAccessory(id|null)
     m.isik(n)                 → ışık sayısı 0..5: kanatlar büyür ve parlar (0: sönük minik kanatlar)
     m.takla()                 → sevinç taklası (havada ters dönüş)
     m.nefes(sn)               → ışık nefesi pozu (yanak şişer, ağız "O", başı öne); ağzın dünya yeri: m.agiz()
     m.salla(sn)               → el/kanat sallama
     m.uyu(acik)               → uyuma (gözler kapalı, kıvrılır, kanatlar söner)
     m.bak(v3|null)            → başı bir dünya noktasına çevir (ör. Feza'nın başı)
     m.sevin(sn)               → mutlu gözler + kuyruk sallama
   update(dt, durum): durum = { speed, hop, pounce, bark, sit, happy, ride } (Bilbo ile aynı alanlar; bark → kısa nefes pozu,
   pounce → hızlı dalış, sit → yorgun/kıvrık, ride → sırtında Feza var (büyük Pırıl)). Model kendi havada durma yüksekliğini taşır
   (m.yukseklik, varsayılan 1.25 m: kökün altı yer). */
const PIRIL = (() => {
  'use strict';
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const S = 0.02;                       // 2B birim → metre
  const COL = {                        // piril.js DR_COL
    pur: 0xb28ae6, purL: 0xd2b6f7, purD: 0x8660c4, line: 0x52338c, lime: 0xbde43a, limeL: 0xd9f27e, limeD: 0x93bd28,
    crest: 0x2f8a2c, crestL: 0x55ad44, crestD: 0x1f5c1c, eye: 0x1c1228, mouth: 0x4a1d4a, blush: 0xff8cc6, tongue: 0xff8fb8,
  };

  // ── Malzemeler (bir kez; bütün Pırıl'lar paylaşır) ──
  // Peluş: tepe ışığına yumuşak kadife parlaklığı (fresnel), ince kumaş pürüzü ve karında fıstık yeşili çizgiler (aPel maskesi).
  const LIN = h => { const c = new THREE.Color(h); return c.r.toFixed(4) + ',' + c.g.toFixed(4) + ',' + c.b.toFixed(4); };
  const MY = .1 - .162;   // ağız çizgisi (baş kemiğine göre y)
  function pelus(mat) {
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', 'attribute float aPel; varying float vPel; varying vec3 vBind;\n#include <common>')
        .replace('#include <common>', 'varying vec3 vBN;\n#include <common>')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vPel = aPel; vBind = position; vBN = normal;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', 'varying float vPel; varying vec3 vBind; varying vec3 vBN;\n#include <common>')
        .replace('#include <color_fragment>', `#include <color_fragment>
          { // fıstık yeşili karın (vPel 1: gövde paneli) ve çene (vPel 2: ağız çizgisinin altı); keskin ama yumuşak kenar
            float m = 0.0;
            if (vPel > 0.5 && vPel < 1.5) {
              float e = pow(vBind.x / 0.118, 2.0) + pow((vBind.y - 1.255) / 0.218, 2.0);
              m = smoothstep(1.0, 0.86, e) * smoothstep(0.0, 0.035, vBind.z);
            } else if (vPel > 1.5) {
              float ly = vBind.y - 1.47;
              m = smoothstep(${MY + .009}, ${MY - .003}, ly) * smoothstep(0.07, 0.11, vBind.z) * smoothstep(0.17, 0.13, abs(vBind.x));
            }
            vec3 lime = mix(vec3(${LIN(COL.limeD)}), vec3(${LIN(COL.lime)}), clamp(0.55 + vBN.y * 0.5 + vBN.z * 0.25, 0.0, 1.0));
            lime = mix(lime, vec3(${LIN(COL.limeL)}), clamp(vBN.y, 0.0, 1.0) * 0.6);
            diffuseColor.rgb = mix(diffuseColor.rgb, lime, m);
            if (vPel > 0.5 && vPel < 1.5) {   // karın panelinin çevresinde peluş dikiş izi (kesik çizgi)
              float e2 = pow(vBind.x / 0.118, 2.0) + pow((vBind.y - 1.255) / 0.218, 2.0);
              float band = smoothstep(1.03, 1.06, e2) * smoothstep(1.12, 1.09, e2) * smoothstep(0.0, 0.03, vBind.z);
              float dash = step(0.45, fract(atan(vBind.y - 1.255, vBind.x) * 9.0));
              diffuseColor.rgb *= 1.0 - 0.28 * band * dash;
            }
            // karın çizgileri (dikiş gibi yumuşak, ~3 cm arayla) ve kumaş pürüzü
            float st = abs(sin(vBind.y * 101.0));
            diffuseColor.rgb *= 1.0 - m * 0.34 * smoothstep(0.62, 0.97, st);
            float n = fract(sin(dot(floor(vBind * 260.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
            diffuseColor.rgb *= 0.965 + 0.05 * n;
          }`)
        .replace('#include <opaque_fragment>', `{ float rim = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
            outgoingLight += diffuseColor.rgb * vec3(1.05, 0.98, 1.12) * (pow(rim, 2.4) * 0.62); }
          #include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => 'pirilPelus';
    return mat;
  }
  const furMat = pelus(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 }));
  const eyeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0 });
  const shineMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  // Işık kanat dokusu (atlas): sol yarı tüy (yumuşak elips, beyaz kenar, ince damar), sağ yarı yuvarlak parıltı.
  function wingTexture() {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
    // Tek parça EJDERHA (yarasa) kanadı, sol 256×256: kök (12,150), bilek W (118,52), uç T (246,22).
    // Kol + 3 parmak kemiği bilekten yuvarlak taraklı arka kenara uzanır; zar dolgun (az saydam), kemikler ve kenar ışıl ışıl.
    const R = [12, 150], W = [118, 52], T = [246, 22], F2 = [238, 118], F3 = [184, 196], F4 = [102, 226], B = [16, 190];
    const wingPath = () => {
      x.beginPath(); x.moveTo(...R);
      x.bezierCurveTo(40, 98, 80, 58, ...W);                // kol (ön kenar)
      x.bezierCurveTo(170, 30, 214, 16, ...T);              // el → uç
      x.quadraticCurveTo(204, 74, ...F2);                   // yuvarlak taraklar (içe kavisli)
      x.quadraticCurveTo(170, 142, ...F3);
      x.quadraticCurveTo(122, 168, ...F4);
      x.quadraticCurveTo(58, 178, ...B);
      x.quadraticCurveTo(4, 172, ...R); x.closePath();
    };
    x.save(); wingPath(); x.clip();
    let g = x.createRadialGradient(W[0], W[1] + 30, 10, W[0] + 20, W[1] + 40, 210);
    g.addColorStop(0, 'rgba(214,190,255,0.95)'); g.addColorStop(0.45, 'rgba(172,134,250,0.93)'); g.addColorStop(1, 'rgba(250,160,220,0.92)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.restore();
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.shadowColor = 'rgba(255,255,255,0.7)'; x.shadowBlur = 6;
    x.strokeStyle = 'rgba(250,236,255,0.88)'; x.lineWidth = 5; wingPath(); x.stroke();     // ışıklı kenar (yumuşak)
    x.lineWidth = 7; x.beginPath();                                                      // kemikler: kol ve üç parmak
    x.moveTo(...R); x.bezierCurveTo(40, 98, 80, 58, ...W);
    x.moveTo(...W); x.quadraticCurveTo(196, 60, ...F2);
    x.moveTo(...W); x.quadraticCurveTo(160, 120, ...F3);
    x.moveTo(...W); x.quadraticCurveTo(112, 140, ...F4);
    x.stroke();
    x.fillStyle = 'rgba(255,250,255,1)';
    for (const p of [W, T, F2, F3, F4]) { x.beginPath(); x.arc(p[0], p[1], p === W ? 8 : 6, 0, 6.283); x.fill(); }   // yuvarlak eklem/uçlar
    x.shadowBlur = 0;
    // yuvarlak parıltı (kuyruk ucu, nefes topları): sağ 256×256
    g = x.createRadialGradient(384, 128, 0, 384, 128, 124);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(256, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const wingTex = wingTexture();
  // Kanat malzemesi her modelde ayrı (ışık sayısı modele göre değişir) ama aynı program.
  function makeWingMat() {
    return new THREE.MeshBasicMaterial({ map: wingTex, vertexColors: true, transparent: true, depthWrite: false,
      side: THREE.DoubleSide, toneMapped: false, opacity: 0.8 });
  }

  // Işık nefesi topları (paylaşılan): çekirdek renkleri + atlasın parıltı yarısından ışık halesi
  // yuvarlak gölge dokusu: atlasın parıltı yarısı (beyaz merkez → saydam kenar), renk malzemeden
  const GOLGE_TEX = (() => { if (!wingTex) return null; const tx = wingTex.clone(); tx.repeat.set(.5, 1); tx.offset.set(.5, 0); tx.needsUpdate = true; return tx; })();
  const SHOT_COLS = [0xfff2a8, 0xffd6f2, 0xd9c8ff, 0xc8f7e6];
  const SHOT_MATS = SHOT_COLS.map(c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  const SHOT_HALO = (() => {
    if (!wingTex) return [];
    const tx = wingTex.clone(); tx.repeat.set(.5, 1); tx.offset.set(.5, 0); tx.needsUpdate = true;
    return SHOT_COLS.map(c => new THREE.SpriteMaterial({ map: tx, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: .9 }));
  })();
  // ── Geometriler (paylaşılan) ──
  const sphere = new THREE.SphereGeometry(1, 18, 12);
  const eyeSphere = new THREE.SphereGeometry(1, 20, 13);
  const headSphere = new THREE.SphereGeometry(1, 32, 22);
  const detail = new THREE.SphereGeometry(1, 12, 9);
  const tiny = new THREE.SphereGeometry(1, 8, 6);
  // Dikey loft: kesitler [y, yarıçap x, yarıçap z, merkez z] (Catmull-Rom ile yumuşatılır)
  function loftY(sections, rows, sides) {
    const pos = [], uv = [], idx = [];
    const sample = (t, k) => {
      const u = t * (sections.length - 1), i = Math.min(sections.length - 2, Math.floor(u)), f = u - i;
      const a = sections[Math.max(0, i - 1)][k], b = sections[i][k], c = sections[i + 1][k], d = sections[Math.min(sections.length - 1, i + 2)][k];
      return 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    };
    for (let i = 0; i <= rows; i++) {
      const t = i / rows, y = sample(t, 0), rx = Math.max(0.0008, sample(t, 1)), rz = Math.max(0.0008, sample(t, 2)), cz = sample(t, 3);
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * Math.PI * 2;
        pos.push(Math.sin(a) * rx, y, cz + Math.cos(a) * rz); uv.push(j / sides, t);
        if (i < rows && j < sides) { const n = i * (sides + 1) + j; idx.push(n, n + sides + 1, n + 1, n + 1, n + sides + 1, n + sides + 2); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // Gövde: armut (aşağısı geniş), 2B önden/yandan çizimden. y: kalça merkezi 0, boyun 0.22.
  const bodyGeo = loftY([[.232, .001, .001, .0], [.222, .06, .055, .0], [.18, .118, .108, .006], [.11, .162, .148, .012],
    [.03, .188, .172, .018], [-.05, .2, .184, .02], [-.13, .192, .178, .014], [-.185, .162, .152, .006], [-.215, .105, .1, 0], [-.226, .001, .001, 0]], 26, 26);
  // Kuyruk: -z yönünde, kökte kalın (r .11) uca doğru incelir (r .04); kemiklerle kıvrılır.
  function tailGeo() {
    const g = new THREE.BufferGeometry(), pos = [], uv = [], idx = [], rows = 22, sides = 12, L = .5;
    for (let i = 0; i <= rows; i++) {
      const t = i / rows, r = THREE.MathUtils.lerp(.105, .036, Math.pow(t, .75)) * (i === 0 ? .6 : 1);
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * Math.PI * 2;
        pos.push(Math.sin(a) * r, Math.cos(a) * r * .92, -t * L); uv.push(j / sides, t);
        if (i < rows && j < sides) { const n = i * (sides + 1) + j; idx.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1); }
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const tailG = tailGeo();
  // Yassı kürek kuyruk ucu (yaprak/maça): yandan görülen şekil, x yönünde ince.
  function spadeGeo() {
    const s = new THREE.Shape();
    s.moveTo(0, -1.4); s.bezierCurveTo(-0.4, -4.2, -3.4, -4.7, -5.2, -3.2); s.bezierCurveTo(-6.8, -1.9, -8.2, -0.6, -8.2, 0.2);
    s.bezierCurveTo(-8.2, 1, -6.8, 2.3, -5.2, 3.4); s.bezierCurveTo(-3.4, 4.8, -0.4, 4.3, 0, 1.4); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.8, bevelSegments: 2, curveSegments: 6 });
    g.translate(0, 0, -0.3); g.scale(S * 1.25, S * 1.25, S * 1.25);
    g.rotateY(Math.PI / 2);   // şekil x → -z (kuyruk yönü), kalınlık x
    return g;
  }
  const spadeG = spadeGeo();
  // Yüzgeç kulak (drEar): kök (0,0), uç dışarı (+x), arkası taraklı (alt kenar).
  function earGeo() {
    const P = (ex, ey) => [-ey * S * .95, ex * S * .95];
    const s = new THREE.Shape(), q = (a, b, c, d) => s.quadraticCurveTo(...P(a, b), ...P(c, d));
    s.moveTo(...P(1.2, 1.4)); q(1.8, -5, 0.6, -10.6);
    q(-1.6, -9.4, -3, -7.4); q(-4.8, -6.6, -5.2, -4.2);
    q(-6.6, -3, -6.4, -0.6); q(-3, 0.6, 1.2, 1.4); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: .006, bevelEnabled: true, bevelThickness: .008, bevelSize: .007, bevelSegments: 2, curveSegments: 5 });
    g.translate(0, 0, -.003);
    const p = g.attributes.position;   // hafif kepçe: uçlar öne kıvrılır (yandan bakınca levha gibi durmasın)
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) + 1.6 * x * x + .5 * y * y); }
    g.computeVertexNormals(); return g;
  }
  const earG = earGeo();
  // Kalın kirpik çizgisi (göz üst kenarı, elipsin üst yarısı) ve mutlu göz kavisi "^"
  function arcTube(rx, ry, a0, a1, r, zb) {
    const pts = [];
    for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16; pts.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, zb * Math.sin(Math.PI * i / 16))); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, r, 5, false);
  }
  function curveTube(pts, r, seg) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg || 12, r, 5, false); }
  const lidG = arcTube(1.02, 1.02, Math.PI * 0.08, Math.PI * 0.94, .042, .02);       // göz ölçeğinde (sonra ölçeklenir)
  const happyG = curveTube([[-.06, -.012, 0], [-.03, .02, .006], [0, .03, .008], [.03, .02, .006], [.06, -.012, 0]], .011);
  const smileG = curveTube([[-.05, .012, -.02], [-.025, -.004, -.004], [0, -.009, 0], [.025, -.004, -.004], [.05, .012, -.02]], .0065);
  const fangG = new THREE.SphereGeometry(1, 10, 8);   // minik, kare-yuvarlak ön diş (peluş tavşan dişi gibi)
  { const p = fangG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 / Math.pow(Math.pow(Math.abs(x), 4) + Math.pow(Math.abs(y), 4) + Math.pow(Math.abs(z), 4), .25); p.setXYZ(i, x * k * .0105, y * k * .0125, z * k * .006); } fangG.computeVertexNormals(); }
  const quad = new THREE.PlaneGeometry(1, 1);
  const wingQuad = new THREE.PlaneGeometry(1, 1, 8, 1);

  function create() {
    const root = new THREE.Group(); root.name = 'Piril';
    const bones = [], parts = []; let bendNow = 0;
    function joint(parent, name, x = 0, y = 0, z = 0) {
      const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); bones.push(b); return b;
    }
    function part(bone, geo, color, pos = [0, 0, 0], scale = [1, 1, 1], mat = furMat, rot = [0, 0, 0], opt) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot, 'YXZ')), new THREE.Vector3(...scale));
      const p = Object.assign({ bone, geo, color: new THREE.Color(color), m, mat, bend: bendNow }, opt || {}); parts.push(p); return p;
    }

    // İskelet: kök (yer) → lift (havada durma) → body (kalça) → boyun → baş …
    const lift = joint(root, 'lift', 0, 1.25, 0);
    const body = joint(lift, 'body');
    // Gövde (fıstık yeşili karın paneli gölgelendiricide: aPel = 1)
    const C = n => new THREE.Color(n);
    const cPur = C(COL.pur), cPurL = C(COL.purL), cPurD = C(COL.purD), cLime = C(COL.lime), cLimeL = C(COL.limeL), cLimeD = C(COL.limeD);
    const shadeBody = (out, v, n) => {   // üstten aydınlık, altta koyu leylak (2B radyal gradyan gibi)
      const k = clamp01(n.y * .5 + .5);
      out.copy(cPurD).lerp(cPur, clamp01(k * 1.4)).lerp(cPurL, clamp01((k - .6) * 1.2) * .55);
    };
    part(body, bodyGeo, COL.pur, [0, 0, 0], [1, 1, 1], furMat, [0, 0, 0], {
      paint(out, v, n) { shadeBody(out, v, n); return 1; },
    });
    // Sırt dikenleri (koyu yeşil yuvarlak dilimler: DR_SPINE_S)
    for (const [y, z, r] of [[.155, -.128, .044], [.07, -.168, .04], [-.02, -.182, .034]]) part(body, detail, COL.crest, [0, y, z], [r * .7, r, r], furMat, [0, 0, 0], { paint: crestPaint });
    function crestPaint(out, v, n) { out.copy(C(COL.crestD)).lerp(C(COL.crest), clamp01(n.y * .6 + .55)).lerp(C(COL.crestL), clamp01(n.y - .3) * .7); return 0; }

    // Boyun ve baş (büyük, yuvarlak; gövdeyle aynı genişlikte)
    const neck = joint(body, 'neck', 0, .2, .02);
    const head = joint(neck, 'head', 0, .02, 0);
    const HC = [0, .1, .02];                // baş merkezi (head kemiğine göre) → dünya y ≈ 1.25+.32
    const HR = [.252, .232, .238];
    const MZ = [0, .1 - .118, .02 + .178];  // burun/ağız çıkıntısının merkezi
    const mouthY = HC[1] - .162;            // ağız çizgisi (2B y=-3.6)
    // yanak allığı + fıstık yeşili çene (karına bağlanır) + üstte açık leylak
    const blushC = C(COL.blush);
    const headPaint = (out, v, n) => {
      const lx = v.x, ly = v.y - (1.25 + .22), lz = v.z;   // baş kemiği bind konumuna göre (head bone dünya y = 1.25+.2+.02)
      const k = clamp01(n.y * .5 + .5);
      out.copy(cPurD).lerp(cPur, clamp01(k * 1.5)).lerp(cPurL, clamp01((k - .55) * 1.3) * .6);
      // çene: ağız çizgisinin altı, önde
      const pel = 2;   // çene gölgelendiricide
      // allık (2B: yanakta yatay pembe elips)
      for (const sd of [-1, 1]) {
        const dx = (lx - sd * .158) / .055, dy = (ly - (HC[1] - .105)) / .034, dz = lz - .12;
        const bl = clamp01(1 - Math.sqrt(dx * dx + dy * dy)) * clamp01(dz / .04);
        if (bl > 0) out.lerp(blushC, Math.min(.75, bl * 1.3));
      }
      return pel;
    };
    part(head, headSphere, COL.pur, HC, HR, furMat, [0, 0, 0], { paint: headPaint });
    // burun: küçük, açık leylak yuvarlak çıkıntı (alt yarısı yeşil çene)
    part(head, sphere, COL.purL, MZ, [.108, .082, .085], furMat, [0, 0, 0], {
      paint(out, v, n) {
        const ly = v.y - (1.25 + .22);
        out.copy(cPur).lerp(cPurL, clamp01(n.y * .7 + .55)).lerp(C(0xe8d4ff), clamp01(n.y + n.z - .9) * .5);
        return 2;
      },
    });
    // burun delikleri (minik, koyu leylak)
    for (const sd of [-1, 1]) part(head, tiny, COL.purD, [sd * .028, MZ[1] + .032, MZ[2] + .074], [.0065, .0045, .005]);
    // ağız: gülümseme çizgisi (smile kemiği), "O" ağız (agizO kemiği, normalde 0 ölçek), iki minik diş
    const smile = joint(head, 'smile', 0, mouthY + .004, MZ[2] + .07);
    part(smile, smileG, COL.eye);
    for (const sd of [-1, 1]) part(smile, fangG, 0xffffff, [sd * .0125, -.016, -.006], [1, 1, 1], eyeMat);
    const agizO = joint(head, 'agizO', 0, mouthY - .008, MZ[2] + .062);
    part(agizO, detail, COL.mouth, [0, 0, 0], [.03, .028, .02], eyeMat);
    part(agizO, detail, COL.tongue, [0, -.012, .006], [.018, .01, .016], eyeMat);
    const mouthAnchor = new THREE.Object3D(); mouthAnchor.name = 'Piril mouth'; mouthAnchor.position.set(0, mouthY - .01, MZ[2] + .11); head.add(mouthAnchor);
    // Gözler: kocaman yeşil; beyaz kenar, iris (koyudan açığa), siyah bebek, iki parıltı, kalın üst kirpik çizgisi
    const eyes = [], happies = [], closeds = [], cheeks = [];
    const irisTop = C(0x2b7a26), irisMid = C(0x4fae37), irisBot = C(0xa8e46e), irisRim = C(0x1d4f1a);
    for (const sd of [-1, 1]) {
      const a = sd * .45, ey = HC[1] + .03;
      const ex = Math.sin(a) * HR[0] * .93, ez = HC[2] + Math.cos(a) * HR[2] * .9;
      const eye = joint(head, 'eye' + sd, ex, ey, ez); eye.rotation.set(-.05, a * .9, 0, 'YXZ');
      const rx = .094, ry = .118; bendNow = .27;
      part(eye, eyeSphere, 0xffffff, [0, 0, -.006], [rx, ry, .045], eyeMat);
      part(eye, eyeSphere, 0x4fae37, [0, -.008, .016], [rx * .78, ry * .82, .036], eyeMat, [0, 0, 0], {
        paint(out, v, n, gv) { const t = clamp01((gv.y + 1) / 2), r = Math.hypot(gv.x, gv.y); out.copy(irisBot).lerp(irisMid, clamp01(t * 1.8)).lerp(irisTop, clamp01(t * 1.6 - .6)); out.lerp(irisRim, clamp01((r - .78) / .2) * .7); return 0; },   // kenarda koyu halka
      });
      part(eye, detail, 0x0d0a12, [sd * .004, -.006, .032], [rx * .4, ry * .5, .026], eyeMat);
      part(eye, tiny, 0xffffff, [-.022, .03, .052], [.024, .022, .008], shineMat);
      part(eye, tiny, 0xffffff, [.028, -.04, .05], [.01, .01, .006], shineMat);
      part(eye, lidG, 0x3b2366, [0, 0, .006], [rx, ry, .38]);
      // dış köşede minik kıvrık kirpik
      part(eye, curveTube([[sd * rx * .92, ry * .3, .022], [sd * rx * 1.1, ry * .42, .02], [sd * rx * 1.2, ry * .6, .016]], .005, 8), 0x3b2366);
      eyes.push(eye); bendNow = 0;
      const hp = joint(head, 'mutlu' + sd, ex, ey - .005, ez + .02); hp.rotation.set(-.05, a * .9, 0, 'YXZ');
      part(hp, happyG, COL.eye, [0, 0, 0], [1.3, 1.3, 1.3], furMat, [0, 0, 0], { bend: .27 });
      happies.push(hp);
      // uyku gözü: aşağı kavis "∪" + minik kirpik (2B drClosedEye)
      const cl = joint(head, 'kapali' + sd, ex, ey - .012, ez + .02); cl.rotation.set(-.05, a * .9, Math.PI, 'YXZ');
      part(cl, happyG, COL.eye, [0, 0, 0], [1.25, 1.1, 1.3], furMat, [0, 0, 0], { bend: .27 });
      closeds.push(cl);
      // şişkin yanak (ışık nefesinde): normalde gizli
      const ck = joint(head, 'yanak' + sd, sd * .14, HC[1] - .1, HC[2] + .15);
      part(ck, detail, COL.pur, [0, 0, 0], [.07, .06, .06], furMat, [0, 0, 0], { paint: (o, v, n) => { o.copy(cPur).lerp(blushC, clamp01(n.z * .8 + Math.abs(n.x) * .3 - .2) * .55); return 0; } });
      cheeks.push(ck);
    }
    // Kulaklar: açık yeşil yüzgeçler, başın yanlarından dışarı-geri
    const ears = [];
    for (const sd of [-1, 1]) {
      const eb = joint(head, 'ear' + sd, sd * .225, HC[1] - .06, HC[2] - .03);
      eb.rotation.set(-.45, -sd * .3, sd * .18, 'YXZ');
      part(eb, earG, COL.lime, [0, 0, 0], [sd, 1, 1], furMat, [0, 0, 0], {
        paint(out, v, n, gv) { out.copy(cLimeD).lerp(cLime, clamp01(Math.abs(gv.x) / .06)).lerp(cLimeL, clamp01(Math.abs(gv.x) / .19 - .3) * .8); return 0; },
      });
      ears.push({ b: eb, side: sd, base: eb.rotation.clone() });
    }
    // İbik: koyu yeşil, 3 dilim (başın orta çizgisi)
    const crest = joint(head, 'crest', 0, HC[1] + .06, HC[2] - .08);
    // üç belirgin yuvarlak dilim (önde, tepede en büyük, arkada) + ensede minik dilim; peluş yastık gibi kabarık
    const crestDark = C(COL.crestD), crestMid = C(COL.crest), crestLight = C(COL.crestL);
    const lobePaint = (out, v, n, gv) => { const k = clamp01(gv.y * .5 + .5); out.copy(crestDark).lerp(crestMid, clamp01(k * 1.7)).lerp(crestLight, clamp01(k * 1.8 - 1) * .8); return 0; };
    // dilimler başın tepesinden enseye bir yay üstünde (açı: tepeden geriye); yarısı başa gömülü → yuvarlak yarım ay dilimler
    for (const [ang, R0, r, th] of [[.55, .245, .078, .04], [-.1, .27, .1, .044], [-.78, .25, .085, .04], [-1.38, .215, .056, .032]]) {
      const y = Math.cos(ang) * R0, z = Math.sin(ang) * R0 * 1.05;
      part(crest, sphere, COL.crest, [0, y - .06, z + .08], [th, r, r * .92], furMat, [-ang, 0, 0], { paint: lobePaint });
    }
    // Kollar: kısa, tombul; açık leylak avuç
    const arms = [];
    for (const sd of [-1, 1]) {
      const ab = joint(body, 'arm' + sd, sd * .132, .1, .065);
      const hand = joint(ab, 'hand', 0, -.085, .0);
      part(ab, detail, COL.pur, [0, -.035, 0], [.05, .07, .052], furMat, [0, 0, 0], { paint: shadeLimb });
      part(hand, detail, COL.purL, [0, -.008, .004], [.042, .038, .042], furMat, [0, 0, 0], { paint: (o, v, n) => { o.copy(cPur).lerp(cPurL, clamp01(n.y + .8)); return 0; } });
      ab.rotation.set(-.25, 0, sd * .42); arms.push({ b: ab, hand, side: sd });
    }
    function shadeLimb(out, v, n) { out.copy(cPurD).lerp(cPur, clamp01(n.y * .7 + .8)); return 0; }
    // Bacaklar: tombul uyluk, iri yassı ayak (taban açık leylak)
    const legs = [];
    for (const sd of [-1, 1]) {
      const lb = joint(body, 'leg' + sd, sd * .112, -.12, .03);
      const foot = joint(lb, 'foot', sd * .006, -.075, .02);
      part(lb, sphere, COL.pur, [0, -.01, 0], [.088, .094, .092], furMat, [0, 0, 0], { paint: shadeLimb });
      part(foot, sphere, COL.purL, [0, -.012, .035], [.078, .048, .102], furMat, [0, 0, 0], { paint: (o, v, n) => { o.copy(cPur).lerp(cPurL, clamp01(-n.y * .8 + .5 + n.z * .3)); return 0; } });
      // ayak parmakları (üç minik tümsek)
      for (const t of [-1, 0, 1]) part(foot, tiny, COL.purL, [t * .03, -.008, .118], [.022, .022, .022], furMat, [0, 0, 0], { paint: (o) => { o.copy(cPurL); return 0; } });
      legs.push({ b: lb, foot, side: sd });
    }
    // Kuyruk: 4 kemik zinciri; tüp yüzeyi kemikler arasında yumuşakça bükülür; kürek uç
    const tail = [];
    let tp = joint(body, 'tail0', 0, -.12, -.13); tail.push(tp);
    for (let i = 1; i < 4; i++) { tp = joint(tp, 'tail' + i, 0, 0, -.125); tail.push(tp); }
    const tailRest = [[.42, 0], [-.28, 0], [-.32, 0], [-.3, 0]];
    tail.forEach((b, i) => { b.rotation.x = tailRest[i][0]; });
    part(tail[0], tailG, COL.pur, [0, 0, 0], [1, 1, 1], furMat, [0, 0, 0], {
      paint(out, v, n, gv) { const t = clamp01(-gv.z / .5); out.copy(cPurD).lerp(cPur, clamp01(n.y * .6 + .7)).lerp(cPurL, t * .55 * clamp01(n.y + .6)); return 0; },
      skin(gv) {   // kuyruk boyunca kemik ağırlıkları (her 0.125 m'de bir kemik)
        const u = clamp01(-gv.z / .125 / 3.999) * 3.999 + 0, i = Math.min(3, Math.floor(u)), f = u - i;
        const w = f * f * (3 - 2 * f);
        return i >= 3 ? [tail[3], 1, tail[3], 0] : [tail[i], 1 - w, tail[i + 1], w];
      },
      bindAt: 'tailStraight',
    });
    part(tail[3], spadeG, COL.purL, [0, 0, -.11], [1, 1, 1], furMat, [0, 0, 0], {
      paint(out, v, n) { out.copy(cPur).lerp(cPurL, clamp01(n.y * .5 + .6)); return 0; },
    });
    // kuyruk dikenleri (üstte, küçülerek)
    for (let i = 0; i < 6; i++) {
      const b = tail[Math.min(3, Math.floor(i / 2))], z = -(i % 2) * .062 - .02, r = THREE.MathUtils.lerp(.04, .02, i / 5);
      const rr = THREE.MathUtils.lerp(.1, .042, Math.pow((i * .0625 + .02) / .5, .75));
      part(b, tiny, COL.crest, [0, rr * .86, z], [r * .7, r, r], furMat, [0, 0, 0], { paint: crestPaint });
    }
    // Işık kanatlar: her kanatta üç tüy (yelpaze), kuyruk ucunda parıltı
    // Işıktan EJDERHA kanadı (yarasa/yelken biçimi; böcek kanadı DEĞİL): tek zar, parmak çizgileri, yuvarlak taraklı arka kenar.
    // Zar iki kemiğe yayılır (kök + uç): çırparken uç geriden gelir, kanat yumuşakça bükülür.
    const wings = [];
    const WL = .5;   // kanat boyu (ışık sayısıyla ölçeklenir)
    for (const sd of [-1, 1]) {
      const wb = joint(body, 'wing' + sd, sd * .09, .1, -.14);
      const tb = joint(wb, 'wingTip' + sd, sd * WL * .41, 0, 0);
      // kök dokuda (u .047, v .414); dörtgen kökten dışarı uzanır; renkler dokuda (köşe rengi beyaz)
      part(wb, wingQuad, 0xffffff, [sd * WL * (.5 - .047), (.5 - .414) * WL, 0], [sd * WL, WL, 1], null, [0, 0, 0], {
        wing: true, uvMap: (u, v) => [u * .5, v],
        paint(out) { out.set(0xffffff); return 0; },
        skin(gv) { const t = clamp01((gv.x + .5 - .36) / .32), w = t * t * (3 - 2 * t); return [wb, 1 - w, tb, w]; },
      });
      wings.push({ b: wb, tip: tb, side: sd });
    }
    const tipGlow = joint(tail[3], 'tipGlow', 0, .0, -.19);
    for (const r of [[0, 0, 0], [0, Math.PI / 2, 0], [Math.PI / 2, 0, 0]]) part(tipGlow, quad, 0xffffff, [0, 0, 0], [.2, .2, 1], null, r, {
      wing: true, uvMap: (u, v) => [.5 + u * .5, v], paint(out) { out.set(0xd9c2ff); return 0; },
    });
    // Binme yeri (büyük Pırıl): sırtın üstü
    // binişte gövde ~1.2 rad öne yatar: sırtın ortası (-z yüzü) üste gelir → Feza'nın kalçası buraya oturur
    const saddle = new THREE.Object3D(); saddle.name = 'Piril saddle'; saddle.position.set(0, -.05, -.205); body.add(saddle);

    // ── Birleştirme: malzeme başına tek SkinnedMesh ──
    const wingMat = makeWingMat();
    for (const p of parts) if (p.wing) p.mat = wingMat;
    // Kuyruk bind pozu: tüp geometrisi düz (-z) çizildi; kemikler bind anında düz olmalı
    tail.forEach(b => { b.rotation.x = 0; });
    root.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(bones), meshes = [];
    const v = new THREE.Vector3(), n = new THREE.Vector3(), gv = new THREE.Vector3(), nm = new THREE.Matrix3(), col = new THREE.Color();
    for (const mat of [furMat, eyeMat, shineMat, wingMat]) {
      const list = parts.filter(p => p.mat === mat);
      if (!list.length) continue;
      const positions = [], normals = [], colors = [], uvs = [], pels = [], skinI = [], skinW = [], indices = [];
      let base = 0;
      for (const p of list) {
        const m = p.bone.matrixWorld.clone().multiply(p.m), a = p.geo.attributes, bi = bones.indexOf(p.bone);
        nm.getNormalMatrix(m);
        for (let i = 0; i < a.position.count; i++) {
          gv.fromBufferAttribute(a.position, i);
          if (p.bend) {   // göz parçaları başın küresine sarılır (kenarları başın içine kıvrılır)
            v.copy(gv).applyMatrix4(p.m); v.z -= (v.x * v.x + v.y * v.y * .6) / (2 * p.bend);
            v.applyMatrix4(p.bone.matrixWorld);
          } else v.copy(gv).applyMatrix4(m);
          positions.push(v.x, v.y, v.z);
          n.fromBufferAttribute(a.normal, i).applyMatrix3(nm).normalize(); normals.push(n.x, n.y, n.z);
          col.copy(p.color);
          const pel = p.paint ? p.paint(col, v, n, gv) || 0 : 0;
          colors.push(col.r, col.g, col.b); pels.push(pel);
          let uu = a.uv ? a.uv.getX(i) : 0, vv = a.uv ? a.uv.getY(i) : 0;
          if (p.uvMap) [uu, vv] = p.uvMap(uu, vv);
          uvs.push(uu, vv);
          if (p.skin) { const s = p.skin(gv); skinI.push(bones.indexOf(s[0]), bones.indexOf(s[2]), 0, 0); skinW.push(s[1], s[3], 0, 0); }
          else { skinI.push(bi, 0, 0, 0); skinW.push(1, 0, 0, 0); }
        }
        const index = p.geo.index;
        for (let i = 0; i < (index ? index.count : a.position.count); i++) indices.push(base + (index ? index.getX(i) : i));
        base += a.position.count;
      }
      const g = new THREE.BufferGeometry();
      for (const [key, data, size] of [['position', positions, 3], ['normal', normals, 3], ['color', colors, 3], ['uv', uvs, 2], ['skinWeight', skinW, 4], ['aPel', pels, 1]]) g.setAttribute(key, new THREE.Float32BufferAttribute(data, size));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinI, 4)); g.setIndex(indices); g.computeBoundingSphere();
      const mesh = new THREE.SkinnedMesh(g, mat); mesh.name = 'Piril ' + (mat === furMat ? 'pelus' : mat === eyeMat ? 'goz' : mat === shineMat ? 'parilti' : 'kanat');
      mesh.castShadow = mat === furMat; mesh.receiveShadow = false; mesh.frustumCulled = false;
      if (mat === wingMat) mesh.renderOrder = 2;
      root.add(mesh); mesh.bind(skel); meshes.push(mesh);
    }
    tail.forEach((b, i) => { b.rotation.x = tailRest[i][0]; });
    // yuvarlak gölge (tek küçük şeffaf dörtgen; peluşun gerçek gölgesi kapalı → gölge hep tam altında)
    const golgeMat = new THREE.MeshBasicMaterial({ map: GOLGE_TEX, color: 0x2a1840, transparent: true, depthWrite: false, opacity: .35, toneMapped: false });
    const golgeM = new THREE.Mesh(quad, golgeMat); golgeM.rotation.x = -Math.PI / 2; golgeM.renderOrder = 1; golgeM.name = 'Piril golge';
    root.add(golgeM); let golgeAcik = true;
    for (const ms of meshes) ms.castShadow = false;
    agizO.scale.setScalar(.001); for (const h of happies.concat(closeds, cheeks)) h.scale.setScalar(.001);   // bind'dan SONRA gizle

    // ── Animasyon durumu ──
    let t = Math.random() * 10, ph = 0, glide = 0, glideT = 3, run = 0, blinkAt = 2.2, blink = 0;
    let happy = 0, breath = 0, breathT = 0, waveT = 0, wave = 0, sleep = 0, sleepOn = false, flipT = -1, isikN = 3, isikV = 3;
    let konK = 0, kovT = 0, alkisT = 0, kikirT = 0, hazirT = 0;
    let curl = 0, gerinT = 0, segT = 2.5, segK = 0, segTur = 0;   // uyku molası: kıvrılma, uyanınca esneyip gerinme, uykuda seğirme   // eğlence: başına konma, kuyruk kovalama, alkış, kıkırdama
    let big = 0, pounce = 0, tired = 0, ride = 0, sneezeT = -1, sneezeCb = null, cheerT = 0;
    let lookTarget = null, lookYaw = 0, lookPitch = 0, prevYaw = 0, yawVel = 0;
    const sp = { crest: { a: 0, v: 0 }, earL: { a: 0, v: 0 }, earR: { a: 0, v: 0 } };
    const spring = (s, target, w, z, dt) => { const acc = -w * w * (s.a - target) - 2 * z * w * s.v; s.v += acc * dt; s.a += s.v * dt; return s.a; };
    const wv = new THREE.Vector3(), hv = new THREE.Vector3(), qv = new THREE.Quaternion();
    const ease = u => { u = clamp01(u); return u * u * (3 - 2 * u); };

    // ── Işık nefesi atışı (BILBO.fetchBone yerine): parıltı topları hedeflere uçar ──
    const shots = [];
    const shotGeo = tiny, shotMats = SHOT_MATS;
    let volley = null;
    function mouthWorld() { root.updateMatrixWorld(true); return mouthAnchor.getWorldPosition(new THREE.Vector3()); }
    function fetchBone(hero, targets = [], onHit, options = {}) {
      if (volley || shots.length || !root.parent || (options.canLaunch && !options.canLaunch())) return false;
      volley = { age: 0, targets: targets.slice(0, 5), onHit, options, next: .35, emitted: 0 };
      nefes(1.1 + .16 * Math.max(2, volley.targets.length));
      return true;
    }
    function emitShot(f, index) {
      const target = f.targets[index], origin = mouthWorld();
      const ang = root.rotation.y + (index - 1) * .25;
      const end = target && !target.dead ? new THREE.Vector3(target.x, (target.y || 0) + Math.max(.4, (target.height || 1) * .5), target.z)
        : origin.clone().add(new THREE.Vector3(Math.sin(ang) * 3, -.6, Math.cos(ang) * 3));
      // parıltı topu: parlak çekirdek + yumuşak ışık halesi (sprite)
      const mesh = new THREE.Mesh(shotGeo, shotMats[index % shotMats.length]); mesh.name = 'Piril light puff';
      if (SHOT_HALO[index % SHOT_HALO.length]) { const h = new THREE.Sprite(SHOT_HALO[index % SHOT_HALO.length]); h.scale.setScalar(4); mesh.add(h); }
      mesh.scale.setScalar(.09); mesh.position.copy(origin); mesh.frustumCulled = false; root.parent.add(mesh);
      shots.push({ mesh, from: origin, end, target, onHit: f.onHit, canLaunch: f.options.canLaunch, routeClear: f.options.routeClear, age: 0, duration: .45 + Math.min(8, origin.distanceTo(end)) * .06 });
    }
    function removeShot(s) { if (s.mesh.parent) s.mesh.parent.remove(s.mesh); }
    function updateShots(dt) {
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (s.canLaunch && !s.canLaunch()) { removeShot(s); shots.splice(i, 1); continue; }
        s.age += dt;
        if (s.target && !s.target.dead) s.end.set(s.target.x, (s.target.y || 0) + Math.max(.4, (s.target.height || 1) * .5), s.target.z);
        const u = clamp01(s.age / s.duration), bx = s.mesh.position.x, bz = s.mesh.position.z;
        s.mesh.position.lerpVectors(s.from, s.end, u); s.mesh.position.y += Math.sin(Math.PI * u) * .35;
        s.mesh.position.x += Math.sin(u * 9 + i) * .05 * (1 - u);
        s.mesh.scale.setScalar(.07 + .05 * Math.sin(s.age * 30) * .3 + .03 * (1 - u));
        if (s.routeClear && !s.routeClear(bx, bz, s.mesh.position.x, s.mesh.position.z)) { removeShot(s); shots.splice(i, 1); continue; }
        if (u >= 1) { removeShot(s); shots.splice(i, 1); if (s.target && !s.target.dead && s.onHit) s.onHit(s.target); }
      }
      if (volley) {
        const f = volley;
        if (!root.parent || (f.options.canLaunch && !f.options.canLaunch())) { clearActions(); return; }
        f.age += dt;
        while (f.age >= f.next && f.emitted < Math.max(2, f.targets.length)) { emitShot(f, f.emitted++); f.next += .16; }
        if (f.emitted >= Math.max(2, f.targets.length)) volley = null;
      }
    }
    function clearActions() { volley = null; shots.forEach(removeShot); shots.length = 0; }
    const _fv = new THREE.Vector3();
    function fetchFacing() {
      if (!volley) return null;
      const target = volley.targets.slice(Math.min(volley.emitted, volley.targets.length - 1)).find(e => !e.dead);
      if (!target) return null;
      const o = root.getWorldPosition(_fv);
      return Math.atan2(target.x - o.x, target.z - o.z);
    }

    // ── Eylemler ──
    let kovSure = 2.4, kovTur = 2;
    function kovala(sn, tur) { if (kovT <= 0 && flipT < 0) { kovT = kovSure = sn || 2.4; kovTur = tur || 2; } cheerT = Math.max(cheerT, kovT); return true; }   // kendi kuyruğunu kovalar (tur: kaç dönüş)
    function donus(sn) { return kovala(sn || 1.1, 1); }   // mutlu tek dönüş
    // kanatlar bir kez verilen renkte parlayıp söner (ışık alma anı)
    let flashT = 0; const flashC = new THREE.Color(), _fc = new THREE.Color();
    function kanatParla(renk, sn, guc) { flashC.set(renk); flashT = sn || 1.2; flashSure = flashT; flashGuc = guc || 1.7; return true; }
    let flashGuc = 1.7;
    let flashSure = 1.2;
    // büyüme (final): modelin içinde (lift ölçeği) yumuşak; kök ölçeğini dışarıdan büyüten varsa (eski STORY) kendisi geri çekilir
    // büyüme: k 0..1 (büyüme ilerlemesi), toplam: hedef MUTLAK ölçek (kök ölçeği × iç büyüme). Kök dışarıdan ne kadar ölçeklenirse
    // ölçeklensin (oyun 1,17 · STORY finali 2,03) Pırıl büyüyünce aynı mutlak boya varır → çift büyüme ya da iptal olmaz.
    let growK = 0, growV = 0, growTop = 1, gEff = 1;   // growV: modelin kendi yumuşattığı ilerleme (sinematikte de işler)
    function buyukluk(k, toplam) { growK = clamp01(+k || 0); growTop = Math.max(1, +toplam || 1); return true; }
    function gerin(sn) { gerinT = Math.max(gerinT, sn || 1.9); return true; }   // uyanış: esneme + gerinme
    function hazir(sn) { hazirT = Math.max(hazirT, sn || 1.8); cheerT = Math.max(cheerT, .4); return true; }   // boss girişi: 'hazırım!' (kanatlar açık, kollar yukarı)
    function alkis(sn) { alkisT = Math.max(alkisT, sn || 1.2); cheerT = Math.max(cheerT, alkisT); return true; }
    function kikir(sn) { kikirT = Math.max(kikirT, sn || 1.1); cheerT = Math.max(cheerT, kikirT); return true; }
    function takla() { if (flipT < 0) { flipT = 0; cheerT = Math.max(cheerT, 1.4); } return true; }
    function nefes(sn) { breathT = Math.max(breathT, sn || 1.2); return true; }
    function salla(sn) { waveT = Math.max(waveT, sn || 1.8); return true; }
    function uyu(on) { sleepOn = !!on; }
    function bak(p) { lookTarget = p ? (lookTarget || new THREE.Vector3()).copy(p) : null; }
    function sevin(sn) { cheerT = Math.max(cheerT, sn || 1.5); }
    function isik(n) { isikN = Math.max(0, Math.min(5, +n || 0)); }   // ondalık olabilir (yumuşak büyüme)
    function sneeze(cb) { if (sneezeT >= 0) return false; sneezeT = 0; sneezeCb = typeof cb === 'function' ? cb : null; return true; }

    let kameraRef = null; const _lt = new THREE.Vector3();
    const _qb = new THREE.Quaternion(), _qbi = new THREE.Quaternion(), _qr = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _M = new THREE.Matrix4();
    const _Fw = new THREE.Vector3(), _Rw = new THREE.Vector3(), _X = new THREE.Vector3(), _Xl = new THREE.Vector3(), _N = new THREE.Vector3(), _E = new THREE.Vector3(), _Z = new THREE.Vector3(), _UP = new THREE.Vector3(0, 1, 0);   // m.kamera: binişte kanatları bu kameraya çevir (yoksa oyunun genel 'camera'sı)
    // ── Kare güncellemesi ──
    function update(dt, state = {}) {
      dt = Math.min(Math.max(dt || 0, 0), .1); t += dt;
      const speed = Math.max(0, state.speed || 0);
      run = smooth(run, clamp01(speed / 4.5), 5, dt);
      pounce = smooth(pounce, clamp01(state.pounce || 0), 14, dt);
      tired = smooth(tired, state.sit ? 1 : 0, 3, dt);
      ride = smooth(ride, state.ride ? 1 : 0, 4, dt);
      konK = smooth(konK, state.kon ? 1 : 0, 6, dt);
      kovT = Math.max(0, kovT - dt); alkisT = Math.max(0, alkisT - dt); hazirT = Math.max(0, hazirT - dt); kikirT = Math.max(0, kikirT - dt);
      // büyük Pırıl (final): kökün ölçeğinden anlaşılır (oyunda ~1.2, büyüyünce 2+); binilmemişse "sırtıma bin" daveti
      growV += (growK - growV) * (1 - Math.exp(-2.4 * dt)); if (Math.abs(growK - growV) < .002) growV = growK;
      const gs = growV * growV * (3 - 2 * growV);
      gEff = Math.max(1, THREE.MathUtils.lerp(1, growTop / Math.max(.05, root.scale.x), gs));
      big = smooth(big, Math.max(clamp01((root.scale.x - 1.5) / .5), clamp01((gEff - 1.3) / .5)), 3, dt);
      flashT = Math.max(0, flashT - dt);
      const davet = big * (1 - ride);
      if (state.bark > 1.1 && breathT <= 0) nefes(.9);
      cheerT = Math.max(0, cheerT - dt); breathT = Math.max(0, breathT - dt); waveT = Math.max(0, waveT - dt);
      happy = smooth(happy, Math.max(clamp01(state.happy || 0), cheerT > 0 ? 1 : 0, wave, state.kon ? 1 : 0), 6, dt);
      breath = smooth(breath, breathT > 0 ? 1 : 0, 10, dt);
      wave = smooth(wave, waveT > 0 ? 1 : 0, 7, dt);
      curl = smooth(curl, state.kivril ? 1 : 0, 2.4, dt);
      gerinT = Math.max(0, gerinT - dt);
      sleep = smooth(sleep, sleepOn || tired > .5 || state.kivril ? 1 : 0, 2.2, dt);
      isikV = smooth(isikV, isikN, 2, dt);
      // süzülme: arada kanatlar açık kalır (Ori'deki Sein gibi akıcı), hızlıyken daha sık
      glideT -= dt;
      if (glideT <= 0) glideT = glide > .5 ? 2 + Math.random() * 2.5 : .9 + Math.random() * .8;
      const wantGlide = (glideT < 1.1 && run > .25 && breath < .5 && wave < .5) || ride > .5 ? 1 : 0;
      glide = smooth(glide, wantGlide * (1 - sleep), 4, dt);
      const flapHz = (2.1 + 1.6 * run + 1.4 * pounce) * (1 - .55 * sleep);
      ph += dt * Math.PI * 2 * flapHz * (1 - .85 * glide);
      const fl = Math.sin(ph);
      // havada durma: hafif inip kalkma (kanat vuruşuyla), uykuda daha alçak ve yavaş
      lift.position.y = 1.25 - .32 * sleep - .1 * tired - .62 * ride - .5 * davet + (.045 * Math.sin(t * 2.1) * (1 - sleep) + .022 * Math.sin(ph + 1.2) * (1 - glide)) * (1 - konK) + .02 * Math.sin(t * .9) * sleep
        + (kikirT > 0 ? .06 * Math.abs(Math.sin(t * 9)) : 0);
      lift.position.z = .05 * pounce;
      // gövde: hızla öne eğilir; dalışta daha çok; uykuda kıvrılır
      const lean = (.32 * run + .45 * pounce - .1 * breath + .25 * sleep) * (1 - ride) * (1 - davet) + 1.2 * ride + .75 * davet;   // binişte sırt yataya yakın
      body.rotation.set(lean + .03 * Math.sin(ph + .5) * (1 - glide), 0, 0, 'YXZ');
      // dönüş hızına göre yatış (yaw farkı)
      const yaw = root.rotation.y; let dy = yaw - prevYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); prevYaw = yaw;
      yawVel = smooth(yawVel, dt > 0 ? dy / dt : 0, 6, dt);
      body.rotation.z = Math.max(-.45, Math.min(.45, -yawVel * .12));
      const br = 1 + .018 * Math.sin(t * (sleep > .5 ? 1.6 : 3.2));
      body.scale.set(br, 1 / Math.sqrt(br), br);
      // takla (sevinç): öne tam dönüş, toparlanarak
      if (flipT >= 0) {
        flipT += dt; const u = clamp01(flipT / .95);
        body.rotation.x -= Math.PI * 2 * ease(u);
        lift.position.y += .28 * Math.sin(Math.PI * u);
        if (u >= 1) flipT = -1;
      }
      const tuck = flipT >= 0 ? Math.sin(Math.PI * clamp01(flipT / .95)) : 0;
      // baş: Feza'ya/hedefe bakma (sınırlı), merak dolu küçük eğilmeler
      let ty = 0, tp = 0;
      // büyükken (sırtıma bin daveti) hedef verilmemişse kameraya (çocuğa) bakıp gülümser
      const bakK = lookTarget || (big > .3 && ride < .5 ? (kameraRef || (typeof camera !== 'undefined' && camera && camera.isCamera ? camera : null)) : null);
      if (bakK) {
        const LT = bakK.isObject3D ? bakK.getWorldPosition(_lt) : bakK;
        root.updateMatrixWorld(true);
        head.getWorldPosition(hv); wv.copy(LT).sub(hv);
        qv.copy(root.getWorldQuaternion(qv)).invert(); wv.applyQuaternion(qv);
        ty = Math.max(-1.0, Math.min(1.0, Math.atan2(wv.x, wv.z)));
        tp = Math.max(-.5, Math.min(.5, -Math.atan2(wv.y, Math.hypot(wv.x, wv.z))));
        if (wv.z < -0.2) ty *= .6;
      }
      lookYaw = smooth(lookYaw, ty, 5, dt); lookPitch = smooth(lookPitch, tp, 5, dt);
      neck.rotation.set(-lean * .55 + .2 * sleep - .2 * ride, lookYaw * .35, 0, 'YXZ');
      head.rotation.set(lookPitch * .8 - .12 * breath + .06 * Math.sin(t * 1.3) * (1 - sleep) - .04 * fl * (1 - glide) * (1 - sleep) + .08 * sleep,
        lookYaw * .65 + .05 * Math.sin(t * .7) * (1 - sleep), .1 * Math.sin(t * .8) * (1 - run) * (1 - breath) + .18 * happy * Math.sin(t * 7) * .4 + .25 * sleep, 'YXZ');
      // kanatlar: çırpma (yukarı-aşağı), süzülmede açık ve hafif yukarı; tüyler yelpaze gibi açılır
      // Işık kanatlar: kök (wing) yukarı-aşağı çırpar, uç (wingTip) geriden gelir (bükülme); süzülmede açık, hafif yukarı.
      // Kanat hafifçe geriye süpürülür (yandan da görünsün). Işık sayısıyla büyür.
      const fold = Math.max(sleep, konK);
      const wScale = (.74 + .1 * isikV) * (1 - .35 * fold) * (1 + .3 * ride + .45 * davet);
      const up = fl * .5 + .5;
      const wAng = THREE.MathUtils.lerp(-.75 + 1.0 * up, -.05 + .05 * Math.sin(t * 3), glide);
      const tipLag = Math.sin(ph - 1.1) * .45 * (1 - glide);
      for (const w of wings) {
        const sd = w.side;
        const a = THREE.MathUtils.lerp(wAng, 1.1, fold) + .2 * breath + .5 * tuck + (wave > .01 ? .35 * wave * Math.sin(t * 9) * (sd > 0 ? 1 : .3) : 0);
        w.b.rotation.set(-.85 + .2 * up * (1 - glide) - .15 * run, sd * (.3 + .25 * run + .3 * fold), sd * a, 'YXZ');   // zar arkaya-yukarı yatık: üstten (oyun kamerası) de geniş görünür
        w.b.scale.setScalar(wScale);
        w.tip.rotation.set(0, sd * (.1 + .5 * fold + .15 * tuck), sd * (tipLag + .05 * Math.sin(t * 2.3) - .5 * fold), 'YXZ');
      }
      // kanat ışığı: ışık sayısıyla parlar, uykuda söner
      const glow = (.35 + .13 * isikV) * (1 - .6 * sleep) * (.9 + .1 * Math.sin(t * 5.3));
      wingMat.opacity = Math.min(.95, .42 + .75 * glow);
      wingMat.color.setScalar(.82 + .28 * glow);
      if (flashT > 0) {   // hızlı yanar, tutar, yumuşak söner; kanatlar o renkte güçlü parlar (ton eşlemesiz renk > 1)
        const u = 1 - flashT / flashSure, k = u < .15 ? u / .15 : u > .6 ? (1 - u) / .4 : 1;
        wingMat.color.lerp(_fc.copy(flashC).multiplyScalar(flashGuc), k); wingMat.opacity = Math.min(1, wingMat.opacity + .35 * k);
        tipGlow.scale.multiplyScalar(1 + .8 * k);
      }
      tipGlow.scale.setScalar(.4 + .15 * isikV + .1 * Math.sin(t * 6.5));
      // kuyruk: yılan gibi dalga (ikincil hareket), uçuşta arkaya uzar, mutluyken sallanır
      const wagA = .12 + .28 * happy;
      for (let i = 0; i < tail.length; i++) {
        const lag = i * .7;
        tail[i].rotation.x = tailRest[i][0] * (1 - .55 * run - .4 * glide) + .1 * Math.sin(ph - lag) * (1 - glide) + .05 * Math.sin(t * 1.7 - lag)
          + (i ? -.35 * tuck : .3 * tuck) + (i ? -.15 : .4) * sleep + .2 * pounce * (i ? -1 : 1);
        tail[i].rotation.y = wagA * Math.sin(t * (2.2 + 6 * happy) - lag) + (i ? .45 * sleep : 0) - .12 * yawVel * (i + 1) * .3;
      }
      // ibik ve kulaklar: yaylı gecikme (uçuşta geriye yatar, kanat vuruşunda titrer)
      const crA = spring(sp.crest, -.12 * run - .06 * pounce + .04 * fl * (1 - glide) - .2 * breath, 22, .32, dt);
      crest.rotation.x = crA; crest.rotation.z = .05 * Math.sin(t * 1.9) * (1 - sleep);
      for (const e of ears) {
        const s = e.side < 0 ? sp.earL : sp.earR;
        const a = spring(s, .12 * fl * (1 - glide) - .22 * run - .25 * sleep + .2 * happy * Math.sin(t * 9 + e.side) + .15 * breath, 28, .35, dt);
        e.b.rotation.set(e.base.x, e.base.y - e.side * .25 * run, e.base.z + e.side * a, 'YXZ');
      }
      // kollar: uçarken öne-aşağı sarkar, sallama/takla/nefes
      for (const A of arms) {
        const sd = A.side;
        let rx = -.25 - .3 * run + .08 * Math.sin(ph + 1) * (1 - glide), rz = sd * (.42 - .1 * run);
        if (wave > .01 && sd > 0) { rx = THREE.MathUtils.lerp(rx, -2.5, wave); rz = THREE.MathUtils.lerp(rz, .3 + .45 * Math.sin(t * 10), wave); }
        rx = THREE.MathUtils.lerp(rx, -1.2, tuck); rz = THREE.MathUtils.lerp(rz, sd * .1, tuck);
        rx = THREE.MathUtils.lerp(rx, -.9, sleep * .8); rz = THREE.MathUtils.lerp(rz, -sd * .15, sleep * .8);
        rx = THREE.MathUtils.lerp(rx, -.6, breath * .7);
        A.b.rotation.set(rx, 0, rz, 'YXZ');
      }
      // bacaklar: havada sarkar ve hafifçe sallanır; hızlıyken geriye; taklada toplanır
      for (const L of legs) {
        const sw = .14 * Math.sin(ph * .5 + (L.side > 0 ? 0 : Math.PI)) * (1 - glide) * (1 - sleep);
        L.b.rotation.set(.15 + .9 * run + .3 * glide + sw - 1.1 * tuck - .8 * sleep, 0, L.side * (.08 + .15 * sleep), 'YXZ');
        L.foot.rotation.set(.25 * run + .2 * Math.sin(ph * .5 + 1) * (1 - glide) - .5 * sleep, 0, 0, 'YXZ');
      }
      // yüz: göz kırpma, mutlu gözler, uyku gözü, ağız
      blinkAt -= dt;
      if (blinkAt <= 0) { blink = .16; blinkAt = 2.4 + Math.random() * 2.8; if (Math.random() < .15) blinkAt = .25; }
      blink = Math.max(0, blink - dt);
      const lidK = 1 - .93 * Math.sin(Math.PI * clamp01(blink / .16));
      const shut = Math.max(sleep, sneezeT >= 0 && sneezeT < 1 ? clamp01(sneezeT / .8) : 0);
      const hEye = clamp01(happy * 1.4 - .2) * (1 - shut);
      for (const e of eyes) {
        const big = 1 + .08 * breath;
        const op = (1 - hEye) * (shut > .6 ? 0 : 1);
        e.scale.set(big * op + .001, Math.max(.06, lidK * (1 - shut * .94)) * big * op + .001, big * op + .001);
      }
      for (const h of happies) h.scale.setScalar(Math.max(.001, hEye));
      for (const c of closeds) c.scale.setScalar(shut > .6 ? 1 : .001);
      for (const c of cheeks) c.scale.setScalar(.001 + breath * (1 + .08 * Math.sin(t * 18)));
      const mo = Math.max(breath, clamp01(sneezeT >= 0 ? 1 - Math.abs(sneezeT - 1) * 2 : 0), sleep > .5 ? .35 * Math.max(0, Math.sin(t * .5)) : 0);
      agizO.scale.set(.001 + (.9 + .3 * Math.sin(t * 20) * breath) * mo * (1 + .4 * breath), .001 + mo * (1 + .7 * breath), .001 + mo);
      smile.scale.setScalar(Math.max(.001, 1 - mo * .9) * (1 + .25 * happy));
      // hapşırma (BILBO.sneeze uyumu): başı geri, sonra öne + geri çağırma
      if (sneezeT >= 0) {
        const b4 = sneezeT; sneezeT += dt;
        if (b4 < 1 && sneezeT >= 1 && sneezeCb) { const cb = sneezeCb; sneezeCb = null; try { cb(mouthWorld()); } catch (err) { console.warn('Piril sneeze', err); } }
        if (sneezeT < 1) head.rotation.x -= .3 * ease(sneezeT);
        else { const a = sneezeT - 1; head.rotation.x += .45 * Math.exp(-8 * a); if (a > .8) sneezeT = -1; }
      }
      // ── eğlence pozları ──
      if (kovT > 0) {   // kendi kuyruğunu kovalar: gövde iki tur döner, baş ve kuyruk birbirine bakar
        const u = 1 - kovT / kovSure;
        body.rotation.y += Math.PI * 2 * kovTur * ease(clamp01(u));
        head.rotation.y += .7; neck.rotation.y += .3;
        for (let i = 0; i < tail.length; i++) tail[i].rotation.y += .45 + .1 * i;
      }
      if (alkisT > 0) for (const A of arms) {   // alkış: eller göğsün önünde buluşur
        const c = Math.abs(Math.sin(t * 13));
        A.b.rotation.set(-1.15, 0, A.side * (-.25 + .45 * c), 'YXZ');
      }
      if (hazirT > 0) {   // 'hazırım': dik durur, iki kol yukarı, kanatlar sonuna kadar açık, başı kalkık, kocaman gülümser
        const k = Math.min(1, hazirT / .3, (1.8 - hazirT) / .25 + .0001);
        for (const A of arms) A.b.rotation.set(THREE.MathUtils.lerp(A.b.rotation.x, -2.3, k), 0, THREE.MathUtils.lerp(A.b.rotation.z, A.side * .55, k), 'YXZ');
        for (const w of wings) { w.b.rotation.z = THREE.MathUtils.lerp(w.b.rotation.z, w.side * .55, k); w.tip.rotation.z = THREE.MathUtils.lerp(w.tip.rotation.z, 0, k); w.b.scale.multiplyScalar(1 + .15 * k); }
        body.rotation.x -= .15 * k; head.rotation.x -= .15 * k;
      }
      if (kikirT > 0) { body.rotation.z += .14 * Math.sin(t * 24); head.rotation.z += .1 * Math.sin(t * 24 + 1); }
      if (konK > .01) {   // Feza'nın başına konmuş: oturur (bacaklar önde), kanatlar katlı, gülümser
        for (const L of legs) { L.b.rotation.x = THREE.MathUtils.lerp(L.b.rotation.x, -1.25, konK); L.foot.rotation.x = THREE.MathUtils.lerp(L.foot.rotation.x, .9, konK); }
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, -.08, konK);
        for (let i = 0; i < tail.length; i++) tail[i].rotation.x = THREE.MathUtils.lerp(tail[i].rotation.x, i ? -.15 : -.2, konK);
      }
      if (davet > .01) {   // eğilip sırtını uzatır: baş yukarıda ve gülümser, kuyruk geride, bacaklar toplu
        neck.rotation.x -= .25 * davet; head.rotation.x -= .3 * davet; tail[0].rotation.x -= .7 * davet;
        for (const L of legs) L.b.rotation.x += .5 * davet;
      }
      if (ride > .01) { head.rotation.x -= .35 * ride; for (const L of legs) L.b.rotation.x += .6 * ride; tail[0].rotation.x -= 1.25 * ride; tail[1].rotation.x += .15 * ride; }
      // büyük Pırıl (binis): kanatlar geniş süzülür
      // binişte (gövde ~1,2 rad öne yatık): kanatlar yana açılır, zar yataya yakın; V (dihedral) ile süzülür, yavaş çırpar;
      // kuyruk gövdenin yatışını telafi edip geriye uzanır
      let wrx = .37, wdh = 0;
      if (ride > .01) {   // zarı kameraya çevir (sprite gibi): oyun üstten, ara sahne yandan bakar; ön kenar hep ileride kalır
        const cam = kameraRef || (typeof camera !== 'undefined' && camera && camera.isCamera ? camera : null);
        if (cam) {
          cam.getWorldPosition(wv); body.getWorldPosition(hv);
          const el = (wv.y - hv.y) / (wv.distanceTo(hv) || 1), wk = clamp01((.55 - el) / .35);   // üstten bakan oyun kamerasında 0 (yatay zar en iyisi)
          body.worldToLocal(wv);
          let ro = Math.atan2(-wv.y, wv.z);
          const fy = Math.sin(lean), fz = Math.cos(lean);   // gövde yerelinde dünya-ileri yönü
          if (Math.cos(ro) * fy + Math.sin(ro) * fz < 0) ro += Math.PI;
          const d = Math.atan2(Math.sin(ro - .37), Math.cos(ro - .37));
          wrx = .37 + Math.max(-1.1, Math.min(.12, d)) * .8 * wk;
          wdh = .5 * wk;   // alçak (yandan) kamerada kanatlar V biçiminde yukarı kalkar: yandan da görünür   // yalnız 'uç yukarı' yönde döner (aksi hâlde zar gövdenin altına kaçar)
        }
      }
      if (ride > .01) for (const w of wings) {
        const L = THREE.MathUtils.lerp, sd = w.side, f2 = Math.sin(t * 2.6);
        w.b.rotation.set(L(w.b.rotation.x, wrx, ride), L(w.b.rotation.y, sd * (.22 + wdh + .3 * f2), ride), L(w.b.rotation.z, sd * .3, ride), 'YXZ');   // gövde öne yatıkken y ekseni ≈ dünyada ileri: y açısı = V + çırpma
        w.tip.rotation.z = L(w.tip.rotation.z, sd * .25 * Math.sin(t * 2.6 - 1), ride);
      }
      // Kanatları kameraya göster (binilmediğinde): zar kanat açıklığı ekseni çevresinde kameraya döner, ön kenarı ileri-yukarı kalır.
      // Büyükken (davet) tamamen, oyunda küçükken kısmen (üstten bakan kamerada da ışık zarı hep geniş görünsün).
      const camW = Math.max(davet, .7 * (1 - fold) * (1 - ride) * (1 - big)) * (1 - tuck) * (kovT > 0 ? 0 : 1);
      const kam = kameraRef || (typeof camera !== 'undefined' && camera && camera.isCamera ? camera : null);
      if (camW > .01 && kam) {
        body.updateWorldMatrix(true, false); body.getWorldQuaternion(_qb); _qbi.copy(_qb).invert();
        root.getWorldQuaternion(_qr); _Fw.set(0, 0, 1).applyQuaternion(_qr); _Fw.y = 0; _Fw.normalize(); _Rw.set(_Fw.z, 0, -_Fw.x);
        kam.getWorldPosition(wv);
        const dih = THREE.MathUtils.lerp(-.3 + .95 * up, .3 + .04 * Math.sin(t * 3), glide) * (1 - davet) + (.45 + .35 * Math.sin(t * 2.2)) * davet + (hazirT > 0 ? .55 : 0);   // hazırım: kanatlar V'de yukarı
        for (const w of wings) {
          const sd = w.side;
          w.b.getWorldPosition(hv);
          _X.copy(_Rw).multiplyScalar(sd * Math.cos(dih)).addScaledVector(_UP, Math.sin(dih)).addScaledVector(_Fw, -.25).normalize();   // açıklık (dışarı, hafif geri)
          _N.copy(wv).sub(hv).normalize(); _N.addScaledVector(_X, -_N.dot(_X));
          if (_N.lengthSq() < 1e-4) _N.copy(_UP);
          _N.normalize();
          _E.crossVectors(_N, _X);                                           // ön kenar adayı (zar düzleminde, açıklığa dik)
          if (_E.dot(_Fw) + .6 * _E.y < 0) _E.negate();
          _Xl.copy(_X).multiplyScalar(sd); _Z.crossVectors(_Xl, _E);
          _M.makeBasis(_Xl, _E, _Z); _qw.setFromRotationMatrix(_M).premultiply(_qbi);
          w.b.quaternion.slerp(_qw, camW);
        }
      }
      // ── Uyku molası: kıvrılıp uyuyan yavru ejderha (karnının üstünde yatar, başı ön patilerinde, kuyruk gövdeye dolanmış,
      //    kanatlar battaniye gibi sırtında katlı; yavaş nefes; arada kulak/kanat seğirmesi) ──
      for (const w of wings) w.b.position.set(w.side * .09, THREE.MathUtils.lerp(.1, .0, curl), THREE.MathUtils.lerp(-.14, -.205, curl));
      if (curl > .005) {
        const L = THREE.MathUtils.lerp, c = curl;
        segT -= dt; if (segT <= 0) { segT = 2.2 + Math.random() * 3; segK = 1; segTur = Math.random() < .6 ? 0 : 1; }
        segK = Math.max(0, segK - dt * 4); const sg = Math.sin(segK * Math.PI * 3) * segK;
        lift.position.y = L(lift.position.y, .2, c);
        body.rotation.x = L(body.rotation.x, 1.42, c); body.rotation.z = L(body.rotation.z, .1, c); body.rotation.y = L(body.rotation.y, 0, c);
        const nf = 1 + .035 * Math.sin(t * 1.5);   // yavaş nefes: sırt hafifçe şişip iner
        body.scale.set(L(body.scale.x, nf, c), L(body.scale.y, 1, c), L(body.scale.z, nf * 1.02, c));
        neck.rotation.set(L(neck.rotation.x, -1.22, c), L(neck.rotation.y, .2, c), 0, 'YXZ');
        head.rotation.set(L(head.rotation.x, -.12, c), L(head.rotation.y, .12, c), L(head.rotation.z, .3, c), 'YXZ');
        for (const A of arms) A.b.rotation.set(L(A.b.rotation.x, .3, c), 0, L(A.b.rotation.z, A.side * .12, c), 'YXZ');
        for (const Lg of legs) { Lg.b.rotation.set(L(Lg.b.rotation.x, -1.0, c), 0, L(Lg.b.rotation.z, Lg.side * .35, c), 'YXZ'); Lg.foot.rotation.x = L(Lg.foot.rotation.x, .6, c); }
        tail[0].rotation.set(L(tail[0].rotation.x, -1.3, c), L(tail[0].rotation.y, .55, c), 0, 'YXZ');
        for (let i = 1; i < tail.length; i++) tail[i].rotation.set(L(tail[i].rotation.x, .05, c), L(tail[i].rotation.y, .78 + .03 * Math.sin(t * .8 + i), c), 0, 'YXZ');
        for (const w of wings) {
          const tw = segTur === 1 ? .12 * sg : 0;
          w.b.rotation.set(L(w.b.rotation.x, .0, c), L(w.b.rotation.y, -w.side * .55, c), L(w.b.rotation.z, w.side * (-1.62 + tw), c), 'YXZ');   // y: zar böğrüne doğru sarkar (battaniye)
          w.tip.rotation.set(0, L(w.tip.rotation.y, 0, c), L(w.tip.rotation.z, w.side * -.25, c), 'YXZ');
          w.b.scale.setScalar(L(w.b.scale.x, .85, c));
        }
        for (const e of ears) e.b.rotation.z += e.side * (L(0, -.35, c) + (segTur === 0 ? .45 * sg : 0));
      }
      if (gerinT > 0) {   // uyanış: önce kocaman esneme (gözler kapalı, ağız O), sonra kollar ve kanatlar yukarı gerinme
        const u = 1 - gerinT / 1.9, k = Math.sin(Math.PI * clamp01(u));
        for (const A of arms) A.b.rotation.set(THREE.MathUtils.lerp(A.b.rotation.x, -2.6, k), 0, THREE.MathUtils.lerp(A.b.rotation.z, A.side * .7, k), 'YXZ');
        for (const w of wings) w.b.rotation.z = THREE.MathUtils.lerp(w.b.rotation.z, w.side * 1.0, k);
        body.rotation.x -= .22 * k; head.rotation.x -= .3 * k;
        const yw = u < .6 ? Math.sin(Math.PI * u / .6) : 0;   // esneme
        agizO.scale.set(.001 + 1.3 * yw, .001 + 1.9 * yw, .001 + yw); smile.scale.setScalar(Math.max(.001, 1 - yw));
        for (const e of eyes) if (yw > .2) e.scale.set(.001, .001, .001);
        for (const c2 of closeds) c2.scale.setScalar(yw > .2 ? 1 : .001);
      }
      // büyüme: lift ölçeği (gövde merkezinde büyür); büyüdükçe havada durma yüksekliği de artar (yere gömülmesin)
      lift.scale.setScalar(gEff);
      if (gEff !== 1) lift.position.y += .34 * (gEff - 1);   // büyüyünce ayaklar yere gömülmesin (yalnız gereken kadar yükselir)
      // yumuşak yuvarlak gölge: tam altında, yükseldikçe küçülüp solar (ışığın açısından bağımsız; gerçek gölge kapalı)
      if (golgeAcik) {
        const rs = root.scale.x || 1, h = Math.max(0, root.position.y + lift.position.y * rs);
        const k = clamp01(h / (2.4 * Math.max(1, gEff)));
        golgeM.position.set(0, (.015 - root.position.y) / rs, 0);
        golgeM.scale.setScalar(THREE.MathUtils.lerp(.62, .34, k) * gEff * (1 - .35 * konK));
        golgeMat.opacity = THREE.MathUtils.lerp(.5, .2, k) * (1 - .8 * konK);
      }
      root.updateMatrixWorld(true);
      updateShots(dt);
    }
    update(0);
    // ── Süsler (Gardırop / Pırıl'ın Köşesi): kemiklere takılan tek parça (tek çizim) küçük modeller; tembel kurulur ──
    const accCache = {}; let accId = null;
    function setAccessory(id) {
      id = id && ACC_BUILD[id] ? id : null;
      if (id === accId) return true;
      if (accId && accCache[accId]) accCache[accId].visible = false;
      accId = id;
      if (!id) return true;
      if (!accCache[id]) { const r = ACC_BUILD[id](); const b = { head, neck, body }[r.bone]; r.mesh.position.fromArray(r.pos); r.mesh.rotation.fromArray(r.rot || [0, 0, 0]); r.mesh.scale.setScalar(r.sc || 1); b.add(r.mesh); accCache[id] = r.mesh; }
      accCache[id].visible = true; return true;
    }
    function dispose() { clearActions(); golgeMat.dispose(); for (const k in accCache) { const g = accCache[k]; if (g.parent) g.parent.remove(g); g.geometry.dispose(); } meshes.forEach(m => m.geometry.dispose()); wingMat.dispose(); skel.dispose(); }
    const m = {
      root, update, dispose, bones, meshes, mouthAnchor, saddle, head, neck, body, lift,
      fetchBone, fetchFacing, clearActions, isFetching: () => !!volley || shots.length > 0, fetchStage: () => volley ? 'spray' : shots.length ? 'spray' : 'idle',
      setAccessory, accessory: () => accId, sneeze, isSneezing: () => sneezeT >= 0,
      takla, nefes, salla, uyu, bak, sevin, isik, agiz: mouthWorld, kovala, alkis, kikir, hazir, gerin, donus, kanatParla, buyukluk, golge: on => { golgeAcik = !!on; golgeM.visible = golgeAcik; },
      haleMalzemesi: renk => new THREE.SpriteMaterial({ map: GOLGE_TEX, color: renk, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: .85 }), kivrik: () => curl > .5,
      kuyrukKovaliyor: () => kovT > 0, kikirliyor: () => kikirT > 0, konmus: () => konK > .5, ayakYuksekligi: () => lift.position.y - .3,
      isikSayisi: () => isikN, uyuyor: () => sleep > .5, taklaAtiyor: () => flipT >= 0,
      get yukseklik() { return lift.position.y; },
      get kamera() { return kameraRef; }, set kamera(c) { kameraRef = c || null; },
    };
    return m;
  }

  // Bağımsız kullanım (ev ekranı / vitrin): PIRIL.yap({ isik, uyku, ucus }) → m.group + m.guncelle(dt)
  function yap(opts = {}) {
    const m = create();
    m.group = m.root;
    m.durum = { speed: opts.ucus ? 2.5 : 0, happy: 0 };
    if (opts.isik != null) m.isik(opts.isik);
    if (opts.uyku) m.uyu(true);
    m.golge(!!opts.golge);   // bağımsız kullanımda (ev kapısı) yer yok: gölge kapalı (opts.golge: true açar)
    m.guncelle = dt => m.update(dt, m.durum);
    return m;
  }

  let portraitUrl = null;
  function portrait() {
    if (portraitUrl) return portraitUrl;
    if (typeof renderer === 'undefined') return null;
    const N = 192, sc = new THREE.Scene(), m = create(); m.update(0, {}); m.root.position.y = -1.25; m.root.rotation.y = -.32; sc.add(m.root);
    m.isik(5); for (let i = 0; i < 12; i++) m.update(.05, {});
    sc.add(new THREE.HemisphereLight(0xfff3ff, 0x6a5a8a, 1.6));
    const key = new THREE.DirectionalLight(0xfff0e0, 2.6); key.position.set(-3, 4, 5); sc.add(key);
    const cam = new THREE.OrthographicCamera(-.4, .4, .4, -.4, .1, 10);
    cam.position.set(.05, .5, 4); cam.lookAt(0, .4, 0); cam.updateMatrixWorld();
    const rt = new THREE.WebGLRenderTarget(N, N, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const oldRT = renderer.getRenderTarget(), oldC = renderer.getClearColor(new THREE.Color()), oldA = renderer.getClearAlpha();
    try {
      renderer.setRenderTarget(rt); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(sc, cam);
      const pixels = new Uint8Array(N * N * 4); renderer.readRenderTargetPixels(rt, 0, 0, N, N, pixels);
      const c = document.createElement('canvas'); c.width = c.height = N;
      const ctx = c.getContext('2d'), out = ctx.createImageData(N, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const a = ((N - 1 - y) * N + x) * 4, b = (y * N + x) * 4, alpha = pixels[a + 3], k = alpha > 0 ? 255 / alpha : 0;
        for (let j = 0; j < 3; j++) out.data[b + j] = Math.min(255, pixels[a + j] * k);
        out.data[b + 3] = alpha;
      }
      ctx.putImageData(out, 0, 0); portraitUrl = c.toDataURL('image/png'); return portraitUrl;
    } finally { renderer.setRenderTarget(oldRT); renderer.setClearColor(oldC, oldA); rt.dispose(); m.dispose(); }
  }
  // ── Süs modelleri: her biri tek BufferGeometry (köşe renkli) + paylaşılan malzeme ──
  const accMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45, metalness: .05 });
  const accShiny = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .25, metalness: .45, emissive: 0x3a2a00, emissiveIntensity: .25 });
  function birlestir(list) {   // [geo, renk, [x,y,z], [sx,sy,sz], [rx,ry,rz]] → tek geometri (renkli)
    const pos = [], nor = [], col = [], idx = []; let base = 0;
    const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3(), c = new THREE.Color();
    for (const [g, renk, p, sc, r] of list) {
      m.compose(new THREE.Vector3(...(p || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r || [0, 0, 0]))), new THREE.Vector3(...(sc || [1, 1, 1])));
      nm.getNormalMatrix(m); c.set(renk);
      const a = g.attributes;
      for (let i = 0; i < a.position.count; i++) {
        v.fromBufferAttribute(a.position, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(a.normal, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
        col.push(c.r, c.g, c.b);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i)); else for (let i = 0; i < a.position.count; i++) idx.push(base + i);
      base += a.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); out.setIndex(idx); return out;
  }
  const accMesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat || accMat); m.castShadow = true; return m; };
  const capGeo = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const torus = (R, r) => new THREE.TorusGeometry(R, r, 8, 28);
  const ACC_BUILD = {
    // 1 · Işıklı Mantar Vadisi: pembe benekli minik mantar şapka (başın yanında, ibiğe değmez)
    mantar() {
      const L = [[capGeo, 0xff7fb8, [0, 0, 0], [.1, .075, .1]], [detail, 0xfff4ea, [0, -.004, 0], [.085, .018, .085]]];
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + .3, r = i % 2 ? .06 : .035; L.push([detail, 0xffffff, [Math.sin(a) * r, Math.sqrt(Math.max(0, 1 - (r / .1) ** 2)) * .075 - .004, Math.cos(a) * r], [.016, .008, .016]]); }
      return { mesh: accMesh(birlestir(L)), bone: 'head', pos: [.16, .28, .05], rot: [.1, 0, -.55], sc: 1.4 };
    },
    // 2 · Mercan Denizi: inci kolye
    inci() {
      const L = [];
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; L.push([detail, i % 6 === 0 ? 0xffd6ec : 0xfffaf2, [Math.sin(a) * .178, -.03 * Math.max(0, Math.cos(a)), Math.cos(a) * .17], [.024, .024, .024]]); }
      L.push([detail, 0xff9ccc, [0, -.055, .185], [.036, .036, .026]]);
      return { mesh: accMesh(birlestir(L), accShiny), bone: 'body', pos: [0, .1, .012], rot: [.12, 0, 0] };
    },
    // 3 · Kum Saati Çölü: turuncu-sarı fular (boyunda düğüm, ucu sallanır)
    fular() {
      const L = [[torus(.175, .034), 0xffb347, [0, 0, 0], [1, 1, .96], [Math.PI / 2, 0, 0]],
        [detail, 0xff9a2e, [.07, -.02, .165], [.045, .04, .035]],
        [detail, 0xffb347, [.1, -.09, .17], [.034, .07, .018], [0, 0, .4]], [detail, 0xffc76a, [.045, -.095, .175], [.03, .065, .018], [0, 0, -.2]]];
      return { mesh: accMesh(birlestir(L)), bone: 'body', pos: [0, .1, .012], rot: [.12, 0, 0] };
    },
    // 4 · Oyuncak Atölyesi: kırmızı puantiyeli papyon
    papyon() {
      const L = [[detail, 0xe8384f, [-.05, 0, 0], [.055, .04, .022], [0, 0, .25]], [detail, 0xe8384f, [.05, 0, 0], [.055, .04, .022], [0, 0, -.25]],
        [detail, 0xc42a40, [0, 0, .008], [.02, .022, .02]]];
      for (const [x, y] of [[-.06, .01], [-.035, -.015], [.06, .01], [.035, -.015]]) L.push([tiny, 0xffffff, [x, y, .018], [.008, .008, .004]]);
      return { mesh: accMesh(birlestir(L)), bone: 'body', pos: [0, .085, .19], rot: [-.25, 0, 0] };
    },
    // 5 · Gökkuşağı Adaları: yıldızlı altın taç, gökkuşağı taşlı
    tac() {
      const band = new THREE.CylinderGeometry(.075, .082, .04, 20, 1, true);
      const L = [[band, 0xffcf3f, [0, 0, 0]], [torus(.08, .008), 0xffe17a, [0, -.02, 0], [1, 1, 1], [Math.PI / 2, 0, 0]]];
      const gem = [0xff6b8a, 0xffa04d, 0x5fd27a, 0x4dabf7, 0xb98cff];
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        L.push([detail, 0xffcf3f, [Math.sin(a) * .078, .035, Math.cos(a) * .078], [.018, .03, .018]]);
        L.push([detail, gem[i], [Math.sin(a) * .084, 0, Math.cos(a) * .084], [.013, .013, .008], [0, a, 0]]);
      }
      return { mesh: accMesh(birlestir(L), accShiny), bone: 'head', pos: [-.15, .3, .06], rot: [.05, 0, .5], sc: 1.35 };
    },
  };
  // Her ışıkla bir süs açılır (07: ACCESSORIES[ışık-1]); sıra bölümlerle aynı
  const ACCESSORIES = Object.freeze([
    { id: 'mantar', ad: 'Mantar Şapka', simge: '🍄' },
    { id: 'inci', ad: 'İnci Kolye', simge: '🦪' },
    { id: 'fular', ad: 'Çöl Fuları', simge: '🧣' },
    { id: 'papyon', ad: 'Papyon', simge: '🎀' },
    { id: 'tac', ad: 'Gökkuşağı Tacı', simge: '👑' },
  ]);
  return { create, yap, portrait, ACCESSORIES, RENK: COL };
})();
