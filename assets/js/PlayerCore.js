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

// --- 數據模式相關函數 (API) ---

function trackPlayToDatabase(song_id) {
    const { currentPlaylist, currentTrackIndex } = getState();
    if (typeof song_id === 'undefined' || song_id === null) {
        console.warn("trackPlayToDatabase: Song ID 無效，跳過數據庫記錄。");
        return;
    }
    
    const user_id = getUserId(); 
    const currentTrack = currentPlaylist[currentTrackIndex];
    const song_title = currentTrack ? currentTrack.title : '未知歌曲'; 
    
    // 假設 /api/track 是一個處理 Supabase 寫入的後端端點
    fetch('/api/track', { 
        method: 'POST',
        body: JSON.stringify({
            user_id: user_id,
            song_id: song_id,
            title: song_title 
        }),
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
        
        alert(`無法載入全球統計數據。錯誤: ${error.message}。已自動切換到本地模式。`);
        
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
    
    if (playMode === 1) { modeText = "[ 模式: 單曲循環 ]"; } 
    else if (playMode === 2) { modeText = "[ 模式: 隨機 ]"; } 
    else if (playMode === 3) { modeText = "[ 模式: 自由 ]"; } 
    else if (playMode === 4) { modeText = "[ 模式: 順序循環 ]"; } 
    else { modeText = "[ 模式: 順序停止 ]"; }
    
    DOM_ELEMENTS.modeButton.textContent = modeText;
}

function updatePlaylistHighlight(manualScroll = false) {
    const { currentPlaylist, currentTrackIndex } = getState();
    const listItems = DOM_ELEMENTS.playlistUl.querySelectorAll('li');
    
    listItems.forEach(item => {
        item.classList.remove('playing');
    });
    
    if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
        const playingItem = Array.from(listItems).find(item => {
            const dataIndex = item.getAttribute('data-index');
            return dataIndex && parseInt(dataIndex) === currentTrackIndex;
        });
        
        if (playingItem) {
            playingItem.classList.add('playing');
            
            if (!manualScroll) {
                 playingItem.scrollIntoView({
                    behavior: 'smooth', 
                    block: 'nearest'    
                });
            }
        }
    }
}

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
    } 
    else if (desiredTheme === THEMES.LIGHT) {
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
        `${totalListenMinutes} 分鐘 ${totalListenSeconds} 秒`;
}

