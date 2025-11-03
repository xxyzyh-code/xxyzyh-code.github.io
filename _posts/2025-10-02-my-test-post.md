---
title: "欢迎来到我的测试文"
excerpt: "这是使用 Minimal Mistakes 主题写下的测试文章。"
date: 2025-10-02
last_modified_at: 2025-10-02
layout: single
categories: [音乐, 阅读]   # 一级分类
subcategories:             # 二级分类
  - 流行音乐
  - 纯音乐
tags:
  - 测试
  - 文学创作
permalink: /my-test-post/
author: xxyzyh
author_profile: true
toc: true
toc_label: "文章目录"
toc_icon: "list"
header:
  overlay_color: "#000"
  overlay_filter: "0.3"
  overlay_image: /assets/images/blog-header.jpg
---

Hello, World — This is my test blog post.  

恭喜 🎉！你的 Jekyll 博客已經成功運行。  

## 核心目录结构

- `_config.yml`：网站的配置中心  
- `_posts/`：存放你的 Markdown 格式文章  

> 小贴士：写完一篇新文章后，记得命名规则要是 `YYYY-MM-DD-文章名.md`。

<!-- 🔹 写作成绩单：发布日期 + 正文字数 + 阅读时间 -->
{% assign content_clean = page.content | strip_html | replace: "\r", "" | replace: "\n", "" | replace: "\t", "" %}
{% assign chars = content_clean | split: "" %}
{% assign word_count = 0 %}

{% for c in chars %}
  {% if c =~ /[一-龥a-zA-Z0-9]/ %}
    {% assign word_count = word_count | plus: 1 %}
  {% endif %}
{% endfor %}

{% assign reading_time = word_count | divided_by:200.0 | ceil %}
<p style="color:#888; font-size:0.9em; margin-top: 20px;">
  📝 字数：{{ word_count }} 字 &nbsp;|&nbsp; ⏱️ 阅读时间：约 {{ reading_time }} 分钟
</p>
