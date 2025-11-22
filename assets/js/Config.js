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
    return trackDataArray.map((track, index) => ({
        id: track.id || `s${index}`, 
        title: track.title,
        artist: track.artist,
        // 🚨 核心修正 1：確保 sources 永遠是陣列
        sources: Array.isArray(track.sources) ? track.sources : (track.sources ? [track.sources] : []), 
        originalIndex: index,
        // 確保 lrcSources 是陣列
        lrcSources: Array.isArray(track.lrcPath) ? track.lrcPath : (track.lrcPath ? [track.lrcPath] : []) 
    }));
})();  

// ------------------------------------
// 2. DOM 元素 & 儲存鍵常量
// 🚨 核心修正：將抓取 DOM 元素的邏輯移除，改為定義為 null。
// 讓 PlayerCore 在 DOMContentLoaded 時再賦值。
// ------------------------------------
const DOM_ELEMENTS = {
    audio: null, 
    playerTitle: null,
    modeButton: null, 
    timerToggleButton: null,
    timerMenu: null,
    totalListenTimeSpan: null,
    remainingTimerSpan: null,
    playlistSearchInput: null, 
    themeToggleBtn: null,
    themeMenu: null,
    currentThemeName: null,
    themeOptions: null, // NodeList 也是要延遲抓取
    playlistUl: null, 
    lyricsContainer: null,
    lyricsContent: null,
    lyricsPlaceholder: null
};


const STORAGE_KEYS = {
    PLAY_COUNT: 'audioTrackPlayCounts',
    DATA_MODE: 'audioPlayerDataMode',
    VOLUME: 'audioPlayerVolume',
    MUTED: 'audioPlayerMuted',
    MODE: 'audioPlayerMode',
    LAST_ORIGINAL_INDEX: 'audioPlayerOriginalIndex',
    LAST_TIME: 'audioPlayerTime',
    THEME: 'userThemePreference',
    FAILED_URLS: 'audioFailedUrls' 
};

const THEMES = {
    LIGHT: 'light', DARK: 'dark', GREY: 'grey', BLUE: 'blue',
    GREEN: 'green', PURPLE: 'purple', PINK: 'pink', YELLOW: 'yellow', RED: 'red'
};

// 🚨 核心修正：導出時，將 DOM_ELEMENTS 設為 let 或使用別的方式讓它可以被賦值，
// 但最簡單的是在 PlayerCore 中直接實現初始化函數。
// 這裡我們假設 DOM_ELEMENTS 仍為 const，並在 PlayerCore 內部定義一個函數來填充它。

// 為了讓 PlayerCore 能夠填充 DOM_ELEMENTS，我們將它從 const 導出改為用 let/var 定義，但由於 ES Module 規範，
// 最好的方法是直接在 Config.js 中實現初始化函數並導出。

// ⭐️ 新增：導出一個 DOM 元素初始化函數
function initializeDOMElements() {
    DOM_ELEMENTS.audio = document.getElementById('main-audio');
    DOM_ELEMENTS.playerTitle = document.querySelector('#custom-audio-player h3');
    DOM_ELEMENTS.modeButton = document.getElementById('mode-button'); 
    DOM_ELEMENTS.timerToggleButton = document.getElementById('timer-toggle-btn');
    DOM_ELEMENTS.timerMenu = document.getElementById('timer-menu');
    DOM_ELEMENTS.totalListenTimeSpan = document.getElementById('total-listen-time');
    DOM_ELEMENTS.remainingTimerSpan = document.getElementById('remaining-timer');
    DOM_ELEMENTS.playlistSearchInput = document.getElementById('playlist-search'); 
    DOM_ELEMENTS.themeToggleBtn = document.getElementById('theme-toggle-btn');
    DOM_ELEMENTS.themeMenu = document.getElementById('theme-menu');
    DOM_ELEMENTS.currentThemeName = document.getElementById('current-theme-name');
    DOM_ELEMENTS.themeOptions = document.querySelectorAll('#theme-menu .theme-option'); // 抓取 NodeList
    DOM_ELEMENTS.playlistUl = document.getElementById('playlist'); 
    DOM_ELEMENTS.lyricsContainer = document.getElementById('lyrics-container');
    DOM_ELEMENTS.lyricsContent = document.getElementById('lyrics-content');
    DOM_ELEMENTS.lyricsPlaceholder = document.getElementById('lyrics-placeholder');

    // 安全檢查：如果 audio 仍然是 null，則拋出錯誤
    if (!DOM_ELEMENTS.audio) {
        console.error("致命錯誤：未能找到 ID 為 'main-audio' 的 <audio> 元素。");
    }
}

export { 
    SUPABASE_URL, SUPABASE_ANON_KEY, GLOBAL_STATS_TABLE, 
    MASTER_TRACK_LIST, DOM_ELEMENTS, STORAGE_KEYS, THEMES,
    initializeDOMElements // 導出新函數
};
