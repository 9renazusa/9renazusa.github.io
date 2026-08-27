const CACHE_NAME = 'tarot-pwa-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Service Workerのインストール
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching core files');
        // 画像ファイルも追加でキャッシュ（エラーは無視）
        const imageFiles = [];
        for (let i = 1; i <= 22; i++) {
          imageFiles.push(`./images/a${String(i).padStart(2, '0')}.jpg`);
        }
        
        // コアファイルをキャッシュ
        return cache.addAll(urlsToCache)
          .then(() => {
            // 画像は個別に追加（エラーがあっても続行）
            return Promise.all(
              imageFiles.map(url => 
                cache.add(url).catch(err => {
                  console.log('Failed to cache:', url);
                })
              )
            );
          });
      })
  );
  self.skipWaiting();
});

// Service Workerのアクティベーション
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// リクエストのインターセプト
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        
        // キャッシュになければネットワークから取得
        return fetch(event.request)
          .then(response => {
            // レスポンスが有効でない場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // ネットワークエラーの場合、フォールバック
            console.log('Fetch failed; returning offline page instead.');
          });
      })
  );
});
