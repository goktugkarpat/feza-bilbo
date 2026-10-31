/* Pırıl'ın yetenekleri ve yardımcı kancaları (eski BILBO_FUN + HALA kancalarının yerini alır; PIRIL.md › 7).
   Yetenekler ışık geldikçe açılır (PIRIL_GUC.ac(n)); hepsi KENDİLİĞİNDEN kullanılır (5 yaş: düğme gerekmez):
     1 ışık nefesi  — yakındaki huysuzlara parıltı topları üfler (hasar + kısa sersemletme, kalpler)
     2 köpük kalkanı — Feza'nın canı azalınca / sık vurulunca Feza'yı köpük balonuna alır (P.shield: hasar almaz)
     3 kanat rüzgârı — Feza'nın çevresine yığılan huysuzları kanat çırparak yumuşakça iter (sersemletir)
     4 kalp tozu    — Feza'nın canı yarıdan azsa kalp tozu serper: can tazelenir, yakındaki huysuzlar biraz neşelenir
     5 büyük Pırıl  — PIRIL_GUC.buyu(true/false): 1 → 2,6 kat büyür; ride(true) / ucus(true) ile Feza sırtına biner, birlikte uçarlar
   Motor kancaları (07_game; hepsi isteğe bağlı):
     BILBO_FUN olarak: step(dt, ctx) · pose(BST, ctx) · onPlace(ctx) · ride(on, s, ctx) · riding · busy() · heroLift(ctx, dt) · sneeze
     HALA olarak: create(scene) · update(dt, hctx) · ac(n, {sessiz}) · onCheer · onFezaHurt · onFezaLow · onFezaDown · teamReady() ·
                  teamMove({blast,P,H}) · charge · pointTo(x, z)
   Ek: seviye · buyu(on) · ucus(on) · goster(x, z, sn) · kullan(n) (test: yeteneği hemen kullan) · model() */
