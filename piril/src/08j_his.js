/* ── HIS: oyun hissi ve ödül ritmi (Dev Ev Macerası) ──
   Genel ad: HIS. 07_game'in 'hit' / 'happy' / 'gold' / 'levelup' / 'skill' / 'ingredient' olaylarını dinler; GAME.update'i sarar (her kare tick).
   - Vuruş: tatlı, seri boyunca yükselen zil sesi + huysuz "boing" (yay gibi esneme) + minik konfeti + hafif sarsıntı; kombo sayacı
     ("3!", "5!" …) ve dönüm noktalarında kısa duraklama (GAME.hitStop) + ara sıra, çeşitli Aytuğ Hala övgüsü.
   - Neşelenme: kalp + konfeti patlaması; yerdeki şekerler kısa süre sonra Feza'ya mıknatısla uçar; HUD'daki şeker sayacına uçan
     şekerler (çın çın) ve sayaç zıplar.
   - Seviye atlama: büyük kutlama + 1 yıldız şeker; yeni yetenek açılınca resimli tanıtım kartı (Hala söyler: SKILLS def.line).
   - Yıldız şeker (P.yetenek.yildiz) yetenekleri güçlendirir: SKILLS.tier(id) 1..3, SKILLS.upgradeCost(tier). Yıldız düğmesi →
     büyük "Yetenekler" paneli. Mini oyunlar HIS.addStarCandy(n) çağırır.
   - HUD ekleri: konuşurken ağzı oynayan Aytuğ Hala yüzü, yıldız şeker düğmesi, 4 malzeme yuvası, kombo sayacı, yetenek kademe yıldızları.
   QA: HIS._S (durum), HIS.openUpgrades(), HIS.addStarCandy(n). */
