/* Yazısız yükleme örtüsü (ev + üç macera ortak). Sayfanın <head>'inde EN BAŞTA, diğer her şeyden önce yüklenir:
   <script src="yukleme.js" data-tema="ev"></script>   (maceralarda: src="../yukleme.js" data-tema="orman|hala|huysuz|piril")
   Sıcak arka plan, küçük simge (evde logo), sırayla beliren Bilbo pati izleri + önlerinde zıplayan Bilbo'nun topu (piril: yıldız izleri + ejderha ışığı).
   Evden kapıyla gelince evin beyaz parlamasıyla aynı sıcak beyazdan başlar, maceranın rengine yumuşakça geçer.
   İlerleme: yüklenen script dosyaları (kendiliğinden) + YUKLEME.ilerle(0..1). Kapanış: YUKLEME.bitir();
   maceralarda oyunun kendi hazır sözü (UI.ready: başlık ekranının ilk karesi çizilince) beklenir. En geç 15 sn'de kendiliğinden kalkar. */
(function () {
  'use strict';
  var bu = document.currentScript, tema = (bu && bu.getAttribute('data-tema')) || 'ev';
  var R = {
    ev: ['#fff3dc', '#f6b97c', '#b8643a'],
    orman: ['#effbe2', '#8fd36f', '#2f7a3c'],
    hala: ['#fff1f6', '#f7a6c6', '#c8507e'],
    huysuz: ['#f1e9ff', '#a88cf2', '#45298f'],
    piril: ['#f6f0ff', '#cdb8f6', '#7458c2']
  }[tema] || ['#fff3dc', '#f6b97c', '#b8643a'];
  var kok = (bu && bu.src) ? bu.src.replace(/yukleme\.js(\?.*)?$/, '') : '';
  var SIMGE = {
    // evde: logo (küçük kopya, ağır dosyalardan önce gelir)
    ev: '<img src="' + kok + 'logo-kucuk.png" alt="" draggable="false" style="width:min(62vw,52vh,520px);height:auto;filter:drop-shadow(0 8px 14px rgba(80,30,0,.35))">',
    // orman: gülümseyen timsah başı + Bilbo'nun topu
    orman: '<svg viewBox="0 0 220 140" width="220" height="140"><g transform="translate(8,18)"><path d="M10 70 Q10 30 60 28 L150 34 Q182 38 182 58 Q182 74 150 76 L60 82 Q10 86 10 70Z" fill="#5cb85c" stroke="#2f7a3c" stroke-width="5"/>' +
      '<path d="M40 66 Q100 80 170 62" fill="none" stroke="#2f7a3c" stroke-width="4" stroke-linecap="round"/>' +
      '<g fill="#fff"><path d="M70 70 l6 9 l6 -8z"/><path d="M100 72 l6 9 l6 -9z"/><path d="M130 69 l6 8 l5 -9z"/></g>' +
      '<circle cx="62" cy="26" r="17" fill="#5cb85c" stroke="#2f7a3c" stroke-width="5"/><circle cx="64" cy="25" r="8" fill="#fff"/><circle cx="66" cy="25" r="4.5" fill="#222"/>' +
      '<circle cx="162" cy="44" r="4" fill="#2f7a3c"/><ellipse cx="44" cy="58" rx="9" ry="5" fill="#ff9aa8" opacity=".8"/></g>' +
      '<g transform="translate(190,104)"><circle r="24" fill="#3d8fd0"/><path d="M-23 -6 Q0 8 23 -6" fill="none" stroke="#fff1c9" stroke-width="6"/><circle cx="-8" cy="-10" r="6" fill="#fff" opacity=".5"/></g></svg>',
    // Dev Ev: mumlu pembe pasta
    hala: '<svg viewBox="0 0 160 150" width="170" height="160"><rect x="20" y="78" width="120" height="50" rx="12" fill="#ff7fae"/><rect x="34" y="44" width="92" height="40" rx="10" fill="#fff0f6"/>' +
      '<path d="M20 86 q10 12 20 0 q10 12 20 0 q10 12 20 0 q10 12 20 0 q10 12 20 0 q10 12 20 0" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M34 52 q9 10 18 0 q9 10 18 0 q9 10 18 0 q9 10 18 0 q9 10 20 0" fill="none" stroke="#ff9fc4" stroke-width="6" stroke-linecap="round"/>' +
      '<rect x="10" y="126" width="140" height="10" rx="5" fill="#fff"/>' +
      '<g><rect x="52" y="20" width="9" height="26" rx="3" fill="#8fd0ff"/><rect x="76" y="14" width="9" height="32" rx="3" fill="#ffe27a"/><rect x="100" y="20" width="9" height="26" rx="3" fill="#9be08a"/>' +
      '<g fill="#ffb03a"><ellipse class="yk-alev" cx="56.5" cy="13" rx="5" ry="8"/><ellipse class="yk-alev" cx="80.5" cy="7" rx="5" ry="8"/><ellipse class="yk-alev" cx="104.5" cy="13" rx="5" ry="8"/></g></g>' +
      '<circle cx="80" cy="40" r="9" fill="#e8283f"/></svg>',
    // Huysuzlar: parlayan ışın kılıcı + yıldız
    huysuz: '<svg viewBox="0 0 160 160" width="160" height="160"><defs><linearGradient id="ykb" x1="0" x2="1"><stop offset="0" stop-color="#8fe6ff"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#8fe6ff"/></linearGradient></defs>' +
      '<g transform="rotate(35 80 80)"><rect class="yk-isin" x="68" y="6" width="24" height="104" rx="12" fill="#5fd0ff" opacity=".45"/><rect x="73" y="10" width="14" height="98" rx="7" fill="url(#ykb)"/>' +
      '<rect x="68" y="106" width="24" height="44" rx="6" fill="#c9d0da"/><rect x="66" y="108" width="28" height="8" rx="3" fill="#3d4a5c"/><rect x="66" y="128" width="28" height="6" rx="3" fill="#3d4a5c"/></g>' +
      '<path d="M128 18 l6 13 l14 2 l-10 10 l2 14 l-12 -7 l-12 7 l2 -14 l-10 -10 l14 -2z" fill="#ffd34a"/></svg>',
    // Pırıl: hilal ay + parlayan ejderha ışığı
    piril: '<svg viewBox="0 0 160 160" width="160" height="160"><path d="M96 20 A56 56 0 1 0 140 104 A44 44 0 1 1 96 20Z" fill="#fff3b8"/>' +
      '<circle class="yk-isin" cx="112" cy="56" r="20" fill="#ffd6f4" opacity=".55"/><circle cx="112" cy="56" r="11" fill="#fff"/>' +
      '<path d="M40 30 l3 7 l8 1 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 l8 -1z" fill="#ffd34a"/><circle cx="132" cy="128" r="4" fill="#bfe0ff"/></svg>'
  }[tema] || '';
  // pati izi (yukarı bakar; döndürülerek sağa yürür)
  var PATI = '<svg viewBox="0 0 40 40" width="100%" height="100%"><ellipse cx="20" cy="27" rx="10" ry="8.5"/><ellipse cx="8" cy="15" rx="4.2" ry="5.4" transform="rotate(-20 8 15)"/>' +
    '<ellipse cx="16" cy="9" rx="4.2" ry="5.6"/><ellipse cx="24.5" cy="9" rx="4.2" ry="5.6"/><ellipse cx="32" cy="15" rx="4.2" ry="5.4" transform="rotate(20 32 15)"/></svg>';
  // Pırıl macerasında köpek patisi yerine yıldız izi (ışık kırıntıları), top yerine parlayan ejderha ışığı
  if (tema === 'piril') PATI = '<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M20 3 L24.5 14.5 L37 15.5 L27.5 23.5 L30.5 36 L20 29.5 L9.5 36 L12.5 23.5 L3 15.5 L15.5 14.5Z" fill="#fff3a6" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
  var N = 7, iz = '';
  for (var i = 0; i < N; i++) iz += '<i style="left:' + (4 + i * 13) + '%;top:' + (i % 2 ? 58 : 14) + '%">' + PATI + '</i>';
  var css = '#yk{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4vh;' +
    'background:radial-gradient(circle at 50% 42%,' + R[0] + ' 0%,' + R[1] + ' 58%,' + R[2] + ' 100%);transition:opacity .7s ease;pointer-events:auto;' +
    '-webkit-user-select:none;user-select:none;touch-action:none}' +
    '#yk.kalk{opacity:0;pointer-events:none}' +
    '#yk .yk-beyaz{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#fffdf2 0%,#fff4d6 45%,#ffe8c0 100%);animation:ykBeyaz .9s ease-out .15s both;pointer-events:none}' +
    '@keyframes ykBeyaz{from{opacity:1}to{opacity:0}}' +
    '#yk .yk-simge{position:relative;animation:ykSal 2.4s ease-in-out infinite;transform-origin:50% 90%}' +
    '@keyframes ykSal{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}' +
    '#yk .yk-simge svg{width:min(42vw,34vh,340px);height:auto;filter:drop-shadow(0 8px 12px rgba(0,0,0,.18))}' +
    '#yk .yk-yol{position:relative;width:min(80vw,600px);height:min(16vw,120px)}' +
    '#yk .yk-yol i{position:absolute;width:12%;aspect-ratio:1;transform:rotate(90deg) scale(.2);opacity:0;fill:' + R[2] + ';transition:transform .45s cubic-bezier(.3,1.6,.5,1),opacity .3s}' +
    '#yk .yk-yol i.on{transform:rotate(90deg) scale(1);opacity:.85}' +
    '#yk .yk-yol i.siradaki{animation:ykNabiz 1s ease-in-out infinite}' +
    '@keyframes ykNabiz{0%,100%{opacity:0;transform:rotate(90deg) scale(.5)}50%{opacity:.28;transform:rotate(90deg) scale(.8)}}' +
    '#yk .yk-top{position:absolute;top:0;width:13%;aspect-ratio:1;margin-left:-1%;transition:left .5s ease;animation:ykZipla .55s ease-in-out infinite alternate}' +
    '@keyframes ykZipla{from{transform:translateY(55%)}to{transform:translateY(-35%)}}' +
    '#yk .yk-top b{display:block;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#8fd0ff,#3d8fd0 55%,#1f5f9a);' +
    'box-shadow:inset 0 0 0 3px rgba(255,255,255,.15),0 4px 8px rgba(0,0,0,.25);animation:ykDon .9s linear infinite;position:relative}' +
    '#yk .yk-top b:after{content:"";position:absolute;left:-4%;right:-4%;top:42%;height:16%;background:#fff1c9;border-radius:40%}' +
    '@keyframes ykDon{to{transform:rotate(360deg)}}' +
    (tema === 'piril' ? '#yk .yk-yol i{fill:#fff3a6}#yk .yk-top b{background:radial-gradient(circle at 45% 40%,#fff 0%,#ffd6f4 35%,#c49bff 70%,rgba(196,155,255,0) 72%);box-shadow:0 0 18px 6px rgba(255,214,244,.7);animation:none}#yk .yk-top b:after{display:none}' : '') +
    '#yk .yk-alev{animation:ykAlev .35s ease-in-out infinite alternate;transform-origin:center bottom;transform-box:fill-box}' +
    '@keyframes ykAlev{from{transform:scaleY(.85)}to{transform:scaleY(1.15)}}' +
    '#yk .yk-isin{animation:ykIsin .5s ease-in-out infinite alternate}@keyframes ykIsin{from{opacity:.25}to{opacity:.6}}' +
    '@media (prefers-reduced-motion:reduce){#yk *{animation-duration:3s!important}}';
  var st = document.createElement('style'); st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
  document.documentElement.style.background = R[2];
  var el = document.createElement('div'); el.id = 'yk';
  var gecis = tema !== 'ev' || /[?&]gecis\b/.test(location.search);
  try { if (sessionStorage.getItem('fezaBilboGecis')) { gecis = true; sessionStorage.removeItem('fezaBilboGecis'); } } catch (e) {}
  el.innerHTML = '<div class="yk-simge">' + SIMGE + '</div><div class="yk-yol">' + iz + '<span class="yk-top"><b></b></span></div>' + (gecis ? '<div class="yk-beyaz"></div>' : '');
  document.documentElement.appendChild(el);
  var izler = el.querySelectorAll('.yk-yol i'), top = el.querySelector('.yk-top');

  // ilerleme: script dosyaları + dışarıdan bildirilen oran (hangisi büyükse); ekranda hiç geri gitmez
  var oran = 0, disOran = 0, yuklenen = 0, bitti = false, t0 = Date.now();
  function goster() {
    var n = Math.round(oran * N);
    for (var i = 0; i < N; i++) { izler[i].className = i < n ? 'on' : (i === n ? 'siradaki' : ''); }
    top.style.left = (4 + Math.min(n, N - 1) * 13 + (n >= N ? 13 : 0)) + '%';
  }
  function hesap() {
    if (bitti) return;
    var hepsi = document.querySelectorAll('script[src]').length || 1;
    var s = Math.min(0.9, yuklenen / Math.max(hepsi, 4) * 0.9);
    var zaman = Math.min(0.3, (Date.now() - t0) / 20000);   // hiçbir şey gelmese de yavaşça ilerler
    var y = Math.max(oran, s, disOran, zaman);
    if (y > oran) { oran = Math.min(0.96, y); goster(); }
  }
  document.addEventListener('load', function (e) { if (e.target && e.target.tagName === 'SCRIPT') { yuklenen++; hesap(); } }, true);
  var sayac = setInterval(hesap, 250);
  goster();

  function bitir() {
    if (bitti) return; bitti = true; clearInterval(sayac); Z.bitti = performance.now();
    oran = 1; goster();
    setTimeout(function () {
      el.className = 'kalk';
      document.documentElement.style.background = '';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); if (st.parentNode) st.parentNode.removeChild(st); }, 800);
      try { window.dispatchEvent(new Event('yukleme-bitti')); } catch (e) {}
    }, 260);
  }
  var Z = { kuruldu: performance.now(), bitti: 0 };
  window.YUKLEME = { zaman: Z, ilerle: function (o) { disOran = Math.max(disOran, Math.min(0.96, o)); hesap(); }, bitir: bitir, get acik() { return !bitti; } };

  // maceralar: oyunun hazır sözü (UI.ready → başlık ekranının ilk karesi çizildi). Sayfa kendini yeniliyorsa (data-updating) bekler.
  if (tema !== 'ev') {
    var bekle = setInterval(function () {
      var ui = null; try { ui = typeof UI !== 'undefined' ? UI : null; } catch (e) {}
      if (ui && ui.ready && typeof ui.ready.then === 'function') {
        clearInterval(bekle);
        ui.ready.then(function hazir() {
          if (document.documentElement.hasAttribute('data-updating')) { setTimeout(hazir, 100); return; }
          requestAnimationFrame(function () { requestAnimationFrame(bitir); });
        });
      }
    }, 100);
  }
  setTimeout(bitir, 15000);   // güvenlik: asla takılı kalmasın
})();
