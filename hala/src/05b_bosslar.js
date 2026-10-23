/* ── Dev Ev bossları: modeller (EMODEL Rig'i ile, tek iskeletli örgü) + kayıt ──
   Dört sevimli, komik boss (korkutucu hiçbir şey yok; huysuzlukları yaramazlık, sonunda kocaman sevinç):
     uykucuSupurge  Uykucu Süpürge (Oturma Odası) — uyku şapkalı, uykulu gözlü elektrikli süpürge; hortum kolu, fişli kablo kuyruğu
     dudukluTencere Düdüklü Tencere (Mutfak)      — parlak çelik tencere, fıs fıs düdüklü kapak, sap kolları, minik ayaklar
     dondurmaKrali  Dondurma Kralı (Buzdolabı)    — külah tabakta üç top dondurma, külah taç + kiraz, gofret kollar, kaşık asa
     kocaPasta      Koca Huysuz Pasta (final)     — üç katlı pasta, mum şapka (neşelenince yanar), önde 4 malzeme yuvası
   + kurabiyeAsker (pastanın çağırdığı zencefilli kurabiye asker). Hamleler src/05c_boss_davranis.js (BOSSDAV), sesler src/02l_boss.js.
   Model hâlleri (st.phase): idle, move, roar (giriş), summon + her bossun kendi hamleleri (05c ile aynı adlar). */