const HIS = (() => {
  'use strict';
  const S = { t: 0, built: false, combo: 0, best: 0, lastHit: -9, lastTone: -9, lastBoing: -9, lastConf: -9, lastShake: -9,
    lastPraise: -99, lastCheerLine: -99, praiseKey: '', comboShownT: 0, comboN: 0, talkT: 0, mouth: 0, blinkT: 2.5, blink: 0,
    lvlQ: [], card: null, cardT: 0, upOpen: false, prevPaused: false, magT: 0, flyGap: 0, starHintT: 0, lastStars: -1, lastAfford: null,
    wasTalking: false, lastMalz: '', lastStarHint: -99, cardGap: 0, lastMouth: -1, lastBlink: null };
  const D = {};
  const g = () => (typeof GAME !== 'undefined' && GAME ? GAME : null);
  const fxOk = n => typeof FX !== 'undefined' && FX && typeof FX[n] === 'function';
  function sfx(n, o) { try { if (typeof AUD !== 'undefined' && AUD.sfx) AUD.sfx(n, o); } catch (e) { /* sessiz */ } }
  function burst(k, x, y, z, o) { if (fxOk('burst')) FX.burst(k, x, y, z, o); }
  const speaking = () => typeof AUD !== 'undefined' && AUD && (AUD.current || (AUD.speaking && AUD.speaking()));
  function say(key, prio = 1) {
    if (typeof AUD === 'undefined' || !AUD.say || !AUD.LINES || !AUD.LINES[key]) return 0;
    try { return AUD.say(key, { prio }) || 0; } catch (e) { return 0; }
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  // SVG kimliklerini her eklemede benzersiz yap (gizli bir kopyadaki degrade diğerlerini boş bırakmasın)
  let uid = 0;
  function U(svg) {
    if (!svg) return svg;
    const n = '_h' + (++uid);
    return svg.replace(/id="([^"]+)"/g, (m, a) => `id="${a}${n}"`).replace(/url\(#([^)]+)\)/g, (m, a) => `url(#${a}${n})`);
  }
  function restart(e, cls) { if (!e) return; e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); }

  // ── Yıldız şeker ve kademe durumu (P.yetenek: {kademe:{id:1..3}, yildiz}) ──
  function Y() {
    const G = g(); if (!G || !G.P) return { kademe: {}, yildiz: 0 };
    const P = G.P;
    if (!P.yetenek || typeof P.yetenek !== 'object') P.yetenek = {};
    if (!P.yetenek.kademe || typeof P.yetenek.kademe !== 'object') P.yetenek.kademe = {};
    if (!(P.yetenek.yildiz >= 0)) P.yetenek.yildiz = 0;
    return P.yetenek;
  }
  const stars = () => Y().yildiz | 0;
  function addStarCandy(n = 1, from) {
    n = Math.max(0, Math.round(n)); if (!n) return stars();
    const y = Y(); y.yildiz = (y.yildiz | 0) + n;
    const G = g(); if (G && G.emit) G.emit('starCandy', { count: y.yildiz, add: n });
    if (S.built) for (let i = 0; i < Math.min(n, 6); i++) flyTo('star', from, i * 0.12);
    return y.yildiz;
  }
  function skillList() { const G = g(); return (G && G.skills) || []; }
  const tierOf = id => (typeof SKILLS !== 'undefined' && SKILLS.tier ? SKILLS.tier(id) : 1);
  const costOf = t => (typeof SKILLS !== 'undefined' && SKILLS.upgradeCost ? SKILLS.upgradeCost(t) : 99);
  function canAfford() {
    const list = skillList(), have = stars();
    for (const s of list) if (s.unlocked && tierOf(s.def.id) < 3 && have >= costOf(tierOf(s.def.id))) return true;
    return false;
  }
  function upgrade(i) {
    const s = skillList()[i]; if (!s || !s.unlocked) return false;
    const id = s.def.id, t = tierOf(id), c = costOf(t);
    if (t >= 3 || stars() < c) { sfx('nope', { vol: 0.6 }); return false; }
    const y = Y(); y.yildiz -= c; y.kademe[id] = t + 1;
    sfx('unlock'); setTimeout(() => sfx('levelup', { vol: 0.8 }), 160);
    const G = g(); if (G && G.emit) G.emit('skillTier', { id, tier: t + 1 });
    if (s.def.tierLine) { if (typeof AUD !== 'undefined' && AUD.say && AUD.LINES[s.def.tierLine]) try { AUD.say(s.def.tierLine, { prio: 3, interrupt: true }); } catch (e) { /* yok */ } }
    if (G && G.P && G.P.pos) { burst('levelup', G.P.pos.x, 0.1, G.P.pos.z, {}); burst('confetti', G.P.pos.x, 1.6, G.P.pos.z, { count: 30 }); }
    return true;
  }

  // ── Görseller (SVG) ──
  const ART = {
    hala: `<svg class="his-hala-svg" viewBox="0 0 100 100" aria-hidden="true">
      <defs><radialGradient id="hisHbg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#fff3df"/><stop offset="1" stop-color="#ffc9a3"/></radialGradient>
      <radialGradient id="hisHskin" cx="45%" cy="38%" r="65%"><stop offset="0" stop-color="#ffe2c8"/><stop offset="1" stop-color="#f0b48c"/></radialGradient>
      <linearGradient id="hisHhair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3622"/><stop offset="1" stop-color="#2e1a10"/></linearGradient>
      <linearGradient id="hisHfleece" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a68"/><stop offset="1" stop-color="#e2463c"/></linearGradient></defs>
      <circle cx="50" cy="50" r="50" fill="url(#hisHbg)"/>
      <path d="M14 104 Q16 80 34 76 L50 84 L66 76 Q84 80 86 104Z" fill="url(#hisHfleece)"/>
      <path d="M34 76 Q42 86 50 84 Q58 86 66 76 L62 74 Q50 82 38 74Z" fill="#ff9a86"/>
      <path d="M50 84 L50 104" stroke="#b8322b" stroke-width="2"/><circle cx="50" cy="88" r="2" fill="#ffd9a0"/>
      <g fill="#c94a3e" opacity=".35"><circle cx="24" cy="92" r="1.6"/><circle cx="30" cy="97" r="1.6"/><circle cx="72" cy="93" r="1.6"/><circle cx="77" cy="98" r="1.6"/><circle cx="64" cy="98" r="1.4"/><circle cx="37" cy="99" r="1.4"/></g>
      <rect x="44" y="64" width="12" height="14" rx="5" fill="#eaa985"/>
      <circle cx="50" cy="13" r="12.5" fill="url(#hisHhair)"/><path d="M42 9 Q50 3 58 9" stroke="#7a4c30" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="45" rx="23" ry="25" fill="url(#hisHskin)"/>
      <path d="M26 48 Q22 22 50 20 Q78 22 74 48 Q72 36 64 31 Q56 36 44 31 Q34 33 28 44Z" fill="url(#hisHhair)"/>
      <path d="M27 46 Q23 56 28 64" stroke="#3a2214" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M73 46 Q78 57 72 66" stroke="#3a2214" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <path d="M44 31 Q40 38 33 40" stroke="#6b4129" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>
      <ellipse cx="25" cy="49" rx="3.4" ry="5" fill="#eaa985"/><ellipse cx="75" cy="49" rx="3.4" ry="5" fill="#eaa985"/>
      <path d="M35.5 39.5 Q40 37 44.5 39.2" stroke="#4a2c1c" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M55.5 39.2 Q60 37 64.5 39.5" stroke="#4a2c1c" stroke-width="2" fill="none" stroke-linecap="round"/>
      <g class="his-eyes"><ellipse cx="40" cy="46" rx="3.6" ry="4.4" fill="#3a2418"/><ellipse cx="60" cy="46" rx="3.6" ry="4.4" fill="#3a2418"/>
      <circle cx="41.3" cy="44.4" r="1.4" fill="#fff"/><circle cx="61.3" cy="44.4" r="1.4" fill="#fff"/></g>
      <g class="his-lids" opacity="0"><path d="M36 46.5 Q40 49 44 46.5" stroke="#3a2418" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M56 46.5 Q60 49 64 46.5" stroke="#3a2418" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
      <ellipse cx="33" cy="55" rx="5" ry="3.2" fill="#ff8f8f" opacity=".45"/><ellipse cx="67" cy="55" rx="5" ry="3.2" fill="#ff8f8f" opacity=".45"/>
      <path d="M49 50 Q50 53.5 52 52.5" stroke="#d68c6a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path class="his-m0" d="M42 58 Q50 65 58 58" stroke="#a8473f" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <g class="his-m1" opacity="0"><path d="M42.5 57.5 Q50 57 57.5 57.5 Q57 66.5 50 67 Q43 66.5 42.5 57.5Z" fill="#8a2c2c"/><ellipse cx="50" cy="64" rx="4.4" ry="2.4" fill="#ff8a8a"/><path d="M43.5 57.8 Q50 59.5 56.5 57.8" stroke="#fff" stroke-width="1.6" fill="none"/></g>
      <g class="his-m2" opacity="0"><path d="M44 58 Q50 57.4 56 58 Q55.5 63 50 63.4 Q44.5 63 44 58Z" fill="#8a2c2c"/><ellipse cx="50" cy="61.6" rx="3.2" ry="1.5" fill="#ff8a8a"/></g>
    </svg>`,
    // Yıldız şeker: parlak, ambalajlı, yıldız biçimli şeker
    star: `<svg class="his-star-svg" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="hisSt" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff7b8"/><stop offset=".55" stop-color="#ffd23f"/><stop offset="1" stop-color="#f29a12"/></radialGradient></defs>
      <path d="M10 50 L-2 36 L2 50 L-2 64Z" transform="translate(6 0)" fill="#ff7ab8"/><path d="M90 50 L102 36 L98 50 L102 64Z" transform="translate(-6 0)" fill="#ff7ab8"/>
      <path d="M50 8 L61 36 L91 38 L68 57 L76 87 L50 70 L24 87 L32 57 L9 38 L39 36Z" fill="url(#hisSt)" stroke="#c96f00" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M50 18 L57 37 L44 40Z" fill="#fff" opacity=".55"/><circle cx="43" cy="52" r="3.2" fill="#6b3a00"/><circle cx="57" cy="52" r="3.2" fill="#6b3a00"/><path d="M44 60 Q50 66 56 60" stroke="#6b3a00" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
    candy: `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="hisCd" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#ffd6ec"/><stop offset=".6" stop-color="#ff5fa8"/><stop offset="1" stop-color="#d42d7c"/></radialGradient></defs>
      <path d="M26 50 L4 30 Q0 50 4 70Z" fill="#7fd8ff" stroke="#2f8fc7" stroke-width="3" stroke-linejoin="round"/><path d="M74 50 L96 30 Q100 50 96 70Z" fill="#7fd8ff" stroke="#2f8fc7" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="50" cy="50" r="27" fill="url(#hisCd)" stroke="#b0256a" stroke-width="3.5"/><path d="M33 40 Q50 30 67 42" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/><path d="M30 56 Q50 46 70 58" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/><ellipse cx="40" cy="36" rx="7" ry="4" fill="#fff" opacity=".7"/></svg>`,
  };
  // Pırıl'ın 5 ejderha ışığı (bölüm sırasıyla; P.malzemeler[isikN])
  const MALZ = [
    { id: 'isik1', svg: `<svg viewBox="0 0 100 100"><defs><radialGradient id="hisIs1" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#ff9ad5"/><stop offset="1" stop-color="#d94f9a"/></radialGradient></defs><circle cx="50" cy="52" r="30" fill="url(#hisIs1)" stroke="#fff" stroke-width="4"/><path d="M50 6 L54 22 L50 18 L46 22Z M50 98 L54 82 L50 86 L46 82Z M6 52 L22 48 L18 52 L22 56Z M94 52 L78 48 L82 52 L78 56Z" fill="#ff9ad5"/><circle cx="40" cy="42" r="7" fill="#fff" opacity=".7"/></svg>` },
    { id: 'isik2', svg: `<svg viewBox="0 0 100 100"><defs><radialGradient id="hisIs2" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#7fe0ff"/><stop offset="1" stop-color="#2f9fd0"/></radialGradient></defs><circle cx="50" cy="52" r="30" fill="url(#hisIs2)" stroke="#fff" stroke-width="4"/><path d="M50 6 L54 22 L50 18 L46 22Z M50 98 L54 82 L50 86 L46 82Z M6 52 L22 48 L18 52 L22 56Z M94 52 L78 48 L82 52 L78 56Z" fill="#7fe0ff"/><circle cx="40" cy="42" r="7" fill="#fff" opacity=".7"/></svg>` },
    { id: 'isik3', svg: `<svg viewBox="0 0 100 100"><defs><radialGradient id="hisIs3" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#ffe36a"/><stop offset="1" stop-color="#e0a81c"/></radialGradient></defs><circle cx="50" cy="52" r="30" fill="url(#hisIs3)" stroke="#fff" stroke-width="4"/><path d="M50 6 L54 22 L50 18 L46 22Z M50 98 L54 82 L50 86 L46 82Z M6 52 L22 48 L18 52 L22 56Z M94 52 L78 48 L82 52 L78 56Z" fill="#ffe36a"/><circle cx="40" cy="42" r="7" fill="#fff" opacity=".7"/></svg>` },
    { id: 'isik4', svg: `<svg viewBox="0 0 100 100"><defs><radialGradient id="hisIs4" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#9dff8a"/><stop offset="1" stop-color="#3fb04a"/></radialGradient></defs><circle cx="50" cy="52" r="30" fill="url(#hisIs4)" stroke="#fff" stroke-width="4"/><path d="M50 6 L54 22 L50 18 L46 22Z M50 98 L54 82 L50 86 L46 82Z M6 52 L22 48 L18 52 L22 56Z M94 52 L78 48 L82 52 L78 56Z" fill="#9dff8a"/><circle cx="40" cy="42" r="7" fill="#fff" opacity=".7"/></svg>` },
    { id: 'isik5', svg: `<svg viewBox="0 0 100 100"><defs><radialGradient id="hisIs5" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#c49bff"/><stop offset="1" stop-color="#7a4fe0"/></radialGradient></defs><circle cx="50" cy="52" r="30" fill="url(#hisIs5)" stroke="#fff" stroke-width="4"/><path d="M50 6 L54 22 L50 18 L46 22Z M50 98 L54 82 L50 86 L46 82Z M6 52 L22 48 L18 52 L22 56Z M94 52 L78 48 L82 52 L78 56Z" fill="#c49bff"/><circle cx="40" cy="42" r="7" fill="#fff" opacity=".7"/></svg>` },
  ];

  // ── HUD kurulumu (UI kurulduktan sonra, ilk tick'te) ──
  function build() {
    const hud = document.getElementById('uiHud');
    if (!hud || S.built) return;
    S.built = true;
    const portraits = hud.querySelector('.u-portraits');
    // Aytuğ Hala yüzü (Feza portresinin altında) + yıldız şeker düğmesi
    const col = D.col = el('div', 'his-col', portraits || hud);
    D.hala = el('div', 'his-hala', col, U(ART.hala) + '<span class="his-talk"><i></i><i></i><i></i></span>');
    D.hala.setAttribute('role', 'img'); D.hala.setAttribute('aria-label', 'Anlatıcı');
    D.hala.style.display = 'none';   // (Pırıl: anlatıcı yüzü yok; konuşan Pırıl'ın portresi sol üstte, .u-bilbo-face.talk)
    D.m = [D.hala.querySelector('.his-m0'), D.hala.querySelector('.his-m1'), D.hala.querySelector('.his-m2')];
    D.eyes = D.hala.querySelector('.his-eyes'); D.lids = D.hala.querySelector('.his-lids');
    D.starBtn = el('button', 'his-starbtn', col, U(ART.star) + '<span class="his-starn">0</span><span class="his-plus">+</span>');
    D.starBtn.setAttribute('aria-label', 'Yıldız şekerler: yetenekleri güçlendir');
    D.starN = D.starBtn.querySelector('.his-starn');
    D.starBtn.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); openUpgrades(); });
    // Malzeme yuvaları (şeker sayacının altında)
    const stats = hud.querySelector('.u-stats');
    D.malz = el('div', 'his-malz', stats || hud);
    const gold = stats && stats.querySelector('.u-gold');
    if (gold && gold.nextSibling) stats.insertBefore(D.malz, gold.nextSibling);
    D.malzEls = MALZ.map(m => { const e = el('div', 'his-m', D.malz, U(m.svg) + '<span class="his-mshine"></span>'); e.dataset.id = m.id; return e; });
    D.gold = hud.querySelector('.u-gold');
    // Kombo sayacı
    D.combo = el('div', 'his-combo', hud, '<span class="his-cstar"></span><span class="his-cn u-ol"><b>0</b><i>0</i></span>');
    D.comboB = D.combo.querySelector('b'); D.comboI = D.combo.querySelector('i');
    // Seviye kutlaması + yetenek tanıtımı
    D.lvl = el('div', 'his-lvl', hud, '<div class="his-rays"></div><div class="his-lstar">' + U(ART.star) + '<span class="his-ln u-ol"><b>2</b><i>2</i></span></div>');
    D.lvlN = D.lvl.querySelectorAll('.his-ln b, .his-ln i');
    D.card = el('div', 'his-card', hud, '<div class="his-rays"></div><div class="his-cico"></div><div class="his-cstars"></div>');
    D.cardIco = D.card.querySelector('.his-cico'); D.cardStars = D.card.querySelector('.his-cstars');
    // Ekran konfeti yağmuru (seviye, boss neşelenince)
    D.rain = el('div', 'his-rain', hud);
    const RC = ['#ff5c9a', '#ffd23f', '#4fd0ff', '#78f060', '#b58cff', '#ff9a3c'];
    for (let i = 0; i < 40; i++) { const p = el('i', i % 5 === 0 ? 'c' : '', D.rain); p.style.cssText = `left:${(i * 37 % 100) + Math.random() * 2}%;background:${RC[i % 6]};animation-delay:${(Math.random() * 0.8).toFixed(2)}s;--r:${(Math.random() * 720 - 360).toFixed(0)}deg;--x:${(Math.random() * 120 - 60).toFixed(0)}px;animation-duration:${(1.8 + Math.random() * 1.2).toFixed(2)}s`; }
    // Uçan şekerler (havuz)
    D.fly = []; const flyRoot = el('div', 'his-flyroot', hud);
    for (let i = 0; i < 16; i++) { const f = el('div', 'his-fly', flyRoot, ''); D.fly.push({ el: f, on: false, t: 0, dur: 0.6, x0: 0, y0: 0, x1: 0, y1: 0, kind: '', delay: 0 }); }
    // Yetenek paneli
    buildUpgrades(document.getElementById('ui') || document.body);
  }
  function buildUpgrades(root) {
    const p = D.up = el('div', 'his-up', root);
    const box = el('div', 'his-upbox', p);
    el('div', 'his-uphead', box, U(ART.star) + '<span class="his-upn">0</span>');
    D.upN = box.querySelector('.his-upn');
    D.upClose = el('button', 'his-upclose', box, '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="4.2" stroke-linecap="round"/></svg>');
    D.upClose.setAttribute('aria-label', 'Kapat');
    D.upClose.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); closeUpgrades(); });
    D.upRow = el('div', 'his-uprow', box);
    p.addEventListener('pointerdown', ev => { if (ev.target === p) closeUpgrades(); ev.stopPropagation(); });
    addEventListener('keydown', ev => {   // klavye yedeği: Y paneli açar/kapatır, Esc kapatır; panel açıkken oyun tuşları susar
      if (S.upOpen) { if (ev.key === 'Escape' || ev.key === 'y' || ev.key === 'Y') closeUpgrades(); ev.stopPropagation(); ev.preventDefault(); return; }
      if ((ev.key === 'y' || ev.key === 'Y') && !ev.repeat && D.starBtn && !D.starBtn.classList.contains('his-hide') && g() && g().state === 'play') openUpgrades();
    }, true);
  }
  function renderUpgrades() {
    const list = skillList(), have = stars();
    D.upN.textContent = have;
    D.upRow.innerHTML = '';
    let any = false;
    list.forEach((s, i) => {
      const def = s.def, t = tierOf(def.id), c = costOf(t), lock = !s.unlocked;
      const card = el('div', 'his-upcard' + (lock ? ' lock' : '') + (t >= 3 ? ' max' : ''), D.upRow);
      card.style.setProperty('--c', def.color || '#ffd23f');
      el('div', 'his-upico', card, lock ? '<span class="his-lock">🔒</span>' : (U(def.svg) || '<span class="his-emo">' + (def.icon || '✨') + '</span>'));
      let pips = ''; for (let k = 1; k <= 3; k++) pips += `<i class="${k <= t && !lock ? 'on' : ''}">★</i>`;
      el('div', 'his-uppips', card, pips);
      if (!lock && t < 3) {
        any = true;
        const ok = have >= c;
        let cost = ''; for (let k = 0; k < c; k++) cost += `<i class="${k < have ? 'on' : ''}"></i>`;
        const b = el('button', 'his-upbtn' + (ok ? ' ok' : ''), card, '<span class="his-upplus">+</span><span class="his-upcost">' + cost + '</span>');
        b.setAttribute('aria-label', (def.ad || '') + ' güçlendir');
        b.addEventListener('pointerdown', ev => {
          ev.stopPropagation(); ev.preventDefault();
          if (upgrade(i)) { renderUpgrades(); const nc = D.upRow.children[i]; if (nc) restart(nc, 'boom'); }
          else { restart(b, 'no'); }
        });
      } else if (!lock) el('div', 'his-upmax', card, '<span>★</span>');
    });
    return any;
  }
  function openUpgrades() {
    const G = g(); if (!G || S.upOpen) return;
    if (!D.up) return;
    S.upOpen = true; S.prevPaused = !!G.paused; G.paused = true;
    renderUpgrades();
    D.up.classList.add('on');
    sfx('open', { vol: 0.7 });
    if (canAfford()) { if (typeof AUD !== 'undefined' && AUD.LINES.his_panel) say('his_panel', 2); }
  }
  function closeUpgrades() {
    const G = g(); if (!S.upOpen) return;
    S.upOpen = false; D.up.classList.remove('on');
    if (G) G.paused = S.prevPaused;
    sfx('close', { vol: 0.6 });
  }

  // ── Dünya → ekran ──
  const _v = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
  function toScreen(x, y, z, out) {
    if (!_v || typeof camera === 'undefined') { out.x = innerWidth / 2; out.y = innerHeight / 2; return out; }
    _v.set(x, y, z).project(camera);
    out.x = (_v.x + 1) / 2 * innerWidth; out.y = (1 - _v.y) / 2 * innerHeight; return out;
  }
  const _p = { x: 0, y: 0 };
  function flyTo(kind, from, delay = 0) {
    if (!S.built) return;
    const f = D.fly.find(q => !q.on); if (!f) return;
    const G = g();
    let x0, y0;
    if (from && from.sx !== undefined) { x0 = from.sx; y0 = from.sy; }
    else if (G && G.P && G.P.pos) { toScreen(G.P.pos.x, 1.4, G.P.pos.z, _p); x0 = _p.x; y0 = _p.y; }
    else { x0 = innerWidth / 2; y0 = innerHeight / 2; }
    const tgt = kind === 'star' ? D.starBtn : (D.gold && D.gold.querySelector('.u-coin')) || D.gold;
    if (!tgt) return;
    const r = tgt.getBoundingClientRect();
    f.on = true; f.t = -delay; f.dur = kind === 'star' ? 0.85 : 0.55; f.kind = kind;
    f.x0 = x0 + rnd(-24, 24); f.y0 = y0 + rnd(-16, 8); f.x1 = r.left + r.width / 2; f.y1 = r.top + r.height / 2;
    f.cx = (f.x0 + f.x1) / 2 + rnd(-80, 80); f.cy = Math.min(f.y0, f.y1) - rnd(60, 160);
    f.el.innerHTML = U(kind === 'star' ? ART.star : ART.candy);
    f.el.className = 'his-fly ' + kind; f.el.style.opacity = '0';
  }
  function flyTick(dt) {
    for (const f of D.fly) {
      if (!f.on) continue;
      f.t += dt;
      if (f.t < 0) continue;
      const k = clamp01(f.t / f.dur), e = k * k * (3 - 2 * k), u = 1 - e;
      const x = u * u * f.x0 + 2 * u * e * f.cx + e * e * f.x1, y = u * u * f.y0 + 2 * u * e * f.cy + e * e * f.y1;
      const s = (f.kind === 'star' ? 1.25 : 1) * (0.7 + 0.6 * Math.sin(k * Math.PI)) * (1 - 0.35 * k);
      f.el.style.opacity = '1';
      f.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${s.toFixed(3)}) rotate(${(k * 540).toFixed(0)}deg)`;
      if (k >= 1) {
        f.on = false; f.el.style.opacity = '0';
        if (f.kind === 'star') { restart(D.starBtn, 'bump'); sfx('star', { vol: 0.5, pitch: 1.3 }); updateStarBtn(true); }
        else { restart(D.gold, 'his-bump'); sfx('coin', { vol: 0.35, pitch: 1.5 }); }
      }
    }
  }

  // ── Vuruş hissi ──
  // Zil sesi seri boyunca pentatonik dizide yükselir (do re mi sol la …), 12'den sonra tepede kalır.
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19].map(s => Math.pow(2, s / 12));
  const MILESTONE = { 5: 1, 10: 2, 15: 2, 20: 3, 25: 3, 30: 3, 40: 3, 50: 3, 75: 3, 100: 3 };
  const FEZA_KIND = { sword: 1, cream: 1, spin: 1, meteor: 1, magic: 1, star: 1, arcane: 1, ice: 1, crescent: 1 };
  const SQ = [];   // yay gibi esneyen huysuzlar
  function squash(e, big) {
    if (!e || !e.m || !e.m.root) return;
    let q = SQ.find(o => o.e === e);
    const r = e.m.root.scale;
    if (!q) {
      if (SQ.length >= 24) return;
      q = { e, bx: r.x, by: r.y, bz: r.z, lx: r.x, ly: r.y, t: 0, a: 0 };
      SQ.push(q);
    } else if (Math.abs(r.x - q.lx) > 1e-4 || Math.abs(r.y - q.ly) > 1e-4) { q.bx = r.x; q.by = r.y; q.bz = r.z; }   // başka biri ölçeği değiştirdi
    q.t = 0; q.a = (e.boss ? 0.06 : big ? 0.3 : 0.22);
  }
  function squashTick(dt) {
    for (let i = SQ.length - 1; i >= 0; i--) {
      const q = SQ[i], e = q.e, m = e.m, r = m && m.root && m.root.scale;
      if (!r) { SQ.splice(i, 1); continue; }
      if (Math.abs(r.x - q.lx) > 1e-4 || Math.abs(r.y - q.ly) > 1e-4) {   // başkası yönetiyor: bırak
        if (q.py !== undefined && Math.abs(m.root.position.y - q.py) < 1e-5) m.root.position.y -= q.off;
        SQ.splice(i, 1); continue;
      }
      q.t += dt;
      // küçük "boing" zıplaması: 07_game konumu her kare yeniden yazıyorsa ondan, yazmıyorsa kendi önceki ofsetimizden hesaplanır
      const pos = m.root.position, base = q.py !== undefined && Math.abs(pos.y - q.py) < 1e-5 ? pos.y - q.off : pos.y;
      if (q.t > 0.55 || e.dead) { r.set(q.bx, q.by, q.bz); pos.y = base; SQ.splice(i, 1); continue; }
      const w = Math.exp(-7 * q.t) * Math.cos(q.t * 30), sy = 1 - q.a * w, sx = 1 + q.a * 0.6 * w;
      r.set(q.bx * sx, q.by * sy, q.bz * sx);
      q.off = e.boss ? 0 : q.t < 0.32 ? Math.sin(q.t / 0.32 * Math.PI) * q.a * 1.3 : 0;
      pos.y = base + q.off; q.py = pos.y;
      q.lx = r.x; q.ly = r.y;
    }
  }
  function onHit(h) {
    const G = g(); if (!G || !h) return;
    const t = S.t;
    if (!FEZA_KIND[h.kind]) {   // Aytuğ Hala'nın pasta topu, Bilbo, takım hamlesi: esneme + konfeti, ama kombo Feza'nın
      squash(h.e, h.kind === 'team');
      if (t - S.lastConf > 0.08) { S.lastConf = t; burst('confetti', h.x, h.y + 0.2, h.z, { count: 5 }); }
      return;
    }
    S.combo = t - S.lastHit < 1.5 ? S.combo + 1 : 1; S.lastHit = t;
    const c = S.combo;
    if (t - S.lastTone > 0.06) {
      S.lastTone = t;
      sfx('bell', { vol: 0.18 + Math.min(0.12, c * 0.01), pitch: SCALE[Math.min(c - 1, SCALE.length - 1)] });
    }
    if (t - S.lastBoing > 0.13) { S.lastBoing = t; sfx('bounce', { vol: h.boss ? 0.3 : 0.42, pitch: h.boss ? 0.8 : rnd(1.05, 1.4), x: h.x, z: h.z }); }
    squash(h.e, h.crit);
    if (t - S.lastConf > 0.05) {
      S.lastConf = t;
      burst('confetti', h.x, h.y + 0.2, h.z, { count: h.crit ? 12 : 6 });
      burst('star', h.x, h.y + 0.4, h.z, { count: 1 });
    }
    if (t - S.lastShake > 0.1 && fxOk('shake')) { S.lastShake = t; FX.shake(0.035 + Math.min(10, c) * 0.004); }
    const cele = typeof UI !== 'undefined' && UI._S && UI._S.t < (UI._S.celeUntil || 0);   // boss kutlamasında kombo susar
    if (c >= 5 && c % 5 === 0 && !cele) showCombo(c);   // yalnız 5'in katlarında, kısa
    const ms = cele ? 0 : MILESTONE[c];
    if (ms) {
      if (G.hitStop) G.hitStop(0.05 + ms * 0.012);
      sfx(ms >= 2 ? 'levelup' : 'unlock', { vol: 0.55, pitch: 1 + ms * 0.05 });
      if (G.P && G.P.pos) burst('confetti', G.P.pos.x, 2, G.P.pos.z, { count: 14 + ms * 8 });
      restart(D.combo, 'big');
      if (c >= 10 || Math.random() < 0.5) praise('kombo');
    }
    if (h.crit && G.hitStop) G.hitStop(0.055);
  }
  function showCombo(c) {
    if (!D.combo) return;
    D.comboB.textContent = D.comboI.textContent = c + '!';
    D.combo.style.setProperty('--h', ((c * 37) % 360).toFixed(0));
    if (!SADE) D.combo.classList.add('on');   // (Pırıl: kombo sayacı gösterilmez)
    restart(D.combo, 'hit');
    S.comboShownT = 1.0;
  }
  // Övgü: ARA SIRA ve çeşitli (aynı cümle art arda gelmez, en az 18 s arayla, Hala başka bir şey söylerken susar)
  const PRAISE = { kombo: ['his_kombo_1', 'his_kombo_2', 'his_kombo_3', 'his_kombo_4', 'his_kombo_5', 'his_kombo_6', 'his_kombo_7', 'his_kombo_8'],
    nese: ['his_nese_1', 'his_nese_2', 'his_nese_3', 'his_nese_4', 'his_nese_5', 'his_nese_6'] };
  function praise(kind) {
    const G = g(); if (!G || G.boss && G.boss.aggro && !G.boss.dead) return false;
    if (S.t - S.lastPraise < 22 || speaking()) return false;
    const list = PRAISE[kind]; let k, n = 0;
    do { k = pick(list); } while (k === S.praiseKey && ++n < 6);
    if (say(k, 0)) { S.lastPraise = S.t; S.praiseKey = k; return true; }
    return false;
  }

  const SADE = true;
  // (Pırıl: ekran konfeti yağmuru ve kombo sayacı yok — sade)
  function rain() { if (!SADE && D.rain) { restart(D.rain, 'on'); clearTimeout(S.rainT); S.rainT = setTimeout(() => D.rain.classList.remove('on'), 3400); } }
  // ── Neşelenme ──
  function onHappy(e) {
    const y = 1.2;
    burst('hearts', e.x, y + 0.4, e.z, { count: e.boss ? 30 : e.elite ? 14 : 6 });
    burst('confetti', e.x, y + 0.8, e.z, { count: e.boss ? 60 : e.elite ? 30 : 14 });
    sfx('heart', { vol: 0.5, x: e.x, z: e.z });
    if (e.boss) { setTimeout(() => addStarCandy(2), 6000); return; }   // (boss kutlamasında tek büyük an: oyunun kendisi)
    if (e.elite && Math.random() < 0.5) setTimeout(() => addStarCandy(1), 700);
    if (Math.random() < 0.18) praise('nese');
  }
  // Yerdeki şekerler: düştükten 0,6 s sonra 9 m'ye kadar mıknatısla Feza'ya uçar (çın çın 07_game'de, sayaç burada zıplar)
  function magnetTick(dt) {
    const G = g(); if (!G || !G.coins || !G.P || G.P.dead || G.state !== 'play') return;
    const px = G.P.pos.x, pz = G.P.pos.z;
    for (const c of G.coins) if (!c.mag && c.t > 0.6) { const dx = c.x - px, dz = c.z - pz; if (dx * dx + dz * dz < 81) c.mag = true; }
  }
  function onGold() { if (S.flyGap <= 0) { S.flyGap = 0.07; flyTo('candy'); } }

  // ── Seviye ve yetenek ──
  function onLevel(o) {
    // (Pırıl: ikinci "Seviye" kartı yok — 09_ui'nin bandı tek gösterim)
    addStarCandy(1);
  }
  function onSkill(o) {
    const s = skillList()[o.index]; if (!s) return;
    // (09_ui artık kendi "Yeni Yetenek!" bandını gösteriyor: ikinci bir kart açılmaz)
    if (typeof UI === 'undefined' || !UI._D || !UI._D.banner) S.lvlQ.push({ kind: 'skill', def: s.def });
  }
  function cardTick(dt) {
    if (S.card) {
      S.cardT -= dt;
      if (S.cardT <= 0) { (S.card.kind === 'lvl' ? D.lvl : D.card).classList.remove('on'); S.card = null; S.cardGap = 0.35; }
      return;
    }
    if (S.cardGap > 0) { S.cardGap -= dt; return; }
    const G = g();
    if (!S.lvlQ.length || !G || G.state !== 'play') return;
    if (S.lvlQ[0].kind === 'skill' && typeof UI !== 'undefined' && UI._D && ((UI._D.banner && UI._D.banner.classList.contains('on')) || (UI._D.card && UI._D.card.classList.contains('on')))) return;   // bant / eşya kartı bitsin, sonra yetenek kartı
    const c = S.card = S.lvlQ.shift();
    if (c.kind === 'lvl') {
      // (09_ui kendi "Seviye N!" yıldızını gösterir: burada yalnız ekran konfetisi + yıldız şeker; sonraki kart 2 s bekler)
      S.cardT = 2.0; if (!(typeof UI !== 'undefined' && UI._S && UI._S.t < (UI._S.celeUntil || 0))) rain();
      if (G.P && G.P.pos) burst('confetti', G.P.pos.x, 2.2, G.P.pos.z, { count: 50 });
      sfx('cheer', { vol: 0.6 });
    } else {
      const d = c.def;
      D.cardIco.innerHTML = U(d.svg) || '<span class="his-emo">' + (d.icon || '✨') + '</span>';
      D.card.style.setProperty('--c', d.color || '#ffd23f');
      D.cardStars.innerHTML = '<i class="on">★</i><i>★</i><i>★</i>';
      restart(D.card, 'on'); S.cardT = 3.2;
      sfx('unlock'); setTimeout(() => sfx('star', { pitch: 1.2 }), 250);
    }
  }

  // ── HUD tick ──
  function updateStarBtn(force) {
    const n = stars(), af = canAfford(), anySkill = skillList().some(s => s.unlocked);
    if (n !== S.lastStars || force) { S.lastStars = n; D.starN.textContent = n; }
    if (af !== S.lastAfford) {
      S.lastAfford = af; D.starBtn.classList.toggle('ready', af);
      if (af && S.t - S.lastStarHint > 90) { S.lastStarHint = S.t; S.starHintT = 2.5; }
    }
    D.starBtn.classList.toggle('his-hide', !anySkill && n === 0);
  }
  function malzTick() {
    const G = g(), m = (G && G.P && G.P.malzemeler) || {};
    const key = MALZ.map(x => (m[x.id] ? 1 : 0)).join('');
    if (key === S.lastMalz) return;
    const old = S.lastMalz; S.lastMalz = key;
    D.malzEls.forEach((e, i) => {
      const has = key[i] === '1';
      e.classList.toggle('has', has);
      if (has && old && old[i] === '0') restart(e, 'got');
    });
  }
  function halaTick(dt) {
    const A = typeof AUD !== 'undefined' ? AUD : null, cur = A && A.current ? String(A.current) : '';
    const pt = !!speaking() && /^(pp_|his_kombo|ovgu)/.test(cur);   // Pırıl konuşuyor: sol üstteki portresi zıplar
    if (pt !== S.pirilTalk) { S.pirilTalk = pt; const f = document.querySelector('.u-bilbo-face'); if (f) f.classList.toggle('talk', pt); }
    const talk = !!speaking();
    if (talk !== S.wasTalking) { S.wasTalking = talk; D.hala.classList.toggle('talk', talk); }
    // ağız: konuşurken 3 biçim arasında hece ritmiyle
    let m = 0;
    if (talk) { S.talkT -= dt; if (S.talkT <= 0) { S.talkT = rnd(0.07, 0.15); S.mouth = S.mouth === 0 ? (Math.random() < 0.6 ? 1 : 2) : Math.random() < 0.7 ? 0 : 3 - S.mouth; } m = S.mouth; }
    else S.mouth = 0;
    if (m !== S.lastMouth) { S.lastMouth = m; for (let i = 0; i < 3; i++) D.m[i].setAttribute('opacity', i === m ? '1' : '0'); }
    // göz kırpma
    S.blinkT -= dt;
    if (S.blinkT <= 0) { S.blink = 0.13; S.blinkT = rnd(2.4, 5); }
    const b = S.blink > 0; if (b) S.blink -= dt;
    if (b !== S.lastBlink) { S.lastBlink = b; D.eyes.setAttribute('opacity', b ? '0' : '1'); D.lids.setAttribute('opacity', b ? '1' : '0'); }
    if (S.halaPic) { const k = b && !m ? 'blink' : m ? 'talk' : 'smile'; if (k !== S.halaPicK) { S.halaPicK = k; for (const q in S.halaPic) S.halaPic[q].style.opacity = q === k ? 1 : 0; } }
  }
  function pipsTick() {
    const U = typeof UI !== 'undefined' && UI._D && UI._D.sk; if (!U) return;
    const list = skillList();
    for (let i = 0; i < U.length; i++) {
      const v = U[i], s = list[i]; if (!v || !s) continue;
      if (!v.hisPips) v.hisPips = el('span', 'his-pips', v.b, '<i></i><i></i><i></i>');
      const t = tierOf(s.def.id);
      if (v.hisTier !== t) { v.hisTier = t; const is = v.hisPips.children; for (let k = 0; k < 3; k++) is[k].className = k < t ? 'on' : ''; if (t > 1) restart(v.b, 'his-tierup'); }
    }
  }
  function tick(dt) {
    S.t += dt;
    if (!S.built) { build(); if (!S.built) return; }
    const G = g();
    if (S.comboShownT > 0) { S.comboShownT -= dt; if (S.comboShownT <= 0) D.combo.classList.remove('on'); }
    if (S.t - S.lastHit > 1.5 && S.combo) { S.best = Math.max(S.best, S.combo); S.combo = 0; }
    if (S.flyGap > 0) S.flyGap -= dt;
    squashTick(dt);
    flyTick(dt);
    magnetTick(dt);
    cardTick(dt);
    halaTick(dt);
    if ((S.frame = (S.frame | 0) + 1) % 6 === 0) { updateStarBtn(); malzTick(); pipsTick(); }
    if (S.starHintT > 0) { S.starHintT -= dt; if (S.starHintT <= 0 && G && G.state === 'play') say('his_yildiz_var', 1); }
  }

  // ── Bağlantı ──
  function wire() {
    const G = g(); if (!G || !G.on || S.wired) return;
    S.wired = true;
    G.on('hit', onHit);
    G.on('happy', onHappy);
    G.on('gold', onGold);
    G.on('levelup', onLevel);
    G.on('skill', onSkill);
    G.on('zone', () => { S.combo = 0; SQ.length = 0; S.lvlQ.length = 0; if (S.upOpen) closeUpgrades(); });
    const orig = G.update;
    G.update = function (dt) { orig(dt); try { tick(dt); } catch (e) { if (!S.warned) { S.warned = true; console.warn('[HIS] tick', e); } } };
  }
  wire();
  return { addStarCandy, get starCandy() { return stars(); }, upgrade, openUpgrades, closeUpgrades, canAfford, flyTo, _S: S, _D: D, ART };
})();
