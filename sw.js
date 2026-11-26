// Bareed service worker: network-first so new deploys always win; cached copy only when offline.
var C='bareed-v1';
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==C}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  if(r.mode!=='navigate'&&!/\.(png|webmanifest)$/.test(r.url))return;
  e.respondWith(fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)})}return res}).catch(function(){return caches.match(r)}));
});

// Web Push: show the notification and open the right page on tap.
self.addEventListener('push',function(e){
  var d={};try{d=e.data?e.data.json():{}}catch(x){d={body:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.title||'بريد',{body:d.body||'',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',dir:'rtl',lang:'ar',data:{url:d.url||'/'}}));
});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var u=new URL((e.notification.data&&e.notification.data.url)||'/',self.location.origin).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(l){
    for(var i=0;i<l.length;i++){var c=l[i];if(new URL(c.url).origin===self.location.origin&&'focus' in c){return c.focus().then(function(w){return w.navigate?w.navigate(u):w}).catch(function(){return self.clients.openWindow(u)})}}
    return self.clients.openWindow(u);
  }));
});
