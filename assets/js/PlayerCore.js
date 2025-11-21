// AudioEngine.js
// 核心音頻播放引擎：專職負責 CDN 備援、錯誤處理和防範競態條件（Race Condition）

let globalErrorHandler = null;
import { getState, setState } from './StateAndUtils.js';
import { DOM_ELEMENTS, STORAGE_KEYS } from './Config.js';

const failedUrls = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAILED_URLS) || '{}');
// 最大失敗 URL 記錄時長：1 小時
const MAX_FAILED_URLS_DURATION_MS = 1000 * 60 * 60 * 1;

function recordFailedUrl(url) {
    failedUrls[url] = Date.now(); 
    // 清理過期的失敗記錄
    for (const key in failedUrls) {
        if (Date.now() - failedUrls[key] > MAX_FAILED_URLS_DURATION_MS) {
            delete failedUrls[key];
        }
    }
    try {
        localStorage.setItem(STORAGE_KEYS.FAILED_URLS, JSON.stringify(failedUrls)); 
    } catch(e) {
        console.warn('無法記錄失敗 URL:', e);
    }
}

function removeCurrentErrorHandler(handler, audio) {
    if (globalErrorHandler === handler) {
        audio.removeEventListener('error', globalErrorHandler);
        globalErrorHandler = null;
        console.log(`[CDN Fallback]: 移除錯誤處理器成功。`);
    } else if (handler) {
         audio.removeEventListener('error', handler);
    }
}

function handleMetadata(audio, track, handler, sessionToken) {
    // 檢查是否為當前播放會話
    if (getState().currentPlaybackSession !== sessionToken) return;

    console.log(`[CDN Fallback]: ✅ 音源成功載入元數據 (${track.title})。`);
    // 移除錯誤處理器，因為音源已成功載入
    removeCurrentErrorHandler(handler, audio); 

    if (audio.paused) {
        // 核心修復：如果處於暫停狀態，將 UI 狀態更新為“載入成功”
        DOM_ELEMENTS.playerTitle.textContent = `載入成功：${track.title} (請點擊播放)`;
    }
}

function showSimpleAlert(message) {
    console.warn(`[CDN Fallback 提示]: ${message}`);
    const statusDiv = DOM_ELEMENTS.playerTitle;
    const currentSessionToken = getState().currentPlaybackSession;

    if (statusDiv) {
        // 3 秒後如果播放會話未改變且仍顯示 '嘗試備援'，則改回 '載入中...'
        setTimeout(() => {
            if (getState().currentPlaybackSession === currentSessionToken) {
                 const currentText = statusDiv.textContent;
                 if (currentText.includes('嘗試備援')) {
                     statusDiv.textContent = `載入中...`; 
                 }
            }
        }, 3000); 
    }
}

export function playAudioWithFallback(track) {
    const audio = DOM_ELEMENTS.audio;
    const sources = track.sources;
    // 建立唯一的播放會話 Token，用於防範競態條件
    const sessionToken = Date.now().toString(36) + Math.random().toString(36).substring(2);
    setState({ currentPlaybackSession: sessionToken });
    let sourceIndex = 0;

    // 清理全局錯誤處理器
    if (globalErrorHandler) {
        audio.removeEventListener('error', globalErrorHandler);
        globalErrorHandler = null;
    }

    // 清理音頻元素
    audio.src = '';
    audio.load();

    const stableErrorHandler = (e) => {
        // 僅處理當前會話的錯誤
        if (getState().currentPlaybackSession !== sessionToken) return;

        // 忽略中止錯誤 (通常發生在 audio.load() 或切換 src 時)
        if (e.target.error?.code === audio.error.MEDIA_ERR_ABORTED) return;

        const failedUrl = sources[sourceIndex];
        recordFailedUrl(failedUrl); 
        console.warn(`❌ 來源 URL 失敗: ${failedUrl}。錯誤代碼: ${e.target.error?.code || 'Unknown'}`);
    
        sourceIndex++; 
        tryNextSource(); 
    };
    
    // 設置全局錯誤處理器
    globalErrorHandler = stableErrorHandler;
    audio.addEventListener('error', globalErrorHandler); 
    
    const tryNextSource = () => {
        // 檢查會話是否被新播放請求取代
        if (getState().currentPlaybackSession !== sessionToken) {
            removeCurrentErrorHandler(stableErrorHandler, audio);
            return;
        }
        
        // 核心修復點：移除 window.oldMetadataHandler 邏輯
        // 因為 loadedmetadata 監聽器使用了 { once: true }，它會自動移除，
        // 故不需要手動管理 window 上的引用，避免競態條件。
        
        if (sourceIndex >= sources.length) {
            console.error(`🚨 所有音頻來源都已嘗試失敗: ${track.title}`);
            DOM_ELEMENTS.playerTitle.textContent = `🚨 播放失敗：音源格式不受支持或所有備援失敗。`;
            removeCurrentErrorHandler(stableErrorHandler, audio);
            return;
        }

        const url = sources[sourceIndex];
        // 跳過已知失敗的來源
        if (failedUrls[url] && Date.now() - failedUrls[url] < MAX_FAILED_URLS_DURATION_MS) { 
            console.warn(`⏭ 跳過已知失敗來源: ${url}`);
            sourceIndex++;
            tryNextSource(); 
            return;
        }

        showSimpleAlert(`嘗試備援 (CDN ${sourceIndex + 1}/${sources.length}) 載入 ${track.title}。`);
        DOM_ELEMENTS.playerTitle.textContent = `載入中：${track.title} (備援 ${sourceIndex + 1}/${sources.length})`;

        audio.src = url;
        audio.load();

        const currentMetadataHandler = (e) => handleMetadata(audio, track, stableErrorHandler, sessionToken);
        // 使用 { once: true } 確保該監聽器在觸發後自動移除
        audio.addEventListener('loadedmetadata', currentMetadataHandler, { once: true });
        
        // 核心修復點：不再保存到 window.oldMetadataHandler
        
        // 嘗試播放，處理瀏覽器自動播放限制
        audio.play().catch(error => {
            if (error.name === "NotAllowedError" || error.name === "AbortError") {
                console.warn("瀏覽器阻止自動播放或請求被中止。等待用戶手勢。");
                // 播放被阻止不應視為 CDN 失敗，移除錯誤處理器以保持 UI 穩定
                removeCurrentErrorHandler(stableErrorHandler, audio);
            } else {
                console.error("嘗試播放時發生非網絡/非自動播放錯誤，視為失敗:", error);
                // 播放時發生未知錯誤，觸發下一個備援
                sourceIndex++;
                tryNextSource(); 
            }
        });
    };

    tryNextSource();
    return sessionToken; 
}
