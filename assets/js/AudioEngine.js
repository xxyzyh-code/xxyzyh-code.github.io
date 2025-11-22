// AudioEngine.js - 强健的 CDN fallback 音频引擎
import { getState, setState } from './StateAndUtils.js';
import { DOM_ELEMENTS, STORAGE_KEYS } from './Config.js';

let persisted = {};
try {
    persisted = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAILED_URLS) || '{}') || {};
} catch (e) {
    persisted = {};
}
const failedUrls = persisted;
const MAX_FAILED_URLS_DURATION_MS = 1000 * 60 * 60;

function recordFailedUrl(url) {
    try {
        if (!url) return;
        failedUrls[url] = Date.now();
        for (const k in failedUrls) {
            if (Date.now() - failedUrls[k] > MAX_FAILED_URLS_DURATION_MS) delete failedUrls[k];
        }
        localStorage.setItem(STORAGE_KEYS.FAILED_URLS, JSON.stringify(failedUrls));
    } catch (e) {
        console.warn('无法记录失败 URL', e);
    }
}

function showSimpleAlert(message) {
    console.warn(`[CDN Fallback 提示]: ${message}`);
    const statusDiv = DOM_ELEMENTS.playerTitle;
    const t = getState().currentPlaybackSession;
    if (statusDiv) {
        setTimeout(() => {
            if (getState().currentPlaybackSession === t) {
                const cur = statusDiv.textContent || '';
                if (cur.includes('備援') || cur.includes('載入中')) statusDiv.textContent = '載入中...';
            }
        }, 2000);
    }
}

function safeRemoveListener(target, event, handler) {
    try {
        if (handler) target.removeEventListener(event, handler);
    } catch (e) {
        // ignore
    }
}

