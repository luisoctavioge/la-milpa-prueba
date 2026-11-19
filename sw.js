/* La Milpa · service worker de la página publicada (no corre dentro del Artifact).
   Primero la red, para que cada actualización llegue; si no hay conexión, lo último guardado. */
const CACHE='milpa-prueba-v1';
const BASE=['./','index.html','motor.js','datos.json','prueba.js','milpa-maiz.js','milpa-render.js','manifest.webmanifest','iconos/180.png','iconos/192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASE)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const copia=res.clone();caches.open(CACHE).then(c=>c.put(r,copia));}return res;})
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));});
