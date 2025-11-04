---
title: "數字時鐘"
permalink: /clock/
layout: single
author_profile: false
header:
  overlay_color: "#444"
  overlay_image: /assets/images/contact-bg.jpg
---

<style>
/* 程式夥伴：定義夜間模式的樣式 */
/* 這些樣式會被 JavaScript 添加到 body 上 */
body.night-mode {
    background-color: #1a1a1a; /* 深黑背景 */
    color: #cccccc;           /* 柔和的灰色文字 */
}

/* 確保時鐘本身也適應夜間模式 */
body.night-mode #digital-clock {
    color: #00ff66; /* 可選：夜間時鐘文字 */
}
</style>

<div style="text-align: center;">


這是一個時鐘冥想訓練，放下生活瑣事，放空清潔心靈...

<div id="digital-clock" style="font-size: 3em; font-weight: bold; margin: 50px auto; text-align: center;">
  正在載入時鐘...
</div>

</div> <script>
// 程式夥伴：整合了時鐘更新和日夜模式切換邏輯
function updateClock() {
    const now = new Date();
    const currentHour = now.getHours(); // 獲取當前小時 (0-23)
    const body = document.body;

    // 定義白天時間範圍 (例如：早上 6 點到晚上 6 點前)
    const isDayTime = currentHour >= 6 && currentHour < 18;

    // 1. 日夜模式切換邏輯
    if (isDayTime) {
        // 白天模式：移除 night-mode 類別
        body.classList.remove('night-mode');
    } else {
        // 夜間模式：添加 night-mode 類別
        body.classList.add('night-mode');
    }

    // 2. 時鐘更新邏輯 (與之前相同)
    let hours = currentHour; // 使用已獲取的 currentHour
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    // 補零函數
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    const timeString = hours + ':' + minutes + ':' + seconds;

    // 更新內容
    const clockElement = document.getElementById('digital-clock');
    if (clockElement) {
        clockElement.textContent = timeString;
    }
}

// 啟動時鐘：立即執行並設置每秒更新
updateClock();
setInterval(updateClock, 1000);
</script>
