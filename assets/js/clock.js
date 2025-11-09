// clock.js (主入口)

// 程式夥伴：檢查並實例化農曆函式庫
if (typeof window.CalendarConverter !== 'undefined') {
    // 將實例化的物件賦值給 timeModule.js 期望的小寫變數名
    window.calendarConverterInstance = new window.CalendarConverter();
}

import { initializeTimeModule } from './timeModule.js';
import { initializePomodoroModule } from './pomodoroModule.js';
import { initializeUIModule } from './uiModule.js';

// 確保 DOM 完全載入後再啟動功能
document.addEventListener('DOMContentLoaded', () => {
    console.log("程式夥伴: 主程式已啟動。");
    
    // 啟動各模組
    initializeTimeModule();
    initializePomodoroModule();
    initializeUIModule();
});
