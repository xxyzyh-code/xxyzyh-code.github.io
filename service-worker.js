// service-worker.js 緩存腳本

const CACHE_NAME = "music-cache-v1"; // <<< 關鍵：更新版本號就會自動刷新舊緩存
const AUDIO_FILES = [
  "https://cdn.jsdelivr.net/gh/xxyzyh-code/music@main/Alive%20in%20the%20summer%20time.m4a",
  "https://cdn.jsdelivr.net/gh/xxyzyh-code/music@main/Breakbeat%20background.m4a",
  "https://cdn.jsdelivr.net/gh/xxyzyh-code/music@main/The%20best%20moments%20in%20life.m4a",
  "https://cdn.jsdelivr.net/gh/xxyzyh-code/music@main/Time%20to%20travel.m4a",
  "https://cdn.jsdelivr.net/gh/xxyzyh-code/music@main/Elegance.m4a",
  "https://cdn.jsdelivr.net/gh/xxyzyh-code/music@main/The%20More%20I%20Know%20You.mp3",
  "https://cdn.jsdelivr.net/gh/xxyzyh-code/music@main/Jesus%20Walks%20With%20Me.mp3",
  "https://cdn.jsdelivr.net/gh/xxyzyh-code/music@main/Hallelujah%20Forevermore.mp3",
];

// 安裝 SW，預先緩存音樂
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 嘗試將所有列出的音頻檔案加入緩存
      return cache.addAll(AUDIO_FILES);
    })
  );
  // 讓新的 SW 立即接管，跳過等待舊 SW 關閉的階段
  self.skipWaiting();
});

// 激活 SW，清理舊版本緩存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          // 過濾掉當前版本的緩存名稱
          .filter((key) => key !== CACHE_NAME)
          // 刪除所有舊的緩存
          .map((key) => caches.delete(key))
      )
    )
  );
  // 讓這個新激活的 SW 立即控制所有客戶端 (頁面)
  self.clients.claim();
});

// 攔截 fetch 請求
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // 只攔截 AUDIO_FILES 列表中的音頻請求 (精準緩存)
  if (AUDIO_FILES.includes(requestUrl.href)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // 緩存命中，直接返回 (循環播放/離線播放)
          return cachedResponse;
        }

        // 緩存沒有，從網路下載並緩存 (首次播放/刷新)
        return fetch(event.request).then((response) => {
          // 檢查響應是否有效，防止緩存錯誤的響應
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
    );
  }
});
