// pomodoroModule.js

// 程式夥伴: 導入遊戲化計分函數
import { addPomodoroScore } from './gamificationModule.js';

// ===================================
// 配置與狀態
// ===================================
const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;
let totalSeconds = WORK_TIME;
let isRunning = false;
let timerInterval = null;
let isWorkMode = true;

// ⭐️ 核心修正 A: 將積分累加器移到模組級別
let scoreAccumulatorSeconds = 0; 

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

// ===================================
// 輔助函數
// ===================================

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

// ===================================
// 核心計時邏輯
// ===================================

function startTimer() {
    if (isRunning) return;
    stopAlarm(); 
    isRunning = true;
    statusMessage.textContent = isWorkMode ? '專注工作 🧠' : '享受休息時光 ☕';
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    // 🔴 已移除: let secondsElapsed = 0;

    timerInterval = setInterval(() => {
        totalSeconds--;
        
        // ⭐️ 核心修正 B: 使用模組級別的累加器
        scoreAccumulatorSeconds++; 
        
        timerDisplay.textContent = formatTime(totalSeconds);

        // 程式夥伴: 每 60 秒 (1 分鐘) 呼叫一次計分
        if (scoreAccumulatorSeconds % 60 === 0) {
            // 只有在工作模式下才計分 (isWorkMode=true)
            // isBreakMode 傳入 !isWorkMode，在工作模式時為 false，休息模式時為 true
            addPomodoroScore(!isWorkMode); 
            
            // ⭐️ 核心修正 C: 每計分一次，就將累加器歸零（確保精度）
            scoreAccumulatorSeconds = 0;
        }

        if (totalSeconds <= 0) {
            clearInterval(timerInterval); 
            isRunning = false;
            
            // ⭐️ 核心修正 D: 番茄鐘結束時，將累加器清零
            scoreAccumulatorSeconds = 0; 
            
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
    
    // ⭐️ 核心修正 E: 暫停時，將累加器清零，確保從新的一分鐘開始計算
    scoreAccumulatorSeconds = 0; 
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
    
    // ⭐️ 核心修正 F: 重置時，將累加器清零
    scoreAccumulatorSeconds = 0;
}

// ===================================
// 啟動
// ===================================

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
