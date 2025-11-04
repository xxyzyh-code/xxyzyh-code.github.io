---
title: "實時數字時鐘"
permalink: /clock/
layout: single
author_profile: false
header:
  overlay_color: "#444"
  overlay_image: /assets/images/contact-bg.jpg
  
# 程式夥伴：禁用頂部 Page Header/Hero 區域 (如果你想保持乾淨頁面，需要添加這兩行)
# header: false 
# show_title: false 
---

<div style="text-align: center;">

這是一個時鐘冥想訓練，放下生活瑣事，放空清潔心靈...

<div id="digital-clock" style="font-size: 3em; font-weight: bold; margin: 50px auto; text-align: center;">
  正在載入時鐘...
</div>

</div> <script>
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
