// pomodoroModule.js - 延遲 DOM 引用修正版

import { 
    POMODORO_TIME_MINUTES, 
    SHORT_BREAK_TIME_MINUTES
} from './config.js'; 

const WORK_TIME = POMODORO_TIME_MINUTES * 60;
const BREAK_TIME = SHORT_BREAK_TIME_MINUTES * 60; 

let totalSeconds = WORK_TIME;
let isRunning = false;
let timerInterval = null;
let isWorkMode = true;

// 程式夥伴：將所有 DOM 元素聲明為 null，等待初始化時賦值
let timerDisplay = null;
let timerMode = null;
let statusMessage = null;
let startBtn = null;
let pauseBtn = null;
let resetBtn = null;
let soundToggle = null;
let alarmAudio = null;

let vibrationInterval = null; 
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
    if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
    }
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
    if (soundToggle && soundToggle.checked && alarmAudio) {
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
    if (isRunning || !startBtn) return;
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
            
            // 動態生成模式文本
            const workTimeStr = formatTime(WORK_TIME);
            const breakTimeStr = formatTime(BREAK_TIME);
            
            timerMode.textContent = isWorkMode ? `模式：工作 (${workTimeStr})` : `模式：休息 (${breakTimeStr})`;
                
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
    // 程式夥伴：將 DOM 查詢移到這裡，確保在 DOM 載入後執行
    timerDisplay = document.getElementById('timer-display');
    timerMode = document.getElementById('timer-mode');
    statusMessage = document.getElementById('status-message');
    startBtn = document.getElementById('start-btn');
    pauseBtn = document.getElementById('pause-btn');
    resetBtn = document.getElementById('reset-btn');
    soundToggle = document.getElementById('sound-toggle');
    alarmAudio = document.getElementById('alarm-audio');
    
    // 確保所有元素都被找到
    if (!timerDisplay || !startBtn) {
        console.error("Pomodoro Module Error: 缺少必要的 DOM 元素，初始化中止。");
        return;
    }

    // 動態生成初始模式文本
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
