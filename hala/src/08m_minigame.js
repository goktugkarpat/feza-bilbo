/* ── Mini oyun çerçevesi ──
   MINIGAME.register(id, { ad, holdsWorld: true, start(ctx), update(dt, ctx) → 'done' | undefined, end(ctx) → skor })
   MINIGAME.start(id, { from: 'hub' | 'zone', onEnd(skor) }) — merkezden (HUB.open('mini')) ya da bölüm içinden
   (L.stations'a { kind: 'mini', mini: id } koy, UI 'station' gelince başlatır; ya da GAME.startMinigame(id)).
   GAME.update her kare MINIGAME.update(dt) çağırır; holdsWorld true ise dünya o sırada durur. Sonuç GAME.miniResult(id, skor)
   ile kayda girer (P.miniOyunlar[id] = { acik, enIyi, kez }). ctx.root: oyunun kendi DOM katmanı (mini oyun kendi arayüzünü
   buraya kurar; bitince silinir). Genel ad: MINIGAME. Mini oyun ajanı bu dosyaya ya da yeni dosyalara oyun ekler. */
const MINIGAME = (() => {
  'use strict';
  const REG = {}, order = [];
  let cur = null;
  function register(id, def) { if (!REG[id]) order.push(id); REG[id] = Object.assign({ ad: id, holdsWorld: true }, def, { id }); return REG[id]; }
  function start(id, o = {}) {
    const d = REG[id];
    if (!d || cur) return false;
    const root = document.createElement('div'); root.className = 'u-minigame'; root.dataset.mini = id;
    (document.getElementById('ui') || document.body).appendChild(root);
    cur = { d, o, ctx: { id, root, t: 0, score: 0, from: o.from || 'zone', data: {} } };
    if (typeof GAME !== 'undefined' && GAME.emit) GAME.emit('miniStart', { id, from: cur.ctx.from });
    try { d.start && d.start(cur.ctx); } catch (e) { console.warn('[MINIGAME] start ' + id, e); finish(); return false; }
    return true;
  }
  function update(dt) {
    if (!cur) return;
    cur.ctx.t += dt;
    let r;
    try { r = cur.d.update ? cur.d.update(dt, cur.ctx) : 'done'; } catch (e) { console.warn('[MINIGAME] update', e); r = 'done'; }
    if (r === 'done') finish();
  }
  function finish() {
    if (!cur) return;
    const c = cur; cur = null;
    let score = c.ctx.score;
    try { const s = c.d.end && c.d.end(c.ctx); if (typeof s === 'number') score = s; } catch (e) { console.warn('[MINIGAME] end', e); }
    c.ctx.root.remove();
    if (typeof GAME !== 'undefined' && GAME.miniResult) GAME.miniResult(c.d.id, score);
    if (c.o.onEnd) { try { c.o.onEnd(score); } catch (e) { /* ignore */ } }
    if (typeof GAME !== 'undefined' && GAME.emit) GAME.emit('miniEnd', { id: c.d.id, score });
  }
  // Yer tutucu mini oyun: 5 saniyede ekrana olabildiğince çok dokun (şeker topla)
  register('sekerYakala', {
    ad: 'Şeker Yakala',
    start(ctx) {
      ctx.root.style.cssText = 'position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:#0006;color:#fff;font:900 42px "Avenir Next",system-ui;touch-action:none';
      ctx.root.innerHTML = '<div>🍬 Dokun dokun! <span>0</span></div>';
      ctx.root.addEventListener('pointerdown', () => { ctx.score++; ctx.root.querySelector('span').textContent = ctx.score; });
    },
    update(dt, ctx) { return ctx.t > 5 ? 'done' : undefined; },
    end(ctx) { return ctx.score; },
  });
  return { register, start, update, finish, list: () => order.slice(), get: id => REG[id] || null,
    get active() { return !!cur; }, holdsWorld: () => !!(cur && cur.d.holdsWorld), get current() { return cur ? cur.d.id : null; } };
})();
