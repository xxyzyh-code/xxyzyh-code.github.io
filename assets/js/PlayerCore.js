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

// 🌟 核心修正 1：導入 LRC 模組和 AudioEngine 🌟
import { fetchLRC, parseLRC } from './LrcParser.js'; 
import { playAudioWithFallback } from './AudioEngine.js'; // 導入新的音頻引擎

let hasInitializedListeners = false;

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

// --- UI 輔助函數 (不變) ---

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
        const currentlyPlayingOriginalIndex = currentPlaylist[currentTrackIndex].originalIndex; 
        const playingItem = DOM_ELEMENTS.playlistUl.querySelector(`li[data-original-index="${currentlyPlayingOriginalIndex}"]`);
        
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

// --- 歌詞渲染與同步輔助函數 ---

function renderLyrics() {
    const { currentLRC } = getState();
    const contentDiv = DOM_ELEMENTS.lyricsContent;
    
    contentDiv.innerHTML = ''; // 清空舊歌詞
    
    if (!currentLRC || currentLRC.length === 0) {
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
    
    if (!currentLRC || currentLRC.length === 0) return;

    let nextIndex = currentLyricIndex;

    // 🌟 修正 4：從一個安全的起始點開始搜索，減少無效迭代
    // 預設從 -20 行開始搜索 (如果 currentLyricIndex > 20)
    const startIndex = Math.max(0, currentLyricIndex - 20); 

    for (let i = startIndex; i < currentLRC.length; i++) {
        if (currentLRC[i].time <= currentTime) {
            nextIndex = i;
        } else {
            break;
        }
    }
    
    
    if (nextIndex !== currentLyricIndex) {
        setState({ currentLyricIndex: nextIndex });
        
        const oldLine = DOM_ELEMENTS.lyricsContent.querySelector(`p.current-line`);
        if (oldLine) {
            oldLine.classList.remove('current-line');
        }

        const newLine = DOM_ELEMENTS.lyricsContent.querySelector(`p[data-index="${nextIndex}"]`);
        
        if (newLine) {
            newLine.classList.add('current-line');
            
            const container = DOM_ELEMENTS.lyricsContainer;
            const content = DOM_ELEMENTS.lyricsContent;
            
            const offsetTop = newLine.offsetTop - content.offsetTop;
            const targetScrollTop = offsetTop - (container.clientHeight / 2) + (newLine.clientHeight / 2);
            
            container.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth' 
            });
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
    incrementListenTime(); 
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

export function toggleTimerMenu(e) {
    if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation(); 
    }
    const isExpanded = DOM_ELEMENTS.timerMenu.classList.toggle('hidden-menu');
    DOM_ELEMENTS.timerToggleButton.setAttribute('aria-expanded', !isExpanded);
    
    if (!DOM_ELEMENTS.themeMenu.classList.contains('hidden-menu')) {
        DOM_ELEMENTS.themeMenu.classList.add('hidden-menu');
        DOM_ELEMENTS.themeToggleBtn.setAttribute('aria-expanded', false); 
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

    setState({ 
        sleepTimerId: timerId, 
        endTime: newEndTime, 
        countdownIntervalId: intervalId 
    });
    
    DOM_ELEMENTS.timerToggleButton.textContent = `定時 (${minutes} 分鐘)`;
    DOM_ELEMENTS.playerTitle.textContent = `定時器已設置：${minutes} 分鐘後自動關閉`;
    
    // 🌟 修正 1：定時器錯誤修復 - 添加 .catch() 處理播放失敗
    if (DOM_ELEMENTS.audio.paused) {
        DOM_ELEMENTS.audio.play().catch(error => {
            if (error.name === "DOMException" || error.name === "NotSupportedError") {
                console.warn("定時器啟動：無法自動播放 (無音源/被阻止)。", error);
                // 這裡我們只記錄警告，定時器本身仍應生效
            } else {
                console.error("定時器啟動時，播放發生未知錯誤:", error);
            }
        });
    }
}

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
 * @param {boolean} [autoPlay=true] - 是否嘗試立即播放（如果瀏覽器允許）
 */
export function playTrack(index, autoPlay = true) {
    const { currentPlaylist } = getState();
    const audio = DOM_ELEMENTS.audio;
    
    if (index >= 0 && index < currentPlaylist.length) { 
        setState({ 
            currentTrackIndex: index,
            // 🌟 修正 3：重置播放記錄標誌，新歌應被記錄
            isTrackPlayRecorded: false 
        });
        const track = currentPlaylist[index]; 
        
        // --- 核心修正 2：使用 AudioEngine 處理 CDN 備援 ---
        if (autoPlay) {
             // 啟動備援邏輯，並嘗試播放
             playAudioWithFallback(track);
             DOM_ELEMENTS.playerTitle.textContent = `正在播放：${track.title} (載入中...)`; 
        } else {
             // 僅載入第一個來源，不嘗試播放，等待用戶手勢
             audio.src = track.sources[0] || ''; 
             audio.load();
             DOM_ELEMENTS.playerTitle.textContent = `載入成功：${track.title} (請點擊播放)`;
        }

        // --- 核心修正 3：使用 LrcParser 的備援邏輯 ---
        if (track.lrcSources && track.lrcSources.length > 0) {
            console.log(`嘗試加載歌詞 (${track.lrcSources.length} 個備援來源)...`); 
            
            fetchLRC(track.lrcSources).then(lrcText => {
                const parsedLRC = parseLRC(lrcText);
                
                if (parsedLRC && parsedLRC.length > 0) {
                    console.log("✅ 歌詞解析成功，找到行數:", parsedLRC.length);
                } else {
                    console.warn("❌ 歌詞解析失敗或解析結果為空！");
                }
                
                setState({ 
                    currentLRC: parsedLRC, 
                    currentLyricIndex: -1
                });
                renderLyrics();
            }).catch(error => {
                console.error(`❌ 歌詞文件加載最終失敗:`, error);
                setState({ currentLRC: null, currentLyricIndex: -1 });
                renderLyrics();
            });
        } else {
             // 如果沒有 lrcSources，清空歌詞區域
             setState({ currentLRC: null, currentLyricIndex: -1 });
             renderLyrics(); 
        }
        
        updatePlaylistHighlight();
        
        // ❌ 核心修復：移除此行，防止點擊歌單項目時觸發頁面導航/干擾播放邏輯。
        // window.location.hash = `song-index-${track.originalIndex}`; 
    } else if (index === currentPlaylist.length) { 
        audio.pause(); 
        DOM_ELEMENTS.playerTitle.textContent = "播放列表已結束";
        setState({ currentTrackIndex: -1 }); 
        updatePlaylistHighlight();
        window.location.hash = '';
    }
}


export function playNextTrack() {
    const { currentPlaylist, currentTrackIndex } = getState();
    if (currentPlaylist.length === 0) return;
    
    let nextIndex;
    
    if (currentTrackIndex < currentPlaylist.length - 1) {
        nextIndex = currentTrackIndex + 1;
    } else { 
        nextIndex = 0; 
    }
    
    playTrack(nextIndex); // 默認 autoPlay=true
}


export function playPreviousTrack() {
    const { currentPlaylist, currentTrackIndex } = getState();
    if (currentPlaylist.length === 0) return;
    
    let prevIndex;
    
    if (currentTrackIndex > 0) {
        prevIndex = currentTrackIndex - 1;
    } else { 
        prevIndex = currentPlaylist.length - 1; 
    }
    
    playTrack(prevIndex); // 默認 autoPlay=true
}


// --- 模式切換邏輯 (不變) ---

export function togglePlayMode() {
    let { playMode } = getState();
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
    
    handlePause(); 
    
    DOM_ELEMENTS.playerTitle.textContent = `數據模式已切換為：${(dataMode === 'global' ? '全球統計' : '本地統計')}`;
    // 這裡會重新調用 initializePlayer，它最終會用 autoPlay=false 載入音源，因此您看到「載入成功」是正常的。
    await initializePlayer(true); 
}



// --- 播放列表顯示與排序邏輯 (不變) ---

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
        li.setAttribute('data-original-index', track.originalIndex); 
        li.setAttribute('data-index', index); 
        li.setAttribute('tabindex', '0'); 
        
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
             playTrack(index); // 默認 autoPlay=true
             if (playMode !== 3) {
                 setState({ playMode: 3 }); 
                 updateModeUI();
                 saveSettings();
             }
        };
        
        li.addEventListener('click', playTrackAction);
        
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); 
                playTrackAction();
            }
        });
        
        fragment.appendChild(li);
    });
    
    DOM_ELEMENTS.playlistUl.appendChild(fragment);    
    setTimeout(() => {
        updatePlaylistHighlight(true);
    }, 0); 
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
    currentPlaylist = sortableList; 

    
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
        // --- 篩選邏輯 ---
        let newPlaylist = MASTER_TRACK_LIST.filter(track => { 
            const itemText = (track.title + ' ' + track.artist).toLowerCase(); 
            return itemText.includes(searchText);
        });
        
        let { currentTrackIndex, currentPlaylist } = getState();
        const playingOriginalIndex = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length
            ? currentPlaylist[currentTrackIndex].originalIndex 
            : -1; 
            
        setState({ currentPlaylist: newPlaylist });

        handlePause(); 
        DOM_ELEMENTS.audio.pause(); 

        if (newPlaylist.length === 0) {
            DOM_ELEMENTS.playerTitle.textContent = `未找到與 "${searchText}" 相關的歌曲。`;
            setState({ currentTrackIndex: -1 });
            
        } else {
            let newIndex = -1;
            if (playingOriginalIndex !== -1) {
                newIndex = newPlaylist.findIndex(track => track.originalIndex === playingOriginalIndex);
            }

            if (newIndex !== -1) {
                setState({ currentTrackIndex: newIndex });
                DOM_ELEMENTS.playerTitle.textContent = `篩選結果 (${newPlaylist.length} 首)。`;
            } else {
                setState({ currentTrackIndex: 0 }); 
                DOM_ELEMENTS.playerTitle.textContent = `已根據篩選建立新歌單 (${newPlaylist.length} 首)。請點擊播放。`;
            }
        }

        renderPlaylist(); 

    } else {

// --- 退出篩選邏輯 ---

        let { currentTrackIndex, currentPlaylist } = getState();
        const currentlyPlayingOriginalIndex = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length
            ? currentPlaylist[currentTrackIndex].originalIndex 
            : -1; 
            
        handlePause(); 
        resetCurrentPlaylist(); 
        DOM_ELEMENTS.playerTitle.textContent = "我的音樂播放器";

        sortPlaylistByPlayCount(); 
        
        ({ currentTrackIndex, currentPlaylist } = getState()); 

        if (currentlyPlayingOriginalIndex !== -1) {
            const newIndex = currentPlaylist.findIndex(track => track.originalIndex === currentlyPlayingOriginalIndex);
            
            if (newIndex !== -1) {
                setState({ currentTrackIndex: newIndex });
            } else {
                setState({ currentTrackIndex: 0 }); 
            }
        } else if (currentTrackIndex === -1 || currentTrackIndex >= currentPlaylist.length) {
            setState({ currentTrackIndex: 0 }); 
        }

        DOM_ELEMENTS.audio.pause(); 
    }
}


