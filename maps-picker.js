/* Bareed: free map location picker (OpenStreetMap + Leaflet + Nominatim search). No API key, no billing.
 * Adds a "pick on map" button under an address input. The user searches, drags the pin or taps the map,
 * and the chosen location is attached to the address as a Google Maps link (free to open on any phone).
 *
 * Free-service etiquette (OSM usage policies): search runs on button/Enter only (never per keystroke),
 * and the public tile/search servers are meant for light use. If traffic grows, switch TILE_URL / SEARCH_URL
 * to a hosted provider with a free tier (MapTiler, LocationIQ, Geoapify...).
 */
(function () {
  'use strict';
  var LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  var LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  var TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  var SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
  var CAIRO = { lat: 30.0444, lng: 31.2357 };

  var en = (document.documentElement.lang || 'ar').slice(0, 2) === 'en';
  var T = en
    ? { btn: 'Pick location on map', done: 'Location pinned', change: 'Change', search: 'Search for a place or address', go: 'Search', mine: 'My location', ok: 'Confirm location', cancel: 'Cancel', load: 'Could not load the map. Check your connection and try again.', hint: 'Drag the pin or tap the map to fine-tune.', geo: 'Could not get your location.', none: 'No results. Try a nearby landmark or pin it on the map.', fail: 'Search failed. You can still tap the map to place the pin.' }
    : { btn: 'حدد الموقع على الخريطة', done: 'تم تحديد الموقع', change: 'تغيير', search: 'ابحث عن مكان أو عنوان', go: 'بحث', mine: 'موقعي الحالي', ok: 'تأكيد الموقع', cancel: 'إلغاء', load: 'تعذّر تحميل الخريطة. تأكد من الاتصال وجرّب تاني.', hint: 'اسحب الدبوس أو اضغط على الخريطة لضبط المكان.', geo: 'مقدرناش نجيب موقعك.', none: 'مفيش نتايج. جرّب علامة مميزة قريبة أو حدد المكان بالدبوس.', fail: 'البحث مشتغلش. تقدر تضغط على الخريطة وتحط الدبوس بإيدك.' };

  var loader = null;
  function loadLeaflet() {
    if (loader) return loader;
    loader = new Promise(function (res, rej) {
      if (window.L && window.L.map) return res();
      var c = document.createElement('link'); c.rel = 'stylesheet'; c.href = LEAFLET_CSS; document.head.appendChild(c);
      var s = document.createElement('script'); s.src = LEAFLET_JS; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { loader = null; rej(new Error('leaflet_load')); };
      document.head.appendChild(s);
    });
    return loader;
  }

  var modal = null, map = null, marker = null, current = null, onDone = null, searchSeq = 0;

  function el(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt) e.textContent = txt; return e; }

  var PIN = '<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg"><path d="M17 43C17 43 32 27.5 32 16.5 32 8 25.3 1.5 17 1.5S2 8 2 16.5C2 27.5 17 43 17 43Z" fill="#1A9CF0" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="16.5" r="5.5" fill="#fff"/></svg>';

  function build() {
    modal = el('div', 'position:fixed;inset:0;z-index:100000;background:rgba(7,27,51,.72);display:none;align-items:center;justify-content:center');
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.dir = en ? 'ltr' : 'rtl';
    var box = el('div', 'background:#fff;color:#0B2540;width:min(720px,100%);height:min(680px,100%);display:flex;flex-direction:column;overflow:hidden;font:500 14px/1.5 Alexandria,Rubik,system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif');
    if (window.innerWidth > 740) box.style.borderRadius = '18px';

    var top = el('div', 'padding:12px;display:flex;gap:8px;align-items:center;border-bottom:1px solid #D5E1EE;position:relative');
    var q = el('input', 'flex:1;min-width:0;padding:10px 12px;border:1px solid #D5E1EE;border-radius:10px;font:inherit;color:inherit;background:#fff');
    q.type = 'search'; q.placeholder = T.search; q.setAttribute('aria-label', T.search); q.maxLength = 150;
    var go = el('button', 'border:0;background:#1A9CF0;color:#fff;border-radius:10px;padding:10px 14px;font:inherit;font-weight:600;cursor:pointer', T.go);
    var mine = el('button', 'border:1px solid #D5E1EE;background:#fff;color:#0B2540;border-radius:10px;padding:10px 12px;font:inherit;cursor:pointer;white-space:nowrap', T.mine);
    go.type = mine.type = 'button';
    top.appendChild(q); top.appendChild(go); top.appendChild(mine);

    var list = el('div', 'display:none;max-height:38%;overflow:auto;border-bottom:1px solid #D5E1EE;background:#fff');
    var mapDiv = el('div', 'flex:1;min-height:0;background:#EEF4FA');
    var hint = el('div', 'padding:6px 12px;color:#5B7088;font-size:13px', T.hint);
    var bar = el('div', 'padding:12px;display:flex;gap:8px;border-top:1px solid #D5E1EE');
    var ok = el('button', 'flex:1;border:0;border-radius:12px;background:#1A9CF0;color:#fff;font:inherit;font-weight:600;padding:13px;cursor:pointer', T.ok);
    var no = el('button', 'border:1px solid #D5E1EE;background:#fff;color:#0B2540;border-radius:12px;font:inherit;padding:13px 18px;cursor:pointer', T.cancel);
    ok.type = no.type = 'button';
    bar.appendChild(ok); bar.appendChild(no);
    [top, list, mapDiv, hint, bar].forEach(function (n) { box.appendChild(n); });
    modal.appendChild(box); document.body.appendChild(modal);
    modal._p = { q: q, list: list, mapDiv: mapDiv };

    no.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.style.display !== 'none') close(); });
    ok.addEventListener('click', function () {
      if (!current) return;
      var r = { lat: current.lat, lng: current.lng, address: current.address || '' };
      close(); if (onDone) onDone(r);
    });
    mine.addEventListener('click', function () {
      if (!navigator.geolocation) { alert(T.geo); return; }
      navigator.geolocation.getCurrentPosition(function (p) {
        setPoint({ lat: p.coords.latitude, lng: p.coords.longitude }, '', 17);
      }, function () { alert(T.geo); }, { enableHighAccuracy: true, timeout: 10000 });
    });
    go.addEventListener('click', function () { search(q.value); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); search(q.value); } });
  }

  function setPoint(ll, address, zoom) {
    current = { lat: ll.lat, lng: ll.lng, address: address || '' };
    marker.setLatLng([ll.lat, ll.lng]);
    if (zoom) map.setView([ll.lat, ll.lng], zoom); else map.panTo([ll.lat, ll.lng]);
  }

  function msgRow(list, text) {
    list.innerHTML = ''; list.style.display = 'block';
    list.appendChild(el('div', 'padding:10px 14px;color:#5B7088', text));
  }

  function search(text) {
    var P = modal._p, list = P.list; text = (text || '').trim();
    if (text.length < 3) return;
    var my = ++searchSeq;
    var url = SEARCH_URL + '?format=jsonv2&limit=6&addressdetails=0&countrycodes=eg&accept-language=' + (en ? 'en' : 'ar') + '&q=' + encodeURIComponent(text);
    fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('http');
      return r.json();
    }).then(function (rows) {
      if (my !== searchSeq) return;
      if (!rows || !rows.length) { msgRow(list, T.none); return; }
      list.innerHTML = ''; list.style.display = 'block';
      rows.forEach(function (row) {
        var it = el('button', 'display:block;width:100%;text-align:start;border:0;border-bottom:1px solid #EEF4FA;background:#fff;color:inherit;font:inherit;padding:10px 14px;cursor:pointer', row.display_name);
        it.type = 'button';
        it.addEventListener('click', function () {
          list.style.display = 'none';
          setPoint({ lat: parseFloat(row.lat), lng: parseFloat(row.lon) }, row.display_name, 17);
        });
        list.appendChild(it);
      });
    }).catch(function () { if (my === searchSeq) msgRow(list, T.fail); });
  }

  async function open(start, cb) {
    onDone = cb;
    if (!modal) build();
    modal.style.display = 'flex';
    var P = modal._p; P.list.style.display = 'none';
    try {
      await loadLeaflet();
      if (!map) {
        map = L.map(P.mapDiv, { zoomControl: true, attributionControl: true }).setView([CAIRO.lat, CAIRO.lng], 11);
        L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(map);
        marker = L.marker([CAIRO.lat, CAIRO.lng], { draggable: true, icon: L.divIcon({ className: '', html: PIN, iconSize: [34, 44], iconAnchor: [17, 43] }) }).addTo(map);
        marker.on('dragend', function () { var p = marker.getLatLng(); current = { lat: p.lat, lng: p.lng, address: '' }; });
        map.on('click', function (e) { setPoint({ lat: e.latlng.lat, lng: e.latlng.lng }, ''); });
      }
      setTimeout(function () { map.invalidateSize(); }, 50);
      if (start) setPoint(start, '', 17);
      else { current = null; marker.setLatLng([CAIRO.lat, CAIRO.lng]); map.setView([CAIRO.lat, CAIRO.lng], 11); }
    } catch (e) {
      modal.style.display = 'none';
      alert(T.load);
    }
  }
  function close() { if (modal) modal.style.display = 'none'; }

  function link(lat, lng) { return 'https://www.google.com/maps/search/?api=1&query=' + lat.toFixed(6) + ',' + lng.toFixed(6); }

  var STATE = new WeakMap();

  function attach(input) {
    if (!input || STATE.has(input)) return;
    var st = { pt: null }, wasReq = input.required;
    STATE.set(input, st);
    var row = el('div', 'display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap');
    var btn = el('button', 'border:1px solid #1A9CF0;background:transparent;color:#1A9CF0;border-radius:10px;font:inherit;font-weight:600;padding:8px 14px;cursor:pointer', T.btn);
    btn.type = 'button';
    var chip = el('span', 'color:#1E8E5A;font-size:13px');
    chip.hidden = true;
    row.appendChild(btn); row.appendChild(chip);
    (input.parentNode || document.body).appendChild(row);

    function paint() {
      if (st.pt) { chip.hidden = false; chip.textContent = '✓ ' + T.done; btn.textContent = T.change; input.required = false; }
      else { chip.hidden = true; btn.textContent = T.btn; input.required = wasReq; }
    }
    btn.addEventListener('click', function () {
      open(st.pt, function (r) {
        st.pt = { lat: r.lat, lng: r.lng };
        if (r.address && !input.value.trim()) input.value = r.address.slice(0, 200);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        paint();
      });
    });
    if (input.form) input.form.addEventListener('reset', function () { st.pt = null; setTimeout(paint, 0); });
    input.addEventListener('bareed-maps-reset', paint);
  }

  /* The address text plus the Google Maps link (if a location was pinned), capped to the field's max length. */
  function value(input) {
    var st = STATE.get(input), v = input.value || '';
    if (!st || !st.pt) return v;
    if (!v.trim()) v = en ? 'Pinned location on map' : '📍 موقع محدد على الخريطة';
    var l = link(st.pt.lat, st.pt.lng), max = (input.maxLength > 0 ? input.maxLength : 300);
    return v.slice(0, Math.max(0, max - l.length - 1)).trim() + ' ' + l;
  }

  function reset(input) { var st = STATE.get(input); if (st) { st.pt = null; input.dispatchEvent(new Event('bareed-maps-reset')); } }

  window.BareedMaps = { attach: attach, value: value, reset: reset };

  // Auto-attach to the address fields of the order forms (script is loaded with defer, DOM is ready).
  ['o-pa', 'f-addr'].forEach(function (id) { var i = document.getElementById(id); if (i) attach(i); });
})();
