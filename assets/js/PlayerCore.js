// PlayerCore.js
// 負責所有核心播放邏輯、DOM 交互、API 通訊和事件處理

import {
    DOM_ELEMENTS, STORAGE_KEYS, THEMES, GLOBAL_STATS_TABLE,
    MASTER_TRACK_LIST
} from './Config.js';
import {
    getState, setState, saveSettings, loadSavedSettings, debounce,
    getUserId, resetCurrentPlaylist, incrementListenTime, resetListenTime,
    totalListenMinutes, totalListenSeconds
} from './StateAndUtils.js';

// 🌟 新增：導入 LRC 模組 🌟
import { fetchLRC, parseLRC } from './LrcParser.js';
// 🌟 導入結束 🌟

// 🎯 修正步驟 1：添加一個全局標記，確保事件監聽器只綁定一次
let hasInitializedListeners = false;

// --- 數據模式相關函數 (API) ---

function trackPlayToDatabase(song_id) {
    // 🎯 修正：安全檢查 currentPlaylist 和 currentTrackIndex
    const { currentPlaylist, currentTrackIndex } = getState();
    if (typeof song_id === 'undefined' || song_id === null || currentTrackIndex === -1 || currentPlaylist.length === 0) {
        console.warn("trackPlayToDatabase: Song ID 或索引無效，跳過數據庫記錄。");
        return;
    }

    const user_id = getUserId();
    const currentTrack = currentPlaylist[currentTrackIndex];
    const song_title = currentTrack ? currentTrack.title : '未知歌曲';

    // 假設 /api/track 是一個處理 Supabase 寫入的後端端點
    fetch('/api/track', {
        method: 'POST',
        body: JSON.stringify({ user_id: user_id, song_id: song_id, title: song_title }),
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (!response.ok) {
            console.error(`播放記錄發送失敗，狀態碼: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .catch(error => {
        console.error('播放記錄發送失敗:', error);
    });
}

async function fetchGlobalPlayCounts() {
    // 獲取 DOM 元素，因為它在 Config.js 中定義
    const modeSpan = document.getElementById('current-data-mode');
    if (modeSpan) modeSpan.textContent = '[載入中...]';

    const BASE_URL = window.location.origin;
    const apiEndpoint = `${BASE_URL}/api/stats`;

    try {
        const response = await fetch(apiEndpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            let errorMessage = `API 錯誤! 狀態碼: ${response.status}.`;
            try {
                const errorBody = await response.json();
                if (errorBody && errorBody.message) {
                    errorMessage += ` 詳情: ${errorBody.message}`;
                } else if (errorBody.error) {
                    errorMessage += ` 詳情: ${errorBody.error}`;
                }
            } catch (e) {
                errorMessage += ` 後端響應格式錯誤或為靜態頁面。`;
            }
            throw new Error(errorMessage);
        }

        const globalStats = await response.json();
        return globalStats;

    } catch (error) {
        console.error('獲取全球播放次數失敗:', error);
        // 🎯 修正：從 alert 改為 console.error，避免阻礙用戶體驗
        console.error(`無法載入全球統計數據。錯誤: ${error.message}。已自動切換到本地模式。`);
        setState({ dataMode: 'local' });
        updateDataModeUI();
        saveSettings();
        return {};
    }
}

// --- UI 輔助函數 ---

function updateDataModeUI() {
    const { dataMode } = getState();
    const modeSpan = document.getElementById('current-data-mode');
    if (!modeSpan) return;

    if (dataMode === 'global') {
        modeSpan.textContent = "[全球統計]";
        modeSpan.style.color = 'red';
    } else {
        modeSpan.textContent = "[本地統計]";
        modeSpan.style.color = '';
    }
}

function updateModeUI() {
    const { playMode } = getState();
    let modeText;

    if (playMode === 1) {
        modeText = "[ 模式: 單曲循環 ]";
    } else if (playMode === 2) {
        modeText = "[ 模式: 隨機 ]";
    } else if (playMode === 3) {
        modeText = "[ 模式: 自由 ]";
    } else if (playMode === 4) {
        modeText = "[ 模式: 順序循環 ]";
    } else {
        modeText = "[ 模式: 順序停止 ]";
    }

    DOM_ELEMENTS.modeButton.textContent = modeText;
}

function updatePlaylistHighlight(manualScroll = false) {
    const { currentPlaylist, currentTrackIndex } = getState();
    const listItems = DOM_ELEMENTS.playlistUl.querySelectorAll('li');

    listItems.forEach(item => {
        item.classList.remove('playing');
    });

    if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
        // 🎯 修正：使用正在播放歌曲的 originalIndex 查找
        const currentlyPlayingOriginalIndex = currentPlaylist[currentTrackIndex].originalIndex;
        const playingItem = DOM_ELEMENTS.playlistUl.querySelector(`li[data-original-index="${currentlyPlayingOriginalIndex}"]`);

        if (playingItem) {
            playingItem.classList.add('playing');
            if (!manualScroll) {
                playingItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }
}

// --- 歌詞渲染與同步輔助函數 ---

function renderLyrics() {
    const { currentLRC } = getState();
    const contentDiv = DOM_ELEMENTS.lyricsContent;

    contentDiv.innerHTML = ''; // 清空舊歌詞
    
    // 🎯 修正：處理 currentLRC 為 null 或空陣列的情況 (容錯)
    if (!currentLRC || !Array.isArray(currentLRC) || currentLRC.length === 0) {
        contentDiv.innerHTML = '<p id="lyrics-placeholder">沒有找到歌詞。</p>';
        return;
    }

    // 渲染所有歌詞行
    const fragment = document.createDocumentFragment();
    currentLRC.forEach((lyric, index) => {
        const p = document.createElement('p');
        p.textContent = lyric.text;
        p.setAttribute('data-index', index); // 使用 index 作為唯一標識
        fragment.appendChild(p);
    });
    contentDiv.appendChild(fragment);
}

function syncLyrics() {
    const { currentLRC, currentLyricIndex } = getState();
    const currentTime = DOM_ELEMENTS.audio.currentTime || 0;

    // 🎯 修正：容錯檢查
    if (!currentLRC || !Array.isArray(currentLRC) || currentLRC.length === 0) return;

    let nextIndex = currentLyricIndex;

    // 優化：從當前索引（或前一行）開始查找，而不是從頭開始
    const startIndex = Math.max(0, currentLyricIndex);

    for (let i = startIndex; i < currentLRC.length; i++) {
        // 如果當前時間大於或等於歌詞的時間戳
        if (currentLRC[i].time <= currentTime) {
            nextIndex = i;
        } else {
            // 由於歌詞已排序，一旦超過當前時間，就可以停止查找
            break;
        }
    }

    // 檢查是否需要更新高亮
    if (nextIndex !== currentLyricIndex) {
        setState({ currentLyricIndex: nextIndex });

        // 移除舊高亮
        const oldLine = DOM_ELEMENTS.lyricsContent.querySelector(`p.current-line`);
        if (oldLine) {
            oldLine.classList.remove('current-line');
        }

        // 添加新高亮
        const newLine = DOM_ELEMENTS.lyricsContent.querySelector(`p[data-index="${nextIndex}"]`);
        if (newLine) {
            newLine.classList.add('current-line');

            // 滾動歌詞容器
            const container = DOM_ELEMENTS.lyricsContainer;
            const content = DOM_ELEMENTS.lyricsContent;
            
            // 核心滾動邏輯：讓高亮行居中
            const offsetTop = newLine.offsetTop - content.offsetTop;
            const targetScrollTop = offsetTop - (container.clientHeight / 2) + (newLine.clientHeight / 2);
            
            container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        }
    }
}
// --- 歌詞輔助函數結束 ---

function getSystemThemeBasedOnTime() {
    const hour = new Date().getHours();
    return (hour >= 19 || hour < 7) ? THEMES.DARK : THEMES.LIGHT;
}

function applyTheme(desiredTheme, isManual = false) {
    const body = document.body;
    let displayName = '';

    const allThemes = Object.values(THEMES).map(t => t + '-theme').filter(t => t !== THEMES.LIGHT + '-theme');
    body.classList.remove(...allThemes);

    let themeToApply = desiredTheme;
    let modeText = '【手動】';

    if (isManual) {
        localStorage.setItem(STORAGE_KEYS.THEME, desiredTheme);
    } else if (desiredTheme === THEMES.LIGHT) {
        themeToApply = getSystemThemeBasedOnTime();
        modeText = '【自動】';
    }

    if (themeToApply !== THEMES.LIGHT) {
        body.classList.add(themeToApply + '-theme');
    }

    // 映射顯示名稱
    switch(themeToApply) {
        case THEMES.DARK: displayName = '黑色'; break;
        case THEMES.GREY: displayName = '灰色'; break;
        case THEMES.BLUE: displayName = '藍色'; break;
        case THEMES.GREEN: displayName = '綠色'; break;
        case THEMES.PURPLE: displayName = '紫色'; break;
        case THEMES.PINK: displayName = '粉色'; break;
        case THEMES.YELLOW: displayName = '黃色'; break;
        case THEMES.RED: displayName = '紅色'; break;
        default: displayName = '白色';
    }

    DOM_ELEMENTS.currentThemeName.textContent = `${displayName} ${modeText}`;
}

function initializeTheme() {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);

    if (storedTheme) {
        if (storedTheme === THEMES.LIGHT) {
            applyTheme(THEMES.LIGHT, false);
        } else {
            applyTheme(storedTheme, true);
        }
    } else {
        applyTheme(THEMES.LIGHT, false);
    }
}

function updateTotalListenTime() {
    incrementListenTime(); // 來自 StateAndUtils
    DOM_ELEMENTS.totalListenTimeSpan.textContent =
        `${totalListenMinutes()} 分鐘 ${totalListenSeconds()} 秒`;
}

function updateTimerCountdown() {
    const { endTime, countdownIntervalId } = getState();
    if (endTime > 0) {
        const remainingMs = endTime - Date.now();
        const remainingS = Math.max(0, Math.floor(remainingMs / 1000));

        const minutes = Math.floor(remainingS / 60);
        const seconds = remainingS % 60;

        DOM_ELEMENTS.remainingTimerSpan.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (remainingS === 0) {
            clearSleepTimer();
            if (!DOM_ELEMENTS.audio.paused) {
                DOM_ELEMENTS.audio.pause();
                DOM_ELEMENTS.playerTitle.textContent = `定時器到期，已暫停播放`;
            }
        }
    }
}

// --- 定時器函數 ---

export function toggleTimerMenu(e) {
    if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation(); // <--- 🚨 新增：防止點擊事件被干擾
    }
    const isExpanded = DOM_ELEMENTS.timerMenu.classList.toggle('hidden-menu');
    // 🌟 A11Y 增強：設置 aria-expanded
    DOM_ELEMENTS.timerToggleButton.setAttribute('aria-expanded', !isExpanded);

    if (!DOM_ELEMENTS.themeMenu.classList.contains('hidden-menu')) {
        DOM_ELEMENTS.themeMenu.classList.add('hidden-menu');
        DOM_ELEMENTS.themeToggleBtn.setAttribute('aria-expanded', false); // 🌟 A11Y 增強
    }
}

export function setSleepTimer(minutes) {
    clearSleepTimer();
    toggleTimerMenu();

    const delayMilliseconds = minutes * 60 * 1000;
    const newEndTime = Date.now() + delayMilliseconds;
    const intervalId = setInterval(updateTimerCountdown, 1000);
    const timerId = setTimeout(() => {
        DOM_ELEMENTS.audio.pause();
        DOM_ELEMENTS.playerTitle.textContent = `定時器到期，已暫停播放 (${minutes} 分鐘)`;
        clearSleepTimer();
    }, delayMilliseconds);

    setState({ sleepTimerId: timerId, endTime: newEndTime, countdownIntervalId: intervalId });
    DOM_ELEMENTS.timerToggleButton.textContent = `定時 (${minutes} 分鐘)`;
    DOM_ELEMENTS.playerTitle.textContent = `定時器已設置：${minutes} 分鐘後自動關閉`;
}

export function clearSleepTimer() {
    const { sleepTimerId, countdownIntervalId } = getState();

    if (sleepTimerId !== null) {
        clearTimeout(sleepTimerId);
    }
    if (countdownIntervalId !== null) {
        clearInterval(countdownIntervalId);
    }

    // 🎯 修正：確保通過 setState 更新全局狀態
    setState({ sleepTimerId: null, endTime: 0, countdownIntervalId: null });
    DOM_ELEMENTS.timerToggleButton.textContent = "定時 (未設定)";
    DOM_ELEMENTS.remainingTimerSpan.textContent = "--:--";
    DOM_ELEMENTS.playerTitle.textContent = "已取消定時器";
}

// --- 播放控制邏輯 ---

function getNextRandomIndex() {
    const { currentPlaylist, currentTrackIndex } = getState();
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * currentPlaylist.length);
    } while (newIndex === currentTrackIndex && currentPlaylist.length > 1);

    return newIndex;
}

/**
 * 輔助函數：根據文件擴展名推斷 MIME 類型
 * @param {string} src - 資源 URL
 * @returns {string} MIME 類型
 */
function getMimeType(src) {
    const ext = src.split('.').pop().toLowerCase();
    switch (ext) {
        case 'mp3': return 'audio/mpeg';
        case 'm4a':
        case 'aac': return 'audio/mp4';
        case 'ogg':
        case 'oga': return 'audio/ogg';
        case 'wav': return 'audio/wav';
        default: return 'audio/mpeg'; // 預設為最常見的 MP3 格式
    }
}

/**
 * @param {number} index - 歌曲在當前播放列表 currentPlaylist 中的索引
 */
export function playTrack(index) {
    const { currentPlaylist } = getState();
    
    if (index >= 0 && index < currentPlaylist.length) {
        // 播放新歌曲時，清除 isStoppedAtEnd 標記
        // 🎯 核心修正：同時清除歌詞索引
        setState({ currentTrackIndex: index, isStoppedAtEnd: false, currentLyricIndex: -1 });
        const track = currentPlaylist[index];

        // --- 核心 CDN/格式備援邏輯：動態插入 <source> 標籤 ---
        DOM_ELEMENTS.audio.innerHTML = '';
        if (track.sources && Array.isArray(track.sources)) {
            track.sources.forEach(src => {
                const sourceEl = document.createElement('source');
                sourceEl.src = src;
                // 🌟 使用輔助函數統一 MIME 類型邏輯 🌟
                sourceEl.type = getMimeType(src);
                DOM_ELEMENTS.audio.appendChild(sourceEl);
            });
        } else {
            console.error(`歌曲 ${track.title} 缺少 sources 陣列!`);
            DOM_ELEMENTS.audio.src = '';
        }

        // 🌟 新增：歌詞載入與解析邏輯 (容錯) 🌟
        if (track.lrcPath) {
            fetchLRC(track.lrcPath).then(lrcText => {
                // 🎯 修正：即使 lrcText 為空，也要傳遞空陣列給 setState
                const parsedLRC = lrcText ? parseLRC(lrcText) : [];
                setState({ currentLRC: parsedLRC, currentLyricIndex: -1 });
                renderLyrics();
            }).catch(error => {
                console.error(`❌ 歌詞文件加載失敗 (${track.lrcPath}):`, error);
                // 🎯 修正：載入失敗時，清空狀態，避免 renderLyrics 報錯
                setState({ currentLRC: [], currentLyricIndex: -1 });
                renderLyrics();
            });
        } else {
            // 🎯 修正：如果沒有 lrcPath，清空歌詞區域
            setState({ currentLRC: [], currentLyricIndex: -1 });
            renderLyrics();
        }
        // 🌟 新增結束 🌟

        DOM_ELEMENTS.audio.load();
        DOM_ELEMENTS.playerTitle.textContent = `正在播放：${track.title} (緩衝中...)`; // 🎯 修正：增加緩衝提示
        
        // 🎯 修正：只嘗試播放，如果瀏覽器限制，會在 canplaythrough 再次嘗試
        DOM_ELEMENTS.audio.play().catch(error => {
            console.error("PlayTrack: 自動播放失敗，等待 canplaythrough 或用戶點擊。", error);
            // 不在這裡做任何標題更改，讓 handleCanPlayThrough 或用戶操作來解決
        });

        updatePlaylistHighlight();
        window.location.hash = `song-index-${track.originalIndex}`;

    } else if (index === currentPlaylist.length) {
        DOM_ELEMENTS.audio.pause();
        DOM_ELEMENTS.playerTitle.textContent = "播放列表已結束";
        // 設置停止標記
        setState({ currentTrackIndex: -1, isStoppedAtEnd: true });
        updatePlaylistHighlight();
        window.location.hash = '';
    }
}

export function playNextTrack() {
    const { currentPlaylist, currentTrackIndex } = getState();
    if (currentPlaylist.length === 0) return;

    let nextIndex;
    
    // 🎯 修正：手動切歌總是使用順序循環邏輯
    // 如果不是最後一首歌，則播放下一首
    if (currentTrackIndex < currentPlaylist.length - 1) {
        nextIndex = currentTrackIndex + 1;
    } else {
        // 已經到達列表末尾，循環到第一首
        nextIndex = 0;
    }
    
    playTrack(nextIndex);
}

export function playPreviousTrack() {
    const { currentPlaylist, currentTrackIndex } = getState();
    if (currentPlaylist.length === 0) return;

    let prevIndex;
    
    // 🎯 修正：手動切歌總是使用順序循環邏輯
    // 如果不是第一首歌，則播放上一首
    if (currentTrackIndex > 0) {
        prevIndex = currentTrackIndex - 1;
    } else {
        // 已經到達列表開頭，循環到最後一首
        prevIndex = currentPlaylist.length - 1;
    }
    
    playTrack(prevIndex);
}

// --- 模式切換邏輯 ---

export function togglePlayMode() {
    let { playMode } = getState();
    // 播放模式: 0 (順序停止) -> 1 (單曲循環) -> 2 (隨機) -> 3 (自由) -> 4 (順序循環) -> 0...
    playMode = (playMode + 1) % 5;
    setState({ playMode });

    updateModeUI();
    DOM_ELEMENTS.playerTitle.textContent = `已切換到 ${DOM_ELEMENTS.modeButton.textContent.replace('[ 模式: ', '').replace(' ]', '')}`;
    saveSettings();
}

export async function toggleDataMode() {
    let { dataMode } = getState();
    dataMode = (dataMode === 'local') ? 'global' : 'local';
    setState({ dataMode });

    updateDataModeUI();
    saveSettings();

    // 🎯 修正：在重新載入播放器（初始化）之前，明確停止所有計時器
    handlePause();
    DOM_ELEMENTS.playerTitle.textContent = `數據模式已切換為：${(dataMode === 'global' ? '全球統計' : '本地統計')}`;
    await initializePlayer(true);
}

// --- 播放列表顯示與排序邏輯 ---

function getTrackDisplayInfo(track) {
    const { dataMode, globalTrackPlayCounts, trackPlayCounts } = getState();
    const originalIndex = track.originalIndex;
    const originalText = track.title + ' - ' + track.artist;

    let playCount = 0;
    if (dataMode === 'global') {
        playCount = globalTrackPlayCounts[track.id] || 0;
    } else {
        playCount = trackPlayCounts[originalIndex] || 0;
    }

    return { originalText, playCount };
}

function renderPlaylist() {
    const { currentPlaylist } = getState();
    DOM_ELEMENTS.playlistUl.innerHTML = '';
    const fragment = document.createDocumentFragment();

    currentPlaylist.forEach((track, index) => {
        const li = document.createElement('li');
        
        // 🎯 修正：使用正在播放歌曲的 originalIndex 查找
        li.setAttribute('data-original-index', track.originalIndex); // 🌟 關鍵修正：使用固定索引
        li.setAttribute('data-index', index); // 保留 data-index 給 playTrack(index) 傳參用，但高光不用它
        li.setAttribute('tabindex', '0'); // 🌟 A11Y 增強：允許聚焦

        const { originalText, playCount } = getTrackDisplayInfo(track);
        li.textContent = originalText;

        if (playCount > 0) {
            const countSpan = document.createElement('small');
            countSpan.className = 'play-stats';
            countSpan.textContent = ` (${playCount} 次播放)`;
            countSpan.style.fontSize = '0.8em';
            countSpan.style.color = '#888';
            countSpan.style.marginLeft = '10px';
            li.appendChild(countSpan);
        }

        const playTrackAction = () => {
            // 🎯 修正：點擊時使用當前的 index
            playTrack(index);

            // ⭐️ 核心修正：在 action 內部再次從狀態中獲取當前 playMode 的值
            if (getState().playMode !== 3) {
                setState({ playMode: 3 });
                updateModeUI();
                saveSettings();
            }
        };

        li.addEventListener('click', playTrackAction);
        
        // 🌟 A11Y 增強：支持鍵盤 Enter/Space 觸發點擊
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playTrackAction();
            }
        });

        fragment.appendChild(li);
    });

    DOM_ELEMENTS.playlistUl.appendChild(fragment);

    // 🎯 修正：將高光操作延遲到當前同步代碼塊完成之後執行
    setTimeout(() => {
        updatePlaylistHighlight(true);
    }, 0);
}

function sortPlaylistByPlayCount() {
    let { currentPlaylist, currentTrackIndex } = getState();

    // 🎯 修正：如果當前列表不是主列表的子集（例如正在篩選），則不排序
    if (currentPlaylist.length !== MASTER_TRACK_LIST.length) {
        renderPlaylist();
        return;
    }

    const sortableList = [...MASTER_TRACK_LIST].map(track => {
        const { playCount } = getTrackDisplayInfo(track);
        return { ...track, playCount: playCount };
    });

    sortableList.sort((a, b) => {
        if (b.playCount !== a.playCount) {
            return b.playCount - a.playCount;
        }
        return a.originalIndex - b.originalIndex;
    });

    // 🎯 修正：在排序前，確定當前播放歌曲的原始索引
    const currentlyPlayingOriginalIndex = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[currentTrackIndex].originalIndex : -1;

    setState({ currentPlaylist: sortableList });
    currentPlaylist = sortableList; // 更新本地引用

    if (currentlyPlayingOriginalIndex !== -1) {
        // 🎯 修正：重新映射 currentTrackIndex
        const newIndex = currentPlaylist.findIndex(track => track.originalIndex === currentlyPlayingOriginalIndex);
        setState({ currentTrackIndex: newIndex !== -1 ? newIndex : 0 });
    } else {
        setState({ currentTrackIndex: 0 });
    }

    renderPlaylist();

    if (currentTrackIndex !== -1 && currentTrackIndex < currentPlaylist.length && !DOM_ELEMENTS.audio.paused && !DOM_ELEMENTS.playlistSearchInput.value.trim()){
        const track = currentPlaylist[currentTrackIndex];
        DOM_ELEMENTS.playerTitle.textContent = `正在播放：${track.title} (歌單已排序)`;
    }
}

function filterPlaylist() {
    const searchText = DOM_ELEMENTS.playlistSearchInput.value.toLowerCase().trim();

    if (searchText.length > 0) {
        // --- 篩選邏輯 ---
        let newPlaylist = MASTER_TRACK_LIST.filter(track => {
            const itemText = (track.title + ' ' + track.artist).toLowerCase();
            return itemText.includes(searchText);
        });

        // 1. 儲存舊的播放歌曲的 originalIndex
        let { currentTrackIndex, currentPlaylist } = getState();
        const playingOriginalIndex = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[currentTrackIndex].originalIndex : -1;

        // 2. 更新狀態為新列表
        setState({ currentPlaylist: newPlaylist });
        
        handlePause(); // 清除計時器
        DOM_ELEMENTS.audio.pause(); // 確保暫停
        setState({ isStoppedAtEnd: false }); // 清除停止標記以防干擾

        if (newPlaylist.length === 0) {
            DOM_ELEMENTS.playerTitle.textContent = `未找到與 "${searchText}" 相關的歌曲。`;
            setState({ currentTrackIndex: -1 });
        } else {
            // 3. 檢查正在播放的歌曲是否在新列表內
            let newIndex = -1;
            if (playingOriginalIndex !== -1) {
                newIndex = newPlaylist.findIndex(track => track.originalIndex === playingOriginalIndex);
            }

            if (newIndex !== -1) {
                // A. 如果正在播放的歌曲還在列表中，高光它
                setState({ currentTrackIndex: newIndex });
                DOM_ELEMENTS.playerTitle.textContent = `篩選結果 (${newPlaylist.length} 首)。`;
            } else {
                // B. 如果不在列表中，將索引設為 0
                setState({ currentTrackIndex: 0 });
                DOM_ELEMENTS.playerTitle.textContent = `已根據篩選建立新歌單 (${newPlaylist.length} 首)。請點擊播放。`;
            }
        }

        // 🎯 修正：篩選完成後，必須重新渲染播放列表 UI
        renderPlaylist(); // <--- 新增這行

    } else {
        // --- 退出篩選邏輯 ---
        let { currentTrackIndex, currentPlaylist } = getState();
        
        // 🎯 修正：退出篩選時，我們應該找回上次播放的歌曲的 originalIndex，而不是當前篩選列表的索引。
        const currentlyPlayingOriginalIndex = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[currentTrackIndex].originalIndex : -1;

        handlePause();
        resetCurrentPlaylist();
        DOM_ELEMENTS.playerTitle.textContent = "我的音樂播放器";
        
        sortPlaylistByPlayCount(); // 排序並在內部調用 renderPlaylist()

        // 手動修正索引 (重新獲取狀態，因為 sortPlaylistByPlayCount 可能會改變它)
        ({ currentTrackIndex, currentPlaylist } = getState());

        if (currentlyPlayingOriginalIndex !== -1) {
            // 根據上次播放的 originalIndex 找到它在恢復後的總歌單中的新位置
            const newIndex = currentPlaylist.findIndex(track => track.originalIndex === currentlyPlayingOriginalIndex);
            if (newIndex !== -1) {
                setState({ currentTrackIndex: newIndex });
            } else {
                // 這不應該發生，但作為防護
                setState({ currentTrackIndex: 0 });
            }
        } else if (currentTrackIndex === -1 || currentTrackIndex >= currentPlaylist.length) {
            setState({ currentTrackIndex: 0 });
        }

        DOM_ELEMENTS.audio.pause();
        // renderPlaylist() 會在 sortPlaylistByPlayCount() 內部被調用，並帶有 setTimeout(0) 修正。
    }
}

// --- 外部呼叫函數 (用於 URL 錨點) ---
/**
 * @param {number} originalIndex - 歌曲在 Master List 中的原始索引
 */
export function loadTrack(originalIndex) {

    const isFiltered = DOM_ELEMENTS.playlistSearchInput.value.trim().length > 0;
    if (isFiltered) {
        DOM_ELEMENTS.playlistSearchInput.value = '';
        filterPlaylist();
    }

    const { currentPlaylist } = getState();
    const newIndex = currentPlaylist.findIndex(track => track.originalIndex === originalIndex);

    if (newIndex !== -1) {
        // 🎯 修正：點擊外部連結時設置為自由模式
        if (getState().playMode !== 3) {
            setState({ playMode: 3 });
            updateModeUI();
            saveSettings();
        }
        playTrack(newIndex);
    } else {
        console.error(`loadTrack 錯誤: 歌曲 (原始索引: ${originalIndex}) 在當前歌單中找不到。`);
        DOM_ELEMENTS.playerTitle.textContent = `錯誤：歌曲找不到。請手動點擊歌單中的其他歌曲。`;
    }
}

// --- 事件處理函數 ---
function handleTrackEnd() {
    const { playMode, currentTrackIndex, currentPlaylist } = getState();

    // 增量播放次數
    incrementPlayCount();
    sortPlaylistByPlayCount();
    saveSettings();

    if (playMode === 1) {
        // 🎯 修正：在單曲循環模式下，重置歌詞高亮索引
        setState({ currentLyricIndex: -1, isStoppedAtEnd: false });
        DOM_ELEMENTS.audio.currentTime = 0;
        DOM_ELEMENTS.audio.play();
        updatePlaylistHighlight();
        return;
    }

    if (playMode === 3) {
        DOM_ELEMENTS.audio.pause();
        DOM_ELEMENTS.playerTitle.textContent = "自由模式下，歌曲播放完畢。請點擊 ▶ 重新播放。";
        // ✅ 核心修正：保留 currentTrackIndex，僅設置停止標記並重設歌詞索引
        setState({ isStoppedAtEnd: true, currentLyricIndex: -1 });
        updatePlaylistHighlight();
        window.location.hash = '';
        return;
    }

    let nextIndex;

    if (playMode === 2) {
        setState({ isStoppedAtEnd: false });
        nextIndex = getNextRandomIndex();
    } else if (playMode === 4) {
        setState({ isStoppedAtEnd: false });
        nextIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    } else {
        // 模式 0 (順序停止)
        if (currentTrackIndex < currentPlaylist.length - 1) {
            setState({ isStoppedAtEnd: false });
            nextIndex = currentTrackIndex + 1;
        } else {
            // 模式 0 (順序停止) 的終止邏輯
            DOM_ELEMENTS.audio.pause();
            DOM_ELEMENTS.playerTitle.textContent = "播放列表已結束";
            // 🎯 最終決定：僅設置停止標記，讓 currentTrackIndex 保留最後一首歌的索引
            setState({ isStoppedAtEnd: true, currentLyricIndex: -1 }); // ⚠️ 重設歌詞索引
            updatePlaylistHighlight();
            window.location.hash = '';
            return;
        }
    }

    if (nextIndex !== undefined && nextIndex !== -1) {
        playTrack(nextIndex);
    }
}

function incrementPlayCount() {
    const { currentTrackIndex, currentPlaylist, trackPlayCounts } = getState();

    if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
        const track = currentPlaylist[currentTrackIndex];
        const key = track.originalIndex;
        const newCounts = { ...trackPlayCounts };
        newCounts[key] = (newCounts[key] || 0) + 1;
        setState({ trackPlayCounts: newCounts });

        try {
            localStorage.setItem(STORAGE_KEYS.PLAY_COUNT, JSON.stringify(newCounts));
        } catch (e) {
            console.warn('無法儲存播放次數到 LocalStorage.', e);
        }

        if (typeof gtag === 'function') {
            gtag('event', 'song_played', { 'song_index': key, 'song_title': track.title });
            console.log(`GA4 事件發送成功: song_played, 歌曲ID: ${key}, 標題: ${track.title}`);
        }
    }
}

function handlePlay() {
    let {
        currentTrackIndex, currentPlaylist, isStoppedAtEnd
    } = getState();

    // 🎯 修正核心：只有在歌曲停止在末尾時才執行重啟邏輯
    if (isStoppedAtEnd === true) {
        // 1. 清除停止標記
        setState({ isStoppedAtEnd: false });

        // 確保索引有效，如果無效則設為 0
        let indexToPlay = currentTrackIndex;
        if (indexToPlay === -1 || indexToPlay >= currentPlaylist.length) {
            indexToPlay = 0;
        }

        if (indexToPlay !== -1 && currentPlaylist.length > 0) {
            // 1. 更新狀態和 UI（不包含 audio.play()）
            setState({ currentTrackIndex: indexToPlay, currentLyricIndex: -1 }); // 重設歌詞索引
            const track = currentPlaylist[indexToPlay];

            // 2. 載入新的音源 (強制重啟)
            if (track.sources && Array.isArray(track.sources)) {
                DOM_ELEMENTS.audio.innerHTML = '';
                track.sources.forEach(src => {
                    const sourceEl = document.createElement('source');
                    sourceEl.src = src;
                    sourceEl.type = getMimeType(src);
                    DOM_ELEMENTS.audio.appendChild(sourceEl);
                });
                DOM_ELEMENTS.audio.load(); // 💡 關鍵：開始載入新資源
            }

            // 3. 載入歌詞 (容錯處理)
            if (track.lrcPath) {
                fetchLRC(track.lrcPath).then(lrcText => {
                    const parsedLRC = lrcText ? parseLRC(lrcText) : []; // 🎯 修正：容錯處理
                    setState({ currentLRC: parsedLRC, currentLyricIndex: -1 });
                    renderLyrics();
                }).catch(error => {
                    console.error(`歌詞文件加載失敗 (${track.lrcPath}):`, error);
                    setState({ currentLRC: [], currentLyricIndex: -1 }); // 🎯 修正：容錯處理
                    renderLyrics();
                });
            } else {
                setState({ currentLRC: [], currentLyricIndex: -1 }); // 🎯 修正：容錯處理
                renderLyrics();
            }

            // 4. 更新 UI (標題和高光)
            DOM_ELEMENTS.playerTitle.textContent = `正在播放：${track.title} (緩衝中...)`; // 增加緩衝提示
            updatePlaylistHighlight();
            window.location.hash = `song-index-${track.originalIndex}`;
            /*
            if (DOM_ELEMENTS.audio.paused) {
                DOM_ELEMENTS.audio.play().catch(e => {
                    // 忽略自動播放錯誤，等待 canplaythrough
                });
            }
            */
            // ⚠️ 修正：交由 handleCanPlayThrough 處理播放啟動
        } else {
            // 如果列表為空，則不做任何事情
            return;
        }
    }


    // 不論是否是 isStoppedAtEnd === true，都嘗試啟動計時器和數據庫記錄。
    startPlayerTimers();
    saveSettings();
}
// --- handlePlay 修正結束 ---

function startPlayerTimers() {
    let {
        listenIntervalId, scoreTimerIntervalId, lyricsIntervalId,
        currentTrackIndex, currentPlaylist
    } = getState();

    // 🎯 修正：確保計時器只啟動一次
    if (listenIntervalId === null) {
        listenIntervalId = setInterval(updateTotalListenTime, 1000);
        setState({ listenIntervalId });
    }

    // 🎯 修正：確保計時器只啟動一次
    if (scoreTimerIntervalId === null) {
        scoreTimerIntervalId = setInterval(window.updateMusicScore || (() => console.warn('updateMusicScore not defined')), 1000);
        setState({ scoreTimerIntervalId });
    }

    // 🎯 修正：確保計時器只啟動一次
    if (lyricsIntervalId === null) {
        lyricsIntervalId = setInterval(syncLyrics, 100);
        setState({ lyricsIntervalId });
    }

    // 確保只有在歌曲有效時才發送數據庫記錄
    if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
        const currentSongId = currentPlaylist[currentTrackIndex].id;
        trackPlayToDatabase(currentSongId);
    }
}

function handlePause() {
    // 🎯 修正：確保解構 lyricsIntervalId
    const { listenIntervalId, scoreTimerIntervalId, lyricsIntervalId } = getState();

    if (listenIntervalId !== null) {
        clearInterval(listenIntervalId);
        // 🎯 修正：通過 setState 更新全局狀態
        setState({ listenIntervalId: null });
    }
    if (scoreTimerIntervalId !== null) {
        clearInterval(scoreTimerIntervalId);
        // 🎯 修正：通過 setState 更新全局狀態
        setState({ scoreTimerIntervalId: null });
    }

    // 🎯 修正：停止歌詞同步計時器並通過 setState 更新
    if (lyricsIntervalId !== null) {
        clearInterval(lyricsIntervalId);
        setState({ lyricsIntervalId: null });
    }

    saveSettings();
}

function handleTimeUpdate() {
    // 每 5 秒保存一次播放時間
    // 只有在非停止狀態，且音頻正在播放時才保存時間
    if (!DOM_ELEMENTS.audio.paused && getState().isStoppedAtEnd === false && DOM_ELEMENTS.audio.currentTime % 5 < 1) {
        saveSettings();
    }
    
    // 💡 關鍵：手動調用歌詞同步 (在 timeupdate 中檢查，以防 100ms 計時器出錯)
    // 由於我們已經在 startPlayerTimers 中設置了 lyricsIntervalId，這行可以移除或保留作為額外防護
    // syncLyrics();
}

function handleAudioError(e) {
    if (!e.target.error) return;

    // 🎯 修正：在發生錯誤時，同時暫停所有計時器
    handlePause();

    const audio = DOM_ELEMENTS.audio;

    switch (e.target.error.code) {
        case audio.error.MEDIA_ERR_ABORTED:
            console.warn('音頻載入被終止。');
            break;
        case audio.error.MEDIA_ERR_NETWORK:
            console.error('音頻網絡錯誤：無法獲取音源文件。所有來源可能都已失敗或 CDN 服務中斷。');
            DOM_ELEMENTS.playerTitle.textContent = `播放失敗：網絡錯誤或 CDN 連結失效。`;
            break;
        case audio.error.MEDIA_ERR_DECODE:
            console.error('音頻解碼錯誤：文件可能損壞或格式不支持。');
            DOM_ELEMENTS.playerTitle.textContent = `播放失敗：文件解碼錯誤。`;
            break;
        case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            console.error('音頻格式不受支持或所有備援來源均已耗盡。');
            DOM_ELEMENTS.playerTitle.textContent = `播放失敗：音源格式不受支持或所有備援失敗。`;
            break;
        default:
            console.error(`發生未知播放錯誤 (代碼: ${e.target.error.code})`);
            DOM_ELEMENTS.playerTitle.textContent = `播放失敗：未知錯誤。`;
            break;
    }
}

function handleCanPlayThrough() {
    const { currentTrackIndex, currentPlaylist } = getState();

    // 只有在 audio 處於暫停狀態，並且當前有歌曲時才嘗試播放
    if (DOM_ELEMENTS.audio.paused && currentTrackIndex >= 0) {
        const track = currentPlaylist[currentTrackIndex];
        DOM_ELEMENTS.audio.play().then(() => {
            // 播放成功後，更新 UI 顯示狀態
            DOM_ELEMENTS.playerTitle.textContent = `正在播放：${track.title}`;
        }).catch(error => {
            // 如果此時仍然播放失敗 (如瀏覽器限制)，提示用戶手動點擊
            DOM_ELEMENTS.playerTitle.textContent = `自動播放失敗，請點擊播放：${track.title}`;
            console.error("CanPlayThrough 後嘗試播放失敗:", error);
        });

    } else if (!DOM_ELEMENTS.audio.paused && currentTrackIndex >= 0) {
        // 如果已經在播放，只需更新標題（移除緩衝中...）
        const track = currentPlaylist[currentTrackIndex];
        if (DOM_ELEMENTS.playerTitle.textContent.includes("緩衝中...")) {
            DOM_ELEMENTS.playerTitle.textContent = `正在播放：${track.title}`;
        }
    }

    // 確保計時器啟動，防止 timeupdate 丟失
    startPlayerTimers();
}

function handleUrlAnchor(isInitialLoad = false) {
    const hash = window.location.hash;

    if (hash.startsWith('#song-index-')) {
        const parts = hash.split('-');
        const originalIndex = parseInt(parts[parts.length - 1]);

        if (!isNaN(originalIndex) && originalIndex >= 0 && originalIndex < MASTER_TRACK_LIST.length) {
            const trackTitle = MASTER_TRACK_LIST[originalIndex].title;
            
            // 🎯 修正：使用 loadTrack 統一邏輯
            loadTrack(originalIndex);

            if (isInitialLoad) {
                // 這是為了確保初始載入時的 UI 提示
            }

            // 🎯 修正：移除額外的 playing 監聽器和 play() 調用，讓 playTrack 和 handleCanPlayThrough 處理播放流程
            DOM_ELEMENTS.playerTitle.textContent = `從分享連結載入：${trackTitle} (正在緩衝...)`;
        }
    }
}

// --- 初始化與事件綁定 ---

async function initializePlayer(isManualToggle = false) {

    loadSavedSettings();
    
    // 🎯 修正點 4/5：確保播放模式和停止狀態的預設值
    let { playMode, isStoppedAtEnd } = getState();
    
    if (typeof playMode !== 'number' || playMode < 0 || playMode > 4) {
        setState({ playMode: 0 }); // 順序停止
    }
    
    if (typeof isStoppedAtEnd !== 'boolean') {
        setState({ isStoppedAtEnd: false });
    }

    // 當重新初始化時，確保停止標記被清除，除非是通過列表結束的邏輯導致的暫停
    if (isStoppedAtEnd === false && DOM_ELEMENTS.audio.paused) {
        setState({ currentLyricIndex: -1 });
        renderLyrics();
    }
    
    let { dataMode } = getState();

    if (dataMode === 'global') {
        const counts = await fetchGlobalPlayCounts();
        setState({ globalTrackPlayCounts: counts });
    }

    updateDataModeUI();

    if (DOM_ELEMENTS.playlistSearchInput.value.trim().length > 0) {
        filterPlaylist();
    } else {
        resetCurrentPlaylist();
        sortPlaylistByPlayCount();
    }

    const lastPlayedOriginalIndex = window.__LAST_PLAYED_ORIGINAL_INDEX;
    let { currentPlaylist } = getState();

    // 將上次播放的索引暫存從 window 移除，不管有沒有找到
    delete window.__LAST_PLAYED_ORIGINAL_INDEX;

    // 1. 設置 currentTrackIndex
    if (lastPlayedOriginalIndex !== -1) {
        const newIndex = currentPlaylist.findIndex(track => track.originalIndex === lastPlayedOriginalIndex);
        setState({ currentTrackIndex: newIndex !== -1 ? newIndex : 0 });
    } else {
        // 初次訪問，沒有上次播放記錄，設置為播放列表第一首，但不要加載它
        setState({ currentTrackIndex: 0 });
    }
    
    let { currentTrackIndex } = getState();

    if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
        const track = currentPlaylist[currentTrackIndex];

        // 2. 核心修正：根據是否有上次播放記錄來決定顯示的 UI 標題
        if (lastPlayedOriginalIndex !== -1) {
            // 情況 A: 找到上次播放的歌曲
            DOM_ELEMENTS.playerTitle.textContent = `上次播放：${track.title}`;
        } else {
            // 情況 B: 首次訪問/無記錄
            DOM_ELEMENTS.playerTitle.textContent = `我的音樂播放器`; // 修正為中性標題
        }

        // 3. 最終設置音頻狀態 (CDN 備援/格式備援邏輯)
        if (track.sources && Array.isArray(track.sources)) {
            DOM_ELEMENTS.audio.innerHTML = '';
            track.sources.forEach(src => {
                const sourceEl = document.createElement('source');
                sourceEl.src = src;
                // 🌟 使用輔助函數統一 MIME 類型邏輯 🌟
                sourceEl.type = getMimeType(src);
                DOM_ELEMENTS.audio.appendChild(sourceEl);
            });
            DOM_ELEMENTS.audio.load();
        }

        // 4. 處理上次播放時間
        const savedTime = localStorage.getItem(STORAGE_KEYS.LAST_TIME);
        if (savedTime !== null) {
            const time = parseFloat(savedTime);
            if (!isNaN(time) && time > 0) {
                DOM_ELEMENTS.audio.currentTime = time;
                localStorage.removeItem(STORAGE_KEYS.LAST_TIME);
            }
        }

        updatePlaylistHighlight();
    } else {
        setState({ currentTrackIndex: -1 });
        DOM_ELEMENTS.playerTitle.textContent = "我的音樂播放器 (無歌曲)";
    }

    initializeTheme();

    // 🎯 修正步驟 2：只有在第一次初始化時才綁定事件
    if (!hasInitializedListeners) {
        bindEventListeners();
        hasInitializedListeners = true;
    }
}

function bindEventListeners() {
    // 🎯 修正核心：如果已經初始化，則直接返回
    if (hasInitializedListeners) return;

    // 播放器事件
    DOM_ELEMENTS.audio.addEventListener('volumechange', saveSettings);
    DOM_ELEMENTS.audio.addEventListener('ratechange', saveSettings);
    DOM_ELEMENTS.audio.addEventListener('loadedmetadata', saveSettings);
    DOM_ELEMENTS.audio.addEventListener('timeupdate', handleTimeUpdate);
    
    // 注意：handlePlay 和 handlePause 現在處理 isStoppedAtEnd 狀態
    DOM_ELEMENTS.audio.addEventListener('play', handlePlay);
    DOM_ELEMENTS.audio.addEventListener('pause', handlePause);
    DOM_ELEMENTS.audio.addEventListener('ended', handleTrackEnd);
    DOM_ELEMENTS.audio.addEventListener('error', handleAudioError, true);
    DOM_ELEMENTS.audio.addEventListener('canplaythrough', handleCanPlayThrough);

    // 搜索欄事件
    DOM_ELEMENTS.playlistSearchInput.addEventListener('input', debounce(filterPlaylist, 300));

    // 主題切換事件
    DOM_ELEMENTS.themeToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // <--- 🚨 新增：防止按鈕點擊時被全局點擊事件立即關閉
        const isExpanded = DOM_ELEMENTS.themeMenu.classList.toggle('hidden-menu');
        // 🌟 A11Y 增強：設置 aria-expanded
        DOM_ELEMENTS.themeToggleBtn.setAttribute('aria-expanded', !isExpanded);

        if (!DOM_ELEMENTS.timerMenu.classList.contains('hidden-menu')) {
            DOM_ELEMENTS.timerMenu.classList.add('hidden-menu');
            DOM_ELEMENTS.timerToggleButton.setAttribute('aria-expanded', false);
        }
    });

    // 🌟 修正：直接將 toggleTimerMenu 函數作為事件處理器綁定
    DOM_ELEMENTS.timerToggleButton.addEventListener('click', toggleTimerMenu);

    // 🌟 A11Y 增強：主題菜單項
    DOM_ELEMENTS.themeOptions.forEach(option => {
        const clickAction = (e) => {
            e.stopPropagation(); // <--- 🚨 新增：防止點擊事件被干擾
            const selectedTheme = e.currentTarget.getAttribute('data-theme');
            applyTheme(selectedTheme, true);
            DOM_ELEMENTS.themeMenu.classList.add('hidden-menu');
            DOM_ELEMENTS.themeToggleBtn.setAttribute('aria-expanded', false);
        };

        option.addEventListener('click', clickAction);
        
        // 支持鍵盤 Enter/Space 觸發
        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // 必須使用 clickAction，因為 e.currentTarget 可能已經被替換為內層元素
                clickAction(e);
            }
        });
    });

    // 🌟 A11Y 增強：定時器菜單項
    // 注意：定時器的菜單項因為是內聯 `onclick`，我們需要用不同的方式處理鍵盤事件。
    DOM_ELEMENTS.timerMenu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // 模擬點擊來觸發內聯 onclick
                item.click();
            }
        });
    });

    // --- 全局點擊事件 (用於關閉菜單) ---
    document.addEventListener('click', (e) => {
        const target = e.target;

        // 關閉主題菜單
        if (!DOM_ELEMENTS.themeMenu.contains(target) && !DOM_ELEMENTS.themeToggleBtn.contains(target)) {
            DOM_ELEMENTS.themeMenu.classList.add('hidden-menu');
            DOM_ELEMENTS.themeToggleBtn.setAttribute('aria-expanded', false);
        }

        // 關閉定時器菜單
        if (!DOM_ELEMENTS.timerMenu.contains(target) && !DOM_ELEMENTS.timerToggleButton.contains(target)) {
            DOM_ELEMENTS.timerMenu.classList.add('hidden-menu');
            DOM_ELEMENTS.timerToggleButton.setAttribute('aria-expanded', false);
        }
    });

    // 每小時自動檢查主題
    setInterval(() => {
        const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        if (storedTheme === THEMES.LIGHT) {
            applyTheme(THEMES.LIGHT, false);
        }
    }, 1000 * 60 * 60);

    // 🎯 修正：設置標記為已初始化
    hasInitializedListeners = true;
}

// --- 初始啟動 (DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
    initializePlayer();
    handleUrlAnchor(true);
});

// 🌟 核心優化：集中暴露給全局空間的函數 (供 HTML 內聯 onclick / URL 錨點使用)
const globalExposedFunctions = {
    playNextTrack,
    playPreviousTrack,
    togglePlayMode,
    toggleDataMode,
    //toggleTimerMenu, // 由於我們現在直接綁定，這裡可以註釋掉或保留
    setSleepTimer,
    clearSleepTimer,
    loadTrack
};

// 避免重複定義 window 上的函數，同時將所有需要的函數導出
Object.keys(globalExposedFunctions).forEach(key => {
    window[key] = globalExposedFunctions[key];
});

// 導出 initializePlayer，以防外部代碼需要重新初始化
export { initializePlayer };
