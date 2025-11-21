// AudioEngine.js
// 核心音频播放引擎：负责 CDN 备援、错误处理、防范竞态条件（Race Condition）

import { getState, setState } from './StateAndUtils.js';
import { DOM_ELEMENTS, STORAGE_KEYS } from './Config.js';

let globalErrorHandler = null;

const failedUrls = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAILED_URLS) || '{}');
// 最大失败 URL 记录时长：1 小时
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
        console.warn('无法记录失败 URL:', e);
    }
}

function removeCurrentErrorHandler(handler, audio) {
    if (!handler) return;
    if (globalErrorHandler === handler) {
        audio.removeEventListener('error', globalErrorHandler);
        globalErrorHandler = null;
        console.log('[CDN Fallback]: 移除全局错误处理器');
    } else {
        audio.removeEventListener('error', handler);
    }
}

function handleMetadata(audio, track, handler, sessionToken) {
    if (getState().currentPlaybackSession !== sessionToken) return;

    console.log(`[CDN Fallback]: ✅ 音源成功载入元数据 (${track.title})`);
    removeCurrentErrorHandler(handler, audio);

    if (audio.paused) {
        DOM_ELEMENTS.playerTitle.textContent = `载入完成：${track.title} (请点击播放)`;
    } else {
        DOM_ELEMENTS.playerTitle.textContent = `正在播放：${track.title}`;
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
                if (currentText.includes('备援')) {
                    statusDiv.textContent = `载入中...`;
                }
            }
        }, 3000);
    }
}

export function playAudioWithFallback(track, autoPlay = true) {
    const audio = DOM_ELEMENTS.audio;
    const sources = track.sources;
    const sessionToken = Date.now().toString(36) + Math.random().toString(36).substring(2);
    setState({ currentPlaybackSession: sessionToken });

    let sourceIndex = 0;

    if (globalErrorHandler) {
        audio.removeEventListener('error', globalErrorHandler);
        globalErrorHandler = null;
    }

    audio.src = '';
    // 核心修復 1: 立即調用 load() 確保音頻元素準備好
    audio.load(); 
    
    // ⚠️ 核心修復 2: 傳遞 autoPlay 狀態給 tryNextSource
    // tryNextSource 現在負責處理整個載入和播放流程
    const stableErrorHandler = (e) => {
        if (getState().currentPlaybackSession !== sessionToken) return;
        if (e.target.error?.code === audio.error.MEDIA_ERR_ABORTED) return;

        const failedUrl = sources[sourceIndex];
        recordFailedUrl(failedUrl);
        console.warn(`❌ 來源 URL 失敗: ${failedUrl} 錯誤代碼: ${e.target.error?.code || 'Unknown'}`);

        sourceIndex++;
        // 核心修復 3: 備援時也要傳遞 autoPlay 狀態
        tryNextSource(autoPlay); 
    };

    globalErrorHandler = stableErrorHandler;
    audio.addEventListener('error', globalErrorHandler);

    // 核心修復 4: 調整 tryNextSource 接受 autoPlay 參數
    const tryNextSource = (shouldAutoPlay) => {
        if (getState().currentPlaybackSession !== sessionToken) {
            removeCurrentErrorHandler(stableErrorHandler, audio);
            return;
        }

        if (sourceIndex >= sources.length) {
            console.error(`🚨 所有音頻來源嘗試失敗: ${track.title}`);
            DOM_ELEMENTS.playerTitle.textContent = `🚨 播放失敗：音源格式不受支持或所有備援失敗`;
            removeCurrentErrorHandler(stableErrorHandler, audio);
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

        const currentMetadataHandler = () => handleMetadata(audio, track, stableErrorHandler, sessionToken);
        audio.addEventListener('loadedmetadata', currentMetadataHandler, { once: true });

        // 核心修復 5: 根據 shouldAutoPlay 決定是否嘗試播放
        if (shouldAutoPlay) {
            audio.play().catch(error => {
                if (error.name === "NotAllowedError" || error.name === "AbortError") {
                    console.warn("瀏覽器阻止自動播放，等待用戶手勢");
                    // 即使播放失敗，也要更新 UI 狀態
                    DOM_ELEMENTS.playerTitle.textContent = `載入完成：${track.title} (請點擊播放)`;
                    removeCurrentErrorHandler(stableErrorHandler, audio);
                } else {
                    console.error("播放時發生未知錯誤，嘗試下一備援:", error);
                    sourceIndex++;
                    tryNextSource(shouldAutoPlay); // 嘗試下一備援
                }
            });
        }
    };
    
    // 首次調用時傳遞 autoPlay
    tryNextSource(autoPlay);
    return sessionToken;
}
