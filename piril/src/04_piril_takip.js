/* Pırıl'ın takibi: Feza'nın yanında havada uçar (BILBO_FOLLOW'un yerine, aynı API).
   PIRIL_TAKIP.create(env) → { pos:{x,z}, reset(heroPos, x, z, açı), step(dt, heroPos) → { pos, face, speed, hop, pounce, impact },
   pounce(e), isPouncing(), goster(x, z, sn) }.
   Uçtuğu için duvar/eşya engellemez (env.move kullanılmaz) ama Feza'dan hiç uzaklaşmaz; Feza'yı itmez, içinden geçmez.
   Hedef nokta: Feza'nın gidiş yönüne göre bir yanında, biraz geride, omuz hizasında (yükseklik modelin içinde: m.lift).
   Dururken yavaşça "8" çizer gibi süzülür; hızlı yürürken yanında kalır, dönüşlerde aynı tarafı korur. */
const PIRIL_TAKIP = (() => {
  'use strict';
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const blend = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const SIDE = 1.2, BACK = 0.35, FRONT = 0.55, PERSONAL = 0.9, MAXV = 9;
  function create(env = {}) {
    const pos = { x: 0, z: 0 };
    let vx = 0, vz = 0, face = 0, speed = 0, time = 0, side = 1, sideHold = 0;
    let hx = 0, hz = 0, hdx = 0, hdz = 1, last = null, hvx = 0, hvz = 0, leap = null, show = null, kon = null, tur = null, poz = null;
    function reset(hero, x, z, angle = 0) {
      pos.x = x; pos.z = z; face = angle; vx = vz = speed = 0; leap = null; show = null;
      hdx = Math.sin(angle); hdz = Math.cos(angle); last = hero ? { x: hero.x, z: hero.z } : null;
      // hangi yanda başladıysa o yan
      if (hero) { const cx = hdz, cz = -hdx; side = ((x - hero.x) * cx + (z - hero.z) * cz) >= 0 ? 1 : -1; }
    }
    function heroDir(hero, dt) {
      if (!last) last = { x: hero.x, z: hero.z };
      const dx = hero.x - last.x, dz = hero.z - last.z;
      if (dt > 0) { hvx = blend(hvx, dx / dt, 6, dt); hvz = blend(hvz, dz / dt, 6, dt); }
      last.x = hero.x; last.z = hero.z;
      const hs = Math.hypot(hvx, hvz);
      if (hs > .4) { hdx = blend(hdx, hvx / hs, 3, dt); hdz = blend(hdz, hvz / hs, 3, dt); const l = Math.hypot(hdx, hdz) || 1; hdx /= l; hdz /= l; }
      return hs;
    }
    function pounce(target) {
      if (poz || leap || show || !target || target.dead || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return false;
      const d = dist(pos, target);
      if (d < .5 || d > 6.5) return false;
      kon = null; tur = null;
      leap = { target, x: pos.x, z: pos.z, age: 0, duration: .85, hit: false };
      return true;
    }
    // Bir yeri göster (ör. saklanan boss, kapı): oraya uçup üstünde tur atar, sonra döner.
    // Feza'nın başına kon (hop: başın üstü için kök yüksekliği; çağıran hesaplar). Feza yürüyünce kendiliğinden kalkar.
    function konBas(sn = 4, hop = 0) { if (leap) return false; show = null; tur = null; kon = { age: 0, dur: sn, hop, ok: false }; return true; }
    // Poz (ışık geri geldi anı): Feza'nın yanında, kameraya bakan tarafta, yüzü kameraya dönük durur (yakın plan kadrajda)
    function pozVer(sn = 6) { leap = null; show = null; kon = null; tur = null; poz = { age: 0, dur: sn }; return true; }
    // Feza'nın çevresinde kıkırdayarak bir-iki tur dön
    function etrafinda(sn = 2.2) { if (leap) return false; kon = null; tur = { age: 0, dur: sn, a: Math.atan2(pos.x - (last ? last.x : 0), pos.z - (last ? last.z : 0)) }; return true; }
    function goster(x, z, sn = 3) { if (poz) return false; if (!Number.isFinite(x) || !Number.isFinite(z)) return false; leap = null; show = { x, z, age: 0, dur: Math.max(1, sn) }; return true; }
    function step(dt, hero) {
      dt = Math.min(.05, Math.max(0, dt)); time += dt;
      const hs = heroDir(hero, dt);
      // ışınlanma / bölge değişimi: hemen yanına
      if (dist(pos, hero) > 16) { reset(hero, hero.x + hdz * SIDE * side, hero.z - hdx * SIDE * side, Math.atan2(hdx, hdz)); return { pos, face, speed: 0, hop: 0 }; }
      // Dalış (huysuza ışık çarpması): kavisle iner, dokunur, geri döner
      if (leap) {
        const l = leap; l.age += dt;
        const u = Math.min(1, l.age / l.duration), tg = l.target;
        const tx = tg && !tg.dead ? tg.x : l.x, tz = tg && !tg.dead ? tg.z : l.z;
        const stop = Math.max(.55, (tg && tg.r || .4) + .35);
        const d0 = Math.hypot(tx - l.x, tz - l.z) || 1, ex = tx - (tx - l.x) / d0 * stop, ez = tz - (tz - l.z) / d0 * stop;
        // gidiş (0..0.55) → dönüş (0.55..1): yuvarlak bir yay
        const go = u < .55 ? u / .55 : 1 - (u - .55) / .45, k = go * go * (3 - 2 * go);
        const gx = hero.x + hdz * SIDE * side - hdx * BACK, gz = hero.z - hdx * SIDE * side - hdz * BACK;
        const bx = u < .55 ? l.x : gx, bz = u < .55 ? l.z : gz;
        const ox = pos.x, oz = pos.z;
        pos.x = bx + (ex - bx) * k; pos.z = bz + (ez - bz) * k;
        speed = dt ? Math.hypot(pos.x - ox, pos.z - oz) / dt : 0;
        face = Math.atan2(tx - pos.x, tz - pos.z);
        let impact = null;
        if (u >= .55 && !l.hit) { l.hit = true; if (tg && !tg.dead && Math.hypot(tg.x - pos.x, tg.z - pos.z) < (tg.r || .4) + 1.3) impact = tg; }
        if (u >= 1) { leap = null; vx = vz = 0; }
        return { pos, face, speed, hop: -.45 * Math.sin(Math.PI * Math.min(1, u / .55)) * (u < .55 ? 1 : 0), pounce: Math.sin(Math.PI * u), impact };
      }
      // Işık anı pozu
      if (poz) {
        const p = poz; p.age += dt;
        let cx = 0, cz = 1;
        const cam = env.camera || (typeof camera !== 'undefined' && camera && camera.isCamera ? camera : null);
        if (cam) { cx = cam.position.x - hero.x; cz = cam.position.z - hero.z; const l = Math.hypot(cx, cz) || 1; cx /= l; cz /= l; }
        const lx = cz, lz = -cx;
        const gx = hero.x + lx * .95 * side + cx * .55, gz = hero.z + lz * .95 * side + cz * .55;
        const ox = pos.x, oz = pos.z;
        pos.x = blend(pos.x, gx, 5, dt); pos.z = blend(pos.z, gz, 5, dt);
        speed = dt ? Math.hypot(pos.x - ox, pos.z - oz) / dt : 0;
        const tf = Math.atan2(cx, cz), df = Math.atan2(Math.sin(tf - face), Math.cos(tf - face));
        face += df * (1 - Math.exp(-7 * dt));
        if (p.age >= p.dur) poz = null;
        return { pos, face, speed: Math.min(speed, 1.5), hop: 0 };
      }
      // Başa konma: Feza'nın tam üstüne süzülür, iner, oturur
      if (kon) {
        const k = kon; k.age += dt;
        if (hs > .6 || k.age >= k.dur) { kon = null; }
        else {
          const ox = pos.x, oz = pos.z;
          pos.x = blend(pos.x, hero.x - hdx * .05, 6, dt); pos.z = blend(pos.z, hero.z - hdz * .05, 6, dt);
          speed = dt ? Math.hypot(pos.x - ox, pos.z - oz) / dt : 0;
          const near = Math.hypot(pos.x - hero.x, pos.z - hero.z) < .25;
          k.ok = near;
          const df = Math.atan2(Math.sin(Math.atan2(hdx, hdz) - face), Math.cos(Math.atan2(hdx, hdz) - face)); face += df * (1 - Math.exp(-6 * dt));
          return { pos, face, speed: near ? 0 : speed, hop: near ? k.hop : k.hop * .5 + .3, kon: near };
        }
      }
      // Feza'nın çevresinde tur (dokununca)
      if (tur) {
        const u = tur; u.age += dt;
        const a = u.a + u.age * 5.2, r = 1.25;
        const ox = pos.x, oz = pos.z;
        pos.x = blend(pos.x, hero.x + Math.sin(a) * r, 10, dt); pos.z = blend(pos.z, hero.z + Math.cos(a) * r, 10, dt);
        speed = dt ? Math.hypot(pos.x - ox, pos.z - oz) / dt : 0;
        if (speed > .3) face = Math.atan2(pos.x - ox, pos.z - oz);
        if (u.age >= u.dur) tur = null;
        return { pos, face, speed, hop: .1 * Math.sin(u.age * 8) };
      }
      // Gösterme: hedefe uç, üstünde küçük daireler çiz
      if (show) {
        const s = show; s.age += dt;
        const a = s.age * 3.2, tx = s.x + Math.sin(a) * .9, tz = s.z + Math.cos(a) * .9;
        const ox = pos.x, oz = pos.z;
        pos.x = blend(pos.x, tx, 3.5, dt); pos.z = blend(pos.z, tz, 3.5, dt);
        speed = dt ? Math.hypot(pos.x - ox, pos.z - oz) / dt : 0;
        if (speed > .3) face = Math.atan2(pos.x - ox, pos.z - oz);
        if (s.age >= s.dur || dist(hero, s) > 14) show = null;
        return { pos, face, speed, hop: .25 + .1 * Math.sin(s.age * 5) };
      }
      // Hedef: kameraya bakan tarafta (Feza'nın biraz önünde, kameraya yakın) ve yanında → her an görünür, Feza'yı örtmez.
      // Yan: Feza yatay yürürken onun gerisindeki yanda kalır (yolunu kesmez); en az 2 s'de bir değişir.
      let cx = 0, cz = 1;
      const cam = env.camera || (typeof camera !== 'undefined' && camera && camera.isCamera ? camera : null);
      if (cam) { cx = cam.position.x - hero.x; cz = cam.position.z - hero.z; const l = Math.hypot(cx, cz) || 1; cx /= l; cz /= l; }
      const lx = cz, lz = -cx;                       // ekranda yatay yön
      sideHold -= dt;
      const lat = hvx * lx + hvz * lz;
      if (Math.abs(lat) > .8 && sideHold <= 0) { const want = lat > 0 ? -1 : 1; if (want !== side) { side = want; sideHold = 2; } }
      const idle = Math.max(0, 1 - hs / 1.2);
      const w1 = Math.sin(time * .7) * .35 * idle, w2 = Math.sin(time * 1.4) * .22 * idle;
      const rx = lx, rz = lz;
      let gx = hero.x + lx * (SIDE + w2) * side + cx * (FRONT + w1);
      let gz = hero.z + lz * (SIDE + w2) * side + cz * (FRONT + w1);
      // Yaylı uçuş (hafif gecikme, aşmadan yerleşir)
      const ax = (gx - pos.x) * 18 - vx * 7.5, az = (gz - pos.z) * 18 - vz * 7.5;
      vx += ax * dt; vz += az * dt;
      const v = Math.hypot(vx, vz); if (v > MAXV) { vx *= MAXV / v; vz *= MAXV / v; }
      const ox = pos.x, oz = pos.z;
      pos.x += vx * dt; pos.z += vz * dt;
      // Feza'nın içine girme (yalnız Pırıl kayar)
      const sx = pos.x - hero.x, sz = pos.z - hero.z, sd = Math.hypot(sx, sz);
      if (sd < PERSONAL) { const n = sd > .001 ? sd : 1, ux = sd > .001 ? sx / n : rx * side, uz = sd > .001 ? sz / n : rz * side; pos.x = hero.x + ux * PERSONAL; pos.z = hero.z + uz * PERSONAL; }
      const actual = dt > 0 ? Math.hypot(pos.x - ox, pos.z - oz) / dt : 0;
      speed = blend(speed, Math.min(8, actual), 8, dt);
      // Yüz: hızlıyken uçuş yönüne, yavaşken Feza'nın baktığı yöne (yanında beraber yürüyormuş gibi), dururken hafifçe Feza'ya
      let tf;
      if (actual > 1.2) tf = Math.atan2(pos.x - ox, pos.z - oz);
      else { const fx = hdx + (hero.x - pos.x) * .5 * idle, fz = hdz + (hero.z - pos.z) * .5 * idle; tf = Math.atan2(fx, fz); }
      const dlt = Math.atan2(Math.sin(tf - face), Math.cos(tf - face));
      face += dlt * (1 - Math.exp(-5 * dt));
      return { pos, face, speed, hop: 0 };
    }
    return { pos, reset, step, pounce, goster, konBas, etrafinda, pozVer, pozda: () => !!poz, isPouncing: () => !!leap, gosteriyor: () => !!show, konuyor: () => !!kon, konmus: () => !!(kon && kon.ok), donuyor: () => !!tur };
  }
  return { create };
})();
const BILBO_FOLLOW = PIRIL_TAKIP;   // motor uyumu (07_game BILBO_FOLLOW.create)
const BILBO = PIRIL;                // motor uyumu (07_game BILBO.create / portrait / ACCESSORIES). 04_piril.js'te DEĞİL: ev ekranı hala/04_bilbo.js ile birlikte onu yükler.
