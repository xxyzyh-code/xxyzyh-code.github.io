---
title: "欢迎来到我的新博客"
excerpt: "这是使用 Minimal Mistakes 主题写下的第一篇文章。"
date: 2025-11-02
last_modified_at: 2025-11-02
layout: single
categories:
  - 随笔
subcategories:
  - 流行音乐
tags:
  - Jekyll
  - 博客搭建
permalink: /my-first-post/
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

Hello, World — This is my first blog post.  

恭喜 🎉！你的 Jekyll 博客已經成功運行，繼續寫作吧。  

## 核心目录结构

- `_config.yml`：网站的配置中心  
- `_posts/`：存放你的 Markdown 格式文章  

> 小贴士：写完一篇新文章后，记得命名规则要是 `YYYY-MM-DD-文章名.md`。

<!-- 🔹 写作成绩单：发布日期 + 正文字数 + 阅读时间 -->
{% assign plain_text = page.content | strip_html | strip_newlines | replace: "&nbsp;", " " %}
{% assign word_count = plain_text | number_of_words %}
{% assign reading_time = word_count | divided_by:200.0 | ceil %}
<p style="color:#888; font-size:0.9em; margin-top: 20px;">
  📅 发布日期：{{ page.date | date: "%Y-%m-%d" }} &nbsp;|&nbsp; 📝 字数：{{ word_count }} 字 &nbsp;|&nbsp; ⏱️ 阅读时间：约 {{ reading_time }} 分钟
</p>

<!-- 文章访问量 -->
<div style="text-align: center; margin-top: 30px;">
  <img src="https://visitor-badge.laobi.icu/badge?page_id=xxyzyh-code.my-first-post" alt="Visitor Count">
</div>