// --- 外部呼叫函數 (用於 URL 錨點) ---

/**
 * 載入指定索引的歌曲，並強制進入自由模式，
 * 決定是否自動播放的邏輯交給 handleUrlAnchor。
 * @param {number} originalIndex - 歌曲在 MASTER_TRACK_LIST 中的原始索引
 * @param {boolean} [autoPlay=true] - 是否嘗試立即播放
 */
export function loadTrack(originalIndex, autoPlay = true) { 
    
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
        playTrack(newIndex, autoPlay); // 🌟 傳遞 autoPlay 參數
    } else {
        console.error(`loadTrack 錯誤: 歌曲 (原始索引: ${originalIndex}) 在當前歌單中找不到。`);
        DOM_ELEMENTS.playerTitle.textContent = `錯誤：歌曲找不到。請手動點擊歌單中的其他歌曲。`;
    }
}


// --- 事件處理函數 ---
function handleTrackEnd() {
    const { playMode, currentTrackIndex, currentPlaylist } = getState();

    incrementPlayCount(); 
    sortPlaylistByPlayCount();
    saveSettings(); 
    
    // 🌟 修正 3 (單曲循環)：在單曲循環模式結束時重置 isTrackPlayRecorded 
    if (playMode === 1) { 
        setState({ currentLyricIndex: -1, isTrackPlayRecorded: false }); 
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
        // ✅ 核心修復：在自由模式歌曲結束時，清除 URL 錨點。
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
            // ✅ 核心修復：在順序停止模式結束時，清除 URL 錨點。
            window.location.hash = ''; 
            return; 
        }
    }
    if (nextIndex !== undefined && nextIndex !== -1) {
        playTrack(nextIndex); // 默認 autoPlay=true
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
    // 🌟 修正 1：handlePlay 只負責設置計時器
    let { listenIntervalId, scoreTimerIntervalId, lyricsIntervalId } = getState();

    if (listenIntervalId === null) {
        listenIntervalId = setInterval(updateTotalListenTime, 1000);
        setState({ listenIntervalId });
    }
    
    if (scoreTimerIntervalId === null) {
        scoreTimerIntervalId = setInterval(window.updateMusicScore || (() => console.warn('updateMusicScore not defined')), 1000); 
        setState({ scoreTimerIntervalId }); 
    }

    if (lyricsIntervalId === null) {
        lyricsIntervalId = setInterval(syncLyrics, 100); 
        setState({ lyricsIntervalId }); 
    }
    
    saveSettings(); 
}