(() => {
  'use strict';
  const E = EMODEL, K = E && E.KIT;
  const reg = (id, def) => HUYSUZ.boss(id, def);
  if (!E || !E.register || !K) {   // (eski EMODEL: yer tutucu modellerle yine çalışır)
    reg('uykucuSupurge', { ad: 'Uykucu Süpürge', base: 'kraljole' }); reg('dudukluTencere', { ad: 'Düdüklü Tencere', base: 'kefirdev' });
    reg('dondurmaKrali', { ad: 'Dondurma Kralı', base: 'lavkaplumbaga' }); reg('kocaPasta', { ad: 'Koca Huysuz Pasta', base: 'sovalye' });
    HUYSUZ.zone('oturma', { boss: 'uykucuSupurge' }); HUYSUZ.zone('mutfak', { boss: 'dudukluTencere' }); HUYSUZ.zone('buzdolabi', { boss: 'dondurmaKrali' }); HUYSUZ.zone('pasta', { boss: 'kocaPasta' });
    return;
  }
  const { G, PI, col, hdr, mixc, vgrad, qz, qy, lathe, onLathe, face, heartGeo, star5Geo, strawberry, gloss, profR, act, bump, bph, bpt, hurtSide, preAggro, GOLD } = K;
  const _c = new THREE.Color();
  // Uykulu göz kapakları: her gözün üstünde gövde renginde yarım küre kapak + ince kirpik çizgisi, ikisi bir 'lids' kemiğinde
  // (kemik iki gözün merkez çizgisinde; anim rotation.x ile kapar: 0 = gözün yarısı, + = kapanır, − = açılır).
  function lids(r, bone, c, R, tilt, ex, ey, er, lidCol, lashCol) {
    const inset = er * 0.3, eu = new THREE.Euler(-tilt, 0, 0), p0 = onSphere(ex, ey, R, inset)[0];
    const ec = new THREE.Vector3(0, p0[1], p0[2]).applyEuler(eu).add(new THREE.Vector3(...c));
    r.bone('lids', bone, [0, ec.y, ec.z]);
    r.on('lids').push(c, [-tilt, 0, 0]);
    for (const sd of [-1, 1]) {
      const [p, q] = onSphere(sd * ex, ey, R, inset); r.push(p, q);
      r.fx(0, 0.6).add(G.hemi(24), lidCol, [0, 0, 0], null, [er * 1.16, er * 1.26, er * 0.78]);
      r.fx(0, 0.3).add(G.torus(PI, 0.09, 18), lashCol, [0, 0, 0], [PI / 2, 0, 0], [er * 1.13, er * 0.76, er * 0.9]);
      r.pop();
    }
    r.pop().fx(0, 0);
  }
  const wobK = (s, dt, base) => { s.wobA = damp(s.wobA ?? base, base, 3, dt); return s.wobA; };

  // ════════════════ 1. Uykucu Süpürge ════════════════
  // Lavanta-mavi gövde (yumuşak yumurta biçimi), pembe tampon, iki büyük arka teker, üstte açma düğmesi ve uyku şapkası
  // (mavi-beyaz çizgili, ponponlu, ucu sarkar). Sağ yanda halkalı hortum → krom boru → fırçalı emme başlığı (ağız gibi).
  // Arkada kıvrık kablo ve sevimli fiş (kuyruk). Gözler hep uykulu (yarı kapalı), sık sık esner.
  const SUP = { body: '#7b90e4', bodyL: '#aebfff', bodyD: '#4a5cb4', bump: '#ff9ec2', tire: '#3c3f55', hub: '#f4f6ff', hose: '#9aa3c9', hoseD: '#6d77a6', chrome: '#e6ebf5' };
  function buildSupurge(r) {
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('cap', 'body', [0.05, 2.02, -0.05]); r.bone('capTip', 'cap', [0.35, 2.75, -0.2]);
    r.bone('hose', 'body', [1.02, 1.25, 0.35]); r.bone('wand', 'hose', [1.62, 1.18, 1.28]); r.bone('nozzle', 'wand', [1.5, 0.22, 2.15]);
    r.bone('cab1', 'body', [0, 0.55, -1.2]); r.bone('cab2', 'cab1', [0.2, 0.2, -2.05]); r.bone('plug', 'cab2', [-0.15, 0.22, -2.85]);
    r.bone('wheelL', 'body', [1.08, 0.48, -0.45]); r.bone('wheelR', 'body', [-1.08, 0.48, -0.45]);
    // gövde: yumuşak, hafif ileri eğik yumurta + parlak boya
    r.on('body').fx(0, 1);
    r.add(G.sphere(40, 28), vgrad(0.15, 2.1, [[0, SUP.bodyD], [0.45, SUP.body], [1, mixc(SUP.body, SUP.bodyL, 0.55)]]), [0, 1.12, 0], [0.12, 0, 0], [1.18, 1.0, 1.28]);
    gloss(r, [-0.55, 1.75, 0.55], [-0.45, 0.7, 0.5], 0.22, 0.09, 1.2, 0.6);
    gloss(r, [0.62, 1.62, -0.55], [0.5, 0.6, -0.4], 0.12, 0.05, 1.1, -0.4);
    // tampon (yumuşak pembe halka) + alt gölge kısmı
    r.fx(0, 0.4).add(G.torus(PI * 2, 0.12, 56), SUP.bump, [0, 0.5, 0.02], [PI / 2, 0, 0], [1.1, 1.2, 0.9]);
    r.fx(0, 0.2).add(G.sphere(28, 12), SUP.bodyD, [0, 0.42, 0], null, [1.02, 0.28, 1.12]);
    // üstte: açma düğmesi (yuvarlak pembe) + güç kadranı + taşıma tutamağı kemeri
    r.fx(0.2, 1).add(G.sphere(18, 12), hdr('#ff6fa8', 1.15), [0.42, 2.0, 0.42], null, [0.17, 0.08, 0.17]);
    r.fx(0, 1).add(G.cyl(1, 1, 20), '#f7f3ff', [-0.45, 1.98, 0.38], [0.15, 0, 0.1], [0.16, 0.08, 0.16]);
    r.add(G.box(), SUP.bodyD, [-0.45, 2.03, 0.5], [0.15, 0, 0.1], [0.03, 0.03, 0.12]);
    // arka hava ızgarası (gülümseyen çizgiler)
    r.fx(0, 0.3);
    for (let i = 0; i < 4; i++) r.add(G.capsule(1, 8), SUP.bodyD, [0, 1.0 + i * 0.16, -1.24 + i * 0.03], [0, 0, PI / 2], [0.035, 0.32 - Math.abs(i - 1.5) * 0.07, 0.035]);
    // ön teker (minik, tamponun altında)
    r.fx(0, 0.5).add(G.sphere(14, 10), SUP.tire, [0, 0.13, 0.95], null, 0.13);
    // büyük arka tekerler (lastik + beyaz jant + pembe göbek)
    for (const sd of [1, -1]) {
      r.on(sd > 0 ? 'wheelL' : 'wheelR');
      const x = sd * 1.08;
      r.fx(0, 0.3).add(G.torus(PI * 2, 0.42, 40), SUP.tire, [x, 0.48, -0.45], [0, PI / 2, 0], [0.36, 0.36, 0.5]);
      r.fx(0, 1).add(G.cyl(1, 1, 28), SUP.hub, [x + sd * 0.02, 0.48, -0.45], [0, 0, PI / 2], [0.3, 0.2, 0.3]);
      r.add(G.sphere(16, 10), '#ff9ec2', [x + sd * 0.12, 0.48, -0.45], null, [0.06, 0.11, 0.11]);
      for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2; r.add(G.sphere(8, 6), '#c4cbe8', [x + sd * 0.11, 0.48 + Math.sin(a) * 0.19, -0.45 + Math.cos(a) * 0.19], null, 0.035); }
    }
    // uyku şapkası: çizgili koni (4 halka) + sarkan uç + ponpon
    const stripe = i => (i % 2 ? '#ffffff' : '#5d8fe8');
    r.on('cap').fx(0, 0.15, 1).uv(3, 3);
    r.add(G.torus(PI * 2, 0.3, 32), '#ffffff', [0.05, 2.02, -0.05], [PI / 2 + 0.12, 0, -0.15], [0.62, 0.62, 0.5]);
    for (let i = 0; i < 3; i++) {
      const y0 = 2.06 + i * 0.22, rb = 0.58 - i * 0.14, rt = 0.58 - (i + 1) * 0.14;
      r.add(G.cyl(rt / rb, 1, 26), stripe(i), [0.05 + i * 0.07, y0 + 0.11, -0.05 - i * 0.04], [-0.12, 0, -0.22], [rb, 0.23, rb]);
    }
    r.on('capTip');
    r.add(G.cyl(0.35, 1, 20), stripe(1), [0.42, 2.78, -0.2], [0, 0, -1.1], [0.16, 0.34, 0.16]);
    r.add(G.cyl(0.3, 1, 16), stripe(0), [0.68, 2.62, -0.22], [0, 0, -1.75], [0.08, 0.26, 0.08]);
    r.uv(null).fx(0, 0.1, 1).add(G.sphere(18, 12), '#ffffff', [0.86, 2.48, -0.22], null, 0.15);
    r.fx(0, 0);
    // hortum (halkalı) — gövdeden boruya
    const H0 = new THREE.Vector3(1.02, 1.25, 0.35), H1 = new THREE.Vector3(1.55, 1.75, 0.6), H2 = new THREE.Vector3(1.75, 1.6, 1.05), H3 = new THREE.Vector3(1.62, 1.18, 1.28);
    const hc = new THREE.CatmullRomCurve3([H0, H1, H2, H3]);
    r.on('hose').fx(0, 0.5);
    r.add(G.cyl(1, 1, 20), SUP.bodyD, [1.0, 1.24, 0.33], [0, 0, PI / 2 - 0.4], [0.24, 0.16, 0.24]);
    for (let i = 0; i <= 16; i++) {
      const u = i / 16, p = hc.getPoint(u), tg = hc.getTangent(u);
      r.add(G.torus(PI * 2, 0.32, 18), i % 2 ? SUP.hose : SUP.hoseD, [p.x, p.y, p.z], qz(tg.x, tg.y, tg.z), [0.15, 0.15, 0.16]);
    }
    // krom boru + tutamak
    r.on('wand').fx(0, 1);
    r.seg([1.62, 1.18, 1.28], [1.5, 0.36, 2.05], 0.085, SUP.chrome, 0.085, 14);
    r.add(G.sphere(14, 10), '#ff9ec2', [1.62, 1.2, 1.28], null, 0.13);
    // emme başlığı: geniş, yumuşak köşeli, altta fırça, önde "ağız" yarığı
    r.on('nozzle').fx(0, 0.8);
    r.add(G.cyl(1, 1, 14), SUP.chrome, [1.5, 0.33, 2.08], [0.55, 0, 0], [0.11, 0.18, 0.11]);
    r.fx(0, 1).add(G.rbox(3), SUP.body, [1.5, 0.2, 2.2], [0, 0.0, 0], [0.95, 0.24, 0.42]);
    r.fx(0, 0.2).add(G.rbox(2), '#3a3550', [1.5, 0.16, 2.42], null, [0.8, 0.08, 0.04]);
    for (let k = 0; k < 9; k++) r.add(G.box(), '#ffd36b', [1.5 - 0.4 + k * 0.1, 0.05, 2.2], null, [0.04, 0.08, 0.34]);
    r.fx(0.3, 0.6).add(G.sphere(10, 8), hdr('#ff9ec2', 1.1), [1.12, 0.26, 2.4], null, [0.06, 0.06, 0.03]).add(G.sphere(10, 8), hdr('#ff9ec2', 1.1), [1.88, 0.26, 2.4], null, [0.06, 0.06, 0.03]);
    r.mark('muzzle', [1.5, 0.3, 2.55]);
    // kablo kuyruğu + fiş
    r.on('cab1').fx(0, 0.4);
    r.seg([0, 0.6, -1.15], [0.15, 0.32, -1.65], 0.07, '#4a4d68', 0.07, 10).seg([0.15, 0.32, -1.65], [0.2, 0.2, -2.05], 0.07, '#4a4d68', 0.07, 10);
    r.on('cab2').seg([0.2, 0.2, -2.05], [0.0, 0.18, -2.45], 0.07, '#4a4d68', 0.07, 10).seg([0.0, 0.18, -2.45], [-0.15, 0.22, -2.8], 0.07, '#4a4d68', 0.07, 10);
    r.on('plug').fx(0, 1).add(G.rbox(2), '#fff4f8', [-0.15, 0.24, -2.98], [0, 0.25, 0], [0.32, 0.26, 0.3]);
    r.fx(0, 2).add(G.box(), GOLD, [-0.07, 0.24, -3.18], [0, 0.25, 0], [0.04, 0.06, 0.18]).add(G.box(), GOLD, [-0.26, 0.24, -3.13], [0, 0.25, 0], [0.04, 0.06, 0.18]);
    r.fx(0.4, 0).add(heartGeo(), hdr('#ff6fa8', 1.2), [-0.15, 0.26, -2.82], [0, 0.25 + PI, 0], 0.1);
    r.fx(0, 0);
    // yüz: gövdenin önünde (uykulu gözler: anim s.eyeK ile yarı kapalı)
    face(r, [0, 1.18, 0.05], 1.22, { bone: 'body', tilt: 0.18, ex: 0.4, ey: 0.16, er: 0.25, iris: '#33407e', skin: mixc(SUP.body, SUP.bodyL, 0.2), browCol: '#2c3366',
      browY: 1.5, mouthY: -0.3, mouthW: 0.3, heartY: 0.85, heartX: 1.05, heartS: 0.28, mouthPivot: true, blushCol: '#ff8fbf' });
    lids(r, 'body', [0, 1.18, 0.05], 1.22, 0.18, 0.4, 0.16, 0.25, mixc(SUP.body, SUP.bodyD, 0.25), '#2c3366');
    return { height: 2.8, glowC: col('#b7c7ff'), dieHop: 0.12, mat: { rough: 0.35, rim: '#e4ebff', rimK: 0.28, rimP: 2.4 }, portrait: { cx: 0.3, cy: 1.5, cz: 0.3, rad: 1.6, dy: 0.4 } };
  }
  function animSupurge(m, dt, st, s) {
    const B = m.B, ph = bph(st), t = bpt(st), pre = preAggro(s, st, ph, dt);
    const br = Math.sin(s.t * 1.6 + s.ph);
    let sy = 1 + 0.025 * br, sxz = 1 - 0.012 * br, y = 0, rx = 0.02 * br, rz = 0, ry = 0, hY = 0, hX = 0, wX = 0, nX = 0, capR = 0, tipR = 0, cab = 0, cabY = 0, roll = 0;
    let lidA = 0.45 + 0.08 * Math.sin(s.t * 0.7);   // hep uykulu: kapaklar gözün yarısından aşağıda
    // yürürken tekerler döner, gövde hafif sallanır
    s.roll = (s.roll || 0) + dt * s.mv * 4; roll = s.roll;
    rz += Math.sin(s.t * 6) * 0.02 * s.mv; y += Math.abs(Math.sin(s.t * 6)) * 0.03 * s.mv;
    const yawn = (k) => { s.mouthO = Math.max(s.mouthO, k); lidA += 1.0 * k; sy *= 1 + 0.08 * k; rx -= 0.15 * k; capR -= 0.2 * k; };
    switch (ph) {
      case 'roar': {   // giriş: kocaman esneme, gerinme, şapka zıplar
        const k = bump(t, 0.9);
        yawn(k); hY += 0.3 * k; wX -= 0.5 * k; tipR += Math.sin(s.t * 12) * 0.3 * k; y += bump(t - 0.75, 0.25) * 0.25;
        break;
      }
      case 'suck': {   // vakum: hortum öne döner, başlık Feza'ya bakar, gövde titrer, gözler açık "vıııın!"
        const T0 = 1.3 / 4.8, aim = smooth01(t / 0.2) * (1 - smooth01((t - 0.9) / 0.1)), on = t > T0 && t < 0.9 ? 1 : 0;
        hY = -0.62 * aim; wX = -0.35 * aim; nX = 0.25 * aim; s.eyeK = lerp(s.eyeK, 1.1, aim); lidA = lerp(lidA, -0.7, aim); s.browY = 0.03 * aim; s.mouthO = 0.6 * aim;
        rx = -0.08 * aim; sxz *= 1 + 0.02 * Math.sin(s.t * 50) * on; sy *= 1 + 0.02 * Math.cos(s.t * 47) * on; rz += Math.sin(s.t * 40) * 0.015 * on;
        capR += Math.sin(s.t * 30) * 0.12 * on; tipR += Math.sin(s.t * 25) * 0.4 * on;
        break;
      }
      case 'blow': {   // üfleme: geri yaslanır, yanaklar şişer, başlık havaya kalkar, "puf!"
        const k = smooth01(t / 0.12) * (1 - smooth01((t - 0.55) / 0.2)), puff = bump(t - 0.1, 0.4);
        sxz *= 1 + 0.08 * puff; sy *= 1 - 0.04 * puff; rx -= 0.18 * k; wX = -0.9 * k; nX = -0.5 * k; hY = -0.35 * k; s.mouthO = puff; lidA = lerp(lidA, -0.2, k);
        tipR += 0.5 * puff;
        break;
      }
      case 'cable': {   // kablo kırbacı: arkasını döner, kablo havalanır ve yere "şap!"
        const up = smooth01(t / 0.3) * (1 - smooth01((t - 0.36) / 0.08)), slap = bump(t - 0.36, 0.25);
        cab = 0.9 * up - 0.25 * slap; cabY = Math.sin(s.t * 14) * 0.4 * up; rx = 0.1 * up - 0.06 * slap; y += 0.15 * slap;
        lidA = lerp(lidA, -0.5, up); s.mouthW = slap;
        break;
      }
      case 'nap': {   // horlama: öne eğilir, gözler kapalı, şapka gözüne düşer, gövde horlar gibi şişip iner
        const k = smooth01(s.pT / 0.5), sn = Math.sin(s.pT * 2.4);
        lidA = lerp(lidA, 1.2, k); s.eyeK = lerp(1, 0.35, k); rx += 0.12 * k; sy *= 1 + 0.05 * sn * k; sxz *= 1 - 0.02 * sn * k; capR += 0.35 * k; tipR += 0.2 * k + 0.08 * sn;
        hY += 0.15 * k; wX += 0.1 * k; nX -= 0.1 * k; s.mouthO = Math.max(0, sn) * 0.5 * k; y -= 0.05 * k;
        break;
      }
      case 'summon': {   // toz tavşanlarını çağırır: kalkar-iner, şapka sallanır
        const b = Math.abs(Math.sin(t * PI * 3)), k = smooth01(t / 0.15) * (1 - smooth01((t - 0.85) / 0.15));
        y += b * 0.25 * k; capR += Math.sin(t * PI * 6) * 0.2 * k; lidA = lerp(lidA, -0.4, k); s.mouthW = k; wX = -0.5 * k;
        break;
      }
      case 'dying': {   // neşelendi: uyandı! gözler kocaman, hortumla el sallar
        hY = -0.4; wX = -0.9 + Math.sin(s.t * 10) * 0.35; tipR = Math.sin(s.t * 8) * 0.5; capR = Math.sin(s.t * 5) * 0.1;
        break;
      }
    }
    // boşta: arada bir esneme
    const ya = act(s, 'yaT', dt, 5, 9, 1.8, ph === 'idle' && !(st.move > 0.05));
    if (ya >= 0) yawn(bump(ya, 1));
    if (pre > 0.01) { lidA = lerp(lidA, 1.2, pre); s.eyeK = lerp(s.eyeK, 0.35, pre); rx += 0.08 * pre; capR += 0.25 * pre; sy *= 1 + 0.03 * Math.sin(s.t * 2.2) * pre; }
    if (st.hurt > 0 && ph !== 'dying') { const h = st.hurt * st.hurt, sd = hurtSide(s, st); capR -= 0.3 * h; tipR += sd * 0.5 * h; s.eyeK = Math.max(s.eyeK, 1 + 0.3 * h); lidA -= 0.9 * h; s.mouthO = Math.max(s.mouthO, h); }
    B.body.position.y += y; B.body.scale.set(sxz, sy, sxz); B.body.rotation.set(rx, ry, rz);
    B.wheelL.rotation.x = roll; B.wheelR.rotation.x = roll;
    B.lids.rotation.x = clamp(lidA, -0.8, 1.25); if (ph === 'dying') B.lids.scale.setScalar(0.0001);
    B.hose.rotation.set(hX + Math.sin(s.t * 1.3 + s.ph) * 0.04, hY + Math.sin(s.t * 0.9) * 0.05, 0);
    B.wand.rotation.set(wX, 0, 0); B.nozzle.rotation.set(nX, 0, 0);
    B.cap.rotation.set(capR + 0.04 * Math.sin(s.t * 1.6), 0, 0.05 * Math.sin(s.t * 1.1 + s.ph));
    B.capTip.rotation.set(0, 0, tipR + 0.15 * Math.sin(s.t * 2.2 + s.ph));
    B.cab1.rotation.set(-cab, cabY + 0.2 * Math.sin(s.t * 1.4 + s.ph), 0); B.cab2.rotation.set(-cab * 0.6, cabY * 0.8 + 0.3 * Math.sin(s.t * 1.7), 0);
    B.plug.rotation.set(0, 0.2 * Math.sin(s.t * 2 + 1), 0);
    m.U.uWob.value.x = 0;
  }

  // ════════════════ 2. Düdüklü Tencere ════════════════
  const TEN = { steel: '#aab5c6', steelL: '#e4eaf2', steelD: '#66738a', enamel: '#f2554e', enamelL: '#ff8c78', enamelD: '#b8323a', band: '#ffffff', handle: '#2f3240', knob: '#ffcf3f', valve: '#ffd23f' };
  const POT_P = [[0, 0.12], [0.95, 0.12], [1.18, 0.2], [1.27, 0.38], [1.29, 0.8], [1.29, 1.4], [1.27, 1.78], [1.22, 1.86], [1.12, 1.88], [0, 1.88]];
  const LID_P = [[0, 1.86], [1.3, 1.86], [1.34, 1.9], [1.28, 1.97], [1.0, 2.07], [0.5, 2.14], [0, 2.16]];
  function buildTencere(r) {
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('lid', 'body', [0, 1.95, 0]); r.bone('valve', 'lid', [0, 2.2, 0]);
    r.bone('armL', 'body', [1.28, 1.55, 0]); r.bone('armR', 'body', [-1.28, 1.55, 0]);
    r.bone('footL', 'body', [0.55, 0.12, 0.1]); r.bone('footR', 'body', [-0.55, 0.12, 0.1]);
    // parlak çelik gövde (+ mavi şerit etiket, alt kenarda hafif koyu)
    r.on('body').fx(0, 1);
    // (kırmızı emaye düdüklü tencere: beyaz puantiyeli, çelik kapak ve kenar)
    r.add(lathe('tenPot', POT_P, 56, 4), vgrad(0.1, 1.9, [[0, TEN.enamelD], [0.3, TEN.enamel], [0.8, TEN.enamelL], [1, TEN.enamel]]));
    r.fx(0, 1).add(G.torus(PI * 2, 0.05, 56), TEN.steel, [0, 1.86, 0], [PI / 2, 0, 0], [1.24, 1.24, 1]);
    r.fx(0, 0.8).add(G.cyl(1, 1, 56, true), TEN.band, [0, 0.36, 0], null, [1.29, 0.07, 1.29]);
    r.fx(0, 0.8);
    for (let i = 0; i < 26; i++) {   // puantiye (yüzün olduğu ön kısım boş)
      const a = i * 2.39996 + 0.4, y = 0.62 + ((i * 0.618) % 1) * 1.05, aa = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(aa) < 1.8) continue;
      const rr = profR('tenPot', POT_P)(y) + 0.005;
      r.add(G.sphere(12, 8), '#fff6f0', [Math.sin(a) * rr, y, Math.cos(a) * rr], qz(Math.sin(a), 0, Math.cos(a)), [0.11, 0.11, 0.025]);
    }
    // yansıma çizgileri (boyalı parıltı)
    gloss(r, [-1.16, 1.25, 0.52], [-0.91, 0.05, 0.41], 0.06, 0.38, 1.15, 0);
    gloss(r, [0.95, 1.3, -0.85], [0.74, 0.1, -0.66], 0.06, 0.35, 1.1, 0);
    // minik ayaklar (yuvarlak siyah lastik)
    for (const sd of [1, -1]) r.on(sd > 0 ? 'footL' : 'footR').fx(0, 0.5).add(G.sphere(18, 12), TEN.handle, [sd * 0.55, 0.1, 0.12], null, [0.3, 0.14, 0.38]);
    // sap kolları: siyah uzun sap + turuncu-kırmızı top el
    for (const sd of [1, -1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.6);
      r.add(G.rbox(3), TEN.steelD, [sd * 1.36, 1.55, 0], null, [0.2, 0.18, 0.3]);
      r.add(G.capsule(1, 12), TEN.handle, [sd * 1.75, 1.6, 0], [0, 0, PI / 2 - sd * 0.15], [0.13, 0.5, 0.13]);
      r.fx(0, 0.8).add(G.sphere(18, 12), TEN.knob, [sd * 2.18, 1.66, 0], null, 0.19);
      r.fx(0.25, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.3), [sd * 2.13, 1.76, 0.1], null, 0.05);
    }
    // kapak: hafif kubbe, kenar halkası, arkaya uzanan sap, kırmızı emniyet düğmesi
    r.on('lid').fx(0, 1);
    r.add(lathe('tenLid', LID_P, 56, 4), vgrad(1.85, 2.16, [[0, TEN.steelD], [0.6, TEN.steel], [1, mixc(TEN.steel, TEN.steelL, 0.4)]]));
    r.fx(0, 1).add(G.torus(PI * 2, 0.16, 40), TEN.steelD, [0, 2.12, 0], [PI / 2, 0, 0], [0.4, 0.4, 0.45]);
    r.add(G.torus(PI * 2, 0.06, 56), TEN.steelD, [0, 1.9, 0], [PI / 2, 0, 0], [1.33, 1.33, 0.8]);
    r.fx(0, 0.6).add(G.capsule(1, 12), TEN.handle, [0, 2.06, -1.35], [PI / 2 - 0.1, 0, 0], [0.12, 0.65, 0.1]);
    r.add(G.sphere(14, 10), TEN.knob, [0, 2.12, -2.0], null, 0.15);
    r.fx(0.2, 1).add(G.sphere(14, 10), hdr('#ff4f6a', 1.1), [0.55, 2.1, 0.3], null, [0.12, 0.08, 0.12]);
    // düdük (dönen ağırlık): altın sarısı, üstünde minik buhar deliği
    r.on('valve').fx(0, 1);
    r.add(G.cyl(1, 1, 20), TEN.steelD, [0, 2.2, 0], null, [0.12, 0.14, 0.12]);
    r.add(G.cyl(0.75, 1, 24), TEN.valve, [0, 2.36, 0], null, [0.28, 0.22, 0.28]);
    r.add(G.sphere(16, 10), TEN.valve, [0, 2.5, 0], null, [0.2, 0.1, 0.2]);
    r.fx(0, 0.3).add(G.cyl(1, 1, 12), '#4a3a22', [0, 2.58, 0], null, [0.05, 0.04, 0.05]);
    r.mark('muzzle', [0, 2.62, 0]);
    r.fx(0, 0);
    face(r, [0, 1.14, 0], 1.29, { bone: 'body', tilt: 0.08, ex: 0.47, ey: 0.2, er: 0.31, iris: '#3a2a6a', browCol: '#4a1a24',
      browY: 1.42, mouthY: -0.4, mouthW: 0.36, heartY: 0.75, heartX: 1.05, heartS: 0.28, mouthPivot: true, blushCol: '#ffb0b8', mouthIn: '#5a1424' });
    return { height: 2.6, glowC: col('#ffd9a0'), dieHop: 0.14, mat: { rough: 0.22, rim: '#ffffff', rimK: 0.3, rimP: 2.2 }, portrait: { cx: 0, cy: 1.5, cz: 0, rad: 1.6, dy: 0.4 } };
  }
  function animTencere(m, dt, st, s) {
    const B = m.B, ph = bph(st), t = bpt(st), pre = preAggro(s, st, ph, dt);
    const br = Math.sin(s.t * 2 + s.ph);
    let sy = 1 + 0.02 * br, sxz = 1 - 0.01 * br, y = 0, rx = 0, rz = 0, ry = 0, aL = 0, aR = 0, lidY = 0, lidX = 0, lidZ = 0, lidRx = 0, lidRz = 0, lidSpin = 0, vSpin = s.t * 3, vY = 0, fL = 0, fR = 0;
    // yürüyüş: paytak paytak (ayaklar sırayla), sağa sola yalpalama
    s.walk = (s.walk || 0) + dt * 7 * s.mv;
    const w = Math.sin(s.walk); rz += w * 0.07 * s.mv; fL = Math.max(0, w) * 0.12 * s.mv; fR = Math.max(0, -w) * 0.12 * s.mv; y += Math.abs(w) * 0.05 * s.mv;
    aL += 0.15 * w * s.mv; aR -= 0.15 * w * s.mv;
    // düdük her zaman hafifçe döner ve tıkırdar; kapak arada "tık" diye zıplar
    vY = Math.abs(Math.sin(s.t * 9)) * 0.02;
    const L = st.lid;
    switch (ph) {
      case 'roar': {   // giriş: düdük çılgınca döner, kapak tık tık, kollar havada "Fısss!"
        const k = bump(t, 1);
        vSpin = s.t * 30 * k + s.t * 3; lidY = Math.abs(Math.sin(s.t * 25)) * 0.12 * k; aL = aR = 1.2 * k; s.mouthO = k; s.eyeK = 1 + 0.2 * k; sy *= 1 + 0.06 * k; rz += Math.sin(s.t * 20) * 0.04 * k;
        break;
      }
      case 'lid': {   // kapak fırlatma: önce çömelir ve kollarını kaldırır; kapak (GAME: st.lid) uçar; düdük kapakla gider
        const crouch = bump(t, 0.25);
        sy *= 1 - 0.12 * crouch; sxz *= 1 + 0.06 * crouch; aL = aR = 1.3 * smooth01(t / 0.15) * (1 - smooth01((t - 0.65) / 0.2)); s.mouthO = bump(t - 0.1, 0.3); s.eyeK = 1.15;
        if (L) { lidX = L.x; lidY = L.y; lidZ = L.z; lidSpin = L.k > 0 && L.k < 1 ? L.spin * 14 : 0; lidRx = 0.25 * Math.sin(L.spin * 6) * (L.k > 0 && L.k < 1 ? 1 : 0); }
        break;
      }
      case 'steam': {   // buhar: düdük öter (hızlı döner), gövde şişer, yanaklar kızarır
        const k = smooth01(t / 0.15) * (1 - smooth01((t - 0.8) / 0.2));
        vSpin = s.t * 28; vY += 0.06 * k * Math.abs(Math.sin(s.t * 30)); sxz *= 1 + 0.05 * k; sy *= 1 + 0.04 * k; s.mouthO = 0.7 * k; s.eyeK = lerp(1, 0.55, k); aL = aR = 0.5 * k + 0.2 * Math.sin(s.t * 18) * k;
        break;
      }
      case 'rain': {   // mercimek yağmuru: kapak "pat!" açılır (st.lid), kollar çırpınır
        if (L) { lidY = L.y; lidRx = -0.6 * (L.open || 0); lidZ = -0.25 * (L.open || 0); }
        const k = smooth01(t / 0.12) * (1 - smooth01((t - 0.45) / 0.2));
        aL = aR = 0.9 * k + 0.3 * Math.sin(s.t * 16) * k; y += bump(t - 0.05, 0.15) * 0.25; s.mouthW = k;
        break;
      }
      case 'summon': {
        const b = Math.abs(Math.sin(t * PI * 3)), k = smooth01(t / 0.15) * (1 - smooth01((t - 0.85) / 0.15));
        y += b * 0.3 * k; aL = aR = 1.0 * k; vSpin = s.t * 20; s.mouthW = k;
        break;
      }
      case 'dying': {   // neşelendi: düdükle şarkı (düdük döner), kapak tıkır tıkır dans eder, kollar alkış
        vSpin = s.t * 18; lidY = Math.abs(Math.sin(s.t * 12)) * 0.12; aL = aR = 1.1 + Math.sin(s.t * 12) * 0.35; rz += Math.sin(s.t * 6) * 0.06;
        break;
      }
    }
    const tk = act(s, 'tkT', dt, 3, 6, 0.4, ph === 'idle');
    if (tk >= 0) lidY += bump(tk, 1) * 0.1;
    if (pre > 0.01) { aR += (0.9 + 0.2 * Math.sin(s.t * 3)) * pre; s.eyeK = lerp(s.eyeK, 0.6, pre); sy *= 1 + 0.02 * Math.sin(s.t * 1.5) * pre; vSpin = s.t * 1.2; }
    if (st.hurt > 0 && ph !== 'dying') { const h = st.hurt * st.hurt, sd = hurtSide(s, st); lidY += 0.15 * h; lidRz += sd * 0.2 * h; s.eyeK = Math.max(s.eyeK, 1 + 0.3 * h); }
    B.body.position.y += y; B.body.scale.set(sxz, sy, sxz); B.body.rotation.set(rx, ry, rz);
    B.lid.position.x += lidX; B.lid.position.y += lidY; B.lid.position.z += lidZ; B.lid.rotation.set(lidRx, lidSpin, lidRz);
    B.lid.scale.set(1 / sxz, 1 / sy, 1 / sxz);
    B.valve.rotation.y = vSpin; B.valve.position.y += vY;
    B.armL.rotation.z = -0.15 + aL * 0.9; B.armR.rotation.z = 0.15 - aR * 0.9;
    B.footL.position.y += fL; B.footR.position.y += fR;
    m.U.uWob.value.x = 0;
  }

  // ════════════════ 3. Dondurma Kralı ════════════════
  const DON = { mint: '#9ef0cc', mintD: '#5ccfa0', van: '#fff3d6', vanD: '#f2d9a6', straw: '#ffa9c9', strawD: '#f07aa6', waf: '#e9b56b', wafD: '#c4843e', choc: '#7a4a32' };
  const BOWL_P = [[0, 0], [0.7, 0], [0.86, 0.05], [1.05, 0.35], [1.3, 0.72], [1.42, 0.86], [1.36, 0.9]];
  function waffleCol(base, dark, k = 7) {
    const a = col(base), d = col(dark), o = new THREE.Color();
    return (x, y, z) => {
      const ang = Math.atan2(x, z) * 1.3, u = (ang + y * 1.6) * k / 3, v = (ang - y * 1.6) * k / 3;
      const l = Math.min(Math.abs(u - Math.round(u)), Math.abs(v - Math.round(v)));
      return o.copy(a).lerp(d, l < 0.09 ? 0.75 : 0.05);
    };
  }
  function scoop(r, c, R, colA, colD, seed) {   // pürüzlü kenarlı top + alt kenarda sarkan damlalar
    r.add(G.sphere(36, 26), vgrad(c[1] - R, c[1] + R, [[0, colD], [0.5, colA], [1, mixc(colA, '#ffffff', 0.35)]]), c, null, [R, R * 0.92, R]);
    for (let i = 0; i < 12; i++) {
      const a = (i + 0.5) / 12 * PI * 2 + seed, rr = R * 0.98;
      r.add(G.sphere(14, 10), colA, [c[0] + Math.sin(a) * rr, c[1] - R * 0.42, c[2] + Math.cos(a) * rr], null, [R * 0.2, R * 0.14, R * 0.2]);
      if (i % 3 === seed % 3) r.add(G.sphere(10, 8), colA, [c[0] + Math.sin(a) * rr * 0.96, c[1] - R * 0.62, c[2] + Math.cos(a) * rr * 0.96], null, [R * 0.07, R * 0.16, R * 0.07]);
    }
  }
  function sprinkles(r, c, R, n, seed) {
    const cs = ['#ffe14a', '#5fd3ff', '#ff6fa8', '#ffffff', '#c58bff', '#7ce07a'];
    for (let i = 0; i < n; i++) {
      const u = 0.25 + 0.7 * ((i * 0.618 + seed) % 1), a = i * 2.39996 + seed, sn = Math.sqrt(1 - u * u);
      r.add(G.sphere(6, 4), cs[i % cs.length], [c[0] + Math.sin(a) * sn * R * 1.0, c[1] + u * R * 0.92, c[2] + Math.cos(a) * sn * R * 1.0], [i * 1.3, a, i * 0.7], [0.03, 0.08, 0.03]);
    }
  }
  function buildDondurma(r) {
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('s2', 'body', [0, 2.35, 0]); r.bone('s3', 's2', [0, 3.15, 0]); r.bone('crown', 's3', [0, 3.6, 0]);
    r.bone('armL', 'body', [1.15, 1.5, 0.2]); r.bone('armR', 'body', [-1.15, 1.5, 0.2]); r.bone('drip', 'body', [0, 1.0, 0]);
    // gofret kâse (waffle deseni)
    r.on('body').fx(0, 0.3);
    r.add(lathe('donBowl', BOWL_P, 48, 4), waffleCol(DON.waf, DON.wafD));
    r.fx(0, 0.4).add(G.torus(PI * 2, 0.09, 48), DON.wafD, [0, 0.88, 0], [PI / 2, 0, 0], [1.38, 1.38, 1.2]);
    // 1. top (nane, yüz burada) + renkli şeker
    r.fx(0, 0.75);
    scoop(r, [0, 1.42, 0], 1.25, DON.mint, DON.mintD, 1);
    sprinkles(r, [0, 1.42, 0], 1.26, 18, 0.3);
    gloss(r, [-0.55, 2.05, 0.75], [-0.45, 0.5, 0.6], 0.2, 0.08, 1.15, 0.5);
    // erime damlaları (st.melt ile uzar)
    r.on('drip');
    for (let i = 0; i < 6; i++) { const a = (i / 6 - 0.5) * 2.6, rr = 1.2; r.add(G.sphere(10, 8), DON.mint, [Math.sin(a) * rr, 0.98, Math.cos(a) * rr], null, [0.09, 0.18, 0.09]); }
    // 2. top (vanilya) + çikolata sosu şeritleri
    r.on('s2').fx(0, 0.75);
    scoop(r, [0, 2.42, -0.05], 0.92, DON.van, DON.vanD, 2);
    r.fx(0, 1);
    for (let i = 0; i < 13; i++) { const a = (i / 13) * PI * 2 + 0.3, l = [0.1, 0.2, 0.14, 0.26][i % 4]; r.add(G.sphere(10, 8), '#ff6f9a', [Math.sin(a) * 0.88, 2.74 - l * 0.55, -0.05 + Math.cos(a) * 0.88], null, [0.085, l * 0.95, 0.085]); }
    r.add(G.sphere(28, 14), '#ff6f9a', [0, 3.0, -0.05], null, [0.66, 0.16, 0.66]);
    sprinkles(r, [0, 2.42, -0.05], 0.92, 10, 0.45);
    // 3. top (çilek) — yuvarlanıp gidebilir (st.scoopOff)
    r.on('s3').fx(0, 0.75);
    scoop(r, [0, 3.25, -0.05], 0.66, DON.straw, DON.strawD, 3);
    sprinkles(r, [0, 3.25, -0.05], 0.66, 10, 0.7);
    // külah taç: 6 gofret sivri uç + kiraz + mücevher şekerler
    r.on('crown').fx(0, 0.3);
    r.add(G.cyl(1, 1, 32, true), waffleCol(DON.waf, DON.wafD, 10), [0, 3.85, -0.05], null, [0.5, 0.22, 0.5]);
    for (let i = 0; i < 6; i++) {
      const a = (i + 0.5) / 6 * PI * 2;
      r.add(G.cone(4), waffleCol(DON.waf, DON.wafD, 10), [Math.sin(a) * 0.45, 4.12, -0.05 + Math.cos(a) * 0.45], qy(Math.sin(a) * 0.25, 1, Math.cos(a) * 0.25), [0.15, 0.36, 0.15]);
      r.fx(0.4, 1).add(G.sphere(10, 8), hdr(['#ff4f93', '#5fd3ff', '#ffe14a'][i % 3], 1.2), [Math.sin(a + 0.52) * 0.51, 3.86, -0.05 + Math.cos(a + 0.52) * 0.51], null, 0.06).fx(0, 0.3);
    }
    r.fx(0, 1).add(G.sphere(20, 14), '#e8203c', [0, 4.25, -0.05], null, 0.2);
    r.fx(0.5, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.4), [-0.07, 4.33, 0.08], null, 0.05);
    r.fx(0, 0.3).seg([0, 4.4, -0.05], [0.12, 4.65, -0.12], 0.025, '#5a9e3a', 0.02, 6);
    // gofret rulo kollar + krema eldiven; sağ elde gümüş kaşık asa (ucunda kalp şeker)
    for (const sd of [1, -1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.3);
      r.seg([sd * 1.1, 1.5, 0.2], [sd * 1.75, 1.15, 0.45], 0.1, waffleCol(DON.waf, DON.wafD, 14), 0.1, 12);
      r.fx(0, 0.6).add(G.sphere(18, 12), '#ffffff', [sd * 1.82, 1.1, 0.5], null, 0.2);
      for (let k = 0; k < 3; k++) r.add(G.sphere(10, 8), '#ffffff', [sd * (1.9 + k * 0.02), 1.22 - k * 0.07, 0.62], null, 0.07);
    }
    r.on('armR').fx(0, 2).seg([-1.85, 0.75, 0.55], [-1.85, 2.0, 0.55], 0.04, '#dfe6f0', 0.04, 10);
    r.add(G.sphere(16, 12), '#dfe6f0', [-1.85, 2.15, 0.55], null, [0.16, 0.22, 0.06]);
    r.fx(0.5, 1).add(heartGeo(), hdr('#ff5aa8', 1.3), [-1.85, 2.18, 0.62], null, 0.17);
    r.on('armR').mark('muzzle', [-1.82, 1.4, 0.6]);
    r.fx(0, 0);
    face(r, [0, 1.42, 0], 1.25, { bone: 'body', tilt: 0.1, ex: 0.42, ey: 0.3, er: 0.28, iris: '#2a5c86', browCol: '#2a5245',
      browY: 1.15, mouthY: -0.2, mouthW: 0.34, heartY: 1.0, heartX: 1.1, heartS: 0.28, mouthPivot: true, blushCol: '#ff8fb4' });
    return { height: 3.5, glowC: col('#c8f2ff'), dieHop: 0.1, mat: { rough: 0.45, sss: col('#ffe6f0').multiplyScalar(0.05), rim: '#f2fcff', rimK: 0.3, rimP: 2.3, wob: 0.012, wobF: 1.4, wobS: 2.5 }, portrait: { cx: 0, cy: 2.3, cz: 0, rad: 2.0, dy: 0.5 } };
  }
  function animDondurma(m, dt, st, s) {
    const B = m.B, ph = bph(st), t = bpt(st), pre = preAggro(s, st, ph, dt), melt = clamp(+st.melt || 0, 0, 1);
    const br = Math.sin(s.t * 1.8 + s.ph);
    let sy = 1 + 0.03 * br - 0.12 * melt, sxz = 1 - 0.015 * br + 0.07 * melt, y = 0, rx = 0, rz = 0, ry = 0, aL = 0, aR = 0, aLx = 0, aRx = 0, s2r = 0, s3y = 0, s3r = 0, crY = 0, crR = 0, s3k = st.scoopOff ? 0 : 1;
    // yürüyüş: kaşığıyla kraliyet yürüyüşü, toplar sallanır
    s.walk = (s.walk || 0) + dt * 5 * s.mv; const w = Math.sin(s.walk);
    rz += w * 0.05 * s.mv; y += Math.abs(w) * 0.06 * s.mv; s2r += w * 0.06 * s.mv; s3r += w * 0.09 * s.mv;
    switch (ph) {
      case 'roar': {   // giriş: kaşık asayı kaldırır, toplar zıp zıp, taç döner
        const k = bump(t, 1); aR = 1.4 * k; aL = 0.6 * k + 0.3 * Math.sin(s.t * 10) * k; crY = Math.abs(Math.sin(s.t * 9)) * 0.2 * k; s3y = Math.abs(Math.sin(s.t * 9 + 1)) * 0.12 * k; s.mouthO = k; sy *= 1 + 0.06 * k;
        break;
      }
      case 'snow': {   // kar topu: sol kol üç kez atar (0.19 / 0.37 / 0.54)
        for (const c of [0.19, 0.37, 0.54]) { const wu = bump(t - c + 0.12, 0.12), th = bump(t - c, 0.1); aL += 1.3 * wu - 0.4 * th; aLx += -0.8 * wu + 0.6 * th; rz += 0.06 * wu; }
        s.mouthW = 0.6; s.eyeK = 0.8;
        break;
      }
      case 'slide': {   // kaymaya hazırlık: öne eğilir, kollar geriye
        const k = smooth01(t / 0.6); rx = 0.2 * k; aLx = aRx = 0.7 * k; aL = aR = 0.4 * k; s.eyeK = 1.1; s.mouthO = 0.5 * k;
        break;
      }
      case 'slideGo': {   // karnının üstünde kayar: öne yatık, kollar açık, "Vııı!"; sonunda başı döner
        const k = smooth01(t / 0.1), end = smooth01((t - 0.75) / 0.25);
        rx = 0.55 * k * (1 - end); aL = aR = 1.5 * k * (1 - end); s.mouthO = 1 - end; s.eyeK = 1.2; rz += Math.sin(s.t * 20) * 0.03 * k;
        ry = end * PI * 2 * smooth01(t); s.eyeWob = end;
        break;
      }
      case 'scoop': {   // top atma: zıplar, tepedeki top uçar ("plop!"), şaşkın bakar, sonra yenisi büyür
        const hop = bump(t - 0.05, 0.12); y += hop * 0.3; s.eyeK = 1.25; s.mouthO = bump(t - 0.1, 0.4);
        aL = aR = 0.8 * bump(t - 0.05, 0.3); if (!st.scoopOff && t > 0.6) s3k = smooth01((t - 0.6) / 0.25) * (1 + 0.25 * bump(t - 0.78, 0.15));
        crY = -0.7 * (st.scoopOff ? 1 : 0);
        break;
      }
      case 'summon': {
        const b2 = Math.abs(Math.sin(t * PI * 3)), k = smooth01(t / 0.15) * (1 - smooth01((t - 0.85) / 0.15)); y += b2 * 0.25 * k; aR = 1.3 * k; s.mouthW = k;
        break;
      }
      case 'dying': {   // neşelendi: kaşığı sallar, toplar sevinçle zıplar, taç havada döner
        aR = 1.2 + Math.sin(s.t * 10) * 0.3; aL = 1.2 + Math.sin(s.t * 10 + 1) * 0.3; s3y = Math.abs(Math.sin(s.t * 8)) * 0.18; crY = Math.abs(Math.sin(s.t * 8 + 0.5)) * 0.25; crR = s.t * 4;
        break;
      }
    }
    // erirken komik: terler, kendini yelpazeler (sol el), gözler kıpır
    if (melt > 0.05 && ph === 'idle') { aL += (0.9 + 0.35 * Math.sin(s.t * 14)) * melt; aLx -= 0.5 * melt; s.eyeK = Math.min(s.eyeK, 1 - 0.25 * melt); s.mouthO = Math.max(s.mouthO, 0.4 * melt); }
    if (pre > 0.01) { aR += 0.4 * pre; s3r += Math.sin(s.t * 2) * 0.05 * pre; s.eyeK = lerp(s.eyeK, 0.7, pre); crR += Math.sin(s.t * 1.3) * 0.1 * pre; }
    if (st.hurt > 0 && ph !== 'dying') { const h = st.hurt * st.hurt, sd = hurtSide(s, st); s2r += sd * 0.1 * h; s3r += sd * 0.18 * h; crR += sd * 0.3 * h; s.eyeK = Math.max(s.eyeK, 1 + 0.3 * h); }
    B.body.position.y += y; B.body.scale.set(sxz, sy, sxz); B.body.rotation.set(rx, ry, rz);
    B.s2.rotation.set(0, 0, s2r); B.s2.scale.set(1, 1 + 0.06 * melt, 1);
    B.s3.position.y += s3y; B.s3.rotation.set(0, 0, s3r); B.s3.scale.setScalar(Math.max(0.0001, s3k));
    B.crown.position.y += crY - (s3k < 0.5 ? 0 : 0); B.crown.rotation.set(0, crR, 0.05 * Math.sin(s.t * 1.2));
    if (s3k < 0.999) B.crown.scale.setScalar(1 / Math.max(0.0001, s3k));   // (taç top uçsa da yerinde: bir alt topa iner)
    if (s3k < 0.999) B.crown.position.y -= 0.65 * (1 - s3k) / Math.max(0.0001, s3k);
    B.drip.scale.set(1, 1 + 2.2 * melt + 0.2 * Math.sin(s.t * 2) * melt, 1); B.drip.position.y -= 0.15 * melt;
    B.armL.rotation.set(aLx, 0, -0.25 + aL); B.armR.rotation.set(aRx, 0, 0.25 - aR);
    m.U.uWob.value.x = wobK(s, dt, 0.012 + 0.02 * melt);
  }

  // ════════════════ 4. Koca Huysuz Pasta ════════════════
  const PAS = { pink: '#f08fb3', pinkD: '#d0638e', pinkL: '#f9b6cf', cream: '#fff1e6', creamD: '#ecd2bc', choc: '#9b5e45', chocD: '#6e3c2a', chocL: '#bf7f5e', red: '#ff3f62', plate: '#b9e6ff' };
  const tierP = (R, y0, h) => [[0, y0], [R - 0.08, y0], [R, y0 + 0.06], [R + 0.02, y0 + h * 0.5], [R, y0 + h - 0.06], [R - 0.1, y0 + h], [0, y0 + h]];
  const ING_COL = ['#ffffff', '#fff1c8', '#ff4f6e', '#ffd6e8'];
  function buildPasta(r) {
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('mid', 'body', [0, 1.05, 0]); r.bone('top', 'mid', [0, 1.95, 0]); r.bone('flames', 'top', [0, 3.3, 0]);
    r.bone('armL', 'mid', [1.45, 1.55, 0.1]); r.bone('armR', 'mid', [-1.45, 1.55, 0.1]);
    for (let i = 0; i < 4; i++) r.bone('slot' + i, 'body', [(i - 1.5) * 0.78, 0.55, 1.7]);
    // tabak
    r.on('body').fx(0, 1).add(G.cyl(1, 0.92, 48), PAS.plate, [0, 0.06, 0], null, [2.25, 0.12, 2.25]);
    r.add(G.torus(PI * 2, 0.05, 48), '#ffffff', [0, 0.12, 0], [PI / 2, 0, 0], [2.22, 2.22, 1]);
    // alt kat: pembe krema, kenarda damlalar, üst kenarda krema süsleri
    r.fx(0, 0.6).add(lathe('pasT1', tierP(1.9, 0.12, 0.95), 56, 3), vgrad(0.1, 1.07, [[0, PAS.chocD], [0.55, PAS.choc], [1, PAS.chocL]]));
    for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; r.add(G.sphere(12, 8), PAS.cream, [Math.sin(a) * 1.82, 1.08, Math.cos(a) * 1.82], null, [0.2, 0.15, 0.2]); r.add(G.cone(10), PAS.cream, [Math.sin(a) * 1.82, 1.24, Math.cos(a) * 1.82], [0, a, 0], [0.1, 0.16, 0.1]); }
    for (let i = 0; i < 18; i++) { const a = (i + 0.5) / 18 * PI * 2; r.add(G.sphere(10, 8), PAS.cream, [Math.sin(a) * 1.9, 0.9 - (i % 3) * 0.06, Math.cos(a) * 1.9], null, [0.08, 0.17 + (i % 3) * 0.06, 0.06]); }
    // 4 malzeme yuvası (boş hâli: koyu halka + soluk iç) — dolunca slotN kemiğindeki parlak simge büyür
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 0.78, z = Math.sqrt(1.92 * 1.92 - x * x), a = Math.atan2(x, z);
      r.fx(0, 1).add(G.torus(PI * 2, 0.16, 28), GOLD, [x * 1.01, 0.55, z * 1.01], [0, a, 0], [0.27, 0.27, 0.2]);
      r.fx(0, 0.3).add(G.cyl(1, 1, 24), '#5a3022', [x, 0.55, z - 0.02], [PI / 2, 0, -a], [0.24, 0.05, 0.24]);
      r.on('slot' + i).fx(1, 0);
      const c = hdr(ING_COL[i], 1.6), p = [x * 1.04, 0.55, z * 1.04];
      if (i === 0) { r.add(G.sphere(12, 10), c, [p[0], p[1] - 0.03, p[2]], null, [0.15, 0.16, 0.06]); r.add(G.sphere(8, 6), c, [p[0], p[1] + 0.14, p[2]], null, [0.06, 0.05, 0.05]); }
      else if (i === 1) r.add(G.sphere(14, 10), c, p, null, [0.13, 0.18, 0.06]);
      else if (i === 2) { r.add(G.sphere(14, 10), c, p, null, [0.15, 0.17, 0.06]); r.add(G.sphere(8, 6), hdr('#5fd35f', 1.4), [p[0], p[1] + 0.16, p[2]], null, [0.1, 0.04, 0.04]); }
      else { r.add(G.sphere(12, 8), c, [p[0], p[1] - 0.05, p[2]], null, [0.16, 0.08, 0.06]); r.add(G.cone(10), c, [p[0], p[1] + 0.07, p[2]], [PI / 2 - 0.2, 0, 0], [0.09, 0.07, 0.17]); }
      r.on('body');
    }
    // orta kat: krema beyazı + pembe damlalar + çilekler (yüz burada)
    r.on('mid').fx(0, 0.5).add(lathe('pasT2', tierP(1.45, 1.05, 0.95), 56, 3), vgrad(1.05, 2.0, [[0, PAS.pinkD], [0.5, PAS.pink], [1, PAS.pinkL]]));
    for (let i = 0; i < 14; i++) { const a = (i + 0.3) / 14 * PI * 2; r.fx(0, 0.8).add(G.sphere(10, 8), PAS.cream, [Math.sin(a) * 1.44, 1.84 - (i % 3) * 0.08, Math.cos(a) * 1.44], null, [0.08, 0.2 + (i % 3) * 0.07, 0.06]); }
    r.fx(0, 0.8).add(G.torus(PI * 2, 0.07, 56), PAS.cream, [0, 1.98, 0], [PI / 2, 0, 0], [1.38, 1.38, 1.5]);
    for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * PI * 2 + PI; strawberry(r, [Math.sin(a) * 1.25, 1.98, Math.cos(a) * 1.25], 0.4, 0.2); }
    // kollar: krema kolları + kiraz eller
    for (const sd of [1, -1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.5);
      r.seg([sd * 1.4, 1.55, 0.1], [sd * 2.0, 1.3, 0.35], 0.16, PAS.cream, 0.13, 12);
      r.fx(0, 1).add(G.sphere(18, 12), PAS.red, [sd * 2.08, 1.25, 0.4], null, 0.2);
      r.fx(0.4, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.3), [sd * 2.02, 1.34, 0.52], null, 0.05);
    }
    // üst kat: çilek sosu kaplı, kenarda krema
    r.on('top').fx(0, 0.9).add(lathe('pasT3', tierP(1.0, 1.95, 0.8), 48, 3), vgrad(1.95, 2.75, [[0, PAS.creamD], [0.6, PAS.cream], [1, '#ffffff']]));
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; r.fx(0, 0.6).add(G.sphere(12, 8), PAS.cream, [Math.sin(a) * 0.92, 2.77, Math.cos(a) * 0.92], null, [0.14, 0.12, 0.14]); }
    for (let i = 0; i < 10; i++) { const a = (i + 0.5) / 10 * PI * 2; r.fx(0, 1).add(G.sphere(10, 8), PAS.red, [Math.sin(a) * 1.0, 2.55 - (i % 2) * 0.08, Math.cos(a) * 1.0], null, [0.07, 0.18 + (i % 2) * 0.08, 0.05]); }
    // mum şapka: 5 çizgili mum (fitilli), ortada büyük çilek
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2 + 0.3, x = Math.sin(a) * 0.55, z = Math.cos(a) * 0.55;
      r.fx(0, 0.6).add(G.cyl(1, 1, 14), i % 2 ? '#8fd3ff' : '#ffe14a', [x, 3.05, z], null, [0.09, 0.55, 0.09]);
      for (let k = 0; k < 3; k++) r.add(G.torus(PI * 2, 0.2, 14), '#ffffff', [x, 2.88 + k * 0.17, z], [PI / 2, 0, 0.3], [0.095, 0.095, 0.1]);
      r.fx(0, 0).add(G.cyl(1, 1, 6), '#3a2a2a', [x, 3.38, z], null, [0.015, 0.08, 0.015]);
      r.on('flames').fx(1, 0).add(G.sphere(12, 10), hdr('#ffb43a', 2.2), [x, 3.5, z], null, [0.08, 0.16, 0.08]);
      r.add(G.sphere(10, 8), hdr('#fff3b0', 2.6), [x, 3.46, z], null, [0.04, 0.08, 0.04]);
      r.on('top');
    }
    strawberry(r.fx(0, 0), [0, 2.78, 0], 0.65, 0);
    r.mark('muzzle', [0, 3.0, 0.5]);
    r.fx(0, 0);
    face(r, [0, 1.5, 0], 1.47, { bone: 'mid', tilt: 0.05, ex: 0.5, ey: 0.18, er: 0.3, iris: '#6a3a2a', skin: PAS.pink, browCol: '#5a2a2a', mouthIn: '#6a1a34',
      browY: 0.95, mouthY: -0.2, mouthW: 0.36, heartY: 0.7, heartX: 1.1, heartS: 0.3, mouthPivot: true, blushCol: '#ff7fa8' });
    return { height: 3.6, glowC: col('#ffd6e8'), dieHop: 0.08, hide: ['flames', 'slot1', 'slot2', 'slot3'],
      mat: { rough: 0.5, sss: col('#fff0e8').multiplyScalar(0.03), rim: '#fff4fa', rimK: 0.16, rimP: 2.6, wob: 0.01, wobF: 1.2, wobS: 2.6 }, portrait: { cx: 0, cy: 2.0, cz: 0, rad: 2.2, dy: 0.5 } };
  }
  function animPasta(m, dt, st, s) {
    const B = m.B, ph = bph(st), t = bpt(st), pre = preAggro(s, st, ph, dt);
    const br = Math.sin(s.t * 1.7 + s.ph);
    let sy = 1 + 0.025 * br, sxz = 1 - 0.012 * br, y = 0, rx = 0, rz = 0, ry = 0, mR = 0, tR = 0, tY = 0, aL = 0, aR = 0, aLx = 0, aRx = 0, wob = 0.01;
    s.walk = (s.walk || 0) + dt * 5 * s.mv; const w = Math.sin(s.walk);
    rz += w * 0.04 * s.mv; y += Math.abs(w) * 0.07 * s.mv; mR += w * 0.04 * s.mv; tR -= w * 0.05 * s.mv;
    const stage = st.stage || 1;
    switch (ph) {
      case 'roar': { const k = bump(t, 1); aL = aR = 1.3 * k; tY = Math.abs(Math.sin(s.t * 10)) * 0.15 * k; s.mouthO = k; sy *= 1 + 0.06 * k; wob = 0.03 * k; break; }
      case 'squirt': { const k = smooth01(t / 0.1) * (1 - smooth01((t - 0.4) / 0.15)), sq = bump(t - 0.05, 0.3); sy *= 1 - 0.1 * sq; sxz *= 1 + 0.06 * sq; tY = 0.25 * bump(t - 0.2, 0.2); aL = aR = 1.0 * k; s.mouthO = sq; wob = 0.03; break; }
      case 'taunt': { const k = smooth01(t / 0.1) * (1 - smooth01((t - 0.85) / 0.15)); rz += Math.sin(s.t * 12) * 0.08 * k; mR += Math.sin(s.t * 12 + 1) * 0.08 * k; tR += Math.sin(s.t * 12 + 2) * 0.1 * k; aL = (1 + Math.sin(s.t * 12)) * 0.6 * k; aR = (1 - Math.sin(s.t * 12)) * 0.6 * k; s.mouthW = k; s.eyeK = 0.5; wob = 0.03 * k; break; }
      case 'cookies': { const k = smooth01(t / 0.1) * (1 - smooth01((t - 0.85) / 0.15)); aL = aR = 1.4 * k + 0.2 * Math.sin(s.t * 14) * k; tY = Math.abs(Math.sin(s.t * 12)) * 0.12 * k; s.mouthO = 0.7 * k; break; }
      case 'strawrain': { const k = smooth01(t / 0.1) * (1 - smooth01((t - 0.6) / 0.2)); rz += Math.sin(s.t * 24) * 0.04 * k; tR += Math.sin(s.t * 20) * 0.08 * k; aL = aR = 0.8 * k; y += Math.abs(Math.sin(s.t * 16)) * 0.08 * k; s.mouthW = k; break; }
      case 'sweep': { const on = st.spin ? 1 : 0; s.spinA = (s.spinA || 0) + dt * 0.85 * (st.spin || 0); ry = on ? 0 : 0; aL = aR = 1.5 * smooth01(t / 0.15) * (1 - smooth01((t - 0.9) / 0.1)); aLx = aRx = -0.4; mR += Math.sin(s.t * 6) * 0.03 * on; s.mouthO = 0.5; s.eyeK = 1.1; break; }
      case 'jump': { const a = clamp(+st.air || 0, 0, 1), cr = t < 0.22 ? bump(t, 0.44) : 0, land = bump(t - 0.75, 0.25); sy *= 1 - 0.15 * cr + 0.12 * Math.sin(PI * a) - 0.2 * land; sxz *= 1 + 0.08 * cr - 0.05 * Math.sin(PI * a) + 0.12 * land; aL = aR = 1.2 * Math.sin(PI * a); tY = 0.2 * Math.sin(PI * a) - 0.1 * land; s.eyeK = 1 - 0.5 * cr; wob = 0.03 + 0.04 * land; break; }
      case 'shock': { const k = 1 - smooth01((t - 0.8) / 0.2); s.eyeK = 1.35; s.mouthO = k; s.browY = 0.05 * k; rz += Math.sin(s.t * 30) * 0.05 * k; mR += Math.sin(s.t * 28 + 1) * 0.05 * k; tR += Math.sin(s.t * 26 + 2) * 0.07 * k; tY = 0.2 * bump(t, 0.2); aL = aR = 1.5 * k; aLx = aRx = -0.5 * k; wob = 0.05 * k; break; }
      case 'tired': {   // 'yoruldum': sarkık, iç çeker; her 2,6 s'de kocaman komik bir esneme (kollar yukarı, ağız kocaman)
        const yw = bump((s.pT % 2.6) / 2.6, 0.45);
        s.eyeK = lerp(0.4 + 0.08 * Math.sin(s.t * 2), 0.15, yw); sy *= (0.93 + 0.02 * Math.sin(s.t * 3)) * (1 + 0.14 * yw); sxz *= 1 + 0.04 * (1 - yw);
        rz += Math.sin(s.t * 1.5) * 0.05 * (1 - yw); tR += Math.sin(s.t * 1.5 + 1) * 0.08 * (1 - yw) - 0.1 * yw; tY = 0.15 * yw;
        aL = aR = lerp(-0.35, 1.6, yw); aLx = aRx = -0.3 * yw; s.mouthO = Math.max(0.25, yw); wob = 0.02 + 0.03 * yw; break; }
      case 'summon': { const k = smooth01(t / 0.15) * (1 - smooth01((t - 0.85) / 0.15)); aL = aR = 1.3 * k; y += Math.abs(Math.sin(t * PI * 3)) * 0.2 * k; break; }
      case 'dying': { aL = aR = 1.3 + Math.sin(s.t * 10) * 0.3; tY = Math.abs(Math.sin(s.t * 8)) * 0.15; mR = Math.sin(s.t * 5) * 0.05; wob = 0.03; break; }
    }
    if (pre > 0.01) { aL += 0.5 * pre; aLx -= 0.3 * pre; s.eyeK = lerp(s.eyeK, 0.65, pre); tR += Math.sin(s.t * 1.2) * 0.04 * pre; }
    if (stage >= 3 && ph === 'idle') { tR += Math.sin(s.t * 3) * 0.03; wob = 0.025; }
    if (st.hurt > 0 && ph !== 'dying') { const h = st.hurt * st.hurt, sd = hurtSide(s, st); mR += sd * 0.06 * h; tR -= sd * 0.1 * h; tY += 0.06 * h; s.eyeK = Math.max(s.eyeK, 1 + 0.25 * h); wob = Math.max(wob, 0.03 * h); }
    B.body.position.y += y; B.body.scale.set(sxz, sy, sxz); B.body.rotation.set(rx, ry + (s.spinA || 0) * 0, rz);
    B.mid.rotation.set(0, (s.spinA || 0), mR); B.top.rotation.set(0, -(s.spinA || 0) * 0.5, tR); B.top.position.y += tY;
    B.armL.rotation.set(aLx, 0, -0.2 + aL); B.armR.rotation.set(aRx, 0, 0.2 - aR);
    // malzeme yuvaları (st.slots kadar parlar), mumlar ancak neşelenince yanar
    const slots = ph === 'dying' ? 4 : (st.slots || 1);
    for (let i = 0; i < 4; i++) { const on = i < slots; B['slot' + i].scale.setScalar(on ? 1 + 0.12 * Math.sin(s.t * 5 + i) : 0.0001); }
    const lit = ph === 'dying' ? smooth01((st.dying - 0.05) / 0.15) : 0;
    B.flames.scale.set(lit > 0.01 ? lit : 0.0001, lit > 0.01 ? lit * (1 + 0.15 * Math.sin(s.t * 23)) : 0.0001, lit > 0.01 ? lit : 0.0001);
    if (ph !== 'sweep' && s.spinA) s.spinA = damp(s.spinA, Math.round(s.spinA / (PI * 2)) * PI * 2, 3, dt);
    m.U.uWob.value.x = wobK(s, dt, wob);
  }

  // ════════════════ Kurabiye Asker (pastanın yardımcısı) ════════════════
  function buildKurabiye(r) {
    const gb = '#c8803e', gbL = '#e6a463', ic = '#ffffff';
    r.bone('body', 'root', [0, 0, 0]); r.bone('legL', 'body', [0.17, 0.35, 0]); r.bone('legR', 'body', [-0.17, 0.35, 0]);
    r.bone('armL', 'body', [0.3, 0.8, 0]); r.bone('armR', 'body', [-0.3, 0.8, 0]); r.bone('hat', 'body', [0, 1.25, 0]);
    r.on('body').fx(0, 0.25);
    r.add(G.sphere(24, 16), vgrad(0.3, 1.0, [[0, mixc(gb, '#8a5020', 0.3)], [1, gbL]]), [0, 0.68, 0], null, [0.3, 0.36, 0.17]);
    r.add(G.sphere(28, 18), vgrad(0.8, 1.3, [[0, gb], [1, gbL]]), [0, 1.05, 0], null, [0.3, 0.29, 0.18]);
    r.fx(0, 0.6);
    for (let i = 0; i < 3; i++) r.add(G.sphere(12, 8), ['#ff4f6e', '#5fd3ff', '#7ce07a'][i], [0, 0.82 - i * 0.14, 0.16], null, [0.05, 0.05, 0.03]);
    for (const sd of [-1, 1]) r.add(G.torus(PI, 0.3, 12), ic, [sd * 0.13, 1.17, 0.13], [0.4, 0, 0], [0.05, 0.035, 0.03]);   // (yanaklarda krema kıvrımı)
    for (const sd of [1, -1]) {
      r.on(sd > 0 ? 'legL' : 'legR').fx(0, 0.25).add(G.capsule(1, 10), gb, [sd * 0.17, 0.22, 0], null, [0.11, 0.12, 0.1]);
      r.fx(0, 0.6).add(G.torus(PI, 0.25, 12), ic, [sd * 0.17, 0.12, 0.08], [0, 0, PI], [0.09, 0.04, 0.04]);
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.25).add(G.capsule(1, 10), gb, [sd * 0.42, 0.72, 0], [0, 0, sd * 1.1], [0.09, 0.14, 0.08]);
      r.fx(0, 0.6).add(G.torus(PI, 0.25, 12), ic, [sd * 0.5, 0.66, 0.06], [0, 0, sd * 1.1 + PI], [0.07, 0.04, 0.03]);
    }
    // şeker kamışı mızrak (sağ el)
    r.on('armR').fx(0, 0.8);
    for (let i = 0; i < 6; i++) r.seg([-0.55, 0.3 + i * 0.16, 0.08], [-0.55, 0.46 + i * 0.16, 0.08], 0.035, i % 2 ? '#ffffff' : '#ff4f6e', 0.035, 8);
    r.add(G.torus(PI, 0.3, 12), '#ff4f6e', [-0.47, 1.26, 0.08], null, [0.08, 0.08, 0.06]);
    // asker şapkası: kırmızı, altın yıldız
    r.on('hat').fx(0, 0.5).add(G.cyl(0.85, 1, 18), '#e8344e', [0, 1.38, -0.02], [-0.1, 0, 0], [0.17, 0.22, 0.17]);
    r.add(G.cyl(1, 1, 18), '#2a2f6a', [0, 1.26, 0], [-0.1, 0, 0], [0.19, 0.04, 0.19]);
    r.fx(0.3, 2).add(star5Geo(), GOLD, [0, 1.4, 0.15], null, 0.13);
    r.fx(0, 0);
    face(r, [0, 1.05, 0.0], 0.27, { bone: 'body', tilt: 0.1, ex: 0.1, ey: 0.03, er: 0.065, iris: '#3a2210', skin: gbL, browCol: '#ffffff', mouthY: -0.1, mouthW: 0.09, heartY: 0.9, mouthPivot: true });
    r.on('body').mark('muzzle', [0, 0.8, 0.3]);
    return { height: 1.5, glowC: col('#ffd9a0'), mat: { rough: 0.62, rim: '#fff0d8', rimK: 0.25 } };
  }
  function animKurabiye(m, dt, st, s) {
    const B = m.B;
    s.walk = (s.walk || 0) + dt * 10 * Math.max(0.2, s.mv);
    const w = Math.sin(s.walk) * s.mv, wind = Math.max(0, st.windup), atk = st.attack >= 0 && st.attack < 1 ? Math.sin(st.attack * PI) : 0;
    B.legL.rotation.x = w * 0.6; B.legR.rotation.x = -w * 0.6;
    B.armL.rotation.x = -w * 0.5; B.armR.rotation.x = w * 0.3 - 0.9 * wind + 1.4 * atk;
    B.body.position.y += Math.abs(Math.sin(s.walk)) * 0.06 * s.mv; B.body.rotation.z = Math.sin(s.walk) * 0.06 * s.mv; B.body.rotation.x = -0.15 * wind + 0.25 * atk;
    B.hat.rotation.z = Math.sin(s.t * 3 + s.ph) * 0.06;
  }

  // ════════════════ Kayıt ════════════════
  E.register('uykucuSupurge', buildSupurge, animSupurge, 0.7);
  E.register('dudukluTencere', buildTencere, animTencere, 0.72);
  E.register('dondurmaKrali', buildDondurma, animDondurma, 0.62);
  E.register('kocaPasta', buildPasta, animPasta, 0.6);
  E.register('kurabiyeAsker', buildKurabiye, animKurabiye, 0.55);
  const mk = id => o => E.make(id, o);
  const own = { own: true };
  reg('uykucuSupurge', { ad: 'Uykucu Süpürge', base: 'kraljole', model: mk('uykucuSupurge'),
    stats: { r: 1.6, height: 2.8, speed: 1.7, aggro: 13, slamR: 2.6, phases: ['idle', 'move', 'roar', 'summon', 'suck', 'blow', 'cable', 'nap'] },
    lines: { giris: 'uykucuSupurge_giris', bitti: 'uykucuSupurge_bitti' },
    bossKit: Object.assign({ add: 'tozTavsani', at: [0.5], n: [2], col: '#b9c7ff', roar: 0.75, roarSfx: 'sigh' }, own) });
  reg('dudukluTencere', { ad: 'Düdüklü Tencere', base: 'kefirdev', model: mk('dudukluTencere'),
    stats: { r: 1.45, height: 2.6, speed: 1.8, aggro: 13, phases: ['idle', 'move', 'roar', 'summon', 'lid', 'steam', 'rain'] },
    lines: { giris: 'dudukluTencere_giris', bitti: 'dudukluTencere_bitti' },
    bossKit: Object.assign({ add: 'kopukBalonu', at: [0.5], n: [2], col: '#ffd9a0', roar: 1.3, roarSfx: 'fizz' }, own) });
  reg('dondurmaKrali', { ad: 'Dondurma Kralı', base: 'lavkaplumbaga', model: mk('dondurmaKrali'),
    stats: { r: 1.5, height: 3.5, speed: 1.7, aggro: 13, phases: ['idle', 'move', 'roar', 'summon', 'snow', 'slide', 'slideGo', 'scoop'] },
    lines: { giris: 'dondurmaKrali_giris', bitti: 'dondurmaKrali_bitti' },
    bossKit: Object.assign({ add: 'buzKupu', at: [0.5], n: [2], col: '#bfe9ff', roar: 1.15 }, own) });
  reg('kocaPasta', { ad: 'Koca Huysuz Pasta', base: 'sovalye', model: mk('kocaPasta'),
    stats: { r: 2.05, height: 3.6, speed: 1.6, aggro: 14, phases: ['idle', 'move', 'roar', 'squirt', 'taunt', 'cookies', 'strawrain', 'sweep', 'jump', 'shock', 'tired'] },
    lines: { giris: 'kocaPasta_giris', bitti: 'kocaPasta_bitti' },
    bossKit: Object.assign({ add: 'kurabiyeAsker', at: [], n: [], col: '#ffb8d0', roar: 1.25, roarSfx: 'roar', horn: false, roam: false, word: null, summonAt: 0.47, addHp: 0.6, addDmg: 0.6 }, own) });
  HUYSUZ.type('kurabiyeAsker', { ad: 'Kurabiye Asker', base: 'nobetci', saldiri: 'yakin', model: mk('kurabiyeAsker'), stats: { r: 0.5, height: 1.5, speed: 2.4 } });
  HUYSUZ.zone('oturma', { boss: 'uykucuSupurge' });
  HUYSUZ.zone('mutfak', { boss: 'dudukluTencere' });
  HUYSUZ.zone('buzdolabi', { boss: 'dondurmaKrali' });
  HUYSUZ.zone('pasta', { boss: 'kocaPasta' });
})();