function updateTimerCountdown() {
    const { endTime, countdownIntervalId } = getState();
    if (endTime > 0) {
        const remainingMs = endTime - Date.now();
        const remainingS = Math.max(0, Math.floor(remainingMs / 1000));
        
        const minutes = Math.floor(remainingS / 60);
        const seconds = remainingS % 60;
        
        DOM_ELEMENTS.remainingTimerSpan.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
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

export function toggleTimerMenu() {
    DOM_ELEMENTS.timerMenu.classList.toggle('hidden-menu');
    
    if (!DOM_ELEMENTS.themeMenu.classList.contains('hidden-menu')) {
        DOM_ELEMENTS.themeMenu.classList.add('hidden-menu');
    }
}
window.toggleTimerMenu = toggleTimerMenu;

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

    setState({ 
        sleepTimerId: timerId, 
        endTime: newEndTime, 
        countdownIntervalId: intervalId 
    });
    
    DOM_ELEMENTS.timerToggleButton.textContent = `定時 (${minutes} 分鐘)`;
    DOM_ELEMENTS.playerTitle.textContent = `定時器已設置：${minutes} 分鐘後自動關閉`;
    if (DOM_ELEMENTS.audio.paused) {
        DOM_ELEMENTS.audio.play();
    }
}
window.setSleepTimer = setSleepTimer;

export function clearSleepTimer() {
    const { sleepTimerId, countdownIntervalId } = getState();

    if (sleepTimerId !== null) {
        clearTimeout(sleepTimerId);
    }
    if (countdownIntervalId !== null) {
        clearInterval(countdownIntervalId);
    }
    
    setState({ 
        sleepTimerId: null, 
        endTime: 0, 
        countdownIntervalId: null 
    });
    
    DOM_ELEMENTS.timerToggleButton.textContent = "定時 (未設定)";
    DOM_ELEMENTS.remainingTimerSpan.textContent = "--:--";
    DOM_ELEMENTS.playerTitle.textContent = "已取消定時器";
}
window.clearSleepTimer = clearSleepTimer;


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
 * @param {number} index - 歌曲在當前播放列表 currentPlaylist 中的索引
 */
export function playTrack(index) {
    const { currentPlaylist } = getState();
    if (index >= 0 && index < currentPlaylist.length) { 
        setState({ currentTrackIndex: index });
        const track = currentPlaylist[index]; 
        
        // --- 核心 CDN/格式備援邏輯：動態插入 <source> 標籤 ---
        DOM_ELEMENTS.audio.innerHTML = ''; 
        if (track.sources && Array.isArray(track.sources)) {
            track.sources.forEach(src => {
                const sourceEl = document.createElement('source');
                sourceEl.src = src;
                
                const ext = src.split('.').pop().toLowerCase(); 
                let type;

                // 🌟 M4A/MP4 MIME 類型優化 🌟
                if (ext === 'mp3') {
                    type = 'audio/mpeg';
                } else if (ext === 'm4a' || ext === 'aac') {
                    type = 'audio/mp4'; 
                } else if (ext === 'ogg' || ext === 'oga') {
                    type = 'audio/ogg';
                } else if (ext === 'wav') {
                    type = 'audio/wav';
                } else {
                    type = `audio/${ext}`; 
                }
                
                sourceEl.type = type; 
                DOM_ELEMENTS.audio.appendChild(sourceEl);
            });
        } else {
             console.error(`歌曲 ${track.title} 缺少 sources 陣列!`);
             DOM_ELEMENTS.audio.src = ''; 
        }
        DOM_ELEMENTS.audio.load();

        DOM_ELEMENTS.playerTitle.textContent = `正在播放：${track.title}`;
        DOM_ELEMENTS.audio.play().catch(error => {
            console.error("自動播放失敗，可能是瀏覽器限制：", error);
        });
        updatePlaylistHighlight();
        
        window.location.hash = `song-index-${track.originalIndex}`; 
    } else if (index === currentPlaylist.length) { 
        DOM_ELEMENTS.audio.pause(); 
        DOM_ELEMENTS.playerTitle.textContent = "播放列表已結束";
        setState({ currentTrackIndex: -1 }); 
        updatePlaylistHighlight();
        window.location.hash = '';
    }
}


export function playNextTrack() {
    const { currentPlaylist, currentTrackIndex, playMode } = getState();
    if (currentPlaylist.length === 0) return;
    
    let nextIndex;
    
    if (playMode === 1) { 
        nextIndex = currentTrackIndex; 
    } else if (playMode === 2) { 
        nextIndex = getNextRandomIndex();
    } else { 
        if (currentTrackIndex < currentPlaylist.length - 1) {
            nextIndex = currentTrackIndex + 1;
        } else if (playMode === 4) { 
            nextIndex = 0; 
        } else { 
            DOM_ELEMENTS.audio.pause();
            DOM_ELEMENTS.playerTitle.textContent = "已到達列表末尾。";
            setState({ currentTrackIndex: currentPlaylist.length }); 
            updatePlaylistHighlight();
            window.location.hash = '';
            return;
        }
    }
    playTrack(nextIndex);
}
window.playNextTrack = playNextTrack;


export function playPreviousTrack() {
    const { currentPlaylist, currentTrackIndex, playMode } = getState();
    if (currentPlaylist.length === 0) return;
    
    let prevIndex;
    
    if (playMode === 1) { 
        prevIndex = currentTrackIndex; 
    } else if (playMode === 2) { 
        prevIndex = getNextRandomIndex();
    } else { 
        if (currentTrackIndex > 0) {
            prevIndex = currentTrackIndex - 1;
        } else if (playMode === 4) { 
            prevIndex = currentPlaylist.length - 1; 
        } else { 
            DOM_ELEMENTS.audio.pause();
            DOM_ELEMENTS.playerTitle.textContent = "已到達列表開頭。";
            setState({ currentTrackIndex: -1 });
            updatePlaylistHighlight();
            window.location.hash = '';
            return;
        }
    }
    playTrack(prevIndex);
}
window.playPreviousTrack = playPreviousTrack;


// --- 模式切換邏輯 (導出給 HTML) ---

export function togglePlayMode() {
    let { playMode } = getState();
    playMode = (playMode + 1) % 5; 
    setState({ playMode });
    
    updateModeUI();
    DOM_ELEMENTS.playerTitle.textContent = `已切換到 ${DOM_ELEMENTS.modeButton.textContent.replace('[ 模式: ', '').replace(' ]', '')}`;
    saveSettings(); 
}
window.togglePlayMode = togglePlayMode; 

export async function toggleDataMode() {
    let { dataMode } = getState();
    dataMode = (dataMode === 'local') ? 'global' : 'local';
    setState({ dataMode });
    
    updateDataModeUI();
    saveSettings(); 
    
    DOM_ELEMENTS.playerTitle.textContent = `數據模式已切換為：${(dataMode === 'global' ? '全球統計' : '本地統計')}`;
    await initializePlayer(true); 
}
window.toggleDataMode = toggleDataMode;


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
    const { currentPlaylist, currentTrackIndex, playMode } = getState();
    DOM_ELEMENTS.playlistUl.innerHTML = ''; 
    const fragment = document.createDocumentFragment();

    currentPlaylist.forEach((track, index) => {
        const li = document.createElement('li');
        li.setAttribute('data-index', index); 
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
        
        li.addEventListener('click', () => {
            playTrack(index);
            if (playMode !== 3) {
                 setState({ playMode: 3 }); 
                 updateModeUI();
                 saveSettings();
            }
        });
        fragment.appendChild(li);
    });
    
    DOM_ELEMENTS.playlistUl.appendChild(fragment);
    updatePlaylistHighlight(true);
}