// 🌟 修正 1：handlePlaying 負責數據庫記錄和 UI 標題更新
function handlePlaying() {
    const { currentTrackIndex, currentPlaylist, isTrackPlayRecorded } = getState();
    
    if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
        const currentTrack = currentPlaylist[currentTrackIndex]; 
        const currentSongId = currentTrack.id; 
        
        // 核心檢查：確保該歌曲在本會話中只被記錄一次
        if (!isTrackPlayRecorded) {
            trackPlayToDatabase(currentSongId); 
            setState({ isTrackPlayRecorded: true }); // 設置為已記錄
            console.log(`✅ 數據庫播放記錄成功發送: ${currentTrack.title}`);
            
            // 更新 UI 標題，確認播放成功
            DOM_ELEMENTS.playerTitle.textContent = `正在播放：${currentTrack.title}`;
        }
    }
}


function handlePause() {
    const { listenIntervalId, scoreTimerIntervalId, lyricsIntervalId } = getState();

    if (listenIntervalId !== null) {
        clearInterval(listenIntervalId);
        setState({ listenIntervalId: null });
    }
    
    if (scoreTimerIntervalId !== null) {
        clearInterval(scoreTimerIntervalId);
        setState({ scoreTimerIntervalId: null });
    }

    if (lyricsIntervalId !== null) {
        clearInterval(lyricsIntervalId);
        setState({ lyricsIntervalId: null }); 
    }
    
    saveSettings();
}

