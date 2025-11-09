// timeModule.js - 最終修正版

function updateLunarDate() {
    const now = new Date();
    const lunarElement = document.getElementById('lunar-date');
    
    // 程式夥伴修正：改為使用實例化的物件名稱
    const converter = window.calendarConverterInstance; 

    if (typeof converter === 'undefined') {
        if (lunarElement) {
            lunarElement.textContent = '農曆函式庫載入失敗或不可用。';
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
    console.log("Time Module: 時鐘與日期功能已啟動。");
}
