// Config.js
// 負責靜態配置、常量和主數據列表的初始化

// ------------------------------------
// ⭐️ 關鍵：Supabase API 配置 (使用您提供的 Key)
// ------------------------------------
const SUPABASE_URL = 'https://dpflzangmwahuwyevegp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwZmx6YW5nbXdhaHV3eWV2ZWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc0NDYsImV4cCI6MjA3ODAwMzQ0Nn0.bydLBJIGqHcEKDhmw4E7zEqxFxymieS7GlLjL9Zyr90';
const GLOBAL_STATS_TABLE = 'play_logs'; 

// ------------------------------------
// 1. 準備數據和狀態追蹤
// ------------------------------------
const MASTER_TRACK_LIST = (function() {
    const trackDataArray = window.PLAYER_GLOBAL_DATA?.trackDataArray;
    
    if (typeof trackDataArray === 'undefined' || trackDataArray.length === 0) {
        console.error("錯誤: Liquid 注入的 trackDataArray 數據未找到或為空。");
        return [];
    }
    
    return trackDataArray.map((track, index) => {
        
        // 🌟 修正點：確保 track.sources 是陣列 🌟
        let sourcesArray = track.sources;
        if (!Array.isArray(sourcesArray) || sourcesArray === null) {
            
            // 如果 sources 不是陣列或為 null，發出警告並設置為空陣列
            // 這通常是 YAML 轉 JSON/JS 過程中出錯導致的。
            console.warn(
                `⚠️ 警告: 歌曲 "${track.title}" (原始索引: ${index}) 的 sources 屬性不是有效的陣列。` +
                `實際類型為 ${typeof track.sources}。已設置為空陣列。`
            );
            sourcesArray = []; 
        }
        
        return {
            id: track.id || `s${index}`, 
            title: track.title,
            artist: track.artist,
            sources: sourcesArray, // 使用經過檢查的陣列
            originalIndex: index,
            lrcPath: track.lrcPath || null 
        };
    });
})(); 

// ------------------------------------
// 2. DOM 元素 & 儲存鍵常量
// ------------------------------------
const DOM_ELEMENTS = {
    audio: document.getElementById('main-audio'),
    playerTitle: document.querySelector('#custom-audio-player h3'),
    modeButton: document.getElementById('mode-button'), 
    timerToggleButton: document.getElementById('timer-toggle-btn'),
    timerMenu: document.getElementById('timer-menu'),
    totalListenTimeSpan: document.getElementById('total-listen-time'),
    remainingTimerSpan: document.getElementById('remaining-timer'),
    playlistSearchInput: document.getElementById('playlist-search'), 
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeMenu: document.getElementById('theme-menu'),
    currentThemeName: document.getElementById('current-theme-name'),
    themeOptions: document.querySelectorAll('#theme-menu .theme-option'),
    playlistUl: document.getElementById('playlist'),
    // 🌟 歌詞相關 DOM 元素 🌟
    lyricsContainer: document.getElementById('lyrics-container'),
    lyricsContent: document.getElementById('lyrics-content'),
    lyricsPlaceholder: document.getElementById('lyrics-placeholder')
};

const STORAGE_KEYS = {
    PLAY_COUNT: 'audioTrackPlayCounts',
    DATA_MODE: 'audioPlayerDataMode',
    VOLUME: 'audioPlayerVolume',
    MUTED: 'audioPlayerMuted',
    MODE: 'audioPlayerMode',
    LAST_ORIGINAL_INDEX: 'audioPlayerOriginalIndex',
    LAST_TIME: 'audioPlayerTime',
    THEME: 'userThemePreference'
};

const THEMES = {
    LIGHT: 'light', DARK: 'dark', GREY: 'grey', BLUE: 'blue',
    GREEN: 'green', PURPLE: 'purple', PINK: 'pink', YELLOW: 'yellow', RED: 'red'
};


export { 
    SUPABASE_URL, SUPABASE_ANON_KEY, GLOBAL_STATS_TABLE, 
    MASTER_TRACK_LIST, DOM_ELEMENTS, STORAGE_KEYS, THEMES 
};
