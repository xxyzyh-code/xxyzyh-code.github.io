// 簡單 hash 函數 (djb2)
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36); // 轉成 base36 字串
}

const MUSIC_YML = "/data/music.yml";
let CACHE_NAME = "music-cache-temp"; // 安裝時會改成自動版本號

// 安裝 SW
self.addEventListener("install", (event) => {
  event.waitUntil(
    fetch(MUSIC_YML)
      .then((res) => res.text())
      .then((text) => {
        // 抓取所有音樂 url
        const urls = [...text.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]);
        // 用 url 字串生成 hash 作為版本號
        CACHE_NAME = `music-cache-${hashString(urls.join("|"))}`;
        return caches.open(CACHE_NAME).then((cache) => cache.addAll(urls));
      })
      .catch((err) => console.error("SW 安裝時抓取音樂列表失敗:", err))
  );
  self.skipWaiting();
});

// 激活 SW，刪除舊緩存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 攔截 fetch 請求，自動從緩存返回
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((response) => {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("audio")) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return response;
      });
    })
  );
});
