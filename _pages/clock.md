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
    
    <button id="meditation-toggle-btn" style="margin-left: 20px;">🧘‍♀️ 啟用冥想</button> 
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

<div id="meditation-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center;">
    <div id="modal-content" style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 400px; color: black;">
        <h3 id="meditation-title">冥想時刻</h3>
        <p id="meditation-text" style="font-size: 1.2em; margin: 20px 0;">閉上眼睛，深呼吸三次，感受當下的寧靜。</p>
        <button id="close-modal-btn">知道了</button>
    </div>
</div>

<audio id="meditation-audio" loop>
    <source src="assets/audio/gentle_music.mp3" type="audio/mpeg"> 
    您的瀏覽器不支援 audio 元素。
</audio>

<script>
// 程式夥伴：整合了時鐘更新、日期顯示、日夜模式切換、番茄鐘、天氣及冥想邏輯

// ===================================
// I. 數字時鐘與日期邏輯
// ===================================
// ... (程式碼與之前相同) ...
function updateClock() {
    const now = new Date();
    const currentHour = now.getHours();
    const body = document.body;
    const isDayTime = currentHour >= 6 && currentHour < 18;

    if (isDayTime) {
        body.classList.remove('night-mode');
    } else {
        body.classList.add('night-mode');
    }

    let hours = currentHour;
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    const pad = (num) => num < 10 ? '0' + num : num;
    const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    const clockElement = document.getElementById('digital-clock');
    if (clockElement) {
        clockElement.textContent = timeString;
    }

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
// ... (程式碼與之前相同) ...
const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;
let totalSeconds = WORK_TIME;
let isRunning = false;
let timerInterval = null;
let isWorkMode = true;
const timerDisplay = document.getElementById('timer-display');
const timerMode = document.getElementById('timer-mode');
const statusMessage = document.getElementById('status-message');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    const pad = (num) => num < 10 ? '0' + num : num;
    return `${pad(min)}:${pad(sec)}`;
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    statusMessage.textContent = isWorkMode ? '專注工作 🧠' : '享受休息時光 ☕';
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    timerInterval = setInterval(() => {
        totalSeconds--;
        timerDisplay.textContent = formatTime(totalSeconds);

        if (totalSeconds <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            isWorkMode = !isWorkMode;
            totalSeconds = isWorkMode ? WORK_TIME : BREAK_TIME;
            timerMode.textContent = isWorkMode ? '模式：工作 (25:00)' : '模式：休息 (05:00)';
            timerDisplay.textContent = formatTime(totalSeconds);
            statusMessage.textContent = isWorkMode ? '休息結束！開始新一輪工作 💪' : '你太棒了！休息一下吧 🍵';
            startBtn.disabled = false;
            pauseBtn.disabled = true;
        }
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    isRunning = false;
    statusMessage.textContent = '計時已暫停 ⏸️';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

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
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);


// ===================================
// IV. 天氣資訊邏輯
// ===================================
// ... (程式碼與之前相同) ...
const API_KEY = 'be0d16a112a34af758f9a6a22e133de3';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

function fetchWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                getWeatherData(lat, lon);
            },
            (error) => {
                document.getElementById('weather-location').textContent = '定位失敗 🌍';
                document.getElementById('weather-temp-desc').textContent = '請檢查權限或網路。';
                console.error('Geolocation Error:', error);
            },
            { timeout: 10000 }
        );
    } else {
        document.getElementById('weather-location').textContent = '您的瀏覽器不支援地理定位。';
    }
}

async function getWeatherData(lat, lon) {
    const url = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=zh_tw`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const temp = Math.round(data.main.temp); 
        const description = data.weather[0].description;
        const iconCode = data.weather[0].icon;
        const locationName = data.name;

        document.getElementById('weather-location').textContent = `${locationName}`;
        document.getElementById('weather-temp-desc').innerHTML = `${temp}°C, ${description}`;
        document.getElementById('weather-icon').innerHTML = `<img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${description}">`;

    } catch (error) {
        document.getElementById('weather-temp-desc').textContent = '載入天氣數據失敗 😓';
        console.error('Weather Fetch Error:', error);
    }
}


// ===================================
// V. 主題切換與儲存邏輯
// ===================================
// ... (程式碼與之前相同) ...
const THEMES = ['default', 'neon-theme', 'dos-theme'];

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


// ===================================
// VI. 冥想引導模式邏輯 (新增)
// ===================================

const MEDITATION_INTERVAL_MIN = 60; // 每 60 分鐘彈出一次提示
const MEDITATION_MESSAGES = [
    "閉上眼睛，深呼吸三次，感受當下的寧靜。",
    "輕輕放下你的肩膀和下巴，放鬆五秒。",
    "專注於你的呼吸，忘卻時間，重新連結自己。",
    "放下生活瑣事，讓心靈放空、清潔。",
    "現在，保持微笑三秒鐘，感受積極的能量。"
];

let meditationTimer = null; 
let isMeditationEnabled = false; 
const modal = document.getElementById('meditation-modal');
const modalText = document.getElementById('meditation-text');
const closeModalBtn = document.getElementById('close-modal-btn');
const audio = document.getElementById('meditation-audio');
const toggleBtn = document.getElementById('meditation-toggle-btn');


function showMeditationPrompt() {
    const randomIndex = Math.floor(Math.random() * MEDITATION_MESSAGES.length);
    modalText.textContent = MEDITATION_MESSAGES[randomIndex];
    
    modal.style.display = 'flex'; 

    audio.play().catch(error => {
        console.log("音訊自動播放失敗，通常需要使用者互動權限。", error);
    });

    // 30 秒後自動關閉
    setTimeout(closeMeditationPrompt, 30000); 
}

function closeMeditationPrompt() {
    modal.style.display = 'none';
    audio.pause();
    audio.currentTime = 0;
}

function toggleMeditationMode() {
    isMeditationEnabled = !isMeditationEnabled;

    if (isMeditationEnabled) {
        toggleBtn.textContent = '🧘‍♀️ 關閉冥想';
        toggleBtn.style.backgroundColor = '#dc3545';

        // 啟動定時器，設置每小時提示一次
        meditationTimer = setInterval(showMeditationPrompt, MEDITATION_INTERVAL_MIN * 60 * 1000); 
        console.log(`冥想模式已啟用，將於每 ${MEDITATION_INTERVAL_MIN} 分鐘提示。`);

    } else {
        toggleBtn.textContent = '🧘‍♀️ 啟用冥想';
        toggleBtn.style.backgroundColor = '';
        clearInterval(meditationTimer);
        closeMeditationPrompt();
        console.log("冥想模式已關閉。");
    }
}


// ===================================
// VII. 啟動所有功能
// ===================================

// 啟動時鐘和日期
updateClock();
setInterval(updateClock, 1000);

// 啟動天氣功能
fetchWeather(); 

// 啟動主題功能
loadTheme(); 

// 啟動冥想功能事件監聽器
toggleBtn.addEventListener('click', toggleMeditationMode);
closeModalBtn.addEventListener('click', closeMeditationPrompt); 

// 主題按鈕事件監聽器 (已移到此處)
document.getElementById('theme-default-btn').addEventListener('click', () => setTheme('default'));
document.getElementById('theme-neon-btn').addEventListener('click', () => setTheme('neon-theme'));
document.getElementById('theme-dos-btn').addEventListener('click', () => setTheme('dos-theme'));
</script>
