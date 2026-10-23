/* Turkish-only presentation facade; keeps the shared game/UI API stable. */
window.FEZA_LANG = (() => {
  'use strict';
  const text = value => String(value == null ? '' : value);
  function set() {
    document.documentElement.lang = 'tr';
    document.title = 'Bilbo ve Saklı Toplar Ormanı';
  }
  set();
  return { t: text, html: text, choose: () => Promise.resolve('tr'), reopen: set, set, language: () => 'tr' };
})();
