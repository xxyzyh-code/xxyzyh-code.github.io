// pomodoroModule.js

const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;
let totalSeconds = WORK_TIME;
let isRunning = false;
let timerInterval = null;
let isWorkMode = true;

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
    // 設置初始顯示
    timerDisplay.textContent = formatTime(totalSeconds);
    timerMode.textContent = isWorkMode ? '模式：工作 (25:00)' : '模式：休息 (05:00)';
    
    // 事件監聽器
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    console.log("Pomodoro Module: 番茄鐘功能已啟動。");
}