const PIRIL_GUC = (() => {
  'use strict';
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const d2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
  const AYAR = {
    nefes: { cd: 5.5, r: 6.5, dmgK: 1.1, stun: 1.2 },
    kalkan: { cd: 22, sure: 4.5, can: 0.5 },
    ruzgar: { cd: 9, r: 2.8, kac: 2, guc: 1.1, stun: 1.4 },
    kalp: { cd: 20, can: 0.5, iyi: 0.3, r: 4, dmgK: 0.6 },
    takim: { dolum: 32 },   // Takım Hamlesi ~32 s'de dolar (huysuz neşelendirmek hızlandırır)
    buyuk: 2.2,   // büyüme ilerlemesi ölçeği (1 → buyuk); asıl boy buyukToplam
    buyukToplam: 4.3,   // büyük Pırıl'ın MUTLAK ölçeği (kök × iç): boy ≈ 4,0 m ≈ Feza'nın 2,5 katı (oyunda da finalde de)
    boy: 1.5,
    basTepe: .5,
    konBoy: .65,   // başa konmuşken ölçek (Feza'nın başından küçük)   // Feza'nın baş kemiğinden saç tepesine (m): başına konarken   // oyunda Pırıl BILBO_SCALE (0.78) × bu: Feza'nın yanında okunur boy
  };
  let seviye = 0, scene = null, model = null, bctx = null, hctx = null, t = 0;
  const cd = { nefes: 2, kalkan: 0, ruzgar: 3, kalp: 0 };
  const sayilar = { nefes: 0, kalkan: 0, ruzgar: 0, kalptozu: 0 };
  let sonSoz = -99, sonOvgu = -99, sonOvguK = '', charge = 0, hurtT = [], buyuk = 1, buyukHedef = 1, ride = 0, rideOn = false, rideT = 0;
  let benRide = false, uyuyor = false, bosT = 0, tozT = 0;
  let downAt = -1, kalkanT = 0, isikGoster = null, pointT = 0, sessizlik = 0;
  const lastRoot = { x: 0, z: 0 };
  const api = () => (hctx && hctx.api) || (bctx && bctx.api) || null;
  function sfx(k, o) { const a = api(); if (!a || !a.sfx) return; try { a.sfx(k, o || { vol: 1 }); } catch (e) { /* yok */ } }
  function say(k) { const a = api(); if (!a || !a.say) return false; try { return a.say(k, 2); } catch (e) { return false; } }
  function sozSeyrek(k, n2) {   // ilk iki kullanımda, sonra %10 ve ≥ 40 s ara
    const i = (sayilar[k] = (sayilar[k] || 0) + 1);
    if ((i <= 2 || Math.random() < .1) && t - sonSoz > (i <= 2 ? 8 : 40)) { sonSoz = t; say('pp_' + k + '_' + (i <= 2 ? i : 1 + (Math.random() * n2 | 0))); }
  }

  // ── Görsel: köpük balonu (Feza'nın çevresinde) — tek mesh, oluşturma bir kez ──
  let balon = null, balonMat = null;
  function balonYap() {
    if (balon || !scene || typeof THREE === 'undefined') return;
    balonMat = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: .28, roughness: .1,
      metalness: 0, emissive: 0x6fb8ff, emissiveIntensity: .35, depthWrite: false, side: THREE.DoubleSide });
    // kenarı parlak (fresnel) köpük
    balonMat.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
        { float rim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
          outgoingLight += vec3(1.0, 0.85, 1.0) * pow(rim, 2.5) * 1.2; diffuseColor.a = clamp(diffuseColor.a + pow(rim, 3.0) * 0.6, 0.0, 1.0); }
        #include <opaque_fragment>`);
    };
    balonMat.customProgramCacheKey = () => 'pirilBalon';
    balon = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), balonMat);
    balon.name = 'Piril kopuk kalkani'; balon.visible = false; balon.renderOrder = 3; balon.frustumCulled = false;
    scene.add(balon);
  }

  // ── Yetenekler ──
  function enemiesNear(x, z, r) { const a = api(); if (!a || !a.enemiesNear) return []; try { return a.enemiesNear(x, z, r) || []; } catch (e) { return []; } }
  function canlilar(list) { return list.filter(e => e && !e.dead && !e.hidden); }
  function oyunda() { const c = hctx || bctx; return !!c && c.state === 'play' && c.P && !c.P.dead; }
  function nefes(zorla) {
    if (!model || !bctx || !oyunda()) return false;
    const P = bctx.P, px = bctx.pos.x, pz = bctx.pos.z, a = api();
    let hedef = canlilar(enemiesNear(px, pz, AYAR.nefes.r)).filter(e => !a.los || a.los(px, pz, e.x, e.z));
    if (!hedef.length) return false;
    hedef.sort((p, q) => d2(p.x, p.z, px, pz) - d2(q.x, q.z, px, pz)); hedef = hedef.slice(0, 3);
    const ok = model.fetchBone(P.pos, hedef, e => {
      if (!oyunda() || e.dead) return;
      const n = Math.max(6, Math.round((a.heroDamage ? a.heroDamage() : 10) * AYAR.nefes.dmgK));
      a.damage(e, n, { kind: 'bilbo', silent: true });
      if (!e.boss) e.stun = Math.max(e.stun || 0, AYAR.nefes.stun);
      if (a.burst) a.burst('star', e.x, 1, e.z, { count: 4, color: '#fff2a8' });
    }, { canLaunch: () => oyunda(), routeClear: a.los });
    if (ok) { sfx('pirilPuf', { x: px, z: pz }); sozSeyrek('nefes', 2); }
    return ok;
  }
  function kalkan() {
    const a = api(); if (!a || !oyunda()) return false;
    const P = (hctx || bctx).P;
    if (a.shield) a.shield(AYAR.kalkan.sure);
    kalkanT = AYAR.kalkan.sure; balonYap();
    if (a.burst) a.burst('sparkle', P.pos.x, 1, P.pos.z, { color: '#bfe8ff', count: 5 });
    sfx('kopukKalkan'); kalkanPat = true;
    if (model) model.salla(1.2);
    sozSeyrek('kalkan', 2); return true;
  }
  function ruzgar(zorla) {
    if (!bctx || !oyunda()) return false;
    const P = bctx.P, a = api();
    const yakin = canlilar(enemiesNear(P.pos.x, P.pos.z, AYAR.ruzgar.r)).filter(e => !e.boss);
    if (!zorla && yakin.length < AYAR.ruzgar.kac) return false;
    for (const e of yakin) {
      let dx = e.x - P.pos.x, dz = e.z - P.pos.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      if (bctx.push) bctx.push(e, dx * AYAR.ruzgar.guc, dz * AYAR.ruzgar.guc, AYAR.ruzgar.stun);
    }
    if (a.fx) a.fx('ring', P.pos.x, P.pos.z, { r0: .4, r1: AYAR.ruzgar.r + .6, dur: .5, color: '#e8f6ff', width: .3 });
    sfx('kanatRuzgar');
    if (model) { model.salla(.9); model.nefes(.01); }
    ruzgarT = .7; sozSeyrek('ruzgar', 2); return true;
  }
  let ruzgarT = 0, kalkanPat = false, kanatT = 2;
  function kalpTozu() {
    const a = api(); if (!a || !oyunda()) return false;
    const P = (hctx || bctx).P;
    if (a.heal) a.heal(AYAR.kalp.iyi);
    if (a.burst) a.burst('hearts', P.pos.x, 1.3, P.pos.z, { count: 7 });
    for (const e of canlilar(enemiesNear(P.pos.x, P.pos.z, AYAR.kalp.r))) {
      if (a.damage) a.damage(e, Math.max(4, Math.round((a.heroDamage ? a.heroDamage() : 10) * AYAR.kalp.dmgK)), { kind: 'bilbo', silent: true });
    }
    if (model) model.takla();
    sfx('kalpTozu');
    sozSeyrek('kalptozu', 2); return true;
  }
  // test / UI: n. yeteneği hemen kullan
  function kullan(n) {
    if (n === 1) return nefes(true);
    if (n === 2) return kalkan();
    if (n === 3) return ruzgar(true);
    if (n === 4) return kalpTozu();
    if (n === 5) { buyu(buyukHedef === 1); return true; }
    return false;
  }
  function otomatik(dt) {
    if (!oyunda() || rideOn) return;
    const c = hctx || bctx, P = c.P;
    for (const k in cd) cd[k] = Math.max(0, cd[k] - dt);
    const frac = P.maxHp ? P.hp / P.maxHp : 1;
    if (seviye >= 4 && cd.kalp <= 0 && frac < AYAR.kalp.can) { if (kalpTozu()) { cd.kalp = AYAR.kalp.cd; return; } }
    if (seviye >= 2 && cd.kalkan <= 0 && !(P.shield > 0)) {
      let sk = 0; for (let i = 0; i < hurtT.length; i++) if (t - hurtT[i] < 4) sk++;
      const sik = sk >= 3;
      if (frac < AYAR.kalkan.can || sik) { if (kalkan()) { cd.kalkan = AYAR.kalkan.cd; return; } }
    }
    if (seviye >= 3 && cd.ruzgar <= 0) { if (ruzgar(false)) { cd.ruzgar = AYAR.ruzgar.cd; return; } cd.ruzgar = .3; }   // yığılma yoksa 0,3 s sonra yine bak
    if (seviye >= 1 && cd.nefes <= 0 && model && !model.isFetching()) { if (nefes(false)) cd.nefes = AYAR.nefes.cd; else cd.nefes = .6; }
  }

  // ── Büyük Pırıl ve biniş ──
  function buyu(on) { buyukHedef = on ? AYAR.buyuk : 1; if (!model && typeof GAME !== 'undefined' && GAME && GAME.Bilbo) model = GAME.Bilbo; if (model && model.buyukluk) model.buyukluk(on ? 1 : 0, AYAR.buyukToplam); const a = api(); if (a && a.sfx) a.sfx(on ? 'buyume' : 'whoosh', { vol: .7 }); if (model) model.sevin(1.2); return true; }
  function rideSet(on, s, c) {
    if (c) bctx = c;
    if (on) {
      if (!bctx || !bctx.P || bctx.P.dead) return false;
      rideOn = true; rideT = Number.isFinite(s) ? s : 999;
      if (buyukHedef < AYAR.buyuk) buyu(true);
      bctx.P.rideMul = 1.3; if (bctx.recalcStats) bctx.recalcStats();
      return true;
    }
    if (rideOn && bctx && bctx.P) { bctx.P.rideMul = 1; if (bctx.recalcStats) bctx.recalcStats(); if (bctx.follow) bctx.follow.reset(bctx.P.pos, bctx.pos.x, bctx.pos.z, bctx.P.face || 0); }
    rideOn = false; return true;
  }
  // BILBO_FUN.step: binişte Pırıl'ı biz yönetiriz (Feza'nın altında, onun yönünde); yoksa null → takip
  function kanatSeviye() { return isikGoster == null ? seviye : isikGoster; }
  // ── Uyku molası (STORY): mola(true, x, z, açı) → Pırıl o noktaya (Feza'nın yanı) süzülür, yere kıvrılıp uyur (model.uyu);
  //    her kare yeni hedef verilebilir (Feza kalkıp yürürse peşinden gider); mola(false) → uyanır, gerinir, takibe döner.
  const MOLA = { on: false, x: 0, z: 0, face: 0, k: 0, was: false };
  function mola(on, x, z, face) {
    if (on) { MOLA.on = true; MOLA.x = x; MOLA.z = z; MOLA.face = face || 0; }
    else if (MOLA.on) { MOLA.on = false; if (model) { model.uyu(false); if (model.gerin) model.gerin(1.9); if (model.sevin) model.sevin(2.2); } }
    return true;
  }
  function molaStep(dt, c) {
    const p = c.pos || { x: MOLA.x, z: MOLA.z }, dx = MOLA.x - p.x, dz = MOLA.z - p.z, d = Math.hypot(dx, dz);
    const sp = Math.min(d, 4.6 * dt), x = p.x + (d > 1e-3 ? dx / d * sp : 0), z = p.z + (d > 1e-3 ? dz / d * sp : 0);
    const var_ = d < 0.35;
    MOLA.k = var_ ? Math.min(1, MOLA.k + dt * 2.2) : Math.max(0, MOLA.k - dt * 3);
    // kıvrılma pozu modelde (state.kivril: karnı yere değer, kendi yüksekliğini indirir); burada yalnız yer ve yön
    return { x, z, speed: var_ ? 0 : 4.6, face: var_ ? MOLA.face : Math.atan2(dx, dz), hop: 0.3 * (1 - MOLA.k) };
  }
  function step(dt, c) {
    bctx = c; if (c && c.Bilbo) model = c.Bilbo;
    if (MOLA.on && !rideOn && c && c.P && !c.P.dead) { MOLA.was = true; const r = molaStep(dt, c); MOLA.lx = r.x; MOLA.lz = r.z; MOLA.lf = r.face; return r; }
    if (MOLA.was) {   // mola bitti: takip, Pırıl'ın şimdiki yerinden devam etsin (ışınlanmasın)
      MOLA.was = false; MOLA.k = 0;
      if (c && c.follow && c.follow.reset && c.P) { try { c.follow.reset(c.P.pos, MOLA.lx, MOLA.lz, MOLA.lf || 0); } catch (e) { /* yok */ } }
    }
    if (rideOn) {
      rideT -= dt; if (rideT <= 0 || !c.P || c.P.dead || c.state !== 'play' && c.state !== 'transition') { rideSet(false); return null; }
      const P = c.P;
      // sırttaki oturma yeri Feza'nın tam altına gelsin (önceki karenin farkı)
      let ox = 0, oz = 0;
      if (model && model.saddle) { const w = model.saddle.getWorldPosition(_v); ox = w.x - lastRoot.x; oz = w.z - lastRoot.z; }
      const x = P.pos.x - ox, z = P.pos.z - oz;
      lastRoot.x = x; lastRoot.z = z;
      return { x, z, speed: Math.min(6, (c.heroVel || 0)), face: P.face || 0, hop: -.25 };
    }
    return null;
  }
  const _v = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
  function heroLift(c, dt) {
    ride = rideOn ? Math.min(1, ride + dt * 3) : Math.max(0, ride - dt * 3);
    if (ride <= 0 || !model || !model.saddle) return null;
    model.root.updateMatrixWorld(true);
    const w = model.saddle.getWorldPosition(_v);
    return { k: ride, y: Math.max(0, w.y - .05) };
  }
  // BILBO_FUN.pose: BST'yi Pırıl'a göre ayarla (07 bunu model.update'ten hemen önce çağırır)
  function pose(B, c) {
    bctx = c; if (c && c.Bilbo) model = c.Bilbo;
    if (!model) return;
    // ölçek (büyük Pırıl): 07 her kare BILBO_SCALE yazar; üstüne çarpanı uygula
    model.root.scale.multiplyScalar(AYAR.boy * konOlcek);   // (büyüme kök ölçeğinde değil: model.buyukluk, update'te)   // başa konunca küçülür (konOlcek → AYAR.konBoy)
    // binişi biz açtıysak biz kapatırız (STORY finalde BST.ride'ı kendisi de açabilir: ona dokunma)
    if (ride > .3) { B.ride = true; benRide = true; } else if (benRide) { B.ride = false; benRide = false; }
    B.kon = !!(c.follow && c.follow.konmus && c.follow.konmus());
    B.happy = Math.max(B.happy || 0, ruzgarT > 0 ? 1 : 0, c.P && c.P.dead ? 0 : 0);
    // Feza'ya bak (yakınken), dalışta/nefeste hedefe
    B.kivril = MOLA.on && MOLA.k > 0.3;
    if (MOLA.on) { model.bak(null); return; }   // uyku molasında kıvrılmış, gözler kapalı
    if (c.P && !B.pounce && !model.isFetching() && !rideOn) {
      _bak.set(c.P.pos.x, (c.P.pos.y || 0) + 1.2, c.P.pos.z); model.bak(_bak);
    } else model.bak(null);
    if (model.isik && model.isikSayisi() !== kanatSeviye()) model.isik(kanatSeviye());
  }
  const _bak = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
  function onPlace(c) { bctx = c; if (c && c.Bilbo) model = c.Bilbo; if (rideOn) rideSet(false); }
  function busy() { return rideOn; }

  // ── HALA kancaları ──
  function create(sc) { scene = sc; balonYap(); if (typeof window !== 'undefined' && !dokunmaKuruldu) { dokunmaKuruldu = true; window.addEventListener('pointerdown', dokunma, { capture: true, passive: false }); } }
  let dokunmaKuruldu = false;
  function update(dt, c) {
    hctx = c; t += dt;
    if (c && c.Bilbo) model = c.Bilbo;
    if (bekleyenYon && bctx && bctx.follow && !(bctx.follow.pozda && bctx.follow.pozda())) { const y = bekleyenYon; bekleyenYon = null; pointTo(y.x, y.z); }
    topAdim(dt);
    // ölçek yumuşak geçiş (büyüme ve başa konma)
    { const kon = !!(bctx && bctx.follow && bctx.follow.konuyor && bctx.follow.konuyor()); konOlcek += ((kon ? AYAR.konBoy : 1) - konOlcek) * (1 - Math.exp(-5 * dt)); }
    // boss girişinde 'hazırım' pozu (GAME.on('boss'))
    if (!bossAbone && typeof GAME !== 'undefined' && GAME && GAME.on) { bossAbone = true; try { GAME.on('boss', d => { if (d && d.on && model && !rideOn) { model.hazir(1.8); sfx('pirilKukre', { vol: .8 }); } }); } catch (e) { /* yok */ } }
    buyuk += (buyukHedef - buyuk) * (1 - Math.exp(-2.2 * dt));   // ~1,3 sn'de yumuşak büyüme
    if (Math.abs(buyuk - buyukHedef) < .002) buyuk = buyukHedef;

    ruzgarT = Math.max(0, ruzgarT - dt);
    if (c && c.state === 'play') {
      otomatik(dt);
      if (!(c.P && c.P.dead)) {
        const eskiHazir = charge >= 1;
        charge = Math.min(1, charge + dt / AYAR.takim.dolum);
        if (!eskiHazir && charge >= 1 && t - sonSoz > 6) { sonSoz = t; say('pp_takim_hazir'); }
      }
      // uzun sessizlikte ara sıra sevgi sözü
      sessizlik += dt;
      if (sessizlik > 75 && Math.random() < dt * .05) { sessizlik = 0; if (t - sonSoz > 30) { sonSoz = t; say(Math.random() < .5 ? 'pp_seviyorum' : 'pp_buradayim'); } }
    }
    // (başlıkta Pırıl'ın pozu STORY'nin: titlePose / poseChars — burada dokunulmaz)
    // canlılık: Feza durunca ara sıra küçük bir şaka (kuyruk kovalama, hapşırık, başına konma, el sallama); uçarken seyrek ışık tozu
    if (model && c && c.state === 'play' && c.P && !c.P.dead && !rideOn) {
      const v = bctx ? bctx.heroVel || 0 : 0;
      bosT = v < .3 ? bosT + dt : 0;
      sakaT -= dt;
      if (bosT > 4 && sakaT <= 0) saka(c);
      kanatT -= dt;
      if (kanatT <= 0) { kanatT = 1.5 + Math.random() * 1.5; if (bctx && bctx.pos && Math.hypot(bctx.pos.x - c.P.pos.x, bctx.pos.z - c.P.pos.z) < 4) sfx('kanat', { x: bctx.pos.x, z: bctx.pos.z, vol: .6 }); }
      tozT -= dt;
      if (seviye > 0 && tozT <= 0 && bctx && bctx.pos) {
        tozT = 1.6;   // ışık tozu çok seyrek (ekran sade kalsın)
        const a = api(); if (a && a.burst) a.burst('sparkle', bctx.pos.x, 1.2 + Math.random() * .4, bctx.pos.z, { color: ['#e8d6ff', '#c8f7e6', '#fff2a8'][Math.random() * 3 | 0], count: 1 });
      }
    }
    // köpük balonu Feza'yı sarar
    kalkanT = Math.max(0, kalkanT - dt);
    if (kalkanPat && kalkanT <= 0) { kalkanPat = false; sfx('kopukPat', { vol: .8 }); }
    if (balon) {
      const P = c && c.P, on = kalkanT > 0 && P && !P.dead && c.state === 'play';
      balon.visible = !!on;
      if (on) {
        const k = Math.min(1, (AYAR.kalkan.sure - kalkanT) * 6) * Math.min(1, kalkanT * 3);
        balon.position.set(P.pos.x, (P.pos.y || 0) + .78, P.pos.z);
        const w = Math.sin(t * 7) * .03;
        balon.scale.set(.95 * k * (1 + w), .95 * k * (1 - w), .95 * k * (1 + w));
        balonMat.opacity = .22 + .08 * Math.sin(t * 4);
      }
    }
    if (downAt >= 0 && c && c.P && !c.P.dead) { downAt = -1; if (t - sonSoz > 3) { sonSoz = t; say(Math.random() < .5 ? 'pp_kalkti_1' : 'pp_kalkti_2'); } }
  }
  function ac(n, o = {}) {
    n = Math.max(0, Math.min(5, n | 0));
    const yeni = n > seviye; seviye = Math.max(seviye, n);
    if (model) { model.isik(seviye); if (yeni && !o.sessiz) { model.sevin(4); setTimeout(() => { if (model) model.salla(2.2); }, 700); } }
    // ışık anı: yakın planda Pırıl Feza'nın yanında, yüzü kameraya dönük durur (takla yok: sırtı dönmesin)
    if (yeni && !o.sessiz && bctx && bctx.follow && bctx.follow.pozVer) { bctx.follow.pozVer(12); sakaT = Math.max(sakaT, 16); }
    if (yeni && !o.sessiz) {
      const a = api();
      if (a && a.burst && (hctx || bctx) && (hctx || bctx).P) { const P = (hctx || bctx).P; a.burst('star', P.pos.x, 2, P.pos.z, { count: 8, color: '#fff2a8' }); }
      sfx('pirilMutlu');   // (konuşmayı STORY yapar: pr_isik_n + pp_guc_n)
      cd.nefes = Math.min(cd.nefes, 1); cd.ruzgar = Math.min(cd.ruzgar, 2);
    }
    return true;
  }
  function onCheer(o) {
    sessizlik = 0; charge = Math.min(1, charge + (o && o.boss ? .3 : o && o.elite ? .12 : .05));
    if (model) { if (o && (o.boss || o.elite)) model.takla(); else if (Math.random() < .45) model.alkis(1.1); }
    if (o && (o.boss || o.elite)) sfx('pirilKikir', { vol: .8 });
    const p = o && o.elite ? .8 : .3;
    if (t - sonOvgu > 20 && Math.random() < p) {
      let k; do { k = 'pp_ovgu_' + (1 + (Math.random() * 10 | 0)); } while (k === sonOvguK);
      if (t - sonSoz > 4) { sonOvgu = t; sonOvguK = k; sonSoz = t; say(k); }
    }
  }
  function onFezaHurt(o) { hurtT.push(t); if (hurtT.length > 6) hurtT.shift(); }
  let sonCanAz = -99;
  function onFezaLow(o) {
    if (t - sonCanAz > 45 && t - sonSoz > 5) { sonCanAz = t; sonSoz = t; say('pp_can_az'); }
    if (seviye >= 4 && cd.kalp <= 0 && kalpTozu()) cd.kalp = AYAR.kalp.cd;
    else if (seviye >= 2 && cd.kalkan <= 0 && kalkan()) cd.kalkan = AYAR.kalkan.cd;
  }
  function onFezaDown(o) {
    downAt = t; sonSoz = t; say('pp_saril_' + (1 + (Math.random() * 3 | 0)));
    if (model) { model.uyu(false); model.salla(2); }
    if (o && bctx && bctx.follow && bctx.follow.goster) bctx.follow.goster(o.x, o.z, 2.2);   // Feza'nın üstünde kanatlarıyla döner
    // Pırıl kanatlarıyla sarar, kalp tozu serper → 2.4 s sonra Feza kalkar
    const a = api();
    setTimeout(() => { if (a && a.burst && o) a.burst('hearts', o.x, 1, o.z, { count: 6 }); }, 900);
    return 2.4;
  }
  function teamReady() { return charge >= 1 && oyunda(); }
  function teamMove(o) {
    if (!teamReady()) return false;
    charge = 0;
    const blast = o && o.blast;
    if (model) { model.takla(); model.nefes(1.2); }
    setTimeout(() => { if (blast) blast(); }, 350);
    const a = api(); if (a && a.burst && o && o.P) a.burst('star', o.P.pos.x, 2.2, o.P.pos.z, { count: 8, color: '#d9c8ff' });
    sonSoz = t; say('pp_takim_' + (1 + (Math.random() * 3 | 0)));
    return true;
  }
  // yol / kapı gösterme
  let bekleyenYon = null;   // ışık anı pozundayken gelen yol gösterme, poz bitince yapılır
  function pointTo(x, z) {
    const f = bctx && bctx.follow;
    if (f && f.pozda && f.pozda()) { bekleyenYon = { x, z }; return true; }
    if (f && f.goster && f.goster(x, z, 2.6) && t - sonSoz > 8) { sonSoz = t; say('pp_yon_' + (1 + (Math.random() * 3 | 0))); }
    return true;
  }
  function goster(x, z, sn) { if (bctx && bctx.follow && bctx.follow.goster) return bctx.follow.goster(x, z, sn || 3); return false; }
  // ── Işık alma anı: boss'un yerinden tek parlak top yay çizerek Pırıl'ın göğsüne uçar (~1,2 sn); değince kanatlar o renkte
  //    bir kez parlar, Pırıl mutlu bir dönüş yapar, sonra ac(n). Ek parçacık en çok 6 (yol boyunca 1'er tane).
  const ISIK_RENK = [0xff9ad5, 0x7fe0ff, 0xffe36a, 0x9dff8a, 0xc49bff];   // 10_story ile aynı sıra
  let isikTop = null;
  function isikAl(n, from, o = {}) {
    n = Math.max(1, Math.min(5, n | 0));
    const sc = scene || (model && model.root.parent);
    if (!model || !sc || typeof THREE === 'undefined') { ac(n, o); return false; }
    if (isikTop) bitirTop(true);
    const renk = ISIK_RENK[n - 1];
    // top: beyaza yakın parlak çekirdek (r 0,15) + o renkte yumuşak hale (additive sprite, ~0,3 m) + arkada 4 sönen kopya (kısa kuyruk)
    const g = new THREE.Group(); g.name = 'Piril isik topu';
    const cekirdek = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(renk).lerp(new THREE.Color(0xffffff), .45), toneMapped: false }));
    g.add(cekirdek);
    const haleMat = model.haleMalzemesi ? model.haleMalzemesi(renk) : null;
    const kuyruk = [];
    if (haleMat) {
      haleMat.opacity = 1;
      const h = new THREE.Sprite(haleMat); h.scale.setScalar(1.05); g.add(h);
      for (let i = 0; i < 4; i++) { const m = haleMat.clone(); m.opacity = .55 - i * .12; const k = new THREE.Sprite(m); k.scale.setScalar(.75 - i * .12); sc.add(k); kuyruk.push(k); }
    }
    const P = (hctx || bctx || {}).P;
    const f = from && Number.isFinite(from.x) ? from : (P ? { x: P.pos.x + 2, z: P.pos.z - 2 } : { x: 0, z: 0 });
    const a = new THREE.Vector3(f.x, Number.isFinite(f.y) ? f.y : 1.6, f.z);
    g.position.copy(a); sc.add(g);
    const iz = []; for (let i = 0; i < 16; i++) iz.push(a.clone());   // konum geçmişi (kuyruk bunu izler)
    for (const k of kuyruk) k.position.copy(a);
    isikTop = { g, a, n, o, renk, t: 0, dur: 1.4, iz, izI: 0, kuyruk, sc };
    sfx('isikGeldi', { vol: .8 });
    return true;
  }
  const _ib = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
  function topAdim(dt) {
    halkaAdim(dt);
    const T = isikTop; if (!T || !model) return;
    T.t += dt;
    const u = Math.min(1, T.t / T.dur), e = u * u * (3 - 2 * u);
    model.body.getWorldPosition(_ib);   // Pırıl'ın göğsü (hedef her kare güncel)
    T.g.position.lerpVectors(T.a, _ib, e); T.g.position.y += Math.sin(Math.PI * u) * 1.7;   // yüksek yay: yukarıdan bakan kameradan da görünür
    T.g.scale.setScalar(1 + .15 * Math.sin(T.t * 14) - .25 * u);
    // kuyruk: 3 kare arayla geçmiş konumlar
    T.izI = (T.izI + 1) % T.iz.length; T.iz[T.izI].copy(T.g.position);
    for (let i = 0; i < T.kuyruk.length; i++) T.kuyruk[i].position.copy(T.iz[(T.izI - (i + 1) * 3 + T.iz.length * 4) % T.iz.length]);
    if (u >= 1) bitirTop(false);
  }
  function bitirTop(sessizce) {
    const T = isikTop; if (!T) return; isikTop = null;
    if (!sessizce) model.body.getWorldPosition(_ib);
    for (const o of [T.g, ...T.kuyruk]) { if (o.parent) o.parent.remove(o); o.traverse(q => { if (q.isMesh) q.geometry.dispose(); if (q.material) q.material.dispose(); }); }
    if (!sessizce && model) {
      model.kanatParla(T.renk, .8, 4.5); model.donus(1.1); sfx('pirilMutlu');
      halkaBaslat(T.sc, _ib, T.renk);
      if (T.o && typeof T.o.degince === 'function') { try { T.o.degince(); } catch (e) { console.warn('isikAl degince', e); } }   // top Pırıl'a değdi (bir kez)
    }
    ac(T.n, T.o);
  }
  // göğüste tek halka dalga (kameraya dönük, büyüyüp söner; ~0,55 sn)
  let halka = null;
  function halkaBaslat(sc, p, renk) {
    if (halka) halkaBitir();
    const m = new THREE.Mesh(new THREE.RingGeometry(.82, 1, 48), new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
    m.position.copy(p); m.renderOrder = 4; m.name = 'Piril isik halkasi'; sc.add(m);
    halka = { m, t: 0 };
  }
  function halkaAdim(dt) {
    if (!halka) return;
    halka.t += dt; const u = Math.min(1, halka.t / .55);
    const cam = typeof camera !== 'undefined' && camera && camera.isCamera ? camera : null;
    if (cam) halka.m.quaternion.copy(cam.quaternion);
    halka.m.scale.setScalar(.25 + 1.0 * (1 - (1 - u) * (1 - u)));
    halka.m.material.opacity = .95 * (1 - u);
    if (u >= 1) halkaBitir();
  }
  function halkaBitir() { if (!halka) return; if (halka.m.parent) halka.m.parent.remove(halka.m); halka.m.geometry.dispose(); halka.m.material.dispose(); halka = null; }
  // ── Şakalar (kısa, sade; aynı anda tek) ──
  let sakaT = 6, sonSaka = '', fezaBas = null, konOlcek = 1, bossAbone = false;
  function saka(c, zorla) {
    sakaT = 3;
    const a = api(), P = c.P;
    if (!model || !bctx || !bctx.follow || (!zorla && model.isFetching()) || (!zorla && a && a.enemiesNear && canlilar(enemiesNear(P.pos.x, P.pos.z, 7)).length)) return;
    const L = ['kovala', 'hapsir', 'kon', 'salla'].filter(k => k !== sonSaka);
    const k = zorla || L[Math.random() * L.length | 0]; sonSaka = k; sakaT = 9 + Math.random() * 6;
    if (k === 'kovala') { model.kovala(2.4); sfx('pirilKikir', { vol: .7 }); }
    else if (k === 'hapsir') model.sneeze(m => { sfx('pirilCivil', { vol: .7 }); if (a && a.burst && m) a.burst('sparkle', m.x, m.y, m.z, { count: 3, color: '#fff2a8' }); });
    else if (k === 'kon') {
      // Feza'nın başının tepesi: 'head' kemiği + başın yarıçapı (bir kez bulunur)
      if (!fezaBas && c.H && c.H.root) c.H.root.traverse(o => { if (!fezaBas && /^head$/i.test(o.name)) fezaBas = o; });
      const tepe = fezaBas ? fezaBas.getWorldPosition(_v).y - (P.pos.y || 0) + AYAR.basTepe : 1.35;
      const hop = tepe - .95 * model.root.scale.x / konOlcek * AYAR.konBoy;   // konunca ölçek küçülür: ayak yüksekliği ona göre
      if (bctx.follow.konBas) { bctx.follow.konBas(4.5, hop); sfx('pirilMutlu', { vol: .7 }); }
    } else { model.salla(1.6); sfx('pirilCivil', { vol: .7 }); }
  }
  // Pırıl'a dokununca: kıkırdar ve Feza'nın çevresinde döner (kendi dinleyicimiz; Feza'nın yürüme dokunuşunu engellemez)
  let dokunT = 0, sonDokunSoz = -99;
  function dokunma(e) {
    if (!model || !oyunda() || rideOn) return;
    if (typeof camera === 'undefined' || !camera || typeof renderer === 'undefined' || !renderer || !_v) return;
    const el = renderer.domElement, r = el.getBoundingClientRect();
    model.body.getWorldPosition(_v).project(camera);
    if (_v.z > 1) return;
    const sx = r.left + (_v.x + 1) / 2 * r.width, sy = r.top + (1 - _v.y) / 2 * r.height;
    const R = Math.max(60, r.height * .08);
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > R) return;
    // Pırıl'a isabet: dokunuşu tüket (Feza oraya yürümesin); başka pencere dinleyicileri (ses kilidi vb.) yine çalışır
    e.stopPropagation(); if (e.cancelable) e.preventDefault();
    if (t - dokunT < 1.2) return;
    dokunT = t;
    model.kikir(1.3); sfx('pirilKikir');
    if (bctx && bctx.follow && bctx.follow.etrafinda) bctx.follow.etrafinda(2.2);
    if (t - sonDokunSoz > 25 && t - sonSoz > 5 && Math.random() < .5) { sonDokunSoz = t; sonSoz = t; say(Math.random() < .5 ? 'pp_komik' : 'pp_yasasin'); }
  }
  function sneeze(c) { if (model && model.sneeze) return model.sneeze(); return false; }

  return {
    // BILBO_FUN
    step, pose, onPlace, ride: rideSet, busy, heroLift, sneeze, buildItem: null, lost: null, mola,
    get riding() { return rideOn; },
    // HALA
    create, update, ac, onCheer, onFezaHurt, onFezaLow, onFezaDown, teamReady, teamMove, pointTo,
    get charge() { return charge; },
    // Pırıl
    get seviye() { return seviye; }, buyu, isikAl, buyukOlcek: () => AYAR.buyuk, oyunOlcek: () => AYAR.boy, saka: k => { const c = hctx || bctx; if (c) saka(c, k); return true; },   // test: saka('kovala'|'hapsir'|'kon'|'salla')
    isikGoster(n) { isikGoster = n == null ? null : Math.max(0, Math.min(5, +n || 0)); if (model) model.isik(kanatSeviye()); return true; },   // geçici kanat seviyesi (0..5, ondalık olabilir); null = kayıtlıya dön
    ucus: on => rideSet(!!on, 999, bctx), goster, kullan, model: () => model, AYAR,
  };
})();
const BILBO_FUN = PIRIL_GUC;   // motor uyumu (07_game funCall / rideBilbo)
