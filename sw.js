const C="pplgym-v02"; // <-- Изменили версию!
const F=["./","./index.html","./style.css","./app.js","./manifest.json","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener("activate",e=>e.waitUntil(
  caches.keys().then(keys => Promise.all(
    keys.map(k => { if(k !== C) return caches.delete(k); })
  ))
));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
