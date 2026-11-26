/* Bareed visit counter: one anonymous ping per page load (de-duplicated server-side per visitor/page/30 min). */
(function () {
  try {
    if (navigator.webdriver) return;
    var id = null; try { id = localStorage.getItem('bareed-vid'); } catch (e) {}
    if (!id) { id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); try { localStorage.setItem('bareed-vid', id); } catch (e) {} }
    var K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlia2tkanBna2tkbmlqYWZzdWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODkyNDksImV4cCI6MjExMDA2NTI0OX0.PJ-leYQkSNyKaCs_hnFiYdgUVkpQYyLo8eFKvSL40gU';
    fetch('https://ybkkdjpgkkdnijafsuai.supabase.co/rest/v1/rpc/track_visit', { method: 'POST', keepalive: true, headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_vid: id, p_path: location.pathname }) }).catch(function () {});
  } catch (e) {}
})();