function handleTimeUpdate() {
    if (!DOM_ELEMENTS.audio.paused && DOM_ELEMENTS.audio.currentTime % 5 < 1) {
         saveSettings();
    }
}

// 核心修正 4：移除 handleAudioError 中的備援邏輯
function handleAudioError(e) {
    if (!e.target.error) return;
    
    // 讓 AudioEngine 處理所有備援和錯誤提示。這裡僅做日誌記錄。
    console.error(`[PlayerCore] 捕獲到一個音頻錯誤 (代碼: ${e.target.error.code})。`);
}

// 🎯 核心修復點 1：修復 handleUrlAnchor 結構錯誤和冗餘的播放請求
function handleUrlAnchor(isInitialLoad = false) {
    const hash = window.location.hash;
    
    if (hash.startsWith('#song-index-')) {
        const parts = hash.split('-');
        const originalIndex = parseInt(parts[parts.length - 1]);
        
        if (!isNaN(originalIndex) && originalIndex >= 0 && originalIndex < MASTER_TRACK_LIST.length) {
            
            const trackTitle = MASTER_TRACK_LIST[originalIndex].title;
            
            // 🌟 修正：從 URL 載入時，直接嘗試播放 (autoPlay=true)
            // 讓 AudioEngine 去處理瀏覽器限制，而不是讓 PlayerCore 流程卡死
            loadTrack(originalIndex, true); 
            
            if (isInitialLoad) {
                // 如果是初始化載入（來自URL），設定為順序停止模式，等待用戶手動播放
                setState({ playMode: 0 }); 
                updateModeUI();
                saveSettings();
            }
            
            DOM_ELEMENTS.playerTitle.textContent = `從分享連結載入：${trackTitle} (正在緩衝...)`;
            
        } // 歌曲索引有效結束
    } // hash 檢查結束
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
        sortPlaylistByPlayCount(); // sortPlaylistByPlayCount 內部會調用 renderPlaylist
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
        
        // 核心修正 5：移除舊的音源載入邏輯
        // 僅設置 UI 提示和載入上次播放時間
        DOM_ELEMENTS.playerTitle.textContent = `上次播放：${track.title}`;
        
        const savedTime = localStorage.getItem(STORAGE_KEYS.LAST_TIME);
        if (savedTime !== null) { 
            const time = parseFloat(savedTime);
            if (!isNaN(time) && time > 0) {
                // 注意：這裡只設置 currentTime。
                // 真正的音源載入應該由 playTrack() 處理，但初始化時我們不自動 playTrack。
                DOM_ELEMENTS.audio.currentTime = time;
                localStorage.removeItem(STORAGE_KEYS.LAST_TIME); 
            }
        }
        
        updatePlaylistHighlight();
        // 載入當前歌曲的音源，但不自動播放 (autoPlay=false)
        //playTrack(currentTrackIndex, false); 
        
    } else {
         setState({ currentTrackIndex: -1 }); 
         DOM_ELEMENTS.playerTitle.textContent = "我的音樂播放器 (無歌曲)";
    }
    
    // 🎯 核心修復點 2：強制在初始化結束時重新渲染列表，解決列表消失問題
    renderPlaylist();

    initializeTheme();
    
    if (!hasInitializedListeners) {
        bindEventListeners();
        hasInitializedListeners = true;
    }
}


