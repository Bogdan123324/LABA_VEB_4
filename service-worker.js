const CACHE_PREFIX='pizzapoint-';
const CACHE_NAME=CACHE_PREFIX+'app-v3';
const ASSETS=[
  './','./index.html','./products.html','./product.html','./cart.html','./checkout.html',
  './orders.html','./favorites.html','./offline.html','./profile.html','./coming-soon.html',
  './delivery-map.html','./contacts.html','./team.html','./manifest.json',
  './assets/css/style.css','./assets/js/data.js','./assets/js/core.js','./assets/js/app.js',
  './assets/icons/brand.svg','./assets/icons/ui.svg','./assets/icons/icon-192.png','./assets/icons/icon-512.png',
  './assets/img/pizza-atlas.png','./assets/img/delivery-map.svg',
  './assets/img/team-1.svg','./assets/img/team-2.svg','./assets/img/team-3.svg','./assets/img/team-4.svg'
];
const absolute=path=>new URL(path,self.registration.scope).href;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS.map(absolute))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

// HTML загружается из сети, а при её отсутствии — из кеша.
// Параметры ?id= не создают отдельные копии одной и той же страницы.
async function navigation(request){
  const url=new URL(request.url);
  url.search='';
  if(url.pathname.endsWith('/'))url.pathname+='index.html';
  const key=new Request(url.href);
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request);
    if(response.ok)await cache.put(key,response.clone());
    else {const fallback=await cache.match(key);if(fallback)return fallback;}
    return response;
  }catch(_){
    return await cache.match(key)||await cache.match(absolute('./offline.html'))||new Response('Приложение ещё не сохранено для офлайн-доступа.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
}

async function asset(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request);
  if(cached)return cached;
  try{
    const response=await fetch(request);
    if(response.ok&&response.type!=='opaque')await cache.put(request,response.clone());
    return response;
  }catch(_){
    // Не подменяем отсутствующие картинки и JS файлом HTML.
    return new Response('',{status:504,statusText:'Offline'});
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(event.request.mode==='navigate'?navigation(event.request):asset(event.request));
});
