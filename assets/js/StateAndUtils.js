// StateAndUtils.js
// 負責狀態管理、LocalStorage 存取和輔助函數

import { 
    DOM_ELEMENTS, STORAGE_KEYS, 
    MASTER_TRACK_LIST, SUPABASE_ANON_KEY 
} from './Config.js';

// --- 狀態變量 ---
let currentPlaylist = []; 
let currentTrackIndex = 0; 
let playMode = 0; // 0: 順序停止, 1: 單曲循環, 2: 隨機, 3: 自由, 4: 順序循環
let dataMode = 'local';
let trackPlayCounts = {}; 
let globalTrackPlayCounts = {}; 

let sleepTimerId = null; 
let endTime = 0; 
let countdownIntervalId = null; 
let listenIntervalId = null; 
let scoreTimerIntervalId = null; 
let scoreAccumulatorSeconds = 0; 

// 🌟 核心修正：新增狀態變量 🌟
// 當歌曲因播放列表結束（模式 0 或 3）而停止時，設為 true。
let isStoppedAtEnd = false; 

// 🌟 新增：歌詞同步狀態 🌟
let currentLRC = null;         // 儲存解析後的歌詞陣列
let lyricsIntervalId = null;   // 歌詞同步的 setInterval ID
let currentLyricIndex = -1;    // 當前高亮的歌詞行索引
// 🌟 新增結束 🌟

// --- 實用工具函數 ---

export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

export function getUserId() {
  let id = localStorage.getItem('anon_user_id');
  if (!id) {
    id = crypto.randomUUID(); 
    localStorage.setItem('anon_user_id', id);
  }
  return id;
}

// --- 設置保存/載入邏輯 ---

export function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEYS.VOLUME, DOM_ELEMENTS.audio.volume);
        localStorage.setItem(STORAGE_KEYS.MUTED, DOM_ELEMENTS.audio.muted);
        localStorage.setItem(STORAGE_KEYS.MODE, playMode);
        localStorage.setItem(STORAGE_KEYS.DATA_MODE, dataMode);  
        
        // 注意：isStoppedAtEnd 狀態不需持久化，它在每次載入時都應該是 false。
        
        if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
            const track = currentPlaylist[currentTrackIndex];
            localStorage.setItem(STORAGE_KEYS.LAST_ORIGINAL_INDEX, track.originalIndex); 
        } else {
            localStorage.removeItem(STORAGE_KEYS.LAST_ORIGINAL_INDEX); 
        }
        
        if (DOM_ELEMENTS.audio.currentTime > 0 && !DOM_ELEMENTS.audio.paused) {
             // 只有在播放器沒有手動暫停時，才保存時間，避免在結束時保存 0
             localStorage.setItem(STORAGE_KEYS.LAST_TIME, DOM_ELEMENTS.audio.currentTime);
        } else {
             localStorage.removeItem(STORAGE_KEYS.LAST_TIME);
        }
        localStorage.setItem(STORAGE_KEYS.PLAY_COUNT, JSON.stringify(trackPlayCounts));
        
    } catch (e) {
        console.warn('LocalStorage is not available or blocked.', e);
    }
}

