/* Bareed map helper (Leaflet + OpenStreetMap, free). BareedMap.picker(el, {onChange}) lets a user tap a start (A) and end (B) point and returns the road distance.
   BareedMap.view(el, a, b) shows a read-only route. Road distance from the public OSRM server, with a straight-line x1.3 fallback. */
(function () {
  var ar = (document.documentElement.lang || 'ar').slice(0, 2) !== 'en';
  var T = ar ? { a: 'بداية (من)', b: 'نهاية (إلى)', me: 'موقعي', go: 'بحث', ph: 'ابحث عن مكان أو عنوان', hint: 'اختار «بداية» أو «نهاية» ثم اضغط على الخريطة، أو اسحب العلامة.', km: 'المسافة تقريباً', unit: 'كم', est: '(تقدير)', nf: 'مقدرتش ألاقي المكان ده', gps: 'فعّل الموقع في المتصفح', reset: 'مسح' }
    : { a: 'Start (from)', b: 'End (to)', me: 'My location', go: 'Search', ph: 'Search a place or address', hint: 'Pick “Start” or “End”, then tap the map, or drag a marker.', km: 'Approx. distance', unit: 'km', est: '(estimate)', nf: 'Place not found', gps: 'Turn on location in the browser', reset: 'Clear' };
  var CENTER = [29.9, 31.25], loading = null;
  function load() {
    if (window.L) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'; document.head.appendChild(c);
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'; s.onload = function () { res(); }; s.onerror = function () { loading = null; rej(new Error('leaflet')); }; document.head.appendChild(s);
    });
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
  window.BareedMap = { picker: picker, view: view };
})();