function sortPlaylistByPlayCount() {
    let { currentPlaylist, currentTrackIndex } = getState();

    if (currentPlaylist.length !== MASTER_TRACK_LIST.length) {
         renderPlaylist(); 
         return;
    }
    
    const sortableList = [...MASTER_TRACK_LIST].map(track => {
        const { playCount } = getTrackDisplayInfo(track);
        return { ...track, playCount: playCount };
    });
    
    sortableList.sort((a, b) => {
        if (b.playCount !== a.playCount) { return b.playCount - a.playCount; }
        return a.originalIndex - b.originalIndex; 
    });
    
    const currentlyPlayingOriginalIndex = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length
        ? currentPlaylist[currentTrackIndex].originalIndex 
        : -1; 
        
    setState({ currentPlaylist: sortableList });
    currentPlaylist = sortableList; // 更新本地引用

    
    if (currentlyPlayingOriginalIndex !== -1) {
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
        let newPlaylist = MASTER_TRACK_LIST.filter(track => { 
            const itemText = (track.title + ' ' + track.artist).toLowerCase(); 
            return itemText.includes(searchText);
        });

        setState({ currentPlaylist: newPlaylist });

        if (getState().listenIntervalId !== null) {
            clearInterval(getState().listenIntervalId); 
            setState({ listenIntervalId: null });
        }

        if (newPlaylist.length === 0) {
            DOM_ELEMENTS.playerTitle.textContent = `未找到與 "${searchText}" 相關的歌曲。`;
            DOM_ELEMENTS.audio.pause(); 
            setState({ currentTrackIndex: -1 });
            
        } else {
             DOM_ELEMENTS.playerTitle.textContent = `已根據篩選建立新歌單 (${newPlaylist.length} 首)。請點擊播放。`;
             setState({ currentTrackIndex: 0 }); 
             DOM_ELEMENTS.audio.pause(); 
        }
    } else {
        resetCurrentPlaylist(); 
        DOM_ELEMENTS.playerTitle.textContent = "我的音樂播放器";
        
        if (getState().listenIntervalId !== null) {
            clearInterval(getState().listenIntervalId); 
            setState({ listenIntervalId: null });
        }
        
        let { currentTrackIndex, currentPlaylist } = getState();
        if (currentTrackIndex === -1 || currentTrackIndex >= currentPlaylist.length) {
            setState({ currentTrackIndex: 0 }); 
        }
        DOM_ELEMENTS.audio.pause(); 
    }
    
    sortPlaylistByPlayCount(); 
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
window.loadTrack = loadTrack;


// --- 事件處理函數 ---
function handleTrackEnd() {
    const { playMode, currentTrackIndex, currentPlaylist } = getState();

    // 增量播放次數
    incrementPlayCount(); 
    sortPlaylistByPlayCount();
    saveSettings(); 
    
    if (playMode === 1) { 
        DOM_ELEMENTS.audio.currentTime = 0; 
        DOM_ELEMENTS.audio.play();
        updatePlaylistHighlight(); 
        return; 
    } 
    
    if (playMode === 3) { 
        DOM_ELEMENTS.audio.pause();
        DOM_ELEMENTS.playerTitle.textContent = "自由模式下，歌曲播放完畢。";
        setState({ currentTrackIndex: -1 }); 
        updatePlaylistHighlight(); 
        window.location.hash = ''; 
        return; 
    } 
    
    let nextIndex;
    
    if (playMode === 2) { 
        nextIndex = getNextRandomIndex();
    } else if (playMode === 4) { 
        nextIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    } else { 
        if (currentTrackIndex < currentPlaylist.length - 1) { 
            nextIndex = currentTrackIndex + 1;
        } else {
            DOM_ELEMENTS.audio.pause();
            DOM_ELEMENTS.playerTitle.textContent = "播放列表已結束";
            setState({ currentTrackIndex: -1 }); 
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
            gtag('event', 'song_played', {
                'song_index': key,           
                'song_title': track.title    
            });
            console.log(`GA4 事件發送成功: song_played, 歌曲ID: ${key}, 標題: ${track.title}`);
        } 
    }
}

function handlePlay() {
    let { listenIntervalId, scoreTimerIntervalId, currentTrackIndex, currentPlaylist } = getState();

    if (listenIntervalId === null) {
        listenIntervalId = setInterval(updateTotalListenTime, 1000);
        setState({ listenIntervalId });
    }
    
    if (scoreTimerIntervalId === null) {
        // 假設 updateMusicScore 函數已定義或在 window 上
        scoreTimerIntervalId = setInterval(window.updateMusicScore || (() => console.warn('updateMusicScore not defined')), 1000); 
        setState({ scoreTimerIntervalId }); 
    }
    
    if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
        const currentSongId = currentPlaylist[currentTrackIndex].id; 
        trackPlayToDatabase(currentSongId); 
    }
    
    saveSettings(); 
}

