/* Bareed map helper (Leaflet + OpenStreetMap, free). BareedMap.picker(el, {onChange}) lets a user tap a start (A) and end (B) point and returns the road distance.
   BareedMap.view(el, a, b) shows a read-only route. Road distance from the public OSRM server, with a straight-line x1.3 fallback. */
(function () {
  var ar = (document.documentElement.lang || 'ar').slice(0, 2) !== 'en';
  var T = ar ? { a: 'بداية (من)', b: 'نهاية (إلى)', me: 'موقعي', go: 'بحث', ph: 'ابحث عن مكان أو عنوان', hint: 'اختار «بداية» أو «نهاية» ثم اضغط على الخريطة، أو اسحب العلامة.', km: 'المسافة تقريباً', unit: 'كم', est: '(تقدير)', nf: 'مقدرتش ألاقي المكان ده', gps: 'فعّل الموقع في المتصفح', reset: 'مسح' }
    : { a: 'Start (from)', b: 'End (to)', me: 'My location', go: 'Search', ph: 'Search a place or address', hint: 'Pick “Start” or “End”, then tap the map, or drag a marker.', km: 'Approx. distance', unit: 'km', est: '(estimate)', nf: 'Place not found', gps: 'Turn on location in the browser', reset: 'Clear' };
  var CENTER = [29.9, 31.25], loading = null;
  var CDNS = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/', 'https://unpkg.com/leaflet@1.9.4/dist/', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/'];
  function tryCdn(i) {
    return new Promise(function (res, rej) {
      if (i >= CDNS.length) return rej(new Error('leaflet'));
      var c = document.createElement('link'); c.rel = 'stylesheet'; c.href = CDNS[i] + 'leaflet.css'; document.head.appendChild(c);
      var s = document.createElement('script'), done = false;
      var tm = setTimeout(function () { if (done) return; done = true; s.remove(); res(tryCdn(i + 1)); }, 9000);
      s.src = CDNS[i] + 'leaflet.js';
      s.onload = function () { if (done) return; done = true; clearTimeout(tm); res(); };
      s.onerror = function () { if (done) return; done = true; clearTimeout(tm); res(tryCdn(i + 1)); };
      document.head.appendChild(s);
    });
  }
  function load() {
    if (window.L) return Promise.resolve();
    if (loading) return loading;
    loading = tryCdn(0).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  function hav(a, b) { var R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lng - a.lng) * r, x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) * Math.sin(dn / 2); return R * 2 * Math.asin(Math.sqrt(x)); }
  var RC = {};
  function route(a, b) {
    var ck = a.lat + ',' + a.lng + ';' + b.lat + ',' + b.lng; if (RC[ck]) return Promise.resolve(RC[ck]);
    return route0(a, b).then(function (r) { if (!r.est) RC[ck] = r; return r; });
  }
  function route0(a, b) {
    var fb = { km: Math.round(hav(a, b) * 1.3 * 10) / 10, line: null, est: true };
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch('https://router.project-osrm.org/route/v1/driving/' + a.lng + ',' + a.lat + ';' + b.lng + ',' + b.lat + '?overview=full&geometries=geojson', { signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(tm); var rt = j && j.routes && j.routes[0]; if (!rt) return fb; return { km: Math.round(rt.distance / 100) / 10, line: rt.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }), est: false }; })
      .catch(function () { clearTimeout(tm); return fb; });
  }
  function icon(ch, col) { return L.divIcon({ className: '', html: '<div style="width:28px;height:28px;border-radius:50%;background:' + col + ';color:#fff;font:700 14px sans-serif;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)">' + ch + '</div>', iconSize: [28, 28], iconAnchor: [14, 14] }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function picker(el, opts) {
    opts = opts || {};
    el.innerHTML = '<div class="bm-bar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">' +
      '<button type="button" class="bm-ma" style="flex:1;min-width:110px"></button><button type="button" class="bm-mb" style="flex:1;min-width:110px"></button>' +
      '<button type="button" class="bm-me"></button></div>' +
      '<div style="display:flex;gap:6px;margin-bottom:6px"><input class="bm-q" style="flex:1;min-width:0" maxlength="120"><button type="button" class="bm-go"></button></div>' +
      '<div class="bm-map" style="height:260px;border-radius:12px;overflow:hidden;border:1px solid var(--line,#DAE6F0)"></div>' +
      '<div class="bm-info" style="margin-top:6px;font-size:13px"></div>';
    var q = function (c) { return el.querySelector(c); }, st = { a: null, b: null, mode: 'a', km: null, line: null, est: false }, map, ma, mb, pl, seq = 0;
    q('.bm-ma').textContent = 'A · ' + T.a; q('.bm-mb').textContent = 'B · ' + T.b; q('.bm-me').textContent = '📍 ' + T.me; q('.bm-q').placeholder = T.ph; q('.bm-go').textContent = T.go;
    q('.bm-info').textContent = T.hint;
    function paintMode() { q('.bm-ma').style.fontWeight = st.mode === 'a' ? '700' : '400'; q('.bm-mb').style.fontWeight = st.mode === 'b' ? '700' : '400'; q('.bm-ma').style.outline = st.mode === 'a' ? '2px solid #0A8BE0' : ''; q('.bm-mb').style.outline = st.mode === 'b' ? '2px solid #E5484D' : ''; }
    function emit() { if (opts.onChange) opts.onChange(st.a && st.b ? { a: st.a, b: st.b, km: st.km, est: st.est } : { a: st.a, b: st.b, km: null }); }
    function recalc() {
      if (pl) { map.removeLayer(pl); pl = null; }
      if (!(st.a && st.b)) { st.km = null; q('.bm-info').textContent = T.hint; emit(); return; }
      var my = ++seq; q('.bm-info').textContent = '…';
      route(st.a, st.b).then(function (r) {
        if (my !== seq) return; st.km = r.km; st.est = r.est;
        if (r.line) { pl = L.polyline(r.line, { color: '#0A8BE0', weight: 5, opacity: .8 }).addTo(map); map.fitBounds(pl.getBounds(), { padding: [30, 30] }); } else map.fitBounds([[st.a.lat, st.a.lng], [st.b.lat, st.b.lng]], { padding: [30, 30] });
        q('.bm-info').innerHTML = '<b>' + T.km + ': ' + esc(r.km) + ' ' + T.unit + '</b> ' + (r.est ? T.est : ''); emit();
      });
    }
    function put(which, lat, lng, noRecalc) {
      var p = { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
      st[which] = p;
      var mk = which === 'a' ? ma : mb;
      if (mk) mk.setLatLng([p.lat, p.lng]);
      else { mk = L.marker([p.lat, p.lng], { draggable: true, icon: icon(which.toUpperCase(), which === 'a' ? '#0A8BE0' : '#E5484D') }).addTo(map); mk.on('dragend', function () { var ll = mk.getLatLng(); put(which, ll.lat, ll.lng); }); if (which === 'a') ma = mk; else mb = mk; }
      if (!noRecalc) recalc();
    }
    function setPoint(lat, lng) { put(st.mode, lat, lng); if (st.mode === 'a' && !st.b) { st.mode = 'b'; paintMode(); } }
    load().then(function () {
      map = L.map(q('.bm-map'), { zoomControl: true }).setView(CENTER, 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      map.on('click', function (e) { setPoint(e.latlng.lat, e.latlng.lng); });
      setTimeout(function () { map.invalidateSize(); }, 200);
    }).catch(function () { q('.bm-map').textContent = 'Map unavailable'; });
    q('.bm-ma').onclick = function () { st.mode = 'a'; paintMode(); };
    q('.bm-mb').onclick = function () { st.mode = 'b'; paintMode(); };
    q('.bm-me').onclick = function () {
      if (!navigator.geolocation || !map) { q('.bm-info').textContent = T.gps; return; }
      navigator.geolocation.getCurrentPosition(function (p) { map.setView([p.coords.latitude, p.coords.longitude], 15); setPoint(p.coords.latitude, p.coords.longitude); }, function () { q('.bm-info').textContent = T.gps; }, { enableHighAccuracy: true, timeout: 8000 });
    };
    function search() {
      var v = q('.bm-q').value.trim(); if (!v || !map) return;
      fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=eg&accept-language=ar&q=' + encodeURIComponent(v + ' مصر'))
        .then(function (r) { return r.json(); }).then(function (j) { if (j && j[0]) { map.setView([+j[0].lat, +j[0].lon], 16); setPoint(+j[0].lat, +j[0].lon); } else q('.bm-info').textContent = T.nf; })
        .catch(function () { q('.bm-info').textContent = T.nf; });
    }
    q('.bm-go').onclick = search; q('.bm-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); search(); } });
    paintMode();
    return { get: function () { return st.a && st.b ? { a: st.a, b: st.b, km: st.km } : null; } };
  }

  function view(el, a, b, km, o) {
    o = o || {}; var H = o.height || 300;
    el.innerHTML = '<div class="bm-map" style="height:' + H + 'px;border-radius:12px;overflow:hidden;border:1px solid var(--line,#DAE6F0)"></div><div class="bm-info" style="margin-top:6px;font-size:13px"></div>';
    load().then(function () {
      var map = L.map(el.querySelector('.bm-map'), o.static ? { dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, zoomControl: false, attributionControl: false } : {}).setView([a.lat, a.lng], 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      L.marker([a.lat, a.lng], { icon: icon('A', '#0A8BE0') }).addTo(map); L.marker([b.lat, b.lng], { icon: icon('B', '#E5484D') }).addTo(map);
      map.fitBounds([[a.lat, a.lng], [b.lat, b.lng]], { padding: [30, 30] }); setTimeout(function () { map.invalidateSize(); }, 200);
      route(a, b).then(function (r) { if (r.line) { var pl = L.polyline(r.line, { color: '#0A8BE0', weight: 5, opacity: .8 }).addTo(map); map.fitBounds(pl.getBounds(), { padding: [30, 30] }); } el.querySelector('.bm-info').innerHTML = '<b>' + T.km + ': ' + esc(r.km) + ' ' + T.unit + '</b> ' + (r.est ? T.est : ''); });
    }).catch(function () { el.querySelector('.bm-map').textContent = 'Map unavailable'; });
  }

  /* Full-screen, Uber-style picker: search on top, fixed pin in the centre, move the map under it, confirm A then B. */
  function pickFull(opts) {
    opts = opts || {};
    var X = ar ? { t: 'حدد على الخريطة', ta: 'نقطة الاستلام (من)', tb: 'نقطة التسليم (إلى)', ca: 'تأكيد نقطة الاستلام', cb: 'تأكيد نقطة التسليم', done: 'تم ✓', ea: 'تعديل الاستلام', eb: 'تعديل التسليم', ph: 'ابحث عن مكان، أو الصق رابط جوجل ماب…', me: '📍 موقعي', hint: 'حرّك الخريطة وخلّي الدبوس على المكان بالظبط', load: 'جاري تحميل الخريطة…', fail: 'الخريطة مفتحتش. اتأكد من النت.', retry: 'حاول تاني', sf: 'البحث مش شغال دلوقتي، حرّك الخريطة بإيدك.', nf: 'مفيش نتايج، جرّب كلمة تانية.', route: 'جاري حساب المسافة…', srch: 'جاري البحث…' }
      : { t: 'Set on map', ta: 'Pickup point (from)', tb: 'Drop-off point (to)', ca: 'Confirm pickup', cb: 'Confirm drop-off', done: 'Done ✓', ea: 'Edit pickup', eb: 'Edit drop-off', ph: 'Search a street or place…', me: '📍 My location', hint: 'Move the map so the pin is exactly on the spot', load: 'Loading map…', fail: 'Map did not load. Check your connection.', retry: 'Retry', sf: 'Search is unavailable, move the map by hand.', nf: 'No results, try another word.', route: 'Calculating distance…', srch: 'Searching…' };
    if (opts.single) { X.ta = ar ? 'حدد المكان' : 'Set the place'; X.ca = ar ? 'تأكيد المكان' : 'Confirm place'; }
    var v = opts.value || {}, st = { a: v.a || null, b: v.b || null, km: v.km || null, step: v.a && v.b ? 'review' : (v.a ? 'b' : 'a') };
    var ov = document.createElement('div');
    ov.setAttribute('dir', ar ? 'rtl' : 'ltr');
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#fff;color:#0B1B2B;display:flex;flex-direction:column;font-family:inherit';
    ov.innerHTML = '<style>.pf-q{background:#fff!important;color:#0B1B2B!important;-webkit-text-fill-color:#0B1B2B!important;color-scheme:light;opacity:1!important}.pf-q::placeholder{color:#6B7C8C!important;-webkit-text-fill-color:#6B7C8C!important;opacity:1}</style><div style="padding:10px 12px;display:flex;gap:8px;align-items:center;border-bottom:1px solid #DAE6F0"><button type="button" class="pf-x" style="width:40px;height:40px;border-radius:12px;border:1px solid #DAE6F0;background:#fff;font-size:20px;cursor:pointer">×</button><b class="pf-t" style="flex:1;font-size:16px"></b></div>' +
      '<div style="padding:8px 12px;position:relative"><div style="display:flex;gap:6px"><input class="pf-q" style="flex:1;min-width:0;height:44px;border-radius:12px;border:1px solid #DAE6F0;padding:0 12px;font:inherit;font-size:16px" maxlength="120" autocomplete="off"><button type="button" class="pf-go" style="height:44px;padding:0 14px;border-radius:12px;border:0;background:#0A8BE0;color:#fff;font:inherit;cursor:pointer">🔍</button></div><div class="pf-res" style="display:none;position:absolute;left:12px;right:12px;top:56px;z-index:1000;background:#fff;border:1px solid #DAE6F0;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);max-height:220px;overflow:auto"></div></div>' +
      '<div style="flex:1;position:relative;min-height:0"><div class="pf-map" style="position:absolute;inset:0"></div><div class="pf-pin" style="position:absolute;left:50%;top:50%;width:0;height:0;z-index:600;pointer-events:none"><div class="pf-pc" style="position:absolute;left:-18px;top:-46px;width:36px;height:46px;display:flex;flex-direction:column;align-items:center"><div class="pf-pl" style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0A8BE0;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.4)"></div></div><div style="position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:rgba(0,0,0,.35)"></div></div><div class="pf-msg" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:#fff;z-index:700;text-align:center;padding:20px"></div></div>' +
      '<div style="padding:10px 12px 14px;border-top:1px solid #DAE6F0;background:#fff"><div class="pf-info" style="font-size:14px;margin-bottom:8px;min-height:20px"></div><div class="pf-btns" style="display:flex;gap:8px;flex-wrap:wrap"></div></div>';
    document.body.appendChild(ov);
    var prevOv = document.body.style.overflow; document.body.style.overflow = 'hidden';
    var q = function (c) { return ov.querySelector(c); }, map = null, mA = null, mB = null, line = null, seq = 0;
    q('.pf-q').placeholder = X.ph;
    function btn(txt, main, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.style.cssText = 'height:46px;border-radius:12px;font:inherit;font-weight:700;cursor:pointer;padding:0 16px;' + (main ? 'flex:1;min-width:140px;border:0;background:#0A8BE0;color:#fff' : 'border:1px solid #DAE6F0;background:#fff;color:#0B1B2B'); b.onclick = fn; return b; }
    function close() { document.body.style.overflow = prevOv; if (map) { try { map.remove(); } catch (e) {} } ov.remove(); }
    q('.pf-x').onclick = close;
    function ui() {
      var bt = q('.pf-btns'); bt.innerHTML = '';
      var pin = q('.pf-pin'), pl = q('.pf-pl');
      if (st.step === 'review') {
        pin.style.display = 'none';
        q('.pf-t').textContent = X.t;
        q('.pf-info').innerHTML = st.km != null ? '<b>' + esc(T.km) + ': ' + esc(st.km) + ' ' + T.unit + '</b> ' + (st.est ? T.est : '') : X.route;
        bt.appendChild(btn(X.ea, false, function () { st.step = 'a'; ui(); focus(st.a); }));
        bt.appendChild(btn(X.eb, false, function () { st.step = 'b'; ui(); focus(st.b); }));
        var d = btn(X.done, true, function () { if (opts.onDone) opts.onDone({ a: st.a, b: st.b, km: st.km, est: st.est }); close(); });
        bt.appendChild(d);
      } else {
        pin.style.display = '';
        pl.style.background = st.step === 'a' ? '#0A8BE0' : '#E5484D';
        q('.pf-t').textContent = st.step === 'a' ? X.ta : X.tb;
        q('.pf-info').textContent = X.hint;
        bt.appendChild(btn(X.me, false, gps));
        bt.appendChild(btn(st.step === 'a' ? X.ca : X.cb, true, confirm));
      }
      paint();
    }
    function focus(p) { if (map && p) map.setView([p.lat, p.lng], 16); }
    function paint() {
      if (!map) return;
      if (st.a) { if (mA) mA.setLatLng([st.a.lat, st.a.lng]); else mA = L.marker([st.a.lat, st.a.lng], { icon: icon('A', '#0A8BE0'), interactive: false }).addTo(map); }
      if (st.b) { if (mB) mB.setLatLng([st.b.lat, st.b.lng]); else mB = L.marker([st.b.lat, st.b.lng], { icon: icon('B', '#E5484D'), interactive: false }).addTo(map); }
      if (st.step !== 'review' && line) { map.removeLayer(line); line = null; }
    }
    function center() { var c = map.getCenter(); return { lat: Math.round(c.lat * 1e6) / 1e6, lng: Math.round(c.lng * 1e6) / 1e6 }; }
    function confirm() {
      var p = center();
      if (opts.single) { if (opts.onDone) opts.onDone({ a: p }); close(); return; }
      if (st.step === 'a') { st.a = p; st.km = null; if (st.b) { st.step = 'review'; calc(); } else { st.step = 'b'; } }
      else { st.b = p; st.km = null; st.step = 'review'; calc(); }
      ui();
      if (st.step === 'b' && map) { if (!st.b) map.setView([p.lat + 0.004, p.lng + 0.004], map.getZoom()); else focus(st.b); }
    }
    function calc() {
      var my = ++seq; st.km = null;
      route(st.a, st.b).then(function (r) {
        if (my !== seq) return; st.km = r.km; st.est = r.est;
        if (map) { if (line) map.removeLayer(line); if (r.line) { line = L.polyline(r.line, { color: '#0A8BE0', weight: 5, opacity: .85 }).addTo(map); map.fitBounds(line.getBounds(), { padding: [50, 50] }); } else map.fitBounds([[st.a.lat, st.a.lng], [st.b.lat, st.b.lng]], { padding: [50, 50] }); }
        if (st.step === 'review') ui();
      });
    }
    function gps() {
      if (!navigator.geolocation) { q('.pf-info').textContent = T.gps; return; }
      navigator.geolocation.getCurrentPosition(function (p) { if (map) map.setView([p.coords.latitude, p.coords.longitude], 17); }, function () { q('.pf-info').textContent = T.gps; }, { enableHighAccuracy: true, timeout: 10000 });
    }
    function showRes(list, msg) {
      var r = q('.pf-res'); r.innerHTML = '';
      if (!list) { r.style.display = 'none'; return; }
      r.style.display = 'block';
      if (!list.length) { r.innerHTML = '<div style="padding:12px;font-size:14px">' + esc(msg || X.nf) + '</div>'; return; }
      list.forEach(function (it) {
        var d = document.createElement('div'); d.style.cssText = 'padding:11px 12px;border-bottom:1px solid #EEF3F8;font-size:14px;cursor:pointer'; d.textContent = it.display_name;
        d.onclick = function () { showRes(null); if (map) map.setView([+it.lat, +it.lon], 17); };
        r.appendChild(d);
      });
    }
    function getJ(url) {
      var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
      return fetch(url, { signal: ctl ? ctl.signal : undefined }).then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error('http'); return r.json(); }).catch(function (e) { clearTimeout(tm); throw e; });
    }
    function nom(v) { return getJ('https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=eg&accept-language=ar&viewbox=31.0,30.1,31.5,29.7&q=' + encodeURIComponent(v)); }
    function pho(v) {
      return getJ('https://photon.komoot.io/api/?limit=6&lat=29.9&lon=31.25&q=' + encodeURIComponent(v)).then(function (j) {
        return ((j && j.features) || []).filter(function (f) { var c = f.properties && f.properties.countrycode; return !c || c === 'EG'; }).map(function (f) { var p = f.properties || {}; return { display_name: [p.name, p.street, p.district, p.city || p.county, p.state].filter(Boolean).join('، '), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }; });
      });
    }
    var sTok = 0;
    function gl(v) {
      if (!/google\.[a-z.]+\/maps|maps\.google|goo\.gl/i.test(v) && !/^\s*-?\d{1,2}\.\d+\s*,\s*-?\d{1,3}\.\d+\s*$/.test(v)) return null;
      var m = v.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || v.match(/[?&](?:q|ll|query|destination)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/) || v.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || v.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
      return m ? { lat: +m[1], lng: +m[2] } : null;
    }
    function search() {
      var val = q('.pf-q').value.trim(); if (!val || !map) return;
      var lk = gl(val); if (lk) { showRes(null); map.setView([lk.lat, lk.lng], 17); return; }
      var my = ++sTok, r0 = q('.pf-res'); r0.style.display = 'block'; r0.innerHTML = '<div style="padding:12px;font-size:14px">' + esc(X.srch) + '</div>';
      var anyOk = false;
      function step(fn) { return fn().then(function (l) { anyOk = true; return l; }).catch(function () { return []; }); }
      var own = function () { return opts.places ? Promise.resolve(opts.places(val)).then(function (l) { return (l || []).map(function (x) { return { display_name: '⭐ ' + x.name, lat: x.lat, lon: x.lng }; }); }).catch(function () { return []; }) : Promise.resolve([]); };
      own().then(function (k) { return step(function () { return nom(val); }).then(function (l) { return k.concat(l); }); })
        .then(function (l) { return l.length ? l : step(function () { return nom(val + ' الحوامدية'); }); })
        .then(function (l) { return l.length ? l : step(function () { return pho(val); }); })
        .then(function (l) { if (my !== sTok) return; showRes(l, anyOk ? X.nf : X.sf); });
    }
    var dbT = 0; q('.pf-q').addEventListener('input', function () { clearTimeout(dbT); if (q('.pf-q').value.trim().length < 3) return; dbT = setTimeout(search, 900); });
    q('.pf-go').onclick = search;
    q('.pf-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); search(); } });
    function boot() {
      var m = q('.pf-msg'); m.style.display = 'flex'; m.innerHTML = '<div style="font-size:15px"></div>'; m.firstChild.textContent = X.load;
      load().then(function () {
        m.style.display = 'none';
        var c0 = st.a || CENTER;
        map = L.map(q('.pf-map'), { zoomControl: false, attributionControl: false }).setView(Array.isArray(c0) ? c0 : [c0.lat, c0.lng], st.a ? 16 : 14);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        L.control.zoom({ position: ar ? 'bottomleft' : 'bottomright' }).addTo(map);
        map.on('movestart', function () { showRes(null); });
        setTimeout(function () { map.invalidateSize(); }, 100); setTimeout(function () { map.invalidateSize(); }, 400);
        ui(); if (st.step === 'review') { if (st.km == null) calc(); else if (st.a && st.b) calc(); }
      }).catch(function () {
        m.innerHTML = '<div style="font-size:15px"></div>'; m.firstChild.textContent = X.fail;
        m.appendChild(btn(X.retry, true, boot));
      });
    }
    ui(); boot();
  }
  window.BareedMap = { picker: picker, view: view, pickFull: pickFull };
})();
