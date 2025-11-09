// uiModule.js - 延遲 DOM 引用修正版

import {
    THEMES,
    MEDITATION_INTERVAL_MIN,
    MEDITATION_MESSAGES,
    MEDITATION_MUSIC,
    MEDITATION_PROMPT_DURATION,
    ALARM_SOUNDS,
    WEATHER_API_KEY,
    WEATHER_API_URL,
    WEATHER_API_LANG,
    WEATHER_UNITS,
    WEATHER_GEOLOCATION_TIMEOUT,
    WEATHER_LOCATION_FAIL_MESSAGE,
    WEATHER_FETCH_FAIL_MESSAGE
} from './config.js';

// V. 主題切換與儲存邏輯
function setTheme(themeName) {
    // ... 邏輯保持不變
}
function loadTheme() {
    // ... 邏輯保持不變
}

// VI. 冥想引導模式邏輯
let meditationTimer = null; 
let isMeditationEnabled = false; 

// 程式夥伴：將 DOM 變數聲明為 null，並在初始化時賦值
let modal = null;
let modalText = null;
let closeModalBtn = null;
let audio = null; // meditation-audio
let toggleBtn = null; // meditation-toggle-btn
let meditationSelector = null;


function showMeditationPrompt() {
    // ... 邏輯保持不變
}

function closeMeditationPrompt() {
    // ... 邏輯保持不變
}

function toggleMeditationMode() {
    // ... 邏輯保持不變
}

// VII. 天氣資訊邏輯
function fetchWeather() {
    // ... 邏輯保持不變
}

async function getWeatherData(lat, lon) {
    // ... 邏輯保持不變
}

// VIII. 音訊選擇與儲存邏輯
// 程式夥伴：將 DOM 變數聲明為 null
let alarmSelector = null;
let alarmAudioElement = null; // alarm-audio


/**
 * @description 渲染下拉選單的選項，載入偏好並設置監聽器。
 */
function initializeAudioSelector(selector, options, storageKey, audioElement) {
    // ... 邏輯保持不變
}

/**
 * @description 啟動所有 UI 相關的模組。
 * 程式夥伴：在啟動時獲取所有 DOM 元素
 */
export function initializeUIModule() {
    // 獲取 DOM 元素 - 確保它們在 DOMContentLoaded 後被獲取
    modal = document.getElementById('meditation-modal');
    modalText = document.getElementById('meditation-text');
    closeModalBtn = document.getElementById('close-modal-btn');
    audio = document.getElementById('meditation-audio');
    toggleBtn = document.getElementById('meditation-toggle-btn');
    meditationSelector = document.getElementById('meditation-selector');
    
    alarmSelector = document.getElementById('alarm-selector');
    alarmAudioElement = document.getElementById('alarm-audio');
    
    // 啟動主題功能
    loadTheme(); 
    // 這裡我們必須在外部獲取按鈕
    document.getElementById('theme-default-btn').addEventListener('click', () => setTheme('default'));
    document.getElementById('theme-neon-btn').addEventListener('click', () => setTheme('neon-theme'));
    document.getElementById('theme-dos-btn').addEventListener('click', () => setTheme('dos-theme'));

    // 啟動冥想功能事件監聽器
    toggleBtn.addEventListener('click', toggleMeditationMode);
    closeModalBtn.addEventListener('click', closeMeditationPrompt); 

    // 啟動音訊選擇器 (在 DOM 準備好後)
    initializeAudioSelector(alarmSelector, ALARM_SOUNDS, 'alarmSoundPath', alarmAudioElement);
    initializeAudioSelector(meditationSelector, MEDITATION_MUSIC, 'meditationMusicPath', audio);

    // 啟動天氣功能
    fetchWeather(); 

    console.log("UI Module: UI/主題/冥想/音訊選擇功能已啟動。");
}

// 程式夥伴：現在需要在模組的全局作用域重新定義一次變量，以供所有函數使用
// V. 主題切換與儲存邏輯 (為了簡潔，這裡只顯示需要訪問 DOM 的函數)
function setTheme(themeName) {
    const body = document.body;
    THEMES.forEach(theme => {
        if (theme !== 'default') {
            body.classList.remove(theme);
        }
    });

    if (themeName !== 'default') {
        body.classList.add(themeName);
    }
    localStorage.setItem('clockTheme', themeName);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('clockTheme') || 'default';
    setTheme(savedTheme);
}

function showMeditationPrompt() {
    const randomIndex = Math.floor(Math.random() * MEDITATION_MESSAGES.length);
    modalText.textContent = MEDITATION_MESSAGES[randomIndex];
    
    modal.style.display = 'flex'; 

    audio.play().catch(error => {
        console.log("冥想音訊自動播放失敗:", error);
    });

    setTimeout(closeMeditationPrompt, MEDITATION_PROMPT_DURATION); 
}

function closeMeditationPrompt() {
    if (modal) modal.style.display = 'none';
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

function toggleMeditationMode() {
    isMeditationEnabled = !isMeditationEnabled;

    if (isMeditationEnabled) {
        toggleBtn.textContent = '🧘‍♀️ 關閉冥想';
        toggleBtn.style.backgroundColor = '#dc3545';
        
        audio.load(); 
        audio.play().catch(error => console.log("冥想音樂播放失敗:", error));

        meditationTimer = setInterval(showMeditationPrompt, MEDITATION_INTERVAL_MIN * 60 * 1000); 

    } else {
        toggleBtn.textContent = '🧘‍♀️ 啟用冥想';
        toggleBtn.style.backgroundColor = '';
        clearInterval(meditationTimer);
        closeMeditationPrompt();
    }
}

function initializeAudioSelector(selector, options, storageKey, audioElement) {
    // 1. 渲染選項
    selector.innerHTML = options.map((item, index) => 
        `<option value="${item.path}">${item.name}</option>`
    ).join('');
    // 2. 載入儲存的偏好 (如果有)
    const savedPath = localStorage.getItem(storageKey);
    let selectedPath = savedPath || options[0].path; 

    // 3. 設置當前選擇並更新 <audio> 的 src
    selector.value = selectedPath;
    if (audioElement) audioElement.src = selectedPath;

    // 4. 添加事件監聽器
    selector.addEventListener('change', (e) => {
        const newPath = e.target.value;
        if (audioElement) audioElement.src = newPath;
        localStorage.setItem(storageKey, newPath);
        
        // 如果是冥想音樂且正在播放，需要重新載入並播放新音源
        if (audioElement && audioElement.id === 'meditation-audio' && !audioElement.paused) {
            audioElement.load();
            audioElement.play();
        }
    });
}

function fetchWeather() {
    // ... 邏輯保持不變
}

async function getWeatherData(lat, lon) {
    // ... 邏輯保持不變
}