function handlePause() {
    const { listenIntervalId, scoreTimerIntervalId } = getState();
    
    if (listenIntervalId !== null) {
        clearInterval(listenIntervalId);
        setState({ listenIntervalId: null });
    }
    
    if (scoreTimerIntervalId !== null) {
        clearInterval(scoreTimerIntervalId);
        setState({ scoreTimerIntervalId: null });
    }
    
    saveSettings();
}

function handleTimeUpdate() {
    // 每 5 秒保存一次播放時間
    if (!DOM_ELEMENTS.audio.paused && DOM_ELEMENTS.audio.currentTime % 5 < 1) {
         saveSettings();
    }
}

function handleAudioError(e) {
    if (!e.target.error) return;
    
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

function handleUrlAnchor(isInitialLoad = false) {
    const hash = window.location.hash;
    
    if (hash.startsWith('#song-index-')) {
        const parts = hash.split('-');
        const originalIndex = parseInt(parts[parts.length - 1]);
        
        if (!isNaN(originalIndex) && originalIndex >= 0 && originalIndex < MASTER_TRACK_LIST.length) {
            
            const trackTitle = MASTER_TRACK_LIST[originalIndex].title;
            
            loadTrack(originalIndex); 
            
            if (isInitialLoad) {
                setState({ playMode: 0 }); // 順序停止
                updateModeUI();
                saveSettings();
            }
            
            DOM_ELEMENTS.playerTitle.textContent = `從分享連結載入：${trackTitle} (正在緩衝...)`;
            const handlePlaying = () => {
                 if (DOM_ELEMENTS.playerTitle.textContent.includes(trackTitle)) { 
                     DOM_ELEMENTS.playerTitle.textContent = `正在播放：${trackTitle}`;
                     DOM_ELEMENTS.audio.removeEventListener('playing', handlePlaying);
                 }
            };
            DOM_ELEMENTS.audio.addEventListener('playing', handlePlaying);
            
            DOM_ELEMENTS.audio.play().catch(error => {
                 DOM_ELEMENTS.playerTitle.textContent = `從分享載入：${trackTitle} (需點擊播放)`;
            });
        }
    }
}


// --- 初始化與事件綁定 ---

async function initializePlayer(isManualToggle = false) {
    loadSavedSettings(); 
    
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
    
    if (lastPlayedOriginalIndex !== -1) {
        const newIndex = currentPlaylist.findIndex(track => track.originalIndex === lastPlayedOriginalIndex);
        setState({ currentTrackIndex: newIndex !== -1 ? newIndex : 0 });
    } else {
        setState({ currentTrackIndex: 0 });
    }
    
    delete window.__LAST_PLAYED_ORIGINAL_INDEX; 

    let { currentTrackIndex } = getState();
    if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
        const track = currentPlaylist[currentTrackIndex];
        
        // 最終設置播放器狀態 (CDN 備援/格式備援邏輯)
        if (track.sources && Array.isArray(track.sources)) {
            DOM_ELEMENTS.audio.innerHTML = ''; 
            track.sources.forEach(src => {
                const sourceEl = document.createElement('source');
                sourceEl.src = src;
                
                const ext = src.split('.').pop().toLowerCase(); 
                let type;

                // 🌟 初始化時也使用修正後的 MIME 類型推斷 🌟
                if (ext === 'mp3') {
                    type = 'audio/mpeg';
                } else if (ext === 'm4a' || ext === 'aac') {
                    type = 'audio/mp4'; 
                } else if (ext === 'ogg' || ext === 'oga') {
                    type = 'audio/ogg';
                } else if (ext === 'wav') {
                    type = 'audio/wav';
                } else {
                    type = `audio/${ext}`; 
                }
                
                sourceEl.type = type; 
                DOM_ELEMENTS.audio.appendChild(sourceEl);
            });
            DOM_ELEMENTS.audio.load();
        } 
        
        DOM_ELEMENTS.playerTitle.textContent = `上次播放：${track.title}`;
        
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
    bindEventListeners();
}

function bindEventListeners() {
    // 播放器事件
    DOM_ELEMENTS.audio.addEventListener('volumechange', saveSettings);
    DOM_ELEMENTS.audio.addEventListener('ratechange', saveSettings); 
    DOM_ELEMENTS.audio.addEventListener('loadedmetadata', saveSettings); 
    DOM_ELEMENTS.audio.addEventListener('timeupdate', handleTimeUpdate);
    DOM_ELEMENTS.audio.addEventListener('play', handlePlay);
    DOM_ELEMENTS.audio.addEventListener('pause', handlePause);
    DOM_ELEMENTS.audio.addEventListener('ended', handleTrackEnd);
    DOM_ELEMENTS.audio.addEventListener('error', handleAudioError, true); 

    // 搜索欄事件
    DOM_ELEMENTS.playlistSearchInput.addEventListener('input', debounce(filterPlaylist, 300));
    
    // 主題切換事件
    DOM_ELEMENTS.themeToggleBtn.addEventListener('click', () => {
        DOM_ELEMENTS.themeMenu.classList.toggle('hidden-menu');
        if (!DOM_ELEMENTS.timerMenu.classList.contains('hidden-menu')) {
            DOM_ELEMENTS.timerMenu.classList.add('hidden-menu');
        }
    });
    DOM_ELEMENTS.themeOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            const selectedTheme = e.target.getAttribute('data-theme');
            applyTheme(selectedTheme, true); 
            DOM_ELEMENTS.themeMenu.classList.add('hidden-menu'); 
        });
    });

    // 全局點擊事件 (用於關閉菜單)
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!DOM_ELEMENTS.themeMenu.contains(target) && !DOM_ELEMENTS.themeToggleBtn.contains(target)) {
            DOM_ELEMENTS.themeMenu.classList.add('hidden-menu');
        }
        if (!DOM_ELEMENTS.timerMenu.contains(target) && !DOM_ELEMENTS.timerToggleButton.contains(target)) {
            DOM_ELEMENTS.timerMenu.classList.add('hidden-menu');
        }
    });

    // 每小時自動檢查主題
    setInterval(() => {
        const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        if (storedTheme === THEMES.LIGHT) {
            applyTheme(THEMES.LIGHT, false); 
        }
    }, 1000 * 60 * 60); 
}


// --- 初始啟動 (DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
    initializePlayer(); 
    handleUrlAnchor(true);
});

// 導出 initializePlayer，以防外部代碼需要重新初始化
export { initializePlayer };
