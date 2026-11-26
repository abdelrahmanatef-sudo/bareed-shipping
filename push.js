/* Bareed push notifications: bell button that subscribes this browser (admin / courier / merchant / guest). */
(function () {
  var URL0 = 'https://ybkkdjpgkkdnijafsuai.supabase.co', KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlia2tkanBna2tkbmlqYWZzdWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODkyNDksImV4cCI6MjExMDA2NTI0OX0.PJ-leYQkSNyKaCs_hnFiYdgUVkpQYyLo8eFKvSL40gU';
  var me = document.currentScript, SKEY = (me && me.getAttribute('data-key')) || 'sb-ybkkdjpgkkdnijafsuai-auth-token', MODE = (me && me.getAttribute('data-mode')) || 'auto', POS = (me && me.getAttribute('data-pos')) || 'bottom';
  var ar = (document.documentElement.lang || 'ar').slice(0, 2) !== 'en';
  var L = ar ? { bell: 'فعّل الإشعارات', ok: 'اتفعّلت الإشعارات ✓', denied: 'الإشعارات مقفولة من إعدادات المتصفح. افتح إعدادات الموقع وسمح بالإشعارات.', ios: 'على الآيفون: افتح الموقع من Safari ← زرار المشاركة ← "إضافة إلى الشاشة الرئيسية"، وبعدين افتح التطبيق وفعّل الإشعارات.', nosup: 'المتصفح ده مش بيدعم الإشعارات.', fail: 'ما قدرناش نفعّل الإشعارات، جرّب تاني.' }
    : { bell: 'Enable notifications', ok: 'Notifications enabled ✓', denied: 'Notifications are blocked in browser settings. Allow them for this site.', ios: 'On iPhone: open the site in Safari, tap Share, then "Add to Home Screen", then open the app and enable notifications.', nosup: 'This browser does not support notifications.', fail: 'Could not enable notifications, try again.' };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function bearer() { try { var j = JSON.parse(localStorage.getItem(SKEY) || 'null'); j = j && (j.access_token ? j : j.currentSession); return j && j.access_token || null; } catch (e) { return null; } }
  function identity() { return !!bearer() || (MODE === 'auto' && ls('bareed-notify-offer') === '1'); }
  var supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  function b64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); var r = atob(s + '==='.slice((s.length + 3) % 4)), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
  function ab(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function rpc(fn, args) {
    return fetch(URL0 + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + (bearer() || KEY), 'Content-Type': 'application/json' }, body: JSON.stringify(args) }).then(function (r) { return r.ok; });
  }
  function reg() { return navigator.serviceWorker.register('/sw.js').then(function () { return navigator.serviceWorker.ready; }); }
  function bind(sub) {
    var j = sub.toJSON(), a = { p_endpoint: sub.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth };
    if (!bearer()) a.p_token = ls('bareed-chat-token');
    return rpc('push_subscribe', a);
  }
  function subscribe() {
    return reg().then(function (r) {
      return fetch(URL0 + '/functions/v1/push-send', { headers: { apikey: KEY } }).then(function (x) { return x.json(); }).then(function (k) {
        return r.pushManager.getSubscription().then(function (s) { return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.pub) }); });
      }).then(bind);
    });
  }
  var bell, tt;
  function toast(m) { var d = document.getElementById('bp-t') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'bp-t' })); d.textContent = m; d.style.display = 'block'; clearTimeout(tt); tt = setTimeout(function () { d.style.display = 'none'; }, 6000); }
  var css = document.createElement('style');
  css.textContent = '#bp-b{position:fixed;' + (POS === 'top' ? 'top:62px;inset-inline-end:14px;' : 'bottom:84px;inset-inline-start:16px;') + 'z-index:9997;display:none;align-items:center;gap:6px;border:0;border-radius:999px;padding:9px 14px;background:var(--surface,#fff);color:var(--ink,#0B1B2E);border:1px solid var(--line,#DAE6F0);box-shadow:0 4px 16px rgba(0,0,0,.2);font:600 13px inherit;cursor:pointer}#bp-b svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#bp-t{position:fixed;inset-inline:16px;bottom:150px;max-width:420px;margin-inline:auto;z-index:10000;background:#0B1B2E;color:#fff;padding:11px 14px;border-radius:12px;font-size:14px;line-height:1.5;display:none;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.35)}';
  document.head.appendChild(css);
  function show(v) { if (bell) bell.style.display = v ? 'flex' : 'none'; }
  function sync() {
    if (!bell) return;
    var id = identity();
    if (!supported) { show(id && /iphone|ipad|ipod/i.test(navigator.userAgent)); return; }
    if (Notification.permission === 'denied') { show(false); return; }
    if (!id) { // signed out / no offer: drop any old binding so notifications do not reach the wrong person
      navigator.serviceWorker.getRegistration('/').then(function (r) { return r && r.pushManager.getSubscription(); }).then(function (s) { if (s) { rpc('push_unsubscribe', { p_endpoint: s.endpoint }); s.unsubscribe(); } }).catch(function () {});
      show(false); return;
    }
    if (Notification.permission === 'granted') { subscribe().catch(function () {}); show(false); return; }
    show(true);
  }
  function click() {
    if (!supported) { toast(/iphone|ipad|ipod/i.test(navigator.userAgent) ? L.ios : L.nosup); return; }
    Notification.requestPermission().then(function (p) {
      if (p === 'denied') { toast(L.denied); show(false); return; }
      if (p !== 'granted') return;
      subscribe().then(function () { toast(L.ok); show(false); }).catch(function () { toast(L.fail); });
    });
  }
  function mount() {
    bell = document.createElement('button'); bell.id = 'bp-b'; bell.type = 'button';
    bell.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span></span>';
    bell.querySelector('span').textContent = L.bell; bell.addEventListener('click', click); document.body.appendChild(bell);
    sync(); setInterval(sync, 5000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
