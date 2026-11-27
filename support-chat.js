/* Bareed unified chat: assistant bot + human support (admin inbox) in one widget. Guest (name+phone) or signed-in (merchant/courier). */
(function () {
  var URL0 = 'https://ybkkdjpgkkdnijafsuai.supabase.co', KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlia2tkanBna2tkbmlqYWZzdWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODkyNDksImV4cCI6MjExMDA2NTI0OX0.PJ-leYQkSNyKaCs_hnFiYdgUVkpQYyLo8eFKvSL40gU';
  var me = document.currentScript, SKEY = (me && me.getAttribute('data-key')) || 'sb-ybkkdjpgkkdnijafsuai-auth-token', MODE = (me && me.getAttribute('data-mode')) || 'auto';
  var ar = (document.documentElement.lang || 'ar').slice(0, 2) !== 'en';
  var L = ar ? { t: 'مساعدة بريد', tb: 'المساعد', th: 'موظف بريد', ph: 'اكتب رسالتك...', send: 'إرسال', nm: 'اسمك', tel: 'رقم تليفونك', hi: 'اكتب رسالتك وموظف بريد هيرد عليك هنا.', closed: 'المحادثة اتقفلت. ابعت رسالة جديدة لو محتاج.', e_rate: 'بعتّ رسائل كتير، استنى شوية.', e_name: 'اكتب اسمك.', e_phone: 'اكتب رقم موبايل مصري من 11 رقم يبدأ بـ 01.', e_gen: 'الرسالة ما اتبعتش، جرّب تاني.',
      bhi: 'أهلاً! أنا مساعد بريد. اسألني عن التغطية، التسجيل، التحصيل، أو تتبّع شحنتك. ولو عايز موظف دوس على «موظف بريد».', c_track: 'تتبع شحنة', c_human: 'كلّم موظف', askCode: 'اكتب كود الشحنة (شكله BR-XXXXXXXX).', nf: 'ما لقيتش شحنة بالكود ده، اتأكد منه وجرّب تاني.', st: 'حالة الشحنة', bfail: 'مقدرتش أرد دلوقتي. دوس على «موظف بريد» وهنساعدك.',
      s: { new: 'جديدة', picked_up: 'اتستلمت من التاجر', out_for_delivery: 'في الطريق للعميل', delivered: 'اتسلمت', returned: 'مرتجعة' } }
    : { t: 'Bareed help', tb: 'Assistant', th: 'Agent', ph: 'Type your message...', send: 'Send', nm: 'Your name', tel: 'Your phone', hi: 'Write your message and a Bareed agent will reply here.', closed: 'This chat was closed. Send a new message if you need.', e_rate: 'Too many messages, please wait a bit.', e_name: 'Enter your name.', e_phone: 'Enter an 11-digit Egyptian mobile number starting with 01.', e_gen: 'Message was not sent, try again.',
      bhi: 'Hi! I am the Bareed assistant. Ask about coverage, sign-up, COD or track a shipment. Tap "Agent" to talk to a person.', c_track: 'Track a shipment', c_human: 'Talk to an agent', askCode: 'Type the shipment code (looks like BR-XXXXXXXX).', nf: 'No shipment found with that code.', st: 'Shipment status', bfail: 'I cannot answer right now. Tap "Agent" and we will help.',
      s: { new: 'New', picked_up: 'Picked up', out_for_delivery: 'Out for delivery', delivered: 'Delivered', returned: 'Returned' } };
  var st = { open: false, last: 0, tid: null, guest: false, busy: false, timer: null, mode: 'bot', hist: [], await: null, started: false, unread: 0 };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function bearer() { try { var j = JSON.parse(localStorage.getItem(SKEY) || 'null'); j = j && (j.access_token ? j : j.currentSession); return j && j.access_token || null; } catch (e) { return null; } }
  function gtoken() { var g = ls('bareed-chat-token'); if (!g) { g = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); ls('bareed-chat-token', g); } return g; }
  function useGuest() { return MODE === 'guest' || (MODE === 'auto' && (!bearer() || st.guest)); }
  function call(fn, args, bt) {
    return fetch(URL0 + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + bt, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  function rpc(fn, args) { return call(fn, args, useGuest() ? KEY : (bearer() || KEY)); }
  function tokArg() { return useGuest() ? { p_token: gtoken() } : {}; }
  var css = document.createElement('style');
  css.textContent = '#bc-fab{position:fixed;bottom:18px;inset-inline-start:16px;z-index:9998;width:54px;height:54px;border-radius:50%;border:0;background:var(--brand,#0A8BE0);color:var(--on-brand,#fff);box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;display:flex;align-items:center;justify-content:center}' +
    '#bc-fab svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#bc-dot{position:absolute;top:-4px;inset-inline-end:-4px;background:#e5484d;color:#fff;border-radius:999px;font:700 11px sans-serif;padding:2px 6px}' +
    '#bc-p{position:fixed;bottom:84px;inset-inline-start:16px;z-index:9999;width:min(350px,calc(100vw - 32px));height:min(500px,calc(100vh - 110px));background:var(--surface,#fff);color:var(--ink,#0B1B2E);border:1px solid var(--line,#DAE6F0);border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden;font-family:inherit}' +
    '#bc-p[hidden]{display:none}#bc-h{background:var(--brand,#0A8BE0);color:var(--on-brand,#fff);padding:12px 14px;display:flex;justify-content:space-between;align-items:center;font-weight:700}#bc-x{background:none;border:0;color:inherit;font-size:20px;cursor:pointer;line-height:1}' +
    '#bc-tabs{display:flex;border-bottom:1px solid var(--line,#DAE6F0)}#bc-tabs button{flex:1;border:0;background:none;color:var(--muted,#536A82);padding:9px 6px;font:inherit;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;position:relative}#bc-tabs button.on{color:var(--brand,#0A8BE0);border-bottom-color:var(--brand,#0A8BE0)}#bc-td{position:absolute;top:4px;margin-inline-start:4px;background:#e5484d;color:#fff;border-radius:999px;font:700 10px sans-serif;padding:1px 5px}' +
    '.bc-m{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px}.bc-m[hidden]{display:none}.bc-b{max-width:84%;padding:7px 11px;border-radius:13px;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.bc-b.u{align-self:flex-start;background:var(--brand,#0A8BE0);color:var(--on-brand,#fff)}.bc-b.a{align-self:flex-end;background:var(--surface-2,#EBF3FB);color:var(--ink,#0B1B2E)}.bc-n{color:var(--muted,#536A82);font-size:13px;text-align:center;padding:6px}' +
    '#bc-q{display:flex;flex-wrap:wrap;gap:6px;padding:0 10px 6px}#bc-q button{border:1px solid var(--line,#DAE6F0);background:var(--surface,#fff);color:inherit;border-radius:99px;padding:5px 12px;font:inherit;font-size:13px;cursor:pointer}' +
    '#bc-g{display:grid;gap:6px;padding:8px 10px 0}#bc-g input,#bc-f textarea{font:inherit;padding:8px 10px;border-radius:10px;border:1px solid var(--line,#DAE6F0);background:var(--bg,#fff);color:inherit;min-width:0}#bc-f{display:flex;gap:6px;padding:10px}#bc-f textarea{flex:1;height:42px;resize:none}#bc-f button{border:0;border-radius:10px;background:var(--brand,#0A8BE0);color:var(--on-brand,#fff);padding:0 14px;font:inherit;font-weight:700;cursor:pointer}#bc-e{color:#e5484d;font-size:12px;padding:0 12px;min-height:0}';
  document.head.appendChild(css);
  var fab = document.createElement('button'); fab.id = 'bc-fab'; fab.type = 'button'; fab.setAttribute('aria-label', L.t);
  fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.3A8 8 0 1 1 21 12Z"/></svg><span id="bc-dot" hidden></span>';
  var p = document.createElement('div'); p.id = 'bc-p'; p.hidden = true; p.setAttribute('dir', ar ? 'rtl' : 'ltr');
  p.innerHTML = '<div id="bc-h"><span></span><button id="bc-x" type="button" aria-label="x">×</button></div><div id="bc-tabs"><button type="button" id="bc-tb"></button><button type="button" id="bc-th"></button></div><div id="bc-bm" class="bc-m"></div><div id="bc-m" class="bc-m" hidden></div><div id="bc-q"></div><div id="bc-g"><input id="bc-nm" maxlength="60" autocomplete="name"><input id="bc-tl" maxlength="20" inputmode="tel" dir="ltr" autocomplete="tel"></div><div id="bc-e"></div><form id="bc-f"><textarea id="bc-i" maxlength="1000"></textarea><button type="submit"></button></form>';
  function q(id) { return document.getElementById(id); }
  function mount() {
    document.body.appendChild(fab); document.body.appendChild(p);
    p.querySelector('#bc-h span').textContent = L.t; q('bc-tb').textContent = L.tb; q('bc-th').innerHTML = L.th + '<span id="bc-td" hidden></span>';
    q('bc-nm').placeholder = L.nm; q('bc-tl').placeholder = L.tel; q('bc-i').placeholder = L.ph; p.querySelector('#bc-f button').textContent = L.send;
    var g = ls('bareed-chat-guest'); if (g) { try { g = JSON.parse(g); q('bc-nm').value = g.n || ''; q('bc-tl').value = g.p || ''; } catch (e) {} }
    fab.addEventListener('click', function () { st.open ? close() : open(); });
    q('bc-x').addEventListener('click', close);
    q('bc-tb').addEventListener('click', function () { setMode('bot'); });
    q('bc-th').addEventListener('click', function () { setMode('human'); });
    q('bc-i').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); q('bc-f').requestSubmit(); } });
    q('bc-f').addEventListener('submit', send);
    gate(); setInterval(function () { gate(); if (!(st.open && st.mode === 'human')) peek(); }, 30000); peek();
  }
  function gate() { fab.style.display = (MODE === 'auth' && !bearer()) ? 'none' : 'flex'; }
  function bub(m) { var d = document.createElement('div'); d.className = 'bc-b ' + (m.sender === 'user' ? 'u' : 'a'); d.textContent = m.body; return d; }
  /* ---- bot ---- */
  function bsay(text, me) { var d = document.createElement('div'); d.className = 'bc-b ' + (me ? 'u' : 'a'); d.textContent = text; var b = q('bc-bm'); b.appendChild(d); b.scrollTop = b.scrollHeight; st.hist.push({ role: me ? 'user' : 'bot', text: text }); if (st.hist.length > 12) st.hist.shift(); return d; }
  function chips() { var c = q('bc-q'); c.innerHTML = ''; [['c_track', function () { bsay(L.c_track, true); bsay(L.askCode); st.await = 'track'; }], ['c_human', function () { setMode('human'); }]].forEach(function (x) { var b = document.createElement('button'); b.type = 'button'; b.textContent = L[x[0]]; b.onclick = x[1]; c.appendChild(b); }); }
  function track(code) {
    call('track_shipment', { p_code: code }, KEY).then(function (r) {
      if (!r.ok || !r.j) { bsay(L.nf); return; }
      bsay(r.j.code + '\n' + L.st + ': ' + (L.s[r.j.status] || r.j.status));
    }).catch(function () { bsay(L.bfail); });
  }
  function botSend(v) {
    bsay(v, true);
    var m = v.match(/BR-?[A-Za-z0-9]{6,10}/i);
    if (m) { st.await = null; track(m[0].toUpperCase().replace(/^BR(?!-)/, 'BR-')); return; }
    if (st.await === 'track' && /^[A-Za-z0-9-]{4,14}$/.test(v)) { st.await = null; track(v.toUpperCase()); return; }
    st.await = null;
    var tp = bsay('…', false); st.hist.pop();
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 20000), done = false;
    function fin(txt) { if (done) return; done = true; clearTimeout(tm); tp.textContent = txt; if (txt !== L.bfail) st.hist.push({ role: 'bot', text: txt }); q('bc-bm').scrollTop = q('bc-bm').scrollHeight; }
    fetch(URL0 + '/functions/v1/bareed-chat', { method: 'POST', signal: ctl ? ctl.signal : undefined, headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY }, body: JSON.stringify({ messages: st.hist.slice(-10) }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) { fin(d && d.reply ? String(d.reply).slice(0, 1200) : L.bfail); })
      .catch(function () { fin(L.bfail); });
  }
  /* ---- human ---- */
  function render(j, reset) {
    var box = q('bc-m'); if (reset) box.innerHTML = '';
    if (!st.tid && !box.children.length) { var n = document.createElement('div'); n.className = 'bc-n'; n.textContent = L.hi; n.id = 'bc-hi'; box.appendChild(n); }
    if (j.messages && j.messages.length) { var h = q('bc-hi'); if (h) h.remove(); var near = box.scrollHeight - box.scrollTop - box.clientHeight < 80; j.messages.forEach(function (m) { box.appendChild(bub(m)); st.last = m.id; }); if (near || reset) box.scrollTop = box.scrollHeight; }
    q('bc-g').style.display = (st.mode === 'human' && useGuest() && !st.tid) ? 'grid' : 'none';
  }
  function setDot(n) { st.unread = n; var d = q('bc-dot'), t = q('bc-td'); d.textContent = n; d.hidden = !n || (st.open && st.mode === 'human'); t.textContent = n; t.hidden = !n || (st.open && st.mode === 'human'); }
  function fetchMsgs(reset) {
    if (st.busy) return Promise.resolve(); st.busy = true;
    var live = st.open && st.mode === 'human';
    return rpc('support_my', Object.assign({ p_after: reset ? 0 : (live ? st.last : 9007199254740991), p_mark: live }, tokArg())).then(function (r) {
      st.busy = false; if (!r.ok) return;
      st.tid = r.j.thread_id; if (live) { render(r.j, reset); setDot(0); } else setDot(r.j.unread || 0);
    }).catch(function () { st.busy = false; });
  }
  function peek() { if (!(st.open && st.mode === 'human') && (MODE !== 'auth' || bearer())) fetchMsgs(false); }
  function setMode(m) {
    st.mode = m; var h = m === 'human';
    q('bc-bm').hidden = h; q('bc-m').hidden = !h; q('bc-q').style.display = h ? 'none' : 'flex';
    q('bc-tb').className = h ? '' : 'on'; q('bc-th').className = h ? 'on' : ''; q('bc-e').textContent = '';
    clearInterval(st.timer);
    if (h) { st.last = 0; q('bc-g').style.display = 'none'; fetchMsgs(true); st.timer = setInterval(function () { fetchMsgs(false); }, 4000); setDot(0); }
    else { q('bc-g').style.display = 'none'; }
    setTimeout(function () { q('bc-i').focus(); }, 50);
  }
  function open() {
    st.open = true; p.hidden = false;
    if (!st.started) { st.started = true; bsay(L.bhi, false); st.hist = []; chips(); }
    setMode(st.unread ? 'human' : st.mode);
  }
  function close() { st.open = false; p.hidden = true; clearInterval(st.timer); peek(); }
  function err(k) { q('bc-e').textContent = k ? L[k] : ''; }
  function send(e) {
    e.preventDefault(); var v = q('bc-i').value.trim(); if (!v) return; err('');
    if (st.mode === 'bot') { q('bc-i').value = ''; botSend(v); return; }
    var args = Object.assign({ p_body: v }, tokArg());
    if (useGuest()) { var nm = q('bc-nm').value.trim(), tl = q('bc-tl').value.replace(/[\s-]/g, ''); if (!st.tid && !/^01[0125][0-9]{8}$/.test(tl)) { err('e_phone'); return; } if (!st.tid) { args.p_name = nm; args.p_phone = tl; ls('bareed-chat-guest', JSON.stringify({ n: nm, p: tl })); } }
    rpc('support_send', args).then(function (r) {
      if (!r.ok) {
        var m = String((r.j && r.j.message) || '');
        if (MODE === 'auto' && !useGuest() && (m === 'no_profile' || (r.j && r.j.code === 'PGRST301') || /JWT/i.test(m))) { st.guest = true; st.tid = null; return fetchMsgs(true).then(function () { err('e_gen'); }); }
        err(m === 'rate_limited' ? 'e_rate' : m === 'name_required' ? 'e_name' : m === 'phone_required' ? 'e_phone' : 'e_gen'); return;
      }
      q('bc-i').value = ''; st.tid = r.j.thread_id || st.tid; if (useGuest()) ls('bareed-notify-offer', '1'); fetchMsgs(false);
    }).catch(function () { err('e_gen'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
