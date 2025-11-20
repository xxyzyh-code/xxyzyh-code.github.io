// AudioEngine.js
// 核心音頻播放引擎：專職負責 CDN 備援、錯誤處理和防範競態條件（Race Condition）

import { getState, setState } from './StateAndUtils.js';
import { DOM_ELEMENTS, STORAGE_KEYS } from './Config.js';

// --- 失敗 URL 追蹤邏輯 (問題 4 修正) ---

// 從 LocalStorage 載入上次失敗的來源 URL 列表
// 🚨 注意：這裡使用了您在 Config.js 中新增的 FAILED_URLS Key
const failedUrls = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAILED_URLS) || '{}');
const MAX_FAILED_URLS_DURATION_MS = 1000 * 60 * 60 * 24; // 失敗的 URL 在 24 小時內會被跳過

/**
 * 記錄失敗 URL 並更新 LocalStorage。
 * @param {string} url - 失敗的 URL
 */
function recordFailedUrl(url) {
    failedUrls[url] = Date.now(); 
    try {
        localStorage.setItem(STORAGE_KEYS.FAILED_URLS, JSON.stringify(failedUrls)); 
    } catch(e) {
        console.warn('無法記錄失敗 URL:', e);
    }
}

// --- UI 提示輔助函數 (問題 5 修正) ---

/**
 * 由於沒有 UiUtils.js，我們在這裡定義一個極簡的提示函數來取代 showToast。
 * @param {string} message - 要顯示的訊息
 */
function showSimpleAlert(message) {
    // 🌟 核心邏輯：在 playerTitle 暫時顯示提示
    console.warn(`[CDN Fallback 提示]: ${message}`);
    
    const statusDiv = DOM_ELEMENTS.playerTitle;
    const originalText = statusDiv.textContent;

    // 暫時顯示提示
    if (statusDiv) {
        statusDiv.textContent = message;
        
        // 3 秒後恢復原標題
        setTimeout(() => {
            // 只有當標題沒有被其他操作（例如用戶切歌）覆蓋時才恢復
            if (statusDiv.textContent === message) {
                statusDiv.textContent = originalText;
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
    
    // 🌟 問題 2 修正: 創建一個唯一的 Session Token
    const sessionToken = Date.now().toString(36) + Math.random().toString(36).substring(2);
    setState({ currentPlaybackSession: sessionToken });
    
    let sourceIndex = 0;

    /**
     * 處理 audio 元素的 'error' 事件
     */
    const handleError = (e) => {
        // 🌟 問題 2 修正: 檢查 Session Token，確保只處理當前播放會話的錯誤
        if (getState().currentPlaybackSession !== sessionToken) {
            audio.removeEventListener('error', handleError);
            return; // 忽略舊的錯誤事件
        }
        
        const failedUrl = sources[sourceIndex];
        // 🚨 只有當錯誤不是因為瀏覽器中止（例如切換 src）才記錄為失敗
        if (e.target.error?.code !== audio.error.MEDIA_ERR_ABORTED) {
            recordFailedUrl(failedUrl); 
            console.warn(`❌ 來源 URL 失敗: ${failedUrl}。錯誤代碼: ${e.target.error?.code || 'Unknown'}`);
        } else {
            // 這是正常切換來源時，瀏覽器中止前一個載入的訊息
            console.log(`[CDN Fallback]: 載入中止，切換到下一個來源...`);
        }
        
        audio.removeEventListener('error', handleError); // 移除當前監聽器
        
        // 嘗試下一個來源
        sourceIndex++;
        tryNextSource();
    };
    
    // 核心嘗試邏輯
    const tryNextSource = () => {
        // 檢查 Session Token，如果用戶已經切換到下一首，則中止當前備援流程
        if (getState().currentPlaybackSession !== sessionToken) {
            console.log(`[CDN Fallback]: Session Token 不匹配，終止備援。`);
            return;
        }

        if (sourceIndex >= sources.length) {
            console.error(`🚨 所有音頻來源都已嘗試失敗: ${track.title}`);
            DOM_ELEMENTS.playerTitle.textContent = `🚨 播放失敗：所有備援來源都無效。`;
            audio.src = ''; // 清空 src
            audio.load();
            return;
        }

        const url = sources[sourceIndex];
        
        // 🌟 問題 4 修正: 檢查是否是已知失敗的 URL
        if (failedUrls[url] && Date.now() - failedUrls[url] < MAX_FAILED_URLS_DURATION_MS) { 
            console.warn(`⏭ 跳過已知失敗來源: ${url}`);
            sourceIndex++;
            tryNextSource(); // 遞歸調用，嘗試下一個
            return;
        }

        // 提示用戶正在進行備援
        showSimpleAlert(`嘗試備援 (CDN ${sourceIndex + 1}/${sources.length}) 載入 ${track.title}。`);
        DOM_ELEMENTS.playerTitle.textContent = `載入中：${track.title} (備援 ${sourceIndex + 1}/${sources.length})`;

        // 🌟 問題 3 修正: 統一使用 audio.src = url
        audio.src = url;
        audio.addEventListener('error', handleError, { once: true }); // 設置新的錯誤監聽器
        audio.load(); // 重新載入音頻元素

        audio.play().catch(error => {
            if (error.name === "NotAllowedError" || error.name === "AbortError") {
                // 瀏覽器限制自動播放 或 用戶快速點擊下一首
                console.warn("瀏覽器阻止自動播放或請求被中止。");
                DOM_ELEMENTS.playerTitle.textContent = `需點擊播放：${track.title}`;
            } else {
                // 其他播放錯誤 (例如解碼失敗，但尚未觸發 'error' 事件)
                console.error("嘗試播放時發生非網絡錯誤，視為失敗，嘗試備援:", error);
                
                // 立即觸發備援流程
                audio.removeEventListener('error', handleError); 
                sourceIndex++;
                tryNextSource();
            }
        });
    };

    // 清理舊的 audio.src 和 listeners (確保 PlayTrack 啟動時是乾淨的)
    audio.innerHTML = ''; 
    audio.src = '';
    
    tryNextSource();
    
    return sessionToken; // 返回 Token 給調用者
}
