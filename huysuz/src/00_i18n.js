/* Yalnız Türkçe: eski dil katmanının zararsız kalıntısı. t()/html() metni olduğu gibi döndürür; dil seçimi yok. */
window.FEZA_LANG = (() => {
  'use strict';
  const t = value => String(value == null ? '' : value);
  const html = value => String(value == null ? '' : value);
  document.documentElement.lang = 'tr';
  return { t, html, choose: () => Promise.resolve('tr'), reopen() {}, set() {}, language: () => 'tr', EN: {} };
})();