function bindEventListeners() {
    // 播放器事件
    DOM_ELEMENTS.audio.addEventListener('volumechange', saveSettings);
    DOM_ELEMENTS.audio.addEventListener('ratechange', saveSettings); 
    DOM_ELEMENTS.audio.addEventListener('loadedmetadata', saveSettings); 
    DOM_ELEMENTS.audio.addEventListener('timeupdate', handleTimeUpdate);
    
    // 🌟 修正 1：區分 handlePlay 和 handlePlaying
    DOM_ELEMENTS.audio.addEventListener('play', handlePlay);       // 設置計時器
    DOM_ELEMENTS.audio.addEventListener('playing', handlePlaying); // 記錄數據庫、更新標題
    
    DOM_ELEMENTS.audio.addEventListener('pause', handlePause);
    DOM_ELEMENTS.audio.addEventListener('ended', handleTrackEnd);

    // 搜索欄事件
    DOM_ELEMENTS.playlistSearchInput.addEventListener('input', debounce(filterPlaylist, 300));
    
    // 主題切換事件
    DOM_ELEMENTS.themeToggleBtn.addEventListener('click', (e) => {
       e.stopPropagation(); 
        const isExpanded = DOM_ELEMENTS.themeMenu.classList.toggle('hidden-menu');
        DOM_ELEMENTS.themeToggleBtn.setAttribute('aria-expanded', !isExpanded); 
        
        if (!DOM_ELEMENTS.timerMenu.classList.contains('hidden-menu')) {
            DOM_ELEMENTS.timerMenu.classList.add('hidden-menu');
            DOM_ELEMENTS.timerToggleButton.setAttribute('aria-expanded', false); 
        }
    });
    
    DOM_ELEMENTS.timerToggleButton.addEventListener('click', toggleTimerMenu);

    // 主題菜單項
    DOM_ELEMENTS.themeOptions.forEach(option => {
        const clickAction = (e) => {
            e.stopPropagation(); 
            const selectedTheme = e.currentTarget.getAttribute('data-theme');
            applyTheme(selectedTheme, true); 
            DOM_ELEMENTS.themeMenu.classList.add('hidden-menu'); 
            DOM_ELEMENTS.themeToggleBtn.setAttribute('aria-expanded', false);
        };
        
        option.addEventListener('click', clickAction);
        
        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); 
                clickAction(e); 
            }
        });
    });

    // 定時器菜單項
    DOM_ELEMENTS.timerMenu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); 
                item.click(); 
            }
        });
    });
    
// 全局點擊事件 (用於關閉菜單)
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
}


// --- 初始啟動 (DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
    initializePlayer(); 
    // 只有在初始載入時，才根據 URL 錨點載入歌曲（但不自動播放）
    handleUrlAnchor(true);
});


// 核心優化：集中暴露給全局空間的函數 (供 HTML 內聯 onclick / URL 錨點使用)
const globalExposedFunctions = {
    playNextTrack,
    playPreviousTrack,
    togglePlayMode,
    toggleDataMode,
    setSleepTimer,
    clearSleepTimer,
    loadTrack 
};

Object.keys(globalExposedFunctions).forEach(key => {
    window[key] = globalExposedFunctions[key];
});


export { initializePlayer };
