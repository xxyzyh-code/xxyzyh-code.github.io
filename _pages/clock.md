---
title: "實時時鐘"
permalink: /clock/
layout: single  # 使用你網站的單頁布局
author_profile: false
---


# 冥想訓練

這是一個冥想訓練，放下生活瑣事，放空清潔心靈...

## 實時數字時鐘

<div id="digital-clock" style="font-size: 3em; font-weight: bold; margin: 50px auto; text-align: center;">
  正在載入時鐘...
</div>


<script>
function updateClock() {
    const now = new Date();
    
    // 獲取並格式化時間
    let hours = now.getHours();
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
