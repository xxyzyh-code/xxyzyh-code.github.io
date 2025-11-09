---
title: "數字時鐘"
permalink: /clock/
layout: single
author_profile: false
header:
  overlay_color: "#444"
  overlay_image: /assets/images/contact-bg.jpg
---

<link rel="stylesheet" href="/assets/css/clock_styles.css">

<div style="text-align: center;">

這是一個時鐘冥想訓練，放下生活瑣事，放空清潔心靈...

<div id="theme-switcher" style="text-align: center; margin-top: 20px;">
    <h4>🎨 選擇主題：</h4>
    <button id="theme-default-btn">預設</button>
    <button id="theme-neon-btn">霓虹風</button>
    <button id="theme-dos-btn">復古 DOS</button>
</div>

<div id="main-container">

    <div>
        <div id="digital-clock">正在載入時鐘...</div>
        <div id="current-date">正在載入日期...</div>
    </div>

    <div id="pomodoro-timer">
        <h3>🍅 番茄工作法</h3>
        <p id="timer-mode">模式：工作 (25:00)</p>
        <div id="timer-display">25:00</div>
        <div id="control-buttons">
            <button id="start-btn">啟動</button>
            <button id="pause-btn" disabled>暫停</button>
            <button id="reset-btn">重置</button>
        </div>
        <div id="status-message">準備開始！</div>
    </div>
    
    <div id="weather-info">
        <h3>📍 當地天氣</h3>
        <p id="weather-location">正在定位...</p>
        <div id="weather-details">
            <div id="weather-icon"></div>
            <div id="weather-temp-desc">載入中...</div>
        </div>
    </div>

</div>

</div>

<script>
// 程式夥伴：整合了時鐘更新、日期顯示、日夜模式切換、番茄鐘及天氣邏輯

// ===================================
// I. 數字時鐘與日期邏輯
// ===================================

/**
 * @description 更新數字時鐘和公曆日期，並處理日夜模式切換。
 */
function updateClock() {
    const now = new Date();
    const currentHour = now.getHours(); // 獲取當前小時 (0-23)
    const body = document.body;

    // 1. 日夜模式切換邏輯 (樣式定義在外部 CSS 文件中)
    const isDayTime = currentHour >= 6 && currentHour < 18; // 白天 (06:00 - 17:59)

    if (isDayTime) {
        body.classList.remove('night-mode');
    } else {
        body.classList.add('night-mode');
    }

    // 2. 時鐘更新邏輯
    let hours = currentHour;
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    // 補零函數
    const pad = (num) => num < 10 ? '0' + num : num;

    const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    // 更新時鐘內容
    const clockElement = document.getElementById('digital-clock');
    if (clockElement) {
        clockElement.textContent = timeString;
    }

    // 3. 日期更新邏輯
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateString = now.toLocaleDateString('zh-TW', dateOptions); 
    
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = dateString;
    }
}

// ===================================
// II. 番茄鐘 (Pomodoro Timer) 邏輯
// ===================================

const WORK_TIME = 25 * 60; // 25 分鐘工作 (秒)
const BREAK_TIME = 5 * 60;  // 5 分鐘休息 (秒)

let totalSeconds = WORK_TIME; // 當前計時器總秒數
let isRunning = false;        // 計時器是否運行中
let timerInterval = null;     // 用於儲存 setInterval 識別碼
let isWorkMode = true;        // 當前是否為工作模式

const timerDisplay = document.getElementById('timer-display');
const timerMode = document.getElementById('timer-mode');
const statusMessage = document.getElementById('status-message');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

/**
 * @description 格式化秒數為 MM:SS 格式。
 * @param {number} seconds - 要格式化的總秒數。
 * @returns {string} MM:SS 格式的字串。
 */
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    const pad = (num) => num < 10 ? '0' + num : num;
    return `${pad(min)}:${pad(sec)}`;
}

/**
 * @description 啟動或恢復計時器。
 */
function startTimer() {
    if (isRunning) return; // 如果正在運行，則忽略
    
    isRunning = true;
    statusMessage.textContent = isWorkMode ? '專注工作 🧠' : '享受休息時光 ☕';
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    // 設置每秒減一
    timerInterval = setInterval(() => {
        totalSeconds--;
        timerDisplay.textContent = formatTime(totalSeconds);

        if (totalSeconds <= 0) {
            clearInterval(timerInterval); // 停止計時
            isRunning = false;
            
            // 模式切換
            isWorkMode = !isWorkMode;
            totalSeconds = isWorkMode ? WORK_TIME : BREAK_TIME;

            // 更新介面狀態
            timerMode.textContent = isWorkMode ? '模式：工作 (25:00)' : '模式：休息 (05:00)';
            timerDisplay.textContent = formatTime(totalSeconds);
            statusMessage.textContent = isWorkMode ? '休息結束！開始新一輪工作 💪' : '你太棒了！休息一下吧 🍵';
            
            // 模式切換後，自動進入暫停/準備狀態，讓使用者點擊開始
            startBtn.disabled = false;
            pauseBtn.disabled = true;
        }
    }, 1000);
}

