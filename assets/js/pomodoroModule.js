// pomodoroModule.js - 配置優化版

// 程式夥伴：從 config.js 導入所有時間常量
import { 
    POMODORO_TIME_MINUTES, 
    SHORT_BREAK_TIME_MINUTES, 
    LONG_BREAK_TIME_MINUTES, // 雖然目前未使用，但先導入以備未來擴展
    LONG_BREAK_INTERVAL // 雖然目前未使用，但先導入以備未來擴展
} from './config.js'; 

// 程式夥伴：使用配置常量計算秒數
const WORK_TIME = POMODORO_TIME_MINUTES * 60;
const BREAK_TIME = SHORT_BREAK_TIME_MINUTES * 60; 

let totalSeconds = WORK_TIME;
let isRunning = false;
let timerInterval = null;
let isWorkMode = true;
// let cycleCount = 0; // 未來用於計算長休息，暫時註釋

// DOM 元素
const timerDisplay = document.getElementById('timer-display');
const timerMode = document.getElementById('timer-mode');
const statusMessage = document.getElementById('status-message');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const soundToggle = document.getElementById('sound-toggle');
const alarmAudio = document.getElementById('alarm-audio');
let vibrationInterval = null; 

// 程式夥伴：保留 VIBRATE_PATTERN 在此，因為它是與提醒功能緊密相關的模式，而非通用時間配置
const VIBRATE_PATTERN = [1000, 500, 500, 500]; 

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    const pad = (num) => num < 10 ? '0' + num : num;
    return `${pad(min)}:${pad(sec)}`;
}

/**
 * @description 停止所有提醒（聲音和振動）。
 */
function stopAlarm() {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    if (vibrationInterval !== null) {
        clearInterval(vibrationInterval);
        vibrationInterval = null;
    }
    if ('vibrate' in navigator) {
        navigator.vibrate(0);
    }
}

/**
 * @description 播放聲音並啟動無限振動模式。
 */
function playAlarm() {
    if (soundToggle.checked) {
        alarmAudio.play().catch(e => console.error("番茄鐘音訊播放失敗:", e));
    }

    if ('vibrate' in navigator) {
        let patternIndex = 0;
        vibrationInterval = setInterval(() => {
            const duration = VIBRATE_PATTERN[patternIndex];
            navigator.vibrate(duration);
            patternIndex = (patternIndex + 2) % VIBRATE_PATTERN.length; 
        }, VIBRATE_PATTERN.reduce((sum, val) => sum + val, 0));
    }
}

function startTimer() {
    if (isRunning) return;
    stopAlarm(); 
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
            
            playAlarm(); 
            
            isWorkMode = !isWorkMode;
            totalSeconds = isWorkMode ? WORK_TIME : BREAK_TIME;
            
            // 程式夥伴：動態生成模式文本，避免硬編碼時間
            const workTimeStr = formatTime(WORK_TIME); // 25:00
            const breakTimeStr = formatTime(BREAK_TIME); // 05:00
            
            timerMode.textContent = isWorkMode 
                ? `模式：工作 (${workTimeStr})` 
                : `模式：休息 (${breakTimeStr})`;
                
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
    stopAlarm(); 
    clearInterval(timerInterval);
    isRunning = false;
    totalSeconds = isWorkMode ? WORK_TIME : BREAK_TIME;
    timerDisplay.textContent = formatTime(totalSeconds);
    statusMessage.textContent = '準備開始！';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

/**
 * @description 啟動番茄鐘模組並設置事件監聽器。
 */
export function initializePomodoroModule() {
    // 程式夥伴：動態生成初始模式文本
    const workTimeStr = formatTime(WORK_TIME); 
    const breakTimeStr = formatTime(BREAK_TIME); 
    
    // 設置初始顯示
    timerDisplay.textContent = formatTime(totalSeconds);
    timerMode.textContent = isWorkMode 
        ? `模式：工作 (${workTimeStr})` 
        : `模式：休息 (${breakTimeStr})`;
    
    // 事件監聽器
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    console.log("Pomodoro Module: 番茄鐘功能已啟動。");
}
