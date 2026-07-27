var CN='duava-v2',FI=['index.html','app.js','manifest.json','icon-192.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CN).then(function(c){return c.addAll(FI)}))});
self.addEventListener('fetch',function(e){e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request)}))});