export function playAudioWithFallback(track, autoPlay = true) {
    const audio = DOM_ELEMENTS.audio;
    const sourcesRaw = Array.isArray(track?.sources) ? track.sources : [];
    // normalize sources to array of string URLs
    const sources = sourcesRaw.map(s => (typeof s === 'string' ? s : (s && s.url) ? s.url : '')).filter(Boolean);

    const sessionToken = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setState({ currentPlaybackSession: sessionToken });

    // reset audio element safely
    try { audio.pause(); } catch (e) {}
    audio.removeAttribute('src');
    audio.load();

    let sourceIndex = 0;
    let currentErrorHandler = null;
    let currentMetadataHandler = null;
    let currentExpectedUrl = null;

    function cleanupHandlers() {
        safeRemoveListener(audio, 'error', currentErrorHandler);
        safeRemoveListener(audio, 'loadedmetadata', currentMetadataHandler);
        currentErrorHandler = null;
        currentMetadataHandler = null;
        currentExpectedUrl = null;
    }

    function isStale(expectedUrl) {
        if (getState().currentPlaybackSession !== sessionToken) return true;
        const cur = audio.currentSrc || audio.src || '';
        if (!expectedUrl) return false;
        try {
            const a = new URL(cur, location.href).href;
            const b = new URL(expectedUrl, location.href).href;
            return a !== b;
        } catch (e) {
            return !cur.includes(expectedUrl) && cur !== expectedUrl;
        }
    }

    function tryNextSource(shouldAutoPlay) {
        if (getState().currentPlaybackSession !== sessionToken) {
            cleanupHandlers();
            return;
        }

        // skip failed urls within retention window
        while (sourceIndex < sources.length) {
            const cand = sources[sourceIndex];
            if (cand && failedUrls[cand] && (Date.now() - failedUrls[cand]) < MAX_FAILED_URLS_DURATION_MS) {
                console.warn('跳過已知失敗來源', cand);
                sourceIndex++;
                continue;
            }
            break;
        }

        if (sourceIndex >= sources.length) {
            DOM_ELEMENTS.playerTitle.textContent = `🚨 播放失敗：所有來源均嘗試失敗`;
            cleanupHandlers();
            return;
        }

        const url = sources[sourceIndex];
        currentExpectedUrl = url;
        cleanupHandlers();

        showSimpleAlert(`嘗試備援 (CDN ${sourceIndex + 1}/${sources.length}) 載入 ${track.title}`);
        DOM_ELEMENTS.playerTitle.textContent = `載入中：${track.title} (備援 ${sourceIndex + 1}/${sources.length})`;

        try {
            audio.src = url;
        } catch (e) {
            console.error('設定 src 失敗，切到下一個', e);
            recordFailedUrl(url);
            sourceIndex++;
            tryNextSource(shouldAutoPlay);
            return;
        }
        audio.load();

        // metadata handler: 只作校驗/紀錄，不移除 error handler
        currentMetadataHandler = function () {
            if (isStale(currentExpectedUrl)) {
                console.warn('[Audio] loadedmetadata 為過時事件，忽略');
                return;
            }
            console.log('[Audio] loadedmetadata for', url);
            // do nothing else here
        };
        audio.addEventListener('loadedmetadata', currentMetadataHandler, { once: true });

        // error handler
        currentErrorHandler = function (e) {
            if (isStale(currentExpectedUrl)) {
                safeRemoveListener(audio, 'error', currentErrorHandler);
                return;
            }
            const code = e?.target?.error?.code;
            if (code === 1) { // MEDIA_ERR_ABORTED
                console.warn('[Audio] MEDIA_ERR_ABORTED - ignore');
                return;
            }
            console.warn('[Audio] error event, record and fallback', url, code);
            recordFailedUrl(url);
            safeRemoveListener(audio, 'error', currentErrorHandler);
            safeRemoveListener(audio, 'loadedmetadata', currentMetadataHandler);
            currentErrorHandler = null;
            currentMetadataHandler = null;
            currentExpectedUrl = null;
            sourceIndex++;
            tryNextSource(shouldAutoPlay);
        };
        audio.addEventListener('error', currentErrorHandler);

        if (shouldAutoPlay) {
            console.log(`[AE] 嘗試播放: ${url}`); // 新增 Log 1
            audio.play()
                .then(() => {
                    // 成功播放
                    console.log('[AE] ✅ 播放 Promise 成功解決 (resolved)！'); // 新增 Log 2
                    if (isStale(currentExpectedUrl)) { cleanupHandlers(); return; }
                    // success -> remove handlers for this source
                    safeRemoveListener(audio, 'error', currentErrorHandler);
                    safeRemoveListener(audio, 'loadedmetadata', currentMetadataHandler);
                    currentErrorHandler = null;
                    currentMetadataHandler = null;
                    currentExpectedUrl = null;
                    // PlayerCore 'playing' will update UI
                    console.log('[Audio] play() resolved - source confirmed:', url);
                })
                .catch(err => {
                    // 播放失敗或被阻止
                    console.error('[AE] ❌ 播放 Promise 失敗 (rejected)！', err.name, err); // 新增 Log 3
                    if (getState().currentPlaybackSession !== sessionToken) { cleanupHandlers(); return; }
                    const name = err && err.name;
                    if (name === 'NotAllowedError' || name === 'AbortError' || name === 'NotSupportedError') {
                        console.warn('[Audio] autoplay 被阻止，切換到等待用戶操作', err);
                        DOM_ELEMENTS.playerTitle.textContent = `載入成功：${track.title} (請點擊播放)`;
                        // 不切換 source — 用户后续点击 play 时，如果源坏会触发 error 或 play() reject
                    } else {
                        console.error('[Audio] play() reject - treat as decode/source error', err);
                        recordFailedUrl(url);
                        safeRemoveListener(audio, 'error', currentErrorHandler);
                        safeRemoveListener(audio, 'loadedmetadata', currentMetadataHandler);
                        currentErrorHandler = null;
                        currentMetadataHandler = null;
                        currentExpectedUrl = null;
                        sourceIndex++;
                        tryNextSource(shouldAutoPlay);
                    }
                });
        } else {
            // 非自动播放，只 load 等待用户 play
            // 当用户点击 play，如果播放失败，error or play() reject 会触发 fallback
        }
    }

    tryNextSource(autoPlay);
    return sessionToken;
}
