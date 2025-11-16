---
layout: analytics
title: 我的靜態音樂站
permalink: /music/
load_player_css: true
---

{% capture custom_css %}
<link rel="stylesheet" href="/assets/css/theme.css">
<link rel="stylesheet" href="/assets/css/custom_player.css">
{% endcapture %}

{% if page.header.includes %}
  {% assign page.header.includes = page.header.includes | push: custom_css %}
{% else %}
  {% assign page.header = page.header | default: {} | merge: { "includes": custom_css } %}
{% endif %}

<div class="center-container">

    <h1>{{ page.title }}</h1> 

    {% assign total_tracks = site.data.music | size %}
    <h3>本站共收錄 {{ total_tracks }} 首音樂，歡迎收聽！</h3> 
    {% include audio_player.html %}

</div>

<script type="module">
    // 導入初始化函數
    import { initializeGamificationModule, addMusicScore } from '/assets/js/gamificationModule.js';
    
    // 確保模組被初始化
    document.addEventListener('DOMContentLoaded', initializeGamificationModule);

    // ⭐️ 導出 addMusicScore 函數到全局作用域 (window)，
    // 供音樂播放器腳本 (非模組腳本) 使用。
    window.addMusicScore = addMusicScore;
</script>
<script>
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".track-item").forEach(async (item) => {
        const audio = item.querySelector("audio");
        const status = item.querySelector(".player-status");
        const sources = Array.from(audio.querySelectorAll("source")).map(s => s.src);

        // 清空 <source>，避免瀏覽器卡死在第一個壞來源
        audio.innerHTML = "";

        let workingSource = null;

        for (let url of sources) {
            status.textContent = "檢查來源中...";
            try {
                const res = await fetch(url, { method: "HEAD" });

                // 必須成功且是音檔 MIME
                const type = (res.headers.get("content-type") || "").toLowerCase();
                if (!res.ok || !type.startsWith("audio/")) {
                    console.warn("來源無效：", url, "type=", type);
                    continue;
                }

                // 挑到可用來源 → 停止檢查
                workingSource = { url, type };
                break;

            } catch (err) {
                console.warn("來源錯誤：", url, err);
                continue;
            }
        }

        if (!workingSource) {
            status.textContent = "所有來源失敗 🫠";
            return;
        }

        // 加回真正有效的來源
        const sourceEl = document.createElement("source");
        sourceEl.src = workingSource.url;
        sourceEl.type = workingSource.type;
        audio.appendChild(sourceEl);

        status.textContent = "使用來源：" + workingSource.url.split('/').pop();

        // 確保能播
        audio.load();
    });
});
</script>
