---
title: "數字時鐘"
permalink: /clock/
layout: single
author_profile: false
header:
  overlay_color: "rgba(0, 0, 0, 0)" 
---

<script src="https://cdn.jsdelivr.net/npm/calendar-converter@1.0.0/dist/calendar-converter.min.js"></script>

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

<div style="text-align: center; margin-top: 10px;">
    <label for="meditation-selector">🎵 選擇冥想音樂:</label>
    <select id="meditation-selector"></select>
</div>

<div id="main-container">

    <div>
        <div id="digital-clock">正在載入時鐘...</div>
        <div id="current-date">正在載入日期...</div>
        <div id="lunar-date" style="font-size: 1.2em; margin-top: 5px;">載入農曆...</div>
    </div>

    <div id="pomodoro-timer">
        <h3>🍅 番茄工作法</h3>
        
        <div style="margin-bottom: 10px;">
            <input type="checkbox" id="sound-toggle" checked>
            <label for="sound-toggle">聲音提醒</label>
        </div>
        
        <div style="margin-bottom: 10px;">
            <label for="alarm-selector">🔔 選擇鈴聲:</label>
            <select id="alarm-selector"></select>
        </div>

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

<audio id="meditation-audio" loop></audio>

<audio id="alarm-audio"></audio>

<script type="module" src="/assets/js/clock.js"></script>
