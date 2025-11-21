// service-worker.js
const AUDIO_CACHE_PREFIX = "music-cache-";
const MAX_AUDIO_CACHE_ITEMS = 50; // LRU/FIFO 控制音頻緩存
let AUDIO_CACHE_NAME = AUDIO_CACHE_PREFIX + "temp"; // 初始佔位，將在 install 時確定

const STATIC_CACHE_NAME = "static-cache-v1";
const AUDIO_YML = "/data/music.yml"; // 音頻列表文件路徑

// 簡單 hash 函數 (djb2)
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

// ------------------ 安裝 SW (優化: 合併 waitUntil) ------------------
self.addEventListener("install", (event) => {
  console.log("SW: 開始安裝...");

  event.waitUntil(
    Promise.all([
      // A. 音頻緩存：動態生成版本名並緩存所有音頻
      fetch(AUDIO_YML)
        .then((res) => res.text())
        .then((text) => {
          const urls = [...text.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]);
          // 根據 URL 列表生成唯一的緩存名稱
          AUDIO_CACHE_NAME = AUDIO_CACHE_PREFIX + hashString(urls.join("|"));
          
          console.log(`SW: 音頻緩存版本名: ${AUDIO_CACHE_NAME}`);
          return caches.open(AUDIO_CACHE_NAME).then((cache) => {
            console.log("SW: 正在緩存所有音頻資源...");
            return cache.addAll(urls); // 緩存所有音頻
          });
        })
        .catch((error) => {
          // music.yml 獲取或緩存失敗，創建空緩存，避免安裝失敗
          console.error("SW: 音頻緩存失敗或 music.yml 獲取失敗", error);
          // 使用初始佔位名稱
          return caches.open(AUDIO_CACHE_NAME);
        }),

      // B. 靜態資源緩存
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log("SW: 正在緩存靜態資源...");
        return cache.addAll([
          "/index.html",
          "/about/index.html",
          "/assets/css/style.css",
          "/assets/js/main.js",
          "/assets/images/blog-header.jpg",
          // 這裡可以根據需要添加更多關鍵文件
        ]);
      }),
    ])
    .then(() => {
        console.log("SW: 所有緩存任務完成！");
    })
    .catch((error) => {
        console.error("SW: 安裝過程中發生錯誤！", error);
    })
  );
  
  // 立即激活新的 Service Worker，避免用戶刷新頁面才能更新
  self.skipWaiting();
});

// ------------------ 激活 SW (優化: 清晰的鍵值過濾) ------------------
self.addEventListener("activate", (event) => {
  console.log("SW: 正在激活並清理舊緩存...");
  
  event.waitUntil(
    caches.keys().then((keys) => {
      // 刪除所有不是當前靜態緩存和當前音頻緩存的鍵
      return Promise.all(
        keys
          .filter(
            (key) => key !== AUDIO_CACHE_NAME && key !== STATIC_CACHE_NAME
          )
          .map((key) => {
            console.log(`SW: 正在刪除舊緩存: ${key}`);
            return caches.delete(key);
          })
      );
    })
  );
  // 讓當前 SW 立即控制所有客戶端（Tab）
  self.clients.claim();
});

// ------------------ 攔截 fetch (已修復 Response Clone 錯誤) ------------------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. 音頻文件 (Cache-First)
  // 此處邏輯正確，因為 res.clone() 發生在異步的 cache.put 內部，競爭風險較小
  if (req.destination === "audio") {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(AUDIO_CACHE_NAME).then((cache) => {
              cache.put(req, resClone).then(async () => {
                // LRU/FIFO 控制
                const keys = await cache.keys();
                if (keys.length > MAX_AUDIO_CACHE_ITEMS) {
                  cache.delete(keys[0]);
                }
              });
            });
          }
          return res;
        }).catch(async() => {
          console.log(`SW: 網路失敗，音頻資源 ${req.url} 回退至緩存。`);
          const cachedAudio = await caches.match(req); // 異步獲取緩存
          
          if (cachedAudio) return cachedAudio;

          // 必須返回一個 Response 對象！
          return new Response("網路或緩存失敗，音頻資源不可用。", {
              status: 503,
              statusText: "Service Unavailable"
          });
        });
      })
    );
    return;
  }

  // 2. HTML 文檔 (Stale-While-Revalidate) - 🎯 修復點：在返回前克隆
  if (req.destination === "document") {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            // 🚨 修復：在將原始響應返回給瀏覽器之前，先克隆一份用於緩存
            if (res && res.status === 200) {
              const resClone = res.clone(); // 創建副本
              caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return res; // 將原始響應返回給瀏覽器
          })
          .catch(() => {
            console.log(`SW: 網路失敗，HTML 文檔 ${req.url} 回退至緩存。`);
            return cached;
          });
          
        // 🌟 核心修正：確保當 cached 為 undefined 時，networkFetch 失敗後有後備響應
        return networkFetch.catch(() => {
            if (cached) return cached;
            
            // 必須返回一個 Response 對象！
            return new Response("網路或緩存失敗，頁面不可用。", {
                status: 503,
                statusText: "Service Unavailable"
            });
        });
      })
    );
    return;
  }

  // 3. CSS/JS/圖片 (Cache-First 或 Cache-Only) - 🎯 修復點：在返回前克隆
  if (["style", "script", "image"].includes(req.destination)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        return cached || fetch(req).then((res) => {
          // 🚨 修復：在將原始響應返回給瀏覽器之前，先克隆一份用於緩存
          if (res && res.status === 200) {
            const resClone = res.clone(); // 創建副本
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res; // 將原始響應返回給瀏覽器
        }).catch(() => {
           console.log(`SW: 網路失敗，靜態資源 ${req.url} 回退至緩存。`);
           // 🌟 核心修正：如果網路和緩存都失敗，返回一個 404/錯誤響應，而不是 undefined
           if (cached) return cached;
           
           // 必須返回一個 Response 對象！
           return new Response("網路或緩存失敗，資源不可用。", {
               status: 503,
               statusText: "Service Unavailable"
           });
        });
      })
    );
    return;
  }

  // fallback: 對於未分類資源，直接 fetch，避免 SW 拋錯
  event.respondWith(
    fetch(req).catch(() => {
      console.warn(`SW: 無法處理資源 ${req.url}，返回空 Response`);
      return new Response("Service Worker 無法提供資源。", {
        status: 503,
        statusText: "Service Unavailable"
      });
    })
  );
}); // <-- 正確關閉 fetch 監聽器
