// Tên và phiên bản của Cache
const CACHE_NAME = 'vku-survey-v1-capacitor';

// Danh sách các tài nguyên tĩnh cần Cache sẵn (App Shell)
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/db.js',
  './js/app.js',
  './js/sw-register.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Các CDN thư viện bên ngoài để ứng dụng giao diện hoạt động offline
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/dexie/dist/dexie.js'
];

// 1. Sự kiện INSTALL: Lưu trước các tài nguyên App Shell vào Cache API
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing SW...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching App Shell assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting()) // Kích hoạt SW mới ngay lập tức
  );
});

// 2. Sự kiện ACTIVATE: Dọn dẹp các phiên bản Cache cũ
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating SW...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Giành quyền kiểm soát tất cả tab đang mở
  );
});

// 3. Sự kiện FETCH: Can thiệp các truy vấn mạng (Chiến lược Cache-First)
self.addEventListener('fetch', (event) => {
  // Chỉ can thiệp các request GET (không can thiệp POST/PUT)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Nếu có trong Cache -> Trả về ngay lập tức (Cache-First)
      if (cachedResponse) {
        // Đồng thời âm thầm cập nhật cache ngầm từ mạng (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Bỏ qua lỗi mạng khi đang offline */});

        return cachedResponse;
      }

      // Nếu không có trong Cache -> Truy vấn mạng bình thường
      return fetch(event.request).then((networkResponse) => {
        // Kiểm tra dữ liệu phản hồi hợp lệ trước khi lưu thêm vào cache
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Trường hợp mất mạng và truy vấn trang HTML mới
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});