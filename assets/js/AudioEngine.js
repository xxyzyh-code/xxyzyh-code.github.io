// AudioEngine.js
// 核心音頻播放引擎：负责 CDN 备援、错误处理、防范竞态条件（Race Condition）

import { getState, setState } from './StateAndUtils.js';
import { DOM_ELEMENTS, STORAGE_KEYS } from './Config.js';

// 🌟 核心修復 1：移除全局錯誤處理器變量
// let globalErrorHandler = null; // ❌ 刪除：不再使用全局變量來管理錯誤處理器

const failedUrls = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAILED_URLS) || '{}');
// 最大失敗 URL 記錄时长：1 小时
const MAX_FAILED_URLS_DURATION_MS = 1000 * 60 * 60;

function recordFailedUrl(url) {
    failedUrls[url] = Date.now();
    for (const key in failedUrls) {
        if (Date.now() - failedUrls[key] > MAX_FAILED_URLS_DURATION_MS) {
            delete failedUrls[key];
        }
    }
    try {
        localStorage.setItem(STORAGE_KEYS.FAILED_URLS, JSON.stringify(failedUrls));
    } catch (e) {
        console.warn('無法記錄失敗 URL:', e);
    }
}

// 🌟 核心修復 2：簡化錯誤處理器移除邏輯
function removeCurrentErrorHandler(handler, audio) {
    if (!handler) return;
    
    // 舊邏輯中的 globalErrorHandler 檢查已移除。
    audio.removeEventListener('error', handler);
    
    console.log('[CDN Fallback]: 移除會話錯誤處理器'); // 修正日誌，不再提及「全局」
}

function handleMetadata(audio, track, handler, sessionToken) {
    // 確保只有當前的播放會話才能觸發這個事件
    if (getState().currentPlaybackSession !== sessionToken) {
        // 如果不是當前會話，移除此 session 的 metadata 處理器（在 tryNextSource 中添加）
        // 由於 metadata 處理器是一次性的 ({once: true})，這步在技術上是多餘的，但作為防禦性編程保留。
        audio.removeEventListener('loadedmetadata', handleMetadata); 
        return;
    }

    console.log(`[CDN Fallback]: ✅ 音源成功載入元數據 (${track.title})`);
    removeCurrentErrorHandler(handler, audio); // 成功後移除該 session 的錯誤處理器

    // UI 邏輯保持不變
    if (audio.paused) {
        DOM_ELEMENTS.playerTitle.textContent = `載入成功：${track.title} (請點擊播放)`; // 🌟 UI 詞語修正
    } else {
        // 否則，讓 'playing' 事件 (PlayerCore.js) 來更新標題
        DOM_ELEMENTS.playerTitle.textContent = `載入成功，等待播放事件確認...`;
    }
}

function showSimpleAlert(message) {
    console.warn(`[CDN Fallback 提示]: ${message}`);
    const statusDiv = DOM_ELEMENTS.playerTitle;
    const currentSessionToken = getState().currentPlaybackSession;

    if (statusDiv) {
        setTimeout(() => {
            if (getState().currentPlaybackSession === currentSessionToken) {
                const currentText = statusDiv.textContent;
                if (currentText.includes('備援')) {
                    statusDiv.textContent = `載入中...`;
                }
            }
        }, 3000);
    }
}

