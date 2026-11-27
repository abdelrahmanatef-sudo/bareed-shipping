/* Egyptian mobile numbers only: exactly 11 digits starting with 010 / 011 / 012 / 015. Applies to every input[inputmode="tel"], including ones created later. */
(function () {
  var RE = /^01[0125][0-9]{8}$/;
  var ar = (document.documentElement.lang || 'ar').slice(0, 2) !== 'en';
  var MSG = ar ? 'اكتب رقم موبايل مصري من 11 رقم يبدأ بـ 01 (مثال: 01012345678)' : 'Enter an Egyptian mobile number: 11 digits starting with 01 (e.g. 01012345678)';
  function isPhone(el) { return el && el.tagName === 'INPUT' && el.getAttribute('inputmode') === 'tel'; }
  function norm(v) {
    return String(v).replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 0x0660; }).replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 0x06F0; }).replace(/\D/g, '').slice(0, 11);
  }
  function check(el) {
    var v = el.value;
    if (v !== '' && !RE.test(v)) el.setCustomValidity(MSG); else el.setCustomValidity('');
  }
  function prep(el) {
    if (el.__pg) return; el.__pg = 1;
    el.maxLength = 11; el.setAttribute('pattern', '01[0125][0-9]{8}'); el.setAttribute('title', MSG); el.setAttribute('autocomplete', el.getAttribute('autocomplete') || 'tel-national');
    var n = norm(el.value); if (n !== el.value) el.value = n; check(el);
  }
  document.addEventListener('input', function (e) { var el = e.target; if (!isPhone(el)) return; prep(el); var n = norm(el.value); if (n !== el.value) el.value = n; check(el); }, true);
  document.addEventListener('focusin', function (e) { if (isPhone(e.target)) prep(e.target); }, true);
  document.addEventListener('submit', function (e) { var f = e.target; if (!f || !f.querySelectorAll) return; f.querySelectorAll('input[inputmode="tel"]').forEach(function (el) { prep(el); var n = norm(el.value); if (n !== el.value) el.value = n; check(el); }); }, true);
  function scan() { document.querySelectorAll('input[inputmode="tel"]').forEach(prep); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  window.BareedPhone = { valid: function (v) { return RE.test(norm(v)); }, norm: norm, msg: MSG };
})();
