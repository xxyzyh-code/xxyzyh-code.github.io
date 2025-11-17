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