/**
 * @description 暫停計時器。
 */
function pauseTimer() {
    if (!isRunning) return;

    clearInterval(timerInterval);
    isRunning = false;
    statusMessage.textContent = '計時已暫停 ⏸️';
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

/**
 * @description 重置計時器到當前模式的初始時間。
 */
function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;

    totalSeconds = isWorkMode ? WORK_TIME : BREAK_TIME;
    timerDisplay.textContent = formatTime(totalSeconds);
    statusMessage.textContent = '準備開始！';
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

// III. 事件監聽器 (Event Listeners)
// ===================================
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);


// ===================================
// IV. 天氣資訊邏輯
// ===================================

// API Key 已在此處整合
const API_KEY = 'be0d16a112a34af758f9a6a22e133de3';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * @description 獲取並顯示天氣資訊。
 */
function fetchWeather() {
    // 檢查瀏覽器是否支援地理定位
    if (navigator.geolocation) {
        // 獲取當前位置
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                getWeatherData(lat, lon);
            },
            (error) => {
                // 定位失敗的處理
                document.getElementById('weather-location').textContent = '定位失敗 🌍';
                document.getElementById('weather-temp-desc').textContent = '請檢查權限或網路。';
                console.error('Geolocation Error:', error);
            },
            { timeout: 10000 } // 設置超時時間
        );
    } else {
        document.getElementById('weather-location').textContent = '您的瀏覽器不支援地理定位。';
    }
}

/**
 * @description 從 OpenWeatherMap 獲取天氣數據並更新介面。
 * @param {number} lat - 緯度。
 * @param {number} lon - 經度。
 */
async function getWeatherData(lat, lon) {
    const url = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=zh_tw`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // 解析並顯示數據
        const temp = Math.round(data.main.temp); 
        const description = data.weather[0].description;
        const iconCode = data.weather[0].icon;
        const locationName = data.name;

        // 更新介面
        document.getElementById('weather-location').textContent = `${locationName}`;
        document.getElementById('weather-temp-desc').innerHTML = `
            ${temp}°C, ${description}
        `;
        document.getElementById('weather-icon').innerHTML = `
            <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${description}">
        `;

    } catch (error) {
        document.getElementById('weather-temp-desc').textContent = '載入天氣數據失敗 😓';
        console.error('Weather Fetch Error:', error);
    }
}


// ===================================
// V. 主題切換與儲存邏輯
// ===================================

const THEMES = ['default', 'neon-theme', 'dos-theme'];

/**
 * @description 根據主題名稱，設定並儲存當前主題。
 * @param {string} themeName - 要切換的主題名稱 ('default', 'neon-theme', 'dos-theme')。
 */
function setTheme(themeName) {
    const body = document.body;

    // 1. 移除所有主題類別
    THEMES.forEach(theme => {
        if (theme !== 'default') {
            body.classList.remove(theme);
        }
    });

    // 2. 添加選定的主題類別 (如果不是預設)
    if (themeName !== 'default') {
        body.classList.add(themeName);
    }
    
    // 3. 使用 localStorage 記住使用者偏好
    localStorage.setItem('clockTheme', themeName);
}

/**
 * @description 從 localStorage 載入儲存的主題。
 */
function loadTheme() {
    // 載入儲存的主題，如果沒有儲存，則預設為 'default'
    const savedTheme = localStorage.getItem('clockTheme') || 'default';
    setTheme(savedTheme);
}

// ===================================
// VI. 啟動所有功能
// ===================================

// 啟動時鐘和日期：立即執行並設置每秒更新
updateClock();
setInterval(updateClock, 1000);

// 啟動天氣功能：在啟動時載入一次
fetchWeather(); 

// 啟動主題功能：載入儲存的主題
loadTheme(); 

// 添加按鈕事件監聽器
document.getElementById('theme-default-btn').addEventListener('click', () => setTheme('default'));
document.getElementById('theme-neon-btn').addEventListener('click', () => setTheme('neon-theme'));
document.getElementById('theme-dos-btn').addEventListener('click', () => setTheme('dos-theme'));
</script>
