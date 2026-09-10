// 个人工作台 Service Worker —— 离线可用
// 策略：页面导航 network-first（拿到新版本优先）；静态资源 stale-while-revalidate；
// 外部接口（行情/天气/GitHub/热榜）不缓存，直接走网络，由应用层自己做降级。

const CACHE = 'workbench-v10';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/util.js',
  './js/store.js',
  './js/github.js',
  './js/quotes.js',
  './js/charts.js',
  './js/excel.js',
  './js/views/ai.js',
  './js/views/dashboard.js',
  './js/views/ideas.js',
  './js/views/info.js',
  './js/views/learning.js',
  './js/views/ledger.js',
  './js/views/notes.js',
  './js/views/settings.js',
  './js/views/stocks.js',
  './js/views/todos.js',
  './js/views/work.js',
  './vendor/xlsx.full.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // 预缓存强制走网络（reload 跳过 HTTP 缓存），避免把 CDN 上的旧文件存进新版本缓存
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // 写操作（如 GitHub 同步）直接走网络

  const url = new URL(req.url);

  // 跨域接口（行情 qt.gtimg.cn / 天气 / GitHub API / 热榜）不拦截
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先，断网回退缓存的 index.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 同源静态资源：先出缓存，后台更新
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetching = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetching;
    })
  );
});
