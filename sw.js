// Feza ve Bilbo'nun Maceraları – tek service worker (kökte; ev + üç macera).
// İlk açılıştan sonra bütün oyun cihazda saklanır ve internetsiz çalışır.
// DOSYA LİSTESİNİ ELLE DEĞİŞTİRMEYİN: `python3 tools/liste.py` listeyi yeniler, bir şey değiştiyse sürümü artırır.
const CACHE = 'feza-bilbo-v2';
const ONEK = 'feza-bilbo-';   // aynı sitede başka oyunlar da var: yalnız bu önekli önbellekler silinir
const DOSYALAR = /*DOSYALAR*/[
 "./",
 "./bilbo-ses.js",
 "./ev-2d.js",
 "./ev-3d.js",
 "./ev-muzik.js",
 "./ev-sesler.js",
 "./index.html",
 "./logo.png",
 "./manifest.webmanifest",
 "./hala/bilbo-ses.js",
 "./hala/ev-dugmesi.js",
 "./hala/index.html",
 "./hala/sesler.js",
 "./hala/assets/audio/bilbo-hav-hav.mp3",
 "./hala/src/00_core.js",
 "./hala/src/00_i18n.js",
 "./hala/src/01_textures.js",
 "./hala/src/02_audio.js",
 "./hala/src/02l_balkon.js",
 "./hala/src/02l_boss.js",
 "./hala/src/02l_feza.js",
 "./hala/src/02l_hala.js",
 "./hala/src/02l_hikaye.js",
 "./hala/src/02l_his.js",
 "./hala/src/02l_huysuz.js",
 "./hala/src/02l_masa.js",
 "./hala/src/02l_mini.js",
 "./hala/src/02l_odalarA.js",
 "./hala/src/02l_odalarB.js",
 "./hala/src/03_fx.js",
 "./hala/src/04_bilbo.js",
 "./hala/src/04_bilbo_follow.js",
 "./hala/src/04_bilbo_fun.js",
 "./hala/src/04_esyalar.js",
 "./hala/src/04_feza.js",
 "./hala/src/04_hala.js",
 "./hala/src/05_enemies.js",
 "./hala/src/05a_huysuz_kayit.js",
 "./hala/src/05b_bosslar.js",
 "./hala/src/05c_boss_davranis.js",
 "./hala/src/05h_balkon.js",
 "./hala/src/05h_huysuzlar.js",
 "./hala/src/06_level.js",
 "./hala/src/06a_bolum_kayit.js",
 "./hala/src/06y_odakit.js",
 "./hala/src/06z_balkon.js",
 "./hala/src/06z_buzdolabi.js",
 "./hala/src/06z_masa.js",
 "./hala/src/06z_mutfak.js",
 "./hala/src/06z_oturma.js",
 "./hala/src/06z_pasta.js",
 "./hala/src/07_game.js",
 "./hala/src/08_skills.js",
 "./hala/src/08j_his.js",
 "./hala/src/08m_minigame.js",
 "./hala/src/08n_mini_oyunlar.js",
 "./hala/src/09_ui.js",
 "./hala/src/09h_hub.js",
 "./hala/src/10_story.js",
 "./hala/src/hub.css",
 "./hala/src/ui.css",
 "./hala/vendor/three.js",
 "./huysuz/bilbo-ses.js",
 "./huysuz/ev-dugmesi.js",
 "./huysuz/index.html",
 "./huysuz/sesler.js",
 "./huysuz/assets/audio/bilbo-hav-hav.mp3",
 "./huysuz/src/00_core.js",
 "./huysuz/src/00_i18n.js",
 "./huysuz/src/01_textures.js",
 "./huysuz/src/02_audio.js",
 "./huysuz/src/03_fx.js",
 "./huysuz/src/04_bilbo.js",
 "./huysuz/src/04_bilbo_follow.js",
 "./huysuz/src/04_feza.js",
 "./huysuz/src/05_enemies.js",
 "./huysuz/src/06_level.js",
 "./huysuz/src/07_game.js",
 "./huysuz/src/08_skills.js",
 "./huysuz/src/09_ui.js",
 "./huysuz/src/ui.css",
 "./huysuz/vendor/three.js",
 "./icons/apple-touch-icon.png",
 "./icons/icon-192.png",
 "./icons/icon-512.png",
 "./orman/bilbo-ses.js",
 "./orman/ev-dugmesi.js",
 "./orman/index.html",
 "./orman/sesler.js",
 "./orman/assets/audio/bilbo-hav-hav.mp3",
 "./orman/src/00_core.js",
 "./orman/src/00_i18n.js",
 "./orman/src/01_textures.js",
 "./orman/src/02_audio.js",
 "./orman/src/03_fx.js",
 "./orman/src/04_bilbo.js",
 "./orman/src/04_bilbo_follow.js",
 "./orman/src/04_feza.js",
 "./orman/src/04_forest_party.js",
 "./orman/src/04_forest_party_models.js",
 "./orman/src/05_enemies.js",
 "./orman/src/05_forest_animals.js",
 "./orman/src/06_level.js",
 "./orman/src/07_game.js",
 "./orman/src/08_skills.js",
 "./orman/src/09_ui.js",
 "./orman/src/ui.css",
 "./orman/vendor/three.js"
]/*DOSYALAR-SON*/;
// imza: 06825696206c

self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  // Tek tek ekle: eksik bir dosya (ör. sonradan silinmiş) bütün kurulumu durdurmasın.
  const sonuc = await Promise.allSettled(DOSYALAR.map(u => c.add(new Request(u, { cache: 'reload' }))));
  const hata = sonuc.filter(r => r.status === 'rejected').length;
  if (hata) console.warn('feza-bilbo önbellek: ' + hata + ' dosya alınamadı');
  self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith(ONEK) && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

// Sayfalar (index.html) önce ağdan – güncel kalsın; diğer her şey önce önbellekten – hızlı ve internetsiz.
const SAYFA = /(\/|\.html)$/;
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const sayfa = req.mode === 'navigate' || SAYFA.test(url.pathname);
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (sayfa) {
      // anahtar: sorgusuz adres; klasör adresi (…/orman/) → …/orman/index.html
      const anahtar = url.origin + url.pathname.replace(/\/$/, '/index.html');
      try {
        const r = await fetch(req, { cache: 'no-cache' });
        if (r.ok) c.put(anahtar, r.clone());
        return r;
      } catch (err) {
        return (await c.match(anahtar)) || (await c.match(req, { ignoreSearch: true })) ||
               (await c.match(new URL('index.html', self.registration.scope).href)) || Response.error();
      }
    }
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  })());
});
