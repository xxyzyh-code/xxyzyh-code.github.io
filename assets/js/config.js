// /assets/js/config.js - 最終版本

/**
 * @description 專案的集中式配置檔案。
 * 所有 JS 模組共享的常量和設定都定義在這裡。
 */

// ===================================
// 時間與農曆配置 (Time Module)
// ===================================
export const LUNAR_LOADING_MESSAGE = '農曆函式庫載入失敗或不可用。';

// ===================================
// 番茄鐘配置 (Pomodoro Module)
// ===================================
export const POMODORO_TIME_MINUTES = 25; // 工作時間 (分鐘)
export const SHORT_BREAK_TIME_MINUTES = 5; // 短暫休息 (分鐘)
export const LONG_BREAK_TIME_MINUTES = 15; // 長時間休息 (分鐘)
export const LONG_BREAK_INTERVAL = 4; // 每隔 4 次工作後進行長時間休息

// ===================================
// 天氣模組配置 (Weather Module)
// ===================================
export const WEATHER_API_KEY = 'be0d16a112a34af758f9a6a22e133de3'; // 請考慮將此 Key 移至伺服器端
export const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
export const WEATHER_API_LANG = 'zh_tw';
export const WEATHER_UNITS = 'metric';
export const WEATHER_GEOLOCATION_TIMEOUT = 10000;
export const WEATHER_LOCATION_FAIL_MESSAGE = '定位失敗 🌍';
export const WEATHER_FETCH_FAIL_MESSAGE = '載入天氣數據失敗 😓';

// ===================================
// 主題與音訊配置 (UI Module)
// ===================================
export const THEMES = ['default', 'neon-theme', 'dos-theme'];

export const ALARM_SOUNDS = [
    { name: '經典鈴聲', path: 'assets/audio/alarm_bell.mp3' },
    { name: '輕柔鐘聲', path: 'assets/audio/gentle_chime.mp3' },
    { name: '電子蜂鳴', path: 'assets/audio/electronic_beep.mp3' }
];

export const MEDITATION_MUSIC = [
    { name: '柔和輕音', path: 'assets/audio/gentle_music.mp3' },
    { name: '大自然雨聲', path: 'assets/audio/rain_sound.mp3' },
    { name: '寧靜鋼琴', path: 'assets/audio/piano_loop.mp3' }
];

export const MEDITATION_MESSAGES = [
    "閉上眼睛，深呼吸三次，感受當下的寧靜。",
    "輕輕放下你的肩膀和下巴，放鬆五秒。",
    "專注於你的呼吸，忘卻時間，重新連結自己。",
    "放下生活瑣事，讓心靈放空、清潔。",
    "現在，保持微笑三秒鐘，感受積極的能量。"
];

export const MEDITATION_PROMPT_DURATION = 30000; // 訊息顯示 30 秒
export const MEDITATION_INTERVAL_MIN = 60; // 冥想提示間隔 (分鐘)

// ===================================
// 應用程式一般配置
// ===================================
export const APP_INITIALIZATION_MESSAGE = "Time Module: 時鐘與日期功能已啟動。";

