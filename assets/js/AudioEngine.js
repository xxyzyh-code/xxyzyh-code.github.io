// AudioEngine.js
// 核心音頻播放引擎：專職負責 CDN 備援、錯誤處理和防範競態條件（Race Condition）

let currentErrorHandler = null; // 追蹤當前活躍的錯誤處理器
import { getState, setState } from './StateAndUtils.js';
import { DOM_ELEMENTS, STORAGE_KEYS } from './Config.js';

// --- 失敗 URL 追蹤邏輯 ---

// 從 LocalStorage 載入上次失敗的來源 URL 列表
const failedUrls = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAILED_URLS) || '{}');
const MAX_FAILED_URLS_DURATION_MS = 1000 * 60 * 60 * 1; // 失敗的 URL 在 1 小時內會被跳過

/**
 * 記錄失敗 URL 並更新 LocalStorage。
 * @param {string} url - 失敗的 URL
 */
function recordFailedUrl(url) {
    failedUrls[url] = Date.now(); 
    // 清理過期的失敗記錄（選做優化）
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

// --- UI 提示輔助函數 ---

/**
 * 在 playerTitle 暫時顯示提示。
 * @param {string} message - 要顯示的訊息
 */
function showSimpleAlert(message) {
    console.warn(`[CDN Fallback 提示]: ${message}`);
    
    const statusDiv = DOM_ELEMENTS.playerTitle;
    const originalText = statusDiv.textContent;
    const currentSessionToken = getState().currentPlaybackSession;

    if (statusDiv) {
        statusDiv.textContent = message;
        
        // 3 秒後恢復原標題
        setTimeout(() => {
            // 只有當當前 Session Token 仍匹配時才恢復，防止覆蓋新歌標題
            if (getState().currentPlaybackSession === currentSessionToken) {
                if (statusDiv.textContent === message) {
                    // 恢復到 "載入中..." 或類似的狀態，而不是完全恢復，
                    // 因為這可能發生在 `playing` 事件觸發之前。
                    // 保持 "載入中..." 狀態，直到 `handlePlaying` 確認成功。
                    statusDiv.textContent = originalText.includes('(載入中...)') ? originalText : `正在播放 (載入中...)`; 
                }
            }
        }, 3000); 
    }
}

// --- 核心播放邏輯 ---

/**
 * 核心備援邏輯：依序嘗試 track.sources 中的所有 URL，並避開已知的失敗來源。
 * @param {object} track - 歌曲物件
 * @returns {string} - 返回本次播放的 Session Token (防止 race condition)
 */
export function playAudioWithFallback(track) {
    const audio = DOM_ELEMENTS.audio;
    const sources = track.sources;
    
    // 🌟 1. 關鍵修正：如果存在舊的處理器，先強制移除它
    if (currentErrorHandler) {
        console.log(`[CDN Fallback]: 發現舊的錯誤處理器，正在移除...`);
        audio.removeEventListener('error', currentErrorHandler);
        currentErrorHandler = null;
    }
    
    // 🌟 2. 創建並設置新的 Session Token (防止競態條件)
    const sessionToken = Date.now().toString(36) + Math.random().toString(36).substring(2);
    setState({ currentPlaybackSession: sessionToken });
    
    let sourceIndex = 0;
    
    /**
     * 具名的錯誤處理器：專門處理音頻加載或播放失敗。
     * @param {Event} e - 錯誤事件
     */
    const handleError = (e) => {
    
        // 核心檢查：Token 不匹配，立即中止
        if (getState().currentPlaybackSession !== sessionToken) {
            console.warn(`[CDN Fallback]: 舊的錯誤事件觸發，Token 不匹配，終止後援。`);
            audio.removeEventListener('error', handleError); 
            currentErrorHandler = null; 
            return; 
        }
        
        // 核心檢查：如果錯誤是正常中止 (如切換 SRC 導致)，則忽略
        if (e.target.error?.code === audio.error.MEDIA_ERR_ABORTED) {
            console.log(`[CDN Fallback]: 載入中止 (MEDIA_ERR_ABORTED)，忽略。`);
            // 這裡不應移除監聽器，因為這可能是 `audio.load()` 導致的中止，
            // 監聽器需要保持活躍以接收真正的網絡錯誤。
            return; 
        }
        
        // 真正失敗，記錄並嘗試下一個
        const failedUrl = sources[sourceIndex];
        recordFailedUrl(failedUrl); 
        console.warn(`❌ 來源 URL 失敗: ${failedUrl}。錯誤代碼: ${e.target.error?.code || 'Unknown'}`);
    
        // 進入下一個來源
        // 由於 tryNextSource() 會調用 audio.load()，我們需要**在 tryNextSource 之前**遞增 sourceIndex
        sourceIndex++; 
        tryNextSource(); 
    };
    
    // 🌟 3. 追蹤當前的處理器，並在開始時添加一次
    currentErrorHandler = handleError;
    audio.addEventListener('error', handleError); 
    
    const tryNextSource = () => {
        
        // 檢查 Token，防止競態條件
        if (getState().currentPlaybackSession !== sessionToken) {
            console.log(`[CDN Fallback]: Session Token 不匹配，終止備援。`);
            if (currentErrorHandler === handleError) {
                audio.removeEventListener('error', handleError);
                currentErrorHandler = null;
            }
            return;
        }

        if (sourceIndex >= sources.length) {
            console.error(`🚨 所有音頻來源都已嘗試失敗: ${track.title}`);
            DOM_ELEMENTS.playerTitle.textContent = `🚨 播放失敗：所有備援來源都無效。`;
            audio.src = ''; 
            audio.load();
            
            // 最終結束，移除監聽器
            if (currentErrorHandler === handleError) {
                audio.removeEventListener('error', handleError);
                currentErrorHandler = null;
            }
            return;
        }

        const url = sources[sourceIndex];
        
        // 檢查是否是已知失敗的 URL
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

        audio.play().catch(error => {
            
            // 🌟 核心修正：處理瀏覽器阻止自動播放的情況
            if (error.name === "NotAllowedError" || error.name === "AbortError") {
                console.warn("瀏覽器阻止自動播放或請求被中止。等待用戶手勢。");
                DOM_ELEMENTS.playerTitle.textContent = `需點擊播放：${track.title}`;
                
                // 立即移除監聽器，防止用戶手動播放後，舊的監聽器錯誤地觸發備援
                audio.removeEventListener('error', handleError);
                currentErrorHandler = null;
                
            } else {
                console.error("嘗試播放時發生非網絡/非自動播放錯誤，立即嘗試備援:", error);
                
                // 非預期錯誤，直接進入下一個來源，讓 handleError 負責移除和遞增
                // 注意：這裡不移除監聽器，由 handleError 負責。
                sourceIndex++;
                tryNextSource();
            }
        });
    };

    // 清理舊的 audio.src (防止重複加載)
    audio.innerHTML = ''; 
    audio.src = '';
    
    tryNextSource();
    
    return sessionToken; 
}