export function playAudioWithFallback(track, autoPlay = true) {
    const audio = DOM_ELEMENTS.audio;
    const sources = track.sources;
    const sessionToken = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // 設置新的播放會話，這會使上一個會話的 event listener 內部檢查失敗
    setState({ currentPlaybackSession: sessionToken });

    let sourceIndex = 0;

    // 🌟 核心修復 3：刪除暴力移除上一個 globalErrorHandler 的邏輯
    /* 舊代碼：
    if (globalErrorHandler) {
        audio.removeEventListener('error', globalErrorHandler);
        globalErrorHandler = null;
    } 
    */

    audio.src = '';
    // 核心修復 1: 立即調用 load() 確保音頻元素準備好
    audio.load(); 
    
    // ⚠️ 核心修復 4：為這個新的播放會話創建一個穩定的錯誤處理器
    const stableErrorHandler = (e) => {
        // 如果當前全局會話 ID 與此處理器閉包的 session ID 不匹配，則該錯誤已過時，直接退出
        if (getState().currentPlaybackSession !== sessionToken) {
            // 由於這是過時的錯誤，我們確保移除自己，防止它再次被觸發（儘管它應該只被觸發一次）
            removeCurrentErrorHandler(stableErrorHandler, audio);
            return;
        }
        
        // MEDIA_ERR_ABORTED 通常發生在切歌時，此時我們應該交給新的 sessionToken 處理，所以退出
        if (e.target.error?.code === audio.error.MEDIA_ERR_ABORTED) return;

        const failedUrl = sources[sourceIndex];
        recordFailedUrl(failedUrl);
        console.warn(`❌ 來源 URL 失敗: ${failedUrl} 錯誤代碼: ${e.target.error?.code || 'Unknown'}`);

        sourceIndex++;
        // 核心修復 3: 備援時也要傳遞 autoPlay 狀態
        tryNextSource(autoPlay); 
    };

    // 🌟 核心修復 5：直接綁定 stableErrorHandler (作為會話處理器)
    audio.addEventListener('error', stableErrorHandler);

    // 核心修復 4: 調整 tryNextSource 接受 autoPlay 參數
    const tryNextSource = (shouldAutoPlay) => {
        // 如果會話被新的請求取代，則清理並退出
        if (getState().currentPlaybackSession !== sessionToken) {
            removeCurrentErrorHandler(stableErrorHandler, audio);
            return;
        }

        if (sourceIndex >= sources.length) {
            console.error(`🚨 所有音頻來源嘗試失敗: ${track.title}`);
            DOM_ELEMENTS.playerTitle.textContent = `🚨 播放失敗：音源格式不受支持或所有備援失敗`;
            removeCurrentErrorHandler(stableErrorHandler, audio); // 失敗後移除處理器
            return;
        }

        let url = sources[sourceIndex];
        if (failedUrls[url] && Date.now() - failedUrls[url] < MAX_FAILED_URLS_DURATION_MS) {
            console.warn(`⏭ 跳過已知失敗來源: ${url}`);
            sourceIndex++;
            tryNextSource(shouldAutoPlay); // 跳過時保持 autoPlay 狀態
            return;
        }

        showSimpleAlert(`嘗試備援 (CDN ${sourceIndex + 1}/${sources.length}) 載入 ${track.title}`);
        DOM_ELEMENTS.playerTitle.textContent = `載入中：${track.title} (備援 ${sourceIndex + 1}/${sources.length})`;

        audio.src = url;
        audio.load();

        // 這裡確保我們傳遞 stableErrorHandler 作為處理器參數
        const currentMetadataHandler = () => handleMetadata(audio, track, stableErrorHandler, sessionToken);
        audio.addEventListener('loadedmetadata', currentMetadataHandler, { once: true });

        // 核心修復 5: 根據 shouldAutoPlay 決定是否嘗試播放
        if (shouldAutoPlay) {
            audio.play().catch(error => {
                // 如果 play() 失敗 (如 NotAllowedError/AbortError)，我們不應該觸發備援，
                // 而是讓錯誤處理器在真正的音頻載入/播放失敗時處理。
                if (error.name === "NotAllowedError" || error.name === "AbortError" || error.name === "NotSupportedError") {
                    console.warn("瀏覽器阻止自動播放或格式不受支持，等待用戶手勢或嘗試下一備援");
                    // 即使播放失敗，也要更新 UI 狀態
                    DOM_ELEMENTS.playerTitle.textContent = `載入完成：${track.title} (請點擊播放)`;
                    // 🚨 Bug 修復：如果播放失敗，且沒有觸發錯誤事件，我們必須自己移除處理器，否則它會永遠掛在那裡
                    removeCurrentErrorHandler(stableErrorHandler, audio); 
                } else {
                    // 對於其他錯誤，讓錯誤事件本身觸發 stableErrorHandler，進入備援流程
                    console.error("嘗試播放時發生未知錯誤 (可能導致錯誤事件觸發備援):", error);
                }
            });
        }
        // 如果不 shouldAutoPlay，則不調用 play()，等待用戶手勢。
        // 錯誤處理器會一直掛著，直到用戶播放，或載入失敗（觸發錯誤事件）。
    };
    
    // 首次調用時傳遞 autoPlay
    tryNextSource(autoPlay);
    return sessionToken;
}
