/* ============================================================================
   Service Worker — تسريع الفتح + العمل مع النت الضعيف
   - لا يتدخل أبدًا في طلبات Supabase (تسجيل الدخول/البيانات/الملفات) ولا POST ولا Range.
   - ملفات الموقع نفسه: الشبكة أولًا مع مهلة قصيرة، ولو النت بطيء يفتح من الكاش فورًا.
   - المكتبات الخارجية والخطوط والصور: من الكاش فورًا ثم تتحدّث في الخلفية.
   ========================================================================== */
const VERSION = 'v3';
const SHELL_CACHE = 'sir-shell-' + VERSION;   // ملفات الموقع
const LIB_CACHE   = 'sir-lib-' + VERSION;     // مكتبات/خطوط خارجية
const NETWORK_TIMEOUT = 2500;                 // مهلة الانتظار قبل الفتح من الكاش (مللي ثانية)

const SHELL = [
  './', './index.html', './2.html', './1.png', './manifest.webmanifest',
  './app/index.html', './app/theme-common.js', './app/theme-system.js',
  './app/themes/theme-1.js', './midad-round5.js',
  './app/interactive-dragon.html', './app/interactive-dragon.css',
  './app/interactive-dragon.js', './app/interactive-dragon-runtime.js'
];

const LIBS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js',
  'https://cdn.jsdelivr.net/npm/gsap@3/dist/Draggable.min.js',
  'https://cdn.jsdelivr.net/npm/gsap@3/dist/MorphSVGPlugin.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Outfit:wght@300;400;500;600;700&display=swap'
];

const LIB_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com',
  'fonts.googleapis.com', 'fonts.gstatic.com', 'assets.codepen.io'];

const cacheable = res => res && (res.ok || res.type === 'opaque');

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    const lib = await caches.open(LIB_CACHE);
    // كل ملف لوحده: فشل ملف واحد لا يمنع تثبيت الباقي
    await Promise.allSettled([
      ...SHELL.map(u => shell.add(new Request(u, { cache: 'reload' }))),
      ...LIBS.map(u => lib.add(new Request(u, { mode: 'cors', credentials: 'omit' })))
    ]);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, LIB_CACHE];
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// كاش فورًا + تحديث في الخلفية
function staleWhileRevalidate(event, req, cacheName) {
  return caches.open(cacheName).then(cache =>
    cache.match(req).then(cached => {
      const update = fetch(req).then(res => {
        if (cacheable(res)) cache.put(req, res.clone()).catch(() => {});
        return res;
      }).catch(() => null);
      if (cached) { event.waitUntil(update); return cached; }
      return update.then(res => res || Response.error());
    })
  );
}

// الشبكة أولًا؛ لو اتأخرت أكتر من المهلة يرجع الكاش (والتحديث يكمل في الخلفية)
function networkFirstWithTimeout(event, req, cacheName) {
  const lookup = () => caches.open(cacheName).then(c => c.match(req, { ignoreSearch: true }));
  const network = fetch(req).then(res => {
    if (cacheable(res) && res.status === 200) {
      const copy = res.clone();
      caches.open(cacheName).then(c => c.put(req, copy)).catch(() => {});
    }
    return res;
  });
  event.waitUntil(network.catch(() => {}));
  return new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done) { done = true; clearTimeout(timer); resolve(r); } };
    const timer = setTimeout(() => {
      lookup().then(c => { if (c) finish(c); }).catch(() => {});
    }, NETWORK_TIMEOUT);
    network.then(finish, async () => {
      let c = null;
      try { c = await lookup(); } catch (_) {}
      if (!c && req.mode === 'navigate') { try { c = await caches.match('./index.html'); } catch (_) {} }
      finish(c || Response.error());
    });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;                 // فيديو/صوت/ملفات كبيرة: مباشرة من الشبكة
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return; // لا تتدخل في الـAPI

  // مكتبات وخطوط خارجية
  if (LIB_HOSTS.includes(url.hostname)) {
    if (/\.mp3($|\?)/i.test(url.pathname)) return;
    event.respondWith(staleWhileRevalidate(event, req, LIB_CACHE));
    return;
  }

  // ملفات الموقع نفسه فقط
  if (url.origin !== self.location.origin) return;

  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, req, SHELL_CACHE));
    return;
  }
  event.respondWith(networkFirstWithTimeout(event, req, SHELL_CACHE));
});
