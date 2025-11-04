---
layout: default
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

# {{ page.title }} 

## 歡迎收聽！

{% include audio_player.html %}

</div>
