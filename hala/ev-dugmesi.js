/* Feza ve Bilbo'nun Maceraları: eve dönüş düğmesi + macera bitti bilgisi.
   Yazısız ev düğmesi; yanlışlıkla basılmasın diye ~1 sn basılı tutulunca halka dolar ve ../index.html'ye döner
   (adresin sorgu kısmı, ör. ?sessiz, korunur). window.FEZA_BILBO_TAMAM(id): localStorage 'fezaBilboTamam' dizisine id ekler.
   <script src="ev-dugmesi.js" data-macera="orman" data-yer="sol|sag" data-ust="px"></script> */
(function () {
  'use strict';
  const me = document.currentScript;
  const MACERA = (me && me.dataset.macera) || '';
  const YER = (me && me.dataset.yer) || 'sol';
  const UST = (me && me.dataset.ust) || '14';
  const SURE = 1000;   // ms basılı tut

  window.FEZA_BILBO_TAMAM = function (id) {
    id = id || MACERA; if (!id) return;
    try {
      let a = JSON.parse(localStorage.getItem('fezaBilboTamam') || '[]');
      if (!Array.isArray(a)) a = [];
      if (a.indexOf(id) < 0) { a.push(id); localStorage.setItem('fezaBilboTamam', JSON.stringify(a)); }
    } catch (e) { /* gizli mod: yok say */ }
  };

  const css = `
#fbEv{position:fixed;${YER === 'sag' ? 'right' : 'left'}:calc(${UST}px + env(safe-area-inset-${YER === 'sag' ? 'right' : 'left'}));top:calc(${UST}px + env(safe-area-inset-top));
  width:66px;height:66px;z-index:2147483000;border:0;padding:0;margin:0;background:none;cursor:pointer;touch-action:none;
  -webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;outline:none}
#fbEv svg{width:100%;height:100%;display:block;overflow:visible;filter:drop-shadow(0 3px 4px #0006);transition:transform .15s}
#fbEv.bas svg{transform:scale(1.12)}
#fbEv .hal{fill:none;stroke:#fff6;stroke-width:6}
#fbEv .dol{fill:none;stroke:#ffd84a;stroke-width:6;stroke-linecap:round;stroke-dasharray:183;stroke-dashoffset:183;transform:rotate(-90deg);transform-origin:33px 33px}
#fbEv.git svg{transform:scale(1.25)}
/* oyunun sol üst portre kümesi ev düğmesinin sağına kayar */
#ui .u-tl{left:calc(var(--padL, 16px) + 78px)}
@media (max-aspect-ratio: 1/1){#ui .u-tl{left:var(--padL, 16px);top:calc(var(--padT, 14px) + 74px)}}   /* dikey ekran: üstteki düğmelerle çakışmasın, aşağı kayar */
#ui .u-dream-headings{padding-left:64px}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function kur() {
    if (document.getElementById('fbEv')) return;
    const b = document.createElement('div');
    b.id = 'fbEv'; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Eve dön');
    b.innerHTML = `<svg viewBox="0 0 66 66" aria-hidden="true">
  <circle cx="33" cy="33" r="29" fill="#7ad0ff" stroke="#fff" stroke-width="3"/>
  <circle class="hal" cx="33" cy="33" r="29"/>
  <rect x="40" y="15" width="6" height="11" rx="1.5" fill="#b0644a" stroke="#5a2f2a" stroke-width="2"/>
  <path d="M16 32 L33 17 L50 32 Z" fill="#ff6f6f" stroke="#7a2a3a" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="20" y="30" width="26" height="19" rx="2.5" fill="#fff3d6" stroke="#7a4a3a" stroke-width="2.5"/>
  <rect x="29" y="37" width="8" height="12" rx="3.5" fill="#ffb347" stroke="#7a4a3a" stroke-width="2"/>
  <rect x="22.5" y="33.5" width="5.5" height="5.5" rx="1" fill="#8fe3ff" stroke="#7a4a3a" stroke-width="1.5"/>
  <path d="M40 34.5 c0-2 2.6-2 2.6 0 c0-2 2.6-2 2.6 0 c0 2-2.6 3.6-2.6 3.6 s-2.6-1.6-2.6-3.6z" transform="translate(-1.5 0)" fill="#ff5c8a"/>
  <circle class="dol" cx="33" cy="33" r="29"/>
</svg>`;
    document.body.appendChild(b);
    const dol = b.querySelector('.dol'), BOY = 2 * Math.PI * 29;
    dol.style.strokeDasharray = BOY; dol.style.strokeDashoffset = BOY;
    let t0 = 0, raf = 0, gitti = false;
    const ciz = k => { dol.style.strokeDashoffset = BOY * (1 - k); };
    function dur() { cancelAnimationFrame(raf); raf = 0; t0 = 0; b.classList.remove('bas'); if (!gitti) ciz(0); }
    function git() {
      gitti = true; b.classList.add('git'); ciz(1);
      try { if (window.AUD && AUD.stopVoice) AUD.stopVoice(); } catch (e) { /* yok say */ }
      setTimeout(() => { location.href = '../index.html' + location.search; }, 120);
    }
    function adim() {
      if (!t0) return;
      const k = Math.min(1, (performance.now() - t0) / SURE);
      ciz(k);
      if (k >= 1) { t0 = 0; git(); return; }
      raf = requestAnimationFrame(adim);
    }
    const yut = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
    b.addEventListener('pointerdown', e => {
      yut(e); if (gitti) return;
      try { b.setPointerCapture(e.pointerId); } catch (_) { /* yok say */ }
      b.classList.add('bas'); t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(adim);
    });
    b.addEventListener('pointerup', e => { yut(e); dur(); });
    b.addEventListener('pointercancel', dur);
    b.addEventListener('lostpointercapture', dur);
    for (const n of ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup', 'click', 'contextmenu', 'dblclick']) b.addEventListener(n, yut, { passive: false });
    // Sayfa geri tuşuyla önbellekten dönerse (bfcache) düğme yeniden kullanılabilsin
    window.addEventListener('pageshow', () => { gitti = false; b.classList.remove('git'); dur(); });
  }
  if (document.body) kur(); else document.addEventListener('DOMContentLoaded', kur);
})();
