import { LUNAR_LOADING_MESSAGE, APP_INITIALIZATION_MESSAGE } from './config.js'; // <-- 引入配置

/**
 * @description 計算並顯示農曆日期和節氣。
 */
function updateLunarDate() {

function updateLunarDate() {
    const now = new Date();
    const lunarElement = document.getElementById('lunar-date');
    const converter = window.calendarConverterInstance; 

    if (typeof converter === 'undefined') {
        if (lunarElement) {
            // 使用配置中的常量
            lunarElement.textContent = LUNAR_LOADING_MESSAGE; 
        }
        console.error("Lunar Date Error: window.calendarConverterInstance is undefined.");
        return;
    }
    
    // 修正：農曆函式庫 solar2lunar() 期望的參數形式
    // 根據您提供的程式碼，solar2lunar 期望的是一個 Date 物件
    // 因此需要修改調用方式
    const lunarData = converter.solar2lunar(now);
    
    let displayString = '';
    // 由於我們取得了完整的 lunarData 物件，現在可以提取需要顯示的資訊
    displayString += `${lunarData.lunarMonth}月${lunarData.lunarDay}`; // 例如：六月十八
    displayString += ` (${lunarData.lunarYear})`; // 例如：(龍)

    if (lunarData.solarTerms) {
        displayString += ` | ${lunarData.solarTerms}`;
    }

    if (lunarElement) {
        lunarElement.textContent = displayString;
    }
}

/**
 * @description 更新數字時鐘和公曆日期，並處理日夜模式切換。
 */
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

    // 更新農曆
    updateLunarDate();
}

/**
 * @description 啟動時鐘更新機制。
 */
export function initializeTimeModule() {
    updateClock();
    setInterval(updateClock, 1000);
    // 使用配置中的常量
    console.log(APP_INITIALIZATION_MESSAGE);
}