export function loadSavedSettings() {
    try {
        const audio = DOM_ELEMENTS.audio;
        
        const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
        if (savedVolume !== null) {
            audio.volume = Math.max(0, Math.min(1, parseFloat(savedVolume)));
        }
        const savedMuted = localStorage.getItem(STORAGE_KEYS.MUTED);
        if (savedMuted !== null) {
            audio.muted = (savedMuted === 'true');
        }
        
        const savedMode = localStorage.getItem(STORAGE_KEYS.MODE);
        if (savedMode !== null) {
            const mode = parseInt(savedMode);
            if (mode >= 0 && mode <= 4) { 
                playMode = mode; 
            } else {
                playMode = 0; // 預設為順序停止
            }
        } else {
            playMode = 0; // 預設為順序停止
        }

        const savedCounts = localStorage.getItem(STORAGE_KEYS.PLAY_COUNT);
        if (savedCounts) {
            trackPlayCounts = JSON.parse(savedCounts);
        }
        
        const savedDataMode = localStorage.getItem(STORAGE_KEYS.DATA_MODE);
        if (savedDataMode && (savedDataMode === 'local' || savedDataMode === 'global')) {
            dataMode = savedDataMode;
        }

        const savedOriginalIndex = localStorage.getItem(STORAGE_KEYS.LAST_ORIGINAL_INDEX);
        if (savedOriginalIndex !== null) {
            const originalIndex = parseInt(savedOriginalIndex);
            if (originalIndex >= 0 && originalIndex < MASTER_TRACK_LIST.length) { 
                // 將上次播放的索引暫存，供 PlayerCore 初始化時查找
                window.__LAST_PLAYED_ORIGINAL_INDEX = originalIndex;
            } else {
                 localStorage.removeItem(STORAGE_KEYS.LAST_ORIGINAL_INDEX); 
            }
        } else {
             window.__LAST_PLAYED_ORIGINAL_INDEX = -1;
        }

        // 清理不再存在的歌曲計數
        const currentKeys = MASTER_TRACK_LIST.map(t => t.originalIndex.toString());
        let keysToDelete = [];
        for (const key in trackPlayCounts) {
            if (!currentKeys.includes(key)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => delete trackPlayCounts[key]);
        localStorage.setItem(STORAGE_KEYS.PLAY_COUNT, JSON.stringify(trackPlayCounts));
        
    } catch (e) {
        console.warn('Failed to load settings from LocalStorage.', e);
    }
}

// 導出狀態變量的 Getters 和 Setters
export const getState = () => ({
    currentPlaylist, currentTrackIndex, playMode, dataMode, 
    trackPlayCounts, globalTrackPlayCounts, sleepTimerId, endTime, countdownIntervalId,
    listenIntervalId, scoreTimerIntervalId, scoreAccumulatorSeconds,
    // 🌟 導出 isStoppedAtEnd 🌟
    isStoppedAtEnd,
    // 🌟 導出新增狀態 🌟
    currentLRC, lyricsIntervalId, currentLyricIndex
});


export const setState = (newState) => {
    if (newState.currentPlaylist !== undefined) currentPlaylist = newState.currentPlaylist;
    if (newState.currentTrackIndex !== undefined) currentTrackIndex = newState.currentTrackIndex;
    if (newState.playMode !== undefined) playMode = newState.playMode;
    if (newState.dataMode !== undefined) dataMode = newState.dataMode;
    if (newState.trackPlayCounts !== undefined) trackPlayCounts = newState.trackPlayCounts;
    if (newState.globalTrackPlayCounts !== undefined) globalTrackPlayCounts = newState.globalTrackPlayCounts;

    if (newState.sleepTimerId !== undefined) sleepTimerId = newState.sleepTimerId;
    if (newState.endTime !== undefined) endTime = newState.endTime;
    if (newState.countdownIntervalId !== undefined) countdownIntervalId = newState.countdownIntervalId;
    if (newState.listenIntervalId !== undefined) listenIntervalId = newState.listenIntervalId;
    if (newState.scoreTimerIntervalId !== undefined) scoreTimerIntervalId = newState.scoreTimerIntervalId;
    if (newState.scoreAccumulatorSeconds !== undefined) scoreAccumulatorSeconds = newState.scoreAccumulatorSeconds;

    // 🌟 設置 isStoppedAtEnd 🌟
    if (newState.isStoppedAtEnd !== undefined) isStoppedAtEnd = newState.isStoppedAtEnd;
    
    // 🌟 設置新增狀態 🌟
    if (newState.currentLRC !== undefined) currentLRC = newState.currentLRC;
    if (newState.lyricsIntervalId !== undefined) lyricsIntervalId = newState.lyricsIntervalId;
    if (newState.currentLyricIndex !== undefined) currentLyricIndex = newState.currentLyricIndex;
};


// 導出重置歌單
export function resetCurrentPlaylist() {
    currentPlaylist = [...MASTER_TRACK_LIST]; 
}

// 導出計數器
export let totalListenMinutes = 0;
export let totalListenSeconds = 0;
export function incrementListenTime() {
    totalListenSeconds++;
    if (totalListenSeconds >= 60) {
        totalListenMinutes++;
        totalListenSeconds = 0;
    }
}
export function resetListenTime() {
    totalListenMinutes = 0;
    totalListenSeconds = 0;
}
